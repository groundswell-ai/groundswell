# treeUpdated Event Patterns Research

**Research Date**: January 26, 2026
**Purpose**: Document all locations where treeUpdated event is emitted and consumed

---

## Executive Summary

This research documents the complete lifecycle of the `treeUpdated` event: where it's emitted, where it's consumed, and what patterns exist in the codebase.

**Key Findings**:
- **Emission locations**: Only 2 methods directly emit treeUpdated
- **Consumption locations**: 2 primary consumers (TreeDebugger, emitEvent)
- **Missing emissions**: 2 methods should emit but don't (attachChild, detachChild)

---

## treeUpdated Event Definition

From `src/types/events.ts` line 25:

```typescript
type WorkflowEvent =
  // ... other events ...
  | { type: 'treeUpdated'; root: WorkflowNode }
```

**Key Characteristics**:
- Event type: `'treeUpdated'`
- Payload: `{ root: WorkflowNode }`
- Semantics: Signals that the entire tree structure has changed
- Difference: Unlike other events that use `{ node }`, this uses `{ root }`

---

## Event Emission Locations

### 1. setStatus() Method

**File**: `src/core/workflow.ts`
**Line**: 775-778

```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;
  this.node.status = status;
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**When Emitted**: After workflow status changes
**Frequency**: Multiple times during workflow lifecycle (idle → running → completed/failed)
**Payload**: Root node of the workflow tree

### 2. snapshotState() Method

**File**: `src/core/workflow.ts`
**Line**: 452-473

```typescript
public snapshotState(): void {
  const snapshot = getObservedState(this);
  this.node.stateSnapshot = snapshot;

  // Notify observers
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onStateUpdated(this.node);
    } catch (err) {
      this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id });
    }
  }

  // Emit snapshot event
  this.emitEvent({
    type: 'stateSnapshot',
    node: this.node,
  });

  // Emit treeUpdated event to trigger tree debugger rebuild
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**When Emitted**: After workflow state is captured
**Frequency**: On explicit state snapshots, during restart operations
**Note**: Emits BOTH `stateSnapshot` AND `treeUpdated` events
**Comment in code**: "Emit treeUpdated event to trigger tree debugger rebuild"

---

## Missing Emissions (Bug Analysis)

### 3. attachChild() - SHOULD EMIT BUT DOESN'T

**File**: `src/core/workflow.ts`
**Line**: 334-372

```typescript
public attachChild(child: Workflow): void {
  // ... validation logic ...

  if (child.parent === null) {
    child.parent = this;
    child.node.parent = this.node;
  }

  this.children.push(child);
  this.node.children.push(child.node);

  // Emit child attached event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });

  // MISSING: Should emit treeUpdated here!
  // this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Why This Matters**:
- Adding a child changes the entire tree topology
- Tree structure grows: parent → [children + newChild]
- Observers need to rebuild their tree representation
- Without treeUpdated, TreeDebugger shows stale state

### 4. detachChild() - SHOULD EMIT BUT DOESN'T

**File**: `src/core/workflow.ts`
**Line**: 397-425

```typescript
public detachChild(child: Workflow): void {
  // ... validation and removal logic ...

  this.children.splice(index, 1);
  this.node.children.splice(nodeIndex, 1);
  child.parent = null;
  child.node.parent = null;

  // Emit childDetached event
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });

  // MISSING: Should emit treeUpdated here!
  // this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Why This Matters**:
- Removing a child changes the entire tree topology
- Tree structure shrinks: parent → [children - removedChild]
- Observers need to rebuild their tree representation
- Without treeUpdated, TreeDebugger shows stale state

---

## Event Consumption Locations

### 1. emitEvent() - Event Router

**File**: `src/core/workflow.ts`
**Line**: 431-450

```typescript
public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);

      // Also notify tree changed for tree update events
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged(this.getRoot().node);
      }
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

**Behavior**:
- Adds event to node's event history
- Notifies all root observers via `onEvent()`
- For structural events (treeUpdated, childAttached, childDetached), also calls `onTreeChanged()`

**Key Pattern**:
```typescript
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged(this.getRoot().node);
}
```

This conditional check is what triggers observer tree rebuilds.

### 2. TreeDebugger - Visual Consumer

**File**: `src/debugger/tree-debugger.ts`
**Line**: 164

```typescript
case 'treeUpdated': {
  this.root = event.root;
  // Rebuild entire tree representation
  break;
}
```

**Behavior**:
- Subscribes to workflow events
- On `treeUpdated`, rebuilds the entire tree visualization
- This is how the CLI debugger shows real-time workflow state

**Impact of Missing Emissions**:
Without treeUpdated from attachChild/detachChild, the debugger doesn't rebuild when children are added/removed.

### 3. EventReplayer - Event History Consumer

**File**: `src/debugger/event-replayer.ts`
**Line**: 25-27 (event categorization comment)

```typescript
// Event categorization for replay:
// - Structural events: childAttached, childDetached, treeUpdated
// - State events: stepStart, stepEnd, error, etc.
// - Metadata events: taskStart, taskEnd, etc.
```

**Behavior**:
- Categorizes events for selective replay
- Treats `treeUpdated` as a structural event
- Replays structural events to rebuild tree topology

**Impact of Missing Emissions**:
Incomplete event history leads to incorrect replay results.

---

## Event Flow Diagrams

### Current Flow (Incomplete)

```
User calls attachChild(child)
  ↓
Workflow.children.push(child)
  ↓
Workflow.node.children.push(child.node)
  ↓
child.parent = this
child.node.parent = this.node
  ↓
emitEvent({ type: 'childAttached', ... })
  ↓
observers.onEvent(childAttached)
  ↓
observers.onTreeChanged(root)  ← This IS called
  ↓
TreeDebugger rebuilds  ← This happens via childAttached
```

**Problem**: TreeDebugger rebuilds via `childAttached` event, but this is inconsistent with other structural changes. Some rebuilds happen, some don't.

### Desired Flow (Complete)

```
User calls attachChild(child)
  ↓
Workflow.children.push(child)
  ↓
Workflow.node.children.push(child.node)
  ↓
child.parent = this
child.node.parent = this.node
  ↓
emitEvent({ type: 'childAttached', ... })
  ↓
emitEvent({ type: 'treeUpdated', root: ... })  ← ADD THIS
  ↓
observers.onEvent(childAttached)
  ↓
observers.onEvent(treeUpdated)  ← ALSO call this
  ↓
observers.onTreeChanged(root)  ← Called TWICE (once per event)
  ↓
TreeDebugger rebuilds  ← Consistent behavior
```

**Why treeUpdated is Better**:
- Single, consistent signal for "tree structure changed"
- Works for ANY tree modification (attach, detach, reparent, etc.)
- Matches PRD requirement: "1:1 tree mirror" via treeUpdated events

---

## Pattern Analysis

### Correct Pattern (setStatus, snapshotState)

```typescript
// 1. Modify state
this.status = newStatus;
this.node.status = newStatus;

// 2. Emit treeUpdated
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Pattern**: State change → Immediate treeUpdated emission

### Incorrect Pattern (attachChild, detachChild)

```typescript
// 1. Modify state (4 properties!)
this.children.push(child);
this.node.children.push(child.node);
child.parent = this;
child.node.parent = this.node;

// 2. Emit specific event only
this.emitEvent({ type: 'childAttached', ... });

// 3. MISSING: No treeUpdated emission!
```

**Problem**: Structural changes without treeUpdated notification

### Fix Pattern

```typescript
// 1. Modify state
this.children.push(child);
this.node.children.push(child.node);
child.parent = this;
child.node.parent = this.node;

// 2. Emit specific event
this.emitEvent({ type: 'childAttached', ... });

// 3. ALSO emit treeUpdated
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Solution**: Emit BOTH specific event AND treeUpdated

---

## Test Coverage Analysis

### Existing Tests

From `src/__tests__/integration/tree-mirroring.test.ts`:

```typescript
test('maintains 1:1 mirror between workflow tree and node tree', () => {
  // Tests dual tree synchronization
  // Verifies parent/children relationships are correct
  // Does NOT verify treeUpdated emission
});
```

**Gap**: No tests verify that treeUpdated is emitted for structural changes.

### Needed Tests

```typescript
test('attachChild emits treeUpdated event', () => {
  const parent = new Workflow('Parent');
  const child = new Workflow('Child');
  let treeUpdatedReceived = false;

  parent.addObserver({
    onEvent: (event) => {
      if (event.type === 'treeUpdated') {
        treeUpdatedReceived = true;
      }
    },
    onTreeChanged: () => {},
    onStateUpdated: () => {},
    onLog: () => {}
  });

  parent.attachChild(child);
  expect(treeUpdatedReceived).toBe(true);
});

test('detachChild emits treeUpdated event', () => {
  const parent = new Workflow('Parent');
  const child = new Workflow('Child', parent);
  let treeUpdatedReceived = false;

  parent.addObserver({
    onEvent: (event) => {
      if (event.type === 'treeUpdated') {
        treeUpdatedReceived = true;
      }
    },
    onTreeChanged: () => {},
    onStateUpdated: () => {},
    onLog: () => {}
  });

  parent.detachChild(child);
  expect(treeUpdatedReceived).toBe(true);
});
```

---

## Recommendations

### Immediate Fixes

1. **attachChild()**: Add treeUpdated emission after line 372
2. **detachChild()**: Add treeUpdated emission after line 425

### Consistency Improvements

3. **Helper Method**: Consider adding `notifyTreeUpdated()` helper
4. **Documentation**: Comment why both specific event AND treeUpdated are needed
5. **Testing**: Add unit tests for treeUpdated emission

### Code Quality

6. **Pattern**: Follow setStatus() pattern for all state-changing methods
7. **Comments**: Add explanatory comments like snapshotState() has

---

## Conclusion

The `treeUpdated` event is emitted correctly for status and snapshot changes, but **missing for structural changes** (attachChild, detachChild). This breaks the "1:1 tree mirror" guarantee for observers and causes stale UI state in the TreeDebugger.

**Fix**: Add one line to each method: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });`

**Impact**: Restores consistent observer notifications for all tree modifications.
