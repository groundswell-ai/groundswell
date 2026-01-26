# mergeWorkflowErrors Utility Analysis

### Overview

This research note provides a comprehensive analysis of the `mergeWorkflowErrors` utility function in `src/utils/workflow-error-utils.ts`. This utility is central to the error handling strategy for concurrent task execution in the Groundswell workflow engine.

### Complete Function Signature

```typescript
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError {
  // Implementation...
}
```

### Parameter Types and Descriptions

| Parameter | Type | Description |
|-----------|------|-------------|
| `errors` | `WorkflowError[]` | Array of WorkflowError objects to merge and aggregate |
| `taskName` | `string` | Name of the task that spawned the concurrent workflows |
| `parentWorkflowId` | `string` | ID of the parent workflow that contains the concurrent task |
| `totalChildren` | `number` | Total number of child workflows that were spawned (not just failed ones) |

### Return Type and Behavior

The function returns a single `WorkflowError` object that aggregates information from all input errors.

#### Return Structure
```typescript
{
  message: string;
  original: unknown; // Contains WorkflowAggregateError metadata
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

#### Key Return Behaviors

1. **Message Format**: Creates a summary message like `"3 of 5 concurrent child workflows failed in task 'myTask'"`

2. **Original Field**: Contains the `WorkflowAggregateError` metadata structure:
   ```typescript
   {
     name: 'WorkflowAggregateError',
     message: string,
     errors: WorkflowError[],
     totalChildren: number,
     failedChildren: number,
     failedWorkflowIds: string[]
   }
   ```

3. **Workflow ID**: Uses the parent workflow ID (not child IDs)

4. **Stack Trace**: Uses the first error's stack trace (`errors[0]?.stack`)

5. **State**: Uses the first error's state or empty object if undefined

6. **Logs**: Aggregates all logs from all errors using `flatMap`

### Single vs Multiple Error Handling

#### Single Error (Edge Case)
- When merging one error, it still creates the aggregated format
- Message format: `"1 of 1 concurrent child workflows failed in task 'taskName'"`
- Preserves all properties from the single error
- Still wraps in WorkflowAggregateError structure

#### Multiple Errors
- Counts total number of failures
- Deduplicates workflow IDs using `Set`
- Aggregates all logs into a single array
- Uses first error's stack and state for reference

### Relationship between mergeWorkflowErrors and WorkflowAggregateError

#### Key Findings

1. **No Formal Interface**: `WorkflowAggregateError` is not defined as a formal TypeScript interface anywhere in the codebase.

2. **Runtime Only**: The "WorkflowAggregateError" exists only at runtime as a plain JavaScript object stored in the `original` field of the returned `WorkflowError`.

3. **Pattern**: The original field contains an object with specific metadata fields (see Return Structure above).

4. **Purpose**: This pattern allows downstream code to detect if an error is an aggregate error and access its metadata through type guards.

### Current Usage by @Task Decorator

#### Location in Code
`src/decorators/task.ts` (lines 121-139)

#### Usage Pattern
The `@Task` decorator uses `mergeWorkflowErrors` when:

1. **Concurrent Tasks**: The task is configured with `concurrent: true`
2. **Multiple Workflows**: Returns an array of workflows
3. **Errors Occur**: Some workflows fail (`Promise.allSettled` has rejections)
4. **Error Merge Strategy Enabled**: `opts.errorMergeStrategy?.enabled` is true

#### Implementation Flow
```typescript
// 1. Run concurrent workflows
const results = await Promise.allSettled(runnable.map((w) => w.run()));

// 2. Filter rejected promises
const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

// 3. Check error merge strategy
if (opts.errorMergeStrategy?.enabled) {
  // Extract WorkflowError objects
  const errors = rejected.map((r) => r.reason as WorkflowError);

  // Use custom combine or default merger
  const mergedError = opts.errorMergeStrategy?.combine
    ? opts.errorMergeStrategy.combine(errors)
    : mergeWorkflowErrors(errors, taskName, wf.id, runnable.length);

  // Emit error event and throw merged error
  wf.emitEvent({ type: 'error', node: wf.node, error: mergedError });
  throw mergedError;
}

// 4. Backward compatibility: throw first error
throw rejected[0].reason;
```

### Gotchas and Edge Cases

#### 1. Empty Error Array
- Function will still return a valid WorkflowError
- Message: `"0 of N concurrent child workflows failed in task 'taskName'"`
- Logs array will be empty

#### 2. Undefined State
- If first error has `undefined` state, uses empty object `{}`
- Ensures consistent state structure in returned error

#### 3. Undefined Stack Trace
- If first error has `undefined` stack, returned error will also have `undefined` stack
- No attempt to create synthetic stack traces

#### 4. Type Safety
- Relies on consumer passing `WorkflowError[]` - runtime validation limited
- Uses `as WorkflowError` type assertions without runtime checks

#### 5. Log Order
- Logs are concatenated in array order (first error's logs first)
- No timestamp sorting or deduplication

#### 6. Message Generation
- Message always includes exact counts and task name
- No truncation or summarization of individual error messages

### Performance Considerations

1. **Set Creation**: Uses `[...new Set(errors.map(...))]` for deduplication - O(n) complexity
2. **Log Aggregation**: Uses `flatMap` which is efficient for concatenation
3. **First Error Preference**: Only references first error's stack/state - constant time
4. **No Deep Copying**: Preserves original error objects by reference

### Future Extensions

Based on the research, this utility is designed to be reusable for:
1. **Workflow-Level Error Collection**: Will be extended to collect errors across all sequential steps in a workflow
2. **Custom Error Merging**: Supports custom `combine` functions for specialized error aggregation
3. **Hierarchical Error Reporting**: Pattern supports multi-level error aggregation for complex workflows

### Summary

The `mergeWorkflowErrors` utility is a well-designed function that provides consistent error aggregation for concurrent task execution. It successfully balances detailed error information with practical usability, while maintaining flexibility for custom error handling strategies.
