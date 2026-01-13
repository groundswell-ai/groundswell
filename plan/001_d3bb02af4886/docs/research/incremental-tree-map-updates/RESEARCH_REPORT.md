# Incremental Tree Map Updates Research Report

## Executive Summary

This report documents best practices for optimizing tree data structure updates in TypeScript/JavaScript, specifically for the WorkflowTreeDebugger's node map maintenance. Current implementation clears and rebuilds the entire Map on tree changes, which is inefficient for large trees.

## Current Implementation Analysis

**File**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`

### Current Behavior:
```typescript
onTreeChanged(root: WorkflowNode): void {
  this.root = root;
  this.nodeMap.clear();        // ❌ Clears entire map
  this.buildNodeMap(root);     // ❌ Rebuilds from scratch (O(n))
}

onEvent(event: WorkflowEvent): void {
  if (event.type === 'childAttached') {
    this.buildNodeMap(event.child);  // ✅ Already incremental for additions
  }
  this.events.next(event);
}
```

### Performance Impact:
- **Time Complexity**: O(n) for every tree change
- **Memory Impact**: Full Map reconstruction triggers garbage collection
- **Scaling Problem**: With 1000+ node trees, every structural change becomes expensive

---

## Best Practices & Patterns

### 1. Incremental Map Update Strategies

#### Pattern A: Event-Driven Incremental Updates (Recommended)

**Best For**: Trees with frequent structural changes where events provide change context

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  private nodeMap: Map<string, WorkflowNode> = new Map();

  onEvent(event: WorkflowEvent): void {
    switch (event.type) {
      case 'childAttached':
        // ✅ O(1) - Add only the new subtree
        this.addNodeSubtree(event.child, event.parentId);
        break;

      case 'childDetached':
        // ✅ O(k) - Remove only the detached subtree (k = detached nodes)
        this.removeNodeSubtree(event.childId);
        break;

      case 'treeUpdated':
        // ✅ O(1) - Just update root reference
        this.root = event.root;
        break;
    }
    this.events.next(event);
  }

  private addNodeSubtree(node: WorkflowNode, parentId?: string): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.addNodeSubtree(child);
    }
  }

  private removeNodeSubtree(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    // Recursively remove all descendants
    for (const child of node.children) {
      this.removeNodeSubtree(child.id);
    }
    this.nodeMap.delete(nodeId);
  }
}
```

**Benefits**:
- **O(1)** for single node attachment
- **O(k)** for subtree removal (where k = removed nodes)
- **O(1)** for root updates
- **No GC pressure** from Map reconstruction

#### Pattern B: Dirty Flag with Lazy Rebuild

**Best For**: Read-heavy workloads where write batching is beneficial

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  private nodeMap: Map<string, WorkflowNode> = new Map();
  private mapDirty = false;

  onEvent(event: WorkflowEvent): void {
    if (event.type === 'childAttached' || event.type === 'childDetached') {
      this.mapDirty = true;
    }
    this.events.next(event);
  }

  getNode(id: string): WorkflowNode | undefined {
    // Lazy rebuild on access
    if (this.mapDirty) {
      this.rebuildNodeMap();
      this.mapDirty = false;
    }
    return this.nodeMap.get(id);
  }

  private rebuildNodeMap(): void {
    this.nodeMap.clear();
    this.buildNodeMap(this.root);
  }
}
```

**Benefits**:
- Batches multiple changes before rebuild
- Defers work until actually needed
- Good for rapid sequential changes

**Drawbacks**:
- First access after changes pays full cost
- Still O(n) on rebuild

---

### 2. Tree Diffing Algorithms

#### Pattern C: Virtual DOM-Style Reconciliation

Inspired by React's reconciliation algorithm:

```typescript
interface TreeChange {
  type: 'add' | 'remove' | 'move' | 'update';
  nodeId: string;
  parentNodeId?: string;
}

function diffTrees(oldTree: WorkflowNode, newTree: WorkflowNode): TreeChange[] {
  const changes: TreeChange[] = [];
  const visited = new Set<string>();

  // Detect additions and updates
  function traverse(newNode: WorkflowNode, oldNode?: WorkflowNode) {
    if (!oldNode) {
      changes.push({ type: 'add', nodeId: newNode.id });
    } else if (oldNode.id !== newNode.id) {
      changes.push({ type: 'update', nodeId: newNode.id });
    }

    visited.add(newNode.id);

    // Check for removed children
    if (oldNode) {
      for (const oldChild of oldNode.children) {
        if (!newNode.children.find(c => c.id === oldChild.id)) {
          changes.push({ type: 'remove', nodeId: oldChild.id });
        }
      }
    }

    // Recurse into children
    for (const newChild of newNode.children) {
      const oldChild = oldNode?.children.find(c => c.id === newChild.id);
      traverse(newChild, oldChild);
    }
  }

  traverse(newTree);

  // Detect nodes removed from root
  if (oldTree) {
    const allNewNodes = collectAllIds(newTree);
    const allOldNodes = collectAllIds(oldTree);
    for (const oldId of allOldNodes) {
      if (!allNewNodes.has(oldId)) {
        changes.push({ type: 'remove', nodeId: oldId });
      }
    }
  }

  return changes;
}

function applyChanges(map: Map<string, WorkflowNode>, changes: TreeChange[]): void {
  for (const change of changes) {
    switch (change.type) {
      case 'add':
        // Fetch node from new tree and add to map
        break;
      case 'remove':
        map.delete(change.nodeId);
        break;
    }
  }
}
```

**Reference**: [React Reconciliation Algorithm](https://react.dev/learn/understanding-reacts-render-phase#triggering-render)

---

### 3. Memory & Performance Considerations

#### Map.clear() vs Incremental Updates

| Operation | Time Complexity | Memory Impact | GC Pressure |
|-----------|----------------|---------------|-------------|
| `Map.clear()` | O(1) | Frees entire backing store | High (single large GC) |
| Incremental delete | O(k) for k deletions | Fragmented deallocation | Lower (spread out) |
| Incremental add | O(1) per add | May resize backing store | Moderate |

**Key Insights**:

1. **Map.clear() Performance**:
   - Technically O(1) but triggers GC of entire Map
   - Better for complete invalidation scenarios
   - Worse for incremental changes

2. **Incremental Modifications**:
   - Better cache locality for small changes
   - Amortizes GC cost over time
   - Prevents "stop-the-world" GC pauses

3. **Memory Fragmentation**:
   - JavaScript engines optimize Map operations well
   - Incremental updates don't significantly fragment memory
   - Modern V8/SpiderMonkey handle Map efficiently

---

### 4. Production Patterns & Examples

#### Example A: Monaco Editor's LineHeightMap

Monaco (VS Code's editor) uses incremental updates for line mapping:

```typescript
// Simplified pattern from Monaco Editor
class LineHeightMap {
  private heights: number[] = [];

  onLinesInserted(fromLineNumber: number, count: number): void {
    // ✅ Insert only affected range
    this.heights.splice(fromLineNumber - 1, 0, ...new Array(count).fill(0));
  }

  onLinesDeleted(fromLineNumber: number, count: number): void {
    // ✅ Remove only affected range
    this.heights.splice(fromLineNumber - 1, count);
  }
}
```

#### Example B: Immutable.js Update Patterns

```typescript
import { Map } from 'immutable';

// ❌ Bad: Full rebuild
const updated = Map().withMutations(map => {
  allNodes.forEach(node => map.set(node.id, node));
});

// ✅ Good: Incremental update
const updated = existingMap.set(newNode.id, newNode);
```

---

## Recommended Implementation

### Implementation Plan

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  private nodeMap: Map<string, WorkflowNode> = new Map();

  constructor(workflow: Workflow) {
    this.root = workflow.getNode();
    this.buildNodeMap(this.root);
    workflow.addObserver(this);
  }

  /**
   * Handle childAttached - incrementally add subtree
   * Time: O(k) where k = nodes in attached subtree
   */
  private handleChildAttached(child: WorkflowNode): void {
    this.addNodeToMap(child);
  }

  /**
   * Handle childDetached - incrementally remove subtree
   * Time: O(k) where k = nodes in detached subtree
   */
  private handleChildDetached(childId: string): void {
    const node = this.nodeMap.get(childId);
    if (!node) return;

    // Remove node and all descendants
    const toRemove = [childId];
    let i = 0;
    while (i < toRemove.length) {
      const currentNode = this.nodeMap.get(toRemove[i]);
      if (currentNode) {
        toRemove.push(...currentNode.children.map(c => c.id));
      }
      i++;
    }

    for (const id of toRemove) {
      this.nodeMap.delete(id);
    }
  }

  /**
   * Handle treeUpdated - no rebuild needed
   * Time: O(1)
   */
  private handleTreeUpdated(root: WorkflowNode): void {
    this.root = root;
    // Map remains valid - node references are unchanged
  }

  /**
   * Recursively add node and descendants to map
   */
  private addNodeToMap(node: WorkflowNode): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.addNodeToMap(child);
    }
  }

  onEvent(event: WorkflowEvent): void {
    switch (event.type) {
      case 'childAttached':
        this.handleChildAttached(event.child);
        break;
      case 'childDetached':
        this.handleChildDetached(event.childId);
        break;
      case 'treeUpdated':
        this.handleTreeUpdated(event.root);
        break;
    }
    this.events.next(event);
  }

  onTreeChanged(root: WorkflowNode): void {
    // ✅ No longer needed - handled incrementally in onEvent
    this.root = root;
  }
}
```

---

## Performance Benchmarks

### Expected Improvements

| Scenario | Current (Full Rebuild) | Incremental | Improvement |
|----------|----------------------|-------------|-------------|
| Single node attach | O(n) | O(1) | n× faster |
| Single node detach | O(n) | O(k) | n/k× faster |
| Subtree attach (10 nodes) | O(n) | O(10) | n/10× faster |
| Root reference update | O(n) | O(1) | n× faster |
| Large tree (1000 nodes) | 1000 ops | ~1-10 ops | 100-1000× faster |

### Benchmark Code Template

```typescript
import { performance } from 'perf_hooks';

function benchmark() {
  const tree = createLargeTree(1000); // 1000 nodes
  const debugger = new WorkflowTreeDebugger(tree);

  // Benchmark: Single node attachment
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    const child = createNode();
    tree.attachChild(child);
    debugger.onEvent({ type: 'childAttached', child });
  }
  const end = performance.now();

  console.log(`1000 attachments: ${end - start}ms`);
  // Expected: <10ms with incremental vs >100ms with rebuild
}
```

---

## Gotchas & Anti-Patterns

### ❌ Anti-Patterns

1. **Rebuilding on Every Change**
   ```typescript
   onEvent(event: WorkflowEvent): void {
     this.nodeMap.clear();        // ❌ Unnecessary
     this.buildNodeMap(this.root); // ❌ Expensive
   }
   ```

2. **Ignoring Detached Subtrees**
   ```typescript
   onEvent(event: WorkflowEvent): void {
     if (event.type === 'childDetached') {
       this.nodeMap.delete(event.childId); // ❌ Leaves orphaned descendants
     }
   }
   ```

3. **Premature Optimization**
   ```typescript
   // ❌ Don't optimize unless you've measured
   // Trees with <100 nodes rarely benefit from complex incremental logic
   ```

### ✅ Best Practices

1. **Always clean up detached subtrees recursively**
2. **Prefer O(1) Map operations over O(n) iterations**
3. **Use performance.now() to measure before optimizing**
4. **Consider tree size before implementing complex logic**
5. **Document time complexity in comments**

---

## Additional Resources

### Documentation & References

1. **MDN Web Docs - Map**
   - URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
   - Section: Performance considerations
   - Key insight: Map has O(1) average case for set/get/delete operations

2. **React Reconciliation Algorithm**
   - URL: https://react.dev/learn/understanding-reacts-render-phase
   - Section: Tree diffing strategies
   - Key insight: Only process changed subtrees

3. **V8 Performance Optimization**
   - URL: https://v8.dev/blog/elements-kinds
   - Section: Hidden classes and Map performance
   - Key insight: Map operations are highly optimized in modern engines

4. **TypeScript Performance Patterns**
   - URL: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
   - Section: Performance best practices

5. **GitHub - Immutable.js**
   - URL: https://github.com/immutable-js/immutable-js
   - Section: Map update patterns
   - Key insight: Persistent data structures for efficient updates

### Code Examples

- **Monaco Editor**: LineHeightMap implementation
- **React**: ReactFiber Reconciler
- **Redux Toolkit**: Immer integration for incremental updates

---

## Conclusion

The recommended approach is **Pattern A: Event-Driven Incremental Updates**. This provides:

- **O(1)** for single node operations
- **O(k)** for subtree operations (where k = affected nodes)
- **Zero GC pressure** from Map reconstruction
- **Clear, maintainable code** with explicit handling for each event type

For the WorkflowTreeDebugger specifically:
1. Keep the existing `childAttached` logic (already optimal)
2. Add recursive cleanup for `childDetached`
3. Remove the full rebuild in `onTreeChanged`
4. Update only root reference for `treeUpdated`

This optimization is most valuable for:
- Trees with >100 nodes
- Frequent structural changes
- Performance-sensitive applications

For smaller trees or infrequent changes, the current implementation is acceptable.
