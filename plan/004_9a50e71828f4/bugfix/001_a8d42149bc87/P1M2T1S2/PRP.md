# PRP — P1.M2.T1.S2: Thread `toolExecutor` into `PiHarness.buildCustomTools` and rebind each tool's `execute`; update both call sites

> **Scope note (READ FIRST):** This subtask wires the caller-supplied `toolExecutor` into the Pi
> tool-dispatch path. It builds on **P1.M2.T1.S1** (which shipped `MCPHandler.toAgentToolResultFromExecResult`
> — verified present and `public` at `src/core/mcp-handler.ts:292`). It does **NOT** add the
> regression test asserting `toolExecutor` is invoked — that is **P1.M2.T1.S3**. Keep this change
> tightly scoped to the two source files named below + the optional-parameter fallback.

---

## Goal

**Feature Goal**: Make `PiHarness.execute()` / `executeStreaming()` honor PRD §7.10 — when Pi emits
a `tool_call`, each Pi `ToolDefinition`'s `execute` must dispatch through the **caller-supplied**
`toolExecutor` (i.e. `Agent.toolExecutor`), not the harness's own internal `MCPHandler.registered.executor`.

**Deliverable**:
1. `src/core/mcp-handler.ts` — `toPiCustomTools()` gains an **optional** `toolExecutor` parameter.
   When provided, each tool's `execute` is rebound to call `toolExecutor({ name, input })` and
   convert the result via the S1 converter `toAgentToolResultFromExecResult`. When `undefined`,
   behavior is byte-for-byte identical to today (`registered.executor` path).
2. `src/harnesses/pi-harness.ts` — `buildCustomTools()` gains an **optional** `toolExecutor`
   parameter and forwards it to `toPiCustomTools(toolExecutor)`.
3. Both `buildCustomTools()` call sites (non-streaming L250, streaming L370) thread the in-scope
   `toolExecutor` parameter.

**Success Definition**: `grep toolExecutor src/harnesses/pi-harness.ts` shows `toolExecutor`
threaded into `buildCustomTools` at **both** call sites; the existing
`pi-harness-customtools.test.ts` passes **unchanged** (fallback preserves it); `npm run lint`
(`tsc --noEmit`) is clean; `npm test` has no new failures.

---

## Why

- **Fixes Issue 2 (PRD §7.10 violation).** Today `toolExecutor` is a dead parameter on
  `execute()`/`executeStreaming()` — `grep` confirms 3 hits (2 signatures + 1 forward) and
  **zero** call sites. Tools configured at the `Agent` level (`config.mcps`, `config.tools`,
  `request.options.tools`) are invisible/non-executable through PiHarness because dispatch flows
  through the harness's own `MCPHandler.registered.executor`, which the `Agent` never populates.
- **Completes the PRD §7.10 tool round-trip**: `Agent.toolExecutor` → `ToolExecutionResult` →
  `AgentToolResult<{isError}>` → Pi session. S1 shipped the converter; S2 (this) ships the wiring.
- **Unblocks P1.M2.T1.S3** (regression test), which asserts `toolExecutor` is actually invoked
  with `{ name, input }` when Pi calls `customTools[i].execute`.
- **Backward-compatible by design**: the optional-parameter-with-fallback approach means the
  ClaudeCode path (`toAgentSDKServer`), the existing `pi-harness-customtools.test.ts`, and the
  internal `registered.executor` path all keep working unchanged.

---

## What

A minimal, additive wiring change across two files. No new types, no new files, no behavioral
change when `toolExecutor` is `undefined`.

### The rebind (when `toolExecutor` is provided)

Each Pi `ToolDefinition.execute` becomes:

```ts
execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
  try {
    const res = await toolExecutor({ name: fullName, input: params });
    return this.toAgentToolResultFromExecResult(res);   // S1 converter — reads res.content/.isError
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return this.toAgentToolResult(`Error: ${message}`, true);   // existing error envelope
  }
}
```

- `fullName` = the `registeredTools` map key already in scope at `mcp-handler.ts:237`
  (`Array.from(this.registeredTools.entries()).map(([fullName, registered]) =>`).
- `params` = the Pi SDK's tool input (2nd positional arg of `execute`).
- Error handling mirrors the existing `registered.executor` branch (try/catch → `isError:true`),
  so a throwing `toolExecutor` degrades to a tool-error result instead of crashing the session.

### Success Criteria

- [ ] `toPiCustomTools(toolExecutor?)` — optional param; `undefined` → current `registered.executor` behavior.
- [ ] When `toolExecutor` is provided, each tool's `execute` calls `toolExecutor({ name: fullName, input: params })`.
- [ ] The `toolExecutor` result is converted via `this.toAgentToolResultFromExecResult(res)` (NOT the blind `toAgentToolResult`).
- [ ] `buildCustomTools(toolExecutor?)` — optional param forwarded to `toPiCustomTools(toolExecutor)`.
- [ ] Non-streaming call site (L250) → `customTools: this.buildCustomTools(toolExecutor)`.
- [ ] Streaming call site (L370) → `customTools: this.buildCustomTools(toolExecutor)`.
- [ ] `toolExecutor` is in scope at both call sites (it's a parameter of `execute()` at L214 and `executeStreaming()` at L350).
- [ ] Existing `pi-harness-customtools.test.ts` passes **without modification**.
- [ ] `npm run lint` clean; `npm test` has no new failures.

---

## All Needed Context

### Context Completeness Check

> "If someone knew nothing about this codebase, would they have everything needed to implement this
> successfully?" — **YES.** Every file path, line number, signature, and the exact rebind body is
> named below and verified against the post-S1 source (see
> `research/current-state-verification.md`).

### Documentation & References

```yaml
# MUST READ - The architecture investigation that defines the exact bug + contract
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue2-piharness-toolexecutor.md
  why: "Findings 1-6 prove toolExecutor is a dead parameter (3 grep hits, 0 call sites). Finding 5
        shows toPiCustomTools dispatches to registered.executor (L253). Finding 7 shows toAgentToolResult
        stringifies blindly (fixed by S1's toAgentToolResultFromExecResult). The 'Architecture' ASCII
        diagram shows the exact break: toolExecutor never reaches buildCustomTools/toPiCustomTools."
  critical: "'Constraints/Risks' #2 specifies the adapter shape mismatch and says: use fullName (the map
        key at L237) as the tool name; pass params as input. #4 mandates backward-compat (undefined →
        registered.executor fallback). #5 says do NOT touch the skills/resourceLoader path."

# MUST READ - The S1 PRP (converter this task consumes)
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/P1M2T1S1/PRP.md
  why: "S1 shipped toAgentToolResultFromExecResult (verified present at mcp-handler.ts:292, public).
        Its 'Integration Points > DOWNSTREAM CONSUMER' block specifies the EXACT rebind body S2 must
        implement: `const res = await toolExecutor({ name: t.name, input: params }); return
        this.mcpHandler.toAgentToolResultFromExecResult(res);`. S2 is that consumer."

# MUST READ - The file being modified (primary)
- file: src/harnesses/pi-harness.ts
  why: "buildCustomTools (L659-661, zero-arg one-liner) + both call sites (L250 non-streaming, L370
        streaming). toolExecutor is in scope as a parameter of execute() (L214) and executeStreaming()
        (L350)."
  pattern: "buildCustomTools is `private`; keep it private (the existing test accesses it via
        `// @ts-expect-error - Testing private method`). It returns `ToolDefinition[]`."
  gotcha: "toolExecutor is a FUNCTION-SCOPED parameter of execute/executeStreaming — it is NOT a class
        field and is NOT in scope inside buildCustomTools today. S2 must ACCEPT it as a parameter so
        the method can close over it. Both call sites must pass it explicitly."

# MUST READ - The file being modified (secondary)
- file: src/core/mcp-handler.ts
  why: "toPiCustomTools (L236-261) is where each tool's execute closure is built. fullName is the map
        key at L237. The execute signature is (_toolCallId, params, _signal, _onUpdate, _ctx). S1's
        toAgentToolResultFromExecResult is at L292 (public) — call it for the toolExecutor path.
        toAgentToolResult (private, L272) stays for the fallback + error branches."
  pattern: "The existing try/catch (L251-258) is the error-handling pattern to MIRROR for the
        toolExecutor branch: catch → `this.toAgentToolResult(\`Error: ${message}\`, true)`."
  gotcha: "Keep the `if (tools.length === 0) return [];` early-return (L238) BEFORE the map — it is
        unaffected by the optional param. defineTool is imported from @earendil-works/pi-coding-agent (L13)."

# MUST READ - The input/output types (already imported in both files)
- file: src/types/harnesses.ts
  why: "L128-131 ToolExecutionRequest = { name: string; input: unknown }. L145-150
        ToolExecutionResult = { content: string | unknown; isError: boolean }. Both are ALREADY
        imported into pi-harness.ts (execute signature uses them at L214/L350) and mcp-handler.ts
        (L21, added by S1). No new imports needed."

# MUST READ - The existing test that must keep passing unchanged
- file: src/__tests__/unit/providers/pi-harness-customtools.test.ts
  why: "Verifies backward-compat of the fallback. describe('delegation') calls buildCustomTools() with
        NO args (L79) — stays green ONLY if the new param is OPTIONAL. describe('execute() integration')
        spies toPiCustomTools with .mockReturnValue([fakeToolDef]) (L73) — the spy ignores args, so
        threading toolExecutor through does not break it. The fake tool's execute is a vi.fn that does
        NOT call toolExecutor; the test asserts SHAPE only (name, typeof execute === 'function')."
  pattern: "If you add any new assertion to this file, you are OUT OF SCOPE — the regression test
        belongs in S3 (a NEW file). This file must remain byte-for-byte unchanged."
  gotcha: "Do NOT 'fix' the fake tool's execute to call toolExecutor, and do NOT add
        expect(executor).toHaveBeenCalled() here — that is S3's job."

# MUST READ - The canonical Pi SDK mocking idiom (for S3, referenced here for context)
- file: src/__tests__/integration/harness-parity.test.ts
  why: "Lines 46-80 define makeFakeSession/wirePi — the private-field-overwrite-after-real-initialize()
        pattern S3 will use to assert toolExecutor is invoked. S2 does NOT need this, but understanding
        it confirms the wiring is testable."
```

### Current Codebase Tree (relevant slice)

```bash
src/
  core/
    mcp-handler.ts          # <-- MODIFY: toPiCustomTools gains optional toolExecutor param
  harnesses/
    pi-harness.ts           # <-- MODIFY: buildCustomTools gains optional param; 2 call sites updated
  types/
    harnesses.ts            # ToolExecutionRequest (L128) / ToolExecutionResult (L145) — READ ONLY
  __tests__/
    unit/
      providers/
        pi-harness-customtools.test.ts   # MUST pass unchanged (backward-compat sentinel)
```

### Desired Codebase Tree With Files To Be Added/Modified

```bash
src/
  core/
    mcp-handler.ts          # MODIFY: toPiCustomTools(toolExecutor?) — optional param, rebind execute
  harnesses/
    pi-harness.ts           # MODIFY: buildCustomTools(toolExecutor?); L250 + L370 pass toolExecutor
  # NO new files. NO new tests (regression test is S3).
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: toolExecutor is a FUNCTION parameter of execute()/executeStreaming(), NOT a class field.
// It is therefore NOT in scope inside buildCustomTools() today. S2 MUST add it as a parameter to
// buildCustomTools so the method can close over it. Both call sites (L250, L370) must pass it
// explicitly: `customTools: this.buildCustomTools(toolExecutor)`.

// CRITICAL: Keep the param OPTIONAL (toolExecutor?) on BOTH buildCustomTools and toPiCustomTools.
// undefined MUST fall back to the current behavior:
//   - buildCustomTools(): `return this.mcpHandler.toPiCustomTools();` (no arg → fallback)
//   - toPiCustomTools(): `registered.executor(params)` path (current L253)
// This is what keeps pi-harness-customtools.test.ts green without modification
// (describe('delegation') calls buildCustomTools() with NO args at L79).

// CRITICAL: Use fullName (the registeredTools map key, in scope at mcp-handler.ts:237) as the tool
// name passed to toolExecutor — NOT registered.tool.name. The contract is explicit:
//   const res = await toolExecutor({ name: fullName, input: params });
// fullName is the namespaced key (e.g. "srv__ping") that the Pi SDK and the caller's toolExecutor
// (Agent.toolExecutor) both key on.

// CRITICAL: Convert via toAgentToolResultFromExecResult (S1, public, L292) — NOT toAgentToolResult.
// The toolExecutor returns ToolExecutionResult { content, isError }; the S1 converter reads
// result.content (string passthrough, else JSON.stringify) and result.isError → details.isError.
// Using the blind toAgentToolResult would JSON.stringify the whole {content,isError} envelope —
// the exact bug Finding 7 documents.

// GOTCHA: Pi's execute signature is (_toolCallId, params, _signal, _onUpdate, _ctx). The 2nd param
// `params` is the tool input. Pass it as `input` in the ToolExecutionRequest. The other 4 args are
// unused (mirror the existing underscore-prefix convention).

// GOTCHA: Keep the try/catch around the toolExecutor call (mirror existing L251-258). A throwing
// toolExecutor must degrade to an AgentToolResult<{isError:true}> (via toAgentToolResult), NOT
// crash the Pi session. Do NOT let the exception propagate out of execute.

// GOTCHA: The empty-tools early-return at mcp-handler.ts:238 (`if (tools.length === 0) return [];`)
// stays BEFORE the map and is unaffected by the optional param.

// GOTCHA: buildCustomTools must remain `private` (the existing test accesses it via
// `// @ts-expect-error - Testing private method`). Do NOT make it public.

// GOTCHA: `npm run lint` is `tsc --noEmit` with `strict: true`. The optional param must be typed
// exactly as `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>` (matching the execute()
// signature at pi-harness.ts:214) — copy that type, do not invent a new alias.
```

---

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/mcp-handler.ts — add optional toolExecutor param to toPiCustomTools
  - FIND: line 236 → `public toPiCustomTools(): ToolDefinition[] {`
  - EDIT signature to:
      public toPiCustomTools(
        toolExecutor?: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
      ): ToolDefinition[] {
  - TOOL TYPE: copy the exact type from pi-harness.ts:214 — `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>`.
    ToolExecutionResult is ALREADY imported at mcp-handler.ts:21 (S1 added it); ToolExecutionRequest
    is NOT yet imported — ADD it to the same import line:
      import type { MCPServer, Tool, ToolResult, ToolExecutionResult, ToolExecutionRequest } from '../types/index.js';
    (types/index.ts re-exports both; verified.)
  - EDIT the execute closure body. CURRENT (L246-258):
      execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
        try {
          const result = await registered.executor(params);
          return this.toAgentToolResult(result, false);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return this.toAgentToolResult(`Error: ${message}`, true);
        }
      },
    NEW (branch on toolExecutor presence):
      execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
        try {
          if (toolExecutor) {
            const res = await toolExecutor({ name: fullName, input: params });
            return this.toAgentToolResultFromExecResult(res);
          }
          const result = await registered.executor(params);
          return this.toAgentToolResult(result, false);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return this.toAgentToolResult(`Error: ${message}`, true);
        }
      },
  - WHY a single closure with a runtime branch (vs. two separate defineTool calls): keeps the
    schema/label/description construction DRY and makes the fallback explicit at the dispatch site.
    The branch is cheap (one truthy check per tool call).
  - ALTERNATIVE acceptable (per architecture doc "Constraints" #4): build the whole defineTool
    conditionally — `if (toolExecutor) { ...rebind... } else { ...current... }`. Either is fine;
    the single-closure-with-branch is preferred for minimal diff.
  - DO NOT touch toAgentToolResult (L272), toAgentToolResultFromExecResult (L292), toAgentSDKServer,
    or the empty-tools early-return (L238).
  - UPDATE the JSDoc above toPiCustomTools (L226-235) to document the new optional param and that
    when provided it overrides registered.executor (PRD §7.10 bridge).

Task 2: MODIFY src/harnesses/pi-harness.ts — add optional toolExecutor param to buildCustomTools
  - FIND: lines 659-661:
      private buildCustomTools(): ToolDefinition[] {
        return this.mcpHandler.toPiCustomTools();
      }
  - EDIT to:
      private buildCustomTools(
        toolExecutor?: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
      ): ToolDefinition[] {
        return this.mcpHandler.toPiCustomTools(toolExecutor);
      }
  - TOOL TYPE: identical to execute()'s toolExecutor param (pi-harness.ts:214) — copy it verbatim.
    ToolExecutionRequest and ToolExecutionResult are ALREADY imported into pi-harness.ts (the
    execute signature at L214 uses them); no new import needed.
  - KEEP `private` (existing test relies on @ts-expect-error private access).
  - KEEP optional (`toolExecutor?`) so describe('delegation') at L79 (which calls buildCustomTools()
    with no args) still compiles and hits the fallback.
  - UPDATE the JSDoc (L654-658) to note it now forwards an optional toolExecutor (PRD §7.10 bridge).

Task 3: MODIFY src/harnesses/pi-harness.ts — thread toolExecutor into non-streaming call site
  - FIND: line 250 → `customTools: this.buildCustomTools(),`  (inside execute()'s IIFE)
  - EDIT to: `customTools: this.buildCustomTools(toolExecutor),`
  - WHY in scope: toolExecutor is a parameter of execute() at L214; this call site is inside the
    non-streaming IIFE returned at L225, which closes over the execute() parameter scope.
  - VERIFY: `grep -n "buildCustomTools" src/harnesses/pi-harness.ts` shows 2 hits, both now passing
    toolExecutor (L250 and L370).

Task 4: MODIFY src/harnesses/pi-harness.ts — thread toolExecutor into streaming call site
  - FIND: line 370 → `customTools: this.buildCustomTools(),`  (inside executeStreaming())
  - EDIT to: `customTools: this.buildCustomTools(toolExecutor),`
  - WHY in scope: toolExecutor is a parameter of executeStreaming() at L350; this call site is in
    the same generator function body.
  - DO NOT touch the `return this.executeStreaming<T>(request, toolExecutor, hooks);` forward at
    L223 — it already correctly forwards toolExecutor into executeStreaming.
```

### Implementation Patterns & Key Details

```typescript
// === mcp-handler.ts: the branched execute closure (Task 1) ===
// The `if (toolExecutor)` branch is the ONLY new logic. Everything else is verbatim from today.
execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
  try {
    if (toolExecutor) {
      // PRD §7.10 bridge: caller's toolExecutor (Agent.toolExecutor) is the dispatch target.
      const res = await toolExecutor({ name: fullName, input: params });
      return this.toAgentToolResultFromExecResult(res);  // S1 converter: reads res.content/.isError
    }
    // Fallback (toolExecutor undefined): harness's own MCPHandler executor — current behavior.
    const result = await registered.executor(params);
    return this.toAgentToolResult(result, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return this.toAgentToolResult(`Error: ${message}`, true);  // never re-throw
  }
}

// === pi-harness.ts: buildCustomTools (Task 2) ===
private buildCustomTools(
  toolExecutor?: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
): ToolDefinition[] {
  return this.mcpHandler.toPiCustomTools(toolExecutor);  // undefined → fallback inside toPiCustomTools
}

// === pi-harness.ts: both call sites (Tasks 3 & 4) ===
customTools: this.buildCustomTools(toolExecutor),   // L250 (non-streaming) AND L370 (streaming)

// WHY optional-with-fallback instead of required param:
//   1. Backward compat: pi-harness-customtools.test.ts describe('delegation') calls
//      buildCustomTools() with NO args (L79). A required param would break compilation.
//   2. The contract explicitly prefers this: "prefer keeping the fallback so the existing test
//      is untouched" (item_description §4 OUTPUT).
//   3. Agent.toolExecutor is ALWAYS bound and passed at agent.ts:496/806, so the production path
//      always supplies a real toolExecutor — the fallback only fires in unit tests that call
//      buildCustomTools()/toPiCustomTools() directly without one.
```

### Integration Points

```yaml
TYPES:
  - ToolExecutionRequest must be imported into mcp-handler.ts (ADD to existing L21 import line).
    ToolExecutionResult is already there (S1). pi-harness.ts already imports both.

CONFIG:
  - none.

ROUTES / REGISTRY:
  - none.

DOWNSTREAM CONSUMER (already wired — no Agent change needed):
  - Agent.execute path: agent.ts:496 (stream) and :806 (non-stream) already call
    `harness.execute(harnessRequest, self.toolExecutor.bind(self), harnessHooks)`.
    After S2, that toolExecutor becomes the dispatch target inside toPiCustomTools. No agent.ts edit.

UPSTREAM DEPENDENCY (already shipped — S1, Complete):
  - MCPHandler.toAgentToolResultFromExecResult (public, mcp-handler.ts:292) — the converter this
    task calls in the toolExecutor branch.

SIBLING (NOT this task):
  - P1.M2.T1.S3 will add the regression test asserting toolExecutor is invoked with {name, input}
    and its result is returned. Do NOT write that test here.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing mcp-handler.ts and pi-harness.ts
npm run lint
# Expected: zero errors. `tsc --noEmit` (strict) checks the new optional-param types.
# Common failure: "Property 'toAgentToolResultFromExecResult' does not exist on type 'MCPHandler'"
# → means S1 wasn't applied; verify src/core/mcp-handler.ts:292 has the public method.
# Common failure: "Cannot find name 'ToolExecutionRequest'" in mcp-handler.ts
# → forgot to add it to the L21 import line.

# Scoped check (faster iteration)
npx tsc --noEmit
```

### Level 2: Unit Tests (Component Validation)

```bash
# CRITICAL backward-compat sentinel — must pass UNCHANGED:
npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts
# Expected: all 3 describes pass (delegation, empty delegation, execute() integration).
# If 'delegation' fails with "Expected 0 arguments, but got 0" or similar → the toolExecutor
# param was made REQUIRED instead of optional. Fix: make it `toolExecutor?`.

# MCPHandler-level tests (toPiCustomTools behavior):
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts
# Expected: green — these test the fallback path (no toolExecutor arg) which is unchanged.

# S1 converter test (must still pass — S2 does not touch the converter):
npx vitest run src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts

# Full suite (note: ONE pre-existing UNRELATED failure in edge-case.test.ts unicode is OUT OF SCOPE —
# see PRD §h3.4 / Minor 5; do NOT attempt to fix it here).
npm test
# Expected: same pass/fail count as before S2, MINUS any new failures. The unicode failure is the
# only sanctioned pre-existing failure.
```

### Level 3: Integration Testing (System Validation)

```bash
# Static proof that toolExecutor is now threaded (the contract's OUTPUT acceptance criterion):
grep -n "buildCustomTools" src/harnesses/pi-harness.ts
# Expected (exactly 2 hits, both passing toolExecutor):
#   250:        customTools: this.buildCustomTools(toolExecutor),
#   370:        customTools: this.buildCustomTools(toolExecutor),
# (Plus the method definition at ~L659 — grep shows 3 hits total: 2 call sites + 1 definition.)

grep -n "toolExecutor" src/harnesses/pi-harness.ts
# Expected: 5 hits now (was 3):
#   214: execute() signature param
#   223: forwarded into executeStreaming(...)
#   250: customTools: this.buildCustomTools(toolExecutor)   <-- NEW
#   350: executeStreaming() signature param
#   370: customTools: this.buildCustomTools(toolExecutor)   <-- NEW

grep -n "toolExecutor" src/core/mcp-handler.ts
# Expected: hits inside toPiCustomTools signature + the `if (toolExecutor)` branch.

# No service startup needed for S2 — the end-to-end round-trip (Pi session emits tool_call →
# toolExecutor invoked) is exercised by S3's regression test, not here.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Negative control: confirm the diff is additive at the call sites (only the arg list changes).
git diff src/harnesses/pi-harness.ts | grep -E "^[-+].*buildCustomTools"
# Expected: two `-` lines (old: `this.buildCustomTools(),`) and two `+` lines
# (new: `this.buildCustomTools(toolExecutor),`), plus the method-signature change.

# Confirm ClaudeCodeHarness path is untouched (it uses toAgentSDKServer, not toPiCustomTools):
git diff src/harnesses/claude-code-harness.ts
# Expected: empty (no changes).

# Confirm toAgentToolResult (private, ClaudeCode fallback) is byte-for-byte unchanged:
git diff src/core/mcp-handler.ts | grep -E "^-" | grep -v "^---"
# Expected: NO deletions in the toAgentToolResult region. Only additions (the optional param +
# the if-branch + the ToolExecutionRequest import).
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` passes with zero errors.
- [ ] `npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts` green (unchanged file).
- [ ] `npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts` green (fallback path).
- [ ] `npx vitest run src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts` green (S1 untouched).
- [ ] `npm test` has NO new failures (the one pre-existing `edge-case.test.ts` unicode failure is out of scope).
- [ ] `grep -n "buildCustomTools" src/harnesses/pi-harness.ts` shows both call sites passing `toolExecutor`.

### Feature Validation

- [ ] `toPiCustomTools(toolExecutor?)` — optional param; when provided, `execute` calls `toolExecutor({ name: fullName, input: params })`.
- [ ] The `toolExecutor` result is converted via `toAgentToolResultFromExecResult` (NOT `toAgentToolResult`).
- [ ] When `toolExecutor` is `undefined`, `toPiCustomTools` falls back to `registered.executor` (current behavior).
- [ ] `buildCustomTools(toolExecutor?)` forwards `toolExecutor` to `toPiCustomTools`.
- [ ] Non-streaming call site (L250): `this.buildCustomTools(toolExecutor)`.
- [ ] Streaming call site (L370): `this.buildCustomTools(toolExecutor)`.
- [ ] `fullName` (the registeredTools map key) is used as the tool name, not `registered.tool.name`.

### Code Quality Validation

- [ ] Optional params use the exact type `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>` (copied from execute()'s signature).
- [ ] Error handling (try/catch → `toAgentToolResult(..., true)`) mirrors the existing pattern; a throwing toolExecutor does not crash the session.
- [ ] JSDoc on `toPiCustomTools` and `buildCustomTools` updated to document the optional param + PRD §7.10 reference.
- [ ] `buildCustomTools` remains `private`; `toPiCustomTools` and `toAgentToolResultFromExecResult` remain `public`.

### Scope Discipline

- [ ] NO changes to `src/harnesses/claude-code-harness.ts` (uses `toAgentSDKServer`, unaffected).
- [ ] NO changes to `toAgentToolResult` (private, L272) or `toAgentToolResultFromExecResult` (S1, L292).
- [ ] NO changes to `src/core/agent.ts` (already passes `self.toolExecutor.bind(self)` at L496/L806).
- [ ] NO changes to the skills/`resourceLoader` path.
- [ ] NO new regression test file (that is P1.M2.T1.S3).
- [ ] NO modification to `pi-harness-customtools.test.ts` (must pass unchanged).

---

## Anti-Patterns to Avoid

- ❌ Don't make `toolExecutor` a REQUIRED param on `buildCustomTools` or `toPiCustomTools` — it breaks `pi-harness-customtools.test.ts` describe('delegation') which calls `buildCustomTools()` with no args.
- ❌ Don't use `toAgentToolResult` for the toolExecutor branch — it `JSON.stringify`-s the whole `{content,isError}` envelope (Finding 7 bug). Use `toAgentToolResultFromExecResult` (S1).
- ❌ Don't pass `registered.tool.name` as the tool name — use `fullName` (the namespaced map key the Pi SDK and Agent.toolExecutor key on).
- ❌ Don't remove the try/catch — a throwing toolExecutor must degrade to an `isError:true` result, not crash the session.
- ❌ Don't touch `ClaudeCodeHarness`, `toAgentSDKServer`, `agent.ts`, or the skills path — all out of scope.
- ❌ Don't write the regression test here (asserting toolExecutor is invoked) — that is S3.
- ❌ Don't modify `pi-harness-customtools.test.ts` to add `expect(executor).toHaveBeenCalled()` — that assertion belongs in S3's new file; this file must remain unchanged as the backward-compat sentinel.
- ❌ Don't introduce a new type alias for the toolExecutor signature — copy the existing `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>` verbatim.
- ❌ Don't rebind `execute` with two separate `defineTool` calls (one per branch) when a single closure with a runtime `if (toolExecutor)` branch is cleaner and DRY-er.

---

## Confidence Score

**9/10** — The contract is exceptionally precise (exact line numbers, exact rebind body, exact type).
S1's converter is verified present and public. The only design choice left to the implementer
(single-closure-with-branch vs. conditional defineTool) is explicitly called out as either-being-fine
in the architecture doc. Residual risk is low: the optional-param fallback is the documented
backward-compat strategy, and the existing test suite (run unchanged) is the sentinel. The
end-to-end round-trip assertion is deliberately deferred to S3, keeping S2's blast radius to 2 files
and ~15 lines of diff.
