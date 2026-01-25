# Zod Adversarial Testing Quick Reference

**Purpose**: Quick lookup for common Zod testing patterns and edge cases

---

## Discriminated Union Testing

### Basic Pattern

```typescript
const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
  z.object({ status: z.literal('error'), data: z.null(), error: z.string() }),
]);

// Test valid variants
expect(schema.safeParse({ status: 'success', data: 'test', error: null }).success).toBe(true);
expect(schema.safeParse({ status: 'error', data: null, error: 'fail' }).success).toBe(true);

// Test invalid discriminator
expect(schema.safeParse({ status: 'invalid', data: 'test', error: null }).success).toBe(false);

// Test mismatched fields (valid discriminator, wrong data)
expect(schema.safeParse({ status: 'success', data: null, error: null }).success).toBe(false);
```

### Test All Discriminator Types

```typescript
// String discriminator
z.object({ type: z.literal('success') })

// Number discriminator
z.object({ type: z.literal(1) })

// Boolean discriminator
z.object({ type: z.literal(true) })

// Null discriminator
z.object({ type: z.literal(null) })

// Undefined discriminator
z.object({ type: z.literal(undefined) })

// Enum discriminator
z.object({ type: z.enum(['a', 'b', 'c']) })
```

---

## Edge Cases: Undefined vs Null vs Missing

### Test Matrix

| Schema Input | undefined | null | missing |
|-------------|-----------|------|---------|
| `.optional()` | ✅ Accept | ❌ Reject | ✅ Accept |
| `.nullable()` | ❌ Reject | ✅ Accept | ❌ Reject |
| `.nullish()` | ✅ Accept | ✅ Accept | ✅ Accept |
| (none) | ❌ Reject | ❌ Reject | ❌ Reject |

### Test Code

```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  nullish: z.string().nullish(),
});

// Test undefined
expect(schema.safeParse({ required: 'test', optional: undefined }).success).toBe(true);
expect(schema.safeParse({ required: 'test', nullable: undefined }).success).toBe(false);
expect(schema.safeParse({ required: 'test', nullish: undefined }).success).toBe(true);

// Test null
expect(schema.safeParse({ required: 'test', optional: null }).success).toBe(false);
expect(schema.safeParse({ required: 'test', nullable: null }).success).toBe(true);
expect(schema.safeParse({ required: 'test', nullish: null }).success).toBe(true);

// Test missing
expect(schema.safeParse({ required: 'test' }).success).toBe(true);
```

---

## Extra Fields: strip vs passthrough vs strict

### Mode Comparison

| Mode | Extra Fields | Use Case |
|------|--------------|----------|
| **strip** (default) | Removed | API responses with extra fields |
| **passthrough** | Kept | Forwarding data, metadata preservation |
| **strict** | Rejected | Input validation, security-critical |

### Test Code

```typescript
const input = { name: 'test', extra: 'field' };

// Default: strips unknown keys
const defaultSchema = z.object({ name: z.string() });
expect(defaultSchema.safeParse(input).success).toBe(true);
// Result: { name: 'test' }

// Passthrough: keeps unknown keys
const passthroughSchema = z.object({ name: z.string() }).passthrough();
expect(passthroughSchema.safeParse(input).success).toBe(true);
// Result: { name: 'test', extra: 'field' }

// Strict: rejects unknown keys
const strictSchema = z.object({ name: z.string() }).strict();
expect(strictSchema.safeParse(input).success).toBe(false);
// Error: "Unrecognized key(s) in object: 'extra'"
```

---

## Special Number Values

### Test Cases

```typescript
const numberSchema = z.number();
const nanSchema = z.nan();
const finiteSchema = z.number().finite();

// Regular numbers
expect(numberSchema.safeParse(42).success).toBe(true);
expect(numberSchema.safeParse(0).success).toBe(true);
expect(numberSchema.safeParse(-0).success).toBe(true);

// NaN
expect(nanSchema.safeParse(Number.NaN).success).toBe(true);
expect(numberSchema.safeParse(Number.NaN).success).toBe(false); // regular schema rejects NaN

// Infinity
expect(numberSchema.safeParse(Infinity).success).toBe(true);
expect(numberSchema.safeParse(-Infinity).success).toBe(true);
expect(finiteSchema.safeParse(Infinity).success).toBe(false); // finite rejects Infinity
```

---

## Array Edge Cases

```typescript
const arraySchema = z.array(z.string()).min(1).max(10);

// Empty array
expect(arraySchema.safeParse([]).success).toBe(false); // min(1) rejects empty

// Single element
expect(arraySchema.safeParse(['test']).success).toBe(true);

// At boundary
expect(arraySchema.safeParse(Array(10).fill('test')).success).toBe(true); // max is 10

// Over boundary
expect(arraySchema.safeParse(Array(11).fill('test')).success).toBe(false); // exceeds max
```

---

## Adversarial Inputs Checklist

### Wrong Discriminator Values

```typescript
// Case variations
{ status: 'SUCCESS' }  // should be 'success'
{ status: 'Success' }  // should be 'success'

// Typos
{ status: 'succes' }   // missing 's'
{ status: 'errror' }   // extra 'r'

// Wrong types
{ status: 1 }
{ status: true }
{ status: null }
{ status: undefined }
```

### Type Coercion Attempts

```typescript
const schema = z.object({
  string: z.string(),
  number: z.number(),
  boolean: z.boolean(),
});

// These should ALL FAIL:
{ string: 123 }           // number, not string
{ number: '123' }         // string, not number
{ boolean: 'true' }       // string, not boolean
```

### Boundary Values

```typescript
const schema = z.object({
  string: z.string().min(3).max(10),
  number: z.number().min(0).max(100),
  array: z.array(z.number()).min(1).max(5),
});

// Test boundaries
{ string: 'ab' }          // too short (min is 3)
{ string: 'abcdefghijk' } // too long (max is 10)
{ number: -1 }            // below min
{ number: 101 }           // above max
{ array: [] }             // empty (min is 1)
{ array: [1,2,3,4,5,6] }  // too many (max is 5)
```

---

## Error Testing Patterns

### Test Error Structure

```typescript
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
```

### Test Error Path

```typescript
const schema = z.object({
  level1: z.object({
    level2: z.object({
      value: z.string(),
    }),
  }),
});

const result = schema.safeParse({
  level1: { level2: { value: 42 } }, // wrong type
});

if (!result.success) {
  expect(result.error.errors[0].path).toEqual(['level1', 'level2', 'value']);
}
```

---

## Type Guard Testing

### Basic Type Guards

```typescript
function isSuccess<T>(r: AgentResponse<T>): r is Extract<AgentResponse<T>, { status: 'success' }> {
  return r.status === 'success';
}

it('should narrow type with type guard', () => {
  const response: AgentResponse<string> = { status: 'success', data: 'test', error: null };

  if (isSuccess(response)) {
    // TypeScript knows response.data is string
    expect(response.data.toUpperCase()).toBe('TEST');
    // @ts-expect-error - error is null here
    expect(response.error.code).toBeUndefined();
  }
});
```

---

## Serialization Testing

### JSON Round-trip

```typescript
const original = {
  status: 'success' as const,
  data: { result: 'test' },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() },
};

// Test round-trip
const roundTripped = JSON.parse(JSON.stringify(original));
expect(roundTripped).toEqual(original);

// Validate after round-trip
const result = schema.safeParse(roundTripped);
expect(result.success).toBe(true);
```

### Non-serializable Data

```typescript
// Functions
{ func: () => {} }
// JSON.stringify → { func: undefined } (func is lost)

// Circular references
const data: any = { name: 'test' };
data.self = data;
// JSON.stringify → TypeError (circular structure)

// Symbols
{ symbol: Symbol('test') }
// JSON.stringify → {} (symbol is lost)
```

---

## Test Utilities

### Helper Functions

```typescript
// Expect specific error code
export function expectErrorCode(result: z.SafeParseError<any>, code: z.ZodIssueCode) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].code).toEqual(code);
  }
}

// Expect error at path
export function expectErrorAtPath(result: z.SafeParseError<any>, path: (string | number)[]) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].path).toEqual(path);
  }
}

// Assert success and return data
export function expectSuccess<T>(result: z.SafeParseSuccess<T>): T {
  expect(result.success).toBe(true);
  return result.data;
}
```

---

## Common Pitfalls

### ❌ Don't: Only test success path

```typescript
it('should validate data', () => {
  const result = schema.parse(data); // Can throw!
});
```

### ✅ Do: Test both paths

```typescript
it('should validate correct data', () => {
  const result = schema.safeParse(validData);
  expect(result.success).toBe(true);
});

it('should reject invalid data', () => {
  const result = schema.safeParse(invalidData);
  expect(result.success).toBe(false);
});
```

---

## Adversarial Test Generator

```typescript
/**
 * Generate adversarial inputs for testing
 */
export function generateAdversarialInputs(schema: z.ZodTypeAny, validInput: any) {
  return [
    // Basic wrong types
    null,
    undefined,
    {},
    [],

    // Wrong discriminator values (for discriminated unions)
    ...generateWrongDiscriminators(validInput),

    // Boundary values
    ...generateBoundaryValues(validInput),

    // Type coercion attempts
    ...generateTypeCoercionAttempts(validInput),

    // Extra fields
    { ...validInput, extra: 'field' },

    // Malformed data
    JSON.parse(JSON.stringify(validInput).replace(/"/g, '')),
  ];
}
```

---

## Quick Checklist

### Schema Validation Tests

- [ ] Valid data passes
- [ ] Invalid data fails with correct error code
- [ ] Error path is correct for nested structures
- [ ] Undefined vs null vs missing handled correctly
- [ ] Boundary values tested (min/max)
- [ ] Special values tested (NaN, Infinity, empty string)
- [ ] Extra fields handled per schema mode
- [ ] Type guards narrow correctly
- [ ] JSON round-trip preserves data
- [ ] Discriminated union variants all tested

### Adversarial Tests

- [ ] Wrong discriminator values
- [ ] Type coercion attempts
- [ ] Boundary violations
- [ ] Special characters (unicode, emoji)
- [ ] Prototype pollution attempts
- [ ] Circular references
- [ ] Extremely large payloads
- [ ] Non-serializable data

---

## References

- Full guide: `/plan/002_6761e4b84fd1/P1M2T2S2/research/typescript-zod-adversarial-testing-best-practices.md`
- Zod tests: `/node_modules/zod/src/v3/tests/`
- Groundswell tests: `/src/__tests__/unit/agent-response.test.ts`
