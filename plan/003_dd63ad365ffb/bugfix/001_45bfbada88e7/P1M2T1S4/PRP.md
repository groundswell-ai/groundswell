---
name: "P1.M2.T1.S4 - Write unit tests for workflow-level validation"
description: |

---

## Goal

**Feature Goal**: Create comprehensive integration tests for workflow-level agent response validation that verify the complete interaction between Workflow and Agent classes during validation scenarios.

**Deliverable**: New test file `src/__tests__/unit/workflow-validation.test.ts` with passing tests covering all validation failure scenarios including mocked agent.prompt() calls returning invalid responses.

**Success Definition**:
- All tests pass (`npm test -- src/__tests__/unit/workflow-validation.test.ts`)
- Test coverage includes valid responses, invalid responses (missing fields, wrong types, status/data mismatch), event emission verification, and WorkflowError creation
- Tests use real workflow-agent integration patterns with mocked agent.prompt() calls
- Zero linting or type errors

## Why

- **Integration Testing Gap**: Existing `workflow-validate-agent-response.test.ts` tests the `validateAgentResponse` method in isolation using helper functions. This PRP creates **integration tests** that simulate the real execution flow where workflows contain agents and call `agent.prompt()`.
- **Validation Coverage**: Ensures workflow-level validation works correctly when agents are actually used within workflows, not just as isolated method calls
- **Event Emission Verification**: Confirms that `invalidResponse` events are properly emitted during real workflow execution with agent integration
- **Error Handling Confidence**: Validates that WorkflowError with INVALID_RESPONSE_FORMAT context is created correctly in the context of workflow-agent interaction

## What

Create integration tests that simulate the real workflow-agent validation flow:

1. Create workflows that contain Agent instances
2. Mock `agent.prompt()` to return various invalid responses (missing fields, wrong types, status/data mismatch)
3. Verify that `validateAgentResponse` correctly validates these responses
4. Confirm that `invalidResponse` events are emitted with proper context
5. Validate that WorkflowError with INVALID_RESPONSE_FORMAT is created appropriately

### Success Criteria

- [ ] Test file created at `src/__tests__/unit/workflow-validation.test.ts`
- [ ] Tests cover valid response scenarios (return true, no event emitted)
- [ ] Tests cover invalid response scenarios (return false, emit invalidResponse event)
- [ ] Tests verify WorkflowError creation with proper context (agentId, workflowId, state, logs)
- [ ] Tests use mocked agent.prompt() returning various invalid response types
- [ ] All tests pass with zero errors

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes. This PRP provides:
- Complete test file structure with import patterns
- All helper function patterns for creating test data
- Agent mocking patterns using vi.spyOn
- Workflow-agent integration patterns from existing tests
- Event verification patterns using observers
- Specific test scenarios covering all validation failure cases
- Exact validation commands to verify success

### Documentation & References

```yaml
# MUST READ - Implementation References

- file: src/__tests__/unit/workflow-validate-agent-response.test.ts
  why: Existing unit tests for validateAgentResponse method - shows helper patterns, event verification, and basic test structure
  pattern: Helper functions (createValidResponse, createInvalidResponse), observer pattern for event capture, test organization
  gotcha: These tests use helper functions instead of real Agent instances - the new tests should use actual Agent with mocked prompt()

- file: src/__tests__/integration/agent-workflow.test.ts
  why: Shows workflow-agent integration patterns, how to mock AgentResponse in workflow context
  pattern: Mock AgentResponse objects in workflow steps, type guard usage (isSuccess, isError), observer patterns
  gotcha: This file mocks AgentResponse directly rather than mocking agent.prompt() - adapt pattern to spy on agent.prompt()

- file: src/__tests__/unit/agent-response.test.ts
  why: Shows comprehensive AgentResponse validation patterns, Zod schema testing, and invalid response scenarios
  pattern: Schema validation with Zod, testing all response types (success, error, partial), null vs undefined handling
  gotcha: Focus on discriminated union patterns - status field determines data/error structure

- file: src/core/workflow.ts
  why: Contains validateAgentResponse method implementation - understand what to test
  section: Lines 729-770 (validateAgentResponse method)
  pattern: Method calls validateAgentResponse utility, emits events, creates WorkflowError on failure
  critical: Method returns boolean (true/false), emits invalidResponse event, creates WorkflowError with full context

- file: src/types/events.ts
  why: Defines invalidResponse event structure for test assertions
  section: Line 22 (invalidResponse event type)
  pattern: Event has type, node, response, agentId, errors (ZodError), timestamp fields
  critical: Event.errors is a ZodError with errors array containing validation error details

- file: src/types/error.ts
  why: Defines WorkflowError structure for verification
  pattern: WorkflowError has message, original (ZodError), workflowId, stack, state, logs fields
  critical: state is SerializedWorkflowState - use getObservedState() pattern if needed

- file: src/utils/agent-validation.ts
  why: Contains validateAgentResponse utility function - understand validation logic
  section: Lines 91-108 (validateAgentResponse function)
  pattern: Pure function returning ValidationResult { valid: boolean, errors?: ZodError }
  critical: Uses AgentResponseSchema factory and safeParse for non-throwing validation

- file: vitest.config.ts
  why: Test configuration - understand test framework and patterns
  pattern: Uses Vitest with ES modules, test pattern matches src/__tests__/**/*.test.ts
  gotcha: Use vi.fn(), vi.spyOn(), vi.clearAllMocks() for mocking

- url: https://zod.dev/?id=schemashortcut
  why: Zod schema shortcuts for creating test schemas (z.string(), z.object(), z.array(), etc.)
  critical: Use z.unknown() as default schema, z.object() for structured data validation

- url: https://vitest.dev/guide/mocking.html
  why: Vitest mocking patterns for agent.prompt() mocking
  pattern: vi.spyOn(object, 'method').mockImplementation(() => {...})
  critical: Always restore mocks in afterEach using vi.restoreAllMocks()
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── __tests__/
│   ├── unit/
│   │   ├── workflow-validate-agent-response.test.ts  # EXISTING - isolated validation tests
│   │   ├── agent-response.test.ts                    # EXISTS - AgentResponse schema tests
│   │   └── workflow-validation.test.ts               # NEW FILE - integration tests (to be created)
│   └── integration/
│       └── agent-workflow.test.ts                    # EXISTS - workflow-agent integration patterns
├── core/
│   ├── workflow.ts                                    # validateAgentResponse method (lines 729-770)
│   └── agent.ts                                       # Agent.prompt() method for mocking
├── types/
│   ├── events.ts                                      # invalidResponse event type (line 22)
│   ├── error.ts                                       # WorkflowError interface
│   └── agent.ts                                       # AgentResponse types, isSuccess, isError guards
└── utils/
    └── agent-validation.ts                            # validateAgentResponse utility function
```

### Desired Codebase Tree

```bash
src/
├── __tests__/
│   ├── unit/
│   │   ├── workflow-validate-agent-response.test.ts  # EXISTING - isolated validation tests
│   │   ├── workflow-validation.test.ts               # NEW - integration tests with agent.prompt() mocking
│   │   │   ├── Valid response scenarios (return true, no events)
│   │   │   ├── Invalid status value scenarios
│   │   │   ├── Missing field scenarios
│   │   │   ├── Wrong type scenarios
│   │   │   ├── Status/data mismatch scenarios
│   │   │   ├── Custom schema validation failures
│   │   │   └── Event emission and WorkflowError verification
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: Agent.prompt() returns Promise<AgentResponse<T>>
// When mocking, must return the resolved value, not the promise

// WRONG:
vi.spyOn(agent, 'prompt').mockReturnValue(Promise.resolve(response));

// RIGHT:
vi.spyOn(agent, 'prompt').mockResolvedValue(response);

// CRITICAL: Workflow.validateAgentResponse is NOT async
// It returns boolean immediately, does not await
const isValid = wf.validateAgentResponse(response, 'agentId'); // Not await

// CRITICAL: Events are emitted to observers, not returned
// Must add observer before calling validateAgentResponse
wf.addObserver(observer);
wf.validateAgentResponse(response, 'agentId');
// Then check observer.onEvent.mock.calls

// CRITICAL: ZodError structure for assertions
// ZodError has errors array with objects containing:
// - path: array of strings/numbers (e.g., ['data', 'items', 0, 'name'])
// - message: string (e.g., "Expected string, received number")
// - code: string (e.g., "invalid_type")

// CRITICAL: Type guards for safe data access
isSuccess(response) // narrows to response.status === 'success'
isError(response)   // narrows to response.status === 'error'
isPartial(response) // narrows to response.status === 'partial'

// CRITICAL: Discriminated union - status determines structure
// Success: { status: 'success', data: T, error: null }
// Error:   { status: 'error', data: null, error: AgentErrorDetails }
// Partial: { status: 'partial', data: T, error: null }

// CRITICAL: PRD 6.4.4 - Use null, not undefined
// Success responses: error is null (not undefined)
// Error responses: data is null (not undefined)

// CRITICAL: Metadata is optional in AgentResponse
// Tests should work with and without metadata

// CRITICAL: Workflow nodes must have unique IDs when using multiple agents
// Use workflow.id for workflow-level assertions

// CRITICAL: Vitest uses vi.fn(), vi.spyOn(), not jest.fn()
// Import from 'vitest', not 'jest'
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// Test helper functions for creating mock responses
function createMockValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: { agentId, timestamp: Date.now() },
  };
}

function createMockInvalidResponse(invalidType: 'status' | 'missing' | 'type' | 'mismatch'): AgentResponse<unknown> {
  // Return various invalid response types based on invalidType
}

// Test workflow class with agent integration
class TestValidationWorkflow extends Workflow {
  constructor(private agent: Agent, name?: string) {
    super(name);
  }

  @Step({ name: 'validate-agent-response' })
  async validateAgentStep(): Promise<boolean> {
    const response = await this.agent.prompt(/* ... */);
    return this.validateAgentResponse(response, this.agent.id);
  }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/workflow-validation.test.ts
  - IMPLEMENT: Integration test file with imports from vitest, zod, and project modules
  - FOLLOW pattern: src/__tests__/unit/workflow-validate-agent-response.test.ts (test structure, helper functions)
  - IMPORT: Workflow, Step, Agent, Prompt, WorkflowObserver, WorkflowEvent, isSuccess, isError, createSuccessResponse, createErrorResponse, AgentResponse, z
  - NAMING: Describe blocks for "Workflow-Agent Validation Integration", "Valid Response Scenarios", "Invalid Response Scenarios", "Event Emission Verification", "WorkflowError Creation"
  - PLACEMENT: src/__tests__/unit/unit/ directory alongside existing workflow tests

Task 2: IMPLEMENT Test Helper Functions
  - IMPLEMENT: createMockAgent() helper that creates Agent instance with mocked prompt() method
  - IMPLEMENT: createMockValidResponse<T>() helper for valid success responses
  - IMPLEMENT: createMockInvalidResponse() helper that takes invalidType parameter
  - FOLLOW pattern: src/__tests__/unit/workflow-validate-agent-response.test.ts (createValidResponse, createInvalidResponse)
  - NAMING: camelCase function names with descriptive names (createMockAgent, createMockValidResponse, etc.)
  - DEPENDENCIES: Import Agent, AgentResponse types from project modules
  - PLACEMENT: Top of test file, before first describe block

Task 3: IMPLEMENT Valid Response Scenarios
  - IMPLEMENT: "should return true for valid response from agent.prompt()" test
  - IMPLEMENT: "should not emit invalidResponse event for valid response" test
  - IMPLEMENT: "should work with complex valid data schema" test
  - FOLLOW pattern: src/__tests__/integration/agent-workflow.test.ts (workflow with mocked AgentResponse)
  - NAMING: Test names follow "should [expected behavior] [condition]" pattern
  - DEPENDENCIES: Helper functions from Task 2, Workflow class
  - MOCK: Use vi.spyOn(agent, 'prompt').mockResolvedValue() for agent mocking
  - PLACEMENT: Inside "Valid Response Scenarios" describe block

Task 4: IMPLEMENT Invalid Status Value Scenarios
  - IMPLEMENT: "should return false for invalid status value" test
  - IMPLEMENT: "should emit invalidResponse event for invalid status" test
  - IMPLEMENT: "should include ZodError with status path" test
  - FOLLOW pattern: src/__tests__/unit/agent-response.test.ts (invalid schema testing)
  - NAMING: Test names specify the invalid scenario (e.g., "invalid status value", "missing required field")
  - DEPENDENCIES: Helper functions from Task 2, Workflow class, observer pattern
  - MOCK: Mock agent.prompt() to return response with status: 'invalid' as any
  - VERIFY: Check observer.onEvent.mock.calls for invalidResponse event
  - PLACEMENT: Inside "Invalid Response Scenarios" describe block

Task 5: IMPLEMENT Missing Field Scenarios
  - IMPLEMENT: "should return false when required field is missing" test
  - IMPLEMENT: "should emit event with path pointing to missing field" test
  - IMPLEMENT: "should handle multiple missing fields" test
  - FOLLOW pattern: src/__tests__/unit/agent-response.test.ts (schema validation with missing fields)
  - NAMING: Test names reference the specific missing field scenario
  - DEPENDENCIES: Zod schemas for required fields, helper functions
  - MOCK: Return response with data object missing required keys
  - VERIFY: ZodError.errors[0].path contains the field path (e.g., ['data', 'requiredField'])
  - PLACEMENT: Inside "Invalid Response Scenarios" describe block

Task 6: IMPLEMENT Wrong Type Scenarios
  - IMPLEMENT: "should return false when field has wrong type" test
  - IMPLEMENT: "should emit event with type mismatch error code" test
  - IMPLEMENT: "should handle nested type mismatches" test
  - FOLLOW pattern: src/__tests__/unit/agent-response.test.ts (type validation tests)
  - NAMING: Test names describe the type mismatch scenario
  - DEPENDENCIES: Zod schemas with specific types (string, number, array, object)
  - MOCK: Return response with data where field type doesn't match schema
  - VERIFY: ZodError.errors contains error.code === 'invalid_type'
  - PLACEMENT: Inside "Invalid Response Scenarios" describe block

Task 7: IMPLEMENT Status/Data Mismatch Scenarios
  - IMPLEMENT: "should return false for success status with null data" test
  - IMPLEMENT: "should return false for error status with non-null data" test
  - IMPLEMENT: "should handle error response with missing error field" test
  - FOLLOW pattern: src/__tests__/unit/agent-response.test.ts (discriminated union validation)
  - NAMING: Test names describe the mismatch scenario (e.g., "success status with null data")
  - DEPENDENCIES: Understanding of discriminated union validation in AgentResponseSchema
  - MOCK: Return responses that violate discriminated union constraints
  - VERIFY: ZodError.errors contains path to status/data/error fields
  - PLACEMENT: Inside "Invalid Response Scenarios" describe block

Task 8: IMPLEMENT Event Emission Verification Tests
  - IMPLEMENT: "should emit invalidResponse event with all required fields" test
  - IMPLEMENT: "should include workflow node in event" test
  - IMPLEMENT: "should include agentId in event" test
  - IMPLEMENT: "should include ZodError in event" test
  - IMPLEMENT: "should include timestamp in event" test
  - FOLLOW pattern: src/__tests__/unit/workflow-validate-agent-response.test.ts (event verification)
  - NAMING: Test names verify specific event fields
  - DEPENDENCIES: WorkflowObserver interface, observer pattern
  - SETUP: Add observer with onEvent mock before calling validateAgentResponse
  - VERIFY: Check observer.onEvent.mock.calls for event with type === 'invalidResponse'
  - PLACEMENT: Inside "Event Emission Verification" describe block

Task 9: IMPLEMENT WorkflowError Creation Tests
  - IMPLEMENT: "should create WorkflowError with proper message" test
  - IMPLEMENT: "should include agentId in error message" test
  - IMPLEMENT: "should include ZodError as original error" test
  - IMPLEMENT: "should include workflow state in error" test
  - IMPLEMENT: "should include logs in error" test
  - FOLLOW pattern: src/__tests__/unit/workflow-validate-agent-response.test.ts (error structure verification)
  - NAMING: Test names verify specific WorkflowError fields
  - DEPENDENCIES: Understanding of WorkflowError interface structure
  - NOTE: Workflow.validateAgentResponse creates WorkflowError but doesn't return it
  - VERIFY: Check that WorkflowError structure matches expected format if accessible
  - PLACEMENT: Inside "WorkflowError Creation" describe block

Task 10: IMPLEMENT Integration with Workflow Step Tests
  - IMPLEMENT: "should work when called from @Step decorated method" test
  - IMPLEMENT: "should integrate with workflow execution context" test
  - IMPLEMENT: "should handle validation in async step execution" test
  - FOLLOW pattern: src/__tests__/integration/agent-workflow.test.ts (workflow step integration)
  - NAMING: Test names describe the integration scenario
  - DEPENDENCIES: @Step decorator, WorkflowObserver, workflow execution
  - SETUP: Create workflow with @Step method that calls agent.prompt() and validateAgentResponse
  - VERIFY: Workflow executes successfully, events are emitted correctly
  - PLACEMENT: Inside "Workflow Step Integration" describe block

Task 11: CLEANUP AND VALIDATE
  - RUN: npm test -- src/__tests__/unit/workflow-validation.test.ts
  - VERIFY: All tests pass
  - RUN: npm run lint (or project-specific lint command)
  - VERIFY: No linting errors
  - RUN: npm run typecheck (or project-specific typecheck command)
  - VERIFY: No type errors
  - FINAL: Ensure test coverage is comprehensive
```

### Implementation Patterns & Key Details

```typescript
// ========================================================================
// PATTERN 1: Test Helper Functions
// ========================================================================
// Place at top of test file, before first describe block

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  Workflow,
  Step,
  Agent,
  Prompt,
  WorkflowObserver,
  WorkflowEvent,
  isSuccess,
  isError,
  createSuccessResponse,
  createErrorResponse,
  type AgentResponse,
} from '../../index.js';

// Helper to create mock Agent with spied-on prompt() method
function createMockAgent(agentId: string = 'test-agent') {
  const agent = new Agent({ name: 'TestAgent', provider: 'mock' });
  // Spy on prompt method to control its return value
  vi.spyOn(agent, 'prompt').mockResolvedValue(
    createSuccessResponse({ result: 'default' }, { agentId, timestamp: Date.now() })
  );
  return { agent, agentId };
}

// Helper to create mock valid response
function createMockValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: { agentId, timestamp: Date.now() },
  };
}

// Helper to create mock invalid response based on type
function createMockInvalidResponse(
  invalidType: 'status' | 'missing' | 'type' | 'mismatch' | 'null-data' | 'non-null-error',
  agentId: string = 'test-agent'
): AgentResponse<unknown> {
  const base = {
    metadata: { agentId, timestamp: Date.now() },
  };

  switch (invalidType) {
    case 'status':
      return { ...base, status: 'invalid' as any, data: 'test', error: null };

    case 'missing':
      return { ...base, status: 'success', error: null } as any; // Missing data field

    case 'type':
      return { ...base, status: 'success', data: 42, error: null }; // data should be object

    case 'mismatch':
      return { ...base, status: 'success', data: null, error: null }; // success requires non-null data

    case 'null-data':
      return { ...base, status: 'success', data: null, error: null };

    case 'non-null-error':
      return { ...base, status: 'error', data: 'not-null', error: null };

    default:
      return base as any;
  }
}

// ========================================================================
// PATTERN 2: Observer Setup for Event Verification
// ========================================================================
// Use this pattern in tests that need to verify event emission

const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: vi.fn(),
  onEvent: (event) => events.push(event),
  onStateUpdated: vi.fn(),
  onTreeChanged: vi.fn(),
};

wf.addObserver(observer);

// After calling validateAgentResponse, find specific events
const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
expect(invalidEvents).toHaveLength(1);

// Verify event structure
expect(invalidEvents[0].agentId).toBe('test-agent');
expect(invalidEvents[0].errors).toBeDefined();
expect(invalidEvents[0].errors.errors).toBeInstanceOf(Array);

// ========================================================================
// PATTERN 3: Mocking agent.prompt() with Different Responses
// ========================================================================
// Use vi.spyOn with mockResolvedValue for async methods

// Mock valid response
vi.spyOn(agent, 'prompt').mockResolvedValue(
  createMockValidResponse({ result: 'test' }, 'test-agent')
);

// Mock invalid response
vi.spyOn(agent, 'prompt').mockResolvedValue(
  createMockInvalidResponse('status', 'test-agent')
);

// Mock based on prompt content (for conditional responses)
vi.spyOn(agent, 'prompt').mockImplementation(async (prompt: Prompt<unknown>) => {
  const promptText = prompt.user ?? '';
  if (promptText.includes('invalid')) {
    return createMockInvalidResponse('status', 'test-agent');
  }
  return createMockValidResponse({ result: 'valid' }, 'test-agent');
});

// ========================================================================
// PATTERN 4: Workflow Class with Agent Integration
// ========================================================================
// Create test workflow that uses agent

class TestValidationWorkflow extends Workflow {
  constructor(private agent: Agent, name?: string) {
    super(name);
  }

  @Step({ name: 'validate-agent-response' })
  async validateAgentStep(): Promise<boolean> {
    const response = await this.agent.prompt(
      new Prompt({ user: 'Test prompt' })
    );
    return this.validateAgentResponse(response, this.agent.id);
  }

  @Step({ name: 'validate-with-schema' })
  async validateWithSchemaStep(): Promise<boolean> {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });

    const response = await this.agent.prompt(
      new Prompt({ user: 'Test prompt', responseFormat: schema })
    );

    return this.validateAgentResponse(response, this.agent.id, schema);
  }

  async run(): Promise<boolean> {
    this.setStatus('running');
    const result = await this.validateAgentStep();
    this.setStatus('completed');
    return result;
  }
}

// ========================================================================
// PATTERN 5: Test Structure for Validation Scenarios
// ========================================================================
describe('Valid Response Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for valid response from agent.prompt()', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse({ result: 'test' }, 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) { super(); }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test' }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(true);
  });
});

describe('Invalid Response Scenarios', () => {
  it('should return false for invalid status value', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    const events: WorkflowEvent[] = [];
    const observer: WorkflowObserver = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) { super(); }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test' }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(1);
  });
});

// ========================================================================
// PATTERN 6: ZodError Verification
// ========================================================================
// Verify ZodError structure in event payload

const invalidEvent = events.find((e) => e.type === 'invalidResponse');
expect(invalidEvent).toBeDefined();

// Check ZodError exists
expect(invalidEvent?.errors).toBeDefined();
expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);

// Check specific error details
const firstError = invalidEvent?.errors.errors[0];
expect(firstError).toHaveProperty('path');
expect(firstError).toHaveProperty('message');
expect(firstError).toHaveProperty('code');

// For type mismatch errors
expect(firstError.code).toBe('invalid_type');
expect(firstError.message).toContain('Expected');

// For missing field errors
expect(firstError.code).toBe('invalid_type'); // Zod uses invalid_type for missing required fields too
```

### Integration Points

```yaml
WORKFLOW_CLASS:
  - use: src/core/workflow.ts
  - pattern: "class TestWorkflow extends Workflow { constructor(private agent: Agent) { super(); } @Step() async testStep() { ... } }"
  - import: "import { Workflow, Step } from '../../index.js'"

AGENT_CLASS:
  - use: src/core/agent.ts
  - pattern: "const agent = new Agent({ name: 'TestAgent', provider: 'mock' }); vi.spyOn(agent, 'prompt').mockResolvedValue(response)"
  - import: "import { Agent } from '../../index.js'"

PROMPT_CLASS:
  - use: For creating typed prompts in tests
  - pattern: "new Prompt({ user: 'Test prompt', responseFormat: z.object({ ... }) })"
  - import: "import { Prompt } from '../../index.js'"

OBSERVER_PATTERN:
  - use: For capturing workflow events
  - pattern: "wf.addObserver(observer); const events = []; observer.onEvent = (e) => events.push(e)"
  - import: "import { WorkflowObserver, WorkflowEvent } from '../../index.js'"

TYPE_GUARDS:
  - use: For type-safe response handling
  - pattern: "if (isSuccess(response)) { response.data }"
  - import: "import { isSuccess, isError } from '../../index.js'"

ZOD_SCHEMAS:
  - use: For data validation in tests
  - pattern: "const schema = z.object({ name: z.string(), count: z.number() })"
  - import: "import { z } from 'zod'"

VITEST_MOCKING:
  - use: For mocking agent.prompt() method
  - pattern: "vi.spyOn(agent, 'prompt').mockResolvedValue(response)"
  - import: "import { vi } from 'vitest'"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npm run lint -- src/__tests__/unit/workflow-validation.test.ts
# Expected: Zero linting errors

# Type checking (if using TypeScript)
npm run typecheck
# Expected: Zero type errors

# Format check (if using prettier/ruff format)
npm run format-check -- src/__tests__/unit/workflow-validation.test.ts
# Expected: Zero formatting issues
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new test file
npm test -- src/__tests__/unit/workflow-validation.test.ts
# Expected: All tests pass

# Run with verbose output for detailed results
npm test -- --reporter=verbose src/__tests__/unit/workflow-validation.test.ts
# Expected: All tests show as passing

# Run in watch mode during development
npm run test:watch -- src/__tests__/unit/workflow-validation.test.ts
# Expected: Tests re-run on file changes

# Run all workflow-related tests to ensure no regressions
npm test -- src/__tests__/unit/workflow*.test.ts
# Expected: All workflow tests pass

# Run all unit tests
npm test -- src/__tests__/unit/
# Expected: All unit tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full test suite
npm test
# Expected: All tests pass, no failures in workflow-validation.test.ts

# Run with coverage (if coverage tools are configured)
npm run test:coverage
# Expected: Coverage report shows tests for validateAgentResponse scenarios

# Check that new tests don't break existing tests
npm test -- src/__tests__/unit/workflow-validate-agent-response.test.ts
# Expected: Existing tests still pass (no regressions)

# Run integration tests to verify workflow-agent integration
npm test -- src/__tests__/integration/
# Expected: All integration tests pass
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test-specific validation scenarios:

# 1. Verify all invalid response types are tested
grep -E "invalid.*status|missing.*field|wrong.*type|status.*data.*mismatch" src/__tests__/unit/workflow-validation.test.ts
# Expected: All scenarios have corresponding tests

# 2. Verify event emission tests exist
grep -c "invalidResponse" src/__tests__/unit/workflow-validation.test.ts
# Expected: Count > 5 (multiple tests verify event emission)

# 3. Verify ZodError structure validation
grep -c "ZodError\|errors\.errors" src/__tests__/unit/workflow-validation.test.ts
# Expected: Count > 3 (tests verify error structure)

# 4. Verify workflow-agent integration patterns
grep -c "@Step" src/__tests__/unit/workflow-validation.test.ts
# Expected: Count > 3 (tests use real workflow steps)

# 5. Verify type guard usage
grep -c "isSuccess\|isError" src/__tests__/unit/workflow-validation.test.ts
# Expected: Type guards used appropriately in tests

# Manual verification: Check test file follows project patterns
# Compare structure with existing test files
diff -u <(head -50 src/__tests__/unit/workflow-validate-agent-response.test.ts) <(head -50 src/__tests__/unit/workflow-validation.test.ts)
# Expected: Similar import structure and test organization

# Verify test coverage of validateAgentResponse method
# (If coverage tools are available)
npm run test:coverage -- src/__tests__/unit/workflow-validation.test.ts
# Expected: High coverage of validation scenarios
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] All tests pass: `npm test -- src/__tests__/unit/workflow-validation.test.ts`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Test file follows existing patterns (imports, structure, naming)

### Feature Validation

- [ ] Tests cover valid response scenarios (return true, no events)
- [ ] Tests cover all invalid response scenarios (invalid status, missing fields, wrong types, status/data mismatch)
- [ ] Tests verify event emission (invalidResponse event with all required fields)
- [ ] Tests verify WorkflowError creation (message, agentId, ZodError, state, logs)
- [ ] Tests use real workflow-agent integration patterns (agent.prompt() mocking, @Step decorators)
- [ ] Tests cover custom schema validation scenarios

### Code Quality Validation

- [ ] Test file placed at correct path: `src/__tests__/unit/workflow-validation.test.ts`
- [ ] Test file uses existing helper patterns (createMockAgent, createMockValidResponse, etc.)
- [ ] Test names follow "should [expected behavior] [condition]" pattern
- [ ] Describe blocks organize tests logically (Valid, Invalid, Events, Integration)
- [ ] Mocks are properly restored in afterEach hooks
- [ ] Type guards used for safe data access (isSuccess, isError)
- [ ] Observer pattern used for event capture
- [ ] Tests are independent (no shared state between tests)

### Documentation & Deployment

- [ ] Test file includes comments explaining test purpose (if complex)
- [ ] Test scenarios map to contract requirements (invalid status, missing fields, wrong types, status/data mismatch)
- [ ] Test coverage includes edge cases (null data, non-null error, missing metadata)

---

## Anti-Patterns to Avoid

- ❌ Don't test validateAgentResponse in isolation using helper functions only - use real Agent with mocked prompt()
- ❌ Don't forget to add observer before calling validateAgentResponse for event verification tests
- ❌ Don't use `mockReturnValue` for async methods - use `mockResolvedValue`
- ❌ Don't forget to restore mocks in afterEach - use `vi.restoreAllMocks()`
- ❌ Don't assume event structure - verify all required fields (type, node, response, agentId, errors, timestamp)
- ❌ Don't ignore ZodError structure - verify errors array with proper path, message, code
- ❌ Don't mix up discriminated union patterns - success has data + null error, error has null data + error
- ❌ Don't use undefined for null fields - PRD 6.4.4 requires null, not undefined
- ❌ Don't create tests that depend on execution order - each test should be independent
- ❌ Don't skip cleanup - always clear mocks and reset state between tests
- ❌ Don't use hardcoded timestamps - use Date.now() for dynamic values
- ❌ Don't forget to verify workflow context - workflow.id, agentId should match expectations
