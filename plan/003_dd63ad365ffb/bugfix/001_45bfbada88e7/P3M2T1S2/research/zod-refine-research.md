# Zod .refine() Research for AgentResponse Schema Strengthening

**Date:** January 26, 2026
**Work Item:** P3.M2.T1.S2 - Add Zod refinement for validation
**Research Agent:** Agent analysis of local Zod source code and test files

---

## Executive Summary

This research document compiles best practices and patterns for using Zod `.refine()` and `.superRefine()` with discriminated unions, specifically for strengthening the `AgentResponseSchema` to enforce consistency between the `status` field and the `data`/`error` fields.

**Key Finding:** The current `AgentResponseSchema` uses `z.discriminatedUnion()` which already provides basic type-level separation, but does NOT enforce runtime validation that ensures `status='success'` always has `error=null` and `data!=null`. We need to add `.superRefine()` to catch previously allowed invalid combinations.

---

## 1. Current AgentResponseSchema Implementation

### Location
- **File:** `src/types/agent.ts`
- **Lines:** 912-993

### Current Structure
```typescript
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),  // PRD 6.4.4: null not undefined
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

### What It Currently Validates
- ✅ Discriminated union structure (status determines which variant)
- ✅ Basic type safety (string, number, boolean, object)
- ✅ Required fields are present
- ✅ `null` instead of `undefined` (PRD 6.4.4 compliance)

### What It DOESN'T Validate (The Gaps)
- ❌ Runtime consistency between `status` and `data`/`error` values
- ❌ Prevents `status='success'` with `error!=null` at runtime (only at compile-time after P3.M2.T1.S1)
- ❌ Prevents `status='error'` with `data!=null` at runtime (only at compile-time after P3.M2.T1.S1)
- ❌ Ensures `data` is non-null for `status='success'`
- ❌ Ensures `error` is non-null for `status='error'`

**Critical Insight:** After P3.M2.T1.S1 (discriminated union refactor), TypeScript will catch these errors at compile-time. However, Zod validation runs at RUNTIME and should also catch these errors for:
1. Data from external sources (API calls, user input, JSON parsing)
2. Runtime type assertions
3. Defensive programming
4. Clear validation error messages

---

## 2. Zod .refine() Patterns for Discriminated Unions

### Pattern 1: Refine on Individual Union Members (Recommended)

**Best for:** Variant-specific validation logic

```typescript
const successSchema = z.object({
  status: z.literal('success'),
  data: z.any(),
  error: z.null(),
}).superRefine((data, ctx) => {
  if (data.error !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Error must be null when status is 'success'",
      path: ['error'],
    });
  }
  if (data.data === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Data must be non-null when status is 'success'",
      path: ['data'],
    });
  }
});
```

**Why this is recommended:**
- Only runs for the specific variant
- Clear error messages with proper paths
- Type-safe within the variant context
- Performance: Only checks relevant variant

### Pattern 2: Refine on Entire Union (Alternative)

**Best for:** Cross-variant validation rules

```typescript
const schema = z.discriminatedUnion('status', [
  successSchema,
  errorSchema,
  partialSchema,
]).superRefine((data, ctx) => {
  if (data.status === 'success') {
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='success' but error is non-null",
        path: ['error'],
      });
    }
    if (data.data === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='success' but data is null",
        path: ['data'],
      });
    }
  } else if (data.status === 'error') {
    if (data.data !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='error' but data is non-null",
        path: ['data'],
      });
    }
    if (data.error === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='error' but error is null",
        path: ['error'],
      });
    }
  }
});
```

**Trade-offs:**
- ✅ Single place for all cross-field validation
- ✅ Can see all rules together
- ❌ More complex logic
- ❌ Type narrowing requires type guards

### Pattern 3: Using .refine() for Simple Checks

**Best for:** Single boolean conditions

```typescript
const successSchema = z.object({
  status: z.literal('success'),
  data: z.any(),
  error: z.null(),
}).refine(
  (data) => data.error === null,
  "Error must be null when status is 'success'"
).refine(
  (data) => data.data !== null,
  "Data must be non-null when status is 'success'"
);
```

**Limitations:**
- ❌ Cannot specify error path (errors show on entire object)
- ❌ Cannot add multiple issues at once
- ❌ Less flexible error messages

**Recommendation:** Use `.superRefine()` instead for better error messages.

---

## 3. .superRefine() vs .refine() Comparison

| Aspect | .refine() | .superRefine() |
|--------|-----------|----------------|
| Error messages | Single string | Multiple issues with paths |
| Error location | Entire object | Specific field paths |
| Flexibility | Simple boolean | Complex logic with ctx |
| Type safety | Good | Better (type narrowing) |
| Best for | Simple checks | Cross-field validation |

**Recommendation for AgentResponseSchema:** Use `.superRefine()` on individual union members for:
1. Clear error paths (`['error']`, `['data']`)
2. Multiple validation issues
3. Better error messages
4. Variant-specific logic

---

## 4. Error Message Best Practices

### Pattern 1: Include Condition and Expected Value

```typescript
// Good
ctx.addIssue({
  code: z.ZodIssueCode.custom,
  message: "Error must be null when status is 'success'",
  path: ['error'],
});

// Bad
ctx.addIssue({
  code: z.ZodIssueCode.custom,
  message: "Invalid error",
  path: ['error'],
});
```

### Pattern 2: Include Actual vs Expected Values

```typescript
.superRefine((data, ctx) => {
  if (data.status === 'success' && data.error !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected error to be null, but got: ${JSON.stringify(data.error)}`,
      path: ['error'],
    });
  }
})
```

**Note:** This is useful for debugging but may expose sensitive information. Use with caution.

### Pattern 3: Contextual Messages with Status

```typescript
if (data.status === 'success' && data.error !== null) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Invalid state for status='success': error field must be null`,
    path: ['error'],
  });
}
```

---

## 5. Performance Considerations

### Key Insights

1. **Discriminated unions are optimized in Zod**
   - Zod validates the discriminator first
   - Only the matching variant's refinements run
   - Faster than regular unions

2. **Refinement order matters**
   - Put fast checks first (null checks, typeof)
   - Put expensive checks last (regex, async operations)

3. **Avoid redundant refinements**
   - The schema already enforces `error: z.null()` for success
   - But refinement ensures it's ACTUALLY null at runtime
   - Small overhead for important safety

### Performance Pattern: Fast Checks First

```typescript
.superRefine((data, ctx) => {
  // Fast: Null check (O(1))
  if (data.error !== null) {
    ctx.addIssue({ /* ... */ });
    return; // Early exit
  }

  // Slower: Only if null check passes
  if (data.data === null) {
    ctx.addIssue({ /* ... */ });
  }

  // Slowest: Complex validation (if needed)
  if (complexValidation(data)) {
    ctx.addIssue({ /* ... */ });
  }
})
```

---

## 6. Zod Library Limitations and Gotchas

### Gotcha 1: Refinements Don't Narrow Types

```typescript
// This doesn't work as expected
const schema = z.object({
  status: z.literal('success'),
  error: z.null(),
}).refine((val): val is { error: null; extra: "narrowed" } => {
  // Type assertion doesn't propagate to inferred type
  return true;
});
```

**Workaround:** Use TypeScript type assertions or type guards separately.

### Gotcha 2: Fatal Refinements Stop All Validation

```typescript
.superRefine((val, ctx) => {
  if (val.error !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "error must be null",
      fatal: true, // This stops ALL further validation!
    });
  }
})
```

**Recommendation:** Avoid `fatal: true` unless you explicitly want to stop validation.

### Gotcha 3: Refinement Order Matters

```typescript
.refine(check1, { path: ['field1'], message: 'error1' })
.refine(check2, { path: ['field2'], message: 'error2' })
// If check1 fails, check2 never runs
```

**Solution:** Use `.superRefine()` to report multiple issues at once.

---

## 7. Recommended Implementation for AgentResponseSchema

### Option A: Refine on Individual Union Members (Recommended)

```typescript
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Ensure error is actually null (runtime check)
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Error field must be null when status is 'success'",
        path: ['error'],
      });
    }
    // Ensure data is not null (for non-nullable dataSchema)
    // Note: This depends on whether dataSchema accepts null
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Ensure data is actually null (runtime check)
    if (data.data !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data field must be null when status is 'error'",
        path: ['data'],
      });
    }
    // Ensure error is not null (already enforced by AgentErrorDetailsSchema)
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Ensure error is actually null (runtime check)
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Error field must be null when status is 'partial'",
        path: ['error'],
      });
    }
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

### Option B: Refine on Entire Union (Alternative)

```typescript
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema])
    .superRefine((data, ctx) => {
      // Validate success status constraints
      if (data.status === 'success') {
        if (data.error !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state: status='success' but error is non-null",
            path: ['error'],
          });
        }
        if (data.data === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state: status='success' but data is null",
            path: ['data'],
          });
        }
      }
      // Validate error status constraints
      else if (data.status === 'error') {
        if (data.data !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state: status='error' but data is non-null",
            path: ['data'],
          });
        }
        if (data.error === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state: status='error' but error is null",
            path: ['error'],
          });
        }
      }
      // Validate partial status constraints
      else if (data.status === 'partial') {
        if (data.error !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state: status='partial' but error is non-null",
            path: ['error'],
          });
        }
      }
    });
}
```

### Recommendation: Use Option A

**Reasons:**
1. **Clearer logic:** Each variant's validation is co-located
2. **Better type narrowing:** TypeScript knows the exact type within each variant
3. **Better performance:** Only the matched variant's refinements run
4. **Easier to maintain:** Adding a new variant doesn't require updating the central refinement
5. **Follows existing patterns:** The codebase already uses variant-specific schemas

---

## 8. Test Cases for Refinement Validation

### Invalid Combinations That Should Fail

```typescript
describe('AgentResponseSchema refinement validation', () => {
  it('should reject status=success with error!=null', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'success',
      data: 'test',
      error: { code: 'ERROR', message: 'oops', recoverable: false }, // INVALID
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['error']);
      expect(result.error.errors[0].message).toContain('null');
    }
  });

  it('should reject status=error with data!=null', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'error',
      data: 'test', // INVALID
      error: { code: 'ERROR', message: 'oops', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['data']);
      expect(result.error.errors[0].message).toContain('null');
    }
  });

  it('should reject status=error with error=null', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'error',
      data: null,
      error: null, // INVALID
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(false);
    // Error from AgentErrorDetailsSchema (not refinement)
  });

  it('should reject status=partial with error!=null', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'partial',
      data: 'test',
      error: { code: 'ERROR', message: 'oops', recoverable: false }, // INVALID
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['error']);
    }
  });
});
```

### Valid Combinations That Should Pass

```typescript
describe('AgentResponseSchema valid combinations', () => {
  it('should accept valid success response', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'success',
      data: 'test',
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid error response', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'error',
      data: null,
      error: { code: 'ERROR', message: 'oops', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid partial response', () => {
    const schema = AgentResponseSchema(z.string());

    const result = schema.safeParse({
      status: 'partial',
      data: 'test',
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    });

    expect(result.success).toBe(true);
  });
});
```

---

## 9. Local Zod Source Code References

All research based on local Zod source code (version 3.25.76) in:

**Test Files:**
- `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/discriminated-unions.test.ts`
- `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/refine.test.ts`
- `/home/dustin/projects/groundswell/node_modules/zod/src/v4/classic/tests/nested-refine.test.ts`

**Documentation:**
- `/home/dustin/projects/groundswell/node_modules/zod/README.md`

---

## 10. Summary and Recommendations

### Key Findings

1. **Current Gap:** `AgentResponseSchema` uses discriminated unions but doesn't enforce runtime consistency between `status` and `data`/`error` fields.

2. **Solution:** Add `.superRefine()` to each union member to catch invalid combinations at runtime.

3. **Best Pattern:** Refine on individual union members (not the entire union) for:
   - Clearer logic
   - Better type narrowing
   - Better performance
   - Easier maintenance

4. **Error Messages:** Use specific, actionable error messages with proper paths.

5. **Testing:** Add tests for invalid combinations that should fail refinement validation.

### Implementation Priority

1. **High Priority:** Add `.superRefine()` to catch `status='success'` with `error!=null`
2. **High Priority:** Add `.superRefine()` to catch `status='error'` with `data!=null`
3. **Medium Priority:** Add `.superRefine()` to catch `status='partial'` with `error!=null`
4. **Low Priority:** Consider adding refinement for `data` non-null in success (depends on dataSchema)

### Risk Assessment

- **Risk:** Low - Zod refinements are well-tested and stable
- **Breaking Changes:** None - refinements only add validation, don't change API
- **Performance Impact:** Minimal - refinements only run for matched variant
- **Backward Compatibility:** High - existing valid data will still pass

---

**End of Research Document**
