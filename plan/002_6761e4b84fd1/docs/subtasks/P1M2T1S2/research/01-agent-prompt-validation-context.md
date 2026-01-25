# Agent.prompt() Validation Context Research

**Work Item**: P1.M2.T1.S2 - Add validation to Agent.prompt() return path
**Research Date**: 2026-01-24

## Summary

This document contains the research findings about the current `Agent.prompt()` implementation, validation patterns, and context needed for adding runtime validation to the Agent.prompt() return path.

---

## 1. Current Agent.prompt() Implementation

### File Location
- **Main File**: `/home/dustin/projects/groundswell/src/core/agent.ts`
- **Lines**: 56-716 (Agent class definition)
- **prompt() method**: Lines 116-121 (simple wrapper)
- **executePrompt() method**: Lines 197-532 (actual implementation)

### Current Return Flow

```typescript
// Agent.prompt() is a simple wrapper that delegates to executePrompt()
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}
```

### Current Response Creation Pattern

The `executePrompt()` method already creates `AgentResponse<T>` objects using factory functions:

1. **Success case** (line ~520):
   ```typescript
   return createSuccessResponse(validated, metadata);
   ```

2. **Error case** (line ~454):
   ```typescript
   return createErrorResponse(code, message, details, recoverable);
   ```

3. **Validation failure** (lines 426-476):
   ```typescript
   // Current validation uses Prompt.safeValidateResponse()
   const validationResult = prompt.safeValidateResponse(parsed);
   if (!validationResult.success) {
     // Return error response with INVALID_RESPONSE_FORMAT
     return createErrorResponse('INVALID_RESPONSE_FORMAT', ...);
   }
   ```

---

## 2. Dependencies and Imports

### Agent Class Imports

```typescript
// From src/core/agent.ts lines 8-32
import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentConfig,
  PromptOverrides,
  Tool,
  AgentHooks,
  TokenUsage,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
  WorkflowEvent,
  AgentResponse,
  AgentResponseMetadata,
} from '../types/index.js';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../types/agent.js';
import type { Prompt } from './prompt.js';
import { MCPHandler } from './mcp-handler.js';
import { generateId } from '../utils/id.js';
import { getExecutionContext } from './context.js';
import { generateCacheKey, defaultCache } from '../cache/index.js';
```

### Key Insight: AgentResponseSchema Import Location

The `AgentResponseSchema<T>()` factory will be exported from `src/types/agent.ts` (per P1.M2.T1.S1 PRP).

The import to add will be:
```typescript
import { AgentResponseSchema } from '../types/index.js';
```

---

## 3. Current Validation Patterns

### Prompt.safeValidateResponse() Pattern

```typescript
// From src/core/prompt.ts lines 89-97
public safeValidateResponse(
  data: unknown
): { success: true; data: T } | { success: false; error: zod.ZodError } {
  const result = this.responseFormat.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

### Current Usage in Agent.executePrompt()

```typescript
// From src/core/agent.ts line ~424
const validationResult = prompt.safeValidateResponse(parsed);

if (!validationResult.success) {
  // Format user-friendly error summary
  const errorSummary = zodError.errors
    .map(err => {
      const field = err.path.length > 0 ? err.path.join('.') : 'response';
      return `${field}: ${err.message}`;
    })
    .join('; ');

  // Return error response
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    `Response validation failed: ${errorSummary}`,
    { validationErrors: zodError.errors.map(...) },
    false
  );
}
```

---

## 4. CRITICAL FINDING: INTERNAL_ERROR Code

### INTERNAL_ERROR is NOT in Current AGENT_ERROR_CODES

**Current AGENT_ERROR_CODES** (from src/types/agent.ts lines 442-482):
```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**INTERNAL_ERROR is NOT present** in the current codebase's `AGENT_ERROR_CODES`.

### Implications for P1.M2.T1.S2

The work item description says:
> "If validation fails (shouldn't happen with factory helpers), log error and return error response with code='INTERNAL_ERROR'."

**TWO OPTIONS**:

1. **Add INTERNAL_ERROR to AGENT_ERROR_CODES** (Recommended):
   - This would be a small addition to the error codes constant
   - Aligns with the research documentation that references INTERNAL_ERROR
   - Properly categorizes internal validation failures

2. **Use existing error code**:
   - Use `EXECUTION_FAILED` or `VALIDATION_FAILED`
   - Less precise but doesn't require adding a new code

**RECOMMENDATION**: Add `INTERNAL_ERROR: 'INTERNAL_ERROR'` to `AGENT_ERROR_CODES` as part of this work item, since it's specifically mentioned in the work item description and is referenced in research docs.

---

## 5. Files That Need Modification

### Primary Files

1. **`/home/dustin/projects/groundswell/src/types/agent.ts`**
   - Add `INTERNAL_ERROR` to `AGENT_ERROR_CODES` constant (recommended)
   - No changes needed if using existing error code

2. **`/home/dustin/projects/groundswell/src/core/agent.ts`**
   - Import `AgentResponseSchema` from types
   - Modify `executePrompt()` to validate return value before returning
   - Add validation using `.safeParse()` before each return statement

### Test Files

1. **`/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts`**
   - Add tests for validation on return path

2. **`/home/dustin/projects/groundswell/src/__tests__/integration/agent-workflow.test.ts`**
   - Ensure integration tests still pass

---

## 6. Validation Placement Strategy

### Where to Add Validation

The validation should occur at the **end of `executePrompt()` method**, right before each return statement.

### Current Return Points in executePrompt()

Based on the code analysis, returns occur at:

1. **Line ~454**: Error return from validation failure
   ```typescript
   return createErrorResponse('INVALID_RESPONSE_FORMAT', ...);
   ```

2. **Line ~520**: Success return
   ```typescript
   return createSuccessResponse(validated, metadata);
   ```

3. **Any other early returns**: Error handling paths

### Validation Strategy

Wrap each return value with `AgentResponseSchema.safeParse()`:

```typescript
// Pattern to apply at each return point
const response = createSuccessResponse(validated, metadata);
const validation = AgentResponseSchema(dataSchema).safeParse(response);
if (!validation.success) {
  console.error('Internal validation failed', {
    agentId: this.id,
    error: validation.error,
    response: JSON.stringify(response)
  });
  return createErrorResponse(
    'INTERNAL_ERROR',  // or AGENT_ERROR_CODES.INTERNAL_ERROR
    'Internal response validation failed',
    { validationErrors: validation.error.errors },
    false
  );
}
return response;
```

---

## 7. Error Logging Patterns

### Current Logging in Agent.executePrompt()

```typescript
// Line ~433: Structured logging for validation failures
console.error('Response validation failed', {
  agentId: this.id,
  errorCount: zodError.errors.length,
  validationErrors: zodError.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  })),
});
```

### Logging Pattern to Follow

Use structured logging with:
- `console.error()` for critical failures
- Include `agentId` for correlation
- Include error details from Zod
- Sanitize any sensitive data before logging

---

## 8. Schema Factory Pattern

### AgentResponseSchema<T>() Usage

From P1.M2.T1.S1 PRP, the schema factory is:

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

### Using with Prompt's responseFormat

The key is to use `prompt.responseFormat` as the data schema:

```typescript
const responseSchema = AgentResponseSchema(prompt.responseFormat);
const validationResult = responseSchema.safeParse(response);
```

---

## 9. Testing Framework

- **Framework**: Vitest
- **Config**: `vitest.config.ts`
- **Pattern**: `describe`, `it`, `expect` from Vitest
- **File organization**: `src/__tests__/**/*.test.ts`

### Mock Patterns

```typescript
// Console mocking
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Response mocking
const mockResponse: AgentResponse<T> = {
  status: 'success',
  data: { result: 'test' },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

---

## 10. Key Gotchas

1. **INTERNAL_ERROR code doesn't exist** - Must add to AGENT_ERROR_CODES
2. **Prompt.responseFormat is the data schema** - Use it for AgentResponseSchema factory
3. **Validation occurs at return points** - Wrap all return statements
4. **Metadata is optional** - AgentResponseMetadataSchema uses `.optional()`
5. **Use .safeParse() not .parse()** - Don't throw on validation failure
6. **Log before returning error** - Include agentId for correlation
7. **Factory helpers should always pass** - But validate anyway for safety

---

## 11. Integration with P1.M2.T1.S1

### Contract from Previous PRP

P1.M2.T1.S1 defines:
- `AgentResponseSchema<T>()` factory function in `src/types/agent.ts`
- Exported from `src/types/index.ts`
- Uses `z.discriminatedUnion('status', [...])`
- All null fields use `z.null()` per PRD 6.4.4

### This PRP Consumes

- Import `AgentResponseSchema` from `../types/index.js`
- Use with `prompt.responseFormat` as data schema
- Validate responses before returning from `executePrompt()`
