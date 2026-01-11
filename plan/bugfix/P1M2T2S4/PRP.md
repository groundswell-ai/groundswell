# Product Requirement Prompt (PRP): Integration Test for treeUpdated Event Propagation

**PRP ID**: P1.M2.T2.S4
**Work Item Title**: Write integration test for treeUpdated event propagation
**PRD Reference**: P1.M2.T2.S4
**Created**: 2026-01-11

---

## Goal

**Feature Goal**: Add integration test to `src/__tests__/integration/tree-mirroring.test.ts` that validates `treeUpdated` events propagate correctly from child workflows to root observers when status changes occur via `child.setStatus()`.

**Deliverable**: A new integration test case `it('should propagate treeUpdated events to root observers')` added to the existing `tree-mirroring.test.ts` file.

**Success Definition**:
- Test creates a parent-child workflow tree
- Test attaches observer to root workflow
- Test calls `child.setStatus('completed')`
- Test verifies root observer receives `treeUpdated` event via `onEvent()` callback
- Test verifies root observer receives tree change notification via `onTreeChanged()` callback
- Test passes with `npm test` or `uv run vitest run`

---

## Why

This test validates the bug fix implemented in P1.M2.T2.S1 (setStatus() now emits treeUpdated events) and P1.M2.T2.S3 (snapshotState() emits treeUpdated events). The integration test ensures:

1. **Event Propagation Works End-to-End**: Confirms that status changes in child workflows trigger treeUpdated events that bubble up to root observers
2. **Tree Debugger Integration**: Validates that WorkflowTreeDebugger receives tree change notifications to rebuild its tree visualization
3. **Observer Pattern Correctness**: Ensures getRootObservers() correctly traverses parent chain and notifies all root observers
4. **No Regression**: Prevents future changes from breaking tree-wide event propagation

---

## What

### Success Criteria

- [ ] Test file `src/__tests__/integration/tree-mirroring.test.ts` contains new test case
- [ ] Test follows existing patterns from `should propagate events to root observer` test
- [ ] Test verifies `treeUpdated` event is received via `onEvent()` callback
- [ ] Test verifies `onTreeChanged()` callback is invoked with root node
- [ ] Test uses descriptive name matching pattern: `should propagate treeUpdated events to root observers`
- [ ] All existing tests still pass (no regression)
- [ ] New test passes consistently (non-flaky)

### User Persona

**Target User**: Developer maintaining the workflow system

**Use Case**: When making changes to workflow status management or observer notification logic, this test provides assurance that tree-wide event propagation continues to function correctly.

**User Journey**:
1. Developer modifies `setStatus()` method or observer logic
2. Developer runs test suite: `npm test`
3. Test validates that child status changes propagate treeUpdated events to root
4. If propagation breaks, test fails immediately with clear error message

**Pain Points Addressed**:
- Previously, treeUpdated events could break silently without detection
- Tree debugger would show stale state if events didn't propagate
- No integration-level validation of cross-workflow event flow

---

## All Needed Context

### Context Completeness Check

✅ **Passes "No Prior Knowledge" test**: A developer unfamiliar with this codebase has everything needed to implement this test successfully.

### Documentation & References

```yaml
# MUST READ - Integration test patterns
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Existing integration test patterns to follow exactly
  pattern: Observe how parent-child trees are created, how observers are attached, how events are collected and filtered
  gotcha: Note the inline observer pattern with arrow functions, the use of filter() for event assertions, and the try-catch for potentially failing operations

# MUST READ - Observer interface and usage
- file: src/types/observer.ts
  why: WorkflowObserver interface definition with all required callback methods
  pattern: onLog, onEvent, onStateUpdated, onTreeChanged must all be implemented (even if empty)
  gotcha: onTreeChanged receives root: WorkflowNode parameter, onEvent receives event: WorkflowEvent

# MUST READ - Event types definition
- file: src/types/events.ts
  why: WorkflowEvent discriminated union including treeUpdated event type definition
  pattern: treeUpdated events have structure: { type: 'treeUpdated', root: WorkflowNode }
  section: Lines 1-30 cover all event types including treeUpdated

# MUST READ - Workflow class for tree creation
- file: src/core/workflow.ts
  why: Understanding parent-child workflow creation and observer attachment
  pattern: Constructor signature: constructor(name?: string, parent?: Workflow) - pass parent as second argument
  section: Lines 83-117 for constructor, lines 166-171 for addObserver(), lines 250-254 for setStatus() with treeUpdated emission

# MUST READ - Event emission implementation
- file: src/core/workflow.ts
  why: Understanding how treeUpdated events propagate via getRootObservers()
  pattern: emitEvent() calls getRootObservers() and invokes both onEvent() and onTreeChanged() for treeUpdated events
  section: Lines 202-218 for emitEvent(), lines 124-139 for getRootObservers()

# MUST READ - Existing setStatus test pattern
- file: src/__tests__/unit/workflow.test.ts
  why: Reference test for treeUpdated event emission on setStatus
  pattern: Creates observer with event collection, calls setStatus(), verifies treeUpdated event in events array
  section: Lines 241-271 show exact assertion pattern for treeUpdated events

# EXTERNAL - Vitest assertion API
- url: https://vitest.dev/api/expect.html
  why: Vitest assertion methods used in test (toBe, toBeDefined, toBeGreaterThan, expect.arrayContaining, etc.)
  critical: Use toBe() for primitive equality, toBeDefined() for existence checks, filter() for array assertions

# EXTERNAL - Vitest async testing
- url: https://vitest.dev/guide/testing.html#testing-async
  why: Pattern for async test functions (though this test is synchronous)
  critical: Test functions use async/await pattern even if not strictly needed for consistency

# EXTERNAL - Discriminated union type guards
- url: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
  why: Pattern for type-safe event filtering: events.filter(e => e.type === 'treeUpdated')
  critical: Use type narrowing for discriminated unions when accessing event-specific properties
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   └── tree-mirroring.test.ts     # <-- ADD TEST HERE
│   └── unit/
│       └── workflow.test.ts             # Reference for unit test patterns
├── core/
│   ├── workflow.ts                      # Workflow class, setStatus, emitEvent
│   └── logger.ts                        # Logging with observer notification
├── debugger/
│   └── tree-debugger.ts                 # WorkflowTreeDebugger implementation
├── types/
│   ├── observer.ts                      # WorkflowObserver interface
│   └── events.ts                        # WorkflowEvent discriminated union
└── index.ts                             # Public API exports
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files - modifying existing file:
src/
├── __tests__/
│   ├── integration/
│   │   └── tree-mirroring.test.ts     # <-- ADD NEW TEST CASE HERE
#                                        (Existing tests: should create 1:1 tree mirror, should propagate events to root observer, should include state snapshot on error)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Observers can ONLY be added to root workflows
// Example: child.addObserver(observer) throws Error('Observers can only be added to root workflows')
// Source: src/core/workflow.ts lines 166-171

// CRITICAL: All observer callbacks must be implemented (even if empty)
// Example: const observer: WorkflowObserver = {
//            onLog: () => {},  // Required even if not testing logs
//            onEvent: (event) => events.push(event),
//            onStateUpdated: () => {},  // Required even if not testing state updates
//            onTreeChanged: (root) => treeChangedCalls.push(root)
//          }

// CRITICAL: treeUpdated event structure uses discriminated union
// Example: if (event.type === 'treeUpdated') { /* TypeScript knows event.root exists */ }
// Source: src/types/events.ts

// CRITICAL: Event emission is synchronous - no promises/async needed for this test
// Example: child.setStatus('completed') immediately triggers observer callbacks

// CRITICAL: Use (workflow as any).maxCycles = 1 to limit TDDOrchestrator iterations in tests
// Source: Pattern from existing tree-mirroring tests

// CRITICAL: Parent-child creation pattern
// Example: const parent = new Workflow('Parent');
//          const child = new Workflow('Child', parent);  // Parent as second argument

// CRITICAL: Event filtering pattern uses array methods
// Example: const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');
//          expect(treeUpdatedEvents.length).toBeGreaterThan(0);

// CRITICAL: Test naming convention uses "should" pattern
// Example: it('should propagate treeUpdated events to root observers', () => { ... })
```

---

## Implementation Blueprint

### Test Structure Overview

The integration test follows the **Arrange-Act-Assert** pattern with an inline observer that collects both events and tree change notifications:

1. **Arrange**: Create parent-child workflow tree, set up observer with collection arrays
2. **Act**: Call `child.setStatus('completed')` to trigger event propagation
3. **Assert**: Verify `treeUpdated` event and tree change notification were received

### Implementation Task

```yaml
Task 1: ADD integration test to src/__tests__/integration/tree-mirroring.test.ts
  - IMPLEMENT: New test case within existing 'Tree Mirroring Integration' describe block
  - NAME: 'should propagate treeUpdated events to root observers'
  - PATTERN: Follow existing test structure from 'should propagate events to root observer' (lines 43-79)
  - STRUCTURE: Arrange-Act-Assert with inline observer pattern
  - PLACEMENT: After existing 'should include state snapshot on error' test (after line 113)

  TEST CONTENT:
    1. ARRANGE - Create parent-child workflow tree:
       - const parent = new SimpleWorkflow('Parent');
       - const child = new SimpleWorkflow('Child', parent);

    2. ARRANGE - Set up observer with collection arrays:
       - const events: WorkflowEvent[] = [];
       - const treeChangedCalls: WorkflowNode[] = [];

    3. ARRANGE - Create observer implementing WorkflowObserver interface:
       - onLog: () => {} (empty - not testing logs)
       - onEvent: (event) => events.push(event) (collect events)
       - onStateUpdated: () => {} (empty - not testing state updates)
       - onTreeChanged: (root) => treeChangedCalls.push(root) (collect tree changes)

    4. ARRANGE - Attach observer to parent (root):
       - parent.addObserver(observer);

    5. ACT - Trigger status change on child:
       - child.setStatus('completed');

    6. ASSERT - Verify treeUpdated event was emitted:
       - const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
       - expect(treeUpdatedEvent).toBeDefined();
       - if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
           expect(treeUpdatedEvent.root).toBe(parent.getNode());
         }

    7. ASSERT - Verify onTreeChanged callback was invoked:
       - expect(treeChangedCalls).toHaveLength(1);
       - expect(treeChangedCalls[0]).toBe(parent.getNode());

  VALIDATION: Run specific test file with: npm test -- tree-mirroring.test.ts
```

### Implementation Patterns & Key Details

```typescript
// === Test Skeleton ===
describe('Tree Mirroring Integration', () => {
  // ... existing tests ...

  it('should propagate treeUpdated events to root observers', () => {
    // ARRANGE: Create parent-child tree
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // ARRANGE: Set up observer with collection arrays
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: WorkflowNode[] = [];

    // ARRANGE: Create inline observer (pattern from lines 50-55 of existing test)
    const observer: WorkflowObserver = {
      onLog: () => {},  // Empty - not testing logs
      onEvent: (event) => events.push(event),  // Capture events
      onStateUpdated: () => {},  // Empty - not testing state updates
      onTreeChanged: (root) => treeChangedCalls.push(root),  // Capture tree changes
    };

    // ARRANGE: Attach observer to ROOT (parent, not child)
    parent.addObserver(observer);

    // ACT: Trigger status change on CHILD workflow
    child.setStatus('completed');

    // ASSERT: Verify treeUpdated event was received via onEvent
    const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    // ASSERT: Type guard for discriminated union + verify root node
    if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
      expect(treeUpdatedEvent.root).toBe(parent.getNode());
    }

    // ASSERT: Verify onTreeChanged callback was invoked
    expect(treeChangedCalls).toHaveLength(1);
    expect(treeChangedCalls[0]).toBe(parent.getNode());
  });
});
```

### Critical Gotchas for Test Implementation

```typescript
// GOTCHA: Don't use TDDOrchestrator for this test - use SimpleWorkflow
// Reason: TDDOrchestrator has complex internal behavior; SimpleWorkflow is deterministic
// Pattern: const parent = new SimpleWorkflow('Parent');

// GOTCHA: Must import SimpleWorkflow at top of file
// Add to imports: import { SimpleWorkflow } from '../helpers/simple-workflow';
// OR use TDDOrchestrator with: const orchestrator = new TDDOrchestrator('Parent');
//    const child = new TDDOrchestrator('Child', orchestrator);

// GOTCHA: Observer attachment MUST be on root (parent), not child
// Wrong: child.addObserver(observer) - throws Error
// Right: parent.addObserver(observer)

// GOTCHA: Event verification uses type guard for discriminated union
// Pattern: if (event && event.type === 'treeUpdated') { /* access event.root safely */ }

// GOTCHA: Use parent.getNode() to get the root WorkflowNode for comparison
// Pattern: expect(treeUpdatedEvent.root).toBe(parent.getNode());

// GOTCHA: Test is SYNCHRONOUS - no async/await needed
// setStatus() emits events synchronously
```

### Import Requirements

```typescript
// File: src/__tests__/integration/tree-mirroring.test.ts
// Existing imports (lines 1-7):
import { describe, it, expect } from 'vitest';
import {
  TDDOrchestrator,
  WorkflowTreeDebugger,
  WorkflowEvent,
  WorkflowObserver,
} from '../../index.js';

// NO ADDITIONAL IMPORTS NEEDED
// TDDOrchestrator can be used for both parent and child workflows
// Example: const parent = new TDDOrchestrator('Parent');
//         const child = new TDDOrchestrator('Child', parent);
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npm run build
# OR
npx tsc --noEmit

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.
# Common errors to watch for:
# - Property 'root' does not exist on type 'WorkflowEvent' (missing type guard)
# - Argument of type 'Workflow' is not assignable to parameter of type 'WorkflowNode' (use getNode())
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run ONLY the tree-mirroring integration tests
npm test -- tree-mirroring.test.ts

# OR run with filter for specific test
npm test -- -t "should propagate treeUpdated events to root observer"

# Expected: New test PASSES. All existing tests still PASS.

# If test fails, common issues:
# 1. "Cannot read property 'root' of undefined" - treeUpdated event not found
#    FIX: Check that setStatus() actually emits treeUpdated (P1.M2.T2.S1 must be complete)
# 2. Expected 1 but received 0 - onTreeChanged not called
#    FIX: Check emitEvent() implementation calls onTreeChanged for treeUpdated events
# 3. "Observers can only be added to root workflows"
#    FIX: Attach observer to parent, not child
```

### Level 3: Integration Testing (System Validation)

```bash
# Run ALL integration tests to ensure no regression
npm test -- src/__tests__/integration/

# Run full test suite
npm test

# Expected: All tests pass, including new test.

# Verify test output shows:
# ✓ src/__tests__/integration/tree-mirroring.test.ts (X)
#   ✓ Tree Mirroring Integration (X)
#     ✓ should create 1:1 tree mirror of workflow execution
#     ✓ should propagate events to root observer
#     ✓ should include state snapshot on error
#     ✓ should propagate treeUpdated events to root observers  <-- NEW TEST
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test with different status values to ensure robustness
# Modify test temporarily to try different statuses:
# child.setStatus('running');
# child.setStatus('failed');
# child.setStatus('idle');
# All should trigger treeUpdated events

# Verify test is deterministic (no flakiness)
# Run test 10 times in succession:
for i in {1..10}; do npm test -- -t "should propagate treeUpdated"; done

# Expected: Test passes all 10 times with no failures.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run build`
- [ ] New test added to correct file: `src/__tests__/integration/tree-mirroring.test.ts`
- [ ] Test uses descriptive name: `should propagate treeUpdated events to root observers`

### Feature Validation

- [ ] Test creates parent-child workflow tree
- [ ] Observer attached to root (parent) workflow
- [ ] `child.setStatus('completed')` triggers event emission
- [ ] `treeUpdated` event received via `onEvent()` callback
- [ ] `onTreeChanged()` callback invoked with root node
- [ ] Assertions verify both event emission and callback invocation

### Code Quality Validation

- [ ] Follows existing test patterns from `tree-mirroring.test.ts`
- [ ] Uses inline observer pattern (not mock functions or spies)
- [ ] Uses type guards for discriminated union event access
- [ ] Test is synchronous (no unnecessary async/await)
- [ ] No hardcoded values or magic numbers
- [ ] Test is deterministic (non-flaky)

### Integration Validation

- [ ] No existing tests broken by new test
- [ ] Test validates P1.M2.T2.S1 (setStatus emits treeUpdated)
- [ ] Test validates P1.M2.T2.S3 (snapshotState emits treeUpdated) implicitly
- [ ] Test validates observer propagation via getRootObservers()

---

## Anti-Patterns to Avoid

- ❌ Don't create separate test file - add to existing `tree-mirroring.test.ts`
- ❌ Don't use mock functions (`vi.fn()`) - use inline collector observer pattern
- ❌ Don't attach observer to child workflow - must be root (parent)
- ❌ Don't skip type guards - use `if (event.type === 'treeUpdated')` pattern
- ❌ Don't use `async/await` - event emission is synchronous
- ❌ Don't test multiple scenarios in one test - keep it focused
- ❌ Don't use TDDOrchestrator if SimpleWorkflow is sufficient
- ❌ Don't forget to implement all observer callbacks (onLog, onEvent, onStateUpdated, onTreeChanged)

---

## Confidence Score

**8/10** for one-pass implementation success likelihood

**Reasoning**:
- ✅ Existing patterns are clear and consistent
- ✅ All required context documented with specific line numbers
- ✅ Test is straightforward (single synchronous operation)
- ⚠️ Assumes P1.M2.T2.S1 (setStatus treeUpdated emission) is complete
- ⚠️ Assumes P1.M2.T2.S3 (snapshotState treeUpdated emission) is complete
- ⚠️ Minor ambiguity: Should use SimpleWorkflow (import needed) or TDDOrchestrator (already imported)

**Mitigation for 10/10**: Clarify in task to use TDDOrchestrator for both parent and child since it's already imported.

---

**END OF PRP**
