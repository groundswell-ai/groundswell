# Test Patterns Research for Replay Logic Validation

**Research Date**: 2025-01-24
**Purpose**: Extract existing test patterns to guide validation tests for event replay logic implementation (P2M1T1S2)

---

## Executive Summary

This research analyzes existing test patterns in the Groundswell codebase, focusing on:
1. Tree structure manipulation tests (attach/detach child)
2. Event handling tests (childAttached, childDetached, treeUpdated)
3. Map-based node tracking tests
4. Test structure and assertion patterns

**Key Finding**: The codebase has excellent test patterns for tree operations, event verification, and map-based node tracking. These patterns can be directly adapted for replay logic validation tests.

---

## 1. Test Structure Patterns

### 1.1 Basic Test Organization

**Pattern**: Describe/It blocks with clear AAA (Arrange-Act-Assert) structure

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts`

```typescript
describe('Workflow.detachChild()', () => {
  it('should remove child from parent.children array', () => {
    // Arrange: Create parent with child
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Assert: Verify child is in parent.children
    expect(parent.children).toContain(child);

    // Act: Call detachChild
    parent.detachChild(child);

    // Assert: Verify child removed from parent.children
    expect(parent.children).not.toContain(child);
  });
});
```

**Key Observations**:
- Comments explicitly label Arrange/Act/Assert phases
- Pre-conditions verified before action
- Post-conditions verify expected state changes
- Test names follow `should <expected behavior>` pattern

### 1.2 Phase-Based Test Organization

**Pattern**: Multi-phase tests with clear phase delimiters

**Source**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`

```typescript
describe('Integration: Reparenting Observer Propagation', () => {
  it('should update observer propagation after reparenting', () => {
    // ============================================================
    // PHASE 1: Setup - Create parent1, parent2, and child
    // ============================================================
    // ARRANGE: Create two root workflows
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child attached to parent1
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT: Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);

    // ============================================================
    // PHASE 2: Verify parent1 observer receives events
    // ============================================================
    // ARRANGE: Create observer for parent1
    const parent1Events: WorkflowEvent[] = [];

    const parent1Observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => parent1Events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // ACT: Attach observer and trigger event
    parent1.addObserver(parent1Observer);
    child.setStatus('running');

    // ASSERT: Verify parent1 observer received the event
    expect(parent1Events.some((e) => e.type === 'treeUpdated')).toBe(true);

    // ============================================================
    // PHASE 3: Reparent child from parent1 to parent2
    // ============================================================
    // ... additional phases
  });
});
```

**Key Observations**:
- Complex tests broken into numbered phases
- Each phase has clear purpose (Setup, Verify, Reparent)
- Visual separators with comment lines
- Progressive assertions build confidence

---

## 2. Tree Structure Assertion Patterns

### 2.1 Direct Property Verification

**Pattern**: Direct property access for simple tree verification

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts`

```typescript
it('should clear child.parent to null', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  parent.detachChild(child);

  // Direct property assertion
  expect(child.parent).toBeNull();
});
```

### 2.2 Bidirectional Link Verification

**Pattern**: Verify both parent→child and child→parent links in BOTH trees

**Source**: `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

```typescript
/**
 * Verify bidirectional link between parent and child in BOTH trees
 * Throws if inconsistency found
 */
export function verifyBidirectionalLink(parent: Workflow, child: Workflow): void {
  // Workflow tree checks
  if (child.parent !== parent) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.children.includes(child)) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${parent.node.name}".children does not contain "${child.node.name}"`
    );
  }

  // CRITICAL: Node tree checks (must mirror workflow tree)
  if (child.node.parent !== parent.node) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.node.children.includes(child.node)) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${parent.node.name}".node.children does not contain "${child.node.name}"`
    );
  }
}
```

**Usage in Tests**:
```typescript
parent.attachChild(child);
verifyBidirectionalLink(parent, child);
```

**Key Observations**:
- Helper function encapsulates complex verification logic
- Verifies both workflow tree AND node tree (mirror invariant)
- Throws descriptive errors with context
- Reusable across multiple tests

### 2.3 Tree Mirror Invariant Verification

**Pattern**: Verify 1:1 correspondence between workflow tree and node tree

**Source**: `/home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts`

```typescript
/**
 * Verify tree mirror invariant (1:1 correspondence)
 * This is the CRITICAL invariant from PRD Section 12.2
 */
export function verifyTreeMirror(workflowRoot: Workflow): void {
  const allNodes = collectAllNodes(workflowRoot);

  allNodes.forEach(wfNode => {
    const node = wfNode.node;

    // Verify parent relationship mirrors
    if (wfNode.parent) {
      if (node.parent !== wfNode.parent.node) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent?.name}", expected "${wfNode.parent.node.name}"`
        );
      }
    } else {
      if (node.parent !== null) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent.name}", expected null`
        );
      }
    }

    // Verify children relationship mirrors
    if (node.children.length !== wfNode.children.length) {
      throw new Error(
        `[MIRROR] Children count mismatch: "${wfNode.node.name}" has ${wfNode.children.length} workflow children but ${node.children.length} node children`
      );
    }

    wfNode.children.forEach((childWf, index) => {
      if (node.children[index] !== childWf.node) {
        throw new Error(
          `[MIRROR] Child mismatch at index ${index}: expected "${childWf.node.name}", got "${node.children[index].name}"`
        );
      }
    });
  });
}
```

**Usage**:
```typescript
root.detachChild(child);
verifyTreeMirror(root); // Ensures no corruption
```

### 2.4 Orphaning Verification

**Pattern**: Verify complete removal from parent in both trees

**Source**: `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

```typescript
export function verifyOrphaned(child: Workflow): void {
  if (child.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned: parent is "${child.parent.node.name}"`
    );
  }

  if (child.node.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned in node tree: parent is "${child.node.parent.name}"`
    );
  }
}
```

**Usage**:
```typescript
parent.detachChild(child);
verifyOrphaned(child);
```

---

## 3. Event Testing Patterns

### 3.1 Event Capture and Verification

**Pattern**: Use observer to capture events, then verify specific events

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

```typescript
it('should emit childAttached event', () => {
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);
  const child = new SimpleWorkflow('Child', parent);

  const attachEvent = events.find((e) => e.type === 'childAttached');
  expect(attachEvent).toBeDefined();
  expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
});
```

**Key Observations**:
- Empty implementations for unneeded observer callbacks
- Array to collect all events
- Type guard for discriminated union: `event.type === 'childAttached' && event.parentId`
- Find specific event type for verification

### 3.2 Event Payload Verification

**Pattern**: Verify complete event payload structure

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts`

```typescript
it('should emit childDetached event with correct payload', () => {
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);

  const child = new SimpleWorkflow('Child', parent);
  events.length = 0; // Clear attachChild events

  parent.detachChild(child);

  // Verify event was emitted
  const detachEvent = events.find((e) => e.type === 'childDetached');
  expect(detachEvent).toBeDefined();

  // Verify event payload with type guards
  expect(detachEvent?.type === 'childDetached' && detachEvent.parentId).toBe(parent.id);
  expect(detachEvent?.type === 'childDetached' && detachEvent.childId).toBe(child.id);
});
```

**Key Observations**:
- Clear events array to isolate specific operations
- Type guards used for discriminated union access
- Verify all payload fields

### 3.3 Event Ordering Verification

**Pattern**: Verify callbacks are invoked in correct order

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-emitEvent-childDetached.test.ts`

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
  callOrder.length = 0; // Clear attachChild call order

  parent.detachChild(child);

  // Verify order
  expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
});
```

### 3.4 Tree Change Callback Verification

**Pattern**: Verify onTreeChanged receives correct root node

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-emitEvent-childDetached.test.ts`

```typescript
it('should call onTreeChanged() when childDetached event is emitted', () => {
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];
  const treeChanges: any[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChanges.push(root),
  };

  parent.addObserver(observer);

  const child = new SimpleWorkflow('Child', parent);
  events.length = 0;
  treeChanges.length = 0;

  parent.detachChild(child);

  // Verify childDetached event was emitted
  const detachEvent = events.find((e) => e.type === 'childDetached');
  expect(detachEvent).toBeDefined();

  // CRITICAL ASSERTION: onTreeChanged() must be called
  expect(treeChanges.length).toBe(1);
  expect(treeChanges[0]).toBe(parent.getNode()); // Receives root node
});
```

---

## 4. Map-Based Node Tracking Patterns

### 4.1 Node Map Verification

**Pattern**: Verify nodes are correctly added/removed from map

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`

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
  expect(debugger_.getNode(child2.id)).toBe(child2.getNode());
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

**Key Observations**:
- Verify initial state (all nodes present)
- Perform operation
- Verify removed nodes are undefined
- Verify remaining nodes still present
- Verify count decreased by expected amount

### 4.2 Subtree Removal Verification

**Pattern**: Verify entire subtree removed from map

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`

```typescript
it('detaching node with many descendants removes all', () => {
  const root = new IncrementalTestWorkflow('Root');

  // Build a deep subtree
  const child1 = new IncrementalTestWorkflow('Child1', root);
  let current = child1;
  const descendants: IncrementalTestWorkflow[] = [];
  for (let i = 0; i < 10; i++) {
    const descendant = new IncrementalTestWorkflow(`Descendant${i}`, current);
    descendants.push(descendant);
    current = descendant;
  }

  const debugger_ = new WorkflowTreeDebugger(root);
  // Total: 1 root + 1 child1 + 10 descendants = 12 nodes
  expect(debugger_.getStats().totalNodes).toBe(12);

  // Detach child1 (should remove child1 + all 10 descendants)
  root.detachChild(child1);

  // Verify all were removed
  expect(debugger_.getStats().totalNodes).toBe(1);
  expect(debugger_.getNode(child1.id)).toBeUndefined();
  for (const descendant of descendants) {
    expect(debugger_.getNode(descendant.id)).toBeUndefined();
  }

  // Verify root is still there
  expect(debugger_.getNode(root.id)).toBe(root.getNode());
});
```

**Key Observations**:
- Create subtree with known structure
- Collect descendant references in array
- Verify all descendants removed (loop through array)
- Verify root unaffected

### 4.3 Incremental Update Verification

**Pattern**: Verify map updates incrementally, not via full rebuild

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`

```typescript
it('onTreeChanged does not rebuild map', () => {
  const root = new IncrementalTestWorkflow('Root');
  const child1 = new IncrementalTestWorkflow('Child1', root);
  const grandchild = new IncrementalTestWorkflow('Grandchild', child1);
  const child2 = new IncrementalTestWorkflow('Child2', root);

  const debugger_ = new WorkflowTreeDebugger(root);

  // Get reference to the nodeMap (we'll check it's the same object)
  const nodeMapBefore = debugger_.getStats();

  // Detach child1
  root.detachChild(child1);

  // Verify map was updated incrementally (nodes removed)
  expect(debugger_.getStats().totalNodes).toBe(2);
  expect(debugger_.getNode(child1.id)).toBeUndefined();
  expect(debugger_.getNode(grandchild.id)).toBeUndefined();

  // Verify remaining nodes are still accessible
  expect(debugger_.getNode(root.id)).toBe(root.getNode());
  expect(debugger_.getNode(child2.id)).toBe(child2.getNode());
});
```

---

## 5. Setup/Teardown Patterns

### 5.1 Console Mocking for Adversarial Tests

**Pattern**: Mock console methods to suppress expected error output

**Source**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/node-map-update-benchmarks.test.ts`

```typescript
describe('Node Map Update Performance Benchmarks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Tests that may produce console output
  it('should handle deep tree efficiently', () => {
    // ... test code that may log to console
  });
});
```

**Key Observations**:
- `beforeEach` sets up mocks before each test
- `afterEach` restores to prevent cross-test pollution
- Empty mock implementations (no-op functions)
- Critical for tests that expect errors

### 5.2 Test Workflow Class Pattern

**Pattern**: Create minimal test workflow subclass

**Source**: Multiple test files

```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
```

**Usage**:
```typescript
const wf = new SimpleWorkflow('TestWorkflow');
```

**Key Observations**:
- Minimal implementation (only what's needed for tests)
- Standard name pattern: `SimpleWorkflow`, `TestWorkflow`, `BenchmarkWorkflow`
- Implements required `run()` method
- Can be customized for specific test scenarios

---

## 6. Advanced Testing Patterns

### 6.1 Multi-Root Tree Testing

**Pattern**: Test scenarios with multiple independent trees

**Source**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`

```typescript
it('should verify tree consistency after reparenting using debugger', () => {
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  const parent1Debugger = new WorkflowTreeDebugger(parent1);
  const parent2Debugger = new WorkflowTreeDebugger(parent2);

  // Reparent
  parent1.detachChild(child);
  parent2.attachChild(child);

  // Verify using both debuggers
  expect(parent2Debugger.getNode(child.id)).toBeDefined();
  expect(parent1Debugger.getNode(child.id)).toBeUndefined();
});
```

### 6.2 Rapid Operation Testing

**Pattern**: Test many rapid operations to verify consistency

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-incremental.test.ts`

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

### 6.3 Property-Based Testing

**Pattern**: Test algebraic properties (idempotence, commutativity)

**Source**: `/home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts`

```typescript
it('should satisfy idempotence property', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Capture state
  const childrenBefore = [...parent.children];
  const nodeChildrenBefore = [...parent.node.children];

  // ACT & ASSERT - Already attached - should throw
  expect(() => {
    parent.attachChild(child);
  }).toThrow(/already attached/);

  // ASSERT - State unchanged after error
  expect(parent.children).toEqual(childrenBefore);
  expect(parent.node.children).toEqual(nodeChildrenBefore);

  verifyTreeMirror(parent);
});
```

---

## 7. Event Replay Specific Patterns

### 7.1 Event Stream Creation

**Pattern**: Create event arrays representing workflow execution

**Example for replay tests**:
```typescript
const eventStream: WorkflowEvent[] = [
  {
    type: 'childAttached',
    parentId: 'root-123',
    child: {
      id: 'child-456',
      name: 'Child',
      status: 'idle',
      children: [],
      // ... other node properties
    }
  },
  {
    type: 'childDetached',
    parentId: 'root-123',
    childId: 'child-456'
  },
  {
    type: 'treeUpdated',
    root: {
      id: 'root-123',
      name: 'Root',
      status: 'completed',
      children: [],
      // ... other node properties
    }
  }
];
```

### 7.2 Replayer Verification Pattern

**Proposed pattern based on existing tests**:
```typescript
describe('WorkflowEventReplayer', () => {
  it('should reconstruct tree from event stream', () => {
    // Arrange: Create event stream
    const events: WorkflowEvent[] = [
      // ... events
    ];

    // Act: Replay events
    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(events);

    // Assert: Verify tree structure
    expect(tree).toBeDefined();
    expect(tree.id).toBe('root-123');
    expect(tree.children).toHaveLength(0); // Child was detached
  });

  it('should handle childAttached events', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'childAttached',
        parentId: 'root-123',
        child: {
          id: 'child-456',
          name: 'Child',
          status: 'idle',
          children: [],
          // ...
        }
      }
    ];

    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(events);

    // Verify child attached
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].id).toBe('child-456');
    expect(tree.children[0].parent).toBe(tree);

    // Verify node mirror invariant
    // (Would need helper to check node tree structure)
  });
});
```

---

## 8. Performance Testing Patterns

### 8.1 Performance Benchmark Pattern

**Source**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/node-map-update-benchmarks.test.ts`

```typescript
it('should detach single node from large tree in O(1) time', () => {
  // ARRANGE: Build large tree (1000 nodes)
  const root = new BenchmarkWorkflow('Root');
  let current: any = root;
  for (let i = 0; i < 999; i++) {
    const child = new BenchmarkWorkflow(`Node${i}`, current);
    current = child;
  }

  const treeDebugger = new WorkflowTreeDebugger(root);
  expect(treeDebugger.getStats().totalNodes).toBe(1000);

  // ACT: Benchmark detach single node
  const start = performance.now();
  const leaf = current;
  const parent = leaf.parent!;
  parent.detachChild(leaf);
  const duration = performance.now() - start;

  // ASSERT: Verify functional correctness FIRST
  const stats = treeDebugger.getStats();
  expect(stats.totalNodes).toBe(999);
  expect(treeDebugger.getNode(leaf.id)).toBeUndefined();

  // ASSERT: Performance threshold (generous for CI)
  expect(duration).toBeLessThan(5);
});
```

**Key Observations**:
- Build large test data structure
- Use `performance.now()` for timing
- Verify correctness FIRST, then performance
- Use generous thresholds for CI environments
- Log performance data for debugging

---

## 9. Coverage Analysis

### 9.1 What's Well Tested

**Tree Structure Manipulation**:
- ✅ Single child attach/detach
- ✅ Multiple children attach/detach
- ✅ Subtree attach/detach
- ✅ Deep hierarchies (100+ levels)
- ✅ Wide hierarchies (100+ children)
- ✅ Rapid attach/detach cycles
- ✅ Reparenting between multiple parents

**Event Handling**:
- ✅ childAttached event emission
- ✅ childDetached event emission
- ✅ treeUpdated event emission
- ✅ Event payload structure
- ✅ Event ordering (onEvent before onTreeChanged)
- ✅ Observer propagation across trees

**Map-Based Tracking**:
- ✅ Node addition to map
- ✅ Node removal from map
- ✅ Subtree removal (BFS traversal)
- ✅ Map lookup by ID
- ✅ Node count statistics
- ✅ Incremental updates (no full rebuild)

**Invariants**:
- ✅ Bidirectional link consistency
- ✅ Tree mirror invariant (1:1 correspondence)
- ✅ Acyclicity (no circular references)
- ✅ Single root per tree
- ✅ Node reachability

### 9.2 What's Missing for Replay Logic

**Not Yet Tested** (opportunities for P2M1T1S2):

1. **Event Stream Reconstruction**:
   - ❌ Replaying full event history to build tree
   - ❌ Handling events out of order
   - ❌ Handling missing/invalid events
   - ❌ Partial replay (replay to specific point in time)

2. **Event Replay Edge Cases**:
   - ❌ Events with non-existent parent IDs
   - ❌ Events with duplicate node IDs
   - ❌ Empty event arrays
   - ❌ Events without root establishment

3. **State Event Handling**:
   - ❌ stateSnapshot event updates
   - ❌ error event recording
   - ❌ State changes during tree operations

4. **Replayer-Specific Invariants**:
   - ❌ Map consistency after replay
   - ❌ Tree structure matches original
   - ❌ Node property preservation
   - ❌ Orphaned node detection

---

## 10. Recommended Test Patterns for P2M1T1S2

### 10.1 Test File Structure

```
src/__tests__/unit/event-replayer.test.ts
├── describe('WorkflowEventReplayer')
│   ├── describe('replay()')
│   │   ├── it('should reconstruct tree from event stream')
│   │   ├── it('should throw on empty event array')
│   │   ├── it('should throw on missing root')
│   │   └── it('should handle complex event sequences')
│   ├── describe('handleChildAttached()')
│   │   ├── it('should add child to parent')
│   │   ├── it('should add subtree to nodeMap')
│   │   ├── it('should throw if parent not found')
│   │   └── it('should throw on circular reference')
│   ├── describe('handleChildDetached()')
│   │   ├── it('should remove child from parent')
│   │   ├── it('should remove subtree from nodeMap')
│   │   └── it('should throw if child not found')
│   └── describe('buildNodeMap()')
│       ├── it('should add all nodes to map')
│       └── it('should handle deep hierarchies')
```

### 10.2 Core Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { WorkflowEventReplayer } from '../../debugger/event-replayer.js';
import type { WorkflowEvent } from '../../types/events.js';

describe('WorkflowEventReplayer', () => {
  describe('childAttached event handling', () => {
    it('should attach child to parent', () => {
      // Arrange: Create event stream with childAttached
      const events: WorkflowEvent[] = [
        {
          type: 'childAttached',
          parentId: 'root-123',
          child: {
            id: 'child-456',
            name: 'Child',
            status: 'idle',
            children: [],
            // ... complete WorkflowNode
          }
        }
      ];

      // Act: Replay events
      const replayer = new WorkflowEventReplayer();
      const tree = replayer.replay(events);

      // Assert: Verify tree structure
      expect(tree.id).toBe('root-123');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].id).toBe('child-456');

      // Assert: Verify bidirectional links
      expect(tree.children[0].parent).toBe(tree);

      // Assert: Verify node map contains both nodes
      expect(replayer['getNode']('root-123')).toBe(tree);
      expect(replayer['getNode']('child-456')).toBe(tree.children[0]);
    });
  });
});
```

### 10.3 Invariant Verification Template

```typescript
describe('Replay Invariants', () => {
  it('should maintain tree mirror invariant after replay', () => {
    const events = createComplexEventStream();

    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(events);

    // Verify tree structure
    verifyTreeStructure(tree);

    // Verify no orphaned nodes
    verifyNoOrphanedNodes(tree);

    // Verify no circular references
    verifyNoCycles(tree);
  });
});
```

---

## 11. Helper Functions to Extract

### 11.1 Tree Verification Helpers

**Location**: `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

**Key functions**:
- `verifyBidirectionalLink(parent, child)` - Verify parent-child links
- `verifyTreeMirror(root)` - Verify 1:1 tree correspondence
- `verifyOrphaned(child)` - Verify complete detachment
- `verifyNoCycles(root)` - Detect circular references
- `validateTreeConsistency(root)` - Comprehensive validation
- `collectAllNodes(root)` - BFS traversal with cycle detection
- `getDepth(node)` - Calculate node depth

**Usage for replay tests**:
```typescript
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  verifyOrphaned,
  validateTreeConsistency,
} from '../../helpers/tree-verification.js';

// In replay tests
const tree = replayer.replay(events);
const errors = validateTreeConsistency(tree);
expect(errors).toEqual([]);
```

---

## 12. Key Takeaways for Replay Logic Tests

1. **Use Existing Patterns**: The codebase has excellent test patterns for tree operations. Adapt them for replay logic.

2. **Helper Functions Are Golden**: `tree-verification.ts` provides reusable helpers. Use them.

3. **Test Structure Matters**: AAA pattern, clear phases, and descriptive names make tests maintainable.

4. **Verify Invariants**: Always check tree mirror invariant, bidirectional links, and no cycles.

5. **Event Verification**: Capture events, verify type/payload/ordering using established patterns.

6. **Map Verification**: Check node additions, removals, and counts after each operation.

7. **Edge Cases**: Test empty arrays, missing nodes, circular references, rapid operations.

8. **Performance**: Use `performance.now()`, verify correctness before performance, use generous thresholds.

9. **Console Mocking**: Use `beforeEach`/`afterEach` for tests that expect errors.

10. **Property-Based Testing**: Test idempotence, commutativity where applicable.

---

## 13. Specific Test Cases to Implement

### 13.1 Structural Event Tests

```typescript
// childAttached
✅ Should attach child to parent
✅ Should add child and descendants to nodeMap
✅ Should throw if parent not found
✅ Should throw on circular reference
✅ Should maintain bidirectional links
✅ Should maintain tree mirror invariant

// childDetached
✅ Should remove child from parent
✅ Should remove child and descendants from nodeMap
✅ Should throw if child not found
✅ Should throw if child not direct child of parent
✅ Should clear parent reference
✅ Should maintain tree mirror invariant

// treeUpdated
✅ Should update root reference
✅ Should rebuild nodeMap from new root
✅ Should throw if root is null
```

### 13.2 Error Handling Tests

```typescript
✅ Should throw on empty event array
✅ Should throw if root cannot be established
✅ Should throw on event with missing parent
✅ Should handle events with duplicate node IDs
✅ Should handle events with non-existent node IDs
```

### 13.3 Integration Tests

```typescript
✅ Should replay complex event sequences
✅ Should handle reparenting scenarios
✅ Should handle deep hierarchies
✅ Should handle wide hierarchies
✅ Should maintain consistency after rapid operations
```

---

## Conclusion

The Groundswell codebase has excellent test patterns that can be directly adapted for replay logic validation. Key areas to leverage:

1. **Tree verification helpers** from `tree-verification.ts`
2. **Event capture patterns** from observer tests
3. **Map verification patterns** from tree-debugger tests
4. **AAA structure** and **phase-based organization**
5. **Invariant verification** (mirror, bidirectional, acyclicity)

The replay logic tests should follow these established patterns while adding:
- Event stream construction helpers
- Replay-specific invariant checks
- Error handling for invalid event sequences
- Performance benchmarks for large event streams
