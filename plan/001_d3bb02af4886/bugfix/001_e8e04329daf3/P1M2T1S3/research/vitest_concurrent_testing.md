# Vitest Concurrent Testing Research for Promise.allSettled

**Research Date:** 2026-01-12
**Status:** Vitest Testing Patterns Research
**Target:** P1.M2.T1.S3 - Testing Promise.allSettled Implementation

---

## Table of Contents

1. [Official Vitest Documentation](#1-official-vitest-documentation)
2. [Async Testing Patterns in Vitest](#2-async-testing-patterns-in-vitest)
3. [Promise.allSettled Testing Patterns](#3-promiseallsettled-testing-patterns)
4. [Error Handling and Collection Testing](#4-error-handling-and-collection-testing)
5. [Concurrent Operations Testing](#5-concurrent-operations-testing)
6. [Event Emission Verification](#6-event-emission-verification)
7. [Best Practices Summary](#7-best-practices-summary)
8. [Real-World Patterns from Groundswell](#8-real-world-patterns-from-groundswell)

---

## 1. Official Vitest Documentation

### Primary Resources

**Main Documentation**
- URL: https://vitest.dev
- Coverage: Async testing, assertions, mocking, test organization

**API Reference**
- URL: https://vitest.dev/api/
- Coverage: Complete API reference for all vitest functions

**Async Testing Guide**
- URL: https://vitest.dev/guide/async.html
- Coverage: Async/await patterns, promise testing, timeouts

**Mocking Guide**
- URL: https://vitest.dev/guide/mocking.html
- Coverage: Mock functions, spies, timers, modules

**Expect API**
- URL: https://vitest.dev/api/expect.html
- Coverage: All assertion methods including `.resolves` and `.rejects`

### Key Vitest Features for Concurrent Testing

1. **Native Async/Await Support**: First-class async/await in tests
2. **Promise Assertions**: `.resolves` and `.rejects` modifiers
3. **Mock Functions**: `vi.fn()`, `vi.spyOn()`, `vi.mocked()`
4. **Test Isolation**: Each test runs in isolated context
5. **Concurrent Test Execution**: `test.concurrent()` for parallel test runs

---

## 2. Async Testing Patterns in Vitest

### 2.1 Basic Async Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Async operations', () => {
  it('should handle async/await', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  it('should handle promises', () => {
    return fetchData().then(result => {
      expect(result).toBeDefined();
    });
  });
});
```

### 2.2 Promise Resolution Testing

```typescript
describe('Promise resolution', () => {
  it('should resolve successfully', async () => {
    await expect(Promise.resolve('success')).resolves.toBe('success');
  });

  it('should reject with error', async () => {
    await expect(Promise.reject(new Error('failure'))).rejects.toThrow('failure');
  });

  it('should match error shape', async () => {
    await expect(Promise.reject({ message: 'error', code: 500 }))
      .rejects.toMatchObject({
        message: 'error',
        code: 500
      });
  });
});
```

### 2.3 Multiple Async Operations

```typescript
describe('Multiple async operations', () => {
  it('should complete multiple operations', async () => {
    const results = await Promise.all([
      fetchItem(1),
      fetchItem(2),
      fetchItem(3)
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]).toBeDefined();
  });

  it('should handle mixed success/failure with allSettled', async () => {
    const results = await Promise.allSettled([
      Promise.resolve('success'),
      Promise.reject(new Error('failure')),
      Promise.resolve(42)
    ]);

    expect(results).toHaveLength(3);
  });
});
```

---

## 3. Promise.allSettled Testing Patterns

### 3.1 Basic Promise.allSettled Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('Promise.allSettled basics', () => {
  it('should return all results regardless of fulfillment', async () => {
    const promises = [
      Promise.resolve('success'),
      Promise.reject(new Error('failure')),
      Promise.resolve(42)
    ];

    const results = await Promise.allSettled(promises);

    expect(results).toHaveLength(3);
  });

  it('should contain status for each result', async () => {
    const results = await Promise.allSettled([
      Promise.resolve('value'),
      Promise.reject(new Error('error'))
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });
});
```

### 3.2 Type-Safe Result Testing

```typescript
describe('Type-safe Promise.allSettled testing', () => {
  it('should handle fulfilled results with type guard', async () => {
    const results = await Promise.allSettled([
      Promise.resolve('success'),
      Promise.resolve(42)
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled'
    );

    expect(fulfilled).toHaveLength(2);
    expect(fulfilled[0].value).toBe('success');
    expect(fulfilled[1].value).toBe(42);
  });

  it('should handle rejected results with type guard', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('error1')),
      Promise.reject(new Error('error2'))
    ]);

    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(rejected).toHaveLength(2);
    expect(rejected[0].reason).toBeInstanceOf(Error);
    expect(rejected[0].reason.message).toBe('error1');
  });
});
```

### 3.3 Counting Success vs Failure

```typescript
describe('Counting results from Promise.allSettled', () => {
  it('should count successful operations', async () => {
    const results = await Promise.allSettled([
      Promise.resolve('a'),
      Promise.reject(new Error('b')),
      Promise.resolve('c'),
      Promise.reject(new Error('d'))
    ]);

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful).toHaveLength(2);
    expect(failed).toHaveLength(2);
  });

  it('should calculate success rate', async () => {
    const results = await Promise.allSettled([
      Promise.resolve('a'),
      Promise.reject(new Error('b')),
      Promise.resolve('c')
    ]);

    const successRate = results.filter(r => r.status === 'fulfilled').length / results.length;

    expect(successRate).toBeCloseTo(0.667, 2);
  });
});
```

---

## 4. Error Handling and Collection Testing

### 4.1 Error Aggregation Testing

```typescript
describe('Error aggregation with Promise.allSettled', () => {
  it('should collect all errors from rejected promises', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('Error 1')),
      Promise.resolve('success'),
      Promise.reject(new Error('Error 2'))
    ]);

    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason);

    expect(errors).toHaveLength(2);
    expect(errors[0].message).toBe('Error 1');
    expect(errors[1].message).toBe('Error 2');
  });

  it('should preserve error stack traces', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('Stack trace test'))
    ]);

    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;

    expect(rejected.reason.stack).toBeDefined();
    expect(rejected.reason.stack).toContain('Stack trace test');
  });
});
```

### 4.2 Error Message Validation

```typescript
describe('Error message validation', () => {
  it('should validate error messages', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('Validation failed')),
      Promise.reject(new Error('Network error'))
    ]);

    const errorMessages = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason.message);

    expect(errorMessages).toContain('Validation failed');
    expect(errorMessages).toContain('Network error');
  });

  it('should match error patterns', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('Error: Code 500')),
      Promise.reject(new Error('Error: Code 404'))
    ]);

    const errorMessages = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason.message);

    errorMessages.forEach(msg => {
      expect(msg).toMatch(/^Error: Code \d+$/);
    });
  });
});
```

### 4.3 Custom Error Objects

```typescript
interface WorkflowError {
  message: string;
  workflowId: string;
  code?: number;
}

describe('Custom error handling', () => {
  it('should handle custom error objects', async () => {
    const errors: WorkflowError[] = [
      { message: 'Task failed', workflowId: 'wf-1', code: 500 },
      { message: 'Timeout', workflowId: 'wf-2' }
    ];

    const results = await Promise.allSettled(
      errors.map(e => Promise.reject(e))
    );

    const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

    expect(rejected[0].reason).toMatchObject({
      message: 'Task failed',
      workflowId: 'wf-1'
    });
  });
});
```

---

## 5. Concurrent Operations Testing

### 5.1 Testing Concurrent Execution

```typescript
describe('Concurrent operations', () => {
  it('should execute operations concurrently', async () => {
    let operation1Complete = false;
    let operation2Complete = false;

    const results = await Promise.allSettled([
      (async () => {
        await delay(100);
        operation1Complete = true;
        return 'op1';
      })(),
      (async () => {
        await delay(50);
        operation2Complete = true;
        return 'op2';
      })()
    ]);

    // Both should complete despite different delays
    expect(operation1Complete).toBe(true);
    expect(operation2Complete).toBe(true);
    expect(results).toHaveLength(2);
  });
});
```

### 5.2 Testing Ordering Guarantees

```typescript
describe('Result ordering with Promise.allSettled', () => {
  it('should maintain input order regardless of completion time', async () => {
    const results = await Promise.allSettled([
      delay(100).then(() => 'first'),
      delay(10).then(() => 'second'),
      delay(50).then(() => 'third')
    ]);

    const values = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<string>).value);

    expect(values).toEqual(['first', 'second', 'third']);
  });
});
```

### 5.3 Testing Race Conditions

```typescript
describe('Race condition testing', () => {
  it('should handle concurrent modifications safely', async () => {
    const counter = { value: 0 };
    const operations = 10;

    const results = await Promise.allSettled(
      Array.from({ length: operations }, (_, i) =>
        Promise.resolve().then(() => {
          counter.value += 1;
          return i;
        })
      )
    );

    expect(counter.value).toBe(operations);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(operations);
  });
});
```

---

## 6. Event Emission Verification

### 6.1 Testing Event Collection

```typescript
describe('Event emission verification', () => {
  it('should collect events from concurrent operations', async () => {
    const events: string[] = [];

    const results = await Promise.allSettled([
      emitEvent('start', events),
      emitEvent('middle', events),
      emitEvent('end', events)
    ]);

    expect(events).toHaveLength(3);
    expect(events).toContain('start');
    expect(events).toContain('middle');
    expect(events).toContain('end');
  });
});

async function emitEvent(name: string, events: string[]): Promise<void> {
  await Promise.resolve();
  events.push(name);
}
```

### 6.2 Verifying Event Ordering

```typescript
describe('Event ordering verification', () => {
  it('should maintain event order across concurrent operations', async () => {
    const events: { timestamp: number; name: string }[] = [];

    await Promise.allSettled([
      recordEvent('event1', events),
      recordEvent('event2', events),
      recordEvent('event3', events)
    ]);

    // Verify events were recorded in order
    const timestamps = events.map(e => e.timestamp);
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    expect(timestamps).toEqual(sortedTimestamps);
  });
});

async function recordEvent(name: string, events: any[]): Promise<void> {
  events.push({ timestamp: Date.now(), name });
  await Promise.resolve();
}
```

### 6.3 Error Event Verification

```typescript
describe('Error event verification', () => {
  it('should emit error events for failed operations', async () => {
    const errorEvents: Error[] = [];

    const results = await Promise.allSettled([
      Promise.resolve('success'),
      Promise.reject(new Error('Operation failed')).catch(e => {
        errorEvents.push(e);
        throw e;
      })
    ]);

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].message).toBe('Operation failed');
  });
});
```

---

## 7. Best Practices Summary

### 7.1 Test Organization

1. **Group related tests with `describe` blocks**
   - Organize by feature or functionality
   - Use nested describes for hierarchical testing

2. **Use descriptive test names**
   - Test names should describe what is being tested
   - Include the expected outcome

3. **Follow AAA pattern** (Arrange, Act, Assert)
   ```typescript
   it('should handle error correctly', async () => {
     // Arrange
     const error = new Error('Test error');

     // Act
     const result = await Promise.allSettled([
       Promise.reject(error)
     ]);

     // Assert
     expect(result[0].status).toBe('rejected');
   });
   ```

### 7.2 Async Testing Best Practices

1. **Always use async/await for async operations**
   ```typescript
   it('good - using async/await', async () => {
     const result = await fetchData();
     expect(result).toBeDefined();
   });
   ```

2. **Use `.resolves` and `.rejects` for promise assertions**
   ```typescript
   await expect(promise).resolves.toBe(value);
   await expect(promise).rejects.toThrow(error);
   ```

3. **Return promises when not using async/await**
   ```typescript
   it('good - returning promise', () => {
     return fetchData().then(result => {
       expect(result).toBeDefined();
     });
   });
   ```

### 7.3 Mocking Best Practices

1. **Use `vi.spyOn()` for existing functions**
   ```typescript
   const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
   // test code
   consoleSpy.mockRestore();
   ```

2. **Use `vi.fn()` for new mock functions**
   ```typescript
   const mockFn = vi.fn().mockResolvedValue('result');
   ```

3. **Always restore mocks in cleanup**
   ```typescript
   afterEach(() => {
     vi.restoreAllMocks();
   });
   ```

### 7.4 Concurrent Testing Best Practices

1. **Test with mixed success/failure scenarios**
   ```typescript
   const results = await Promise.allSettled([
     Promise.resolve('success'),
     Promise.reject(new Error('failure'))
   ]);
   ```

2. **Verify all operations complete**
   ```typescript
   expect(results).toHaveLength(expectedCount);
   ```

3. **Validate error collection**
   ```typescript
   const errors = results
     .filter(r => r.status === 'rejected')
     .map(r => r.reason);

   expect(errors).toHaveLength(expectedErrorCount);
   ```

4. **Use type guards for type safety**
   ```typescript
   const fulfilled = results.filter(
     (r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled'
   );
   ```

---

## 8. Real-World Patterns from Groundswell

### 8.1 Current Test Patterns in Groundswell

Based on analysis of `/home/dustin/projects/groundswell/src/__tests__/`:

**Location:** `/home/dustin/projects/groundswell/src/__tests__/unit/decorators.test.ts`

```typescript
describe('@Step decorator', () => {
  it('should wrap errors in WorkflowError', async () => {
    class FailingWorkflow extends Workflow {
      @Step()
      async failingStep(): Promise<void> {
        throw new Error('Step failed');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new FailingWorkflow();

    await expect(wf.run()).rejects.toMatchObject({
      message: 'Step failed',
      workflowId: wf.id,
    });
  });
});
```

### 8.2 Event Testing Pattern

**Location:** `/home/dustin/projects/groundswell/src/__tests__/unit/decorators.test.ts`

```typescript
it('should emit stepStart and stepEnd events', async () => {
  const wf = new StepTestWorkflow();
  const events: WorkflowEvent[] = [];

  wf.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await wf.run();

  const startEvent = events.find((e) => e.type === 'stepStart');
  const endEvent = events.find((e) => e.type === 'stepEnd');

  expect(startEvent).toBeDefined();
  expect(endEvent).toBeDefined();
});
```

### 8.3 Async Error Handling Pattern

**Common pattern across Groundswell tests:**

```typescript
await expect(workflow.run()).rejects.toThrow('Test error from step');
await expect(workflow.run()).rejects.toMatchObject({
  message: 'Error message',
  workflowId: workflow.id,
});
```

### 8.4 Vitest Configuration

**Location:** `/home/dustin/projects/groundswell/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
  },
});
```

---

## 9. Testing Checklist for Promise.allSettled Implementation

### 9.1 Core Functionality Tests

- [ ] All operations complete regardless of success/failure
- [ ] Results array matches input promise order
- [ ] Status is correctly set ('fulfilled' or 'rejected')
- [ ] Values are preserved for fulfilled promises
- [ ] Reasons are preserved for rejected promises

### 9.2 Error Collection Tests

- [ ] All errors are collected from rejected promises
- [ ] Error objects maintain their structure
- [ ] Error stack traces are preserved
- [ ] Error messages are accessible
- [ ] Custom error objects are handled correctly

### 9.3 Concurrent Execution Tests

- [ ] Operations run concurrently (not sequentially)
- [ ] All operations complete even if some fail
- [ ] No race conditions in result collection
- [ ] Result order is maintained regardless of completion time

### 9.4 Integration Tests

- [ ] Event emissions occur for all operations
- [ ] Logs are collected from all operations
- [ ] State snapshots are captured for failures
- [ ] Error aggregation works in production scenarios

### 9.5 Edge Cases

- [ ] Empty promise array
- [ ] All promises fail
- [ ] All promises succeed
- [ ] Mixed error types
- [ ] Rejected promises with undefined reasons

---

## 10. Recommended Test File Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';

describe('Promise.allSettled in @Task decorator', () => {
  describe('Concurrent execution', () => {
    describe('Basic functionality', () => {
      it('should execute all workflows concurrently', async () => {
        // Test implementation
      });

      it('should complete all operations regardless of failures', async () => {
        // Test implementation
      });
    });

    describe('Error collection', () => {
      it('should collect all errors from failed workflows', async () => {
        // Test implementation
      });

      it('should preserve error details', async () => {
        // Test implementation
      });
    });

    describe('Event emission', () => {
      it('should emit events for all workflows', async () => {
        // Test implementation
      });

      it('should maintain event order', async () => {
        // Test implementation
      });
    });

    describe('State management', () => {
      it('should capture state for all workflows', async () => {
        // Test implementation
      });

      it('should handle partial failures gracefully', async () => {
        // Test implementation
      });
    });
  });
});
```

---

## Additional Resources

### Community Resources

- **Vitest GitHub Discussions**: https://github.com/vitest-dev/vitest/discussions
- **Stack Overflow [vitest tag]**: https://stackoverflow.com/questions/tagged/vitest
- **Vitest Awesome List**: https://github.com/vitest-dev/vitest/issues

### Related Documentation

- **Testing Library**: https://testing-library.com/
- **JavaScript Promises**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- **TypeScript Promise Types**: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#promise-types

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Maintained By:** P1.M2.T1.S3 Research Team
