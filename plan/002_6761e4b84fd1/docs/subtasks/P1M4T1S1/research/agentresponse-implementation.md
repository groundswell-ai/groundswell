# AgentResponse Implementation Analysis

**Date**: 2026-01-24
**Context**: PRP for P1.M4.T1.S1 - Run unit tests and fix failures
**Analyzed By**: Research Agent

---

## Overview

This document provides a complete analysis of the AgentResponse implementation in Groundswell, essential for understanding what tests validate and how to fix failing tests.

---

## 1. Complete AgentResponse Type Definitions

### Core Interface

```typescript
interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

### Discriminated Union Variants

The AgentResponse is implemented as a discriminated union with three variants:

#### SuccessResponse<T>

```typescript
interface SuccessResponse<T> {
  status: 'success';
  data: T;              // Non-null when status is 'success'
  error: null;          // Always null for success
  metadata: AgentResponseMetadata;
}
```

#### ErrorResponse

```typescript
interface ErrorResponse {
  status: 'error';
  data: null;           // Always null for error
  error: AgentErrorDetails;  // Non-null when status is 'error'
  metadata: AgentResponseMetadata;
}
```

#### PartialResponse<T>

```typescript
interface PartialResponse<T> {
  status: 'partial';
  data: T;              // Present for partial results
  error: null;          // Null for partial (not an error state)
  metadata: AgentResponseMetadata;
}
```

### AgentResponseStatus Type

```typescript
type AgentResponseStatus = 'success' | 'error' | 'partial';
```

### AgentErrorDetails Interface

```typescript
interface AgentErrorDetails {
  code: ErrorCode;              // Machine-readable error code
  message: string;              // Human-readable error message
  details?: Record<string, unknown>;  // Additional error context
  recoverable: boolean;         // Whether operation can be retried
}
```

### AgentResponseMetadata Interface

```typescript
interface AgentResponseMetadata {
  agentId: string;              // Unique agent identifier
  timestamp: number;            // Unix timestamp (ms)
  duration: number;             // Operation duration (ms)

  // Optional fields
  model?: string;               // Model used (e.g., 'claude-3-opus')
  tokensUsed?: {
    input: number;
    output: number;
  };
  cacheHit?: boolean;           // Whether cache was used
  toolCount?: number;           // Number of tools invoked
}
```

---

## 2. Agent.prompt() Implementation Details

### Location
`/home/dustin/projects/groundswell/src/core/agent.ts`

### Method Signature

```typescript
async prompt<T>(prompt: Prompt<T>): Promise<AgentResponse<T>>
```

### Implementation Flow

```
1. Initialization Phase
   ├─ Create metadata (agentId, timestamp)
   ├─ Check cache if enabled
   └─ Merge prompt config with agent config

2. API Execution Phase
   ├─ Call Anthropic API with messages
   ├─ Handle tool use loops (if tools present)
   ├─ Track token usage and timing
   └─ Emit cache hit/miss events

3. Response Processing Phase
   ├─ Extract JSON from API response
   ├─ Validate against Prompt's Zod schema
   ├─ Handle INVALID_RESPONSE_FORMAT errors
   └─ Parse into typed object

4. Response Construction Phase
   ├─ Create success response with data
   ├─ Create error response if validation failed
   ├─ Add metadata (duration, tokens, etc.)
   └─ Return AgentResponse<T>

5. Error Handling Phase
   ├─ Catch API request failures
   ├─ Catch JSON parsing errors
   ├─ Catch schema validation errors
   ├─ Wrap in appropriate error responses
   └─ Return with recoverable flag
```

### Key Implementation Features

**Caching Support:**
```typescript
if (this.enableCache && prompt.cacheKey) {
  const cached = this.cache.get(prompt.cacheKey);
  if (cached) {
    return createSuccessResponse(cached, {
      ...metadata,
      cacheHit: true,
    });
  }
}
```

**Tool Integration:**
```typescript
if (prompt.tools && prompt.tools.length > 0) {
  // Execute tool use loop
  // Track tool invocations in metadata
  return { ...response, metadata: { ...metadata, toolCount } };
}
```

**Event Emission:**
```typescript
this.emit('agentPromptStart', { agentId: this.id, prompt });
// ... execution ...
this.emit('agentPromptEnd', { agentId: this.id, response });
```

---

## 3. Factory Functions

All factory functions are exported from `/src/types/agent.ts`.

### createSuccessResponse<T>()

```typescript
function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): SuccessResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

**Usage:**
```typescript
const response = createSuccessResponse(
  { result: 'Operation completed' },
  {
    agentId: 'agent-123',
    timestamp: Date.now(),
    duration: 150,
  }
);
```

### createErrorResponse()

```typescript
function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): ErrorResponse {
  return {
    status: 'error',
    data: null,
    error: { code, message, details, recoverable },
    metadata: {
      agentId: 'system',
      timestamp: Date.now(),
      duration: 0,
    },
  };
}
```

**Usage:**
```typescript
const response = createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  'Schema validation failed',
  { validationErrors: ['Missing required field: name'] },
  false  // Not recoverable - schema mismatch
);
```

### createPartialResponse<T>()

```typescript
function createPartialResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): PartialResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata,
  };
}
```

**Usage:**
```typescript
const response = createPartialResponse(
  { result: 'Partial data available' },
  {
    agentId: 'agent-456',
    timestamp: Date.now(),
    duration: 100,
  }
);
```

---

## 4. Error Codes and Meanings

### Standard Error Codes

| Error Code | Description | Recoverable | Use Case |
|------------|-------------|-------------|----------|
| `INVALID_RESPONSE_FORMAT` | Response doesn't match schema | `false` | JSON parsing failed, schema validation failed |
| `VALIDATION_FAILED` | Input validation failed | `true` | Invalid prompt parameters, bad input data |
| `EXECUTION_FAILED` | Runtime execution error | `true` | Unexpected runtime error during execution |
| `API_REQUEST_FAILED` | Anthropic API error | `true` | Network error, timeout, rate limit |
| `TOOL_EXECUTION_FAILED` | Tool invocation error | `true` | Tool threw exception or returned invalid data |
| `INTERNAL_ERROR` | System bug | `false` | Unexpected system error, should not occur |

### Error Code Type Definition

```typescript
type ErrorCode =
  | 'INVALID_RESPONSE_FORMAT'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'API_REQUEST_FAILED'
  | 'TOOL_EXECUTION_FAILED'
  | 'INTERNAL_ERROR';
```

### Error Code Usage in Tests

```typescript
// Test for specific error code
it('should_return_invalid_format_error', async () => {
  const response = await agent.prompt(invalidPrompt);

  expect(response.status).toBe('error');
  expect(response.error.code).toBe('INVALID_RESPONSE_FORMAT');
  expect(response.error.recoverable).toBe(false);
});
```

---

## 5. Zod Validation Schemas

### Schema Locations
All Zod schemas are defined in `/src/types/agent.ts`.

### AgentResponseStatusSchema

```typescript
const AgentResponseStatusSchema = z.enum(['success', 'error', 'partial']);
```

### AgentErrorDetailsSchema

```typescript
const AgentErrorDetailsSchema = z.object({
  code: z.enum([
    'INVALID_RESPONSE_FORMAT',
    'VALIDATION_FAILED',
    'EXECUTION_FAILED',
    'API_REQUEST_FAILED',
    'TOOL_EXECUTION_FAILED',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  recoverable: z.boolean(),
});
```

### AgentResponseMetadataSchema

```typescript
const AgentResponseMetadataSchema = z.object({
  agentId: z.string(),
  timestamp: z.number(),
  duration: z.number().nonnegative(),

  // Optional fields
  model: z.string().optional(),
  tokensUsed: z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
  }).optional(),
  cacheHit: z.boolean().optional(),
  toolCount: z.number().nonnegative().optional(),
});
```

### AgentResponseSchema<T> (Factory)

```typescript
function AgentResponseSchema<T extends z.ZodType>(
  dataSchema: T
): z.ZodDiscriminatedUnion<
  ['success', 'error', 'partial'],
  z.ZodTypeAny[]
> {
  return z.discriminatedUnion('status', [
    // Success variant
    z.object({
      status: z.literal('success'),
      data: dataSchema,
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),

    // Error variant
    z.object({
      status: z.literal('error'),
      data: z.null(),
      error: AgentErrorDetailsSchema,
      metadata: AgentResponseMetadataSchema,
    }),

    // Partial variant
    z.object({
      status: z.literal('partial'),
      data: dataSchema,
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),
  ]);
}
```

### Schema Validation Usage

```typescript
// Define data schema
const dataSchema = z.object({
  bugs: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high']),
});

// Create AgentResponse schema
const responseSchema = AgentResponseSchema(dataSchema);

// Validate response
const validationResult = responseSchema.parse(response);
```

---

## 6. Code Examples

### Success Response Creation

```typescript
import { createSuccessResponse } from './types/agent.js';

const successResponse = createSuccessResponse(
  { result: 'Task completed successfully' },
  {
    agentId: 'analysis-agent-123',
    timestamp: 1706123456789,
    duration: 250,
    model: 'claude-3-opus',
    tokensUsed: { input: 150, output: 75 },
  }
);

// Result:
// {
//   status: 'success',
//   data: { result: 'Task completed successfully' },
//   error: null,
//   metadata: { agentId: '...', timestamp: ..., duration: 250, ... }
// }
```

### Error Response Creation

```typescript
import { createErrorResponse } from './types/agent.js';

const errorResponse = createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  'Response does not match expected schema',
  {
    field: 'email',
    expected: 'string (valid email)',
    received: 'not-an-email',
  },
  false  // Not recoverable
);

// Result:
// {
//   status: 'error',
//   data: null,
//   error: {
//     code: 'INVALID_RESPONSE_FORMAT',
//     message: 'Response does not match expected schema',
//     details: { field: 'email', expected: '...', received: '...' },
//     recoverable: false
//   },
//   metadata: { agentId: 'system', timestamp: ..., duration: 0 }
// }
```

### Handling AgentResponse in Production Code

```typescript
import type { AgentResponse } from './types/agent.js';
import { isSuccess, isError } from './types/agent.js';

async function processAgentPrompt(agent: Agent, prompt: Prompt<string>) {
  const response = await agent.prompt(prompt);

  // Type narrowing with guards
  if (isSuccess(response)) {
    // TypeScript knows: response.data is string (not null)
    // response.error is null
    console.log('Success:', response.data);
    return response.data;
  }

  if (isError(response)) {
    // TypeScript knows: response.error is AgentErrorDetails (not null)
    // response.data is null
    console.error(`[${response.error.code}] ${response.error.message}`);

    if (response.error.recoverable) {
      // Retry logic
      return await retryOperation();
    } else {
      throw new Error(response.error.message);
    }
  }

  if (isPartial(response)) {
    // Handle partial results
    console.log('Partial:', response.data);
    return response.data;
  }
}
```

### Testing AgentResponse

```typescript
import { describe, it, expect } from 'vitest';
import { isSuccess, isError } from '../../types/agent.js';

describe('AgentResponse', () => {
  it('should_narrow_type_with_status_check', () => {
    const response = createSuccessResponse('test', metadata);

    if (response.status === 'success') {
      // TypeScript knows response.data is string
      expect(response.data).toBeTypeOf('string');
      expect(response.error).toBeNull();
    }
  });

  it('should_narrow_type_with_isSuccess_guard', () => {
    const response = createSuccessResponse('test', metadata);

    if (isSuccess(response)) {
      // Same narrowing with utility function
      expect(response.data).toBeTypeOf('string');
    }
  });

  it('should_handle_error_response', () => {
    const response = createErrorResponse('TEST', 'test', {}, false);

    if (isError(response)) {
      expect(response.error.code).toBe('TEST');
      expect(response.data).toBeNull();
    }
  });
});
```

---

## 7. Type Guards

### isSuccess()

```typescript
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

### isError()

```typescript
function isError(response: AgentResponse<unknown>): response is ErrorResponse {
  return response.status === 'error';
}
```

### isPartial()

```typescript
function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

### Type Guard Usage

```typescript
// Before type guard
function processData(response: AgentResponse<string>) {
  // TypeScript: response.data is string | null
  // TypeScript: response.error is AgentErrorDetails | null
}

// After type guard
function processData(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    // TypeScript: response.data is string (not null)
    // TypeScript: response.error is null
    const result: string = response.data;
  }
}
```

---

## 8. PRD Compliance Implementation

### PRD 6.4.4: Null Over Undefined

All AgentResponse implementations use `null` instead of `undefined`:

```typescript
// ✅ CORRECT - PRD 6.4.4 Compliant
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,      // Not undefined
  metadata: { ... },
};

// ❌ WRONG - Not PRD 6.4.4 Compliant
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // Should be null
  metadata: { ... },
};
```

### PRD 6.2: Error Code Handling

All six required error codes are implemented:

```typescript
type ErrorCode =
  | 'INVALID_RESPONSE_FORMAT'  // Schema violations
  | 'VALIDATION_FAILED'        // Input validation
  | 'EXECUTION_FAILED'         // Runtime errors
  | 'API_REQUEST_FAILED'       // Network/API errors
  | 'TOOL_EXECUTION_FAILED'    // Tool errors
  | 'INTERNAL_ERROR';          // System bugs
```

### PRD 6.4: AgentResponse Structure

All responses conform to the strict AgentResponse structure:

```typescript
interface AgentResponse<T> {
  status: 'success' | 'error' | 'partial';  // Discriminator
  data: T | null;                           // Success/partial: T, Error: null
  error: AgentErrorDetails | null;          // Error: details, Success/partial: null
  metadata: AgentResponseMetadata;          // Always present
}
```

---

## 9. Key Implementation Principles

### 1. Type Safety Through Discriminated Unions

The discriminated union pattern enables TypeScript to narrow types based on the `status` field:

```typescript
if (response.status === 'success') {
  // TypeScript knows: response.data is T (not null)
  // TypeScript knows: response.error is null
}
```

### 2. Consistent Error Structure

All errors follow the same structure with:
- Machine-readable `code` field
- Human-readable `message` field
- Optional `details` object for context
- `recoverable` flag for retry logic

### 3. Rich Observability

Every response includes metadata:
- Timing information (`timestamp`, `duration`)
- Agent identification (`agentId`)
- Token usage (`tokensUsed`)
- Cache information (`cacheHit`)
- Tool usage (`toolCount`)

### 4. Defense-in-Depth Validation

Multiple validation layers:
1. Factory function validation
2. Runtime Zod schema validation
3. Prompt response validation
4. JSON parsing validation

### 5. PRD 6.4 Compliance

- All responses are valid JSON
- Uses `null` instead of `undefined`
- Consistent structure across all variants
- No prose wrapping in data field

---

## Summary

The AgentResponse implementation provides:

1. **Type Safety**: Discriminated unions enable proper TypeScript narrowing
2. **Error Handling**: Machine-readable error codes with recoverable flag
3. **Observability**: Rich metadata for debugging and monitoring
4. **Validation**: Defense-in-depth with Zod schemas
5. **PRD Compliance**: Follows PRD Section 6 requirements

This implementation is the foundation for all agent interactions in Groundswell, ensuring reliability, debuggability, and type safety throughout the system.
