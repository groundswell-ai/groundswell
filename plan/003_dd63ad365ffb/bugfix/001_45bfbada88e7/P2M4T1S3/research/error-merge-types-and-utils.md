# Error Merge Types and Utilities Research

## Overview

This document provides complete type definitions and utility function signatures needed for workflow-level error merge tests.

## 1. WorkflowConfig Interface

**File:** `src/types/workflow-context.ts` (lines 145-190)

```typescript
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;

  /**
   * Strategy for merging multiple errors
   *
   * @remarks
   * When provided, enables workflow-level error merge for multiple failures.
   * Default: undefined (first error wins behavior).
   *
   * @example
   * ```ts
   * // Enable error merging with default strategy
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: { enabled: true }
   * };
   *
   * // Enable with custom combine function
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: {
   *     enabled: true,
   *     combine: (errors) => ({
   *       message: `Custom: ${errors.length} failures`,
   *       // ... custom error object
   *     })
   *   }
   * };
   *
   * // Default behavior (first error wins)
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow'
   *   // errorMergeStrategy not provided = first error wins
   * };
   * ```
   */
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

**Key Points:**
- `errorMergeStrategy` is optional (undefined = default behavior)
- When provided, enables workflow-level error merge
- Supports custom combine function override

## 2. ErrorMergeStrategy Interface

**File:** `src/types/error-strategy.ts` (lines 6-13)

```typescript
export interface ErrorMergeStrategy {
  /** Enable error merging (default: false, first error wins) */
  enabled: boolean;
  /** Maximum depth to merge errors */
  maxMergeDepth?: number;
  /** Custom function to combine multiple errors */
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

**Key Points:**
- `enabled`: Must be `true` for error collection
- `maxMergeDepth`: Currently defined but not enforced
- `combine`: Optional custom function that returns a `WorkflowError`

## 3. WorkflowError Interface

**File:** `src/types/error.ts` (lines 7-20)

```typescript
export interface WorkflowError {
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

**Key Points:**
- `original`: Contains the `WorkflowAggregateError` marker when merged
- `state`: Snapshot of workflow state at error time
- `logs`: Array of log entries from the failing node

## 4. mergeWorkflowErrors Function

**File:** `src/utils/workflow-error-utils.ts` (lines 23-56)

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

**Function Signature:**
```typescript
mergeWorkflowErrors(
  errors: WorkflowError[],      // Array of errors to merge
  taskName: string,             // Name of the task/workflow
  parentWorkflowId: string,     // Parent workflow ID
  totalChildren: number         // Total number of operations
): WorkflowError                // Single merged error
```

**Key Points:**
- Uses first error's stack trace and state
- Aggregates all logs from all errors
- Creates `WorkflowAggregateError` marker in `original.name`
- Deduplicates workflow IDs using Set

## 5. WorkflowAggregateError Pattern

**Not a formal type**: `WorkflowAggregateError` is not defined as a TypeScript interface or type.

**Runtime pattern**: It exists as a string value in the `original.name` property.

```typescript
// Detection pattern
const isAggregateError = (error: WorkflowError): boolean => {
  return error.original?.name === 'WorkflowAggregateError';
};

// Type guard for metadata
const isAggregateMetadata = (metadata: unknown): metadata is {
  name: string;
  message: string;
  errors: WorkflowError[];
  totalChildren: number;
  failedChildren: number;
  failedWorkflowIds: string[];
} => {
  return typeof metadata === 'object' && metadata !== null && 'name' in metadata;
};
```

**Structure of `original` field when merged:**
```typescript
{
  name: 'WorkflowAggregateError',
  message: string,              // Same as error.message
  errors: WorkflowError[],      // Original errors
  totalChildren: number,        // Total operations
  failedChildren: number,       // Number of failures
  failedWorkflowIds: string[]   // IDs of failed workflows
}
```

## 6. Test Assertion Patterns

### Error Message Validation

```typescript
// Check aggregate error message format
expect(mergedError.message).toBe("2 of 3 concurrent child workflows failed in task 'testTask'");

// For workflow-level (adapted message)
expect(mergedError.message).toMatch(/\d+ of \d+ steps failed in workflow/);
```

### Metadata Structure Validation

```typescript
// Check aggregate error marker
const metadata = mergedError.original as {
  name: string;
  message: string;
  errors: WorkflowError[];
  totalChildren: number;
  failedChildren: number;
  failedWorkflowIds: string[];
};

expect(metadata.name).toBe('WorkflowAggregateError');
expect(metadata.totalChildren).toBe(3);
expect(metadata.failedChildren).toBe(2);
expect(metadata.failedWorkflowIds).toHaveLength(2);
expect(metadata.errors).toHaveLength(2);
```

### WorkflowError Field Validation

```typescript
// Verify WorkflowError structure
expect(error.message).toBeDefined();
expect(error.original).toBeDefined();
expect(error.workflowId).toBe(parentWorkflowId);
expect(error.stack).toBeDefined();  // From first error
expect(error.state).toBeDefined();  // From first error
expect(Array.isArray(error.logs)).toBe(true);
expect(error.logs.length).toBeGreaterThan(0);  // Aggregated logs
```

## 7. Key Relationships and Dependencies

```
WorkflowConfig
    └── errorMergeStrategy?: ErrorMergeStrategy
            ├── enabled: boolean
            ├── maxMergeDepth?: number
            └── combine?: (errors: WorkflowError[]) => WorkflowError
                     └── returns: WorkflowError
                              ├── message: string
                              ├── original: unknown  (WorkflowAggregateError)
                              ├── workflowId: string
                              ├── stack?: string
                              ├── state: SerializedWorkflowState
                              └── logs: LogEntry[]
```

**Default Behavior (no errorMergeStrategy):**
- Throws first error immediately
- Stops execution on first failure
- Backward compatible

**With errorMergeStrategy.enabled = true:**
- Collects all errors
- Continues execution after failures
- Merges errors at end using `mergeWorkflowErrors` or custom `combine`
- Throws `WorkflowAggregateError` for multiple errors
- Throws single error directly (not wrapped) for one error

## 8. Gotchas and Special Behaviors

1. **Optional Field Dependencies**: The `combine` function is optional - if not provided, uses `mergeWorkflowErrors`

2. **Original Property**: Contains a special object with `name: 'WorkflowAggregateError'` when errors are merged

3. **State and Stack**: Uses the first error's state and stack trace (not aggregated)

4. **Error Message Format**: "X of Y concurrent child workflows failed in task 'taskName'" - for workflows, this will be adapted

5. **ID Deduplication**: Uses Set to get unique workflow IDs

6. **Single Error Handling**: If only one error is collected, it's thrown directly (not wrapped in aggregate)

7. **Custom Combine Override**: If `combine` function is provided, it completely replaces `mergeWorkflowErrors`

## 9. Implementation Status

- ✅ **Complete**: All types and utilities are defined
- ✅ **Functional**: `mergeWorkflowErrors` function is implemented
- ✅ **Tested**: Test files verify the behavior in `src/__tests__/unit/utils/workflow-error-utils.test.ts`
- ⚠️ **Not fully integrated**: The `maxMergeDepth` property is defined but not enforced

## 10. Import Paths for Tests

```typescript
// Type imports
import type { WorkflowError } from '@/types/error.js';
import type { WorkflowConfig, ErrorMergeStrategy } from '@/types/workflow-context.js';

// Utility imports
import { mergeWorkflowErrors } from '@/utils/workflow-error-utils.js';

// Class imports
import { Workflow } from '@/core/workflow.js';
```
