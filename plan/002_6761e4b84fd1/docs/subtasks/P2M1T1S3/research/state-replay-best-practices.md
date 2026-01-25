# State Replay Best Practices for Workflow Systems

## Executive Summary

This document provides best practices for implementing node state event replay in a workflow system, specifically for the Groundswell project's `stateSnapshot`, `stepStart/stepEnd`, `error`, and `taskStart/taskEnd` events.

## Table of Contents

1. [Event Sourcing Best Practices](#1-event-sourcing-best-practices)
2. [Immutable vs Mutable State](#2-immutable-vs-mutable-state)
3. [Time-Travel Debugging Patterns](#3-time-travel-debugging-patterns)
4. [Handling Missing/Out-of-Order Events](#4-handling-missingout-of-order-events)
5. [State Conflict Resolution](#5-state-conflict-resolution)
6. [Validation Strategies](#6-validation-strategies)
7. [Performance Optimization](#7-performance-optimization)
8. [Error Handling Best Practices](#8-error-handling-best-practices)
9. [Testing Strategies](#9-testing-strategies)
10. [Common Pitfalls to Avoid](#10-common-pitfalls-to-avoid)

---

## 1. Event Sourcing Best Practices

### 1.1 Immutable Event Storage

**Principle**: Events are immutable facts about what happened.

```typescript
// Events should never be modified after creation
interface StateSnapshotEvent {
  type: 'stateSnapshot';
  node: WorkflowNode;
  timestamp?: number;  // Optional in Groundswell
}

// CORRECT: Never mutate event objects
function handleEvent(event: WorkflowEvent) {
  // Process event
  // DON'T do: event.timestamp = Date.now();
}

// INCORRECT: Mutating events
event.node.stateSnapshot = newValue;  // WRONG
```

**Best Practices**:
- Treat events as append-only log entries
- Create new events rather than modifying existing ones
- Use versioned event schemas for backward compatibility

### 1.2 State Rehydration Pattern (Reducer)

```typescript
type StateReducer<T> = (state: T, event: WorkflowEvent) => T;

function createWorkflowReducer(): StateReducer<Map<string, WorkflowNode>> {
  return (state, event) => {
    switch (event.type) {
      case 'stateSnapshot':
        return updateNodeSnapshot(state, event);
      case 'error':
        return addNodeError(state, event);
      case 'stepStart':
      case 'stepEnd':
        return updateNodeEvents(state, event);
      default:
        return state;
    }
  };
}

function updateNodeSnapshot(
  state: Map<string, WorkflowNode>,
  event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>
): Map<string, WorkflowNode> {
  const node = state.get(event.node.id);
  if (!node) return state;  // Or throw error

  // Create new state (immutable)
  const newState = new Map(state);
  newState.set(event.node.id, {
    ...node,
    stateSnapshot: event.node.stateSnapshot
  });
  return newState;
}
```

### 1.3 Snapshot Optimization

For large event streams, periodic snapshots optimize replay performance:

```typescript
class EventStreamWithSnapshots {
  private events: WorkflowEvent[] = [];
  private snapshots: WorkflowTree[] = [];

  addEvent(event: WorkflowEvent) {
    this.events.push(event);
    // Create snapshot every N events
    if (this.events.length % 100 === 0) {
      const snapshot = this.replayEvents([...this.events]);
      this.snapshots.push(snapshot);
    }
  }

  replayToEvent(index: number): WorkflowTree {
    // Find nearest snapshot before index
    const snapshotIndex = Math.floor(index / 100);
    const startFrom = snapshotIndex * 100;
    return this.replayEvents(this.events.slice(startFrom, index + 1));
  }
}
```

---

## 2. Immutable vs Mutable State in Event Replay

### 2.1 Mutable Updates (Groundswell Pattern)

Groundswell uses **mutable updates** via Map (more efficient):

```typescript
class WorkflowEventReplayer {
  private nodeMap = new Map<string, WorkflowNode>();

  private handleStateSnapshot(event: StateSnapshotEvent): void {
    const node = this.nodeMap.get(event.node.id);
    if (!node) {
      console.warn(`Node '${event.node.id}' not found`);
      return;
    }

    // MUTABLE UPDATE (OK for replay)
    node.stateSnapshot = event.node.stateSnapshot;
  }
}
```

**Why Mutable is OK Here**:
- Replayer creates fresh tree each time
- No shared state between replays
- More efficient than immutable copies

### 2.2 Immutable Updates (Alternative Pattern)

For shared state or functional approach:

```typescript
// Immutable update pattern
function updateNodeSnapshot(
  nodeMap: Map<string, WorkflowNode>,
  event: StateSnapshotEvent
): Map<string, WorkflowNode> {
  const node = nodeMap.get(event.node.id);
  if (!node) return nodeMap;

  const updatedNode = { ...node, stateSnapshot: event.node.stateSnapshot };
  const newMap = new Map(nodeMap);
  newMap.set(event.node.id, updatedNode);
  return newMap;
}
```

### 2.3 Deep Cloning Considerations

```typescript
// Use structuredClone for deep copying (modern API)
const clonedNode = structuredClone(event.node);

// For older environments:
const clonedNode = JSON.parse(JSON.stringify(event.node));

// AVOID shallow copy - creates shared references
const shallowCopy = { ...event.node };  // WRONG
```

**When to Clone**:
- **Clone**: When adding nodes from events (prevent mutation of event data)
- **Don't Clone**: When updating properties on existing nodes in nodeMap (mutable is fine)

---

## 3. Time-Travel Debugging Patterns

### 3.1 Event Stream Versioning

```typescript
interface VersionedEventProcessor {
  processEvent(event: WorkflowEvent): void;
  supportsVersion(version: number): boolean;
}

// Handle schema evolution
class EventReplayer {
  replay(events: WorkflowEvent[]): WorkflowNode {
    for (const event of events) {
      this.processEvent(event);
    }
    return this.root;
  }

  private processEvent(event: WorkflowEvent): void {
    // Normalize event if needed for version compatibility
    const normalizedEvent = this.normalizeEvent(event);
    this.handleEvent(normalizedEvent);
  }
}
```

### 3.2 Deterministic Replay

```typescript
class DeterministicReplayer {
  replay(events: WorkflowEvent[]): WorkflowNode {
    // Events should already be in order from event stream
    // Process sequentially for deterministic result

    for (const event of events) {
      try {
        this.handleEvent(event);
      } catch (error) {
        console.error(`Error processing event type '${event.type}':`, error);
        // Continue processing (don't fail entire replay)
      }
    }

    return this.root;
  }
}
```

---

## 4. Handling Missing/Out-of-Order Events

### 4.1 Missing Node Detection

```typescript
private handleStateSnapshot(event: StateSnapshotEvent): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Node not found - may be due to:
    // 1. Out-of-order events (stateSnapshot before childAttached)
    // 2. Missing structural events
    // 3. Corrupted event stream

    console.warn(
      `Node '${event.node.id}' not found during ${event.type} event. ` +
      `This may indicate out-of-order events or missing structural events.`
    );
    return;  // Skip this event
  }

  node.stateSnapshot = event.node.stateSnapshot;
}
```

### 4.2 Graceful Degradation Strategy

```typescript
class RobustEventReplayer {
  private warnings: ReplayWarning[] = [];

  replay(events: WorkflowEvent[]): WorkflowNode {
    for (const event of events) {
      try {
        this.handleEvent(event);
      } catch (error) {
        this.warnings.push({
          event: event.type,
          nodeId: this.getNodeId(event),
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue processing
      }
    }

    // Return result even with warnings
    return this.root;
  }

  private getNodeId(event: WorkflowEvent): string {
    // Extract node ID from various event types
    switch (event.type) {
      case 'stateSnapshot':
      case 'error':
      case 'stepStart':
      case 'stepEnd':
      case 'taskStart':
      case 'taskEnd':
        return event.node.id;
      case 'childAttached':
        return event.child.id;
      case 'childDetached':
        return event.childId;
      default:
        return 'unknown';
    }
  }
}
```

---

## 5. State Conflict Resolution

### 5.1 Multiple StateSnapshots for Same Node

**Strategy**: Last write wins (events are processed in order)

```typescript
// Event stream:
// 1. stateSnapshot: node1 = { count: 1 }
// 2. stateSnapshot: node1 = { count: 2 }
// 3. stateSnapshot: node1 = { count: 3 }

// Result: node1.stateSnapshot = { count: 3 } (last one)
```

**No conflict resolution needed** - events are processed sequentially, last write wins naturally.

### 5.2 State Snapshot Merging (Advanced)

If merging is desired (not typical):

```typescript
// NOT RECOMMENDED for Groundswell - last write wins is simpler
function mergeSnapshots(
  existing: SerializedWorkflowState,
  incoming: SerializedWorkflowState
): SerializedWorkflowState {
  return { ...existing, ...incoming };  // Shallow merge
}
```

---

## 6. Validation Strategies

### 6.1 Pre-Replay Validation

```typescript
class EventValidator {
  validate(events: WorkflowEvent[]): ValidationResult {
    const errors: string[] = [];

    for (const event of events) {
      // Check required fields
      if (!event.node?.id) {
        errors.push(`Event missing node ID: ${event.type}`);
      }

      // Check event-specific requirements
      if (event.type === 'stateSnapshot') {
        if (event.node.stateSnapshot === undefined) {
          errors.push(`stateSnapshot event missing snapshot data`);
        }
      }

      if (event.type === 'error') {
        if (!event.error?.message) {
          errors.push(`error event missing message`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 6.2 Post-Replay Validation

```typescript
class TreeValidator {
  validateState(root: WorkflowNode): StateValidationResult {
    const issues: string[] = [];

    // Check all nodes
    this.checkAllNodes(root, issues);

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private checkAllNodes(node: WorkflowNode, issues: string[]): void {
    // Check stateSnapshot is valid (if present)
    if (node.stateSnapshot !== null) {
      if (typeof node.stateSnapshot !== 'object') {
        issues.push(`Node ${node.id} has invalid stateSnapshot type`);
      }
    }

    // Check for error events
    const errorEvents = node.events.filter(e => e.type === 'error');
    if (errorEvents.length > 0) {
      // Verify error structure
      for (const errorEvent of errorEvents) {
        if (errorEvent.type === 'error' && !errorEvent.error.message) {
          issues.push(`Node ${node.id} has error event without message`);
        }
      }
    }

    // Recurse children
    for (const child of node.children) {
      this.checkAllNodes(child, issues);
    }
  }
}
```

---

## 7. Performance Optimization

### 7.1 O(1) Node Lookups

```typescript
class WorkflowEventReplayer {
  private nodeMap = new Map<string, WorkflowNode>();  // O(1) lookups

  private handleStateSnapshot(event: StateSnapshotEvent): void {
    // O(1) lookup - fast!
    const node = this.nodeMap.get(event.node.id);
    if (!node) {
      console.warn(`Node '${event.node.id}' not found`);
      return;
    }

    node.stateSnapshot = event.node.stateSnapshot;
  }
}
```

**Why Map vs Object**:
- Map provides O(1) lookups with any key type
- Object keys are limited to strings/symbols
- Map has better performance for frequent additions/deletions

### 7.2 Incremental Updates

```typescript
// Process events incrementally - don't rebuild entire tree on each event
for (const event of events) {
  this.handleEvent(event);  // Update only affected node
}

// AVOID: Rebuilding entire tree on each event
for (const event of events) {
  this.entireTree = this.rebuildTreeFromScratch(this.entireTree, event);  // SLOW
}
```

---

## 8. Error Handling Best Practices

### 8.1 Try-Catch Per Event

```typescript
replay(events: WorkflowEvent[]): WorkflowNode {
  for (const event of events) {
    try {
      this.handleEvent(event);
    } catch (error) {
      // Log but continue - one bad event shouldn't fail entire replay
      console.error(`Error processing ${event.type}:`, error);
    }
  }

  return this.root;
}
```

### 8.2 Error Recovery

```typescript
class RecoveryReplayer {
  replay(events: WorkflowEvent[]): ReplayResult {
    const processed: WorkflowEvent[] = [];
    const failed: FailedEvent[] = [];

    for (const event of events) {
      try {
        this.validateEvent(event);
        this.handleEvent(event);
        processed.push(event);
      } catch (error) {
        failed.push({
          event,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      success: failed.length === 0,
      tree: this.root,
      processedCount: processed.length,
      failedCount: failed.length,
      failedEvents: failed
    };
  }
}
```

---

## 9. Testing Strategies

### 9.1 Unit Test Pattern

```typescript
describe('WorkflowEventReplayer - State Events', () => {
  let replayer: WorkflowEventReplayer;

  beforeEach(() => {
    replayer = new WorkflowEventReplayer();
  });

  test('should apply stateSnapshot to node', () => {
    const events: WorkflowEvent[] = [
      createChildAttachedEvent('root', { id: 'node1', name: 'Node1', ... }),
      createStateSnapshotEvent('node1', { count: 42 })
    ];

    const tree = replayer.replay(events);

    expect(tree.stateSnapshot).toBeNull();  // Root has no snapshot
    const node1 = replayer.getNode('node1');
    expect(node1.stateSnapshot).toEqual({ count: 42 });
  });

  test('should handle error event for node', () => {
    const events: WorkflowEvent[] = [
      createChildAttachedEvent('root', { id: 'node1', name: 'Node1', ... }),
      createErrorEvent('node1', { message: 'Test error', ... })
    ];

    const tree = replayer.replay(events);
    const node1 = replayer.getNode('node1');

    const errorEvents = node1.events.filter(e => e.type === 'error');
    expect(errorEvents).toHaveLength(1);
    if (errorEvents[0].type === 'error') {
      expect(errorEvents[0].error.message).toBe('Test error');
    }
  });

  test('should handle missing node gracefully', () => {
    const events: WorkflowEvent[] = [
      createStateSnapshotEvent('nonexistent', { count: 1 })
    ];

    // Should not throw, just log warning
    expect(() => replayer.replay(events)).not.toThrow();
  });

  test('should overwrite stateSnapshot with latest value', () => {
    const events: WorkflowEvent[] = [
      createChildAttachedEvent('root', { id: 'node1', name: 'Node1', ... }),
      createStateSnapshotEvent('node1', { count: 1 }),
      createStateSnapshotEvent('node1', { count: 2 }),
      createStateSnapshotEvent('node1', { count: 3 })
    ];

    const tree = replayer.replay(events);
    const node1 = replayer.getNode('node1');

    expect(node1.stateSnapshot).toEqual({ count: 3 });  // Last write wins
  });
});
```

### 9.2 Integration Test Pattern

```typescript
describe('WorkflowEventReplayer - Integration', () => {
  test('should reconstruct complete workflow with state events', async () => {
    // Create real workflow, capture events
    const { workflow, events } = await createWorkflowWithState();

    // Replay events
    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(events);

    // Verify reconstructed tree matches original
    expect(tree.id).toBe(workflow.id);
    expect(tree.name).toBe(workflow.name);
    expect(tree.children.length).toBe(workflow.children.length);

    // Verify state snapshots preserved
    expect(tree.stateSnapshot).toEqual(workflow.stateSnapshot);
  });
});
```

---

## 10. Common Pitfalls to Avoid

### 10.1 Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Mutating event objects | Breaks immutability principle | Never modify events after creation |
| Throwing on missing node | Fails entire replay for one bad event | Log warning, continue processing |
| Deep cloning entire tree | O(n) copy on every event is slow | Clone only when adding nodes from events |
| Ignoring event order | Results in nondeterministic state | Process events sequentially in given order |
| Storing errors in new field | Doesn't match current system | Use existing `node.events[]` array |
| Forgetting null checks | Crashes on null stateSnapshot | Handle null gracefully |
| Synchronous processing in async context | Misses concurrent updates | Process events sequentially ( Groundswell is sync ) |

### 10.2 Performance Anti-Patterns

```typescript
// WRONG: Linear search for node
const node = tree.nodes.find(n => n.id === event.node.id);  // O(n)

// CORRECT: Map lookup
const node = this.nodeMap.get(event.node.id);  // O(1)
```

```typescript
// WRONG: Deep clone on every update
node.stateSnapshot = structuredClone(event.node.stateSnapshot);

// CORRECT: Direct assignment (cloning not needed for primitives)
node.stateSnapshot = event.node.stateSnapshot;
```

```typescript
// WRONG: Rebuild entire map on each event
this.nodeMap = this.buildMapFromTree(tree);

// CORRECT: Incremental updates
this.nodeMap.set(event.node.id, node);
```

---

## References

### External Resources

- [Event Sourcing Pattern - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Redux Reducer Pattern](https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers)
- [MDN: structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html#discriminated-unions)

### Related Groundswell Files

- `src/types/events.ts` - Event type definitions
- `src/types/workflow.ts` - WorkflowNode interface
- `src/types/error.ts` - WorkflowError interface
- `src/debugger/tree-debugger.ts` - Existing event handling patterns
- `src/core/workflow.ts` - Event emission patterns
