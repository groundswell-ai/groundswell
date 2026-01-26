# Product Requirement Prompt (PRP): Write Tests for AgentResponse Schema Validation

---

## Goal

**Feature Goal**: Extend the existing `agent-response.test.ts` file with comprehensive test coverage for the strengthened `AgentResponseSchema` validation with `.superRefine()` refinements added in P3.M2.T1.S2.

**Deliverable**: New test cases added to `src/__tests__/unit/agent-response.test.ts` that verify runtime validation catches invalid state combinations (e.g., `status='success'` with `error!=null`).

**Success Definition**:
- [ ] Tests verify `status='success'` with `error!=null` fails validation with descriptive error
- [ ] Tests verify `status='success'` with `data=null` fails validation
- [ ] Tests verify `status='error'` with `data!=null` fails validation with descriptive error
- [ ] Tests verify `status='error'` with `error=null` fails validation
- [ ] Tests verify `status='partial'` with `error!=null` fails validation with descriptive error
- [ ] Tests verify `status='partial'` with `data=null` fails validation
- [ ] All error assertions verify error path points to correct field (`['error']` or `['data']`)
- [ ] All error assertions verify error code is `z.ZodIssueCode.custom`
- [ ] All valid combinations continue to pass validation
- [ ] All existing tests continue to pass (no regressions)
- [ ] Test organization follows existing patterns in the codebase

---

## User Persona

**Target User**: Implementation agent working on P3.M2.T1.S3 (test coverage for schema validation).

**Use Case**: Writing comprehensive tests for runtime validation of `AgentResponseSchema` discriminated union with `.superRefine()` refinements.

**User Journey**:
1. Review existing `agent-response.test.ts` test structure and patterns
2. Review the strengthened schema from P3.M2.T1.S2 (assumed complete)
3. Study Zod refinement testing patterns from research documents
4. Add new test suite for refinement validation
5. Verify all tests pass including existing ones

**Pain Points Addressed**:
- **Test Coverage Gap**: Existing tests don't verify invalid combinations are caught at runtime
- **Regression Prevention**: Ensure refinements work correctly and catch intended invalid states
- **Documentation**: Tests serve as living documentation of validation behavior
- **Error Quality**: Verify error messages are clear and actionable

---

## Why

**Business Value and User Impact**:
- Ensures runtime validation actually catches invalid state combinations
- Prevents regressions if refinements are accidentally modified or removed
- Documents expected validation behavior through executable tests
- Provides confidence that the strengthened schema works as intended

**Integration with Existing Features**:
- Extends existing `src/__tests__/unit/agent-response.test.ts` file
- Uses existing test framework (Vitest) and patterns
- Follows existing test organization and assertion patterns
- Maintains compatibility with all existing tests

**Problems Solved**:
- **Coverage Gap**: Current tests don't verify runtime refinement validation
- **Invalid State Detection**: Tests ensure invalid combinations are actually caught
- **Error Message Quality**: Tests verify errors are descriptive and actionable
- **Regression Prevention**: Tests catch if refinements are accidentally weakened

---

## What

**User-Visible Behavior and Technical Requirements**:

### Current Test Coverage Gap

The existing `agent-response.test.ts` file (lines 1-873) tests:
- Valid success, error, and partial responses
- Discriminated union validation
- Type guard validation
- Factory function validation
- JSON serialization
- PRD 6.4.4 null compliance

**BUT** it does NOT test:
- Invalid state combinations that refinements should catch
- Runtime validation of status/data/error consistency
- Error path and code verification for refinement failures

### Solution: Add Refinement Validation Tests

Add a new describe block to `agent-response.test.ts`:

```typescript
describe('AgentResponse Refinement Validation (P3.M2.T1.S3)', () => {
  describe('success status refinements', () => {
    it('should reject status=success with error!=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should reject status=success with data=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should accept valid success response', () => {
      // Ensure valid responses still pass
    });
  });

  describe('error status refinements', () => {
    it('should reject status=error with data!=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should reject status=error with error=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should accept valid error response', () => {
      // Ensure valid responses still pass
    });
  });

  describe('partial status refinements', () => {
    it('should reject status=partial with error!=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should reject status=partial with data=null', () => {
      // Test that refinement catches this invalid combination
    });

    it('should accept valid partial response', () => {
      // Ensure valid responses still pass
    });
  });
});
```

### Success Criteria

- [ ] New test suite added to `agent-response.test.ts`
- [ ] Tests for all invalid combinations specified in contract
- [ ] Error path assertions verify correct field path
- [ ] Error code assertions verify `custom` code
- [ ] Error message assertions verify descriptive messages
- [ ] Valid combination tests ensure no false positives
- [ ] All existing tests continue to pass
- [ ] New tests fail when refinements are removed (prove they test the refinements)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact existing test file structure and patterns
- Previous PRP output defining what the strengthened schema looks like
- Research on Zod refinement testing patterns
- Research on discriminated union testing patterns
- Research on codebase test patterns
- Complete test implementation blueprint
- Validation commands and expected outputs
- Helper function patterns to follow

---

### Documentation & References

```yaml
# MUST READ - Previous PRP defining strengthened schema
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/PRP.md
  why: Defines what P3.M2.T1.S2 produces (strengthened schema with refinements)
  section: Goal, Success Definition, Implementation Blueprint
  critical: This PRP consumes the output from P3.M2.T1.S2
  note: P3.M2.T1.S2 adds .superRefine() to each union member

# MUST READ - Existing test file structure
- file: src/__tests__/unit/agent-response.test.ts
  why: Contains existing test patterns to follow and extend
  lines: 1-873 (full file)
  pattern: Nested describe blocks, Arrange-Act-Assert, helper functions
  critical: Must add new tests without breaking existing ones

# MUST READ - Zod refinement testing research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/zod-refinement-testing-research.md
  why: Comprehensive research on testing .superRefine() validation
  section: Section 1 (Testing .superRefine()), Section 4 (Error Assertion Patterns)
  critical: Contains specific patterns for testing refinements

# MUST READ - Discriminated union testing research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/discriminated-union-testing-research.md
  why: Testing patterns specific to discriminated unions with refinements
  section: Section 2 (Testing Refinements on Union Variants), Section 3 (Error Path Validation)
  critical: Contains patterns for variant-specific refinement testing

# MUST READ - Codebase test patterns research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/codebase-test-patterns-research.md
  why: Existing test patterns in the codebase to follow
  section: Section 3 (Schema Validation Test Patterns), Section 4 (Error Assertion Patterns)
  critical: Contains codebase-specific patterns and conventions

# REFERENCE - Zod source tests for refinement patterns
- file: node_modules/.ignored/zod/src/v3/tests/refine.test.ts
  why: Examples of .superRefine() testing from Zod itself
  section: Lines 1-100 (basic patterns), Lines 200-300 (error assertions)
  pattern: Using ctx.addIssue() and testing custom error codes

# REFERENCE - Zod discriminated union tests
- file: node_modules/.ignored/zod/src/v3/tests/discriminated-unions.test.ts
  why: Examples of discriminated union testing
  section: Full file for patterns
  pattern: Testing each variant separately, error path validation
```

---

### Current Codebase Tree

```bash
src/
├── __tests__/
│   └── unit/
│       └── agent-response.test.ts           # EXTEND: Add refinement tests
│           ├── Lines 1-873: Existing tests
│           ├── Lines 34-118: Success response tests
│           ├── Lines 120-254: Error response tests
│           ├── Lines 256-313: Partial response tests
│           ├── Lines 578-650: Discriminated union tests
│           └── PATTERN: Nested describe, Arrange-Act-Assert, helper functions
├── types/
│   └── agent.ts                              # REFERENCE: Contains AgentResponseSchema
│       ├── Lines 970-1010+: AgentResponseSchema with .superRefine() (from P3.M2.T1.S2)
│       ├── successSchema with refinement
│       ├── errorSchema with refinement
│       └── partialSchema with refinement
```

---

### Desired Codebase Tree with Changes

```bash
# MODIFIED FILE: src/__tests__/unit/agent-response.test.ts

# ADD TO END OF FILE (after line 872):

describe('AgentResponse Refinement Validation (P3.M2.T1.S3)', () => {
  // Helper function to create test responses
  function createTestResponse<T>(
    status: 'success' | 'error' | 'partial',
    data: T | null,
    error: any,
    metadata?: any
  ): any {
    return {
      status,
      data,
      error,
      metadata: metadata || { agentId: 'test', timestamp: Date.now() }
    };
  }

  describe('success status refinements', () => {
    it('should reject status=success with error!=null', () => {
      // Test implementation
    });

    it('should reject status=success with data=null', () => {
      // Test implementation
    });

    it('should accept valid success response', () => {
      // Test implementation
    });
  });

  describe('error status refinements', () => {
    it('should reject status=error with data!=null', () => {
      // Test implementation
    });

    it('should reject status=error with error=null', () => {
      // Test implementation
    });

    it('should accept valid error response', () => {
      // Test implementation
    });
  });

  describe('partial status refinements', () => {
    it('should reject status=partial with error!=null', () => {
      // Test implementation
    });

    it('should reject status=partial with data=null', () => {
      // Test implementation
    });

    it('should accept valid partial response', () => {
      // Test implementation
    });
  });
});
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use .safeParse() not .parse() for refinement testing
// .safeParse() returns { success: boolean, data?: T, error?: ZodError }
// .parse() throws ZodError on failure (harder to test error properties)

// CRITICAL: Always check result.success before accessing error properties
// TypeScript doesn't narrow based on result.success
// Use if (!result.success) { ... } to access result.error

// CRITICAL: Refinement errors have code: 'custom'
// Not 'invalid_type' or other built-in codes
// Check result.error.errors[0].code === 'custom'

// CRITICAL: Error path depends on refinement
// successSchema refinement on error field: path is ['error']
// errorSchema refinement on data field: path is ['data']
// partialSchema refinement on error field: path is ['error']

// CRITICAL: Existing tests MUST continue to pass
// New tests should only add coverage, not break existing tests
// Run full test suite after adding tests

// CRITICAL: Test framework is Vitest
// Import from 'vitest': describe, it, expect
// Use describe, it (not test)
// Use expect().toBe() not expect().to.equal()

// CRITICAL: Test file location
// Add to src/__tests__/unit/agent-response.test.ts
// Do NOT create new test file
// Extend existing file

// CRITICAL: Test organization
// Follow existing pattern: nested describe blocks
// Group tests by status type (success, error, partial)
// Use descriptive test names

// CRITICAL: Error message format from P3.M2.T1.S2
// "Invalid state: status='success' but error is non-null (must be null)"
// "Invalid state: status='error' but data is non-null (must be null)"
// "Invalid state: status='partial' but error is non-null (must be null)"

// CRITICAL: Discriminated union optimization
// Zod validates discriminator first
// Only matched variant's refinements run
// This means status='success' only runs successSchema refinements

// CRITICAL: Helper function pattern
// Follow existing pattern: createTestResponse<T>()
// Provide default values for optional parameters
// Use descriptive names

// CRITICAL: Data schema choice
// Use simple schemas for tests: z.string(), z.number()
// Don't test data schema validation (already covered)
// Focus on refinement validation only

// CRITICAL: Metadata is optional
// Tests can include or exclude metadata
// Refinements don't validate metadata

// CRITICAL: Zod version is 3.25.76
// Has full .superRefine() support
// No workarounds needed

// CRITICAL: Previous PRP (P3.M2.T1.S2) defines the schema
// Assume it's implemented exactly as specified
// .superRefine() on each union member
// Error messages as specified
// Error paths as specified
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. Tests use existing `AgentResponseSchema` from P3.M2.T1.S2:

```typescript
// From P3.M2.T1.S2 - assumed to be implemented
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='success' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.data !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='error' but data is non-null (must be null)",
        path: ['data'],
      });
    }
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='partial' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ existing test file thoroughly
  - FILE: src/__tests__/unit/agent-response.test.ts
  - UNDERSTAND: Test structure and organization
  - UNDERSTAND: Helper function patterns
  - UNDERSTAND: Assertion patterns
  - UNDERSTAND: Import statements
  - IDENTIFY: Where to add new tests (at end of file)
  - DOCUMENT: Existing test patterns to follow

Task 2: READ previous PRP (P3.M2.T1.S2)
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/PRP.md
  - SECTION: Goal, Implementation Blueprint
  - UNDERSTAND: What refinements were added
  - UNDERSTAND: Error message format
  - UNDERSTAND: Error path specification
  - UNDERSTAND: Which combinations should fail

Task 3: READ research documents
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/zod-refinement-testing-research.md
  - SECTION: Section 4 (Error Assertion Patterns)
  - UNDERSTAND: How to test refinement errors
  - UNDERSTAND: Error structure and properties

  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/discriminated-union-testing-research.md
  - SECTION: Section 2 (Testing Refinements on Union Variants)
  - UNDERSTAND: Variant-specific testing patterns

  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S3/research/codebase-test-patterns-research.md
  - SECTION: Section 4 (Error Assertion Patterns)
  - UNDERSTAND: Codebase-specific assertion patterns

Task 4: CREATE helper function for test responses
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Inside new describe block
  - ADD: createTestResponse<T>() helper function
  - PATTERN: Follow existing helper function pattern
  - PARAMETERS: status, data, error, metadata (optional)
  - RETURNS: Test response object

Task 5: WRITE tests for success status refinement - error!=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: New describe block for success refinements
  - ADD: it('should reject status=success with error!=null', ...)
  - ARRANGE: Create response with status='success', data='test', error={...}
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['error']
  - ASSERT: result.error.errors[0].code is 'custom'
  - ASSERT: result.error.errors[0].message contains 'success' and 'error'
  - PATTERN: Follow codebase test patterns

Task 6: WRITE tests for success status refinement - data=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for success refinements
  - ADD: it('should reject status=success with data=null', ...)
  - ARRANGE: Create response with status='success', data=null, error=null
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['data']
  - ASSERT: result.error.errors[0].code is 'invalid_type' (not custom, from z.null())
  - PATTERN: Follow codebase test patterns

Task 7: WRITE tests for valid success response
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for success refinements
  - ADD: it('should accept valid success response', ...)
  - ARRANGE: Create valid response with status='success', data='test', error=null
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is true
  - ASSERT: result.data.status is 'success'
  - ASSERT: result.data.data is 'test'
  - ASSERT: result.data.error is null
  - PATTERN: Follow codebase test patterns

Task 8: WRITE tests for error status refinement - data!=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: New describe block for error refinements
  - ADD: it('should reject status=error with data!=null', ...)
  - ARRANGE: Create response with status='error', data='test', error={...}
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['data']
  - ASSERT: result.error.errors[0].code is 'custom'
  - ASSERT: result.error.errors[0].message contains 'error' and 'data'
  - PATTERN: Follow codebase test patterns

Task 9: WRITE tests for error status refinement - error=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for error refinements
  - ADD: it('should reject status=error with error=null', ...)
  - ARRANGE: Create response with status='error', data=null, error=null
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['error']
  - ASSERT: result.error.errors[0].code is 'invalid_type' (not custom, from AgentErrorDetailsSchema)
  - PATTERN: Follow codebase test patterns

Task 10: WRITE tests for valid error response
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for error refinements
  - ADD: it('should accept valid error response', ...)
  - ARRANGE: Create valid response with status='error', data=null, error={...}
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is true
  - ASSERT: result.data.status is 'error'
  - ASSERT: result.data.data is null
  - ASSERT: result.data.error is not null
  - PATTERN: Follow codebase test patterns

Task 11: WRITE tests for partial status refinement - error!=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: New describe block for partial refinements
  - ADD: it('should reject status=partial with error!=null', ...)
  - ARRANGE: Create response with status='partial', data='test', error={...}
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['error']
  - ASSERT: result.error.errors[0].code is 'custom'
  - ASSERT: result.error.errors[0].message contains 'partial' and 'error'
  - PATTERN: Follow codebase test patterns

Task 12: WRITE tests for partial status refinement - data=null
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for partial refinements
  - ADD: it('should reject status=partial with data=null', ...)
  - ARRANGE: Create response with status='partial', data=null, error=null
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is false
  - ASSERT: result.error.errors[0].path is ['data']
  - ASSERT: result.error.errors[0].code is 'invalid_type' (not custom, from z.null())
  - PATTERN: Follow codebase test patterns

Task 13: WRITE tests for valid partial response
  - FILE: src/__tests__/unit/agent-response.test.ts
  - LOCATION: Same describe block for partial refinements
  - ADD: it('should accept valid partial response', ...)
  - ARRANGE: Create valid response with status='partial', data='test', error=null
  - ACT: Call schema.safeParse(response)
  - ASSERT: result.success is true
  - ASSERT: result.data.status is 'partial'
  - ASSERT: result.data.data is 'test'
  - ASSERT: result.data.error is null
  - PATTERN: Follow codebase test patterns

Task 14: RUN all tests
  - COMMAND: npm test
  - EXPECTED: All tests pass
  - VERIFY: New refinement tests fail invalid combinations
  - VERIFY: New refinement tests pass valid combinations
  - VERIFY: All existing tests still pass
  - FIX: Any failures

Task 15: RUN specific agent-response tests
  - COMMAND: npm test -- agent-response.test.ts
  - EXPECTED: All AgentResponse tests pass
  - VERIFY: No regressions in schema validation

Task 16: VERIFY test coverage
  - COMMAND: npm test -- --coverage
  - EXPECTED: Coverage for refinement code
  - VERIFY: New tests cover refinement validation
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Helper function for test responses
// Location: Inside new describe block

function createTestResponse<T>(
  status: 'success' | 'error' | 'partial',
  data: T | null,
  error: any,
  metadata?: any
): any {
  return {
    status,
    data,
    error,
    metadata: metadata || { agentId: 'test', timestamp: Date.now() }
  };
}

// GOTCHA: Use simple schemas for tests
// Don't test data schema validation (already covered)
// Focus on refinement validation only

// PATTERN 2: Test for invalid combination (success with error)
// Location: New describe block for success refinements

it('should reject status=success with error!=null', () => {
  // Arrange
  const schema = AgentResponseSchema(z.string());
  const response = createTestResponse(
    'success',
    'test data',
    { code: 'ERROR', message: 'test error', recoverable: false }
  );

  // Act
  const result = schema.safeParse(response);

  // Assert
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].path).toEqual(['error']);
    expect(result.error.errors[0].code).toBe('custom');
    expect(result.error.errors[0].message).toContain('success');
    expect(result.error.errors[0].message).toContain('error');
    expect(result.error.errors[0].message).toContain('null');
  }
});

// PATTERN 3: Test for invalid combination (success with null data)
// Location: Same describe block for success refinements

it('should reject status=success with data=null', () => {
  // Arrange
  const schema = AgentResponseSchema(z.string());
  const response = createTestResponse('success', null, null);

  // Act
  const result = schema.safeParse(response);

  // Assert
  expect(result.success).toBe(false);
  if (!result.success) {
    // This is a type error, not a refinement error
    // Error code is 'invalid_type' not 'custom'
    expect(result.error.errors[0].path).toEqual(['data']);
    expect(result.error.errors[0].code).toBe('invalid_type');
  }
});

// PATTERN 4: Test for valid combination
// Location: Same describe block for success refinements

it('should accept valid success response', () => {
  // Arrange
  const schema = AgentResponseSchema(z.string());
  const response = createTestResponse('success', 'test data', null);

  // Act
  const result = schema.safeParse(response);

  // Assert
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.status).toBe('success');
    expect(result.data.data).toBe('test data');
    expect(result.data.error).toBeNull();
  }
});

// PATTERN 5: Test for error status refinement
// Location: New describe block for error refinements

it('should reject status=error with data!=null', () => {
  // Arrange
  const schema = AgentResponseSchema(z.unknown());
  const response = createTestResponse(
    'error',
    'should be null',
    { code: 'E', message: 'm', details: null, recoverable: false }
  );

  // Act
  const result = schema.safeParse(response);

  // Assert
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].path).toEqual(['data']);
    expect(result.error.errors[0].code).toBe('custom');
    expect(result.error.errors[0].message).toContain('error');
    expect(result.error.errors[0].message).toContain('data');
  }
});

// PATTERN 6: Test for partial status refinement
// Location: New describe block for partial refinements

it('should reject status=partial with error!=null', () => {
  // Arrange
  const schema = AgentResponseSchema(z.string());
  const response = createTestResponse(
    'partial',
    'test data',
    { code: 'E', message: 'm', details: null, recoverable: false }
  );

  // Act
  const result = schema.safeParse(response);

  // Assert
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].path).toEqual(['error']);
    expect(result.error.errors[0].code).toBe('custom');
    expect(result.error.errors[0].message).toContain('partial');
    expect(result.error.errors[0].message).toContain('error');
  }
});

// GOTCHA: Always check result.success before accessing error
// TypeScript doesn't narrow based on result.success
// Use if (!result.success) { ... } to access result.error

// GOTCHA: Refinement errors have code: 'custom'
// Type errors have code: 'invalid_type'
// Distinguish between refinement failures and type mismatches

// GOTCHA: Error path points to refined field
// successSchema refinement on error: path is ['error']
// errorSchema refinement on data: path is ['data']
// partialSchema refinement on error: path is ['error']

// GOTCHA: Use simple data schemas
// z.string() for success and partial
// z.unknown() for error (data is null anyway)
// Don't test data schema validation

// PATTERN 7: Test organization
// Location: New top-level describe block

describe('AgentResponse Refinement Validation (P3.M2.T1.S3)', () => {
  describe('success status refinements', () => {
    // Success refinement tests
  });

  describe('error status refinements', () => {
    // Error refinement tests
  });

  describe('partial status refinements', () => {
    // Partial refinement tests
  });
});

// GOTCHA: Add to existing file, don't create new file
// Add to src/__tests__/unit/agent-response.test.ts
// Add after existing tests (after line 872)
```

---

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - This is test code only
  - No external service dependencies
  - No configuration changes
  - No new dependencies

INTERNAL INTEGRATIONS:
  - AgentResponseSchema (src/types/agent.ts)
    - Uses strengthened schema from P3.M2.T1.S2
    - Must have .superRefine() on each union member
    - Tests verify refinements work correctly
  - Existing test suite (src/__tests__/unit/agent-response.test.ts)
    - Must extend existing tests
    - Must not break existing tests
    - Must follow existing patterns

SCOPE BOUNDARIES:
  - ONLY modify src/__tests__/unit/agent-response.test.ts
  - ADD new describe block for refinement tests
  - DON'T modify any other files
  - DON'T modify existing tests
  - DON'T create new test file

BACKWARD COMPATIBILITY:
  - MUST maintain all existing test behavior
  - MUST not break existing tests
  - MUST only add new test coverage
  - MUST follow existing test patterns

RELATED WORK:
  - P3.M2.T1.S1: Refactor AgentResponse as discriminated union (COMPLETED)
    - Added compile-time type safety
  - P3.M2.T1.S2: Add Zod refinement for AgentResponse validation (IN PROGRESS)
    - Adds runtime validation with .superRefine()
    - This PRP tests the refinements from P3.M2.T1.S2

FILES TO MODIFY:
  - src/__tests__/unit/agent-response.test.ts (add refinement tests)

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/types/agent.ts (modified by P3.M2.T1.S2)
  - Any other test files
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# Expected: Zero errors
# If errors exist:
# 1. READ the error messages carefully
# 2. VERIFY errors are in test file
# 3. FIX any type errors before proceeding

# Run linter
npm run lint

# Expected: Zero errors in test file
# Fix any linting issues

# Run formatter
npm run format  # if exists

# Expected: Consistent formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests to verify no regressions
npm test

# Expected: All tests pass
# Verify: No existing tests broken
# Verify: New refinement tests fail invalid combinations
# Verify: New refinement tests pass valid combinations

# Run specific test file for AgentResponse
npm test -- agent-response.test.ts

# Expected: All AgentResponse tests pass
# Verify: Schema validation tests pass
# Verify: Refinement tests pass
# Verify: Factory function tests pass

# Run tests with coverage
npm test -- --coverage

# Expected: Coverage maintained or improved
# Verify: New refinement code is covered
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all tests in __tests__/unit/
npm test -- unit/

# Expected: All unit tests pass
# Verify: No regressions in unit tests

# Run full test suite
npm test

# Expected: All tests pass
# Verify: No test failures
# Verify: No skipped tests
# Verify: No timeout errors
```

### Level 4: Manual Verification (Refinement-Specific)

```bash
# Create a test script to verify refinements work
cat > /tmp/test-refinements.js << 'EOF'
import { AgentResponseSchema } from './src/types/agent.js';
import { z } from 'zod';

const schema = AgentResponseSchema(z.string());

// Test 1: Invalid success with error
console.log('Test 1: status=success with error!=null');
const result1 = schema.safeParse({
  status: 'success',
  data: 'test',
  error: { code: 'E', message: 'm', details: null, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result1.success);
if (!result1.success) {
  console.log('Error path:', result1.error.errors[0].path);
  console.log('Error message:', result1.error.errors[0].message);
}

// Test 2: Invalid error with data
console.log('\nTest 2: status=error with data!=null');
const result2 = schema.safeParse({
  status: 'error',
  data: 'test',
  error: { code: 'E', message: 'm', details: null, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result2.success);
if (!result2.success) {
  console.log('Error path:', result2.error.errors[0].path);
  console.log('Error message:', result2.error.errors[0].message);
}

// Test 3: Valid success
console.log('\nTest 3: valid success');
const result3 = schema.safeParse({
  status: 'success',
  data: 'test',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result3.success);
EOF

# Run manual test
node --loader tsx /tmp/test-refinements.js

# Expected:
# Test 1: Success: false, Error path: ['error']
# Test 2: Success: false, Error path: ['data']
# Test 3: Success: true

# Clean up
rm /tmp/test-refinements.js
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiler passes: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test`
- [ ] New refinement tests pass: `npm test -- agent-response.test.ts`
- [ ] Linter passes: `npm run lint`
- [ ] Formatter passes: `npm run format` (if exists)
- [ ] No breaking changes to existing tests

### Refinement Validation

- [ ] Test for `status='success'` with `error!=null` fails validation
- [ ] Test for `status='success'` with `data=null` fails validation
- [ ] Test for `status='error'` with `data!=null` fails validation
- [ ] Test for `status='error'` with `error=null` fails validation
- [ ] Test for `status='partial'` with `error!=null` fails validation
- [ ] Test for `status='partial'` with `data=null` fails validation
- [ ] Error paths point to correct field (`['error']` or `['data']`)
- [ ] Error codes are `z.ZodIssueCode.custom` for refinements
- [ ] Error messages contain status and field information
- [ ] Valid combinations continue to pass

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Invalid combinations caught at runtime
- [ ] Clear, actionable error messages
- [ ] Existing tests still pass (no regressions)
- [ ] New tests cover all refinement scenarios
- [ ] Test organization follows existing patterns

### Code Quality Validation

- [ ] Code follows existing test patterns in codebase
- [ ] Test names are descriptive and clear
- [ ] Helper functions follow existing patterns
- [ ] Error assertions follow existing patterns
- [ ] No code duplication
- [ ] Consistent test structure

### Documentation & Deployment

- [ ] Tests serve as documentation of validation behavior
- [ ] Test names clearly indicate what is being tested
- [ ] No deployment notes needed (test changes only)

---

## Anti-Patterns to Avoid

- ❌ Don't create a new test file (extend existing agent-response.test.ts)
- ❌ Don't modify existing tests (only add new ones)
- ❌ Don't use `.parse()` instead of `.safeParse()` for error testing
- ❌ Don't forget to check `result.success` before accessing `result.error`
- ❌ Don't skip error path assertions
- ❌ Don't skip error code assertions
- ❌ Don't skip error message assertions
- ❌ Don't test data schema validation (already covered)
- ❌ Don't use complex data schemas (keep it simple)
- ❌ Don't modify PRD.md or tasks.json (read-only files)
- ❌ Don't break existing tests
- ❌ Don't add tests without proper error assertions
- ❌ Don't forget to test valid combinations too
- ❌ Don't use vague test names
- ❌ Don't skip testing all three status types

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Existing test file structure thoroughly analyzed
- ✅ Previous PRP output clearly defines schema structure
- ✅ Zod refinement testing patterns researched and documented
- ✅ Discriminated union testing patterns documented
- ✅ Codebase test patterns catalogued
- ✅ Clear implementation blueprint with ordered tasks
- ✅ Specific test patterns provided
- ✅ Comprehensive validation checklist
- ✅ Integration points identified
- ✅ No breaking changes to existing code
- ✅ Minimal risk (only adds tests, doesn't modify schema)
- ✅ Research documents provide detailed examples

**Risk Assessment**: Minimal risk
- Only adds test coverage, doesn't modify production code
- All existing tests should pass without modification
- Worst case: remove new tests if they fail
- Cannot break existing functionality

**Validation**: This is a focused test addition to verify the refinements added in P3.M2.T1.S2 work correctly. The change is localized to the test file. All existing code and tests should continue to work. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
