# AgentResponse Type Documentation Inventory

## Overview

This document provides a comprehensive inventory of all AgentResponse-related types, interfaces, functions, and constants in `/home/dustin/projects/groundswell/src/types/agent.ts` (lines 92-359) that require JSDoc documentation, based on PRD section 6 requirements.

## PRD Section 6 Requirements Summary

### 6.1 AgentResponse Interface
- Core response wrapper with consistent structure
- Type parameter T for data type
- Discriminated union based on status

### 6.2 AgentErrorDetails Interface
- Machine-readable error codes (SCREAMING_SNAKE_CASE)
- Human-readable error messages
- Additional context details
- Recoverable flag for retry logic

### 6.3 AgentResponseMetadata Interface
- Agent identifier
- Unix timestamp (milliseconds)
- Execution duration
- Request correlation ID
- Token usage (optional, backward compatibility)

### 6.4 Response Requirements (CRITICAL)
1. **Strict JSON**: Must be parseable by `JSON.parse()` without modification
2. **No Prose Wrapping**: No markdown code blocks or conversational text
3. **Consistent Structure**: Must conform to `AgentResponse` interface
4. **Null over Undefined**: Use `null` for absent values
5. **Error Responses**: Failed operations return valid JSON with `status: 'error'`

### 6.5 Example Responses
- Success response with data
- Error response with details
- Partial response for streaming

## Documentation Inventory

### 1. Type Aliases

#### `AgentResponseStatus` (Line 100)
```ts
export type AgentResponseStatus = 'success' | 'error' | 'partial';
```

**Current JSDoc State**: ✅ Basic - Has good summary
```js
/**
 * Status of an agent response
 * Used as discriminant for type narrowing
 */
```

**Documentation Needs**: ✅ Complete
- Current documentation is sufficient
- References type narrowing usage

**PRD Requirements**: 6.1 (AgentResponse Interface)
- Must document as discriminant for type narrowing
- List all three valid values

**Suggested @example**: None needed - simple union type

---

#### `SuccessResponse<T>` (Line 169)
```ts
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Must document as discriminated union type
- Explain that data is T (not null) and error is null
- Reference PRD 6.4.3 (Consistent Structure)

**PRD Requirements**: 6.1, 6.4
- Document type narrowing capability
- Explain data and nullability constraints

**Suggested @example**:
```ts
/**
 * Success response type - data is T (not null), error is null
 *
 * @template T - The type of data returned on success
 * @example
 * // Type narrowing example
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 *   // response.error is guaranteed to be null
 * }
 */
```

---

#### `ErrorResponse` (Line 174)
```ts
export type ErrorResponse = AgentResponse<null> & { status: 'error' };
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Must document as discriminated union type
- Explain that data is null and error is AgentErrorDetails (not null)
- Reference PRD 6.4.5 (Error Responses)

**PRD Requirements**: 6.2, 6.4.5
- Document type narrowing capability
- Explain null data requirement

**Suggested @example**:
```ts
/**
 * Error response type - data is null, error is AgentErrorDetails (not null)
 *
 * @example
 * // Type narrowing example
 * if (isError(response)) {
 *   console.log(response.error.code); // TypeScript knows error exists
 *   // response.data is guaranteed to be null
 * }
 */
```

---

#### `PartialResponse<T>` (Line 179)
```ts
export type PartialResponse<T> = AgentResponse<T> & { status: 'partial' };
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Must document as discriminated union type
- Explain for streaming/incremental results
- Reference PRD 6.5 (Example Responses)

**PRD Requirements**: 6.5 (Partial Response example)
- Document streaming use case
- Explain type narrowing

**Suggested @example**:
```ts
/**
 * Partial response type - data is T, error is null
 * Used for streaming/incremental results
 *
 * @template T - The type of partial data
 * @example
 * // Type narrowing example
 * if (isPartial(response)) {
 *   console.log('Partial result:', response.data);
 *   // response.error is guaranteed to be null
 * }
 */
```

---

### 2. Interfaces

#### `AgentResponse<T>` (Lines 108-120)
```ts
export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

**Current JSDoc State**: ✅ Good - Has summary and template
```js
/**
 * Response wrapper for agent execution results
 * Provides consistent structure with status, data, error, and metadata
 *
 * @template T - The type of data returned on success
 */
```

**Documentation Needs**: Enhancement needed
- Add PRD 6.4 requirements documentation
- Explain null/undefined behavior
- Add @example with JSON format

**PRD Requirements**: 6.1, 6.4
- Document strict JSON requirement
- Explain null over undefined
- Document consistent structure requirement

**Suggested @example**:
```ts
/**
 * Response wrapper for agent execution results
 * Provides consistent structure with status, data, error, and metadata
 *
 * @template T - The type of data returned on success
 * @example
 * // Success response (PRD 6.5)
 * const successResponse: AgentResponse<string> = {
 *   status: 'success',
 *   data: 'Task completed',
 *   error: null,
 *   metadata: {
 *     agentId: 'agent-abc123',
 *     timestamp: 1706140800000,
 *     duration: 1523
 *   }
 * };
 *
 * // Error response (PRD 6.5)
 * const errorResponse: AgentResponse<null> = {
 *   status: 'error',
 *   data: null,
 *   error: {
 *     code: 'EXECUTION_FAILED',
 *     message: 'Failed to compile TypeScript files',
 *     details: { failedFiles: ['src/index.ts'] },
 *     recoverable: true
 *   },
 *   metadata: {
 *     agentId: 'agent-abc123',
 *     timestamp: 1706140800000
 *   }
 * };
 */
```

---

#### `AgentErrorDetails` (Lines 125-137)
```ts
export interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Document all fields with PRD requirements
- Explain SCREAMING_SNAKE_CASE for code
- Explain recoverable flag usage
- Add examples from PRD 6.5

**PRD Requirements**: 6.2, 6.4.5
- Document machine-readable error codes
- Explain human-readable messages
- Document recoverable flag

**Suggested @example**:
```ts
/**
 * Error details for agent error responses
 *
 * @property {string} code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @property {string} message - Human-readable error description
 * @property {Record<string, unknown> | null} [details] - Additional error context
 * @property {boolean} recoverable - Whether the error is recoverable (can retry)
 *
 * @example
 * // Error details from PRD 6.5
 * const errorDetails: AgentErrorDetails = {
 *   code: 'EXECUTION_FAILED',
 *   message: 'Failed to compile TypeScript files',
 *   details: {
 *     failedFiles: ['src/index.ts'],
 *     compilerErrors: ['TS2307: Cannot find module \'foo\'']
 *   },
 *   recoverable: true
 * };
 */
```

---

#### `AgentResponseMetadata` (Lines 142-160)
```ts
export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;
  usage?: TokenUsage;
  toolCalls?: number;
}
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Document all fields with PRD requirements
- Explain Unix timestamp requirement
- Document optional fields and nullability
- Reference backward compatibility

**PRD Requirements**: 6.3
- Document agent identifier
- Explain timestamp format
- Document optional fields

**Suggested @example**:
```ts
/**
 * Metadata for agent responses
 *
 * @property {string} agentId - Agent identifier (required)
 * @property {number} timestamp - Unix timestamp in milliseconds (required)
 * @property {number | null} [duration] - Execution duration in milliseconds (optional)
 * @property {string | null} [requestId] - Request correlation ID (optional)
 * @property {TokenUsage} [usage] - Token usage from the API (optional, backward compatibility)
 * @property {number} [toolCalls] - Number of tool invocations (optional, backward compatibility)
 *
 * @example
 * // Metadata from PRD 6.5
 * const metadata: AgentResponseMetadata = {
 *   agentId: 'agent-abc123',
 *   timestamp: 1706140800000,
 *   duration: 1523,
 *   requestId: 'req-123'
 * };
 */
```

---

### 3. Constants

#### `AGENT_ERROR_CODES` (Lines 189-195)
```ts
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**Current JSDoc State**: ❌ None

**Documentation Needs**: High
- Document standard error codes
- Explain SCREAMING_SNAKE_CASE convention
- Reference PRD 6.4.5 (Error Responses)
- Add examples of usage

**PRD Requirements**: 6.4.5
- Document standard error codes
- Explain validation with INVALID_RESPONSE_FORMAT

**Suggested @example**:
```ts
/**
 * Standard error codes for agent responses
 * Use SCREAMING_SNAKE_CASE convention
 *
 * @property {string} INVALID_RESPONSE_FORMAT - Response not valid JSON or doesn't match schema
 * @property {string} VALIDATION_FAILED - Response validation failed
 * @property {string} EXECUTION_FAILED - Agent execution failed
 * @property {string} API_REQUEST_FAILED - API request failed
 * @property {string} TOOL_EXECUTION_FAILED - Tool execution failed
 *
 * @example
 * // Using error codes in createErrorResponse
 * const error = createErrorResponse(
 *   AGENT_ERROR_CODES.VALIDATION_FAILED,
 *   'Response validation failed',
 *   { field: 'invalidValue' }
 * );
 */
```

---

### 4. Factory Functions

#### `createSuccessResponse<T>` (Lines 216-226)
```ts
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

**Current JSDoc State**: ✅ Good - Has parameters and return type
```js
/**
 * Creates a success response with data and metadata.
 *
 * @param data - The response data
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse
 *
 * @example
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'success' },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 * ```
 */
```

**Documentation Needs**: Enhancement needed
- Add PRD 6.4 requirements note
- Document JSON serialization guarantee
- Add example with actual JSON output

**PRD Requirements**: 6.4.1 (Strict JSON), 6.4.3 (Consistent Structure)

**Suggested @example enhancement**:
```ts
/**
 * Creates a success response with data and metadata.
 * Response will be valid JSON conforming to AgentResponse interface (PRD 6.4).
 *
 * @param data - The response data
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse with status 'success', data, null error, and metadata
 *
 * @example
 * ```ts
 * // Create response
 * const response = createSuccessResponse(
 *   { result: 'success', artifacts: ['file.ts'] },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 *
 * // Guaranteed to be valid JSON (PRD 6.4.1)
 * const jsonString = JSON.stringify(response);
 * const parsed = JSON.parse(jsonString); // Always valid
 * ```
 */
```

---

#### `createErrorResponse` (Lines 247-267)
```ts
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      details: details ?? null,
      recoverable,
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Current JSDoc State**: ✅ Good - Has parameters and return type
```js
/**
 * Creates an error response with error details.
 *
 * @param code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @param recoverable - Whether the error is recoverable (default: false)
 * @returns An error AgentResponse with null data
 *
 * @example
 * ```ts
 * const response = createErrorResponse(
 *   'INVALID_RESPONSE_FORMAT',
 *   'Failed to parse response',
 *   { field: 'value' },
 *   false
 * );
 * ```
 */
```

**Documentation Needs**: Enhancement needed
- Add PRD 6.4.5 requirements note
- Explain data is always null
- Add example from PRD 6.5

**PRD Requirements**: 6.4.5 (Error Responses)

**Suggested @example enhancement**:
```ts
/**
 * Creates an error response with error details.
 * Response follows PRD 6.4.5: data is null, error is populated (PRD 6.4.5).
 *
 * @param code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @param recoverable - Whether the error is recoverable (default: false)
 * @returns An error AgentResponse with null data and populated error field
 *
 * @example
 * ```ts
 * // Error response from PRD 6.5
 * const response = createErrorResponse(
 *   'EXECUTION_FAILED',
 *   'Failed to compile TypeScript files',
 *   {
 *     failedFiles: ['src/index.ts'],
 *     compilerErrors: ['TS2307: Cannot find module \'foo\'']
 *   },
 *   true
 * );
 *
 * // Response structure:
 * // {
 * //   "status": "error",
 * //   "data": null,
 * //   "error": { ... },
 * //   "metadata": { ... }
 * // }
 * ```
 */
```

---

#### `createPartialResponse<T>` (Lines 283-295)
```ts
export function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Current JSDoc State**: ✅ Good - Has parameters and return type
```js
/**
 * Creates a partial response for streaming/incremental results.
 *
 * @param data - The partial response data
 * @returns A partial AgentResponse
 *
 * @example
 * ```ts
 * const response = createPartialResponse({
 *   completedSteps: 3,
 *   totalSteps: 5
 * });
 * ```
 */
```

**Documentation Needs**: Enhancement needed
- Reference PRD 6.5 (Partial Response example)
- Explain streaming use case
- Add example showing incremental updates

**PRD Requirements**: 6.5 (Partial Response)

**Suggested @example enhancement**:
```ts
/**
 * Creates a partial response for streaming/incremental results.
 * Used for long-running tasks with intermediate results (PRD 6.5).
 *
 * @param data - The partial response data
 * @returns A partial AgentResponse with status 'partial'
 *
 * @example
 * ```ts
 * // Simulating streaming results
 * let completed = 0;
 * const total = 5;
 *
 * for (let i = 0; i < total; i++) {
 *   completed++;
 *   const partial = createPartialResponse({
 *     completedSteps: completed,
 *     totalSteps: total,
 *     currentResult: `Step ${completed} completed`
 *   });
 *   console.log(JSON.stringify(partial)); // Stream to consumer
 * }
 * ```
 */
```

---

### 5. Type Guards

#### `isSuccess<T>` (Lines 315-319)
```ts
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

**Current JSDoc State**: ✅ Good - Has purpose and return type
```js
/**
 * Type guard for success responses.
 * Narrows the type to SuccessResponse<T> where data is T (not null).
 *
 * @param response - The response to check
 * @returns True if the response status is 'success'
 *
 * @example
 * ```ts
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 * }
 * ```
 */
```

**Documentation Needs**: ✅ Complete
- Current documentation is sufficient
- References type narrowing correctly

**PRD Requirements**: 6.4.3 (Consistent Structure)

---

#### `isError<T>` (Lines 335-339)
```ts
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}
```

**Current JSDoc State**: ✅ Good - Has purpose and return type
```js
/**
 * Type guard for error responses.
 * Narrows the type to ErrorResponse where error is AgentErrorDetails (not null).
 *
 * @param response - The response to check
 * @returns True if the response status is 'error'
 *
 * @example
 * ```ts
 * if (isError(response)) {
 *   console.log(response.error.code); // TypeScript knows error exists
 * }
 * ```
 */
```

**Documentation Needs**: ✅ Complete
- Current documentation is sufficient
- References type narrowing correctly

**PRD Requirements**: 6.4.5 (Error Responses)

---

#### `isPartial<T>` (Lines 355-359)
```ts
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

**Current JSDoc State**: ✅ Good - Has purpose and return type
```js
/**
 * Type guard for partial responses.
 * Narrows the type to PartialResponse<T>.
 *
 * @param response - The response to check
 * @returns True if the response status is 'partial'
 *
 * @example
 * ```ts
 * if (isPartial(response)) {
 *   console.log('Partial result:', response.data);
 * }
 * ```
 */
```

**Documentation Needs**: ✅ Complete
- Current documentation is sufficient
- References type narrowing correctly

**PRD Requirements**: 6.5 (Partial Response)

---

## Summary of Documentation Tasks

### Items requiring NO changes (6 items):
1. `AgentResponseStatus` - Already well documented
2. `AgentResponse<T>` - Good, needs enhancement with PRD examples
3. `createSuccessResponse<T>` - Good, needs enhancement with PRD requirements
4. `createErrorResponse` - Good, needs enhancement with PRD examples
5. `isSuccess<T>` - Already well documented
6. `isError<T>` - Already well documented

### Items requiring ENHANCEMENT (4 items):
1. `AgentResponse<T>` - Add PRD 6.4 requirements and JSON examples
2. `createSuccessResponse<T>` - Add PRD 6.4 requirements note
3. `createErrorResponse` - Add PRD 6.4.5 requirements and examples
4. `createPartialResponse<T>` - Add PRD 6.5 examples and streaming context

### Items requiring ADDITIONAL DOCUMENTATION (7 items):
1. `SuccessResponse<T>` - Missing discriminated union documentation
2. `ErrorResponse` - Missing discriminated union documentation
3. `PartialResponse<T>` - Missing discriminated union documentation
4. `AgentErrorDetails` - Missing field documentation and examples
5. `AgentResponseMetadata` - Missing field documentation
6. `AGENT_ERROR_CODES` - Missing property documentation and examples
7. `isPartial<T>` - Already documented, but could use streaming example

### Priority Items for PRD 6.4 Compliance:
1. **High Priority**: All interfaces and discriminated unions
2. **Medium Priority**: Factory functions with PRD requirements
3. **Low Priority**: Constants and utility functions

## Recommendations

1. **Immediate Action**: Add JSDoc to all interfaces and discriminated unions
2. **PRD Integration**: Include PRD 6.4 requirements in all relevant documentation
3. **Examples**: Add JSON examples showing strict format compliance
4. **Type Safety**: Emphasize type narrowing benefits in type guards
5. **Validation**: Reference INVALID_RESPONSE_FORMAT error code

All documentation should clearly communicate the JSON requirements from PRD 6.4 and the examples from PRD 6.5 to ensure developers understand the strict format requirements.