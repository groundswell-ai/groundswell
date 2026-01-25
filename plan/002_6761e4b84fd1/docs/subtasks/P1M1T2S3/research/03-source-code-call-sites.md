# Source Code prompt() Call Sites Inventory

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Complete inventory of all source code files with agent.prompt() calls

---

## Executive Summary

**Total source code files with agent.prompt() calls**: 1 (excluding reflection.ts which is already updated)

**Files Requiring Updates**: 1
- `src/core/workflow-context.ts` (line 295) - **HIGH PRIORITY**

**Files Already Compliant**: 1
- `src/reflection/reflection.ts` (line 267) - Reference pattern, no changes needed

**Documentation Files**: 2
- `src/core/factory.ts` (lines 57, 81) - JSDoc examples only
- `src/decorators/step.ts` (line 79) - Comment only

---

## 1. Files Requiring Updates

### 1.1 src/core/workflow-context.ts - **HIGH PRIORITY**

**Location**: Lines 230-336, method `replaceLastPromptResult()`
**Line with prompt() call**: 295

**Current Code**:
```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  // ... setup code ...

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
}
```

**Problem**: `agent.prompt()` returns `AgentResponse<T>`, but the code treats it as `T`

**Required Changes**:
1. Change `result` to `response`
2. Add status check: `if (response.status === 'error')`
3. Extract data: `const result = response.data`
4. Handle error case appropriately

**Updated Code**:
```typescript
async replaceLastPromptResult<T>(
  newPrompt: PromptLike<T>,
  agent: AgentLike
): Promise<T> {
  // ... setup code ...

  try {
    // Execute the new prompt in context
    const response = await runInContext(executionContext, () =>
      agent.prompt(newPrompt)
    );

    // Handle AgentResponse return type
    if (response.status === 'error') {
      throw new Error(response.error?.message ?? 'Agent prompt failed');
    }

    const result = response.data!;

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
}
```

**Priority**: HIGH - This is production code that will fail at runtime

---

## 2. Files Already Compliant

### 2.1 src/reflection/reflection.ts - **REFERENCE PATTERN**

**Location**: Lines 267-296
**Method**: `reflectWithAgent()`

**Status**: ✅ Already handles `AgentResponse<T>` correctly

**Code**:
```typescript
const response = await this.agent.prompt(reflectionPrompt);

// Handle AgentResponse return type
if (response.status === 'error') {
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
  };
}

const data = response.data;
if (!data) {
  return {
    shouldRetry: false,
    reason: 'Reflection analysis failed: No data returned',
  };
}

// Use the data
return {
  shouldRetry: data.shouldRetry,
  reason: data.reason,
  revisedPromptData: data.revisedPromptData,
  revisedSystemPrompt: data.revisedSystemPrompt,
};
```

**Action**: ❌ NO CHANGES NEEDED - This is the reference pattern

---

## 3. Documentation Files (Low Priority)

### 3.1 src/core/factory.ts

**Locations**: Lines 55-58 and 79-82

**Type**: JSDoc documentation examples

**Current Examples**:
```typescript
/**
 * @example
 * ```ts
 * const result = await agent.prompt(analysisPrompt);
 * ```
 */
```

**Required Changes**: Update examples to show `AgentResponse` handling

**Updated Examples**:
```typescript
/**
 * @example
 * ```ts
 * const response = await agent.prompt(analysisPrompt);
 * if (response.status === 'success') {
 *   const result = response.data;
 *   // Use result
 * } else {
 *   console.error(response.error?.message);
 * }
 * ```
 */
```

**Priority**: LOW - Documentation only

---

### 3.2 src/decorators/step.ts

**Location**: Line 79

**Type**: Comment

**Current**:
```typescript
// This allows Agent.prompt() calls to automatically capture events
```

**Status**: ❌ NO CHANGES NEEDED - Just a comment, no actual code

---

## 4. Interface Updates Required

### 4.1 src/types/workflow-context.ts

**Current** (lines 74-76):
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

**Priority**: HIGH - Interface must match actual implementation

---

## 5. Summary Table

| File | Line | Type | Status | Priority |
|------|------|------|--------|----------|
| `src/core/workflow-context.ts` | 295 | Source Code | Needs Update | **HIGH** |
| `src/types/workflow-context.ts` | 74-76 | Interface | Needs Update | **HIGH** |
| `src/reflection/reflection.ts` | 267 | Source Code | Already Compliant | N/A |
| `src/core/factory.ts` | 57, 81 | Documentation | Update Optional | LOW |
| `src/decorators/step.ts` | 79 | Comment | No Change Needed | N/A |

---

## 6. Update Priority Order

1. **FIRST**: Update `src/types/workflow-context.ts` - Fix `AgentLike` interface
2. **SECOND**: Update `src/core/workflow-context.ts` - Fix `replaceLastPromptResult()` method
3. **OPTIONAL**: Update `src/core/factory.ts` - Update JSDoc examples

---

## 7. Verification Steps

After making updates, verify:

1. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit src/core/workflow-context.ts
   ```

2. **Type Checking**:
   ```bash
   npx tsc --noEmit src/types/workflow-context.ts
   ```

3. **Run Tests**:
   ```bash
   npm test -- workflow-context.test.ts
   ```

---

## 8. Key Findings

1. **Minimal Scope**: Only 1 source code file needs updating (workflow-context.ts)
2. **Interface Mismatch**: `AgentLike` interface doesn't match actual `Agent` implementation
3. **Reference Pattern Exists**: `reflection.ts` shows the correct pattern to follow
4. **Low Risk**: Changes are isolated to specific methods
5. **Clear Path Forward**: Follow the canonical pattern from `reflection.ts`

---

## 9. Recommended Approach

1. **Update Interface First**: Fix `AgentLike.prompt()` return type
2. **Update Method Second**: Fix `replaceLastPromptResult()` to handle `AgentResponse<T>`
3. **Add Tests**: Create tests for the updated behavior
4. **Update Documentation**: Update JSDoc examples (optional)
5. **Verify Compilation**: Ensure TypeScript compiles without errors

---

## Conclusion

**Only 1 source code file requires updating**: `src/core/workflow-context.ts`

The fix is straightforward:
1. Check `response.status === 'error'`
2. Extract `response.data` after status check
3. Handle error case appropriately

Use the pattern from `src/reflection/reflection.ts` (lines 267-296) as the reference.
