# Product Requirement Prompt (PRP): Add Tests for Public isDescendantOf API

---

## Goal

**Feature Goal**: Add comprehensive test coverage for the public `isDescendantOf` API method, ensuring full validation of true positive (descendant), true negative (not descendant), and edge cases (self-reference, circular reference) scenarios.

**Deliverable**: Enhanced test suite in `src/__tests__/unit/workflow-isDescendantOf.test.ts` with additional test cases for any gaps in existing coverage.

**Success Definition**:
- All test scenarios pass including edge cases for circular reference handling
- Test coverage includes true positive, true negative, self-reference, and corrupted tree scenarios
- Public API accessibility verified without type casting
- All existing tests continue to pass

## User Persona (if applicable)

**Target User**: Library developers integrating Groundswell workflow engine into their applications.

**Use Case**: Developers need to programmatically validate workflow hierarchy relationships to:
- Prevent circular references before attaching workflows
- Validate workflows belong to specific hierarchies (e.g., production vs staging)
- Implement conditional logic based on ancestry position

**User Journey**:
1. Developer has workflow instances with parent-child relationships
2. Developer calls `workflow.isDescendantOf(potentialAncestor)` to check relationship
3. Method returns boolean indicating ancestry status
4. Developer uses result for validation, conditional logic, or error prevention

**Pain Points Addressed**:
- No programmatic way to check ancestry without manual parent chain traversal
- Risk of creating circular references when attaching workflows
- Difficulty validating workflow hierarchy membership for multi-environment setups

## Why

- **API Validation**: P1.M3.T4.S2 made `isDescendantOf` public; tests ensure the public API works correctly
- **Contract Compliance**: Work item contract requires tests covering true positive, true negative, edge cases (same workflow, circular reference)
- **Safety**: Circular reference detection prevents infinite loops and corrupted tree structures
- **Developer Confidence**: Comprehensive tests demonstrate reliability for external consumers

## What

Add test coverage for the public `isDescendantOf` API method. The test file already exists with substantial coverage (21 tests), but one gap exists: no direct test of `isDescendantOf` throwing an error when called on a corrupted tree with circular references.

### Success Criteria

- [ ] All existing tests pass (21 current tests)
- [ ] New test added for `isDescendantOf` error handling with circular references
- [ ] Test coverage includes: direct descendants, nested descendants, unrelated workflows, siblings, self-reference, orphan workflows, complex hierarchies, circular reference error handling
- [ ] Public API accessibility verified without `(as any)` type casting

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: A developer unfamiliar with this codebase would have everything needed to implement these tests because:
- Existing test file provides clear patterns to follow
- Method implementation is fully documented
- Test patterns are consistent across the codebase
- Edge cases are clearly identified

### Documentation & References

```yaml
# MUST READ - Implementation to test
- file: src/core/workflow.ts:201-219
  why: Exact implementation of isDescendantOf method to test
  pattern: Iterative traversal with visited Set for cycle detection
  critical: Method throws "Circular parent-child relationship detected" when cycle found

# MUST READ - Documentation of method behavior
- file: src/core/workflow.ts:152-200
  why: JSDoc documentation with usage examples and security warning
  section: Security warning about information disclosure

# MUST READ - Existing tests to extend
- file: src/__tests__/unit/workflow-isDescendantOf.test.ts
  why: Current test coverage (21 tests) - identify what's missing
  pattern: Nested describe blocks with BDD-style naming
  coverage: Public API accessibility, direct/nested descendants, unrelated, siblings, self-reference, complex hierarchies
  gap: No direct test of isDescendantOf throwing on corrupted tree

# MUST READ - Related circular reference tests
- file: src/__tests__/adversarial/complex-circular-reference.test.ts
  why: Pattern for testing circular references via attachChild()
  pattern: Tests attachChild() which internally uses isDescendantOf()
  gotcha: These test attachChild(), not isDescendantOf() directly

- file: src/__tests__/unit/workflow.test.ts:285-313
  why: Tests getRoot() and getRootObservers() throwing on circular reference
  pattern: Manually create circular ref, then test method throws
  gap: No test for isDescendantOf() throwing on corrupted tree

# MUST READ - Test configuration
- file: vitest.config.ts
  why: Vitest configuration for running tests
  pattern: Tests in src/__tests__/**/*.test.ts, globals enabled

# MUST READ - Test helper patterns
- file: src/__tests__/adversarial/circular-reference.test.ts:20-26
  why: SimpleWorkflow class pattern for testing
  pattern: Extend Workflow, implement minimal run() method

# EXTERNAL RESEARCH - Vitest Documentation
- url: https://vitest.dev/api/
  why: Complete vitest API reference for assertions and test functions
  critical: expect().toThrow() for error testing

- url: https://vitest.dev/guide/assertion.html
  why: Assertion patterns including toThrow(), toBe(), toEqual()
  section: Error testing with expect().toThrow()

- url: https://vitest.dev/guide/test-context.html
  why: Test context patterns (beforeEach, afterEach, vi, etc.)
  section: Mocking with vi.spyOn() and vi.restoreAllMocks()
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # Workflow class with isDescendantOf (lines 201-219)
│   ├── logger.ts                # WorkflowLogger for hierarchical logging
│   └── index.ts
├── types/
│   └── workflow.ts              # Workflow TypeScript interfaces
├── __tests__/
│   ├── unit/
│   │   ├── workflow.test.ts                        # General workflow tests
│   │   ├── workflow-isDescendantOf.test.ts        # TARGET FILE - Current isDescendantOf tests
│   │   ├── workflow-detachChild.test.ts           # Example public method test pattern
│   │   └── ...
│   ├── adversarial/
│   │   ├── circular-reference.test.ts             # Circular ref patterns
│   │   └── complex-circular-reference.test.ts     # Multi-level circular ref tests
│   └── integration/
│       └── ...
├── index.ts                    # Main exports
└── vitest.config.ts           # Test configuration
```

### Desired Codebase Tree with Files to be Added

```bash
# NO NEW FILES - Existing file will be enhanced
src/__tests__/unit/
└── workflow-isDescendantOf.test.ts   # MODIFY: Add circular reference error test
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: isDescendantOf throws "Circular parent-child relationship detected"
// when it encounters a cycle during traversal. This is NOT tested directly yet.

// GOTCHA: Circular reference must be created MANUALLY by setting .parent property
// Normal attachChild() prevents this, so test must bypass normal safeguards:
const parent = new Workflow('parent');
const child = new Workflow('child', parent);
parent.parent = child;  // Manual corruption - bypasses attachChild validation

// GOTCHA: isDescendantOf starts from this.parent, NOT this
// So workflow.isDescendantOf(workflow) returns false (not considered descendant of self)

// GOTCHA: Vitest globals are enabled - no need to import describe/it/expect
// But existing tests explicitly import them - follow existing pattern

// PATTERN: Use SimpleWorkflow class extension for tests requiring run() method
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// PATTERN: Console mocking in adversarial tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});
```

## Implementation Blueprint

### Data models and structure

No new data models needed. Testing existing `Workflow` class with signature:
```typescript
public isDescendantOf(ancestor: Workflow): boolean
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ANALYZE existing test coverage in workflow-isDescendantOf.test.ts
  - READ: src/__tests__/unit/workflow-isDescendantOf.test.ts
  - IDENTIFY: Test categories covered (21 existing tests)
  - IDENTIFY: Missing test scenarios (circular reference error handling)
  - DOCUMENT: Test patterns used in existing tests

Task 2: VERIFY isDescendantOf implementation error handling
  - READ: src/core/workflow.ts:201-219
  - UNDERSTAND: Cycle detection algorithm with visited Set
  - CONFIRM: Error message is "Circular parent-child relationship detected"
  - UNDERSTAND: When error is thrown (when visited.has(current) is true)

Task 3: REVIEW circular reference test patterns
  - READ: src/__tests__/unit/workflow.test.ts:285-313
  - READ: src/__tests__/adversarial/complex-circular-reference.test.ts
  - EXTRACT: Pattern for creating manual circular reference
  - EXTRACT: Pattern for testing thrown errors

Task 4: ADD new test for isDescendantOf circular reference error
  - FILE: src/__tests__/unit/workflow-isDescendantOf.test.ts
  - ADD: New describe block "Edge Cases: Circular Reference Detection"
  - IMPLEMENT: Test that creates manual circular reference
  - IMPLEMENT: Test that calls isDescendantOf() on corrupted tree
  - ASSERT: expect(() => descendant.isDescendantOf(ancestor)).toThrow('Circular parent-child relationship detected')
  - PLACEMENT: After existing "Edge Cases" describe block (line 157)

Task 5: RUN test suite to verify all tests pass
  - COMMAND: npm test or uv run vitest run
  - VERIFY: All 21 existing tests still pass
  - VERIFY: New test passes
  - VERIFY: No regressions in other test files
```

### Implementation Patterns & Key Details

```typescript
// Pattern: Creating manual circular reference for testing
// FROM: src/__tests__/unit/workflow.test.ts:285-296
const parent = new SimpleWorkflow('Parent');
const child = new SimpleWorkflow('Child', parent);

// Act: Create circular reference manually
// This simulates a bug or malicious input that creates a cycle
parent.parent = child;

// Assert: isDescendantOf should throw error for circular reference
expect(() => parent.isDescendantOf(child)).toThrow(
  'Circular parent-child relationship detected'
);

// Pattern: Existing test file structure
// FROM: src/__tests__/unit/workflow-isDescendantOf.test.ts
import { describe, it, expect } from 'vitest';
import { Workflow } from '../../core/workflow.js';

describe('Workflow.isDescendantOf() - Public API', () => {
  describe('Existing Test Categories', () => {
    // Tests here...
  });

  describe('Edge Cases: Circular Reference Detection', () => {
    // NEW TEST GOES HERE
  });
});
```

### Integration Points

```yaml
NO NEW INTEGRATIONS:
  - This task only adds tests
  - No changes to production code
  - No new dependencies
  - No configuration changes

TEST INTEGRATION:
  - Tests run via existing vitest configuration
  - Test file follows existing naming pattern
  - Test structure follows existing patterns in codebase
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding test - TypeScript compilation check
npx tsc --noEmit

# Check if TypeScript compiler finds any issues with the new test
# Expected: No TypeScript errors

# Run linter if configured
npm run lint 2>/dev/null || echo "No lint script configured"
# Expected: No linting errors

# Format check
npx prettier --check src/__tests__/unit/workflow-isDescendantOf.test.ts 2>/dev/null || echo "Prettier not configured"
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file to verify new test
npm test -- workflow-isDescendantOf.test.ts

# Alternative: Using vitest directly
npx vitest run src/__tests__/unit/workflow-isDescendantOf.test.ts

# Expected: All tests pass, including new circular reference test

# Run full unit test suite to ensure no regressions
npm test -- src/__tests__/unit/

# Expected: All unit tests pass

# Check test coverage for isDescendantOf
npx vitest run --coverage src/__tests__/unit/workflow-isDescendantOf.test.ts

# Expected: 100% coverage for isDescendantOf method
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm test
# OR: npx vitest run

# Expected: All tests pass (unit, integration, adversarial)

# Verify specific test categories
npm test -- -t "isDescendantOf"

# Expected: All isDescendantOf tests pass (22 tests total)

# Verify no impact on related workflow tests
npm test -- workflow.test.ts
npm test -- workflow-detachChild.test.ts

# Expected: All related tests pass
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification: Check that test properly validates error case
# 1. Review test code to ensure it correctly creates circular reference
# 2. Verify error message matches implementation exactly
# 3. Confirm test would catch regression if cycle detection was removed

# Documentation verification
grep -n "Circular parent-child relationship detected" src/core/workflow.ts
grep -n "Circular parent-child relationship detected" src/__tests__/unit/workflow-isDescendantOf.test.ts

# Expected: Error message appears in both implementation and test

# Test coverage verification
npx vitest run --coverage --reporter=verbose

# Expected: isDescendantOf shows 100% coverage including error path
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test`
- [ ] New test for circular reference error handling passes
- [ ] Test coverage for isDescendantOf is 100%
- [ ] No linting errors (if linter configured)

### Feature Validation

- [ ] True positive tests: Direct descendants return true
- [ ] True positive tests: Nested descendants return true
- [ ] True negative tests: Unrelated workflows return false
- [ ] True negative tests: Siblings return false
- [ ] True negative tests: Reverse relationship (parent checking child) returns false
- [ ] Edge case: Self-reference returns false
- [ ] Edge case: Orphan workflow returns false
- [ ] Edge case: Circular reference throws "Circular parent-child relationship detected"
- [ ] Public API accessibility: No type casting required

### Code Quality Validation

- [ ] Test follows existing patterns in workflow-isDescendantOf.test.ts
- [ ] Test uses SimpleWorkflow class if needed (not needed for this test)
- [ ] Test name follows BDD-style convention: "should [do something] when [condition]"
- [ ] Test is in appropriate describe block (Edge Cases)
- [ ] Test includes clear comments explaining the scenario

### Documentation & Deployment

- [ ] Test includes explanatory comments for complex scenario (circular reference creation)
- [ ] Test file header documentation is accurate
- [ ] No changes to production code (this is a test-only task)

---

## Anti-Patterns to Avoid

- ❌ Don't modify the production code (this is a test-only task)
- ❌ Don't create circular references through attachChild() (it's designed to prevent them)
- ❌ Don't skip testing the error path (that's the whole point of this task)
- ❌ Don't use different assertion patterns than existing tests
- ❌ Don't forget to clean up any mocks in afterEach
- ❌ Don't add console output in tests (use console mocking if needed)
- ❌ Don't test the private implementation details - test the public API behavior
- ❌ Don't create unnecessary test files - add to existing workflow-isDescendantOf.test.ts

## Summary

**Current State**: `src/__tests__/unit/workflow-isDescendantOf.test.ts` contains 21 tests covering most scenarios but lacks a direct test for circular reference error handling.

**Required Change**: Add one new test that:
1. Creates a manual circular reference by setting `.parent` property directly
2. Calls `isDescendantOf()` on the corrupted tree
3. Asserts that it throws "Circular parent-child relationship detected"

**Implementation Effort**: Low (~10 lines of code following existing patterns)

**Confidence Score**: 10/10 for one-pass implementation success

---

**Sources:**

- [Vitest API Reference](https://vitest.dev/api/)
- [Vitest Assertion API](https://vitest.dev/guide/assertion.html)
- [Vitest Test Context](https://vitest.dev/guide/test-context.html)
