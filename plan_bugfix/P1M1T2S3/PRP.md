# Product Requirement Prompt (PRP): Fix Second Error Handler in replaceLastPromptResult() Method

**Work Item**: P1.M1.T2.S3
**Title**: Fix second error handler in replaceLastPromptResult() method (line 319-326)
**Status**: Ready for Implementation
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Fix the second error handler in the `replaceLastPromptResult()` method to capture actual workflow state and logs instead of empty objects/arrays.

**Deliverable**: Modified error handler in `src/core/workflow-context.ts` at lines 326-327 with:
- `state: {}` replaced with `state: getObservedState(this.workflow)`
- `logs: []` replaced with `logs: [...this.workflow.node.logs] as LogEntry[]`

**Success Definition**:
- Error event captures actual workflow state via `getObservedState(this.workflow)`
- Error event captures actual log entries from `this.workflow.node.logs`
- Changes match the pattern from P1.M1.T2.S2 (first error handler fix at lines 162-163)
- No TypeScript compilation errors
- All existing tests still pass

---

## User Persona

**Target User**: Developer implementing bug fixes for workflow error handling (typically an AI agent or human developer following the PRP).

**Use Case**: This is the third step in a 4-step bug fix task. The second error handler in `replaceLastPromptResult()` must be fixed to capture actual state and logs when errors occur during prompt revision/retry operations.

**User Journey**:
1. Developer reads this PRP
2. Developer locates the error handler at lines 326-327 in `replaceLastPromptResult()` method
3. Developer replaces empty state/logs with actual capture patterns
4. Developer validates with `npm run test` that tests pass
5. Developer proceeds to P1.M1.T2.S4 (writing tests)

**Pain Points Addressed**:
- Empty `state: {}` provides no diagnostic value when debugging prompt revision failures
- Empty `logs: []` loses critical log context about what happened before the error
- Inconsistent error handling between `step()` method (already fixed) and `replaceLastPromptResult()` method
- Prevents proper error analysis and debugging of functional workflow revision operations

---

## Why

- **Error Diagnostic Value**: When `replaceLastPromptResult()` fails during prompt revision, developers need to see the actual workflow state to diagnose what went wrong
- **Log Context Preservation**: Errors during revision operations should capture logs from the failed execution attempt for debugging
- **Pattern Consistency**: The first error handler in `step()` method was already fixed in P1.M1.T2.S2 - this error handler should follow the same pattern
- **Dependency Completion**: P1.M1.T2.S1 already added the required `getObservedState` import - this task completes the fix for the second error handler
- **Production Debugging**: Empty state/logs in error events makes production debugging nearly impossible

---

## What

Replace empty state and logs in the second error handler of `replaceLastPromptResult()` method with actual capture patterns.

### Current Code (lines 326-327):

```typescript
// Emit error event
this.workflow.emitEvent({
  type: 'error',
  node: revisionNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: {},              // ← ISSUE: Empty state object
    logs: [],                // ← ISSUE: Empty logs array
  },
});
```

### Target Code (lines 326-327):

```typescript
// Emit error event
this.workflow.emitEvent({
  type: 'error',
  node: revisionNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this.workflow),            // ← FIXED
    logs: [...this.workflow.node.logs] as LogEntry[],  // ← FIXED
  },
});
```

### Success Criteria

- [ ] Line 326: `state: {}` changed to `state: getObservedState(this.workflow)`
- [ ] Line 327: `logs: []` changed to `logs: [...this.workflow.node.logs] as LogEntry[]`
- [ ] No TypeScript errors: `npx tsc --noEmit` succeeds
- [ ] All tests pass: `npm run test`
- [ ] Pattern matches first error handler fix (lines 162-163)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes. This PRP provides:
- Exact file path and line numbers for the changes
- The complete before/after code snippets
- Reference to the same pattern already applied to the first error handler (P1.M1.T2.S2)
- Type definitions for `getObservedState` and `LogEntry`
- Context about the `replaceLastPromptResult()` method
- Validation commands to verify the change

---

### Documentation & References

```yaml
# MUST READ - Target file to modify
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: This is the file containing the error handler that needs fixing
  lines: 313-335 (replaceLastPromptResult error handler)
  pattern: Error event emission with state/logs capture
  critical: Lines 326-327 are the specific lines to modify

# MUST READ - First error handler (already fixed - use as pattern)
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: Shows the exact pattern to follow - same file, same pattern
  lines: 147-165 (step() method error handler)
  pattern: state: getObservedState(this.workflow), logs: [...this.workflow.node.logs] as LogEntry[]
  critical: This is the reference implementation from P1.M1.T2.S2

# MUST READ - getObservedState function definition
- file: /home/dustin/projects/groundswell/src/decorators/observed-state.ts
  why: Defines the getObservedState function we're calling
  lines: 50-77
  pattern: export function getObservedState(obj: object): SerializedWorkflowState
  gotcha: Returns empty object {} if no @ObservedState fields exist

# MUST READ - getObservedState import (already added in P1.M1.T2.S1)
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: Confirms the import is already available (line 30)
  lines: 30
  pattern: import { getObservedState } from '../decorators/observed-state.js';

# MUST READ - LogEntry type definition
- file: /home/dustin/projects/groundswell/src/types/logging.ts
  why: Defines the LogEntry type for the logs array
  lines: 1-19
  pattern: export interface LogEntry { id: string; workflowId: string; timestamp: number; level: LogLevel; message: string; data?: unknown; parentLogId?: string; }

# MUST READ - LogEntry import (already present)
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: Confirms LogEntry is already imported
  lines: 18
  pattern: import type { LogEntry } from '../types/index.js';

# MUST READ - WorkflowNode.logs structure
- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: Defines the node.logs structure we're accessing
  lines: 23-56
  pattern: logs: LogEntry[] (array of log entries)

# REFERENCE - Previous similar fix in workflow.ts
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Shows the pattern established in P1.M1.T1 for Workflow class
  lines: 285-296
  pattern: state: getObservedState(this), logs: [...this.node.logs] as LogEntry[]
  gotcha: Uses 'this' not 'this.workflow' (different context)

# REFERENCE - replaceLastPromptResult method context
- file: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: Shows the full context of the method containing this error handler
  lines: 244-336
  pattern: Creates revision node, executes new prompt, handles errors

# RESEARCH - Bug fix quick reference
- file: /home/dustin/projects/groundswell/plan/docs/bugfix_QUICK_REFERENCE.md
  why: Documents common patterns for error handler fixes
  section: "Error Handler State/Logs Capture Pattern"
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts                    # Has getObservedState usage at line 291 (P1.M1.T1 fix)
│   ├── workflow-context.ts            # TARGET FILE - needs second error handler fixed
│   │   ├── Line 30: getObservedState import (ADDED in P1.M1.T2.S1) ✓
│   │   ├── Lines 162-163: First error handler (FIXED in P1.M1.T2.S2) ✓
│   │   └── Lines 326-327: Second error handler (NEEDS FIX) ✗
│   ├── context.ts
│   ├── event-tree.ts
│   └── logger.ts
├── decorators/
│   ├── observed-state.ts              # Exports getObservedState function
│   ├── step.ts
│   └── task.ts
├── types/
│   ├── logging.ts                     # Defines LogEntry interface
│   ├── workflow.ts                    # Defines WorkflowNode.logs structure
│   └── index.ts                       # Re-exports LogEntry
└── __tests__/
    ├── unit/
    │   ├── workflow.test.ts           # Has functional workflow error test
    │   ├── context.test.ts
    │   └── decorators.test.ts         # Tests getObservedState function
    └── integration/
        └── agent-workflow.test.ts
```

---

### Desired Codebase Tree

```bash
# No new files - modifying existing file:

src/
└── core/
    └── workflow-context.ts            # MODIFY: Lines 326-327
        # Line 326: state: {} → state: getObservedState(this.workflow)
        # Line 327: logs: [] → logs: [...this.workflow.node.logs] as LogEntry[]
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use this.workflow NOT this
// In WorkflowContext class, the observed state is on this.workflow
// CORRECT: getObservedState(this.workflow)
// WRONG:   getObservedState(this)

// CRITICAL: Use this.workflow.node.logs NOT this.node.logs
// The logs are attached to the workflow node, not the context
// CORRECT: [...this.workflow.node.logs] as LogEntry[]
// WRONG:   [...this.node.logs] as LogEntry[]

// CRITICAL: Use spread operator [...] for logs
// This creates a shallow copy of the logs array
// Without spread, the captured logs reference would continue to update
// CORRECT: [...this.workflow.node.logs] as LogEntry[]
// WRONG:   this.workflow.node.logs (reference, not snapshot)

// CRITICAL: Type assertion required for logs
// TypeScript needs the LogEntry[] type assertion
// CORRECT: [...this.workflow.node.logs] as LogEntry[]
// GOTCHA: Without 'as LogEntry[]', TypeScript may infer different type

// CRITICAL: getObservedState returns empty object if no @ObservedState fields
// This is expected behavior - not all workflows have observed state
// The error event should still capture whatever state exists (even if empty)

// CRITICAL: Import already exists (from P1.M1.T2.S1)
// Line 30: import { getObservedState } from '../decorators/observed-state.js';
// Do NOT add this import again - verify with grep if unsure

// CRITICAL: LogEntry import already exists
// Line 18: import type { LogEntry } from '../types/index.js';
// Do NOT add this import again

// CRITICAL: Match the first error handler pattern exactly
// Lines 162-163 show the correct pattern for this same file
// Copy the exact syntax from there

// CRITICAL: Error is in replaceLastPromptResult() method
// This method handles prompt revision/retry operations
// The error occurs when the revision prompt execution fails
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. This task modifies existing error handling to use:
- `getObservedState(this.workflow)` - Returns `SerializedWorkflowState` (type: `Record<string, unknown>`)
- `[...this.workflow.node.logs] as LogEntry[]` - Returns shallow copy of logs array

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE the error handler to fix
  - FILE: /home/dustin/projects/groundswell/src/core/workflow-context.ts
  - METHOD: replaceLastPromptResult() (lines 244-336)
  - FIND: The catch block at lines 313-335
  - IDENTIFY: Lines 326-327 with state: {} and logs: []

Task 2: VERIFY imports are present
  - CHECK: Line 30 has import { getObservedState } from '../decorators/observed-state.js'
  - CHECK: Line 18 has import type { LogEntry } from '../types/index.js'
  - IF MISSING: Add imports (but they should exist from P1.M1.T2.S1)
  - VALIDATION: grep -n "getObservedState" workflow-context.ts

Task 3: REFERENCE the first error handler pattern
  - READ: Lines 162-163 in the same file
  - OBSERVE: state: getObservedState(this.workflow)
  - OBSERVE: logs: [...this.workflow.node.logs] as LogEntry[]
  - CONFIRM: This is the exact pattern to replicate

Task 4: MODIFY line 326 - fix state capture
  - BEFORE: state: {},
  - AFTER:  state: getObservedState(this.workflow),
  - PRESERVE: All other error properties (message, original, workflowId, stack)
  - MAINTAIN: Indentation (12 spaces for alignment)

Task 5: MODIFY line 327 - fix logs capture
  - BEFORE: logs: [],
  - AFTER:  logs: [...this.workflow.node.logs] as LogEntry[],
  - PRESERVE: Comma at end (there may be a closing brace after)
  - MAINTAIN: Indentation (12 spaces for alignment)

Task 6: VALIDATE compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: No TypeScript errors
  - IF ERRORS: Check that imports are present and syntax is correct

Task 7: VALIDATE tests
  - RUN: npm run test
  - EXPECTED: All 155+ tests pass
  - EXPECTED: No new failures introduced
```

---

### Implementation Code Template

```typescript
// ============================================================
// BEFORE: Lines 326-327 in replaceLastPromptResult() method
// ============================================================
// Emit error event
this.workflow.emitEvent({
  type: 'error',
  node: revisionNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: {},              // ← REPLACE THIS LINE
    logs: [],                // ← REPLACE THIS LINE
  },
});

// ============================================================
// AFTER: Lines 326-327 should become:
// ============================================================
// Emit error event
this.workflow.emitEvent({
  type: 'error',
  node: revisionNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this.workflow),            // ← CHANGED
    logs: [...this.workflow.node.logs] as LogEntry[],  // ← CHANGED
  },
});
```

---

### Integration Points

```yaml
MODIFIED FILES:
  - file: src/core/workflow-context.ts
    action: Fix error handler at lines 326-327
    lines_modified: 2 lines (326-327)
    method: replaceLastPromptResult()

DEPENDS ON:
  - P1.M1.T2.S1: getObservedState import (Complete)
  - P1.M1.T2.S2: First error handler fix (Complete)

ENABLES:
  - P1.M1.T2.S4: Write test for WorkflowContext error state capture

NO CHANGES TO:
  - Imports (already added in P1.M1.T2.S1)
  - Function signatures
  - Method logic (only error event properties)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making the changes - fix any issues
npx tsc --noEmit                   # Type check the codebase

# Expected: Zero type errors
# If errors: Check that imports exist and syntax matches lines 162-163

# Verify the changes were applied correctly
grep -n "state: getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected output:
# 162:          state: getObservedState(this.workflow),
# 326:          state: getObservedState(this.workflow),

grep -n "logs: \[\.\.\.this\.workflow\.node\.logs\]" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected output:
# 163:          logs: [...this.workflow.node.logs] as LogEntry[],
# 327:          logs: [...this.workflow.node.logs] as LogEntry[],
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests to ensure nothing broke
npm run test

# Expected output:
# ✓ 155+ tests pass (same count as before this change)

# Run specific workflow-context related tests
npx vitest run src/__tests__/unit/context.test.ts

# Expected: All context tests pass

# Run workflow tests (includes functional workflow error test)
npx vitest run src/__tests__/unit/workflow.test.ts

# Expected: All workflow tests pass
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm run test

# Expected: All tests pass
# No changes to test count (this is error handling fix only)

# Verify both error handlers now have same pattern
diff -u \
  <(sed -n '154,165p' /home/dustin/projects/groundswell/src/core/workflow-context.ts | grep -E '(state|logs):') \
  <(sed -n '318,329p' /home/dustin/projects/groundswell/src/core/workflow-context.ts | grep -E '(state|logs):')
# Expected: Only whitespace differences (same state/logs pattern)
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Domain-specific validation for error handler fixes:

# 1. Verify NO empty state objects remain in error handlers
grep -n "state: {}" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected: No results (all error handlers should use getObservedState)

# 2. Verify NO empty logs arrays remain in error handlers
grep -n "logs: \[\]" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected: No results (all error handlers should capture logs)

# 3. Verify consistent pattern across both error handlers
grep -A1 "state: getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts | grep "logs:"
# Expected: Both lines show [...this.workflow.node.logs] pattern

# 4. Verify the method context is correct
grep -B5 "state: getObservedState(this.workflow)" /home/dustin/projects/groundswell/src/core/workflow-context.ts | grep -E "(method|replaceLastPromptResult|step)"
# Expected output shows both 'step' and 'replaceLastPromptResult' methods

# 5. Verify no syntax errors in modified method
node -c /home/dustin/projects/groundswell/dist/core/workflow-context.js 2>&1 || echo "Run 'npm run build' first"
# Expected: No syntax errors

# 6. Verify import is present (from P1.M1.T2.S1)
grep "import.*getObservedState" /home/dustin/projects/groundswell/src/core/workflow-context.ts
# Expected: import { getObservedState } from '../decorators/observed-state.js';
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Line 326 modified: `state: getObservedState(this.workflow)` replaces `state: {}`
- [ ] Line 327 modified: `logs: [...this.workflow.node.logs] as LogEntry[]` replaces `logs: []`
- [ ] TypeScript compiles: `npx tsc --noEmit` succeeds
- [ ] All tests pass: `npm run test`
- [ ] No empty state objects remain in error handlers: `grep "state: {}"` returns nothing
- [ ] No empty logs arrays remain in error handlers: `grep "logs: []"` returns nothing

### Feature Validation

- [ ] Pattern matches first error handler fix (lines 162-163)
- [ ] Both error handlers now use same state/logs capture pattern
- [ ] Error events will now capture actual workflow state on failure
- [ ] Error events will now capture actual log entries on failure
- [ ] Changes are minimal (only 2 lines modified)

### Code Quality Validation

- [ ] Indentation preserved (12 spaces for error properties)
- [ ] No duplicate imports added
- [ ] No other lines modified in the method
- [ ] Follows established pattern from P1.M1.T2.S2
- [ ] Ready for test coverage in P1.M1.T2.S4

---

## Anti-Patterns to Avoid

- ❌ Don't use `this` instead of `this.workflow` for getObservedState parameter
- ❌ Don't use `this.node.logs` instead of `this.workflow.node.logs`
- ❌ Don't forget the spread operator `[...]` when capturing logs
- ❌ Don't skip the `as LogEntry[]` type assertion
- ❌ Don't modify any other lines in the error object (message, original, workflowId, stack)
- ❌ Don't add duplicate imports (getObservedState and LogEntry already imported)
- ❌ Don't use different pattern than the first error handler (lines 162-163)
- ❌ Don't skip validation - always run `npm run test` after changes

---

## External Research Summary

This task requires minimal external research as it follows an established pattern within the codebase:

1. **Pattern Reference**: P1.M1.T2.S2 already fixed the first error handler in this same file - follow that exact pattern
2. **Function Reference**: P1.M1.T1 fixed the same issue in workflow.ts - shows the conceptual pattern
3. **TypeScript Spread Operator**: The `[...]` syntax creates a shallow copy - prevents captured logs from being mutated
4. **Type Assertions**: The `as LogEntry[]` syntax is required when TypeScript cannot infer the exact type from spread operations

---

## Success Metrics

**Confidence Score**: 10/10

**Justification**:
- Two line change, very low complexity
- Exact pattern already established in P1.M1.T2.S2 (same file)
- Clear file path and line numbers specified
- Complete before/after code provided
- All required imports already present
- Validation commands are straightforward

**Expected Implementation Time**: 5-10 minutes

**Risk Factors**:
- Zero risk: Follows established pattern in same file
- No new dependencies: All imports already present
- Minimal changes: Only 2 lines modified
- High confidence: Same pattern validated in first error handler

**Dependencies**:
- P1.M1.T2.S1: Add getObservedState import (Complete)
- P1.M1.T2.S2: Fix first error handler (Complete)

**Enables**:
- P1.M1.T2.S4: Write test for WorkflowContext error state capture

---

## Appendix: Quick Reference

### Key Files

- **Target file**: `/home/dustin/projects/groundswell/src/core/workflow-context.ts`
- **Target lines**: 326-327 (in `replaceLastPromptResult()` method)
- **Reference pattern**: Lines 162-163 (in `step()` method)
- **getObservedState source**: `/home/dustin/projects/groundswell/src/decorators/observed-state.ts` line 50

### Change Summary

```diff
--- a/src/core/workflow-context.ts
+++ b/src/core/workflow-context.ts
@@ -323,6 +323,6 @@
           workflowId: this.workflowId,
           stack: error instanceof Error ? error.stack : undefined,
-          state: {},
-          logs: [],
+          state: getObservedState(this.workflow),
+          logs: [...this.workflow.node.logs] as LogEntry[],
         },
       });
```

### Commands

```bash
# Type check
npx tsc --noEmit

# Run tests
npm run test

# Verify changes
grep -n "state: getObservedState" src/core/workflow-context.ts
grep -n "logs: \[\.\.\.this\.workflow\.node\.logs\]" src/core/workflow-context.ts
```

---

## Related Tasks

- **P1.M1.T2.S1** (Complete): Added getObservedState import - prerequisite for this task
- **P1.M1.T2.S2** (Complete): Fixed first error handler at lines 162-163 - use as reference pattern
- **P1.M1.T2.S4** (Next): Will write tests validating error state capture for both error handlers
- **P1.M1.T1.S2/S3** (Complete): Fixed same issue in workflow.ts - conceptual pattern reference

---

**PRP Version**: 1.0
**Created**: 2026-01-11
**Status**: Ready for Implementation
