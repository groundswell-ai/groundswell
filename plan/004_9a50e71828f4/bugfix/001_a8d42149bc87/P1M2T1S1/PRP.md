# PRP — P1.M2.T1.S1: `toAgentToolResultFromExecResult` converter on `MCPHandler`

> **Scope note (READ FIRST):** This subtask creates ONLY a converter method + its unit test. It does
> **not** wire it into `PiHarness` — that is the next subtask **P1.M2.T1.S2** ("Thread `toolExecutor`
> into `PiHarness.buildCustomTools`"). Keep this change self-contained so S2 can consume it.

---

## Goal

**Feature Goal**: Add a new **public** converter method `toAgentToolResultFromExecResult` to
`MCPHandler` that correctly maps a `ToolExecutionResult` (`{ content, isError }`) into a Pi
`AgentToolResult<{ isError: boolean }>`, reading `result.content` as the semantic payload and
`result.isError` for the error flag — instead of blindly `JSON.stringify`-ing the entire envelope.

**Deliverable**: 
1. One new public method on `MCPHandler` in `src/core/mcp-handler.ts` (placed adjacent to the
   existing private `toAgentToolResult`).
2. One `import type` addition for `ToolExecutionResult`.
3. One new unit-test file `src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts`.
4. The existing private `toAgentToolResult` MUST remain byte-for-byte unchanged (it is still used by
   the ClaudeCodeHarness path via `toPiCustomTools`/`toAgentSDKServer`).

**Success Definition**: The new method passes the two contract scenarios (string content → text passthrough;
object content → JSON-stringified) plus edge cases; `npm run lint` (`tsc --noEmit`) is clean; the full
existing suite (`npm test`) still passes (no regressions in `toAgentToolResult`-dependent tests).

---

## Why

- **Directly unblocks P1.M2.T1.S2.** When S2 rebinds each Pi tool's `execute` to invoke the caller-supplied
  `toolExecutor` (which returns a `ToolExecutionResult`), it needs a converter that understands the
  `{ content, isError }` envelope. The current `toAgentToolResult(result: unknown, isError: boolean)`
  would `JSON.stringify({content, isError})` into one text chunk — semantically wrong (see
  `architecture/issue2-piharness-toolexecutor.md` Finding 7).
- **Fixes the root conversion bug documented in PRD §7.10 / §7.14.1** without disturbing the
  ClaudeCodeHarness path that legitimately passes *raw* executor output to `toAgentToolResult`.
- **Enables the PRD §7.10 tool round-trip** (`Agent.toolExecutor` → `ToolExecutionResult` →
  `AgentToolResult<{isError}>` → Pi session) that is currently broken end-to-end.

---

## What

A pure, synchronous method on `MCPHandler`:

```ts
public toAgentToolResultFromExecResult(
  result: ToolExecutionResult,
): AgentToolResult<{ isError: boolean }>
```

Behavior (deterministic, no I/O, no throws):

| Input `result`                                              | Output `content[0].text`        | Output `details.isError` |
|-------------------------------------------------------------|---------------------------------|--------------------------|
| `{ content: 'hello', isError: false }`                      | `'hello'` (passthrough)         | `false`                  |
| `{ content: { foo: 1 }, isError: true }`                    | `'{"foo":1}'` (JSON.stringify)  | `true`                   |
| `{ content: 42, isError: false }` (non-string primitive)    | `'42'`                          | `false`                  |
| `{ content: ['a','b'], isError: false }`                    | `'["a","b"]'`                   | `false`                  |
| `{ content: '', isError: false }` (empty string)            | `''`                            | `false`                  |

### Success Criteria

- [ ] New public method exists with the exact signature above and correct return shape.
- [ ] String `content` is passed through **unchanged** (NOT `JSON.stringify`-ed, which would add quotes).
- [ ] Non-string `content` (object/array/primitive) is `JSON.stringify`-ed.
- [ ] `details.isError` mirrors `result.isError` exactly.
- [ ] Private `toAgentToolResult` is **untouched** (verified by diff: only additions, no edits to it).
- [ ] `import type { ToolExecutionResult }` is used (not a value import).
- [ ] All new + existing tests pass; `npm run lint` clean.

---

## All Needed Context

### Context Completeness Check

> "If someone knew nothing about this codebase, would they have everything needed to implement this
> successfully?" — **YES.** Every file path, type signature, existing pattern, and validation command
> is named below with line numbers.

### Documentation & References

```yaml
# MUST READ - Architecture finding that defines the exact bug and contract
- file: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue2-piharness-toolexecutor.md
  why: "Finding 7 defines the exact mismatch and the converter contract. Finding 5 shows toPiCustomTools.
        The 'Companion files to touch in lockstep' + 'Constraints/Risks' #3 specify toAgentToolResult
        must NOT be reused blindly and a sibling converter should read result.content/result.isError."
  critical: "Finding 7 verbatim: 'toAgentToolResult accepts the raw executor output (typed unknown) and
        stringifies it directly — it does NOT read result.content/result.isError ... Any fix that swaps
        registered.executor for the caller's toolExecutor must also replace toAgentToolResult with a
        converter that understands the ToolExecutionResult shape.'"

# MUST READ - The file being modified
- file: src/core/mcp-handler.ts
  why: "Hosts toAgentToolResult (L272-281) and the AgentToolResult import (L14-18) and the types import
        (L21). The new method goes right after toAgentToolResult (after L281)."
  pattern: "toAgentToolResult (L272-281) is the exact stringification pattern to MIRROR for the content
        field: `const text = typeof result === 'string' ? result : JSON.stringify(result);`
        Return shape (L277): { content: [{ type: 'text' as const, text }], details: { isError } }"
  gotcha: "toAgentToolResult is `private` and is tested only indirectly via toPiCustomTools(). The NEW
        method MUST be `public` so its dedicated unit test can call it directly — `npm run lint` is
        `tsc --noEmit`, which rejects private-member access from outside the class. Do NOT make it private."

# MUST READ - The canonical type definition (input shape)
- file: src/types/harnesses.ts
  why: "Lines 145-150 define ToolExecutionResult { content: string | unknown; isError: boolean }.
        This is the INPUT type. The JSDoc above it (L132-150) confirms it is 'Copied VERBATIM from
        providers.ts'."
  pattern: "content is `string | unknown` — so the typeof-string check handles the string branch and
        JSON.stringify handles everything else (objects, arrays, numbers, booleans, null)."

# MUST READ - The type re-export barrel (preferred import path)
- file: src/types/index.ts
  why: "Line 40 re-exports ToolExecutionResult (from ./harnesses.js). The existing import at
        mcp-handler.ts:21 is `import type { MCPServer, Tool, ToolResult } from '../types/index.js';` —
        ADD ToolExecutionResult to this existing line (cleanest) rather than a second import statement."
  pattern: "Keep `import type` — the contract explicitly requires it."

# MUST READ - The AgentToolResult output shape (from the pi dependency)
- file: node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts
  why: "AgentToolResult is already imported as a type at mcp-handler.ts:14-18. The generic parameter
        used everywhere in this file is `AgentToolResult<{ isError: boolean }>`."

# MUST READ - The test pattern to clone
- file: src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts
  why: "This is the established unit-test pattern for MCPHandler: imports MCPHandler from
        '../../../core/mcp-handler.js', uses `new MCPHandler()` directly, vitest globals, describe/it/expect.
        Clone this file's header/structure exactly for the new test file."
  pattern: "`import { describe, it, expect } from 'vitest';` then `import { MCPHandler } from
        '../../../core/mcp-handler.js';` then `import type { ToolExecutionResult } from
        '../../../types/harnesses.js';` (or types/index.js). Construct `new MCPHandler()` and call the
        public method directly. Assert on `r.content[0].text` and `r.details.isError`."
  gotcha: "The existing test asserts `r.content[0]` toEqual `{type:'text', text:...}` and
        `r.details.isError` — mirror this assertion style."
```

### Current Codebase Tree (relevant slice)

```bash
src/
  core/
    mcp-handler.ts          # <-- MODIFY (add public method + 1 import)
    agent.ts                # untouched (consumes via PiHarness in S2)
  types/
    harnesses.ts            # ToolExecutionResult definition (L145-150) — READ ONLY
    index.ts                # re-exports ToolExecutionResult (L40) — import path
  harnesses/
    pi-harness.ts           # untouched in S1 (modified in S2)
  __tests__/
    unit/
      providers/
        mcp-handler-pi-customtools.test.ts   # <-- PATTERN TO CLONE
        mcp-handler-exec-result-converter.test.ts  # <-- NEW TEST FILE
```

### Desired Codebase Tree With Files To Be Added/Modified

```bash
src/
  core/
    mcp-handler.ts          # MODIFY: +1 import (ToolExecutionResult), +1 public method
  __tests__/
    unit/
      providers/
        mcp-handler-exec-result-converter.test.ts  # CREATE: unit test for the new method
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: `npm run lint` is `tsc --noEmit` — it ENFORCES TypeScript `private`/`protected` access.
// The existing toAgentToolResult is `private` and only tested indirectly via toPiCustomTools().
// The NEW method MUST be `public` (or the dedicated unit test calling it directly will fail lint).
// Contract text: "Add a new private/public method" — choose `public` to enable direct testing.

// CRITICAL: String content must NOT be JSON.stringify-ed. JSON.stringify('hello') === '"hello"'
// (adds quotes). Mirror toAgentToolResult L276 exactly:
//   const text = typeof content === 'string' ? content : JSON.stringify(content);
// Apply the typeof check to result.CONTENT (not the whole result object).

// CRITICAL: Do NOT touch the private toAgentToolResult (L272-281). The ClaudeCodeHarness path
// (toAgentSDKServer / toPiCustomTools -> registered.executor) returns RAW output and MUST keep
// using the blind-stringify behavior. This PRP is additive only.

// GOTCHA: `content: string | unknown` — `unknown` is the top type, so a string ALSO satisfies
// `unknown`. The `typeof content === 'string'` check correctly narrows first; everything else
// (objects, arrays, numbers, booleans, null, undefined) falls through to JSON.stringify.
// Note: JSON.stringify(undefined) === undefined and JSON.stringify(() => {}) === undefined —
// this is the SAME behavior as the existing toAgentToolResult, so it is acceptable/consistent.

// GOTCHA: Return `type: 'text' as const` (not the string literal 'text' without `as const`),
// matching L277. The existing code uses `type: 'text' as const`.
```

---

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/mcp-handler.ts — add the ToolExecutionResult type import
  - FIND: line 21 → `import type { MCPServer, Tool, ToolResult } from '../types/index.js';`
  - EDIT: add `ToolExecutionResult` to that import list:
      import type { MCPServer, Tool, ToolResult, ToolExecutionResult } from '../types/index.js';
  - WHY here: ../types/index.ts:40 re-exports it (verified). Keeps a single import line.
  - CONSTRAINT: must be `import type` (contract requirement; this is a type-only usage).
  - ALTERNATIVE acceptable: a separate `import type { ToolExecutionResult } from '../types/harnesses.js';`

Task 2: MODIFY src/core/mcp-handler.ts — add the public converter method
  - PLACEMENT: immediately AFTER the closing brace of the private `toAgentToolResult`
    method (i.e. after line 281). Sibling placement keeps the two converters together.
  - IMPLEMENT (exact body):
      /**
       * Convert a `ToolExecutionResult` (the `{ content, isError }` envelope returned by a
       * caller-supplied `toolExecutor`, e.g. `Agent.toolExecutor`) into a Pi
       * `AgentToolResult<{ isError: boolean }>`.
       *
       * Unlike {@link toAgentToolResult} (which stringifies the RAW executor output blindly),
       * this reads `result.content` as the semantic payload and `result.isError` as the error
       * flag. Used by the PiHarness toolExecutor bridge (PRD §7.10) — see P1.M2.T1.S2.
       *
       * String content passes through unchanged; non-string content is JSON.stringified
       * (mirrors `toAgentToolResult`'s stringification, but applied to `content` only).
       */
      public toAgentToolResultFromExecResult(
        result: ToolExecutionResult,
      ): AgentToolResult<{ isError: boolean }> {
        const content = result.content;
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        return {
          content: [{ type: 'text' as const, text }],
          details: { isError: result.isError },
        };
      }
  - NAMING: `toAgentToolResultFromExecResult` (exact, per contract).
  - VISIBILITY: `public` (REQUIRED — see Gotchas; private breaks lint in the dedicated test).
  - SIGNATURE: single param `result: ToolExecutionResult`; return `AgentToolResult<{ isError: boolean }>`.
  - DO NOT modify toAgentToolResult, toPiCustomTools, or toAgentSDKServer.

Task 3: CREATE src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts
  - FOLLOW pattern: src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts (header, imports,
    describe/it structure, assertion style on content[0] / details.isError).
  - IMPORTS:
      import { describe, it, expect } from 'vitest';
      import { MCPHandler } from '../../../core/mcp-handler.js';
      import type { ToolExecutionResult } from '../../../types/harnesses.js';
  - CONSTRUCTION: `const handler = new MCPHandler();` (no registration needed — pure method).
  - NAMING: top-level describe `'MCPHandler.toAgentToolResultFromExecResult()'`.
  - COVERAGE — implement these test cases (each in its own `it`):
      a) string content, isError:false → content[0].text === 'hello', details.isError === false
         (also assert content[0].type === 'text' and content has length 1)
      b) object content, isError:true → content[0].text === '{"foo":1}', details.isError === true
      c) primitive (number) content → content[0].text === '42' (JSON.stringify(42) === '42')
      d) array content → content[0].text === '["a","b"]'
      e) empty string content → content[0].text === '' (edge: must NOT become '""')
      f) boolean isError:false with object content → details.isError === false
  - ASSERTION STYLE (mirror existing test):
      expect(r.content[0]).toEqual({ type: 'text', text: 'hello' });
      expect(r.details.isError).toBe(false);
  - PLACEMENT: src/__tests__/unit/providers/ (alongside the sibling mcp-handler test).
  - NO MOCKS: pure synchronous function — no vi.fn, no external services.
```

### Implementation Patterns & Key Details

```typescript
// The exact converter — note the typeof-string guard mirrors toAgentToolResult (L276) but is applied
// to result.CONTENT, and details.isError is sourced from result.isError (not a separate arg):
public toAgentToolResultFromExecResult(
  result: ToolExecutionResult,
): AgentToolResult<{ isError: boolean }> {
  const content = result.content;
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return {
    content: [{ type: 'text' as const, text }],
    details: { isError: result.isError },
  };
}

// WHY a separate method instead of overloading toAgentToolResult:
//   - toAgentToolResult(result: unknown, isError: boolean)  // 2 args, raw stringify — ClaudeCode path
//   - toAgentToolResultFromExecResult(result: ToolExecutionResult)  // 1 arg, reads envelope — Pi path
// Different input SHAPES (raw value vs {content,isError} envelope) and different callers.
// Overloading would be ambiguous and risks regressing the ClaudeCode path. A named sibling is unambiguous.

// CONTRAST (do NOT replicate this for the new path — this is the OLD/wrong-for-Pi behavior):
// private toAgentToolResult(result: unknown, isError: boolean) {
//   const text = typeof result === 'string' ? result : JSON.stringify(result);
//   // ^ stringifies the WHOLE result — correct for raw executor output, WRONG for {content,isError}
//   return { content: [{ type: 'text' as const, text }], details: { isError } };
// }
```

### Integration Points

```yaml
TYPES:
  - no new types; consumes existing ToolExecutionResult (src/types/harnesses.ts L145-150)
    and existing AgentToolResult (already imported at mcp-handler.ts L14-18).

CONFIG:
  - none.

ROUTES / REGISTRY:
  - none (pure method).

DOWNSTREAM CONSUMER (NOT part of this subtask — P1.M2.T1.S2 will call this):
  - PiHarness.buildCustomTools will rebind each tool's execute to:
        const res = await toolExecutor({ name: t.name, input: params });
        return this.mcpHandler.toAgentToolResultFromExecResult(res);
    Do NOT implement that here. This PRP only ships the converter + its test.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after editing mcp-handler.ts
npm run lint
# Expected: zero errors. `tsc --noEmit` checks types AND private-access enforcement.
# If "Property 'toAgentToolResultFromExecResult' is private and only accessible within class
# 'MCPHandler'" appears in the test file, the method was made private — change to public.

# (Optional) scoped type-check of the two files
npx tsc --noEmit src/core/mcp-handler.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test in isolation
npx vitest run src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts

# Expected: all cases pass (string passthrough, object stringify, primitive, array, empty string,
# isError flag mirroring).

# Regression: ensure the existing toAgentToolResult-dependent suite is untouched
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts

# Full suite (note: one pre-existing UNRELATED failure in edge-case.test.ts unicode is out of scope —
# see PRD §h3.4 / Minor 5; do NOT attempt to fix it here)
npm test
```

### Level 3: Integration Testing (System Validation)

```bash
# No service startup needed — this is a pure synchronous converter with no I/O.
# The "integration" is purely that the method is callable on a real `new MCPHandler()` instance,
# which Level 2 already exercises. Skip Level 3 for this subtask.

# Sanity: confirm the method is publicly exported on the class (not tree-shaken / mis-typed)
npx tsx -e "import { MCPHandler } from './src/core/mcp-handler.js'; const h = new MCPHandler(); console.log(typeof h.toAgentToolResultFromExecResult);"
# Expected: 'function'
```

### Level 4: Creative & Domain-Specific Validation

```bash
# None applicable — pure function, no external services, no DB, no network.
# Negative control: confirm toAgentToolResult was NOT edited (additive-only diff).
git diff src/core/mcp-handler.ts | grep -E "^-" | grep -v "^---"
# Expected: NO output (zero deletions in the source file). Only `+` additions.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` passes with zero errors (method is `public`; types correct).
- [ ] New unit test passes: `npx vitest run src/__tests__/unit/providers/mcp-handler-exec-result-converter.test.ts`
- [ ] Existing `mcp-handler-pi-customtools.test.ts` still passes (no regression to `toAgentToolResult`).
- [ ] `npm test` has no NEW failures (the one pre-existing `edge-case.test.ts` unicode failure is out of scope).
- [ ] Source diff is additive only (`git diff` shows only `+` lines in mcp-handler.ts).

### Feature Validation

- [ ] `{content:'hello', isError:false}` → `content[0].text === 'hello'` AND `details.isError === false`.
- [ ] `{content:{foo:1}, isError:true}` → `content[0].text === '{"foo":1}'` AND `details.isError === true`.
- [ ] String content is NOT double-quoted (empty string stays `''`, not `'""'`).
- [ ] Non-string content (object/array/number) IS JSON.stringify-ed.
- [ ] `import type` is used for `ToolExecutionResult`.
- [ ] Private `toAgentToolResult` is byte-for-byte unchanged.

### Code Quality Validation

- [ ] Method placed adjacent to `toAgentToolResult` (logical grouping of converters).
- [ ] JSDoc explains the difference from `toAgentToolResult` and references PRD §7.10 / P1.M2.T1.S2.
- [ ] Test file mirrors the header/import/structure of `mcp-handler-pi-customtools.test.ts`.
- [ ] No hardcoded values that should be config; no broad `catch`; no async where sync suffices.

### Scope Discipline

- [ ] NO changes to `src/harnesses/pi-harness.ts` (that is P1.M2.T1.S2).
- [ ] NO changes to `toPiCustomTools` / `toAgentSDKServer` / `buildCustomTools`.
- [ ] NO changes to `src/core/agent.ts`.

---

## Anti-Patterns to Avoid

- ❌ Don't make the method `private` — `tsc --noEmit` (the lint step) rejects private access from the test file.
- ❌ Don't reuse/modify `toAgentToolResult` — it serves the ClaudeCodeHarness raw-output path and must keep working.
- ❌ Don't `JSON.stringify` string `content` (it would wrap it in quotes: `'hello'` → `'"hello"'`).
- ❌ Don't `JSON.stringify` the whole `result` envelope — that is the exact bug this fixes (Finding 7).
- ❌ Don't add async/Promise — the converter is pure and synchronous.
- ❌ Don't widen scope into `PiHarness`/`buildCustomTools`/`agent.ts` (that is S2 / S3).
- ❌ Don't introduce a new type for the return — reuse the existing `AgentToolResult<{ isError: boolean }>`.
- ❌ Don't catch exceptions inside the converter — it has no failure modes; callers own error handling.

---

## Confidence Score

**9/10** — The contract is precisely specified with exact signatures, line numbers, and input/output
scenarios. The only residual risk is a lint-vs-visibility ambiguity, which this PRP resolves explicitly
(use `public`). Implementation is a single ~8-line method + a focused test file cloning an existing pattern.
