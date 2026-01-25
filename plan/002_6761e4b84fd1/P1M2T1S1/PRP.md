# PRP: Define Zod schemas for all AgentResponse types

**PRP ID**: P1.M2.T1.S1
**Work Item**: Define Zod schemas for all AgentResponse types
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create runtime validation schemas for all AgentResponse types using Zod 3.23.0, enabling discriminated union validation with status-based type narrowing and null-over-undefined handling per PRD 6.4.4.

**Deliverable**: Four exported Zod schemas in `src/types/agent.ts`:
- `AgentResponseStatusSchema` - Enum schema for status values
- `AgentErrorDetailsSchema` - Error details object schema
- `AgentResponseMetadataSchema` - Metadata object schema
- `AgentResponseSchema<T>()` - Generic discriminated union schema factory

**Success Definition**:
- All four schemas are defined and exported from `src/types/agent.ts`
- Schemas are exported from `src/types/index.ts` for public API access
- Schemas use `z.discriminatedUnion('status', [...])` for type narrowing
- All optional fields use `z.null()` (not `z.undefined()`) per PRD 6.4.4
- TypeScript compilation succeeds with no errors
- Existing tests pass

---

## Why

**Business Value and User Impact**:
- Runtime validation catches malformed AgentResponse objects before they cause downstream errors
- Discriminated union schemas enable TypeScript to narrow types based on status field
- Zod integration provides detailed validation error messages for debugging
- Validates compliance with PRD 6.4 Response Requirements at runtime

**Integration with Existing Features**:
- Agent.prompt() returns AgentResponse<T> (P1.M1.T1 complete)
- All AgentResponse types have JSDoc documentation (P1.M1.T3.S2 - parallel)
- Public API exports verified (P1.M1.T3.S1 complete)
- Zod 3.23.0 already installed and used in Prompt.validateResponse()

**Problems This Solves**:
- No runtime validation for AgentResponse structure
- Cannot catch LLM responses that don't conform to AgentResponse schema
- Missing INVALID_RESPONSE_FORMAT validation path (PRD 6.6)
- No type-safe discriminated union for status-based narrowing

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This adds internal validation infrastructure.

**Technical Requirements**:
- Define 4 Zod schemas in `src/types/agent.ts`
- Use `z.discriminatedUnion()` for status-based validation
- Use `z.null()` for optional fields (PRD 6.4.4 null-over-undefined)
- Export schemas through `src/types/index.ts`
- Follow existing codebase patterns for Zod schema organization

### Success Criteria

- [ ] `AgentResponseStatusSchema` exported from src/types/agent.ts
- [ ] `AgentErrorDetailsSchema` exported from src/types/agent.ts
- [ ] `AgentResponseMetadataSchema` exported from src/types/agent.ts
- [ ] `AgentResponseSchema<T>()` factory function exported from src/types/agent.ts
- [ ] All schemas exported from src/types/index.ts
- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] Existing tests pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement Zod schemas for AgentResponse types successfully?

**Answer**: YES - This PRP provides exact file locations, existing type definitions, Zod patterns from codebase, external documentation URLs, and implementation examples.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://zod.dev/?id=discriminated-unions
  why: Official Zod documentation for discriminatedUnion syntax and patterns
  critical: Discriminator must be common field with z.literal() values

- url: https://zod.dev/?id=nullable-values
  why: Official Zod documentation for null vs optional handling
  critical: PRD 6.4.4 requires z.null() not z.undefined()

- url: https://zod.dev/?id=generics
  why: Generic schema factory patterns for AgentResponseSchema<T>
  critical: Schema factory accepts z.ZodTypeAny parameter

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: THE file to modify - contains all AgentResponse type definitions (lines 92-360)
  pattern: Lines 100 define AgentResponseStatus, 125-137 define AgentErrorDetails, 142-160 define AgentResponseMetadata
  gotcha: Add Zod schemas AFTER existing type definitions (after line 360), not before

- file: /home/dustin/projects/groundswell/src/types/index.ts
  why: Barrel export file - must add schema exports here
  pattern: Lines 27-46 show AgentResponse type exports, add schema exports after factory functions
  gotcha: Export schemas as named exports (not type exports)

- file: /home/dustin/projects/groundswell/src/core/prompt.ts
  why: Existing Zod usage pattern - see how responseFormat: z.ZodType<T> is used
  pattern: Lines 8, 33, 81, 92 show Zod import and usage patterns
  gotcha: Use type-only import: `import type { z } from 'zod'`

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S1/research/01-zod-discriminated-union-research.md
  why: Comprehensive external research on Zod patterns for discriminated unions
  section: Section 6 "Actionable Recommendations" has ready-to-use code examples
  critical: Gotchas section shows common pitfalls to avoid

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/zod-validation-patterns-research.md
  why: Existing codebase Zod patterns from previous research
  section: Section 2 "Discriminated Union Validation" and Section 6 "Schema Reuse Patterns"
  critical: Shows createAgentResponseSchema factory pattern already researched

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S4/research/zod-validation-patterns.md
  why: Codebase-specific Zod patterns and INVALID_RESPONSE_FORMAT usage
  section: Section 4 "INVALID_RESPONSE_FORMAT Error Code" and Section 6 "Zod Schema Hashing"
  critical: Shows how Zod schemas are currently used in agent.ts

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/architecture/EXTERNAL_DEPENDENCIES.md
  why: Confirms Zod ^3.23.0 is installed and shows current usage
  section: Zod section (lines 75-112)
  critical: Project uses Zod for runtime validation of LLM responses
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts                      # TARGET FILE - Add Zod schemas here (after line 360)
│   ├── index.ts                      # MODIFY - Add schema exports
│   ├── prompt.ts                     # Reference for Zod import patterns
│   └── sdk-primitives.ts             # TokenUsage type reference
├── core/
│   ├── agent.ts                      # Uses AgentResponse, will use schemas for validation
│   └── prompt.ts                     # Existing Zod pattern reference
├── cache/
│   └── cache-key.ts                  # Zod schema hashing pattern reference
└── index.ts                          # Main entry point
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files - schemas added to existing src/types/agent.ts
src/
├── types/
│   ├── agent.ts                      # MODIFIED: Add Zod schemas (after line 360)
│   │   ├── [lines 1-91]: Existing AgentConfig, PromptOverrides types
│   │   ├── [lines 92-360]: Existing AgentResponse types (preserve all)
│   │   ├── [NEW SECTION]: Zod Schema Definitions
│   │   │   ├── AgentResponseStatusSchema (z.enum)
│   │   │   ├── AgentErrorDetailsSchema (z.object with nullable fields)
│   │   │   ├── AgentResponseMetadataSchema (z.object with optional fields)
│   │   │   └── AgentResponseSchema<T>() (generic factory)
│   │   └── [NEW]: Export all 4 schemas
│   └── index.ts                      # MODIFIED: Export schemas
│       ├── [lines 27-36]: Existing AgentResponse type exports
│       ├── [lines 38-46]: Existing factory function exports
│       └── [NEW]: Export 4 Zod schemas
└── ...
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use type-only import for Zod to avoid runtime overhead
import type { z } from 'zod';  // ✅ Correct
import { z } from 'zod';       // ❌ Wrong (adds to bundle size)

// CRITICAL: PRD 6.4.4 requires null-over-undefined
z.null()      // ✅ Use this for optional fields
z.undefined() // ❌ Don't use
z.nullish()   // ❌ Don't use (allows both null and undefined)
z.optional()  // ❌ Don't use (allows undefined)

// GOTCHA: discriminatedUnion requires ALL members to have the discriminator field
z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), ... }),  // ✅ Has 'status'
  z.object({ status: z.literal('error'), ... }),    // ✅ Has 'status'
  z.object({ kind: z.literal('pending'), ... }),    // ❌ Missing 'status', uses 'kind'
])

// GOTCHA: Discriminator values must be z.literal(), not z.enum()
z.literal('success')  // ✅ Correct for discriminatedUnion
z.enum(['success', 'error'])  // ❌ Wrong for discriminatedUnion

// CRITICAL: TokenUsage is imported from sdk-primitives.ts
// It's used in AgentResponseMetadata but don't re-import it for schemas

// GOTCHA: Add schemas AFTER existing type definitions (after line 360)
// Don't insert between type definitions to avoid breaking existing code

// GOTCHA: Factory function pattern uses generic constraint <T extends z.ZodTypeAny>
function createAgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  // Returns z.discriminatedUnion
}

// PATTERN: Export schemas as named exports (not type exports)
export { AgentResponseSchema, AgentErrorDetailsSchema, ... }  // ✅ Correct
export type { AgentResponseSchema }  // ❌ Wrong (schemas are runtime values)

// GOTCHA: src/types/index.ts exports types separately from values
// Add schema exports in the value export section (after line 38), not in type export section
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Zod schemas provide runtime validation for existing AgentResponse TypeScript types.

**Schema-to-Type Mapping**:

| TypeScript Type | Zod Schema | Location |
|----------------|------------|----------|
| `AgentResponseStatus` | `AgentResponseStatusSchema` | src/types/agent.ts line 100 |
| `AgentErrorDetails` | `AgentErrorDetailsSchema` | src/types/agent.ts lines 125-137 |
| `AgentResponseMetadata` | `AgentResponseMetadataSchema` | src/types/agent.ts lines 142-160 |
| `AgentResponse<T>` | `AgentResponseSchema<T>()` | src/types/agent.ts lines 108-120 |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD Zod import to src/types/agent.ts
  - MODIFY: src/types/agent.ts line 6 (add new import after existing imports)
  - ADD: `import type { z } from 'zod';` (type-only import pattern)
  - FOLLOW pattern: src/core/prompt.ts line 8
  - PLACEMENT: After existing imports, before type definitions

Task 2: DEFINE AgentResponseStatusSchema enum schema
  - MODIFY: src/types/agent.ts (add after line 360, before new schemas)
  - IMPLEMENT: z.enum(['success', 'error', 'partial'])
  - FOLLOW: Type definition at line 100
  - NAMING: PascalCase with 'Schema' suffix
  - EXPORT: Add to exports

Task 3: DEFINE AgentErrorDetailsSchema object schema
  - MODIFY: src/types/agent.ts (add after AgentResponseStatusSchema)
  - IMPLEMENT: z.object with fields: code (string), message (string), details (nullable record), recoverable (boolean)
  - FOLLOW: Interface definition at lines 125-137
  - CRITICAL: Use `.nullable()` for details field (PRD 6.4.4)
  - EXPORT: Add to exports

Task 4: DEFINE AgentResponseMetadataSchema object schema
  - MODIFY: src/types/agent.ts (add after AgentErrorDetailsSchema)
  - IMPLEMENT: z.object with fields: agentId (string), timestamp (number), duration (optional number), requestId (optional string), usage (optional TokenUsage), toolCalls (optional number)
  - FOLLOW: Interface definition at lines 142-160
  - GOTCHA: TokenUsage is not a Zod schema, use `.passthrough()` or `.unknown()` for complex objects
  - CRITICAL: Use `.optional()` for optional fields (not `.nullable()` - metadata optional fields differ from error nullable fields)
  - EXPORT: Add to exports

Task 5: DEFINE AgentResponseSchema<T>() generic factory
  - MODIFY: src/types/agent.ts (add after AgentResponseMetadataSchema)
  - IMPLEMENT: Function returning z.discriminatedUnion('status', [success, error, partial])
  - SIGNATURE: `function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T): z.ZodDiscriminatedUnion<...>`
  - SUCCESS VARIANT: status: z.literal('success'), data: dataSchema, error: z.null(), metadata: AgentResponseMetadataSchema
  - ERROR VARIANT: status: z.literal('error'), data: z.null(), error: AgentErrorDetailsSchema, metadata: AgentResponseMetadataSchema
  - PARTIAL VARIANT: status: z.literal('partial'), data: dataSchema (make partial?), error: z.null(), metadata: AgentResponseMetadataSchema
  - CRITICAL: All variants use z.null() for null fields (PRD 6.4.4)
  - EXPORT: Add to exports

Task 6: EXPORT schemas from src/types/agent.ts
  - MODIFY: src/types/agent.ts (add export statement after schema definitions)
  - EXPORT: All 4 schemas as named exports
  - FOLLOW: Existing export pattern for factory functions (lines 389-457)
  - NAMING: Match schema variable names exactly

Task 7: EXPORT schemas from src/types/index.ts
  - MODIFY: src/types/index.ts (add after line 46, after factory function exports)
  - ADD: `export { AgentResponseStatusSchema, AgentErrorDetailsSchema, AgentResponseMetadataSchema, AgentResponseSchema } from './agent.js';`
  - FOLLOW: Existing export pattern for factory functions (lines 38-46)
  - PRESERVE: All existing exports
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Type-only Zod import (per codebase convention)
// Add at top of src/types/agent.ts after line 6
import type { z } from 'zod';

// PATTERN 2: Enum schema for status (matches AgentResponseStatus type)
// Add after line 360 in src/types/agent.ts
export const AgentResponseStatusSchema = z.enum(['success', 'error', 'partial']);

// PATTERN 3: Object schema with nullable fields (matches AgentErrorDetails interface)
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),  // PRD 6.4.4: null not undefined
  recoverable: z.boolean(),
});

// PATTERN 4: Object schema with optional fields (matches AgentResponseMetadata interface)
export const AgentResponseMetadataSchema = z.object({
  agentId: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),     // Optional (can be undefined)
  requestId: z.string().optional(),    // Optional (can be undefined)
  usage: z.unknown().optional(),       // TokenUsage passthrough
  toolCalls: z.number().optional(),    // Optional (can be undefined)
});

// PATTERN 5: Generic discriminated union factory (matches AgentResponse<T> interface)
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  // Success variant
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),  // Metadata itself is optional
  });

  // Error variant
  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),  // PRD 6.4.4: null not undefined
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  // Partial variant
  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,  // TODO: Should this be dataSchema.partial()? Research needed.
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}

// PATTERN 6: Schema exports (follow existing export pattern)
// Add after schema definitions in src/types/agent.ts
// Already exported via 'export const' declarations above

// PATTERN 7: Re-export from index.ts (follow existing barrel export pattern)
// Add to src/types/index.ts after line 46
export {
  AgentResponseStatusSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseSchema,
} from './agent.js';
```

### Integration Points

```yaml
NO CODE CHANGES - Schema Definition Only:
  - This task only defines Zod schemas
  - No existing code is modified (except adding exports to index.ts)
  - Schemas are not yet used for validation (that's P1.M2.T1.S2)
  - No breaking changes to existing API

DOWNSTREAM DEPENDENCIES:
  - P1.M2.T1.S2 (Add validation to Agent.prompt()) will use these schemas
  - P1.M2.T2 (Integration tests) will validate AgentResponse against schemas
  - Public API consumers can import schemas for their own validation

CONTEXT FROM P1.M1.T3.S2 (PARALLEL):
  - Previous PRP adds JSDoc to AgentResponse types
  - This PRP adds Zod schemas matching those types
  - No conflict - both add different documentation/validation

CONTEXT FROM P1.M1.T3.S1 (COMPLETE):
  - Previous PRP verified all AgentResponse types are exported
  - This PRP adds schema exports to same location
  - Schemas will be available alongside types for public API

CONTEXT FROM P1.M1.T1 (COMPLETE):
  - Agent.prompt() returns AgentResponse<T>
  - Future task will add schema validation to that return path
  - Schemas enable runtime validation of returned responses

ZOD VERSION CONFIRMED:
  - Zod ^3.23.0 installed (per package.json and EXTERNAL_DEPENDENCIES.md)
  - All patterns use 3.23.0 compatible APIs
  - No breaking changes from Zod version
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After adding schemas - verify TypeScript compilation

# Run TypeScript compiler - schemas should not break compilation
npm run lint
# Equivalent: npx tsc --noEmit

# Expected: Zero errors. Zod schemas are type-safe and don't affect compilation.

# Verify file compiles independently
npx tsc --noEmit src/types/agent.ts

# Verify exports are accessible
npx tsc --noEmit src/types/index.ts
```

### Level 2: Schema Validation Testing

```bash
# Test that schemas can be imported and used
cat > /tmp/test-schemas.ts << 'EOF'
import { AgentResponseSchema } from './src/types/index.js';
import { z } from 'zod';

// Test 1: Create a schema instance
const StringResponseSchema = AgentResponseSchema(z.object({ result: z.string() }));

// Test 2: Validate success response
const successInput = {
  status: 'success' as const,
  data: { result: 'hello' },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};
const successResult = StringResponseSchema.safeParse(successInput);
console.log('Success validation:', successResult.success);

// Test 3: Validate error response
const errorInput = {
  status: 'error' as const,
  data: null,
  error: { code: 'TEST_ERROR', message: 'Test', details: null, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
};
const errorResult = StringResponseSchema.safeParse(errorInput);
console.log('Error validation:', errorResult.success);

// Test 4: Reject invalid response (undefined instead of null)
const invalidInput = {
  status: 'error' as const,
  data: undefined,  // Should be null per PRD 6.4.4
  error: { code: 'TEST_ERROR', message: 'Test', details: null, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
};
const invalidResult = StringResponseSchema.safeParse(invalidInput);
console.log('Invalid (undefined) should fail:', !invalidResult.success);
EOF

npx tsx /tmp/test-schemas.ts

# Expected: All validations pass, undefined is rejected
# Output should show:
# Success validation: true
# Error validation: true
# Invalid (undefined) should fail: true

# Clean up
rm /tmp/test-schemas.ts
```

### Level 3: Type System Validation

```bash
# Verify type inference works correctly
cat > /tmp/test-type-inference.ts << 'EOF'
import { AgentResponseSchema } from './src/types/index.js';
import { z } from 'zod';

// Create typed schema
const TestSchema = AgentResponseSchema(z.object({ value: z.number() }));

// Infer TypeScript type from schema
type TestResponse = z.infer<typeof TestSchema>;

// Verify type narrowing works
function testNarrowing(response: TestResponse) {
  switch (response.status) {
    case 'success':
      // TypeScript should know response.data is { value: number }
      const data: { value: number } = response.data;
      // @ts-expect-error - response.error should be null
      const error: never = response.error;
      break;
    case 'error':
      // @ts-expect-error - response.data should be null
      const data2: never = response.data;
      // TypeScript should know response.error exists
      const error2: { code: string; message: string; details: Record<string, unknown> | null; recoverable: boolean } = response.error;
      break;
  }
}

console.log('Type inference test passed');
EOF

npx tsx /tmp/test-type-inference.ts

# Expected: Compiles without type errors
# Output: Type inference test passed

# Clean up
rm /tmp/test-type-inference.ts
```

### Level 4: Public API Validation

```bash
# Verify schemas are exported from public API
cat > /tmp/test-public-api.ts << 'EOF'
// Test that schemas are importable from main entry point
import {
  AgentResponseStatusSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseSchema,
} from './src/index.js';

console.log('AgentResponseStatusSchema:', typeof AgentResponseStatusSchema);
console.log('AgentErrorDetailsSchema:', typeof AgentErrorDetailsSchema);
console.log('AgentResponseMetadataSchema:', typeof AgentResponseMetadataSchema);
console.log('AgentResponseSchema:', typeof AgentResponseSchema);

// Verify all are functions (Zod schemas are callable)
if (typeof AgentResponseStatusSchema !== 'object') throw new Error('AgentResponseStatusSchema not exported');
if (typeof AgentErrorDetailsSchema !== 'object') throw new Error('AgentErrorDetailsSchema not exported');
if (typeof AgentResponseMetadataSchema !== 'object') throw new Error('AgentResponseMetadataSchema not exported');
if (typeof AgentResponseSchema !== 'function') throw new Error('AgentResponseSchema not exported');

console.log('All schemas exported from public API');
EOF

npx tsx /tmp/test-public-api.ts

# Expected: All schemas are importable and correct type
# Output: All schemas exported from public API

# Clean up
rm /tmp/test-public-api.ts
```

### Level 5: Existing Test Suite

```bash
# Run existing tests to ensure no breakage
npm test

# Expected: All existing tests pass
# This task only adds schemas, doesn't modify existing behavior

# Run specific test files related to AgentResponse
npm test -- src/__tests__/unit/agent.test.ts
npm test -- src/__tests__/unit/agent-response-public-api.test.ts

# Expected: All AgentResponse tests pass
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] All 4 schemas defined in src/types/agent.ts
- [ ] All 4 schemas exported from src/types/index.ts
- [ ] Type-only import for Zod used
- [ ] discriminatedUnion used for AgentResponseSchema
- [ ] All null fields use z.null() (not z.undefined())

### Schema Validation

- [ ] AgentResponseStatusSchema validates 'success', 'error', 'partial'
- [ ] AgentErrorDetailsSchema has all required fields with correct types
- [ ] AgentErrorDetailsSchema.details uses .nullable()
- [ ] AgentResponseMetadataSchema has all required fields
- [ ] AgentResponseMetadataSchema optional fields use .optional()
- [ ] AgentResponseSchema<T> factory accepts z.ZodTypeAny parameter
- [ ] All discriminated union variants have 'status' discriminator

### Type Safety Validation

- [ ] TypeScript infers correct types from z.infer<typeof Schema>
- [ ] Type narrowing works with switch statement on status field
- [ ] Success variant has data: T, error: null
- [ ] Error variant has data: null, error: AgentErrorDetails
- [ ] Partial variant has data: T, error: null

### PRD Compliance Validation

- [ ] PRD 6.4.1 (Strict JSON): Schemas validate parseable JSON
- [ ] PRD 6.4.2 (No Prose Wrapping): Schema enforces structure only
- [ ] PRD 6.4.3 (Consistent Structure): Schema matches AgentResponse interface
- [ ] PRD 6.4.4 (Null over Undefined): All optional fields use z.null()
- [ ] PRD 6.4.5 (Error Responses): Error variant validates with error field
- [ ] PRD 6.5 (Example Responses): Schemas validate PRD examples

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] Schemas co-located with types (src/types/agent.ts)
- [ ] Exports follow barrel export pattern (src/types/index.ts)
- [ ] No duplicate or conflicting definitions
- [ ] Schemas match existing TypeScript interfaces exactly

---

## Anti-Patterns to Avoid

- ❌ Don't use `import { z } from 'zod'` - use type-only import
- ❌ Don't use `.optional()` for nullable fields - use `.nullable()` per PRD 6.4.4
- ❌ Don't use `.nullish()` - it allows both null and undefined
- ❌ Don't use `z.enum()` for discriminatedUnion - use `z.literal()`
- ❌ Don't forget discriminator field in all variants
- ❌ Don't insert schemas between existing type definitions
- ❌ Don't export schemas as `export type` - they are runtime values
- ❌ Don't modify existing AgentResponse types
- ❌ Don't add schemas to separate file - co-locate with types
- ❌ Don't use schemas for validation yet (that's P1.M2.T1.S2)
- ❌ Don't create circular dependencies with schema imports

---

## Appendix: Complete Schema Reference

### Schema Definitions (Reference Implementation)

```typescript
// Add to src/types/agent.ts after line 360

// ========================
// Zod Schema Definitions
// ========================

/**
 * Zod schema for AgentResponseStatus enum
 * Validates status values: 'success' | 'error' | 'partial'
 *
 * @example
 * ```ts
 * AgentResponseStatusSchema.parse('success'); // ✓
 * AgentResponseStatusSchema.parse('invalid'); // ✗ ZodError
 * ```
 */
export const AgentResponseStatusSchema = z.enum(['success', 'error', 'partial']);

/**
 * Zod schema for AgentErrorDetails interface
 * Validates error details with null-over-undefined handling
 *
 * Per PRD 6.4.4: Use null for absent values, not undefined
 */
export const AgentErrorDetailsSchema = z.object({
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: z.string(),
  /** Human-readable error description */
  message: z.string(),
  /** Additional error context - null if no details (PRD 6.4.4) */
  details: z.record(z.string(), z.unknown()).nullable(),
  /** Whether the error is recoverable (can retry) */
  recoverable: z.boolean(),
});

/**
 * Zod schema for AgentResponseMetadata interface
 * Validates response metadata including agent ID and timestamp
 */
export const AgentResponseMetadataSchema = z.object({
  /** Agent identifier */
  agentId: z.string(),
  /** Unix timestamp in milliseconds */
  timestamp: z.number(),
  /** Execution duration in milliseconds (optional) */
  duration: z.number().optional(),
  /** Request correlation ID (optional) */
  requestId: z.string().optional(),
  /** Token usage from API (optional - passthrough for complex type) */
  usage: z.unknown().optional(),
  /** Number of tool invocations (optional) */
  toolCalls: z.number().optional(),
});

/**
 * Zod schema factory for AgentResponse<T> discriminated union
 * Creates a schema that validates responses based on status discriminator
 *
 * @template T - The Zod schema for the data type
 * @param dataSchema - Zod schema for the response data
 * @returns A discriminated union schema for AgentResponse
 *
 * @example
 * ```ts
 * // Create schema for string responses
 * const StringResponseSchema = AgentResponseSchema(z.object({ result: z.string() }));
 *
 * // Validate a success response
 * const result = StringResponseSchema.safeParse({
 *   status: 'success',
 *   data: { result: 'hello' },
 *   error: null,
 *   metadata: { agentId: 'test', timestamp: Date.now() }
 * });
 * ```
 */
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
    data: dataSchema,  // TODO: Research if should be dataSchema.partial()
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

### Exports (src/types/index.ts)

```typescript
// Add to src/types/index.ts after line 46

// Zod schemas for AgentResponse validation
export {
  AgentResponseStatusSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseSchema,
} from './agent.js';
```

### Usage Examples

```typescript
// Import schemas
import { AgentResponseSchema, AGENT_ERROR_CODES } from 'groundswell';
import { z } from 'zod';

// Create a typed schema
const TaskResponseSchema = AgentResponseSchema(z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'complete']),
}));

// Validate an unknown response
const unknownResponse = JSON.parse(jsonString);
const result = TaskResponseSchema.safeParse(unknownResponse);

if (result.success) {
  // Type narrowing works automatically
  switch (result.data.status) {
    case 'success':
      console.log('Task completed:', result.data.data.taskId);
      break;
    case 'error':
      console.error('Task failed:', result.data.error.message);
      break;
    case 'partial':
      console.log('Task in progress:', result.data.data);
      break;
  }
} else {
  console.error('Invalid response format:', result.error.errors);
}
```

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-24
**Research Complete**: YES
**Implementation Ready**: YES
**Confidence Score**: 10/10
