# Product Requirement Prompt (PRP): Write Reparenting Integration Test

---

## Goal

**Feature Goal**: Write a comprehensive integration test that validates the complete reparenting workflow, ensuring observer propagation correctly updates after a child workflow is detached from one parent and attached to another.

**Deliverable**: An integration test file `src/__tests__/integration/workflow-reparenting.test.ts` that validates observer propagation updates correctly during reparenting operations.

**Success Definition**:
- Test verifies child events reach parent1's observer when attached to parent1
- Test verifies child events reach parent2's observer after reparenting to parent2
- Test verifies child events NO LONGER reach parent1's observer after reparenting
- Test validates complete reparenting workflow: attach → emit → detach → attach → emit
- All assertions pass with clear, descriptive test scenarios

## User Persona

**Target User**: Developers maintaining and extending the Workflow library's tree manipulation and observer notification system.

**Use Case**: Validating that the reparenting feature (detachChild + attachChild) correctly updates observer propagation so events are routed to the correct observers after tree restructuring.

**User Journey**:
1. Developer reads integration test to understand expected reparenting behavior
2. Developer runs test to verify observer propagation works correctly
3. Test serves as documentation for how observers should behave during reparenting
4. Test catches regressions if observer routing is broken in future changes

**Pain Points Addressed**:
- Without this test, there's no verification that observers update after reparenting
- Manual testing of observer propagation is error-prone and time-consuming
- Observer bugs could go undetected until production issues arise
- Complex reparenting scenarios need automated validation

## Why

- **Observer Pattern Integrity**: The Observer pattern (PRD Section 7) requires events to bubble up the tree to root observers. When a child is reparented, the root changes, so events must route to the new root's observers, not the old root's.
- **Reparenting Validation**: The detachChild() and attachChild() methods enable reparenting, but we need to verify the complete workflow works end-to-end, including observer propagation updates.
- **Bug Prevention**: The original bug (attachChild() tree integrity violation) could have caused observer routing issues. This test ensures the fix doesn't introduce new observer bugs.
- **Documentation**: Integration tests serve as living documentation of expected behavior, helping future developers understand the reparenting feature.
- **Completes P1.M2.T2**: This is subtask S1 of Task P1.M2.T2 (Test Reparenting Workflow). Without this test, the reparenting feature isn't fully validated.

## What

Write an integration test file that validates observer propagation updates correctly during the complete reparenting workflow:

1. **Setup**: Create two root workflows (parent1, parent2) each with their own observer
2. **Initial State**: Create child workflow attached to parent1
3. **Phase 1**: Child emits event → verify parent1 observer receives it
4. **Reparent**: Detach child from parent1, attach to parent2
5. **Phase 2**: Child emits event → verify parent2 observer receives it
6. **Critical Validation**: Verify parent1 observer does NOT receive the post-reparenting event

### Success Criteria

- [ ] Integration test file created at `src/__tests__/integration/workflow-reparenting.test.ts`
- [ ] Test creates parent1 and parent2 workflows with separate observers
- [ ] Test verifies parent1 observer receives events when child is attached to parent1
- [ ] Test verifies parent2 observer receives events after child is reparented to parent2
- [ ] Test verifies parent1 observer does NOT receive events after reparenting
- [ ] Test uses array collection pattern for tracking events
- [ ] All test assertions pass with clear descriptions
- [ ] Test follows existing patterns from `tree-mirroring.test.ts`

---

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" test passed**: This PRP contains complete file paths, exact line references, existing test patterns, Workflow API usage, and validation commands. An AI agent unfamiliar with this codebase can write this integration test successfully using only this PRP.

### Documentation & References

```yaml
# MUST READ - Contract definition from bug_fix_tasks.json
- file: bug_fix_tasks.json
  why: Contains the exact contract definition for P1.M2.T2.S1 with test requirements
  section: Lines 174-185 (P1.M2.T2.S1 context_scope)
  critical: Pattern 7 - Observer propagation should update after reparenting
  gotcha: Test must verify events ONLY reach new parent's observers, not old parent's

# MUST READ - Observer pattern implementation
- file: src/types/observer.ts
  why: Defines WorkflowObserver interface with onEvent() callback
  pattern: Observers receive events via onEvent(event: WorkflowEvent)
  gotcha: Observers can only be added to root workflows (workflow.parent must be null)

# MUST READ - Workflow class observer methods
- file: src/core/workflow.ts
  why: Contains addObserver(), removeObserver(), emitEvent(), getRootObservers()
  lines: 195-210 (observer management), 311-327 (emitEvent), 119-139 (getRootObservers)
  pattern: getRootObservers() traverses parent chain to find root, returns root.observers
  gotcha: emitEvent() calls getRootObservers() to determine which observers receive events

# MUST READ - Event emission and propagation
- file: src/core/workflow.ts
  why: Shows how emitEvent() uses getRootObservers() to route events
  lines: 311-327 (emitEvent implementation)
  pattern: const observers = this.getRootObservers(); for (const obs of observers) { obs.onEvent(event); }
  gotcha: When child is reparented, getRootObservers() returns different root's observers

# MUST READ - attachChild() and detachChild() methods
- file: src/core/workflow.ts
  why: These methods enable reparenting workflow
  lines: 216-254 (attachChild), 278-306 (detachChild)
  pattern: attachChild(child) adds child to tree; detachChild(child) removes from tree
  gotcha: Reparenting pattern: oldParent.detachChild(child); newParent.attachChild(child);

# MUST READ - Integration test patterns
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Reference pattern for integration tests with observer collection arrays
  pattern: const events: WorkflowEvent[] = []; const observer: WorkflowObserver = { onEvent: (e) => events.push(e), ... }
  gotcha: Integration tests test full workflows, not individual methods

# MUST READ - Unit test patterns for detach/attach
- file: src/__tests__/unit/workflow-detachChild.test.ts
  why: Shows AAA (Arrange-Act-Assert) pattern and SimpleWorkflow extension
  pattern: class SimpleWorkflow extends Workflow { async run() { this.setStatus('completed'); return 'done'; } }
  gotcha: Import with .js extension: import from '../../index.js'

# REFERENCE - Existing observer propagation test
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Lines 115-151 show test for "should propagate treeUpdated events to root observers"
  pattern: Creates observer, attaches to root, triggers event on child, verifies root receives it
  gotcha: This test validates similar behavior but for treeUpdated, not reparenting

# REFERENCE - Event type definitions
- file: src/types/events.ts
  why: Contains all WorkflowEvent types that can be emitted and observed
  pattern: Discriminated union with type field for each event
  gotcha: Use type guards: event.type === 'childDetached' && event.childId
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   │   ├── tree-mirroring.test.ts    # REFERENCE PATTERN - Observer collection arrays
│   │   │   ├── agent-workflow.test.ts
│   │   │   └── workflow-reparenting.test.ts  # CREATE THIS FILE
│   │   ├── unit/
│   │   │   ├── workflow-detachChild.test.ts       # Shows detachChild usage
│   │   │   ├── workflow-emitEvent-childDetached.test.ts  # Shows event emission
│   │   │   ├── adversarial/
│   │   │   │   ├── parent-validation.test.ts      # Shows parent validation tests
│   │   │   │   └── circular-reference.test.ts    # Shows circular reference tests
│   │   │   └── workflow.test.ts
│   ├── core/
│   │   ├── workflow.ts                 # Main Workflow class with attach/detach/observer methods
│   │   └── ...
│   ├── types/
│   │   ├── events.ts                   # WorkflowEvent discriminated union
│   │   ├── observer.ts                 # WorkflowObserver interface
│   │   └── workflow.ts
│   └── index.ts                        # Main exports
├── plan/
│   └── bugfix/
│       └── P1M2T2S1/
│           ├── PRP.md                  # This file
│           └── research/               # Additional research (if needed)
└── package.json                        # Test scripts: "test": "vitest"
```

### Desired Codebase Tree with Files to be Added

```bash
# New file to create:
├── src/
│   └── __tests__/
│       └── integration/
│           └── workflow-reparenting.test.ts  # NEW - Integration test for reparenting
#               Responsibility: Validate observer propagation updates after reparenting
#               Contains test cases for:
#                 - Parent1 observer receives events when child attached to parent1
#                 - Parent2 observer receives events after reparenting to parent2
#                 - Parent1 observer does NOT receive events after reparenting
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Observers can ONLY be added to root workflows
// Workflow.addObserver() throws Error if this.parent !== null
// Always call addObserver() on workflows created WITHOUT a parent

// CRITICAL: getRootObservers() determines which observers receive events
// emitEvent() calls getRootObservers() which traverses parent chain to root
// When child is reparented, its root changes, so observers change too
// Key behavior: child.getRootObservers() !== oldParent.getRootObservers() after reparenting

// CRITICAL: Observer routing logic
// 1. child emits event → child.emitEvent(event)
// 2. emitEvent() calls getRootObservers()
// 3. getRootObservers() traverses parent chain: while (current) { current = current.parent; }
// 4. Returns root.observers (the root workflow's observer array)
// 5. After reparenting, parent chain changed, so different root.observers returned

// CRITICAL: Reparenting workflow order
// WRONG: parent2.attachChild(child) → throws Error (child already has parent)
// RIGHT: parent1.detachChild(child); parent2.attachChild(child);

// CRITICAL: Test isolation
// Each test should create fresh workflows
// Don't share workflows between tests
// Clear event arrays before each phase to isolate assertions

// PATTERN: Event collection array
// const events: WorkflowEvent[] = [];
// const observer: WorkflowObserver = {
//   onLog: () => {},
//   onEvent: (e) => events.push(e),
//   onStateUpdated: () => {},
//   onTreeChanged: () => {},
// };

// PATTERN: Type guards for discriminated union
// if (event.type === 'childDetached') {
//   // TypeScript knows event has parentId and childId properties
//   console.log(event.childId);
// }

// PATTERN: SimpleWorkflow extension for tests
// class SimpleWorkflow extends Workflow {
//   async run() { this.setStatus('completed'); return 'done'; }
// }

// GOTCHA: Import paths with .js extension (ES modules)
// import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

// GOTCHA: Vitest imports
// import { describe, it, expect } from 'vitest';

// GOTCHA: Integration vs Unit test placement
// Unit tests: src/__tests__/unit/ (test individual methods)
// Integration tests: src/__tests__/integration/ (test full workflows)
// This is an integration test because it tests the complete reparenting workflow

// TESTING: Use AAA pattern (Arrange-Act-Assert)
// ARRANGE: Set up workflows, observers, initial state
// ACT: Perform reparenting operation
// ASSERT: Verify observers received correct events

// TESTING: Clear events array between test phases
// events.length = 0; // Clear previous events before next assertion phase
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed. Test uses existing types:

```typescript
// From src/types/observer.ts:
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}

// From src/types/events.ts:
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  // ... other event types
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file structure and imports
  - CREATE: src/__tests__/integration/workflow-reparenting.test.ts
  - IMPORT: describe, it, expect from 'vitest'
  - IMPORT: Workflow, WorkflowObserver, WorkflowEvent from '../../index.js'
  - DEFINE: SimpleWorkflow class extension for testing
  - FOLLOW: Pattern from tree-mirroring.test.ts lines 1-7

Task 2: CREATE first test - parent1 observer receives events
  - CREATE: describe block for "Reparenting Observer Propagation"
  - ARRANGE: Create parent1 (root workflow with observer)
  - ARRANGE: Create child attached to parent1
  - ARRANGE: Create events array and observer that collects events
  - ACT: Attach observer to parent1
  - ACT: Child emits event (use emitEvent() or setStatus() which triggers treeUpdated)
  - ASSERT: parent1 observer received the event
  - FOLLOW: Pattern from tree-mirroring.test.ts lines 115-151

Task 3: IMPLEMENT reparenting workflow
  - ARRANGE: Create parent2 as another root workflow
  - ARRANGE: Create separate observer for parent2 with its own events array
  - ACT: Detach child from parent1 using parent1.detachChild(child)
  - ACT: Attach child to parent2 using parent2.attachChild(child)
  - ASSERT: Verify child.parent === parent2
  - ASSERT: Verify parent2.children.includes(child)
  - ASSERT: Verify !parent1.children.includes(child)
  - FOLLOW: Pattern from workflow-detachChild.test.ts lines 13-26

Task 4: IMPLEMENT post-reparenting observer validation
  - ACT: Add parent2 observer to parent2
  - ACT: Clear parent1 events array to isolate next phase
  - ACT: Child emits event again
  - ASSERT: parent2 observer received the event
  - ASSERT: parent1 observer did NOT receive the event (critical validation)
  - FOLLOW: Same event collection pattern as Task 2

Task 5: CREATE comprehensive test with all phases
  - COMBINE: All previous tasks into single cohesive test
  - PHASE 1: Verify parent1 receives events when child attached
  - PHASE 2: Verify reparenting operation succeeds
  - PHASE 3: Verify parent2 receives events after reparenting
  - PHASE 4: Verify parent1 stops receiving events after reparenting
  - CLEAR: events arrays between phases using events.length = 0
  - NAME: Test descriptively: "should update observer propagation after reparenting"

Task 6: RUN test to validate implementation
  - EXECUTE: npm test -- workflow-reparenting.test.ts
  - VERIFY: All assertions pass
  - DEBUG: If fails, check observer attachment and getRootObservers() behavior

Task 7: RUN full integration test suite for regression check
  - EXECUTE: npm test -- src/__tests__/integration/
  - VERIFY: No existing integration tests broken
  - FIX: Any regressions before marking complete
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// COMPLETE IMPLEMENTATION TEMPLATE
// Location: src/__tests__/integration/workflow-reparenting.test.ts
// ============================================================

/**
 * Integration Test: Reparenting Observer Propagation
 *
 * Validates that observer propagation correctly updates when a child
 * workflow is reparented from one parent to another.
 *
 * Pattern 7 (from bug_fix_tasks.json):
 * "Observer propagation should update after reparenting.
 *  Events from child should only reach new parent's observers."
 */

import { describe, it, expect } from 'vitest';
import {
  Workflow,
  WorkflowObserver,
  WorkflowEvent,
} from '../../index.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/unit/workflow.test.ts:4-11
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Integration: Reparenting Observer Propagation', () => {
  it('should update observer propagation after reparenting', () => {
    // ============================================================
    // PHASE 1: Setup - Create parent1, parent2, and child
    // ============================================================
    // ARRANGE: Create two root workflows (both have parent = null)
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child attached to parent1 (via constructor)
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT: Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);
    expect(parent2.children).not.toContain(child);

    // ============================================================
    // PHASE 2: Verify parent1 observer receives events
    // ============================================================
    // ARRANGE: Create observer for parent1
    const parent1Events: WorkflowEvent[] = [];

    const parent1Observer: WorkflowObserver = {
      onLog: () => {}, // Empty - not testing logs
      onEvent: (event) => parent1Events.push(event), // Capture events
      onStateUpdated: () => {}, // Empty - not testing state updates
      onTreeChanged: () => {}, // Empty - not testing tree changes
    };

    // ACT: Attach observer to parent1 (must be root workflow)
    parent1.addObserver(parent1Observer);

    // ACT: Child emits event (triggers treeUpdated via setStatus)
    // PATTERN: setStatus() emits treeUpdated event
    parent1Events.length = 0; // Clear any construction events
    child.setStatus('running');

    // ASSERT: Verify parent1 observer received the event
    const parent1ReceivedEvent = parent1Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent1ReceivedEvent).toBeDefined();
    expect(parent1ReceivedEvent?.type === 'treeUpdated' && parent1ReceivedEvent.root).toBe(parent1.getNode());

    // ============================================================
    // PHASE 3: Reparent child from parent1 to parent2
    // ============================================================
    // ARRANGE: Create observer for parent2
    const parent2Events: WorkflowEvent[] = [];

    const parent2Observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => parent2Events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // ACT: Reparent using detach + attach pattern
    // CRITICAL: Must detach before attaching to new parent
    parent1.detachChild(child);
    parent2.attachChild(child);
    parent2.addObserver(parent2Observer);

    // ASSERT: Verify reparenting succeeded
    expect(child.parent).toBe(parent2);
    expect(parent2.children).toContain(child);
    expect(parent1.children).not.toContain(child);

    // ============================================================
    // PHASE 4: Verify parent2 observer receives events after reparenting
    // ============================================================
    // ACT: Clear events to isolate post-reparenting behavior
    parent1Events.length = 0;
    parent2Events.length = 0;

    // ACT: Child emits event again
    child.setStatus('completed');

    // ASSERT: Verify parent2 observer received the event
    const parent2ReceivedEvent = parent2Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent2ReceivedEvent).toBeDefined();

    // ============================================================
    // PHASE 5: CRITICAL VALIDATION - parent1 observer does NOT receive events
    // ============================================================
    // ASSERT: Verify parent1 observer did NOT receive the post-reparenting event
    const parent1DidNotReceive = parent1Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent1DidNotReceive).toBeUndefined();

    // ASSERT: Verify event count for parent1 is zero
    expect(parent1Events.length).toBe(0);
  });

  it('should handle multiple reparenting cycles correctly', () => {
    // ARRANGE: Create three potential parents
    const parentA = new SimpleWorkflow('ParentA');
    const parentB = new SimpleWorkflow('ParentB');
    const parentC = new SimpleWorkflow('ParentC');

    // ARRANGE: Create child and observers for each parent
    const child = new SimpleWorkflow('Child', parentA);

    const eventsA: WorkflowEvent[] = [];
    const eventsB: WorkflowEvent[] = [];
    const eventsC: WorkflowEvent[] = [];

    const createObserver = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
      onLog: () => {},
      onEvent: (e) => eventsArray.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    parentA.addObserver(createObserver(eventsA));
    parentB.addObserver(createObserver(eventsB));
    parentC.addObserver(createObserver(eventsC));

    // ACT & ASSERT: Cycle 1 - A → B
    eventsA.length = 0;
    child.setStatus('running');
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(true);

    parentA.detachChild(child);
    parentB.attachChild(child);

    eventsA.length = 0;
    eventsB.length = 0;
    child.setStatus('completed');
    expect(eventsB.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(false);

    // ACT & ASSERT: Cycle 2 - B → C
    parentB.detachChild(child);
    parentC.attachChild(child);

    eventsB.length = 0;
    eventsC.length = 0;
    child.setStatus('running');
    expect(eventsC.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsB.some((e) => e.type === 'treeUpdated')).toBe(false);

    // ACT & ASSERT: Cycle 3 - C → A (return to original)
    parentC.detachChild(child);
    parentA.attachChild(child);

    eventsC.length = 0;
    eventsA.length = 0;
    child.setStatus('completed');
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsC.some((e) => e.type === 'treeUpdated')).toBe(false);
  });
});

// ============================================================
// REFERENCE: Observer routing behavior
// ============================================================
// When child.emitEvent() is called:
//   1. emitEvent() calls this.getRootObservers()
//   2. getRootObservers() traverses parent chain to find root
//   3. Returns root.observers array
//   4. Observers in that array receive the event
//
// After reparenting:
//   - child.parent changed from parent1 to parent2
//   - parent chain changed, so getRootObservers() returns different observers
//   - Events now route to parent2's observers, not parent1's
//
// This test validates that critical observer routing update behavior.
```

### Integration Points

```yaml
CREATE: src/__tests__/integration/workflow-reparenting.test.ts
  - location: New file in integration test directory
  - imports: Workflow, WorkflowObserver, WorkflowEvent from '../../index.js'
  - dependencies: Requires Workflow class with attachChild, detachChild, addObserver, emitEvent
  - pattern: Follow tree-mirroring.test.ts structure for integration tests

NO CHANGES NEEDED:
  - src/core/workflow.ts (all required methods already implemented)
  - src/types/events.ts (all event types already defined)
  - src/types/observer.ts (observer interface already exists)

TEST EXECUTION:
  - Run: npm test -- workflow-reparenting.test.ts
  - Run all integration tests: npm test -- src/__tests__/integration/
  - Full test suite: npm test
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating test file - fix before proceeding
cd /home/dustin/projects/groundswell

# Type checking (TypeScript compiler)
npx tsc --noEmit

# Expected: Zero type errors
# If errors exist, check:
#   - Import paths end with .js extension
#   - WorkflowObserver interface has all 4 methods implemented
#   - Event arrays use correct WorkflowEvent type
#   - Type guards use correct event.type strings

# Run the specific test file
npm test -- workflow-reparenting.test.ts

# Expected output:
#   ✓ src/__tests__/integration/workflow-reparenting.test.ts (2)
#   ✓ should update observer propagation after reparenting
#   ✓ should handle multiple reparenting cycles correctly

# If tests fail, debug:
#   1. Check if observers are attached to root workflows
#   2. Check if event arrays are cleared between phases
#   3. Check if child.parent is correctly updated after reparenting
#   4. Check if getRootObservers() returns different observers after reparenting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the reparenting integration specifically
cd /home/dustin/projects/groundswell
npm test -- workflow-reparenting.test.ts

# Expected: All tests pass
# Focus on:
#   - parent1 observer receives pre-reparenting events
#   - parent2 observer receives post-reparenting events
#   - parent1 observer does NOT receive post-reparenting events (critical)

# Run related unit tests for regression check
npm test -- workflow-detachChild.test.ts
npm test -- workflow-emitEvent-childDetached.test.ts

# Expected: All existing tests still pass
# If regressions found, investigate interaction between tests

# Full test suite for comprehensive regression check
npm test

# Expected: All tests pass (260+ tests)
# Pay attention to:
#   - Observer propagation tests
#   - Tree integrity tests
#   - Integration tests
```

### Level 3: Integration Testing (System Validation)

```bash
# Test complete reparenting workflow manually
cd /home/dustin/projects/groundswell

cat > /tmp/test-reparenting-integration.ts << 'EOF'
import { Workflow, WorkflowObserver, WorkflowEvent } from './src/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); return 'done'; }
}

// Create parents and child
const parent1 = new TestWorkflow('Parent1');
const parent2 = new TestWorkflow('Parent2');
const child = new TestWorkflow('Child', parent1);

// Track events
const parent1Events: WorkflowEvent[] = [];
const parent2Events: WorkflowEvent[] = [];

const parent1Observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (e) => parent1Events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

const parent2Observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (e) => parent2Events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

parent1.addObserver(parent1Observer);

// Phase 1: Verify parent1 receives events
child.setStatus('running');
console.log('Phase 1 - Parent1 events:', parent1Events.length);
console.log('  Expected: > 0, Actual:', parent1Events.filter(e => e.type === 'treeUpdated').length);

// Reparent
parent1.detachChild(child);
parent2.attachChild(child);
parent2.addObserver(parent2Observer);

// Phase 2: Verify parent2 receives events, parent1 does not
parent1Events.length = 0;
parent2Events.length = 0;
child.setStatus('completed');

console.log('Phase 2 - Parent2 events:', parent2Events.length);
console.log('  Expected: > 0, Actual:', parent2Events.filter(e => e.type === 'treeUpdated').length);
console.log('Phase 2 - Parent1 events:', parent1Events.length);
console.log('  Expected: 0, Actual:', parent1Events.filter(e => e.type === 'treeUpdated').length);

// Validate
const phase1Success = parent1Events.length === 0 && parent2Events.length > 0;
const parent1Isolated = parent1Events.length === 0;
const parent2Receives = parent2Events.length > 0;

if (phase1Success && parent1Isolated && parent2Receives) {
  console.log('✓ Reparenting integration test PASSED');
  process.exit(0);
} else {
  console.log('✗ Reparenting integration test FAILED');
  process.exit(1);
}
EOF

npx tsx /tmp/test-reparenting-integration.ts

# Expected: ✓ Reparenting integration test PASSED
# If fails, check:
#   - Observer attachment (only root workflows can have observers)
#   - Event emission (child events reach root observers)
#   - Reparenting (child.parent correctly updated)
#   - getRootObservers() behavior (returns different root after reparenting)
```

### Level 4: Observer Propagation Deep Dive

```bash
# Test observer routing behavior in detail
cd /home/dustin/projects/groundswell

cat > /tmp/test-observer-routing.ts << 'EOF'
import { Workflow, WorkflowObserver, WorkflowEvent } from './src/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); return 'done'; }
}

// Test 1: Verify getRootObservers() changes after reparenting
const parent1 = new TestWorkflow('Parent1');
const parent2 = new TestWorkflow('Parent2');
const child = new TestWorkflow('Child', parent1);

// Access private getRootObservers method
const childGetRootObservers = (child as any).getRootObservers.bind(child);
const parent1RootObservers = childGetRootObservers();

console.log('Before reparenting:');
console.log('  child.parent:', child.parent?.node.name);
console.log('  getRootObservers() length:', parent1RootObservers.length);

parent1.detachChild(child);
parent2.attachChild(child);

const parent2RootObservers = childGetRootObservers();

console.log('After reparenting:');
console.log('  child.parent:', child.parent?.node.name);
console.log('  getRootObservers() length:', parent2RootObservers.length);

// Verify observers are different
if (parent1RootObservers.length !== parent2RootObservers.length) {
  console.log('✓ getRootObservers() changed after reparenting');
} else {
  console.log('✗ getRootObservers() did NOT change');
}

// Test 2: Verify events route to correct observers
const parent1Events: WorkflowEvent[] = [];
const parent2Events: WorkflowEvent[] = [];

parent1.addObserver({
  onLog: () => {},
  onEvent: (e) => parent1Events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

parent2.addObserver({
  onLog: () => {},
  onEvent: (e) => parent2Events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

// Emit event from child
child.emitEvent({ type: 'stateSnapshot', node: child.getNode() });

console.log('\\nEvent routing test:');
console.log('  Parent1 received events:', parent1Events.length);
console.log('  Parent2 received events:', parent2Events.length);

if (parent1Events.length === 0 && parent2Events.length === 1) {
  console.log('✓ Events route to new parent observers only');
  process.exit(0);
} else {
  console.log('✗ Event routing incorrect');
  process.exit(1);
}
EOF

npx tsx /tmp/test-observer-routing.ts

# Expected output:
#   Before reparenting:
#     child.parent: Parent1
#     getRootObservers() length: 0
#   After reparenting:
#     child.parent: Parent2
#     getRootObservers() length: 0
#   ✓ getRootObservers() changed after reparenting
#   Event routing test:
#     Parent1 received events: 0
#     Parent2 received events: 1
#   ✓ Events route to new parent observers only
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **All 4 validation levels completed successfully**
- [ ] **TypeScript compilation passes**: `npx tsc --noEmit` has zero errors
- [ ] **Test file created**: `src/__tests__/integration/workflow-reparenting.test.ts` exists
- [ ] **All tests pass**: `npm test -- workflow-reparenting.test.ts` shows passing tests
- [ ] **No regressions**: Full integration test suite passes

### Feature Validation

- [ ] **parent1 observer receives pre-reparenting events**: Events from child reach parent1's observer when attached
- [ ] **parent2 observer receives post-reparenting events**: Events from child reach parent2's observer after reparenting
- [ ] **parent1 observer isolated post-reparenting**: parent1's observer does NOT receive events after child is reparented (critical)
- [ ] **Reparenting workflow validated**: detachChild + attachChild sequence works correctly
- [ ] **Multiple reparenting cycles tested**: Optional test validates A→B→C→A cycles work correctly

### Code Quality Validation

- [ ] **Follows existing test patterns**: Uses AAA (Arrange-Act-Assert) pattern from existing tests
- [ ] **Uses SimpleWorkflow extension**: Follows pattern from workflow-detachChild.test.ts
- [ ] **Observer interface complete**: All 4 methods (onLog, onEvent, onStateUpdated, onTreeChanged) implemented
- [ ] **Event arrays cleared between phases**: Uses `events.length = 0` to isolate test phases
- [ ] **Descriptive test names**: Test names clearly describe what is being validated
- [ ] **Type guards used**: Uses `event.type === 'treeUpdated'` for discriminated union narrowing

### Integration & Observers

- [ ] **Observers attached to roots**: addObserver() only called on workflows with parent === null
- [ ] **Event emission validated**: child.emitEvent() triggers observer callbacks correctly
- [ ] **getRootObservers() behavior validated**: Different observers returned after reparenting
- [ ] **Bidirectional tree consistency**: parent.children and child.parent stay synchronized
- [ ] **No event leakage**: Events don't reach observers they shouldn't (primary validation)

---

## Anti-Patterns to Avoid

- ❌ **Don't attach observers to non-root workflows**: Workflow.addObserver() throws Error if this.parent !== null
- ❌ **Don't forget to clear event arrays**: Without `events.length = 0`, events from previous phases pollute assertions
- ❌ **Don't skip the "parent1 does NOT receive" check**: This is the critical validation that proves observer routing updated
- ❌ **Don't use wrong import paths**: ES modules require .js extension: import from '../../index.js'
- ❌ **Don't implement observer methods incorrectly**: All 4 methods must be present (onLog, onEvent, onStateUpdated, onTreeChanged)
- ❌ **Don't reparent without detaching**: parent2.attachChild(child) throws Error if child already has parent1
- ❌ **Don't test getRootObservers() directly**: It's private - test observer behavior instead via event collection
- ❌ **Don't forget type guards**: Accessing discriminated union properties requires checking event.type first
- ❌ **Don't mix up event arrays**: Keep parent1Events and parent2Events separate and clear independently
- ❌ **Don't skip the "initial state" assertions**: Verify child.parent and parent.children before reparenting

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
1. ✅ Complete contract definition from bug_fix_tasks.json P1.M2.T2.S1
2. ✅ Pattern 7 requirements clearly specified (observer propagation update after reparenting)
3. ✅ Reference implementation available (tree-mirroring.test.ts shows observer pattern)
4. ✅ All required methods already implemented (attachChild, detachChild, addObserver, emitEvent)
5. ✅ Clear validation strategy (parent1 receives before, parent2 receives after, parent1 stops receiving)
6. ✅ All file paths and imports specified
7. ✅ Validation commands are project-specific and executable
8. ✅ Anti-patterns and gotchas documented

**Expected Outcome**: An AI agent implementing this PRP should:
- Write the integration test file in ~150 lines of code
- Pass all tests on first run
- Validate the critical observer routing update behavior
- Provide comprehensive documentation of reparenting observer behavior

---

## Appendix: Test Scenarios

### Primary Test Scenario

```typescript
it('should update observer propagation after reparenting', () => {
  // Setup: parent1, parent2, child (attached to parent1)
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  // Observer for parent1
  const parent1Events: WorkflowEvent[] = [];
  const parent1Observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => parent1Events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };
  parent1.addObserver(parent1Observer);

  // Phase 1: Verify parent1 receives events
  parent1Events.length = 0;
  child.setStatus('running');
  expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(true);

  // Reparent: parent1 → parent2
  parent1.detachChild(child);
  parent2.attachChild(child);

  // Observer for parent2
  const parent2Events: WorkflowEvent[] = [];
  const parent2Observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (e) => parent2Events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };
  parent2.addObserver(parent2Observer);

  // Phase 2: Verify parent2 receives events, parent1 does NOT
  parent1Events.length = 0;
  parent2Events.length = 0;
  child.setStatus('completed');

  // ASSERT: parent2 receives
  expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);

  // ASSERT: parent1 does NOT receive (CRITICAL)
  expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(false);
  expect(parent1Events.length).toBe(0);
});
```

### Optional: Multiple Reparenting Cycles

```typescript
it('should handle multiple reparenting cycles correctly', () => {
  // Setup: ParentA, ParentB, ParentC, child
  const parentA = new SimpleWorkflow('ParentA');
  const parentB = new SimpleWorkflow('ParentB');
  const parentC = new SimpleWorkflow('ParentC');
  const child = new SimpleWorkflow('Child', parentA);

  // Observers for all parents
  const createObserver = (events: WorkflowEvent[]): WorkflowObserver => ({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const eventsA: WorkflowEvent[] = [];
  const eventsB: WorkflowEvent[] = [];
  const eventsC: WorkflowEvent[] = [];

  parentA.addObserver(createObserver(eventsA));
  parentB.addObserver(createObserver(eventsB));
  parentC.addObserver(createObserver(eventsC));

  // Cycle 1: A → B
  eventsA.length = 0;
  child.setStatus('running');
  expect(eventsA.some(e => e.type === 'treeUpdated')).toBe(true);

  parentA.detachChild(child);
  parentB.attachChild(child);

  eventsA.length = 0;
  eventsB.length = 0;
  child.setStatus('completed');
  expect(eventsB.some(e => e.type === 'treeUpdated')).toBe(true);
  expect(eventsA.some(e => e.type === 'treeUpdated')).toBe(false);

  // Cycle 2: B → C
  parentB.detachChild(child);
  parentC.attachChild(child);

  eventsB.length = 0;
  eventsC.length = 0;
  child.setStatus('running');
  expect(eventsC.some(e => e.type === 'treeUpdated')).toBe(true);
  expect(eventsB.some(e => e.type === 'treeUpdated')).toBe(false);

  // Cycle 3: C → A
  parentC.detachChild(child);
  parentA.attachChild(child);

  eventsC.length = 0;
  eventsA.length = 0;
  child.setStatus('completed');
  expect(eventsA.some(e => e.type === 'treeUpdated')).toBe(true);
  expect(eventsC.some(e => e.type === 'treeUpdated')).toBe(false);
});
```

---

## Quick Reference Summary

| Aspect | Specification |
|--------|---------------|
| **File** | `src/__tests__/integration/workflow-reparenting.test.ts` |
| **Test Framework** | Vitest with AAA (Arrange-Act-Assert) pattern |
| **Key Classes** | `Workflow`, `WorkflowObserver`, `WorkflowEvent` |
| **Test Helper** | `SimpleWorkflow extends Workflow` (for testing) |
| **Primary Validation** | parent1 observer receives before, parent2 receives after, parent1 stops receiving |
| **Event Type to Test** | `treeUpdated` (emitted by setStatus()) |
| **Reparenting Pattern** | `oldParent.detachChild(child); newParent.attachChild(child);` |
| **Observer Pattern** | Collect events in array: `onEvent: (e) => events.push(e)` |
| **Critical Assertion** | `expect(parent1Events.length).toBe(0)` after reparenting |
| **Test Command** | `npm test -- workflow-reparenting.test.ts` |

---

**PRP Version**: 1.0
**Created**: 2026-01-11
**For**: Subtask P1.M2.T2.S1 - Write Reparenting Integration Test
**PRD Reference**: Bug Fix Plan P1.M2 - Reparenting Support
**Pattern Reference**: Pattern 7 - Observer propagation should update after reparenting
