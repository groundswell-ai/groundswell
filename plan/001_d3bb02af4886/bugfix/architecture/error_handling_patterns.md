# Error Handling Architecture Analysis

## 1. WorkflowError Class Structure and Properties

**Location:** `/home/dustin/projects/groundswell/src/types/error.ts`

```typescript
export interface WorkflowError {
  message: string;           // Error message
  original: unknown;         // Original thrown error
  workflowId: string;        // ID of workflow where error occurred
  stack?: string;            // Stack trace if available
  state: SerializedWorkflowState;  // State snapshot at time of error
  logs: LogEntry[];          // Logs from the failing workflow node
}
```

### Key Characteristics

- **Interface-based** (not a class), allowing flexible error object creation
- Captures **complete execution context** including state and logs
- Preserves **original error** for root cause analysis
- Includes **workflow ID** for tracing in hierarchical structures

## 2. All Promise.all Usage Locations

### Primary Implementation - @Task Decorator

**File:** `/home/dustin/projects/groundswell/src/decorators/task.ts` (Line 112)

```typescript
// If concurrent option is set and we have multiple workflows, run them in parallel
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    await Promise.all(runnable.map((w) => w.run()));  // ← CRITICAL: First error wins
  }
}
```

### Other Promise.all Usage

1. **Examples:** `/home/dustin/projects/groundswell/examples/examples/06-concurrent-tasks.ts` (Lines 171, 174, 219)
2. **Tests:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/deep-analysis.test.ts` (Line 473)

### Promise.allSettled Usage

- **Zero actual implementations** in production code
- Only mentioned in documentation and research documents as a recommendation
- No code currently uses Promise.allSettled for error aggregation

## 3. Current Error Propagation Flow (Step-by-Step)

```
1. @Step Method Throws Error
   ↓
2. @Step Decorator Catch Block (src/decorators/step.ts:109-134)
   - Captures error state via getObservedState()
   - Creates WorkflowError object with full context
   - Emits error event to observers
   - Re-throws WorkflowError
   ↓
3. Parent @Task Method (if applicable)
   - Receives WorkflowError from child
   - NO error handling or aggregation
   - Error propagates naturally
   ↓
4. Concurrent Execution (src/decorators/task.ts:112)
   - Promise.all() with multiple workflows
   - FIRST ERROR WINS - immediately rejects on first failure
   - Other concurrent workflows may be left in undefined state
   - No cleanup or state management for partial executions
   ↓
5. Parent Workflow run() Method
   - May catch WorkflowError for custom handling
   - Otherwise propagates to root
   ↓
6. Workflow.runFunctional() (src/core/workflow.ts:470-488)
   - Catches error in functional workflow executor
   - Sets status to 'failed'
   - Emits error event
   - Re-throws original error
```

### Critical Issues

1. **Promise.all "First Error Wins" Problem:**
   - When concurrent workflows run, first failure aborts all others
   - No mechanism to collect all errors from concurrent operations
   - Partial execution state is undefined

2. **No Error Aggregation:**
   - Errors from multiple children are never combined
   - Each error is handled independently
   - No aggregate error reporting

3. **ErrorMergeStrategy Defined But Unused:**
   - Type exists but has zero implementation
   - No code path uses the combine() function
   - maxMergeDepth is never checked

## 4. Why ErrorMergeStrategy Exists But Isn't Used

**Location:** `/home/dustin/projects/groundswell/src/types/error-strategy.ts`

```typescript
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

### PRD Design Intent

- **Section 10:** "Optional Multi-Error Merging"
- **Default:** **disabled** → first error wins (race is preserved)
- **Purpose:** Designed for concurrent workflow error aggregation
- **Intent:** Collect and merge multiple WorkflowError objects

### Why It's Not Implemented

1. **Design Decision - Conservative Approach:**
   - PRD states "Default: disabled" as intentional design
   - "First error wins" preserves error race conditions
   - Implementation deferred to future enhancement

2. **No Configuration Hook:**
   - TaskOptions interface does not include errorMergeStrategy property
   - @Task decorator has no way to receive ErrorMergeStrategy configuration
   - No workflow-level error strategy configuration

3. **Promise.all vs Promise.allSettled:**
   - Current implementation uses Promise.all() which rejects immediately
   - ErrorMergeStrategy requires Promise.allSettled() to collect all errors
   - Switching would require significant refactoring

4. **Exported But Not Imported:**
   - ErrorMergeStrategy is exported from src/index.ts
   - **ZERO imports** anywhere in implementation files
   - Only appears in type definitions and documentation

## 5. Recommended Pattern for Promise.allSettled with Error Aggregation

### Current Implementation (src/decorators/task.ts:104-114)

```typescript
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(/* ... */);
  if (runnable.length > 0) {
    await Promise.all(runnable.map((w) => w.run()));  // ← Problem
  }
}
```

### Recommended Implementation

```typescript
// 1. Extend TaskOptions to include error merge strategy
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;
  errorMergeStrategy?: ErrorMergeStrategy;  // ← Add this
}

// 2. Update @Task decorator implementation
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(/* ... */);

  if (runnable.length > 0) {
    if (opts.errorMergeStrategy?.enabled) {
      // Use Promise.allSettled to collect all results/errors
      const results = await Promise.allSettled(runnable.map((w) => w.run()));

      // Separate successful and failed executions
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason as WorkflowError);

      // If there are errors, apply merge strategy
      if (errors.length > 0) {
        const mergedError = opts.errorMergeStrategy.combine
          ? opts.errorMergeStrategy.combine(errors)
          : createDefaultMergedError(errors);

        // Emit aggregated error event
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: mergedError,
        });

        throw mergedError;
      }
    } else {
      // Default behavior: first error wins (backward compatible)
      await Promise.all(runnable.map((w) => w.run()));
    }
  }
}

// 3. Default error merger implementation
function createDefaultMergedError(errors: WorkflowError[]): WorkflowError {
  return {
    message: `${errors.length} concurrent workflows failed`,
    original: errors.map(e => e.original),
    workflowId: errors[0].workflowId,  // Parent's ID
    stack: errors.map(e => e.stack).join('\n---\n'),
    state: {},  // Aggregate or empty state
    logs: errors.flatMap(e => e.logs),
  };
}
```

### Usage Example

```typescript
class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,
    errorMergeStrategy: {
      enabled: true,
      maxMergeDepth: 3,
      combine: (errors) => ({
        message: `Aggregated error from ${errors.length} children`,
        original: errors,
        workflowId: 'parent-id',
        state: { failedChildren: errors.length },
        logs: errors.flatMap(e => e.logs),
      })
    }
  })
  async spawnChildren() {
    return [
      new ChildWorkflow('child1', this),
      new ChildWorkflow('child2', this),
      new ChildWorkflow('child3', this),
    ];
  }
}
```

### Benefits of This Approach

1. **Backward Compatible:** Default behavior (first error wins) unchanged
2. **Opt-in:** Error aggregation only when explicitly enabled
3. **Flexible:** Custom combine() function for domain-specific merging
4. **Complete Context:** All errors captured with full WorkflowError context
5. **Safe:** Promise.allSettled ensures all workflows complete

## 6. Additional Findings

### Error Event Emission

- Errors are emitted as events: `{ type: 'error', node: WorkflowNode, error: WorkflowError }`
- Observers can track errors in real-time
- No error event aggregation - each error emitted separately

### State Capture at Error Time

- Uses WeakMap-based observed state (getObservedState())
- Captures all @ObservedState() decorated properties
- Redaction support for sensitive fields
- Automatic cleanup via WeakMap garbage collection

### Error Recovery Patterns

- Example code demonstrates manual try-catch in parent workflows
- No built-in retry mechanism
- Error isolation requires manual implementation
- Examples show "continue on error" patterns in sequential execution

### Testing Coverage

- Comprehensive error wrapping tests in `src/__tests__/unit/decorators.test.ts`
- Adversarial tests for concurrent error scenarios
- PRD compliance tests verify WorkflowError structure
- Edge case tests cover mixed success/failure scenarios

## Summary

The error handling architecture is **well-designed for single-error scenarios** but **lacks support for concurrent error aggregation**. The WorkflowError interface provides excellent context capture, and the @Step decorator properly wraps errors. However, the Promise.all() implementation in @Task decorator means "first error wins" behavior, leaving the ErrorMergeStrategy type as unused design intent.

The recommended path forward is to implement Promise.allSettled() with opt-in error aggregation via ErrorMergeStrategy configuration.
