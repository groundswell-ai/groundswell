# AgentResponse Type Definitions Research

## Summary

Complete analysis of AgentResponse types and related factory/type-guard functions from the codebase.

## File: src/types/agent.ts

### AgentResponse Base Interface

```typescript
/**
 * Represents a response from an agent with structured status, data, error, and metadata.
 * This is a discriminated union based on the `status` field.
 *
 * @template T - The type of data returned on success
 */
export interface AgentResponse<T> {
  /** The status of the response, used for type narrowing */
  status: AgentResponseStatus;
  /** The response data (non-null only when status is 'success' or 'partial') */
  data: T | null;
  /** Error details (non-null only when status is 'error') */
  error: AgentErrorDetails | null;
  /** Metadata about the response (timing, tokens, cache info) */
  metadata: AgentResponseMetadata;
}
```

### AgentResponseStatus Type

```typescript
/**
 * Union of all possible response status values.
 * Used as the discriminant for AgentResponse type narrowing.
 */
export type AgentResponseStatus = 'success' | 'error' | 'partial';
```

### SuccessResponse Type

```typescript
/**
 * Represents a successful agent response where data is guaranteed to be non-null.
 *
 * @template T - The type of the returned data
 */
export interface SuccessResponse<T> extends AgentResponse<T> {
  status: 'success';
  data: T;
  error: null;
}
```

### ErrorResponse Type

```typescript
/**
 * Represents a failed agent response where error details are guaranteed to be non-null.
 */
export interface ErrorResponse extends AgentResponse<never> {
  status: 'error';
  data: null;
  error: AgentErrorDetails;
}
```

### PartialResponse Type

```typescript
/**
 * Represents a partial response (e.g., from streaming) where data may be incomplete.
 *
 * @template T - The type of the partial data
 */
export interface PartialResponse<T> extends AgentResponse<T> {
  status: 'partial';
  data: T;
  error: null;
}
```

## AgentErrorDetails Interface

```typescript
/**
 * Detailed error information for failed agent responses.
 */
export interface AgentErrorDetails {
  /** Machine-readable error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context (optional) */
  details?: Record<string, unknown>;
  /** Whether the error is recoverable via retry */
  recoverable?: boolean;
}
```

## AgentResponseMetadata Interface

```typescript
/**
 * Metadata about an agent response, including timing and usage information.
 */
export interface AgentResponseMetadata {
  /** Unique identifier for the agent instance */
  agentId: string;
  /** Request ID for tracing */
  requestId: string;
  /** Response generation duration in milliseconds */
  duration: number;
  /** Token usage information (if available) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Whether the response was served from cache */
  cacheHit?: boolean;
  /** Additional metadata */
  [key: string]: unknown;
}
```

## Factory Helper Functions

### createSuccessResponse

```typescript
/**
 * Creates a success response with the provided data.
 *
 * @template T - The type of the data
 * @param data - The response data
 * @param metadata - Optional metadata (defaults to minimal metadata)
 * @returns A SuccessResponse<T>
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: AgentResponseMetadata
): SuccessResponse<T>;
```

### createErrorResponse

```typescript
/**
 * Creates an error response with the provided error details.
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @param recoverable - Whether the error is recoverable via retry
 * @returns An ErrorResponse
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable?: boolean
): ErrorResponse;
```

### createPartialResponse

```typescript
/**
 * Creates a partial response (e.g., for streaming scenarios).
 *
 * @template T - The type of the partial data
 * @param data - The partial response data
 * @param metadata - Optional metadata
 * @returns A PartialResponse<T>
 */
export function createPartialResponse<T>(
  data: T,
  metadata?: AgentResponseMetadata
): PartialResponse<T>;
```

## Type Guard Functions

### isSuccess

```typescript
/**
 * Type guard that checks if a response is a success response.
 *
 * @template T - The type of data expected on success
 * @param response - The response to check
 * @returns True if the response status is 'success'
 */
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T>;
```

### isError

```typescript
/**
 * Type guard that checks if a response is an error response.
 *
 * @param response - The response to check
 * @returns True if the response status is 'error'
 */
export function isError(
  response: AgentResponse<unknown>
): response is ErrorResponse;
```

### isPartial

```typescript
/**
 * Type guard that checks if a response is a partial response.
 *
 * @template T - The type of data
 * @param response - The response to check
 * @returns True if the response status is 'partial'
 */
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T>;
```

## Type Narrowing Behavior

The discriminated union pattern enables TypeScript to narrow types based on the `status` field:

```typescript
declare const response: AgentResponse<string>;

if (response.status === 'success') {
  // TypeScript knows:
  // - response.data is string (not null)
  // - response.error is null
  console.log(response.data.toUpperCase()); // OK
  console.log(response.error.code);         // Compile error!
}

if (response.status === 'error') {
  // TypeScript knows:
  // - response.data is null
  // - response.error is AgentErrorDetails (not null)
  console.log(response.error.code);         // OK
  console.log(response.data.toUpperCase()); // Compile error!
}
```

## Standard Error Codes

| Code | Description | Recoverable | Usage Context |
|------|-------------|-------------|---------------|
| `INVALID_RESPONSE_FORMAT` | Response doesn't match Zod schema | No | Schema validation failed |
| `VALIDATION_FAILED` | Input validation failed | No | Invalid prompt structure |
| `EXECUTION_FAILED` | Agent execution error | Context-dependent | Runtime error in agent |
| `API_REQUEST_FAILED` | Anthropic API error | Yes (with backoff) | Network/API issues |
| `TOOL_EXECUTION_FAILED` | Tool call failed | Yes | Tool execution error |
| `INTERNAL_ERROR` | Framework error | No | Bug in framework |

## PRD 6.4 Compliance

These types comply with PRD Section 6.4 requirements:

1. **Strict JSON**: All interfaces are JSON-serializable
2. **Status Discriminant**: `status` field enables type narrowing
3. **Null Over Undefined**: Absent values use `null`, not `undefined` (PRD 6.4.4)
4. **Consistent Structure**: All responses have `status`, `data`, `error`, `metadata`
5. **Observable Metadata**: Timing, tokens, cache info always available

## Type Exports

From `src/index.ts`, these types are exported as:
```typescript
export type {
  AgentResponse,
  AgentResponseStatus,
  SuccessResponse,
  ErrorResponse,
  PartialResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
};
export {
  isSuccess,
  isError,
  isPartial,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
};
```

## File References

- **Type definitions**: `src/types/agent.ts`
- **Implementation**: `src/core/agent.ts` (executePrompt method)
- **Test coverage**: `src/__tests__/agent-response.test.ts`
- **PRD reference**: `PRD.md` Section 6 (lines 139-247)
