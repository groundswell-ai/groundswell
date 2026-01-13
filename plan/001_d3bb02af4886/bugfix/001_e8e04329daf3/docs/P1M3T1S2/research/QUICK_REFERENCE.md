# Quick Reference: Vitest Observer Error Logging Testing

**Last Updated:** 2026-01-12

---

## Essential URLs (with Section Anchors)

### Vitest Documentation
| Topic | URL | Section |
|-------|-----|---------|
| **Mock Functions** | https://vitest.dev/guide/mocking.html | `vi.fn()`, `vi.spyOn()` |
| **Expect API** | https://vitest.dev/api/expect.html | `toHaveBeenCalledWith()`, `objectContaining()` |
| **Async Testing** | https://vitest.dev/guide/async.html | `.resolves`, `.rejects` |
| **Test Context** | https://vitest.dev/api/context.html | `beforeEach`, `afterEach` |

---

## Core Testing Patterns

### 1. Mock Logger (Not Console)

```typescript
// Setup
const mockLogger = { error: vi.fn() };

// Verify
expect(mockLogger.error).toHaveBeenCalledWith('Error message', {
  error: expect.any(Error),
  eventType: 'testEvent',
});
```

### 2. Test Errors Don't Crash

```typescript
// Should not throw
expect(() => observable.next(42)).not.toThrow();

// But should log
expect(mockLogger.error).toHaveBeenCalled();
```

### 3. Test Multiple Observers

```typescript
// Some throw, some succeed
expect(observer2Called).toBe(true);
expect(errorLogs.length).toBe(2);
```

### 4. Verify Error Context

```typescript
expect(errorLog.data).toEqual({
  error: expect.any(Error),
  eventType: 'testEvent',
  nodeId: workflow.node.id,
});
```

---

## Vitest Assertions Reference

```typescript
// Mock logger calls
expect(mockLogger.error).toHaveBeenCalled()
expect(mockLogger.error).toHaveBeenCalledTimes(1)
expect(mockLogger.error).toHaveBeenCalledWith('message', { error })
expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'message', { error })

// Error structure
expect(errorLog.data).toEqual({ error: expect.any(Error) })
expect(errorLog.data.error).toBeInstanceOf(Error)

// Error isolation
expect(() => observable.next(42)).not.toThrow()

// Console fallback
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
expect(consoleSpy).toHaveBeenCalledWith('message', error)
consoleSpy.mockRestore()
```

---

## Project File Locations

### Test Files (Examples)
- `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

### Source Files
- `/home/dustin/projects/groundswell/src/utils/observable.ts`
- `/home/dustin/projects/groundswell/src/core/logger.ts`
- `/home/dustin/projects/groundswell/src/core/workflow.ts`

---

## DO's and DON'Ts

### DO's
- Mock logger interface: `const mockLogger = { error: vi.fn() }`
- Test error isolation: `expect(() => fn()).not.toThrow()`
- Verify error context: `expect(errorLog.data.error).toBeInstanceOf(Error)`
- Restore mocks: `consoleSpy.mockRestore()`

### DON'Ts
- Don't test console.output directly for logger verification
- Don't forget to test multiple observers
- Don't ignore error context verification
- Don't skip error isolation tests
