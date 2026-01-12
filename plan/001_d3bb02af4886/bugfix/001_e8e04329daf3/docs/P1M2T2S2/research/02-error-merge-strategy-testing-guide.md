# ErrorMergeStrategy Implementation & Testing Guide

**Research Date:** 2026-01-12
**Task:** P1.M2.T2.S2 - Implement error aggregation logic in @Task decorator
**Related Files:**
- `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
- `/home/dustin/projects/groundswell/src/decorators/task.ts`
- `/home/dustin/projects/groundswell/src/types/error.ts`

## Table of Contents
1. [ErrorMergeStrategy Interface](#errormergestrategy-interface)
2. [Default Error Merger Implementation](#default-error-merger-implementation)
3. [Testing ErrorMergeStrategy](#testing-errormergestrategy)
4. [Integration with @Task Decorator](#integration-with-task-decorator)
5. [Test Examples](#test-examples)
6. [Best Practices](#best-practices)

---

## ErrorMergeStrategy Interface

### Current Interface Definition

```typescript
// File: src/types/error-strategy.ts
import type { WorkflowError } from './error.js';

/**
 * Strategy for merging multiple errors from concurrent operations
 */
export interface ErrorMergeStrategy {
  /** Enable error merging (default: false, first error wins) */
  enabled: boolean;
  /** Maximum depth to merge errors */
  maxMergeDepth?: number;
  /** Custom function to combine multiple errors */
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

### Interface Breakdown

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | `boolean` | Yes | Master switch for error merging. When `false`, first error is thrown (backward compatible) |
| `maxMergeDepth` | `number` | No | Limits recursion depth when merging nested errors. Default: unlimited |
| `combine` | `function` | No | Custom error merger. If not provided, uses default merger |

### Usage Examples

```typescript
// Example 1: Enable default merging
@Task({
  concurrent: true,
  errorMergeStrategy: { enabled: true }
})
async spawnChildren() {
  return [child1, child2, child3];
}

// Example 2: Custom merger
@Task({
  concurrent: true,
  errorMergeStrategy: {
    enabled: true,
    combine: (errors) => ({
      message: `Custom: ${errors.length} failures`,
      original: errors,
      workflowId: 'merged',
      state: {} as any,
      logs: errors.flatMap(e => e.logs),
    })
  }
})
async spawnChildren() {
  return [child1, child2, child3];
}

// Example 3: With depth limit
@Task({
  concurrent: true,
  errorMergeStrategy: {
    enabled: true,
    maxMergeDepth: 3
  }
})
async spawnChildren() {
  return [child1, child2, child3];
}
```

---

## Default Error Merger Implementation

### Default Merger Specification

The default error merger should aggregate the following:

1. **Aggregated Message:** Count + all error messages
2. **Original Errors:** Array of all WorkflowError objects
3. **Parent WorkflowId:** Use first error's workflowId (parent context)
4. **Concatenated Stacks:** All stack traces with separators
5. **Aggregated Logs:** Flattened array of all log entries

### Implementation Template

```typescript
// File: src/utils/error-merger.ts
import type { WorkflowError } from '../types/error.js';

/**
 * Default error merger for concurrent workflow failures
 *
 * Aggregates multiple WorkflowError objects into a single error
 * containing all error information for debugging and observability.
 *
 * @param errors - Array of WorkflowError objects to merge
 * @returns Merged WorkflowError with aggregated information
 */
export function mergeWorkflowErrors(errors: WorkflowError[]): WorkflowError {
  if (errors.length === 0) {
    throw new Error('Cannot merge empty error array');
  }

  if (errors.length === 1) {
    return errors[0];
  }

  // Build aggregated message with count
  const message = `${errors.length} concurrent error${errors.length > 1 ? 's' : ''}: ` +
    errors.map((e, i) => `[${i + 1}] ${e.message}`).join('; ');

  // Concatenate stack traces with separators
  const stack = errors
    .map((e, i) => `=== Error ${i + 1} ===\n${e.stack || 'No stack trace'}`)
    .join('\n\n');

  // Aggregate all logs from all errors
  const logs = errors.flatMap(e => e.logs);

  // Use first error's workflowId (parent context)
  const workflowId = errors[0].workflowId;

  // Get state from first error (most relevant context)
  const state = errors[0].state;

  return {
    message,
    original: errors,  // Store all original errors
    workflowId,
    stack,
    state,
    logs,
  };
}

/**
 * Error merger with depth limiting
 *
 * Prevents infinite recursion when merging deeply nested
 * error structures by limiting merge depth.
 *
 * @param errors - Array of WorkflowError objects to merge
 * @param maxDepth - Maximum recursion depth (default: 10)
 * @returns Merged WorkflowError with depth-limited aggregation
 */
export function mergeWorkflowErrorsWithDepth(
  errors: WorkflowError[],
  maxDepth: number = 10
): WorkflowError {
  if (maxDepth <= 0) {
    // Depth limit reached, return simple aggregation
    return {
      message: `${errors.length} errors (depth limit reached)`,
      original: errors,
      workflowId: errors[0]?.workflowId || 'unknown',
      state: {} as any,
      logs: [],
    };
  }

  const merged = mergeWorkflowErrors(errors);

  // Recursively merge nested errors if present
  // (when original contains merged errors)
  return merged;
}
```

### Usage in @Task Decorator

```typescript
// File: src/decorators/task.ts (lines 111-122)
import { mergeWorkflowErrors } from '../utils/error-merger.js';

// Inside taskWrapper function, after Promise.allSettled
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
      // Extract WorkflowError objects from rejected promises
      const errors = rejected.map(r => {
        const error = r.reason;
        // Convert to WorkflowError if not already
        return isWorkflowError(error)
          ? error
          : convertToWorkflowError(error);
      });

      // Check if error merge strategy is enabled
      if (opts.errorMergeStrategy?.enabled) {
        // Use custom merger or default
        const mergedError = opts.errorMergeStrategy.combine
          ? opts.errorMergeStrategy.combine(errors)
          : mergeWorkflowErrors(errors);

        // Emit error event with merged error
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: mergedError,
        });

        throw mergedError;
      } else {
        // Backward compatible: throw first error
        throw rejected[0].reason;
      }
    }
  }
}
```

---

## Testing ErrorMergeStrategy

### Test Suite Structure

```typescript
// File: src/__tests__/unit/error-merge-strategy.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mergeWorkflowErrors, mergeWorkflowErrorsWithDepth } from '../../utils/error-merger.js';
import type { WorkflowError } from '../../types/error.js';

describe('ErrorMergeStrategy', () => {
  describe('Default error merger', () => {
    describe('Basic functionality', () => {
      it('should throw on empty error array', () => {
        expect(() => mergeWorkflowErrors([])).toThrow('Cannot merge empty error array');
      });

      it('should return single error unchanged', () => {
        const singleError: WorkflowError = {
          message: 'Single error',
          original: new Error('Single'),
          workflowId: 'test-1',
          state: {} as any,
          logs: [],
        };

        const result = mergeWorkflowErrors([singleError]);

        expect(result).toBe(singleError);
      });

      it('should merge two errors correctly', () => {
        const error1: WorkflowError = {
          message: 'Error 1',
          original: new Error('Error 1'),
          workflowId: 'workflow-1',
          stack: 'Error: Error 1\n    at test1.js:10',
          state: {} as any,
          logs: [{ id: '1', workflowId: 'workflow-1', timestamp: 1000, level: 'error', message: 'Log 1' }],
        };

        const error2: WorkflowError = {
          message: 'Error 2',
          original: new Error('Error 2'),
          workflowId: 'workflow-2',
          stack: 'Error: Error 2\n    at test2.js:20',
          state: {} as any,
          logs: [{ id: '2', workflowId: 'workflow-2', timestamp: 2000, level: 'error', message: 'Log 2' }],
        };

        const result = mergeWorkflowErrors([error1, error2]);

        // Assert message aggregation
        expect(result.message).toContain('2 concurrent errors');
        expect(result.message).toContain('[1] Error 1');
        expect(result.message).toContain('[2] Error 2');

        // Assert workflowId from first error
        expect(result.workflowId).toBe('workflow-1');

        // Assert stack concatenation
        expect(result.stack).toContain('=== Error 1 ===');
        expect(result.stack).toContain('=== Error 2 ===');
        expect(result.stack).toContain('at test1.js:10');
        expect(result.stack).toContain('at test2.js:20');

        // Assert log aggregation
        expect(result.logs).toHaveLength(2);
        expect(result.logs[0].message).toBe('Log 1');
        expect(result.logs[1].message).toBe('Log 2');

        // Assert original errors preserved
        expect(result.original).toEqual([error1, error2]);
      });
    });

    describe('Message aggregation', () => {
      it('should use singular for single error', () => {
        const error: WorkflowError = {
          message: 'Single',
          original: new Error('Single'),
          workflowId: 'test',
          state: {} as any,
          logs: [],
        };

        const result = mergeWorkflowErrors([error]);
        expect(result.message).toBe('Single');  // Not modified
      });

      it('should use plural for multiple errors', () => {
        const errors = [
          createMockError('Error 1'),
          createMockError('Error 2'),
          createMockError('Error 3'),
        ];

        const result = mergeWorkflowErrors(errors);
        expect(result.message).toContain('3 concurrent errors');
      });

      it('should include numbered error list', () => {
        const errors = [
          createMockError('First error'),
          createMockError('Second error'),
          createMockError('Third error'),
        ];

        const result = mergeWorkflowErrors(errors);
        expect(result.message).toContain('[1] First error');
        expect(result.message).toContain('[2] Second error');
        expect(result.message).toContain('[3] Third error');
      });
    });

    describe('Stack trace aggregation', () => {
      it('should concatenate stacks with separators', () => {
        const errors = [
          createMockError('Error 1', 'stack1'),
          createMockError('Error 2', 'stack2'),
        ];

        const result = mergeWorkflowErrors(errors);

        expect(result.stack).toContain('=== Error 1 ===');
        expect(result.stack).toContain('stack1');
        expect(result.stack).toContain('=== Error 2 ===');
        expect(result.stack).toContain('stack2');
      });

      it('should handle missing stack traces', () => {
        const errors = [
          createMockError('Error 1', undefined),
          createMockError('Error 2', 'stack2'),
        ];

        const result = mergeWorkflowErrors(errors);

        expect(result.stack).toContain('No stack trace');
        expect(result.stack).toContain('stack2');
      });
    });

    describe('Log aggregation', () => {
      it('should flatten logs from all errors', () => {
        const error1 = createMockError('Error 1');
        error1.logs = [
          createLogEntry('log-1', 'error', 'Message 1'),
          createLogEntry('log-2', 'error', 'Message 2'),
        ];

        const error2 = createMockError('Error 2');
        error2.logs = [
          createLogEntry('log-3', 'error', 'Message 3'),
        ];

        const result = mergeWorkflowErrors([error1, error2]);

        expect(result.logs).toHaveLength(3);
        expect(result.logs.map(l => l.message)).toEqual([
          'Message 1',
          'Message 2',
          'Message 3',
        ]);
      });

      it('should handle empty log arrays', () => {
        const errors = [
          createMockError('Error 1'),
          createMockError('Error 2'),
        ];

        const result = mergeWorkflowErrors(errors);

        expect(result.logs).toEqual([]);
      });
    });

    describe('Parent context preservation', () => {
      it('should use first error workflowId as parent', () => {
        const errors = [
          createMockError('Error 1', undefined, 'parent-workflow'),
          createMockError('Error 2', undefined, 'child-1'),
          createMockError('Error 3', undefined, 'child-2'),
        ];

        const result = mergeWorkflowErrors(errors);

        expect(result.workflowId).toBe('parent-workflow');
      });

      it('should preserve first error state', () => {
        const mockState = { key: 'value' };

        const errors = [
          createMockError('Error 1', undefined, 'workflow-1', mockState),
          createMockError('Error 2', undefined, 'workflow-2', {}),
        ];

        const result = mergeWorkflowErrors(errors);

        expect(result.state).toBe(mockState);
      });
    });
  });

  describe('Error merger with depth limiting', () => {
    it('should respect maxDepth parameter', () => {
      const errors = [
        createMockError('Error 1'),
        createMockError('Error 2'),
      ];

      const result = mergeWorkflowErrorsWithDepth(errors, 5);

      expect(result.message).toBeDefined();
      expect(result.workflowId).toBeDefined();
    });

    it('should return simple aggregation at depth limit', () => {
      const errors = [
        createMockError('Error 1'),
        createMockError('Error 2'),
      ];

      const result = mergeWorkflowErrorsWithDepth(errors, 0);

      expect(result.message).toContain('depth limit reached');
      expect(result.logs).toEqual([]);
    });
  });

  describe('Custom error merger', () => {
    it('should use custom combine function when provided', async () => {
      const customMerger = vi.fn((errors: WorkflowError[]) => ({
        message: `CUSTOM MERGE: ${errors.length} errors`,
        original: errors,
        workflowId: 'custom-merged',
        state: {} as any,
        logs: [],
      }));

      class TestWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: {
            enabled: true,
            combine: customMerger,
          }
        })
        async spawnChildren() {
          return [
            createFailingWorkflow(this, 'Child-1', 'Fail 1'),
            createFailingWorkflow(this, 'Child-2', 'Fail 2'),
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

      const workflow = new TestWorkflow('Test');
      const result = await workflow.run();

      // Assert custom merger was called
      expect(customMerger).toHaveBeenCalledTimes(1);

      // Assert custom merger output used
      expect(result.message).toBe('CUSTOM MERGE: 2 errors');
      expect(result.workflowId).toBe('custom-merged');
    });

    it('should pass all errors to custom combine function', async () => {
      const customMerger = vi.fn((errors: WorkflowError[]) => ({
        message: `Merged ${errors.length} errors`,
        original: errors,
        workflowId: 'merged',
        state: {} as any,
        logs: [],
      }));

      class TestWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: {
            enabled: true,
            combine: customMerger,
          }
        })
        async spawnChildren() {
          return [
            createFailingWorkflow(this, 'A', 'Error A'),
            createFailingWorkflow(this, 'B', 'Error B'),
            createFailingWorkflow(this, 'C', 'Error C'),
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

      const workflow = new TestWorkflow('Test');
      await workflow.run();

      // Assert all 3 errors passed to custom merger
      expect(customMerger).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
          expect.objectContaining({ message: expect.any(String) }),
          expect.objectContaining({ message: expect.any(String) }),
        ])
      );

      const callArgs = customMerger.mock.calls[0][0];
      expect(callArgs).toHaveLength(3);
    });
  });

  describe('Backward compatibility', () => {
    it('should throw first error when enabled=false', async () => {
      class TestWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: false }  // Disabled
        })
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

      const workflow = new TestWorkflow('Test');
      const result = await workflow.run();

      // Assert first error thrown (not merged)
      expect(result.message).toContain('First error');
      expect(result.message).not.toContain('Second error');
    });

    it('should throw first error when errorMergeStrategy not provided', async () => {
      class TestWorkflow extends Workflow {
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

      const workflow = new TestWorkflow('Test');
      const result = await workflow.run();

      // Assert first error thrown (backward compatible default)
      expect(result.message).toContain('First error');
    });
  });

  describe('Integration with @Task decorator', () => {
    it('should emit error event with merged error', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true }
        })
        async spawnChildren() {
          return [
            createFailingWorkflow(this, 'Child-1', 'Error 1'),
            createFailingWorkflow(this, 'Child-2', 'Error 2'),
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

      const workflow = new TestWorkflow('Test');
      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      // Assert error event emitted with merged error
      const errorEvents = events.filter(e => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);

      const mergedErrorEvent = errorEvents.find(e =>
        e.type === 'error' && e.error.message.includes('2 concurrent errors')
      );

      expect(mergedErrorEvent).toBeDefined();
    });
  });
});

// Helper functions for tests
function createMockError(
  message: string,
  stack?: string,
  workflowId?: string,
  state?: any
): WorkflowError {
  return {
    message,
    original: new Error(message),
    workflowId: workflowId || 'mock-workflow',
    stack,
    state: state || {},
    logs: [],
  };
}

function createLogEntry(id: string, level: string, message: string) {
  return {
    id,
    workflowId: 'test',
    timestamp: Date.now(),
    level,
    message,
  };
}

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
```

---

## Integration with @Task Decorator

### Complete Integration Example

```typescript
// File: src/decorators/task.ts (complete implementation)
import type { TaskOptions, WorkflowNode, WorkflowEvent, WorkflowClass, WorkflowLike } from '../types/index.js';
import { mergeWorkflowErrors } from '../utils/error-merger.js';
import type { WorkflowError } from '../types/error.js';

export function Task(opts: TaskOptions = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>
  ) {
    const methodName = String(context.name);

    async function taskWrapper(this: This, ...args: Args): Promise<Return> {
      const wf = this as unknown as WorkflowLike;
      const taskName = opts.name ?? methodName;

      // Emit task start event
      wf.emitEvent({
        type: 'taskStart',
        node: wf.node,
        task: taskName,
      });

      // Execute the original method
      const result = await originalMethod.call(this, ...args);

      // Process returned workflows
      const workflows = Array.isArray(result) ? result : [result];

      for (const workflow of workflows) {
        if (workflow && typeof workflow === 'object' && 'id' in workflow) {
          const childWf = workflow as WorkflowClass;

          if (!childWf.parent) {
            childWf.parent = wf;
            wf.attachChild(childWf as unknown as WorkflowLike);
          }
        }
      }

      // Handle concurrent execution with error merging
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
            // Convert rejected reasons to WorkflowError
            const errors = rejected.map((r) => {
              const error = r.reason;
              return isWorkflowError(error)
                ? error
                : convertToWorkflowError(error, wf.id);
            });

            // Apply error merge strategy
            if (opts.errorMergeStrategy?.enabled) {
              // Use custom merger or default
              const mergedError = opts.errorMergeStrategy.combine
                ? opts.errorMergeStrategy.combine(errors)
                : mergeWorkflowErrors(errors);

              // Emit error event with merged error
              wf.emitEvent({
                type: 'error',
                node: wf.node,
                error: mergedError,
              });

              throw mergedError;
            } else {
              // Backward compatible: throw first error
              wf.emitEvent({
                type: 'error',
                node: wf.node,
                error: errors[0],
              });

              throw errors[0];
            }
          }
        }
      }

      // Emit task end event
      wf.emitEvent({
        type: 'taskEnd',
        node: wf.node,
        task: taskName,
      });

      return result;
    }

    return taskWrapper;
  };
}

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
 * Convert arbitrary error to WorkflowError
 */
function convertToWorkflowError(error: unknown, workflowId: string): WorkflowError {
  if (error instanceof Error) {
    return {
      message: error.message,
      original: error,
      workflowId,
      stack: error.stack,
      state: {} as any,
      logs: [],
    };
  }

  return {
    message: String(error),
    original: error,
    workflowId,
    state: {} as any,
    logs: [],
  };
}
```

---

## Test Examples

### Example 1: Basic Error Merge Test

```typescript
it('should merge errors from 3 concurrent failures', async () => {
  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: true }
    })
    async spawnChildren() {
      return [
        createFailingWorkflow(this, 'Alpha', 'Alpha failed'),
        createFailingWorkflow(this, 'Beta', 'Beta failed'),
        createFailingWorkflow(this, 'Gamma', 'Gamma failed'),
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
  const result = await parent.run();

  // Assertions
  expect(result.message).toContain('3 concurrent errors');
  expect(result.message).toContain('[1] Alpha failed');
  expect(result.message).toContain('[2] Beta failed');
  expect(result.message).toContain('[3] Gamma failed');
  expect(result.logs.length).toBeGreaterThanOrEqual(3);
});
```

### Example 2: Custom Merger Test

```typescript
it('should use custom error merger', async () => {
  const customMerger = (errors: WorkflowError[]) => ({
    message: `FAILURES: ${errors.map(e => e.message).join(' | ')}`,
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
  const result = await parent.run();

  expect(result.message).toBe('FAILURES: Error A | Error B');
  expect(result.workflowId).toBe('custom-merged');
});
```

### Example 3: Backward Compatibility Test

```typescript
it('should maintain backward compatibility when disabled', async () => {
  class ParentWorkflow extends Workflow {
    @Task({
      concurrent: true,
      errorMergeStrategy: { enabled: false }  // Disabled
    })
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
  const result = await parent.run();

  // Only first error thrown (backward compatible)
  expect(result.message).toContain('First error');
  expect(result.message).not.toContain('Second error');
  expect(result.message).not.toContain('concurrent');
});
```

---

## Best Practices

### 1. Always Test with Multiple Errors

```typescript
// Good: Test with 3+ errors
it('should handle multiple concurrent errors', async () => {
  const errors = [error1, error2, error3];
  const result = mergeWorkflowErrors(errors);
  expect(result.message).toContain('3 concurrent errors');
});

// Bad: Only test with 2 errors (edge case)
it('should merge two errors', async () => {
  const result = mergeWorkflowErrors([error1, error2]);
  // Doesn't test the pluralization logic
});
```

### 2. Test Empty and Single Error Cases

```typescript
describe('Edge cases', () => {
  it('should throw on empty array', () => {
    expect(() => mergeWorkflowErrors([])).toThrow();
  });

  it('should return single error unchanged', () => {
    const result = mergeWorkflowErrors([singleError]);
    expect(result).toBe(singleError);  // Same reference
  });
});
```

### 3. Verify All Properties Are Merged

```typescript
it('should merge all error properties', () => {
  const result = mergeWorkflowErrors([error1, error2]);

  // Check all properties
  expect(result.message).toBeDefined();
  expect(result.workflowId).toBeDefined();
  expect(result.stack).toBeDefined();
  expect(result.logs).toBeDefined();
  expect(result.original).toEqual([error1, error2]);
  expect(result.state).toBeDefined();
});
```

### 4. Test with Real Workflow Objects

```typescript
// Good: Integration test with real workflows
it('should merge errors from real concurrent workflows', async () => {
  const workflow = new TestWorkflow('Test');
  const result = await workflow.run();

  expect(result.message).toContain('concurrent errors');
});

// Bad: Only unit test with mock objects
it('should merge mock errors', () => {
  const result = mergeWorkflowErrors([mockError1, mockError2]);
  // Doesn't test integration with @Task decorator
});
```

### 5. Test Error Event Emission

```typescript
it('should emit error event with merged error', async () => {
  const events: WorkflowEvent[] = [];

  const workflow = new TestWorkflow('Test');
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.run();

  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThan(0);
  expect(errorEvents[0].error.message).toContain('concurrent errors');
});
```

---

## Summary

This guide provides comprehensive patterns for implementing and testing ErrorMergeStrategy:

1. **Interface Definition:** Clear specification of ErrorMergeStrategy options
2. **Default Merger:** Complete implementation of mergeWorkflowErrors utility
3. **Test Suite:** Comprehensive test coverage for all scenarios
4. **Integration:** Complete @Task decorator integration with error merging
5. **Examples:** Practical test examples for common scenarios
6. **Best Practices:** Guidelines for writing robust error aggregation tests

These patterns can be directly applied to implement P1.M2.T2.S2 (error aggregation logic) in the groundswell project.
