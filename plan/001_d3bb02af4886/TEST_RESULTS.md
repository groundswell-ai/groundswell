# Bug Fix Requirements

## Overview

This document details bugs found during creative end-to-end PRD validation testing of the Hierarchical Workflow Engine. All 344 existing tests pass, but several PRD implementation mismatches and edge case issues were discovered.

**Testing Summary:**
- Total tests performed: 10 creative test scenarios
- Passing: 344 existing tests (100% pass rate)
- Areas with good coverage: Core functionality, decorators, tree structure, error handling
- Areas needing attention: PRD signature mismatches, edge case handling

---

## Critical Issues (Must Fix)

### Issue 1: WorkflowLogger.child() Signature Mismatch

**Severity:** Critical
**PRD Reference:** Section 12.1 - WorkflowLogger Skeleton

**Expected Behavior:**
PRD specifies `child(meta: Partial<LogEntry>): WorkflowLogger`

**Actual Behavior:**
Implementation (`src/core/logger.ts:84`) has:
```ts
child(parentLogId: string): WorkflowLogger
```

**Steps to Reproduce:**
1. Review PRD Section 12.1 skeleton code
2. Compare with `src/core/logger.ts` implementation
3. PRD shows `child(meta: Partial<LogEntry>)` but implementation uses `child(parentLogId: string)`

**Suggested Fix:**
Either:
1. Update implementation to match PRD: accept `Partial<LogEntry>` and extract `id` as `parentLogId`
2. Update PRD to reflect actual implementation if the string-only signature is intentional

---

## Major Issues (Should Fix)

### Issue 2: Task Concurrent Execution Without Errors

**Severity:** Major
**PRD Reference:** Section 8.2 - @Task Decorator

**Expected Behavior:**
PRD states concurrent execution should "handle errors appropriately"

**Actual Behavior:**
In `src/decorators/task.ts:112`, when `concurrent: true`:
```ts
await Promise.all(runnable.map((w) => w.run()));
```

If one child fails, `Promise.all` rejects immediately. Other concurrent workflows may be left in undefined state. There's no cleanup or state management for partially-executed concurrent children.

**Steps to Reproduce:**
1. Create parent workflow with `@Task({ concurrent: true })`
2. Return multiple child workflows where one throws an error
3. Other children may have started execution but error aborts `Promise.all`
4. No mechanism to track which children completed vs failed

**Suggested Fix:**
Use `Promise.allSettled()` instead of `Promise.all()` to ensure all concurrent workflows complete, then aggregate results/errors.

---

### Issue 3: Missing Error Merge Strategy Implementation

**Severity:** Major
**PRD Reference:** Section 10 - Optional Multi-Error Merging

**Expected Behavior:**
PRD defines `ErrorMergeStrategy` interface with `enabled`, `maxMergeDepth`, and `combine` function. States "Default: disabled → first error wins"

**Actual Behavior:**
Type exists (`src/types/error-strategy.ts`) but there's no code that actually uses this strategy. When concurrent tasks fail, the default `Promise.all` behavior is used, not a custom merge strategy.

**Steps to Reproduce:**
1. Search codebase for usage of `ErrorMergeStrategy` - only type definition exists
2. Create concurrent task that spawns multiple children
3. When children fail, there's no merge logic combining multiple `WorkflowError`s

**Suggested Fix:**
Implement error aggregation in `@Task` decorator when `concurrent: true` is enabled. Collect all errors from `Promise.allSettled()` and apply merge strategy if configured.

---

### Issue 4: Step TrackTiming Default is Implicit

**Severity:** Major
**PRD Reference:** Section 8.1 - @Step Decorator Options

**Expected Behavior:**
PRD shows `trackTiming?: boolean` in options but doesn't explicitly state default value

**Actual Behavior:**
Implementation (`src/decorators/step.ts:94`) uses:
```ts
if (opts.trackTiming !== false)
```

This means timing is tracked by default (true), but this is not documented. Users must explicitly pass `trackTiming: false` to disable.

**Steps to Reproduce:**
1. Use `@Step()` decorator with no options
2. Step timing is tracked and `stepEnd` event with duration is emitted
3. This is correct but surprising - should be documented

**Suggested Fix:**
Update PRD to explicitly state "trackTiming defaults to true" or update implementation to default to false and require explicit opt-in.

---

## Minor Issues (Nice to Fix)

### Issue 5: Observer Error Handling Uses console.error

**Severity:** Minor
**PRD Reference:** Section 11.1 - Tree Debugger Interface

**Expected Behavior:**
Observer errors should be reported through a proper logging/monitoring channel

**Actual Behavior:**
In multiple locations (`src/core/workflow.ts:376`, `src/core/logger.ts:27`):
```ts
console.error('Observer onEvent error:', err);
```

**Steps to Reproduce:**
1. Add an observer that throws errors
2. Check console output - errors are logged via `console.error`
3. No way to suppress or redirect this output

**Suggested Fix:**
Use the workflow's logger or provide a configurable error handler for observer errors instead of direct console output.

---

### Issue 6: getRootObservers() Returns Empty Array on Root With No Observers

**Severity:** Minor
**PRD Reference:** Section 12.2 - Workflow Base Class Skeleton

**Expected Behavior:**
PRD skeleton shows `getRootObservers()` returning `[]` for root workflow

**Actual Behavior:**
Implementation (`src/core/workflow.ts:124-139`) correctly returns empty array when root has no observers. However, this creates unnecessary array allocations on every operation that needs observers.

**Steps to Reproduce:**
1. Create workflow without adding observers
2. Any event emission calls `getRootObservers()` which traverses up and returns `[]`
3. This happens many times during workflow execution

**Suggested Fix:**
Consider caching the observers array or returning a shared empty array constant to avoid allocations.

---

### Issue 7: Tree Debugger Node Map Rebuilds Entirely on childDetached

**Severity:** Minor
**PRD Reference:** Section 11.1 - Tree Debugger Interface

**Expected Behavior:**
Tree debugger should efficiently handle structural changes

**Actual Behavior:**
In `src/debugger/tree-debugger.ts:80-84`:
```ts
onTreeChanged(root: WorkflowNode): void {
  this.root = root;
  this.nodeMap.clear();
  this.buildNodeMap(root);
}
```

Every tree change clears and rebuilds the entire node map, even for single node detachment.

**Steps to Reproduce:**
1. Create workflow with many children
2. Detach one child
3. Entire node map is cleared and rebuilt

**Suggested Fix:**
Implement incremental updates - remove detached nodes from map instead of full rebuild.

---

### Issue 8: No Validation of Workflow Name

**Severity:** Minor
**PRD Reference:** Section 3.1 - WorkflowNode Interface

**Expected Behavior:**
Workflow name should probably be non-empty string

**Actual Behavior:**
Empty string workflow names are accepted:
```ts
const wf = new Workflow(''); // Works, node.name === ''
```

**Steps to Reproduce:**
1. Create workflow with empty string name
2. No validation error occurs
3. Tree debugger shows empty name

**Suggested Fix:**
Add validation to reject empty or whitespace-only names, or document that empty names are valid.

---

### Issue 9: isDescendantOf Private Method Not Exposed for Testing

**Severity:** Minor
**PRD Reference:** Section 12.2 - Workflow Base Class

**Expected Behavior:**
No explicit requirement, but testing ancestor relationships could be useful

**Actual Behavior:**
The `isDescendantOf()` method is private and only used internally for cycle detection. External code cannot check ancestry relationships.

**Steps to Reproduce:**
1. Try to check if workflow A is ancestor of workflow B
2. No public API available for this check

**Suggested Fix:**
Consider adding a public `isDescendantOf(other: Workflow): boolean` method for external use, or document that this is intentionally private.

---

## Testing Notes

**Positive Findings:**
- All 344 existing tests pass
- Excellent test coverage for core functionality
- Good adversarial test coverage for circular references, edge cases
- PRD compliance tests verify most requirements

**Gaps Identified:**
- PRD signature mismatches not caught by tests
- Concurrent task error handling needs more tests
- Error merge strategy not implemented or tested
- Some implicit defaults not explicitly tested

**Recommendations:**
1. Add PRD signature compliance tests
2. Test concurrent task failure scenarios
3. Implement or remove ErrorMergeStrategy
4. Document all implicit defaults
5. Consider adding ancestry check API if useful for users
