# Error Merge Strategy Research

## Overview

Research findings for P2.M4.T1.S1: Extend WorkflowConfig with errorMergeStrategy field.

## Key Findings

### 1. ErrorMergeStrategy Interface Location

**File**: `src/types/error-strategy.ts`

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

**Key Insight**: The interface already exists. This task is about adding a reference to it in WorkflowConfig, not creating a new interface.

### 2. @Task Decorator Error Merge Implementation

**File**: `src/decorators/task.ts` (lines 121-138)

The @Task decorator shows the complete pattern for error merge:

```typescript
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

// Backward compatibility: throw first error (lines 141-142)
throw rejected[0].reason;
```

**Key Patterns**:
- Uses optional chaining `opts.errorMergeStrategy?.enabled`
- Falls back to "first error wins" when disabled
- Uses custom `combine()` function or default `mergeWorkflowErrors()`
- Emits error event with merged error
- Throws the merged error

### 3. Default Error Merge Utility

**File**: `src/utils/workflow-error-utils.ts`

The `mergeWorkflowErrors()` function provides default error merging behavior:

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
    stack: errors[0]?.stack,
    state: errors[0]?.state || ({} as SerializedWorkflowState),
    logs: allLogs,
  };

  return mergedError;
}
```

**Key Insight**: This utility can be reused for workflow-level error merging in future tasks (P2.M4.T1.S2).

### 4. WorkflowConfig Interface Current State

**File**: `src/types/workflow-context.ts` (lines 144-153)

```typescript
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;
}
```

**Key Insight**: All existing fields are optional with `?` suffix. The new field should follow this pattern.

### 5. Optional Field Extension Pattern

From codebase analysis (ProviderOptions, AgentConfig, TaskOptions):

**Pattern**:
```typescript
export interface ExistingInterface {
  existingField?: string;
  // Add new optional field
  newField?: Type;
}
```

**JSDoc Pattern**:
```typescript
/**
 * Brief description
 *
 * @remarks
 * Optional detailed behavior description.
 *
 * @default false
 */
newField?: Type;
```

### 6. WorkflowConfig Processing Pattern

**File**: `src/core/workflow.ts` (lines 105-114)

```typescript
if (typeof name === 'object' && name !== null) {
  // Functional pattern: constructor(config, executor)
  this.config = name;
  this.executor = parentOrExecutor as WorkflowExecutor<T>;
  this.parent = null;
} else {
  // Class-based pattern: constructor(name, parent)
  this.config = { name: name ?? this.constructor.name };
  this.parent = (parentOrExecutor as Workflow) ?? null;
}
```

**Key Insight**: Config is stored directly in `this.config`. No additional processing needed for this task (that's P2.M4.T1.S2).

### 7. Default Value Patterns in Workflow

**File**: `src/core/workflow.ts` (lines 828-833)

```typescript
const ctx = createWorkflowContext(
  this as unknown as Parameters<typeof createWorkflowContext>[0],
  this.parent?.id,
  this.config.enableReflection ? { enabled: true } : undefined,
  this.config.autoValidateResponses ?? true  // Default to true
);
```

**Patterns**:
- Nullish coalescing for simple defaults: `this.config.field ?? defaultValue`
- Conditional for boolean flags: `this.config.flag ? value : undefined`

**For errorMergeStrategy**: Default should be "disabled" (undefined/false) to match PRD "first error wins" behavior.

## Import Pattern

ErrorMergeStrategy is imported in other files as:

```typescript
import type { ErrorMergeStrategy } from '../types/error-strategy.js';
```

In `src/types/workflow-context.ts`, the import will be:

```typescript
import type { ErrorMergeStrategy } from './error-strategy.js';
```

## Test Patterns

From `src/__tests__/unit/workflow-context.test.ts`:
- Tests use mock workflow objects
- No direct WorkflowConfig testing in existing tests
- Config is tested through behavior (node.name, etc.)

**Test approach for this task**:
- Test that WorkflowConfig accepts errorMergeStrategy field
- Test that undefined/default results in "first error wins" (future task)
- Test that enabled: true enables error merge (future task)
- For this task (S1), minimal tests needed since we're just adding the field

## PRD Context

From PRD Issue description:
- Current: Error merge only available for @Task concurrent execution
- Goal: Extend to workflow-level configuration
- Default: "first error wins" (disabled)
- Future task (S2): Implement error collection in workflow execution

## Dependencies

**No dependencies** - This is a pure interface extension task.

**Future tasks depend on this**:
- P2.M4.T1.S2: Implement error collection in workflow execution
- P2.M4.T1.S3: Write tests for workflow-level error merge

## Files to Modify

1. **src/types/workflow-context.ts** - Add `errorMergeStrategy?: ErrorMergeStrategy;` field
2. **No other files** - This task is ONLY the interface extension

## Success Criteria

- [ ] WorkflowConfig interface has `errorMergeStrategy?: ErrorMergeStrategy;` field
- [ ] Proper JSDoc comment with @default
- [ ] Import statement added for ErrorMergeStrategy type
- [ ] TypeScript compiles without errors
- [ ] No breaking changes to existing code

## References

- `src/types/error-strategy.ts` - ErrorMergeStrategy interface
- `src/decorators/task.ts` - @Task decorator error merge implementation (pattern reference)
- `src/utils/workflow-error-utils.ts` - Default merge function (for future S2)
- `src/types/workflow-context.ts` - WorkflowConfig interface (target file)
- `src/core/workflow.ts` - Workflow constructor and config usage (for context)
