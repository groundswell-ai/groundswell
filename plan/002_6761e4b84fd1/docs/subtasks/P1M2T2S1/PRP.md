# PRP: Write tests for valid AgentResponse structures

**PRP ID**: P1.M2.T2.S1
**Work Item**: Write tests for valid AgentResponse structures
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create comprehensive test suite `src/__tests__/unit/agent-response.test.ts` that validates AgentResponse contract compliance per PRD 6.4 requirements, ensuring all response structures from factory helpers and Zod schemas are valid.

**Deliverable**: New test file `src/__tests__/unit/agent-response.test.ts` with test cases covering:
- Success responses have all required fields
- Error responses have populated error field
- Metadata always includes agentId and timestamp
- Null is used instead of undefined (PRD 6.4.4)
- All responses are valid JSON (JSON.parse(JSON.stringify(response)) succeeds)

**Success Definition**:
- New test file created at `src/__tests__/unit/agent-response.test.ts`
- All test cases validate AgentResponse contract compliance
- Tests verify PRD 6.4 requirements (Strict JSON, No Prose Wrapping, Consistent Structure, Null over Undefined, Error Responses)
- Tests pass: `npm test -- agent-response.test.ts`
- No breaking changes to existing tests
- Tests integrate with existing Vitest configuration

---

## Why

**Business Value and User Impact**:
- **Contract Compliance**: Ensures AgentResponse structures always conform to PRD 6.4 requirements
- **Regression Prevention**: Catches breaking changes to response structure early
- **Type Safety**: Validates that Zod schemas correctly enforce TypeScript interfaces
- **Documentation**: Tests serve as executable documentation of valid response structures

**Integration with Existing Features**:
- **P1.M2.T1.S1 (Parallel - CONTRACT)**: Provides Zod schemas to test - `AgentResponseSchema<T>()`, `AgentErrorDetailsSchema`, `AgentResponseMetadataSchema`
- **P1.M2.T1.S2 (Parallel - CONTRACT)**: Adds `INTERNAL_ERROR` to `AGENT_ERROR_CODES` which should be tested
- **P1.M1.T1.S2 (Complete)**: Factory helpers (`createSuccessResponse`, `createErrorResponse`, `createPartialResponse`) produce valid responses to test
- **P1.M1.T3.S1 (Complete)**: All AgentResponse types are exported from public API

**Problems This Solves**:
- **No Schema Tests**: Existing tests cover factory functions but not Zod schema validation
- **No PRD 6.4 Validation**: Tests specifically validate PRD 6.4 requirements including null-over-undefined
- **No JSON Serialization Tests**: Tests verify responses survive JSON serialization
- **No Metadata Validation**: Tests verify required metadata fields (agentId, timestamp)

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This adds test coverage for existing functionality.

**Technical Requirements**:
- Create new test file `src/__tests__/unit/agent-response.test.ts`
- Test AgentResponseSchema validation with various data types
- Test all three response variants (success, error, partial)
- Test PRD 6.4.4 null-over-undefined compliance
- Test JSON serialization/deserialization
- Test metadata required fields (agentId, timestamp)
- Follow existing test patterns from `agent-response-factory.test.ts`

### Success Criteria

- [ ] Test file created at `src/__tests__/unit/agent-response.test.ts`
- [ ] Tests for success response validation (all required fields present)
- [ ] Tests for error response validation (error field populated)
- [ ] Tests for metadata validation (agentId and timestamp required)
- [ ] Tests for null-over-undefined compliance (PRD 6.4.4)
- [ ] Tests for JSON serialization (JSON.parse(JSON.stringify(response)))
- [ ] All tests pass: `npm test -- agent-response.test.ts`
- [ ] Existing tests still pass: `npm test`
- [ ] Tests follow codebase conventions (describe/it structure, import patterns)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement AgentResponse schema tests successfully?

**Answer**: YES - This PRP provides exact file locations, existing test patterns, schema definitions, PRD requirements, external documentation URLs, and step-by-step implementation tasks.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/guide/testing-types.html#type-testing
  why: Official Vitest documentation for TypeScript type testing patterns
  critical: Section on expectType and type assertion patterns

- url: https://vitest.dev/api/expect.html
  why: Official Vitest documentation for expect matchers
  critical: Sections on toEqual, toMatchObject, toBeNull, toBeUndefined

- url: https://zod.dev/?id=safeparse
  why: Official Zod documentation for safeParse validation pattern
  critical: Use safeParse() for validation tests to avoid throws

- url: https://zod.dev/?id=discriminated-unions
  why: Official Zod documentation for discriminated union testing
  critical: AgentResponseSchema uses discriminatedUnion on 'status' field

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Contains all AgentResponse interfaces and Zod schemas to test
  pattern: Lines 161-194 (AgentResponse interface), Lines 749-832 (Zod schemas)
  gotcha: AgentResponseSchema is a factory function, not a constant

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-response-factory.test.ts
  why: Reference for existing test patterns and structure
  pattern: Describe/it nesting, import patterns, assertion patterns
  section: Lines 352-387 show PRD 6.4.4 null handling test patterns

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent-response-public-api.test.ts
  why: Reference for discriminated union and type guard testing
  pattern: Lines 278-297 show discriminated union testing patterns
  section: Lines 222-252 show type narrowing tests

- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Vitest configuration - test location and globals
  pattern: include: ['src/__tests__/**/*.test.ts'], globals: true
  gotcha: Tests must be in src/__tests__/ to be discovered

- file: /home/dustin/projects/groundswell/package.json
  why: Test scripts and dependencies
  pattern: "test": "vitest run", "test:watch": "vitest"
  section: Lines 32-36 (test scripts)

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S2/PRP.md
  why: CONTRACT - Defines INTERNAL_ERROR code added to AGENT_ERROR_CODES
  section: Section "Goal" for INTERNAL_ERROR, Section "Implementation Blueprint" for code
  critical: INTERNAL_ERROR should be tested as valid error code

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S1/PRP.md
  why: CONTRACT - Defines AgentResponseSchema factory implementation
  section: Section "Goal" for schema export, Section "Implementation Blueprint" for schema definition
  critical: Schema factory is fully implemented and ready to test

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/vitest-zod-testing-quick-reference.md
  why: Groundswell-specific Vitest + Zod testing patterns and examples
  section: Section "Testing Checklist", Section "Groundswell-Specific Patterns"
  critical: AgentResponse-specific test patterns

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/agent-response-testing-examples.md
  why: Detailed AgentResponse schema testing examples with code
  section: Sections 5-8 for AgentResponseSchema testing
  critical: Complete code examples for all test scenarios
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts                      # AgentResponse interfaces and Zod schemas
│   │   ├── AgentResponse<T> interface (lines 161-194)
│   │   ├── AgentErrorDetails interface (lines 221-250)
│   │   ├── AgentResponseMetadata interface (lines 284-339)
│   │   ├── AgentResponseStatusSchema (line 749)
│   │   ├── AgentErrorDetailsSchema (lines 757-766)
│   │   ├── AgentResponseMetadataSchema (lines 772-785)
│   │   └── AgentResponseSchema<T>() factory (lines 809-832)
│   └── index.ts
├── __tests__/
│   ├── unit/
│   │   ├── agent-response-factory.test.ts    # Reference for test patterns
│   │   ├── agent-response-public-api.test.ts # Reference for type guard tests
│   │   └── agent.test.ts                     # Reference for agent tests
│   └── integration/
├── core/
│   └── agent.ts                      # Agent class (uses AgentResponse)
└── index.ts
```

### Desired Codebase Tree with Files to be Added

```bash
# NEW FILE TO CREATE
src/
└── __tests__/
    └── unit/
        └── agent-response.test.ts     # NEW FILE - AgentResponse schema validation tests
            ├── [IMPORT]: Vitest imports (describe, it, expect)
            ├── [IMPORT]: Zod imports (z)
            ├── [IMPORT]: AgentResponse types and schemas
            ├── [TEST]: Success response validation
            ├── [TEST]: Error response validation
            ├── [TEST]: Partial response validation
            ├── [TEST]: Metadata validation
            ├── [TEST]: Null-over-undefined compliance (PRD 6.4.4)
            └── [TEST]: JSON serialization tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: AgentResponseSchema is a FACTORY FUNCTION, not a constant
// Must call it with a dataSchema parameter
const StringResponseSchema = AgentResponseSchema(z.object({ result: z.string() }));
// NOT: const schema = AgentResponseSchema;  // WRONG

// CRITICAL: Import from .js files (TypeScript compiles to .js)
import { AgentResponseSchema } from '../../types/agent.js';  // ✅ Correct
// import { AgentResponseSchema } from '../../types/agent.ts'; // ❌ Wrong

// CRITICAL: Use .safeParse() for validation tests
const result = schema.safeParse(response);
expect(result.success).toBe(true);  // ✅ Check success flag
// result.parse() throws on failure - don't use in tests

// CRITICAL: Metadata is OPTIONAL in the schema (AgentResponseMetadataSchema.optional())
// But agentId and timestamp are REQUIRED when metadata is present
const response = {
  status: 'success',
  data: { result: 'test' },
  error: null,
  // metadata: undefined  // Valid - metadata is optional
};

// CRITICAL: PRD 6.4.4 - Use null for absent values, NOT undefined
// Success responses: error must be null (not undefined)
expect(response.error).toBeNull();  // ✅ Correct
expect(response.error).not.toBeUndefined();  // ✅ Also correct

// Error responses: data must be null (not undefined)
expect(response.data).toBeNull();  // ✅ Correct

// CRITICAL: discriminatedUnion tests - status field is the discriminator
// The schema validates based on status value
const successSchema = z.object({
  status: z.literal('success'),
  data: z.string(),
  error: z.null(),  // Must be null for success
});

// CRITICAL: TypeScript tests use 'as' for type assertions
type Inferred = z.infer<typeof AgentResponseSchema<string>>;
expectType<AgentResponse<string>>({} as Inferred);

// PATTERN: Existing tests use factory functions to create test data
const response = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });

// PATTERN: Test file naming - *.test.ts suffix
// Location: src/__tests__/unit/agent-response.test.ts

// GOTCHA: Vitest globals are enabled (globals: true in vitest.config.ts)
// No need to import describe/it/expect from 'vitest' in tests
// BUT: Import pattern in codebase still explicitly imports them
import { describe, it, expect } from 'vitest';  // Follow existing pattern

// PATTERN: Test structure - nested describe blocks
describe('AgentResponse Schema Validation', () => {
  describe('Success Responses', () => {
    it('should validate success response with all required fields', () => {
      // test code
    });
  });
});

// CRITICAL: Test JSON serialization with JSON.parse(JSON.stringify())
const serialized = JSON.parse(JSON.stringify(response));
expect(serialized).toEqual(response);  // Should survive serialization

// GOTCHA: undefined values are lost during JSON serialization
const response = { status: 'success', data: undefined };
JSON.stringify(response);  // → '{"status":"success"}' - data is lost!
// This is why PRD 6.4.4 requires null instead of undefined

// PATTERN: Use vi.spyOn for mocking (if needed for async tests)
vi.spyOn(console, 'error').mockImplementation(() => {});

// CRITICAL: Test scripts
npm test -- agent-response.test.ts  # Run specific test file
npm test                            # Run all tests
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Tests validate existing `AgentResponse<T>` interface and Zod schemas.

**Key Types to Test**:

| Type | Source | Test Focus |
|------|--------|------------|
| `AgentResponse<T>` | `src/types/agent.ts` lines 161-194 | Interface structure validation |
| `AgentResponseSchema<T>()` | `src/types/agent.ts` lines 809-832 | Zod schema validation |
| `AgentErrorDetailsSchema` | `src/types/agent.ts` lines 757-766 | Error validation schema |
| `AgentResponseMetadataSchema` | `src/types/agent.ts` lines 772-785 | Metadata validation schema |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test file skeleton
  - CREATE: src/__tests__/unit/agent-response.test.ts
  - ADD: Vitest imports (describe, it, expect)
  - ADD: Zod import (z)
  - ADD: AgentResponse type imports
  - ADD: Schema imports (AgentResponseSchema, AgentErrorDetailsSchema, etc.)
  - FOLLOW: Import pattern from agent-response-factory.test.ts
  - NAMING: File name matches pattern: agent-response.test.ts

Task 2: IMPLEMENT success response validation tests
  - ADD: describe block for "Success Response Validation"
  - TEST: Success response has all required fields (status, data, error, metadata)
  - TEST: Success response error field is null (PRD 6.4.4)
  - TEST: Success response data matches schema
  - TEST: Success response with optional metadata
  - TEST: Success response without metadata
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 17-62

Task 3: IMPLEMENT error response validation tests
  - ADD: describe block for "Error Response Validation"
  - TEST: Error response has all required fields (status, data, error, metadata)
  - TEST: Error response data field is null (PRD 6.4.4)
  - TEST: Error response error field is populated (not null)
  - TEST: Error response has required error fields (code, message, recoverable)
  - TEST: Error response with optional details field
  - TEST: Error response without details field (details is null)
  - TEST: INTERNAL_ERROR code (from P1.M2.T1.S2) is valid error code
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 65-138

Task 4: IMPLEMENT partial response validation tests
  - ADD: describe block for "Partial Response Validation"
  - TEST: Partial response has all required fields
  - TEST: Partial response error field is null
  - TEST: Partial response data matches schema
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 141-175

Task 5: IMPLEMENT metadata validation tests
  - ADD: describe block for "Response Metadata Validation"
  - TEST: Metadata always includes agentId (required field)
  - TEST: Metadata always includes timestamp (required field)
  - TEST: Metadata with optional fields (duration, requestId, usage, toolCalls)
  - TEST: Metadata without optional fields
  - TEST: Metadata timestamp is valid Unix timestamp (number)
  - TEST: Metadata agentId is non-empty string
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 49-62

Task 6: IMPLEMENT null-over-undefined compliance tests (PRD 6.4.4)
  - ADD: describe block for "PRD 6.4.4 Null Over Undefined Compliance"
  - TEST: Success response error is null (not undefined)
  - TEST: Error response data is null (not undefined)
  - TEST: Partial response error is null (not undefined)
  - TEST: Error details can be null (when absent)
  - TEST: Optional metadata fields can be null
  - TEST: Undefined values fail schema validation
  - FOLLOW: Pattern from agent-response-factory.test.ts lines 352-387

Task 7: IMPLEMENT JSON serialization tests
  - ADD: describe block for "JSON Serialization Tests"
  - TEST: Success response survives JSON.parse(JSON.stringify())
  - TEST: Error response survives JSON.parse(JSON.stringify())
  - TEST: Partial response survives JSON.parse(JSON.stringify())
  - TEST: Null values preserved after serialization
  - TEST: Required fields preserved after serialization
  - TEST: Undefined optional fields become undefined (not lost) in TypeScript
  - VERIFY: PRD 6.4.1 (Strict JSON) compliance

Task 8: IMPLEMENT discriminated union validation tests
  - ADD: describe block for "Discriminated Union Validation"
  - TEST: Schema accepts all three status values (success, error, partial)
  - TEST: Schema rejects invalid status values
  - TEST: Discriminator narrows type correctly
  - TEST: Type guards work correctly (isSuccess, isError, isPartial)
  - FOLLOW: Pattern from agent-response-public-api.test.ts lines 278-297

Task 9: RUN tests and verify
  - RUN: npm test -- agent-response.test.ts
  - VERIFY: All new tests pass
  - RUN: npm test (full test suite)
  - VERIFY: No existing tests broken
  - CHECK: TypeScript compilation: npm run lint
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test file imports
// In src/__tests__/unit/agent-response.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseStatusSchema,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  type AgentResponse,
  type SuccessResponse,
  type ErrorResponse,
  type PartialResponse,
} from '../../types/agent.js';

// PATTERN 2: Test structure for success responses
describe('AgentResponse Schema Validation', () => {
  describe('Success Response Validation', () => {
    it('should validate success response with all required fields', () => {
      // Create schema for string data
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      // Create valid success response
      const response = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      // Validate with schema
      const result = schema.safeParse(response);

      // Assert validation passes
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(response);
        expect(result.data.status).toBe('success');
        expect(result.data.error).toBeNull();
        expect(result.data.data).toEqual({ result: 'test' });
      }
    });

    it('should validate success response with null error field (PRD 6.4.4)', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test data',
        error: null,  // PRD 6.4.4: null not undefined
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      expect(result.data.error).toBeNull();
      expect(result.data.error).not.toBeUndefined();
    });

    it('should validate success response without metadata', () => {
      const schema = AgentResponseSchema(z.number());

      const response = {
        status: 'success' as const,
        data: 42,
        error: null,
        // metadata is optional
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

// PATTERN 3: Test structure for error responses
describe('Error Response Validation', () => {
  it('should validate error response with all required fields', () => {
    const schema = AgentResponseSchema(z.string());

    const response = {
      status: 'error' as const,
      data: null,  // PRD 6.4.4: null not undefined
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input',
        details: null,
        recoverable: true,
      },
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('error');
      expect(result.data.data).toBeNull();
      expect(result.data.error).not.toBeNull();
      expect(result.data.error?.code).toBe('VALIDATION_FAILED');
      expect(result.data.error?.recoverable).toBe(true);
    }
  });

  it('should validate error response with details', () => {
    const schema = AgentResponseSchema(z.unknown());

    const response = {
      status: 'error' as const,
      data: null,
      error: {
        code: 'EXECUTION_FAILED',
        message: 'Execution failed',
        details: { field: 'name', reason: 'invalid' },
        recoverable: false,
      },
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
    expect(result.data.error?.details).toEqual({ field: 'name', reason: 'invalid' });
  });

  it('should validate INTERNAL_ERROR code (from P1.M2.T1.S2)', () => {
    const schema = AgentResponseSchema(z.unknown());

    const response = {
      status: 'error' as const,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal validation failed',
        details: null,
        recoverable: false,
      },
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(response);
    expect(result.success).toBe(true);
    expect(result.data.error?.code).toBe('INTERNAL_ERROR');
  });
});

// PATTERN 4: Test structure for metadata validation
describe('Response Metadata Validation', () => {
  it('should validate metadata with required fields (agentId, timestamp)', () => {
    const metadata = {
      agentId: 'agent-123',
      timestamp: Date.now(),
    };

    const result = AgentResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentId).toBe('agent-123');
      expect(typeof result.data.timestamp).toBe('number');
    }
  });

  it('should validate metadata with all optional fields', () => {
    const metadata = {
      agentId: 'agent-123',
      timestamp: Date.now(),
      duration: 1000,
      requestId: 'req-456',
      usage: { inputTokens: 10, outputTokens: 20 },
      toolCalls: 3,
    };

    const result = AgentResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    expect(result.data.duration).toBe(1000);
    expect(result.data.requestId).toBe('req-456');
  });

  it('should reject metadata without agentId', () => {
    const metadata = {
      timestamp: Date.now(),
    };

    const result = AgentResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('should reject metadata without timestamp', () => {
    const metadata = {
      agentId: 'test',
    };

    const result = AgentResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });
});

// PATTERN 5: Test null-over-undefined compliance (PRD 6.4.4)
describe('PRD 6.4.4 Null Over Undefined Compliance', () => {
  it('should use null for absent error in success responses', () => {
    const schema = AgentResponseSchema(z.string());

    const response = createSuccessResponse('test', {
      agentId: 'test',
      timestamp: Date.now(),
    });

    expect(response.error).toBeNull();
    expect(response.error).not.toBeUndefined();
  });

  it('should use null for absent data in error responses', () => {
    const response = createErrorResponse('TEST_ERROR', 'Test error');

    expect(response.data).toBeNull();
    expect(response.data).not.toBeUndefined();
  });

  it('should reject undefined error field in success response', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success' as const,
      data: 'test',
      error: undefined,  // Invalid - should be null
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(invalidResponse);
    // Note: Zod optional() allows undefined, but AgentResponse uses z.null() for error
    // This may pass or fail depending on schema implementation
    // Adjust assertion based on actual schema behavior
  });

  it('should reject undefined data field in error response', () => {
    const schema = AgentResponseSchema(z.unknown());

    const invalidResponse = {
      status: 'error' as const,
      data: undefined,  // Invalid - should be null
      error: { code: 'TEST', message: 'test', details: null, recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const result = schema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// PATTERN 6: Test JSON serialization (PRD 6.4.1)
describe('JSON Serialization Tests (PRD 6.4.1)', () => {
  it('should serialize and deserialize success response', () => {
    const schema = AgentResponseSchema(z.object({ result: z.string() }));

    const original = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    // Serialize and deserialize
    const serialized = JSON.parse(JSON.stringify(original));

    // Verify structure preserved
    expect(serialized).toEqual(original);
    expect(serialized.status).toBe('success');
    expect(serialized.error).toBeNull();
    expect(serialized.data).toEqual({ result: 'test' });

    // Verify still valid according to schema
    const result = schema.safeParse(serialized);
    expect(result.success).toBe(true);
  });

  it('should preserve null values during serialization', () => {
    const original = createErrorResponse('TEST_ERROR', 'Test error');

    const serialized = JSON.parse(JSON.stringify(original));

    expect(serialized.data).toBeNull();
    expect(serialized.error?.details).toBeNull();
  });

  it('should survive round-trip for all response types', () => {
    const responses = [
      createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() }),
      createErrorResponse('TEST_ERROR', 'Test error'),
      createPartialResponse({ progress: 0.5 }),
    ];

    responses.forEach((response) => {
      const roundTripped = JSON.parse(JSON.stringify(response));
      expect(roundTripped).toEqual(response);
    });
  });
});

// PATTERN 7: Test discriminated union behavior
describe('Discriminated Union Validation', () => {
  it('should accept all valid status values', () => {
    const schema = AgentResponseSchema(z.string());

    const statuses: AgentResponseStatus[] = ['success', 'error', 'partial'];

    statuses.forEach((status) => {
      const response = schema.safeParse({
        status,
        // ... other fields based on status
      });
      // Test each status variant
    });
  });

  it('should reject invalid status values', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'invalid',
      data: 'test',
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    });

    expect(result.success).toBe(false);
  });

  it('should narrow type with isSuccess type guard', () => {
    const response: AgentResponse<string> = createSuccessResponse('test', {
      agentId: 'test',
      timestamp: Date.now(),
    });

    if (isSuccess(response)) {
      // TypeScript knows response.data is string (not null)
      expect(response.data.toUpperCase()).toBe('TEST');
      expect(response.error).toBeNull();
    }
  });
});
```

### Integration Points

```yaml
DEPENDS ON: P1.M2.T1.S1 (Define Zod schemas for AgentResponse types)
  - AgentResponseSchema<T>() factory must be defined
  - AgentErrorDetailsSchema must be defined
  - AgentResponseMetadataSchema must be defined
  - All exported from src/types/agent.ts

DEPENDS ON: P1.M2.T1.S2 (Add validation to Agent.prompt() return path)
  - INTERNAL_ERROR added to AGENT_ERROR_CODES
  - Used in validation failure scenarios

DEPENDS ON: P1.M1.T1.S2 (Create AgentResponse factory helpers)
  - createSuccessResponse() produces valid success responses
  - createErrorResponse() produces valid error responses
  - createPartialResponse() produces valid partial responses

NO BREAKING CHANGES:
  - Tests only validate existing functionality
  - No modifications to source code
  - New test file only

DOWNSTREAM DEPENDENCIES:
  - P1.M2.T2.S2 (Write tests for error code handling) will build on this
  - P1.M2.T2.S3 (Write adversarial tests) will build on this
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
npx tsc --noEmit src/__tests__/unit/agent-response.test.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new AgentResponse schema tests
npm test -- agent-response.test.ts

# Run with verbose output
npm test -- agent-response.test.ts --reporter=verbose

# Run specific test suite
npm test -- agent-response.test.ts -t "Success Response Validation"

# Expected: All tests pass. All PRD 6.4 requirements validated.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all unit tests in src/__tests__/unit/
npm test -- src/__tests__/unit/

# Run full test suite
npm test

# Expected: All tests pass. New tests integrate with existing test suite.

# Run related AgentResponse tests
npm test -- --testNamePattern="AgentResponse"
```

### Level 4: Coverage Validation

```bash
# Run tests with coverage report (if coverage configured)
npm test -- --coverage

# Check coverage for AgentResponse types
npm test -- --coverage src/types/agent.ts

# Expected: High coverage for AgentResponse schemas and interfaces.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at `src/__tests__/unit/agent-response.test.ts`
- [ ] All imports use `.js` extension (TypeScript convention)
- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] No type errors in test file
- [ ] Test file follows Vitest conventions

### Feature Validation

- [ ] Success response has all required fields
- [ ] Success response error field is null
- [ ] Error response has populated error field
- [ ] Error response data field is null
- [ ] Metadata always includes agentId
- [ ] Metadata always includes timestamp
- [ ] Null used instead of undefined (PRD 6.4.4)
- [ ] Responses survive JSON serialization (PRD 6.4.1)

### Test Validation

- [ ] All tests pass: `npm test -- agent-response.test.ts`
- [ ] Existing tests still pass: `npm test`
- [ ] No breaking changes to existing functionality
- [ ] Tests follow codebase patterns (describe/it structure)
- [ ] Test descriptions are clear and specific

### PRD Compliance Validation

- [ ] PRD 6.4.1 (Strict JSON): JSON.parse(JSON.stringify()) tests
- [ ] PRD 6.4.2 (No Prose Wrapping): Schema structure tests
- [ ] PRD 6.4.3 (Consistent Structure): Interface compliance tests
- [ ] PRD 6.4.4 (Null over Undefined): Null handling tests
- [ ] PRD 6.4.5 (Error Responses): Error response validation tests

### Code Quality Validation

- [ ] Follows existing test patterns from agent-response-factory.test.ts
- [ ] Uses consistent import patterns
- [ ] Test organization is logical and clear
- [ ] Test names follow "should" convention
- [ ] No code duplication (use helpers where appropriate)

---

## Anti-Patterns to Avoid

- ❌ Don't use `.parse()` in tests - use `.safeParse()` to avoid throws
- ❌ Don't import from `.ts` files - use `.js` extension for imports
- ❌ Don't test implementation details - test contract compliance
- ❌ Don't create tests that are too brittle - focus on invariants
- ❌ Don't forget to test all three response variants (success, error, partial)
- ❌ Don't skip null-over-undefined tests - PRD 6.4.4 is critical
- ❌ Don't forget JSON serialization tests - PRD 6.4.1 requires it
- ❌ Don't use `undefined` in test data - use `null` per PRD 6.4.4
- ❌ Don't create duplicate tests - check agent-response-factory.test.ts first
- ❌ Don't forget to test INTERNAL_ERROR code (from P1.M2.T1.S2)
- ❌ Don't test factory functions here - they're tested in agent-response-factory.test.ts
- ❌ Don't test public API exports here - they're tested in agent-response-public-api.test.ts
- ❌ Don't modify existing test files - create new file only
- ❌ Don't add production code to test files - tests only
- ❌ Don't use `describe.skip` or `it.skip` - all tests should run
- ❌ Don't forget to test metadata required fields (agentId, timestamp)

---

## Appendix: Complete Reference Implementation

### Task 1-8: Complete Test File Implementation

```typescript
/**
 * Test file: agent-response.test.ts
 *
 * Purpose: Validate AgentResponse structures comply with PRD 6.4 requirements
 *
 * Tests:
 * - Success response has all required fields
 * - Error response has populated error field
 * - Metadata always includes agentId and timestamp
 * - Null is used instead of undefined (PRD 6.4.4)
 * - All responses are valid JSON (JSON.parse(JSON.stringify(response)))
 *
 * PRP: P1.M2.T2.S1 - Write tests for valid AgentResponse structures
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseStatusSchema,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
  type AgentResponse,
  type AgentResponseStatus,
  AGENT_ERROR_CODES,
} from '../../types/agent.js';

describe('AgentResponse Schema Validation', () => {
  describe('Success Response Validation', () => {
    it('should validate success response with all required fields', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const response = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(response);
        expect(result.data.status).toBe('success');
        expect(result.data.error).toBeNull();
        expect(result.data.data).toEqual({ result: 'test' });
      }
    });

    it('should validate success response with null error field (PRD 6.4.4)', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBeNull();
        expect(result.data.error).not.toBeUndefined();
      }
    });

    it('should validate success response without optional metadata', () => {
      const schema = AgentResponseSchema(z.number());

      const response = {
        status: 'success' as const,
        data: 42,
        error: null,
        // metadata is optional
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate success response with complex data schema', () => {
      const complexSchema = z.object({
        result: z.string(),
        count: z.number(),
        items: z.array(z.string()),
      });

      const schema = AgentResponseSchema(complexSchema);

      const response = {
        status: 'success' as const,
        data: {
          result: 'completed',
          count: 3,
          items: ['a', 'b', 'c'],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.items).toHaveLength(3);
      }
    });
  });

  describe('Error Response Validation', () => {
    it('should validate error response with all required fields', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input',
          details: null,
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('error');
        expect(result.data.data).toBeNull();
        expect(result.data.error).not.toBeNull();
        expect(result.data.error?.code).toBe('VALIDATION_FAILED');
        expect(result.data.error?.message).toBe('Invalid input');
        expect(result.data.error?.recoverable).toBe(true);
      }
    });

    it('should validate error response with details', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Execution failed',
          details: { field: 'name', reason: 'invalid' },
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.details).toEqual({ field: 'name', reason: 'invalid' });
      }
    });

    it('should validate error response without details field', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'API_REQUEST_FAILED',
          message: 'API request failed',
          details: null,
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      expect(result.data.error?.details).toBeNull();
    });

    it('should validate INTERNAL_ERROR code (from P1.M2.T1.S2)', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal validation failed',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('INTERNAL_ERROR');
      }
    });

    it('should validate all standard AGENT_ERROR_CODES', () => {
      const schema = AgentResponseSchema(z.unknown());

      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        const response = {
          status: 'error' as const,
          data: null,
          error: {
            code,
            message: 'Test error',
            details: null,
            recoverable: false,
          },
          metadata: { agentId: 'test', timestamp: Date.now() },
        };

        const result = schema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    it('should require recoverable boolean field in error', () => {
      const schema = AgentErrorDetailsSchema;

      // Valid with recoverable: true
      const error1 = {
        code: 'TEST',
        message: 'Test',
        details: null,
        recoverable: true,
      };
      expect(schema.safeParse(error1).success).toBe(true);

      // Valid with recoverable: false
      const error2 = {
        code: 'TEST',
        message: 'Test',
        details: null,
        recoverable: false,
      };
      expect(schema.safeParse(error2).success).toBe(true);
    });
  });

  describe('Partial Response Validation', () => {
    it('should validate partial response with all required fields', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const response = {
        status: 'partial' as const,
        data: { progress: 0.5 },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('partial');
        expect(result.data.error).toBeNull();
        expect(result.data.data.progress).toBe(0.5);
      }
    });

    it('should validate partial response without metadata', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'partial' as const,
        data: 'partial result',
        error: null,
        // metadata is optional
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate partial response with complex data', () => {
      const schema = AgentResponseSchema(
        z.object({
          completedSteps: z.number(),
          totalSteps: z.number(),
          currentStep: z.string(),
        })
      );

      const response = {
        status: 'partial' as const,
        data: {
          completedSteps: 3,
          totalSteps: 5,
          currentStep: 'processing',
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('Response Metadata Validation', () => {
    it('should validate metadata with required fields (agentId, timestamp)', () => {
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agentId).toBe('agent-123');
        expect(typeof result.data.timestamp).toBe('number');
      }
    });

    it('should validate metadata with all optional fields', () => {
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
        duration: 1000,
        requestId: 'req-456',
        usage: { inputTokens: 10, outputTokens: 20 },
        toolCalls: 3,
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(1000);
        expect(result.data.requestId).toBe('req-456');
        expect(result.data.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
        expect(result.data.toolCalls).toBe(3);
      }
    });

    it('should reject metadata without agentId', () => {
      const metadata = {
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should reject metadata without timestamp', () => {
      const metadata = {
        agentId: 'test',
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should accept metadata with null optional fields', () => {
      const metadata = {
        agentId: 'test',
        timestamp: Date.now(),
        duration: null,
        requestId: null,
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate timestamp is a number', () => {
      const metadata = {
        agentId: 'test',
        timestamp: 1706140800000, // Unix timestamp in milliseconds
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      expect(result.data.timestamp).toBe(1706140800000);
    });
  });

  describe('PRD 6.4.4 Null Over Undefined Compliance', () => {
    it('should use null for absent error in success responses', () => {
      const response = createSuccessResponse('test', {
        agentId: 'test',
        timestamp: Date.now(),
      });

      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();
    });

    it('should use null for absent data in error responses', () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error');

      expect(response.data).toBeNull();
      expect(response.data).not.toBeUndefined();
    });

    it('should use null for absent error in partial responses', () => {
      const response = createPartialResponse('partial data');

      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();
    });

    it('should use null for absent details in error responses', () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error');

      expect(response.error?.details).toBeNull();
      expect(response.error?.details).not.toBeUndefined();
    });

    it('should accept null for optional metadata fields', () => {
      const metadata = {
        agentId: 'test',
        timestamp: Date.now(),
        duration: null,
        requestId: null,
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      expect(result.data.duration).toBeNull();
      expect(result.data.requestId).toBeNull();
    });

    it('should handle null in AgentResponseSchema for success', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test',
        error: null, // PRD 6.4.4: null not undefined
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should handle null in AgentResponseSchema for error', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null, // PRD 6.4.4: null not undefined
        error: {
          code: 'TEST',
          message: 'test',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Serialization Tests (PRD 6.4.1)', () => {
    it('should serialize and deserialize success response', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const original = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('success');
      expect(serialized.error).toBeNull();
      expect(serialized.data).toEqual({ result: 'test' });

      const result = schema.safeParse(serialized);
      expect(result.success).toBe(true);
    });

    it('should serialize and deserialize error response', () => {
      const schema = AgentResponseSchema(z.unknown());

      const original = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: { field: 'value' },
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('error');
      expect(serialized.data).toBeNull();
      expect(serialized.error).not.toBeNull();
    });

    it('should serialize and deserialize partial response', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const original = {
        status: 'partial' as const,
        data: { progress: 0.75 },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('partial');
      expect(serialized.error).toBeNull();
    });

    it('should preserve null values during serialization', () => {
      const original = createErrorResponse('TEST_ERROR', 'Test error');

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized.data).toBeNull();
      expect(serialized.error?.details).toBeNull();
    });

    it('should survive round-trip for all response types', () => {
      const responses = [
        createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() }),
        createErrorResponse('TEST_ERROR', 'Test error'),
        createPartialResponse({ progress: 0.5 }),
      ];

      responses.forEach((response) => {
        const roundTripped = JSON.parse(JSON.stringify(response));
        expect(roundTripped).toEqual(response);
      });
    });

    it('should handle complex nested data in serialization', () => {
      const schema = AgentResponseSchema(
        z.object({
          items: z.array(z.object({ id: z.number(), name: z.string() })),
        })
      );

      const original = {
        status: 'success' as const,
        data: {
          items: [
            { id: 1, name: 'first' },
            { id: 2, name: 'second' },
          ],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized.data.items).toHaveLength(2);
      expect(serialized.data.items[0].id).toBe(1);
    });
  });

  describe('Discriminated Union Validation', () => {
    it('should accept all valid status values', () => {
      const schema = AgentResponseStatusSchema;

      expect(schema.safeParse('success').success).toBe(true);
      expect(schema.safeParse('error').success).toBe(true);
      expect(schema.safeParse('partial').success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const schema = AgentResponseStatusSchema;

      expect(schema.safeParse('invalid').success).toBe(false);
      expect(schema.safeParse('SUCCESS').success).toBe(false);
      expect(schema.safeParse('Error').success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
      expect(schema.safeParse(null).success).toBe(false);
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    it('should validate correct variant based on status discriminator', () => {
      const schema = AgentResponseSchema(z.string());

      // Success variant - data is string, error is null
      const successResponse = {
        status: 'success' as const,
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(successResponse).success).toBe(true);

      // Error variant - data is null, error exists
      const errorResponse = {
        status: 'error' as const,
        data: null,
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(errorResponse).success).toBe(true);

      // Partial variant - data is string, error is null
      const partialResponse = {
        status: 'partial' as const,
        data: 'partial',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(partialResponse).success).toBe(true);
    });

    it('should reject mismatched status and data/error fields', () => {
      const schema = AgentResponseSchema(z.string());

      // Success with error instead of null
      const invalid1 = {
        status: 'success' as const,
        data: 'test',
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(invalid1).success).toBe(false);

      // Error with string data instead of null
      const invalid2 = {
        status: 'error' as const,
        data: 'should be null',
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(invalid2).success).toBe(false);
    });
  });

  describe('Type Guard Validation', () => {
    it('should narrow type with isSuccess type guard', () => {
      const response: AgentResponse<string> = createSuccessResponse('test', {
        agentId: 'test',
        timestamp: Date.now(),
      });

      if (isSuccess(response)) {
        expect(response.data).toBe('test');
        expect(response.error).toBeNull();
        expect(typeof response.data).toBe('string');
      }
    });

    it('should narrow type with isError type guard', () => {
      const response: AgentResponse<string> = createErrorResponse('TEST_ERROR', 'Test error');

      if (isError(response)) {
        expect(response.data).toBeNull();
        expect(response.error).not.toBeNull();
        expect(response.error.code).toBe('TEST_ERROR');
        expect(typeof response.error.recoverable).toBe('boolean');
      }
    });

    it('should narrow type with isPartial type guard', () => {
      const response: AgentResponse<number> = createPartialResponse(42);

      if (isPartial(response)) {
        expect(response.data).toBe(42);
        expect(response.error).toBeNull();
        expect(typeof response.data).toBe('number');
      }
    });

    it('should handle discriminated union with if-else chain', () => {
      const responses: AgentResponse<string>[] = [
        createSuccessResponse('success', { agentId: 'test', timestamp: Date.now() }),
        createErrorResponse('TEST_ERROR', 'Test error'),
        createPartialResponse('partial'),
      ];

      const results: string[] = [];

      for (const response of responses) {
        if (isSuccess(response)) {
          results.push(`success: ${response.data}`);
        } else if (isError(response)) {
          results.push(`error: ${response.error.code}`);
        } else if (isPartial(response)) {
          results.push(`partial: ${response.data}`);
        }
      }

      expect(results).toHaveLength(3);
      expect(results).toContain('success: success');
      expect(results).toContain('error: TEST_ERROR');
      expect(results).toContain('partial: partial');
    });
  });

  describe('Schema Factory Function Validation', () => {
    it('should create schema for primitive data types', () => {
      const stringSchema = AgentResponseSchema(z.string());
      const numberSchema = AgentResponseSchema(z.number());
      const booleanSchema = AgentResponseSchema(z.boolean());

      expect(stringSchema.safeParse({
        status: 'success',
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);

      expect(numberSchema.safeParse({
        status: 'success',
        data: 42,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);

      expect(booleanSchema.safeParse({
        status: 'success',
        data: true,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);
    });

    it('should create schema for complex object data types', () => {
      const schema = AgentResponseSchema(
        z.object({
          id: z.number(),
          name: z.string(),
          tags: z.array(z.string()),
        })
      );

      const response = {
        status: 'success' as const,
        data: {
          id: 123,
          name: 'test item',
          tags: ['a', 'b', 'c'],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should create schema for union data types', () => {
      const schema = AgentResponseSchema(z.union([z.string(), z.number()]));

      const stringResponse = {
        status: 'success' as const,
        data: 'string data',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const numberResponse = {
        status: 'success' as const,
        data: 42,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(stringResponse).success).toBe(true);
      expect(schema.safeParse(numberResponse).success).toBe(true);
    });

    it('should create schema for optional data fields', () => {
      const schema = AgentResponseSchema(
        z.object({
          required: z.string(),
          optional: z.string().optional(),
        })
      );

      const withOptional = {
        status: 'success' as const,
        data: { required: 'test', optional: 'present' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const withoutOptional = {
        status: 'success' as const,
        data: { required: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(withOptional).success).toBe(true);
      expect(schema.safeParse(withoutOptional).success).toBe(true);
    });

    it('should create schema for nullable data fields', () => {
      const schema = AgentResponseSchema(
        z.object({
          field: z.string().nullable(),
        })
      );

      const withValue = {
        status: 'success' as const,
        data: { field: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const withNull = {
        status: 'success' as const,
        data: { field: null },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(withValue).success).toBe(true);
      expect(schema.safeParse(withNull).success).toBe(true);
    });
  });

  describe('Factory Function Integration Tests', () => {
    it('should validate createSuccessResponse output against schema', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const response = createSuccessResponse(
        { result: 'success' },
        { agentId: 'test', timestamp: Date.now() }
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate createErrorResponse output against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = createErrorResponse('TEST_ERROR', 'Test error', { field: 'value' }, true);

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.details).toEqual({ field: 'value' });
      }
    });

    it('should validate createPartialResponse output against schema', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const response = createPartialResponse({ progress: 0.5 });

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
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
