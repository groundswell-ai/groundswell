# Agent.prompt() Implementation Analysis

**PRP ID**: P1.M1.T1.S1
**Analysis Date**: 2026-01-24
**File**: `src/core/agent.ts`

---

## Executive Summary

This document provides a comprehensive analysis of the current `Agent.prompt()` implementation in the Groundswell codebase. The analysis covers:

1. Current method signatures and return types
2. Internal execution flow
3. Existing wrapper patterns (`PromptResult<T>`, `WorkflowResult<T>`)
4. Error handling mechanisms
5. Integration with Anthropic SDK
6. Workflow event emission
7. Caching implementation

---

## 1. Current Method Signatures

### 1.1 `prompt()` Method (Primary Public API)

**Location**: `src/core/agent.ts:110-116`

```typescript
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;
}
```

**Key Characteristics**:
- **Generic Type**: `<T>` - The response type is determined by the Prompt's schema
- **Return Type**: `Promise<T>` - Returns **only** the validated data
- **Behavior**: Extracts `data` field from internal `PromptResult<T>`, discarding metadata
- **Critical Gap**: Metadata (usage, duration, toolCalls) is lost to callers

### 1.2 `promptWithMetadata()` Method (Metadata API)

**Location**: `src/core/agent.ts:124-129`

```typescript
public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  return this.executePrompt(prompt, overrides);
}
```

**Key Characteristics**:
- **Return Type**: `Promise<PromptResult<T>>` - Returns full result with metadata
- **Use Case**: When callers need token usage, duration, or tool call counts
- **Pattern**: This is the pattern that `AgentResponse<T>` should follow

### 1.3 `reflect()` Method (Reflection API)

**Location**: `src/core/agent.ts:137-160`

```typescript
public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const reflectionEnabled =
    prompt.enableReflection ??
    overrides?.enableReflection ??
    this.config.enableReflection;

  const systemPrefix = reflectionEnabled
    ? 'Before answering, reflect on your reasoning step by step. Consider alternative approaches and potential errors. Then provide your final answer.\n\n'
    : '';

  const effectiveOverrides: PromptOverrides = {
    ...overrides,
    system:
      systemPrefix +
      (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
  };

  const result = await this.executePrompt(prompt, effectiveOverrides);
  return result.data;
}
```

**Key Characteristics**:
- **Return Type**: `Promise<T>` - Same as `prompt()`, returns only data
- **Behavior**: Adds reflection system prefix to prompt
- **Usage**: Called from `ReflectionManager.reflectWithAgent()` (line 267 of reflection.ts)

---

## 2. Internal `executePrompt()` Implementation

**Location**: `src/core/agent.ts:182-428`

### 2.1 Return Type: `PromptResult<T>`

**Location**: `src/core/agent.ts:31-40`

```typescript
export interface PromptResult<T> {
  /** Validated response data */
  data: T;
  /** Token usage from the API */
  usage: TokenUsage;
  /** Total duration in milliseconds */
  duration: number;
  /** Number of tool invocations */
  toolCalls: number;
}
```

**Pattern Analysis**:
- Non-nullable `data` field (result is always present on success path)
- Includes execution metadata (usage, duration, toolCalls)
- Generic type parameter `<T>` for type-safe data
- **Note**: This interface is only returned by `promptWithMetadata()`, not `prompt()`

### 2.2 Execution Flow

The `executePrompt()` method implements the following flow:

```
1. Configuration Merge (Prompt > Overrides > Config)
   ├─ system, model, maxTokens, temperature, stop, tools, hooks, env

2. Cache Check (if enabled)
   ├─ Generate cache key from inputs
   ├─ Check defaultCache.get()
   └─ Return cached PromptResult<T> if hit

3. Event Emission (agentPromptStart)
   └─ Only if in workflow context

4. API Call via callApi()
   ├─ client.messages.create() with Anthropic SDK
   └─ Returns Anthropic.Message

5. Tool Use Loop (while stop_reason === 'tool_use')
   ├─ Execute tools
   ├─ Emit toolInvocation events
   ├─ Call pre/post-tool hooks
   └─ Continue conversation with tool results

6. JSON Extraction (from text response)
   ├─ Regex: /\{[\s\S]*\}/
   ├─ Error: "No JSON object found in response"
   └─ JSON.parse()

7. Zod Validation
   ├─ prompt.validateResponse(parsed)
   └─ Uses Prompt's internal Zod schema

8. Hook Execution (sessionEnd)
   └─ Call hooks with duration context

9. Event Emission (agentPromptEnd)
   └─ Include duration and token usage

10. Cache Storage (if enabled)
    └─ defaultCache.set(cacheKey, result)

11. Return PromptResult<T>
```

### 2.3 Error Handling (Current Approach)

**Location**: `src/core/agent.ts:374-384`

Current implementation **throws errors**:

```typescript
// Error 1: No text response
if (!textContent) {
  throw new Error('No text response received from API');
}

// Error 2: No JSON found
const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No JSON object found in response');
}

// Error 3: JSON parsing failure (implicit)
const parsed = JSON.parse(jsonMatch[0]);
```

**Critical Gap**: These errors will need to be converted to `AgentResponse<T>` with `status: 'error'` in the refactoring.

---

## 3. Existing Wrapper Pattern: `WorkflowResult<T>`

**Location**: `src/core/workflow-context.ts:40-47`

```typescript
export interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}
```

**Pattern Analysis**:
- Similar structure to `PromptResult<T>`
- Non-nullable `data` field
- Includes context-specific metadata (`node`, `duration`)
- Generic type parameter `<T>`

**This is the pattern to follow for `AgentResponse<T>`**.

---

## 4. Anthropic SDK Integration

**Location**: `src/core/agent.ts:432-469`

### 4.1 API Call Pattern

```typescript
private async callApi(
  messages: Message[],
  system: string | undefined,
  tools: Tool[] | undefined,
  model: string,
  maxTokens: number,
  temperature: number | undefined,
  stop: string[] | undefined
): Promise<Anthropic.Message> {
  const params: Anthropic.MessageCreateParams = {
    model,
    max_tokens: maxTokens,
    messages,
  };

  if (system) params.system = system;
  if (tools && tools.length > 0) {
    params.tools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Anthropic.Tool['input_schema'],
    }));
  }
  if (temperature !== undefined) params.temperature = temperature;
  if (stop && stop.length > 0) params.stop_sequences = stop;

  return this.client.messages.create(params);
}
```

**Integration Points**:
- Direct parameter mapping to Anthropic SDK
- Tools converted to Anthropic's schema format
- No custom response wrapping at SDK level

### 4.2 Response Format

Anthropic SDK returns `Message` with:
- `content`: Array of blocks (TextBlock, ToolUseBlock)
- `stop_reason`: Why generation stopped
- `usage`: Token usage (input_tokens, output_tokens)
- `model`: Model used

**Groundswell extracts**:
- Text from `content` array
- JSON via regex pattern matching
- Validates with Zod schema

---

## 5. Workflow Event Emission

**Location**: `src/core/agent.ts:172-177, 245-253, 322-330, 400-409`

### 5.1 Event Types

```typescript
// Cache events
{ type: 'cacheHit', key: string, node: WorkflowNode }
{ type: 'cacheMiss', key: string, node: WorkflowNode }

// Prompt lifecycle
{ type: 'agentPromptStart', agentId: string, agentName: string, promptId: string, node: WorkflowNode }
{ type: 'agentPromptEnd', agentId: string, agentName: string, promptId: string, node: WorkflowNode, duration: number, tokenUsage: TokenUsage }

// Tool invocation
{ type: 'toolInvocation', toolName: string, input: unknown, output: unknown, duration: number, node: WorkflowNode }
```

### 5.2 Context Detection

```typescript
private emitWorkflowEvent(event: WorkflowEvent): void {
  const ctx = getExecutionContext();
  if (ctx) {
    ctx.emitEvent(event);
  }
}
```

**Pattern**: Events only emitted when agent is called within workflow context.

---

## 6. Caching Implementation

**Location**: `src/core/agent.ts:202-242`

### 6.1 Cache Key Generation

```typescript
const cacheInputs: CacheKeyInputs = {
  user: prompt.buildUserMessage(),
  data: prompt.getData(),
  system: effectiveSystem,
  model: effectiveModel,
  temperature: effectiveTemperature,
  maxTokens: effectiveMaxTokens,
  tools: this.config.tools,
  mcps: this.config.mcps,
  skills: this.config.skills,
  responseFormat: prompt.getResponseFormat(),
};
cacheKey = generateCacheKey(cacheInputs);
```

**Cache Scope**: All prompt inputs including system, model, tools, and schema.

### 6.2 Cache Return Type

```typescript
const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
if (cached) {
  // Emit cache hit event
  // Return cached PromptResult<T>
  return cached;
}
```

**Critical Note**: Cache stores `PromptResult<T>` directly, not raw `T`.

---

## 7. Zod Validation Integration

**Location**: `src/core/agent.ts:387`

```typescript
const validated = prompt.validateResponse(parsed);
```

**Validation Flow**:
1. Extract JSON from text response via regex
2. Parse JSON with `JSON.parse()`
3. Validate with Prompt's internal Zod schema
4. Return validated data of type `T`

**Schema Location**: Each `Prompt<T>` instance has its own Zod schema.

---

## 8. Configuration Hierarchy

**Merge Order**: `Prompt` > `Overrides` > `Config`

```typescript
const effectiveSystem =
  prompt.systemOverride ?? overrides?.system ?? this.config.system;

const effectiveModel = overrides?.model ?? this.model;
const effectiveMaxTokens = overrides?.maxTokens ?? this.config.maxTokens ?? 4096;
const effectiveTemperature =
  overrides?.temperature ?? this.config.temperature;
```

**Implication**: Callers can override any config at call site.

---

## 9. Tool Execution

**Location**: `src/core/agent.ts:296-367`

### 9.1 Tool Use Loop

```typescript
while (response.stop_reason === 'tool_use') {
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  for (const toolUse of toolUseBlocks) {
    // Execute tool
    const result = await this.executeTool(toolUse.name, toolUse.input);

    // Add to tool results
    toolResults.push({
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    });
  }

  // Continue conversation
  response = await this.callApi(messages, effectiveSystem, ...);
}
```

### 9.2 Tool Resolution

**Location**: `src/core/agent.ts:474-497`

Priority order:
1. Stored `MCPHandler` instances (with registered executors)
2. Main `mcpHandler` (for non-MCPHandler MCPServers)
3. Direct tool handlers (subclasses - currently throws error)

---

## 10. Critical Gotchas for Refactoring

### 10.1 Type Loss

```typescript
// CURRENT: prompt() returns T directly
public async prompt<T>(): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;  // Metadata lost
}
```

**Refactoring Impact**: All call sites expecting `T` will receive `AgentResponse<T>`.

### 10.2 Error Handling Transformation

```typescript
// CURRENT: Throws errors
throw new Error('No JSON object found in response');

// TARGET: Returns error response
return {
  status: 'error',
  data: null,
  error: {
    code: 'INVALID_RESPONSE_FORMAT',
    message: 'No JSON object found in response',
    recoverable: false,
  },
  metadata: { ... }
};
```

### 10.3 Cache Compatibility

Cache stores `PromptResult<T>` - must be compatible with `AgentResponse<T>` or cache migration needed.

### 10.4 Reflection Integration

`ReflectionManager.reflectWithAgent()` calls `agent.prompt()` at line 267 of `reflection.ts` - must handle new return type.

---

## 11. Files Affected by Refactoring

### 11.1 Source Code

| File | Lines | Impact |
|------|-------|--------|
| `src/core/agent.ts` | 110-116, 137-160 | Method signature changes |
| `src/types/agent.ts` | All | Add `AgentResponse`, `AgentErrorDetails`, `AgentResponseMetadata` |
| `src/types/index.ts` | 26-27 | Export new types |
| `src/reflection/reflection.ts` | 267 | Call site update |
| `src/core/workflow-context.ts` | 295 | Call site update |

### 11.2 Documentation

| File | Lines | Impact |
|------|-------|--------|
| `docs/agent.md` | 37, 83, 95, 165, 326 | Example updates |
| `docs/prompt.md` | 131, 350, 374 | Example updates |
| `README.md` | 82, 236-237 | Example updates |

### 11.3 Examples

| File | Lines | Impact |
|------|-------|--------|
| `examples/examples/10-introspection.ts` | 515 | Real usage example |
| `examples/examples/07-agent-loops.ts` | 334 | Documentation reference |

### 11.4 Tests

| File | Lines | Impact |
|------|-------|--------|
| `src/__tests__/integration/agent-workflow.test.ts` | All | Assertion updates |
| `src/__tests__/unit/agent.test.ts` | All | Assertion updates |

---

## 12. Summary of Key Findings

1. **Current Return Type**: `prompt()` returns `Promise<T>` directly, losing metadata
2. **Metadata Available**: `PromptResult<T>` has all needed metadata internally
3. **Existing Pattern**: `WorkflowResult<T>` provides a good template for `AgentResponse<T>`
4. **Error Handling**: Current implementation throws - must be converted to error responses
5. **Call Sites**: 1 production call site (`reflection.ts:267`) + examples/docs
6. **Cache**: Stores `PromptResult<T>` - compatibility consideration needed
7. **Events**: Comprehensive workflow event system already in place
8. **Zod**: Already integrated for response validation

---

## References

- **Source**: `src/core/agent.ts` (lines 1-593)
- **Types**: `src/types/agent.ts`, `src/types/index.ts`
- **Workflow Pattern**: `src/core/workflow-context.ts` (lines 40-47)
- **Reflection Usage**: `src/reflection/reflection.ts` (line 267)
- **Anthropic SDK**: https://docs.anthropic.com/en/api/messages
