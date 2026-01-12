/**
 * Bidirectional Consistency Tests for Dual Tree Structure
 *
 * Tests the 1:1 mirror invariant between the Workflow instance tree and the WorkflowNode tree
 * as specified in PRD Section 12.2.
 *
 * For every relationship in the workflow tree, there MUST be an equivalent relationship in the node tree:
 * - If child.parent === parent, then child.node.parent MUST equal parent.node
 * - If parent.children includes child, then parent.node.children MUST include child.node
 *
 * @module integration/bidirectional-consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  verifyOrphaned,
  verifyNoCycles,
  validateTreeConsistency,
  collectAllNodes,
  getDepth,
} from '../helpers/tree-verification.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/adversarial/circular-reference.test.ts:20-26
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// ============================================================================
// Basic Operations Tests
// ============================================================================

describe('Bidirectional Consistency: Basic Operations', () => {
  describe('attachChild() consistency', () => {
    it('should maintain bidirectional links in both trees', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child'); // No parent

      // ACT
      parent.attachChild(child);

      // ASSERT - Verify bidirectional links
      verifyBidirectionalLink(parent, child);

      // ASSERT - Verify tree mirror invariant
      verifyTreeMirror(parent);

      // ASSERT - Verify no inconsistencies detected
      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when attaching multiple children', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1');
      const child2 = new SimpleWorkflow('Child2');
      const child3 = new SimpleWorkflow('Child3');

      // ACT
      parent.attachChild(child1);
      parent.attachChild(child2);
      parent.attachChild(child3);

      // ASSERT - Verify each child
      verifyBidirectionalLink(parent, child1);
      verifyBidirectionalLink(parent, child2);
      verifyBidirectionalLink(parent, child3);

      // ASSERT - Verify entire tree
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when attaching child via constructor', () => {
      // ARRANGE & ACT
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent); // Auto-attaches

      // ASSERT - Verify bidirectional links
      verifyBidirectionalLink(parent, child);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when reattaching a detached child', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT - Detach and reattach
      parent.detachChild(child);
      parent.attachChild(child);

      // ASSERT - Verify bidirectional links restored
      verifyBidirectionalLink(parent, child);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });

  describe('detachChild() consistency', () => {
    it('should remove bidirectional links from both trees', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT
      parent.detachChild(child);

      // ASSERT - Verify orphaning in BOTH trees
      expect(child.parent).toBeNull();
      expect(child.node.parent).toBeNull();
      expect(parent.children).not.toContain(child);
      expect(parent.node.children).not.toContain(child.node);

      // ASSERT - Verify orphaning helper
      verifyOrphaned(child);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when detaching middle child', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1', parent);
      const child2 = new SimpleWorkflow('Child2', parent);
      const child3 = new SimpleWorkflow('Child3', parent);

      // ACT - Detach middle child
      parent.detachChild(child2);

      // ASSERT - Verify child2 is orphaned
      verifyOrphaned(child2);

      // ASSERT - Verify other children still linked
      verifyBidirectionalLink(parent, child1);
      verifyBidirectionalLink(parent, child3);

      // ASSERT - Verify parent has correct children
      expect(parent.children).toEqual([child1, child3]);
      expect(parent.node.children).toEqual([child1.node, child3.node]);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when detaching last child', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1', parent);
      const child2 = new SimpleWorkflow('Child2', parent);
      const child3 = new SimpleWorkflow('Child3', parent);

      // ACT - Detach last child
      parent.detachChild(child3);

      // ASSERT - Verify child3 is orphaned
      verifyOrphaned(child3);

      // ASSERT - Verify parent has correct children
      expect(parent.children).toEqual([child1, child2]);
      expect(parent.node.children).toEqual([child1.node, child2.node]);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when detaching all children', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1', parent);
      const child2 = new SimpleWorkflow('Child2', parent);

      // ACT - Detach all children
      parent.detachChild(child1);
      parent.detachChild(child2);

      // ASSERT - Verify all children orphaned
      verifyOrphaned(child1);
      verifyOrphaned(child2);

      // ASSERT - Verify parent has no children
      expect(parent.children).toEqual([]);
      expect(parent.node.children).toEqual([]);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });
});

// ============================================================================
// Reparenting Tests
// ============================================================================

describe('Bidirectional Consistency: Reparenting', () => {
  it('should maintain consistency during single reparenting', () => {
    // ARRANGE
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT - Verify initial state
    verifyBidirectionalLink(parent1, child);
    expect(parent2.children).toEqual([]);

    // ACT - Reparent
    parent1.detachChild(child);
    parent2.attachChild(child);

    // ASSERT - Verify new state
    verifyBidirectionalLink(parent2, child);

    // ASSERT - Verify old parent no longer has child in BOTH trees
    expect(parent1.children).not.toContain(child);
    expect(parent1.node.children).not.toContain(child.node);

    // ASSERT - Verify new parent has child in BOTH trees
    expect(parent2.children).toContain(child);
    expect(parent2.node.children).toContain(child.node);

    // ASSERT - Verify both trees are valid
    verifyTreeMirror(parent1);
    verifyTreeMirror(parent2);

    const errors1 = validateTreeConsistency(parent1);
    const errors2 = validateTreeConsistency(parent2);
    expect(errors1).toEqual([]);
    expect(errors2).toEqual([]);
  });

  it('should maintain consistency during multiple reparenting cycles', () => {
    // ARRANGE
    const parentA = new SimpleWorkflow('ParentA');
    const parentB = new SimpleWorkflow('ParentB');
    const parentC = new SimpleWorkflow('ParentC');
    const child = new SimpleWorkflow('Child', parentA);

    // ACT - Cycle 1: A -> B
    parentA.detachChild(child);
    parentB.attachChild(child);

    // ASSERT - After cycle 1
    verifyBidirectionalLink(parentB, child);
    verifyTreeMirror(parentB);
    expect(validateTreeConsistency(parentB)).toEqual([]);

    // ACT - Cycle 2: B -> C
    parentB.detachChild(child);
    parentC.attachChild(child);

    // ASSERT - After cycle 2
    verifyBidirectionalLink(parentC, child);
    verifyTreeMirror(parentC);
    expect(validateTreeConsistency(parentC)).toEqual([]);

    // ACT - Cycle 3: C -> A (back to original)
    parentC.detachChild(child);
    parentA.attachChild(child);

    // ASSERT - After cycle 3
    verifyBidirectionalLink(parentA, child);
    verifyTreeMirror(parentA);
    expect(validateTreeConsistency(parentA)).toEqual([]);
  });

  it('should maintain consistency with deep hierarchy reparenting', () => {
    // ARRANGE - Create deep hierarchy: root1 -> mid1 -> leaf
    const root1 = new SimpleWorkflow('Root1');
    const mid1 = new SimpleWorkflow('Mid1', root1);
    const leaf = new SimpleWorkflow('Leaf', mid1);

    // ARRANGE - Create second hierarchy: root2 -> mid2
    const root2 = new SimpleWorkflow('Root2');
    const mid2 = new SimpleWorkflow('Mid2', root2);

    // ASSERT - Verify initial deep hierarchy
    verifyBidirectionalLink(root1, mid1);
    verifyBidirectionalLink(mid1, leaf);
    verifyTreeMirror(root1);

    // ACT - Reparent entire subtree (mid1 + leaf) from root1 to root2
    root1.detachChild(mid1);
    root2.attachChild(mid1);

    // ASSERT - Verify new hierarchy: root2 -> mid2, mid1 -> leaf
    verifyBidirectionalLink(root2, mid1);
    verifyBidirectionalLink(mid1, leaf);
    verifyTreeMirror(root2);

    // ASSERT - Verify old root no longer has mid1 in BOTH trees
    expect(root1.children).toEqual([]);
    expect(root1.node.children).toEqual([]);

    // ASSERT - Verify new root has both children in BOTH trees
    expect(root2.children).toEqual([mid2, mid1]);
    expect(root2.node.children).toEqual([mid2.node, mid1.node]);

    // ASSERT - Verify leaf still under mid1 in BOTH trees
    expect(mid1.children).toEqual([leaf]);
    expect(mid1.node.children).toEqual([leaf.node]);

    // ASSERT - Verify no inconsistencies
    expect(validateTreeConsistency(root2)).toEqual([]);
  });

  it('should maintain consistency when reparenting between multiple parents', () => {
    // ARRANGE
    const parents = [
      new SimpleWorkflow('Parent0'),
      new SimpleWorkflow('Parent1'),
      new SimpleWorkflow('Parent2'),
      new SimpleWorkflow('Parent3'),
    ];
    const child = new SimpleWorkflow('Child', parents[0]);

    // ACT - Reparent through all parents
    for (let i = 0; i < parents.length - 1; i++) {
      const currentParent = parents[i];
      const nextParent = parents[i + 1];

      currentParent.detachChild(child);
      nextParent.attachChild(child);

      // ASSERT - Verify consistency after each reparenting
      verifyBidirectionalLink(nextParent, child);
      verifyTreeMirror(nextParent);
      expect(validateTreeConsistency(nextParent)).toEqual([]);
    }

    // ASSERT - Final parent should have child
    verifyBidirectionalLink(parents[3], child);
    expect(parents[0].children).toEqual([]);
  });
});

// ============================================================================
// Invariant Tests
// ============================================================================

describe('Bidirectional Consistency: Invariants', () => {
  describe('Acyclicity invariant', () => {
    it('should prevent circular references', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      // ACT & ASSERT - Try to create cycle
      expect(() => {
        child.attachChild(root as any);
      }).toThrow(/circular|cycle|ancestor/i);

      // ASSERT - Verify no corruption occurred
      verifyNoCycles(root);
      expect(root.parent).toBeNull();
      expect(child.parent).toBe(root);
    });

    it('should detect complex circular references', () => {
      // ARRANGE - Create chain: root -> child1 -> child2 -> child3
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', child1);
      const child3 = new SimpleWorkflow('Child3', child2);

      // ACT & ASSERT - Try to create cycle: child3 -> root
      expect(() => {
        child3.attachChild(root as any);
      }).toThrow(/circular|cycle|ancestor/i);

      // ASSERT - Verify no corruption
      verifyNoCycles(root);
      verifyTreeMirror(root);
    });

    it('should prevent self-attachment', () => {
      // ARRANGE
      const workflow = new SimpleWorkflow('Self');

      // ACT & ASSERT - Try to attach to self
      expect(() => {
        workflow.attachChild(workflow as any);
      }).toThrow(/circular|cycle|ancestor/i);
    });
  });

  describe('Tree mirror invariant', () => {
    it('should maintain 1:1 correspondence after operations', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // ASSERT - Verify mirror after creation
      verifyTreeMirror(root);

      // ACT - Detach and reattach
      root.detachChild(child1);
      verifyTreeMirror(root);

      root.attachChild(child1);
      verifyTreeMirror(root);

      // ASSERT - Verify both trees have same structure
      expect(root.children.length).toBe(root.node.children.length);
      expect(root.children[0].node).toBe(root.node.children[0]);
      expect(root.children[1].node).toBe(root.node.children[1]);
    });

    it('should detect mirror violations in parent relationship', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT - Manually corrupt node tree (simulating bug)
      (child.node as any).parent = null;

      // ASSERT - Should detect mirror violation
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow(/MIRROR/);
    });

    it('should detect mirror violations in children relationship', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT - Manually corrupt node tree children array
      (parent.node as any).children = [];

      // ASSERT - Should detect mirror violation
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow(/MIRROR/);
    });
  });

  describe('Single root invariant', () => {
    it('should maintain exactly one root', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // ACT - Count roots
      const allNodes = collectAllNodes(root);
      const roots = allNodes.filter(n => n.parent === null);

      // ASSERT - Should have exactly one root
      expect(roots.length).toBe(1);
      expect(roots[0]).toBe(root);
    });

    it('should have one root after reparenting', () => {
      // ARRANGE
      const root1 = new SimpleWorkflow('Root1');
      const root2 = new SimpleWorkflow('Root2');
      const child = new SimpleWorkflow('Child', root1);

      // ASSERT - Initially: 2 roots (root1 and root2)
      let allNodes = [...collectAllNodes(root1), ...collectAllNodes(root2)];
      let roots = allNodes.filter(n => n.parent === null);
      expect(roots.length).toBe(2);

      // ACT - Reparent child to root2
      root1.detachChild(child);
      root2.attachChild(child);

      // ASSERT - Still: 2 roots (root1 and root2)
      allNodes = [...collectAllNodes(root1), ...collectAllNodes(root2)];
      roots = allNodes.filter(n => n.parent === null);
      expect(roots.length).toBe(2);
    });
  });

  describe('Connectedness invariant', () => {
    it('should have all nodes reachable from root', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);
      const grandchild = new SimpleWorkflow('Grandchild', child1);

      // ACT - Collect all nodes and verify reachability
      const allNodes = collectAllNodes(root);
      const reachableFromRoot = new Set<Workflow>();

      function traverse(node: Workflow): void {
        reachableFromRoot.add(node);
        node.children.forEach(traverse);
      }

      traverse(root);

      // ASSERT - All nodes should be reachable
      allNodes.forEach(node => {
        expect(reachableFromRoot.has(node)).toBe(true);
      });
    });

    it('should have all nodes reachable after reparenting', () => {
      // ARRANGE
      const root1 = new SimpleWorkflow('Root1');
      const root2 = new SimpleWorkflow('Root2');
      const child = new SimpleWorkflow('Child', root1);

      // ACT - Reparent
      root1.detachChild(child);
      root2.attachChild(child);

      // ASSERT - Verify reachability from root2
      const allNodes = collectAllNodes(root2);
      const reachableFromRoot = new Set<Workflow>();

      function traverse(node: Workflow): void {
        reachableFromRoot.add(node);
        node.children.forEach(traverse);
      }

      traverse(root2);

      expect(reachableFromRoot.has(root2)).toBe(true);
      expect(reachableFromRoot.has(child)).toBe(true);
    });
  });

  describe('Depth calculation', () => {
    it('should calculate depth correctly', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', child1);
      const child3 = new SimpleWorkflow('Child3', child2);

      // ASSERT - Verify depths
      expect(getDepth(root)).toBe(0);
      expect(getDepth(child1)).toBe(1);
      expect(getDepth(child2)).toBe(2);
      expect(getDepth(child3)).toBe(3);
    });
  });
});

// ============================================================================
// Adversarial Tests
// ============================================================================

describe('Bidirectional Consistency: Adversarial Tests', () => {
  // Console mocking to suppress error output during expected failures
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Manual mutation detection', () => {
    it('should detect inconsistency from manual parent mutation', () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // ACT - Manually mutate parent (bypassing attachChild)
      (child as any).parent = parent2;

      // ASSERT - Should detect inconsistency
      const errors = validateTreeConsistency(parent1);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Mismatched parent'))).toBe(true);
    });

    it('should detect inconsistency from manual children array mutation', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);
      const other = new SimpleWorkflow('Other');

      // ACT - Manually add to children array (bypassing attachChild)
      (parent as any).children.push(other);

      // ASSERT - Should detect inconsistency
      const errors = validateTreeConsistency(parent);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect inconsistency from node tree mutation', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT - Manually mutate node tree
      (child.node as any).parent = null;

      // ASSERT - Should detect mirror violation
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow();
    });

    it('should detect inconsistency from node children array mutation', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT - Manually mutate node.children array to add duplicate child
      // This creates a mirror violation where node.children has extra entries
      (parent.node as any).children.push(child.node); // Duplicate child

      // ASSERT - Should detect mirror violation (children count mismatch)
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow(/MIRROR|Children count mismatch/);
    });
  });

  describe('Stress testing', () => {
    it('should maintain consistency with deep hierarchies', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      let current = root;

      // ACT - Create 100 levels deep
      for (let i = 0; i < 100; i++) {
        const child = new SimpleWorkflow(`Level-${i}`);
        current.attachChild(child);
        current = child;
      }

      // ASSERT - Verify consistency at each level
      verifyTreeMirror(root);
      verifyNoCycles(root);

      const errors = validateTreeConsistency(root);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency with wide hierarchies', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const children: SimpleWorkflow[] = [];

      // ACT - Create 100 children
      for (let i = 0; i < 100; i++) {
        const child = new SimpleWorkflow(`Child-${i}`);
        parent.attachChild(child);
        children.push(child);
      }

      // ASSERT - Verify all children
      children.forEach(child => {
        verifyBidirectionalLink(parent, child);
      });

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency during rapid attach/detach cycles', () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // ACT - Rapid reparenting (100 cycles)
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          parent1.detachChild(child);
          parent2.attachChild(child);
        } else {
          parent2.detachChild(child);
          parent1.attachChild(child);
        }

        // ASSERT - Verify consistency after each cycle
        const expectedParent = i % 2 === 0 ? parent2 : parent1;
        expect(child.parent).toBe(expectedParent);
        expect(child.node.parent).toBe(expectedParent.node);
      }

      // ASSERT - Final verification
      verifyTreeMirror(parent1);
      verifyTreeMirror(parent2);
    });

    it('should handle complex multi-level reparenting', () => {
      // ARRANGE - Create complex tree structure
      const root1 = new SimpleWorkflow('Root1');
      const branch1 = new SimpleWorkflow('Branch1', root1);
      const leaf1a = new SimpleWorkflow('Leaf1A', branch1);
      const leaf1b = new SimpleWorkflow('Leaf1B', branch1);

      const root2 = new SimpleWorkflow('Root2');
      const branch2 = new SimpleWorkflow('Branch2', root2);

      // ACT - Reparent branch1 (and its children) to root2
      root1.detachChild(branch1);
      root2.attachChild(branch1);

      // ASSERT - Verify tree structure
      verifyTreeMirror(root2);

      // Verify root1 has no children
      expect(root1.children).toEqual([]);

      // Verify root2 has both branches
      expect(root2.children.length).toBe(2);

      // Verify branch1 still has its children
      expect(branch1.children).toEqual([leaf1a, leaf1b]);

      // Verify all bidirectional links
      verifyBidirectionalLink(root2, branch1);
      verifyBidirectionalLink(root2, branch2);
      verifyBidirectionalLink(branch1, leaf1a);
      verifyBidirectionalLink(branch1, leaf1b);

      const errors = validateTreeConsistency(root2);
      expect(errors).toEqual([]);
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Bidirectional Consistency: Property-Based Tests', () => {
  it('should satisfy round-trip property', () => {
    // ARRANGE
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);

    // Capture initial children count
    const initialChildCount = root.children.length;
    const initialNodeChildCount = root.node.children.length;

    // ACT - Detach and reattach
    root.detachChild(child1);
    root.attachChild(child1);

    // ASSERT - Should maintain same children (order may change after detach/reattach)
    expect(root.children.length).toBe(initialChildCount);
    expect(root.node.children.length).toBe(initialNodeChildCount);
    expect(root.children).toContain(child1);
    expect(root.children).toContain(child2);

    // ASSERT - Verify mirror invariant maintained
    verifyTreeMirror(root);
  });

  it('should satisfy idempotence property', () => {
    // ARRANGE
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

  it('should satisfy commutativity property for siblings', () => {
    // ARRANGE
    const parent = new SimpleWorkflow('Parent');
    const child1 = new SimpleWorkflow('Child1');
    const child2 = new SimpleWorkflow('Child2');
    const child3 = new SimpleWorkflow('Child3');

    // ACT - Attach in order 1, 2, 3
    parent.attachChild(child1);
    parent.attachChild(child2);
    parent.attachChild(child3);

    const structure1 = [...parent.children];

    // Clean up
    parent.detachChild(child1);
    parent.detachChild(child2);
    parent.detachChild(child3);

    // Attach in order 3, 2, 1
    parent.attachChild(child3);
    parent.attachChild(child2);
    parent.attachChild(child1);

    const structure2 = [...parent.children];

    // ASSERT - Same children (in insertion order)
    expect(structure1).toEqual([child1, child2, child3]);
    expect(structure2).toEqual([child3, child2, child1]);

    verifyTreeMirror(parent);
  });
});
