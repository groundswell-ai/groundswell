# Zod 3.23.0 Discriminated Union Research

**Research Date:** 2025-01-24
**Focus:** Authoritative information for implementing AgentResponse type schemas
**Zod Version:** 3.23.0

## Table of Contents

1. [Discriminated Unions](#1-discriminated-unions)
2. [Null Handling](#2-null-handling)
3. [Generic Schema Factories](#3-generic-schema-factories)
4. [Schema Composition Patterns](#4-schema-composition-patterns)
5. [Common Gotchas](#5-common-gotchas)
6. [Actionable Recommendations](#6-actionable-recommendations)

---

## 1. Discriminated Unions

### Official Documentation URLs

**Primary Sources:**
- Zod Official Docs: https://zod.dev
- GitHub Repository: https://github.com/colinhacks/zod
- Specific Sections (direct anchors):
  - Unions: `https://zod.dev/?id=unions`
  - Discriminated Unions: `https://zod.dev/?id=discriminated-unions`

### Core Concept

`z.discriminatedUnion()` creates type-safe unions based on a discriminator field that TypeScript can use for type narrowing. This is superior to regular unions for status-based patterns because:

1. **Type Safety**: TypeScript automatically narrows types based on the discriminator
2. **Exhaustiveness Checking**: Ensures all cases are handled
3. **Performance**: More efficient validation than regular unions
4. **Developer Experience**: Better IntelliSense and autocomplete

### Basic Pattern

```typescript
import { z } from "zod";

// Define schemas for different states
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
});

// Create a discriminated union
const ResultSchema = z.discriminatedUnion("status", [
  SuccessSchema,
  ErrorSchema,
  PendingSchema,
]);

type Result = z.infer<typeof ResultSchema>;
// Result type:
// { status: "success"; data: string } |
// { status: "error"; error: string } |
// { status: "pending" }
```

### Status-Based Type Narrowing Example

```typescript
function handleResult(result: Result) {
  switch (result.status) {
    case "success":
      // TypeScript knows this is SuccessSchema
      console.log(result.data); // ✅ Type-safe
      // result.error; // ❌ Type error: Property doesn't exist
      break;
    case "error":
      // TypeScript knows this is ErrorSchema
      console.log(result.error); // ✅ Type-safe
      // result.data; // ❌ Type error: Property doesn't exist
      break;
    case "pending":
      // TypeScript knows this is PendingSchema
      console.log("Still processing...");
      break;
  }
}
```

### Requirements for Discriminated Unions

1. **Common Discriminator Field**: All schemas must share the same field name
2. **Literal Values**: The discriminator field must use `z.literal()` with unique values
3. **Uniqueness**: Each literal value must be unique across all schemas
4. **Object Schemas**: All members must be object schemas

### Invalid Example

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

## 2. Null Handling

### Official Documentation URLs

- Nullable Values: `https://zod.dev/?id=nullable-values`
- Optional Values: `https://zod.dev/?id=optional-values`

### z.null() vs z.undefined()

**`z.null()`**
- Validates that the value is exactly `null`
- Rejects `undefined` and all other values
- Example: `z.null().parse(null)` ✓, `z.null().parse(undefined)` ✗

**`z.undefined()`**
- Validates that the value is exactly `undefined`
- Rejects `null` and all other values
- Example: `z.undefined().parse(undefined)` ✓, `z.undefined().parse(null)` ✗

### Null Handling Modifiers

**`.nullable()` - Allows null**
```typescript
const schema1 = z.string().nullable();
// Type: string | null

schema1.parse("hello"); // ✓
schema1.parse(null);    // ✓
schema1.parse(undefined); // ✗
```

**`.nullish()` - Allows null OR undefined**
```typescript
const schema2 = z.string().nullish();
// Type: string | null | undefined

schema2.parse("hello"); // ✓
schema2.parse(null);    // ✓
schema2.parse(undefined); // ✓
```

**`.optional()` - Allows undefined only**
```typescript
const schema3 = z.string().optional();
// Type: string | undefined

schema3.parse("hello"); // ✓
schema3.parse(undefined); // ✓
schema3.parse(null);    // ✗
```

### PRD Requirement: Null Over Undefined

For the Groundswell project PRD requirement of **null-over-undefined**:

**Preferred Pattern:**
```typescript
// ✅ PREFERRED: Use .nullable() for optional fields
const AgentResponseSchema = z.object({
  status: z.string(),
  data: z.string().nullable(), // string | null
  error: z.string().nullable(), // string | null
});

// ❌ AVOID: Using .optional() or .nullish()
const AvoidSchema = z.object({
  data: z.string().optional(), // string | undefined
});
```

**Rationale:**
1. **Explicit Semantics**: `null` clearly indicates "no value" vs "not provided"
2. **JSON Compatibility**: JSON supports `null` natively, `undefined` becomes omitted
3. **Database Consistency**: Most databases use `NULL` for missing values
4. **API Consistency**: REST APIs typically use `null` for null fields

### Union with null

```typescript
// Explicit union with null
const schema4 = z.union([z.string(), z.null()]);
// Type: string | null

// Equivalent to .nullable()
const schema5 = z.string().nullable();
// Type: string | null
```

---

## 3. Generic Schema Factories

### Official Documentation URLs

- Generics: `https://zod.dev/?id=generics`
- Schema Composition: `https://zod.dev/?id=schema-composition`

### Creating Reusable Generic Schema Factories

**Basic Generic Factory Pattern:**

```typescript
import { z } from "zod";

// Generic schema factory
function createResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    timestamp: z.string().datetime(),
  });
}

// Usage with different types
const UserResponseSchema = createResponseSchema(
  z.object({
    id: z.number(),
    name: z.string(),
  })
);

const PostResponseSchema = createResponseSchema(
  z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
  })
);

type UserResponse = z.infer<typeof UserResponseSchema>;
type PostResponse = z.infer<typeof PostResponseSchema>;
```

### Advanced Generic Factory for AgentResponse

```typescript
// AgentResponse<T> schema factory
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
const AgentResponseSchema = createAgentResponseSchema(
  z.object({
    result: z.string(),
    confidence: z.number(),
  })
);

type AgentResponse = z.infer<typeof AgentResponseSchema>;
```

### Generic Factory with Multiple Type Parameters

```typescript
function createDualResponseSchema<
  TData extends z.ZodTypeAny,
  TError extends z.ZodTypeAny
>(dataSchema: TData, errorSchema: TError) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: errorSchema.nullable(),
  });
}

// Usage
const ComplexResponseSchema = createDualResponseSchema(
  z.object({ id: z.number(), value: z.string() }),
  z.object({ code: z.number(), message: z.string() })
);
```

---

## 4. Schema Composition Patterns

### Official Documentation URLs

- Object Methods: `https://zod.dev/?id=object-methods`
- Schema Composition: `https://zod.dev/?id=schema-composition`

### Core Composition Methods

**1. `.extend()` - Add properties to object schemas**

```typescript
const BasePersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const EmployeeSchema = BasePersonSchema.extend({
  employeeId: z.string(),
  department: z.string(),
});

type Employee = z.infer<typeof EmployeeSchema>;
// { name: string; age: number; employeeId: string; department: string; }
```

**2. `.merge()` - Combine two object schemas**

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string(),
});

const PersonWithAddressSchema = BasePersonSchema.merge(AddressSchema);

type PersonWithAddress = z.infer<typeof PersonWithAddressSchema>;
// { name: string; age: number; street: string; city: string; zipCode: string; }
```

**3. `.pick()` - Select specific properties**

```typescript
const PublicPersonSchema = BasePersonSchema.pick({
  name: true,
  // age is excluded
});

type PublicPerson = z.infer<typeof PublicPersonSchema>;
// { name: string; }
```

**4. `.omit()` - Exclude specific properties**

```typescript
const PersonWithoutAgeSchema = BasePersonSchema.omit({
  age: true,
});

type PersonWithoutAge = z.infer<typeof PersonWithoutAgeSchema>;
// { name: string; }
```

**5. `.partial()` - Make all properties optional**

```typescript
const PartialPersonSchema = BasePersonSchema.partial();

type PartialPerson = z.infer<typeof PartialPersonSchema>;
// { name?: string; age?: number; }
```

**6. `.required()` - Make all properties required**

```typescript
const OptionalPersonSchema = z.object({
  name: z.string().optional(),
  age: z.number().optional(),
});

const RequiredPersonSchema = OptionalPersonSchema.required();

type RequiredPerson = z.infer<typeof RequiredPersonSchema>;
// { name: string; age: number; }
```

### Best Practices for Schema Composition

**1. Define Base Schemas First**

```typescript
// ✅ GOOD: Start with base schemas
const AgentMetadataBase = z.object({
  timestamp: z.string().datetime(),
  agentVersion: z.string(),
});

const SuccessMetadataSchema = AgentMetadataBase.extend({
  executionTime: z.number(),
});

const ErrorMetadataSchema = AgentMetadataBase.extend({
  retryable: z.boolean(),
  errorCode: z.string().optional(),
});
```

**2. Use Composition for Reusability**

```typescript
// ✅ GOOD: Compose complex schemas from simple ones
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

const AgentResponseMetadataSchema = z.object({
  timestamp: z.string().datetime(),
  executionTime: z.number().optional(),
  agentVersion: z.string().optional(),
});

const SuccessSchema = z.object({
  status: z.literal("success"),
  data: z.any(),
  metadata: AgentResponseMetadataSchema.optional(),
});

const ErrorSchema = z.object({
  status: z.literal("error"),
  error: AgentErrorDetailsSchema.nullable(),
  metadata: AgentResponseMetadataSchema.optional(),
});
```

**3. Name Schema Variables Clearly**

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

**4. Export Both Schemas and Types**

```typescript
// ✅ GOOD: Export both schema and inferred type
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type AgentErrorDetails = z.infer<typeof AgentErrorDetailsSchema>;

// This allows importing just the type when schema isn't needed
import { AgentErrorDetails } from "./schemas";
```

### Complete Example: AgentResponse with Composition

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
  context: z.record(z.string(), z.any()).nullable(),
});

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

---

## 5. Common Gotchas

### Gotcha 1: Discriminated Union with Null Discriminator

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

### Gotcha 2: Nested Discriminated Unions

```typescript
// This works but requires careful type design
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
  inner: InnerUnion,
});

// TypeScript correctly narrows nested unions
function handleOuter(outer: z.infer<typeof OuterSchema>) {
  if (outer.inner.type === "inner_success") {
    console.log(outer.inner.value); // Type-safe
  }
}
```

### Gotcha 3: Optional vs Nullable in Discriminated Unions

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

### Gotcha 4: Mixing nullable() with discriminatedUnion

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

### Gotcha 5: Runtime Validation vs TypeScript Types

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

### Gotcha 6: Order of Discriminated Union Members

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

## 6. Actionable Recommendations

### For AgentResponse Implementation

**1. Use Discriminated Unions for Status Types**

```typescript
// ✅ RECOMMENDED: Discriminated union for AgentResponse
const AgentResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    data: z.any(),
    metadata: AgentResponseMetadataSchema.optional(),
  }),
  z.object({
    status: z.literal("error"),
    error: AgentErrorDetailsSchema.nullable(),
    metadata: AgentResponseMetadataSchema.optional(),
  }),
  z.object({
    status: z.literal("pending"),
    metadata: AgentResponseMetadataSchema.optional(),
  }),
]);
```

**2. Follow PRD: Use `.nullable()` for Optional Fields**

```typescript
// ✅ RECOMMENDED: Use nullable for optional fields
const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().nullable(), // string | null
  context: z.record(z.string(), z.any()).nullable(), // Record<string, any> | null
});
```

**3. Create Reusable Schema Factories**

```typescript
// ✅ RECOMMENDED: Generic factory for typed responses
function createAgentResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T
) {
  const SuccessSchema = z.object({
    status: z.literal("success"),
    data: dataSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const ErrorSchema = z.object({
    status: z.literal("error"),
    error: AgentErrorDetailsSchema.nullable(),
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion("status", [SuccessSchema, ErrorSchema]);
}
```

**4. Compose Schemas Hierarchically**

```typescript
// ✅ RECOMMENDED: Start with base schemas
const BaseMetadataSchema = z.object({
  timestamp: z.string().datetime(),
  agentVersion: z.string(),
});

// Extend for specific use cases
const SuccessMetadataSchema = BaseMetadataSchema.extend({
  executionTime: z.number(),
});

const ErrorMetadataSchema = BaseMetadataSchema.extend({
  retryable: z.boolean(),
});
```

**5. Export Both Schemas and Types**

```typescript
// ✅ RECOMMENDED: Export both
export const AgentResponseSchema = z.discriminatedUnion("status", [...]);
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
```

**6. Use Exhaustiveness Checking**

```typescript
// ✅ RECOMMENDED: Ensure all cases are handled
function handleAgentResponse(response: AgentResponse) {
  switch (response.status) {
    case "success":
      return response.data;
    case "error":
      throw new Error(response.error?.message || "Unknown error");
    case "pending":
      return null;
    default:
      // TypeScript enforces exhaustiveness
      const exhaustiveCheck: never = response;
      return exhaustiveCheck;
  }
}
```

### Testing Strategy

**1. Test Runtime Validation**

```typescript
describe("AgentResponseSchema", () => {
  it("should validate success responses", () => {
    const input = {
      status: "success" as const,
      data: { result: "test" },
    };
    expect(() => AgentResponseSchema.parse(input)).not.toThrow();
  });

  it("should validate error responses", () => {
    const input = {
      status: "error" as const,
      error: { code: "ERR_001", message: "Test error" },
    };
    expect(() => AgentResponseSchema.parse(input)).not.toThrow();
  });

  it("should reject invalid status", () => {
    const input = {
      status: "invalid" as const,
      data: {},
    };
    expect(() => AgentResponseSchema.parse(input)).toThrow();
  });
});
```

**2. Test Type Narrowing**

```typescript
describe("AgentResponse type narrowing", () => {
  it("should narrow success type correctly", () => {
    const response: AgentResponse = {
      status: "success",
      data: { result: "test" },
    };

    if (response.status === "success") {
      expect(response.data).toBeDefined();
      // @ts-expect-error - Property 'error' does not exist
      const error = response.error;
    }
  });
});
```

---

## Summary

### Key Takeaways

1. **Discriminated Unions**: Use `z.discriminatedUnion()` for status-based type narrowing with literal discriminators
2. **Null Handling**: Follow PRD by using `.nullable()` instead of `.optional()` for optional fields
3. **Generic Factories**: Create reusable schema factories with generic type parameters for type-safe responses
4. **Schema Composition**: Use `.extend()`, `.merge()`, `.pick()`, and `.omit()` to build complex schemas from simple ones
5. **Type Safety**: Export both schemas and inferred types for maximum flexibility
6. **Testing**: Validate both runtime behavior and compile-time type safety

### Recommended Documentation Bookmarks

- Zod Home: https://zod.dev
- Discriminated Unions: `https://zod.dev/?id=discriminated-unions`
- Nullable Values: `https://zod.dev/?id=nullable-values`
- Generics: `https://zod.dev/?id=generics`
- Object Methods: `https://zod.dev/?id=object-methods`
- Schema Composition: `https://zod.dev/?id=schema-composition`

### Next Steps

1. Implement `AgentResponseSchema` using discriminated union pattern
2. Create generic `createAgentResponseSchema<T>()` factory
3. Define base schemas for metadata and error details
4. Add comprehensive tests for runtime validation and type narrowing
5. Document usage patterns with code examples
