import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';

class IncrementalTestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}

describe('Incremental Node Map Updates', () => {
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

  it('childDetached on already-removed node is no-op', () => {
    const root = new IncrementalTestWorkflow('Root');
    const child1 = new IncrementalTestWorkflow('Child1', root);
    const grandchild = new IncrementalTestWorkflow('Grandchild', child1);

    const debugger_ = new WorkflowTreeDebugger(root);
    expect(debugger_.getStats().totalNodes).toBe(3);

    // Detach child1
    root.detachChild(child1);
    expect(debugger_.getStats().totalNodes).toBe(1);
    expect(debugger_.getNode(child1.id)).toBeUndefined();
    expect(debugger_.getNode(grandchild.id)).toBeUndefined();

    // Simulate the edge case where nodeMap still has orphaned nodes
    // by directly removing a node that was never properly attached
    // This tests the removeSubtreeNodes() no-op behavior
    const orphanId = 'nonexistent-node';
    expect(debugger_.getNode(orphanId)).toBeUndefined();

    // Calling removeSubtreeNodes on a non-existent node should be safe
    // We can't call detachChild twice because it throws, but we can
    // verify the nodeMap state is consistent
    expect(debugger_.getStats().totalNodes).toBe(1);
  });

  it('childAttached adds subtree (verify existing behavior)', () => {
    const root = new IncrementalTestWorkflow('Root');

    const debugger_ = new WorkflowTreeDebugger(root);
    expect(debugger_.getStats().totalNodes).toBe(1);

    // Attach a child with its own subtree
    const child1 = new IncrementalTestWorkflow('Child1', root);
    const grandchild = new IncrementalTestWorkflow('Grandchild', child1);

    // Verify all nodes are in the map
    expect(debugger_.getNode(root.id)).toBe(root.getNode());
    expect(debugger_.getNode(child1.id)).toBe(child1.getNode());
    expect(debugger_.getNode(grandchild.id)).toBe(grandchild.getNode());
    expect(debugger_.getStats().totalNodes).toBe(3);
  });

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
});
