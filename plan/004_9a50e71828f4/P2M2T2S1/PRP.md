# PRP — P2.M2.T2.S1: `createAgentSession` + `prompt` + result aggregation → `AgentResponse`

**PRD reference:** §7.1 (`pi` harness — `@earendil-works/pi-coding-agent`), §7.3 (`Harness.execute<T>`
→ `Promise<AgentResponse<T>>` non-streaming path), §7.8 (model string → `resolveModel`), §7.10
(`toolExecutor` delegated back to MCPHandler), §7.11 (Hook Adaptation — `onSessionStart`←`session_start`,
`onSessionEnd`←`session_shutdown`), §7.14.4 (identical `AgentResponse<T>` shape from both harnesses).
**Plan:** `plan/004_9a50e71828f4/` — S1 of P2.M2.T2 ("PiHarness session lifecycle"). Consumes the
parallel S2 (P2.M2.T1.S2) outputs: `PiHarness.initialize/terminate`, the four private fields
(`sdk`, `authStorage`, `modelRegistry`, `options`), and `resolveModel(spec)`. **Unblocks** P2.M3.T1
(tool execution delegation — wires `customTools`), P2.M3.T2.S1/S2 (streaming + remaining hooks),
P3.M1 (Agent executePrompt).
**Scope tag:** REPLACE the throwing `execute()` stub in `src/harnesses/pi-harness.ts` with the
**non-streaming** path that creates a Pi `AgentSession` via `createAgentSession`, subscribes a
closure-capture listener that aggregates the terminal assistant text + token usage + tool-call
count from `turn_end`/`agent_end` events and fires `onSessionStart`/`onSessionEnd` hooks, awaits
`session.prompt()`, and returns `createSuccessResponse`/`createErrorResponse`. ADD 1 new test
file. MODIFY 1 existing S1 test file (remove the now-obsolete execute-stub assertion). **No edits
to barrels, registry, `registerMCPs`/`loadSkills` stubs, streaming generator, types, or any other
source.**

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Six load-bearing, non-obvious details:
> (1) **Pi does NOT return the answer from `prompt()`** — `session.prompt(text): Promise<void>`.
> The terminal assistant text + token usage + tool-call count must be **aggregated from the event
> stream** via `session.subscribe(listener)` (`turn_end`/`agent_end` events). See
> `research/event-aggregation-contract.md`. (2) **Do NOT static-import `AgentMessage`/`AssistantMessage`/
> `Usage`/`TextContent`** — they live in the NON-hoisted transitive deps `@earendil-works/pi-agent-core` /
> `pi-ai` (the SAME `ERR_PACKAGE_PATH_NOT_EXPORTED` S2 proved for `getModel`). Cast the event
> structurally inside the listener (like ClaudeCodeHarness casts `SDKResultMessage`). Only import
> `createAgentSession` (value) + the re-exported `AgentSession`/event TYPES from the top-level
> pi-coding-agent package. (3) **Streaming path throws** citing P2.M3.T2.S1 — T2 implements ONLY
> the non-streaming `Promise<AgentResponse<T>>` path. (4) **`customTools: []`** (empty) — Groundswell
> tool definitions are wired in P2.M3.T1; `toolExecutor` is accepted but a no-op in T2. (5) **Wire
> ONLY `onSessionStart`/`onSessionEnd`** hooks (SessionStart/SessionShutdown events) — the contract
> explicitly scopes these here; `onToolStart`/`onToolEnd`/`onStream` are P2.M3.T2.S2. (6) **S1's
> `pi-harness.test.ts` "execute() should throw citing P2.M2.T2.S1" assertion is OBSOLETE** once
> execute is implemented — remove that ONE `it(...)` case; keep `registerMCPs`/`loadSkills` throw
> assertions intact.

---

## Goal

**Feature Goal:** Give `PiHarness` a working **non-streaming `execute<T>()`**: create a Pi
`AgentSession` (via `createAgentSession`), drive one prompt through `session.prompt()`, aggregate
the terminal assistant text + token usage + tool-call count from the event stream, fire the
session lifecycle hooks, and return a PRD-§6/§7.14.4-conformant `AgentResponse<T>`. After S1, a
caller can `await harness.execute({ prompt, options }, toolExecutor)` on an initialized
`PiHarness` and get back a typed `AgentResponse` identical in shape to `ClaudeCodeHarness`'s —
the first end-to-end "prompt in, AgentResponse out" path on the default harness.

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`** — replace the throwing `execute()` stub with a real
   non-streaming implementation (IIFE returning `Promise<AgentResponse<T>>`):
   - guard uninitialized state (`if (!this.sdk || !this.modelRegistry || !this.authStorage)`);
   - throw synchronously citing `P2.M3.T2.S1` when `request.options.streaming === true`;
   - `normalizeModel` + `resolveModel` → `Model<Api>`;
   - `createAgentSession({ model, modelRegistry, authStorage, customTools: [] })`;
   - `session.subscribe(listener)` capturing `lastAssistantText` / `totalInput` / `totalOutput` /
     `toolCallCount` from `turn_end` events (and firing `onSessionStart`/`onSessionEnd` from
     `session_start`/`session_shutdown`);
   - `try { await session.prompt(request.prompt) } finally { unsubscribe() }`;
   - on success → `createSuccessResponse(lastAssistantText as unknown as T, { agentId: this.id,
     timestamp: Date.now(), duration, usage: { input_tokens: totalInput, output_tokens: totalOutput },
     toolCalls: toolCallCount })`;
   - on `prompt()` rejection → `createErrorResponse(AGENT_ERROR_CODES.EXECUTION_FAILED, …)`.
2. **MODIFY `src/__tests__/unit/providers/pi-harness.test.ts`** — REMOVE the single `it('execute()
   should throw citing P2.M2.T2.S1', …)` case (now obsolete); KEEP the `registerMCPs` and
   `loadSkills` throw assertions (still stubs).
3. **NEW `src/__tests__/unit/providers/pi-harness-execute.test.ts`** — real `initialize()` +
   private-field overwrite of `sdk.createAgentSession` with a fake session emitting scripted
   events (the Pi analogue of `claude-code-harness-execute.test.ts`'s `sdk.query` mock). Covers:
   success aggregation (text + usage + toolCalls + metadata), last-turn-wins, usage accumulation,
   tool-call counting, session hooks, error path, uninitialized guard, streaming-throws branch.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles; the structural event casts
   are sound; no forbidden transitive-dep import; no import cycle.
2. `npm test` exits 0 — the new execute suite + the (edited) S1 structure suite + S2's initialize/
   resolvemodel/normalizemodel suites + full regression all green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted with the real execute.
4. Runtime spot-check (tsx): an initialized `PiHarness` whose `createAgentSession` is monkey-patched
   to a fake session returns an `AgentResponse` with `status:'success'`, `data` = the scripted
   assistant text, correct `usage`/`toolCalls`, and fires `onSessionStart`/`onSessionEnd`.
5. Contract (grep): `createAgentSession(`, `session.subscribe(`, `session.prompt(`,
   `createSuccessResponse(`, `createErrorResponse(`, `turn_end`, `session_start`, `session_shutdown`;
   NO `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core` import; `registerMCPs`/`loadSkills`
   still throw citing their downstream subtasks.

---

## ⚠️ SCOPE DECISIONS — six load-bearing details

### Decision 1 — Pi does NOT return the answer from `prompt()`; aggregate from the event stream

`session.prompt(text, options?): Promise<void>` resolves with **nothing** (`external_deps.md` §1.2).
The terminal assistant text, token usage, and tool-call count are surfaced **only** through the
event stream emitted via `session.subscribe(listener)`. The contract confirms this: *"collects the
final assistant message text + token usage + tool-call count from TurnEnd/AgentEnd events."*
➡️ T2's `execute` subscribes a closure-capture listener (updated synchronously as events fire),
then `await session.prompt()`, then builds the `AgentResponse` from the captured values. Because
pi-agent-core guarantees `isStreaming` "remains true until awaited `agent_end` listeners settle",
**all events have fired before `prompt()` resolves** — no async races. See
`research/event-aggregation-contract.md` §1/§3 for the verified event/field shapes.

### Decision 2 — Do NOT static-import `AgentMessage`/`AssistantMessage`/`Usage`/`TextContent`

These types live in `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai`, both **NON-hoisted
transitive deps** nested under `pi-coding-agent/node_modules/` — the identical
`ERR_PACKAGE_PATH_NOT_EXPORTED` S2's `research/model-resolution-path.md` proved for `getModel`.
➡️ Inside the listener, treat the event as a structural cast: `(event as { type: string; message?:
any })` and `(msg.content as Array<{type:string; text?:string}>|undefined)` — exactly how
ClaudeCodeHarness casts `SDKResultMessage`. The only imports T2 needs are the **value**
`createAgentSession` (re-exported by pi-coding-agent, `dist/index.d.ts` L16) and the **re-exported
TYPE** aliases `AgentSession` / `AgentSessionEvent` / `AgentSessionEventListener` (pi-coding-agent
`dist/index.d.ts` L3) — these ARE re-exported from the top-level package, so no transitive import.
This keeps `npm run lint` green and the implementation free of `ERR_PACKAGE_PATH_NOT_EXPORTED`.

### Decision 3 — Streaming path throws citing P2.M3.T2.S1 (T2 = non-streaming ONLY)

The contract Output says: *"PiHarness.execute non-streaming path returns AgentResponse<T>;
unblocks streaming/hooks/skills (P2.M3.T2)"*. The streaming `AsyncGenerator<StreamEvent, …>` return
is owned by **P2.M3.T2.S1** ("StreamEvent mapping from Pi session events"). ➡️ T2's `execute`
checks `if (request.options.streaming) throw new Error("… P2.M3.T2.S1 …")` **synchronously before
the IIFE** (so the throw is immediate, not a rejected promise — matching the S1 stub idiom and
keeping the interface's `| AsyncGenerator` branch honest). The non-streaming path is the IIFE
returning `Promise<AgentResponse<T>>`.

### Decision 4 — `customTools: []`; `toolExecutor` is a no-op in T2

`createAgentSession` accepts `customTools: ToolDefinition[]` (`external_deps.md` §1.4). Mapping
Groundswell's `toolExecutor` onto `ToolDefinition[]` (JSON-Schema → TypeBox bridge) is owned by
**P2.M3.T1 / P2.M4**. The contract reflects this: *"createAgentSession({model, customTools(see
P2.M3.T1), …})"*. ➡️ T2 passes `customTools: []` (empty — no Groundswell tools wired yet) and
accepts the `toolExecutor` parameter without using it (its first real call site is P2.M3.T1). This
keeps the session's model loop functional (it can still produce text answers) without pulling tool
mapping into T2's scope. `toolExecutor` is intentionally unused — prefix `_toolExecutor` is NOT done
(to preserve the interface signature); instead reference it so the linter sees it consumed, OR rely
on the interface signature (no-unused-args is off for interface params — verify with `npm run lint`).

### Decision 5 — Wire ONLY `onSessionStart`/`onSessionEnd` (the contract's explicit scope)

The contract: *"fires hooks (onSessionStart/onSessionEnd via SessionStart/SessionShutdown events)"*.
The remaining hooks (`onToolStart`←`tool_execution_start`, `onToolEnd`←`tool_execution_end`,
`onStream`←`message_update`) are **P2.M3.T2.S2** ("HarnessHookEvents adaptation"). ➡️ T2's listener
fires `hooks?.onSessionStart?.()` on `session_start` and `hooks?.onSessionEnd?.(Date.now() -
startTime)` on `session_shutdown` — and nothing else for hooks. (PRD §7.11's hook-mapping table
ratifies these two source events.)

### Decision 6 — S1's `pi-harness.test.ts` execute-stub assertion is OBSOLETE; remove it

`src/__tests__/unit/providers/pi-harness.test.ts` (P2.M2.T1.S1) asserts, in its "stub methods throw
with downstream subtask references" block: `it('execute() should throw citing P2.M2.T2.S1', …)`.
Once T2 implements `execute()`, this assertion FAILS (execute returns a Promise, it does not throw).
➡️ T2 **removes that single `it(...)` case**. The sibling `registerMCPs` (cites P2.M4.T1.S2) and
`loadSkills` (cites P2.M3.T2.S3) assertions STAY — those stubs remain unchanged. Confirmed by grep:
only `pi-harness.test.ts` references execute-throws; `pi-harness-initialize.test.ts` and
`pi-harness-normalizemodel.test.ts` do not. (The full execute behaviour is covered by the NEW
`pi-harness-execute.test.ts`.)

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents:
- **P2.M3.T1 (tool delegation)** — extends `execute`'s `customTools: []` into a real
  `ToolDefinition[]` bridge that calls `toolExecutor`; reuses T2's subscribe/aggregation plumbing.
- **P2.M3.T2.S1/S2 (streaming + hooks)** — adds the `AsyncGenerator<StreamEvent>` path and the
  `onToolStart`/`onToolEnd`/`onStream` hook wiring on top of T2's session lifecycle.
- **P3.M1 (Agent)** — calls `registry.get('pi').execute(req, toolExecutor, hooks)` and gets a typed
  `AgentResponse` identical in shape to the `claude-code` path.

**Use Case:** PRD §7.1 — `pi` is the **default**, vendor-neutral harness. S2 gave it a lifecycle +
model resolution; T2 gives it the ability to actually **run a prompt and return a structured
response**, which is the minimum viable vertical slice that makes `pi` usable end-to-end.

**Pain Points Addressed:** Until T2, `PiHarness.execute()` throws on every call — no prompt can run
on the default harness. T2 removes that blocker for the non-streaming case.

---

## Why

- **Realizes PRD §7.3 + §7.14.4** — `execute<T>()` returns `AgentResponse<T>` with the SAME shape
  as `ClaudeCodeHarness.execute` (byte-for-byte: `{status, data, error, metadata:{agentId,
  timestamp, duration, usage, toolCalls}}`), fulfilling cross-harness parity.
- **Unblocks P2.M3** — tool delegation (T1), streaming + remaining hooks (T2), and skills (T3) all
  build on the `createAgentSession`/`subscribe`/`prompt` skeleton T2 establishes.
- **Correctly adapts an event-driven SDK** to Groundswell's request/response contract — the
  aggregation listener is the load-bearing mechanism (Decision 1), proven in the research note.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — real non-streaming `execute<T>()`.
2. **MODIFY** `src/__tests__/unit/providers/pi-harness.test.ts` — remove the obsolete execute-stub `it(...)`.
3. **CREATE** `src/__tests__/unit/providers/pi-harness-execute.test.ts` — fake-session scripted-event suite.
4. **VALIDATE** (lint / targeted tests / full suite / build / grep + runtime spot-check).

### Success Criteria

- [ ] `execute({prompt, options:{}})` (non-streaming) on an **initialized** harness returns a
      `Promise<AgentResponse<T>>`; on success `status==='success'`, `data` = the terminal assistant
      text, `error===null`, `metadata.agentId==='pi'`, `metadata.duration>=0`,
      `metadata.usage={input_tokens,output_tokens}` (summed across turns), `metadata.toolCalls` =
      count of `toolCall` content blocks.
- [ ] Aggregation uses `turn_end` for text (**last turn wins**), usage (accumulated), and tool-call
      count (incremental); `session_start`→`onSessionStart`; `session_shutdown`→`onSessionEnd(duration)`.
- [ ] `execute()` on an **uninitialized** harness throws `/not initialized/i` (rejected promise).
- [ ] `execute({…, options:{ streaming:true }})` **throws synchronously** citing `P2.M3.T2.S1`.
- [ ] If `session.prompt()` rejects, execute returns `createErrorResponse(EXECUTION_FAILED, …)`
      with `recoverable: true`.
- [ ] `registerMCPs`/`loadSkills` **still throw** citing P2.M4.T1.S2 / P2.M3.T2.S3 (unchanged).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; S2's suites + the edited S1 suite pass.
- [ ] No import of `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core` (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement T2 using only
(a) this PRP, (b) read-only access to `src/harnesses/pi-harness.ts` (the S1+S2 file T2 modifies),
`src/harnesses/claude-code-harness.ts` (the execute IIFE + createSuccessResponse/createErrorResponse
pattern to mirror, ~L360-640), `src/types/agent.ts` (AgentResponse + factories + AGENT_ERROR_CODES),
`src/types/harnesses.ts` (execute signature + HarnessHookEvents + HarnessRequest), `src/types/streaming.ts`
(StreamEvent), `src/__tests__/unit/providers/claude-code-harness-execute.test.ts` (the fake-session
mock idiom), and (c) the copy-paste-ready snippets below + the two `research/*.md` notes. The six
non-obvious load-bearing details (event-aggregation, no-transitive-import, streaming-throws,
customTools-empty, session-hooks-only, S1-test-removal) are proven in the research notes.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness system).
- url: PRD.md §7.3, §7.10, §7.11, §7.14.4   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.3 = execute<T> signature + return union; §7.10 = toolExecutor delegation (T2 accepts, doesn't wire);
       §7.11 = Hook Adaptation table (onSessionStart←session_start, onSessionEnd←session_shutdown);
       §7.14.4 = identical AgentResponse<T> shape across harnesses (the parity bar).
  critical: §7.11 is WHY only onSessionStart/onSessionEnd are wired in T2 (Decision 5).

# MUST READ — the verified Pi SDK surface + the event stream contract.
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.1 = createAgentSession (async factory, CreateAgentSessionOptions incl. customTools/modelRegistry/
       authStorage); §1.2 = AgentSession.subscribe(listener)→unsubscribe + prompt(text)→Promise<void>;
       §1.6 = events list (TurnEndEvent, AgentEndEvent, SessionStartEvent, SessionShutdownEvent);
       §1.8 gotchas (createAgentSession async; result/usage via events; setModel throws on no auth).
  critical: §1.2 confirms prompt() resolves void — aggregation is MANDATORY (Decision 1).

# MUST READ — the aggregation algorithm + verified event/field shapes (THE load-bearing reference).
- file: plan/004_9a50e71828f4/P2M2T2S1/research/event-aggregation-contract.md
  why: §1 = the session lifecycle seams + why prompt() resolution implies all events fired; §2 = verified
       TurnEndEvent/AgentEndEvent/SessionStartEvent/SessionShutdownEvent + AssistantMessage.content
       (TextContent/ToolCall) + Usage shapes read from the installed .d.ts; §3 = the aggregation table
       (which event updates which captured var + which hook fires); §4 = completion vs error signals;
       §5 = scope boundary; §6 = parity with ClaudeCodeHarness.execute.
  critical: §2's "type-import gotcha" (AgentMessage etc. are non-importable transitive types — Decision 2)
            and §3's "last turn wins" / accumulate-usage / count-toolCalls algorithm.

# MUST READ — the fake-session test mock pattern + the S1-test-removal instruction.
- file: plan/004_9a50e71828f4/P2M2T2S1/research/test-mock-pattern.md
  why: §2 = makeFakeSession(events) factory (subscribe captures listener; prompt replays events); §3 = how
       to overwrite the private sdk.createAgentSession after a REAL initialize(); §4 = scripted event
       payloads (verified shapes); §5 = assertion matrix → test cases; §7 = the S1 execute-stub assertion
       to remove (Decision 6).
  critical: §3's private-field-overwrite (not vi.mock) idiom + §7's exact it(...) to delete.

# MUST READ — the sibling harness execute() to mirror (the parity reference).
- file: src/harnesses/claude-code-harness.ts
  why: L36-46 = the execute() method JSDoc + signature (non-streaming IIFE | streaming generator);
       ~L380-400 = the `if (request.options.streaming) return this.executeStreaming(...)` branch +
       the `(async (): Promise<AgentResponse<T>> => { … })()` IIFE; ~L400-410 = the
       `if (!this.sdk) throw new Error("… not initialized …")` guard + startTime; ~L570-625 = the
       success/error response construction (createSuccessResponse with full metadata; createErrorResponse
       with default metadata — the parity behaviour T2 matches); L83-101 = ConfigError (NOT needed by T2
       — resolveModel already uses it; T2 only needs AGENT_ERROR_CODES.EXECUTION_FAILED).
  pattern: copy the IIFE structure, the startTime/duration tracking, the metadata shape, and the
           createSuccessResponse/createErrorResponse usage. Swap Claude's `for await (msg of query)`
           loop for Pi's `subscribe`-closure + `await session.prompt()`.

# MUST READ — the file T2 modifies (the S1+S2 PiHarness) + its contract.
- file: src/harnesses/pi-harness.ts
  why: Already ships (S1+S2): id/capabilities/normalizeModel/supports/requiresFeatures; the 4 private
       fields (sdk/authStorage/modelRegistry/options); real initialize/terminate; resolveModel(spec);
       the THROWING execute/registerMCPs/loadSkills stubs. T2 REPLACES the execute stub; leaves the
       others. resolveModel + normalizeModel + the private fields are CONSUMED as-is.
  gotcha: execute's current stub throws citing P2.M2.T2.S1 — T2 replaces the WHOLE method body.

# MUST READ — AgentResponse + factories + error codes (the response contract).
- file: src/types/agent.ts
  why: createSuccessResponse<T>(data, metadata) → {status:'success',data,error:null,metadata};
       createErrorResponse(code, message, details?, recoverable=false) → {status:'error',data:null,
       error:{code,message,details,recoverable},metadata:{agentId:'unknown',timestamp}}; AGENT_ERROR_CODES
       .EXECUTION_FAILED; AgentResponseMetadata { agentId, timestamp, duration?, usage?: TokenUsage,
       toolCalls? }; TokenUsage { input_tokens, output_tokens } (src/types/sdk-primitives.ts).
  pattern: success → createSuccessResponse(text, {agentId:this.id, timestamp:Date.now(), duration,
           usage:{input_tokens,totalOutput?}, toolCalls}). error → createErrorResponse(EXECUTION_FAILED,
           msg, {errorMessage, …}, true). Match ClaudeCodeHarness's error-metadata behaviour (agentId
           'unknown' via the factory) for parity.

# MUST READ — execute signature + HarnessHookEvents + HarnessRequest + HarnessExecutionOptions.
- file: src/types/harnesses.ts
  why: execute<T>(request, toolExecutor, hooks?): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent,…>;
       HarnessRequest { prompt: string; options: HarnessExecutionOptions }; HarnessExecutionOptions
       { model?, systemPrompt?, tools?, hooks?, sessionId?, streaming? }; HarnessHookEvents
       { onToolStart?, onToolEnd?, onSessionStart?, onSessionEnd?, onStream? }; ToolExecutionRequest/
       Result. Streaming branch keyed on `request.options.streaming`.
  gotcha: the return type is a UNION — T2's outer execute is NOT `async` (it returns the IIFE promise
          OR throws for streaming), mirroring ClaudeCodeHarness.

# SHOULD READ — the execute test to mirror (fake generator → fake session).
- file: src/__tests__/unit/providers/claude-code-harness-execute.test.ts
  why: The idiom for mocking the SDK after a real initialize(): `provider.sdk = { query: vi.fn()… }`
       via `@ts-expect-error` private-field access; assertion patterns for status/data/usage/toolCalls/
       metadata/agentId; the streaming-mode + uninitialized-guard test structure. T2's fake session is
       the Pi analogue (subscribe/prompt instead of an async generator).
  pattern: copy the beforeEach(reset registry + clear mocks + real initialize), the private-field
           overwrite, and the describe/it layout. See research/test-mock-pattern.md §2-§5.

# SHOULD READ — the S1 structure test T2 edits (the obsolete assertion to remove).
- file: src/__tests__/unit/providers/pi-harness.test.ts
  why: Contains `describe('stub methods throw with downstream subtask references')` with three `it(...)`
       cases: execute (cites P2.M2.T2.S1 — REMOVE), registerMCPs (cites P2.M4.T1.S2 — KEEP), loadSkills
       (cites P2.M3.T2.S3 — KEEP). Decision 6.
  pattern: delete ONLY the execute `it(...)` block; leave the describe + the other two cases intact.
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (execute IIFE + createSuccessResponse/createErrorResponse + ConfigError)
├── harness-registry.ts      # CONSUMER (reset helpers used by tests: _resetForTesting / _resetInitStateForTesting)
├── index.ts                 # UNTOUCHED (barrel)
├── pi-harness.ts            # ← MODIFY (replace execute stub; consume S2's resolveModel + private fields)
└── session-store.ts         # untouched
src/types/
├── agent.ts                 # CONSUMER (AgentResponse, createSuccessResponse, createErrorResponse, AGENT_ERROR_CODES)
├── harnesses.ts             # CONSUMER (execute signature, HarnessHookEvents, HarnessRequest, HarnessExecutionOptions)
├── sdk-primitives.ts        # CONSUMER (TokenUsage { input_tokens, output_tokens })
└── streaming.ts             # CONSUMER (StreamEvent — referenced by the execute return union type only)
src/__tests__/unit/providers/
├── claude-code-harness-execute.test.ts        # REFERENCE (fake-SDK mock idiom + assertion patterns)
├── pi-harness.test.ts                         # ← MODIFY (remove the obsolete execute-throws it(...))
├── pi-harness-initialize.test.ts              # (S2) — must still pass (does NOT reference execute)
├── pi-harness-normalizemodel.test.ts          # (S1/S2) — must still pass
└── pi-harness-execute.test.ts                 # ← NEW
node_modules/@earendil-works/pi-coding-agent/   # INSTALLED (S1) — re-exports createAgentSession + AgentSession + event TYPES
  └── node_modules/@earendil-works/{pi-agent-core,pi-ai}/  # NON-HOISTED transitive — DO NOT IMPORT (Decision 2)
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                            # MODIFY (real non-streaming execute<T>)
src/__tests__/unit/providers/pi-harness.test.ts        # MODIFY (remove obsolete execute-stub it(...))
src/__tests__/unit/providers/pi-harness-execute.test.ts # NEW
# (barrels, registry, registerMCPs/loadSkills stubs, streaming generator, types, other harnesses — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — Pi's prompt() resolves VOID. The terminal assistant text + usage + tool-call count
//   are ONLY available via the event stream (session.subscribe). T2 MUST aggregate from turn_end/
//   agent_end events — there is no return value to read from prompt(). (Decision 1;
//   research/event-aggregation-contract.md §1.)

// CRITICAL #2 — Do NOT import AgentMessage/AssistantMessage/Usage/TextContent from
//   @earendil-works/pi-agent-core or @earendil-works/pi-ai. They are NON-HOISTED transitive deps
//   (nested under pi-coding-agent/node_modules) — import triggers ERR_PACKAGE_PATH_NOT_EXPORTED
//   (the same wall S2 proved for getModel). Cast the event structurally inside the listener:
//   `const msg = (event as { message?: { role?: string; content?: any[]; usage?: any } }).message;`
//   Only `createAgentSession` (value) + the re-exported `AgentSession`/`AgentSessionEvent` TYPE
//   aliases from the TOP-LEVEL `@earendil-works/pi-coding-agent` are safe to import. (Decision 2.)

// CRITICAL #3 — Streaming path throws synchronously citing P2.M3.T2.S1. T2 implements ONLY the
//   non-streaming Promise<AgentResponse<T>> path. Check `request.options.streaming` BEFORE the IIFE
//   and throw immediately (not a rejected promise). (Decision 3.)

// CRITICAL #4 — customTools: []. Do NOT wire toolExecutor into ToolDefinitions in T2 — that is
//   P2.M3.T1/P2.M4. toolExecutor is accepted as a parameter (interface signature) but unused in T2.
//   If `npm run lint` flags the unused param, reference it trivially (e.g. a `void toolExecutor;`
//   is NOT needed — interface method params are not subject to no-unused-vars in this repo's tsc
//   config; verify by running lint). (Decision 4.)

// CRITICAL #5 — Wire ONLY onSessionStart/onSessionEnd. onToolStart/onToolEnd/onStream are P2.M3.T2.S2.
//   Fire onSessionStart on the `session_start` event; onSessionEnd(duration) on `session_shutdown`.
//   (Decision 5; PRD §7.11 table.)

// CRITICAL #6 — REMOVE the single `it('execute() should throw citing P2.M2.T2.S1', …)` from
//   src/__tests__/unit/providers/pi-harness.test.ts. It is obsolete once execute is implemented.
//   KEEP registerMCPs + loadSkills throw assertions. (Decision 6; research/test-mock-pattern.md §7.)

// GOTCHA #7 — isolatedModules: true (tsconfig.json). `import type { AgentSession, AgentSessionEvent,
//   AgentSessionEventListener } from "@earendil-works/pi-coding-agent"` (types only). `createAgentSession`
//   is a VALUE import. createSuccessResponse/createErrorResponse/AGENT_ERROR_CODES are VALUE imports
//   from "../types/agent.js". StreamEvent appears only in the return-type annotation (`import type`).

// GOTCHA #8 — The outer execute() is NOT declared `async`. It returns either a thrown Error (streaming
//   branch) or the IIFE's Promise<AgentResponse<T>>. This matches ClaudeCodeHarness's shape and the
//   interface's `Promise<AgentResponse<T>> | AsyncGenerator<…>` union. Declaring it `async` would wrap
//   the streaming throw in a rejected Promise (wrong) and is unnecessary.

// GOTCHA #9 — Unsubscribe in a `finally` so a prompt() rejection still detaches the listener (prevents
//   leaks/double-handling if the session is reused). Mirror: `try { await session.prompt(...) } finally
//   { unsubscribe(); }`. Capture startTime BEFORE createAgentSession so duration includes session setup.

// GOTCHA #10 — "last turn wins" for text: overwrite lastAssistantText on EVERY turn_end (the final
//   assistant message after all tool calls is the user-facing answer). Do NOT concatenate across turns.
//   Accumulate usage (input+output) across turns. Count toolCall blocks incrementally per turn_end.message.
//   (research/event-aggregation-contract.md §3.)

// GOTCHA #11 — createErrorResponse sets metadata.agentId='unknown' (no custom-metadata overload). This
//   MATCHES ClaudeCodeHarness's error path (parity, PRD §7.14.4) — do NOT hand-build an error response
//   with agentId:this.id; use the factory. Put duration/errorMessage in `details` if useful.

// GOTCHA #12 — Guard order in the IIFE: check uninitialized FIRST (throw /not initialized/i), THEN
//   resolve the model, THEN createAgentSession. resolveModel already throws ConfigError on a missing
//   model (S2) — let it propagate as a rejected promise (or catch + createErrorResponse? The contract
//   only mandates createErrorResponse for EXECUTION_FAILED from prompt(); a config/model error is a
//   CONFIG_ERROR — let resolveModel's ConfigError propagate as a rejected promise. Simpler + correct.)

// GOTCHA #13 — The fake-session test must call `await harness.initialize()` (REAL import) THEN overwrite
//   `harness['sdk'].createAgentSession` (private field, `@ts-expect-error`). Do NOT use vi.mock here
//   (S2 used vi.mock for resolveModel because it's registry-deterministic; execute needs the real
//   module object to stub one function). research/test-mock-pattern.md §3.

// GOTCHA #14 — registerMCPs/loadSkills MUST STILL THROW citing P2.M4.T1.S2 / P2.M3.T2.S3 — unchanged.
//   Do NOT implement them in T2. After removing the execute case, pi-harness.test.ts still asserts these
//   two throw — keep those stub bodies intact.

// GOTCHA #15 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   src/harnesses/pi-harness.ts (proving the structural casts + createAgentSession wiring compile + no
//   forbidden import + no cycle). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH.

// GOTCHA #16 — TokenUsage (src/types/sdk-primitives.ts) is { input_tokens: number; output_tokens: number }.
//   Pi's Usage is { input, output, cacheRead, cacheWrite, totalTokens, cost }. Map input→input_tokens,
//   output→output_tokens; drop the rest (TokenUsage has only the two fields). Do NOT try to add fields.
```

---

## Implementation Blueprint

### Data models and structure

No new exported types. T2 adds the `execute<T>()` method body (consuming S2's `resolveModel` +
private fields) and one private helper is OPTIONAL (an inline listener is fine — keep it inline
in the IIFE for locality, matching ClaudeCodeHarness's single-method execute). The only new
import surface:

```ts
// === src/harnesses/pi-harness.ts — the additions/changes vs S2 ===
// (S2 already imports: parseModelSpec, getGlobalHarnessConfig, AGENT_ERROR_CODES, ConfigError,
//  ModelRegistry, AuthStorage, and the type-only Harness/HarnessOptions/ModelSpec/etc.)
import {
  createAgentSession,                                   // VALUE — re-exported by pi-coding-agent (index.d.ts L16)
} from "@earendil-works/pi-coding-agent";
import type {
  AgentSession,                                        // TYPE — re-exported (index.d.ts L3)
  AgentSessionEvent,                                   // TYPE — re-exported (index.d.ts L3)
  AgentSessionEventListener,                           // TYPE — re-exported (index.d.ts L3)
} from "@earendil-works/pi-coding-agent";
// ADD to the existing agent.ts value imports (S1/S2 already import AGENT_ERROR_CODES):
import {
  createSuccessResponse,
  createErrorResponse,
  AGENT_ERROR_CODES,
} from "../types/agent.js";
// StreamEvent is already `import type`-ed in S1's skeleton (the execute return union references it).
```

> **No `AgentMessage`/`AssistantMessage`/`Usage`/`TextContent` import.** The listener casts the
> event structurally (Decision 2 / CRITICAL #2).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -n "resolveModel\|private sdk\|private modelRegistry\|private authStorage" src/harnesses/pi-harness.ts`
        → 4+ hits (S2 prereq). (If absent, S2 hasn't landed — STOP; T2 consumes S2's fields + resolveModel.)
  - RUN: `grep -n "createSuccessResponse\|createErrorResponse\|EXECUTION_FAILED" src/types/agent.ts` → hits.
  - RUN: `grep -n "export.*createAgentSession\|export.*AgentSession\b\|AgentSessionEvent" node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts` → hits (re-exports confirmed).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN. If red from a parallel task, surface it.
  - RUN: `grep -rn "P2.M2.T2.S1" src/__tests__/unit/providers/pi-harness.test.ts` → 1 hit (the obsolete assertion to remove).

Task 1: MODIFY src/harnesses/pi-harness.ts (replace execute stub + add imports)
  - ADD the imports above (createAgentSession value; AgentSession/AgentSessionEvent/AgentSessionEventListener
    type; createSuccessResponse/createErrorResponse — AGENT_ERROR_CODES likely already imported by S2).
  - REPLACE the throwing execute<T>() stub with the real non-streaming body from "Implementation
    Patterns & Key Details" below:
      * streaming branch → throw synchronously citing P2.M3.T2.S1 (BEFORE the IIFE).
      * IIFE: uninitialized guard → normalizeModel+resolveModel → createAgentSession({model,
        modelRegistry, authStorage, customTools:[]}) → subscribe(listener) capturing text/usage/
        toolCalls + firing onSessionStart/onSessionEnd → try/finally await session.prompt →
        createSuccessResponse / catch createErrorResponse(EXECUTION_FAILED).
      * LEAVE registerMCPs/loadSkills stubs UNCHANGED (GOTCHA #14).
  - VERIFY (grep): `grep -n "createAgentSession(\|session.subscribe(\|session.prompt(\|createSuccessResponse(\|createErrorResponse(\|turn_end\|session_start\|session_shutdown\|P2.M3.T2.S1" src/harnesses/pi-harness.ts` → 8+ hits.
  - VERIFY (NO forbidden transitive import): `! grep -n "@earendil-works/pi-ai\|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts` → exit 1 (no match).

Task 2: MODIFY src/__tests__/unit/providers/pi-harness.test.ts (remove obsolete assertion)
  - In `describe('stub methods throw with downstream subtask references', …)`, DELETE the single
    `it('execute() should throw citing P2.M2.T2.S1', () => { … })` block (the whole it(...) call).
  - KEEP the `registerMCPs` (cites P2.M4.T1.S2) and `loadSkills` (cites P2.M3.T2.S3) `it(...)` cases.
  - VERIFY: `grep -n "P2.M2.T2.S1" src/__tests__/unit/providers/pi-harness.test.ts` → 0 hits (removed);
            `grep -n "P2.M4.T1.S2\|P2.M3.T2.S3" src/__tests__/unit/providers/pi-harness.test.ts` → 2 hits (kept).

Task 3: CREATE src/__tests__/unit/providers/pi-harness-execute.test.ts (fake-session scripted events)
  - STRUCTURE: import { describe, it, expect, beforeEach, vi } from 'vitest'; PiHarness; HarnessRegistry
    (for reset); AGENT_ERROR_CODES + isSuccess from '../../../types/agent.js'; type HarnessRequest +
    HarnessHookEvents from '../../../types/harnesses.js'. Copy makeFakeSession(events) from
    research/test-mock-pattern.md §2.
  - beforeEach: `new PiHarness()`; `await harness.initialize()`; reset HarnessRegistry
    (_resetForTesting + _resetInitStateForTesting, copy from harness-registry.test.ts / S1's pi-harness.test.ts).
  - HELPERS: a `wireFakeSession(events)` that does `// @ts-expect-error harness.sdk = { ...(harness as any).sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: makeFakeSession(events) }) };` and returns harness.
  - CASES (describe('PiHarness - execute() non-streaming')):
      Uninitialized guard:
        - new PiHarness() (no init) → execute({prompt,options:{}}, fn) → rejects /not initialized/i.
      Streaming branch throws:
        - after init, execute({prompt, options:{streaming:true}}, fn) → throws synchronously /P2.M3.T2.S1/.
      Success aggregation:
        - wireFakeSession([SESSION_START, TURN_END_TEXT, AGENT_END]) → response.status==='success';
          response.data==='Hello world'; response.error===null; response.metadata.agentId==='pi';
          response.metadata.duration>=0; response.metadata.usage.input_tokens===10;
          response.metadata.usage.output_tokens===5; response.metadata.toolCalls===0.
      Tool-call counting:
        - wireFakeSession([SESSION_START, TURN_END_TOOL, AGENT_END]) → toolCalls===1.
        - (optional) TURN_END_TOOL with 2 toolCall blocks → toolCalls===2.
      Last-turn-wins + usage accumulation:
        - wireFakeSession([TURN_END_TEXT(text:'First', usage in:10 out:5), TURN_END_TEXT(text:'Second',
          usage in:30 out:20), AGENT_END]) → data==='Second'; usage.input_tokens===40; usage.output_tokens===25.
      Session hooks:
        - hooks={onSessionStart:vi.fn(), onSessionEnd:vi.fn()}; wireFakeSession([SESSION_START,…,
          SESSION_SHUTDOWN]) → onSessionStart called once; onSessionEnd called once with a number (duration).
        - (optional) no session_shutdown event → onSessionEnd NOT called (documents Pi semantics).
      Error path:
        - makeFakeSession whose prompt rejects (new Error('boom')); wire it; execute → response.status==='error';
          response.error.code===AGENT_ERROR_CODES.EXECUTION_FAILED; response.error.recoverable===true;
          response.error.message contains 'boom'.
      createAgentSession called with model+registry+auth+empty customTools:
        - wireFakeSession([...]); await execute; assert createAgentSession.mock.calls[0][0] has
          model (truthy), modelRegistry (truthy), authStorage (truthy), customTools: [] (deepEqual []).
      prompt called with request.prompt:
        - execute({prompt:'hi', options:{}}, fn); assert fakeSession.prompt.mock.calls[0][0]==='hi'.
      Metadata timestamp:
        - before=Date.now(); response=await execute; after=Date.now(); response.metadata.timestamp in [before,after].
  - PLACEMENT: src/__tests__/unit/providers/.

Task 4: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check (a) a transitive type import slipped in (CRITICAL #2),
    (b) createAgentSession imported as `import type` (it's a VALUE), (c) execute declared `async`
    (GOTCHA #8 — it must NOT be), (d) the return type changed (must stay the interface union).
  - If pi-harness.test.ts fails on "execute should throw P2.M2.T2.S1": the obsolete case wasn't removed (Task 2).
```

### Implementation Patterns & Key Details

```ts
// === The full execute<T>() body (replaces S2's throwing stub) ===
execute<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  hooks?: HarnessHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  // STREAMING branch — owned by P2.M3.T2.S1. Throw synchronously (not a rejected promise).
  if (request.options.streaming) {
    throw new Error(
      "PiHarness streaming execute() not implemented — P2.M3.T2.S1 (StreamEvent mapping)",
    );
  }

  // NON-STREAMING branch — IIFE returning Promise<AgentResponse<T>> (mirrors ClaudeCodeHarness L380+).
  return (async (): Promise<AgentResponse<T>> => {
    // Uninitialized guard (mirror ClaudeCodeHarness's `if (!this.sdk) throw …`).
    if (!this.sdk || !this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }

    const startTime = Date.now();   // capture BEFORE createAgentSession (duration includes setup)

    // Model resolution (S2's resolveModel; S1/S2's normalizeModel).
    const modelSpec = this.normalizeModel(
      request.options.model ?? "claude-sonnet-4-20250514",
    );
    const model = this.resolveModel(modelSpec);   // throws ConfigError if absent (let it propagate)

    // Create the Pi session. customTools: [] — Groundswell tools wired in P2.M3.T1 (Decision 4).
    const { session } = await this.sdk.createAgentSession({
      model,
      modelRegistry: this.modelRegistry,
      authStorage: this.authStorage,
      customTools: [],
    });

    // Aggregation closure (Decision 1; research/event-aggregation-contract.md §3).
    let lastAssistantText = "";
    let totalInput = 0;
    let totalOutput = 0;
    let toolCallCount = 0;

    const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
      // Structural cast — AgentMessage/AssistantMessage are NON-importable transitive types (CRITICAL #2).
      const e = event as { type: string; message?: any; messages?: any[] };
      switch (e.type) {
        case "session_start":                       // PRD §7.11 → onSessionStart
          void hooks?.onSessionStart?.();
          break;
        case "session_shutdown":                    // PRD §7.11 → onSessionEnd(duration)
          void hooks?.onSessionEnd?.(Date.now() - startTime);
          break;
        case "turn_end": {
          const msg = e.message;
          if (msg && msg.role === "assistant" && Array.isArray(msg.content)) {
            // Text: last turn wins (GOTCHA #10).
            const text = msg.content
              .filter((b: any) => b?.type === "text")
              .map((b: any) => b.text ?? "")
              .join("");
            if (text) lastAssistantText = text;
            // Usage: accumulate across turns (input→input_tokens, output→output_tokens).
            if (msg.usage) {
              totalInput += msg.usage.input ?? 0;
              totalOutput += msg.usage.output ?? 0;
            }
            // Tool calls: count toolCall blocks in this turn's message (GOTCHA #10).
            for (const b of msg.content) {
              if (b?.type === "toolCall") toolCallCount++;
            }
          }
          break;
        }
        // agent_end is the terminal signal but turn_end already captured everything we need.
        // (We rely on `await session.prompt()` resolution as the completion signal — §1 of the research note.)
      }
    };

    const unsubscribe = session.subscribe(listener);

    try {
      await session.prompt(request.prompt);   // resolves when the turn/loop is processed; events already fired
    } catch (error) {
      // EXECUTION_FAILED path (contract §3; parity with ClaudeCodeHarness's createErrorResponse usage).
      return createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        `Pi agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          prompt: request.prompt,
          model: modelSpec.raw,
          ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
        },
        true,   // recoverable: assume transient (provider/network) — caller can retry
      ) as AgentResponse<T>;
    } finally {
      unsubscribe();   // GOTCHA #9: detach even on success to avoid leaks if the session is reused
    }

    const duration = Date.now() - startTime;
    return createSuccessResponse(lastAssistantText as unknown as T, {
      agentId: this.id,                 // 'pi'
      timestamp: Date.now(),
      duration,
      usage: { input_tokens: totalInput, output_tokens: totalOutput },
      toolCalls: toolCallCount,
    });
  })();
}
```

```ts
// === registerMCPs / loadSkills stay EXACTLY as S1/S2 left them (GOTCHA #14) ===
async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
  throw new Error("PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)");
}
async loadSkills(_skills: Skill[]): Promise<void> {
  throw new Error("PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)");
}
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : replace execute stub → real non-streaming body; add imports
    (createAgentSession value; AgentSession/AgentSessionEvent/AgentSessionEventListener type;
    createSuccessResponse/createErrorResponse value).

TESTS (MODIFY / NEW):
  - src/__tests__/unit/providers/pi-harness.test.ts          : REMOVE the execute-throws it(...) (Decision 6).
  - src/__tests__/unit/providers/pi-harness-execute.test.ts  : NEW (fake-session scripted events).

IMPORTS ADDED (to pi-harness.ts):
  - value: { createAgentSession } from "@earendil-works/pi-coding-agent"
  - type : { AgentSession, AgentSessionEvent, AgentSessionEventListener } from "@earendil-works/pi-coding-agent"
  - value: { createSuccessResponse, createErrorResponse } from "../types/agent.js"   (AGENT_ERROR_CODES already imported by S2)
  - (StreamEvent, HarnessRequest, HarnessHookEvents, ToolExecutionRequest, ToolExecutionResult, AgentResponse,
     ModelSpec — already `import type`-ed in S1's skeleton.)

CONSUMERS (kept green — NO source edits):
  - execute's first real consumer is P3.M1 (Agent.executePrompt). Until then, only tests call it.
  - HarnessRegistry.register/has/get UNCHANGED.

NOT IN SCOPE (do not touch — owned downstream):
  - Streaming execute path (AsyncGenerator<StreamEvent>)                    → P2.M3.T2.S1
  - onToolStart/onToolEnd/onStream hook wiring                              → P2.M3.T2.S2
  - customTools ToolDefinition[] mapping (toolExecutor → customTools)       → P2.M3.T1 + P2.M4.T1.S1/S2
  - Native agentskills.io skill loading (loadSkills body)                   → P2.M3.T2.S3
  - registerMCPs body                                                       → P2.M4.T1.S2
  - Agent harness rewire (registry.get('pi').execute)                       → P3.M1
  - Harness-surface public export                                           → P3.M3.T1.S1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates
> `src/harnesses/pi-harness.ts` compiles + the structural event casts + createAgentSession wiring are
> sound + NO forbidden transitive import + no import cycle). `npm test` = `vitest run` (esbuild
> transpile-only; new + edited + full suite). `npm run build` = `tsc` (emits `dist/`). No eslint/prettier.

### Level 1: Syntax & Type Check (run after Task 1)

```bash
npm run lint
# Expected: exit 0. An error naming pi-harness.ts =
#   (a) a transitive type slipped in: `import { AssistantMessage } from '@earendil-works/pi-ai'` →
#       ERR_PACKAGE_PATH_NOT_EXPORTED or unresolved. FIX: remove it; cast structurally (CRITICAL #2).
#   (b) createAgentSession imported as `import type` (it's a VALUE — called at runtime). FIX: value import.
#   (c) execute declared `async` (GOTCHA #8). FIX: drop `async`; return the IIFE promise.
#   (d) AgentSessionEvent/AgentSessionEventListener not re-exported by your installed version →
#       drop the type alias, type the listener as `(event: any) => void` (acceptable; the casts are structural).
#   (e) execute's return type narrowed (must stay the full interface union). FIX: keep the union annotation.
```

### Level 2: Unit Tests (run after Tasks 2–3)

```bash
# The NEW execute suite (fake-session aggregation + hooks + error + guards)
npm test -- src/__tests__/unit/providers/pi-harness-execute
# Expected: all pass. A failure on data/usage/toolCalls = the listener didn't capture from turn_end
#   (check the structural cast + the field names input/output vs input_tokens/output_tokens mapping).
# A failure on "streaming throws" = the streaming branch isn't checked before the IIFE.
# A failure on "uninitialized" = the guard isn't first in the IIFE.

# The EDITED S1 structure suite (must still pass after removing the execute-throws case)
npm test -- src/__tests__/unit/providers/pi-harness.test
# Expected: all pass EXCEPT none should fail. If "execute() should throw citing P2.M2.T2.S1" still
#   runs/fails → Task 2 didn't remove it. registerMCPs + loadSkills throw cases MUST still pass.

# S2's suites MUST STILL PASS (no behaviour change to initialize/terminate/resolveModel/normalizeModel):
npm test -- src/__tests__/unit/providers/pi-harness-initialize src/__tests__/unit/providers/pi-harness-normalizemodel
# Expected: all pass.

# Full suite (catch any ripple — esp. registry/agent/claude-code suites + the parallel S2 suites)
npm test
```

### Level 3: Integration / Runtime Spot-Check (manual, tsx)

```bash
# Prove the end-to-end path with a monkey-patched fake session (no network):
cat > /tmp/pi-execute-spotcheck.mts <<'EOF'
import { PiHarness } from "./src/harnesses/pi-harness.ts";
const h = new PiHarness();
await h.initialize();
const events = [
  { type: "session_start", reason: "startup" },
  { type: "turn_end", turnIndex: 0, message: { role: "assistant",
      content: [{ type: "text", text: "2+2=4" }],
      usage: { input: 8, output: 3, cacheRead: 0, cacheWrite: 0, totalTokens: 11, cost: { input:0,output:0,cacheRead:0,cacheWrite:0,total:0 } } },
    toolResults: [] },
  { type: "agent_end", messages: [] },
  { type: "session_shutdown", reason: "quit" },
];
let listener: any;
const fakeSession = {
  subscribe: (l: any) => { listener = l; return () => { listener = null; }; },
  prompt: async (_t: string) => { for (const e of events) listener?.(e); },
};
(h as any).sdk = { ...(h as any).sdk, createAgentSession: async () => ({ session: fakeSession }) };
const onSessionStart = () => console.log("onSessionStart fired");
const onSessionEnd = (d: number) => console.log("onSessionEnd fired, duration:", d);
const res = await h.execute({ prompt: "what is 2+2?", options: {} }, async () => ({ content:"", isError:false }), { onSessionStart, onSessionEnd });
console.log(JSON.stringify(res, null, 2));
EOF
npx tsx /tmp/pi-execute-spotcheck.mts
# Expected: console shows onSessionStart + onSessionEnd fired; JSON has status:"success", data:"2+2=4",
#   metadata.agentId:"pi", usage.input_tokens:8, usage.output_tokens:3, toolCalls:0.
```

### Level 4: Contract Grep (forbidden/required tokens)

```bash
# REQUIRED (all present):
grep -nE "createAgentSession\(|session\.subscribe\(|session\.prompt\(|createSuccessResponse\(|createErrorResponse\(|turn_end|session_start|session_shutdown|P2\.M3\.T2\.S1" src/harnesses/pi-harness.ts
# FORBIDDEN (none present — exit 1 = pass):
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts
# Stubs intact:
grep -nE "registerMCPs\(\) not implemented — P2\.M4\.T1\.S2|loadSkills\(\) not implemented — P2\.M3\.T2\.S3" src/harnesses/pi-harness.ts
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (pi-harness.ts compiles; no forbidden transitive import; no cycle).
- [ ] `npm test` exits 0 (new execute suite + edited S1 suite + S2 suites + full regression).
- [ ] `npm run build` exits 0 (`dist/harnesses/pi-harness.{js,d.ts}` emitted with real execute).

### Feature Validation
- [ ] Non-streaming `execute()` returns `Promise<AgentResponse<T>>` with `status:'success'`, `data` =
      terminal assistant text, correct `usage`/`toolCalls`/`metadata`.
- [ ] Aggregation uses `turn_end` (last-turn-wins text, accumulated usage, incremental tool count);
      `session_start`→`onSessionStart`; `session_shutdown`→`onSessionEnd`.
- [ ] Uninitialized → rejects `/not initialized/i`; streaming → throws `/P2.M3.T2.S1/`.
- [ ] `prompt()` rejection → `createErrorResponse(EXECUTION_FAILED, …, recoverable:true)`.
- [ ] `AgentResponse` shape identical to `ClaudeCodeHarness.execute` (PRD §7.14.4 parity).
- [ ] `registerMCPs`/`loadSkills` still throw citing P2.M4.T1.S2 / P2.M3.T2.S3.

### Code Quality Validation
- [ ] Follows ClaudeCodeHarness.execute's IIFE + metadata pattern; no new patterns invented.
- [ ] No transitive-dep type imports (structural casts only — CRITICAL #2).
- [ ] `toolExecutor` accepted per interface (no-op in T2 — Decision 4).
- [ ] Listener unsubscribed in `finally` (GOTCHA #9).

### Documentation & Deployment
- [ ] execute() JSDoc cites PRD §7.3/§7.11/§7.14.4 + the P2.M3 downstream owners.
- [ ] No new env vars / config.

---

## Anti-Patterns to Avoid

- ❌ Don't read a return value from `session.prompt()` — it resolves `void`; aggregate from events (Decision 1).
- ❌ Don't `import { AssistantMessage } from '@earendil-works/pi-ai'` (or pi-agent-core) — non-hoisted
  transitive; `ERR_PACKAGE_PATH_NOT_EXPORTED`. Cast structurally (Decision 2).
- ❌ Don't implement the streaming generator path — it's P2.M3.T2.S1 (Decision 3).
- ❌ Don't wire `customTools`/`toolExecutor` into ToolDefinitions — P2.M3.T1/P2.M4 (Decision 4).
- ❌ Don't wire `onToolStart`/`onToolEnd`/`onStream` — P2.M3.T2.S2 (Decision 5).
- ❌ Don't leave the obsolete `it('execute() should throw citing P2.M2.T2.S1')` in pi-harness.test.ts (Decision 6).
- ❌ Don't declare `execute` `async` (wraps the streaming throw in a rejected promise; breaks the union return).
- ❌ Don't hand-build an error response with `agentId:this.id` — use `createErrorResponse` (parity with ClaudeCodeHarness).
- ❌ Don't catch + swallow `resolveModel`'s `ConfigError` as `EXECUTION_FAILED` — let it propagate (it's a config error, not an execution error).

---

**Confidence Score: 9/10** for one-pass implementation success. The aggregation mechanism is proven
against the installed `.d.ts` files (event/field shapes verified), the mock pattern is a direct Pi
analogue of the existing ClaudeCodeHarness execute test, and the scope boundary (streaming/tools/
hooks) is crisply drawn with the 6 decisions. The -1 is for the one residual uncertainty: whether
the installed pi-coding-agent version re-exports `AgentSessionEventListener` as a TYPE (if not, the
listener degrades to `(event: any) => void` — explicitly handled in Level 1 lint triage item (d)).
