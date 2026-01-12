# PRP: Write Complex Circular Reference Tests

---

## Goal

**Feature Goal**: Create a comprehensive test file for circular reference detection at various depths (immediate child, grandchild, great-grandchild) to validate that `isDescendantOf()` correctly prevents cycles through the entire ancestor chain.

**Deliverable**: New test file `src/__tests__/adversarial/complex-circular-reference.test.ts` with three test cases covering different cycle depths.

**Success Definition**:
- All three test cases pass when run with `npm run test`
- Each test validates that `attachChild()` throws an error containing 'circular', 'cycle', or 'ancestor' (case-insensitive)
- Tests follow the existing adversarial test patterns (AAA structure, console mocking, TDD documentation)
- Tests are properly documented with inline comments explaining the cycle detection mechanism

## User Persona (if applicable)

**Target User**: Developer implementing the Workflow class tree integrity validation.

**Use Case**: Validating that circular reference detection works correctly across various ancestor depths in the workflow tree.

**User Journey**:
1. Developer writes code to attach a workflow as a child
2. If the child is an ancestor (at any depth), `attachChild()` must throw an error
3. These tests verify the error is thrown for immediate parent (depth 1), grandparent (depth 2), and great-grandparent (depth 3)

**Pain Points Addressed**:
- Detects subtle bugs where cycle detection only works for immediate parent but not deeper ancestors
- Prevents infinite loops in tree traversal methods like `getRoot()` and `getRootObservers()`
- Validates defensive programming against manual parent mutation

## Why

- **Security**: Circular references cause infinite loops in tree traversal, leading to DoS vulnerabilities
- **Data Integrity**: Cycles break the tree invariant, causing incorrect behavior in observer propagation and state management
- **Bug Prevention**: Existing tests in `circular-reference.test.ts` only test depth 1 (immediate parent) and depth 2 (ancestor). This adds depth 3 coverage
- **Pattern Compliance**: Fulfills Pattern 8 from `plan/bugfix/architecture/implementation_patterns.md` which requires testing cycles at various depths

## What

Create a new test file `src/__tests__/adversarial/complex-circular-reference.test.ts` with three test cases:

1. **Immediate Circular Reference**: `child.attachChild(parent)` - depth 1 cycle
2. **Two-Level Circular Reference**: `child2.attachChild(root)` where root → child1 → child2 - depth 2 cycle
3. **Three-Level Circular Reference**: `child3.attachChild(root)` where root → child1 → child2 → child3 - depth 3 cycle

Each test must:
- Create a 4-level hierarchy (root, child1, child2, child3)
- Attempt to create a circular reference by attaching an ancestor as a child
- Assert that an error is thrown with message matching `/circular|cycle|ancestor/i`

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/complex-circular-reference.test.ts`
- [ ] All three test cases for different cycle depths are implemented
- [ ] All tests pass with `npm run test`
- [ ] Tests follow existing patterns from `circular-reference.test.ts` and `deep-hierarchy-stress.test.ts`
- [ ] Proper documentation comments explain each test scenario

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**YES** - This PRP provides:
- Exact file paths and code patterns to follow
- Complete `isDescendantOf()` implementation for reference
- Existing test file examples with identical patterns
- Vitest configuration and test commands
- Console mocking pattern from existing tests

### Documentation & References

```yaml
# MUST READ - Critical implementation files

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains isDescendantOf() implementation and attachChild() circular reference check
  pattern: Lines 150-168 (isDescendantOf method), lines 232-238 (circular reference check in attachChild)
  gotcha: isDescendantOf() starts from this.parent, not this - prevents self-reference false positive

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/circular-reference.test.ts
  why: Pattern template for circular reference tests - same AAA structure, console mocking, error assertions
  pattern: Lines 20-26 (SimpleWorkflow class), 33-45 (console mocking pattern), 58-71 (immediate cycle test), 84-100 (ancestor cycle test)
  gotcha: Must use `vi.restoreAllMocks()` in afterEach to prevent test pollution

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: Pattern for building multi-level hierarchies and testing protected/private methods
  pattern: Lines 20-26 (SimpleWorkflow class), 94-109 (building deep hierarchy with loop), 104 (casting to any for protected method access)
  gotcha: getRoot() and isDescendantOf() are not public - cast to `any` for testing

- file: /home/dustin/projects/groundswell/plan/docs/bugfix-architecture/implementation_patterns.md
  why: Pattern 8 defines the requirement for testing cycles at various depths
  section: Pattern 8 - Adversarial Testing (see complex circular reference test example)
  gotcha: Tests should cover immediate child, grandchild, and great-grandchild scenarios

- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Confirms test file location pattern and vitest configuration
  pattern: Line 5 - test glob pattern is `src/__tests__/**/*.test.ts`
  gotcha: All test files must end in `.test.ts` to be discovered by vitest

- url: https://vitest.dev/api/expect.html#tothrow
  why: Official vitest documentation for toThrow() assertion patterns
  critical: Supports regex patterns like `/circular|cycle|ancestor/i` for flexible error matching
```

### Current Codebase tree (relevant sections)

```bash
src/
├── core/
│   └── workflow.ts                    # Workflow class with isDescendantOf() and attachChild()
└── __tests__/
    └── adversarial/
        ├── circular-reference.test.ts      # Existing basic cycle tests (depth 1, 2)
        ├── deep-hierarchy-stress.test.ts   # Deep hierarchy tests (1000+ levels)
        └── complex-circular-reference.test.ts  # TO BE CREATED - multi-depth cycle tests
```

### Desired Codebase tree with files to be added

```bash
src/
├── core/
│   └── workflow.ts                    # NO CHANGE - isDescendantOf() already implemented
└── __tests__/
    └── adversarial/
        ├── circular-reference.test.ts      # EXISTING - basic cycle tests
        ├── deep-hierarchy-stress.test.ts   # EXISTING - deep hierarchy tests
        └── complex-circular-reference.test.ts  # NEW FILE - depth 1, 2, 3 cycle tests
            # Responsibility: Validate isDescendantOf() detects cycles at various ancestor depths
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Constructor auto-attaches child when parent is provided
// Pattern: workflow.ts:113-116
const child = new Workflow('Child', parent);
// This internally calls parent.attachChild(child) automatically

// CRITICAL: isDescendantOf() starts from this.parent, not this
// Implementation: workflow.ts:152
let current: Workflow | null = this.parent;  // NOT this!
// This prevents self-reference false positive: root.isDescendantOf(root) === false

// CRITICAL: isDescendantOf() and getRoot() are private/protected
// Must cast to `any` in tests to access them:
(root as any).isDescendantOf(child);
(deepest as any).getRoot();

// CRITICAL: Always use vi.restoreAllMocks() in afterEach
// Pattern: circular-reference.test.ts:43-45
afterEach(() => {
  vi.restoreAllMocks();  // Prevents test pollution
});

// CRITICAL: Error message regex must be case-insensitive
// attachChild throws: "it is an ancestor of" (lowercase 'ancestor')
// Use: /circular|cycle|ancestor/i (note the 'i' flag for case-insensitive)

// CRITICAL: Workflow constructor auto-attaches - DON'T manually call attachChild
// WRONG: const child = new Workflow('Child'); parent.attachChild(child);
// RIGHT: const child = new Workflow('Child', parent);  // Auto-attaches

// CRITICAL: When building hierarchies, track the last child
// Pattern: deep-hierarchy-stress.test.ts:94-101
let current: any = root;
for (let i = 0; i < DEPTH; i++) {
  current = new SimpleWorkflow(`Child-${i}`, current);
}
// After loop, `current` is the deepest child
```

## Implementation Blueprint

### Data models and structure

No data models needed - tests only use existing Workflow class.

```typescript
// Test helper class (same pattern used in all adversarial tests)
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/complex-circular-reference.test.ts
  - IMPLEMENT: Three test cases for cycle detection at depths 1, 2, 3
  - FOLLOW pattern: src/__tests__/adversarial/circular-reference.test.ts (AAA structure, console mocking)
  - NAMING: describe() = "Adversarial: Complex Circular Reference Detection"
  - PLACEMENT: src/__tests__/adversarial/ directory

Task 2: IMPLEMENT Test 1 - Immediate Circular Reference (depth 1)
  - CREATE: 2-level hierarchy (root, child1)
  - ATTEMPT: child1.attachChild(root)
  - ASSERT: Error thrown with /circular|cycle|ancestor/i
  - FOLLOW pattern: circular-reference.test.ts:58-71
  - DOCUMENT: "immediate cycle" in test description

Task 3: IMPLEMENT Test 2 - Two-Level Circular Reference (depth 2)
  - CREATE: 3-level hierarchy (root, child1, child2)
  - ATTEMPT: child2.attachChild(root)
  - ASSERT: Error thrown with /circular|cycle|ancestor/i
  - FOLLOW pattern: circular-reference.test.ts:84-100 (ancestor test)
  - DOCUMENT: "2-level cycle" in test description

Task 4: IMPLEMENT Test 3 - Three-Level Circular Reference (depth 3)
  - CREATE: 4-level hierarchy (root, child1, child2, child3)
  - ATTEMPT: child3.attachChild(root)
  - ASSERT: Error thrown with /circular|cycle|ancestor/i
  - FOLLOW pattern: deep-hierarchy-stress.test.ts:94-109 (hierarchy building)
  - DOCUMENT: "3-level cycle" in test description - NEW coverage not in existing tests

Task 5: VERIFY all tests pass
  - RUN: npm run test -- complex-circular-reference
  - EXPECT: All 3 tests pass
  - VALIDATE: Error messages are informative
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: File Header Documentation
// ============================================
/**
 * Complex Circular Reference Tests
 *
 * These tests validate that isDescendantOf() correctly detects circular
 * references at various depths in the workflow tree.
 *
 * Test Cases:
 * 1. Immediate circular reference (depth 1): child.attachChild(parent)
 * 2. Two-level circular reference (depth 2): grandchild.attachChild(root)
 * 3. Three-level circular reference (depth 3): great-grandchild.attachChild(root)
 *
 * Pattern from: plan/docs/bugfix-architecture/implementation_patterns.md Pattern 8
 * Related: plan/bugfix/P1M3T1S3/PRP.md
 */

// ============================================
// PATTERN 2: Test Helper Class
// ============================================
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
// FOLLOW: circular-reference.test.ts:20-26

// ============================================
// PATTERN 3: Console Mocking Setup
// ============================================
describe('Adversarial: Complex Circular Reference Detection', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();  // CRITICAL: Always restore mocks
  });
  // FOLLOW: circular-reference.test.ts:33-45
});

// ============================================
// PATTERN 4: Test Case Structure (AAA)
// ============================================
it('should throw when attaching immediate parent as child (depth 1)', () => {
  // ========== ARRANGE ==========
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Verify initial state
  expect(child.parent).toBe(parent);
  expect(parent.children).toContain(child);

  // ========== ACT & ASSERT ==========
  expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
});

// ============================================
// PATTERN 5: Multi-Level Hierarchy Building
// ============================================
// For depth 3 test (4 levels: root, child1, child2, child3)
const root = new SimpleWorkflow('Root');
const child1 = new SimpleWorkflow('Child1', root);  // root -> child1
const child2 = new SimpleWorkflow('Child2', child1); // root -> child1 -> child2
const child3 = new SimpleWorkflow('Child3', child2); // root -> child1 -> child2 -> child3

// Verify hierarchy
expect(child3.parent).toBe(child2);
expect(child2.parent).toBe(child1);
expect(child1.parent).toBe(root);

// Attempt cycle: child3.attachChild(root)
expect(() => child3.attachChild(root)).toThrow(/circular|cycle|ancestor/i);

// FOLLOW: deep-hierarchy-stress.test.ts:94-109

// ============================================
// PATTERN 6: Error Message Validation
// ============================================
// The attachChild() method throws specific error messages:
// workflow.ts:234-235: "it is an ancestor of '...'. This would create a circular reference."
//
// Use regex pattern matching for flexibility:
expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
// The 'i' flag makes it case-insensitive

// GOTCHA: Error message uses "ancestor" (lowercase), not "Ancestor"
// Gotcha source: workflow.ts:234

// ============================================
// PATTERN 7: Constructor Auto-Attachment
// ============================================
// CRITICAL: When parent is passed to constructor, attachChild() is called automatically
// Implementation: workflow.ts:114-116
if (this.parent) {
  this.parent.attachChild(this);
}

// CORRECT USAGE:
const child = new SimpleWorkflow('Child', parent);  // Auto-attaches

// WRONG USAGE (don't do this):
const child = new SimpleWorkflow('Child');
parent.attachChild(child);  // Redundant, constructor already did it
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - runner: vitest (configured in vitest.config.ts)
  - glob: src/__tests__/**/*.test.ts
  - command: npm run test -- [filename]

IMPORTS:
  - from: 'vitest'
    imports: describe, it, expect, beforeEach, afterEach, vi
  - from: '../../index.js'
    import: Workflow class

NO_CHANGES_NEEDED:
  - workflow.ts: isDescendantOf() already implemented at lines 150-168
  - workflow.ts: attachChild() circular reference check already at lines 232-238
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
npm run test -- complex-circular-reference  # Run just the new test file

# Expected: Tests should PASS (isDescendantOf is already implemented)
# If tests FAIL, read output and fix test implementation

# Full test suite validation (ensure no regressions)
npm run test

# Expected: All tests pass
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npm run test -- complex-circular-reference

# Expected output:
# ✓ src/__tests__/adversarial/complex-circular-reference.test.ts (3)
#   ✓ Adversarial: Complex Circular Reference Detection (3)
#     ✓ should throw when attaching immediate parent as child (depth 1)
#     ✓ should throw when attaching grandparent as child (depth 2)
#     ✓ should throw when attaching great-grandparent as child (depth 3)

# Full adversarial test suite
npm run test -- adversarial

# Expected: All adversarial tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test file is discovered by vitest glob pattern
npm run test -- --reporter=verbose 2>&1 | grep complex-circular-reference

# Expected: Test file is found and executed

# Verify no regressions in existing circular reference tests
npm run test -- circular-reference

# Expected: Existing tests still pass
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Vitest coverage (if coverage is configured)
npm run test -- --coverage

# Expected: New lines covered in isDescendantOf() method

# Performance test - ensure tests run quickly
time npm run test -- complex-circular-reference

# Expected: Tests complete in < 1 second (simple operations)

# Validate error messages are informative
npm run test -- complex-circular-reference 2>&1 | grep -i "ancestor\|circular"

# Expected: Error messages contain clear descriptions
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/adversarial/complex-circular-reference.test.ts`
- [ ] All three test cases pass: `npm run test -- complex-circular-reference`
- [ ] No regressions: `npm run test` passes completely
- [ ] Console properly mocked (check for no console output in test results)
- [ ] Error assertions use correct regex pattern: `/circular|cycle|ancestor/i`

### Feature Validation

- [ ] Test 1 validates depth 1 cycle (immediate parent)
- [ ] Test 2 validates depth 2 cycle (grandparent)
- [ ] Test 3 validates depth 3 cycle (great-grandparent)
- [ ] All tests properly verify initial hierarchy state before attempting cycle
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)

### Code Quality Validation

- [ ] File header documentation includes Pattern 8 reference
- [ ] Test descriptions clearly indicate cycle depth
- [ ] Inline comments explain the cycle being tested
- [ ] Console mocking follows existing pattern with vi.restoreAllMocks()
- [ ] SimpleWorkflow class included (no external dependencies)

### Documentation & Deployment

- [ ] PRP path saved at plan/bugfix/P1M3T1S3/PRP.md
- [ ] Test file follows naming convention: `*-circular-reference.test.ts`
- [ ] Test file located in correct directory: `src/__tests__/adversarial/`
- [ ] Related test files referenced in documentation

---

## Anti-Patterns to Avoid

- **Don't** manually call `attachChild()` when constructor already does it - just pass parent to constructor
- **Don't** forget `vi.restoreAllMocks()` in afterEach - causes test pollution
- **Don't** use exact string match for error assertions - use regex `/circular|cycle|ancestor/i`
- **Don't** forget to verify initial state before testing the cycle
- **Don't** create tests that are too similar to existing `circular-reference.test.ts` - this file adds depth 3 coverage
- **Don't** skip the `i` flag on regex - error messages use specific casing
- **Don't** use recursion to build hierarchies in tests - use iteration (avoids test-side stack overflow)
- **Don't** test `isDescendantOf()` directly without casting to `any` - it's private

## Test Specification Summary

| Test Name | Hierarchy Depth | Cycle Attempt | Expected Error |
|-----------|----------------|---------------|----------------|
| Immediate Circular Reference (depth 1) | 2 (root, child1) | child1.attachChild(root) | /circular\|cycle\|ancestor/i |
| Two-Level Circular Reference (depth 2) | 3 (root, child1, child2) | child2.attachChild(root) | /circular\|cycle\|ancestor/i |
| Three-Level Circular Reference (depth 3) | 4 (root, child1, child2, child3) | child3.attachChild(root) | /circular\|cycle\|ancestor/i |

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Validation**: The PRP provides complete context including:
- Exact file paths and line numbers for all references
- Complete code examples for all patterns
- Existing test files with identical patterns to follow
- isDescendantOf() implementation for reference
- Vitest configuration and test commands
- Console mocking pattern with gotchas documented
- Constructor auto-attachment behavior explained

An AI agent unfamiliar with this codebase can implement this successfully using only the PRP content and codebase access.
