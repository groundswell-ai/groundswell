# Workflow TreeUpdated Emission Patterns Research

**Research Date:** 2026-01-26
**Context:** Groundswell P2.M3.T1.S2 - Add treeUpdated emission to missing methods
**Goal:** Document exact patterns for adding treeUpdated emissions in the Workflow class

---

## Executive Summary

This research documents the exact code patterns for adding `treeUpdated` event emissions to methods in the Workflow class that modify state but don't currently emit this event. The focus is on `attachChild()` and `detachChild()` methods, which are the primary methods missing this emission.

**Key Finding:** The exact pattern to emit treeUpdated is:
```typescript
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## 1. Exact emitEvent() Code Pattern

### 1.1 The Pattern to Use

```typescript
// This is the EXACT code pattern to emit treeUpdated:
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

### 1.2 Why getRoot().node?

The `root` parameter MUST be `this.getRoot().node` - it cannot be `this.node` because:
- It needs the complete tree state including all descendants
- `getRoot()` traverses up to find the root workflow
- The root node represents the entire tree structure for observers
- Observers expect the complete tree, not just the current node

### 1.3 Current treeUpdated Emission Locations

**Location 1: snapshotState() method (line 473)**
```typescript
// Emit treeUpdated event to trigger tree debugger rebuild
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Location 2: setStatus() method (line 778)**
```typescript
this.status = status;
this.node.status = status;
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## 2. Methods That Need treeUpdated Added

### 2.1 attachChild() Method (lines 334-373)

**Current Behavior:**
- Only emits `childAttached` event
- Modifies workflow tree structure but doesn't trigger tree debugger rebuild via treeUpdated

**Fix Needed:**
- Add `treeUpdated` emission after the child is attached
- Location: After line 372 (after the childAttached event)

**Current Code Pattern:**
```typescript
attachChild(child: Workflow): void {
  // Validation and setup...

  // Add to both trees
  this.children.push(child);
  this.node.children.push(child.node);

  // Emit child attached event (existing)
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });

  // ADD HERE: Emit treeUpdated event (NEW)
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

### 2.2 detachChild() Method (lines 397-426)

**Current Behavior:**
- Only emits `childDetached` event
- Modifies workflow tree structure but doesn't trigger tree debugger rebuild via treeUpdated

**Fix Needed:**
- Add `treeUpdated` emission after the child is detached
- Location: After line 425 (after the childDetached event)

**Current Code Pattern:**
```typescript
detachChild(child: Workflow): void {
  // Validation...

  // Remove from both trees
  this.children.splice(index, 1);
  this.node.children.splice(nodeIndex, 1);

  // Clear parent references
  child.parent = null;
  child.node.parent = null;

  // Emit childDetached event (existing)
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });

  // ADD HERE: Emit treeUpdated event (NEW)
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

---

## 3. JSDoc Patterns

### 3.1 Existing JSDoc for Methods That Emit treeUpdated

**setStatus() method (line 773):**
```typescript
/**
 * Update workflow status and sync with node
 */
```
- Simple JSDoc - no mention of treeUpdated emission
- Should be enhanced to document event emission

**snapshotState() method (line 449):**
```typescript
/**
 * Capture and emit a state snapshot
 */
```
- Simple JSDoc - no mention of treeUpdated emission
- Should be enhanced to document event emission

### 3.2 JSDoc Patterns to Add

**For attachChild() method (line 281):**
Current JSDoc mentions:
```
* - Adds child to this.children array (workflow tree)
* - Adds child.node to this.node.children array (node tree)
* - Sets child.parent = this (workflow tree)
* - Sets child.node.parent = this.node (node tree)
* - Emits childAttached event to notify observers
```

**Needs to add:**
```
* - Emits treeUpdated event to trigger tree debugger rebuild
```

**For detachChild() method (line 375):**
Current JSDoc mentions:
```
* - Removes the child from both the workflow tree (this.children) and
* - the node tree (this.node.children), clears the child's parent reference,
* - and emits a childDetached event to notify observers.
```

**Needs to add:**
```
* - Emits treeUpdated event to trigger tree debugger rebuild
```

### 3.3 Recommended JSDoc Enhancement Pattern

Based on external research, use this enhanced pattern:

```typescript
/**
 * Attach a child workflow to this parent workflow.
 *
 * **Event Emission:** Emits `childAttached` and `treeUpdated` events AFTER
 * the child is successfully attached and both workflow tree and node tree
 * are in a consistent state. Observers can safely read `child.parent` and
 * `parent.children` when handling these events.
 *
 * @fires {WorkflowEvent} WorkflowEvent#childAttached - Emitted after child is attached
 * @fires {WorkflowEvent} WorkflowEvent#treeUpdated - Emitted after tree structure changes
 * @param {Workflow} child - The child workflow to attach
 * @throws {Error} If child is already attached or would create circular reference
 */
public attachChild(child: Workflow): void {
  // ... implementation
}
```

---

## 4. Important Observations

### 4.1 The emitEvent() Method Handles treeUpdated Specially

At line 440-442 in `emitEvent()`:
```typescript
// Also notify tree changed for tree update events
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged(this.getRoot().node);
}
```

This means `childAttached` and `childDetached` events already trigger `onTreeChanged()`, but `treeUpdated` does more - it specifically signals that the entire tree structure needs to be rebuilt by consumers like TreeDebugger.

### 4.2 The 1:1 Tree Mirror Invariant

The workflow maintains a strict 1:1 mirror between:
- `workflow.children` array ↔ `workflow.node.children` array
- `workflow.parent` reference ↔ `workflow.node.parent` reference

When this invariant is modified, the tree debugger needs to rebuild its internal representation. The `treeUpdated` event signals this need.

### 4.3 Emission Order

For methods that emit both events (like attaching/detaching), the order should be:
1. Emit the specific event (childAttached/childDetached) first
2. Then emit treeUpdated

This follows the existing pattern in `snapshotState()` which emits multiple events.

### 4.4 Performance Consideration

The `getRoot().node` call involves traversal up the parent chain. This is acceptable because:
- The tree structure is typically shallow
- The traversal includes cycle detection
- The cost is justified for maintaining tree debugger accuracy
- TreeUpdated events are relatively infrequent (only on structural changes)

---

## 5. Implementation Template

### 5.1 attachChild() Template

```typescript
// Existing code...
this.children.push(child);
this.node.children.push(child.node);

// Emit child attached event (existing)
this.emitEvent({
  type: 'childAttached',
  parentId: this.id,
  child: child.node,
});

// ADD: Emit treeUpdated event (NEW)
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

### 5.2 detachChild() Template

```typescript
// Existing code...
this.children.splice(index, 1);
this.node.children.splice(nodeIndex, 1);

// Emit childDetached event (existing)
this.emitEvent({
  type: 'childDetached',
  parentId: this.id,
  childId: child.id,
});

// ADD: Emit treeUpdated event (NEW)
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## 6. Verification Steps

After implementing these changes, verify:
1. Attaching a child emits both `childAttached` and `treeUpdated`
2. Detaching a child emits both `childDetached` and `treeUpdated`
3. Tree debugger rebuilds after tree modifications
4. Existing functionality (observers getting both events) still works
5. No performance regressions in normal operation
6. Event order is correct (specific event first, then treeUpdated)

---

## 7. Key Gotchas

### 7.1 Don't Emit treeUpdated in Constructor

The constructor calls `attachChild()` if a parent is provided (line 144).
This means treeUpdated will be emitted transitively via `attachChild()`.
No additional treeUpdated emission needed in constructor.

### 7.2 Don't Add Duplicate Emissions

Methods like `restartStep()` (line 509) call `snapshotState()` internally (line 548).
treeUpdated is already emitted transitively via `snapshotState()`.
No additional treeUpdated emission needed in `restartStep()`.

### 7.3 Indirect Emissions Documentation

Methods that emit treeUpdated indirectly (by calling methods that emit treeUpdated)
should be documented in the audit as "INDIRECT" emission status.

---

**End of Research Document**
