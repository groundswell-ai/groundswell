# Event Handling Patterns Research

**Date**: 2025-01-24
**Task**: P2M1T1S2 - Implement Replay Logic for Tree Structure Events
**Goal**: Document existing event handling patterns to inform implementation

---

## Table of Contents

1. [Event Processing Pattern](#1-event-processing-pattern)
2. [Discriminated Union Pattern](#2-discriminated-union-pattern)
3. [Specific Event Handlers](#3-specific-event-handlers)
4. [Error Handling](#4-error-handling)
5. [Testing Patterns](#5-testing-patterns)

---

## 1. Event Processing Pattern

### 1.1 Observer-Based Event Dispatch

Events are dispatched through a root-observer pattern where only the root workflow maintains observers, and all events bubble up through the tree.

**Key Implementation** (`/home/dustin/projects/groundswell/src/core/workflow.ts`, lines 413-429):

```typescript
/**
 * Emit an event to all root observers
 */
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

**Pattern Characteristics:**
- **Centralized dispatch**: All events go through `emitEvent()`
- **Observer notification**: Events are sent to all root observers via `getRootObservers()`
- **Tree synchronization**: Structural events (childAttached, childDetached, treeUpdated) trigger both `onEvent()` and `onTreeChanged()`
- **Error isolation**: Observer errors are caught and logged, preventing one observer from breaking others
- **Event storage**: Events are stored in `node.events` array for historical tracking

### 1.2 Sequential Event Processing

Events are processed sequentially and synchronously, ensuring deterministic order.

**Example from WorkflowTreeDebugger** (`/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`, lines 92-117):

```typescript
onEvent(event: WorkflowEvent): void {
  // Handle structural events with incremental updates
  switch (event.type) {
    case 'childAttached':
      // Keep existing logic - already optimal O(k)
      this.buildNodeMap(event.child);
      break;

    case 'childDetached':
      // NEW: Incremental subtree removal
      this.removeSubtreeNodes(event.childId);
      break;

    case 'treeUpdated':
      // NEW: Update root reference only
      this.root = event.root;
      break;

    default:
      // Non-structural events - no map update needed
      break;
  }

  // Always forward to event stream (existing behavior)
  this.events.next(event);
}
```

**Processing Order Guarantees:**
1. Event is added to `node.events` array
2. Observer `onEvent()` is called
3. For structural events, `onTreeChanged()` is called after `onEvent()`
4. Event is forwarded to any observable streams

**Verification Test** (`/home/dustin/projects/groundswell/src/__tests__/unit/workflow-emitEvent-childDetached.test.ts`, lines 45-66):

```typescript
it('should call onEvent() before onTreeChanged() for childDetached', () => {
  const parent = new SimpleWorkflow('Parent');
  const callOrder: string[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => callOrder.push('onEvent'),
    onStateUpdated: () => {},
    onTreeChanged: () => callOrder.push('onTreeChanged'),
  };

  parent.addObserver(observer);
  const child = new SimpleWorkflow('Child', parent);
  callOrder.length = 0;
  parent.detachChild(child);

  // Assert: Verify order
  expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
});
```

### 1.3 Map-Based Node Tracking

The codebase uses `Map<string, WorkflowNode>` for O(1) node lookups, avoiding expensive tree traversals.

**Implementation** (`/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`):

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  /** Node lookup map for quick access */
  private nodeMap: Map<string, WorkflowNode> = new Map();

  /**
   * Build node lookup map recursively
   */
  private buildNodeMap(node: WorkflowNode): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildNodeMap(child);
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): WorkflowNode | undefined {
    return this.nodeMap.get(id);
  }
}
```

**Why This Pattern:**
- **O(1) lookup**: Direct access by ID without tree traversal
- **Incremental updates**: Add/remove nodes as events arrive
- **No rebuild**: Map stays synchronized with tree without full rebuilds
- **Memory efficient**: Single map per debugger instance

---

## 2. Discriminated Union Pattern

### 2.1 Event Type Definition

WorkflowEvent is a discriminated union using `type` as the discriminant property.

**Event Types** (`/home/dustin/projects/groundswell/src/types/events.ts`):

```typescript
/**
 * Discriminated union of all workflow events
 */
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // Agent/Prompt events
  | {
      type: 'agentPromptStart';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
    }
  | {
      type: 'agentPromptEnd';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
      duration: number;
      tokenUsage?: TokenUsage;
    }
  // Tool events
  | {
      type: 'toolInvocation';
      toolName: string;
      input: unknown;
      output: unknown;
      duration: number;
      node: WorkflowNode;
    }
  // MCP events
  | {
      type: 'mcpEvent';
      serverName: string;
      event: string;
      payload?: unknown;
      node: WorkflowNode;
    }
  // Reflection events
  | {
      type: 'reflectionStart';
      level: 'workflow' | 'agent' | 'prompt';
      node: WorkflowNode;
    }
  | {
      type: 'reflectionEnd';
      level: 'workflow' | 'agent' | 'prompt';
      success: boolean;
      node: WorkflowNode;
    }
  // Cache events
  | {
      type: 'cacheHit';
      key: string;
      node: WorkflowNode;
    }
  | {
      type: 'cacheMiss';
      key: string;
      node: WorkflowNode;
    };
```

### 2.2 TypeScript Narrowing in Switch Statements

The `type` property acts as a discriminant, allowing TypeScript to narrow the type within each case.

**Pattern Example**:

```typescript
onEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'childAttached':
      // TypeScript knows: event.child is WorkflowNode
      // TypeScript knows: event.parentId is string
      this.buildNodeMap(event.child);
      break;

    case 'childDetached':
      // TypeScript knows: event.childId is string
      // TypeScript knows: event.child does NOT exist
      this.removeSubtreeNodes(event.childId);
      break;

    case 'treeUpdated':
      // TypeScript knows: event.root is WorkflowNode
      this.root = event.root;
      break;

    default:
      // TypeScript knows: event is non-structural type
      break;
  }
}
```

**Why Discriminated Unions:**
- **Type safety**: Cannot access properties that don't exist for that event type
- **Exhaustive checking**: TypeScript can verify all cases are handled
- **IDE support**: Autocomplete shows correct properties for each case
- **Refactoring safety**: Adding new properties to events requires updating all handlers

### 2.3 Extract Utility for Type Narrowing

For strongly-typed event handlers, the codebase uses `Extract<WorkflowEvent, {...}>` to narrow to specific event types.

**Usage in EventReplayer** (`/home/dustin/projects/groundswell/src/debugger/event-replayer.ts`, lines 123-126):

```typescript
/**
 * Handle childAttached event - add subtree to tree.
 */
private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void {
  // Implementation in P2.M1.T1.S2
  throw new Error('Not implemented: childAttached handler');
}
```

**Benefits of Extract Pattern:**
- **Method-level type safety**: Each handler has exact event type
- **Reusable handlers**: Can call handlers from switch or independently
- **Self-documenting**: Method signature shows what event it handles

---

## 3. Specific Event Handlers

### 3.1 childAttached Event

**Event Structure:**
```typescript
{ type: 'childAttached'; parentId: string; child: WorkflowNode }
```

**Handler Implementation** (WorkflowTreeDebugger, lines 95-98):

```typescript
case 'childAttached':
  // Keep existing logic - already optimal O(k)
  this.buildNodeMap(event.child);
  break;
```

**Handling Strategy:**
- **Add subtree**: Recursively add child and all descendants to nodeMap
- **No validation needed**: Event already validated by Workflow.attachChild()
- **O(k) complexity**: k = number of nodes in subtree

**Helper Method** (`buildNodeMap`, lines 53-58):

```typescript
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);
  }
}
```

**Validation in Workflow** (`attachChild`, lines 316-355):

```typescript
public attachChild(child: Workflow): void {
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // Check if child already has a different parent
  if (child.parent !== null && child.parent !== this) {
    throw new Error(
      `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent.`
    );
  }

  // Check if child is an ancestor (would create circular reference)
  if (this.isDescendantOf(child)) {
    throw new Error(
      `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`
    );
  }

  // Update child's parent if it's currently null
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
}
```

**Invariants Maintained:**
1. **Single-parent rule**: Each child has exactly one parent
2. **No cycles**: Child cannot be ancestor of parent
3. **Tree mirror**: `workflow.children` and `node.children` stay synchronized
4. **Bidirectional refs**: `child.parent` and `child.node.parent` both set

### 3.2 childDetached Event

**Event Structure:**
```typescript
{ type: 'childDetached'; parentId: string; childId: string }
```

**Handler Implementation** (WorkflowTreeDebugger, lines 100-103):

```typescript
case 'childDetached':
  // NEW: Incremental subtree removal
  this.removeSubtreeNodes(event.childId);
  break;
```

**Handling Strategy:**
- **Remove subtree**: Delete child and all descendants from nodeMap
- **BFS traversal**: Iterative (not recursive) to avoid stack overflow
- **O(k) complexity**: k = number of nodes in subtree

**Helper Method** (`removeSubtreeNodes`, lines 65-84):

```typescript
/**
 * Remove entire subtree from node map using BFS traversal
 * O(k) complexity where k = number of nodes in subtree
 * Uses iterative BFS to avoid stack overflow on deep trees
 */
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // Already removed or never existed

  // BFS traversal to collect all descendant IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    // Add children to queue for BFS traversal
    queue.push(...current.children);
  }

  // Batch delete all collected keys (atomic update)
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

**Why BFS Instead of DFS:**
- **Stack safety**: Deep trees (1000+ nodes) won't cause stack overflow
- **Performance**: Same O(k) complexity, but predictable memory usage
- **Batch delete**: Collect all IDs first, then delete atomically

**Validation in Workflow** (`detachChild`, lines 379-408):

```typescript
public detachChild(child: Workflow): void {
  // Validate child is actually attached
  const index = this.children.indexOf(child);

  if (index === -1) {
    throw new Error(
      `Child '${child.node.name}' is not attached to workflow '${this.node.name}'`
    );
  }

  // Remove from workflow tree (this.children array)
  this.children.splice(index, 1);

  // Remove from node tree (this.node.children array)
  const nodeIndex = this.node.children.indexOf(child.node);
  if (nodeIndex !== -1) {
    this.node.children.splice(nodeIndex, 1);
  }

  // Clear child's parent reference (both workflow tree and node tree)
  child.parent = null;
  child.node.parent = null;

  // Emit childDetached event
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });
}
```

**Test Coverage** (`/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`):

```typescript
it('childDetached removes entire subtree (node + descendants)', () => {
  const root = new IncrementalTestWorkflow('Root');
  const child1 = new IncrementalTestWorkflow('Child1', root);
  const grandchild = new IncrementalTestWorkflow('Grandchild', child1);
  const child2 = new IncrementalTestWorkflow('Child2', root);

  const debugger_ = new WorkflowTreeDebugger(root);

  // Verify all nodes are initially in the map
  expect(debugger_.getNode(root.id)).toBe(root.getNode());
  expect(debugger_.getNode(child1.id)).toBe(child1.getNode());
  expect(debugger_.getNode(grandchild.id)).toBe(grandchild.getNode());
  expect(debugger_.getStats().totalNodes).toBe(4);

  // Detach child1 (should remove child1 + grandchild)
  root.detachChild(child1);

  // Verify child1 and grandchild are removed
  expect(debugger_.getNode(child1.id)).toBeUndefined();
  expect(debugger_.getNode(grandchild.id)).toBeUndefined();

  // Verify root and child2 are still present
  expect(debugger_.getNode(root.id)).toBe(root.getNode());
  expect(debugger_.getNode(child2.id)).toBe(child2.getNode());

  // Verify total node count decreased by 2
  expect(debugger_.getStats().totalNodes).toBe(2);
});
```

### 3.3 treeUpdated Event

**Event Structure:**
```typescript
{ type: 'treeUpdated'; root: WorkflowNode }
```

**Handler Implementation** (WorkflowTreeDebugger, lines 105-108):

```typescript
case 'treeUpdated':
  // NEW: Update root reference only
  this.root = event.root;
  break;
```

**Handling Strategy:**
- **Replace root**: Update root reference to new tree
- **No map rebuild**: nodeMap already updated by childAttached/childDetached
- **Simple assignment**: O(1) operation

**When treeUpdated is Emitted** (`workflow.ts`, lines 454-455):

```typescript
// Emit treeUpdated event to trigger tree debugger rebuild
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Use Cases:**
- **Status changes**: When workflow status changes
- **State snapshots**: After capturing state
- **Complete replacement**: When entire tree is replaced (rare)

**Test Verification** (`/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`, lines 117-152):

```typescript
it('should propagate treeUpdated events to root observers', () => {
  const parent = new TDDOrchestrator('Parent');
  const child = new TDDOrchestrator('Child', parent);

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

## 4. Error Handling

### 4.1 Observer Error Isolation

The codebase implements comprehensive error isolation to prevent one observer from breaking the entire event system.

**Pattern** (`/home/dustin/projects/groundswell/src/core/workflow.ts`, lines 416-428):

```typescript
for (const obs of observers) {
  try {
    obs.onEvent(event);

    if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
      obs.onTreeChanged(this.getRoot().node);
    }
  } catch (err) {
    this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
  }
}
```

**Error Handling Characteristics:**
- **Try-catch around each observer**: Errors don't propagate to other observers
- **Detailed error logging**: Includes error object and event type
- **Non-blocking**: Workflow continues even if observers fail
- **Logged to node.logs**: Errors stored in workflow node for debugging

### 4.2 Error Logging Strategy

Observer errors are logged via `this.logger.error()` which adds entries to the workflow node's logs array.

**Test Verification** (`/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts`, lines 77-109):

```typescript
it('should log observer onEvent errors via this.logger.error', () => {
  const onEventError = new Error('Observer onEvent failed');

  const throwingObserver: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => {
      throw onEventError;
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.emitEvent({ type: 'testEvent' } as any);
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.run();

  // Should have error log entry
  const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onEvent error');
  expect(errorLog).toBeDefined();
  expect(errorLog?.level).toBe('error');
  expect(errorLog?.data).toEqual({
    error: onEventError,
    eventType: 'testEvent',
  });
});
```

**Error Log Structure:**
```typescript
{
  message: 'Observer onEvent error',
  level: 'error',
  data: {
    error: Error,          // Original error object
    eventType: 'childDetached' // Type of event being processed
  }
}
```

### 4.3 Validation Errors vs Observer Errors

The codebase distinguishes between validation errors (developer mistakes) and observer errors (runtime issues).

**Validation Errors:** Use `console.error()` and throw
```typescript
// Example from attachChild (lines 323-328)
if (child.parent !== null && child.parent !== this) {
  const errorMessage =
    `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
    `A workflow can only have one parent. ` +
    `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
```

**Observer Errors:** Use `logger.error()` and continue
```typescript
// Example from emitEvent (lines 425-427)
catch (err) {
  this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
}
```

**Why the Difference:**
- **Validation errors**: Should be visible during development, indicate API misuse
- **Observer errors**: Should be logged for debugging but not break execution
- **console.error**: Goes to stderr, visible in console output
- **logger.error**: Goes to workflow logs, accessible programmatically

### 4.4 Multiple Observer Error Handling

When multiple observers are registered and one throws, the system continues notifying the remaining observers.

**Test** (`/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts`, lines 553-605):

```typescript
it('should continue notifying other observers after one throws', async () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer 1 failed');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => {
      observer2Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => {
      observer3Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.addObserver(workingObserver2);
  workflow.addObserver(workingObserver3);

  await workflow.run();

  // Both working observers should have been called
  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);

  // Should have error log for throwing observer
  const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onLog error');
  expect(errorLog).toBeDefined();
});
```

**Error Handling Pattern for Replay:**
```typescript
// Suggested pattern for event replay
for (const event of events) {
  try {
    this.processEvent(event);
  } catch (err) {
    // Log error but continue processing
    console.error(`Error processing event ${event.type}:`, err);
    // Optionally: store error for later analysis
    this.errors.push({ event, error: err });
  }
}
```

### 4.5 Missing Node Handling

When replaying events, nodes referenced by events may not exist in the reconstructed tree.

**Current Pattern in WorkflowTreeDebugger:**
```typescript
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // Already removed or never existed

  // ... rest of implementation
}
```

**Why Silent Return:**
- **Idempotent operations**: Calling remove twice is safe
- **Event ordering**: childDetached may arrive before childAttached in some edge cases
- **No propagation**: Error would break entire replay

**Suggested Pattern for Replay:**
```typescript
private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
  const parent = this.nodeMap.get(event.parentId);
  const child = this.nodeMap.get(event.childId);

  if (!parent) {
    console.warn(`Parent node ${event.parentId} not found for childDetached event`);
    return;
  }

  if (!child) {
    console.warn(`Child node ${event.childId} not found for childDetached event`);
    return;
  }

  // Verify child is actually a child of parent
  if (!parent.children.includes(child)) {
    console.warn(`Node ${event.childId} is not a child of ${event.parentId}`);
    return;
  }

  // ... rest of implementation
}
```

---

## 5. Testing Patterns

### 5.1 Observer Interface Mocking

Tests create inline objects implementing the `WorkflowObserver` interface to capture callbacks.

**Pattern** (`/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`, lines 52-57):

```typescript
const observer: WorkflowObserver = {
  onLog: (entry) => allLogs.push(entry),
  onEvent: (event) => allEvents.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

**Benefits:**
- **No mocking library needed**: Plain objects implement interface
- **Explicit tracking**: Each method can capture specific data
- **Type safety**: TypeScript verifies all required methods are present
- **Flexible**: Can mix real implementations and spies

### 5.2 Event Type Guards

Tests use type guards to narrow event types after filtering, ensuring type-safe access to event properties.

**Pattern** (`/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`, lines 140-147):

```typescript
const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeDefined();

// Type guard for discriminated union + verify root node
if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
  expect(treeUpdatedEvent.root).toBe(parent.getNode());
}
```

**Why Type Guards:**
- **Narrowing**: TypeScript knows `treeUpdatedEvent.root` exists inside the if
- **Null safety**: Check both exists and correct type before accessing properties
- **Self-documenting**: Makes the check explicit in test code

### 5.3 Call Order Verification

Tests track the order of observer method calls to verify sequencing guarantees.

**Pattern** (`/home/dustin/projects/groundswell/src/__tests__/unit/workflow-emitEvent-childDetached.test.ts`, lines 45-66):

```typescript
it('should call onEvent() before onTreeChanged() for childDetached', () => {
  const parent = new SimpleWorkflow('Parent');
  const callOrder: string[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => callOrder.push('onEvent'),
    onStateUpdated: () => {},
    onTreeChanged: () => callOrder.push('onTreeChanged'),
  };

  parent.addObserver(observer);
  const child = new SimpleWorkflow('Child', parent);
  callOrder.length = 0;
  parent.detachChild(child);

  expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
});
```

**Why Order Matters:**
- **State consistency**: Observers may update state in `onEvent()` that `onTreeChanged()` relies on
- **Event processing**: Ensures events are processed before tree change notifications
- **Debugging**: Predictable order makes issues easier to reproduce

### 5.4 Integration Test Pattern

Integration tests create multi-level workflow trees and verify events propagate correctly to root observers.

**Pattern** (`/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`, lines 45-81):

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

**Key Test Aspects:**
- **Real workflow execution**: Tests actual workflow logic, not just events
- **Error tolerance**: Uses try-catch to allow workflows to fail without failing test
- **Filtering by node.name**: Verifies events from specific nodes in hierarchy
- **Root observer pattern**: Verifies child events bubble up to root

### 5.5 Incremental Update Verification

Tests verify that incremental updates work correctly by checking node counts and map consistency.

**Pattern** (`/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`):

```typescript
it('multiple rapid attach/detach operations work correctly', () => {
  const root = new IncrementalTestWorkflow('Root');
  const child1 = new IncrementalTestWorkflow('Child1', root);
  const child2 = new IncrementalTestWorkflow('Child2', root);
  const grandchild1 = new IncrementalTestWorkflow('Grandchild1', child1);
  const grandchild2 = new IncrementalTestWorkflow('Grandchild2', child1);

  const debugger_ = new WorkflowTreeDebugger(root);
  expect(debugger_.getStats().totalNodes).toBe(5);

  // Detach child1 (removes child1 + 2 grandchildren)
  root.detachChild(child1);
  expect(debugger_.getStats().totalNodes).toBe(2);

  // Attach a new child
  const child3 = new IncrementalTestWorkflow('Child3', root);
  expect(debugger_.getStats().totalNodes).toBe(3);
  expect(debugger_.getNode(child3.id)).toBe(child3.getNode());

  // Detach child2
  root.detachChild(child2);
  expect(debugger_.getStats().totalNodes).toBe(2);

  // Verify final state
  expect(debugger_.getNode(root.id)).toBe(root.getNode());
  expect(debugger_.getNode(child3.id)).toBe(child3.getNode());
  expect(debugger_.getNode(child1.id)).toBeUndefined();
  expect(debugger_.getNode(child2.id)).toBeUndefined();
  expect(debugger_.getNode(grandchild1.id)).toBeUndefined();
  expect(debugger_.getNode(grandchild2.id)).toBeUndefined();
});
```

**What This Tests:**
- **Incremental correctness**: Node count updates correctly after each operation
- **Map consistency**: Nodes are present/absent as expected
- **Multiple operations**: Sequential operations don't interfere with each other
- **Edge cases**: Deep subtrees are fully removed

### 5.6 Test File Organization

Tests are organized by feature and level (unit vs integration):

```
src/__tests__/
├── unit/
│   ├── workflow.test.ts                    # Core workflow logic
│   ├── tree-debugger-incremental.test.ts   # Incremental updates
│   ├── workflow-emitEvent-childDetached.test.ts  # Event emission
│   └── workflow-detachChild.test.ts        # Child detachment
├── integration/
│   ├── tree-mirroring.test.ts              # Full workflow execution
│   ├── agent-workflow.test.ts              # Agent integration
│   ├── observer-logging.test.ts            # Observer error handling
│   └── workflow-reparenting.test.ts        # Reparenting workflows
└── adversarial/
    ├── edge-case.test.ts                   # Edge cases
    ├── observer-propagation.test.ts        # Event propagation
    └── prd-compliance.test.ts              # PRD requirements
```

**Test Naming Conventions:**
- **Unit tests**: `[feature].test.ts` - Test single class/method
- **Integration tests**: `[feature]-integration.test.ts` - Test multiple components
- **Adversarial tests**: Test edge cases and error conditions

---

## 6. Patterns for Replay Implementation

### 6.1 Recommended Architecture

Based on the research, the event replay implementation should follow these patterns:

```typescript
export class WorkflowEventReplayer {
  private nodeMap: Map<string, WorkflowNode> = new Map();
  private root: WorkflowNode | null = null;

  replay(events: WorkflowEvent[]): WorkflowNode {
    for (const event of events) {
      try {
        switch (event.type) {
          case 'childAttached':
            this.handleChildAttached(event);
            break;
          case 'childDetached':
            this.handleChildDetached(event);
            break;
          case 'treeUpdated':
            this.handleTreeUpdated(event);
            break;
          // Phase 2: Handle state events
          case 'stateSnapshot':
            this.handleStateSnapshot(event);
            break;
          case 'error':
            this.handleErrorEvent(event);
            break;
          default:
            // Metadata events: logged but don't modify tree
            break;
        }
      } catch (err) {
        console.error(`Error processing event ${event.type}:`, err);
        // Continue processing subsequent events
      }
    }

    if (!this.root) {
      throw new Error('No root node established from events');
    }

    return this.root;
  }
}
```

### 6.2 Key Takeaways

1. **Use discriminated unions**: TypeScript will narrow types automatically in switch statements
2. **Map-based node tracking**: O(1) lookups, no tree traversals needed
3. **Incremental updates**: Process each event sequentially, don't rebuild entire tree
4. **Error isolation**: Catch errors per-event and continue processing
5. **Idempotent operations**: Handlers should be safe to call multiple times
6. **Validation first**: Check node existence and relationships before modifying
7. **BFS for subtree removal**: Avoid stack overflow on deep trees
8. **Log warnings for missing nodes**: Don't throw, continue processing
9. **Return early for no-ops**: If node already removed/added, just return
10. **Test with real workflows**: Integration tests should execute real workflows

### 6.3 Testing Strategy

Follow the existing test patterns:

```typescript
describe('WorkflowEventReplayer', () => {
  it('should replay childAttached events', () => {
    const events: WorkflowEvent[] = [
      { type: 'childAttached', parentId: 'root', child: mockChildNode }
    ];

    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(events);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].id).toBe(mockChildNode.id);
  });

  it('should handle missing parent nodes gracefully', () => {
    const events: WorkflowEvent[] = [
      { type: 'childAttached', parentId: 'nonexistent', child: mockChildNode }
    ];

    const replayer = new WorkflowEventReplayer();
    // Should not throw, should log warning
    expect(() => replayer.replay(events)).not.toThrow();
  });

  it('should process events sequentially', () => {
    const callOrder: string[] = [];
    // ... test that events are processed in order
  });
});
```

---

## Appendix: File References

| File | Lines | Description |
|------|-------|-------------|
| `/home/dustin/projects/groundswell/src/types/events.ts` | 1-76 | Event type definitions (15+ event types) |
| `/home/dustin/projects/groundswell/src/types/observer.ts` | 1-19 | WorkflowObserver interface |
| `/home/dustin/projects/groundswell/src/types/error.ts` | 1-21 | WorkflowError interface |
| `/home/dustin/projects/groundswell/src/core/workflow.ts` | 413-429 | Event emission logic |
| `/home/dustin/projects/groundswell/src/core/workflow.ts` | 316-355 | attachChild implementation |
| `/home/dustin/projects/groundswell/src/core/workflow.ts` | 379-408 | detachChild implementation |
| `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` | 92-117 | onEvent handler with switch |
| `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` | 53-58 | buildNodeMap helper |
| `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` | 65-84 | removeSubtreeNodes helper |
| `/home/dustin/projects/groundswell/src/debugger/event-replayer.ts` | 35-290 | Event replayer interface |
| `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts` | 1-171 | Incremental update tests |
| `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-emitEvent-childDetached.test.ts` | 1-154 | Event emission tests |
| `/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts` | 1-154 | Tree mirroring tests |
| `/home/dustin/projects/groundswell/src/__tests__/integration/observer-logging.test.ts` | 1-644 | Observer error handling tests |

---

## Summary

This research document identifies the key patterns used in the codebase for event handling:

1. **Observer-based dispatch** with root-level aggregation
2. **Discriminated unions** for type-safe event handling
3. **Map-based node tracking** for O(1) lookups
4. **Sequential processing** with deterministic ordering
5. **Error isolation** to prevent cascading failures
6. **BFS traversal** for safe subtree removal
7. **Idempotent operations** for robustness
8. **Comprehensive testing** with unit, integration, and adversarial tests

These patterns provide a solid foundation for implementing the event replay logic in P2M1T1S2.
