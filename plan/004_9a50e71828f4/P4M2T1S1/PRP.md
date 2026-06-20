# PRP — P4.M2.T1.S1: Parity tests: identical AgentResponse + tool execution semantics

**PRD reference:** §7.14.1 (MCP tools), §7.14.4 (identical AgentResponse), §7.14.6 (workflow integration events).
**Plan:** `plan/004_9a50e71828f4/` — S1 of P4.M2.T1 ("Feature-parity and adversarial test suites"). **Consumes:**
the two shipped harness adapters `PiHarness` (`src/harnesses/pi-harness.ts`) and `ClaudeCodeHarness`
(`src/harnesses/claude-code-harness.ts`) + their shared `Harness` contract (`src/types/harnesses.ts`) +
the `AgentResponse` factory (`src/types/agent.ts`). **Produces:** ONE new regression-protected integration
test file `src/__tests__/integration/harness-parity.test.ts` that proves the two harnesses are behaviourally
interchangeable for the PRD §7.14 parity guarantees. **Unblocks:** P4.M2.T1.S2 (cache-isolation + deterministic
hook-ordering tests) by establishing the parity-test scaffolding/idioms it will reuse. **Scope tag:**
(1) **CREATE** one test file; (2) **EDIT** nothing in `src/`. **DO NOT** modify either harness, the types,
the Agent, the registry, `PRD.md`, `tasks.json`, `prd_snapshot.md`, or any existing test.

> **READ "§THE TOOL-EXECUTION ASYMMETRY (PRD §7.14 GAP)" AND "§MOCKING: OVERWRITE THE PRIVATE `sdk` FIELD,
> DO NOT USE vi.mock" BEFORE WRITING A SINGLE `it(...)`.** These two sections define the difference between
> a test that passes honestly and one that is either brittle (fails on real known asymmetries) or fake
> (asserts equality by cheating). The parity contract is achievable for AgentResponse **shape** and tool
> **shape**; it is deliberately **not** value-identical for `isError`/`duration` on hook results.

---

## Goal

**Feature Goal:** Create a single, self-contained Vitest integration suite that runs the same
`HarnessRequest` + shared stub `toolExecutor` through **both** registered harnesses (`PiHarness` and
`ClaudeCodeHarness`) with their SDKs mocked, and asserts the three PRD §7.14 parity guarantees:
(§7.14.4) identical `AgentResponse` shape/status/metadata, (§7.14.1) identical `ToolExecutionRequest`/
`ToolExecutionResult` **shape** + namespacing + tool-count semantics, and (§7.14.6) identical workflow-event
emission when the harness is driven through an `Agent` inside a workflow context.

**Deliverable:** `src/__tests__/integration/harness-parity.test.ts` — a Vitest file with three top-level
`describe` blocks (one per PRD section), shared fixtures (mocked-SDK factories, shared stub `toolExecutor`,
shared `HarnessRequest`), and `beforeEach`/`afterEach` that reset `HarnessRegistry`. Zero new production
code, zero new dependencies.

**Success Definition:**
1. `npm test -- harness-parity` passes (and `npm test` stays green — no other test regresses).
2. `npm run lint` (`tsc --noEmit`) exits 0 with the new file included.
3. The suite asserts, for an equivalent scripted turn, that BOTH harnesses return the same `AgentResponse`
   **status / data / error-null / metadata key-set**, increment `metadata.toolCalls` identically, surface
   `ToolExecutionRequest {name,input}` and `ToolExecutionResult {content,isError}` with namespaced names
   preserved, and emit the same `WorkflowEvent` types when run through an `Agent` in a workflow context.
4. The known `isError`/`duration` fidelity gap between the harnesses is **documented and asserted at shape
   level only** — the suite must not falsely assert value-equality it cannot honour.

## Why

- **Locks in the v1.2 harness/provider split (PRD §7).** The whole point of modelling the agent runtime as
  a pluggable harness (pi default, claude-code optional) is interchangeability. Without a parity suite, a
  future refactor of one adapter can silently break the `AgentResponse` contract or tool semantics for the
  other harness, and no test catches it.
- **Regression protection for the §7.14 "Adapter non-functional requirements".** PRD §7.14 promises identical
  response shape, identical tool-execution semantics, deterministic hook ordering, and capability
  advertising. This suite is the executable evidence for §7.14.1 / §7.14.4 / §7.14.6.
- **Foundation for P4.M2.T1.S2.** S2 (cache-isolation + deterministic hook-ordering) reuses the exact
  mocking idioms, registry-reset pattern, and shared-fixtures layout established here. Doing this file
  first makes S2 a small delta.
- **Low blast radius.** It is a pure test-file addition. No production code changes; the only risk is a
  flaky/brittle assertion, which the Validation Loop + the asymmetry notes guard against.

## What

User-visible behaviour: **none.** This is a test-only deliverable. Developers get a green CI signal that the
two harnesses are interchangeable across the §7.14 parity surface.

### Success Criteria

- [ ] New file `src/__tests__/integration/harness-parity.test.ts` exists and is discovered by `npm test`
      (vitest `include: src/__tests__/**/*.test.ts`).
- [ ] **AgentResponse parity (§7.14.4):** equivalent success turn through both harnesses yields identical
      `status`/`data`/`error===null` and identical metadata KEY-SET (`agentId,timestamp,duration,
      usage{input_tokens,output_tokens},toolCalls`); equivalent error turn yields identical error shape.
- [ ] **Tool execution shape parity (§7.14.1):** both surface `ToolExecutionRequest {name,input}` and
      `ToolExecutionResult {content,isError}`; namespaced names (`server__tool`) pass through unchanged;
      `metadata.toolCalls` increments identically for the same scripted tool count.
- [ ] **PiHarness-specific:** the shared stub `toolExecutor` IS invoked with `{name,input}` (via captured
      `customTools`) and its `{content,isError}` is returned; the **real** `isError`/`duration` reach
      `onToolEnd`.
- [ ] **ClaudeCodeHarness-specific:** `onToolStart`/`onToolEnd` fire with the request/result SHAPE;
      `onToolEnd`'s `isError:false`/`duration:0` SDK limitation is asserted as the documented value (not
      compared against PiHarness's real values).
- [ ] **Workflow-context parity (§7.14.6):** an `Agent` running each harness inside `runInContext(...)`
      emits the same set of `WorkflowEvent` types for an equivalent turn.
- [ ] No production file is modified; `npm test` and `npm run lint` both green.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this
successfully?_ **Yes.** This PRP supplies: the exact mocking technique (private `sdk`-field overwrite, with
verbatim fake-session / fake-query factories copied from the proven unit tests), the scripted event/message
payloads, the precise metadata key-set both harnesses emit, the **critical** tool-execution architectural
asymmetry table (so the implementer writes shape-parity assertions instead of value-equality ones that fail),
the workflow-context wiring path, and verified validation commands.

### Documentation & References

```yaml
# MUST READ — include these in your context window
- url: https://github.com/anthropics/claude-agent-sdk-typescript  # (reference only — do NOT call the network)
  why: "Canonical shapes for SDKMessage stream (assistant/content[].tool_use, result/subtype/usage)."
  critical: "You do NOT need live docs — the verified shapes are already captured in the existing unit tests
        cited below and in research/findings.md §1. Treat those as the source of truth."

- file: src/harnesses/pi-harness.ts
  why: "The adapter under test. execute() (non-streaming) aggregates turn_end assistant text + usage +
        toolCalls and calls createSuccessResponse with {agentId:this.id, timestamp, duration, usage, toolCalls}.
        Tools are wired via buildCustomTools() → MCPHandler.toPiCustomTools(); each ToolDefinition.execute
        delegates to the toolExecutor passed to execute()."
  pattern: "lazy `await import('@earendil-works/pi-coding-agent')` in initialize() stores into private
        `this.sdk` — that is the seam the test overwrites."
  gotcha: "fireHookEvents() reports the REAL isError and a REAL duration (stashed from tool_execution_start).
        This is a FIDELITY ADVANTAGE over claude-code — do not assume claude-code matches it."

- file: src/harnesses/claude-code-harness.ts
  why: "The second adapter under test. execute() (non-streaming, lines 380-625) iterates the SDK
        AsyncGenerator<SDKMessage>: counts tool_use blocks into toolCallCount, captures the result message,
        and on success calls createSuccessResponse(result.structured_output ?? result.result,
        {agentId:'claude-code', timestamp, duration, usage, toolCalls})."
  pattern: "lazy `await import('@anthropic-ai/claude-agent-sdk')` in initialize() → private `this.sdk`."
  gotcha: "buildAgentSDKHooks() (lines ~1055-1128) maps PostToolUse→onToolEnd with isError:false and
        duration:0 HARD-CODED (SDK limitation, see line ~1125). The toolExecutor PARAMETER is NOT used for
        execution in the non-streaming path — the SDK executes via the mcpServers wrapper. Assert SHAPE only."

- file: src/__tests__/unit/providers/pi-harness-execute.test.ts
  why: "THE proven PiHarness mocking recipe. Copy makeFakeSession() + wireFakeSession() + the scripted
        event payloads (SESSION_START, turnEndText, turnEndTool, AGENT_END)."
  pattern: "harness = new PiHarness(); await harness.initialize(); then `harness.sdk = {...harness.sdk,
        createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession })}` via
        `// @ts-expect-error - private field access for testing`."
  gotcha: "createAgentSession is called with { model, modelRegistry, authStorage, customTools }.
        Capture callArgs.customTools to drive the tool round-trip; each entry has .name and .execute(args)."

- file: src/__tests__/unit/providers/claude-code-harness-execute.test.ts
  why: "THE proven ClaudeCodeHarness mocking recipe. Copy the provider.sdk = { query, createSdkMcpServer,
        tool } shape and the async-generator message yields (assistant/content[]/tool_use, result/subtype/
        usage)."
  pattern: "provider = new ClaudeCodeHarness(); await provider.initialize(); then
        `provider.sdk = { query: vi.fn().mockImplementation(({prompt,options}) => (async function*(){...})()),
        createSdkMcpServer: vi.fn(), tool: vi.fn() }` via @ts-expect-error."

- file: src/__tests__/adversarial/prd-compliance.test.ts
  why: "The adversarial-suite STRUCTURE the contract names as 'the pattern to follow': one describe per PRD
        section, clear Arrange/Act/Assert, vitest globals imported explicitly."
  pattern: "organize harness-parity.test.ts as three top-level describes keyed to PRD §7.14.1/§7.14.4/§7.14.6."

- file: src/__tests__/integration/provider-switching.test.ts
  why: "The integration-suite idiom for registry setup: createMockProvider + ProviderRegistry._resetForTesting()
        in beforeEach + resetGlobalConfig(). Shows how to assert which harness.execute was called."
  pattern: "Reuse the registry-reset + vi.clearAllMocks() per-test isolation discipline."

- file: src/__tests__/integration/agent-workflow.test.ts
  why: "The idiom for running an Agent inside a workflow context and capturing WorkflowEvents via an
        observer (runInContext + addObserver + onEvent push). Reuse for the §7.14.6 block."
  pattern: "build a tiny Workflow, add an observer that collects events into an array, run the agent inside
        runInContext, assert on the collected event types."

- file: src/types/agent.ts  (functions at lines 709 createSuccessResponse, 764 createErrorResponse, 878 isError)
  why: "The factories BOTH harnesses call. Defines the exact AgentResponse shape you assert against."
  pattern: "success = {status:'success', data, error:null, metadata:{agentId,timestamp,duration?,usage?,toolCalls?}}.
        error = {status:'error', data:null, error:{code,message,details,recoverable}, metadata:{agentId:'unknown',timestamp}}."

- file: src/types/harnesses.ts
  why: "The shared Harness contract + ToolExecutionRequest/Result + HarnessRequest/HarnessExecutionOptions
        + HarnessHookEvents definitions you import as types."
  pattern: "import type { Harness, HarnessRequest, HarnessHookEvents, ToolExecutionRequest,
        ToolExecutionResult } from '../../types/harnesses.js'"

- file: src/core/agent.ts  (executePrompt ~line 594; harnessHooks emit ~688-703; HarnessRegistry.get ~384-389)
  why: "How the §7.14.6 workflow test wires: Agent.executePrompt resolves the harness from HarnessRegistry,
        calls harness.execute(req, this.toolExecutor.bind(this), harnessHooks), and harnessHooks.onToolStart/
        onToolEnd call emitWorkflowEvent→ctx.emitEvent when inside runInContext."
  gotcha: "The Agent resolves the harness by id from the GLOBAL HarnessRegistry — so register BOTH mocked
        instances there in beforeEach (see Implementation Task 1)."

- docfile: plan/004_9a50e71828f4/P4M2T1S1/research/findings.md
  why: "Exhaustive findings: the proven mocking factories, the metadata key-set, the full asymmetry table,
        and the contract→PRD-section mapping for the three describes."
  section: "§1 (mocking recipes), §2 (AgentResponse parity), §3 (the tool-execution asymmetry table)"
```

### Current Codebase tree (relevant slice)

```bash
src/
├── harnesses/
│   ├── pi-harness.ts                 # adapter under test (mock via private `sdk` field)
│   ├── claude-code-harness.ts        # adapter under test (mock via private `sdk` field)
│   ├── harness-registry.ts           # HarnessRegistry._resetForTesting() + .getInstance().register()
│   └── index.ts                      # re-exports HarnessRegistry
├── types/
│   ├── harnesses.ts                  # Harness, HarnessRequest, ToolExecutionRequest/Result, HarnessHookEvents
│   └── agent.ts                      # AgentResponse, createSuccessResponse/createErrorResponse/isError
├── core/
│   └── agent.ts                      # Agent.executePrompt — HarnessRegistry.get + harnessHooks→ctx.emitEvent
└── __tests__/
    ├── integration/
    │   ├── harness-parity.test.ts    # ⬅ CREATE THIS FILE (the deliverable)
    │   ├── provider-switching.test.ts# registry-reset + mock-harness idiom reference
    │   └── agent-workflow.test.ts    # runInContext + observer event-capture idiom reference
    ├── adversarial/
    │   └── prd-compliance.test.ts    # describe-per-PRD-section structure reference
    └── unit/providers/
        ├── pi-harness-execute.test.ts        # PiHarness SDK-mock factory reference
        └── claude-code-harness-execute.test.ts# ClaudeCodeHarness SDK-mock factory reference
```

### Desired Codebase tree with files added

```bash
src/__tests__/integration/
└── harness-parity.test.ts    # NEW — the only file created/modified by this task
# No other files touched. No package.json, tsconfig, or vitest.config changes (the glob already covers it).
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — MOCKING: OVERWRITE THE PRIVATE `sdk` FIELD, DO NOT USE vi.mock.
//   Both harnesses lazy-`await import(...)` their SDK inside initialize() and store it on a private
//   `this.sdk`. All 26 existing harness unit tests mock by OVERWRITING that field AFTER a real
//   initialize(), never via module-level vi.mock('@...'). vi.mock would require hoisted factories and
//   fight the lazy import; the private-field pattern is proven and reads naturally.
//   This SATISFIES the contract's "Mock both SDK imports" requirement — the SDK module is the thing
//   being stubbed (initialize()'s `await import(...)` result is replaced wholesale).
//   Pseudocode (full verbatim factories in the referenced unit tests):
//     const pi = new PiHarness(); await pi.initialize();
//     // @ts-expect-error - private field access for testing
//     pi.sdk = { ...pi.sdk, createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }) };
//     const cc = new ClaudeCodeHarness(); await cc.initialize();
//     // @ts-expect-error - Testing private property
//     cc.sdk = { query: vi.fn().mockImplementation(...), createSdkMcpServer: vi.fn(), tool: vi.fn() };

// CRITICAL #2 — THE TOOL-EXECUTION ASYMMETRY (PRD §7.14 GAP). The two harnesses do NOT execute tools
//   through the same code path:
//     • PiHarness: the toolExecutor PARAMETER is the real execution path. buildCustomTools() returns
//       ToolDefinitions whose .execute(args) calls toolExecutor({name, input}). The model's toolCall is
//       dispatched to the matching customTool by Pi inside session.prompt(). The shared stub toolExecutor
//       IS invoked. onToolEnd gets the REAL isError + a REAL duration.
//     • ClaudeCodeHarness (non-streaming execute): the toolExecutor PARAMETER is NOT invoked for execution.
//       tool_use blocks are only COUNTED (toolCallCount++); the SDK executes via the mcpServers/
//       createSdkMcpServer wrapper. onToolStart/onToolEnd fire via buildAgentSDKHooks() but onToolEnd
//       ALWAYS reports isError:false and duration:0 (hard-coded SDK limitation, claude-code-harness.ts
//       ~line 1125).
//   CONSEQUENCE: assert SHAPE parity (both produce {name,input} requests and {content,isError} results,
//   both preserve namespaced names, both increment toolCalls identically) — NOT value equality of
//   isError/duration. Asserting `piResult.isError === ccResult.isError` would FAIL and is wrong.
//   See §Implementation Patterns → "the honest parity matrix" for the exact assertion split.

// CRITICAL #3 — AgentResponse metadata parity IS clean. Both success paths call createSuccessResponse
//   with the IDENTICAL metadata shape: { agentId: this.id, timestamp: Date.now(), duration, usage:
//   {input_tokens, output_tokens}, toolCalls }. Assert the KEY-SET is identical and that usage + toolCalls
//   VALUES are identical (you script both mocks to the same numbers). agentId/timestamp/duration VALUES
//   legitimately differ — compare agentId explicitly as 'pi' vs 'claude-code', not as equal.

// CRITICAL #4 — DATA parity requires matching mocks. ClaudeCodeHarness data = resultMessage.structured_output
//   ?? resultMessage.result. PiHarness data = last turn_end assistant text. To make data IDENTICAL across
//   harnesses, script both mocks to the same payload (e.g. cc result.result = 'PARITY_DATA' AND pi
//   turnEndText('PARITY_DATA')). Don't compare arbitrary payloads.

// CRITICAL #5 — REGISTRY ISOLATION. HarnessRegistry is a singleton shared across tests. Reset it in
//   beforeEach AND afterEach: HarnessRegistry._resetForTesting(); then re-register BOTH mocked instances.
//   Also call HarnessRegistry.getInstance()._resetInitStateForTesting() (pattern from pi-harness-execute
//   .test.ts) so initialize-bookkeeping from prior tests doesn't leak. vi.clearAllMocks() each test.

// CRITICAL #6 — THE WORKFLOW-CONTEXT TEST NEEDS THE REGISTRY. Agent.executePrompt resolves the harness via
//   HarnessRegistry.getInstance().get(resolvedHarness). For the §7.14.6 block, register BOTH mocked
//   harness instances (real PiHarness/ClaudeCodeHarness with overwritten .sdk) in the registry, then
//   `new Agent({ harness: 'pi' })` and `new Agent({ harness: 'claude-code' })` each resolve correctly.

// CRITICAL #7 — DO NOT TOUCH PRODUCTION CODE. If a parity assertion fails, that is almost certainly a
//   test-shape problem (value-equality on an asymmetric field) — NOT a license to edit the harnesses.
//   The only legitimate fix is to narrow the assertion to shape parity (see Critical #2). Editing
//   src/harnesses/* to "make the test pass" is scope violation + may regress the 50+ existing harness
//   unit tests.

// CRITICAL #8 — NO NETWORK, NO REAL API KEYS. Both SDKs are fully mocked; never call initialize() with a
//   real key or let a test hit the network. initialize() with NO args is fine (both harnesses build a
//   headless registry / require no key until execute, which is mocked).
```

## Implementation Blueprint

### Data models and structure

No production data models. The file defines **test-local helper types** only (mirroring the unit-test
idiom) — local `FakeEvent`/`SDKMessage` structural types for the mocked payloads. Everything asserted
against is an existing exported type: `AgentResponse`, `AgentResponseMetadata`, `ToolExecutionRequest`,
`ToolExecutionResult`, `HarnessRequest`, `HarnessHookEvents`, `WorkflowEvent`.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/integration/harness-parity.test.ts — shared fixtures + helpers (TOP of file)
  - IMPORTS: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';` plus
        `import { PiHarness } from '../../harnesses/pi-harness.js';`,
        `import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';`,
        `import { HarnessRegistry } from '../../harnesses/harness-registry.js';`,
        `import { AGENT_ERROR_CODES, isSuccess, isError } from '../../types/agent.js';`,
        `import type { HarnessRequest, HarnessHookEvents, ToolExecutionRequest, ToolExecutionResult,
            AgentResponse } from '../../types/harnesses.js';` (split: value from agent.js, types from
            harnesses.js — match the unit-test import discipline).
  - DEFINE shared scripted payloads (copy from pi-harness-execute.test.ts):
        PI_SESSION_START = {type:'session_start', reason:'startup'};
        piTurnEndText(text, {input,output}) → {type:'turn_end', message:{role:'assistant',
            content:[{type:'text',text}], usage:{input,output,cacheRead:0,cacheWrite:0,...}}};
        piTurnEndTool(toolName, args, {input,output}) → adds a {type:'toolCall', id, name:toolName,
            arguments:args} block to content + keeps a text block.
        PI_AGENT_END = {type:'agent_end', messages:[]}; PI_SESSION_SHUTDOWN = {type:'session_shutdown'}.
  - DEFINE the ClaudeCode scripted messages (copy from claude-code-harness-execute.test.ts):
        ccAssistantText(text) → {type:'assistant', message:{content:[{type:'text',text}]}};
        ccAssistantToolUse(name, input) → {type:'assistant', message:{content:[{type:'tool_use', id,
            name, input}]}};
        ccResultSuccess(data, {input_tokens, output_tokens}) → {type:'result', subtype:'success',
            result:data, usage:{input_tokens, output_tokens}};
        ccResultError(subtype, errors) → {type:'result', subtype, errors}.
  - DEFINE makeFakePiSession(events) (subscribe captures listener + returns unsub; prompt replays events)
        and makeClaudeQuery(messages) (returns an async-generator factory). Copy verbatim from the two
        referenced unit tests.
  - DEFINE wirePi(harness, events) and wireCc(harness, messages) that overwrite the private `sdk` field
        via `// @ts-expect-error - private field access for testing`.
  - DEFINE the SHARED stub toolExecutor: `const sharedToolExecutor = vi.fn(async (req: ToolExecutionRequest)
        => ({ content: `result-for-${req.name}`, isError: false } as ToolExecutionResult));` — reset with
        sharedToolExecutor.mockClear() in beforeEach.
  - DEFINE the SHARED HarnessRequest: `const sharedRequest: HarnessRequest = { prompt: 'PARITY_PROMPT',
        options: {} };`
  - DEFINE makeMockedHarnesses() helper that returns `{ pi, cc }` — both `new`'d, `initialize()`'d, SDK-
        overwritten, and returns the instances for direct use + registry registration.

Task 2: §7.14.4 AgentResponse parity — describe('PRD §7.14.4 — identical AgentResponse')
  - beforeEach: HarnessRegistry._resetForTesting(); vi.clearAllMocks(); re-register both mocked harnesses.
  - it('both harnesses return success with identical shape + metadata key-set'):
        • pi: wirePi(pi, [PI_SESSION_START, piTurnEndText('PARITY_DATA',{input:10,output:5}), PI_AGENT_END]);
        • cc: wireCc(cc, [ccAssistantText('PARITY_DATA'), ccResultSuccess('PARITY_DATA',{input_tokens:10,
          output_tokens:5})]);
        • const piRes = await pi.execute(sharedRequest, sharedToolExecutor);
        • const ccRes = await cc.execute(sharedRequest, sharedToolExecutor);
        • ASSERT: piRes.status === ccRes.status === 'success';
          piRes.data === ccRes.data === 'PARITY_DATA'; piRes.error === null && ccRes.error === null.
        • ASSERT metadata KEY-SET parity: `expect(Object.keys(piRes.metadata).sort()).toEqual(
          Object.keys(ccRes.metadata).sort())` → both contain agentId, timestamp, duration, usage, toolCalls.
        • ASSERT usage + toolCalls VALUE parity: piRes.metadata.usage.input_tokens ===
          ccRes.metadata.usage.input_tokens === 10; output_tokens === 5; toolCalls === 0 for both.
        • ASSERT agentId differs legitimately: piRes.metadata.agentId === 'pi'; ccRes.metadata.agentId ===
          'claude-code'; (explicitly DIFFERENT — documents the one sanctioned value divergence).
  - it('both harnesses return error with identical shape (EXECUTION_FAILED)'):
        • pi: wirePi with a session whose prompt() throws (copy the error-path recipe from
          pi-harness-execute.test.ts "error path" block).
        • cc: wireCc to yield ccResultError('error_during_execution', ['boom']).
        • ASSERT both: status==='error'; data===null; error.code===AGENT_ERROR_CODES.EXECUTION_FAILED;
          error has {code,message,details,recoverable} (KEY-SET parity); recoverable is a boolean.
  - it('both honor isSuccess()/isError() type guards identically'): run isSuccess on the success pair and
        isError on the error pair — both true on the matching side, false on the other (proves the
        AgentResponse discriminator is harness-agnostic).

Task 3: §7.14.1 Tool execution shape parity — describe('PRD §7.14.1 — tool execution shape parity')
  - it('PiHarness routes tool calls through the shared toolExecutor via customTools'):
        • wirePi(pi, [piTurnEndTool('filesystem__read_file', {path:'/x'}, {input:20,output:8}), PI_AGENT_END]);
        • await pi.execute(sharedRequest, sharedToolExecutor);
        • Capture the customTools passed to createAgentSession:
          // @ts-expect-error private; const createArgs = pi.sdk.createAgentSession.mock.calls[0][0];
        • Pick the customTool whose .name === 'filesystem__read_file'; await its .execute({path:'/x'}).
        • ASSERT sharedToolExecutor was called with { name:'filesystem__read_file', input:{path:'/x'} } and
          returned {content:'result-for-filesystem__read_file', isError:false} (round-trip + namespacing).
  - it('ClaudeCodeHarness counts tool_use into metadata.toolCalls identically'):
        • wireCc(cc, [ccAssistantToolUse('filesystem__read_file', {path:'/x'}),
          ccResultSuccess('done',{input_tokens:20,output_tokens:8})]);
        • const res = await cc.execute(sharedRequest, sharedToolExecutor);
        • ASSERT res.metadata.toolCalls === 1 (parity with a PiHarness 1-tool turn scripted identically —
          script a piTurnEndTool(1) and compare toolCalls values).
  - it('ToolExecutionRequest/Result SHAPE parity (namespacing preserved)'):
        • Build one request/result from each harness: pi via customTools capture (Task 3 #1); cc via the
          hooks adapter (Task 3 #4).
        • ASSERT each request has exactly {name:string, input:unknown}; each result has exactly
          {content, isError:boolean}; namespaced name 'filesystem__read_file' is byte-identical in both.
  - it('ClaudeCodeHarness hooks adapter fires onToolStart/onToolEnd with the request/result shape'):
        • const hooks = { onToolStart: vi.fn(), onToolEnd: vi.fn() };
        • wireCc(cc, [ccAssistantToolUse('filesystem__read_file', {path:'/x'}),
          ccResultSuccess('done',{input_tokens:20,output_tokens:8})]);
        • await cc.execute(sharedRequest, sharedToolExecutor, hooks);
        • ASSERT hooks.onToolStart called with a {name:'filesystem__read_file', input:{path:'/x'}}-shaped arg.
        • ASSERT hooks.onToolEnd called with (req, result, duration) where result has {content, isError};
        • DOCUMENT the SDK limitation inline: `// claude-code onToolEnd.isError is ALWAYS false and
          // duration ALWAYS 0 (SDK limitation, claude-code-harness.ts ~L1125) — assert SHAPE, not value`.
        • ASSERT ccResult.isError === false && typeof duration === 'number' (the documented claude-code value).
  - it('PiHarness onToolEnd reports the REAL isError/duration (fidelity advantage — NOT equal to cc)'):
        • Script a pi tool turn whose toolExecutor returns isError:true; assert pi's onToolEnd result.
        isError === true and duration is a real (>=0) number. Cross-reference: this is the asymmetry that
        means we assert SHAPE parity across harnesses, never isError value-equality.

Task 4: §7.14.6 Workflow-context parity — describe('PRD §7.14.6 — workflow integration events')
  - Use the agent-workflow.test.ts idiom: a tiny Workflow + observer collecting WorkflowEvent[] via
        runInContext. Register BOTH mocked harness instances in HarnessRegistry (Task 1 helper).
  - it('both harnesses emit the same WorkflowEvent types for an equivalent turn'):
        • Build two identical workflows (or one reused) that each new Agent({ harness:'pi'|'claude-code' })
          and call agent.prompt(...) inside a @Step, wrapped in runInContext with an observer.
        • Mock each harness's SDK so the turn is equivalent (same success path).
        • Run once with harness 'pi', collect piEvents; run once with harness 'claude-code', collect
          ccEvents (fresh observer each run).
        • ASSERT the SET of event types emitted is identical for both
          (`[...new Set(piEvents.map(e=>e.type))].sort() === [...new Set(ccEvents.map(e=>e.type))].sort()`).
        • At minimum both emit the Agent prompt/tool events Agent.executePrompt wires via emitWorkflowEvent
          (agent.ts ~688-703); if the scripted turn has no tool, assert the prompt/session events match.
  - Keep this block SMALL and robust: prefer asserting event-TYPE-set equality over deep value equality
        (timestamps/durations inside events are volatile).

Task 5: VERIFY all gates (see Validation Loop)
  - `npm test -- harness-parity` green; `npm test` green (no regressions); `npm run lint` green.
```

### Implementation Patterns & Key Details

**§ The honest parity matrix (read before writing any `expect`):**

| Parity dimension | Assert VALUE equality? | Assert SHAPE/KEY-set equality? | Notes |
|---|---|---|---|
| `AgentResponse.status` | ✅ yes | — | both 'success'/'error' |
| `AgentResponse.data` | ✅ yes (script both mocks to same payload) | — | |
| `AgentResponse.error === null` (success) | ✅ yes | — | |
| `AgentResponse.error` shape (error path) | — | ✅ keys {code,message,details,recoverable} | |
| `metadata` keys | — | ✅ identical key-set | `{agentId,timestamp,duration,usage,toolCalls}` |
| `metadata.usage` / `metadata.toolCalls` | ✅ yes (script same numbers) | — | |
| `metadata.agentId` | ❌ NO ('pi' vs 'claude-code') | — | the ONE sanctioned divergence |
| `metadata.timestamp`/`duration` | ❌ NO (volatile) | — | assert type `number` + `>=0` |
| `ToolExecutionRequest` `{name,input}` | — | ✅ shape + namespacing | |
| `ToolExecutionResult` `{content,isError}` | — | ✅ shape | |
| `onToolEnd` `isError`/`duration` | ❌ **NO** (asymmetry) | ✅ type only | claude-code always false/0; pi real |
| Workflow `event.type` set | — | ✅ set equality | |

```ts
// Canonical metadata key-set parity assertion (the heart of §7.14.4):
const piKeys = Object.keys(piRes.metadata).sort();
const ccKeys = Object.keys(ccRes.metadata).sort();
expect(piKeys).toEqual(ccKeys);                                  // PRD §7.14.4 identical shape
expect(piRes.metadata.usage).toEqual(ccRes.metadata.usage);      // value parity (scripted equal)
expect(piRes.metadata.toolCalls).toBe(ccRes.metadata.toolCalls);
expect(piRes.metadata.agentId).toBe('pi');                       // sanctioned divergence
expect(ccRes.metadata.agentId).toBe('claude-code');
expect(piRes.metadata.agentId).not.toBe(ccRes.metadata.agentId);

// Canonical tool round-trip for PiHarness (the harness that actually calls toolExecutor):
// @ts-expect-error - private field access for testing
const createArgs = pi.sdk.createAgentSession.mock.calls[0][0];
const tool = (createArgs.customTools as any[]).find((t) => t.name === 'filesystem__read_file');
const toolResult = await tool.execute({ path: '/x' });
expect(sharedToolExecutor).toHaveBeenCalledWith(
  expect.objectContaining({ name: 'filesystem__read_file', input: { path: '/x' } }),
);
expect(toolResult).toEqual({ content: 'result-for-filesystem__read_file', isError: false });

// Canonical ClaudeCode hook-shape assertion (NOT value equality on isError):
expect(hooks.onToolStart).toHaveBeenCalledWith(
  expect.objectContaining({ name: 'filesystem__read_file', input: expect.any(Object) }),
);
const [, ccToolResult, ccDuration] = hooks.onToolEnd.mock.calls[0];
expect(ccToolResult).toMatchObject({ content: expect.anything(), isError: false }); // documented false
expect(typeof ccDuration).toBe('number');
```

**§ Registry + isolation pattern (every describe's beforeEach):**
```ts
beforeEach(async () => {
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance()._resetInitStateForTesting();
  vi.clearAllMocks();
  sharedToolExecutor.mockClear();
  ({ pi, cc } = makeMockedHarnesses()); // new'd, initialize()'d, .sdk overwritten
  HarnessRegistry.getInstance().register(pi);
  HarnessRegistry.getInstance().register(cc);
});
afterEach(() => {
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance()._resetInitStateForTesting();
});
```

### Integration Points

```yaml
DATABASE: none
CONFIG: none (do NOT call configureHarnesses/configureProviders — the Agent cascade defaults suffice;
        if a test needs a default, scope it locally and resetGlobalConfig() in afterEach)
ROUTES: none
PUBLIC API: none (src/index.ts unchanged)
TYPE SURFACE: none (consumes existing exported types only)
DEPS: none (no package.json change; vitest + vi already available)
BUILD: the new file is under src/__tests__/ which tsconfig compiles via npm run lint (tsc --noEmit on src/).
        vitest picks it up via the existing include glob — no config change.
```

## Validation Loop

### Level 1: Syntax & Style (type-check the new file)

```bash
# The new test file must type-check under the project tsconfig (npm run lint runs tsc --noEmit on src/).
npm run lint
# Expected: exit 0. The only new code is the test file; @ts-expect-error comments on private-field
# overwrites must be RESOLVED (i.e. actually suppress a real error) — tsc fails on unused @ts-expect-error.
# If lint reports "Unused '@ts-expect-error' directive", the private field path changed — fix the access.
```

### Level 2: Unit/Integration Tests (the suite itself + no regressions)

```bash
# Run ONLY the new parity suite (fast feedback loop while authoring).
npm test -- harness-parity
# Expected: all tests pass. If a tool-parity test fails on an isError/duration VALUE comparison, you wrote
# a value-equality assertion against an asymmetric field — convert it to SHAPE parity (see Critical #2 /
# the honest parity matrix). Do NOT edit the harnesses.

# Full suite — prove no other test regressed (the file is additive; nothing else should move).
npm test
# Expected: exit 0. If a previously-passing test now fails, the registry-reset in beforeEach/afterEach is
# leaking state — ensure HarnessRegistry._resetForTesting() + _resetInitStateForTesting() run every test.
```

### Level 3: Manual parity sanity (optional, one-shot confirmation)

```bash
# Confirm vitest actually discovers the file (count the tests):
npx vitest list src/__tests__/integration/harness-parity.test.ts 2>/dev/null | grep -c "✓\|∧\|test" || \
  npx vitest run src/__tests__/integration/harness-parity.test.ts --reporter=verbose | tail -40
# Expected: the three describe blocks (§7.14.1, §7.14.4, §7.14.6) all listed + passing.
```

### Level 4: Contract coverage self-check

```bash
# Confirm the three PRD sections named in the contract are each represented by a describe:
grep -nE "§7\.14\.(1|4|6)" src/__tests__/integration/harness-parity.test.ts
# Expected: three matches (one per section). Confirms the contract's OUTPUT ("PRD §7.14.1/4/6 verified").
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 passed: `npm run lint` exit 0 (new file type-checks; all `@ts-expect-error` are used).
- [ ] Level 2 passed: `npm test -- harness-parity` green AND `npm test` green (no regressions).
- [ ] Level 4 passed: grep confirms the three PRD §7.14.x describes are present.

### Feature Validation

- [ ] §7.14.4: success + error AgentResponse shape/key-set parity asserted for both harnesses.
- [ ] §7.14.1: ToolExecutionRequest `{name,input}` + ToolExecutionResult `{content,isError}` SHAPE parity
      asserted; namespaced names preserved; `toolCalls` value parity; isError/duration asymmetry asserted
      at shape level only (documented, not papered over).
- [ ] §7.14.6: workflow-context event-TYPE-set parity asserted via Agent + runInContext + observer.
- [ ] PiHarness shared-toolExecutor round-trip (via customTools capture) asserted.
- [ ] ClaudeCodeHarness tool counting + hooks-adapter shape asserted with the isError:false SDK limitation
      documented inline.

### Code Quality Validation

- [ ] Follows existing harness-test idioms (private-`sdk`-field overwrite; `_resetForTesting`;
      explicit vitest imports; `// @ts-expect-error - private field access for testing`).
- [ ] No production file modified; no new dependency; no config change.
- [ ] Assertions use shape/KEY-set parity where values are harness-specific or volatile — no brittle
      value-equality on asymmetric fields.
- [ ] Shared fixtures (sharedRequest, sharedToolExecutor, scripted payloads) are DRY, not copy-pasted
      per test.

### Documentation & Deployment

- [ ] Inline comments cite the PRD section + the known asymmetry (claude-code isError:false SDK limitation)
      so a future reader understands WHY a given assertion is shape-only.
- [ ] No new env vars / config / dependencies.

---

## Anti-Patterns to Avoid

- ❌ Don't **use module-level `vi.mock('@anthropic-ai/claude-agent-sdk', ...)` / `vi.mock('@earendil-
  works/pi-coding-agent', ...)`**. Both SDKs are lazy-imported inside `initialize()`; the proven, readable
  pattern across all 26 harness tests is overwriting the private `sdk` field after a real `initialize()`.
  vi.mock would require hoisted factories and fight the lazy import. (This still satisfies "mock both SDK
  imports" — the imported module is what gets stubbed.)
- ❌ Don't **assert value-equality on `onToolEnd`'s `isError`/`duration` across harnesses**. ClaudeCodeHarness
  hard-codes `isError:false` and `duration:0` (SDK limitation); PiHarness reports real values. Assert SHAPE
  parity only. Asserting equality will fail and is wrong (see Critical #2 + the honest parity matrix).
- ❌ Don't **edit `src/harnesses/*` (or any production file) to "make a parity assertion pass"**. If a test
  fails it is a test-shape problem (value-equality on an asymmetric field) — narrow the assertion. Editing
  the adapters risks regressing the 50+ existing harness unit tests and is a hard scope violation.
- ❌ Don't **compare `metadata.agentId` for equality** — it is `'pi'` vs `'claude-code'` by design. Assert
  key-set equality + the explicit per-harness values instead.
- ❌ Don't **skip the registry reset**. HarnessRegistry is a shared singleton; without `_resetForTesting()`
  + `_resetInitStateForTesting()` in BOTH beforeEach and afterEach, mocked instances leak across files and
  randomly break other suites.
- ❌ Don't **let the workflow-context test assert deep event value-equality** (timestamps/durations inside
  events are volatile). Assert the event-TYPE SET is equal — that is the §7.14.6 contract.
- ❌ Don't **invent a second mocking technique for the §7.14.6 block** (e.g. a hand-rolled fake Harness
  object). Register the REAL mocked `PiHarness`/`ClaudeCodeHarness` instances so the Agent exercises the
  genuine harness code paths — that is what "parity" must prove.
- ❌ Don't **compare arbitrary `data` payloads without scripting both mocks to the same value**.
  ClaudeCodeHarness data = `result.structured_output ?? result.result`; PiHarness data = last turn text.
  Script both to e.g. `'PARITY_DATA'` so the comparison is meaningful.
- ❌ Don't **call real `configureHarnesses()`/`configureProviders()` without resetting** — it mutates the
  global config singleton and leaks into other tests. Avoid it entirely if the default cascade suffices;
  otherwise `resetGlobalConfig()` in afterEach.

---

## Confidence Score

**8 / 10** for one-pass implementation success.

**Rationale:** The mocking recipes, scripted payloads, registry-reset discipline, and the exact metadata
key-set are all lifted verbatim from the proven harness unit tests, so the AgentResponse (§7.14.4) and
PiHarness tool-round-trip blocks are low-risk. The residual risk is concentrated in the two genuinely
subtle areas, both fully documented above: (a) the **tool-execution architectural asymmetry** — an
implementer who does not read Critical #2 will write `isError` value-equality assertions that fail and may
then wrongly try to edit the harness; the honest parity matrix + Anti-Patterns mitigate this; and (b) the
**workflow-context block** (`runInContext` + observer + Agent resolving a mocked harness from the registry)
which has more moving parts and may need one iteration to land the right event-type set. No external/library
research was needed — this is a self-contained test fully specified by the codebase + the referenced unit
tests + findings.md. The parallel item P4.M1.T1.S2 touches only `examples/` and `docs/` (never `src/`), so
there is zero merge conflict.
