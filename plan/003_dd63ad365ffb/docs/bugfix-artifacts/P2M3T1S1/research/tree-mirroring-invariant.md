# 1:1 Tree Mirror Invariant Analysis

## Definition of 1:1 Tree Mirror Invariant

The "1:1 Tree Mirror" invariant (PRD Section 21) states that **all logs & events must form a perfect 1:1 tree mirror of the workflow execution tree in memory**. This means there are two parallel tree structures that must always stay synchronized:

### 1. Workflow Tree (Class Hierarchy)
- **Structure**: `Workflow` instances with parent/child relationships
- **Location**: `workflow.parent` and `workflow.children` arrays
- **Purpose**: Manages workflow lifecycle and execution flow

### 2. Node Tree (Data Representation)
- **Structure**: `WorkflowNode` objects with parent/child references
- **Location**: `workflow.node.parent` and `workflow.node.children` arrays
- **Purpose**: Provides serializable data structure for debugging and observation

### The Invariant
For every workflow instance:
- `workflow.parent === workflow.node.parent.parent`
- `workflow.children.length === workflow.node.children.length`
- `workflow.children[i].node === workflow.node.children[i]`
- `workflow.children[i].parent === workflow`

## Current Tree Synchronization Mechanisms

### Synchronized Operations
The following operations properly maintain the 1:1 invariant:

#### 1. attachChild() - ✅ PROPERLY SYNCHRONIZED
```typescript
// In attachChild():
child.parent = this;
child.node.parent = this.node; // ✅ Explicit synchronization
this.children.push(child);
this.node.children.push(child.node);
// Emits 'childAttached' event, but NOT 'treeUpdated'
```

#### 2. detachChild() - ✅ PROPERLY SYNCHRONIZED
```typescript
// In detachChild():
this.children.splice(index, 1);
this.node.children.splice(nodeIndex, 1);
child.parent = null;
child.node.parent = null; // ✅ Explicit synchronization
// Emits 'childDetached' event, but NOT 'treeUpdated'
```

#### 3. setStatus() - ✅ EMITS treeUpdated
```typescript
// In setStatus():
this.status = status;
this.node.status = status; // ✅ Synchronized
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node }); // ✅ Event emitted
```

#### 4. snapshotState() - ✅ EMITS treeUpdated
```typescript
// In snapshotState():
this.node.stateSnapshot = snapshot;
// ... notifies observers onStateUpdated ...
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node }); // ✅ Event emitted
```

## All Operations That Modify the Tree

### Tree Structure Changes
1. **attachChild()** - Adds child to parent
2. **detachChild()** - Removes child from parent
3. **setStatus()** - Updates workflow status
4. **snapshotState()** - Updates stateSnapshot

### Data Content Changes
5. **Log additions** - `this.node.logs.push(entry)` via logger
6. **Event additions** - `this.node.events.push(event)` via emitEvent
7. **Status changes** - Direct updates to `workflow.status`

## Current treeUpdated Emission Analysis

### ✅ CORRECTLY EMITS treeUpdated
1. **setStatus()** - Line 778 in workflow.ts
2. **snapshotState()** - Line 473 in workflow.ts

### ❌ MISSING treeUpdated EMISSION

#### 1. attachChild() - MISSING treeUpdated
**Current behavior**: Only emits 'childAttached' event
**Problem**: Tree structure changes but debugger doesn't rebuild
**Impact**: Tree debugger shows outdated tree structure
**Fix needed**: Add `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });`

#### 2. detachChild() - MISSING treeUpdated
**Current behavior**: Only emits 'childDetached' event
**Problem**: Tree structure changes but debugger doesn't rebuild
**Impact**: Tree debugger shows outdated tree structure
**Fix needed**: Add `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });`

#### 3. Log additions - MISSING treeUpdated
**Current behavior**: Log entries added via `this.node.logs.push(entry)`
**Problem**: Node content changes but tree doesn't reflect updates
**Impact**: Tree debugger may not show latest logs
**Fix needed**: Consider if log additions should trigger tree updates

#### 4. Event additions - MISSING treeUpdated
**Current behavior**: Events added via `this.node.events.push(event)`
**Problem**: Node content changes but tree doesn't reflect updates
**Impact**: Tree debugger may not show latest events
**Fix needed**: Consider if event additions should trigger tree updates

## Critical Gap: Issue #6

From the prd_snapshot.md:

> **Issue 6**: Missing TreeUpdated Event on State Changes
> 
> **Expected Behavior**:
> - PRD Section 21: "All logs & events must form a perfect 1:1 tree mirror"
> - `treeUpdated` event should be emitted when tree structure changes
> - Real-time debugger should receive all tree updates
> 
> **Actual Behavior**:
> - `treeUpdated` event is emitted inconsistently
> - Some state changes don't emit treeUpdated (e.g., status changes without explicit notification)
> - Observer notifications may miss tree updates

## Recommended Fixes

### Priority 1: Tree Structure Changes (Critical)
1. **attachChild()** - Add treeUpdated emission after attaching
2. **detachChild()** - Add treeUpdated emission after detaching

### Priority 2: Node Content Changes (Consider Impact)
3. **Log additions** - Determine if logs should trigger tree updates
4. **Event additions** - Determine if events should trigger tree updates

### Implementation Pattern
```typescript
// In attachChild():
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// In detachChild():
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

## Test Coverage Needed

From the existing test file `tree-mirroring.test.ts`, current tests only verify:
- Tree structure creation
- Event propagation to root
- State snapshot on error
- treeUpdated on status changes

**Missing tests needed:**
1. Test treeUpdated emission on attachChild()
2. Test treeUpdated emission on detachChild()
3. Test treeUpdated propagation through hierarchy
4. Test tree rebuild consistency after multiple operations

## Impact Assessment

### High Impact (Critical)
- attachChild/detachChild without treeUpdated breaks debugger functionality
- Tree structure changes are not reflected in real-time debugging

### Medium Impact (Should Fix)
- Log/event content changes may not be visible in debugger
- Inconsistent update patterns make debugging unreliable

### Low Impact (Nice to Have)
- Performance considerations for frequent tree updates
- Debouncing strategies for rapid changes

## Conclusion

The 1:1 tree mirror invariant is fundamentally broken by missing treeUpdated events during structural operations. The fix is straightforward - ensure treeUpdated is emitted after any operation that modifies the tree structure, not just setStatus() and snapshotState().

**Immediate Actions Required:**
1. Add treeUpdated to attachChild()
2. Add treeUpdated to detachChild()
3. Add comprehensive tests
4. Verify debugger rebuilds correctly after all operations
