# Zod .safeParse() Validation Guide for Agent.prompt()

**Work Item**: P1.M2.T1.S2 - Add validation to Agent.prompt() return path
**Research Date**: 2026-01-24

## Summary

This document provides the Zod .safeParse() patterns and best practices needed to implement runtime validation on the Agent.prompt() return path.

---

## 1. .safeParse() Fundamentals

### What is .safeParse()?

`.safeParse()` is a Zod method that validates data against a schema **without throwing** on failure. It returns a discriminated union type:

```typescript
type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError }
```

### Why Use .safeParse() Instead of .parse()?

- **Non-throwing**: Returns an object instead of throwing on validation failure
- **Type-safe**: TypeScript can narrow types based on `success` field
- **Better error handling**: Can extract detailed error information
- **Graceful degradation**: Can return fallback values instead of crashing

### Basic Usage Pattern

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

// Validate unknown data
const result = schema.safeParse(unknownData);

if (result.success) {
  // TypeScript knows result.data is { name: string; age: number }
  console.log('Valid:', result.data.name);
} else {
  // TypeScript knows result.error is ZodError
  console.error('Invalid:', result.error.errors);
}
```

---

## 2. TypeScript Typing for .safeParse()

### Return Type Discrimination

The `.success` field acts as a type discriminator:

```typescript
function validateResponse(data: unknown) {
  const result = schema.safeParse(data);

  // After this check, TypeScript narrows the type
  if (result.success) {
    // result.data has the inferred type
    return result.data;
  } else {
    // result.error is ZodError
    return null;
  }
}
```

### Type Guard Pattern

Create a type guard for cleaner code:

```typescript
function isValidResponse(data: unknown): data is MyType {
  const result = schema.safeParse(data);
  return result.success;
}

if (isValidResponse(unknown)) {
  // TypeScript knows unknown is MyType
}
```

---

## 3. Graceful Error Handling

### Early Return Pattern

```typescript
function processResponse(response: unknown): AgentResponse<T> {
  // Validate the response
  const validation = schema.safeParse(response);
  if (!validation.success) {
    // Log error details
    console.error('Validation failed', {
      errors: validation.error.errors,
    });

    // Return error response
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Response validation failed',
      { validationErrors: validation.error.errors },
      false
    );
  }

  // Process valid response
  return createSuccessResponse(validation.data, metadata);
}
```

### Error Detail Extraction

```typescript
if (!validation.success) {
  // Extract field-level errors
  const fieldErrors = validation.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  // Create summary
  const summary = fieldErrors
    .map(e => `${e.field}: ${e.message}`)
    .join('; ');

  return createErrorResponse(
    'INTERNAL_ERROR',
    `Validation failed: ${summary}`,
    { fieldErrors },
    false
  );
}
```

---

## 4. Error Logging Best Practices

### Structured Logging

```typescript
console.error('Agent response validation failed', {
  agentId: agent.id,
  timestamp: Date.now(),
  errorCount: validation.error.errors.length,
  errors: validation.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
    expected: err.expected,
    received: err.received,
  })),
});
```

### Log Levels

- **error**: Validation failures that prevent operation
- **warn**: Validation failures that have fallback
- **info**: Successful validation (only in debug mode)

### Security: Sanitize Sensitive Data

```typescript
function sanitizeError(err: z.ZodError): z.ZodError {
  // Redact sensitive fields
  return {
    ...err,
    errors: err.errors.map(e => ({
      ...e,
      received: isSensitive(e.path) ? '[REDACTED]' : e.received,
    })),
  };
}

function isSensitive(path: (string | number)[]): boolean {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  return path.some(p => sensitiveFields.includes(String(p)));
}
```

---

## 5. Discriminated Union Validation

### AgentResponseSchema Pattern

```typescript
// From P1.M2.T1.S1 PRP
const responseSchema = AgentResponseSchema(dataSchema);

// Validate - returns discriminated union
const result = responseSchema.safeParse(response);

if (result.success) {
  // Type narrowing based on status
  switch (result.data.status) {
    case 'success':
      // TypeScript knows: data is T, error is null
      console.log('Success:', result.data.data);
      break;
    case 'error':
      // TypeScript knows: data is null, error exists
      console.error('Error:', result.data.error.message);
      break;
    case 'partial':
      // TypeScript knows: data is T, error is null
      console.log('Partial:', result.data.data);
      break;
  }
}
```

---

## 6. Generic Validation Wrapper

### Reusable Validation Function

```typescript
async function validateAndReturn<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodType<T>,
  agentId: string
): Promise<AgentResponse<T>> {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate
  const validation = schema.safeParse(response);
  if (!validation.success) {
    // Log error
    console.error('Response validation failed', {
      agentId,
      errorCount: validation.error.errors.length,
      errors: validation.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });

    // Return error response
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Internal response validation failed',
      { validationErrors: validation.error.errors },
      false
    );
  }

  return response;
}
```

---

## 7. Common Pitfalls to Avoid

### 1. Using .parse() Instead of .safeParse()

```typescript
// DON'T: Throws on validation failure
const data = schema.parse(unknown); // May throw!

// DO: Returns result object
const result = schema.safeParse(unknown);
if (!result.success) {
  // Handle error gracefully
}
```

### 2. Ignoring Error Details

```typescript
// DON'T: Lose error information
if (!result.success) {
  return createErrorResponse('INTERNAL_ERROR', 'Validation failed');
}

// DO: Include error details
if (!result.success) {
  return createErrorResponse(
    'INTERNAL_ERROR',
    'Validation failed',
    { errors: result.error.errors }
  );
}
```

### 3. Not Checking .success Field

```typescript
// DON'T: Accessing data without checking
const result = schema.safeParse(data);
console.log(result.data); // May be undefined!

// DO: Always check success first
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);
}
```

### 4. Losing Type Information

```typescript
// DON'T: Type assertion
const data = result.data as MyType; // Unsafe!

// DO: Let TypeScript infer
if (result.success) {
  const data: MyType = result.data; // Type-safe
}
```

---

## 8. Integration with Agent.prompt()

### Validation Pattern for executePrompt()

```typescript
// In Agent.executePrompt(), before returning
async executePrompt<T>(...): Promise<AgentResponse<T>> {
  // ... existing logic ...

  // Create response
  const response = createSuccessResponse(validated, metadata);

  // Validate before returning
  const schema = AgentResponseSchema(prompt.responseFormat);
  const validation = schema.safeParse(response);

  if (!validation.success) {
    // Log internal validation failure
    console.error('Response validation failed', {
      agentId: this.id,
      timestamp: Date.now(),
      errors: validation.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });

    // Return error response
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Internal response validation failed',
      { validationErrors: validation.error.errors },
      false
    );
  }

  return response;
}
```

### Reusable Validation Method

```typescript
// Add to Agent class
private validateResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodType<T>
): AgentResponse<T> {
  const schema = AgentResponseSchema(dataSchema);
  const validation = schema.safeParse(response);

  if (!validation.success) {
    console.error('Response validation failed', {
      agentId: this.id,
      errors: validation.error.errors,
    });

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Internal response validation failed',
      { validationErrors: validation.error.errors },
      false
    );
  }

  return response;
}

// Use in executePrompt()
const response = createSuccessResponse(validated, metadata);
return this.validateResponse(response, prompt.responseFormat);
```

---

## 9. Testing Validation

### Unit Test Pattern

```typescript
describe('Agent.prompt() validation', () => {
  it('should validate success responses', async () => {
    const agent = createAgent();
    const prompt = createPrompt();

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
    expect(response.error).toBeNull();
  });

  it('should handle validation failures gracefully', async () => {
    // Mock to return invalid response
    vi.spyOn(agent, 'executePrompt').mockResolvedValue({
      status: 'success',
      data: null,  // Invalid: should not be null
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('INTERNAL_ERROR');
  });
});
```

---

## 10. Key Takeaways

1. **Always use .safeParse()** for external/internal validation
2. **Check .success field** before accessing data
3. **Log detailed errors** for debugging
4. **Return error responses** on validation failure
5. **Use discriminated unions** for type-safe status handling
6. **Sanitize sensitive data** before logging
7. **Create reusable validators** to reduce duplication
