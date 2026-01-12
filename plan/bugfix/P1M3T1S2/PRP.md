name: "PRP: Manual Parent Mutation Test for Defensive Validation"
description: |

---

## Goal

**Feature Goal**: Create a test that validates the `attachChild()` method's defensive programming works correctly even when someone manually mutates the `parent` property using TypeScript's `as any` type assertion.

**Deliverable**: A test that demonstrates `attachChild()` validation detects when `child.parent` has been manually mutated to a different parent and throws an appropriate error.

**Success Definition**:
- Test creates `parent1`, `parent2`, and `child` with `parent1`
- Test manually mutates `(child as any).parent = parent2` to bypass TypeScript's type system
- Test calls `parent1.attachChild(child)` which should throw because `child.parent` is now `parent2`, not `parent1`
- Test proves defensive programming works even with manual mutation via `as any`

## User Persona (if applicable)

**Target User**: Developer / QA Engineer validating workflow tree integrity under adversarial conditions

**Use Case**: Verifying that the Workflow class's `attachChild()` method maintains tree invariants even when TypeScript type safety is bypassed

**User Journey**:
1. Developer runs the test suite with `npm test` or `vitest run`
2. Adversarial test executes as part of the test suite
3. Test passes, confirming that `attachChild()` validation works defensively
4. Developer gains confidence in tree integrity validation

**Pain Points Addressed**:
- Risk of inconsistent tree state if someone manually mutates `parent` property
- TypeScript type system can be bypassed with `as any`
- Need to ensure runtime validation catches manual mutations

## Why

- **Business value**: Ensures workflow engine reliability even when developers bypass TypeScript's type system
- **Integration with existing features**: Validates the defensive programming approach in `attachChild()` method
- **Problems this solves**: Confirms that the parent validation check at `src/core/workflow.ts:222-228` catches manual mutations and prevents inconsistent tree state

## What

Create a test that verifies:

1. **Manual Parent Mutation**: Use `(child as any).parent = parent2` to manually mutate the parent property
2. **Defensive Validation**: Call `parent1.attachChild(child)` which should detect the mismatch and throw
3. **Error Verification**: Verify the error message indicates the child already has a parent

### Success Criteria

- [ ] Test added to appropriate test file (`parent-validation.test.ts` or new dedicated file)
- [ ] Test manually mutates `(child as any).parent = parent2`
- [ ] Test calls `parent1.attachChild(child)` and verifies it throws
- [ ] Error message contains "already has a parent"
- [ ] All tests pass with `npm test`
- [ ] No regression in existing test suite

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ This PRP provides:
- Complete `attachChild()` method implementation with validation logic
- Exact line numbers for parent property definition and validation checks
- Test framework setup (Vitest) and commands
- Existing test patterns from adversarial suite to follow
- Implementation patterns and gotchas specific to this codebase
- External research URLs for defensive testing patterns

### Documentation & References

```yaml
# MUST READ - attachChild() Implementation and Validation Logic
- file: src/core/workflow.ts
  why: Understanding the attachChild() method's validation checks at lines 216-255
  pattern: Parent validation at lines 222-228 checks child.parent !== null && child.parent !== this
  pattern: Error message format: "Child 'X' already has a parent 'Y'. Use detachChild()..."
  critical: This is the exact validation logic that should catch manual parent mutations

# MUST READ - Parent Property Definition
- file: src/core/workflow.ts
  why: Understanding that parent property is public and can be manually mutated
  pattern: Line 49: public parent: Workflow | null = null
  gotcha: Since parent is public, it can be directly mutated with (child as any).parent = newValue

# MUST READ - Existing Parent Validation Test Pattern
- file: src/__tests__/adversarial/parent-validation.test.ts
  why: Reference for existing parent validation test pattern and structure
  pattern: SimpleWorkflow class definition (lines 20-26)
  pattern: Console mocking in beforeEach (lines 33-37)
  pattern: Test structure with ARRANGE-ACT-ASSERT comments (lines 58-74)
  pattern: Error assertion with exact message: 'already has a parent'

# MUST READ - Existing Circular Reference Test Pattern
- file: src/__tests__/adversarial/circular-reference.test.ts
  why: Reference for using 'as any' type assertion to test edge cases
  pattern: Line 70: Uses 'as any' for testing: child.attachChild(parent as any)
  pattern: Error assertion with regex: /circular|cycle|ancestor/i
  pattern: Console mocking and restoration pattern (lines 33-45)

# MUST READ - Sibling PRP for Format Reference
- file: plan/bugfix/P1M3T1S1/PRP.md
  why: Reference for PRP format and structure used in this project
  pattern: All sections including Goal, Context, Implementation Blueprint, Validation
  pattern: YAML-based documentation references with specific line numbers

# EXTERNAL RESEARCH - Defensive Programming Test Patterns
- url: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
  why: Best practices for writing tests that verify runtime invariants
  section: "Test Behavior, Not Implementation" principles

- url: https://jestjs.io/docs/expect#tothrowerror
  why: Jest/Vitest error assertion patterns compatible with this project
  section: toThrow() and toThrowError() patterns for testing exceptions

- url: https://basarat.gitbook.io/typescript/type-system/type-assertion#as-any
  why: Understanding TypeScript 'as any' type assertion and its implications
  section: Why 'as any' bypasses type checking and requires runtime validation

- url: https://github.com/goldbergyoni/nodebestpractices#--safety
  why: Defensive programming patterns in Node.js/TypeScript
  section: Runtime validation patterns for type system bypasses

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
│   │   ├── edge-case.test.ts              # Edge case and stress tests
│   │   ├── circular-reference.test.ts     # Circular reference detection tests
│   │   ├── parent-validation.test.ts      # Parent validation tests (PRIMARY LOCATION)
│   │   ├── deep-hierarchy-stress.test.ts  # Deep hierarchy stress tests
│   │   ├── prd-compliance.test.ts         # PRD compliance tests
│   │   └── e2e-prd-validation.test.ts     # E2E validation tests
│   ├── unit/
│   │   └── workflow.test.ts               # Basic Workflow tests
│   └── integration/
│       └── workflow-reparenting.test.ts   # Reparenting integration tests
├── core/
│   └── workflow.ts                        # Main Workflow class with attachChild()
├── types/
│   ├── events.ts
│   └── observer.ts
└── index.ts                               # Main exports

plan/
└── bugfix/
    └── P1M3T1S2/
        └── PRP.md                         # This PRP
```

### Desired Codebase Tree with Files to be Added/Modified

```bash
src/
├── __tests__/
│   ├── adversarial/
│   │   ├── parent-validation.test.ts      # MODIFY: Add new test case for manual mutation
│   │   └── ... (other existing test files)
```

**Note**: This PRP adds a new test case to the existing `parent-validation.test.ts` file rather than creating a new file, as the test is conceptually part of the parent validation test suite.

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: parent property is PUBLIC (line 49 of workflow.ts)
// This means it CAN be manually mutated with 'as any'
public parent: Workflow | null = null;

// CRITICAL: attachChild() validation logic (lines 222-228 of workflow.ts)
// The validation checks: child.parent !== null && child.parent !== this
if (child.parent !== null && child.parent !== this) {
  // Throws error with specific message format
  throw new Error(`Child '${child.node.name}' already has a parent '${child.parent.node.name}'...`);
}

// CRITICAL: Test scenario is that child was created with parent1
// Then someone manually mutates: (child as any).parent = parent2
// Then parent1.attachChild(child) should throw because child.parent is now parent2

// CRITICAL: Error message format from workflow.ts:223-226
// "Child 'X' already has a parent 'Y'. A workflow can only have one parent. Use detachChild()..."

// CRITICAL: Use Vitest globals: true (no imports needed for describe/it/expect)
// Pattern from vitest.config.ts

// CRITICAL: Console methods should be mocked in beforeEach
// Pattern from parent-validation.test.ts:33-37
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// CRITICAL: Restore mocks in afterEach
afterEach(() => {
  vi.restoreAllMocks();
});

// CRITICAL: Existing parent-validation.test.ts already has tests for parent validation
// This new test should follow the same pattern but test the MANUAL MUTATION scenario
// The existing test (lines 58-74) tests: child created with parent1, then parent2.attachChild(child)
// This new test should: child created with parent1, then (child as any).parent = parent2, then parent1.attachChild(child)
```

## Implementation Blueprint

### Data models and structure

No new data models needed - using existing Workflow class and testing infrastructure.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REVIEW Existing parent-validation.test.ts File
  - READ: src/__tests__/adversarial/parent-validation.test.ts
  - UNDERSTAND: Existing test structure and patterns
  - IDENTIFY: Where to add new test case (after line 74, before describe block ends)
  - PATTERN: Follow existing SimpleWorkflow class, console mocking, and test structure

Task 2: ADD New Test Case for Manual Parent Mutation
  - ADD: New it() block after existing test (after line 74)
  - IMPLEMENT: Test case "should throw when manually mutating parent with 'as any' then calling attachChild"
  - ARRANGE: Create parent1, parent2, child with parent1
  - ARRANGE: Manually mutate (child as any).parent = parent2
  - ACT: Call parent1.attachChild(child)
  - ASSERT: expect().toThrow('already has a parent')
  - NAMING: it('should throw when manually mutating parent with as any then calling attachChild', () => {...})

Task 3: VERIFY Test Placement and Structure
  - VERIFY: Test is within the 'Adversarial: Parent Validation' describe block
  - VERIFY: Test follows ARRANGE-ACT-ASSERT pattern with comments
  - VERIFY: Test uses expect(() => ...).toThrow() pattern
  - VERIFY: Error assertion matches expected error message format

Task 4: VALIDATE Full Test Suite
  - RUN: npm test or vitest run
  - VERIFY: New test in parent-validation.test.ts passes
  - VERIFY: All existing tests still pass (no regression)
  - CHECK: Test count increases appropriately
  - VALIDATE: No console errors or warnings
```

### Implementation Patterns & Key Details

```typescript
// Pattern: SimpleWorkflow Helper Class (ALREADY EXISTS in parent-validation.test.ts)
// Source: src/__tests__/adversarial/parent-validation.test.ts:20-26
// No need to redefine - use existing class
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// Pattern: New Test Case for Manual Parent Mutation
// ADD to src/__tests__/adversarial/parent-validation.test.ts after line 74
it('should throw when manually mutating parent with as any then calling attachChild', () => {
  // ARRANGE: Create two parent workflows
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');

  // ARRANGE: Create child with parent1 (constructor auto-attaches)
  // CRITICAL: Constructor calls parent.attachChild(this) at workflow.ts:113-116
  const child = new SimpleWorkflow('Child', parent1);

  // Verify initial state - child should be attached to parent1
  expect(child.parent).toBe(parent1);
  expect(parent1.children).toContain(child);

  // ARRANGE: Manually mutate child.parent using 'as any' to bypass TypeScript
  // This simulates a developer bypassing the type system
  (child as any).parent = parent2;

  // Verify manual mutation worked
  expect(child.parent).toBe(parent2); // Now points to parent2
  expect(parent1.children).toContain(child); // But still in parent1's children array!

  // ACT & ASSERT: parent1.attachChild(child) should throw
  // The validation at workflow.ts:222-228 should detect:
  // - child.parent is not null
  // - child.parent (parent2) !== this (parent1)
  // Therefore, it should throw with "already has a parent" message
  expect(() => parent1.attachChild(child)).toThrow('already has a parent');

  // Additional verification: The error should mention parent2
  // because child.parent is now parent2
  expect(() => parent1.attachChild(child)).toThrow('Parent2');
});

// Pattern: Alternative - More detailed test with error message verification
it('should throw with descriptive error when parent manually mutated', () => {
  // ARRANGE
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  // ARRANGE: Manual mutation via 'as any'
  (child as any).parent = parent2;

  // ACT & ASSERT
  expect(() => parent1.attachChild(child)).toThrow(
    /Child 'Child' already has a parent 'Parent2'/
  );
});

// Pattern: Test comment format (follow existing pattern from parent-validation.test.ts)
/**
 * Test: Manual Parent Mutation with 'as any'
 *
 * Scenario: Even if someone manually mutates child.parent using 'as any',
 * attachChild() should still validate and throw an error.
 *
 * This tests the defensive programming aspect of the parent validation
 * check at workflow.ts:222-228.
 *
 * Pattern from: plan/bugfix/P1M3T1S2/PRP.md "Manual Parent Mutation Test"
 */
```

### Integration Points

```yaml
EXISTING_TEST_FILE:
  - file: src/__tests__/adversarial/parent-validation.test.ts
    action: ADD new test case after line 74
    pattern: Follow existing SimpleWorkflow, console mocking, and test structure
    note: No need to create new file - extend existing test suite

CODE_UNDER_TEST:
  - file: src/core/workflow.ts
    method: attachChild() (lines 216-255)
    validation: Parent check at lines 222-228
    property: parent (public, line 49)

TEST_FRAMEWORK:
  - command: "npm test" or "vitest run"
  - pattern: All tests in src/__tests__/**/*.test.ts are auto-discovered
  - config: vitest.config.ts with globals: true
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Expected: Zero TypeScript errors. The 'as any' pattern is valid TypeScript.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new test file specifically
npm test -- parent-validation

# Run full adversarial test suite
npm test -- src/__tests__/adversarial/

# Full test suite for regression check
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Expected output: Test count increases (from existing count to +1 or +2)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test file is discovered by Vitest
npm test -- --listTests 2>&1 | grep parent-validation

# Run tests with coverage (if available)
npm test -- --coverage

# Expected: parent-validation.test.ts appears in test list
# Expected: All tests pass, coverage includes new test
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification of the defensive behavior
node -e "
const { Workflow } = require('./dist/index.js');

class TestWF extends Workflow {
  async run() { return 'done'; }
}

const p1 = new TestWF('Parent1');
const p2 = new TestWF('Parent2');
const child = new TestWF('Child', p1);

console.log('Initial state:');
console.log('  child.parent:', child.parent.node.name);
console.log('  p1.children:', p1.children.map(c => c.node.name));

// Manual mutation
child.parent = p2;

console.log('After manual mutation:');
console.log('  child.parent:', child.parent.node.name);
console.log('  p1.children:', p1.children.map(c => c.node.name));
console.log('  Inconsistent state: child.parent is p2, but p1 still has child in children array');

try {
  p1.attachChild(child);
  console.log('ERROR: attachChild did not throw!');
} catch (err) {
  console.log('SUCCESS: attachChild threw error:', err.message);
}
"

# Expected: Shows inconsistent state, then attachChild throws appropriate error
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Test case added to: `src/__tests__/adversarial/parent-validation.test.ts`
- [ ] Test follows existing patterns (SimpleWorkflow, console mocking, etc.)

### Feature Validation

- [ ] Test manually mutates `(child as any).parent = parent2`
- [ ] Test calls `parent1.attachChild(child)` and verifies it throws
- [ ] Error message contains "already has a parent"
- [ ] Error message mentions the correct parent name (Parent2)
- [ ] No regression in existing test suite

### Code Quality Validation

- [ ] Follows existing test patterns (ARRANGE-ACT-ASSERT with comments)
- [ ] Test placement is correct (within describe block, after existing tests)
- [ ] Test naming consistent with adversarial suite conventions
- [ ] Proper use of Vitest globals (describe, it, expect, vi)
- [ ] Console mocking and restoration patterns followed

### Documentation & Deployment

- [ ] Test is self-documenting with clear description
- [ ] Comments explain the defensive programming aspect being tested
- [ ] No new environment variables or configuration needed

---

## Anti-Patterns to Avoid

- ❌ Don't create a new test file - add to existing `parent-validation.test.ts`
- ❌ Don't redefine SimpleWorkflow class - use the existing one
- ❌ Don't skip console mocking - follow existing patterns
- ❌ Don't forget to restore mocks in afterEach
- ❌ Don't use recursion or complex logic - keep test simple and focused
- ❌ Don't test the wrong scenario - make sure to test parent1.attachChild(child) AFTER manual mutation
- ❌ Don't forget to verify initial state before mutation
- ❌ Don't use vague error assertions - be specific about "already has a parent"
- ❌ Don't skip adding descriptive comments explaining the test purpose
