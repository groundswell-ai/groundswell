---
name: "PRP: Verify Observer Propagation (PRD Section 7)"
description: Create comprehensive test validating PRD Section 7 observer propagation requirements with focus on event bubbling from grandchildren to root observers and reparenting scenarios

---

## Goal

**Feature Goal**: Create a PRD Section 7 compliance test that validates observer propagation works correctly - specifically that events from deeply nested children bubble up to root observers via getRoot() and update correctly when children are reparented.

**Deliverable**: A new test file `src/__tests__/adversarial/observer-propagation.test.ts` with comprehensive test cases covering PRD Section 7 observer propagation requirements.

**Success Definition**:
- Events emitted from grandchildren reach root observer via getRoot() traversal
- After reparenting, events propagate to new root's observer (not old root's)
- Tests verify getRoot() correctly follows parent chain with cycle detection
- Tests verify observer.onEvent() receives all event types from nested children
- Negative assertions verify events DON'T reach wrong observers after reparenting

## User Persona

**Target User**: Development team validating that the attachChild() bug fix correctly restores observer propagation functionality

**Use Case**: Verify that observer propagation, which was broken by the tree integrity bug, is now working correctly per PRD Section 7 requirements

**User Journey**:
1. Run observer propagation test suite
2. Verify events bubble from grandchildren to root observers
3. Verify reparenting updates observer routing correctly
4. Review clear assertion messages showing propagation behavior

**Pain Points Addressed**:
- Bug broke observer propagation - events only reached original parent's observers even after reparenting
- Need explicit validation that getRoot() traversal works through parent chain
- Risk of reparenting breaking observer notification routing

## Why

- **Bug Fix Validation**: The tree integrity bug (child in multiple parents) broke observer propagation. This test validates the fix.
- **PRD Compliance**: PRD Section 7 requires "Observers attach to root workflow and receive all events" via automatic event bubbling.
- **Root Cause Verification**: Bug analysis showed getRoot() only follows child.parent chain - must verify this works correctly after fix.
- **Reparenting Safety**: When child is detached and attached to new parent, observer routing must update correctly.

## What

Create a comprehensive test suite that validates PRD Section 7 observer propagation with explicit tests for:

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/observer-propagation.test.ts`
- [ ] Test validates events from grandchild reach root observer via getRoot()
- [ ] Test validates reparenting updates observer routing to new root
- [ ] Test validates old root's observer no longer receives events after reparenting
- [ ] Test validates getRoot() cycle detection doesn't break propagation
- [ ] Test validates all observer callbacks (onEvent, onTreeChanged) are invoked
- [ ] Tests follow existing patterns from workflow-reparenting.test.ts
- [ ] All tests pass with current implementation

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes - This PRP provides complete context including:
- Exact bug analysis showing how observer propagation was broken
- PRD Section 7 requirements for observer propagation
- Existing test patterns for observer testing
- File paths to all relevant implementations
- getRoot() implementation details with cycle detection
- Test runner commands

### Documentation & References

```yaml
# MUST READ - Bug Analysis showing observer propagation was broken
- file: /home/dustin/projects/groundswell/plan/docs/bugfix-architecture/bug_analysis.md
  why: Lines 60-91 explain how bug broke observer propagation - events only reached original parent
  critical: "Observer Event Propagation Failure" section explains root cause
  section: "### 1. Observer Event Propagation Failure" (lines 60-91)

# MUST READ - Work Item Definition
- file: /home/dustin/projects/groundswell/bug_fix_tasks.json
  why: Contains exact contract definition for P1.M3.T2.S2
  section: "P1.M3.T2.S2" lines 272-281

# IMPLEMENTATION - getRoot() method with cycle detection
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains getRoot() (lines 174-189) and getRootObservers() (lines 124-139) implementations
  pattern: Traverses parent chain with visited Set for cycle detection
  gotcha: Must follow parent.parent chain to find root, then return root.observers

# IMPLEMENTATION - emitEvent() method
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains emitEvent() (lines 313-329) which calls getRootObservers()
  pattern: Gets observers, calls onEvent(), and onTreeChanged() for tree update events

# IMPLEMENTATION - Observer Interface
- file: /home/dustin/projects/groundswell/src/types/observer.ts
  why: Defines WorkflowObserver interface with onEvent, onLog, onStateUpdated, onTreeChanged
  pattern: All four callback methods must be implemented by observers

# TEST PATTERN - Observer Propagation Tests
- file: /home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts
  why: Contains existing observer propagation tests for reparenting scenarios
  pattern: Arrays to collect events, clear events between phases, positive and negative assertions
  critical: Lines 33-127 show complete pattern for testing observer routing after reparenting

# TEST PATTERN - PRD Compliance Tests
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/prd-compliance.test.ts
  why: Shows pattern for organizing tests by PRD section
  pattern: `describe('PRD Section X.Y: ...')` with clear requirement documentation

# TEST PATTERN - Observer Testing
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/e2e-prd-validation.test.ts
  why: Shows patterns for testing observer onEvent() and error event capture
  pattern: Lines 246-273 show root-only observer restriction test

# EXAMPLE - Observer Usage
- file: /home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts
  why: Shows MetricsObserver and ConsoleObserver implementations
  pattern: Custom observers that track event counts, log entries, and state changes

# EVENT TYPES - WorkflowEvent union
- file: /home/dustin/projects/groundswell/src/types/events.ts
  why: Defines all event types including treeUpdated, childAttached, childDetached
  pattern: Discriminated union with type property for event filtering
```

### Current Codebase tree

```bash
src/
├── __tests__/
│   ├── adversarial/           # PRD compliance and edge case tests
│   │   ├── prd-compliance.test.ts
│   │   ├── e2e-prd-validation.test.ts
│   │   ├── prd-12-2-compliance.test.ts
│   │   ├── parent-validation.test.ts
│   │   └── circular-reference.test.ts
│   └── integration/           # Component interaction tests
│       └── workflow-reparenting.test.ts
├── core/
│   └── workflow.ts            # Workflow class with getRoot(), getRootObservers(), emitEvent()
├── types/
│   ├── observer.ts            # WorkflowObserver interface
│   └── events.ts              # WorkflowEvent discriminated union
└── debugger/
    └── tree-debugger.ts       # Tree inspection utilities
```

### Desired Codebase tree with files to be added

```bash
src/
├── __tests__/
│   ├── adversarial/
│   │   └── observer-propagation.test.ts  # NEW: PRD Section 7 observer propagation tests
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Observer propagation uses getRoot() which traverses parent chain
// getRoot() is at workflow.ts:174-189 - uses visited Set for cycle detection
// getRootObservers() is at workflow.ts:124-139 - returns root.observers array

// CRITICAL: Events bubble to ROOT observers only, not parent observers
// If workflow has a parent, observers must be on the ROOT (parent === null)
// Adding observers to non-root throws: "Observers can only be added to root workflows"

// CRITICAL: emitEvent() calls getRootObservers() EVERY time
// This means after reparenting, events automatically route to new root's observers
// The bug was that child.parent stayed pointing to old parent, so getRoot() returned wrong root

// CRITICAL: Tree update events trigger onTreeChanged() callback
// Event types that trigger onTreeChanged(): 'treeUpdated', 'childAttached', 'childDetached'
// See workflow.ts:322-324 for the conditional check

// GOTCHA: Constructor pattern - new Workflow(name, parent) calls parent.attachChild(this)
// This emits childAttached event which triggers onTreeChanged()

// PATTERN: Event clearing between test phases
// eventsArray.length = 0;  // Clear previous events

// PATTERN: Type guards for discriminated union
// if (event.type === 'treeUpdated') { expect(event.root).toBe(expectedRoot); }

// PATTERN: Array-based event collection
// const events: WorkflowEvent[] = [];
// const observer: WorkflowObserver = {
//   onLog: () => {},
//   onEvent: (e) => events.push(e),
//   onStateUpdated: () => {},
//   onTreeChanged: () => {},
// };

// GOTCHA: setStatus() internally calls emitEvent with treeUpdated
// This is useful for testing observer propagation without custom events
```

## Implementation Blueprint

### Test Structure and Organization

```typescript
// Test file structure following existing patterns
import { describe, it, expect, beforeEach } from 'vitest';
import { Workflow } from '../../core/workflow.js';
import type { WorkflowObserver, WorkflowEvent } from '../../types/index.js';

// Test helper class (same pattern as existing tests)
class SimpleWorkflow extends Workflow {
  async run() {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// Observer creation helper (from workflow-reparenting.test.ts)
const createObserver = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
  onLog: () => {}, // Empty - not testing logs
  onEvent: (e) => eventsArray.push(e), // Capture events
  onStateUpdated: () => {}, // Empty - not testing state updates
  onTreeChanged: () => {}, // Empty - not testing tree changes
});

// Main test suite organized by PRD Section 7 requirements
describe('PRD Section 7: Observer Propagation', () => {
  describe('Event Bubbling: Grandchild to Root Observer', () => {
    // Tests for deep hierarchy event propagation
  });

  describe('Observer Routing After Reparenting', () => {
    // Tests for observer routing updates
  });

  describe('Negative Assertions: Events Don\'t Reach Wrong Observers', () => {
    // Tests verifying events DON'T reach old observers after reparenting
  });

  describe('getRoot() Traversal Correctness', () => {
    // Tests verifying getRoot() finds correct root via parent chain
  });
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/observer-propagation.test.ts
  - IMPORT: Workflow, WorkflowObserver, WorkflowEvent types
  - DEFINE: SimpleWorkflow test class (follow existing pattern)
  - DEFINE: createObserver() helper function (from workflow-reparenting.test.ts)
  - STRUCTURE: Main describe block for PRD Section 7
  - NAMING: observer-propagation.test.ts (kebab-case, matches existing pattern)

Task 2: IMPLEMENT Event Bubbling test suite
  - VERIFY: Events from grandchild reach root observer via getRoot()
  - TEST: Create 3-level tree (root, child, grandchild), add observer to root
  - EMIT: Event from grandchild using setStatus()
  - ASSERT: Root observer receives event (events.some(e => e.type === 'treeUpdated'))
  - FOLLOW pattern: workflow-reparenting.test.ts lines 33-75 for setup pattern

Task 3: IMPLEMENT Reparenting Observer Routing test
  - VERIFY: After reparenting, events route to new root's observer
  - TEST: Create parent1, parent2, grandchild with parent1. Reparent grandchild to parent2
  - ADD: Observer to parent2 after reparenting
  - EMIT: Event from grandchild
  - ASSERT: Parent2 observer receives event, parent1 observer doesn't
  - FOLLOW pattern: workflow-reparenting.test.ts lines 76-127

Task 4: IMPLEMENT Negative Assertions test suite
  - VERIFY: Old root's observer no longer receives events after reparenting
  - TEST: Clear events after reparenting, emit new event
  - ASSERT: parent1Events.length === 0 (events array stays empty)
  - ASSERT: parent1Events.find(e => e.type === 'treeUpdated') is undefined
  - CRITICAL: This validates the bug fix - old observers don't receive events

Task 5: IMPLEMENT getRoot() Traversal test
  - VERIFY: getRoot() correctly follows parent chain to find root
  - TEST: Create deep hierarchy (root -> child -> grandchild -> great-grandchild)
  - CALL: getRoot() on great-grandchild
  - ASSERT: Returns root workflow (not child or grandchild)
  - VERIFY: Cycle detection doesn't break normal traversal

Task 6: IMPLEMENT Multiple Observer Callbacks test
  - VERIFY: All observer callbacks are invoked correctly
  - TEST: Track onEvent() and onTreeChanged() invocation counts
  - EMIT: treeUpdated event (triggers both callbacks)
  - ASSERT: onEvent() was called, onTreeChanged() was called
  - VERIFY: Callback order is correct (onEvent before onTreeChanged)

Task 7: ADD comprehensive documentation comments
  - DOCUMENT: Link each test to PRD Section 7 requirement
  - EXPLAIN: What each assertion validates about observer propagation
  - INCLUDE: Reference to bug analysis showing what was broken
  - DESCRIBE: How getRoot() traversal enables event bubbling
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL PATTERN: 3-level hierarchy setup for grandchild propagation test
describe('PRD Section 7: Observer Propagation', () => {
  describe('Event Bubbling: Grandchild to Root Observer', () => {
    it('should propagate events from grandchild to root observer via getRoot()', () => {
      // PHASE 1: Setup - Create 3-level tree
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      // PHASE 2: Add observer to root
      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      // PHASE 3: Emit event from grandchild
      rootEvents.length = 0; // Clear any construction events
      grandchild.setStatus('running');

      // PHASE 4: Verify root observer received event
      // PRD Section 7: "Observers attach to root workflow and receive all events"
      const receivedEvent = rootEvents.find(e => e.type === 'treeUpdated');
      expect(receivedEvent).toBeDefined();
      if (receivedEvent?.type === 'treeUpdated') {
        expect(receivedEvent.root).toBe(root.getNode());
      }
    });

    it('should propagate events through multiple hierarchy levels', () => {
      // Test deeper hierarchy (4+ levels) to verify getRoot() traversal
      const root = new SimpleWorkflow('Root');
      const level1 = new SimpleWorkflow('L1', root);
      const level2 = new SimpleWorkflow('L2', level1);
      const level3 = new SimpleWorkflow('L3', level2);
      const level4 = new SimpleWorkflow('L4', level3);

      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      rootEvents.length = 0;
      level4.setStatus('running');

      // Verify event bubbled through 4 levels to root
      expect(rootEvents.some(e => e.type === 'treeUpdated')).toBe(true);
    });
  });

  describe('Observer Routing After Reparenting', () => {
    it('should route events to new root observer after reparenting', () => {
      // PHASE 1: Setup - Create parent1, parent2, grandchild with parent1
      const parent1 = new SimpleWorkflow('Parent1');
      const child1 = new SimpleWorkflow('Child1', parent1);
      const grandchild = new SimpleWorkflow('Grandchild', child1);
      const parent2 = new SimpleWorkflow('Parent2');

      // PHASE 2: Verify initial propagation to parent1 observer
      const parent1Events: WorkflowEvent[] = [];
      parent1.addObserver(createObserver(parent1Events));

      parent1Events.length = 0;
      grandchild.setStatus('running');
      expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(true);

      // PHASE 3: Reparent grandchild to different tree
      // First detach from child1, then attach to child2
      const child2 = new SimpleWorkflow('Child2', parent2);
      child1.detachChild(grandchild);
      child2.attachChild(grandchild);

      // PHASE 4: Add observer to new root (parent2)
      const parent2Events: WorkflowEvent[] = [];
      parent2.addObserver(createObserver(parent2Events));

      // PHASE 5: Emit event from grandchild
      parent1Events.length = 0;
      parent2Events.length = 0;
      grandchild.setStatus('completed');

      // PHASE 6: Verify new root observer receives event
      expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);
    });

    it('should not route events to old root observer after reparenting', () => {
      // CRITICAL VALIDATION: This test validates the bug fix
      // Bug analysis showed old parent's observers still received events after reparenting

      const parent1 = new SimpleWorkflow('Parent1');
      const child1 = new SimpleWorkflow('Child1', parent1);
      const grandchild = new SimpleWorkflow('Grandchild', child1);
      const parent2 = new SimpleWorkflow('Parent2');
      const child2 = new SimpleWorkflow('Child2', parent2);

      const parent1Events: WorkflowEvent[] = [];
      const parent2Events: WorkflowEvent[] = [];

      parent1.addObserver(createObserver(parent1Events));
      parent2.addObserver(createObserver(parent2Events));

      // Reparent: parent1 -> child1 -> grandchild becomes parent2 -> child2 -> grandchild
      child1.detachChild(grandchild);
      child2.attachChild(grandchild);

      // Clear events to isolate post-reparenting behavior
      parent1Events.length = 0;
      parent2Events.length = 0;

      // Emit event from grandchild
      grandchild.setStatus('running');

      // CRITICAL: Old root's observer must NOT receive event
      // This was the bug - old parent's observers still received events
      expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(false);
      expect(parent1Events.length).toBe(0);

      // New root's observer MUST receive event
      expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);
    });
  });

  describe('getRoot() Traversal Correctness', () => {
    it('should find root workflow via parent chain traversal', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      // Verify getRoot() from grandchild returns root
      // This is called internally by getRootObservers()
      const foundRoot = (grandchild as any).getRoot();
      expect(foundRoot).toBe(root);
      expect(foundRoot).not.toBe(child);
      expect(foundRoot).not.toBe(grandchild);
    });

    it('should find root through deep parent chain', () => {
      const root = new SimpleWorkflow('Root');
      let current = root;

      // Create 10-level deep hierarchy
      for (let i = 0; i < 10; i++) {
        const child = new SimpleWorkflow(`Level${i}`);
        current.attachChild(child);
        current = child;
      }

      // Verify deepest child's getRoot() returns original root
      const foundRoot = (current as any).getRoot();
      expect(foundRoot).toBe(root);
    });

    it('should maintain correct root after multiple reparenting cycles', () => {
      // Test reparenting: A->B->C  =>  X->Y->C  =>  A->Z->C
      const parentA = new SimpleWorkflow('ParentA');
      const parentB = new SimpleWorkflow('ParentB', parentA);
      const childC = new SimpleWorkflow('ChildC', parentB);

      // Initial: A->B->C, C's root should be A
      expect((childC as any).getRoot()).toBe(parentA);

      // Reparent: X->Y->C
      const parentX = new SimpleWorkflow('ParentX');
      const parentY = new SimpleWorkflow('ParentY', parentX);
      parentB.detachChild(childC);
      parentY.attachChild(childC);

      // After reparenting, C's root should be X
      expect((childC as any).getRoot()).toBe(parentX);

      // Reparent again: A->Z->C
      const parentZ = new SimpleWorkflow('ParentZ', parentA);
      parentY.detachChild(childC);
      parentZ.attachChild(childC);

      // After second reparenting, C's root should be A again
      expect((childC as any).getRoot()).toBe(parentA);
    });
  });

  describe('Observer Callback Invocation', () => {
    it('should invoke onEvent() for all event types from children', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      let onEventCallCount = 0;
      let receivedEventType: string | undefined;

      const trackingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => {
          onEventCallCount++;
          receivedEventType = e.type;
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      root.addObserver(trackingObserver);

      // Emit event from child
      child.setStatus('running');

      // Verify onEvent was called
      expect(onEventCallCount).toBeGreaterThan(0);
      expect(receivedEventType).toBeDefined();
    });

    it('should invoke onTreeChanged() for tree update events', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      let onTreeChangedCallCount = 0;
      let receivedRoot: any;

      const trackingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: (rootNode) => {
          onTreeChangedCallCount++;
          receivedRoot = rootNode;
        },
      };

      root.addObserver(trackingObserver);

      // Emit tree update event (triggers both onEvent and onTreeChanged)
      child.setStatus('running');

      // Verify onTreeChanged was called
      expect(onTreeChangedCallCount).toBeGreaterThan(0);
      expect(receivedRoot).toBeDefined();
      expect(receivedRoot.id).toBe(root.id);
    });

    it('should invoke callbacks in correct order', () => {
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      const callOrder: string[] = [];

      const orderTrackingObserver: WorkflowObserver = {
        onLog: () => callOrder.push('onLog'),
        onEvent: () => callOrder.push('onEvent'),
        onStateUpdated: () => callOrder.push('onStateUpdated'),
        onTreeChanged: () => callOrder.push('onTreeChanged'),
      };

      root.addObserver(orderTrackingObserver);

      // Emit tree update event
      callOrder.length = 0;
      child.setStatus('running');

      // onEvent should be called before onTreeChanged
      const eventIndex = callOrder.indexOf('onEvent');
      const treeChangedIndex = callOrder.indexOf('onTreeChanged');
      expect(eventIndex).toBeLessThan(treeChangedIndex);
    });
  });

  describe('Edge Cases: Cycle Detection', () => {
    it('should still propagate events after cycle detection validation', () => {
      // Verify that cycle detection in getRoot() doesn't break normal propagation
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      // This should work normally (no cycle exists)
      grandchild.setStatus('running');
      expect(rootEvents.some(e => e.type === 'treeUpdated')).toBe(true);
    });
  });
});

// PATTERN: Observer creation helper (reusable across tests)
const createObserver = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
  onLog: () => {}, // Empty - not testing logs in this test suite
  onEvent: (e) => eventsArray.push(e), // Capture events for validation
  onStateUpdated: () => {}, // Empty - not testing state updates
  onTreeChanged: () => {}, // Empty - not testing tree changes
});

// GOTCHA: Always clear events between test phases
// eventsArray.length = 0;  // Clear previous events

// PATTERN: Use type guards for discriminated union
// if (event?.type === 'treeUpdated') {
//   expect(event.root).toBe(expectedRoot);
// }
```

### Test Assertion Patterns

```typescript
// Pattern 1: Event existence assertion
expect(rootEvents.some(e => e.type === 'treeUpdated')).toBe(true);

// Pattern 2: Event find with type guard
const treeUpdatedEvent = rootEvents.find(e => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeDefined();
if (treeUpdatedEvent?.type === 'treeUpdated') {
  expect(treeUpdatedEvent.root.id).toBe(root.id);
}

// Pattern 3: Negative assertion (event NOT received)
expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(false);
expect(parent1Events.length).toBe(0);

// Pattern 4: getRoot() return value assertion
expect((child as any).getRoot()).toBe(root);

// Pattern 5: Callback invocation count
expect(onEventCallCount).toBeGreaterThan(0);

// Pattern 6: Callback order verification
const eventIndex = callOrder.indexOf('onEvent');
const treeChangedIndex = callOrder.indexOf('onTreeChanged');
expect(eventIndex).toBeLessThan(treeChangedIndex);
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npm run test -- src/__tests__/adversarial/observer-propagation.test.ts

# Check TypeScript compilation
npm run lint

# Expected: Zero TypeScript errors, proper formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new observer propagation test suite
npm run test -- src/__tests__/adversarial/observer-propagation.test.ts

# Run related observer tests to ensure no regression
npm run test -- src/__tests__/integration/workflow-reparenting.test.ts
npm run test -- src/__tests__/adversarial/e2e-prd-validation.test.ts

# Expected: All tests pass with current (fixed) implementation
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full adversarial test suite
npm run test -- src/__tests__/adversarial/

# Run full integration test suite
npm run test -- src/__tests__/integration/

# Run entire test suite to verify no regressions
npm test

# Expected: All tests pass, no regressions in existing functionality
```

### Level 4: Bug Fix Validation

```bash
# Verify tests would FAIL with original buggy implementation
# The bug: child stayed in multiple parents, getRoot() returned wrong root
# These tests validate that getRoot() now finds correct root after fix

# To validate the fix works:
# 1. Run new tests - should PASS (validates fix works)
# 2. Check that events from grandchildren reach root observers
# 3. Check that reparenting updates observer routing correctly
# 4. Check that old observers don't receive events after reparenting

npm run test -- src/__tests__/adversarial/observer-propagation.test.ts

# Expected: All tests pass, demonstrating observer propagation is fixed
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at correct path: `src/__tests__/adversarial/observer-propagation.test.ts`
- [ ] All Level 1 validation passes (TypeScript, linting)
- [ ] All Level 2 tests pass (new observer propagation tests)
- [ ] All Level 3 tests pass (no regressions in existing tests)
- [ ] Level 4 validation passes (tests validate bug fix)

### Feature Validation

- [ ] Events from grandchildren reach root observer via getRoot()
- [ ] Events propagate through multiple hierarchy levels (4+ levels)
- [ ] After reparenting, events route to new root's observer
- [ ] Old root's observer doesn't receive events after reparenting
- [ ] getRoot() correctly finds root via parent chain traversal
- [ ] getRoot() works correctly after multiple reparenting cycles
- [ ] onEvent() callback is invoked for child events
- [ ] onTreeChanged() callback is invoked for tree update events
- [ ] Callbacks are invoked in correct order
- [ ] Cycle detection doesn't break normal event propagation

### Code Quality Validation

- [ ] Follows existing test patterns from workflow-reparenting.test.ts
- [ ] Uses SimpleWorkflow class for test workflows
- [ ] Uses createObserver() helper for consistent observer creation
- [ ] Tests are self-documenting with clear assertion messages
- [ ] File naming matches existing convention (*.test.ts)
- [ ] Test organization uses describe/it blocks appropriately
- [ ] Event arrays are cleared between test phases

### Documentation & Deployment

- [ ] Each test includes comment referencing PRD Section 7
- [ ] Test descriptions clearly state what propagation behavior is validated
- [ ] Comments reference bug analysis for context
- [ ] Test file includes header explaining PRD Section 7 requirements
- [ ] Complex scenarios have inline comments explaining the setup

## Anti-Patterns to Avoid

- ❌ Don't test observer propagation with only 2-level trees (need 3+ levels)
- ❌ Don't forget to clear events between test phases (use array.length = 0)
- ❌ Don't skip negative assertions (verifying old observers DON'T receive events)
- ❌ Don't test only happy paths - include reparenting scenarios
- ❌ Don't forget to test getRoot() directly (it's critical for propagation)
- ❌ Don't assume events propagate - explicitly verify with assertions
- ❌ Don't skip testing callback invocation order
- ❌ Don't create duplicate tests from workflow-reparenting.test.ts
- ❌ Don't use generic test descriptions - be specific about propagation behavior
- ❌ Don't forget to test that cycle detection doesn't break normal propagation
- ❌ Don't skip testing multiple reparenting cycles

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Validation**: The completed PRP provides:
1. Exact bug analysis showing how observer propagation was broken
2. PRD Section 7 requirements for observer event bubbling
3. Existing test patterns from workflow-reparenting.test.ts
4. Complete test structure with assertion patterns
5. Validation commands that are project-specific and verified
6. Clear documentation linking tests to getRoot() implementation
7. Negative assertions to validate bug fix (events DON'T reach wrong observers)

**Risk Mitigation**:
- Research from bug analysis explains exact failure mode
- Existing reparenting tests provide proven patterns
- Helper functions (createObserver) ensure consistent test setup
- Clear validation checkpoints ensure quality at each step
- Multiple test scenarios cover edge cases (deep hierarchies, cycles, reparenting)
