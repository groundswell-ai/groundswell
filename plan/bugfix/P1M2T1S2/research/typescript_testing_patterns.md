# TypeScript Testing Patterns for Observables and Events

**Research Date:** 2025-01-11
**Purpose:** Comprehensive research on TypeScript testing best practices for class methods with observables/event patterns
**Testing Framework:** Vitest 1.0.0
**TypeScript Version:** 5.2.0

---

## Table of Contents

1. [Vitest Official Documentation](#vitest-official-documentation)
2. [Observable Testing Patterns](#observable-testing-patterns)
3. [Mock Observer Patterns](#mock-observer-patterns)
4. [Event Emission Verification](#event-emission-verification)
5. [Event Payload Testing](#event-payload-testing)
6. [Negative Testing (Events NOT Emitted)](#negative-testing-events-not-emitted)
7. [Async Testing Best Practices](#async-testing-best-practices)
8. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
9. [Groundswell-Specific Patterns](#groundswell-specific-patterns)
10. [Quick Reference](#quick-reference)

---

## Vitest Official Documentation

### Core Documentation

- **Vitest Official Site:** https://vitest.dev/
- **Testing API Reference:** https://vitest.dev/api/
- **Expect Matchers:** https://vitest.dev/api/expect.html
- **Testing Async Code:** https://vitest.dev/guide/testing.html#testing-async
- **Mock Functions:** https://vitest.dev/api/mock.html
- **Test Context:** https://vitest.dev/advanced/context.html
- **Snapshot Testing:** https://vitest.dev/guide/snapshot.html
- **Coverage:** https://vitest.dev/guide/coverage.html

### Important Sections for Observable Testing

- **Testing Async (Observables):** https://vitest.dev/guide/testing.html#testing-async
- **Mock Functions (vi.fn):** https://vitest.dev/api/mock.html#vi-fn
- **SpyOn Functions:** https://vitest.dev/api/vi.html#vi-spyon
- **Timers (vi.useFakeTimers):** https://vitest.dev/api/vi.html#vi-usefaketimers

---

## Observable Testing Patterns

### Pattern 1: Basic Observer with Array Collection

**Best for:** Simple event emission verification

```typescript
import { describe, it, expect } from 'vitest';
import { Observable } from './observable.js';

describe('Observable basic testing', () => {
  it('should collect emitted values', () => {
    const observable = new Observable<string>();
    const collected: string[] = [];

    const subscription = observable.subscribe({
      next: (value) => collected.push(value),
    });

    observable.next('first');
    observable.next('second');
    observable.next('third');

    expect(collected).toEqual(['first', 'second', 'third']);

    subscription.unsubscribe();
  });
});
```

### Pattern 2: Count-Based Emission Verification

**Best for:** Verifying exact number of emissions

```typescript
it('should emit exactly three events', () => {
  const observable = new Observable<number>();
  let emissionCount = 0;

  observable.subscribe({
    next: () => emissionCount++,
  });

  observable.next(1);
  observable.next(2);
  observable.next(3);

  expect(emissionCount).toBe(3);
});
```

### Pattern 3: Completion Verification

**Best for:** Testing observable lifecycle

```typescript
it('should call complete callback', () => {
  const observable = new Observable<void>();
  let completed = false;

  observable.subscribe({
    complete: () => {
      completed = true;
    },
  });

  observable.complete();

  expect(completed).toBe(true);
});
```

### Pattern 4: Error Handling in Observables

**Best for:** Testing error events

```typescript
it('should call error callback', () => {
  const observable = new Observable<unknown>();
  const errors: unknown[] = [];

  observable.subscribe({
    error: (err) => errors.push(err),
  });

  const testError = new Error('Test error');
  observable.error(testError);

  expect(errors).toHaveLength(1);
  expect(errors[0]).toBe(testError);
});
```

### Pattern 5: Multiple Subscribers

**Best for:** Testing broadcast behavior

```typescript
it('should notify all subscribers', () => {
  const observable = new Observable<string>();
  const results1: string[] = [];
  const results2: string[] = [];

  observable.subscribe({ next: (v) => results1.push(v) });
  observable.subscribe({ next: (v) => results2.push(v) });

  observable.next('broadcast');

  expect(results1).toEqual(['broadcast']);
  expect(results2).toEqual(['broadcast']);
});
```

### Pattern 6: Unsubscription Verification

**Best for:** Testing cleanup behavior

```typescript
it('should stop receiving after unsubscribe', () => {
  const observable = new Observable<number>();
  const received: number[] = [];

  const subscription = observable.subscribe({
    next: (value) => received.push(value),
  });

  observable.next(1);
  subscription.unsubscribe();
  observable.next(2);

  expect(received).toEqual([1]); // Should not include 2
});
```

---

## Mock Observer Patterns

### Pattern 1: Vitest Mock Function

```typescript
import { vi } from 'vitest';

it('should use vi.fn for mock observer', () => {
  const observable = new Observable<string>();
  const mockNext = vi.fn();

  observable.subscribe({ next: mockNext });
  observable.next('test');

  expect(mockNext).toHaveBeenCalledTimes(1);
  expect(mockNext).toHaveBeenCalledWith('test');
});
```

### Pattern 2: Partial Mock Observer

```typescript
it('should mock only specific callbacks', () => {
  const observable = new Observable<string>();
  const mockNext = vi.fn();
  const mockError = vi.fn();

  observable.subscribe({
    next: mockNext,
    error: mockError,
    // complete not mocked - uses default
  });

  observable.next('value');

  expect(mockNext).toHaveBeenCalledWith('value');
  expect(mockError).not.toHaveBeenCalled();
});
```

### Pattern 3: Spy on Observer Methods

```typescript
class MyObserver implements Observer<string> {
  next(value: string) {}
  error(err: unknown) {}
  complete() {}
}

it('should spy on observer methods', () => {
  const observable = new Observable<string>();
  const observer = new MyObserver();

  const nextSpy = vi.spyOn(observer, 'next');
  const errorSpy = vi.spyOn(observer, 'error');

  observable.subscribe(observer);
  observable.next('test');

  expect(nextSpy).toHaveBeenCalledWith('test');
  expect(errorSpy).not.toHaveBeenCalled();
});
```

### Pattern 4: Mock with Implementation

```typescript
it('should use mock implementation', () => {
  const observable = new Observable<number>();
  let sum = 0;

  const mockObserver = {
    next: vi.fn((value: number) => {
      sum += value;
    }),
  };

  observable.subscribe(mockObserver);
  observable.next(5);
  observable.next(10);

  expect(sum).toBe(15);
  expect(mockObserver.next).toHaveBeenCalledTimes(2);
});
```

---

## Event Emission Verification

### Pattern 1: Direct Array Collection (Groundswell Pattern)

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

```typescript
describe('Event emission verification', () => {
  it('should emit logs to observers', async () => {
    const wf = new SimpleWorkflow();
    const logs: LogEntry[] = [];

    const observer: WorkflowObserver = {
      onLog: (entry) => logs.push(entry),
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    wf.addObserver(observer);
    await wf.run();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toBe('Running simple workflow');
  });
});
```

### Pattern 2: Event Type Filtering

```typescript
it('should filter events by type', () => {
  const events: WorkflowEvent[] = [];
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  // ... trigger events ...

  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);
});
```

### Pattern 3: Event Finding with Type Guards

```typescript
it('should find specific event type', () => {
  const events: WorkflowEvent[] = [];

  // ... emit events ...

  const attachEvent = events.find((e) => e.type === 'childAttached');
  expect(attachEvent).toBeDefined();

  // Type narrowing for discriminated union
  expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
});
```

### Pattern 4: Sequential Event Verification

```typescript
it('should emit events in correct order', () => {
  const events: string[] = [];

  observable.subscribe({
    next: (value) => events.push(value),
  });

  observable.next('first');
  observable.next('second');
  observable.next('third');

  expect(events).toEqual(['first', 'second', 'third']);
});
```

### Pattern 5: Conditional Event Emission

```typescript
it('should emit only when condition met', () => {
  const events: number[] = [];

  observable.subscribe({
    next: (value) => {
      if (value > 5) {
        events.push(value);
      }
    },
  });

  observable.next(3);
  observable.next(7);
  observable.next(2);

  expect(events).toEqual([7]);
});
```

---

## Event Payload Testing

### Pattern 1: Complete Payload Verification

```typescript
it('should emit event with correct payload', () => {
  const events: WorkflowEvent[] = [];

  observer.onEvent = (event) => events.push(event);

  // ... trigger event ...

  expect(events[0]).toEqual({
    type: 'childAttached',
    parentId: 'parent-123',
    childId: 'child-456',
    timestamp: expect.any(Number),
  });
});
```

### Pattern 2: Partial Payload Matching

```typescript
it('should match partial event payload', () => {
  const events: WorkflowEvent[] = [];

  observer.onEvent = (event) => events.push(event);

  // ... trigger event ...

  expect(events[0]).toMatchObject({
    type: 'error',
    error: {
      message: expect.stringContaining('error'),
    },
  });
});
```

### Pattern 3: Nested Property Verification

```typescript
it('should verify nested payload properties', () => {
  const events: WorkflowEvent[] = [];

  observer.onEvent = (event) => events.push(event);

  // ... trigger event ...

  expect(events[0]).toMatchObject({
    type: 'error',
    error: expect.objectContaining({
      message: 'Test error from step',
      state: expect.objectContaining({
        stepCount: 5,
        apiKey: '***',
      }),
      logs: expect.any(Array),
    }),
  });
});
```

### Pattern 4: Type-Safe Payload Testing

```typescript
it('should use type narrowing for payload', () => {
  const events: WorkflowEvent[] = [];

  observer.onEvent = (event) => events.push(event);

  // ... trigger event ...

  const errorEvent = events.find((e) => e.type === 'error');

  if (errorEvent?.type === 'error') {
    // TypeScript now knows errorEvent is ErrorEvent
    expect(errorEvent.error.message).toBe('expected message');
    expect(errorEvent.error.state).toBeDefined();
  }
});
```

### Pattern 5: Redacted Field Testing

```typescript
it('should redact sensitive fields in payload', async () => {
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onEvent: (event) => events.push(event),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(observer);

  // ... trigger event with sensitive data ...

  const errorEvent = events.find((e) => e.type === 'error');
  expect(errorEvent?.type === 'error' && errorEvent.error.state.apiKey).toBe('***');
  expect('internalCounter' in errorEvent!.error!.state!).toBe(false);
});
```

---

## Negative Testing (Events NOT Emitted)

### Pattern 1: Empty Array Verification

```typescript
it('should not emit events in error case', () => {
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onEvent: (event) => events.push(event),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  // Perform action that should NOT emit events
  const result = someOperation();

  expect(events).toHaveLength(0);
});
```

### Pattern 2: No Specific Event Type

```typescript
it('should not emit error events on success', () => {
  const events: WorkflowEvent[] = [];

  observer.onEvent = (event) => events.push(event);

  // ... perform successful operation ...

  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents).toHaveLength(0);
});
```

### Pattern 3: Unsubscribe Stops Emissions

```typescript
it('should not emit after unsubscribe', () => {
  const events: string[] = [];

  const subscription = observable.subscribe({
    next: (value) => events.push(value),
  });

  observable.next('before');
  subscription.unsubscribe();
  observable.next('after');

  expect(events).toEqual(['before']);
  expect(events).not.toContain('after');
});
```

### Pattern 4: Conditional Non-Emission

```typescript
it('should not emit when validation fails', () => {
  const events: string[] = [];

  observable.subscribe({
    next: (value) => events.push(value),
  });

  // These should not be emitted due to validation
  observable.next(null as any);
  observable.next(undefined as any);

  expect(events).toHaveLength(0);
});
```

### Pattern 5: Timeout-Based Non-Emission

```typescript
import { vi } from 'vitest';

it('should not emit within timeout', async () => {
  const events: string[] = [];
  vi.useFakeTimers();

  observable.subscribe({
    next: (value) => events.push(value),
  });

  // Advance time but expect no emissions
  vi.advanceTimersByTime(1000);

  expect(events).toHaveLength(0);

  vi.useRealTimers();
});
```

### Pattern 6: Count-Based Non-Emission

```typescript
it('should not increment count for invalid operations', () => {
  const counts = { onEvent: 0, onLog: 0 };

  const observer = {
    onEvent: () => counts.onEvent++,
    onLog: () => counts.onLog++,
  };

  // Perform operation that should not emit
  performNoOpOperation();

  expect(counts.onEvent).toBe(0);
  expect(counts.onLog).toBe(0);
});
```

---

## Async Testing Best Practices

### Pattern 1: Async/Await with Observables

```typescript
it('should handle async observer callbacks', async () => {
  const observable = new Observable<string>();
  const results: string[] = [];

  observable.subscribe({
    next: async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push(value);
    },
  });

  observable.next('async-test');

  // Wait for async operations
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(results).toEqual(['async-test']);
});
```

### Pattern 2: Promise-Based Event Waiting

```typescript
it('should wait for specific event', async () => {
  const eventPromise = new Promise<WorkflowEvent>((resolve) => {
    const observer: WorkflowObserver = {
      onEvent: (event) => {
        if (event.type === 'expectedType') {
          resolve(event);
        }
      },
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };
    workflow.addObserver(observer);
  });

  // Trigger event
  triggerExpectedEvent();

  const event = await eventPromise;
  expect(event.type).toBe('expectedType');
});
```

### Pattern 3: Async Error Testing

```typescript
it('should handle async errors', async () => {
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onEvent: (event) => events.push(event),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(observer);

  // Assert workflow throws
  await expect(workflow.run()).rejects.toThrow('Test error from step');

  // Assert error event was emitted
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);
});
```

### Pattern 4: Async Sequential Operations

```typescript
it('should maintain order with async operations', async () => {
  const events: number[] = [];

  observable.subscribe({
    next: async (value) => {
      events.push(value);
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
    },
  });

  observable.next(1);
  observable.next(2);
  observable.next(3);

  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(events).toEqual([1, 2, 3]);
});
```

### Pattern 5: Fake Timers with Observables

```typescript
import { vi } from 'vitest';

it('should use fake timers for time-based observables', () => {
  vi.useFakeTimers();

  const events: number[] = [];
  const observable = new Observable<number>();

  observable.subscribe({
    next: (value) => events.push(value),
  });

  // Simulate time-based emissions
  setTimeout(() => observable.next(1), 100);
  setTimeout(() => observable.next(2), 200);

  vi.advanceTimersByTime(300);

  expect(events).toEqual([1, 2]);

  vi.useRealTimers();
});
```

---

## Common Pitfalls to Avoid

### Pitfall 1: Missing Observer Callbacks

```typescript
// ❌ WRONG - Missing required callbacks
const observer = {
  onEvent: (event) => events.push(event),
  // Missing onLog, onStateUpdated, onTreeChanged
};

// ✅ CORRECT - Include all callbacks
const observer: WorkflowObserver = {
  onEvent: (event) => events.push(event),
  onLog: () => {},  // Empty but present
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

### Pitfall 2: Forgetting to Attach Observer

```typescript
// ❌ WRONG - Observer created but not attached
const observer: WorkflowObserver = { /* ... */ };
workflow.run();  // No observer attached!

// ✅ CORRECT - Attach observer before action
workflow.addObserver(observer);
workflow.run();
```

### Pitfall 3: Not Waiting for Async Operations

```typescript
// ❌ WRONG - Not awaiting async workflow
it('should test async workflow', () => {
  workflow.run();  // Missing await
  expect(events).toHaveLength(1);  // Will fail
});

// ✅ CORRECT - Await async operations
it('should test async workflow', async () => {
  await workflow.run();
  expect(events).toHaveLength(1);
});
```

### Pitfall 4: Testing Synchronous After Unsubscribe

```typescript
// ❌ WRONG - Assuming unsubscribe is instant
subscription.unsubscribe();
expect(events).toHaveLength(0);  // May still have pending events

// ✅ CORRECT - Account for async nature
subscription.unsubscribe();
await new Promise(resolve => setTimeout(resolve, 0));
expect(events).toHaveLength(0);
```

### Pitfall 5: Mutation of Collected Events

```typescript
// ❌ WRONG - Modifying event array
it('should not modify events', () => {
  const events: WorkflowEvent[] = [];
  observer.onEvent = (event) => events.push(event);

  // ... trigger events ...

  events.pop();  // Don't mutate!
  expect(events).toHaveLength(expectedCount);
});

// ✅ CORRECT - Use filtering or new array
it('should not modify events', () => {
  const events: WorkflowEvent[] = [];
  observer.onEvent = (event) => events.push(event);

  // ... trigger events ...

  const filteredEvents = events.filter(e => e.type !== 'ignored');
  expect(filteredEvents).toHaveLength(expectedCount);
});
```

### Pitfall 6: Not Cleaning Up Subscriptions

```typescript
// ❌ WRONG - No cleanup
it('should leak subscriptions', () => {
  observable.subscribe({ next: () => {} });
  observable.subscribe({ next: () => {} });
  // Subscriptions not cleaned up
});

// ✅ CORRECT - Always unsubscribe
it('should clean up subscriptions', () => {
  const sub1 = observable.subscribe({ next: () => {} });
  const sub2 = observable.subscribe({ next: () => {} });

  // In afterEach or after test
  sub1.unsubscribe();
  sub2.unsubscribe();
});
```

### Pitfall 7: Asserting on Wrong Event Type

```typescript
// ❌ WRONG - Type assertion without guard
const event = events[0];
expect(event.error.message).toBe('test');  // May fail if not error type

// ✅ CORRECT - Use type guard
const event = events.find(e => e.type === 'error');
if (event?.type === 'error') {
  expect(event.error.message).toBe('test');
}
```

---

## Groundswell-Specific Patterns

### Pattern 1: WorkflowObserver Interface

**Source:** `/home/dustin/projects/groundswell/src/types/observer.ts`

```typescript
export interface WorkflowObserver {
  /** Called when a log entry is created */
  onLog(entry: LogEntry): void;
  /** Called when any workflow event occurs */
  onEvent(event: WorkflowEvent): void;
  /** Called when a node's state is updated */
  onStateUpdated(node: WorkflowNode): void;
  /** Called when the tree structure changes */
  onTreeChanged(root: WorkflowNode): void;
}
```

### Pattern 2: Complete Observer Mock

**Used throughout test suite:**

```typescript
const observer: WorkflowObserver = {
  onLog: () => {},  // Empty - not testing logs
  onEvent: (event) => events.push(event),  // Capture events
  onStateUpdated: () => {},  // Empty - not testing state updates
  onTreeChanged: (root) => treeChangedCalls.push(root),  // Capture tree changes
};
```

### Pattern 3: Discriminated Union Event Testing

```typescript
// WorkflowEvent is a discriminated union
const attachEvent = events.find((e) => e.type === 'childAttached');

// Type narrowing for discriminated union
expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);

// Or with guard
if (attachEvent?.type === 'childAttached') {
  // TypeScript knows this is ChildAttachedEvent
  expect(attachEvent.parentId).toBe(parent.id);
  expect(attachEvent.childId).toBe(child.id);
}
```

### Pattern 4: Error Event with State Capture

```typescript
it('should capture state and logs in functional workflow error', async () => {
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workflow = new Workflow<void>(
    { name: 'ErrorCaptureTest' },
    async (ctx) => {
      await ctx.step('failing-step', async () => {
        throw new Error('Test error from step');
      });
    }
  );

  workflow.addObserver(observer);
  await expect(workflow.run()).rejects.toThrow('Test error from step');

  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  expect(errorEvents[0].error.message).toBe('Test error from step');
  expect(errorEvents[0].error.logs).toBeDefined();
  expect(errorEvents[0].error.state).toBeDefined();
});
```

### Pattern 5: Observable Implementation in Groundswell

**Source:** `/home/dustin/projects/groundswell/src/utils/observable.ts`

```typescript
export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): Subscription {
    this.subscribers.add(observer);
    return {
      unsubscribe: () => {
        this.subscribers.delete(observer);
      },
    };
  }

  next(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.next?.(value);
      } catch (err) {
        console.error('Observable subscriber error:', err);
      }
    }
  }
}
```

### Pattern 6: Console Mocking for Tests

**Source:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/circular-reference.test.ts`

```typescript
import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();  // CRITICAL: Always restore
});
```

---

## Quick Reference

### Observable Testing Cheat Sheet

| Test Goal | Pattern | Example |
|-----------|---------|---------|
| Collect all values | Array push | `const values: T[] = []; obs.subscribe({ next: v => values.push(v) })` |
| Count emissions | Counter | `let count = 0; obs.subscribe({ next: () => count++ })` |
| Mock observer | Vitest mock | `const mockNext = vi.fn(); obs.subscribe({ next: mockNext })` |
| Verify no emissions | Empty array | `expect(events).toHaveLength(0)` |
| Filter by type | Array.filter | `const errors = events.filter(e => e.type === 'error')` |
| Find specific event | Array.find | `const event = events.find(e => e.type === 'target')` |
| Type narrowing | Type guard | `if (event?.type === 'specific') { /* narrowed */ }` |

### Async Testing Cheat Sheet

| Scenario | Pattern |
|----------|---------|
| Async workflow | `await workflow.run()` |
| Async error | `await expect(workflow.run()).rejects.toThrow('msg')` |
| Wait for event | `const promise = new Promise(resolve => obs.once('evt', resolve))` |
| Fake timers | `vi.useFakeTimers(); vi.advanceTimersByTime(100); vi.useRealTimers()` |
| Sequential async | `await op1(); await op2();` |

### Negative Testing Cheat Sheet

| Test Case | Assertion |
|-----------|-----------|
| No events emitted | `expect(events).toHaveLength(0)` |
| No specific type | `expect(events.filter(e => e.type === 'error')).toHaveLength(0)` |
| After unsubscribe | `expect(events).toEqual(['before'])` (not 'after') |
| No callback invoked | `expect(mockFn).not.toHaveBeenCalled()` |
| Count not incremented | `expect(counts.onError).toBe(0)` |

---

## Summary and Key Takeaways

### Best Practices

1. **Always initialize empty arrays** for event collection before tests
2. **Provide all observer callbacks** even if empty (`() => {}`)
3. **Use type guards** for discriminated unions like `WorkflowEvent`
4. **Await async operations** in async tests
5. **Clean up subscriptions** in `afterEach` or after each test
6. **Mock console methods** to avoid noisy test output
7. **Always restore mocks** with `vi.restoreAllMocks()`
8. **Use descriptive test names** that specify what is being tested
9. **Test both positive and negative cases** (emitted vs not emitted)
10. **Verify payload contents** with `toMatchObject` for partial matching

### Groundswell-Specific Notes

1. The project uses a **custom Observable implementation** at `/home/dustin/projects/groundswell/src/utils/observable.ts`
2. **WorkflowObserver interface** requires 4 callbacks: `onLog`, `onEvent`, `onStateUpdated`, `onTreeChanged`
3. **WorkflowEvent** is a discriminated union - use type guards for safe access
4. Tests are located in `src/__tests__/` with unit, integration, and adversarial folders
5. Vitest configuration is in `vitest.config.ts` with `globals: true`

---

**End of Research Document**

**File:** `/home/dustin/projects/groundswell/plan/bugfix/P1M2T1S2/research/typescript_testing_patterns.md`
