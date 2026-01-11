# Product Requirement Prompt (PRP): Emit treeUpdated Event After snapshotState() Completes

**Work Item**: P1.M2.T2.S3
**Title**: Emit treeUpdated event after snapshotState() completes
**Type**: Bug Fix - Event System Enhancement
**Points**: 1
**Status**: Research Complete

---

## Goal

**Feature Goal**: Add `treeUpdated` event emission to the `snapshotState()` method in `src/core/workflow.ts` to trigger tree observer updates when workflow state is captured.

**Deliverable**: Modified `snapshotState()` method that emits `treeUpdated` event after state snapshot is complete, enabling tree debugger to rebuild when workflow state changes.

**Success Definition**:
1. `snapshotState()` method emits `treeUpdated` event after `this.node.stateSnapshot = snapshot` is set
2. Event emission follows existing pattern: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })`
3. Observers' `onTreeChanged()` callback is triggered via existing `emitEvent()` infrastructure
4. Tree debugger rebuilds tree structure when workflow state is captured

## Why

- **PRD Compliance**: PRD Section 12.2 requires `treeUpdated` events for structural changes, and state snapshots are structural changes that affect the tree
- **Observer Pattern**: Current implementation handles `treeUpdated` events in `emitEvent()` but never emits them for state changes
- **Tree Debugger Functionality**: Tree debugger relies on `onTreeChanged()` callback to rebuild tree visualization when state changes
- **Consistency**: Related fix P1.M2.T2.S1 added `treeUpdated` to `setStatus()`, and state snapshots are similar structural changes that should also trigger tree updates
- **Impact**: Without this, tree debugger won't update when workflows capture state snapshots via `@Step(opts.snapshotState: true)` or manual `snapshotState()` calls

## What

### User-Visible Behavior

When a workflow's state is captured via `snapshotState()`, the tree debugger will automatically rebuild its tree representation to reflect the updated state snapshot.

### Technical Requirements

**Location**: `src/core/workflow.ts`, lines 223-242 (current `snapshotState()` method)

**Current Implementation**:
```typescript
public snapshotState(): void {
  const snapshot = getObservedState(this);
  this.node.stateSnapshot = snapshot;

  // Notify observers
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onStateUpdated(this.node);
    } catch (err) {
      console.error('Observer onStateUpdated error:', err);
    }
  }

  // Emit snapshot event
  this.emitEvent({
    type: 'stateSnapshot',
    node: this.node,
  });
}
```

**Required Change**:
```typescript
public snapshotState(): void {
  const snapshot = getObservedState(this);
  this.node.stateSnapshot = snapshot;

  // Notify observers
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onStateUpdated(this.node);
    } catch (err) {
      console.error('Observer onStateUpdated error:', err);
    }
  }

  // Emit snapshot event
  this.emitEvent({
    type: 'stateSnapshot',
    node: this.node,
  });

  // Emit treeUpdated event to trigger tree debugger rebuild
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Success Criteria**:
- [ ] `treeUpdated` event emitted after state snapshot is captured
- [ ] Event contains `root: WorkflowNode` from `this.getRoot().node`
- [ ] Existing `emitEvent()` infrastructure handles observer notification
- [ ] No breaking changes to method signature or existing functionality

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed?

YES - This PRP provides:
- Exact file location and line numbers for modification
- Current implementation code with context
- Complete change specification with exact code to add
- Event type definitions and patterns
- Observer callback flow
- Test patterns for validation (from P1.M2.T2.S2)
- Related work items for consistency
- Existing similar implementations as reference

### Documentation & References

```yaml
MUST READ - Include these in your context window:

# PRD Requirements
- url: plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md
  why: Issue #1 confirms snapshotState() at lines 223-242 doesn't emit treeUpdated, PRD Section 12.2 requires it
  section: Issue 1: Missing `treeUpdated` Event Emission (lines 27-114)
  critical: PRD explicitly defines treeUpdated as distinct event type for structural changes

# Event Type Definition
- file: src/types/events.ts
  why: treeUpdated event type definition - { type: 'treeUpdated'; root: WorkflowNode }
  pattern: Discriminated union event type with specific payload structure
  gotcha: Event defined but treeUpdated is only emitted in setStatus() (should also be in snapshotState)

# Event Emission Infrastructure
- file: src/core/workflow.ts
  why: emitEvent() method implementation that handles treeUpdated events
  section: Lines 202-218
  pattern: Events pushed to this.node.events array, then observers notified via getRootObservers()
  gotcha: Lines 211-213 show conditional handling - treeUpdated triggers onTreeChanged() callback

# Observer Interface
- file: src/types/observer.ts
  why: WorkflowObserver interface with onTreeChanged() callback signature
  pattern: Observer interface with onLog, onEvent, onStateUpdated, onTreeChanged methods
  gotcha: onTreeChanged() is specifically for tree structure changes, not all events

# Current snapshotState Implementation
- file: src/core/workflow.ts
  why: Exact location and current implementation of snapshotState() method
  section: Lines 223-242
  pattern: Captures state, notifies observers, emits stateSnapshot event
  gotcha: Already emits stateSnapshot event and calls onStateUpdated(), but doesn't emit treeUpdated

# Related Implementation: setStatus with treeUpdated
- file: src/core/workflow.ts
  why: Reference pattern from P1.M2.T2.S1 - setStatus() now emits treeUpdated
  section: Lines 247-251
  pattern: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  gotcha: This is the pattern to follow - same one-line addition at end of method

# getRoot() Method with Cycle Detection
- file: src/core/workflow.ts
  why: Will be called to get root node for event emission
  section: Lines 145-160
  pattern: Cycle detection using Set to prevent infinite loops in parent chain traversal
  gotcha: Throws Error if circular parent-child relationship detected

# Test Pattern Reference (for validation)
- file: src/__tests__/unit/workflow.test.ts
  why: Test pattern from P1.M2.T2.S2 for treeUpdated event emission testing
  section: Lines 241-271
  pattern: Uses observer with array collection, validates both onEvent and onTreeChanged callbacks
  gotcha: Uses type narrowing for discriminated union: event?.type === 'treeUpdated' && event.root

# getObservedState Import
- file: src/core/workflow.ts
  why: snapshotState() uses getObservedState(this) to capture state
  section: Line 224
  pattern: Imports from '../utils/observable.js'
  gotcha: Only collects fields marked with @ObservedState() decorator

# @Step Decorator with snapshotState Option
- file: src/decorators/step.ts
  why: snapshotState() is called automatically when @Step(opts.snapshotState: true) is used
  section: Line 89
  pattern: Automatically calls workflow.snapshotState() after step execution
  gotcha: This is a common use case where treeUpdated emission will be triggered
```

### Current Codebase Tree

```
/home/dustin/projects/groundswell/
├── src/
│   ├── core/                          # Core workflow engine
│   │   ├── workflow.ts                # ⭐ TARGET FILE - Contains snapshotState() method
│   │   ├── workflow-context.ts        # WorkflowContext implementation
│   │   ├── logger.ts                  # Logging system
│   │   └── ...
│   ├── types/                         # TypeScript type definitions
│   │   ├── events.ts                  # ⭐ Event type definitions (treeUpdated)
│   │   ├── workflow.ts                # Workflow type definitions
│   │   ├── observer.ts                # ⭐ Observer interface (onTreeChanged)
│   │   └── ...
│   ├── utils/
│   │   └── observable.ts              # getObservedState function
│   ├── __tests__/                     # Test directory
│   │   ├── unit/
│   │   │   ├── workflow.test.ts       # ⭐ Workflow unit tests (add test here)
│   │   │   └── ...
│   │   └── integration/
│   ├── decorators/
│   │   └── step.ts                    # @Step decorator with snapshotState option
│   └── ...
├── plan/
│   └── bugfix/
│       └── P1M2T2S3/                  # ⭐ THIS PRP LOCATION
└── examples/
```

### Desired Codebase Tree with Changes

```
# No new files - this is a modification to existing code

Modified File:
├── src/core/workflow.ts               # snapshotState() method updated (lines 223-242)
    ├── Change: Add this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node }); after line 241
    └── Location: After the stateSnapshot event emission, at end of method

New Test (Future Task - P1.M2.T2.S4):
├── src/__tests__/unit/workflow.test.ts # Add test for treeUpdated on snapshotState()
    └── Position: After the setStatus treeUpdated test (after line 271)
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: snapshotState() already emits stateSnapshot event
// Location: src/core/workflow.ts, lines 237-241
// PATTERN: this.emitEvent({ type: 'stateSnapshot', node: this.node })
// GOTCHA: Adding treeUpdated is a second event emission in the same method - this is CORRECT
// REASON: stateSnapshot notifies about state capture, treeUpdated notifies about tree structure change

// CRITICAL: snapshotState() already calls onStateUpdated() on observers
// Location: src/core/workflow.ts, lines 227-235
// PATTERN: Manual iteration over getRootObservers() with try/catch for each observer
// GOTCHA: This is in addition to emitEvent() calling onEvent() and onTreeChanged()
// REASON: onStateUpdated() is specific to state changes, onTreeChanged() is for tree structure

// CRITICAL: getRoot() implements cycle detection - throws Error on circular parent relationships
// Location: src/core/workflow.ts, lines 145-160
// PATTERN: Uses Set<Workflow>() to track visited workflows during parent chain traversal
// GOTCHA: If someone manually sets workflow.parent to create a cycle, getRoot() will throw
// EXPECTED: This is expected behavior - prevents infinite loops

// CRITICAL: emitEvent() automatically handles observer notification
// Location: src/core/workflow.ts, lines 202-218
// PATTERN: Pushes event to this.node.events array, then notifies all root observers
// GOTCHA: Lines 211-213 - treeUpdated events automatically trigger onTreeChanged() callback
// No need to manually call onTreeChanged() - emitEvent() infrastructure handles it

// CRITICAL: Event order matters - stateSnapshot before treeUpdated
// Location: src/core/workflow.ts, lines 237-241
// PATTERN: stateSnapshot emitted first, then treeUpdated should be emitted after
// GOTCHA: Maintain this order - state-specific events before structural events

// CRITICAL: getObservedState() only captures @ObservedState() decorated fields
// Location: src/utils/observable.ts
// PATTERN: Reflects on class properties with ObservedState metadata
// GOTCHA: Fields without @ObservedState() decorator are NOT included in snapshot

// CRITICAL: snapshotState() is called by @Step decorator when opts.snapshotState is true
// Location: src/decorators/step.ts, line 89
// PATTERN: workflow.snapshotState() called after step execution
// GOTCHA: Each decorated step will trigger treeUpdated event if snapshotState is enabled

// CRITICAL: Test naming convention uses "should" prefix
// PATTERN: "should emit treeUpdated event when snapshotState is called"
// GOTCHA: Follow existing test naming in workflow.test.ts

// CRITICAL: Observer interface requires ALL methods to be implemented
// Even if you only test onTreeChanged, you must provide empty implementations for:
// - onLog: () => {}
// - onEvent: (event) => events.push(event)
// - onStateUpdated: () => {}
// - onTreeChanged: (root) => treeChangedCalls.push(root)
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - this uses existing types:

```typescript
// From src/types/events.ts - Already defined, no changes needed
type WorkflowEvent =
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  // ... other event types

// From src/utils/observable.ts - Already defined, no changes needed
function getObservedState(workflow: Workflow): SerializedWorkflowState;

// From src/types/observer.ts - Already defined, no changes needed
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;  // Already called by snapshotState()
  onTreeChanged(root: WorkflowNode): void;   // Will be triggered by treeUpdated
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/workflow.ts - Update snapshotState() method
  - LOCATION: Lines 223-242 in src/core/workflow.ts
  - FIND: public snapshotState(): void method
  - CURRENT CODE:
    public snapshotState(): void {
      const snapshot = getObservedState(this);
      this.node.stateSnapshot = snapshot;

      // Notify observers
      const observers = this.getRootObservers();
      for (const obs of observers) {
        try {
          obs.onStateUpdated(this.node);
        } catch (err) {
          console.error('Observer onStateUpdated error:', err);
        }
      }

      // Emit snapshot event
      this.emitEvent({
        type: 'stateSnapshot',
        node: this.node,
      });
    }
  - ADD: After line 241 (after the stateSnapshot event emission)
  - CODE TO ADD:
    // Emit treeUpdated event to trigger tree debugger rebuild
    this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  - RESULTING CODE:
    public snapshotState(): void {
      const snapshot = getObservedState(this);
      this.node.stateSnapshot = snapshot;

      // Notify observers
      const observers = this.getRootObservers();
      for (const obs of observers) {
        try {
          obs.onStateUpdated(this.node);
        } catch (err) {
          console.error('Observer onStateUpdated error:', err);
        }
      }

      // Emit snapshot event
      this.emitEvent({
        type: 'stateSnapshot',
        node: this.node,
      });

      // Emit treeUpdated event to trigger tree debugger rebuild
      this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
    }
  - DEPENDENCIES: None (uses existing emitEvent() and getRoot() methods)
  - VERIFICATION: Event emission happens AFTER all other work (ensures observers see updated state)

Task 2: VERIFY Existing Imports
  - CHECK: WorkflowEvent type is imported/available
  - LOCATION: Top of src/core/workflow.ts file
  - EXPECTED: Already imported for emitEvent() method usage
  - ACTION: No import changes needed (emitEvent already used in current method)

Task 3: RUN Validation Commands
  - EXECUTE: npm test to verify no existing tests break
  - EXECUTE: npm run lint if available
  - EXPECTED: All tests should pass (adding event emission should not break existing functionality)
  - VERIFICATION: Check that emitEvent() method exists and is accessible
```

### Implementation Patterns & Key Details

```typescript
// Pattern: Event Emission in State Capture Methods
// The snapshotState() method should follow this pattern:

public snapshotState(): void {
  // 1. Capture state using getObservedState()
  const snapshot = getObservedState(this);

  // 2. Store snapshot in node (makes it available to tree debugger)
  this.node.stateSnapshot = snapshot;

  // 3. Notify observers of state update (legacy pattern)
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onStateUpdated(this.node);
    } catch (err) {
      console.error('Observer onStateUpdated error:', err);
    }
  }

  // 4. Emit stateSnapshot event (state-specific notification)
  this.emitEvent({
    type: 'stateSnapshot',
    node: this.node,
  });

  // 5. Emit treeUpdated event (structural notification)
  // PATTERN: Use emitEvent() which handles observer notification automatically
  // PATTERN: Pass root node from getRoot().node for complete tree context
  // CRITICAL: Event emission AFTER all state updates ensures observers see complete state
  // CRITICAL: Placed AFTER stateSnapshot event to maintain event ordering
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}

// GOTCHA: Don't call onTreeChanged() directly - emitEvent() handles it
// Location: src/core/workflow.ts, lines 211-213
// The emitEvent() method checks if event.type === 'treeUpdated' and calls obs.onTreeChanged()

// GOTCHA: snapshotState() now emits TWO events
// 1. stateSnapshot - specific to state capture, carries this.node
// 2. treeUpdated - general structural change, carries root node
// This is CORRECT - different purposes, different payloads

// PATTERN: Event emission follows discriminated union pattern
// Event type is 'treeUpdated', payload is { root: WorkflowNode }
// TypeScript will type-check the event structure

// REFERENCE: Same pattern in setStatus() method (lines 247-251)
// public setStatus(status: WorkflowStatus): void {
//   this.status = status;
//   this.node.status = status;
//   this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
// }

// GOTCHA: Event order - state-specific before structural
// stateSnapshot emitted first (state-specific)
// treeUpdated emitted second (structural change)
// This ordering allows observers to process state before handling structural updates

// CRITICAL: snapshotState() is called by @Step decorator
// Location: src/decorators/step.ts, line 89
// When opts.snapshotState is true, each step will trigger treeUpdated event
// This enables tree debugger to rebuild after each step's state capture
```

### Integration Points

```yaml
EXISTING_CODE:
  - file: src/core/workflow.ts
    method: emitEvent()
    usage: Called by snapshotState() to dispatch treeUpdated event
    behavior: Automatically notifies all root observers via getRootObservers()
    side_effects: Pushes event to this.node.events array, triggers onTreeChanged()

  - file: src/core/workflow.ts
    method: getRoot()
    usage: Called to get root node for event payload
    behavior: Traverses parent chain with cycle detection
    side_effects: May throw Error if circular relationship detected

  - file: src/core/workflow.ts
    property: this.node.stateSnapshot
    usage: Set to captured state before event emission
    behavior: Public node representation includes state snapshot
    side_effects: None (simple property assignment)

  - file: src/utils/observable.ts
    function: getObservedState()
    usage: Captures workflow state before event emission
    behavior: Reflects on @ObservedState() decorated fields
    side_effects: None (read-only operation)

CALLERS:
  - file: src/decorators/step.ts
    location: Line 89
    usage: workflow.snapshotState() called when opts.snapshotState is true
    impact: Steps with snapshotState enabled will now trigger treeUpdated events

  - file: tests/, examples/
    usage: Manual snapshotState() calls throughout codebase
    impact: All manual state captures will now trigger tree updates
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making the change - fix before proceeding
npm test                     # Run all tests (Vitest)
# OR
npx vitest run              # Run tests once

# Expected: Zero test failures. Event emission syntax is valid TypeScript.
# If errors exist, READ output and fix before proceeding.

# Type checking
npx tsc --noEmit            # Type check without emitting files

# Expected: Zero type errors. Event payload matches WorkflowEvent type definition.
# The emitEvent() method accepts WorkflowEvent, and { type: 'treeUpdated', root: this.getRoot().node } is valid.

# Linting (if configured)
npm run lint                # Or: npx eslint src/core/workflow.ts

# Expected: Zero linting errors. Code follows project style.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing workflow tests to ensure no regression
npm test -- workflow.test.ts

# Expected: All existing tests should pass.
# Adding event emission should not break existing functionality.

# Run specific test related to snapshotState (if exists)
npm test -- -t "snapshot"

# Expected: Tests related to snapshotState should still pass.
# The new event emission is additive, not modifying behavior.

# Run full test suite
npm test

# Expected: All tests pass (133+ tests as of latest commits).
# P1.M2.T2.S4 will add specific test for this change.

# Coverage validation (if coverage tools available)
npm run test:coverage        # Or: npx vitest run --coverage

# Expected: Coverage for snapshotState() method reflects new line.
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual verification - Create a test script to verify treeUpdated emission

# Create test file: test-snapshot-state-treeupdated.ts
cat > test-snapshot-state-treeupdated.ts << 'EOF'
import { Workflow, WorkflowObserver, ObservedState } from './src/index';

class TestWorkflow extends Workflow {
  @ObservedState()
  counter = 0;

  async run(): Promise<void> {
    this.counter = 1;
    this.snapshotState();
  }
}

const workflow = new TestWorkflow('Test');
const events: any[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => console.log('Tree changed!'),
};

workflow.addObserver(observer);
workflow.run();

// Check for events
const snapshotEvents = events.filter(e => e.type === 'stateSnapshot');
const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');

console.log('stateSnapshot events:', snapshotEvents.length);
console.log('treeUpdated events:', treeUpdatedEvents.length);
// Expected: 1 stateSnapshot, 1 treeUpdated
EOF

# Run the test
npx tsx test-snapshot-state-treeupdated.ts

# Expected output:
# Tree changed!
# stateSnapshot events: 1
# treeUpdated events: 1

# Cleanup
rm test-snapshot-state-treeupdated.ts

# Verify observers receive onTreeChanged callback
# The emitEvent() infrastructure should automatically call onTreeChanged()
# when treeUpdated event is emitted (see lines 211-213 in workflow.ts)
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Tree Debugger Integration Test
# Verify that tree debugger rebuilds when snapshotState() is called

# Create integration test: test-tree-debugger-snapshot.ts
cat > test-tree-debugger-snapshot.ts << 'EOF'
import { Workflow, WorkflowTreeDebugger, ObservedState } from './src/index';

class SnapshotWorkflow extends Workflow {
  @ObservedState()
  status = 'initial';

  async run(): Promise<void> {
    console.log('Initial state:', this.status);

    this.status = 'updated';
    this.snapshotState();

    console.log('Final state:', this.status);
  }
}

const workflow = new SnapshotWorkflow('SnapshotTest');
const debugger = new WorkflowTreeDebugger(workflow);

console.log('\nInitial tree:');
console.log(debugger.toTreeString());

await workflow.run();

console.log('\nFinal tree (should include state snapshot):');
console.log(debugger.toTreeString());

// Verify state snapshot is reflected in tree output
const treeOutput = debugger.toTreeString();
if (treeOutput.includes('updated')) {
  console.log('✓ State snapshot reflected in tree debugger');
} else {
  console.log('✗ State snapshot NOT reflected in tree debugger');
}
EOF

# Run the integration test
npx tsx test-tree-debugger-snapshot.ts

# Expected:
# 1. Initial tree shows no state snapshot
# 2. Final tree includes updated state in stateSnapshot
# 3. "✓ State snapshot reflected in tree debugger" message

# Cleanup
rm test-tree-debugger-snapshot.ts

# @Step Decorator Integration Test
# Verify that @Step with snapshotState triggers treeUpdated

# Create test: test-step-snapshot-treeupdated.ts
cat > test-step-snapshot-treeupdated.ts << 'EOF'
import { Workflow, WorkflowObserver, Step, ObservedState } from './src/index';

class StepWorkflow extends Workflow {
  @ObservedState()
  stepCount = 0;

  @Step({ snapshotState: true })
  async stepOne(): Promise<void> {
    this.stepCount = 1;
  }

  @Step({ snapshotState: true })
  async stepTwo(): Promise<void> {
    this.stepCount = 2;
  }

  async run(): Promise<void> {
    await this.stepOne();
    await this.stepTwo();
  }
}

const workflow = new StepWorkflow('StepTest');
const treeUpdatedCount = { value: 0 };

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => {
    if (event.type === 'treeUpdated') {
      treeUpdatedCount.value++;
    }
  },
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

workflow.addObserver(observer);
workflow.run();

console.log('treeUpdated events:', treeUpdatedCount.value);
// Expected: 2 (one for each step with snapshotState: true)
EOF

# Run the test
npx tsx test-step-snapshot-treeupdated.ts

# Expected output: treeUpdated events: 2

# Cleanup
rm test-step-snapshot-treeupdated.ts

# Performance check - ensure no significant performance degradation
npm test -- --perf  # If performance tests exist

# Expected: No significant performance impact from adding event emission
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint` or `npx eslint src/core/workflow.ts`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Manual testing successful: treeUpdated events emitted when snapshotState() called
- [ ] Integration verified: Tree debugger rebuilds on state snapshots
- [ ] @Step decorator integration: Steps with snapshotState trigger tree updates

### Feature Validation

- [ ] Success criteria met: treeUpdated event emitted after state snapshot
- [ ] Event payload correct: `{ type: 'treeUpdated', root: this.getRoot().node }`
- [ ] Observer callback triggered: onTreeChanged() called via emitEvent() infrastructure
- [ ] No breaking changes: Method signature unchanged, existing functionality preserved
- [ ] Event order maintained: stateSnapshot emitted before treeUpdated
- [ ] PRD compliance: Adds treeUpdated event emission for state structural changes

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches setStatus() event emission pattern)
- [ ] Event emission after all state updates (ensures observers see complete state)
- [ ] Comment added explaining purpose of treeUpdated emission
- [ ] No duplicate event emissions (one treeUpdated per snapshotState() call)
- [ ] Cycle detection respected (getRoot() may throw, expected behavior)
- [ ] Consistent with related work (P1.M2.T2.S1 setStatus() implementation)

### Documentation & Deployment

- [ ] Code is self-documenting with clear comment
- [ ] No new dependencies added (uses existing emitEvent() and getRoot())
- [ ] No environment variables or configuration changes
- [ ] Change is backward compatible (additive feature, no breaking changes)
- [ ] Ready for P1.M2.T2.S4 to add test coverage

---

## Anti-Patterns to Avoid

- ❌ **Don't emit treeUpdated BEFORE stateSnapshot** - Maintain event ordering: state-specific before structural
- ❌ **Don't call onTreeChanged() directly** - emitEvent() infrastructure handles observer notification
- ❌ **Don't replace stateSnapshot event with treeUpdated** - Both events serve different purposes
- ❌ **Don't emit treeUpdated BEFORE state is captured** - Observers must see the new state snapshot
- ❌ **Don't add try/catch around getRoot()** - Let cycle detection errors propagate (expected behavior)
- ❌ **Don't modify method signature** - Keep parameter (none) and return type (void) unchanged
- ❌ **Don't skip event emission for manual calls** - All snapshotState() calls should emit treeUpdated
- ❌ **Don't add duplicate event emissions** - One treeUpdated per snapshotState() call only
- ❌ **Don't forget the comment** - Add "// Emit treeUpdated event to trigger tree debugger rebuild" for clarity

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
1. ✅ **Single-line addition** - Add one line of code (plus comment) after line 241
2. ✅ **No new dependencies** - Uses existing emitEvent() and getRoot() methods
3. ✅ **Clear specification** - Exact code to add provided with full context
4. ✅ **Well-researched** - All patterns, gotchas, and integration points documented
5. ✅ **Existing infrastructure** - emitEvent() handles treeUpdated events correctly
6. ✅ **Testable** - Event emission can be verified through observer callbacks
7. ✅ **Low risk** - Additive change, no modifications to existing logic
8. ✅ **PRD-aligned** - Adds treeUpdated event emission for state structural changes
9. ✅ **Consistent with related work** - Follows same pattern as P1.M2.T2.S1 setStatus()
10. ✅ **Comprehensive validation** - Four levels of validation with specific commands

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement this feature successfully using only the PRP content and codebase access. The change is a single, well-documented line addition with comprehensive context about event system, observer pattern, state capture mechanism, and validation approach.

---

## Appendix: Quick Reference

### Files to Modify
- `src/core/workflow.ts` - Lines 223-242 (snapshotState method)

### Files to Reference
- `src/types/events.ts` - Event type definitions
- `src/types/observer.ts` - Observer interface
- `src/core/workflow.ts` - Lines 202-218 (emitEvent method)
- `src/core/workflow.ts` - Lines 247-251 (setStatus treeUpdated pattern)
- `src/core/workflow.ts` - Lines 145-160 (getRoot method)
- `src/__tests__/unit/workflow.test.ts` - Lines 241-271 (test pattern reference)

### Test Files
- `src/__tests__/unit/workflow.test.ts` - P1.M2.T2.S4 will add test here

### Related Documentation
- `plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md` - Issue #1 details
- `plan/bugfix/P1M2T2S1/PRP.md` - Related work (setStatus treeUpdated)
- `plan/bugfix/P1M2T2S2/PRP.md` - Related work (setStatus test)

### Validation Commands
```bash
npm test              # Run all tests
npx tsc --noEmit      # Type check
npm run lint          # Lint code (if configured)
```

---

## Related Work Items

- **P1.M2.T2.S1** (Complete): Emit treeUpdated event in setStatus() method - Same pattern, different method
- **P1.M2.T2.S2** (Complete): Write test for treeUpdated event emission on setStatus - Test pattern reference
- **P1.M2.T2.S4** (Pending): Write test for treeUpdated event emission on snapshotState - Next task

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-11
**Next Task**: P1.M2.T2.S4 - Write test for treeUpdated event emission on snapshotState
