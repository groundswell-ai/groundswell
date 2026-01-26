# Workflow Class treeUpdated Event Emission Patterns Research

**Research Date:** January 26, 2026
**Context:** Groundswell P2.M3.T1.S3 - Analyze Workflow class treeUpdated emission patterns
**Goal:** Document all treeUpdated emission locations and patterns to inform integration test design

---

## Executive Summary

The Workflow class currently emits `treeUpdated` events in **3 specific locations** using a consistent pattern. After P2.M3.T1.S2 implementation, there will be **5 locations** (adding attachChild and detachChild).

### Current Emission Locations (Pre-P2.M3.T1.S2)

1. **snapshotState()** - Line 473
2. **setStatus()** - Line 787
3. **runFunctional()** - Line 482 (via setStatus call)

### Expected Emission Locations (Post-P2.M3.T1.S2)

1. **snapshotState()** - Line 473
2. **setStatus()** - Line 787
3. **runFunctional()** - Line 482 (via setStatus call)
4. **attachChild()** - After line 373 (TO BE ADDED)
5. **detachChild()** - After line 425 (TO BE ADDED)

---

## Complete Inventory of treeUpdated Emissions

### 1. snapshotState() method (Line 473)

**Location:** Lines 472-473
```typescript
// Emit treeUpdated event to trigger tree debugger rebuild
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Context:** Captures workflow state and emits both stateSnapshot and treeUpdated events.

**Purpose:** Ensures tree visualization stays synchronized with state changes.

**Timing:** After state capture and snapshot event emission.

**Payload:** `{ type: 'treeUpdated', root: WorkflowNode }`

### 2. setStatus() method (Line 787)

**Location:** Lines 784-788
```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;
  this.node.status = status;
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Context:** Updates workflow status and syncs with node representation.

**Purpose:** Ensures status changes are reflected in tree visualization.

**Timing:** Immediately after status updates.

**Payload:** `{ type: 'treeUpdated', root: WorkflowNode }`

### 3. runFunctional() method (Line 482)

**Location:** Lines 479-482
```typescript
} catch (error) {
  this.setStatus('failed'); // Emits treeUpdated transitively

  // Emit error event
  this.emitEvent({
    type: 'error',
    node: this.node,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.id,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this),
      logs: [...this.node.logs] as LogEntry[],
    },
  });

  // Emit treeUpdated event to trigger tree debugger rebuild
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Context:** Error handling in functional workflow execution.

**Purpose:** Ensures tree is updated after error events.

**Timing:** After error event emission.

---

## Emission Pattern Consistency

### Common Pattern Found

All direct `treeUpdated` emissions follow this exact pattern:
```typescript
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

### Key Characteristics

1. **Event Type**: Always `'treeUpdated'`
2. **Payload**: Always contains `{ type: 'treeUpdated', root: WorkflowNode }`
3. **Root Reference**: Always uses `this.getRoot().node` to get the root workflow node
4. **Consistency**: Perfectly consistent across all emission points
5. **Timing**: Always AFTER state changes complete

---

## Missing Emissions (To Be Added by P2.M3.T1.S2)

### 1. attachChild() method (Lines 335-373)

**Missing emission at line 373** (after the existing `childAttached` emission)

**Current code (lines 368-373):**
```typescript
// Emit child attached event
this.emitEvent({
  type: 'childAttached',
  parentId: this.id,
  child: child.node,
});
```

**Should include (after line 373):**
```typescript
// Emit treeUpdated to maintain tree mirror invariant
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

### 2. detachChild() method (Lines 403-426)

**Missing emission at line 426** (after the existing `childDetached` emission)

**Current code (lines 421-425):**
```typescript
// Emit childDetached event
this.emitEvent({
  type: 'childDetached',
  parentId: this.id,
  childId: child.id,
});
```

**Should include (after line 426):**
```typescript
// Emit treeUpdated to maintain tree mirror invariant
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## Event Chain Pattern

The `emitEvent` method shows a sophisticated event handling pattern where `treeUpdated`, `childAttached`, and `childDetached` events trigger `onTreeChanged` callbacks:

```typescript
// From emitEvent() method
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged(this.getRoot().node);
}
```

This creates an event chain where:
1. State-changing method calls `emitEvent()`
2. `emitEvent()` notifies observers via `onEvent()`
3. For structural events, also calls `onTreeChanged()`

---

## Integration Test Implications

### Test Coverage Needed

Based on the emission patterns, integration tests must verify:

1. **setStatus() emissions** - Already covered by existing test
2. **snapshotState() emissions** - Already covered by existing test
3. **attachChild() emissions** - NEW TEST NEEDED
4. **detachChild() emissions** - NEW TEST NEEDED
5. **Multiple operations** - Verify count matches expected

### Test Categories

1. **Individual Method Tests**
   - attachChild emits treeUpdated
   - detachChild emits treeUpdated
   - setStatus emits treeUpdated (exists)
   - snapshotState emits treeUpdated (exists)

2. **Sequential Operation Tests**
   - Multiple attachChild operations emit treeUpdated each time
   - Multiple detachChild operations emit treeUpdated each time
   - Mixed operations emit correct sequence

3. **Observer Notification Tests**
   - onEvent receives treeUpdated events
   - onTreeChanged callback is invoked
   - Root observer receives all child events

4. **Tree Consistency Tests**
   - 1:1 mirror maintained after structural changes
   - TreeDebugger shows correct structure after operations

---

## Line Numbers Reference

### Current treeUpdated Emissions
- **Line 376**: snapshotState() - direct emission
- **Line 434**: runFunctional() error handler - direct emission
- **Line 482**: runFunctional() error handler - direct emission
- **Line 787**: setStatus() - direct emission

### To Be Added (P2.M3.T1.S2)
- **Line ~374**: attachChild() - after childAttached event
- **Line ~426**: detachChild() - after childDetached event

---

## Conclusion

The Workflow class has consistent `treeUpdated` emission patterns. After P2.M3.T1.S2 implementation, all state-changing methods will properly emit `treeUpdated` events. The integration tests must verify:

1. Each state-changing method emits treeUpdated
2. Multiple sequential operations emit treeUpdated each time
3. Observer callbacks are invoked correctly
4. Tree mirror invariant is maintained

---

**End of Research Document**
