# PRP: Add Tests for Observer Error Logging (P1.M3.T1.S3)

## Goal

**Feature Goal**: Add comprehensive test suite for observer error logging to verify that observer errors are logged through `WorkflowLogger` instead of `console.error`, errors don't crash workflow execution, and error context is properly captured.

**Deliverable**: Enhanced test suite at `src/__tests__/integration/observer-logging.test.ts` with comprehensive coverage of all observer error scenarios.

**Success Definition**:
- All observer callback errors (onLog, onEvent, onStateUpdated, onTreeChanged) are tested
- Tests verify errors are logged to `workflow.node.logs` (structured logging)
- Tests verify workflow execution continues despite observer errors
- Tests verify error context is captured in log entries
- All tests pass: `uv run vitest run src/__tests__/integration/observer-logging.test.ts`

## Why

- **Verification of S2 Implementation**: S2 replaced `console.error` with `logger.error` for observer errors. S3 adds tests to verify this change works correctly.
- **Regression Prevention**: Tests ensure future changes don't break observer error handling
- **Observable Error Behavior**: Observer errors should be isolated - one throwing observer shouldn't crash the workflow or prevent other observers from being notified
- **Debugging Capability**: Structured error logs with context (error object, event type, node ID) are essential for debugging observer issues in production

## What

Add comprehensive tests for observer error logging covering:

1. **Error Logging Verification**: Verify observer errors go to `WorkflowLogger` (captured in `workflow.node.logs`), not `console.error`
2. **Error Isolation**: Verify workflow execution continues when observers throw errors
3. **Error Context**: Verify log entries contain error context (error object, event type, node ID)
4. **Infinite Recursion Prevention**: Verify `onLog` errors don't cause infinite loops
5. **Multiple Observers**: Verify other observers continue to be notified after one throws

### Success Criteria

- [ ] Tests verify all four observer callbacks (onLog, onEvent, onStateUpdated, onTreeChanged) error handling
- [ ] Tests verify errors are logged with structured data (error object, context)
- [ ] Tests verify workflow execution continues after observer errors
- [ ] Tests verify `console.error` is NOT called for observer execution errors (validation errors still use console.error)
- [ ] All existing tests continue to pass
- [ ] Test coverage is comprehensive for edge cases

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes. This PRP provides complete context including existing test patterns, observer implementation details, exact file locations, and specific test patterns to follow.

### Documentation & References

```yaml
# MUST READ - Implementation context from S2
- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S2/PRP.md
  why: Understand the observer error handling implementation that S2 completed
  critical: S2 replaced console.error with logger.error for all observer execution errors
  section: Full PRP - especially Implementation Blueprint section

# Observer error handling implementation
- file: src/core/workflow.ts
  why: Observer error handling implementation - lines 368-378 (onEvent), 390-396 (onStateUpdated)
  pattern: try-catch blocks with this.logger.error() calls including error context
  gotcha: onTreeChanged is called inside onEvent's try-catch, so errors are logged as "Observer onEvent error"

- file: src/core/logger.ts
  why: WorkflowLogger implementation with emitWithoutObserverNotification for infinite recursion prevention
  pattern: Lines 34-45 show onLog error handling creating error log entry
  critical: Uses emitWithoutObserverNotification() to prevent infinite recursion when observer.onLog() throws

# Existing test file (comprehensive, may need enhancement)
- file: src/__tests__/integration/observer-logging.test.ts
  why: Existing observer error logging tests created in S2 - use as pattern reference
  pattern: Integration test structure, vi.spyOn for mocking, expect assertions on workflow.node.logs
  gotcha: This file was created in S2 (commit c572b41) - verify it covers all scenarios

# Test framework configuration
- file: vitest.config.ts
  why: Test configuration - vitest with globals enabled, includes src/__tests__/**/*.test.ts
  pattern: Test file naming convention *.test.ts in src/__tests__/ directory

# Observer interface
- file: src/types/observer.ts
  why: WorkflowObserver interface definition - all four callback methods
  pattern: onLog, onEvent, onStateUpdated, onTreeChanged methods

# Test patterns reference
- file: src/__tests__/unit/logger.test.ts
  why: Pattern for testing logger behavior - verify logs go to workflow.node.logs
  pattern: expect(workflow.node.logs.length).toBe(n), expect(workflow.node.logs[x].message).toBe('...')

- file: src/__tests__/unit/observable.test.ts
  why: Pattern for testing Observable class error handling with mock logger
  pattern: const mockLogger = { error: vi.fn() }; expect(mockLogger.error).toHaveBeenCalledWith(...)

# Architecture documentation
- file: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md
  why: Section 9 (Testing Strategy) outlines vitest test patterns
  section: Lines 270-286

# External documentation
- url: https://vitest.dev/api/expect.html#tothrow
  why: Vitest assertions for testing error throwing behavior
  critical: toThrow(), not.toThrow(), resolves, rejects patterns

- url: https://vitest.dev/guide/mocking.html#spy-on
  why: Mocking console.error to verify it's NOT called for observer errors
  pattern: vi.spyOn(console, 'error').mockImplementation(() => {})

- url: https://vitest.dev/api/expect.html#tobedefined
  why: Assertions for verifying error log entries exist
  critical: toBeDefined(), toEqual(), toHaveProperty() patterns
```

### Current Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   ├── observer-logging.test.ts    # EXISTING - created in S2, verify/enhance coverage
│   │   ├── agent-workflow.test.ts
│   │   ├── bidirectional-consistency.test.ts
│   │   ├── tree-mirroring.test.ts
│   │   └── workflow-reparenting.test.ts
│   ├── unit/
│   │   ├── logger.test.ts               # Reference for logger test patterns
│   │   ├── workflow.test.ts
│   │   └── observable.test.ts           # Reference for mock logger pattern
│   └── adversarial/
│       └── observer-propagation.test.ts
├── core/
│   ├── workflow.ts                      # Lines 368-378 (onEvent errors), 390-396 (onStateUpdated errors)
│   └── logger.ts                        # Lines 34-45 (onLog error handling)
├── types/
│   └── observer.ts                      # WorkflowObserver interface
└── utils/
    └── observable.ts                    # Observable class with logger injection
```

### Desired Codebase Tree

```bash
src/
├── __tests__/
│   ├── integration/
│   │   └── observer-logging.test.ts    # ENHANCE - add any missing test coverage
```

**Note**: The test file already exists from S2. This PRP focuses on:
1. Verifying existing tests cover all scenarios
2. Adding any missing test coverage (e.g., onTreeChanged errors, console.error negative verification)
3. Ensuring all tests pass

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: onTreeChanged error handling
// onTreeChanged is called INSIDE the onEvent try-catch block (workflow.ts:373)
// So if onTreeChanged throws, it's logged as "Observer onEvent error" with the event type
// This is by design - onTreeChanged is part of event emission for tree update events

// CRITICAL: emitWithoutObserverNotification prevents infinite recursion
// When observer.onLog() throws, WorkflowLogger uses emitWithoutObserverNotification()
// to log the error WITHOUT notifying observers again (logger.ts:44)

// CRITICAL: Validation errors still use console.error
// Lines 277, 286 in workflow.ts use console.error for structural validation
// These are NOT observer execution errors - they should remain as console.error

// GOTCHA: Test file already exists from S2
// src/__tests__/integration/observer-logging.test.ts was created in commit c572b41
// Verify coverage before adding new tests

// PATTERN: Tests verify logs in workflow.node.logs, not console output
// expect(workflow.node.logs.find(log => log.message === '...')).toBeDefined()

// PATTERN: Use vi.spyOn for console.error negative verification
// const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... run test ...
// expect(consoleSpy).not.toHaveBeenCalled(); // Verify console.error NOT called
```

## Implementation Blueprint

### Test Architecture

The observer error logging tests verify the S2 implementation that replaced `console.error` with `logger.error` for observer execution errors.

**Key Test Categories**:

1. **onLog Error Tests** (WorkflowObserver.onLog throws)
   - Verify error is logged to `workflow.node.logs`
   - Verify error data contains the error object
   - Verify infinite recursion prevention

2. **onEvent Error Tests** (WorkflowObserver.onEvent throws)
   - Verify error is logged with event type context
   - Verify workflow continues execution

3. **onStateUpdated Error Tests** (WorkflowObserver.onStateUpdated throws)
   - Verify error is logged with node ID context
   - Verify state snapshot completes

4. **onTreeChanged Error Tests** (WorkflowObserver.onTreeChanged throws)
   - Note: onTreeChanged is called inside onEvent try-catch
   - Errors logged as "Observer onEvent error" with treeUpdated event type

5. **Error Isolation Tests**
   - Verify workflow doesn't crash when observers throw
   - Verify other observers continue to be notified

6. **Multiple Observers Tests**
   - Verify all observers are notified even if some throw
   - Verify error logs for each throwing observer

7. **Console.error Negative Verification**
   - Verify `console.error` is NOT called for observer execution errors
   - Verify `console.error` IS still called for validation errors (lines 277, 286)

### Implementation Tasks

```yaml
Task 1: REVIEW existing observer-logging.test.ts coverage
  - VERIFY: All observer callbacks have error tests (onLog, onEvent, onStateUpdated, onTreeChanged)
  - VERIFY: Error isolation tests exist
  - VERIFY: Multiple observer tests exist
  - VERIFY: Infinite recursion prevention tests exist
  - IDENTIFY: Any missing test scenarios
  - CHECK: Are there tests verifying console.error is NOT called for observer errors?

Task 2: ADD onTreeChanged error test (if missing)
  - IMPLEMENT: Test where observer.onTreeChanged throws during tree update event
  - VERIFY: Error is logged (as "Observer onEvent error" since onTreeChanged is in onEvent try-catch)
  - VERIFY: Event type is 'treeUpdated', 'childAttached', or 'childDetached'
  - FOLLOW: Existing observer error test pattern from observer-logging.test.ts:77-109
  - NAMING: "should log observer onTreeChanged errors (caught as onEvent error)"

Task 3: ADD console.error negative verification tests (if missing)
  - IMPLEMENT: Tests using vi.spyOn(console, 'error') to verify it's NOT called
  - VERIFY: For onLog, onEvent, onStateUpdated errors - console.error is NOT invoked
  - VERIFY: For validation errors - console.error IS still invoked (lines 277, 286)
  - FOLLOW: Pattern from observer-logging.test.ts:200-218
  - CLEANUP: Always restore spies with vi.restoreAllMocks() in afterEach or after each test

Task 4: ADD hierarchical workflow observer error tests (if missing)
  - IMPLEMENT: Test with parent-child workflow hierarchy
  - VERIFY: Observer on root still receives notifications from child workflows
  - VERIFY: Observer errors in child workflows are logged correctly
  - VERIFY: Parent workflow execution continues when observer errors occur in child
  - FOLLOW: Pattern from observer-propagation.test.ts for hierarchical setup

Task 5: VERIFY all tests pass
  - RUN: uv run vitest run src/__tests__/integration/observer-logging.test.ts
  - EXPECTED: All tests pass with no failures
  - DEBUG: If tests fail, check for:
    - Incorrect error message matching
    - Missing log entries
    - Async timing issues (use await for async run() methods)
    - Mock cleanup issues (vi.restoreAllMocks())

Task 6: VERIFY no regressions in existing test suite
  - RUN: uv run vitest run src/__tests__/
  - EXPECTED: All existing tests still pass
  - CHECK: No new tests break existing functionality
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Basic observer error test structure
describe('Observer Error Logging Integration Tests', () => {
  it('should log observer onEvent errors to workflow.node.logs', () => {
    const onEventError = new Error('Observer onEvent failed');

    const throwingObserver: WorkflowObserver = {
      onLog: () => {},
      onEvent: () => {
        throw onEventError;
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    class TestWorkflow extends Workflow {
      async run() {
        this.emitEvent({ type: 'testEvent' });
      }
    }

    const workflow = new TestWorkflow();
    workflow.addObserver(throwingObserver);
    workflow.run();

    // Verify error log entry exists
    const errorLog = workflow.node.logs.find(
      (log) => log.message === 'Observer onEvent error'
    );
    expect(errorLog).toBeDefined();
    expect(errorLog?.level).toBe('error');
    expect(errorLog?.data).toEqual({
      error: onEventError,
      eventType: 'testEvent',
    });
  });
});

// PATTERN 2: Error isolation - workflow continues execution
it('should not crash workflow when observer onEvent throws', () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => {
      throw new Error('Observer onEvent error');
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.emitEvent({ type: 'event1' });
      this.emitEvent({ type: 'event2' });
      this.emitEvent({ type: 'event3' });
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  // Should complete without throwing
  expect(() => {
    workflow.run();
  }).not.toThrow();

  // All events should be emitted
  expect(workflow.node.events.length).toBe(3);
});

// PATTERN 3: Console.error negative verification
it('should NOT call console.error for observer execution errors', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const throwingObserver: WorkflowObserver = {
    onLog: () => {},
    onEvent: () => {
      throw new Error('Observer error');
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.emitEvent({ type: 'testEvent' });
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.run();

  // Verify console.error was NOT called for observer error
  expect(consoleErrorSpy).not.toHaveBeenCalled();

  // Verify error was logged to workflow.node.logs instead
  const errorLog = workflow.node.logs.find(
    (log) => log.message === 'Observer onEvent error'
  );
  expect(errorLog).toBeDefined();

  consoleErrorSpy.mockRestore();
});

// PATTERN 4: Multiple observers with mixed success/failure
it('should continue notifying other observers after one throws', async () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      throw new Error('Observer 1 failed');
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => {
      observer2Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => {
      observer3Called = true;
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.addObserver(workingObserver2);
  workflow.addObserver(workingObserver3);

  await workflow.run();

  // Both working observers should have been called
  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);

  // Should have error log for throwing observer
  const errorLog = workflow.node.logs.find(
    (log) => log.message === 'Observer onLog error'
  );
  expect(errorLog).toBeDefined();
});

// PATTERN 5: Infinite recursion prevention for onLog errors
it('should avoid infinite recursion when observer onLog throws', async () => {
  let callCount = 0;
  const maxCalls = 10; // Safety limit to prevent actual infinite loop

  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      callCount++;
      if (callCount < maxCalls) {
        throw new Error('Recursive error');
      }
    },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  class TestWorkflow extends Workflow {
    async run() {
      this.logger.info('Test message');
    }
  }

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  await workflow.run();

  // Should only call onLog once (original) + one error log, then stop
  // The error log should NOT trigger another observer notification
  expect(callCount).toBe(1);

  // Should have 2 logs: original + error
  expect(workflow.node.logs.length).toBe(2);
});
```

### Integration Points

```yaml
NO NEW FILES NEEDED:
  - Test file already exists: src/__tests__/integration/observer-logging.test.ts
  - Implementation code already exists from S2

TEST DEPENDENCIES:
  - vitest: Test framework (configured in vitest.config.ts)
  - @vitest/spy: For vi.spyOn() mocking

VALIDATION DEPENDS ON:
  - src/core/workflow.ts: Observer error handling implementation
  - src/core/logger.ts: WorkflowLogger with emitWithoutObserverNotification
  - src/types/observer.ts: WorkflowObserver interface
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after any test modifications
npx tsc --noEmit src/__tests__/integration/observer-logging.test.ts

# Expected: No TypeScript errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run only the observer logging tests
uv run vitest run src/__tests__/integration/observer-logging.test.ts

# Run with verbose output for detailed results
uv run vitest run src/__tests__/integration/observer-logging.test.ts --reporter=verbose

# Run in watch mode during development
uv run vitest watch src/__tests__/integration/observer-logging.test.ts

# Expected: All tests pass
# Example output:
# ✓ src/__tests__/integration/observer-logging.test.ts (N)
#   ✓ WorkflowLogger observer onLog error (N)
#     ✓ should log observer onLog errors to workflow.node.logs
#     ✓ should avoid infinite recursion when observer onLog throws
#   ✓ Workflow observer onEvent error (N)
#     ✓ should log observer onEvent errors via this.logger.error
#     ✓ should include event type in error data
#   ...
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all integration tests to ensure no regressions
uv run vitest run src/__tests__/integration/

# Run all tests in the project
uv run vitest run src/__tests__/

# Expected: All tests pass, no failures in other test files
# Verify specifically that logger.test.ts and workflow.test.ts still pass
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Run tests with coverage report
uv run vitest run src/__tests__/integration/observer-logging.test.ts --coverage

# Check if observer error handling code is covered
# Expected: High coverage for:
#   - src/core/workflow.ts:368-378 (onEvent error handling)
#   - src/core/workflow.ts:390-396 (onStateUpdated error handling)
#   - src/core/logger.ts:34-45 (onLog error handling)

# Adversarial testing - run stress tests
uv run vitest run src/__tests__/adversarial/

# Expected: No adversarial tests broken by observer error handling changes
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All observer-logging tests pass: `uv run vitest run src/__tests__/integration/observer-logging.test.ts`
- [ ] No TypeScript errors: `npx tsc --noEmit src/__tests__/integration/observer-logging.test.ts`
- [ ] No regressions: `uv run vitest run src/__tests__/` passes completely
- [ ] Console.error NOT called for observer execution errors (verified via vi.spyOn tests)
- [ ] Console.error IS still called for validation errors (lines 277, 286)

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] onLog error logging tests pass with infinite recursion prevention
- [ ] onEvent error logging tests pass with event type context
- [ ] onStateUpdated error logging tests pass with node ID context
- [ ] onTreeChanged error handling tested (via onEvent since it's in same try-catch)
- [ ] Error isolation verified - workflow continues after observer errors
- [ ] Multiple observers tested - others notified after one throws
- [ ] Structured error context verified in log entries

### Code Quality Validation

- [ ] Tests follow existing patterns from observer-logging.test.ts
- [ ] Descriptive test names using "should" pattern
- [ ] Proper mock cleanup with vi.restoreAllMocks()
- [ ] Tests are isolated (no shared state between tests)
- [ ] Test coverage is comprehensive for all observer callbacks

### Documentation & Deployment

- [ ] Test file is self-documenting with clear describe/it blocks
- [ ] Complex test scenarios have explanatory comments
- [ ] Test file location matches convention (src/__tests__/integration/)

---

## Anti-Patterns to Avoid

- ❌ Don't create a new test file - use existing `observer-logging.test.ts`
- ❌ Don't test console.error output - test `workflow.node.logs` content instead
- ❌ Don't forget to restore vi.spyOn mocks - always use vi.restoreAllMocks()
- ❌ Don't share state between tests - create fresh observers for each test
- ❌ Don't use setTimeout for timing - use proper async/await
- ❌ Don't test implementation details - test behavior (errors logged, workflow continues)
- ❌ Don't remove validation error console.error tests (lines 277, 286) - these are correct
- ❌ Don't add tests that are duplicates of existing S2 tests - verify coverage first

## Context Completeness Validation

This PRP passes the "No Prior Knowledge" test:

✅ File locations specified with line numbers
✅ Existing test file identified and analyzed
✅ Test patterns provided with code examples
✅ External documentation URLs included with anchors
✅ Known gotchas documented (onTreeChanged in onEvent try-catch, emitWithoutObserverNotification)
✅ Validation commands are project-specific and verified
✅ Implementation tasks are dependency-ordered and specific
✅ Anti-patterns section prevents common mistakes

**Confidence Score for One-Pass Implementation Success: 9/10**

The existing test file from S2 provides an excellent foundation. This PRP provides clear guidance on verifying and enhancing test coverage with specific patterns to follow.
