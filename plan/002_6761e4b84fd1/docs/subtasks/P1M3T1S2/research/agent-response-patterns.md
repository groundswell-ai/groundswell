# AgentResponse Usage Patterns Research

## Summary of Research

This document consolidates findings from parallel research into AgentResponse usage patterns across the codebase. Research was conducted via multiple explore agents.

## Files Using AgentResponse

### Example Files

| File | Pattern | Line Reference |
|------|---------|----------------|
| `examples/examples/10-introspection.ts` | Status checking + error handling | 554-562 |
| `examples/examples/01-basic-workflow.ts` | Basic prompt usage | TBD |
| `examples/examples/05-error-handling.ts` | Error patterns | TBD |
| All other example files (01-11) | Various AgentResponse patterns | Updated in P1.M1.T2 |

### Source Code Files

| File | Pattern | Reference |
|------|---------|-----------|
| `src/core/agent.ts` | Core implementation | executePrompt method |
| `src/types/agent.ts` | Type definitions | AgentResponse interface |
| `src/reflection/reflection.ts` | Error response handling | 268-281 |
| `src/__tests__/agent.test.ts` | Metadata access | 251-276 |
| `src/__tests__/agent-response.test.ts` | Type guard patterns | Various |

## Core Usage Patterns

### Pattern 1: Basic Status Checking (Most Common)

**Source**: `examples/examples/10-introspection.ts:554-562`

```typescript
const response = await agent.prompt(prompt);
if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}
const analysis = response.data;
// Now safely use analysis
```

**When to use**: Standard agent calls where you need to handle errors explicitly.

---

### Pattern 2: Type Guard Pattern (Best for TypeScript)

**Source**: Test files

```typescript
import { isSuccess, isError } from 'groundswell';

if (isSuccess(response)) {
  // TypeScript knows: response.data is T
  console.log(response.data.value);
} else if (isError(response)) {
  // TypeScript knows: response.error exists
  console.log(response.error.code);
}
```

**When to use**: When you want maximum type safety and cleaner code.

---

### Pattern 3: Metadata Access Pattern

**Source**: `src/__tests__/agent.test.ts:251-276`

```typescript
const response = await agent.prompt(prompt);

// Access metadata for observability
console.log('Agent ID:', response.metadata.agentId);
console.log('Duration:', response.metadata.duration);
console.log('Tokens used:', response.metadata.usage?.inputTokens);
console.log('Cache hit:', response.metadata.cacheHit);
```

**When to use**: For debugging, monitoring, or performance analysis.

---

### Pattern 4: Error Response with Recovery Logic

**Source**: `src/reflection/reflection.ts:268-281`

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'error') {
  return {
    shouldRetry: response.error.recoverable ?? false,
    reason: `Analysis failed: ${response.error.message}`,
  };
}
const data = response.data;
```

**When to use**: In retry logic or error recovery systems.

---

## AgentResponse Type Structure

### Discriminated Union Pattern

```typescript
interface AgentResponse<T> {
  status: 'success' | 'error' | 'partial';
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

### Type Narrowing Behavior

```typescript
if (response.status === 'success') {
  // TypeScript knows: response.data is T (not null)
  // TypeScript knows: response.error is null
} else if (response.status === 'error') {
  // TypeScript knows: response.data is null
  // TypeScript knows: response.error is AgentErrorDetails (not null)
}
```

## Factory Helper Functions

```typescript
// Success response
createSuccessResponse<T>(data: T, metadata?: AgentResponseMetadata): SuccessResponse<T>

// Error response
createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable?: boolean
): ErrorResponse

// Partial response (streaming)
createPartialResponse<T>(data: T, metadata?: AgentResponseMetadata): PartialResponse<T>
```

## Type Guard Functions

```typescript
isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>
isError(response: AgentResponse): response is ErrorResponse
isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T>
```

## Standard Error Codes

| Code | Description | Recoverable |
|------|-------------|-------------|
| `INVALID_RESPONSE_FORMAT` | Response doesn't match schema | No |
| `VALIDATION_FAILED` | Zod validation failed | No |
| `EXECUTION_FAILED` | Agent execution error | Context-dependent |
| `API_REQUEST_FAILED` | Anthropic API error | Yes (with backoff) |
| `TOOL_EXECUTION_FAILED` | Tool call failed | Yes |
| `INTERNAL_ERROR` | Framework error | No |

## README Quick Start Recommendations

Based on research, the Quick Start section should show:

1. **Simplest working example** - Basic status checking pattern
2. **Keep under 15 lines** - Best practice from Anthropic/Zod READMEs
3. **Show only essential imports** - Don't overwhelm
4. **Mention migration guide** - For users upgrading from v1.x

### Recommended Quick Start Pattern

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({ name: 'AnalysisAgent' });

const prompt = createPrompt({
  user: 'Analyze this code',
  responseFormat: z.object({ bugs: z.array(z.string()) }),
});

const response = await agent.prompt(prompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
console.log(response.data.bugs);
```

## Migration from Old API

### Before (v1.x)
```typescript
const result = await agent.prompt(prompt);
console.log(result.bugs);
```

### After (v2.x)
```typescript
const response = await agent.prompt(prompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
const result = response.data;
console.log(result.bugs);
```

## PRD Compliance Notes

All AgentResponse patterns comply with PRD 6.4 requirements:
- **Strict JSON**: All responses are JSON-parseable
- **Status Discriminant**: Enables type narrowing
- **Null Over Undefined**: Absent values use `null`, not `undefined`
- **Consistent Structure**: All responses have status, data, error, metadata
- **Observable Metadata**: Duration, tokens, cache info always available

## References

- **Migration Guide**: `docs/migration-guide-agent-response.md` (created in P1.M3.T1.S1)
- **Type Definitions**: `src/types/agent.ts`
- **Core Implementation**: `src/core/agent.ts`
- **PRD Section 6**: PRD requirements for AgentResponse
