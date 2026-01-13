# PRP: Incremental Node Map Updates for WorkflowTreeDebugger

**Task ID**: P1.M3.T2
**Status**: Planned
**Story Points**: 4 (3 subtasks)

## Overview

Optimize WorkflowTreeDebugger's node map maintenance by replacing O(n) full rebuilds with O(1)-O(k) incremental updates when tree structure changes.

## Problem Statement

### Current Implementation

**File**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`

```typescript
onTreeChanged(root: WorkflowNode): void {
  this.root = root;
  this.nodeMap.clear();        // ❌ Clears entire map
  this.buildNodeMap(root);     // ❌ O(n) rebuild
}
```

**Issues**:
- **Time Complexity**: O(n) for every tree change
- **Memory Impact**: Full Map reconstruction triggers garbage collection
- **Scaling Problem**: With 1000+ node trees, every structural change becomes expensive
- **Unnecessary Work**: Most tree changes affect only a small subtree

### Impact Analysis

From bug report Issue 7 and `plan/bugfix/architecture/codebase_structure.md`:
- Tree changes trigger `onTreeChanged()` which rebuilds entire nodeMap
- For large trees, this causes performance degradation
- Affects all operations that use `getNode(id)` for lookups

## Research Summary

### Key Findings

Based on research documented in:
`/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/RESEARCH_REPORT.md`

1. **Map Operations** (MDN):
   - `Map.set()`, `Map.get()`, `Map.delete()` are O(1) average case
   - Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#instance-methods

2. **Tree Diffing** (React):
   - Only process changed subtrees, not entire tree
   - Source: https://react.dev/learn/understanding-reacts-render-phase

3. **Performance Characteristics**:
   - Full rebuild: O(n) every time
   - Incremental: O(k) where k = nodes in affected subtree
   - Expected improvement: 100-1000× for large trees

### Recommended Pattern

**Event-Driven Incremental Updates**:

```typescript
onEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'childAttached':
      // ✅ O(k) - Add only new subtree
      this.addSubtree(event.child);
      break;

    case 'childDetached':
      // ✅ O(k) - Remove only detached subtree
      this.removeSubtree(event.childId);
      break;

    case 'treeUpdated':
      // ✅ O(1) - Just update reference
      this.root = event.root;
      break;
  }
}
```

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WorkflowTreeDebugger                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │   nodeMap       │    │   Event Handlers             │   │
│  │   Map<string,   │    │   - handleChildAttached()    │   │
│  │        Workflow- │    │   - handleChildDetached()   │   │
│  │        Node>     │    │   - handleTreeUpdated()     │   │
│  └────────┬────────┘    └──────────┬──────────────────┘   │
│           │                        │                       │
│           │   ┌────────────────────┴──────────────────┐   │
│           ├───│  Incremental Update Methods            │   │
│           │   │  - addSubtree(node)         O(k)       │   │
│           │   │  - removeSubtree(nodeId)     O(k)      │   │
│           │   │  - buildNodeMap(root)        O(n)      │   │
│           │   └───────────────────────────────────────┘   │
│           │                                               │
│           ▼                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Public API                                 │ │
│  │  - getNode(id)        O(1)                           │ │
│  │  - getTree()          O(1)                           │ │
│  │  - toTreeString()     O(n)                           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Research & Analysis (S1 - 1 story point)

**Status**: Complete
**Output**: This PRP and research documentation

Tasks completed:
- [x] Analyze current `onTreeChanged()` implementation
- [x] Identify event types that trigger tree changes
- [x] Document opportunities for incremental updates
- [x] Research best practices and patterns

#### Phase 2: Implementation (S2 - 2 story points)

**Status**: Planned
**Implementation Steps**:

1. **Add helper methods to WorkflowTreeDebugger**:

```typescript
/**
 * Add a node and all its descendants to the node map
 * Time Complexity: O(k) where k = nodes in subtree
 */
private addSubtree(node: WorkflowNode): void {
  const queue = [node];
  while (queue.length > 0) {
    const current = queue.shift()!;
    this.nodeMap.set(current.id, current);
    queue.push(...current.children);
  }
}

/**
 * Remove a node and all its descendants from the node map
 * Time Complexity: O(k) where k = nodes in subtree
 */
private removeSubtree(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;

  // BFS to collect all descendants
  const toRemove: string[] = [];
  const queue = [node];
  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);
  }

  // Remove all collected nodes
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

2. **Update `onEvent()` to handle incremental updates**:

```typescript
onEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'childAttached':
      // ✅ Incremental: Add only the new subtree
      this.addSubtree(event.child);
      break;

    case 'childDetached':
      // ✅ Incremental: Remove only the detached subtree
      this.removeSubtree(event.childId);
      break;

    case 'treeUpdated':
      // ✅ No map update needed - node references unchanged
      this.root = event.root;
      break;

    default:
      // Other events don't affect tree structure
      break;
  }

  // Forward to event stream
  this.events.next(event);
}
```

3. **Simplify `onTreeChanged()`**:

```typescript
onTreeChanged(root: WorkflowNode): void {
  // ✅ Just update root reference
  // Map is already updated incrementally via onEvent()
  this.root = root;
}
```

4. **Update JSDoc comments**:

```typescript
/**
 * Build node lookup map recursively
 * Time Complexity: O(n) where n = total nodes
 * @deprecated Used only for initial build. Use addSubtree/removeSubtree for incremental updates.
 */
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);
  }
}
```

**Acceptance Criteria**:
- [ ] `addSubtree()` method implemented with O(k) complexity
- [ ] `removeSubtree()` method implemented with O(k) complexity
- [ ] `onEvent()` handles all tree change events incrementally
- [ ] `onTreeChanged()` simplified to only update root reference
- [ ] All existing tests pass
- [ ] Code includes JSDoc comments with time complexity

#### Phase 3: Benchmarking & Validation (S3 - 1 story point)

**Status**: Planned
**Implementation Steps**:

1. **Create benchmark test**:

```typescript
// File: src/__tests__/performance/tree-debugger-benchmark.test.ts

import { performance } from 'perf_hooks';
import { Workflow } from '../../core/workflow';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger';

describe('WorkflowTreeDebugger Performance', () => {
  it('should efficiently handle single node detachment in large tree', () => {
    // Create tree with 1000 nodes
    const root = new Workflow('root');
    for (let i = 0; i < 100; i++) {
      const parent = new Workflow(`parent-${i}`);
      root.attachChild(parent);
      for (let j = 0; j < 10; j++) {
        const child = new Workflow(`child-${i}-${j}`);
        parent.attachChild(child);
      }
    }

    const debugger = new WorkflowTreeDebugger(root);

    // Benchmark detachment
    const start = performance.now();
    const nodeToDetach = root.children[0];
    nodeToDetach.detachChild(); // This triggers childDetached event
    const end = performance.now();

    const duration = end - start;

    // With incremental updates, should be <1ms for single node
    // With full rebuild, would be ~10-100ms for 1000 node tree
    expect(duration).toBeLessThan(5); // 5ms threshold
  });

  it('should handle rapid sequential changes efficiently', () => {
    const root = new Workflow('root');
    const children: Workflow[] = [];

    // Create 100 children
    for (let i = 0; i < 100; i++) {
      const child = new Workflow(`child-${i}`);
      children.push(child);
      root.attachChild(child);
    }

    const debugger = new WorkflowTreeDebugger(root);

    // Benchmark rapid detachments
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      children[i].detachChild();
    }
    const end = performance.now();

    const duration = end - start;

    // With incremental updates: ~1-5ms total
    // With full rebuild: ~500-1000ms total
    expect(duration).toBeLessThan(50); // 50ms threshold
  });
});
```

2. **Validate correctness**:

```typescript
describe('WorkflowTreeDebugger Incremental Updates', () => {
  it('should correctly maintain node map after childAttached', () => {
    const root = new Workflow('root');
    const debugger = new WorkflowTreeDebugger(root);

    const child = new Workflow('child');
    root.attachChild(child);

    expect(debugger.getNode('child')).toBe(child.node);
    expect(debugger.getNode('root')).toBe(root.node);
  });

  it('should correctly maintain node map after childDetached', () => {
    const root = new Workflow('root');
    const child = new Workflow('child');
    const grandchild = new Workflow('grandchild');

    root.attachChild(child);
    child.attachChild(grandchild);

    const debugger = new WorkflowTreeDebugger(root);

    // Detach child (should remove child and grandchild)
    child.detachChild();

    expect(debugger.getNode('child')).toBeUndefined();
    expect(debugger.getNode('grandchild')).toBeUndefined();
    expect(debugger.getNode('root')).toBe(root.node);
  });

  it('should handle reparenting correctly', () => {
    const root1 = new Workflow('root1');
    const root2 = new Workflow('root2');
    const child = new Workflow('child');
    const grandchild = new Workflow('grandchild');

    root1.attachChild(child);
    child.attachChild(grandchild);

    const debugger = new WorkflowTreeDebugger(root1);

    // Reparent: detach from root1, attach to root2
    child.detachChild();
    root2.attachChild(child);

    // Verify map state
    expect(debugger.getNode('child')).toBe(child.node);
    expect(debugger.getNode('grandchild')).toBe(grandchild.node);
  });
});
```

**Acceptance Criteria**:
- [ ] Benchmark tests created and passing
- [ ] Performance improvement demonstrated (100×+ for large trees)
- [ ] Correctness tests verify map integrity
- [ ] Results documented in test output

## Testing Strategy

### Unit Tests
- Test `addSubtree()` with various subtree sizes
- Test `removeSubtree()` with various subtree sizes
- Test `onEvent()` for all event types
- Test edge cases (empty tree, single node, deep hierarchy)

### Integration Tests
- Test real workflow scenarios
- Test reparenting workflows
- Test concurrent modifications
- Test debugger accuracy after changes

### Performance Tests
- Benchmark single node operations
- Benchmark subtree operations
- Compare before/after optimization
- Test with trees of varying sizes (10, 100, 1000 nodes)

## Risks & Mitigations

### Risk 1: Incorrect Subtree Cleanup
**Description**: Forgetting to remove descendants when detaching a node
**Impact**: Orphaned nodes remain in map, causing stale lookups
**Mitigation**: Comprehensive unit tests, code review

### Risk 2: Event Ordering Issues
**Description**: Events arriving out of order causing map inconsistency
**Impact**: Map becomes corrupted
**Mitigation**: Tests for concurrent modifications, event ordering

### Risk 3: Performance Regression for Small Trees
**Description**: Incremental overhead slower for very small trees
**Impact**: Unnecessary complexity for small use cases
**Mitigation**: Benchmark various tree sizes, document when optimization applies

## Success Metrics

### Performance
- [ ] Single node attach: <1ms (vs ~10ms with rebuild)
- [ ] Single node detach: <1ms (vs ~10ms with rebuild)
- [ ] 100-node tree operations: <10ms (vs ~1000ms with rebuild)

### Correctness
- [ ] All existing tests pass
- [ ] New correctness tests pass
- [ ] No memory leaks (verify with heap snapshots)

### Code Quality
- [ ] JSDoc comments with time complexity
- [ ] Code review approved
- [ ] No TypeScript errors

## Dependencies

### Task Dependencies
- P1.M3.T2.S1 (Research) - Complete
- P1.M3.T2.S2 (Implementation) - Depends on S1
- P1.M3.T2.S3 (Benchmarking) - Depends on S2

### External Dependencies
- None (uses existing APIs)

## Timeline

- **S1 (Research)**: Complete
- **S2 (Implementation)**: 2-3 hours
- **S3 (Benchmarking)**: 1-2 hours
- **Total**: 4-6 hours (4 story points)

## References

### Documentation
- [Research Report](/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/RESEARCH_REPORT.md)
- [Quick Reference](/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/QUICK_REFERENCE.md)

### External Resources
- [MDN - Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [React Reconciliation](https://react.dev/learn/understanding-reacts-render-phase)
- [Stack Overflow - Map Complexity](https://stackoverflow.com/questions/38476433/what-is-the-time-complexity-of-map-set-in-javascript)

### Code References
- Implementation: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`
- Tests: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger.test.ts`
- Events: `/home/dustin/projects/groundswell/src/types/events.ts`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Ready for Implementation
