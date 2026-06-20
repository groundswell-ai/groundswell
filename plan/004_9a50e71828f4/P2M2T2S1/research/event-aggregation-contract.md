# Pi Event Aggregation Contract — `createAgentSession` + `prompt` + `subscribe` → `AgentResponse`

> Verified 2026-06-20 by reading installed `.d.ts` files under
> `node_modules/@earendil-works/pi-coding-agent` and its nested (NON-hoisted) dep
> `node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/{pi-agent-core,pi-ai}`.
> This is the load-bearing reference for P2.M2.T2.S1's `execute()` aggregation logic.

## 0. Why this file exists

`createAgentSession` is **async** and returns a `session` object whose `prompt()` resolves
`Promise<void>` — it does **NOT** return the assistant text or usage directly. The terminal
assistant text + token usage + tool-call count must be **aggregated from the event stream**
emitted via `session.subscribe(listener)`. This file documents exactly which events carry
which fields, so the aggregation logic is unambiguous.

## 1. The session lifecycle (the seams T2 wires)

```ts
import { createAgentSession } from "@earendil-works/pi-coding-agent"; // re-exported, index.d.ts L16

const { session, extensionsResult, modelFallbackMessage? } =
  await createAgentSession({
    model,                 // Model<Api> — from PiHarness.resolveModel(spec) [S2]
    modelRegistry,         // ModelRegistry — this.modelRegistry [S2's headless registry]
    authStorage,           // AuthStorage  — this.authStorage   [S2's headless auth]
    customTools,           // ToolDefinition[] — EMPTY [] in T2 (Groundswell tools = P2.M3.T1)
    // resourceLoader / sessionManager omitted → Pi uses its own defaults
  });

const unsubscribe = session.subscribe((event: AgentSessionEvent) => { /* … */ });
await session.prompt(text);          // Promise<void>; resolves when the turn/loop is processed
unsubscribe();
```

**Verified facts:**
- `createAgentSession` is re-exported from `@earendil-works/pi-coding-agent` (`dist/index.d.ts` L16).
- `createAgentSession(options?): Promise<CreateAgentSessionResult>` (`external_deps.md` §1.1).
- `AgentSession.subscribe(listener): () => void` — returns an **unsubscribe** fn (`external_deps.md` §1.2).
- `AgentSession.prompt(text, options?): Promise<void>` (`external_deps.md` §1.2).
- `isStreaming` "remains true until awaited `agent_end` listeners settle" (pi-agent-core
  `types.d.ts` AgentState) → **by the time `await session.prompt()` resolves, `agent_end` and
  the final `turn_end` have already fired** into a synchronous listener. This is why a plain
  closure-capture listener is sufficient (no async races).

## 2. The events that carry the data we need

`AgentSessionEvent` is the union re-exported from `pi-coding-agent` (`dist/core/extensions/types.d.ts`).
The fields T2 cares about (verified from `dist/core/extensions/types.d.ts`):

```ts
// Lifecycle (PRD §7.11 hook mapping)
interface SessionStartEvent     { type: "session_start";     reason: "startup"|"reload"|"new"|"resume"|"fork"; }
interface SessionShutdownEvent  { type: "session_shutdown";  reason: "quit"|"reload"|"new"|"resume"|"fork"; }

// Turn — the assistant message for ONE turn + its tool results
interface TurnEndEvent {
  type: "turn_end";
  turnIndex: number;
  message: AgentMessage;          // ← the assistant message that completed this turn
  toolResults: ToolResultMessage[];
}

// Agent loop termination — ALL messages from the run
interface AgentEndEvent {
  type: "agent_end";
  messages: AgentMessage[];       // ← full transcript (last assistant msg = final answer)
}
```

**`AgentMessage`** = `Message | CustomMessage…` (pi-agent-core `types.d.ts`). For T2 only the
**assistant** variant matters. Verified shape of `AssistantMessage` (from
`pi-ai/dist/types.d.ts` L207-222):

```ts
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];   // ← text + tool calls live here
  api: Api; provider: Provider; model: string;
  usage: Usage;                  // ← token usage (ALWAYS present on a finalized assistant msg)
  stopReason: StopReason;        // "stop"|"length"|"toolUse"|"error"|"aborted"
  errorMessage?: string;
  timestamp: number;
}
interface TextContent { type: "text"; text: string; }       // ← terminal assistant TEXT
interface ToolCall    { type: "toolCall"; id: string; name: string; arguments: Record<string,any>; }
interface Usage {
  input: number;                 // ← maps to TokenUsage.input_tokens
  output: number;                // ← maps to TokenUsage.output_tokens
  cacheRead: number; cacheWrite: number; totalTokens: number; cost: {…};
}
```

> **Type-import gotcha (CRITICAL).** `AgentMessage` / `AssistantMessage` / `TextContent` /
> `Usage` live in `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` — both are
> **NON-hoisted transitive deps** nested under pi-coding-agent's `node_modules` (the SAME
> `ERR_PACKAGE_PATH_NOT_EXPORTED` problem S2's research proved for `getModel`). So T2 must
> NOT static-import these types. Instead, treat the event as `unknown`/a structural cast
> (e.g. `(event as { type: string; message?: any })`) inside the listener — exactly how
> ClaudeCodeHarness casts `SDKResultMessage`. The only import T2 needs is the VALUE
> `createAgentSession` (re-exported by pi-coding-agent) + the `AgentSession`/event TYPE
> re-exports from pi-coding-agent's own `index.d.ts` (L3: `AgentSession`,
> `AgentSessionEvent`, `AgentSessionEventListener`, `TurnEndEvent`, `AgentEndEvent`,
> `SessionStartEvent`, `SessionShutdownEvent` ARE re-exported from the top-level package).

## 3. The aggregation algorithm (what the listener captures)

Single closure over `{ lastAssistantText, totalInput, totalOutput, toolCallCount }`,
updated on the events below. The contract (item description) says: *"collects the final
assistant message text + token usage + tool-call count from TurnEnd/AgentEnd events and
fires hooks (onSessionStart/onSessionEnd via SessionStart/SessionShutdown events)."*

| Event | Capture | Hook fired |
|---|---|---|
| `session_start` | — | `hooks?.onSessionStart?.()` |
| `turn_end` | `lastAssistantText` = join of `message.content[].type==='text'`.text (**last turn wins**); `totalInput += message.usage.input`; `totalOutput += message.usage.output`; `toolCallCount += count(message.content[].type==='toolCall')` | — |
| `agent_end` | (optional) re-derive `toolCallCount` from `messages[]` for authority | — |
| `session_shutdown` | — | `hooks?.onSessionEnd?.(Date.now() - startTime)` |

**Why "last turn wins" for text:** in a multi-turn tool-use loop, each `turn_end` carries the
assistant message for THAT turn. The user-facing final answer is the **last** assistant message
(after all tool calls resolve). Overwriting `lastAssistantText` on each `turn_end` yields exactly
the final answer. (Equivalently: scan `agent_end.messages` for the last `role==='assistant'`.)

**Why accumulate usage across turns:** token usage is per-assistant-message; summing across all
`turn_end` events gives the total for the run (matches ClaudeCodeHarness summing the single
result message's usage for one-turn; Pi may emit several turns).

**Why count tool calls from `turn_end.message.content`:** each turn's assistant message contains
the `toolCall` blocks it emitted. Summing across turns = total tool calls. (Equivalent to scanning
`agent_end.messages`, but incremental + robust even if `agent_end` is delayed.)

## 4. The completion + error signals

- **Completion:** `await session.prompt(text)` resolving. All events have fired by then (§1).
  → build `createSuccessResponse(data, { agentId: this.id, timestamp, duration, usage, toolCalls })`
  where `data = lastAssistantText as unknown as T`.
- **Error:** `session.prompt(text)` REJECTS (provider/model/runtime failure — pi-agent-core's
  `StreamFn` contract encodes failures as a final assistant message with `stopReason: "error"|"aborted"`
  AND may reject). Wrap in try/catch → `createErrorResponse(AGENT_ERROR_CODES.EXECUTION_FAILED, …)`.
- **Missing data:** if `lastAssistantText === ''` after prompt resolves (no assistant text — e.g.
  model errored with `stopReason: 'error'` but prompt didn't reject), still return success with
  `data: ''` (the aggregation faithfully reports what happened). The contract does not require
  treating empty text as an error. (Streaming/hooks/skills refine this in P2.M3.T2.)

## 5. Scope boundary — what is OUT of T2

- **`onToolStart` / `onToolEnd` / `onStream`** hooks → **P2.M3.T2.S2** (HarnessHookEvents
  adaptation). T2 wires ONLY `onSessionStart`/`onSessionEnd` (the contract explicitly scopes them
  here via SessionStart/SessionShutdown). Do NOT wire tool/stream hooks in T2.
- **Streaming path** (`request.options.streaming === true` → `AsyncGenerator<StreamEvent>`) →
  **P2.M3.T2.S1**. T2 throws synchronously citing P2.M3.T2.S1 when streaming is requested.
- **`customTools` mapping** (ToolDefinition[] from toolExecutor) → **P2.M3.T1 / P2.M4**.
  T2 passes `customTools: []` (empty). `toolExecutor` is accepted as a parameter but not yet
  wired into customTools — it is a no-op in T2 (its first real use is P2.M3.T1).
- **Skills** (`loadSkills`) → P2.M3.T2.S3. **registerMCPs** → P2.M4.T1.S2. Both stay throwing stubs.

## 6. Parity with ClaudeCodeHarness.execute (PRD §7.14.4 — identical AgentResponse shape)

ClaudeCodeHarness (`src/harnesses/claude-code-harness.ts` execute, ~L360-640) is the reference:
- non-streaming path wrapped in an `(async (): Promise<AgentResponse<T>> => { … })()` IIFE
  (so the outer `execute` can also return an AsyncGenerator for streaming);
- guards `if (!this.sdk) throw new Error("… not initialized …")`;
- tracks `startTime = Date.now()`; computes `duration = Date.now() - startTime`;
- counts tool uses while iterating; extracts `usage`; returns
  `createSuccessResponse(data, { agentId: this.id, timestamp: Date.now(), duration, usage, toolCalls })`;
- error paths use `createErrorResponse('INVALID_RESPONSE_FORMAT'|'EXECUTION_FAILED', …)` (which
  sets `metadata.agentId = 'unknown'` — **this is the existing parity behaviour; PiHarness matches it**).

T2 mirrors this EXACTLY, swapping Claude's `for await (msg of queryResult)` loop for Pi's
`subscribe`-closure-capture + `await session.prompt()`. The resulting `AgentResponse<T>` is
byte-for-byte the same shape (success: `{status,data,error:null,metadata:{agentId:'pi',timestamp,duration,usage:{input_tokens,output_tokens},toolCalls}}`).
