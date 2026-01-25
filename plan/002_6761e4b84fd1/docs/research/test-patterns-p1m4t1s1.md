# Test Patterns Analysis for Groundswell

**Date**: 2026-01-24
**Context**: PRP for P1.M4.T1.S1 - Run unit tests and fix failures
**Analyzed By**: Research Agent

---

## Test Framework Configuration

- **Framework**: Vitest (version ^1.0.0)
- **Test Directory**: `src/__tests__/unit/`
- **Pattern**: Glob pattern `src/__tests__/**/*.test.ts`
- **Global Test Variables**: Enabled
- **Configuration**: `vitest.config.ts`

---

## Import Patterns

### Standard Import Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest'; // For mocking

// Source imports using relative paths with .js extension
import { Agent } from '../../core/agent.js';
import { Workflow } from '../../core/workflow.js';
import { createPrompt } from '../../core/prompt.js';

// Type imports
import type {
  AgentResponse,
  AgentErrorDetails,
  AgentResponseStatus,
} from '../../types/agent.js';

// Type guards and factory functions
import {
  isSuccess,
  isError,
  isPartial,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
} from '../../types/agent.js';
```

### Key Import Conventions

1. **Always use `.js` extension** for imports (ES Module requirement)
2. **Separate type imports** using `import type`
3. **Group imports**: test utilities, source code, types, factory functions
4. **Relative paths**: `../../core/` from unit tests

---

## Common Test Structure

### Describe/It Pattern

```typescript
describe('FeatureName', () => {
  describe('SpecificScenario', () => {
    beforeEach(() => {
      // Setup: create test data, initialize mocks
    });

    it('should_do_expected_behavior', () => {
      // Arrange: set up test data
      const input = 'test input';

      // Act: execute the function
      const result = functionUnderTest(input);

      // Assert: verify expected outcome
      expect(result).toBe('expected output');
    });

    afterEach(() => {
      // Cleanup: restore mocks, clear state
    });
  });
});
```

### Naming Conventions

- **Describe blocks**: Feature name or class name (`'Agent'`, `'AgentResponse'`)
- **It blocks**: `should_do_expected_behavior` format
  - `should_return_success_response_for_valid_input`
  - `should_throw_error_when_schema_validation_fails`
  - `should_include_metadata_in_response`

---

## AgentResponse-Specific Test Patterns

### 1. Mock Response Creation

```typescript
const mockSuccessResponse: AgentResponse<string> = {
  status: 'success',
  data: 'test result',
  error: null,
  metadata: {
    agentId: 'agent-123',
    timestamp: Date.now(),
    duration: 100,
  },
};

const mockErrorResponse: AgentResponse<string> = {
  status: 'error',
  data: null,
  error: {
    code: 'INVALID_RESPONSE_FORMAT',
    message: 'Schema validation failed',
    details: { field: 'email' },
    recoverable: false,
  },
  metadata: {
    agentId: 'agent-123',
    timestamp: Date.now(),
    duration: 50,
  },
};
```

### 2. Type Guard Testing Pattern

```typescript
describe('Type Guards', () => {
  it('should_use_isSuccess_for_type_narrowing', () => {
    const response = createSuccessResponse('hello', {
      agentId: 'test',
      timestamp: Date.now(),
    });

    if (isSuccess(response)) {
      // TypeScript knows: response.data is string (not null)
      expect(response.data).toBeTypeOf('string');
      expect(response.error).toBeNull();
    }
  });

  it('should_use_isError_for_error_handling', () => {
    const response = createErrorResponse(
      'VALIDATION_FAILED',
      'Invalid input',
      { field: 'email' },
      false
    );

    if (isError(response)) {
      // TypeScript knows: response.error is AgentErrorDetails (not null)
      expect(response.error.code).toBe('VALIDATION_FAILED');
      expect(response.data).toBeNull();
    }
  });
});
```

### 3. Error Code Testing Pattern

```typescript
describe('Error Code Handling', () => {
  const errorCodes = [
    'INVALID_RESPONSE_FORMAT',
    'VALIDATION_FAILED',
    'EXECUTION_FAILED',
    'API_REQUEST_FAILED',
    'TOOL_EXECUTION_FAILED',
    'INTERNAL_ERROR',
  ] as const;

  errorCodes.forEach((code) => {
    it(`should_handle_${code}_error_code`, () => {
      const response = createErrorResponse(
        code,
        `Test ${code} error`,
        { context: 'test' },
        code !== 'INTERNAL_ERROR'
      );

      expect(response.status).toBe('error');
      expect(response.error?.code).toBe(code);
      expect(response.data).toBeNull();
    });
  });
});
```

### 4. Metadata Validation Pattern

```typescript
describe('Metadata Validation', () => {
  it('should_include_all_required_metadata_fields', () => {
    const response = createSuccessResponse('data', {
      agentId: 'agent-123',
      timestamp: Date.now(),
      duration: 100,
    });

    expect(response.metadata.agentId).toBeTypeOf('string');
    expect(response.metadata.timestamp).toBeTypeOf('number');
    expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
  });

  it('should_include_optional_metadata_when_provided', () => {
    const response = createSuccessResponse('data', {
      agentId: 'agent-123',
      timestamp: Date.now(),
      duration: 100,
      model: 'claude-3-opus',
      tokensUsed: { input: 10, output: 20 },
      cacheHit: true,
    });

    expect(response.metadata.model).toBe('claude-3-opus');
    expect(response.metadata.tokensUsed).toEqual({ input: 10, output: 20 });
    expect(response.metadata.cacheHit).toBe(true);
  });
});
```

---

## Common Assertion Patterns

### Basic Assertions

```typescript
expect(value).toBe(expected);              // Strict equality
expect(value).toEqual(expected);           // Deep equality
expect(value).toBeDefined();               // Not undefined
expect(value).toBeUndefined();             // Is undefined
expect(value).toBeNull();                  // Is null
expect(value).toBeTruthy();                // Truthy value
expect(value).toBeFalsy();                 // Falsy value
```

### Type Assertions

```typescript
expect(value).toBeTypeOf('string');        // typeof check
expect(value).toBeTypeOf('number');
expect(value).toBeTypeOf('boolean');
expect(Array.isArray(value)).toBe(true);   // Array check
```

### Object Property Assertions

```typescript
expect(obj).toMatchObject({               // Partial object match
  status: 'success',
  data: expect.any(String),
});

expect(obj).toHaveProperty('error');       // Property existence
expect(obj).toHaveProperty('error.code', 'INVALID_RESPONSE_FORMAT');

expect(array).toContain(item);             // Array contains
expect(array).toHaveLength(5);             // Array length
```

### Numeric Assertions

```typescript
expect(num).toBeGreaterThan(0);
expect(num).toBeGreaterThanOrEqual(0);
expect(num).toBeLessThan(100);
expect(num).toBeLessThanOrEqual(100);
expect(num).toBeCloseTo(3.14, 2);          // Floating point
```

### Exception Assertions

```typescript
expect(() => functionThatThrows()).toThrow(Error);
expect(() => functionThatThrows()).toThrow('Specific error message');
expect(() => functionThatThrows()).toThrow(/regex pattern/);
```

### Async Assertions

```typescript
it('should_handle_async_operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

it('should_handle_rejected_promises', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
  await expect(asyncFunction()).resolves.toBe('expected value');
});
```

---

## Mock/vi Usage Patterns

### Console Mocking

```typescript
describe('Logging Tests', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should_log_error_message', () => {
    // Test that logs error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('error')
    );
  });
});
```

### Dynamic Import Testing

```typescript
it('should_export_type_guards', async () => {
  const module = await import('../../types/agent.js');

  expect(module.isSuccess).toBeTypeOf('function');
  expect(module.isError).toBeTypeOf('function');
  expect(module.isPartial).toBeTypeOf('function');
});
```

### Private Method Access (for testing)

```typescript
it('should_validate_response_format', () => {
  const agent = new Agent('TestAgent');

  // Access private method for testing
  const validateResponse = (agent as any).validateResponse;

  expect(() => validateResponse({})).toThrow();
});
```

---

## Test Helper Patterns

### Factory Functions for Test Data

```typescript
function createMockAgentResponse<T>(
  status: AgentResponseStatus,
  data: T | null,
  error: AgentErrorDetails | null
): AgentResponse<T> {
  return {
    status,
    data,
    error,
    metadata: {
      agentId: 'test-agent-' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: Math.floor(Math.random() * 1000),
    },
  };
}
```

### Zod Schema Testing Helper

```typescript
function testSchemaValidation<T>(
  schema: z.ZodSchema<T>,
  validData: T[],
  invalidData: unknown[]
) {
  describe('Schema validation', () => {
    validData.forEach((data, index) => {
      it(`should_accept_valid_data_${index}`, () => {
        expect(() => schema.parse(data)).not.toThrow();
      });
    });

    invalidData.forEach((data, index) => {
      it(`should_reject_invalid_data_${index}`, () => {
        expect(() => schema.parse(data)).toThrow();
      });
    });
  });
}
```

---

## Common Test Scenarios

### 1. Constructor Testing

```typescript
describe('Constructor', () => {
  it('should_generate_unique_id', () => {
    const agent1 = new Agent('Agent1');
    const agent2 = new Agent('Agent2');

    expect(agent1.id).toBeDefined();
    expect(agent2.id).toBeDefined();
    expect(agent1.id).not.toBe(agent2.id);
  });

  it('should_set_default_values', () => {
    const agent = new Agent('TestAgent');

    expect(agent.name).toBe('TestAgent');
    expect(agent.enableCache).toBe(false);
  });
});
```

### 2. Method Testing

```typescript
describe('prompt() method', () => {
  it('should_return_AgentResponse_on_success', async () => {
    const agent = new Agent('TestAgent');
    const prompt = createPrompt({
      user: 'Test prompt',
      responseFormat: z.object({ result: z.string() }),
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
    expect(response.data).toBeDefined();
    expect(response.error).toBeNull();
  });
});
```

### 3. Schema Validation Testing

```typescript
describe('Schema Validation', () => {
  it('should_validate_against_Zod_schema', () => {
    const schema = AgentResponseSchema(z.object({ result: z.string() }));

    const validResponse = createSuccessResponse(
      { result: 'test' },
      { agentId: 'test', timestamp: Date.now() }
    );

    expect(() => schema.parse(validResponse)).not.toThrow();
  });
});
```

### 4. Error Handling Testing

```typescript
describe('Error Handling', () => {
  it('should_return_error_response_on_validation_failure', async () => {
    const agent = new Agent('TestAgent');
    const prompt = createPrompt({
      user: 'Test prompt',
      responseFormat: z.object({ invalid: z.any() }),
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(response.error?.recoverable).toBe(false);
  });
});
```

### 5. Type Safety Testing

```typescript
describe('Type Safety', () => {
  it('should_narrow_type_with_isSuccess_guard', () => {
    const response: AgentResponse<string> = createSuccessResponse('test', {
      agentId: 'test',
      timestamp: Date.now(),
    });

    if (isSuccess(response)) {
      // TypeScript should know response.data is string (not null)
      const result: string = response.data;
      expect(result).toBe('test');
    }
  });
});
```

### 6. Serialization Testing

```typescript
describe('Serialization', () => {
  it('should_survive_json_roundtrip', () => {
    const original = createSuccessResponse(
      { result: 'test' },
      { agentId: 'test', timestamp: Date.now() }
    );

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
  });
});
```

---

## Test Cleanup Patterns

### Mock Restoration

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Timer Cleanup

```typescript
afterEach(() => {
  vi.useRealTimers();
});
```

### Environment Variable Cleanup

```typescript
const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});
```

---

## PRD Compliance in Tests

### PRD 6.4.4: Null Over Undefined

```typescript
it('should_use_null_instead_of_undefined', () => {
  const response = createErrorResponse('TEST', 'test', {}, false);

  expect(response.data).toBeNull();       // not undefined
  expect(response.error).toBeDefined();
  expect(response.metadata).toBeDefined();

  // Check for undefined (should fail if PRD not followed)
  expect(JSON.stringify(response)).not.toContain('undefined');
});
```

### PRD 6.2: Error Code Handling

```typescript
it('should_include_all_required_error_codes', () => {
  const requiredCodes = [
    'INVALID_RESPONSE_FORMAT',
    'VALIDATION_FAILED',
    'EXECUTION_FAILED',
    'API_REQUEST_FAILED',
    'TOOL_EXECUTION_FAILED',
    'INTERNAL_ERROR',
  ];

  requiredCodes.forEach((code) => {
    const response = createErrorResponse(code, 'test', {}, false);
    expect(response.error?.code).toBe(code);
  });
});
```

### PRD 6.4: AgentResponse Structure

```typescript
it('should_conform_to_agentresponse_structure', () => {
  const response = createSuccessResponse('test', {
    agentId: 'test',
    timestamp: Date.now(),
  });

  // Required fields
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('error');
  expect(response).toHaveProperty('metadata');

  // Type checks
  expect(['success', 'error', 'partial']).toContain(response.status);
  expect(typeof response.data).toBeTruthy();
  expect(typeof response.error).toBe('object');
  expect(typeof response.metadata).toBe('object');
});
```

---

## Summary of Key Patterns

| Pattern | Purpose | Example Location |
|---------|---------|------------------|
| Type guards | Type narrowing | All AgentResponse tests |
| Factory functions | Test data creation | agent-response-factory.test.ts |
| Schema validation | Runtime type checks | agent-response.test.ts |
| Console mocking | Output testing | agent-error-codes.test.ts |
| Private access | Internal testing | agent-response-public-api.test.ts |
| Metadata validation | Observability | All AgentResponse tests |

This test suite demonstrates a mature, well-structured approach to testing with:
1. Consistent organization (describe/it blocks)
2. Type safety first (TypeScript + type guards)
3. Comprehensive coverage (success + error paths)
4. PRD compliance validation
5. Appropriate mocking strategies
