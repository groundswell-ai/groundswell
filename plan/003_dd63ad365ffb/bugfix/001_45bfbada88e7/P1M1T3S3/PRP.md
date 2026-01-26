name: "PRP: Add stepRestarted event type to WorkflowEvent discriminated union"
description: |

---

## Goal

**Feature Goal**: Complete the `stepRestarted` event type in the WorkflowEvent discriminated union with proper structure including `timestamp` property.

**Deliverable**: Updated `WorkflowEvent` type in `src/types/events.ts` with the complete `stepRestarted` event type definition matching the contract specification and aligned with the existing implementation.

**Success Definition**:
- The `stepRestarted` event type includes all required properties: `type`, `node`, `stepName`, `retryCount`, `restoredState`, and `timestamp`
- The event type structure matches the contract specification from the work item
- The event type structure aligns with the actual event emission in `workflow.ts`
- The event type follows the same pattern as the `stepRetry` event type
- All existing tests continue to pass (no breaking changes to existing event consumers)

## User Persona

**Target User**: Framework developers and workflow observers who consume workflow events

**Use Case**: When a step is restarted via the `restartStep()` method, observers need to receive a `stepRestarted` event containing complete information about the restart including the timestamp for observability and debugging.

**User Journey**:
1. Parent workflow calls `restartStep()` to restart a failed step
2. The `restartStep()` method emits a `stepRestarted` event
3. Observers receive the event with complete information (step name, retry count, restored state, and timestamp)
4. Observers can track when the restart occurred and analyze the workflow execution timeline

**Pain Points Addressed**:
- **Incomplete event data**: Missing `timestamp` prevents accurate timeline tracking
- **Inconsistent event structure**: Should match the pattern of similar events like `stepRetry`
- **Contract compliance**: Event structure must match the specification

## Why

- **Contract Compliance**: The work item specification explicitly requires `timestamp` in the event structure
- **Observability**: Timestamp is essential for debugging and analyzing workflow execution timelines
- **Consistency**: The `stepRetry` event includes `timestamp`, so `stepRestarted` should too
- **Integration**: Ensures compatibility with event consumers that expect timestamp on time-sensitive events

## What

Update the `stepRestarted` event type in the `WorkflowEvent` discriminated union to include the `timestamp` property and ensure proper alignment with the implementation.

**Current state** (line 17 in `src/types/events.ts`):
```typescript
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; state: SerializedWorkflowState }
```

**Required state** (per contract and stepRetry pattern):
```typescript
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }
```

**Changes required**:
1. Add `timestamp: number` property to match the contract specification
2. The property name `restoredState` (contract) vs `state` (implementation) needs alignment
3. Ensure the event emission in `workflow.ts` includes the timestamp

### Success Criteria

- [ ] `stepRestarted` event type includes `timestamp: number` property
- [ ] Event type structure matches the contract specification
- [ ] Event type aligns with the actual event emission in `workflow.ts`
- [ ] Event type follows the same pattern as `stepRetry` event
- [ ] All existing tests pass without modification
- [ ] TypeScript compilation succeeds with no type errors

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test validation**:
- ✅ Exact file path and line number for the change
- ✅ Complete type definitions for all referenced types
- ✅ Existing event type patterns to follow
- ✅ Event emission pattern in implementation
- ✅ Test patterns that validate the event
- ✅ Understanding of discriminated union pattern in TypeScript
- ✅ Knowledge of similar event (stepRetry) structure

### Documentation & References

```yaml
# CRITICAL: The stepRestarted event type definition (currently incomplete)
- file: src/types/events.ts
  why: This is the file that needs to be modified - line 17
  pattern: Add timestamp property to match stepRetry pattern (line 16)
  gotcha: The property name is 'state' in implementation but 'restoredState' in contract - need to align

# CRITICAL: stepRetry event type - the pattern to follow
- file: src/types/events.ts:16
  why: stepRetry event has the same structure and includes timestamp
  pattern: { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  gotcha: Use timestamp: number (not Date) - value is Date.now()

# CRITICAL: Event emission location for stepRestarted
- file: src/core/workflow.ts:553-559
  why: This is where the event is actually emitted - must match the type definition
  pattern: this.emitEvent({ type: 'stepRestarted', node: this.node, stepName, retryCount, state: restoredState })
  gotcha: The emission uses 'state' not 'restoredState' - needs to match type definition

# CRITICAL: SerializedWorkflowState type definition
- file: src/types/snapshot.ts:4
  why: Type definition for the restoredState property
  pattern: export type SerializedWorkflowState = Record<string, unknown>
  gotcha: Simple key-value object type

# CRITICAL: WorkflowNode type definition
- file: src/types/workflow.ts
  why: Type definition for the node property
  pattern: interface WorkflowNode with events, logs, stateSnapshot properties
  gotcha: Node is the workflow tree node reference

# CRITICAL: Test patterns for stepRestarted event validation
- file: src/__tests__/unit/workflow-restart-step.test.ts
  why: Shows how tests validate the stepRestarted event
  pattern: Filter by type, use type guard, assert properties (lines 229-238)
  gotcha: Tests use discriminated union narrowing: if (event.type === 'stepRestarted')

# CRITICAL: Discriminated union pattern in TypeScript
- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
  why: Understanding the pattern used for WorkflowEvent type
  critical: The 'type' property is the discriminant that enables type narrowing
  pattern: Use if (event.type === 'eventName') to narrow the type

# REFERENCE: RestartAnalysis type (used in stepRetry but not stepRestarted)
- file: src/types/restart.ts
  why: Understanding what stepRetry includes that stepRestarted doesn't
  pattern: { restartable: boolean; reason: string; suggestedAction: 'retry' | 'abort' | 'continue' }
  gotcha: stepRestarted doesn't include analysis because it's a successful completion

# REFERENCE: stepRetry event emission pattern
- file: src/decorators/step.ts:203-211
  why: Shows how stepRetry includes timestamp in emission
  pattern: timestamp: Date.now()
  gotcha: timestamp is a number (milliseconds since epoch), not a Date object

# REFERENCE: WorkflowEvent discriminated union structure
- file: src/types/events.ts:10-79
  why: Understanding the overall structure and placement
  pattern: All events are union members with 'type' as discriminant
  gotcha: Events are grouped by category (core workflow, agent/prompt, tool, MCP, etc.)

# REFERENCE: Observer pattern for event consumption
- file: src/types/observer.ts
  why: Understanding how events are consumed
  pattern: onEvent(event: WorkflowEvent): void
  gotcha: Events flow from child to root and are broadcast to all root observers

# External research: TypeScript discriminated unions
- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
  why: Understanding type narrowing with discriminated unions
  critical: The discriminant property ('type') enables TypeScript to narrow the union type
  pattern: if (event.type === 'stepRestarted') { /* TypeScript knows event is stepRestarted type */ }
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── events.ts            # MODIFY: Line 17 - Add timestamp to stepRestarted event
│   ├── workflow.ts          # REFERENCE: WorkflowNode type definition
│   ├── snapshot.ts          # REFERENCE: SerializedWorkflowState type
│   ├── restart.ts           # REFERENCE: RestartAnalysis type
│   └── index.ts             # REFERENCE: Type exports
├── core/
│   └── workflow.ts          # REFERENCE: Event emission at lines 553-559
├── decorators/
│   └── step.ts              # REFERENCE: stepRetry event pattern at lines 203-211
└── __tests__/
    └── unit/
        └── workflow-restart-step.test.ts  # REFERENCE: Test patterns at lines 229-238
```

### Desired Codebase Tree with Changes

```bash
src/
└── types/
    └── events.ts            # ✏️ MODIFY: Line 17 - Add timestamp: number to stepRestarted event
```

**Note**: Only one file needs to be modified. The event emission in `workflow.ts` will also need to be updated to include the timestamp.

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Property name mismatch between contract and implementation
// Contract specification says: restoredState: SerializedWorkflowState
// Current implementation uses: state: restoredState (in workflow.ts:558)
// Decision: Use 'restoredState' in type definition to match contract, update implementation

// CRITICAL: Timestamp is a number, not a Date object
// Follow the pattern from stepRetry: timestamp: Date.now() (step.ts:210)
// The type is 'number' (milliseconds since epoch), not 'Date'

// CRITICAL: Discriminated union type narrowing
// When checking event types, use type guards for proper narrowing
if (event.type === 'stepRestarted') {
  // TypeScript now knows event has stepName, retryCount, restoredState, timestamp
  expect(event.timestamp).toBeGreaterThan(0);
}

// CRITICAL: Event order in WorkflowEvent union
// stepRestarted is positioned between stepRetry and stepEnd (line 17)
// Maintain this logical ordering of step-related events

// CRITICAL: All step-related events include node: WorkflowNode
// This is consistent across stepStart, stepRetry, stepRestarted, stepEnd

// CRITICAL: Property naming conventions
// stepName is used (not 'step') - consistent with stepRetry
// retryCount is the attempt number (1-based), not number of retries

// CRITICAL: Tests already exist and validate the event
// Tests at workflow-restart-step.test.ts:232-238 check for 'state' property
// After adding 'restoredState', tests may need updating OR we keep 'state' as the property name

// CRITICAL: The stepRestarted event is already being emitted
// workflow.ts:553-559 already emits this event
// We just need to add timestamp to the type definition and the emission
```

## Implementation Blueprint

### Data Models and Structure

**Current incomplete event type**:
```typescript
// File: src/types/events.ts
// Line: 17
// Current (INCOMPLETE - missing timestamp):
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; state: SerializedWorkflowState }
```

**Required complete event type**:
```typescript
// File: src/types/events.ts
// Line: 17
// Target (COMPLETE with timestamp):
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }
```

**Key decision points**:
1. **Property name**: Should it be `state` (current implementation) or `restoredState` (contract spec)?
   - **Decision**: Use `restoredState` to match the contract specification
   - **Action**: Update both the type definition AND the event emission in workflow.ts

2. **Timestamp type**: Should be `number` (milliseconds) not `Date`
   - **Decision**: Use `number` to match the stepRetry pattern
   - **Value**: `Date.now()` when emitting the event

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/events.ts - Update stepRestarted event type
  - LOCATION: Line 17
  - CURRENT: { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; state: SerializedWorkflowState }
  - CHANGE TO: { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }
  - RENAME: 'state' property to 'restoredState' (to match contract)
  - ADD: 'timestamp: number' property
  - MAINTAIN: Position in discriminated union (between stepRetry and stepEnd)

Task 2: MODIFY src/core/workflow.ts - Update event emission to include timestamp
  - LOCATION: Lines 553-559
  - CURRENT EMIT: { type: 'stepRestarted', node: this.node, stepName, retryCount, state: restoredState }
  - CHANGE TO: { type: 'stepRestarted', node: this.node, stepName, retryCount, restoredState, timestamp: Date.now() }
  - RENAME: 'state' key to 'restoredState' (to match type definition)
  - ADD: 'timestamp: Date.now()' property
  - PATTERN: Follow stepRetry emission pattern (step.ts:210)

Task 3: VERIFY src/__tests__/unit/workflow-restart-step.test.ts - Update tests if needed
  - LOCATION: Lines 232-238, 268-270, 301-304, 361-364, 398-402
  - CHECK: Tests reference 'state' property - may need to change to 'restoredState'
  - UPDATE: Change 'expect(event.state).toBeDefined()' to 'expect(event.restoredState).toBeDefined()'
  - VERIFY: Add timestamp validation if not present
  - ENSURE: All tests pass after changes
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN: stepRestarted event type definition (events.ts:17)
// ============================================================
// Must match the contract specification and align with implementation

// BEFORE (current - incomplete):
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; state: SerializedWorkflowState }

// AFTER (target - complete):
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }

// Key changes:
// 1. Renamed 'state' to 'restoredState' (matches contract, more descriptive)
// 2. Added 'timestamp: number' (matches contract and stepRetry pattern)

// ============================================================
// PATTERN: Event emission with timestamp (workflow.ts:553-559)
// ============================================================
// Follow the stepRetry pattern for including timestamp

// BEFORE (current - missing timestamp):
this.emitEvent({
  type: 'stepRestarted',
  node: this.node,
  stepName,
  retryCount,
  state: restoredState,
});

// AFTER (target - with timestamp):
this.emitEvent({
  type: 'stepRestarted',
  node: this.node,
  stepName,
  retryCount,
  restoredState,  // Renamed from 'state'
  timestamp: Date.now(),  // Added timestamp
});

// ============================================================
// PATTERN: Type guard for discriminated union (test pattern)
// ============================================================
// Tests use discriminated union narrowing to access event properties

const restartedEvents = events.filter(e => e.type === 'stepRestarted');
if (restartedEvents[0]?.type === 'stepRestarted') {
  expect(restartedEvents[0].stepName).toBe('myStep');
  expect(restartedEvents[0].retryCount).toBe(2);
  expect(restartedEvents[0].node).toBe(wf.node);
  expect(restartedEvents[0].restoredState).toBeDefined();  // Changed from 'state'
  expect(restartedEvents[0].timestamp).toBeGreaterThan(0);  // Add timestamp validation
}

// ============================================================
// COMPARISON: stepRetry vs stepRestarted event structure
// ============================================================
// stepRetry (reference pattern - events.ts:16):
| { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }

// stepRestarted (target - events.ts:17):
| { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }

// Similarities:
// - Both include: type, node, stepName, retryCount, timestamp
// - Both use number for timestamp (Date.now())

// Differences:
// - stepRetry includes: analysis (RestartAnalysis), error (WorkflowError)
// - stepRestarted includes: restoredState (SerializedWorkflowState)
// - stepRetry is emitted BEFORE retry (with error info)
// - stepRestarted is emitted AFTER successful restart (with state info)
```

### Integration Points

```yaml
EVENTS:
  - modify: src/types/events.ts:17
  - pattern: "Add timestamp: number and rename state to restoredState"
  - alignment: "Match contract specification and stepRetry pattern"

EMISSION:
  - modify: src/core/workflow.ts:553-559
  - pattern: "Add timestamp: Date.now() and rename state to restoredState"
  - reference: "Follow step.ts:210 pattern for timestamp emission"

TESTS:
  - verify: src/__tests__/unit/workflow-restart-step.test.ts
  - pattern: "Update property references from state to restoredState"
  - coverage: "Add timestamp validation to existing test assertions"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Expected: Zero type errors
# If errors occur:
# - Check that type definition matches event emission exactly
# - Verify property names match (restoredState, state, etc.)
# - Ensure timestamp is typed as 'number', not 'Date'

# Run linter if configured
npm run lint

# Expected: Zero linting errors
# Common issues: Inconsistent property names, missing commas
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the specific functionality related to stepRestarted event
npm test -- workflow-restart-step.test.ts -v

# Expected: All tests pass
# If tests fail:
# - Check if tests reference 'state' property (should be 'restoredState')
# - Verify event emission includes all required properties
# - Ensure timestamp is being emitted correctly

# Run all unit tests to ensure no breaking changes
npm test -- src/__tests__/unit/ -v

# Expected: All existing tests pass
# Coverage: The change should not break any other event consumers

# Run full test suite
npm test -v

# Expected: All tests pass (existing + new verification)
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npm test -- src/__tests__/integration/ -v

# Expected: All integration tests pass
# Verify: Event observers receive the updated event structure correctly

# Manual verification: Check event structure in debugger/observer
# Create a simple test workflow that triggers stepRestarted event
# Verify the event contains: type, node, stepName, retryCount, restoredState, timestamp
```

### Level 4: Manual & Domain-Specific Validation

```bash
# Manual verification: Inspect the emitted event
# Add temporary logging or use existing observer to inspect event structure

import { Workflow, Step } from './src/index.js';

class TestWorkflow extends Workflow {
  @Step({ restartable: true })
  async testStep(): Promise<string> {
    return 'success';
  }

  async run(): Promise<void> {
    const events = [];
    this.addObserver({ onEvent: (e) => events.push(e) });

    await this.restartStep('testStep', { retryCount: 1 });

    const restartedEvent = events.find(e => e.type === 'stepRestarted');
    console.log('Event structure:', JSON.stringify(restartedEvent, null, 2));

    // Verify structure:
    // {
    //   type: 'stepRestarted',
    //   node: <WorkflowNode>,
    //   stepName: 'testStep',
    //   retryCount: 2,
    //   restoredState: <SerializedWorkflowState>,
    //   timestamp: <number>  // <-- This should exist
    // }
  }
}

const wf = new TestWorkflow();
wf.run().catch(console.error);

# Expected: Console output shows the event with timestamp property
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test -v`
- [ ] Event type includes `timestamp: number` property
- [ ] Event type uses `restoredState` property name (not `state`)
- [ ] Event emission includes `timestamp: Date.now()`
- [ ] Event emission uses `restoredState` property name (not `state`)
- [ ] No type errors in discriminated union

### Feature Validation

- [ ] Event structure matches contract specification
- [ ] Event structure matches stepRetry pattern
- [ ] Event emission in workflow.ts matches type definition
- [ ] Tests validate all event properties including timestamp
- [ ] Property names are consistent between type and emission
- [ ] No breaking changes to existing event consumers

### Code Quality Validation

- [ ] Event type positioned correctly in discriminated union
- [ ] Property names are descriptive and consistent
- [ ] Follows existing event type patterns
- [ ] Proper TypeScript typing throughout
- [ ] Comments/documentations are accurate

### Documentation & Deployment

- [ ] Type definition is self-documenting with clear property names
- [ ] Event structure is clear from the type definition
- [ ] No breaking changes to existing APIs
- [ ] Changes are minimal and focused

---

## Anti-Patterns to Avoid

- ❌ Don't use `Date` type for timestamp - use `number` (milliseconds)
- ❌ Don't forget to update both the type definition AND the event emission
- ❌ Don't keep inconsistent property names between type and emission
- ❌ Don't skip updating tests to match new property names
- ❌ Don't change the order of events in the discriminated union
- ❌ Don't add unnecessary properties not in the contract specification
- ❌ Don't remove existing properties (only add timestamp and rename)
- ❌ Don't break existing tests - all tests must pass after changes

---

## Research Summary

### Key Findings from Codebase Analysis

1. **Event Already Partially Implemented**: The `stepRestarted` event type exists at line 17 of `src/types/events.ts` but is missing the `timestamp` property as specified in the contract.

2. **Property Name Mismatch**: The contract specification uses `restoredState` but the current implementation uses `state`. This needs to be aligned.

3. **Event Emission Exists**: The event is already being emitted in `src/core/workflow.ts` at lines 553-559, but without the timestamp property.

4. **Tests Already Exist**: Comprehensive tests exist in `src/__tests__/unit/workflow-restart-step.test.ts` that validate the event structure, but they reference the `state` property that needs to be renamed to `restoredState`.

5. **Pattern to Follow**: The `stepRetry` event at line 16 of `src/types/events.ts` provides the perfect pattern - it includes `timestamp: number` and uses similar structure.

6. **Discriminated Union Pattern**: The codebase uses standard TypeScript discriminated union patterns with `type` as the discriminant property.

### Implementation Constraints

1. **Must match contract specification**: Event structure must include `restoredState` and `timestamp`
2. **Must maintain backward compatibility**: Existing event consumers should not break (tests may need minor updates)
3. **Must follow existing patterns**: Align with `stepRetry` event structure
4. **Minimal changes required**: Only add timestamp and rename property - no structural changes

---

## Success Metrics

**Confidence Score**: 10/10

**Rationale**:
- ✅ Very focused change - only adding one property and renaming another
- ✅ Clear pattern to follow from `stepRetry` event
- ✅ Implementation already exists, just needs completion
- ✅ Tests already exist, just need property name updates
- ✅ No new logic or algorithms required
- ✅ No breaking changes to API surface
- ✅ Type system will catch any mismatches

**Validation**: The completed PRP provides:
- Exact file location and line number for the change
- Complete before/after comparison
- Clear property name decision rationale
- Test update instructions
- All context needed for one-pass implementation
- No ambiguous requirements or missing dependencies

---

**PRP Version**: 1.0
**Work Item**: P1.M1.T3.S3
**Created**: 2026-01-26
**Status**: Ready for Implementation
