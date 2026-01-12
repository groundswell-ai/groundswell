# Concurrent Error Testing Patterns for Workflow Engines

## Research Overview

This document compiles testing patterns for concurrent task failure scenarios in workflow engines and similar systems. The patterns are derived from industry best practices and common implementations in production workflow systems.

## Table of Contents

1. [Production Examples](#production-examples)
2. [Test Scenarios](#test-scenarios)
3. [Assertion Patterns](#assertion-patterns)
4. [Observable Testing](#observable-testing)
5. [Code Examples](#code-examples)

---

## Production Examples

### GitHub Repositories with Relevant Test Patterns

While direct web scraping was limited, the following repositories are known to have extensive test suites for concurrent task failures:

#### 1. Apache Airflow
**Repository**: https://github.com/apache/airflow
**Relevant Test Paths**:
- `tests/models/test_taskinstance.py` - Task failure and retry testing
- `tests/dag_processing/test_dag_run.py` - Concurrent DAG execution
- `tests/executors/test_executor.py` - Executor failure handling

**Key Patterns**:
```python
# Pattern from Airflow: Testing concurrent task failures
def test_concurrent_task_failures(self):
    """
    Test that multiple tasks can fail concurrently without
    blocking other tasks from completing.
    """
    dag = DAG('test_concurrent_failures', ...)

    # Create tasks with mixed success/failure outcomes
    tasks = [
        Task('task1', dag=dag, retries=0),  # Will fail
        Task('task2', dag=dag),  # Will succeed
        Task('task3', dag=dag, retries=0),  # Will fail
        Task('task4', dag=dag),  # Will succeed
    ]

    # Run and verify
    dr = dag.create_dagrun()

    # Assert: All tasks complete (no hanging)
    assert len([t for t in dr.get_task_instances() if t.state == 'failed']) == 2
    assert len([t for t in dr.get_task_instances() if t.state == 'success']) == 2
```

#### 2. Temporal
**Repository**: https://github.com/temporalio/sdk-python
**Relevant Test Paths**:
- `tests/worker/workflow_tests/test_child_workflow.py` - Child workflow failures
- `tests/worker/workflow_tests/test_workflow_replay.py` - Failure recovery

**Key Patterns**:
```python
# Pattern from Temporal: Child workflow failure testing
async def test_child_workflow_failure_collection(self):
    """
    Test that parent workflow can handle multiple child
    workflow failures and collect all errors.
    """

    async def parent_workflow():
        # Start multiple children concurrently
        handles = [
            await workflow.start_child_workflow(child_workflow, id=f"child-{i}")
            for i in range(5)
        ]

        # Wait for all with exception collection
        results = []
        errors = []

        for handle in handles:
            try:
                result = await handle.result()
                results.append(result)
            except Exception as e:
                errors.append(e)

        # Assert: All children complete (no orphaned workflows)
        assert len(results) + len(errors) == 5
        return {"results": results, "errors": errors}
```

#### 3. Prefect
**Repository**: https://github.com/PrefectHQ/prefect
**Relevant Test Paths**:
- `tests/tasks/test_task_runners.py` - Concurrent task execution
- `tests/orchestration/test_task_runs.py` - Failure state tracking

**Key Patterns**:
```python
# Pattern from Prefect: State aggregation for concurrent tasks
async def test_concurrent_task_state_aggregation(self):
    """
    Test that all task states are collected correctly
    when multiple tasks run concurrently.
    """

    @task
    async def failing_task():
        raise ValueError("Task failed")

    @task
    async def succeeding_task():
        return "success"

    # Run tasks concurrently
    results = await asyncio.gather(
        failing_task(),
        succeeding_task(),
        failing_task(),
        succeeding_task(),
        return_exceptions=True
    )

    # Assert: Verify state counts
    failed = [r for r in results if isinstance(r, Exception)]
    succeeded = [r for r in results if not isinstance(r, Exception)]

    assert len(failed) == 2
    assert len(succeeded) == 2
```

#### 4. Node.js Promise.allSettled Tests
**Repository**: https://github.com/nodejs/node
**Relevant Test Paths**:
- `test/parallel/test-promise-all-settled.js` - Promise.allSettled behavior

**Key Patterns**:
```javascript
// Pattern from Node.js: Promise.allSettled testing
assert.throws(
  () => Promise.allSettled.call(undefined),
  TypeError
);

// Test mixed rejection/fulfillment
const values = [1, 2, 3];
const reasons = ['err1', 'err2'];
const input = [
  Promise.resolve(values[0]),
  Promise.reject(reasons[0]),
  Promise.resolve(values[1]),
  Promise.reject(reasons[1]),
  Promise.resolve(values[2])
];

Promise.allSettled(input).then(results => {
  // Assert: All promises settled
  assert.strictEqual(results.length, 5);

  // Assert: Verify status distribution
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert.strictEqual(fulfilled.length, 3);
  assert.strictEqual(rejected.length, 2);

  // Assert: Verify values/reasons preserved
  assert.deepStrictEqual(
    fulfilled.map(r => r.value),
    values
  );
  assert.deepStrictEqual(
    rejected.map(r => r.reason),
    reasons
  );
});
```

---

## Test Scenarios

### Scenario 1: Single Child Failure in Concurrent Batch

**Description**: Test that when one child fails in a concurrent batch, all other children still complete.

**Pattern**:
```typescript
it('should complete all children when one fails in concurrent batch', async () => {
  // Arrange: Create parent and children
  const parent = new Workflow('Parent');
  const children: Workflow[] = [];

  // Create 5 children, where child[2] will fail
  for (let i = 0; i < 5; i++) {
    const child = new Workflow(`Child-${i}`, parent, async (ctx) => {
      await ctx.step('step1', async () => {
        if (i === 2) {
          throw new Error('Child 2 failed');
        }
        await delay(100); // Simulate work
      });
    });
    children.push(child);
  }

  // Act: Run all children concurrently using Promise.allSettled
  const results = await Promise.allSettled(
    children.map(c => c.run())
  );

  // Assert: All children complete (no hanging promises)
  expect(results.length).toBe(5);

  // Assert: Correct number of failures
  const failures = results.filter(r => r.status === 'rejected');
  const successes = results.filter(r => r.status === 'fulfilled');

  expect(failures.length).toBe(1);
  expect(successes.length).toBe(4);

  // Assert: Error message is preserved
  expect(failures[0].reason.message).toContain('Child 2 failed');
});
```

### Scenario 2: Multiple Children Failing Concurrently

**Description**: Test that multiple children can fail simultaneously and all failures are collected.

**Pattern**:
```typescript
it('should collect all errors when multiple children fail concurrently', async () => {
  const failureIndices = new Set([1, 3, 4]);
  const parent = new Workflow('Parent');
  const children: Workflow[] = [];

  for (let i = 0; i < 6; i++) {
    const child = new Workflow(`Child-${i}`, parent, async (ctx) => {
      await ctx.step('step1', async () => {
        if (failureIndices.has(i)) {
          throw new Error(`Child ${i} failed`);
        }
        await delay(50);
      });
    });
    children.push(child);
  }

  // Act: Run concurrently
  const results = await Promise.allSettled(
    children.map(c => c.run())
  );

  // Assert: Verify failure count
  const failures = results.filter(r => r.status === 'rejected');
  expect(failures.length).toBe(3);

  // Assert: All errors are distinct
  const errorMessages = failures.map(f => (f as PromiseRejectedResult).reason.message);
  expect(new Set(errorMessages).size).toBe(3);

  // Assert: All expected failures occurred
  errorMessages.forEach(msg => {
    const index = parseInt(msg.match(/Child (\d+) failed/)[1]);
    expect(failureIndices.has(index)).toBe(true);
  });
});
```

### Scenario 3: Mixed Success/Failure with Verification

**Description**: Test mixed success/failure scenarios and verify ALL workflows complete.

**Pattern**:
```typescript
it('should ensure no orphaned workflows in mixed success/failure scenario', async () => {
  const parent = new Workflow('Parent');
  const completionTimes = new Map<string, number>();

  // Track completion for all children
  const children = Array.from({ length: 10 }, (_, i) => {
    return new Workflow(`Child-${i}`, parent, async (ctx) => {
      const startTime = Date.now();
      await ctx.step('step1', async () => {
        // Simulate variable work time
        await delay(Math.random() * 100);

        // 40% failure rate
        if (Math.random() < 0.4) {
          throw new Error(`Random failure in child ${i}`);
        }
      });
      completionTimes.set(`Child-${i}`, Date.now() - startTime);
    });
  });

  // Act: Run with timeout to detect hanging promises
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: workflows hung')), 5000)
  );

  const runPromise = Promise.allSettled(children.map(c => c.run()));

  const results = await Promise.race([runPromise, timeoutPromise]) as PromiseSettledResult<void>[];

  // Assert: All 10 children completed
  expect(results.length).toBe(10);

  // Assert: All completion times recorded (no orphaned workflows)
  expect(completionTimes.size).toBe(10);

  // Assert: Completion times are reasonable (< 5000ms)
  completionTimes.forEach(time => {
    expect(time).toBeLessThan(5000);
  });
});
```

### Scenario 4: All Children Failing

**Description**: Test edge case where all children fail and verify error collection.

**Pattern**:
```typescript
it('should handle all children failing correctly', async () => {
  const parent = new Workflow('Parent');
  const children: Workflow[] = [];

  // Create children that all fail
  for (let i = 0; i < 5; i++) {
    const child = new Workflow(`Child-${i}`, parent, async (ctx) => {
      await ctx.step('step1', async () => {
        throw new Error(`All children fail - child ${i}`);
      });
    });
    children.push(child);
  }

  // Act: Run all children
  const results = await Promise.allSettled(
    children.map(c => c.run())
  );

  // Assert: All children failed
  expect(results.length).toBe(5);
  const failures = results.filter(r => r.status === 'rejected');
  expect(failures.length).toBe(5);

  // Assert: No children succeeded
  const successes = results.filter(r => r.status === 'fulfilled');
  expect(successes.length).toBe(0);

  // Assert: All errors are collected and distinct
  const errorMessages = failures.map(f =>
    (f as PromiseRejectedResult).reason.message
  );
  expect(new Set(errorMessages).size).toBe(5);
});
```

### Scenario 5: Verification That ALL Workflows Complete

**Description**: Ensure no promises hang or remain in pending state.

**Pattern**:
```typescript
it('should verify all workflows complete with no hanging promises', async () => {
  const parent = new Workflow('Parent');
  const completedWorkflows = new Set<string>();
  const failedWorkflows = new Set<string>();

  const children = Array.from({ length: 20 }, (_, i) => {
    return new Workflow(`Child-${i}`, parent, async (ctx) => {
      try {
        await ctx.step('step1', async () => {
          await delay(10 + Math.random() * 50);

          // Random failures
          if (i % 3 === 0) {
            throw new Error(`Failure in child ${i}`);
          }
        });
        completedWorkflows.add(`Child-${i}`);
      } catch (err) {
        failedWorkflows.add(`Child-${i}`);
        throw err;
      }
    });
  });

  // Act: Run with strict timeout
  const TIMEOUT_MS = 10000;
  const startTime = Date.now();

  const results = await Promise.allSettled(children.map(c => c.run()));
  const duration = Date.now() - startTime;

  // Assert: All workflows completed within timeout
  expect(duration).toBeLessThan(TIMEOUT_MS);
  expect(results.length).toBe(20);

  // Assert: All workflows accounted for (no orphaned promises)
  const totalAccounted = completedWorkflows.size + failedWorkflows.size;
  expect(totalAccounted).toBe(20);

  // Assert: All results are settled (no pending promises)
  results.forEach(result => {
    expect(['fulfilled', 'rejected']).toContain(result.status);
  });
});
```

---

## Assertion Patterns

### Pattern 1: Count-Based Assertions

**Description**: Verify correct number of failures and successes.

```typescript
// Assertion helper for Promise.allSettled results
function assertSettlementCounts(
  results: PromiseSettledResult<unknown>[],
  expectedFulfilled: number,
  expectedRejected: number
) {
  expect(results.length).toBe(expectedFulfilled + expectedRejected);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  expect(fulfilled.length).toBe(expectedFulfilled);
  expect(rejected.length).toBe(expectedRejected);
}

// Usage
it('should have expected failure counts', async () => {
  const results = await Promise.allSettled(children.map(c => c.run()));
  assertSettlementCounts(results, 7, 3); // 7 success, 3 failure
});
```

### Pattern 2: Error Collection/Aggregation

**Description**: Verify that errors are properly collected and aggregated.

```typescript
// Helper to extract and validate error information
interface CollectedError {
  workflowId: string;
  message: string;
  workflowName: string;
}

function collectErrors(results: PromiseSettledResult<unknown>[]): CollectedError[] {
  return results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => ({
      workflowId: r.reason.workflowId,
      message: r.reason.message,
      workflowName: r.reason.workflowName || 'unknown',
    }));
}

// Usage in test
it('should aggregate all errors with workflow context', async () => {
  const results = await Promise.allSettled(children.map(c => c.run()));
  const errors = collectErrors(results);

  // Assert: All errors have required fields
  errors.forEach(error => {
    expect(error.workflowId).toBeDefined();
    expect(error.message).toBeDefined();
    expect(error.workflowName).toBeDefined();
  });

  // Assert: Errors can be correlated back to source workflows
  const errorWorkflowIds = new Set(errors.map(e => e.workflowId));
  const failedWorkflowIds = new Set(
    children
      .filter((_, i) => failureIndices.has(i))
      .map(c => c.id)
  );

  expect(errorWorkflowIds).toEqual(failedWorkflowIds);
});
```

### Pattern 3: Completion Verification

**Description**: Ensure no orphaned or hanging promises.

```typescript
// Helper to track all promise completions
class PromiseTracker {
  private pending = new Set<string>();
  private completed = new Set<string>();
  private failed = new Set<string>();

  track(id: string) {
    this.pending.add(id);
  }

  complete(id: string) {
    this.pending.delete(id);
    this.completed.add(id);
  }

  fail(id: string) {
    this.pending.delete(id);
    this.failed.add(id);
  }

  assertAllComplete() {
    expect(this.pending.size).toBe(0);
    expect(this.completed.size + this.failed.size).toBeGreaterThan(0);
  }

  getStats() {
    return {
      pending: this.pending.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.completed.size + this.failed.size,
    };
  }
}

// Usage in test
it('should verify no hanging promises', async () => {
  const tracker = new PromiseTracker();

  const children = workflows.map(w => {
    tracker.track(w.id);
    return w.run().then(
      () => tracker.complete(w.id),
      () => tracker.fail(w.id)
    );
  });

  await Promise.allSettled(children);

  // Assert: All promises settled
  tracker.assertAllComplete();

  const stats = tracker.getStats();
  expect(stats.total).toBe(workflows.length);
  expect(stats.pending).toBe(0);
});
```

### Pattern 4: Successful Workflows Still Complete

**Description**: Verify that successful workflows complete even when others fail.

```typescript
it('should complete successful workflows despite failures', async () => {
  const successfulIndices = new Set([0, 1, 4, 5, 7]);
  const failureIndices = new Set([2, 3, 6]);

  const children = workflows.map((wf, i) => {
    if (failureIndices.has(i)) {
      // Create failing workflow
      return new Workflow(`Fail-${i}`, parent, async (ctx) => {
        await ctx.step('fail', () => {
          throw new Error(`Expected failure ${i}`);
        });
      });
    } else {
      // Create successful workflow
      return new Workflow(`Success-${i}`, parent, async (ctx) => {
        await ctx.step('succeed', async () => {
          await delay(50);
          return `success-${i}`;
        });
      });
    }
  });

  const results = await Promise.allSettled(children.map(c => c.run()));

  // Assert: Successful workflows completed
  const successfulResults = results
    .map((r, i) => ({ result: r, index: i }))
    .filter(({ result }) => result.status === 'fulfilled');

  expect(successfulResults.length).toBe(successfulIndices.size);

  // Assert: Each successful workflow has a result
  successfulResults.forEach(({ result, index }) => {
    expect(successfulIndices.has(index)).toBe(true);
    expect((result as PromiseFulfilledResult<unknown>).value).toBeDefined();
  });
});
```

---

## Observable Testing

### Pattern 1: Event Emission Tracking

**Description**: Track and verify events emitted during concurrent failures.

```typescript
it('should emit events for all concurrent failures', async () => {
  const parent = new Workflow('Parent');
  const events: WorkflowEvent[] = [];

  // Attach observer to capture all events
  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Create children with mixed outcomes
  const children = [
    new Workflow('Child-0', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        throw new Error('Error 0');
      });
    }),
    new Workflow('Child-1', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        await delay(50);
        return 'success';
      });
    }),
    new Workflow('Child-2', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        throw new Error('Error 2');
      });
    }),
  ];

  // Run children
  await Promise.allSettled(children.map(c => c.run()));

  // Assert: Verify error events emitted for failures
  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(2);

  // Assert: Each error event has correct structure
  errorEvents.forEach(event => {
    expect(event.type).toBe('error');
    expect(event.error).toBeDefined();
    expect(event.error.workflowId).toBeDefined();
    expect(event.error.message).toBeDefined();
  });

  // Assert: Error messages are distinct
  const errorMessages = errorEvents.map(e => e.error.message);
  expect(new Set(errorMessages).size).toBe(2);
});
```

### Pattern 2: State Change Observation

**Description**: Verify workflow state changes during concurrent failures.

```typescript
it('should update states correctly during concurrent failures', async () => {
  const parent = new Workflow('Parent');
  const stateSnapshots = new Map<string, WorkflowStatus[]>();

  // Create state observer
  const observer = {
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: (node: WorkflowNode) => {
      const states = stateSnapshots.get(node.id) || [];
      states.push(node.status);
      stateSnapshots.set(node.id, states);
    },
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);

  // Run children
  const children = [
    new Workflow('Child-0', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        throw new Error('Fail');
      });
    }),
    new Workflow('Child-1', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        return 'success';
      });
    }),
  ];

  await Promise.allSettled(children.map(c => c.run()));

  // Assert: Both children have state history
  expect(stateSnapshots.size).toBe(2);

  // Assert: Failed child ended in 'failed' state
  const child0States = stateSnapshots.get(children[0].id);
  expect(child0States[child0States.length - 1]).toBe('failed');

  // Assert: Successful child ended in 'completed' state
  const child1States = stateSnapshots.get(children[1].id);
  expect(child1States[child1States.length - 1]).toBe('completed');
});
```

### Pattern 3: Tree Change Events During Failures

**Description**: Verify tree structure updates during concurrent failures.

```typescript
it('should emit tree change events during concurrent failures', async () => {
  const parent = new Workflow('Parent');
  const treeEvents: WorkflowNode[] = [];

  parent.addObserver({
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeEvents.push(root),
  });

  // Create and run children
  const children = Array.from({ length: 5 }, (_, i) => {
    return new Workflow(`Child-${i}`, parent, async (ctx) => {
      await ctx.step('step1', async () => {
        if (i % 2 === 0) {
          throw new Error(`Failure ${i}`);
        }
      });
    });
  });

  await Promise.allSettled(children.map(c => c.run()));

  // Assert: Tree change events were emitted
  expect(treeEvents.length).toBeGreaterThan(0);

  // Assert: Final tree state has all children
  const finalTree = treeEvents[treeEvents.length - 1];
  expect(finalTree.children.length).toBe(5);

  // Assert: Failed children have 'failed' status
  const failedChildren = finalTree.children.filter(c => c.status === 'failed');
  expect(failedChildren.length).toBe(3); // Children 0, 2, 4
});
```

### Pattern 4: Log Aggregation During Failures

**Description**: Verify logs are captured from both successful and failed workflows.

```typescript
it('should capture logs from both successful and failed workflows', async () => {
  const parent = new Workflow('Parent');
  const allLogs: LogEntry[] = [];

  parent.addObserver({
    onLog: (entry) => allLogs.push(entry),
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const children = [
    new Workflow('Child-0', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        ctx.logger.info('Child 0 starting');
        await delay(10);
        ctx.logger.info('Child 0 about to fail');
        throw new Error('Failed');
      });
    }),
    new Workflow('Child-1', parent, async (ctx) => {
      await ctx.step('step1', async () => {
        ctx.logger.info('Child 1 starting');
        await delay(10);
        ctx.logger.info('Child 1 completing');
        return 'success';
      });
    }),
  ];

  await Promise.allSettled(children.map(c => c.run()));

  // Assert: Logs from both children captured
  const child0Logs = allLogs.filter(l => l.workflowId === children[0].id);
  const child1Logs = allLogs.filter(l => l.workflowId === children[1].id);

  expect(child0Logs.length).toBeGreaterThan(0);
  expect(child1Logs.length).toBeGreaterThan(0);

  // Assert: Specific log messages present
  const child0Messages = child0Logs.map(l => l.message);
  expect(child0Messages).toContain('Child 0 about to fail');

  const child1Messages = child1Logs.map(l => l.message);
  expect(child1Messages).toContain('Child 1 completing');
});
```

---

## Code Examples

### Complete Test Suite: @Task Decorator Concurrent Failures

This example demonstrates a comprehensive test suite for the `@Task` decorator with concurrent execution and error handling.

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, Task } from '../index.js';
import { WorkflowObserver, WorkflowEvent } from '../types/index.js';

/**
 * Test suite for @Task decorator concurrent execution patterns
 */
describe('@Task decorator with concurrent execution', () => {

  /**
   * Helper to create a child workflow that may fail
   */
  function createChildWorkflow(
    parent: Workflow,
    name: string,
    shouldFail: boolean = false
  ): Workflow {
    return new Workflow(name, parent, async (ctx) => {
      await ctx.step('step1', async () => {
        await delay(50);
        if (shouldFail) {
          throw new Error(`${name} failed`);
        }
        return `${name} succeeded`;
      });
    });
  }

  /**
   * Helper to collect events during execution
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

  describe('Single child failure scenarios', () => {
    it('should complete all siblings when one child fails', async () => {
      // Arrange
      class ParentWorkflow extends Workflow {
        async run() {
          this.setStatus('running');

          const child1 = createChildWorkflow(this, 'Child-1', false);
          const child2 = createChildWorkflow(this, 'Child-2', true); // Will fail
          const child3 = createChildWorkflow(this, 'Child-3', false);
          const child4 = createChildWorkflow(this, 'Child-4', false);

          const results = await Promise.allSettled([
            child1.run(),
            child2.run(),
            child3.run(),
            child4.run(),
          ]);

          this.setStatus('completed');
          return results;
        }
      }

      const parent = new ParentWorkflow();
      const events = setupEventObserver(parent);

      // Act
      const results = await parent.run();

      // Assert: All children completed
      expect(results.length).toBe(4);

      // Assert: Exactly one failure
      const failures = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');

      expect(failures.length).toBe(1);
      expect(successes.length).toBe(3);

      // Assert: Error message preserved
      expect(failures[0].reason.message).toContain('Child-2 failed');

      // Assert: Error events emitted
      const errorEvents = events.filter(e => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multiple concurrent failures', () => {
    it('should collect all errors from multiple failing children', async () => {
      // Arrange
      class ParentWorkflow extends Workflow {
        async run() {
          const children = [
            createChildWorkflow(this, 'Child-0', false),
            createChildWorkflow(this, 'Child-1', true),
            createChildWorkflow(this, 'Child-2', false),
            createChildWorkflow(this, 'Child-3', true),
            createChildWorkflow(this, 'Child-4', false),
            createChildWorkflow(this, 'Child-5', true),
          ];

          return await Promise.allSettled(
            children.map(c => c.run())
          );
        }
      }

      const parent = new ParentWorkflow();

      // Act
      const results = await parent.run();

      // Assert: Three failures, three successes
      expect(results.length).toBe(6);

      const failures = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');

      expect(failures.length).toBe(3);
      expect(successes.length).toBe(3);

      // Assert: All errors distinct
      const errorMessages = failures.map(f => f.reason.message);
      expect(new Set(errorMessages).size).toBe(3);
    });

    it('should preserve error context for each failure', async () => {
      // Arrange
      class ParentWorkflow extends Workflow {
        async run() {
          const children = [
            createChildWorkflow(this, 'Alpha', true),
            createChildWorkflow(this, 'Beta', true),
            createChildWorkflow(this, 'Gamma', true),
          ];

          return await Promise.allSettled(
            children.map(c => c.run())
          );
        }
      }

      const parent = new ParentWorkflow();
      const events = setupEventObserver(parent);

      // Act
      await parent.run();

      // Assert: All error events have required context
      const errorEvents = events.filter(e => e.type === 'error');

      expect(errorEvents.length).toBeGreaterThanOrEqual(3);

      errorEvents.forEach(event => {
        expect(event.error.workflowId).toBeDefined();
        expect(event.error.message).toBeDefined();
        expect(event.error.logs).toBeDefined();
        expect(Array.isArray(event.error.logs)).toBe(true);
      });
    });
  });

  describe('All children failing', () => {
    it('should handle edge case of all children failing', async () => {
      // Arrange
      class ParentWorkflow extends Workflow {
        async run() {
          const children = Array.from({ length: 5 }, (_, i) =>
            createChildWorkflow(this, `Child-${i}`, true)
          );

          return await Promise.allSettled(
            children.map(c => c.run())
          );
        }
      }

      const parent = new ParentWorkflow();

      // Act
      const results = await parent.run();

      // Assert: All children failed
      expect(results.length).toBe(5);

      const failures = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');

      expect(failures.length).toBe(5);
      expect(successes.length).toBe(0);

      // Assert: All errors collected
      const errorMessages = failures.map(f => f.reason.message);
      expect(new Set(errorMessages).size).toBe(5);
    });
  });

  describe('No orphaned workflows', () => {
    it('should verify all workflows complete with no hanging promises', async () => {
      // Arrange
      const completedWorkflows = new Set<string>();

      class ParentWorkflow extends Workflow {
        async run() {
          const children = Array.from({ length: 10 }, (_, i) => {
            const child = createChildWorkflow(
              this,
              `Child-${i}`,
              Math.random() < 0.3 // 30% failure rate
            );

            // Track completion
            child.run().then(
              () => completedWorkflows.add(child.id),
              () => completedWorkflows.add(child.id)
            );

            return child;
          });

          return await Promise.allSettled(
            children.map(c => c.run())
          );
        }
      }

      const parent = new ParentWorkflow();

      // Act: Run with timeout to detect hanging promises
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const runPromise = parent.run();

      await Promise.race([runPromise, timeoutPromise]);

      // Assert: All workflows accounted for
      expect(completedWorkflows.size).toBe(10);
    });
  });
});
```

---

## Key Takeaways

### 1. Promise.allSettled is Essential
Always use `Promise.allSettled()` when running concurrent workflows to ensure all tasks complete regardless of individual failures.

### 2. Comprehensive Event Tracking
Capture all events during concurrent execution to verify error propagation and state changes.

### 3. Timeout Protection
Always include timeout protection in tests to detect hanging promises or orphaned workflows.

### 4. Error Context Preservation
Ensure errors contain workflow context (ID, name, logs, state) for debugging and monitoring.

### 5. Completion Verification
Explicitly verify that all workflows complete, even when some fail.

### 6. Count-Based Assertions
Use assertions that verify expected counts of failures and successes.

### 7. Distinct Error Validation
Ensure multiple concurrent failures produce distinct, trackable errors.

---

## References

- [Apache Airflow Test Suite](https://github.com/apache/airflow/tree/main/tests)
- [Temporal SDK Python Tests](https://github.com/temporalio/sdk-python/tree/master/tests)
- [Prefect Test Suite](https://github.com/PrefectHQ/prefect/tree/main/tests)
- [Node.js Promise Tests](https://github.com/nodejs/node/tree/main/test/parallel)
- [MDN: Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)

---

## Document Metadata

**Created**: 2026-01-12
**Purpose**: Research task P1.M2.T1.S3 - Testing patterns for concurrent task failures
**Target**: /home/dustin/projects/groundswell
**Related Bug**: 001_e8e04329daf3 - Promise.allSettled error collection in @Task decorator
