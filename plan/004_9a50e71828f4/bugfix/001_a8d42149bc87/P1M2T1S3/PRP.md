# PRP — P1.M2.T1.S3: Regression test — PiHarness tool call invokes `toolExecutor` with `{name, input}` and returns its result (PRD §7.10 contract)

> **Scope note (READ FIRST):** This subtask is a **regression test only** — it modifies NO source
> code. It asserts the wiring shipped in **P1.M2.T1.S2** (verified applied: `buildCustomTools(toolExecutor?)`
> + both call sites thread `toolExecutor` + `toPiCustomTools(toolExecutor?)` rebinds `execute` to the
> caller's executor and converts via `toAgentToolResultFromExecResult`). S1 (`toAgentToolResultFromExecResult`,
> public, `mcp-handler.ts:~292`) is also shipped. This PRP delivers a single NEW test file that proves
> PRD §7.10 end-to-end and that would have caught Issue 2 before it shipped.

---

## Goal

**Feature Goal**: Create a focused regression test that asserts the PRD §7.10 contract for PiHarness:
when a Pi tool call is dispatched (simulated by invoking the `customTool`'s `execute` — the exact
closure the Pi SDK calls in production), the caller-supplied `toolExecutor` is invoked with
`{ name, input }` and its `ToolExecutionResult` is returned, converted to an
`AgentToolResult<{ isError: boolean }>` via `toAgentToolResultFromExecResult`.

**Deliverable**: ONE new test file — `src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts`.
No source edits. No edits to `pi-harness-customtools.test.ts` (it is the S2 backward-compat sentinel
and must stay byte-for-byte unchanged).

**Success Definition**:
1. `npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts` is green.
2. The test asserts BOTH halves of the contract:
   - (f) `expect(agentToolExecutor).toHaveBeenCalledWith(expect.objectContaining({ name: 'srv__ping', input: { x: 'val' } }))`
   - (g) the returned `AgentToolResult` has `content[0].text === 'agent-srv__ping'` AND
     `details.isError === false` (proving `toAgentToolResultFromExecResult` was used, not the blind
     `toAgentToolResult`).
3. The test FAILS on pre-S2 code (`agentToolExecutor` never called / a tool-result text containing
   `"No executor registered for inprocess tool 'srv__ping'"` with `isError: true`) — i.e. it is a
   genuine regression sentinel for Issue 2.
4. `npm test` introduces NO new failures (the one pre-existing `edge-case.test.ts` unicode failure
   is out of scope — PRD §h3.4).

---

## Why

- **Closes the Issue 2 testing gap.** The existing `pi-harness-customtools.test.ts` passes an
  `executor` arg to `execute()` but **never asserts it is called** — its fake `session.prompt` is a
  no-op that never triggers a tool call (Finding 8 of
  `architecture/issue2-piharness-toolexecutor.md`). That is precisely why Issue 2 slipped through CI
  despite a "passing" test suite. This PRP adds the assertion that was missing.
- **Asserts the PRD §7.10 contract directly** ("When Pi emits a `tool_call`, the adapter invokes
  `toolExecutor` and returns the `ToolExecutionResult`") — the round-trip:
  `Agent.toolExecutor` → `ToolExecutionResult` → `AgentToolResult<{isError}>`.
- **Locks in the S2 fix.** Any future refactor that re-breaks the `toolExecutor` wiring (e.g. someone
  removes the `toolExecutor` param from `buildCustomTools`/`toPiCustomTools`, or swaps
  `toAgentToolResultFromExecResult` back for the blind `toAgentToolResult`) will turn this test red.
- **Documents the non-obvious fake-session limitation** (see "Critical Design Rationale") so future
  authors don't waste time trying to trigger tool dispatch via scripted `turn_end` events alone.

---

## What

A single Vitest file using the **canonical Pi SDK mock idiom** (private-field overwrite after real
`initialize()` — NOT `vi.mock`). The test:

1. Constructs a real `PiHarness`, calls `initialize()`, registers an **inprocess** tool
   (`srv__ping` with `input_schema {x:string}`) via `registerMCPs`.
2. Wires a fake session (`makeFakeSession` + `wirePi`, copied verbatim from the parity suite) with
   minimal events so `execute()` resolves cleanly.
3. Defines `const agentToolExecutor = vi.fn(async (req) => ({ content: 'agent-' + req.name, isError: false }))`.
4. Calls `harness.execute({ prompt: 'hi', options: {} }, agentToolExecutor)` — this runs S2's
   `buildCustomTools(toolExecutor)` → `toPiCustomTools(toolExecutor)`, producing the rebound
   `customTools` and passing them into `createAgentSession`.
5. **Captures** the customTools actually handed to the Pi session via
   `pi.sdk.createAgentSession.mock.calls[0][0].customTools`.
6. **Directly invokes** `customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {})` —
   the faithful simulation of the Pi SDK dispatching a tool call (the fake session cannot do this
   itself — see "Critical Design Rationale").
7. Asserts (f) and (g) above.

A second test case documents the **error-propagation** branch: a `toolExecutor` that throws is
caught and degraded to an `AgentToolResult` with `details.isError === true` (mirrors the S2
try/catch), proving a throwing executor never crashes the session.

### Success Criteria

- [ ] New file `src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts` exists and is green.
- [ ] Primary test asserts `agentToolExecutor` is called with `{ name: 'srv__ping', input: { x: 'val' } }`.
- [ ] Primary test asserts returned `AgentToolResult`: `content[0].text === 'agent-srv__ping'` AND `details.isError === false`.
- [ ] Primary test asserts `agentToolExecutor` was called **exactly once**.
- [ ] Secondary test asserts a throwing `toolExecutor` yields `details.isError === true` and does NOT
  propagate the exception.
- [ ] NO edits to `pi-harness-customtools.test.ts`, `pi-harness.ts`, or `mcp-handler.ts`.
- [ ] `npm test` shows no new failures vs. the pre-S3 baseline.

---

## All Needed Context

### Context Completeness Check

> "If someone knew nothing about this codebase, would they have everything needed to implement this
> successfully?" — **YES.** Every helper factory, event payload, import path, line number, and
> assertion is named verbatim below and verified against the post-S2 source.

### Documentation & References

```yaml
# MUST READ — the contract + the bug analysis (Finding 8 is the whole reason this test exists)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue2-piharness-toolexecutor.md
  why: "Finding 8 proves the existing pi-harness-customtools.test.ts never asserts toolExecutor is
        called (the fake prompt is a no-op). Finding 5 shows toPiCustomTools dispatches to
        registered.executor (now rebond to toolExecutor by S2). Finding 7 shows the old
        toAgentToolResult stringified blindly — S1/S2 fixed this via toAgentToolResultFromExecResult.
        The 'Steps to Reproduce' shows the exact expected round-trip this test encodes."
  critical: "The 'Constraints/Risks' #6 documents the pre-fix 'No executor registered for inprocess
        tool srv__ping' throw — this is the regression sentinel (the test must FAIL with that on
        pre-S2 code)."

# MUST READ — the Pi SDK mock idiom (copy makeFakeSession/wirePi verbatim from here)
- file: src/__tests__/integration/harness-parity.test.ts
  why: "Lines 46-80 define makeFakeSession(events) + wirePi(harness, events) — the gold-standard
        private-field-overwrite-after-real-initialize() pattern. Lines 107-159 define piTurnEndText
        + piTurnEndTool event factories. THIS is where the helpers come from."
  pattern: "private-field overwrite via `// @ts-expect-error - private field access for testing`;
        createAgentSession is `vi.fn().mockResolvedValue({ session: fakeSession })`. The fake
        session's subscribe captures the listener; prompt replays events to it."

# MUST READ — the closest sibling test (same pattern, same directory, same import depths)
- file: src/__tests__/unit/providers/pi-harness-execute.test.ts
  why: "Proves the execute()-to-success path with makeFakeSession + `options: {}` works (model
        resolution via the default 'claude-sonnet-4-20250514' + in-memory ModelRegistry set up by
        real initialize()). Copy its wireFakeSession, SESSION_START/AGENT_END, and turnEndText."
  pattern: "beforeEach: `new PiHarness(); await harness.initialize(); HarnessRegistry._resetForTesting();
        HarnessRegistry.getInstance()._resetInitStateForTesting(); vi.clearAllMocks();`. afterEach
        repeats the two resets."

# MUST READ — the test this MUST NOT modify (the backward-compat sentinel)
- file: src/__tests__/unit/providers/pi-harness-customtools.test.ts
  why: "Finding 8 — this file passes `executor` to execute() but never asserts it is called. S2's PRP
        mandates it stay byte-for-byte unchanged. S3 = a NEW file. Do NOT edit this one."
  gotcha: "If you are tempted to add expect(executor).toHaveBeenCalled() HERE — stop. Put it in the
        new file. This file must keep passing as-is (it tests the fallback / shape-only path)."

# MUST READ — how inprocess tools register + namespace (the input_schema + srv__ping key)
- file: src/__tests__/unit/providers/pi-harness-registermcps.test.ts
  why: "Shows the exact MCPServer shape: `{ name:'srv', transport:'inprocess', tools:[{name,description,input_schema}] }`.
        Asserts namespacing is `serverName__toolName` → `srv__ping`. Also shows
        `harness.buildCustomTools()` (via @ts-expect-error) returns one ToolDefinition per tool —
        confirming the captured customTools will have length 1 with name 'srv__ping'."

# MUST READ — the S2 fix being tested (the rebound execute closure + converter)
- file: src/core/mcp-handler.ts
  why: "toPiCustomTools(toolExecutor?) (~L236): the `if (toolExecutor)` branch calls
        `toolExecutor({ name: fullName, input: params })` then
        `this.toAgentToolResultFromExecResult(res)`. toAgentToolResultFromExecResult (~L292):
        reads result.content (string passthrough) + result.isError →
        `{ content:[{type:'text',text}], details:{isError} }`. THIS is what the test asserts."
  pattern: "execute signature is `async (_toolCallId, params, _signal, _onUpdate, _ctx)` — the 5
        positional args. Direct-invocation call must pass all 5:
        `customTools[0].execute('tc1', {x:'val'}, undefined, undefined, {})`."

# MUST READ — the S2 PRP (defines the exact contract S3 must assert)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M2T1S2/PRP.md
  why: "Its 'Success Criteria' + 'DOWNSTREAM CONSUMER' blocks define the contract: when toolExecutor
        is provided, execute calls toolExecutor({name:fullName, input:params}) and converts via
        toAgentToolResultFromExecResult. S3 asserts exactly that."

# READ — test conventions (imports, resets, lint scope, @ts-expect-error discipline)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md
  why: "§6 = the Pi mock idiom. §9 = TS config (imports MUST use .js; tests EXCLUDED from tsc lint;
        @ts-expect-error required for private-field writes). §10 = the cheat sheet (registry reset
        in beforeEach AND afterEach)."
```

### Current Codebase Tree (relevant slice)

```bash
src/
  core/
    mcp-handler.ts          # toPiCustomTools(toolExecutor?) + toAgentToolResultFromExecResult — READ ONLY (verified applied)
  harnesses/
    pi-harness.ts           # buildCustomTools(toolExecutor?) + 2 call sites — READ ONLY (verified applied)
  types/
    harnesses.ts            # ToolExecutionRequest {name,input} / ToolExecutionResult {content,isError} — READ ONLY
  __tests__/
    unit/
      providers/
        pi-harness-customtools.test.ts   # READ ONLY — must NOT edit (backward-compat sentinel)
        pi-harness-execute.test.ts       # pattern source (makeFakeSession + execute-to-success)
        pi-harness-registermcps.test.ts  # pattern source (inprocess MCPServer shape + namespacing)
        pi-harness-toolexecutor.test.ts  # <-- NEW FILE (this PRP's deliverable)
    integration/
      harness-parity.test.ts             # pattern source (makeFakeSession/wirePi + event factories)
```

### Desired Codebase Tree With Files To Be Added

```bash
src/
  __tests__/
    unit/
      providers/
        pi-harness-toolexecutor.test.ts   # NEW — the §7.10 regression test
# NO source-file edits. NO edits to other test files.
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: The fake session CANNOT auto-invoke customTools. makeFakeSession's prompt() only
// replays scripted events to the listener captured via session.subscribe. The PiHarness.execute()
// listener aggregates text/usage/tool-call-count and fires hooks — it NEVER calls
// customTools[i].execute. In real Pi, tool dispatch happens INSIDE the Pi SDK's internal loop
// (the SDK calls customTools[i].execute(toolCallId, params, signal, onUpdate, ctx) when the model
// emits a tool call). The fake cannot replicate that because it doesn't hold the customTools.
// THEREFORE: scripting a piTurnEndTool ALONE fires hooks but NEVER triggers toolExecutor.
// The faithful, robust approach is to capture customTools from
// `pi.sdk.createAgentSession.mock.calls[0][0].customTools` and DIRECTLY invoke
// `customTools[0].execute('tc1', {x:'val'}, undefined, undefined, {})`.

// CRITICAL: Use the Pi customTool execute signature EXACTLY — 5 positional args:
//   execute(toolCallId, params, signal, onUpdate, ctx)
// Call it as: await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});
// (matches the closure at mcp-handler.ts: `(_toolCallId, params, _signal, _onUpdate, _ctx)`).

// CRITICAL: agentToolExecutor's content is a STRING (`'agent-' + req.name` = 'agent-srv__ping').
// toAgentToolResultFromExecResult passes string content through unchanged (typeof === 'string' →
// no JSON.stringify). So content[0].text === 'agent-srv__ping' (NOT '"agent-srv__ping"' and NOT
// a JSON envelope). If you accidentally returned an OBJECT as content, the converter would
// JSON.stringify it — keep content a string to assert the clean passthrough.

// CRITICAL: This is a NEW FILE. Do NOT edit pi-harness-customtools.test.ts — S2's PRP mandates it
// stay byte-for-byte unchanged as the backward-compat sentinel for the undefined-toolExecutor
// fallback path. The §7.10 assertion belongs in the new file.

// GOTCHA: `npm run lint` (tsc --noEmit) EXCLUDES src/__tests__ (tsconfig.json exclude). So lint
// will NOT catch type errors in the new test. The test is validated ONLY by `vitest run`. esbuild
// strips types without checking — a type error won't fail the run unless it's a syntax error.
// Still: use `import type { ... }` for type-only imports (isolatedModules) and `.js` extensions on
// all source imports (bundler resolution maps .js → .ts).

// GOTCHA: Import depths from src/__tests__/unit/providers/:
//   import { PiHarness } from '../../../harnesses/pi-harness.js';
//   import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
//   import type { HarnessRequest, ToolExecutionRequest, ToolExecutionResult } from '../../../types/harnesses.js';

// GOTCHA: Private-field overwrite of harness.sdk REQUIRES the `// @ts-expect-error - private field
// access for testing` comment (strict mode). Copy wirePi verbatim — it already has it.

// GOTCHA: Registry reset is REQUIRED in BOTH beforeEach AND afterEach:
//   HarnessRegistry._resetForTesting();
//   HarnessRegistry.getInstance()._resetInitStateForTesting();
// Real PiHarness.initialize() touches the registry singleton; failing to reset leaks state across
// files and causes flaky "harness already initialized" / singleton errors.

// GOTCHA: The namespaced tool key is `srv__ping` (serverName + '__' + toolName) — verified by
// pi-harness-registermcps.test.ts. The captured customTools[0].name must equal 'srv__ping'.

// GOTCHA: model resolution works with options: {} — pi-harness-execute.test.ts proves execute()
// reaches createAgentSession using the default 'claude-sonnet-4-20250514' + the in-memory
// ModelRegistry that real initialize() sets up. No model pre-registration or ANTHROPIC_API_KEY
// needed in this test.

// GOTCHA: Use expect.objectContaining({ name: 'srv__ping', input: { x: 'val' } }) for the
// partial-match assertion on the toolExecutor call arg (the req object may carry extra fields in
// future; objectContaining future-proofs the assertion to the {name, input} contract).
```

---

## Critical Design Rationale — why direct `customTools[0].execute()` invocation (not scripted events)

The item's step (e) offers "EITHER scripts a `piTurnEndTool` that triggers the tool, OR directly
invokes the captured `customTools[0].execute(...)`." **This PRP mandates the second (direct
invocation) as the primary assertion.** Reasoning:

1. The fake `AgentSession` (`makeFakeSession`) only replays scripted events to the listener that
   `PiHarness.execute()` registered via `session.subscribe`. That listener aggregates assistant
   text, token usage, and **counts** `toolCall` blocks — but it **never dispatches** them.
2. In production, the Pi SDK's *internal* turn loop is what calls
   `customTools[i].execute(toolCallId, params, signal, onUpdate, ctx)` when the model emits a
   tool call. The fake session has no access to `customTools` (they're passed to
   `createAgentSession`, which the fake replaces) and therefore cannot replicate that dispatch.
3. Scripting `piTurnEndTool` + `piToolExecStart`/`piToolExecEnd` fires the `onToolStart`/`onToolEnd`
   **hooks** (via `fireHookEvents`) — useful for hook parity (already covered by
   `harness-cache-hooks-parity.test.ts`) — but it does NOT prove the `toolExecutor` bridge.
4. Directly invoking `customTools[0].execute(...)` is the **exact code path** the Pi SDK would
   exercise: it runs S2's rebound closure (`toolExecutor({name, input})` →
   `toAgentToolResultFromExecResult`), which is precisely the PRD §7.10 contract under test.

> Optional belt-and-suspenders: a test MAY additionally script `piTurnEndTool('srv__ping', {x:'val'}, …)`
> and assert `response.metadata.toolCalls === 1` (proving the counting/aggregation path is
> intact), but the `agentToolExecutor` call assertion MUST come from the direct invocation. Do not
> rely on scripted events to trigger the executor.

---

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts — scaffolding + helpers
  - CREATE the file with this header (PRP + contract reference):
      /**
       * Regression test for PRD §7.10 — PiHarness toolExecutor bridge (P1.M2.T1.S3).
       *
       * Asserts: when a Pi tool call is dispatched (via the customTool's `execute` closure — the
       * exact closure the Pi SDK calls in production), the caller-supplied `toolExecutor` is
       * invoked with { name, input } and its ToolExecutionResult is returned, converted to an
       * AgentToolResult<{ isError }> via MCPHandler.toAgentToolResultFromExecResult.
       *
       * This is the missing assertion that let Issue 2 slip through (the legacy
       * pi-harness-customtools.test.ts passed an executor arg but never asserted it was called).
       * Fails on pre-S2 code (toolExecutor never called / "No executor registered" isError result).
       */
  - IMPORTS (exact depths, .js extensions, import type for types):
      import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
      import { PiHarness } from '../../../harnesses/pi-harness.js';
      import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
      import type { HarnessRequest, ToolExecutionRequest, ToolExecutionResult } from '../../../types/harnesses.js';
  - COPY the helper factories VERBATIM from harness-parity.test.ts:46-80 (or pi-harness-execute.test.ts:26-55):
      type FakeEvent = Record<string, unknown> & { type: string };
      function makeFakeSession(events: FakeEvent[]) { ... }   // subscribe captures listener; prompt replays
      function wirePi(harness: PiHarness, events: FakeEvent[]) { ... }  // private-field overwrite
  - COPY the event factories needed for a GREEN execute() (verbatim from harness-parity.test.ts):
      const SESSION_START = { type: 'session_start', reason: 'startup' };
      const AGENT_END = { type: 'agent_end', messages: [] };
      function turnEndText(text, {input, output}, turnIndex=0) { ... }  // assistant text turn
      (These are sufficient — a clean execute() needs session_start + one turn_end text + agent_end.)

Task 2: ADD the primary contract test — describe('PiHarness §7.10 — toolExecutor bridge')
  - BEFORE EACH / AFTER EACH (copy pi-harness-execute.test.ts pattern):
      beforeEach: harness = new PiHarness(); await harness.initialize();
                  HarnessRegistry._resetForTesting();
                  HarnessRegistry.getInstance()._resetInitStateForTesting();
                  vi.clearAllMocks();
      afterEach:  HarnessRegistry.getInstance()._resetInitStateForTesting();
                  HarnessRegistry._resetForTesting();
  - TEST BODY (the round-trip):
      // (a)+(b) construct + init + register an inprocess tool
      await harness.registerMCPs([{
        name: 'srv',
        transport: 'inprocess',
        tools: [{
          name: 'ping',
          description: 'd',
          input_schema: { type: 'object', properties: { x: { type: 'string' } } },
        }],
      }]);

      // (c) the caller-supplied executor (Agent.toolExecutor stand-in)
      const agentToolExecutor = vi.fn(
        async (req: ToolExecutionRequest): Promise<ToolExecutionResult> => ({
          content: 'agent-' + req.name,   // STRING — converter passes through unchanged
          isError: false,
        }),
      );

      // (b-wire) wire the fake session with minimal events so execute() resolves cleanly
      wirePi(harness, [SESSION_START, turnEndText('done', { input: 1, output: 1 }), AGENT_END]);

      // (d) drive execute() — this runs S2's buildCustomTools(toolExecutor) → toPiCustomTools(toolExecutor)
      await harness.execute({ prompt: 'hi', options: {} }, agentToolExecutor);

      // (e) capture the customTools actually handed to the Pi session
      // @ts-expect-error - private field access for testing
      const createAgentSessionMock = harness.sdk!.createAgentSession;
      const capturedOpts = createAgentSessionMock.mock.calls[0][0];
      const customTools = capturedOpts.customTools;

      // sanity: the rebound tool is present + namespaced
      expect(customTools).toHaveLength(1);
      expect(customTools[0].name).toBe('srv__ping');
      expect(typeof customTools[0].execute).toBe('function');

      // (e) DIRECTLY invoke the customTool's execute — the faithful simulation of Pi SDK dispatch
      const result = await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});

      // (f) toolExecutor invoked with { name, input } — exactly once
      expect(agentToolExecutor).toHaveBeenCalledTimes(1);
      expect(agentToolExecutor).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'srv__ping', input: { x: 'val' } }),
      );

      // (g) result converted via toAgentToolResultFromExecResult (clean passthrough — NOT JSON envelope)
      expect(result.content[0].text).toBe('agent-srv__ping');   // string content → no JSON.stringify
      expect(result.details.isError).toBe(false);

Task 3: ADD the error-propagation test — a throwing toolExecutor degrades to isError:true
  - Same setup as Task 2 (registerMCPs + wirePi + execute).
  - agentToolExecutor = vi.fn(async () => { throw new Error('boom'); });
  - const result = await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});
  - Assertions:
      expect(result.details.isError).toBe(true);
      expect(result.content[0].text).toContain('boom');   // S2 try/catch → "Error: boom"
      // the exception did NOT propagate out of execute (no throw) — proven by reaching the asserts.
  - WHY: locks in the S2 contract that a failing executor degrades gracefully (mirrors the
    registered.executor error path) and never crashes the Pi session.

Task 4: VERIFY (no code) — confirm the test is a genuine regression sentinel
  - Run `npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts` → GREEN.
  - (Optional, to prove the sentinel) temporarily revert S2 (git stash / revert the
    buildCustomTools/toPiCustomTools param threading), re-run → expect FAILURE:
      - `agentToolExecutor` called 0 times (toHaveBeenCalledTimes(1) fails), AND
      - `result.details.isError === true` with text containing
        "No executor registered for inprocess tool 'srv__ping'" (the pre-fix throw, caught).
    Then restore S2. Do NOT commit the revert.
```

### Implementation Patterns & Key Details

```typescript
// === makeFakeSession + wirePi — copy verbatim from harness-parity.test.ts:46-80 ===
type FakeEvent = Record<string, unknown> & { type: string };

function makeFakeSession(events: FakeEvent[]) {
  let listener: ((e: FakeEvent) => void) | null = null;
  return {
    subscribe: vi.fn((l: (e: FakeEvent) => void) => {
      listener = l;
      return () => { listener = null; };
    }),
    prompt: vi.fn(async (_text: string) => {
      for (const e of events) listener?.(e);
    }),
  };
}

function wirePi(harness: PiHarness, events: FakeEvent[]) {
  const fakeSession = makeFakeSession(events);
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
  };
  return { harness, fakeSession };
}

// === Capturing the customTools handed to createAgentSession ===
// After `await harness.execute(...)`, the mock recorded the call:
// @ts-expect-error - private field access for testing
const createAgentSessionMock = harness.sdk!.createAgentSession;
const capturedOpts = createAgentSessionMock.mock.calls[0][0];
const customTools = capturedOpts.customTools;   // ToolDefinition[] built by buildCustomTools(toolExecutor)

// === The contract assertions (f) and (g) ===
const result = await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});

expect(agentToolExecutor).toHaveBeenCalledTimes(1);
expect(agentToolExecutor).toHaveBeenCalledWith(
  expect.objectContaining({ name: 'srv__ping', input: { x: 'val' } }),
);
expect(result.content[0].text).toBe('agent-srv__ping');   // toAgentToolResultFromExecResult string passthrough
expect(result.details.isError).toBe(false);

// === WHY objectContaining (not toEqual) on the toolExecutor arg ===
// The ToolExecutionRequest contract is { name, input }. objectContaining future-proofs the
// assertion against the closure ever passing extra fields, and matches the item's step (f) verbatim.
```

### Integration Points

```yaml
TEST REGISTRY:
  - The new file participates in the `src/__tests__/**/*.test.ts` glob (vitest.config.ts) — it is
    auto-collected by `npm test` / `vitest run`. No registration edit needed.
  - Follows the reset convention (HarnessRegistry._resetForTesting + _resetInitStateForTesting in
    beforeEach AND afterEach) so it does not leak singleton state to siblings.

DEPENDENCIES (all already shipped — this task imports/asserts, does not build):
  - S2 (Complete): buildCustomTools(toolExecutor?) + toPiCustomTools(toolExecutor?) rebind + both
    call sites thread toolExecutor. Verified present in pi-harness.ts (~L250, ~L370, ~L659) and
    mcp-handler.ts (~L236).
  - S1 (Complete): MCPHandler.toAgentToolResultFromExecResult (public, mcp-handler.ts:~L292).

NO SOURCE EDITS:
  - pi-harness.ts:        unchanged
  - mcp-handler.ts:       unchanged
  - agent.ts:             unchanged
  - pi-harness-customtools.test.ts:  unchanged (backward-compat sentinel)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# NOTE: `npm run lint` (tsc --noEmit) EXCLUDES src/__tests__ — it will NOT type-check this file.
# Tests are validated ONLY by vitest (esbuild strips types without full checking). So:
npm run lint
# Expected: zero errors (confirms no accidental edit leaked into src/ source files; this task
# touches ONLY a new test file, so lint must remain clean).

# If you want a best-effort type check of the test file itself (not enforced by CI):
npx tsc --noEmit --skipLibCheck src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts || true
```

### Level 2: Unit Tests (the actual validation — Component Validation)

```bash
# The new regression test — must be GREEN:
npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts
# Expected: 2 passing (primary contract + error-propagation).
# If the primary test fails with "expected 1 call, got 0" → S2's wiring is missing/not applied
#   (verify `grep -n "buildCustomTools(toolExecutor)" src/harnesses/pi-harness.ts` shows 2 call sites).
# If it fails with result.details.isError === true / text "No executor registered..." → same root cause
#   (the fallback registered.executor path is firing instead of the toolExecutor branch).

# Backward-compat sentinel — must STILL pass unchanged (proves the fallback path is intact):
npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts
# Expected: 3 passing (delegation, empty delegation, execute() integration).

# The S2/S1 mcp-handler tests — must still pass:
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts
npx vitest run src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts   # if present
```

### Level 3: Full Suite (System Validation)

```bash
# Confirm NO new failures introduced:
npm test
# Expected: same pass/fail count as the pre-S3 baseline MINUS zero. The ONE pre-existing failure
# (src/__tests__/adversarial/edge-case.test.ts unicode — PRD §h3.4) is OUT OF SCOPE and must remain
# the only failure. If a NEW failure appears, it is a regression from this task — fix it.

# Static proof the contract wiring is in place (S2 applied — this test asserts runtime behavior):
grep -n "buildCustomTools(toolExecutor)" src/harnesses/pi-harness.ts
# Expected: 2 hits (L250 non-streaming, L370 streaming).
```

### Level 4: Regression-Sentinel Proof (Creative / Domain-Specific)

```bash
# Prove the test genuinely catches Issue 2 (FAILS on pre-S2 code). OPTIONAL but recommended
# before marking S3 complete — do NOT commit any of these temp changes.

# 1. Temporarily neutralize S2 at the call site (simulate pre-fix):
#    Edit src/harnesses/pi-harness.ts L250: this.buildCustomTools(toolExecutor)  →  this.buildCustomTools()
#    (drops the toolExecutor arg so toPiCustomTools falls back to registered.executor)
sed -i 's/this.buildCustomTools(toolExecutor)/this.buildCustomTools()/' src/harnesses/pi-harness.ts
npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts
# Expected: FAILURE — agentToolExecutor called 0 times; result.details.isError === true with text
#   "No executor registered for inprocess tool 'srv__ping'..." (the pre-fix symptom).
# 2. RESTORE S2:
git checkout -- src/harnesses/pi-harness.ts
npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts
# Expected: GREEN again. Sentinel confirmed.

# (If you'd rather not mutate source: reason about it — on pre-S2, buildCustomTools() is zero-arg
#  and toPiCustomTools() has no toolExecutor branch, so execute() dispatches to registered.executor,
#  which throws for the un-pre-registered inprocess 'srv__ping'. The try/catch converts that to an
#  isError:true result and agentToolExecutor is never called. Both Task-2 asserts fail.)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npx vitest run src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts` is GREEN (2 tests).
- [ ] `npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts` still GREEN (unchanged).
- [ ] `npm run lint` clean (no accidental source edits).
- [ ] `npm test` has NO new failures (only the pre-existing `edge-case.test.ts` unicode failure remains).
- [ ] Regression-sentinel proof (Level 4): the test FAILS when S2's `toolExecutor` threading is removed.

### Feature Validation (the PRD §7.10 contract)

- [ ] Primary test asserts `agentToolExecutor` called with `{ name: 'srv__ping', input: { x: 'val' } }`.
- [ ] Primary test asserts `agentToolExecutor` called exactly once.
- [ ] Primary test asserts returned `AgentToolResult`: `content[0].text === 'agent-srv__ping'` AND `details.isError === false`.
- [ ] Error-propagation test asserts a throwing `toolExecutor` → `details.isError === true`, text contains the message, no exception propagates.
- [ ] CustomTools are captured from `createAgentSession.mock.calls[0][0].customTools` (proves the rebound tools reached the Pi session).

### Code Quality Validation

- [ ] `makeFakeSession` / `wirePi` copied verbatim from `harness-parity.test.ts` (no reinvented mock idiom).
- [ ] Imports use `.js` extensions + relative paths + `import type` for types (isolatedModules compliant).
- [ ] `@ts-expect-error - private field access for testing` present on the `harness.sdk` overwrite.
- [ ] Registry reset present in BOTH `beforeEach` AND `afterEach`.
- [ ] File placement matches the desired tree (`src/__tests__/unit/providers/pi-harness-toolexecutor.test.ts`).

### Scope Discipline

- [ ] NO edits to `src/harnesses/pi-harness.ts`, `src/core/mcp-handler.ts`, or `src/core/agent.ts`.
- [ ] NO edits to `pi-harness-customtools.test.ts` (backward-compat sentinel — must remain unchanged).
- [ ] NO edits to `PRD.md`, `tasks.json`, `prd_snapshot.md`, or `.gitignore`.
- [ ] Only ONE new file is created.

---

## Anti-Patterns to Avoid

- ❌ Don't edit `pi-harness-customtools.test.ts` to add the `expect(executor).toHaveBeenCalled()`
  assertion — S2's PRP mandates that file stay byte-for-byte unchanged. Put the assertion in the NEW file.
- ❌ Don't rely on scripting a `piTurnEndTool` event to trigger the `toolExecutor` — the fake session's
  `prompt()` only replays events to the listener, which never dispatches tools. Use direct
  `customTools[0].execute(...)` invocation (see "Critical Design Rationale").
- ❌ Don't assert the toolExecutor arg with `toEqual({ name:'srv__ping', input:{x:'val'} })` — use
  `expect.objectContaining(...)` so the assertion is robust to extra fields and matches the contract shape.
- ❌ Don't return an OBJECT as the executor's `content` and then assert `content[0].text === 'agent-srv__ping'`
  — the converter stringifies non-string content. Keep `content` a string to assert clean passthrough
  (this is also what proves `toAgentToolResultFromExecResult`, not the blind `toAgentToolResult`, was used).
- ❌ Don't skip the `@ts-expect-error` on the private `harness.sdk` overwrite (strict mode requires it;
  other files in this directory all have it).
- ❌ Don't skip the registry reset in `afterEach` — it leaks singleton state and flakes sibling tests.
- ❌ Don't `vi.mock` the Pi SDK module — the proven pattern is private-field overwrite after real
  `initialize()` (see test-patterns-and-conventions.md §6). Every harness test uses it.
- ❌ Don't add a third test that duplicates `harness-cache-hooks-parity.test.ts`'s hook-firing coverage —
  hook parity is out of scope; this task is the §7.10 toolExecutor round-trip only.
- ❌ Don't modify `src/` source to "make the test pass" — S2 already shipped the fix; if the test fails,
  the bug is in the test (wrong mock shape, wrong execute arg count, etc.), not the source.

---

## Confidence Score

**9/10** — The contract is exceptionally precise and S1+S2 are verified applied in source. The one
non-obvious trap (the fake session cannot auto-invoke `customTools`, so direct invocation is required)
is explicitly documented in "Critical Design Rationale" and the item itself recommends the
direct-invocation path. Every helper factory, event payload, import depth, assertion, and the
pre-S2 failure mode ("No executor registered for inprocess tool 'srv__ping'") is named verbatim.
Residual risk is minimal: a typo in the customTool `execute` arg count (must pass all 5 positionals)
or a forgotten `@ts-expect-error` — both caught immediately by `vitest run`.
