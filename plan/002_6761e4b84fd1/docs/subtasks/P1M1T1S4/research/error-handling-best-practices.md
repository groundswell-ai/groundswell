# Zod Error Handling Best Practices in TypeScript

Research findings on error handling patterns for Zod validation in TypeScript, including custom error formats, logging practices, and common pitfalls.

## Table of Contents
1. [Zod Validation Error Handling Patterns](#zod-validation-error-handling-patterns)
2. [Catching and Converting ZodError](#catching-and-converting-zoderror)
3. [TypeScript Error Wrapping Patterns](#typescript-error-wrapping-patterns)
4. [INVALID_RESPONSE_FORMAT Error Code Patterns](#invalid_response_format-error-code-patterns)
5. [Logging Validation Failures Best Practices](#logging-validation-failures-best-practices)
6. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
7. [External Resources](#external-resources)

---

## Zod Validation Error Handling Patterns

### 1. Using `safeParse()` (Recommended)

**Best Practice**: Always prefer `safeParse()` over `parse()` for better error control.

```typescript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18)
});

function validateUser(data: unknown) {
  const result = userSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    };
  }

  return { success: true, data: result.data };
}
```

### 2. Using `parse()` with Try-Catch

**Use Case**: When you want errors to propagate to error boundaries.

```typescript
import { z, ZodError } from 'zod';

function validateUserStrict(data: unknown) {
  try {
    const validated = userSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    throw error; // Re-throw non-Zod errors
  }
}
```

### 3. Custom Error Messages in Schema

```typescript
const schema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  age: z.number()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
});
```

---

## Catching and Converting ZodError

### 1. Custom ValidationError Class

**Best Practice**: Create a domain-specific error class for better error handling.

```typescript
import { ZodError } from 'zod';

class ValidationError extends Error {
  public readonly code: string = 'VALIDATION_ERROR';
  public readonly details: Array<{
    field: string;
    message: string;
    received?: unknown;
  }>;

  constructor(zodError: ZodError, receivedData?: unknown) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = zodError.errors.map(err => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      received: receivedData
    }));
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

// Usage
function validateWithCustomError(data: unknown) {
  const result = userSchema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(result.error, data);
  }

  return result.data;
}
```

### 2. Error Response Formatter for APIs

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

function formatZodError(zodError: ZodError): ErrorResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    }
  };
}

// Express middleware example
import { Request, Response, NextFunction } from 'express';

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(formatZodError(result.error));
    }

    req.body = result.data;
    next();
  };
}
```

### 3. Nested Error Formatting

```typescript
function formatZodErrorNested(zodError: ZodError) {
  const formatted: Record<string, string[]> = {};

  for (const error of zodError.errors) {
    const field = error.path.join('.') || 'root';
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(error.message);
  }

  return {
    success: false,
    errors: formatted
  };
}

// Example output:
// {
//   "success": false,
//   "errors": {
//     "email": ["Invalid email", "Email is required"],
//     "password.min": ["Password too short"]
//   }
// }
```

---

## TypeScript Error Wrapping Patterns

### 1. Result Type Pattern (Functional)

**Best Practice**: Use Result types for better error handling without exceptions.

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function validateUser(data: unknown): Result<User, ValidationError> {
  const result = userSchema.safeParse(data);

  if (!result.success) {
    return {
      ok: false,
      error: new ValidationError(result.error)
    };
  }

  return { ok: true, value: result.data };
}

// Usage with pattern matching
const result = validateUser(input);

if (result.ok) {
  // TypeScript knows result.value is User
  console.log(result.value.name);
} else {
  // TypeScript knows result.error is ValidationError
  console.log(result.error.details);
}
```

### 2. Async Validation Result

```typescript
async function validateUserAsync(
  data: unknown
): Promise<Result<User, ValidationError>> {
  try {
    // Simulate async validation (e.g., checking database)
    const result = await userSchema.safeParseAsync(data);

    if (!result.success) {
      return {
        ok: false,
        error: new ValidationError(result.error)
      };
    }

    return { ok: true, value: result.data };
  } catch (error) {
    return {
      ok: false,
      error: new ValidationError(new ZodError([]))
    };
  }
}
```

### 3. Error Chain Pattern

```typescript
class BaseError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
  }
}

class ResponseValidationError extends BaseError {
  constructor(zodError: ZodError, context: string) {
    super(
      `Response validation failed for ${context}`,
      'INVALID_RESPONSE_FORMAT',
      zodError
    );
  }
}

// Usage
function validateResponse(data: unknown, context: string) {
  const result = responseSchema.safeParse(data);

  if (!result.success) {
    throw new ResponseValidationError(result.error, context);
  }

  return result.data;
}
```

---

## INVALID_RESPONSE_FORMAT Error Code Patterns

### 1. Standard Error Code Enum

```typescript
enum ErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_RESPONSE_FORMAT = 'INVALID_RESPONSE_FORMAT',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',

  // Field-specific Errors
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_RANGE = 'INVALID_RANGE',

  // Response-specific Errors
  MALFORMED_JSON = 'MALFORMED_JSON',
  UNEXPECTED_STRUCTURE = 'UNEXPECTED_STRUCTURE',
  MISSING_REQUIRED_PROPERTY = 'MISSING_REQUIRED_PROPERTY',

  // Agent-specific Errors
  AGENT_RESPONSE_INVALID = 'AGENT_RESPONSE_INVALID',
  AGENT_RESPONSE_MISSING_FIELDS = 'AGENT_RESPONSE_MISSING_FIELDS',
  AGENT_RESPONSE_TYPE_MISMATCH = 'AGENT_RESPONSE_TYPE_MISMATCH'
}
```

### 2. INVALID_RESPONSE_FORMAT Error Implementation

```typescript
interface InvalidResponseFormatError {
  code: 'INVALID_RESPONSE_FORMAT';
  message: string;
  context: string;
  validationErrors: Array<{
    field: string;
    expected: string;
    received: unknown;
    message: string;
  }>;
  timestamp: string;
}

class AgentResponseValidationError extends Error {
  public readonly code = ErrorCode.INVALID_RESPONSE_FORMAT;
  public readonly context: string;
  public readonly validationErrors: InvalidResponseFormatError['validationErrors'];

  constructor(
    zodError: ZodError,
    context: string,
    receivedData: unknown
  ) {
    super(`Invalid response format from ${context}`);
    this.name = 'AgentResponseValidationError';
    this.context = context;
    this.validationErrors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      expected: err.code,
      received: receivedData,
      message: err.message
    }));
  }

  toJSON(): InvalidResponseFormatError {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      validationErrors: this.validationErrors,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 3. Usage Example for Agent Response Validation

```typescript
import { AgentResponse } from '../models/AgentResponse';

const agentResponseSchema = z.object({
  success: z.boolean(),
  content: z.string(),
  data: z.any().optional(),
  metadata: z.object({
    timestamp: z.string(),
    agentName: z.string()
  }).optional()
});

function validateAgentResponse(
  response: unknown,
  agentName: string
): AgentResponse {
  const result = agentResponseSchema.safeParse(response);

  if (!result.success) {
    throw new AgentResponseValidationError(
      result.error,
      agentName,
      response
    );
  }

  return result.data as AgentResponse;
}

// Usage in agent code
try {
  const validatedResponse = validateAgentResponse(
    rawAgentResponse,
    'ResearchAgent'
  );

  // Process validated response
} catch (error) {
  if (error instanceof AgentResponseValidationError) {
    // Log structured error
    console.error(JSON.stringify(error.toJSON(), null, 2));

    // Send to error tracking service
    // errorTracker.capture(error);
  }
}
```

---

## Logging Validation Failures Best Practices

### 1. Structured Logging with Context

**Best Practice**: Always log validation failures with sufficient context for debugging.

```typescript
interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
}

function logValidationFailure(
  logger: Logger,
  error: ValidationError | ZodError,
  context: {
    operation: string;
    input?: unknown;
    userId?: string;
    requestId?: string;
  }
) {
  const errorDetails = error instanceof ValidationError
    ? error.details
    : error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

  logger.error('Validation failed', {
    operation: context.operation,
    errors: errorDetails,
    userId: context.userId,
    requestId: context.requestId,
    // Only log input in development or if explicitly allowed
    ...(process.env.NODE_ENV === 'development' && {
      input: context.input
    })
  });
}
```

### 2. Log Level Guidelines

```typescript
enum ValidationLogLevel {
  // ERROR: Critical validation failures that prevent operations
  CRITICAL = 'error',

  // WARN: Validation issues that don't prevent functionality
  // but should be reviewed
  NON_CRITICAL = 'warn',

  // INFO: Important validation events for auditing
  AUDIT = 'info'
}

function determineLogLevel(error: ZodError): ValidationLogLevel {
  // Critical if required fields are missing
  const hasRequiredFieldErrors = error.errors.some(
    err => err.code === 'invalid_type'
  );

  if (hasRequiredFieldErrors) {
    return ValidationLogLevel.CRITICAL;
  }

  return ValidationLogLevel.NON_CRITICAL;
}
```

### 3. Sanitization for Sensitive Data

**Best Practice**: Never log sensitive data like passwords, tokens, or PII.

```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'apiKey', 'secret',
  'ssn', 'creditCard', 'cvv'
];

function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_FIELDS.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return input;
}

function logValidationFailureSecure(
  logger: Logger,
  error: ZodError,
  input: unknown,
  context: Record<string, unknown>
) {
  logger.error('Validation failed', {
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    })),
    // Sanitize input before logging
    input: sanitizeInput(input),
    ...context
  });
}
```

### 4. Validation Metrics Tracking

```typescript
interface ValidationMetrics {
  total: number;
  failed: number;
  succeeded: number;
  failureReasons: Record<string, number>;
}

class ValidationMetricsCollector {
  private metrics: Map<string, ValidationMetrics> = new Map();

  recordValidation(
    operation: string,
    success: boolean,
    errors?: ZodError
  ) {
    const current = this.metrics.get(operation) || {
      total: 0,
      failed: 0,
      succeeded: 0,
      failureReasons: {}
    };

    current.total++;

    if (success) {
      current.succeeded++;
    } else {
      current.failed++;

      // Track failure reasons
      errors?.errors.forEach(err => {
        const reason = `${err.path.join('.')}:${err.code}`;
        current.failureReasons[reason] =
          (current.failureReasons[reason] || 0) + 1;
      });
    }

    this.metrics.set(operation, current);
  }

  getMetrics(operation: string): ValidationMetrics | undefined {
    return this.metrics.get(operation);
  }
}
```

---

## Common Pitfalls to Avoid

### 1. Using `.parse()` Without Try-Catch

**❌ Bad Practice**:
```typescript
// This will throw and crash your app if validation fails
const validated = schema.parse(userInput);
```

**✅ Good Practice**:
```typescript
const result = schema.safeParse(userInput);
if (!result.success) {
  // Handle error gracefully
  return { error: formatError(result.error) };
}
```

### 2. Ignoring Error Details

**❌ Bad Practice**:
```typescript
if (!result.success) {
  console.log('Validation failed');
  // User doesn't know what went wrong
}
```

**✅ Good Practice**:
```typescript
if (!result.success) {
  return {
    error: 'Validation failed',
    details: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}
```

### 3. Logging Sensitive Data

**❌ Bad Practice**:
```typescript
logger.error('Validation failed', { input: userInput });
// May log passwords, tokens, etc.
```

**✅ Good Practice**:
```typescript
logger.error('Validation failed', {
  input: sanitizeInput(userInput),
  validationErrors: result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }))
});
```

### 4. Not Preserving Type Information

**❌ Bad Practice**:
```typescript
function validate(data: unknown): any {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
```

**✅ Good Practice**:
```typescript
function validate(data: unknown): ValidationResult<User> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: new ValidationError(result.error) };
  }
  return { ok: true, value: result.data };
}
```

### 5. Generic Error Messages

**❌ Bad Practice**:
```typescript
const schema = z.string().min(8);
// Error: "String must contain at least 8 character(s)"
```

**✅ Good Practice**:
```typescript
const schema = z.string().min(8, 'Password must be at least 8 characters long');
```

### 6. Not Handling Async Validation

**❌ Bad Practice**:
```typescript
// Using parse() for async operations
const result = schema.parse(await fetchUserData());
```

**✅ Good Practice**:
```typescript
const result = await schema.safeParseAsync(await fetchUserData());
```

---

## External Resources

### Official Zod Documentation
- **Zod GitHub**: https://github.com/colinhacks/zod
- **Zod Error Handling**: https://github.com/colinhacks/zod#error-handling
- **Zod Documentation**: https://zod.dev/

### Community Examples and Articles

1. **Zod Validation Patterns**
   - URL: https://kettanaito.com/blog/zod-validation-patterns
   - Topics: safeParse vs parse, error formatting, custom refinements

2. **Error Handling in TypeScript**
   - URL: https://zellwk.com/blog/error-handling-typescript/
   - Topics: Custom error classes, error type guards, error boundaries

3. **Building Type-Safe APIs with Zod**
   - URL: https://www.toptal.com/software/type-safe-api-typescript-zod
   - Topics: API validation, middleware patterns, error responses

4. **Advanced Zod Patterns**
   - URL: https://www.totaltypescript.com/blog/zod
   - Topics: Computed schemas, schema composition, refinements

5. **Validation Best Practices**
   - URL: https://epicreact.dev/how-to-handle-form-validation-in-react/
   - Topics: User experience, error messages, validation timing

### Related Libraries

1. **zod-error-formatter**
   - URL: https://github.com/validatorjs/validator.js
   - Purpose: Pretty-print Zod errors

2. **zod-validation-error**
   - URL: https://github.com/causaly/zod-validation-error
   - Purpose: Simplified Zod error messages

3. **neverthrow**
   - URL: https://github.com/supermacro/neverthrow
   - Purpose: Result type for error handling without exceptions

### TypeScript Error Handling Patterns

1. **Result Type Pattern**
   - URL: https://gcanti.github.io/fp-ts/guide/Result
   - Library: fp-ts
   - Topics: Functional error handling, Result type

2. **Error Boundaries in TypeScript**
   - URL: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
   - Topics: React error boundaries, error recovery

### Logging Libraries

1. **Winston**
   - URL: https://github.com/winstonjs/winston
   - Features: Structured logging, transports, log levels

2. **Pino**
   - URL: https://github.com/pinojs/pino
   - Features: High-performance logging, JSON output

3. **Prettier Error Formatting**
   - URL: https://github.com/sindresorhus/pretty-error
   - Features: Clean error stack traces

---

## Summary of Key Best Practices

1. **Always use `safeParse()`** instead of `parse()` for better error control
2. **Create custom error classes** for domain-specific error handling
3. **Provide clear, actionable error messages** for better developer experience
4. **Sanitize sensitive data** before logging
5. **Use structured logging** with sufficient context
6. **Implement proper error codes** (like `INVALID_RESPONSE_FORMAT`)
7. **Track validation metrics** to monitor system health
8. **Never ignore error details** - always surface them appropriately
9. **Preserve type information** through Result types or similar patterns
10. **Handle async validation** with `safeParseAsync()` when needed

---

## Example: Complete Implementation

```typescript
import { z, ZodError } from 'zod';

// 1. Define schemas with custom messages
const agentResponseSchema = z.object({
  success: z.boolean(),
  content: z.string().min(1, 'Response content cannot be empty'),
  data: z.any().optional(),
  metadata: z.object({
    timestamp: z.string(),
    agentName: z.string().min(1)
  }).optional()
});

// 2. Custom error class
class AgentResponseValidationError extends Error {
  public readonly code = 'INVALID_RESPONSE_FORMAT';
  public readonly details: Array<{
    field: string;
    message: string;
    expected: string;
  }>;

  constructor(zodError: ZodError, public readonly context: string) {
    super(`Invalid agent response format from ${context}`);
    this.name = 'AgentResponseValidationError';
    this.details = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      expected: err.code
    }));
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

// 3. Validation function with Result type
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function validateAgentResponse(
  response: unknown,
  context: string,
  logger?: Logger
): Result<AgentResponse, AgentResponseValidationError> {
  const result = agentResponseSchema.safeParse(response);

  if (!result.success) {
    const error = new AgentResponseValidationError(
      result.error,
      context
    );

    // Log the validation failure
    logger?.error('Agent response validation failed', {
      context,
      error: error.toJSON()
    });

    return { ok: false, error };
  }

  return { ok: true, value: result.data as AgentResponse };
}

// 4. Usage example
const response = await callAgent('ResearchAgent', query);
const validation = validateAgentResponse(
  response,
  'ResearchAgent',
  logger
);

if (!validation.ok) {
  // Handle validation error
  return {
    success: false,
    error: validation.error.toJSON()
  };
}

// TypeScript knows validation.value is valid
const validResponse = validation.value;
```

---

*Research Date: 2026-01-24*
*Last Updated: 2026-01-24*
