# PRP: Write Test for WorkflowContext Error State Capture

---

## Goal

**Feature Goal**: Add a comprehensive test to `src/__tests__/unit/context.test.ts` that validates the `WorkflowContext.step()` error handler properly captures state (via `getObservedState(this.workflow)`) and logs (via `[...this.workflow.node.logs] as LogEntry[]`) when errors occur during step execution.

**Deliverable**: A new test case `should capture state and logs in step() error handler` added to the existing test suite in `src/__tests__/unit/context.test.ts` that validates error state/logs capture for `WorkflowContext.step()` method.

**Success Definition**: The test creates a Workflow with `@ObservedState` decorated fields, calls `ctx.step()` with a function that throws an error, and asserts that the error event's `state` property contains captured observed field values and `logs` property contains log entries.

## User Persona

**Target User**: Developer/QA Engineer who needs to verify that `WorkflowContext.step()` error handlers properly capture workflow state and logs for debugging purposes.

**Use Case**: When developing or testing workflows that use the functional `ctx.step()` API, developers need assurance that error events emitted from step failures contain complete execution context (state and logs) to diagnose failures and understand what happened before the error occurred.

**User Journey**:
1. Developer writes a workflow using the functional executor pattern with `ctx.step()` calls
2. Developer optionally decorates workflow class fields with `@ObservedState` for state tracking
3. Step execution may encounter errors during workflow run
4. Error event is emitted with `WorkflowError` object containing `state` and `logs`
5. Developer inspects `error.state` to see captured workflow state
6. Developer inspects `error.logs` to see execution history

**Pain Points Addressed**:
- Previously `error.state` was empty object `{}` for all step() errors
- Previously `error.logs` was empty array `[]` for all step() errors
- No test validation that `getObservedState(this.workflow)` actually captures decorated fields in step() error handler
- No test validation that `[...this.workflow.node.logs]` actually captures log entries in step() error handler

## Why

- **Bug Fix Validation**: Subtask P1.M1.T2.S4 requires a test to validate the fixes from P1.M1.T2.S2 (state capture in first error handler) and P1.M1.T2.S3 (state/logs capture in second error handler)
- **Regression Prevention**: Ensures future changes don't break error state/logs capture in `WorkflowContext.step()` method
- **Documentation**: Test serves as executable documentation of expected error behavior for the step() API
- **Completes P1.M1.T2**: This is the final subtask in the "Fix Empty State/Logs in WorkflowContext.step() Error Handler" task
- **Follows Test-Driven Bug Fix**: Implementation (S2, S3) is complete; this test validates the fix works correctly
- **Complements Existing Tests**: The existing test in `workflow.test.ts` (lines 132-207) validates state capture through the full workflow execution path; this new test focuses specifically on the `step()` error handler behavior

## What

Add a test to `src/__tests__/unit/context.test.ts` that:
1. Creates a Workflow class with `@ObservedState` decorated fields
2. Uses a functional executor that calls `ctx.step()` with a failing function
3. Captures error events via `WorkflowObserver`
4. Validates that the error event contains captured `state` (with @ObservedState field values)
5. Validates that the error event contains captured `logs` (as an array)

### Success Criteria

- [ ] New test case added to `src/__tests__/unit/context.test.ts`
- [ ] Test creates a Workflow class with `@ObservedState` fields
- [ ] Test uses functional executor pattern (not class-based run() method)
- [ ] Test calls `ctx.step()` with a function that throws
- [ ] Test asserts `error.state` contains captured observed field values
- [ ] Test asserts `error.logs` is an array (may be empty if no logs generated before error)
- [ ] Test follows existing test patterns in `workflow.test.ts`
- [ ] All tests pass after new test is added

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**YES** - This PRP provides:
- Exact file location for adding the test (`src/__tests__/unit/context.test.ts`)
- Complete code snippets showing existing test patterns to follow from `workflow.test.ts`
- Reference patterns for `@ObservedState` usage from existing tests
- The exact implementation being tested (WorkflowContext.step() error handlers in workflow-context.ts)
- All required imports and test structure
- Known gotchas about functional vs class-based workflows
- Specific line numbers for error handlers being tested

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/__tests__/unit/workflow.test.ts
  why: PRIMARY REFERENCE - Contains the exact test pattern to follow
  pattern: Lines 132-207 show "should capture @ObservedState fields in workflow error state"
  critical: Shows complete test structure: observer setup, @ObservedState class, ctx.step() error trigger, assertions
  line_range: 132-207
  gotcha: This test already exists and validates step() error handler - P1.M1.T2.S4 may need to enhance or add a variant

- file: src/__tests__/unit/workflow.test.ts
  why: Lines 82-130 show basic functional workflow error testing
  pattern: Shows observer pattern, ctx.step() error trigger, basic error assertions
  line_range: 82-130
  critical: Lines 98-100 show ctx.step() usage with throwing function

- file: src/__tests__/unit/context.test.ts
  why: TARGET FILE - Add new test case to this file
  pattern: Current tests use vitest describe/it blocks, simple mock creation
  line_range: 1-138
  gotcha: Current tests target AgentExecutionContext, not WorkflowContext. Add new describe() block for WorkflowContext tests
  critical: Consider adding a new describe('WorkflowContext', () => {...}) block to separate from AgentExecutionContext tests

- file: src/core/workflow-context.ts
  why: Implementation being tested - WorkflowContext.step() error handlers
  pattern: Lines 155-165 show first error handler in step() method
  pattern: Lines 319-329 show second error handler in replaceLastPromptResult() method
  line_range: 155-165, 319-329
  critical: Line 161: `state: getObservedState(this.workflow)` - this is what the test validates
  critical: Line 162: `logs: [...this.workflow.node.logs] as LogEntry[]` - this is what the test validates

- file: src/__tests__/unit/decorators.test.ts
  why: Reference pattern for @ObservedState usage in tests
  pattern: Lines 69-100 show StateTestWorkflow class with @ObservedState decorators
  critical: Shows how to create class with @ObservedState(), @ObservedState({ redact: true }), @ObservedState({ hidden: true })
  line_range: 69-100

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

- file: plan/bugfix/P1M1T1S4/PRP.md
  why: Related PRP for functional workflow error state capture test
  pattern: Similar structure and patterns, but for Workflow.runFunctional() instead of WorkflowContext.step()
  critical: Use as template reference, but note the difference between runFunctional() and step() error handlers

- url: https://vitest.dev/guide/assertions.html
  why: Vitest assertions documentation
  critical: expect().toBeDefined(), expect().toBe(), expect().rejects.toThrow()

- url: https://vitest.dev/guide/expect.html
  why: Vitest expect API for custom matchers
  critical: expect.objectContaining() for partial object matching
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
│       ├── P1M1T1S4/PRP.md
│       ├── P1M1T2S1/PRP.md
│       ├── P1M1T2S2/PRP.md
│       ├── P1M1T2S3/PRP.md
│       └── P1M1T2S4/        # THIS PRP LOCATION
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   └── unit/
│   │       ├── workflow.test.ts      # Reference test patterns
│   │       ├── decorators.test.ts    # Reference for @ObservedState
│   │       └── context.test.ts       # TARGET FILE - Add test here
│   ├── core/
│   │   ├── workflow.ts               # Workflow class
│   │   ├── workflow-context.ts       # Implementation being tested
│   │   └── context.ts                # AgentExecutionContext (different module)
│   ├── decorators/
│   │   ├── step.ts
│   │   └── observed-state.ts         # getObservedState function
│   └── types/
│       ├── workflow.ts
│       ├── logging.ts                # LogEntry interface
│       ├── error.ts                  # WorkflowError interface
│       └── workflow-context.ts       # WorkflowContext interface
├── package.json
├── vitest.config.ts
└── tsconfig.json
```

### Desired Codebase Tree (files to be added/modified)

```bash
# Modified: src/__tests__/unit/context.test.ts
#   - Add new describe() block for WorkflowContext tests
#   - Add test case "should capture state and logs in step() error handler"
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: AgentExecutionContext vs WorkflowContext
// context.test.ts currently tests AgentExecutionContext (from src/core/context.ts)
// This test should add a NEW describe() block for WorkflowContext (from src/core/workflow-context.ts)
// These are DIFFERENT modules - do not mix tests

// CRITICAL: WorkflowContext cannot be instantiated directly
// It is created internally by Workflow.createWorkflowContext()
// Tests must go through Workflow to access WorkflowContext behavior
// The ctx parameter in the functional executor IS the WorkflowContext

// CRITICAL: Existing test in workflow.test.ts (lines 132-207)
// This test ALREADY validates step() error state capture with @ObservedState
// P1.M1.T2.S4 test should either:
// 1. Enhance the existing test with more specific assertions
// 2. Add a focused variant test in context.test.ts as specified
// 3. Check if task intends for a DIFFERENT aspect of step() error handling

// CRITICAL: Functional vs Class-based workflows
// Functional workflows: new Workflow(config, async (ctx) => {...})
//   - ctx parameter is WorkflowContext
//   - Can still use @ObservedState on the Workflow class instance
// Class-based workflows: class MyWorkflow extends Workflow { async run() {...} }
//   - Use this.step() or create ctx manually
// The test should use functional pattern to test WorkflowContext.step()

// CRITICAL: getObservedState(this.workflow) behavior
// Returns {} if no @ObservedState decorated fields exist
// Returns object with decorated field values if fields exist
// Applies redaction: @ObservedState({ redact: true }) fields become '***'
// Applies hiding: @ObservedState({ hidden: true }) fields are excluded

// CRITICAL: Error event capture pattern
// Must use observer to capture error events
// Filter events by type: events.filter((e) => e.type === 'error')
// Access error object: errorEvent.error.state, errorEvent.error.logs

// CRITICAL: Test file imports
// context.test.ts currently imports from core/context.js
// Need to add imports from main index.js for Workflow, WorkflowObserver, etc.
// Need to add imports for @ObservedState and getObservedState

// CRITICAL: Logs array may be empty
// If workflow doesn't generate logs before the error, error.logs will be []
// This is expected behavior - validate it's an array, not that it has entries

// CRITICAL: Two error handlers in WorkflowContext
// First: In step() method at lines 155-165
// Second: In replaceLastPromptResult() method at lines 319-329
// Both were fixed in P1.M1.T2.S2 and P1.M1.T2.S3
// Test should trigger step() error to validate first error handler

// CRITICAL: Test name collision
// workflow.test.ts has "should capture @ObservedState fields in workflow error state"
// Use a different, more specific name: "should capture state and logs in step() error handler"
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
  state: SerializedWorkflowState;  // <-- Captured by getObservedState(this.workflow)
  logs: LogEntry[];                 // <-- Captured by [...this.workflow.node.logs]
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

// From src/types/workflow-context.ts
export interface WorkflowContext {
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  // ... other methods
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD REQUIRED IMPORTS TO context.test.ts
  - CHECK: Current imports at line 1-10
  - ADD: Workflow class from main index
  - ADD: WorkflowObserver interface from main index
  - ADD: WorkflowEvent type from main index
  - ADD: ObservedState decorator from main index
  - PATTERN: Follow import pattern from workflow.test.ts line 2
  - CURRENT: import { describe, it, expect } from 'vitest';
  - CURRENT: import { getExecutionContext, requireExecutionContext, runInContext, ... } from '../../core/context.js';
  - NEW: import { Workflow, WorkflowObserver, WorkflowEvent, ObservedState } from '../../index.js';
  - PLACEMENT: Top of file, after vitest import, line 2
  - DEPENDENCIES: None

Task 2: CREATE TEST WORKFLOW CLASS WITH @ObservedState FIELDS
  - CREATE: StatefulTestWorkflow class inside new describe block
  - IMPLEMENT: Multiple @ObservedState decorated fields
  - INCLUDE: @ObservedState() for normal field (visible with value)
  - INCLUDE: @ObservedState({ redact: true }) for redacted field (shows '***')
  - INCLUDE: @ObservedState({ hidden: true }) for hidden field (not in state)
  - PATTERN: Follow StateTestWorkflow from decorators.test.ts lines 70-81
  - PATTERN: Follow StatefulWorkflowClass from workflow.test.ts lines 135-144
  - PLACEMENT: Inside new describe('WorkflowContext', () => {...}) block
  - DEPENDENCIES: Task 1

Task 3: WRITE TEST CASE FOR STEP() ERROR STATE CAPTURE
  - CREATE: New describe() block for WorkflowContext tests
  - CREATE: New it() block with descriptive name
  - NAME: "should capture state and logs in step() error handler"
  - ARRANGE: Create observer to capture error events
  - ARRANGE: Create StatefulTestWorkflow class instance with functional executor
  - ARRANGE: Modify @ObservedState fields on workflow instance
  - ARRANGE: Attach observer to workflow
  - ACT: Run workflow (which calls ctx.step() with throwing function)
  - ASSERT: Verify error event was emitted
  - ASSERT: Verify error.state contains observed field values
  - ASSERT: Verify redacted field shows '***'
  - ASSERT: Verify hidden field is NOT in state
  - ASSERT: Verify error.logs is an array
  - PATTERN: Follow workflow.test.ts lines 132-207 for complete test structure
  - PLACEMENT: After existing AgentExecutionContext describe block, after line 138
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
// IMPORTS TO ADD (Line 2 in context.test.ts)
// ============================================================
// CURRENT (lines 1-10):
import { describe, it, expect } from 'vitest';
import {
  getExecutionContext,
  requireExecutionContext,
  runInContext,
  runInContextSync,
  hasExecutionContext,
  createChildContext,
  type AgentExecutionContext,
} from '../../core/context.js';
import type { WorkflowNode, WorkflowEvent } from '../../types/index.js';

// NEW (add after line 10):
import { Workflow, WorkflowObserver, ObservedState } from '../../index.js';

// ============================================================
// TEST WORKFLOW CLASS (add inside or before test)
// ============================================================
// Reference from workflow.test.ts lines 135-144
class StatefulTestWorkflow extends Workflow {
  @ObservedState()
  stepCount: number = 0;

  @ObservedState({ redact: true })
  apiKey: string = 'secret-key-123';

  @ObservedState({ hidden: true })
  internalCounter: number = 42;
}

// ============================================================
// TEST CASE TEMPLATE
// ============================================================
// Reference from workflow.test.ts lines 132-207
describe('WorkflowContext', () => {
  it('should capture state and logs in step() error handler', async () => {
    // Arrange: Create observer to capture error events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create workflow with @ObservedState fields using functional executor
    const workflow = new StatefulTestWorkflow(
      { name: 'StepErrorTest' },
      async (ctx) => {
        // Modify @ObservedState fields on the workflow instance
        (workflow as any).stepCount = 5;
        (workflow as any).apiKey = 'updated-key';
        (workflow as any).internalCounter = 99;

        // Execute a step that will fail - THIS TRIGGERS WorkflowContext.step() ERROR HANDLER
        await ctx.step('failing-step', async () => {
          throw new Error('Test error from step');
        });
      }
    );

    // Act: Attach observer and trigger error
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Test error from step');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Test error from step');

    // Assert: Verify @ObservedState fields were captured in state
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
});

// ============================================================
// ALTERNATIVE: Simpler test without field value changes
// ============================================================
it('should capture @ObservedState initial values in step() error', async () => {
  const events: WorkflowEvent[] = [];
  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workflow = new StatefulTestWorkflow(
    { name: 'InitialStateTest' },
    async (ctx) => {
      await ctx.step('failing-step', async () => {
        throw new Error('Test error');
      });
    }
  );

  workflow.addObserver(observer);
  await expect(workflow.run()).rejects.toThrow('Test error');

  const errorEvents = events.filter((e) => e.type === 'error');
  const errorEvent = errorEvents[0];

  // Verify captured state (initial values)
  expect(errorEvent.error.state.stepCount).toBe(0);
  expect(errorEvent.error.state.apiKey).toBe('***');
  expect('internalCounter' in errorEvent.error.state).toBe(false);
  expect(Array.isArray(errorEvent.error.logs)).toBe(true);
});
```

### Integration Points

```yaml
TEST FILE:
  - file: src/__tests__/unit/context.test.ts
  - add_after: Line 138 (end of AgentExecutionContext describe block)
  - add_import: Workflow, WorkflowObserver, WorkflowEvent, ObservedState to line 2

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

WORKFLOWCONTEXT:
  - interface: WorkflowContext from src/types/workflow-context.ts
  - implementation: WorkflowContextImpl from src/core/workflow-context.ts
  - step() method: Lines 144-165 in workflow-context.ts
  - error handler: Lines 155-165 in workflow-context.ts
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
npm test src/__tests__/unit/context.test.ts

# Run specific test by name (after implementation)
npm test -t "should capture state and logs in step"

# Run full test suite
npm test

# Expected: All tests pass
# Specifically: New test "should capture state and logs in step() error handler" passes
# No regression in existing AgentExecutionContext tests

# Expected test output:
# ✓ src/__tests__/unit/context.test.ts (N)
#   ✓ AgentExecutionContext
#     ✓ should return undefined outside of context
#     ✓ should throw when requiring context outside of context
#     ✓ ... (existing tests)
#   ✓ WorkflowContext
#     ✓ should capture state and logs in step() error handler  <-- NEW TEST
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test is properly integrated
grep -n "should capture state and logs in step" src/__tests__/unit/context.test.ts
# Expected: Shows line number of new test

# Verify imports are correct
grep -n "Workflow" src/__tests__/unit/context.test.ts
# Expected: Shows import statement and usage in test

# Run all context tests
npm test -- context
# Expected: All context-related tests pass

# Run all workflow tests to ensure no regression
npm test -- workflow
# Expected: All workflow tests pass (including existing step() error tests)
```

### Level 4: Domain-Specific Validation

```bash
# Manual verification - inspect test behavior
npm test -t "should capture state and logs in step" --reporter=verbose

# Expected verbose output shows:
# - Observer capturing error event
# - Error state containing stepCount: 5
# - Error state containing apiKey: '***'
# - Error state NOT containing internalCounter
# - Error logs being an array

# Verify test validates the fix from P1.M1.T2.S2 and P1.M1.T2.S3
grep -A 5 "state: getObservedState" src/core/workflow-context.ts
# Expected: Shows line 161 with state: getObservedState(this.workflow)

grep -A 5 "logs:.*this.workflow.node.logs" src/core/workflow-context.ts
# Expected: Shows line 162 with logs: [...this.workflow.node.logs] as LogEntry[]

# Verify error event is emitted from step() method
grep -B 5 -A 10 "type: 'error'" src/core/workflow-context.ts | head -30
# Expected: Shows error emission in step() method error handler
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript compilation errors: `npm run build`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] New test case added to context.test.ts
- [ ] Required imports added (Workflow, WorkflowObserver, WorkflowEvent, ObservedState)
- [ ] New describe() block created for WorkflowContext tests

### Feature Validation

- [ ] Test creates Workflow class with @ObservedState fields
- [ ] Test uses functional executor pattern (async (ctx) => {...})
- [ ] Test calls ctx.step() with throwing function
- [ ] Test asserts error.state contains captured field values
- [ ] Test asserts redacted fields show '***'
- [ ] Test asserts hidden fields are excluded
- [ ] Test asserts error.logs is an array
- [ ] Test validates workflow status is 'failed'
- [ ] Test validates workflowId is captured
- [ ] Test follows existing test patterns
- [ ] No regression in existing tests

### Code Quality Validation

- [ ] Test name is descriptive and unique (no collision with workflow.test.ts tests)
- [ ] Test follows AAA pattern (Arrange, Act, Assert)
- [ ] Test uses observer pattern for event capture
- [ ] Test uses async/await properly
- [ ] Test has clear assertions with descriptive comments
- [ ] Test is self-contained (no external dependencies)
- [ ] Imports follow existing patterns
- [ ] New describe() block separates WorkflowContext from AgentExecutionContext tests

### Documentation & Deployment

- [ ] Test is self-documenting (descriptive variable names and comments)
- [ ] No environment variables needed for test
- [ ] Test can run independently
- [ ] Test file has proper imports

---

## Anti-Patterns to Avoid

- ❌ **Don't mix AgentExecutionContext and WorkflowContext tests** - Add a new describe() block
- ❌ **Don't test runFunctional() error handler** - That's P1.M1.T1.S4's job
- ❌ **Don't use class-based run() method** - Use functional executor to test ctx.step()
- ❌ **Don't create WorkflowContext directly** - It's created internally by Workflow
- ❌ **Don't use existing test name from workflow.test.ts** - Use "should capture state and logs in step() error handler"
- ❌ **Don't forget to add imports** - Workflow, WorkflowObserver, WorkflowEvent, ObservedState must be imported
- ❌ **Don't assume logs has entries** - Empty logs array is valid
- ❌ **Don't test hidden field presence** - Hidden fields should NOT be in state
- ❌ **Don't test redacted field value** - Redacted fields should be '***', not actual value
- ❌ **Don't skip observer pattern** - Must use observer to capture error events
- ❌ **Don't use sync execution** - run() is async, must use await
- ❌ **Don't modify existing AgentExecutionContext tests** - Add new tests in separate describe block
- ❌ **Don't duplicate existing test from workflow.test.ts** - Ensure this test adds unique value or is specifically required

---

## Confidence Score

**9/10** for one-pass implementation success likelihood

**Justification**:
- Clear file location and test structure specified
- Existing test patterns to follow (workflow.test.ts lines 132-207)
- Reference implementation for @ObservedState in decorators.test.ts
- Implementation being tested is complete and verified (P1.M1.T2.S2, P1.M1.T2.S3)
- Simple test addition - no complex logic or new files required
- All required imports and patterns documented
- Test runner (vitest) already configured and working

**Risk Factors**:
- Potential confusion with existing test in workflow.test.ts (lines 132-207) which tests similar functionality - mitigated by specifying different test name and location
- Confusion about AgentExecutionContext vs WorkflowContext - mitigated by explicit instruction to create new describe() block
- Missing imports - mitigated by explicit import instructions

**Mitigation**: PRP provides exact code snippets, line numbers, and patterns to follow. Clear distinction between AgentExecutionContext and WorkflowContext prevents confusion. Note that existing test in workflow.test.ts already validates this behavior - verify with project lead if this task is still needed or if existing test is sufficient.

---

## Related Work Items

- **P1.M1.T2.S1**: Add getObservedState import to workflow-context.ts - ✅ COMPLETE
- **P1.M1.T2.S2**: Fix first error handler in step() method (line 155-162) - ✅ COMPLETE (line 161)
- **P1.M1.T2.S3**: Fix second error handler in replaceLastPromptResult() method (line 319-326) - ✅ COMPLETE (line 327)
- **P1.M1.T2.S4**: Write test for WorkflowContext error state capture - ⏳ THIS TASK
- **P1.M1.T1**: Fix Empty State/Logs in Workflow.runFunctional() Error Handler - ✅ COMPLETE
