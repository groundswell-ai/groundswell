# Error Testing Patterns - Research Notes

## Vitest Error Testing Best Practices

### 1. Basic Error Assertions

```typescript
// Test function throws error
expect(() => riskyFunction()).toThrow();
expect(() => riskyFunction()).toThrow(Error);
expect(() => riskyFunction()).toThrow('specific message');
expect(() => riskyFunction()).toThrow(/message regex/);

// Async error testing
await expect(asyncFunction()).rejects.toThrow();
await expect(asyncFunction()).rejects.toThrow('specific error');
```

### 2. Error Property Testing

```typescript
// Verify error has specific properties
expect(error).toHaveProperty('message');
expect(error).toHaveProperty('code', 'ERROR_CODE');
expect(error).toMatchObject({
  code: 'TEST_CODE',
  recoverable: true
});
```

### 3. Zod safeParse Testing Pattern

```typescript
const schema = AgentResponseSchema(z.object({ result: z.string() }));
const result = schema.safeParse(response);

expect(result.success).toBe(true);  // or false for invalid
if (result.success) {
  expect(result.data.status).toBe('success');
} else {
  expect(result.error.issues).toHaveLength(1);
}
```

## Existing Test Patterns in Codebase

### Error Response Factory Tests

**File**: `src/__tests__/unit/agent-response-factory.test.ts` (lines 84-138)

```typescript
it('should create an error response with details', () => {
  const details = { field: 'value', errors: ['missing'] };
  const response = createErrorResponse(
    'VALIDATION_FAILED',
    'Validation error occurred',
    details,
    true  // recoverable
  );

  expect(response.status).toBe('error');
  expect(response.data).toBeNull();
  expect(response.error?.code).toBe('VALIDATION_FAILED');
  expect(response.error?.message).toBe('Validation error occurred');
  expect(response.error?.details).toEqual(details);
  expect(response.error?.recoverable).toBe(true);
});
```

### Error Code Validation Tests

**File**: `src/__tests__/unit/agent-response-factory.test.ts` (lines 99-105)

```typescript
it('should use SCREAMING_SNAKE_CASE for error codes', () => {
  const validCodes = Object.values(AGENT_ERROR_CODES);

  validCodes.forEach((code) => {
    expect(code).toMatch(/^[A-Z][A-Z_]*$/);
  });
});
```

### Internal Error Tests

**File**: `src/__tests__/unit/agent.test.ts` (lines 603-684)

```typescript
it('should return INTERNAL_ERROR for invalid responses', () => {
  const invalidResponse: AgentResponse<{ result: string }> = {
    status: 'success',
    data: { result: 'hello' },
    error: {
      code: 'ERROR',
      message: 'This should be null for success',
      recoverable: false,
    },
    metadata: { agentId: agent.id, timestamp: Date.now() },
  };

  const dataSchema = z.object({ result: z.string() });
  const result = (agent as any).validateResponse(invalidResponse, dataSchema);

  expect(result.status).toBe('error');
  expect(result.error?.code).toBe('INTERNAL_ERROR');
  expect(result.error?.recoverable).toBe(false);
});
```

## Testing Error Codes

### Format Validation

```typescript
it('should use SCREAMING_SNAKE_CASE for error codes', () => {
  const validCodes = Object.values(AGENT_ERROR_CODES);

  validCodes.forEach((code) => {
    expect(code).toMatch(/^[A-Z][A-Z_]*$/);
  });
});
```

### Testing All Standard Error Codes

```typescript
describe('Error Code Coverage', () => {
  const errorCodes = [
    'INVALID_RESPONSE_FORMAT',
    'VALIDATION_FAILED',
    'EXECUTION_FAILED',
    'API_REQUEST_FAILED',
    'TOOL_EXECUTION_FAILED',
    'INTERNAL_ERROR'
  ];

  errorCodes.forEach((code) => {
    it(`should validate ${code} error code`, () => {
      const schema = AgentResponseSchema(z.unknown());
      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code,
          message: 'Test error',
          details: null,
          recoverable: false
        },
        metadata: { agentId: 'test', timestamp: Date.now() }
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe(code);
      }
    });
  });
});
```

## Testing Recoverable Field

### Recoverable vs Non-Recoverable Errors

```typescript
describe('Recoverable Field Behavior', () => {
  it('should mark API_REQUEST_FAILED as recoverable', () => {
    const response = createErrorResponse(
      'API_REQUEST_FAILED',
      'Rate limit exceeded',
      { retryAfter: 60 },
      true  // recoverable
    );

    expect(response.error?.recoverable).toBe(true);
  });

  it('should mark VALIDATION_FAILED as non-recoverable', () => {
    const response = createErrorResponse(
      'VALIDATION_FAILED',
      'Invalid input',
      { field: 'email' },
      false  // not recoverable
    );

    expect(response.error?.recoverable).toBe(false);
  });

  it('should mark INTERNAL_ERROR as non-recoverable', () => {
    const response = createErrorResponse(
      'INTERNAL_ERROR',
      'Internal validation failed',
      null,
      false  // never recoverable
    );

    expect(response.error?.recoverable).toBe(false);
  });
});
```

### Testing Retry Logic Based on Recoverable

```typescript
describe('Retry Logic Integration', () => {
  function shouldRetry(response: AgentResponse<unknown>): boolean {
    return response.status === 'error' &&
           response.error?.recoverable === true;
  }

  it('should retry recoverable errors', () => {
    const response = createErrorResponse(
      'API_REQUEST_FAILED',
      'Network timeout',
      null,
      true
    );

    expect(shouldRetry(response)).toBe(true);
  });

  it('should not retry non-recoverable errors', () => {
    const response = createErrorResponse(
      'VALIDATION_FAILED',
      'Invalid input',
      null,
      false
    );

    expect(shouldRetry(response)).toBe(false);
  });
});
```

## Testing Tool Use Failures

### Custom Tool Error Codes

```typescript
describe('Tool Execution Failures', () => {
  it('should handle tool execution failures with custom codes', () => {
    const toolError = createErrorResponse(
      'TOOL_EXECUTION_FAILED',
      'Tool "search-web" failed: Rate limit exceeded',
      {
        toolName: 'search-web',
        originalError: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      },
      true  // recoverable
    );

    expect(toolError.error?.code).toBe('TOOL_EXECUTION_FAILED');
    expect(toolError.error?.recoverable).toBe(true);
    expect(toolError.error?.details?.toolName).toBe('search-web');
    expect(toolError.error?.details?.retryAfter).toBe(60);
  });

  it('should handle tool not found errors', () => {
    const toolError = createErrorResponse(
      'TOOL_EXECUTION_FAILED',
      'Tool "non-existent-tool" not found',
      {
        toolName: 'non-existent-tool',
        availableTools: ['search-web', 'calculator']
      },
      false  // not recoverable - tool doesn't exist
    );

    expect(toolError.error?.code).toBe('TOOL_EXECUTION_FAILED');
    expect(toolError.error?.recoverable).toBe(false);
  });
});
```

## Testing Malformed Response Handling

### INVALID_RESPONSE_FORMAT Error Code

```typescript
describe('Malformed Response Handling', () => {
  it('should return INVALID_RESPONSE_FORMAT for non-JSON responses', () => {
    // Simulate response that's not valid JSON
    const malformedText = 'This is not JSON';

    const expectedResponse = createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'Response is not valid JSON',
      { rawResponse: malformedText },
      false
    );

    expect(expectedResponse.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(expectedResponse.error?.recoverable).toBe(false);
  });

  it('should return INVALID_RESPONSE_FORMAT for schema violations', () => {
    const invalidResponse = {
      status: 'invalid_status',
      data: 'test',
      error: null
    };

    const schema = AgentResponseSchema(z.string());
    const result = schema.safeParse(invalidResponse);

    expect(result.success).toBe(false);
    // Should be treated as INVALID_RESPONSE_FORMAT error
  });

  it('should handle responses with wrong data types', () => {
    const wrongTypeResponse = {
      status: 'error',
      data: 'should be null',
      error: { code: 'TEST', message: 'test', details: null, recoverable: false }
    };

    const schema = AgentResponseSchema(z.unknown());
    const result = schema.safeParse(wrongTypeResponse);

    expect(result.success).toBe(false);
  });
});
```

## External Documentation References

### Vitest Documentation
- **Testing TypeScript Types**: https://vitest.dev/guide/testing-types.html
- **Expect Matchers API**: https://vitest.dev/api/expect.html
- **Mocking with vi.spyOn**: https://vitest.dev/api/vi.html

### Zod Documentation
- **Error Handling**: https://github.com/colinhacks/zod#error-handling
- **Discriminated Unions**: https://zod.dev/?id=discriminated-unions
- **safeParse()**: https://zod.dev/?id=safeparse
