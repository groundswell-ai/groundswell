# Product Requirement Prompt (PRP)
# P1.M2.T3.S2: Write test for duplicate attachment prevention

---

## Goal

**Feature Goal**: Add test coverage for the duplicate attachment prevention logic implemented in P1.M2.T3.S1

**Deliverable**: A passing Vitest unit test in `src/__tests__/unit/workflow.test.ts` that validates the `attachChild()` method prevents duplicate child attachments

**Success Definition**: Test passes successfully and validates that calling `attachChild(child)` twice on the same parent workflow throws an error with the message "Child already attached to this workflow"

## User Persona (if applicable)

**Target User**: Developer maintaining the Workflow codebase

**Use Case**: Ensuring the duplicate attachment prevention logic works correctly and is guarded against regressions

**User Journey**: Developer runs the test suite and sees all tests pass, including the duplicate attachment test

**Pain Points Addressed**: Prevents state corruption from duplicate child entries in the hierarchical workflow structure

## Why

- **Code Quality**: Ensures the duplicate check logic implemented in P1.M2.T3.S1 is properly tested
- **Regression Prevention**: Guards against future changes that might accidentally remove the duplicate check
- **Test Coverage**: Completes the test coverage for the `attachChild()` method

## What

Add a unit test to `src/__tests__/unit/workflow.test.ts` that:
1. Creates a parent workflow instance
2. Creates a child workflow with the parent as its constructor argument (first attachment)
3. Calls `attachChild(child)` again on the parent
4. Expects the second call to throw an Error with message "Child already attached to this workflow"

### Success Criteria

- [ ] Test exists in `src/__tests__/unit/workflow.test.ts`
- [ ] Test name: "should throw error when duplicate attachment attempted"
- [ ] Test validates the exact error message: "Child already attached to this workflow"
- [ ] Test passes when run: `npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted"`

## All Needed Context

### Context Completeness Check

_A test developer unfamiliar with this codebase has everything needed: the file location, test framework, test patterns, the method under test, and the expected error message._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/__tests__/unit/workflow.test.ts
  why: Primary test file for Workflow class - contains all existing test patterns to follow
  pattern: BDD-style describe/it structure, Vitest framework, SimpleWorkflow test helper class
  gotcha: Tests use both class-based and functional workflow patterns

- file: src/core/workflow.ts:187-201
  why: The attachChild() method implementation with duplicate check logic
  pattern: Validation-first pattern, throws Error with specific message
  section: Lines 187-201 contain the complete attachChild method

- file: package.json:34-35
  why: Test commands and framework configuration
  pattern: "vitest run" for single-run, "vitest" for watch mode
  gotcha: Vitest version ^1.0.0, compatible with Jest expect syntax
```

### Current Codebase Tree

```bash
groundswell/
├── package.json                    # Test scripts: "test": "vitest run"
├── src/
│   ├── __tests__/
│   │   └── unit/
│   │       └── workflow.test.ts   # TARGET FILE - add test here
│   └── core/
│       └── workflow.ts            # Contains attachChild() at lines 187-201
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files - test is added to existing workflow.test.ts
# Test to add at ~line 241-250 (after circular reference tests)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Vitest uses Jest-compatible expect().toThrow() syntax
// The test must use arrow function wrapping for synchronous error testing

// CORRECT pattern for sync error testing:
expect(() => parent.attachChild(child)).toThrow('Child already attached to this workflow');

// INCORRECT - will not catch error:
expect(parent.attachChild(child)).toThrow('Child already attached to this workflow');

// GOTCHA: The child is already attached via constructor
// const child = new SimpleWorkflow('Child', parent); // First attachment
// parent.attachChild(child); // This is the SECOND attachment attempt
```

## Implementation Blueprint

### Data Models and Structure

No new data models - test uses existing `SimpleWorkflow` helper class defined in the test file.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY test file exists and is readable
  - LOCATE: src/__tests__/unit/workflow.test.ts
  - VERIFY: Imports include { describe, it, expect } from 'vitest'
  - VERIFY: SimpleWorkflow helper class is defined (lines 4-11)

Task 2: LOCATE insertion point in test file
  - FIND: Position after circular reference tests (~line 240)
  - CONTEXT: Insert after 'should detect circular relationship in getRootObservers' test

Task 3: WRITE the duplicate attachment test
  - NAME: "should throw error when duplicate attachment attempted"
  - IMPLEMENT: Arrange-Act-Assert pattern
  - CREATE: parent = new SimpleWorkflow('Parent')
  - CREATE: child = new SimpleWorkflow('Child', parent) // First attachment via constructor
  - CALL: parent.attachChild(child) // Second attachment attempt
  - EXPECT:toThrow('Child already attached to this workflow')

Task 4: RUN the test to verify it passes
  - COMMAND: npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted"
  - EXPECT: Test passes with 1 passed
```

### Implementation Patterns & Key Details

```typescript
// Test follows existing BDD-style pattern in workflow.test.ts

it('should throw error when duplicate attachment attempted', () => {
  // ARRANGE: Create parent and child workflows with first attachment
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);  // First attachment happens here

  // ACT & ASSERT: Second attachment attempt should throw error
  // CRITICAL: Wrap in arrow function for expect().toThrow() to work
  expect(() => parent.attachChild(child)).toThrow(
    'Child already attached to this workflow'
  );
});

// PATTERN: Arrange-Act-Assert structure (consistent with existing tests)
// PATTERN: Comment sections for clarity (matches existing test style)
// PATTERN: Descriptive test name following "should [action] [behavior]" convention
```

### Integration Points

```yaml
TEST_FILE:
  - location: src/__tests__/unit/workflow.test.ts
  - after: "should detect circular relationship in getRootObservers" test
  - before: "should emit treeUpdated event when status changes" test (if exists)

METHOD_UNDER_TEST:
  - file: src/core/workflow.ts
  - method: attachChild(child: Workflow): void
  - lines: 187-201
  - error: "Child already attached to this workflow"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler check (noEmit validates without building)
npm run lint

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Run formatter check (if project uses Prettier or similar)
# npm run format:check

# Expected: No formatting issues.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test
npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted"

# Expected output:
# ✓ src/__tests__/unit/workflow.test.ts (1 test)
# Test Files  1 passed (1)
#      Tests  1 passed (1)

# Run all workflow tests to ensure no regression
npm test -- src/__tests__/unit/workflow.test.ts

# Expected: All tests pass (should be 13+ tests passing)
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite to ensure no side effects
npm test

# Expected: All tests in entire codebase pass

# Check test coverage for attachChild method
npm test -- --coverage

# Expected: attachChild method shows appropriate test coverage
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify the attachChild implementation matches test expectations
# Check src/core/workflow.ts lines 187-201

# Expected error message must match exactly:
grep -n "Child already attached to this workflow" src/core/workflow.ts

# Expected: Found at line 189 inside the duplicate check logic

# Manual verification: Run test in watch mode and make a change
npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted" --watch

# Then modify the error message in workflow.ts and verify test fails
# This confirms the test is actually validating the specific error message
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npm run lint`
- [ ] Specific test passes: `npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted"`
- [ ] All workflow tests pass: `npm test -- src/__tests__/unit/workflow.test.ts`
- [ ] Full test suite passes: `npm test`

### Feature Validation

- [ ] Test exists in correct file: `src/__tests__/unit/workflow.test.ts`
- [ ] Test name matches specification: "should throw error when duplicate attachment attempted"
- [ ] Error message validated: "Child already attached to this workflow"
- [ ] Test follows Arrange-Act-Assert pattern
- [ ] Test follows existing codebase conventions

### Code Quality Validation

- [ ] Test uses SimpleWorkflow helper class (consistent with existing tests)
- [ ] Arrow function wrapping for expect().toThrow() pattern
- [ ] Descriptive comments (Arrange, Act & Assert sections)
- [ ] Positioned logically after circular reference tests
- [ ] No unnecessary imports or dependencies added

## Implementation Status

**NOTE**: This test already exists in the codebase at `src/__tests__/unit/workflow.test.ts` lines 241-250.

The test was verified passing on 2026-01-11:
```bash
npm test -- src/__tests__/unit/workflow.test.ts -t "should throw error when duplicate attachment attempted"
# ✓ Test passed (1 passed)
```

**Current Test Code:**
```typescript
it('should throw error when duplicate attachment attempted', () => {
  // Arrange: Create parent and child workflows with first attachment
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act & Assert: Second attachment attempt should throw error
  expect(() => parent.attachChild(child)).toThrow(
    'Child already attached to this workflow'
  );
});
```

**Action Required**: None - test exists and passes. This PRP documents the completed work for reference.

---

## Anti-Patterns to Avoid

- [ ] Don't call `attachChild()` without arrow function wrapper - error won't be caught
- [ ] Don't use async/await for this synchronous error test
- [ ] Don't forget that constructor already attaches the child (first attachment is implicit)
- [ ] Don't create child without parent - then you'd need to call attachChild twice manually
- [ ] Don't use vague error message matching like `.toThrow()` - validate the specific message
- [ ] Don't place test in wrong file or wrong describe block
