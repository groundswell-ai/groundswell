# Adversarial Testing Guide for AgentResponse

**PRP**: P1.M4.T1.S3 - Run Adversarial Tests and Fix Failures
**Created**: 2025-01-24
**Purpose**: Comprehensive guide for running, debugging, and fixing adversarial tests

---

## Table of Contents

1. [What Are Adversarial Tests?](#what-are-adversarial-tests)
2. [Test Organization](#test-organization)
3. [Running Adversarial Tests](#running-adversarial-tests)
4. [Understanding Test Categories](#understanding-test-categories)
5. [Debugging Test Failures](#debugging-test-failures)
6. [Common Fix Patterns](#common-fix-patterns)
7. [Validation Strategies](#validation-strategies)

---

## What Are Adversarial Tests?

Adversarial tests are **edge case and error condition tests** that intentionally:
- Trigger error paths
- Validate schema compliance
- Test boundary conditions
- Verify error handling robustness
- Check PRD compliance violations

**Key Difference from Unit/Integration Tests:**
- Unit tests validate happy paths and basic functionality
- Integration tests validate component interactions
- **Adversarial tests validate system robustness under malformed/edge-case inputs**

### Why Adversarial Tests Matter for AgentResponse

1. **Schema Validation**: Ensure Zod schemas catch malformed responses
2. **PRD Compliance**: Validate PRD 6.4.4 (null over undefined) enforcement
3. **Type Safety**: Verify discriminated union behavior
4. **Serialization**: Ensure JSON serializability
5. **Error Codes**: Validate correct error code usage

---

## Test Organization

### Directory Structure

```
src/__tests__/
├── unit/                    # Component-level tests (happy paths)
├── integration/             # Cross-component tests
└── adversarial/             # Edge case and error tests
    ├── agent-response-edge-cases.test.ts    # Primary AgentResponse tests
    ├── prd-compliance.test.ts                # PRD requirement validation
    ├── prd-12-2-compliance.test.ts           # Bidirectional tree consistency
    ├── circular-reference.test.ts            # Circular reference detection
    ├── complex-circular-reference.test.ts    # Deep circular reference tests
    ├── parent-validation.test.ts             # Parent attachment validation
    ├── observer-propagation.test.ts          # Observer event tests
    ├── attachChild-performance.test.ts       # Performance benchmarks
    ├── concurrent-task-failures.test.ts      # Concurrent error handling
    ├── error-merge-strategy.test.ts          # Multi-error merging
    ├── incremental-performance.test.ts       # Build performance
    ├── edge-case.test.ts                     # General edge cases
    ├── deep-analysis.test.ts                 # Deep tree analysis
    ├── deep-hierarchy-stress.test.ts         # Deep nesting stress
    └── node-map-update-benchmarks.test.ts    # Node map benchmarks
```

### Test File Naming Convention

```
<feature>-<test-type>.test.ts

Examples:
- agent-response-edge-cases.test.ts  (AgentResponse edge cases)
- prd-compliance.test.ts             (PRD compliance)
- circular-reference.test.ts         (Circular reference detection)
```

---

## Running Adversarial Tests

### Basic Commands

```bash
# Run all adversarial tests
npm test -- src/__tests__/adversarial/

# Run specific test file
npm test -- src/__tests__/adversarial/agent-response-edge-cases.test.ts

# Run with verbose output (recommended for debugging)
npm test -- --reporter=verbose src/__tests__/adversarial/

# Run in watch mode (for development)
npm test:watch -- src/__tests__/adversarial/

# Run specific test suite by grep pattern
npm test -- --grep "AgentResponse"
npm test -- --grep "PRD 6.4"
npm test -- --grep "Undefined Fields"
```

### Filtering by Test Type

```bash
# AgentResponse-related tests only
npm test -- --grep "AgentResponse"

# Schema validation tests only
npm test -- --grep "Zod"

# PRD compliance tests only
npm test -- --grep "PRD"

# Status validation tests
npm test -- --grep "Status"
```

### Test Output Interpretation

```
✓ src/__tests__/adversarial/agent-response-edge-cases.test.ts (54 tests) 87ms

Test Files  1 passed (1)
Tests       54 passed (54)
Duration    87ms
```

**Successful Output:**
- All tests show `✓` (passing)
- Test count matches expected
- Duration is reasonable (< 5 seconds for adversarial suite)

**Failure Output:**
```
✗ src/__tests__/adversarial/agent-response-edge-cases.test.ts (54 tests)
  ● should fail validation when data field is undefined

    expect(received).toBe(expected)

    Expected: false
    Received: true

     47 |
     48 |      const result = schema.safeParse(invalidResponse);
    > 49 |      expect(result.success).toBe(false);
         |                        ^
```

---

## Understanding Test Categories

### Category 1: AgentResponse Edge Cases

**File**: `agent-response-edge-cases.test.ts`
**Test Count**: 54 tests
**Focus**: AgentResponse schema validation

#### Test Suites:

1. **Undefined Fields (PRD 6.4.4)** - 6 tests
   - Validates that `undefined` fails, `null` passes
   - Tests: data, error, details, agentId, timestamp

2. **Extra Unknown Fields (Passthrough Mode)** - 5 tests
   - Validates Zod passthrough accepts extra fields
   - Tests: response-level, metadata-level, error details-level

3. **Wrong Status Values** - 9 tests
   - Validates case-sensitive status values
   - Tests: uppercase, mixed case, typo, wrong type, null, empty string

4. **Non-Serializable Data** - 5 tests
   - Validates handling of circular refs, functions, symbols, BigInt
   - Tests: JSON.stringify behavior, prototype pollution

5. **Invalid Metadata** - 8 tests
   - Validates metadata type constraints
   - Tests: agentId type, timestamp type, invalid values

6. **Discriminated Union Mismatches** - 5 tests
   - Validates status/data/error consistency
   - Tests: success with error, error with data, wrong null placements

7. **Error Code Edge Cases** - 8 tests
   - Validates error code format flexibility
   - Tests: lowercase, camelCase, kebab-case, special chars, non-string codes

8. **Null vs Undefined Handling (PRD 6.4.4)** - 8 tests
   - Validates null/undefined usage throughout
   - Tests: data, error, details fields, optional metadata fields

### Category 2: PRD Compliance Tests

**File**: `prd-compliance.test.ts`
**Focus**: PRD requirement validation

#### Test Suites:

1. **Decorator Compliance** - Validates `@Step`, `@Task`, `@ObservedState` behavior
2. **Interface Compliance** - Validates WorkflowLogger, Workflow base class
3. **Tree Mirror Requirement** - Validates 1:1 tree invariant
4. **Error Handling** - Validates error propagation and capture

### Category 3: Tree Integrity Tests

**Files**:
- `circular-reference.test.ts`
- `complex-circular-reference.test.ts`
- `parent-validation.test.ts`

**Focus**: Circular reference detection and tree consistency

#### Test Suites:

1. **Immediate Circular References** - parent ↔ child
2. **Ancestor Circular References** - multi-level
3. **Complex Circular Scenarios** - deep nesting

### Category 4: Performance Tests

**Files**:
- `attachChild-performance.test.ts`
- `deep-hierarchy-stress.test.ts`
- `node-map-update-benchmarks.test.ts`
- `incremental-performance.test.ts`

**Focus**: Performance validation under stress

#### Test Suites:

1. **Deep Hierarchy** - 1000+ level nesting
2. **Wide Hierarchy** - 50+ siblings
3. **Large Event Volume** - 1000+ events
4. **Node Map Updates** - update performance benchmarks

---

## Debugging Test Failures

### Step 1: Identify Failure Category

```bash
# Run with verbose output to see full error details
npm test -- --reporter=verbose src/__tests__/adversarial/
```

### Step 2: Locate Failing Test

```
✗ should fail validation when data field is undefined

File: agent-response-edge-cases.test.ts:47
```

### Step 3: Read Test Code

```typescript
it('should fail validation when data field is undefined', () => {
  const schema = AgentResponseSchema(z.string());

  const invalidResponse = {
    status: 'error' as const,
    data: undefined,  // <- This is what's being tested
    error: { code: 'TEST_ERROR', message: 'Test error', details: null, recoverable: false },
    metadata: { agentId: 'test-agent', timestamp: Date.now() }
  };

  const result = schema.safeParse(invalidResponse);
  expect(result.success).toBe(false);  // <- This assertion failed
});
```

### Step 4: Analyze Root Cause

The test expects validation to **fail** when `data` is `undefined`.
If validation **passes**, the implementation is wrong.

**Question**: Why does validation pass when it should fail?

**Possible Causes**:
1. Zod schema uses `z.optional()` instead of `z.nullable()`
2. Factory function not converting `undefined` to `null`
3. Schema validation not enforced

### Step 5: Check Schema Definition

```typescript
// File: src/types/agent.ts

// WRONG - uses optional (allows undefined)
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),  // Allows undefined!
  recoverable: z.boolean(),
});

// CORRECT - uses nullable (requires null)
export const AgentErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),  // Requires null or record
  recoverable: z.boolean(),
});
```

### Step 6: Apply Fix and Re-run

```bash
# After fixing, re-run specific test
npm test -- --grep "should fail validation when data field is undefined"
```

---

## Common Fix Patterns

### Fix Pattern 1: Undefined → Null Conversion

**Symptom**: Test expects validation failure, but validation passes

**Diagnosis**:
```typescript
const result = schema.safeParse({ data: undefined, ... });
expect(result.success).toBe(false);  // FAILS - result.success is true
```

**Fix**: Update schema to reject undefined
```typescript
// Before (WRONG)
data: z.any().optional()

// After (CORRECT)
data: dataSchema.nullable()  // Requires T or null, rejects undefined
```

### Fix Pattern 2: Case-Sensitive Status Values

**Symptom**: Discriminated union validation failure

**Diagnosis**:
```typescript
const response = { status: 'SUCCESS', data: 'test', error: null };
const result = schema.safeParse(response);
expect(result.success).toBe(false);  // PASSES - uppercase rejected
```

**Fix**: Use lowercase status values
```typescript
// Before (WRONG)
status: 'SUCCESS'  // Uppercase

// After (CORRECT)
status: 'success'  // Lowercase
```

### Fix Pattern 3: Discriminated Union Consistency

**Symptom**: Discriminator mismatch error

**Diagnosis**:
```typescript
// Success response with error field populated
const response = {
  status: 'success',
  data: 'test',
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }
};
// FAILS: success requires error: null
```

**Fix**: Match discriminant with field values
```typescript
// For success status
status: 'success'
data: <T>      // populated
error: null    // required null

// For error status
status: 'error'
data: null     // required null
error: { ... } // populated

// For partial status
status: 'partial'
data: <T>      // populated
error: null    // required null
```

### Fix Pattern 4: Error Code Type Validation

**Symptom**: Type error for error code

**Diagnosis**:
```typescript
error: {
  code: 123,  // Number instead of string
  message: 'test',
  details: null,
  recoverable: false
}
// FAILS: code must be string
```

**Fix**: Use string error codes
```typescript
error: {
  code: 'VALIDATION_FAILED',  // SCREAMING_SNAKE_CASE string
  message: 'test',
  details: null,
  recoverable: false
}
```

---

## Validation Strategies

### Strategy 1: Schema Validation

**Use Case**: Validating AgentResponse structure

```typescript
import { AgentResponseSchema } from '../../types/agent.js';

const schema = AgentResponseSchema(z.string());
const result = schema.safeParse(response);

if (!result.success) {
  console.error('Validation failed:', result.error.errors);
  // Handle validation failure
}
```

### Strategy 2: Type Guards

**Use Case**: Runtime type narrowing

```typescript
import { isSuccess, isError, isPartial } from '../../types/agent.js';

const response = await agent.prompt('test');

if (isSuccess(response)) {
  // TypeScript knows response.data is not null
  console.log(response.data.toUpperCase());
} else if (isError(response)) {
  // TypeScript knows response.error is not null
  console.error(response.error.code, response.error.message);
}
```

### Strategy 3: JSON Serialization Test

**Use Case**: Validating serializability

```typescript
const response = createSuccessResponse(data, metadata);

// Test serialization
try {
  const serialized = JSON.stringify(response);
  const deserialized = JSON.parse(serialized);
  console.log('Serialization successful');
} catch (err) {
  console.error('Serialization failed:', err);
  // Handle non-serializable data
}
```

### Strategy 4: Circular Reference Detection

**Use Case**: Detecting circular references

```typescript
function hasCircularReference(obj: unknown): boolean {
  const seen = new WeakSet();

  function detect(obj: unknown): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (seen.has(obj)) {
      return true;  // Circular reference detected
    }

    seen.add(obj);

    for (const value of Object.values(obj)) {
      if (detect(value)) {
        return true;
      }
    }

    return false;
  }

  return detect(obj);
}

// Usage
if (hasCircularReference(data)) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'Response contains circular references',
    null,
    false
  );
}
```

---

## Quick Reference Commands

```bash
# Run all adversarial tests
npm test -- src/__tests__/adversarial/

# Run specific test file
npm test -- src/__tests__/adversarial/agent-response-edge-cases.test.ts

# Run with verbose output
npm test -- --reporter=verbose src/__tests__/adversarial/

# Run by grep pattern
npm test -- --grep "AgentResponse"
npm test -- --grep "PRD 6.4"
npm test -- --grep "Status"

# Run in watch mode
npm test:watch -- src/__tests__/adversarial/

# Run with coverage
npm test -- --coverage src/__tests__/adversarial/
```

---

## References

- **PRD Section 6**: Agent Response Model requirements
- **PRD Section 6.4**: Null over undefined requirement
- **src/types/agent.ts**: AgentResponse type definitions and Zod schemas
- **src/__tests__/adversarial/**: All adversarial test files
- **Failure Catalog**: `adversarial-test-failure-catalog.md`
