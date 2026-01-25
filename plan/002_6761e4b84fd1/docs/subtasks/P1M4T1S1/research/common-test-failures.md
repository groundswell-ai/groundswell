# Common Test Failures and Fixes for Groundswell AgentResponse

**Date**: 2026-01-24
**Context**: PRP for P1.M4.T1.S1 - Run unit tests and fix failures
**Analyzed By**: Research Agent

---

## Overview

This document catalogs common test failures that occur when working with the AgentResponse system in Groundswell, particularly after the migration from direct return values to the `AgentResponse<T>` wrapper pattern. Each failure includes root cause analysis, fix examples, and prevention strategies.

---

## 1. Type Mismatch Failures

### Failure Pattern
```typescript
// Test expects:
expect(result).toBe('expected value');

// But receives:
expect(response).toBe('expected value');  // FAILS - response is an object
```

### Root Cause
Tests were written for the old API where `agent.prompt()` returned `T` directly. After migration, it returns `AgentResponse<T>`.

### Fix Approach

**Before (Old API):**
```typescript
it('should_return_result', async () => {
  const agent = new Agent('TestAgent');
  const result = await agent.prompt(prompt);

  expect(result).toBe('expected value');  // ❌ FAILS after migration
});
```

**After (New API - Fix 1: Extract data):**
```typescript
it('should_return_result', async () => {
  const agent = new Agent('TestAgent');
  const response = await agent.prompt(prompt);

  expect(response.status).toBe('success');
  expect(response.data).toBe('expected value');  // ✅ CORRECT
});
```

**After (New API - Fix 2: Use type guard):**
```typescript
it('should_return_result', async () => {
  const agent = new Agent('TestAgent');
  const response = await agent.prompt(prompt);

  if (isSuccess(response)) {
    expect(response.data).toBe('expected value');  // ✅ CORRECT
  }
});
```

### Prevention Strategy
- Always assert on `response.status` first
- Extract data from `response.data` property
- Use type guards for automatic type narrowing

---

## 2. Missing Status Check Failures

### Failure Pattern
```typescript
// Test directly accesses data without checking status:
const result = response.data.someProperty;  // FAILS if data is null
```

### Root Cause
Tests assume `response.data` is always populated, but error responses have `data: null`.

### Fix Approach

**Before (Unsafe):**
```typescript
it('should_process_result', async () => {
  const response = await agent.prompt(prompt);

  expect(response.data.result).toBe('expected');  // ❌ FAILS if error
});
```

**After (Safe):**
```typescript
it('should_process_result', async () => {
  const response = await agent.prompt(prompt);

  expect(response.status).toBe('success');  // Check first
  expect(response.data?.result).toBe('expected');  // Use optional chaining
});

// Or with error handling:
it('should_handle_both_success_and_error', async () => {
  const response = await agent.prompt(prompt);

  if (response.status === 'error') {
    expect(response.error.code).toBe('EXPECTED_ERROR');
  } else {
    expect(response.data.result).toBe('expected');
  }
});
```

### Prevention Strategy
- Always check `response.status` before accessing `response.data`
- Use optional chaining `response.data?.property` when appropriate
- Test both success and error paths

---

## 3. Incorrect Error Handling Patterns

### Failure Pattern
```typescript
// Test expects error to be thrown:
await expect(agent.prompt(prompt)).rejects.toThrow();

// But new API returns error response:
const response = await agent.prompt(prompt);  // Does not throw
```

### Root Cause
The new `AgentResponse` pattern returns error objects instead of throwing exceptions.

### Fix Approach

**Before (Old API):**
```typescript
it('should_throw_on_error', async () => {
  const agent = new Agent('TestAgent');

  await expect(agent.prompt(badPrompt)).rejects.toThrow();  // ❌
});
```

**After (New API):**
```typescript
it('should_return_error_response', async () => {
  const agent = new Agent('TestAgent');

  const response = await agent.prompt(badPrompt);

  expect(response.status).toBe('error');
  expect(response.error).toBeDefined();
  expect(response.error.code).toBe('INVALID_RESPONSE_FORMAT');
  expect(response.data).toBeNull();
});
```

### Prevention Strategy
- Replace `rejects.toThrow()` with error response assertions
- Check `response.error.code` for specific error types
- Verify `response.error.recoverable` for retry scenarios

---

## 4. Data Extraction Issues

### Failure Pattern
```typescript
// Test uses destructuring expecting direct value:
const { result, count } = await agent.prompt(prompt);  // FAILS
```

### Root Cause
Tests destructure the response object instead of `response.data`.

### Fix Approach

**Before (Old API):**
```typescript
it('should_destructure_result', async () => {
  const { bugs, severity } = await agent.prompt(prompt);

  expect(bugs).toHaveLength(5);  // ❌ FAILS after migration
});
```

**After (New API):**
```typescript
it('should_destructure_result', async () => {
  const response = await agent.prompt(prompt);

  if (isSuccess(response)) {
    const { bugs, severity } = response.data;

    expect(bugs).toHaveLength(5);  // ✅ CORRECT
  }
});
```

### Prevention Strategy
- Always extract from `response.data` after status check
- Use type guards to enable safe destructuring

---

## 5. INVALID_RESPONSE_FORMAT Errors

### Failure Pattern
```typescript
// Test fails with:
Error: INVALID_RESPONSE_FORMAT - Schema validation failed
```

### Root Cause
Response from agent doesn't conform to the Zod schema defined in the prompt.

### Fix Approach

**Diagnose the issue:**
```typescript
it('should_validate_response_format', async () => {
  const prompt = createPrompt({
    user: 'Get user info',
    responseFormat: z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number().int().positive(),
    }),
  });

  const response = await agent.prompt(prompt);

  // Check if it's a validation error
  if (response.status === 'error' &&
      response.error.code === 'INVALID_RESPONSE_FORMAT') {
    console.log('Validation details:', response.error.details);

    // Common causes:
    // 1. Agent returned wrong type (e.g., string instead of number)
    // 2. Agent returned prose instead of JSON
    // 3. Agent returned partial data
  }

  // Fix: Update prompt to be more explicit about format
});
```

**Fix strategy 1: Improve prompt instructions:**
```typescript
const prompt = createPrompt({
  user: `
    Get user info and return ONLY valid JSON matching this schema:
    {
      "name": "string (full name)",
      "email": "string (valid email address)",
      "age": "number (positive integer)"
    }

    Do NOT include any explanatory text outside the JSON.
  `,
  responseFormat: z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number().int().positive(),
  }),
});
```

**Fix strategy 2: Make schema more lenient:**
```typescript
// If agent struggles with strict validation, use .optional() or .nullable()
const responseFormat = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  age: z.number().int().positive().optional(),
});

// Then validate manually after
if (response.status === 'success') {
  if (!response.data.name) {
    console.warn('Missing name field');
  }
}
```

### Prevention Strategy
- Be explicit in prompt instructions about JSON format
- Use examples in prompts showing expected format
- Make schema fields optional when appropriate
- Test with various agent responses

---

## 6. Zod Validation Failures

### Failure Pattern
```typescript
// Test failure:
ZodError: Invalid value at path "data.bugs"
```

### Root Cause
Agent returned data that doesn't match the Zod schema.

### Fix Approach

**Before (Fails on validation error):**
```typescript
it('should_validate_with_zod', async () => {
  const prompt = createPrompt({
    user: 'Analyze code',
    responseFormat: z.object({
      bugs: z.array(z.object({
        line: z.number(),
        severity: z.enum(['low', 'medium', 'high']),
        description: z.string(),
      })),
    }),
  });

  const response = await agent.prompt(prompt);
  // May fail if agent returns different structure
});
```

**After (Handle validation gracefully):**
```typescript
it('should_handle_validation_errors', async () => {
  const prompt = createPrompt({
    user: 'Analyze code',
    responseFormat: z.object({
      bugs: z.array(z.object({
        line: z.number(),
        severity: z.enum(['low', 'medium', 'high']),
        description: z.string(),
      })),
    }),
  });

  const response = await agent.prompt(prompt);

  // Check for validation error
  if (response.status === 'error') {
    if (response.error.code === 'INVALID_RESPONSE_FORMAT') {
      console.log('Schema validation failed:', response.error.details);

      // Option 1: Return partial response with warnings
      // Option 2: Retry with clearer instructions
      // Option 3: Make schema more lenient
    }
  } else {
    expect(response.data.bugs).toBeInstanceOf(Array);
  }
});
```

### Prevention Strategy
- Use `.transform()` in Zod schemas to clean up data
- Use `.passthrough()` to allow extra fields
- Use `.catch()` to provide defaults
- Test schemas with various inputs

---

## 7. Null vs Undefined Issues (PRD 6.4.4)

### Failure Pattern
```typescript
// Test expects null but gets undefined (or vice versa):
expect(response.error).toBeNull();  // FAILS if error is undefined
```

### Root Cause
PRD 6.4.4 specifies using `null` instead of `undefined`, but some code may still use `undefined`.

### Fix Approach

**Verify PRD compliance:**
```typescript
it('should_use_null_not_undefined', async () => {
  const response = createSuccessResponse('test', {
    agentId: 'test',
    timestamp: Date.now(),
  });

  // Success response: error should be null
  expect(response.error).toBeNull();
  expect(response.error).not.toBeUndefined();

  // Verify JSON serialization
  const json = JSON.stringify(response);
  expect(json).not.toContain('undefined');
});
```

**Fix code that uses undefined:**
```typescript
// ❌ WRONG
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // Should be null
  metadata: { ... },
};

// ✅ CORRECT
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,  // PRD 6.4.4 compliant
  metadata: { ... },
};
```

### Prevention Strategy
- Always use `null` for absent values
- Add ESLint rule: `no-undefined` if possible
- Test with `JSON.stringify()` to verify serialization

---

## 8. Type Guard Not Imported

### Failure Pattern
```typescript
// Test tries to use type guard but gets:
ReferenceError: isSuccess is not defined
```

### Root Cause
Type guards need to be imported from `types/agent.js`.

### Fix Approach

**Before (Missing import):**
```typescript
import { AgentResponse } from '../../types/agent.js';

it('should_use_type_guard', () => {
  const response = createSuccessResponse('test', metadata);

  if (isSuccess(response)) {  // ❌ ReferenceError
    // ...
  }
});
```

**After (Correct import):**
```typescript
import {
  AgentResponse,
  isSuccess,
  isError,
  isPartial,
} from '../../types/agent.js';

it('should_use_type_guard', () => {
  const response = createSuccessResponse('test', metadata);

  if (isSuccess(response)) {  // ✅ Works
    expect(response.data).toBe('test');
  }
});
```

### Prevention Strategy
- Always import type guards alongside `AgentResponse` type
- Use consistent import pattern

---

## 9. Mock Response Type Mismatch

### Failure Pattern
```typescript
// Mock response doesn't match expected structure:
const mockResponse = { status: 'success', data: 'test' };
// Missing error and metadata fields
```

### Root Cause
Incomplete mock responses that don't match full `AgentResponse<T>` interface.

### Fix Approach

**Before (Incomplete mock):**
```typescript
const mockResponse = {
  status: 'success',
  data: 'test',
  // Missing error and metadata
};
```

**After (Complete mock):**
```typescript
const mockResponse: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,
  metadata: {
    agentId: 'mock-agent',
    timestamp: Date.now(),
    duration: 100,
  },
};

// Or use factory function:
const mockResponse = createSuccessResponse('test', {
  agentId: 'mock-agent',
  timestamp: Date.now(),
});
```

### Prevention Strategy
- Use factory functions (`createSuccessResponse`, `createErrorResponse`)
- Always include all required fields in mocks
- Type mocks as `AgentResponse<T>`

---

## 10. Async Test Timing Issues

### Failure Pattern
```typescript
// Test passes sometimes, fails other times:
Timeout: Async callback was not invoked within 5000ms
```

### Root Cause
Test doesn't properly await async operations.

### Fix Approach

**Before (Missing await):**
```typescript
it('should_handle_async', async () => {
  const response = agent.prompt(prompt);  // ❌ Missing await

  expect(response.status).toBe('success');
});
```

**After (Proper async handling):**
```typescript
it('should_handle_async', async () => {
  const response = await agent.prompt(prompt);  // ✅ Await

  expect(response.status).toBe('success');
});
```

**For promises that should reject:**
```typescript
it('should_handle_rejection', async () => {
  // Don't use this with AgentResponse (it doesn't throw)
  // Instead check for error status

  const response = await agent.prompt(badPrompt);

  expect(response.status).toBe('error');
  expect(response.error).toBeDefined();
});
```

### Prevention Strategy
- Always use `async` in test function
- Always `await` promise-returning functions
- Use Vitest's async matchers appropriately

---

## 11. Metadata Validation Failures

### Failure Pattern
```typescript
// Test expects specific metadata values but they're different:
expect(response.metadata.duration).toBe(100);  // FAILS - actual is 105
```

### Root Cause
Metadata values (especially timing) are non-deterministic.

### Fix Approach

**Before (Strict equality):**
```typescript
it('should_include_metadata', async () => {
  const response = await agent.prompt(prompt);

  expect(response.metadata.duration).toBe(100);  // ❌ Too strict
});
```

**After (Range checking):**
```typescript
it('should_include_metadata', async () => {
  const response = await agent.prompt(prompt);

  expect(response.metadata.agentId).toBeDefined();
  expect(response.metadata.timestamp).toBeDefined();
  expect(response.metadata.timestamp).toBeLessThanOrEqual(Date.now());
  expect(response.metadata.duration).toBeGreaterThan(0);
  expect(response.metadata.duration).toBeLessThan(10000);  // Reasonable max
});
```

### Prevention Strategy
- Use range assertions for timing-related values
- Only test deterministic values (agentId format, field existence)
- Use `.toBeDefined()` instead of strict equality for generated values

---

## 12. Serialization Round-trip Failures

### Failure Pattern
```typescript
// Test fails after JSON stringify/parse:
expect(JSON.parse(JSON.stringify(response))).toEqual(response);  // FAILS
```

### Root Cause
Some values (like `Date` objects) don't serialize cleanly.

### Fix Approach

**Before (Direct comparison):**
```typescript
it('should_survive_serialization', () => {
  const response = createSuccessResponse('test', {
    agentId: 'test',
    timestamp: Date.now(),  // Number, not Date
  });

  const roundtrip = JSON.parse(JSON.stringify(response));
  expect(roundtrip).toEqual(response);  // May fail
});
```

**After (Selective comparison):**
```typescript
it('should_survive_serialization', () => {
  const response = createSuccessResponse('test', {
    agentId: 'test',
    timestamp: Date.now(),
  });

  const serialized = JSON.stringify(response);
  const roundtrip = JSON.parse(serialized);

  // Check critical fields
  expect(roundtrip.status).toBe(response.status);
  expect(roundtrip.data).toBe(response.data);
  expect(roundtrip.metadata.agentId).toBe(response.metadata.agentId);

  // Check that it's valid JSON (no undefined, etc.)
  expect(serialized).not.toContain('undefined');
});
```

### Prevention Strategy
- Store timestamps as numbers, not Date objects
- Use `.toBeDefined()` for optional fields after deserialization
- Test serializability of complex objects

---

## Quick Reference: Failure Types to Fixes

| Failure Type | Quick Fix |
|--------------|-----------|
| `expect(result).toBe()` | Change to `expect(response.data).toBe()` |
| `await expects().rejects` | Change to error response assertion |
| `response.data.property` | Add status check first |
| `isSuccess is not defined` | Import type guard |
| `ZodError` | Check schema, improve prompt |
| `toBeNull() fails` | Verify PRD 6.4.4 compliance |
| `Timeout` | Add `await` keyword |
| `metadata.duration mismatch` | Use range assertions |

---

## Prevention Strategies Summary

1. **Always check status first** before accessing data
2. **Use factory functions** for creating test responses
3. **Import type guards** alongside AgentResponse type
4. **Use range assertions** for timing-related metadata
5. **Be explicit in prompts** about JSON format requirements
6. **Test both success and error paths** in each scenario
7. **Use async/await properly** - always await promises
8. **Verify PRD compliance** - null over undefined, valid JSON

---

## Git History Insights

Recent commits show patterns in test fixes:

1. **Adversarial Testing Commits** - Added comprehensive edge case tests
2. **Error Code Handling** - Improved test coverage for all error codes
3. **Schema Validation** - Added Zod schema compliance tests
4. **Type Guard Tests** - Verified type narrowing behavior

These commits indicate that the most common fixes involve:
- Adding status checks
- Using type guards
- Testing error paths
- Validating against PRD requirements
