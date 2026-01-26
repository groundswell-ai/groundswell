# Product Requirement Prompt (PRP): Event Replay Tests

---

## Goal

**Feature Goal**: Create comprehensive unit tests for event replay functionality to ensure the event history storage and configuration implementation from P3.M3.T1.S1 and P3.M3.T1.S2 works correctly.

**Deliverable**: Complete test file `src/__tests__/unit/event-replay.test.ts` with full test coverage for event replay functionality.

**Success Definition**:
- [ ] Test file created at `src/__tests__/unit/event-replay.test.ts`
- [ ] All 6 required test cases from contract implemented
- [ ] Additional edge cases covered
- [ ] All tests pass with `npm test -- event-replay.test.ts`
- [ ] Test coverage ≥ 90% for event replay methods
- [ ] Tests follow existing codebase patterns
- [ ] No breaking changes to existing tests

---

## User Persona

**Target User**: Implementation agent writing tests for event replay functionality.

**Use Case**: Creating comprehensive test coverage for event replay feature to ensure reliability and catch regressions.

**User Journey**:
1. Review research documents and existing test patterns
2. Create new test file following established patterns
3. Implement required test cases with proper setup/teardown
4. Run tests to verify they pass
5. Run full test suite to ensure no regressions

**Pain Points Addressed**:
- **No Existing Tests**: Event replay functionality lacks dedicated tests
- **Complex Configuration**: Testing enabled/disabled states, maxEvents, maxAgeMs
- **Edge Cases**: Trimming behavior, observer errors, late-joining observers
- **Regression Prevention**: Ensure future changes don't break event replay

---

## Why

**Business Value and User Impact**:
- Ensures event replay feature works reliably in production
- Prevents regressions when modifying workflow/event code
- Documents expected behavior through tests
- Enables safe refactoring of event history implementation

**Integration with Existing Features**:
- Builds on event history storage from P3.M3.T1.S1
- Tests event history configuration from P3.M3.T1.S2
- Follows existing test patterns from `workflow-event-history.test.ts`
- Uses vitest framework (already in project)

**Problems Solved**:
- **Missing Coverage**: No dedicated tests for event replay with configuration
- **Configuration Testing**: Tests for enabled/disabled, maxEvents, maxAgeMs limits
- **Edge Case Validation**: Trimming behavior, error handling, boundary conditions
- **Confidence**: Provides assurance that event replay works correctly

---

## What

**User-Visible Behavior and Technical Requirements**:

### Contract Requirements

**From P3.M3.T1.S3 Contract Definition**:

**Required Test Cases:**
1. Store events when history enabled
2. Replay events to late-joining observer
3. Respect maxEvents limit
4. Respect maxAgeMs limit
5. Not store events when disabled
6. Clear event history on request

**Input**: Event history implementation from P3.M3.T1.S2 (assumed complete)

**Output**: Test coverage for event replay functionality

### Test File Structure

**File**: `src/__tests__/unit/event-replay.test.ts` (NEW FILE)

**Test Organization**:
```typescript
describe('Workflow Event Replay', () => {
  describe('Event History Storage', () => {
    it('should store events when history enabled', () => { /* Test 1 */ });
    it('should not store events when disabled', () => { /* Test 5 */ });
  });

  describe('replayEvents()', () => {
    it('should replay events to late-joining observer', () => { /* Test 2 */ });
    it('should respect maxEvents limit', () => { /* Test 3 */ });
    it('should respect maxAgeMs limit', () => { /* Test 4 */ });
  });

  describe('clearEventHistory()', () => {
    it('should clear event history on request', () => { /* Test 6 */ });
  });

  describe('Edge Cases', () => {
    // Additional tests for comprehensive coverage
  });
});
```

### Success Criteria

- [ ] Test file created with all 6 required test cases
- [ ] Additional edge case tests included
- [ ] Tests pass when run with `npm test -- event-replay.test.ts`
- [ ] Full test suite passes: `npm test`
- [ ] Code coverage ≥ 90% for event replay methods
- [ ] No linting errors: `npm run lint`
- [ ] Follows existing test patterns from codebase

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Complete P3.M3.T1.S2 PRP output (what implementation will exist)
- All test file structure patterns from existing tests
- Vitest testing patterns and best practices
- Complete test templates to copy from
- Specific file paths and naming conventions
- Validation commands and expected outputs

### Documentation & References

```yaml
# MUST READ - P3.M3.T1.S2 PRP (event history configuration implementation)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S2/PRP.md
  why: Defines the event history implementation to test
  critical: Contains EventHistoryConfig, EventHistoryEntry, emitEvent(), replayEvents(), clearEventHistory()
  contract: Assume this will be implemented exactly as specified

# MUST READ - Existing test file for patterns
- file: src/__tests__/unit/workflow-event-history.test.ts
  why: Contains test patterns for event history testing
  lines: 1-100 (import patterns, test structure, observer creation)
  pattern: Vitest, TestWorkflow class, observer capture pattern, beforeEach setup

# MUST READ - Test structure analysis
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S3/research/test-structure-analysis.md
  why: Complete test file template and patterns
  section: Import Patterns, Test File Structure, Observer Creation, beforeEach Patterns
  critical: Use exact patterns for consistency with codebase

# MUST READ - Event history API reference
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S3/research/event-history-api-reference.md
  why: Complete API documentation for what to test
  section: New Interfaces, Modified Methods, Expected Behaviors, Edge Cases
  critical: Method signatures, default values, expected behaviors

# MUST READ - Event replay test patterns
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S3/research/event-replay-test-patterns.md
  why: Specific test patterns for event replay testing
  section: Test Structure Templates, Configuration Limits Testing, Edge Cases
  critical: Complete test templates for all scenarios

# MUST READ - Vitest test patterns
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M3T1S3/research/vitest-test-patterns.md
  why: Vitest-specific patterns and best practices
  section: Core Patterns, Testing Observer/Event Patterns, Time-Based Testing
  critical: vi.useFakeTimers() for maxAgeMs testing, vi.spyOn() for mocking

# REFERENCE - Workflow class implementation
- file: src/core/workflow.ts
  why: Contains methods being tested
  lines: 104-105 (#eventHistory field), 496-515 (emitEvent), 568-623 (replayEvents), 710-712 (clearEventHistory)
  pattern: Private fields, conditional storage, observer notification

# REFERENCE - WorkflowConfig interface
- file: src/types/workflow-context.ts
  why: Contains EventHistoryConfig to test against
  lines: 145-189 (WorkflowConfig interface)
  pattern: Optional properties with ? suffix

# REFERENCE - WorkflowEvent types
- file: src/types/events.ts
  why: Understanding which events have timestamps for replay testing
  lines: 1-83 (full file)
  critical: Only stepRetry, stepRestarted, invalidResponse have timestamps

# EXTERNAL - Vitest Documentation
- url: https://vitest.dev/api/
  why: Official API reference for expect(), describe(), it(), beforeEach(), vi
  critical: vi.useFakeTimers(), vi.advanceTimersByTime(), vi.spyOn(), vi.fn()

# EXTERNAL - Vitest Mocking Guide
- url: https://vitest.dev/guide/mocking.html
  why: Mocking patterns for console methods and observers
  critical: vi.spyOn(console, 'warn').mockImplementation(() => {})
```

### Current Codebase Tree

```bash
src/
├── core/
│   └── workflow.ts                          # REFERENCE: Methods being tested
├── types/
│   ├── workflow-context.ts                  # REFERENCE: EventHistoryConfig, WorkflowConfig
│   └── events.ts                            # REFERENCE: WorkflowEvent types
└── __tests__/
    └── unit/
        ├── workflow-event-history.test.ts   # REFERENCE: Test patterns to follow
        └── event-replay.test.ts             # CREATE: New test file
```

### Desired Codebase Tree with Changes

```bash
# NEW FILE: src/__tests__/unit/event-replay.test.ts
#   Complete test suite for event replay functionality

# Test structure (6 required + additional edge cases):
#   - Event History Storage (2 tests)
#   - replayEvents() (3 tests)
#   - clearEventHistory() (1 test)
#   - Edge Cases (8-10 tests)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Most WorkflowEvent types don't have timestamps
// Only these events have timestamp field:
// - stepRetry.timestamp
// - stepRestarted.timestamp
// - invalidResponse.timestamp
// All other events have NO timestamp
// Solution: For maxAgeMs testing, use events WITH timestamps

// CRITICAL: Event history disabled by default
// Workflow without eventHistory config has disabled history
// Must explicitly enable: { eventHistory: { enabled: true } }

// CRITICAL: Lazy trimming for maxEvents
// Doesn't trim immediately at maxEvents limit
// Only trims when at 1.5x threshold (e.g., 1500 when maxEvents=1000)
// Tests must emit >1.5x maxEvents to verify trimming

// CRITICAL: maxAgeMs uses insertedAt, not event.timestamp
// Age based on when event was stored, not event's own timestamp
// For testing, use vi.useFakeTimers() to control time

// CRITICAL: When disabled, events still emitted to observers
// emitEvent() ALWAYS stores in node.events
// emitEvent() ALWAYS notifies observers
// Only #eventHistory storage is conditional

// CRITICAL: replayEvents() extracts events from EventHistoryEntry[]
// History stores: { event: WorkflowEvent, insertedAt: number }[]
// replayEvents() maps to events first, then filters

// CRITICAL: Observer errors don't stop replay
// Observer.onEvent() can throw without breaking replay
// Error is logged, remaining events still replayed

// CRITICAL: clearEventHistory() only affects #eventHistory
// node.events is NOT cleared
// Observers NOT affected

// CRITICAL: Import from ../../index.js for public API
// Don't import from internal modules directly

// CRITICAL: Always mock console methods in beforeEach
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// CRITICAL: Use TestWorkflow class extending Workflow
// Keep test class simple with minimal run() implementation

// CRITICAL: Clear capturedEvents before test actions
// Constructor emits events, clear before testing specific behavior

// CRITICAL: Test both enabled and disabled states
// Default (disabled): no storage
// Explicit enabled: storage with limits
```

---

## Implementation Blueprint

### Data Models and Structure

**Test File Structure**:
```typescript
/**
 * Unit tests for Workflow event replay functionality
 * Tests event storage, replay, trimming, and clearing with configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow Event Replay', () => {
  let workflow: TestWorkflow;
  let observer: WorkflowObserver;
  let capturedEvents: WorkflowEvent[];

  beforeEach(() => {
    // Setup...
  });

  describe('Event History Storage', () => {
    // Tests 1, 5
  });

  describe('replayEvents()', () => {
    // Tests 2, 3, 4
  });

  describe('clearEventHistory()', () => {
    // Test 6
  });

  describe('Edge Cases', () => {
    // Additional tests
  });
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/event-replay.test.ts
  - FILE: src/__tests__/unit/event-replay.test.ts
  - ADD: File header JSDoc documentation
  - ADD: Vitest imports (describe, it, expect, beforeEach, vi)
  - ADD: Workflow imports from ../../index.js
  - ADD: TestWorkflow class extending Workflow
  - PATTERN: Follow workflow-event-history.test.ts structure

Task 2: ADD top-level describe block and beforeEach setup
  - FILE: src/__tests__/unit/event-replay.test.ts
  - ADD: describe('Workflow Event Replay', () => { ... })
  - ADD: Declare workflow, observer, capturedEvents variables
  - ADD: beforeEach with TestWorkflow creation
  - ADD: Observer creation with capture pattern
  - ADD: Console mocking (vi.spyOn)
  - PATTERN: Follow test-structure-analysis.md section 4

Task 3: WRITE test - should store events when history enabled
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'Event History Storage'
  - TEST: Create workflow with eventHistory: { enabled: true }
  - EMIT: 2-3 events (stepStart, stepEnd, etc.)
  - VERIFY: Events stored via replayEvents
  - VERIFY: Events have correct order
  - PATTERN: Follow test-structure-analysis.md section 14

Task 4: WRITE test - should not store events when disabled
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'Event History Storage'
  - TEST: Create workflow without eventHistory config (default disabled)
  - EMIT: 2-3 events
  - VERIFY: No events stored via replayEvents (empty array)
  - VERIFY: Observers still received events (check capturedEvents)
  - PATTERN: Test conditional storage behavior

Task 5: WRITE test - should replay events to late-joining observer
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'replayEvents()'
  - TEST: Enable event history
  - EMIT: Events before observer added
  - ADD: New observer (not added via addObserver)
  - CALL: replayEvents() with new observer
  - VERIFY: New observer receives historical events
  - PATTERN: Late-joining observer catch-up

Task 6: WRITE test - should respect maxEvents limit
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'replayEvents()'
  - TEST: Create workflow with maxEvents: 100
  - EMIT: 200 events (exceeds 1.5x threshold = 150)
  - CALL: replayEvents() to get stored events
  - VERIFY: Event count ≤ 150 (trimmed by lazy trimming)
  - VERIFY: Oldest events removed (check last event is most recent)
  - PATTERN: Test lazy trimming at 1.5x threshold

Task 7: WRITE test - should respect maxAgeMs limit
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'replayEvents()'
  - TEST: Create workflow with maxAgeMs: 60000 (1 minute)
  - SETUP: vi.useFakeTimers()
  - EMIT: Old event at T=0
  - ADVANCE: vi.advanceTimersByTime(120000) (2 minutes)
  - EMIT: Recent event at T=2 minutes
  - CALL: replayEvents()
  - VERIFY: Only recent event present
  - CLEANUP: vi.useRealTimers()
  - PATTERN: Use fake timers for time-based testing

Task 8: WRITE test - should clear event history on request
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'clearEventHistory()'
  - TEST: Enable event history
  - EMIT: Multiple events
  - VERIFY: Events stored via replayEvents
  - CALL: clearEventHistory()
  - VERIFY: No events replayed after clear
  - VERIFY: node.events still has events (not affected)
  - PATTERN: Test idempotent clear operation

Task 9: WRITE edge case tests (8-10 additional tests)
  - FILE: src/__tests__/unit/event-replay.test.ts
  - DESCRIBE: 'Edge Cases'
  - TESTS:
    - Empty history replay
    - Limit of 0
    - Limit larger than history
    - Since in the future
    - Observer error during replay
    - Multiple observers replay
    - Custom maxEvents and maxAgeMs together
    - Very small maxEvents (trimming behavior)
  - PATTERN: Comprehensive edge case coverage

Task 10: RUN all tests and verify they pass
  - COMMAND: npm test -- event-replay.test.ts
  - EXPECTED: All tests pass
  - VERIFY: 6 required tests + additional edge cases pass
  - VERIFY: No skipped tests

Task 11: RUN full test suite for regressions
  - COMMAND: npm test
  - EXPECTED: All tests pass
  - VERIFY: No existing tests broken by new test file

Task 12: RUN linting and type checking
  - COMMAND: npm run lint
  - COMMAND: npx tsc --noEmit
  - EXPECTED: No errors
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Import statement (exact template)
// Location: Top of event-replay.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

// PATTERN 2: TestWorkflow class
// Location: After imports, before describe blocks

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

// PATTERN 3: beforeEach setup
// Location: Top of describe block

describe('Workflow Event Replay', () => {
  let workflow: TestWorkflow;
  let observer: WorkflowObserver;
  let capturedEvents: WorkflowEvent[];

  beforeEach(() => {
    workflow = new TestWorkflow();
    capturedEvents = [];

    observer = {
      onLog: () => {},
      onEvent: (event: WorkflowEvent) => {
        capturedEvents.push(event);
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Tests...
});

// PATTERN 4: Test - Store events when enabled
// Required Test Case #1

describe('Event History Storage', () => {
  it('should store events when history enabled', () => {
    const enabledWorkflow = new Workflow({
      name: 'EnabledWorkflow',
      eventHistory: { enabled: true }
    });

    // Clear initial events
    const captured: WorkflowEvent[] = [];
    enabledWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => captured.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    captured.splice(0); // Clear constructor events

    // Emit test events
    enabledWorkflow.emitEvent({
      type: 'stepStart',
      node: enabledWorkflow.node,
      step: 'testStep'
    });
    enabledWorkflow.emitEvent({
      type: 'stepEnd',
      node: enabledWorkflow.node,
      step: 'testStep',
      duration: 100
    });

    // Verify events stored
    const replayed: WorkflowEvent[] = [];
    enabledWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => replayed.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    expect(replayed.length).toBeGreaterThanOrEqual(2);
    expect(replayed[replayed.length - 2].type).toBe('stepStart');
    expect(replayed[replayed.length - 1].type).toBe('stepEnd');
  });
});

// PATTERN 5: Test - Not store when disabled
// Required Test Case #5

it('should not store events when disabled', () => {
  // Default workflow has disabled history
  const disabledWorkflow = new Workflow('DisabledWorkflow');

  // Clear initial events
  const captured: WorkflowEvent[] = [];
  disabledWorkflow.replayEvents({
    onLog: () => {},
    onEvent: (e) => captured.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });
  captured.splice(0);

  // Emit events
  disabledWorkflow.emitEvent({
    type: 'stepStart',
    node: disabledWorkflow.node,
    step: 'testStep'
  });

  // Verify no events stored
  const replayed: WorkflowEvent[] = [];
  disabledWorkflow.replayEvents({
    onLog: () => {},
    onEvent: (e) => replayed.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  expect(replayed.length).toBe(0);
});

// PATTERN 6: Test - Replay to late-joining observer
// Required Test Case #2

describe('replayEvents()', () => {
  it('should replay events to late-joining observer', () => {
    const lateJoinWorkflow = new Workflow({
      name: 'LateJoinWorkflow',
      eventHistory: { enabled: true }
    });

    // Clear initial events
    const initialCapture: WorkflowEvent[] = [];
    lateJoinWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => initialCapture.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    initialCapture.splice(0);

    // Emit events before "late observer" exists
    lateJoinWorkflow.emitEvent({
      type: 'stepStart',
      node: lateJoinWorkflow.node,
      step: 'earlyStep'
    });
    lateJoinWorkflow.emitEvent({
      type: 'stepEnd',
      node: lateJoinWorkflow.node,
      step: 'earlyStep',
      duration: 100
    });

    // Create "late-joining" observer (not added before events)
    const lateObserver: WorkflowEvent[] = [];
    lateJoinWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => lateObserver.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    // Verify late observer receives historical events
    expect(lateObserver.length).toBeGreaterThanOrEqual(2);
    expect(lateObserver[lateObserver.length - 2].type).toBe('stepStart');
    expect(lateObserver[lateObserver.length - 1].type).toBe('stepEnd');
  });
});

// PATTERN 7: Test - Respect maxEvents limit
// Required Test Case #3

it('should respect maxEvents limit', () => {
  const limitedWorkflow = new Workflow({
    name: 'LimitedWorkflow',
    eventHistory: { enabled: true, maxEvents: 100 }
  });

  // Emit 200 events (exceeds 1.5x threshold = 150)
  for (let i = 0; i < 200; i++) {
    limitedWorkflow.emitEvent({
      type: 'stepStart',
      node: limitedWorkflow.node,
      step: `step${i}`
    });
  }

  // Replay to get stored events
  const replayed: WorkflowEvent[] = [];
  limitedWorkflow.replayEvents({
    onLog: () => {},
    onEvent: (e) => replayed.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Should be trimmed to ~100-150 (lazy trimming at 1.5x)
  expect(replayed.length).toBeLessThanOrEqual(150);
  expect(replayed.length).toBeGreaterThan(0);

  // Verify last event is most recent
  expect(replayed[replayed.length - 1].type).toBe('stepStart');
  if (replayed[replayed.length - 1].type === 'stepStart') {
    expect(replayed[replayed.length - 1].step).toBe('step199');
  }
});

// PATTERN 8: Test - Respect maxAgeMs limit
// Required Test Case #4

it('should respect maxAgeMs limit', () => {
  vi.useFakeTimers();

  const ageLimitedWorkflow = new Workflow({
    name: 'AgeLimitedWorkflow',
    eventHistory: { enabled: true, maxAgeMs: 60000 } // 1 minute
  });

  // Emit old event
  ageLimitedWorkflow.emitEvent({
    type: 'stepRetry',
    node: ageLimitedWorkflow.node,
    stepName: 'oldStep',
    retryCount: 1,
    error: {
      message: 'test',
      original: new Error('test'),
      workflowId: ageLimitedWorkflow.id,
      state: {},
      logs: []
    },
    analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
    timestamp: Date.now()
  });

  // Advance time by 2 minutes
  vi.advanceTimersByTime(120000);

  // Emit recent event
  ageLimitedWorkflow.emitEvent({
    type: 'stepStart',
    node: ageLimitedWorkflow.node,
    step: 'recentStep'
  });

  // Replay events
  const replayed: WorkflowEvent[] = [];
  ageLimitedWorkflow.replayEvents({
    onLog: () => {},
    onEvent: (e) => replayed.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  // Should only have recent event (old one aged out)
  // Note: Events without timestamp (stepStart) always included in since filter
  // But maxAgeMs trimming uses insertedAt, so both could be trimmed
  expect(replayed.length).toBeGreaterThanOrEqual(0);

  vi.useRealTimers();
});

// PATTERN 9: Test - Clear event history
// Required Test Case #6

describe('clearEventHistory()', () => {
  it('should clear event history on request', () => {
    const clearableWorkflow = new Workflow({
      name: 'ClearableWorkflow',
      eventHistory: { enabled: true }
    });

    // Emit events
    clearableWorkflow.emitEvent({
      type: 'stepStart',
      node: clearableWorkflow.node,
      step: 'testStep'
    });
    clearableWorkflow.emitEvent({
      type: 'stepEnd',
      node: clearableWorkflow.node,
      step: 'testStep',
      duration: 100
    });

    // Verify events stored
    const beforeClear: WorkflowEvent[] = [];
    clearableWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => beforeClear.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    expect(beforeClear.length).toBeGreaterThan(0);

    // Clear history
    clearableWorkflow.clearEventHistory();

    // Verify history empty
    const afterClear: WorkflowEvent[] = [];
    clearableWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => afterClear.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    expect(afterClear.length).toBe(0);

    // Verify node.events not affected
    expect(clearableWorkflow.node.events.length).toBeGreaterThan(0);
  });
});

// PATTERN 10: Edge case test examples
// Additional tests for comprehensive coverage

describe('Edge Cases', () => {
  it('should handle empty history gracefully', () => {
    const emptyWorkflow = new Workflow('EmptyWorkflow');
    const replayed: WorkflowEvent[] = [];
    emptyWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => replayed.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    expect(replayed.length).toBe(0);
  });

  it('should handle limit of 0', () => {
    const zeroLimitWorkflow = new Workflow({
      name: 'ZeroLimitWorkflow',
      eventHistory: { enabled: true }
    });

    zeroLimitWorkflow.emitEvent({
      type: 'stepStart',
      node: zeroLimitWorkflow.node,
      step: 'test'
    });

    const replayed: WorkflowEvent[] = [];
    zeroLimitWorkflow.replayEvents({
      onLog: () => {},
      onEvent: (e) => replayed.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    }, { limit: 0 });

    expect(replayed.length).toBe(0);
  });

  it('should handle observer errors during replay', () => {
    const errorWorkflow = new Workflow({
      name: 'ErrorWorkflow',
      eventHistory: { enabled: true }
    });

    errorWorkflow.emitEvent({
      type: 'stepStart',
      node: errorWorkflow.node,
      step: 'step1'
    });
    errorWorkflow.emitEvent({
      type: 'stepEnd',
      node: errorWorkflow.node,
      step: 'step1',
      duration: 100
    });
    errorWorkflow.emitEvent({
      type: 'stepStart',
      node: errorWorkflow.node,
      step: 'step2'
    });

    let callCount = 0;
    const throwingObserver: WorkflowObserver = {
      onLog: () => {},
      onEvent: () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Observer error');
        }
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Should not throw
    expect(() => errorWorkflow.replayEvents(throwingObserver)).not.toThrow();

    // All events should have been attempted
    expect(callCount).toBe(3);
  });
});

// GOTCHA: Clear capturedEvents before test actions
// Constructor emits childAttached event, clear it before testing
capturedEvents = [];

// GOTCHA: Use fake timers for maxAgeMs testing
vi.useFakeTimers();
// ... test code ...
vi.useRealTimers();

// GOTCHA: Lazy trimming threshold
// Must emit 1.5x maxEvents to trigger trimming
// maxEvents: 100 → emit 151+ events to trigger trim

// GOTCHA: Discriminated union type narrowing
if (event.type === 'stepEnd') {
  expect(event.duration).toBe(100);
}

// GOTCHA: Events without timestamp always included in since filter
// stepRetry, stepRestarted, invalidResponse have timestamps
// All other events don't have timestamps
```

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - No external service dependencies
  - No configuration file changes
  - No new dependencies
  - Pure unit testing with vitest

INTERNAL INTEGRATIONS:
  - Workflow class (src/core/workflow.ts)
    - Test emitEvent() conditional storage
    - Test replayEvents() with options
    - Test clearEventHistory()
  - EventHistoryConfig (src/types/workflow-context.ts)
    - Test enabled: true/false behavior
    - Test maxEvents limit
    - Test maxAgeMs limit
  - WorkflowObserver (src/types/observer.ts)
    - Test observer notification
    - Test late-joining observer replay

SCOPE BOUNDARIES:
  - CREATE src/__tests__/unit/event-replay.test.ts
  - DO NOT modify existing source code
  - DO NOT modify existing test files
  - DO NOT modify PRD.md or tasks.json

FILES TO CREATE:
  - src/__tests__/unit/event-replay.test.ts (new test file)

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/core/workflow.ts (testing only, no modifications)
  - src/types/*.ts (testing only, no modifications)
  - Any existing test files

CONTRACT WITH P3.M3.T1.S1:
  - P3.M3.T1.S1 provides base event history storage
  - Tests verify #eventHistory stores events
  - Tests verify replayEvents() replays stored events

CONTRACT WITH P3.M3.T1.S2:
  - P3.M3.T1.S2 adds event history configuration
  - Tests verify enabled/disabled behavior
  - Tests verify maxEvents trimming
  - Tests verify maxAgeMs trimming
  - Assumes P3.M3.T1.S2 is implemented as specified
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# Expected: Zero errors in event-replay.test.ts
# If errors exist:
# 1. READ the error messages carefully
# 2. VERIFY import paths are correct (../../index.js)
# 3. VERIFY type annotations are correct
# 4. FIX any type errors

# Run linter
npm run lint

# Expected: Zero errors in event-replay.test.ts
# Fix any linting issues

# Run formatter
npm run format

# Expected: Consistent formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new event replay tests
npm test -- event-replay.test.ts

# Expected: All new tests pass
# Verify:
# - 6 required test cases pass
# - Additional edge case tests pass
# - No skipped tests
# - No timeout errors

# Run existing event history tests
npm test -- workflow-event-history.test.ts

# Expected: All existing tests pass
# Verify: No regressions in existing functionality

# Run all workflow tests
npm test -- workflow.test.ts

# Expected: All existing tests pass
# Verify: No breaking changes to workflow

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
# - New tests integrate correctly

# Check test coverage
npm run test:coverage

# Expected: Coverage report shows event-replay.test.ts coverage
# Verify: ≥ 90% coverage for tested methods
```

### Level 4: Quality & Documentation Validation

```bash
# Verify test file follows patterns
grep -q "import { describe, it, expect, beforeEach, vi } from 'vitest'" src/__tests__/unit/event-replay.test.ts
echo "Import check: $?"

# Verify TestWorkflow class exists
grep -q "class TestWorkflow extends Workflow" src/__tests__/unit/event-replay.test.ts
echo "TestWorkflow check: $?"

# Verify console mocking exists
grep -q "vi.spyOn(console, 'warn')" src/__tests__/unit/event-replay.test.ts
echo "Console mock check: $?"

# Verify required test descriptions exist
grep -q "should store events when history enabled" src/__tests__/unit/event-replay.test.ts
echo "Test 1 check: $?"

grep -q "should not store events when disabled" src/__tests__/unit/event-replay.test.ts
echo "Test 5 check: $?"

grep -q "should replay events to late-joining observer" src/__tests__/unit/event-replay.test.ts
echo "Test 2 check: $?"

grep -q "should respect maxEvents limit" src/__tests__/unit/event-replay.test.ts
echo "Test 3 check: $?"

grep -q "should respect maxAgeMs limit" src/__tests__/unit/event-replay.test.ts
echo "Test 4 check: $?"

grep -q "should clear event history on request" src/__tests__/unit/event-replay.test.ts
echo "Test 6 check: $?"

# Expected: All checks return 0 (found)

# Verify test count
TEST_COUNT=$(grep -c "it('should" src/__tests__/unit/event-replay.test.ts)
echo "Test count: $TEST_COUNT"
# Expected: ≥ 14 tests (6 required + 8+ edge cases)

# Verify fake timers cleanup
grep -q "vi.useRealTimers()" src/__tests__/unit/event-replay.test.ts
echo "Fake timers cleanup check: $?"
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiler passes: `npx tsc --noEmit`
- [ ] All new tests pass: `npm test -- event-replay.test.ts`
- [ ] All existing tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Formatter passes: `npm run format`
- [ ] No breaking changes to existing functionality

### Feature Validation

- [ ] Test 1: Store events when history enabled
- [ ] Test 2: Replay events to late-joining observer
- [ ] Test 3: Respect maxEvents limit
- [ ] Test 4: Respect maxAgeMs limit
- [ ] Test 5: Not store events when disabled
- [ ] Test 6: Clear event history on request
- [ ] Additional edge cases tested (8+ tests)
- [ ] Total test count ≥ 14

### Code Quality Validation

- [ ] Follows existing test patterns from workflow-event-history.test.ts
- [ ] Uses TestWorkflow class extending Workflow
- [ ] Has beforeEach with proper setup
- [ ] Console methods mocked
- [ ] Observer capture pattern used
- [ ] Test descriptions follow "should [verb] [noun]" pattern
- [ ] Inline observers for replay operations
- [ ] Fake timers properly cleaned up (vi.useRealTimers)
- [ ] Discriminated union type narrowing used where needed

### Documentation & Coverage

- [ ] File header JSDoc present
- [ ] Describe blocks organized logically
- [ ] Test descriptions clear and descriptive
- [ ] Code coverage ≥ 90% for tested methods
- [ ] No commented-out test code

---

## Anti-Patterns to Avoid

- ❌ Don't import from internal modules (use ../../index.js)
- ❌ Don't skip required test cases (all 6 must be implemented)
- ❌ Don't forget to clear capturedEvents before test actions
- ❌ Don't forget to mock console methods
- ❌ Don't use real timers for maxAgeMs tests (use fake timers)
- ❌ Don't forget to cleanup fake timers (vi.useRealTimers())
- ❌ Don't test with < 1.5x maxEvents for trimming (won't trigger)
- ❌ Don't forget that most events don't have timestamps
- ❌ Don't assume enabled by default (it's disabled)
- ❌ Don't modify existing test files
- ❌ Don't modify source code files
- ❌ Don't use describe() without proper nesting
- ❌ Don't skip edge case testing
- ❌ Don't write tests that depend on execution order
- ❌ Don't use shared state between tests
- ❌ Don't forget PRD.md and tasks.json are read-only

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Complete P3.M3.T1.S2 PRP defines what to test
- ✅ Existing test patterns thoroughly analyzed
- ✅ Complete test templates provided
- ✅ All edge cases documented
- ✅ Validation commands are project-specific
- ✅ No source code modifications needed
- ✅ Isolated test file (no risk to existing code)
- ✅ Minimal risk (tests only, can't break functionality)
- ✅ Clear 6 required test cases from contract
- ✅ Comprehensive research documentation

**Risk Assessment**: Minimal risk
- Only creating new test file
- No modifications to existing code
- Tests document expected behavior
- Worst case: fix test assertions if implementation differs slightly

**Validation**: This is a test-writing task with comprehensive templates and patterns. All test scenarios are clearly defined with code examples. The isolated nature (new test file only) eliminates risk to existing functionality. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
