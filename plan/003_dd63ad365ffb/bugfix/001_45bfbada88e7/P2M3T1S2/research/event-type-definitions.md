# Event Type Definitions Research

**Research Date:** 2026-01-26
**Context:** Groundswell P2.M3.T1.S2 - Add treeUpdated emission to missing methods
**Goal:** Document the exact type definition for treeUpdated event and how it relates to other events

---

## Executive Summary

This research documents the `treeUpdated` event type definition within the WorkflowEvent discriminated union, the WorkflowObserver interface, and how treeUpdated differs from and complements other workflow events.

**Key Finding:** `treeUpdated` uses a unique payload structure (`{ root: WorkflowNode }`) instead of the standard `node` property used by most other events.

---

## 1. Exact treeUpdated Event Type Definition

### 1.1 Type Definition Location

**File:** `src/types/events.ts`

### 1.2 treeUpdated Event Structure

```typescript
// treeUpdated event type definition
{
  type: 'treeUpdated';
  root: WorkflowNode;
}
```

### 1.3 Complete WorkflowEvent Discriminated Union

```typescript
export type WorkflowEvent =
  // Core workflow events - Structural changes
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'treeUpdated'; root: WorkflowNode }

  // State change events that also emit treeUpdated
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }

  // Error/Exception events that emit treeUpdated
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  | { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }

  // Other events (not emitting treeUpdated)
  | { type: 'invalidResponse'; node: WorkflowNode; response: AgentResponse<unknown>; agentId: string; errors: z.ZodError; timestamp: number }
  // ... other event types
```

---

## 2. WorkflowObserver Interface

### 2.1 Interface Definition

**File:** `src/types/index.ts` (or `src/types/observer.ts`)

```typescript
export interface WorkflowObserver {
  /** Called when a log entry is created */
  onLog(entry: LogEntry): void;

  /** Called when any workflow event occurs */
  onEvent(event: WorkflowEvent): void;

  /** Called when a node's state is updated */
  onStateUpdated(node: WorkflowNode): void;

  /** Called when the tree structure changes */
  onTreeChanged(root: WorkflowNode): void;
}
```

### 2.2 onTreeChanged() Method Signature

The `onTreeChanged()` callback receives the **root node** of the entire tree:
- Parameter: `root: WorkflowNode`
- Called for: `childAttached`, `childDetached`, and `treeUpdated` events
- Purpose: Notify observers that the tree structure has changed

---

## 3. How treeUpdated Differs from Other Events

### 3.1 treeUpdated vs childAttached/childDetached

| Aspect | childAttached | childDetached | treeUpdated |
|--------|---------------|---------------|-------------|
| **Purpose** | Incremental addition | Incremental removal | Complete tree refresh |
| **Payload** | `{ parentId: string, child: WorkflowNode }` | `{ parentId: string, childId: string }` | `{ root: WorkflowNode }` |
| **Scope** | Single child added | Single child removed | Entire tree state |
| **When Emitted** | When attaching child | When detaching child | When any structural or state change requires full tree update |
| **Consumer Use** | Update specific child reference | Remove specific child reference | Rebuild entire tree representation |

### 3.2 treeUpdated vs State Change Events

The following events currently emit a `treeUpdated` event alongside their primary event:

- **`stateSnapshot`** - When workflow state is saved
- **`stepStart`/`stepEnd`** - When steps begin/end (triggers status update)
- **`taskStart`/`taskEnd`** - When tasks begin/end (triggers status update)
- **`error`** - When workflow fails (triggers status update)
- **`stepRestarted`** - When a step is retried (triggers state/snapshot update)
- **`setStatus()`** calls - Manually when workflow status changes

### 3.3 The Dual Notification Pattern

```typescript
// Pattern: Emit specific event, then treeUpdated
this.emitEvent({
  type: 'childAttached',
  parentId: this.id,
  child: child.node,
});

this.emitEvent({
  type: 'treeUpdated',
  root: this.getRoot().node
});
```

This ensures:
1. Observers get the specific change (childAttached)
2. Observers get a signal to rebuild their tree representation (treeUpdated)

---

## 4. treeUpdated Event Emission Pattern

### 4.1 In emitEvent() Method

**File:** `src/core/workflow.ts`, lines 440-442

```typescript
// Also notify tree changed for tree update events
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged(this.getRoot().node);
}
```

### 4.2 Direct treeUpdated Emissions

**Location 1: snapshotState() method (line 473)**
```typescript
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Location 2: setStatus() method (line 778)**
```typescript
this.status = status;
this.node.status = status;
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## 5. Consumer Expectations (TreeDebugger Example)

### 5.1 TreeDebugger Implementation

**File:** `src/debugger/tree-debugger.ts`, lines 164-167

```typescript
case 'treeUpdated':
  // NEW: Update root reference only
  this.root = event.root;
  break;
```

### 5.2 onTreeChanged() Callback

**File:** `src/debugger/tree-debugger.ts`, lines 182-188

```typescript
onTreeChanged(root: WorkflowNode): void {
  // All tree changes now handled incrementally in onEvent()
  // Just update root reference if different
  if (this.root !== root) {
    this.root = root;
  }
}
```

### 5.3 Consumer Expectations Summary

1. **Complete Tree Reference**: Consumers expect the entire tree structure through `event.root`
2. **Immutable Updates**: The root WorkflowNode is a complete replacement, not a partial update
3. **Event Chaining**: treeUpdated is often emitted alongside other events (e.g., after stateSnapshot)
4. **Efficient Handling**: TreeDebugger treats treeUpdated as a "replace entire tree" operation

### 5.4 Performance Implications

- The TreeDebugger rebuilds its entire nodeMap on treeUpdated events
- This is O(n) where n = total nodes in the tree
- This differs from incremental updates for childAttached/childDetached (O(k) where k = subtree size)
- Justification: Structural changes require complete rebuild to maintain consistency

---

## 6. Event Flow Pattern

### 6.1 Complete Event Flow

```
Workflow action (e.g., attachChild())
↓
State modification (children array updated, parent references set)
↓
emitEvent(type: 'childAttached', ...)
↓
emitEvent(type: 'treeUpdated', root: this.getRoot().node)
↓
Observer.onEvent(childAttached)
↓
Observer.onTreeChanged(root)  // triggered by emitEvent for structural events
```

### 6.2 Event Propagation

When a child workflow emits an event, the event propagates to the root:
- `getRoot().node` ensures the entire tree is represented
- Observers attached to root receive all descendant events
- This enables centralized tree management

---

## 7. Key Implementation Insights

### 7.1 Always Use getRoot().node

```typescript
// ✅ CORRECT - Complete tree state
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// ❌ INCORRECT - Only current node
this.emitEvent({ type: 'treeUpdated', root: this.node });
```

### 7.2 Emit After State Change

```typescript
// ✅ CORRECT - State updated first
this.children.push(child);
this.node.children.push(child.node);
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// ❌ INCORRECT - Event emitted before state change
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
this.children.push(child);
this.node.children.push(child.node);
```

### 7.3 Emit Both Specific and General Events

```typescript
// Pattern: Specific event for granular handling, treeUpdated for tree rebuild
this.emitEvent({ type: 'childAttached', parentId: this.id, child: child.node });
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

---

## 8. Summary

The `treeUpdated` event is a critical event for maintaining tree structure consistency across observers:

1. **Unique Payload**: Uses `{ root: WorkflowNode }` instead of `{ node: WorkflowNode }`
2. **Complete State**: Represents the entire tree, not just a single node
3. **Consumer Impact**: Triggers complete tree rebuild in consumers like TreeDebugger
4. **Complementary**: Works alongside specific events (childAttached/childDetached) for dual notification
5. **Consistency**: Ensures 1:1 tree mirror invariant is maintained

When adding treeUpdated emissions to `attachChild()` and `detachChild()`, ensure the emission happens AFTER the state modifications and AFTER the specific event (childAttached/childDetached).

---

**End of Research Document**
