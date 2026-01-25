# PRP: Implement Replay Logic for Node State Events

**PRP ID**: P2.M1.T1.S3
**Work Item**: Implement replay logic for node state events
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Implement the replay logic for node state events (`stateSnapshot`, `stepStart`, `stepEnd`, `error`, `taskStart`, `taskEnd`) in the `WorkflowEventReplayer` class, enabling time-travel debugging with complete reconstruction of node state, errors, and execution timing.

**Deliverable**: Updated `src/debugger/event-replayer.ts` containing:
1. Implemented `handleStateSnapshot()` method for state update
2. Implemented `handleErrorEvent()` method for error accumulation
3. Implemented `handleStepStart()` method for step tracking
4. Implemented `handleStepEnd()` method for step duration tracking
5. Implemented `handleTaskStart()` method for task tracking
6. Implemented `handleTaskEnd()` method for task completion tracking
7. Updated `replay()` method switch statement to dispatch state events
8. Comprehensive JSDoc documentation for all methods
9. Unit tests for all state event handlers

**Success Definition**:
- `handleStateSnapshot()` updates `node.stateSnapshot` with event data
- `handleErrorEvent()` appends error to `node.events[]` array
- `handleStepStart()` and `handleStepEnd()` append events to `node.events[]`
- `handleTaskStart()` and `handleTaskEnd()` append events to `node.events[]`
- Missing nodes handled gracefully (log warning, continue)
- Null `stateSnapshot` values handled correctly
- Multiple errors accumulate correctly (not overwritten)
- `replay()` method dispatches all state event types
- Code compiles without TypeScript errors
- All unit tests pass

---

## User Persona (if applicable)

**Target User**: Development team building time-travel debugging capabilities for workflow observability

**Use Case**: Developers need to replay past workflow executions to debug issues, understand failure modes, and reconstruct complete node state (snapshots, errors, timing) at arbitrary points in event history

**User Journey**:
1. Developer observes a workflow execution failure in production
2. Developer retrieves the event stream from the failed workflow
3. Developer passes events to `WorkflowEventReplayer.replay()` to reconstruct the workflow tree
4. Developer inspects reconstructed tree with full state, errors, and timing information
5. Developer uses state snapshots to understand exact node state at failure time
6. Developer uses error events to trace failure context

**Pain Points Addressed**:
- Cannot see node state at past execution points
- Cannot debug errors without full context (state + logs)
- Cannot understand timing/performance issues
- Cannot trace execution flow through steps and tasks

---

## Why

**Business Value and User Impact**:
- **Complete State Reconstruction**: See exact node state at any point in execution
- **Error Debugging**: Full error context with state snapshots and logs
- **Performance Analysis**: Step and task timing information preserved
- **Offline Debugging**: Reproduce past failures with full context

**Integration with Existing Features**:
- **Extends**: `WorkflowEventReplayer` - adds state event handling to structural events from P2.M1.T1.S2
- **Leverages**: `WorkflowEvent` types - uses state events (stateSnapshot, error, step*, task*)
- **Follows**: Map-based node tracking pattern from `WorkflowTreeDebugger`
- **Reuses**: Event emission patterns from `Workflow.snapshotState()` and error handling

**Problems This Solves**:
- P2.M1.T1.S2 implemented structural events but skipped state events (throw "Not implemented")
- No way to see node state during replay
- Errors not preserved in reconstructed tree
- Step/task timing information lost during replay

---

## What

**User-Visible Behavior**:
After implementation, developers will be able to:
```typescript
import { WorkflowEventReplayer } from 'groundswell';

// Reconstruct workflow tree with full state
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(eventStream);

// Inspect state snapshots
console.log(tree.children[0].stateSnapshot);  // { count: 42, status: 'running' }

// Inspect errors
const errorEvents = tree.children[0].events.filter(e => e.type === 'error');
console.log(errorEvents[0].error.message);  // 'API call failed'

// Inspect step timing
const stepEndEvents = tree.children[0].events.filter(e => e.type === 'stepEnd');
console.log(stepEndEvents[0].duration);  // 1500 (milliseconds)
```

**Technical Requirements**:
1. **State Snapshot Handling**: Update `node.stateSnapshot` field with event data
2. **Error Accumulation**: Append error events to `node.events[]` array
3. **Event Tracking**: Append step/task events to `node.events[]` array
4. **Graceful Degradation**: Log warning for missing nodes, continue processing
5. **Null Handling**: Handle null `stateSnapshot` values correctly
6. **Event Dispatch**: Update `replay()` switch to handle all state event types

**Event Handlers to Implement**:

| Event Type | Handler Method | Action |
|------------|----------------|--------|
| `stateSnapshot` | `handleStateSnapshot()` | Update node.stateSnapshot field |
| `error` | `handleErrorEvent()` | Append error event to node.events[] |
| `stepStart` | `handleStepStart()` | Append event to node.events[] |
| `stepEnd` | `handleStepEnd()` | Append event to node.events[] |
| `taskStart` | `handleTaskStart()` | Append event to node.events[] |
| `taskEnd` | `handleTaskEnd()` | Append event to node.events[] |

### Success Criteria

- [ ] `handleStateSnapshot()` method implemented and updates node state
- [ ] `handleErrorEvent()` method implemented and accumulates errors
- [ ] `handleStepStart()` method implemented and tracks step starts
- [ ] `handleStepEnd()` method implemented and tracks step ends with duration
- [ ] `handleTaskStart()` method implemented and tracks task starts
- [ ] `handleTaskEnd()` method implemented and tracks task ends
- [ ] `replay()` method updated to dispatch all state event types
- [ ] Missing nodes handled gracefully (log warning, continue)
- [ ] Null stateSnapshot handled correctly
- [ ] Multiple errors accumulate correctly
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact implementation patterns from the codebase, specific event type structures, handling strategies for null/missing nodes, validation requirements, and comprehensive test patterns. An implementer unfamiliar with the codebase can implement the state replay logic using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P2M1T1S2/PRP.md
  why: Defines the structural event implementation - assumes tree building works
  critical: handleChildAttached, handleChildDetached, handleTreeUpdated are implemented
  critical: nodeMap is populated with all nodes before state events are processed
  critical: buildNodeMap and removeSubtreeNodes helpers are available

# Previous Interface Definition (CONTRACT)
- file: plan/002_6761e4b84fd1/P2M1T1S1/PRP.md
  why: Defines the WorkflowEventReplayer class structure
  critical: handleStateSnapshot and handleErrorEvent stubs exist (lines 312-343)
  critical: replay() method switch statement exists (lines 92-115)
  critical: nodeMap: Map<string, WorkflowNode> for O(1) lookups

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P2M1T1S3/research/node-state-patterns.md
  why: Complete analysis of how state events work in current codebase
  section: Section 1 (StateSnapshot Event Patterns), Section 2 (Error Event Patterns), Section 7 (Gotchas)
  critical: stateSnapshot event contains full node - extract only event.node.stateSnapshot
  critical: No dedicated errors[] field - use node.events[] array
  critical: Handle null stateSnapshot values
  critical: Log warning for missing nodes, don't throw

- docfile: plan/002_6761e4b84fd1/P2M1T1S3/research/state-replay-best-practices.md
  why: Best practices for event replay, validation strategies, testing patterns
  section: Section 6 (Validation Strategies), Section 8 (Error Handling), Section 9 (Testing)
  critical: Try-catch per event for error isolation
  critical: Log warning and continue for missing nodes
  critical: Last write wins for stateSnapshot

- docfile: plan/002_6761e4b84fd1/P2M1T1S3/research/event-driven-state-patterns.md
  why: Reducer patterns, state accumulation strategies, timing tracking
  section: Section 2 (State Accumulation Patterns), Section 3 (Timing Tracking)
  critical: State snapshots use last-write-wins semantics
  critical: Errors accumulate (don't overwrite)
  critical: Timing info is in event.duration field

# Core Source Files (IMPLEMENTATION PATTERNS)
- file: src/debugger/event-replayer.ts
  why: File to modify - contains stub implementations to replace
  section: Lines 92-115 (replay switch statement), lines 312-343 (handler stubs)
  critical: Replace "throw new Error('Not implemented')" with actual implementation
  critical: Add state event cases to replay() switch statement

- file: src/core/workflow.ts
  why: Reference implementation for state snapshot emission
  section: Lines 434-456 (snapshotState method), lines 520-536 (error emission)
  pattern: getObservedState(this) extracts state; emitEvent includes full node

- file: src/types/events.ts
  why: Complete WorkflowEvent discriminated union with state event types
  section: Lines 12-17 (stateSnapshot, stepStart, stepEnd, error, taskStart, taskEnd)
  critical: Event structure - which events have node.id, which have duration

# Type Definitions
- file: src/types/workflow.ts
  why: WorkflowNode interface structure
  section: Lines 20-37 (WorkflowNode interface)
  critical: stateSnapshot field can be null; events[] field for accumulation

- file: src/types/snapshot.ts
  why: SerializedWorkflowState type definition
  section: Lines 1-4 (SerializedWorkflowState type)
  critical: Record<string, unknown> - simple key-value structure

- file: src/types/error.ts
  why: WorkflowError interface structure
  section: Lines 7-20 (WorkflowError interface)
  critical: message, original, workflowId, stack, state, logs fields

# Test Helpers (for validation)
- file: src/__tests__/helpers/tree-verification.ts
  why: Reusable verification functions for tree invariants
  section: All helper functions
  pattern: Helper functions throw descriptive errors if invariants violated

# Test Files (for reference patterns)
- file: src/__tests__/unit/tree-debugger.test.ts
  why: Reference test patterns for event handling
  pattern: Event capture with observer; verify specific events occurred
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── debugger/
│   │   ├── tree-debugger.ts           # EXISTING - Reference patterns
│   │   └── event-replayer.ts          # MODIFY - Add state event implementations
│   ├── types/
│   │   ├── events.ts                  # REFERENCE - WorkflowEvent types
│   │   ├── workflow.ts                # REFERENCE - WorkflowNode interface
│   │   ├── snapshot.ts                # REFERENCE - SerializedWorkflowState
│   │   └── error.ts                   # REFERENCE - WorkflowError interface
│   ├── core/
│   │   └── workflow.ts                # REFERENCE - State snapshot emission patterns
│   └── __tests__/
│       ├── unit/
│       │   └── event-replayer.test.ts # MODIFY/EXTEND - Add state event tests
│       └── helpers/
│           └── tree-verification.ts   # REFERENCE - Verification helpers
└── plan/002_6761e4b84fd1/
    ├── P2M1T1S1/
    │   └── PRP.md                     # REFERENCE - Interface contract
    ├── P2M1T1S2/
    │   └── PRP.md                     # REFERENCE - Structural events contract
    └── P2M1T1S3/
        ├── PRP.md                     # THIS FILE
        └── research/
            ├── node-state-patterns.md          # Created - State event patterns
            ├── state-replay-best-practices.md  # Created - Best practices
            └── event-driven-state-patterns.md  # Created - Reducer patterns
```

### Desired Codebase Tree

```bash
# No new files - implementation goes into existing event-replayer.ts
# All handler methods get full implementations (replacing throw new Error stubs)
# replay() switch statement updated to dispatch state events
# Tests added to existing event-replayer.test.ts
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: stateSnapshot Event Contains Full Node, Not Just Snapshot
// - Event structure: { type: 'stateSnapshot', node: WorkflowNode }
// - node.stateSnapshot contains the actual snapshot data
// - Gotcha: Don't use entire event.node (causes circular reference issues)
// - Pattern: Extract only event.node.stateSnapshot field
// - Reference: src/core/workflow.ts:434-456

// CRITICAL: No Dedicated errors[] Field on WorkflowNode
// - WorkflowNode interface does NOT have an errors[] field
// - All errors are stored in node.events[] array
// - Pattern: node.events.push(event) for error events
// - Gotcha: Don't try to access node.errors (doesn't exist)
// - Reference: research/node-state-patterns.md Section 2

// CRITICAL: stateSnapshot Can Be Null
// - Not all nodes have state snapshots
// - stateSnapshot field can be null (valid state)
// - Pattern: Check for null before accessing properties
// - Gotcha: Don't throw error if stateSnapshot is null
// - Reference: src/types/workflow.ts:36

// CRITICAL: Step/Task Events May Reference Non-Existent Nodes
// - stepStart/stepEnd events reference step nodes
// - Step nodes are created via @Step decorator
// - If step node doesn't exist yet in nodeMap, childAttached will add it later
// - Pattern: Check if node exists, log warning if not, continue
// - Gotcha: Don't throw error for missing step nodes
// - Reference: research/node-state-patterns.md Section 7.3

// CRITICAL: Multiple stateSnapshot Events = Last Write Wins
// - Node can have multiple stateSnapshot events
// - Each new snapshot overwrites the previous one
// - Pattern: node.stateSnapshot = event.node.stateSnapshot (direct assignment)
// - Gotcha: Don't merge snapshots, just overwrite
// - Reference: research/state-replay-best-practices.md Section 5.1

// CRITICAL: Errors Accumulate, Not Overwrite
// - Multiple errors can occur on same node
// - All errors should be preserved in events[] array
// - Pattern: node.events.push(event) for each error
// - Gotcha: Don't overwrite previous errors
// - Reference: research/node-state-patterns.md Section 2

// CRITICAL: Duration Only in stepEnd, Not stepStart
// - stepStart event: { type: 'stepStart', node, step }
// - stepEnd event: { type: 'stepEnd', node, step, duration }
// - Pattern: Extract duration only from stepEnd events
// - Gotcha: Don't try to access event.duration in stepStart handler
// - Reference: src/types/events.ts:13-14

// CRITICAL: taskEnd Has No Duration Field
// - taskStart: { type: 'taskStart', node, task }
// - taskEnd: { type: 'taskEnd', node, task }  // NO duration!
// - Pattern: task events are metadata only, no timing info
// - Gotcha: Don't expect duration in taskEnd events
// - Reference: src/types/events.ts:16-17

// CRITICAL: Graceful Degradation for Missing Nodes
// - State events may arrive before structural events (out of order)
// - Or event stream may be incomplete/corrupted
// - Pattern: Check nodeMap.get(), log warning if not found, return early
// - Gotcha: Don't throw error for missing nodes during replay
// - Reference: research/state-replay-best-practices.md Section 4.1

// CRITICAL: Error Isolation During Replay
// - Catch errors per-event, don't let one event fail entire replay
// - Pattern: try-catch around each event handler call
// - Gotcha: Don't let one bad state event fail entire replay
// - Reference: Already implemented in replay() method lines 111-114

// CRITICAL: Events Array is Append-Only
// - node.events[] only grows, never shrinks
// - During replay, we accumulate events in the array
// - Pattern: node.events.push(event) to add events
// - Gotcha: Don't clear or filter events array during replay
// - Reference: research/node-state-patterns.md Section 5

// CRITICAL: stateSnapshot Also Emits treeUpdated
// - When snapshotState() is called, it emits BOTH stateSnapshot AND treeUpdated
// - This triggers tree debugger rebuild
// - During replay, handle both events independently
// - Pattern: treeUpdated rebuilds nodeMap, stateSnapshot updates field
// - Gotcha: Don't skip treeUpdated events after stateSnapshot
// - Reference: src/core/workflow.ts:455-456

// CRITICAL: Error Event Contains Rich Context
// - error.state: SerializedWorkflowState (state at error time)
// - error.logs: LogEntry[] (logs at error time)
// - error.stack?: string (stack trace if available)
// - Pattern: Preserve all error context in the event
// - Gotcha: Don't strip error information during replay
// - Reference: src/types/error.ts:7-20

// CRITICAL: Use Extract<WorkflowEvent, { type: '...' }>> for Type Safety
// - TypeScript discriminated union pattern
// - Pattern: private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>)
// - Gotcha: Don't use bare WorkflowEvent type (loses type narrowing)
// - Reference: src/types/events.ts:8 (discriminated union definition)
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - uses existing types from codebase:

```typescript
// INPUT TYPES (from src/types/events.ts)
type StateSnapshotEvent = { type: 'stateSnapshot'; node: WorkflowNode };
type ErrorEvent = { type: 'error'; node: WorkflowNode; error: WorkflowError };
type StepStartEvent = { type: 'stepStart'; node: WorkflowNode; step: string };
type StepEndEvent = { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number };
type TaskStartEvent = { type: 'taskStart'; node: WorkflowNode; task: string };
type TaskEndEvent = { type: 'taskEnd'; node: WorkflowNode; task: string };

// OUTPUT TYPE (from src/types/workflow.ts)
interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];        // Where errors/step/task events are accumulated
  stateSnapshot: SerializedWorkflowState | null;  // Where state snapshot is stored
}

// INTERNAL STATE (from P2.M1.T1.S1)
class WorkflowEventReplayer {
  private nodeMap: Map<string, WorkflowNode> = new Map();  // O(1) node lookups
  private root: WorkflowNode | null = null;                 // Root reference
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: IMPLEMENT handleStateSnapshot() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>): void
  - IMPLEMENTATION: Update node's stateSnapshot field
  - PATTERN: Follow reducer pattern (state, event) => state
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: console.warn() and return (graceful degradation)
    * Extract event.node.stateSnapshot (not the entire node!)
    * Assign to node.stateSnapshot (direct assignment, last write wins)
  - NULL HANDLING: Allow null stateSnapshot values (valid state)
  - PLACEMENT: Replace existing stub at lines 312-315
  - DEPENDENCIES: None (nodeMap already populated by structural events)

Task 2: IMPLEMENT handleErrorEvent() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleErrorEvent(event: Extract<WorkflowEvent, { type: 'error' }>): void
  - IMPLEMENTATION: Append error event to node's events array
  - PATTERN: Accumulation pattern (errors don't overwrite)
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: console.warn() and return (graceful degradation)
    * Append event to node.events array: node.events.push(event)
  - NULL HANDLING: Error object should always exist (validate event.error exists)
  - PLACEMENT: Replace existing stub at lines 340-343
  - DEPENDENCIES: None

Task 3: IMPLEMENT handleStepStart() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleStepStart(event: Extract<WorkflowEvent, { type: 'stepStart' }>): void
  - IMPLEMENTATION: Append stepStart event to node's events array
  - PATTERN: Event tracking pattern (metadata only)
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: return silently (step node may not exist yet, childAttached will add it)
    * Append event to node.events array: node.events.push(event)
  - PLACEMENT: Add new method after handleErrorEvent()
  - DEPENDENCIES: None

Task 4: IMPLEMENT handleStepEnd() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleStepEnd(event: Extract<WorkflowEvent, { type: 'stepEnd' }>): void
  - IMPLEMENTATION: Append stepEnd event to node's events array
  - PATTERN: Event tracking pattern (metadata only, includes duration)
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: return silently (step node may not exist yet)
    * Append event to node.events array: node.events.push(event)
    * Duration info is in event.duration field
  - PLACEMENT: Add new method after handleStepStart()
  - DEPENDENCIES: None

Task 5: IMPLEMENT handleTaskStart() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleTaskStart(event: Extract<WorkflowEvent, { type: 'taskStart' }>): void
  - IMPLEMENTATION: Append taskStart event to node's events array
  - PATTERN: Event tracking pattern (metadata only)
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: console.warn() and return (graceful degradation)
    * Append event to node.events array: node.events.push(event)
  - PLACEMENT: Add new method after handleStepEnd()
  - DEPENDENCIES: None

Task 6: IMPLEMENT handleTaskEnd() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleTaskEnd(event: Extract<WorkflowEvent, { type: 'taskEnd' }>): void
  - IMPLEMENTATION: Append taskEnd event to node's events array
  - PATTERN: Event tracking pattern (metadata only, no duration)
  - LOGIC:
    * Get node from nodeMap via event.node.id
    * If not found: console.warn() and return (graceful degradation)
    * Append event to node.events array: node.events.push(event)
    * Note: No duration field in taskEnd event
  - PLACEMENT: Add new method after handleTaskStart()
  - DEPENDENCIES: None

Task 7: UPDATE replay() method switch statement
  - FILE: src/debugger/event-replayer.ts
  - METHOD: replay(events: WorkflowEvent[]): WorkflowNode
  - IMPLEMENTATION: Add state event cases to switch statement
  - PATTERN: Follow existing pattern for structural events
  - LOGIC:
    * Add case 'stateSnapshot': call handleStateSnapshot(event)
    * Add case 'error': call handleErrorEvent(event)
    * Add case 'stepStart': call handleStepStart(event)
    * Add case 'stepEnd': call handleStepEnd(event)
    * Add case 'taskStart': call handleTaskStart(event)
    * Add case 'taskEnd': call handleTaskEnd(event)
  - PLACEMENT: Add cases after 'treeUpdated' case, before default
  - PRESERVE: Existing structural event cases and error handling

Task 8: UPDATE JSDoc documentation
  - Add/update JSDoc for all implemented methods
  - Include @param, @returns (if applicable), @throws tags
  - Include usage examples in @example tags
  - Document invariants maintained
  - Document null handling behavior
  - PATTERN: Follow P2.M1.T1.S1 PRP JSDoc style

Task 9: CREATE unit tests for state events
  - FILE: src/__tests__/unit/event-replayer-state.test.ts (NEW FILE)
  - TEST SUITES:
    * describe('handleStateSnapshot', () => { ... })
    * describe('handleErrorEvent', () => { ... })
    * describe('handleStepStart', () => { ... })
    * describe('handleStepEnd', () => { ... })
    * describe('handleTaskStart', () => { ... })
    * describe('handleTaskEnd', () => { ... })
    * describe('replay() with state events', () => { ... })
  - TEST CASES:
    * should update node.stateSnapshot with event data
    * should overwrite stateSnapshot with latest value (last write wins)
    * should handle null stateSnapshot correctly
    * should log warning for missing node in stateSnapshot
    * should append error to node.events array
    * should accumulate multiple errors (not overwrite)
    * should log warning for missing node in error event
    * should append stepStart event to node.events array
    * should append stepEnd event with duration to node.events array
    * should handle missing step node gracefully
    * should append taskStart event to node.events array
    * should append taskEnd event to node.events array
    * should log warning for missing node in task events
    * should replay complete event stream with structural and state events
  - PATTERN: Follow research/state-replay-best-practices.md Section 9

Task 10: VERIFY TypeScript compilation
  - RUN: npm run build
  - CHECK: No compilation errors
  - VERIFY: dist/debugger/event-replayer.js is created
  - VERIFY: dist/index.js exports WorkflowEventReplayer

Task 11: VERIFY all tests pass
  - RUN: npm test
  - CHECK: All new tests pass
  - CHECK: No existing tests broken
```

### Implementation Patterns & Key Details

```typescript
/**
 * FILE: src/debugger/event-replayer.ts
 *
 * PATTERN: Follow existing event handling patterns from P2.M1.T1.S2
 */

// Pattern 1: handleStateSnapshot() - Direct field assignment
/**
 * Handle stateSnapshot event - update node's state snapshot.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Extract event.node.stateSnapshot (not the entire node!)
 * 3. Assign to node.stateSnapshot (direct assignment, last write wins)
 *
 * **Invariants:**
 * - Node must exist in nodeMap
 * - stateSnapshot can be null (no snapshot captured)
 *
 * **Error Handling:**
 * - Logs warning if node not found (graceful degradation)
 * - Does not throw for missing nodes
 *
 * **Null Handling:**
 * - Allows null stateSnapshot values (valid state)
 * - Don't throw error for null snapshots
 *
 * **Gotcha:** Event contains full node, but we only extract stateSnapshot field
 * to avoid circular reference issues.
 *
 * @param event - StateSnapshotEvent with updated node
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'stateSnapshot', node: { id: 'workflow-123', stateSnapshot: { count: 42 }, ... } }
 * // Result: node.stateSnapshot = { count: 42 }
 * ```
 */
private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Graceful degradation - log warning and continue
    console.warn(
      `Node '${event.node.id}' not found in nodeMap during stateSnapshot event. ` +
      `This may indicate out-of-order events or missing structural events.`
    );
    return;
  }

  // Extract just the snapshot data, not the entire node
  // Gotcha: event.node contains full node, but we only need stateSnapshot
  node.stateSnapshot = event.node.stateSnapshot;
}

// Pattern 2: handleErrorEvent() - Event accumulation
/**
 * Handle error event - record error on node.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Append event to node.events array (accumulation pattern)
 *
 * **Invariants:**
 * - Node must exist in nodeMap
 * - Error includes rich context (state, logs, stack)
 *
 * **Error Handling:**
 * - Logs warning if node not found (graceful degradation)
 * - Does not throw for missing nodes
 *
 * **Accumulation Pattern:**
 * - Multiple errors are accumulated (not overwritten)
 * - All errors preserved in node.events[] array
 * - To find all errors: node.events.filter(e => e.type === 'error')
 *
 * **Gotcha:** WorkflowNode has no dedicated errors[] field.
 * All errors are stored in the events[] array.
 *
 * @param event - ErrorEvent with error details
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'error', node: {...}, error: { message: 'Failed', state: {...}, logs: [...] } }
 * // Result: Error event appended to node.events[]
 * ```
 */
private handleErrorEvent(event: Extract<WorkflowEvent, { type: 'error' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Graceful degradation - log warning and continue
    console.warn(
      `Node '${event.node.id}' not found in nodeMap during error event. ` +
      `This may indicate out-of-order events or missing structural events.`
    );
    return;
  }

  // Accumulate error in events array (append-only pattern)
  // Gotcha: No dedicated errors[] field - use node.events[]
  node.events.push(event);
}

// Pattern 3: handleStepStart() - Event tracking (metadata)
/**
 * Handle stepStart event - track step execution start.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Append event to node.events array for tracking
 *
 * **Invariants:**
 * - Step nodes are created via @Step decorator
 * - Step node may not exist yet if childAttached event hasn't been processed
 *
 * **Error Handling:**
 * - Returns silently if step node not found (childAttached will add it later)
 * - Does not log warning (step nodes are expected to be added separately)
 *
 * **Use Case:**
 * - Tracks step execution for debugging and performance analysis
 * - Metadata only - doesn't modify tree structure
 *
 * @param event - StepStartEvent with step name
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'stepStart', node: { id: 'step-123', ... }, step: 'processData' }
 * // Result: Event appended to node.events[]
 * ```
 */
private handleStepStart(event: Extract<WorkflowEvent, { type: 'stepStart' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Step node may not exist yet - childAttached will add it later
    // Don't log warning (expected for step nodes)
    return;
  }

  // Track step start in events array
  node.events.push(event);
}

// Pattern 4: handleStepEnd() - Event tracking with duration
/**
 * Handle stepEnd event - track step execution completion with duration.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Append event to node.events array for tracking
 * 3. Duration info is in event.duration field
 *
 * **Invariants:**
 * - Step nodes are created via @Step decorator
 * - Step node may not exist yet if childAttached event hasn't been processed
 *
 * **Error Handling:**
 * - Returns silently if step node not found (childAttached will add it later)
 * - Does not log warning (step nodes are expected to be added separately)
 *
 * **Use Case:**
 * - Tracks step execution time for performance analysis
 * - Metadata only - doesn't modify tree structure
 *
 * **Timing Info:**
 * - Duration is in milliseconds
 * - Access via event.duration field
 *
 * @param event - StepEndEvent with step name and duration
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'stepEnd', node: { id: 'step-123', ... }, step: 'processData', duration: 1500 }
 * // Result: Event appended to node.events[], duration accessible
 * ```
 */
private handleStepEnd(event: Extract<WorkflowEvent, { type: 'stepEnd' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Step node may not exist yet - childAttached will add it later
    // Don't log warning (expected for step nodes)
    return;
  }

  // Track step end with duration in events array
  node.events.push(event);
}

// Pattern 5: handleTaskStart() - Event tracking (metadata)
/**
 * Handle taskStart event - track task execution start.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Append event to node.events array for tracking
 *
 * **Invariants:**
 * - Task events reference parent node (not a separate task node)
 * - Parent node should exist in nodeMap
 *
 * **Error Handling:**
 * - Logs warning if node not found (graceful degradation)
 * - Does not throw for missing nodes
 *
 * **Use Case:**
 * - Tracks task execution for debugging
 * - Metadata only - doesn't modify tree structure
 *
 * **Difference from Steps:**
 * - Tasks don't create separate nodes
 * - Task events reference parent node
 * - No duration tracking in task events
 *
 * @param event - TaskStartEvent with task name
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'taskStart', node: { id: 'workflow-123', ... }, task: 'cleanup' }
 * // Result: Event appended to node.events[]
 * ```
 */
private handleTaskStart(event: Extract<WorkflowEvent, { type: 'taskStart' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Graceful degradation - log warning and continue
    console.warn(
      `Node '${event.node.id}' not found in nodeMap during taskStart event. ` +
      `This may indicate out-of-order events or missing structural events.`
    );
    return;
  }

  // Track task start in events array
  node.events.push(event);
}

// Pattern 6: handleTaskEnd() - Event tracking (no duration)
/**
 * Handle taskEnd event - track task execution completion.
 *
 * **Strategy:**
 * 1. Find node via nodeMap.get(event.node.id)
 * 2. Append event to node.events array for tracking
 *
 * **Invariants:**
 * - Task events reference parent node (not a separate task node)
 * - Parent node should exist in nodeMap
 *
 * **Error Handling:**
 * - Logs warning if node not found (graceful degradation)
 * - Does not throw for missing nodes
 *
 * **Use Case:**
 * - Tracks task execution for debugging
 * - Metadata only - doesn't modify tree structure
 *
 * **Gotcha:** taskEnd event does NOT have a duration field (unlike stepEnd)
 *
 * @param event - TaskEndEvent with task name
 *
 * @example
 * ```typescript
 * // Event structure
 * { type: 'taskEnd', node: { id: 'workflow-123', ... }, task: 'cleanup' }
 * // Result: Event appended to node.events[]
 * ```
 */
private handleTaskEnd(event: Extract<WorkflowEvent, { type: 'taskEnd' }>): void {
  // Find node in map
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Graceful degradation - log warning and continue
    console.warn(
      `Node '${event.node.id}' not found in nodeMap during taskEnd event. ` +
      `This may indicate out-of-order events or missing structural events.`
    );
    return;
  }

  // Track task end in events array
  // Gotcha: No duration field in taskEnd event
  node.events.push(event);
}

// Pattern 7: Updated replay() method switch statement
/**
 * Replay a sequence of workflow events to reconstruct the workflow tree.
 *
 * **Event Processing Strategy:**
 * - Processes events sequentially in order
 * - Uses try-catch per event to isolate errors
 * - Logs errors and continues processing on failure
 * - Throws only if root cannot be established
 *
 * **Phase 1 - Structural Events** (implemented in P2.M1.T1.S2):
 * - `childAttached`: Add new child node to parent's children array
 * - `childDetached`: Remove child and all descendants from tree
 * - `treeUpdated`: Update root reference to new tree
 *
 * **Phase 2 - State Events** (implemented in this PRP):
 * - `stateSnapshot`: Update node's stateSnapshot field
 * - `error`: Record error information on node
 * - `stepStart`: Track step execution start
 * - `stepEnd`: Track step execution completion with duration
 * - `taskStart`: Track task execution start
 * - `taskEnd`: Track task execution completion
 *
 * **Phase 3 - Metadata Events** (logged but don't modify tree):
 * - `agentPromptStart/End`, `toolInvocation`, `mcpEvent`, etc.
 *
 * **Tree Invariants Maintained:**
 * - Single-parent rule: Each node has at most one parent
 * - Bidirectional references: parent.children and child.parent are consistent
 * - No circular references: Tree is a Directed Acyclic Graph (DAG)
 *
 * @param events - Array of workflow events in chronological order
 * @returns Root node of the reconstructed workflow tree
 * @throws {Error} If events array is empty
 * @throws {Error} If root cannot be established from events
 *
 * @example
 * ```typescript
 * const replayer = new WorkflowEventReplayer();
 * const tree = replayer.replay(eventStream);
 * console.log(`Tree has ${tree.children.length} root children`);
 * ```
 */
replay(events: WorkflowEvent[]): WorkflowNode {
  // Validate input
  if (!events || events.length === 0) {
    throw new Error('Events array is empty or null');
  }

  // Initialize state
  this.nodeMap.clear();
  this.root = null;

  // Process events sequentially
  for (const event of events) {
    try {
      switch (event.type) {
        // Structural events (P2.M1.T1.S2)
        case 'childAttached':
          this.handleChildAttached(event);
          break;

        case 'childDetached':
          this.handleChildDetached(event);
          break;

        case 'treeUpdated':
          this.handleTreeUpdated(event);
          break;

        // State events (P2.M1.T1.S3 - this PRP)
        case 'stateSnapshot':
          this.handleStateSnapshot(event);
          break;

        case 'error':
          this.handleErrorEvent(event);
          break;

        case 'stepStart':
          this.handleStepStart(event);
          break;

        case 'stepEnd':
          this.handleStepEnd(event);
          break;

        case 'taskStart':
          this.handleTaskStart(event);
          break;

        case 'taskEnd':
          this.handleTaskEnd(event);
          break;

        default:
          // Other metadata events - skip for now
          break;
      }
    } catch (error) {
      // Log error but continue processing subsequent events
      console.error(`Error processing event type '${event.type}':`, error);
    }
  }

  // Verify root was established
  if (!this.root) {
    throw new Error('No root node established from event stream');
  }

  return this.root;
}
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS
  - This PRP only adds implementation to existing event-replayer.ts file
  - No modifications to other files required
  - No new dependencies
  - Exports already configured in P2.M1.T1.S1

TEST FILE CREATION:
  - file: src/__tests__/unit/event-replayer-state.test.ts (NEW)
  - pattern: Follow event-replayer.test.ts structure from P2.M1.T1.S2
  - helpers: Use tree-verification.ts for invariant validation

MODIFIED FILES:
  - src/debugger/event-replayer.ts (replace stubs with implementations)
  - src/__tests__/unit/event-replayer-state.test.ts (NEW - add tests)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementation - fix before proceeding
npm run build                    # TypeScript compilation
# Expected: Zero errors. dist/debugger/event-replayer.js is created

# Linting (if configured)
npm run lint                    # ESLint or equivalent
# Expected: Zero errors

# Formatting (if configured)
npm run format                  # Prettier or equivalent
# Expected: Consistent formatting applied

# Manual verification
grep -c "private handleStateSnapshot" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleErrorEvent" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleStepStart" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleStepEnd" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleTaskStart" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleTaskEnd" src/debugger/event-replayer.ts  # Should be 1

# Verify switch statement updated
grep -c "case 'stateSnapshot'" src/debugger/event-replayer.ts  # Should be 1
grep -c "case 'error'" src/debugger/event-replayer.ts  # Should be 1
grep -c "case 'stepStart'" src/debugger/event-replayer.ts  # Should be 1
grep -c "case 'stepEnd'" src/debugger/event-replayer.ts  # Should be 1
grep -c "case 'taskStart'" src/debugger/event-replayer.ts  # Should be 1
grep -c "case 'taskEnd'" src/debugger/event-replayer.ts  # Should be 1

# Verify no "Not implemented" stubs remain
grep -c "Not implemented" src/debugger/event-replayer.ts  # Should be 0
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the state event handlers
npm test src/__tests__/unit/event-replayer-state.test.ts

# Full test suite for affected areas
npm test

# Expected: All tests pass
# - stateSnapshot events update node.stateSnapshot
# - error events accumulate in node.events[]
# - stepStart/stepEnd events track in node.events[]
# - taskStart/taskEnd events track in node.events[]
# - Missing nodes handled gracefully (log warning, continue)
# - Null stateSnapshot handled correctly
# - Multiple errors accumulate (not overwritten)
# - Complete replay with structural + state events works
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify replayer integrates with existing code
npm test src/__tests__/integration/

# Manual integration test (create test script)
# Create a workflow with state events, capture events, replay, verify state

# Expected: Integration tests pass, replayer works with real event streams
```

### Level 4: Manual Verification (Domain-Specific Validation)

```bash
# Create test script to verify state replay manually
cat > test-state-replay.js << 'EOF'
import { WorkflowEventReplayer } from './dist/index.js';

// Create mock event stream with structural + state events
const events = [
  // Structural events (build tree)
  {
    type: 'childAttached',
    parentId: 'root',
    child: {
      id: 'node1',
      name: 'Node1',
      parent: null,
      children: [],
      status: 'idle',
      logs: [],
      events: [],
      stateSnapshot: null
    }
  },
  // State events (update node state)
  {
    type: 'stateSnapshot',
    node: {
      id: 'node1',
      name: 'Node1',
      parent: null,
      children: [],
      status: 'running',
      logs: [],
      events: [],
      stateSnapshot: { count: 42, status: 'running' }
    }
  },
  // Error event
  {
    type: 'error',
    node: {
      id: 'node1',
      name: 'Node1',
      parent: null,
      children: [],
      status: 'failed',
      logs: [],
      events: [],
      stateSnapshot: null
    },
    error: {
      message: 'Test error',
      original: null,
      workflowId: 'node1',
      state: { count: 42 },
      logs: []
    }
  }
];

const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(events);

// Verify state snapshot
console.log('Root child count:', tree.children.length);
console.log('Node1 stateSnapshot:', tree.children[0].stateSnapshot);

// Verify error accumulated
const errorEvents = tree.children[0].events.filter(e => e.type === 'error');
console.log('Error count:', errorEvents.length);
console.log('Error message:', errorEvents[0].error.message);
EOF

node test-state-replay.js
# Expected: Output shows correct state snapshot and error accumulation
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `handleStateSnapshot()` method implemented
- [ ] `handleErrorEvent()` method implemented
- [ ] `handleStepStart()` method implemented
- [ ] `handleStepEnd()` method implemented
- [ ] `handleTaskStart()` method implemented
- [ ] `handleTaskEnd()` method implemented
- [ ] `replay()` switch statement updated with all state event cases
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All methods have comprehensive JSDoc documentation
- [ ] Test file created at `src/__tests__/unit/event-replayer-state.test.ts`

### Feature Validation

- [ ] `stateSnapshot` events update `node.stateSnapshot` field
- [ ] `stateSnapshot` events handle null values correctly
- [ ] `stateSnapshot` events use last-write-wins semantics
- [ ] `error` events accumulate in `node.events[]` array
- [ ] Multiple errors accumulate correctly (not overwritten)
- [ ] `stepStart` events track in `node.events[]` array
- [ ] `stepEnd` events track with duration in `node.events[]` array
- [ ] `taskStart` events track in `node.events[]` array
- [ ] `taskEnd` events track in `node.events[]` array
- [ ] Missing nodes handled gracefully (log warning, continue)
- [ ] Step nodes handled silently (no warning)
- [ ] Complete replay with structural + state events works

### Code Quality Validation

- [ ] Follows existing patterns from `event-replayer.ts`
- [ ] Uses Map-based node tracking for O(1) lookups
- [ ] Uses discriminated union pattern (Extract<WorkflowEvent, ...>)
- [ ] Graceful degradation for missing nodes
- [ ] Error isolation with try-catch per event (existing in replay())
- [ ] No modification to existing types
- [ ] No new dependencies added

### Test Coverage Validation

- [ ] Test for stateSnapshot updating node state
- [ ] Test for stateSnapshot overwriting (last write wins)
- [ ] Test for null stateSnapshot handling
- [ ] Test for missing node in stateSnapshot
- [ ] Test for error accumulation
- [ ] Test for multiple errors accumulating
- [ ] Test for missing node in error event
- [ ] Test for stepStart event tracking
- [ ] Test for stepEnd event with duration
- [ ] Test for taskStart event tracking
- [ ] Test for taskEnd event tracking
- [ ] Test for missing node in task events
- [ ] Test for complete replay with structural + state events

---

## Anti-Patterns to Avoid

- ❌ Don't throw error for missing nodes during replay (log warning, continue)
- ❌ Don't use entire event.node (causes circular references) - extract only stateSnapshot
- ❌ Don't merge stateSnapshots - use direct assignment (last write wins)
- ❌ Don't overwrite errors - accumulate them in events[] array
- ❌ Don't expect duration in taskEnd events (only stepEnd has duration)
- ❌ Don't log warning for missing step nodes (they're added separately via childAttached)
- ❌ Don't skip null stateSnapshot values (null is valid)
- ❌ Don't throw error for null stateSnapshot (handle gracefully)
- ❌ Don't create new fields on WorkflowNode (use existing stateSnapshot and events[])
- ❌ Don't modify event data after creation (events are immutable)
- ❌ Don't clear events array during replay (accumulate events)
- ❌ Don't skip error events (they contain valuable debugging context)
- ❌ Don't forget to update replay() switch statement for all state event types
- ❌ Don't use bare WorkflowEvent type in handler signatures (use Extract<> for type safety)

---

## References

### Research Files (plan/002_6761e4b84fd1/P2M1T1S3/research/)

- `node-state-patterns.md` - State event patterns, error handling, gotchas
- `state-replay-best-practices.md` - Event replay best practices, validation strategies
- `event-driven-state-patterns.md` - Reducer patterns, state accumulation, timing tracking

### Source Files Referenced

- `src/debugger/event-replayer.ts` - File to modify, contains stub implementations
- `src/types/events.ts` - WorkflowEvent discriminated union (state event types)
- `src/types/workflow.ts` - WorkflowNode interface (stateSnapshot, events fields)
- `src/types/snapshot.ts` - SerializedWorkflowState type
- `src/types/error.ts` - WorkflowError interface
- `src/core/workflow.ts` - State snapshot and error emission patterns
- `src/__tests__/helpers/tree-verification.ts` - Verification helper functions

### Previous PRPs

- `plan/002_6761e4b84fd1/P2M1T1.S1/PRP.md` - Interface contract, method signatures
- `plan/002_6761e4b84fd1/P2M1T1S2/PRP.md` - Structural events contract

### External References

- MDN Map Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html#discriminated-unions
- Event Sourcing Pattern: https://martinfowler.com/eaaDev/EventSourcing.html

---

**End of PRP**
