# Response Wrapper Patterns Research

**PRP ID**: P1.M1.T1.S1
**Research Date**: 2026-01-24
**Topic**: TypeScript response wrapper patterns for agent responses

---

## Executive Summary

This document compiles external research on TypeScript response wrapper patterns, discriminated unions, and best practices for implementing `AgentResponse<T>` in the Groundswell codebase.

---

## 1. Discriminated Unions in TypeScript

### 1.1 TypeScript Documentation

**Reference**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions

A discriminated union is a type that uses a common property (the discriminant) to narrow the type:

```typescript
interface SuccessResponse<T> {
  status: 'success';
  data: T;
}

interface ErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
  };
}

type Response<T> = SuccessResponse<T> | ErrorResponse;

// Type narrowing works on the discriminant
function handleResponse<T>(response: Response<T>) {
  if (response.status === 'success') {
    // TypeScript knows: response.data is T
    console.log(response.data);
  } else {
    // TypeScript knows: response.error exists
    console.log(response.error.message);
  }
}
```

**Key Insight**: The `status` field acts as a discriminant that enables type narrowing.

### 1.2 Application to AgentResponse<T>

**Reference**: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#discriminated-unions

```typescript
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

// Type narrowing example
function handleAgentResponse<T>(response: AgentResponse<T>) {
  switch (response.status) {
    case 'success':
      // TypeScript knows: response.data is T
      return response.data;
    case 'error':
      // TypeScript knows: response.error is AgentErrorDetails
      throw new Error(response.error.message);
    case 'partial':
      // TypeScript knows: response.data could be partial T
      return response.data;
  }
}
```

---

## 2. Result Type Pattern

### 2.1 Functional Programming Result<T, E>

**Reference**: Rust's Result<T, E> type, adapted to TypeScript

```typescript
type Result<T, E> = Success<T> | Failure<E>;

interface Success<T> {
  type: 'success';
  value: T;
}

interface Failure<E> {
  type: 'failure';
  error: E;
}

// Usage
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { type: 'failure', error: 'Division by zero' };
  }
  return { type: 'success', value: a / b };
}
```

**Comparison to AgentResponse**:
- Similar concept: wrap result in a type that indicates success/failure
- AgentResponse is more specific to API responses
- AgentResponse includes metadata (timing, usage)

### 2.2 neverthrow Library Pattern

**Reference**: https://github.com/supermacro/neverthrow

The neverthrow library provides a Result type for TypeScript:

```typescript
import { Result, ok, err } from 'neverthrow';

async function fetchUser(id: string): Promise<Result<User, Error>> {
  const user = await db.findUser(id);
  if (!user) {
    return err(new Error('User not found'));
  }
  return ok(user);
}

// Usage
const result = await fetchUser('123');
result.match(
  (user) => console.log('Found:', user.name),
  (error) => console.error('Error:', error.message)
);
```

**Key Patterns for AgentResponse**:
1. **Chaining**: `.map()`, `.asyncMap()`, `.andThen()` for transformation
2. **Matching**: `.match()` for handling success/error cases
3. **Unwrapping**: `.unwrapOr()` for safe value extraction

---

## 3. Industry Best Practices

### 3.1 API Response Wrappers

**Reference**: Common patterns in web frameworks (Express, Fastify, NestJS)

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

// With status code (alternative pattern)
interface ApiResponse<T> {
  status: number;
  data: T | null;
  error: string | null;
}
```

**Application to AgentResponse**:
- Use `status` field as discriminant (string enum, not number)
- Include `data` and `error` as nullable fields
- Add `metadata` for additional context

### 3.2 GraphQL Response Pattern

**Reference**: GraphQL response structure

```typescript
interface GraphQLResponse<T> {
  data: T | null;
  errors: GraphQLError[] | null;
  extensions?: Record<string, unknown>;
}
```

**Key Insight**: Errors are array of objects, not single error. For AgentResponse, single error is sufficient for LLM responses.

---

## 4. Error Code Conventions

### 4.1 Machine-Readable Error Codes

**Reference**: Common error code patterns

```typescript
// Pattern: CATEGORY_SPECIFIC_DESCRIPTOR

// API Errors
'INVALID_REQUEST'
'UNAUTHORIZED'
'RATE_LIMIT_EXCEEDED'
'SERVICE_UNAVAILABLE'

// Validation Errors
'INVALID_RESPONSE_FORMAT'
'SCHEMA_VALIDATION_FAILED'
'REQUIRED_FIELD_MISSING'

// LLM-Specific Errors
'NO_JSON_IN_RESPONSE'
'MALFORMED_JSON'
'RESPONSE_TOO_LONG'
'MODEL_NOT_AVAILABLE'
```

### 4.2 HTTP Status Code Mapping

**Reference**: HTTP status codes for API errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_RESPONSE_FORMAT` | 422 | Response doesn't match schema |
| `UNAUTHORIZED` | 401 | API key invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | API temporarily unavailable |

**Application to AgentResponse**: Use string error codes, not HTTP status codes.

---

## 5. Null vs Undefined Handling

### 5.1 TypeScript Best Practices

**Reference**: TypeScript strict null checking

```typescript
// Explicit null handling
interface Response<T> {
  data: T | null;        // Explicitly null on error
  error: Error | null;   // Explicitly null on success
}

// Type guard for non-null
function hasData<T>(response: Response<T>): response is { data: T; error: null } {
  return response.data !== null;
}
```

**Recommendation for AgentResponse**:
- Use `null` for absent values (not `undefined`)
- Makes intent explicit: data is intentionally absent, not accidentally undefined

### 5.2 Discriminant Field Naming

**Options**:
1. `status`: Most common, clear intent
2. `type`: Generic, less descriptive
3. `kind`: Less common
4. `result`: Ambiguous (could mean data)

**Recommendation**: Use `status` as the discriminant field.

---

## 6. Metadata Patterns

### 6.1 Common Metadata Fields

```typescript
interface ResponseMetadata {
  // Identification
  requestId?: string;
  agentId: string;
  timestamp: number;

  // Performance
  duration?: number;

  // Usage
  tokenUsage?: TokenUsage;

  // Debugging
  traceId?: string;
  parentId?: string;
}
```

### 6.2 Timing Metadata

**Reference**: OpenTelemetry span attributes

```typescript
interface TimingMetadata {
  startTime: number;
  endTime: number;
  duration: number;
}
```

**Recommendation**: Include duration in AgentResponse metadata.

---

## 7. Common Pitfalls to Avoid

### 7.1 Forgetting to Check Status

```typescript
// BAD: Accessing data without status check
const response = await agent.prompt(prompt);
console.log(response.data.fieldName);  // Could be null!

// GOOD: Check status first
const response = await agent.prompt(prompt);
if (response.status === 'success') {
  console.log(response.data.fieldName);  // Safe
}
```

### 7.2 Type Assertions Without Guards

```typescript
// BAD: Type assertion without guard
const response = await agent.prompt(prompt);
const data = response.data as SomeType;  // Unsafe!

// GOOD: Use type narrowing
const response = await agent.prompt(prompt);
if (response.status === 'success' && response.data) {
  const data = response.data;  // Type is SomeType
}
```

### 7.3 Non-Exhaustive Switch Statements

```typescript
// BAD: Missing case
function handleResponse<T>(response: AgentResponse<T>) {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    // Missing 'partial' case!
  }
}

// GOOD: Exhaustive with default
function handleResponse<T>(response: AgentResponse<T>) {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    case 'partial':
      return response.data;
    default:
      const exhaustivenessCheck: never = response.status;
      return exhaustivenessCheck;
  }
}
```

### 7.4 Mutable State in Responses

```typescript
// BAD: Modifying response after creation
const response = await agent.prompt(prompt);
response.data = { ...response.data, extra: 'field' };  // Don't do this!

// GOOD: Treat responses as immutable
const response = await agent.prompt(prompt);
const modifiedData = { ...response.data, extra: 'field' };  // Create new object
```

---

## 8. Zod Integration Patterns

### 8.1 Discriminated Union Schema

**Reference**: https://zod.dev/

```typescript
import { z } from 'zod';

// Define discriminated union schema
const AgentResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('status', [
    z.object({
      status: z.literal('success'),
      data: dataSchema,
      error: z.null(),
      metadata: z.object({
        agentId: z.string(),
        timestamp: z.number(),
      }),
    }),
    z.object({
      status: z.literal('error'),
      data: z.null(),
      error: z.object({
        code: z.string(),
        message: z.string(),
        recoverable: z.boolean(),
      }),
      metadata: z.object({
        agentId: z.string(),
        timestamp: z.number(),
      }),
    }),
  ]);
```

### 8.2 Validation Helper

```typescript
function createAgentResponse<T>(
  status: AgentResponseStatus,
  data: T | null,
  error: AgentErrorDetails | null,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  const response = { status, data, error, metadata };

  // Validate with Zod
  const schema = AgentResponseSchema(data ? z.any() : z.never());
  const validated = schema.parse(response);

  return validated as AgentResponse<T>;
}
```

---

## 9. Factory Functions

### 9.1 Success Factory

```typescript
function success<T>(data: T, metadata: AgentResponseMetadata): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

### 9.2 Error Factory

```typescript
function error(
  code: string,
  message: string,
  metadata: AgentResponseMetadata,
  recoverable = false
): AgentResponse<never> {
  return {
    status: 'error',
    data: null,
    error: { code, message, recoverable },
    metadata,
  };
}
```

### 9.3 Partial Response Factory

```typescript
function partial<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata,
  };
}
```

---

## 10. Usage Pattern: Chaining

### 10.1 Promise-like Chaining

```typescript
class AgentResponse<T> {
  constructor(
    public status: AgentResponseStatus,
    public data: T | null,
    public error: AgentErrorDetails | null,
    public metadata: AgentResponseMetadata
  ) {}

  map<U>(fn: (data: T) => U): AgentResponse<U> {
    if (this.status === 'success') {
      return success(fn(this.data), this.metadata);
    }
    return this as unknown as AgentResponse<U>;
  }

  asyncMap<U>(fn: (data: T) => Promise<U>): Promise<AgentResponse<U>> {
    if (this.status === 'success') {
      const newData = await fn(this.data);
      return success(newData, this.metadata);
    }
    return Promise.resolve(this as unknown as AgentResponse<U>);
  }
}
```

---

## 11. Summary of Recommendations

### 11.1 Structure
- Use discriminated union with `status` field
- Use `null` for absent values (data, error)
- Include `metadata` object for additional context

### 11.2 Error Handling
- Use machine-readable error codes (UPPER_SNAKE_CASE)
- Include `recoverable` flag for retry logic
- Always validate with Zod schema

### 11.3 Best Practices
- Treat responses as immutable
- Always check status before accessing data
- Use type guards for safe narrowing
- Provide factory functions for common cases

### 11.4 Integration
- Follow existing `WorkflowResult<T>` pattern
- Maintain compatibility with cache (stores `PromptResult<T>`)
- Update all call sites to handle new structure

---

## References

- **TypeScript Discriminated Unions**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- **neverthrow Library**: https://github.com/supermacro/neverthrow
- **Zod Documentation**: https://zod.dev/
- **OpenTelemetry**: https://opentelemetry.io/docs/reference/specification/trace/
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
