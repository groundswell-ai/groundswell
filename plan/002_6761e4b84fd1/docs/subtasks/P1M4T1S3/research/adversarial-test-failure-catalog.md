# Adversarial Test Failure Catalog

**PRP**: P1.M4.T1.S3 - Run Adversarial Tests and Fix Failures
**Created**: 2025-01-24
**Purpose**: Catalog of common adversarial test failure patterns with detection, fix, and prevention strategies

---

## Overview

This document catalogs the most common adversarial test failure patterns discovered during research for PRP P1.M4.T1.S3. Adversarial tests intentionally trigger errors and validate edge cases, so failures indicate bugs in implementation, not test issues.

## Test Categories

The codebase has **15 adversarial test files** in `src/__tests__/adversarial/`:

| Test File | Purpose | AgentResponse Related |
|-----------|---------|----------------------|
| `agent-response-edge-cases.test.ts` | AgentResponse schema validation edge cases | **YES** - Primary focus |
| `prd-compliance.test.ts` | PRD requirement compliance validation | **YES** - PRD 6.4 compliance |
| `prd-12-2-compliance.test.ts` | Bidirectional tree consistency | NO - Workflow behavior |
| `circular-reference.test.ts` | Circular reference detection | NO - Tree integrity |
| `complex-circular-reference.test.ts` | Deep circular reference scenarios | NO - Tree integrity |
| `parent-validation.test.ts` | Parent-child attachment validation | NO - Tree integrity |
| `observer-propagation.test.ts` | Observer event propagation | NO - Workflow behavior |
| `attachChild-performance.test.ts` | Performance benchmarks | NO - Performance |
| `concurrent-task-failures.test.ts` | Concurrent task error handling | NO - Workflow behavior |
| `error-merge-strategy.test.ts` | Multi-error merging | NO - Workflow behavior |
| `incremental-performance.test.ts` | Incremental build performance | NO - Performance |
| `edge-case.test.ts` | General edge cases | PARTIAL - May touch AgentResponse |
| `deep-analysis.test.ts` | Comprehensive deep tree analysis | NO - Workflow behavior |
| `deep-hierarchy-stress.test.ts` | Deep nesting stress tests | NO - Performance |
| `node-map-update-benchmarks.test.ts` | Node map update benchmarks | NO - Performance |

---

## Catalog of Failure Patterns

### Pattern 1: PRD 6.4.4 Violations (Undefined Instead of Null)

**Detection:**
```
expect(result.success).toBe(false);
// ZodError: Invalid undefined - expected null
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 47-156
- Any test using `AgentResponseSchema`

**Root Cause:**
Using `undefined` instead of `null` for absent values violates PRD 6.4.4 requirement.

**Fix:**
```typescript
// WRONG (fails validation)
{
  status: 'error',
  data: undefined,  // VIOLATES PRD 6.4.4
  error: { code: 'TEST', message: 'test', details: undefined, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
}

// CORRECT (passes validation)
{
  status: 'error',
  data: null,  // PRD 6.4.4 COMPLIANT
  error: { code: 'TEST', message: 'test', details: null, recoverable: false },
  metadata: { agentId: 'test', timestamp: Date.now() }
}
```

**Prevention:**
- Always use factory functions: `createErrorResponse()`, `createSuccessResponse()`, `createPartialResponse()`
- Factory functions automatically convert `undefined` to `null`
- Never manually construct `AgentResponse` objects

---

### Pattern 2: Status Case Sensitivity Failures

**Detection:**
```
expect(result.success).toBe(false);
// ZodError: Invalid discriminator value
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 272-344

**Root Cause:**
Status field is case-sensitive. Uppercase or mixed case values fail discriminated union validation.

**Fix:**
```typescript
// WRONG (fails validation)
status: 'SUCCESS'     // Uppercase - fails
status: 'Success'     // Mixed case - fails
status: 'succes'      // Typo - fails

// CORRECT (passes validation)
status: 'success'     // Lowercase - passes
status: 'error'       // Lowercase - passes
status: 'partial'     // Lowercase - passes
```

**Prevention:**
- Use exact string literals: `'success' | 'error' | 'partial'`
- Use TypeScript const assertions: `status: 'success' as const`
- Use factory functions which handle status correctly

---

### Pattern 3: Discriminated Union Mismatches

**Detection:**
```
expect(result.success).toBe(false);
// ZodError: Discriminator mismatch
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 716-814

**Root Cause:**
Status discriminant doesn't match data/error field values.

**Fix:**
```typescript
// WRONG: Success with error populated
{
  status: 'success',
  data: 'result',
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }  // Should be null
}

// CORRECT: Success with null error
{
  status: 'success',
  data: 'result',
  error: null
}

// WRONG: Error with data populated
{
  status: 'error',
  data: 'result',  // Should be null
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }
}

// CORRECT: Error with null data
{
  status: 'error',
  data: null,
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }
}
```

**Prevention:**
- Always use factory functions
- Factory functions enforce discriminant consistency

---

### Pattern 4: Invalid Error Code Types

**Detection:**
```
expect(result.success).toBe(false);
// ZodError: Expected string, received number
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 899-939

**Root Cause:**
Error code must be string, not number or boolean.

**Fix:**
```typescript
// WRONG: Non-string error codes
error: {
  code: 123,           // Number - fails
  code: true,          // Boolean - fails
  code: null,          // Null - fails
  message: 'test',
  details: null,
  recoverable: false
}

// CORRECT: String error codes
error: {
  code: 'VALIDATION_FAILED',     // SCREAMING_SNAKE_CASE
  code: 'TEST_ERROR',            // SCREAMING_SNAKE_CASE
  code: 'custom_error_code',     // Also accepted (any string)
  message: 'test',
  details: null,
  recoverable: false
}
```

**Prevention:**
- Use `AGENT_ERROR_CODES` constants: `AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT`
- If creating custom codes, use SCREAMING_SNAKE_CASE convention

---

### Pattern 5: Metadata Validation Failures

**Detection:**
```
expect(result.success).toBe(false);
// ZodError: Invalid type for metadata field
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 577-712

**Root Cause:**
Metadata fields have specific type requirements.

**Fix:**
```typescript
// WRONG: Wrong metadata types
metadata: {
  agentId: 123456,        // Should be string
  agentId: null,          // Should be string
  agentId: undefined,     // Should be string
  timestamp: '123456',    // Should be number
  timestamp: NaN,         // Invalid (but passes Zod)
  timestamp: Infinity     // Invalid (but passes Zod)
}

// CORRECT: Correct metadata types
metadata: {
  agentId: 'agent-123',           // String
  timestamp: Date.now(),          // Number (Unix timestamp)
  duration: 1500,                 // Optional number
  requestId: 'req-456'            // Optional string
}
```

**Prevention:**
- Always provide valid `agentId` (string) and `timestamp` (number)
- Generate timestamps with `Date.now()`
- Generate agent IDs with proper ID generation function

---

### Pattern 6: Circular Reference in AgentResponse Data

**Detection:**
```
expect(() => JSON.stringify(response)).toThrow();
// TypeError: Converting circular structure to JSON
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 442-467

**Root Cause:**
Data field contains circular references, making response non-serializable.

**Fix:**
```typescript
// WRONG: Circular reference
const data: any = { name: 'test' };
data.self = data;  // Circular

const response = {
  status: 'success',
  data: data,  // Contains circular reference
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// CORRECT: Remove circular references
const data = { name: 'test' };
// Don't create circular references
const response = createSuccessResponse(data, metadata);

// OR: Detect and handle
if (hasCircularReference(data)) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'Response contains circular references',
    { originalData: safeStringify(data) },
    false
  );
}
```

**Prevention:**
- Validate data doesn't contain circular references before wrapping
- Use `JSON.stringify()` test as validation
- Consider using libraries like `flatted` for circular-safe serialization

---

### Pattern 7: Non-Serializable Data Types

**Detection:**
```
expect(() => JSON.stringify(response)).toThrow();
// TypeError: BigInt is not JSON serializable
// TypeError: Function is not JSON serializable
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 469-545

**Root Cause:**
Data contains non-JSON-serializable types (functions, symbols, BigInt).

**Fix:**
```typescript
// WRONG: Non-serializable types
{
  status: 'success',
  data: {
    func: () => 'value',           // Function - lost in JSON
    [Symbol('key')]: 'value',      // Symbol - lost in JSON
    bigInt: BigInt(123),           // BigInt - throws in JSON.stringify
  },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
}

// CORRECT: JSON-serializable types only
{
  status: 'success',
  data: {
    string: 'value',
    number: 123,
    boolean: true,
    array: [1, 2, 3],
    object: { nested: 'value' },
    null: null,
  },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
}
```

**Prevention:**
- Validate data with `JSON.stringify()` before wrapping in AgentResponse
- Use serialization libraries like `superjson` for complex types
- Document which data types are supported

---

### Pattern 8: Extra Unknown Fields (Passthrough Mode)

**Detection:**
```
expect(result.success).toBe(true);
// BUT: Extra fields may not be preserved
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 158-268

**Root Cause:**
Zod passthrough mode accepts extra fields, but they may not be preserved in all contexts.

**Expected Behavior:**
```typescript
// ACCEPTED: Extra fields on response
{
  status: 'success',
  data: 'test',
  error: null,
  extraField: 'extra',      // Allowed (passthrough)
  metadata: {
    agentId: 'test',
    timestamp: Date.now(),
    customField: 'custom'   // Allowed (passthrough)
  }
}

// This PASSES validation but extra fields may be stripped
```

**Note:**
This is NOT a failure. Zod's passthrough mode is intentionally permissive.
Extra fields are allowed for forward compatibility.

---

### Pattern 9: Zod Validation Errors Structure

**Detection:**
```
if (!result.success) {
  expect(result.error.errors[0].code).toBe('invalid_union_discriminator');
}
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 287-291

**Root Cause:**
Zod error structure must be understood to write proper assertions.

**Fix:**
```typescript
const result = schema.safeParse(invalidResponse);

if (!result.success) {
  // Check for specific Zod error codes
  const hasDiscriminatorError = result.error.errors.some(
    e => e.code === 'invalid_union_discriminator'
  );
  expect(hasDiscriminatorError).toBe(true);

  // Check error path
  const hasDataError = result.error.errors.some(
    e => e.path.includes('data')
  );
}
```

**Zod Error Codes:**
- `invalid_union_discriminator` - Wrong status value
- `invalid_type` - Wrong type (expected string, got number)
- `invalid_literal` - Wrong literal value
- `too_small` / `too_big` - Array/string length constraints

---

### Pattern 10: Prototype Pollution Attempts

**Detection:**
```
expect(result.success).toBe(true);
expect(cleanObj.polluted).toBeUndefined();
```

**Affected Files:**
- `agent-response-edge-cases.test.ts` lines 547-573

**Root Cause:**
Malicious input attempts to pollute Object.prototype.

**Expected Behavior:**
```typescript
// ATTEMPT: Prototype pollution
{
  status: 'success',
  data: {
    name: 'test',
    '__proto__': { polluted: true },
    'constructor': { prototype: { polluted: true } }
  },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
}

// EXPECTED: Validation passes but no pollution occurs
const cleanObj = {};
expect((cleanObj as any).polluted).toBeUndefined();
```

**Note:**
Zod treats `__proto__` as a regular string key, which is safe.
This is NOT a failure - it's expected behavior.

---

## Quick Reference: Fix Patterns

### PRD 6.4.4 Compliance (Most Common)

| Field | Wrong | Correct |
|-------|-------|---------|
| data (error status) | `undefined` | `null` |
| error (success status) | `undefined` | `null` |
| details | `undefined` | `null` |
| Optional fields | `undefined` | Omit or `null` |

### Status Values

| Wrong | Correct |
|-------|---------|
| `'SUCCESS'` | `'success'` |
| `'Error'` | `'error'` |
| `'PARTIAL'` | `'partial'` |
| `'succes'` | `'success'` |
| `''` | `'success'` |

### Error Codes

| Wrong | Correct |
|-------|---------|
| `123` | `'ERROR_CODE'` |
| `true` | `'ERROR_CODE'` |
| `null` | `'ERROR_CODE'` |

### Metadata Types

| Field | Wrong | Correct |
|-------|-------|---------|
| agentId | `123` | `'agent-123'` |
| agentId | `null` | `'agent-123'` |
| timestamp | `'123456'` | `Date.now()` |
| timestamp | `NaN` | `Date.now()` |

---

## Testing Commands

```bash
# Run all adversarial tests
npm test -- src/__tests__/adversarial/

# Run specific adversarial test file
npm test -- src/__tests__/adversarial/agent-response-edge-cases.test.ts

# Run with verbose output
npm test -- --reporter=verbose src/__tests__/adversarial/

# Run AgentResponse-related adversarial tests
npm test -- --grep "AgentResponse"
```

---

## References

- **PRD Section 6.4**: "Null over undefined" requirement
- **PRD Section 6.6**: Response validation requirements
- **src/types/agent.ts**: AgentResponse type definitions and Zod schemas
- **src/__tests__/adversarial/agent-response-edge-cases.test.ts**: Primary adversarial test file
