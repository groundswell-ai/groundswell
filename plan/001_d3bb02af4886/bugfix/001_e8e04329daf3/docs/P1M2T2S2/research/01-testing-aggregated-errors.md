# Testing Aggregated Errors in TypeScript/JavaScript Workflow Engines

**Research Date:** 2026-01-12
**Task:** P1.M2.T2.S2 - Research testing patterns for error aggregation
**Focus:** Testing aggregated errors, Promise.allSettled scenarios, error event emissions

## Table of Contents
1. [Overview](#overview)
2. [Testing Aggregated Errors](#testing-aggregated-errors)
3. [Promise.allSettled Error Patterns](#promiseallsettled-error-patterns)
4. [Error Event Emission Testing](#error-event-emission-testing)
5. [Mock Patterns for Error Scenarios](#mock-patterns-for-error-scenarios)
6. [Assertion Patterns for Complex Error Objects](#assertion-patterns-for-complex-error-objects)
7. [Testing Library Recommendations](#testing-library-recommendations)
8. [Best Practices](#best-practices)

---

## Overview

Error aggregation in workflow engines requires comprehensive testing strategies to ensure:
- All concurrent errors are collected and preserved
- Error context is maintained across workflow hierarchies
- Error events are properly emitted for observability
- Complex error objects are correctly structured
- No workflows are orphaned or left in hanging states

### Key Testing Concepts

1. **Error Collection:** Verify that all errors from concurrent operations are gathered
2. **Error Preservation:** Ensure error details (stack traces, logs, state) are intact
3. **Event Emission:** Confirm error events are emitted with correct structure
4. **Orphan Prevention:** Validate all workflows complete, even when errors occur
5. **Error Merging:** Test custom and default error aggregation strategies

---

## Testing Aggregated Errors

### Basic Error Aggregation Test Pattern

```typescript
import { describe, it, expect } from 'vitest';

describe('Error Aggregation', () => {
  it('should aggregate errors from multiple concurrent workflows', async () => {
    // ARRANGE: Create workflows that will fail
    const errors: Error[] = [];
    const expectedErrors = 3;

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })
      async spawnFailingChildren() {
        return [
          createFailingWorkflow(this, 'Child-1', 'Error 1'),
          createFailingWorkflow(this, 'Child-2', 'Error 2'),
          createFailingWorkflow(this, 'Child-3', 'Error 3'),
        ];
      }

      async run() {
        try {
          await this.spawnFailingChildren();
        } catch (err) {
          errors.push(err as Error);
        }
      }
    }

    const parent = new ParentWorkflow('Parent');

    // ACT: Run the workflow
    await parent.run();

    // ASSERT: Verify error aggregation
    expect(errors.length).toBe(1);
    const aggregatedError = errors[0];

    // Verify error contains aggregated information
    expect(aggregatedError.message).toContain(`${expectedErrors} errors`);
    expect(aggregatedError.message).toContain('Error 1');
    expect(aggregatedError.message).toContain('Error 2');
    expect(aggregatedError.message).toContain('Error 3');
  });
});
```

### Error Aggregation with Custom Merger

```typescript
describe('Custom Error Aggregation', () => {
  it('should use custom error merge function when provided', async () => {
    // ARRANGE: Define custom merge strategy
    const customMerger = (errors: WorkflowError[]): WorkflowError => ({
      message: `Custom merge: ${errors.length} failures`,
      original: errors,
      workflowId: 'merged',
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
          createFailingWorkflow(this, 'A', 'Fail A'),
          createFailingWorkflow(this, 'B', 'Fail B'),
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
    expect(result).toBeDefined();
    expect((result as any).message).toBe('Custom merge: 2 failures');
    expect((result as any).workflowId).toBe('merged');
  });
});
```

### Testing Error Depth Limits

```typescript
describe('Error Aggregation Depth Limits', () => {
  it('should respect maxMergeDepth configuration', async () => {
    // ARRANGE: Create nested workflow failures
    class DeeplyNestedWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          maxMergeDepth: 2  // Only merge 2 levels deep
        }
      })
      async spawnNested() {
        return [
          createFailingWorkflow(this, 'Level1-A', 'Error A'),
          createFailingWorkflow(this, 'Level1-B', 'Error B'),
        ];
      }

      async run() {
        try {
          await this.spawnNested();
        } catch (err) {
          return err;
        }
      }
    }

    const root = new DeeplyNestedWorkflow('Root');

    // ACT
    const result = await root.run();

    // ASSERT: Depth limit enforced
    expect(result).toBeDefined();
    // Verify nested errors are flattened but not infinitely nested
    const hasProperDepth = validateErrorDepth(result, 2);
    expect(hasProperDepth).toBe(true);
  });

  function validateErrorDepth(error: any, maxDepth: number): boolean {
    // Implementation checks error nesting depth
    return true;
  }
});
```

---

## Promise.allSettled Error Patterns

### Basic Promise.allSettled Error Collection

```typescript
describe('Promise.allSettled Error Collection', () => {
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
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(rejected.length).toBe(3);
    expect(rejected[0].reason.message).toBe('Error 1');
    expect(rejected[1].reason.message).toBe('Error 2');
    expect(rejected[2].reason.message).toBe('Error 3');

    // ASSERT: Verify fulfilled promises
    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled'
    );

    expect(fulfilled.length).toBe(1);
    expect(fulfilled[0].value).toBe('success');
  });
});
```

### Concurrent Workflow Execution with allSettled

```typescript
describe('Concurrent Workflow allSettled', () => {
  it('should complete all workflows even when some fail', async () => {
    // ARRANGE: Track all completions
    const completedWorkflows = new Set<string>();
    const failedWorkflows = new Set<string>();

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        const children = [
          createChildWorkflow(this, 'Success-1', false),
          createChildWorkflow(this, 'Fail-1', true),
          createChildWorkflow(this, 'Success-2', false),
          createChildWorkflow(this, 'Fail-2', true),
        ];

        // Track all completions
        children.forEach(child => {
          child.run().then(
            () => completedWorkflows.add(child.id),
            () => {
              failedWorkflows.add(child.id);
              completedWorkflows.add(child.id);
            }
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

    // ASSERT: All workflows completed
    expect(completedWorkflows.size).toBe(4);
    expect(failedWorkflows.size).toBe(2);

    // ASSERT: All children attached
    expect(parent.children.length).toBe(4);
  });
});
```

### Testing Error Order Preservation

```typescript
describe('Error Order Preservation', () => {
  it('should preserve error order from concurrent execution', async () => {
    // ARRANGE: Create workflows with deterministic failure order
    class OrderedFailureWorkflow extends Workflow {
      @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'First', true),
          createChildWorkflow(this, 'Second', true),
          createChildWorkflow(this, 'Third', true),
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

    const parent = new OrderedFailureWorkflow('Parent');

    // ACT
    const result = await parent.run();

    // ASSERT: Errors collected in predictable order
    const errorMessages = extractErrorMessages(result);
    expect(errorMessages).toContain('First failed');
    expect(errorMessages).toContain('Second failed');
    expect(errorMessages).toContain('Third failed');
  });

  function extractErrorMessages(error: any): string[] {
    // Extract all error messages from aggregated error
    return [];
  }
});
```

---

## Error Event Emission Testing

### Setting Up Event Observers

```typescript
describe('Error Event Emission', () => {
  /**
   * Helper to setup event observer for event collection
   * Pattern from: src/__tests__/adversarial/observer-propagation.test.ts
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

  it('should emit error events for all failing workflows', async () => {
    // ARRANGE: Setup event collection
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Good', false),
          createChildWorkflow(this, 'Bad1', true),
          createChildWorkflow(this, 'Bad2', true),
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

    // ASSERT: Error events emitted for both failures
    const errorEvents = events.filter(e => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(2);

    // ASSERT: Each error event has correct structure
    errorEvents.forEach(event => {
      expect(event.type).toBe('error');
      if (event.type === 'error') {
        expect(event.error).toBeDefined();
        expect(event.error.workflowId).toBeDefined();
        expect(event.error.message).toBeDefined();
        expect(Array.isArray(event.error.logs)).toBe(true);
      }
    });
  });
});
```

### Verifying Event Propagation

```typescript
describe('Error Event Propagation', () => {
  it('should propagate error events to parent observers', async () => {
    // ARRANGE: Create workflow hierarchy
    class ChildWorkflow extends Workflow {
      async run() {
        throw new Error('Child error');
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChild() {
        return [new ChildWorkflow('Child', this)];
      }

      async run() {
        try {
          await this.spawnChild();
        } catch (err) {
          // Expected
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    const events: WorkflowEvent[] = [];

    // CRITICAL: Add observer to root workflow
    parent.addObserver({
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    // ACT
    await parent.run();

    // ASSERT: Child error events visible to parent observer
    const childErrorEvents = events.filter(
      e => e.type === 'error' && e.error.workflowId === 'Child'
    );

    expect(childErrorEvents.length).toBeGreaterThan(0);
    expect(childErrorEvents[0]).toMatchObject({
      type: 'error',
      error: expect.objectContaining({
        workflowId: 'Child',
        message: expect.stringContaining('Child error')
      })
    });
  });
});
```

### Testing Event Order

```typescript
describe('Error Event Order', () => {
  it('should emit events in correct chronological order', async () => {
    // ARRANGE
    const eventTimestamps: number[] = [];

    class TimestampTrackingWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Child-1', true),
          createChildWorkflow(this, 'Child-2', true),
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

    const parent = new TimestampTrackingWorkflow('Parent');

    parent.addObserver({
      onLog: () => {},
      onEvent: (e) => {
        eventTimestamps.push(Date.now());
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    // ACT
    await parent.run();

    // ASSERT: Events are in chronological order
    for (let i = 1; i < eventTimestamps.length; i++) {
      expect(eventTimestamps[i]).toBeGreaterThanOrEqual(eventTimestamps[i - 1]);
    }
  });
});
```

---

## Mock Patterns for Error Scenarios

### Error Factory Pattern

```typescript
describe('Mock Error Patterns', () => {
  /**
   * Factory function to create consistent mock errors
   */
  function createMockError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Mock workflow error',
      original: new Error('Original error'),
      workflowId: 'mock-workflow-id',
      stack: 'Error: Original error\n    at mock.js:10:15',
      state: {} as any,
      logs: [
        { id: '1', workflowId: 'mock', timestamp: Date.now(), level: 'error', message: 'Error occurred' }
      ],
      ...overrides
    };
  }

  it('should create consistent mock errors for testing', async () => {
    // ARRANGE: Create mock errors with variations
    const mockErrors = [
      createMockError({ message: 'Error 1', workflowId: 'workflow-1' }),
      createMockError({ message: 'Error 2', workflowId: 'workflow-2' }),
      createMockError({ message: 'Error 3', workflowId: 'workflow-3' }),
    ];

    // ACT: Test error merge with mocks
    const merged = mergeErrors(mockErrors);

    // ASSERT: Verify merge behavior
    expect(merged.message).toContain('3 errors');
    expect(merged.message).toContain('Error 1');
    expect(merged.message).toContain('Error 2');
    expect(merged.message).toContain('Error 3');
  });

  function mergeErrors(errors: WorkflowError[]): WorkflowError {
    return {
      message: `${errors.length} errors: ${errors.map(e => e.message).join(', ')}`,
      original: errors,
      workflowId: 'merged',
      state: {} as any,
      logs: errors.flatMap(e => e.logs),
    };
  }
});
```

### Scenario-Based Error Mocking

```typescript
describe('Scenario-Based Error Mocking', () => {
  /**
   * Enum of common error scenarios
   */
  enum ErrorScenario {
    NETWORK_FAILURE = 'NETWORK_FAILURE',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    TIMEOUT = 'TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
  }

  /**
   * Map of scenarios to mock errors
   */
  const errorScenarios: Record<ErrorScenario, WorkflowError> = {
    [ErrorScenario.NETWORK_FAILURE]: createMockError({
      message: 'Network connection failed',
      workflowId: 'network-task',
    }),
    [ErrorScenario.VALIDATION_ERROR]: createMockError({
      message: 'Validation failed: invalid input',
      workflowId: 'validation-task',
    }),
    [ErrorScenario.TIMEOUT]: createMockError({
      message: 'Operation timed out after 30000ms',
      workflowId: 'timeout-task',
    }),
    [ErrorScenario.PERMISSION_DENIED]: createMockError({
      message: 'Permission denied: insufficient privileges',
      workflowId: 'auth-task',
    }),
  };

  it('should handle different error scenarios correctly', async () => {
    // Test each scenario
    for (const [scenario, error] of Object.entries(errorScenarios)) {
      // ARRANGE: Setup workflow with scenario
      class ScenarioWorkflow extends Workflow {
        async run() {
          throw error;
        }
      }

      const workflow = new ScenarioWorkflow(scenario);

      // ACT & ASSERT: Verify error handling
      await expect(workflow.run()).rejects.toMatchObject({
        message: error.message,
        workflowId: error.workflowId,
      });
    }
  });
});
```

### Spying on Error Handling

```typescript
describe('Error Handling Spies', () => {
  it('should track error handling with spies', async () => {
    // ARRANGE: Setup spies
    const errorHandler = vi.fn();
    const errorMerger = vi.fn((errors: WorkflowError[]) => ({
      message: `Merged: ${errors.length} errors`,
      original: errors,
      workflowId: 'merged',
      state: {} as any,
      logs: [],
    }));

    class SpiedWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorMergeStrategy: {
          enabled: true,
          combine: errorMerger,
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
          errorHandler(err);
          throw err;
        }
      }
    }

    const workflow = new SpiedWorkflow('Spied');

    // ACT
    await expect(workflow.run()).rejects.toThrow();

    // ASSERT: Verify spies called correctly
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorMerger).toHaveBeenCalledTimes(1);
    expect(errorMerger).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.any(String) })
      ])
    );
  });
});
```

---

## Assertion Patterns for Complex Error Objects

### Type Guard Assertions

```typescript
describe('Complex Error Object Assertions', () => {
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

  it('should use type guards for error assertions', async () => {
    // ARRANGE
    class ComplexWorkflow extends Workflow {
      async run() {
        throw new Error('Complex error');
      }
    }

    const workflow = new ComplexWorkflow('Complex');

    // ACT
    try {
      await workflow.run();
      fail('Expected error to be thrown');
    } catch (error) {
      // ASSERT: Use type guard
      if (isWorkflowError(error)) {
        expect(error.message).toBeDefined();
        expect(error.workflowId).toBeDefined();
        expect(Array.isArray(error.logs)).toBe(true);
      } else {
        fail('Error is not a WorkflowError');
      }
    }
  });
});
```

### Partial Object Matching

```typescript
describe('Partial Object Matching', () => {
  it('should match error object properties', async () => {
    // ARRANGE
    class PartialWorkflow extends Workflow {
      @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })
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
          return err;
        }
      }
    }

    const workflow = new PartialWorkflow('Partial');

    // ACT
    const result = await workflow.run();

    // ASSERT: Use matchObject for partial matching
    expect(result).toMatchObject({
      message: expect.stringContaining('2 errors'),
      workflowId: expect.any(String),
      logs: expect.any(Array),
    });

    // ASSERT: Nested object matching
    if (isWorkflowError(result)) {
      expect(result.logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workflowId: expect.any(String),
            level: expect.any(String),
          })
        ])
      );
    }
  });
});
```

### Custom Async Matchers

```typescript
describe('Custom Async Matchers', () => {
  it('should use custom matchers for async error validation', async () => {
    // ARRANGE: Define custom matcher
    const toBeAggregatedError = async (received: any) => {
      const pass = received &&
        typeof received.message === 'string' &&
        received.message.includes('errors') &&
        Array.isArray(received.logs);

      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be an aggregated error`
          : `Expected ${received} to be an aggregated error with message containing 'errors' and logs array`,
      };
    };

    // Add custom matcher to expect
    expect.extend({ toBeAggregatedError });

    class AggregatedWorkflow extends Workflow {
      @Task({ concurrent: true, errorMergeStrategy: { enabled: true } })
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

    const workflow = new AggregatedWorkflow('Aggregated');

    // ACT
    const result = await workflow.run();

    // ASSERT: Use custom matcher
    await expect(result).toBeAggregatedError();
  });
});
```

---

## Testing Library Recommendations

### Vitest (Recommended for This Project)

**Pros:**
- Native ESM support
- Fast execution with worker threads
- Jest-compatible API
- Built-in TypeScript support
- Watch mode with intelligent re-running

**Installation:**
```bash
npm install -D vitest
```

**Configuration:** See `vitest.config.ts` in project root

**Usage:**
```bash
vitest run                    # Run tests once
vitest                        # Watch mode
vitest --coverage             # With coverage
```

### Jest (Alternative)

**Pros:**
- Largest ecosystem of plugins
- Extensive documentation
- Wide community adoption
- Rich mocking capabilities

**Installation:**
```bash
npm install -D jest @types/jest ts-jest
```

**Configuration:**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
};
```

### Library Comparison

| Feature | Vitest | Jest |
|---------|--------|------|
| ESM Support | Native | Requires config |
| Speed | Faster | Slower |
| Watch Mode | Excellent | Good |
| TypeScript | Built-in | Requires ts-jest |
| API | Jest-compatible | Jest API |
| Ecosystem | Growing | Mature |

**Recommendation:** Use Vitest for this project (already configured)

---

## Best Practices

### 1. Test Organization

```typescript
describe('Feature Name', () => {
  describe('Specific Scenario', () => {
    it('should do something specific', async () => {
      // ARRANGE: Setup test data and conditions
      // ACT: Execute the code being tested
      // ASSERT: Verify expected outcomes
    });
  });
});
```

### 2. Descriptive Test Names

```typescript
// Good: Descriptive and clear
it('should aggregate all errors when multiple concurrent workflows fail', async () => {});

// Bad: Vague
it('should work', async () => {});
```

### 3. Isolated Tests

Each test should be independent and not rely on other tests:

```typescript
describe('Isolated Tests', () => {
  it('test 1', async () => {
    const workflow = new Workflow('Test1');  // Fresh instance
    // Test logic
  });

  it('test 2', async () => {
    const workflow = new Workflow('Test2');  // Fresh instance
    // Test logic - doesn't depend on test 1
  });
});
```

### 4. Explicit Assertions

```typescript
// Good: Explicit expectations
expect(result).toBeDefined();
expect(result.errors).toHaveLength(3);
expect(result.errors[0].message).toBe('Error 1');

// Bad: Implicit
expect(result).toBeTruthy();  // Doesn't tell us what's true
```

### 5. Error Testing Patterns

```typescript
// Pattern 1: Try-catch with assertions
try {
  await workflow.run();
  fail('Expected error to be thrown');
} catch (error) {
  expect(error).toMatchObject({ message: 'Expected error' });
}

// Pattern 2: async/await with rejects
await expect(workflow.run()).rejects.toThrow('Expected error');

// Pattern 3: Return error from try-catch
const error = await workflow.run().catch(err => err);
expect(error).toBeDefined();
```

### 6. Cleanup in Tests

```typescript
describe('Cleanup', () => {
  it('should clean up resources', async () => {
    const workflow = new Workflow('Test');
    const observers = setupObservers(workflow);

    try {
      await workflow.run();
    } finally {
      // Cleanup: Remove observers
      observers.forEach(obs => workflow.removeObserver(obs));
    }
  });
});
```

### 7. Testing Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle empty error array', async () => {
    const result = mergeErrors([]);
    expect(result).toMatchObject({ message: '0 errors' });
  });

  it('should handle single error', async () => {
    const result = mergeErrors([singleError]);
    expect(result.message).toContain('1 error');
  });

  it('should handle all workflows failing', async () => {
    // Test when 100% of workflows fail
  });

  it('should handle 50% failure rate', async () => {
    // Test mixed success/failure
  });
});
```

### 8. Performance Testing

```typescript
describe('Performance', () => {
  it('should complete error aggregation within timeout', async () => {
    const startTime = performance.now();

    await workflowWithManyErrors.run();

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000);  // 1 second max
  });
});
```

### 9. Deterministic Tests

```typescript
// Good: Deterministic
it('should handle errors in predictable order', async () => {
  const errors = await workflow.run().catch(err => err);
  expect(errors[0].workflowId).toBe('workflow-1');
});

// Bad: Relies on timing/setTimeout
it('should eventually handle errors', async () => {
  // Don't use arbitrary timeouts
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

### 10. Comprehensive Coverage

```typescript
describe('Comprehensive Error Testing', () => {
  describe('Single error scenarios', () => {
    it('should handle single workflow failure');
    it('should handle single workflow timeout');
    it('should handle single workflow rejection');
  });

  describe('Multiple error scenarios', () => {
    it('should handle 2 concurrent failures');
    it('should handle 5 concurrent failures');
    it('should handle 10+ concurrent failures');
  });

  describe('Mixed scenarios', () => {
    it('should handle 1 failure + 1 success');
    it('should handle 2 failures + 3 successes');
    it('should handle 50% failure rate');
  });

  describe('Edge cases', () => {
    it('should handle 0 errors');
    it('should handle all errors');
    it('should handle deeply nested errors');
  });
});
```

---

## Additional Resources

### Project-Specific Patterns
- **Concurrent Task Failures Test:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`
- **Observer Propagation Test:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/observer-propagation.test.ts`
- **Task Decorator Implementation:** `/home/dustin/projects/groundswell/src/decorators/task.ts`

### External Documentation
- **Vitest Documentation:** https://vitest.dev/guide/
- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Promise.allSettled MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

---

## Summary

This research document provides comprehensive patterns for testing error aggregation in TypeScript/JavaScript workflow engines, focusing on:

1. **Aggregated Error Testing:** Multiple patterns for testing error collection and merging
2. **Promise.allSettled Patterns:** Ensuring all workflows complete despite failures
3. **Event Emission Testing:** Verifying error events are properly emitted and propagated
4. **Mock Patterns:** Factory functions, scenario-based mocking, and spying
5. **Assertion Patterns:** Type guards, partial matching, and custom matchers
6. **Library Recommendations:** Vitest (recommended) vs Jest comparison
7. **Best Practices:** Organization, naming, isolation, cleanup, and edge cases

These patterns can be directly applied to implementing tests for the ErrorMergeStrategy functionality (P1.M2.T2) in the groundswell project.
