# TypeScript Factory Function Patterns & Type Guard Best Practices

**Research Date:** 2026-01-24
**Purpose:** Comprehensive guide for creating AgentResponse helper functions with factory patterns and type guards

---

## Table of Contents

1. [Factory Function Patterns](#1-factory-function-patterns)
2. [Type Guard Patterns](#2-type-guard-patterns)
3. [Discriminated Unions](#3-discriminated-unions)
4. [Error Code Conventions](#4-error-code-conventions)
5. [Real-World Examples](#5-real-world-examples)
6. [Common Pitfalls to Avoid](#6-common-pitfalls-to-avoid)
7. [Recommended Patterns for AgentResponse](#7-recommended-patterns-for-agentresponse)

---

## 1. Factory Function Patterns

### 1.1 Naming Conventions

**Best Practice:** Use `create*` prefix for factory functions that construct new objects

```typescript
// ✅ RECOMMENDED: create prefix
function createSuccess<T>(data: T): AgentResponse<T> { ... }
function createError<T>(code: string, message: string): AgentResponse<T> { ... }

// ⚠️ ACCEPTABLE: build or make prefixes (less common)
function buildResponse<T>(...): AgentResponse<T> { ... }
function makeResponse<T>(...): AgentResponse<T> { ... }
```

**Rationale:**
- `create*` is the most widely recognized convention in TypeScript/JavaScript ecosystems
- Used consistently in popular libraries like Zod (`z.object()`, `z.string()`), Effect-TS, and Neverthrow
- Clearly indicates object creation intent

### 1.2 Parameter Ordering Patterns

**Best Practice:** Data-first ordering for factory functions

```typescript
// ✅ RECOMMENDED: Data first, metadata last
function createSuccess<T>(data: T, metadata?: ResponseMetadata): SuccessResponse<T> { ... }

// ✅ ALSO GOOD: Required data first, optional metadata second
function createError<T>(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails
): ErrorResponse<T> { ... }

// ❌ AVOID: Metadata first (less intuitive)
function createResponse<T>(metadata: ResponseMetadata, data: T): AgentResponse<T> { ... }
```

**Rationale:**
- Data-first ordering follows the principle of "most important parameter first"
- Allows for cleaner currying and partial application
- Aligns with functional programming conventions (data, then configuration)
- Makes function calls more readable: `createSuccess(userData)` vs `createSuccess(metadata, userData)`

### 1.3 Return Type Patterns

**Best Practice:** Explicit return types with proper generic constraints

```typescript
// ✅ RECOMMENDED: Explicit return type with type parameter
function createSuccess<T>(data: T): SuccessResponse<T> {
  return {
    status: 'success',
    data
  };
}

// ✅ GOOD: As const for object literals (enables literal type inference)
function createSuccess<T>(data: T) {
  return {
    status: 'success' as const,
    data
  } as const;
}

// ❌ AVOID: Implicit return types (can cause inference issues)
function createSuccess<T>(data: T) {
  return { status: 'success', data }; // Type may be too broad
}
```

### 1.4 Generic Factory Patterns

#### 1.4.1 Basic Generic Factory

```typescript
function createResponse<T>(data: T): AgentResponse<T> {
  return {
    status: 'success',
    data
  };
}
```

#### 1.4.2 Factory with Generic Constraints

```typescript
// ✅ RECOMMENDED: Use extends to constrain types
interface ResponseData {
  [key: string]: unknown;
}

function createSuccess<T extends ResponseData>(data: T): SuccessResponse<T> {
  return {
    status: 'success',
    data
  };
}

// Usage: Type-safe with constraints
const response = createSuccess({ id: 1, name: 'test' }); // ✅ OK
```

#### 1.4.3 Factory with Type Parameters for Error Codes

```typescript
// ✅ ADVANCED: Separate type parameters for success and error
function createResult<TData, TError = Error>(
  data: TData,
  error?: TError
): Result<TData, TError> {
  return {
    success: true,
    data,
    error: null
  };
}
```

### 1.5 Overloaded Factory Functions

**Pattern:** Use overloads for better type inference with different input types

```typescript
// ✅ RECOMMENDED: Overloads for different input types
function createResponse(data: string): SuccessResponse<string>;
function createResponse(data: number): SuccessResponse<number>;
function createResponse(data: object): SuccessResponse<object>;
function createResponse(data: unknown): SuccessResponse<unknown> {
  return {
    status: 'success',
    data
  };
}

// TypeScript infers correct type
const strResponse = createResponse('hello'); // SuccessResponse<string>
const numResponse = createResponse(42); // SuccessResponse<number>
```

---

## 2. Type Guard Patterns

### 2.1 Basic Type Guards

**Definition:** A type guard is a function that performs a runtime check and narrows the type using the `is` keyword.

```typescript
// ✅ RECOMMENDED: Type guard for discriminated union
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}
```

**Usage:**

```typescript
function handleResponse<T>(response: AgentResponse<T>) {
  if (isSuccess(response)) {
    // TypeScript knows response.data exists here
    console.log(response.data);
  } else {
    // TypeScript knows response.error exists here
    console.log(response.error.message);
  }
}
```

### 2.2 Type Guard Best Practices

#### 2.2.1 Return Type Annotation

**Best Practice:** Always use explicit `is` type predicate in return type

```typescript
// ✅ RECOMMENDED: Explicit type predicate
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

// ❌ AVOID: Boolean return only (doesn't narrow type)
function isSuccess(response: AgentResponse<unknown>): boolean {
  return response.status === 'success';
}
```

#### 2.2.2 Guard Function Naming

**Pattern:** Use `is` prefix for type guard functions

```typescript
// ✅ Standard convention
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> { ... }
function isError<T>(response: AgentResponse<T>): response is ErrorResponse { ... }
function isValid<T>(response: unknown): response is T { ... }
```

#### 2.2.3 Type Guards for Generic Types

**Pattern:** Preserve generic type parameters in type guards

```typescript
// ✅ RECOMMENDED: Preserve type parameter
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

// Usage preserves the generic type
function processData<T>(response: AgentResponse<T>) {
  if (isSuccess(response)) {
    // response.data has type T here
    return response.data;
  }
}
```

### 2.3 Discriminated Union Type Guards

**Pattern:** Check the discriminant property (usually `status` or `type`)

```typescript
type AgentResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: { code: string; message: string } };

function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

### 2.4 Multiple Discriminant Checks

**Pattern:** Check multiple properties for more precise narrowing

```typescript
type AgentResponse<T> =
  | { status: 'success'; data: T; cached: boolean }
  | { status: 'error'; error: Error; retryable: boolean };

function isCachedSuccess<T>(response: AgentResponse<T>): response is { status: 'success'; data: T; cached: true } {
  return response.status === 'success' && response.cached === true;
}
```

### 2.5 Type Guards with Validation

**Pattern:** Combine type guard with data validation

```typescript
function isValidSuccess<T>(
  response: AgentResponse<T>,
  validator: (data: T) => boolean
): response is SuccessResponse<T> {
  return response.status === 'success' && validator(response.data);
}

// Usage
interface UserData {
  id: string;
  name: string;
}

function isValidUserData(data: unknown): data is UserData {
  return typeof data === 'object' && data !== null &&
    'id' in data && 'name' in data;
}

const response: AgentResponse<UserData> = ...;
if (isValidSuccess(response, isValidUserData)) {
  // response.data is guaranteed to be valid UserData
}
```

---

## 3. Discriminated Unions

### 3.1 Basic Pattern

**Definition:** A discriminated union uses a common property (the discriminant) to distinguish between union members.

```typescript
// ✅ RECOMMENDED: Status-based discriminated union
type AgentResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: { code: string; message: string } };
```

**Key Points:**
- Discriminant property (`status`) must be a literal type (`'success'`, `'error'`)
- Discriminant must be present in all union members
- TypeScript uses discriminant for automatic type narrowing

### 3.2 Type Narrowing with Discriminants

**Pattern:** Use `switch` or `if` statements on the discriminant

```typescript
function handleResponse<T>(response: AgentResponse<T>) {
  // ✅ Type narrowing with if statement
  if (response.status === 'success') {
    console.log(response.data); // TypeScript knows this exists
  } else {
    console.log(response.error.message); // TypeScript knows this exists
  }

  // ✅ Type narrowing with switch statement
  switch (response.status) {
    case 'success':
      console.log(response.data);
      break;
    case 'error':
      console.log(response.error.message);
      break;
  }
}
```

### 3.3 Exhaustive Checking Patterns

#### 3.3.1 The `never` Type Pattern

**Best Practice:** Use `never` to ensure all cases are handled

```typescript
function handleResponse<T>(response: AgentResponse<T>): string {
  switch (response.status) {
    case 'success':
      return `Success: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.error.message}`;
    default:
      // If a new status is added, TypeScript will error here
      const _exhaustiveCheck: never = response;
      return _exhaustiveCheck;
  }
}
```

#### 3.3.2 Assertive Function Pattern

**Pattern:** Create a reusable `assertNever` function

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

function handleResponse<T>(response: AgentResponse<T>): string {
  switch (response.status) {
    case 'success':
      return `Success: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.error.message}`;
    default:
      return assertNever(response);
  }
}
```

#### 3.3.3 ESLint Rule for Exhaustive Checking

**Configuration:** Enable TypeScript ESLint exhaustive check rule

```json
{
  "rules": {
    "@typescript-eslint/switch-exhaustiveness-check": "error"
  }
}
```

This provides compile-time checking that all discriminant cases are handled.

### 3.4 Multiple Discriminants

**Pattern:** Use multiple discriminant properties for complex unions

```typescript
type AgentResponse<T> =
  | { status: 'success'; type: 'data'; data: T }
  | { status: 'success'; type: 'empty'; data: null }
  | { status: 'error'; type: 'validation'; errors: ValidationError[] }
  | { status: 'error'; type: 'system'; error: Error };

function handleResponse<T>(response: AgentResponse<T>) {
  if (response.status === 'success') {
    if (response.type === 'data') {
      console.log(response.data);
    } else {
      console.log('No data available');
    }
  } else {
    if (response.type === 'validation') {
      console.log(response.errors);
    } else {
      console.log(response.error.message);
    }
  }
}
```

---

## 4. Error Code Conventions

### 4.1 Naming Conventions

**Best Practice:** Use `SCREAMING_SNAKE_CASE` for machine-readable error codes

```typescript
// ✅ RECOMMENDED: SCREAMING_SNAKE_CASE
const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// ✅ ALSO GOOD: Hierarchical naming with prefixes
const ERROR_CODES = {
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
} as const;
```

**Rationale:**
- SCREAMING_SNAKE_CASE is the standard for constants in TypeScript/JavaScript
- Makes error codes easily distinguishable from other strings
- Hierarchical naming with prefixes organizes related errors
- Machine-readable format is easy to parse and log

### 4.2 Error Code Structures

#### 4.2.1 Const Assertion Pattern

**Best Practice:** Use `as const` for type-safe error code objects

```typescript
// ✅ RECOMMENDED: as const for immutable, literal types
const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
} as const;

// Type is inferred as readonly object with literal string types
type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
// Result: 'INVALID_RESPONSE_FORMAT' | 'MISSING_REQUIRED_FIELD'
```

#### 4.2.2 Enum Pattern

**Alternative:** Use enums for error codes

```typescript
// ✅ GOOD: Enum pattern (more traditional)
enum ErrorCode {
  INVALID_RESPONSE_FORMAT = 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
}

// Usage
const error = {
  code: ErrorCode.INVALID_RESPONSE_FORMAT,
  message: 'Response format is invalid'
};
```

**Trade-offs:**
- **Enums:** Better IDE support, can be used in switch statements
- **Const objects:** More modern, work better with const assertions, easier to iterate

### 4.3 Error Detail Structures

**Best Practice:** Include structured error details

```typescript
// ✅ RECOMMENDED: Structured error details
interface ErrorDetails {
  code: string;
  message: string;
  details?: {
    field?: string;
    value?: unknown;
    constraint?: string;
    [key: string]: unknown;
  };
  timestamp: string;
  stack?: string;
}

// Usage
const errorResponse: ErrorResponse = {
  status: 'error',
  error: {
    code: 'VALIDATION_INVALID_EMAIL',
    message: 'Email address is invalid',
    details: {
      field: 'email',
      value: 'not-an-email',
      constraint: 'email format'
    },
    timestamp: new Date().toISOString()
  }
};
```

### 4.4 Common Error Code Patterns

#### 4.4.1 Hierarchical Error Codes

**Pattern:** Use category prefixes for organization

```typescript
const ERROR_CODES = {
  // Validation errors
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_REQUIRED: 'VALIDATION_MISSING_REQUIRED',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Network errors
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_RATE_LIMITED: 'NETWORK_RATE_LIMITED',

  // System errors
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
} as const;
```

#### 4.4.2 Numeric Error Codes

**Alternative:** Use numeric codes with string constants

```typescript
const ERROR_CODES = {
  // Validation errors (1000-1999)
  VALIDATION_INVALID_INPUT: 1001,
  VALIDATION_MISSING_REQUIRED: 1002,

  // Authentication errors (2000-2999)
  AUTH_INVALID_CREDENTIALS: 2001,
  AUTH_TOKEN_EXPIRED: 2002,

  // Network errors (3000-3999)
  NETWORK_CONNECTION_FAILED: 3001,
  NETWORK_TIMEOUT: 3002,
} as const;
```

---

## 5. Real-World Examples

### 5.1 Neverthrow Library

**Repository:** https://github.com/supermacro/neverthrow

**Key Patterns:**

```typescript
// Result type with discriminated union
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Type guards
function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// Factory functions
function ok<T, E>(value: T): Result<T, E> {
  return { ok: true, value };
}

function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}
```

### 5.2 Effect-TS Library

**Repository:** https://github.com/Effect-TS/effect

**Key Patterns:**

```typescript
// Either type (Left = error, Right = success)
type Either<E, A> = Left<E> | Right<A>;

interface Left<E> {
  readonly _tag: 'Left';
  readonly left: E;
}

interface Right<A> {
  readonly _tag: 'Right';
  readonly right: A;
}

// Type guards
function isEither<E, A>(self: unknown): self is Either<E, A> {
  return (
    typeof self === 'object' &&
    self !== null &&
    ('_tag' in self) &&
    (self['_tag'] === 'Left' || self['_tag'] === 'Right')
  );
}

function isLeft<E, A>(self: Either<E, A>): self is Left<E> {
  return self._tag === 'Left';
}

function isRight<E, A>(self: Either<E, A>): self is Right<A> {
  return self._tag === 'Right';
}

// Factory functions
function left<E, A>(e: E): Either<E, A> {
  return { _tag: 'Left', left: e };
}

function right<E, A>(a: A): Either<E, A> {
  return { _tag: 'Right', right: a };
}
```

### 5.3 Zod Library

**Repository:** https://github.com/colinhacks/zod

**Key Patterns:**

```typescript
// Result type from validation
type SafeParseReturnType<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError };

// Type guard
function isSuccess<T>(result: SafeParseReturnType<T>): result is { success: true; data: T } {
  return result.success === true;
}

// Factory for success
function createSuccess<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

// Factory for error
function createError(error: ZodError): { success: false; error: ZodError } {
  return { success: false, error };
}
```

### 5.4 AgentResponse Pattern (Recommended)

**Based on the patterns above:**

```typescript
// Types
type AgentResponse<T> = SuccessResponse<T> | ErrorResponse;

interface SuccessResponse<T> {
  status: 'success';
  data: T;
  metadata?: ResponseMetadata;
}

interface ErrorResponse {
  status: 'error';
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
  };
}

interface ResponseMetadata {
  timestamp: string;
  processingTime?: number;
  version?: string;
}

// Error codes
const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Factory functions
function createSuccess<T>(
  data: T,
  metadata?: ResponseMetadata
): SuccessResponse<T> {
  return {
    status: 'success',
    data,
    metadata: metadata || {
      timestamp: new Date().toISOString()
    }
  };
}

function createError<T = never>(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails
): ErrorResponse {
  return {
    status: 'error',
    error: {
      code,
      message,
      details
    }
  };
}

// Type guards
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

// Usage example
function processResponse<T>(response: AgentResponse<T>) {
  if (isSuccess(response)) {
    console.log('Success:', response.data);
    if (response.metadata) {
      console.log('Processed in:', response.metadata.processingTime, 'ms');
    }
  } else {
    console.error(`${response.error.code}: ${response.error.message}`);
    if (response.error.details) {
      console.error('Details:', response.error.details);
    }
  }
}
```

---

## 6. Common Pitfalls to Avoid

### 6.1 Type Guard Pitfalls

#### Pitfall 1: Not Using Type Predicate

```typescript
// ❌ AVOID: Boolean return doesn't narrow type
function isSuccess(response: AgentResponse<unknown>): boolean {
  return response.status === 'success';
}

// ✅ CORRECT: Use type predicate
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

#### Pitfall 2: Missing Generic Type Parameter

```typescript
// ❌ AVOID: Loses type information
function isSuccess(response: AgentResponse<unknown>): response is SuccessResponse<unknown> {
  return response.status === 'success';
}

// ✅ CORRECT: Preserve type parameter
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

### 6.2 Discriminated Union Pitfalls

#### Pitfall 1: Non-Literal Discriminants

```typescript
// ❌ AVOID: String type instead of literal
type BadResponse = {
  status: string; // Too broad, doesn't narrow
  data?: unknown;
  error?: unknown;
};

// ✅ CORRECT: Literal types for discriminant
type GoodResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

#### Pitfall 2: Missing Discriminant Property

```typescript
// ❌ AVOID: No common discriminant
type BadResponse<T> =
  | { success: true; data: T }
  | { failed: true; error: Error };

// ✅ CORRECT: Common discriminant property
type GoodResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### 6.3 Factory Function Pitfalls

#### Pitfall 1: Implicit Return Types

```typescript
// ❌ AVOID: Implicit return type can be too broad
function createSuccess<T>(data: T) {
  return { status: 'success', data };
}

// ✅ CORRECT: Explicit return type
function createSuccess<T>(data: T): SuccessResponse<T> {
  return { status: 'success', data };
}
```

#### Pitfall 2: Poor Parameter Ordering

```typescript
// ❌ AVOID: Metadata first is less intuitive
function createResponse<T>(
  metadata: ResponseMetadata,
  data: T
): AgentResponse<T> {
  return { status: 'success', data, metadata };
}

// ✅ CORRECT: Data first
function createResponse<T>(
  data: T,
  metadata?: ResponseMetadata
): AgentResponse<T> {
  return { status: 'success', data, metadata };
}
```

### 6.4 Error Code Pitfalls

#### Pitfall 1: Magic Strings

```typescript
// ❌ AVOID: Magic strings scattered in code
if (response.error.code === 'INVALID_RESPONSE_FORMAT') {
  // ...
}

// ✅ CORRECT: Use constants
if (response.error.code === ERROR_CODES.INVALID_RESPONSE_FORMAT) {
  // ...
}
```

#### Pitfall 2: Inconsistent Naming

```typescript
// ❌ AVOID: Inconsistent conventions
const ERROR_CODES = {
  invalidResponseFormat: 'invalid_response_format',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  NetworkTimeout: 'NetworkTimeout',
};

// ✅ CORRECT: Consistent SCREAMING_SNAKE_CASE
const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
} as const;
```

---

## 7. Recommended Patterns for AgentResponse

### 7.1 Complete Implementation

```typescript
// ============================================================================
// Types
// ============================================================================

type AgentResponse<T> = SuccessResponse<T> | ErrorResponse;

interface SuccessResponse<T> {
  status: 'success';
  data: T;
  metadata?: ResponseMetadata;
}

interface ErrorResponse {
  status: 'error';
  error: AgentError;
}

interface ResponseMetadata {
  timestamp: string;
  processingTimeMs?: number;
  model?: string;
  version?: string;
}

interface AgentError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

const ERROR_CODES = {
  // Response format errors
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  UNEXPECTED_RESPONSE_STRUCTURE: 'UNEXPECTED_RESPONSE_STRUCTURE',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_JSON_FORMAT: 'INVALID_JSON_FORMAT',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',

  // Processing errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  TIMEOUT_EXCEEDED: 'TIMEOUT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a successful agent response
 * @param data - The response data
 * @param metadata - Optional metadata about the response
 * @returns A SuccessResponse containing the data
 */
function createSuccess<T>(
  data: T,
  metadata?: Partial<ResponseMetadata>
): SuccessResponse<T> {
  return {
    status: 'success',
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Creates an error agent response
 * @param code - The error code from ERROR_CODES
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns An ErrorResponse containing the error information
 */
function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    status: 'error',
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * Creates an error response from an Error object
 * @param error - The error object
 * @param code - Optional error code (defaults to INTERNAL_ERROR)
 * @returns An ErrorResponse containing the error information
 */
function createErrorFromError(
  error: Error,
  code: ErrorCode = ERROR_CODES.INTERNAL_ERROR
): ErrorResponse {
  return {
    status: 'error',
    error: {
      code,
      message: error.message,
      stack: error.stack
    }
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an AgentResponse is a success
 * @param response - The agent response to check
 * @returns True if the response is a success
 */
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

/**
 * Type guard to check if an AgentResponse is an error
 * @param response - The agent response to check
 * @returns True if the response is an error
 */
function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

/**
 * Type guard to check if an error has a specific error code
 * @param response - The agent response to check
 * @param code - The error code to check for
 * @returns True if the response is an error with the specified code
 */
function hasErrorCode<T>(
  response: AgentResponse<T>,
  code: ErrorCode
): response is ErrorResponse {
  return response.status === 'error' && response.error.code === code;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts data from a success response or throws an error
 * @param response - The agent response
 * @returns The data if successful
 * @throws The error if the response is an error
 */
function unwrap<T>(response: AgentResponse<T>): T {
  if (isSuccess(response)) {
    return response.data;
  }
  throw new Error(`${response.error.code}: ${response.error.message}`);
}

/**
 * Extracts data from a success response or returns a default value
 * @param response - The agent response
 * @param defaultValue - The default value to return if error
 * @returns The data if successful, otherwise the default value
 */
function getOrElse<T>(response: AgentResponse<T>, defaultValue: T): T {
  return isSuccess(response) ? response.data : defaultValue;
}

/**
 * Maps over the data in a success response
 * @param response - The agent response
 * @param fn - The function to apply to the data
 * @returns A new agent response with the mapped data
 */
function map<T, U>(
  response: AgentResponse<T>,
  fn: (data: T) => U
): AgentResponse<U> {
  if (isSuccess(response)) {
    return createSuccess(fn(response.data), response.metadata);
  }
  return response;
}

/**
 * Chains operations that return agent responses
 * @param response - The agent response
 * @param fn - The function to chain
 * @returns The result of chaining the function
 */
function flatMap<T, U>(
  response: AgentResponse<T>,
  fn: (data: T) => AgentResponse<U>
): AgentResponse<U> {
  if (isSuccess(response)) {
    return fn(response.data);
  }
  return response;
}

// ============================================================================
// Usage Examples
// ============================================================================

// Example 1: Basic usage
const response1: AgentResponse<string> = createSuccess('Hello, World!');

if (isSuccess(response1)) {
  console.log(response1.data); // TypeScript knows this is a string
}

// Example 2: Error handling
const response2 = createError(
  ERROR_CODES.VALIDATION_FAILED,
  'Invalid input data',
  { field: 'email', value: 'not-an-email' }
);

if (isError(response2)) {
  console.error(`${response2.error.code}: ${response2.error.message}`);
}

// Example 3: Mapping
const response3: AgentResponse<number> = createSuccess(42);
const doubled = map(response3, (n) => n * 2);
// SuccessResponse<number> with data = 84

// Example 4: Chaining
function validateUser(data: unknown): AgentResponse<User> {
  // ... validation logic
  return createSuccess({ name: 'John', age: 30 });
}

function saveUser(user: User): AgentResponse<User> {
  // ... save logic
  return createSuccess(user);
}

const result = flatMap(
  validateUser({ name: 'John', age: 30 }),
  saveUser
);

// Example 5: Exhaustive checking
function handleResponse<T>(response: AgentResponse<T>): string {
  switch (response.status) {
    case 'success':
      return `Success: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.error.code} - ${response.error.message}`;
    default:
      return assertNever(response);
  }
}
```

### 7.2 Testing Patterns

```typescript
// Testing type guards
describe('isSuccess', () => {
  it('should narrow type correctly', () => {
    const response = createSuccess('test');

    if (isSuccess(response)) {
      // TypeScript knows response.data is a string
      expect(response.data.toUpperCase()).toBe('TEST');
    }
  });
});

// Testing factory functions
describe('createSuccess', () => {
  it('should create a success response with metadata', () => {
    const response = createSuccess('data', {
      processingTimeMs: 100,
      version: '1.0.0'
    });

    expect(response).toEqual({
      status: 'success',
      data: 'data',
      metadata: {
        timestamp: expect.any(String),
        processingTimeMs: 100,
        version: '1.0.0'
      }
    });
  });
});

// Testing helper functions
describe('map', () => {
  it('should map over success responses', () => {
    const response = createSuccess(42);
    const mapped = map(response, (n) => n * 2);

    if (isSuccess(mapped)) {
      expect(mapped.data).toBe(84);
    }
  });

  it('should preserve error responses', () => {
    const errorResponse = createError(
      ERROR_CODES.INTERNAL_ERROR,
      'Something went wrong'
    );
    const mapped = map(errorResponse, (n: number) => n * 2);

    expect(isError(mapped)).toBe(true);
  });
});
```

---

## 8. Key Takeaways

### Factory Functions
1. **Naming:** Use `create*` prefix for consistency
2. **Parameter Order:** Data first, metadata last
3. **Return Types:** Always explicit with proper generics
4. **Overloads:** Use for better type inference with different inputs

### Type Guards
1. **Type Predicate:** Always use `is` keyword in return type
2. **Naming:** Use `is` prefix for clarity
3. **Generics:** Preserve type parameters for proper narrowing
4. **Discriminants:** Check the discriminant property (usually `status`)

### Discriminated Unions
1. **Literal Types:** Use literal types for discriminants
2. **Common Property:** Ensure all members share the discriminant
3. **Exhaustive Checking:** Use `never` type or ESLint rule
4. **Type Narrowing:** Rely on discriminant for automatic narrowing

### Error Codes
1. **Naming:** Use `SCREAMING_SNAKE_CASE` consistently
2. **Constants:** Define in const object with `as const`
3. **Hierarchical:** Use prefixes for organization
4. **Details:** Include structured error details

### Common Pitfalls
1. Avoid implicit return types in factory functions
2. Always use type predicates in type guards
3. Use literal types for discriminants, not broad types
4. Avoid magic strings - use constants for error codes

---

## 9. References

### Official Documentation
- **TypeScript Handbook - Type Narrowing:**
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html

- **TypeScript Handbook - Discriminated Unions:**
  https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions

- **TypeScript Handbook - Type Guards:**
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

### Popular Libraries
- **Neverthrow:**
  https://github.com/supermacro/neverthrow
  Result type implementation with type guards

- **Effect-TS:**
  https://github.com/Effect-TS/effect
  Either type implementation with functional patterns

- **Zod:**
  https://github.com/colinhacks/zod
  Schema validation with Result-like return types

- **ts-pattern:**
  https://github.com/gvergnaud/ts-pattern
  Exhaustive pattern matching library

### Additional Resources
- **TypeScript ESLint - Exhaustive Switch:**
  https://typescript-eslint.io/rules/switch-exhaustiveness-check/

- **Functional Programming in TypeScript:**
  https://gcanti.github.io/fp-ts/
  Functional programming patterns and types

---

## Summary

This research document provides a comprehensive guide for implementing TypeScript factory functions and type guards for the AgentResponse pattern. The recommended patterns follow best practices from popular TypeScript libraries and the official TypeScript handbook.

**Key recommendations for AgentResponse implementation:**

1. Use discriminated unions with `status` as the discriminant
2. Implement `createSuccess()` and `createError()` factory functions
3. Create `isSuccess()` and `isError()` type guards with proper type predicates
4. Use `SCREAMING_SNAKE_CASE` for error codes defined with `as const`
5. Include helper functions like `map()`, `flatMap()`, and `unwrap()`
6. Implement exhaustive checking patterns using the `never` type
7. Follow data-first parameter ordering for factory functions
8. Always use explicit return types for factory functions

These patterns ensure type safety, improve developer experience, and provide robust error handling for agent responses.
