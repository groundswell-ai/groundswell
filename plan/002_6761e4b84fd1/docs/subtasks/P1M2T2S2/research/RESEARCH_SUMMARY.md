# TypeScript/Zod Adversarial Testing Research Summary

**Research Date**: 2026-01-24
**Status**: Complete
**Constraint**: Web search APIs were rate-limited; research based on Zod library's internal test suite analysis

---

## Research Scope

This research focused on finding best practices for adversarial testing of TypeScript/Zod schemas, specifically for:

1. **Discriminated union testing** - Testing status field discrimination
2. **Edge cases** - Undefined fields, extra unknown fields, wrong status values
3. **Non-serializable data** - Circular references, functions, symbols
4. **Invalid metadata structures** - Nested validation errors
5. **Runtime validation vs compile-time type checking** - Type guards and narrowing

---

## Key Findings

### 1. Zod's Own Test Suite is the Best Resource

**Discovery**: The Zod library (`/node_modules/zod/src/v3/tests/`) contains comprehensive test patterns that serve as the authoritative source for best practices.

**Key Files Analyzed**:
- `discriminated-unions.test.ts` - Discriminated union patterns
- `object.test.ts` - Object validation, strip/passthrough/strict modes
- `optional.test.ts` - Optional field behavior vs nullable
- `nullable.test.ts` - Nullable field behavior vs optional
- `nan.test.ts` - Special number values
- `lazy.test.ts` - Recursive schemas and circular references
- `function.test.ts` - Function validation
- `error.test.ts` - Error structure validation

### 2. Discriminated Union Testing Patterns

**Best Practice**: Test all discriminator variants, invalid discriminator values, and mismatched fields.

**Pattern from Zod tests**:
```typescript
const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
  z.object({ status: z.literal('error'), data: z.null(), error: z.string() }),
]);

// Test valid variants
it('should validate correct variant', () => {
  const result = schema.safeParse({ status: 'success', data: 'test', error: null });
  expect(result.success).toBe(true);
});

// Test invalid discriminator
it('should reject invalid discriminator value', () => {
  const result = schema.safeParse({ status: 'invalid', data: 'test', error: null });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].code).toEqual(ZodIssueCode.invalid_union_discriminator);
  }
});

// Test mismatched fields (valid discriminator, wrong data)
it('should reject mismatched fields', () => {
  const result = schema.safeParse({ status: 'success', data: null, error: null });
  expect(result.success).toBe(false);
});
```

### 3. Undefined vs Null vs Missing

**Critical Distinction**:
- `.optional()` - Accepts `undefined`, rejects `null`, field may be missing
- `.nullable()` - Accepts `null`, rejects `undefined`, field must be present
- `.nullish()` - Accepts both `null` and `undefined`, field may be missing

**Test Matrix**:
| Input Type | `.optional()` | `.nullable()` | `.nullish()` |
|------------|---------------|---------------|--------------|
| `undefined` | ✅ Accept | ❌ Reject | ✅ Accept |
| `null` | ❌ Reject | ✅ Accept | ✅ Accept |
| Missing | ✅ Accept | ❌ Reject | ✅ Accept |

### 4. Extra Unknown Fields: Three Modes

**Discovery**: Zod has three modes for handling unknown fields:

1. **strip** (default) - Removes unknown keys silently
2. **passthrough** - Keeps unknown keys
3. **strict** - Rejects objects with unknown keys

**Test Pattern**:
```typescript
const input = { name: 'test', extra: 'field' };

// Default behavior: strips unknown keys
const defaultSchema = z.object({ name: z.string() });
const result = defaultSchema.safeParse(input);
// Success, but result.data = { name: 'test' } (extra is stripped)

// Passthrough: keeps unknown keys
const passthroughSchema = z.object({ name: z.string() }).passthrough();
const result = passthroughSchema.safeParse(input);
// Success, result.data = { name: 'test', extra: 'field' }

// Strict: rejects unknown keys
const strictSchema = z.object({ name: z.string() }).strict();
const result = strictSchema.safeParse(input);
// Failure: "Unrecognized key(s) in object: 'extra'"
```

### 5. Special Number Values

**Edge Cases**: Zod distinguishes between regular numbers, NaN, and Infinity.

```typescript
const numberSchema = z.number();
const nanSchema = z.nan();
const finiteSchema = z.number().finite();

// Regular numbers
expect(numberSchema.safeParse(42).success).toBe(true);
expect(numberSchema.safeParse(0).success).toBe(true);
expect(numberSchema.safeParse(-0).success).toBe(true);

// NaN (special schema required)
expect(nanSchema.safeParse(Number.NaN).success).toBe(true);
expect(numberSchema.safeParse(Number.NaN).success).toBe(false); // regular schema rejects

// Infinity
expect(numberSchema.safeParse(Infinity).success).toBe(true);
expect(finiteSchema.safeParse(Infinity).success).toBe(false); // finite rejects Infinity
```

### 6. Adversarial Input Patterns

**Key Patterns to Test**:

1. **Wrong discriminator values** - Case sensitivity, typos, wrong types
2. **Type coercion attempts** - Passing numbers for strings, etc.
3. **Boundary violations** - Just below/above min/max limits
4. **Special characters** - Unicode, emoji, control characters
5. **Prototype pollution** - `__proto__`, `constructor`, `prototype` keys
6. **Circular references** - Using `z.lazy()` for recursive schemas

**Example**:
```typescript
const adversarialInputs = [
  { status: 'SUCCESS' },  // wrong case
  { status: 'succes' },   // typo
  { status: 1 },          // wrong type
  { status: null },       // null for literal
  { __proto__: 'polluted' }, // prototype pollution
];

adversarialInputs.forEach(input => {
  expect(schema.safeParse(input).success).toBe(false);
});
```

### 7. Serialization Edge Cases

**Critical Tests**:
- JSON round-trip preserves data
- Functions are not JSON-serializable
- Circular references cause JSON.stringify to throw
- Symbols are lost during serialization

```typescript
// Functions
const withFunction = { name: 'test', func: () => {} };
JSON.stringify(withFunction); // { name: 'test', func: undefined }

// Circular references
const circular: any = { name: 'test' };
circular.self = circular;
JSON.stringify(circular); // TypeError: Converting circular structure to JSON

// Symbols
const withSymbol = { name: 'test', [Symbol('key')]: 'value' };
JSON.stringify(withSymbol); // { name: 'test' } (symbol is lost)
```

### 8. Recursive Schemas with z.lazy()

**Pattern**: Use `z.lazy()` for recursive and mutually recursive schemas.

```typescript
// Recursive schema
const Category: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(Category),
  })
);

// Mutually recursive schemas
interface A { val: number; b: B }
interface B { val: number; a?: A }

const ASchema: z.ZodType<A> = z.lazy(() =>
  z.object({ val: z.number(), b: BSchema })
);

const BSchema: z.ZodType<B> = z.lazy(() =>
  z.object({ val: z.number(), a: ASchema.optional() })
);
```

### 9. Type Guard Testing

**Best Practice**: Verify TypeScript type narrowing works correctly with discriminated unions.

```typescript
function isSuccess<T>(r: AgentResponse<T>): r is Extract<AgentResponse<T>, { status: 'success' }> {
  return r.status === 'success';
}

it('should narrow type with type guard', () => {
  const response: AgentResponse<string> = { status: 'success', data: 'test', error: null };

  if (isSuccess(response)) {
    // TypeScript knows response.data is string and response.error is null
    expect(response.data.toUpperCase()).toBe('TEST');
    // @ts-expect-error - error should be null
    expect(response.error.code).toBeUndefined();
  }
});
```

---

## Deliverables

### 1. Comprehensive Guide (400+ lines)

**File**: `/plan/002_6761e4b84fd1/P1M2T2S2/research/typescript-zod-adversarial-testing-best-practices.md`

**Contents**:
- Core testing principles
- Discriminated union testing patterns
- Edge case testing (undefined, null, NaN, Infinity, etc.)
- Serialization/deserialization testing
- Adversarial input patterns
- Type guard testing
- Error validation testing
- Performance and security testing
- Common pitfalls and solutions
- Test utility patterns

### 2. Quick Reference Guide

**File**: `/plan/002_6761e4b84fd1/P1M2T2S2/research/zod-adversarial-testing-quick-reference.md`

**Contents**:
- Discriminated union testing patterns
- Edge case test matrix (undefined vs null vs missing)
- Extra fields mode comparison (strip/passthrough/strict)
- Special number values
- Array edge cases
- Adversarial inputs checklist
- Error testing patterns
- Type guard testing
- Serialization testing
- Test utilities
- Common pitfalls
- Quick checklist

---

## Groundswell-Specific Recommendations

### 1. Apply to AgentResponse Testing

Based on the research, Groundswell should enhance its `AgentResponse<T>` testing with:

1. **Adversarial status value testing** - Test case variations, typos, wrong types
2. **Metadata validation** - Test extra fields with strict/passthrough modes
3. **Null vs undefined** - Ensure PRD 6.4.4 compliance (null not undefined)
4. **Error code validation** - Test all error codes are strings and follow SCREAMING_SNAKE_CASE
5. **Serialization round-trips** - Verify all response types survive JSON.stringify/parse

### 2. Add Missing Test Cases

Current tests cover the happy path well. Consider adding:

1. **Wrong discriminator values** - `'SUCCESS'`, `'Success'`, `'succes'`, etc.
2. **Type coercion attacks** - Numbers for strings, strings for booleans, etc.
3. **Boundary values** - Just below/above limits for string length, array size, etc.
4. **Special characters** - Unicode, emoji, control characters in strings
5. **Prototype pollution** - `__proto__`, `constructor`, `prototype` keys
6. **Non-serializable data** - Functions, circular references, symbols

### 3. Create Test Utilities

Extract common patterns into reusable utilities:

```typescript
export const testingHelpers = {
  expectErrorCode: (result: z.SafeParseError<any>, code: z.ZodIssueCode) => { /* ... */ },
  expectErrorAtPath: (result: z.SafeParseError<any>, path: (string | number)[]) => { /* ... */ },
  expectSuccess: <T>(result: z.SafeParseSuccess<T>): T => { /* ... */ },
  generateInvalidInputs: (validInput: any) => { /* ... */ },
};
```

---

## URLs and References

### Internal Sources (Local Files)

1. **Zod v3 Test Suite**: `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/`
   - discriminated-unions.test.ts
   - object.test.ts
   - optional.test.ts
   - nullable.test.ts
   - nan.test.ts
   - lazy.test.ts
   - function.test.ts
   - error.test.ts

2. **Groundswell Test Files**:
   - `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
   - `/home/dustin/projects/groundswell/src/__tests__/unit/agent-error-codes.test.ts`

3. **Groundswell Research**:
   - `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/zod-validation-patterns-research.md`

### External Documentation (Not Fetched Due to Rate Limits)

The following external resources should be consulted when API limits reset:

1. **Zod Documentation**: https://zod.dev/
2. **Zod GitHub Repository**: https://github.com/colinhacks/zod
3. **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
4. **Vitest Documentation**: https://vitest.dev/
5. **fast-check (Property-Based Testing)**: https://github.com/dubzzc/fast-check

---

## Common Pitfalls Identified

### 1. Confusing optional() with nullable()

**Issue**: `.optional()` accepts `undefined`, `.nullable()` accepts `null`. They are NOT interchangeable.

**Solution**: Use `.nullish()` if both should be accepted, or test explicitly.

### 2. Assuming strict() is Default

**Issue**: Zod's default mode is `strip`, not `strict`. Unknown keys are silently removed.

**Solution**: Use `.strict()` for input validation where unknown keys should be rejected.

### 3. Not Testing After Transformations

**Issue**: Transformations change the data type. Testing only input validation is insufficient.

**Solution**: Test both input validation and output structure after transformation.

### 4. Union Ordering Issues

**Issue**: Regular `z.union()` tries schemas in order, which can lead to unexpected errors.

**Solution**: Use `z.discriminatedUnion()` when possible to avoid ordering dependencies.

### 5. Missing Round-trip Tests

**Issue**: Data that validates may not survive JSON serialization.

**Solution**: Always test `JSON.parse(JSON.stringify(data))` for serializable schemas.

---

## Code Examples Summary

### Discriminated Union Testing

```typescript
const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
  z.object({ status: z.literal('error'), data: z.null(), error: z.string() }),
]);

// Test valid, invalid discriminator, mismatched fields
expect(schema.safeParse({ status: 'success', data: 'test', error: null }).success).toBe(true);
expect(schema.safeParse({ status: 'invalid', data: 'test', error: null }).success).toBe(false);
expect(schema.safeParse({ status: 'success', data: null, error: null }).success).toBe(false);
```

### Edge Case Testing

```typescript
// Test undefined vs null vs missing
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
});

expect(schema.safeParse({ required: 'test' }).success).toBe(true); // optional missing
expect(schema.safeParse({ required: 'test', optional: undefined }).success).toBe(true);
expect(schema.safeParse({ required: 'test', nullable: null }).success).toBe(true);
```

### Error Validation

```typescript
const result = schema.safeParse(invalidData);

expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error.errors[0].code).toEqual(ZodIssueCode.invalid_type);
  expect(result.error.errors[0].path).toEqual(['fieldName']);
}
```

---

## Next Steps

1. ✅ **Research complete** - Analyzed Zod's test suite and Groundswell's patterns
2. ✅ **Documentation created** - Comprehensive guide and quick reference
3. ⏭️ **Apply patterns** - Enhance AgentResponse testing with adversarial cases
4. ⏭️ **Create utilities** - Extract reusable test helpers
5. ⏭️ **Team review** - Share findings with team for adoption

---

## Conclusion

Despite web search API rate limits, comprehensive adversarial testing best practices were successfully compiled by analyzing:

1. **Zod's internal test suite** - The authoritative source for Zod testing patterns
2. **Groundswell's existing tests** - Current patterns and gaps
3. **TypeScript type system** - Compile-time vs runtime validation

The research provides actionable patterns for:
- Testing discriminated unions (status field discrimination)
- Handling undefined vs null vs missing fields
- Testing extra unknown fields (strip/passthrough/strict modes)
- Validating non-serializable data (circular refs, functions, symbols)
- Testing runtime validation vs compile-time type checking

All findings are documented in two comprehensive guides with code examples and test patterns ready for immediate application.
