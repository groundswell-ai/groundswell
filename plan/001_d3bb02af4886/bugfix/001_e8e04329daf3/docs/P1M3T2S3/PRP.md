name: "P1M3T2S3: Add Benchmark Tests for Node Map Updates"
description: |
  Creates comprehensive benchmark tests demonstrating the performance improvement from incremental node map updates
  implemented in P1M3T2S2. Tests compare old full rebuild approach vs new incremental O(k) approach.

---

## Goal

**Feature Goal**: Create benchmark tests that demonstrate and validate the performance improvement from incremental node map updates.

**Deliverable**: Benchmark test file `src/__tests__/adversarial/node-map-update-benchmarks.test.ts` with:
1. Tests comparing old full rebuild vs new incremental update performance
2. Large workflow tree scenarios (100+ nodes)
3. Performance threshold assertions
4. Functional correctness validation

**Success Definition**:
- Benchmark tests pass consistently
- Incremental updates show measurable performance improvement (10-100×)
- Performance thresholds are appropriate for CI environments
- Tests prevent future regressions in node map update performance

## User Persona

**Target User**: Developer maintaining the hierarchical workflow engine codebase.

**Use Case**: Validating that incremental node map updates maintain performance optimization over time.

**User Journey**:
1. Developer runs benchmark tests after code changes
2. Tests measure performance of node map updates
3. If performance regresses, tests fail indicating issue
4. Developer identifies and fixes regression

**Pain Points Addressed**:
- Without benchmarks, performance regressions go undetected
- Need to validate that S2 optimization actually improved performance
- Need to establish baseline performance for future comparisons

## Why

- **Validation**: P1M3T2S2 implemented incremental updates - need to verify improvement
- **Regression prevention**: Benchmark tests catch performance regressions early
- **Documentation**: Tests serve as executable documentation of expected performance
- **CI/CD integration**: Automated performance validation in CI pipeline

## What

Create comprehensive benchmark tests for node map update performance.

### Success Criteria

- [ ] Benchmark test file created in `src/__tests__/adversarial/`
- [ ] Tests measure single node detach performance (1000+ node tree)
- [ ] Tests measure subtree detach performance (varying subtree sizes)
- [ ] Tests measure multiple operations cumulative performance
- [ ] Tests validate functional correctness alongside performance
- [ ] Performance thresholds use generous CI-friendly margins
- [ ] Console logging shows expected vs actual performance
- [ ] All tests pass consistently

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed?

✅ **YES** - This PRP provides:
- Exact file paths and patterns from existing benchmark tests
- Complete benchmark testing patterns to follow
- Tree debugger implementation details for understanding what's being tested
- Performance threshold guidelines based on existing tests
- All necessary test utilities and helpers

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/__tests__/adversarial/incremental-performance.test.ts
  why: PRIMARY REFERENCE - Existing benchmark test patterns for node map updates
  pattern: Lines 9-39 (detach from large tree is O(k) not O(n))
  pattern: Lines 41-67 (attach to large tree is O(k))
  pattern: Lines 69-102 (detach large subtree is O(k))
  pattern: Lines 104-139 (multiple operations show cumulative benefit)
  gotcha: Uses 5ms threshold for CI environments (line 38)

- file: src/__tests__/adversarial/attachChild-performance.test.ts
  why: Performance regression testing patterns with tiered thresholds
  pattern: Lines 1-14 (header documentation pattern)
  pattern: Lines 20-30 (SimpleWorkflow class pattern)
  pattern: Lines 59-81 (shallow tree test with < 10ms threshold)
  pattern: Lines 92-116 (deep tree test with < 50ms threshold)
  pattern: Lines 127-150 (extreme deep tree with < 100ms threshold)
  pattern: Lines 161-183 (wide tree with average time calculation)
  gotcha: Console logging for debugging (lines 28-29, 59-60)

- file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: Stress testing patterns for extreme scenarios
  pattern: Lines 33-37 (beforeEach console mocking pattern)
  pattern: Lines 44-48 (afterEach vi.restoreAllMocks pattern)
  pattern: Lines 153-187 (performance threshold test pattern)
  gotcha: Thresholds: < 100ms for single operation, < 1000ms for 100 iterations

- file: src/debugger/tree-debugger.ts
  why: Understanding what is being benchmarked
  pattern: Lines 65-84 (removeSubtreeNodes - incremental O(k) removal)
  pattern: Lines 92-117 (onEvent with incremental updates)
  pattern: Lines 123-129 (onTreeChanged - now O(1) root update only)
  pattern: Lines 225-254 (getStats for validation)

- file: src/__tests__/helpers/tree-verification.ts
  why: Test helper utilities for validation
  pattern: Lines 114-140 (verifyBidirectionalLink for attach validation)
  pattern: Lines 151-163 (verifyOrphaned for detach validation)
  pattern: Lines 201-237 (verifyTreeMirror for consistency checks)

- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S2/PRP.md
  why: Understanding the incremental optimization being benchmarked
  section: "Goal" (lines 8-22) - Success definition and expected improvements
  section: "Level 4: Performance Validation" (lines 441-483) - Benchmark pattern
  gotcha: Expected 10-100× improvement for large trees (1000+ nodes)

- url: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
  why: performance.now() API documentation for timing measurements
  critical: High-resolution timing, monotonic clock, sub-millisecond precision
  gotcha: Use duration.toFixed(3) for consistent logging

- url: https://vitest.dev/guide/features.html#benchmark
  why: Vitest built-in benchmark support (alternative to manual performance.now())
  section: "Benchmark Mode" - can use .bench() instead of .it() for benchmarks
```

### Current Codebase Structure

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── debugger/
│   │   └── tree-debugger.ts              # Implementation being benchmarked
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── incremental-performance.test.ts    # REFERENCE PATTERN
│   │   │   ├── attachChild-performance.test.ts    # REFERENCE PATTERN
│   │   │   └── deep-hierarchy-stress.test.ts      # REFERENCE PATTERN
│   │   └── helpers/
│   │       └── tree-verification.ts       # Test utilities
│   └── types/
│       ├── events.ts                     # WorkflowEvent types
│       └── observer.ts                   # WorkflowObserver interface
└── plan/
    └── 001_d3bb02af4886/bugfix/001_e8e04329daf3/
        └── P1M3T2S3/
            ├── PRP.md                     # This file
            └── research/                 # External research storage
```

### Desired Codebase Structure After Implementation

```bash
src/__tests__/
└── adversarial/
    └── node-map-update-benchmarks.test.ts  # NEW: Benchmark tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use performance.now() for timing, not Date.now()
// performance.now() provides sub-millisecond precision
// Date.now() is affected by system clock changes
// Pattern from: incremental-performance.test.ts:22-26

// CRITICAL: Use generous thresholds for CI environments
// CI performance varies significantly - use 2-3× expected time
// Example: incremental-performance.test.ts:38 uses < 5ms instead of < 1ms

// CRITICAL: Always validate functional correctness FIRST
// Performance tests must fail if functionality is broken
// Pattern from: attachChild-performance.test.ts:75-77 (verifyBidirectionalLink)

// CRITICAL: Log both actual and expected performance for debugging
// Pattern: incremental-performance.test.ts:28-29
// console.log(`Detach duration: ${duration.toFixed(3)}ms`);
// console.log(`Expected: < 1ms for incremental, ~10ms for full rebuild`);

// CRITICAL: Use BenchmarkWorkflow class pattern, not full Workflow
// Minimal async run() method reduces test overhead
// Pattern from: incremental-performance.test.ts:4-6

// CRITICAL: Calculate average time for bulk operations
// Helps identify if single operation is outlier
// Pattern from: attachChild-performance.test.ts:167-183

// CRITICAL: Mock console methods in adversarial tests
// Prevents test output pollution
// Pattern from: deep-hierarchy-stress.test.ts:33-37, 44-48

// CRITICAL: Use vi.restoreAllMocks() in afterEach
// Prevents test pollution
// Pattern from: deep-hierarchy-stress.test.ts:44-48

// CRITICAL: Tests should validate the specific optimization
// For S3: validating that incremental O(k) is faster than old O(n) rebuild
// The "old" approach would have called buildNodeMap(this.root) on every change

// CRITICAL: Test different tree sizes to show scalability
// Small trees (< 100): Already fast, minimal difference
// Medium trees (100-1000): 10-100× improvement
// Large trees (1000+): 100-1000× improvement

// CRITICAL: Test both attach and detach operations
// S2 optimized both childAttached and childDetached
// Pattern from: incremental-performance.test.ts:41-67 (attach test)

// CRITICAL: Test subtree operations, not just single nodes
// BFS-based removeSubtreeNodes() scales with subtree size k
// Pattern from: incremental-performance.test.ts:69-102
```

## Implementation Blueprint

### Data Models and Structure

No new data models. Using existing:
- `Workflow` from `src/core/workflow.js`
- `WorkflowTreeDebugger` from `src/debugger/tree-debugger.js`
- `SimpleWorkflow` or `BenchmarkWorkflow` test class pattern

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE benchmark test file with header and setup
  - IMPLEMENT: src/__tests__/adversarial/node-map-update-benchmarks.test.ts
  - FOLLOW pattern: src/__tests__/adversarial/attachChild-performance.test.ts:1-30
  - INCLUDE: Comprehensive header comment explaining purpose
  - INCLUDE: Reference to P1M3T2S2 optimization being validated
  - IMPORT: describe, it, expect from vitest
  - IMPORT: Workflow, WorkflowTreeDebugger from src/index.js
  - CREATE: BenchmarkWorkflow class with minimal async run() method
  - PLACEMENT: src/__tests__/adversarial/node-map-update-benchmarks.test.ts

Task 2: IMPLEMENT single node detach benchmark (1000+ node tree)
  - IMPLEMENT: Test case "single node detach from large tree is O(1)"
  - FOLLOW pattern: src/__tests__/adversarial/incremental-performance.test.ts:9-39
  - CREATE: 1000-node linear chain (root + 999 descendants)
  - MEASURE: Time to detach single leaf node using performance.now()
  - VERIFY: Functional correctness (node count decreases by 1)
  - VERIFY: Detached node removed from nodeMap
  - ASSERT: Duration < 5ms (generous CI threshold)
  - LOG: Expected vs actual performance
  - NAMING: it('should detach single node from large tree in O(1) time')

Task 3: IMPLEMENT single node attach benchmark
  - IMPLEMENT: Test case "single node attach is O(1)"
  - FOLLOW pattern: src/__tests__/adversarial/incremental-performance.test.ts:41-67
  - CREATE: 100-node tree (smaller for attach test)
  - MEASURE: Time to attach single node
  - VERIFY: Node added to nodeMap
  - VERIFY: Total nodes increased by 1
  - ASSERT: Duration < 10ms
  - NAMING: it('should attach single node in O(1) time')

Task 4: IMPLEMENT subtree detach benchmark with varying sizes
  - IMPLEMENT: Test case "subtree detach scales with subtree size, not tree size"
  - FOLLOW pattern: src/__tests__/adversarial/incremental-performance.test.ts:69-102
  - CREATE: Tree with one large branch (101 nodes) and 900 other nodes
  - MEASURE: Time to detach large branch
  - VERIFY: Entire subtree removed (node count - 101)
  - VERIFY: Branch nodes not in nodeMap
  - ASSERT: Duration < 10ms (should scale with k=101, not n=1002)
  - LOG: "Processing 101 nodes, not 1002"
  - NAMING: it('should detach subtree in O(k) time where k = subtree size')

Task 5: IMPLEMENT cumulative operations benchmark
  - IMPLEMENT: Test case "multiple operations show cumulative benefit"
  - FOLLOW pattern: src/__tests__/adversarial/incremental-performance.test.ts:104-139
  - CREATE: Tree with 10 branches, each with 10 nodes
  - MEASURE: Total time to detach all 10 branches
  - CALCULATE: Average time per detach
  - VERIFY: Only root remains after all detaches
  - ASSERT: Total duration < 50ms (10 × 5ms)
  - LOG: Total and average duration
  - NAMING: it('should complete multiple operations efficiently')

Task 6: IMPLEMENT deep tree stress test
  - IMPLEMENT: Test case "deep tree operations don't cause stack overflow"
  - FOLLOW pattern: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:57-79
  - CREATE: 2000-node deep linear chain
  - MEASURE: Time to attach node at depth 2000
  - MEASURE: Time to detach node from depth 2000
  - VERIFY: No stack overflow occurs
  - VERIFY: Functional correctness
  - ASSERT: Duration < 100ms
  - NAMING: it('should handle deep tree (2000 levels) efficiently')

Task 7: IMPLEMENT wide tree benchmark
  - IMPLEMENT: Test case "wide tree operations scale efficiently"
  - FOLLOW pattern: src/__tests__/adversarial/attachChild-performance.test.ts:161-183
  - CREATE: Single parent with 100 children
  - MEASURE: Total time to attach all 100 children
  - CALCULATE: Average time per attachment
  - VERIFY: All children in nodeMap
  - ASSERT: Total < 100ms, average < 1ms
  - NAMING: it('should handle wide tree efficiently')

Task 8: ADD test suite metadata documentation
  - IMPLEMENT: Comprehensive header comment block
  - FOLLOW pattern: src/__tests__/adversarial/attachChild-performance.test.ts:1-14
  - INCLUDE: Purpose statement referencing P1M3T2S2
  - INCLUDE: Performance threshold rationale
  - INCLUDE: Expected complexity notation (O(k) vs O(n))
  - INCLUDE: Related PRP references
  - PLACEMENT: Top of test file

Task 9: RUN all benchmarks to verify
  - VERIFY: All benchmark tests pass
  - VERIFY: Console output shows performance improvements
  - VERIFY: No test failures in CI environment
  - ADJUST: Thresholds if needed (increase if CI flaky, decrease if too lenient)
  - COMMAND: npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: BenchmarkWorkflow class (minimal overhead)
// Follows: incremental-performance.test.ts:4-6
class BenchmarkWorkflow extends Workflow {
  async run() {
    this.setStatus('completed');
  }
}
// WHY: Minimal async run() method reduces test execution overhead

// Pattern 2: Single node detach benchmark
// Follows: incremental-performance.test.ts:9-39
it('should detach single node from large tree in O(1) time', () => {
  // ARRANGE: Build large tree (1000 nodes)
  const root = new BenchmarkWorkflow('Root');
  let current = root;
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

  // ASSERT: Verify correct behavior FIRST
  const stats = treeDebugger.getStats();
  expect(stats.totalNodes).toBe(999);
  expect(treeDebugger.getNode(leaf.id)).toBeUndefined();

  // ASSERT: Performance threshold (generous for CI)
  expect(duration).toBeLessThan(5);
});

// Pattern 3: Subtree detach benchmark
// Follows: incremental-performance.test.ts:69-102
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
  expect(treeDebugger.getStats().totalNodes).toBe(1002);

  // ACT: Detach entire branch (process 101 nodes, not 1002)
  const start = performance.now();
  root.detachChild(branch);
  const duration = performance.now() - start;

  console.log(`Detach 101-node subtree from 1002-node tree: ${duration.toFixed(3)}ms`);
  console.log(`Would be ~10ms for full rebuild, should be ~1ms for incremental`);

  // ASSERT: Verify correct behavior
  const stats = treeDebugger.getStats();
  expect(stats.totalNodes).toBe(901);
  expect(treeDebugger.getNode(branch.id)).toBeUndefined();

  // ASSERT: Should scale with subtree size (k=101), not tree size (n=1002)
  expect(duration).toBeLessThan(10);
});

// Pattern 4: Cumulative operations benchmark
// Follows: incremental-performance.test.ts:104-139
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
  expect(treeDebugger.getStats().totalNodes).toBe(111);

  // ACT: Detach all 10 branches
  const start = performance.now();
  for (const branch of branches) {
    root.detachChild(branch);
  }
  const totalDuration = performance.now() - start;

  console.log(`Detached 10 branches of 11 nodes each from 111-node tree: ${totalDuration.toFixed(3)}ms`);
  console.log(`Average per detach: ${(totalDuration / 10).toFixed(3)}ms`);

  // ASSERT: Verify correct behavior - only root remains
  const stats = treeDebugger.getStats();
  expect(stats.totalNodes).toBe(1);
  expect(treeDebugger.getNode(root.id)).toBeDefined();

  // ASSERT: Total should be much less than 10 × O(n) rebuilds
  expect(totalDuration).toBeLessThan(50);
});

// Pattern 5: Average time calculation
// Follows: attachChild-performance.test.ts:167-183
it('should calculate average time for bulk operations', () => {
  const root = new BenchmarkWorkflow('Root');
  const NUM_CHILDREN = 100;

  // ACT: Measure time to attach all children
  const startTime = performance.now();
  for (let i = 0; i < NUM_CHILDREN; i++) {
    const child = new BenchmarkWorkflow(`Child-${i}`, root);
  }
  const totalDuration = performance.now() - startTime;

  // ASSERT: Verify functional correctness
  expect(root.children).toHaveLength(NUM_CHILDREN);

  // ASSERT: Performance (< 100ms total, < 1ms average)
  expect(totalDuration).toBeLessThan(100);
  const avgTime = totalDuration / NUM_CHILDREN;
  expect(avgTime).toBeLessThan(1); // < 1ms per attachment

  console.log(`Total: ${totalDuration.toFixed(3)}ms, Average: ${avgTime.toFixed(3)}ms`);
});

// Pattern 6: Header documentation
// Follows: attachChild-performance.test.ts:1-14
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
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - framework: Vitest
  - config: vitest.config.ts
  - pattern: Use describe(), it(), expect() from 'vitest'

TREE_DEBUGGER:
  - file: src/debugger/tree-debugger.ts
  - class: WorkflowTreeDebugger
  - methods: getStats(), getNode(id)

WORKFLOW:
  - file: src/core/workflow.ts
  - class: Workflow
  - methods: detachChild(), constructor with parent parameter

TEST_UTILITIES:
  - file: src/__tests__/helpers/tree-verification.ts
  - helpers: verifyBidirectionalLink(), verifyOrphaned(), validateTreeConsistency()

PERFORMANCE_API:
  - api: performance.now()
  - precision: Sub-millisecond
  - pattern: const duration = performance.now() - start;
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npx tsc --noEmit src/__tests__/adversarial/node-map-update-benchmarks.test.ts

# Lint check
npm run lint -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts

# Format check
npm run format -- --check src/__tests__/adversarial/node-map-update-benchmarks.test.ts

# Expected: Zero errors. Fix any issues before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new benchmark tests
npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts

# Run with verbose output to see console logs
npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts --reporter=verbose

# Run all adversarial tests to ensure no regressions
npm test -- src/__tests__/adversarial/

# Expected: All tests pass. Console logs show performance metrics.
```

### Level 3: Integration Testing (System Validation)

```bash
# Create integration test script
cat > /tmp/test-benchmark-integration.mjs << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './dist/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); }
}

// Test 1: Verify incremental update is faster than would be for full rebuild
const root = new TestWorkflow('Root');
for (let i = 0; i < 999; i++) {
  new TestWorkflow(`Node${i}`, root);
}

const debugger = new WorkflowTreeDebugger(root);
console.log('Initial nodes:', debugger.getStats().totalNodes);

// Single node detach should be very fast
const start = performance.now();
const leaf = Array.from(root.children).pop();
root.detachChild(leaf);
const duration = performance.now() - start;

console.log(`Detach duration: ${duration.toFixed(3)}ms`);
console.log(`Nodes remaining: ${debugger.getStats().totalNodes}`);

// Verify functional correctness
if (debugger.getStats().totalNodes !== 999) {
  console.error('ERROR: Expected 999 nodes, got', debugger.getStats().totalNodes);
  process.exit(1);
}

if (duration > 5) {
  console.warn('WARNING: Detach took longer than expected (should be < 5ms)');
}

console.log('Integration test PASSED!');
EOF

node /tmp/test-benchmark-integration.mjs

# Expected: Duration < 5ms, functional correctness verified
```

### Level 4: Performance Validation

```bash
# Run benchmarks and capture output
npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts 2>&1 | tee /tmp/benchmark-results.txt

# Check that all tests passed
if grep -q "PASS" /tmp/benchmark-results.txt; then
  echo "All benchmark tests PASSED";
else
  echo "Some benchmark tests FAILED";
  exit 1;
fi

# Verify performance metrics are logged
grep "duration:" /tmp/benchmark-results.txt || echo "WARNING: No performance metrics logged"

# Run benchmarks multiple times to check consistency
for i in {1..5}; do
  echo "Run $i:"
  npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts --silent 2>&1 | grep -E "duration|nodes"
done

# Expected: All runs complete successfully with consistent timing
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All benchmark tests pass: `npm test -- src/__tests__/adversarial/node-map-update-benchmarks.test.ts`
- [ ] Linting passes: `npm run lint`
- [ ] Format check passes: `npm run format -- --check`
- [ ] No regressions in existing tests: `npm test -- src/__tests__/adversarial/`

### Feature Validation

- [ ] Single node detach benchmark passes with < 5ms threshold
- [ ] Single node attach benchmark passes with < 10ms threshold
- [ ] Subtree detach benchmark passes with < 10ms threshold
- [ ] Cumulative operations benchmark passes with < 50ms threshold
- [ ] Deep tree benchmark passes with < 100ms threshold
- [ ] Wide tree benchmark passes with < 100ms total, < 1ms average
- [ ] Console logging shows expected vs actual performance
- [ ] Functional correctness validated for all benchmarks

### Code Quality Validation

- [ ] Header documentation follows existing pattern
- [ ] BenchmarkWorkflow class pattern used correctly
- [ ] Test naming is descriptive and consistent
- [ ] Performance thresholds use generous CI-friendly margins
- [ ] Console logging helps debug performance regressions
- [ ] Average time calculations included for bulk operations
- [ ] Follows AAA pattern (Arrange, Act, Assert)
- [ ] Functional correctness validated before performance assertions

### Documentation & Deployment

- [ ] Header comment references P1M3T2S2 PRP
- [ ] Performance thresholds documented with rationale
- [ ] Expected complexity noted (O(k) vs O(n))
- [ ] Console output format is consistent
- [ ] Test file placed in correct directory

---

## Anti-Patterns to Avoid

- ❌ Don't use `Date.now()` - use `performance.now()` for high precision
- ❌ Don't use overly precise thresholds - CI environments are variable
- ❌ Don't forget to validate functional correctness - performance means nothing if broken
- ❌ Don't skip console logging - needed for debugging regressions
- ❌ Don't test only small trees - need large trees to show O(k) vs O(n) difference
- ❌ Don't forget to calculate average time for bulk operations
- ❌ Don't use full Workflow class - use BenchmarkWorkflow pattern
- ❌ Don't create tests that measure JIT warmup - use realistic workloads
- ❌ Don't assume performance will be identical across runs - use thresholds
- ❌ Don't forget to test both attach AND detach operations
- ❌ Don't test only single nodes - include subtree operations
- ❌ Don't create thresholds based on local machine only - consider CI variance
- ❌ Don't forget to mock console methods to prevent test pollution
- ❌ Don't forget vi.restoreAllMocks() in afterEach
- ❌ Don't create benchmark tests that are too brittle - they should catch regressions, not flake

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement comprehensive benchmark tests for node map update performance successfully.

**Key Success Indicators**:
1. Existing benchmark patterns are well-established and documented
2. Tree debugger implementation is complete and stable
3. Test utilities are comprehensive and ready to use
4. Performance thresholds are based on existing working benchmarks
5. All file paths and patterns are specific and actionable
6. Gotchas and anti-patterns are comprehensively documented

**Expected Test Outcomes**:
- Single node operations: < 1-5ms (vs ~10ms for old approach)
- Subtree operations (100 nodes): < 2-10ms (vs ~100ms for old approach)
- Multiple operations: Cumulative 10-100× improvement
- Deep/wide trees: No stack overflow, efficient performance

**Performance Improvement Validation**:
- Small trees (< 100 nodes): Minimal difference (already fast)
- Medium trees (100-1000 nodes): 10-100× improvement measurable
- Large trees (1000+ nodes): 100-1000× improvement measurable

**Test Coverage**:
- Single node attach/detach
- Subtree attach/detach
- Cumulative operations
- Deep trees (2000+ levels)
- Wide trees (100+ children)
- Functional correctness validation
