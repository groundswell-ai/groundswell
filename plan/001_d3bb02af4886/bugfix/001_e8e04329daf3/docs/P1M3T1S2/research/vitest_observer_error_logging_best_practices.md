# Vitest Best Practices for Testing Observer Error Logging

**Research Date:** 2026-01-12
**Task:** Research external best practices for testing observer error logging with vitest
**Status:** Complete

---

## Executive Summary

This research document compiles best practices for testing observer error logging patterns using Vitest, including:

1. Mocking and verifying logger usage (not console output)
2. Testing that errors don't crash execution
3. Testing observer pattern error handling
4. Verifying error context in logs
5. Official Vitest documentation with section anchors

---

## 1. Official Vitest Documentation URLs

### Core Documentation

| Resource | URL | Key Sections |
|----------|-----|--------------|
| **Vitest Main Docs** | https://vitest.dev/ | Overview, getting started |
| **Assertions API** | https://vitest.dev/api/expect.html | `toThrow()`, `toHaveBeenCalledWith()`, `objectContaining()` |
| **Mocking Guide** | https://vitest.dev/guide/mocking.html | `vi.fn()`, `vi.spyOn()`, mock implementations |
| **Async Testing** | https://vitest.dev/guide/async.html | `.resolves`, `.rejects` modifiers |
| **Test Context** | https://vitest.dev/api/context.html | `beforeEach()`, `afterEach()` setup |
| **Mock Functions** | https://vitest.dev/api/mock.html | Mock function APIs and expectations |

### Section-Specific Anchors

**Error Testing Assertions:**
- `toThrow()`: https://vitest.dev/api/expect.html#tothrow
- `.resolves` / `.rejects`: https://vitest.dev/api/expect.html#resolves
- Custom matchers: https://vitest.dev/api/expect.html#objectcontaining

**Mocking Patterns:**
- `vi.spyOn()`: https://vitest.dev/guide/mocking.html#spy-on
- `vi.fn()`: https://vitest.dev/guide/mocking.html#mock-functions
- Mock restoration: https://vitest.dev/guide/mocking.html#restoring-mocks

---

## 2. Mocking Logger in Vitest (Not Console Output)

### Pattern 1: Mock Logger Interface

**Best Practice:** Create a logger interface and mock it, rather than spying on `console.error`.

```typescript
// Logger interface
export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}

// Test with mock logger
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Observable error logging', () => {
  let mockLogger: ObservableLogger;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
    };
  });

  it('should log subscriber errors via logger', () => {
    const observable = new Observable<number>(mockLogger);
    const testError = new Error('Next error');

    const throwingSubscriber = {
      next: () => {
        throw testError;
      },
    };

    observable.subscribe(throwingSubscriber);
    observable.next(42);

    // Verify logger was called (not console)
    expect(mockLogger.error).toHaveBeenCalledWith('Observable subscriber error', {
      error: testError,
    });
  });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 14-30)

### Pattern 2: Verify Logger Call Count and Arguments

```typescript
it('should log errors for multiple throwing subscribers', () => {
  const observable = new Observable<number>(mockLogger);
  const error1 = new Error('Error 1');
  const error2 = new Error('Error 2');

  const throwingSubscriber1 = { next: () => { throw error1; } };
  const throwingSubscriber2 = { next: () => { throw error2; } };

  observable.subscribe(throwingSubscriber1);
  observable.subscribe(throwingSubscriber2);
  observable.next(42);

  // Verify call count
  expect(mockLogger.error).toHaveBeenCalledTimes(2);

  // Verify specific calls
  expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Observable subscriber error', {
    error: error1,
  });
  expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Observable subscriber error', {
    error: error2,
  });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 95-123)

### Pattern 3: Console Fallback Testing

When testing fallback to `console.error`, use `vi.spyOn()`:

```typescript
it('should fall back to console.error when no logger provided', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const observable = new Observable<number>();
  const testError = new Error('Next error');

  const throwingSubscriber = { next: () => { throw testError; } };

  observable.subscribe(throwingSubscriber);
  observable.next(42);

  expect(consoleErrorSpy).toHaveBeenCalledWith('Observable subscriber error', testError);
  consoleErrorSpy.mockRestore();
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 127-143)

---

## 3. Testing Errors Don't Crash Execution

### Pattern 1: Error Isolation Tests

**Best Practice:** Verify that observer errors are caught and logged, not propagated.

```typescript
describe('Error isolation', () => {
  let mockLogger: ObservableLogger;

  beforeEach(() => {
    mockLogger = { error: vi.fn() };
  });

  it('should not propagate errors outside try-catch', () => {
    const observable = new Observable<number>(mockLogger);
    const testError = new Error('Subscriber error');

    const throwingSubscriber = { next: () => { throw testError; } };

    observable.subscribe(throwingSubscriber);

    // This should NOT throw
    expect(() => {
      observable.next(42);
    }).not.toThrow();

    // But error should be logged
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 252-279)

### Pattern 2: Continue Notifying Other Observers

```typescript
it('should continue notifying other subscribers after one throws', () => {
  const observable = new Observable<number>(mockLogger);
  const testError = new Error('First subscriber error');
  const results: number[] = [];

  const throwingSubscriber = { next: () => { throw testError; } };

  const workingSubscriber = {
    next: (value: number) => {
      results.push(value);
    },
  };

  observable.subscribe(throwingSubscriber);
  observable.subscribe(workingSubscriber);
  observable.next(42);

  // Verify working subscriber received value
  expect(results).toEqual([42]);
  // Verify error was logged
  expect(mockLogger.error).toHaveBeenCalled();
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 69-93)

### Pattern 3: Workflow Observer Error Isolation

```typescript
it('should not crash workflow when observer onLog throws', async () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer onLog error');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Message 1');
      this.logger.info('Message 2');
      this.logger.info('Message 3');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  // Should complete without throwing
  await expect(workflow.run()).resolves.toBeUndefined();

  // All messages should be logged
  expect(workflow.node.logs.length).toBe(6); // 3 messages + 3 error logs
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 242-268)

---

## 4. Testing Observer Pattern Error Handling

### Pattern 1: Multiple Observers with Some Failing

```typescript
it('should continue notifying other observers after one throws', async () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer 1 failed');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => {
      observer2Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => {
      observer3Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.addObserver(workingObserver2);
  workflow.addObserver(workingObserver3);

  await workflow.run();

  // Both working observers should have been called
  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);

  // Should have error log for throwing observer
  const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onLog error');
  expect(errorLog).toBeDefined();
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 327-378)

### Pattern 2: Log Errors from Multiple Throwing Observers

```typescript
it('should log errors for multiple throwing observers', async () => {
  const throwingObserver1: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer 1 error');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const throwingObserver2: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer 2 error');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver1);
  workflow.addObserver(throwingObserver2);

  await workflow.run();

  // Should have error logs for both throwing observers
  const errorLogs = workflow.node.logs.filter((log) => log.message === 'Observer onLog error');
  expect(errorLogs.length).toBe(2);
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 380-414)

### Pattern 3: Avoid Infinite Recursion

```typescript
it('should avoid infinite recursion when observer onLog throws', async () => {
  let callCount = 0;
  const maxCalls = 10; // Safety limit to prevent actual infinite loop

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      callCount++;
      if (callCount < maxCalls) {
        throw new Error('Recursive error');
      }
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  await workflow.run();

  // Should only call onLog once (original) + one error log, then stop
  // The error log should NOT trigger another observer notification
  expect(callCount).toBe(1);

  // Should have 2 logs: original + error
  expect(workflow.node.logs.length).toBe(2);
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 42-74)

---

## 5. Verifying Error Context in Logs

### Pattern 1: Verify Error Object in Log Data

```typescript
it('should log observer onLog errors to workflow.node.logs', async () => {
  const onLogError = new Error('Observer onLog failed');

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      throw onLogError;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  await workflow.run();

  // Should have 2 logs: the original "Test message" and the observer error
  expect(workflow.node.logs.length).toBe(2);

  // First log is the original message
  expect(workflow.node.logs[0].message).toBe('Test message');
  expect(workflow.node.logs[0].level).toBe('info');

  // Second log is the observer error
  expect(workflow.node.logs[1].message).toBe('Observer onLog error');
  expect(workflow.node.logs[1].level).toBe('error');
  expect(workflow.node.logs[1].data).toEqual({ error: onLogError });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 7-40)

### Pattern 2: Include Event Type in Error Data

```typescript
it('should include event type in error data', () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => {
      throw new Error('Event error');
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.emitEvent({ type: 'treeUpdated', root: this.node });
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  workflow.run();

  const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onEvent error');
  expect(errorLog?.data).toHaveProperty('eventType', 'treeUpdated');
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 111-134)

### Pattern 3: Include Node ID in Error Data

```typescript
it('should include node ID in error data', async () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: () => {
      throw new Error('State update error');
    },
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.snapshotState();
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  await workflow.run();

  const errorLog = workflow.node.logs.find(
    (log) => log.message === 'Observer onStateUpdated error'
  );
  expect(errorLog?.data).toHaveProperty('nodeId', workflow.node.id);
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 172-196)

### Pattern 4: Verify Structured Error Context

```typescript
it('should log structured error context', async () => {
  const events: WorkflowEvent[] = [];

  const throwingObserver: WorkflowObserver = {
    onEvent: () => {
      throw new Error('Observer onEvent failed');
    },
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.emitEvent({ type: 'testEvent' });
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  workflow.run();

  // Should have error log entry
  const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onEvent error');
  expect(errorLog).toBeDefined();
  expect(errorLog?.level).toBe('error');
  expect(errorLog?.data).toEqual({
    error: expect.any(Error),
    eventType: 'testEvent',
  });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 77-109)

---

## 6. Mocking Patterns for Loggers in Vitest

### Pattern 1: beforeEach/afterEach Setup

**Best Practice:** Always restore mocks in cleanup.

```typescript
describe('Logger tests', () => {
  let mockLogger: ObservableLogger;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
    };
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('test case', () => {
    // mockLogger and consoleErrorSpy are already set up
  });
});
```

### Pattern 2: Partial Mocking

```typescript
// Mock only specific methods
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Use in tests
expect(mockLogger.error).toHaveBeenCalledWith('message', { context: 'value' });
expect(mockLogger.error).toHaveBeenCalledTimes(1);
```

### Pattern 3: Module Mocking

```typescript
// Mock entire logger module
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from './logger';

describe('Module mocking', () => {
  it('should use mocked logger', () => {
    logger.info('test');
    expect(logger.info).toHaveBeenCalledWith('test');
  });
});
```

---

## 7. Best Practices Summary

### DO's

1. **Mock logger interfaces, not console output**
   ```typescript
   const mockLogger = { error: vi.fn() };
   expect(mockLogger.error).toHaveBeenCalledWith(...);
   ```

2. **Verify errors don't crash execution**
   ```typescript
   expect(() => observable.next(42)).not.toThrow();
   expect(mockLogger.error).toHaveBeenCalled();
   ```

3. **Test multiple observers with mixed success/failure**
   ```typescript
   // Some throw, some succeed
   expect(observer2Called).toBe(true);
   expect(errorLogs.length).toBe(2);
   ```

4. **Verify error context in logs**
   ```typescript
   expect(errorLog.data).toEqual({
     error: expect.any(Error),
     eventType: 'testEvent',
   });
   ```

5. **Always restore mocks**
   ```typescript
   afterEach(() => {
     consoleSpy.mockRestore();
     vi.restoreAllMocks();
   });
   ```

### DON'Ts

1. **Don't test console.output directly for logger verification**
   ```typescript
   // BAD
   expect(console.error).toHaveBeenCalledWith(...);

   // GOOD
   expect(mockLogger.error).toHaveBeenCalledWith(...);
   ```

2. **Don't forget to test error isolation**
   ```typescript
   // BAD - only tests error thrown
   expect(() => observable.next(42)).toThrow();

   // GOOD - tests error caught and logged
   expect(() => observable.next(42)).not.toThrow();
   expect(mockLogger.error).toHaveBeenCalled();
   ```

3. **Don't skip testing multiple observers**
   ```typescript
   // Test with 3+ observers to ensure isolation
   ```

4. **Don't ignore error context verification**
   ```typescript
   // Verify error objects, not just messages
   expect(errorLog.data.error).toBeInstanceOf(Error);
   ```

---

## 8. Quick Reference: Vitest Assertions for Logger Testing

```typescript
// Mock logger creation
const mockLogger = { error: vi.fn() };

// Verify logger was called
expect(mockLogger.error).toHaveBeenCalled();
expect(mockLogger.error).toHaveBeenCalledTimes(1);
expect(mockLogger.error).toHaveBeenCalledWith('message', { error });

// Verify specific call
expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'message', { error: expect.any(Error) });

// Verify error isolation
expect(() => observable.next(42)).not.toThrow();

// Verify log data structure
expect(logEntry.data).toEqual({
  error: expect.any(Error),
  eventType: 'testEvent',
});

// Console fallback testing
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(consoleSpy).toHaveBeenCalledWith('message', error);
consoleSpy.mockRestore();
```

---

## 9. External Resources

### Vitest Official Documentation
- Main: https://vitest.dev/
- Assertions: https://vitest.dev/api/expect.html
- Mocking: https://vitest.dev/guide/mocking.html
- Async: https://vitest.dev/guide/async.html

### Observer Pattern Resources
- Observer pattern error handling: https://en.wikipedia.org/wiki/Observer_pattern
- Testing observer patterns: https://refactoring.guru/design-patterns/observer

### Error Handling Best Practices
- Structured logging: https://www.loggly.com/blog/structured-logging-best-practices/
- Error context capture: https://planetaria.co/blog/capturing-error-context-in-javascript

---

## 10. Related Files in Groundswell Project

### Test Files (Reference Implementations)
- `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` - Observer error logging integration tests
- `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` - Observable error handling unit tests
- `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts` - Workflow error state tests

### Source Files (Implementation)
- `/home/dustin/projects/groundswell/src/utils/observable.ts` - Observable class with logger injection
- `/home/dustin/projects/groundswell/src/core/logger.ts` - WorkflowLogger implementation
- `/home/dustin/projects/groundswell/src/core/workflow.ts` - Workflow class with observer error handling

### Research Documents
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T2S4/research/vitest_testing_patterns.md` - Vitest testing patterns
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T1S3/research/vitest_concurrent_testing.md` - Concurrent testing patterns
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/error-testing-research.md` - Error state capture research

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Research Summary:** Comprehensive best practices for testing observer error logging in Vitest
