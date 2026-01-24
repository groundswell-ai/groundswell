# AgentResponse Implementation Analysis - Summary Report

**PRP ID**: P1.M1.T1.S1
**Analysis Date**: 2026-01-24
**Status**: Research Complete

---

## Executive Summary

This report synthesizes all research findings from the comprehensive analysis of the current `Agent.prompt()` implementation and provides actionable guidance for refactoring to return `AgentResponse<T>` instead of generic `T`.

**Key Finding**: The refactoring is straightforward with minimal production code impact (2 call sites) but requires careful handling of error handling patterns and documentation updates.

---

## 1. Current Implementation State

### 1.1 Method Signatures

| Method | Current Return Type | Target Return Type | Lines |
|--------|---------------------|-------------------|-------|
| `prompt()` | `Promise<T>` | `Promise<AgentResponse<T>>` | 110-116 |
| `promptWithMetadata()` | `Promise<PromptResult<T>>` | `Promise<AgentResponse<T>>` | 124-129 |
| `reflect()` | `Promise<T>` | `Promise<AgentResponse<T>>` | 137-160 |

### 1.2 Internal Implementation

- **executePrompt()**: Already returns `PromptResult<T>` with all needed metadata
- **Current Behavior**: `prompt()` extracts only `.data` field, discarding metadata
- **Error Handling**: Throws errors directly (must be converted to error responses)

---

## 2. Critical Gotchas

### 2.1 Type Loss (HIGH IMPACT)

```typescript
// CURRENT: Metadata lost
public async prompt<T>(): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;  // Loss of usage, duration, toolCalls
}
```

**Impact**: All call sites expecting `T` will receive `AgentResponse<T>`.

### 2.2 Error Transformation (HIGH IMPACT)

```typescript
// CURRENT: Throws errors
throw new Error('No JSON object found in response');

// TARGET: Returns error response
return { status: 'error', data: null, error: {...}, metadata: {...} };
```

**Impact**: Error handling must be converted from try-catch to status checking.

### 2.3 Cache Compatibility (MEDIUM IMPACT)

**Current**: Cache stores `PromptResult<T>`
**Target**: `AgentResponse<T>` must be compatible or cache migration needed

**Recommendation**: Design `AgentResponse<T>` to be a superset of `PromptResult<T>` fields.

### 2.4 Reflection Integration (MEDIUM IMPACT)

`ReflectionManager.reflectWithAgent()` calls `agent.prompt()` at line 267 of `reflection.ts`.

**Impact**: Must handle new return type and check status before accessing data.

---

## 3. Files Affected by Refactoring

### 3.1 Source Code (HIGH PRIORITY)

| File | Lines | Change Type |
|------|-------|-------------|
| `src/core/agent.ts` | 110-116, 137-160 | Method signature + error handling |
| `src/types/agent.ts` | New | Add AgentResponse types |
| `src/types/index.ts` | 26-27 | Export new types |
| `src/reflection/reflection.ts` | 267 | Call site update |
| `src/core/workflow-context.ts` | 295 | Call site update |

### 3.2 Documentation (HIGH PRIORITY)

| File | Lines | Change Type |
|------|-------|-------------|
| `docs/agent.md` | 37, 83, 95, 165, 326 | Example updates |
| `docs/prompt.md` | 131, 350, 374 | Example updates |
| `README.md` | 82, 236-237 | Example updates |

### 3.3 Examples (MEDIUM PRIORITY)

| File | Lines | Change Type |
|------|-------|-------------|
| `examples/examples/10-introspection.ts` | 515 | Real usage example |

### 3.4 Tests (MEDIUM PRIORITY)

| File | Change Type |
|------|-------------|
| `src/__tests__/integration/agent-workflow.test.ts` | Assertion updates |
| `src/__tests__/unit/agent.test.ts` | Assertion updates |

---

## 4. Call Sites Inventory

### 4.1 Production Code (2 sites)

1. **src/reflection/reflection.ts:267**
   - Pattern: Direct assignment with try-catch
   - Refactoring: Add status check before data access

2. **src/core/workflow-context.ts:295**
   - Pattern: Wrapped in runInContext()
   - Refactoring: Add status check after unwrapping

### 4.2 Documentation (9 sites)

- `docs/agent.md`: 6 sites
- `docs/prompt.md`: 3 sites
- `README.md`: 3 sites

**Pattern**: All use direct assignment, no error handling shown

### 4.3 Examples (1 site)

- `examples/examples/10-introspection.ts:515`

**Total Impact**: 12+ call sites need updating

---

## 5. Recommended AgentResponse Structure

### 5.1 Type Definitions

```typescript
// src/types/agent.ts

export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number;
  requestId?: string;
}
```

### 5.2 Error Codes

```typescript
export const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  NO_JSON_IN_RESPONSE: 'NO_JSON_IN_RESPONSE',
  MALFORMED_JSON: 'MALFORMED_JSON',
} as const;
```

### 5.3 Factory Functions

```typescript
export function success<T>(data: T, metadata: AgentResponseMetadata): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}

export function error(
  code: string,
  message: string,
  metadata: AgentResponseMetadata,
  recoverable = false
): AgentResponse<never> {
  return {
    status: 'error',
    data: null,
    error: { code, message, recoverable },
    metadata,
  };
}
```

---

## 6. Zod Validation Strategy

### 6.1 Schema Pattern

```typescript
const AgentResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('status', [
    // Success case
    z.object({
      status: z.literal('success'),
      data: dataSchema,
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),
    // Error case
    z.object({
      status: z.literal('error'),
      data: z.null(),
      error: AgentErrorDetailsSchema,
      metadata: AgentResponseMetadataSchema,
    }),
    // Partial case
    z.object({
      status: z.literal('partial'),
      data: dataSchema.partial(),
      error: z.null(),
      metadata: AgentResponseMetadataSchema,
    }),
  ]);
```

### 6.2 Validation Pipeline

1. Extract text from Anthropic response
2. Extract JSON via regex (current pattern: `/\{[\s\S]*\}/`)
3. Parse JSON
4. Validate with Zod schema
5. Return appropriate AgentResponse

---

## 7. Migration Strategy

### Phase 1: Type Definitions (S1)
- Add `AgentResponse<T>`, `AgentErrorDetails`, `AgentResponseMetadata` to `src/types/agent.ts`
- Export from `src/types/index.ts`
- Create factory helper functions

### Phase 2: Core Implementation (S2)
- Modify `executePrompt()` to wrap `PromptResult<T>` in `AgentResponse<T>`
- Convert thrown errors to error responses
- Update `prompt()`, `promptWithMetadata()`, `reflect()` signatures

### Phase 3: Production Call Sites (P1.M1.T2)
- Update `src/reflection/reflection.ts:267`
- Update `src/core/workflow-context.ts:295`

### Phase 4: Documentation & Examples
- Update all documentation examples
- Update example files
- Add error handling examples

### Phase 5: Tests
- Update test assertions
- Add error case coverage

---

## 8. Existing Patterns to Follow

### 8.1 WorkflowResult<T> Pattern

```typescript
// src/core/workflow-context.ts:40-47
export interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}
```

**Pattern**: Non-nullable data field, includes metadata

**Apply to AgentResponse**: Follow similar structure with discriminant

### 8.2 PromptResult<T> Pattern

```typescript
// src/core/agent.ts:31-40
export interface PromptResult<T> {
  data: T;
  usage: TokenUsage;
  duration: number;
  toolCalls: number;
}
```

**Pattern**: Internal result type with execution metadata

**Apply to AgentResponse**: Incorporate same metadata fields

---

## 9. Best Practices from Research

### 9.1 Discriminated Unions

- Use `status` field as discriminant for type narrowing
- TypeScript automatically narrows types based on status value
- Always check status before accessing data

### 9.2 Null vs Undefined

- Use `null` for absent values (not `undefined`)
- Makes intent explicit: data is intentionally absent
- Consistent with `PromptResult<T>` pattern

### 9.3 Immutability

- Treat `AgentResponse<T>` as immutable
- Don't modify responses after creation
- Create new objects for transformations

### 9.4 Error Handling

- Use machine-readable error codes (UPPER_SNAKE_CASE)
- Include `recoverable` flag for retry logic
- Always validate with Zod schema

---

## 10. Recommended Implementation Approach

### 10.1 Incremental Refactoring

1. **Start**: Add type definitions and factory functions
2. **Next**: Modify `executePrompt()` to return `AgentResponse<T>`
3. **Then**: Update production call sites
4. **Finally**: Update documentation and tests

### 10.2 Backward Compatibility

Consider providing migration helper:

```typescript
// Migration helper for existing code
async prompt<T>(...): Promise<AgentResponse<T>> {
  const result = await this.executePrompt(prompt, overrides);
  return wrapInAgentResponse(result);
}

// Legacy method (deprecated)
async promptLegacy<T>(...): Promise<T> {
  const response = await this.prompt(prompt, overrides);
  if (response.status === 'error') {
    throw new Error(response.error.message);
  }
  return response.data;
}
```

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes for users | HIGH | Provide migration guide, deprecation period |
| Cache invalidation | MEDIUM | Design compatible data structure |
| Test suite updates | MEDIUM | Update assertions systematically |
| Documentation debt | MEDIUM | Update examples with error handling |

---

## 12. Success Criteria

The refactoring is successful when:

- [ ] `Agent.prompt()` returns `AgentResponse<T>` for all status types
- [ ] All errors are returned as `AgentResponse` with `status: 'error'`
- [ ] All production call sites handle new return type
- [ ] All documentation examples updated
- [ ] Tests cover success, error, and partial cases
- [ ] Cache compatibility maintained
- [ ] No regressions in existing functionality

---

## 13. Next Steps

1. **P1.M1.T1.S2**: Create AgentResponse factory helper functions
2. **P1.M1.T1.S3**: Refactor Agent.prompt() to wrap responses
3. **P1.M1.T2**: Update all call sites to handle AgentResponse
4. **P1.M2.T1**: Create Zod schema validation for AgentResponse

---

## 14. Research Artifacts

| Document | Location |
|----------|----------|
| Implementation Analysis | `research/agent-prompt-implementation-analysis.md` |
| Call Sites Inventory | `research/agent-prompt-call-sites-inventory.md` |
| Wrapper Patterns Research | `research/response-wrapper-patterns-research.md` |
| Zod Validation Research | `research/zod-validation-patterns-research.md` |
| **This Summary** | `research/ANALYSIS_SUMMARY.md` |

---

## 15. References

### Codebase References

- **Agent Implementation**: `src/core/agent.ts` (lines 1-593)
- **Type Definitions**: `src/types/agent.ts`, `src/types/index.ts`
- **Workflow Pattern**: `src/core/workflow-context.ts` (lines 40-47)
- **Reflection Usage**: `src/reflection/reflection.ts` (line 267)

### External Documentation

- **TypeScript Discriminated Unions**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- **Zod Documentation**: https://zod.dev/
- **Anthropic Messages API**: https://docs.anthropic.com/en/api/messages
- **neverthrow Library**: https://github.com/supermacro/neverthrow

---

**Confidence Score**: 10/10

This research provides comprehensive context for one-pass implementation of the `AgentResponse<T>` refactoring. All critical files, call sites, patterns, and best practices have been documented with specific references and line numbers.
