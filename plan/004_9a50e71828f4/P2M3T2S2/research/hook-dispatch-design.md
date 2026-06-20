# Hook Dispatch Design — `HarnessHookEvents` adaptation in `PiHarness`

> Reference for **P2.M3.T2.S2**. Documents the shared-helper design, the Pi-vs-claude-code
> fidelity advantage, the deterministic-ordering guarantee, and the parallel-merge strategy
> (S2 vs the already-landed S1 `executeStreaming` + S1's boundary test).

---

## 1. Current state of `src/harnesses/pi-harness.ts` (S1 LANDED — verified by read)

S1 has **landed** (not merely "Implementing"). Both listeners exist and both deliberately
**omit** tool/stream hooks:

### Non-streaming `execute()` listener (L241–274)
```ts
const listener: AgentSessionEventListener = (event) => {
  const e = event as { type: string; message?: any; messages?: any[] };
  switch (e.type) {
    case "session_start":   void hooks?.onSessionStart?.();                  break;  // L245-247
    case "session_shutdown": void hooks?.onSessionEnd?.(Date.now() - startTime); break; // L248-250
    case "turn_end": { /* aggregate text + usage + toolCallCount */          break; } // L251-272
  }
};
```
**No** tool_execution_start / tool_execution_end / message_update cases.

### Streaming `executeStreaming()` listener (L371–386)
```ts
const listener: AgentSessionEventListener = (event) => {
  const e = event as { type: string; message?: any };
  // Session lifecycle hooks — parity with non-streaming (Decision 5).
  // onToolStart/onToolEnd/onStream are P2.M3.T2.S2 (deliberately NOT wired here).
  switch (e.type) {
    case "session_start":   void hooks?.onSessionStart?.();                       break;
    case "session_shutdown": void hooks?.onSessionEnd?.(Date.now() - startTime);  break;
  }
  enqueue(event); // every event flows through the bridge for mapping
};
```

### Streaming drain loop (L410–495) — message_update/tool/turn_end → StreamEvent
The drain loop already does **snapshot-diff** for `text_delta` (its OWN `fullText`) and maps
`tool_execution_start`→`tool_call_start`, `tool_execution_end`→`tool_call_done`, `turn_end`→`usage`.

**S2 does NOT touch the drain loop.** (See §4 — minimal-conflict strategy.)

---

## 2. The five `HarnessHookEvents` and the PRD §7.11 mapping (the contract)

```ts
// src/types/harnesses.ts L98-114
export interface HarnessHookEvents {
  onToolStart?:   (tool: ToolExecutionRequest) => Promise<void> | void;               // { name, input }
  onToolEnd?:     (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => ...;
                                                                                      // result: { content, isError }
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?:   (totalDuration: number) => Promise<void> | void;
  onStream?:       (chunk: string) => void;
}
```

| `HarnessHookEvents`   | Pi source event (PRD §7.11) | CURRENT state        | S2 owns? |
|----------------------|------------------------------|----------------------|----------|
| `onToolStart`        | `tool_execution_start`       | NOT wired            | **YES**  |
| `onToolEnd`          | `tool_execution_end`         | NOT wired            | **YES**  |
| `onSessionStart`     | `session_start`              | wired (S1 + P2.M2.T2.S1) | NO   |
| `onSessionEnd`       | `session_shutdown`           | wired (S1 + P2.M2.T2.S1) | NO   |
| `onStream`           | `message_update`             | NOT wired            | **YES** |

**S2 scope = the 3 NEW hooks** (`onToolStart`/`onToolEnd`/`onStream`). Session hooks are already
firing in BOTH paths; S2 leaves them untouched (would conflict with S1/P2.M2.T2.S1).

---

## 3. Pi-vs-claude-code fidelity — Pi is STRICTLY BETTER (item note verified)

The item description says: *"Note Pi tool events DO observe errors/duration (unlike claude-code's
PostToolUse limitation)."* Verified against `claude-code-harness.ts` `buildAgentSDKHooks` (L1087-1161):

| Hook        | claude-code (PostToolUse)            | Pi (S2)                                         |
|-------------|--------------------------------------|-------------------------------------------------|
| `onToolStart` | `tool_name` + `tool_input` ✅      | `toolName` + `args` ✅                          |
| `onToolEnd` `result.content` | `tool_response` ✅       | `result` ✅                                     |
| `onToolEnd` `result.isError` | **always `false`** ❌   | **real `isError`** ✅ (`ToolExecutionEndEvent.isError`) |
| `onToolEnd` `duration`       | **always `0`** ❌      | **real duration** ✅ (computed: see §5)         |
| `onToolEnd` `tool.input`     | `tool_input` ✅        | **reconstructed from start** ✅ (end lacks args; stash start — §5) |
| `onSessionEnd` `duration`    | **always `0`** ❌      | **real duration** ✅ (S1/P2.M2.T2.S1: `Date.now()-startTime`) |

**Implication for parity tests (P4.M2.T1.S1):** A test that asserts `onToolEnd` receives the
REAL `isError`/`duration` MUST be gated on harness==='pi' (claude-code cannot satisfy it). S2's
own test suite asserts the Pi-specific fidelity (real isError, real duration, reconstructed input).

---

## 4. Verified Pi event shapes (read from installed `.d.ts` — NON-HOISTED transitive)

Source: `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` (read directly).

```ts
// L541-546 — NO timestamp, NO duration
interface ToolExecutionStartEvent {
  type: "tool_execution_start"; toolCallId: string; toolName: string; args: any;
}
// L556-562 — NO args, NO timestamp, NO duration
interface ToolExecutionEndEvent {
  type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean;
}
// L530-534 — message.content holds the streamed text
interface MessageUpdateEvent {
  type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent;
}
```

**CRITICAL:** These are NON-HOISTED transitives under `@earendil-works/pi-ai` (`require()` →
`MODULE_NOT_FOUND`, confirmed in S1 research Decision 4). S2 casts structurally exactly like the
existing listeners — `event as { type: string; message?: any; toolCallId?: string; toolName?: string;
args?: any; result?: any; isError?: boolean }`. **NO new imports.**

**CRITICAL #2:** `ToolExecutionStartEvent` and `ToolExecutionEndEvent` carry **NO timestamp or
duration**. S2 must COMPUTE duration by stashing `Date.now()` at start and diffing at end (§5).

**CRITICAL #3:** `ToolExecutionEndEvent` carries **NO `args`** (only `toolCallId`/`toolName`/
`result`/`isError`). To reconstruct the `ToolExecutionRequest { name, input }` for `onToolEnd`,
S2 stashes the start event's `{ name: toolName, input: args }` keyed by `toolCallId` (§5).

---

## 5. The shared-helper design (DRY + minimal conflict with S1)

### Why a shared helper
The 3 new hooks must fire in **BOTH** the non-streaming listener (P2.M2.T2.S1) and the streaming
listener (S1). Duplicating the logic in two places risks divergence. A single private method
`fireHookEvents(event, hooks, ctx)` keeps the mapping table in ONE place and minimizes the diff to
each listener (each gains ONE call line + the `hookCtx` allocation).

### The helper (copy-paste ready)
```ts
/** Context for hook dispatch — mutable accumulators shared across events in one execute() call. */
interface HookDispatchContext {
  /** toolCallId → start info (timestamp for duration; args/input for request reconstruction). */
  toolStarts: Map<string, { name: string; input: unknown; timestamp: number }>;
  /** Snapshot-diff accumulator for onStream (independent from the drain loop's `fullText`). */
  streamText: { value: string };
}

/**
 * Dispatch the THREE harness hooks owned by P2.M3.T2.S2 (PRD §7.11):
 *   tool_execution_start → onToolStart({name, input})
 *   tool_execution_end   → onToolEnd({name, input}, {content, isError}, duration)
 *   message_update       → onStream(delta)   [snapshot-diff; assistant text only]
 *
 * Session hooks (onSessionStart/onSessionEnd) are NOT handled here — they stay inline in the
 * listeners as S1/P2.M2.T2.S1 wrote them (no scope overlap, no merge conflict).
 *
 * Pi fidelity advantage over claude-code (item note): onToolEnd observes the REAL isError
 * (ToolExecutionEndEvent.isError) and a REAL duration (computed from stashed start timestamp);
 * claude-code's PostToolUse cannot (always isError:false, duration:0).
 */
private fireHookEvents(
  event: AgentSessionEvent,
  hooks: HarnessHookEvents | undefined,
  ctx: HookDispatchContext,
): void {
  if (!hooks) return; // no hooks → no work (cheap no-op)
  const e = event as {
    type: string; message?: any;
    toolCallId?: string; toolName?: string; args?: any; result?: any; isError?: boolean;
  };
  switch (e.type) {
    case "tool_execution_start": {
      const req: ToolExecutionRequest = { name: e.toolName ?? "", input: e.args };
      if (e.toolCallId) {
        ctx.toolStarts.set(e.toolCallId, { name: req.name, input: req.input, timestamp: Date.now() });
      }
      void hooks.onToolStart?.(req);
      break;
    }
    case "tool_execution_end": {
      const id = e.toolCallId ?? "";
      const start = ctx.toolStarts.get(id);
      const duration = start ? Date.now() - start.timestamp : 0;
      // Reconstruct the request from the STASHED start info — the end event lacks `args`.
      const req: ToolExecutionRequest = start
        ? { name: start.name, input: start.input }
        : { name: e.toolName ?? "", input: undefined };
      const result: ToolExecutionResult = { content: e.result ?? null, isError: e.isError ?? false };
      if (id) ctx.toolStarts.delete(id); // release; defend against duplicate end events
      void hooks.onToolEnd?.(req, result, duration);
      break;
    }
    case "message_update": {
      // onStream snapshot-diff (assistant text only) — independent accumulator (ctx.streamText),
      // deliberately decoupled from the drain loop's `fullText` so S2 never edits the drain loop.
      const msg = e.message;
      if (msg?.role === "assistant" && Array.isArray(msg.content)) {
        const text = msg.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text ?? "")
          .join("");
        if (text.length > ctx.streamText.value.length) {
          const delta = text.slice(ctx.streamText.value.length);
          void hooks.onStream?.(delta);
          ctx.streamText.value = text;
        }
      }
      break;
    }
  }
}
```

> **Note on `message_update` consistency.** The drain loop ALSO computes a text delta from
> `message_update` (for `text_delta` StreamEvents) using its OWN `fullText`. Both accumulators
> apply the identical snapshot-diff algorithm to the identical event, so `onStream(delta)` and
> the `text_delta` StreamEvent for the same chunk produce **byte-identical deltas** — just emitted
> via different channels (hook vs stream event). S2 deliberately does NOT merge the two
> accumulators (that would require editing S1's drain loop → merge conflict). A consumer observing
> both channels sees the same chunk text in both.

### Wiring — non-streaming listener (P2.M2.T2.S1's, L240-274)
Add the `hookCtx` allocation + a single dispatch call at the TOP of the listener body (before the
existing `switch (e.type)`):
```ts
// BEFORE the listener:
const hookCtx: HookDispatchContext = {
  toolStarts: new Map(),
  streamText: { value: "" },
};
const listener: AgentSessionEventListener = (event) => {
  this.fireHookEvents(event, hooks, hookCtx);   // ← S2 ADDS THIS LINE (tool/stream hooks)
  const e = event as { type: string; message?: any; messages?: any[] };
  switch (e.type) { /* …unchanged: session_start/session_shutdown/turn_end… */ }
};
```

### Wiring — streaming listener (S1's, L370-386)
Add the same `hookCtx` + dispatch call BEFORE `enqueue(event)`:
```ts
const hookCtx: HookDispatchContext = {
  toolStarts: new Map(),
  streamText: { value: "" },
};
const listener: AgentSessionEventListener = (event) => {
  const e = event as { type: string; message?: any };
  switch (e.type) { /* session_start/session_shutdown — UNCHANGED */ }
  this.fireHookEvents(event, hooks, hookCtx);   // ← S2 ADDS THIS LINE (tool/stream hooks)
  enqueue(event);
};
```

**Ordering (PRD §7.14.3):** in the streaming path the hook fires in the listener BEFORE `enqueue`,
so `onToolStart`/`onToolEnd`/`onStream` always precede the corresponding `tool_call_start`/
`tool_call_done`/`text_delta` StreamEvents. Deterministic.

---

## 6. Deterministic ordering guarantees (PRD §7.14.3)

| Guarantee | Mechanism |
|-----------|-----------|
| `onSessionStart` fires exactly once, first | `session_start` is the first Pi lifecycle event; S1/P2.M2.T2.S1 inline case. |
| `onToolStart` always precedes `onToolEnd` for the same tool | Pi emits `tool_execution_start` strictly before `tool_execution_end`; both go through the same sync listener in arrival order. |
| `onToolEnd` receives the matching start's `input` | keyed by `toolCallId`; the stashed start info is read then deleted (defends against dup end events). |
| `onStream` chunks are emitted in arrival order, never duplicated | snapshot-diff: `delta = text.slice(streamText.value.length)` only when `text.length > streamText.value.length`. |
| `onSessionEnd(totalDuration)` fires once at teardown | `session_shutdown` event; `Date.now() - startTime`. |
| Hooks precede their StreamEvent counterparts (streaming path) | dispatch call is placed before `enqueue(event)`. |

---

## 7. Parallel-merge strategy — S2 vs the already-landed S1

S1 has LANDED. S2's edits to `pi-harness.ts` are **additive and localized**:
1. Add the `HookDispatchContext` interface (near the top, after imports / before the class, or as a
   private type inside the file).
2. Add the `private fireHookEvents(...)` method (place near `execute`/`executeStreaming` — e.g.,
   immediately before `execute` or after `executeStreaming`).
3. Add 2× `const hookCtx = {…}` + 2× `this.fireHookEvents(event, hooks, hookCtx);` lines.

No edits to: the drain loop, session hooks, StreamEvent mapping, customTools, resolveModel,
initialize/terminate, normalizeModel. **Zero functional overlap with S1.**

### S1's boundary test — MUST be removed (direct conflict)
`src/__tests__/unit/providers/pi-harness-streaming.test.ts` L395-424 contains:
```ts
// ── No tool/stream hooks wired (S2 boundary) ────
describe('...', () => {
  it('should NOT fire onToolStart/onToolEnd/onStream hooks (P2.M3.T2.S2 scope)', async () => {
    ... expect(onToolStart).not.toHaveBeenCalled();
    ... expect(onToolEnd).not.toHaveBeenCalled();
    ... expect(onStream).not.toHaveBeenCalled();
  });
});
```
**S2 removes this entire `describe` block.** Its premise ("S2 not wired") is obsolete once S2
lands. The positive assertions (hooks DO fire) live in the NEW `pi-harness-hooks.test.ts`.

---

## 8. Test approach — NEW `pi-harness-hooks.test.ts` (mirror `claude-code-harness-hooks.test.ts`)

Reuse P2.M2.T2.S1's `makeFakeSession` + `wireFakeSession` idiom (copy into the new file — it's a
small factory). Scripted event payloads (verified shapes from S1's research §4):

```ts
const TOOL_START = { type: 'tool_execution_start', toolCallId: 'tc1', toolName: 'search', args: { q: 'x' } };
const TOOL_END_OK = { type: 'tool_execution_end', toolCallId: 'tc1', toolName: 'search', result: 'found it', isError: false };
const TOOL_END_ERR = { type: 'tool_execution_end', toolCallId: 'tc2', toolName: 'bash', result: 'exit 1', isError: true };
const MSG_UPDATE_HEL = { type: 'message_update', message: { role: 'assistant', content: [{ type: 'text', text: 'Hel' }] } };
const MSG_UPDATE_HELLO = { type: 'message_update', message: { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] } };
```

Assertion matrix (non-streaming `execute()` + streaming `executeStreaming()`):

| Scripted events | Hook assertions |
|---|---|
| `[TOOL_START, TOOL_END_OK]` | `onToolStart` called with `{name:'search', input:{q:'x'}}`; `onToolEnd` called with `(req, {content:'found it', isError:false}, duration>=0)` where `req` equals the start request |
| `[TOOL_START, TOOL_END_ERR]` | `onToolEnd` result `isError===true` (Pi fidelity — claude-code can't) |
| `[MSG_UPDATE_HEL, MSG_UPDATE_HELLO]` | `onStream` called twice: `('Hel')`, `('lo')` (snapshot-diff) |
| `[TOOL_START, TOOL_END_OK]` with async hooks | hooks may be async (return Promise) — `await execute()` resolves after hooks settle (`void` + sync listener means callers await the response; async hooks are fire-and-track — document this) |
| `[session_start, …, session_shutdown]` | `onSessionStart`/`onSessionEnd` STILL fire (S2 didn't break them) — regression |
| streaming path: `[TOOL_START, TOOL_END_OK]` | same assertions; hooks fire BEFORE the `tool_call_start`/`tool_call_done` StreamEvents (ordering) |
| `undefined` hooks (no hooks arg) | no throw — `fireHookEvents` early-returns |

### Async-hook caveat (document in PRP + code comment)
`hooks.onToolStart` etc. may return a `Promise`. The listener calls them via `void hooks.onToolStart?.(req)`
(fire-and-track) because the Pi listener is SYNCHRONOUS and CANNOT `await` (it would block the SDK's
event loop). This matches S1/P2.M2.T2.S1's existing `void hooks?.onSessionStart?.()` pattern. Consumers
who need ordering guarantees across async hooks must coordinate externally (out of scope). Tests use
SYNC `vi.fn()` hooks to assert call count/args deterministically.
