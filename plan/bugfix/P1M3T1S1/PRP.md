name: "PRP: Deep Hierarchy Stress Test for Workflow Tree"
description: |

---

## Goal

**Feature Goal**: Create a comprehensive stress test that validates the Workflow class handles deep hierarchies (1000+ levels) without stack overflow or performance issues in `getRoot()` and `isDescendantOf()` methods.

**Deliverable**: A new test file `src/__tests__/adversarial/deep-hierarchy-stress.test.ts` containing stress tests for deep workflow trees.

**Success Definition**:
- Test creates a chain of 1000+ nested workflows
- `getRoot()` method is called on the deepest child and returns root without stack overflow
- `isDescendantOf()` method is tested and completes without stack overflow
- All tests pass within acceptable performance thresholds (< 1 second for operations)
- No regression in existing test suite

## User Persona (if applicable)

**Target User**: Developer / QA Engineer validating workflow tree integrity under stress conditions

**Use Case**: Verifying the hierarchical workflow engine can handle deep nesting scenarios common in complex automation pipelines

**User Journey**:
1. Developer runs the test suite with `npm test` or `vitest run`
2. Deep hierarchy stress tests execute as part of adversarial test suite
3. Tests pass, confirming no stack overflow or performance issues at 1000+ depth
4. Developer gains confidence in tree traversal algorithms

**Pain Points Addressed**:
- Risk of stack overflow in recursive tree traversal algorithms
- Potential performance degradation with deep hierarchies
- Uncertainty about maximum safe depth for workflow trees

## Why

- **Business value**: Ensures workflow engine reliability for complex automation scenarios with deeply nested workflows
- **Integration with existing features**: Validates `getRoot()` and `isDescendantOf()` methods used throughout observer propagation and circular reference detection
- **Problems this solves**: Prevents production failures from stack overflow when users create deep workflow hierarchies; provides confidence in scalability

## What

Create stress tests that verify:

1. **Deep Hierarchy Creation**: Test builds a chain of 1000+ nested workflows using loop iteration
2. **getRoot() Validation**: Call `getRoot()` on deepest child and verify it returns root workflow without stack overflow
3. **isDescendantOf() Validation**: Test the circular reference detection method doesn't overflow on deep chains
4. **Performance Validation**: Ensure operations complete in reasonable time (< 1 second)

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/deep-hierarchy-stress.test.ts`
- [ ] Test creates 1000+ level deep workflow hierarchy
- [ ] `getRoot()` call on deepest child returns root without error
- [ ] `isDescendantOf()` tested and doesn't overflow
- [ ] All tests pass with `npm test`
- [ ] No regression in existing 241+ tests
- [ ] Performance acceptable (< 1 second for deep tree operations)

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ This PRP provides:
- Complete Workflow class structure with `getRoot()` and `isDescendantOf()` signatures
- Test framework setup (Vitest) and commands
- Existing test patterns from adversarial suite to follow
- Exact file location and naming conventions
- Implementation patterns document reference for Pattern 8
- External research URLs for best practices

### Documentation & References

```yaml
# MUST READ - Implementation Pattern for Deep Hierarchy Testing
- file: plan/docs/bugfix-architecture/implementation_patterns.md
  why: Pattern 8 explicitly specifies: "Test deep hierarchies (1000+ levels) to ensure no stack overflow in getRoot() or isDescendantOf()"
  section: Pattern 8 - Adversarial Testing (lines 402-448)
  critical: Contains exact test pattern to follow for deep hierarchy testing

# MUST READ - Workflow Class Structure
- file: src/core/workflow.ts
  why: Understanding getRoot() and isDescendantOf() implementation for accurate test assertions
  pattern: getRoot() uses iterative while loop with Set<Workflow> for cycle detection (lines 184-212)
  pattern: isDescendantOf() uses iterative while loop with Set<Workflow> for cycle detection
  gotcha: Both methods are protected/private - need to cast to `any` for testing

# MUST READ - Existing Adversarial Test Patterns
- file: src/__tests__/adversarial/edge-case.test.ts
  why: Reference for existing deep hierarchy test pattern (lines 262-295)
  pattern: Creates 100 nested workflows using for loop with DynamicWorkflow class pattern
  pattern: Uses `lastWorkflow` variable to build chain, then validates depth by walking parent chain
  gotcha: Existing test only goes to 100 levels - this PRP extends to 1000+

- file: src/__tests__/adversarial/circular-reference.test.ts
  why: Reference for testing isDescendantOf() method behavior
  pattern: Uses SimpleWorkflow class extending Workflow
  pattern: Tests error assertions with regex patterns: /circular|cycle|ancestor/i

- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Reference for deep hierarchy testing with WorkflowTreeDebugger
  pattern: Lines 387-416 show toTreeString() test with 20-level deep hierarchy
  pattern: Shows dynamic class creation pattern: `const ChildWorkflow = class extends Workflow`

# EXTERNAL RESEARCH - Best Practices
- url: https://vitest.dev/guide/
  why: Official Vitest documentation for test syntax, assertions, and patterns
  section: Test API reference for expect() and describe() patterns

- url: https://jestjs.io/docs/getting-started
  why: Jest patterns compatible with Vitest (Vitest is Jest-compatible)
  section: Testing Async Code and Mock Functions

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#recursion
  why: Understanding JavaScript call stack limits and recursion patterns
  section: Recursion and stack limits (~10,000-15,000 frames in V8)

# TEST FRAMEWORK CONFIGURATION
- file: vitest.config.ts
  why: Test configuration and include patterns
  pattern: Tests located in src/__tests__/**/*.test.ts
  pattern: globals: true enabled (no need to import describe/it/expect)

- file: package.json
  why: Test scripts and framework version
  pattern: "test": "vitest run" for running tests
  version: vitest ^1.6.0
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── __tests__/
│   ├── adversarial/
│   │   ├── edge-case.test.ts          # Has 100-level deep test (lines 262-295)
│   │   ├── circular-reference.test.ts # Tests isDescendantOf() via attachChild
│   │   ├── deep-analysis.test.ts      # Has 20-level deep test (lines 387-416)
│   │   ├── parent-validation.test.ts
│   │   ├── prd-compliance.test.ts
│   │   └── e2e-prd-validation.test.ts
│   ├── unit/
│   └── integration/
├── core/
│   └── workflow.ts                    # Main Workflow class with getRoot(), isDescendantOf()
├── types/
│   ├── events.ts
│   └── observer.ts
└── index.ts                           # Main exports

plan/
└── docs/
    └── bugfix-architecture/
        └── implementation_patterns.md # Pattern 8: Adversarial Testing
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── __tests__/
│   ├── adversarial/
│   │   ├── deep-hierarchy-stress.test.ts  # NEW: 1000+ level stress tests
│   │   ├── edge-case.test.ts              # EXISTING
│   │   ├── circular-reference.test.ts     # EXISTING
│   │   ├── deep-analysis.test.ts          # EXISTING
│   │   ├── parent-validation.test.ts      # EXISTING
│   │   ├── prd-compliance.test.ts         # EXISTING
│   │   └── e2e-prd-validation.test.ts     # EXISTING
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: getRoot() and isDescendantOf() are protected/private methods
// Must cast to 'any' to access in tests:
const root = (deepestChild as any).getRoot();
const isDescendant = (deepestChild as any).isDescendantOf(root);

// CRITICAL: Workflow constructor auto-attaches child when parent is provided
// Pattern from workflow.ts:113-116
const child = new Workflow('Child', parent); // Auto-attaches to parent
// No need to call attachChild() separately when using constructor

// CRITICAL: Test depth must be below actual stack limit
// JavaScript V8 call stack ~10,000-15,000 frames
// Test at 1000 levels to verify safety margin (10% of limit)

// CRITICAL: Existing test in edge-case.test.ts only goes to 100 levels
// This PRP extends to 1000+ levels as specified in Pattern 8

// CRITICAL: Use Vitest globals: true (no imports needed for describe/it/expect)
// Pattern from vitest.config.ts

// CRITICAL: Console methods should be mocked in beforeEach
// Pattern from circular-reference.test.ts:33-37
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// CRITICAL: Restore mocks in afterEach
afterEach(() => {
  vi.restoreAllMocks();
});
```

## Implementation Blueprint

### Data models and structure

No new data models needed - using existing Workflow class and testing infrastructure.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  - IMPLEMENT: DeepHierarchyStressTest describe block with test suite
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (lines 262-295)
  - FOLLOW pattern: src/__tests__/adversarial/circular-reference.test.ts (lines 16-26 for SimpleWorkflow)
  - NAMING: describe('Deep Hierarchy Stress Tests', () => {...})
  - PLACEMENT: Adversarial test suite directory

Task 2: IMPLEMENT SimpleWorkflow Helper Class
  - IMPLEMENT: SimpleWorkflow class extending Workflow with minimal run() method
  - FOLLOW pattern: src/__tests__/adversarial/circular-reference.test.ts (lines 20-26)
  - NAMING: class SimpleWorkflow extends Workflow
  - IMPLEMENT: async run(): Promise<string> method with setStatus calls
  - PLACEMENT: Top of test file, before describe blocks

Task 3: IMPLEMENT Test Setup and Teardown
  - IMPLEMENT: beforeEach block with console method mocking
  - FOLLOW pattern: src/__tests__/adversarial/circular-reference.test.ts (lines 33-37)
  - IMPLEMENT: afterEach block with vi.restoreAllMocks()
  - FOLLOW pattern: src/__tests__/adversarial/circular-reference.test.ts (lines 43-45)
  - IMPORT: vi from 'vitest' (along with describe, it, expect)
  - PLACEMENT: Inside describe block, before test cases

Task 4: IMPLEMENT Deep Hierarchy Creation Test (1000+ levels)
  - IMPLEMENT: Test case "should create 1000+ level deep workflow hierarchy"
  - CREATE: Root workflow using SimpleWorkflow('Root')
  - CREATE: Loop to build 1000-level deep chain
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (lines 264-282)
  - IMPLEMENT: let lastWorkflow variable pattern for chain building
  - IMPLEMENT: DynamicWorkflow class inside loop (or use attachChild in loop)
  - ASSERT: Verify depth by walking parent chain equals expected depth
  - NAMING: it('should create 1000+ level deep workflow hierarchy', () => {...})

Task 5: IMPLEMENT getRoot() Stress Test
  - IMPLEMENT: Test case "should call getRoot() on deepest child without stack overflow"
  - BUILD: 1000+ level deep hierarchy (reuse or extract helper)
  - CALL: (deepestChild as any).getRoot() and capture result
  - ASSERT: Result.id === root.id (correct root returned)
  - ASSERT: No stack overflow error thrown
  - TIMING: Optionally measure and assert completion time < 1000ms
  - NAMING: it('should call getRoot() on deepest child without stack overflow', () => {...})

Task 6: IMPLEMENT isDescendantOf() Stress Test
  - IMPLEMENT: Test case "should call isDescendantOf() without stack overflow on deep hierarchy"
  - BUILD: 1000+ level deep hierarchy with root -> child1 -> child2 ... -> child1000
  - CALL: (deepestChild as any).isDescendantOf(root)
  - ASSERT: Returns true (deepest is descendant of root)
  - CALL: (root as any).isDescendantOf(deepestChild)
  - ASSERT: Returns false (root is not descendant of deepest)
  - ASSERT: No stack overflow error thrown
  - NAMING: it('should call isDescendantOf() without stack overflow on deep hierarchy', () => {...})

Task 7: IMPLEMENT Performance Threshold Test
  - IMPLEMENT: Test case "should complete deep tree operations within acceptable time"
  - BUILD: 1000+ level deep hierarchy
  - MEASURE: startTime = performance.now()
  - EXECUTE: getRoot() and isDescendantOf() calls
  - MEASURE: endTime = performance.now()
  - CALCULATE: duration = endTime - startTime
  - ASSERT: duration < 1000 (operations complete in < 1 second)
  - NAMING: it('should complete deep tree operations within acceptable time', () => {...})

Task 8: VALIDATE Full Test Suite
  - RUN: npm test or vitest run
  - VERIFY: New deep-hierarchy-stress.test.ts tests pass
  - VERIFY: All existing tests still pass (no regression)
  - CHECK: Test count increases appropriately
  - VALIDATE: No console errors or warnings
```

### Implementation Patterns & Key Details

```typescript
// Pattern: SimpleWorkflow Helper Class
// Source: src/__tests__/adversarial/circular-reference.test.ts:20-26
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// Pattern: Deep Hierarchy Creation Loop
// Source: src/__tests__/adversarial/edge-case.test.ts:264-282
// Modified for 1000+ levels
it('should create 1000+ level deep workflow hierarchy', () => {
  const DEPTH = 1000;
  let lastWorkflow: any = null;

  for (let i = 0; i < DEPTH; i++) {
    const name = `Workflow-${i}`;

    // Option A: Use constructor with parent (auto-attaches)
    lastWorkflow = new SimpleWorkflow(name, lastWorkflow);

    // Option B: Use attachChild() explicitly
    // const child = new SimpleWorkflow(name);
    // if (lastWorkflow) {
    //   lastWorkflow.attachChild(child);
    // }
    // lastWorkflow = child;
  }

  // Verify hierarchy depth
  let depth = 0;
  let current: any = lastWorkflow;
  while (current.parent) {
    depth++;
    current = current.parent;
  }

  expect(depth).toBe(DEPTH - 1); // -1 because root has no parent
});

// Pattern: getRoot() Stress Test
it('should call getRoot() on deepest child without stack overflow', () => {
  const DEPTH = 1000;
  const root = new SimpleWorkflow('Root');
  let current: any = root;

  // Build deep hierarchy
  for (let i = 0; i < DEPTH; i++) {
    const child = new SimpleWorkflow(`Child-${i}`, current);
    current = child;
  }

  // getRoot() is protected - cast to any
  const foundRoot = current.getRoot();

  // Verify correct root returned
  expect(foundRoot.id).toBe(root.id);
  expect(foundRoot.node.name).toBe('Root');
});

// Pattern: isDescendantOf() Stress Test
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
  // CRITICAL: Test both positive and negative cases
  const isDescendant = current.isDescendantOf(root);
  expect(isDescendant).toBe(true);

  const notDescendant = root.isDescendantOf(current);
  expect(notDescendant).toBe(false);
});

// Pattern: Performance Measurement
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
  const foundRoot = current.getRoot();
  const getRootDuration = performance.now() - startTime;

  expect(foundRoot.id).toBe(root.id);
  expect(getRootDuration).toBeLessThan(100); // Should be very fast (< 100ms)

  // Measure isDescendantOf() performance
  const measureStart = performance.now();
  const isDescendant = current.isDescendantOf(root);
  const checkDuration = performance.now() - measureStart;

  expect(isDescendant).toBe(true);
  expect(checkDuration).toBeLessThan(100); // Should be very fast (< 100ms)
});
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - command: "npm test" or "vitest run"
  - pattern: All tests in src/__tests__/**/*.test.ts are auto-discovered
  - config: vitest.config.ts with globals: true

EXISTING_TESTS:
  - file: src/__tests__/adversarial/edge-case.test.ts
    reference: lines 262-295 (existing 100-level test)
    note: Extending to 1000+ levels as specified in Pattern 8

  - file: src/__tests__/adversarial/circular-reference.test.ts
    reference: SimpleWorkflow class pattern, console mocking

CODE_UNDER_TEST:
  - file: src/core/workflow.ts
    methods: getRoot() (protected), isDescendantOf() (private)
    access: Cast to 'any' in tests to access protected/private members
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Expected: Zero TypeScript errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new test file specifically
npm test deep-hierarchy-stress

# Run full adversarial test suite
npm test -- src/__tests__/adversarial/

# Full test suite for regression check
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Expected output: Test count increases (from ~241 to ~245+)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test file is discovered by Vitest
npm test -- --listTests 2>&1 | grep deep-hierarchy-stress

# Run tests with coverage (if available)
npm test -- --coverage

# Expected: deep-hierarchy-stress.test.ts appears in test list
# Expected: All tests pass, coverage includes new file
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual Performance Validation (if needed)
node -e "
const { Workflow } = require('./dist/index.js');

class TestWF extends Workflow {
  async run() { return 'done'; }
}

const root = new TestWF('Root');
let current = root;

// Build 1000 deep
for (let i = 0; i < 1000; i++) {
  current = new TestWF('C-' + i, current);
}

const start = Date.now();
const r = current.getRoot();
const duration = Date.now() - start;

console.log('getRoot() duration:', duration, 'ms');
console.log('Correct root:', r.id === root.id);
"

# Expected: Duration < 100ms, correct root returned
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Test file created at: `src/__tests__/adversarial/deep-hierarchy-stress.test.ts`
- [ ] Test follows existing patterns from adversarial suite

### Feature Validation

- [ ] Deep hierarchy (1000+ levels) created successfully
- [ ] getRoot() called on deepest child returns root without stack overflow
- [ ] isDescendantOf() tested and doesn't overflow on deep chains
- [ ] Performance threshold met (< 1 second for all operations)
- [ ] No regression in existing test suite (241+ tests still pass)

### Code Quality Validation

- [ ] Follows existing test patterns (SimpleWorkflow, console mocking, etc.)
- [ ] File placement matches desired codebase tree structure
- [ ] Test naming consistent with adversarial suite conventions
- [ ] Proper use of Vitest globals (describe, it, expect, vi)

### Documentation & Deployment

- [ ] Code is self-documenting with clear test descriptions
- [ ] Comments explain stress test purpose (Pattern 8 reference)
- [ ] No new environment variables or configuration needed

---

## Anti-Patterns to Avoid

- ❌ Don't use recursion to build the test hierarchy (use iteration to avoid stack overflow in test itself)
- ❌ Don't test at exactly the stack limit (test at 1000, not 10000+ levels)
- ❌ Don't forget to cast to `any` when accessing protected/private methods
- ❌ Don't skip performance validation - deep operations should still be fast
- ❌ Don't create tests that take too long (keep individual tests < 2 seconds)
- ❌ Don't forget to validate both positive and negative cases for isDescendantOf()
- ❌ Don't hardcode depth in multiple places (use const DEPTH = 1000)
- ❌ Don't skip console mocking (follow existing patterns from circular-reference.test.ts)
