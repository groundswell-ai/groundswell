# AgentResponse Type System Complete Reference

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Complete reference for AgentResponse type system for call site updates

---

## Executive Summary

The `AgentResponse<T>` type system uses **discriminated unions** for type-safe error handling. Key components:

- **AgentResponse<T>** - Main response interface with discriminated `status` field
- **AgentErrorDetails** - Structured error information
- **AgentResponseMetadata** - Execution metadata
- **Type Guards** - Functions for type narrowing (`isSuccess`, `isError`, `isPartial`)
- **Factory Functions** - Helper functions for creating responses

---

## 1. Core Type Definitions

### 1.1 AgentResponse<T> Interface

**File**: `src/types/agent.ts`
**Lines**: 108-120

```typescript
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata */
  metadata: AgentResponseMetadata;
}
```

**Type Parameter**: `T` - The expected data type for successful responses

**Status Values**: `'success'` | `'error'` | `'partial'`

---

### 1.2 AgentResponseStatus Type

**File**: `src/types/agent.ts`
**Lines**: 100-106

```typescript
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface SuccessResponse<T> extends Omit<AgentResponse<T>, 'status'> {
  status: 'success';
  data: T;
  error: null;
}

export interface ErrorResponse extends Omit<AgentResponse<null>, 'status'> {
  status: 'error';
  data: null;
  error: AgentErrorDetails;
}

export interface PartialResponse<T> extends Omit<AgentResponse<T>, 'status'> {
  status: 'partial';
  data: T;
  error: null;
}
```

---

### 1.3 AgentErrorDetails Interface

**File**: `src/types/agent.ts`
**Lines**: 125-137

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

**Fields**:
- `code` - Error code from `AGENT_ERROR_CODES` constants
- `message` - Human-readable error description
- `details` - Optional additional context
- `recoverable` - Whether the error can be retried

---

### 1.4 AgentResponseMetadata Interface

**File**: `src/types/agent.ts`
**Lines**: 142-160

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

  /** Token usage from the API (optional, for backward compatibility) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional, for backward compatibility) */
  toolCalls?: number;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}
```

---

## 2. Type Guard Functions

### 2.1 isSuccess<T>()

**File**: `src/types/agent.ts`
**Lines**: 315-319

```typescript
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

**Type Narrowing**:
- Returns `true` → `response.data` is type `T` (not null)
- Returns `true` → `response.error` is type `null`

**Usage**:
```typescript
if (isSuccess(response)) {
  // TypeScript knows response.data is T
  console.log(response.data); // No need for optional chaining
}
```

---

### 2.2 isError<T>()

**File**: `src/types/agent.ts`
**Lines**: 335-339

```typescript
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}
```

**Type Narrowing**:
- Returns `true` → `response.data` is type `null`
- Returns `true` → `response.error` is type `AgentErrorDetails` (not null)

**Usage**:
```typescript
if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails
  console.log(response.error.message); // No need for optional chaining
}
```

---

### 2.3 isPartial<T>()

**File**: `src/types/agent.ts`
**Lines**: 355-359

```typescript
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

**Type Narrowing**:
- Returns `true` → `response.data` is type `T`
- Returns `true` → `response.error` is type `null`

**Usage**:
```typescript
if (isPartial(response)) {
  // Handle partial response
  console.log('Partial data:', response.data);
}
```

---

## 3. Factory Functions

### 3.1 createSuccessResponse<T>()

**File**: `src/types/agent.ts`
**Lines**: 216-226

```typescript
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

**Usage**:
```typescript
const response = createSuccessResponse(
  { result: 'success' },
  { agentId: 'my-agent', timestamp: Date.now() }
);
```

---

### 3.2 createErrorResponse()

**File**: `src/types/agent.ts`
**Lines**: 247-267

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: { code, message, details, recoverable },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Usage**:
```typescript
const response = createErrorResponse(
  'VALIDATION_FAILED',
  'Invalid response format',
  { field: 'output' },
  false
);
```

---

### 3.3 createPartialResponse<T>()

**File**: `src/types/agent.ts`
**Lines**: 283-295

```typescript
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

**Usage**:
```typescript
const response = createPartialResponse({ partial: 'result' });
```

---

## 4. Error Code Constants

### 4.1 AGENT_ERROR_CODES

**File**: `src/types/agent.ts`
**Lines**: 189-195

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**Usage**:
```typescript
import { AGENT_ERROR_CODES } from '../types/agent.js';

if (response.status === 'error') {
  switch (response.error.code) {
    case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
      // Handle validation errors
      break;
    case AGENT_ERROR_CODES.API_REQUEST_FAILED:
      // Handle API errors
      break;
  }
}
```

---

## 5. Import Patterns

### 5.1 Direct Import from agent.ts

```typescript
import type {
  AgentResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
  AgentResponseStatus,
  SuccessResponse,
  ErrorResponse,
  PartialResponse,
} from '../types/agent.js';

import {
  AGENT_ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
} from '../types/agent.js';
```

### 5.2 Import from index.ts (Recommended)

```typescript
import type {
  AgentResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
} from 'groundswell/src/types';

import {
  isSuccess,
  isError,
  isPartial,
  AGENT_ERROR_CODES,
} from 'groundswell/src/types';
```

---

## 6. Type Narrowing Examples

### 6.1 Direct Status Check

```typescript
const response: AgentResponse<string> = await agent.prompt(prompt);

// Before status check
// response.data: string | null
// response.error: AgentErrorDetails | null

if (response.status === 'success') {
  // After status check
  // response.data: string (not null)
  // response.error: null

  console.log(response.data.toUpperCase()); // Safe!
}
```

### 6.2 Type Guard Pattern

```typescript
import { isError, isSuccess } from '../types/agent.js';

const response: AgentResponse<string> = await agent.prompt(prompt);

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.log(response.error.message); // Safe!
}

if (isSuccess(response)) {
  // TypeScript knows response.data is string (not null)
  console.log(response.data); // Safe!
}
```

### 6.3 Switch Statement Pattern

```typescript
const { status, data, error } = await agent.prompt<string>(prompt);

switch (status) {
  case 'success':
    // TypeScript knows data is string (not null)
    console.log(data); // Safe!
    break;

  case 'error':
    // TypeScript knows error is AgentErrorDetails (not null)
    console.log(error.message); // Safe!
    break;

  case 'partial':
    // TypeScript knows data is string (not null)
    console.log('Partial:', data); // Safe!
    break;
}
```

---

## 7. Agent.prompt() Method Signature

### 7.1 Method Definition

**File**: `src/core/agent.ts`
**Lines**: 116-121

```typescript
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}
```

**Key Points**:
- **Always** returns `Promise<AgentResponse<T>>`
- **Never** throws errors - returns error response instead
- Uses discriminated unions for type safety

### 7.2 Usage Example

```typescript
// Define the expected data type
interface AnalysisResult {
  sentiment: 'positive' | 'negative';
  score: number;
}

// Create prompt with response format
const prompt = createPrompt({
  user: 'Analyze this text...',
  responseFormat: z.object({
    sentiment: z.enum(['positive', 'negative']),
    score: z.number(),
  }),
});

// Call agent.prompt()
const response: AgentResponse<AnalysisResult> = await agent.prompt(prompt);

// Handle response
if (response.status === 'success') {
  // TypeScript knows response.data is AnalysisResult
  console.log(response.data.sentiment);
  console.log(response.data.score);
}
```

---

## 8. Best Practices

### 8.1 Always Check Status Before Accessing Data

```typescript
// ❌ WRONG
const response = await agent.prompt<T>(prompt);
const data = response.data; // Could be null!

// ✅ CORRECT
const response = await agent.prompt<T>(prompt);
if (response.status === 'success') {
  const data = response.data; // Type narrowed to T
}
```

### 8.2 Use Type Guards for Cleaner Syntax

```typescript
// ✅ RECOMMENDED
import { isError } from '../types/agent.js';

const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  // TypeScript knows response.error is not null
  console.log(response.error.message); // No optional chaining needed
}
```

### 8.3 Handle All Response Types

```typescript
const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  // Handle error
  throw new Error(response.error.message);
}

if (isSuccess(response)) {
  // Handle success
  return response.data;
}

if (isPartial(response)) {
  // Handle partial
  return response.data;
}
```

### 8.4 Access Metadata for Observability

```typescript
const response = await agent.prompt<T>(prompt);

const { agentId, timestamp, duration, requestId, usage } = response.metadata;

console.log(`Agent ${agentId} took ${duration}ms`);
console.log(`Used ${usage?.input_tokens} input tokens`);
```

### 8.5 Check Recoverable Flag Before Retrying

```typescript
const response = await agent.prompt<T>(prompt);

if (isError(response) && response.error.recoverable) {
  // Retry with backoff
  await delay(1000);
  return await agent.prompt<T>(prompt);
}
```

---

## 9. Common Patterns

### 9.1 Status Check with Early Return

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  throw new Error(response.error?.message ?? 'Agent prompt failed');
}

const data = response.data!;
// Use data...
```

### 9.2 Type Guard Pattern

```typescript
import { isError, isSuccess } from '../types/agent.js';

const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  throw new Error(response.error.message);
}

if (isSuccess(response)) {
  return response.data;
}

throw new Error('Unexpected response type');
```

### 9.3 Destructuring Pattern

```typescript
const { status, data, error, metadata } = await agent.prompt<T>(prompt);

if (status === 'success') {
  console.log('Success:', data);
  console.log('Duration:', metadata.duration);
} else if (status === 'error') {
  console.error('Error:', error.message);
}
```

---

## 10. Summary

The `AgentResponse<T>` type system provides:

1. **Type Safety**: Discriminated unions for compile-time type checking
2. **Explicit Error Handling**: Structured error information with codes and messages
3. **Type Guards**: Helper functions for clean type narrowing
4. **Factory Functions**: Convenient constructors for creating responses
5. **Metadata**: Rich execution context for debugging and observability

**Key Principle**: Always check `response.status` before accessing `response.data` or `response.error`.

**Import Path**: `import { AgentResponse, isSuccess, isError } from '../types/agent.js';`

This type system is the foundation for all `agent.prompt()` call site updates.
