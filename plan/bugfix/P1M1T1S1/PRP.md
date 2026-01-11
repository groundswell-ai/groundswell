name: "P1.M1.T1.S1: Write Failing Test for Parent Validation"
description: |

---

## Goal

**Feature Goal**: Write a failing TDD test that validates the `attachChild()` method throws an error when attempting to attach a child workflow that already has a different parent.

**Deliverable**: A new test file `src/__tests__/adversarial/parent-validation.test.ts` with a failing test that:
1. Creates two parent workflows (Parent1, Parent2)
2. Creates a child workflow with Parent1 as its parent
3. Attempts to attach the child to Parent2
4. Verifies an Error is thrown with message containing 'already has a parent'
5. Mocks console.log to verify error message is helpful

**Success Definition**:
- Test runs with `npm test` and FAILS (red phase of TDD)
- Test fails because `attachChild()` does NOT check if child has a different parent
- Test properly documents expected behavior through its name and assertions
- Test can be imported by Vitest test runner
- console.log mocking is properly set up to capture error messages

## User Persona (if applicable)

**Target User**: Developer implementing the bug fix (Step S2)

**Use Case**: The developer needs a clear, executable test specification that documents the expected behavior of the parent validation feature.

**User Journey**:
1. Developer reads this PRP to understand requirements
2. Developer runs the test to see it fail (confirming bug exists)
3. Developer implements the validation logic in `attachChild()`
4. Developer runs test again to see it pass
5. Developer proceeds to Step S3 (verify no regressions)

**Pain Points Addressed**:
- Without a failing test, there's no clear specification of expected behavior
- Without console.log mocking, error messages can't be verified for helpfulness
- Without TDD approach, implementation might miss edge cases

## Why

- **Quality Assurance**: TDD ensures the fix is tested before implementation
- **Documentation**: Failing test serves as living documentation of expected behavior
- **Bug Prevention**: Tests prevent regression of this specific bug
- **Developer Experience**: Clear test makes implementation unambiguous
- **Integration**: Follows existing test patterns in the codebase for consistency

## What

Write a failing test that validates `attachChild()` throws an error when attempting to attach a child workflow that already has a different parent.

### Test Specification

The test must:
1. Create two parent workflow instances (Parent1, Parent2)
2. Create a child workflow with Parent1 as parent (via constructor)
3. Call `parent2.attachChild(child)`
4. Assert that an Error is thrown
5. Assert that error message contains 'already has a parent'
6. Use Vitest's `vi.spyOn()` to mock console.log
7. Verify console.error is called with helpful error message
8. Clean up mocks in `afterEach`

### Success Criteria

- [ ] Test file exists at `src/__tests__/adversarial/parent-validation.test.ts`
- [ ] Test runs with `npm test` and FAILS (red phase)
- [ ] Test fails because validation does not exist (not because of syntax errors)
- [ ] Test name clearly describes behavior: "should throw when attaching child that already has a different parent"
- [ ] Error message assertion uses `expect().toThrow()` pattern
- [ ] console.log mocking follows existing patterns from `workflow.test.ts`
- [ ] Test is properly isolated with `beforeEach`/`afterEach` hooks
- [ ] Test can be imported and executed by Vitest

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES. This PRP provides:
- Exact file paths and locations
- Complete test patterns to follow
- Bug analysis showing the issue
- Research documentation for all testing patterns
- Existing test file references for patterns
- Specific validation commands

### Documentation & References

```yaml
# MUST READ - Bug Analysis
- file: plan/docs/bugfix-architecture/bug_analysis.md
  why: Contains detailed analysis of the attachChild() bug
  critical: Bug is in src/core/workflow.ts:187-201, only checks if child is already attached to THIS workflow
  section: "Current Implementation (Buggy)" - shows exact code causing the issue

# MUST READ - Existing Test Patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Reference for test structure, describe/it patterns, observer mocking
  pattern: AAA pattern (Arrange-Act-Assert), beforeEach/afterEach hooks, expect().toThrow() usage
  gotcha: Tests use class-based Workflow inheritance pattern (SimpleWorkflow extends Workflow)

# MUST READ - Adversarial Test Patterns
- file: src/__tests__/adversarial/edge-case.test.ts
  why: Reference for adversarial/edge case test organization and patterns
  pattern: Nested describe blocks, descriptive test names, edge case scenarios
  gotcha: This is where the new parent-validation test should live

# MUST READ - Implementation File
- file: src/core/workflow.ts
  why: The attachChild() method that needs testing
  pattern: Lines 187-201 show current (buggy) implementation
  gotcha: Constructor auto-attaches children if parent is provided (lines 113-116)

# MUST READ - Event Types
- file: src/types/events.ts
  why: Understanding WorkflowEvent types for observer testing
  pattern: childAttached event structure

# RESEARCH - Console Mocking Patterns
- docfile: plan/bugfix/P1M1T1S1/research/console-mocking.md
  why: Complete patterns for mocking console.log in Vitest
  section: "Basic Spying Patterns", "Mocking Console Methods"
  critical: Shows vi.spyOn() usage with beforeEach/afterEach cleanup

# RESEARCH - TDD Patterns
- docfile: plan/bugfix/P1M1T1S1/research/tdd-patterns.md
  why: How to write proper failing tests (red phase)
  section: "The Red Phase", "Failing for the Right Reason"
  critical: Tests should fail because functionality doesn't exist, not syntax errors

# RESEARCH - Error Assertions
- docfile: plan/bugfix/P1M1T1S1/research/error-assertions.md
  why: Patterns for asserting errors are thrown with specific messages
  section: "Basic Error Assertions", "Partial Message Matching"
  critical: Shows expect().toThrow('already has a parent') pattern

# EXTERNAL - Vitest Documentation
- url: https://vitest.dev/guide/mocking.html
  why: Official Vitest mocking documentation
  section: vi.spyOn(), mockImplementation()

# EXTERNAL - Vitest Expect API
- url: https://vitest.dev/api/expect.html
  why: Official Vitest assertion documentation
  section: toThrow(), toHaveBeenCalledWith()
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── deep-analysis.test.ts
│   │   │   ├── edge-case.test.ts      # REFERENCE: Adversarial test patterns
│   │   │   ├── e2e-prd-validation.test.ts
│   │   │   └── prd-compliance.test.ts
│   │   ├── integration/
│   │   │   ├── agent-workflow.test.ts
│   │   │   └── tree-mirroring.test.ts
│   │   └── unit/
│   │       ├── workflow.test.ts       # REFERENCE: Test structure patterns
│   │       ├── decorators.test.ts
│   │       └── ...
│   ├── core/
│   │   ├── workflow.ts                # TARGET: attachChild() at lines 187-201
│   │   ├── logger.ts
│   │   └── ...
│   ├── types/
│   │   ├── events.ts                  # REFERENCE: WorkflowEvent types
│   │   ├── workflow.ts                # REFERENCE: WorkflowNode interface
│   │   └── ...
│   └── index.ts                       # Main exports
├── plan/
│   └── bugfix/
│       └── P1M1T1S1/
│           ├── PRP.md                 # THIS FILE
│           └── research/
│               ├── console-mocking.md
│               ├── tdd-patterns.md
│               └── error-assertions.md
├── package.json                       # Scripts: "test": "vitest run"
├── vitest.config.ts                   # Test configuration
└── tsconfig.json
```

### Desired Codebase Tree with Files to be Added

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   ├── parent-validation.test.ts  # NEW: Failing test for parent validation
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
// If you create a workflow with `new Workflow('Child', parent)`, it automatically
// calls parent.attachChild(this) in the constructor. This means:
// - Creating child with parent = child is already attached
// - Calling attachChild() again on same parent = throws duplicate error
// - Calling attachChild() on DIFFERENT parent = BUG (no validation)

// CRITICAL: Test class must extend Workflow
// Pattern from workflow.test.ts:4-11
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}

// CRITICAL: Vitest globals are enabled
// File: vitest.config.ts, line 6
// No need to import describe/it/expect from 'vitest' - they're global

// CRITICAL: Use .js extensions in imports
// TypeScript ES modules require .js extensions even for .ts files
// Example: import { Workflow } from '../../index.js';

// CRITICAL: console.log mocking requires cleanup
// Always use vi.restoreAllMocks() in afterEach to prevent test pollution

// CRITICAL: Error message matching is partial
// Use .toThrow('already has a parent') for partial string matching
// Do NOT use exact matching unless message is guaranteed

// CRITICAL: Observer pattern for testing events
// Events propagate to root workflow observers only
// Use root.addObserver() to capture childAttached events
```

## Implementation Blueprint

### Data Models and Structure

No new data models required for this step. This is a test-only step.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/parent-validation.test.ts
  - IMPLEMENT: Test suite with failing parent validation test
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts (test structure, SimpleWorkflow class)
  - FOLLOW pattern: src/__tests__/adversarial/edge-case.test.ts (adversarial test organization)
  - NAMING: describe('Adversarial: Parent Validation', () => {...})
  - NAMING: it('should throw when attaching child that already has a different parent')
  - PLACEMENT: New file in src/__tests__/adversarial/
  - DEPENDENCIES: Import Workflow, vi from 'vitest' (if needed), expect

Task 2: IMPLEMENT test setup and teardown
  - IMPLEMENT: beforeEach hook to set up console.log spy
  - IMPLEMENT: afterEach hook to restore mocks
  - FOLLOW pattern: research/console-mocking.md "Basic Spying Patterns"
  - GOTCHA: Must use vi.restoreAllMocks() to prevent test pollution

Task 3: IMPLEMENT the failing test logic
  - ARRANGE: Create parent1, parent2, child (with parent1)
  - ACT: Call parent2.attachChild(child)
  - ASSERT: expect(() => parent2.attachChild(child)).toThrow('already has a parent')
  - ASSERT: expect(console.error).toHaveBeenCalledWith(expect.stringContaining('parent'))
  - FOLLOW pattern: research/error-assertions.md "Partial Message Matching"
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts:241-250 (duplicate attachment test)

Task 4: VERIFY test file compiles
  - RUN: npm run lint (TypeScript compilation check)
  - EXPECT: No type errors
  - GOTCHA: Use .js extensions in imports
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: SimpleWorkflow class for testing
// Source: src/__tests__/unit/workflow.test.ts:4-11
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// Pattern 2: Console log spying with cleanup
// Source: research/console-mocking.md "Basic Spying Patterns"
import { vi, beforeEach, afterEach, expect, describe, it } from 'vitest';

describe('Adversarial: Parent Validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // tests...
});

// Pattern 3: Error assertion with partial message matching
// Source: research/error-assertions.md "Partial Message Matching"
it('should throw when attaching child that already has a different parent', () => {
  // Arrange
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  // Act & Assert
  expect(() => parent2.attachChild(child)).toThrow('already has a parent');
});

// Pattern 4: Verifying console.error was called
// Source: research/console-mocking.md "Verifying Error Messages"
it('should log helpful error message to console', () => {
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  try {
    parent2.attachChild(child);
  } catch (err) {
    // Expected
  }

  expect(console.error).toHaveBeenCalled();
});

// GOTCHA: Constructor auto-attaches children
// Source: src/core/workflow.ts:113-116
// When creating `new SimpleWorkflow('Child', parent1)`, the constructor
// automatically calls parent1.attachChild(this). This means:
// - child.parent is set to parent1
// - parent1.children contains child
// - childAttached event is emitted

// CRITICAL: The bug is that attachChild() doesn't check if child.parent !== null && child.parent !== this
// Source: plan/docs/bugfix-architecture/bug_analysis.md "Current Implementation (Buggy)"
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
  - imports: Workflow, WorkflowObserver (if needed)
  - gotcha: Must use .js extension for ES modules
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# Expected: No type errors. If errors exist, READ output and fix imports (.js extensions)

# Run just the new test file (should FAIL - this is correct for TDD red phase)
npx vitest run src/__tests__/adversarial/parent-validation.test.ts
# Expected: Test FAILS with "attachChild is not a function" or similar
# This confirms the bug exists (validation not implemented)

# If test passes unexpectedly, something is wrong
# Check: Did you create the test correctly? Is the validation already implemented?
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the failing test to confirm it fails for the right reason
npx vitest run src/__tests__/adversarial/parent-validation.test.ts

# Expected output:
# FAIL src/__tests__/adversarial/parent-validation.test.ts [line X]
# Error: Expected throw... but no error was thrown
# OR
# Error: Expected message containing 'already has a parent' but got 'Child already attached to this workflow'

# This confirms the bug: attachChild() only checks for duplicate attachment to THIS parent,
# not if child has a DIFFERENT parent

# Quick verification of the current buggy behavior
node -e "
import { Workflow } from './dist/index.js';
class TestWF extends Workflow {
  async run() { return 'done'; }
}
const p1 = new TestWF('P1');
const p2 = new TestWF('P2');
const c = new TestWF('C', p1);
p2.attachChild(c); // This should throw but doesn't (BUG!)
console.log('BUG CONFIRMED: child attached to two parents');
console.log('c.parent === p1:', c.parent === p1);
console.log('p1.children.includes(c):', p1.children.includes(c));
console.log('p2.children.includes(c):', p2.children.includes(c));
"
```

### Level 3: Integration Testing (System Validation)

```bash
# Ensure new test doesn't break existing tests
npm test
# Expected: All existing tests pass, new parent-validation.test.ts FAILS

# Check test count increased
# Before: X tests passing
# After: X+1 tests (X passing, 1 failing)

# Verify test is discovered by Vitest
npx vitest run --reporter=verbose | grep parent-validation
# Expected: Shows test file and test name

# Manual verification of bug behavior
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class W extends Workflow {
    async run() {}
  }
  const p1 = new W('P1');
  const p2 = new W('P2');
  const c = new W('C', p1);
  try {
    p2.attachChild(c);
    console.log('BUG: No error thrown!');
    console.log('Inconsistent state:');
    console.log('  c.parent === p1:', c.parent === p1);
    console.log('  p1 has child:', p1.children.includes(c));
    console.log('  p2 has child:', p2.children.includes(c));
  } catch(e) {
    console.log('FIXED: Error thrown -', e.message);
  }
});
"
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify test serves as documentation
# Read the test name aloud: "should throw when attaching child that already has a different parent"
# Does it clearly describe expected behavior? YES

# Verify test is isolated
npx vitest run src/__tests__/adversarial/parent-validation.test.ts --reporter=dot
# Run 10 times - should fail every time with same reason

# Verify console mock captures output
# Modify test temporarily to see what console.error captures:
# afterEach(() => {
#   console.log('Captured:', (console.error as any).mock.calls);
#   vi.restoreAllMocks();
# });

# Test different error message patterns
# Try: .toThrow(/already.*parent/i) - regex matching
# Try: .toThrow(expect.stringContaining('parent')) - Jest matcher style

# Verify test follows TDD red phase principles
# Source: research/tdd-patterns.md "The Red Phase"
# Checklist:
# - Test fails because functionality doesn't exist ✓
# - Test does NOT fail due to syntax errors ✓
# - Test name describes behavior, not implementation ✓
# - Test is readable and serves as documentation ✓
```

## Final Validation Checklist

### Technical Validation

- [ ] All Level 1-4 validations completed
- [ ] TypeScript compilation passes: `npm run lint`
- [ ] Test file created at correct path: `src/__tests__/adversarial/parent-validation.test.ts`
- [ ] Test FAILS when run (red phase of TDD)
- [ ] Test fails for the RIGHT reason (validation doesn't exist, not syntax error)
- [ ] console.log mocking is properly set up and cleaned up
- [ ] Imports use .js extensions for ES modules

### Feature Validation

- [ ] Test name: "should throw when attaching child that already has a different parent"
- [ ] Test creates Parent1, Parent2, Child workflows
- [ ] Child is created with Parent1 (via constructor)
- [ ] Test calls parent2.attachChild(child)
- [ ] Test asserts Error is thrown with message containing 'already has a parent'
- [ ] Test verifies console.error is called with helpful message
- [ ] beforeEach/afterEach hooks properly manage mocks

### Code Quality Validation

- [ ] Follows existing test patterns from `workflow.test.ts`
- [ ] Follows adversarial test organization from `edge-case.test.ts`
- [ ] Uses SimpleWorkflow class pattern for test workflows
- [ ] AAA pattern (Arrange-Act-Assert) is clear
- [ ] Test is isolated (no shared state between tests)
- [ ] Test serves as documentation of expected behavior

### TDD Red Phase Validation

- [ ] Test is written BEFORE implementation (S1 before S2)
- [ ] Test FAILS initially (confirming bug exists)
- [ ] Test will PASS after implementation in S2
- [ ] Test clearly documents expected behavior
- [ ] Test name uses "should" convention
- [ ] Test failure message is clear and actionable

---

## Anti-Patterns to Avoid

- ❌ Don't create test in wrong directory (must be `src/__tests__/adversarial/`)
- ❌ Don't forget .js extension in imports
- ❌ Don't forget vi.restoreAllMocks() in afterEach
- ❌ Don't use exact string matching for error messages (use partial matching)
- ❌ Don't write test that passes (this is red phase - test must fail)
- ❌ Don't create test that fails due to syntax errors (must fail due to missing validation)
- ❌ Don't forget to extend Workflow class for test workflows
- ❌ Don't skip beforeEach/afterEach hooks (test isolation)
- ❌ Don't use async/await unnecessarily (attachChild is synchronous)
- ❌ Don't create multiple behaviors in one test (one behavior per test)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Reasoning**:
1. Complete bug analysis with exact line numbers
2. Existing test patterns referenced and analyzed
3. Research documentation for all testing patterns (console mocking, TDD, error assertions)
4. Specific file paths and code patterns provided
5. Validation commands are project-specific and verified
6. Anti-patterns section prevents common mistakes
7. PRD requirements are clearly referenced

**Next Steps After This PRP**:
1. Implement parent validation in S2 (P1.M1.T1.S2)
2. Verify test passes in S3 (P1.M1.T1.S3)
3. Continue with circular reference detection (P1.M1.T2)
