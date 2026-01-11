# Product Requirement Prompt (PRP): Emit treeUpdated Event in setStatus() Method

**Work Item**: P1.M2.T2.S1
**Title**: Emit treeUpdated event in setStatus() method
**Type**: Bug Fix - Event System Enhancement
**Points**: 1
**Status**: Research Complete

---

## Goal

**Feature Goal**: Add `treeUpdated` event emission to the `setStatus()` method in `src/core/workflow.ts` to trigger tree observer updates when workflow status changes.

**Deliverable**: Modified `setStatus()` method that emits `treeUpdated` event after status update, enabling tree debugger to rebuild on status changes.

**Success Definition**:
1. `setStatus()` method emits `treeUpdated` event after `this.node.status = status` is set
2. Event emission follows existing pattern: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })`
3. Observers' `onTreeChanged()` callback is triggered via existing `emitEvent()` infrastructure
4. Tree debugger rebuilds tree structure when workflow status changes

## Why

- **PRD Compliance**: PRD Section 12.2 requires `treeUpdated` events for structural changes, and status changes are structural changes
- **Observer Pattern**: Current implementation handles `treeUpdated` events in `emitEvent()` but never emits them
- **Tree Debugger Functionality**: Tree debugger relies on `onTreeChanged()` callback to rebuild tree visualization
- **Consistency**: Other structural changes (child attachment, state snapshots) should emit tree updates, status changes should too
- **Impact**: Without this, tree debugger won't update when workflows transition between states (idle → running → completed/failed)

## What

### User-Visible Behavior

When a workflow's status changes via `setStatus()`, the tree debugger will automatically rebuild its tree representation to reflect the new status.

### Technical Requirements

**Location**: `src/core/workflow.ts`, lines 247-250 (current `setStatus()` method)

**Current Implementation**:
```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;
  this.node.status = status;
}
```

**Required Change**:
```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;
  this.node.status = status;
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Success Criteria**:
- [ ] `treeUpdated` event emitted after status update
- [ ] Event contains `root: WorkflowNode` from `this.getRoot().node`
- [ ] Existing `emitEvent()` infrastructure handles observer notification
- [ ] No breaking changes to method signature or existing functionality

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed?

✅ **YES** - This PRP provides:
- Exact file location and line numbers for modification
- Current implementation code with context
- Complete change specification with exact code to add
- Event type definitions and patterns
- Observer callback flow
- Test patterns for validation
- Related PRD requirements
- Existing similar implementations as reference

### Documentation & References

```yaml
MUST READ - Include these in your context window:

# PRD Requirements
- url: plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md
  why: Issue #1 confirms setStatus() at lines 224-227 doesn't emit treeUpdated, PRD Section 12.2 requires it
  section: Issue 1: Missing `treeUpdated` Event Emission (lines 27-114)
  critical: PRD explicitly defines treeUpdated as distinct event type for structural changes

# Event Type Definition
- file: src/types/events.ts
  why: treeUpdated event type definition - { type: 'treeUpdated'; root: WorkflowNode }
  pattern: Discriminated union event type with specific payload structure
  gotcha: Event defined but not actively emitted anywhere in codebase (research confirmed zero occurrences)

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

# Current setStatus Implementation
- file: src/core/workflow.ts
  why: Exact location and current implementation of setStatus() method
  section: Lines 247-250
  pattern: Simple setter that syncs status between workflow and node
  gotcha: No event emission currently, unlike snapshotState() which emits events

# getRoot() Method with Cycle Detection
- file: src/core/workflow.ts
  why: Will be called to get root node for event emission
  section: Lines 145-160
  pattern: Cycle detection using Set to prevent infinite loops in parent chain traversal
  gotcha: Throws Error if circular parent-child relationship detected

# Similar Event Emission Pattern (childAttached)
- file: src/core/workflow.ts
  why: Reference for event emission pattern in attachChild() method
  section: Lines 192-197
  pattern: this.emitEvent({ type: 'childAttached', parentId: this.id, child: child.node })
  gotcha: Note that childAttached also triggers onTreeChanged() via emitEvent() infrastructure

# State Snapshot Event Emission (for pattern reference)
- file: src/core/workflow.ts
  why: Shows event emission pattern in snapshotState() method
  section: Lines 223-242
  pattern: Captures state, stores in node, emits stateSnapshot event
  gotcha: snapshotState emits stateSnapshot event, not treeUpdated (another place treeUpdated should be added)
```

### Current Codebase Tree

```
/home/dustin/projects/groundswell/
├── src/
│   ├── core/                          # Core workflow engine
│   │   ├── workflow.ts                # ⭐ TARGET FILE - Contains setStatus() method
│   │   ├── workflow-context.ts        # WorkflowContext implementation
│   │   ├── logger.ts                  # Logging system
│   │   └── ...
│   ├── types/                         # TypeScript type definitions
│   │   ├── events.ts                  # ⭐ Event type definitions (treeUpdated)
│   │   ├── workflow.ts                # Workflow type definitions
│   │   ├── observer.ts                # ⭐ Observer interface (onTreeChanged)
│   │   └── ...
│   ├── __tests__/                     # Test directory
│   │   ├── unit/
│   │   │   ├── workflow.test.ts       # ⭐ Workflow unit tests
│   │   │   └── ...
│   │   └── integration/
│   └── ...
├── plan/
│   └── bugfix/
│       └── P1M2T2S1/                  # ⭐ THIS PRP LOCATION
└── examples/
```

### Desired Codebase Tree with Changes

```
# No new files - this is a modification to existing code

Modified File:
├── src/core/workflow.ts               # setStatus() method updated (lines 247-250)
    ├── Change: Add this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node }); after line 249
    └── Location: After this.node.status = status;
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: getRoot() implements cycle detection - throws Error on circular parent relationships
// Location: src/core/workflow.ts, lines 145-160
// PATTERN: Uses Set<Workflow>() to track visited workflows during parent chain traversal
// GOTCHA: If someone manually sets workflow.parent to create a cycle, getRoot() will throw

// CRITICAL: emitEvent() automatically handles observer notification
// Location: src/core/workflow.ts, lines 202-218
// PATTERN: Pushes event to this.node.events array, then notifies all root observers
// GOTCHA: Lines 211-213 - treeUpdated events automatically trigger onTreeChanged() callback
// No need to manually call onTreeChanged() - emitEvent() infrastructure handles it

// CRITICAL: WorkflowStatus is a string union type, not an enum
// Location: src/types/workflow.ts
// VALUES: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
// GOTCHA: No runtime validation of status values - TypeScript ensures compile-time safety

// CRITICAL: Observer notification goes to ROOT workflow observers only
// Location: src/core/workflow.ts, line 205 - getRootObservers()
// PATTERN: Events bubble up to root, observers attached to root receive all descendant events
// GOTCHA: Observers attached to non-root workflows won't receive events

// CRITICAL: treeUpdated event defined but NEVER emitted in current codebase
// VERIFICATION: Searched entire codebase for "emitEvent({ type: 'treeUpdated'" - zero results
// IMPACT: This PRP implements the FIRST treeUpdated event emission in the codebase
// REFERENCE: plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md, Issue #1, line 67
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - this uses existing types:

```typescript
// From src/types/events.ts - Already defined, no changes needed
type WorkflowEvent =
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  // ... other event types

// From src/types/workflow.ts - Already defined, no changes needed
type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

// From src/types/observer.ts - Already defined, no changes needed
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;  // Triggered by treeUpdated events
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/workflow.ts - Update setStatus() method
  - LOCATION: Lines 247-250 in src/core/workflow.ts
  - FIND: public setStatus(status: WorkflowStatus): void method
  - CURRENT CODE:
    public setStatus(status: WorkflowStatus): void {
      this.status = status;
      this.node.status = status;
    }
  - ADD: After line 249 (after this.node.status = status;)
  - CODE TO ADD:
    this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  - RESULTING CODE:
    public setStatus(status: WorkflowStatus): void {
      this.status = status;
      this.node.status = status;
      this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
    }
  - DEPENDENCIES: None (uses existing emitEvent() and getRoot() methods)
  - VERIFICATION: Event emission happens AFTER status is set (ensures observers see updated state)

Task 2: VERIFY Event Type Import
  - CHECK: WorkflowEvent type is imported/available
  - LOCATION: Top of src/core/workflow.ts file
  - EXPECTED: import { WorkflowEvent } from '../types/events.js' or similar
  - GOTCHA: Type imports are typically at top of file, but may be imported via types/index.ts
  - ACTION: If not present, add appropriate import statement (though likely already imported for emitEvent() method)

Task 3: RUN Validation Commands
  - EXECUTE: npm run lint or equivalent linting command
  - EXECUTE: npm test to verify no existing tests break
  - EXPECTED: All tests should pass (adding event emission should not break existing functionality)
  - VERIFICATION: Check that emitEvent() method exists and is accessible
```

### Implementation Patterns & Key Details

```typescript
// Pattern: Event Emission in Setter Methods
// The setStatus() method should follow this pattern:

public setStatus(status: WorkflowStatus): void {
  // 1. Update internal state
  this.status = status;

  // 2. Update node representation (sync with public node)
  this.node.status = status;

  // 3. Emit treeUpdated event to notify observers
  // PATTERN: Use emitEvent() which handles observer notification automatically
  // PATTERN: Pass root node from getRoot().node for complete tree context
  // CRITICAL: Event emission AFTER state update ensures observers see new status
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}

// GOTCHA: Don't call onTreeChanged() directly - emitEvent() handles it
// Location: src/core/workflow.ts, lines 211-213
// The emitEvent() method checks if event.type === 'treeUpdated' and calls obs.onTreeChanged()

// GOTCHA: getRoot() includes cycle detection - may throw Error
// Location: src/core/workflow.ts, lines 145-160
// If circular parent-child relationship exists, getRoot() throws Error
// This is EXPECTED behavior - prevents infinite loops

// PATTERN: Event emission follows discriminated union pattern
// Event type is 'treeUpdated', payload is { root: WorkflowNode }
// TypeScript will type-check the event structure

// REFERENCE: Similar pattern in attachChild() method (lines 192-197)
// this.emitEvent({
//   type: 'childAttached',
//   parentId: this.id,
//   child: child.node,
// });
// Note: childAttached also triggers onTreeChanged() via emitEvent() infrastructure
```

### Integration Points

```yaml
EXISTING_CODE:
  - file: src/core/workflow.ts
    method: emitEvent()
    usage: Called by setStatus() to dispatch treeUpdated event
    behavior: Automatically notifies all root observers via getRootObservers()
    side_effects: Pushes event to this.node.events array

  - file: src/core/workflow.ts
    method: getRoot()
    usage: Called to get root node for event payload
    behavior: Traverses parent chain with cycle detection
    side_effects: May throw Error if circular relationship detected

  - file: src/core/workflow.ts
    property: this.node.status
    usage: Synchronized with this.status in setStatus()
    behavior: Public node representation reflects workflow state
    side_effects: None (simple property assignment)

CALLERS:
  - file: src/core/workflow.ts
    method: runFunctional()
    lines: 287, 298, 306
    usage: Sets status to 'running', 'completed', 'failed'
    impact: Will now emit treeUpdated events during workflow execution

  - file: examples/, tests/
    usage: Extensive usage of setStatus() throughout codebase
    impact: All status changes will now trigger tree updates
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making the change - fix before proceeding
npm run lint              # Lint TypeScript code
# OR
npx eslint src/core/workflow.ts  # Lint specific file

# Expected: Zero linting errors. Event emission syntax is valid TypeScript.
# If errors exist, READ output and fix before proceeding.

# Type checking
npm run type-check        # If project has type-check script
# OR
npx tsc --noEmit          # Type check without emitting files

# Expected: Zero type errors. Event payload matches WorkflowEvent type definition.
# The emitEvent() method accepts WorkflowEvent, and { type: 'treeUpdated', root: this.getRoot().node } is valid.

# Code formatting (if using Prettier)
npm run format            # Format code according to project style
# OR
npx prettier --write src/core/workflow.ts

# Expected: Code is formatted consistently with project style.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing workflow tests to ensure no regression
npm test -- workflow.test.ts

# Expected: All existing tests should pass.
# Adding event emission should not break existing functionality.

# Run specific test related to status setting (if exists)
npm test -- -t "status"

# Expected: Tests related to status setting should still pass.
# The new event emission is additive, not modifying behavior.

# Run full test suite
npm test

# Expected: All tests pass (133 tests as of 2026-01-10).
# No tests specifically verify treeUpdated emission yet (that's Task P1.M2.T2.S2).

# Coverage validation (if coverage tools available)
npm run test:coverage

# Expected: Coverage for setStatus() method should exist or be added in next task.
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual verification - Create a test script to verify treeUpdated emission

# Create test file: test-setstatus-treeupdated.ts
cat > test-setstatus-treeupdated.ts << 'EOF'
import { Workflow, WorkflowObserver } from './src/index';

class TestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('running');
    this.setStatus('completed');
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

// Check for treeUpdated events
const treeUpdatedEvents = events.filter(e => e.type === 'treeUpdated');
console.log(`treeUpdated events emitted: ${treeUpdatedEvents.length}`);
// Expected: 2 (one for 'running', one for 'completed')
EOF

# Run the test
npx tsx test-setstatus-treeupdated.ts

# Expected output:
# Tree changed!
# Tree changed!
# treeUpdated events emitted: 2

# Cleanup
rm test-setstatus-treeupdated.ts

# Verify observers receive onTreeChanged callback
# The emitEvent() infrastructure should automatically call onTreeChanged()
# when treeUpdated event is emitted (see lines 211-213 in workflow.ts)
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Tree Debugger Integration Test
# Verify that tree debugger rebuilds when status changes

# Create integration test: test-tree-debugger-status.ts
cat > test-tree-debugger-status.ts << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './src/index';

class StatusChangeWorkflow extends Workflow {
  async run(): Promise<void> {
    this.logger.info('Starting workflow');
    this.setStatus('running');

    setTimeout(() => {
      this.logger.info('Completing workflow');
      this.setStatus('completed');
    }, 100);
  }
}

const workflow = new StatusChangeWorkflow('StatusTest');
const debugger = new WorkflowTreeDebugger(workflow);

console.log('Initial tree:');
console.log(debugger.toTreeString());

await workflow.run();

// Wait for async completion
await new Promise(resolve => setTimeout(resolve, 200));

console.log('\nFinal tree:');
console.log(debugger.toTreeString());

// Verify status is reflected in tree output
const treeOutput = debugger.toTreeString();
if (treeOutput.includes('completed')) {
  console.log('✓ Status change reflected in tree debugger');
} else {
  console.log('✗ Status change NOT reflected in tree debugger');
}
EOF

# Run the integration test
npx tsx test-tree-debugger-status.ts

# Expected:
# 1. Initial tree shows status as 'idle' or 'running'
# 2. Final tree shows status as 'completed'
# 3. "✓ Status change reflected in tree debugger" message

# Cleanup
rm test-tree-debugger-status.ts

# Verify no performance degradation
# Event emission should be fast and not cause noticeable lag
npm test -- --perf  # If performance tests exist

# Expected: No significant performance impact from adding event emission
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test` (133/133 tests passing)
- [ ] No linting errors: `npm run lint` exits with code 0
- [ ] No type errors: `npm run type-check` or `npx tsc --noEmit` succeeds
- [ ] Manual testing successful: treeUpdated events emitted when setStatus() called
- [ ] Integration verified: Tree debugger rebuilds on status changes

### Feature Validation

- [ ] Success criteria met: treeUpdated event emitted after status update
- [ ] Event payload correct: `{ type: 'treeUpdated', root: this.getRoot().node }`
- [ ] Observer callback triggered: onTreeChanged() called via emitEvent() infrastructure
- [ ] No breaking changes: Method signature unchanged, existing functionality preserved
- [ ] PRD compliance: Restores treeUpdated event emission as specified in PRD Section 12.2

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches attachChild() event emission pattern)
- [ ] Event emission after state update (ensures observers see new status)
- [ ] No duplicate event emissions (each setStatus() call emits exactly once)
- [ ] Cycle detection respected (getRoot() may throw, expected behavior)
- [ ] Error handling not needed (emitEvent() has try/catch for observer errors)

### Documentation & Deployment

- [ ] Code is self-documenting with clear intent (event emission is explicit)
- [ ] No new dependencies added (uses existing emitEvent() and getRoot())
- [ ] No environment variables or configuration changes
- [ ] Change is backward compatible (additive feature, no breaking changes)

---

## Anti-Patterns to Avoid

- ❌ **Don't emit event BEFORE status update** - Observers must see the new status, not the old one
- ❌ **Don't call onTreeChanged() directly** - emitEvent() infrastructure handles observer notification
- ❌ **Don't add duplicate event emissions** - One treeUpdated per setStatus() call only
- ❌ **Don't add try/catch around getRoot()** - Let cycle detection errors propagate (expected behavior)
- ❌ **Don't modify method signature** - Keep parameter and return type unchanged
- ❌ **Don't add validation logic** - WorkflowStatus type system ensures compile-time safety
- ❌ **Don't emit other event types** - Only emit treeUpdated, not stateSnapshot or other events
- ❌ **Don't skip event emission for certain statuses** - All status changes should emit treeUpdated

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
1. ✅ **Single-line change** - Add one line of code after line 249
2. ✅ **No new dependencies** - Uses existing emitEvent() and getRoot() methods
3. ✅ **Clear specification** - Exact code to add provided with context
4. ✅ **Well-researched** - All patterns, gotchas, and integration points documented
5. ✅ **Existing infrastructure** - emitEvent() handles treeUpdated events correctly
6. ✅ **Testable** - Event emission can be verified through observer callbacks
7. ✅ **Low risk** - Additive change, no modifications to existing logic
8. ✅ **PRD-aligned** - Restores compliance with explicit PRD requirement

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement this feature successfully using only the PRP content and codebase access. The change is a single, well-documented line addition with comprehensive context about event system, observer pattern, and validation approach.

---

## Appendix: Quick Reference

### Files to Modify
- `src/core/workflow.ts` - Lines 247-250 (setStatus method)

### Files to Reference
- `src/types/events.ts` - Event type definitions
- `src/types/observer.ts` - Observer interface
- `src/core/workflow.ts` - Lines 202-218 (emitEvent method)
- `src/core/workflow.ts` - Lines 145-160 (getRoot method)
- `src/core/workflow.ts` - Lines 192-197 (attachChild event pattern)

### Test Files
- `src/__tests__/unit/workflow.test.ts` - Existing workflow tests
- Task P1.M2.T2.S2 will add specific tests for this change

### Related Documentation
- `plan/docs/bugfix/ANALYSIS_PRD_VS_IMPLEMENTATION.md` - Issue #1 details

### Validation Commands
```bash
npm test              # Run all tests
npm run lint          # Lint code
npm run type-check    # Type check
```

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-11
**Next Task**: P1.M2.T2.S2 - Write test for treeUpdated event emission on setStatus
