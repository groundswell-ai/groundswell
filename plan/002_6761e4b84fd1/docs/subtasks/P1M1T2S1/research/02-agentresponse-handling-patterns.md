# AgentResponse Handling Patterns

**PRP**: P1.M1.T2.S1
**Research Date**: 2026-01-24
**Purpose**: Document existing AgentResponse handling patterns for call site updates

---

## Current AgentResponse Type Definition

**Location**: `src/types/agent.ts` (lines 96-160)

```typescript
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;  // 'success' | 'error' | 'partial'

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata */
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: string;

  /** Human-readable error description */
  message: string;

  /** Additional error context */
  details?: Record<string, unknown> | null;

  /** Whether the error is recoverable (can retry) */
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;

  /** Token usage from the API (optional, for backward compatibility) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional, for backward compatibility) */
  toolCalls?: number;
}
```

---

## Factory Functions

**Location**: `src/types/agent.ts` (lines 216-295)

```typescript
// Success response factory
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T>

// Error response factory
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null>

// Partial response factory
export function createPartialResponse<T>(
  data: T
): AgentResponse<T>
```

---

## Type Guards

**Location**: `src/types/agent.ts` (lines 315-359)

```typescript
// Check for success response
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T>

// Check for error response
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse

// Check for partial response
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T>
```

---

## Standard Handling Pattern (from reflection.ts)

**Location**: `src/reflection/reflection.ts` (lines 267-295)

```typescript
const response = await this.agent.prompt(reflectionPrompt);

// Handle AgentResponse return type
if (response.status === 'error') {
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
  };
}

// Type assertion: data is non-null when status is not 'error'
const data = response.data;
if (!data) {
  return {
    shouldRetry: false,
    reason: 'Reflection analysis failed: No data returned',
  };
}

// Use the data
return {
  shouldRetry: data.shouldRetry,
  reason: data.reason,
  revisedPromptData: data.revisedPromptData,
  revisedSystemPrompt: data.revisedSystemPrompt,
};
```

---

## Handling Pattern Categories

### Pattern 1: Status Check with Early Return

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  // Handle error case
  console.error('Error:', response.error.message);
  return defaultValue;
}

// Continue with success case
const data = response.data; // Type narrowed to T
```

**Use Case**: When you want to handle errors explicitly and return early

**Pros**:
- Clear control flow
- Explicit error handling
- Type-safe data access

**Cons**:
- Verbose for simple cases
- Requires early return pattern

---

### Pattern 2: Type Guard with Narrowed Types

```typescript
import { isSuccess, isError } from './types/agent.js';

const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}

// TypeScript knows response.data is T (not null)
const result = response.data;
```

**Use Case**: When you want cleaner syntax and type narrowing

**Pros**:
- More readable
- Built-in type narrowing
- Reusable functions

**Cons**:
- Requires import
- Slightly more abstraction

---

### Pattern 3: Destructuring with Defaults

```typescript
const { status, data, error, metadata } = await agent.prompt<T>(prompt);

switch (status) {
  case 'success':
    // Use data (type: T)
    break;
  case 'error':
    // Use error (type: AgentErrorDetails)
    break;
  case 'partial':
    // Handle partial data
    break;
}
```

**Use Case**: When you need to handle all three response types

**Pros**:
- Explicit handling of all cases
- Clean destructuring
- Good for switch statements

**Cons**:
- Must handle all cases
- Verbose for simple success-only cases

---

### Pattern 4: Metadata Extraction

```typescript
const response = await agent.prompt<T>(prompt);

// Access metadata
const { agentId, timestamp, duration, requestId, usage } = response.metadata;

console.log(`Agent ${agentId} took ${duration}ms`);
console.log(`Used ${usage?.input_tokens} input tokens`);

// Handle response
if (response.status === 'success') {
  console.log('Got result:', response.data);
}
```

**Use Case**: When you need observability/debugging information

**Pros**:
- Full execution context
- Performance tracking
- Request correlation

**Cons**:
- More verbose
- Metadata may be undefined for backward compatibility

---

### Pattern 5: Error Recovery with Retry Logic

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  const { code, message, details, recoverable } = response.error;

  if (recoverable) {
    console.warn(`Recoverable error [${code}]: ${message}`);
    // Retry with different parameters
    return await agent.prompt<T>(modifiedPrompt);
  } else {
    console.error(`Fatal error [${code}]: ${message}`);
    throw new Error(message);
  }
}

// Success case
return response.data;
```

**Use Case**: When implementing retry logic for recoverable errors

**Pros**:
- Respects error recoverability flag
- Implements retry pattern
- Proper error propagation

**Cons**:
- More complex logic
- Must handle retry limits

---

## Error Code Constants

**Location**: `src/types/agent.ts` (lines 189-195)

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**Usage Example**:

```typescript
import { AGENT_ERROR_CODES } from './types/agent.js';

if (response.status === 'error') {
  switch (response.error.code) {
    case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
      // Handle validation errors
      break;
    case AGENT_ERROR_CODES.API_REQUEST_FAILED:
      // Handle API errors
      break;
    default:
      // Handle unknown errors
  }
}
```

---

## Backward Compatibility

### Legacy promptWithMetadata() Method

**Location**: `src/core/agent.ts` (lines 130-145)

```typescript
/**
 * @deprecated Use prompt() which now returns AgentResponse with metadata
 */
public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  const response = await this.executePrompt(prompt, overrides);
  // Convert AgentResponse back to PromptResult for backward compatibility
  if (response.status === 'error') {
    throw new Error(response.error?.message ?? 'Unknown error');
  }
  return {
    data: response.data as T,
    usage: response.metadata.usage ?? { input_tokens: 0, output_tokens: 0 },
    duration: response.metadata.duration ?? 0,
    toolCalls: response.metadata.toolCalls ?? 0,
  };
}
```

**Migration Path**:

```typescript
// OLD (deprecated)
const result = await agent.promptWithMetadata(prompt);
console.log(result.data, result.usage);

// NEW (recommended)
const response = await agent.prompt(prompt);
if (response.status === 'success') {
  console.log(response.data, response.metadata.usage);
}
```

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Not Checking Status

```typescript
// WRONG: Assumes data is always present
const response = await agent.prompt<T>(prompt);
const data = response.data; // Could be null!
```

### ✅ Correct: Check Status First

```typescript
const response = await agent.prompt<T>(prompt);
if (response.status === 'success') {
  const data = response.data; // Type narrowed to T (not null)
}
```

---

### ❌ Pitfall 2: Ignoring Error Details

```typescript
// WRONG: Loses error context
if (response.status === 'error') {
  throw new Error('Prompt failed');
}
```

### ✅ Correct: Include Error Details

```typescript
if (response.status === 'error') {
  const { code, message, details } = response.error;
  throw new Error(`[${code}] ${message}: ${JSON.stringify(details)}`);
}
```

---

### ❌ Pitfall 3: Not Using Type Guards

```typescript
// WRONG: Manual type check
if (response.status === 'error') {
  // TypeScript doesn't know response.error is not null
  console.log(response.error?.message);
}
```

### ✅ Correct: Use Type Guards

```typescript
if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.log(response.error.message);
}
```

---

## Testing Patterns

### Unit Test Pattern

```typescript
describe('Agent.prompt()', () => {
  it('should return success response with data', async () => {
    const response = await agent.prompt(successPrompt);

    expect(response.status).toBe('success');
    expect(response.data).toEqual({ result: 'expected' });
    expect(response.error).toBeNull();
    expect(response.metadata.agentId).toBeDefined();
  });

  it('should return error response on failure', async () => {
    const response = await agent.prompt(failingPrompt);

    expect(response.status).toBe('error');
    expect(response.data).toBeNull();
    expect(response.error).not.toBeNull();
    expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
  });
});
```

### Integration Test Pattern

```typescript
it('should handle AgentResponse in workflow steps', async () => {
  class TestWorkflow extends Workflow {
    @Step()
    async processStep() {
      const response = await this.agent.prompt(prompt);
      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.error?.message);
    }
  }

  const workflow = new TestWorkflow('test');
  const result = await workflow.run();
  expect(result).toBeDefined();
});
```

---

## Summary

The AgentResponse type provides a structured, type-safe way to handle agent execution results. The recommended pattern is:

1. **Use status checks** or **type guards** for type narrowing
2. **Handle errors explicitly** with proper error code checking
3. **Extract metadata** for observability
4. **Use factory functions** when creating responses
5. **Avoid pitfalls** by always checking status before accessing data/error

The reflection.ts file (lines 267-295) serves as the canonical example of proper AgentResponse handling and should be used as a reference for all call site updates.
