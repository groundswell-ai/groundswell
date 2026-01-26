# Testing Patterns for Discriminated Unions with Refinements in Zod

Research findings on testing patterns for discriminated unions with refinements, based on Zod's official test suite and best practices.

## Table of Contents
1. [Testing Discriminated Unions](#testing-discriminated-unions)
2. [Testing Refinements on Union Variants](#testing-refinements-on-union-variants)
3. [Error Path Validation](#error-path-validation)
4. [Error Code and Message Testing](#error-code-and-message-testing)
5. [Best Practices for Test Organization](#best-practices-for-test-organization)
6. [Comprehensive Coverage Strategies](#comprehensive-coverage-strategies)

---

## 1. Testing Discriminated Unions

### 1.1 Basic Success Case Testing

From Zod's official tests:

```typescript
import { z } from "zod";

test("valid parse - object", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), a: z.string() }),
    z.object({ type: z.literal("b"), b: z.string() }),
  ]);

  expect(schema.parse({ type: "a", a: "abc" })).toEqual({ type: "a", a: "abc" });
});
```

**Pattern**: Always test each discriminator value separately with valid data.

### 1.2 Testing All Discriminator Values

```typescript
test("valid - discriminator value of various primitive types", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("1"), val: z.string() }),
    z.object({ type: z.literal(1), val: z.string() }),
    z.object({ type: z.literal(BigInt(1)), val: z.string() }),
    z.object({ type: z.literal(true), val: z.string() }),
    z.object({ type: z.literal(null), val: z.string() }),
  ]);

  // Test each variant
  expect(schema.parse({ type: "1", val: "val" })).toEqual({ type: "1", val: "val" });
  expect(schema.parse({ type: 1, val: "val" })).toEqual({ type: 1, val: "val" });
  // ... etc
});
```

**Pattern**: Test all possible discriminator values, including edge cases like `null`, `undefined`, numbers, and strings.

---

## 2. Testing Refinements on Union Variants

### 2.1 Refinement on Individual Variant Fields

```typescript
test("refinement on variant field", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("success"),
      value: z.number().refine(val => val > 0, {
        message: "Value must be positive"
      })
    }),
    z.object({
      type: z.literal("error"),
      message: z.string().min(5, "Error message too short")
    })
  ]);

  // Test valid case
  const validResult = schema.safeParse({ type: "success", value: 42 });
  expect(validResult.success).toBe(true);

  // Test refinement failure
  const invalidResult = schema.safeParse({ type: "success", value: -1 });
  expect(invalidResult.success).toBe(false);
  if (!invalidResult.success) {
    expect(invalidResult.error.issues[0].message).toContain("positive");
    expect(invalidResult.error.issues[0].path).toEqual(["value"]);
  }
});
```

### 2.2 Async Refinements in Discriminated Unions

From Zod v4 tests:

```typescript
test("async - valid", async () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("a"),
      a: z.string()
        .refine(async () => true)
        .transform(async (val) => Number(val)),
    }),
    z.object({
      type: z.literal("b"),
      b: z.string(),
    }),
  ]);

  const data = { type: "a", a: "1" };
  const result = await schema.safeParseAsync(data);
  expect(result.data).toEqual({ type: "a", a: 1 });
});
```

**Pattern**: Always use `safeParseAsync` for async refinements and test both success and failure cases.

### 2.3 Nested Refinements

From Zod's nested-refine.test.ts:

```typescript
test("nested refinements", () => {
  const schema = z.object({
    password: z.string().min(1),
    nested: z
      .object({
        confirm: z.string()
          .min(1)
          .refine((value) => value.length > 2, {
            message: "Confirm length should be > 2",
          }),
      })
      .refine(
        (data) => data.confirm === "bar",
        {
          path: ["confirm"],
          error: 'Value must be "bar"',
        }
      ),
  });

  const result = schema.safeParse({
    password: "bar",
    nested: { confirm: "" }
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    // Multiple refinements can fail on the same field
    expect(result.error.issues.length).toBeGreaterThan(1);
  }
});
```

**Pattern**: Test that multiple refinements on the same path all report errors correctly.

---

## 3. Error Path Validation

### 3.1 Discriminator Error Paths

```typescript
test("invalid discriminator value", () => {
  const result = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), a: z.string() }),
    z.object({ type: z.literal("b"), b: z.string() }),
  ]).safeParse({ type: "x", a: "abc" });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["type"]);
    expect(result.error.issues[0].code).toBe("invalid_union");
  }
});
```

**Key Pattern**: Discriminator errors always have path `["type"]` (or whatever your discriminator key is).

### 3.2 Field-Specific Error Paths

```typescript
test("valid discriminator value, invalid data", () => {
  const result = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), a: z.string() }),
    z.object({ type: z.literal("b"), b: z.string() }),
  ]).safeParse({ type: "a", b: "abc" });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["a"]);
    expect(result.error.issues[0].code).toBe("invalid_type");
  }
});
```

**Key Pattern**: When discriminator matches but fields don't, the error path points to the missing/incorrect field.

### 3.3 Custom Error Paths in Refinements

```typescript
test("custom path in refinement", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("match"),
      password: z.string(),
      confirm: z.string(),
    }).refine((val) => val.confirm === val.password, {
      path: ["confirm"], // Custom path
      message: "Passwords don't match"
    }),
    z.object({
      type: z.literal("other"),
      value: z.string()
    })
  ]);

  const result = schema.safeParse({
    type: "match",
    password: "secret",
    confirm: "different"
  });

  if (!result.success) {
    expect(result.error.issues[0].path).toEqual(["confirm"]);
  }
});
```

**Pattern**: Use `path` in refine options to control where the error appears.

---

## 4. Error Code and Message Testing

### 4.1 Testing Error Codes

```typescript
test("error code validation", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("success"),
      count: z.number().int().positive()
    }),
    z.object({
      type: z.literal("error"),
      message: z.string()
    })
  ]);

  const result = schema.safeParse({ type: "success", count: -5 });

  if (!result.success) {
    // Check error code
    expect(result.error.issues[0].code).toBe("too_small");

    // Multiple issues may exist
    const codes = result.error.issues.map(issue => issue.code);
    expect(codes).toContain("too_small");
  }
});
```

### 4.2 Testing Custom Error Messages

```typescript
test("custom error messages", () => {
  const schema = z.discriminatedUnion("status", [
    z.object({
      status: z.literal("active"),
      level: z.number().refine(val => val >= 1, {
        message: "Level must be at least 1"
      })
    }),
    z.object({
      status: z.literal("inactive"),
      reason: z.string()
    })
  ]);

  const result = schema.safeParse({ status: "active", level: 0 });

  if (!result.success) {
    expect(result.error.issues[0].message).toBe("Level must be at least 1");
  }
});
```

### 4.3 Dynamic Error Messages

```typescript
test("dynamic error messages based on value", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("range"),
      value: z.number().refine(
        (val) => val > 0,
        (val) => ({ message: `Value ${val} must be positive` })
      )
    }),
    z.object({
      type: z.literal("other"),
      data: z.string()
    })
  ]);

  const result = schema.safeParse({ type: "range", value: -5 });

  if (!result.success) {
    expect(result.error.issues[0].message).toContain("-5");
  }
});
```

**Pattern**: Use function form of message parameter for dynamic error messages.

---

## 5. Best Practices for Test Organization

### 5.1 Group Tests by Discriminator Value

```typescript
describe("DiscriminatedUnion Schema", () => {
  describe("Variant: success", () => {
    it("should validate with all required fields", () => {
      // Test valid success case
    });

    it("should reject missing required fields", () => {
      // Test missing fields
    });

    it("should enforce refinement rules", () => {
      // Test refinements
    });
  });

  describe("Variant: error", () => {
    it("should validate error variant", () => {
      // Test valid error case
    });

    it("should enforce message constraints", () => {
      // Test string refinements
    });
  });

  describe("Discriminator validation", () => {
    it("should reject invalid discriminator", () => {
      // Test wrong discriminator
    });
  });
});
```

### 5.2 Test Structure Pattern

```typescript
describe("MyDiscriminatedUnion", () => {
  const createSchema = () => z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), value: z.string() }),
    z.object({ type: z.literal("b"), count: z.number() })
  ]);

  describe("valid cases", () => {
    it("variant a", () => {
      const result = createSchema().safeParse({ type: "a", value: "test" });
      expect(result.success).toBe(true);
    });

    it("variant b", () => {
      const result = createSchema().safeParse({ type: "b", count: 42 });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid discriminator", () => {
    it("rejects unknown discriminator", () => {
      const result = createSchema().safeParse({ type: "c", value: "test" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["type"]);
      }
    });
  });

  describe("refinements", () => {
    it("enforces variant-specific rules", () => {
      // Test refinements
    });
  });
});
```

---

## 6. Comprehensive Coverage Strategies

### 6.1 Valid Combination Testing

```typescript
describe("Valid Combinations", () => {
  const testCases = [
    { input: { type: "a", value: "hello" }, description: "valid a variant" },
    { input: { type: "b", count: 100 }, description: "valid b variant" },
    { input: { type: "a", value: "" }, description: "empty string valid" },
    { input: { type: "b", count: 0 }, description: "zero valid" },
  ];

  testCases.forEach(({ input, description }) => {
    it(`should accept: ${description}`, () => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
```

### 6.2 Invalid Combination Testing

```typescript
describe("Invalid Combinations", () => {
  const invalidCases = [
    {
      input: { type: "a", count: 5 },
      expectedPath: ["value"],
      description: "wrong field for variant a"
    },
    {
      input: { type: "b", value: "test" },
      expectedPath: ["count"],
      description: "wrong field for variant b"
    },
    {
      input: { type: "c" },
      expectedPath: ["type"],
      description: "invalid discriminator"
    },
  ];

  invalidCases.forEach(({ input, expectedPath, description }) => {
    it(`should reject: ${description}`, () => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(expectedPath);
      }
    });
  });
});
```

### 6.3 Refinement Coverage Matrix

```typescript
describe("Refinement Coverage", () => {
  describe("Variant A Refinements", () => {
    const refinementTests = [
      {
        field: "value",
        valid: ["hello", "world", "test"],
        invalid: [
          { value: "", expectedMessage: "too_small" },
          { value: "ab", expectedMessage: "too_small" },
        ]
      },
    ];

    refinementTests.forEach(({ field, valid, invalid }) => {
      describe(`field: ${field}`, () => {
        valid.forEach(v => {
          it(`should accept valid value: ${JSON.stringify(v)}`, () => {
            const result = schema.safeParse({ type: "a", [field]: v });
            expect(result.success).toBe(true);
          });
        });

        invalid.forEach(({ value, expectedMessage }) => {
          it(`should reject invalid value: ${JSON.stringify(value)}`, () => {
            const result = schema.safeParse({ type: "a", [field]: value });
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues.some(
                issue => issue.message.includes(expectedMessage)
              )).toBe(true);
            }
          });
        });
      });
    });
  });
});
```

### 6.4 Error Format Validation

```typescript
test("error format matches expected structure", () => {
  const result = schema.safeParse({ type: "invalid" });

  if (!result.success) {
    // Verify error structure
    expect(result.error).toBeInstanceOf(z.ZodError);
    expect(result.error.issues).toBeInstanceOf(Array);
    expect(result.error.issues.length).toBeGreaterThan(0);

    // Check first issue structure
    const issue = result.error.issues[0];
    expect(issue).toHaveProperty("code");
    expect(issue).toHaveProperty("path");
    expect(issue).toHaveProperty("message");

    // Verify path is array
    expect(Array.isArray(issue.path)).toBe(true);
  }
});
```

### 6.5 Using safeParse vs parse

```typescript
describe("Parse Method Comparison", () => {
  it("safeParse returns success object", () => {
    const result = schema.safeParse({ type: "a", value: "test" });
    expect(result).toHaveProperty("success", true);
    if (result.success) {
      expect(result.data).toBeDefined();
    }
  });

  it("parse throws on invalid input", () => {
    expect(() => {
      schema.parse({ type: "invalid" });
    }).toThrow(z.ZodError);
  });

  it("parse returns valid data directly", () => {
    const data = schema.parse({ type: "a", value: "test" });
    expect(data).toEqual({ type: "a", value: "test" });
  });
});
```

---

## Key Takeaways

### Testing Priorities
1. **Test every discriminator value** with valid data
2. **Test invalid discriminator values** to ensure proper error paths
3. **Test each variant's refinements** separately
4. **Test wrong field combinations** (fields from wrong variant)
5. **Verify error paths** point to correct fields
6. **Validate error codes and messages** for user-facing errors

### Common Patterns
- Use `safeParse` for testing error cases
- Use `parse` for testing valid cases (or `safeParse` with success check)
- Always narrow type with `if (!result.success)` when checking errors
- Group tests by variant for clarity
- Use test matrices for comprehensive refinement coverage
- Test both sync and async refinements with appropriate parse methods

### Error Path Expectations
- Discriminator errors: `["type"]` (or your discriminator key)
- Field errors: `["fieldName"]`
- Nested field errors: `["parent", "child", "field"]`
- Refinement errors inherit the path of the refined field unless custom path specified

### Resources
- Zod v3 tests: `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/discriminated-unions.test.ts`
- Zod v4 tests: `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v4/classic/tests/discriminated-unions.test.ts`
- Nested refinement tests: `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v4/classic/tests/nested-refine.test.ts`
- Error handling tests: `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v3/tests/error.test.ts`
- Async refinement tests: `/home/dustin/projects/groundswell/node_modules/.ignored/zod/src/v4/classic/tests/async-refinements.test.ts`
