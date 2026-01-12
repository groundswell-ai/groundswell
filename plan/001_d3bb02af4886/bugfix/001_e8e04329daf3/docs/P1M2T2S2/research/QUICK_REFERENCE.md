# Quick Reference: Test Templates & Helper Functions

**Purpose:** Copy-paste templates for error aggregation testing
**Task:** P1.M2.T2.S2 - Implement error aggregation logic
**Last Updated:** 2026-01-12

---

## Helper Functions (Copy to Test File)

### Type Guards

```typescript
/**
 * Type guard for WorkflowError
 */
function isWorkflowError(error: unknown): error is WorkflowError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'workflowId' in error &&
    'logs' in error
  );
}

/**
 * Type guard for rejected PromiseSettledResult
 */
function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

/**
 * Type guard for fulfilled PromiseSettledResult
 */
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}
```

### Error Creation

```typescript
/**
 * Create a mock WorkflowError
 */
function createMockError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Mock error',
    original: new Error('Mock'),
    workflowId: 'mock-workflow',
    state: {} as any,
    logs: [],
    stack: 'Error: Mock\n    at mock.js:10:15',
    ...overrides
  };
}

/**
 * Create a failing child workflow
 */
function createFailingWorkflow(parent: Workflow, name: string, errorMessage: string): Workflow {
  return new (class extends Workflow {
    constructor(n: string, p: Workflow) {
      super(n, p);
    }

    async run() {
      throw new Error(errorMessage);
    }
  })(name, parent);
}

/**
 * Create a child workflow with configurable failure
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
```

### Test Setup

```typescript
/**
 * Setup event observer for testing
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

---

## Test Templates

### Template 1: Basic Error Aggregation

```typescript
describe('Error Aggregation - Basic', () => {
  it('should aggregate errors from multiple concurrent workflows', async () => {
    // ARRANGE: Create parent workflow
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'Child-1', 'Error 1'),
          createFailingWorkflow(this, 'Child-2', 'Error 2'),
          createFailingWorkflow(this, 'Child-3', 'Error 3'),
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

    // ACT: Run the workflow
    const result = await parent.run();

    // ASSERT: Verify error aggregation
    expect(result.message).toContain('3 concurrent errors');
    expect(result.message).toContain('[1] Error 1');
    expect(result.message).toContain('[2] Error 2');
    expect(result.message).toContain('[3] Error 3');
    expect(result.logs).toHaveLength(3);
  });
});
```

### Template 2: Custom Error Merger

```typescript
describe('Error Aggregation - Custom Merger', () => {
  it('should use custom error merge function', async () => {
    // ARRANGE: Define custom merger
    const customMerger = (errors: WorkflowError[]) => ({
      message: `CUSTOM: ${errors.length} errors`,
      original: errors,
      workflowId: 'custom-merged',
      state: {} as any,
      logs: errors.flatMap(e => e.logs),
    });

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          combine: customMerger
        }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'A', 'Error A'),
          createFailingWorkflow(this, 'B', 'Error B'),
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
    const result = await parent.run();

    // ASSERT: Custom merger was used
    expect(result.message).toBe('CUSTOM: 2 errors');
    expect(result.workflowId).toBe('custom-merged');
  });
});
```

### Template 3: Backward Compatibility

```typescript
describe('Error Aggregation - Backward Compatibility', () => {
  it('should throw first error when disabled', async () => {
    // ARRANGE: Create parent without error merge strategy
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: false }  // Disabled
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'First', 'First error'),
          createFailingWorkflow(this, 'Second', 'Second error'),
          createFailingWorkflow(this, 'Third', 'Third error'),
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
    const result = await parent.run();

    // ASSERT: Only first error thrown (backward compatible)
    expect(result.message).toContain('First error');
    expect(result.message).not.toContain('Second error');
    expect(result.message).not.toContain('Third error');
  });

  it('should throw first error when errorMergeStrategy not provided', async () => {
    // ARRANGE: No errorMergeStrategy at all
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })  // No errorMergeStrategy
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'First', 'First error'),
          createFailingWorkflow(this, 'Second', 'Second error'),
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
    const result = await parent.run();

    // ASSERT: First error thrown (backward compatible default)
    expect(result.message).toContain('First error');
  });
});
```

### Template 4: Event Emission

```typescript
describe('Error Aggregation - Event Emission', () => {
  it('should emit error event with merged error', async () => {
    // ARRANGE: Setup event collection
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'Bad1', 'Error 1'),
          createFailingWorkflow(this, 'Bad2', 'Error 2'),
        ];
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
    const events = setupEventObserver(parent);

    // ACT
    await parent.run();

    // ASSERT: Error events emitted
    const errorEvents = events.filter(e => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(2);

    // ASSERT: Merged error event present
    const mergedErrorEvent = errorEvents.find(e =>
      e.type === 'error' && e.error.message.includes('2 concurrent errors')
    );
    expect(mergedErrorEvent).toBeDefined();
  });
});
```

### Template 5: Edge Cases

```typescript
describe('Error Aggregation - Edge Cases', () => {
  it('should handle empty error array', () => {
    // ARRANGE
    const errors: WorkflowError[] = [];

    // ACT & ASSERT
    expect(() => mergeWorkflowErrors(errors)).toThrow('Cannot merge empty error array');
  });

  it('should handle single error', () => {
    // ARRANGE
    const singleError = createMockError({ message: 'Single error' });

    // ACT
    const result = mergeWorkflowErrors([singleError]);

    // ASSERT: Returns same error object
    expect(result).toBe(singleError);
    expect(result.message).toBe('Single error');
  });

  it('should handle all workflows failing', async () => {
    // ARRANGE: All children will fail
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return Array.from({ length: 5 }, (_, i) =>
          createFailingWorkflow(this, `FailChild-${i}`, `Error ${i}`)
        );
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
    const result = await parent.run();

    // ASSERT: All 5 errors aggregated
    expect(result.message).toContain('5 concurrent errors');
    for (let i = 0; i < 5; i++) {
      expect(result.message).toContain(`Error ${i}`);
    }
  });
});
```

### Template 6: Promise.allSettled Patterns

```typescript
describe('Promise.allSettled Patterns', () => {
  it('should collect all errors from allSettled promises', async () => {
    // ARRANGE: Create promises with mixed results
    const promises = [
      Promise.reject(new Error('Error 1')),
      Promise.reject(new Error('Error 2')),
      Promise.resolve('success'),
      Promise.reject(new Error('Error 3')),
    ];

    // ACT: Use Promise.allSettled
    const results = await Promise.allSettled(promises);

    // ASSERT: Filter and verify errors
    const rejected = results.filter(isRejected);

    expect(rejected).toHaveLength(3);
    expect(rejected[0].reason.message).toBe('Error 1');
    expect(rejected[1].reason.message).toBe('Error 2');
    expect(rejected[2].reason.message).toBe('Error 3');

    // ASSERT: Verify fulfilled promises
    const fulfilled = results.filter(isFulfilled);

    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0].value).toBe('success');
  });

  it('should complete all workflows despite failures', async () => {
    // ARRANGE: Track all completions
    const completedWorkflows = new Set<string>();

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        const children = [
          createChildWorkflow(this, 'Success-1', false),
          createChildWorkflow(this, 'Fail-1', true),
          createChildWorkflow(this, 'Success-2', false),
          createChildWorkflow(this, 'Fail-2', true),
          createChildWorkflow(this, 'Success-3', false),
        ];

        // Track all completions
        children.forEach(child => {
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

    // ACT
    await parent.run();

    // ASSERT: All 5 workflows completed (no orphans)
    expect(completedWorkflows.size).toBe(5);
    expect(parent.children.length).toBe(5);
  });
});
```

### Template 7: Performance Testing

```typescript
describe('Error Aggregation - Performance', () => {
  it('should handle large error counts efficiently', async () => {
    // ARRANGE: Create 50 concurrent workflows
    const workflowCount = 50;

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnManyChildren() {
        return Array.from({ length: workflowCount }, (_, i) =>
          createFailingWorkflow(this, `child-${i}`, `Error ${i}`)
        );
      }

      async run() {
        const startTime = performance.now();
        try {
          await this.spawnManyChildren();
        } catch (err) {
          const duration = performance.now() - startTime;
          return { error: err, duration };
        }
      }
    }

    const parent = new ParentWorkflow('Parent');

    // ACT
    const { error, duration } = await parent.run();

    // ASSERT: All errors aggregated
    expect(error.message).toContain('50 concurrent errors');

    // ASSERT: Completed in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  it('should execute workflows concurrently not sequentially', async () => {
    // ARRANGE: Track execution times
    const startTimes = new Map<string, number>();

    class TimedWorkflow extends Workflow {
      async run() {
        startTimes.set(this.id, Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.id;
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          new TimedWorkflow('child-1', this),
          new TimedWorkflow('child-2', this),
          new TimedWorkflow('child-3', this),
        ];
      }

      async run() {
        const startTime = Date.now();
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected
        }
        return Date.now() - startTime;
      }
    }

    const parent = new ParentWorkflow('Parent');

    // ACT
    const totalTime = await parent.run();

    // ASSERT: Concurrent execution (total time < sequential time)
    expect(totalTime).toBeLessThan(250);  // Should be ~100ms, not 300ms

    // ASSERT: All started around same time (within 50ms)
    const times = Array.from(startTimes.values());
    const maxDiff = Math.max(...times) - Math.min(...times);
    expect(maxDiff).toBeLessThan(50);
  });
});
```

---

## Assertion Patterns

### Message Assertions

```typescript
// Contains substring
expect(result.message).toContain('concurrent errors');

// Matches regex
expect(result.message).toMatch(/\d+ concurrent errors/);

// Exact match
expect(result.message).toBe('3 concurrent errors: [1] Error 1; [2] Error 2; [3] Error 3');

// Multiple substrings
expect(result.message).toContain('Error 1');
expect(result.message).toContain('Error 2');
expect(result.message).toContain('Error 3');
```

### Object Matching

```typescript
// Partial match
expect(result).toMatchObject({
  message: expect.stringContaining('errors'),
  workflowId: expect.any(String),
  logs: expect.any(Array),
});

// Nested array matching
expect(result.logs).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      workflowId: expect.any(String),
      level: expect.any(String),
    })
  ])
);

// Exact array match
expect(result.original).toEqual([error1, error2, error3]);
```

### Type Assertions

```typescript
// Type guard assertion
if (isWorkflowError(result)) {
  expect(result.message).toBeDefined();
  expect(result.workflowId).toBeDefined();
  expect(Array.isArray(result.logs)).toBe(true);
} else {
  fail('Result is not a WorkflowError');
}

// Instance check
expect(result).toBeInstanceOf(Error);
expect(result.original).toBeInstanceOf(Error);
```

### Error Assertions

```typescript
// Async error with rejects
await expect(workflow.run()).rejects.toThrow('Expected error');

// Try-catch with assertion
try {
  await workflow.run();
  fail('Expected error to be thrown');
} catch (error) {
  expect(error).toMatchObject({
    message: expect.stringContaining('error'),
  });
}

// Return error from try-catch
const error = await workflow.run().catch(err => err);
expect(error).toBeDefined();
expect(error.message).toContain('error');
```

---

## Test Structure Template

```typescript
describe('Feature Name', () => {
  describe('Specific Scenario', () => {
    it('should do something specific', async () => {
      // ARRANGE: Setup test data and conditions
      const workflow = new TestWorkflow('Test');

      // ACT: Execute the code being tested
      const result = await workflow.run();

      // ASSERT: Verify expected outcomes
      expect(result).toBeDefined();
      expect(result.message).toContain('expected');
    });
  });
});
```

---

## Import Statements

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowError, WorkflowEvent } from '../../types/index.js';
import { mergeWorkflowErrors } from '../../utils/error-merger.js';
```

---

## Common Test Scenarios Checklist

- [ ] Empty error array
- [ ] Single error
- [ ] Two errors
- [ ] Multiple errors (3, 5, 10+)
- [ ] All workflows succeed
- [ ] All workflows fail
- [ ] Mixed success/failure
- [ ] Custom merge function
- [ ] Disabled merge strategy (backward compat)
- [ ] No merge strategy provided (backward compat)
- [ ] Event emission
- [ ] Event propagation to parent
- [ ] Large error counts (50+)
- [ ] Performance/concurrency verification
- [ ] Orphan prevention
- [ ] Memory leaks (if applicable)

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-12
**For:** P1.M2.T2.S2 Implementation
