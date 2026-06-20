# PRP — P2.M3.T2.S1: `StreamEvent` mapping from Pi session events

**PRD reference:** §7.3 (`Harness.execute` returns `Promise | AsyncGenerator<StreamEvent, AgentResponse<T>>`),
§7.4 (`pi` capabilities: streaming ✓ via `session.subscribe`), §7.11 (hook adaptation table —
*`(streaming)` `onStream` ← `message_update`*; tool/lifecycle hooks), §7.14 / §7.14.4 (parity:
identical `StreamEvent` shape + `AgentResponse` from both harnesses; PRD §7.14.3 hooks fire with
consistent ordering), §6 (AgentResponse JSON model — the generator's return value).
**Plan:** `plan/004_9a50e71828f4/` — S1 of P2.M3.T2 ("PiHarness streaming, hooks & skills").
**Consumes** P2.M2.T2.S1 (the non-streaming `execute()` IIFE + the aggregation `listener` +
`createSuccessResponse`/`createErrorResponse` + the `subscribe`/`prompt` usage + `resolveModel`),
P2.M2.T1.S2 (`initialize`/`terminate` + private `sdk`/`authStorage`/`modelRegistry`/`options`),
and **P2.M3.T1.S1 (parallel — assumed DONE)** which wires `customTools: this.buildCustomTools(toolExecutor)`
into `createAgentSession` (S1's streaming path REUSES that seam — Decision 1). **Consumes the
EXISTS** `StreamEvent` union (`src/types/streaming.ts`) and `AgentSession.subscribe`
(`@earendil-works/pi-coding-agent`, external_deps §1.2/§1.6). **Unblocks** P2.M3.T2.S2
(`HarnessHookEvents` adaptation — reuses S1's listener + queue; adds `onToolStart`/`onToolEnd`/
`onStream`), P3.M1.T2.S2 (`Agent.stream()` → harness resolution + streaming `HarnessRequest`),
P4.M2.T1.S1 (parity tests assert identical `StreamEvent` ordering across `pi`+`claude-code`).
**Scope tag:** REPLACE the throwing streaming branch in `src/harnesses/pi-harness.ts` with a real
`private async *executeStreaming<T>()` generator (async-queue bridge: Pi's sync `subscribe(listener)`
→ `AsyncGenerator<StreamEvent>`). Map Pi events → `StreamEvent` (metadata → text_delta →
tool_call_start/done → usage → done → error). `return` the final `AgentResponse<T>`. Wire
`execute()` to `return this.executeStreaming(...)` when `request.options.streaming === true`
(mirror `ClaudeCodeHarness.executeStreaming` L386-395). ADD 1 new test file. REMOVE 1 obsolete
`describe` block from `pi-harness-execute.test.ts`. **No edits** to `registerMCPs`/`buildCustomTools`/
`customTools` wiring (owned by P2.M3.T1.S1 — REUSED), `loadSkills` stub, types, barrels, registry.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Six load-bearing details:
> (1) **Pi's `session.subscribe(listener)` is SYNC** — a listener cannot `yield`. You MUST build an
> async-queue bridge (listener `enqueue` + generator `dequeue`/`await resolver`) so events stream
> INCREMENTALLY. See `research/streaming-event-bridge.md` §1. (2) **Text deltas use snapshot-diff**
> (accumulate `message.content` text, `delta = text.slice(fullText.length)`) — NOT
> `assistantMessageEvent` internals (which would force a transitive `@earendil-works/pi-ai` import).
> This gives byte-for-byte parity with `ClaudeCodeHarness` L751-761. (3) **REUSE P2.M3.T1.S1's
> `customTools: this.buildCustomTools(toolExecutor)`** in the streaming `createAgentSession` call —
> do NOT hardcode `customTools: []` (would undo tool parity for streaming). (4) **No transitive type
> imports** — `AssistantMessageEvent`/`AssistantMessage`/`Usage`/`TextContent` are non-hoisted
> transitives (`require('@earendil-works/pi-ai')` → `MODULE_NOT_FOUND`, confirmed). Cast
> `event as { type: string; message?: any }` exactly like the non-streaming listener. (5) **Session
> lifecycle hooks STAY** (`onSessionStart`/`onSessionEnd` — parity with non-streaming); `onToolStart`/
> `onToolEnd`/`onStream` are **P2.M3.T2.S2's** job — do NOT wire them. (6) **REMOVE the
> `describe('streaming branch')` block** from `pi-harness-execute.test.ts` (L156-167) — its
> `should throw synchronously citing P2.M3.T2.S1` assertion is obsolete once streaming is implemented.

---

## Goal

**Feature Goal:** Give `PiHarness` a working **streaming path** that yields `StreamEvent`s as the Pi
session progresses and returns the final `AgentResponse<T>` — parity with `ClaudeCodeHarness.executeStreaming`
(PRD §7.14.4). Concretely: when `request.options.streaming === true`, `execute()` returns an
`AsyncGenerator<StreamEvent, AgentResponse<T>>` that subscribes to the Pi session, bridges the sync
event callbacks into the async generator via an internal queue, maps each Pi event to the
`StreamEvent` union (`src/types/streaming.ts`), and `return`s the final `AgentResponse<T>`. The
non-streaming path, `registerMCPs`/`buildCustomTools`/`customTools`, `loadSkills`, lifecycle, and
model resolution are **unchanged**.

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`**:
   - REPLACE the streaming-throw branch (`if (request.options.streaming) { throw … P2.M3.T2.S1 }`)
     with `return this.executeStreaming<T>(request, toolExecutor, hooks);` (mirror ClaudeCodeHarness
     L386-395; **synchronous return** of the generator — NOT a promise).
   - ADD `private async *executeStreaming<T>(request, toolExecutor, hooks):
     AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` — the async-queue bridge generator
     (see "Implementation Patterns"): init guard → resolve model → `createAgentSession` (REUSING
     `customTools: this.buildCustomTools(toolExecutor)` from P2.M3.T1.S1) → yield `metadata` →
     subscribe listener that enqueues events + fires `onSessionStart`/`onSessionEnd` → kick off
     `session.prompt()` (not awaited in generator body) → drain loop mapping Pi events → `StreamEvent`
     (text_delta via snapshot-diff, tool_call_start/done, usage) → yield `done` → `return` final
     `AgentResponse`; error path yields `error` event then `return createErrorResponse`.
   - LEAVE the non-streaming `execute()` IIFE, `registerMCPs`/`buildCustomTools`/`customTools`
     wiring, `loadSkills` stub, `resolveModel`/`initialize`/`terminate`, `normalizeModel`,
     `supports`/`requiresFeatures` **UNCHANGED**.
2. **MODIFY `src/__tests__/unit/providers/pi-harness-execute.test.ts`** — REMOVE the entire
   `describe('streaming branch')` block (L156-167, the `should throw synchronously citing P2.M3.T2.S1`
   `it(...)`). KEEP all other (non-streaming) assertions.
3. **NEW `src/__tests__/unit/providers/pi-harness-streaming.test.ts`** — the streaming suite, mocking
   `createAgentSession` with a fake session whose `subscribe` captures the listener and whose `prompt`
   replays a **scripted Pi event sequence** (reuse P2.M2.T2.S1's `makeFakeSession` idiom —
   `research/test-mock-pattern.md`): assert (a) `execute(...,{streaming:true})` returns an
   AsyncGenerator (not a Promise; not a throw); (b) `metadata` yielded first; (c) `message_update`
   → `text_delta` events with correct `delta`/`index` (snapshot-diff); (d) `tool_execution_start`
   → `tool_call_start` (`id`/`name`), `tool_execution_end` → `tool_call_done` (`id`/`result`);
   (e) `turn_end` → `usage` (`inputTokens`/`outputTokens`/`cacheTokens`); (f) `done` yielded last
   with `finishReason:'stop'`; (g) the generator's **return value** is a success `AgentResponse`
   (`status:'success'`, `data`=full text, `usage`, `metadata.agentId==='pi'`); (h) prompt-rejection →
   `error` event (`code:'EXECUTION_FAILED'`, `retryable:true`) + return value is an error
   `AgentResponse`; (i) `onSessionStart`/`onSessionEnd` hooks still fire (parity); (j) uninitialized
   harness → throws `/not initialized/i`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles; the async generator + queue
   bridge + `StreamEvent` yields + `AgentResponse` return type are sound; no forbidden transitive
   import (`@earendil-works/pi-ai` / `pi-agent-core`); no import cycle; `executeStreaming` satisfies
   `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`.
2. `npm test` exits 0 — new streaming suite + (edited) execute suite + full regression all green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted with the real `executeStreaming`.
4. Runtime spot-check (tsx/vitest): a `PiHarness` with `harness.sdk.createAgentSession` monkey-patched
   to a fake session that replays `[session_start, message_update×3, tool_execution_start,
   tool_execution_end, turn_end, message_update(final), turn_end, agent_end]` produces, in order,
   `[metadata, text_delta×3, tool_call_start, tool_call_done, usage, text_delta, usage, done]` and a
   final `AgentResponse` whose `data` === the concatenated assistant text.
5. Contract (grep): `async *executeStreaming`, `AsyncGenerator<StreamEvent, AgentResponse<T>`,
   `return this.executeStreaming`, `enqueue`/queue resolver, `text.slice(fullText.length)`,
   `customTools: this.buildCustomTools(toolExecutor)` (REUSED — not `[]`); NO `@earendil-works/pi-ai`
   import; the streaming throw citing P2.M3.T2.S1 is GONE.

---

## ⚠️ SCOPE DECISIONS — six load-bearing details

### Decision 1 — REUSE P2.M3.T1.S1's `customTools` seam; do NOT duplicate or undo

P2.M3.T1.S1 (parallel — assumed DONE when S1 runs) replaces the non-streaming `customTools: []` with
`customTools: this.buildCustomTools(toolExecutor)` in the **non-streaming** `createAgentSession` call.
S1's streaming path calls `createAgentSession` with the **identical** options object — including
`customTools: this.buildCustomTools(toolExecutor)`. Do NOT copy P2.M3.T1.S1's `buildCustomTools`/`mcpHandler`
(they live on the class already); just call the existing method. If you accidentally hardcode
`customTools: []` in the streaming branch, streaming mode would be tool-blind (parity regression).
**Verify via pre-flight grep** (Task 0): `buildCustomTools` + `mcpHandler` must already exist on the
class; if not, P2.M3.T1.S1 hasn't landed — STOP (S1 depends on it).

### Decision 2 — Snapshot-diff for text deltas (NOT `assistantMessageEvent` internals)

`MessageUpdateEvent.assistantMessageEvent` is an `AssistantMessageEvent` (start/done/error/partial
union) from `@earendil-works/pi-ai` — a **non-hoisted transitive** (`require()` → `MODULE_NOT_FOUND`,
confirmed). Reading its delta fields would (a) need that import (forbidden) and (b) couple us to
provider-specific delta encodings. **Use snapshot-diff** (identical to `ClaudeCodeHarness` L751-761):

```ts
// On message_update whose message.role === 'assistant':
const text = (e.message?.content ?? []).filter(b => b?.type === "text").map(b => b.text ?? "").join("");
if (text.length > fullText.length && text.startsWith(fullText)) {
  yield { type: "text_delta", delta: text.slice(fullText.length), index: textIndex++ };
  fullText = text;
}
```

Provider-agnostic, byte-for-byte parity with ClaudeCodeHarness, and `fullText` doubles as the final
`AgentResponse.data` (last assistant text — same as non-streaming "last turn wins"). See research §4.

### Decision 3 — Async-queue bridge (Pi's subscribe is SYNC; a listener cannot `yield`)

`session.subscribe(listener)` calls `listener` **synchronously during `await session.prompt()`**,
which only resolves when the whole turn is done. Yielding inside the listener is impossible (a
generator yields only at its own suspension points). Without a bridge, all events collapse into a
single batch after `prompt()` resolves = no streaming.

**Bridge:** a bounded async queue. The listener `enqueue`s events + resolves a parked `resolveNext`
promise; the generator `dequeue`s, maps, and `yield`s, parking on
`await new Promise<void>(r => { resolveNext = r })` when the queue is empty. `session.prompt()` is
**kicked off without awaiting in the generator body** (fire-and-track via a detached promise);
`.finally(() => { done = true; release })` flips the drain loop's terminal condition. Canonical
EventEmitter→AsyncIterable pattern (Node's `events.on()`). See research §1.

### Decision 4 — NO transitive type imports; structural casts only

`AssistantMessageEvent`, `AssistantMessage`, `Usage`, `TextContent`, `ToolCall` all live under
`@earendil-works/pi-ai` (non-hoisted transitive — `MODULE_NOT_FOUND` on `require()`, confirmed).
S1 imports ONLY what the non-streaming path already imports from `@earendil-works/pi-coding-agent`:
`AgentSession`/`AgentSessionEvent`/`AgentSessionEventListener` (types) + `ModelRegistry`/`AuthStorage`
(values). `createAgentSession` is reached via `this.sdk!.createAgentSession` (existing pattern). Cast
`event as { type: string; message?: any; toolCallId?: string; toolName?: string; result?: any; isError?: boolean }`
exactly like the non-streaming listener. NO new imports from the Pi package beyond what's already there.

### Decision 5 — Session lifecycle hooks STAY; tool/stream hooks are P2.M3.T2.S2

The non-streaming `execute()` listener already fires `hooks?.onSessionStart?.()` (session_start) and
`hooks?.onSessionEnd?.(duration)` (session_shutdown) — PRD §7.11 mapping. For non-streaming/streaming
parity, S1's streaming listener **keeps those two** (copy the same two `case`s). `onToolStart`/
`onToolEnd`/`onStream` (`HarnessHookEvents` §7.11 — `tool_execution_start`/`tool_execution_end`/
`message_update` sources) are **P2.M3.T2.S2's** deliverable. S1 does NOT wire them — doing so would
conflict with S2. Document the boundary in a code comment near the listener.

### Decision 6 — REMOVE the obsolete `describe('streaming branch')` from pi-harness-execute.test.ts

`src/__tests__/unit/providers/pi-harness-execute.test.ts` L156-167 has:
```ts
describe('streaming branch', () => {
  it('should throw synchronously citing P2.M3.T2.S1 when streaming is true', () => {
    expect(() => harness.execute({ prompt:'test', options:{ streaming:true } }, dummyToolExecutor))
      .toThrow(/P2\.M3\.T2\.S1/);
  });
});
```
Once S1 implements streaming, `execute(...,{streaming:true})` returns a generator — this assertion
FAILS. **S1 removes the entire `describe('streaming branch')` block** (L156-167), KEEPING the
`describe('uninitialized guard')` above it and the `describe('success aggregation')` below it
intact. Confirmed by grep: only `pi-harness-execute.test.ts` references the streaming-throw
assertion. (Same removal discipline as P2.M3.T1.S1's registerMCPs-assertion removal.) The NEW
streaming suite lives in its own file (`pi-harness-streaming.test.ts`) so the execute file stays
focused on non-streaming behavior.

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P2.M3.T2.S2 (hooks)** — reuses S1's listener + queue bridge; adds `onToolStart`/`onToolEnd`/
  `onStream` to the same `enqueue` seam.
- **P3.M1.T2.S2 (`Agent.stream()`)** — calls `registry.get('pi').execute(req, toolExecutor, hooks)`
  with `options.streaming:true` and consumes the `AsyncGenerator<StreamEvent, AgentResponse<T>>`.
- **P4.M2.T1.S1 (parity tests)** — asserts identical `StreamEvent` ordering + `AgentResponse` shape
  across `pi` and `claude-code` harnesses.

**Use Case:** PRD §7.4 — `pi` is the **default** harness with streaming capability ✓
(`session.subscribe`). End users (`Agent.stream(prompt)`) expect real-time `text_delta` chunks,
tool-call boundaries, usage, and a terminal `done` — identical to the `claude-code` experience.

**Pain Points Addressed:** Until S1, `PiHarness.execute(...,{streaming:true})` **throws**
synchronously (the streaming branch cites P2.M3.T2.S1). Any consumer calling `agent.stream()` on the
default harness crashes. S1 removes that blocker and delivers full streaming parity.

---

## Why

- **Realizes PRD §7.3 + §7.4** — `execute()` returns `AsyncGenerator<StreamEvent, AgentResponse<T>>`
  for streaming; the `pi` capability `streaming:true` is backed by `session.subscribe`.
- **Delivers streaming parity** (§7.14 / §7.14.4 — *"Identical `AgentResponse<T>` shape from both
  harnesses"*; the `StreamEvent` union is the shared contract in `src/types/streaming.ts`).
- **Unblocks P3.M1.T2.S2** — `Agent.stream()` resolves the harness and forwards a streaming
  `HarnessRequest`; without S1, streaming on the default harness throws.
- **Keeps the harness plugin-free + provider-agnostic** — Pi's event stream is provider-neutral;
  S1's snapshot-diff (Decision 2) does not depend on any provider's delta encoding.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — real `executeStreaming()` + `execute()` streaming branch wiring.
2. **MODIFY** `src/__tests__/unit/providers/pi-harness-execute.test.ts` — remove obsolete streaming-throws `describe`.
3. **CREATE** `src/__tests__/unit/providers/pi-harness-streaming.test.ts` — streaming suite (fake-session event replay).
4. **VALIDATE** (lint / targeted tests / full suite / build / grep + runtime spot-check).

### Success Criteria

- [ ] `execute(request, toolExecutor, hooks)` with `request.options.streaming === true` returns an
      `AsyncGenerator<StreamEvent, AgentResponse<T>>` (synchronously; not a Promise; not a throw).
- [ ] `execute(...)` with `streaming` falsy **still** returns the non-streaming `Promise<AgentResponse<T>>`
      (P2.M2.T2.S1 path — unchanged).
- [ ] The generator yields `metadata` FIRST, then `text_delta`(s) / `tool_call_start` / `tool_call_done`
      / `usage`, and `done` LAST — in the order the Pi events arrive.
- [ ] `message_update` (assistant) → `text_delta` whose `delta` is the newly-accumulated text
      (snapshot-diff) and `index` increments per delta.
- [ ] `tool_execution_start` → `tool_call_start { id: toolCallId, name: toolName, index }`;
      `tool_execution_end` → `tool_call_done { id: toolCallId, result }`.
- [ ] `turn_end` (assistant message with `usage`) → `usage { inputTokens, outputTokens, cacheTokens? }`.
- [ ] On success, the generator's **return value** is `AgentResponse<T>` with `status:'success'`,
      `data` = final assistant text, `metadata.agentId === 'pi'`, `metadata.duration >= 0`.
- [ ] On `session.prompt()` rejection, the generator yields an `error` event
      (`code:'EXECUTION_FAILED'`, `retryable:true`) and its return value is an error `AgentResponse`
      (`status:'error'`, `error.code === 'EXECUTION_FAILED'`).
- [ ] `onSessionStart` fires on `session_start`; `onSessionEnd(duration)` fires on `session_shutdown`
      (parity with non-streaming). `onToolStart`/`onToolEnd`/`onStream` are NOT wired (S2).
- [ ] Uninitialized harness → `execute(...,{streaming:true})` throws synchronously `/not initialized/i`
      (the init guard runs before returning the generator).
- [ ] `loadSkills` still throws citing P2.M3.T2.S3; `registerMCPs`/`buildCustomTools`/`customTools`
      wiring untouched (P2.M3.T1.S1).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.
- [ ] No import of `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core` (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/harnesses/pi-harness.ts` (the file with the non-streaming
`execute()` IIFE + the aggregation listener + `customTools: this.buildCustomTools(toolExecutor)` from
P2.M3.T1.S1 + the streaming-throw branch), `src/harnesses/claude-code-harness.ts` (`executeStreaming`
L624-873 — the generator pattern to mirror: metadata-first, text-delta snapshot-diff L751-761, usage
L837-848, done L849-858, return AgentResponse L860-870), `src/types/streaming.ts` (the `StreamEvent`
union — the exact target shapes), `src/types/agent.ts` (`createSuccessResponse`/`createErrorResponse`/
`AgentResponseMetadata`/`AGENT_ERROR_CODES`), and `plan/004_9a50e71828f4/P2M2T2S1/research/test-mock-pattern.md`
(the `makeFakeSession` fake-session idiom), and (c) the copy-paste-ready snippets below +
`research/streaming-event-bridge.md`. The six load-bearing details (queue-bridge, snapshot-diff,
reuse-customTools, no-transitive-imports, hook-scope-boundary, test-removal) are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness system).
- url: PRD.md §7.3, §7.4, §7.11, §7.14, §7.14.3, §7.14.4   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.3 = execute() returns Promise | AsyncGenerator<StreamEvent, AgentResponse<T>> (the signature
       S1 implements); §7.4 = pi capability streaming:true via session.subscribe; §7.11 = hook mapping
       table (onStream ← message_update; onToolStart ← tool_execution_start; onToolEnd ← tool_execution_end;
       onSessionStart ← session_start; onSessionEnd ← session_shutdown) — S1 wires ONLY session hooks;
       §7.14.3 = hooks fire with consistent ordering; §7.14.4 = identical AgentResponse from both harnesses.
  critical: §7.3 is WHY execute() must return the generator synchronously (not a Promise<Generator>).

# MUST READ — the verified Pi SDK event surface (§1.2 subscribe/prompt; §1.6 event list).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.2 = AgentSession.subscribe(listener)=>unsubscribe + prompt(text): Promise<void> (the SYNC-callback
       contract that mandates the queue bridge — Decision 3); §1.6 = the full event list (MessageUpdateEvent,
       ToolExecutionStartEvent, ToolExecutionEndEvent, TurnEndEvent, ToolResultEvent, MessageStart/EndEvent);
       §4 = adapter-design table ("Streaming deltas: MessageUpdateEvent via subscribe" vs Claude's
       includePartialMessages — confirms the Pi-specific bridge is the contribution).
  critical: §1.2 confirms subscribe is synchronous + prompt resolves at turn end (the bridge is mandatory).

# MUST READ — the six load-bearing decisions (queue bridge, mapping table, deltas, hook boundary, test removal).
- file: plan/004_9a50e71828f4/P2M3T2S1/research/streaming-event-bridge.md
  why: §1 = WHY the async-queue bridge (sync listener cannot yield) + the canonical bridge design; §2 =
       verified Pi event shapes (read from .d.ts — DO NOT IMPORT); §3 = the StreamEvent mapping table
       (the contract); §4 = snapshot-diff rationale + parity with ClaudeCodeHarness; §5 = usage extraction;
       §6 = the six decisions.
  critical: §1 (Decision 3 — bridge) + §3 (the mapping table) + §4 (snapshot-diff) are the three most
            load-bearing facts.

# MUST READ — the generator to mirror (ClaudeCodeHarness.executeStreaming).
- file: src/harnesses/claude-code-harness.ts
  why: L386-395 = execute()'s streaming branch (`if (request.options.streaming) { init guard; return
       this.executeStreaming(...); }` — synchronous generator return); L624-641 = executeStreaming signature
       + init guard; L696-701 = yield metadata FIRST; L751-761 = text-delta snapshot-diff (`text.slice(fullText.length)`);
       L763-775 = tool_call_start/done; L837-848 = usage event; L849-858 = done event; L860-870 = return
       createSuccessResponse (the generator's TReturn). ERROR path L825-836 = yield error + throw — NOTE:
       Pi S1 RETURNS createErrorResponse instead of throwing (Decision 5 in research §6).
  pattern: copy the control flow (metadata → deltas → tool calls → usage → done → return AgentResponse);
           ADAPT the source from `for await (m of queryResult)` to the Pi queue-bridge drain loop.

# MUST READ — the file S1 modifies (the non-streaming execute IIFE + aggregation listener + customTools).
- file: src/harnesses/pi-harness.ts
  why: Ships (P2.M3.T1.S1 + P2.M2.T2.S1 + S1/S2): id/capabilities/normalizeModel; the 4 private fields;
       real initialize/terminate; resolveModel; the REAL non-streaming execute() IIFE (with
       `customTools: this.buildCustomTools(toolExecutor)` — REUSE in streaming); the aggregation listener
       (the structural cast + session_start/session_shutdown hooks + turn_end text/usage extraction —
       COPY into the streaming listener); the STREAMING-throw branch (REPLACE with executeStreaming wiring).
  gotcha: The streaming branch throw is the ONE block to replace. The non-streaming listener's
          `case "session_start"` / `case "session_shutdown"` hooks + the `e.message.content` text filter
          are reused verbatim in the streaming listener (Decision 5).

# MUST READ — the StreamEvent union (the exact target shapes S1 yields).
- file: src/types/streaming.ts
  why: StreamEvent discriminated union — S1 yields exactly: {type:'metadata', metadata:{requestId?,model?,provider}}
       (L40), {type:'text_delta', delta, index} (L31), {type:'tool_call_start', id, name, index} (L36),
       {type:'tool_call_done', id, result} (L39), {type:'usage', inputTokens, outputTokens, cacheTokens?} (L46),
       {type:'done', finishReason} (L49), {type:'error', error, code?, retryable?} (L52). AsyncStream<T>
       interface (L61) documents the `stream: AsyncGenerator<StreamEvent, AgentResponse<T>>` + controller shape.
  gotcha: tool_call_start REQUIRES id+name+index; text_delta REQUIRES delta+index; done REQUIRES finishReason
          ('stop'|'length'|'tool_calls'|'error'); error REQUIRES an Error instance (not a string).

# MUST READ — AgentResponse factory + metadata + error codes (the generator's return value).
- file: src/types/agent.ts
  why: createSuccessResponse(data, metadata) (L710) + createErrorResponse(code, message, details, recoverable)
       (L765) + AgentResponseMetadata { agentId, timestamp, duration?, ... } (L445) + AGENT_ERROR_CODES
       (EXECUTION_FAILED). Already imported by the non-streaming path — S1 reuses the SAME imports.

# SHOULD READ — the fake-session test idiom (makeFakeSession + private harness.sdk overwrite).
- file: plan/004_9a50e71828f4/P2M2T2S1/research/test-mock-pattern.md
  why: §2 = makeFakeSession(events) factory (subscribe captures listener; prompt replays events); §3 =
       private-field overwrite pattern (`harness.sdk = { ...harness.sdk, createAgentSession: vi.fn().mockResolvedValue({session}) }`
       via @ts-expect-error); §4 = the scripted Pi event payloads (turn_end with message.content + usage);
       §5 = the assertion matrix (adapt to streaming: assert yielded StreamEvents + generator return value).
  pattern: copy makeFakeSession; the fake session's prompt() MUST replay events SYNCHRONOUSLY into the
           captured listener (the queue bridge handles async yield). For the error case, prompt() rejects.
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (executeStreaming L624-873; streaming branch L386-395)
├── harness-registry.ts      # untouched (HarnessRegistry; test reset helpers)
├── index.ts                 # untouched (barrel)
├── pi-harness.ts            # ← MODIFY (executeStreaming + execute() streaming branch; reuse customTools + listener)
└── session-store.ts         # untouched
src/types/
├── agent.ts                 # CONSUMER (createSuccessResponse/createErrorResponse/AGENT_ERROR_CODES — already imported)
├── harnesses.ts             # CONSUMER (HarnessRequest.options.streaming; ToolExecutionRequest/Result; HarnessHookEvents)
└── streaming.ts             # CONSUMER (StreamEvent union — the target shapes; AsyncStream<T>)
src/__tests__/unit/providers/
├── claude-code-harness-execute.test.ts        # REFERENCE (streaming test idiom — assert yielded events)
├── pi-harness.test.ts                          # untouched (registerMCPs/loadSkills throw assertions — P2.M3.T1.S1 edited)
├── pi-harness-initialize.test.ts               # must still pass
├── pi-harness-normalizemodel.test.ts           # must still pass
├── pi-harness-resolvemodel.test.ts             # must still pass
├── pi-harness-execute.test.ts                  # ← MODIFY (remove streaming-branch describe L156-167)
└── pi-harness-streaming.test.ts                # ← NEW
node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts  # READ-ONLY (event shapes L512-563)
node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/  # NON-HOISTED — DO NOT IMPORT
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                          # MODIFY (executeStreaming + execute() streaming branch)
src/__tests__/unit/providers/pi-harness-execute.test.ts  # MODIFY (remove streaming-branch describe)
src/__tests__/unit/providers/pi-harness-streaming.test.ts  # NEW
# (registerMCPs/buildCustomTools/customTools wiring, loadSkills stub, non-streaming execute IIFE, types, barrels — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Pi's session.subscribe(listener) is SYNCHRONOUS. A listener CANNOT yield (a generator
//   yields only at its own suspension points). You MUST build an async-queue bridge: listener enqueues
//   events + resolves a parked resolveNext; generator drains the queue, maps, yields, and parks on
//   `await new Promise<void>(r => { resolveNext = r })` when empty. session.prompt() is kicked off
//   WITHOUT awaiting in the generator body; .finally(() => { done=true; release }) ends the drain loop.
//   (Decision 3; research/streaming-event-bridge.md §1.) Without this, all events collapse to one batch.

// CRITICAL #2 — Text deltas use SNAPSHOT-DIFF, NOT assistantMessageEvent internals. Accumulate the
//   assistant message's text (filter content for type==='text'), delta = text.slice(fullText.length).
//   Byte-for-byte parity with ClaudeCodeHarness L751-761; avoids the @earendil-works/pi-ai import wall.
//   (Decision 2; research §4.)

// CRITICAL #3 — REUSE `customTools: this.buildCustomTools(toolExecutor)` from P2.M3.T1.S1 in the
//   streaming createAgentSession call. Do NOT hardcode `customTools: []` (tool-parity regression).
//   Pre-flight grep MUST confirm buildCustomTools + mcpHandler exist on the class (Decision 1).

// CRITICAL #4 — NO transitive type imports. AssistantMessageEvent/AssistantMessage/Usage/TextContent/ToolCall
//   live under @earendil-works/pi-ai (non-hoisted; require() → MODULE_NOT_FOUND, confirmed). Cast
//   structurally: `event as { type:string; message?:any; toolCallId?:string; toolName?:string; result?:any; isError?:boolean }`.
//   Import ONLY what the non-streaming path already imports from @earendil-works/pi-coding-agent
//   (AgentSession/AgentSessionEvent/AgentSessionEventListener types; ModelRegistry/AuthStorage values).
//   (Decision 4.)

// CRITICAL #5 — execute()'s streaming branch must RETURN the generator SYNCHRONOUSLY (not a Promise).
//   Mirror ClaudeCodeHarness L386-395: `if (request.options.streaming) { init guard; return this.executeStreaming(...); }`.
//   The Harness interface type is `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`
//   — returning the generator directly satisfies it. Do NOT wrap in an async IIFE.

// CRITICAL #6 — REMOVE the entire `describe('streaming branch')` block (L156-167) from
//   pi-harness-execute.test.ts. Its `should throw synchronously citing P2.M3.T2.S1` assertion is
//   obsolete. KEEP the uninitialized-guard describe above + success-aggregation describe below.
//   (Decision 6.)

// GOTCHA #7 — Session lifecycle hooks STAY (onSessionStart/onSessionEnd) for parity; onToolStart/
//   onToolEnd/onStream are P2.M3.T2.S2. Do NOT wire tool/stream hooks in S1 (Decision 5). Document
//   the boundary in a comment near the streaming listener.

// GOTCHA #8 — The generator's RETURN value (TReturn) is the final AgentResponse<T>. On success:
//   `return createSuccessResponse(fullText, {...})`. On prompt-rejection: yield an error event THEN
//   `return createErrorResponse(EXECUTION_FAILED, ..., true)` — do NOT throw (consumers read TReturn
//   via `yield*` or final `.next()`). This differs from ClaudeCodeHarness (which throws) because Pi's
//   contract says "return final AgentResponse as generator return value" (research §6 Decision 5).

// GOTCHA #9 — usage is emitted ONCE from the final turn_end (last assistant message with usage).
//   cacheTokens = usage.cacheRead ?? usage.cacheWrite (mirror ClaudeCodeHarness L843-845). If no
//   turn_end carried usage, OMIT the usage event (don't emit zeros — ClaudeCodeHarness guards on
//   `if (resultMessage.usage)`).

// GOTCHA #10 — message_update fires for ALL message types (user/assistant/toolResult). Only process
//   assistant messages for text deltas: guard `e.message?.role === 'assistant'` before snapshot-diff.
//   (The non-streaming listener already does this via the turn_end message check.)

// GOTCHA #11 — tool_call_start REQUIRES {id, name, index}; tool_call_done REQUIRES {id, result}.
//   index is a per-stream counter (0,1,2,...) for tool calls — mirror ClaudeCodeHarness's toolCallCount++.
//   The Pi toolCallId maps to StreamEvent.id; toolName maps to StreamEvent.name.

// GOTCHA #12 — The `done` event's finishReason is 'stop' on normal completion. Deriving 'tool_calls'
//   or 'length' from Pi's stopReason is a refinement; 'stop' is parity-safe (ClaudeCodeHarness L857).

// GOTCHA #13 — isolatedModules: true (tsconfig.json). `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`
//   is a global type (lib es2018+/esnext.asyncgenerator). StreamEvent/AgentResponse are `import type`
//   already. createSuccessResponse/createErrorResponse/AGENT_ERROR_CODES are VALUE imports (already present).

// GOTCHA #14 — The fake-session test MUST replay events SYNCHRONOUSLY during prompt() (the queue bridge
//   converts them to async yields). For multi-delta tests, fire multiple message_update events with
//   growing text ("Hel", "Hello", "Hello world") — snapshot-diff emits deltas "Hel"/"lo"/" world".
//   (makeFakeSession from test-mock-pattern.md §2 already does synchronous replay.)

// GOTCHA #15 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   src/harnesses/pi-harness.ts (proving executeStreaming compiles + AsyncGenerator return type +
//   no forbidden transitive import + no cycle). Test type errors surface in `npm test` (vitest/esbuild).
//   Run BOTH.

// GOTCHA #16 — unsubscribe() MUST run in a `finally` (the generator may be abandoned early via
//   `for await` break / controller.abort()). Leaking the listener keeps the dead session's events
//   flowing into a GC'd closure. Mirror the non-streaming `try { await prompt } finally { unsubscribe() }`.

// GOTCHA #17 — The streaming generator must call createAgentSession with the SAME options as non-streaming
//   (model, modelRegistry, authStorage, customTools). Factor NOTHING out — a small duplication of the
//   createAgentSession call in executeStreaming is acceptable and clearer than a shared helper (the
//   two paths diverge immediately after: subscribe+queue vs. await prompt+aggregate).
```

---

## Implementation Blueprint

### Data models and structure

No new exported types. S1 adds ONE private async-generator method (`executeStreaming`) and replaces
the streaming-throw branch in `execute()`. **No new imports** — everything S1 needs is already
imported by the non-streaming path (P2.M2.T2.S1 + P2.M3.T1.S1): `AgentSession`/`AgentSessionEvent`/
`AgentSessionEventListener` (types), `ModelRegistry`/`AuthStorage` (values),
`createSuccessResponse`/`createErrorResponse`/`AGENT_ERROR_CODES` (values), `StreamEvent` (type),
`AgentResponse` (type). `createAgentSession` is reached via `this.sdk!.createAgentSession`.

> If a pre-flight grep shows `StreamEvent` is NOT yet imported in pi-harness.ts (it IS —
> P2.M2.T2.S1 imports it for the `execute()` return-type annotation), add
> `import type { StreamEvent } from "../types/streaming.js";`. Verify in Task 0.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -nE "streaming|executeStreaming|customTools: this\.buildCustomTools|buildCustomTools|mcpHandler|throw new Error\(\s*\"PiHarness streaming" src/harnesses/pi-harness.ts`
        → confirm: (a) the streaming-throw branch cites P2.M3.T2.S1; (b) P2.M3.T1.S1's
        `customTools: this.buildCustomTools(toolExecutor)` + `buildCustomTools` + `mcpHandler` exist
        (if NOT, P2.M3.T1.S1 hasn't landed — STOP; S1 depends on it); (c) `StreamEvent` is imported.
  - RUN: `grep -n "should throw synchronously citing P2.M3.T2.S1" src/__tests__/unit/providers/pi-harness-execute.test.ts` → 1 hit (the obsolete assertion).
  - RUN: `node -e "try{require('@earendil-works/pi-ai');console.log('RESOLVABLE')}catch(e){console.log('BLOCKED')}"` → BLOCKED (Decision 4 confirmed).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN. If red from a parallel task, surface it.

Task 1: MODIFY src/harnesses/pi-harness.ts (replace streaming branch + add executeStreaming)
  - REPLACE the streaming-throw branch:
        OLD:  if (request.options.streaming) {
                throw new Error("PiHarness streaming execute() not implemented — P2.M3.T2.S1 ...");
              }
        NEW:  if (request.options.streaming) {
                if (!this.sdk || !this.modelRegistry || !this.authStorage) {
                  throw new Error("PiHarness not initialized. Call initialize() first.");
                }
                return this.executeStreaming<T>(request, toolExecutor, hooks);
              }
    (Mirror ClaudeCodeHarness L386-395 — synchronous generator return + init guard BEFORE the call.)
  - ADD `private async *executeStreaming<T>(request, toolExecutor, hooks): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`
    using "Implementation Patterns" below (the queue-bridge generator). Place it AFTER the non-streaming
    `execute()` method, BEFORE `registerMCPs` (keep method ordering logical: execute → executeStreaming → registerMCPs).
  - UPDATE the `execute()` JSDoc: change "Streaming path: owned by P2.M3.T2.S1 — throws synchronously"
    to "Streaming path: delegates to executeStreaming() (P2.M3.T2.S1) — returns AsyncGenerator".
  - LEAVE the non-streaming execute IIFE, registerMCPs/buildCustomTools/customTools, loadSkills,
    resolveModel/initialize/terminate, normalizeModel, supports/requiresFeatures UNCHANGED.
  - VERIFY (grep): `grep -nE "async \*executeStreaming|return this\.executeStreaming|enqueue|resolveNext|text\.slice\(fullText|customTools: this\.buildCustomTools" src/harnesses/pi-harness.ts` → 5+ hits.
  - VERIFY (NO forbidden transitive import): `! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts` → exit 1 (no match).
  - VERIFY (throw gone): `! grep -n "PiHarness streaming execute() not implemented" src/harnesses/pi-harness.ts` → exit 1.

Task 2: MODIFY src/__tests__/unit/providers/pi-harness-execute.test.ts (remove obsolete describe)
  - DELETE the entire `describe('streaming branch', () => { it('should throw synchronously citing P2.M3.T2.S1 ...', ...) })`
    block (L156-167, including the `// ── Streaming branch throws ───` comment header).
  - KEEP `describe('uninitialized guard')` (above) and `describe('success aggregation')` (below) intact.
  - VERIFY: `grep -n "P2.M3.T2.S1" src/__tests__/unit/providers/pi-harness-execute.test.ts` → 0 hits;
            `grep -n "success aggregation" src/__tests__/unit/providers/pi-harness-execute.test.ts` → 1 hit (kept).

Task 3: CREATE src/__tests__/unit/providers/pi-harness-streaming.test.ts (the streaming suite)
  - STRUCTURE: import { describe, it, expect, beforeEach, vi } from 'vitest'; PiHarness; HarnessRegistry
    (reset: getInstance()._resetInitStateForTesting() + _resetForTesting() — copy from
    pi-harness-initialize.test.ts L25-27). Copy makeFakeSession from test-mock-pattern.md §2
    (subscribe captures listener; prompt replays events synchronously). The fake session's prompt()
    MUST support an async-reject variant for the error case.
  - beforeEach: `new PiHarness()`; await initialize(); reset HarnessRegistry; overwrite
    `harness.sdk.createAgentSession` via @ts-expect-error with `vi.fn().mockResolvedValue({ session: fakeSession })`.
  - HELPERS:
      const META_CHECK = (e) => e.type === 'metadata';
      const collect = async (gen) => { const events = []; let final; for await (const e of gen) events.push(e);
        final = await gen.next(/* after done the loop exits; capture return via: */); ... };
      — OR simpler: drain via `for await` into an array, then call `gen.next()` once more to read TReturn.
      (See "Test helper" in Implementation Patterns.)
  - CASES (describe('PiHarness - executeStreaming()')):
      Returns generator (not Promise, not throw):
        - const result = harness.execute({prompt:'hi', options:{streaming:true}}, dummyExec, hooks);
          expect(result).toBeDefined(); expect(typeof result.next).toBe('function'); expect(typeof result[Symbol.asyncIterator]).toBe('function').
      Uninitialized throws synchronously:
        - new PiHarness() (no init) → expect(() => harness.execute({prompt:'x',options:{streaming:true}}, dummyExec)).toThrow(/not initialized/i).
      Metadata first:
        - fakeSession replays [session_start, message_update(text), turn_end, agent_end];
          events = await drain(gen); expect(events[0].type).toBe('metadata');
          expect(events[0].metadata.provider).toBe('pi'); expect(events[0].metadata.model).toBeTruthy().
      text_delta snapshot-diff:
        - fakeSession replays message_update with assistant content text 'Hel' → 'Hello' → 'Hello world';
          deltas = events.filter(e=>e.type==='text_delta'); expect(deltas.map(d=>d.delta)).toEqual(['Hel','lo',' world']);
          expect(deltas.map(d=>d.index)).toEqual([0,1,2]).
      tool_call_start/done:
        - replay [tool_execution_start{toolCallId:'tc1',toolName:'search',args:{}}, tool_execution_end{toolCallId:'tc1',result:{x:1},isError:false}];
          starts = events.filter(e=>e.type==='tool_call_start'); expect(starts[0]).toMatchObject({id:'tc1',name:'search'});
          dones = events.filter(e=>e.type==='tool_call_done'); expect(dones[0]).toMatchObject({id:'tc1',result:{x:1}}).
      usage from turn_end:
        - replay turn_end with message.usage {input:42,output:7,cacheRead:100};
          usage = events.find(e=>e.type==='usage'); expect(usage.inputTokens).toBe(42); expect(usage.outputTokens).toBe(7); expect(usage.cacheTokens).toBe(100).
      done last + finishReason:
        - events[events.length-1].type === 'done'; expect(events.at(-1).finishReason).toBe('stop').
      Generator return value (success AgentResponse):
        - final = await readReturn(gen); expect(final.status).toBe('success'); expect(final.data).toBe('Hello world');
          expect(final.metadata.agentId).toBe('pi'); expect(final.metadata.duration).toBeGreaterThanOrEqual(0).
      Error path (prompt rejects):
        - fakeSession.prompt rejects with Error('boom'); events = await drain(gen);
          errEvent = events.find(e=>e.type==='error'); expect(errEvent.code).toBe('EXECUTION_FAILED'); expect(errEvent.retryable).toBe(true);
          final = await readReturn(gen); expect(final.status).toBe('error'); expect(final.error.code).toBe('EXECUTION_FAILED').
      Session hooks parity:
        - const onStart = vi.fn(), onEnd = vi.fn(); replay [session_start, ..., session_shutdown];
          harness.execute({prompt, options:{streaming:true}}, dummyExec, {onSessionStart:onStart, onSessionEnd:onEnd});
          (after drain) expect(onStart).toHaveBeenCalledTimes(1); expect(onEnd).toHaveBeenCalledWith(expect.any(Number)).
      No tool/stream hooks wired (S2 boundary):
        - const onToolStart=vi.fn(), onStream=vi.fn(); replay tool_execution_start + message_update;
          expect(onToolStart).not.toHaveBeenCalled(); expect(onStream).not.toHaveBeenCalled().
      createAgentSession reuses customTools:
        - (harness as any).mcpHandler is empty by default → buildCustomTools returns []; OR register one
          inprocess tool first → assert createAgentSession.mock.calls[0][0].customTools is the built list
          (length matches registered tools). Confirms Decision 1 (streaming REUSES customTools, not []).
  - PLACEMENT: src/__tests__/unit/providers/.

Task 4: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check (a) a transitive type import slipped in (CRITICAL #4),
    (b) the generator return type mismatch (must be `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`),
    (c) `return this.executeStreaming(...)` not assignable (ensure executeStreaming is `async *`),
    (d) a yielded StreamEvent missing a required field (tool_call_start needs id+name+index).
  - If pi-harness-execute.test.ts fails on "should throw citing P2.M3.T2.S1": Task 2 didn't remove the block.
  - If streaming test hangs: the queue bridge's done-flag/resolver is wrong — ensure prompt()'s
    .finally sets done=true AND resolves a parked resolver (CRITICAL #1).
```

### Implementation Patterns & Key Details

```ts
// === execute() streaming branch — REPLACES the throw (mirror ClaudeCodeHarness L386-395) ===
execute<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  hooks?: HarnessHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  // STREAMING branch — P2.M3.T2.S1. Init guard BEFORE returning the generator (synchronous return).
  if (request.options.streaming) {
    if (!this.sdk || !this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    return this.executeStreaming<T>(request, toolExecutor, hooks);
  }
  // NON-STREAMING branch — unchanged (P2.M2.T2.S1 IIFE).
  return (async (): Promise<AgentResponse<T>> => { /* …unchanged… */ })();
}

// === executeStreaming() — the async-queue bridge generator (THE deliverable) ===
/**
 * Stream a Pi turn as `StreamEvent`s (PRD §7.3, §7.4, §7.14.4).
 *
 * Pi's `session.subscribe(listener)` is SYNCHRONOUS — a listener cannot `yield`. This method
 * bridges sync callbacks → async generator via an internal queue: the listener `enqueue`s events
 * (and resolves a parked drain), the generator `dequeue`s/maps/`yield`s. `session.prompt()` runs
 * detached; its resolution flips the terminal condition (research/streaming-event-bridge.md §1).
 *
 * Mapping (PRD §7.11): message_update→text_delta (snapshot-diff), tool_execution_start→tool_call_start,
 * tool_execution_end→tool_call_done, turn_end→usage, terminal→done, errors→error.
 *
 * Hooks (Decision 5): session lifecycle hooks (onSessionStart/onSessionEnd) fire for parity with
 * the non-streaming path. onToolStart/onToolEnd/onStream are P2.M3.T2.S2 (NOT wired here).
 */
private async *executeStreaming<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  hooks?: HarnessHookEvents,
): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  if (!this.sdk || !this.modelRegistry || !this.authStorage) {
    throw new Error("PiHarness not initialized. Call initialize() first.");
  }
  const startTime = Date.now();

  const modelSpec = this.normalizeModel(request.options.model ?? "claude-sonnet-4-20250514");
  const model = this.resolveModel(modelSpec); // throws ConfigError if absent — let it propagate

  // REUSE P2.M3.T1.S1's customTools seam (Decision 1) — do NOT pass customTools: [].
  const { session } = await this.sdk!.createAgentSession({
    model,
    modelRegistry: this.modelRegistry,
    authStorage: this.authStorage,
    customTools: this.buildCustomTools(toolExecutor),
  });

  // Yield metadata FIRST (mirror ClaudeCodeHarness L696-701).
  yield {
    type: "metadata",
    metadata: {
      requestId: `${this.id}-${Date.now()}`,
      model: modelSpec.model,
      provider: this.id,
    },
  } satisfies Extract<StreamEvent, { type: "metadata" }>;

  // ── Async-queue bridge (Decision 3) ─────────────────────────────────────────────
  const queue: AgentSessionEvent[] = [];
  let resolveNext: (() => void) | null = null;
  let turnDone = false;

  const enqueue = (e: AgentSessionEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  // Aggregation state (mirrors the non-streaming listener).
  let fullText = "";
  let textIndex = 0;
  let toolIndex = 0;
  let lastInput = 0;
  let lastOutput = 0;
  let lastCache: number | undefined;

  const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
    const e = event as { type: string; message?: any };
    // Session lifecycle hooks — parity with non-streaming (Decision 5).
    // onToolStart/onToolEnd/onStream are P2.M3.T2.S2 (deliberately NOT wired here).
    switch (e.type) {
      case "session_start":
        void hooks?.onSessionStart?.();
        break;
      case "session_shutdown":
        void hooks?.onSessionEnd?.(Date.now() - startTime);
        break;
    }
    enqueue(event); // every event flows through the bridge for mapping
  };

  const unsubscribe = session.subscribe(listener);

  // Kick off prompt() WITHOUT awaiting in the generator body (Decision 3). Capture rejection.
  let promptError: unknown = null;
  void session
    .prompt(request.prompt)
    .catch((err: unknown) => {
      promptError = err;
    })
    .finally(() => {
      turnDone = true;
      resolveNext?.();
      resolveNext = null;
    });

  try {
    // ── Drain loop: map Pi events → StreamEvent ──────────────────────────────────
    while (!turnDone || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((r) => {
          resolveNext = r;
        });
      }
      while (queue.length > 0) {
        const event = queue.shift()!;
        const e = event as {
          type: string;
          message?: any;
          toolCallId?: string;
          toolName?: string;
          result?: any;
          isError?: boolean;
        };
        switch (e.type) {
          case "message_update": {
            // Snapshot-diff (Decision 2) — assistant text only.
            if (e.message?.role === "assistant" && Array.isArray(e.message.content)) {
              const text = e.message.content
                .filter((b: any) => b?.type === "text")
                .map((b: any) => b.text ?? "")
                .join("");
              if (text.length > fullText.length && text.startsWith(fullText)) {
                yield {
                  type: "text_delta",
                  delta: text.slice(fullText.length),
                  index: textIndex++,
                };
                fullText = text;
              } else if (text.length > fullText.length) {
                // Non-prefix growth (rare replays) — emit the whole new tail.
                yield { type: "text_delta", delta: text.slice(fullText.length), index: textIndex++ };
                fullText = text;
              }
            }
            break;
          }
          case "tool_execution_start":
            yield {
              type: "tool_call_start",
              id: String(e.toolCallId ?? ""),
              name: String(e.toolName ?? ""),
              index: toolIndex++,
            };
            break;
          case "tool_execution_end":
            yield {
              type: "tool_call_done",
              id: String(e.toolCallId ?? ""),
              result: e.result ?? null,
            };
            break;
          case "turn_end": {
            const msg = e.message;
            if (msg && msg.role === "assistant" && msg.usage) {
              lastInput = msg.usage.input ?? 0;
              lastOutput = msg.usage.output ?? 0;
              lastCache = msg.usage.cacheRead ?? msg.usage.cacheWrite; // mirror ClaudeCodeHarness L843-845
            }
            break;
          }
          // session_start/session_shutdown/agent_end/turn_start/etc. handled by hooks or ignored.
        }
      }
    }

    // ── Terminal ─────────────────────────────────────────────────────────────────
    if (promptError) {
      const message = promptError instanceof Error ? promptError.message : String(promptError);
      yield {
        type: "error",
        error: new Error(`Pi agent execution failed: ${message}`),
        code: AGENT_ERROR_CODES.EXECUTION_FAILED,
        retryable: true,
      } satisfies Extract<StreamEvent, { type: "error" }>;
      return createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        `Pi agent execution failed: ${message}`,
        {
          prompt: request.prompt,
          model: modelSpec.raw,
          ...(promptError instanceof Error && promptError.stack ? { stack: promptError.stack } : {}),
        },
        true,
      ) as AgentResponse<T>;
    }

    // Usage (one event — final turn wins; GOTCHA #9).
    if (lastInput || lastOutput) {
      const usageEvent: Extract<StreamEvent, { type: "usage" }> = {
        type: "usage",
        inputTokens: lastInput,
        outputTokens: lastOutput,
      };
      if (lastCache !== undefined) usageEvent.cacheTokens = lastCache;
      yield usageEvent;
    }

    yield { type: "done", finishReason: "stop" } satisfies Extract<StreamEvent, { type: "done" }>;

    return createSuccessResponse(fullText as unknown as T, {
      agentId: this.id,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      usage: { input_tokens: lastInput, output_tokens: lastOutput },
    });
  } finally {
    unsubscribe(); // detach even on early break / abort (GOTCHA #16)
  }
}

// === Test helper: drain a streaming generator and read its TReturn ===
async function drainStreaming<T>(
  gen: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>,
): Promise<{ events: StreamEvent[]; final: AgentResponse<T> }> {
  const events: StreamEvent[] = [];
  for await (const e of gen) events.push(e);
  const { value: final } = await gen.next(); // reads TReturn after the loop exits
  return { events, final };
}
```

```ts
// === The OBSOLETE block to DELETE from pi-harness-execute.test.ts (Task 2) ===
//   describe('streaming branch', () => {
//     it('should throw synchronously citing P2.M3.T2.S1 when streaming is true', () => {
//       expect(() =>
//         harness.execute({ prompt: 'test', options: { streaming: true } }, dummyToolExecutor),
//       ).toThrow(/P2\.M3\.T2\.S1/);
//     });
//   });
// (Remove the whole describe + its `// ── Streaming branch throws ───` comment header.)
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : replace the streaming-throw branch with `return this.executeStreaming(...)`;
    ADD the private `async *executeStreaming` generator (queue bridge + Pi→StreamEvent mapping + AgentResponse return).
    REUSE `this.buildCustomTools(toolExecutor)` (P2.M3.T1.S1) in the streaming createAgentSession call.
    NO new imports (all already present from P2.M2.T2.S1 + P2.M3.T1.S1).

TESTS (MODIFY / NEW):
  - src/__tests__/unit/providers/pi-harness-execute.test.ts : REMOVE the `describe('streaming branch')` block (L156-167).
  - src/__tests__/unit/providers/pi-harness-streaming.test.ts : NEW (fake-session event replay → assert yielded StreamEvents + generator return value).

NO CHANGES TO:
  - registerMCPs / buildCustomTools / mcpHandler / customTools wiring (P2.M3.T1.S1 — REUSED, not duplicated).
  - loadSkills stub (P2.M3.T2.S3).
  - non-streaming execute() IIFE (P2.M2.T2.S1).
  - resolveModel / initialize / terminate / normalizeModel / supports / requiresFeatures.
  - src/types/*, barrels, registry, other harnesses.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Type-check the modified source (lint EXCLUDES __tests__ — proves pi-harness.ts compiles cleanly).
npm run lint                        # = tsc --noEmit
# Expected: exit 0. If it names pi-harness.ts:
#   - a transitive type import slipped in → remove it (CRITICAL #4);
#   - executeStreaming return type mismatch → ensure `async *executeStreaming<T>(...): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`;
#   - a yielded StreamEvent missing a required field (tool_call_start needs id+name+index; done needs finishReason).

# Confirm NO forbidden transitive imports + the throw is gone + the generator exists.
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts   # exit 1 (no match) = PASS
! grep -n "PiHarness streaming execute() not implemented" src/harnesses/pi-harness.ts          # exit 1 = PASS
grep -nE "async \*executeStreaming|return this\.executeStreaming|text\.slice\(fullText" src/harnesses/pi-harness.ts   # 3+ hits
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new streaming suite (targeted).
npm test -- pi-harness-streaming                # or: npx vitest run src/__tests__/unit/providers/pi-harness-streaming.test.ts
# Expected: all green — metadata-first, text_delta snapshot-diff, tool_call_start/done, usage, done,
#   generator return value (success + error), session hooks parity, no tool/stream hooks wired, customTools reuse.

# The edited execute suite (streaming-branch describe removed; non-streaming assertions intact).
npm test -- pi-harness-execute
# Expected: green — the obsolete streaming-throws case is gone; all non-streaming cases pass.

# Full regression (all pi-harness suites + everything else).
npm test
# Expected: exit 0. P2.M3.T1.S1 (registerMCPs/customTools) + P2.M2.T2.S1 (execute) + S1/S2 suites all green.

# If the streaming test HANGS: the queue bridge's terminal condition is wrong — ensure prompt()'s
# .finally sets turnDone=true AND resolves a parked resolver (CRITICAL #1). If deltas are wrong,
# verify snapshot-diff guards on `e.message?.role === 'assistant'` (GOTCHA #10).
```

### Level 3: Integration Testing (System Validation)

```bash
# Build emits the real executeStreaming.
npm run build
# Expected: exit 0; dist/harnesses/pi-harness.{js,d.ts} emitted with executeStreaming.

# Runtime spot-check (the contract end-to-end via a fake-session tsx script, OR the vitest suite):
#   A PiHarness whose createAgentSession is monkey-patched to a fake session replaying
#   [session_start, message_update('Hel'), message_update('Hello'), tool_execution_start,
#    tool_execution_end, message_update('Hello world'), turn_end(usage), agent_end, session_shutdown]
#   yields (in order): [metadata, text_delta('Hel'), text_delta('lo'), tool_call_start,
#    tool_call_done, text_delta(' world'), usage, done] and returns AgentResponse{status:'success',
#    data:'Hello world', metadata.agentId:'pi'}.
# (Covered by pi-harness-streaming.test.ts Task 3 — run it as the integration gate.)

# Parity sanity (manual, optional): compare the yielded StreamEvent sequence against
# claude-code-harness-execute.test.ts's streaming expectations — same ordering (metadata → deltas →
# tool calls → usage → done) and same AgentResponse shape (status/data/metadata.agentId). This is
# formalized in P4.M2.T1.S1 (parity suite); S1 need only spot-check.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Streaming ordering + cancellation (the PRD §7.14.3 "consistent ordering" bar):
#   - Confirm metadata is ALWAYS yielded before any text_delta (correlation guarantee).
#   - Confirm done is ALWAYS the last yielded event on the success path.
#   - Confirm an early `break` in a `for await` loop triggers the finally → unsubscribe() (no leak).
#     (Covered by a dedicated test case: drain partially, break, assert a sentinel listener is detached.)

# Generator return-value contract (GOTCHA #8):
#   - `const final = yield* harness.execute(req, exec, hooks)` (when streaming) === AgentResponse<T>.
#   - After the `for await` loop exits, `gen.next()` returns { done:true, value: AgentResponse }.

# (No performance/security/load gates required for this item — it's a pure event-mapping adapter.)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (pi-harness.ts compiles; no transitive imports; no cycle).
- [ ] `npm test` exits 0 (new streaming suite + edited execute suite + full regression).
- [ ] `npm run build` exits 0 (dist emits real executeStreaming).
- [ ] No forbidden transitive imports (grep clean for `@earendil-works/pi-ai` / `pi-agent-core`).
- [ ] The streaming-throw citing P2.M3.T2.S1 is GONE from pi-harness.ts AND its test assertion removed.

### Feature Validation

- [ ] `execute(...,{streaming:true})` returns an `AsyncGenerator<StreamEvent, AgentResponse<T>>` (synchronous return).
- [ ] `execute(...,{streaming:false/undefined})` still returns the non-streaming `Promise<AgentResponse<T>>`.
- [ ] StreamEvents yielded in Pi-arrival order: metadata → text_delta → tool_call_start/done → usage → done.
- [ ] text_delta uses snapshot-diff (correct delta + incrementing index).
- [ ] Generator return value is a valid `AgentResponse<T>` (success on completion; error on prompt-rejection).
- [ ] Session hooks (onSessionStart/onSessionEnd) fire for parity; tool/stream hooks NOT wired (S2).
- [ ] Streaming REUSES `customTools: this.buildCustomTools(toolExecutor)` (Decision 1 — not `[]`).
- [ ] Uninitialized harness throws `/not initialized/i` synchronously before returning the generator.

### Code Quality Validation

- [ ] Follows existing codebase patterns (mirror ClaudeCodeHarness.executeStreaming control flow).
- [ ] File placement matches the desired codebase tree.
- [ ] Anti-patterns avoided (no transitive imports, no `customTools:[]`, no throw on error path, no sync-batch streaming).
- [ ] `unsubscribe()` runs in `finally` (no listener leak on early break / abort).
- [   ] Comments document the queue-bridge rationale + hook-scope boundary (S2).

### Documentation & Deployment

- [ ] `execute()` JSDoc updated (streaming now delegates to executeStreaming, not throws).
- [ ] No new environment variables or config.
- [ ] Code is self-documenting (queue bridge, snapshot-diff, mapping table in comments).

---

## Anti-Patterns to Avoid

- ❌ Don't `await session.prompt()` directly in the generator body without the queue bridge — events
  collapse to one batch (no streaming). (CRITICAL #1.)
- ❌ Don't import `AssistantMessageEvent`/`Usage`/`TextContent` from `@earendil-works/pi-ai` — it's a
  non-hoisted transitive (`MODULE_NOT_FOUND`). Cast structurally. (CRITICAL #4.)
- ❌ Don't read `assistantMessageEvent` internals for deltas — use snapshot-diff. (CRITICAL #2.)
- ❌ Don't hardcode `customTools: []` in the streaming path — REUSE `this.buildCustomTools(toolExecutor)`. (CRITICAL #3.)
- ❌ Don't wrap the streaming branch in an async IIFE / return a `Promise<Generator>` — the Harness
  interface wants the generator returned synchronously. (CRITICAL #5.)
- ❌ Don't `throw` on the prompt-rejection error path — yield an `error` event and `return` an error
  `AgentResponse` (the contract: "return final AgentResponse as generator return value"). (GOTCHA #8.)
- ❌ Don't wire `onToolStart`/`onToolEnd`/`onStream` in S1 — that's P2.M3.T2.S2. (GOTCHA #7.)
- ❌ Don't skip `unsubscribe()` in `finally` — leaks the listener on early break. (GOTCHA #16.)
- ❌ Don't duplicate `registerMCPs`/`buildCustomTools` — they're already on the class (P2.M3.T1.S1). (Decision 1.)
- ❌ Don't create new patterns when existing ones work — mirror ClaudeCodeHarness.executeStreaming.
