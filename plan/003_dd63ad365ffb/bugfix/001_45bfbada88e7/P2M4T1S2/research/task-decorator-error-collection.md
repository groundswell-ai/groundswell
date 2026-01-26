# @Task Decorator Error Collection Pattern Analysis

### Overview

This research note provides a comprehensive analysis of the @Task decorator's error collection pattern. This pattern serves as the reference implementation for workflow-level error collection in P2.M4.T1.S2.

### 1. @Task Decorator Location

The @Task decorator is defined in `/home/dustin/projects/groundswell/src/decorators/task.ts`

### 2. How @Task Currently Uses mergeWorkflowErrors

The @Task decorator uses `mergeWorkflowErrors` when executing concurrent workflows. The key implementation pattern is:

```typescript
// From src/decorators/task.ts lines 106-145
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    const results = await Promise.allSettled(runnable.map((w) => w.run()));

    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    if (rejected.length > 0) {
      // Check if error merge strategy is enabled
      if (opts.errorMergeStrategy?.enabled) {
        // Extract WorkflowError objects from rejected promises
        const errors = rejected.map((r) => r.reason as WorkflowError);

        // Merge errors using custom combine() or default merger
        const mergedError = opts.errorMergeStrategy?.combine
          ? opts.errorMergeStrategy.combine(errors)
          : mergeWorkflowErrors(errors, taskName, wf.id, runnable.length);

        // Emit error event with merged error
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: mergedError,
        });

        // Throw merged error
        throw mergedError;
      }

      // Backward compatibility: throw first error
      throw rejected[0].reason;
    }
  }
}
```

### 3. Error Collection Logic

The @Task decorator follows this error collection pattern:

1. **Concurrent Execution**: Only when `opts.concurrent = true` and the method returns an array
2. **Promise.allSettled**: Uses `Promise.allSettled` to run all workflows and collect results
3. **Filter Rejected Results**: Extracts only the rejected promises (failed workflows)
4. **Error Strategy Check**: Checks if `errorMergeStrategy.enabled = true`
5. **Error Extraction**: Maps rejected reasons to WorkflowError objects
6. **Merge Decision**: Either uses custom `combine()` function or default `mergeWorkflowErrors`

### 4. What Triggers Error Merge vs Direct Throw

The decision flow:

- **Error Merge Triggered**:
  - `opts.concurrent = true`
  - Method returns an array of workflows
  - At least one workflow fails (rejected promise)
  - `opts.errorMergeStrategy.enabled = true`
  - Result: Merged error is thrown

- **Direct Throw**:
  - `opts.concurrent = false` (default)
  - `opts.concurrent = true` but `errorMergeStrategy.enabled = false`
  - Array not returned (single workflow)
  - `Promise.allSettled` contains rejected results
  - Result: First rejected error is thrown directly

### 5. How errorMergeStrategy Affects Behavior

The `ErrorMergeStrategy` interface (`/home/dustin/projects/groundswell/src/types/error-strategy.ts`):

```typescript
interface ErrorMergeStrategy {
  /** Enable error merging (default: false, first error wins) */
  enabled: boolean;
  /** Maximum depth to merge errors (currently not implemented) */
  maxMergeDepth?: number;
  /** Custom function to combine multiple errors */
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

**Effect on behavior**:

- `enabled: false`: Backward compatible behavior - throws first error encountered
- `enabled: true`: Aggregates all errors into a single WorkflowError
- `combine` function: Custom error aggregation logic instead of default merger
- `maxMergeDepth`: Currently ignored in implementation but designed for nested error handling

### 6. Control Flow When Errors Are Collected

When errors are collected and merged:

1. **Error Collection**: All rejected WorkflowError objects are collected
2. **Merge Execution**:
   - If custom `combine()` exists, it's called with all errors
   - Otherwise, `mergeWorkflowErrors()` is called with default parameters
3. **Event Emission**: A single `error` event is emitted with the merged error
4. **Error Propagation**: The merged error is thrown to the caller

### 7. mergeWorkflowErrors Function Implementation

From `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`:

```typescript
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError {
  // Create merged error message
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

  // Get all unique workflow IDs that failed
  const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

  // Aggregate all logs
  const allLogs = errors.flatMap((e) => e.logs);

  // Create merged WorkflowError
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack, // Use first error's stack trace
    state: errors[0]?.state || ({} as SerializedWorkflowState), // Use first error's state
    logs: allLogs,
  };

  return mergedError;
}
```

### 8. Pattern to Follow for Workflow-Level Implementation

Based on this analysis, here's the pattern to implement at the workflow level:

```typescript
// Error collection pattern to implement
class Workflow {
  private collectedErrors: WorkflowError[] = [];

  // 1. Collect errors during execution
  protected collectError(error: unknown): void {
    if (error instanceof WorkflowError) {
      this.collectedErrors.push(error);
    }
  }

  // 2. Check if we should merge vs throw directly
  protected shouldMergeErrors(): boolean {
    // Check configuration (similar to TaskOptions.errorMergeStrategy)
    return this.config.errorMergeStrategy?.enabled || false;
  }

  // 3. Merge all collected errors
  protected mergeCollectedErrors(): WorkflowError {
    const config = this.config.errorMergeStrategy;

    if (config?.combine) {
      return config.combine(this.collectedErrors);
    }

    // Use mergeWorkflowErrors with workflow context
    return mergeWorkflowErrors(
      this.collectedErrors,
      this.id, // taskName equivalent
      this.id, // parentWorkflowId (workflow is its own parent)
      this.totalOperations // totalChildren equivalent
    );
  }

  // 4. Handle error decision flow
  protected finalizeErrorHandling(): void {
    if (this.collectedErrors.length > 0) {
      if (this.shouldMergeErrors()) {
        const mergedError = this.mergeCollectedErrors();

        // Emit error event
        this.emitEvent({
          type: 'error',
          node: this.node,
          error: mergedError,
        });

        // Throw merged error
        throw mergedError;
      } else {
        // Throw first error (backward compatibility)
        throw this.collectedErrors[0];
      }
    }
  }
}
```

### Key Design Principles from @Task Decorator

1. **Non-Breaking**: Default behavior remains unchanged (throw first error)
2. **Configurable**: Optional merge strategy that can be enabled/disabled
3. **Event Integration**: Merged errors emit events before being thrown
4. **Flexible**: Supports both default and custom merge strategies
5. **Preserves Context**: Merged errors contain full context from all failed operations
6. **Complete Execution**: All workflows/operations complete even when errors occur

This pattern provides a solid foundation for implementing workflow-level error collection while maintaining backward compatibility and following established patterns in the codebase.
