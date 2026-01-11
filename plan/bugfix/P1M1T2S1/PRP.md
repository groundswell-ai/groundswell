name: "P1.M1.T2.S1: Write Failing Test for Circular Reference Detection"
description: |

---

## Goal

**Feature Goal**: Write failing TDD tests that validate the `attachChild()` method throws an error when attempting to attach an ancestor workflow as a child (which would create a circular reference).

**Deliverable**: A new test file `src/__tests__/adversarial/circular-reference.test.ts` with TWO failing tests that:
1. Test immediate circular reference: `child.attachChild(parent)` throws error
2. Test ancestor circular reference: Multi-level hierarchy (root -> child1 -> child2) where `child2.attachChild(root)` throws error
3. Both tests verify error message contains 'circular' OR 'cycle' OR 'ancestor'
4. Console is mocked to capture error messages

**Success Definition**:
- Tests run with `npm test` and FAIL (red phase of TDD)
- Tests fail because `attachChild()` does NOT check for circular references
- Tests properly document expected behavior through their names and assertions
- Tests can be imported by Vitest test runner
- console.log mocking is properly set up to capture error messages

## User Persona (if applicable)

**Target User**: Developer implementing the circular reference detection (Step S2)

**Use Case**: The developer needs clear, executable test specifications that document the expected behavior of circular reference detection in the `attachChild()` method.

**User Journey**:
1. Developer reads this PRP to understand requirements
2. Developer runs the tests to see them fail (confirming bug exists)
3. Developer implements `isDescendantOf()` helper method in `Workflow` class
4. Developer integrates circular reference check into `attachChild()`
5. Developer runs tests again to see them pass
6. Developer proceeds to Step S3 (verify no regressions)

**Pain Points Addressed**:
- Without failing tests, there's no clear specification of circular reference prevention
- Without two test scenarios, edge cases might be missed (immediate vs. ancestor)
- Without console.log mocking, error messages can't be verified for helpfulness
- Without TDD approach, implementation might miss complex circular reference scenarios

## Why

- **Quality Assurance**: TDD ensures the fix is tested before implementation
- **Documentation**: Failing tests serve as living documentation of expected behavior
- **Bug Prevention**: Tests prevent regression of circular reference bugs
- **Tree Integrity**: Circular references break the hierarchical tree structure and cause infinite loops
- **Observer System**: The `getRootObservers()` method already has cycle detection - we need prevention at attachment time
- **Integration**: Follows existing test patterns from P1.M1.T1.S1 for consistency

## What

Write TWO failing tests that validate `attachChild()` throws an error when attempting to attach an ancestor workflow as a child.

### Test Scenarios

**Scenario 1: Immediate Circular Reference**
- Create parent and child workflows
- Attempt `child.attachChild(parent)`
- Assert Error is thrown with message containing 'circular' OR 'cycle' OR 'ancestor'

**Scenario 2: Ancestor Circular Reference (Multi-level)**
- Create 3-level hierarchy: root -> child1 -> child2
- Attempt `child2.attachChild(root)`
- Assert Error is thrown with message containing 'circular' OR 'cycle' OR 'ancestor'

### Success Criteria

- [ ] Test file exists at `src/__tests__/adversarial/circular-reference.test.ts`
- [ ] Tests run with `npm test` and FAIL (red phase)
- [ ] Tests fail because circular reference detection does not exist (not because of syntax errors)
- [ ] Test 1 name: "should throw when attaching immediate parent as child"
- [ ] Test 2 name: "should throw when attaching ancestor as child"
- [ ] Error message assertion uses regex: `toThrow(/circular|cycle|ancestor/i)`
- [ ] console.log mocking follows existing patterns from `parent-validation.test.ts`
- [ ] Tests are properly isolated with `beforeEach`/`afterEach` hooks
- [ ] Tests can be imported and executed by Vitest

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES. This PRP provides:
- Exact file paths and locations
- Complete test patterns to follow (from P1.M1.T1.S1)
- Bug analysis showing the circular reference issue
- Research documentation for cycle detection algorithms
- Existing test file references for patterns
- Specific validation commands

### Documentation & References

```yaml
# MUST READ - Bug Analysis and Implementation Patterns
- file: plan/docs/bugfix-architecture/implementation_patterns.md
  why: Contains Pattern 2 - Circular Reference Detection with algorithm patterns
  critical: Shows isDescendantOf() implementation pattern and usage in attachChild()
  section: "Pattern 2: Circular Reference Detection" - lines 55-96

# MUST READ - Reference Test Pattern from P1.M1.T1.S1
- file: src/__tests__/adversarial/parent-validation.test.ts
  why: Complete reference pattern for TDD red phase tests, console mocking, error assertions
  pattern: Console mocking with beforeEach/afterEach, AAA pattern, SimpleWorkflow fixture
  gotcha: This is the exact pattern to follow - same structure, different test scenarios

# MUST READ - Current Workflow Implementation
- file: src/core/workflow.ts
  why: The attachChild() method that needs circular reference detection
  pattern: Lines 187-216 show current implementation (missing cycle check)
  gotcha: Lines 213-218 in getRootObservers() show existing cycle detection pattern to follow

# MUST READ - Cycle Detection Research
- docfile: plan/bugfix/P1M1T2S1/research/cycle-detection-algorithms.md
  why: Complete isDescendantOf() implementation pattern with code examples
  section: "isDescendantOf() Pattern", "Test Scenarios to Cover"
  critical: Shows traversal algorithm with visited Set for safety

# RESEARCH - Test Patterns
- docfile: plan/bugfix/P1M1T2S1/research/test-patterns.md
  why: Reference test patterns from P1.M1.T1.S1 adapted for circular reference tests
  section: "Adapting Pattern for Circular Reference Tests"

# RESEARCH - Workflow Class Structure
- docfile: plan/bugfix/P1M1T2S1/research/workflow-class.md
  why: Complete Workflow class structure, attachChild() implementation, parent/child properties
  section: "Current attachChild() Implementation", "Constructor Auto-Attach Behavior"

# RESEARCH - Codebase Context
- docfile: plan/bugfix/P1M1T2S1/research/codebase-context.md
  why: Project structure, test commands, task status, dependencies
  section: "Test Framework", "Build/Test Commands"

# RESEARCH - Console Mocking (from P1M1T1.S1)
- docfile: plan/bugfix/P1M1T1S1/research/console-mocking.md
  why: Complete patterns for mocking console in Vitest
  section: "Basic Spying Patterns", "Verifying Error Messages"

# EXTERNAL - Cycle Detection Algorithms
- url: https://github.com/joshnuss/svelte-cycle-detection
  why: Reference implementation of cycle detection in hierarchical trees
  section: WeakSet-based detection pattern

# EXTERNAL - Tree Traversal Patterns
- url: https://en.wikipedia.org/wiki/Tree_traversal
  why: Understanding parent-chain traversal for ancestor detection
  section: "Pre-order traversal", "Cycle detection in graphs"
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── parent-validation.test.ts    # REFERENCE: Test structure pattern from P1.M1.T1.S1
│   │   │   ├── deep-analysis.test.ts
│   │   │   ├── edge-case.test.ts
│   │   │   ├── e2e-prd-validation.test.ts
│   │   │   └── prd-compliance.test.ts
│   │   ├── integration/
│   │   │   ├── agent-workflow.test.ts
│   │   │   └── tree-mirroring.test.ts
│   │   └── unit/
│   │       ├── workflow.test.ts             # REFERENCE: SimpleWorkflow fixture pattern
│   │       └── ...
│   ├── core/
│   │   ├── workflow.ts                      # TARGET: attachChild() at lines 187-216
│   │   │                                    # Also: getRootObservers() at lines 213-218 for cycle pattern
│   │   └── ...
│   ├── types/
│   │   ├── events.ts                        # REFERENCE: WorkflowEvent types
│   │   └── workflow.ts                      # REFERENCE: WorkflowNode interface
│   └── index.ts                             # Main exports
├── plan/
│   └── bugfix/
│       ├── P1M1T1S1/                        # COMPLETED: Parent validation reference
│       │   ├── PRP.md
│       │   └── research/
│       └── P1M1T2S1/                        # CURRENT: Circular reference detection
│           ├── PRP.md                       # THIS FILE
│           └── research/
│               ├── test-patterns.md
│               ├── workflow-class.md
│               ├── cycle-detection-algorithms.md
│               └── codebase-context.md
├── package.json                             # Scripts: "test": "vitest run"
├── vitest.config.ts                         # Test configuration
└── tsconfig.json
```

### Desired Codebase Tree with Files to be Added

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── circular-reference.test.ts  # NEW: Failing tests for circular reference detection
│   │   │   ├── parent-validation.test.ts   # REFERENCE: Test structure from P1.M1.T1.S1
│   │   │   ├── deep-analysis.test.ts
│   │   │   ├── edge-case.test.ts
│   │   │   ├── e2e-prd-validation.test.ts
│   │   │   └── prd-compliance.test.ts
│   │   └── ...
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: Workflow constructor auto-attaches children when parent is provided
// File: src/core/workflow.ts, lines 113-116
// Creating `new Workflow('Child', parent)` automatically calls parent.attachChild(this)
const child = new Workflow('Child', parent);
// This means: child.parent === parent, parent.children.includes(child) === true

// CRITICAL: Test class must extend Workflow
// Pattern from workflow.test.ts:4-11
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// CRITICAL: Vitest globals are enabled
// File: vitest.config.ts
// No need to import describe/it/expect from 'vitest' - they're global

// CRITICAL: Use .js extensions in imports
// TypeScript ES modules require .js extensions even for .ts files
import { Workflow } from '../../index.js';

// CRITICAL: console.log mocking requires cleanup
// Always use vi.restoreAllMocks() in afterEach to prevent test pollution

// CRITICAL: Error message matching is regex with OR pattern
// Use .toThrow(/circular|cycle|ancestor/i) for flexible matching
// This allows any of the three keywords (case-insensitive)

// CRITICAL: Existing cycle detection pattern exists in getRootObservers()
// File: src/core/workflow.ts, lines 213-218
// This shows the Set-based traversal pattern to follow for isDescendantOf()

// CRITICAL: isDescendantOf() is NOT implemented yet
// This is what makes the tests fail - the method doesn't exist
// Step S2 will implement it, Step S3 will verify tests pass

// CRITICAL: Two distinct test scenarios
// 1. Immediate: child.attachChild(parent) - parent is direct parent
// 2. Ancestor: child2.attachChild(root) - root is ancestor up the chain
// Both should throw, but test different code paths
```

## Implementation Blueprint

### Data Models and Structure

No new data models required for this step. This is a test-only step.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/circular-reference.test.ts
  - IMPLEMENT: Test suite with TWO failing circular reference tests
  - FOLLOW pattern: src/__tests__/adversarial/parent-validation.test.ts (exact structure)
  - NAMING: describe('Adversarial: Circular Reference Detection', () => {...})
  - PLACEMENT: New file in src/__tests__/adversarial/
  - DEPENDENCIES: Import Workflow, vi from 'vitest', expect

Task 2: IMPLEMENT test setup and teardown
  - IMPLEMENT: beforeEach hook to set up console.log/error/warn spies
  - IMPLEMENT: afterEach hook to restore mocks with vi.restoreAllMocks()
  - FOLLOW pattern: parent-validation.test.ts lines 33-44

Task 3: IMPLEMENT SimpleWorkflow fixture class
  - IMPLEMENT: class SimpleWorkflow extends Workflow with run() method
  - FOLLOW pattern: workflow.test.ts:4-11, parent-validation.test.ts:20-26
  - NAMING: SimpleWorkflow, async run(): Promise<string>

Task 4: IMPLEMENT Test 1 - Immediate Circular Reference
  - ARRANGE: Create parent and child workflows (child with parent as constructor arg)
  - ACT: Call child.attachChild(parent)
  - ASSERT: expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i)
  - NAMING: it('should throw when attaching immediate parent as child')
  - VERIFY: Initial state shows child.parent === parent

Task 5: IMPLEMENT Test 2 - Ancestor Circular Reference
  - ARRANGE: Create 3-level hierarchy: root -> child1 (child of root) -> child2 (child of child1)
  - ACT: Call child2.attachChild(root)
  - ASSERT: expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/i)
  - NAMING: it('should throw when attaching ancestor as child')
  - VERIFY: Initial state shows proper 3-level hierarchy

Task 6: VERIFY test file compiles and runs
  - RUN: npm run lint (TypeScript compilation check)
  - RUN: npm test (should see new tests FAIL - this is correct for TDD red phase)
  - EXPECT: No type errors, tests fail with "not a function" or similar
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Complete test file structure from parent-validation.test.ts
/**
 * Circular Reference Tests (TDD Red Phase)
 *
 * These tests validate the attachChild() method properly prevents
 * attaching an ancestor workflow as a child (which would create a circular reference).
 *
 * This is the RED phase of TDD - tests are written to FAIL initially,
 * documenting the expected behavior before implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

// Pattern 2: SimpleWorkflow fixture class
// Source: workflow.test.ts:4-11, parent-validation.test.ts:20-26
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// Pattern 3: Test suite structure with console mocking
// Source: parent-validation.test.ts:28-44
describe('Adversarial: Circular Reference Detection', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Pattern 4: Test 1 - Immediate circular reference
  it('should throw when attaching immediate parent as child', () => {
    // ARRANGE: Create parent and child
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Verify initial state
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);

    // ACT & ASSERT: Attempting to attach parent as child should throw
    // This test FAILS because attachChild() doesn't check for circular references
    expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
  });

  // Pattern 5: Test 2 - Ancestor circular reference (multi-level)
  it('should throw when attaching ancestor as child', () => {
    // ARRANGE: Create 3-level hierarchy
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', child1);

    // Verify initial state
    expect(child2.parent).toBe(child1);
    expect(child1.parent).toBe(root);
    expect(root.children).toContain(child1);
    expect(child1.children).toContain(child2);

    // ACT & ASSERT: Attempting to attach root as child of child2 should throw
    // This test FAILS because attachChild() doesn't check isDescendantOf()
    expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
  });
});

// GOTCHA: Constructor auto-attaches children
// Source: src/core/workflow.ts:113-116
// When creating `new SimpleWorkflow('Child', parent)`, the constructor
// automatically calls parent.attachChild(this).

// CRITICAL: The bug is that attachChild() doesn't call this.isDescendantOf(child)
// Source: plan/docs/bugfix-architecture/implementation_patterns.md Pattern 2
// The isDescendantOf() method doesn't exist yet - will be implemented in S2

// Pattern 6: Error assertion with regex OR pattern
// Source: research/error-assertions.md "Regex Pattern Matching"
expect(() => operation()).toThrow(/circular|cycle|ancestor/i);
// This allows any of the three keywords, case-insensitive
```

### Integration Points

```yaml
NONE:
  - This is a test-only step
  - No modifications to source code
  - No new dependencies
  - No configuration changes

TEST_RUNNER:
  - command: npm test
  - pattern: Vitest automatically discovers src/__tests__/**/*.test.ts
  - config: vitest.config.ts already configured

IMPORTS:
  - from: ../../index.js
  - imports: Workflow
  - gotcha: Must use .js extension for ES modules

REFERENCE_TEST:
  - file: src/__tests__/adversarial/parent-validation.test.ts
  - use: Exact structural pattern to follow
  - copy: beforeEach/afterEach, SimpleWorkflow class, describe/it structure
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# Expected: No type errors. If errors exist, check imports use .js extensions

# Run just the new test file (should FAIL - this is correct for TDD red phase)
npx vitest run src/__tests__/adversarial/circular-reference.test.ts
# Expected: Tests FAIL with "isDescendantOf is not a function" or similar
# This confirms the method doesn't exist yet (correct for red phase)

# If tests pass unexpectedly, something is wrong
# Check: Did you create the tests correctly? Is circular reference detection already implemented?
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the failing tests to confirm they fail for the right reason
npx vitest run src/__tests__/adversarial/circular-reference.test.ts

# Expected output (red phase):
# FAIL src/__tests__/adversarial/circular-reference.test.ts [line X]
# Error: Expected throw... but no error was thrown
# OR
# Error: this.isDescendantOf is not a function

# This confirms the bug: attachChild() doesn't check for circular references

# Verify both tests fail
npx vitest run src/__tests__/adversarial/circular-reference.test.ts --reporter=verbose
# Should show 2 tests failing

# Quick verification of current buggy behavior
node -e "
import { Workflow } from './dist/index.js';
class TestWF extends Workflow {
  async run() { return 'done'; }
}
const parent = new TestWF('Parent');
const child = new TestWF('Child', parent);
try {
  child.attachChild(parent); // Should throw but doesn't (BUG!)
  console.log('BUG CONFIRMED: circular reference allowed');
  console.log('Created cycle:', child.parent === parent, parent.children.includes(child));
} catch(e) {
  console.log('FIXED: Error thrown -', e.message);
}
"
```

### Level 3: Integration Testing (System Validation)

```bash
# Ensure new tests don't break existing tests
npm test
# Expected: All existing tests pass, new circular-reference.test.ts tests FAIL

# Check test count increased
# Before: X tests passing (242 from context)
# After: X+2 tests (X passing, 2 failing)

# Verify tests are discovered by Vitest
npx vitest run --reporter=verbose | grep circular-reference
# Expected: Shows test file and both test names

# Manual verification of both circular reference scenarios
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class W extends Workflow {
    async run() {}
  }
  // Test 1: Immediate circular reference
  const parent = new W('Parent');
  const child = new W('Child', parent);
  try {
    child.attachChild(parent);
    console.log('BUG Test 1: No error for immediate circular ref!');
  } catch(e) {
    console.log('PASS Test 1: Error thrown -', e.message);
  }
  // Test 2: Ancestor circular reference
  const root = new W('Root');
  const child1 = new W('Child1', root);
  const child2 = new W('Child2', child1);
  try {
    child2.attachChild(root);
    console.log('BUG Test 2: No error for ancestor circular ref!');
  } catch(e) {
    console.log('PASS Test 2: Error thrown -', e.message);
  }
});
"
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify tests serve as documentation
# Read test names aloud:
# 1. "should throw when attaching immediate parent as child"
# 2. "should throw when attaching ancestor as child"
# Do they clearly describe expected behavior? YES

# Verify tests are isolated
npx vitest run src/__tests__/adversarial/circular-reference.test.ts --reporter=dot
# Run 10 times - should fail every time with same reason

# Verify different error message patterns work
# Try each individually:
# .toThrow(/circular/i)     - Should match
# .toThrow(/cycle/i)        - Should match
# .toThrow(/ancestor/i)     - Should match
# .toThrow(/circular|cycle|ancestor/i) - Should match any

# Verify test follows TDD red phase principles
# Source: plan/bugfix/P1M1T1S1/research/tdd-patterns.md "The Red Phase"
# Checklist:
# - Tests fail because functionality doesn't exist ✓
# - Tests do NOT fail due to syntax errors ✓
# - Test names describe behavior, not implementation ✓
# - Tests are readable and serve as documentation ✓
# - Two scenarios cover both immediate and ancestor cases ✓

# Compare with parent-validation.test.ts pattern
diff -u <(cat src/__tests__/adversarial/parent-validation.test.ts) <(cat src/__tests__/adversarial/circular-reference.test.ts)
# Should show identical structure, different test scenarios
```

## Final Validation Checklist

### Technical Validation

- [ ] All Level 1-4 validations completed
- [ ] TypeScript compilation passes: `npm run lint`
- [ ] Test file created at correct path: `src/__tests__/adversarial/circular-reference.test.ts`
- [ ] Both tests FAIL when run (red phase of TDD)
- [ ] Tests fail for the RIGHT reason (isDescendantOf doesn't exist, not syntax error)
- [ ] console.log mocking is properly set up and cleaned up
- [ ] Imports use .js extensions for ES modules

### Feature Validation

- [ ] Test 1 name: "should throw when attaching immediate parent as child"
- [ ] Test 2 name: "should throw when attaching ancestor as child"
- [ ] Test 1 creates parent, child and attempts child.attachChild(parent)
- [ ] Test 2 creates 3-level hierarchy and attempts child2.attachChild(root)
- [ ] Both tests assert Error thrown with regex: `toThrow(/circular|cycle|ancestor/i)`
- [ ] beforeEach/afterEach hooks properly manage console mocks
- [ ] SimpleWorkflow fixture class extends Workflow

### Code Quality Validation

- [ ] Follows exact test structure from `parent-validation.test.ts`
- [ ] Uses same console mocking pattern (vi.spyOn, vi.restoreAllMocks)
- [ ] AAA pattern (Arrange-Act-Assert) is clear in both tests
- [ ] Tests are isolated (no shared state between tests)
- [ ] Tests serve as documentation of expected behavior
- [ ] Test file includes header comment explaining TDD red phase

### TDD Red Phase Validation

- [ ] Tests are written BEFORE implementation (S1 before S2)
- [ ] Tests FAIL initially (confirming isDescendantOf doesn't exist)
- [ ] Tests will PASS after implementation in S2 (isDescendantOf + attachChild integration)
- [ ] Tests clearly document expected behavior for both scenarios
- [ ] Test names use "should" convention
- [ ] Test failure messages are clear and actionable

---

## Anti-Patterns to Avoid

- ❌ Don't create test in wrong directory (must be `src/__tests__/adversarial/`)
- ❌ Don't forget .js extension in imports
- ❌ Don't forget vi.restoreAllMocks() in afterEach
- ❌ Don't use exact string matching for error messages (use regex OR pattern)
- ❌ Don't write tests that pass (this is red phase - tests must fail)
- ❌ Don't create tests that fail due to syntax errors (must fail due to missing validation)
- ❌ Don't forget to extend Workflow class for test workflows
- ❌ Don't skip beforeEach/afterEach hooks (test isolation)
- ❌ Don't use async/await unnecessarily (attachChild is synchronous)
- ❌ Don't create only ONE test (need both immediate AND ancestor scenarios)
- ❌ Don't combine both scenarios in one test (separate tests for clarity)
- ❌ Don't forget to verify initial state in each test (ARRANGE phase validation)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Reasoning**:
1. Complete reference pattern from P1.M1.T1.S1 with exact code to follow
2. Research documentation for cycle detection algorithms with isDescendantOf() pattern
3. Workflow class analysis showing current attachChild() implementation
4. Two distinct test scenarios clearly specified (immediate + ancestor)
5. Validation commands are project-specific and verified
6. Anti-patterns section prevents common mistakes
7. Console mocking pattern from parent-validation.test.ts is proven to work

**Next Steps After This PRP**:
1. Implement isDescendantOf() helper method in S2 (P1.M1.T2.S2)
2. Integrate circular reference check into attachChild() in S2 (P1.M1.T2.S3)
3. Verify tests pass and no regressions in S4 (P1.M1.T2.S4)
4. Continue with detachChild() implementation (P1.M2)
