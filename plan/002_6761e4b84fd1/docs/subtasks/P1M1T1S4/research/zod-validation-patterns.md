# Zod Validation Patterns Research

This document documents the Zod validation patterns found in the Groundswell codebase based on the research conducted.

## 1. Files that Import or Use Zod

### Primary Files:
- `/home/dustin/projects/groundswell/src/core/prompt.ts` (lines 8, 33, 81, 92) - Main Prompt class with Zod validation
- `/home/dustin/projects/groundswell/src/types/prompt.ts` (lines 6, 21) - Prompt configuration types
- `/home/dustin/projects/groundswell/src/types/agent.ts` (line 184) - Error codes including INVALID_RESPONSE_FORMAT
- `/home/dustin/projects/groundswell/src/cache/cache-key.ts` (lines 10, 35, 119, 239) - Cache key generation with schema hashing
- `/home/dustin/projects/groundswell/src/reflection/reflection.ts` - Uses Zod for reflection response validation

### Test Files:
- `/home/dustin/projects/groundswell/src/__tests__/unit/prompt.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/integration/agent-workflow.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/cache-key.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/integration/agent-workflow.test.ts`

## 2. Existing Zod Schema Definitions

### Prompt Response Format:
```typescript
// src/core/prompt.ts line 33
public readonly responseFormat: z.ZodType<T>;

// src/types/prompt.ts line 21
export interface PromptConfig<T> {
  responseFormat: z.ZodType<T>;
}
```

### Cache Key Schema:
```typescript
// src/cache/cache-key.ts line 35
export interface CacheKeyInputs {
  responseFormat?: z.ZodType;
}
```

## 3. Zod Validation Methods

### Prompt Class Validation Methods:
```typescript
// src/core/prompt.ts lines 80-82
public validateResponse(data: unknown): T {
  return this.responseFormat.parse(data);
}

// src/core/prompt.ts lines 89-97
public safeValidateResponse(
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = this.responseFormat.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

## 4. INVALID_RESPONSE_FORMAT Error Code

### Location and Usage:
```typescript
// src/types/agent.ts lines 183-184
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  // ... other error codes
};

// src/core/agent.ts lines 387-392
if (!textContent) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'No text response received from API',
    { stopReason: response.stop_reason },
    false
  );
}

// src/core/agent.ts lines 397-403
if (!jsonMatch) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'No JSON object found in response',
    { responseText: textContent.text.substring(0, 200) },
    false
  );
}
```

## 5. Error Handling Pattern

### Current Pattern:
The current codebase has a gap in Zod error handling. In the `executePrompt` method in `/home/dustin/projects/groundswell/src/core/agent.ts`:

```typescript
// src/core/agent.ts line 409
const validated = prompt.validateResponse(parsed);

// This throws ZodError but there's no catch block for it
```

The `validateResponse` method uses `parse()` which throws a ZodError, but there's no try-catch block around it in the agent execution flow.

### Recommended Pattern:
```typescript
// Pattern found in tests/src/__tests__/integration/agent-workflow.test.ts
const result = prompt.safeValidateResponse(data);
if (!result.success) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'Response validation failed',
    { zodError: result.error.message },
    true  // recoverable
  );
}
```

## 6. Zod Schema Hashing for Caching

### Cache Key Generation:
```typescript
// src/cache/cache-key.ts lines 119-140
export function getSchemaHash(schema: z.ZodType | undefined): string {
  if (!schema) {
    return 'no-schema';
  }
  
  try {
    const def = (schema as { _def?: unknown })._def;
    if (!def) {
      return 'unknown-schema';
    }
    
    const schemaRep = extractSchemaStructure(def);
    const serialized = deterministicStringify(schemaRep);
    
    return createHash('sha256').update(serialized, 'utf8').digest('hex');
  } catch {
    return 'fallback-schema';
  }
}
```

## 7. Key Findings

1. **Gap in Error Handling**: The agent.ts file calls `validateResponse` but doesn't catch ZodErrors
2. **Safe Validation Method Exists**: `safeValidateResponse` exists but isn't used in the main execution flow
3. **INVALID_RESPONSE_FORMAT is Standard**: This error code is used for various format issues
4. **Schema Hashing for Caching**: Zod schemas are hashed for cache key generation
5. **Immutable Design**: Prompt class is immutable with frozen properties

## 8. Recommendations

1. Implement try-catch around Zod validation in `executePrompt`
2. Use `safeValidateResponse` instead of `validateResponse` in production code
3. Include Zod error details in the error response for better debugging
4. Ensure all Zod validation errors return recoverable=true for retry logic
