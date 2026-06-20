# PRP — P2.M3.T2.S2: `HarnessHookEvents` adaptation (`onToolStart`/`End`, `onSessionStart`/`End`, `onStream`)

**PRD reference:** §7.11 (Hook Adaptation — the mapping table AgentHooks↔HarnessHookEvents↔Pi
events), §7.14.3 (hooks fire with consistent context and **deterministic ordering**),
§7.14 (parity), §7.10 (`ToolExecutionRequest`/`ToolExecutionResult` shapes). **Plan:**
`plan/004_9a50e71828f4/` — S2 of P2.M3.T2 ("PiHarness streaming, hooks & skills"). **Consumes**
P2.M2.T2.S1 (the non-streaming `execute()` IIFE + its aggregation listener at L241-274 — already
fires `onSessionStart`/`onSessionEnd`), P2.M3.T2.S1 (the **LANDED** `executeStreaming()` + its
listener at L371-386 + the drain loop at L410-495 — already fires `onSessionStart`/`onSessionEnd`,
already maps Pi events → StreamEvents, already does snapshot-diff text deltas), and the EXISTS
`HarnessHookEvents`/`ToolExecutionRequest`/`ToolExecutionResult` types in `src/types/harnesses.ts`
(L98-160). **Unblocks** P3.M1.T2.S1/S2 (`Agent` forwards `hooks` into `harness.execute(...)`),
P4.M2.T1.S1 (parity tests assert **identical hook firing** across `pi`+`claude-code` — including
the Pi-specific fidelity that `onToolEnd` observes REAL `isError`/`duration`), P4.M2.T1.S2
(cache isolation + deterministic hook ordering tests). **Scope tag:** wire the 3 NEW hooks
(`onToolStart`←`tool_execution_start`, `onToolEnd`←`tool_execution_end`, `onStream`←`message_update`)
into BOTH the non-streaming listener AND the streaming listener of `src/harnesses/pi-harness.ts` via
a single shared `private fireHookEvents(event, hooks, ctx)` helper (DRY + minimal conflict with the
landed S1). Session hooks (`onSessionStart`/`onSessionEnd`) are ALREADY wired by S1/P2.M2.T2.S1 —
S2 does NOT touch them. REMOVE the obsolete "No tool/stream hooks wired (S2 boundary)" test block
from `pi-harness-streaming.test.ts` (L395-424) — its premise becomes false once S2 lands. ADD 1 new
test file `pi-harness-hooks.test.ts`. **No edits** to the drain loop, StreamEvent mapping,
customTools/buildCustomTools, resolveModel/initialize/terminate/normalizeModel, types, barrels,
registry, other harnesses.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Seven load-bearing details:
> (1) **S1 has LANDED** — both listeners + the drain loop already exist in `pi-harness.ts`.
> S2's edits are additive/localized (1 interface + 1 method + 2× `const hookCtx` + 2× dispatch call).
> No edits to the drain loop or session hooks. (2) **`ToolExecutionStartEvent`/`ToolExecutionEndEvent`
> carry NO timestamp/duration** (verified in `.d.ts`) — S2 COMPUTES `duration = Date.now() - startTimestamp`
> by stashing the start time in a `Map<toolCallId, …>`. This is the Pi advantage over claude-code
> (whose `PostToolUse` always reports `duration:0`). (3) **`ToolExecutionEndEvent` carries NO `args`**
> — S2 reconstructs the `onToolEnd` request `{name, input}` from the STASHED start info (keyed by
> `toolCallId`), giving full fidelity (claude-code only has the SDK's `tool_input`). (4) **`onToolEnd`
> observes the REAL `isError`** (`ToolExecutionEndEvent.isError`) — claude-code always reports `false`.
> (5) **`onStream` uses snapshot-diff** (`delta = text.slice(streamText.value.length)`) — independent
> accumulator from the drain loop's `fullText`, so S2 never edits the drain loop. Both produce
> byte-identical deltas for the same chunk. (6) **Hooks are fire-and-track** (`void hooks.x?.(…)`)
> because the Pi listener is SYNCHRONOUS and cannot `await` — matches the existing
> `void hooks?.onSessionStart?.()` pattern. (7) **REMOVE the S2-boundary negative test** from
> `pi-harness-streaming.test.ts` (L395-424) — obsolete once S2 wires the hooks.

---

## Goal

**Feature Goal:** Make `PiHarness` fire **all five** `HarnessHookEvents` (PRD §7.11) with correct,
Pi-faithful context. Session hooks (`onSessionStart`/`onSessionEnd`) already fire (S1/P2.M2.T2.S1);
S2 adds the remaining three — `onToolStart` (from `tool_execution_start`), `onToolEnd` (from
`tool_execution_end`), `onStream` (from `message_update`) — to BOTH the non-streaming `execute()`
listener and the streaming `executeStreaming()` listener, via one shared `private fireHookEvents()`
helper. `onToolEnd` reports the REAL `isError` and a REAL `duration` (item note: *"Pi tool events DO
observe errors/duration (unlike claude-code's PostToolUse limitation)"*). Hook ordering is
deterministic (PRD §7.14.3): `onToolStart` precedes `onToolEnd`; in the streaming path, hooks fire
before their corresponding `StreamEvent`s.

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`**:
   - ADD a `HookDispatchContext` interface (the mutable accumulators: `toolStarts: Map<string,
     {name, input, timestamp}>` + `streamText: {value: string}`).
   - ADD a `private fireHookEvents(event, hooks, ctx): void` method implementing the PRD §7.11
     mapping for the 3 new hooks (see "Implementation Patterns"). NO session hooks here (those stay
     inline — scope boundary).
   - WIRE into the **non-streaming** listener (L240-274): allocate `hookCtx` before the listener;
     call `this.fireHookEvents(event, hooks, hookCtx)` at the TOP of the listener body (before the
     existing `switch (e.type)`). Leave the session_start/session_shutdown/turn_end cases UNCHANGED.
   - WIRE into the **streaming** listener (L370-386): allocate `hookCtx`; call
     `this.fireHookEvents(event, hooks, hookCtx)` BEFORE `enqueue(event)` (so hooks precede the
     StreamEvents). Leave the session_start/session_shutdown cases + `enqueue` UNCHANGED.
   - UPDATE the `execute()` JSDoc: change "Remaining hooks (onToolStart/onToolEnd/onStream): owned
     by P2.M3.T2.S2" to "All hooks fire via fireHookEvents() (P2.M3.T2.S2)".
   - LEAVE the drain loop (L410-495), customTools/buildCustomTools, resolveModel/initialize/terminate,
     normalizeModel, loadSkills stub, supports/requiresFeatures **UNCHANGED**.
2. **MODIFY `src/__tests__/unit/providers/pi-harness-streaming.test.ts`** — REMOVE the entire
   `describe` block at L395-424 titled "No tool/stream hooks wired (S2 boundary)" (the
   `should NOT fire onToolStart/onToolEnd/onStream hooks` `it(...)`). Its premise is obsolete once
   S2 lands. KEEP all other streaming assertions (metadata-first, text_delta, tool_call_start/done,
   usage, done, return value, session hooks parity).
3. **NEW `src/__tests__/unit/providers/pi-harness-hooks.test.ts`** — the hook suite, mirroring
   `claude-code-harness-hooks.test.ts` and reusing P2.M2.T2.S1's `makeFakeSession`/`wireFakeSession`
   idiom (copy the small factory in). Assert (a) `onToolStart` receives `{name, input}` from
   `tool_execution_start`; (b) `onToolEnd` receives `(req, {content, isError}, duration)` where
   `req` is reconstructed from the STASHED start info, `isError` is the REAL value, and
   `duration >= 0`; (c) `onStream` fires per-chunk via snapshot-diff (`'Hel'`→`'lo'`); (d) all three
   fire in BOTH non-streaming and streaming paths; (e) session hooks still fire (regression); (f) no
   hooks arg → no throw; (g) streaming ordering: hooks precede their StreamEvents.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles; `fireHookEvents` + the
   `HookDispatchContext` interface + the structural casts are sound; no forbidden transitive import;
   no import cycle; the method's `void hooks.x?.(...)` calls typecheck against `HarnessHookEvents`.
2. `npm test` exits 0 — new hooks suite + (edited) streaming suite + full regression all green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted with `fireHookEvents`.
4. Runtime spot-check (the fake-session suite): a `PiHarness` whose `createAgentSession` is stubbed
   to a fake session replaying `[session_start, message_update('Hel'), message_update('Hello'),
   tool_execution_start, tool_execution_end, turn_end, agent_end, session_shutdown]` fires, in order,
   `onSessionStart`, `onStream('Hel')`, `onStream('lo')`, `onToolStart({name,input})`,
   `onToolEnd(req, {content, isError:false}, duration>=0)`, `onSessionEnd(duration)` — and (in
   streaming mode) each hook precedes its `StreamEvent` counterpart.
5. Contract (grep): `private fireHookEvents`, `HookDispatchContext`, `toolStarts`,
   `ctx.toolStarts.set`, `Date.now() - start.timestamp`, `e.isError ?? false`, `text.slice(ctx.streamText.value.length)`,
   `this.fireHookEvents(event, hooks, hookCtx)` (2 hits — both listeners); NO `@earendil-works/pi-ai`
   import; the "No tool/stream hooks wired (S2 boundary)" test is GONE from streaming.test.ts.

---

## ⚠️ SCOPE DECISIONS — seven load-bearing details

### Decision 1 — S1 has LANDED; S2 edits are additive and localized

S1's `executeStreaming()` + both listeners + the drain loop ALREADY exist in `pi-harness.ts`
(verified by read). S2's diff is:
1. ONE new `HookDispatchContext` interface.
2. ONE new `private fireHookEvents(event, hooks, ctx)` method.
3. TWO `const hookCtx: HookDispatchContext = { toolStarts: new Map(), streamText: { value: "" } };`
   allocations (one per listener).
4. TWO `this.fireHookEvents(event, hooks, hookCtx);` call lines (one per listener).

**No edits** to the drain loop (L410-495), the session_start/session_shutdown cases, the
StreamEvent mapping, customTools, resolveModel, initialize/terminate, normalizeModel. Zero
functional overlap with S1. **Verify via pre-flight grep** (Task 0): `executeStreaming` + the
non-streaming listener's `case "session_start"` must already exist (they do — S1 landed).

### Decision 2 — Tool events carry NO timestamp; S2 COMPUTES duration

Verified in `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`:
```ts
interface ToolExecutionStartEvent { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any; } // NO timestamp
interface ToolExecutionEndEvent   { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean; } // NO timestamp/duration
```
S2 stashes `timestamp: Date.now()` in `ctx.toolStarts` at `tool_execution_start` and computes
`duration = Date.now() - start.timestamp` at `tool_execution_end`. Since the Pi listener fires
**synchronously during `session.prompt()`**, the time between the two events is the real tool
execution time. This is the Pi advantage (claude-code's `PostToolUse` always reports `duration:0`).

### Decision 3 — `ToolExecutionEndEvent` carries NO `args`; reconstruct from stashed start

The end event lacks `args`, so `onToolEnd`'s `tool: ToolExecutionRequest { name, input }` must be
reconstructed from the **stashed start info** (`ctx.toolStarts.get(toolCallId)`). This gives FULL
fidelity (claude-code only has the SDK's `tool_input`, which may be normalized differently). If the
matching start is missing (rare: resumed session, out-of-order events), degrade gracefully:
`{ name: e.toolName ?? "", input: undefined }` + `duration: 0`. Always `delete` the stashed entry
after reading (defends against duplicate end events → stale duration).

### Decision 4 — `onToolEnd` observes the REAL `isError` (Pi > claude-code)

`ToolExecutionEndEvent.isError` is a real boolean. S2 maps it directly: `result.isError = e.isError ?? false`.
claude-code's `PostToolUse` CANNOT observe errors (always `false` — see `claude-code-harness.ts`
L1110-1134, `isError: false, // SDK limitation`). The item note calls this out explicitly. S2's test
suite asserts the Pi fidelity (an `isError:true` end event → `onToolEnd` receives `isError:true`);
**P4.M2.T1.S1 parity tests must gate this assertion on `harness==='pi'** (claude-code can't satisfy it).

### Decision 5 — `onStream` uses an INDEPENDENT snapshot-diff accumulator (don't touch the drain loop)

The drain loop (L410-495) already does snapshot-diff for `text_delta` StreamEvents using its OWN
`fullText`. S2 adds `onStream` using a SEPARATE accumulator (`ctx.streamText`) inside `fireHookEvents`.
Both apply the IDENTICAL algorithm to the IDENTICAL event, so `onStream(delta)` and the `text_delta`
StreamEvent for the same chunk produce **byte-identical deltas**. **Rationale:** merging the two
accumulators would force an edit to S1's drain loop (merge-conflict risk + scope creep). A consumer
observing both channels sees consistent text. Document this in a code comment.

### Decision 6 — Hooks are fire-and-track (`void`); the Pi listener is SYNCHRONOUS

`hooks.onToolStart` etc. may return a `Promise<void>`. The Pi listener runs **synchronously** during
`session.prompt()` and CANNOT `await` (doing so would block the SDK's event loop / reorder events).
S2 calls them via `void hooks.onToolStart?.(req)` — **identical to the existing
`void hooks?.onSessionStart?.()` pattern** (S1 L377, P2.M2.T2.S1 L246). Consumers needing cross-hook
ordering must coordinate externally (out of scope). Tests use SYNC `vi.fn()` hooks for deterministic
call-count/arg assertions. Document the fire-and-track contract in the `fireHookEvents` JSDoc.

### Decision 7 — REMOVE the obsolete "No tool/stream hooks wired (S2 boundary)" test

`src/__tests__/unit/providers/pi-harness-streaming.test.ts` L395-424:
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
Once S2 wires the hooks, this assertion FAILS. **S2 removes the entire `describe` block** (L395-424,
including the `// ── No tool/stream hooks wired (S2 boundary) ────` comment header). KEEP all other
streaming assertions. The POSITIVE hook assertions live in the NEW `pi-harness-hooks.test.ts`
(streaming-path hook cases included there).

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P3.M1.T2.S1/S2 (`Agent`)** — `Agent.executePrompt()`/`Agent.stream()` forward a `hooks` object
  into `harness.execute(req, toolExecutor, hooks)`. Until S2, `onToolStart`/`onToolEnd`/`onStream`
  are silently ignored on the default (`pi`) harness.
- **P4.M2.T1.S1 (parity tests)** — asserts identical hook FIRING across `pi`+`claude-code`, with
  Pi-specific fidelity gates on `onToolEnd` `isError`/`duration`.
- **P4.M2.T1.S2 (deterministic ordering)** — asserts `onToolStart` precedes `onToolEnd` and hooks
  precede StreamEvents.

**Use Case:** Observability/instrumentation — a consumer wires `onToolStart`/`onToolEnd` to log
tool latency/errors, and `onStream` to render live assistant text. On the default `pi` harness this
must "just work" identically to `claude-code` (and with better tool fidelity).

**Pain Points Addressed:** Until S2, `PiHarness` silently swallows the 3 most useful hooks (tool
start/end, stream). Any `Agent` consumer relying on tool timing, tool-error observation, or live
streaming gets nothing on the default harness.

---

## Why

- **Realizes PRD §7.11** — the full AgentHooks↔HarnessHookEvents↔Pi-events mapping table. S1 +
  P2.M2.T2.S1 delivered 2 of 5 hooks (session); S2 completes the contract.
- **Delivers hook parity + fidelity (§7.14 / §7.14.3)** — all 5 hooks fire with consistent context
  and deterministic ordering; Pi additionally observes REAL tool `isError`/`duration` (claude-code
  cannot — documented SDK limitation).
- **Unblocks P3.M1.T2.S1/S2** — `Agent` forwards `hooks`; without S2 they're dead on the default harness.
- **Keeps the harness provider-agnostic** — Pi's event stream is provider-neutral; the structural
  casts + snapshot-diff do not depend on any provider's encoding.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — `HookDispatchContext` interface + `fireHookEvents`
   method + 2× wiring (both listeners) + JSDoc update.
2. **MODIFY** `src/__tests__/unit/providers/pi-harness-streaming.test.ts` — remove the S2-boundary
   negative `describe` (L395-424).
3. **CREATE** `src/__tests__/unit/providers/pi-harness-hooks.test.ts` — hook suite (both paths).
4. **VALIDATE** (lint / targeted tests / full suite / build / grep contract + runtime spot-check).

### Success Criteria

- [ ] `onToolStart({name, input})` fires on `tool_execution_start` in BOTH the non-streaming and
      streaming paths (name = `toolName`, input = `args`).
- [ ] `onToolEnd(req, result, duration)` fires on `tool_execution_end` in BOTH paths, where `req`
      equals the matching start's `{name, input}` (reconstructed from `ctx.toolStarts`),
      `result = {content: result, isError: <REAL boolean>}`, and `duration >= 0` (computed from the
      stashed start timestamp; `0` only if start was missing).
- [ ] `onToolEnd` observes the REAL `isError` — an `isError:true` end event → `result.isError === true`.
- [ ] `onStream(chunk)` fires on each `message_update` (assistant text) via snapshot-diff — e.g.
      `message_update('Hel')` then `message_update('Hello')` → `onStream('Hel')`, `onStream('lo')`.
- [ ] `onSessionStart`/`onSessionEnd` STILL fire (regression — S2 did not touch them).
- [ ] No `hooks` arg (or `undefined` hooks) → no throw (`fireHookEvents` early-returns on `!hooks`).
- [ ] Streaming ordering (PRD §7.14.3): `onToolStart`/`onToolEnd`/`onStream` fire BEFORE their
      corresponding `tool_call_start`/`tool_call_done`/`text_delta` StreamEvents.
- [ ] The drain loop, StreamEvent mapping, customTools wiring, resolveModel, initialize/terminate,
      normalizeModel, loadSkills stub are all UNCHANGED.
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.
- [ ] No import of `@earendil-works/pi-ai` / `@earendil-works/pi-agent-core` (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S2 using only
(a) this PRP, (b) read-only access to `src/harnesses/pi-harness.ts` (the file with S1's LANDED
`executeStreaming` + both listeners + the drain loop — S2 adds a helper + 2 call lines per listener),
`src/harnesses/claude-code-harness.ts` (`buildAgentSDKHooks` L1063-1164 — the parity reference +
the documented claude-code `PostToolUse` `isError:false`/`duration:0` limitations S2 BEATS),
`src/types/harnesses.ts` (`HarnessHookEvents` L98-114 + `ToolExecutionRequest`/`ToolExecutionResult`
L119-160 — the exact target signatures), `src/__tests__/unit/providers/pi-harness-execute.test.ts`
(`makeFakeSession`/`wireFakeSession` L24-56 — the fake-session idiom to copy), and
`src/__tests__/unit/providers/claude-code-harness-hooks.test.ts` (the hook-test pattern to mirror),
and (c) the copy-paste-ready `fireHookEvents` snippet in "Implementation Patterns" +
`research/hook-dispatch-design.md`. The seven load-bearing details (S1-landed, no-timestamp,
no-args-on-end, real-isError, independent-streamText, fire-and-track, test-removal) are proven in
the research note.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness + hooks).
- url: PRD.md §7.10, §7.11, §7.14, §7.14.3   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.10 = ToolExecutionRequest/Result shapes (the onToolStart/onToolEnd payload contract);
       §7.11 = the AgentHooks↔HarnessHookEvents↔Pi-events mapping table (onToolStart←tool_execution_start,
       onToolEnd←tool_execution_end, onStream←message_update, onSessionStart←session_start,
       onSessionEnd←session_shutdown); §7.14 = feature parity; §7.14.3 = hooks fire with consistent
       context AND deterministic ordering.
  critical: §7.11 is the exact dispatch table S2 implements; §7.14.3 is WHY ordering must be deterministic.

# MUST READ — the verified Pi SDK event surface + the adapter-design implications.
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.2 = AgentSession.subscribe(listener) is SYNC (mandates fire-and-track hooks — Decision 6);
       §1.6 = the event list (ToolExecutionStartEvent, ToolExecutionEndEvent, MessageUpdateEvent —
       the three S2 sources); §4 = the ClaudeCodeHarness-vs-PiHarness hook column
       ("Lifecycle hooks: options.hooks.*" vs "session.subscribe event filtering" — confirms S2's design).
  critical: §1.2 (sync listener → void hooks) + §1.6 (the 3 source events).

# MUST READ — the seven load-bearing decisions (helper design, fidelity, ordering, test removal).
- file: plan/004_9a50e71828f4/P2M3T2S2/research/hook-dispatch-design.md
  why: §1 = current state of pi-harness.ts (S1 LANDED — both listeners + drain loop exist);
       §2 = the 5-hook mapping table + S2's 3-hook scope; §3 = Pi-vs-claude-code fidelity table
       (the onToolEnd isError/duration/input advantages); §4 = verified Pi event shapes (NO timestamp,
       NO args-on-end — Decisions 2/3); §5 = the shared-helper design + copy-paste-ready code + wiring;
       §6 = deterministic ordering guarantees; §7 = parallel-merge strategy (additive edits, test removal);
       §8 = test approach + async-hook caveat.
  critical: §3 (fidelity), §4 (event shapes), §5 (the helper) are the three most load-bearing facts.

# MUST READ — the harness to mirror (claude-code buildAgentSDKHooks + its SDK limitations).
- file: src/harnesses/claude-code-harness.ts
  why: L1063-1164 = buildAgentSDKHooks (the parity reference — how claude-code maps onToolStart→PreToolUse,
       onToolEnd→PostToolUse, etc.); L1110-1134 = PostToolUse adapter with `isError: false, // SDK limitation`
       and `duration = 0; // SDK limitation` (the limitations S2 BEATS on Pi — Decision 4); L1087-1108 =
       PreToolUse adapter (the onToolStart shape S2 matches: {name: tool_name, input: tool_input}).
  pattern: copy the HOOK INVOCATION shape (await hooks.onToolStart!(toolRequest) etc.), but ADAPT the
           source from SDK hook-input fields to Pi event fields (toolName/args/result/isError/toolCallId).

# MUST READ — the file S2 modifies (S1's LANDED listeners + drain loop).
- file: src/harnesses/pi-harness.ts
  why: L240-274 = non-streaming listener (session_start/session_shutdown/turn_end cases — S2 adds
       fireHookEvents at the top); L370-386 = streaming listener (session cases + enqueue — S2 adds
       fireHookEvents before enqueue); L410-495 = drain loop (message_update/tool/turn_end → StreamEvent —
       S2 DOES NOT EDIT); L186-189 = execute() JSDoc (S2 updates the "Remaining hooks" line);
       imports block (L1-40) already has AgentSessionEvent/AgentSessionEventListener/HarnessHookEvents/
       ToolExecutionRequest/ToolExecutionResult — NO new imports needed.
  gotcha: The two listeners have DIFFERENT structure (non-streaming aggregates in the listener; streaming
          enqueues + aggregates in the drain loop). S2 wires fireHookEvents identically into BOTH.

# MUST READ — the HarnessHookEvents + ToolExecutionRequest/Result types (the target signatures).
- file: src/types/harnesses.ts
  why: L98-114 = HarnessHookEvents (onToolStart(tool:ToolExecutionRequest), onToolEnd(tool, result, duration),
       onStream(chunk:string)); L119-128 = ToolExecutionRequest { name: string; input: unknown };
       L139-151 = ToolExecutionResult { content: string|unknown; isError: boolean }. S2's helper must
       produce objects assignable to these EXACT shapes (no extra/missing fields).
  gotcha: onToolEnd's `duration` is a plain number (ms); result.content is `string|unknown` (Pi's `result:any`
          is assignable). onStream's `chunk` is a `string` (snapshot-diff always yields a string).

# SHOULD READ — the fake-session test idiom (copy makeFakeSession/wireFakeSession into the new test).
- file: src/__tests__/unit/providers/pi-harness-execute.test.ts
  why: L24-42 = makeFakeSession(events) (subscribe captures listener; prompt replays events synchronously);
       L43-56 = wireFakeSession(harness, events) (private `harness.sdk` overwrite via @ts-expect-error);
       L57-60 = scripted payloads (SESSION_START, turnEndText); L119 = dummyToolExecutor. Copy these into
       pi-harness-hooks.test.ts + add tool_execution_start/end + message_update payloads.
  pattern: the fake session's prompt() replays events SYNCHRONOUSLY into the captured listener (the
           fireHookEvents call happens during prompt, exactly like production). For streaming, reuse the
           drainStreaming helper from pi-harness-streaming.test.ts (S1's file).

# SHOULD READ — the hook-test pattern to mirror (claude-code).
- file: src/__tests__/unit/providers/claude-code-harness-hooks.test.ts
  why: the describe/it structure + vi.fn() spy assertions + the "hook receives {name, input}" assertions
       that S2 mirrors for Pi (adapting the event source from SDK hook inputs to Pi session events).
  pattern: one describe per hook (onToolStart, onToolEnd, onStream) + a "hooks are optional" case +
           an "ordering" case. S2 ADDS Pi-specific cases: real isError, real duration, reconstructed input.
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (buildAgentSDKHooks L1063-1164; SDK limitations L1110-1134)
├── harness-registry.ts      # untouched
├── index.ts                 # untouched (barrel)
├── pi-harness.ts            # ← MODIFY (HookDispatchContext + fireHookEvents + 2× wiring + JSDoc)
└── session-store.ts         # untouched
src/types/
├── agent.ts                 # untouched (createSuccessResponse/createErrorResponse — already imported)
├── harnesses.ts             # CONSUMER (HarnessHookEvents + ToolExecutionRequest/Result — already imported)
└── streaming.ts             # untouched (StreamEvent — already imported by S1)
src/__tests__/unit/providers/
├── claude-code-harness-hooks.test.ts          # REFERENCE (hook-test pattern to mirror)
├── pi-harness.test.ts                          # untouched
├── pi-harness-execute.test.ts                  # CONSUMER of makeFakeSession/wireFakeSession (copy idiom; session-hook tests L217-244 must still pass)
├── pi-harness-streaming.test.ts                # ← MODIFY (remove S2-boundary describe L395-424)
├── pi-harness-initialize.test.ts               # must still pass
├── pi-harness-normalizemodel.test.ts           # must still pass
├── pi-harness-resolvemodel.test.ts             # must still pass
├── pi-harness-registermcps.test.ts             # must still pass
├── pi-harness-customtools.test.ts              # must still pass
└── pi-harness-hooks.test.ts                    # ← NEW
node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts  # READ-ONLY (event shapes L541-562)
node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/  # NON-HOISTED — DO NOT IMPORT
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                          # MODIFY (HookDispatchContext + fireHookEvents + 2× wiring + JSDoc)
src/__tests__/unit/providers/pi-harness-streaming.test.ts  # MODIFY (remove S2-boundary describe L395-424)
src/__tests__/unit/providers/pi-harness-hooks.test.ts      # NEW
# (drain loop, customTools wiring, session hooks, loadSkills stub, types, barrels, registry — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — S1 has LANDED. Both listeners + the drain loop ALREADY exist. S2's edits are
//   ADDITIVE: 1 interface + 1 method + 2× hookCtx + 2× dispatch call. Do NOT rewrite executeStreaming
//   or the listeners; do NOT touch the drain loop. (Decision 1.)

// CRITICAL #2 — ToolExecutionStartEvent/EndEvent carry NO timestamp/duration. S2 COMPUTES duration by
//   stashing Date.now() in ctx.toolStarts at start and diffing at end. (Decision 2; research §4.)

// CRITICAL #3 — ToolExecutionEndEvent carries NO `args`. Reconstruct onToolEnd's {name, input} from the
//   STASHED start info (ctx.toolStarts.get(toolCallId)). Delete the entry after reading. (Decision 3.)

// CRITICAL #4 — onToolEnd observes the REAL isError (ToolExecutionEndEvent.isError). Map directly:
//   result.isError = e.isError ?? false. claude-code cannot (always false). (Decision 4.)

// CRITICAL #5 — onStream uses an INDEPENDENT accumulator (ctx.streamText), NOT the drain loop's fullText.
//   Both produce byte-identical deltas for the same chunk. Do NOT merge them (would force a drain-loop
//   edit = merge conflict with S1). (Decision 5.)

// CRITICAL #6 — Hooks are fire-and-track: `void hooks.onToolStart?.(req)`. The Pi listener is SYNCHRONOUS
//   and CANNOT await (would block/reorder the SDK event loop). Matches the existing
//   `void hooks?.onSessionStart?.()` pattern. Tests use SYNC vi.fn() hooks. (Decision 6.)

// CRITICAL #7 — REMOVE the "No tool/stream hooks wired (S2 boundary)" describe (L395-424) from
//   pi-harness-streaming.test.ts. Its negative assertions are obsolete once S2 lands. KEEP all other
//   streaming assertions. (Decision 7.)

// GOTCHA #8 — NO transitive type imports. ToolExecutionStartEvent/EndEvent/MessageUpdateEvent are
//   NON-HOISTED transitives under @earendil-works/pi-ai (require() → MODULE_NOT_FOUND, confirmed by S1).
//   Cast structurally: event as { type:string; message?:any; toolCallId?:string; toolName?:string;
//   args?:any; result?:any; isError?:boolean }. Import ONLY what pi-harness.ts already imports.

// GOTCHA #9 — Ordering (PRD §7.14.3): in the streaming listener, call fireHookEvents BEFORE enqueue(event)
//   so onToolStart/onToolEnd/onStream precede their tool_call_start/tool_call_done/text_delta StreamEvents.
//   In the non-streaming listener, call it at the top (before the switch) — ordering within the listener
//   is arrival-order (Pi emits tool_execution_start strictly before tool_execution_end).

// GOTCHA #10 — fireHookEvents must early-return on `!hooks` (no hooks arg). Both listeners are called
//   with the optional `hooks?` param; when absent, the helper is a cheap no-op. Do NOT throw.

// GOTCHA #11 — ToolExecutionRequest requires BOTH `name` AND `input`. For tool_execution_start,
//   input = e.args (may be undefined if the tool takes no args — that's fine; `input: unknown` allows it).
//   For tool_execution_end (reconstructed), input = the stashed start's input (or undefined if start missing).

// GOTCHA #12 — ToolExecutionResult.content is `string | unknown`. Pi's `result: any` is assignable
//   directly. When result is null/absent on the end event, use `e.result ?? null` (content may be null).

// GOTCHA #13 — Duplicate tool_execution_end events (defensive): always `ctx.toolStarts.delete(id)` after
//   reading, so a second end event for the same toolCallId gets duration:0 + input:undefined (graceful).

// GOTCHA #14 — message_update fires for ALL message roles (user/assistant/toolResult). Guard
//   `msg?.role === 'assistant'` before snapshot-diff for onStream (mirror the drain loop L416 guard).

// GOTCHA #15 — isolatedModules: true (tsconfig.json). HookDispatchContext is a local interface (not
//   exported) — fine. ToolExecutionRequest/ToolExecutionResult/HarnessHookEvents/AgentSessionEvent are
//   already imported (types). NO new value imports (fireHookEvents uses only already-imported types).

// GOTCHA #16 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   pi-harness.ts (proving fireHookEvents compiles + casts + no forbidden transitive import + no cycle).
//   Test type errors surface in `npm test` (vitest/esbuild). Run BOTH.

// GOTCHA #17 — The fake-session test must replay events SYNCHRONOUSLY during prompt() (fireHookEvents
//   is called from the sync listener during prompt). For the streaming path, drain the generator with
//   `for await` (the queue bridge converts sync events to async yields) — reuse S1's drainStreaming
//   helper from pi-harness-streaming.test.ts OR inline an equivalent.

// GOTCHA #18 — onStream and text_delta BOTH fire for the same message_update in the streaming path
//   (onStream from the listener, text_delta from the drain loop). This is BY DESIGN (two channels:
//   hook vs stream event). Tests may assert BOTH fire for the same chunk; do not treat it as a bug.
```

---

## Implementation Blueprint

### Data models and structure

ONE new local (non-exported) interface — `HookDispatchContext` — and ONE new private method
(`fireHookEvents`). **No new imports** — everything S2 needs is already imported by S1/P2.M2.T2.S1:
`AgentSessionEvent`/`AgentSessionEventListener` (types), `HarnessHookEvents`/
`ToolExecutionRequest`/`ToolExecutionResult` (types). Place `HookDispatchContext` near the top of
the file (after the `PiModel` type alias, before the class) OR immediately before `fireHookEvents`.
Place `fireHookEvents` as a private method immediately after `executeStreaming` (keep method order:
execute → executeStreaming → fireHookEvents → registerMCPs).

> If a pre-flight grep shows `HarnessHookEvents`/`ToolExecutionRequest`/`ToolExecutionResult` are NOT
> imported in pi-harness.ts (they ARE — L9-17 of the imports block), add them. Verify in Task 0.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -nE "executeStreaming|fireHookEvents|case \"session_start\"|case \"tool_execution_start\"|const hookCtx" src/harnesses/pi-harness.ts`
        → confirm: (a) S1 LANDED — executeStreaming + both listeners exist; (b) fireHookEvents does
        NOT exist yet (S2 owns it); (c) NO tool_execution_start case in either listener (S2 adds via
        the helper); (d) HarnessHookEvents/ToolExecutionRequest/ToolExecutionResult are imported.
  - RUN: `grep -n "No tool/stream hooks wired\|should NOT fire onToolStart" src/__tests__/unit/providers/pi-harness-streaming.test.ts` → 1 hit each (the obsolete block L395-424).
  - RUN: `node -e "try{require('@earendil-works/pi-ai');console.log('RESOLVABLE')}catch(e){console.log('BLOCKED')}"` → BLOCKED (Decision 8/GOTCHA #8 confirmed).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN. If red from a parallel task, surface it.

Task 1: MODIFY src/harnesses/pi-harness.ts (add HookDispatchContext + fireHookEvents + wire both listeners)
  - ADD the HookDispatchContext interface (see "Implementation Patterns"). Place after the `PiModel`
    type alias (~L48) OR immediately before the class.
  - ADD `private fireHookEvents(event, hooks, ctx): void` (see "Implementation Patterns"). Place
    immediately AFTER executeStreaming (before registerMCPs).
  - WIRE non-streaming listener (L240-274): add `const hookCtx: HookDispatchContext = { toolStarts:
    new Map(), streamText: { value: "" } };` BEFORE `const listener`; add
    `this.fireHookEvents(event, hooks, hookCtx);` as the FIRST statement inside the listener body
    (before `const e = event as {...}` and the `switch (e.type)`).
  - WIRE streaming listener (L370-386): add the same `hookCtx` allocation before `const listener`;
    add `this.fireHookEvents(event, hooks, hookCtx);` AFTER the session switch and BEFORE `enqueue(event)`.
  - UPDATE the execute() JSDoc (L186-189): replace "Remaining hooks (onToolStart/onToolEnd/onStream):
    owned by P2.M3.T2.S2." with "All hooks fire: session hooks inline (S1/P2.M2.T2.S1); tool/stream
    hooks via fireHookEvents() (P2.M3.T2.S2)."
  - LEAVE the drain loop (L410-495), session_start/session_shutdown cases, customTools/buildCustomTools,
    loadSkills, resolveModel/initialize/terminate, normalizeModel, supports/requiresFeatures UNCHANGED.
  - VERIFY (grep): `grep -nE "private fireHookEvents|HookDispatchContext|toolStarts: new Map|this\.fireHookEvents\(event, hooks, hookCtx\)|e\.isError \?\? false|Date\.now\(\) - start\.timestamp" src/harnesses/pi-harness.ts` → 6+ hits; `this.fireHookEvents` appears 2× (both listeners).
  - VERIFY (NO forbidden transitive import): `! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts` → exit 1 (no match).

Task 2: MODIFY src/__tests__/unit/providers/pi-harness-streaming.test.ts (remove obsolete S2-boundary describe)
  - DELETE the entire block from the `// ── No tool/stream hooks wired (S2 boundary) ────` comment
    header through the closing `});` of its `describe(...)`. This is approximately L395-424 (the
    `it('should NOT fire onToolStart/onToolEnd/onStream hooks (P2.M3.T2.S2 scope)', ...)` case with
    its `expect(onToolStart).not.toHaveBeenCalled()` / `onToolEnd` / `onStream` assertions).
  - KEEP all other describes (metadata-first, text_delta, tool_call_start/done, usage, done, return
    value, session hooks parity, customTools reuse).
  - VERIFY: `grep -n "No tool/stream hooks wired\|should NOT fire onToolStart" src/__tests__/unit/providers/pi-harness-streaming.test.ts` → 0 hits.

Task 3: CREATE src/__tests__/unit/providers/pi-harness-hooks.test.ts (the hook suite)
  - STRUCTURE: import { describe, it, expect, beforeEach, vi } from 'vitest'; PiHarness; HarnessHookEvents
    + ToolExecutionRequest/ToolExecutionResult + HarnessRegistry (reset helpers — copy from
    pi-harness-initialize.test.ts L25-27). Copy makeFakeSession + wireFakeSession from
    pi-harness-execute.test.ts L24-56. Add a drainStreaming helper (copy from
    pi-harness-streaming.test.ts OR inline: `for await (const e of gen) events.push(e); const final =
    (await gen.next()).value`).
  - PAYLOADS (verified Pi shapes):
      const SESSION_START   = { type: 'session_start', reason: 'startup' };
      const SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };
      const TOOL_START = { type: 'tool_execution_start', toolCallId: 'tc1', toolName: 'search', args: { q: 'x' } };
      const TOOL_END_OK = { type: 'tool_execution_end', toolCallId: 'tc1', toolName: 'search', result: 'found it', isError: false };
      const TOOL_END_ERR = { type: 'tool_execution_end', toolCallId: 'tc1', toolName: 'bash', result: 'exit 1', isError: true };
      const MSG_HEL = { type: 'message_update', message: { role: 'assistant', content: [{ type: 'text', text: 'Hel' }] } };
      const MSG_HELLO = { type: 'message_update', message: { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] } };
      const TURN_END = { type: 'turn_end', turnIndex: 0, message: { role: 'assistant', content: [{ type:'text', text:'Hello' }], usage: { input:10, output:5 } }, toolResults: [] };
      const AGENT_END = { type: 'agent_end', messages: [] };
  - beforeEach: new PiHarness(); await initialize(); reset HarnessRegistry.
  - CASES (describe('PiHarness - HarnessHookEvents adaptation')):
      onToolStart (non-streaming):
        - hooks = { onToolStart: vi.fn() }; wireFakeSession(harness, [SESSION_START, TOOL_START, TURN_END, AGENT_END]);
          await harness.execute({prompt:'x', options:{}}, dummyExec, hooks);
          expect(hooks.onToolStart).toHaveBeenCalledTimes(1);
          expect(hooks.onToolStart).toHaveBeenCalledWith({ name: 'search', input: { q: 'x' } }).
      onToolEnd reconstructed input + real isError=false + duration>=0:
        - hooks = { onToolEnd: vi.fn() }; replay [TOOL_START, TOOL_END_OK, TURN_END];
          await execute(...); const [req, result, duration] = hooks.onToolEnd.mock.calls[0];
          expect(req).toEqual({ name: 'search', input: { q: 'x' } });  // reconstructed from start (end lacks args)
          expect(result).toEqual({ content: 'found it', isError: false }); expect(duration).toBeGreaterThanOrEqual(0).
      onToolEnd real isError=true (Pi fidelity — claude-code cannot):
        - replay [TOOL_START, TOOL_END_ERR]; result.isError === true.
      onToolEnd start-missing graceful degradation:
        - replay [TOOL_END_OK] (no matching start); req === { name: 'search', input: undefined }; duration === 0.
      onStream snapshot-diff:
        - hooks = { onStream: vi.fn() }; replay [MSG_HEL, MSG_HELLO, TURN_END];
          expect(hooks.onStream.mock.calls.map(c => c[0])).toEqual(['Hel', 'lo']).
      onStream ignores non-assistant messages:
        - replay message_update with role:'user'; onStream NOT called.
      session hooks regression:
        - hooks = { onSessionStart: vi.fn(), onSessionEnd: vi.fn() }; replay [SESSION_START, ..., SESSION_SHUTDOWN];
          both called; onSessionEnd called with a Number. (S2 didn't break them.)
      no hooks arg → no throw:
        - wireFakeSession(...); await harness.execute({prompt, options:{}}, dummyExec) (no hooks) → resolves success.
      hooks are optional individually:
        - hooks = { onToolStart: vi.fn() } only (no onToolEnd/onStream); replay [TOOL_START, TOOL_END_OK, MSG_HEL, TURN_END];
          onToolStart called once; no throw from the absent hooks.
      STREAMING path — all 3 hooks fire:
        - wireFakeSession(...); const gen = harness.execute({prompt, options:{streaming:true}}, dummyExec, hooks);
          const { events } = await drainStreaming(gen); assert onToolStart/onToolEnd/onStream called with same shapes as non-streaming.
      STREAMING ordering — hooks precede StreamEvents:
        - replay [TOOL_START, TOOL_END_OK]; collect both hooks (record call order via vi.fn side-effect
          pushing to an array) AND StreamEvents; assert onToolStart fires before tool_call_start,
          onToolEnd before tool_call_done. (Deterministic ordering — PRD §7.14.3.)
      STREAMING onStream + text_delta both fire (GOTCHA #18):
        - replay [MSG_HEL, MSG_HELLO]; assert onStream called with ['Hel','lo'] AND a text_delta StreamEvent
          for each (two channels, same delta).
      Uninitialized → throws:
        - new PiHarness() (no init); execute({prompt, options:{}}, dummyExec, hooks) → rejects/throws /not initialized/i.
  - PLACEMENT: src/__tests__/unit/providers/.

Task 4: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check (a) a transitive type import slipped in (GOTCHA #8),
    (b) fireHookEvents signature mismatch (must be (event: AgentSessionEvent, hooks: HarnessHookEvents
    | undefined, ctx: HookDispatchContext): void), (c) a yielded/returned ToolExecutionRequest missing
    a field (needs name+input), (d) ToolExecutionResult missing a field (needs content+isError).
  - If pi-harness-streaming.test.ts fails on "should NOT fire onToolStart": Task 2 didn't remove the block.
  - If hooks test fails on onToolEnd input: verify the end-event path reconstructs from ctx.toolStarts
    (Decision 3) — the end event itself has no `args`.
```

### Implementation Patterns & Key Details

```ts
// === HookDispatchContext — the mutable accumulators for one execute() call ===
/**
 * Mutable context shared across events during a single execute()/executeStreaming() call, used by
 * {@link PiHarness.fireHookEvents}. NOT exported (internal to PiHarness).
 */
interface HookDispatchContext {
  /** toolCallId → start info (timestamp for duration; name/input for request reconstruction). */
  toolStarts: Map<string, { name: string; input: unknown; timestamp: number }>;
  /** Snapshot-diff accumulator for onStream (independent from the drain loop's `fullText`). */
  streamText: { value: string };
}

// === fireHookEvents — the PRD §7.11 dispatch for the 3 S2-owned hooks ===
/**
 * Dispatch the three harness hooks owned by P2.M3.T2.S2 (PRD §7.11):
 *   tool_execution_start → onToolStart({name, input})
 *   tool_execution_end   → onToolEnd({name, input}, {content, isError}, duration)
 *   message_update       → onStream(delta)   [snapshot-diff; assistant text only]
 *
 * Session hooks (onSessionStart/onSessionEnd) are NOT handled here — they stay inline in the
 * listeners as S1/P2.M2.T2.S1 wrote them (no scope overlap, no merge conflict).
 *
 * Pi fidelity advantage over claude-code (item note): onToolEnd observes the REAL isError
 * (ToolExecutionEndEvent.isError) and a REAL duration (computed from the stashed start timestamp);
 * claude-code's PostToolUse cannot (always isError:false, duration:0).
 *
 * Hooks are FIRE-AND-TRACK (`void`): the Pi listener runs SYNCHRONOUSLY during session.prompt()
 * and cannot `await` a hook Promise (would block/reorder the SDK event loop). Matches the existing
 * `void hooks?.onSessionStart?.()` pattern. Callers needing cross-hook ordering must coordinate
 * externally. Tests use sync vi.fn() hooks for deterministic assertions.
 *
 * @param event  Pi session event (structurally cast — transitive types are non-importable).
 * @param hooks  Optional HarnessHookEvents. Early-returns on `!hooks` (cheap no-op).
 * @param ctx    Mutable accumulators (toolStarts for duration/input reconstruction; streamText for onStream).
 */
private fireHookEvents(
  event: AgentSessionEvent,
  hooks: HarnessHookEvents | undefined,
  ctx: HookDispatchContext,
): void {
  if (!hooks) return; // no hooks → cheap no-op
  const e = event as {
    type: string;
    message?: any;
    toolCallId?: string;
    toolName?: string;
    args?: any;
    result?: any;
    isError?: boolean;
  };
  switch (e.type) {
    case "tool_execution_start": {
      const req: ToolExecutionRequest = { name: e.toolName ?? "", input: e.args };
      if (e.toolCallId) {
        ctx.toolStarts.set(e.toolCallId, {
          name: req.name,
          input: req.input,
          timestamp: Date.now(), // Decision 2 — tool events carry NO timestamp; we record it
        });
      }
      void hooks.onToolStart?.(req); // fire-and-track (Decision 6)
      break;
    }
    case "tool_execution_end": {
      const id = e.toolCallId ?? "";
      const start = ctx.toolStarts.get(id);
      const duration = start ? Date.now() - start.timestamp : 0; // Decision 2 — real duration
      // Decision 3 — reconstruct the request from the STASHED start info (end event lacks args).
      const req: ToolExecutionRequest = start
        ? { name: start.name, input: start.input }
        : { name: e.toolName ?? "", input: undefined }; // graceful degradation
      const result: ToolExecutionResult = {
        content: e.result ?? null,
        isError: e.isError ?? false, // Decision 4 — REAL isError (Pi > claude-code)
      };
      if (id) ctx.toolStarts.delete(id); // GOTCHA #13 — defend against duplicate end events
      void hooks.onToolEnd?.(req, result, duration); // fire-and-track
      break;
    }
    case "message_update": {
      // Decision 5 — onStream snapshot-diff; INDEPENDENT accumulator (ctx.streamText) decoupled
      // from the drain loop's `fullText` so S2 never edits the drain loop. Both produce identical
      // deltas for the same chunk (same algorithm, same event).
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
    // session_start/session_shutdown handled inline in the listeners (NOT here — scope boundary).
    // tool_execution_update/turn_end/etc. — no hook mapping (PRD §7.11 table).
  }
}

// === Wiring — non-streaming listener (L240-274) ===
//   BEFORE `const listener`:
const hookCtx: HookDispatchContext = {
  toolStarts: new Map(),
  streamText: { value: "" },
};
//   FIRST statement inside the listener body (before `const e = ...` and `switch (e.type)`):
const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
  this.fireHookEvents(event, hooks, hookCtx); // ← S2 ADDS (tool/stream hooks)
  const e = event as { type: string; message?: any; messages?: any[] };
  switch (e.type) {
    case "session_start":   void hooks?.onSessionStart?.();                    break; // unchanged
    case "session_shutdown": void hooks?.onSessionEnd?.(Date.now() - startTime); break; // unchanged
    case "turn_end": { /* …unchanged aggregation… */                            break; }
  }
};

// === Wiring — streaming listener (L370-386) ===
//   BEFORE `const listener`:
const hookCtx: HookDispatchContext = {
  toolStarts: new Map(),
  streamText: { value: "" },
};
//   AFTER the session switch, BEFORE enqueue(event):
const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
  const e = event as { type: string; message?: any };
  switch (e.type) {
    case "session_start":   void hooks?.onSessionStart?.();                       break; // unchanged
    case "session_shutdown": void hooks?.onSessionEnd?.(Date.now() - startTime);  break; // unchanged
  }
  this.fireHookEvents(event, hooks, hookCtx); // ← S2 ADDS (tool/stream hooks; BEFORE enqueue → ordering)
  enqueue(event);
};

// === Test helper: drain a streaming generator + read TReturn (copy into hooks test) ===
async function drainStreaming<T>(
  gen: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>,
): Promise<{ events: StreamEvent[]; final: AgentResponse<T> }> {
  const events: StreamEvent[] = [];
  for await (const e of gen) events.push(e);
  const { value: final } = await gen.next();
  return { events, final };
}
```

```ts
// === The OBSOLETE block to DELETE from pi-harness-streaming.test.ts (Task 2, ~L395-424) ===
//   // ── No tool/stream hooks wired (S2 boundary) ────
//   describe('...', () => {
//     it('should NOT fire onToolStart/onToolEnd/onStream hooks (P2.M3.T2.S2 scope)', async () => {
//       const onToolStart = vi.fn(); const onToolEnd = vi.fn(); const onStream = vi.fn();
//       ... wireFakeSession(...) ...
//       ... await drainStreaming(harness.execute({prompt, options:{streaming:true}}, dummyExec, {onToolStart,onToolEnd,onStream})) ...
//       expect(onToolStart).not.toHaveBeenCalled();
//       expect(onToolEnd).not.toHaveBeenCalled();
//       expect(onStream).not.toHaveBeenCalled();
//     });
//   });
// (Remove the whole describe + its `// ── No tool/stream hooks wired (S2 boundary) ────` header.)
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : add HookDispatchContext interface + private fireHookEvents method;
    wire `const hookCtx = {...}` + `this.fireHookEvents(event, hooks, hookCtx)` into BOTH listeners
    (non-streaming L240-274 top-of-body; streaming L370-386 after-session-switch-before-enqueue);
    update execute() JSDoc. NO new imports (all types already present from S1/P2.M2.T2.S1).

TESTS (MODIFY / NEW):
  - src/__tests__/unit/providers/pi-harness-streaming.test.ts : REMOVE the S2-boundary describe (~L395-424).
  - src/__tests__/unit/providers/pi-harness-hooks.test.ts : NEW (makeFakeSession/wireFakeSession idiom +
    tool_execution_start/end + message_update payloads; both non-streaming and streaming paths).

NO CHANGES TO:
  - drain loop (L410-495) and StreamEvent mapping (S1 — REUSED, not edited).
  - session_start/session_shutdown hook cases (S1 + P2.M2.T2.S1 — inline, unchanged).
  - customTools / buildCustomTools / mcpHandler wiring (P2.M3.T1.S1).
  - loadSkills stub (P2.M3.T2.S3).
  - resolveModel / initialize / terminate / normalizeModel / supports / requiresFeatures.
  - src/types/*, barrels, registry, other harnesses, pi-harness-execute.test.ts (session-hook tests L217-244 must still pass).
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Type-check the modified source (lint EXCLUDES __tests__ — proves pi-harness.ts compiles cleanly).
npm run lint                        # = tsc --noEmit
# Expected: exit 0. If it names pi-harness.ts:
#   - a transitive type import slipped in → remove it (GOTCHA #8);
#   - fireHookEvents signature/return mismatch → ensure (event: AgentSessionEvent, hooks:
#     HarnessHookEvents | undefined, ctx: HookDispatchContext): void;
#   - a ToolExecutionRequest missing `input` or a ToolExecutionResult missing `isError`;
#   - `hookCtx` not in scope inside a listener arrow (declare it BEFORE `const listener`).

# Confirm NO forbidden transitive imports + the helper exists + wiring landed in BOTH listeners.
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts   # exit 1 (no match) = PASS
grep -nE "private fireHookEvents|HookDispatchContext|toolStarts: new Map|this\.fireHookEvents\(event, hooks, hookCtx\)" src/harnesses/pi-harness.ts
# Expected: fireHookEvents (1 def + 2 calls = 3 hits), HookDispatchContext (1 interface + 2 hookCtx annotations),
#           toolStarts: new Map (2 hits — both listeners), this.fireHookEvents (2 hits — both listeners).
```

### Level 2: Unit Tests (Component Validation)

```bash
# The new hooks suite (targeted — both paths).
npm test -- pi-harness-hooks                   # or: npx vitest run src/__tests__/unit/providers/pi-harness-hooks.test.ts
# Expected: all green — onToolStart/onToolEnd/onStream fire (non-streaming + streaming),
#   onToolEnd reconstructed input + real isError + duration>=0, onStream snapshot-diff,
#   session hooks regression, no-hooks no-throw, streaming ordering (hooks precede StreamEvents).

# The edited streaming suite (S2-boundary describe removed; all other assertions intact).
npm test -- pi-harness-streaming
# Expected: green — the obsolete "should NOT fire onToolStart/..." case is gone; all other cases pass.

# The execute suite (session-hook tests L217-244 must still pass — regression).
npm test -- pi-harness-execute
# Expected: green.

# Full regression (all pi-harness suites + everything else).
npm test
# Expected: exit 0. P2.M3.T1.S1 (customTools) + P2.M2.T2.S1 (execute) + S1 (streaming) + S2 (hooks)
#   suites all green.

# If the hooks test fails on onToolEnd input: verify the end-event path reconstructs from
# ctx.toolStarts (Decision 3) — the end event has NO `args`; the request must come from the stashed
# start info. If duration is NaN/undefined: verify `start.timestamp` is set at tool_execution_start.
```

### Level 3: Integration Testing (System Validation)

```bash
# Build emits fireHookEvents + HookDispatchContext.
npm run build
# Expected: exit 0; dist/harnesses/pi-harness.{js,d.ts} emitted with fireHookEvents.

# Runtime spot-check (the contract end-to-end via the fake-session vitest suite):
#   A PiHarness whose createAgentSession is stubbed to a fake session replaying
#   [session_start, message_update('Hel'), message_update('Hello'), tool_execution_start,
#    tool_execution_end(isError:false), turn_end, agent_end, session_shutdown]
#   fires, IN ORDER: onSessionStart, onStream('Hel'), onStream('lo'),
#   onToolStart({name,input}), onToolEnd(req,{content,isError:false},duration>=0), onSessionEnd(duration).
#   In streaming mode, each hook precedes its StreamEvent counterpart (onToolStart before
#   tool_call_start; onStream before text_delta).
# (Covered by pi-harness-hooks.test.ts Task 3 — run it as the integration gate.)

# Parity sanity (manual, optional): compare the hook FIRING against claude-code-harness-hooks.test.ts.
#   onToolStart/onToolEnd/onStream all fire on BOTH harnesses. Pi ADDITIONALLY satisfies:
#     - onToolEnd result.isError can be true (claude-code always false).
#     - onToolEnd duration > 0 possible (claude-code always 0).
#     - onToolEnd tool.input is the stashed start args (claude-code = SDK tool_input).
#   This is formalized in P4.M2.T1.S1 (parity suite); S2 need only spot-check.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Deterministic hook ordering (PRD §7.14.3):
#   - onToolStart ALWAYS precedes onToolEnd for the same toolCallId (Pi emits start before end;
#     both go through the same sync listener in arrival order).
#   - In streaming mode, hooks ALWAYS precede their StreamEvent counterparts (fireHookEvents is
#     called before enqueue).
#   - onStream chunks are emitted in arrival order, never duplicated (snapshot-diff guards on
#     text.length > streamText.value.length).
#   (Covered by the STREAMING ordering case in pi-harness-hooks.test.ts Task 3.)

# Fire-and-track contract (Decision 6):
#   - An async hook (returns a Promise) does NOT block the listener or reorder events. The execute()
#     Promise resolves after session.prompt() (which fires events synchronously); async hooks settle
#     asynchronously. Tests use sync vi.fn() hooks for deterministic assertions.

# No-leak contract:
#   - ctx.toolStarts entries are deleted on tool_execution_end (GOTCHA #13). A runaway tool that
#     never ends would leak one Map entry per orphaned start — acceptable (bounded by tool count per
#     turn; cleared when ctx goes out of scope at execute() return).

# (No performance/security/load gates required for this item — it's a pure hook-dispatch adapter.)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (pi-harness.ts compiles; no transitive imports; no cycle).
- [ ] `npm test` exits 0 (new hooks suite + edited streaming suite + execute suite + full regression).
- [ ] `npm run build` exits 0 (dist emits fireHookEvents + HookDispatchContext).
- [ ] No forbidden transitive imports (grep clean for `@earendil-works/pi-ai` / `pi-agent-core`).
- [ ] The "No tool/stream hooks wired (S2 boundary)" test is GONE from pi-harness-streaming.test.ts.

### Feature Validation

- [ ] `onToolStart({name, input})` fires on `tool_execution_start` in BOTH paths.
- [ ] `onToolEnd(req, {content, isError}, duration)` fires on `tool_execution_end` in BOTH paths;
      `req` reconstructed from stashed start; `isError` is the REAL value; `duration >= 0`.
- [ ] `onStream(chunk)` fires per `message_update` (assistant) via snapshot-diff.
- [ ] `onSessionStart`/`onSessionEnd` STILL fire (regression — unchanged by S2).
- [ ] No hooks arg → no throw; individually-optional hooks → no throw.
- [ ] Streaming ordering: hooks precede their StreamEvent counterparts.
- [ ] Drain loop, StreamEvent mapping, customTools wiring, session hook cases all UNCHANGED.

### Code Quality Validation

- [ ] Follows existing patterns (`void hooks?.x?.()` fire-and-track; structural casts; mirror S1 listener style).
- [ ] File placement matches the desired codebase tree.
- [ ] Anti-patterns avoided (no transitive imports, no drain-loop edits, no awaiting in the sync listener,
      no session-hook duplication, no throw on missing hooks).
- [ ] `ctx.toolStarts` entries deleted after read (no leak on duplicate end events).
- [ ] Comments document: scope boundary (session hooks inline), Pi fidelity advantage, fire-and-track
      contract, independent streamText rationale.

### Documentation & Deployment

- [ ] `execute()` JSDoc updated (all hooks now fire; tool/stream via fireHookEvents).
- [ ] No new environment variables or config.
- [ ] Code is self-documenting (the PRD §7.11 mapping table in fireHookEvents JSDoc).

---

## Anti-Patterns to Avoid

- ❌ Don't edit the drain loop (L410-495) or the session_start/session_shutdown cases — S1/P2.M2.T2.S1
  own them; S2 is purely additive. (Decision 1, GOTCHA #5.)
- ❌ Don't `await` a hook inside the listener — it's SYNCHRONOUS; use `void hooks.x?.(...)`. (Decision 6.)
- ❌ Don't import `ToolExecutionStartEvent`/`ToolExecutionEndEvent`/`MessageUpdateEvent` from
  `@earendil-works/pi-ai` — non-hoisted transitive (`MODULE_NOT_FOUND`). Cast structurally. (GOTCHA #8.)
- ❌ Don't read `args` from the `tool_execution_end` event — it's absent; reconstruct from the stashed
  start (`ctx.toolStarts`). (Decision 3.)
- ❌ Don't hardcode `duration: 0` or `isError: false` on `onToolEnd` — that forfeits the Pi fidelity
  advantage (claude-code's limitation, not Pi's). (Decisions 2, 4.)
- ❌ Don't merge `ctx.streamText` with the drain loop's `fullText` — that forces a drain-loop edit
  (merge conflict with S1). Keep them independent. (Decision 5.)
- ❌ Don't handle `onSessionStart`/`onSessionEnd` in `fireHookEvents` — they're inline in the listeners
  already; duplicating them would double-fire. (Scope boundary.)
- ❌ Don't forget to remove the S2-boundary negative test from `pi-harness-streaming.test.ts` — it will
  FAIL once S2 lands. (Decision 7.)
- ❌ Don't throw when `hooks` is undefined — `fireHookEvents` must early-return (cheap no-op). (GOTCHA #10.)
- ❌ Don't create new patterns when existing ones work — mirror S1's `void hooks?.onSessionStart?.()`
  fire-and-track style + S1's structural-cast idiom.
