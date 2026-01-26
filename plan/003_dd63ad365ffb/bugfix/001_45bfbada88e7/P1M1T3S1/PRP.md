name: "PRP: Add restartStep method to Workflow base class"
description: |

---

## Goal

**Feature Goal**: Add a `restartStep(stepName, options)` method to the Workflow base class that enables manual step restart with state restoration, retry limit enforcement, and event emission.

**Deliverable**: New `restartStep` method in `src/core/workflow.ts` that:
- Validates step metadata (restartable flag, max retries)
- Restores state from snapshot or override
- Re-executes the step method with preserved context
- Emits stepRestarted event
- Enforces retry limits with clear error messages

**Success Definition**:
- Method exists on Workflow class and is callable
- Throws `WorkflowError` when step is not found or not restartable
- Throws `WorkflowError` when max retries exceeded
- Restores and re-executes step successfully with valid inputs
- Emits `stepRestarted` event with correct payload
- All existing tests continue to pass (154 tests)

## User Persona

**Target User**: Framework user implementing parent-level error handling and restart logic

**Use Case**: When a workflow detects a child step failure (via stepRetry event), the parent workflow needs to programmatically restart that specific step with restored state and retry tracking.

**User Journey**:
1. Parent workflow observes `stepRetry` event from child step
2. Parent analyzes error using `analyzeErrorForRestart`
3. Parent decides to retry and calls `await this.restartStep('failingStep', { retryCount: 1, maxRetries: 3 })`
4. State is restored and step re-executes
5. `stepRestarted` event is emitted for observability

**Pain Points Addressed**:
- **Manual restart coordination**: Currently no way to programmatically restart a failed step
- **State restoration**: Need to restore workflow state before retry
- **Retry tracking**: Need to enforce max retries across manual and automatic retries
- **Observability**: Need events to track manual restart attempts

## Why

- **PRD Compliance**: Section 11 requires restartable steps with parent-driven restart decisions
- **Error Recovery**: Enables sophisticated error handling strategies beyond automatic retries
- **State Consistency**: Ensures workflow state is properly restored before retry attempts
- **Integration**: Works with existing `analyzeErrorForRestart` utility and `@Step` decorator options

## What

Add a public `restartStep` method to the Workflow base class with the following signature:

```typescript
interface RestartStepOptions {
  retryCount?: number;
  maxRetries?: number;
  stateOverride?: SerializedWorkflowState;
}

async restartStep(stepName: string, options?: RestartStepOptions): Promise<unknown>;
```

**Behavior**:
1. **Validation**: Check if step metadata exists and `restartable === true`
2. **Retry Calculation**: Calculate `retryCount = (options.retryCount ?? 0) + 1`
3. **Limit Check**: Throw if `retryCount > (options.maxRetries ?? stepMeta.maxRetries ?? 3)`
4. **State Restoration**: Use `options.stateOverride` or call `this.snapshotState()`
5. **Execution**: Call `this[stepName]()` with restored context
6. **Event Emission**: Emit `stepRestarted` event with metadata

### Success Criteria

- [ ] `restartStep` method exists on Workflow class
- [ ] Throws when step metadata not found with clear error message
- [ ] Throws when step is not marked as restartable
- [ ] Throws when max retries exceeded with retry count in message
- [ ] Restores state before re-execution
- [ ] Emits `stepRestarted` event (add to WorkflowEvent type)
- [ ] Returns step execution result
- [ ] All 154 existing tests pass
- [ ] New tests cover all error paths and success cases

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test validation**:
- ✅ Exact file paths and line numbers for all referenced patterns
- ✅ Complete type definitions for all interfaces
- ✅ Existing event emission patterns with examples
- ✅ Test patterns with concrete examples
- ✅ Error handling patterns with WorkflowError creation
- ⚠️ **CRITICAL**: No step metadata storage exists - decorator uses closure variables
- ⚠️ **CRITICAL**: No state restoration logic exists - only snapshotting

### Documentation & References

```yaml
# CRITICAL: Step decorator does NOT store persistent metadata
- file: src/decorators/step.ts
  why: Understand @Step decorator implementation - uses closure variables, not persistent metadata
  pattern: Step options are closure-scoped (lines 71-76), not stored for later access
  gotcha: Cannot retrieve step options from Workflow class - must use decorator pattern differently

# CRITICAL: State snapshotting exists but restoration does NOT
- file: src/core/workflow.ts
  why: snapshotState() method for state capture (lines 434-456)
  pattern: Calls getObservedState(this) and stores in node.stateSnapshot
  gotcha: No restoreState() method exists - state is captured but cannot be restored

# Event emission pattern
- file: src/core/workflow.ts
  why: emitEvent() method pattern (lines 413-429)
  pattern: this.emitEvent({ type: 'eventName', node: this.node, ...payload })
  gotcha: Events stored in node.events array and broadcast to root observers

# Event type definitions
- file: src/types/events.ts
  why: WorkflowEvent discriminated union - need to add stepRestarted event type
  pattern: { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; ... }
  gotcha: Use discriminated union pattern for type safety

# WorkflowError structure
- file: src/types/error.ts
  why: WorkflowError interface for throwing errors
  pattern: { message, original, workflowId, stack?, state, logs }
  gotcha: Always include state snapshot and logs in error

# Step options type
- file: src/types/decorators.ts
  why: StepOptions interface - defines restartable, maxRetries, retryOn
  pattern: { restartable?: boolean; maxRetries?: number; retryOn?: ErrorCriterion[] }
  gotcha: Default maxRetries is 3, restartable defaults to false

# Test patterns for Workflow
- file: src/__tests__/unit/workflow.test.ts
  why: Basic workflow test patterns
  pattern: Extend Workflow class, call run(), assert results
  gotcha: Use Vitest with describe/it/expect

# Test patterns for @Step decorator
- file: src/__tests__/unit/decorators-retry.test.ts
  why: Step retry test patterns including event verification
  pattern: Collect events in array, filter by type, assert properties
  gotcha: Use type guards for discriminated union narrowing

# Observed state pattern
- file: src/decorators/observed-state.ts
  why: getObservedState() function for state capture
  pattern: WeakMap-based metadata storage by class prototype
  gotcha: Fields marked with @ObservedState() are included in snapshots

# State serialization type
- file: src/types/snapshot.ts
  why: SerializedWorkflowState type definition
  pattern: Record<string, unknown> - simple key-value structure
  gotcha: No deserialization logic exists in codebase

# System context for architecture understanding
- file: plan/001_d3bb02af4886/docs/bugfix/system_context.md
  why: Overall architecture patterns and constraints
  pattern: Event-driven, observer-based, tree consistency requirements
  gotcha: Must maintain 1:1 workflow-to-node tree mirroring

# Restart analysis utility
- file: src/utils/restart-analysis.ts
  why: analyzeErrorForRestart() for error analysis
  pattern: Pure function returning RestartAnalysis with decision logic
  gotcha: ErrorCriterion matching requires typeof check first for functions

# Existing stepRetry event pattern
- file: src/types/events.ts:15
  why: stepRetry event structure - similar to stepRestarted
  pattern: { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  gotcha: Use similar structure for stepRestarted event

# External research: TypeScript method invocation
- url: https://www.typescriptlang.org/docs/handbook/2/classes.html
  why: Dynamic method invocation patterns
  critical: Use bracket notation with type safety: this[methodKey]()
  pattern: Verify method exists and is callable before invocation

# External research: WeakMap metadata storage
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
  why: Alternative pattern for storing step metadata
  critical: WeakMap doesn't prevent garbage collection
  pattern: const metadata = new WeakMap<object, StepMetadata>()

# External research: State serialization patterns
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  why: Handling circular references and non-serializable types
  critical: Use custom replacer function for complex objects
  pattern: JSON.stringify(value, (key, value) => { /* custom logic */ })
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts          # ADD: restartStep() method
│   ├── workflow-context.ts  # REFERENCE: Context patterns
│   ├── logger.ts            # REFERENCE: Logging patterns
│   └── context.ts           # REFERENCE: AsyncLocalStorage patterns
├── decorators/
│   ├── step.ts              # REFERENCE: @Step decorator (no metadata storage)
│   ├── task.ts              # REFERENCE: @Task decorator patterns
│   └── observed-state.ts    # REFERENCE: State observation, getObservedState()
├── types/
│   ├── events.ts            # MODIFY: Add stepRestarted event type
│   ├── error.ts             # REFERENCE: WorkflowError interface
│   ├── decorators.ts        # REFERENCE: StepOptions interface
│   ├── snapshot.ts          # REFERENCE: SerializedWorkflowState type
│   └── index.ts             # MODIFY: Export new event type
├── utils/
│   └── restart-analysis.ts  # REFERENCE: analyzeErrorForRestart utility
└── __tests__/
    ├── unit/
    │   ├── workflow.test.ts              # REFERENCE: Test patterns
    │   ├── decorators-retry.test.ts      # REFERENCE: Retry test patterns
    │   └── decorators/
    │       └── step-restart.test.ts      # REFERENCE: Step restart tests
    └── integration/
        └── agent-workflow.test.ts        # VERIFY: No breaking changes
```

### Desired Codebase Tree with Changes

```bash
src/
├── core/
│   └── workflow.ts          # ✏️ ADD: restartStep() method (after line 456, after snapshotState())
├── types/
│   ├── events.ts            # ✏️ ADD: stepRestarted event type (after line 15)
│   └── index.ts             # ✏️ ADD: Export stepRestarted in WorkflowEvent
└── __tests__/
    └── unit/
        └── workflow-restart-step.test.ts  # 📝 NEW: Tests for restartStep method
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: @Step decorator does NOT store persistent metadata
// The decorator stores options as closure variables (step.ts:71-76)
// There is NO way to retrieve step options from the Workflow class
// Workaround: Pass maxRetries in options parameter, don't try to read from decorator

// CRITICAL: No state restoration logic exists
// snapshotState() only captures state (workflow.ts:434-456)
// State restoration must be implemented or use stateOverride parameter
// Consider: Simple property assignment for basic restoration

// CRITICAL: WorkflowError interface (error.ts:7-20)
// Must include state and logs arrays - use getObservedState(this) and [...this.node.logs]

// CRITICAL: Event emission pattern (workflow.ts:413-429)
// Events push to node.events AND notify observers
// Observer errors are caught and logged - don't crash workflow

// CRITICAL: Discriminated union type narrowing (events.ts:9-77)
// When checking event types, use type guards: if (event.type === 'stepRestarted') { ... }

// CRITICAL: Method invocation safety
// Always verify method exists before calling: typeof this[stepName] === 'function'
// Use .call() to preserve context: this[stepName].call(this, ...args)

// CRITICAL: Retry count semantics
// retryCount in stepRetry event is "next attempt number" (step.ts:192)
// So retryCount: 1 means "first retry" (attempt #2 total)
// Match this semantics in restartStep

// CRITICAL: Vitest async testing
// Always await workflow.run() or expect(wf.run()).rejects.toThrow()
// Use event array pattern: const events: WorkflowEvent[] = []; wf.addObserver({ onEvent: (e) => events.push(e), ... })
```

## Implementation Blueprint

### Data Models and Structure

**Add stepRestarted event type to WorkflowEvent discriminated union**:

```typescript
// File: src/types/events.ts
// Location: After line 15 (after stepRetry event type)

export type WorkflowEvent =
  // ... existing events
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  | { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; state: SerializedWorkflowState }  // NEW
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  // ... remaining events
```

**Add interface for restartStep options**:

```typescript
// File: src/core/workflow.ts
// Location: After WorkflowExecutor type definition (around line 17)

/**
 * Options for restarting a step
 */
export interface RestartStepOptions {
  /** Current retry count (will be incremented by 1 for the attempt) */
  retryCount?: number;
  /** Maximum number of retries allowed (overrides step default) */
  maxRetries?: number;
  /** Override state to restore (defaults to current snapshot) */
  stateOverride?: SerializedWorkflowState;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/events.ts
  - ADD: stepRestarted event type to WorkflowEvent discriminated union
  - LOCATION: After line 15, immediately after stepRetry event
  - PATTERN: Follow existing event structure (type, node, stepName, retryCount, etc.)
  - EXPORT: Ensure type is included in WorkflowEvent union
  - FIELDS: type, node, stepName, retryCount, state

Task 2: MODIFY src/core/workflow.ts - Add RestartStepOptions interface
  - ADD: RestartStepOptions interface definition
  - LOCATION: After WorkflowExecutor type (around line 17), before class definition
  - PATTERN: Similar to other option interfaces in codebase
  - FIELDS: retryCount?: number, maxRetries?: number, stateOverride?: SerializedWorkflowState

Task 3: MODIFY src/core/workflow.ts - Implement restartStep method
  - ADD: async restartStep(stepName: string, options?: RestartStepOptions): Promise<unknown>
  - LOCATION: After snapshotState() method (after line 456), before setStatus()
  - VALIDATION: Check if method exists using typeof this[stepName] === 'function'
  - ERROR HANDLING: Throw WorkflowError if step not found with message "Step 'stepName' not found"
  - ERROR HANDLING: Throw WorkflowError if max retries exceeded with message "Max retries (N) exceeded for step 'stepName'"
  - STATE RESTORATION: Use options.stateOverride if provided, otherwise call this.snapshotState()
  - EXECUTION: Call this[stepName]() with preserved context
  - EVENT: Emit stepRestarted event with node, stepName, retryCount, state
  - RETURN: Return result of step execution

Task 4: CREATE src/__tests__/unit/workflow-restart-step.test.ts
  - IMPLEMENT: Comprehensive test suite for restartStep method
  - FOLLOW: Pattern from decorators-retry.test.ts for event verification
  - COVER: All error paths (not found, not restartable, max retries exceeded)
  - COVER: Success case with state restoration
  - COVER: Event emission verification
  - NAMING: test_*_scenario naming convention
  - PLACEMENT: src/__tests__/unit/ directory

Task 5: VERIFY existing tests pass
  - RUN: uv run vitest src/__tests__/unit/ -v
  - VERIFY: All 154 existing tests still pass
  - CHECK: No breaking changes to existing functionality
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN: Event emission (from workflow.ts:413-429)
// ============================================================
// Events must be pushed to node.events AND broadcast to observers
this.emitEvent({
  type: 'stepRestarted',
  node: this.node,
  stepName,
  retryCount: calculatedRetryCount,
  state: restoredState,
});

// ============================================================
// PATTERN: WorkflowError creation (from step.ts:158-165)
// ============================================================
// Always include state snapshot and logs array
const error: WorkflowError = {
  message: `Step '${stepName}' not found`,
  original: new Error('Step not found'),
  workflowId: this.id,
  state: getObservedState(this),
  logs: [...this.node.logs] as LogEntry[],
};

// ============================================================
// PATTERN: Method invocation safety (general TypeScript best practice)
// ============================================================
// Verify method exists and is callable before invocation
const method = this[stepName as keyof this];
if (typeof method !== 'function') {
  throw new WorkflowError({
    message: `Step '${stepName}' is not a function`,
    original: new Error('Method not callable'),
    workflowId: this.id,
    state: getObservedState(this),
    logs: [...this.node.logs],
  });
}

// ============================================================
// PATTERN: Retry count calculation (from step.ts:192)
// ============================================================
// retryCount is "next attempt number", not "attempts so far"
const nextRetryCount = (options.retryCount ?? 0) + 1;

// ============================================================
// GOTCHA: @Step decorator doesn't store metadata
// ============================================================
// Cannot read step options from decorator - use closure pattern
// Solution: Pass all required options in RestartStepOptions parameter

// ============================================================
// GOTCHA: No state restoration exists
// ============================================================
// snapshotState() only captures, doesn't restore
// For this PRP: Use stateOverride parameter for state restoration
// Future work: Implement restoreState() method

// ============================================================
// PATTERN: Type guard for discriminated union (events.ts pattern)
// ============================================================
// When checking event types in tests, use type guards
const restartedEvents = events.filter(e => e.type === 'stepRestarted');
if (restartedEvents[0]?.type === 'stepRestarted') {
  expect(restartedEvents[0].stepName).toBe('testStep');
  expect(restartedEvents[0].retryCount).toBe(1);
}
```

### Integration Points

```yaml
EVENTS:
  - add to: src/types/events.ts
  - pattern: "Add stepRestarted to WorkflowEvent discriminated union"
  - location: "After line 15, immediately after stepRetry event"

TYPES:
  - add to: src/core/workflow.ts
  - pattern: "Add RestartStepOptions interface before class definition"
  - location: "After WorkflowExecutor type (line 17)"

METHOD:
  - add to: src/core/workflow.ts
  - pattern: "Add restartStep method after snapshotState()"
  - location: "After line 456 (end of snapshotState method)"

TESTS:
  - add to: src/__tests__/unit/workflow-restart-step.test.ts
  - pattern: "Follow decorators-retry.test.ts structure"
  - coverage: "Error paths, success case, event emission"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Expected: Zero type errors
# Common issues: Wrong event type structure, missing properties in RestartStepOptions

# Run linter if available
npm run lint

# Expected: Zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new restartStep method
npm test -- src/__tests__/unit/workflow-restart-step.test.ts -v

# Expected: All new tests pass
# Coverage:
# - Step not found error
# - Max retries exceeded error
# - Successful restart with event emission
# - State restoration with override

# Test existing workflow tests
npm test -- src/__tests__/unit/workflow.test.ts -v

# Expected: All existing tests pass (no breaking changes)

# Full unit test suite
npm test -- src/__tests__/unit/ -v

# Expected: All 154+ tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm test -v

# Expected: All tests pass (existing + new)

# Verify event emission in integration tests
npm test -- src/__tests__/integration/ -v

# Expected: Integration tests pass, observability works correctly
```

### Level 4: Manual & Domain-Specific Validation

```bash
# Manual verification: Create a test workflow and call restartStep
# Create file: manual-test.ts
import { Workflow, Step } from './src/index.js';

class TestWorkflow extends Workflow {
  @Step({ restartable: true, maxRetries: 3 })
  async testStep(): Promise<string> {
    return 'success';
  }

  async run(): Promise<void> {
    const result = await this.restartStep('testStep', { retryCount: 0 });
    console.log('Result:', result);
  }
}

const wf = new TestWorkflow();
wf.run().catch(console.error);

# Expected: Output shows "Result: success" and stepRestarted event is emitted

# Verify error handling
class FailingWorkflow extends Workflow {
  @Step({ restartable: true })
  async failingStep(): Promise<void> {
    throw new Error('Test failure');
  }

  async run(): Promise<void> {
    try {
      await this.restartStep('nonexistent');
    } catch (err) {
      console.log('Expected error:', err.message);
    }
  }
}

const wf2 = new FailingWorkflow();
wf2.run();

# Expected: Error message "Step 'nonexistent' not found" is logged
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test -v`
- [ ] New tests for restartStep pass
- [ ] Event type properly added to WorkflowEvent union
- [ ] RestartStepOptions interface properly typed
- [ ] No type errors in method signature

### Feature Validation

- [ ] restartStep method exists and is callable
- [ ] Throws WorkflowError when step not found
- [ ] Throws WorkflowError when max retries exceeded
- [ ] Emits stepRestarted event with correct payload
- [ ] Returns step execution result
- [ ] State override parameter works correctly
- [ ] Retry count calculation matches stepRetry semantics

### Code Quality Validation

- [ ] Follows existing codebase patterns (event emission, error creation)
- [ ] Method placement matches desired codebase tree (after snapshotState)
- [ ] Type safety maintained (no `as any` casts)
- [ ] JSDoc comments added for public method
- [ ] Error messages are clear and actionable

### Documentation & Deployment

- [ ] Method documented with JSDoc
- [ ] Event type documented in events.ts
- [ ] Test file follows existing patterns
- [ ] No breaking changes to existing APIs

---

## Anti-Patterns to Avoid

- ❌ Don't try to read step metadata from @Step decorator (it's not stored persistently)
- ❌ Don't implement state restoration logic (use stateOverride for now)
- ❌ Don't use sync methods - restartStep must be async
- ❌ Don't skip event emission - must emit stepRestarted event
- ❌ Don't use generic Error - must use WorkflowError with state and logs
- ❌ Don't call step directly with `this[stepName]()` without type checking
- ❌ Don't assume step is restartable - should validate (even though metadata isn't accessible)
- ❌ Don't forget to increment retryCount (should match stepRetry semantics)
- ❌ Don't break existing tests - all 154 tests must pass

---

## Research Summary

### Key Findings from Codebase Analysis

1. **No Persistent Step Metadata**: The @Step decorator stores options as closure variables, not as retrievable metadata. This means restartStep cannot validate if a step is marked as restartable by reading decorator metadata.

2. **No State Restoration Logic**: The codebase has `snapshotState()` for capturing state, but no `restoreState()` method exists. State restoration must be handled via the `stateOverride` parameter.

3. **Existing Event Infrastructure**: The event system is well-established with discriminated unions for type safety. Adding `stepRestarted` follows the existing pattern.

4. **Comprehensive Error Handling**: WorkflowError includes state snapshots and logs. All errors must follow this pattern.

5. **Test Patterns Established**: The test suite uses Vitest with clear patterns for async testing, event collection, and error verification.

### External Research Insights

1. **Method Invocation Safety**: Always verify method exists and is callable before dynamic invocation using bracket notation.

2. **State Serialization**: JSON serialization with custom replacer handles circular references and complex types.

3. **Metadata Storage**: WeakMap is preferred for metadata storage (garbage collection friendly), but Reflect API is also common for decorator metadata.

### Implementation Constraints

1. **Must maintain backward compatibility**: All 154 existing tests must pass
2. **Type safety required**: No `as any` casts, proper TypeScript types throughout
3. **Event emission required**: All state changes must emit appropriate events
4. **Observer safety**: Observer errors must not crash workflows

---

## Success Metrics

**Confidence Score**: 8/10

**Rationale**:
- ✅ Clear specification with well-defined inputs/outputs
- ✅ Existing patterns to follow (event emission, error handling)
- ✅ Comprehensive test patterns established
- ⚠️ Constraint: No step metadata storage means cannot validate restartable flag
- ⚠️ Constraint: No state restoration means must use stateOverride
- ✅ Implementation is straightforward following existing patterns

**Validation**: The completed PRP provides:
- Exact file locations and line numbers for all changes
- Complete code patterns for event emission and error handling
- Test patterns matching existing codebase conventions
- Clear gotchas and anti-patterns to avoid
- All context needed for one-pass implementation

---

**PRP Version**: 1.0
**Work Item**: P1.M1.T3.S1
**Created**: 2026-01-26
**Status**: Ready for Implementation
