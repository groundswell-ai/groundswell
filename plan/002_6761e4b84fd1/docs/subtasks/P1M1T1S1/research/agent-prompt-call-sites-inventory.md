# Agent.prompt() Call Sites Inventory

**PRP ID**: P1.M1.T1.S1
**Analysis Date**: 2026-01-24
**Search Method**: Grep for `\.prompt\(` pattern in codebase

---

## Executive Summary

This document provides a complete inventory of all `agent.prompt()` call sites in the Groundswell codebase. The inventory is organized by category:

- **Production Source Code**: 2 call sites
- **Documentation Examples**: 9 call sites
- **Example Files**: 1 call site (documented)
- **Test Files**: 0 direct call sites (tests use mocked implementations)

---

## 1. Production Source Code Call Sites

### 1.1 Reflection Module

**File**: `src/reflection/reflection.ts`
**Line**: 267
**Context**: `ReflectionManager.reflectWithAgent()` method

```typescript
// Location: src/reflection/reflection.ts:250-280
private async reflectWithAgent(
  context: ReflectionContext
): Promise<ReflectionResult> {
  if (!this.agent) {
    throw new Error('No agent configured for reflection');
  }

  // Build the reflection prompt
  const promptText = this.buildReflectionPrompt(context);

  // Create a prompt for reflection analysis
  const reflectionPrompt = new (await import('../core/prompt.js')).Prompt({
    user: promptText,
    responseFormat: ReflectionResponseSchema,
  });

  try {
    const response = await this.agent.prompt(reflectionPrompt);
    return {
      shouldRetry: response.shouldRetry,
      reason: response.reason,
      revisedPromptData: response.revisedPromptData,
      revisedSystemPrompt: response.revisedSystemPrompt,
    };
  } catch (reflectionError) {
    // If reflection itself fails, don't retry the original
    return {
      shouldRetry: false,
      reason: `Reflection analysis failed: ${reflectionError instanceof Error ? reflectionError.message : 'Unknown error'}`,
    };
  }
}
```

**Analysis**:
- **Usage Pattern**: Direct assignment to `response` variable
- **Type Parameters**: Uses `ReflectionResponseSchema` Zod schema
- **Error Handling**: Wrapped in try-catch, returns error result on failure
- **Refactoring Impact**: Must handle `AgentResponse<ReflectionResponseSchema>` return type
- **Expected Change**:
  ```typescript
  // CURRENT
  const response = await this.agent.prompt(reflectionPrompt);
  return { shouldRetry: response.shouldRetry, ... };

  // TARGET (after refactoring)
  const result = await this.agent.prompt(reflectionPrompt);
  if (result.status === 'error') {
    return { shouldRetry: false, reason: result.error.message };
  }
  const response = result.data;
  return { shouldRetry: response.shouldRetry, ... };
  ```

### 1.2 Workflow Context Module

**File**: `src/core/workflow-context.ts`
**Line**: 295
**Context**: `WorkflowContextImpl.replaceLastPromptResult()` method

```typescript
// Location: src/core/workflow-context.ts:292-296
try {
  // Execute the new prompt in context
  const result = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );
```

**Analysis**:
- **Usage Pattern**: Wrapped in `runInContext()`, direct result assignment
- **Type Parameters**: Generic `T` from `PromptLike<T>` interface
- **Error Handling**: Wrapped in try-catch at function level (line 292-335)
- **Refactoring Impact**: Must handle `AgentResponse<T>` return type
- **Expected Change**:
  ```typescript
  // CURRENT
  const result = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // TARGET (after refactoring)
  const response = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );
  const result = response.data;
  // Error handling will need to check response.status
  ```

---

## 2. Documentation Call Sites

### 2.1 Agent Documentation

**File**: `docs/agent.md`

| Line | Context | Pattern |
|------|---------|---------|
| 37 | Basic usage example | `const result = await agent.prompt(prompt);` |
| 83 | With overrides | `const result = await agent.prompt(prompt, { model: 'claude-3-haiku-20240307', maxTokens: 1000 });` |
| 95 | Direct usage | `const result = await agent.prompt(prompt);` |
| 165 | Cache demo (first call) | `const result1 = await agent.prompt(prompt);` |
| 166 | Cache demo (second call) | `const result2 = await agent.prompt(prompt);` |
| 326 | With overrides | `const result = await agent.prompt(prompt, { temperature: 0.5 });` |

**Analysis**:
- **Pattern**: All examples use direct assignment to `result` variable
- **Error Handling**: No explicit error handling shown (simplified examples)
- **Refactoring Impact**: All examples need updating to show `AgentResponse<T>` pattern
- **Recommended Update**:
  ```typescript
  // CURRENT
  const result = await agent.prompt(prompt);
  console.log(result.fieldName);

  // TARGET
  const response = await agent.prompt(prompt);
  if (response.status === 'success') {
    console.log(response.data.fieldName);
  } else {
    console.error('Error:', response.error.message);
  }
  ```

### 2.2 Prompt Documentation

**File**: `docs/prompt.md`

| Line | Context | Pattern |
|------|---------|---------|
| 131 | Basic usage | `const result = await agent.prompt(prompt);` |
| 350 | Dynamic data injection | `const result = await agent.prompt(classifyPrompt.withData({ item }));` |
| 353 | promptWithMetadata example | `const { data, usage, duration } = await agent.promptWithMetadata(prompt);` |
| 374 | With overrides and data | `const result = await agent.prompt(classifyPrompt.withData({ item }));` |

**Analysis**:
- **Pattern**: Mix of direct assignment and destructuring (for `promptWithMetadata`)
- **Dynamic Data**: Shows `prompt.withData()` pattern for runtime data injection
- **Refactoring Impact**: Both `prompt()` and `promptWithMetadata()` need updates

### 2.3 README Documentation

**File**: `README.md`

| Line | Context | Pattern |
|------|---------|---------|
| 82 | Quick start example | `const result = await agent.prompt(prompt);` |
| 236 | Cache demo (first call) | `const result1 = await agent.prompt(prompt);` |
| 237 | Cache demo (second call) | `const result2 = await agent.prompt(prompt);` |

**Analysis**:
- **Pattern**: Basic usage examples
- **Visibility**: High-visibility documentation (first-time user experience)
- **Refactoring Impact**: Critical update path - affects new user onboarding

---

## 3. Example Files Call Sites

### 3.1 Introspection Example

**File**: `examples/examples/10-introspection.ts`
**Line**: 515
**Context**: Demonstrating agent with introspection tools

```typescript
// Location: examples/examples/10-introspection.ts:504-515
const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow and summarize prior work.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// Agent uses tools autonomously to gather context
const analysis = await introspectionAgent.prompt(explorePrompt);
```

**Analysis**:
- **Usage Pattern**: Direct assignment to `analysis` variable
- **Type Parameters**: Zod schema with position, depth, parentName, summary fields
- **Context**: Agent has `INTROSPECTION_TOOLS` available for tool use
- **Error Handling**: None shown (simplified example)
- **Refactoring Impact**: Must handle `AgentResponse<T>` return type

### 3.2 Agent Loops Example

**File**: `examples/examples/07-agent-loops.ts`
**Line**: 334 (documentation reference only, not actual call site)

**Analysis**:
- This file uses simulated functions (`simulateClassification`, `simulateTextAnalysis`) instead of actual `agent.prompt()` calls
- Documentation at line 5 mentions "Using Agent.prompt() within ctx.step() loops"
- Example demonstrates the pattern, but implementation is mocked

---

## 4. Test Files Analysis

### 4.1 Integration Tests

**File**: `src/__tests__/integration/agent-workflow.test.ts`
**Line**: 66 (comment only)

```typescript
// This simulates what happens when Agent.prompt() is called
```

**Analysis**:
- No direct `agent.prompt()` calls in test files
- Tests use mocked implementations or test utilities
- Test assertions will need updating when return type changes

### 4.2 Unit Tests

**Files**: `src/__tests__/unit/*.test.ts`

**Analysis**:
- No direct `agent.prompt()` calls found
- Tests use mock agents, stubbed responses, or test utilities
- Test expectations for `prompt()` method will need updating

---

## 5. Additional Related Method Calls

### 5.1 `promptWithMetadata()` Calls

**File**: `docs/prompt.md`
**Line**: 353

```typescript
const { data, usage, duration } = await agent.promptWithMetadata(prompt);
```

**Analysis**:
- This method already returns `PromptResult<T>` with metadata
- Pattern similar to target `AgentResponse<T>` structure
- May serve as migration path or be replaced by `AgentResponse<T>`

### 5.2 `reflect()` Method Calls

**Documentation References**:
- `docs/agent.md:138`
- `docs/prompt.md:356`
- `examples/examples/09-reflection.ts:474` (documentation)

**Analysis**:
- `reflect()` method also returns `Promise<T>` directly (line 159 of agent.ts)
- Uses same pattern as `prompt()` - calls `executePrompt()` and extracts `.data`
- Will need same refactoring as `prompt()`

---

## 6. Usage Pattern Categories

### 6.1 Pattern A: Direct Assignment (Most Common)

```typescript
const result = await agent.prompt(prompt);
console.log(result.fieldName);  // result is type T
```

**Count**: 9 occurrences in documentation
**Refactoring**: Add status check and data extraction

### 6.2 Pattern B: With Overrides

```typescript
const result = await agent.prompt(prompt, {
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.5,
});
```

**Count**: 3 occurrences in documentation
**Refactoring**: Same as Pattern A, with override parameters preserved

### 6.3 Pattern C: Destructured Metadata (promptWithMetadata)

```typescript
const { data, usage, duration } = await agent.promptWithMetadata(prompt);
```

**Count**: 1 occurrence in documentation
**Refactoring**: May transition to `AgentResponse<T>` pattern

### 6.4 Pattern D: Dynamic Data Injection

```typescript
const result = await agent.prompt(classifyPrompt.withData({ item }));
```

**Count**: 2 occurrences in documentation
**Refactoring**: Same as Pattern A, with `withData()` call preserved

### 6.5 Pattern E: In Workflow Context

```typescript
await ctx.step('analysis', async () => {
  const result = await agent.prompt(prompt);
  // Context automatically captured
});
```

**Count**: Referenced in examples, not direct call sites
**Refactoring**: Same as Pattern A, workflow context unchanged

---

## 7. Error Handling Patterns

### 7.1 Production Code (reflection.ts)

```typescript
try {
  const response = await this.agent.prompt(reflectionPrompt);
  return { shouldRetry: response.shouldRetry, ... };
} catch (reflectionError) {
  return { shouldRetry: false, reason: ... };
}
```

**Pattern**: Try-catch with fallback result
**Refactoring**: Will need to check `response.status === 'error'` instead

### 7.2 Documentation Examples

**Pattern**: No error handling shown (simplified for clarity)
**Refactoring**: Should add error handling examples to documentation

---

## 8. Call Site Summary Table

| Category | Files | Call Sites | Refactoring Priority |
|----------|-------|------------|---------------------|
| Production Source | 2 files | 2 sites | **HIGH** |
| Documentation | 3 files | 9 sites | **HIGH** |
| Examples | 1 file | 1 site | **MEDIUM** |
| Tests | Multiple | 0 direct | **MEDIUM** (assertions) |
| **TOTAL** | **6+ files** | **12+ sites** | - |

---

## 9. Type Parameters Used

From call site analysis, the following type patterns are used:

1. **Zod Schema Inference**: `z.infer<typeof SchemaName>`
2. **Direct Zod Schema**: `responseFormat: z.object({...})`
3. **Generic Types**: Type parameter `<T>` from Prompt definition

---

## 10. Recommended Migration Approach

### Phase 1: Update Production Code
1. Update `src/reflection/reflection.ts:267` - Add status check
2. Update `src/core/workflow-context.ts:295` - Add status check

### Phase 2: Update Examples
1. Update `examples/examples/10-introspection.ts:515` - Show error handling
2. Add new example demonstrating error handling pattern

### Phase 3: Update Documentation
1. Update `docs/agent.md` - All 6 examples
2. Update `docs/prompt.md` - All 4 examples
3. Update `README.md` - Quick start examples

### Phase 4: Update Tests
1. Update test assertions to expect `AgentResponse<T>`
2. Add error case test coverage

---

## 11. Key Findings

1. **Limited Production Usage**: Only 2 production call sites (reflection.ts, workflow-context.ts)
2. **Documentation Heavy**: 75% of call sites are in documentation/examples
3. **No Error Handling**: Documentation examples don't show error handling
4. **Simple Patterns**: Most usage is direct assignment with no metadata access
5. **Good Test Isolation**: Tests don't directly call `agent.prompt()` - easier assertion updates

---

## References

- **Production**: `src/reflection/reflection.ts:267`, `src/core/workflow-context.ts:295`
- **Documentation**: `docs/agent.md`, `docs/prompt.md`, `README.md`
- **Examples**: `examples/examples/10-introspection.ts:515`
- **Source Analysis**: `src/core/agent.ts:110-116, 124-129, 137-160`
