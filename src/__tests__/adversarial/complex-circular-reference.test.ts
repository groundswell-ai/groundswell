/**
 * Complex Circular Reference Tests
 *
 * These tests validate that isDescendantOf() correctly detects circular
 * references at various depths in the workflow tree.
 *
 * Test Cases:
 * 1. Immediate circular reference (depth 1): child.attachChild(parent)
 * 2. Two-level circular reference (depth 2): grandchild.attachChild(root)
 * 3. Three-level circular reference (depth 3): great-grandchild.attachChild(root)
 *
 * Pattern from: plan/docs/bugfix-architecture/implementation_patterns.md Pattern 8
 * Related: plan/bugfix/P1M3T1S3/PRP.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

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

describe('Adversarial: Complex Circular Reference Detection', () => {
  /**
   * Setup: Mock console methods to capture error messages
   * Pattern from: src/__tests__/adversarial/circular-reference.test.ts:33-37
   */
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  /**
   * Teardown: Restore all mocks to prevent test pollution
   * CRITICAL: Always use vi.restoreAllMocks() in afterEach
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Immediate Circular Reference (depth 1)
   *
   * Validates that attachChild() prevents creating a cycle when a child
   * attempts to attach its immediate parent as its child.
   *
   * Hierarchy: root -> child1
   * Cycle attempt: child1.attachChild(root)
   *
   * Expected: Error thrown with message containing 'circular' OR 'cycle' OR 'ancestor'
   */
  it('should throw when attaching immediate parent as child (depth 1)', () => {
    // ARRANGE: Create 2-level hierarchy (root, child1)
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);

    // Verify initial state
    // CRITICAL: Constructor auto-attaches child to parent at workflow.ts:113-116
    expect(child1.parent).toBe(root);
    expect(root.children).toContain(child1);

    // ACT & ASSERT: Attempting to attach parent as child should throw
    // This validates isDescendantOf() detects the immediate ancestor
    expect(() => child1.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
  });

  /**
   * Test 2: Two-Level Circular Reference (depth 2)
   *
   * Validates that attachChild() prevents creating a cycle when a grandchild
   * attempts to attach its grandparent (root) as its child.
   *
   * Hierarchy: root -> child1 -> child2
   * Cycle attempt: child2.attachChild(root)
   *
   * Expected: Error thrown with message containing 'circular' OR 'cycle' OR 'ancestor'
   */
  it('should throw when attaching grandparent as child (depth 2)', () => {
    // ARRANGE: Create 3-level hierarchy (root, child1, child2)
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', child1);

    // Verify initial state
    // CRITICAL: Constructor auto-attaches at workflow.ts:113-116
    expect(child2.parent).toBe(child1);
    expect(child1.parent).toBe(root);
    expect(root.children).toContain(child1);
    expect(child1.children).toContain(child2);

    // ACT & ASSERT: Attempting to attach root as child of child2 should throw
    // This validates isDescendantOf() traverses the full ancestor chain
    expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
  });

  /**
   * Test 3: Three-Level Circular Reference (depth 3)
   *
   * Validates that attachChild() prevents creating a cycle when a great-grandchild
   * attempts to attach its great-grandparent (root) as its child.
   *
   * Hierarchy: root -> child1 -> child2 -> child3
   * Cycle attempt: child3.attachChild(root)
   *
   * Expected: Error thrown with message containing 'circular' OR 'cycle' OR 'ancestor'
   *
   * This test provides NEW coverage not present in circular-reference.test.ts
   * which only tests depth 1 (immediate parent) and depth 2 (ancestor).
   */
  it('should throw when attaching great-grandparent as child (depth 3)', () => {
    // ARRANGE: Create 4-level hierarchy (root, child1, child2, child3)
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);   // root -> child1
    const child2 = new SimpleWorkflow('Child2', child1); // root -> child1 -> child2
    const child3 = new SimpleWorkflow('Child3', child2); // root -> child1 -> child2 -> child3

    // Verify initial state
    // CRITICAL: Constructor auto-attaches at workflow.ts:113-116
    expect(child3.parent).toBe(child2);
    expect(child2.parent).toBe(child1);
    expect(child1.parent).toBe(root);
    expect(root.children).toContain(child1);
    expect(child1.children).toContain(child2);
    expect(child2.children).toContain(child3);

    // ACT & ASSERT: Attempting to attach root as child of child3 should throw
    // This validates isDescendantOf() detects deep ancestors (3+ levels)
    expect(() => child3.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
  });
});
