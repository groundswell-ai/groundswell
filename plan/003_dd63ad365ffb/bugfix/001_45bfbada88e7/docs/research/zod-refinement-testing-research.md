# Zod Refinement Testing Research

## Overview

This document compiles research on testing patterns for Zod validation, specifically focusing on `.superRefine()`, discriminated unions, custom validation errors with `ctx.addIssue()`, and error assertion patterns.

## Sources

### Primary Sources (Zod Source Code Tests)
- `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/refine.test.ts` - Comprehensive refine and superRefine testing examples
- `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/discriminated-unions.test.ts` - Discriminated union testing patterns
- `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/error.test.ts` - Error handling and assertion patterns
- `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/async-refinements.test.ts` - Async refinement testing
- `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v4/classic/tests/nested-refine.test.ts` - Nested refinement patterns

## 1. Testing `.superRefine()` Validation

### Basic Pattern

```typescript
import { z } from "zod";

test("superRefine basic validation", () => {
  const Strings = z.array(z.string()).superRefine((val, ctx) => {
    if (val.length > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 3,
        type: "array",
        inclusive: true,
        exact: true,
        message: "Too many items 😡",
      });
    }

    if (val.length !== new Set(val).size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `No duplicates allowed.`,
      });
    }
  });

  const result = Strings.safeParse(["asfd", "asfd", "asfd", "asfd"]);

  expect(result.success).toEqual(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);
  }

  // Test valid case
  Strings.parse(["asfd", "qwer"]);
});
```

### Async superRefine Pattern

```typescript
test("superRefine async", async () => {
  const Strings = z.array(z.string()).superRefine(async (val, ctx) => {
    if (val.length > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 3,
        type: "array",
        inclusive: true,
        exact: true,
        message: "Too many items 😡",
      });
    }
  });

  const result = await Strings.safeParseAsync(["asfd", "asfd", "asfd", "asfd"]);

  expect(result.success).toEqual(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);
  }

  await Strings.parseAsync(["asfd", "qwer"]);
});
```

### Type Narrowing with superRefine

```typescript
test("superRefine - type narrowing", () => {
  type NarrowType = { type: string; age: number };
  const schema = z
    .object({
      type: z.string(),
      age: z.number(),
    })
    .nullable()
    .superRefine((arg, ctx): arg is NarrowType => {
      if (!arg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cannot be null",
          fatal: true,
        });
        return false;
      }
      return true;
    });

  expect(schema.safeParse({ type: "test", age: 0 }).success).toEqual(true);
  expect(schema.safeParse(null).success).toEqual(false);
});
```

## 2. Custom Validation Errors with `ctx.addIssue()`

### Error Code Types

Common `ZodIssueCode` values:
- `ZodIssueCode.custom` - Custom validation errors
- `ZodIssueCode.too_big` - Value exceeds maximum
- `ZodIssueCode.too_small` - Value below minimum
- `ZodIssueCode.invalid_type` - Type mismatch
- `ZodIssueCode.invalid_union_discriminator` - Discriminated union errors

### Basic addIssue Pattern

```typescript
test("custom validation error", () => {
  const schema = z.string().superRefine((val, ctx) => {
    if (val.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "String must be at least 5 characters",
      });
    }
  });

  const result = schema.safeParse("abc");

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].code).toBe("custom");
    expect(result.error.issues[0].message).toBe("String must be at least 5 characters");
  }
});
```

### Custom Error Path

```typescript
test("custom path in superRefine", () => {
  const schema = z.object({
    password: z.string(),
    confirm: z.string(),
  }).superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords don't match",
        path: ["confirm"], // Custom error path
      });
    }
  });

  const result = schema.safeParse({
    password: "password123",
    confirm: "password456"
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["confirm"]);
    expect(result.error.issues[0].message).toBe("Passwords don't match");
  }
});
```

### Fatal Errors (Abort Further Validation)

```typescript
test("fatal superRefine", () => {
  const Strings = z
    .string()
    .superRefine((val, ctx) => {
      if (val === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "foo",
          fatal: true, // Stop further validation
        });
      }
    })
    .superRefine((val, ctx) => {
      if (val !== " ") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bar",
        });
      }
    });

  const result = Strings.safeParse("");

  expect(result.success).toBe(false);
  if (!result.success) {
    // Only one error because first was fatal
    expect(result.error.issues.length).toEqual(1);
  }
});
```

### Multiple Issues in Single superRefine

```typescript
test("multiple issues in superRefine", () => {
  const schema = z.object({
    email: z.string(),
    age: z.number(),
  }).superRefine((data, ctx) => {
    if (data.age < 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be 18 or older",
        path: ["age"]
      });
    }
    if (!data.email.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid email format",
        path: ["email"]
      });
    }
  });

  const result = schema.safeParse({
    email: "invalid",
    age: 15
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);
  }
});
```

## 3. Testing Discriminated Unions with Refinements

### Basic Discriminated Union Testing

```typescript
test("discriminated union with refinements", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("a"),
      a: z.string(),
    }),
    z.object({
      type: z.literal("b"),
      b: z.string(),
    }),
  ]);

  // Valid cases
  expect(schema.parse({ type: "a", a: "abc" })).toEqual({ type: "a", a: "abc" });
  expect(schema.parse({ type: "b", b: "def" })).toEqual({ type: "b", b: "def" });

  // Invalid discriminator
  const result1 = schema.safeParse({ type: "x", a: "abc" });
  expect(result1.success).toBe(false);
  if (!result1.success) {
    expect(result1.error.issues[0].code).toBe("invalid_union_discriminator");
    expect(result1.error.issues[0].path).toEqual(["type"]);
  }
});
```

### Discriminated Union with Async Refinements

```typescript
test("discriminated union with async refinements", async () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("a"),
      a: z
        .string()
        .refine(async () => true)
        .transform(async (val) => Number(val)),
    }),
    z.object({
      type: z.literal("b"),
      b: z.string(),
    }),
  ]);

  const result = await schema.parseAsync({ type: "a", a: "1" });
  expect(result).toEqual({ type: "a", a: 1 });
});
```

### Discriminated Union with superRefine

```typescript
test("discriminated union with superRefine", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("circle"),
      radius: z.number().positive(),
    }),
    z.object({
      type: z.literal("rectangle"),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  ]).superRefine((data, ctx) => {
    if (data.type === "circle" && data.radius > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Radius must be <= 100",
        path: ["radius"],
      });
    }
    if (data.type === "rectangle" && data.height < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height must be >= 10",
        path: ["height"],
      });
    }
  });

  // Valid circle
  expect(schema.safeParse({ type: "circle", radius: 50 }).success).toBe(true);

  // Invalid circle radius
  const result1 = schema.safeParse({ type: "circle", radius: 150 });
  expect(result1.success).toBe(false);
  if (!result1.success) {
    expect(result1.error.issues[0].message).toContain("<= 100");
  }

  // Invalid rectangle height
  const result2 = schema.safeParse({ type: "rectangle", width: 20, height: 5 });
  expect(result2.success).toBe(false);
});
```

## 4. Error Assertion Patterns

### Basic Error Structure Testing

```typescript
test("error structure assertion", () => {
  const schema = z.number().refine((val) => val > 3, "override");

  try {
    schema.parse(2);
    expect.fail("Should have thrown");
  } catch (err) {
    const zerr: z.ZodError = err as any;
    expect(zerr.issues.length).toEqual(1);
    expect(zerr.issues[0].message).toEqual("override");
    expect(zerr.issues[0].code).toEqual(z.ZodIssueCode.custom);
  }
});
```

### Using safeParse with Assertions

```typescript
test("safeParse with assertions", () => {
  const schema = z.string().min(5);

  const result = schema.safeParse("abc");

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].code).toBe("too_small");
    expect(result.error.issues[0].path).toEqual([]);
    expect(result.error.issues[0].message).toContain("5");
  }
});
```

### Error Path Testing

```typescript
test("error path assertion", () => {
  const schema = z.object({
    nested: z.object({
      value: z.string().min(3),
    }),
  });

  const result = schema.safeParse({ nested: { value: "ab" } });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["nested", "value"]);
    expect(result.error.issues[0].code).toBe("too_small");
  }
});
```

### Multiple Error Assertions

```typescript
test("multiple errors assertion", () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  const result = schema.safeParse({
    email: "invalid",
    age: 15
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);

    const emailError = result.error.issues.find(
      issue => issue.path[0] === "email"
    );
    expect(emailError?.code).toBe("invalid_string");

    const ageError = result.error.issues.find(
      issue => issue.path[0] === "age"
    );
    expect(ageError?.code).toBe("too_small");
  }
});
```

### Formatted Error Testing

```typescript
test("formatted error assertion", () => {
  const schema = z.string().email();

  const result = schema.safeParse("invalid");

  expect(result.success).toBe(false);
  if (!result.success) {
    const formatted = result.error.format();
    expect(formatted._errors).toEqual(["Invalid email"]);
  }
});
```

### Error Code Testing

```typescript
test("error code assertion", () => {
  const schema = z.number().refine((val) => val >= 3, {
    params: { minimum: 3 },
  });

  const result = schema.safeParse(2);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].code).toEqual(z.ZodIssueCode.custom);
    expect(result.error.issues[0].params?.minimum).toEqual(3);
  }
});
```

## 5. Best Practices for Test Structure

### Test Organization Pattern

```typescript
describe("Zod validation schema", () => {
  describe("valid cases", () => {
    it("should accept valid input", () => {
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid cases", () => {
    it("should reject with correct error code", () => {
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("custom");
      }
    });

    it("should reject with correct error path", () => {
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["field"]);
      }
    });

    it("should reject with correct error message", () => {
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("expected text");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle boundary values", () => {
      const result = schema.safeParse(boundaryValue);
      // Test behavior at exact boundary
    });

    it("should handle multiple validation failures", () => {
      const result = schema.safeParse(multipleErrorsInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});
```

### Helper Functions for Testing

```typescript
// Helper to test validation errors
function expectValidationError(
  result: z.SafeParseError<any>,
  code: z.ZodIssueCode,
  path: (string | number)[] = []
) {
  expect(result.success).toBe(false);
  const issue = result.error.issues.find(
    i => i.code === code && JSON.stringify(i.path) === JSON.stringify(path)
  );
  expect(issue).toBeDefined();
  return issue;
}

// Helper to test multiple errors
function expectErrorCount(result: z.SafeParseError<any>, count: number) {
  expect(result.success).toBe(false);
  expect(result.error.issues.length).toBe(count);
}
```

### Test Naming Conventions

- Use descriptive test names: "should reject when field is missing"
- Include the expected outcome: "should add issue to correct path"
- Specify the error condition: "should return custom error code for invalid format"

### Async Testing Pattern

```typescript
describe("async validation", () => {
  it("should handle async refinements", async () => {
    const schema = z.string().refine(async (val) => {
      return val.length > 5;
    });

    const result = await schema.safeParseAsync("short");
    expect(result.success).toBe(false);
  });

  it("should handle multiple async refinements", async () => {
    const schema = z.object({
      field: z.string().refine(async (val) => val.length > 3),
    }).superRefine(async (data, ctx) => {
      if (data.field === "forbidden") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This value is forbidden",
        });
      }
    });

    const result = await schema.safeParseAsync({ field: "forbidden" });
    expect(result.success).toBe(false);
  });
});
```

## 6. Common Patterns for AgentResponse Validation

### Discriminated Union with Type-Specific Validation

```typescript
const AgentResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string(),
  }).superRefine((data, ctx) => {
    if (data.content.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text content cannot be empty",
        path: ["content"],
      });
    }
  }),
  z.object({
    type: z.literal("tool_call"),
    toolName: z.string(),
    parameters: z.record(z.any()),
  }).superRefine((data, ctx) => {
    if (!data.toolName || data.toolName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tool name cannot be empty",
        path: ["toolName"],
      });
    }
  }),
]);
```

### Testing AgentResponse Variants

```typescript
describe("AgentResponse validation", () => {
  describe("text type", () => {
    it("should accept valid text response", () => {
      const result = AgentResponseSchema.safeParse({
        type: "text",
        content: "Hello, world!"
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty text content", () => {
      const result = AgentResponseSchema.safeParse({
        type: "text",
        content: "   "
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["content"]);
        expect(result.error.issues[0].message).toContain("empty");
      }
    });
  });

  describe("tool_call type", () => {
    it("should accept valid tool call", () => {
      const result = AgentResponseSchema.safeParse({
        type: "tool_call",
        toolName: "search",
        parameters: { query: "test" }
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty tool name", () => {
      const result = AgentResponseSchema.safeParse({
        type: "tool_call",
        toolName: "",
        parameters: {}
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["toolName"]);
      }
    });
  });
});
```

## 7. Advanced Patterns

### Chained Refinements

```typescript
test("chained refinements", () => {
  const schema = z
    .object({
      length: z.number(),
      size: z.number(),
    })
    .refine(({ length }) => length > 5, {
      path: ["length"],
      message: "length greater than 5",
    })
    .refine(({ size }) => size > 7, {
      path: ["size"],
      message: "size greater than 7",
    });

  const result = schema.safeParse({ length: 4, size: 3 });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.length).toEqual(2);
  }
});
```

### Conditional Validation Based on Discriminator

```typescript
test("conditional validation in discriminated union", () => {
  const schema = z.discriminatedUnion("category", [
    z.object({
      category: z.literal("premium"),
      features: z.array(z.string()),
    }).superRefine((data, ctx) => {
      if (data.features.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Premium accounts must have at least 5 features",
          path: ["features"],
        });
      }
    }),
    z.object({
      category: z.literal("basic"),
      features: z.array(z.string()),
    }).superRefine((data, ctx) => {
      if (data.features.length > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Basic accounts cannot have more than 2 features",
          path: ["features"],
        });
      }
    }),
  ]);

  // Test premium with insufficient features
  const result1 = schema.safeParse({
    category: "premium",
    features: ["a", "b"]
  });
  expect(result1.success).toBe(false);
});
```

### Cross-Field Validation with superRefine

```typescript
test("cross-field validation", () => {
  const schema = z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

  const result = schema.safeParse({
    startDate: new Date("2024-01-01"),
    endDate: new Date("2023-01-01")
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["endDate"]);
  }
});
```

## Summary

### Key Testing Principles

1. **Always use `safeParse()` or `safeParseAsync()`** for better error inspection
2. **Check `result.success` first** before accessing error properties
3. **Assert error structure comprehensively**: code, path, message, and params
4. **Test both success and failure cases** for each validation rule
5. **Test boundary conditions** (min/max values, empty strings, etc.)
6. **Test multiple validation failures** to ensure all errors are reported
7. **Use discriminated unions** for type-safe variant testing
8. **Leverage `superRefine`** for complex, multi-field, or conditional validation
9. **Use `fatal: true`** to abort validation on critical errors
10. **Organize tests by variant** when working with discriminated unions

### Common Pitfalls to Avoid

- Not narrowing the type after checking `result.success === false`
- Forgetting to test the error path in nested objects
- Not testing async refinements with `async`/`await`
- Overlooking the need to test multiple simultaneous errors
- Not using discriminated unions for variant types
- Forgetting to test boundary conditions

### Recommended Test Structure for Discriminated Unions with Refinements

```typescript
describe("SchemaName", () => {
  describe("VariantA", () => {
    it("valid input", () => { /* ... */ });
    it("invalid field X", () => { /* ... */ });
    it("refinement failure Y", () => { /* ... */ });
  });

  describe("VariantB", () => {
    it("valid input", () => { /* ... */ });
    it("invalid field Z", () => { /* ... */ });
    it("refinement failure W", () => { /* ... */ });
  });

  describe("discriminator errors", () => {
    it("invalid discriminator", () => { /* ... */ });
    it("missing discriminator", () => { /* ... */ });
  });
});
```
