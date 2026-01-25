# Research Summary: AgentResponse Adversarial Edge Cases

## Overview

This document summarizes research conducted for creating adversarial tests for AgentResponse edge cases (P1.M2.T2.S3). The research covered existing adversarial test patterns, AgentResponse validation schemas, and TypeScript/Zod best practices.

---

## 1. Existing Adversarial Test Patterns in Groundswell

### File Location
All adversarial tests are located in: `src/__tests__/adversarial/`

### Common Test Structure Template

```typescript
/**
 * Test File Header
 *
 * Description of test purpose and scope
 * References to related documentation/PRDs
 * Test case categorization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { /* imports */ } from '../../index.js';

describe('Test Suite Description', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('test description', () => {
    // ARRANGE: Setup test data
    // ACT: Perform the action
    // ASSERT: Verify the results
  });
});
```

### Edge Case Testing Patterns Observed

1. **Circular Reference Testing**
   - Immediate circular reference: Child attaching to its direct parent
   - Multi-level circular reference: Grandchild attaching to grandparent
   - Pattern: Use regex matching `/circular|cycle|ancestor/i` for error messages

2. **Empty and Null Value Testing**
   - Empty string workflow names
   - Null/undefined observed state values
   - Empty arrays from @Task methods

3. **Unicode and Special Character Testing**
   - Test workflow names with Unicode characters
   - Test log messages with emojis and special characters

4. **Performance Testing**
   - Create chains of 1000+ levels to test stack safety
   - Use iterative creation (not recursive) to avoid test-side stack overflow
   - Performance thresholds (< 100ms for operations)

---

## 2. AgentResponse Type Structure Analysis

### Core Interfaces

```typescript
// Status discriminant type
export type AgentResponseStatus = 'success' | 'error' | 'partial';

// Main response wrapper (PRD 6.1)
export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;          // Discriminant for type narrowing
  data: T | null;                       // Response data or null for errors
  error: AgentErrorDetails | null;      // Error details or null for success/partial
  metadata: AgentResponseMetadata;      // Always present metadata
}

// Error details (PRD 6.2)
export interface AgentErrorDetails {
  code: string;                         // Machine-readable code (SCREAMING_SNAKE_CASE)
  message: string;                      // Human-readable description
  details?: Record<string, unknown> | null;  // Additional context
  recoverable: boolean;                 // Retry hint for parent workflows
}

// Response metadata (PRD 6.3)
export interface AgentResponseMetadata {
  agentId: string;                      // Required: Agent identifier
  timestamp: number;                    // Required: Unix timestamp in milliseconds
  duration?: number | null;             // Optional: Execution duration
  requestId?: string | null;            // Optional: Correlation ID
  usage?: TokenUsage;                   // Optional: Token usage info
  toolCalls?: number;                   // Optional: Number of tool invocations
}
```

### Discriminated Union Types

```typescript
// Success response (data: T, error: null)
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };

// Error response (data: null, error: AgentErrorDetails)
export type ErrorResponse = AgentResponse<null> & { status: 'error' };

// Partial response (data: T, error: null)
export type PartialResponse<T> = AgentResponse<T> & { status: 'partial' };
```

### Factory Functions

```typescript
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T>;

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null>;

export function createPartialResponse<T>(
  data: T
): AgentResponse<T>;
```

### Type Guards

```typescript
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>;
export function isError<T>(response: AgentResponse<T>): response is ErrorResponse;
export function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T>;
```

---

## 3. Zod Schema Validation Rules

### Individual Schemas

```typescript
// Status enum validation
export const AgentResponseStatusSchema = z.enum(['success', 'error', 'partial']);

// Error details validation with null-over-undefined handling
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),  // PRD 6.4.4: null not undefined
  recoverable: z.boolean(),
});

// Metadata validation
export const AgentResponseMetadataSchema = z.object({
  agentId: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),
  requestId: z.string().optional(),
  usage: z.unknown().optional(),
  toolCalls: z.number().optional(),
});
```

### Discriminated Union Schema Factory

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

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

---

## 4. Edge Cases to Test (Adversarial Scenarios)

### Category 1: Undefined Fields (Should Fail Validation)

1. **Missing status field**
2. **Missing data field** (or undefined instead of null)
3. **Missing error field** (or undefined instead of null)
4. **Missing metadata field**
5. **Missing required metadata fields** (agentId, timestamp)

### Category 2: Extra Unknown Fields (Should Pass - Zod passthrough)

1. **Extra fields on success response**
2. **Extra fields on error response**
3. **Extra fields on partial response**
4. **Extra fields on metadata**
5. **Extra fields on error details**

### Category 3: Wrong Status Values (Should Fail)

1. **Invalid status string** ('SUCCESS', 'Success', 'succes', 'pending', 'running')
2. **Wrong type for status** (number, boolean, object, null)
3. **Empty string for status**
4. **Case variations** of valid statuses

### Category 4: Non-Serializable Data (Should Fail or Be Handled)

1. **Circular references** in data object
2. **Functions** in data or details
3. **Symbols** in data or details
4. **BigInt** in data or details
5. **Prototype pollution attempts** (`__proto__`, `constructor`, `prototype`)

### Category 5: Invalid Metadata

1. **Invalid agentId**: number, null, undefined, empty string
2. **Invalid timestamp**: string, null, undefined, negative, NaN, Infinity
3. **Invalid duration**: negative, NaN, Infinity, string
4. **Invalid toolCalls**: negative, NaN, Infinity, string

### Category 6: Discriminated Union Mismatches

1. **Success with error populated** (should be null)
2. **Error with data populated** (should be null)
3. **Success with null data** (valid for some schemas, but test edge cases)
4. **Error with null error** (invalid, error is required for error status)

### Category 7: Error Code Edge Cases

1. **Invalid error code format**: lowercase, camelCase, kebab-case
2. **Empty string error code**
3. **Error code with special characters**
4. **Error code with spaces**
5. **Non-string error code**

### Category 8: Null vs Undefined Handling (PRD 6.4.4)

1. **undefined instead of null** for data/error fields
2. **undefined instead of null** for details field
3. **Optional fields missing** vs being null

---

## 5. TypeScript/Zod Best Practices for Adversarial Testing

### Test Pattern 1: Discriminated Union Validation

```typescript
// Test valid discriminator variants
expect(schema.safeParse({ status: 'success', data: 'test', error: null }).success).toBe(true);

// Test invalid discriminator values
expect(schema.safeParse({ status: 'invalid', data: 'test', error: null }).success).toBe(false);
if (!result.success) {
  expect(result.error.errors[0].code).toEqual(ZodIssueCode.invalid_union_discriminator);
}

// Test mismatched fields (valid discriminator, wrong data)
expect(schema.safeParse({ status: 'success', data: null, error: null }).success).toBe(false);
```

### Test Pattern 2: Undefined vs Null vs Missing

| Input Type | `.optional()` | `.nullable()` | `.nullish()` |
|------------|---------------|---------------|--------------|
| `undefined` | ✅ Accept | ❌ Reject | ✅ Accept |
| `null` | ❌ Reject | ✅ Accept | ✅ Accept |
| Missing | ✅ Accept | ❌ Reject | ✅ Accept |

### Test Pattern 3: Extra Fields (Three Modes)

- **strip** (default) - Silently removes unknown keys
- **passthrough** - Keeps unknown keys
- **strict** - Rejects objects with unknown keys

### Test Pattern 4: Serialization Testing

Always test round-trip serialization:
```typescript
const serialized = JSON.parse(JSON.stringify(response));
expect(serialized).toEqual(response);
```

### Test Pattern 5: Error Code Validation

```typescript
// Test error code format
expect(errorCode).toMatch(/^[A-Z][A-Z_]*$/);

// Test error code is string
expect(typeof errorCode).toBe('string');
```

---

## 6. Known Gotchas

1. **Zod's default mode is strip**, not strict - unknown fields are removed silently
2. **Undefined vs null matters** - PRD 6.4.4 specifies null, not undefined
3. **Circular references cause JSON.stringify to throw** - must be caught
4. **Functions are lost during serialization** - test should verify this
5. **Symbols are lost during serialization** - test should verify this
6. **Discriminated unions require exact literal matches** - case-sensitive
7. **Type guards can be bypassed with type assertions** - test should verify runtime validation

---

## 7. References

### Internal Sources

**Zod v3 Test Suite**: `/home/dustin/projects/groundswell/node_modules/zod/src/v3/tests/`
- discriminated-unions.test.ts
- object.test.ts
- optional.test.ts
- nullable.test.ts
- nan.test.ts
- lazy.test.ts
- function.test.ts

**Groundswell Tests**:
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent-error-codes.test.ts`

**Previous PRP**:
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T2S2/PRP.md` (error code handling tests)

### External Documentation

- **Zod**: https://zod.dev/
- **Zod GitHub**: https://github.com/colinhacks/zod
- **Vitest**: https://vitest.dev/

---

## 8. Test File Specification

**File Path**: `src/__tests__/adversarial/agent-response-edge-cases.test.ts`

**Test Categories**:
1. Undefined fields (should fail)
2. Extra unknown fields (should pass)
3. Wrong status values (should fail)
4. Non-serializable data (should fail or be handled)
5. Invalid metadata (should fail)

**Imports**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  createErrorResponse,
  createSuccessResponse,
  createPartialResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
} from '../../types/agent.js';
```

---

## Summary

This research provides the foundation for creating comprehensive adversarial tests for AgentResponse edge cases. The tests should validate that the Zod schemas correctly reject malformed inputs while allowing valid responses with extra fields (passthrough mode).
