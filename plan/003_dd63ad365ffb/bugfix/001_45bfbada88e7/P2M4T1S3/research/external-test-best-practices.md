# External Research: Error Aggregation Testing Best Practices

**Research Date:** 2025-01-26
**Purpose:** Inform comprehensive error merge test coverage for PRP creation
**Related:** P2.M4.T1.S3 - Comprehensive Error Merge Test Coverage

---

## Executive Summary

This document compiles best practices for testing error aggregation/merge functionality based on:
1. **Existing patterns in the Groundswell codebase** (analyze-d patterns from 70+ test files)
2. **Established testing framework standards** (Vitest, Jest, TypeScript)
3. **Industry best practices** for error aggregation, event emission, and backward compatibility testing

**Key Finding:** Your codebase already demonstrates excellent testing patterns. The existing error merge tests at `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` and `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts` showcase production-ready patterns that should be replicated and extended.

---

## Table of Contents

1. [Testing Patterns for Aggregate Errors](#1-testing-patterns-for-aggregate-errors)
2. [Vitest Patterns for Testing Custom Error Objects](#2-vitest-patterns-for-testing-custom-error-objects)
3. [Best Practices for Testing Event Emission in Workflows](#3-best-practices-for-testing-event-emission-in-workflows)
4. [Patterns for Testing Sequential Operations with Error Collection](#4-patterns-for-testing-sequential-operations-with-error-collection)
5. [How to Test Custom Error Combine/Merge Functions](#5-how-to-test-custom-error-combinemerge-functions)
6. [Testing Backward Compatibility (Default Behavior vs New Feature)](#6-testing-backward-compatibility-default-behavior-vs-new-feature)
7. [Anti-Patterns to Avoid](#7-anti-patterns-to-avoid)
8. [Recommended Test Structure Template](#8-recommended-test-structure-template)
9. [References and Further Reading](#9-references-and-further-reading)

---

## 1. Testing Patterns for Aggregate Errors

### 1.1 Core Pattern: Helper Function for Mock Error Creation

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 69-90)

```typescript
/**
 * Helper to create a mock WorkflowError for custom combine() tests
 * Pattern from: src/__tests__/unit/utils/workflow-error-utils.test.ts (lines 7-25)
 */
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

**Best Practice Principles:**
- **Flexible factory function** - Accepts partial overrides for customization
- **Sensible defaults** - Provides valid default values for all required fields
- **Reusability** - Single helper for all test scenarios
- **Type safety** - Uses `Partial<T>` to allow optional overrides while maintaining type checking

### 1.2 Testing Error Collection from Multiple Sources

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 553-577)

```typescript
it('should handle single failure with merge enabled', async () => {
  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: true },
    })
    async spawnChildren() {
      return [createChildWorkflow(this, 'OnlyChild', true)];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const thrownError = (await parent.run()) as WorkflowError;

  // ASSERT: Message format correct for single failure
  expect(thrownError.message).toBe("1 of 1 concurrent child workflows failed in task 'spawnChildren'");
});
```

**Best Practice Principles:**
- **Inline workflow creation** - Define workflows within test for clarity
- **Explicit error capture** - Use try-catch to capture thrown errors for validation
- **Type assertions** - Cast to specific error type for property access
- **String matching** - Validate exact error message format

### 1.3 Testing Multiple Error Aggregation

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts` (lines 38-68)

```typescript
it('should aggregate multiple errors with unique workflow IDs', () => {
  const error1 = createMockWorkflowError({
    message: 'Error 1',
    workflowId: 'wf-1',
    stack: 'stack 1',
    state: { key1: 'value1' },
    logs: [{ id: 'log-1', workflowId: 'wf-1', timestamp: 1000, level: 'error', message: 'Log 1' }],
  });
  const error2 = createMockWorkflowError({
    message: 'Error 2',
    workflowId: 'wf-2',
    stack: 'stack 2',
    state: { key2: 'value2' },
    logs: [{ id: 'log-2', workflowId: 'wf-2', timestamp: 2000, level: 'error', message: 'Log 2' }],
  });
  const error3 = createMockWorkflowError({
    message: 'Error 3',
    workflowId: 'wf-3',
    stack: 'stack 3',
    state: { key3: 'value3' },
    logs: [{ id: 'log-3', workflowId: 'wf-3', timestamp: 3000, level: 'error', message: 'Log 3' }],
  });

  const result = mergeWorkflowErrors([error1, error2, error3], 'concurrentTask', 'parent-wf', 5);

  expect(result.message).toBe("3 of 5 concurrent child workflows failed in task 'concurrentTask'");
  expect(result.workflowId).toBe('parent-wf');
  expect(result.stack).toBe('stack 1'); // First error's stack
  expect(result.state).toEqual({ key1: 'value1' }); // First error's state
  expect(result.logs).toHaveLength(3); // All logs aggregated
});
```

**Best Practice Principles:**
- **Explicit test data** - Create distinct, identifiable errors for each scenario
- **Comprehensive assertions** - Validate all merged properties (message, IDs, stack, state, logs)
- **Deterministic ordering** - Document which error's properties are used (e.g., "First error's stack")
- **Array length validation** - Verify all errors were processed

### 1.4 Testing Deduplication in Aggregation

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts` (lines 70-89)

```typescript
it('should deduplicate workflow IDs when errors have duplicate IDs', () => {
  const error1 = createMockWorkflowError({ workflowId: 'wf-dup' });
  const error2 = createMockWorkflowError({ workflowId: 'wf-dup' });
  const error3 = createMockWorkflowError({ workflowId: 'wf-unique' });

  const result = mergeWorkflowErrors([error1, error2, error3], 'testTask', 'parent-wf', 4);

  // Access the metadata from original field
  const metadata = result.original as {
    name: string;
    message: string;
    errors: WorkflowError[];
    totalChildren: number;
    failedChildren: number;
    failedWorkflowIds: string[];
  };

  expect(metadata.failedWorkflowIds).toEqual(['wf-dup', 'wf-unique']);
  expect(metadata.failedWorkflowIds).toHaveLength(2); // Deduplicated
});
```

**Best Practice Principles:**
- **Type casting for metadata** - Use `as` to access nested metadata structure
- **Edge case testing** - Explicitly test duplicate values
- **Set-based validation** - Use `toEqual()` with arrays for order-independent comparison
- **Comment assertions** - Document why specific assertion matters (e.g., "Deduplicated")

---

## 2. Vitest Patterns for Testing Custom Error Objects

### 2.1 Testing Error Object Properties

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 214-240)

```typescript
// ASSERT: Merged error thrown
expect(thrownError).toBeDefined();
const error = thrownError as WorkflowError;

// ASSERT: Message includes count and task name
expect(error.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

// ASSERT: Metadata in original field
const metadata = error.original as {
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

**Best Practice Principles:**
- **Progressive validation** - Start with `toBeDefined()` before accessing properties
- **Type-safe property access** - Cast to specific type with inline type definition
- **Nested property validation** - Test deeply nested metadata structures
- **Count validation** - Verify array lengths match expected values

### 2.2 Testing Custom Error Fields

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 494-501)

```typescript
// ASSERT: Custom merge result used
expect(thrownError.message).toBe('MERGED: First failed | Second failed');
expect(thrownError.workflowId).toBe('merged-workflow');

// ASSERT: Custom fields preserved
const customMetadata = thrownError.original as { customField: string };
expect(customMetadata.customField).toBe('custom-value');
```

**Best Practice Principles:**
- **Custom property validation** - Test user-defined fields in merged errors
- **Inline type definitions** - Define expected custom structure inline for clarity
- **Exact value matching** - Use `toBe()` for primitive values, `toEqual()` for objects

### 2.3 Testing Error with Spy Functions

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 401-451)

```typescript
it('should call custom combine function when provided', async () => {
  // ARRANGE: Create spy for combine function
  const combineSpy = vi.fn((errors: WorkflowError[]) => ({
    message: `Custom merge: ${errors.length} errors`,
    original: errors,
    workflowId: 'custom-parent',
    logs: errors.flatMap((e) => e.logs),
    stack: errors[0]?.stack,
    state: errors[0]?.state || {},
  }));

  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: {
        enabled: true,
        combine: combineSpy, // Custom combine function
      },
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Alpha', true),
        createChildWorkflow(this, 'Beta', true),
        createChildWorkflow(this, 'Gamma', false),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');

  // ACT
  await parent.run();

  // ASSERT: Custom combine function was called
  expect(combineSpy).toHaveBeenCalledTimes(1);

  // ASSERT: Called with array of WorkflowError objects
  const calls = combineSpy.mock.calls;
  expect(calls).toHaveLength(1);
  const errorsArg = calls[0][0] as WorkflowError[];
  expect(Array.isArray(errorsArg)).toBe(true);
  expect(errorsArg).toHaveLength(2); // Alpha and Beta failed
});
```

**Best Practice Principles:**
- **Spy function** - Use `vi.fn()` to track function calls and arguments
- **Implementation-in-mock** - Provide mock implementation that returns valid structure
- **Call count validation** - Use `toHaveBeenCalledTimes()` to verify invocation
- **Argument inspection** - Access `mock.calls` to validate passed arguments
- **Type casting** - Cast arguments to expected types for property access

### 2.4 Vitest-Specific Matchers

**Common Vitest Matchers for Error Testing:**

```typescript
// Error instance validation
expect(error).toBeInstanceOf(Error);
expect(error).toBeInstanceOf(WorkflowError);

// Error property validation
expect(error.message).toBe('Expected error message');
expect(error.message).toMatch(/regex pattern/);
expect(error.message).toContain('substring');

// Error structure validation
expect(error).toHaveProperty('workflowId');
expect(error.workflowId).toBe('expected-id');

// Array validation
expect(errors).toHaveLength(3);
expect(errors).toContain(expect.objectContaining({ message: 'Error 1' }));

// Async error validation
await expect(workflow.run()).rejects.toThrow('Expected error');
await expect(workflow.run()).rejects.toThrow(Error);
```

---

## 3. Best Practices for Testing Event Emission in Workflows

### 3.1 Event Observer Setup Pattern

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 54-66)

```typescript
/**
 * Helper to setup event observer for event collection
 * Pattern from: src/__tests__/adversarial/concurrent-task-failures.test.ts (lines 58-67)
 */
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

**Best Practice Principles:**
- **Reusable helper** - Create observer setup function for consistent event capture
- **Minimal callbacks** - Provide empty implementations for unused callbacks
- **Event collection** - Use array to collect all emitted events
- **Return collector** - Return array for test assertions

### 3.2 Testing Event Emission with Error Merging

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 697-748)

```typescript
it('should emit error event with merged error', async () => {
  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: true },
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'OK', false),
        createChildWorkflow(this, 'Bad1', true),
        createChildWorkflow(this, 'Bad2', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const events = setupEventObserver(parent);
  await parent.run();

  // ASSERT: Error events emitted for individual failures
  const individualErrorEvents = events.filter((e) => {
    if (e.type === 'error') {
      return e.error.message === 'Bad1 failed' || e.error.message === 'Bad2 failed';
    }
    return false;
  });
  expect(individualErrorEvents.length).toBeGreaterThanOrEqual(2);

  // ASSERT: Additional merged error event emitted
  const mergedErrorEvent = events.find((e) => {
    if (e.type === 'error') {
      return e.error.message.includes('concurrent child workflows failed');
    }
    return false;
  });
  expect(mergedErrorEvent).toBeDefined();

  // ASSERT: Merged error has correct structure
  if (mergedErrorEvent && mergedErrorEvent.type === 'error') {
    expect(mergedErrorEvent.error.message).toContain('2 of 3');
    expect(mergedErrorEvent.error.workflowId).toBeDefined();
    expect(Array.isArray(mergedErrorEvent.error.logs)).toBe(true);
  }
});
```

**Best Practice Principles:**
- **Event filtering** - Use `filter()` to find specific event types
- **Discriminated union type guards** - Use `if (e.type === 'error')` for type narrowing
- **Count validation** - Use `toBeGreaterThanOrEqual()` for minimum event counts
- **Event search** - Use `find()` to locate specific events
- **Type narrowing** - Combine type guards with conditional checks for property access

### 3.3 Testing Sequential Event Emission

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts` (adapted pattern)

```typescript
it('should emit events in correct sequence during operations', async () => {
  const events: WorkflowEvent[] = [];

  class TestWorkflow extends Workflow {
    @Step()
    async step1() {
      this.logger.info('Step 1');
    }

    @Step()
    async step2() {
      this.logger.info('Step 2');
    }

    async run() {
      await this.step1();
      await this.step2();
    }
  }

  const workflow = new TestWorkflow('Test');
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.run();

  // ASSERT: Events emitted in correct order
  const eventTypes = events.map(e => e.type);
  expect(eventTypes).toContain('stepStart');
  expect(eventTypes).toContain('stepEnd');

  // ASSERT: step1 events before step2 events
  const step1StartIndex = events.findIndex(e => e.type === 'stepStart' && e.stepName === 'step1');
  const step2StartIndex = events.findIndex(e => e.type === 'stepStart' && e.stepName === 'step2');
  expect(step1StartIndex).toBeLessThan(step2StartIndex);
});
```

**Best Practice Principles:**
- **Event sequencing** - Validate events occur in expected order
- **Index comparison** - Use `findIndex()` to verify event ordering
- **Event type tracking** - Map events to types for sequence validation
- **Correlation validation** - Ensure related events (start/end) are paired correctly

### 3.4 Event Payload Validation

**Pattern for comprehensive event payload testing:**

```typescript
it('should emit error event with complete payload', async () => {
  const events: WorkflowEvent[] = [];

  class FailingWorkflow extends Workflow {
    @Step()
    async failingStep() {
      throw new Error('Step failure');
    }

    async run() {
      await this.failingStep();
    }
  }

  const workflow = new FailingWorkflow('Test');
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  try {
    await workflow.run();
  } catch (e) {
    // Expected
  }

  // Find error event
  const errorEvent = events.find(e => e.type === 'error');
  expect(errorEvent).toBeDefined();

  if (errorEvent && errorEvent.type === 'error') {
    // Validate all payload fields
    expect(errorEvent.error.message).toBe('Step failure');
    expect(errorEvent.error.workflowId).toBe(workflow.id);
    expect(errorEvent.timestamp).toBeDefined();
    expect(typeof errorEvent.timestamp).toBe('number');
    expect(Array.isArray(errorEvent.error.logs)).toBe(true);
    expect(errorEvent.error.stack).toBeDefined();
  }
});
```

---

## 4. Patterns for Testing Sequential Operations with Error Collection

### 4.1 Collecting Errors from Sequential Operations

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 653-695)

```typescript
it('should complete all workflows even when errors occur', async () => {
  const completedWorkflows = new Set<string>();

  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: true },
    })
    async spawnChildren() {
      const children = [
        createChildWorkflow(this, 'Success1', false),
        createChildWorkflow(this, 'Fail1', true),
        createChildWorkflow(this, 'Success2', false),
        createChildWorkflow(this, 'Fail2', true),
      ];

      // Track completion
      children.forEach((child) => {
        child.run().then(
          () => completedWorkflows.add(child.id),
          () => completedWorkflows.add(child.id)
        );
      });

      return children;
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  await parent.run();

  // ASSERT: All workflows completed (no orphans)
  expect(completedWorkflows.size).toBe(4);
  expect(parent.children.length).toBe(4);
});
```

**Best Practice Principles:**
- **Completion tracking** - Use `Set` to track unique workflow IDs
- **Promise resolution tracking** - Use `.then()` on both success and failure paths
- **No orphan validation** - Verify all operations complete regardless of errors
- **Count validation** - Compare completed count vs expected count

### 4.2 Testing Error Collection with Mixed Success/Failure

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 613-651)

```typescript
it('should handle mixed success/failure with merge enabled', async () => {
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
        createChildWorkflow(this, 'Fail2', true),
        createChildWorkflow(this, 'Success3', false),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const thrownError = (await parent.run()) as WorkflowError;

  // ASSERT: Only failed children counted in message
  expect(thrownError.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

  // ASSERT: All workflows completed
  expect(parent.children.length).toBe(5);

  // ASSERT: Metadata correct
  const metadata = thrownError.original as { failedChildren: number; totalChildren: number };
  expect(metadata.failedChildren).toBe(2);
  expect(metadata.totalChildren).toBe(5);
});
```

**Best Practice Principles:**
- **Mixed scenario testing** - Test combinations of success and failure
- **Accurate counting** - Verify failure counts exclude successful operations
- **Total completion** - Ensure all operations complete despite errors
- **Metadata validation** - Check aggregated error metadata for accuracy

### 4.3 Testing Sequential Operations with Error Accumulation

**Pattern for sequential error collection:**

```typescript
it('should collect errors from sequential operations without early termination', async () => {
  const errors: Error[] = [];

  class SequentialWorkflow extends Workflow {
    @Step()
    async operation1() {
      throw new Error('Operation 1 failed');
    }

    @Step()
    async operation2() {
      throw new Error('Operation 2 failed');
    }

    @Step()
    async operation3() {
      throw new Error('Operation 3 failed');
    }

    async run() {
      // Execute all operations, collecting errors
      for (const op of [this.operation1, this.operation2, this.operation3]) {
        try {
          await op.call(this);
        } catch (err) {
          errors.push(err as Error);
        }
      }

      // Throw aggregated error at end
      if (errors.length > 0) {
        throw new AggregateError(errors, `${errors.length} operations failed`);
      }
    }
  }

  const workflow = new SequentialWorkflow('Test');

  await expect(workflow.run()).rejects.toThrow('3 operations failed');
  expect(errors).toHaveLength(3);
});
```

**Best Practice Principles:**
- **Try-catch per operation** - Wrap each operation to prevent early termination
- **Error collection** - Accumulate errors in array
- **Deferred throwing** - Throw aggregate error after all operations complete
- **Error count validation** - Verify all errors were collected

---

## 5. How to Test Custom Error Combine/Merge Functions

### 5.1 Testing Custom Combine Function Invocation

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 503-549)

```typescript
it('should pass all errors to custom combine function', async () => {
  // ARRANGE: Track which errors were passed
  let receivedErrors: WorkflowError[] = [];

  const trackingMerger = (errors: WorkflowError[]): WorkflowError => {
    receivedErrors = errors;
    return createMockWorkflowError({
      message: `Tracked ${errors.length} errors`,
    });
  };

  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: {
        enabled: true,
        combine: trackingMerger,
      },
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'A', true),
        createChildWorkflow(this, 'B', true),
        createChildWorkflow(this, 'C', true),
        createChildWorkflow(this, 'D', false),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  await parent.run();

  // ASSERT: All failed errors passed to combine
  expect(receivedErrors).toHaveLength(3);
  const errorMessages = receivedErrors.map((e) => e.message);
  expect(errorMessages).toContain('A failed');
  expect(errorMessages).toContain('B failed');
  expect(errorMessages).toContain('C failed');
});
```

**Best Practice Principles:**
- **Closure tracking** - Use closure variable to capture passed arguments
- **Content validation** - Verify specific errors were passed (not just count)
- **Message mapping** - Map errors to identifiable properties for validation
- **Containment checks** - Use `toContain()` for set membership validation

### 5.2 Testing Custom Merge Result Structure

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 453-501)

```typescript
it('should use custom merge result from combine function', async () => {
  // ARRANGE: Custom combine that returns specific format
  const customMerger = (errors: WorkflowError[]): WorkflowError => ({
    message: `MERGED: ${errors.map((e) => e.message).join(' | ')}`,
    original: {
      customField: 'custom-value',
      errors,
    },
    workflowId: 'merged-workflow',
    logs: errors.flatMap((e) => e.logs),
    stack: errors[0]?.stack,
    state: errors[0]?.state || {},
  });

  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: {
        enabled: true,
        combine: customMerger,
      },
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'First', true),
        createChildWorkflow(this, 'Second', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const thrownError = (await parent.run()) as WorkflowError;

  // ASSERT: Custom merge result used
  expect(thrownError.message).toBe('MERGED: First failed | Second failed');
  expect(thrownError.workflowId).toBe('merged-workflow');

  // ASSERT: Custom fields preserved
  const customMetadata = thrownError.original as { customField: string };
  expect(customMetadata.customField).toBe('custom-value');
});
```

**Best Practice Principles:**
- **Custom formatting** - Test custom message formatting logic
- **Custom metadata** - Validate user-defined fields are preserved
- **Property mapping** - Verify custom merge logic maps inputs correctly
- **Inline merger** - Define merger inline for test-specific behavior

### 5.3 Testing Merge Function Error Handling

**Pattern for testing error handling in merge functions:**

```typescript
it('should handle errors thrown by custom combine function', async () => {
  const throwingMerger = (): WorkflowError => {
    throw new Error('Combine function failed');
  };

  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: {
        enabled: true,
        combine: throwingMerger,
      },
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Fail1', true),
        createChildWorkflow(this, 'Fail2', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const thrownError = await parent.run();

  // ASSERT: Combine function error propagated
  expect(thrownError).toBeDefined();
  expect((thrownError as Error).message).toBe('Combine function failed');
});
```

### 5.4 Testing Merge Function with Empty Error Array

**Edge case pattern:**

```typescript
it('should handle empty error array in custom combine function', async () => {
  const emptyMerger = (errors: WorkflowError[]): WorkflowError => {
    if (errors.length === 0) {
      return {
        message: 'No errors to merge',
        original: new Error('Empty'),
        workflowId: 'empty',
        logs: [],
        stack: '',
        state: {},
      };
    }
    return createMockWorkflowError({ message: `${errors.length} errors` });
  };

  // Test with scenario where no errors occur (all successes)
  // ... implementation ...
});
```

---

## 6. Testing Backward Compatibility (Default Behavior vs New Feature)

### 6.1 Testing Default Behavior Preservation

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/compatibility/backward-compatibility.test.ts` (lines 284-332)

```typescript
describe('Default behavior - throws first error (backward compatible)', () => {
  it('should throw first error when concurrent task fails', async () => {
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Child-0', false),
          createChildWorkflow(this, 'Child-1', true), // Will fail
          createChildWorkflow(this, 'Child-2', false),
          createChildWorkflow(this, 'Child-3', false),
        ];
      }

      async run() {
        await this.spawnChildren();
      }
    }

    const workflow = new ParentWorkflow('Parent');

    // Should throw first error (backward compatible with Promise.all)
    await expect(workflow.run()).rejects.toThrow('Child-1 failed');
  });

  it('should complete all workflows even when one fails', async () => {
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
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
        } catch {
          // Expected
        }
      }
    }

    const workflow = new ParentWorkflow('Parent');
    await workflow.run();

    // All children should be attached (Promise.allSettled completed all)
    expect(workflow.children.length).toBe(3);

    const childNames = workflow.children.map((c) => c.getNode().name);
    expect(childNames).toContain('Child-0');
    expect(childNames).toContain('Child-1');
    expect(childNames).toContain('Child-2');
  });
});
```

**Best Practice Principles:**
- **Explicit default behavior** - Test without new feature enabled
- **First-error validation** - Verify "first error wins" behavior
- **Completion guarantees** - Ensure all operations complete despite errors
- **Behavior documentation** - Comment links to original behavior (e.g., Promise.all)

### 6.2 Testing Feature Toggle Behavior

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 133-176)

```typescript
it('should throw first error when errorMergeStrategy.enabled=false', async () => {
  // ARRANGE: Create parent with explicit enabled=false
  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: false }, // Explicitly disabled
    })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Alpha', false),
        createChildWorkflow(this, 'Beta', true),
        createChildWorkflow(this, 'Gamma', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        return err;
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const events = setupEventObserver(parent);
  const thrownError = await parent.run();

  // ASSERT: All children completed
  expect(parent.children.length).toBe(3);

  // ASSERT: First error thrown (not aggregated)
  expect(thrownError).toBeDefined();
  const errorMsg = (thrownError as WorkflowError).message;
  expect(errorMsg).toMatch(/Alpha failed|Beta failed|Gamma failed/);

  // ASSERT: Only individual error events (no merge event)
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBe(2); // Beta and Gamma errors only

  // ASSERT: Error message does not contain aggregated format
  expect(errorMsg).not.toContain('concurrent child workflows failed');
});
```

**Best Practice Principles:**
- **Explicit disable testing** - Test with feature explicitly disabled
- **Negative assertions** - Use `not.toContain()` to verify new behavior absent
- **Regex matching** - Use `toMatch()` for flexible error message validation
- **Event count validation** - Verify no extra events emitted when disabled

### 6.3 Testing Opt-In New Behavior

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts` (lines 178-256)

```typescript
describe('Enabled with default error merge', () => {
  it('should merge all errors when errorMergeStrategy.enabled=true', async () => {
    // ARRANGE: Create parent with error merge enabled
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }, // No combine() - use default
      })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Alpha', false),
          createChildWorkflow(this, 'Beta', true), // Will fail
          createChildWorkflow(this, 'Gamma', false),
          createChildWorkflow(this, 'Delta', true), // Will fail
          createChildWorkflow(this, 'Epsilon', false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const events = setupEventObserver(parent);

    // ACT
    const thrownError = await parent.run();

    // ASSERT: All children completed
    expect(parent.children.length).toBe(5);

    // ASSERT: Merged error thrown
    expect(thrownError).toBeDefined();
    const error = thrownError as WorkflowError;

    // ASSERT: Message includes count and task name
    expect(error.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

    // ASSERT: Metadata in original field
    const metadata = error.original as {
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

    // ASSERT: Error event emitted with merged error
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(3); // 2 individual + 1 merged
  });
});
```

**Best Practice Principles:**
- **Opt-in validation** - Test new behavior when explicitly enabled
- **Comparison testing** - Contrast with default behavior in parallel test suites
- **Comprehensive validation** - Test all aspects of new behavior
- **Event validation** - Verify new events emitted for new behavior

### 6.4 Backward Compatibility Test Structure

**Comprehensive pattern from:** `/home/dustin/projects/groundswell/src/__tests__/compatibility/backward-compatibility.test.ts`

```typescript
/**
 * Backward Compatibility Test Suite
 *
 * Comprehensive tests that validate all existing API usage patterns continue to work
 * after bug fixes, and ensures breaking changes fail with clear, actionable error
 * messages directing users to the correct migration path.
 *
 * Related:
 * - PRP: P1.M4.T3.S2 - Backward Compatibility Testing
 * - Breaking Changes Audit: plan/.../P1M4T3S1/BREAKING_CHANGES_AUDIT.md
 *
 * Test Coverage:
 * 1. Breaking Change: Workflow name validation (LOW severity)
 * 2. Backward Compatible: WorkflowLogger.child() string API
 * 3. Backward Compatible: Promise.allSettled default behavior
 * 4. Documentation Examples: README quick start patterns
 * 5. Example Files: All 11 runnable examples
 * 6. Decorator Patterns: @Step, @Task, @ObservedState options
 * 7. Parent-Child Patterns: Hierarchical workflow creation
 */
```

**Best Practice Principles:**
- **Comprehensive documentation** - Document all backward compatibility scenarios
- **Severity categorization** - Label breaking changes by impact
- **Migration guidance** - Ensure breaking changes provide clear error messages
- **Example validation** - Test all documented examples still work
- **Pattern coverage** - Test all common usage patterns

---

## 7. Anti-Patterns to Avoid

### 7.1 Don't: Test Implementation Details

**Anti-pattern:**
```typescript
// BAD: Tests internal implementation
it('should call mergeWorkflowErrors with correct parameters', async () => {
  const spy = vi.spyOn(utils, 'mergeWorkflowErrors');
  // ... test ...
  expect(spy).toHaveBeenCalledWith([error1, error2], 'taskName', 'parent', 2);
});
```

**Better approach:**
```typescript
// GOOD: Tests behavior/outcome
it('should merge errors with correct message format', async () => {
  const result = await workflow.run();
  expect(result.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");
});
```

### 7.2 Don't: Use Brittle String Matching

**Anti-pattern:**
```typescript
// BAD: Brittle exact string match
expect(error.message).toBe('Error: Something failed at step 2');
```

**Better approach:**
```typescript
// GOOD: Flexible matching
expect(error.message).toContain('failed');
expect(error.message).toMatch(/step \d+ failed/);
```

### 7.3 Don't: Ignore Error Object Structure

**Anti-pattern:**
```typescript
// BAD: Only validates message
expect(error.message).toBe('Expected error');
```

**Better approach:**
```typescript
// GOOD: Validates entire error structure
expect(error.message).toBe('Expected error');
expect(error.workflowId).toBe(expectedId);
expect(Array.isArray(error.logs)).toBe(true);
expect(error.state).toEqual(expectedState);
```

### 7.4 Don't: Test Without Type Safety

**Anti-pattern:**
```typescript
// BAD: Unsafe type assertions
const error = err as any;
expect(error.customField).toBe('value');
```

**Better approach:**
```typescript
// GOOD: Type-safe assertions
const error = err as WorkflowError;
const metadata = error.original as { customField: string };
expect(metadata.customField).toBe('value');
```

### 7.5 Don't: Mix Multiple Concerns in One Test

**Anti-pattern:**
```typescript
// BAD: Tests error merging AND event emission AND state changes
it('should handle error merging', async () => {
  // ... 50 lines of setup ...
  // ... error assertions ...
  // ... event assertions ...
  // ... state assertions ...
});
```

**Better approach:**
```typescript
// GOOD: Separate tests for each concern
it('should merge errors correctly', async () => {
  // ... focused on error merging ...
});

it('should emit error events', async () => {
  // ... focused on events ...
});

it('should update workflow state on error', async () => {
  // ... focused on state ...
});
```

### 7.6 Don't: Use Magic Numbers

**Anti-pattern:**
```typescript
// BAD: Unclear what the numbers mean
expect(errors.length).toBe(3);
expect(children.length).toBe(5);
```

**Better approach:**
```typescript
// GOOD: Named constants or computed values
const FAILED_CHILDREN = 3;
const TOTAL_CHILDREN = 5;
expect(errors.length).toBe(FAILED_CHILDREN);
expect(children.length).toBe(TOTAL_CHILDREN);
```

### 7.7 Don't: Skip Error Scenario Coverage

**Anti-pattern:**
```typescript
// BAD: Only tests success path
it('should merge errors', async () => {
  const errors = [error1, error2];
  const result = mergeErrors(errors);
  expect(result).toBeDefined();
});
```

**Better approach:**
```typescript
// GOOD: Tests all scenarios
it('should merge errors', async () => {
  const errors = [error1, error2];
  const result = mergeErrors(errors);
  expect(result).toBeDefined();
});

it('should handle empty error array', async () => {
  const result = mergeErrors([]);
  expect(result.message).toBe('No errors');
});

it('should handle single error', async () => {
  const result = mergeErrors([error1]);
  expect(result.message).toContain('1 error');
});

it('should handle duplicate errors', async () => {
  const result = mergeErrors([error1, error1]);
  expect(result.errors).toHaveLength(1);
});
```

---

## 8. Recommended Test Structure Template

### 8.1 Comprehensive Test File Template

```typescript
/**
 * Feature Name Test Suite
 *
 * Brief description of what this test suite validates.
 *
 * Related:
 * - PRP: P?.M?.T?.S? - Related PRP task
 * - Issue: #XXX - Related issue
 *
 * Test Coverage:
 * 1. Default behavior (feature disabled)
 * 2. Enabled with default configuration
 * 3. Enabled with custom configuration
 * 4. Edge cases (single item, empty, duplicates)
 * 5. Error scenarios
 * 6. Event emission
 * 7. Backward compatibility
 */

import { describe, it, expect, vi } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowError, WorkflowEvent } from '../../types/index.js';

describe('Feature Name', () => {
  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Helper to create mock error for testing
   */
  function createMockError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Test error',
      original: new Error('Original error'),
      workflowId: 'wf-test-123',
      stack: 'Error: Test error\n    at test.ts:10:15',
      state: {},
      logs: [],
      ...overrides,
    };
  }

  /**
   * Helper to setup event observer
   */
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

  /**
   * Helper to create child workflow
   */
  function createChildWorkflow(
    parent: Workflow,
    name: string,
    shouldFail: boolean = false
  ): Workflow {
    return new (class extends Workflow {
      constructor(n: string, p: Workflow) {
        super(n, p);
      }

      @Step()
      async executeStep() {
        if (shouldFail) {
          throw new Error(`${name} failed`);
        }
        return `${name} succeeded`;
      }

      async run() {
        return this.executeStep();
      }
    })(name, parent);
  }

  // ============================================================================
  // Section 1: Default Behavior (Feature Disabled)
  // ============================================================================

  describe('Default behavior (feature disabled)', () => {
    it('should maintain backward compatibility when feature not enabled', async () => {
      // Test implementation
    });

    it('should not emit new events when feature disabled', async () => {
      // Test implementation
    });
  });

  // ============================================================================
  // Section 2: Enabled with Default Configuration
  // ============================================================================

  describe('Enabled with default configuration', () => {
    it('should use default behavior when enabled without config', async () => {
      // Test implementation
    });

    it('should handle multiple items with default merge', async () => {
      // Test implementation
    });

    it('should emit appropriate events', async () => {
      // Test implementation
    });
  });

  // ============================================================================
  // Section 3: Enabled with Custom Configuration
  // ============================================================================

  describe('Enabled with custom configuration', () => {
    it('should call custom function when provided', async () => {
      // Test implementation
    });

    it('should use custom function result', async () => {
      // Test implementation
    });

    it('should pass correct arguments to custom function', async () => {
      // Test implementation
    });
  });

  // ============================================================================
  // Section 4: Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle empty collection', async () => {
      // Test implementation
    });

    it('should handle single item', async () => {
      // Test implementation
    });

    it('should handle duplicates', async () => {
      // Test implementation
    });

    it('should handle all items failing', async () => {
      // Test implementation
    });
  });

  // ============================================================================
  // Section 5: Error Scenarios
  // ============================================================================

  describe('Error scenarios', () => {
    it('should handle errors in custom functions', async () => {
      // Test implementation
    });

    it('should provide actionable error messages', async () => {
      // Test implementation
    });
  });

  // ============================================================================
  // Section 6: Backward Compatibility
  // ============================================================================

  describe('Backward compatibility', () => {
    it('should support existing usage patterns', async () => {
      // Test implementation
    });

    it('should not break existing API', async () => {
      // Test implementation
    });
  });
});
```

### 8.2 Test Case Documentation Template

```typescript
/**
 * Test case summary
 *
 * **Scenario**: [Brief scenario description]
 *
 * **Given**: [Preconditions]
 * **When**: [Action taken]
 * **Then**: [Expected outcome]
 *
 * **Related**: [Issue/PRP reference]
 *
 * **Test Coverage**:
 * - Validates: [What behavior is validated]
 * - Edge case: [If applicable, which edge case]
 * - Integration: [If applicable, what integration is tested]
 */
it('should describe the behavior clearly', async () => {
  // ARRANGE: Set up test data and conditions
  const input = createMockError({ message: 'Test' });

  // ACT: Execute the code under test
  const result = await functionUnderTest(input);

  // ASSERT: Verify expected outcome
  expect(result.message).toBe('Expected');
});
```

---

## 9. References and Further Reading

### 9.1 Official Documentation

While web search was unavailable at research time, these are the authoritative sources for testing best practices:

**Vitest Documentation:**
- https://vitest.dev/guide/ - Official Vitest guide
- https://vitest.dev/api/ - Vitest API reference (expect, vi, etc.)
- https://vitest.dev/guide/mocking.html - Module mocking and function spies

**TypeScript Testing:**
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-signatures - Assertion functions
- https://github.com/microsoft/TypeScript/wiki/Testing - TypeScript testing best practices

**Testing Best Practices:**
- https://testingjavascript.com/ - Testing JavaScript course (Kent C. Dodds)
- https://kentcdodds.com/blog/common-mistakes-with-react-testing-library - Common testing mistakes (concepts apply broadly)

### 9.2 Groundswell Codebase References

**Existing Test Patterns to Study:**

1. **Error Merge Strategy Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts`
   - Comprehensive error aggregation testing
   - Custom combine function testing
   - Event emission validation

2. **Workflow Error Utils Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`
   - Error merge utility function testing
   - Deduplication validation
   - Log aggregation testing

3. **Backward Compatibility Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/compatibility/backward-compatibility.test.ts`
   - Default behavior preservation
   - Breaking change validation
   - Migration path testing

4. **Concurrent Task Failure Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`
   - Promise.allSettled behavior
   - Event observer patterns
   - Child workflow creation helpers

5. **Integration Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`
   - Event emission sequencing
   - Observer pattern validation
   - Multi-step workflow testing

### 9.3 Key Implementation Files

**Source Code to Understand:**

1. **Error Utilities**
   - `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`
   - Default merge function implementation

2. **Type Definitions**
   - `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
   - ErrorMergeStrategy interface

3. **Task Decorator**
   - `/home/dustin/projects/groundswell/src/decorators/task.ts`
   - Error merge strategy integration

### 9.4 Testing Philosophy

**Testing Principles Applied in Groundswell:**

1. **AAA Pattern** - Arrange, Act, Assert structure throughout
2. **Test Isolation** - Each test is independent and can run in any order
3. **Descriptive Names** - Test names clearly describe what is being tested
4. **Comprehensive Coverage** - Tests cover happy path, edge cases, and error scenarios
5. **Type Safety** - Leverage TypeScript for compile-time test validation
6. **Documentation** - Tests serve as executable documentation
7. **Backward Compatibility** - Explicit tests ensure existing behavior is preserved

---

## Conclusion

This research document consolidates testing best practices from your existing Groundswell codebase and established testing framework standards. The key findings are:

1. **Your codebase already demonstrates excellent patterns** - The existing error merge tests are production-ready and should be used as templates
2. **Consistent helper functions** - Create reusable helpers like `createMockWorkflowError()` and `setupEventObserver()`
3. **Comprehensive coverage** - Test default behavior, opt-in behavior, custom functions, edge cases, and backward compatibility
4. **Type-safe assertions** - Use TypeScript's type system to ensure compile-time validation
5. **Event validation** - Test both individual and aggregated events when error merging is enabled
6. **Anti-patterns to avoid** - Don't test implementation details, use brittle string matching, or mix concerns

**Next Steps for PRP Creation:**

Use the patterns in this document to design comprehensive test coverage for:
- Error aggregation with merge strategy enabled/disabled
- Custom combine function validation
- Event emission correctness
- Backward compatibility preservation
- Edge case handling (empty, single, duplicate errors)

The templates and patterns provided here can be directly adapted for your specific error merge testing requirements.
