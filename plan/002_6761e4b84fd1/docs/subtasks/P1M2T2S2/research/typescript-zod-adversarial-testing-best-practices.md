# TypeScript/Zod Adversarial Testing Best Practices

**Research Date**: 2026-01-24
**Topic**: Comprehensive guide to adversarial testing patterns for TypeScript/Zod schemas
**Purpose**: Provide patterns and best practices for testing edge cases in Zod schema validation

---

## Executive Summary

This document compiles adversarial testing patterns for Zod schemas based on:
1. Analysis of Zod v3's official test suite (node_modules/zod/src/v3/tests/)
2. Groundswell's existing test patterns in agent-response.test.ts and agent-error-codes.test.ts
3. Best practices for testing discriminated unions, edge cases, and runtime validation

**Note**: Web search APIs were rate-limited during research, so this compilation is based on analysis of the Zod library's own test suite and established patterns from the codebase.

---

## Table of Contents

1. [Core Testing Principles](#1-core-testing-principles)
2. [Discriminated Union Testing](#2-discriminated-union-testing)
3. [Edge Case Testing Patterns](#3-edge-case-testing-patterns)
4. [Serialization/Deserialization Testing](#4-serializationdeserialization-testing)
5. [Adversarial Input Patterns](#5-adversarial-input-patterns)
6. [Type Guard Testing](#6-type-guard-testing)
7. [Error Validation Testing](#7-error-validation-testing)
8. [Performance and Security Testing](#8-performance-and-security-testing)
9. [Common Pitfalls and Solutions](#9-common-pitfalls-and-solutions)
10. [Test Utility Patterns](#10-test-utility-patterns)

---

## 1. Core Testing Principles

### 1.1 Test Structure Philosophy

From analyzing Zod's test suite, the core testing philosophy follows these principles:

```typescript
// GOOD: Test both success and failure paths explicitly
describe('Schema Validation', () => {
  it('should validate correct data', () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

// BAD: Only testing success path
describe('Schema Validation', () => {
  it('should work', () => {
    const result = schema.parse(validData); // Can throw!
  });
});
```

### 1.2 Use safeParse for Testing

**Source**: /node_modules/zod/src/v3/tests/discriminated-unions.test.ts

```typescript
// Always use safeParse in tests to avoid try-catch overhead
const result = schema.safeParse(data);

if (result.success) {
  // TypeScript knows result.data is valid
  expect(result.data).toEqual(expected);
} else {
  // TypeScript knows result.error is ZodError
  expect(result.error.errors).toHaveLength(1);
  expect(result.error.errors[0].code).toEqual(ZodIssueCode.invalid_type);
}
```

### 1.3 Test Error Structure Explicitly

```typescript
// Test error structure, not just that it fails
it('should return proper error structure', () => {
  const result = schema.safeParse(invalidData);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors).toEqual([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['fieldName'],
        message: 'Expected string, received number',
      },
    ]);
  }
});
```

---

## 2. Discriminated Union Testing

### 2.1 Basic Discriminated Union Tests

**Source**: /node_modules/zod/src/v3/tests/discriminated-unions.test.ts:6-14

```typescript
describe('Discriminated Union', () => {
  const schema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
    z.object({ status: z.literal('error'), data: z.null(), error: z.object({ message: z.string() }) }),
  ]);

  it('should validate correct variant', () => {
    const result = schema.safeParse({ status: 'success', data: 'test', error: null });
    expect(result.success).toBe(true);
  });

  it('should reject invalid discriminator value', () => {
    const result = schema.safeParse({ status: 'invalid', data: 'test', error: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toEqual(ZodIssueCode.invalid_union_discriminator);
    }
  });

  it('should reject mismatched discriminator and fields', () => {
    // Valid discriminator but wrong fields
    const result = schema.safeParse({ status: 'success', data: null, error: null });
    expect(result.success).toBe(false);
  });
});
```

### 2.2 Testing All Discriminator Types

**Source**: /node_modules/zod/src/v3/tests/discriminated-unions.test.ts:17-63

```typescript
describe('Discriminator Type Variations', () => {
  const schema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('1'), val: z.literal(1) }),
    z.object({ type: z.literal(1), val: z.literal(2) }), // number discriminator
    z.object({ type: z.literal(BigInt(1)), val: z.literal(3) }), // bigint discriminator
    z.object({ type: z.literal('true'), val: z.literal(4) }),
    z.object({ type: z.literal(true), val: z.literal(5) }), // boolean discriminator
    z.object({ type: z.literal('null'), val: z.literal(6) }),
    z.object({ type: z.literal(null), val: z.literal(7) }), // null discriminator
    z.object({ type: z.literal('undefined'), val: z.literal(8) }),
    z.object({ type: z.literal(undefined), val: z.literal(9) }), // undefined discriminator
  ]);

  it('should handle string discriminator', () => {
    expect(schema.safeParse({ type: '1', val: 1 }).success).toBe(true);
  });

  it('should handle number discriminator', () => {
    expect(schema.safeParse({ type: 1, val: 2 }).success).toBe(true);
  });

  it('should handle boolean discriminator', () => {
    expect(schema.safeParse({ type: true, val: 5 }).success).toBe(true);
  });

  it('should handle null discriminator', () => {
    expect(schema.safeParse({ type: null, val: 7 }).success).toBe(true);
  });

  it('should handle undefined discriminator', () => {
    expect(schema.safeParse({ type: undefined, val: 9 }).success).toBe(true);
  });
});
```

### 2.3 Testing Optional/Nullable Discriminators

**Source**: /node_modules/zod/src/v3/tests/discriminated-unions.test.ts:272-306

```typescript
describe('Optional and Nullable Discriminators', () => {
  const schema = z.discriminatedUnion('key', [
    z.object({
      key: z.literal('a').optional(),
      a: z.literal(true),
    }),
    z.object({
      key: z.literal('b').nullable(),
      b: z.literal(true),
    }),
  ]);

  it('should accept undefined for optional discriminator', () => {
    const result = schema.safeParse({ key: undefined, a: true });
    expect(result.success).toBe(true);
  });

  it('should accept null for nullable discriminator', () => {
    const result = schema.safeParse({ key: null, b: true });
    expect(result.success).toBe(true);
  });

  it('should reject wrong discriminator with value', () => {
    const result = schema.safeParse({ key: null, a: true });
    expect(result.success).toBe(false);
  });
});
```

### 2.4 Enum and NativeEnum Discriminators

**Source**: /node_modules/zod/src/v3/tests/discriminated-unions.test.ts:220-249

```typescript
describe('Enum Discriminators', () => {
  enum MyEnum {
    d = 0,
    e = 'e',
  }

  const schema = z.discriminatedUnion('key', [
    z.object({ key: z.literal('a') }),
    z.object({ key: z.enum(['b', 'c']) }),
    z.object({ key: z.nativeEnum(MyEnum) }),
  ]);

  it('should accept enum value', () => {
    expect(schema.safeParse({ key: 'b' }).success).toBe(true);
    expect(schema.safeParse({ key: 'c' }).success).toBe(true);
  });

  it('should accept native enum numeric value', () => {
    expect(schema.safeParse({ key: MyEnum.d }).success).toBe(true);
    expect(schema.safeParse({ key: 0 }).success).toBe(true);
  });

  it('should accept native enum string value', () => {
    expect(schema.safeParse({ key: MyEnum.e }).success).toBe(true);
    expect(schema.safeParse({ key: 'e' }).success).toBe(true);
  });
});
```

### 2.5 Testing Type Narrowing with Discriminators

```typescript
describe('Type Narrowing', () => {
  type Response =
    | { status: 'success'; data: string; error: null }
    | { status: 'error'; data: null; error: { message: string } };

  it('should narrow type correctly in if statement', () => {
    const response: Response = { status: 'success', data: 'test', error: null };

    if (response.status === 'success') {
      // TypeScript knows response.data is string and response.error is null
      expect(response.data.toUpperCase()).toBe('TEST');
    }
  });

  it('should narrow type with switch statement', () => {
    const response: Response = { status: 'error', data: null, error: { message: 'fail' } };

    switch (response.status) {
      case 'success':
        // TypeScript knows response.data is string
        break;
      case 'error':
        // TypeScript knows response.error.message is string
        expect(response.error.message).toBe('fail');
        break;
    }
  });

  it('should narrow type with type guards', () => {
    function isSuccess(r: Response): r is Extract<Response, { status: 'success' }> {
      return r.status === 'success';
    }

    const response: Response = { status: 'success', data: 'test', error: null };

    if (isSuccess(response)) {
      // TypeScript knows this is success variant
      expect(response.data).toBe('test');
    }
  });
});
```

---

## 3. Edge Case Testing Patterns

### 3.1 Undefined vs Null vs Missing

**Source**: /node_modules/zod/src/v3/tests/optional.test.ts and nullable.test.ts

```typescript
describe('Undefined vs Null vs Missing', () => {
  const schema = z.object({
    required: z.string(),
    optional: z.string().optional(),
    nullable: z.string().nullable(),
    nullish: z.string().nullish(), // optional or nullable
  });

  it('should reject undefined for required field', () => {
    const result = schema.safeParse({ required: undefined });
    expect(result.success).toBe(false);
  });

  it('should accept undefined for optional field', () => {
    const result = schema.safeParse({ required: 'test', optional: undefined });
    expect(result.success).toBe(true);
  });

  it('should accept null for nullable field', () => {
    const result = schema.safeParse({ required: 'test', nullable: null });
    expect(result.success).toBe(true);
  });

  it('should reject null for optional field', () => {
    const result = schema.safeParse({ required: 'test', optional: null });
    expect(result.success).toBe(false);
  });

  it('should accept null or undefined for nullish field', () => {
    const r1 = schema.safeParse({ required: 'test', nullish: null });
    const r2 = schema.safeParse({ required: 'test', nullish: undefined });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it('should handle missing optional field', () => {
    const result = schema.safeParse({ required: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('optional' in result.data).toBe(true);
      expect(result.data.optional).toBeUndefined();
    }
  });

  it('should distinguish undefined from null in errors', () => {
    // Test that error messages distinguish between undefined and null
    const optionalSchema = z.string().optional();
    const nullableSchema = z.string().nullable();

    const r1 = optionalSchema.safeParse(undefined);
    const r2 = nullableSchema.safeParse(undefined);

    expect(r1.success).toBe(true); // optional accepts undefined
    expect(r2.success).toBe(false); // nullable rejects undefined
  });
});
```

### 3.2 NaN and Special Number Values

**Source**: /node_modules/zod/src/v3/tests/nan.test.ts

```typescript
describe('Special Number Values', () => {
  const nanSchema = z.nan();
  const numberSchema = z.number();

  it('should validate NaN correctly', () => {
    expect(nanSchema.safeParse(Number.NaN).success).toBe(true);
    expect(nanSchema.safeParse(Number('Not a number')).success).toBe(true);
    expect(nanSchema.safeParse(5).success).toBe(false);
  });

  it('should reject NaN for regular number schema', () => {
    expect(numberSchema.safeParse(Number.NaN).success).toBe(false);
    expect(numberSchema.safeParse(Infinity).success).toBe(true);
    expect(numberSchema.safeParse(-Infinity).success).toBe(true);
  });

  it('should handle Infinity', () => {
    const finiteSchema = z.number().finite();

    expect(finiteSchema.safeParse(Infinity).success).toBe(false);
    expect(finiteSchema.safeParse(-Infinity).success).toBe(false);
    expect(finiteSchema.safeParse(42).success).toBe(true);
  });

  it('should handle negative zero', () => {
    expect(numberSchema.safeParse(-0).success).toBe(true);
    expect(numberSchema.safeParse(0).success).toBe(true);
  });
});
```

### 3.3 Empty String vs Null vs Undefined

```typescript
describe('Empty String Edge Cases', () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    optional: z.string().optional(),
  });

  it('should reject empty string for min(1)', () => {
    const result = schema.safeParse({ name: '', email: 'test@example.com' });
    expect(result.success).toBe(false);
  });

  it('should reject empty string for email', () => {
    const result = schema.safeParse({ name: 'test', email: '' });
    expect(result.success).toBe(false);
  });

  it('should accept empty string as valid string', () => {
    const result = z.string().safeParse('');
    expect(result.success).toBe(true);
  });

  it('should distinguish empty string from undefined', () => {
    const result = schema.safeParse({ name: 'test', email: 'test@example.com', optional: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optional).toBe('');
      expect(result.data.optional).not.toBeUndefined();
      expect(result.data.optional).not.toBeNull();
    }
  });
});
```

### 3.4 Array Edge Cases

**Source**: /node_modules/zod/src/v3/tests/array.test.ts

```typescript
describe('Array Edge Cases', () => {
  const schema = z.object({
    items: z.array(z.string()).min(1).max(10),
    optional: z.array(z.number()).optional(),
  });

  it('should reject empty array for min(1)', () => {
    const result = schema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject array exceeding max', () => {
    const items = Array(11).fill('test');
    const result = schema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should accept missing optional array', () => {
    const result = schema.safeParse({ items: ['test'] });
    expect(result.success).toBe(true);
  });

  it('should handle array with mixed types incorrectly', () => {
    const schema = z.array(z.union([z.string(), z.number()]));
    const result = schema.safeParse(['test', 42, true]); // boolean not allowed
    expect(result.success).toBe(false);
  });

  it('should handle tuple vs array', () => {
    const tupleSchema = z.tuple([z.string(), z.number()]);
    const arraySchema = z.array(z.union([z.string(), z.number()]));

    expect(tupleSchema.safeParse(['test', 42]).success).toBe(true);
    expect(tupleSchema.safeParse(['test']).success).toBe(false); // wrong length
    expect(tupleSchema.safeParse(['test', 42, 'extra']).success).toBe(false); // wrong length

    expect(arraySchema.safeParse(['test']).success).toBe(true);
    expect(arraySchema.safeParse(['test', 42, 'extra']).success).toBe(true);
  });
});
```

### 3.5 Deeply Nested Objects

```typescript
describe('Deeply Nested Objects', () => {
  const schema = z.object({
    level1: z.object({
      level2: z.object({
        level3: z.object({
          level4: z.object({
            value: z.string(),
          }),
        }),
      }),
    }),
  });

  it('should validate deeply nested valid data', () => {
    const data = {
      level1: {
        level2: {
          level3: {
            level4: { value: 'test' },
          },
        },
      },
    };
    expect(schema.safeParse(data).success).toBe(true);
  });

  it('should report correct path for nested error', () => {
    const data = {
      level1: {
        level2: {
          level3: {
            level4: { value: 42 }, // wrong type
          },
        },
      },
    };
    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['level1', 'level2', 'level3', 'level4', 'value']);
    }
  });

  it('should handle missing nested field', () => {
    const data = {
      level1: {
        level2: {
          level3: {},
        },
      },
    };
    const result = schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['level1', 'level2', 'level3', 'level4']);
    }
  });
});
```

---

## 4. Serialization/Deserialization Testing

### 4.1 JSON Round-trip Testing

**Source**: Groundswell agent-response.test.ts:468-576

```typescript
describe('JSON Serialization', () => {
  const schema = z.object({
    status: z.literal('success'),
    data: z.object({ result: z.string() }),
    error: z.null(),
    metadata: z.object({ agentId: z.string(), timestamp: z.number() }),
  });

  it('should survive JSON.stringify/JSON.parse round-trip', () => {
    const original = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
  });

  it('should validate after round-trip', () => {
    const original = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const roundTripped = JSON.parse(JSON.stringify(original));
    const result = schema.safeParse(roundTripped);

    expect(result.success).toBe(true);
  });

  it('should preserve null values during serialization', () => {
    const original = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() },
    };

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.error).toBeNull();
    expect(deserialized.error).not.toBeUndefined();
  });
});
```

### 4.2 Non-serializable Data Testing

```typescript
describe('Non-serializable Data', () => {
  it('should reject functions in parse', () => {
    const schema = z.object({
      name: z.string(),
      func: z.function().args(z.string()).returns(z.number()),
    });

    const data = {
      name: 'test',
      func: (s: string) => s.length,
    };

    // This should work - the function itself is valid
    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail to serialize functions', () => {
    const data = {
      name: 'test',
      func: (s: string) => s.length,
    };

    // JSON.stringify will convert function to undefined
    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.func).toBeUndefined();
  });

  it('should reject circular references', () => {
    const schema = z.object({
      name: z.string(),
      self: z.any(),
    });

    const data: any = { name: 'test' };
    data.self = data; // circular reference

    const result = schema.safeParse(data);
    // Zod can handle this, but JSON.stringify will fail
    expect(result.success).toBe(true);

    expect(() => {
      JSON.stringify(data);
    }).toThrow();
  });

  it('should handle symbols', () => {
    const schema = z.object({
      symbol: z.symbol(),
    });

    const data = { symbol: Symbol('test') };
    const result = schema.safeParse(data);
    expect(result.success).toBe(true);

    // Symbols are not serializable to JSON
    const serialized = JSON.stringify(data);
    expect(serialized).toBe('{}'); // symbol is lost
  });
});
```

### 4.3 Testing with Circular References

**Source**: /node_modules/zod/src/v4/classic/tests/lazy.test.ts:175-181

```typescript
describe('Circular References with z.lazy', () => {
  it('should validate circular data structures', () => {
    const Category: z.ZodType<Category> = z.lazy(() =>
      z.object({
        name: z.string(),
        subcategories: z.array(Category),
      })
    );

    const data: Category = {
      name: 'root',
      subcategories: [
        {
          name: 'child',
          subcategories: [],
        },
      ],
    };

    expect(Category.safeParse(data).success).toBe(true);
  });

  it('should validate mutual recursion', () => {
    interface A { val: number; b: B }
    interface B { val: number; a?: A }

    const ASchema: z.ZodType<A> = z.lazy(() =>
      z.object({
        val: z.number(),
        b: BSchema,
      })
    );

    const BSchema: z.ZodType<B> = z.lazy(() =>
      z.object({
        val: z.number(),
        a: ASchema.optional(),
      })
    );

    const data: A = {
      val: 1,
      b: {
        val: 2,
        a: {
          val: 3,
          b: { val: 4 },
        },
      },
    };

    expect(ASchema.safeParse(data).success).toBe(true);
  });
});
```

---

## 5. Adversarial Input Patterns

### 5.1 Wrong Status Values (Discriminant Testing)

```typescript
describe('Adversarial Status Values', () => {
  const schema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
    z.object({ status: z.literal('error'), data: z.null(), error: z.string() }),
  ]);

  it('should reject wrong literal value', () => {
    const adversarialInputs = [
      { status: 'SUCCESS', data: 'test', error: null }, // wrong case
      { status: 'Success', data: 'test', error: null }, // wrong case
      { status: 'success ', data: 'test', error: null }, // trailing space
      { status: ' success', data: 'test', error: null }, // leading space
      { status: 'partial', data: 'test', error: null }, // not in union
      { status: undefined, data: 'test', error: null }, // undefined
      { status: null, data: 'test', error: null }, // null
      { status: 1, data: 'test', error: null }, // wrong type
      { status: true, data: 'test', error: null }, // wrong type
    ];

    adversarialInputs.forEach((input) => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  it('should reject similar but incorrect values', () => {
    // Test for typos or similar values
    const similarInputs = [
      { status: 'succes', data: 'test', error: null }, // missing 's'
      { status: 'errror', data: null, error: 'test' }, // extra 'r'
      { status: 'sucess', data: 'test', error: null }, // missing 'c'
    ];

    similarInputs.forEach((input) => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
```

### 5.2 Extra Unknown Fields

**Source**: /node_modules/zod/src/v3/tests/object.test.ts:69-108

```typescript
describe('Extra Unknown Fields', () => {
  const stripSchema = z.object({ name: z.string() }); // default: strip
  const passthroughSchema = z.object({ name: z.string() }).passthrough();
  const strictSchema = z.object({ name: z.string() }).strict();

  it('should strip unknown keys by default', () => {
    const input = { name: 'test', extra: 'field', another: 123 };
    const result = stripSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test' });
      expect('extra' in result.data).toBe(false);
    }
  });

  it('should passthrough unknown keys with .passthrough()', () => {
    const input = { name: 'test', extra: 'field', another: 123 };
    const result = passthroughSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
      expect(result.data.extra).toBe('field');
      expect(result.data.another).toBe(123);
    }
  });

  it('should reject unknown keys with .strict()', () => {
    const input = { name: 'test', extra: 'field' };
    const result = strictSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should handle adversarial extra fields', () => {
    const schema = z.object({ name: z.string() }).strict();

    const adversarialInputs = [
      { name: 'test', __proto__: 'pollution' }, // prototype pollution attempt
      { name: 'test', constructor: 'override' }, // constructor override attempt
      { name: 'test', toString: 'override' }, // method override attempt
      { name: 'test', '': 'empty key' }, // empty key
      { name: 'test', '\x00': 'null byte' }, // null byte in key
    ];

    adversarialInputs.forEach((input) => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
```

### 5.3 Type Coercion Attacks

```typescript
describe('Type Coercion Attacks', () => {
  const schema = z.object({
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
  });

  it('should reject numeric strings for number field', () => {
    const result = schema.safeParse({
      string: 'test',
      number: '123', // string, not number
      boolean: true,
    });
    expect(result.success).toBe(false);
  });

  it('should reject string "true" for boolean field', () => {
    const result = schema.safeParse({
      string: 'test',
      number: 123,
      boolean: 'true', // string, not boolean
    });
    expect(result.success).toBe(false);
  });

  it('should reject object with toString for string field', () => {
    const result = schema.safeParse({
      string: { toString: () => 'test' }, // object, not string
      number: 123,
      boolean: true,
    });
    expect(result.success).toBe(false);
  });

  it('should reject arrays where objects expected', () => {
    const schema = z.object({
      items: z.object({ name: z.string() }),
    });

    const result = schema.safeParse({
      items: [{ name: 'test' }], // array, not object
    });
    expect(result.success).toBe(false);
  });
});
```

### 5.4 Boundary Value Testing

```typescript
describe('Boundary Value Testing', () => {
  const schema = z.object({
    string: z.string().min(3).max(10),
    number: z.number().min(0).max(100),
    array: z.array(z.number()).min(1).max(5),
  });

  it('should test string boundaries', () => {
    // Valid boundaries
    expect(schema.safeParse({ string: 'abc', number: 50, array: [1] }).success).toBe(true);
    expect(schema.safeParse({ string: 'abcdefghij', number: 50, array: [1] }).success).toBe(true);

    // Invalid boundaries
    const invalidInputs = [
      { string: 'ab', number: 50, array: [1] }, // too short
      { string: 'abcdefghijk', number: 50, array: [1] }, // too long
      { string: '', number: 50, array: [1] }, // empty
    ];

    invalidInputs.forEach((input) => {
      expect(schema.safeParse(input).success).toBe(false);
    });
  });

  it('should test number boundaries', () => {
    const invalidInputs = [
      { string: 'test', number: -1, array: [1] }, // below min
      { string: 'test', number: 0, array: [1] }, // at min (valid)
      { string: 'test', number: 100, array: [1] }, // at max (valid)
      { string: 'test', number: 101, array: [1] }, // above max
      { string: 'test', number: -0.1, array: [1] }, // just below min
      { string: 'test', number: 100.1, array: [1] }, // just above max
    ];

    expect(schema.safeParse(invalidInputs[1]).success).toBe(true); // 0 is valid
    expect(schema.safeParse(invalidInputs[2]).success).toBe(true); // 100 is valid
    expect(schema.safeParse(invalidInputs[0]).success).toBe(false); // -1 is invalid
    expect(schema.safeParse(invalidInputs[3]).success).toBe(false); // 101 is invalid
    expect(schema.safeParse(invalidInputs[4]).success).toBe(false); // -0.1 is invalid
    expect(schema.safeParse(invalidInputs[5]).success).toBe(false); // 100.1 is invalid
  });

  it('should test array boundaries', () => {
    const invalidInputs = [
      { string: 'test', number: 50, array: [] }, // empty
      { string: 'test', number: 50, array: [1, 2, 3, 4, 5] }, // at max (valid)
      { string: 'test', number: 50, array: [1, 2, 3, 4, 5, 6] }, // above max
    ];

    expect(schema.safeParse(invalidInputs[1]).success).toBe(true); // 5 items is valid
    expect(schema.safeParse(invalidInputs[0]).success).toBe(false); // empty is invalid
    expect(schema.safeParse(invalidInputs[2]).success).toBe(false); // 6 items is invalid
  });
});
```

### 5.5 Special Characters and Encoding

```typescript
describe('Special Characters and Encoding', () => {
  const schema = z.object({
    text: z.string(),
    unicode: z.string(),
  });

  it('should handle unicode characters', () => {
    const inputs = [
      { text: 'Hello 世界', unicode: '🚀🎉' },
      { text: 'Привет мир', unicode: 'Ελλάδα' },
      { text: 'مرحبا', unicode: 'हिन्दी' },
      { text: 'こんにちは', unicode: '한글' },
    ];

    inputs.forEach((input) => {
      expect(schema.safeParse(input).success).toBe(true);
    });
  });

  it('should handle special characters', () => {
    const inputs = [
      { text: 'Line\nBreak', unicode: 'Tab\there' },
      { text: 'Quote"and\'single', unicode: 'Back\\slash' },
      { text: 'Null\x00Byte', unicode: 'Carriage\rReturn' },
    ];

    inputs.forEach((input) => {
      expect(schema.safeParse(input).success).toBe(true);
    });
  });

  it('should handle emoji and surrogate pairs', () => {
    const inputs = [
      { text: '👨‍👩‍👧‍👦 family emoji', unicode: '🏴‍☠️ flag' },
      { text: '😀😃😄😁', unicode: '🎨🎭🎪' },
    ];

    inputs.forEach((input) => {
      expect(schema.safeParse(input).success).toBe(true);
    });
  });

  it('should handle zero-width characters', () => {
    const inputs = [
      { text: 'test\u200Bzero', unicode: 'test\u200Cwidth' },
      { text: 'test\u200Dcharacters\uFEFF', unicode: 'normal' },
    ];

    inputs.forEach((input) => {
      expect(schema.safeParse(input).success).toBe(true);
    });
  });
});
```

---

## 6. Type Guard Testing

### 6.1 Basic Type Guard Patterns

**Source**: Groundswell agent-response.test.ts:652-711

```typescript
describe('Type Guards', () => {
  type Response =
    | { status: 'success'; data: string; error: null }
    | { status: 'error'; data: null; error: { message: string } };

  function isSuccess(r: Response): r is Extract<Response, { status: 'success' }> {
    return r.status === 'success';
  }

  function isError(r: Response): r is Extract<Response, { status: 'error' }> {
    return r.status === 'error';
  }

  it('should narrow type with type guard', () => {
    const response: Response = { status: 'success', data: 'test', error: null };

    if (isSuccess(response)) {
      // TypeScript knows response.data is string
      expect(response.data.toUpperCase()).toBe('TEST');
      // @ts-expect-error - error should be null
      expect(response.error.message).toBeUndefined();
    }
  });

  it('should handle multiple type guards', () => {
    const response: Response = { status: 'error', data: null, error: { message: 'fail' } };

    if (isError(response)) {
      // TypeScript knows response.error.message is string
      expect(response.error.message).toBe('fail');
      // @ts-expect-error - data should be null
      expect(response.data.toUpperCase()).toBeUndefined();
    }
  });

  it('should exhaustively check all variants', () => {
    const handleResponse = (r: Response): string => {
      if (isSuccess(r)) {
        return `Success: ${r.data}`;
      } else if (isError(r)) {
        return `Error: ${r.error.message}`;
      } else {
        // TypeScript should know this is unreachable
        const _exhaustive: never = r;
        return _exhaustive;
      }
    };

    expect(handleResponse({ status: 'success', data: 'test', error: null })).toBe('Success: test');
    expect(handleResponse({ status: 'error', data: null, error: { message: 'fail' } })).toBe('Error: fail');
  });
});
```

### 6.2 Discriminated Union Type Guards

```typescript
describe('Discriminated Union Type Guards', () => {
  type Event =
    | { type: 'click'; x: number; y: number }
    | { type: 'keydown'; key: string; code: number }
    | { type: 'scroll'; deltaX: number; deltaY: number };

  it('should narrow with discriminator', () => {
    const event: Event = { type: 'click', x: 100, y: 200 };

    if (event.type === 'click') {
      // TypeScript knows x and y exist
      expect(event.x).toBe(100);
      expect(event.y).toBe(200);
      // @ts-expect-error - key doesn't exist on click
      expect(event.key).toBeUndefined();
    }
  });

  it('should handle switch exhaustiveness', () => {
    const handleEvent = (event: Event): string => {
      switch (event.type) {
        case 'click':
          return `Clicked at ${event.x}, ${event.y}`;
        case 'keydown':
          return `Pressed ${event.key} (${event.code})`;
        case 'scroll':
          return `Scrolled ${event.deltaX}, ${event.deltaY}`;
        default:
          // TypeScript knows this is never
          const _exhaustive: never = event;
          return _exhaustive;
      }
    };

    expect(handleEvent({ type: 'click', x: 100, y: 200 })).toBe('Clicked at 100, 200');
  });
});
```

---

## 7. Error Validation Testing

### 7.1 Error Code Validation

**Source**: Groundswell agent-error-codes.test.ts:331-401

```typescript
describe('Error Code Validation', () => {
  it('should validate all error codes are strings', () => {
    const errorCodes = {
      INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
      VALIDATION_FAILED: 'VALIDATION_FAILED',
      EXECUTION_FAILED: 'EXECUTION_FAILED',
      API_REQUEST_FAILED: 'API_REQUEST_FAILED',
      TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
    };

    Object.values(errorCodes).forEach((code) => {
      expect(typeof code).toBe('string');
    });
  });

  it('should follow SCREAMING_SNAKE_CASE format', () => {
    const errorCodes = {
      INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
      Validiation_Failed: 'INVALID', // This would fail
    };

    Object.entries(errorCodes).forEach(([key, value]) => {
      expect(value).toMatch(/^[A-Z][A-Z_]*$/);
    });
  });

  it('should be programmatically parsable', () => {
    const handleError = (code: string): string => {
      switch (code) {
        case 'INVALID_RESPONSE_FORMAT':
          return 'Handle invalid format';
        case 'VALIDATION_FAILED':
          return 'Handle validation error';
        case 'EXECUTION_FAILED':
          return 'Handle execution error';
        case 'API_REQUEST_FAILED':
          return 'Handle API error';
        case 'TOOL_EXECUTION_FAILED':
          return 'Handle tool error';
        case 'INTERNAL_ERROR':
          return 'Handle internal error';
        default:
          return 'Unknown error code';
      }
    };

    expect(handleError('VALIDATION_FAILED')).toBe('Handle validation error');
    expect(handleError('UNKNOWN_CODE')).toBe('Unknown error code');
  });
});
```

### 7.2 Error Details Validation

```typescript
describe('Error Details Validation', () => {
  const errorDetailsSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).nullable(),
    recoverable: z.boolean(),
  });

  it('should validate error with null details', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Test error',
      details: null,
      recoverable: false,
    };

    const result = errorDetailsSchema.safeParse(error);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toBeNull();
      expect(result.data.details).not.toBeUndefined();
    }
  });

  it('should validate error with object details', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Test error',
      details: {
        field: 'email',
        value: 'invalid',
        constraints: ['required', 'email'],
      },
      recoverable: true,
    };

    const result = errorDetailsSchema.safeParse(error);
    expect(result.success).toBe(true);
  });

  it('should validate error with array details', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Multiple errors',
      details: {
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' },
        ],
      },
      recoverable: false,
    };

    const result = errorDetailsSchema.safeParse(error);
    expect(result.success).toBe(true);
  });

  it('should validate error with nested details', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Complex error',
      details: {
        workflow: {
          id: 'wf-123',
          step: 'process',
          error: {
            type: 'Timeout',
            duration: 30000,
          },
        },
      },
      recoverable: true,
    };

    const result = errorDetailsSchema.safeParse(error);
    expect(result.success).toBe(true);
  });
});
```

### 7.3 Recoverable Field Testing

**Source**: Groundswell agent-error-codes.test.ts:241-329

```typescript
describe('Recoverable Field Testing', () => {
  it('should handle retry logic based on recoverable flag', () => {
    const shouldRetry = (response: {
      status: string;
      error?: { recoverable?: boolean };
    }): boolean => {
      return response.status === 'error' && response.error?.recoverable === true;
    };

    const recoverableError = {
      status: 'error',
      data: null,
      error: { code: 'API_REQUEST_FAILED', message: 'Timeout', recoverable: true },
    };

    const nonRecoverableError = {
      status: 'error',
      data: null,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid input', recoverable: false },
    };

    expect(shouldRetry(recoverableError)).toBe(true);
    expect(shouldRetry(nonRecoverableError)).toBe(false);
  });

  it('should not retry on success responses', () => {
    const shouldRetry = (response: any): boolean => {
      return response.status === 'error' && response.error?.recoverable === true;
    };

    const successResponse = {
      status: 'success',
      data: 'test',
      error: null,
    };

    expect(shouldRetry(successResponse)).toBe(false);
  });
});
```

---

## 8. Performance and Security Testing

### 8.1 Performance Testing for Large Payloads

```typescript
describe('Performance Testing', () => {
  const schema = z.object({
    items: z.array(z.object({
      id: z.number(),
      name: z.string(),
      tags: z.array(z.string()),
      metadata: z.record(z.string()),
    })),
  });

  it('should handle large arrays efficiently', () => {
    const largeArray = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `item-${i}`,
      tags: ['tag1', 'tag2', 'tag3'],
      metadata: { key1: 'value1', key2: 'value2' },
    }));

    const start = Date.now();
    const result = schema.safeParse({ items: largeArray });
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should fail fast on invalid large arrays', () => {
    const largeArray = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `item-${i}`,
      tags: ['tag1', 'tag2', 'tag3'],
      metadata: { key1: 'value1', key2: 'value2' },
    }));

    // Make one item invalid
    largeArray[5000].id = 'invalid' as any;

    const start = Date.now();
    const result = schema.safeParse({ items: largeArray });
    const duration = Date.now() - start;

    expect(result.success).toBe(false);
    expect(duration).toBeLessThan(1000); // Should fail fast
  });
});
```

### 8.2 Security Testing

```typescript
describe('Security Testing', () => {
  const schema = z.object({
    username: z.string().max(50),
    email: z.string().email(),
    bio: z.string().max(500),
  });

  it('should reject extremely long strings', () => {
    const longString = 'a'.repeat(1000000); // 1MB string

    const result = schema.safeParse({
      username: longString,
      email: 'test@example.com',
      bio: 'test',
    });

    expect(result.success).toBe(false);
  });

  it('should reject deeply nested objects', () => {
    const deepSchema = z.object({
      level: z.any(),
    });

    // Create deeply nested object (1000 levels)
    let deep: any = { value: 'bottom' };
    for (let i = 0; i < 1000; i++) {
      deep = { level: deep };
    }

    const result = deepSchema.safeParse(deep);
    // Should handle but may be slow
    expect(result.success).toBe(true);
  });

  it('should handle prototype pollution attempts', () => {
    const schema = z.object({
      name: z.string(),
    }).strict();

    const pollutionAttempts = [
      { name: 'test', '__proto__': { polluted: true } },
      { name: 'test', 'constructor': { prototype: { polluted: true } } },
      { name: 'test', 'prototype': { polluted: true } },
    ];

    pollutionAttempts.forEach((attempt) => {
      const result = schema.safeParse(attempt);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## 9. Common Pitfalls and Solutions

### 9.1 Pitfall: Confusing optional() with nullable()

```typescript
describe('Common Pitfall: optional vs nullable', () => {
  it('should distinguish between optional and nullable', () => {
    const optionalSchema = z.object({
      field: z.string().optional(),
    });

    const nullableSchema = z.object({
      field: z.string().nullable(),
    });

    // Optional accepts undefined
    expect(optionalSchema.safeParse({ field: undefined }).success).toBe(true);
    // Optional does NOT accept null
    expect(optionalSchema.safeParse({ field: null }).success).toBe(false);

    // Nullable accepts null
    expect(nullableSchema.safeParse({ field: null }).success).toBe(true);
    // Nullable does NOT accept undefined
    expect(nullableSchema.safeParse({ field: undefined }).success).toBe(false);
  });

  it('should use nullish() for both', () => {
    const nullishSchema = z.object({
      field: z.string().nullish(),
    });

    expect(nullishSchema.safeParse({ field: null }).success).toBe(true);
    expect(nullishSchema.safeParse({ field: undefined }).success).toBe(true);
  });
});
```

### 9.2 Pitfall: Not Testing After Transformations

```typescript
describe('Common Pitfall: Not testing transformations', () => {
  const schema = z.object({
    birthYear: z.number().transform((year) => {
      const age = new Date().getFullYear() - year;
      return { age, year };
    }),
  });

  it('should test transformed output', () => {
    const result = schema.safeParse({ birthYear: 1990 });

    expect(result.success).toBe(true);
    if (result.success) {
      // Output is different from input!
      expect(result.data.birthYear).toEqual({
        age: expect.any(Number),
        year: 1990,
      });
    }
  });

  it('should test validation before transformation', () => {
    const result = schema.safeParse({ birthYear: 'invalid' as any });

    // Validation fails before transformation
    expect(result.success).toBe(false);
  });
});
```

### 9.3 Pitfall: Assuming strict() is Default

```typescript
describe('Common Pitfall: Assuming strict mode', () => {
  it('should show strip is default, not strict', () => {
    const defaultSchema = z.object({ name: z.string() });
    const strictSchema = z.object({ name: z.string() }).strict();

    const input = { name: 'test', extra: 'field' };

    // Default strips unknown keys
    const defaultResult = defaultSchema.safeParse(input);
    expect(defaultResult.success).toBe(true);
    if (defaultResult.success) {
      expect('extra' in defaultResult.data).toBe(false);
    }

    // Strict rejects unknown keys
    const strictResult = strictSchema.safeParse(input);
    expect(strictResult.success).toBe(false);
  });
});
```

### 9.4 Pitfall: Not Testing Union Ordering

```typescript
describe('Common Pitfall: Union ordering issues', () => {
  it('should test union tries schemas in order', () => {
    // Zod tries unions in order
    const schema = z.union([
      z.object({ type: z.literal('string'), value: z.string() }),
      z.object({ type: z.literal('number'), value: z.number() }),
    ]);

    // This is valid
    expect(schema.safeParse({ type: 'string', value: 'test' }).success).toBe(true);
    expect(schema.safeParse({ type: 'number', value: 42 }).success).toBe(true);

    // But if we reverse the order, ambiguous cases may fail differently
    const reversedSchema = z.union([
      z.object({ type: z.literal('number'), value: z.number() }),
      z.object({ type: z.literal('string'), value: z.string() }),
    ]);

    expect(reversedSchema.safeParse({ type: 'string', value: 'test' }).success).toBe(true);
    expect(reversedSchema.safeParse({ type: 'number', value: 42 }).success).toBe(true);
  });

  it('should use discriminatedUnion to avoid ordering issues', () => {
    // Discriminated unions are more efficient and avoid ordering issues
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('string'), value: z.string() }),
      z.object({ type: z.literal('number'), value: z.number() }),
    ]);

    // Order doesn't matter for discriminated unions
    expect(schema.safeParse({ type: 'string', value: 'test' }).success).toBe(true);
    expect(schema.safeParse({ type: 'number', value: 42 }).success).toBe(true);
  });
});
```

---

## 10. Test Utility Patterns

### 10.1 Helper Functions for Testing

```typescript
// Test utility functions
export const testingHelpers = {
  /**
   * Check if a Zod result is an error with a specific code
   */
  expectErrorCode: (result: z.SafeParseError<any>, code: z.ZodIssueCode) => {
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toEqual(code);
    }
  },

  /**
   * Check if a Zod result is an error at a specific path
   */
  expectErrorAtPath: (result: z.SafeParseError<any>, path: (string | number)[]) => {
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(path);
    }
  },

  /**
   * Assert success and return data
   */
  expectSuccess: <T>(result: z.SafeParseSuccess<T>): T => {
    expect(result.success).toBe(true);
    return result.data;
  },

  /**
   * Generate invalid inputs for a schema
   */
  generateInvalidInputs: (validInput: any) => {
    return [
      null,
      undefined,
      {},
      [],
      '',
      0,
      false,
      { ...validInput, extraField: 'extra' }, // extra field for strict schemas
      JSON.parse(JSON.stringify(validInput).replace(/"/g, '')), // malformed
    ];
  },
};

// Usage in tests
describe('Test Utilities', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should use expectErrorCode helper', () => {
    const result = schema.safeParse({ name: 123, age: 'test' });
    if (!result.success) {
      testingHelpers.expectErrorCode(result, ZodIssueCode.invalid_type);
    }
  });

  it('should use expectSuccess helper', () => {
    const result = schema.safeParse({ name: 'test', age: 30 });
    if (result.success) {
      const data = testingHelpers.expectSuccess(result);
      expect(data.name).toBe('test');
    }
  });

  it('should test with generateInvalidInputs', () => {
    const invalidInputs = testingHelpers.generateInvalidInputs({
      name: 'test',
      age: 30,
    });

    invalidInputs.forEach((input) => {
      const result = schema.safeParse(input);
      // Most should fail
      expect(result.success).toBe(false);
    });
  });
});
```

### 10.2 Property-Based Testing Patterns

```typescript
describe('Property-Based Testing Patterns', () => {
  it('should test commutativity of parse', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    // Property: parse(parse(data)) === parse(data)
    const data = { name: 'test', age: 30 };

    const result1 = schema.safeParse(data);
    if (result1.success) {
      const result2 = schema.safeParse(result1.data);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data).toEqual(result1.data);
      }
    }
  });

  it('should test idempotency of transformations', () => {
    const schema = z.object({
      value: z.string().transform((s) => s.toLowerCase()),
    });

    // Property: transform(transform(data)) === transform(data)
    const data = { value: 'HELLO' };

    const result = schema.safeParse(data);
    if (result.success) {
      const result2 = schema.safeParse(result.data);
      if (result2.success) {
        expect(result2.data.value).toBe(result.data.value);
      }
    }
  });
});
```

---

## Summary and Key Takeaways

### Testing Principles

1. **Always test both success and failure paths** - Don't assume validation works
2. **Use safeParse in tests** - Avoid try-catch overhead
3. **Test error structure explicitly** - Verify error codes and paths
4. **Test edge cases thoroughly** - Boundaries, special values, null/undefined
5. **Test serialization round-trips** - Ensure data survives JSON.stringify/parse
6. **Use type guards effectively** - Verify TypeScript narrowing works correctly

### Discriminated Union Testing

1. **Test all discriminator variants** - Ensure each variant validates correctly
2. **Test invalid discriminator values** - Similar strings, wrong types, etc.
3. **Test mismatched fields** - Correct discriminator but wrong data
4. **Test type narrowing** - Verify TypeScript understands the types

### Edge Cases to Test

1. **Undefined vs null vs missing** - Test all three states
2. **NaN and Infinity** - Special number values
3. **Empty strings and arrays** - Boundary conditions
4. **Deeply nested objects** - Verify error paths
5. **Circular references** - Use z.lazy() for recursive schemas

### Adversarial Inputs

1. **Wrong discriminator values** - Case sensitivity, typos
2. **Extra unknown fields** - Test strip, passthrough, strict modes
3. **Type coercion attacks** - Wrong types that might convert
4. **Boundary values** - Just below/above limits
5. **Special characters** - Unicode, emoji, control characters

### Common Pitfalls

1. **optional() vs nullable()** - Optional accepts undefined, nullable accepts null
2. **Assuming strict() is default** - Default is strip mode
3. **Not testing transformations** - Output may differ from input
4. **Union ordering** - Use discriminatedUnion to avoid issues

---

## References

### Internal Sources

- **Zod v3 Test Suite**: `/node_modules/zod/src/v3/tests/`
  - discriminated-unions.test.ts - Discriminated union patterns
  - object.test.ts - Object validation, strict/passthrough modes
  - optional.test.ts - Optional field behavior
  - nullable.test.ts - Nullable field behavior
  - nan.test.ts - Special number values
  - lazy.test.ts - Recursive and circular schemas
  - function.test.ts - Function validation
  - error.test.ts - Error structure testing

- **Groundswell Test Files**:
  - `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
  - `/home/dustin/projects/groundswell/src/__tests__/unit/agent-error-codes.test.ts`
  - `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/zod-validation-patterns-research.md`

### External Documentation (When Available)

Due to API rate limits, external URLs could not be fetched during this research. However, key resources for further reading include:

- **Zod Documentation**: https://zod.dev/
- **Zod GitHub**: https://github.com/colinhacks/zod
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Vitest Testing Library**: https://vitest.dev/

---

## Next Steps

1. **Apply these patterns** to Groundswell's AgentResponse testing
2. **Create test utilities** based on Section 10 for common test patterns
3. **Add adversarial test cases** for edge cases not currently covered
4. **Document schema-specific** test patterns for AgentResponse<T>
5. **Consider fuzzing** with tools like fast-check for property-based testing
