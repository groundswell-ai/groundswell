# PRP: P1.M2.T1.S2 - Write Failing Tests for detachChild()

## Goal

**Feature Goal**: Write 5 comprehensive failing tests for the `detachChild()` method that validate proper tree detachment behavior including bidirectional consistency, event emission, and error handling.

**Deliverable**: Five test functions in a new test file that will fail initially (because `detachChild()` doesn't exist yet) and will pass after implementation in subtask S3.

**Success Definition**:
- All 5 tests fail with "method doesn't exist" or similar errors when run initially
- Tests cover: (1) removal from parent.children, (2) clearing child.parent, (3) removal from parent.node.children, (4) childDetached event emission, (5) error when child not attached
- Tests follow existing codebase patterns from `src/__tests__/unit/workflow.test.ts`
- Tests use proper mock observer pattern for event verification

## Why

- **Test-Driven Development**: Following TDD principles, write failing tests first to define expected behavior
- **Regression Prevention**: Tests will ensure `detachChild()` works correctly after implementation and prevent future regressions
- **Contract Definition**: Tests serve as executable documentation of the detachChild() contract specified in Pattern 4
- **Enables Reparenting**: These tests validate the core functionality needed for the reparenting workflow (P1.M2.T2)

## What

**User-Visible Behavior**: N/A (internal API method)

**Technical Requirements**:
- Create 5 test functions that validate the detachChild() method behavior
- Tests must follow existing patterns from the codebase
- Tests must initially fail (method doesn't exist)
- Tests cover all aspects of tree detachment specified in Pattern 4

### Success Criteria

- [ ] Test file created at `src/__tests__/unit/workflow-detachChild.test.ts`
- [ ] All 5 tests fail when run with `uv run pytest`
- [ ] Tests use proper WorkflowObserver mock pattern
- [ ] Tests verify bidirectional tree consistency
- [ ] Tests verify childDetached event emission with correct payload
- [ ] Tests verify error handling for non-attached children

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement these tests successfully?

**Answer**: YES - This PRP provides:
- Exact testing framework and version (Vitest 1.0.0)
- Complete test file location and structure patterns
- Exact import patterns needed
- Observer mock pattern with all required callbacks
- Event verification patterns for discriminated unions
- The childDetached event type structure
- The attachChild() implementation as inverse reference
- Pattern 4 specification for expected detachChild() behavior

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://vitest.dev/guide/testing.html
  why: Official Vitest testing framework documentation - core testing patterns
  critical: Use `describe`, `it`, `expect` - all available globally due to `globals: true` in vitest.config.ts

- url: https://vitest.dev/api/expect.html#tothrow
  why: Error assertion patterns for testing exceptions
  critical: Use `expect(() => method()).toThrow(/pattern/)` for error testing

- file: src/__tests__/unit/workflow.test.ts
  why: Primary reference for all test patterns in this codebase
  pattern: Observer mock setup, event collection, discriminated union type narrowing
  gotcha: Must provide ALL 4 WorkflowObserver callbacks even if empty

- file: src/core/workflow.ts:216-254
  why: attachChild() implementation - the inverse operation we're testing
  pattern: Validation → Update workflow tree → Update node tree → Emit event
  gotcha: attachChild() updates BOTH `this.children` AND `this.node.children`

- file: src/types/events.ts:11
  why: childDetached event type definition (added in P1.M2.T1.S1)
  pattern: `{ type: 'childDetached'; parentId: string; childId: string }`
  gotcha: This is a discriminated union - must check `type === 'childDetached'` before accessing payload

- file: plan/docs/bugfix-architecture/implementation_patterns.md:141-173
  why: Pattern 4 - Complete specification of detachChild() behavior
  pattern: Validate → Remove from both trees → Clear parent → Emit event
  critical: Expected to throw error if child not in parent.children

- docfile: plan/bugfix/P1M2T1S2/research/typescript_testing_patterns.md
  why: Comprehensive Observable testing patterns and Groundswell-specific patterns
  section: Groundswell-Specific Patterns (lines 853-980)
  critical: Complete Observer Mock pattern (lines 876-883)
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── unit/
│   │   └── workflow.test.ts          # PRIMARY REFERENCE - existing Workflow tests
│   ├── integration/
│   │   └── agent-workflow.test.ts
│   └── adversarial/
│       └── circular-reference.test.ts
├── core/
│   └── workflow.ts                   # Contains attachChild() - inverse reference
├── types/
│   ├── events.ts                     # Contains childDetached event type (line 11)
│   ├── observer.ts                   # WorkflowObserver interface
│   └── index.ts
└── index.ts                          # Main exports

plan/
├── docs/
│   └── bugfix-architecture/
│       └── implementation_patterns.md  # Pattern 4 specification
└── bugfix/
    └── P1M2T1S2/
        ├── PRP.md                     # This document
        └── research/
            └── typescript_testing_patterns.md  # Observable testing patterns
```

### Desired Codebase Tree (Files to Add)

```bash
src/
├── __tests__/
│   └── unit/
│       └── workflow-detachChild.test.ts  # NEW - 5 failing tests for detachChild()
```

### Known Gotchas of This Codebase

```typescript
// CRITICAL: WorkflowObserver requires ALL 4 callbacks, even if empty
// Source: src/types/observer.ts
const observer: WorkflowObserver = {
  onLog: () => {},          // REQUIRED - cannot omit
  onEvent: (event) => {},   // REQUIRED - cannot omit
  onStateUpdated: () => {}, // REQUIRED - cannot omit
  onTreeChanged: () => {},  // REQUIRED - cannot omit
};

// CRITICAL: childDetached event uses discriminated union
// Source: src/types/events.ts:11
// MUST check type before accessing payload
const detachEvent = events.find(e => e.type === 'childDetached');
if (detachEvent?.type === 'childDetached') {
  // TypeScript now knows this is ChildDetachedEvent
  expect(detachEvent.parentId).toBe(parent.id);
  expect(detachEvent.childId).toBe(child.id);
}

// CRITICAL: Dual tree architecture - must verify BOTH trees
// Workflow instance tree: parent.children, child.parent
// Node tree: parent.node.children, child.node.parent
// Both must be updated atomically by detachChild()

// CRITICAL: attachChild() is called in Workflow constructor
// Source: src/core/workflow.ts:115
// Creating child WITH parent automatically calls attachChild()
const child = new SimpleWorkflow('Child', parent); // Calls attachChild()

// CRITICAL: Error messages use template literals with node names
// Pattern from src/core/workflow.ts:223-228
throw new Error(
  `Child '${child.node.name}' already has parent '${child.parent.node.name}'. ` +
  `A workflow can only have one parent. ` +
  `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`
);
```

## Implementation Blueprint

### Test Structure and Naming

```typescript
// File: src/__tests__/unit/workflow-detachChild.test.ts

import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

// Simple test workflow class (same pattern as workflow.test.ts)
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow.detachChild()', () => {
  // Test 1: Remove from parent.children array
  // Test 2: Clear child.parent to null
  // Test 3: Remove from parent.node.children array
  // Test 4: Emit childDetached event
  // Test 5: Throw error if child not attached
});
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/workflow-detachChild.test.ts
  - IMPLEMENT: 5 test functions for detachChild() method
  - FOLLOW pattern: src/__tests__/unit/workflow.test.ts (observer setup, assertions)
  - NAMING: describe('Workflow.detachChild()'), individual it() descriptions
  - PLACEMENT: New file in src/__tests__/unit/

Task 2: VERIFY test file structure
  - IMPORT: Workflow, WorkflowObserver, WorkflowEvent from ../../index.js
  - DEFINE: SimpleWorkflow test class (extends Workflow)
  - SETUP: describe block for detachChild tests

Task 3: WRITE Test 1 - Removal from parent.children
  - VERIFY: parent.children no longer contains child after detachChild(child)
  - FOLLOW: Array assertion pattern `expect(array).not.toContain(item)`
  - SETUP: Create parent with child using constructor

Task 4: WRITE Test 2 - Clear child.parent
  - VERIFY: child.parent is null after detachChild(child)
  - FOLLOW: Null assertion pattern `expect(value).toBeNull()`
  - SETUP: Create parent with child using constructor

Task 5: WRITE Test 3 - Removal from parent.node.children
  - VERIFY: parent.node.children no longer contains child.node after detachChild
  - FOLLOW: Node tree assertion pattern
  - SETUP: Create parent with child using constructor

Task 6: WRITE Test 4 - childDetached event emission
  - VERIFY: childDetached event is emitted with correct parentId and childId
  - FOLLOW: Event collection and filtering pattern from workflow.test.ts:63-80
  - MOCK: WorkflowObserver with onEvent callback capturing events
  - ASSERT: Event type and payload using discriminated union type guard

Task 7: WRITE Test 5 - Error when child not attached
  - VERIFY: Error thrown when calling detachChild on non-attached child
  - FOLLOW: Error assertion pattern `expect(() => action()).toThrow(/pattern/)`
  - SETUP: Create parent and child separately (no initial attachment)

Task 8: RUN tests to verify they fail
  - EXECUTE: uv run pytest src/__tests__/unit/workflow-detachChild.test.ts
  - VERIFY: All 5 tests fail with "method doesn't exist" or similar errors
  - EXPECTED: Tests should fail because detachChild() method doesn't exist yet
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Test Setup with Observer Mock
// Source: src/__tests__/unit/workflow.test.ts:45-54
const events: WorkflowEvent[] = [];
const treeChangedCalls: WorkflowNode[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},                              // Empty - not testing logs
  onEvent: (event) => events.push(event),       // Capture events for verification
  onStateUpdated: () => {},                      // Empty - not testing state
  onTreeChanged: (root) => treeChangedCalls.push(root), // Capture tree changes
};

// Pattern 2: Create Parent-Child Relationship
// Source: src/__tests__/unit/workflow.test.ts:36-43
const parent = new SimpleWorkflow('Parent');
const child = new SimpleWorkflow('Child', parent); // Calls attachChild() automatically

// Verify relationship established
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);

// Pattern 3: Event Verification with Discriminated Union
// Source: src/__tests__/unit/workflow.test.ts:77-79
const attachEvent = events.find((e) => e.type === 'childAttached');
expect(attachEvent).toBeDefined();
expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);

// Pattern 4: Error Testing for Invalid Operations
// Source: src/__tests__/unit/workflow.test.ts:241-249
const parent = new SimpleWorkflow('Parent');
const child = new SimpleWorkflow('Child', parent);

expect(() => parent.attachChild(child)).toThrow(
  'Child already attached to this workflow'
);

// Pattern 5: Bidirectional Tree Verification
// Verify both workflow tree and node tree are consistent
expect(child.parent).toBeNull();                    // Workflow tree
expect(parent.children).not.toContain(child);       // Workflow tree
expect(parent.node.children).not.toContain(child.node); // Node tree

// GOTCHA: childDetached event structure (from src/types/events.ts:11)
// { type: 'childDetached'; parentId: string; childId: string }
// Note: Uses childId (string), NOT child (WorkflowNode) like childAttached
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - runner: Vitest 1.0.0
  - config: vitest.config.ts (globals: true, include pattern)
  - command: uv run pytest src/__tests__/unit/workflow-detachChild.test.ts

EVENT_TYPES:
  - file: src/types/events.ts
  - line: 11
  - type: { type: 'childDetached'; parentId: string; childId: string }
  - note: Added in P1.M2.T1.S1 (already complete)

EXISTING_TESTS:
  - reference: src/__tests__/unit/workflow.test.ts
  - patterns: Observer setup, event collection, error assertions
  - note: Follow exact same patterns for consistency

WORKFLOW_CLASS:
  - file: src/core/workflow.ts
  - method to test: detachChild() (doesn't exist yet - will fail)
  - inverse: attachChild() at lines 216-254
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating test file
cd /home/dustin/projects/groundswell
uv run ruff check src/__tests__/unit/workflow-detachChild.test.ts --fix
uv run mypy src/__tests__/unit/workflow-detachChild.test.ts
uv run ruff format src/__tests__/unit/workflow-detachChild.test.ts

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test file
uv run pytest src/__tests__/unit/workflow-detachChild.test.ts -v

# EXPECTED: All 5 tests should FAIL with errors like:
# - "parent.detachChild is not a function"
# - "Cannot read property 'call' of undefined"
# - Similar "method doesn't exist" errors

# This is CORRECT behavior - we're writing FAILING tests first (TDD)

# If tests pass unexpectedly, something is wrong - investigate
```

### Level 3: Regression Testing (System Validation)

```bash
# Ensure existing tests still pass (no new test should break existing functionality)
uv run pytest src/__tests__/unit/workflow.test.ts -v

# Expected: All existing tests pass (241+ tests)
# New detachChild tests should be in separate file and not interfere

# Full test suite
uv run pytest src/ -v

# Expected: All existing tests pass, new detachChild tests fail
```

### Level 4: Test Coverage Verification

```bash
# Verify test file is discovered by Vitest
uv run pytest src/__tests__/unit/ --list-tests

# Expected: workflow-detachChild.test.ts should appear in list

# Check specific test names
uv run pytest src/__tests__/unit/workflow-detachChild.test.ts --list-tests

# Expected: Should list all 5 test functions
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at correct path: `src/__tests__/unit/workflow-detachChild.test.ts`
- [ ] All imports correct: `Workflow`, `WorkflowObserver`, `WorkflowEvent` from `../../index.js`
- [ ] Test class defined: `SimpleWorkflow extends Workflow`
- [ ] All 5 tests implemented with proper `it()` descriptions
- [ ] No linting errors: `uv run ruff check src/__tests__/unit/workflow-detachChild.test.ts`
- [ ] No type errors: `uv run mypy src/__tests__/unit/workflow-detachChild.test.ts`
- [ ] Proper formatting: `uv run ruff format src/__tests__/unit/workflow-detachChild.test.ts`

### Test Content Validation

- [ ] Test 1: Verifies removal from `parent.children` array
- [ ] Test 2: Verifies `child.parent` set to `null`
- [ ] Test 3: Verifies removal from `parent.node.children` array
- [ ] Test 4: Verifies `childDetached` event emission with correct payload
- [ ] Test 5: Verifies error thrown when child not attached
- [ ] All tests use proper `WorkflowObserver` mock with all 4 callbacks
- [ ] Event verification uses discriminated union type guard
- [ ] Error tests use `expect(() => ...).toThrow(/pattern/)` pattern

### Failing Test Validation (TDD Confirmation)

- [ ] Running `uv run pytest src/__tests__/unit/workflow-detachChild.test.ts` shows all 5 tests FAILING
- [ ] Failure reason is "method doesn't exist" or similar (not logic errors)
- [ ] Existing test suite still passes: `uv run pytest src/__tests__/unit/workflow.test.ts`
- [ ] No new tests pass unexpectedly

### Code Quality Validation

- [ ] Follows existing test patterns from `workflow.test.ts`
- [ ] Test descriptions are clear and descriptive
- [ ] Setup code follows DRY principles (describe blocks, beforeEach if needed)
- [ ] Assertions are specific and meaningful
- [ ] No hardcoded IDs or brittle assumptions

## Anti-Patterns to Avoid

- ❌ Don't omit any `WorkflowObserver` callbacks - all 4 are required
- ❌ Don't access event payload without type guard - must check `e.type === 'childDetached'` first
- ❌ Don't mix up `childId` (string) vs `child` (WorkflowNode) - childDetached uses childId
- ❌ Don't forget to verify BOTH trees (workflow and node) - dual tree architecture
- ❌ Don't use `async` for tests that don't need it - only use if testing async operations
- ❌ Don't create tests that pass accidentally - they MUST fail initially
- ❌ Don't put tests in the wrong file - create new `workflow-detachChild.test.ts` file
- ❌ Don't use incomplete observer mock - must have all 4 callbacks even if empty
- ❌ Don't assert on wrong event type - use type guards for discriminated unions

---

## Test Specifications (Detailed)

### Test 1: Remove from parent.children Array

```typescript
it('should remove child from parent.children array', () => {
  // Arrange: Create parent with child
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Assert: Verify child is in parent.children
  expect(parent.children).toContain(child);

  // Act: Call detachChild (will fail - method doesn't exist)
  parent.detachChild(child);

  // Assert: Verify child removed from parent.children
  expect(parent.children).not.toContain(child);
});
```

### Test 2: Clear child.parent to null

```typescript
it('should clear child.parent to null', () => {
  // Arrange: Create parent with child
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Assert: Verify child.parent is set
  expect(child.parent).toBe(parent);

  // Act: Call detachChild
  parent.detachChild(child);

  // Assert: Verify child.parent is null
  expect(child.parent).toBeNull();
});
```

### Test 3: Remove from parent.node.children Array

```typescript
it('should remove child.node from parent.node.children array', () => {
  // Arrange: Create parent with child
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Assert: Verify child.node is in parent.node.children
  expect(parent.node.children).toContain(child.node);

  // Act: Call detachChild
  parent.detachChild(child);

  // Assert: Verify child.node removed from parent.node.children
  expect(parent.node.children).not.toContain(child.node);
});
```

### Test 4: Emit childDetached Event

```typescript
it('should emit childDetached event with correct payload', () => {
  // Arrange: Create parent with observer
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);

  // Act: Create child (triggers attachChild event), then detach
  const child = new SimpleWorkflow('Child', parent);
  events.length = 0; // Clear attachChild events

  parent.detachChild(child);

  // Assert: Verify childDetached event was emitted
  const detachEvent = events.find((e) => e.type === 'childDetached');
  expect(detachEvent).toBeDefined();

  // Assert: Verify event payload (with type guard for discriminated union)
  expect(detachEvent?.type === 'childDetached' && detachEvent.parentId).toBe(parent.id);
  expect(detachEvent?.type === 'childDetached' && detachEvent.childId).toBe(child.id);
});
```

### Test 5: Throw Error When Child Not Attached

```typescript
it('should throw error when child is not attached to parent', () => {
  // Arrange: Create parent and child separately (no attachment)
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child');

  // Assert: Verify child is NOT in parent.children
  expect(parent.children).not.toContain(child);

  // Act & Assert: Calling detachChild should throw error
  expect(() => parent.detachChild(child)).toThrow(
    /not attached/i
  );
});
```

---

## Confidence Score: 10/10

**Reasoning**:
- Complete specification from Pattern 4 in implementation_patterns.md
- Full reference implementation (attachChild) as inverse operation
- Existing test patterns well-documented and consistent
- Event type already defined and added to discriminated union
- Comprehensive research on Vitest and Observable testing patterns
- Clear anti-patterns and gotchas documented
- Exact file paths and line numbers provided for all references

**One-Pass Implementation Success**: Highly confident that an AI agent with no prior knowledge of this codebase could successfully implement these 5 failing tests using only this PRP and codebase access.
