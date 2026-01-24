# AgentResponse Handling Patterns Reference

**PRP**: P1.M1.T2.S2
**Research Date**: 2026-01-24
**Purpose**: Complete reference for AgentResponse<T> handling patterns

---

## AgentResponse Type Definition

**Location**: `src/types/agent.ts` (lines 96-160)

### Core Interface

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
```

### Error Details Interface

```typescript
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
```

### Metadata Interface

```typescript
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;

  /** Token usage from the API (optional) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional) */
  toolCalls?: number;
}
```

### Discriminated Union Types

```typescript
// Success response: data is T, error is null
export type SuccessResponse<T> = Omit<AgentResponse<T>, 'status' | 'data' | 'error'> & {
  status: 'success';
  data: T;
  error: null;
};

// Error response: data is null, error is AgentErrorDetails
export type ErrorResponse = Omit<AgentResponse<never>, 'status' | 'data' | 'error'> & {
  status: 'error';
  data: null;
  error: AgentErrorDetails;
};

// Partial response: data is T, error is null (streaming/incremental)
export type PartialResponse<T> = Omit<AgentResponse<T>, 'status'> & {
  status: 'partial';
  data: T;
  error: null;
};
```

---

## Type Guards

**Location**: `src/types/agent.ts` (lines 315-359)

```typescript
/**
 * Type guard for success responses
 * Narrows response.data to T (non-null)
 */
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T>

/**
 * Type guard for error responses
 * Narrows response.error to AgentErrorDetails (non-null)
 */
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse

/**
 * Type guard for partial responses
 * Narrows response.data to T (non-null)
 */
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T>
```

---

## Factory Functions

**Location**: `src/types/agent.ts` (lines 216-295)

```typescript
/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T>

/**
 * Create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null>

/**
 * Create a partial response (for streaming)
 */
export function createPartialResponse<T>(
  data: T
): AgentResponse<T>
```

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

---

## Canonical Handling Pattern

**Location**: `src/reflection/reflection.ts` (lines 267-288)

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

**Key characteristics**:
- Direct status check for early error handling
- Null check after status validation
- Early return pattern to avoid nesting
- Fallback messages using nullish coalescing (`??`)

---

## Handling Patterns

### Pattern 1: Status Check with Early Return (Recommended)

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  console.error('Error:', response.error.message);
  return defaultValue;
}

// Continue with success case
const data = response.data; // Type narrowed to T
```

**Use Case**: Simple error handling with early return

**Pros**:
- Clear control flow
- Explicit error handling
- Type-safe data access
- No imports required

**Cons**:
- Verbose for complex scenarios

---

### Pattern 2: Type Guard with Narrowed Types

```typescript
import { isSuccess, isError } from 'groundswell';

const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}

// TypeScript knows response.data is T (not null)
const result = response.data;
```

**Use Case**: When you want cleaner syntax and built-in type narrowing

**Pros**:
- More readable
- Built-in type narrowing
- Reusable functions
- No null checks needed after guard

**Cons**:
- Requires import
- Slightly more abstraction

---

### Pattern 3: Switch Statement with Type Guards

```typescript
import { isSuccess, isError, isPartial } from 'groundswell';

const response = await agent.prompt<T>(prompt);

if (isSuccess(response)) {
  // Handle success - response.data is T
  console.log('Result:', response.data);
} else if (isError(response)) {
  // Handle error - response.error is AgentErrorDetails
  console.error('Error:', response.error.message);
} else {
  // Handle partial - response.data is T
  console.log('Partial result:', response.data);
}
```

**Use Case**: When you need to handle all three response types explicitly

**Pros**:
- Explicit handling of all cases
- Clean type narrowing
- Good for complex logic

**Cons**:
- Must handle all cases
- More verbose for simple success-only cases

---

### Pattern 4: Destructuring with Switch

```typescript
const { status, data, error, metadata } = await agent.prompt<T>(prompt);

switch (status) {
  case 'success':
    // Use data (type: T)
    console.log('Success:', data);
    break;
  case 'error':
    // Use error (type: AgentErrorDetails)
    console.error('Error:', error.message);
    break;
  case 'partial':
    // Handle partial data (type: T)
    console.log('Partial:', data);
    break;
}
```

**Use Case**: When you prefer destructuring and switch statements

**Pros**:
- Clean destructuring
- Explicit case handling
- Good for exhaustive handling

**Cons**:
- TypeScript may not narrow types in all branches
- Must handle all cases

---

### Pattern 5: Metadata Extraction

```typescript
const response = await agent.prompt<T>(prompt);

// Access metadata for observability
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
- Metadata fields may be undefined

---

### Pattern 6: Error Recovery with Retry Logic

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

### Pattern 7: Error Code Specific Handling

```typescript
import { AGENT_ERROR_CODES } from 'groundswell';

const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  switch (response.error.code) {
    case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
      // Handle validation errors - maybe fix schema and retry
      return await agent.prompt<T>(fixedPrompt);

    case AGENT_ERROR_CODES.API_REQUEST_FAILED:
      // Handle API errors - maybe retry with backoff
      await sleep(1000);
      return await agent.prompt<T>(prompt);

    case AGENT_ERROR_CODES.VALIDATION_FAILED:
      // Fatal validation error - don't retry
      throw new Error(response.error.message);

    default:
      // Unknown error
      throw new Error(`Unknown error: ${response.error.message}`);
  }
}

return response.data;
```

**Use Case**: When you need to handle different error types differently

**Pros**:
- Targeted error handling
- Can implement specific recovery strategies
- Clear error code documentation

**Cons**:
- More verbose
- Must know all error codes

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Not Checking Status

```typescript
// WRONG: Assumes data is always present
const response = await agent.prompt<T>(prompt);
const data = response.data; // Could be null! TypeScript error possible
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
// WRONG: Manual type check without narrowing
if (response.status === 'error') {
  // TypeScript doesn't know response.error is not null without check
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

### ❌ Pitfall 4: Forgetting Null Check After Status

```typescript
// WRONG: Assumes data is non-null just because status is success
const response = await agent.prompt<T>(prompt);
if (response.status !== 'error') {
  const data = response.data; // Could still be null!
}
```

### ✅ Correct: Check Status and Data

```typescript
const response = await agent.prompt<T>(prompt);
if (response.status === 'success' && response.data) {
  const data = response.data; // Definitely T
}
```

---

## Import Patterns

### For Type Guards

```typescript
import { isSuccess, isError, isPartial } from 'groundswell';
// OR
import { isSuccess } from 'groundswell/src/types/agent.js';
```

### For Factory Functions

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse
} from 'groundswell';
```

### For Error Codes

```typescript
import { AGENT_ERROR_CODES } from 'groundswell';
```

---

## Testing Patterns

### Unit Test for Success Response

```typescript
it('should return success response with data', async () => {
  const response = await agent.prompt(successPrompt);

  expect(response.status).toBe('success');
  expect(response.data).toEqual({ result: 'expected' });
  expect(response.error).toBeNull();
  expect(response.metadata.agentId).toBeDefined();
});
```

### Unit Test for Error Response

```typescript
it('should return error response on failure', async () => {
  const response = await agent.prompt(failingPrompt);

  expect(response.status).toBe('error');
  expect(response.data).toBeNull();
  expect(response.error).not.toBeNull();
  expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
});
```

### Integration Test for Workflow Step

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

The AgentResponse type provides a structured, type-safe way to handle agent execution results. The recommended patterns are:

1. **Use status checks** (`response.status === 'success'`) or **type guards** (`isSuccess(response)`) for type narrowing
2. **Handle errors explicitly** with proper error code checking
3. **Extract metadata** for observability and debugging
4. **Use factory functions** when creating responses in tests or custom code
5. **Avoid pitfalls** by always checking status before accessing data/error

The `src/reflection/reflection.ts` file (lines 267-288) serves as the **canonical example** of proper AgentResponse handling and should be used as the reference for all updates.
