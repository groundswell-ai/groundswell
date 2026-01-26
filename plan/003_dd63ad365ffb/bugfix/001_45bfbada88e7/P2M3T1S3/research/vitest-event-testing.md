# Vitest Event Emission Testing Patterns - Research Summary

**Research Date:** 2026-01-26
**Context:** Groundswell P2.M3.T1.S3 - Research Vitest testing patterns for event emission testing in TypeScript/JavaScript projects
**Goal:** Document best practices for testing event emissions with Vitest, including observer setup, async patterns, and type-safe event testing

---

## Executive Summary

This research document compiles best practices for testing event emissions in Vitest, specifically tailored for TypeScript projects with observer pattern implementations. The patterns are derived from existing Groundswell codebase analysis and Vitest testing best practices.

**Key Findings:**
1. **Inline observer objects with capture arrays** are the primary pattern for event testing
2. **Type guards** are essential for discriminated union event types
3. **Call order verification** requires tracking arrays or counters
4. **Spy patterns** (`vi.fn()`, `vi.spyOn()`) complement inline observers
5. **Async event testing** requires proper promise handling and timing

---

## Table of Contents

1. [Vitest Documentation Resources](#1-vitest-documentation-resources)
2. [Core Event Testing Patterns](#2-core-event-testing-patterns)
3. [Observer Setup Best Practices](#3-observer-setup-best-practices)
4. [Event Verification Patterns](#4-event-verification-patterns)
5. [Type-Safe Event Testing](#5-type-safe-event-testing)
6. [Async Event Testing](#6-async-event-testing)
7. [Mock/Spy Patterns](#7-mockspy-patterns)
8. [Event Order Testing](#8-event-order-testing)
9. [Error Handling in Event Tests](#9-error-handling-in-event-tests)
10. [Performance Considerations](#10-performance-considerations)
11. [Test Templates](#11-test-templates)
12. [Anti-Patterns to Avoid](#12-anti-patterns-to-avoid)

---

## 1. Vitest Documentation Resources

### Official Vitest Documentation

**Note:** Web search was unavailable at research time (rate limited). The following are standard Vitest documentation URLs that should be referenced:

- **Main Documentation:** https://vitest.dev/guide/
- **API Reference:** https://vitest.dev/api/
- **Testing Guide:** https://vitest.dev/guide/test.html
- **Mock Functions:** https://vitest.dev/api/vi.html
- **Assertion API:** https://vitest.dev/api/expect.html
- **Snapshot Testing:** https://vitest.dev/guide/snapshot.html

**Recommended sections to review:**
- `vi.fn()` - Mock function creation
- `vi.spyOn()` - Spying on methods
- `expect().toHaveBeenCalled()` - Assertion patterns
- `expect().toHaveBeenCalledWith()` - Argument verification
- `expect().toHaveBeenNthCalledWith()` - Call order verification

---

## 2. Core Event Testing Patterns

### 2.1 The Inline Observer Pattern (Primary Pattern)

This is the most common pattern in the Groundswell codebase for event testing.

**Structure:**
```typescript
import { describe, it, expect } from 'vitest';
import type { WorkflowObserver, WorkflowEvent } from '../../types';

describe('Event Emission Testing', () => {
  it('should capture events with inline observer', () => {
    // ARRANGE: Create capture arrays
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: any[] = [];

    // ARRANGE: Create inline observer
    const observer: WorkflowObserver = {
      onLog: () => {}, // Empty - not testing logs
      onEvent: (event) => events.push(event), // Capture events
      onStateUpdated: () => {}, // Empty - not testing state updates
      onTreeChanged: (root) => treeChangedCalls.push(root), // Capture tree changes
    };

    // ARRANGE: Attach observer to subject
    subject.addObserver(observer);

    // ACT: Trigger event
    subject.triggerEvent();

    // ASSERT: Verify event was captured
    const specificEvent = events.find(e => e.type === 'specificEventType');
    expect(specificEvent).toBeDefined();
  });
});
```

**Key Advantages:**
- Simple and readable
- No external mocking library required
- Type-safe with TypeScript
- Captures actual event objects for inspection
- Allows verification of both `onEvent` and specific callbacks

### 2.2 The Spy Pattern (Complementary Pattern)

Use `vi.fn()` spies when you need to verify call counts or arguments without inspecting event payloads.

```typescript
import { vi } from 'vitest';

describe('Event Emission with Spies', () => {
  it('should track call counts with vi.fn()', () => {
    // ARRANGE: Create spy functions
    const onEventSpy = vi.fn();
    const onTreeChangedSpy = vi.fn();

    const observer: WorkflowObserver = {
      onLog: vi.fn(),
      onEvent: onEventSpy,
      onStateUpdated: vi.fn(),
      onTreeChanged: onTreeChangedSpy,
    };

    subject.addObserver(observer);

    // ACT: Trigger event
    subject.triggerEvent();

    // ASSERT: Verify call counts
    expect(onEventSpy).toHaveBeenCalledTimes(1);
    expect(onTreeChangedSpy).toHaveBeenCalledTimes(1);
    expect(onEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expectedType',
      })
    );
  });
});
```

**When to use:**
- Simple call count verification
- Argument matching with `expect.objectContaining`
- When event payload inspection is not critical
- Negative assertions (`.not.toHaveBeenCalled()`)

---

## 3. Observer Setup Best Practices

### 3.1 Complete Observer Interface

Always provide all required observer methods, even if empty:

```typescript
const observer: WorkflowObserver = {
  onLog: () => {},           // Always provide
  onEvent: (e) => {},        // Implement or empty
  onStateUpdated: () => {},  // Always provide
  onTreeChanged: () => {},   // Implement or empty
};
```

**Rationale:** Prevents "undefined is not a function" errors and makes test intent explicit.

### 3.2 Observer Attachment Strategy

**Attach to Root for Tree Events:**
```typescript
// For tree-level events (treeUpdated, childAttached, childDetached)
// Attach observer to ROOT workflow, not child
const root = new Workflow('Root');
const child = new Workflow('Child', root);

root.addObserver(observer); // ✅ Correct - receives all tree events
child.addObserver(observer); // ❌ May miss parent-level events
```

### 3.3 Multiple Observer Testing

Test observer isolation and error handling:

```typescript
it('should continue notifying other observers after one throws', () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => { throw new Error('Observer 1 failed'); },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => { observer2Called = true; },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => { observer3Called = true; },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  subject.addObserver(throwingObserver);
  subject.addObserver(workingObserver2);
  subject.addObserver(workingObserver3);

  subject.triggerEvent();

  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);
});
```

---

## 4. Event Verification Patterns

### 4.1 Event Type Filtering

Use `Array.find()` with type guards to locate specific events:

```typescript
it('should emit treeUpdated event', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');

  // Find specific event type
  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
});
```

### 4.2 Type Guard Pattern for Discriminated Unions

Always use type guards when accessing event-specific properties:

```typescript
it('should verify treeUpdated event payload', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');

  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');

  // Type guard for discriminated union
  if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
    // TypeScript now knows treeUpdatedEvent has 'root' property
    expect(treeUpdatedEvent.root).toBe(workflow.getNode());
    expect(treeUpdatedEvent.root.id).toBe(workflow.id);
  } else {
    fail('treeUpdated event not found');
  }
});
```

### 4.3 Event Property Matching

Use `toMatchObject()` for partial event property matching:

```typescript
it('should emit event with expected properties', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.triggerEvent();

  const event = events.find(e => e.type === 'childAttached');
  expect(event).toMatchObject({
    type: 'childAttached',
    parentId: workflow.id,
    child: expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
    }),
  });
});
```

### 4.4 Multiple Event Verification

Verify multiple events are emitted in sequence:

```typescript
it('should emit both childAttached and treeUpdated', () => {
  const events: WorkflowEvent[] = [];

  parent.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  parent.attachChild(child);

  const childAttachedEvent = events.find(e => e.type === 'childAttached');
  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');

  expect(childAttachedEvent).toBeDefined();
  expect(treeUpdatedEvent).toBeDefined();
});
```

---

## 5. Type-Safe Event Testing

### 5.1 TypeScript Type Guards

Create reusable type guards for discriminated unions:

```typescript
// Type guard function
function isTreeUpdatedEvent(event: WorkflowEvent): event is TreeUpdatedEvent {
  return event.type === 'treeUpdated';
}

// Usage in test
it('should use type guard for type narrowing', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');

  const treeUpdatedEvent = events.find(isTreeUpdatedEvent);
  expect(treeUpdatedEvent).toBeDefined();

  if (treeUpdatedEvent) {
    // TypeScript knows this is TreeUpdatedEvent
    expect(treeUpdatedEvent.root.id).toBe(workflow.id);
  }
});
```

### 5.2 Type-Specific Event Arrays

Capture only specific event types:

```typescript
it('should capture only treeUpdated events', () => {
  const treeUpdatedEvents: TreeUpdatedEvent[] = [];

  workflow.addObserver({
    onEvent: (event) => {
      if (event.type === 'treeUpdated') {
        treeUpdatedEvents.push(event);
      }
    },
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');
  workflow.attachChild(child);

  expect(treeUpdatedEvents).toHaveLength(2);
  expect(treeUpdatedEvents[0].root.id).toBe(workflow.id);
});
```

### 5.3 Event Type Assertion Helpers

Create helper functions for common assertions:

```typescript
function expectEventOfType<T extends WorkflowEvent>(
  events: WorkflowEvent[],
  type: T['type']
): T {
  const event = events.find(e => e.type === type);
  if (!event) {
    throw new Error(`Expected event of type '${type}' but none found`);
  }
  return event as T;
}

// Usage
it('should use helper for event assertion', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');

  const treeUpdatedEvent = expectEventOfType<TreeUpdatedEvent>(events, 'treeUpdated');
  expect(treeUpdatedEvent.root.id).toBe(workflow.id);
});
```

---

## 6. Async Event Testing

### 6.1 Promise-Based Event Testing

For events emitted after async operations:

```typescript
it('should emit event after async operation', async () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Await async operation
  await workflow.asyncMethodThatEmitsEvent();

  const event = events.find(e => e.type === 'asyncEvent');
  expect(event).toBeDefined();
});
```

### 6.2 Event Emission in Promise Chains

Test events in promise chains:

```typescript
it('should emit events in correct order during promise chain', async () => {
  const events: WorkflowEvent[] = [];
  const callOrder: string[] = [];

  workflow.addObserver({
    onEvent: (e) => {
      callOrder.push('onEvent');
      events.push(e);
    },
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {
      callOrder.push('onTreeChanged');
    },
  });

  await workflow
    .step1()
    .then(() => workflow.step2())
    .then(() => workflow.step3());

  expect(callOrder).toEqual([
    'onEvent', 'onTreeChanged', // step1
    'onEvent', 'onTreeChanged', // step2
    'onEvent', 'onTreeChanged', // step3
  ]);
});
```

### 6.3 Async Event Verification with waitFor

For events that may be delayed:

```typescript
import { waitFor } from 'vitest';

it('should verify event within timeout', async () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Trigger async operation
  workflow.delayedEventEmission();

  // Wait for event to be captured
  await waitFor(
    () => {
      const event = events.find(e => e.type === 'delayedEvent');
      expect(event).toBeDefined();
    },
    { timeout: 1000 }
  );
});
```

### 6.4 Async Observer Error Handling

Test async errors in observers:

```typescript
it('should handle async observer errors gracefully', async () => {
  const asyncObserver: WorkflowObserver = {
    onLog: async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('Async error');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(asyncObserver);

  // Should not throw
  await expect(workflow.asyncMethod()).resolves.not.toThrow();

  // Verify error was logged
  const errorLog = workflow.node.logs.find(
    log => log.message === 'Observer onLog error'
  );
  expect(errorLog).toBeDefined();
});
```

---

## 7. Mock/Spy Patterns

### 7.1 Console Mocking

Mock console methods for verification:

```typescript
it('should log error message to console', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error')
    .mockImplementation(() => {});

  try {
    workflow.methodThatLogsError();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('error')
    );
  } finally {
    consoleErrorSpy.mockRestore();
  }
});
```

### 7.2 Method Spying

Spy on object methods to verify calls:

```typescript
it('should call onTreeChanged when tree updates', () => {
  const onTreeChangedSpy = vi.fn();

  workflow.addObserver({
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: onTreeChangedSpy,
  });

  workflow.attachChild(child);

  expect(onTreeChangedSpy).toHaveBeenCalledWith(workflow.getNode());
  expect(onTreeChangedSpy).toHaveBeenCalledTimes(1);
});
```

### 7.3 Private Method Testing (When Necessary)

Access private methods for testing (use sparingly):

```typescript
it('should test private emitEvent method', () => {
  const workflow = new Workflow('Test');

  // Access private method for testing
  const emitEvent = (workflow as any).emitEvent.bind(workflow);

  const onTreeChangedSpy = vi.fn();
  (workflow as any).getRootObservers = () => [{
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: onTreeChangedSpy,
  }];

  emitEvent({ type: 'treeUpdated', root: workflow.node });

  expect(onTreeChangedSpy).toHaveBeenCalled();
});
```

**Caution:** Only use this pattern when testing implementation details is absolutely necessary.

### 7.4 Mock Restoration

Always restore mocks in cleanup:

```typescript
describe('Event Testing with Mocks', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should verify console error', () => {
    // Test implementation
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
```

---

## 8. Event Order Testing

### 8.1 Call Order Tracking with Arrays

Track the order of observer calls:

```typescript
it('should call onEvent before onTreeChanged', () => {
  const callOrder: string[] = [];

  workflow.addObserver({
    onLog: () => {},
    onEvent: () => callOrder.push('onEvent'),
    onStateUpdated: () => {},
    onTreeChanged: () => callOrder.push('onTreeChanged'),
  });

  workflow.attachChild(child);

  expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
});
```

### 8.2 Sequential Event Verification

Verify events are emitted in correct sequence:

```typescript
it('should emit events in correct order', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.performMultipleOperations();

  // Verify event order
  expect(events[0].type).toBe('firstEvent');
  expect(events[1].type).toBe('secondEvent');
  expect(events[2].type).toBe('thirdEvent');
});
```

### 8.3 Event Sequence Validation with Timestamps

If events include timestamps, verify chronological order:

```typescript
it('should emit events with increasing timestamps', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.emitMultipleEvents();

  for (let i = 1; i < events.length; i++) {
    expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
  }
});
```

### 8.4 Interleaved Event Testing

Test events from multiple sources:

```typescript
it('should maintain correct order with multiple event sources', () => {
  const events: WorkflowEvent[] = [];

  root.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Trigger events from different sources
  child1.setStatus('running');
  child2.setStatus('running');
  root.setStatus('running');

  // Verify order based on event flow
  expect(events[0].type).toBe('stateUpdated'); // child1
  expect(events[1].type).toBe('stateUpdated'); // child2
  expect(events[2].type).toBe('stateUpdated'); // root
  expect(events[3].type).toBe('treeUpdated');  // final tree update
});
```

---

## 9. Error Handling in Event Tests

### 9.1 Observer Error Isolation

Verify errors in observers don't crash the system:

```typescript
it('should not crash when observer throws error', () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => { throw new Error('Observer error'); },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(throwingObserver);

  // Should not throw
  expect(() => {
    workflow.triggerEvent();
  }).not.toThrow();

  // Verify error was logged
  const errorLog = workflow.node.logs.find(
    log => log.message === 'Observer onLog error'
  );
  expect(errorLog).toBeDefined();
});
```

### 9.2 Multiple Observer Error Handling

Test that errors in one observer don't affect others:

```typescript
it('should continue notifying observers after one throws', () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => { throw new Error('Error'); },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => { observer2Called = true; },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => { observer3Called = true; },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(throwingObserver);
  workflow.addObserver(workingObserver2);
  workflow.addObserver(workingObserver3);

  workflow.triggerEvent();

  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);
});
```

### 9.3 Error Event Verification

Verify error events are emitted correctly:

```typescript
it('should emit error event with correct payload', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.methodThatEmitsError();

  const errorEvent = events.find(e => e.type === 'error');
  expect(errorEvent).toBeDefined();

  if (errorEvent && errorEvent.type === 'error') {
    expect(errorEvent.error.message).toBe('Expected error');
    expect(errorEvent.error.workflowId).toBe(workflow.id);
  }
});
```

### 9.4 Recursive Error Prevention

Verify infinite recursion is prevented:

```typescript
it('should prevent infinite recursion in observer errors', () => {
  let callCount = 0;
  const maxCalls = 10;

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

  workflow.addObserver(throwingObserver);

  workflow.triggerEvent();

  // Should only call once (original) + one error log, then stop
  expect(callCount).toBe(1);
});
```

---

## 10. Performance Considerations

### 10.1 Clear Event Arrays Between Tests

Prevent test pollution by clearing arrays:

```typescript
describe('Event Testing', () => {
  const events: WorkflowEvent[] = [];

  beforeEach(() => {
    events.length = 0; // Clear before each test
  });

  it('should not have events from previous tests', () => {
    workflow.addObserver({
      onEvent: (e) => events.push(e),
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    workflow.triggerEvent();

    expect(events.length).toBe(1);
  });
});
```

### 10.2 Mid-Test Array Clearing

Clear arrays to isolate specific operations:

```typescript
it('should only track events after clearing', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // First operation
  workflow.operation1();
  expect(events.length).toBeGreaterThan(0);

  // Clear to track only operation2
  events.length = 0;

  // Second operation
  workflow.operation2();
  expect(events.length).toBeGreaterThan(0);
});
```

### 10.3 Avoid Expensive Operations in Tests

Don't test event performance in unit tests:

```typescript
// ❌ Bad: Tests performance in unit test
it('should emit 10000 events quickly', () => {
  for (let i = 0; i < 10000; i++) {
    workflow.triggerEvent();
  }
  // This is slow and not a unit test concern
});

// ✅ Good: Tests correctness
it('should emit event for each operation', () => {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.operation1();
  workflow.operation2();
  workflow.operation3();

  expect(events.length).toBe(3);
});
```

### 10.4 Use Benchmarks for Performance Tests

Use separate benchmark files for performance testing:

```typescript
// attachChild-performance.test.ts (separate file)
import { bench, describe } from 'vitest';

describe('attachChild performance', () => {
  bench('should attach child quickly', () => {
    const parent = new Workflow('Parent');
    const child = new Workflow('Child');
    parent.attachChild(child);
  });
});
```

---

## 11. Test Templates

### 11.1 Basic Event Emission Template

```typescript
describe('Event Emission Tests', () => {
  it('should emit [EVENT_NAME] event', () => {
    // ARRANGE
    const events: WorkflowEvent[] = [];
    const subject = new SubjectUnderTest();

    subject.addObserver({
      onEvent: (e) => events.push(e),
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    // ACT
    subject.triggerEvent();

    // ASSERT
    const targetEvent = events.find(e => e.type === 'EVENT_NAME');
    expect(targetEvent).toBeDefined();

    if (targetEvent && targetEvent.type === 'EVENT_NAME') {
      expect(targetEvent.property).toBe(expectedValue);
    }
  });
});
```

### 11.2 Tree Update Event Template

```typescript
describe('Tree Update Events', () => {
  it('should emit treeUpdated when [OPERATION]', () => {
    // ARRANGE
    const root = new Workflow('Root');
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: WorkflowNode[] = [];

    root.addObserver({
      onEvent: (e) => events.push(e),
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: (rootNode) => treeChangedCalls.push(rootNode),
    });

    // ACT
    root.performOperation();

    // ASSERT: Event emitted
    const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    if (treeUpdatedEvent?.type === 'treeUpdated') {
      expect(treeUpdatedEvent.root.id).toBe(root.id);
    }

    // ASSERT: Callback invoked
    expect(treeChangedCalls).toHaveLength(1);
    expect(treeChangedCalls[0].id).toBe(root.id);
  });
});
```

### 11.3 Async Event Template

```typescript
describe('Async Event Tests', () => {
  it('should emit event after async operation', async () => {
    // ARRANGE
    const events: WorkflowEvent[] = [];

    workflow.addObserver({
      onEvent: (e) => events.push(e),
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    // ACT
    await workflow.asyncOperation();

    // ASSERT
    const event = events.find(e => e.type === 'asyncEvent');
    expect(event).toBeDefined();
  });
});
```

### 11.4 Event Order Template

```typescript
describe('Event Order Tests', () => {
  it('should emit events in correct order', () => {
    // ARRANGE
    const callOrder: string[] = [];

    workflow.addObserver({
      onEvent: () => callOrder.push('onEvent'),
      onLog: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => callOrder.push('onTreeChanged'),
    });

    // ACT
    workflow.triggerEvent();

    // ASSERT
    expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
  });
});
```

### 11.5 Error Handling Template

```typescript
describe('Event Error Handling', () => {
  it('should handle observer errors gracefully', () => {
    // ARRANGE
    const throwingObserver: WorkflowObserver = {
      onLog: () => { throw new Error('Observer error'); },
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(throwingObserver);

    // ACT & ASSERT
    expect(() => {
      workflow.triggerEvent();
    }).not.toThrow();

    const errorLog = workflow.node.logs.find(
      log => log.message === 'Observer onLog error'
    );
    expect(errorLog).toBeDefined();
  });
});
```

---

## 12. Anti-Patterns to Avoid

### 12.1 Don't Test Implementation Details

```typescript
// ❌ Bad: Tests internal implementation
it('should call emitEvent with specific parameters', () => {
  const emitEventSpy = vi.spyOn(workflow, 'emitEvent');
  workflow.attachChild(child);
  expect(emitEventSpy).toHaveBeenCalledWith({ /* internal object */ });
});

// ✅ Good: Tests observable behavior
it('should emit treeUpdated event', () => {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });
  workflow.attachChild(child);
  expect(events.find(e => e.type === 'treeUpdated')).toBeDefined();
});
```

### 12.2 Don't Use Global State

```typescript
// ❌ Bad: Shared state between tests
const events: WorkflowEvent[] = [];

it('test 1', () => {
  events.length = 0;
  // ...
});

it('test 2', () => {
  events.length = 0; // Must remember to clear
  // ...
});

// ✅ Good: Isolated state
it('test 1', () => {
  const events: WorkflowEvent[] = [];
  // ...
});

it('test 2', () => {
  const events: WorkflowEvent[] = [];
  // ...
});
```

### 12.3 Don't Ignore TypeScript Types

```typescript
// ❌ Bad: Type assertions everywhere
it('should emit event', () => {
  const events: any[] = [];
  events.push(event as any);
  expect((events[0] as any).type).toBe('treeUpdated');
});

// ✅ Good: Type-safe with guards
it('should emit event', () => {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const event = events.find(e => e.type === 'treeUpdated');
  if (event && event.type === 'treeUpdated') {
    expect(event.root.id).toBe(workflow.id);
  }
});
```

### 12.4 Don't Test Multiple Behaviors in One Test

```typescript
// ❌ Bad: Tests multiple things
it('should handle events and errors and state', () => {
  // Tests events, errors, and state all in one
});

// ✅ Good: Focused tests
it('should emit treeUpdated event', () => {
  // Tests only event emission
});

it('should log observer errors', () => {
  // Tests only error handling
});

it('should update state correctly', () => {
  // Tests only state changes
});
```

### 12.5 Don't Use Arbitrary Timeouts

```typescript
// ❌ Bad: Arbitrary timeout
it('should emit event', async () => {
  workflow.asyncOperation();
  await new Promise(resolve => setTimeout(resolve, 1000));
  // ...
}, 2000);

// ✅ Good: Proper async handling
it('should emit event', async () => {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.asyncOperation();

  const event = events.find(e => e.type === 'asyncEvent');
  expect(event).toBeDefined();
});
```

---

## Summary

### Key Principles

1. **Inline observer pattern** is the primary approach for event testing
2. **Type guards** are essential for discriminated union event types
3. **Call order verification** requires tracking arrays
4. **Spy patterns** complement inline observers for simple assertions
5. **Async testing** requires proper promise handling
6. **Error isolation** ensures observer errors don't crash tests
7. **State clearing** prevents test pollution

### Recommended Test Structure

```typescript
describe('Feature Event Tests', () => {
  describe('Event Emission', () => {
    it('should emit correct event type', () => { /* ... */ });
    it('should include correct event payload', () => { /* ... */ });
    it('should call observer callbacks', () => { /* ... */ });
  });

  describe('Event Order', () => {
    it('should call onEvent before onTreeChanged', () => { /* ... */ });
    it('should emit events in sequence', () => { /* ... */ });
  });

  describe('Error Handling', () => {
    it('should handle observer errors gracefully', () => { /* ... */ });
    it('should continue notifying other observers', () => { /* ... */ });
  });
});
```

### Quick Reference

| Pattern | When to Use |
|---------|-------------|
| Inline observer with arrays | Inspecting event payloads |
| `vi.fn()` spies | Simple call count verification |
| `vi.spyOn()` | Spying on existing methods |
| Type guards | Discriminated union types |
| Call order arrays | Verifying execution order |
| Async/await | Promise-based events |
| `waitFor` | Delayed event verification |
| `toMatchObject` | Partial event matching |

---

**End of Research Document**
