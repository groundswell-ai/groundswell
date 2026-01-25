# Zod safeParse() Runtime Validation Guide

**Research Date**: 2026-01-24
**Focus**: Runtime validation patterns, error handling, and fallback strategies with Zod

---

## Table of Contents

1. [Introduction to safeParse()](#1-introduction-to-safeparse)
2. [TypeScript Typing for safeParse() Results](#2-typescript-typing-for-safeparse-results)
3. [Graceful Error Handling Patterns](#3-graceful-error-handling-patterns)
4. [Error Logging Best Practices](#4-error-logging-best-practices)
5. [Fallback/Error Response Strategies](#5-fallbackerror-response-strategies)
6. [Real-World Examples from Groundswell](#6-real-world-examples-from-groundswell)
7. [Common Pitfalls to Avoid](#7-common-pitfalls-to-avoid)
8. [External Resources](#8-external-resources)

---

## 1. Introduction to safeParse()

### 1.1 What is safeParse()?

`safeParse()` is Zod's non-throwing validation method. Unlike `parse()` which throws `ZodError` on validation failure, `safeParse()` returns a result object that you can inspect and handle gracefully.

**Key Benefits**:
- No try-catch blocks required
- Type-safe result discrimination
- Detailed error information preserved
- Better control flow for validation logic

### 1.2 Basic Usage

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18)
});

// Use safeParse() for validation
const result = UserSchema.safeParse(inputData);

// Check success flag
if (result.success) {
  // result.data is typed as { name: string; email: string; age: number }
  console.log('Valid user:', result.data);
} else {
  // result.error is ZodError with detailed issues
  console.log('Validation failed:', result.error.errors);
}
```

### 1.3 safeParse() vs parse()

| Feature | `safeParse()` | `parse()` |
|---------|--------------|-----------|
| Throws on error | No | Yes |
| Returns | Result object | Validated data |
| Type safety | Discriminated union | Direct type |
| Use case | Graceful handling | Fail-fast scenarios |
| Try-catch needed | No | Yes |

**Recommendation**: Always prefer `safeParse()` for user input, API responses, and external data. Use `parse()` only when you want validation failures to crash the application or propagate to error boundaries.

---

## 2. TypeScript Typing for safeParse() Results

### 2.1 Return Type Structure

`safeParse()` returns a discriminated union:

```typescript
type SafeParseReturnType<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError };
```

The `success` property acts as a **discriminant** that TypeScript uses to narrow types:

```typescript
const result = schema.safeParse(data);

// TypeScript knows: result is { success: boolean } & (...)
if (result.success) {
  // TypeScript narrows to: { success: true; data: T }
  console.log(result.data.name); // ✓ Type-safe access
} else {
  // TypeScript narrows to: { success: false; error: ZodError }
  console.log(result.error.errors); // ✓ Type-safe access
}
```

### 2.2 Type Guard Pattern

Create reusable type guards for cleaner code:

```typescript
function isValidationSuccess<T>(
  result: { success: boolean; data?: T; error?: z.ZodError }
): result is { success: true; data: T } {
  return result.success === true;
}

// Usage
const result = schema.safeParse(data);
if (isValidationSuccess(result)) {
  // TypeScript knows result.data exists
  console.log(result.data);
}
```

### 2.3 Extracting the Infer Type

Use `z.infer<>` to get the TypeScript type from a schema:

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// Same as: { name: string; email: string }

// Use in function signatures
function validateUser(data: unknown): User | null {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

### 2.4 Generic Validation Wrapper

Create a type-safe validation wrapper:

```typescript
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ field: string; message: string }> };

function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform ZodError into custom format
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return { success: false, errors };
}

// Usage
const userResult = validateWithSchema(UserSchema, input);
if (userResult.success) {
  console.log(userResult.data.name); // Type-safe
}
```

---

## 3. Graceful Error Handling Patterns

### 3.1 Basic Error Handling

```typescript
function handleValidation(data: unknown) {
  const result = UserSchema.safeParse(data);

  if (!result.success) {
    // Extract error information
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    data: result.data
  };
}
```

### 3.2 Early Return Pattern

Use early returns for cleaner control flow:

```typescript
function processUser(input: unknown) {
  // Validate first
  const result = UserSchema.safeParse(input);
  if (!result.success) {
    return {
      status: 'error',
      message: 'Invalid user data',
      details: result.error.format()
    };
  }

  // Now we know result.data is valid
  const user = result.data;
  return {
    status: 'success',
    user: {
      ...user,
      displayName: user.name.toUpperCase()
    }
  };
}
```

### 3.3 Custom Error Messages in Schema

Define error messages at the schema level:

```typescript
const FormSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  age: z.number()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age value')
});

const result = FormSchema.safeParse(input);
if (!result.success) {
  // Errors use custom messages
  console.log(result.error.errors[0].message);
  // Output: "Password must be at least 8 characters"
}
```

### 3.4 Nested Error Handling

Handle validation in nested objects:

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code')
});

const PersonSchema = z.object({
  name: z.string(),
  address: AddressSchema
});

const result = PersonSchema.safeParse(data);
if (!result.success) {
  // Error paths include nesting: ["address", "zipCode"]
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'), // "address.zipCode"
    message: err.message
  }));
}
```

### 3.5 Multiple Schema Validation

Validate against multiple schemas:

```typescript
function flexibleValidation(data: unknown) {
  // Try strict schema first
  const strictResult = StrictSchema.safeParse(data);
  if (strictResult.success) {
    return { mode: 'strict', data: strictResult.data };
  }

  // Fall back to lenient schema
  const lenientResult = LenientSchema.safeParse(data);
  if (lenientResult.success) {
    return { mode: 'lenient', data: lenientResult.data };
  }

  // Both failed
  return {
    mode: 'failed',
    errors: {
      strict: strictResult.error.format(),
      lenient: lenientResult.error.format()
    }
  };
}
```

---

## 4. Error Logging Best Practices

### 4.1 Structured Logging

Always log validation failures with context:

```typescript
interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

function logValidationFailure(
  logger: Logger,
  error: z.ZodError,
  context: {
    operation: string;
    input?: unknown;
    requestId?: string;
    userId?: string;
  }
) {
  logger.error('Schema validation failed', {
    operation: context.operation,
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    })),
    requestId: context.requestId,
    userId: context.userId,
    // Only log input in development
    ...(process.env.NODE_ENV === 'development' && {
      input: context.input
    })
  });
}
```

### 4.2 Log Level Guidelines

Determine appropriate log levels based on error severity:

```typescript
function getLogLevel(error: z.ZodError): 'error' | 'warn' | 'info' {
  // Critical: Required fields missing
  const hasRequiredErrors = error.errors.some(
    err => err.code === 'invalid_type' && err.expected !== 'undefined'
  );
  if (hasRequiredErrors) return 'error';

  // Warning: Optional fields invalid
  const hasOptionalErrors = error.errors.some(
    err => err.code === 'invalid_type' && err.expected === 'undefined'
  );
  if (hasOptionalErrors) return 'warn';

  return 'info';
}
```

### 4.3 Sanitizing Sensitive Data

Never log sensitive information:

```typescript
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'ssn'];

function sanitizeForLogging(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

// Usage
logger.error('Validation failed', {
  input: sanitizeForLogging(userInput),
  errors: result.error.errors
});
```

### 4.4 Error Aggregation

Track validation failures for metrics:

```typescript
class ValidationMetrics {
  private failures = new Map<string, number>();

  recordFailure(schema: string, field: string, code: string) {
    const key = `${schema}:${field}:${code}`;
    this.failures.set(key, (this.failures.get(key) || 0) + 1);
  }

  getTopFailures(limit = 10) {
    return Array.from(this.failures.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}

const metrics = new ValidationMetrics();

function validateWithMetrics(
  schemaName: string,
  schema: z.ZodType,
  data: unknown
) {
  const result = schema.safeParse(data);

  if (!result.success) {
    for (const err of result.error.errors) {
      metrics.recordFailure(
        schemaName,
        err.path.join('.'),
        err.code
      );
    }
  }

  return result;
}
```

---

## 5. Fallback/Error Response Strategies

### 5.1 Returning Error Responses

Return structured error responses:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

function validateAndRespond<T>(
  schema: z.ZodType<T>,
  data: unknown
): ApiResponse<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    };
  }

  return {
    success: true,
    data: result.data
  };
}
```

### 5.2 Default Values Fallback

Use `.default()` for fallback values:

```typescript
const ConfigSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  fontSize: z.number().min(10).max(24).default(14),
  notifications: z.boolean().default(true),
  optionalFeature: z.string().optional()
});

// Missing fields get default values
const result = ConfigSchema.safeParse({});
// result.data: { theme: 'light', fontSize: 14, notifications: true }
```

### 5.3 Partial Validation

Accept partial data with `.partial()`:

```typescript
const UpdateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number()
});

// Make all fields optional
const PartialUpdateSchema = UpdateSchema.partial();

const result = PartialUpdateSchema.safeParse({ name: 'John' });
// ✓ Validates successfully (only name provided)
```

### 5.4 Passthrough Mode

Allow unknown fields with `.passthrough()`:

```typescript
const FlexibleSchema = z.object({
  name: z.string(),
  email: z.string().email()
}).passthrough(); // Keep unknown fields

const result = FlexibleSchema.safeParse({
  name: 'John',
  email: 'john@example.com',
  extraField: 'preserved' // Not in schema, but kept
});

// result.data includes extraField
```

### 5.5 Fallback Schema Pattern

Try multiple schemas in order:

```typescript
function validateWithFallback<T>(
  schemas: Array<{ name: string; schema: z.ZodType<T> }>,
  data: unknown
): { success: boolean; schema?: string; data?: T; errors?: z.ZodError[] } {
  const errors: z.ZodError[] = [];

  for (const { name, schema } of schemas) {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, schema: name, data: result.data };
    }
    errors.push(result.error);
  }

  return { success: false, errors };
}

// Usage
const result = validateWithFallback(
  [
    { name: 'strict', schema: StrictUserSchema },
    { name: 'lenient', schema: LenientUserSchema },
    { name: 'minimal', schema: MinimalUserSchema }
  ],
  inputData
);
```

---

## 6. Real-World Examples from Groundswell

### 6.1 Prompt.safeValidateResponse()

**Location**: `/home/dustin/projects/groundswell/src/core/prompt.ts`

```typescript
export class Prompt<T> {
  /**
   * Safely validate response without throwing
   * @param data Unknown data to validate
   * @returns Result object with success flag and data or error
   */
  public safeValidateResponse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = this.responseFormat.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }
}
```

### 6.2 AgentResponse Error Handling Pattern

**Location**: `/home/dustin/projects/groundswell/src/types/agent.ts`

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  // ...
} as const;

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

### 6.3 Validation Pipeline Pattern

```typescript
// Complete validation pipeline for agent responses
async function validateAgentResponse<T>(
  anthropicMessage: AnthropicMessage,
  schema: z.ZodType<T>,
  metadata: AgentResponseMetadata
): Promise<AgentResponse<T>> {
  try {
    // Step 1: Extract text content
    const textBlock = anthropicMessage.content.find(
      (block): block is TextBlock => block.type === 'text'
    );

    if (!textBlock) {
      return createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'No text response received from API',
        metadata
      );
    }

    // Step 2: Extract JSON
    const jsonString = extractJsonFromResponse(textBlock.text);
    if (!jsonString) {
      return createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'No JSON object found in response',
        metadata
      );
    }

    // Step 3: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      return createErrorResponse(
        AGENT_ERROR_CODES.MALFORMED_JSON,
        'Failed to parse JSON from LLM response',
        metadata
      );
    }

    // Step 4: Validate with Zod
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Response failed schema validation',
        {
          validationErrors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        true // recoverable
      );
    }

    // Step 5: Success response
    return createSuccessResponse(result.data, metadata);

  } catch (error) {
    return createErrorResponse(
      AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
      error instanceof Error ? error.message : 'Unknown error',
      metadata
    );
  }
}
```

---

## 7. Common Pitfalls to Avoid

### 7.1 Using parse() Without Try-Catch

**❌ Bad**:
```typescript
const validated = schema.parse(userInput); // Throws!
```

**✅ Good**:
```typescript
const result = schema.safeParse(userInput);
if (!result.success) {
  return formatError(result.error);
}
```

### 7.2 Ignoring Error Details

**❌ Bad**:
```typescript
if (!result.success) {
  console.log('Validation failed'); // No details!
}
```

**✅ Good**:
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

### 7.3 Logging Sensitive Data

**❌ Bad**:
```typescript
logger.error('Validation failed', { input });
// May log passwords, tokens, etc.
```

**✅ Good**:
```typescript
logger.error('Validation failed', {
  input: sanitizeInput(input),
  errors: result.error.errors
});
```

### 7.4 Losing Type Information

**❌ Bad**:
```typescript
function validate(data: unknown): any {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
```

**✅ Good**:
```typescript
function validate<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
```

### 7.5 Generic Error Messages

**❌ Bad**:
```typescript
const schema = z.string().min(8);
// Error: "String must contain at least 8 character(s)"
```

**✅ Good**:
```typescript
const schema = z.string().min(8, 'Password must be at least 8 characters');
```

---

## 8. External Resources

### Official Documentation

- **Zod GitHub**: https://github.com/colinhacks/zod
- **Zod Error Handling**: https://github.com/colinhacks/zod#error-handling
- **Zod safeParse()**: https://zod.dev/?id=safeparse
- **Zod Discriminated Unions**: https://zod.dev/?id=discriminated-unions

### Community Resources

1. **Zod Validation Patterns**
   - URL: https://kettanaito.com/blog/zod-validation-patterns
   - Topics: safeParse vs parse, error formatting, custom refinements

2. **Type-Safe APIs with Zod**
   - URL: https://www.toptal.com/software/type-safe-api-typescript-zod
   - Topics: API validation, middleware patterns, error responses

3. **Advanced Zod Patterns**
   - URL: https://www.totaltypescript.com/blog/zod
   - Topics: Computed schemas, schema composition, refinements

### Related Libraries

1. **zod-error-formatter**
   - URL: https://github.com/causaly/zod-validation-error
   - Purpose: Pretty-print Zod errors

2. **neverthrow**
   - URL: https://github.com/supermacro/neverthrow
   - Purpose: Result type for error handling without exceptions

---

## Summary of Key Insights

### When to Use safeParse()

✅ **Use safeParse() for**:
- User input validation
- API request/response validation
- External data parsing
- Configuration validation
- When you need graceful error handling

❌ **Use parse() for**:
- Internal invariant validation
- When failures should crash
- Error boundary scenarios

### Best Practices

1. **Always prefer safeParse()** over parse() for external data
2. **Provide custom error messages** in schema definitions
3. **Log validation failures** with structured context
4. **Sanitize sensitive data** before logging
5. **Return structured error responses** for API failures
6. **Use type guards** to narrow result types
7. **Track validation metrics** for system health
8. **Implement fallback schemas** for resilience

### Error Response Structure

A good validation error response should include:
- **error.code**: Machine-readable error code (SCREAMING_SNAKE_CASE)
- **error.message**: Human-readable description
- **error.details**: Array of field-specific errors with paths
- **error.recoverable**: Boolean flag for retry logic

---

*This guide is based on Groundswell's implementation patterns and Zod best practices.*
*Last Updated: 2026-01-24*
