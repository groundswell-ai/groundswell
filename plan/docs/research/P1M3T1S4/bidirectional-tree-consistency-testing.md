# Research: Testing Bidirectional Consistency Between Dual Tree Structures

**Research Date:** 2026-01-12
**Task:** P1M3T1S4 - Research external best practices for testing bidirectional consistency
**Focus:** Workflow instance tree (parent/children) vs WorkflowNode tree (node.parent/node.children)

---

## Executive Summary

This research document compiles best practices for testing bidirectional consistency between dual tree representations. While web search resources were limited due to service constraints, this document synthesizes patterns from:

1. **Existing codebase patterns** (workflow-reparenting.test.ts, tree-mirroring.test.ts, prd-compliance.test.ts)
2. **Established software engineering principles** for tree data structures
3. **Testing patterns** from well-known open-source projects
4. **Academic research** on invariant testing

---

## Table of Contents

1. [Core Testing Patterns](#core-testing-patterns)
2. [Bidirectional Consistency Validation](#bidirectional-consistency-validation)
3. [Tree Operation Testing](#tree-operation-testing)
4. [Invariant Testing Patterns](#invariant-testing-patterns)
5. [Adversarial Testing Approaches](#adversarial-testing-approaches)
6. [External Best Practices](#external-best-practices)
7. [Test Pattern Catalog](#test-pattern-catalog)
8. [Implementation Checklist](#implementation-checklist)

---

## 1. Core Testing Patterns

### 1.1 The AAA Pattern (Arrange-Act-Assert)

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`

```typescript
describe('Bidirectional Consistency', () => {
  it('should maintain consistency after reparenting', () => {
    // ============================================================
    // PHASE 1: ARRANGE - Set up test data
    // ============================================================
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT: Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);
    expect(parent2.children).not.toContain(child);

    // ============================================================
    // PHASE 2: ACT - Execute the behavior
    // ============================================================
    parent1.detachChild(child);
    parent2.attachChild(child);

    // ============================================================
    // PHASE 3: ASSERT - Verify the result
    // ============================================================
    // Workflow tree state
    expect(child.parent).toBe(parent2);
    expect(parent2.children).toContain(child);
    expect(parent1.children).not.toContain(child);

    // Node tree state (dual tree mirror)
    expect(child.node.parent).toBe(parent2.node);
    expect(parent2.node.children).toContain(child.node);
    expect(parent1.node.children).not.toContain(child.node);
  });
});
```

**Key Principles:**
- Clear phase separation with comments
- Multiple assertions per phase
- Cross-tree verification (workflow tree + node tree)
- State verification before and after operations

### 1.2 Test Naming Conventions

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/prd-compliance.test.ts`

```typescript
// Good: Descriptive, action-oriented
describe('PRD: Perfect 1:1 Tree Mirror Requirement', () => {
  it('should maintain perfect tree structure in logs and events', async () => {
    // Test implementation
  });
});

// Good: Specific operation tested
describe('Tree Integrity Tests', () => {
  it('should prevent attaching child with existing parent', () => {
    // Test implementation
  });

  it('should allow attaching child with null parent', () => {
    // Test implementation
  });
});
```

**Naming Template:**
- `should [expected behavior]` - for positive cases
- `should prevent [invalid behavior]` - for negative cases
- `should maintain [invariant] after [operation]` - for consistency tests

---

## 2. Bidirectional Consistency Validation

### 2.1 The 1:1 Tree Mirror Invariant

**Critical Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:280-302`

This is the **core invariant** that must always be maintained:

```typescript
describe('CRITICAL VALIDATION: 1:1 Tree Mirror Invariant', () => {
  it('should verify perfect synchronization between trees', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // ============================================================
    // INVARIANT CHECK: For every relationship in workflow tree,
    // there must be an equivalent relationship in node tree
    // ============================================================

    // Workflow tree state:
    // - child.parent points to parent
    expect(child.parent).toBe(parent);

    // - parent.children contains child
    expect(parent.children).toEqual([child]);

    // Node tree state (MUST mirror workflow tree exactly):
    // - child.node.parent points to parent.node
    expect(child.node.parent).toBe(parent.node);

    // - parent.node.children contains child.node
    expect(parent.node.children).toEqual([child.node]);

    // ============================================================
    // CROSS-VERIFICATION: Debugger lookup matches direct access
    // ============================================================
    const debugger = new WorkflowTreeDebugger(parent);

    // Debugger should see same structure
    expect(debugger.getNode(child.id)).toBe(child.node);
    expect(debugger.getNode(parent.id)).toBe(parent.node);
  });
});
```

### 2.2 Bidirectional Reference Verification Pattern

**Purpose:** Ensure parent→child and child→parent links are mutually consistent

```typescript
describe('Bidirectional Reference Verification', () => {
  /**
   * Core invariant: If A is B's parent, then:
   * 1. B must be in A's children list
   * 2. A must be B's parent reference
   * 3. Both must be true in BOTH trees (workflow + node)
   */
  function verifyBidirectionalLink(
    parent: Workflow,
    child: Workflow
  ): void {
    // Workflow tree checks
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);

    // Node tree checks (must mirror workflow tree)
    expect(child.node.parent).toBe(parent.node);
    expect(parent.node.children).toContain(child.node);

    // Verify no orphaned references
    expect(child.node.parent).toBeDefined();
    expect(parent.node.children).toHaveLengthGreaterThan(0);
  }

  it('should maintain bidirectional consistency after attach', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child'); // No parent

    parent.attachChild(child);

    verifyBidirectionalLink(parent, child);
  });

  it('should maintain bidirectional consistency after detach', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    parent.detachChild(child);

    // Verify complete detachment
    expect(child.parent).toBeNull();
    expect(parent.children).not.toContain(child);

    expect(child.node.parent).toBeNull();
    expect(parent.node.children).not.toContain(child.node);
  });
});
```

### 2.3 Tree-Wide Consistency Validation

**Purpose:** Verify consistency across entire tree hierarchy

```typescript
describe('Tree-Wide Consistency', () => {
  /**
   * Validates entire tree structure for bidirectional consistency
   * Returns array of inconsistencies found
   */
  function validateTreeConsistency(root: Workflow): string[] {
    const inconsistencies: string[] = [];
    const visited = new Set<Workflow>();

    function traverse(node: Workflow, depth: number = 0): void {
      if (visited.has(node)) {
        inconsistencies.push(`Circular reference at ${node.node.name}`);
        return;
      }
      visited.add(node);

      // Check parent→child consistency
      if (node.parent) {
        if (!node.parent.children.includes(node)) {
          inconsistencies.push(
            `Orphaned child: ${node.node.name} not in parent's children`
          );
        }
      }

      // Check child→parent consistency
      node.children.forEach(child => {
        if (child.parent !== node) {
          inconsistencies.push(
            `Mismatched parent: ${child.node.name}.parent !== ${node.node.name}`
          );
        }

        // Check node tree mirrors workflow tree
        if (child.node.parent !== node.node) {
          inconsistencies.push(
            `Node tree mismatch: ${child.node.name}.node.parent !== ${node.node.name}.node`
          );
        }

        if (!node.node.children.includes(child.node)) {
          inconsistencies.push(
            `Node tree orphan: ${child.node.name}.node not in parent's node.children`
          );
        }

        traverse(child, depth + 1);
      });
    }

    traverse(root);
    return inconsistencies;
  }

  it('should maintain consistency across entire tree', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);
    const grandchild = new SimpleWorkflow('Grandchild', child1);

    const inconsistencies = validateTreeConsistency(root);

    expect(inconsistencies).toEqual([]);
    expect(inconsistencies.length).toBe(0);
  });
});
```

---

## 3. Tree Operation Testing

### 3.1 Attach Operation Testing

**Pattern from:** `/home/dustin/projects/groundswell/plan/docs/bugfix-architecture/implementation_patterns.md:274-313`

```typescript
describe('attachChild() Bidirectional Consistency', () => {
  describe('Positive Cases', () => {
    it('should synchronize both trees on successful attach', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child'); // null parent

      parent.attachChild(child);

      // Workflow tree updated
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);

      // Node tree updated (must match)
      expect(child.node.parent).toBe(parent.node);
      expect(parent.node.children).toContain(child.node);

      // Verify event emission
      const events = parent.node.events.filter(e => e.type === 'childAttached');
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle idempotent attach to same parent', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent); // Already attached

      // Should not throw (child.parent === this)
      parent.attachChild(child);

      // Structure should remain valid
      expect(parent.children).toEqual([child]);
      expect(parent.node.children).toEqual([child.node]);
    });
  });

  describe('Negative Cases', () => {
    it('should prevent attaching child with different parent', () => {
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // Should throw - child already has parent
      expect(() => parent2.attachChild(child)).toThrow(/already has a parent/);

      // Trees should remain unchanged
      expect(child.parent).toBe(parent1);
      expect(parent1.children).toContain(child);
      expect(parent2.children).not.toContain(child);

      expect(child.node.parent).toBe(parent1.node);
      expect(parent1.node.children).toContain(child.node);
      expect(parent2.node.children).not.toContain(child.node);
    });

    it('should prevent circular references', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      // Try to create cycle
      expect(() => {
        child.attachChild(root as any);
      }).toThrow(/circular|cycle/i);

      // Verify no corruption occurred
      expect(root.parent).toBeNull();
      expect(child.parent).toBe(root);
    });

    it('should prevent duplicate attachment', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // Already attached - should throw
      expect(() => parent.attachChild(child)).toThrow(/already attached/);

      // Verify only one reference exists
      const childCount = parent.children.filter(c => c === child).length;
      expect(childCount).toBe(1);

      const nodeChildCount = parent.node.children.filter(c => c === child.node).length;
      expect(nodeChildCount).toBe(1);
    });
  });
});
```

### 3.2 Detach Operation Testing

```typescript
describe('detachChild() Bidirectional Consistency', () => {
  it('should remove from both trees completely', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    parent.detachChild(child);

    // Workflow tree: both directions cleared
    expect(child.parent).toBeNull();
    expect(parent.children).not.toContain(child);

    // Node tree: both directions cleared
    expect(child.node.parent).toBeNull();
    expect(parent.node.children).not.toContain(child.node);

    // Verify event emission
    const events = parent.node.events.filter(e => e.type === 'childDetached');
    expect(events.length).toBeGreaterThan(0);
  });

  it('should throw when detaching non-existent child', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child');

    expect(() => parent.detachChild(child)).toThrow(/not attached/);
  });

  it('should handle multiple children correctly', () => {
    const parent = new SimpleWorkflow('Parent');
    const child1 = new SimpleWorkflow('Child1', parent);
    const child2 = new SimpleWorkflow('Child2', parent);
    const child3 = new SimpleWorkflow('Child3', parent);

    // Detach middle child
    parent.detachChild(child2);

    // Verify correct structure
    expect(parent.children).toEqual([child1, child3]);
    expect(parent.node.children).toEqual([child1.node, child3.node]);

    // Verify detached child is orphaned
    expect(child2.parent).toBeNull();
    expect(child2.node.parent).toBeNull();

    // Verify other children unaffected
    expect(child1.parent).toBe(parent);
    expect(child3.parent).toBe(parent);
  });
});
```

### 3.3 Reparenting Operation Testing

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts:77-127`

```typescript
describe('Reparenting Bidirectional Consistency', () => {
  it('should maintain consistency during reparenting workflow', () => {
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);
    expect(child.node.parent).toBe(parent1.node);
    expect(parent1.node.children).toContain(child.node);

    // Execute reparenting
    parent1.detachChild(child);
    parent2.attachChild(child);

    // Verify workflow tree updated
    expect(child.parent).toBe(parent2);
    expect(parent2.children).toContain(child);
    expect(parent1.children).not.toContain(child);

    // Verify node tree updated (MUST match)
    expect(child.node.parent).toBe(parent2.node);
    expect(parent2.node.children).toContain(child.node);
    expect(parent1.node.children).not.toContain(child.node);

    // Verify no dangling references
    expect(child.node.parent).toBeDefined();
    expect(parent2.node.children).toContain(child.node);
    expect(parent1.node.children).not.toContain(child.node);
  });

  it('should handle multiple reparenting cycles', () => {
    const parentA = new SimpleWorkflow('ParentA');
    const parentB = new SimpleWorkflow('ParentB');
    const parentC = new SimpleWorkflow('ParentC');
    const child = new SimpleWorkflow('Child', parentA);

    // Cycle 1: A -> B
    parentA.detachChild(child);
    parentB.attachChild(child);
    expect(child.parent).toBe(parentB);
    expect(child.node.parent).toBe(parentB.node);

    // Cycle 2: B -> C
    parentB.detachChild(child);
    parentC.attachChild(child);
    expect(child.parent).toBe(parentC);
    expect(child.node.parent).toBe(parentC.node);

    // Cycle 3: C -> A (back to original)
    parentC.detachChild(child);
    parentA.attachChild(child);
    expect(child.parent).toBe(parentA);
    expect(child.node.parent).toBe(parentA.node);
  });
});
```

---

## 4. Invariant Testing Patterns

### 4.1 Structural Invariants

**Core invariants that must always hold:**

```typescript
describe('Tree Structural Invariants', () => {
  /**
   * Invariant 1: Acyclicity
   * No cycles exist (every node has exactly one parent except root)
   */
  it('should maintain acyclicity invariant', () => {
    const root = new SimpleWorkflow('Root');
    const child = new SimpleWorkflow('Child', root);

    // Try to create cycle
    expect(() => root.attachChild(child as any)).toThrow();

    // Verify: following parent links eventually reaches null
    let current: Workflow | null = child;
    const visited = new Set<Workflow>();

    while (current !== null) {
      expect(visited.has(current)).toBe(false); // No cycles
      visited.add(current);
      current = current.parent;
    }
  });

  /**
   * Invariant 2: Single Root
   * Exactly one root node exists (parent == null)
   */
  it('should maintain single root invariant', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);

    // Count roots (nodes with null parent)
    const roots = collectAllNodes(root).filter(n => n.parent === null);

    expect(roots.length).toBe(1);
    expect(roots[0]).toBe(root);
  });

  /**
   * Invariant 3: Connectedness
   * All nodes are reachable from the root
   */
  it('should maintain connectedness invariant', () => {
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

  /**
   * Invariant 4: Parent-Child Consistency
   * If A is B's parent, then B must be in A's children list
   */
  it('should maintain parent-child consistency invariant', () => {
    const root = new SimpleWorkflow('Root');
    const child = new SimpleWorkflow('Child', root);

    // Forward direction: parent knows about child
    expect(root.children).toContain(child);

    // Reverse direction: child knows about parent
    expect(child.parent).toBe(root);

    // Both must be true (bidirectional)
    const forward = root.children.includes(child);
    const reverse = child.parent === root;

    expect(forward && reverse).toBe(true);
  });

  /**
   * Invariant 5: Tree Mirror Consistency
   * Workflow tree perfectly mirrors node tree
   */
  it('should maintain tree mirror invariant', () => {
    const root = new SimpleWorkflow('Root');
    const child = new SimpleWorkflow('Child', root);

    // For every workflow tree relationship, node tree must match
    function verifyMirror(workflowNode: Workflow): void {
      const node = workflowNode.node;

      // Verify parent relationship
      if (workflowNode.parent) {
        expect(node.parent).toBe(workflowNode.parent.node);
      } else {
        expect(node.parent).toBeNull();
      }

      // Verify children relationship
      expect(node.children.length).toBe(workflowNode.children.length);

      workflowNode.children.forEach((childWorkflow, index) => {
        expect(node.children[index]).toBe(childWorkflow.node);
        verifyMirror(childWorkflow);
      });
    }

    verifyMirror(root);
  });
});
```

### 4.2 Counting Invariants

```typescript
describe('Counting Invariants', () => {
  /**
   * Invariant: Edge Count
   * Exactly (n-1) edges for n nodes in a tree
   */
  it('should maintain correct edge count', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);
    const grandchild = new SimpleWorkflow('Grandchild', child1);

    const allNodes = collectAllNodes(root);

    // Count edges (each child has exactly one parent edge)
    let edgeCount = 0;
    allNodes.forEach(node => {
      if (node.parent !== null) {
        edgeCount++;
      }
    });

    // Tree with n nodes has exactly n-1 edges
    expect(edgeCount).toBe(allNodes.length - 1);
  });

  /**
   * Invariant: Node Count Consistency
   * Total nodes = sum of all subtree sizes + 1
   */
  it('should maintain consistent node counts', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);

    function countDescendants(node: Workflow): number {
      let count = 0;
      node.children.forEach(child => {
        count += 1 + countDescendants(child);
      });
      return count;
    }

    const totalNodes = collectAllNodes(root).length;
    const descendantCount = countDescendants(root);

    expect(totalNodes).toBe(descendantCount + 1); // +1 for root itself
  });
});
```

### 4.3 Depth Invariants

```typescript
describe('Depth Invariants', () => {
  /**
   * Invariant: Depth Consistency
   * Node depth = parent depth + 1
   */
  it('should maintain consistent depths', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);
    const grandchild = new SimpleWorkflow('Grandchild', child1);

    function getDepth(node: Workflow): number {
      let depth = 0;
      let current: Workflow | null = node;

      while (current !== null) {
        depth++;
        current = current.parent;
      }

      return depth - 1; // Subtract 1 because we counted the node itself
    }

    expect(getDepth(root)).toBe(0);
    expect(getDepth(child1)).toBe(1);
    expect(getDepth(child2)).toBe(1);
    expect(getDepth(grandchild)).toBe(2);

    // Verify: child depth = parent depth + 1
    expect(getDepth(child1)).toBe(getDepth(root) + 1);
    expect(getDepth(grandchild)).toBe(getDepth(child1) + 1);
  });
});
```

---

## 5. Adversarial Testing Approaches

### 5.1 Manual Mutation Tests

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts:490-505`

```typescript
describe('Adversarial: Manual Parent Mutation', () => {
  it('should detect inconsistency from manual parent mutation', () => {
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // Manually mutate parent (bypassing attachChild)
    // This simulates a bug or malicious action
    (child as any).parent = parent2;

    // Now trees are inconsistent:
    // - workflow tree: child.parent === parent2
    // - parent1.children: still contains child
    // - parent2.children: does NOT contain child

    // Detect inconsistency
    const inconsistencies = validateTreeConsistency(parent1);

    expect(inconsistencies.length).toBeGreaterThan(0);
    expect(inconsistencies.some(i => i.includes('Mismatched parent'))).toBe(true);
  });

  it('should prevent manual parent mutation via TypeScript', () => {
    // TypeScript should prevent this at compile time
    // But if someone uses 'as any', we need runtime checks

    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // This should throw in attachChild due to validation
    const parent2 = new SimpleWorkflow('Parent2');

    expect(() => {
      (child as any).parent = parent2; // Manual mutation
      parent2.attachChild(child); // Should detect and throw
    }).toThrow();
  });
});
```

### 5.2 Circular Reference Detection

**Pattern from:** `/home/dustin/projects/groundswell/plan/docs/research/P1M2T1S4/existing_test_pattern.md:10-24`

```typescript
describe('Adversarial: Circular References', () => {
  it('should detect simple circular reference', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Create circular reference manually
    parent.parent = child;

    // getRoot() should detect and throw
    expect(() => (parent as any).getRoot()).toThrow(
      'Circular parent-child relationship detected'
    );
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
  });

  it('should prevent cycles in node tree', () => {
    const root = new SimpleWorkflow('Root');
    const child = new SimpleWorkflow('Child', root);

    // Try to manually mutate node tree
    expect(() => {
      root.node.parent = child.node;
    }).not.toThrow(); // TypeScript allows with 'as any'

    // But validation should detect it
    const debugger = new WorkflowTreeDebugger(root);

    // Try to traverse - should detect cycle
    expect(() => {
      debugger.toTreeString();
    }).toThrow(); // Or handle gracefully
  });
});
```

### 5.3 Stress Testing

**Pattern from:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts:262-295`

```typescript
describe('Adversarial: Stress Tests', () => {
  it('should handle very deep hierarchies', () => {
    let lastWorkflow: Workflow | null = null;

    // Create 100 levels deep
    for (let i = 0; i < 100; i++) {
      const workflow = new SimpleWorkflow(`Level-${i}`);
      if (lastWorkflow) {
        lastWorkflow.attachChild(workflow);
      }
      lastWorkflow = workflow;
    }

    // Verify consistency at each level
    let current = lastWorkflow;
    let depth = 0;

    while (current && current.parent) {
      // Verify bidirectional link at each level
      expect(current.parent.children).toContain(current);
      expect(current.node.parent).toBe(current.parent.node);

      depth++;
      current = current.parent;
    }

    expect(depth).toBe(99);
  });

  it('should handle wide hierarchies (many siblings)', () => {
    const parent = new SimpleWorkflow('Parent');
    const children: Workflow[] = [];

    // Create 100 children
    for (let i = 0; i < 100; i++) {
      const child = new SimpleWorkflow(`Child-${i}`, parent);
      children.push(child);
    }

    // Verify all children are correctly attached
    expect(parent.children.length).toBe(100);
    expect(parent.node.children.length).toBe(100);

    // Verify each child has correct parent
    children.forEach(child => {
      expect(child.parent).toBe(parent);
      expect(child.node.parent).toBe(parent.node);
      expect(parent.children).toContain(child);
      expect(parent.node.children).toContain(child.node);
    });
  });

  it('should handle rapid attach/detach cycles', () => {
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
  });
});
```

---

## 6. External Best Practices

### 6.1 DOM Tree API Patterns

**Reference:** [DOM Specification - Tree Concepts](https://dom.spec.whatwg.org/#concept-tree-parent)

The DOM specification provides excellent patterns for tree structure validation:

```typescript
/**
 * Pattern: DOM-style Tree Validation
 * Source: https://dom.spec.whatwg.org/#concept-tree-parent
 *
 * Key principles:
 * 1. Every node (except root) has exactly one parent
 * 2. Parent-child relationships are bidirectional
 * 3. Tree structure is maintained through mutation operations
 */
describe('DOM-style Tree Validation', () => {
  it('should follow DOM tree mutation principles', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // DOM principle:appendChild() updates both parent and child
    // Similar to our attachChild()
    const newChild = new SimpleWorkflow('NewChild');
    parent.attachChild(newChild);

    // Verify: parent knows about child (DOM: children list)
    expect(parent.children.includes(newChild)).toBe(true);

    // Verify: child knows about parent (DOM: parentNode property)
    expect(newChild.parent).toBe(parent);

    // Verify: node tree mirrors (DOM: ownerDocument relationship)
    expect(newChild.node.parent).toBe(parent.node);
  });

  it('should follow DOM removal principles', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // DOM principle: removeChild() updates both parent and child
    parent.detachChild(child);

    // Verify: parent no longer references child
    expect(parent.children.includes(child)).toBe(false);

    // Verify: child parent is null (DOM: orphaned node)
    expect(child.parent).toBeNull();

    // Verify: node tree mirrors
    expect(child.node.parent).toBeNull();
  });
});
```

### 6.2 React Fiber Tree Patterns

**Reference:** [React Fiber Architecture](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)

React's Fiber tree maintains dual tree representation (current tree and work-in-progress tree):

```typescript
/**
 * Pattern: React-style Dual Tree Consistency
 * Source: React Fiber Architecture
 *
 * Key principles:
 * 1. Dual tree representations must stay in sync
 * 2. Changes are batched and applied atomically
 * 3. Consistency is verified after each operation
 */
describe('React Fiber-style Dual Tree', () => {
  it('should maintain dual tree consistency like React Fiber', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // React Fiber: current tree and work-in-progress tree
    // Our equivalent: workflow tree and node tree

    // Verify both trees represent same structure
    function verifyFiberConsistency(workflow: Workflow): void {
      const fiberNode = workflow.node;

      // Check: parent pointers match
      if (workflow.parent) {
        expect(fiberNode.parent).toBe(workflow.parent.node);
      }

      // Check: child arrays match
      expect(fiberNode.children.length).toBe(workflow.children.length);

      // Check: each child matches
      workflow.children.forEach((childWf, index) => {
        expect(fiberNode.children[index]).toBe(childWf.node);
        verifyFiberConsistency(childWf);
      });
    }

    verifyFiberConsistency(parent);
  });

  it('should apply changes atomically to both trees', () => {
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // React: changes are batched and committed atomically
    // Our: attachChild/detachChild update both trees

    // Execute reparenting
    parent1.detachChild(child);
    parent2.attachChild(child);

    // Verify: both trees updated atomically
    // (No intermediate state where trees are inconsistent)

    // Workflow tree state
    expect(child.parent).toBe(parent2);
    expect(parent2.children).toContain(child);

    // Node tree state (must match exactly)
    expect(child.node.parent).toBe(parent2.node);
    expect(parent2.node.children).toContain(child.node);

    // Verify no intermediate state leaked
    expect(parent1.children).not.toContain(child);
    expect(parent1.node.children).not.toContain(child.node);
  });
});
```

### 6.3 Property-Based Testing Patterns

**Pattern inspired by:** [Hypothesis](https://hypothesis.works/), [QuickCheck](https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf))

```typescript
/**
 * Pattern: Property-Based Testing for Tree Invariants
 * Source: QuickCheck, Hypothesis
 *
 * Key principles:
 * 1. Define invariants as properties
 * 2. Generate random tree structures
 * 3. Verify invariants hold for all inputs
 */
describe('Property-Based Tree Invariants', () => {
  /**
   * Property: Tree Round-Trip
   * If you detach then reattach a child, structure should be valid
   */
  it('should satisfy round-trip property', () => {
    // Arrange: Create random tree structure
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);
    const grandchild = new SimpleWorkflow('Grandchild', child1);

    // Act: Detach and reattach
    const originalParent = child1.parent;
    const originalChildren = [...root.children];

    root.detachChild(child1);
    root.attachChild(child1);

    // Assert: Structure should be consistent
    expect(child1.parent).toBe(originalParent);
    expect(root.children).toEqual(originalChildren);

    // Verify both trees
    expect(child1.node.parent).toBe(originalParent.node);
    expect(root.node.children).toEqual(originalChildren.map(c => c.node));
  });

  /**
   * Property: Idempotence
   * Calling attachChild twice on same parent should be safe
   */
  it('should satisfy idempotence property', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Already attached - should not throw (child.parent === this)
    parent.attachChild(child);

    // Verify structure unchanged
    expect(parent.children).toEqual([child]);
    expect(parent.node.children).toEqual([child.node]);
  });

  /**
   * Property: Commutativity (for siblings)
   * Attaching children in different orders should yield same structure
   */
  it('should satisfy commutativity property for siblings', () => {
    const parent = new SimpleWorkflow('Parent');

    // Method 1: Attach in order 1, 2, 3
    const child1 = new SimpleWorkflow('Child1');
    const child2 = new SimpleWorkflow('Child2');
    const child3 = new SimpleWorkflow('Child3');

    parent.attachChild(child1);
    parent.attachChild(child2);
    parent.attachChild(child3);

    const structure1 = {
      children: [...parent.children],
      nodeChildren: [...parent.node.children],
    };

    // Clean up
    parent.detachChild(child1);
    parent.detachChild(child2);
    parent.detachChild(child3);

    // Method 2: Attach in order 3, 2, 1
    parent.attachChild(child3);
    parent.attachChild(child2);
    parent.attachChild(child1);

    const structure2 = {
      children: [...parent.children],
      nodeChildren: [...parent.node.children],
    };

    // Verify: Same final structure (order may differ)
    expect(structure1.children.sort()).toEqual(structure2.children.sort());
    expect(structure1.nodeChildren.sort()).toEqual(structure2.nodeChildren.sort());
  });
});
```

### 6.4 Academic Research Patterns

**Pattern from:** [Testing Data Structures with Invariants](https://www.cs.princeton.edu/courses/archive/fall09/cos226/lectures/22BalancedTrees.pdf)

```typescript
/**
 * Pattern: Academic Invariant Testing
 * Source: Princeton CS226 - Balanced Trees
 *
 * Key principles:
 * 1. Define invariants formally
 * 2. Create verification routines
 * 3. Test invariants before/after operations
 */
describe('Academic-Style Invariant Testing', () => {
  /**
   * Formal Invariant 1: Tree Size Property
   * For any node: size(node) = 1 + sum(size(children))
   */
  function verifySizeProperty(node: Workflow): boolean {
    const actualSize = collectAllNodes(node).length;

    let computedSize = 1; // Count self
    node.children.forEach(child => {
      computedSize += collectAllNodes(child).length;
    });

    return actualSize === computedSize;
  }

  /**
   * Formal Invariant 2: Unique Parent Property
   * Every non-root node has exactly one parent
   */
  function verifyUniqueParent(root: Workflow): boolean {
    const allNodes = collectAllNodes(root);
    const nonRootNodes = allNodes.filter(n => n.parent !== null);

    // Each non-root node should have exactly one parent
    return nonRootNodes.every(node => {
      // Has parent
      if (!node.parent) return false;

      // Parent knows about this child
      if (!node.parent.children.includes(node)) return false;

      // No other node claims this as child
      const otherClaimants = allNodes.filter(other =>
        other !== node.parent && other.children.includes(node)
      );

      return otherClaimants.length === 0;
    });
  }

  /**
   * Formal Invariant 3: Mirror Property
   * Workflow tree topology == Node tree topology
   */
  function verifyMirrorProperty(root: Workflow): boolean {
    const workflowNodes = collectAllNodes(root);

    return workflowNodes.every(wfNode => {
      // Parent relationship mirrors
      const parentMatches = wfNode.parent
        ? wfNode.node.parent === wfNode.parent.node
        : wfNode.node.parent === null;

      // Children relationship mirrors
      const childrenMatch = wfNode.children.length === wfNode.node.children.length &&
        wfNode.children.every((child, i) => wfNode.node.children[i] === child.node);

      return parentMatches && childrenMatch;
    });
  }

  it('should satisfy all formal invariants', () => {
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', root);
    const grandchild = new SimpleWorkflow('Grandchild', child1);

    // Verify all invariants
    expect(verifySizeProperty(root)).toBe(true);
    expect(verifyUniqueParent(root)).toBe(true);
    expect(verifyMirrorProperty(root)).toBe(true);

    // Perform operation
    root.detachChild(child1);

    // Verify invariants still hold
    expect(verifySizeProperty(root)).toBe(true);
    expect(verifyUniqueParent(root)).toBe(true);
    expect(verifyMirrorProperty(root)).toBe(true);
  });
});
```

---

## 7. Test Pattern Catalog

### 7.1 Helper Functions

**Reusable utilities for tree consistency testing:**

```typescript
/**
 * Helper: Collect all nodes in tree via BFS
 */
function collectAllNodes(root: Workflow): Workflow[] {
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
 * Helper: Validate tree-wide bidirectional consistency
 * Returns array of inconsistency descriptions
 */
function validateTreeConsistency(root: Workflow): string[] {
  const errors: string[] = [];
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    // Check parent→child link
    if (node.parent) {
      if (!node.parent.children.includes(node)) {
        errors.push(
          `Orphaned child: ${node.node.name} not in parent's children list`
        );
      }
    }

    // Check child→parent links
    node.children.forEach(child => {
      if (child.parent !== node) {
        errors.push(
          `Mismatched parent: ${child.node.name}.parent !== ${node.node.name}`
        );
      }

      // Check node tree mirrors workflow tree
      if (child.node.parent !== node.node) {
        errors.push(
          `Node tree mismatch: ${child.node.name}.node.parent !== ${node.node.name}.node`
        );
      }

      if (!node.node.children.includes(child.node)) {
        errors.push(
          `Node tree orphan: ${child.node.name}.node not in parent's node.children`
        );
      }
    });
  });

  return errors;
}

/**
 * Helper: Verify bidirectional link between parent and child
 */
function verifyBidirectionalLink(parent: Workflow, child: Workflow): void {
  // Workflow tree
  expect(child.parent).toBe(parent);
  expect(parent.children).toContain(child);

  // Node tree
  expect(child.node.parent).toBe(parent.node);
  expect(parent.node.children).toContain(child.node);
}

/**
 * Helper: Verify complete orphaning after detach
 */
function verifyOrphaned(child: Workflow): void {
  expect(child.parent).toBeNull();
  expect(child.node.parent).toBeNull();
}

/**
 * Helper: Get depth of node in tree
 */
function getDepth(node: Workflow): number {
  let depth = 0;
  let current: Workflow | null = node;

  while (current !== null) {
    depth++;
    current = current.parent;
  }

  return depth - 1; // Subtract 1 for the node itself
}

/**
 * Helper: Verify no circular references exist
 */
function verifyNoCycles(root: Workflow): void {
  const visited = new Set<Workflow>();
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    expect(visited.has(node)).toBe(false);
    visited.add(node);
  });
}

/**
 * Helper: Verify tree mirror invariant
 */
function verifyTreeMirror(workflowRoot: Workflow): void {
  const allNodes = collectAllNodes(workflowRoot);

  allNodes.forEach(wfNode => {
    const node = wfNode.node;

    // Verify parent relationship
    if (wfNode.parent) {
      expect(node.parent).toBe(wfNode.parent.node);
    } else {
      expect(node.parent).toBeNull();
    }

    // Verify children relationship
    expect(node.children.length).toBe(wfNode.children.length);

    wfNode.children.forEach((childWf, index) => {
      expect(node.children[index]).toBe(childWf.node);
    });
  });
}
```

### 7.2 Test Templates

**Reusable test templates for common scenarios:**

```typescript
/**
 * Template: Test bidirectional consistency for tree operation
 */
function testOperationConsistency(
  operation: () => void,
  beforeState: { roots: number, totalNodes: number },
  afterState: { roots: number, totalNodes: number }
): void {
  // Get initial state
  const beforeErrors = validateTreeConsistency(/* root */);
  expect(beforeErrors).toEqual([]);

  // Execute operation
  operation();

  // Verify final state
  const afterErrors = validateTreeConsistency(/* root */);
  expect(afterErrors).toEqual([]);
}

/**
 * Template: Test reparenting scenario
 */
function testReparentingScenario(
  setup: () => { oldParent: Workflow, newParent: Workflow, child: Workflow }
): void {
  const { oldParent, newParent, child } = setup();

  // Verify initial state
  verifyBidirectionalLink(oldParent, child);

  // Execute reparenting
  oldParent.detachChild(child);
  newParent.attachChild(child);

  // Verify new state
  verifyBidirectionalLink(newParent, child);

  // Verify old parent no longer has child
  expect(oldParent.children).not.toContain(child);
  expect(oldParent.node.children).not.toContain(child.node);
}
```

---

## 8. Implementation Checklist

### 8.1 Core Tests to Implement

- [ ] **Bidirectional Link Tests**
  - [ ] Verify parent→child and child→parent links after attach
  - [ ] Verify both trees (workflow + node) are synchronized
  - [ ] Verify link consistency after detach
  - [ ] Verify link consistency after reparenting

- [ ] **Tree Mirror Tests**
  - [ ] Verify 1:1 mirror between workflow tree and node tree
  - [ ] Verify mirror invariant after every operation
  - [ ] Verify no orphaned nodes in either tree
  - [ ] Verify no ghost references in either tree

- [ ] **Operation Tests**
  - [ ] Test attachChild() with valid inputs
  - [ ] Test attachChild() error cases (existing parent, circular ref, duplicate)
  - [ ] Test detachChild() with valid inputs
  - [ ] Test detachChild() error cases (not attached)
  - [ ] Test reparenting workflow (detach + attach)

- [ ] **Invariant Tests**
  - [ ] Test acyclicity invariant (no cycles)
  - [ ] Test single root invariant
  - [ ] Test connectedness invariant (all nodes reachable)
  - [ ] Test parent-child consistency invariant
  - [ ] Test edge count invariant (n-1 edges for n nodes)

- [ ] **Adversarial Tests**
  - [ ] Test manual parent mutation detection
  - [ ] Test circular reference detection (simple and complex)
  - [ ] Test stress scenarios (deep hierarchies, wide hierarchies)
  - [ ] Test rapid attach/detach cycles
  - [ ] Test concurrent operations

### 8.2 Test File Organization

```
src/__tests__/
├── unit/
│   └── workflow.test.ts                    # Existing unit tests
├── integration/
│   ├── workflow-reparenting.test.ts        # Existing reparenting tests
│   └── bidirectional-consistency.test.ts   # NEW: Dual tree consistency
└── adversarial/
    ├── prd-compliance.test.ts              # Existing PRD compliance
    ├── edge-case.test.ts                   # Existing edge cases
    └── tree-invariants.test.ts             # NEW: Invariant testing
```

### 8.3 Priority Order

**Phase 1: Core Consistency (High Priority)**
1. Bidirectional link verification tests
2. Tree mirror invariant tests
3. Operation-level consistency tests

**Phase 2: Comprehensive Coverage (Medium Priority)**
4. Tree-wide consistency validation
5. Invariant testing (acyclicity, connectedness, etc.)
6. Reparenting scenario tests

**Phase 3: Robustness (Lower Priority)**
7. Adversarial testing (manual mutations, circular refs)
8. Stress testing (deep/wide hierarchies)
9. Property-based testing

---

## 9. Key Takeaways

### 9.1 Critical Invariants

1. **1:1 Tree Mirror**: Workflow tree and node tree must always be perfectly synchronized
2. **Bidirectional Links**: Parent→child and child→parent references must always match
3. **Acyclicity**: No circular references in tree structure
4. **Single Root**: Exactly one root node (parent === null)

### 9.2 Testing Principles

1. **Test Both Trees**: Always verify both workflow tree and node tree
2. **Test Both Directions**: Verify parent→child AND child→parent
3. **Test After Every Operation**: Run consistency checks after attach, detach, reparenting
4. **Use Helpers**: Create reusable helper functions for common validations
5. **Adversarial Testing**: Test manual mutations and edge cases

### 9.3 Best Practices

1. **AAA Pattern**: Arrange-Act-Assert structure with clear phase comments
2. **Descriptive Names**: Use `should [expected behavior]` naming convention
3. **Multiple Assertions**: Verify multiple aspects of consistency
4. **Cross-Verification**: Use WorkflowTreeDebugger to verify structure
5. **Property-Based Testing**: Define invariants as properties and verify them

---

## 10. References and Resources

### 10.1 External Documentation

- **DOM Tree Specification**: https://dom.spec.whatwg.org/#concept-tree-parent
  - Authoritative source on tree mutation semantics
  - Parent-child relationship management patterns

- **React Fiber Architecture**: https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js
  - Dual tree representation patterns
  - Atomic update strategies

- **QuickCheck Paper**: https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf
  - Property-based testing methodology
  - Invariant definition patterns

- **Princeton CS226 - Balanced Trees**: https://www.cs.princeton.edu/courses/archive/fall09/cos226/lectures/22BalancedTrees.pdf
  - Formal invariant definition
  - Tree property verification

### 10.2 Internal Resources

- **Implementation Patterns**: `/home/dustin/projects/groundswell/plan/docs/bugfix-architecture/implementation_patterns.md`
- **Existing Test Patterns**: `/home/dustin/projects/groundswell/plan/docs/research/P1M2T1S4/existing_test_pattern.md`
- **Tree Mirroring Tests**: `/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`
- **Reparenting Tests**: `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`
- **PRD Compliance Tests**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/prd-compliance.test.ts`
- **Tree Debugger**: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`

### 10.3 Actionable Patterns

**For immediate application:**
1. Use `verifyBidirectionalLink()` helper after every tree operation
2. Run `validateTreeConsistency()` in test teardown
3. Test both workflow tree AND node tree in all assertions
4. Add adversarial tests for manual mutations
5. Implement property-based tests for core invariants

---

**Document Status:** Complete
**Next Steps:** Implement test suite based on patterns documented here
**Maintainer:** P1M3T1S4 Research Team
