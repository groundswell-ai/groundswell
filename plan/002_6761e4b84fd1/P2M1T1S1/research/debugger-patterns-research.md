# Debugger Patterns and Tree Structure Research

**Research Date:** 2026-01-24
**Purpose:** Inform WorkflowEventReplayer design with existing codebase patterns

---

## Executive Summary

The existing codebase provides excellent patterns for tree manipulation, node tracking, and event handling. The `WorkflowTreeDebugger` class demonstrates best practices for:

1. **Map-based node tracking** - O(1) lookups with `Map<string, WorkflowNode>`
2. **Incremental tree updates** - O(k) subtree operations using BFS
3. **Observer pattern integration** - Clean separation of concerns
4. **Tree visualization** - ASCII rendering patterns
5. **Statistics collection** - Recursive tree traversal patterns

These patterns should be reused/adapted for the `WorkflowEventReplayer` class.

---

## 1. Existing Debugger Implementation

### File Location
`src/debugger/tree-debugger.ts`

### Class Structure

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  private root: WorkflowNode;
  public readonly events: Observable<WorkflowEvent>;
  private nodeMap: Map<string, WorkflowNode> = new Map();

  constructor(workflow: Workflow) {
    this.root = workflow.getNode();
    this.events = new Observable<WorkflowEvent>();
    this.buildNodeMap(this.root);
    workflow.addObserver(this);
  }
}
```

### Key Methods

#### Tree Building Pattern
```typescript
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);
  }
}
```
- **Pattern**: Recursive depth-first traversal
- **Use for**: Initial tree construction from events
- **Complexity**: O(n) where n = total nodes

#### Subtree Removal Pattern (O(k) BFS)
```typescript
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // Guard clause for safety

  // BFS traversal to collect all descendant IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);
  }

  // Batch delete all collected keys
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```
- **Pattern**: Iterative BFS to avoid stack overflow
- **Use for**: Handling `childDetached` events during replay
- **Complexity**: O(k) where k = subtree size
- **Gotcha**: Always check `if (!node) return` for missing nodes

#### Event Handling Pattern
```typescript
onEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'childAttached':
      this.buildNodeMap(event.child);
      break;

    case 'childDetached':
      this.removeSubtreeNodes(event.childId);
      break;

    case 'treeUpdated':
      this.root = event.root;
      break;

    default:
      // Non-structural events - no map update needed
      break;
  }

  this.events.next(event);
}
```
- **Pattern**: Discriminated union handling
- **Use for**: Replay event processing
- **Gotcha**: Only structural events modify the tree

---

## 2. Tree Mutation Patterns

### Attachment Process (from `src/core/workflow.ts`)

```typescript
attachChild(child: Workflow): void {
  // 1. Validate single-parent rule
  if (child.parent) {
    throw new Error('Child already has a parent');
  }

  // 2. Prevent circular references
  if (child.isDescendantOf(this)) {
    throw new Error('Cannot attach descendant as child');
  }

  // 3. Update both trees atomically
  this.children.push(child);
  this.node.children.push(child.node);

  // 4. Emit event AFTER tree is consistent
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node
  });
}
```

### Key Invariants

1. **Single-parent rule**: Each node has at most one parent
2. **1:1 tree mirror**: Workflow tree and node tree stay synchronized
3. **Cycle detection**: `isDescendantOf()` prevents infinite loops
4. **Atomic updates**: Tree mutation completes before event emission

### For Replayer Implementation

When replaying `childAttached` events:
```typescript
function handleChildAttached(event: ChildAttachedEvent, root: WorkflowNode): void {
  const parent = nodeMap.get(event.parentId);
  const child = event.child;  // Deep clone to avoid reference issues

  if (!parent) {
    throw new Error(`Parent node ${event.parentId} not found`);
  }

  // Clear child's existing parent reference (if any)
  child.parent = parent;

  // Add to parent's children array
  parent.children.push(child);

  // Update node map
  buildNodeMap(child);
}
```

---

## 3. Observer Integration

### Event Flow

```
Workflow Event → emitEvent() → Observer.onEvent() → Debugger.onEvent()
                                      ↓
                            Tree state updates
                                      ↓
                            Observable.next() → Subscribers
```

### Error Isolation Pattern

```typescript
// In Workflow.emitEvent()
for (const obs of this.getRootObservers()) {
  try {
    obs.onEvent(event);
  } catch (err) {
    // Observer failure doesn't crash workflow
    console.error('Observer error:', err);
  }
}
```

**For Replayer**: This pattern ensures replay failures don't corrupt state

### Observer Lifecycle

```typescript
// Observers are only added to ROOT workflows
workflow.addObserver(observer);  // Only valid on root

// Child workflows inherit parent's observers
// No need to register observers on children
```

**For Replayer**: Replay system should only care about root-level events

---

## 4. Related Type Definitions

### WorkflowNode Structure

```typescript
export interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: SerializedWorkflowState | null;
}
```

**Replayer Gotchas**:
- `parent` must be set correctly for tree consistency
- `children` is an array (order matters for visualization)
- `stateSnapshot` can be `null` (no snapshot captured)

### WorkflowEvent Types (15+)

```typescript
type WorkflowEvent =
  // Structural events (modify tree)
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'treeUpdated'; root: WorkflowNode }

  // State events (update node properties)
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }

  // Metadata events (don't modify tree)
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'agentPromptStart'; agentId: string; agentName: string; promptId: string; node: WorkflowNode }
  | { type: 'agentPromptEnd'; agentId: string; agentName: string; promptId: string; node: WorkflowNode; duration: number; tokenUsage?: TokenUsage }
  | { type: 'toolInvocation'; toolName: string; input: unknown; output: unknown; duration: number; node: WorkflowNode }
  | { type: 'mcpEvent'; serverName: string; event: string; payload?: unknown; node: WorkflowNode }
  | { type: 'reflectionStart'; level: 'workflow' | 'agent' | 'prompt'; node: WorkflowNode }
  | { type: 'reflectionEnd'; level: 'workflow' | 'agent' | 'prompt'; success: boolean; node: WorkflowNode }
  | { type: 'cacheHit'; key: string; node: WorkflowNode }
  | { type: 'cacheMiss'; key: string; node: WorkflowNode };
```

**For Replayer**: Focus on structural + state events first (7 types)

### SerializedWorkflowState

```typescript
export type SerializedWorkflowState = Record<string, unknown>;
```

- Simple key-value record
- Used in `stateSnapshot` field
- Used in `WorkflowError.state` for error context

### WorkflowError

```typescript
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // Context at error time
  logs: LogEntry[];                // Logs from failing node
}
```

**For Replayer**: Error events include rich context - preserve this during replay

---

## 5. Test Patterns

### Test File Locations

- `src/__tests__/unit/tree-debugger.test.ts` - Basic debugger tests
- `src/__tests__/unit/tree-debugger-incremental.test.ts` - Incremental update tests

### Tree Building Pattern

```typescript
class TestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}

const root = new TestWorkflow('Root');
const child1 = new TestWorkflow('Child1', root);
const grandchild = new TestWorkflow('Grandchild', child1);
```

### Event Collection Pattern

```typescript
const events: WorkflowEvent[] = [];
debugger.events.subscribe({
  next: (event) => events.push(event),
});
```

### Node Lookup Validation

```typescript
expect(debugger_.getNode(root.id)).toBe(root.getNode());
expect(debugger_.getNode(child.id)).toBeUndefined();  // After detach
```

### Statistics Validation

```typescript
const stats = debugger_.getStats();
expect(stats.totalNodes).toBe(3);
expect(stats.byStatus['completed']).toBe(3);
```

---

## 6. Related: EventTreeHandleImpl

### File Location
`src/core/event-tree.ts`

### Pattern: Tree Building from WorkflowNode

```typescript
constructor(workflowNode: WorkflowNode) {
  this.root = this.buildEventNode(workflowNode);
  this.buildIndex(this.root);
}

private buildEventNode(wfNode: WorkflowNode, parentId?: string): EventNode {
  const eventNode: EventNode = {
    id: wfNode.id,
    type: 'workflow',
    timestamp: Date.now(),
    name: wfNode.name,
    parentId,
    children: [],
    metrics: this.extractMetrics(wfNode),
  };

  // Add event nodes from workflow events
  for (const event of wfNode.events) {
    const childNode = this.eventToNode(event, wfNode.id);
    if (childNode) {
      eventNode.children.push(childNode);
    }
  }

  // Add child workflow nodes
  for (const child of wfNode.children) {
    eventNode.children.push(this.buildEventNode(child, wfNode.id));
  }

  return eventNode;
}
```

**For Replayer**: This shows how to build a tree from a WorkflowNode - similar pattern for replay

---

## 7. Key Insights for Event Replay System

### 1. Map-Based Node Tracking

The `Map<string, WorkflowNode>` pattern is optimal for replay:
- O(1) node lookup by ID
- Efficient for dynamic node additions/removals
- Use this for the replayer's internal state

### 2. Incremental Updates are O(k)

- `childAttached`: O(k) where k = subtree size
- `childDetached`: O(k) using BFS traversal
- `stateSnapshot`: O(1) single node update

**For Replayer**: Process events sequentially and update tree incrementally

### 3. Event Ordering Matters

Events are emitted in a specific order:
1. Tree mutation occurs first
2. Event is emitted AFTER tree is consistent
3. Observers receive events synchronously

**For Replayer**: Must preserve event order during replay

### 4. Tree Consistency Invariants

During replay, maintain these invariants:
- Single-parent rule (each child has one parent)
- Bidirectional references (parent.children and child.parent match)
- No circular references (tree is a DAG)

### 5. Error Context is Rich

Error events include:
- Full state snapshot at error time
- Logs from the failing node
- Stack trace if available

**For Replayer**: Preserve this context for time-travel debugging

---

## 8. Replayer Design Recommendations

### Class Structure

```typescript
export class WorkflowEventReplayer {
  private nodeMap: Map<string, WorkflowNode> = new Map();
  private root: WorkflowNode | null = null;

  replay(events: WorkflowEvent[]): WorkflowNode {
    for (const event of events) {
      this.processEvent(event);
    }
    return this.root!;
  }

  private processEvent(event: WorkflowEvent): void {
    switch (event.type) {
      case 'childAttached':
        this.handleChildAttached(event);
        break;
      case 'childDetached':
        this.handleChildDetached(event);
        break;
      // ... other event types
    }
  }
}
```

### Key Patterns to Reuse

1. **`buildNodeMap()`** - For adding subtrees from `childAttached`
2. **`removeSubtreeNodes()`** - For handling `childDetached`
3. **`onEvent()` switch statement** - For discriminated union handling
4. **Statistics collection** - For validation after replay

### Validation Approach

After replay, verify:
```typescript
// 1. Root exists
assert(this.root !== null);

// 2. All nodes in map
assert(this.nodeMap.size === expectedNodeCount);

// 3. Tree is connected
assert(this.root.parent === null);

// 4. No orphaned nodes
for (const [id, node] of this.nodeMap) {
  if (node.parent) {
    assert(node.parent.children.includes(node));
  }
}
```

---

## 9. Critical Gotchas

1. **Deep clone nodes** - Events contain references to original nodes; clone to avoid mutation
2. **Handle missing parents** - Events may reference nodes not yet added; throw clear error
3. **Preserve event order** - Process sequentially; don't parallelize
4. **State snapshots are optional** - `stateSnapshot` can be `null`
5. **Error events are special** - Include context that should be preserved
6. **Circular reference detection** - Validate tree is a DAG after replay
7. **Root identification** - First `childAttached` with no parent sets the root

---

## 10. References

### Source Files

- `src/debugger/tree-debugger.ts` - Main debugger implementation
- `src/core/workflow.ts` - Workflow tree mutation logic
- `src/core/event-tree.ts` - Event tree builder pattern
- `src/types/events.ts` - All 15+ event type definitions
- `src/types/workflow.ts` - WorkflowNode interface
- `src/types/snapshot.ts` - SerializedWorkflowState type
- `src/types/error.ts` - WorkflowError interface
- `src/__tests__/unit/tree-debugger.test.ts` - Basic tests
- `src/__tests__/unit/tree-debugger-incremental.test.ts` - Incremental update tests

### Related Research

- `plan/002_6761e4b84fd1/architecture/OBSERVABILITY_PATTERNS_RESEARCH.md` - Observer patterns and event sourcing
