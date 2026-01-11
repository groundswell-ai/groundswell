/**
 * Deep Hierarchy Stress Tests
 *
 * These stress tests validate the Workflow class handles deep hierarchies (1000+ levels)
 * without stack overflow or performance issues in getRoot() and isDescendantOf() methods.
 *
 * Pattern 8 from plan/docs/bugfix-architecture/implementation_patterns.md:
 * "Test deep hierarchies (1000+ levels) to ensure no stack overflow in getRoot() or isDescendantOf()"
 *
 * Related: plan/bugfix/P1M3T1S1/PRP.md
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

describe('Deep Hierarchy Stress Tests', () => {
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
   * Pattern from: src/__tests__/adversarial/circular-reference.test.ts:43-45
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Deep Hierarchy Creation (1000+ levels)
   *
   * Validates that a chain of 1000+ nested workflows can be created
   * using loop iteration (not recursion to avoid test-side stack overflow).
   *
   * Pattern from: src/__tests__/adversarial/edge-case.test.ts:264-282
   * Modified to test 1000+ levels instead of 100
   */
  it('should create 1000+ level deep workflow hierarchy', () => {
    const DEPTH = 1000;
    let lastWorkflow: any = null;

    for (let i = 0; i < DEPTH; i++) {
      const name = `Workflow-${i}`;

      // Use constructor with parent parameter for auto-attachment
      // Pattern from: workflow.ts:113-116 (constructor auto-attaches when parent provided)
      lastWorkflow = new SimpleWorkflow(name, lastWorkflow);
    }

    // Verify hierarchy depth by walking parent chain
    let depth = 0;
    let current: any = lastWorkflow;
    while (current.parent) {
      depth++;
      current = current.parent;
    }

    // depth should be DEPTH - 1 because root (first workflow) has no parent
    expect(depth).toBe(DEPTH - 1);
  });

  /**
   * Test 2: getRoot() Stress Test
   *
   * Validates that getRoot() can be called on the deepest child
   * and returns the root workflow without stack overflow.
   *
   * getRoot() implementation at workflow.ts:184-212 uses iterative while loop
   * with Set<Workflow> for cycle detection, so it should handle deep chains.
   *
   * CRITICAL: getRoot() is protected - must cast to 'any' for testing
   */
  it('should call getRoot() on deepest child without stack overflow', () => {
    const DEPTH = 1000;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    // Build deep hierarchy using constructor with parent
    for (let i = 0; i < DEPTH; i++) {
      const child = new SimpleWorkflow(`Child-${i}`, current);
      current = child;
    }

    // getRoot() is protected - cast to any
    const foundRoot = (current as any).getRoot();

    // Verify correct root returned
    expect(foundRoot.id).toBe(root.id);
    expect(foundRoot.node.name).toBe('Root');
  });

  /**
   * Test 3: isDescendantOf() Stress Test
   *
   * Validates that isDescendantOf() can be called on deep chains
   * without stack overflow.
   *
   * isDescendantOf() should use iterative while loop similar to getRoot()
   * with cycle detection to handle deep chains safely.
   *
   * CRITICAL: isDescendantOf() is private - must cast to 'any' for testing
   * CRITICAL: Test both positive and negative cases
   */
  it('should call isDescendantOf() without stack overflow on deep hierarchy', () => {
    const DEPTH = 1000;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    // Build deep hierarchy
    for (let i = 0; i < DEPTH; i++) {
      const child = new SimpleWorkflow(`Child-${i}`, current);
      current = child;
    }

    // isDescendantOf is private - cast to any
    // Test positive case: deepest child IS descendant of root
    const isDescendant = (current as any).isDescendantOf(root);
    expect(isDescendant).toBe(true);

    // Test negative case: root is NOT descendant of deepest child
    const notDescendant = (root as any).isDescendantOf(current);
    expect(notDescendant).toBe(false);
  });

  /**
   * Test 4: Performance Threshold Test
   *
   * Validates that deep tree operations complete within acceptable time.
   * Since getRoot() and isDescendantOf() use iterative algorithms,
   * they should complete in < 100ms even for 1000-level deep chains.
   *
   * This test ensures O(n) iterative performance, not O(n) recursive overhead.
   */
  it('should complete deep tree operations within acceptable time', () => {
    const DEPTH = 1000;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    // Build deep hierarchy
    for (let i = 0; i < DEPTH; i++) {
      current = new SimpleWorkflow(`Child-${i}`, current);
    }

    // Measure getRoot() performance
    const startTime = performance.now();
    const foundRoot = (current as any).getRoot();
    const getRootDuration = performance.now() - startTime;

    expect(foundRoot.id).toBe(root.id);
    expect(getRootDuration).toBeLessThan(100); // Should be very fast (< 100ms)

    // Measure isDescendantOf() performance
    const measureStart = performance.now();
    const isDescendant = (current as any).isDescendantOf(root);
    const checkDuration = performance.now() - measureStart;

    expect(isDescendant).toBe(true);
    expect(checkDuration).toBeLessThan(100); // Should be very fast (< 100ms)

    // Total operations should complete well under 1 second
    const totalStartTime = performance.now();
    for (let i = 0; i < 100; i++) {
      (current as any).getRoot();
      (current as any).isDescendantOf(root);
    }
    const totalDuration = performance.now() - totalStartTime;
    expect(totalDuration).toBeLessThan(1000); // 100 iterations in < 1 second
  });

  /**
   * Test 5: Extreme Deep Hierarchy (2000 levels)
   *
   * Tests an even deeper hierarchy to ensure safety margin.
   * JavaScript V8 call stack is ~10,000-15,000 frames,
   * so testing at 2000 levels provides a 20% safety margin.
   */
  it('should handle 2000 level deep hierarchy without issues', () => {
    const DEPTH = 2000;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    // Build deep hierarchy
    for (let i = 0; i < DEPTH; i++) {
      current = new SimpleWorkflow(`Child-${i}`, current);
    }

    // Both operations should work without stack overflow
    const foundRoot = (current as any).getRoot();
    expect(foundRoot.id).toBe(root.id);

    const isDescendant = (current as any).isDescendantOf(root);
    expect(isDescendant).toBe(true);
  });
});
