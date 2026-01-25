# Vitest and Zod Testing Best Practices Guide

**Research Date**: 2026-01-24
**Focus**: Vitest testing patterns for TypeScript types and Zod schema validation

---

## Table of Contents

1. [Official Vitest Documentation URLs](#1-official-vitest-documentation-urls)
2. [Vitest TypeScript Type Testing](#2-vitest-typescript-type-testing)
3. [Vitest Mocking with vi.spyOn](#3-vitest-mocking-with-vispyon)
4. [Vitest Expect Matchers for Object Validation](#4-vitest-expect-matchers-for-object-validation)
5. [Testing Async Code with Vitest](#5-testing-async-code-with-vitest)
6. [Zod Schema Testing Best Practices](#6-zod-schema-testing-best-practices)
7. [Testing Discriminated Unions](#7-testing-discriminated-unions)
8. [Testing Optional Fields and Null Handling](#8-testing-optional-fields-and-null-handling)
9. [Code Examples from Zod Test Suite](#9-code-examples-from-zod-test-suite)
10. [Common Testing Patterns](#10-common-testing-patterns)

---

## 1. Official Vitest Documentation URLs

### 1.1 Testing TypeScript Types

**URL**: https://vitest.dev/guide/testing-types.html

**Key Features**:
- Type assertion testing with `expectType()` and `expectAssignable()`
- Compile-time type checking in test files
- Integration with TypeScript's type system

**Section Anchors**:
- `#type-testing` - Main type testing overview
- `#expecttype` - Type equality assertions
- `#expectassignable` - Type assignability checks

### 1.2 Mocking with vi.spyOn

**URL**: https://vitest.dev/api/vi.html

**Section Anchors**:
- `#vispyon` - Main vi.spyOn documentation
- `#mock-functions` - Mock function reference
- `#spying-on-methods` - Method spying patterns

### 1.3 Expect Matchers for Object Validation

**URL**: https://vitest.dev/api/expect.html

**Section Anchors**:
- `#toequal` - Deep equality checks
- `#tomatchobject` - Partial object matching
- `#tohaveproperty` - Property existence checks
- `#tothrow` - Exception testing

### 1.4 Testing Async Code

**URL**: https://vitest.dev/guide/testing-types.html#async-testing

**Key Patterns**:
- `async/await` in test functions
- Promise rejection testing with `rejects`
- Timeout configuration

---

## 2. Vitest TypeScript Type Testing

### 2.1 Basic Type Assertions

```typescript
import { test, expect } from 'vitest';

test('type assertion with expectType', () => {
  const value = { name: 'test', count: 42 };
  expectType<{ name: string; count: number }>(value);
});

test('type assignability with expectAssignable', () => {
  const value = 'hello';
  // String is assignable to string | number
  expectAssignable<string | number>(value);
});

test('negative type assertions', () => {
  const value = 42;
  // Number is NOT assignable to string
  expectNotType<string>(value);
});
```

### 2.2 Type Inference Testing

```typescript
test('schema produces correct TypeScript type', () => {
  const StringSchema = z.object({ result: z.string() });
  type Inferred = z.infer<typeof StringSchema>;

  // Verify inferred type matches expectation
  expectType<{ result: string }>({} as Inferred);
});
```

### 2.3 Type Guard Testing

```typescript
function isSuccess(value: unknown): value is { success: true } {
  return typeof value === 'object' && value !== null && 'success' in value;
}

test('type guard narrows correctly', () => {
  const value: unknown = { success: true, data: 'test' };

  if (isSuccess(value)) {
    // TypeScript knows value.data is valid
    expectType<{ success: true; data: string }>(value);
  }
});
```

---

## 3. Vitest Mocking with vi.spyOn

### 3.1 Basic Spying

```typescript
test('spy on method calls', () => {
  const calculator = {
    add: (a: number, b: number) => a + b
  };

  const spy = vi.spyOn(calculator, 'add');

  calculator.add(1, 2);

  expect(spy).toHaveBeenCalledWith(1, 2);
  expect(spy).toHaveReturnedWith(3);
});
```

### 3.2 Mocking Return Values

```typescript
test('mock return value', () => {
  const api = {
    fetchUser: (id: string) => ({ id, name: 'John' })
  };

  vi.spyOn(api, 'fetchUser').mockReturnValue({
    id: '123',
    name: 'Mocked'
  });

  expect(api.fetchUser('123')).toEqual({ id: '123', name: 'Mocked' });
});
```

### 3.3 Mocking Implementation

```typescript
test('mock implementation', () => {
  const schema = z.object({ name: z.string() });

  vi.spyOn(schema, 'safeParse').mockImplementation((data: unknown) => {
    return {
      success: true,
      data: { name: 'mocked' }
    };
  });

  const result = schema.safeParse({ invalid: 123 });
  expect(result.success).toBe(true);
});
```

### 3.4 Async Mocking

```typescript
test('mock async methods', async () => {
  const api = {
    fetchUser: async (id: string) => ({ id, name: 'John' })
  };

  vi.spyOn(api, 'fetchUser').mockResolvedValue({
    id: '123',
    name: 'Mocked'
  });

  const result = await api.fetchUser('123');
  expect(result).toEqual({ id: '123', name: 'Mocked' });
});
```

### 3.5 Restoring Mocks

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});

test('spy with cleanup', () => {
  const obj = { method: () => 'original' };
  const spy = vi.spyOn(obj, 'method').mockReturnValue('mocked');

  expect(obj.method()).toBe('mocked');

  spy.mockRestore();
  expect(obj.method()).toBe('original');
});
```

---

## 4. Vitest Expect Matchers for Object Validation

### 4.1 toEqual - Deep Equality

```typescript
test('deep equality check', () => {
  const expected = {
    status: 'success',
    data: { result: 'test', count: 42 }
  };

  const actual = {
    status: 'success',
    data: { result: 'test', count: 42 }
  };

  expect(actual).toEqual(expected);
});
```

### 4.2 toMatchObject - Partial Matching

```typescript
test('partial object matching', () => {
  const response = {
    status: 'success',
    data: { result: 'test', count: 42, extra: 'ignored' },
    metadata: { agentId: 'test', timestamp: Date.now() }
  };

  // Only checks specified properties
  expect(response).toMatchObject({
    status: 'success',
    data: { result: 'test' }
  });
});
```

### 4.3 toHaveProperty - Property Existence

```typescript
test('property existence', () => {
  const obj = {
    status: 'success',
    data: { nested: { value: 42 } }
  };

  expect(obj).toHaveProperty('status');
  expect(obj).toHaveProperty('data.nested.value');
  expect(obj).toHaveProperty('status', 'success'); // Check value too
});
```

### 4.4 toThrow - Exception Testing

```typescript
test('schema.parse() throws on invalid data', () => {
  const schema = z.object({ name: z.string() });

  expect(() => schema.parse({ invalid: 123 })).toThrow();
  expect(() => schema.parse({ invalid: 123 })).toThrow(z.ZodError);
});
```

### 4.5 toMatchObject for Schema Validation

```typescript
test('valid data passes schema', () => {
  const schema = z.object({
    status: z.literal('success'),
    data: z.object({ result: z.string() })
  });

  const valid = {
    status: 'success',
    data: { result: 'test' }
  };

  expect(schema.parse(valid)).toMatchObject(valid);
});
```

---

## 5. Testing Async Code with Vitest

### 5.1 Basic Async Testing

```typescript
test('async schema validation', async () => {
  const asyncSchema = z.string().refine(async (val) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return val.length > 0;
  });

  const result = await asyncSchema.safeParseAsync('test');
  expect(result.success).toBe(true);
});
```

### 5.2 Promise Rejection Testing

```typescript
test('async parsing throws on invalid', async () => {
  const schema = z.object({ name: z.string() });

  await expect(schema.parseAsync({ invalid: 123 }))
    .rejects.toThrow(z.ZodError);
});
```

### 5.3 Testing Async Factories

```typescript
async function createResponse(data: unknown) {
  const schema = z.object({ result: z.string() });
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    throw new Error('Validation failed');
  }

  return result.data;
}

test('async factory function', async () => {
  const response = await createResponse({ result: 'test' });
  expect(response).toEqual({ result: 'test' });
});
```

---

## 6. Zod Schema Testing Best Practices

### 6.1 Testing Valid Data Passes

**Pattern**: Use `parse()` and expect successful return

```typescript
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

const SuccessResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({ result: z.string() }),
  error: z.null()
});

describe('SuccessResponseSchema - valid data', () => {
  it('should accept valid success response', () => {
    const valid = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null
    };

    const result = SuccessResponseSchema.parse(valid);
    expect(result).toEqual(valid);
  });

  it('should handle complex nested objects', () => {
    const ComplexSchema = z.object({
      user: z.object({
        id: z.number(),
        profile: z.object({
          name: z.string(),
          email: z.string().email()
        })
      })
    });

    const valid = {
      user: {
        id: 123,
        profile: { name: 'John', email: 'john@example.com' }
      }
    };

    expect(ComplexSchema.parse(valid)).toEqual(valid);
  });
});
```

### 6.2 Testing Invalid Data Fails

**Pattern**: Use try-catch or `safeParse()` and verify errors

```typescript
describe('SuccessResponseSchema - invalid data', () => {
  it('should reject missing required fields', () => {
    const invalid = {
      status: 'success',
      // missing 'data' field
      error: null
    };

    expect(() => SuccessResponseSchema.parse(invalid)).toThrow(z.ZodError);
  });

  it('should provide detailed error information', () => {
    const invalid = {
      status: 'success',
      data: { result: 123 }, // wrong type
      error: null
    };

    const result = SuccessResponseSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toHaveLength(1);
      expect(result.error.errors[0].path).toEqual(['data', 'result']);
      expect(result.error.errors[0].code).toEqual('invalid_type');
    }
  });

  it('should reject wrong literal values', () => {
    const invalid = {
      status: 'error', // should be 'success'
      data: { result: 'test' },
      error: null
    };

    const result = SuccessResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

### 6.3 Test Structure Pattern

```typescript
describe('SchemaName', () => {
  describe('valid cases', () => {
    it('should accept valid input 1', () => {
      // Test case 1
    });

    it('should accept valid input 2', () => {
      // Test case 2
    });

    it('should handle edge cases', () => {
      // Edge case: empty strings, zero, null, etc.
    });
  });

  describe('invalid cases', () => {
    it('should reject missing required fields', () => {
      // Missing fields
    });

    it('should reject wrong types', () => {
      // Type mismatches
    });

    it('should reject out-of-range values', () => {
      // Min/max, length constraints
    });
  });

  describe('type inference', () => {
    it('should infer correct TypeScript type', () => {
      type Inferred = z.infer<typeof YourSchema>;
      expectType<ExpectedType>({} as Inferred);
    });
  });
});
```

---

## 7. Testing Discriminated Unions

### 7.1 Basic Discriminated Union Testing

**Source**: `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/discriminated-unions.test.ts`

```typescript
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

const ResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.string(),
    error: z.null()
  }),
  z.object({
    status: z.literal('error'),
    data: z.null(),
    error: z.object({ code: z.string(), message: z.string() })
  })
]);

describe('Discriminated Union', () => {
  describe('valid cases', () => {
    it('should accept success variant', () => {
      const success = {
        status: 'success' as const,
        data: 'result',
        error: null
      };

      const result = ResponseSchema.parse(success);
      expect(result).toEqual(success);
    });

    it('should accept error variant', () => {
      const error = {
        status: 'error' as const,
        data: null,
        error: { code: 'ERR', message: 'Failed' }
      };

      const result = ResponseSchema.parse(error);
      expect(result).toEqual(error);
    });
  });

  describe('invalid cases', () => {
    it('should reject invalid discriminator value', () => {
      const invalid = {
        status: 'partial', // not in union
        data: 'test',
        error: null
      };

      const result = ResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.errors[0].code).toEqual('invalid_union_discriminator');
        expect(result.error.errors[0].options).toEqual(['success', 'error']);
      }
    });

    it('should reject mismatched data for discriminator', () => {
      const invalid = {
        status: 'success',
        data: null, // should be string
        error: null
      };

      const result = ResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
```

### 7.2 AgentResponse Discriminated Union Pattern

**Source**: `/home/dustin/projects/groundswell/src/types/agent.ts`

```typescript
// Schema factory for discriminated union
function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: z.object({ agentId: z.string(), timestamp: z.number() }).optional()
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).nullable(),
      recoverable: z.boolean()
    }),
    metadata: z.object({ agentId: z.string(), timestamp: z.number() }).optional()
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: z.object({ agentId: z.string(), timestamp: z.number() }).optional()
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

// Tests
describe('AgentResponse discriminated union', () => {
  const StringResponseSchema = AgentResponseSchema(z.object({ result: z.string() }));

  it('should accept success response', () => {
    const valid = {
      status: 'success' as const,
      data: { result: 'test' },
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    };

    expect(StringResponseSchema.parse(valid)).toEqual(valid);
  });

  it('should accept error response', () => {
    const valid = {
      status: 'error' as const,
      data: null,
      error: { code: 'ERR', message: 'Failed', details: null, recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    };

    expect(StringResponseSchema.parse(valid)).toEqual(valid);
  });

  it('should discriminate on status field', () => {
    const result = StringResponseSchema.parse({
      status: 'success',
      data: { result: 'test' },
      error: null
    });

    // TypeScript knows: if result.status === 'success', then result.error is null
    if (result.status === 'success') {
      expect(result.data.result).toBe('test');
      expect(result.error).toBeNull();
    }
  });
});
```

---

## 8. Testing Optional Fields and Null Handling

### 8.1 Optional vs Nullable

**Source**: Zod test suite patterns

```typescript
describe('Optional vs Nullable', () => {
  describe('z.optional()', () => {
    const OptionalSchema = z.object({
      required: z.string(),
      optional: z.string().optional()
    });

    it('should accept undefined for optional fields', () => {
      const result = OptionalSchema.parse({
        required: 'test'
        // optional is undefined (not present)
      });
      expect(result.optional).toBeUndefined();
    });

    it('should explicitly accept undefined', () => {
      const result = OptionalSchema.parse({
        required: 'test',
        optional: undefined
      });
      expect(result.optional).toBeUndefined();
    });
  });

  describe('z.nullable()', () => {
    const NullableSchema = z.object({
      required: z.string(),
      nullable: z.string().nullable()
    });

    it('should accept null for nullable fields', () => {
      const result = NullableSchema.parse({
        required: 'test',
        nullable: null
      });
      expect(result.nullable).toBeNull();
    });

    it('should still require the field to be present', () => {
      // Missing nullable field should fail
      const result = NullableSchema.safeParse({
        required: 'test'
        // nullable is missing
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PRD 6.4.4: Null over Undefined', () => {
    const NullPreferredSchema = z.object({
      // Use nullable for absent values
      error: z.object({ code: z.string() }).nullable(),
      // Use optional for truly optional fields
      metadata: z.object({ id: z.string() }).optional()
    });

    it('prefers null for absent error', () => {
      const result = NullPreferredSchema.parse({
        error: null
        // metadata is optional
      });
      expect(result.error).toBeNull();
      expect(result.metadata).toBeUndefined();
    });

    it('accepts both null and undefined for optional', () => {
      const schema = z.object({
        field: z.string().nullable().optional()
      });

      expect(schema.parse({ field: null }).field).toBeNull();
      expect(schema.parse({}).field).toBeUndefined();
      expect(schema.parse({ field: 'test' }).field).toBe('test');
    });
  });
});
```

### 8.2 Null Handling in AgentResponse

**Source**: `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response-factory.test.ts`

```typescript
describe('Null Handling (PRD 6.4.4)', () => {
  it('should use null for absent error in success responses', () => {
    const response = createSuccessResponse(
      'data',
      { agentId: 'agent-123', timestamp: Date.now() }
    );

    expect(response.error).toBeNull();
    expect(response.error).not.toBeUndefined();
  });

  it('should use null for absent data in error responses', () => {
    const response = createErrorResponse('TEST_ERROR', 'Test error');

    expect(response.data).toBeNull();
    expect(response.data).not.toBeUndefined();
  });

  it('should use null for undefined optional details', () => {
    const response = createErrorResponse(
      'TEST_ERROR',
      'Test error',
      undefined // Should be converted to null
    );

    expect(response.error?.details).toBeNull();
    expect(response.error?.details).not.toBeUndefined();
  });
});
```

### 8.3 Testing with Null Checks

```typescript
describe('Null-safe validation', () => {
  const schema = z.object({
    value: z.string().nullable(),
    count: z.number().optional()
  });

  it('handles null values correctly', () => {
    const result = schema.parse({ value: null });
    expect(result.value).toBeNull();
  });

  it('provides type narrowing for null checks', () => {
    const result = schema.parse({ value: 'test', count: 42 });

    if (result.value !== null) {
      // TypeScript knows result.value is string
      expect(result.value.toUpperCase()).toBe('TEST');
    }

    if (result.count !== undefined) {
      // TypeScript knows result.count is number
      expect(result.count.toFixed(2)).toBe('42.00');
    }
  });
});
```

---

## 9. Code Examples from Zod Test Suite

### 9.1 Object Schema Testing

**Source**: `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/object.test.ts`

```typescript
import * as z from 'zod';
import { expect, test } from 'vitest';

const Test = z.object({
  f1: z.number(),
  f2: z.string().optional(),
  f3: z.string().nullable(),
  f4: z.array(z.object({ t: z.union([z.string(), z.boolean()]) })),
});

test('object type inference', () => {
  type TestType = {
    f1: number;
    f2?: string | undefined;
    f3: string | null;
    f4: { t: string | boolean }[];
  };

  // Verify type inference matches
  const util = {
    assertEqual<T>(a: T, b: T) {}
  };

  util.assertEqual<z.TypeOf<typeof Test>, TestType>(true);
});

test('correct parsing', () => {
  Test.parse({
    f1: 12,
    f2: 'string',
    f3: 'string',
    f4: [{ t: 'string' }]
  });

  Test.parse({
    f1: 12,
    f3: null,
    f4: [{ t: false }]
  });
});

test('incorrect validation', () => {
  expect(() => Test.parse({} as any)).toThrow();
});
```

### 9.2 Strict Mode Testing

```typescript
test('strict mode rejects unknown keys', () => {
  const data = {
    points: 2314,
    unknown: 'asdf'
  };

  const strictSchema = z.object({ points: z.number() }).strict();
  const result = strictSchema.safeParse(data);

  expect(result.success).toBe(false);
});

test('passthrough mode preserves unknown keys', () => {
  const data = {
    points: 2314,
    unknown: 'asdf'
  };

  const passthroughSchema = z.object({ points: z.number() }).passthrough();
  const result = passthroughSchema.parse(data);

  expect(result).toEqual(data); // unknown key preserved
});

test('strip mode removes unknown keys', () => {
  const data = {
    points: 2314,
    unknown: 'asdf'
  };

  const stripSchema = z.object({ points: z.number() }).strip();
  const result = stripSchema.parse(data);

  expect(result).toEqual({ points: 2314 }); // unknown key removed
});
```

---

## 10. Common Testing Patterns

### 10.1 Schema Validation Helper

```typescript
/**
 * Helper to test schema validation results
 */
function expectValidationErrors(
  result: z.SafeParseError<unknown>,
  expectedErrors: Array<{
    path: string[];
    code: string;
    message?: string;
  }>
) {
  expect(result.success).toBe(false);
  expect(result.error.errors).toHaveLength(expectedErrors.length);

  result.error.errors.forEach((error, i) => {
    const expected = expectedErrors[i];
    expect(error.path).toEqual(expected.path);
    expect(error.code).toEqual(expected.code);
    if (expected.message) {
      expect(error.message).toEqual(expected.message);
    }
  });
}

// Usage
it('should report multiple validation errors', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().min(18),
    email: z.string().email()
  });

  const result = schema.safeParse({
    name: 'X',
    age: 15,
    email: 'invalid'
  });

  expectValidationErrors(result, [
    { path: ['name'], code: 'too_small' },
    { path: ['age'], code: 'too_small' },
    { path: ['email'], code: 'invalid_string' }
  ]);
});
```

### 10.2 Test Data Builders

```typescript
/**
 * Builder pattern for test data
 */
class ResponseBuilder {
  private data: any = {
    status: 'success',
    data: null,
    error: null,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };

  withStatus(status: 'success' | 'error' | 'partial') {
    this.data.status = status;
    return this;
  }

  withData(data: any) {
    this.data.data = data;
    this.data.error = null;
    return this;
  }

  withError(code: string, message: string) {
    this.data.data = null;
    this.data.error = { code, message, details: null, recoverable: false };
    return this;
  }

  withMetadata(metadata: any) {
    this.data.metadata = metadata;
    return this;
  }

  build() {
    return { ...this.data };
  }
}

// Usage
it('tests success response', () => {
  const response = new ResponseBuilder()
    .withStatus('success')
    .withData({ result: 'test' })
    .build();

  expect(schema.parse(response)).toEqual(response);
});
```

### 10.3 Parametrized Tests

```typescript
describe.each([
  { input: { status: 'success', data: 'test', error: null }, expected: true },
  { input: { status: 'error', data: null, error: { code: 'ERR', message: 'fail' } }, expected: true },
  { input: { status: 'invalid', data: null, error: null }, expected: false }
])('AgentResponse validation', ({ input, expected }) => {
  it(`should ${expected ? 'accept' : 'reject'} ${input.status}`, () => {
    const result = AgentResponseSchema.safeParse(input);
    expect(result.success).toBe(expected);
  });
});
```

### 10.4 Snapshot Testing for Errors

```typescript
it('should produce consistent error format', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().min(18)
  });

  const result = schema.safeParse({ name: 'X', age: 15 });

  if (!result.success) {
    // Snapshot error structure for regression testing
    expect(result.error.errors).toMatchSnapshot();
  }
});
```

---

## Summary of Key URLs

### Official Vitest Documentation

1. **Type Testing**: https://vitest.dev/guide/testing-types.html
   - `#type-testing` - Main overview
   - `#expecttype` - Type assertions

2. **vi.spyOn API**: https://vitest.dev/api/vi.html
   - `#vispyon` - Spying documentation
   - `#mock-functions` - Mock reference

3. **Expect Matchers**: https://vitest.dev/api/expect.html
   - `#toequal` - Deep equality
   - `#tomatchobject` - Partial matching
   - `#tohaveproperty` - Property checks

4. **Async Testing**: https://vitest.dev/guide/testing-types.html#async-testing
   - Promise rejection patterns
   - Timeout configuration

### Zod Documentation

1. **Zod GitHub**: https://github.com/colinhacks/zod
2. **Error Handling**: https://github.com/colinhacks/zod#error-handling
3. **Discriminated Unions**: https://zod.dev/?id=discriminated-unions
4. **safeParse()**: https://zod.dev/?id=safeparse

---

## Best Practice Checklist

### Schema Testing
- [ ] Test valid data passes with `parse()`
- [ ] Test invalid data fails with `safeParse()` and verify errors
- [ ] Test each discriminator variant for unions
- [ ] Test optional fields with `undefined`
- [ ] Test nullable fields with `null`
- [ ] Verify error messages and paths
- [ ] Test type inference with `z.infer<>`

### Vitest Patterns
- [ ] Use `describe()` blocks for organization
- [ ] Use `vi.spyOn()` for mocking
- [ ] Use `toMatchObject()` for partial validation
- [ ] Use `rejects.toThrow()` for async errors
- [ ] Restore mocks in `afterEach()`
- [ ] Group related tests in suites

### Type Safety
- [ ] Use discriminated unions for response types
- [ ] Use type guards for narrowing
- [ ] Prefer `null` over `undefined` for absent values (PRD 6.4.4)
- [ ] Use `expectType()` for compile-time checks
- [ ] Verify inferred types match expectations

---

*This guide is based on Zod v3.25.76 and Vitest v1.6.1*
*Last Updated: 2026-01-24*
