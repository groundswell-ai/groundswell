# Test Patterns Research for AgentResponse Schema Validation

**Date:** January 26, 2026
**Work Item:** P3.M2.T1.S2 - Add Zod refinement for validation
**Research Agent:** Codebase analysis of existing test patterns

---

## Executive Summary

This document catalogs the existing test patterns used in the Groundswell codebase for schema validation, Zod testing, and discriminated union testing. These patterns should be followed when writing tests for the new refinement validation in `AgentResponseSchema`.

---

## 1. Testing Framework

**Framework:** Vitest
**Configuration:** `vitest.config.ts`
**Test Location:** `src/__tests__/**/*.test.ts`
**Globals:** Enabled (describe, it, expect available globally)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- agent-response.test.ts

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

---

## 2. Test File Organization

### Directory Structure

```
src/__tests__/
├── unit/                    # Unit tests for individual functions/classes
│   ├── agent-response.test.ts
│   ├── agent-response-factory.test.ts
│   ├── agent-response-public-api.test.ts
│   └── utils/
│       └── agent-validation.test.ts
├── integration/             # Integration tests for component interactions
│   ├── agent-workflow.test.ts
│   └── provider-agent.test.ts
└── adversarial/             # Edge case and adversarial testing
    └── agent-response-edge-cases.test.ts
```

### File Naming Conventions

- Unit tests: `{feature}.test.ts` or `{class}.test.ts`
- Integration tests: `{integration-point}.test.ts`
- Adversarial tests: `{feature}-edge-cases.test.ts`

---

## 3. Schema Validation Test Patterns

### Pattern 1: Helper Functions for Test Data

**From:** `src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('validateAgentResponse', () => {
  // Helper functions to create test data
  function createSuccessResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
    return {
      status: 'success',
      data,
      error: null,
      metadata: { agentId, timestamp: Date.now() },
    };
  }

  function createErrorResponse(
    code: string = 'TEST_ERROR',
    message: string = 'Test error',
    agentId: string = 'test-agent'
  ): AgentResponse<null> {
    return {
      status: 'error',
      data: null,
      error: { code, message, details: null, recoverable: false },
      metadata: { agentId, timestamp: Date.now() },
    };
  }

  // Use helpers in tests
  it('should validate success response', () => {
    const response = createSuccessResponse({ result: 'test' });
    const result = validateAgentResponse(response);
    expect(result.valid).toBe(true);
  });
});
```

**Best Practices:**
- Create helper functions for common test data
- Provide default values for optional parameters
- Use descriptive names that indicate the response type
- Include all required fields (status, data, error, metadata)

---

### Pattern 2: Arrange-Act-Assert Structure

**From:** `src/__tests__/unit/agent-response.test.ts`

```typescript
describe('AgentResponse Schema Validation', () => {
  describe('Success Response Validation', () => {
    it('should validate success response with all required fields', () => {
      // Arrange
      const schema = AgentResponseSchema(z.object({ result: z.string() }));
      const response = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      // Act
      const result = schema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(response);
      }
    });
  });
});
```

**Best Practices:**
- Use comments to mark Arrange, Act, Assert sections
- Use `safeParse` for validation tests (not `parse`)
- Check `result.success` before accessing `result.data`
- Use `toEqual` for deep equality checks

---

### Pattern 3: Testing Invalid Inputs

**From:** `src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('validation failures - wrong data types', () => {
  it('should return valid=false when data type does not match schema', () => {
    // Arrange
    const response = createSuccessResponse({ result: 42 }); // number, not string
    const schema = z.object({ result: z.string() });

    // Act
    const result = validateAgentResponse(response, schema);

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.errors).toBeInstanceOf(Array);
    expect(result.errors?.errors.length).toBeGreaterThan(0);
    expect(result.errors?.errors[0].code).toBe('invalid_type');
  });
});
```

**Best Practices:**
- Test specific failure scenarios
- Check that errors array is populated
- Verify error code (e.g., 'invalid_type', 'custom')
- Check error path for field-level errors
- Use descriptive test names that indicate what's being tested

---

### Pattern 4: Testing Discriminated Unions

**From:** Zod test files in node_modules

```typescript
describe('discriminated union validation', () => {
  it('should validate correct union member', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('a'), a: z.string() }),
      z.object({ type: z.literal('b'), b: z.number() }),
    ]);

    const result = schema.safeParse({ type: 'a', a: 'test' });

    expect(result.success).toBe(true);
  });

  it('should reject invalid discriminator value', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('a'), a: z.string() }),
      z.object({ type: z.literal('b'), b: z.number() }),
    ]);

    const result = schema.safeParse({ type: 'x', a: 'test' });

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].code).toBe('invalid_union_discriminator');
  });
});
```

**Best Practices:**
- Test each union member separately
- Test invalid discriminator values
- Test wrong fields for correct discriminator
- Check for 'invalid_union_discriminator' error code

---

### Pattern 5: Testing Refinements

**From:** `src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
it('should respect schema refinements', () => {
  // Arrange
  const response = createSuccessResponse(5); // data is 5
  const schema = z.number().refine(n => n >= 10, {
    message: 'Number must be at least 10'
  });

  // Act
  const result = validateAgentResponse(response, schema);

  // Assert
  expect(result.valid).toBe(false);
  expect(result.errors?.errors[0].message).toContain('at least 10');
});
```

**Best Practices:**
- Test refinement failure conditions
- Verify error message content
- Test refinement success conditions
- Test edge cases (boundary values)

---

### Pattern 6: Error Assertion Patterns

**From:** Multiple test files

```typescript
// Comprehensive error checking
expect(result.valid).toBe(false);
expect(result.errors).toBeDefined();
expect(result.errors?.errors).toBeInstanceOf(Array);
expect(result.errors?.errors.length).toBeGreaterThan(0);

// Specific error checks
expect(result.errors?.errors[0].code).toBe('invalid_type');
expect(result.errors?.errors[0].path).toEqual(['data', 'field']);
expect(result.errors?.errors[0].message).toContain('expected message');

// Multiple errors
expect(result.errors?.errors.length).toBe(2);
expect(result.errors?.errors[0].path).toEqual(['field1']);
expect(result.errors?.errors[1].path).toEqual(['field2']);
```

**Best Practices:**
- Always check `success` or `valid` first
- Check that errors array exists and is not empty
- Verify error code for expected error type
- Check error path for field-level errors
- Verify error message content
- Handle multiple errors when appropriate

---

### Pattern 7: Testing with Type Guards

**From:** `src/__tests__/unit/agent-response.test.ts`

```typescript
describe('type guards', () => {
  it('should narrow type with isSuccess', () => {
    const response: AgentResponse<string> = createSuccessResponse('test');

    if (isSuccess(response)) {
      // TypeScript knows: response.data is string, response.error is null
      expect(response.data.toUpperCase()).toBe('TEST');
      expect(response.error).toBe(null);
    }
  });

  it('should narrow type with isError', () => {
    const response: AgentResponse<string> = createErrorResponse();

    if (isError(response)) {
      // TypeScript knows: response.data is null, response.error is AgentErrorDetails
      expect(response.data).toBe(null);
      expect(response.error.code).toBe('TEST_ERROR');
    }
  });
});
```

**Best Practices:**
- Test type guard behavior
- Verify type narrowing works correctly
- Test that type guards return correct boolean
- Use type guards in assertions

---

### Pattern 8: Testing Deterministic Behavior

**From:** `src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
it('should be deterministic (same input → same output)', () => {
  const response = createSuccessResponse('test');
  const schema = z.string();

  const result1 = validateAgentResponse(response, schema);
  const result2 = validateAgentResponse(response, schema);

  expect(result1).toStrictEqual(result2);
});
```

**Best Practices:**
- Test that validation is deterministic
- Use `toStrictEqual` for deep equality
- Test multiple calls with same input

---

### Pattern 9: Adversarial Testing

**From:** `src/__tests__/adversarial/agent-response-edge-cases.test.ts`

```typescript
describe('edge cases', () => {
  it('should handle undefined metadata (Zod optional strips undefined)', () => {
    const schema = AgentResponseSchema(z.string());

    const response = {
      status: 'success' as const,
      data: 'test data',
      error: null,
      metadata: undefined, // Zod's optional() strips undefined
    } as any;

    const result = schema.safeParse(response);

    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const schema = AgentResponseSchema(z.string());

    const invalidResponse = {
      status: 'success',
      data: 'test',
      // Missing error field
      metadata: { agentId: 'test', timestamp: Date.now() },
    } as any;

    const result = schema.safeParse(invalidResponse);

    expect(result.success).toBe(false);
  });
});
```

**Best Practices:**
- Test undefined/null handling
- Test missing required fields
- Test wrong types for fields
- Test boundary conditions
- Test with `as any` to bypass type checking

---

### Pattern 10: Integration Testing with Workflows

**From:** `src/__tests__/unit/workflow-validation.test.ts`

```typescript
it('should emit invalidResponse event when validation fails', async () => {
  // Arrange
  const { workflow, events } = createWorkflowWithEventSpy();
  const invalidResponse = createMockInvalidResponse('status');

  // Act
  const result = await workflow.validateAgentResponse(invalidResponse);

  // Assert
  expect(result).toBe(false);
  expect(events.emit).toHaveBeenCalledWith({
    type: 'invalidResponse',
    node: expect.anything(),
    response: invalidResponse,
    agentId: 'test-agent',
    errors: expect.any(ZodError),
    timestamp: expect.any(Number),
  });
});
```

**Best Practices:**
- Test integration with other components
- Use spies/mocks for event emission
- Verify side effects (events, state changes)
- Test with real-world scenarios

---

## 4. Test Naming Conventions

### Describe Block Names

- **Function testing:** `{functionName}` - e.g., `describe('validateAgentResponse', ...)`
- **Feature testing:** `{feature} {aspect}` - e.g., `describe('Schema Validation', ...)`
- **Scenario grouping:** `{scenario} tests` - e.g., `describe('validation failures', ...)`

### Test (It) Block Names

- **Positive tests:** `should {expected outcome}` - e.g., `it('should validate success response', ...)`
- **Negative tests:** `should reject {invalid input}` - e.g., `it('should reject missing required fields', ...)`
- **Edge cases:** `should handle {edge case}` - e.g., `it('should handle undefined metadata', ...)`
- **Type guards:** `should narrow type with {functionName}` - e.g., `it('should narrow type with isSuccess', ...)`

---

## 5. Common Test Utilities

### Response Creation Helpers

```typescript
// Success response
createSuccessResponse(data, metadata?)

// Error response
createErrorResponse(errorCode, message, details?, recoverable?, metadata?)

// Partial response
createPartialResponse(data, metadata?)
```

### Type Guards

```typescript
isSuccess(response)
isError(response)
isPartial(response)
```

### Schema Creation

```typescript
AgentResponseSchema(dataSchema)
z.object({...})
z.string()
z.number()
z.null()
```

---

## 6. Recommended Test Structure for Refinement Tests

Based on existing patterns, here's the recommended structure for testing the new refinement validation:

```typescript
describe('AgentResponseSchema refinement validation', () => {
  // Helper functions
  function createSuccessResponse<T>(data: T, error: any = null): any {
    return {
      status: 'success',
      data,
      error,
      metadata: { agentId: 'test', timestamp: Date.now() }
    };
  }

  function createErrorResponse(data: any = null, error?: any): any {
    return {
      status: 'error',
      data,
      error: error || { code: 'E', message: 'm', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    };
  }

  // Success status refinement tests
  describe('success status refinements', () => {
    it('should accept valid success response', () => {
      const schema = AgentResponseSchema(z.string());
      const response = createSuccessResponse('test', null);

      const result = schema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should reject status=success with error!=null', () => {
      const schema = AgentResponseSchema(z.string());
      const response = createSuccessResponse('test', { code: 'E', message: 'm', recoverable: false });

      const result = schema.safeParse(response);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['error']);
        expect(result.error.errors[0].code).toBe('custom');
      }
    });
  });

  // Error status refinement tests
  describe('error status refinements', () => {
    it('should accept valid error response', () => {
      const schema = AgentResponseSchema(z.string());
      const response = createErrorResponse(null);

      const result = schema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it('should reject status=error with data!=null', () => {
      const schema = AgentResponseSchema(z.string());
      const response = createErrorResponse('test');

      const result = schema.safeParse(response);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['data']);
        expect(result.error.errors[0].code).toBe('custom');
      }
    });
  });
});
```

---

## 7. Test Coverage Goals

Based on existing test patterns, aim for:

### Coverage Areas

1. **Happy Path:** All valid combinations pass
2. **Invalid Combinations:** All invalid combinations fail with appropriate errors
3. **Error Messages:** Error messages are clear and actionable
4. **Error Paths:** Errors point to the correct field
5. **Edge Cases:** Boundary conditions, null handling, undefined handling
6. **Integration:** Works with existing validation utilities

### Coverage Metrics

- **Line Coverage:** >90% for new refinement code
- **Branch Coverage:** 100% for all refinement branches
- **Function Coverage:** 100% for refinement functions

---

## 8. Summary

### Key Patterns to Follow

1. **Arrange-Act-Assert** structure for clarity
2. **Helper functions** for common test data
3. **safeParse** instead of `parse` for validation tests
4. **Comprehensive error checking** (code, path, message)
5. **Descriptive test names** that indicate what's being tested
6. **Type guards** for type narrowing tests
7. **Adversarial testing** for edge cases
8. **Integration testing** for workflow validation

### Files to Reference

- `src/__tests__/unit/utils/agent-validation.test.ts` - Validation test patterns
- `src/__tests__/unit/agent-response.test.ts` - Schema test patterns
- `src/__tests__/adversarial/agent-response-edge-cases.test.ts` - Edge case patterns
- `src/__tests__/unit/workflow-validation.test.ts` - Integration patterns

---

**End of Research Document**
