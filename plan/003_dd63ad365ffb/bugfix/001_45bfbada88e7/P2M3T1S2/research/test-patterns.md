# Test Patterns for treeUpdated Event Testing

**Research Date:** 2026-01-26
**Context:** Groundswell P2.M3.T1.S2 - Add treeUpdated emission to missing methods
**Goal:** Find how to test treeUpdated event emissions properly

---

## Executive Summary

This research documents existing test patterns for `treeUpdated` event testing in the Groundswell codebase. The focus is on understanding how events are verified, how observers are mocked, and what assertions are used to validate event emissions.

**Key Finding:** Tests use inline observer objects with event capture arrays to verify both `onEvent()` and `onTreeChanged()` callbacks.

---

## 1. Existing treeUpdated Test Examples

### 1.1 Tree Mirroring Integration Tests

**File:** `src/__tests__/integration/tree-mirroring.test.ts`

```typescript
it('should propagate treeUpdated events to root observers', () => {
  // ARRANGE: Create parent-child workflow tree
  const parent = new TDDOrchestrator('Parent');
  const child = new TDDOrchestrator('Child', parent);

  // ARRANGE: Set up observer with collection arrays
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: any[] = [];

  // ARRANGE: Create inline observer
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

  // ARRANGE: Attach observer to ROOT (parent, not child)
  parent.addObserver(observer);

  // ACT: Trigger status change on CHILD workflow
  child.setStatus('completed');

  // ASSERT: Verify treeUpdated event was received via onEvent
  const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();

  // ASSERT: Type guard for discriminated union + verify root node
  if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
    expect(treeUpdatedEvent.root).toBe(parent.getNode());
  }

  // ASSERT: Verify onTreeChanged callback was invoked
  expect(treeChangedCalls).toHaveLength(1);
  expect(treeChangedCalls[0]).toBe(parent.getNode());
});
```

### 1.2 Child Detach Event Testing

**File:** `src/__tests__/unit/workflow-emitEvent-childDetached.test.ts`

```typescript
it('should call onTreeChanged() when childDetached event is emitted', () => {
  // Arrange: Create parent with observer tracking callbacks
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];
  const treeChanges: any[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChanges.push(root),
  };

  parent.addObserver(observer);

  // Act: Detach child (which emits childDetached event)
  const child = new SimpleWorkflow('Child', parent);
  events.length = 0; // Clear attachChild events
  treeChanges.length = 0; // Clear attachChild tree changes

  parent.detachChild(child);

  // Assert: Verify childDetached event was emitted
  const detachEvent = events.find((e) => e.type === 'childDetached');
  expect(detachEvent).toBeDefined();
  expect(detachEvent?.type === 'childDetached' && detachEvent.parentId).toBe(parent.id);

  // CRITICAL ASSERTION: onTreeChanged() must be called
  expect(treeChanges.length).toBe(1);
  expect(treeChanges[0]).toBe(parent.getNode()); // Receives root node
});
```

---

## 2. Event Testing Patterns

### 2.1 Observer Setup Pattern

```typescript
// Create event capture arrays
const events: WorkflowEvent[] = [];
const treeChangedCalls: any[] = [];

// Create observer that captures events
const observer: WorkflowObserver = {
  onLog: () => {}, // Empty - not testing logs
  onEvent: (event) => events.push(event), // Capture events
  onStateUpdated: () => {}, // Empty - not testing state updates
  onTreeChanged: (root) => treeChangedCalls.push(root), // Capture tree changes
};

// Attach observer to workflow (typically the root)
workflow.addObserver(observer);
```

### 2.2 Event Verification Pattern

```typescript
// Find specific event in captured events
const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeDefined();

// Type guard for discriminated union
if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
  expect(treeUpdatedEvent.root).toBe(expectedRootNode);
}

// Verify onTreeChanged callback was invoked
expect(treeChangedCalls).toHaveLength(1);
expect(treeChangedCalls[0]).toBe(expectedRootNode);
```

### 2.3 Event Call Order Testing

```typescript
// Track call order
const callOrder: string[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: () => callOrder.push('onEvent'),
  onStateUpdated: () => {},
  onTreeChanged: () => callOrder.push('onTreeChanged'),
};

// Act: Trigger event
parent.detachChild(child);

// Assert: Verify order
expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
```

---

## 3. Available Test Utilities

### 3.1 Tree Verification Helpers

**File:** `src/__tests__/helpers/tree-verification.ts`

```typescript
import {
  collectAllNodes,
  validateTreeConsistency,
  verifyBidirectionalLink,
  verifyTreeMirror,
} from '../helpers/tree-verification.js';

// Use for validating tree structure after events
const errors = validateTreeConsistency(rootWorkflow);
expect(errors).toHaveLength(0);
```

### 3.2 SimpleWorkflow Test Class

Common pattern used across tests:
```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
```

### 3.3 Mock and Spy Patterns

**File:** `src/__tests__/unit/observable.test.ts`

```typescript
import { vi } from 'vitest';

// Mock console methods for tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock observer that throws errors
const throwingObserver: WorkflowObserver = {
  onEvent: () => {
    throw new Error('Observer error');
  },
  onLog: () => {},
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

---

## 4. How to Verify treeUpdated Emission in Tests

### 4.1 Direct Event Testing

Test that `treeUpdated` events are emitted when state changes:

```typescript
it('should emit treeUpdated when setStatus is called', () => {
  const workflow = new SimpleWorkflow('Test');
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  workflow.setStatus('running');

  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
  expect(treeUpdatedEvent?.type).toBe('treeUpdated');
  expect(treeUpdatedEvent?.root).toBe(workflow.getNode());
});
```

### 4.2 Observer Callback Testing

Test that `onTreeChanged` is called appropriately:

```typescript
it('should call onTreeChanged when child is attached', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child');
  const treeChangedRoots: any[] = [];

  parent.addObserver({
    onLog: () => {},
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedRoots.push(root),
  });

  parent.attachChild(child);

  expect(treeChangedRoots).toHaveLength(1);
  expect(treeChangedRoots[0]).toBe(parent.getNode());
});
```

### 4.3 Multi-level Hierarchy Testing

Test event propagation through complex hierarchies:

```typescript
it('should propagate treeUpdated from grandchild to root', () => {
  const root = new SimpleWorkflow('Root');
  const child = new SimpleWorkflow('Child', root);
  const grandchild = new SimpleWorkflow('Grandchild', child);

  const rootEvents: WorkflowEvent[] = [];
  root.addObserver({
    onEvent: (e) => rootEvents.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  grandchild.setStatus('running');

  const treeUpdatedEvent = rootEvents.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
  if (treeUpdatedEvent?.type === 'treeUpdated') {
    expect(treeUpdatedEvent.root.id).toBe(root.id);
  }
});
```

---

## 5. Integration Test Patterns for Tree Consistency

### 5.1 Using WorkflowTreeDebugger

```typescript
it('should maintain tree consistency after reparenting', () => {
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  const debugger1 = new WorkflowTreeDebugger(parent1);
  const debugger2 = new WorkflowTreeDebugger(parent2);

  // Reparent
  parent1.detachChild(child);
  parent2.attachChild(child);

  // Verify tree structure
  const tree1 = debugger1.getTree();
  const tree2 = debugger2.getTree();

  expect(tree1.children).not.toContain(child.getNode());
  expect(tree2.children).toContain(child.getNode());
});
```

### 5.2 Error Handling in Events

```typescript
it('should handle observer errors gracefully', () => {
  const workflow = new SimpleWorkflow('Test');
  const throwingObserver: WorkflowObserver = {
    onEvent: () => {
      throw new Error('Observer failed');
    },
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  workflow.addObserver(throwingObserver);
  workflow.setStatus('running'); // Should not crash despite observer error

  // Verify error was logged but workflow continued
  const errorLog = workflow.node.logs.find(log =>
    log.message === 'Observer onEvent error'
  );
  expect(errorLog).toBeDefined();
});
```

---

## 6. Key Testing Principles

1. **Test Both `onEvent` and `onTreeChanged`**: Events should be captured via `onEvent` and callbacks via `onTreeChanged`
2. **Verify Root Node**: `treeUpdated` events should always contain the root node of the tree
3. **Test Event Propagation**: Events from children should propagate to root observers
4. **Test Error Handling**: Ensure observer errors don't crash the workflow
5. **Use Type Guards**: Always verify event types with proper discriminated union checks
6. **Clear State Between Tests**: Reset event arrays and call arrays between test actions
7. **Test Call Order**: Verify `onEvent` is called before `onTreeChanged` when applicable

---

## 7. Test Template for attachChild treeUpdated

```typescript
it('should emit treeUpdated when child is attached', () => {
  // Arrange
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child');
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: WorkflowNode[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

  parent.addObserver(observer);

  // Act
  parent.attachChild(child);

  // Assert: childAttached event emitted
  const attachedEvent = events.find(e => e.type === 'childAttached');
  expect(attachedEvent).toBeDefined();
  expect(attachedEvent?.type === 'childAttached' && attachedEvent.child.id).toBe(child.id);

  // Assert: treeUpdated event emitted
  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
  if (treeUpdatedEvent?.type === 'treeUpdated') {
    expect(treeUpdatedEvent.root.id).toBe(parent.id);
  }

  // Assert: onTreeChanged called
  expect(treeChangedCalls).toHaveLength(1);
  expect(treeChangedCalls[0].id).toBe(parent.id);
});
```

---

## 8. Test Template for detachChild treeUpdated

```typescript
it('should emit treeUpdated when child is detached', () => {
  // Arrange
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: WorkflowNode[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

  parent.addObserver(observer);

  // Clear events from constructor/attachChild
  events.length = 0;
  treeChangedCalls.length = 0;

  // Act
  parent.detachChild(child);

  // Assert: childDetached event emitted
  const detachedEvent = events.find(e => e.type === 'childDetached');
  expect(detachedEvent).toBeDefined();
  expect(detachedEvent?.type === 'childDetached' && detachedEvent.childId).toBe(child.id);

  // Assert: treeUpdated event emitted
  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
  if (treeUpdatedEvent?.type === 'treeUpdated') {
    expect(treeUpdatedEvent.root.id).toBe(parent.id);
  }

  // Assert: onTreeChanged called
  expect(treeChangedCalls).toHaveLength(1);
  expect(treeChangedCalls[0].id).toBe(parent.id);
});
```

---

## 9. Summary

The Groundswell codebase uses a consistent pattern for testing event emissions:

1. **Inline Observer Objects**: Create observers inline in tests with capture arrays
2. **Dual Verification**: Verify both `onEvent()` and `onTreeChanged()` are called
3. **Type Guards**: Use discriminated union type guards for event type checking
4. **State Clearing**: Clear capture arrays between test actions to isolate behavior
5. **Root Verification**: Always verify the `root` property contains the correct root node

When adding tests for new treeUpdated emissions in `attachChild()` and `detachChild()`, follow the templates in sections 7 and 8.

---

**End of Research Document**
