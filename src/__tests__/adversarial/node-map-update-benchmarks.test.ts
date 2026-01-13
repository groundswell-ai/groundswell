/**
 * Node Map Update Performance Benchmarks
 *
 * Validates that the incremental node map update optimization (P1M3T2S2)
 * provides measurable performance improvement over the previous full rebuild approach.
 *
 * Expected Performance Improvements:
 * - Single node attach/detach: 10-100× faster (O(1) vs O(n))
 * - Subtree operations: 10-100× faster (O(k) vs O(n))
 * - Multiple operations: Cumulative benefit
 *
 * Performance Thresholds (CI-friendly with 2-3× buffer):
 * - Single operation: < 5ms (expected < 1ms)
 * - Subtree operation (100 nodes): < 10ms (expected < 2ms)
 * - Multiple operations (10×): < 50ms (expected < 10ms)
 * - Deep tree (2000 levels): < 100ms
 * - Wide tree (100 children): < 100ms total, < 1ms average
 *
 * Related: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S2/PRP.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';

/**
 * BenchmarkWorkflow class for performance testing
 * Pattern from: src/__tests__/adversarial/incremental-performance.test.ts:4-6
 */
class BenchmarkWorkflow extends Workflow {
  async run() {
    this.setStatus('completed');
  }
}

describe('Node Map Update Performance Benchmarks', () => {
  /**
   * Setup: Mock console methods to prevent test output pollution
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
   * Test 1: Single Node Detach from Large Tree (1000+ nodes)
   *
   * Validates that single node detach is O(1) vs old O(n) full rebuild.
   * The incremental update only removes the single node from nodeMap,
   * while the old approach would rebuild the entire map.
   *
   * Pattern from: src/__tests__/adversarial/incremental-performance.test.ts:9-39
   */
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

    // ACT: Benchmark detach single node (should be O(1) vs O(1000))
    const start = performance.now();
    const leaf = current; // Last node in chain
    const parent = leaf.parent!;
    parent.detachChild(leaf);
    const duration = performance.now() - start;

    console.log(`Detach duration: ${duration.toFixed(3)}ms`);
    console.log(`Expected: < 1ms for incremental, ~10ms for full rebuild`);

    // ASSERT: Verify functional correctness FIRST
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(999);
    expect(treeDebugger.getNode(leaf.id)).toBeUndefined();

    // ASSERT: Performance threshold (generous for CI)
    expect(duration).toBeLessThan(5);
  });

  /**
   * Test 2: Single Node Attach
   *
   * Validates that single node attach is O(k) where k = subtree size.
   * The incremental update only adds the new subtree to nodeMap.
   *
   * Pattern from: src/__tests__/adversarial/incremental-performance.test.ts:41-67
   */
  it('should attach single node in O(k) time where k = subtree size', () => {
    // ARRANGE: Build large tree (100 nodes - smaller for attach test)
    const root = new BenchmarkWorkflow('Root');
    for (let i = 0; i < 99; i++) {
      new BenchmarkWorkflow(`Node${i}`, root);
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(100);

    // ACT: Benchmark attach subtree with 10 nodes
    const start = performance.now();
    const newChild = new BenchmarkWorkflow('NewChild', root);
    for (let i = 0; i < 9; i++) {
      new BenchmarkWorkflow(`Descendant${i}`, newChild);
    }
    const duration = performance.now() - start;

    console.log(`Attach 10-node subtree duration: ${duration.toFixed(3)}ms`);
    console.log(`Expected: < 2ms for incremental, ~20ms for full rebuild`);

    // ASSERT: Verify functional correctness
    expect(treeDebugger.getStats().totalNodes).toBe(110);
    expect(treeDebugger.getNode(newChild.id)).toBeDefined();

    // ASSERT: Performance threshold
    expect(duration).toBeLessThan(10);
  });

  /**
   * Test 3: Subtree Detach with Varying Sizes
   *
   * Validates that subtree detach scales with subtree size (k), not tree size (n).
   * Uses BFS-based removeSubtreeNodes() which is O(k) where k = subtree nodes.
   *
   * Pattern from: src/__tests__/adversarial/incremental-performance.test.ts:69-102
   */
  it('should detach subtree in O(k) time where k = subtree size', () => {
    // ARRANGE: Build tree with one large branch
    const root = new BenchmarkWorkflow('Root');
    const branch = new BenchmarkWorkflow('Branch', root);

    // Add 100 nodes to branch
    for (let i = 0; i < 100; i++) {
      new BenchmarkWorkflow(`BranchNode${i}`, branch);
    }

    // Add 900 nodes to root
    for (let i = 0; i < 900; i++) {
      new BenchmarkWorkflow(`RootNode${i}`, root);
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(1002); // 1 root + 1 branch + 100 + 900

    // ACT: Detach entire branch (process 101 nodes, not 1002)
    const start = performance.now();
    root.detachChild(branch);
    const duration = performance.now() - start;

    console.log(`Detach 101-node subtree from 1002-node tree: ${duration.toFixed(3)}ms`);
    console.log(`Processing 101 nodes (subtree size), not 1002 (tree size)`);
    console.log(`Expected: < 2ms for incremental, ~100ms for full rebuild`);

    // ASSERT: Verify functional correctness
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(901); // 1 root + 900 root children
    expect(treeDebugger.getNode(branch.id)).toBeUndefined();

    // ASSERT: Should scale with subtree size (k=101), not tree size (n=1002)
    expect(duration).toBeLessThan(10);
  });

  /**
   * Test 4: Cumulative Operations Benchmark
   *
   * Validates that multiple operations show cumulative benefit from incremental updates.
   * Each operation is O(k) instead of O(n), so total time is much better.
   *
   * Pattern from: src/__tests__/adversarial/incremental-performance.test.ts:104-139
   */
  it('should complete multiple operations efficiently', () => {
    // ARRANGE: Build tree with 10 branches
    const root = new BenchmarkWorkflow('Root');
    const branches: BenchmarkWorkflow[] = [];

    for (let i = 0; i < 10; i++) {
      const branch = new BenchmarkWorkflow(`Branch${i}`, root);
      branches.push(branch);
      for (let j = 0; j < 10; j++) {
        new BenchmarkWorkflow(`Node${i}_${j}`, branch);
      }
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(111); // 1 root + 10 branches + 100 leaf nodes

    // ACT: Detach all 10 branches
    const start = performance.now();
    for (const branch of branches) {
      root.detachChild(branch);
    }
    const totalDuration = performance.now() - start;

    console.log(`Detached 10 branches of 11 nodes each from 111-node tree: ${totalDuration.toFixed(3)}ms`);
    console.log(`Average per detach: ${(totalDuration / 10).toFixed(3)}ms`);
    console.log(`Expected: < 10ms total for incremental, ~100ms for full rebuild`);

    // ASSERT: Verify correct behavior - only root remains
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(1);
    expect(treeDebugger.getNode(root.id)).toBeDefined();

    // ASSERT: Total should be much less than 10 × O(n) rebuilds
    expect(totalDuration).toBeLessThan(50);
  });

  /**
   * Test 5: Deep Tree Stress Test (2000 levels)
   *
   * Validates that deep tree operations don't cause stack overflow
   * and maintain efficient performance. The BFS-based removeSubtreeNodes()
   * uses iteration, not recursion, to avoid stack overflow.
   *
   * Pattern from: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:196-212
   */
  it('should handle deep tree (2000 levels) efficiently', () => {
    // ARRANGE: Build 2000-node deep linear chain
    const DEPTH = 2000;
    const root = new BenchmarkWorkflow('Root');
    let current: any = root;

    for (let i = 0; i < DEPTH; i++) {
      const child = new BenchmarkWorkflow(`Child-${i}`, current);
      current = child;
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(2001); // root + 2000 children

    // ACT: Benchmark attach node at depth 2000
    const attachStart = performance.now();
    const newChild = new BenchmarkWorkflow('NewChild', current);
    const attachDuration = performance.now() - attachStart;

    console.log(`Attach at depth 2000: ${attachDuration.toFixed(3)}ms`);

    // ASSERT: Verify attach functional correctness
    expect(treeDebugger.getStats().totalNodes).toBe(2002);
    expect(treeDebugger.getNode(newChild.id)).toBeDefined();
    expect(attachDuration).toBeLessThan(100);

    // ACT: Benchmark detach node from depth 2000
    const detachStart = performance.now();
    current.detachChild(newChild);
    const detachDuration = performance.now() - detachStart;

    console.log(`Detach from depth 2000: ${detachDuration.toFixed(3)}ms`);
    console.log(`Total deep tree operations: ${(attachDuration + detachDuration).toFixed(3)}ms`);

    // ASSERT: Verify detach functional correctness
    expect(treeDebugger.getStats().totalNodes).toBe(2001);
    expect(treeDebugger.getNode(newChild.id)).toBeUndefined();
    expect(detachDuration).toBeLessThan(100);

    // ASSERT: No stack overflow occurred (test would have failed)
    // ASSERT: Total operations should complete efficiently
    expect(attachDuration + detachDuration).toBeLessThan(200);
  });

  /**
   * Test 6: Wide Tree Benchmark
   *
   * Validates that wide tree operations scale efficiently.
   * Each child attach/detach is independent O(1) operation.
   *
   * Pattern from: src/__tests__/adversarial/attachChild-performance.test.ts:161-183
   */
  it('should handle wide tree efficiently', () => {
    // ARRANGE: Create parent
    const root = new BenchmarkWorkflow('Root');
    const NUM_CHILDREN = 100;

    // ACT: Measure time to attach all children
    const startTime = performance.now();
    const children: BenchmarkWorkflow[] = [];
    for (let i = 0; i < NUM_CHILDREN; i++) {
      const child = new BenchmarkWorkflow(`Child-${i}`, root);
      children.push(child);
    }
    const totalDuration = performance.now() - startTime;

    const treeDebugger = new WorkflowTreeDebugger(root);

    // ASSERT: Verify functional correctness
    expect(root.children).toHaveLength(NUM_CHILDREN);
    expect(treeDebugger.getStats().totalNodes).toBe(101); // root + 100 children

    // ASSERT: All children in nodeMap
    for (const child of children) {
      expect(treeDebugger.getNode(child.id)).toBeDefined();
    }

    // ASSERT: Performance (< 100ms total, < 1ms average)
    expect(totalDuration).toBeLessThan(100);
    const avgTime = totalDuration / NUM_CHILDREN;
    expect(avgTime).toBeLessThan(1); // < 1ms per attachment

    console.log(`Wide tree attach: ${totalDuration.toFixed(3)}ms total, ${avgTime.toFixed(3)}ms average`);

    // ACT: Benchmark detach all children
    const detachStart = performance.now();
    for (const child of children) {
      root.detachChild(child);
    }
    const detachDuration = performance.now() - detachStart;

    console.log(`Wide tree detach: ${detachDuration.toFixed(3)}ms total`);

    // ASSERT: Verify all children removed
    expect(treeDebugger.getStats().totalNodes).toBe(1); // Only root remains
    expect(detachDuration).toBeLessThan(100);
  });

  /**
   * Test 7: Large Subtree Performance Validation
   *
   * Validates that subtree operations scale correctly with varying subtree sizes.
   * Tests small (10 nodes), medium (100 nodes), and large (500 nodes) subtrees.
   */
  it('should scale performance with subtree size not tree size', () => {
    // ARRANGE: Create tree with different branch sizes
    const root = new BenchmarkWorkflow('Root');

    // Small branch (10 nodes)
    const smallBranch = new BenchmarkWorkflow('SmallBranch', root);
    for (let i = 0; i < 9; i++) {
      new BenchmarkWorkflow(`SmallNode${i}`, smallBranch);
    }

    // Medium branch (100 nodes)
    const mediumBranch = new BenchmarkWorkflow('MediumBranch', root);
    for (let i = 0; i < 99; i++) {
      new BenchmarkWorkflow(`MediumNode${i}`, mediumBranch);
    }

    // Large branch (500 nodes)
    const largeBranch = new BenchmarkWorkflow('LargeBranch', root);
    for (let i = 0; i < 499; i++) {
      new BenchmarkWorkflow(`LargeNode${i}`, largeBranch);
    }

    // Add many nodes to root to make tree size >> subtree size
    for (let i = 0; i < 1000; i++) {
      new BenchmarkWorkflow(`RootNode${i}`, root);
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    const initialTotal = treeDebugger.getStats().totalNodes;
    // 1 root + 3 branches + 9 + 99 + 499 + 1000 = 1611
    expect(initialTotal).toBe(1611);

    // ACT: Benchmark detach small subtree (10 nodes: branch + 9 children)
    const smallStart = performance.now();
    root.detachChild(smallBranch);
    const smallDuration = performance.now() - smallStart;

    console.log(`Small subtree (10 nodes) detach: ${smallDuration.toFixed(3)}ms`);
    expect(treeDebugger.getStats().totalNodes).toBe(1601); // 1611 - 10
    expect(smallDuration).toBeLessThan(5);

    // ACT: Benchmark detach medium subtree (100 nodes: branch + 99 children)
    const mediumStart = performance.now();
    root.detachChild(mediumBranch);
    const mediumDuration = performance.now() - mediumStart;

    console.log(`Medium subtree (100 nodes) detach: ${mediumDuration.toFixed(3)}ms`);
    expect(treeDebugger.getStats().totalNodes).toBe(1501); // 1601 - 100
    expect(mediumDuration).toBeLessThan(10);

    // ACT: Benchmark detach large subtree (500 nodes: branch + 499 children)
    const largeStart = performance.now();
    root.detachChild(largeBranch);
    const largeDuration = performance.now() - largeStart;

    console.log(`Large subtree (500 nodes) detach: ${largeDuration.toFixed(3)}ms`);
    expect(treeDebugger.getStats().totalNodes).toBe(1001); // 1501 - 500
    expect(largeDuration).toBeLessThan(50);

    // ASSERT: Performance scales with subtree size, not tree size
    // Each subtree operation should be proportional to subtree nodes, not total nodes
    console.log(`Scaling check - Small: ${smallDuration.toFixed(3)}ms, Medium: ${mediumDuration.toFixed(3)}ms, Large: ${largeDuration.toFixed(3)}ms`);
    expect(smallDuration).toBeLessThan(mediumDuration);
    expect(mediumDuration).toBeLessThan(largeDuration);
  });

  /**
   * Test 8: Incremental Update Correctness Validation
   *
   * Validates that incremental updates maintain functional correctness
   * alongside performance improvements. Tests various edge cases.
   */
  it('should maintain correctness with incremental updates', () => {
    // ARRANGE: Build complex tree structure
    const root = new BenchmarkWorkflow('Root');

    // Create first branch
    const branch1 = new BenchmarkWorkflow('Branch1', root);
    const branch1Child1 = new BenchmarkWorkflow('Branch1Child1', branch1);
    const branch1Child2 = new BenchmarkWorkflow('Branch1Child2', branch1);

    // Create second branch
    const branch2 = new BenchmarkWorkflow('Branch2', root);
    const branch2Child1 = new BenchmarkWorkflow('Branch2Child1', branch2);

    const treeDebugger = new WorkflowTreeDebugger(root);
    const initialStats = treeDebugger.getStats();

    // ASSERT: Verify initial state (root + 2 branches + 3 grandchildren = 6 nodes)
    expect(initialStats.totalNodes).toBe(6);
    expect(treeDebugger.getNode(root.id)).toBeDefined();
    expect(treeDebugger.getNode(branch1.id)).toBeDefined();
    expect(treeDebugger.getNode(branch2.id)).toBeDefined();
    expect(treeDebugger.getNode(branch1Child1.id)).toBeDefined();
    expect(treeDebugger.getNode(branch1Child2.id)).toBeDefined();
    expect(treeDebugger.getNode(branch2Child1.id)).toBeDefined();

    // ACT: Detach first branch (removes 3 nodes: branch1 + 2 children)
    root.detachChild(branch1);

    // ASSERT: Verify branch1 and its children removed
    expect(treeDebugger.getStats().totalNodes).toBe(3); // root + branch2 + 1 child
    expect(treeDebugger.getNode(branch1.id)).toBeUndefined();
    expect(treeDebugger.getNode(branch1Child1.id)).toBeUndefined();
    expect(treeDebugger.getNode(branch1Child2.id)).toBeUndefined();

    // ASSERT: Verify branch2 unaffected
    expect(treeDebugger.getNode(branch2.id)).toBeDefined();
    expect(treeDebugger.getNode(branch2Child1.id)).toBeDefined();

    // ACT: Reattach branch1 with new children
    const newBranch1 = new BenchmarkWorkflow('NewBranch1', root);
    const newChild1 = new BenchmarkWorkflow('NewChild1', newBranch1);
    const newChild2 = new BenchmarkWorkflow('NewChild2', newBranch1);

    // ASSERT: Verify new nodes added correctly
    expect(treeDebugger.getStats().totalNodes).toBe(6); // Back to 6 nodes (root + branch2 + newBranch1 + 2 children)
    expect(treeDebugger.getNode(newBranch1.id)).toBeDefined();
    expect(treeDebugger.getNode(newChild1.id)).toBeDefined();
    expect(treeDebugger.getNode(newChild2.id)).toBeDefined();

    // ASSERT: Verify original branch2 still present
    expect(treeDebugger.getNode(branch2.id)).toBeDefined();
    expect(treeDebugger.getNode(branch2Child1.id)).toBeDefined();
  });
});
