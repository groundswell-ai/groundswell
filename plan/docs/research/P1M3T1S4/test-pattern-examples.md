# Test Pattern Examples for Bidirectional Tree Consistency

**Companion to:** bidirectional-tree-consistency-testing.md
**Purpose:** Provide copy-paste ready test patterns for immediate implementation

---

## Quick Reference: Helper Functions

```typescript
// File: src/__tests__/helpers/tree-verification.ts

import type { Workflow } from '../../index.js';

/**
 * Collect all nodes in tree via BFS
 * Throws if circular reference detected
 */
export function collectAllNodes(root: Workflow): Workflow[] {
  const nodes: Workflow[] = [];
  const queue: Workflow[] = [root];
  const visited = new Set<Workflow>();

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (visited.has(node)) {
      throw new Error(`Circular reference detected at ${node.node.name}`);
    }

    visited.add(node);
    nodes.push(node);
    queue.push(...node.children);
  }

  return nodes;
}

/**
 * Validate tree-wide bidirectional consistency
 * Returns array of inconsistency descriptions (empty if valid)
 */
export function validateTreeConsistency(root: Workflow): string[] {
  const errors: string[] = [];
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    // Check parent→child link in workflow tree
    if (node.parent) {
      if (!node.parent.children.includes(node)) {
        errors.push(
          `[WORKFLOW TREE] Orphaned child: "${node.node.name}" not in parent "${node.parent.node.name}"'s children list`
        );
      }
    } else {
      // Root node - should not be in anyone's children
      const parentClaimants = allNodes.filter(n => n.children.includes(node));
      if (parentClaimants.length > 0) {
        errors.push(
          `[WORKFLOW TREE] Root node "${node.node.name}" claimed as child by [${parentClaimants.map(n => n.node.name).join(', ')}]`
        );
      }
    }

    // Check child→parent links
    node.children.forEach(child => {
      if (child.parent !== node) {
        errors.push(
          `[WORKFLOW TREE] Mismatched parent: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // Check node tree mirrors workflow tree - parent relationship
      if (child.node.parent !== node.node) {
        errors.push(
          `[NODE TREE] Mismatched parent: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // Check node tree mirrors workflow tree - children relationship
      if (!node.node.children.includes(child.node)) {
        errors.push(
          `[NODE TREE] Orphaned child: "${child.node.name}".node not in parent "${node.node.name}"'s node.children array`
        );
      }
    });
  });

  return errors;
}

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

  // Node tree checks (must mirror workflow tree)
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

/**
 * Verify complete orphaning after detach
 */
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

/**
 * Verify no circular references exist
 */
export function verifyNoCycles(root: Workflow): void {
  const visited = new Set<Workflow>();
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    if (visited.has(node)) {
      throw new Error(`Circular reference detected: node "${node.node.name}" visited twice`);
    }
    visited.add(node);
  });
}

/**
 * Verify tree mirror invariant (1:1 correspondence)
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

/**
 * Get depth of node in tree
 */
export function getDepth(node: Workflow): number {
  let depth = 0;
  let current: Workflow | null = node;

  while (current !== null) {
    depth++;
    current = current.parent;
  }

  return depth - 1; // Subtract 1 for the node itself
}
```

---

## Pattern 1: Basic Bidirectional Consistency Test

```typescript
// File: src/__tests__/integration/bidirectional-consistency.test.ts

import { describe, it, expect } from 'vitest';
import { Workflow } from '../../index.js';
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  validateTreeConsistency,
} from '../helpers/tree-verification';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Bidirectional Consistency: Basic Operations', () => {
  describe('attachChild() consistency', () => {
    it('should maintain bidirectional links in both trees', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child'); // No parent

      parent.attachChild(child);

      // Verify bidirectional links
      verifyBidirectionalLink(parent, child);

      // Verify tree mirror invariant
      verifyTreeMirror(parent);

      // Verify no inconsistencies detected
      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when attaching multiple children', () => {
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1');
      const child2 = new SimpleWorkflow('Child2');
      const child3 = new SimpleWorkflow('Child3');

      parent.attachChild(child1);
      parent.attachChild(child2);
      parent.attachChild(child3);

      // Verify each child
      verifyBidirectionalLink(parent, child1);
      verifyBidirectionalLink(parent, child2);
      verifyBidirectionalLink(parent, child3);

      // Verify entire tree
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });

  describe('detachChild() consistency', () => {
    it('should remove bidirectional links from both trees', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      parent.detachChild(child);

      // Verify orphaning
      verifyOrphaned(child);

      // Verify parent no longer references child
      expect(parent.children).not.toContain(child);
      expect(parent.node.children).not.toContain(child.node);

      // Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when detaching middle child', () => {
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1', parent);
      const child2 = new SimpleWorkflow('Child2', parent);
      const child3 = new SimpleWorkflow('Child3', parent);

      // Detach middle child
      parent.detachChild(child2);

      // Verify child2 is orphaned
      verifyOrphaned(child2);

      // Verify other children still linked
      verifyBidirectionalLink(parent, child1);
      verifyBidirectionalLink(parent, child3);

      // Verify parent has correct children
      expect(parent.children).toEqual([child1, child3]);
      expect(parent.node.children).toEqual([child1.node, child3.node]);

      // Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });
});
```

---

## Pattern 2: Reparenting Consistency Test

```typescript
describe('Bidirectional Consistency: Reparenting', () => {
  it('should maintain consistency during single reparenting', () => {
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // Verify initial state
    verifyBidirectionalLink(parent1, child);
    expect(parent2.children).toEqual([]);

    // Execute reparenting
    parent1.detachChild(child);
    parent2.attachChild(child);

    // Verify new state
    verifyBidirectionalLink(parent2, child);

    // Verify old parent no longer has child
    expect(parent1.children).not.toContain(child);
    expect(parent1.node.children).not.toContain(child.node);

    // Verify new parent has child
    expect(parent2.children).toContain(child);
    expect(parent2.node.children).toContain(child.node);

    // Verify tree mirrors
    verifyTreeMirror(parent1);
    verifyTreeMirror(parent2);

    // Verify no inconsistencies
    const errors1 = validateTreeConsistency(parent1);
    const errors2 = validateTreeConsistency(parent2);

    expect(errors1).toEqual([]);
    expect(errors2).toEqual([]);
  });

  it('should maintain consistency during multiple reparenting cycles', () => {
    const parentA = new SimpleWorkflow('ParentA');
    const parentB = new SimpleWorkflow('ParentB');
    const parentC = new SimpleWorkflow('ParentC');
    const child = new SimpleWorkflow('Child', parentA);

    // Cycle 1: A -> B
    parentA.detachChild(child);
    parentB.attachChild(child);

    verifyBidirectionalLink(parentB, child);
    verifyTreeMirror(parentB);
    expect(validateTreeConsistency(parentB)).toEqual([]);

    // Cycle 2: B -> C
    parentB.detachChild(child);
    parentC.attachChild(child);

    verifyBidirectionalLink(parentC, child);
    verifyTreeMirror(parentC);
    expect(validateTreeConsistency(parentC)).toEqual([]);

    // Cycle 3: C -> A (back to original)
    parentC.detachChild(child);
    parentA.attachChild(child);

    verifyBidirectionalLink(parentA, child);
    verifyTreeMirror(parentA);
    expect(validateTreeConsistency(parentA)).toEqual([]);
  });

  it('should maintain consistency with deep hierarchy reparenting', () => {
    const root1 = new SimpleWorkflow('Root1');
    const mid1 = new SimpleWorkflow('Mid1', root1);
    const leaf = new SimpleWorkflow('Leaf', mid1);

    const root2 = new SimpleWorkflow('Root2');
    const mid2 = new SimpleWorkflow('Mid2', root2);

    // Verify initial deep hierarchy
    verifyBidirectionalLink(root1, mid1);
    verifyBidirectionalLink(mid1, leaf);
    verifyTreeMirror(root1);

    // Reparent entire subtree (mid1 + leaf)
    root1.detachChild(mid1);
    root2.attachChild(mid1);

    // Verify new hierarchy
    verifyBidirectionalLink(root2, mid1);
    verifyBidirectionalLink(mid1, leaf);
    verifyTreeMirror(root2);

    // Verify old root no longer has mid1
    expect(root1.children).toEqual([]);
    expect(root1.node.children).toEqual([]);

    // Verify new root has mid1
    expect(root2.children).toEqual([mid1]);
    expect(root2.node.children).toEqual([mid1.node]);

    // Verify leaf still under mid1
    expect(mid1.children).toEqual([leaf]);
    expect(mid1.node.children).toEqual([leaf.node]);

    // Verify no inconsistencies
    expect(validateTreeConsistency(root2)).toEqual([]);
  });
});
```

---

## Pattern 3: Invariant Testing

```typescript
describe('Bidirectional Consistency: Invariants', () => {
  describe('Acyclicity invariant', () => {
    it('should prevent circular references', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      // Try to create cycle
      expect(() => {
        child.attachChild(root as any);
      }).toThrow(/circular|cycle/i);

      // Verify no corruption
      verifyNoCycles(root);
      expect(root.parent).toBeNull();
      expect(child.parent).toBe(root);
    });

    it('should detect complex circular references', () => {
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', child1);
      const child3 = new SimpleWorkflow('Child3', child2);

      // Try to create cycle: child3 -> root
      expect(() => {
        child3.attachChild(root as any);
      }).toThrow(/circular|cycle/i);

      // Verify no corruption
      verifyNoCycles(root);
      verifyTreeMirror(root);
    });
  });

  describe('Tree mirror invariant', () => {
    it('should maintain 1:1 correspondence after operations', () => {
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // Verify mirror after creation
      verifyTreeMirror(root);

      // Detach and reattach
      root.detachChild(child1);
      verifyTreeMirror(root);

      root.attachChild(child1);
      verifyTreeMirror(root);

      // Verify both trees have same structure
      expect(root.children.length).toBe(root.node.children.length);
      expect(root.children[0].node).toBe(root.node.children[0]);
      expect(root.children[1].node).toBe(root.node.children[1]);
    });

    it('should detect mirror violations', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // Manually corrupt node tree (simulating bug)
      (child.node as any).parent = null;

      // Should detect mirror violation
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow(/MIRROR/);
    });
  });

  describe('Single root invariant', () => {
    it('should maintain exactly one root', () => {
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // Count roots
      const allNodes = collectAllNodes(root);
      const roots = allNodes.filter(n => n.parent === null);

      expect(roots.length).toBe(1);
      expect(roots[0]).toBe(root);
    });

    it('should have one root after reparenting', () => {
      const root1 = new SimpleWorkflow('Root1');
      const root2 = new SimpleWorkflow('Root2');
      const child = new SimpleWorkflow('Child', root1);

      // Initially: 2 roots (root1 and root2)
      let allNodes = [...collectAllNodes(root1), ...collectAllNodes(root2)];
      let roots = allNodes.filter(n => n.parent === null);
      expect(roots.length).toBe(2);

      // Reparent child to root2
      root1.detachChild(child);
      root2.attachChild(child);

      // Still: 2 roots (root1 and root2)
      allNodes = [...collectAllNodes(root1), ...collectAllNodes(root2)];
      roots = allNodes.filter(n => n.parent === null);
      expect(roots.length).toBe(2);
    });
  });

  describe('Connectedness invariant', () => {
    it('should have all nodes reachable from root', () => {
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);
      const grandchild = new SimpleWorkflow('Grandchild', child1);

      const allNodes = collectAllNodes(root);
      const reachableFromRoot = new Set<Workflow>();

      function traverse(node: Workflow): void {
        reachableFromRoot.add(node);
        node.children.forEach(traverse);
      }

      traverse(root);

      // All nodes should be reachable
      allNodes.forEach(node => {
        expect(reachableFromRoot.has(node)).toBe(true);
      });
    });
  });
});
```

---

## Pattern 4: Adversarial Testing

```typescript
describe('Bidirectional Consistency: Adversarial Tests', () => {
  describe('Manual mutation detection', () => {
    it('should detect inconsistency from manual parent mutation', () => {
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // Manually mutate parent (bypassing attachChild)
      (child as any).parent = parent2;

      // Should detect inconsistency
      const errors = validateTreeConsistency(parent1);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Mismatched parent'))).toBe(true);
    });

    it('should detect inconsistency from manual children array mutation', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);
      const other = new SimpleWorkflow('Other');

      // Manually add to children array (bypassing attachChild)
      (parent as any).children.push(other);

      // Should detect inconsistency
      const errors = validateTreeConsistency(parent);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect inconsistency from node tree mutation', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // Manually mutate node tree
      (child.node as any).parent = null;

      // Should detect mirror violation
      expect(() => {
        verifyTreeMirror(parent);
      }).toThrow();
    });
  });

  describe('Stress testing', () => {
    it('should maintain consistency with deep hierarchies', () => {
      const root = new SimpleWorkflow('Root');
      let current = root;

      // Create 100 levels deep
      for (let i = 0; i < 100; i++) {
        const child = new SimpleWorkflow(`Level-${i}`);
        current.attachChild(child);
        current = child;
      }

      // Verify consistency at each level
      verifyTreeMirror(root);
      verifyNoCycles(root);

      const errors = validateTreeConsistency(root);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency with wide hierarchies', () => {
      const parent = new SimpleWorkflow('Parent');
      const children: Workflow[] = [];

      // Create 100 children
      for (let i = 0; i < 100; i++) {
        const child = new SimpleWorkflow(`Child-${i}`);
        parent.attachChild(child);
        children.push(child);
      }

      // Verify all children
      children.forEach(child => {
        verifyBidirectionalLink(parent, child);
      });

      // Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency during rapid attach/detach cycles', () => {
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // Rapid reparenting
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          parent1.detachChild(child);
          parent2.attachChild(child);
        } else {
          parent2.detachChild(child);
          parent1.attachChild(child);
        }

        // Verify consistency after each cycle
        const expectedParent = i % 2 === 0 ? parent2 : parent1;
        expect(child.parent).toBe(expectedParent);
        expect(child.node.parent).toBe(expectedParent.node);
      }

      // Final verification
      verifyTreeMirror(parent1);
      verifyTreeMirror(parent2);
    });
  });
});
```

---

## Pattern 5: Property-Based Testing

```typescript
describe('Bidirectional Consistency: Property-Based Tests', () => {
  it('should satisfy round-trip property', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);

    // Capture initial state
    const initialChildren = [...root.children];
    const initialNodeChildren = [...root.node.children];

    // Detach and reattach
    root.detachChild(child1);
    root.attachChild(child1);

    // Should return to equivalent state
    expect(root.children).toEqual(initialChildren);
    expect(root.node.children).toEqual(initialNodeChildren);

    verifyTreeMirror(root);
  });

  it('should satisfy idempotence property', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Already attached - should not change state
    parent.attachChild(child);

    expect(parent.children).toEqual([child]);
    expect(parent.node.children).toEqual([child.node]);

    verifyTreeMirror(parent);
  });

  it('should satisfy commutativity property for siblings', () => {
    const parent = new SimpleWorkflow('Parent');
    const child1 = new SimpleWorkflow('Child1');
    const child2 = new SimpleWorkflow('Child2');
    const child3 = new SimpleWorkflow('Child3');

    // Attach in order 1, 2, 3
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

    // Same children (order may differ)
    expect(structure1.sort()).toEqual(structure2.sort());

    verifyTreeMirror(parent);
  });
});
```

---

## Pattern 6: Integration with WorkflowTreeDebugger

```typescript
describe('Bidirectional Consistency: Debugger Integration', () => {
  it('should verify consistency using WorkflowTreeDebugger', () => {
    const parent = new SimpleWorkflow('Parent');
    const child1 = new SimpleWorkflow('Child1', parent);
    const child2 = new SimpleWorkflow('Child2', parent);

    const debugger = new WorkflowTreeDebugger(parent);

    // Verify debugger can find all nodes
    expect(debugger.getNode(parent.id)).toBeDefined();
    expect(debugger.getNode(child1.id)).toBeDefined();
    expect(debugger.getNode(child2.id)).toBeDefined();

    // Verify debugger tree structure
    const tree = debugger.getTree();
    expect(tree.name).toBe('Parent');
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].name).toBe('Child1');
    expect(tree.children[1].name).toBe('Child2');

    // Verify stats
    const stats = debugger.getStats();
    expect(stats.totalNodes).toBe(3);
  });

  it('should maintain consistency after operations visible to debugger', () => {
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    const debugger1 = new WorkflowTreeDebugger(parent1);

    // Verify initial state
    expect(debugger1.getTree().children.length).toBe(1);

    // Reparent
    parent1.detachChild(child);
    parent2.attachChild(child);

    // Old parent's debugger should show empty tree
    expect(debugger1.getTree().children.length).toBe(0);

    // New parent's debugger should show child
    const debugger2 = new WorkflowTreeDebugger(parent2);
    expect(debugger2.getTree().children.length).toBe(1);
    expect(debugger2.getTree().children[0].name).toBe('Child');

    // Verify consistency
    verifyTreeMirror(parent1);
    verifyTreeMirror(parent2);
  });

  it('should generate correct tree string representation', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);

    const debugger = new WorkflowTreeDebugger(root);
    const treeString = debugger.toTreeString();

    // Verify tree structure in ASCII
    expect(treeString).toContain('Root');
    expect(treeString).toContain('Child1');
    expect(treeString).toContain('Child2');
    expect(treeString).toContain('├──'); // Tree connector
    expect(treeString).toContain('└──'); // Tree connector
  });
});
```

---

## Test File Template

```typescript
/**
 * Template for bidirectional consistency tests
 * Copy and modify for your specific test scenario
 */

import { describe, it, expect } from 'vitest';
import { Workflow } from '../../index.js';
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  verifyOrphaned,
  verifyNoCycles,
  validateTreeConsistency,
  collectAllNodes,
} from '../helpers/tree-verification';

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    return 'done';
  }
}

describe('YOUR TEST SUITE NAME', () => {
  it('should describe the test scenario', () => {
    // ============================================================
    // ARRANGE: Set up test data
    // ============================================================
    const parent = new TestWorkflow('Parent');
    const child = new TestWorkflow('Child');

    // ============================================================
    // ACT: Execute the behavior
    // ============================================================
    parent.attachChild(child);

    // ============================================================
    // ASSERT: Verify the result
    // ============================================================

    // 1. Verify bidirectional links
    verifyBidirectionalLink(parent, child);

    // 2. Verify tree mirror invariant
    verifyTreeMirror(parent);

    // 3. Verify no inconsistencies
    const errors = validateTreeConsistency(parent);
    expect(errors).toEqual([]);

    // 4. Add specific assertions for your scenario
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
    expect(child.node.parent).toBe(parent.node);
    expect(parent.node.children).toContain(child.node);
  });

  it('should test error case', () => {
    const parent1 = new TestWorkflow('Parent1');
    const parent2 = new TestWorkflow('Parent2');
    const child = new TestWorkflow('Child', parent1);

    // Should throw
    expect(() => {
      parent2.attachChild(child);
    }).toThrow(/already has a parent/);

    // Verify no corruption occurred
    verifyBidirectionalLink(parent1, child);
    verifyTreeMirror(parent1);

    const errors = validateTreeConsistency(parent1);
    expect(errors).toEqual([]);
  });
});
```

---

## Usage Guidelines

### 1. Always Test Both Trees

```typescript
// BAD: Only tests workflow tree
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);

// GOOD: Tests both trees
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);
expect(child.node.parent).toBe(parent.node);
expect(parent.node.children).toContain(child.node);

// BETTER: Use helper
verifyBidirectionalLink(parent, child);
```

### 2. Run Consistency Checks After Operations

```typescript
// After attach/detach/reparenting
parent.attachChild(child);

// Always verify
verifyTreeMirror(parent);
expect(validateTreeConsistency(parent)).toEqual([]);
```

### 3. Test Error Cases Don't Corrupt State

```typescript
expect(() => {
  parent2.attachChild(child); // Should throw
}).toThrow();

// Verify state unchanged
verifyBidirectionalLink(parent1, child);
verifyTreeMirror(parent1);
```

### 4. Use Descriptive Test Names

```typescript
// Good
it('should maintain bidirectional consistency after reparenting', () => {});

// Bad
it('should work', () => {});
```

### 5. Add Comments for Complex Scenarios

```typescript
it('should handle reparenting of deep hierarchies', () => {
  // Create: Root -> Mid1 -> Leaf
  const root = new TestWorkflow('Root');
  const mid1 = new TestWorkflow('Mid1', root);
  const leaf = new TestWorkflow('Leaf', mid1);

  // Create: Root2 -> Mid2
  const root2 = new TestWorkflow('Root2');
  const mid2 = new TestWorkflow('Mid2', root2);

  // Reparent: Move Mid1 (and its child Leaf) from Root to Root2
  root.detachChild(mid1);
  root2.attachChild(mid1);

  // Expected structure:
  // - Root2 -> Mid2
  //         -> Mid1 -> Leaf
  // - Root (empty)

  verifyTreeMirror(root2);
  expect(root2.children).toEqual([mid2, mid1]);
  expect(mid1.children).toEqual([leaf]);
});
```

---

**Document Status:** Complete
**Ready for Use:** Yes
**Maintainer:** P1M3T1S4 Research Team
