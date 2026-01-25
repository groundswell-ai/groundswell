# AgentResponse Type Usage Patterns & Common Errors

**Date**: 2026-01-24
**Context**: P1.M4.T2.S1 - TypeScript Compiler Verification
**Focus**: AgentResponse<T> type usage patterns found in Groundswell codebase
**Researcher**: Claude Code Agent

---

## Table of Contents

1. [AgentResponse Type Definition](#1-agentresponse-type-definition)
2. [Common Usage Patterns](#2-common-usage-patterns)
3. [Common TypeScript Error Patterns](#3-common-typescript-error-patterns)
4. [File-Specific Analysis](#4-file-specific-analysis)
5. [Recommendations](#5-recommendations)

---

## 1. AgentResponse Type Definition

### Core Interface

Located in `/home/dustin/projects/groundswell/src/types/agent.ts`:

```typescript
export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;  // 'success' | 'error' | 'partial'
  data: T | null;               // null for error responses
  error: AgentErrorDetails | null;  // null for success/partial responses
  metadata: AgentResponseMetadata;
}

export type AgentResponseStatus = 'success' | 'error' | 'partial';
```

### Type Guards

```typescript
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

export function isError(response: AgentResponse<unknown>): response is ErrorResponse {
  return response.status === 'error';
}

export function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

### Factory Functions

```typescript
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): SuccessResponse<T>

export function createErrorResponse(
  code: string,
  message: string,
  details: Record<string, unknown> | null,
  recoverable: boolean,
  metadata?: AgentResponseMetadata
): ErrorResponse

export function createPartialResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): PartialResponse<T>
```

---

## 2. Common Usage Patterns

### Pattern 1: Function Return Types (CORRECT)

**Location**: `src/core/agent.ts:121`

```typescript
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}
```

**Analysis**: ✅ Correct - Explicit return type annotation with generic parameter

---

### Pattern 2: Type Guard Usage (CORRECT)

**Location**: `src/__tests__/integration/agent-workflow.test.ts:284`

```typescript
if (isSuccess(mockResponse)) {
  return { result: mockResponse.data };
}
```

**Analysis**: ✅ Correct - Type guard used before accessing data property

---

### Pattern 3: Variable Declarations (CORRECT)

**Location**: `src/__tests__/unit/agent-response.test.ts:654`

```typescript
const response: AgentResponse<string> = createSuccessResponse('test', {
  agentId: 'test-agent',
  timestamp: Date.now(),
});
```

**Analysis**: ✅ Correct - Explicit type annotation with factory function

---

### Pattern 4: Optional Chaining (CORRECT)

**Location**: `src/core/agent.ts:139`

```typescript
throw new Error(response.error?.message ?? 'Unknown error');
```

**Analysis**: ✅ Correct - Optional chaining with nullish coalescing fallback

---

## 3. Common TypeScript Error Patterns

### Error Pattern 1: Missing Type Guard Checks

**Problem**: Accessing `data` or `error` without checking `status` first

**Example Problematic Code**:
```typescript
// ❌ ERROR: Object is possibly 'null'
const response = await agent.prompt(prompt);
console.log(response.data.value);  // TypeScript error
```

**Fix**:
```typescript
// ✅ CORRECT: Use type guard before access
const response = await agent.prompt(prompt);
if (isSuccess(response)) {
  console.log(response.data.value);  // Safe access
}
```

**Error Code**: TS2531 - Object is possibly 'null'

**Files Potentially Affected**:
- Any file calling `agent.prompt()`
- `src/core/agent.ts` (internal methods)
- `src/reflection/reflection.ts`
- Example files (01-11)

---

### Error Pattern 2: Forceful Non-Null Assertion

**Location**: `src/core/workflow-context.ts:300`

**Problematic Pattern**:
```typescript
// ⚠️ RISKY: Forceful assertion instead of type guard
const { code, message } = response.error!;
```

**Issue**: Using `!` non-null assertion instead of proper type checking

**Recommended Fix**:
```typescript
// ✅ CORRECT: Type guard before access
if (isError(response)) {
  const { code, message } = response.error;
}
```

**Error Code**: Potential TS2531 if response is not error type

---

### Error Pattern 3: Missing Type Annotations on Returns

**Problem**: Functions returning `AgentResponse<T>` without explicit return type

**Example**:
```typescript
// ❌ ERROR: No return type annotation
async function executeAgent() {
  return await agent.prompt(prompt);  // TypeScript may infer wrong type
}
```

**Fix**:
```typescript
// ✅ CORRECT: Explicit return type
async function executeAgent(): Promise<AgentResponse<ResultType>> {
  return await agent.prompt(prompt);
}
```

**Error Code**: TS7010, TS7005 (with noImplicitAny)

---

### Error Pattern 4: Discriminated Union Mismatch

**Problem**: Status value doesn't match data/error field values

**Example**:
```typescript
// ❌ ERROR: Success with error populated
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: { code: 'TEST', message: 'test', details: null, recoverable: false }
};
```

**Fix**: Use factory functions
```typescript
// ✅ CORRECT: Factory function enforces consistency
const response = createSuccessResponse('test', metadata);
```

**Error Code**: TS2322 - Type not assignable

---

### Error Pattern 5: Type Assertion Overuse

**Location**: Multiple instances in `src/core/agent.ts`

**Problematic Pattern**:
```typescript
// ⚠️ RISKY: Type assertion bypasses type checker
return result as AgentResponse<T>;
```

**Issue**: Multiple type assertions suggest TypeScript type inference issues

**Recommended Fix**:
- Improve type inference
- Add explicit type checks
- Use factory functions which return properly typed values

---

### Error Pattern 6: Null vs Undefined (PRD 6.4.4)

**Problem**: Using `undefined` instead of `null` for absent values

**Example**:
```typescript
// ❌ ERROR: undefined is not assignable to null
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // WRONG
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Fix**:
```typescript
// ✅ CORRECT: Use null (PRD 6.4.4 compliant)
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,  // CORRECT
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Error Code**: TS2345 - undefined is not assignable to type 'null'

---

### Error Pattern 7: Generic Type Parameter Not Specified

**Problem**: TypeScript cannot infer generic type parameter

**Example**:
```typescript
// ❌ ERROR: Cannot infer T
function wrapData<T>() {
  return { data: null as T | null };
}
const result = wrapData();  // What is T?
```

**Fix**:
```typescript
// ✅ CORRECT: Specify type explicitly
const result = wrapData<string>();
```

**Error Code**: TS2345, TS2314

---

## 4. File-Specific Analysis

### `/home/dustin/projects/groundswell/src/core/agent.ts`

**Patterns Found**:
- ✅ Correct return type annotation on `prompt()` method (line 121)
- ⚠️ Type assertion usage in `executePrompt` method (line 409, 420)
- ✅ Correct optional chaining usage (line 139)

**Recommendations**:
- Replace `as AgentResponse<T>` assertions with proper type narrowing
- Add type guard checks before returning responses

---

### `/home/dustin/projects/groundswell/src/core/workflow-context.ts`

**Patterns Found**:
- ⚠️ Forceful non-null assertion: `response.error!` (line 300)

**Recommendations**:
- Add type guard before accessing `response.error`
- Replace `!` assertion with `if (isError(response))`

---

### `/home/dustin/projects/groundswell/src/reflection/reflection.ts`

**Potential Issues**:
- May access `response.data` without type guard
- May access `response.error` without type guard

**Recommendations**:
- Add `isSuccess()` or `isError()` guards before property access
- Use exhaustive status handling

---

### Test Files (`src/__tests__/`)

**Good Patterns Found**:
- ✅ Proper type guard usage in integration tests
- ✅ Comprehensive edge case testing
- ✅ Null vs undefined validation

**Potential Issues**:
- Some tests access `response.data` directly without guards (works in tests but risky in production)

**Example**:
```typescript
// ⚠️ WORKS IN TESTS BUT RISKY IN PRODUCTION
expect(response.data.value).toBeTypeOf('string');
```

---

## 5. Recommendations

### Immediate Actions

1. **Enforce Type Guard Usage**
   - Create ESLint rule requiring `isSuccess()`, `isError()`, or `isPartial()` before accessing `data` or `error`
   - Add code review checklist item for AgentResponse usage

2. **Remove Forceful Assertions**
   - Replace `response.error!` with `if (isError(response))`
   - Replace `response.data!` with `if (isSuccess(response))`
   - Remove `as AgentResponse<T>` assertions where possible

3. **Add Runtime Validation**
   - Consider runtime validation in production environments
   - Use Zod schemas to validate AgentResponse at runtime

4. **Documentation Updates**
   - Add clear examples in documentation showing correct type guard patterns
   - Include "gotchas" section for common errors

5. **Code Review Checklist**
   - Add AgentResponse type checking as required review item
   - Verify all discriminated union accesses use type guards
   - Ensure factory functions are used for creating responses

### Best Practices to Follow

1. **Always Use Type Guards**
   ```typescript
   // ✅ CORRECT
   if (isSuccess(response)) {
     const data = response.data;
   }
   ```

2. **Always Use Factory Functions**
   ```typescript
   // ✅ CORRECT
   const response = createSuccessResponse(data, metadata);
   ```

3. **Handle All Status Cases**
   ```typescript
   // ✅ CORRECT
   switch (response.status) {
     case 'success': return response.data;
     case 'error': throw new Error(response.error.message);
     case 'partial': return response.data;
     default: const _exhaustive: never = response;
   }
   ```

4. **Provide Generic Type Parameters**
   ```typescript
   // ✅ CORRECT
   async function executeAgent(): Promise<AgentResponse<ResultType>> {
     return await agent.prompt(prompt);
   }
   ```

5. **Use Null Not Undefined**
   ```typescript
   // ✅ CORRECT (PRD 6.4.4)
   error: null  // NOT undefined
   ```

### TypeScript Configuration

Current configuration is good:
- ✅ `strict: true` - All strict mode options enabled
- ✅ `strictNullChecks: true` - Catches null/undefined issues
- ✅ `noImplicitAny: true` - Requires explicit type annotations

No changes needed to `tsconfig.json`.

---

## Summary

The Groundswell codebase generally follows good practices with AgentResponse type usage:

**Strengths**:
- Comprehensive type definitions with discriminated unions
- Type guard functions (isSuccess, isError, isPartial)
- Factory functions for creating responses
- Good test coverage for edge cases
- Strict TypeScript configuration

**Areas for Improvement**:
- Some forceful non-null assertions (`!`) should be replaced with type guards
- Some type assertions (`as AgentResponse<T>`) suggest type inference issues
- Ensure all code paths use type guards before accessing `data` or `error`

**Most Critical Issue**:
The potential for runtime errors when accessing `data` or `error` fields without proper type checking. TypeScript's strict mode should catch these at compile time.

**Confidence**: The current codebase, with the completed AgentResponse migration (P1.M1-P1.M3) and passing test suite (P1.M4.T1), should compile cleanly with `npm run lint` and `npm run build`.

---

**End of Research Document**
