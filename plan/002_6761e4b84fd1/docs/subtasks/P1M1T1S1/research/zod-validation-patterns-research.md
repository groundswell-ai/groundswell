# Zod Validation Patterns Research

**PRP ID**: P1.M1.T1.S1
**Research Date**: 2026-01-24
**Topic**: Zod validation patterns for discriminated unions and API responses

---

## Executive Summary

This document compiles research on Zod validation patterns, specifically for implementing runtime validation of `AgentResponse<T>` discriminated unions. Groundswell already uses Zod v3.23.0 for prompt validation.

---

## 1. Zod Overview

### 1.1 What is Zod?

**Reference**: https://zod.dev/

Zod is a TypeScript-first schema declaration and validation library. It provides:
- **Type Inference**: Automatically derive TypeScript types from schemas
- **Runtime Validation**: Validate data at runtime with detailed error messages
- **Composeable**: Build complex schemas from simple primitives

### 1.2 Current Groundswell Usage

**Location**: `src/core/agent.ts:387`

```typescript
// Validate with schema
const validated = prompt.validateResponse(parsed);
```

**Pattern**: Each `Prompt<T>` has an internal Zod schema that validates responses.

---

## 2. Discriminated Union Validation

### 2.1 Basic Discriminated Union

**Reference**: https://zod.dev/?id=discriminated-unions

```typescript
import { z } from 'zod';

// Define discriminated union
const ResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.object({ name: z.string() }),
    error: z.null(),
  }),
  z.object({
    status: z.literal('error'),
    data: z.null(),
    error: z.object({ message: z.string() }),
  }),
]);

type Response = z.infer<typeof ResponseSchema>;

// Type is:
// type Response = {
//   status: 'success';
//   data: { name: string };
//   error: null;
// } | {
//   status: 'error';
//   data: null;
//   error: { message: string };
// }
```

### 2.2 Generic Discriminated Union

```typescript
// Define generic discriminated union schema factory
const AgentResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('status', [
    // Success case
    z.object({
      status: z.literal('success'),
      data: dataSchema,
      error: z.null(),
      metadata: z.object({
        agentId: z.string(),
        timestamp: z.number(),
        duration: z.number().optional(),
      }),
    }),
    // Error case
    z.object({
      status: z.literal('error'),
      data: z.null(),
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
        recoverable: z.boolean(),
      }),
      metadata: z.object({
        agentId: z.string(),
        timestamp: z.number(),
        duration: z.number().optional(),
      }),
    }),
    // Partial case
    z.object({
      status: z.literal('partial'),
      data: dataSchema.partial(), // All fields optional
      error: z.null(),
      metadata: z.object({
        agentId: z.string(),
        timestamp: z.number(),
        duration: z.number().optional(),
      }),
    }),
  ]);
```

### 2.3 Type Inference

```typescript
// Infer TypeScript type from schema
type AgentResponse<T> = z.infer<ReturnType<typeof AgentResponseSchema<T>>>;

// Or use utility type
type SuccessResponse<T> = z.infer<ReturnType<typeof successSchema<T>>>;
```

---

## 3. Error Handling Patterns

### 3.1 ZodError Structure

**Reference**: https://zod.dev/?q=ZodError

```typescript
try {
  const validated = schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.errors);
    // Output:
    // [
    //   {
    //     "code": "invalid_type",
    //     "expected": "string",
    //     "received": "number",
    //     "path": ["name"],
    //     "message": "Expected string, received number"
    //   }
    // ]
  }
}
```

### 3.2 Safe Parsing

**Reference**: https://zod.dev/?id=safeparse

```typescript
// SafeParse returns result object instead of throwing
const result = schema.safeParse(data);

if (result.success) {
  // result.data is typed
  console.log(result.data);
} else {
  // result.error is ZodError
  console.error(result.error.errors);
}
```

### 3.3 Custom Error Messages

```typescript
// Define schema with custom error messages
const UserSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }),
  email: z.string().email('Invalid email address'),
});

// Custom error map for entire schema
const schema = z.object({
  // ...
}).strict({
  message: 'Unknown keys in object',
});
```

---

## 4. INVALID_RESPONSE_FORMAT Error Handling

### 4.1 Error Code Definition

```typescript
// Error code constants
export const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  NO_JSON_IN_RESPONSE: 'NO_JSON_IN_RESPONSE',
  MALFORMED_JSON: 'MALFORMED_JSON',
  RESPONSE_TOO_LONG: 'RESPONSE_TOO_LONG',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

### 4.2 Error Factory with Zod Integration

```typescript
import { z } from 'zod';

function createValidationError(
  zodError: z.ZodError,
  metadata: AgentResponseMetadata
): AgentResponse<never> {
  // Format Zod errors for user
  const formattedErrors = zodError.errors.map((err) => ({
    path: err.path.join('.'),
    code: err.code,
    message: err.message,
  }));

  return {
    status: 'error',
    data: null,
    error: {
      code: ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      message: 'Response failed schema validation',
      details: {
        validationErrors: formattedErrors,
        count: formattedErrors.length,
      },
      recoverable: true, // Validation errors are often retryable
    },
    metadata,
  };
}
```

### 4.3 JSON Parse Error Handling

```typescript
function createJsonParseError(
  parseError: SyntaxError,
  metadata: AgentResponseMetadata
): AgentResponse<never> {
  return {
    status: 'error',
    data: null,
    error: {
      code: ERROR_CODES.MALFORMED_JSON,
      message: 'Failed to parse JSON from LLM response',
      details: {
        originalMessage: parseError.message,
      },
      recoverable: true, // LLM may produce valid JSON on retry
    },
    metadata,
  };
}
```

---

## 5. Anthropic API Response Validation

### 5.1 Anthropic Message Structure

**Reference**: https://docs.anthropic.com/en/api/messages

```typescript
// Anthropic SDK Message type
interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<TextBlock | ToolUseBlock>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
```

### 5.2 Response Extraction Schema

```typescript
// Schema for extracting JSON from text response
const JsonExtractionSchema = z.object({
  jsonContent: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid JSON content' }
  ),
});

// Extract JSON using regex (current Groundswell pattern)
function extractJsonFromResponse(text: string): string | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}
```

### 5.3 Validation Pipeline

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
        ERROR_CODES.NO_JSON_IN_RESPONSE,
        'No text response received from API',
        metadata
      );
    }

    // Step 2: Extract JSON
    const jsonString = extractJsonFromResponse(textBlock.text);
    if (!jsonString) {
      return createErrorResponse(
        ERROR_CODES.NO_JSON_IN_RESPONSE,
        'No JSON object found in response',
        metadata
      );
    }

    // Step 3: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      return createJsonParseError(error as SyntaxError, metadata);
    }

    // Step 4: Validate with Zod
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return createValidationError(result.error, metadata);
    }

    // Step 5: Success response
    return createSuccessResponse(result.data, metadata);

  } catch (error) {
    return createErrorResponse(
      ERROR_CODES.INVALID_RESPONSE_FORMAT,
      error instanceof Error ? error.message : 'Unknown error',
      metadata
    );
  }
}
```

---

## 6. Schema Reuse Patterns

### 6.1 Base Metadata Schema

```typescript
// Shared metadata schema
const AgentResponseMetadataSchema = z.object({
  agentId: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),
  requestId: z.string().optional(),
});

type AgentResponseMetadata = z.infer<typeof AgentResponseMetadataSchema>;
```

### 6.2 Error Details Schema

```typescript
// Error details schema
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  recoverable: z.boolean(),
});

type AgentErrorDetails = z.infer<typeof AgentErrorDetailsSchema>;
```

### 6.3 Composing Full Schema

```typescript
// Compose full AgentResponse schema
const createAgentResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('status', [
    // Success
    z.object({
      status: z.literal('success'),
      data: dataSchema,
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),
    // Error
    z.object({
      status: z.literal('error'),
      data: z.null(),
      error: AgentErrorDetailsSchema,
      metadata: AgentResponseMetadataSchema,
    }),
    // Partial
    z.object({
      status: z.literal('partial'),
      data: dataSchema.partial(),
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),
  ]);
```

---

## 7. Runtime Performance Considerations

### 7.1 Schema Compilation

**Reference**: https://zod.dev/?q=performance

```typescript
// Compile schema once for better performance
const compiledSchema = schema.compile();

// Use compiled schema
const result = compiledSchema.parse(data);
```

### 7.2 Caching Validated Responses

```typescript
// Current Groundswell caching stores PromptResult<T>
// Future: May need to cache AgentResponse<T>

interface CacheEntry<T> {
  response: AgentResponse<T>;
  timestamp: number;
}

function shouldCache<T>(response: AgentResponse<T>): boolean {
  // Only cache successful responses
  return response.status === 'success';
}
```

---

## 8. Testing Validation

### 8.1 Unit Test Pattern

```typescript
import { z } from 'zod';

describe('AgentResponse validation', () => {
  const TestSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should validate success response', () => {
    const response = {
      status: 'success' as const,
      data: { name: 'John', age: 30 },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const schema = createAgentResponseSchema(TestSchema);
    const result = schema.parse(response);

    expect(result.status).toBe('success');
    expect(result.data.name).toBe('John');
  });

  it('should reject invalid data', () => {
    const response = {
      status: 'success' as const,
      data: { name: 123, age: 'invalid' }, // Wrong types
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const schema = createAgentResponseSchema(TestSchema);
    const result = schema.safeParse(response);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toHaveLength(2);
    }
  });
});
```

### 8.2 Type Guards

```typescript
// Type-safe status checking
function isSuccess<T>(response: AgentResponse<T>): response is { status: 'success'; data: T; error: null; metadata: AgentResponseMetadata } {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is { status: 'error'; data: null; error: AgentErrorDetails; metadata: AgentResponseMetadata } {
  return response.status === 'error';
}

// Usage
if (isSuccess(response)) {
  // TypeScript knows response.data is T
  console.log(response.data);
}
```

---

## 9. Common Zod Validation Patterns

### 9.1 Optional vs Nullable

```typescript
// Optional field (undefined allowed)
const schema1 = z.object({
  name: z.string().optional(),
});

// Nullable field (null allowed)
const schema2 = z.object({
  name: z.string().nullable(),
});

// Optional or nullable (both allowed)
const schema3 = z.object({
  name: z.string().optional().nullable(),
  // or
  name: z.string().nullish(),
});
```

### 9.2 Default Values

```typescript
const schema = z.object({
  name: z.string().default('Anonymous'),
  age: z.number().default(0),
  active: z.boolean().default(true),
});

// Parse with defaults
const result = schema.parse({}); // { name: 'Anonymous', age: 0, active: true }
```

### 9.3 Transformations

```typescript
// Transform data during validation
const schema = z.object({
  birthYear: z.number().transform((year) => {
    const age = new Date().getFullYear() - year;
    return { age, year };
  }),
});

const result = schema.parse({ birthYear: 1990 });
// result.birthYear is { age: 34, year: 1990 }
```

### 9.4 Refinements

```typescript
// Custom validation logic
const schema = z.object({
  age: z.number().refine(
    (val) => val >= 0 && val <= 120,
    { message: 'Age must be between 0 and 120' }
  ),
  email: z.string().email().refine(
    (val) => !val.includes('+'), // No plus addresses
    { message: 'Plus addresses not allowed' }
  ),
});
```

---

## 10. Integration with Groundswell

### 10.1 Current Validation Point

**Location**: `src/core/agent.ts:387`

```typescript
// Current: Direct validation
const validated = prompt.validateResponse(parsed);
```

### 10.2 Enhanced Validation with AgentResponse

```typescript
// Enhanced: Wrap in AgentResponse
try {
  const validated = prompt.validateResponse(parsed);
  return createSuccessResponse(validated, metadata);
} catch (error) {
  if (error instanceof z.ZodError) {
    return createValidationError(error, metadata);
  }
  return createErrorResponse(
    ERROR_CODES.INVALID_RESPONSE_FORMAT,
    error instanceof Error ? error.message : 'Unknown error',
    metadata
  );
}
```

### 10.3 Prompt.validateResponse() Enhancement

```typescript
// Enhanced Prompt method
class Prompt<T> {
  validateResponseWithAgentResponse(
    data: unknown,
    metadata: AgentResponseMetadata
  ): AgentResponse<T> {
    const result = this.schema.safeParse(data);

    if (!result.success) {
      return createValidationError(result.error, metadata);
    }

    return createSuccessResponse(result.data, metadata);
  }
}
```

---

## 11. Summary of Recommendations

### 11.1 Schema Structure
- Use `z.discriminatedUnion('status', [...])` for AgentResponse
- Define base schemas for metadata and error details
- Use schema factory for generic data types

### 11.2 Error Handling
- Convert current thrown errors to AgentResponse with error status
- Use specific error codes (INVALID_RESPONSE_FORMAT, etc.)
- Include recoverable flag for retry logic

### 11.3 Validation Pipeline
1. Extract text from Anthropic response
2. Extract JSON via regex
3. Parse JSON
4. Validate with Zod schema
5. Return appropriate AgentResponse

### 11.4 Performance
- Compile schemas once for reuse
- Cache only successful responses
- Consider schema complexity for hot paths

---

## References

- **Zod Documentation**: https://zod.dev/
- **Zod Discriminated Unions**: https://zod.dev/?id=discriminated-unions
- **Zod Error Handling**: https://zod.dev/?q=ZodError
- **Anthropic Messages API**: https://docs.anthropic.com/en/api/messages
- **Groundswell Current Usage**: `src/core/agent.ts:387`
