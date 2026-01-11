# PRP: Write Test for Functional Workflow Error State Capture

---

## Goal

**Feature Goal**: Add a comprehensive test to `src/__tests__/unit/workflow.test.ts` that validates the functional workflow error handler in `runFunctional()` properly captures state (via `getObservedState(this)`) and logs (via `[...this.node.logs] as LogEntry[]`) when errors occur.

**Deliverable**: A new test case `should capture state and logs in functional workflow error with observed fields` added to the existing test suite in `src/__tests__/unit/workflow.test.ts` that validates error state/logs capture for functional workflows.

**Success Definition**: The test creates a class-based workflow with `@ObservedState` decorated fields, triggers an error during execution, and asserts that the error event's `state` property contains captured observed field values and `logs` property contains log entries.

## User Persona

**Target User**: Developer/QA Engineer who needs to verify that functional workflow error handlers properly capture workflow state and logs for debugging purposes.

**Use Case**: When developing or testing workflows, developers need assurance that error events contain complete execution context (state and logs) to diagnose failures and understand what happened before the error occurred.

**User Journey**:
1. Developer writes a workflow with `@ObservedState` fields
2. Workflow executes and may encounter errors
3. Error event is emitted with WorkflowError object
4. Developer inspects `error.state` to see captured workflow state
5. Developer inspects `error.logs` to see execution history

**Pain Points Addressed**:
- Previously `error.state` was empty object `{}` for all functional workflows
- Previously `error.logs` was empty array `[]` for all functional workflows
- No test validation that `getObservedState(this)` actually captures decorated fields
- No test validation that `[...this.node.logs]` actually captures log entries

## Why

- **Bug Fix Validation**: Subtask P1.M1.T1.S4 requires a test to validate the fixes from S2 (state capture) and S3 (logs capture)
- **Regression Prevention**: Ensures future changes don't break error state/logs capture
- **Documentation**: Test serves as executable documentation of expected error behavior
- **Completes P1.M1.T1**: This is the final subtask in the "Fix Empty State/Logs in Workflow.runFunctional() Error Handler" task
- **Follows Test-Driven Bug Fix**: Implementation (S2, S3) is complete; this test validates the fix works correctly

## What

Add a test to `src/__tests__/unit/workflow.test.ts` that creates a class-based workflow with `@ObservedState` decorated fields, triggers an error, and validates that the error event captures both state (decorated field values) and logs (log entries).

### Success Criteria

- [ ] New test case added to `src/__tests__/unit/workflow.test.ts`
- [ ] Test creates a class-based workflow with `@ObservedState` fields
- [ ] Test triggers an error during workflow execution
- [ ] Test asserts `error.state` contains captured observed field values
- [ ] Test asserts `error.logs` is an array (may be empty if no logs generated)
- [ ] Test follows existing test patterns in the file
- [ ] All tests pass after new test is added

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**YES** - This PRP provides:
- Exact file location and line numbers for adding the test
- Complete code snippets showing existing test patterns to follow
- Reference patterns for `@ObservedState` usage from decorators.test.ts
- Reference patterns for error testing from workflow.test.ts
- The exact implementation being tested (runFunctional error handler)
- All required imports and test structure
- Known gotchas about functional vs class-based workflows

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/__tests__/unit/workflow.test.ts
  why: TARGET FILE - Add new test case to this file
  pattern: Follow existing test structure (describe/it blocks, observer pattern)
  gotcha: Test file already has test at lines 82-130 with same test name - use different name
  line_range: 1-131 (full file)
  critical: Lines 82-130 show "should capture state and logs in functional workflow error" - this is the pattern to follow

- file: src/__tests__/unit/decorators.test.ts
  why: Reference pattern for @ObservedState usage in tests
  pattern: Lines 69-100 show StateTestWorkflow class with @ObservedState decorators
  critical: Shows how to create class with @ObservedState(), @ObservedState({ redact: true }), @ObservedState({ hidden: true })
  line_range: 69-100

- file: src/core/workflow.ts
  why: Implementation being tested - runFunctional() error handler
  pattern: Lines 283-301 show the error handler that captures state and logs
  line_range: 283-301
  critical: Line 295: `state: getObservedState(this)` - this is what the test validates
  critical: Line 296: `logs: [...this.node.logs] as LogEntry[]` - this is what the test validates

- file: src/decorators/observed-state.ts
  why: Understanding how getObservedState() works and what it returns
  pattern: Lines 50-77 show getObservedState function implementation
  critical: Returns empty object {} if no fields decorated with @ObservedState
  line_range: 50-77

- file: src/types/error.ts
  why: WorkflowError interface definition - structure of error object
  pattern: WorkflowError interface with state and logs properties
  gotcha: error.state is SerializedWorkflowState, error.logs is LogEntry[]

- file: src/types/logging.ts
  why: LogEntry type definition - structure of log entries
  pattern: LogEntry interface with id, workflowId, timestamp, level, message, data properties

- url: https://vitest.dev/guide/assertions.html#tobeundefined-tobedefined-tobetruthy-tobefalsy-tobenull-tobenan
  why: Vitest assertions documentation - expect().toBeDefined(), expect().toBe(), etc.
  critical: Reference for error testing assertions

- url: https://vitest.dev/guide/expect.html
  why: Vitest expect API - custom matchers like expect.objectContaining()
  critical: For partial object matching in error assertions
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                    # Compiled JavaScript (not modified)
├── docs/                    # User documentation
├── examples/
│   └── examples/
│       └── 05-error-handling.ts  # Error handling example
├── plan/
│   ├── architecture/        # Architecture documentation
│   ├── docs/
│   │   └── bugfix/
│   │       └── system_context.md
│   └── bugfix/
│       ├── P1M1T1S1/PRP.md
│       ├── P1M1T1S2/PRP.md
│       ├── P1M1T1S3/PRP.md
│       └── P1M1T1S4/        # THIS PRP LOCATION
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   └── unit/
│   │       ├── workflow.test.ts      # TARGET FILE - Add test here
│   │       └── decorators.test.ts    # Reference for @ObservedState patterns
│   ├── core/
│   │   ├── workflow.ts               # Implementation being tested
│   │   └── workflow-context.ts
│   ├── decorators/
│   │   ├── step.ts
│   │   └── observed-state.ts         # getObservedState function
│   └── types/
│       ├── workflow.ts
│       ├── logging.ts                # LogEntry interface
│       └── error.ts                  # WorkflowError interface
├── package.json
├── vitest.config.ts
└── tsconfig.json
```

### Desired Codebase Tree (files to be added)

```bash
# No new files - adding test case to existing file
# Modified: src/__tests__/unit/workflow.test.ts
#   - Add new test case after line 130 (end of existing tests)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Test name collision
// There is already a test named "should capture state and logs in functional workflow error" at lines 82-130
// Use a different name: "should capture @ObservedState fields in workflow error state"
// OR: Enhance the existing test if appropriate

// CRITICAL: Functional vs Class-based workflows
// Functional workflows: new Workflow(config, async (ctx) => {...}) - CANNOT use @ObservedState
// Class-based workflows: class MyWorkflow extends Workflow {...} - CAN use @ObservedState
// The test must use a class-based workflow to test @ObservedState fields

// CRITICAL: getObservedState(this) behavior
// Returns {} if no @ObservedState decorated fields exist
// Returns object with decorated field values if fields exist
// Applies redaction: @ObservedState({ redact: true }) fields become '***'
// Applies hiding: @ObservedState({ hidden: true }) fields are excluded

// CRITICAL: Error event capture pattern
// Must use observer to capture error events
// Filter events by type: events.filter((e) => e.type === 'error')
// Access error object: errorEvent.error.state, errorEvent.error.logs

// CRITICAL: Test file imports
// Already imports: Workflow, WorkflowObserver, LogEntry, WorkflowEvent
// Need to add: ObservedState, getObservedState (if testing state directly)

// CRITICAL: Logs array may be empty
// If workflow doesn't generate logs, error.logs will be []
// This is expected behavior - validate it's an array, not that it has entries

// CRITICAL: Run method is async
// Tests must use async/await pattern
// Use await expect(workflow.run()).rejects.toThrow() pattern
```

## Implementation Blueprint

### Data Models and Structure

**Relevant Types** (for context):
```typescript
// From src/decorators/observed-state.ts
export function ObservedState(meta: StateFieldMetadata = {}) {
  // Class field decorator - marks fields for state capture
}

export function getObservedState(obj: object): SerializedWorkflowState {
  // Returns object with decorated field values
  // Empty object {} if no decorated fields
}

// From src/types/workflow.ts
export interface SerializedWorkflowState {
  [key: string]: unknown;
}

// From src/types/error.ts
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // <-- Captured by getObservedState(this)
  logs: LogEntry[];                 // <-- Captured by [...this.node.logs]
}

// From src/types/logging.ts
export interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD REQUIRED IMPORTS TO workflow.test.ts
  - CHECK: Current imports at line 1-2
  - ADD: ObservedState decorator to import statement if not present
  - ADD: getObservedState function to import statement if not present
  - PATTERN: Follow existing import pattern from decorators.test.ts line 2
  - CURRENT: import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent } from '../../index.js';
  - NEW: import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent, ObservedState, getObservedState } from '../../index.js';
  - PLACEMENT: Top of file, line 2
  - DEPENDENCIES: None

Task 2: CREATE TEST WORKFLOW CLASS WITH @ObservedState FIELDS
  - CREATE: TestWorkflowWithObservedState class inside test file
  - IMPLEMENT: Multiple @ObservedState decorated fields
  - INCLUDE: @ObservedState() for normal field (visible with value)
  - INCLUDE: @ObservedState({ redact: true }) for redacted field (shows '***')
  - INCLUDE: @ObservedState({ hidden: true }) for hidden field (not in state)
  - IMPLEMENT: run() method that triggers an error
  - PATTERN: Follow StateTestWorkflow from decorators.test.ts lines 70-81
  - PATTERN: Follow FailingWorkflow from decorators.test.ts lines 49-58
  - PLACEMENT: Inside describe('Workflow') block or in new describe block
  - DEPENDENCIES: Task 1

Task 3: WRITE TEST CASE FOR ERROR STATE CAPTURE
  - CREATE: New it() block with descriptive name
  - NAME: "should capture @ObservedState fields in workflow error state"
  - ARRANGE: Create observer to capture error events
  - ARRANGE: Instantiate test workflow
  - ARRANGE: Attach observer to workflow
  - ACT: Run workflow and expect error to be thrown
  - ASSERT: Verify error event was emitted
  - ASSERT: Verify error.state contains observed field values
  - ASSERT: Verify redacted field shows '***'
  - ASSERT: Verify hidden field is NOT in state
  - ASSERT: Verify error.logs is an array
  - PATTERN: Follow lines 82-130 for observer and error testing pattern
  - PLACEMENT: After existing tests in workflow.test.ts (after line 130)
  - DEPENDENCIES: Task 2

Task 4: RUN TESTS TO VALIDATE
  - RUN: npm test (or npm run test)
  - VERIFY: New test passes
  - VERIFY: All existing tests still pass (no regression)
  - DEPENDENCIES: Task 3
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// IMPORTS TO ADD (Line 2 in workflow.test.ts)
// ============================================================
// CURRENT:
import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent } from '../../index.js';

// NEW (add ObservedState and getObservedState):
import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent, ObservedState, getObservedState } from '../../index.js';

// ============================================================
// TEST WORKFLOW CLASS (add before or inside test)
// ============================================================
// Reference from decorators.test.ts lines 70-81
class StateTestWorkflow extends Workflow {
  @ObservedState()
  publicField: string = 'public';

  @ObservedState({ redact: true })
  secretField: string = 'secret';

  @ObservedState({ hidden: true })
  hiddenField: string = 'hidden';

  async run(): Promise<void> {
    // Trigger an error to test error state capture
    throw new Error('Test error from state workflow');
  }
}

// Alternative: Modify field values in run() before error
class StatefulErrorWorkflow extends Workflow {
  @ObservedState()
  stepCount: number = 0;

  @ObservedState({ redact: true })
  apiKey: string = 'secret-key-123';

  @ObservedState({ hidden: true })
  internalCounter: number = 42;

  async run(): Promise<void> {
    this.stepCount = 5;
    this.apiKey = 'updated-key';
    this.internalCounter = 99;
    throw new Error('Error after state update');
  }
}

// ============================================================
// TEST CASE TEMPLATE
// ============================================================
it('should capture @ObservedState fields in workflow error state', async () => {
  // Arrange: Create observer to capture error events
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  // Arrange: Create workflow with @ObservedState fields
  const workflow = new StatefulErrorWorkflow();

  // Act: Attach observer and trigger error
  workflow.addObserver(observer);
  await expect(workflow.run()).rejects.toThrow('Error after state update');

  // Assert: Verify error event was emitted
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);

  // Assert: Verify error structure
  const errorEvent = errorEvents[0];
  expect(errorEvent.error).toBeDefined();
  expect(errorEvent.error.message).toBe('Error after state update');

  // Assert: Verify @ObservedState fields were captured
  expect(errorEvent.error.state).toBeDefined();
  expect(typeof errorEvent.error.state).toBe('object');

  // Assert: Verify public field value is captured
  expect(errorEvent.error.state.stepCount).toBe(5);

  // Assert: Verify redacted field shows '***'
  expect(errorEvent.error.state.apiKey).toBe('***');

  // Assert: Verify hidden field is NOT in state
  expect('internalCounter' in errorEvent.error.state).toBe(false);

  // Assert: Verify logs array is present (may be empty)
  expect(errorEvent.error.logs).toBeDefined();
  expect(Array.isArray(errorEvent.error.logs)).toBe(true);

  // Assert: Verify workflow status
  expect(workflow.status).toBe('failed');

  // Assert: Verify workflowId is captured
  expect(errorEvent.error.workflowId).toBe(workflow.id);
});

// ============================================================
// ALTERNATIVE: Simpler test without field value changes
// ============================================================
it('should capture @ObservedState initial values in workflow error', async () => {
  const events: WorkflowEvent[] = [];
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workflow = new StateTestWorkflow();
  workflow.addObserver(observer);

  await expect(workflow.run()).rejects.toThrow('Test error from state workflow');

  const errorEvents = events.filter((e) => e.type === 'error');
  const errorEvent = errorEvents[0];

  // Verify captured state
  expect(errorEvent.error.state.publicField).toBe('public');
  expect(errorEvent.error.state.secretField).toBe('***');
  expect('hiddenField' in errorEvent.error.state).toBe(false);
  expect(Array.isArray(errorEvent.error.logs)).toBe(true);
});
```

### Integration Points

```yaml
TEST FILE:
  - file: src/__tests__/unit/workflow.test.ts
  - add_after: Line 130 (end of existing tests)
  - add_before: Line 131 (closing describe block)
  - add_import: ObservedState, getObservedState to line 2

TEST RUNNER:
  - command: npm test
  - config: vitest.config.ts
  - pattern: All *.test.ts files are auto-discovered

OBSERVER PATTERN:
  - interface: WorkflowObserver from src/types/workflow.ts
  - methods: onLog, onEvent, onStateUpdated, onTreeChanged
  - usage: workflow.addObserver(observer)

ERROR EVENT STRUCTURE:
  - type: 'error'
  - node: WorkflowNode
  - error: WorkflowError with state and logs properties
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run build
# Expected: Zero compilation errors
# If errors exist, check import statements and class syntax

# Type checking
npx tsc --noEmit
# Expected: Zero type errors

# Linting (if configured)
npm run lint
# Expected: Zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npm test src/__tests__/unit/workflow.test.ts

# Run specific test by name (after implementation)
npm test -t "should capture @ObservedState fields"

# Run full test suite
npm test

# Expected: All tests pass
# Specifically: New test "should capture @ObservedState fields" passes
# No regression in existing tests

# Expected test output:
# ✓ src/__tests__/unit/workflow.test.ts (N)
#   ✓ Workflow
#     ✓ should create with unique id
#     ✓ should use class name as default name
#     ✓ should use custom name when provided
#     ✓ should start with idle status
#     ✓ should attach child to parent
#     ✓ should emit logs to observers
#     ✓ should emit childAttached event
#     ✓ should capture state and logs in functional workflow error
#     ✓ should capture @ObservedState fields in workflow error state  <-- NEW TEST
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test is properly integrated
grep -n "should capture.*ObservedState" src/__tests__/unit/workflow.test.ts
# Expected: Shows line number of new test

# Verify imports are correct
grep -n "ObservedState" src/__tests__/unit/workflow.test.ts
# Expected: Shows import statement and usage in test class

# Run all workflow tests
npm test -- workflow
# Expected: All workflow-related tests pass
```

### Level 4: Domain-Specific Validation

```bash
# Manual verification - inspect test behavior
npm test -- -t "should capture @ObservedState fields" --reporter=verbose

# Expected verbose output shows:
# - Observer capturing error event
# - Error state containing stepCount: 5
# - Error state containing apiKey: '***'
# - Error state NOT containing internalCounter
# - Error logs being an array

# Verify test validates the fix from P1.M1.T1.S2 and P1.M1.T1.S3
grep -A 5 "state: getObservedState" src/core/workflow.ts
# Expected: Shows line 295 with state: getObservedState(this)

grep -A 5 "logs:.*this.node.logs" src/core/workflow.ts
# Expected: Shows line 296 with logs: [...this.node.logs] as LogEntry[]
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript compilation errors: `npm run build`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] New test case added to workflow.test.ts
- [ ] Required imports added (ObservedState, getObservedState)

### Feature Validation

- [ ] Test creates class-based workflow with @ObservedState fields
- [ ] Test triggers error during workflow execution
- [ ] Test asserts error.state contains captured field values
- [ ] Test asserts redacted fields show '***'
- [ ] Test asserts hidden fields are excluded
- [ ] Test asserts error.logs is an array
- [ ] Test validates workflow status is 'failed'
- [ ] Test validates workflowId is captured
- [ ] Test follows existing test patterns
- [ ] No regression in existing tests

### Code Quality Validation

- [ ] Test name is descriptive and unique (no collision)
- [ ] Test follows AAA pattern (Arrange, Act, Assert)
- [ ] Test uses observer pattern for event capture
- [ ] Test uses async/await properly
- [ ] Test has clear assertions with descriptive messages
- [ ] Test is self-contained (no external dependencies)
- [ ] Imports follow existing patterns

### Documentation & Deployment

- [ ] Test is self-documenting (descriptive variable names)
- [ ] No environment variables needed for test
- [ ] Test can run independently
- [ ] Test file has proper imports

---

## Anti-Patterns to Avoid

- ❌ **Don't create functional workflow with @ObservedState** - Functional workflows can't use class decorators
- ❌ **Don't use existing test name** - "should capture state and logs in functional workflow error" already exists at line 82
- ❌ **Don't forget to add imports** - ObservedState and getObservedState must be imported
- ❌ **Don't assume logs has entries** - Empty logs array is valid
- ❌ **Don't test hidden field presence** - Hidden fields should NOT be in state
- ❌ **Don't test redacted field value** - Redacted fields should be '***', not actual value
- ❌ **Don't skip observer pattern** - Must use observer to capture error events
- ❌ **Don't use sync execution** - run() is async, must use await
- ❌ **Don't modify existing tests** - Add new test, don't change existing ones
- ❌ **Don't test getObservedState directly** - Test it through error handler behavior

---

## Confidence Score

**10/10** for one-pass implementation success likelihood

**Justification**:
- Clear file location and test structure specified
- Existing test patterns to follow (lines 82-130 in workflow.test.ts)
- Reference implementation for @ObservedState in decorators.test.ts
- Implementation being tested is complete and verified (P1.M1.T1.S2, P1.M1.T1.S3)
- Simple test addition - no complex logic or new files required
- All required imports and patterns documented
- Test runner (vitest) already configured and working

**Risk Factors**:
- Test name collision with existing test - mitigated by specifying different name
- Confusion about functional vs class-based workflows - mitigated by clear documentation
- Missing imports - mitigated by explicit import instructions

**Mitigation**: PRP provides exact code snippets, line numbers, and patterns to follow. Clear distinction between functional and class-based workflows prevents confusion.

## Related Work Items

- **P1.M1.T1.S1**: Add getObservedState import to workflow.ts - ✅ COMPLETE
- **P1.M1.T1.S2**: Replace empty state object with getObservedState(this) - ✅ COMPLETE (line 295)
- **P1.M1.T1.S3**: Replace empty logs array with actual logs - ✅ COMPLETE (line 296)
- **P1.M1.T1.S4**: Write test for functional workflow error state capture - ⏳ THIS TASK
- **P1.M1.T2**: Fix Empty State/Logs in WorkflowContext.step() Error Handler - ✅ COMPLETE
