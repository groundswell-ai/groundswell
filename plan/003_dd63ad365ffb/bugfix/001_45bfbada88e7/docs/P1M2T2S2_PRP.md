# Product Requirement Prompt (PRP): Integration Tests for Automatic Agent Response Validation

**PRP ID**: P1.M2.T2.S2
**Work Item**: Write integration tests for automatic validation
**Created**: 2026-01-26
**Status**: Ready for Implementation

---

## Goal

**Feature Goal**: Create comprehensive integration tests that validate the automatic AgentResponse validation behavior in workflow steps, ensuring that the validation hook implemented in P1.M2.T2.S1 works correctly across all scenarios including valid responses, invalid responses, event emission, error handling, and configuration control.

**Deliverable**: New integration test file `src/__tests__/integration/agent-validation.test.ts` with passing tests that verify automatic validation behavior, invalidResponse event emission, WorkflowError creation with INVALID_RESPONSE_FORMAT, and the ability to disable validation via configuration.

**Success Definition**:
- All test cases pass successfully when run with `npm test` or `vitest run`
- Tests cover all 5 required scenarios: valid responses, invalid responses with INVALID_RESPONSE_FORMAT error, invalidResponse event emission, disabling validation via config, and graceful error handling
- Event emission is properly verified for invalid responses
- WorkflowError structure is validated with all required fields
- Tests follow existing integration test patterns from the codebase
- Code coverage for automatic validation hook reaches 100%

---

## Why

**Business Value and User Impact**:
- Ensures reliability of the automatic validation feature that catches malformed AgentResponse objects from agent calls
- Prevents silent failures where invalid responses could propagate through workflows and cause downstream issues
- Provides confidence that the validation hook works as expected when agents return unexpected data structures

**Integration with Existing Features**:
- Validates the integration between the automatic validation hook (P1.M2.T2.S1) and workflow step execution
- Tests the event-driven architecture by verifying invalidResponse event emission
- Ensures WorkflowError creation preserves workflow context for debugging
- Validates configuration control (autoValidateResponses flag) works correctly

**Problems This Solves**:
- Without these tests, validation failures could go unnoticed until production
- Ensures invalidResponse events are properly emitted for monitoring and debugging
- Validates that graceful error handling occurs when validation fails
- Confirms that disabling validation works for performance-critical workflows

---

## What

**User-Visible Behavior**: The tests verify that when an AgentResponse is returned from a workflow step:
1. Valid responses (success, error, partial status) pass through unchanged
2. Invalid responses trigger INVALID_RESPONSE_FORMAT WorkflowError
3. invalidResponse events are emitted with proper structure
4. Validation can be disabled via `autoValidateResponses: false` config
5. Error handling is graceful with detailed error context

**Technical Requirements**:
- Test file location: `src/__tests__/integration/agent-validation.test.ts`
- Test framework: Vitest (following existing patterns)
- Must use helper functions for creating valid/invalid AgentResponse objects
- Must verify event emission using WorkflowObserver pattern
- Must validate WorkflowError structure on validation failures
- Must test both class-based (@Step decorator) and functional (ctx.step()) workflow patterns
- Must verify automatic validation behavior, not manual validation calls

**Success Criteria**:
- [ ] Test file created at `src/__tests__/integration/agent-validation.test.ts`
- [ ] Test: `should automatically validate valid agent responses in workflow`
- [ ] Test: `should throw INVALID_RESPONSE_FORMAT for invalid responses`
- [ ] Test: `should emit invalidResponse event`
- [ ] Test: `should allow disabling auto-validation via config`
- [ ] Test: `should handle validation errors gracefully`
- [ ] All tests pass: `npm test -- agent-validation.test.ts`
- [ ] No regression in existing tests
- [ ] Code follows existing test patterns and conventions

---

## All Needed Context

### Context Completeness Check

**Question**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
1. Exact file locations and patterns to follow
2. Complete code examples from existing integration tests
3. Helper function patterns for test data creation
4. Event testing patterns with WorkflowObserver
5. Error testing patterns for WorkflowError validation
6. Configuration testing patterns
7. Specific validation commands and expected outputs

### Documentation & References

```yaml
# CRITICAL IMPLEMENTATION REFERENCES

# File: Existing agent-workflow integration tests (PRIMARY PATTERN REFERENCE)
- file: src/__tests__/integration/agent-workflow.test.ts
  why: Shows complete integration test patterns for workflow-step-agent interactions
  pattern: Workflow creation, observer setup, event collection, step execution, assertions
  gotcha: Uses both class-based (@Step) and functional (ctx.step()) patterns - test both
  sections:
    - Lines 42-96: Basic workflow with @Step decorated methods and event tracking
    - Lines 98-134: Functional workflow pattern with ctx.step()
    - Lines 136-150: Tree structure validation
    - Lines 186-210: Error handling in steps with event verification
    - Lines 263-297: AgentResponse handling in workflow context
    - Lines 343-399: Error response handling with type guards

# File: Existing automatic validation tests (REFERENCE FOR WHAT NOT TO DUPLICATE)
- file: src/__tests__/integration/workflow-automatic-validation.test.ts
  why: Shows existing tests for automatic validation - DO NOT duplicate these tests
  pattern: Tests validation behavior at workflow context level
  gotcha: These tests cover workflow-level validation. New tests should focus on agent-workflow integration scenarios
  sections:
    - Lines 13-37: Helper functions for creating valid/invalid responses
    - Lines 39-73: Validation enabled with event emission
    - Lines 75-101: WorkflowError structure validation
    - Lines 230-263: Validation disabled via config
  critical: "DO NOT duplicate test cases from this file. Focus on agent-workflow integration scenarios."

# File: Automatic validation implementation (SYSTEM UNDER TEST)
- file: src/core/workflow-context.ts
  why: Shows the exact validation hook implementation being tested
  pattern: Lines 154-184 show automatic validation logic
  sections:
    - Line 155: Condition for triggering validation (autoValidateResponses && isAgentResponse)
    - Line 156: Call to validateAgentResponse utility
    - Lines 158-184: Validation failure handling with event emission and WorkflowError creation
    - Line 166: agentId is 'unknown' at context level - important for test expectations
    - Line 182: Throws immediately - validation errors are not retried
  gotcha: "agentId is always 'unknown' at context level - this is expected behavior"

# File: Validation utility implementation
- file: src/utils/agent-validation.ts
  why: Shows the validation logic and return structure
  pattern: Pure function with ValidationResult return type
  sections:
    - Lines 21-26: ValidationResult interface (valid boolean, optional ZodError)
    - Lines 91-108: validateAgentResponse function implementation
    - Line 99: safeParse returns success or error
  gotcha: "Uses safeParse (non-throwing) - validation failures don't throw directly"

# File: WorkflowError type definition
- file: src/types/error.ts
  why: Defines the WorkflowError structure to validate in tests
  sections:
    - Lines 7-20: WorkflowError interface with message, original, workflowId, stack, state, logs
  gotcha: "original property contains ZodError, has errors array with path/message/code"

# File: WorkflowEvent type definition (for invalidResponse event)
- file: src/types/events.ts
  why: Defines invalidResponse event structure to validate in tests
  sections:
    - Lines 12-82: WorkflowEvent discriminated union
    - Look for: invalidResponse event type definition with node, response, agentId, errors, timestamp

# File: AgentResponse type definition
- file: src/types/agent.ts
  why: Defines valid/invalid AgentResponse structures for test data creation
  sections:
    - AgentResponse interface: status ('success'|'error'|'partial'), data, error, metadata
    - AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT: error code constant
  gotcha: "Invalid status values are the primary failure mode to test"

# File: Test helper utilities (if exists)
- file: src/__tests__/helpers/tree-verification.ts
  why: May contain useful helper functions for tree validation
  pattern: Helper functions for tree structure verification
  optional: true

# Documentation: Vitest testing patterns
- url: https://vitest.dev/guide/
  why: Primary testing framework reference
  critical: Mock patterns (vi.fn(), vi.spyOn()), async testing, expect assertions
  sections:
    - /api/: expect API reference
    - /guide/mocking: Mock function patterns
    - /guide/testing: Async testing patterns

# Documentation: Zod error structure
- url: https://zod.dev/?id=errors
  why: Understanding ZodError structure for validation assertions
  critical: "errors array with path, message, code properties"
  sections: Error handling section

# File: Vitest configuration
- file: vitest.config.ts
  why: Test runner configuration and globals
  gotcha: "Globals enabled - use describe/it/expect without imports"
```

### Current Codebase Tree

```bash
# Relevant sections of the codebase structure for this PRP

src/
├── __tests__/
│   ├── integration/              # Target directory for new test file
│   │   ├── agent-workflow.test.ts        # PRIMARY PATTERN REFERENCE
│   │   ├── workflow-automatic-validation.test.ts  # Existing validation tests
│   │   ├── provider-agent.test.ts
│   │   ├── retry-integration.test.ts
│   │   └── ... (other integration tests)
│   └── helpers/
│       └── tree-verification.ts   # Optional helper utilities
├── core/
│   ├── workflow-context.ts        # SYSTEM UNDER TEST (lines 154-184)
│   ├── workflow.ts
│   └── agent.ts
├── types/
│   ├── agent.ts                   # AgentResponse type definition
│   ├── events.ts                  # invalidResponse event type
│   └── error.ts                   # WorkflowError interface
└── utils/
    └── agent-validation.ts        # Validation utility implementation
```

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILE TO CREATE

src/
├── __tests__/
│   ├── integration/
│   │   ├── agent-validation.test.ts  # NEW FILE - CREATE THIS
│   │   │   # Test file for automatic validation in agent-workflow context
│   │   │   # Tests: valid responses, invalid responses, event emission,
│   │   │   #       config control, error handling
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Test framework uses Vitest with globals enabled
// No need to import describe, it, expect, vi - they're global
// Configuration: vitest.config.ts has globals: true

// CRITICAL: Workflow result structure varies
// Functional workflows return WorkflowResult<T>: { data: T, node: ..., duration: ... }
// Class-based workflows return T directly
// Pattern: const data = 'data' in result ? result.data : result;

// CRITICAL: agentId is always 'unknown' at context level
// The automatic validation hook cannot determine which agent produced the response
// Test expectation: expect(invalidEvent?.agentId).toBe('unknown');
// This is documented behavior, not a bug

// CRITICAL: Validation errors bypass reflection retry logic
// They are thrown immediately (line 182 in workflow-context.ts)
// No reflection events should be emitted for validation failures

// CRITICAL: ZodError has 'errors' array (not 'error')
// Structure: zodError.errors = [{ path: [], message: '', code: 'invalid_type' }]
// Use: expect(zodError.errors).toBeInstanceOf(Array);

// CRITICAL: isAgentResponse() type guard determines validation trigger
// Only AgentResponse-shaped objects are validated
// Plain objects pass through unchanged

// CRITICAL: autoValidateResponses defaults to true
// Omitting the config enables validation
// Explicitly set to false to disable

// CRITICAL: WorkflowObserver pattern for event collection
// Use vi.fn() for onEvent to capture all events
// Filter by type: events.filter(e => e.type === 'invalidResponse')

// CRITICAL: Mock cleanup
// Always use vi.clearAllMocks() in beforeEach if needed
// Integration tests typically don't need this due to isolation

// CRITICAL: Event timing
// Events are emitted synchronously during step execution
// No need to await event emission

// CRITICAL: Error assertion pattern
// Use: await expect(workflow.run()).rejects.toThrow()
// Then catch error for detailed validation: try/catch with caughtError variable

// CRITICAL: Helper function pattern
// Define createValidResponse() and createInvalidResponse() at top of test file
// Follow existing pattern from workflow-automatic-validation.test.ts

// CRITICAL: Status values must be exact
// Valid: 'success', 'error', 'partial'
// Invalid: anything else (use 'invalid' as any for testing)

// CRITICAL: Null vs undefined
// PRD 6.4.4 compliance: use null for absent values
// Success: error: null (not undefined)
// Error: data: null (not undefined)
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models are created in this task. The test file will use existing types:

```typescript
// Existing types used in tests (imported from src/index.js or src/types/*)
import type { AgentResponse, WorkflowEvent, WorkflowError } from '../../index.js';

// Helper function return types (infer from AgentResponse)
function createValidResponse<T>(data: T, agentId?: string): AgentResponse<T>
function createInvalidResponse(agentId?: string): AgentResponse<unknown>

// Test data structures
interface TestCaseSetup {
  workflow: Workflow;
  observer: WorkflowObserver;
  expectedBehavior: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file scaffold with imports and helper functions
  - IMPLEMENT: src/__tests__/integration/agent-validation.test.ts
  - IMPORT: Vitest globals (describe, it, expect, vi) - already global
  - IMPORT: Workflow, AgentResponse, WorkflowEvent, WorkflowError, createWorkflow from ../../index.js
  - CREATE: Helper function createValidResponse<T>(data, agentId) returning valid AgentResponse
  - CREATE: Helper function createInvalidResponse(agentId) returning invalid AgentResponse with wrong status
  - FOLLOW pattern: src/__tests__/integration/workflow-automatic-validation.test.ts (lines 13-37)
  - NAMING: snake_case for test file, camelCase for helper functions
  - PLACEMENT: src/__tests__/integration/ directory

Task 2: IMPLEMENT test suite for valid agent responses
  - CREATE: describe block 'Valid Agent Responses'
  - IMPLEMENT: test case 'should automatically validate valid agent responses in workflow'
  - TEST: Workflow with step returning createValidResponse({ result: 'success' })
  - VERIFY: Workflow completes without throwing
  - VERIFY: Result matches expected AgentResponse structure
  - VERIFY: No invalidResponse events are emitted
  - FOLLOW pattern: agent-workflow.test.ts (lines 263-297 for AgentResponse handling)
  - ASSERTIONS: expect(result).toBeDefined(), expect(invalidEvents).toHaveLength(0)

Task 3: IMPLEMENT test suite for invalid responses with error handling
  - CREATE: describe block 'Invalid Agent Responses'
  - IMPLEMENT: test case 'should throw INVALID_RESPONSE_FORMAT for invalid responses'
  - TEST: Workflow with step returning createInvalidResponse()
  - VERIFY: Workflow.run() rejects with WorkflowError
  - VERIFY: Error message contains 'validation failed in step'
  - VERIFY: Error has all WorkflowError fields (message, original, workflowId, state, logs)
  - VERIFY: original property contains ZodError with errors array
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 75-101)
  - ASSERTIONS: await expect(workflow.run()).rejects.toThrow(), expect(workflowError.original).toBeDefined()

Task 4: IMPLEMENT test suite for invalidResponse event emission
  - CREATE: describe block 'Invalid Response Event Emission'
  - IMPLEMENT: test case 'should emit invalidResponse event on validation failure'
  - TEST: Workflow with step returning createInvalidResponse()
  - ADD: WorkflowObserver with vi.fn() mock for onEvent
  - VERIFY: invalidResponse event is emitted exactly once
  - VERIFY: Event has all required fields (type, node, response, agentId, errors, timestamp)
  - VERIFY: agentId is 'unknown' (expected behavior at context level)
  - VERIFY: errors is ZodError instance with errors array
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 40-73)
  - ASSERTIONS: expect(invalidEvents).toHaveLength(1), expect(invalidEvent?.agentId).toBe('unknown')

Task 5: IMPLEMENT test suite for configuration control
  - CREATE: describe block 'Configuration Control'
  - IMPLEMENT: test case 'should allow disabling auto-validation via config'
  - TEST: Two workflows - one with autoValidateResponses: false, one without (default true)
  - VERIFY: Workflow with validation disabled completes successfully even with invalid response
  - VERIFY: Workflow with validation enabled (default) throws on invalid response
  - VERIFY: No invalidResponse events when validation is disabled
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 230-263)
  - ASSERTIONS: expect(result).toBeDefined(), expect(invalidEvents).toHaveLength(0)

Task 6: IMPLEMENT test suite for graceful error handling
  - CREATE: describe block 'Graceful Error Handling'
  - IMPLEMENT: test case 'should handle validation errors gracefully with detailed context'
  - TEST: Multiple validation failure scenarios (wrong status, missing fields, type mismatches)
  - VERIFY: Each scenario produces WorkflowError with appropriate context
  - VERIFY: Error preserves workflow state (workflowId, state, logs)
  - VERIFY: ZodError provides detailed path/message for debugging
  - VERIFY: Error does not trigger reflection retry logic
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 353-406 for WorkflowError structure)
  - ASSERTIONS: expect(workflowError.state).toBeDefined(), expect(reflectionEvents).toHaveLength(0)

Task 7: IMPLEMENT test suite for both workflow patterns
  - CREATE: describe block 'Workflow Pattern Compatibility'
  - IMPLEMENT: test case 'should validate responses in class-based workflows with @Step decorator'
  - IMPLEMENT: test case 'should validate responses in functional workflows with ctx.step()'
  - TEST: Both patterns with valid and invalid responses
  - VERIFY: Automatic validation works identically for both patterns
  - FOLLOW pattern: agent-workflow.test.ts (lines 42-96 for @Step, lines 98-134 for ctx.step())
  - ASSERTIONS: Compare event emission and error handling across patterns

Task 8: IMPLEMENT test suite for multiple steps validation
  - CREATE: describe block 'Multiple Steps Validation'
  - IMPLEMENT: test case 'should validate each step independently'
  - TEST: Workflow with multiple steps, some valid, some invalid
  - VERIFY: Validation fails at first invalid step
  - VERIFY: Only one invalidResponse event emitted (for failing step)
  - VERIFY: Valid steps before failure complete successfully
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 442-479)
  - ASSERTIONS: expect(invalidEvents).toHaveLength(1), expect(invalidEvent?.node.name).toBe('step-2')

Task 9: IMPLEMENT test suite for non-AgentResponse results
  - CREATE: describe block 'Non-AgentResponse Results'
  - IMPLEMENT: test case 'should pass through non-AgentResponse results unchanged'
  - TEST: Workflow with step returning plain object
  - VERIFY: Plain objects are not validated
  - VERIFY: No invalidResponse events for non-AgentResponse results
  - FOLLOW pattern: workflow-automatic-validation.test.ts (lines 146-162)
  - ASSERTIONS: expect(data).toEqual({ plain: 'object' })

Task 10: VERIFY test execution and code coverage
  - RUN: npm test -- agent-validation.test.ts
  - VERIFY: All tests pass
  - RUN: npm test -- --coverage (if coverage configured)
  - VERIFY: Coverage for automatic validation hook is 100%
  - VERIFY: No regressions in existing integration tests
  - RUN: npm test to ensure full test suite passes
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Helper functions for test data (place at top of test file)
// Follow workflow-automatic-validation.test.ts lines 13-37

function createValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: {
      agentId,
      timestamp: Date.now(),
    },
  };
}

function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> {
  return {
    status: 'invalid' as any,  // Wrong status - triggers validation failure
    data: 'some data',
    error: null,
    metadata: {
      agentId,
      timestamp: Date.now(),
    },
  };
}

// PATTERN 2: WorkflowObserver setup for event collection
// Follow agent-workflow.test.ts lines 43-63

const observer = {
  onLog: vi.fn(),
  onEvent: vi.fn(),  // Mock to capture all events
  onStateUpdated: vi.fn(),
  onTreeChanged: vi.fn(),
};

workflow.addObserver(observer);

// After execution, filter events by type
const invalidEvents = observer.onEvent.mock.calls
  .flatMap(call => call)
  .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

// PATTERN 3: Functional workflow creation with createWorkflow
// Follow agent-workflow.test.ts lines 98-134

const workflow = createWorkflow(
  { name: 'TestValidation' },
  async (ctx) => {
    const result = await ctx.step('test-step', async () => {
      return createValidResponse({ result: 'success' });
    });
    return result;
  }
);

// PATTERN 4: Result extraction (handles WorkflowResult<T> wrapper)
// Follow agent-workflow.test.ts lines 123-127

const result = await workflow.run();
const data = 'data' in result ? result.data : result;

// PATTERN 5: Error assertion and detailed validation
// Follow workflow-automatic-validation.test.ts lines 86-101

let caughtError: unknown;
try {
  await workflow.run();
} catch (error) {
  caughtError = error;
}

const workflowError = caughtError as WorkflowError;
expect(workflowError.message).toContain("validation failed in step");
expect(workflowError.workflowId).toBe(workflow.id);
expect(workflowError.original).toBeDefined();
expect(workflowError.state).toBeDefined();
expect(workflowError.logs).toBeInstanceOf(Array);

// PATTERN 6: Event structure validation
// Follow workflow-automatic-validation.test.ts lines 307-319

const invalidEvent = observer.onEvent.mock.calls
  .flatMap(call => call)
  .find((event: WorkflowEvent) => event.type === 'invalidResponse');

expect(invalidEvent).toBeDefined();
expect(invalidEvent?.type).toBe('invalidResponse');
expect(invalidEvent?.node).toBeDefined();
expect(invalidEvent?.node.id).toBeDefined();
expect(invalidEvent?.response).toBeDefined();
expect(invalidEvent?.agentId).toBe('unknown');  // CRITICAL: Expected behavior
expect(invalidEvent?.errors).toBeDefined();
expect(invalidEvent?.timestamp).toBeGreaterThan(0);

// PATTERN 7: ZodError structure validation
// Follow workflow-automatic-validation.test.ts lines 347-350

expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);

// Individual error structure
const firstError = invalidEvent?.errors.errors[0];
expect(firstError).toHaveProperty('path');
expect(firstError).toHaveProperty('message');
expect(firstError).toHaveProperty('code');

// PATTERN 8: Testing both workflow patterns
// Follow agent-workflow.test.ts (compare lines 42-96 with lines 98-134)

// Class-based with @Step
class ClassBasedWorkflow extends Workflow {
  @Step({ name: 'step1' })
  async executeStep1(): Promise<AgentResponse<string>> {
    return createValidResponse('result');
  }

  async run(): Promise<string> {
    this.setStatus('running');
    await this.executeStep1();
    this.setStatus('completed');
    return 'done';
  }
}

// Functional with ctx.step()
const functionalWorkflow = createWorkflow(
  { name: 'FunctionalWorkflow' },
  async (ctx) => {
    await ctx.step('step1', async () => {
      return createValidResponse('result');
    });
    return 'done';
  }
);

// PATTERN 9: Configuration testing
// Follow workflow-automatic-validation.test.ts lines 239-247

// Validation enabled (default)
const workflowWithValidation = createWorkflow(
  { name: 'TestValidation' },  // autoValidateResponses defaults to true
  async (ctx) => { /* ... */ }
);

// Validation disabled
const workflowWithoutValidation = createWorkflow(
  { name: 'TestValidation', autoValidateResponses: false },
  async (ctx) => { /* ... */ }
);

// PATTERN 10: Multiple steps with validation failure at specific step
// Follow workflow-automatic-validation.test.ts lines 451-478

const workflow = createWorkflow(
  { name: 'TestValidation' },
  async (ctx) => {
    // Step 1: Valid response
    const result1 = await ctx.step('step-1', async () => {
      return createValidResponse({ data: 'valid' });
    });

    // Step 2: Invalid response - should fail here
    const result2 = await ctx.step('step-2', async () => {
      return createInvalidResponse();
    });

    return { result1, result2 };
  }
);

// Verify failure at step-2
expect(invalidEvents).toHaveLength(1);
expect(invalidEvents[0]?.node.name).toBe('step-2');

// GOTCHA: Non-AgentResponse results pass through unchanged
const plainObjectWorkflow = createWorkflow(
  { name: 'TestValidation' },
  async (ctx) => {
    const result = await ctx.step('test-step', async () => {
      return { plain: 'object' };  // Not an AgentResponse - no validation
    });
    return result;
  }
);

// GOTCHA: Error responses ARE valid AgentResponse
const errorResponseWorkflow = createWorkflow(
  { name: 'TestValidation' },
  async (ctx) => {
    const result = await ctx.step('test-step', async () => {
      const errorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };
      return errorResponse;  // This is valid - should pass validation
    });
    return result;
  }
);

// GOTCHA: Partial responses ARE valid AgentResponse
const partialResponseWorkflow = createWorkflow(
  { name: 'TestValidation' },
  async (ctx) => {
    const result = await ctx.step('test-step', async () => {
      const partialResponse: AgentResponse<{ progress: number }> = {
        status: 'partial',
        data: { progress: 50 },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };
      return partialResponse;  // This is valid - should pass validation
    });
    return result;
  }
);
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS
This is a test-only task. No source code changes are made.

TEST INTEGRATION:
  - test_framework: "Vitest (existing) - use globals: describe, it, expect, vi"
  - test_discovery: "vitest.config.ts glob pattern: src/__tests__/**/*.test.*"
  - test_execution: "npm test -- agent-validation.test.ts"

VALIDATION INTEGRATION:
  - system_under_test: "src/core/workflow-context.ts lines 154-184 (automatic validation hook)"
  - utility_dependency: "src/utils/agent-validation.ts (validateAgentResponse function)"
  - type_dependencies: "src/types/agent.ts, src/types/events.ts, src/types/error.ts"

PATTERN REFERENCES:
  - primary_pattern: "src/__tests__/integration/agent-workflow.test.ts"
  - validation_pattern: "src/__tests__/integration/workflow-automatic-validation.test.ts"
  - event_testing: "Existing observer pattern in all integration tests"
  - error_testing: "WorkflowError validation patterns in existing tests"
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating the test file - fix any issues before proceeding

# Check TypeScript compilation (tests are type-checked)
npm run test -- --no-test 2>&1 | grep -A 5 "agent-validation.test.ts" || echo "No TypeScript errors in agent-validation.test.ts"

# Expected: No TypeScript errors. If errors exist:
# - Check import paths (use ../../index.js for main exports)
# - Verify type annotations match imported types
# - Ensure helper function return types are correct

# Run linter on the test file
npm run lint -- src/__tests__/integration/agent-validation.test.ts 2>&1 || true

# Expected: No linting errors. If errors exist:
# - Check indentation (2 spaces)
# - Verify naming conventions (camelCase for functions, snake_case for files)
# - Ensure no unused imports or variables

# Note: Integration tests typically don't have separate formatting checks
# Formatting is usually validated at project level

# Project-wide validation (run after local file checks pass)
npm run lint 2>&1 | head -20
npm run typecheck 2>&1 | head -20

# Expected: Zero errors in the entire project
# If errors exist in other files, they are pre-existing
# Only fix errors related to agent-validation.test.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new integration test file specifically
npm test -- agent-validation.test.ts

# Expected output:
# ✓ src/__tests__/integration/agent-validation.test.ts (N ms)
#   ✓ Valid Agent Responses
#     ✓ should automatically validate valid agent responses in workflow
#   ✓ Invalid Agent Responses
#     ✓ should throw INVALID_RESPONSE_FORMAT for invalid responses
#   ✓ Invalid Response Event Emission
#     ✓ should emit invalidResponse event on validation failure
#   ✓ Configuration Control
#     ✓ should allow disabling auto-validation via config
#   ✓ Graceful Error Handling
#     ✓ should handle validation errors gracefully with detailed context
#   ✓ Workflow Pattern Compatibility
#     ✓ should validate responses in class-based workflows with @Step decorator
#     ✓ should validate responses in functional workflows with ctx.step()
#   ✓ Multiple Steps Validation
#     ✓ should validate each step independently
#   ✓ Non-AgentResponse Results
#     ✓ should pass through non-AgentResponse results unchanged

# Test files: 1 passed, 1 total
# Tests: 10 passed, 10 total

# If tests fail, READ the error message and debug:
# - Check test name vs failure description
# - Verify assertions match expected behavior
# - Ensure helper functions create correct AgentResponse structure
# - Check observer setup and event filtering logic
# - Verify WorkflowError structure validation

# Run all integration tests to ensure no regression
npm test -- --run src/__tests__/integration/

# Expected: All integration tests pass
# If other tests fail, they may be pre-existing issues
# Focus only on agent-validation.test.ts failures

# Coverage validation (if coverage tools are configured)
npm test -- --coverage src/__tests__/integration/agent-validation.test.ts

# Expected: Coverage for workflow-context.ts validation logic increases
# Target: Lines 154-184 should be 100% covered by new tests
# If coverage is incomplete, add test cases for missing scenarios

# Verify specific test scenarios
npm test -- --run -t "should automatically validate valid agent responses"
npm test -- --run -t "should throw INVALID_RESPONSE_FORMAT"
npm test -- --run -t "should emit invalidResponse event"
npm test -- --run -t "should allow disabling auto-validation"
npm test -- --run -t "should handle validation errors gracefully"

# Expected: Each individual test passes
# Use granular test runs to isolate and debug specific failures
```

### Level 3: Integration Testing (System Validation)

```bash
# No service startup required for integration tests
# Tests run directly in the test environment

# Run full test suite to ensure system integration
npm test

# Expected: All tests pass (unit, integration, e2e)
# Test output format:
# Test Files  XX passed (XX)
# Tests  XXX passed (XXX)
# Duration  XX seconds

# Verify test isolation (no state leakage between tests)
npm test -- --run --repeat=3 src/__tests__/integration/agent-validation.test.ts

# Expected: All tests pass on all 3 runs
# If tests fail on repeat, there's state leakage or timing issues

# Verify specific integration behaviors
npm test -- --run -t "Valid Agent Responses"
npm test -- --run -t "Invalid Agent Responses"
npm test -- --run -t "Invalid Response Event Emission"
npm test -- --run -t "Configuration Control"
npm test -- --run -t "Graceful Error Handling"
npm test -- --run -t "Workflow Pattern Compatibility"

# Expected: Each test suite passes independently
# Verify no cross-test dependencies or state pollution

# Performance validation (ensure tests complete quickly)
time npm test -- --run src/__tests__/integration/agent-validation.test.ts

# Expected: Tests complete in < 5 seconds
# If tests are slow, check for unnecessary delays or complex setups

# Memory leak check (run tests multiple times and monitor memory)
for i in {1..5}; do npm test -- --run src/__tests__/integration/agent-validation.test.ts; done

# Expected: Consistent behavior across all runs
# No increasing memory usage or test degradation
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Integration Test Quality Validation

# Test completeness check - verify all required scenarios
npm test -- --run --reporter=verbose src/__tests__/integration/agent-validation.test.ts | grep -E "✓|should"

# Expected: All 5 required scenarios have tests:
# ✓ should automatically validate valid agent responses in workflow
# ✓ should throw INVALID_RESPONSE_FORMAT for invalid responses
# ✓ should emit invalidResponse event
# ✓ should allow disabling auto-validation via config
# ✓ should handle validation errors gracefully

# Event emission validation - verify correct event structure
npm test -- --run -t "should emit invalidResponse event" --reporter=verbose

# Manual verification of event payload:
# - Check that all required fields are present
# - Verify agentId is 'unknown' (expected behavior)
# - Confirm ZodError structure is correct

# Error handling validation - verify WorkflowError structure
npm test -- --run -t "should throw INVALID_RESPONSE_FORMAT" --reporter=verbose

# Manual verification of error structure:
# - Confirm WorkflowError has all required fields
# - Verify ZodError is attached as 'original' property
# - Check workflowId, state, logs are preserved

# Configuration validation - verify autoValidateResponses control
npm test -- --run -t "should allow disabling auto-validation" --reporter=verbose

# Manual verification of config behavior:
# - Confirm validation is enabled by default
# - Verify setting to false disables validation
# - Check that invalid responses pass through when disabled

# Workflow pattern compatibility - verify both patterns work
npm test -- --run -t "class-based" --reporter=verbose
npm test -- --run -t "functional" --reporter=verbose

# Manual verification of pattern behavior:
# - Confirm @Step decorator triggers validation
# - Verify ctx.step() triggers validation
# - Check identical behavior between patterns

# Edge case validation
npm test -- --run -t "Non-AgentResponse" --reporter=verbose
npm test -- --run -t "Multiple Steps" --reporter=verbose

# Manual verification of edge cases:
# - Plain objects are not validated
# - Error responses ARE valid AgentResponse
# - Partial responses ARE valid AgentResponse
# - Validation fails at first invalid step
# - Only one invalidResponse event for first failure

# Regression testing - ensure existing tests still pass
npm test -- --run src/__tests__/integration/workflow-automatic-validation.test.ts

# Expected: All existing validation tests pass
# New tests should not break existing test behavior

# Cross-test validation - ensure no test interference
npm test -- --run src/__tests__/integration/agent-validation.test.ts src/__tests__/integration/workflow-automatic-validation.test.ts

# Expected: Both test files pass when run together
# Verify no shared state or global pollution

# Documentation validation - check test documentation
grep -E "describe\(|it\(" src/__tests__/integration/agent-validation.test.ts | head -20

# Expected: Clear, descriptive test names
# Test names should follow "should [expected behavior]" pattern

# Code quality validation - check for code smells
npm run lint -- src/__tests__/integration/agent-validation.test.ts

# Expected: No linting warnings
# Check for:
# - Complex test logic (break into helpers)
# - Duplicate code (extract shared setup)
# - Magic values (use constants)

# Test coverage verification (if coverage is configured)
npm test -- --coverage --reporter=html src/__tests__/integration/

# Open coverage report and verify:
# - workflow-context.ts lines 154-184 are covered
# - agent-validation.ts is covered
# - All validation paths are tested

# Expected: 100% coverage for automatic validation logic
# If coverage is incomplete, add tests for missing scenarios
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
  - [ ] Level 1: No TypeScript or linting errors
  - [ ] Level 2: All tests pass individually and as a suite
  - [ ] Level 3: Full test suite passes with no regressions
  - [ ] Level 4: Domain-specific validation complete
- [ ] Test file created at `src/__tests__/integration/agent-validation.test.ts`
- [ ] All tests pass: `npm test -- agent-validation.test.ts`
- [ ] No TypeScript errors: Test file compiles without issues
- [ ] No linting errors: Code follows project style guide
- [ ] Test isolation confirmed: Tests pass when run in isolation and together
- [ ] Performance acceptable: Tests complete in < 5 seconds

### Feature Validation

- [ ] All success criteria from "What" section met
  - [ ] Test file created at correct location
  - [ ] Test: Valid responses pass through unchanged
  - [ ] Test: Invalid responses throw INVALID_RESPONSE_FORMAT error
  - [ ] Test: invalidResponse events are emitted
  - [ ] Test: Validation can be disabled via config
  - [ ] Test: Errors are handled gracefully with detailed context
- [ ] Manual testing successful:
  - [ ] Event emission verified with correct structure
  - [ ] WorkflowError validated with all required fields
  - [ ] Configuration control works as expected
  - [ ] Both workflow patterns (@Step and ctx.step) tested
  - [ ] Multiple steps validation works correctly
- [ ] Error cases handled:
  - [ ] Invalid status values trigger validation failure
  - [ ] Missing fields trigger validation failure
  - [ ] Type mismatches trigger validation failure
  - [ ] Error responses (valid AgentResponse) pass validation
  - [ ] Partial responses (valid AgentResponse) pass validation
  - [ ] Non-AgentResponse objects bypass validation
- [ ] Integration points work as specified:
  - [ ] Automatic validation hook is triggered correctly
  - [ ] validateAgentResponse utility is called
  - [ ] Event emission occurs before error is thrown
  - [ ] WorkflowError preserves workflow context
  - [ ] Configuration flag controls validation behavior

### Code Quality Validation

- [ ] Follows existing test patterns from the codebase:
  - [ ] Helper functions follow workflow-automatic-validation.test.ts pattern
  - [ ] Observer setup follows agent-workflow.test.ts pattern
  - [ ] Event filtering follows existing integration test patterns
  - [ ] Error validation follows existing WorkflowError test patterns
- [ ] File placement matches desired structure:
  - [ ] Located at src/__tests__/integration/agent-validation.test.ts
  - [ ] No other files created or modified
- [ ] Anti-patterns avoided:
  - [ ] No duplication of workflow-automatic-validation.test.ts tests
  - [ ] No testing of manual validation calls (only automatic)
  - [ ] No hardcoded values that should be configurable
  - [ ] No overly complex test logic (should be readable)
  - [ ] No test dependencies or shared state
- [ ] Dependencies properly imported:
  - [ ] All imports from ../../index.js (main export barrel)
  - [ ] No relative imports to implementation files
  - [ ] No circular dependencies
- [ ] Test organization is clear:
  - [ ] Tests grouped by behavior (describe blocks)
  - [ ] Test names are descriptive (should [behavior])
  - [ ] Helper functions defined at top of file
  - [ ] Each test is independent and isolated

### Documentation & Deployment

- [ ] Test file is self-documenting:
  - [ ] Test names clearly describe expected behavior
  - [ ] Comments explain complex test scenarios
  - [ ] Helper functions have clear purposes
- [ ] Test maintainability is high:
  - [ ] Helper functions reduce duplication
  - [ ] Test data is generated programmatically
  - [ ] Assertions are specific and meaningful
- [ ] No environment-specific behavior:
  - [ ] Tests run consistently across environments
  - [ ] No reliance on specific timing or concurrency
  - [ ] No external dependencies or network calls
- [ ] Ready for deployment:
  - [ ] All tests pass in CI/CD environment
  - [ ] No test flakiness or intermittent failures
  - [ ] Test execution time is acceptable
  - [ ] No resource leaks or memory issues

---

## Anti-Patterns to Avoid

- ❌ **Don't duplicate existing tests from workflow-automatic-validation.test.ts**
  - That file covers workflow-level validation scenarios
  - Focus on agent-workflow integration scenarios instead
  - Test the automatic validation behavior in the context of agent calls

- ❌ **Don't test manual validation calls**
  - Only test automatic validation (the hook in workflow-context.ts)
  - Don't directly call validateAgentResponse in tests
  - Let the automatic hook do the validation

- ❌ **Don't assume agentId is available**
  - agentId is always 'unknown' at context level
  - This is expected behavior, not a bug
  - Test expectation should be `expect(invalidEvent?.agentId).toBe('unknown')`

- ❌ **Don't expect reflection events for validation failures**
  - Validation errors bypass reflection retry logic
  - They are thrown immediately
  - No reflectionStart/reflectionEnd events should be emitted

- ❌ **Don't treat error responses as invalid**
  - Error responses (status: 'error') ARE valid AgentResponse
  - They have correct structure: status='error', data=null, error=object
  - They should pass validation

- ❌ **Don't treat partial responses as invalid**
  - Partial responses (status: 'partial') ARE valid AgentResponse
  - They have correct structure: status='partial', data=object, error=null
  - They should pass validation

- ❌ **Don't validate non-AgentResponse objects**
  - Plain objects bypass validation completely
  - isAgentResponse() type guard determines validation trigger
  - Only AgentResponse-shaped objects are validated

- ❌ **Don't hardcode test data values**
  - Use helper functions to generate test data
  - Avoid magic strings and numbers in tests
  - Make tests data-driven where appropriate

- ❌ **Don't create test dependencies**
  - Each test should be independent
  - No shared state between tests
  - Tests should pass in any order

- ❌ **Don't ignore test isolation**
  - Always clean up after tests if needed
  - Don't rely on test execution order
  - Use vi.clearAllMocks() if mocks are shared

- ❌ **Don't use vague test names**
  - Follow "should [expected behavior]" pattern
  - Be specific about what is being tested
  - Include the scenario in the test name

- ❌ **Don't skip testing both workflow patterns**
  - Test @Step decorator (class-based)
  - Test ctx.step() (functional)
  - Verify behavior is identical

- ❌ **Don't forget to test configuration control**
  - Test default behavior (validation enabled)
  - Test disabled validation (autoValidateResponses: false)
  - Verify the flag actually changes behavior

- ❌ **Don't accept tests that pass for wrong reasons**
  - Verify assertions are actually checking the right thing
  - Ensure tests would fail if the feature was broken
  - Check that tests aren't passing due to false positives

- ❌ **Don't ignore test performance**
  - Tests should complete quickly (< 5 seconds for the file)
  - Avoid unnecessary delays or complex setups
  - Keep test logic simple and focused

- ❌ **Don't skip error structure validation**
  - Don't just check that error is thrown
  - Validate WorkflowError has all required fields
  - Check ZodError structure is correct
  - Verify workflow context is preserved

- ❌ **Don't forget event structure validation**
  - Don't just check that event is emitted
  - Validate all event fields are present
  - Check event payload structure
  - Verify timestamp is reasonable

- ❌ **Don't test implementation details**
  - Test behavior, not implementation
  - Focus on what the user/developer cares about
  - Avoid testing private methods or internal state

---

## Confidence Score

**Rating**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- Comprehensive research with 5 parallel subagents gathered all necessary context
- Existing integration tests provide clear patterns to follow
- Helper functions and test patterns are well-documented
- All file locations, imports, and patterns are specified
- Validation commands are project-specific and verified
- Anti-patterns section prevents common mistakes
- The only uncertainty is ensuring tests don't duplicate existing workflow-automatic-validation.test.ts

**Risk Mitigation**:
- Clear distinction between what to test vs what not to duplicate
- Specific line number references to existing tests
- Detailed pattern descriptions with code examples
- Comprehensive validation checklist covering all scenarios

---

## Appendix: Quick Reference

### Test File Structure

```typescript
// src/__tests__/integration/agent-validation.test.ts

import { describe, it, expect, vi } from 'vitest';
import { createWorkflow, type AgentResponse, type WorkflowEvent, type WorkflowError } from '../../index.js';

// Helper functions (lines 13-37 pattern)
function createValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> { /* ... */ }
function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> { /* ... */ }

describe('Agent-Workflow Automatic Validation Integration', () => {
  describe('Valid Agent Responses', () => {
    it('should automatically validate valid agent responses in workflow', async () => { /* ... */ });
  });

  describe('Invalid Agent Responses', () => {
    it('should throw INVALID_RESPONSE_FORMAT for invalid responses', async () => { /* ... */ });
  });

  describe('Invalid Response Event Emission', () => {
    it('should emit invalidResponse event on validation failure', async () => { /* ... */ });
  });

  describe('Configuration Control', () => {
    it('should allow disabling auto-validation via config', async () => { /* ... */ });
  });

  describe('Graceful Error Handling', () => {
    it('should handle validation errors gracefully with detailed context', async () => { /* ... */ });
  });

  describe('Workflow Pattern Compatibility', () => {
    it('should validate responses in class-based workflows with @Step decorator', async () => { /* ... */ });
    it('should validate responses in functional workflows with ctx.step()', async () => { /* ... */ });
  });

  describe('Multiple Steps Validation', () => {
    it('should validate each step independently', async () => { /* ... */ });
  });

  describe('Non-AgentResponse Results', () => {
    it('should pass through non-AgentResponse results unchanged', async () => { /* ... */ });
  });
});
```

### Key Assertions by Test Type

```typescript
// Valid response test
expect(result).toBeDefined();
expect(invalidEvents).toHaveLength(0);

// Invalid response test
await expect(workflow.run()).rejects.toThrow();
expect(workflowError.message).toContain('validation failed');
expect(workflowError.original).toBeDefined();
expect(workflowError.workflowId).toBe(workflow.id);

// Event emission test
expect(invalidEvents).toHaveLength(1);
expect(invalidEvent?.type).toBe('invalidResponse');
expect(invalidEvent?.agentId).toBe('unknown');
expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);

// Configuration test
expect(result).toBeDefined();  // No error when validation disabled
expect(invalidEvents).toHaveLength(0);  // No events when disabled

// Error handling test
expect(workflowError.state).toBeDefined();
expect(workflowError.logs).toBeInstanceOf(Array);
expect(reflectionEvents).toHaveLength(0);  // No reflection for validation errors
```

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-26
**Status**: Ready for Implementation
**Estimated Implementation Time**: 2-3 hours (including test execution and validation)
**Confidence Score**: 9/10
