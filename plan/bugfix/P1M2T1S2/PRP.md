name: "P1.M2.T1.S2 - Write Test for Cycle Detection in getRoot() Method"
description: |

---

## Goal

**Feature Goal**: Add a test to verify that the cycle detection implemented in `getRoot()` (P1.M2.T1.S1) correctly prevents infinite loops by throwing an error when circular parent-child relationships are detected.

**Deliverable**: A new test in `src/__tests__/unit/workflow.test.ts` named "should detect circular parent relationship" that verifies the cycle detection throws the expected error.

**Success Definition**: The test passes when `getRoot()` is called on a workflow with a circular parent-child relationship, confirming that:
1. The cycle detection logic triggers correctly
2. The error message "Circular parent-child relationship detected" is thrown
3. No infinite loop occurs

## User Persona (if applicable)

**Target User**: Developer maintaining the workflow system; QA validating the cycle detection fix.

**Use Case**: When running the test suite, the new test validates that the cycle detection in `getRoot()` works correctly, preventing regression of the DoS vulnerability.

**User Journey**:
1. Developer runs `npm test` after P1.M2.T1.S1 implementation
2. New test "should detect circular parent relationship" executes
3. Test creates circular reference manually and calls `getRoot()`
4. Test expects error to be thrown with specific message
5. Test passes, confirming cycle detection works

**Pain Points Addressed**:
- **No Test Coverage**: Without a test, the cycle detection could be accidentally removed or broken
- **Regression Risk**: Future changes could reintroduce the DoS vulnerability
- **Confidence**: Test provides automated verification of the security fix

## Why

- **Security Validation**: PRD #001 Issue #4 requires cycle detection to be tested (TDD approach)
- **Regression Prevention**: Ensures the fix from P1.M2.T1.S1 is not accidentally removed
- **Documentation**: Test serves as executable documentation of expected behavior
- **Prerequisite for P1.M2.T1.S3**: Similar test will be needed for `getRootObservers()` cycle detection
- **Quality Gate**: Automated testing is required before merging bug fixes

## What

Add a single test case to `src/__tests__/unit/workflow.test.ts`:

**Test Requirements** (from `bug_fix_tasks.json`):
1. Add test to `src/__tests__/unit/workflow.test.ts`
2. Test name: "should detect circular parent relationship"
3. Test creates parent and child workflows
4. Manually sets `parent.parent = child` (creating cycle)
5. Calls `parent.getRoot()`
6. Expects error to be thrown with message "Circular parent-child relationship detected"
7. Follow existing test patterns

### Success Criteria

- [ ] Test file modified: `src/__tests__/unit/workflow.test.ts`
- [ ] Test name exactly: "should detect circular parent relationship"
- [ ] Test uses `expect(() => parent.getRoot()).toThrow('Circular parent-child relationship detected')`
- [ ] Test creates circular reference via `parent.parent = child`
- [ ] All existing tests still pass (134/134 after new test)
- [ ] No TypeScript compilation errors

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully? **YES** - This PRP provides the exact test code, file location, test patterns, and validation commands.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/core/workflow.ts:134-149
  why: The cycle detection implementation being tested
  pattern: Iterative while loop with Set<Workflow> for visited tracking
  gotcha: Method is protected - need to access via casting or subclass

- file: src/__tests__/unit/workflow.test.ts:1-209
  why: The test file to modify - contains existing test patterns
  pattern: describe/it blocks with expect() assertions
  gotcha: Tests use SimpleWorkflow class that extends Workflow

- file: src/__tests__/unit/workflow.test.ts:36-43
  why: Example test for parent-child relationship setup
  pattern: 'const parent = new SimpleWorkflow("Parent")' and 'const child = new SimpleWorkflow("Child", parent)'
  gotcha: This is the pattern to follow for creating parent-child workflows

- file: src/__tests__/unit/workflow.test.ts:106
  why: Example of async error testing with rejects.toThrow()
  pattern: 'await expect(workflow.run()).rejects.toThrow("Test error from step")'
  gotcha: For synchronous errors use expect().toThrow(), for async use rejects.toThrow()

- file: src/__tests__/unit/context.test.ts:37-39
  why: Example of synchronous error testing with expect().toThrow()
  pattern: 'expect(() => requireExecutionContext("test operation")).toThrow("test operation called outside of workflow context")'
  gotcha: Wrap function call in arrow function for expect().toThrow()

- file: src/__tests__/unit/cache-key.test.ts:43-49
  why: Example of circular reference testing pattern
  pattern: 'obj.self = obj; expect(() => deterministicStringify(obj)).toThrow("Converting circular structure to JSON")'
  gotcha: Similar pattern to use for workflow circular reference

- file: plan/bugfix/P1M2T1S1/PRP.md
  why: The PRP for the cycle detection implementation (P1.M2.T1.S1)
  section: Implementation Tasks - shows the exact implementation being tested
  gotcha: Error message must match exactly: "Circular parent-child relationship detected"

- docfile: plan/docs/research/CYCLE_DETECTION_QUICK_REF.md
  why: Research on cycle detection patterns and testing approaches
  section: 3. Error Message Best Practices, 10. Copy-Paste Ready Implementation
  gotcha: Confirms the error message format used in implementation

- url: https://vitest.dev/api/expect.html#tothrow
  why: Vitest toThrow() matcher documentation for error testing
  critical: Shows exact syntax for expect().toThrow('message')

- file: package.json
  why: Test scripts - shows how to run tests
  section: scripts: "test": "vitest run"
  gotcha: Run tests with 'npm test' or 'npx vitest run'

- file: vitest.config.ts
  why: Test runner configuration
  pattern: test files match 'src/__tests__/**/*.test.ts'
  gotcha: Tests auto-discovered - just add to workflow.test.ts
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts                    # getRoot() with cycle detection at lines 134-149
│   ├── __tests__/
│   │   └── unit/
│   │       └── workflow.test.ts           # TARGET FILE - add test here (currently 209 lines)
│   └── index.ts
├── plan/
│   ├── bugfix/
│   │   ├── P1M2T1S1/
│   │   │   └── PRP.md                     # Implementation PRP (complete)
│   │   └── P1M2T1S2/
│   │       └── PRP.md                     # This file
│   └── docs/
│       └── research/
│           └── CYCLE_DETECTION_QUICK_REF.md
├── package.json
└── vitest.config.ts
```

### Desired Codebase Tree

```bash
# No structural changes - this adds a test to existing file
# src/__tests__/unit/workflow.test.ts will have one more test case
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: getRoot() is a PROTECTED method
// Cannot call directly on Workflow instances
// Must use (workflow as any).getRoot() or create a test subclass

// GOTCHA: Error message must match EXACTLY
// Implementation throws: new Error('Circular parent-child relationship detected')
// Test must use: .toThrow('Circular parent-child relationship detected')

// GOTCHA: Use arrow function wrapper for expect().toThrow()
// WRONG: expect(parent.getRoot()).toThrow('...')
// RIGHT: expect(() => parent.getRoot()).toThrow('...')

// GOTCHA: Test file already imports Workflow, WorkflowObserver, etc.
// No new imports needed

// GOTCHA: Existing test class SimpleWorkflow extends Workflow
// Use this class for consistency with existing tests

// GOTCHA: Test location - add at end of describe('Workflow') block
// After existing tests, before closing });

// GOTCHA: getRoot() returns Workflow, but we're testing error path
// Don't need to verify return value - just verify error is thrown

// IMPORTANT: The cycle is created manually in the test
// parent.parent = child creates the circular reference
// This is intentional - testing the detection logic

// GOTCHA: TypeScript will complain about accessing protected method
// Use (parent as any).getRoot() to bypass access modifier in test
// OR create a test subclass with public getRootForTest() method

// PATTERN: Follow existing test naming
// "should [do something]" format
// Example: "should attach child to parent", "should emit logs to observers"
```

## Implementation Blueprint

### Data Models and Structure

No data model changes required. This is a test addition only.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE INSERTION POINT IN src/__tests__/unit/workflow.test.ts
  - FIND: describe('Workflow') block ending around line 208
  - POSITION: Before closing }); at end of describe block
  - AFTER: Last existing test (currently line 207: "@ObservedState fields in workflow error state")
  - PRESERVE: All existing tests unchanged

Task 2: ADD NEW TEST CASE
  - NAME: "should detect circular parent relationship"
  - PATTERN: Follow existing test structure with Arrange/Act/Assert comments (optional)
  - CREATE: parent and child SimpleWorkflow instances
  - ASSIGN: child to parent via constructor: new SimpleWorkflow('Child', parent)
  - CREATE: circular reference: parent.parent = child
  - CALL: (parent as any).getRoot() in expect().toThrow()
  - EXPECT: Error with message "Circular parent-child relationship detected"

Task 3: RUN TESTS
  - COMMAND: npm test
  - VERIFY: New test passes
  - VERIFY: All existing tests still pass (134 total)
  - VERIFY: No TypeScript errors

Task 4: MANUAL VERIFICATION (optional)
  - CREATE: Test file to manually verify cycle detection works
  - VERIFY: Error is thrown immediately (no infinite loop)
  - VERIFY: Error message matches expected
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// EXACT TEST CODE TO ADD TO src/__tests__/unit/workflow.test.ts
// Add this test before the closing }); of the describe('Workflow') block
// ============================================================================

it('should detect circular parent relationship', () => {
  // Arrange: Create parent and child workflows
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act: Create circular reference manually
  // This simulates a bug or malicious input that creates a cycle
  parent.parent = child;

  // Assert: getRoot() should throw error for circular reference
  // Note: getRoot() is protected, so we cast to any to access it
  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});

// ============================================================================
// WHERE TO INSERT IN FILE
// ============================================================================

// In src/__tests__/unit/workflow.test.ts, find this location (around line 207):
//   it('should capture @ObservedState fields in workflow error state', async () => {
//     // ... test code ...
//     expect(errorEvent.error.workflowId).toBe(workflow.id);
//   });
// });  // <-- INSERT NEW TEST HERE, BEFORE THIS CLOSING BRACE

// ============================================================================
// ALTERNATIVE: Test Helper Class Approach (if you prefer not to use 'as any')
// ============================================================================

// Option 2: Create a test helper class (cleaner but more code)
class TestWorkflow extends Workflow {
  public getRootForTest(): Workflow {
    return (this as any).getRoot();
  }
}

// Then use in test:
it('should detect circular parent relationship', () => {
  const parent = new TestWorkflow('Parent');
  const child = new TestWorkflow('Child', parent);
  parent.parent = child;

  expect(() => parent.getRootForTest()).toThrow(
    'Circular parent-child relationship detected'
  );
});

// ============================================================================
// KEY PATTERN NOTES
// ============================================================================

// PATTERN 1: Arrow function wrapper for expect().toThrow()
// The function must be wrapped in an arrow function so expect() can catch the error
expect(() => (parent as any).getRoot()).toThrow('message');

// PATTERN 2: Error message must match exactly
// The implementation throws: new Error('Circular parent-child relationship detected')
// toThrow() checks error.message property
toThrow('Circular parent-child relationship detected');

// PATTERN 3: Accessing protected members in tests
// Option A: Cast to any: (parent as any).getRoot()
// Option B: Test subclass: class TestWorkflow extends Workflow { public getRootForTest()... }
// This codebase uses (as any) pattern elsewhere (see line 161 in workflow.test.ts)

// PATTERN 4: Creating circular reference
// Normal attachment: const child = new SimpleWorkflow('Child', parent)
// Circular: parent.parent = child (assigning parent's parent to its child)
// This creates: parent -> child -> parent (cycle!)

// PATTERN 5: Test naming convention
// Format: "should [expected behavior]"
// This test: "should detect circular parent relationship"
// Existing examples: "should attach child to parent", "should emit logs to observers"

// GOTCHA: Why test parent.getRoot() instead of child.getRoot()?
// Both would detect the cycle, but the specification says to test parent.getRoot()
// The cycle exists in both directions - either call would throw

// GOTCHA: The cycle is created MANUALLY
// In normal operation, attachChild() would prevent this (future task: P1.M2.T3)
// This test directly assigns parent.parent to bypass normal checks
// This tests the getRoot() cycle detection specifically
```

### Integration Points

```yaml
NO NEW INTEGRATIONS:
  - This task adds a test only
  - No code changes to src/core/workflow.ts
  - No new dependencies
  - No configuration changes

TEST FILE MODIFICATIONS:
  - file: src/__tests__/unit/workflow.test.ts
  - action: Add one new test case
  - location: End of describe('Workflow') block
  - imports: No new imports needed

RELATED WORK ITEMS:
  - P1.M2.T1.S1: Implement cycle detection logic (COMPLETE - dependency)
  - P1.M2.T1.S3: Add cycle detection to getRootObservers() (PENDING)
  - P1.M2.T1.S4: Write test for getRootObservers() cycle detection (PENDING)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# Or: npx tsc --noEmit

# Expected: Zero errors. The test syntax should be valid.
# Common errors to fix:
# - Missing arrow function wrapper: expect().toThrow() needs () => ...
# - Wrong error message: Must match exactly
# - Access modifier error: Use (as any) cast

# If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file with output
npm test -- src/__tests__/unit/workflow.test.ts

# Expected output:
# ✓ src/__tests__/unit/workflow.test.ts (134)
#   ✓ Workflow
#     ✓ should create with unique id
#     ✓ should use class name as default name
#     ✓ should use custom name when provided
#     ✓ should start with idle status
#     ✓ should attach child to parent
#     ✓ should emit logs to observers
#     ✓ should emit childAttached event
#     ✓ should capture state and logs in functional workflow error
#     ✓ should capture @ObservedState fields in workflow error state
#     ✓ should detect circular parent relationship  <-- NEW TEST

# Run full test suite for regression check
npm test

# Expected: All 134 tests pass (133 existing + 1 new)

# Run specific test only (during development)
npm test -- --testNamePattern="should detect circular parent relationship"

# Run tests in watch mode for iterative development
npm run test:watch
```

### Level 3: Manual Verification (Functional Testing)

```typescript
// Create a manual test file: verify-cycle-detection.ts
import { Workflow } from './src/core/workflow.js';

// Helper class to expose protected getRoot()
class TestWorkflow extends Workflow {
  public getRootForTest(): Workflow {
    return (this as any).getRoot();
  }

  async run(): Promise<string> {
    return 'done';
  }
}

// Test 1: Verify normal operation still works
console.log('Test 1: Normal parent-child chain (no cycle)');
const root = new TestWorkflow('Root');
const child = new TestWorkflow('Child', root);
console.log('  Root getRoot:', root.getRootForTest() === root ? 'PASS' : 'FAIL');
console.log('  Child getRoot:', child.getRootForTest() === root ? 'PASS' : 'FAIL');

// Test 2: Verify cycle detection works
console.log('\nTest 2: Circular parent-child relationship');
const parent = new TestWorkflow('Parent');
const child2 = new TestWorkflow('Child', parent);
parent.parent = child2; // Create cycle

try {
  parent.getRootForTest();
  console.log('  FAIL: Should have thrown error');
} catch (error) {
  if (error.message === 'Circular parent-child relationship detected') {
    console.log('  PASS: Correct error thrown');
    console.log('  Error message:', error.message);
  } else {
    console.log('  FAIL: Wrong error message:', error.message);
  }
}

// Test 3: Verify self-reference detection
console.log('\nTest 3: Self-reference (workflow is its own parent)');
const selfRef = new TestWorkflow('SelfRef');
selfRef.parent = selfRef;

try {
  selfRef.getRootForTest();
  console.log('  FAIL: Should have thrown error');
} catch (error) {
  console.log('  PASS: Error thrown for self-reference');
  console.log('  Error message:', error.message);
}

console.log('\nAll manual verification tests completed.');
```

Run the verification:
```bash
npx tsx verify-cycle-detection.ts
```

### Level 4: Integration Testing (System Validation)

```bash
# Run full test suite to ensure no regressions
npm test

# Expected: All 134 tests pass
# Test files executed:
#   ✓ src/__tests__/unit/workflow.test.ts (134)  <-- Our test is here
#   ✓ src/__tests__/unit/agent.test.ts
#   ✓ src/__tests__/unit/cache.test.ts
#   ✓ src/__tests__/unit/context.test.ts
#   ✓ src/__tests__/unit/decorators.test.ts
#   ✓ src/__tests__/unit/introspection-tools.test.ts
#   ✓ src/__tests__/unit/prompt.test.ts
#   ✓ src/__tests__/unit/reflection.test.ts
#   ✓ src/__tests__/unit/tree-debugger.test.ts
#   ✓ src/__tests__/integration/agent-workflow.test.ts
#   ✓ src/__tests__/integration/tree-mirroring.test.ts

# Verify build still works
npm run build

# Expected: dist/ directory updated with compiled code
# No compilation errors

# Run coverage report (if coverage is configured)
npm run test:coverage

# Expected: Coverage for getRoot() method includes the error path
# The cycle detection branch should now be covered
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file modified: `src/__tests__/unit/workflow.test.ts`
- [ ] Test name: "should detect circular parent relationship"
- [ ] Test creates circular reference: `parent.parent = child`
- [ ] Test expects error: `expect(() => ...).toThrow('Circular parent-child relationship detected')`
- [ ] All tests pass: `npm test` (134/134 tests passing)
- [ ] No type errors: `npm run lint`
- [ ] No build errors: `npm run build`

### Feature Validation

- [ ] Cycle detection triggers on `parent.parent = child`
- [ ] Error message matches exactly: "Circular parent-child relationship detected"
- [ ] Error is thrown immediately (verified by test passing quickly)
- [ ] No infinite loop occurs (test would hang if infinite loop existed)
- [ ] Normal parent-child relationships unaffected (existing tests pass)

### Code Quality Validation

- [ ] Follows existing test patterns (describe/it/expect)
- [ ] Uses SimpleWorkflow class for consistency
- [ ] Test naming follows "should [do something]" convention
- [ ] Comments optional but helpful for clarity
- [ ] No test pollution (each test is independent)

### Documentation & Deployment

- [ ] Test is self-documenting (test name describes expected behavior)
- [ ] Test serves as executable documentation
- [ ] No new environment variables or configuration needed
- [ ] Ready for commit (all validations pass)

---

## Anti-Patterns to Avoid

- ❌ Don't modify src/core/workflow.ts - this is a test-only task
- ❌ Don't add new imports - Workflow is already imported
- ❌ Don't change existing tests - only add a new test case
- ❌ Don't forget arrow function wrapper: `expect(() => ...).toThrow()`
- ❌ Don't use wrong error message - must match exactly
- ❌ Don't test the wrong method - verify getRoot() not getRootObservers()
- ❌ Don't test normal operation - this test is for cycle detection only
- ❌ Don't create separate test file - add to workflow.test.ts

---

## Complete Test Code (Copy-Paste Ready)

```typescript
// ============================================================================
// ADD THIS TEST TO src/__tests__/unit/workflow.test.ts
// Location: At the end of the describe('Workflow') block, before the closing });
// ============================================================================

it('should detect circular parent relationship', () => {
  // Arrange: Create parent and child workflows
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act: Create circular reference manually
  // This simulates a bug or malicious input that creates a cycle
  parent.parent = child;

  // Assert: getRoot() should throw error for circular reference
  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

---

## What the Test Does (Step-by-Step)

1. **Arrange Phase**:
   - Creates `parent` workflow with name "Parent"
   - Creates `child` workflow with name "Child", passing `parent` as parent
   - This establishes normal parent-child relationship

2. **Act Phase**:
   - Manually creates circular reference by setting `parent.parent = child`
   - This creates a cycle: parent → child → parent
   - The cycle would cause infinite loop in old implementation

3. **Assert Phase**:
   - Calls `getRoot()` on the parent workflow
   - Expects an `Error` to be thrown
   - Verifies error message is exactly "Circular parent-child relationship detected"

---

## Why This Test Matters

### Security Context
This test validates the fix for **CWE-835: Loop with Unreachable Exit Condition ('Infinite Loop')**. Without cycle detection:
- Circular references cause infinite loops
- CPU exhaustion leads to DoS
- Application hangs with no useful error

### Test Coverage
Before this test:
- getRoot() cycle detection code was untested
- Regression risk: code could be accidentally removed
- No automated verification of the security fix

After this test:
- Cycle detection is automatically verified
- Any regression is caught by test suite
- Test documents the expected behavior

---

## Related Test Cases (Future Considerations)

While the current task requires only one test, comprehensive coverage might include:

```typescript
// Additional test cases for completeness (optional, not required for P1.M2.T1.S2)

// Test 2: Self-reference detection
it('should detect when workflow is its own parent', () => {
  const workflow = new SimpleWorkflow('SelfRef');
  workflow.parent = workflow;
  expect(() => (workflow as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});

// Test 3: Multi-node cycle detection
it('should detect circular relationship in deep hierarchy', () => {
  const root = new SimpleWorkflow('Root');
  const child1 = new SimpleWorkflow('Child1', root);
  const child2 = new SimpleWorkflow('Child2', child1);
  root.parent = child2; // Create cycle: root -> child1 -> child2 -> root

  expect(() => (root as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});

// Test 4: Normal operation unaffected
it('should return root for valid linear hierarchy', () => {
  const root = new SimpleWorkflow('Root');
  const child1 = new SimpleWorkflow('Child1', root);
  const child2 = new SimpleWorkflow('Child2', child1);

  expect((child2 as any).getRoot()).toBe(root);
});
```

---

## Confidence Score

**10/10** - Implementation is straightforward with comprehensive research, exact test code specification, existing test patterns to follow, and validation commands. The PRP provides everything needed for one-pass implementation success.

---

## Related Work Items

- **P1.M2.T1.S1**: Implement cycle detection logic in getRoot() - Complete (dependency)
- **P1.M2.T1.S3**: Add cycle detection to getRootObservers() method - Pending (1 point)
- **P1.M2.T1.S4**: Write test for cycle detection in getRootObservers() - Pending (1 points)
- **P1.M2.T3**: Add duplicate attachment prevention - Related defensive programming (1 points)
