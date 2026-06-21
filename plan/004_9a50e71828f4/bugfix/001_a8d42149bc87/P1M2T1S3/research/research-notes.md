# P1.M2.T1.S3 — Research Notes

**Task**: Regression test — PiHarness tool call invokes `toolExecutor` with `{name, input}` and returns
its result (PRD §7.10 contract).

## 1. Current (post-S2) implementation state — VERIFIED APPLIED

S2 (`P1.M2.T1.S2`) is marked **Complete** and the source reflects the fix:

- `src/harnesses/pi-harness.ts`:
  - `buildCustomTools(toolExecutor?)` — optional param, forwards to `toPiCustomTools(toolExecutor)`
    (private; ~L659). Verified.
  - Non-streaming call site (~L250): `customTools: this.buildCustomTools(toolExecutor)` — verified.
  - Streaming call site (~L370): `customTools: this.buildCustomTools(toolExecutor)` — verified.
- `src/core/mcp-handler.ts`:
  - `toPiCustomTools(toolExecutor?)` (public, ~L236) — branched `execute` closure:
    `if (toolExecutor) { const res = await toolExecutor({ name: fullName, input: params }); return this.toAgentToolResultFromExecResult(res); }`
    else falls back to `registered.executor(params)`. Verified.
  - `toAgentToolResultFromExecResult(result)` (public, ~L292) — reads `result.content` (string
    passthrough else `JSON.stringify`) and `result.isError` → `{ content:[{type:'text',text}], details:{isError} }`. Verified.

**Conclusion**: the contract is implemented; S3 only needs to ASSERT it (no source edits).

## 2. The "EITHER / OR" decision — CRITICAL

The item offers two ways to trigger a tool call:
- (a) script a `piTurnEndTool` that triggers the tool, OR
- (b) capture the `customTools` passed to `createAgentSession` and directly invoke
      `customTools[0].execute(...)`.

**Decision: (b) is the reliable path. (a) ALONE DOES NOT WORK.**

Reason: `makeFakeSession`'s `prompt()` is a no-op that replays scripted events to the **listener**
captured via `session.subscribe`. The `PiHarness.execute()` listener aggregates `turn_end`
text/usage/tool-call-count and fires hooks — but it **never invokes `customTools[i].execute`**.
In real Pi, tool dispatch happens INSIDE the Pi SDK's internal loop (the SDK calls
`customTools[i].execute(toolCallId, params, signal, onUpdate, ctx)` when the model emits a tool
call). The fake session cannot replicate that internal dispatch because it doesn't hold the
`customTools`. So scripting `piTurnEndTool` alone fires `onToolStart`/`onToolEnd` hooks (via
`fireHookEvents` reading `tool_execution_start/end` events) but **never triggers `toolExecutor`**.

Direct invocation of the captured `customTools[0].execute('tc1', {x:'val'}, undefined, undefined, {})`
is therefore the faithful simulation of "Pi SDK calls the customTool" and is the robust contract
assertion. This is exactly what the item's step (e) recommends ("OR capture the customTools... and
directly invoke customTools[0].execute").

## 3. Pre-S2 failure mode (the regression sentinel)

On pre-S2 code, `buildCustomTools()` was zero-arg and `toPiCustomTools()` dispatched to
`registered.executor(params)`. For an inprocess tool whose executor was NOT pre-registered via
`registerToolExecutor`, that path throws inside `createToolExecutor` (mcp-handler.ts ~L329):
`"No executor registered for inprocess tool 'srv__ping'..."`. The rebind's try/catch converts that
throw to `{ content:[{text:"Error: No executor registered..."}], details:{isError:true} }`, and
`agentToolExecutor` is **never** called. So this test FAILS on pre-S2 (no call + isError:true
text) and PASSES on post-S2 (called once with `{name:'srv__ping', input:{x:'val'}}` + clean text).
This is exactly the regression behavior the item specifies.

## 4. Key facts / line numbers for the PRP

- **Namespacing**: `registerMCPs([{name:'srv', tools:[{name:'ping',...}]}])` → registered key
  `srv__ping` (confirmed by `pi-harness-registermcps.test.ts`).
- **customTool execute signature**: `execute(toolCallId, params, signal, onUpdate, ctx)` — call with
  `execute('tc1', {x:'val'}, undefined, undefined, {})`.
- **AgentToolResult shape** (from converter): `{ content: [{type:'text', text}], details: { isError } }`
  → assert `result.content[0].text` and `result.details.isError`.
- **agentToolExecutor content as string**: `content: 'agent-' + req.name` = `'agent-srv__ping'` (a
  STRING) → converter passes it through unchanged (no JSON.stringify).
- **Model resolution works with `options: {}`**: `pi-harness-execute.test.ts` drives `execute({prompt, options:{}}, …)`
  to success using the default `'claude-sonnet-4-20250514'` + in-memory `ModelRegistry` set up by
  real `initialize()`. No model pre-registration needed in the test.
- **Import depth** from `src/__tests__/unit/providers/`: `../../../harnesses/pi-harness.js`,
  `../../../harnesses/harness-registry.js`, `../../../types/harnesses.js`, `../../../types/agent.js`.
- **`lint` does NOT type-check tests** (`tsconfig.json` excludes `src/__tests__`); test type errors
  only surface via `vitest run`. Use `@ts-expect-error - private field access for testing` for the
  `harness.sdk` overwrite.
- **NEW FILE required**: S2 PRP mandates `pi-harness-customtools.test.ts` stays byte-for-byte
  unchanged as the backward-compat sentinel. S3 = new file.

## 5. File placement decision

`src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts` — sits beside the other
`pi-harness-*.test.ts` unit tests (pi-harness-execute.test.ts uses the identical makeFakeSession +
real-execute pattern and lives in unit/providers/). It is a single-harness contract test, not
cross-harness parity, so `integration/` is not the right home.

## 6. Helper factories to copy verbatim

From `src/__tests__/integration/harness-parity.test.ts:46-80` / `pi-harness-execute.test.ts:26-55`:
`makeFakeSession(events)`, `wirePi(harness, events)` (private-field overwrite after real
`initialize()`). Event factories: `piTurnEndText` (sufficient for a clean execute() completion).
Minimal event list for a green execute(): `[SESSION_START, piTurnEndText('ok',{input:1,output:1}), AGENT_END]`.
