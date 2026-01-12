# Product Requirement Prompt (PRP): Test for Functional Workflow Error State Capture

**Work Item**: P1.M1.T1.S4
**Title**: Write test for functional workflow error state capture
**Status**: Ready for Implementation
**Confidence Score**: 9/10

---

## Goal

**Feature Goal**: Validate that functional workflow error handlers correctly capture workflow state (`@ObservedState` fields) and execution logs in error events.

**Deliverable**: A new test case in `src/__tests__/unit/workflow.test.ts` that validates error state and logs capture when a functional workflow throws an error.

**Success Definition**:
- Test passes with proper assertions on `error.state` containing observed state properties
- Test passes with proper assertions on `error.logs` containing captured log entries
- Test follows existing test patterns in the codebase
- Running `npm run test` shows all tests pass including the new test

---

## User Persona

**Target User**: Developers maintaining the workflow engine, specifically those validating error handling fixes.

**Use Case**: When a functional workflow fails during execution, developers need confidence that the error event contains complete diagnostic information (state snapshot and execution logs) for debugging.

**User Journey**:
1. Developer makes changes to error handling logic
2. Developer runs `npm run test` to verify changes
3. Test validates that error events contain expected state and logs
4. Developer gains confidence that error diagnostics work correctly

**Pain Points Addressed**:
- Previously, error handlers returned empty state/logs, making debugging difficult
- Without automated tests, regressions could go undetected
- This test prevents future breakage of the error capture logic

---

## Why

- **Bug Fix Validation**: This test validates the fix implemented in P1.M1.T1.S3 (replacing empty state/logs with actual captured data)
- **Regression Prevention**: Ensures future code changes don't break error state capture
- **Documentation**: The test serves as executable documentation of how error state capture works
- **Debugging Support**: Proper error state capture is critical for production debugging workflows

---

## What

Add a test case to `src/__tests__/unit/workflow.test.ts` that:

1. Creates a functional workflow using the `Workflow` constructor with an executor function
2. Defines a test class with `@ObservedState` decorated fields
3. Logs messages during execution using `ctx.logger`
4. Triggers an error during workflow execution
5. Captures the emitted error event via observer
6. Asserts that `error.event.error.state` contains the observed state properties
7. Asserts that `error.event.error.logs` contains the log entries

### Success Criteria

- [ ] Test file modified: `src/__tests__/unit/workflow.test.ts`
- [ ] Test passes: `npm run test` succeeds with new test
- [ ] Validates state capture: `error.state` has expected properties
- [ ] Validates logs capture: `error.logs` array contains log entries
- [ ] Follows existing test patterns from `workflow.test.ts` and `agent-workflow.test.ts`
- [ ] No other tests are broken by this addition

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes. This PRP provides:
- Exact file paths and line numbers to reference
- Complete code examples of existing test patterns
- The exact implementation to test (from P1.M1.T1.S3)
- Testing framework details and commands
- Type definitions and interfaces
- External best practices with URLs

---

### Documentation & References

```yaml
# MUST READ - Core implementation files to understand what we're testing
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains the runFunctional() method with the error handler we need to test
  lines: 259-302
  pattern: The catch block at lines 283-301 shows error event emission with state/logs capture
  critical: Error event structure: { type: 'error', node, error: { message, original, workflowId, stack, state, logs } }

- file: /home/dustin/projects/groundswell/src/decorators/observed-state.ts
  why: Implementation of @ObservedState decorator and getObservedState() function
  lines: 25-77
  pattern: @ObservedState() marks fields for state capture, getObservedState(obj) returns SerializedWorkflowState
  gotcha: Hidden fields are skipped, redacted fields show '***'

- file: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  why: Existing test patterns in the file we need to modify
  pattern: Observer pattern for capturing events, describe/it structure, expect assertions
  critical: Import patterns, observer setup, async test structure

- file: /home/dustin/projects/groundswell/src/__tests__/integration/agent-workflow.test.ts
  why: Examples of functional workflow tests with error handling
  lines: 93-129 (functional workflow pattern), 181-205 (error handling pattern)
  pattern: new Workflow({ name }, async (ctx) => { ... }) for functional workflows

# Type definitions
- file: /home/dustin/projects/groundswell/src/types/events.ts
  why: WorkflowEvent discriminated union, error event type structure
  pattern: Error events have { type: 'error', node, error: WorkflowError }

- file: /home/dustin/projects/groundswell/src/types/logging.ts
  why: LogEntry interface structure
  pattern: { id, workflowId, timestamp, level, message, data?, parentLogId? }

# Testing configuration
- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Test framework configuration
  pattern: Tests in src/__tests__/**/*.test.ts, globals enabled

- file: /home/dustin/projects/groundswell/package.json
  why: Test scripts and dependencies
  lines: 34-37
  pattern: "test": "vitest run", "test:watch": "vitest"

# External best practices
- url: https://stordahl.dev/writing/error-handling-decorators
  why: TypeScript decorator error handling patterns with state capture
  critical: Shows how decorators capture 'this' context and augment errors

- url: https://docs.temporal.io/develop/typescript/failure-detection
  why: Workflow error handling with state capture patterns
  section: ApplicationFailure.create() with state capture

- url: https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type
  why: Type-safe error testing patterns in TypeScript
  critical: Custom error properties testing with type guards

# Project architecture context
- file: /home/dustin/projects/groundswell/plan/architecture/system_context.md
  why: Overall system architecture and workflow patterns
  section: "Hierarchy Patterns", "Event System"
  critical: Observer pattern, error event propagation
```

---

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── unit/
│   │   ├── workflow.test.ts          # TARGET FILE - add test here
│   │   ├── agent.test.ts
│   │   ├── cache-key.test.ts
│   │   ├── cache.test.ts
│   │   ├── context.test.ts
│   │   ├── decorators.test.ts
│   │   ├── introspection-tools.test.ts
│   │   ├── prompt.test.ts
│   │   ├── reflection.test.ts
│   │   └── tree-debugger.test.ts
│   └── integration/
│       └── agent-workflow.test.ts    # Reference for functional workflow tests
├── core/
│   ├── workflow.ts                   # Implementation being tested
│   ├── workflow-context.ts
│   └── logger.ts                     # WorkflowLogger for log capture
├── decorators/
│   ├── observed-state.ts             # @ObservedState and getObservedState()
│   ├── step.ts
│   └── task.ts
└── types/
    ├── events.ts                     # WorkflowEvent types
    ├── logging.ts                    # LogEntry interface
    └── workflow.ts                   # WorkflowNode, WorkflowStatus
```

---

### Desired Codebase Tree (No New Files)

```bash
# No new files needed - we are ADDING A TEST to existing file:

src/__tests__/
└── unit/
    └── workflow.test.ts              # MODIFY: Add new test case at end of file
        # New test: "should capture state and logs in functional workflow error"
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Functional workflow pattern
// Functional workflows use: new Workflow({ name }, async (ctx) => { ... })
// Class-based workflows extend Workflow class
// This test must use FUNCTIONAL pattern

// CRITICAL: @ObservedState decorator behavior
// @ObservedState() only works on CLASS fields, not in functional workflows
// Therefore: To test state capture in functional workflows, we need a workaround:
// 1. Create a test class with @ObservedState fields
// 2. Use that class in the functional workflow context
// OR: Test that error.state is an object (even if empty for pure functional workflows)
// OR: Test logs capture primarily, and state capture as a bonus

// CRITICAL: Error event structure
// error.event.error.state is SerializedWorkflowState (Record<string, unknown>)
// error.event.error.logs is LogEntry[]
// Access via: (event as WorkflowEvent & { type: 'error' }).error.state

// CRITICAL: Observer pattern
// Observers only attach to ROOT workflows
// Must call workflow.addObserver(observer) BEFORE running workflow
// observer.onEvent captures events, filter for type === 'error'

// CRITICAL: Test async errors
// Use: await expect(workflow.run()).rejects.toThrow('error message')
// Don't try/catch - use Vitest's async error assertion

// CRITICAL: Vitest configuration
// Test files must end in .test.ts
// Global functions enabled (describe, it, expect available without import)
// Run tests with: npm run test (or vitest run)

// CRITICAL: LogEntry structure
// Each log has: id, workflowId, timestamp, level, message, data?, parentLogId?
// Check message content and level for validation

// CRITICAL: getObservedState behavior
// Returns empty object {} if no @ObservedState fields on the object
// Hidden fields (hidden: true) are skipped
// Redacted fields (redact: true) show '***'
```

---

## Implementation Blueprint

### Test Structure Design

The test will follow this structure:

1. **Setup**: Create a test class with `@ObservedState` fields
2. **Create Functional Workflow**: Use `new Workflow({ name }, async (ctx) => { ... })`
3. **Observer Setup**: Create observer to capture error events
4. **Execution**: Run workflow, expect it to throw
5. **Assertions**: Validate error.state and error.logs

**Important Design Decision**: Since functional workflows use an executor function (not a class), we cannot directly use `@ObservedState` on functional workflow fields. The test has two valid approaches:

**Approach A (Recommended)**: Test logs capture primarily, and state capture structure:
- Create functional workflow that logs messages
- Trigger error
- Assert error.logs contains the log entries
- Assert error.state exists (even if empty for pure functional workflows)

**Approach B**: Create a test class with observed state, then use it in a functional context:
- More complex but tests full state capture
- May not be representative of real functional workflow usage

**This PRP recommends Approach A** as it's simpler and more representative of actual functional workflow usage.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ existing test file to understand patterns
  - READ: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  - UNDERSTAND: Observer pattern, describe/it structure, import statements
  - VALIDATION: Comprehend existing test patterns before writing new test

Task 2: CREATE new test case in workflow.test.ts
  - ADD: New describe block or it() block in existing 'Workflow' describe
  - LOCATION: After line 80, before closing describe brace
  - TEST NAME: "should capture state and logs in functional workflow error"
  - STRUCTURE: Follow existing test patterns (observer setup, async execution)

Task 3: IMPLEMENT functional workflow with logging
  - CREATE: new Workflow({ name: 'ErrorCaptureTest' }, async (ctx) => { ... })
  - ADD: ctx.logger.info() and ctx.logger.warn() calls to generate logs
  - TRIGGER: throw new Error('Test error') to trigger error handler
  - PATTERN: Follow lines 93-106 of agent-workflow.test.ts for functional workflow syntax

Task 4: IMPLEMENT observer to capture error events
  - CREATE: const events: WorkflowEvent[] = []
  - CREATE: observer with onEvent capturing events
  - PATTERN: Follow lines 190-195 of agent-workflow.test.ts
  - REGISTER: workflow.addObserver(observer) BEFORE run()

Task 5: IMPLEMENT error assertions
  - ASSERT: await expect(workflow.run()).rejects.toThrow('Test error')
  - FILTER: const errorEvents = events.filter(e => e.type === 'error')
  - ASSERT: errorEvents.length >= 1
  - ASSERT: errorEvents[0].error.logs is array with length > 0
  - ASSERT: errorEvents[0].error.logs[0].message matches expected log
  - ASSERT: errorEvents[0].error.state is defined (object)
  - PATTERN: Follow lines 199-204 of agent-workflow.test.ts

Task 6: RUN tests to validate
  - EXECUTE: npm run test
  - VERIFY: New test passes
  - VERIFY: No existing tests break
  - VALIDATION: All assertions pass
```

---

### Implementation Code Template

```typescript
// Add this test to src/__tests__/unit/workflow.test.ts
// Place after line 80, before closing describe brace

it('should capture state and logs in functional workflow error', async () => {
  // Arrange: Create observer to capture events
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  // Arrange: Create functional workflow with logging
  const workflow = new Workflow<void>(
    { name: 'ErrorCaptureTest' },
    async (ctx) => {
      // Log some messages during execution
      ctx.logger.info('Starting workflow execution');
      ctx.logger.warn('Potential issue detected');

      // Trigger error
      throw new Error('Test error');
    }
  );

  // Act: Attach observer and run workflow
  workflow.addObserver(observer);
  await expect(workflow.run()).rejects.toThrow('Test error');

  // Assert: Verify error event was emitted
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);

  // Assert: Verify error structure
  const errorEvent = errorEvents[0];
  expect(errorEvent.error).toBeDefined();
  expect(errorEvent.error.message).toBe('Test error');

  // Assert: Verify logs were captured
  expect(errorEvent.error.logs).toBeDefined();
  expect(Array.isArray(errorEvent.error.logs)).toBe(true);
  expect(errorEvent.error.logs.length).toBeGreaterThan(0);

  // Assert: Verify specific log entries
  const infoLog = errorEvent.error.logs.find((log) => log.message === 'Starting workflow execution');
  expect(infoLog).toBeDefined();
  expect(infoLog?.level).toBe('info');

  const warnLog = errorEvent.error.logs.find((log) => log.message === 'Potential issue detected');
  expect(warnLog).toBeDefined();
  expect(warnLog?.level).toBe('warn');

  // Assert: Verify state was captured (may be empty object for pure functional workflows)
  expect(errorEvent.error.state).toBeDefined();
  expect(typeof errorEvent.error.state).toBe('object');

  // Assert: Verify workflow status
  expect(workflow.status).toBe('failed');
});
```

---

### Integration Points

```yaml
NO NEW INTEGRATIONS NEEDED
  - This is a test addition only
  - No changes to production code
  - No new dependencies
  - No configuration changes

MODIFIED FILES:
  - file: src/__tests__/unit/workflow.test.ts
    action: Append new test case before closing describe brace
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding the test - fix any issues before proceeding
npm run test                       # Run all tests
# OR run specific test file:
npx vitest run src/__tests__/unit/workflow.test.ts

# Expected: All tests pass, including the new test
# If TypeScript errors: Check import statements and type annotations
# If test fails: Read error message and fix assertions

# For TypeScript type checking (if available):
npx tsc --noEmit                   # Type check the codebase

# Expected: Zero type errors
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file to validate
npx vitest run src/__tests__/unit/workflow.test.ts

# Expected output:
# ✓ Workflow
#   ✓ should create with unique id
#   ✓ should use class name as default name
#   ✓ should use custom name when provided
#   ✓ should start with idle status
#   ✓ should attach child to parent
#   ✓ should emit logs to observers
#   ✓ should emit childAttached event
#   ✓ should capture state and logs in functional workflow error  # NEW TEST

# Run all tests to ensure no regressions
npm run test

# Expected: All 155+ tests pass (existing 154 + 1 new)
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Run all unit tests
npm run test

# Run with coverage (if configured)
npx vitest run --coverage

# Expected: All tests pass, coverage report shows new test is counted

# Manual validation - run in watch mode to see test output
npm run test:watch

# Expected: Test runs successfully in watch mode, shows passing green checkmark
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Domain-specific validation for error testing:

# 1. Test different log levels
# Modify test to include: ctx.logger.debug(), ctx.logger.error()
# Verify all log levels are captured

# 2. Test with log data
# Add: ctx.logger.info('Message', { key: 'value' })
# Verify error.logs contains data field

# 3. Test error object properties
# Verify: error.event.error.workflowId matches workflow.id
# Verify: error.event.error.stack is defined for Error objects

# 4. Test multiple workflows
# Create multiple workflows with errors
# Verify each error event has correct workflowId

# 5. Test state capture with class-based workflows
# Create class-based workflow with @ObservedState
# Trigger error and verify state capture
# (This validates getObservedState() works correctly)

# Edge case tests to consider:
# - Workflow with no logs (error.logs should be empty array, not undefined)
# - Workflow with non-Error throw (error.event.error.original is not Error)
# - Multiple errors in sequence
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file compiles without TypeScript errors
- [ ] All existing tests still pass: `npm run test`
- [ ] New test passes: Look for green checkmark in test output
- [ ] Test is properly formatted (run linter if available)
- [ ] Test follows existing naming conventions

### Feature Validation

- [ ] Test validates error.logs capture with log entries
- [ ] Test validates error.state object exists
- [ ] Test verifies specific log messages are captured
- [ ] Test verifies log levels are preserved
- [ ] Test verifies workflow status is 'failed' after error

### Code Quality Validation

- [ ] Test follows existing patterns from workflow.test.ts
- [ ] Test follows existing patterns from agent-workflow.test.ts
- [ ] Observer pattern matches existing tests
- [ ] Assertions use expect() correctly
- [ ] Test name follows "should [verb] [feature]" pattern
- [ ] Test has clear Arrange/Act/Assert sections

### Documentation & Testing Best Practices

- [ ] Test is self-documenting with clear variable names
- [ ] Test failure messages would be clear to future developers
- [ ] Test covers both success and error paths appropriately
- [ ] Test is deterministic (no randomness or timing dependencies)

---

## Anti-Patterns to Avoid

- ❌ Don't create a separate test file - add to existing workflow.test.ts
- ❌ Don't use try/catch - use Vitest's `await expect().rejects.toThrow()`
- ❌ Don't forget to attach observer BEFORE running workflow
- ❌ Don't assume error.state has specific properties (functional workflows may not have @ObservedState)
- ❌ Don't hardcode array indices without filtering first (use `events.filter(e => e.type === 'error')`)
- ❌ Don't skip testing the logs array - this is the primary fix being validated
- ❌ Don't create unnecessary test helpers - keep test self-contained
- ❌ Don't use class-based workflow pattern - must use functional workflow pattern
- ❌ Don't forget to assert workflow.status is 'failed'
- ❌ Don't use vague test names - be specific: "should capture state and logs in functional workflow error"

---

## External Research Summary

Key findings from external research that inform this PRP:

1. **Temporal.io Error Patterns**: Workflows should capture state at failure point for debugging and recovery (https://docs.temporal.io/develop/typescript/failure-detection)

2. **Decorator State Capture**: Decorators can capture `this` context and augment errors with metadata (https://stordahl.dev/writing/error-handling-decorators)

3. **Type-Safe Error Testing**: Use type guards and test error properties, not just messages (https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type)

4. **Best Practice**: Test error objects with custom properties using explicit property assertions, not just message matching

5. **Common Pitfall**: Don't lose original error when re-throwing - preserve with `error.cause` (handled in our implementation via `error.original`)

---

## Success Metrics

**Confidence Score**: 9/10

**Justification**:
- Complete code template provided
- All file paths and line numbers specified
- External best practices incorporated
- Existing test patterns thoroughly analyzed
- Validation commands are specific and executable
- Only 1 point deduction: Functional workflows have limitations on @ObservedState usage, but test addresses this appropriately

**Expected Implementation Time**: 15-30 minutes

**Risk Factors**:
- Low risk: Test-only change, no production code modification
- Low complexity: Follows well-established patterns
- High confidence: Reference tests exist in codebase

**Dependencies**:
- P1.M1.T1.S1-S3 must be complete (they are)
- Vitest must be properly configured (it is)
- runFunctional() error handler must have state/logs capture (it does)

---

## Appendix: Quick Reference

### Key Files

- **Test file to modify**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- **Implementation being tested**: `/home/dustin/projects/groundswell/src/core/workflow.ts:259-302`
- **Reference test patterns**: `/home/dustin/projects/groundswell/src/__tests__/integration/agent-workflow.test.ts:181-205`

### Commands

```bash
# Run tests
npm run test

# Run specific file
npx vitest run src/__tests__/unit/workflow.test.ts

# Watch mode
npm run test:watch
```

### Test Pattern Quick Reference

```typescript
// Observer setup
const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

// Functional workflow
const workflow = new Workflow<void>({ name: 'Test' }, async (ctx) => {
  ctx.logger.info('message');
  throw new Error('error');
});

// Run and assert error
workflow.addObserver(observer);
await expect(workflow.run()).rejects.toThrow('error');

// Validate error event
const errorEvents = events.filter(e => e.type === 'error');
expect(errorEvents.length).toBeGreaterThanOrEqual(1);
expect(errorEvents[0].error.logs).toBeDefined();
```

---

**PRP Version**: 1.0
**Created**: 2025-01-11
**Status**: Ready for Implementation
