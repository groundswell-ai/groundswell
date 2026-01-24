# Test Patterns Analysis - Groundswell Codebase

**Work Item:** P1.M1.T1.S2 - Create AgentResponse factory helper functions
**Research Date:** 2026-01-24
**Status:** Complete

---

## Executive Summary

The Groundswell codebase uses Vitest with a well-organized test structure. Tests follow consistent patterns including clear `describe`/`it` blocks, helper utilities for validation, mock isolation, and comprehensive coverage of happy paths, edge cases, and error scenarios.

---

## 1. Test Structure Overview

### Test Organization

```
src/__tests__/
├── unit/              # 20+ unit tests
│   ├── agent.test.ts
│   ├── workflow.test.ts
│   └── ...
├── integration/       # 5 integration tests
│   ├── agent-workflow.test.ts
│   └── ...
├── adversarial/       # 15 stress/performance/edge case tests
│   ├── memory-leak.test.ts
│   └── ...
├── compatibility/     # Backward compatibility tests
└── helpers/           # Test helper utilities
    ├── tree-helpers.ts
    └── ...
```

### Test Framework: Vitest

**Config:** `vitest.config.ts`
- **Global APIs:** Enabled (describe, it, expect available globally)
- **Environment:** node
- **Coverage:** v8 coverage provider

---

## 2. Test File Structure Pattern

### Example: `src/__tests__/unit/agent.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from '../../core/agent.js';

describe('Agent', () => {
  let agent: Agent;

  beforeEach(() => {
    // Setup before each test
    agent = new Agent({ name: 'TestAgent' });
  });

  describe('prompt()', () => {
    it('should return validated response data', async () => {
      // Arrange
      const prompt = createTestPrompt<string>({
        schema: z.string(),
        response: 'test response'
      });

      // Act
      const result = await agent.prompt(prompt);

      // Assert
      expect(result).toBe('test response');
    });

    it('should handle errors gracefully', async () => {
      // Test error scenarios
    });
  });
});
```

**Key Patterns:**
1. **Nested `describe` blocks** for organization
2. **`beforeEach`** for setup
3. **Arrange-Act-Assert** structure
4. **Clear test descriptions** (should/can statements)

---

## 3. Helper Utilities

### Location: `src/__tests__/helpers/tree-helpers.ts`

```typescript
export function createTestWorkflow(options?: {
  name?: string;
  parent?: Workflow;
}): Workflow {
  // Helper to create test workflows
}

export function validateTreeStructure(node: WorkflowNode): void {
  // Helper to validate tree structure
}

export function expectValidLogs(logs: LogEntry[]): void {
  // Helper to validate logs
}
```

**Pattern:** Reusable helpers for common test operations

---

## 4. Mock and Stub Patterns

### Environment Variable Mocking

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  // Mock environment variables
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  // Cleanup
  delete process.env.ANTHROPIC_API_KEY;
});
```

### API Response Mocking

```typescript
// Mock Anthropic SDK responses
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"result": "test"}' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      })
    }
  }))
}));
```

---

## 5. Zod Validation Test Patterns

### Example from `prompt.test.ts`

```typescript
describe('Prompt validation', () => {
  it('should validate response with Zod schema', async () => {
    const schema = z.object({
      result: z.string(),
      count: z.number()
    });

    const prompt = new Prompt({
      schema,
      user: 'test prompt'
    });

    const validData = { result: 'test', count: 5 };
    const validated = prompt.validateResponse(validData);

    expect(validated).toEqual(validData);
  });

  it('should throw on invalid response', () => {
    const schema = z.object({
      result: z.string()
    });

    const prompt = new Prompt({
      schema,
      user: 'test prompt'
    });

    const invalidData = { result: 123 }; // Wrong type

    expect(() => prompt.validateResponse(invalidData))
      .toThrow();
  });
});
```

**Pattern:** Test both valid and invalid scenarios

---

## 6. Error Testing Patterns

### Testing Error Responses

```typescript
describe('Error handling', () => {
  it('should throw on missing API key', async () => {
    const agent = new Agent({});

    delete process.env.ANTHROPIC_API_KEY;

    await expect(agent.prompt(testPrompt))
      .rejects
      .toThrow('ANTHROPIC_API_KEY');
  });

  it('should handle malformed JSON responses', async () => {
    // Mock malformed response
    const response = { content: [{ type: 'text', text: 'not json' }] };

    await expect(agent.prompt(testPrompt))
      .rejects
      .toThrow('No JSON object found');
  });
});
```

**Pattern:** Use `expect().rejects.toThrow()` for async errors

---

## 7. Type Guard Testing Patterns

### Example Pattern for Testing Type Guards

```typescript
// For AgentResponse type guards
describe('Type guards', () => {
  describe('isSuccess', () => {
    it('should return true for success responses', () => {
      const response = createSuccessResponse('data', metadata);
      expect(isSuccess(response)).toBe(true);

      // Type narrowing verification
      if (isSuccess(response)) {
        expect(response.data).toBe('data'); // TypeScript knows this is safe
        expect(response.error).toBeNull();
      }
    });

    it('should return false for error responses', () => {
      const response = createErrorResponse('code', 'message');
      expect(isSuccess(response)).toBe(false);
    });

    it('should properly narrow types', () => {
      const responses: AgentResponse<string>[] = [
        createSuccessResponse('data', metadata),
        createErrorResponse('code', 'message')
      ];

      const successResponses = responses.filter(isSuccess);
      expect(successResponses).toHaveLength(1);
      expect(successResponses[0].data).toBe('data');
    });
  });
});
```

**Pattern:** Test both boolean return and type narrowing behavior

---

## 8. Factory Function Testing Patterns

### Testing Create Functions

```typescript
describe('createSuccessResponse', () => {
  it('should create valid success response', () => {
    const data = { result: 'test' };
    const metadata = {
      agentId: 'agent-123',
      timestamp: Date.now()
    };

    const response = createSuccessResponse(data, metadata);

    expect(response.status).toBe('success');
    expect(response.data).toEqual(data);
    expect(response.error).toBeNull();
    expect(response.metadata).toEqual(metadata);
  });

  it('should handle null data', () => {
    const response = createSuccessResponse(null, metadata);
    expect(response.data).toBeNull();
  });

  it('should create with optional duration', () => {
    const metadata = {
      agentId: 'agent-123',
      timestamp: Date.now(),
      duration: 1234
    };

    const response = createSuccessResponse('data', metadata);
    expect(response.metadata.duration).toBe(1234);
  });
});

describe('createErrorResponse', () => {
  it('should create valid error response', () => {
    const response = createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'Failed to parse response',
      { field: 'value' },
      false
    );

    expect(response.status).toBe('error');
    expect(response.data).toBeNull();
    expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(response.error?.recoverable).toBe(false);
  });

  it('should default recoverable to false', () => {
    const response = createErrorResponse('CODE', 'message');
    expect(response.error?.recoverable).toBe(false);
  });

  it('should handle optional details', () => {
    const response = createErrorResponse('CODE', 'message');
    expect(response.error?.details).toBeNull();
  });
});
```

---

## 9. Coverage Approach

### Happy Path Tests
- Valid inputs create valid responses
- All factory function variants work correctly
- Type guards return correct values

### Edge Case Tests
- Null values for optional fields
- Empty strings and empty objects
- Zero values for numeric fields
- Very large/very small values

### Error Scenario Tests
- Invalid status values
- Missing required fields
- Wrong types for fields
- Undefined vs null handling

---

## 10. Assertion Patterns Used

### Common Assertions

```typescript
// Equality
expect(result).toEqual(expected);
expect(result).toBe(expected);        // Strict equality

// Type checks
expect(value).toBeInstanceOf(Type);
expect(typeof value).toBe('string');

// Null/undefined
expect(value).toBeNull();
expect(value).toBeUndefined();

// Booleans
expect(condition).toBe(true);
expect(condition).toBeFalsy();

// Arrays/objects
expect(array).toHaveLength(n);
expect(object).toHaveProperty('key');
expect(array).toContain(item);

// Exceptions
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('message');
```

---

## 11. Test File for AgentResponse Factory Functions

### Recommended File Location

**`src/__tests__/unit/agent-response-factory.test.ts`**

### Test Structure Template

```typescript
import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial
} from '../../types/agent.js';

describe('AgentResponse Factory Functions', () => {
  describe('createSuccessResponse', () => {
    // Happy path tests
    it('should create valid success response with all fields');
    it('should preserve generic type parameter');
    it('should handle null data value');
    it('should include optional metadata fields');

    // Edge cases
    it('should handle empty object data');
    it('should handle zero/negative duration');

    // Type narrowing verification
    it('should enable type narrowing with isSuccess');
  });

  describe('createErrorResponse', () => {
    // Happy path tests
    it('should create valid error response');
    it('should default recoverable to false');
    it('should handle optional details parameter');

    // Edge cases
    it('should handle empty error code');
    it('should handle empty message');
    it('should handle null details');

    // Error codes
    it('should accept INVALID_RESPONSE_FORMAT code');
    it('should accept custom error codes');
  });

  describe('createPartialResponse', () => {
    // Tests for partial response factory
  });

  describe('Type Guards', () => {
    describe('isSuccess', () => {
      it('should return true for success responses');
      it('should return false for error responses');
      it('should return false for partial responses');
      it('should properly narrow types');
    });

    describe('isError', () => {
      it('should return true for error responses');
      it('should return false for success responses');
      it('should return false for partial responses');
      it('should properly narrow types');
    });

    describe('isPartial', () => {
      it('should return true for partial responses');
      it('should return false for success responses');
      it('should return false for error responses');
      it('should properly narrow types');
    });
  });

  describe('Integration', () => {
    it('should work with filter() and type guards');
    it('should work with discriminated union patterns');
  });
});
```

---

## 12. Running Tests

### Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- agent-response-factory.test.ts

# Watch mode for development
npm run test:watch

# Run with coverage
npm test -- --coverage
```

---

## 13. Key Gotchas

1. **Use `beforeEach`** - Isolate each test with fresh setup
2. **Mock environment** - Set `ANTHROPIC_API_KEY` for tests
3. **Clean up mocks** - Use `afterEach` to reset state
4. **Test type narrowing** - Verify TypeScript works correctly with type guards
5. **Cover all status types** - Test success, error, and partial responses
6. **Null vs undefined** - Test both (codebase uses null for absent values)

---

## 14. Integration Points

### When writing tests for factory functions:

1. **Import from** `src/types/agent.js` - Where factory functions will be exported
2. **Test file location** `src/__tests__/unit/agent-response-factory.test.ts`
3. **Follow existing patterns** from `src/__tests__/unit/agent.test.ts`
4. **Use helpers from** `src/__tests__/helpers/` for common operations

---

## Conclusion

The Groundswell codebase demonstrates mature testing practices with Vitest. The AgentResponse factory function tests should follow these established patterns:

- Clear `describe`/`it` structure with nested organization
- Arrange-Act-Assert format
- Comprehensive coverage (happy, edge, error cases)
- Type narrowing verification for type guards
- Mock isolation for external dependencies
- Helper utilities for common operations

This ensures consistency with the existing test suite and maintains the high quality of testing already in place.
