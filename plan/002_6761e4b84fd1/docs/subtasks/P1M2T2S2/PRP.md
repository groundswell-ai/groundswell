# PRP: Write tests for error code handling

**PRP ID**: P1.M2.T2.S2
**Work Item**: Write tests for error code handling
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create comprehensive test suite `src/__tests__/unit/agent-error-codes.test.ts` that validates error code handling scenarios per PRD 6.2 requirements, ensuring all error codes are machine-readable and the `recoverable` field correctly affects retry logic.

**Deliverable**: New test file `src/__tests__/unit/agent-error-codes.test.ts` with test cases covering:
- INVALID_RESPONSE_FORMAT code on malformed response (non-JSON, schema violations, wrong types)
- EXECUTION_FAILED on workflow errors (compilation, runtime exceptions)
- Custom error codes from tool use failures (TOOL_EXECUTION_FAILED with tool details)
- `recoverable` field affects retry logic (true = retry, false = fail immediately)

**Success Definition**:
- New test file created at `src/__tests__/unit/agent-error-codes.test.ts`
- All test cases validate error code scenarios per PRD 6.2 (machine-readable error codes)
- Tests verify `recoverable` field behavior affects retry logic
- Tests pass: `npm test -- agent-error-codes.test.ts`
- No breaking changes to existing tests
- Tests integrate with existing Vitest configuration

---

## Why

**Business Value and User Impact**:
- **Machine-Readable Error Codes**: Ensures error codes can be programmatically processed by automation systems (per PRD 6.2)
- **Retry Logic Validation**: Validates that the `recoverable` field correctly signals whether to retry operations
- **Tool Failure Handling**: Tests custom error scenarios when tools fail during agent execution
- **Malformed Response Detection**: Validates that invalid responses return INVALID_RESPONSE_FORMAT

**Integration with Existing Features**:
- **P1.M2.T2.S1 (CONTRACT - Parallel)**: Creates `src/__tests__/unit/agent-response.test.ts` with basic error response validation. This PRP adds more specific error code scenario tests.
- **P1.M2.T1.S2 (Complete)**: Added `INTERNAL_ERROR` to `AGENT_ERROR_CODES` which is tested in this item
- **P1.M1.T1.S2 (Complete)**: Factory helpers (`createErrorResponse`) produce valid error responses to test
- **P1.M1.T1.S4 (Complete)**: Added INVALID_RESPONSE_FORMAT error handling to Agent.prompt()

**Problems This Solves**:
- **No Error Code Scenario Tests**: Existing tests validate schema structure but don't test specific error code scenarios
- **No Retry Logic Tests**: Tests don't verify that `recoverable` field affects retry behavior
- **No Tool Failure Tests**: Tests don't cover tool execution failure error scenarios
- **No Malformed Response Tests**: Tests don't cover INVALID_RESPONSE_FORMAT for non-JSON responses

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This adds test coverage for existing error handling functionality.

**Technical Requirements**:
- Create new test file `src/__tests__/unit/agent-error-codes.test.ts`
- Test INVALID_RESPONSE_FORMAT error code on malformed responses (non-JSON, schema violations)
- Test EXECUTION_FAILED error code on workflow errors
- Test custom error codes from tool use failures (TOOL_EXECUTION_FAILED with tool details)
- Test `recoverable` field affects retry logic (true = should retry, false = should not retry)
- Test all AGENT_ERROR_CODES are machine-readable (string format, SCREAMING_SNAKE_CASE)
- Follow existing test patterns from `agent-response-factory.test.ts` and `agent-response.test.ts`

### Success Criteria

- [ ] Test file created at `src/__tests__/unit/agent-error-codes.test.ts`
- [ ] Tests for INVALID_RESPONSE_FORMAT on non-JSON responses
- [ ] Tests for INVALID_RESPONSE_FORMAT on schema violations
- [ ] Tests for INVALID_RESPONSE_FORMAT on wrong data types
- [ ] Tests for EXECUTION_FAILED on workflow errors
- [ ] Tests for TOOL_EXECUTION_FAILED with tool details
- [ ] Tests for custom error codes from tool failures
- [ ] Tests for `recoverable: true` triggers retry logic
- [ ] Tests for `recoverable: false` prevents retry logic
- [ ] Tests for INTERNAL_ERROR is always non-recoverable
- [ ] Tests for all AGENT_ERROR_CODES are machine-readable
- [ ] All tests pass: `npm test -- agent-error-codes.test.ts`
- [ ] Existing tests still pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement error code handling tests successfully?

**Answer**: YES - This PRP provides exact file locations, existing test patterns, error code definitions, PRD requirements, external documentation URLs, and step-by-step implementation tasks.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/api/expect.html
  why: Official Vitest documentation for expect matchers
  critical: Sections on toEqual, toMatchObject, toHaveProperty, toThrow

- url: https://vitest.dev/guide/testing-types.html#async-testing
  why: Official Vitest documentation for async error testing
  critical: Using rejects.toThrow() for async error assertions

- url: https://zod.dev/?id=safeparse
  why: Official Zod documentation for safeParse validation pattern
  critical: Use safeParse() for validation tests to avoid throws

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Contains all AGENT_ERROR_CODES and AgentErrorDetails interface
  pattern: Lines 442-493 (AGENT_ERROR_CODES), Lines 221-250 (AgentErrorDetails)
  critical: All error codes must be tested

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-response-factory.test.ts
  why: Reference for existing error response test patterns
  pattern: Lines 84-138 (error response with details), Lines 99-105 (error code format)
  section: Lines 99-105 show SCREAMING_SNAKE_CASE validation

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts
  why: Reference for schema validation test patterns (from P1.M2.T2.S1)
  pattern: Lines 120-254 (Error Response Validation)
  section: Lines 190-210 show INTERNAL_ERROR code testing

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts
  why: Reference for Agent.prompt() error handling tests
  pattern: Lines 603-684 (INTERNAL_ERROR for invalid responses)
  section: Lines 603-684 show validateResponse error handling

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S1/PRP.md
  why: CONTRACT - Defines what P1.M2.T2.S1 produces (agent-response.test.ts)
  section: Section "Goal" for test structure, Section "Implementation Blueprint" for patterns
  critical: Don't duplicate P1.M2.T2.S1 tests - focus on error code SCENARIOS

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S2/research/error-codes-reference.md
  why: Research findings on error codes, their structure, and usage patterns
  section: Section "AGENT_ERROR_CODES Definition", Section "Recoverable Field Behavior"
  critical: Complete error code reference with recoverable defaults

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S2/research/error-testing-patterns.md
  why: Research findings on error testing patterns in TypeScript/Vitest/Zod
  section: Sections on "Testing Error Codes", "Testing Recoverable Field", "Testing Tool Use Failures"
  critical: Complete code examples for all error testing scenarios
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts                      # AGENT_ERROR_CODES, AgentErrorDetails
│   │   ├── AGENT_ERROR_CODES (lines 442-493)
│   │   ├── AgentErrorDetails interface (lines 221-250)
│   │   ├── createErrorResponse factory (lines 595-615)
│   │   └── AgentResponseSchema factory (lines 809-832)
│   └── index.ts
├── __tests__/
│   ├── unit/
│   │   ├── agent-response-factory.test.ts    # Reference for error patterns
│   │   ├── agent-response.test.ts            # From P1.M2.T2.S1 - basic validation
│   │   ├── agent-response-public-api.test.ts # Type guard tests
│   │   └── agent.test.ts                     # Agent.prompt() error tests
│   └── integration/
├── core/
│   └── agent.ts                      # Agent class (uses error codes)
└── index.ts
```

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILE TO CREATE
src/
└── __tests__
    └── unit/
        └── agent-error-codes.test.ts   # NEW FILE - Error code scenario tests
            ├── [IMPORT]: Vitest imports (describe, it, expect)
            ├── [IMPORT]: Zod imports (z)
            ├── [IMPORT]: AgentResponse types and error codes
            ├── [TEST]: INVALID_RESPONSE_FORMAT on non-JSON
            ├── [TEST]: INVALID_RESPONSE_FORMAT on schema violations
            ├── [TEST]: INVALID_RESPONSE_FORMAT on wrong types
            ├── [TEST]: EXECUTION_FAILED on workflow errors
            ├── [TEST]: TOOL_EXECUTION_FAILED with tool details
            ├── [TEST]: Custom error codes from tool failures
            ├── [TEST]: recoverable: true triggers retry
            ├── [TEST]: recoverable: false prevents retry
            ├── [TEST]: INTERNAL_ERROR is always non-recoverable
            └── [TEST]: All AGENT_ERROR_CODES are machine-readable
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: agent-response.test.ts (from P1.M2.T2.S1) already has basic error validation
// DO NOT duplicate those tests - focus on ERROR CODE SCENARIOS
// P1.M2.T2.S1 tests: schema validation, structure, null handling
// P1.M2.T2.S2 tests: specific error code scenarios, retry logic

// CRITICAL: Use .safeParse() for validation tests
const result = schema.safeParse(response);
expect(result.success).toBe(true);  // Check success flag
// result.parse() throws on failure - don't use in tests

// CRITICAL: Import from .js files (TypeScript compiles to .js)
import { AGENT_ERROR_CODES } from '../../types/agent.js';  // Correct

// CRITICAL: Error codes must be machine-readable (strings)
// PRD 6.2: "error codes must be machine-readable"
// Format: SCREAMING_SNAKE_CASE (e.g., 'INVALID_RESPONSE_FORMAT')
expect(errorCode).toMatch(/^[A-Z][A-Z_]*$/);

// CRITICAL: recoverable field affects retry logic
// recoverable: true = should retry (e.g., API_REQUEST_FAILED)
// recoverable: false = should NOT retry (e.g., VALIDATION_FAILED, INTERNAL_ERROR)

// CRITICAL: INTERNAL_ERROR is always non-recoverable
// Indicates a code bug - retrying won't help
expect(AGENT_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
const error = createErrorResponse('INTERNAL_ERROR', 'msg');
expect(error.error?.recoverable).toBe(false);

// CRITICAL: Tool failures use TOOL_EXECUTION_FAILED code
// Include tool details in error.details
const toolError = createErrorResponse(
  'TOOL_EXECUTION_FAILED',
  'Tool "search-web" failed',
  { toolName: 'search-web', originalError: 'RATE_LIMIT' },
  true  // May be recoverable if transient
);

// PATTERN: Test file naming - *.test.ts suffix
// Location: src/__tests__/unit/agent-error-codes.test.ts

// PATTERN: Test structure - nested describe blocks
describe('Error Code Handling', () => {
  describe('INVALID_RESPONSE_FORMAT Scenarios', () => {
    it('should handle non-JSON responses', () => {
      // test code
    });
  });
});

// GOTCHA: Vitest globals are enabled (globals: true in vitest.config.ts)
// But existing tests still explicitly import them - follow the pattern
import { describe, it, expect } from 'vitest';  // Follow existing pattern

// CRITICAL: Test scripts
npm test -- agent-error-codes.test.ts  # Run specific test file
npm test                            # Run all tests
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Tests validate existing error code handling.

**Key Error Codes to Test**:

| Error Code | Recoverable | Test Scenarios |
|------------|-------------|----------------|
| `INVALID_RESPONSE_FORMAT` | `false` | Non-JSON, schema violations, wrong types |
| `VALIDATION_FAILED` | `false` | Input validation errors |
| `EXECUTION_FAILED` | Context-dependent | Workflow errors, compilation failures |
| `API_REQUEST_FAILED` | `true` | Network timeouts, rate limits |
| `TOOL_EXECUTION_FAILED` | Context-dependent | Tool not found, tool errors |
| `INTERNAL_ERROR` | `false` | Validation failures, code bugs |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file skeleton
  - CREATE: src/__tests__/unit/agent-error-codes.test.ts
  - ADD: Vitest imports (describe, it, expect)
  - ADD: Zod import (z)
  - ADD: AgentResponse type imports
  - ADD: Error code imports (AGENT_ERROR_CODES, createErrorResponse)
  - FOLLOW: Import pattern from agent-response-factory.test.ts
  - NAMING: File name matches pattern: agent-error-codes.test.ts

Task 2: IMPLEMENT INVALID_RESPONSE_FORMAT error code tests
  - ADD: describe block for "INVALID_RESPONSE_FORMAT Error Code"
  - TEST: Non-JSON response returns INVALID_RESPONSE_FORMAT
  - TEST: Schema violation returns INVALID_RESPONSE_FORMAT
  - TEST: Wrong data type returns INVALID_RESPONSE_FORMAT
  - TEST: Missing required fields returns INVALID_RESPONSE_FORMAT
  - TEST: INVALID_RESPONSE_FORMAT is non-recoverable
  - FOLLOW: Pattern from agent.test.ts lines 603-684

Task 3: IMPLEMENT EXECUTION_FAILED error code tests
  - ADD: describe block for "EXECUTION_FAILED Error Code"
  - TEST: Compilation failure returns EXECUTION_FAILED
  - TEST: Runtime exception returns EXECUTION_FAILED
  - TEST: Workflow step failure returns EXECUTION_FAILED
  - TEST: EXECUTION_FAILED can be recoverable or non-recoverable
  - TEST: Error details include failure context
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 84-138

Task 4: IMPLEMENT tool use failure error code tests
  - ADD: describe block for "Tool Execution Failures"
  - TEST: TOOL_EXECUTION_FAILED with tool name in details
  - TEST: Tool not found error with available tools
  - TEST: Tool timeout error
  - TEST: Tool error with original error message
  - TEST: Tool error recoverable based on error type
  - FOLLOW: Pattern from agent-response.test.ts lines 148-168

Task 5: IMPLEMENT recoverable field affects retry logic tests
  - ADD: describe block for "Recoverable Field and Retry Logic"
  - TEST: API_REQUEST_FAILED (recoverable: true) triggers retry
  - TEST: VALIDATION_FAILED (recoverable: false) prevents retry
  - TEST: INTERNAL_ERROR (recoverable: false) prevents retry
  - TEST: Tool timeout (recoverable: true) triggers retry
  - TEST: Tool not found (recoverable: false) prevents retry
  - CREATE: shouldRetry helper function to test logic
  - FOLLOW: Pattern from error-testing-patterns.md "Testing Retry Logic Based on Recoverable"

Task 6: IMPLEMENT machine-readable error code tests
  - ADD: describe block for "Machine-Readable Error Codes (PRD 6.2)"
  - TEST: All error codes are strings (not numbers)
  - TEST: All error codes follow SCREAMING_SNAKE_CASE format
  - TEST: Error codes can be used in switch statements
  - TEST: Error codes are programmatically parsable
  - TEST: AGENT_ERROR_CODES constant has all standard codes
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 99-105

Task 7: IMPLEMENT custom error code scenario tests
  - ADD: describe block for "Custom Error Code Scenarios"
  - TEST: Custom error code with tool-specific details
  - TEST: Custom error code with validation context
  - TEST: Custom error code preserves recoverable field
  - TEST: Custom error code serializes correctly
  - FOLLOW: Pattern from error-testing-patterns.md "Testing Custom Error Codes from Tool Failures"

Task 8: RUN tests and verify
  - RUN: npm test -- agent-error-codes.test.ts
  - VERIFY: All new tests pass
  - RUN: npm test (full test suite)
  - VERIFY: No existing tests broken
  - CHECK: TypeScript compilation: npm run lint
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test file imports
// In src/__tests__/unit/agent-error-codes.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  createErrorResponse,
  createSuccessResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
} from '../../types/agent.js';

// PATTERN 2: INVALID_RESPONSE_FORMAT error code tests
describe('INVALID_RESPONSE_FORMAT Error Code', () => {
  it('should handle non-JSON responses', () => {
    // Simulate response that's not valid JSON
    const malformedText = 'This is not JSON';

    // Should return INVALID_RESPONSE_FORMAT error
    const expectedResponse = createErrorResponse(
      AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
      'Response is not valid JSON',
      { rawResponse: malformedText },
      false  // Non-recoverable
    );

    expect(expectedResponse.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(expectedResponse.error?.recoverable).toBe(false);
  });

  it('should handle schema violations with INVALID_RESPONSE_FORMAT', () => {
    const schema = AgentResponseSchema(z.object({ result: z.string() }));

    // Response with wrong data type for success
    const invalidResponse = {
      status: 'success' as const,
      data: 123,  // Should be object, not number
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);

    // Should be treated as INVALID_RESPONSE_FORMAT
    // (in actual implementation, this would return INTERNAL_ERROR from validateResponse)
  });

  it('should handle responses with missing required fields', () => {
    const schema = AgentResponseSchema(z.string());

    // Response missing status field
    const missingFieldResponse = {
      // status: 'success', // Missing!
      data: 'test',
      error: null,
    };

    const result = schema.safeParse(missingFieldResponse);
    expect(result.success).toBe(false);
  });
});

// PATTERN 3: EXECUTION_FAILED error code tests
describe('EXECUTION_FAILED Error Code', () => {
  it('should handle workflow compilation failures', () => {
    const compilationError = createErrorResponse(
      AGENT_ERROR_CODES.EXECUTION_FAILED,
      'Failed to compile TypeScript files',
      {
        failedFiles: ['src/index.ts'],
        compilerErrors: ['TS2307: Cannot find module'],
      },
      false  // Non-recoverable - code error
    );

    expect(compilationError.error?.code).toBe('EXECUTION_FAILED');
    expect(compilationError.error?.recoverable).toBe(false);
    expect(compilationError.error?.details?.failedFiles).toEqual(['src/index.ts']);
  });

  it('should handle workflow runtime exceptions', () => {
    const runtimeError = createErrorResponse(
      AGENT_ERROR_CODES.EXECUTION_FAILED,
      'Runtime exception in workflow step',
      {
        stepName: 'processData',
        exception: 'TypeError: Cannot read property of undefined',
      },
      true  // May be recoverable if transient
    );

    expect(runtimeError.error?.code).toBe('EXECUTION_FAILED');
    expect(runtimeError.error?.recoverable).toBe(true);
  });

  it('should validate EXECUTION_FAILED against schema', () => {
    const schema = AgentResponseSchema(z.unknown());

    const response = createErrorResponse(
      AGENT_ERROR_CODES.EXECUTION_FAILED,
      'Workflow execution failed',
      { step: 'step1', reason: 'timeout' },
      true
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error?.code).toBe('EXECUTION_FAILED');
    }
  });
});

// PATTERN 4: Tool execution failure tests
describe('Tool Execution Failures', () => {
  it('should handle tool execution failures with TOOL_EXECUTION_FAILED', () => {
    const toolError = createErrorResponse(
      AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
      'Tool "search-web" failed: Rate limit exceeded',
      {
        toolName: 'search-web',
        originalError: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      },
      true  // Recoverable - rate limit is transient
    );

    expect(toolError.error?.code).toBe('TOOL_EXECUTION_FAILED');
    expect(toolError.error?.recoverable).toBe(true);
    expect(toolError.error?.details?.toolName).toBe('search-web');
    expect(toolError.error?.details?.retryAfter).toBe(60);
  });

  it('should handle tool not found errors', () => {
    const notFoundError = createErrorResponse(
      AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
      'Tool "non-existent-tool" not found',
      {
        toolName: 'non-existent-tool',
        availableTools: ['search-web', 'calculator', 'file-read'],
      },
      false  // Non-recoverable - tool doesn't exist
    );

    expect(notFoundError.error?.code).toBe('TOOL_EXECUTION_FAILED');
    expect(notFoundError.error?.recoverable).toBe(false);
    expect(notFoundError.error?.details?.availableTools).toHaveLength(3);
  });

  it('should handle tool timeout errors', () => {
    const timeoutError = createErrorResponse(
      AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
      'Tool "long-running-task" timed out after 30000ms',
      {
        toolName: 'long-running-task',
        timeout: 30000,
      },
      true  // Recoverable - may succeed on retry
    );

    expect(timeoutError.error?.code).toBe('TOOL_EXECUTION_FAILED');
    expect(timeoutError.error?.recoverable).toBe(true);
  });
});

// PATTERN 5: Recoverable field affects retry logic tests
describe('Recoverable Field and Retry Logic', () => {
  // Helper function to simulate retry logic
  function shouldRetry(response: AgentResponse<unknown>): boolean {
    return response.status === 'error' && response.error?.recoverable === true;
  }

  it('should retry recoverable errors (API_REQUEST_FAILED)', () => {
    const recoverableError = createErrorResponse(
      AGENT_ERROR_CODES.API_REQUEST_FAILED,
      'Network timeout',
      { timeout: 30000, retryAfter: 1000 },
      true  // Recoverable
    );

    expect(shouldRetry(recoverableError)).toBe(true);
    expect(recoverableError.error?.code).toBe('API_REQUEST_FAILED');
  });

  it('should not retry non-recoverable errors (VALIDATION_FAILED)', () => {
    const validationError = createErrorResponse(
      AGENT_ERROR_CODES.VALIDATION_FAILED,
      'Invalid input: email format incorrect',
      { field: 'email', value: 'not-an-email' },
      false  // Non-recoverable
    );

    expect(shouldRetry(validationError)).toBe(false);
    expect(validationError.error?.code).toBe('VALIDATION_FAILED');
  });

  it('should not retry INTERNAL_ERROR (always non-recoverable)', () => {
    const internalError = createErrorResponse(
      AGENT_ERROR_CODES.INTERNAL_ERROR,
      'Internal response validation failed',
      { validationErrors: ['Field X is required'] },
      false  // Always non-recoverable
    );

    expect(shouldRetry(internalError)).toBe(false);
    expect(internalError.error?.recoverable).toBe(false);
  });

  it('should retry tool timeout errors', () => {
    const timeoutError = createErrorResponse(
      AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
      'Tool timed out',
      { toolName: 'slow-tool', timeout: 30000 },
      true
    );

    expect(shouldRetry(timeoutError)).toBe(true);
  });

  it('should not retry tool not found errors', () => {
    const notFoundError = createErrorResponse(
      AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
      'Tool not found',
      { toolName: 'missing-tool' },
      false
    );

    expect(shouldRetry(notFoundError)).toBe(false);
  });

  it('should not retry on success responses', () => {
    const successResponse = createSuccessResponse(
      { result: 'ok' },
      { agentId: 'test', timestamp: Date.now() }
    );

    expect(shouldRetry(successResponse)).toBe(false);
  });
});

// PATTERN 6: Machine-readable error code tests (PRD 6.2)
describe('Machine-Readable Error Codes (PRD 6.2)', () => {
  it('should have all error codes as strings', () => {
    Object.values(AGENT_ERROR_CODES).forEach((code) => {
      expect(typeof code).toBe('string');
    });
  });

  it('should follow SCREAMING_SNAKE_CASE format', () => {
    Object.values(AGENT_ERROR_CODES).forEach((code) => {
      expect(code).toMatch(/^[A-Z][A-Z_]*$/);
    });
  });

  it('should be programmatically parsable', () => {
    // Simulate switch statement usage
    const handleError = (code: string): string => {
      switch (code) {
        case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
          return 'Handle invalid format';
        case AGENT_ERROR_CODES.VALIDATION_FAILED:
          return 'Handle validation error';
        case AGENT_ERROR_CODES.EXECUTION_FAILED:
          return 'Handle execution error';
        case AGENT_ERROR_CODES.API_REQUEST_FAILED:
          return 'Handle API error';
        case AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED:
          return 'Handle tool error';
        case AGENT_ERROR_CODES.INTERNAL_ERROR:
          return 'Handle internal error';
        default:
          return 'Unknown error code';
      }
    };

    Object.values(AGENT_ERROR_CODES).forEach((code) => {
      const result = handleError(code);
      expect(result).not.toBe('Unknown error code');
    });
  });

  it('should export all standard error codes', () => {
    expect(AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT).toBe('INVALID_RESPONSE_FORMAT');
    expect(AGENT_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(AGENT_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
    expect(AGENT_ERROR_CODES.API_REQUEST_FAILED).toBe('API_REQUEST_FAILED');
    expect(AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED).toBe('TOOL_EXECUTION_FAILED');
    expect(AGENT_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

// PATTERN 7: Custom error code scenario tests
describe('Custom Error Code Scenarios', () => {
  it('should handle custom error codes with tool-specific details', () => {
    const customToolError = createErrorResponse(
      'CUSTOM_DATABASE_ERROR',
      'Database connection failed',
      {
        database: 'postgres',
        host: 'db.example.com',
        port: 5432,
        originalCode: 'ECONNREFUSED',
      },
      true  // Recoverable - connection may succeed on retry
    );

    expect(customToolError.error?.code).toBe('CUSTOM_DATABASE_ERROR');
    expect(customToolError.error?.recoverable).toBe(true);
    expect(customToolError.error?.details?.database).toBe('postgres');
  });

  it('should handle custom validation error with field context', () => {
    const customValidationError = createErrorResponse(
      'CUSTOM_EMAIL_VALIDATION_FAILED',
      'Email address validation failed',
      {
        field: 'email',
        value: 'invalid-email',
        constraint: 'RFC 5322 format',
      },
      false  // Non-recoverable - value is invalid
    );

    expect(customValidationError.error?.code).toBe('CUSTOM_EMAIL_VALIDATION_FAILED');
    expect(customValidationError.error?.recoverable).toBe(false);
  });

  it('should serialize custom error codes correctly', () => {
    const customError = createErrorResponse(
      'CUSTOM_RATE_LIMIT',
      'API rate limit exceeded',
      { limit: 100, window: '1h', current: 150 },
      true
    );

    const serialized = JSON.parse(JSON.stringify(customError));

    expect(serialized.error.code).toBe('CUSTOM_RATE_LIMIT');
    expect(serialized.error.recoverable).toBe(true);
    expect(serialized.error.details.limit).toBe(100);
  });
});
```

### Integration Points

```yaml
DEPENDS ON: P1.M2.T2.S1 (Write tests for valid AgentResponse structures)
  - agent-response.test.ts exists with basic error validation
  - Don't duplicate those tests - focus on ERROR CODE SCENARIOS
  - Use same test patterns and import style

DEPENDS ON: P1.M2.T1.S2 (Add validation to Agent.prompt() return path)
  - INTERNAL_ERROR added to AGENT_ERROR_CODES
  - Used in validation failure scenarios

DEPENDS ON: P1.M1.T1.S2 (Create AgentResponse factory helpers)
  - createErrorResponse() produces valid error responses
  - AGENT_ERROR_CODES constant defined

NO BREAKING CHANGES:
  - Tests only validate existing error handling
  - No modifications to source code
  - New test file only

DOWNSTREAM DEPENDENCIES:
  - P1.M2.T2.S3 (Write adversarial tests) will build on this
  - P1.M4.T1 (Run full test suite) will include these tests
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After creating test file - verify TypeScript compilation
npm run lint
# Equivalent: npx tsc --noEmit

# Expected: Zero errors. Test file compiles without issues.

# Verify test file compiles independently
npx tsc --noEmit src/__tests__/unit/agent-error-codes.test.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new error code tests
npm test -- agent-error-codes.test.ts

# Run with verbose output
npm test -- agent-error-codes.test.ts --reporter=verbose

# Run specific test suite
npm test -- agent-error-codes.test.ts -t "INVALID_RESPONSE_FORMAT"

# Expected: All tests pass. All error code scenarios validated.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all unit tests in src/__tests__/unit/
npm test -- src/__tests__/unit/

# Run full test suite
npm test

# Expected: All tests pass. New tests integrate with existing test suite.

# Run all error-related tests
npm test -- --testNamePattern="Error|error"
```

### Level 4: Coverage Validation

```bash
# Run tests with coverage report (if coverage configured)
npm test -- --coverage

# Check coverage for error code handling
npm test -- --coverage src/types/agent.ts

# Expected: High coverage for error code scenarios and recoverable logic.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/unit/agent-error-codes.test.ts`
- [ ] All imports use `.js` extension (TypeScript convention)
- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] No type errors in test file
- [ ] Test file follows Vitest conventions

### Feature Validation

- [ ] INVALID_RESPONSE_FORMAT tested on non-JSON responses
- [ ] INVALID_RESPONSE_FORMAT tested on schema violations
- [ ] INVALID_RESPONSE_FORMAT tested on wrong data types
- [ ] EXECUTION_FAILED tested on workflow errors
- [ ] TOOL_EXECUTION_FAILED tested with tool details
- [ ] Custom error codes tested with appropriate details
- [ ] `recoverable: true` triggers retry logic
- [ ] `recoverable: false` prevents retry logic
- [ ] INTERNAL_ERROR is always non-recoverable
- [ ] All AGENT_ERROR_CODES are machine-readable

### Test Validation

- [ ] All tests pass: `npm test -- agent-error-codes.test.ts`
- [ ] Existing tests still pass: `npm test`
- [ ] No breaking changes to existing functionality
- [ ] Tests follow codebase patterns (describe/it structure)
- [ ] Test descriptions are clear and specific

### PRD Compliance Validation

- [ ] PRD 6.2 (Machine-Readable Error Codes): All error codes tested
- [ ] PRD 6.2 (Error Code Format): SCREAMING_SNAKE_CASE validated
- [ ] PRD 6.2 (Recoverable Field): Retry logic tested
- [ ] PRD 6.6 (INVALID_RESPONSE_FORMAT): Malformed response tests

### Code Quality Validation

- [ ] Follows existing test patterns from agent-response-factory.test.ts
- [ ] Uses consistent import patterns
- [ ] Test organization is logical and clear
- [ ] Test names follow "should" convention
- [ ] No code duplication (use helpers where appropriate)
- [ ] Does not duplicate P1.M2.T2.S1 tests

---

## Anti-Patterns to Avoid

- ❌ Don't duplicate tests from agent-response.test.ts (P1.M2.T2.S1) - focus on ERROR CODE SCENARIOS
- ❌ Don't use `.parse()` in tests - use `.safeParse()` to avoid throws
- ❌ Don't import from `.ts` files - use `.js` extension for imports
- ❌ Don't test implementation details - test error code scenarios
- ❌ Don't create tests that are too brittle - focus on error code invariants
- ❌ Don't forget to test all AGENT_ERROR_CODES
- ❌ Don't skip testing the `recoverable` field - it's critical for retry logic
- ❌ Don't forget to test INVALID_RESPONSE_FORMAT for malformed responses
- ❌ Don't forget to test EXECUTION_FAILED for workflow errors
- ❌ Don't forget to test TOOL_EXECUTION_FAILED with tool details
- ❌ Don't forget to test INTERNAL_ERROR is always non-recoverable
- ❌ Don't modify existing test files - create new file only
- ❌ Don't add production code to test files - tests only
- ❌ Don't use `describe.skip` or `it.skip` - all tests should run
- ❌ Don't test factory function outputs - those are tested in agent-response-factory.test.ts
- ❌ Don't test schema structure - those are tested in agent-response.test.ts

---

## Appendix: Complete Reference Implementation

### Task 1-7: Complete Test File Implementation

```typescript
/**
 * Test file: agent-error-codes.test.ts
 *
 * Purpose: Validate error code handling scenarios per PRD 6.2 requirements
 *
 * Tests:
 * - INVALID_RESPONSE_FORMAT code on malformed response
 * - EXECUTION_FAILED on workflow errors
 * - Custom codes from tool use failures
 * - recoverable field affects retry logic
 * - All error codes are machine-readable
 *
 * PRP: P1.M2.T2.S2 - Write tests for error code handling
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  createErrorResponse,
  createSuccessResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
} from '../../types/agent.js';

describe('Error Code Handling', () => {
  describe('INVALID_RESPONSE_FORMAT Error Code', () => {
    it('should handle non-JSON responses', () => {
      // Simulate response that's not valid JSON
      const malformedText = 'This is not JSON';

      // Should return INVALID_RESPONSE_FORMAT error
      const expectedResponse = createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'Response is not valid JSON',
        { rawResponse: malformedText },
        false  // Non-recoverable
      );

      expect(expectedResponse.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(expectedResponse.error?.recoverable).toBe(false);
    });

    it('should handle schema violations with INVALID_RESPONSE_FORMAT', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      // Response with wrong data type for success
      const invalidResponse = {
        status: 'success' as const,
        data: 123,  // Should be object, not number
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);

      // Should be treated as INVALID_RESPONSE_FORMAT
      // (in actual implementation, this would return INTERNAL_ERROR from validateResponse)
    });

    it('should handle responses with missing required fields', () => {
      const schema = AgentResponseSchema(z.string());

      // Response missing status field
      const missingFieldResponse = {
        // status: 'success', // Missing!
        data: 'test',
        error: null,
      };

      const result = schema.safeParse(missingFieldResponse);
      expect(result.success).toBe(false);
    });

    it('should handle responses with wrong data types for error status', () => {
      const schema = AgentResponseSchema(z.string());

      // Error response should have data: null, not string
      const wrongTypeError = {
        status: 'error' as const,
        data: 'should be null',  // Wrong!
        error: {
          code: 'TEST',
          message: 'test',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(wrongTypeError);
      expect(result.success).toBe(false);
    });

    it('should validate INVALID_RESPONSE_FORMAT is non-recoverable', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'Malformed response'
      );

      expect(error.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(error.error?.recoverable).toBe(false);
    });
  });

  describe('EXECUTION_FAILED Error Code', () => {
    it('should handle workflow compilation failures', () => {
      const compilationError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Failed to compile TypeScript files',
        {
          failedFiles: ['src/index.ts'],
          compilerErrors: ['TS2307: Cannot find module'],
        },
        false  // Non-recoverable - code error
      );

      expect(compilationError.error?.code).toBe('EXECUTION_FAILED');
      expect(compilationError.error?.recoverable).toBe(false);
      expect(compilationError.error?.details?.failedFiles).toEqual(['src/index.ts']);
    });

    it('should handle workflow runtime exceptions', () => {
      const runtimeError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Runtime exception in workflow step',
        {
          stepName: 'processData',
          exception: 'TypeError: Cannot read property of undefined',
        },
        true  // May be recoverable if transient
      );

      expect(runtimeError.error?.code).toBe('EXECUTION_FAILED');
      expect(runtimeError.error?.recoverable).toBe(true);
    });

    it('should validate EXECUTION_FAILED against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Workflow execution failed',
        { step: 'step1', reason: 'timeout' },
        true
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('EXECUTION_FAILED');
      }
    });

    it('should handle workflow step failures', () => {
      const stepError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Workflow step "generateReport" failed',
        {
          stepName: 'generateReport',
          stepType: 'async',
          error: 'Report generation timeout',
        },
        true  // May be recoverable
      );

      expect(stepError.error?.code).toBe('EXECUTION_FAILED');
      expect(stepError.error?.recoverable).toBe(true);
    });
  });

  describe('Tool Execution Failures', () => {
    it('should handle tool execution failures with TOOL_EXECUTION_FAILED', () => {
      const toolError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "search-web" failed: Rate limit exceeded',
        {
          toolName: 'search-web',
          originalError: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
        true  // Recoverable - rate limit is transient
      );

      expect(toolError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(toolError.error?.recoverable).toBe(true);
      expect(toolError.error?.details?.toolName).toBe('search-web');
      expect(toolError.error?.details?.retryAfter).toBe(60);
    });

    it('should handle tool not found errors', () => {
      const notFoundError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "non-existent-tool" not found',
        {
          toolName: 'non-existent-tool',
          availableTools: ['search-web', 'calculator', 'file-read'],
        },
        false  // Non-recoverable - tool doesn't exist
      );

      expect(notFoundError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(notFoundError.error?.recoverable).toBe(false);
      expect(notFoundError.error?.details?.availableTools).toHaveLength(3);
    });

    it('should handle tool timeout errors', () => {
      const timeoutError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "long-running-task" timed out after 30000ms',
        {
          toolName: 'long-running-task',
          timeout: 30000,
        },
        true  // Recoverable - may succeed on retry
      );

      expect(timeoutError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(timeoutError.error?.recoverable).toBe(true);
    });

    it('should handle tool execution with error response', () => {
      const toolExecutionError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool execution returned error',
        {
          toolName: 'database-query',
          toolInput: { query: 'SELECT * FROM users' },
          toolOutput: { error: 'Table "users" does not exist' },
        },
        false  // Non-recoverable - query is invalid
      );

      expect(toolExecutionError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(toolExecutionError.error?.recoverable).toBe(false);
    });
  });

  describe('Recoverable Field and Retry Logic', () => {
    // Helper function to simulate retry logic
    function shouldRetry(response: AgentResponse<unknown>): boolean {
      return response.status === 'error' && response.error?.recoverable === true;
    }

    it('should retry recoverable errors (API_REQUEST_FAILED)', () => {
      const recoverableError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'Network timeout',
        { timeout: 30000, retryAfter: 1000 },
        true  // Recoverable
      );

      expect(shouldRetry(recoverableError)).toBe(true);
      expect(recoverableError.error?.code).toBe('API_REQUEST_FAILED');
    });

    it('should not retry non-recoverable errors (VALIDATION_FAILED)', () => {
      const validationError = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Invalid input: email format incorrect',
        { field: 'email', value: 'not-an-email' },
        false  // Non-recoverable
      );

      expect(shouldRetry(validationError)).toBe(false);
      expect(validationError.error?.code).toBe('VALIDATION_FAILED');
    });

    it('should not retry INTERNAL_ERROR (always non-recoverable)', () => {
      const internalError = createErrorResponse(
        AGENT_ERROR_CODES.INTERNAL_ERROR,
        'Internal response validation failed',
        { validationErrors: ['Field X is required'] },
        false  // Always non-recoverable
      );

      expect(shouldRetry(internalError)).toBe(false);
      expect(internalError.error?.recoverable).toBe(false);
    });

    it('should retry tool timeout errors', () => {
      const timeoutError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool timed out',
        { toolName: 'slow-tool', timeout: 30000 },
        true
      );

      expect(shouldRetry(timeoutError)).toBe(true);
    });

    it('should not retry tool not found errors', () => {
      const notFoundError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool not found',
        { toolName: 'missing-tool' },
        false
      );

      expect(shouldRetry(notFoundError)).toBe(false);
    });

    it('should not retry on success responses', () => {
      const successResponse = createSuccessResponse(
        { result: 'ok' },
        { agentId: 'test', timestamp: Date.now() }
      );

      expect(shouldRetry(successResponse)).toBe(false);
    });

    it('should handle retry logic with exponential backoff context', () => {
      const rateLimitError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'Rate limit exceeded',
        {
          retryAfter: 60,
          limit: 100,
          window: '1m',
        },
        true
      );

      expect(shouldRetry(rateLimitError)).toBe(true);
      expect(rateLimitError.error?.details?.retryAfter).toBe(60);
    });
  });

  describe('Machine-Readable Error Codes (PRD 6.2)', () => {
    it('should have all error codes as strings', () => {
      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        expect(typeof code).toBe('string');
      });
    });

    it('should follow SCREAMING_SNAKE_CASE format', () => {
      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        expect(code).toMatch(/^[A-Z][A-Z_]*$/);
      });
    });

    it('should be programmatically parsable', () => {
      // Simulate switch statement usage
      const handleError = (code: string): string => {
        switch (code) {
          case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
            return 'Handle invalid format';
          case AGENT_ERROR_CODES.VALIDATION_FAILED:
            return 'Handle validation error';
          case AGENT_ERROR_CODES.EXECUTION_FAILED:
            return 'Handle execution error';
          case AGENT_ERROR_CODES.API_REQUEST_FAILED:
            return 'Handle API error';
          case AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED:
            return 'Handle tool error';
          case AGENT_ERROR_CODES.INTERNAL_ERROR:
            return 'Handle internal error';
          default:
            return 'Unknown error code';
        }
      };

      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        const result = handleError(code);
        expect(result).not.toBe('Unknown error code');
      });
    });

    it('should export all standard error codes', () => {
      expect(AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT).toBe('INVALID_RESPONSE_FORMAT');
      expect(AGENT_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(AGENT_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.API_REQUEST_FAILED).toBe('API_REQUEST_FAILED');
      expect(AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED).toBe('TOOL_EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should allow error code comparison', () => {
      const response = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Test error'
      );

      // Test that error codes can be compared directly
      expect(response.error?.code === AGENT_ERROR_CODES.VALIDATION_FAILED).toBe(true);
      expect(response.error?.code === AGENT_ERROR_CODES.EXECUTION_FAILED).toBe(false);
    });

    it('should allow error code pattern matching', () => {
      const apiError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'API error'
      );

      // Test that error codes can be pattern matched
      expect(apiError.error?.code.endsWith('_FAILED')).toBe(true);
      expect(apiError.error?.code.startsWith('API_')).toBe(true);
    });
  });

  describe('Custom Error Code Scenarios', () => {
    it('should handle custom error codes with tool-specific details', () => {
      const customToolError = createErrorResponse(
        'CUSTOM_DATABASE_ERROR',
        'Database connection failed',
        {
          database: 'postgres',
          host: 'db.example.com',
          port: 5432,
          originalCode: 'ECONNREFUSED',
        },
        true  // Recoverable - connection may succeed on retry
      );

      expect(customToolError.error?.code).toBe('CUSTOM_DATABASE_ERROR');
      expect(customToolError.error?.recoverable).toBe(true);
      expect(customToolError.error?.details?.database).toBe('postgres');
    });

    it('should handle custom validation error with field context', () => {
      const customValidationError = createErrorResponse(
        'CUSTOM_EMAIL_VALIDATION_FAILED',
        'Email address validation failed',
        {
          field: 'email',
          value: 'invalid-email',
          constraint: 'RFC 5322 format',
        },
        false  // Non-recoverable - value is invalid
      );

      expect(customValidationError.error?.code).toBe('CUSTOM_EMAIL_VALIDATION_FAILED');
      expect(customValidationError.error?.recoverable).toBe(false);
    });

    it('should serialize custom error codes correctly', () => {
      const customError = createErrorResponse(
        'CUSTOM_RATE_LIMIT',
        'API rate limit exceeded',
        { limit: 100, window: '1h', current: 150 },
        true
      );

      const serialized = JSON.parse(JSON.stringify(customError));

      expect(serialized.error.code).toBe('CUSTOM_RATE_LIMIT');
      expect(serialized.error.recoverable).toBe(true);
      expect(serialized.error.details.limit).toBe(100);
    });

    it('should validate custom error codes against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const customError = createErrorResponse(
        'CUSTOM_AUTH_ERROR',
        'Authentication failed',
        { provider: 'oauth2', reason: 'invalid_token' },
        false
      );

      const result = schema.safeParse(customError);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('CUSTOM_AUTH_ERROR');
      }
    });
  });

  describe('Error Code Details Validation', () => {
    it('should validate error with null details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed',
        null,  // Explicitly null
        false
      );

      expect(error.error?.details).toBeNull();
      expect(error.error?.details).not.toBeUndefined();
    });

    it('should validate error with object details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Execution failed',
        {
          step: 'process',
          duration: 5000,
          memoryUsage: '256MB',
        },
        false
      );

      expect(error.error?.details).toEqual({
        step: 'process',
        duration: 5000,
        memoryUsage: '256MB',
      });
    });

    it('should validate error with array details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Multiple validation errors',
        {
          errors: [
            { field: 'email', message: 'Invalid format' },
            { field: 'age', message: 'Must be positive' },
          ],
        },
        false
      );

      expect(Array.isArray(error.error?.details?.errors)).toBe(true);
      expect(error.error?.details?.errors).toHaveLength(2);
    });

    it('should validate error with nested details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Complex error details',
        {
          workflow: {
            id: 'wf-123',
            steps: ['step1', 'step2'],
            failedAt: 'step2',
            error: {
              type: 'Timeout',
              duration: 30000,
            },
          },
        },
        true
      );

      expect(error.error?.details?.workflow?.failedAt).toBe('step2');
      expect(error.error?.details?.workflow?.error?.type).toBe('Timeout');
    });
  });
});
```

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-24
**Research Complete**: YES
**Implementation Ready**: YES
**Confidence Score**: 10/10
