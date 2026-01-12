# PRP: Write test for cycle detection in getRootObservers()

---

## Goal

**Feature Goal**: Write a unit test that validates the cycle detection mechanism in the `getRootObservers()` private method prevents infinite loops from circular parent-child relationships.

**Deliverable**: A single test case added to `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts` that verifies `getRootObservers()` throws an error when a circular parent-child relationship is detected.

**Success Definition**:
- New test passes when run with `npm test`
- Test follows the exact pattern of the existing `getRoot()` cycle detection test (P1.M2.T1.S2)
- Test validates the same error message: `'Circular parent-child relationship detected'`

---

## All Needed Context

### Context Completeness Check

✅ **Passes "No Prior Knowledge" test**: This PRP provides complete file paths, line numbers, existing test code to replicate, implementation details, and exact test patterns to follow.

### Documentation & References

```yaml
# MUST READ - Existing Test Pattern (Template to Follow)
- file: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  lines: 209-223
  why: Complete reference test for cycle detection (getRoot() test from P1.M2.T1.S2)
  pattern: Use this exact structure - Arrange/Act/Assert with circular reference creation
  gotcha: getRootObservers() is private (not protected), requiring different access approach

# Implementation Being Tested
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  lines: 124-139
  why: The getRootObservers() method implementation with cycle detection logic
  critical: Throws `new Error('Circular parent-child relationship detected')` on cycle
  gotcha: Private method - cannot be accessed directly via (instance as any)

# Test Utilities
- file: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  lines: 4-11
  why: SimpleWorkflow test class definition to use in test
  pattern: Extend Workflow class, implement async run() method

# For Comparison
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  lines: 145-160
  why: getRoot() method - has identical cycle detection logic but is protected
  pattern: Same error message, same traversal approach

# Research Documentation
- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M2T1S4/research/existing_test_pattern.md
  why: Detailed analysis of P1.M2.T1.S2 test pattern to replicate

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M2T1S4/research/getRootObservers_implementation.md
  why: Complete implementation details of getRootObservers() method

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M2T1S4/research/test_conventions.md
  why: Project test conventions and patterns

- docfile: /home/dustin/projects/groundswell/plan/bugfix/P1M2T1S4/research/codebase_structure.md
  why: File organization and directory structure
```

### Current Codebase Tree (Relevant Files)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts              # Lines 124-139: getRootObservers() with cycle detection
│   ├── __tests__/
│   │   └── unit/
│   │       └── workflow.test.ts     # Lines 209-223: getRoot() cycle detection test
│   └── index.js                     # Main exports
└── plan/
    └── bugfix/
        └── P1M2T1S4/                # This subtask directory
            ├── research/            # Research documentation
            └── PRP.md              # This file
```

### Desired Codebase Tree After Implementation

```bash
# No new files - test is added to existing workflow.test.ts
# Test should be added after line 223 (after getRoot() cycle detection test)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: getRootObservers() is PRIVATE, not protected
// Unlike getRoot() which is protected, getRootObservers() cannot be accessed via (instance as any)
// The method is called internally by:
//   - Constructor (line 111) - for logger creation
//   - emitEvent() method (line 205)
//   - snapshotState() method (line 228)

// GOTCHA: Testing private methods in this codebase
// Since getRootObservers() is private, you must trigger it indirectly through:
//   1. Creating a workflow with observers after establishing a cycle
//   2. Calling a method that uses getRootObservers() (e.g., emitEvent, snapshotState)
//   3. Or accessing via TypeScript casting if the test framework allows

// CRITICAL: Error message must match EXACTLY
throw new Error('Circular parent-child relationship detected')
// The test should expect this exact string

// PATTERN: Circular reference creation
parent.parent = child;  // This creates the cycle that triggers detection

// GOTCHA: Test placement
// Add test immediately after line 223 (within same describe block)
// Keep similar test together for maintainability
```

---

## Implementation Blueprint

### Test Structure

The test should follow the exact Arrange/Act/Assert pattern from P1.M2.T1.S2:

```typescript
it('should detect circular relationship in getRootObservers', () => {
  // Arrange: Create parent and child workflows
  // Act: Create circular reference manually
  // Assert: Verify error is thrown
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE the test insertion point
  - FIND: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  - NAVIGATE to: Line 223 (end of existing getRoot() cycle detection test)
  - VERIFY: Inside the describe('Workflow', ...) block
  - INSERT: New test immediately after line 223

Task 2: WRITE the test case
  - IMPLEMENT: Test following exact pattern from lines 209-223
  - NAMING: 'should detect circular relationship in getRootObservers'
  - PATTERN:
      1. Arrange: Create parent and child workflows using SimpleWorkflow
      2. Act: Create circular reference (parent.parent = child)
      3. Assert: Expect error when getRootObservers() is called

  - CRITICAL: Handle private method access
    - Option A: Use (workflow as any).getRootObservers() if TypeScript allows
    - Option B: Trigger through a public method that calls getRootObservers()
    - Option C: Test the side effect (error thrown during observer-related operations)

Task 3: VERIFY error message matching
  - EXPECT: 'Circular parent-child relationship detected'
  - USE: expect(() => ...).toThrow('Circular parent-child relationship detected')
  - ENSURE: Exact string match with implementation (line 131 in workflow.ts)

Task 4: RUN tests to validate
  - EXECUTE: npm test
  - VERIFY: New test passes
  - CONFIRM: No existing tests broken
```

### Implementation Patterns & Key Details

```typescript
// EXISTING TEST PATTERN (P1.M2.T1.S2) - Lines 209-223
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

// NEW TEST PATTERN FOR getRootObservers()
// Key difference: getRootObservers() is PRIVATE
it('should detect circular relationship in getRootObservers', () => {
  // Arrange: Create parent and child workflows
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act: Create circular reference manually
  parent.parent = child;

  // Assert: getRootObservers() should throw error for circular reference
  // NOTE: getRootObservers() is private - may need alternative access
  // Option 1: Direct access if test framework allows
  expect(() => (parent as any).getRootObservers()).toThrow(
    'Circular parent-child relationship detected'
  );

  // Option 2: Trigger through method that uses getRootObservers()
  // e.g., expect(() => parent.emitEvent(...)).toThrow(...)
});

// TEST UTILITY CLASS (Already defined at lines 4-11)
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}

// IMPORTS (Already present at line 1-2)
import { describe, it, expect } from 'vitest';
import { Workflow, /* ... */ } from '../../index.js';
```

### Critical Implementation Details

```yaml
# Private Method Access Challenge
- getRootObservers() is private (line 124)
- Cannot be accessed directly like protected getRoot() method
- Consider using (instance as any) if TypeScript compilation allows
- Alternative: Trigger through public methods that call getRootObservers():
  * Constructor calls it for logger (line 111)
  * emitEvent() calls it (line 205)
  * snapshotState() calls it (line 228)

# Error Message Exact Match
- Implementation: throw new Error('Circular parent-child relationship detected')
- Test must use: expect(() => ...).toThrow('Circular parent-child relationship detected')

# Test Naming Convention
- Format: 'should [expected behavior]'
- Suggested: 'should detect circular relationship in getRootObservers'
- Or: 'should detect circular parent relationship in getRootObservers'

# Test Placement
- Insert after line 223 (immediately after getRoot() cycle detection test)
- Keep related cycle detection tests together
- Within describe('Workflow', ...) block
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript check on the test file
npx tsc --noEmit src/__tests__/unit/workflow.test.ts

# Run linter (if project uses one)
npm run lint 2>/dev/null || echo "No lint script configured"

# Expected: Zero TypeScript errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file
npm test -- workflow.test.ts

# Run only cycle detection tests
npm test -- -t "should detect circular"

# Full test suite
npm test

# Expected:
# - New test passes: "should detect circular relationship in getRootObservers"
# - All existing tests still pass
# - No test failures or errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Ensure no regressions in workflow functionality
npm test -- --coverage

# Verify cycle detection works in practice
# (This is covered by the unit test itself)

# Expected: All integration tests pass
```

### Level 4: Manual Verification

```bash
# Open the test file and visually verify:
# 1. Test is properly placed after line 223
# 2. Test follows the Arrange/Act/Assert pattern
# 3. Comments explain each step
# 4. Error message matches exactly

# Run tests in watch mode to see real-time results
npm run test:watch
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file compiles without TypeScript errors
- [ ] New test passes: `npm test -- workflow.test.ts`
- [ ] All existing tests still pass: `npm test`
- [ ] Test is placed at correct location (after line 223)
- [ ] Error message matches implementation exactly

### Feature Validation

- [ ] Test follows P1.M2.T1.S2 pattern (Arrange/Act/Assert)
- [ ] Circular reference is created correctly (`parent.parent = child`)
- [ ] Error is thrown when cycle is detected
- [ ] Test validates correct error message

### Code Quality Validation

- [ ] Test has clear, descriptive name
- [ ] Comments explain the test purpose
- [ ] Test is maintainable and follows project conventions
- [ ] No code duplication beyond necessary pattern replication

### Documentation & Deployment

- [ ] PRP is complete and self-documenting
- [ ] Research findings are stored in research/ directory
- [ ] Test location is documented for future reference

---

## Anti-Patterns to Avoid

- ❌ Don't place test in wrong location (must be after line 223)
- ❌ Don't use different error message (must be exact match)
- ❌ Don't forget to use SimpleWorkflow class (already defined)
- ❌ Don't omit Arrange/Act/Assert comments
- ❌ Don't use different naming convention
- ❌ Don't modify existing tests
- ❌ Don't create new test file (add to existing workflow.test.ts)
- ❌ Don't skip validation (must run tests and verify pass)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Validation**: This PRP provides:
- Exact file paths and line numbers for all references
- Complete existing test code to replicate
- Implementation details with exact error message
- Clear handling of private method access challenge
- Project test conventions and patterns
- Research documentation for additional context

The implementing agent has everything needed to write a passing test for cycle detection in getRootObservers() using only this PRP and codebase access.
