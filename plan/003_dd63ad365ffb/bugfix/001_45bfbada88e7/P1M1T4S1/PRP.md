# Product Requirement Prompt (PRP): P1.M1.T4.S1 - Parent-Child Restart Integration Test

---

## Goal

**Feature Goal**: Create a comprehensive integration test demonstrating parent-driven child workflow restart pattern using `@Step(restartable: true)`, `analyzeError()`, and `restartStep()` methods.

**Deliverable**: New integration test file `src/__tests__/integration/parent-restart-decisions.test.ts` that validates the complete error propagation, analysis, decision, and re-execution flow when a parent workflow manages a child workflow's restart.

**Success Definition**:
- Test file exists at specified path with comprehensive test coverage
- Child workflow with `@Step(restartable: true)` fails on first attempt, succeeds on second
- Parent workflow catches child error, calls `analyzeError()`, gets `'retry'` decision
- Parent calls `child.restartStep()` which re-executes the step successfully
- Events (`stepRetry`, `stepRestarted`, `error`, `stepEnd`) are emitted to parent observer
- State is preserved across restart (attempt count, error context)
- All tests pass and follow integration test patterns from codebase

---

## User Persona (if applicable)

**Target User**: QA engineers, framework developers, and users implementing sophisticated error handling patterns in hierarchical workflow systems.

**Use Case**: Validating that parent workflows can intelligently manage child workflow failures through error analysis and targeted restart decisions, ensuring robust error recovery in multi-level workflow systems.

**User Journey**:
1. Developer creates child workflow with restartable steps that may fail transiently
2. Parent workflow spawns child and observes its execution
3. When child step fails, parent catches error and analyzes it
4. Parent decides whether to retry, abort, or rebuild based on error analysis
5. If retryable, parent calls `restartStep()` to re-execute the failed step
6. System emits events for observability and state is preserved across restart

**Pain Points Addressed**:
- **Unclear restart coordination**: How do parents manage child restarts?
- **Error propagation uncertainty**: What information flows from child to parent?
- **Event verification complexity**: What events are emitted during parent-driven restart?
- **State preservation concerns**: Is workflow state maintained across restart boundaries?
- **Integration testing gaps**: No comprehensive test for this critical pattern

---

## Why

- **PRD Compliance**: Section 11 requires parent-driven restart decisions with error analysis
- **Pattern Validation**: Ensures the integration of `@Step(restartable)`, `analyzeError()`, and `restartStep()` works end-to-end
- **Documentation**: Integration test serves as executable documentation for parent-child error handling
- **Regression Prevention**: Catches breaking changes in the restart integration across multiple components
- **Developer Confidence**: Framework users need confidence that parent-driven restart works reliably

---

## What

Create an integration test file that validates the complete parent-driven child restart flow:

### Test Scenario

```typescript
// Child workflow with restartable step
class ChildWorkflow extends Workflow {
  @ObservedState()
  attemptCount = 0;

  @ObservedState()
  lastError: string | null = null;

  @Step({ restartable: true, maxRetries: 3 })
  async flakyOperation(): Promise<string> {
    this.attemptCount++;
    if (this.attemptCount === 1) {
      this.lastError = 'TRANSIENT_ERROR';
      throw new Error('TRANSIENT_ERROR: Temporary failure');
    }
    return 'success';
  }

  async run(): Promise<string> {
    return await this.flakyOperation();
  }
}

// Parent workflow that manages child restart
class ParentWorkflow extends Workflow {
  @ObservedState()
  restartAttempts = 0;

  @Task()
  async spawnChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this);
  }

  async run(): Promise<void> {
    const child = await this.spawnChild();

    try {
      await child.run();
    } catch (error) {
      const wfError = error as WorkflowError;
      const decision = this.analyzeError(wfError);

      if (decision === 'retry') {
        this.restartAttempts++;
        await child.restartStep('flakyOperation', { retryCount: 1 });
        const result = await child.run();
        expect(result).toBe('success');
      }
    }
  }
}
```

### Validation Requirements

1. **Error Propagation**: Child error contains state, logs, workflowId
2. **Error Analysis**: `analyzeError()` returns `'retry'` for transient errors
3. **Step Restart**: `restartStep()` re-executes the step method
4. **Event Emission**: Verify events in order:
   - `stepStart` (child step starts)
   - `error` (child step fails)
   - `stepRestarted` (parent initiates restart)
   - `stepEnd` (child step succeeds)
5. **State Preservation**: `attemptCount` increments to 2, `lastError` preserved
6. **Parent Observer**: Parent observer receives all child events

### Success Criteria

- [ ] Test file created at `src/__tests__/integration/parent-restart-decisions.test.ts`
- [ ] Test creates parent-child workflow relationship
- [ ] Child step fails on first attempt with transient error
- [ ] Parent catches error and calls `analyzeError()`
- [ ] `analyzeError()` returns `'retry'` for transient error
- [ ] Parent calls `child.restartStep()` with retryCount
- [ ] Step re-executes and succeeds on second attempt
- [ ] All expected events are emitted and captured
- [ ] State is preserved across restart (attemptCount = 2)
- [ ] Test follows integration test patterns from codebase
- [ ] All tests pass with clear assertions

---

## All Needed Context

### Context Completeness Check

✅ **Passes "No Prior Knowledge" test**: This PRP provides complete context including:
- Exact file paths and line numbers for all referenced code
- Complete type definitions for all interfaces
- Existing integration test patterns with concrete examples
- Event emission and observation patterns
- Parent-child workflow creation patterns
- Error handling and analysis patterns

### Documentation & References

```yaml
# INTEGRATION TEST PATTERNS - Must follow these conventions
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Tree structure validation patterns, parent-child relationship testing
  pattern: Create workflows, attach via constructor, verify bidirectional links
  gotcha: Uses WorkflowTreeDebugger for event collection

- file: src/__tests__/integration/workflow-reparenting.test.ts
  why: Parent-child relationship testing with observer propagation
  pattern: Create parent/child, verify events propagate to root observer
  gotcha: Events flow through getRootObservers() to root workflow's observers

- file: src/__tests__/integration/observer-logging.test.ts
  why: Observer error handling patterns
  pattern: Add observers to root workflows, collect events in arrays
  gotcha: Observers can only be added to root workflows (throws if parent exists)

# PARENT-CHILD WORKFLOW CREATION
- file: examples/examples/03-parent-child.ts
  why: Real-world example of parent-child workflow with @Task decorator
  pattern: @Task decorator method returns new ChildWorkflow(this)
  gotcha: @Task automatically attaches child if not already attached

- file: src/decorators/task.ts
  why: @Task decorator implementation - automatic child attachment
  pattern: Detects workflow return values, attaches via attachChild()
  gotcha: Only attaches if child.parent is null (no reparenting)

# STEP DECORATOR WITH RESTARTABLE
- file: src/decorators/step.ts
  why: @Step decorator with restartable option and retry loop
  pattern: Lines 115-228 - retry loop with error handling and event emission
  gotcha: Emits stepRetry event on each retry attempt (line 203)
  gotcha: State captured via getObservedState(this) on error (line 156)

- file: src/__tests__/unit/decorators/step-restart.test.ts
  why: Existing tests for restartable step behavior
  pattern: Test workflow classes with attempt counters, verify retry logic
  gotcha: maxRetries defaults to 3, retryDelayMs defaults to 1000

# RESTART METHODS
- file: src/core/workflow.ts
  why: restartStep() method (lines 506-563) and analyzeError() method (lines 650-689)
  pattern: restartStep emits stepRestarted event, analyzeError returns 'retry'|'abort'|'rebuild'
  gotcha: restartCount calculated as (options.retryCount ?? 0) + 1
  gotcha: analyzeError uses analyzeErrorForRestart utility for decision logic

- file: src/__tests__/unit/workflow-restart-step.test.ts
  why: Tests for restartStep method (527 lines, 21 tests)
  pattern: Event capture array, type guards for discriminated unions
  gotcha: Uses inline Workflow subclasses with @Step decorated methods

- file: src/__tests__/unit/workflow-analyze-error.test.ts
  why: Tests for analyzeError method (714 lines, 37 tests)
  pattern: Helper functions for test data, comprehensive edge cases
  gotcha: Tests manually populate stepMetadata Map for analyzeError testing

# ERROR ANALYSIS UTILITY
- file: src/utils/restart-analysis.ts
  why: analyzeErrorForRestart() utility for error analysis
  pattern: Returns RestartAnalysis with shouldRestart, reason, suggestedAction
  gotcha: Transient errors: TIMEOUT, RATE_LIMIT, NETWORK_ERROR, SERVICE_UNAVAILABLE
  gotcha: ErrorCriterion is discriminated union (string | regex | recoverable | function)

# EVENT TYPES AND OBSERVER PATTERNS
- file: src/types/events.ts
  why: Complete WorkflowEvent type definitions
  pattern: Discriminated union with 'type' field for type narrowing
  section: Lines 1-77 - all event types including stepRetry, stepRestarted, error
  gotcha: stepRetry has analysis field, stepRestarted has restoredState field

- file: src/types/observer.ts
  why: WorkflowObserver interface definition
  pattern: onLog, onEvent, onStateUpdated, onTreeChanged callbacks
  gotcha: Observers added to root workflows receive events from entire tree

- file: src/debugger/tree-debugger.ts
  why: WorkflowTreeDebugger implementation - built-in observer for testing
  pattern: Implements WorkflowObserver, exposes events as Observable
  gotcha: Constructor adds observer automatically (must be root workflow)

# OBSERVED STATE PATTERN
- file: src/decorators/observed-state.ts
  why: @ObservedState decorator for state observation
  pattern: WeakMap-based metadata storage, getObservedState() function
  gotcha: Fields marked with @ObservedState() included in state snapshots

# TREE VERIFICATION HELPERS
- file: src/__tests__/helpers/tree-verification.ts
  why: Helper functions for tree consistency validation
  pattern: verifyBidirectionalLink, verifyTreeMirror, validateTreeConsistency
  gotcha: Use these helpers to assert parent-child relationships

# TYPE DEFINITIONS
- file: src/types/restart.ts
  why: RestartAnalysis, ErrorCriterion, and RestartStepOptions types
  pattern: ErrorCriterion is discriminated union, must check typeof first
  gotcha: Function criteria must be checked before other properties

- file: src/types/error.ts
  why: WorkflowError interface definition
  pattern: { message, original, workflowId, stack?, state, logs }
  gotcha: Always include state snapshot and logs array

# RESEARCH DOCUMENTATION - Context created for this PRP
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T4S1/research/INTEGRATION_TEST_PATTERNS.md
  why: Comprehensive integration test patterns from codebase analysis
  section: All sections - tree structure, parent-child, observer patterns

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T4S1/research/PARENT_CHILD_PATTERNS.md
  why: Parent-child workflow creation and management patterns
  section: All sections - @Task decorator, manual attachment, error propagation

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T4S1/research/RESTART_METHODS_RESEARCH.md
  why: Restart methods implementation details and testing patterns
  section: All sections - restartStep, analyzeError, event emission
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── tree-mirroring.test.ts           # REFERENCE: Tree structure patterns
│   │   ├── workflow-reparenting.test.ts     # REFERENCE: Parent-child patterns
│   │   ├── observer-logging.test.ts         # REFERENCE: Observer patterns
│   │   └── agent-workflow.test.ts           # VERIFY: No breaking changes
│   ├── unit/
│   │   ├── workflow-restart-step.test.ts    # REFERENCE: restartStep tests
│   │   ├── workflow-analyze-error.test.ts   # REFERENCE: analyzeError tests
│   │   └── decorators-retry.test.ts         # REFERENCE: @Step retry tests
│   └── helpers/
│       └── tree-verification.ts             # USE: Tree validation helpers
├── core/
│   ├── workflow.ts                          # REFERENCE: restartStep, analyzeError
│   └── context.ts                           # REFERENCE: Context patterns
├── decorators/
│   ├── step.ts                              # REFERENCE: @Step with restartable
│   ├── task.ts                              # REFERENCE: @Task for child spawning
│   └── observed-state.ts                    # REFERENCE: @ObservedState decorator
├── types/
│   ├── events.ts                            # REFERENCE: WorkflowEvent types
│   ├── observer.ts                          # REFERENCE: WorkflowObserver interface
│   ├── restart.ts                           # REFERENCE: RestartAnalysis types
│   └── error.ts                             # REFERENCE: WorkflowError interface
└── utils/
    └── restart-analysis.ts                  # REFERENCE: analyzeErrorForRestart
```

### Desired Codebase Tree with Files to be Added

```bash
src/
└── __tests__/
    └── integration/
        └── parent-restart-decisions.test.ts  # 📝 NEW: Parent-child restart integration test
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Observers can only be added to root workflows
// Adding observer to non-root workflow throws Error
// Pattern: Always add observers to workflows without parents
if (workflow.parent) {
  throw new Error('Observers can only be added to root workflows');
}

// CRITICAL: Events propagate to root observers via getRootObservers()
// Child workflow events automatically bubble to parent's observers
// Implementation in workflow.ts:150-165 (getRootObservers method)
// Pattern: Add observer to root, receive events from entire tree

// CRITICAL: @Task decorator automatically attaches child workflows
// If child returned from @Task method has no parent, it's auto-attached
// Implementation in task.ts:95-105
// Pattern: return new ChildWorkflow(this) in @Task method

// CRITICAL: @Step decorator does NOT store persistent metadata
// Options stored as closure variables, not accessible via reflection
// Workaround: Pass options explicitly, don't try to read from decorator
// Impact: analyzeError requires manual stepMetadata population for testing

// CRITICAL: WorkflowError requires state and logs arrays
// Always use getObservedState(this) and [...this.node.logs]
// Pattern from step.ts:156-165
const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: getObservedState(this as object),
  logs: [...wf.node.logs] as LogEntry[],
};

// CRITICAL: Event type narrowing required for discriminated unions
// WorkflowEvent is discriminated union - must check 'type' field first
// Pattern: if (event.type === 'stepRestarted') { /* access event.stepName */ }
// TypeScript error if accessing properties without type guard

// CRITICAL: retryCount semantics differ between events
// stepRetry event: retryCount is the next attempt number (1, 2, 3...)
// restartStep calculation: (options.retryCount ?? 0) + 1
// Pattern: retryCount: 1 = first retry (second attempt total)

// CRITICAL: Transient error codes for restart decisions
// analyzeErrorForRestart returns 'retry' for these codes:
// 'TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'
// Pattern: Include these codes in error messages for testing

// CRITICAL: State preservation uses @ObservedState decorator
// Only fields marked with @ObservedState() are included in snapshots
// Pattern: Decorate fields with @ObservedState() to track across restarts

// CRITICAL: Test workflow classes must extend Workflow
// All integration tests use class-based workflows, not functional
// Pattern: class TestWorkflow extends Workflow { ... }

// CRITICAL: Vitest async testing patterns
// Always await workflow.run() or expect(wf.run()).rejects.toThrow()
// Pattern: Use event array for collection, filter by type, assert properties

// CRITICAL: Parent-child attachment verification
// Use tree verification helpers from tree-verification.ts
// Pattern: verifyBidirectionalLink(parent, child) after attachment
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed. Test uses existing types:

```typescript
// From src/types/events.ts
type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  | { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | // ... other event types

// From src/types/observer.ts
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}

// From src/types/restart.ts
type RestartDecision = 'retry' | 'abort' | 'rebuild';

interface RestartAnalysis {
  shouldRestart: boolean;
  reason: string;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  estimatedSuccessProbability: number;
}

// From src/types/error.ts
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/integration/parent-restart-decisions.test.ts
  - IMPLEMENT: Integration test suite for parent-child restart pattern
  - FOLLOW: Pattern from workflow-reparenting.test.ts (parent-child creation)
  - FOLLOW: Pattern from tree-mirroring.test.ts (event collection with WorkflowTreeDebugger)
  - NAMING: describe('Integration: Parent-Child Restart Decisions')
  - PLACEMENT: src/__tests__/integration/ directory

Task 2: IMPLEMENT test workflow classes
  - CREATE: ChildWorkflow class with @Step(restartable: true) decorated method
  - CREATE: ParentWorkflow class with @Task decorated spawn method
  - PATTERN: Follow examples/examples/03-parent-child.ts structure
  - STATE: Use @ObservedState() for attemptCount, lastError tracking
  - LOGIC: Child step fails on first attempt, succeeds on second

Task 3: IMPLEMENT error propagation and analysis test
  - CREATE: Test case "should propagate error from child to parent"
  - VERIFY: Child error contains state, logs, workflowId
  - VERIFY: Parent catches error in try-catch block
  - VERIFY: Error is WorkflowError type with proper structure

Task 4: IMPLEMENT error analysis and restart decision test
  - CREATE: Test case "should analyze error and return retry decision"
  - CALL: parent.analyzeError(childError) in test
  - VERIFY: Returns 'retry' for transient errors
  - VERIFY: Returns 'abort' for non-recoverable errors
  - POPULATE: child.stepMetadata Map for analyzeError to work (known gotcha)

Task 5: IMPLEMENT step restart and re-execution test
  - CREATE: Test case "should restart child step and succeed on retry"
  - CALL: child.restartStep('flakyOperation', { retryCount: 1 })
  - VERIFY: Step re-executes and returns success
  - VERIFY: attemptCount increments to 2
  - VERIFY: lastError is preserved from first attempt

Task 6: IMPLEMENT event emission verification test
  - CREATE: Test case "should emit all expected events during restart flow"
  - COLLECT: Events using WorkflowTreeDebugger or observer pattern
  - VERIFY: Events in correct order (stepStart → error → stepRestarted → stepEnd)
  - VERIFY: stepRestarted event has correct retryCount and restoredState
  - VERIFY: Parent observer receives all child events

Task 7: IMPLEMENT state preservation test
  - CREATE: Test case "should preserve observed state across restart"
  - VERIFY: @ObservedState fields captured in error state
  - VERIFY: State preserved in stepRestarted event
  - VERIFY: Workflow state updated after successful restart

Task 8: RUN full integration test suite
  - EXECUTE: npm test -- parent-restart-decisions
  - VERIFY: All new tests pass
  - VERIFY: No breaking changes to existing tests
  - CHECK: Test coverage is comprehensive
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN: Parent-child workflow creation (from 03-parent-child.ts)
// ============================================================
class ChildWorkflow extends Workflow {
  constructor(name: string, parent?: Workflow) {
    super(name, parent);
    // Child automatically attached if parent provided
  }
}

class ParentWorkflow extends Workflow {
  @Task()
  async spawnChild(): Promise<ChildWorkflow> {
    // @Task decorator auto-attaches child if not already attached
    return new ChildWorkflow('Child', this);
  }
}

// ============================================================
// PATTERN: Event collection using WorkflowTreeDebugger
// ============================================================
const debugger_ = new WorkflowTreeDebugger(parentWorkflow);
const events: WorkflowEvent[] = [];

debugger_.events.subscribe({
  next: (event) => {
    events.push(event);
  },
});

// Run workflows, then analyze events
const stepRetryEvents = events.filter(e => e.type === 'stepRetry');
const stepRestartedEvents = events.filter(e => e.type === 'stepRestarted');
const errorEvents = events.filter(e => e.type === 'error');

// ============================================================
// PATTERN: Type guard for discriminated union events
// ============================================================
const stepRestartedEvent = events.find(e => e.type === 'stepRestarted');
if (stepRestartedEvent && stepRestartedEvent.type === 'stepRestarted') {
  expect(stepRestartedEvent.stepName).toBe('flakyOperation');
  expect(stepRestartedEvent.retryCount).toBe(2);
  expect(stepRestartedEvent.restoredState).toBeDefined();
}

// ============================================================
// PATTERN: Observer setup for root workflow
// ============================================================
const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

// Must add to root workflow (will throw if parent exists)
parentWorkflow.addObserver(observer);

// ============================================================
// PATTERN: stepMetadata population for analyzeError testing
// ============================================================
// CRITICAL: @Step decorator doesn't populate stepMetadata
// Must manually populate for analyzeError to work correctly
(child as any).stepMetadata = new Map([
  ['flakyOperation', { options: { restartable: true, maxRetries: 3 } }]
]);

// ============================================================
// PATTERN: Transient error for restart decision testing
// ============================================================
@Step({ restartable: true, maxRetries: 3 })
async flakyOperation(): Promise<string> {
  this.attemptCount++;
  if (this.attemptCount === 1) {
    // Use TRANSIENT_ERROR code to trigger 'retry' decision
    throw new Error('TRANSIENT_ERROR: Temporary failure');
  }
  return 'success';
}

// ============================================================
// PATTERN: Parent-driven restart flow
// ============================================================
async run(): Promise<void> {
  const child = await this.spawnChild();

  try {
    await child.run();
  } catch (error) {
    const wfError = error as WorkflowError;
    const decision = this.analyzeError(wfError);

    if (decision === 'retry') {
      this.restartAttempts++;
      await child.restartStep('flakyOperation', { retryCount: 1 });
      const result = await child.run();
      expect(result).toBe('success');
    }
  }
}

// ============================================================
// PATTERN: State preservation verification
// ============================================================
class ChildWorkflow extends Workflow {
  @ObservedState()
  attemptCount = 0;

  @ObservedState()
  lastError: string | null = null;
}

// After restart, verify state preserved
expect(child.attemptCount).toBe(2);
expect(child.lastError).toBe('TRANSIENT_ERROR');

// ============================================================
// PATTERN: Tree verification helpers usage
// ============================================================
import { verifyBidirectionalLink } from '../../helpers/tree-verification.js';

verifyBidirectionalLink(parentWorkflow, childWorkflow);
```

### Integration Points

```yaml
INTEGRATION_TEST:
  - add to: src/__tests__/integration/
  - file: "parent-restart-decisions.test.ts"
  - pattern: "Follow workflow-reparenting.test.ts structure"

TEST_WORKFLOWS:
  - create: ChildWorkflow class with @Step(restartable: true)
  - create: ParentWorkflow class with @Task spawn method
  - pattern: "Follow examples/03-parent-child.ts structure"

EVENT_COLLECTION:
  - use: WorkflowTreeDebugger or observer pattern
  - pattern: "Collect events in array, filter by type, verify properties"
  - reference: "tree-mirroring.test.ts lines 30-45"

STEP_METADATA:
  - populate: Manual stepMetadata Map for analyzeError testing
  - pattern: "(child as any).stepMetadata = new Map([['stepName', { options }]])"
  - gotcha: "@Step decorator doesn't populate this automatically"

ERROR_VERIFICATION:
  - verify: WorkflowError structure (message, state, logs, workflowId)
  - pattern: "expect(error.state).toBeDefined()"
  - pattern: "expect(error.logs).toBeInstanceOf(Array)"

RESTART_FLOW:
  - call: child.restartStep('stepName', { retryCount: 1 })
  - verify: Step re-executes and succeeds
  - verify: attemptCount increments
  - pattern: "Follow workflow-restart-step.test.ts structure"
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npm run lint

# Expected: Zero errors. Test file must be type-safe.

# Check specific test file
npx tsc --noEmit src/__tests__/integration/parent-restart-decisions.test.ts

# Expected: Zero type errors in new test file
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new integration test
npm test -- parent-restart-decisions -v

# Expected: All new tests pass (7-10 test cases)

# Run all integration tests to verify no breaking changes
npm test -- src/__tests__/integration/ -v

# Expected: All integration tests pass

# Run all unit tests for referenced components
npm test -- workflow-restart-step -v
npm test -- workflow-analyze-error -v
npm test -- decorators-retry -v

# Expected: All referenced unit tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm test -v

# Expected: All tests pass (existing + new)

# Verify test coverage
npm test -- --coverage src/__tests__/integration/parent-restart-decisions.test.ts

# Expected: High coverage percentage for tested scenarios

# Check for test leaks or shared state
npm test -- --run --reporter=verbose parent-restart-decisions

# Expected: Tests are independent, no shared state
```

### Level 4: Manual & Domain-Specific Validation

```bash
# Manual verification: Run test with verbose output to see event flow
npm test -- --run --reporter=verbose parent-restart-decisions

# Expected output:
# - Child workflow created and attached
# - Child step executed and failed
# - Error propagated to parent
# - analyzeError returned 'retry'
# - restartStep called and succeeded
# - All events emitted in correct order

# Verify specific test case
npm test -- --run --grep "should restart child step and succeed on retry"

# Expected: Test passes with clear assertions

# Verify event emission
npm test -- --run --grep "should emit all expected events"

# Expected: All events verified with proper structure
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file exists at `src/__tests__/integration/parent-restart-decisions.test.ts`
- [ ] All tests pass: `npm test -- parent-restart-decisions -v`
- [ ] No type errors: `npm run lint`
- [ ] No breaking changes to existing tests
- [ ] Tests follow integration test patterns (describe/it/expect)
- [ ] Event emission properly verified with type guards
- [ ] State preservation tested with @ObservedState fields
- [ ] Parent-child relationship verified with helpers

### Feature Validation

- [ ] Child workflow with `@Step(restartable: true)` created
- [ ] Child step fails on first attempt with transient error
- [ ] Parent workflow catches child error
- [ ] Parent calls `analyzeError()` and gets `'retry'` decision
- [ ] Parent calls `child.restartStep()` with retryCount
- [ ] Step re-executes and succeeds on second attempt
- [ ] All expected events emitted (stepStart, error, stepRestarted, stepEnd)
- [ ] Events emitted in correct order
- [ ] State preserved across restart (attemptCount = 2, lastError)
- [ ] Parent observer receives all child events

### Code Quality Validation

- [ ] Tests follow existing integration test patterns
- [ ] Test names are descriptive ("should" statements)
- [ ] Tests are independent (no shared state)
- [ ] Tests use proper type narrowing for discriminated unions
- [ ] Tests verify both success and failure scenarios
- [ ] Test organization is logical (describe/it hierarchy)
- [ ] Helper functions used appropriately (tree verification)
- [ ] Comments explain complex scenarios

### Documentation & Maintenance

- [ ] Test serves as executable documentation for parent-child restart pattern
- [ ] Test scenarios cover the complete error flow
- [ ] Edge cases considered (non-recoverable errors, max retries)
- [ ] Test is maintainable and clear for future contributors

---

## Anti-Patterns to Avoid

- ❌ **Don't add observers to child workflows** - Only root workflows can have observers
- ❌ **Don't skip stepMetadata population** - analyzeError requires it (decorator doesn't populate)
- ❌ **Don't use non-transient error codes** - Use TRANSIENT_ERROR for 'retry' decision
- ❌ **Don't forget type guards** - Must check `event.type` before accessing properties
- ❌ **Don't assume @Step stores metadata** - Options are closure variables, not accessible
- ❌ **Don't mix sync/async patterns** - Always await workflow.run() and restartStep()
- ❌ **Don't ignore event order** - Events must be emitted in specific sequence
- ❌ **Don't skip state verification** - @ObservedState fields must be preserved
- ❌ **Don't break test independence** - Each test must create fresh workflow instances
- ❌ **Don't ignore tree consistency** - Use verifyBidirectionalLink helper

---

## Research Summary

### Key Findings from Codebase Analysis

1. **Integration Test Patterns Established**: Codebase has clear patterns in `tree-mirroring.test.ts`, `workflow-reparenting.test.ts` for parent-child testing with event collection via `WorkflowTreeDebugger`.

2. **Observer Propagation**: Events flow from child to parent observers via `getRootObservers()` method. Only root workflows can have observers (throws if parent exists).

3. **@Task Auto-Attachment**: The `@Task` decorator automatically attaches child workflows if they don't have a parent. Enables clean parent-child creation pattern.

4. **Step Decorator Limitation**: `@Step` decorator stores options as closure variables, not persistent metadata. `analyzeError()` requires manual `stepMetadata` Map population for testing.

5. **Event Emission Comprehensive**: System emits `stepStart`, `stepRetry`, `stepRestarted`, `error`, `stepEnd` events with full context. Discriminated union requires type guards.

6. **State Preservation via @ObservedState**: Fields marked with `@ObservedState()` are captured in error context and included in `stepRestarted` events.

### Implementation Approach

The integration test will create a realistic parent-child workflow scenario where:
1. Parent spawns child with `@Task` decorator
2. Child has restartable step that fails transiently
3. Parent catches error, analyzes it, and restarts the step
4. All events are captured and verified
5. State is preserved across the restart boundary

This validates the complete integration of `@Step(restartable)`, `analyzeError()`, and `restartStep()` methods in a hierarchical workflow context.

---

## Success Metrics

**Confidence Score**: 9/10

**Rationale**:
- ✅ Clear contract requirements with specific test scenario
- ✅ Established integration test patterns to follow
- ✅ Comprehensive research of all referenced components
- ✅ Complete type definitions and event structures documented
- ✅ All gotchas and anti-patterns identified
- ✅ Test file follows existing conventions
- ⚠️ Requires manual stepMetadata population (known gotcha, documented)
- ✅ Implementation is straightforward following patterns

**Validation**: The completed PRP provides:
- Exact file path and structure for test file
- Complete test workflow class examples
- Event collection and verification patterns
- Error propagation and analysis validation
- State preservation testing approach
- All context needed for one-pass implementation

---

**PRP Version**: 1.0
**Work Item**: P1.M1.T4.S1
**Created**: 2026-01-26
**Status**: Ready for Implementation
