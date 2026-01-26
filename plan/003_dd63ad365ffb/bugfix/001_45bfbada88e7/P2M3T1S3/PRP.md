# Product Requirement Prompt (PRP): Write Integration Tests for Tree Update Consistency

---

## Goal

**Feature Goal**: Extend the existing `tree-mirroring.test.ts` with comprehensive integration tests verifying that `treeUpdated` events are emitted correctly for ALL state-changing methods in the Workflow class.

**Deliverable**: Extended `src/__tests__/integration/tree-mirroring.test.ts` with 5+ new test cases covering:
- `attachChild()` emits `treeUpdated` event
- `detachChild()` emits `treeUpdated` event
- `setStatus()` emits `treeUpdated` event (verify existing pattern)
- `snapshotState()` emits `treeUpdated` event (verify existing pattern)
- Multiple sequential operations emit correct count of `treeUpdated` events
- Observer receives all tree updates via both `onEvent` and `onTreeChanged`

**Success Definition**:
- [ ] All 4 state-changing methods (attachChild, detachChild, setStatus, snapshotState) emit `treeUpdated` events
- [ ] Multiple sequential operations emit `treeUpdated` for EACH operation (no batching/missing)
- [ ] Observer's `onEvent` callback receives `treeUpdated` events with correct `root` payload
- [ ] Observer's `onTreeChanged` callback is invoked for each structural change
- [ ] Type guards are used for discriminated union event type access
- [ ] Test follows existing patterns from tree-mirroring.test.ts (inline observer, TDDOrchestrator)
- [ ] All tests pass: `npm test`
- [ ] Tests catch regressions (if attachChild/detachChild stop emitting treeUpdated)

---

## User Persona

**Target User**: Implementation agent working on P2.M3.T1.S3 after P2.M3.T1.S2 has been completed.

**Use Case**: The implementation agent needs to write integration tests that verify the `treeUpdated` event emissions added in P2.M3.T1.S2 work correctly across all state-changing methods.

**User Journey**:
1. Read the existing tree-mirroring.test.ts to understand current patterns
2. Review P2.M3.T1.S2 PRP to understand what emissions were added
3. Add new test cases for attachChild and detachChild treeUpdated emissions
4. Add test case for multiple sequential operations
5. Run tests to verify all pass
6. Ensure tests would catch future regressions

**Pain Points Addressed**:
- **Missing Test Coverage**: No integration tests verify treeUpdated emission for attachChild/detachChild
- **Regression Risk**: Without tests, future changes could break treeUpdated emissions
- **Incomplete Validation**: Current tests don't verify count/sequence of multiple operations

---

## Why

**Business Value and User Impact**:
- Completes P2.M3 milestone ("Tree Update Event Consistency")
- Ensures PRD Issue #6 fix is properly tested and won't regress
- Validates the 1:1 tree mirror invariant is maintained through proper event emissions
- Provides confidence that TreeDebugger receives accurate real-time updates

**Integration with Existing Features**:
- Extends existing `tree-mirroring.test.ts` file (maintains test organization)
- Builds on P2.M3.T1.S2 implementation (tests assume attachChild/detachChild now emit treeUpdated)
- Uses existing test patterns (TDDOrchestrator, inline observers, type guards)
- Leverages existing test helpers (tree-verification functions)

**Problems Solved**:
- **Test Coverage Gap**: No integration tests verify treeUpdated emission for structural changes
- **Regression Prevention**: Tests will catch if treeUpdated emissions are accidentally removed
- **Observer Validation**: Tests verify observers receive correct notifications
- **Count Verification**: Tests verify multiple operations emit multiple events (not batched)

---

## What

**User-Visible Behavior and Technical Requirements**:

This PRP extends the existing `src/__tests__/integration/tree-mirroring.test.ts` file with new integration tests. No new files are created - we extend the existing test suite.

**Scope of Changes**:

1. **Target File**: `src/__tests__/integration/tree-mirroring.test.ts` (MODIFY ONLY)

2. **New Test Cases to Add**:

   a. **attachChild emits treeUpdated**
      - Create parent-child workflows
      - Attach observer to parent
      - Call `parent.attachChild(child)`
      - Verify `treeUpdated` event was emitted via `onEvent`
      - Verify `onTreeChanged` callback was invoked
      - Use type guard to access event.root property

   b. **detachChild emits treeUpdated**
      - Create parent-child relationship via constructor
      - Attach observer to parent
      - Call `parent.detachChild(child)`
      - Verify `treeUpdated` event was emitted via `onEvent`
      - Verify `onTreeChanged` callback was invoked
      - Use type guard to access event.root property

   c. **Multiple attachChild operations emit multiple treeUpdated events**
      - Create parent and multiple children
      - Attach observer to parent
      - Call `attachChild()` multiple times
      - Verify count of `treeUpdated` events equals number of operations
      - Verify each event has correct root

   d. **Multiple detachChild operations emit multiple treeUpdated events**
      - Create parent with multiple children
      - Attach observer to parent
      - Call `detachChild()` multiple times
      - Verify count of `treeUpdated` events equals number of operations
      - Verify each event has correct root

   e. **Mixed sequential operations emit correct event sequence**
      - Create parent and multiple children
      - Attach observer to parent
      - Perform sequence: attach, attach, detach, attach, detach
      - Verify correct count and sequence of treeUpdated events

   f. **Observer receives tree updates from child status changes**
      - This test already exists - verify it still passes after changes
      - Ensures we don't break existing functionality

3. **Test Pattern to Follow** (from existing tree-mirroring.test.ts):

```typescript
it('should emit treeUpdated when child is attached', () => {
  // ARRANGE: Create parent-child workflow tree
  const parent = new TDDOrchestrator('Parent');
  const child = new TDDOrchestrator('Child'); // No parent initially

  // ARRANGE: Set up observer with collection arrays
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: any[] = [];

  // ARRANGE: Create inline observer
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

  // ARRANGE: Attach observer to ROOT (parent, not child)
  parent.addObserver(observer);

  // ACT: Attach child
  parent.attachChild(child);

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
```

**Success Criteria**:
- [ ] All new tests added to tree-mirroring.test.ts
- [ ] Tests follow existing patterns (TDDOrchestrator, inline observer, type guards)
- [ ] Tests verify BOTH onEvent and onTreeChanged callbacks
- [ ] Tests verify event count matches number of operations
- [ ] All tests pass: `npm test`
- [ ] Tests catch regressions (would fail if treeUpdated emissions removed)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Complete test patterns from existing tree-mirroring.test.ts
- Exact code structure for new tests
- Import patterns and naming conventions
- Test assertion patterns (type guards, event filtering)
- P2.M3.T1.S2 PRP context showing what emissions were added
- Research on Vitest event testing patterns
- npm test command for verification

---

### Documentation & References

```yaml
# MUST READ - Input from previous task (CONTRACT)
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/PRP.md
  why: Defines what treeUpdated emissions were added to attachChild/detachChild
  section: Goal, What, Implementation Blueprint - shows exact methods modified
  critical: Tests MUST assume attachChild/detachChild now emit treeUpdated

# MUST READ - Target test file to modify
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Existing test patterns to follow - TDDOrchestrator usage, observer setup, type guards
  pattern: Inline observer with events[] and treeChangedCalls[] arrays
  lines: 117-153 (existing treeUpdated test - exact pattern to follow)
  gotcha: Must use TDDOrchestrator for consistency with existing tests
  gotcha: Must import WorkflowObserver, WorkflowEvent types from index.js

# MUST READ - Related test patterns
- file: src/__tests__/integration/bidirectional-consistency.test.ts
  why: Helper functions for tree verification (verifyBidirectionalLink, verifyTreeMirror)
  pattern: SimpleWorkflow class definition for testing
  lines: 30-36 (SimpleWorkflow pattern)

# MUST READ - Workflow class emissions (for test assertions)
- file: src/core/workflow.ts
  why: Exact emission locations and patterns to verify in tests
  pattern: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
  lines: 376 (snapshotState), 434 (runFunctional error), 482 (runFunctional error), 787 (setStatus)
  lines: ~374 (attachChild - TO BE ADDED by P2.M3.T1.S2)
  lines: ~426 (detachChild - TO BE ADD by P2.M3.T1.S2)

# MUST READ - Event type definitions
- file: src/types/events.ts
  why: treeUpdated event type definition for type guards
  pattern: { type: 'treeUpdated'; root: WorkflowNode }

# MUST READ - Observer interface
- file: src/types/index.ts
  why: WorkflowObserver interface - understand onEvent and onTreeChanged callbacks
  pattern: onEvent(event: WorkflowEvent): void, onTreeChanged(root: WorkflowNode): void

# MUST READ - Research findings
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S3/research/workflow-treeupdated-patterns.md
  why: Complete inventory of all treeUpdated emission locations in Workflow class
  section: Complete Inventory of treeUpdated Emissions, Integration Test Implications
  critical: Shows all 3 current locations + 2 to-be-added locations

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S3/research/integration-test-patterns.md
  why: Integration test patterns from 11 existing test files
  section: Key Testing Patterns, treeUpdated Event Specific Patterns
  critical: Inline observer pattern, type guard pattern, assertion patterns

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S3/research/vitest-event-testing.md
  why: Vitest-specific event testing patterns and best practices
  section: Core Event Testing Patterns, Type-Safe Event Testing, Test Templates
  critical: vi.fn() spy patterns, event filtering, type guard usage

# MUST READ - Audit document for context
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
  why: Complete audit of state-changing methods and emission status
  section: Executive Summary, Missing treeUpdated Emission table
  critical: Shows WHY attachChild/detachChild need treeUpdated emissions
```

---

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── tree-mirroring.test.ts     # TARGET FILE - MODIFY THIS
│   │   ├── bidirectional-consistency.test.ts
│   │   ├── observer-logging.test.ts
│   │   └── ... (8 other integration test files)
│   └── helpers/
│       └── tree-verification.ts       # Helper functions (optional to use)
├── core/
│   └── workflow.ts                    # Contains methods being tested
├── types/
│   ├── events.ts                      # WorkflowEvent discriminated union
│   └── index.ts                       # WorkflowObserver interface
├── examples/
│   ├── tdd-orchestrator.ts            # TDDOrchestrator class for tests
│   └── ...

plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/
├── architecture/
│   └── tree-update-audit.md           # Audit document
├── P2M3T1S2/
│   └── PRP.md                         # Previous task - adds treeUpdated to attachChild/detachChild
└── P2M3T1S3/
    ├── PRP.md                         # THIS FILE - Output of this task
    └── research/                      # Research findings directory
        ├── workflow-treeupdated-patterns.md
        ├── integration-test-patterns.md
        └── vitest-event-testing.md
```

---

### Desired Codebase Tree with Files to be Added

```bash
# No new files - MODIFY existing src/__tests__/integration/tree-mirroring.test.ts

# Changes to tree-mirroring.test.ts:
# - Add 5-6 new test cases to existing describe block
# - Follow existing import patterns (no new imports needed)
# - Use existing TDDOrchestrator class
# - Follow inline observer pattern from existing tests
```

---

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: Test Pattern Consistency

# 1. MUST use TDDOrchestrator for workflow instances
# const parent = new TDDOrchestrator('Parent');
# const child = new TDDOrchestrator('Child');
# This matches existing test patterns in tree-mirroring.test.ts

# 2. MUST use inline observer objects with capture arrays
# const events: WorkflowEvent[] = [];
# const treeChangedCalls: any[] = [];
# const observer: WorkflowObserver = {
#   onLog: () => {},
#   onEvent: (event) => events.push(event),
#   onStateUpdated: () => {},
#   onTreeChanged: (root) => treeChangedCalls.push(root),
# };

# 3. MUST attach observer to ROOT, not child
# parent.addObserver(observer); // ✅ Correct - receives all tree events
# child.addObserver(observer);  // ❌ May miss parent-level events

# 4. MUST use type guards for discriminated union access
# const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
# if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
#   expect(treeUpdatedEvent.root).toBe(parent.getNode());
# }

# 5. MUST verify BOTH onEvent and onTreeChanged callbacks
# Verify onEvent received the event
# Verify onTreeChanged callback was invoked
# This matches the existing test pattern at lines 117-153

# 6. MUST verify event COUNT for multiple operations
// Multiple attachChild calls should emit multiple treeUpdated events
parent.attachChild(child1);
parent.attachChild(child2);
parent.attachChild(child3);
const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');
expect(treeUpdatedEvents).toHaveLength(3);

# 7. Use event filtering for count assertions
// events.filter(e => e.type === 'treeUpdated') is clearer than counting manually
// This pattern is used throughout the codebase

# 8. Don't create new test files
// All tests go in existing tree-mirroring.test.ts
// Maintain test organization and structure

# 9. Import from index.js, not individual files
// import { WorkflowEvent, WorkflowObserver } from '../../index.js';
// Not: import { WorkflowEvent } from '../../types/events.js';

# 10. Tests assume P2.M3.T1.S2 is complete
// attachChild() and detachChild() now emit treeUpdated
// If tests fail, it means P2.M3.T1.S2 wasn't implemented correctly
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing types:

```typescript
// Existing types from src/types/events.ts
type WorkflowEvent =
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stepStart'; node: WorkflowNode; stepName: string }
  // ... other event types

// Existing observer interface from src/types/index.ts
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ EXISTING TEST FILE
  - READ: src/__tests__/integration/tree-mirroring.test.ts
  - UNDERSTAND: TDDOrchestrator usage pattern
  - UNDERSTAND: Inline observer pattern (events[], treeChangedCalls[])
  - UNDERSTAND: Type guard pattern for discriminated unions
  - NOTE: Import patterns from index.js

Task 2: READ P2.M3.T1.S2 PRP (CONTRACT)
  - READ: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/PRP.md
  - VERIFY: Understanding of what emissions were added
  - CONFIRM: attachChild() and detachChild() now emit treeUpdated
  - NOTE: Exact emission pattern used

Task 3: ADD TEST: attachChild emits treeUpdated
  - FILE: src/__tests__/integration/tree-mirroring.test.ts
  - LOCATION: Add new it() block in existing describe block
  - PATTERN: Follow existing test at lines 117-153
  - TEST: Create parent, child (no parent), attach observer, call attachChild()
  - VERIFY: treeUpdated event in events array
  - VERIFY: Event.root equals parent.getNode() (with type guard)
  - VERIFY: treeChangedCalls has 1 entry

Task 4: ADD TEST: detachChild emits treeUpdated
  - FILE: src/__tests__/integration/tree-mirroring.test.ts
  - LOCATION: Add new it() block after Task 3 test
  - PATTERN: Follow existing test at lines 117-153
  - TEST: Create parent-child via constructor, attach observer, call detachChild()
  - VERIFY: treeUpdated event in events array
  - VERIFY: Event.root equals parent.getNode() (with type guard)
  - VERIFY: treeChangedCalls has 1 entry

Task 5: ADD TEST: Multiple attachChild operations emit multiple treeUpdated events
  - FILE: src/__tests__/integration/tree-mirroring.test.ts
  - LOCATION: Add new it() block in new describe('Multiple Operations')
  - TEST: Create parent, 3 children, observer
  - ACT: Call attachChild() 3 times
  - VERIFY: treeUpdated events count equals 3
  - VERIFY: Each event has correct root

Task 6: ADD TEST: Multiple detachChild operations emit multiple treeUpdated events
  - FILE: src/__tests__/integration/tree-mirroring.test.ts
  - LOCATION: Add in same describe('Multiple Operations')
  - TEST: Create parent with 3 children, observer
  - ACT: Call detachChild() 3 times
  - VERIFY: treeUpdated events count equals 3
  - VERIFY: Each event has correct root

Task 7: ADD TEST: Mixed sequential operations emit correct event sequence
  - FILE: src/__tests__/integration/tree-mirroring.test.ts
  - LOCATION: Add in same describe('Multiple Operations')
  - TEST: Create parent, 3 children, observer
  - ACT: attach, attach, detach, attach, detach
  - VERIFY: treeUpdated events count equals 5
  - VERIFY: Event sequence matches operation sequence

Task 8: RUN ALL TESTS
  - COMMAND: npm test
  - VERIFY: All existing tests still pass
  - VERIFY: All new tests pass
  - DEBUG: If tests fail, check if P2.M3.T1.S2 was implemented

Task 9: RUN SPECIFIC TEST FILE
  - COMMAND: npm test -- tree-mirroring
  - VERIFY: Only tree-mirroring tests run
  - VERIFY: All tests in file pass

Task 10: VERIFY REGRESSION DETECTION
  - MANUAL: Temporarily comment out treeUpdated emission in attachChild
  - VERIFY: New test fails (proves test catches regressions)
  - RESTORE: Uncomment the emission
  - VERIFY: Test passes again
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Inline Observer Setup (from tree-mirroring.test.ts:127-132)
const events: WorkflowEvent[] = [];
const treeChangedCalls: any[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: (root) => treeChangedCalls.push(root),
};

// PATTERN 2: Type Guard for Discriminated Union (from tree-mirroring.test.ts:141-147)
const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeDefined();

if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
  expect(treeUpdatedEvent.root).toBe(parent.getNode());
}

// PATTERN 3: Event Filtering for Count Assertions
const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');
expect(treeUpdatedEvents).toHaveLength(3);

// PATTERN 4: Test Structure (Arrange-Act-Assert)
it('should emit treeUpdated when child is attached', () => {
  // ARRANGE
  const parent = new TDDOrchestrator('Parent');
  const child = new TDDOrchestrator('Child');
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: any[] = [];
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };
  parent.addObserver(observer);

  // ACT
  parent.attachChild(child);

  // ASSERT
  const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();
  // ... more assertions
});

// PATTERN 5: Multiple Operations Test
it('should emit treeUpdated for each attachChild operation', () => {
  const parent = new TDDOrchestrator('Parent');
  const child1 = new TDDOrchestrator('Child1');
  const child2 = new TDDOrchestrator('Child2');
  const child3 = new TDDOrchestrator('Child3');

  const events: WorkflowEvent[] = [];
  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // ACT: Multiple attach operations
  parent.attachChild(child1);
  parent.attachChild(child2);
  parent.attachChild(child3);

  // ASSERT: Verify count
  const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvents).toHaveLength(3);

  // ASSERT: Verify each has correct root
  treeUpdatedEvents.forEach(event => {
    if (event.type === 'treeUpdated') {
      expect(event.root).toBe(parent.getNode());
    }
  });
});

// GOTCHA 1: Clear events between sequential operations in same test
// If testing operations in sequence, clear array between phases
events.length = 0; // Clear for next phase

// GOTCHA 2: Use TDDOrchestrator, not Workflow
// TDDOrchestrator extends Workflow and is used in existing tests
const parent = new TDDOrchestrator('Parent'); // ✅
const parent = new Workflow('Parent'); // ❌ - breaks test consistency

// GOTCHA 3: Import from index.js
import { WorkflowEvent, WorkflowObserver } from '../../index.js'; // ✅
import { WorkflowEvent } from '../../types/events.js'; // ❌

// GOTCHA 4: Observer attachment to ROOT
parent.addObserver(observer); // ✅ Correct - root receives all events
child.addObserver(observer); // ❌ Wrong - may miss parent events
```

---

### Integration Points

```yaml
NO NEW INTEGRATIONS - This is test-only work

MODIFIED FILES:
  - src/__tests__/integration/tree-mirroring.test.ts:
    add: 5-6 new test cases for treeUpdated emission verification
    add: New describe block for multiple operations tests
    preserve: All existing tests (no modifications)

DEPENDENCIES:
  - P2.M3.T1.S2 completion: Tests assume attachChild/detachChild emit treeUpdated
  - TDDOrchestrator class: Existing class used for test instances
  - WorkflowEvent type: Existing discriminated union
  - WorkflowObserver interface: Existing observer pattern

NO CHANGES TO:
  - Source code files (tests only)
  - Helper functions (use existing if needed)
  - Test configuration (use existing setup)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding tests - fix before proceeding
npm run lint       # TypeScript type checking via tsc --noEmit

# Expected: Zero type errors. If errors exist:
# - Check imports are from index.js
# - Check type guards are used correctly
# - Check WorkflowObserver interface implementation
```

### Level 2: Run Specific Test File (Component Validation)

```bash
# Run only tree-mirroring tests for quick feedback
npm test -- tree-mirroring

# Expected: All tests pass, including new ones
# If new tests fail:
# - Check if P2.M3.T1.S2 was implemented (attachChild/detachChild need treeUpdated)
# - Check observer pattern matches existing tests
# - Check type guard syntax is correct
```

### Level 3: Run Full Test Suite (System Validation)

```bash
# Run all tests to verify no regressions
npm test

# Expected: All tests pass
# If other tests fail:
# - Investigate if changes broke existing functionality
# - Fix implementation or tests as needed
```

### Level 4: Regression Detection Validation

```bash
# Manually verify tests catch regressions
# 1. Temporarily comment out treeUpdated emission in attachChild
# 2. Run: npm test -- tree-mirroring
# 3. Verify: New attachChild test FAILS
# 4. Restore: Uncomment the emission
# 5. Run: npm test -- tree-mirroring
# 6. Verify: All tests PASS

# Expected: Tests fail when treeUpdated emissions are removed
# This proves tests effectively catch regressions
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All new tests added to tree-mirroring.test.ts
- [ ] Tests use TDDOrchestrator class (not Workflow directly)
- [ ] Tests use inline observer pattern with events[] and treeChangedCalls[]
- [ ] Tests use type guards for discriminated union access
- [ ] Tests verify BOTH onEvent and onTreeChanged callbacks
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run lint`
- [ ] New tests catch regressions (verified by manual test)

### Feature Validation

- [ ] attachChild test verifies treeUpdated emission
- [ ] detachChild test verifies treeUpdated emission
- [ ] Multiple operations tests verify correct event count
- [ ] Mixed operations test verifies correct event sequence
- [ ] Existing tests still pass (no regressions)
- [ ] Observer callback verification works correctly

### Code Quality Validation

- [ ] Follows existing test patterns (matches tree-mirroring.test.ts style)
- [ ] No new files created (only modified tree-mirroring.test.ts)
- [ ] Imports from index.js (not individual files)
- [ ] Test names are descriptive and consistent
- [ ] Arrange-Act-Assert structure maintained
- [ ] Type guards used for all discriminated union access

### Documentation & Deployment

- [ ] Test comments explain what is being tested
- [ ] Test names clearly indicate the scenario
- [ ] No breaking changes to existing tests

---

## Anti-Patterns to Avoid

- ❌ Don't create new test files (modify tree-mirroring.test.ts)
- ❌ Don't import from individual type files (use index.js)
- ❌ Don't use Workflow class directly (use TDDOrchestrator)
- ❌ Don't skip type guards for discriminated unions
- ❌ Don't attach observer to child instead of root
- ❌ Don't verify only onEvent OR only onTreeChanged (verify both)
- ❌ Don't assume tests work without running them
- ❌ Don't forget to verify event COUNT for multiple operations
- ❌ Don't use `as any` to bypass TypeScript types
- ❌ Don't modify existing tests (only add new ones)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (add tests to existing file)
- ✅ Complete test patterns provided from existing tests
- ✅ Exact code structure shown (inline observer, type guards)
- ✅ P2.M3.T1.S2 PRP provides contract for what to test
- ✅ Research covers all necessary patterns
- ✅ No new files or complex integrations needed
- ✅ Test-only work (lower risk)
- ✅ Regression detection strategy included

**Validation**: The completed tests will verify that all state-changing methods emit `treeUpdated` events correctly, ensuring the 1:1 tree mirror invariant is maintained and observers receive proper notifications. Tests will catch regressions if treeUpdated emissions are accidentally removed.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
