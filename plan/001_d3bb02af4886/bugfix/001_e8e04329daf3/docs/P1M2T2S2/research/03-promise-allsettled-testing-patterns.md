# Promise.allSettled Testing Patterns for Workflow Engines

**Research Date:** 2026-01-12
**Task:** P1.M2.T2.S2 - Research Promise.allSettled error scenarios
**Related Implementation:** `/home/dustin/projects/groundswell/src/decorators/task.ts` (lines 111-122)

## Overview

Promise.allSettled is crucial for workflow engines because it ensures all concurrent workflows complete execution, even when some fail. This document provides comprehensive testing patterns for Promise.allSettled in the context of hierarchical workflow orchestration.

## Table of Contents
1. [Promise.allSettled Basics](#promiseallsettled-basics)
2. [Testing Patterns](#testing-patterns)
3. [Workflow-Specific Scenarios](#workflow-specific-scenarios)
4. [Error Collection Strategies](#error-collection-strategies)
5. [Performance & Concurrency](#performance--concurrency)
6. [Edge Cases](#edge-cases)
7. [Code Examples](#code-examples)

---

## Promise.allSettled Basics

### What is Promise.allSettled?

```typescript
// Promise.allSettled waits for ALL promises to settle
// regardless of whether they fulfill or reject

const promises = [
  Promise.resolve('success'),
  Promise.reject(new Error('failure')),
  Promise.resolve('another success'),
];

const results = await Promise.allSettled(promises);

// Result structure:
// [
//   { status: 'fulfilled', value: 'success' },
//   { status: 'rejected', reason: Error: failure },
//   { status: 'fulfilled', value: 'another success' },
// ]
```

### Type Guards for Results

```typescript
/**
 * Type guard for rejected results
 */
function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

/**
 * Type guard for fulfilled results
 */
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

/**
 * Extract errors from allSettled results
 */
function extractErrors(results: PromiseSettledResult<unknown>[]): unknown[] {
  return results
    .filter(isRejected)
    .map(r => r.reason);
}

/**
 * Extract values from allSettled results
 */
function extractValues<T>(results: PromiseSettledResult<T>[]): T[] {
  return results
    .filter(isFulfilled)
    .map(r => r.value);
}
```

---

## Testing Patterns

### Pattern 1: Basic Error Collection

```typescript
describe('Promise.allSettled - Basic Error Collection', () => {
  it('should collect all errors from rejected promises', async () => {
    // ARRANGE: Create promises with mixed results
    const promises = [
      Promise.reject(new Error('Error 1')),
      Promise.reject(new Error('Error 2')),
      Promise.resolve('success'),
      Promise.reject(new Error('Error 3')),
    ];

    // ACT: Wait for all to settle
    const results = await Promise.allSettled(promises);

    // ASSERT: Filter and verify errors
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(rejected).toHaveLength(3);
    expect(rejected[0].reason.message).toBe('Error 1');
    expect(rejected[1].reason.message).toBe('Error 2');
    expect(rejected[2].reason.message).toBe('Error 3');

    // ASSERT: Verify fulfilled promises
    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled'
    );

    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0].value).toBe('success');
  });
});
```

### Pattern 2: All Promises Rejected

```typescript
describe('Promise.allSettled - All Rejected', () => {
  it('should handle all promises rejected', async () => {
    // ARRANGE: All promises will reject
    const promises = [
      Promise.reject(new Error('Error A')),
      Promise.reject(new Error('Error B')),
      Promise.reject(new Error('Error C')),
    ];

    // ACT
    const results = await Promise.allSettled(promises);

    // ASSERT: All results are rejected
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(Error);
      }
    });

    // ASSERT: Extract all errors
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);

    expect(errors).toHaveLength(3);
    expect(errors.map(e => e.message)).toEqual(['Error A', 'Error B', 'Error C']);
  });
});
```

### Pattern 3: All Promises Fulfilled

```typescript
describe('Promise.allSettled - All Fulfilled', () => {
  it('should handle all promises fulfilled', async () => {
    // ARRANGE: All promises will resolve
    const promises = [
      Promise.resolve('Result 1'),
      Promise.resolve('Result 2'),
      Promise.resolve('Result 3'),
    ];

    // ACT
    const results = await Promise.allSettled(promises);

    // ASSERT: All results are fulfilled
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value).toBeDefined();
      }
    });

    // ASSERT: Extract all values
    const values = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);

    expect(values).toEqual(['Result 1', 'Result 2', 'Result 3']);
  });
});
```

### Pattern 4: Empty Array

```typescript
describe('Promise.allSettled - Empty Array', () => {
  it('should handle empty promise array', async () => {
    // ARRANGE: Empty array
    const promises: Promise<unknown>[] = [];

    // ACT
    const results = await Promise.allSettled(promises);

    // ASSERT: Returns empty array
    expect(results).toEqual([]);
  });
});
```

---

## Workflow-Specific Scenarios

### Scenario 1: Concurrent Workflow Execution

```typescript
describe('Concurrent Workflow Execution', () => {
  it('should execute all workflows even when some fail', async () => {
    // ARRANGE: Track execution
    const executedWorkflows = new Set<string>();

    class ChildWorkflow extends Workflow {
      async run() {
        executedWorkflows.add(this.id);
        throw new Error(`${this.id} failed`);
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          new ChildWorkflow('child-1', this),
          new ChildWorkflow('child-2', this),
          new ChildWorkflow('child-3', this),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected - error thrown after all complete
        }
      }
    }

    const parent = new ParentWorkflow('parent');

    // ACT: Run parent workflow
    await parent.run();

    // ASSERT: All workflows executed (Promise.allSettled completed all)
    expect(executedWorkflows.size).toBe(3);
    expect(executedWorkflows.has('child-1')).toBe(true);
    expect(executedWorkflows.has('child-2')).toBe(true);
    expect(executedWorkflows.has('child-3')).toBe(true);
  });
});
```

### Scenario 2: Mixed Success/Failure

```typescript
describe('Mixed Success/Failure Scenarios', () => {
  it('should complete successful workflows despite failures', async () => {
    // ARRANGE: Create workflows with mixed outcomes
    const successfulWorkflows = new Set<string>();
    const failedWorkflows = new Set<string>();

    class MixedOutcomeWorkflow extends Workflow {
      private shouldFail: boolean;

      constructor(id: string, parent: Workflow, shouldFail: boolean) {
        super(id, parent);
        this.shouldFail = shouldFail;
      }

      async run() {
        if (this.shouldFail) {
          failedWorkflows.add(this.id);
          throw new Error(`${this.id} failed`);
        } else {
          successfulWorkflows.add(this.id);
          return `${this.id} succeeded`;
        }
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          new MixedOutcomeWorkflow('success-1', this, false),
          new MixedOutcomeWorkflow('fail-1', this, true),
          new MixedOutcomeWorkflow('success-2', this, false),
          new MixedOutcomeWorkflow('fail-2', this, true),
          new MixedOutcomeWorkflow('success-3', this, false),
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

    const parent = new ParentWorkflow('parent');

    // ACT
    await parent.run();

    // ASSERT: All workflows executed
    expect(successfulWorkflows.size).toBe(3);
    expect(failedWorkflows.size).toBe(2);

    // ASSERT: Verify specific workflows
    expect(successfulWorkflows.has('success-1')).toBe(true);
    expect(successfulWorkflows.has('success-2')).toBe(true);
    expect(successfulWorkflows.has('success-3')).toBe(true);
    expect(failedWorkflows.has('fail-1')).toBe(true);
    expect(failedWorkflows.has('fail-2')).toBe(true);
  });
});
```

### Scenario 3: No Orphaned Workflows

```typescript
describe('Orphan Prevention', () => {
  it('should not leave orphaned workflows', async () => {
    // ARRANGE: Track all promise completions
    const completions = new Map<string, 'success' | 'failure'>();

    class TrackedWorkflow extends Workflow {
      private shouldFail: boolean;

      constructor(id: string, parent: Workflow, shouldFail: boolean) {
        super(id, parent);
        this.shouldFail = shouldFail;
      }

      async run() {
        // Track completion regardless of outcome
        return this.runInternal()
          .then(
            () => completions.set(this.id, 'success'),
            () => completions.set(this.id, 'failure')
          );
      }

      async runInternal() {
        if (this.shouldFail) {
          throw new Error(`${this.id} failed`);
        }
        return `${this.id} succeeded`;
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        const children = [
          new TrackedWorkflow('workflow-1', this, false),
          new TrackedWorkflow('workflow-2', this, true),
          new TrackedWorkflow('workflow-3', this, false),
        ];

        // Manually track each child's completion
        children.forEach(child => {
          child.run().catch(() => {});  // Don't let errors propagate
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

    const parent = new ParentWorkflow('parent');

    // ACT: Run with timeout to detect hanging promises
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: workflows hung')), 5000)
    );

    await Promise.race([parent.run(), timeoutPromise]);

    // ASSERT: All workflows accounted for (no orphans)
    expect(completions.size).toBe(3);
    expect(completions.get('workflow-1')).toBe('success');
    expect(completions.get('workflow-2')).toBe('failure');
    expect(completions.get('workflow-3')).toBe('success');
  });
});
```

---

## Error Collection Strategies

### Strategy 1: First Error Wins (Backward Compatible)

```typescript
describe('Error Collection - First Error Wins', () => {
  it('should throw first error when no merge strategy', async () => {
    // ARRANGE: Create parent without error merge strategy
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })  // No errorMergeStrategy
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

    const parent = new ParentWorkflow('parent');

    // ACT
    const result = await parent.run();

    // ASSERT: Only first error thrown
    expect(result.message).toContain('First error');
    expect(result.message).not.toContain('Second error');
    expect(result.message).not.toContain('Third error');
  });
});
```

### Strategy 2: Collect All Errors

```typescript
describe('Error Collection - Collect All', () => {
  it('should collect all errors when merge strategy enabled', async () => {
    // ARRANGE: Create parent with error merge strategy
    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'Alpha', 'Alpha error'),
          createFailingWorkflow(this, 'Beta', 'Beta error'),
          createFailingWorkflow(this, 'Gamma', 'Gamma error'),
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

    const parent = new ParentWorkflow('parent');

    // ACT
    const result = await parent.run();

    // ASSERT: All errors collected
    expect(result.message).toContain('3 concurrent errors');
    expect(result.message).toContain('Alpha error');
    expect(result.message).toContain('Beta error');
    expect(result.message).toContain('Gamma error');
  });
});
```

### Strategy 3: Custom Error Filter

```typescript
describe('Error Collection - Custom Filter', () => {
  it('should filter errors by type', async () => {
    // ARRANGE: Define custom error filter
    const isRetryableError = (error: Error) => {
      return error.message.includes('timeout') ||
             error.message.includes('network');
    };

    class CustomFilterWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          combine: (errors) => {
            // Filter to only retryable errors
            const retryable = errors.filter(e =>
              isRetryableError(e.original as Error)
            );

            return {
              message: `${retryable.length} retryable errors`,
              original: retryable,
              workflowId: 'filtered',
              state: {} as any,
              logs: retryable.flatMap(e => e.logs),
            };
          }
        }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'A', 'network timeout'),
          createFailingWorkflow(this, 'B', 'validation failed'),
          createFailingWorkflow(this, 'C', 'network error'),
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

    const workflow = new CustomFilterWorkflow('test');

    // ACT
    const result = await workflow.run();

    // ASSERT: Only retryable errors included
    expect(result.message).toContain('2 retryable errors');
    expect(result.original).toHaveLength(2);
  });
});
```

---

## Performance & Concurrency

### Performance Testing

```typescript
describe('Promise.allSettled Performance', () => {
  it('should complete large batches quickly', async () => {
    // ARRANGE: Create 100 concurrent workflows
    const workflowCount = 100;

    class PerformanceWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnManyChildren() {
        return Array.from({ length: workflowCount }, (_, i) =>
          createChildWorkflow(this, `child-${i}`, false)
        );
      }

      async run() {
        const startTime = performance.now();
        try {
          await this.spawnManyChildren();
        } catch (err) {
          // Expected
        }
        const duration = performance.now() - startTime;
        return duration;
      }
    }

    const workflow = new PerformanceWorkflow('perf-test');

    // ACT
    const duration = await workflow.run();

    // ASSERT: Should complete in reasonable time
    expect(duration).toBeLessThan(5000);  // 5 seconds max
  });

  it('should handle concurrent execution correctly', async () => {
    // ARRANGE: Track execution order
    const executionOrder: string[] = [];

    class ConcurrentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        const children = Array.from({ length: 5 }, (_, i) =>
          createChildWorkflow(this, `child-${i}`, false)
        );

        // Add tracking
        children.forEach(child => {
          child.run().then(() => {
            executionOrder.push(child.id);
          });
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

    const workflow = new ConcurrentWorkflow('concurrent-test');

    // ACT
    await workflow.run();

    // ASSERT: All workflows executed
    expect(executionOrder).toHaveLength(5);
  });
});
```

### Concurrency Verification

```typescript
describe('Concurrency Verification', () => {
  it('should execute workflows concurrently', async () => {
    // ARRANGE: Track start times
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
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected
        }
      }
    }

    const parent = new ParentWorkflow('parent');

    // ACT
    const startTime = Date.now();
    await parent.run();
    const totalTime = Date.now() - startTime;

    // ASSERT: Concurrent execution (total time < sequential time)
    expect(totalTime).toBeLessThan(250);  // Should be ~100ms, not 300ms sequential

    // ASSERT: All started around same time
    const times = Array.from(startTimes.values());
    const maxDiff = Math.max(...times) - Math.min(...times);
    expect(maxDiff).toBeLessThan(50);  // All started within 50ms
  });
});
```

---

## Edge Cases

### Edge Case 1: Single Workflow

```typescript
describe('Edge Case - Single Workflow', () => {
  it('should handle single workflow correctly', async () => {
    // ARRANGE: Only one child workflow
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChild() {
        return [createFailingWorkflow(this, 'OnlyChild', 'Single error')];
      }

      async run() {
        try {
          await this.spawnChild();
        } catch (err) {
          return err;
        }
      }
    }

    const parent = new ParentWorkflow('parent');

    // ACT
    const result = await parent.run();

    // ASSERT: Error handled correctly
    expect(result.message).toContain('Single error');
    expect(parent.children).toHaveLength(1);
  });
});
```

### Edge Case 2: Very Long Error Messages

```typescript
describe('Edge Case - Long Error Messages', () => {
  it('should handle very long error messages', async () => {
    // ARRANGE: Create error with 1000 character message
    const longMessage = 'X'.repeat(1000);

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: { enabled: true }
      })
      async spawnChildren() {
        return [
          createFailingWorkflow(this, 'Long', longMessage),
          createFailingWorkflow(this, 'Short', 'Short error'),
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

    const parent = new ParentWorkflow('parent');

    // ACT
    const result = await parent.run();

    // ASSERT: Long message preserved
    expect(result.message).toContain(longMessage);
    expect(result.message).toContain('Short error');
  });
});
```

### Edge Case 3: Rapid Sequential Tasks

```typescript
describe('Edge Case - Rapid Sequential Tasks', () => {
  it('should handle rapid sequential task execution', async () => {
    // ARRANGE: Execute same task multiple times rapidly
    class RapidWorkflow extends Workflow {
      @Task({ concurrent: true })
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
          // Expected
        }
      }
    }

    const workflow = new RapidWorkflow('rapid');

    // ACT: Run multiple times sequentially
    for (let i = 0; i < 10; i++) {
      await workflow.run().catch(() => {});
    }

    // ASSERT: No memory leaks or hanging promises
    // (Would need memory profiling tools in real scenario)
  });
});
```

---

## Code Examples

### Complete Test Suite Template

```typescript
// File: src/__tests__/unit/promise-allsettled-patterns.test.ts
import { describe, it, expect } from 'vitest';
import { Workflow, Task } from '../../index.js';

describe('Promise.allSettled Testing Patterns', () => {
  describe('Basic error collection', () => {
    it('should collect all errors from concurrent failures');
    it('should preserve error messages and context');
    it('should handle mixed success/failure scenarios');
  });

  describe('Workflow execution', () => {
    it('should complete all workflows despite failures');
    it('should not orphan any workflows');
    it('should execute workflows concurrently');
  });

  describe('Error handling', () => {
    it('should throw first error when no merge strategy');
    it('should merge errors when strategy enabled');
    it('should use custom merger when provided');
  });

  describe('Edge cases', () => {
    it('should handle single workflow');
    it('should handle empty workflow array');
    it('should handle very long error messages');
    it('should handle rapid sequential execution');
  });

  describe('Performance', () => {
    it('should complete large batches quickly');
    it('should execute workflows concurrently not sequentially');
  });
});
```

### Helper Functions

```typescript
/**
 * Create a child workflow for testing
 */
function createChildWorkflow(
  parent: Workflow,
  name: string,
  shouldFail: boolean
): Workflow {
  return new (class extends Workflow {
    constructor(n: string, p: Workflow) {
      super(n, p);
    }

    async run() {
      if (shouldFail) {
        throw new Error(`${name} failed`);
      }
      return `${name} succeeded`;
    }
  })(name, parent);
}

/**
 * Create a failing workflow
 */
function createFailingWorkflow(
  parent: Workflow,
  name: string,
  errorMessage: string
): Workflow {
  return new (class extends Workflow {
    async run() {
      throw new Error(errorMessage);
    }
  })(name, parent);
}

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

## Summary

This document provides comprehensive testing patterns for Promise.allSettled in workflow engines:

1. **Basics:** Understanding Promise.allSettled behavior and type guards
2. **Testing Patterns:** Basic, all-rejected, all-fulfilled, and empty array scenarios
3. **Workflow Scenarios:** Concurrent execution, mixed outcomes, orphan prevention
4. **Error Collection:** First-error, collect-all, and custom filter strategies
5. **Performance:** Testing large batches and concurrency verification
6. **Edge Cases:** Single workflow, long messages, rapid execution
7. **Code Examples:** Complete test templates and helper functions

These patterns can be directly applied to test the Promise.allSettled implementation in `/home/dustin/projects/groundswell/src/decorators/task.ts`.
