# Observer Patterns Analysis

**Research Date**: January 26, 2026
**Purpose**: Document the observer pattern implementation and tree change notification flow

---

## Executive Summary

This research documents the observer pattern implementation in the Groundswell workflow engine, focusing on how tree change notifications flow from state modifications to observer callbacks.

**Key Findings**:
- Observer interface has 4 callback methods
- Tree changes are notified via `onTreeChanged()` callback
- Event flow: state change → emitEvent() → observers.onEvent() → observers.onTreeChanged()
- Inconsistency: Some structural changes don't trigger `onTreeChanged()`

---

## Observer Interface Definition

From `src/types/index.ts` (approximate location based on import patterns):

```typescript
interface WorkflowObserver {
  onLog?(entry: LogEntry): void;
  onEvent?(event: WorkflowEvent): void;
  onStateUpdated?(node: WorkflowNode): void;
  onTreeChanged?(root: WorkflowNode): void;
}
```

**Callback Purposes**:

1. **onLog(entry)**: New log entry added to workflow
2. **onEvent(event)**: Any workflow event emitted
3. **onStateUpdated(node)**: Workflow state snapshot updated
4. **onTreeChanged(root)**: Tree structure changed (attach, detach, status change)

---

## Observer Registration

### addObserver() Method

**File**: `src/core/workflow.ts`
**Line**: 264-272

```typescript
public addObserver(observer: WorkflowObserver): void {
  // Check for duplicate observers
  if (this.observers.includes(observer)) {
    this.logger.warn('Observer already added', { observerId: observer.id });
    return;
  }

  this.observers.push(observer);
  this.logger.debug('Observer added', { observerId: observer.id, totalObservers: this.observers.length });
}
```

**Pattern**: Direct registration to workflow's observer array

### removeObserver() Method

**File**: `src/core/workflow.ts`
**Line**: 274-280

```typescript
public removeObserver(observer: WorkflowObserver): void {
  const index = this.observers.indexOf(observer);
  if (index === -1) {
    this.logger.warn('Observer not found', { observerId: observer.id });
    return;
  }

  this.observers.splice(index, 1);
  this.logger.debug('Observer removed', { observerId: observer.id });
}
```

**Pattern**: Direct removal from workflow's observer array

---

## Event Notification Flow

### getRootObservers() Pattern

**File**: `src/core/workflow.ts`
**Line**: 153-161

```typescript
private getRootObservers(): WorkflowObserver[] {
  // Traverse to root to get all observers
  let root: Workflow = this;
  while (root.parent) {
    root = root.parent;
  }
  return root.observers;
}
```

**Key Pattern**: Observers are always registered on the ROOT workflow
- Child workflows don't have their own observers
- All notifications flow up to root observers
- Ensures consistent event delivery across entire tree

### emitEvent() - The Notification Router

**File**: `src/core/workflow.ts`
**Line**: 431-450

```typescript
public emitEvent(event: WorkflowEvent): void {
  // Add to event history
  this.node.events.push(event);

  // Get all root observers
  const observers = this.getRootObservers();

  // Notify all observers
  for (const obs of observers) {
    try {
      // First callback: onEvent (called for ALL events)
      obs.onEvent?.(event);

      // Second callback: onTreeChanged (called ONLY for structural events)
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged?.(this.getRoot().node);
      }
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

**Notification Sequence**:
1. Event added to node's event history
2. Get root observers (traverse up tree)
3. For each observer:
   - Call `onEvent(event)` with the event
   - If structural event, ALSO call `onTreeChanged(root)`

---

## onTreeChanged() Callback Analysis

### When is onTreeChanged() Called?

From `emitEvent()` line 441-443:

```typescript
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged?.(this.getRoot().node);
}
```

**Current Triggers**:
- ✅ `treeUpdated` event → calls `onTreeChanged()`
- ✅ `childAttached` event → calls `onTreeChanged()`
- ✅ `childDetached` event → calls `onTreeChanged()`

**Missing Triggers**:
- ❌ `invalidResponse` event → does NOT call `onTreeChanged()`
- ❌ `error` event → does NOT call `onTreeChanged()`
- ❌ `stepRestarted` event → does NOT call `onTreeChanged()`

### Why This Matters

The `onTreeChanged()` callback is how observers know to rebuild their tree representation:

```typescript
// From TreeDebugger (simplified)
class TreeDebugger implements WorkflowObserver {
  onTreeChanged(root: WorkflowNode) {
    // Rebuild entire tree visualization
    this.root = root;
    this.render();
  }
}
```

Without `onTreeChanged()` being called, the debugger won't rebuild its visualization.

---

## Event Flow Diagrams

### Flow 1: Status Change (WORKING)

```
workflow.setStatus('running')
  ↓
this.status = 'running'
this.node.status = 'running'
  ↓
emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
  ↓
observers.onEvent(treeUpdated)
  ↓
observers.onTreeChanged(root)  ← CALLED
  ↓
TreeDebugger rebuilds
```

**Result**: ✅ Observers notified, UI updates

### Flow 2: State Snapshot (WORKING)

```
workflow.snapshotState()
  ↓
this.node.stateSnapshot = snapshot
  ↓
observers.onStateUpdated(node)
  ↓
emitEvent({ type: 'stateSnapshot', node: this.node })
emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
  ↓
observers.onEvent(stateSnapshot)
observers.onEvent(treeUpdated)
  ↓
observers.onTreeChanged(root)  ← CALLED
  ↓
TreeDebugger rebuilds
```

**Result**: ✅ Observers notified, UI updates

### Flow 3: Attach Child (BROKEN)

```
parent.attachChild(child)
  ↓
parent.children.push(child)
parent.node.children.push(child.node)
child.parent = parent
child.node.parent = parent.node
  ↓
emitEvent({ type: 'childAttached', parentId, child })
  ↓
observers.onEvent(childAttached)
  ↓
observers.onTreeChanged(root)  ← CALLED (via childAttached check)
  ↓
TreeDebugger rebuilds
```

**Current Behavior**: ✅ Observers notified (via childAttached event)

**Problem**: ❌ Inconsistent - relies on childAttached event, not treeUpdated

**If treeUpdated was emitted**:
```
  ↓
emitEvent({ type: 'childAttached', ... })
emitEvent({ type: 'treeUpdated', root })
  ↓
observers.onEvent(childAttached)
observers.onEvent(treeUpdated)
  ↓
observers.onTreeChanged(root)  ← CALLED TWICE (once per event)
  ↓
TreeDebugger rebuilds
```

### Flow 4: Invalid Response (BROKEN)

```
workflow.validateAgentResponse(response, agentId, schema)
  ↓
Validation fails
  ↓
emitEvent({ type: 'invalidResponse', ... })
  ↓
observers.onEvent(invalidResponse)
  ↓
observers.onTreeChanged(root)  ← NOT CALLED (not in check)
  ↓
TreeDebugger does NOT rebuild
```

**Problem**: ❌ State changes but tree doesn't update

---

## Observer Implementation Examples

### TreeDebugger

**File**: `src/debugger/tree-debugger.ts`

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  onEvent(event: WorkflowEvent) {
    switch (event.type) {
      case 'treeUpdated':
        this.root = event.root;
        break;
      // ... handle other events ...
    }
  }

  onTreeChanged(root: WorkflowNode) {
    // Rebuild tree on structural changes
    this.buildTree(root);
  }
}
```

### Custom Observer Example

```typescript
class MetricsCollector implements WorkflowObserver {
  onEvent(event: WorkflowEvent) {
    // Track all events for analytics
    this.events.push(event);
  }

  onTreeChanged(root: WorkflowNode) {
    // Recalculate tree metrics on structural changes
    this.depth = calculateTreeDepth(root);
    this.nodeCount = countNodes(root);
  }
}
```

---

## Inconsistency Analysis

### Current Inconsistencies

1. **Structural Changes**:
   - ✅ `childAttached` → calls `onTreeChanged()`
   - ✅ `childDetached` → calls `onTreeChanged()`
   - ✅ `treeUpdated` → calls `onTreeChanged()`
   - ❌ But `treeUpdated` is NOT emitted by `attachChild()` or `detachChild()`

2. **State Changes**:
   - ✅ `status` changes → emit `treeUpdated` → call `onTreeChanged()`
   - ✅ `stateSnapshot` changes → emit `treeUpdated` → call `onTreeChanged()`
   - ❌ `invalidResponse` event → does NOT call `onTreeChanged()`
   - ❌ `error` event → does NOT call `onTreeChanged()`

### Root Cause

The `emitEvent()` method has a hardcoded check:

```typescript
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged?.(this.getRoot().node);
}
```

This check is incomplete:
- Missing some state-changing events (invalidResponse, error, stepRestarted)
- Relies on specific event types instead of semantic meaning

---

## Recommendations

### Immediate Fixes

1. **attachChild()**: Add `treeUpdated` emission
   ```typescript
   emitEvent({ type: 'childAttached', ... });
   this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
   ```

2. **detachChild()**: Add `treeUpdated` emission
   ```typescript
   emitEvent({ type: 'childDetached', ... });
   this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
   ```

### Consistency Improvements

3. **Expand onTreeChanged() check**:
   ```typescript
   // Consider calling onTreeChanged for these events too:
   // - invalidResponse (workflow state change)
   // - error (workflow status change)
   // - stepRestarted (workflow state change)
   ```

4. **Helper Method**:
   ```typescript
   private notifyTreeUpdated(): void {
     const root = this.getRoot().node;
     const observers = this.getRootObservers();
     for (const obs of observers) {
       obs.onTreeChanged?.(root);
     }
   }
   ```

### Documentation

5. **Comment the pattern**:
   ```typescript
   // PATTERN: Emit treeUpdated after ANY tree structure change
   // This ensures observers.onTreeChanged() is called consistently
   ```

---

## Conclusion

The observer pattern is well-implemented but has **inconsistent tree change notifications**:

- Some structural changes (childAttached, childDetached) call `onTreeChanged()`
- Some state changes (status, snapshot) emit `treeUpdated` which calls `onTreeChanged()`
- But the structural changes don't emit `treeUpdated` themselves

**Fix**: Make `attachChild()` and `detachChild()` emit `treeUpdated` events for consistency.

**Result**: All tree modifications will consistently notify observers via `onTreeChanged()`.
