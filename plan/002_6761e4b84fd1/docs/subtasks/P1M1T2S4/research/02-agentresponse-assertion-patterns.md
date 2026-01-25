# AgentResponse Assertion Patterns

**PRP**: P1.M1.T2.S4
**Research Date**: 2026-01-24
**Purpose**: Document assertion patterns for AgentResponse testing

---

## AgentResponse Interface Structure

```typescript
interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;        // 'success' | 'error' | 'partial'
  data: T | null;                     // null for error responses
  error: AgentErrorDetails | null;    // null for success/partial responses
  metadata: AgentResponseMetadata;    // Always present
}

interface AgentErrorDetails {
  code: string;                       // SCREAMING_SNAKE_CASE
  message: string;                    // Human-readable
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

interface AgentResponseMetadata {
  agentId: string;                    // Required
  timestamp: number;                  // Required (Unix ms)
  duration?: number | null;           // Optional
  requestId?: string | null;          // Optional
  usage?: TokenUsage;                 // Optional
  toolCalls?: number;                 // Optional
}
```

---

## Type Guards

```typescript
import { isSuccess, isError, isPartial } from '../../types/agent.js';

// isSuccess(response) -> narrows to SuccessResponse<T> (data is T, error is null)
// isError(response) -> narrows to ErrorResponse (data is null, error exists)
// isPartial(response) -> narrows to PartialResponse<T> (data is T, error is null)
```

---

## Success Response Assertion Pattern

### Basic Pattern (from agent-response-factory.test.ts)

```typescript
import { describe, it, expect } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { z } from 'zod';

describe('Agent.prompt() - Success Cases', () => {
  it('should return AgentResponse with success status', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'What is 2 + 2?',
      responseFormat: z.object({
        answer: z.string(),
        confidence: z.number(),
      }),
    });

    const response = await agent.prompt(prompt);

    // Status assertion
    expect(response.status).toBe('success');

    // Data assertion
    expect(response.data).not.toBeNull();
    expect(response.data).toEqual({
      answer: expect.any(String),
      confidence: expect.any(Number),
    });

    // Error assertion (should be null for success)
    expect(response.error).toBeNull();

    // Metadata assertion
    expect(response.metadata.agentId).toBeDefined();
    expect(response.metadata.timestamp).toBeGreaterThan(0);
    expect(response.metadata.duration).toBeGreaterThan(0);
  });
});
```

### With Type Guard Pattern

```typescript
it('should use type guard for safe data access', async () => {
  const agent = new Agent();
  const prompt = new Prompt({
    user: 'Hello',
    responseFormat: z.string(),
  });

  const response = await agent.prompt(prompt);

  if (isSuccess(response)) {
    // TypeScript knows: response.data is string (not null)
    expect(typeof response.data).toBe('string');
    expect(response.data.toUpperCase()).toBeDefined();
    expect(response.error).toBeNull();
  }
});
```

### Complex Data Structure Pattern

```typescript
it('should handle complex nested data structures', async () => {
  const complexSchema = z.object({
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        tags: z.array(z.string()),
      })
    ),
    metadata: z.object({
      total: z.number(),
      page: z.number(),
    }),
  });

  const agent = new Agent();
  const prompt = new Prompt({
    user: 'List items',
    responseFormat: complexSchema,
  });

  const response = await agent.prompt(prompt);

  expect(response.status).toBe('success');
  expect(response.data.items).toHaveLength(expect.any(Number));
  expect(response.data.items[0].id).toBe(expect.any(Number));
  expect(response.data.metadata.total).toBe(expect.any(Number));
});
```

---

## Error Response Assertion Pattern

### Basic Error Pattern

```typescript
describe('Agent.prompt() - Error Cases', () => {
  it('should return AgentResponse with error status', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Trigger an error',
      responseFormat: z.string(),
    });

    // Mock error condition or cause actual error
    // For testing, we might mock the Anthropic API to return an error

    const response = await agent.prompt(prompt);

    // Status assertion
    expect(response.status).toBe('error');

    // Data assertion (should be null for error)
    expect(response.data).toBeNull();

    // Error assertion
    expect(response.error).not.toBeNull();
    expect(response.error?.code).toMatch(/^[A-Z][A-Z_]*$/); // SCREAMING_SNAKE_CASE
    expect(response.error?.message).toBeDefined();
    expect(response.error?.recoverable).toBeDefined();

    // Metadata assertion (still present for errors)
    expect(response.metadata.agentId).toBeDefined();
    expect(response.metadata.timestamp).toBeGreaterThan(0);
  });
});
```

### With Type Guard Pattern

```typescript
it('should use type guard for error handling', async () => {
  const agent = new Agent();
  const prompt = new Prompt({ /* ... */ });

  const response = await agent.prompt(prompt);

  if (isError(response)) {
    // TypeScript knows: response.error is AgentErrorDetails (not null)
    expect(response.error.code).toBe('EXPECTED_ERROR_CODE');
    expect(response.error.message).toContain('expected message');
    expect(response.error.recoverable).toBe(true);
    expect(response.data).toBeNull();

    if (response.error.details) {
      expect(response.error.details).toEqual({
        /* expected details */
      });
    }
  }
});
```

### Error Code Validation Pattern

```typescript
it('should return specific error code for validation failures', async () => {
  const agent = new Agent();
  const prompt = new Prompt({
    user: 'Invalid prompt',
    responseFormat: z.object({
      required: z.string(),
    }),
  });

  const response = await agent.prompt(prompt);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('VALIDATION_FAILED');
  expect(response.error?.recoverable).toBe(false);
});
```

---

## Partial Response Assertion Pattern

```typescript
describe('Agent.prompt() - Partial Cases', () => {
  it('should return AgentResponse with partial status', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Generate partial result',
      responseFormat: z.object({
        progress: z.number(),
        status: z.string(),
      }),
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('partial');
    expect(response.data).not.toBeNull();
    expect(response.data.progress).toBeGreaterThan(0);
    expect(response.error).toBeNull();
  });
});
```

---

## Null Handling Pattern (PRD 6.4.4)

```typescript
describe('Null Handling (PRD 6.4.4)', () => {
  it('should use null (not undefined) for absent error in success responses', async () => {
    const agent = new Agent();
    const response = await agent.prompt(/* success prompt */);

    expect(response.error).toBeNull();
    expect(response.error).not.toBeUndefined();
  });

  it('should use null (not undefined) for absent data in error responses', async () => {
    const agent = new Agent();
    const response = await agent.prompt(/* error prompt */);

    expect(response.data).toBeNull();
    expect(response.data).not.toBeUndefined();
  });

  it('should use null (not undefined) for undefined optional details', async () => {
    const agent = new Agent();
    const response = await agent.prompt(/* prompt with no details */);

    expect(response.error?.details).toBeNull();
    expect(response.error?.details).not.toBeUndefined();
  });
});
```

---

## Discriminated Union Pattern

```typescript
describe('Discriminated Union Handling', () => {
  it('should handle all response types with if-else chain', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
    });

    const response = await agent.prompt(prompt);

    const result: string = (() => {
      if (isSuccess(response)) {
        // TypeScript knows: data is string
        return `success: ${response.data.toUpperCase()}`;
      }
      if (isError(response)) {
        // TypeScript knows: error exists
        return `error: ${response.error.code} - ${response.error.message}`;
      }
      if (isPartial(response)) {
        // TypeScript knows: data is string
        return `partial: ${response.data}`;
      }
      return 'unknown';
    })();

    expect(result).toBeDefined();
  });
});
```

---

## Metadata Assertion Pattern

```typescript
describe('Response Metadata', () => {
  it('should include required metadata fields', async () => {
    const agent = new Agent({ name: 'TestAgent' });
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
    });

    const response = await agent.prompt(prompt);

    // Required fields
    expect(response.metadata.agentId).toBe(agent.id);
    expect(response.metadata.timestamp).toBeGreaterThan(Date.now() - 10000);

    // Optional fields
    if (response.metadata.duration) {
      expect(response.metadata.duration).toBeGreaterThan(0);
    }
  });

  it('should track execution duration', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
    });

    const startTime = Date.now();
    const response = await agent.prompt(prompt);
    const endTime = Date.now();

    expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
    expect(response.metadata.duration).toBeLessThanOrEqual(endTime - startTime + 100);
  });
});
```

---

## Generic Type Preservation Pattern

```typescript
describe('Type Safety', () => {
  it('should preserve generic type parameter', async () => {
    type TestData = {
      result: string;
      items: Array<{ id: number; name: string }>;
    };

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Generate complex data',
      responseFormat: z.object({
        result: z.string(),
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
          })
        ),
      }),
    });

    const response = await agent.prompt(prompt);

    // TypeScript knows response.data is TestData
    if (isSuccess(response)) {
      expect(response.data.result).toBeTypeOf('string');
      expect(response.data.items).toBeInstanceOf(Array);
      expect(response.data.items[0].id).toBeTypeOf('number');
    }
  });
});
```

---

## Summary Table

| Scenario | Key Assertions |
|----------|----------------|
| **Success** | `status === 'success'`, `data !== null`, `error === null` |
| **Error** | `status === 'error'`, `data === null`, `error !== null` |
| **Partial** | `status === 'partial'`, `data !== null`, `error === null` |
| **Metadata** | `agentId`, `timestamp` always present; `duration`, `requestId` optional |
| **Null Handling** | Use `toBeNull()` not `toBeUndefined()` for absent fields |
| **Type Guards** | Use `isSuccess`, `isError`, `isPartial` for type narrowing |

---

## Common Pitfalls to Avoid

1. **Don't forget to check status first** - Always check `response.status` before accessing `data` or `error`
2. **Don't use `toBeUndefined()` for null fields** - Use `toBeNull()` (PRD 6.4.4)
3. **Don't skip metadata assertions** - Metadata should always be validated
4. **Don't ignore recoverable flag** - Error responses should check `error.recoverable`
5. **Don't forget type guards** - Use `isSuccess`, `isError`, `isPartial` for proper TypeScript narrowing
