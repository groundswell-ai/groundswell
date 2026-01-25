# workflow-context.ts prompt() Usage and Call Chain Analysis

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Deep analysis of workflow-context.ts agent.prompt() usage and caller chain

---

## Executive Summary

The analysis reveals a **critical type mismatch** between the expected `AgentResponse<T>` return type from `agent.prompt()` and the current implementation in the `replaceLastPromptResult()` method.

**Current State**: **BROKEN** - The method assumes `agent.prompt()` returns `T` but it actually returns `AgentResponse<T>`

**Impact**: Runtime type errors when the method is called

**Fix Required**: Update `replaceLastPromptResult()` to properly handle `AgentResponse<T>` return type

---

## 1. Target Function Analysis

### 1.1 Function: `replaceLastPromptResult()`

**File**: `/home/dustin/projects/groundswell/src/core/workflow-context.ts`
**Lines**: 230-336
**Function Signature**:
```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T>
```

### 1.2 Current Implementation (Lines 292-309)

```typescript
try {
  // Execute the new prompt in context
  const result = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // Update revision node status
  revisionNode.status = 'completed';

  // Emit completion event
  this.workflow.emitEvent({
    type: 'stepEnd',
    node: revisionNode,
    step: `revision:${newPrompt.id}`,
    duration: 0,
  });

  // Rebuild event tree
  this.eventTreeImpl.rebuild(this.workflow.node);

  return result;
} catch (error) {
  // Error handling...
}
```

**Problem**: `agent.prompt()` returns `AgentResponse<T>`, but the code treats it as `T`

---

## 2. Type Mismatch Analysis

### 2.1 Interface Mismatch

**Current `AgentLike` Interface** (src/types/workflow-context.ts:74-76):
```typescript
export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<T>;  // ← INCORRECT
}
```

**Actual `Agent.prompt()` Implementation** (src/core/agent.ts:116-121):
```typescript
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}
```

**Mismatch**: The `AgentLike` interface says `prompt()` returns `Promise<T>`, but the actual implementation returns `Promise<AgentResponse<T>>`

---

## 3. Call Chain Analysis

### 3.1 Complete Call Chain

```
Workflow.run() (workflow.ts:482)
└── createWorkflowContext()
    └── WorkflowContextImpl.step() (workflow-context.ts:79)
        ├── runInContext() (context.ts:67)
        │   └── fn() - User's step function
        │       ├── agent.prompt() → AgentResponse<T>
        │       └── [Optional] ctx.replaceLastPromptResult() ← TARGET METHOD
        │           ├── runInContext() (context.ts:67)
        │           │   └── agent.prompt(newPrompt) → AgentResponse<T> ← LINE 295
        │           └── Returns T (incorrect assumption)
        └── Returns T
```

### 3.2 Key Functions in Chain

#### `WorkflowContextImpl.step()` (workflow-context.ts:79)
```typescript
async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  // ...
  try {
    const result = await runInContext(executionContext, fn);  // User's function
    // ...
    return result;
  } catch (error) {
    // Error handling and reflection logic
    // ...
  }
}
```

#### `replaceLastPromptResult()` (workflow-context.ts:230)
**CURRENT (INCORRECT)**:
```typescript
const result = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)  // Returns AgentResponse<T>, not T
);
return result;  // Returns AgentResponse<T>, but method signature says Promise<T>
```

---

## 4. What Happens When agent.prompt() Returns Error

### Current Behavior (Broken)

```typescript
// agent.prompt() returns:
{
  status: 'error',
  data: null,
  error: { code: 'VALIDATION_FAILED', message: 'Invalid response', recoverable: true },
  metadata: { agentId: 'xyz', timestamp: 1234567890 }
}

// Current code treats this as:
const result = await agent.prompt(newPrompt);  // result = AgentResponse<T>
return result;  // Returns AgentResponse<T> but method expects T

// This causes:
// - Runtime error when caller tries to access properties on AgentResponse
// - Type errors in TypeScript
```

---

## 5. Required Changes

### 5.1 Immediate Fix: replaceLastPromptResult()

**Current Implementation**:
```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  try {
    const result = await runInContext(executionContext, () =>
      agent.prompt(newPrompt)  // Returns AgentResponse<T>
    );

    return result;  // Returns AgentResponse<T>, should return T
  } catch (error) {
    // ...
  }
}
```

**Required Fix**:
```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  try {
    const response = await runInContext(executionContext, () =>
      agent.prompt(newPrompt)  // Returns AgentResponse<T>
    );

    // Check response status before accessing data
    if (response.status === 'error') {
      // Convert error response to exception for backward compatibility
      throw new Error(response.error?.message ?? 'Agent prompt failed');
    }

    return response.data!;  // Non-null assertion because status is not 'error'
  } catch (error) {
    // ... existing error handling
  }
}
```

### 5.2 Interface Updates Required

#### Update AgentLike Interface

**Current** (src/types/workflow-context.ts):
```typescript
export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<T>;
}
```

**Required**:
```typescript
import type { AgentResponse } from '../types/agent.js';

export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
}
```

---

## 6. Recommended Fix Pattern

### Pattern 1: Status Check with Exception Throwing (Backward Compatible)

```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  const response = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // Check response status before accessing data
  if (response.status === 'error') {
    throw new Error(response.error?.message ?? 'Agent prompt execution failed');
  }

  return response.data!;
}
```

### Pattern 2: Using Type Guards (Cleaner Syntax)

```typescript
import { isError } from '../types/agent.js';

async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  const response = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // Use type guard for cleaner syntax
  if (isError(response)) {
    throw new Error(response.error.message);  // Type narrowed: error is not null
  }

  return response.data!;  // Type narrowed: data is T
}
```

---

## 7. Files That Need Updates

### Primary Files (Source Code)

| File | Line(s) | Change Required |
|------|---------|-----------------|
| `src/core/workflow-context.ts` | 295 | Update `replaceLastPromptResult()` to handle `AgentResponse<T>` |
| `src/types/workflow-context.ts` | 74-76 | Update `AgentLike.prompt()` return type to `Promise<AgentResponse<T>>` |

### Secondary Files (Documentation)

| File | Change Required |
|------|-----------------|
| `src/core/factory.ts` | Update JSDoc examples to show `AgentResponse` handling |

---

## 8. Risk Assessment

### High Risk Areas

1. **Backward Compatibility**: Changes to `AgentLike` interface may affect other code
2. **Error Handling Pattern Shift**: From exceptions to status codes
3. **Type Safety**: Need to ensure all `response.data` accesses are protected

### Mitigation Strategies

1. **Use Type Guards**: Leverage `isSuccess()`, `isError()` for cleaner code
2. **Preserve Exception Pattern**: Throw errors for backward compatibility
3. **Enable Strict TypeScript**: Catch type errors at compile time

---

## 9. Testing Strategy

### Unit Tests Required

```typescript
describe('replaceLastPromptResult', () => {
  it('should handle successful AgentResponse', async () => {
    const mockAgent = {
      prompt: jest.fn().mockResolvedValue({
        status: 'success' as const,
        data: { result: 'success' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() }
      })
    };

    const result = await ctx.replaceLastPromptResult(prompt, mockAgent);
    expect(result).toEqual({ result: 'success' });
  });

  it('should handle error AgentResponse', async () => {
    const mockAgent = {
      prompt: jest.fn().mockResolvedValue({
        status: 'error' as const,
        data: null,
        error: { code: 'TEST_ERROR', message: 'Test error', recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() }
      })
    };

    await expect(ctx.replaceLastPromptResult(prompt, mockAgent))
      .rejects.toThrow('Test error');
  });
});
```

---

## 10. Summary

**Key Findings**:
1. **Critical Type Mismatch**: `replaceLastPromptResult()` assumes `agent.prompt()` returns `T` but it returns `AgentResponse<T>`
2. **Interface Outdated**: `AgentLike` interface doesn't match actual `Agent` implementation
3. **Runtime Errors**: Current code will fail when `agent.prompt()` returns an error response

**Required Actions**:
1. Update `replaceLastPromptResult()` to check `response.status` before accessing `response.data`
2. Update `AgentLike.prompt()` return type to `Promise<AgentResponse<T>>`
3. Add comprehensive tests for the updated behavior

**Reference Pattern**: Use the pattern from `src/reflection/reflection.ts` (lines 267-296) as the canonical example of proper `AgentResponse` handling.
