# Error Merge Test Patterns Research

## Overview

This document analyzes the testing patterns from `src/__tests__/adversarial/error-merge-strategy.test.ts` (760 lines) to establish best practices for creating workflow-level error merge tests.

## 1. Test File Structure and Organization Patterns

### Main Describe Block Structure

```typescript
describe('@Task decorator ErrorMergeStrategy', () => {
  // Helper functions defined at top level
  function createChildWorkflow(...) {...}
  function setupEventObserver(...) {...}
  function createMockWorkflowError(...) {...}

  // Test suites organized by behavior
  describe('Default behavior (errorMergeStrategy disabled)', () => {...})
  describe('Enabled with default error merge', () => {...})
  describe('Enabled with custom combine function', () => {...})
  describe('Edge cases and error scenarios', () => {...})
})
```

**Key Pattern**:
- Single top-level `describe` block for the feature being tested
- Helper functions defined at the top level (lines 29-90)
- Nested `describe` blocks organized by behavior/configuration
- Each test block follows ARRANGE-ACT-ASSERT pattern

## 2. Setup/Fixture Patterns for @Task Concurrent Execution Tests

### Parent Workflow Pattern

```typescript
class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,           // CRITICAL: Required for error merging
    errorMergeStrategy: {...},  // Configuration being tested
  })
  async spawnChildren() {
    return [
      createChildWorkflow(this, 'Child-0', false),
      createChildWorkflow(this, 'Child-1', true), // Will fail
      createChildWorkflow(this, 'Child-2', false),
    ];
  }

  async run() {
    try {
      await this.spawnChildren();
    } catch (err) {
      return err; // Capture error for validation
    }
  }
}
```

**Key Patterns**:
- Parent workflow must have `@Task({ concurrent: true })` (lines 96, 137, 183)
- Child workflows created by `createChildWorkflow` helper
- Parent's `run()` method catches errors for validation
- Return error from catch block for testing (lines 109-111, 150-154)

### Child Workflow Creation Helper (lines 29-51)

```typescript
function createChildWorkflow(
  parent: Workflow,
  name: string,
  shouldFail: boolean = false
): Workflow {
  return new (class extends Workflow {
    @Step()
    async executeStep() {
      if (shouldFail) {
        throw new Error(`${name} failed`);
      }
      return `${name} succeeded`;
    }
  })(name, parent);
}
```

## 3. Test Case Patterns for Different Error Merge Scenarios

### Default Behavior Tests (Disabled)

```typescript
describe('Default behavior (errorMergeStrategy disabled)', () => {
  it('should throw first error when errorMergeStrategy not provided', async () => {
    // ARRANGE: No errorMergeStrategy config
    @Task({ concurrent: true })
    async spawnChildren() { /* 3 children, 1 fails */ }

    // ASSERT: First error wins
    expect(thrownError.message).toContain('Child-1 failed');
    // ASSERT: Individual events only, no merge event
    expect(errorEvents.length).toBe(1);
  });

  it('should throw first error when errorMergeStrategy.enabled=false', async () => {
    // ARRANGE: Explicit disabled
    @Task({ concurrent: true, errorMergeStrategy: { enabled: false } })
    // ASSERT: Same as above but with explicit config
  });
});
```

### Default Merge Enabled Tests

```typescript
describe('Enabled with default error merge', () => {
  it('should merge all errors when errorMergeStrategy.enabled=true', async () => {
    // ARRANGE: Enable merge without custom combine
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: true } // No combine function
    })

    // ASSERT: Message format
    expect(error.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

    // ASSERT: Metadata structure
    const metadata = error.original as {
      name: string;
      message: string;
      errors: WorkflowError[];
      totalChildren: number;
      failedChildren: number;
      failedWorkflowIds: string[];
    };
  });
});
```

### Custom Combine Function Tests

```typescript
describe('Enabled with custom combine function', () => {
  it('should call custom combine function when provided', async () => {
    // ARRANGE: Spy on combine function
    const combineSpy = vi.fn((errors: WorkflowError[]) => ({...}));

    @Task({
      concurrent: true,
      errorMergeStrategy: {
        enabled: true,
        combine: combineSpy, // Custom function
      },
    })

    // ASSERT: Function called
    expect(combineSpy).toHaveBeenCalledTimes(1);
    // ASSERT: Called with array of WorkflowError objects
    const errorsArg = calls[0][0] as WorkflowError[];
  });
});
```

## 4. Assertion Patterns for WorkflowAggregateError Detection

### Error Message Validation

```typescript
// Message format: "X of Y concurrent child workflows failed in task 'taskName'"
expect(thrownError.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");
expect(thrownError.message).toMatch(/\d+ of \d+ concurrent child workflows failed/);
expect(thrownError.message).toContain("task 'spawnChildren'");
```

### Metadata Structure Validation

```typescript
const metadata = thrownError.original as {
  name: string;
  message: string;
  errors: WorkflowError[];
  totalChildren: number;
  failedChildren: number;
  failedWorkflowIds: string[];
};

expect(metadata.name).toBe('WorkflowAggregateError');
expect(metadata.totalChildren).toBe(5);
expect(metadata.failedChildren).toBe(2);
expect(metadata.failedWorkflowIds).toHaveLength(2);
expect(metadata.errors).toHaveLength(2);
```

### Workflow ID Validation

```typescript
// Each error in metadata has workflowId
metadata.failedWorkflowIds.forEach((id) => {
  expect(id).toBeDefined();
  expect(typeof id).toBe('string');
});
```

## 5. Event Emission Validation Patterns

### Event Observer Setup (lines 57-66)

```typescript
function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });
  return events;
}
```

### Event Count Validation

```typescript
// Filter error events
const errorEvents = events.filter((e) => e.type === 'error');

// Default behavior: Only individual events
expect(errorEvents.length).toBe(1); // Only failed child's error

// Merge enabled: Individual + merged events
expect(errorEvents.length).toBeGreaterThanOrEqual(3); // 2 individual + 1 merged
```

### Merged Event Identification (lines 247-254)

```typescript
// Find the merged error event
const mergedErrorEvent = errorEvents.find((e) => {
  if (e.type === 'error') {
    return e.error.message.includes('2 of 5 concurrent');
  }
  return false;
});
expect(mergedErrorEvent).toBeDefined();
```

### Event Structure Validation

```typescript
if (mergedErrorEvent && mergedErrorEvent.type === 'error') {
  expect(mergedErrorEvent.error.message).toContain('2 of 3');
  expect(mergedErrorEvent.error.workflowId).toBeDefined();
  expect(Array.isArray(mergedErrorEvent.error.logs)).toBe(true);
}
```

## 6. Mock Patterns for Providers/Workflows

### Mock WorkflowError Creation (lines 72-90)

```typescript
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { key: 'value' },
    logs: [
      {
        id: 'log-1',
        workflowId: 'wf-test-123',
        timestamp: Date.now(),
        level: 'error',
        message: 'Test log message',
      },
    ],
    ...overrides,
  };
}
```

### Logging Workflow Pattern (lines 294-312)

```typescript
class LoggingWorkflow extends Workflow {
  constructor(name: string, parent: Workflow, private shouldFail: boolean) {
    super(name, parent);
  }

  @Step()
  async executeStep() {
    this.logger.info(`${this.node.name} starting`);
    if (this.shouldFail) {
      this.logger.error(`${this.node.name} failing`);
      throw new Error(`${this.node.name} failed`);
    }
    this.logger.info(`${this.node.name} completed`);
  }
}
```

## 7. Test Naming Conventions

### Describe Block Naming
- Feature-focused: `'@Task decorator ErrorMergeStrategy'`
- Behavior-focused: `'Default behavior (errorMergeStrategy disabled)'`
- Configuration-focused: `'Enabled with default error merge'`
- Scenario-focused: `'Edge cases and error scenarios'`

### Test Naming Patterns
- Should/Behavior pattern: `'should throw first error when errorMergeStrategy not provided'`
- Action-Result pattern: `'should merge all errors when errorMergeStrategy.enabled=true'`
- Validation pattern: `'should create aggregated error message with counts and task name'`
- Edge case pattern: `'should handle single failure with merge enabled'`

## 8. Error Collection and Merging Behavior Verification

### Completion Verification

```typescript
// All children must complete regardless of errors
expect(parent.children.length).toBe(3);

// Track completion for orphan prevention
const completedWorkflows = new Set<string>();
children.forEach((child) => {
  child.run().then(
    () => completedWorkflows.add(child.id),
    () => completedWorkflows.add(child.id)
  );
});
expect(completedWorkflows.size).toBe(4);
```

### Log Aggregation Testing (lines 292-346)

```typescript
// Test case with logging workflows
expect(thrownError.logs).toBeDefined();
const logMessages = thrownError.logs.map((l) => l.message);
expect(logMessages.some((m) => m.includes('Workflow-1'))).toBe(true);
expect(logMessages.some((m) => m.includes('Workflow-2'))).toBe(true);
```

### Error Count Validation for Different Scenarios

```typescript
// Single failure
expect(thrownError.message).toBe("1 of 1 concurrent child workflows failed");

// All failures
expect(thrownError.message).toBe("4 of 4 concurrent child workflows failed");

// Mixed scenarios
expect(thrownError.message).toBe("2 of 5 concurrent child workflows failed");
```

## Gotchas and Special Testing Considerations

1. **concurrent: true is Required**: Error merging only works with `@Task({ concurrent: true })`

2. **Error Event Timing**: Individual error events are emitted immediately, merged event comes after all children complete

3. **Metadata Structure**: The `original` field contains a `WorkflowAggregateError` with specific structure

4. **Log Aggregation**: Empty logs array if children don't log - test specifically for log aggregation

5. **Completion Guarantee**: All workflows complete even when errors occur - test for orphan prevention

6. **Custom Combine Function**: Must return a valid `WorkflowError` object with required fields

7. **Event Count**: Merge enabled tests expect ≥3 error events (individual + merged)

8. **Workflow ID Tracking**: Each error in metadata tracks failed workflow IDs

## Patterns to Replicate for Workflow-Level Tests

1. **Helper Functions**: Create similar helpers for workflow creation and error setup
2. **Event Observer**: Use same pattern for collecting workflow events
3. **ARRANGE-ACT-ASSERT**: Maintain consistent test structure
4. **Error Capture**: Catch and return errors from parent workflow run()
5. **Metadata Validation**: Verify error structure and contents
6. **Event Validation**: Check both individual and merged events
7. **Completion Verification**: Ensure all workflows complete properly
8. **Edge Case Coverage**: Test single failure, all failure, mixed scenarios

## Key Differences for Workflow-Level Tests

While @Task tests focus on **concurrent** child workflows, workflow-level tests will focus on **sequential** step execution:

- **@Task**: Concurrent child workflows with `Promise.allSettled`
- **Workflow**: Sequential steps with `await` in `run()` method
- **@Task Message**: "X of Y concurrent child workflows failed"
- **Workflow Message**: "X of Y steps failed" (adapted)
- **@Task Context**: Task decorator with `concurrent: true`
- **Workflow Context**: WorkflowConfig with `errorMergeStrategy.enabled: true`
