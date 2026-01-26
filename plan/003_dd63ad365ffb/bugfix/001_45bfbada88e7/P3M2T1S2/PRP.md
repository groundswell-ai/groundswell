# Product Requirement Prompt (PRP): Add Zod Refinement for AgentResponse Validation

---

## Goal

**Feature Goal**: Strengthen the `AgentResponseSchema` Zod validation to enforce runtime consistency between the `status` field and the `data`/`error` fields, ensuring that previously allowed invalid combinations (e.g., `status='success'` with `error!=null`) are caught at runtime.

**Deliverable**: Enhanced `AgentResponseSchema` function in `src/types/agent.ts` (lines 970-993) with `.superRefine()` added to each union member to catch invalid state combinations at runtime.

**Success Definition**:
- [ ] `AgentResponseSchema` uses `.superRefine()` on each union member
- [ ] `status='success'` with `error!=null` fails validation with clear error message
- [ ] `status='error'` with `data!=null` fails validation with clear error message
- [ ] `status='partial'` with `error!=null` fails validation with clear error message
- [ ] Error messages include proper path pointing to the invalid field
- [ ] All valid combinations continue to pass validation
- [ ] New test cases cover invalid combinations
- [ ] All existing tests continue to pass
- [ ] No breaking changes to public API

---

## User Persona

**Target User**: Implementation agent working on P3.M2.T1.S2 (Zod refinement for AgentResponse validation).

**Use Case**: Adding runtime validation to catch invalid AgentResponse state combinations that may come from external sources (API calls, JSON parsing, user input) or defensive programming scenarios.

**User Journey**:
1. Review current `AgentResponseSchema` implementation and its validation gaps
2. Study Zod `.superRefine()` patterns from research documents
3. Add `.superRefine()` to each union member (success, error, partial)
4. Write comprehensive tests for invalid combinations
5. Verify all existing tests still pass
6. Run test suite to ensure no regressions

**Pain Points Addressed**:
- **Runtime Validation Gap**: Current schema allows `status='success'` with `error!=null` at runtime (only caught at compile-time after P3.M2.T1.S1)
- **External Data Safety**: Data from external sources (API, JSON parsing) may have invalid combinations
- **Defensive Programming**: Runtime validation provides safety net for type assertions and manual object creation
- **Clear Error Messages**: Invalid combinations should produce actionable error messages pointing to the problematic field

---

## Why

**Business Value and User Impact**:
- Catches invalid state combinations at runtime for data from external sources
- Provides clear, actionable error messages for debugging
- Adds defensive programming layer beyond compile-time type safety
- Prevents subtle bugs from mismatched status and data/error fields
- Aligns runtime validation with compile-time type safety (after P3.M2.T1.S1)

**Integration with Existing Features**:
- Builds on `AgentResponseSchema` in `src/types/agent.ts` (lines 970-993)
- Works with existing `validateAgentResponse` utility in `src/utils/agent-validation.ts`
- Integrates with workflow validation in `src/core/workflow.ts`
- Maintains compatibility with existing Zod-based validation throughout codebase
- Preserves all existing test patterns and behaviors

**Problems Solved**:
- **Issue 7 (Runtime)**: `AgentResponseSchema` doesn't catch `status='success'` with `error!=null` at runtime
- **External Data**: Data from API calls or JSON parsing may have invalid combinations
- **Type Assertions**: Manual type assertions or object creation bypass compile-time checks
- **Debugging**: Invalid combinations produce confusing errors or subtle bugs

---

## What

**User-Visible Behavior and Technical Requirements**:

### Current Problem

The current `AgentResponseSchema` uses discriminated unions but doesn't enforce runtime consistency:

```typescript
// Current implementation (lines 970-993 in src/types/agent.ts)
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

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

// PROBLEM: This PASSES validation but is INVALID logic:
const invalidResponse = {
  status: 'success',
  data: 'hello',
  error: { code: 'ERROR', message: 'oops', recoverable: false }, // SHOULD BE CAUGHT!
  metadata: { agentId: 'test', timestamp: Date.now() }
};

const schema = AgentResponseSchema(z.string());
const result = schema.safeParse(invalidResponse);
// result.success is TRUE (but should be FALSE!)
```

### Solution: Add .superRefine() to Each Union Member

```typescript
// Enhanced implementation with refinement
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Runtime check: error must actually be null
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='success' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Runtime check: data must actually be null
    if (data.data !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='error' but data is non-null (must be null)",
        path: ['data'],
      });
    }
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    // Runtime check: error must actually be null
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='partial' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

// NOW: This FAILS validation (as expected)
const invalidResponse = {
  status: 'success',
  data: 'hello',
  error: { code: 'ERROR', message: 'oops', recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
};

const result = schema.safeParse(invalidResponse);
// result.success is FALSE
// result.error.errors[0].path is ['error']
// result.error.errors[0].message is "Invalid state: status='success' but error is non-null"
```

### Success Criteria

- [ ] `successSchema` has `.superRefine()` checking `error === null`
- [ ] `errorSchema` has `.superRefine()` checking `data === null`
- [ ] `partialSchema` has `.superRefine()` checking `error === null`
- [ ] Error messages are clear and actionable
- [ ] Error paths point to the correct field (`['error']` or `['data']`)
- [ ] All valid combinations pass validation
- [ ] Invalid combinations fail with appropriate errors
- [ ] New tests cover refinement validation
- [ ] All existing tests continue to pass
- [ ] No changes to public API or function signature

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact current implementation with file paths and line numbers
- Research on Zod `.superRefine()` patterns and best practices
- Existing test patterns to follow
- Integration points and dependencies
- Complete implementation blueprint
- Validation commands and expected outputs
- Research documents with detailed examples

---

### Documentation & References

```yaml
# MUST READ - Current AgentResponseSchema implementation
- file: src/types/agent.ts
  why: Contains the AgentResponseSchema function to enhance
  lines: 900-993 (full Zod schema section)
  lines: 970-993 (AgentResponseSchema function)
  pattern: Factory function creating discriminated union with z.object() schemas
  critical: Must understand current structure before adding refinements

# MUST READ - Previous PRP (P3.M2.T1.S1)
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S1/PRP.md
  why: Defines what P3.M2.T1.S1 produces (discriminated union type refactor)
  section: Goal, Success Definition, Implementation Blueprint
  critical: This PRP consumes the output from P3.M2.T1.S1
  note: P3.M2.T1.S1 refactors TypeScript type, this adds runtime validation

# MUST READ - Zod .superRefine() research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/research/zod-refine-research.md
  why: Comprehensive research on Zod refinement patterns
  section: Section 7 (Recommended Implementation), Section 8 (Test Cases)
  critical: Contains specific implementation patterns and examples

# MUST READ - Test patterns research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/research/test-patterns-research.md
  why: Existing test patterns to follow for new tests
  section: Section 6 (Recommended Test Structure), Section 3 (Schema Validation Test Patterns)
  critical: Contains test structure patterns and examples

# MUST READ - Existing validation utility
- file: src/utils/agent-validation.ts
  why: Contains validateAgentResponse() that uses AgentResponseSchema
  pattern: Uses schema.safeParse() and returns ValidationResult
  critical: Must continue working after enhancements

# MUST READ - Existing AgentResponse tests
- file: src/__tests__/unit/agent-response.test.ts
  why: Contains existing AgentResponse schema validation tests
  pattern: Arrange-Act-Assert structure, helper functions, error assertions
  critical: Must add new tests without breaking existing ones

# MUST READ - Workflow validation integration
- file: src/core/workflow.ts
  why: Contains validateAgentResponse() method that uses AgentResponseSchema
  lines: Around workflow validation logic
  pattern: Calls validateAgentResponse utility
  critical: Must continue working after enhancements

# REFERENCE - Zod test files in node_modules
- file: node_modules/zod/src/v3/tests/refine.test.ts
  why: Examples of .superRefine() patterns
  section: Lines 120-147 (superRefine examples)
  pattern: Using ctx.addIssue() for custom validation errors

# REFERENCE - Zod discriminated union tests
- file: node_modules/zod/src/v3/tests/discriminated-unions.test.ts
  why: Examples of discriminated union validation
  section: Full file for patterns
  pattern: Discriminated union with refinements
```

---

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts              # MODIFY: Add .superRefine() to AgentResponseSchema
│   │   ├── Lines 900-993: Zod schema definitions
│   │   ├── Lines 970-993: AgentResponseSchema function (MODIFY)
│   │   └── Lines 910-946: Related schemas (AgentErrorDetailsSchema, etc.)
│   └── index.ts              # REFERENCE: Public API exports (no changes)
├── utils/
│   └── agent-validation.ts   # VERIFY: Uses AgentResponseSchema
│       └── validateAgentResponse() function
├── core/
│   └── workflow.ts           # VERIFY: Uses validateAgentResponse
│       └── validateAgentResponse() method
└── __tests__/
    ├── unit/
    │   ├── agent-response.test.ts           # EXTEND: Add refinement tests
    │   ├── agent-response-factory.test.ts   # VERIFY: Factory tests pass
    │   └── utils/
    │       └── agent-validation.test.ts     # VERIFY: Validation utility tests pass
    └── integration/
        └── workflow-validation.test.ts      # VERIFY: Integration tests pass
```

---

### Desired Codebase Tree with Changes

```bash
# MODIFIED FILE: src/types/agent.ts

# BEFORE (lines 970-993):
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

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

# AFTER (lines 970-1010+):
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='success' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.data !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='error' but data is non-null (must be null)",
        path: ['data'],
      });
    }
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),
    metadata: AgentResponseMetadataSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.error !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid state: status='partial' but error is non-null (must be null)",
        path: ['error'],
      });
    }
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

# NEW FILE: src/__tests__/unit/agent-response-refinement.test.ts (or extend existing)
# Add tests for refinement validation
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: The schema already enforces error: z.null() at the type level
// But refinement checks the ACTUAL VALUE at runtime
// This is intentional defensive programming

// Example from current implementation (lines 971-976):
const successSchema = z.object({
  status: z.literal('success'),
  data: dataSchema,
  error: z.null(),  // Type-level: error must be null
  metadata: AgentResponseMetadataSchema.optional(),
});

// The refinement adds runtime checking:
.superRefine((data, ctx) => {
  if (data.error !== null) {  // Runtime: check actual value
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid state: status='success' but error is non-null",
      path: ['error'],
    });
  }
});

// CRITICAL: Use .superRefine() not .refine()
// .superRefine() allows multiple errors and custom paths
// .refine() only allows single error message on entire object

// CRITICAL: Error path must be specified explicitly
// path: ['error'] points to the error field
// path: ['data'] points to the data field
// Without path, error shows on entire object

// CRITICAL: Zod version is 3.25.76
// Has full .superRefine() support
// No workarounds needed

// CRITICAL: Discriminated union optimization
// Zod validates discriminator first
// Only matched variant's refinements run
// This is efficient and expected

// CRITICAL: After P3.M2.T1.S1 (discriminated union refactor)
// TypeScript catches these errors at compile-time
// But runtime validation is still needed for:
// - External data (API calls, JSON parsing)
// - Type assertions
// - Defensive programming
// - Clear error messages

// CRITICAL: Existing tests must continue to pass
// The refinements should only catch INVALID combinations
// All VALID combinations should still pass

// CRITICAL: Error message format
// Follow existing pattern: "Invalid state: status='X' but field is Y"
// Include both actual and expected values
// Make messages actionable

// CRITICAL: Test framework is Vitest
// Run tests with: npm test
// Watch mode: npm run test:watch

// CRITICAL: Refinement should NOT replace type-level checks
// Keep both: z.null() for type, .superRefine() for runtime
// Defense in depth

// CRITICAL: No changes to function signature
// AgentResponseSchema<T>(dataSchema: T) remains the same
// Only internal implementation changes

// CRITICAL: Integration with validateAgentResponse utility
// src/utils/agent-validation.ts uses AgentResponseSchema
// Must continue working without changes
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. Enhancement adds runtime validation to existing schema factory:

```typescript
// Existing structure (unchanged)
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  // Three union members: success, error, partial
  // Each is z.object() with status literal, data, error, metadata
  // Returns z.discriminatedUnion()
}

// Enhancement: Add .superRefine() to each union member
// Check runtime consistency of status with data/error fields
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ current implementation thoroughly
  - FILE: src/types/agent.ts
  - LINES: 900-993 (full Zod schema section)
  - LINES: 970-993 (AgentResponseSchema function)
  - UNDERSTAND: Current discriminated union structure
  - UNDERSTAND: How each variant is defined
  - IDENTIFY: Where to add .superRefine() calls
  - DOCUMENT: Current validation behavior

Task 2: READ research documents
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/research/zod-refine-research.md
  - SECTION: Section 7 (Recommended Implementation)
  - SECTION: Section 8 (Test Cases)
  - UNDERSTAND: .superRefine() patterns
  - UNDERSTAND: Error message patterns
  - UNDERSTAND: Error path specification

Task 3: READ existing test patterns
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S2/research/test-patterns-research.md
  - SECTION: Section 6 (Recommended Test Structure)
  - UNDERSTAND: Test organization patterns
  - UNDERSTAND: Helper function patterns
  - UNDERSTAND: Error assertion patterns

Task 4: READ previous PRP (P3.M2.T1.S1)
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M2T1S1/PRP.md
  - SECTION: Goal, Implementation Blueprint
  - UNDERSTAND: What P3.M2.T1.S1 produces (discriminated union type)
  - UNDERSTAND: Relationship between compile-time and runtime validation

Task 5: ADD .superRefine() to successSchema
  - FILE: src/types/agent.ts
  - LOCATION: After line 976 (successSchema definition)
  - ADD: .superRefine((data, ctx) => { ... }) to successSchema
  - CHECK: data.error !== null
  - ADD: ctx.addIssue() with code: z.ZodIssueCode.custom
  - MESSAGE: "Invalid state: status='success' but error is non-null (must be null)"
  - PATH: ['error']
  - PATTERN: Follow research document Section 7

Task 6: ADD .superRefine() to errorSchema
  - FILE: src/types/agent.ts
  - LOCATION: After line 983 (errorSchema definition)
  - ADD: .superRefine((data, ctx) => { ... }) to errorSchema
  - CHECK: data.data !== null
  - ADD: ctx.addIssue() with code: z.ZodIssueCode.custom
  - MESSAGE: "Invalid state: status='error' but data is non-null (must be null)"
  - PATH: ['data']
  - PATTERN: Follow research document Section 7

Task 7: ADD .superRefine() to partialSchema
  - FILE: src/types/agent.ts
  - LOCATION: After line 990 (partialSchema definition)
  - ADD: .superRefine((data, ctx) => { ... }) to partialSchema
  - CHECK: data.error !== null
  - ADD: ctx.addIssue() with code: z.ZodIssueCode.custom
  - MESSAGE: "Invalid state: status='partial' but error is non-null (must be null)"
  - PATH: ['error']
  - PATTERN: Follow research document Section 7

Task 8: RUN TypeScript compiler
  - COMMAND: npx tsc --noEmit
  - EXPECTED: No type errors
  - VERIFY: Refinements don't break type inference
  - FIX: Any type errors that arise

Task 9: CREATE or EXTEND test file for refinement validation
  - FILE: src/__tests__/unit/agent-response-refinement.test.ts (new)
  - OR: src/__tests__/unit/agent-response.test.ts (extend)
  - ADD: Test suite for refinement validation
  - PATTERN: Follow test-patterns-research.md Section 6
  - INCLUDE: Helper functions for test data
  - INCLUDE: Tests for invalid combinations
  - INCLUDE: Tests for valid combinations

Task 10: WRITE tests for success status refinement
  - FILE: src/__tests__/unit/agent-response-refinement.test.ts (or existing)
  - ADD: describe('success status refinements', ...)
  - ADD: it('should accept valid success response', ...)
  - ADD: it('should reject status=success with error!=null', ...)
  - CHECK: result.success is false
  - CHECK: result.error.errors[0].path is ['error']
  - CHECK: result.error.errors[0].code is 'custom'
  - PATTERN: Follow test-patterns-research.md Section 3

Task 11: WRITE tests for error status refinement
  - FILE: src/__tests__/unit/agent-response-refinement.test.ts (or existing)
  - ADD: describe('error status refinements', ...)
  - ADD: it('should accept valid error response', ...)
  - ADD: it('should reject status=error with data!=null', ...)
  - CHECK: result.success is false
  - CHECK: result.error.errors[0].path is ['data']
  - CHECK: result.error.errors[0].code is 'custom'
  - PATTERN: Follow test-patterns-research.md Section 3

Task 12: WRITE tests for partial status refinement
  - FILE: src/__tests__/unit/agent-response-refinement.test.ts (or existing)
  - ADD: describe('partial status refinements', ...)
  - ADD: it('should accept valid partial response', ...)
  - ADD: it('should reject status=partial with error!=null', ...)
  - CHECK: result.success is false
  - CHECK: result.error.errors[0].path is ['error']
  - CHECK: result.error.errors[0].code is 'custom'
  - PATTERN: Follow test-patterns-research.md Section 3

Task 13: RUN all tests
  - COMMAND: npm test
  - EXPECTED: All tests pass
  - VERIFY: New tests fail invalid combinations
  - VERIFY: Existing tests still pass
  - FIX: Any failures (indicates breaking change)

Task 14: RUN specific AgentResponse tests
  - COMMAND: npm test -- agent-response.test.ts
  - COMMAND: npm test -- agent-validation.test.ts
  - EXPECTED: All AgentResponse tests pass
  - VERIFY: No regressions in schema validation

Task 15: RUN workflow validation tests
  - COMMAND: npm test -- workflow-validation.test.ts
  - EXPECTED: All workflow tests pass
  - VERIFY: Integration with validateAgentResponse works

Task 16: RUN linter and formatter
  - COMMAND: npm run lint
  - COMMAND: npm run format (if exists)
  - EXPECTED: No linting errors
  - FIX: Any formatting issues

Task 17: VERIFY integration with validateAgentResponse utility
  - FILE: src/utils/agent-validation.ts
  - VERIFY: validateAgentResponse() still works
  - VERIFY: Returns ValidationResult with proper errors
  - NO CHANGES: Should work without modification

Task 18: VERIFY workflow validation integration
  - FILE: src/core/workflow.ts
  - VERIFY: validateAgentResponse() method still works
  - VERIFY: Emits invalidResponse event for invalid responses
  - NO CHANGES: Should work without modification

Task 19: DOCUMENT changes in JSDoc
  - FILE: src/types/agent.ts
  - UPDATE: AgentResponseSchema JSDoc (if needed)
  - ADD: Note about runtime refinement validation
  - CLARIFY: Relationship between compile-time and runtime validation
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: .superRefine() on successSchema
// Location: src/types/agent.ts, after line 976

const successSchema = z.object({
  status: z.literal('success'),
  data: dataSchema,
  error: z.null(),
  metadata: AgentResponseMetadataSchema.optional(),
}).superRefine((data, ctx) => {
  // Runtime check: error must actually be null
  if (data.error !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid state: status='success' but error is non-null (must be null)",
      path: ['error'],
    });
  }
});

// PATTERN 2: .superRefine() on errorSchema
// Location: src/types/agent.ts, after line 983

const errorSchema = z.object({
  status: z.literal('error'),
  data: z.null(),
  error: AgentErrorDetailsSchema,
  metadata: AgentResponseMetadataSchema.optional(),
}).superRefine((data, ctx) => {
  // Runtime check: data must actually be null
  if (data.data !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid state: status='error' but data is non-null (must be null)",
      path: ['data'],
    });
  }
});

// PATTERN 3: .superRefine() on partialSchema
// Location: src/types/agent.ts, after line 990

const partialSchema = z.object({
  status: z.literal('partial'),
  data: dataSchema,
  error: z.null(),
  metadata: AgentResponseMetadataSchema.optional(),
}).superRefine((data, ctx) => {
  // Runtime check: error must actually be null
  if (data.error !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid state: status='partial' but error is non-null (must be null)",
      path: ['error'],
    });
  }
});

// GOTCHA: Why use .superRefine() instead of .refine()?
// .superRefine() allows:
// - Multiple errors in a single validation
// - Custom error paths (path: ['error'])
// - More complex validation logic
// - Better error messages

// GOTCHA: Error path specification
// path: ['error'] points to the error field
// path: ['data'] points to the data field
// This makes error messages clearer and more actionable

// GOTCHA: Error message format
// "Invalid state: status='X' but field is Y (must be Z)"
// Includes current state, actual value, and expected value
// Makes debugging easier

// PATTERN 4: Test helper functions
// Location: src/__tests__/unit/agent-response-refinement.test.ts

function createSuccessResponse<T>(data: T, error: any = null): any {
  return {
    status: 'success',
    data,
    error,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };
}

function createErrorResponse(data: any = null, error?: any): any {
  return {
    status: 'error',
    data,
    error: error || { code: 'E', message: 'm', recoverable: false },
    metadata: { agentId: 'test', timestamp: Date.now() }
  };
}

function createPartialResponse<T>(data: T, error: any = null): any {
  return {
    status: 'partial',
    data,
    error,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };
}

// PATTERN 5: Test for invalid combination
// Location: src/__tests__/unit/agent-response-refinement.test.ts

it('should reject status=success with error!=null', () => {
  const schema = AgentResponseSchema(z.string());
  const response = createSuccessResponse('test', { code: 'E', message: 'm', recoverable: false });

  const result = schema.safeParse(response);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].path).toEqual(['error']);
    expect(result.error.errors[0].code).toBe('custom');
    expect(result.error.errors[0].message).toContain('success');
    expect(result.error.errors[0].message).toContain('error');
  }
});

// PATTERN 6: Test for valid combination
// Location: src/__tests__/unit/agent-response-refinement.test.ts

it('should accept valid success response', () => {
  const schema = AgentResponseSchema(z.string());
  const response = createSuccessResponse('test', null);

  const result = schema.safeParse(response);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.status).toBe('success');
    expect(result.data.data).toBe('test');
    expect(result.data.error).toBe(null);
  }
});

// GOTCHA: Always check result.success before accessing result.data
// TypeScript doesn't narrow based on result.success
// Use if (result.success) { ... } to access result.data

// GOTCHA: Test organization
// Group tests by status type (success, error, partial)
// Use describe blocks for organization
// Use descriptive test names

// GOTCHA: Error assertion pattern
// Check result.success is false
// Check result.error exists
// Check result.error.errors is array
// Check result.error.errors[0].path
// Check result.error.errors[0].code
// Check result.error.errors[0].message

// PATTERN 7: Integration test
// Location: src/__tests__/unit/workflow-validation.test.ts (verify existing)

it('should catch invalid responses with refinement validation', async () => {
  const { workflow, events } = createWorkflowWithEventSpy();
  const invalidResponse = {
    status: 'success',
    data: 'test',
    error: { code: 'ERROR', message: 'oops', recoverable: false }, // INVALID
    metadata: { agentId: 'test', timestamp: Date.now() }
  };

  const result = await workflow.validateAgentResponse(invalidResponse);

  expect(result).toBe(false);
  expect(events.emit).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'invalidResponse',
      errors: expect.any(ZodError),
    })
  );
});
```

---

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - This is a schema enhancement only
  - No external service dependencies
  - No configuration changes
  - No new dependencies

INTERNAL INTEGRATIONS:
  - validateAgentResponse utility (src/utils/agent-validation.ts)
    - Uses AgentResponseSchema for validation
    - Should work without modification
    - Returns ValidationResult with proper errors
  - workflow.validateAgentResponse (src/core/workflow.ts)
    - Calls validateAgentResponse utility
    - Emits invalidResponse event on failure
    - Should work without modification
  - All existing tests
    - Should pass without modification
    - Only add new tests, don't change existing

SCOPE BOUNDARIES:
  - ONLY modify src/types/agent.ts (lines 970-993)
  - ADD .superRefine() to each union member
  - ADD new tests for refinement validation
  - DON'T modify function signature
  - DON'T modify other files in src/types/
  - DON'T modify validateAgentResponse utility
  - DON'T modify workflow validation

BACKWARD COMPATIBILITY:
  - MUST maintain function signature
  - MUST not break existing tests
  - MUST not require changes to consumers
  - MUST not change API behavior for valid inputs

RELATED WORK:
  - P3.M2.T1.S1: Refactor AgentResponse as discriminated union (COMPLETED or IN PROGRESS)
    - P3.M2.T1.S1 adds compile-time type safety
    - This PRP adds runtime validation
    - Both work together for complete validation
  - Existing discriminated union: z.discriminatedUnion('status', [...])
  - Existing schemas: AgentErrorDetailsSchema, AgentResponseMetadataSchema

FILES TO MODIFY:
  - src/types/agent.ts (add .superRefine() to AgentResponseSchema)

FILES TO CREATE:
  - src/__tests__/unit/agent-response-refinement.test.ts (new test file)
  - OR: Extend src/__tests__/unit/agent-response.test.ts

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/utils/agent-validation.ts (uses AgentResponseSchema, should work without changes)
  - src/core/workflow.ts (uses validateAgentResponse, should work without changes)
  - src/providers/* (use AgentResponse type, not schema)
  - src/core/agent.ts (use AgentResponse type, not schema)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# Expected: Zero errors
# If errors exist:
# 1. READ the error messages carefully
# 2. VERIFY errors are not in AgentResponseSchema
# 3. CHECK if errors are in test files
# 4. FIX errors before proceeding
# Common errors:
# - Type mismatch in .superRefine() (fix parameter types)
# - Missing import for z.ZodIssueCode (add import)
# - Incorrect error path (check path array)

# Run linter
npm run lint

# Expected: Zero errors
# Fix any linting issues

# Run formatter
npm run format  # if exists, or use: npx prettier --write src/types/agent.ts

# Expected: Consistent formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests to verify no regressions
npm test

# Expected: All tests pass
# Verify: No existing tests broken
# Verify: New refinement tests fail invalid combinations
# Verify: New refinement tests pass valid combinations

# Run specific test files for AgentResponse
npm test -- agent-response.test.ts
npm test -- agent-response-refinement.test.ts  # if new file
npm test -- agent-validation.test.ts

# Expected: All AgentResponse tests pass
# Verify: Schema validation tests pass
# Verify: Refinement tests pass
# Verify: Factory function tests pass

# Run workflow validation tests
npm test -- workflow-validation.test.ts

# Expected: All workflow tests pass
# Verify: Integration with validateAgentResponse works
# Verify: invalidResponse event emitted correctly

# Run tests with coverage
npm test -- --coverage

# Expected: Coverage maintained or improved
# Verify: New refinement code is covered
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all integration tests
npm test -- integration/

# Expected: All integration tests pass
# Verify: Agent-workflow integration works
# Verify: Provider-agent integration works
# Verify: No regressions in integration scenarios

# Run full test suite
npm test

# Expected: All tests pass
# Verify: No test failures
# Verify: No skipped tests
# Verify: No timeout errors

# Manual verification: Test with invalid data
# Create a test script to verify refinement catches invalid combinations
cat > /tmp/test-refinement.js << 'EOF'
import { AgentResponseSchema } from './src/types/agent.js';
import { z } from 'zod';

const schema = AgentResponseSchema(z.string());

// Test 1: Invalid success response
console.log('Test 1: status=success with error!=null');
const result1 = schema.safeParse({
  status: 'success',
  data: 'test',
  error: { code: 'E', message: 'm', recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result1.success);
if (!result1.success) {
  console.log('Error path:', result1.error.errors[0].path);
  console.log('Error message:', result1.error.errors[0].message);
}

// Test 2: Invalid error response
console.log('\nTest 2: status=error with data!=null');
const result2 = schema.safeParse({
  status: 'error',
  data: 'test',
  error: { code: 'E', message: 'm', recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result2.success);
if (!result2.success) {
  console.log('Error path:', result2.error.errors[0].path);
  console.log('Error message:', result2.error.errors[0].message);
}

// Test 3: Valid success response
console.log('\nTest 3: valid success response');
const result3 = schema.safeParse({
  status: 'success',
  data: 'test',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
});
console.log('Success:', result3.success);
EOF

# Run manual test
node --loader tsx /tmp/test-refinement.js

# Expected:
# Test 1: Success: false, Error path: ['error']
# Test 2: Success: false, Error path: ['data']
# Test 3: Success: true

# Clean up
rm /tmp/test-refinement.js
```

### Level 4: Schema Validation Testing (Domain-Specific)

```bash
# Test refinement validation with various scenarios
cat > /tmp/test-refinement-scenarios.js << 'EOF'
import { AgentResponseSchema } from './src/types/agent.js';
import { z } from 'zod';

const schema = AgentResponseSchema(z.string());

const testCases = [
  {
    name: 'Valid success response',
    input: {
      status: 'success',
      data: 'test',
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: true
  },
  {
    name: 'Invalid success with error',
    input: {
      status: 'success',
      data: 'test',
      error: { code: 'E', message: 'm', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: false
  },
  {
    name: 'Valid error response',
    input: {
      status: 'error',
      data: null,
      error: { code: 'E', message: 'm', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: true
  },
  {
    name: 'Invalid error with data',
    input: {
      status: 'error',
      data: 'test',
      error: { code: 'E', message: 'm', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: false
  },
  {
    name: 'Valid partial response',
    input: {
      status: 'partial',
      data: 'test',
      error: null,
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: true
  },
  {
    name: 'Invalid partial with error',
    input: {
      status: 'partial',
      data: 'test',
      error: { code: 'E', message: 'm', recoverable: false },
      metadata: { agentId: 'test', timestamp: Date.now() }
    },
    expectSuccess: false
  }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ name, input, expectSuccess }) => {
  const result = schema.safeParse(input);
  const actualSuccess = result.success;

  if (actualSuccess === expectSuccess) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    console.log(`  Expected: ${expectSuccess ? 'success' : 'failure'}`);
    console.log(`  Actual: ${actualSuccess ? 'success' : 'failure'}`);
    if (!actualSuccess) {
      console.log(`  Error: ${result.error.errors[0].message}`);
    }
    failed++;
  }
});

console.log(`\nPassed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

process.exit(failed > 0 ? 1 : 0);
EOF

# Run scenario tests
node --loader tsx /tmp/test-refinement-scenarios.js

# Expected: All 6 tests pass

# Clean up
rm /tmp/test-refinement-scenarios.js

# Test error message quality
cat > /tmp/test-error-messages.js << 'EOF'
import { AgentResponseSchema } from './src/types/agent.js';
import { z } from 'zod';

const schema = AgentResponseSchema(z.string());

const result = schema.safeParse({
  status: 'success',
  data: 'test',
  error: { code: 'ERROR', message: 'test error', recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
});

if (!result.success) {
  const error = result.error.errors[0];
  console.log('Error code:', error.code);
  console.log('Error path:', error.path);
  console.log('Error message:', error.message);

  // Verify error quality
  const checks = {
    'Has error code': error.code === 'custom',
    'Has error path': JSON.stringify(error.path) === JSON.stringify(['error']),
    'Message mentions status': error.message.includes('success'),
    'Message mentions field': error.message.includes('error'),
    'Message mentions expected value': error.message.includes('null'),
  };

  console.log('\nQuality checks:');
  Object.entries(checks).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✓' : '✗'} ${name}`);
  });
}
EOF

# Run error message tests
node --loader tsx /tmp/test-error-messages.js

# Expected: All quality checks pass

# Clean up
rm /tmp/test-error-messages.js
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiler passes: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test`
- [ ] New refinement tests pass: `npm test -- agent-response-refinement.test.ts`
- [ ] Linter passes: `npm run lint`
- [ ] Formatter passes: `npm run format` (if exists)
- [ ] No breaking changes to public API
- [ ] Function signature unchanged
- [ ] Integration with validateAgentResponse works
- [ ] Integration with workflow validation works

### Refinement Validation

- [ ] `status='success'` with `error!=null` fails validation
- [ ] `status='error'` with `data!=null` fails validation
- [ ] `status='partial'` with `error!=null` fails validation
- [ ] Error messages include status field value
- [ ] Error messages include expected value
- [ ] Error paths point to correct field (`['error']` or `['data']`)
- [ ] Error code is `z.ZodIssueCode.custom`
- [ ] Valid combinations continue to pass
- [ ] No false positives (valid data rejected)

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Invalid combinations caught at runtime
- [ ] Clear, actionable error messages
- [ ] Existing tests still pass (no regressions)
- [ ] New tests cover all refinement scenarios
- [ ] Integration with existing validation works
- [ ] No changes to consumer code required

### Code Quality Validation

- [ ] Code follows existing patterns in codebase
- [ ] JSDoc comments updated (if needed)
- [ ] Test organization follows existing patterns
- [ ] Test names are descriptive and clear
- [ ] Helper functions follow existing patterns
- [ ] Error assertions follow existing patterns
- [ ] No code duplication
- [ ] Consistent error message format

### Documentation & Deployment

- [ ] Changes documented in code (JSDoc)
- [ ] No deployment notes needed (backward compatible)
- [ ] Error messages are self-documenting
- [ ] Test examples serve as documentation
- [ ] Research documents provide context

---

## Anti-Patterns to Avoid

- ❌ Don't use `.refine()` instead of `.superRefine()` (worse error messages)
- ❌ Don't skip error path specification (errors show on entire object)
- ❌ Don't use vague error messages (e.g., "Invalid state")
- ❌ Don't break existing tests (backward compatibility is critical)
- ❌ Don't change function signature (no API changes)
- ❌ Don't add refinements to the entire union (use member-specific refinements)
- ❌ Don't forget to test both valid and invalid combinations
- ❌ Don't skip checking `result.success` before accessing `result.data`
- ❌ Don't modify validateAgentResponse utility (should work without changes)
- ❌ Don't modify workflow validation (should work without changes)
- ❌ Don't use fatal refinements (stops all validation)
- ❌ Don't add redundant type-level checks (z.null() is already there)
- ❌ Don't forget to import `z.ZodIssueCode` if needed
- ❌ Don't modify PRD.md or tasks.json (read-only files)
- ❌ Don't change test structure without good reason
- ❌ Don't skip integration testing

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Current implementation thoroughly analyzed with exact line numbers
- ✅ Zod `.superRefine()` patterns researched and documented
- ✅ Test patterns well understood with specific examples
- ✅ Clear implementation blueprint with ordered tasks
- ✅ Specific error message patterns provided
- ✅ Comprehensive validation checklist
- ✅ Integration points identified and verified
- ✅ No breaking changes to public API
- ✅ Minimal risk (only adds validation, doesn't change behavior)
- ✅ Existing tests should pass without modification
- ✅ Research documents provide detailed examples
- ✅ Manual test scripts provided for verification

**Risk Assessment**: Minimal risk
- Only adds runtime validation, doesn't change valid behavior
- All valid combinations continue to pass
- Function signature unchanged
- No changes to consumer code required
- Worst case: remove refinements (single function)

**Validation**: This is a focused enhancement to a single function that adds defensive runtime validation. The change is localized to the `AgentResponseSchema` function in `src/types/agent.ts`. All existing code that creates valid responses will continue to work. Only invalid combinations (which should never happen in correct code) will now be caught. The enhancement adds safety without breaking changes. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
