# Tree Mirroring Invariant Research

**Research Date**: January 26, 2026
**Purpose**: Understand the "1:1 Tree Mirror" invariant and how treeUpdated events relate to maintaining it

---

## Executive Summary

This research analyzes the "1:1 Tree Mirror" invariant from PRD Section 21 and identifies why it's currently being violated for observers.

**Key Findings**:
- The workflow engine maintains TWO parallel trees that must stay synchronized
- The 1:1 mirror invariant is maintained correctly for the data structure
- But the invariant is BROKEN for observers due to missing treeUpdated events
- Only 2 methods currently emit treeUpdated (setStatus, snapshotState)
- Missing emissions: attachChild(), detachChild()

---

## The 1:1 Tree Mirror Invariant

### PRD Definition (Section 21)

From the PRD and system context:

> "All logs & events must form a perfect 1:1 tree mirror"
> "The tree structure observed by observers must match the actual workflow tree structure at all times"

### Dual Tree Structure

The Workflow class maintains **TWO parallel trees**:

#### 1. Workflow Tree (Runtime Tree)

```typescript
class Workflow {
  id: string;
  name: string;
  parent: Workflow | null;        // ← Parent reference
  children: Workflow[];           // ← Children array
  status: WorkflowStatus;
  // ... other properties ...
}
```

**Purpose**: Runtime execution engine
**Structure**: Graph of connected Workflow instances
**Navigation**: `parent`, `children` properties

#### 2. Node Tree (Serialization Tree)

```typescript
interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;    // ← Parent reference
  children: WorkflowNode[];       // ← Children array
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: SerializedWorkflowState | null;
}
```

**Purpose**: Debugging, serialization, UI display
**Structure**: Graph of connected WorkflowNode objects
**Navigation**: `node.parent`, `node.children` properties

### Mirror Invariant Requirement

```typescript
// INVARIANT: For every Workflow instance:
workflow.parent        === workflow.node.parent?.workflow
workflow.children[i]   === workflow.node.children[i]?.workflow
workflow.status        === workflow.node.status
```

**Both trees must have identical structure at all times.**

---

## How the Mirror is Maintained

### Correct Implementation (setStatus)

From `src/core/workflow.ts` line 775-778:

```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;              // ← Update workflow tree
  this.node.status = status;         // ← Update node tree (MIRROR)
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Mirror Maintenance**:
1. Update `this.status` (workflow tree)
2. Update `this.node.status` (node tree)
3. Emit `treeUpdated` event (notify observers)

**Result**: ✅ Both trees stay synchronized, observers notified

### Correct Implementation (snapshotState)

From `src/core/workflow.ts` line 452-473:

```typescript
public snapshotState(): void {
  const snapshot = getObservedState(this);
  this.node.stateSnapshot = snapshot;  // ← Update node tree

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

**Mirror Maintenance**:
1. Update `this.node.stateSnapshot` (node tree)
2. Notify observers via `onStateUpdated()`
3. Emit `stateSnapshot` event
4. Emit `treeUpdated` event (notify observers of tree change)

**Result**: ✅ Node tree updated, observers notified via multiple channels

---

## Broken Mirror for Observers

### Problem: attachChild() doesn't emit treeUpdated

From `src/core/workflow.ts` line 334-372:

```typescript
public attachChild(child: Workflow): void {
  // ... validation logic ...

  // UPDATE WORKFLOW TREE
  if (child.parent === null) {
    child.parent = this;              // ← Update workflow tree
    child.node.parent = this.node;    // ← Update node tree (MIRROR)
  }

  // UPDATE BOTH TREES
  this.children.push(child);                   // ← Update workflow tree
  this.node.children.push(child.node);         // ← Update node tree (MIRROR)

  // Emit child attached event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });

  // MISSING: No treeUpdated emission here!
  // Should add: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Mirror Maintenance**:
1. Update `child.parent` (workflow tree) ✅
2. Update `child.node.parent` (node tree) ✅
3. Update `this.children` (workflow tree) ✅
4. Update `this.node.children` (node tree) ✅
5. Emit `childAttached` event ✅
6. **MISSING**: Emit `treeUpdated` event ❌

**Result**: ⚠️ Both trees synchronized correctly, BUT observers not fully notified

### Why This Matters

The data structure is correct:
```typescript
// After attachChild(child):
parent.children         // [child]  ✅ Correct
parent.node.children    // [child.node]  ✅ Correct
child.parent            // parent  ✅ Correct
child.node.parent       // parent.node  ✅ Correct
```

But observers don't receive the `treeUpdated` event:
```typescript
// Observer receives:
onEvent({ type: 'childAttached', ... })  // ✅ Receives this
onTreeChanged(root)  // ⚠️ Receives this (via childAttached check)

// Observer should ALSO receive:
onEvent({ type: 'treeUpdated', root })  // ❌ Does NOT receive this
```

### The Invariant Gap

**Data Structure Level**: ✅ Mirror maintained correctly
- Workflow tree and node tree are always in sync

**Observer Level**: ❌ Mirror broken inconsistently
- Some observers receive tree updates
- Some tree changes don't trigger treeUpdated event
- Breaks the "1:1 tree mirror" guarantee for observers

---

## Visual Representation

### Tree Structure After attachChild()

```
Workflow Tree (Runtime)          Node Tree (Serialization)
                    │                           │
    ┌───────────────┴───────────────┐    ┌──────────────┴──────────────┐
    │                               │    │                              │
    ▼                               ▼    ▼                              ▼
┌─────────┐                    ┌─────────┐                      ┌─────────┐
│ Parent  │                    │  Child  │                      │Parent   │
│ children │───────────────────▶│ parent  │                      │children │
└─────────┘                    └─────────┘                      └─────────┘
                                                                   │
                                                                   │
                                                                   ▼
                                                            ┌─────────┐
                                                            │Child    │
                                                            │parent   │
                                                            └─────────┘

Both trees have identical structure ✅
```

### Observer Notification Flow

```
attachChild(child)
    │
    ├─→ Data Structure Update ✅
    │       parent.children.push(child)
    │       parent.node.children.push(child.node)
    │       child.parent = parent
    │       child.node.parent = parent.node
    │
    └─→ Observer Notification ⚠️
            emitEvent(childAttached)
            │
            └─→ observers.onEvent(childAttached) ✅
            └─→ observers.onTreeChanged(root) ✅ (via childAttached check)
            BUT:
            emitEvent(treeUpdated) ❌ NOT CALLED
            │
            └─→ observers.onEvent(treeUpdated) ❌ NOT RECEIVED
            └─→ observers.onTreeChanged(root) ✅ (already called, but inconsistent)
```

---

## Impact on TreeDebugger

### Current Behavior

The TreeDebugger subscribes to workflow events:

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  onEvent(event: WorkflowEvent) {
    switch (event.type) {
      case 'treeUpdated':
        this.root = event.root;
        this.buildTree();
        break;
      // ... other events ...
    }
  }
}
```

**Without treeUpdated from attachChild**:
- Debugger receives `childAttached` event
- Debugger can incrementally update its representation
- But this is inconsistent with other tree updates

**With treeUpdated from attachChild**:
- Debugger receives `treeUpdated` event
- Debugger rebuilds entire tree representation
- Consistent behavior across all tree modifications

---

## Inconsistent Behavior Examples

### Example 1: Status Change

```typescript
workflow.setStatus('running');

// Observer receives:
onEvent({ type: 'treeUpdated', root })  ✅
onTreeChanged(root)  ✅ (via treeUpdated check)
```

**Result**: Observer rebuilds tree ✅

### Example 2: Attach Child

```typescript
parent.attachChild(child);

// Observer receives:
onEvent({ type: 'childAttached', ... })  ✅
onTreeChanged(root)  ✅ (via childAttached check)
onEvent({ type: 'treeUpdated', root })  ❌ MISSING
```

**Result**: Observer updates incrementally ⚠️ (inconsistent)

### Example 3: Snapshot State

```typescript
workflow.snapshotState();

// Observer receives:
onStateUpdated(node)  ✅
onEvent({ type: 'stateSnapshot', ... })  ✅
onEvent({ type: 'treeUpdated', root })  ✅
onTreeChanged(root)  ✅ (via treeUpdated check)
```

**Result**: Observer rebuilds tree ✅

---

## The Fix Pattern

### Current (Inconsistent)

```typescript
public attachChild(child: Workflow): void {
  // Update both trees
  child.parent = this;
  child.node.parent = this.node;
  this.children.push(child);
  this.node.children.push(child.node);

  // Emit specific event only
  this.emitEvent({ type: 'childAttached', ... });
  // ❌ Missing treeUpdated emission
}
```

### Fixed (Consistent)

```typescript
public attachChild(child: Workflow): void {
  // Update both trees
  child.parent = this;
  child.node.parent = this.node;
  this.children.push(child);
  this.node.children.push(child.node);

  // Emit specific event
  this.emitEvent({ type: 'childAttached', ... });

  // ALSO emit treeUpdated (for observer consistency)
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  // ✅ Now consistent with setStatus and snapshotState
}
```

---

## Recommendations

### Critical Fixes

1. **attachChild()**: Add `treeUpdated` emission
   - Location: After line 372 in src/core/workflow.ts
   - Code: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });`

2. **detachChild()**: Add `treeUpdated` emission
   - Location: After line 425 in src/core/workflow.ts
   - Code: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });`

### Consistency Improvements

3. **Helper Method**: Create `notifyTreeUpdated()` for consistent emission
   ```typescript
   private notifyTreeUpdated(): void {
     this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
   }
   ```

4. **Documentation**: Comment the mirror invariant
   ```typescript
   // PATTERN: Update both workflow tree AND node tree, then emit treeUpdated
   // This maintains the 1:1 mirror invariant for observers
   ```

### Testing

5. **Invariant Test**: Add test that verifies mirror is maintained
   ```typescript
   test('maintains 1:1 mirror after attachChild', () => {
     const parent = new Workflow('Parent');
     const child = new Workflow('Child');

     parent.attachChild(child);

     expect(parent.children).toHaveLength(1);
     expect(parent.node.children).toHaveLength(1);
     expect(parent.children[0]).toBe(child);
     expect(parent.node.children[0]).toBe(child.node);
   });
   ```

6. **Observer Test**: Add test that verifies observers receive treeUpdated
   ```typescript
   test('observer receives treeUpdated after attachChild', () => {
     const parent = new Workflow('Parent');
     const child = new Workflow('Child');
     let treeUpdatedReceived = false;

     parent.addObserver({
       onEvent: (event) => {
         if (event.type === 'treeUpdated') {
           treeUpdatedReceived = true;
         }
       }
     });

     parent.attachChild(child);
     expect(treeUpdatedReceived).toBe(true);
   });
   ```

---

## Conclusion

The **1:1 tree mirror invariant** has two levels:

1. **Data Structure Level**: ✅ MAINTAINED
   - Workflow tree and node tree are always synchronized
   - All methods correctly update both trees

2. **Observer Level**: ❌ BROKEN
   - Some tree changes don't emit `treeUpdated` event
   - Observers receive inconsistent notifications
   - Breaks the "perfect mirror" guarantee for observers

**Root Cause**: `attachChild()` and `detachChild()` don't emit `treeUpdated` events

**Fix**: Add one line to each method to emit `treeUpdated` event

**Result**: Consistent observer notifications for all tree modifications
