import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';

class BenchmarkWorkflow extends Workflow {
  async run() { this.setStatus('completed'); }
}

describe('Incremental Node Map Update Performance', () => {
  it('detach from large tree is O(k) not O(n)', () => {
    // Build large tree (1000 nodes)
    const root = new BenchmarkWorkflow('Root');
    let current = root;
    for (let i = 0; i < 999; i++) {
      const child = new BenchmarkWorkflow(`Node${i}`, current);
      current = child;
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(1000);

    // Benchmark: Detach single node (should be O(1) vs O(1000))
    const start = performance.now();
    const leaf = current; // Last node in chain
    const parent = leaf.parent!;
    parent.detachChild(leaf);
    const duration = performance.now() - start;

    console.log(`Detach duration: ${duration.toFixed(3)}ms`);
    console.log(`Expected: < 1ms for incremental, ~10ms for full rebuild`);

    // Verify correct behavior
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(999);
    expect(treeDebugger.getNode(leaf.id)).toBeUndefined();

    // Performance assertion: Should be significantly faster than O(n) rebuild
    // For 1000 nodes, full rebuild would take ~10ms, incremental should be <1ms
    expect(duration).toBeLessThan(5); // Generous threshold for CI environments
  });

  it('attach to large tree is O(k)', () => {
    // Build large tree (100 nodes - smaller for attach test)
    const root = new BenchmarkWorkflow('Root');
    for (let i = 0; i < 99; i++) {
      new BenchmarkWorkflow(`Node${i}`, root);
    }

    const treeDebugger = new WorkflowTreeDebugger(root);
    expect(treeDebugger.getStats().totalNodes).toBe(100);

    // Benchmark: Attach subtree with 10 nodes
    const start = performance.now();
    const newChild = new BenchmarkWorkflow('NewChild', root);
    for (let i = 0; i < 9; i++) {
      new BenchmarkWorkflow(`Descendant${i}`, newChild);
    }
    const duration = performance.now() - start;

    console.log(`Attach 10-node subtree duration: ${duration.toFixed(3)}ms`);

    // Verify correct behavior
    expect(treeDebugger.getStats().totalNodes).toBe(110);
    expect(treeDebugger.getNode(newChild.id)).toBeDefined();

    // Performance assertion: Should be fast for subtree addition
    expect(duration).toBeLessThan(10);
  });

  it('detach large subtree is O(k)', () => {
    // Build tree with one large subtree
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

    // Benchmark: Detach entire branch (should process 101 nodes, not 1002)
    const start = performance.now();
    root.detachChild(branch);
    const duration = performance.now() - start;

    console.log(`Detach 101-node subtree from 1002-node tree: ${duration.toFixed(3)}ms`);
    console.log(`Would be ~10ms for full rebuild, should be ~1ms for incremental`);

    // Verify correct behavior
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(901); // 1 root + 900 root children
    expect(treeDebugger.getNode(branch.id)).toBeUndefined();

    // Performance assertion: Should scale with subtree size (k=101), not tree size (n=1002)
    expect(duration).toBeLessThan(10);
  });

  it('multiple operations show cumulative benefit', () => {
    // Build tree with 10 branches
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

    // Benchmark: Detach all 10 branches one by one
    const start = performance.now();
    for (const branch of branches) {
      root.detachChild(branch);
    }
    const totalDuration = performance.now() - start;

    console.log(`Detached 10 branches of 11 nodes each from 111-node tree: ${totalDuration.toFixed(3)}ms`);
    console.log(`Average per detach: ${(totalDuration / 10).toFixed(3)}ms`);

    // Verify correct behavior - only root remains
    const stats = treeDebugger.getStats();
    expect(stats.totalNodes).toBe(1);
    expect(treeDebugger.getNode(root.id)).toBeDefined();

    // Performance assertion: Total should be much less than 10 × O(n) rebuilds
    // Full rebuild approach would be ~10 × 10ms = 100ms
    // Incremental should be ~10 × 1ms = 10ms
    expect(totalDuration).toBeLessThan(50);
  });
});
