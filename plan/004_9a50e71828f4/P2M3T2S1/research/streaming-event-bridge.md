# Streaming Event Bridge — Pi `session.subscribe` → `AsyncGenerator<StreamEvent>`

> Reference for P2.M3.T2.S1. Documents the **async-queue bridge** design, the verified Pi event
> shapes, the `StreamEvent` mapping table, and the six load-bearing scope/type decisions.

## 1. The core design challenge (WHY a queue bridge)

Pi's streaming model is **event-driven via `session.subscribe(listener)`**: the SDK calls the
listener **synchronously** as the turn progresses. `session.prompt(text)` is `Promise<void>` that
**resolves when the whole turn is done** (PRD §7.4: *"streaming: session.subscribe"*;
external_deps §1.2: `subscribe(listener) => unsubscribe; prompt(text): Promise<void>`).

A naïve `await session.prompt()` inside the generator would **not stream** — all events fire
*during* the await, but a generator can only `yield` at its own suspension points (NOT from inside
a sync listener callback). Yielding after the await resolves = streaming collapsed to one batch.

**Solution — callback→async-iterator bridge (a bounded async queue):**

```
listener (sync, fires during prompt()) ──enqueue──▶ [queue: AgentSessionEvent[]]
                                                         │
generator (async *) ◀──await resolver──dequeue──map──yield StreamEvent
```

- Listener pushes events into `queue` and resolves a waiting `resolveNext` promise (if any).
- Generator drains `queue`, maps each Pi event → `StreamEvent`, `yield`s. When `queue` is empty
  and the turn isn't done, it `await new Promise(r => resolveNext = r)` (parked until next enqueue).
- `session.prompt()` is kicked off **without awaiting in the generator body** (fire-and-track);
  on resolution it sets `done = true` and releases any parked generator.

This is the canonical "EventEmitter → AsyncIterable" bridge (Node `events.on()` does the same).
It gives **true incremental streaming** + deterministic ordering + clean teardown via
`unsubscribe()` in a `finally`.

> ClaudeCodeHarness does NOT need this bridge because its SDK (`query()`) returns an
> `AsyncGenerator<SDKMessage>` directly — it can `for await (const m of queryResult)` and `yield`.
> Pi's seam is callback-based, so the bridge is the Pi-specific contribution of this item.

## 2. Verified Pi event shapes (read from installed `.d.ts` — DO NOT IMPORT)

Source: `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`
L512-563. **These are NON-HOISTED transitive types** (`@earendil-works/pi-ai` →
`MODULE_NOT_FOUND` when required) — cast structurally, never `import`.

```ts
// L512-514
interface TurnStartEvent { type: "turn_start"; turnIndex: number; timestamp: number; }
// L518-523
interface TurnEndEvent   { type: "turn_end"; turnIndex: number; message: AgentMessage; toolResults: ToolResultMessage[]; }
// L530-534  (deltas)
interface MessageUpdateEvent { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent; }
// L541-546
interface ToolExecutionStartEvent { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any; }
// L556-562
interface ToolExecutionEndEvent   { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean; }
// L405-411 / L439
interface SessionStartEvent    { type: "session_start"; ... }
interface SessionShutdownEvent { type: "session_shutdown"; ... }
```

`AgentMessage` (from `@earendil-works/pi-ai/dist/types.d.ts` L207-221, read-only reference):

```ts
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  usage: Usage;            // { input, output, cacheRead, cacheWrite, totalTokens, cost }
  stopReason: "stop" | "toolUse" | "length" | "error" | ...;
  provider: string; model: string; timestamp: number;
  // ...
}
// TextContent = { type: "text"; text: string }
// ToolCall    = { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> }
```

These shapes are **already what the non-streaming `execute()` aggregation listener casts to**
(`event as { type: string; message?: any }` + `msg.content.filter(b => b?.type === 'text')`).
S1's streaming listener REUSES that exact structural-cast idiom (no new imports).

## 3. StreamEvent mapping table (the contract, PRD §7.14 / §7.11)

| Pi session event | → `StreamEvent` | Field mapping |
|---|---|---|
| *(start of generator)* | `{type:'metadata', metadata:{requestId, model, provider:'pi'}}` | mirror ClaudeCodeHarness L696-701 |
| `MessageUpdateEvent` | `{type:'text_delta', delta, index}` | **snapshot-diff**: accumulate `message.content` text, `delta = text.slice(fullText.length)` (§4) |
| `ToolExecutionStartEvent` | `{type:'tool_call_start', id:toolCallId, name:toolName, index}` | index = per-stream counter |
| `ToolExecutionEndEvent` | `{type:'tool_call_done', id:toolCallId, result}` | carry `result` (isError surfaced only in result) |
| `TurnEndEvent` (terminal per turn) | `{type:'usage', inputTokens, outputTokens, cacheTokens?}` | from `message.usage` (§5) |
| *(prompt resolved, queue drained)* | `{type:'done', finishReason:'stop'}` | terminal success |
| prompt() rejects / error event | `{type:'error', error, code:'EXECUTION_FAILED', retryable:true}` | then return error `AgentResponse` |

Notes:
- `metadata` is yielded **first** (before prompt kicks off) so consumers can correlate.
- `usage` uses the **last** `TurnEndEvent` usage (the final assistant message). Accumulating
  across multiple turns is acceptable but ClaudeCodeHarness emits one usage event from the final
  result — keep parity: emit usage once, from the final turn_end seen.
- `done` is yielded exactly once, after the queue is drained.
- `finishReason` is `'stop'` on normal completion (Pi `stopReason:'stop'`); `'tool_calls'`/`'length'`
  are refinements S1 MAY derive from the final `stopReason` but `'stop'` is the parity-safe default.

## 4. Text-delta extraction — snapshot-diff (NOT assistantMessageEvent internals)

`MessageUpdateEvent.assistantMessageEvent` is an `AssistantMessageEvent` (a start/done/error/partial
union from `@earendil-works/pi-ai`). Reading its delta fields would (a) require importing the
non-hoisted transitive type and (b) couple us to provider-specific delta encodings.

**Use the snapshot-diff approach** (identical to ClaudeCodeHarness L751-761):

```ts
// On every message_update whose message.role === 'assistant':
const text = (e.message?.content ?? [])
  .filter((b: any) => b?.type === "text")
  .map((b: any) => b.text ?? "")
  .join("");
if (text.length > fullText.length && text.startsWith(fullText)) {
  yield { type: "text_delta", delta: text.slice(fullText.length), index: textIndex++ };
}
fullText = text.length > fullText.length ? text : fullText;
```

Robust to partial-text replays, provider-agnostic, and **byte-for-byte parity** with ClaudeCodeHarness.
`fullText` doubles as the final `AgentResponse.data` (last assistant text — same as non-streaming).

## 5. Usage extraction (mirrors non-streaming aggregation)

`TurnEndEvent.message.usage = { input, output, cacheRead, cacheWrite, totalTokens, cost }`
(verified in the `Usage` shape via non-streaming research). Map:

```ts
inputTokens  = usage.input  ?? 0;
outputTokens = usage.output ?? 0;
cacheTokens  = usage.cacheRead ?? usage.cacheWrite;  // mirror ClaudeCodeHarness L843-845
```

Emit **one** `usage` event (from the last turn_end). If multiple turns occur, the last one wins
(matches the non-streaming "last turn wins" semantics for text; usage is final-turn authoritative
for the response).

## 6. The six load-bearing decisions

### Decision 1 — REUSE P2.M3.T1.S1's `customTools` seam; do NOT duplicate

P2.M3.T1.S1 (parallel, will be DONE when S1 runs) wires
`customTools: this.buildCustomTools(toolExecutor)` into the **non-streaming** `createAgentSession`.
S1's streaming path calls `createAgentSession` with the **identical** options — including
`customTools: this.buildCustomTools(toolExecutor)`. Do NOT hardcode `customTools: []` in the
streaming branch (that would undo S1.T1's tool parity for streaming). The two paths differ ONLY in
how they consume the session (await prompt + aggregate vs. queue bridge + yield).

### Decision 2 — Snapshot-diff for deltas (NOT assistantMessageEvent)

See §4. Avoids the `@earendil-works/pi-ai` transitive-import wall + gives ClaudeCodeHarness parity.

### Decision 3 — NO transitive type imports; structural casts only

`AssistantMessageEvent`, `AssistantMessage`, `Usage`, `TextContent` all live under
`@earendil-works/pi-ai` (non-hoisted transitive — `require()` returns `MODULE_NOT_FOUND`,
confirmed). S1 imports ONLY what the non-streaming path already imports from
`@earendil-works/pi-coding-agent`: `AgentSession`/`AgentSessionEvent`/`AgentSessionEventListener`
(types) + `ModelRegistry`/`AuthStorage` (values) — plus `createAgentSession` is reached via
`this.sdk!.createAgentSession` (already the pattern). Cast `event as { type: string; message?: any }`
exactly like the non-streaming listener.

### Decision 4 — Scope: session lifecycle hooks STAY; tool/stream hooks are S2

The non-streaming `execute()` already fires `hooks?.onSessionStart?.()` (session_start) and
`hooks?.onSessionEnd?.(duration)` (session_shutdown). For parity, S1's streaming listener **keeps
those two**. `onToolStart`/`onToolEnd`/`onStream` (HarnessHookEvents §7.11) are **P2.M3.T2.S2's
deliverable** — S1 does NOT wire them (would conflict / pre-empt S2). Document this in a comment.

### Decision 5 — Generator RETURN value = final AgentResponse (success OR error)

`AsyncGenerator<StreamEvent, AgentResponse<T>>` — the `TReturn` is the final `AgentResponse`.
On success: `return createSuccessResponse(fullText, {...})`. On prompt-rejection: yield an `error`
event THEN `return createErrorResponse(EXECUTION_FAILED, ..., true)`. Consumers can read the final
value via `const final = yield* gen` or `(await gen.next()).value` after `done: true`. This is the
contract: *"return final AgentResponse as generator return value"*.

### Decision 6 — REMOVE the obsolete streaming-throws test (pi-harness-execute.test.ts)

`src/__tests__/unit/providers/pi-harness-execute.test.ts` L156-167 has
`describe('streaming branch') { it('should throw synchronously citing P2.M3.T2.S1 ...', ...) }`.
Once S1 implements streaming, `execute(..., {streaming:true})` returns a generator instead of
throwing — this assertion FAILS. **S1 removes that entire `describe('streaming branch')` block.**
(Same removal discipline as P2.M3.T1.S1's registerMCPs-assertion removal.)
The NEW streaming suite goes in `pi-harness-streaming.test.ts` (mirror P2.M2.T2.S1's fake-session
test idiom — `makeFakeSession` + private `harness.sdk` overwrite).
