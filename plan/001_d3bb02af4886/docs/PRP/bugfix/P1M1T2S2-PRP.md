# PRP: Fix First Error Handler in WorkflowContext.step() Method (P1.M1.T2.S2)

---

## Goal

**Feature Goal**: Update the first error handler in the `WorkflowContext.step()` method (lines 155-162) to capture actual workflow state and logs instead of empty objects/arrays.

**Deliverable**: Modified `src/core/workflow-context.ts` with error handler that properly captures state using `getObservedState(this.workflow)` and logs using `[...this.workflow.node.logs] as LogEntry[]`.

**Success Definition**:
- Error handler at lines 161-162 no longer uses empty `state: {}` and `logs: []`
- Error events contain actual workflow state from `getObservedState(this.workflow)`
- Error events contain actual log entries from `this.workflow.node.logs`
- All existing tests continue to pass
- New behavior matches the pattern established in `Workflow.runFunctional()` error handler

## Why

This fix ensures that when a step fails within a functional workflow, the error event contains meaningful debugging information:
- **State capture**: Enables workflow restart and introspection by capturing the actual workflow state at failure point
- **Logs capture**: Provides full debugging context with all log entries up to the point of failure
- **Consistency**: Matches the pattern already implemented in `Workflow.runFunctional()` (completed in P1.M1.T1.S2/S3)
- **Depends on**: P1.M1.T2.S1 (already complete) which added the `getObservedState` import

## What

Modify the error handler in `WorkflowContextImpl.step()` method to replace empty state/logs with actual captured values.

### Current Code (Lines 155-164)

```typescript
error: {
  message: error instanceof Error ? error.message : 'Unknown error',
  original: error,
  workflowId: this.workflowId,
  stack: error instanceof Error ? error.stack : undefined,
  state: {},      // <- EMPTY: Replace with getObservedState(this.workflow)
  logs: [],       // <- EMPTY: Replace with [...this.workflow.node.logs] as LogEntry[]
},
```

### Target Code

```typescript
error: {
  message: error instanceof Error ? error.message : 'Unknown error',
  original: error,
  workflowId: this.workflowId,
  stack: error instanceof Error ? error.stack : undefined,
  state: getObservedState(this.workflow),
  logs: [...this.workflow.node.logs] as LogEntry[],
},
```

### Success Criteria

- [ ] Line 161: `state: {}` replaced with `state: getObservedState(this.workflow)`
- [ ] Line 162: `logs: []` replaced with `logs: [...this.workflow.node.logs] as LogEntry[]`
- [ ] Import statement for `getObservedState` already exists at line 29 (from P1.M1.T2.S1)
- [ ] Type assertion `as LogEntry[]` is applied to logs array
- [ ] Spread operator `[...]` is used to create shallow copy of logs array
- [ ] All tests pass: `npm test`

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, they would need to know:
- Where the error handler is located (exact line numbers)
- What `this.workflow` refers to (it's a `WorkflowLike` object, not `this`)
- What `getObservedState` expects as parameter (an object with observed state decorators)
- How to capture logs from the workflow node
- The pattern to follow (from completed P1.M1.T1.S2/S3)
- Testing patterns for validation

All of this context is provided below.

### Documentation & References

```yaml
# MUST READ - Critical pattern from completed bug fix
- file: src/core/workflow.ts
  why: Contains the completed fix for runFunctional() error handler (P1.M1.T1.S2/S3) - this is the pattern to follow
  pattern: Error handler at lines 286-297 shows exact pattern for state/logs capture
  lines: 286-297
  gotcha: Workflow uses `this` for getObservedState, but WorkflowContext uses `this.workflow`

- file: src/core/workflow-context.ts
  why: The file to modify - contains the step() method with the buggy error handler
  pattern: Lines 155-162 contain the error handler to fix
  gotcha: `this.workflow` is a WorkflowLike interface, not a Workflow instance

- file: src/decorators/observed-state.ts
  why: Defines getObservedState function - need to understand its signature
  pattern: Function signature: `function getObservedState(obj: object): SerializedWorkflowState`
  critical: Must pass `this.workflow` (the WorkflowLike object) not `this` (the WorkflowContext)

- file: src/types/workflow.ts
  why: Defines WorkflowNode interface with logs array structure
  pattern: WorkflowNode.logs is of type LogEntry[]
  critical: Logs must be captured from `this.workflow.node.logs`

- file: src/types/logging.ts
  why: Defines LogEntry interface structure
  pattern: LogEntry has id, workflowId, timestamp, level, message, data, parentLogId

- file: src/__tests__/unit/workflow.test.ts
  why: Contains test for functional workflow error state capture (P1.M1.T1.S4)
  pattern: Lines 82-130 show how to test error state/logs capture
  critical: Use this pattern when writing tests for P1.M1.T2.S4

- file: plan_bugfix/P1M1T2S1/PRP.md
  why: Contains context from previous subtask (getObservedState import)
  pattern: Import statement was added at line 29
  critical: getObservedState import is already present, no need to add it again
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow-context.ts    # <- FILE TO MODIFY (error handler at lines 155-162)
│   ├── workflow.ts             # <- REFERENCE: Completed fix at lines 286-297
│   └── ...
├── decorators/
│   ├── observed-state.ts       # <- REFERENCE: getObservedState function definition
│   └── ...
├── types/
│   ├── workflow.ts             # <- REFERENCE: WorkflowNode interface
│   ├── logging.ts              # <- REFERENCE: LogEntry interface
│   └── ...
└── __tests__/
    └── unit/
        └── workflow.test.ts    # <- REFERENCE: Test pattern for error state capture
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: WorkflowContext uses `this.workflow` NOT `this`
// In Workflow class: getObservedState(this)  <- refers to Workflow instance
// In WorkflowContext: getObservedState(this.workflow)  <- refers to WorkflowLike object

// CRITICAL: Logs are on this.workflow.node, not this.node
// this.workflow is WorkflowLike interface with a `node` property
// this.workflow.node is the WorkflowNode containing the logs array

// CRITICAL: Must use spread operator to create shallow copy of logs
// Pattern: [...this.workflow.node.logs] as LogEntry[]
// This prevents the captured logs from being modified by subsequent workflow execution

// CRITICAL: getObservedState import already exists from P1.M1.T2.S1
// Line 29: import { getObservedState } from '../decorators/observed-state.js';
// Do NOT add another import statement

// CRITICAL: Type assertion required for logs
// The logs array must be cast as LogEntry[] for type safety
// Pattern: [...this.workflow.node.logs] as LogEntry[]
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed. This fix uses existing types:
- `SerializedWorkflowState` - return type of `getObservedState()`
- `LogEntry[]` - type for logs array
- `WorkflowLike` - interface for `this.workflow`
- `WorkflowNode` - interface for `this.workflow.node`

### Implementation Tasks

```yaml
Task 1: MODIFY src/core/workflow-context.ts - Error Handler Fix
  - LOCATION: Lines 161-162 in the step() method error handler
  - REPLACE: `state: {}` with `state: getObservedState(this.workflow)`
  - REPLACE: `logs: []` with `logs: [...this.workflow.node.logs] as LogEntry[]`
  - PRESERVE: All other error properties (message, original, workflowId, stack)
  - PRESERVE: Import statement at line 29 (already added in P1.M1.T2.S1)
  - VALIDATION: getObservedState receives `this.workflow` not `this`
  - VALIDATION: Logs captured from `this.workflow.node.logs`
  - VALIDATION: Type assertion `as LogEntry[]` is present

Task 2: VALIDATION - Run Tests
  - COMMAND: npm test
  - EXPECTED: All tests pass
  - VERIFICATION: No new test failures introduced
  - COVERAGE: Existing workflow-context tests continue to pass

Task 3: OPTIONAL - Manual Verification
  - CREATE: Test workflow that fails in a step
  - VERIFY: Error event contains actual state (not empty object)
  - VERIFY: Error event contains actual logs (not empty array)
  - PATTERN: Follow test pattern from src/__tests__/unit/workflow.test.ts lines 82-130
```

### Implementation Patterns & Key Details

```typescript
// CURRENT CODE (Lines 155-164)
this.workflow.emitEvent({
  type: 'error',
  node: stepNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: {},      // <- BUG: Empty state
    logs: [],       // <- BUG: Empty logs
  },
});

// TARGET CODE
this.workflow.emitEvent({
  type: 'error',
  node: stepNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this.workflow),           // <- FIX: Capture actual state
    logs: [...this.workflow.node.logs] as LogEntry[], // <- FIX: Capture actual logs
  },
});
```

### Integration Points

```yaml
NO NEW INTEGRATIONS:
  - This is a pure bug fix with no new dependencies
  - Uses existing getObservedState import (added in P1.M1.T2.S1)
  - Uses existing WorkflowLike and WorkflowNode interfaces
  - Uses existing LogEntry type

CONSISTENCY WITH EXISTING CODE:
  - Pattern follows src/core/workflow.ts lines 286-297 (completed P1.M1.T1.S2/S3)
  - Same type assertion pattern: `as LogEntry[]`
  - Same spread operator pattern: `[...]`
  - Same getObservedState usage pattern (with different context object)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compilation check
npm run build

# Run linter (if configured)
npm run lint

# Expected: Zero compilation errors, zero linting errors
# If errors exist, READ output and fix before proceeding
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests
npm test

# Run specific test file for workflow context
npx vitest run src/__tests__/unit/context.test.ts

# Run with verbose output for debugging
npm test -- --reporter=verbose

# Expected: All tests pass. The test from P1.M1.T1.S4 validates error state capture
```

### Level 3: Integration Testing (System Validation)

```bash
# The existing test at src/__tests__/unit/workflow.test.ts lines 82-130
# validates functional workflow error state capture.
# After this fix, the step() error handler should behave similarly.

# Run integration tests
npm test -- src/__tests__/integration/

# Expected: All integration tests pass, error events contain state/logs
```

### Level 4: Manual Verification (Optional)

```typescript
// Create a test script to verify the fix:
import { Workflow } from './src/index.js';

const workflow = new Workflow<void>(
  { name: 'TestErrorHandler' },
  async (ctx) => {
    await ctx.step('failing-step', async () => {
      throw new Error('Test error');
    });
  }
);

const events = [];
workflow.addObserver({
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

await workflow.run().catch(() => {});

const errorEvent = events.find(e => e.type === 'error');
console.log('State:', errorEvent.error.state);  // Should NOT be empty
console.log('Logs:', errorEvent.error.logs);    // Should NOT be empty
```

## Final Validation Checklist

### Technical Validation

- [ ] Line 161 modified: `state: getObservedState(this.workflow)`
- [ ] Line 162 modified: `logs: [...this.workflow.node.logs] as LogEntry[]`
- [ ] No duplicate import statement added (already exists from P1.M1.T2.S1)
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] No new linting errors

### Feature Validation

- [ ] Error handler captures actual state from workflow
- [ ] Error handler captures actual logs from workflow node
- [ ] Pattern matches the completed fix in workflow.ts (lines 286-297)
- [ ] Type assertion `as LogEntry[]` is present
- [ ] Spread operator `[...]` creates shallow copy of logs

### Code Quality Validation

- [ ] Follows existing codebase patterns for error handling
- [ ] Maintains consistency with P1.M1.T1.S2/S3 fix pattern
- [ ] No modifications to other parts of the file
- [ ] No modifications to test files (tests will be added in P1.M1.T2.S4)

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable references
- [ ] No new environment variables or configuration needed
- [ ] No breaking changes to public API

---

## Anti-Patterns to Avoid

- ❌ Don't add `getObservedState` import again (already exists from P1.M1.T2.S1 at line 29)
- ❌ Don't use `this` for getObservedState (must use `this.workflow`)
- ❌ Don't capture logs from `this.node` (must use `this.workflow.node.logs`)
- ❌ Don't omit the `as LogEntry[]` type assertion
- ❌ Don't omit the spread operator `[...]` for logs
- ❌ Don't modify any other parts of the error handler
- ❌ Don't add tests in this subtask (tests will be added in P1.M1.T2.S4)
- ❌ Don't modify the second error handler in replaceLastPromptResult() (that's P1.M1.T2.S3)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Reasoning**:
1. The fix is a simple 2-line change following an established pattern
2. All dependencies are already in place (getObservedState import from P1.M1.T2.S1)
3. The pattern to follow is well-documented in workflow.ts (completed fix)
4. Clear line numbers and exact replacement targets provided
5. No new dependencies or complex logic introduced

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement this fix successfully using only the PRP content and codebase access.
