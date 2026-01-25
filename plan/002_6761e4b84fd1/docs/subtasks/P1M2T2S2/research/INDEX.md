# TypeScript/Zod Adversarial Testing Research - Index

**Date**: 2026-01-24
**Task**: Research TypeScript/Zod adversarial testing best practices
**Status**: ✅ Complete

---

## Research Documents

This directory contains comprehensive research on adversarial testing patterns for TypeScript/Zod schemas.

### 📄 Quick Start

**Read First**: `RESEARCH_SUMMARY.md`
- Executive summary of findings
- Key discoveries from Zod's test suite
- Groundswell-specific recommendations
- URLs and references

### 📚 Detailed Guides

**Comprehensive Guide**: `typescript-zod-adversarial-testing-best-practices.md` (400+ lines)
- Core testing principles
- Discriminated union testing
- Edge case patterns
- Serialization testing
- Adversarial inputs
- Type guards
- Error validation
- Performance/security testing
- Common pitfalls
- Test utilities

**Quick Reference**: `zod-adversarial-testing-quick-reference.md`
- Lookup-style reference
- Test patterns
- Code examples
- Checklists

---

## Key Findings

### 1. Discriminated Union Testing

Test all discriminator variants, invalid discriminator values, and mismatched fields:

```typescript
const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string(), error: z.null() }),
  z.object({ status: z.literal('error'), data: z.null(), error: z.string() }),
]);

// Test valid variant
expect(schema.safeParse({ status: 'success', data: 'test', error: null }).success).toBe(true);

// Test invalid discriminator
expect(schema.safeParse({ status: 'invalid', data: 'test', error: null }).success).toBe(false);

// Test mismatched fields (valid discriminator, wrong data)
expect(schema.safeParse({ status: 'success', data: null, error: null }).success).toBe(false);
```

### 2. Undefined vs Null vs Missing

Critical distinction for testing:

| Input Type | `.optional()` | `.nullable()` | `.nullish()` |
|------------|---------------|---------------|--------------|
| `undefined` | ✅ Accept | ❌ Reject | ✅ Accept |
| `null` | ❌ Reject | ✅ Accept | ✅ Accept |
| Missing | ✅ Accept | ❌ Reject | ✅ Accept |

### 3. Extra Unknown Fields: Three Modes

1. **strip** (default) - Removes unknown keys silently
2. **passthrough** - Keeps unknown keys
3. **strict** - Rejects objects with unknown keys

### 4. Adversarial Input Patterns

Test for:
- Wrong discriminator values (case, typos, types)
- Type coercion attempts
- Boundary violations
- Special characters (unicode, emoji)
- Prototype pollution (`__proto__`, `constructor`)
- Circular references
- Non-serializable data (functions, symbols)

---

## Groundswell Applications

### AgentResponse Testing Enhancements

1. **Add adversarial status value tests**
   - Case variations: `'SUCCESS'`, `'Success'`, `'success '`
   - Typos: `'succes'`, `'errror'`
   - Wrong types: `1`, `true`, `null`, `undefined`

2. **Test extra fields with different modes**
   - Default (strip) - Extra fields removed
   - Passthrough - Extra fields kept
   - Strict - Extra fields rejected

3. **Validate null vs undefined compliance**
   - Ensure PRD 6.4.4: null not undefined for absent fields
   - Test error responses have `data: null`
   - Test success responses have `error: null`

4. **Serialization round-trip tests**
   - Verify all response types survive `JSON.parse(JSON.stringify(response))`
   - Test with nested objects, arrays, optional fields

---

## File Structure

```
plan/002_6761e4b84fd1/P1M2T2S2/research/
├── INDEX.md                                          # This file
├── RESEARCH_SUMMARY.md                               # Executive summary
├── typescript-zod-adversarial-testing-best-practices.md  # Comprehensive guide
├── zod-adversarial-testing-quick-reference.md        # Quick reference
└── README.md                                         # (optional) Overview
```

---

## URLs and References

### Internal Sources

**Zod v3 Test Suite**: `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/`
- discriminated-unions.test.ts
- object.test.ts
- optional.test.ts
- nullable.test.ts
- nan.test.ts
- lazy.test.ts
- function.test.ts
- error.test.ts

**Groundswell Tests**:
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent-error-codes.test.ts`

**Groundswell Research**:
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/zod-validation-patterns-research.md`

### External Documentation (Not Fetched Due to Rate Limits)

- **Zod**: https://zod.dev/
- **Zod GitHub**: https://github.com/colinhacks/zod
- **TypeScript**: https://www.typescriptlang.org/docs/handbook/
- **Vitest**: https://vitest.dev/
- **fast-check**: https://github.com/dubzzc/fast-check

---

## Common Pitfalls

### ❌ Don't

```typescript
// Only test success path
it('should validate data', () => {
  const result = schema.parse(data); // Can throw!
});

// Confuse optional and nullable
const schema = z.object({
  field: z.string().optional(), // Accepts undefined, NOT null
});

// Assume strict mode is default
const schema = z.object({ name: z.string() }); // Default is strip, not strict
```

### ✅ Do

```typescript
// Test both paths
it('should validate correct data', () => {
  const result = schema.safeParse(validData);
  expect(result.success).toBe(true);
});

it('should reject invalid data', () => {
  const result = schema.safeParse(invalidData);
  expect(result.success).toBe(false);
});

// Use correct modifier
const schema = z.object({
  optional: z.string().optional(),  // undefined allowed
  nullable: z.string().nullable(),  // null allowed
  nullish: z.string().nullish(),    // both allowed
});

// Be explicit about mode
const schema = z.object({ name: z.string() }).strict(); // Reject unknown keys
```

---

## Test Checklist

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

- [ ] Wrong discriminator values (case, typos, types)
- [ ] Type coercion attempts (numbers for strings, etc.)
- [ ] Boundary violations (just below/above limits)
- [ ] Special characters (unicode, emoji, control chars)
- [ ] Prototype pollution attempts
- [ ] Circular references
- [ ] Extremely large payloads
- [ ] Non-serializable data (functions, symbols)

---

## Next Steps

1. ✅ Research complete
2. ✅ Documentation created
3. ⏭️ Review with team
4. ⏭️ Apply patterns to AgentResponse tests
5. ⏭️ Create test utilities
6. ⏭️ Add adversarial test cases

---

## Author Notes

**Research Constraints**: Web search APIs were rate-limited during this research. All findings are based on:
- Analysis of Zod v3's internal test suite (node_modules/zod/src/v3/tests/)
- Groundswell's existing test patterns
- TypeScript type system behavior

**Quality Assurance**: All code examples were verified against Zod v3.23.0 (the version used by Groundswell).

**Maintainability**: These patterns are based on Zod's own testing approach, ensuring long-term compatibility.

---

## Quick Links

- **Summary**: `RESEARCH_SUMMARY.md`
- **Full Guide**: `typescript-zod-adversarial-testing-best-practices.md`
- **Quick Reference**: `zod-adversarial-testing-quick-reference.md`
- **Zod Tests**: `/node_modules/zod/src/v3/tests/`
- **Your Tests**: `/src/__tests__/unit/agent-response.test.ts`
