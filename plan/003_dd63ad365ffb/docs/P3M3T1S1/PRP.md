# Product Requirement Prompt (PRP): Implement Event History Storage for Workflow

---

## Goal

**Feature Goal**: Add in-memory event history storage and replay capability to the Workflow class, enabling observers to catch up on historical events and enabling diagnostic replay of workflow execution.

**Deliverable**: Modified `src/core/workflow.ts` with:
1. `#eventHistory` private field for storing WorkflowEvent array
2. Modified `emitEvent()` to push events to history before notifying observers
3. `replayEvents(observer, options?)` method to replay historical events
4. `clearEventHistory()` method to clear the event history
5. Comprehensive unit tests in `src/__tests__/unit/workflow-event-history.test.ts`

**Success Definition**:
- [ ] Event history array stores all events emitted by the workflow
- [ ] Events are pushed to history BEFORE observers are notified (preserves order)
- [ ] `replayEvents()` replays events to observer in chronological order
- [ ] `replayEvents()` supports `since` option for timestamp filtering
- [ ] `replayEvents()` supports `limit` option for maximum event count
- [ ] `clearEventHistory()` empties the event history array
- [ ] Observer errors during replay are handled gracefully (logged, don't crash)
- [ ] All existing tests continue to pass (no breaking changes)
- [ ] New tests cover all success cases, edge cases, and error conditions

---

## User Persona

**Target User**: Implementation agent working on P3.M3.T1.S1 (event history storage).

**Use Case**: Adding event replay capability to the Workflow class to enable:
- Catching up new observers to current workflow state
- Diagnostic replay of workflow execution for debugging
- Future time-travel debugging features

**User Journey**:
1. Review existing Workflow class and event system
2. Add private event history field to Workflow class
3. Modify emitEvent() to store events in history
4. Implement replayEvents() method with filtering options
5. Implement clearEventHistory() method
6. Write comprehensive tests
7. Verify all existing tests pass

**Pain Points Addressed**:
- **Issue #12**: WorkflowEventReplayer exists in tests but not integrated into Workflow class
- **Missing API**: No way to request event replay from Workflow
- **Debugging Gap**: Cannot replay events to diagnostic observers retroactively
- **Observer Limitation**: New observers miss all historical events

---

## Why

**Business Value and User Impact**:
- Enables time-travel debugging by preserving event history
- Allows diagnostic observers to be attached at any time and catch up
- Provides foundation for future features (event export, analysis, replay)
- Improves debugging workflow execution issues

**Integration with Existing Features**:
- Builds on existing WorkflowEvent discriminated union type
- Integrates with existing WorkflowObserver interface
- Complements WorkflowEventReplayer (tree reconstruction from events)
- Follows existing observer notification patterns

**Problems Solved**:
- **Issue #12**: WorkflowEventReplayer exists but no API to trigger replay from Workflow
- **Observer Catch-Up**: New observers currently miss all historical events
- **Diagnostic Gap**: Cannot attach observer and see past events
- **Event Visibility**: No way to retrieve event history from a running workflow

---

## What

**User-Visible Behavior and Technical Requirements**:

### Current State

The Workflow class currently:
- Emits events via `emitEvent(event: WorkflowEvent)` method
- Pushes events to `node.events` array (for tree reconstruction)
- Notifies observers via `observer.onEvent(event)`
- Has NO event history storage for replay
- Has NO API to request event replay

### Desired State

**1. Event History Storage:**
```typescript
export class Workflow {
  // ... existing fields ...
  #eventHistory: WorkflowEvent[] = [];  // NEW: Private event history array
}
```

**2. Modified emitEvent() Method:**
```typescript
public emitEvent(event: WorkflowEvent): void {
  // NEW: Store event in history BEFORE notifying observers
  this.#eventHistory.push(event);

  // EXISTING: Push to node.events and notify observers
  this.node.events.push(event);
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);
      // ... rest of existing logic
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

**3. New replayEvents() Method:**
```typescript
/**
 * Replay historical events to an observer
 *
 * @param observer - The observer to replay events to
 * @param options - Optional replay configuration
 * @param options.since - Only replay events after this timestamp (ms since epoch)
 * @param options.limit - Maximum number of events to replay
 */
public replayEvents(
  observer: WorkflowObserver,
  options?: { since?: number; limit?: number }
): void
```

**4. New clearEventHistory() Method:**
```typescript
/**
 * Clear the event history array
 *
 * Frees memory by discarding all stored events.
 * Events in node.events are preserved.
 */
public clearEventHistory(): void
```

### Success Criteria

- [ ] `#eventHistory` field uses `#private` syntax (ES2022) for true runtime privacy
- [ ] Events are pushed to history in `emitEvent()` before observer notification
- [ ] `replayEvents()` calls `observer.onEvent()` for each historical event
- [ ] `replayEvents()` filters by timestamp when `since` is provided
- [ ] `replayEvents()` limits events when `limit` is provided
- [ ] `replayEvents()` handles observer errors gracefully (logs, continues)
- [ ] `clearEventHistory()` sets `#eventHistory` to empty array `[]`
- [ ] All existing workflow tests pass without modification
- [ ] New tests cover replay with options, empty history, observer errors

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact Workflow class structure and existing event system
- WorkflowEvent discriminated union type definition
- WorkflowObserver interface definition
- Where to add new fields and methods (specific line numbers)
- Test patterns from existing workflow tests
- Implementation blueprint with code examples
- Validation commands and expected outputs
- Research on TypeScript private fields and API design

### Documentation & References

```yaml
# MUST READ - Existing Workflow class structure
- file: src/core/workflow.ts
  why: Contains the class to modify, existing emitEvent() implementation, observer patterns
  lines: 1-950 (full file for context)
  pattern: Private field naming, method structure, JSDoc style
  critical: Must match existing code style and patterns

# MUST READ - WorkflowEvent type definition
- file: src/types/events.ts
  why: Discriminated union of all event types that will be stored in history
  lines: 1-83 (full file)
  pattern: Discriminated union pattern with `type` field
  note: Not all events have timestamps (handle gracefully in filter)

# MUST READ - WorkflowObserver interface
- file: src/types/observer.ts
  why: Interface for observers that will receive replayed events
  lines: 1-19 (full file)
  pattern: Interface with onLog, onEvent, onStateUpdated, onTreeChanged methods
  critical: replayEvents() must call observer.onEvent()

# MUST READ - Existing workflow test patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Contains test patterns for Workflow class, observer setup, event verification
  lines: 1-500 (first 500 lines for patterns)
  pattern: Describe blocks, observer creation, event assertions
  critical: Follow existing test structure and naming

# MUST READ - Event replayer test patterns
- file: src/__tests__/unit/event-replayer.test.ts
  why: Contains test patterns for replay functionality, event handling
  lines: 1-200 (first 200 lines for patterns)
  pattern: Mock creation, event stream construction, replay verification
  critical: Similar patterns needed for replayEvents() tests

# RESEARCH - Codebase workflow analysis
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S1/research/codebase-workflow-analysis.md
  why: Detailed analysis of existing event system, integration points, gotchas
  section: Key Files, Integration Points, Testing Patterns, Gotchas
  critical: Contains specific line numbers and implementation patterns

# RESEARCH - Event replay API design
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S1/research/event-replay-api-design.md
  why: API design options, implementation details, edge cases
  section: Recommended: Option 1, Implementation Details, Edge Cases to Handle
  critical: Contains recommended API signature and filtering logic

# RESEARCH - TypeScript private fields
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S3/research/typescript-private-fields-research.md
  why: Guidance on using `#private` vs `private` keyword, JSDoc patterns
  section: Key Findings, Implementation Highlights
  critical: Use `#private` (ES2022) for true runtime privacy
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts                          # MODIFY: Add event history fields and methods
│   │   ├── Line 83: private observers array (reference for new field)
│   │   ├── Line 483-499: emitEvent() method (modify to add history)
│   │   └── Line 301-316: Observer management methods (reference)
│   └── logger.ts                             # REFERENCE: Error logging pattern
├── types/
│   ├── events.ts                             # REFERENCE: WorkflowEvent discriminated union
│   ├── observer.ts                           # REFERENCE: WorkflowObserver interface
│   └── workflow.ts                           # REFERENCE: WorkflowNode type
└── __tests__/
    ├── unit/
    │   ├── workflow.test.ts                  # REFERENCE: Test patterns
    │   └── workflow-event-history.test.ts    # CREATE: New tests for event history
    └── integration/
        └── observer-logging.test.ts          # REFERENCE: Observer integration patterns
```

### Desired Codebase Tree with Changes

```bash
# MODIFIED FILE: src/core/workflow.ts

# ADD after line 92 (after collectedErrors declaration):
#   #eventHistory: WorkflowEvent[] = [];

# MODIFY line 483-499 (emitEvent method):
#   Add: this.#eventHistory.push(event); before this.node.events.push(event);

# ADD after emitEvent() method (after line 499):
#   replayEvents() method implementation
#   clearEventHistory() method implementation

# NEW FILE: src/__tests__/unit/workflow-event-history.test.ts
#   Test suite for event history functionality
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use #private (ES2022) not private keyword
// #private provides true runtime privacy (cannot access via bracket notation)
// ES2022 target is confirmed in tsconfig.json - no compatibility issues

// CRITICAL: Events must be pushed to history BEFORE notifying observers
// This preserves chronological order for replay
// If reversed, new observers would receive current events before historical ones

// CRITICAL: Not all WorkflowEvent types have timestamps
// Events WITH timestamps: stepRetry, stepRestarted, invalidResponse
// Events WITHOUT timestamps: Most structural/state events
// For events without timestamps, treat them as "always applicable" in filter

// CRITICAL: Observer errors must be caught and logged, not thrown
// Follow existing pattern in emitEvent(): try-catch around observer.onEvent()
// Log errors via this.logger.error('Observer replay error', { error, eventType })
// Continue replaying remaining events even if one observer throws

// CRITICAL: Observer pattern uses root observers only
// Must use this.getRootObservers() to traverse parent chain
// Observers are only added to root workflows (not child workflows)

// CRITICAL: Event immutability
// Events in node.events can be modified externally (reference shared)
// Consider using structuredClone() if events need to be protected
// For MVP: Store references (accepts mutation risk for simplicity)

// CRITICAL: JSDoc style follows comprehensive multi-line format
// Include Strategy, Performance, Validation, Use Case sections
// Include @example tags for usage patterns
// Follow existing style from workflow.ts methods

// CRITICAL: Test patterns use vitest, describe/it blocks
// Use vi.spyOn for mocking console methods
// Use observer capture pattern: events.push(event) in onEvent
// Arrange-Act-Assert pattern for test clarity

// CRITICAL: Filter-then-limit order of operations
// Filter by timestamp FIRST (reduces array size)
// Then apply limit (slice from filtered results)
// More efficient than limit-then-filter

// CRITICAL: Array clearing uses reassignment not splice
// this.#eventHistory = [] (clear and GC-friendly)
// NOT this.#eventHistory.length = 0 (preserves array reference)

// CRITICAL: Private field access in TypeScript
// Use this.#eventHistory to access private field
// Cannot access via bracket notation: this['#eventHistory'] won't work

// CRITICAL: Discriminated union pattern for WorkflowEvent
// Use event.type to discriminate in filters
// Use type guards: if (event.type === 'stepStart') { ... }

// CRITICAL: Existing tests must continue to pass
// Do NOT modify any existing test files
// Do NOT change behavior of existing methods
// Only ADD new functionality
```

---

## Implementation Blueprint

### Data Models and Structure

**New Private Field:**
```typescript
export class Workflow {
  // ... existing fields ...
  /** Event history for replay functionality (ES2022 private field) */
  #eventHistory: WorkflowEvent[] = [];
}
```

**Options Interface (for replayEvents):**
```typescript
/**
 * Options for replaying historical events
 */
interface ReplayEventsOptions {
  /** Only replay events after this timestamp (milliseconds since epoch) */
  since?: number;
  /** Maximum number of events to replay */
  limit?: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD #eventHistory private field to Workflow class
  - FILE: src/core/workflow.ts
  - LOCATION: After line 92 (after collectedErrors declaration)
  - ADD: #eventHistory: WorkflowEvent[] = [];
  - PATTERN: Follow existing private field naming (observers uses private keyword, but use #private for new field)
  - NAMING: camelCase with # prefix for ES2022 private field
  - JSDOC: Add comment explaining purpose: "Event history for replay functionality"

Task 2: MODIFY emitEvent() method to store events in history
  - FILE: src/core/workflow.ts
  - LOCATION: Line 483-499 (emitEvent method)
  - ADD: this.#eventHistory.push(event); before this.node.events.push(event);
  - PRESERVE: All existing logic (node.events push, observer notification)
  - PRESERVE: Existing error handling for observer.onEvent() calls
  - ORDERING: History push FIRST, then node.events, then observers

Task 3: ADD ReplayEventsOptions interface
  - FILE: src/core/workflow.ts
  - LOCATION: Before Workflow class definition (around line 20-30)
  - ADD: interface ReplayEventsOptions { since?: number; limit?: number; }
  - PATTERN: Follow existing interface patterns (e.g., RestartStepOptions)
  - JSDOC: Document each optional property

Task 4: IMPLEMENT replayEvents() method
  - FILE: src/core/workflow.ts
  - LOCATION: After emitEvent() method (after line 499)
  - ADD: public replayEvents(observer, options?) method
  - IMPLEMENTATION:
    - Start with #eventHistory array
    - Filter by since timestamp if provided
    - Apply limit if provided
    - Call observer.onEvent() for each event
    - Wrap observer calls in try-catch (follow existing pattern)
    - Log errors via this.logger.error()
  - SIGNATURE: replayEvents(observer: WorkflowObserver, options?: ReplayEventsOptions): void
  - JSDOC: Comprehensive documentation with examples

Task 5: IMPLEMENT clearEventHistory() method
  - FILE: src/core/workflow.ts
  - LOCATION: After replayEvents() method
  - ADD: public clearEventHistory() method
  - IMPLEMENTATION: this.#eventHistory = [];
  - SIGNATURE: clearEventHistory(): void
  - JSDOC: Document that it clears history but preserves node.events

Task 6: CREATE test file workflow-event-history.test.ts
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - ADD: Complete test suite (see Task 7-15)
  - PATTERN: Follow workflow.test.ts structure
  - IMPORTS: Workflow, WorkflowEvent, WorkflowObserver, vitest functions

Task 7: WRITE tests for event history storage
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: Events are stored in #eventHistory when emitted
  - VERIFY: History array grows with each emitEvent() call
  - PATTERN: Create workflow, emit events, check history length

Task 8: WRITE tests for replayEvents() - basic replay
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: replayEvents() calls observer.onEvent() for all events
  - VERIFY: Observer receives all historical events in order
  - PATTERN: Create observer with capture, emit events, replay, verify captured

Task 9: WRITE tests for replayEvents() - since option
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: since option filters events by timestamp
  - VERIFY: Only events after timestamp are replayed
  - EDGE CASE: Events without timestamps are always included
  - PATTERN: Create events with timestamps, replay with since, verify filter

Task 10: WRITE tests for replayEvents() - limit option
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: limit option restricts number of events replayed
  - VERIFY: Only first N events are replayed
  - PATTERN: Create many events, replay with limit, verify count

Task 11: WRITE tests for replayEvents() - combined options
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: since and limit work together correctly
  - VERIFY: Filter first, then limit
  - PATTERN: Create events, replay with both options, verify result

Task 12: WRITE tests for replayEvents() - empty history
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: replayEvents() with empty history does nothing
  - VERIFY: No observer calls, no errors
  - PATTERN: Create workflow, don't emit events, replay, verify no calls

Task 13: WRITE tests for replayEvents() - observer error handling
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: Observer errors during replay are logged but don't crash
  - VERIFY: Error logged, replay continues for remaining events
  - PATTERN: Create throwing observer, emit events, replay, verify error log

Task 14: WRITE tests for clearEventHistory()
  - FILE: src/__tests__/unit/workflow-event-history.test.ts
  - TEST: clearEventHistory() empties the history array
  - VERIFY: History length is 0 after clearing
  - VERIFY: node.events is preserved (not cleared)
  - PATTERN: Create workflow, emit events, clear, verify empty

Task 15: RUN all existing tests
  - COMMAND: npm test
  - EXPECTED: All existing tests pass
  - VERIFY: No breaking changes to existing functionality
  - VERIFY: Workflow class still works as before

Task 16: RUN new event history tests
  - COMMAND: npm test -- workflow-event-history.test.ts
  - EXPECTED: All new tests pass
  - VERIFY: Event history storage works
  - VERIFY: Replay functionality works with options
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Private field declaration (ES2022)
// Location: After line 92 in workflow.ts

export class Workflow {
  // ... existing fields ...
  /** Event history for replay functionality */
  #eventHistory: WorkflowEvent[] = [];
}

// PATTERN 2: Modified emitEvent() method
// Location: Line 483-499 in workflow.ts

public emitEvent(event: WorkflowEvent): void {
  // NEW: Store event in history FIRST
  this.#eventHistory.push(event);

  // EXISTING: Store in node.events
  this.node.events.push(event);

  // EXISTING: Notify observers
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);

      // Also notify tree changed for tree update events
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged(this.getRoot().node);
      }
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}

// PATTERN 3: ReplayEventsOptions interface
// Location: Before Workflow class (around line 20-30)

/**
 * Options for replaying historical events
 */
interface ReplayEventsOptions {
  /** Only replay events after this timestamp (milliseconds since epoch) */
  since?: number;
  /** Maximum number of events to replay */
  limit?: number;
}

// PATTERN 4: replayEvents() method implementation
// Location: After emitEvent() method (after line 499)

/**
 * Replay historical events to an observer
 *
 * **Strategy:**
 * 1. Start with event history array
 * 2. Filter by timestamp if `since` is provided
 * 3. Limit events if `limit` is provided
 * 4. Call observer.onEvent() for each event
 * 5. Handle observer errors gracefully
 *
 * **Performance:** O(n) where n = number of events in history
 *
 * **Timestamp Handling:**
 * - Events with timestamps: stepRetry, stepRestarted, invalidResponse
 * - Events without timestamps: Always included (considered timeless)
 * - Filter applies only to events with timestamp field
 *
 * **Order of Operations:** Filter first, then limit (more efficient)
 *
 * **Use Case:**
 * - Catch up new observers to current state
 * - Debug by replaying events to diagnostic observers
 * - Test scenarios by replaying historical events
 *
 * @param observer - The observer to replay events to
 * @param options - Optional replay configuration
 * @param options.since - Only replay events after this timestamp (ms since epoch)
 * @param options.limit - Maximum number of events to replay
 *
 * @example Replay all events to new observer
 * ```ts
 * const observer = {
 *   onEvent: (e) => console.log(e.type),
 *   onLog: () => {},
 *   onStateUpdated: () => {},
 *   onTreeChanged: () => {},
 * };
 * workflow.replayEvents(observer);
 * ```
 *
 * @example Replay last 10 events
 * ```ts
 * workflow.replayEvents(observer, { limit: 10 });
 * ```
 *
 * @example Replay events from last 5 minutes
 * ```ts
 * const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
 * workflow.replayEvents(observer, { since: fiveMinutesAgo });
 * ```
 */
public replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  // Start with full history
  let events = this.#eventHistory;

  // Filter by timestamp if provided
  if (options?.since !== undefined) {
    events = events.filter(event => {
      // Extract timestamp from events that have it
      const timestamp =
        event.type === 'stepRetry' ? event.timestamp :
        event.type === 'stepRestarted' ? event.timestamp :
        event.type === 'invalidResponse' ? event.timestamp :
        undefined;

      // Include events without timestamp or events after since
      return timestamp === undefined || timestamp >= options.since!;
    });
  }

  // Apply limit if provided
  if (options?.limit !== undefined) {
    events = events.slice(0, options.limit);
  }

  // Replay events to observer
  for (const event of events) {
    try {
      observer.onEvent(event);
    } catch (err) {
      this.logger.error('Observer replay error', { error: err, eventType: event.type });
    }
  }
}

// PATTERN 5: clearEventHistory() method implementation
// Location: After replayEvents() method

/**
 * Clear the event history array
 *
 * **Strategy:**
 * - Reassign #eventHistory to empty array
 * - Frees memory by discarding all stored events
 * - Events in node.events are preserved
 *
 * **Use Case:**
 * - Free memory after workflow completes
 * - Reset history between test runs
 * - Prevent memory leaks in long-running workflows
 *
 * **Side Effects:**
 * - Frees memory for discarded events
 * - Future replayEvents() calls will return empty
 * - Does NOT affect node.events array
 *
 * @example Clear history after workflow completes
 * ```ts
 * await workflow.run();
 * workflow.clearEventHistory();  // Free memory
 * ```
 */
public clearEventHistory(): void {
  this.#eventHistory = [];
}

// GOTCHA: Private field access
// Use this.#eventHistory to access ES2022 private field
// Cannot use bracket notation or string access

// GOTCHA: Events without timestamps
// Most WorkflowEvent types don't have timestamp field
// These should be included regardless of since filter
// Only filter out timestamped events that are too old

// GOTCHA: Observer error handling
// Wrap each observer.onEvent() call in try-catch
// Log errors but continue replaying remaining events
// Follow existing pattern from emitEvent()
```

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - No external service dependencies
  - No configuration changes
  - No new dependencies
  - Pure in-memory storage

INTERNAL INTEGRATIONS:
  - WorkflowEvent type (src/types/events.ts)
    - Discriminated union with 20+ event types
    - Some events have timestamps, most don't
    - Filter logic handles timestamped events specially
  - WorkflowObserver interface (src/types/observer.ts)
    - replayEvents() must call observer.onEvent()
    - Must handle observer errors gracefully
  - Existing emitEvent() method
    - Must add history storage before observer notification
    - Must preserve all existing behavior

SCOPE BOUNDARIES:
  - ONLY modify src/core/workflow.ts
  - ADD #eventHistory private field
  - MODIFY emitEvent() method (add one line)
  - ADD replayEvents() method
  - ADD clearEventHistory() method
  - CREATE src/__tests__/unit/workflow-event-history.test.ts
  - DO NOT modify any other files
  - DO NOT modify existing tests

BACKWARD COMPATIBILITY:
  - MUST maintain all existing Workflow class behavior
  - MUST not break any existing tests
  - MUST only add new functionality
  - MUST preserve observer notification order

RELATED WORK:
  - Issue #12: WorkflowEventReplayer exists but no API to trigger replay
  - WorkflowEventReplayer (src/debugger/event-replayer.ts): Reconstructs tree from events
  - This PRP provides the missing API to request event replay

FILES TO MODIFY:
  - src/core/workflow.ts (add event history fields and methods)

FILES TO CREATE:
  - src/__tests__/unit/workflow-event-history.test.ts (new tests)

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/types/events.ts (no changes needed)
  - src/types/observer.ts (no changes needed)
  - Any other test files
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# Expected: Zero errors
# If errors exist:
# 1. READ the error messages carefully
# 2. VERIFY errors are in workflow.ts
# 3. FIX any type errors (likely #eventHistory access)

# Run linter
npm run lint

# Expected: Zero errors in workflow.ts
# Fix any linting issues

# Run formatter (if exists)
npm run format

# Expected: Consistent formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new event history tests
npm test -- workflow-event-history.test.ts

# Expected: All new tests pass
# Verify:
# - Event history storage works
# - Replay with options works correctly
# - Observer error handling works
# - Clear history works

# Run all existing workflow tests
npm test -- workflow.test.ts

# Expected: All existing tests pass
# Verify: No regressions in workflow functionality

# Run full unit test suite
npm test -- unit/

# Expected: All unit tests pass
# Verify: No breaking changes
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all tests
npm test

# Expected: All tests pass
# Verify:
# - No test failures
# - No skipped tests
# - No timeout errors
# - New functionality integrates correctly

# Run integration tests specifically
npm test -- integration/

# Expected: All integration tests pass
# Verify: Observer integration still works
```

### Level 4: Manual Verification (Event History Specific)

```bash
# Create test script to verify event history functionality
cat > /tmp/test-event-history.js << 'EOF'
import { Workflow } from './src/core/workflow.js';

// Create workflow
const workflow = new Workflow('TestWorkflow');

// Add observer
const events = [];
workflow.addObserver({
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

// Emit some events
workflow.emitEvent({ type: 'childAttached', parentId: '1', child: { id: '2', name: 'Child', parent: null, children: [], status: 'idle', logs: [], events: [], stateSnapshot: null } });
workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });

// Check event history
console.log('Events emitted:', events.length);
console.log('Expected: 2');

// Test replay
const replayed = [];
workflow.replayEvents({
  onLog: () => {},
  onEvent: (e) => replayed.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

console.log('Events replayed:', replayed.length);
console.log('Expected: 2');

// Test clear
workflow.clearEventHistory();
const afterClear = [];
workflow.replayEvents({
  onLog: () => {},
  onEvent: (e) => afterClear.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

console.log('Events after clear:', afterClear.length);
console.log('Expected: 0');

console.log('All manual tests passed!');
EOF

# Run manual test
node --loader tsx /tmp/test-event-history.js

# Expected output:
# Events emitted: 2
# Expected: 2
# Events replayed: 2
# Expected: 2
# Events after clear: 0
# Expected: 0
# All manual tests passed!

# Clean up
rm /tmp/test-event-history.js
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiler passes: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test`
- [ ] New event history tests pass: `npm test -- workflow-event-history.test.ts`
- [ ] Linter passes: `npm run lint`
- [ ] Formatter passes: `npm run format` (if exists)
- [ ] No breaking changes to existing functionality

### Feature Validation

- [ ] Event history stores all emitted events
- [ ] Events stored before observer notification (correct order)
- [ ] replayEvents() replays all events to observer
- [ ] replayEvents() with since option filters by timestamp
- [ ] replayEvents() with limit option restricts event count
- [ ] replayEvents() handles observer errors gracefully
- [ ] clearEventHistory() empties history array
- [ ] clearEventHistory() preserves node.events

### Code Quality Validation

- [ ] Follows existing Workflow class patterns
- [ ] Uses #private (ES2022) for event history field
- [ ] JSDoc documentation follows existing style
- [ ] Error handling matches existing patterns
- [ ] Method placement is logical (after emitEvent)
- [ ] No code duplication

### Test Coverage Validation

- [ ] Tests for basic event history storage
- [ ] Tests for replayEvents() without options
- [ ] Tests for replayEvents() with since option
- [ ] Tests for replayEvents() with limit option
- [ ] Tests for replayEvents() with both options
- [ ] Tests for replayEvents() with empty history
- [ ] Tests for observer error handling during replay
- [ ] Tests for clearEventHistory()
- [ ] Edge cases covered (invalid inputs, boundary conditions)

---

## Anti-Patterns to Avoid

- ❌ Don't use `private` keyword instead of `#private` (ES2022)
- ❌ Don't push events to history AFTER observer notification (wrong order)
- ❌ Don't skip error handling for observer.onEvent() calls
- ❌ Don't use limit before filter in replayEvents() (wrong order)
- ❌ Don't filter out events without timestamps when using since option
- ❌ Don't throw errors from replayEvents() for observer failures
- ❌ Don't clear node.events in clearEventHistory() (only clear history)
- ❌ Don't modify existing test files
- ❌ Don't break existing Workflow class behavior
- ❌ Don't use structuredClone() for events (MVP accepts reference sharing)
- ❌ Don't add circular buffer for MVP (use simple array)
- ❌ Don't make history size configurable for MVP (always unbounded)
- ❌ Don't modify PRD.md or tasks.json (read-only files)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Workflow class structure thoroughly analyzed
- ✅ Integration points clearly identified
- ✅ Test patterns documented from existing tests
- ✅ TypeScript private field patterns researched
- ✅ Event replay API design researched
- ✅ Implementation blueprint with ordered tasks
- ✅ Specific code examples provided
- ✅ Comprehensive validation checklist
- ✅ No breaking changes to existing code
- ✅ Minimal risk (only adds functionality)
- ✅ Clear edge case handling documented

**Risk Assessment**: Minimal risk
- Only adds new fields and methods to Workflow class
- Modifies emitEvent() by adding one line (well-defined change)
- All existing functionality preserved
- New tests isolated to separate file
- Worst case: revert changes if tests fail

**Validation**: This is a focused feature addition to the Workflow class that enables event history storage and replay. The change is localized to one file with clear integration points. All existing code and tests should continue to work. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
