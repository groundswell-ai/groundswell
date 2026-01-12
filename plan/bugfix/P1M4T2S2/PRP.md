name: "P1.M4.T2.S2: Performance Regression Testing for isDescendantOf()"
description: |

---

## Goal

**Feature Goal**: Create performance regression tests to validate that the `isDescendantOf()` method added in P1.M1.T2.S2 does not cause significant performance degradation in `attachChild()` operations.

**Deliverable**: A comprehensive performance test file at `src/__tests__/adversarial/attachChild-performance.test.ts` that validates `attachChild()` performance remains acceptable across various tree sizes and configurations.

**Success Definition**:
- All performance tests pass with thresholds: single operations < 100ms, bulk operations (100 iterations) < 1000ms
- Performance test results show `attachChild()` overhead is minimal (< 10% slower than baseline without `isDescendantOf()`)
- Test suite runs successfully with `npm test`
- Documentation of performance characteristics and any optimizations needed

## User Persona

**Target User**: Development team (maintainers and contributors)

**Use Case**: Validating that the circular reference detection feature (`isDescendantOf()`) does not introduce performance regressions when attaching children to workflow trees.

**User Journey**:
1. Developer runs `npm test` to execute full test suite
2. Performance tests in `attachChild-performance.test.ts` execute
3. Tests measure `attachChild()` timing across various tree configurations
4. Results show acceptable performance or flag regressions

**Pain Points Addressed**:
- Fear of performance degradation from new validation logic
- Need for objective performance metrics before/after `isDescendantOf()` addition
- Uncertainty about performance characteristics in large trees

## Why

- **Performance regression prevention**: The `isDescendantOf()` method traverses the parent chain on every `attachChild()` call, which could impact performance in deep trees (O(d) complexity where d = tree depth)
- **Validation of implementation quality**: Ensures the circular reference detection feature (P1.M1.T2.S2) is production-ready from a performance standpoint
- **Documentation of performance characteristics**: Establishes baseline metrics for future optimizations
- **Integration with existing test patterns**: Follows the established performance testing pattern from `deep-hierarchy-stress.test.ts`

## What

Create a performance test file that measures `attachChild()` execution time with the `isDescendantOf()` validation in place. The test should cover various tree configurations (deep, wide, mixed) and validate that performance remains within acceptable thresholds.

### Success Criteria

- [ ] Performance test file created at `src/__tests__/adversarial/attachChild-performance.test.ts`
- [ ] Single `attachChild()` operations complete in < 100ms for all tree sizes
- [ ] Bulk operations (100 attachments) complete in < 1000ms for all tree sizes
- [ ] Test covers shallow trees (depth 10), deep trees (depth 100, 1000), and wide trees (100 children)
- [ ] Test validates functional correctness alongside performance
- [ ] All tests pass with `npm test`
- [ ] Results documented showing `attachChild()` overhead is < 10% compared to theoretical baseline

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES - This PRP provides:
- Exact file paths and line numbers for all references
- Complete code examples for all test patterns
- Performance thresholds based on existing tests
- Test structure and naming conventions from the codebase
- Helper utilities available for validation
- Specific import patterns and class definitions

### Documentation & References

```yaml
# CRITICAL - Must read for implementation context
- url: https://github.com/tinylibs/tinybench
  why: Alternative benchmarking approach (if manual timing proves insufficient)
  critical: tinybench is already in node_modules but unused; consider for future enhancements

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains attachChild() (lines 266-305) and isDescendantOf() (lines 151-169) implementations
  pattern: Private method uses iterative while loop with Set-based cycle detection
  gotcha: isDescendantOf() is private - must cast to 'any' for testing (see deep-hierarchy-stress.test.ts:136)

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: Reference implementation for performance testing pattern using performance.now()
  pattern: Lines 153-187 show performance threshold testing with beforeEach/afterEach for console mocking
  gotcha: Performance thresholds: < 100ms for single operations, < 1000ms for 100 iterations

- file: /home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts
  why: Helper utilities for tree validation (verifyBidirectionalLink, validateTreeConsistency, collectAllNodes)
  pattern: Import from '../helpers/tree-verification.js' for tree validation assertions
  gotcha: Use validateTreeConsistency() for comprehensive validation, verifyBidirectionalLink() for single attachment checks

- file: /home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts
  why: Reference for AAA (Arrange-Act-Assert) test structure and observer patterns
  pattern: Uses // ARRANGE:, // ACT:, // ASSERT: comments for clear phase separation
  gotcha: Observer creation pattern uses onLog: () => {} for empty callbacks

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M4T2S2/research/01-isDescendantOf-implementation-analysis.md
  why: Detailed analysis of isDescendantOf() complexity, O(d) time/space complexity, performance impact
  section: Time Complexity Analysis, Performance Impact on attachChild()

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M4T2S2/research/02-existing-test-patterns.md
  why: Complete reference for test patterns, performance assertion patterns, workflow creation patterns
  section: Test Naming Conventions, Performance Assertion Patterns

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M4T2S2/research/03-tinybench-research.md
  why: tinybench usage for statistical analysis (if needed for more sophisticated benchmarking)
  section: Comparison Benchmarks, Integration with Vitest
```

### Current Codebase Tree

```bash
plan/bugfix/P1M4T2S2/
├── PRP.md                                    # This file
└── research/                                 # Research documentation
    ├── 01-isDescendantOf-implementation-analysis.md
    ├── 02-existing-test-patterns.md
    └── 03-tinybench-research.md

src/
├── core/
│   └── workflow.ts                           # attachChild() @ 266-305, isDescendantOf() @ 151-169
├── __tests__/
│   ├── adversarial/
│   │   ├── deep-hierarchy-stress.test.ts    # Reference performance test pattern
│   │   ├── circular-reference.test.ts       # Console mocking pattern
│   │   └── attachChild-performance.test.ts  # NEW: Performance test file to create
│   ├── integration/
│   │   └── workflow-reparenting.test.ts     # AAA test pattern reference
│   └── helpers/
│       └── tree-verification.ts              # Tree validation utilities
└── types/
    └── index.ts                              # Type definitions

package.json                                  # Test scripts: "test": "vitest run"
vitest.config.ts                              # Test configuration
```

### Desired Codebase Tree with Files to be Added

```bash
src/__tests__/adversarial/
└── attachChild-performance.test.ts           # NEW: Performance regression tests for attachChild()
    ├── SimpleWorkflow class definition       # Minimal workflow for testing
    ├── Test suite: "attachChild Performance Regression Tests"
    │   ├── Test 1: Shallow tree performance (depth 10)
    │   ├── Test 2: Deep tree performance (depth 100)
    │   ├── Test 3: Extreme deep tree (depth 1000)
    │   ├── Test 4: Wide tree performance (100 children)
    │   └── Test 5: Bulk attachment performance (100 operations)
    └── beforeEach/afterEach for console mocking
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: isDescendantOf() is a private method
// Must cast to 'any' to access in tests:
const isDescendant = (current as any).isDescendantOf(root);

// CRITICAL: Console error messages are thrown during validation failures
// Must mock console methods in beforeEach:
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// CRITICAL: Always restore mocks in afterEach
afterEach(() => {
  vi.restoreAllMocks();
});

// CRITICAL: performance.now() provides sub-millisecond precision
// Use for all timing measurements:
const startTime = performance.now();
operation();
const duration = performance.now() - startTime;

// CRITICAL: Performance thresholds from existing tests
// Single operation: < 100ms (deep-hierarchy-stress.test.ts:169,177)
// Bulk (100 iterations): < 1000ms (deep-hierarchy-stress.test.ts:186)

// CRITICAL: Use constructor with parent parameter for auto-attachment
// This automatically calls attachChild() during construction:
const child = new SimpleWorkflow('Child', parent);  // Auto-attaches

// CRITICAL: Vitest imports - use 'vitest' not 'jest'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// CRITICAL: Import from main index.js barrel export
import { Workflow } from '../../index.js';

// GOTCHA: Tree depth vs node count terminology
// Depth = levels from root to deepest leaf
// Node count = total number of workflows in tree
// A tree with depth 1000 has 1000 workflows in a single chain

// GOTCHA: O(d) complexity where d = tree depth
// isDescendantOf() traverses parent chain upward
// For deep trees (d=1000), this means 1000 parent reference checks
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed. This task creates test code that exercises existing `Workflow` class methods.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/attachChild-performance.test.ts
  - IMPLEMENT: Performance test suite for attachChild() operations
  - FOLLOW pattern: src/__tests__/adversarial/deep-hierarchy-stress.test.ts (test structure, console mocking, performance assertions)
  - NAMING: describe block "attachChild Performance Regression Tests", test names start with "should"
  - PLACEMENT: src/__tests__/adversarial/ directory (alongside other adversarial tests)

Task 2: DEFINE SimpleWorkflow class in test file
  - IMPLEMENT: Minimal workflow subclass for testing
  - FOLLOW pattern: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:20-26
  - NAMING: SimpleWorkflow extends Workflow with minimal run() implementation
  - PLACEMENT: Top of test file, before describe() block

Task 3: IMPLEMENT test setup (beforeEach/afterEach)
  - IMPLEMENT: Console method mocking to suppress error output
  - FOLLOW pattern: src/__tests__/adversarial/deep-hierarchy-stress.test.ts:33-46
  - MOCK: console.log, console.error, console.warn in beforeEach
  - RESTORE: All mocks in afterEach using vi.restoreAllMocks()

Task 4: IMPLEMENT Test 1: Shallow tree performance (depth 10)
  - CREATE: Tree with 10 levels using loop + constructor pattern
  - MEASURE: Single attachChild() timing using performance.now()
  - ASSERT: Duration < 10ms (should be very fast for shallow trees)
  - VALIDATE: Functional correctness (parent/child relationships)

Task 5: IMPLEMENT Test 2: Deep tree performance (depth 100)
  - CREATE: Tree with 100 levels
  - MEASURE: attachChild() timing at depth 50 (middle of tree)
  - ASSERT: Duration < 50ms (linear scaling with depth)
  - VALIDATE: Tree consistency using validateTreeConsistency()

Task 6: IMPLEMENT Test 3: Extreme deep tree (depth 1000)
  - CREATE: Tree with 1000 levels
  - MEASURE: attachChild() timing at deepest level
  - ASSERT: Duration < 100ms (threshold from existing tests)
  - VALIDATE: No stack overflow, functional correctness

Task 7: IMPLEMENT Test 4: Wide tree performance (100 children)
  - CREATE: Single parent with 100 children
  - MEASURE: Time to attach all 100 children
  - ASSERT: Total time < 100ms (average < 1ms per attachment)
  - VALIDATE: All children properly attached

Task 8: IMPLEMENT Test 5: Bulk attachment performance (100 operations)
  - CREATE: Measure cumulative time for 100 sequential attachments
  - MEASURE: Total time for all operations
  - ASSERT: Total time < 1000ms (threshold from existing tests)
  - CALCULATE: Average time per attachment

Task 9: VERIFY all tests pass with npm test
  - RUN: npm test to execute full test suite
  - VERIFY: New tests pass without breaking existing tests
  - CHECK: Test output shows all performance tests passing
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Test file structure with imports and class definition
// ============================================================
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
  // Test implementation
});

// ============================================================
// PATTERN 2: Console mocking in beforeEach
// ============================================================
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// PATTERN 3: Shallow tree creation with performance measurement
// ============================================================
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

  // ASSERT: Verify performance threshold
  expect(attachDuration).toBeLessThan(10); // < 10ms for shallow tree
});

// ============================================================
// PATTERN 4: Deep tree performance test (depth 100)
// ============================================================
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

// ============================================================
// PATTERN 5: Extreme deep tree test (depth 1000)
// ============================================================
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
});

// ============================================================
// PATTERN 6: Wide tree performance test (100 children)
// ============================================================
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

// ============================================================
// PATTERN 7: Bulk operation performance test
// ============================================================
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

// ============================================================
// PATTERN 8: JSDoc header documentation
// ============================================================
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
```

### Integration Points

```yaml
NONE:
  - This task creates a new test file only
  - No modifications to existing code
  - No new dependencies required

TEST:
  - add to: src/__tests__/adversarial/
  - pattern: "attachChild-performance.test.ts"
  - include: import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

NPM_SCRIPTS:
  - existing: "test": "vitest run"
  - usage: npm test (runs all tests including new performance tests)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
npm run lint                  # Type check with tsc --noEmit

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Note: No ruff or formatting tools used in this project (see package.json)
# TypeScript compilation is the primary validation
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific performance test file
npx vitest run src/__tests__/adversarial/attachChild-performance.test.ts

# Run all adversarial tests
npx vitest run src/__tests__/adversarial/

# Full test suite validation
npm test                      # Runs vitest on all test files

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Performance tests should show timing well under thresholds (< 10ms for shallow, < 100ms for deep)
```

### Level 3: Performance Validation (System Validation)

```bash
# Run performance test multiple times to check consistency
for i in {1..5}; do
  echo "Run $i:"
  npx vitest run src/__tests__/adversarial/attachChild-performance.test.ts
done

# Expected: Consistent timing across runs (variance < 20%)
# If timing varies significantly, check for:
# - Background processes affecting performance
# - JIT compilation inconsistencies (need more warmup)
# - Test isolation issues (shared state)

# Compare with baseline (if available)
# Before isDescendantOf(): Would need to temporarily remove validation
# After isDescendantOf(): Should be < 10% overhead

# Expected: attachChild() overhead is minimal (< 10% slower than without validation)
# If regression is significant (> 10%), consider optimizations:
# - Cache ancestor relationships
# - Use WeakSet for visited tracking
# - Early exit optimization
```

### Level 4: Documentation & Reporting

```bash
# Document performance characteristics
# Create summary of test results showing:
# - Average timing for each test case
# - Comparison with thresholds
# - Any performance characteristics observed

# Example output format:
"""
Performance Test Results for attachChild() with isDescendantOf():

Test Case                        | Threshold | Actual  | Status
---------------------------------|-----------|---------|--------
Shallow tree (depth 10)         | < 10ms    | ~0.5ms  | PASS
Deep tree (depth 100)           | < 50ms    | ~5ms    | PASS
Extreme deep tree (depth 1000)  | < 100ms   | ~50ms   | PASS
Wide tree (100 children)        | < 100ms   | ~20ms   | PASS
Bulk operations (100 iterations)| < 1000ms  | ~500ms  | PASS

Conclusion: isDescendantOf() validation adds minimal overhead.
O(d) complexity is acceptable for typical workflow tree depths.
"""

# Expected: All performance characteristics documented
# Recommendations included if optimizations needed
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/adversarial/attachChild-performance.test.ts`
- [ ] All performance tests pass: `npx vitest run src/__tests__/adversarial/attachChild-performance.test.ts`
- [ ] No type errors: `npm run lint`
- [ ] Test follows existing patterns from `deep-hierarchy-stress.test.ts`
- [ ] Performance thresholds are reasonable and documented

### Feature Validation

- [ ] Shallow tree test (depth 10): < 10ms threshold
- [ ] Deep tree test (depth 100): < 50ms threshold
- [ ] Extreme deep tree test (depth 1000): < 100ms threshold
- [ ] Wide tree test (100 children): < 100ms total threshold
- [ ] Bulk operation test (100 iterations): < 1000ms total threshold
- [ ] All tests include functional correctness assertions
- [ ] Console mocking properly suppresses error output

### Code Quality Validation

- [ ] Follows existing test naming conventions
- [ ] Uses SimpleWorkflow class pattern from existing tests
- [ ] Includes comprehensive JSDoc header documentation
- [ ] Uses beforeEach/afterEach for setup/teardown
- [ ] Performance measurements use performance.now() API
- [ ] All thresholds justified by reference to existing tests

### Documentation & Deployment

- [ ] Test file header documents purpose and related tasks
- [ ] Performance characteristics documented in comments
- [ ] Thresholds reference existing test standards
- [ ] Research findings linked in documentation
- [ ] Test results documented showing acceptable performance

---

## Anti-Patterns to Avoid

- ❌ Don't use recursive tree creation (use iterative loops to avoid test-side stack overflow)
- ❌ Don't skip functional correctness validation (test both speed AND correctness)
- ❌ Don't set arbitrary thresholds without reference to existing test standards
- ❌ Don't forget to mock console methods (validation failures print to console.error)
- ❌ Don't use setTimeout or other async timing (use performance.now() for synchronous timing)
- ❌ Don't test performance in isolation without functional assertions (tests must verify correctness)
- ❌ Don't ignore high variance in timing results (investigate and document if present)
- ❌ Don't create tests that are too brittle (allow reasonable variance in thresholds)
- ❌ Don't forget to restore mocks in afterEach (causes test pollution)
- ❌ Don't measure test setup time (only measure the specific operation being tested)
