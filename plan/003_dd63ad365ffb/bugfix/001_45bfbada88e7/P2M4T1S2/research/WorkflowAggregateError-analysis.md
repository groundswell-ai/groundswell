# WorkflowAggregateError Analysis

## Overview

This research note provides a comprehensive analysis of the `WorkflowAggregateError` pattern in the Groundswell codebase. This error type is central to the workflow-level error merge strategy functionality.

## 1. Definition Location

The `WorkflowAggregateError` is **not defined as a formal class** in the current codebase. Instead, it is **dynamically created** within the `mergeWorkflowErrors` utility function at `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`.

## 2. Inheritance Structure

Since `WorkflowAggregateError` is created dynamically as a plain object, it does not have traditional inheritance from the Error class. Instead, it implements the `WorkflowError` interface.

## 3. Properties and Structure

The `WorkflowAggregateError` object implements the `WorkflowError` interface with the following properties:

### Core WorkflowError Properties:
```typescript
interface WorkflowError {
  /** Error message */
  message: string;
  /** Original thrown error */
  original: unknown;
  /** ID of workflow where error occurred */
  workflowId: string;
  /** Stack trace if available */
  stack?: string;
  /** State snapshot at time of error */
  state: SerializedWorkflowState;
  /** Logs from the failing workflow node */
  logs: LogEntry[];
}
```

### Specific WorkflowAggregateError Metadata:
When created by `mergeWorkflowErrors`, the `original` property contains an object with these additional fields:

```typescript
original: {
  name: 'WorkflowAggregateError',        // Identifier for the error type
  message: string,                       // Aggregated error message
  errors: WorkflowError[],              // Array of all individual errors
  totalChildren: number,                // Total number of child workflows spawned
  failedChildren: number,               // Number of failed child workflows
  failedWorkflowIds: string[],          // Array of failed workflow IDs (deduplicated)
} as unknown;
```

## 4. Constructor Parameters

The `WorkflowAggregateError` is constructed by the `mergeWorkflowErrors` function with these parameters:

```typescript
function mergeWorkflowErrors(
  errors: WorkflowError[],          // Array of individual WorkflowError objects
  taskName: string,                 // Name of the task that spawned concurrent workflows
  parentWorkflowId: string,         // ID of the parent workflow
  totalChildren: number             // Total number of child workflows spawned
): WorkflowError
```

## 5. Differences from Standard Error

### Key Differences:
1. **Not an actual Error class**: Cannot be `new`'d or `instanceof` checked
2. **No stack trace**: Uses the stack trace from the first error in the collection
3. **No Error.prototype methods**: Does not inherit standard Error methods like `.name` (except as string property)
4. **Workflow-specific structure**: Contains workflow context and metadata

### Similarities:
1. **Implements WorkflowError interface**: Can be used anywhere a WorkflowError is expected
2. **Has message property**: Standard error message format
3. **Contains original error**: Preserves access to individual errors via `original.errors`

## 6. Relationship to mergeWorkflowErrors

The `mergeWorkflowErrors` function is the primary constructor for `WorkflowAggregateError` objects. This function:

1. **Aggregates multiple errors**: Combines all failed workflow errors into a single error
2. **Creates formatted message**: Generates message in format `"X of Y concurrent child workflows failed in task 'taskName'"`
3. **Deduplicates workflow IDs**: Ensures unique failed workflow IDs in metadata
4. **Combines logs**: Flattens logs from all failed workflows into a single array
5. **Preserves first error state**: Uses the state and stack trace from the first error

## 7. Usage Examples from Codebase

### Example 1: Concurrent Task Error Merging
```typescript
// In @Task decorator with errorMergeStrategy.enabled=true
class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,
    errorMergeStrategy: { enabled: true },
  })
  async spawnChildren() {
    return [
      createChildWorkflow(this, 'Success1', false),
      createChildWorkflow(this, 'Fail1', true),
      createChildWorkflow(this, 'Success2', false),
    ];
  }
}

// When executed, if Fail1 throws:
// thrownError will be WorkflowAggregateError with:
// message: "1 of 3 concurrent child workflows failed in task 'spawnChildren'"
// original: { name: 'WorkflowAggregateError', errors: [error1], totalChildren: 3, ... }
```

### Example 2: Accessing Aggregate Metadata
```typescript
try {
  await workflow.run();
} catch (error) {
  if (error.original?.name === 'WorkflowAggregateError') {
    const aggregate = error.original as {
      name: string;
      errors: WorkflowError[];
      totalChildren: number;
      failedChildren: number;
      failedWorkflowIds: string[];
    };

    console.log(`Failed ${aggregate.failedChildren}/${aggregate.totalChildren} workflows`);
    console.log('Failed workflow IDs:', aggregate.failedWorkflowIds);
  }
}
```

## 8. Error Message Formatting Behavior

The error message follows a consistent pattern:
```
"{failedCount} of {totalCount} concurrent child workflows failed in task '{taskName}'"
```

Examples:
- `"1 of 1 concurrent child workflows failed in task 'spawnChildren'"` (single failure)
- `"2 of 5 concurrent child workflows failed in task 'processData'"` (multiple failures)
- `"3 of 3 concurrent child workflows failed in task 'validation'"` (all failed)

## 9. Design Considerations

### Current Implementation Strengths:
1. **Simple implementation**: Easy to create and maintain
2. **Type-safe**: Implements WorkflowError interface
3. **Rich metadata**: Preserves all error information
4. **Consistent messaging**: Standardized error format

### Potential Improvements:
1. **Actual Error class**: Could extend Error for better debugging
2. **Custom toString()**: Could provide formatted output
3. **Error chaining**: Could preserve error stack trace hierarchy
4. **Error statistics**: Could include error type categorization

## 10. Related Code Files

- **Primary implementation**: `/src/utils/workflow-error-utils.ts`
- **Type definitions**: `/src/types/error.ts`
- **Tests**: `/src/__tests__/unit/utils/workflow-error-utils.test.ts`
- **Usage**: `/src/__tests__/adversarial/error-merge-strategy.test.ts`
- **Interface**: `/src/types/error-strategy.ts`

---

This analysis shows that `WorkflowAggregateError` is a well-designed error aggregation mechanism that provides comprehensive error information while maintaining simplicity and type safety in the workflow execution context.
