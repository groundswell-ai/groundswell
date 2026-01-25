# Migration Guide: AgentResponse

**Version:** 0.0.4+

## Overview

Groundswell uses `AgentResponse<T>` as the return type for all `agent.prompt()` calls. This provides type-safe, validated responses with comprehensive error handling.

## Why AgentResponse?

All agent responses in Groundswell are structured JSON objects with:

1. **Type Safety** - TypeScript generics ensure response data matches expected schema
2. **Error Handling** - Errors are returned in the response object, not thrown
3. **Observable Metadata** - Track tokens, timing, and cache hits
4. **Validation** - Zod schema validation ensures response integrity

## AgentResponse Interface

```typescript
interface AgentResponse<T> {
  status: 'success' | 'error' | 'partial';
  data: T | null;           // Parsed and validated data (null on error)
  error: ErrorResponse | null;  // Error details (null on success)
  metadata?: ResponseMetadata;
}

interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ResponseMetadata {
  tokens: { input: number; output: number };
  duration: number;
  cacheHit: boolean;
}
```

## Basic Usage

### Checking Response Status

```typescript
import { createAgent, createPrompt } from 'groundswell';

const agent = createAgent({ name: 'MyAgent' });
const prompt = createPrompt({
  user: 'Analyze this data',
  responseFormat: z.object({ count: z.number() }),
});

const response = await agent.prompt(prompt);

// Always check status before accessing data
if (response.status === 'error') {
  console.error('Failed:', response.error.message);
  throw new Error(response.error.message);
}

console.log('Result:', response.data.count);
```

### Using Type Guards

```typescript
import { isSuccess, isError, isPartial } from 'groundswell';

const response = await agent.prompt(prompt);

if (isError(response)) {
  // TypeScript knows response.error is non-null here
  console.error('Error code:', response.error.code);
  return;
}

if (isSuccess(response)) {
  // TypeScript knows response.data is non-null here
  console.log('Data:', response.data);
}
```

### Pattern: Early Return on Error

```typescript
async function executeAgent() {
  const response = await agent.prompt(prompt);

  if (response.status === 'error') {
    throw new Error(response.error.message);
  }

  // TypeScript narrows response.data to T here
  return response.data.someProperty;
}
```

### Pattern: Default Values

```typescript
const response = await agent.prompt(prompt);

const result = response.status === 'success'
  ? response.data
  : { defaultValue: true };
```

### Pattern: Custom Error Handling

```typescript
const response = await agent.prompt(prompt);

switch (response.status) {
  case 'success':
    return response.data;
  case 'error':
    if (response.error.code === 'RATE_LIMITED') {
      // Retry after delay
      await sleep(1000);
      return executeAgent();
    }
    throw new Error(response.error.message);
  case 'partial':
    // Handle partial response
    return mergeWithDefaults(response.data);
}
```

## Factory Functions

Groundswell provides factory functions for creating responses:

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse
} from 'groundswell';

// Success response
const success = createSuccessResponse({ count: 42 }, {
  tokens: { input: 10, output: 5 },
  duration: 100,
  cacheHit: false
});

// Error response
const error = createErrorResponse('VALIDATION_ERROR', 'Invalid input format');

// Partial response
const partial = createPartialResponse({ count: 42 }, {
  tokens: { input: 10, output: 5 },
  duration: 100,
  cacheHit: false
});
```

## Error Codes

| Code | Description | Common Cause |
|------|-------------|--------------|
| `VALIDATION_ERROR` | Response failed Zod schema validation | LLM returned unexpected format |
| `API_ERROR` | Anthropic API returned an error | Network issues, invalid API key |
| `TIMEOUT` | Request timed out | Slow LLM response |
| `RATE_LIMITED` | API rate limit exceeded | Too many requests |
| `INTERNAL_ERROR` | Unexpected internal error | Bug in Groundswell |

## Integration with Workflows

```typescript
import { Workflow, Step } from 'groundswell';

class AnalysisWorkflow extends Workflow {
  private agent = createAgent({ name: 'Analyzer' });

  @Step()
  async analyze(input: string) {
    const prompt = createPrompt({
      user: input,
      responseFormat: z.object({
        sentiment: z.enum(['positive', 'negative']),
        score: z.number()
      })
    });

    const response = await this.agent.prompt(prompt);

    // Handle error in workflow context
    if (response.status === 'error') {
      this.setStatus('failed');
      throw new Error(`Analysis failed: ${response.error.message}`);
    }

    return response.data;
  }
}
```

## Testing with AgentResponse

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createAgent } from 'groundswell';

it('handles error responses', async () => {
  const agent = createAgent({
    name: 'TestAgent',
    anthropic: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'invalid json' }]
    })
  });

  const prompt = createPrompt({
    user: 'test',
    responseFormat: z.object({ count: z.number() })
  });

  const response = await agent.prompt(prompt);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('VALIDATION_ERROR');
});
```

## Best Practices

1. **Always check status** - Never access `data` or `error` without checking `status` first
2. **Use type guards** - `isSuccess()`, `isError()`, `isPartial()` provide TypeScript narrowing
3. **Handle specific errors** - Check `error.code` for custom error handling
4. **Log metadata** - Use `metadata` for monitoring and debugging
5. **Throw from workflows** - Convert errors to exceptions when appropriate

## Common Patterns

### Async/Await with Error Handling

```typescript
async function safePrompt<T>(agent: Agent, prompt: Prompt<T>): Promise<T> {
  const response = await agent.prompt(prompt);

  if (response.status === 'error') {
    throw new Error(response.error.message);
  }

  return response.data;
}
```

### Retry Logic

```typescript
async function promptWithRetry<T>(
  agent: Agent,
  prompt: Prompt<T>,
  maxRetries = 3
): Promise<AgentResponse<T>> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await agent.prompt(prompt);

    if (response.status !== 'error' || response.error.code !== 'RATE_LIMITED') {
      return response;
    }

    await sleep(Math.pow(2, i) * 1000);
  }

  return createErrorResponse('MAX_RETRIES', 'Exceeded retry limit');
}
```

### Fallback Values

```typescript
async function promptWithFallback<T>(
  agent: Agent,
  prompt: Prompt<T>,
  fallback: T
): Promise<T> {
  const response = await agent.prompt(prompt);
  return response.status === 'success' ? response.data : fallback;
}
```

## Further Reading

- [Agent Documentation](agent.md)
- [Prompt Documentation](prompt.md)
- [Workflow Documentation](workflow.md)
