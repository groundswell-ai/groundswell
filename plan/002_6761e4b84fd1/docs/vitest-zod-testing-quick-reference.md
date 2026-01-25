# Vitest + Zod Testing Quick Reference

**Date**: 2026-01-24
**Versions**: Zod v3.25.76, Vitest v1.6.1

---

## Key URLs

### Vitest Documentation
| Topic | URL | Section |
|-------|-----|---------|
| Type Testing | https://vitest.dev/guide/testing-types.html | #type-testing |
| vi.spyOn | https://vitest.dev/api/vi.html | #vispyon |
| Expect Matchers | https://vitest.dev/api/expect.html | #toequal, #tomatchobject |
| Async Testing | https://vitest.dev/guide/testing-types.html | #async-testing |

### Zod Documentation
| Topic | URL |
|-------|-----|
| GitHub Repo | https://github.com/colinhacks/zod |
| Error Handling | https://github.com/colinhacks/zod#error-handling |
| Discriminated Unions | https://zod.dev/?id=discriminated-unions |
| safeParse() | https://zod.dev/?id=safeparse |

---

## Testing Checklist

### Schema Testing
- [ ] Test valid data passes with `parse()`
- [ ] Test invalid data fails with `safeParse()` + error verification
- [ ] Test each discriminator variant for unions
- [ ] Test optional fields with `undefined`
- [ ] Test nullable fields with `null`
- [ ] Verify error messages and paths
- [ ] Test type inference with `z.infer<>`

### Discriminated Unions
- [ ] Test each variant (success/error/partial)
- [ ] Verify discriminator field behavior
- [ ] Test invalid discriminator values
- [ ] Test type narrowing with type guards

### Null Handling (PRD 6.4.4)
- [ ] Use `null` for absent error in success responses
- [ ] Use `null` for absent data in error responses
- [ ] Use `.nullable()` for fields that can be `null`
- [ ] Use `.optional()` for fields that can be `undefined`

---

## Common Patterns

### 1. Test Valid Data
```typescript
const schema = z.object({ name: z.string() });
const valid = { name: 'test' };
expect(schema.parse(valid)).toEqual(valid);
```

### 2. Test Invalid Data
```typescript
const result = schema.safeParse(invalid);
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error.errors[0].path).toEqual(['name']);
}
```

### 3. Test Discriminated Union
```typescript
const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string() }),
  z.object({ status: z.literal('error'), error: z.string() })
]);

expect(schema.parse({ status: 'success', data: 'test' })).toBeDefined();
```

### 4. Test Optional vs Nullable
```typescript
const schema = z.object({
  optional: z.string().optional(),
  nullable: z.string().nullable()
});

expect(schema.parse({ nullable: null }).nullable).toBeNull();
expect(schema.parse({}).optional).toBeUndefined();
```

### 5. Mock with vi.spyOn
```typescript
const spy = vi.spyOn(obj, 'method').mockReturnValue('mocked');
expect(obj.method()).toBe('mocked');
spy.mockRestore();
```

### 6. Test Async Validation
```typescript
const result = await schema.safeParseAsync(data);
expect(result.success).toBe(true);
```

---

## File Structure

```
plan/002_6761e4b84fd1/docs/
├── vitest-zod-testing-guide.md           # Comprehensive guide (best practices)
├── agent-response-testing-examples.md     # AgentResponse-specific examples
└── vitest-zod-testing-quick-reference.md # This file (quick reference)
```

---

## Groundswell-Specific Patterns

### AgentResponse Schema Testing
```typescript
const schema = AgentResponseSchema(z.object({ result: z.string() }));

// Success
expect(schema.parse({
  status: 'success',
  data: { result: 'test' },
  error: null
})).toBeDefined();

// Error
expect(schema.parse({
  status: 'error',
  data: null,
  error: { code: 'ERR', message: 'fail', details: null, recoverable: false }
})).toBeDefined();
```

### Null Over Undefined (PRD 6.4.4)
```typescript
// Use null for absent values
expect(response.error).toBeNull();
expect(response.data).toBeNull();

// Use optional for truly optional fields
z.string().nullable() // can be null
z.string().optional() // can be undefined
```

---

## Test Structure Template

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('SchemaName', () => {
  describe('valid cases', () => {
    it('should accept valid input', () => {
      const result = schema.parse(validInput);
      expect(result).toEqual(validInput);
    });
  });

  describe('invalid cases', () => {
    it('should reject invalid input', () => {
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should infer correct type', () => {
      type Inferred = z.infer<typeof schema>;
      expectType<ExpectedType>({} as Inferred);
    });
  });
});
```

---

*Quick Reference for Groundswell AgentResponse Testing*
*Last Updated: 2026-01-24*
