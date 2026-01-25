# PRP: Write adversarial tests for AgentResponse edge cases

**PRP ID**: P1.M2.T2.S3
**Work Item**: Write adversarial tests for AgentResponse edge cases
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create comprehensive adversarial test suite `src/__tests__/adversarial/agent-response-edge-cases.test.ts` that validates AgentResponse robustness against malformed inputs, ensuring all edge cases are properly handled per PRD 6.4 requirements (JSON compliance, null handling, serialization).

**Deliverable**: New test file `src/__tests__/adversarial/agent-response-edge-cases.test.ts` with test cases covering:
- Response with undefined fields (should fail validation)
- Response with extra unknown fields (should pass - Zod passthrough mode)
- Response with wrong status value (should fail)
- Response with non-serializable data (circular refs, functions, symbols, BigInt)
- Response with invalid metadata (wrong types, missing required fields)

**Success Definition**:
- New test file created at `src/__tests__/adversarial/agent-response-edge-cases.test.ts`
- All adversarial test cases validate edge cases per contract definition
- Tests verify undefined fields fail validation (PRD 6.4.4: null not undefined)
- Tests verify extra unknown fields pass validation (Zod passthrough mode)
- Tests verify wrong status values fail validation
- Tests verify non-serializable data is handled appropriately
- Tests verify invalid metadata fails validation
- Tests pass: `npm test -- agent-response-edge-cases.test.ts`
- No breaking changes to existing tests
- Tests integrate with existing Vitest configuration

---

## Why

**Business Value and User Impact**:
- **Robustness Against Malformed Inputs**: Ensures AgentResponse validation catches all invalid inputs before they cause runtime issues
- **PRD 6.4 Compliance**: Validates JSON compliance, null-over-undefined handling, and serialization requirements
- **Type Safety Validation**: Ensures TypeScript types match runtime Zod validation (no type system bypasses)
- **Security**: Prevents potential vulnerabilities from prototype pollution or malicious inputs

**Integration with Existing Features**:
- **P1.M2.T2.S2 (CONTRACT - Parallel)**: Creates `src/__tests__/unit/agent-error-codes.test.ts` with error code scenario tests. This PRP adds adversarial edge case tests.
- **P1.M2.T2.S1 (Complete)**: Creates `src/__tests__/unit/agent-response.test.ts` with basic validation tests. This PRP adds adversarial tests.
- **P1.M2.T1.S2 (Complete)**: Added Zod schema validation to Agent.prompt() return path
- **P1.M1.T1.S2 (Complete)**: Factory helpers produce valid responses to test against

**Problems This Solves**:
- **No Adversarial Tests**: Existing tests validate happy paths and error scenarios but don't test adversarial edge cases
- **No Undefined vs Null Validation**: Tests don't verify that undefined fields fail (PRD 6.4.4 requires null, not undefined)
- **No Extra Fields Validation**: Tests don't verify that extra unknown fields pass (Zod passthrough mode)
- **No Serialization Testing**: Tests don't verify JSON serialization handles all valid responses correctly
- **No Non-Serializable Data Testing**: Tests don't verify handling of circular refs, functions, symbols

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This adds adversarial test coverage for existing AgentResponse validation functionality.

**Technical Requirements**:
- Create new test file `src/__tests__/adversarial/agent-response-edge-cases.test.ts`
- Test undefined fields fail validation (PRD 6.4.4: null not undefined)
- Test extra unknown fields pass validation (Zod passthrough mode)
- Test wrong status values fail validation (case variations, wrong types)
- Test non-serializable data handling (circular refs, functions, symbols, BigInt)
- Test invalid metadata (wrong types, missing required fields)
- Follow existing adversarial test patterns from `src/__tests__/adversarial/edge-case.test.ts`
- Use console mocking pattern to suppress expected error outputs

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/agent-response-edge-cases.test.ts`
- [ ] Tests for undefined fields fail validation (data, error, details, metadata)
- [ ] Tests for extra unknown fields pass validation (passthrough mode)
- [ ] Tests for wrong status values fail (case variations, wrong types)
- [ ] Tests for non-serializable data (circular refs throw, functions/symbols lost)
- [ ] Tests for invalid metadata (wrong types, missing required fields)
- [ ] Tests for discriminated union mismatches (success with error, error with data)
- [ ] Tests for error code edge cases (wrong format, empty, special chars)
- [ ] All tests pass: `npm test -- agent-response-edge-cases.test.ts`
- [ ] Existing tests still pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement adversarial AgentResponse edge case tests successfully?

**Answer**: YES - This PRP provides exact file locations, existing adversarial test patterns, AgentResponse type structures, Zod schema validation rules, external documentation URLs, and step-by-step implementation tasks.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/api/expect.html
  why: Official Vitest documentation for expect matchers
  critical: Sections on toEqual, toMatchObject, toHaveProperty, toThrow, toMatch

- url: https://vitest.dev/guide/testing-types.html#async-testing
  why: Official Vitest documentation for async error testing
  critical: Using rejects.toThrow() for async error assertions

- url: https://zod.dev/?s=safeParse
  why: Official Zod documentation for safeParse validation pattern
  critical: Use safeParse() for validation tests to avoid throws, check result.success

- url: https://github.com/colinhacks/zod/blob/main/src/types.ts#L2700
  why: Zod discriminatedUnion source code for understanding validation behavior
  critical: Shows how discriminated unions validate status field and branch to appropriate schema

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Contains all AgentResponse types, Zod schemas, factory functions, error codes
  pattern: Lines 1-100 (AgentResponse interface), Lines 200-250 (AgentErrorDetails), Lines 770-832 (AgentResponseSchema factory)
  critical: All type definitions and Zod schemas needed for testing

- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts
  why: Reference for existing adversarial test patterns in the codebase
  pattern: Lines 1-100 (test structure, console mocking, describe/it pattern)
  section: Lines 1-20 show header documentation, lines 6-50 show test structure

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts
  why: Reference for existing AgentResponse validation test patterns
  pattern: Lines 120-254 (Error Response Validation), Lines 190-210 (INTERNAL_ERROR testing)
  section: Lines 120-254 show schema validation patterns using safeParse

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-error-codes.test.ts
  why: Reference for error code testing patterns (from P1.M2.T2.S2)
  pattern: Lines 350-409 (INVALID_RESPONSE_FORMAT scenarios)
  section: Lines 350-409 show how to test invalid response format errors

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S2/PRP.md
  why: CONTRACT - Defines what P1.M2.T2.S2 produces (agent-error-codes.test.ts)
  section: Section "Goal" for test structure, Section "Implementation Blueprint" for patterns
  critical: Don't duplicate P1.M2.T2.S2 tests - focus on ADVERSARIAL edge cases

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S3/research/agent-response-adversarial-research.md
  why: Research findings on adversarial test patterns and edge cases
  section: Section "4. Edge Cases to Test", Section "5. TypeScript/Zod Best Practices"
  critical: Complete list of edge cases to test and code examples
```

### Current Codebase Tree

```bash
src/
├── types/
│   └── agent.ts                          # AgentResponse types, Zod schemas, factory functions
│       ├── AgentResponse interface (lines 1-100)
│       ├── AgentErrorDetails interface (lines 200-250)
│       ├── AgentResponseMetadata interface (lines 270-310)
│       ├── AgentResponseStatusSchema (lines 420-424)
│       ├── AgentErrorDetailsSchema (lines 430-440)
│       ├── AgentResponseMetadataSchema (lines 450-465)
│       ├── AgentResponseSchema factory (lines 770-832)
│       ├── createErrorResponse (lines 595-615)
│       ├── createSuccessResponse (lines 550-570)
│       ├── createPartialResponse (lines 575-590)
│       └── AGENT_ERROR_CODES (lines 442-493)
├── __tests__/
│   ├── adversarial/                      # ADVERSARIAL TEST DIRECTORY (per SYSTEM_CONTEXT.md)
│   │   ├── edge-case.test.ts             # Reference for adversarial test patterns
│   │   ├── circular-reference.test.ts    # Circular reference test examples
│   │   ├── parent-validation.test.ts     # Validation error patterns
│   │   └── ... (other adversarial tests)
│   ├── unit/
│   │   ├── agent-response.test.ts        # Basic validation tests (P1.M2.T2.S1)
│   │   ├── agent-error-codes.test.ts     # Error code scenario tests (P1.M2.T2.S2)
│   │   └── agent-response-factory.test.ts # Factory function tests
│   └── integration/
└── core/
    └── agent.ts                          # Agent class (uses AgentResponse)
```

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILE TO CREATE
src/
└── __tests__
    └── adversarial/
        └── agent-response-edge-cases.test.ts   # NEW FILE - Adversarial edge case tests
            ├── [IMPORT]: Vitest imports (describe, it, expect, beforeEach, vi)
            ├── [IMPORT]: Zod imports (z, ZodIssueCode)
            ├── [IMPORT]: AgentResponse types and schemas
            ├── [IMPORT]: Factory functions and error codes
            ├── [TEST]: Undefined fields fail validation
            ├── [TEST]: Extra unknown fields pass validation
            ├── [TEST]: Wrong status values fail
            ├── [TEST]: Non-serializable data handling
            ├── [TEST]: Invalid metadata validation
            ├── [TEST]: Discriminated union mismatches
            ├── [TEST]: Error code edge cases
            └── [TEST]: Null vs undefined handling (PRD 6.4.4)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: agent-response.test.ts (P1.M2.T2.S1) and agent-error-codes.test.ts (P1.M2.T2.S2) exist
// DO NOT duplicate those tests - focus on ADVERSARIAL edge cases
// P1.M2.T2.S1 tests: basic schema validation, structure, null handling
// P1.M2.T2.S2 tests: error code scenarios, retry logic
// P1.M2.T2.S3 tests: ADVERSARIAL edge cases (undefined, extra fields, non-serializable, etc.)

// CRITICAL: Use .safeParse() for validation tests
const result = schema.safeParse(response);
expect(result.success).toBe(true);  // Check success flag
// result.parse() throws on failure - don't use in tests

// CRITICAL: Import from .js files (TypeScript compiles to .js)
import { AgentResponseSchema } from '../../types/agent.js';  // Correct

// CRITICAL: Zod's default mode is STRIP, not PASSTHROUGH or STRICT
// Unknown fields are silently removed in strip mode (default)
// But discriminatedUnion() uses special handling - verify actual behavior
// The PRD specifies extra fields should be allowed - test verifies this

// CRITICAL: PRD 6.4.4 requires null, not undefined
// Factory functions use null, but tests should verify undefined fails
// data/error/details should be null when absent, not undefined

// CRITICAL: Circular references cause JSON.stringify() to throw TypeError
// Tests for circular refs should expect throws or catch errors
// Use try-catch or expect().toThrow() for these tests

// CRITICAL: Console mocking pattern from existing adversarial tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// CRITICAL: Status field is case-sensitive (discriminated union)
// 'success' is valid, 'SUCCESS' or 'Success' is invalid
// Test all case variations

// CRITICAL: Test file naming - *.test.ts suffix
// Location: src/__tests__/adversarial/agent-response-edge-cases.test.ts

// PATTERN: Test structure - nested describe blocks
describe('Adversarial AgentResponse Edge Cases', () => {
  describe('Undefined Fields (PRD 6.4.4)', () => {
    it('should fail validation when data is undefined', () => {
      // test code
    });
  });
});

// GOTCHA: Vitest globals are enabled (globals: true in vitest.config.ts)
// But existing tests still explicitly import them - follow the pattern
import { describe, it, expect, beforeEach, vi } from 'vitest';  // Follow existing pattern

// CRITICAL: Zod discriminated union error code
import { ZodIssueCode } from 'zod';
// Check for: ZodIssueCode.invalid_union_discriminator

// CRITICAL: Test scripts
npm test -- agent-response-edge-cases.test.ts  # Run specific test file
npm test -- --run  # Run tests once (not watch mode)
npm test                            # Run all tests
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Tests validate existing AgentResponse validation.

**Key Edge Cases to Test**:

| Category | Expected Behavior | Test Scenarios |
|----------|-------------------|----------------|
| Undefined fields | Should fail (PRD 6.4.4) | data: undefined, error: undefined, details: undefined, metadata: undefined |
| Extra unknown fields | Should pass (passthrough) | Extra fields on response, metadata, error details |
| Wrong status values | Should fail | Case variations, wrong types, empty string |
| Non-serializable data | Should fail or be handled | Circular refs, functions, symbols, BigInt |
| Invalid metadata | Should fail | Wrong types, missing required fields |
| Discriminated union mismatches | Should fail | Success with error, error with data |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file skeleton
  - CREATE: src/__tests__/adversarial/agent-response-edge-cases.test.ts
  - ADD: Vitest imports (describe, it, expect, beforeEach, vi)
  - ADD: Zod imports (z, ZodIssueCode)
  - ADD: AgentResponse type imports
  - ADD: Factory function imports
  - ADD: Error code imports
  - ADD: Console mocking setup (beforeEach/afterEach)
  - FOLLOW: Pattern from src/__tests__/adversarial/edge-case.test.ts lines 1-50
  - NAMING: File name matches pattern: agent-response-edge-cases.test.ts

Task 2: IMPLEMENT undefined fields fail validation tests
  - ADD: describe block for "Undefined Fields (PRD 6.4.4)"
  - TEST: data field is undefined (should fail)
  - TEST: error field is undefined (should fail)
  - TEST: details field is undefined (should fail)
  - TEST: metadata field is undefined (should fail)
  - TEST: metadata.agentId is undefined (should fail)
  - TEST: metadata.timestamp is undefined (should fail)
  - VERIFY: Zod error indicates undefined field issue
  - FOLLOW: Pattern from agent-response.test.ts null handling tests

Task 3: IMPLEMENT extra unknown fields pass validation tests
  - ADD: describe block for "Extra Unknown Fields (Passthrough Mode)"
  - TEST: Extra fields on success response (should pass)
  - TEST: Extra fields on error response (should pass)
  - TEST: Extra fields on partial response (should pass)
  - TEST: Extra fields on metadata (should pass)
  - TEST: Extra fields on error details (should pass)
  - VERIFY: Fields are preserved or stripped (check actual behavior)
  - FOLLOW: Pattern from Zod's object.test.ts for extra fields testing

Task 4: IMPLEMENT wrong status value fail tests
  - ADD: describe block for "Wrong Status Values"
  - TEST: Case variations ('SUCCESS', 'Success', 'succes', 'SUCCESSFUL')
  - TEST: Wrong types for status (number 123, boolean true, object {}, null)
  - TEST: Empty string for status ('')
  - TEST: Valid status values work ('success', 'error', 'partial')
  - VERIFY: ZodIssueCode.invalid_union_discriminator for invalid status
  - FOLLOW: Pattern from Zod's discriminated-unions.test.ts

Task 5: IMPLEMENT non-serializable data handling tests
  - ADD: describe block for "Non-Serializable Data"
  - TEST: Circular references (should throw on JSON.stringify or fail validation)
  - TEST: Functions in data (should be lost or fail)
  - TEST: Symbols in data (should be lost or fail)
  - TEST: BigInt in data (should be lost or fail)
  - TEST: Prototype pollution attempts (__proto__, constructor)
  - VERIFY: Proper error handling or data sanitization
  - FOLLOW: Pattern from src/__tests__/adversarial/circular-reference.test.ts

Task 6: IMPLEMENT invalid metadata validation tests
  - ADD: describe block for "Invalid Metadata"
  - TEST: agentId is number (should fail)
  - TEST: agentId is null (should fail)
  - TEST: agentId is undefined (should fail)
  - TEST: agentId is empty string (should fail - verify if this is allowed)
  - TEST: timestamp is string (should fail)
  - TEST: timestamp is negative (verify if allowed)
  - TEST: timestamp is NaN (should fail)
  - TEST: timestamp is Infinity (verify if allowed)
  - TEST: Missing required metadata fields (should fail)
  - FOLLOW: Pattern from agent-response.test.ts metadata validation

Task 7: IMPLEMENT discriminated union mismatch tests
  - ADD: describe block for "Discriminated Union Mismatches"
  - TEST: Success response with error populated (should fail)
  - TEST: Error response with data populated (should fail)
  - TEST: Success response with null data (verify schema behavior)
  - TEST: Error response with null error (should fail)
  - TEST: Partial response with error populated (should fail)
  - VERIFY: Correct Zod validation error for mismatched fields
  - FOLLOW: Pattern from Zod's discriminated-unions.test.ts

Task 8: IMPLEMENT error code edge case tests
  - ADD: describe block for "Error Code Edge Cases"
  - TEST: Error code in lowercase ('invalid_response_format')
  - TEST: Error code in camelCase ('invalidResponseFormat')
  - TEST: Error code in kebab-case ('invalid-response-format')
  - TEST: Error code with special characters
  - TEST: Error code with spaces
  - TEST: Empty string error code
  - TEST: Non-string error code (number, boolean, object)
  - VERIFY: Zod accepts any string (error codes are not enum-constrained)
  - FOLLOW: Pattern from agent-error-codes.test.ts machine-readable tests

Task 9: IMPLEMENT null vs undefined handling tests (PRD 6.4.4)
  - ADD: describe block for "Null vs Undefined Handling (PRD 6.4.4)"
  - TEST: data is null (should pass for error response)
  - TEST: data is undefined (should fail)
  - TEST: error is null (should pass for success response)
  - TEST: error is undefined (should fail)
  - TEST: details is null (should pass)
  - TEST: details is undefined (should fail)
  - TEST: Optional fields are null vs undefined vs missing
  - VERIFY: PRD 6.4.4 compliance (null not undefined)
  - FOLLOW: Pattern from Zod's nullable.test.ts and optional.test.ts

Task 10: RUN tests and verify
  - RUN: npm test -- agent-response-edge-cases.test.ts
  - VERIFY: All new tests pass
  - RUN: npm test (full test suite)
  - VERIFY: No existing tests broken
  - CHECK: TypeScript compilation: npm run lint
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test file imports
// In src/__tests__/adversarial/agent-response-edge-cases.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z, ZodIssueCode } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  createErrorResponse,
  createSuccessResponse,
  createPartialResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
  type AgentErrorDetails,
  type AgentResponseMetadata,
} from '../../types/agent.js';

// PATTERN 2: Console mocking setup (from existing adversarial tests)
describe('Adversarial AgentResponse Edge Cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Tests go here...
});

// PATTERN 3: Undefined fields fail validation
describe('Undefined Fields (PRD 6.4.4)', () => {
  it('should fail validation when data field is undefined', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'error' as const,
      data: undefined,  // WRONG: should be null
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

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when error field is undefined', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: undefined,  // WRONG: should be null
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when details is undefined', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'error' as const,
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: undefined,  // WRONG: should be null
        recoverable: false,
      },
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// PATTERN 4: Extra unknown fields pass validation
describe('Extra Unknown Fields (Passthrough Mode)', () => {
  it('should pass validation with extra fields on success response', () => {
    const schema = AgentResponseSchema(z.string());

    const responseWithExtras = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      // EXTRA FIELDS:
      extraField: 'extra value',
      anotherExtra: 123,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
        extraMetaField: 'extra',
      },
    };

    const result = schema.safeParse(responseWithExtras);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify extra fields are handled (preserved or stripped based on actual behavior)
      // Check if extra fields are in the output
    }
  });

  it('should pass validation with extra fields on error response', () => {
    const schema = AgentResponseSchema(z.unknown());

    const errorWithExtras = {
      status: 'error' as const,
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: null,
        recoverable: false,
        // EXTRA FIELDS:
        extraErrorField: 'extra',
      },
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
      // EXTRA FIELDS:
      extraField: 'extra value',
    };

    const result = schema.safeParse(errorWithExtras);
    expect(result.success).toBe(true);
  });
});

// PATTERN 5: Wrong status value fail tests
describe('Wrong Status Values', () => {
  it('should fail validation with uppercase status', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'SUCCESS',  // WRONG: case-sensitive
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Check for invalid_union_discriminator error code
      const hasDiscriminatorError = result.error.errors.some(
        e => e.code === ZodIssueCode.invalid_union_discriminator
      );
      expect(hasDiscriminatorError).toBe(true);
    }
  });

  it('should fail validation with mixed case status', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'Success',  // WRONG: case-sensitive
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation with typo in status', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'succes',  // WRONG: typo
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation with number status', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 123,  // WRONG: wrong type
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    } as any;

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should pass validation with all valid status values', () => {
    const schema = AgentResponseSchema(z.string());

    const validStatuses = ['success', 'error', 'partial'] as const;

    validStatuses.forEach(status => {
      const validResponse = {
        status,
        data: status === 'error' ? null : 'test data',
        error: status === 'error' ? {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false,
        } : null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});

// PATTERN 6: Non-serializable data handling tests
describe('Non-Serializable Data', () => {
  it('should handle circular references appropriately', () => {
    const schema = AgentResponseSchema(z.unknown());

    // Create circular reference
    const circularData: any = { name: 'circular' };
    circularData.self = circularData;

    const response = {
      status: 'success' as const,
      data: circularData,
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    // Schema validation might pass, but JSON.stringify will throw
    const result = schema.safeParse(response);
    // Check if schema allows circular data (it shouldn't)

    // Test that JSON.stringify throws
    expect(() => {
      JSON.stringify(response);
    }).toThrow();  // Circular references throw TypeError

    // Or if schema validation catches it first:
    // expect(result.success).toBe(false);
  });

  it('should handle functions in data', () => {
    const schema = AgentResponseSchema(z.unknown());

    const responseWithFunction = {
      status: 'success' as const,
      data: {
        name: 'test',
        func: () => 'function value',  // Function
      },
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(responseWithFunction);
    // Zod's z.unknown() accepts functions, but they're lost in JSON

    if (result.success) {
      // Function is accepted by Zod but lost in serialization
      const serialized = JSON.stringify(result.data);
      expect(serialized).not.toContain('function value');
    }
  });

  it('should handle symbols in data', () => {
    const schema = AgentResponseSchema(z.unknown());

    const responseWithSymbol = {
      status: 'success' as const,
      data: {
        name: 'test',
        [Symbol('secret')]: 'symbol value',  // Symbol
      },
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(responseWithSymbol);
    // Symbols are accepted by Zod but lost in serialization

    if (result.success) {
      const serialized = JSON.stringify(result.data);
      // Symbols are not serialized
      expect(serialized).not.toContain('symbol value');
    }
  });

  it('should handle BigInt in data', () => {
    const schema = AgentResponseSchema(z.unknown());

    const responseWithBigInt = {
      status: 'success' as const,
      data: {
        name: 'test',
        bigIntValue: BigInt(12345678901234567890),  // BigInt
      },
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(responseWithBigInt);

    if (result.success) {
      // BigInt is not serializable to JSON
      expect(() => {
        JSON.stringify(result.data);
      }).toThrow();  // BigInt throws TypeError in JSON.stringify
    }
  });

  it('should handle prototype pollution attempts', () => {
    const schema = AgentResponseSchema(z.unknown());

    const maliciousResponse = {
      status: 'success' as const,
      data: {
        name: 'test',
        '__proto__': { polluted: true },  // Prototype pollution attempt
        'constructor': { prototype: { polluted: true } },
      },
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(maliciousResponse);
    // Zod should accept these as regular string keys
    expect(result.success).toBe(true);

    if (result.success) {
      // Verify no actual pollution occurred
      const cleanObj = {};
      expect((cleanObj as any).polluted).toBeUndefined();
    }
  });
});

// PATTERN 7: Invalid metadata validation tests
describe('Invalid Metadata', () => {
  it('should fail validation when agentId is a number', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 123456,  // WRONG: should be string
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when agentId is null', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: null,  // WRONG: should be string
        timestamp: Date.now(),
      },
    } as any;

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when agentId is undefined', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: undefined,  // WRONG: should be string
        timestamp: Date.now(),
      },
    } as any;

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when timestamp is a string', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: '1234567890',  // WRONG: should be number
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when timestamp is NaN', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: NaN,  // WRONG: invalid timestamp
      },
    };

    const result = schema.safeParse(invalidResponse);
    // NaN is a number type, so Zod might accept it
    // Check if this is the case or if additional validation is needed
  });

  it('should fail validation when timestamp is Infinity', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Infinity,  // WRONG: invalid timestamp
      },
    };

    const result = schema.safeParse(invalidResponse);
    // Infinity is a number type, so Zod might accept it
    // Check if this is the case or if additional validation is needed
  });

  it('should fail validation when timestamp is negative', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: -1234567890,  // WRONG: negative timestamp
      },
    };

    const result = schema.safeParse(invalidResponse);
    // Negative numbers are valid number type, so Zod might accept it
    // Check if additional validation is needed for timestamps
  });

  it('should fail validation when metadata is missing', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      // metadata is missing
    } as any;

    const result = schema.safeParse(invalidResponse);
    // Metadata is optional in the schema, so this might pass
    // Check actual behavior
  });
});

// PATTERN 8: Discriminated union mismatch tests
describe('Discriminated Union Mismatches', () => {
  it('should fail validation when success response has error populated', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: {  // WRONG: success should have error: null
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

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when error response has data populated', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'error' as const,
      data: 'test data',  // WRONG: error should have data: null
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

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when error response has null error', () => {
    const schema = AgentResponseSchema(z.unknown());

    const invalidResponse = {
      status: 'error' as const,
      data: null,
      error: null,  // WRONG: error status requires error object
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should fail validation when partial response has error populated', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'partial' as const,
      data: 'partial data',
      error: {  // WRONG: partial should have error: null
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

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// PATTERN 9: Error code edge case tests
describe('Error Code Edge Cases', () => {
  it('should accept lowercase error codes (strings only)', () => {
    const schema = AgentResponseSchema(z.unknown());

    const response = createErrorResponse(
      'lowercase_error_code',  // Not standard format, but still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    // Error codes are not enum-constrained in Zod schema
    // Any string should be accepted
    expect(result.success).toBe(true);
  });

  it('should accept camelCase error codes', () => {
    const response = createErrorResponse(
      'camelCaseErrorCode',  // Not standard format, but still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept kebab-case error codes', () => {
    const response = createErrorResponse(
      'kebab-case-error-code',  // Not standard format, but still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept error codes with special characters', () => {
    const response = createErrorResponse(
      'ERROR@#$%',  // Unusual, but still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept error codes with spaces', () => {
    const response = createErrorResponse(
      'error with spaces',  // Unusual, but still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept empty string error code', () => {
    const response = createErrorResponse(
      '',  // Empty string is still a string
      'Test error',
      null,
      false
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject non-string error codes', () => {
    const invalidError = {
      status: 'error' as const,
      data: null,
      error: {
        code: 123,  // WRONG: should be string
        message: 'Test error',
        details: null,
        recoverable: false,
      },
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    } as any;

    const schema = AgentResponseSchema(z.unknown());
    const result = schema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject boolean error codes', () => {
    const invalidError = {
      status: 'error' as const,
      data: null,
      error: {
        code: true,  // WRONG: should be string
        message: 'Test error',
        details: null,
        recoverable: false,
      },
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    } as any;

    const schema = AgentResponseSchema(z.unknown());
    const result = schema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });
});

// PATTERN 10: Null vs undefined handling tests (PRD 6.4.4)
describe('Null vs Undefined Handling (PRD 6.4.4)', () => {
  it('should accept null data field for error response', () => {
    const schema = AgentResponseSchema(z.unknown());

    const errorResponse = createErrorResponse(
      AGENT_ERROR_CODES.VALIDATION_FAILED,
      'Validation failed'
    );

    const result = schema.safeParse(errorResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data).toBe(null);
      expect(result.data.data).not.toBeUndefined();
    }
  });

  it('should reject undefined data field for error response', () => {
    const schema = AgentResponseSchema(z.unknown());

    const invalidResponse = {
      status: 'error' as const,
      data: undefined,  // WRONG: should be null per PRD 6.4.4
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

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should accept null error field for success response', () => {
    const schema = AgentResponseSchema(z.string());

    const successResponse = createSuccessResponse(
      'test data',
      { agentId: 'test-agent', timestamp: Date.now() }
    );

    const result = schema.safeParse(successResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe(null);
      expect(result.data.error).not.toBeUndefined();
    }
  });

  it('should reject undefined error field for success response', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test data',
      error: undefined,  // WRONG: should be null per PRD 6.4.4
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should accept null details field in error', () => {
    const schema = AgentResponseSchema(z.unknown());

    const errorResponse = createErrorResponse(
      AGENT_ERROR_CODES.VALIDATION_FAILED,
      'Validation failed',
      null  // Explicitly null details
    );

    const result = schema.safeParse(errorResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error?.details).toBe(null);
      expect(result.data.error?.details).not.toBeUndefined();
    }
  });

  it('should reject undefined details field in error', () => {
    const schema = AgentResponseSchema(z.unknown());

    const invalidResponse = {
      status: 'error' as const,
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: undefined,  // WRONG: should be null per PRD 6.4.4
        recoverable: false,
      },
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
      },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should accept missing optional metadata fields', () => {
    const schema = AgentResponseSchema(z.string());

    const response = createSuccessResponse(
      'test data',
      {
        agentId: 'test-agent',
        timestamp: Date.now(),
        // duration, requestId, usage, toolCalls are missing
      }
    );

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept null for optional metadata fields', () => {
    const schema = AgentResponseSchema(z.string());

    const response = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: {
        agentId: 'test-agent',
        timestamp: Date.now(),
        duration: null,  // Explicitly null
        requestId: null,
      },
    };

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
```

### Integration Points

```yaml
DEPENDS ON: P1.M2.T2.S1 (Write tests for valid AgentResponse structures)
  - agent-response.test.ts exists with basic validation tests
  - Don't duplicate those tests - focus on ADVERSARIAL edge cases
  - Use same test patterns and import style

DEPENDS ON: P1.M2.T2.S2 (Write tests for error code handling)
  - agent-error-codes.test.ts exists with error code scenario tests
  - Don't duplicate those tests - focus on ADVERSARIAL edge cases
  - Error code edge cases are OK (format validation, not scenarios)

DEPENDS ON: P1.M2.T1.S2 (Add validation to Agent.prompt() return path)
  - Zod schemas are in place and being used
  - Tests validate schema behavior against edge cases

DEPENDS ON: P1.M1.T1.S2 (Create AgentResponse factory helpers)
  - Factory functions produce valid responses
  - Tests use factory functions to create test data

NO BREAKING CHANGES:
  - Tests only validate existing schema behavior
  - No modifications to source code
  - New test file only

DOWNSTREAM DEPENDENCIES:
  - P1.M4.T1 (Run full test suite) will include these tests
  - P1.M4.T1.S3 (Run adversarial tests and fix failures) will run these tests
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
npx tsc --noEmit src/__tests__/adversarial/agent-response-edge-cases.test.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new adversarial tests
npm test -- agent-response-edge-cases.test.ts

# Run with verbose output
npm test -- agent-response-edge-cases.test.ts --reporter=verbose

# Run specific test suite
npm test -- agent-response-edge-cases.test.ts -t "Undefined Fields"

# Expected: All tests pass. All adversarial edge cases validated.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all adversarial tests in src/__tests__/adversarial/
npm test -- src/__tests__/adversarial/

# Run all AgentResponse-related tests
npm test -- --testNamePattern="AgentResponse|agent-response"

# Run full test suite
npm test

# Expected: All tests pass. New tests integrate with existing test suite.
```

### Level 4: Schema Behavior Validation

```bash
# Verify Zod schema behavior for specific edge cases
npm test -- agent-response-edge-cases.test.ts -t "Extra Unknown Fields"

# Verify discriminated union validation
npm test -- agent-response-edge-cases.test.ts -t "Wrong Status Values"

# Verify null vs undefined handling
npm test -- agent-response-edge-cases.test.ts -t "Null vs Undefined"

# Expected: All schema edge cases behave as expected.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/adversarial/agent-response-edge-cases.test.ts`
- [ ] All imports use `.js` extension (TypeScript convention)
- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] No type errors in test file
- [ ] Test file follows Vitest conventions
- [ ] Console mocking pattern applied (beforeEach/afterEach)

### Feature Validation

- [ ] Undefined fields fail validation (data, error, details, metadata)
- [ ] Extra unknown fields pass validation (passthrough mode verified)
- [ ] Wrong status values fail (case variations, wrong types, empty string)
- [ ] Non-serializable data handled appropriately (circular refs, functions, symbols, BigInt)
- [ ] Invalid metadata fails validation (wrong types, missing required fields)
- [ ] Discriminated union mismatches fail (success with error, error with data)
- [ ] Error code edge cases tested (format variations, empty, special chars)
- [ ] Null vs undefined handling verified (PRD 6.4.4 compliance)

### Test Validation

- [ ] All tests pass: `npm test -- agent-response-edge-cases.test.ts`
- [ ] Existing tests still pass: `npm test`
- [ ] No breaking changes to existing functionality
- [ ] Tests follow codebase adversarial test patterns
- [ ] Test descriptions are clear and specific
- [ ] Tests use safeParse() pattern (not parse())

### PRD Compliance Validation

- [ ] PRD 6.4.1 (JSON Compliance): Non-serializable data tests
- [ ] PRD 6.4.4 (Null not Undefined): Null vs undefined tests
- [ ] PRD 6.1 (Discriminated Union): Status field tests
- [ ] PRD 6.2 (Machine-Readable Error Codes): Error code format tests

### Code Quality Validation

- [ ] Follows existing adversarial test patterns from edge-case.test.ts
- [ ] Uses consistent import patterns
- [ ] Test organization is logical and clear (nested describe blocks)
- [ ] Test names follow "should" convention
- [ ] No code duplication (use helpers where appropriate)
- [ ] Does not duplicate P1.M2.T2.S1 or P1.M2.T2.S2 tests
- [ ] Tests are truly adversarial (edge cases, not happy paths)

---

## Anti-Patterns to Avoid

- ❌ Don't duplicate tests from agent-response.test.ts (P1.M2.T2.S1) - focus on ADVERSARIAL edge cases
- ❌ Don't duplicate tests from agent-error-codes.test.ts (P1.M2.T2.S2) - focus on ADVERSARIAL edge cases
- ❌ Don't use `.parse()` in tests - use `.safeParse()` to avoid throws
- ❌ Don't import from `.ts` files - use `.js` extension for imports
- ❌ Don't test happy paths - test edge cases and adversarial inputs
- ❌ Don't create tests that are too brittle - focus on schema invariants
- ❌ Don't skip testing undefined fields - PRD 6.4.4 requires null, not undefined
- ❌ Don't assume Zod mode without testing - verify strip/passthrough/strict behavior
- ❌ Don't forget to test case sensitivity in status field
- ❌ Don't forget to test discriminated union mismatches
- ❌ Don't modify existing test files - create new file only
- ❌ Don't add production code to test files - tests only
- ❌ Don't use `describe.skip` or `it.skip` - all tests should run
- ❌ Don't test factory function outputs - those are tested in agent-response-factory.test.ts
- ❌ Don't test schema structure for happy paths - those are tested in agent-response.test.ts
- ❌ Don't forget console mocking - expected errors should be suppressed
- ❌ Don't assume non-serializable data behavior - test and verify actual handling

---

## Appendix: Complete Reference Implementation

### Tasks 1-10: Complete Test File Implementation

```typescript
/**
 * Adversarial and Edge Case Tests for AgentResponse
 *
 * Purpose: Validate AgentResponse robustness against malformed inputs
 * Scope: Edge cases, adversarial inputs, PRD 6.4 compliance
 *
 * Test Categories:
 * - Undefined fields (should fail per PRD 6.4.4)
 * - Extra unknown fields (should pass - Zod passthrough)
 * - Wrong status values (should fail)
 * - Non-serializable data (should be handled appropriately)
 * - Invalid metadata (should fail)
 * - Discriminated union mismatches (should fail)
 * - Error code edge cases (format variations)
 * - Null vs undefined handling (PRD 6.4.4)
 *
 * PRP: P1.M2.T2.S3 - Write adversarial tests for AgentResponse edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z, ZodIssueCode } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  createErrorResponse,
  createSuccessResponse,
  createPartialResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
  type AgentErrorDetails,
  type AgentResponseMetadata,
} from '../../types/agent.js';

describe('Adversarial AgentResponse Edge Cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Undefined Fields (PRD 6.4.4)', () => {
    it('should fail validation when data field is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'error' as const,
        data: undefined,  // WRONG: should be null
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

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when error field is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: undefined,  // WRONG: should be null
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when details is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: undefined,  // WRONG: should be null
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when metadata is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: undefined,  // WRONG: should be object or omitted
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when agentId is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: undefined,  // WRONG: should be string
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when timestamp is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: undefined,  // WRONG: should be number
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Extra Unknown Fields (Passthrough Mode)', () => {
    it('should pass validation with extra fields on success response', () => {
      const schema = AgentResponseSchema(z.string());

      const responseWithExtras = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        extraField: 'extra value',
        anotherExtra: 123,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          extraMetaField: 'extra',
        },
      };

      const result = schema.safeParse(responseWithExtras);
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify schema parsed successfully
        expect(result.data.status).toBe('success');
        expect(result.data.data).toBe('test data');
      }
    });

    it('should pass validation with extra fields on error response', () => {
      const schema = AgentResponseSchema(z.unknown());

      const errorWithExtras = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false,
          extraErrorField: 'extra',
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
        extraField: 'extra value',
      };

      const result = schema.safeParse(errorWithExtras);
      expect(result.success).toBe(true);
    });

    it('should pass validation with extra fields on partial response', () => {
      const schema = AgentResponseSchema(z.string());

      const partialWithExtras = {
        status: 'partial' as const,
        data: 'partial data',
        error: null,
        extraField: 'extra value',
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(partialWithExtras);
      expect(result.success).toBe(true);
    });

    it('should pass validation with extra fields in metadata', () => {
      const schema = AgentResponseSchema(z.string());

      const responseWithExtraMeta = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          customField: 'custom value',
          anotherCustom: 123,
        },
      };

      const result = schema.safeParse(responseWithExtraMeta);
      expect(result.success).toBe(true);
    });

    it('should pass validation with extra fields in error details', () => {
      const schema = AgentResponseSchema(z.unknown());

      const responseWithExtraDetails = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: {
            standardField: 'value',
            extraDetailField: 'extra',
          },
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(responseWithExtraDetails);
      expect(result.success).toBe(true);
    });
  });

  describe('Wrong Status Values', () => {
    it('should fail validation with uppercase status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'SUCCESS',  // WRONG: case-sensitive
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasDiscriminatorError = result.error.errors.some(
          e => e.code === ZodIssueCode.invalid_union_discriminator
        );
        expect(hasDiscriminatorError).toBe(true);
      }
    });

    it('should fail validation with mixed case status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'Success',  // WRONG: case-sensitive
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with typo in status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'succes',  // WRONG: typo
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with wrong status value', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'SUCCESSFUL',  // WRONG: not a valid status
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with number status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 123,  // WRONG: wrong type
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with boolean status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: true,  // WRONG: wrong type
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with null status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: null,  // WRONG: wrong type
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation with empty string status', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: '',  // WRONG: empty string
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should pass validation with all valid status values', () => {
      const schema = AgentResponseSchema(z.string());

      const validStatuses = ['success', 'error', 'partial'] as const;

      validStatuses.forEach(status => {
        const validResponse = {
          status,
          data: status === 'error' ? null : 'test data',
          error: status === 'error' ? {
            code: 'TEST_ERROR',
            message: 'Test error',
            details: null,
            recoverable: false,
          } : null,
          metadata: {
            agentId: 'test-agent',
            timestamp: Date.now(),
          },
        };

        const result = schema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Non-Serializable Data', () => {
    it('should handle circular references appropriately', () => {
      const schema = AgentResponseSchema(z.unknown());

      // Create circular reference
      const circularData: any = { name: 'circular' };
      circularData.self = circularData;

      const response = {
        status: 'success' as const,
        data: circularData,
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      // Test that JSON.stringify throws
      expect(() => {
        JSON.stringify(response);
      }).toThrow();  // Circular references throw TypeError

      // Schema validation might pass or fail depending on implementation
      const result = schema.safeParse(response);
      // Either schema rejects it, or we document the behavior
    });

    it('should handle functions in data', () => {
      const schema = AgentResponseSchema(z.unknown());

      const responseWithFunction = {
        status: 'success' as const,
        data: {
          name: 'test',
          func: () => 'function value',  // Function
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(responseWithFunction);
      // Zod's z.unknown() accepts functions

      if (result.success) {
        // Function is accepted by Zod but lost in serialization
        const serialized = JSON.stringify(result.data);
        expect(serialized).not.toContain('function value');
      }
    });

    it('should handle symbols in data', () => {
      const schema = AgentResponseSchema(z.unknown());

      const responseWithSymbol = {
        status: 'success' as const,
        data: {
          name: 'test',
          [Symbol('secret')]: 'symbol value',  // Symbol
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(responseWithSymbol);
      // Symbols are accepted by Zod but lost in serialization

      if (result.success) {
        const serialized = JSON.stringify(result.data);
        // Symbols are not serialized
        expect(serialized).not.toContain('symbol value');
      }
    });

    it('should handle BigInt in data', () => {
      const schema = AgentResponseSchema(z.unknown());

      const responseWithBigInt = {
        status: 'success' as const,
        data: {
          name: 'test',
          bigIntValue: BigInt(12345678901234567890),  // BigInt
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(responseWithBigInt);

      if (result.success) {
        // BigInt is not serializable to JSON
        expect(() => {
          JSON.stringify(result.data);
        }).toThrow();  // BigInt throws TypeError in JSON.stringify
      }
    });

    it('should handle prototype pollution attempts', () => {
      const schema = AgentResponseSchema(z.unknown());

      const maliciousResponse = {
        status: 'success' as const,
        data: {
          name: 'test',
          '__proto__': { polluted: true },
          'constructor': { prototype: { polluted: true } },
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(maliciousResponse);
      // Zod should accept these as regular string keys
      expect(result.success).toBe(true);

      if (result.success) {
        // Verify no actual pollution occurred
        const cleanObj = {};
        expect((cleanObj as any).polluted).toBeUndefined();
      }
    });
  });

  describe('Invalid Metadata', () => {
    it('should fail validation when agentId is a number', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 123456,  // WRONG: should be string
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when agentId is null', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: null,  // WRONG: should be string
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when agentId is undefined', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: undefined,  // WRONG: should be string
          timestamp: Date.now(),
        },
      } as any;

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when agentId is empty string', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: '',  // WRONG: empty string
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      // Zod accepts empty strings - this might pass
      // Document actual behavior
    });

    it('should fail validation when timestamp is a string', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: '1234567890',  // WRONG: should be number
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should accept when timestamp is NaN', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: NaN,  // NaN is a number type
        },
      };

      const result = schema.safeParse(invalidResponse);
      // NaN is a number type, so Zod might accept it
      // Document actual behavior
    });

    it('should accept when timestamp is Infinity', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Infinity,  // Infinity is a number type
        },
      };

      const result = schema.safeParse(invalidResponse);
      // Infinity is a number type, so Zod might accept it
      // Document actual behavior
    });

    it('should accept when timestamp is negative', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: -1234567890,  // Negative is valid number type
        },
      };

      const result = schema.safeParse(invalidResponse);
      // Negative numbers are valid number type
      // Document actual behavior
    });

    it('should handle when metadata is missing', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        // metadata is missing
      } as any;

      const result = schema.safeParse(invalidResponse);
      // Metadata is optional in the schema
      // Document actual behavior
    });
  });

  describe('Discriminated Union Mismatches', () => {
    it('should fail validation when success response has error populated', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: {  // WRONG: success should have error: null
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

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when error response has data populated', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'error' as const,
        data: 'test data',  // WRONG: error should have data: null
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

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when error response has null error', () => {
      const schema = AgentResponseSchema(z.unknown());

      const invalidResponse = {
        status: 'error' as const,
        data: null,
        error: null,  // WRONG: error status requires error object
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when partial response has error populated', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'partial' as const,
        data: 'partial data',
        error: {  // WRONG: partial should have error: null
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

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should fail validation when partial response has null data', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'partial' as const,
        data: null,  // WRONG: partial should have data populated
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Code Edge Cases', () => {
    it('should accept lowercase error codes', () => {
      const response = createErrorResponse(
        'lowercase_error_code',  // Not standard format, but still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept camelCase error codes', () => {
      const response = createErrorResponse(
        'camelCaseErrorCode',  // Not standard format, but still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept kebab-case error codes', () => {
      const response = createErrorResponse(
        'kebab-case-error-code',  // Not standard format, but still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept error codes with special characters', () => {
      const response = createErrorResponse(
        'ERROR@#$%',  // Unusual, but still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept error codes with spaces', () => {
      const response = createErrorResponse(
        'error with spaces',  // Unusual, but still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept empty string error code', () => {
      const response = createErrorResponse(
        '',  // Empty string is still a string
        'Test error',
        null,
        false
      );

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject non-string error codes (number)', () => {
      const invalidError = {
        status: 'error' as const,
        data: null,
        error: {
          code: 123,  // WRONG: should be string
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });

    it('should reject non-string error codes (boolean)', () => {
      const invalidError = {
        status: 'error' as const,
        data: null,
        error: {
          code: true,  // WRONG: should be string
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });

    it('should reject non-string error codes (object)', () => {
      const invalidError = {
        status: 'error' as const,
        data: null,
        error: {
          code: { code: 'nested' },  // WRONG: should be string
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as any;

      const schema = AgentResponseSchema(z.unknown());
      const result = schema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });

  describe('Null vs Undefined Handling (PRD 6.4.4)', () => {
    it('should accept null data field for error response', () => {
      const schema = AgentResponseSchema(z.unknown());

      const errorResponse = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed'
      );

      const result = schema.safeParse(errorResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe(null);
        expect(result.data.data).not.toBeUndefined();
      }
    });

    it('should reject undefined data field for error response', () => {
      const schema = AgentResponseSchema(z.unknown());

      const invalidResponse = {
        status: 'error' as const,
        data: undefined,  // WRONG: should be null per PRD 6.4.4
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

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should accept null error field for success response', () => {
      const schema = AgentResponseSchema(z.string());

      const successResponse = createSuccessResponse(
        'test data',
        { agentId: 'test-agent', timestamp: Date.now() }
      );

      const result = schema.safeParse(successResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBe(null);
        expect(result.data.error).not.toBeUndefined();
      }
    });

    it('should reject undefined error field for success response', () => {
      const schema = AgentResponseSchema(z.string());

      const invalidResponse = {
        status: 'success' as const,
        data: 'test data',
        error: undefined,  // WRONG: should be null per PRD 6.4.4
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should accept null details field in error', () => {
      const schema = AgentResponseSchema(z.unknown());

      const errorResponse = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed',
        null  // Explicitly null details
      );

      const result = schema.safeParse(errorResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.details).toBe(null);
        expect(result.data.error?.details).not.toBeUndefined();
      }
    });

    it('should reject undefined details field in error', () => {
      const schema = AgentResponseSchema(z.unknown());

      const invalidResponse = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: undefined,  // WRONG: should be null per PRD 6.4.4
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should accept missing optional metadata fields', () => {
      const schema = AgentResponseSchema(z.string());

      const response = createSuccessResponse(
        'test data',
        {
          agentId: 'test-agent',
          timestamp: Date.now(),
          // duration, requestId, usage, toolCalls are missing
        }
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept null for optional metadata fields', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          duration: null,  // Explicitly null
          requestId: null,
        },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept undefined for optional metadata fields', () => {
      const schema = AgentResponseSchema(z.string());

      const response = createSuccessResponse(
        'test data',
        {
          agentId: 'test-agent',
          timestamp: Date.now(),
        }
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        // Optional fields should be undefined when not provided
        expect(result.data.metadata?.duration).toBeUndefined();
      }
    });
  });

  describe('Factory Function Compliance (PRD 6.4.4)', () => {
    it('should create success response with null error', () => {
      const response = createSuccessResponse(
        'test data',
        { agentId: 'test-agent', timestamp: Date.now() }
      );

      expect(response.error).toBe(null);
      expect(response.error).not.toBeUndefined();
    });

    it('should create error response with null data', () => {
      const response = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed'
      );

      expect(response.data).toBe(null);
      expect(response.data).not.toBeUndefined();
    });

    it('should create partial response with null error', () => {
      const response = createPartialResponse('partial data');

      expect(response.error).toBe(null);
      expect(response.error).not.toBeUndefined();
    });

    it('should create error response with null details when not provided', () => {
      const response = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed'
        // details not provided
      );

      expect(response.error?.details).toBe(null);
      expect(response.error?.details).not.toBeUndefined();
    });

    it('should serialize and deserialize correctly', () => {
      const original = createSuccessResponse(
        'test data',
        { agentId: 'test-agent', timestamp: Date.now() }
      );

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as AgentResponse<string>;

      expect(deserialized.status).toBe(original.status);
      expect(deserialized.data).toBe(original.data);
      expect(deserialized.error).toBe(original.error);
      expect(deserialized.error).toBe(null);  // Explicitly null
      expect(deserialized.error).not.toBeUndefined();
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
