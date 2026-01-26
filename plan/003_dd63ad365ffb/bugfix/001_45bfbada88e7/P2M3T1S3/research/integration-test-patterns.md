# Integration Test Patterns Research

**Research Date:** January 26, 2026
**Context:** Groundswell P2.M3.T1.S3 - Research integration test patterns in the codebase
**Goal:** Document existing integration test patterns to follow for tree update consistency tests

---

## Executive Summary

This document analyzes 11 integration test files in `src/__tests__/integration/` to extract patterns for event emission testing, observer pattern testing, workflow state change testing, and multi-workflow testing.

### Test Files Found

1. **tree-mirroring.test.ts** - Tree mirroring and 1:1 correspondence validation
2. **observer-logging.test.ts** - Observer error handling and logging
3. **bidirectional-consistency.test.ts** - Bidirectional consistency between workflow and node trees
4. **workflow-reparenting.test.ts** - Reparenting observer propagation
5. **agent-workflow.test.ts** - Agent workflow integration and context tracking
6. **provider-agent.test.ts** - Agent → Provider → SDK flow integration
7. **provider-switching.test.ts** - Multi-provider configuration and switching
8. **parent-restart-decisions.test.ts** - Parent-child restart decision flow
9. **retry-integration.test.ts** - Retry behavior integration
10. **workflow-automatic-validation.test.ts** - Automatic AgentResponse validation
11. **agent-validation.test.ts** - Agent-response validation in workflows

---

## Key Testing Patterns

### 1. Event Emission Testing Pattern

**Primary pattern from tree-mirroring.test.ts:**

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
    onLog: () => {}, // Empty - not testing logs
    onEvent: (event) => events.push(event), // Capture events
    onStateUpdated: () => {}, // Empty - not testing state updates
    onTreeChanged: (root) => treeChangedCalls.push(root), // Capture tree changes
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

**Key Elements:**
- Inline observer object with capture arrays
- Observer attached to ROOT for tree-level events
- Type guard for discriminated union access
- Both `onEvent` and `onTreeChanged` verification

### 2. Event Type Filtering Pattern

```typescript
// Find specific event type
const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeDefined();

// Filter for specific event types
const stepStartEvents = events.filter(e => e.type === 'stepStart');
expect(stepStartEvents.length).toBeGreaterThan(0);
```

### 3. Event Order Validation Pattern

```typescript
// Capture event types in order
const eventTypes = events.map(e => e.type);
const stepStartIndex = eventTypes.indexOf('stepStart');
const errorIndex = eventTypes.indexOf('error');

// Verify chronological order
expect(stepStartIndex).toBeLessThan(errorIndex);
```

### 4. Event Property Validation Pattern

```typescript
// Verify specific event properties
const invalidEvent = events.find(e => e.type === 'invalidResponse');
expect(invalidEvent).toBeDefined();
expect(invalidEvent?.node).toBeDefined();
expect(invalidEvent?.node.id).toBeDefined();
expect(invalidEvent?.response).toBeDefined();
expect(invalidEvent?.agentId).toBe('unknown');
expect(invalidEvent?.errors).toBeDefined();
expect(invalidEvent?.timestamp).toBeGreaterThan(0);
```

---

## Observer Pattern Testing

### Observer Attachment and Detachment Pattern

```typescript
it('should propagate events to root observer', async () => {
  const orchestrator = new TDDOrchestrator('Root');
  (orchestrator as any).maxCycles = 1;

  const allEvents: WorkflowEvent[] = [];
  const allLogs: any[] = [];

  const observer: WorkflowObserver = {
    onLog: (entry) => allLogs.push(entry),
    onEvent: (event) => allEvents.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  orchestrator.addObserver(observer);

  try {
    await orchestrator.run();
  } catch {
    // May fail
  }

  // Events from child workflows should reach root
  expect(allLogs.length).toBeGreaterThan(0);
  expect(allEvents.length).toBeGreaterThan(0);

  // Should have events from both parent and child
  const parentEvents = allEvents.filter(
    (e) => 'node' in e && e.node.name === 'Root'
  );
  const childEvents = allEvents.filter(
    (e) => 'node' in e && e.node.name.startsWith('Cycle-')
  );

  expect(parentEvents.length).toBeGreaterThan(0);
  expect(childEvents.length).toBeGreaterThan(0);
});
```

### Observer Error Handling Pattern

```typescript
it('should handle observer errors gracefully', () => {
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

---

## Workflow State Change Testing

### Status Change Verification Pattern

```typescript
it('should emit treeUpdated when status changes', () => {
  const parent = new Workflow('Parent');
  const child = new Workflow('Child', parent);

  const events: WorkflowEvent[] = [];
  parent.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Act: Trigger status change
  child.setStatus('completed');

  // Assert: treeUpdated event emitted
  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();

  if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
    expect(treeUpdatedEvent.root.id).toBe(parent.id);
  }
});
```

### Bidirectional Consistency Verification Pattern

```typescript
// Helper functions from bidirectional-consistency.test.ts
function verifyBidirectionalLink(parent: Workflow, child: Workflow) {
  expect(child.parent).toBe(parent);
  expect(child.node.parent).toBe(parent.node);
  expect(parent.children).toContain(child);
  expect(parent.node.children).toContain(child.node);
}

function verifyTreeMirror(root: Workflow) {
  // Verify workflow tree and node tree match exactly
  expect(root.children.length).toBe(root.node.children.length);
  root.children.forEach((child, index) => {
    expect(child.node).toBe(root.node.children[index]);
  });
}

// Usage
verifyBidirectionalLink(parent, child);
verifyTreeMirror(parent);
```

---

## Multi-Workflow Testing Patterns

### Parent-Child Communication Pattern

```typescript
it('should receive child events at parent', async () => {
  const parent = new ParentWorkflow('Parent');
  const child = new ChildWorkflow('Child', parent);

  const events: WorkflowEvent[] = [];
  parent.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Act: Run child workflow
  try {
    await child.run();
  } catch {
    // Expected error
  }

  // Assert: Parent received child's events
  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThan(0);

  // Assert: Event is from child
  const childErrorEvent = errorEvents.find(e => e.node.name === 'Child');
  expect(childErrorEvent).toBeDefined();
});
```

### Observer Propagation During Reparenting Pattern

```typescript
it('should update observer propagation during reparenting', () => {
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  const parent1Events: WorkflowEvent[] = [];
  const parent2Events: WorkflowEvent[] = [];

  parent1.addObserver({
    onEvent: (e) => parent1Events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  parent2.addObserver({
    onEvent: (e) => parent2Events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Act: Reparent child
  parent1.detachChild(child);
  parent2.attachChild(child);

  // Assert: Only parent2 receives events after reparenting
  child.setStatus('completed');
  expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);
  expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(false);
});
```

---

## Test Structure Conventions

### Describe Block Organization

```typescript
describe('Tree Mirroring Integration', () => {
  it('should create 1:1 tree mirror of workflow execution', async () => {
    // Test implementation
  });

  it('should propagate events to root observer', async () => {
    // Test implementation
  });

  it('should include state snapshot on error', async () => {
    // Test implementation
  });

  it('should propagate treeUpdated events to root observers', () => {
    // Test implementation
  });
});
```

### Import Conventions

```typescript
import { describe, it, expect } from 'vitest';
import {
  TDDOrchestrator,
} from '../../examples/tdd-orchestrator.js';
import {
  WorkflowTreeDebugger,
  WorkflowEvent,
  WorkflowObserver,
} from '../../index.js';
```

---

## Best Practices Observed

### 1. Test Structure
- Use descriptive test names indicating the scenario
- Group related tests in nested describe blocks
- Arrange-Act-Assert pattern consistently applied
- Clear separation of concerns

### 2. Observer Setup
- Create observers inline for specific testing needs
- Use array collectors to capture events
- Verify both positive and negative cases
- Test observer propagation during structural changes

### 3. Event Verification
- Capture events using observer.onEvent callback
- Filter events by type for specific assertions
- Use type guards for discriminated union event types
- Verify event properties including timestamps and node references

### 4. Assertion Patterns
- Use specific assertions rather than general ones
- Verify both presence and absence of events
- Check event structure with optional chaining and type guards
- Include both quantitative (count) and qualitative (content) assertions

---

## treeUpdated Event Specific Patterns

### Existing treeUpdated Test Pattern

From tree-mirroring.test.ts:

```typescript
it('should propagate treeUpdated events to root observers', () => {
  // ARRANGE: Create parent-child workflow tree
  const parent = new TDDOrchestrator('Parent');
  const child = new TDDOrchestrator('Child', parent);

  // ARRANGE: Set up observer with collection arrays
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: any[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

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

---

## Conclusion

The integration test patterns in this codebase demonstrate a comprehensive approach to testing complex workflow systems. The key patterns to follow for P2.M3.T1.S3 are:

1. **Inline observer pattern** with capture arrays
2. **Type guards** for discriminated union event types
3. **Both onEvent and onTreeChanged verification**
4. **Observer attachment to root** for tree-level events
5. **Sequential operation testing** to verify multiple emissions

---

**End of Research Document**
