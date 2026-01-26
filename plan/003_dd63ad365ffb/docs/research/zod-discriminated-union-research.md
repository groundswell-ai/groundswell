# Zod Discriminated Union Research

**Research Date:** 2026-01-26
**Task ID:** P3M2T1S1
**Zod Version:** 3.23.0 (Groundswell project dependency)
**Focus:** Comprehensive Zod discriminated union support for runtime validation patterns

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Zod Discriminated Union Fundamentals](#2-zod-discriminated-union-fundamentals)
3. [Official Documentation URLs](#3-official-documentation-urls)
4. [Creating Zod Schemas for Discriminated Unions](#4-creating-zod-schemas-for-discriminated-unions)
5. [Zod's discriminatedUnion() Method](#5-zods-discriminatedunion-method)
6. [Runtime Validation Patterns](#6-runtime-validation-patterns)
7. [Type Inference from Zod Discriminated Unions](#7-type-inference-from-zod-discriminated-unions)
8. [TypeScript-Zod Integration Best Practices](#8-typescript-zod-integration-best-practices)
9. [Advanced Patterns](#9-advanced-patterns)
10. [Common Gotchas and Solutions](#10-common-gotchas-and-solutions)
11. [Performance Considerations](#11-performance-considerations)
12. [Testing Strategies](#12-testing-strategies)
13. [Groundswell Integration](#13-groundswell-integration)
14. [Code Examples](#14-code-examples)
15. [References](#15-references)

---

## 1. Executive Summary

Zod provides excellent first-class support for discriminated unions through the `z.discriminatedUnion()` method. This feature is particularly valuable for:

- **Status-based response types** (success/error/pending)
- **Event type systems** (different event shapes)
- **Configuration variants** (different config modes)
- **API response shapes** (different response formats)

**Key Findings:**
- Zod 3.23.0 has full discriminated union support
- Type inference works perfectly with TypeScript
- Runtime validation is efficient and type-safe
- Integrates seamlessly with Groundswell's existing Zod usage
- Supports nested discriminated unions
- Excellent error messages for debugging

---

## 2. Zod Discriminated Union Fundamentals

### What is a Discriminated Union?

A discriminated union (also known as tagged union) is a TypeScript pattern where a union type has a common property (the discriminator) that TypeScript can use to narrow the type.

### Why Use Zod Discriminated Unions?

1. **Type Safety**: TypeScript automatically narrows types based on discriminator
2. **Exhaustiveness Checking**: Ensures all cases are handled at compile time
3. **Runtime Validation**: Validates data structure at runtime
4. **Performance**: More efficient than regular unions
5. **Developer Experience**: Better IntelliSense and autocomplete

---

## 3. Official Documentation URLs

### Primary Sources

- **Zod Official Documentation**: https://zod.dev
- **GitHub Repository**: https://github.com/colinhacks/zod
- **Discriminated Unions Section**: https://zod.dev/?id=discriminated-unions
- **Unions Section**: https://zod.dev/?id=unions

### Related Documentation

- **Type Inference**: https://zod.dev/?id=inference
- **Error Handling**: https://zod.dev/?id=error-handling
- **safeParse()**: https://zod.dev/?id=safeparse
- **Generics**: https://zod.dev/?id=generics
- **Schema Composition**: https://zod.dev/?id=schema-composition
- **Nullable Values**: https://zod.dev/?id=nullable-values

---

## 4. Creating Zod Schemas for Discriminated Unions

### 4.1 Basic Pattern

```typescript
import { z } from "zod";

// Define individual schemas with a common discriminator field
const SuccessSchema = z.object({
  status: z.literal("success"),
  data: z.string(),
});

const ErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
});

const PendingSchema = z.object({
  status: z.literal("pending"),
  progress: z.number().optional(),
});

// Create discriminated union
const ResultSchema = z.discriminatedUnion("status", [
  SuccessSchema,
  ErrorSchema,
  PendingSchema,
]);

type Result = z.infer<typeof ResultSchema>;
```

### 4.2 Requirements for Discriminated Unions

1. **Common Discriminator Field**: All schemas must share the same field name
2. **Literal Values**: The discriminator field must use `z.literal()` with unique values
3. **Uniqueness**: Each literal value must be unique across all schemas
4. **Object Schemas**: All members must be object schemas

### 4.3 Invalid Examples

```typescript
// ❌ ERROR: Different discriminator fields
const BadUnion1 = z.discriminatedUnion("type", [
  z.object({ type: z.literal("a") }),
  z.object({ kind: z.literal("b") }), // Wrong field name
]);

// ❌ ERROR: Non-literal values
const BadUnion2 = z.discriminatedUnion("status", [
  z.object({ status: z.enum(["success", "failure"]) }), // enum, not literal
  z.object({ status: z.literal("pending") }),
]);

// ❌ ERROR: Duplicate literal values
const BadUnion3 = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success") }),
  z.object({ status: z.literal("success") }), // Duplicate
]);
```

---

## 5. Zod's discriminatedUnion() Method

### 5.1 Method Signature

```typescript
z.discriminatedUnion<T>(discriminator: keyof T, options: ZodDiscriminatedUnion<T>)
```

### 5.2 Parameters

- **discriminator**: The key name of the discriminator field (as a string literal)
- **options**: Array of object schemas that share the discriminator field

### 5.3 Return Type

Returns a `ZodDiscriminatedUnion` schema that validates and infers the union type.

### 5.4 Example with Explicit Types

```typescript
const EventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user.created"),
    userId: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("user.deleted"),
    userId: z.string(),
    timestamp: z.number(),
    reason: z.string(),
  }),
]);

type Event = z.infer<typeof EventSchema>;
// Event =
//   | { type: "user.created"; userId: string; timestamp: number }
//   | { type: "user.deleted"; userId: string; timestamp: number; reason: string }
```

---

## 6. Runtime Validation Patterns

### 6.1 Parse vs safeParse

```typescript
// Parse: Throws on error
try {
  const validated = ResultSchema.parse(input);
  console.log(validated.data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation failed:", error.errors);
  }
}

// safeParse: Returns result object
const result = ResultSchema.safeParse(input);

if (result.success) {
  console.log("Valid:", result.data);
} else {
  console.error("Errors:", result.error.errors);
}
```

### 6.2 Validation Pipeline Pattern

```typescript
function validateApiResponse<T>(
  schema: z.ZodType<T>,
  response: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  // Step 1: Check if response is object
  if (typeof response !== "object" || response === null) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: z.ZodIssueCode.invalid_type,
          expected: "object",
          received: typeof response,
          path: [],
          message: "Expected object",
        },
      ]),
    };
  }

  // Step 2: Validate with schema
  const result = schema.safeParse(response);

  if (!result.success) {
    return {
      success: false,
      errors: result.error,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

### 6.3 Error Response Pattern

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = result.error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
  }));

  return {
    success: false,
    errors,
  };
}
```

### 6.4 Fallback Validation Pattern

```typescript
function validateWithFallback<T>(
  schemas: Array<{ name: string; schema: z.ZodType<T> }>,
  data: unknown
): { success: true; schema: string; data: T } | { success: false; allErrors: z.ZodError[] } {
  const allErrors: z.ZodError[] = [];

  for (const { name, schema } of schemas) {
    const result = schema.safeParse(data);
    if (result.success) {
      return {
        success: true,
        schema: name,
        data: result.data,
      };
    }
    allErrors.push(result.error);
  }

  return {
    success: false,
    allErrors,
  };
}
```

---

## 7. Type Inference from Zod Discriminated Unions

### 7.1 Basic Type Inference

```typescript
const Schema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    data: z.object({ name: z.string() }),
  }),
  z.object({
    status: z.literal("error"),
    error: z.string(),
  }),
]);

// Infer TypeScript type
type Inferred = z.infer<typeof Schema>;
// Inferred =
//   | { status: "success"; data: { name: string } }
//   | { status: "error"; error: string }
```

### 7.2 Type Narrowing with Discriminator

```typescript
function handleResult(result: Inferred) {
  switch (result.status) {
    case "success":
      // TypeScript knows this is { status: "success"; data: { name: string } }
      console.log(result.data.name); // ✓ Type-safe
      // result.error; // ❌ Type error: Property doesn't exist
      break;
    case "error":
      // TypeScript knows this is { status: "error"; error: string }
      console.log(result.error); // ✓ Type-safe
      // result.data; // ❌ Type error: Property doesn't exist
      break;
  }
}
```

### 7.3 Type Guard Pattern

```typescript
function isSuccess<T>(
  result: z.infer<ReturnType<typeof createResultSchema<T>>>
): result is { status: "success"; data: T } {
  return result.status === "success";
}

function isError<T>(
  result: z.infer<ReturnType<typeof createResultSchema<T>>>
): result is { status: "error"; error: string } {
  return result.status === "error";
}

// Usage
if (isSuccess(result)) {
  console.log(result.data); // Type-safe access
}
```

### 7.4 Exhaustiveness Checking

```typescript
function handleResult(result: Inferred) {
  switch (result.status) {
    case "success":
      return result.data;
    case "error":
      throw new Error(result.error);
    default:
      // TypeScript enforces exhaustiveness
      const exhaustiveCheck: never = result;
      return exhaustiveCheck;
  }
}
```

---

## 8. TypeScript-Zod Integration Best Practices

### 8.1 Export Both Schemas and Types

```typescript
// ✅ GOOD: Export both schema and inferred type
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().nullable(),
  context: z.record(z.string(), z.any()).nullable(),
});

export type AgentErrorDetails = z.infer<typeof AgentErrorDetailsSchema>;

// Allows importing just the type when schema isn't needed
import { AgentErrorDetails } from "./schemas";
```

### 8.2 Schema Composition

```typescript
// Base schemas
const AgentMetadataBase = z.object({
  timestamp: z.string().datetime(),
  agentVersion: z.string(),
});

const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().nullable(),
});

// Compose schemas
const AgentResponseMetadataSchema = AgentMetadataBase.extend({
  executionTime: z.number().optional(),
  memoryUsage: z.number().optional(),
});

// Discriminated union variants
const AgentSuccessSchema = z.object({
  status: z.literal("success"),
  data: z.any(),
  metadata: AgentResponseMetadataSchema.optional(),
});

const AgentErrorSchema = z.object({
  status: z.literal("error"),
  error: AgentErrorDetailsSchema.nullable(),
  metadata: AgentResponseMetadataSchema.optional(),
});

// Final discriminated union
const AgentResponseSchema = z.discriminatedUnion("status", [
  AgentSuccessSchema,
  AgentErrorSchema,
]);

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
```

### 8.3 Generic Schema Factories

```typescript
function createAgentResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  errorSchema: z.ZodTypeAny = z.string()
) {
  const SuccessSchema = z.object({
    status: z.literal("success"),
    data: dataSchema,
    metadata: z.object({
      timestamp: z.string().datetime(),
      executionTime: z.number(),
    }).optional(),
  });

  const ErrorSchema = z.object({
    status: z.literal("error"),
    error: errorSchema.nullable(),
    metadata: z.object({
      timestamp: z.string().datetime(),
      retryable: z.boolean(),
    }).optional(),
  });

  return z.discriminatedUnion("status", [SuccessSchema, ErrorSchema]);
}

// Usage
const UserResponseSchema = createAgentResponseSchema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
);

type UserResponse = z.infer<typeof UserResponseSchema>;
```

### 8.4 Naming Conventions

```typescript
// ✅ GOOD: Descriptive names with "Schema" suffix
const AgentErrorDetailsSchema = z.object({ ... });
const AgentResponseMetadataSchema = z.object({ ... });
const AgentSuccessSchema = z.object({ ... });
const AgentErrorSchema = z.object({ ... });

// ❌ AVOID: Unclear abbreviations
const AEDSchema = z.object({ ... });
const ARMSchema = z.object({ ... });
```

---

## 9. Advanced Patterns

### 9.1 Nested Discriminated Unions

```typescript
const InnerSuccess = z.object({
  type: z.literal("inner_success"),
  value: z.string(),
});

const InnerError = z.object({
  type: z.literal("inner_error"),
  error: z.string(),
});

const InnerUnion = z.discriminatedUnion("type", [InnerSuccess, InnerError]);

const OuterSchema = z.object({
  outer: z.literal("outer"),
  inner: InnerUnion,
});

// TypeScript correctly narrows nested unions
function handleOuter(outer: z.infer<typeof OuterSchema>) {
  if (outer.inner.type === "inner_success") {
    console.log(outer.inner.value); // Type-safe
  }
}
```

### 9.2 Recursive Discriminated Unions

```typescript
type Node =
  | { type: "text"; content: string }
  | { type: "element"; tag: string; children: Node[] };

const NodeSchema: z.ZodType<Node> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string() }),
  z.object({
    type: z.literal("element"),
    tag: z.string(),
    children: z.lazy(() => z.array(NodeSchema)),
  }),
]);
```

### 9.3 Multi-Level Discrimination

```typescript
const Event = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user"),
    action: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("created"), id: z.string() }),
      z.object({ kind: z.literal("deleted"), id: z.string() }),
    ]),
  }),
  z.object({
    type: z.literal("system"),
    action: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("startup"), timestamp: z.number() }),
      z.object({ kind: z.literal("shutdown"), timestamp: z.number() }),
    ]),
  }),
]);
```

### 9.4 Discriminated Union with Refinements

```typescript
const ValidatedSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    value: z.number().refine(
      (val) => val >= 0,
      { message: "Value must be non-negative" }
    ),
  }),
  z.object({
    status: z.literal("error"),
    error: z.string(),
  }),
]);
```

### 9.5 Transformations in Discriminated Unions

```typescript
const TransformedSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("celsius"),
    value: z.number().transform((celsius) => ({
      celsius,
      fahrenheit: celsius * 1.8 + 32,
      kelvin: celsius + 273.15,
    })),
  }),
  z.object({
    type: z.literal("fahrenheit"),
    value: z.number().transform((fahrenheit) => ({
      celsius: (fahrenheit - 32) / 1.8,
      fahrenheit,
      kelvin: (fahrenheit - 32) / 1.8 + 273.15,
    })),
  }),
]);
```

---

## 10. Common Gotchas and Solutions

### 10.1 Discriminated Union with Null Discriminator

```typescript
// ❌ WRONG: Cannot use null as discriminator value
const BadUnion = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.null(), data: z.string() }), // Error!
]);

// ✅ CORRECT: Use string literals for discriminator
const GoodUnion = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("null_status"), data: z.string() }),
]);
```

### 10.2 Optional vs Nullable in Discriminated Unions

```typescript
// ❌ WRONG: Optional discriminator doesn't work
const BadOptional = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error").optional(), error: z.string() }),
]);

// ✅ CORRECT: Discriminator must be required
const GoodRequired = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]);
```

### 10.3 Mixing nullable() with discriminatedUnion

```typescript
// ❌ WRONG: Making entire discriminated union nullable loses type narrowing
const BadNullable = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]).nullable();

function handleBad(response: z.infer<typeof BadNullable>) {
  if (response === null) {
    return;
  }
  // Type narrowing works here, but the null check is required
  switch (response.status) {
    case "success":
      console.log(response.data);
      break;
  }
}

// ✅ CORRECT: Include null as a discriminator value if needed
const GoodWithNull = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
  z.object({ status: z.literal("null") }),
]);
```

### 10.4 Runtime Validation vs TypeScript Types

```typescript
const UnionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]);

// ❌ WRONG: TypeScript allows this at compile time, but Zod validates at runtime
const invalidData = { status: "success" as const, data: 123 };
UnionSchema.parse(invalidData); // Throws ZodError at runtime!

// ✅ CORRECT: Validate runtime data
const validData = { status: "success" as const, data: "hello" };
UnionSchema.parse(validData); // Passes validation
```

### 10.5 Order of Discriminated Union Members

```typescript
// Zod tries each schema in order, but with discriminatedUnion this doesn't matter much
// since the discriminator uniquely identifies the schema
const UnionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]);

// However, with regular unions, order matters for error messages
const RegularUnion = z.union([
  z.string(),
  z.number(),
]);
```

---

## 11. Performance Considerations

### 11.1 Schema Compilation

```typescript
// Compile schema once for better performance
const compiledSchema = schema.compile();

// Use compiled schema
const result = compiledSchema.parse(data);
```

### 11.2 Discriminated Union vs Regular Union Performance

Discriminated unions are more efficient than regular unions because:

1. **Direct Lookup**: Zod uses the discriminator value to directly select the correct schema
2. **No Backtracking**: Doesn't need to try multiple schemas in sequence
3. **Early Exit**: Fails fast if discriminator value doesn't match any option

```typescript
// ✅ FASTER: Discriminated union (O(1) lookup by discriminator)
const FastSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), value: z.number() }),
  z.object({ type: z.literal("c"), value: z.boolean() }),
]);

// ❌ SLOWER: Regular union (tries each schema in order)
const SlowSchema = z.union([
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), value: z.number() }),
  z.object({ type: z.literal("c"), value: z.boolean() }),
]);
```

### 11.3 Caching Validated Responses

```typescript
interface CacheEntry<T> {
  response: T;
  timestamp: number;
}

function shouldCache<T>(response: T): boolean {
  // Only cache successful responses
  // Implementation depends on your discriminated union structure
  return true;
}
```

---

## 12. Testing Strategies

### 12.1 Unit Test Pattern

```typescript
import { z } from "zod";

describe("AgentResponse validation", () => {
  const TestSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("should validate success response", () => {
    const response = {
      status: "success" as const,
      data: { name: "John", age: 30 },
      error: null,
      metadata: { agentId: "test", timestamp: Date.now() },
    };

    const schema = createAgentResponseSchema(TestSchema);
    const result = schema.parse(response);

    expect(result.status).toBe("success");
    expect(result.data.name).toBe("John");
  });

  it("should reject invalid data", () => {
    const response = {
      status: "success" as const,
      data: { name: 123, age: "invalid" }, // Wrong types
      error: null,
      metadata: { agentId: "test", timestamp: Date.now() },
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

### 12.2 Type Narrowing Tests

```typescript
describe("AgentResponse type narrowing", () => {
  it("should narrow success type correctly", () => {
    const response: AgentResponse = {
      status: "success",
      data: { result: "test" },
      error: null,
      metadata: { agentId: "test", timestamp: Date.now() },
    };

    if (response.status === "success") {
      expect(response.data).toBeDefined();
      // @ts-expect-error - Property 'error' does not exist on success type
      const error = response.error;
    }
  });
});
```

### 12.3 Exhaustiveness Tests

```typescript
describe("Exhaustiveness checking", () => {
  it("should handle all cases", () => {
    function handleResponse(response: AgentResponse) {
      switch (response.status) {
        case "success":
          return response.data;
        case "error":
          throw new Error(response.error?.message || "Unknown error");
        case "pending":
          return null;
        default:
          // TypeScript enforces this never happens
          const exhaustiveCheck: never = response;
          return exhaustiveCheck;
      }
    }
  });
});
```

---

## 13. Groundswell Integration

### 13.1 Current Zod Usage in Groundswell

**Location**: `/home/dustin/projects/groundswell/package.json`

```json
{
  "dependencies": {
    "zod": "^3.23.0",
    "zod-to-json-schema": "^3.23.0"
  }
}
```

**Location**: `/home/dustin/projects/groundswell/src/core/agent.ts:387`

```typescript
// Current usage: Direct validation
const validated = prompt.validateResponse(parsed);
```

### 13.2 Existing Prompt Validation

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

### 13.3 Recommended Integration Pattern

```typescript
// Enhanced validation with discriminated union response
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

    // Step 4: Validate with Zod discriminated union
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return createValidationError(result.error, metadata);
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

## 14. Code Examples

### 14.1 Complete AgentResponse Schema

```typescript
import { z } from "zod";

// Base metadata schema
const AgentResponseMetadataSchema = z.object({
  agentId: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),
  requestId: z.string().optional(),
});

type AgentResponseMetadata = z.infer<typeof AgentResponseMetadataSchema>;

// Error details schema
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  recoverable: z.boolean(),
});

type AgentErrorDetails = z.infer<typeof AgentErrorDetailsSchema>;

// Discriminated union variants
const AgentSuccessSchema = z.object({
  status: z.literal("success"),
  data: z.any(),
  error: z.null(),
  metadata: AgentResponseMetadataSchema.optional(),
});

const AgentErrorSchema = z.object({
  status: z.literal("error"),
  data: z.null(),
  error: AgentErrorDetailsSchema,
  metadata: AgentResponseMetadataSchema.optional(),
});

const AgentPendingSchema = z.object({
  status: z.literal("pending"),
  data: z.null(),
  error: z.null(),
  metadata: AgentResponseMetadataSchema.optional(),
});

// Final discriminated union
const AgentResponseSchema = z.discriminatedUnion("status", [
  AgentSuccessSchema,
  AgentErrorSchema,
  AgentPendingSchema,
]);

export type AgentResponse<T = any> = z.infer<typeof AgentResponseSchema>;
```

### 14.2 Generic AgentResponse Factory

```typescript
function createAgentResponseFactory<T extends z.ZodTypeAny>(dataSchema: T) {
  const SuccessSchema = z.object({
    status: z.literal("success"),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const ErrorSchema = z.object({
    status: z.literal("error"),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion("status", [SuccessSchema, ErrorSchema]);
}

// Usage
const UserResponseFactory = createAgentResponseFactory(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
);

type UserResponse = z.infer<typeof UserResponseFactory>;
```

### 14.3 Event System Schema

```typescript
const UserCreatedEventSchema = z.object({
  eventType: z.literal("user.created"),
  userId: z.string(),
  timestamp: z.number(),
  userData: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

const UserDeletedEventSchema = z.object({
  eventType: z.literal("user.deleted"),
  userId: z.string(),
  timestamp: z.number(),
  reason: z.string(),
});

const UserUpdatedEventSchema = z.object({
  eventType: z.literal("user.updated"),
  userId: z.string(),
  timestamp: z.number(),
  changes: z.record(z.string(), z.any()),
});

const UserEventSchema = z.discriminatedUnion("eventType", [
  UserCreatedEventSchema,
  UserDeletedEventSchema,
  UserUpdatedEventSchema,
]);

type UserEvent = z.infer<typeof UserEventSchema>;

// Type-safe event handler
function handleUserEvent(event: UserEvent) {
  switch (event.eventType) {
    case "user.created":
      console.log(`User created: ${event.userData.name}`);
      break;
    case "user.deleted":
      console.log(`User deleted: ${event.reason}`);
      break;
    case "user.updated":
      console.log(`User updated: ${Object.keys(event.changes).length} changes`);
      break;
  }
}
```

### 14.4 Configuration Schema

```typescript
const DevelopmentConfigSchema = z.object({
  environment: z.literal("development"),
  apiUrl: z.string().url(),
  debugMode: z.literal(true),
  maxRetries: z.number().default(3),
});

const ProductionConfigSchema = z.object({
  environment: z.literal("production"),
  apiUrl: z.string().url(),
  debugMode: z.literal(false),
  maxRetries: z.number().default(1),
  apiKey: z.string(),
});

const TestConfigSchema = z.object({
  environment: z.literal("test"),
  apiUrl: z.string().url(),
  debugMode: z.literal(true),
  maxRetries: z.number().default(0),
  mockResponses: z.boolean().default(true),
});

const AppConfigSchema = z.discriminatedUnion("environment", [
  DevelopmentConfigSchema,
  ProductionConfigSchema,
  TestConfigSchema,
]);

type AppConfig = z.infer<typeof AppConfigSchema>;

// Load and validate config
function loadConfig(configData: unknown): AppConfig {
  const result = AppConfigSchema.safeParse(configData);

  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  return result.data;
}
```

---

## 15. References

### Official Documentation

- **Zod Homepage**: https://zod.dev
- **GitHub Repository**: https://github.com/colinhacks/zod
- **Discriminated Unions**: https://zod.dev/?id=discriminated-unions
- **Unions**: https://zod.dev/?id=unions
- **Type Inference**: https://zod.dev/?id=inference
- **Error Handling**: https://zod.dev/?id=error-handling
- **safeParse()**: https://zod.dev/?id=safeparse
- **Generics**: https://zod.dev/?id=generics
- **Schema Composition**: https://zod.dev/?id=schema-composition
- **Nullable Values**: https://zod.dev/?id=nullable-values

### Groundswell Internal Documentation

- **Existing Discriminated Union Research**: `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M2T1S1/research/01-zod-discriminated-union-research.md`
- **Zod Validation Patterns**: `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/zod-validation-patterns-research.md`
- **safeParse() Guide**: `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/zod-safeParse-validation-guide.md`
- **Current Agent Implementation**: `/home/dustin/projects/groundswell/src/core/agent.ts`
- **Current Prompt Implementation**: `/home/dustin/projects/groundswell/src/core/prompt.ts`

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

3. **zod-to-json-schema** (already in Groundswell)
   - URL: https://github.com/StefanTerdell/zod-to-json-schema
   - Purpose: Convert Zod schemas to JSON Schema formats

---

## Summary

### Key Takeaways

1. **Zod 3.23.0** provides excellent discriminated union support through `z.discriminatedUnion()`
2. **Type Safety**: TypeScript automatically narrows types based on discriminator values
3. **Runtime Validation**: Validates data structure at runtime with detailed error messages
4. **Performance**: More efficient than regular unions due to direct lookup by discriminator
5. **Integration**: Seamlessly integrates with Groundswell's existing Zod usage
6. **Best Practices**: Export both schemas and types, use composition, and prefer `safeParse()` for external data

### Recommended Implementation Strategy

1. Define base schemas for metadata and error details
2. Create discriminated union schemas for status-based responses
3. Implement generic schema factories for reusability
4. Use `safeParse()` for graceful error handling
5. Export both schemas and inferred types
6. Write comprehensive tests for runtime validation and type narrowing

### Next Steps

1. Review existing Groundswell Zod usage patterns
2. Identify opportunities to use discriminated unions
3. Implement discriminated union schemas for AgentResponse types
4. Add comprehensive test coverage
5. Document usage patterns with code examples

---

*Research completed: 2026-01-26*
*Zod version: 3.23.0*
*Groundswell project version: 0.0.4*
