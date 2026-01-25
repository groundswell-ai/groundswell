# Canonical AgentResponse Handling Pattern - Reference Analysis

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Extract the canonical pattern from reflection.ts for AgentResponse handling

---

## Executive Summary

The `src/reflection/reflection.ts` file contains the **canonical reference implementation** for proper `AgentResponse<T>` handling. This pattern should be used as the template for all other `agent.prompt()` call site updates.

**Location**: `src/reflection/reflection.ts`, lines 267-296
**Function**: `reflectWithAgent()` method

---

## 1. Complete Reference Implementation

```typescript
// File: src/reflection/reflection.ts
// Lines: 267-296

try {
  // Execute the reflection prompt
  const response = await this.agent.prompt(reflectionPrompt);

  // Handle AgentResponse return type
  if (response.status === 'error') {
    return {
      shouldRetry: false,
      reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
    };
  }

  // Type assertion: data is non-null when status is not 'error'
  const data = response.data;
  if (!data) {
    return {
      shouldRetry: false,
      reason: 'Reflection analysis failed: No data returned',
    };
  }

  // Success: return processed data
  return {
    shouldRetry: data.shouldRetry,
    reason: data.reason,
    revisedPromptData: data.revisedPromptData,
    revisedSystemPrompt: data.revisedSystemPrompt,
  };

} catch (error) {
  // Handle unexpected exceptions
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  };
}
```

---

## 2. Pattern Breakdown (Step by Step)

### Step 1: Try Block Wrapper
```typescript
try {
  const response = await this.agent.prompt(reflectionPrompt);
  // ... handling
} catch (error) {
  // Handle unexpected exceptions
}
```

**Purpose**: Wrap the entire operation in try-catch for unexpected exceptions

### Step 2: Status Check
```typescript
if (response.status === 'error') {
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
  };
}
```

**Purpose**: Check if the response is an error before accessing data

**Pattern**: `response.status === 'error'`

**Error Access**: `response.error?.message ?? 'Unknown error'`
- Uses optional chaining (`?.`) for safety
- Uses nullish coalescing (`??`) for fallback

### Step 3: Data Extraction
```typescript
const data = response.data;
if (!data) {
  return {
    shouldRetry: false,
    reason: 'Reflection analysis failed: No data returned',
  };
}
```

**Purpose**: Extract data and validate it's not null

**Pattern**: Explicit null check after status check

### Step 4: Success Processing
```typescript
return {
  shouldRetry: data.shouldRetry,
  reason: data.reason,
  revisedPromptData: data.revisedPromptData,
  revisedSystemPrompt: data.revisedSystemPrompt,
};
```

**Purpose**: Return processed result using the extracted data

---

## 3. Type Narrowing Analysis

### Before Status Check
```typescript
const response: AgentResponse<ReflectionResult>;
// response.data: ReflectionResult | null
// response.error: AgentErrorDetails | null
```

### After Status Check
```typescript
if (response.status === 'error') {
  // TypeScript narrows:
  // response.data: null (definitely)
  // response.error: AgentErrorDetails (not null)
}
```

### After Error Check
```typescript
// When execution reaches here (status !== 'error'):
// response.data: ReflectionResult (not null)
// response.error: null (definitely)
```

---

## 4. Error Handling Pattern

### Error Message Format
```typescript
`Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`
```

**Pattern**: `[Operation Name] failed: ${error details}`

**Components**:
- **Prefix**: "Reflection analysis failed: " (descriptive context)
- **Error Message**: `response.error?.message` (actual error)
- **Fallback**: `'Unknown error'` (nullish coalescing)

### Return Structure for Errors
```typescript
return {
  shouldRetry: false,  // Don't retry on error
  reason: `...`        // Human-readable error message
};
```

---

## 5. Alternative: Using Type Guards

### Status Check Pattern (Current)
```typescript
if (response.status === 'error') {
  // Handle error
}
```

### Type Guard Pattern (Alternative)
```typescript
import { isError } from '../types/agent.js';

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${response.error.message}`,
  };
}
```

**Benefits of Type Guards**:
- Cleaner syntax
- No need for optional chaining
- Better type narrowing

---

## 6. Template for Other Call Sites

### Basic Template
```typescript
try {
  const response = await agent.prompt<T>(prompt);

  // Check for error response
  if (response.status === 'error') {
    // Handle error case
    throw new Error(response.error?.message ?? 'Agent prompt failed');
  }

  // Extract data (type narrowed to T)
  const data = response.data;
  if (!data) {
    throw new Error('Agent prompt failed: No data returned');
  }

  // Use the data
  return processData(data);

} catch (error) {
  // Handle unexpected exceptions
  throw new Error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### Backward Compatible Template (Throws Exceptions)
```typescript
const response = await agent.prompt<T>(prompt);

// Convert AgentResponse to exception for backward compatibility
if (response.status === 'error') {
  throw new Error(response.error?.message ?? 'Agent prompt failed');
}

return response.data!;
```

### Type Guard Template (Recommended)
```typescript
import { isError } from '../types/agent.js';

const response = await agent.prompt<T>(prompt);

if (isError(response)) {
  // TypeScript knows response.error is not null
  throw new Error(response.error.message);
}

return response.data!;
```

---

## 7. Why This Pattern is Correct

### 1. Type Safety
- Uses discriminated union for type narrowing
- Never accesses `data` without checking `status` first
- Explicit null check for data

### 2. Error Handling Three-Layered
- **Layer 1**: Error status check (`response.status === 'error'`)
- **Layer 2**: Null data check (`if (!data)`)
- **Layer 3**: Try-catch for unexpected exceptions

### 3. Consistent Error Messages
- Always use descriptive prefix
- Include error details
- Provide fallback for unknown errors

### 4. Null Safety
- Optional chaining (`?.`) for error access
- Nullish coalescing (`??`) for fallback values
- Explicit null checks

### 5. Clear Control Flow
- Early return on error
- Success path at the end
- Easy to read and maintain

---

## 8. Common Pitfalls to Avoid

### ❌ Pitfall 1: Not Checking Status
```typescript
// WRONG: Assumes data is always present
const response = await agent.prompt<T>(prompt);
const data = response.data; // Could be null!
```

### ✅ Correct: Check Status First
```typescript
const response = await agent.prompt<T>(prompt);
if (response.status === 'success') {
  const data = response.data; // Type narrowed to T
}
```

---

### ❌ Pitfall 2: Ignoring Error Details
```typescript
// WRONG: Loses error context
if (response.status === 'error') {
  throw new Error('Prompt failed');
}
```

### ✅ Correct: Include Error Details
```typescript
if (response.status === 'error') {
  const { code, message, details } = response.error;
  throw new Error(`[${code}] ${message}`);
}
```

---

### ❌ Pitfall 3: Not Using Type Guards
```typescript
// WRONG: Manual type check without narrowing
if (response.status === 'error') {
  console.log(response.error?.message); // Still need optional chaining
}
```

### ✅ Correct: Use Type Guards
```typescript
if (isError(response)) {
  console.log(response.error.message); // No need for optional chaining
}
```

---

## 9. Best Practices Summary

1. **Always check `response.status`** before accessing `data` or `error`
2. **Use type guards** (`isSuccess`, `isError`, `isPartial`) for cleaner syntax
3. **Provide fallback values** using nullish coalescing (`??`)
4. **Include error context** in error messages (code, message, details)
5. **Use try-catch** for unexpected exceptions
6. **Return early on errors** for clear control flow
7. **Extract data to variable** after status check for type narrowing
8. **Validate data is not null** even after successful status check

---

## 10. Application to Other Call Sites

### For workflow-context.ts
```typescript
// Current (broken):
const result = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)
);
return result;

// Updated (following canonical pattern):
const response = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)
);

if (response.status === 'error') {
  throw new Error(response.error?.message ?? 'Agent prompt failed');
}

return response.data!;
```

### For Any New Call Site
1. Store response in variable
2. Check `response.status === 'error'`
3. Handle error case (throw or return error object)
4. Extract `response.data` after status check
5. Validate data is not null
6. Use data in success case

---

## Conclusion

The `reflection.ts` implementation (lines 267-296) serves as the **definitive reference pattern** for all `agent.prompt()` call site updates. Follow this pattern exactly to ensure:

- Type-safe data access
- Proper error handling
- Consistent error messages
- Clear control flow
- Maintainable code

**Key Takeaway**: Always check `response.status` before accessing `response.data` or `response.error`.
