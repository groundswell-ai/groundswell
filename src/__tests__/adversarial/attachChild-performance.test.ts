/**
 * Performance Test: attachChild() with isDescendantOf() validation
 *
 * Validates that the isDescendantOf() method (added in P1.M1.T2.S2)
 * does not cause significant performance degradation in attachChild()
 * operations across various tree sizes and configurations.
 *
 * Performance Thresholds (from deep-hierarchy-stress.test.ts):
 * - Single operation: < 100ms
 * - Bulk operations (100 iterations): < 1000ms
 * - isDescendantOf() complexity: O(d) where d = tree depth
 *
 * Related: plan/bugfix/P1M4T2S2/PRP.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';
import { validateTreeConsistency, verifyBidirectionalLink } from '../helpers/tree-verification.js';

/**
 * SimpleWorkflow class for performance testing
 * Pattern from: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:20-26
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('attachChild Performance Regression Tests', () => {
  /**
   * Setup: Mock console methods to capture error messages
   * Pattern from: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:33-37
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
   * Test 1: Shallow tree performance (depth 10)
   *
   * Validates that attachChild() performs very fast on shallow trees
   * where isDescendantOf() only needs to traverse a short parent chain.
   *
   * Threshold: < 10ms (should be very fast for shallow trees)
   */
  it('should attach child in shallow tree within acceptable time', () => {
    // ARRANGE: Create shallow tree (depth 10)
    const DEPTH = 10;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    for (let i = 0; i < DEPTH; i++) {
      current = new SimpleWorkflow(`Level-${i}`, current);
    }

    // ACT: Measure attachChild() time for new child at depth 10
    const startTime = performance.now();
    const newChild = new SimpleWorkflow('NewChild', current);
    const attachDuration = performance.now() - startTime;

    // ASSERT: Verify functional correctness
    expect(newChild.parent).toBe(current);
    expect(current.children).toContain(newChild);
    verifyBidirectionalLink(current, newChild);

    // ASSERT: Verify performance threshold (< 10ms for shallow tree)
    expect(attachDuration).toBeLessThan(10);
  });

  /**
   * Test 2: Deep tree performance (depth 100)
   *
   * Validates that attachChild() scales linearly with tree depth.
   * isDescendantOf() must traverse 100 parent references, which should
   * complete in < 50ms given the O(d) iterative implementation.
   *
   * Threshold: < 50ms (linear scaling with depth)
   */
  it('should attach child in deep tree (depth 100) within acceptable time', () => {
    // ARRANGE: Create deep tree
    const DEPTH = 100;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    for (let i = 0; i < DEPTH; i++) {
      current = new SimpleWorkflow(`Child-${i}`, current);
    }

    // ACT: Measure attachChild() at deepest level
    const startTime = performance.now();
    const newChild = new SimpleWorkflow('NewChild', current);
    const attachDuration = performance.now() - startTime;

    // ASSERT: Functional correctness
    verifyBidirectionalLink(current, newChild);

    // ASSERT: Performance threshold (< 50ms for depth 100)
    expect(attachDuration).toBeLessThan(50);

    // ASSERT: Validate overall tree consistency
    const errors = validateTreeConsistency(root);
    expect(errors).toHaveLength(0);
  });

  /**
   * Test 3: Extreme deep tree (depth 1000)
   *
   * Validates that attachChild() handles extreme depth without stack overflow
   * and completes within acceptable time. This tests the O(d) complexity
   * at the upper bound of typical workflow tree depths.
   *
   * Threshold: < 100ms (from deep-hierarchy-stress.test.ts:169)
   */
  it('should attach child in extreme deep tree (depth 1000) without stack overflow', () => {
    const DEPTH = 1000;
    const root = new SimpleWorkflow('Root');
    let current: any = root;

    for (let i = 0; i < DEPTH; i++) {
      current = new SimpleWorkflow(`Child-${i}`, current);
    }

    // ACT: Measure attachChild() at depth 1000
    const startTime = performance.now();
    const newChild = new SimpleWorkflow('NewChild', current);
    const attachDuration = performance.now() - startTime;

    // ASSERT: Functional correctness
    verifyBidirectionalLink(current, newChild);

    // ASSERT: Performance threshold (< 100ms from deep-hierarchy-stress.test.ts:169)
    expect(attachDuration).toBeLessThan(100);

    // ASSERT: Validate tree consistency at extreme depth
    const errors = validateTreeConsistency(root);
    expect(errors).toHaveLength(0);
  });

  /**
   * Test 4: Wide tree performance (100 children)
   *
   * Validates that attachChild() performs efficiently when attaching
   * multiple children to a single parent. Each attachment only requires
   * checking immediate parent chain, so performance should be excellent.
   *
   * Threshold: < 100ms total, < 1ms average per attachment
   */
  it('should attach 100 children to single parent efficiently', () => {
    // ARRANGE: Create parent
    const parent = new SimpleWorkflow('Parent');
    const NUM_CHILDREN = 100;

    // ACT: Measure time to attach all children
    const startTime = performance.now();
    for (let i = 0; i < NUM_CHILDREN; i++) {
      const child = new SimpleWorkflow(`Child-${i}`, parent);
    }
    const totalDuration = performance.now() - startTime;

    // ASSERT: Verify all children attached
    expect(parent.children).toHaveLength(NUM_CHILDREN);
    parent.children.forEach(child => {
      verifyBidirectionalLink(parent, child);
    });

    // ASSERT: Performance (< 100ms total, < 1ms average)
    expect(totalDuration).toBeLessThan(100);
    const avgTime = totalDuration / NUM_CHILDREN;
    expect(avgTime).toBeLessThan(1); // < 1ms per attachment
  });

  /**
   * Test 5: Bulk attachment performance (100 operations)
   *
   * Validates that sequential attachChild() operations complete within
   * acceptable time. This measures cumulative overhead of isDescendantOf()
   * validation across multiple operations.
   *
   * Threshold: < 1000ms (from deep-hierarchy-stress.test.ts:186)
   */
  it('should complete 100 sequential attachChild operations within acceptable time', () => {
    // ARRANGE: Create root workflow
    const root = new SimpleWorkflow('Root');
    const ITERATIONS = 100;

    // ACT: Measure cumulative time for 100 attachments
    const totalStartTime = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const child = new SimpleWorkflow(`Child-${i}`, root);
    }
    const totalDuration = performance.now() - totalStartTime;

    // ASSERT: Verify functional correctness
    expect(root.children).toHaveLength(ITERATIONS);

    // ASSERT: Performance threshold (< 1000ms from deep-hierarchy-stress.test.ts:186)
    expect(totalDuration).toBeLessThan(1000);

    // ASSERT: Average time per operation
    const avgTime = totalDuration / ITERATIONS;
    expect(avgTime).toBeLessThan(10); // < 10ms average
  });
});
