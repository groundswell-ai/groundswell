# Tree Structure Manipulation Patterns & Best Practices

**Research Date**: 2026-01-24
**Researcher**: Claude Code Analysis
**Purpose**: Inform PRP implementation for replay logic of tree structure events

---

## Executive Summary

This document catalogs all existing tree structure manipulation patterns in the groundswell codebase. The codebase maintains **two synchronized tree representations**:

1. **Workflow Tree**: `Workflow` instances linked via `parent` and `children` properties
2. **Node Tree**: `WorkflowNode` objects linked via `node.parent` and `node.children` properties

**Critical Invariant**: The workflow tree and node tree must remain perfectly synchronized (1:1 mirror). Every operation that modifies one must also modify the other.

---

## 1. Key Patterns Found

### Pattern 1.1: Dual Tree Synchronization (The 1:1 Mirror)

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:316-355`

**When to Use**: Any time you modify parent-child relationships

```typescript
// CORRECT: Update BOTH trees atomically
public attachChild(child: Workflow): void {
  // Validation checks here...

  // Update child's parent references
  if (child.parent === null) {
    child.parent = this;                          // Workflow tree
    child.node.parent = this.node;                // Node tree (MIRROR)
  }

  // Add to parent's children arrays
  this.children.push(child);                      // Workflow tree
  this.node.children.push(child.node);            // Node tree (MIRROR)

  // Emit event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

**Key Points**:
- Always update `child.parent` AND `child.node.parent` together
- Always update `this.children` AND `this.node.children` together
- Emit event AFTER all structural changes are complete
- Order matters: update child references before adding to parent arrays

---

### Pattern 1.2: Map-Based Node Tracking with O(1) Lookups

**Location**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:33-58`

**When to Use**: When you need fast node access by ID

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  private nodeMap: Map<string, WorkflowNode> = new Map();

  constructor(workflow: Workflow) {
    this.root = workflow.getNode();
    this.buildNodeMap(this.root);  // Initial build
  }

  // Recursive DFS to populate map
  private buildNodeMap(node: WorkflowNode): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildNodeMap(child);  // Recurse
    }
  }

  // O(1) lookup
  public getNode(id: string): WorkflowNode | undefined {
    return this.nodeMap.get(id);
  }
}
```

**Key Points**:
- Map<string, WorkflowNode> provides O(1) node lookup
- Recursive DFS traversal is simple and effective for initial build
- For incremental updates, use BFS (see Pattern 1.3)
- Map must stay synchronized with tree structure

---

### Pattern 1.3: Incremental Map Updates with BFS Subtree Removal

**Location**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:65-84`

**When to Use**: When removing a subtree from the map

```typescript
/**
 * Remove entire subtree from node map using BFS traversal.
 * O(k) complexity where k = number of nodes in subtree.
 * Uses iterative BFS to avoid stack overflow on deep trees.
 */
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // Already removed or never existed (no-op)

  // BFS traversal to collect all descendant IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);  // Add children for BFS
  }

  // Batch delete all collected keys (atomic update)
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

**Key Points**:
- **BFS over DFS**: Prevents stack overflow on deep trees
- **No-op safety**: Return silently if node doesn't exist
- **Batch delete**: Collect all IDs first, then delete in batch
- **O(k) complexity**: Linear in subtree size
- **Queue-based**: Uses array as queue (shift() + push())

---

### Pattern 1.4: Event-Driven Tree Updates

**Location**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:92-117`

**When to Use**: When responding to tree structure changes

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

**Key Points**:
- Structural events trigger map updates
- Non-structural events (status, logs, etc.) don't modify tree
- Always forward events to observers after handling
- Switch statement provides clear event categorization

---

### Pattern 1.5: Detach Operation with Dual-Tree Cleanup

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:379-408`

**When to Use**: When removing a child from a parent

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
  child.node.parent = null;  // Maintain 1:1 mirror

  // Emit childDetached event
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });
}
```

**Key Points**:
- **Validation first**: Check child exists before removing
- **Array splice**: Use indexOf + splice for removal (not filter)
- **Dual cleanup**: Remove from both workflow tree and node tree
- **Clear references**: Set both parent references to null
- **Emit after**: Emit event only after all changes complete
- **Both arrays**: Remove from `this.children` AND `this.node.children`

---

### Pattern 1.6: Cycle Detection with Visited Set

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:201-219`

**When to Use**: When traversing parent chain to detect circular references

```typescript
/**
 * Check if this workflow is a descendant of the given ancestor workflow.
 * Uses a visited Set to detect cycles during traversal.
 *
 * Time Complexity: O(d) where d is the depth of the hierarchy
 * Space Complexity: O(d) for the visited Set in worst case (cycle detection)
 */
public isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

**Key Points**:
- **Visited Set**: Tracks visited nodes to detect cycles
- **Throw on cycle**: Don't return false, throw error immediately
- **O(d) time**: Linear in depth of hierarchy
- **O(d) space**: Set can grow to depth of tree
- **Used in validation**: Called before attaching to prevent cycles

---

### Pattern 1.7: Multi-Level Validation Before Mutation

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:316-355`

**When to Use**: Before performing any tree mutation

```typescript
public attachChild(child: Workflow): void {
  // Validation 1: Check duplicate attachment
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // Validation 2: Check single-parent rule
  if (child.parent !== null && child.parent !== this) {
    const errorMessage =
      `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent. ` +
      `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validation 3: Check for circular references
  if (this.isDescendantOf(child)) {
    const errorMessage =
      `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Only after all validations pass, perform the mutation
  // ... (mutation code here)
}
```

**Key Points**:
- **Validate first**: All checks before any mutation
- **Specific errors**: Each validation has specific error message
- **Console logging**: Log errors before throwing for debugging
- **Order matters**: Check simple conditions before expensive traversals
- **Fail fast**: Throw immediately on first validation failure

---

## 2. Invariants Maintained

### Invariant 2.1: Single-Parent Rule
**Definition**: Each workflow can have at most one parent.

**Enforcement**:
```typescript
// In attachChild():
if (child.parent !== null && child.parent !== this) {
  throw new Error('Child already has a parent');
}
```

**Locations**:
- `/home/dustin/projects/groundswell/src/core/workflow.ts:321-329`

---

### Invariant 2.2: 1:1 Tree Mirror
**Definition**: Workflow tree and node tree must always be synchronized.

**Enforcement**:
```typescript
// Every operation updates BOTH trees:
child.parent = this;              // Workflow tree
child.node.parent = this.node;    // Node tree (MIRROR)

this.children.push(child);        // Workflow tree
this.node.children.push(child.node); // Node tree (MIRROR)
```

**Locations**:
- `/home/dustin/projects/groundswell/src/core/workflow.ts:342-347` (attachChild)
- `/home/dustin/projects/groundswell/src/core/workflow.ts:389-400` (detachChild)

---

### Invariant 2.3: No Circular References
**Definition**: Tree must be a Directed Acyclic Graph (DAG).

**Enforcement**:
```typescript
// In attachChild():
if (this.isDescendantOf(child)) {
  throw new Error('Would create circular reference');
}
```

**Locations**:
- `/home/dustin/projects/groundswell/src/core/workflow.ts:332-338`
- `/home/dustin/projects/groundswell/src/core/workflow.ts:201-219` (isDescendantOf)

---

### Invariant 2.4: Parent-Child Consistency
**Definition**: If A is in B.children, then B must be A.parent.

**Enforcement**:
```typescript
// In attachChild():
if (child.parent === null) {
  child.parent = this;           // Set child's parent
  child.node.parent = this.node; // Set child.node's parent
}
this.children.push(child);       // Add to parent's children
this.node.children.push(child.node); // Add to parent.node's children
```

**Locations**:
- `/home/dustin/projects/groundswell/src/core/workflow.ts:341-347`

---

### Invariant 2.5: Map-Tree Synchronization
**Definition**: Map must contain exactly the nodes in the current tree.

**Enforcement**:
```typescript
// On childAttached:
this.buildNodeMap(event.child);  // Add child + all descendants

// On childDetached:
this.removeSubtreeNodes(event.childId);  // Remove child + all descendants
```

**Locations**:
- `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:95-102`

---

## 3. Validation Logic

### Validation 3.1: Pre-Attach Validation Checklist

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:316-339`

```typescript
public attachChild(child: Workflow): void {
  // ✅ Check 1: Not already attached to this parent
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // ✅ Check 2: Single-parent rule (not attached to different parent)
  if (child.parent !== null && child.parent !== this) {
    throw new Error(
      `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
      `Use detachChild() first for reparenting.`
    );
  }

  // ✅ Check 3: No circular references
  if (this.isDescendantOf(child)) {
    throw new Error(
      `Cannot attach '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`
    );
  }

  // All validations passed - safe to mutate
}
```

---

### Validation 3.2: Pre-Detach Validation

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:379-387`

```typescript
public detachChild(child: Workflow): void {
  // ✅ Check: Child must be attached to this parent
  const index = this.children.indexOf(child);

  if (index === -1) {
    throw new Error(
      `Child '${child.node.name}' is not attached to workflow '${this.node.name}'`
    );
  }

  // Validation passed - safe to mutate
}
```

---

### Validation 3.3: Cycle Detection Traversal

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:201-219`

```typescript
public isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {
    // ✅ Cycle detection
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    // ✅ Ancestor check
    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

---

## 4. Performance Considerations

### Performance 4.1: Map-Based Lookups
**Complexity**: O(1) for node lookup by ID

**Usage**:
```typescript
private nodeMap: Map<string, WorkflowNode> = new Map();

// Fast lookup
const node = this.nodeMap.get(nodeId);
```

**Trade-offs**:
- **Pros**: Constant-time access, simple API
- **Cons**: Must keep synchronized with tree (memory overhead)

---

### Performance 4.2: BFS Subtree Removal
**Complexity**: O(k) where k = number of nodes in subtree

**Location**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:65-84`

```typescript
private removeSubtreeNodes(nodeId: string): void {
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);  // BFS traversal
  }

  // Batch delete
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

**Why BFS over DFS?**
- Iterative (no stack overflow on deep trees)
- Same O(k) complexity as DFS
- More memory efficient for wide trees

---

### Performance 4.3: Recursive Map Building
**Complexity**: O(k) where k = number of nodes in subtree

**Location**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:53-58`

```typescript
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);  // Recursive DFS
  }
}
```

**Trade-offs**:
- **Pros**: Simple code, natural recursion
- **Cons**: Stack overflow risk on very deep trees (>10,000 depth)
- **Mitigation**: For initial build, tree depth is typically small

---

### Performance 4.4: Array Splice for Removal
**Complexity**: O(n) where n = length of children array

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:390-396`

```typescript
// Remove from workflow tree
const index = this.children.indexOf(child);  // O(n)
this.children.splice(index, 1);              // O(n)

// Remove from node tree
const nodeIndex = this.node.children.indexOf(child.node);  // O(n)
this.node.children.splice(nodeIndex, 1);                   // O(n)
```

**Trade-offs**:
- **Pros**: Simple, preserves order
- **Cons**: Linear time for removal
- **Mitigation**: Children arrays are typically small (<100 items)

---

### Performance 4.5: Parent Chain Traversal
**Complexity**: O(d) where d = depth of hierarchy

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:201-219`

```typescript
public isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {  // O(d) iterations
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

**Trade-offs**:
- **Pros**: Simple, accurate cycle detection
- **Cons**: Must traverse entire chain in worst case
- **Mitigation**: Workflow hierarchies are typically shallow (<100 depth)

---

## 5. Gotchas & Edge Cases

### Gotcha 5.1: Removing Child That's Not Attached
**Problem**: Calling `detachChild()` on a child that's not attached throws error.

**Solution**: Always validate first:
```typescript
const index = this.children.indexOf(child);
if (index === -1) {
  throw new Error(`Child not attached`);
}
```

**Test**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts:87-99`

---

### Gotcha 5.2: Reparenting Requires Detach First
**Problem**: Cannot attach child that already has a different parent.

**Solution**: Always detach before reparenting:
```typescript
// CORRECT: Detach from old parent first
oldParent.detachChild(child);
newParent.attachChild(child);

// WRONG: Will throw error
newParent.attachChild(child);  // Error: child already has parent
oldParent.detachChild(child);
```

**Test**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:89-92`

---

### Gotcha 5.3: Map Contains Orphaned Nodes After Detach
**Problem**: If you don't update map on detach, lookups return stale nodes.

**Solution**: Always remove subtree from map on detach:
```typescript
case 'childDetached':
  this.removeSubtreeNodes(event.childId);  // Remove child + descendants
  break;
```

**Test**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts:11-39`

---

### Gotcha 5.4: Duplicate Attachment Throws
**Problem**: Calling `attachChild()` twice on same child throws error.

**Solution**: Check before attaching:
```typescript
if (this.children.includes(child)) {
  throw new Error('Child already attached to this workflow');
}
```

**Test**: `/home/dustin/projects/groundswell/src/core/workflow.ts:317-319`

---

### Gotcha 5.5: Circular Reference Prevention
**Problem**: Attaching ancestor as its own descendant creates cycle.

**Solution**: Check with `isDescendantOf()`:
```typescript
if (this.isDescendantOf(child)) {
  throw new Error('Cannot attach ancestor as descendant');
}
```

**Example**:
```typescript
const root = new Workflow('Root');
const child = new Workflow('Child', root);

// This would throw:
child.attachChild(root);  // Error: root is ancestor of child
```

**Test**: `/home/dustin/projects/groundswell/src/core/workflow.ts:332-338`

---

### Gotcha 5.6: Stack Overflow on Deep Recursive Build
**Problem**: `buildNodeMap()` uses recursion, can overflow on deep trees.

**Solution**: Use iterative BFS for removal (already done), consider BFS for build too.

**Mitigation**: In practice, workflow trees are rarely deep enough to cause overflow.

**Test**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts:140-169` (tests 10-deep tree)

---

### Gotcha 5.7: Map Returns Undefined for Missing Nodes
**Problem**: `nodeMap.get(id)` returns `undefined` if node not found.

**Solution**: Always check for undefined:
```typescript
const node = this.nodeMap.get(nodeId);
if (!node) return;  // Safe no-op

// Proceed with node...
```

**Test**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts:66-67`

---

### Gotcha 5.8: Node Tree Can Become Out of Sync
**Problem**: Forgetting to update `node.parent` or `node.children` breaks mirror invariant.

**Solution**: Always update both trees together:
```typescript
// WRONG: Only updates workflow tree
child.parent = this;
this.children.push(child);

// CORRECT: Updates both trees
child.parent = this;
child.node.parent = this.node;
this.children.push(child);
this.node.children.push(child.node);
```

**Test**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:279-301` (validates mirror invariant)

---

### Gotcha 5.9: Event Contains Child Node, Not Child ID
**Problem**: `childAttached` event contains full `child` node, `childDetached` contains only `childId`.

**Solution**: Handle events differently:
```typescript
case 'childAttached':
  this.buildNodeMap(event.child);  // Has full node
  break;

case 'childDetached':
  this.removeSubtreeNodes(event.childId);  // Has only ID
  break;
```

**Reason**: Detached node may have been garbage collected, ID is sufficient for removal.

**Test**: `/home/dustin/projects/groundswell/src/types/events.ts:10-11`

---

### Gotcha 5.10: Array indexOf vs includes
**Problem**: `indexOf()` returns index (needed for splice), `includes()` returns boolean.

**Solution**: Use `indexOf()` when you need the index:
```typescript
// When you need index for splice:
const index = this.children.indexOf(child);
if (index === -1) throw new Error('Not found');
this.children.splice(index, 1);

// When you only need boolean:
if (this.children.includes(child)) {
  throw new Error('Already attached');
}
```

**Test**: `/home/dustin/projects/groundswell/src/core/workflow.ts:317` (includes) vs `:381` (indexOf)

---

## 6. Code Snippets for PRP Implementation

### Snippet 6.1: handleChildAttached Implementation Template

```typescript
/**
 * Handle childAttached event - add subtree to tree.
 */
private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void {
  // Step 1: Find parent node
  const parent = this.nodeMap.get(event.parentId);
  if (!parent) {
    throw new Error(`Parent node '${event.parentId}' not found in nodeMap`);
  }

  // Step 2: Deep clone child to avoid mutating original
  const child = JSON.parse(JSON.stringify(event.child)) as WorkflowNode;

  // Step 3: Validate child doesn't already have parent
  if (child.parent !== null && child.parent !== parent) {
    throw new Error(
      `Child '${child.id}' already has a parent. Single-parent rule violation.`
    );
  }

  // Step 4: Validate no circular reference
  // (Need to implement isDescendantOf for WorkflowNode)

  // Step 5: Set bidirectional references
  child.parent = parent;
  parent.children.push(child);

  // Step 6: Add child and descendants to nodeMap
  this.buildNodeMap(child);

  // Step 7: Update root if necessary
  if (!this.root || parent.id === this.root.id) {
    this.root = parent;
  }
}
```

---

### Snippet 6.2: handleChildDetached Implementation Template

```typescript
/**
 * Handle childDetached event - remove subtree from tree.
 */
private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
  // Step 1: Find parent and child nodes
  const parent = this.nodeMap.get(event.parentId);
  const child = this.nodeMap.get(event.childId);

  if (!parent) {
    throw new Error(`Parent node '${event.parentId}' not found in nodeMap`);
  }

  if (!child) {
    throw new Error(`Child node '${event.childId}' not found in nodeMap`);
  }

  // Step 2: Validate child is direct child of parent
  const childIndex = parent.children.indexOf(child);
  if (childIndex === -1) {
    throw new Error(
      `Child '${event.childId}' is not a direct child of parent '${event.parentId}'`
    );
  }

  // Step 3: Remove from parent's children array
  parent.children.splice(childIndex, 1);

  // Step 4: Clear child's parent reference
  child.parent = null;

  // Step 5: Remove child and all descendants from nodeMap
  this.removeSubtreeNodes(event.childId);

  // Step 6: Update root if necessary
  if (this.root && this.root.id === event.childId) {
    // Child was root - need to find new root
    // This is an edge case; may need to throw or rebuild
    throw new Error('Cannot detach root node');
  }
}
```

---

### Snippet 6.3: buildNodeMap Implementation Template

```typescript
/**
 * Build node lookup map recursively (DFS).
 * Complexity: O(k) where k = number of nodes in subtree
 */
private buildNodeMap(node: WorkflowNode): void {
  // Add current node to map
  this.nodeMap.set(node.id, node);

  // Recursively add all children
  for (const child of node.children) {
    this.buildNodeMap(child);
  }
}
```

---

### Snippet 6.4: removeSubtreeNodes Implementation Template

```typescript
/**
 * Remove entire subtree from node map using BFS traversal.
 * Complexity: O(k) where k = number of nodes in subtree
 */
private removeSubtreeNodes(nodeId: string): void {
  // Step 1: Find the node
  const node = this.nodeMap.get(nodeId);
  if (!node) {
    // Already removed or never existed - safe no-op
    return;
  }

  // Step 2: BFS traversal to collect all descendant IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);

    // Add children to queue for BFS traversal
    queue.push(...current.children);
  }

  // Step 3: Batch delete all collected keys (atomic update)
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

---

### Snippet 6.5: Cycle Detection for WorkflowNode

```typescript
/**
 * Check if targetNode is an ancestor of startNode.
 * Used to prevent circular references when attaching.
 *
 * @param startNode - The node to start traversal from
 * @param targetNode - The potential ancestor to look for
 * @returns true if targetNode is found in parent chain
 */
private isNodeDescendantOf(startNode: WorkflowNode, targetNode: WorkflowNode): boolean {
  const visited = new Set<WorkflowNode>();
  let current: WorkflowNode | null = startNode.parent;

  while (current !== null) {
    // Cycle detection
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected in node tree');
    }
    visited.add(current);

    // Check if we found the ancestor
    if (current.id === targetNode.id) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

---

## 7. Test Coverage Insights

### Test 7.1: Detach Removes Entire Subtree
**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts:11-39`

**What It Tests**:
- Detaching a parent removes it AND all descendants from map
- Map stays synchronized after detach
- Node count decreases correctly

**Key Assertion**:
```typescript
root.detachChild(child1);  // child1 has grandchild

expect(debugger_.getNode(child1.id)).toBeUndefined();
expect(debugger_.getNode(grandchild.id)).toBeUndefined();
expect(debugger_.getStats().totalNodes).toBe(2);  // Was 4, now 2
```

---

### Test 7.2: Reparenting Observer Propagation
**File**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:33-127`

**What It Tests**:
- After reparenting, events go to NEW parent's observers
- OLD parent's observers stop receiving events
- Tree structure updates correctly

**Key Pattern**:
```typescript
// Detach from old parent
parent1.detachChild(child);

// Attach to new parent
parent2.attachChild(child);

// Verify new parent receives events
child.setStatus('completed');
expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);

// Verify old parent does NOT receive events
expect(parent1Events.length).toBe(0);
```

---

### Test 7.3: 1:1 Tree Mirror Invariant
**File**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:279-301`

**What It Tests**:
- Workflow tree and node tree stay synchronized
- `child.parent` matches `child.node.parent`
- `parent.children` matches `parent.node.children`

**Key Assertion**:
```typescript
// Workflow tree state
expect(child.parent).toBe(parent2);
expect(parent2.children).toEqual([child]);

// Node tree state
expect(childNodeFinal.parent).toBe(parent2NodeFinal);
expect(parent2NodeFinal.children).toEqual([childNodeFinal]);

// Cross-verification
expect(parent2Debugger.getNode(child.id)).toBe(childNodeFinal);
```

---

### Test 7.4: Multiple Rapid Attach/Detach Operations
**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts:108-138`

**What It Tests**:
- Map stays consistent through multiple mutations
- No orphaned nodes left in map
- Final state is correct

**Key Pattern**:
```typescript
root.detachChild(child1);  // Remove 3 nodes
expect(debugger_.getStats().totalNodes).toBe(2);

const child3 = new Workflow('Child3', root);  // Add 1 node
expect(debugger_.getStats().totalNodes).toBe(3);

root.detachChild(child2);  // Remove 1 node
expect(debugger_.getStats().totalNodes).toBe(2);

// Verify final state
expect(debugger_.getNode(child3.id)).toBeDefined();
expect(debugger_.getNode(child1.id)).toBeUndefined();
```

---

### Test 7.5: Deep Tree Detach Performance
**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts:140-169`

**What It Tests**:
- BFS-based removal handles deep trees without stack overflow
- All descendants removed correctly (10-deep chain)
- Map size reduces appropriately

**Key Pattern**:
```typescript
// Build 10-deep chain
let current = child1;
const descendants = [];
for (let i = 0; i < 10; i++) {
  const descendant = new Workflow(`Descendant${i}`, current);
  descendants.push(descendant);
  current = descendant;
}

// Detach removes all 10 + child1
root.detachChild(child1);
expect(debugger_.getStats().totalNodes).toBe(1);  // Only root left

// Verify all removed
for (const descendant of descendants) {
  expect(debugger_.getNode(descendant.id)).toBeUndefined();
}
```

---

## 8. Summary for PRP Implementation

### What to Implement

1. **handleChildAttached()**
   - Validate parent exists in nodeMap
   - Deep clone event.child to avoid mutation
   - Validate single-parent rule
   - Validate no circular references (use isNodeDescendantOf)
   - Set bidirectional references (child.parent, parent.children)
   - Call buildNodeMap(child) to add subtree to map
   - Update root reference if needed

2. **handleChildDetached()**
   - Validate parent and child exist in nodeMap
   - Validate child is direct child of parent
   - Remove from parent.children array
   - Clear child.parent reference
   - Call removeSubtreeNodes(childId) to remove from map
   - Update root reference if needed

3. **buildNodeMap()**
   - Recursive DFS traversal
   - Add each node to nodeMap
   - Recurse for all children
   - O(k) complexity

4. **removeSubtreeNodes()**
   - Iterative BFS traversal
   - Collect all descendant IDs
   - Batch delete from nodeMap
   - No-op if node doesn't exist
   - O(k) complexity

5. **isNodeDescendantOf()**
   - Traverse parent chain upward
   - Use visited Set for cycle detection
   - Return true if ancestor found
   - Throw error if cycle detected
   - O(d) complexity

### What to Validate

- All structural events update the map
- Map and tree stay synchronized
- No orphaned nodes in map
- No circular references created
- Single-parent rule enforced
- 1:1 tree mirror maintained
- Deep trees handled without stack overflow
- Missing nodes handled gracefully

### What to Test

- Attach child adds subtree to map
- Detach child removes subtree from map
- Reparenting updates map correctly
- Multiple rapid operations work
- Deep trees handled correctly
- Missing nodes throw appropriate errors
- Circular references prevented
- Single-parent rule enforced
- Map lookups return correct nodes
- Final state is consistent

---

## 9. References

### Source Files Analyzed

1. `/home/dustin/projects/groundswell/src/core/workflow.ts`
   - Lines 316-355: attachChild implementation
   - Lines 379-408: detachChild implementation
   - Lines 201-219: isDescendantOf implementation
   - Lines 135-150: getRootObservers with cycle detection
   - Lines 225-240: getRoot with cycle detection

2. `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`
   - Lines 33-58: nodeMap and buildNodeMap
   - Lines 65-84: removeSubtreeNodes with BFS
   - Lines 92-117: onEvent with incremental updates

3. `/home/dustin/projects/groundswell/src/types/workflow.ts`
   - Lines 20-37: WorkflowNode interface

4. `/home/dustin/projects/groundswell/src/types/events.ts`
   - Lines 10-11: childAttached and childDetached event types

5. `/home/dustin/projects/groundswell/src/debugger/event-replayer.ts`
   - Lines 35-290: Event replayer skeleton (not yet implemented)

### Test Files Analyzed

1. `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts`
   - Detach validation and event emission tests

2. `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`
   - Incremental map update tests
   - Subtree removal tests
   - Deep tree performance tests

3. `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`
   - Reparenting observer propagation tests
   - 1:1 tree mirror invariant tests

4. `/home/dustin/projects/groundswell/src/__tests__/adversarial/prd-12-2-compliance.test.ts`
   - Event emission validation tests

---

**End of Research Document**
