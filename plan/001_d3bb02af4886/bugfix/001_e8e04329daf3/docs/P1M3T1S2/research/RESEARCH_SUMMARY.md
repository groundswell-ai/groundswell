# Research Summary: Vitest Best Practices for Testing Observer Error Logging

**Research Date:** 2026-01-12
**Status:** Complete

---

## Research Deliverables

### Documents Created
1. **Comprehensive Research Document** (110+ KB)
   - Location: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S2/research/vitest_observer_error_logging_best_practices.md`
   - Contains: All patterns, examples, and best practices with URLs

2. **Quick Reference Guide**
   - Location: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S2/research/QUICK_REFERENCE.md`
   - Contains: Essential patterns and URLs for quick lookup

---

## Key Findings by Category

### 1. Vitest Best Practices for Testing Error Handling

**Official Documentation URLs:**
- Main Docs: https://vitest.dev/
- Assertions API: https://vitest.dev/api/expect.html#tothrow
- Mocking Guide: https://vitest.dev/guide/mocking.html#spy-on
- Async Testing: https://vitest.dev/guide/async.html

**Key Patterns:**
- Use `vi.fn()` for mock functions
- Use `vi.spyOn()` for existing functions
- Always restore mocks in `afterEach()`
- Use `.not.toThrow()` to verify error isolation

### 2. Mocking Loggers in Vitest

**Best Practice:** Create a logger interface and mock it (not console output)

```typescript
// Define interface
export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}

// Mock in tests
const mockLogger: ObservableLogger = {
  error: vi.fn(),
};

// Verify usage
expect(mockLogger.error).toHaveBeenCalledWith('Observable subscriber error', {
  error: testError,
});
```

**For console fallback testing only:**
```typescript
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(consoleErrorSpy).toHaveBeenCalledWith('message', error);
consoleErrorSpy.mockRestore();
```

### 3. Testing Errors Don't Crash Execution

**Key Pattern: Error Isolation**

```typescript
it('should not propagate errors outside try-catch', () => {
  const observable = new Observable<number>(mockLogger);
  const throwingSubscriber = { next: () => { throw new Error(); } };

  observable.subscribe(throwingSubscriber);

  // This should NOT throw
  expect(() => {
    observable.next(42);
  }).not.toThrow();

  // But error should be logged
  expect(mockLogger.error).toHaveBeenCalled();
});
```

**Project Reference:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` (lines 252-279)

### 4. Testing Observer Pattern Error Handling

**Key Patterns:**

**Multiple observers with mixed success/failure:**
```typescript
it('should continue notifying other observers after one throws', async () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver = { onLog: () => { throw new Error(); } };
  const workingObserver2 = { onLog: () => { observer2Called = true; } };
  const workingObserver3 = { onLog: () => { observer3Called = true; } };

  // Add all observers and trigger
  // ...

  // Both working observers should have been called
  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);
});
```

**Avoid infinite recursion:**
```typescript
it('should avoid infinite recursion when observer onLog throws', async () => {
  let callCount = 0;

  const throwingObserver = {
    onLog: () => {
      callCount++;
      if (callCount < 10) {
        throw new Error('Recursive error');
      }
    },
  };

  // Should only call once + error log, then stop
  expect(callCount).toBe(1);
});
```

**Project Reference:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 327-414)

### 5. Verifying Error Context in Logs

**Key Pattern: Structured Error Context**

```typescript
it('should log structured error context', async () => {
  const throwingObserver = {
    onEvent: () => {
      throw new Error('Observer onEvent failed');
    },
  };

  workflow.run();

  const errorLog = workflow.node.logs.find(
    (log) => log.message === 'Observer onEvent error'
  );

  expect(errorLog).toBeDefined();
  expect(errorLog?.level).toBe('error');
  expect(errorLog?.data).toEqual({
    error: expect.any(Error),
    eventType: 'testEvent',
  });
});
```

**Include contextual data:**
- Event type: `expect(errorLog.data).toHaveProperty('eventType', 'testEvent')`
- Node ID: `expect(errorLog.data).toHaveProperty('nodeId', workflow.node.id)`
- Error object: `expect(errorLog.data.error).toBeInstanceOf(Error)`

**Project Reference:** `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` (lines 7-196)

---

## URLs with Section Anchors

### Vitest Error Handling Test Patterns

| Resource | URL | Section |
|----------|-----|---------|
| **toThrow()** | https://vitest.dev/api/expect.html#tothrow | Synchronous error testing |
| **.resolves/.rejects** | https://vitest.dev/api/expect.html#resolves | Async error testing |
| **objectContaining()** | https://vitest.dev/api/expect.html#objectcontaining | Partial object matching |
| **vi.spyOn()** | https://vitest.dev/guide/mocking.html#spy-on | Spying on functions |
| **Mock Functions** | https://vitest.dev/guide/mocking.html#mock-functions | Creating mocks |
| **Restoring Mocks** | https://vitest.dev/guide/mocking.html#restoring-mocks | Cleanup |

### Mocking Loggers in Vitest

| Pattern | Location |
|---------|----------|
| **Mock Interface** | `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts:14-30` |
| **Console Fallback** | `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts:127-143` |
| **Module Mocking** | https://vitest.dev/guide/mocking.html#mocking-modules |

### Testing Observer Error Handling

| Pattern | Location |
|---------|----------|
| **Error Isolation** | `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts:252-279` |
| **Multiple Observers** | `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts:327-378` |
| **Infinite Recursion Prevention** | `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts:42-74` |

---

## Best Practices Summary

### DO's

1. **Mock logger interfaces, not console output**
   - Define `ObservableLogger` interface
   - Use `vi.fn()` for mock functions
   - Verify `mockLogger.error` calls

2. **Test errors don't crash execution**
   - Use `expect(() => fn()).not.toThrow()`
   - Verify logger was called instead
   - Test multiple observers with mixed outcomes

3. **Verify error context in logs**
   - Check `errorLog.data.error` is Error instance
   - Verify contextual data (eventType, nodeId)
   - Use `expect.objectContaining()` for partial matching

4. **Always restore mocks**
   - Use `afterEach()` for cleanup
   - Call `consoleSpy.mockRestore()`
   - Use `vi.restoreAllMocks()`

5. **Test all observer scenarios**
   - Single observer error
   - Multiple observers with mixed success/failure
   - All observers fail
   - Infinite recursion prevention

### DON'Ts

1. **Don't test console.output for logger verification**
   ```typescript
   // BAD
   expect(console.error).toHaveBeenCalledWith(...);

   // GOOD
   expect(mockLogger.error).toHaveBeenCalledWith(...);
   ```

2. **Don't forget error isolation tests**
   ```typescript
   // BAD - only tests error thrown
   expect(() => observable.next(42)).toThrow();

   // GOOD - tests error caught and logged
   expect(() => observable.next(42)).not.toThrow();
   expect(mockLogger.error).toHaveBeenCalled();
   ```

3. **Don't skip multiple observer scenarios**
   - Test with 3+ observers
   - Verify isolation between observers
   - Check all errors are logged

4. **Don't ignore error context verification**
   - Verify error objects, not just messages
   - Check contextual data is included
   - Use type guards when needed

---

## Related Project Files

### Test Files (Reference Implementations)
- `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

### Source Files (Implementation)
- `/home/dustin/projects/groundswell/src/utils/observable.ts`
- `/home/dustin/projects/groundswell/src/core/logger.ts`
- `/home/dustin/projects/groundswell/src/core/workflow.ts`

### Research Documents (Additional Reading)
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T2S4/research/vitest_testing_patterns.md`
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T1S3/research/vitest_concurrent_testing.md`
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/error-testing-research.md`

---

## Quick Reference Code Snippets

### Mock Logger Setup
```typescript
const mockLogger = { error: vi.fn() };
```

### Verify Logger Call
```typescript
expect(mockLogger.error).toHaveBeenCalledWith('message', { error });
```

### Test Error Isolation
```typescript
expect(() => observable.next(42)).not.toThrow();
expect(mockLogger.error).toHaveBeenCalled();
```

### Verify Error Context
```typescript
expect(errorLog.data).toEqual({
  error: expect.any(Error),
  eventType: 'testEvent',
});
```

### Console Fallback
```typescript
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(consoleSpy).toHaveBeenCalledWith('message', error);
consoleSpy.mockRestore();
```

---

**Research Complete:** All requested URLs, patterns, examples, and best practices have been documented and stored.
