# Error Handling Patterns Research for AgentResponse Refactoring

**Research Date:** 2026-01-24
**Session ID:** 002_6761e4b84fd1
**Task:** P1.M1.T1.S3 - Refactor Agent.prompt() to return AgentResponse
**Research Focus:** Error handling patterns in executePrompt() and error code mapping strategies

---

## Executive Summary

This research documents current error handling patterns in `/home/dustin/projects/groundswell/src/core/agent.ts` and related code, identifying all error scenarios in `executePrompt()` that need to be mapped to structured error codes when refactoring to return `AgentResponse<T>`.

**Key Findings:**
- **5 error scenarios** identified in `executePrompt()` requiring error code mapping
- **No existing error code system** in agent.ts - errors are thrown as plain `Error` objects
- **Error code constants already exist** in `src/types/agent.ts` (`AGENT_ERROR_CODES`)
- **No error wrapping pattern** currently exists in the codebase
- **Recommended mapping strategy** created for all 5 error scenarios

---

## Table of Contents

1. [Current Error Scenarios in executePrompt()](#1-current-error-scenarios-in-executeprompt)
2. [Existing Error Code Infrastructure](#2-existing-error-code-infrastructure)
3. [Error Wrapping Patterns Analysis](#3-error-wrapping-patterns-analysis)
4. [Related Error Handling in Codebase](#4-related-error-handling-in-codebase)
5. [Recommended Error Code Mapping](#5-recommended-error-code-mapping)
6. [Implementation Strategy](#6-implementation-strategy)

---

## 1. Current Error Scenarios in executePrompt()

### 1.1 Complete Error Inventory

**File:** `/home/dustin/projects/groundswell/src/core/agent.ts`
**Method:** `executePrompt<T>()` (lines 182-428)

All throw statements identified:

```typescript
// Error Scenario 1: No text response from API
// Line 375
if (!textContent) {
  throw new Error('No text response received from API');
}

// Error Scenario 2: No JSON found in response
// Line 381
const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No JSON object found in response');
}

// Error Scenario 3: Tool execution error (delegated handler)
// Line 480
const result = await handler.executeTool(name, input);
if (result.is_error) {
  throw new Error(result.content as string);
}

// Error Scenario 4: Tool execution error (main handler)
// Line 490
const result = await this.mcpHandler.executeTool(name, input);
if (result.is_error) {
  throw new Error(result.content as string);
}

// Error Scenario 5: No handler found for tool
// Line 496
throw new Error(`No handler found for tool '${name}'`);
```

### 1.2 Error Scenario Details

#### Scenario 1: No Text Response from API

**Location:** Line 375
**Trigger:** API returns response without text block
**Current Error Message:** `'No text response received from API'`
**Error Type:** Plain `Error`

**Context:**
```typescript
const textContent = response.content.find(
  (block): block is Anthropic.TextBlock => block.type === 'text'
);

if (!textContent) {
  throw new Error('No text response received from API');
}
```

**Recommended Error Code:** `API_REQUEST_FAILED`
**Recommended Recoverable:** `true`
**Recommended Details:**
```typescript
{
  responseFormat: response.content.map(b => b.type),
  agentId: this.id,
  model: effectiveModel
}
```

---

#### Scenario 2: No JSON Found in Response

**Location:** Line 381
**Trigger:** Text response doesn't contain JSON object
**Current Error Message:** `'No JSON object found in response'`
**Error Type:** Plain `Error`

**Context:**
```typescript
const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No JSON object found in response');
}
```

**Recommended Error Code:** `INVALID_RESPONSE_FORMAT`
**Recommended Recoverable:** `true`
**Recommended Details:**
```typescript
{
  rawResponse: textContent.text.substring(0, 200),
  promptId: prompt.id,
  agentId: this.id
}
```

---

#### Scenario 3: Tool Execution Error (Delegated Handler)

**Location:** Line 480
**Trigger:** MCP tool returns error from delegated handler
**Current Error Message:** Dynamic from `result.content`
**Error Type:** Plain `Error`

**Context:**
```typescript
for (const handler of this.mcpHandlers) {
  if (handler.hasTool(name)) {
    const result = await handler.executeTool(name, input);
    if (result.is_error) {
      throw new Error(result.content as string);
    }
    return result.content;
  }
}
```

**Recommended Error Code:** `TOOL_EXECUTION_FAILED`
**Recommended Recoverable:** `true` (tools may be idempotent)
**Recommended Details:**
```typescript
{
  toolName: name,
  toolInput: input,
  errorMessage: result.content,
  handlerType: 'delegated'
}
```

---

#### Scenario 4: Tool Execution Error (Main Handler)

**Location:** Line 490
**Trigger:** MCP tool returns error from main handler
**Current Error Message:** Dynamic from `result.content`
**Error Type:** Plain `Error`

**Context:**
```typescript
if (this.mcpHandler.hasTool(name)) {
  const result = await this.mcpHandler.executeTool(name, input);
  if (result.is_error) {
    throw new Error(result.content as string);
  }
  return result.content;
}
```

**Recommended Error Code:** `TOOL_EXECUTION_FAILED`
**Recommended Recoverable:** `true`
**Recommended Details:**
```typescript
{
  toolName: name,
  toolInput: input,
  errorMessage: result.content,
  handlerType: 'main'
}
```

---

#### Scenario 5: No Handler Found for Tool

**Location:** Line 496
**Trigger:** Tool not registered in any handler
**Current Error Message:** `'No handler found for tool '${name}''`
**Error Type:** Plain `Error`

**Context:**
```typescript
private async executeTool(name: string, input: unknown): Promise<unknown> {
  // ... check delegated handlers
  // ... check main handler

  // Look for direct tool handler - this would be set by subclasses
  throw new Error(`No handler found for tool '${name}'`);
}
```

**Recommended Error Code:** `TOOL_NOT_FOUND`
**Recommended Recoverable:** `false` (configuration error)
**Recommended Details:**
```typescript
{
  toolName: name,
  availableTools: [
    ...this.mcpHandlers.map(h => h.getServerNames()),
    this.mcpHandler.getServerNames()
  ],
  agentId: this.id
}
```

---

### 1.3 Additional Error Scenarios (Implicit)

These errors can occur but are not explicitly thrown:

#### Implicit Scenario A: JSON Parse Error

**Location:** Line 384 (implied)
**Trigger:** `JSON.parse()` fails
**Current Handling:** Exception propagates as-is

```typescript
const parsed = JSON.parse(jsonMatch[0]);
// If JSON.parse fails, it throws SyntaxError
```

**Recommended Error Code:** `INVALID_RESPONSE_FORMAT`
**Recommended Recoverable:** `true`
**Recommended Details:**
```typescript
{
  parseError: error.message,
  rawJson: jsonMatch[0].substring(0, 200)
}
```

---

#### Implicit Scenario B: Schema Validation Error

**Location:** Line 387
**Trigger:** Zod schema validation fails
**Current Handling:** ZodError thrown directly

```typescript
const validated = prompt.validateResponse(parsed);
// If validation fails, ZodError is thrown
```

**Recommended Error Code:** `VALIDATION_FAILED`
**Recommended Recoverable:** `true`
**Recommended Details:**
```typescript
{
  validationErrors: zodError.errors,
  schema: prompt.responseFormat.description,
  receivedData: parsed
}
```

---

#### Implicit Scenario C: API Request Error

**Location:** Line 468 (implied)
**Trigger:** Anthropic API request fails
**Current Handling:** Exception propagates from SDK

```typescript
return this.client.messages.create(params);
// SDK throws on network/API errors
```

**Recommended Error Code:** `API_REQUEST_FAILED`
**Recommended Recoverable:** `true` (transient network issues)
**Recommended Details:**
```typescript
{
  originalError: error.message,
  model: model,
  maxTokens: maxTokens,
  agentId: this.id
}
```

---

## 2. Existing Error Code Infrastructure

### 2.1 AGENT_ERROR_CODES Constants

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`
**Lines:** 183-189

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**Analysis:**
- ✅ Five error codes already defined
- ✅ Matches PRD specification
- ❌ Missing `TOOL_NOT_FOUND` (needed for scenario 5)
- ✅ Uses `as const` for type safety
- ✅ SCREAMING_SNAKE_CASE convention followed

### 2.2 AgentErrorDetails Interface

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`
**Lines:** 125-137

```typescript
export interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}
```

**Analysis:**
- ✅ Supports structured error codes
- ✅ Supports optional details object
- ✅ Includes recoverable flag
- ✅ Already used in `AgentResponse<T>` type

### 2.3 createErrorResponse Factory Function

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`
**Lines:** 241-261

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      details: details ?? null,
      recoverable,
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Analysis:**
- ✅ Factory function already exists
- ✅ Creates valid `AgentResponse<null>` objects
- ❌ Uses placeholder `agentId: 'unknown'` - should use actual agent ID
- ✅ Defaults `recoverable` to `false` (safer default)
- ✅ Handles null details correctly

---

## 3. Error Wrapping Patterns Analysis

### 3.1 Current State: No Wrapping Pattern

**Finding:** The codebase does **NOT** currently have an error wrapping pattern for agent operations.

**Evidence:**
- All errors in `executePrompt()` are thrown as plain `Error` objects
- No catch blocks in `executePrompt()` - errors propagate to caller
- No error code mapping layer exists
- No error details enrichment

### 3.2 Related Error Wrapping in Codebase

#### Pattern 1: MCP Handler Error Wrapping

**File:** `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`
**Lines:** 130-138

```typescript
try {
  const result = await registered.executor(input);
  return {
    type: 'tool_result',
    tool_use_id: '',
    content: typeof result === 'string' ? result : JSON.stringify(result),
  };
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    type: 'tool_result',
    tool_use_id: '',
    content: `Tool execution failed: ${message}`,
    is_error: true,
  };
}
```

**Pattern Characteristics:**
- Catches exceptions from tool executors
- Extracts error message safely (instanceof check)
- Returns error result instead of throwing
- Prefixes error with context

---

#### Pattern 2: Workflow Error Wrapping

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`
**Lines:** 520-538

```typescript
} catch (error) {
  this.setStatus('failed');

  this.emitEvent({
    type: 'failed',
    node: this.node,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.id,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this),
      logs: [...this.node.logs] as LogEntry[],
    },
  });

  throw error;
}
```

**Pattern Characteristics:**
- Catches exceptions from workflow execution
- Enriches error with workflow context (state, logs)
- Preserves original error
- Emits structured event
- Re-throws after enrichment

---

#### Pattern 3: Workflow Context Error Wrapping

**File:** `/home/dustin/projects/groundswell/src/core/workflow-context.ts`
**Lines:** 156-165

```typescript
} catch (error) {
  this.emitEvent({
    type: 'stepFailed',
    node: stepNode,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.workflowId,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this.workflow),
      logs: [...this.workflow.node.logs] as LogEntry[],
    },
  });
  throw error;
}
```

**Pattern Characteristics:**
- Similar to workflow error wrapping
- Adds context-specific node information
- Emits step-specific event

---

### 3.3 Recommended Wrapping Pattern for Agent

Based on existing patterns, the recommended error wrapping strategy for `executePrompt()`:

```typescript
try {
  // ... existing prompt execution logic

  return result;
} catch (error) {
  // Map error to appropriate error code
  const errorMapping = mapErrorToCode(error, context);

  // Create AgentResponse with error details
  return createErrorResponse(
    errorMapping.code,
    errorMapping.message,
    errorMapping.details,
    errorMapping.recoverable
  );
}
```

**Key Characteristics:**
- Wrap entire execution in try-catch
- Map errors to codes using helper function
- Return `AgentResponse<null>` instead of throwing
- Preserve error context in details object

---

## 4. Related Error Handling in Codebase

### 4.1 Error Type Checking Pattern

**Pattern Used Throughout:**

```typescript
const message = error instanceof Error ? error.message : 'Unknown error';
const stack = error instanceof Error ? error.stack : undefined;
```

**Files Using This Pattern:**
- `/home/dustin/projects/groundswell/src/core/mcp-handler.ts` (line 131)
- `/home/dustin/projects/groundswell/src/core/workflow.ts` (lines 528, 531)
- `/home/dustin/projects/groundswell/src/core/workflow-context.ts` (lines 158, 161, 322, 325)

**Why This Pattern:**
- Safe error message extraction
- Handles non-Error throws
- Provides fallback values

**Recommendation for AgentResponse:**
Continue this pattern for extracting error details in mapping function.

---

### 4.2 WorkflowError Interface

**File:** `/home/dustin/projects/groundswell/src/types/error.ts`

```typescript
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

**Analysis:**
- Rich error context (state, logs)
- No error code field (free-form message)
- Preserves original error
- Used for workflow-level errors only

**Key Difference from AgentErrorDetails:**
- WorkflowError is for internal workflow failures
- AgentErrorDetails is for agent response errors
- AgentErrorDetails includes error codes (machine-readable)
- WorkflowError includes execution context (state snapshots)

---

### 4.3 Error Merge Strategy

**File:** `/home/dustin/projects/groundswell/src/types/error-strategy.ts`

```typescript
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

**File:** `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`

```typescript
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError {
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;
  // ... creates merged error
}
```

**Relevance to Agent:**
- Currently only used for workflow concurrency
- Could be adapted for agent error aggregation
- Not needed for P1.M1.T1.S3 (single prompt execution)

---

## 5. Recommended Error Code Mapping

### 5.1 Error-to-Code Mapping Table

| Current Error Scenario | Error Code | Recoverable | Rationale |
|------------------------|------------|-------------|-----------|
| No text response from API | `API_REQUEST_FAILED` | `true` | API may return text on retry |
| No JSON found in response | `INVALID_RESPONSE_FORMAT` | `true` | Prompt clarification may help |
| JSON parse error | `INVALID_RESPONSE_FORMAT` | `true` | Transient API issue |
| Schema validation error | `VALIDATION_FAILED` | `true` | Agent may correct on retry |
| Tool execution error (delegated) | `TOOL_EXECUTION_FAILED` | `true` | Tools may be idempotent |
| Tool execution error (main) | `TOOL_EXECUTION_FAILED` | `true` | Tools may be idempotent |
| No handler found for tool | `TOOL_NOT_FOUND` | `false` | Configuration error |

### 5.2 Missing Error Code

**Missing:** `TOOL_NOT_FOUND`

**Action Required:** Add to `AGENT_ERROR_CODES` constant

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',  // ADD THIS
} as const;
```

### 5.3 Mapping Function Signature

**Recommended Function:**

```typescript
// File: src/core/agent.ts

private mapErrorToResponse(
  error: unknown,
  context: {
    prompt: Prompt<T>;
    effectiveModel: string;
    startTime: number;
  }
): AgentResponse<null> {
  // Implementation in section 6
}
```

---

## 6. Implementation Strategy

### 6.1 Refactoring Approach

**Option A: Wrap Entire executePrompt() in try-catch**

```typescript
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  const startTime = Date.now();
  const ctx = getExecutionContext();

  try {
    // ... all existing logic (lines 186-423)

    return result;
  } catch (error) {
    // Map to error response
    return this.mapErrorToPromptResult(error, prompt, startTime);
  }
}

private mapErrorToPromptResult<T>(
  error: unknown,
  prompt: Prompt<T>,
  startTime: number
): PromptResult<T> {
  // For now, still throw (P1.M1.T1.S4 will change this)
  // P1.M1.T1.S3 will only wrap with error codes
  throw error;
}
```

**Pros:**
- Single catch block for all errors
- Consistent error handling
- Easy to add logging/metrics

**Cons:**
- Still throws in P1.M1.T1.S3 (not returning AgentResponse yet)
- Requires two-phase refactoring

---

**Option B: Selective Wrapping at Error Sites**

```typescript
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  // ... existing logic

  // At each error site:
  if (!textContent) {
    throw this.createAgentError(
      'API_REQUEST_FAILED',
      'No text response received from API',
      { responseFormat: response.content.map(b => b.type) },
      true
    );
  }
}

private createAgentError(
  code: string,
  message: string,
  details: Record<string, unknown>,
  recoverable: boolean
): Error {
  // Create Error with attached code
  const error = new Error(message);
  (error as any).errorCode = code;
  (error as any).errorDetails = details;
  (error as any).recoverable = recoverable;
  return error;
}
```

**Pros:**
- Preserves error stack traces
- Errors still thrown (existing behavior)
- Error metadata attached to Error objects

**Cons:**
- Modifies 5+ error sites
- More code changes
- Type safety issues (attaching properties to Error)

---

**Recommended: Option B (Selective Wrapping)**

**Rationale:**
- Maintains existing throw behavior for P1.M1.T1.S3
- Preserves stack traces (critical for debugging)
- Minimal changes to execution flow
- Error metadata available for P1.M1.T1.S4 (AgentResponse conversion)

### 6.2 Error Mapping Helper Function

```typescript
// File: src/core/agent.ts

/**
 * Create an error with attached AgentResponse metadata
 * Used internally until P1.M1.T1.S4 converts to AgentResponse return type
 */
private createAgentError(
  code: keyof typeof AGENT_ERROR_CODES,
  message: string,
  details: Record<string, unknown>,
  recoverable: boolean
): Error & {
  errorCode: string;
  errorDetails: Record<string, unknown>;
  recoverable: boolean;
} {
  const error = new Error(message) as Error & {
    errorCode: string;
    errorDetails: Record<string, unknown>;
    recoverable: boolean;
  };

  error.errorCode = code;
  error.errorDetails = details;
  error.recoverable = recoverable;

  return error;
}
```

### 6.3 Error Site Updates

**Site 1: No text response (line 375)**
```typescript
// BEFORE
if (!textContent) {
  throw new Error('No text response received from API');
}

// AFTER
if (!textContent) {
  throw this.createAgentError(
    'API_REQUEST_FAILED',
    'No text response received from API',
    {
      responseFormat: response.content.map(b => b.type),
      model: effectiveModel,
      agentId: this.id
    },
    true
  );
}
```

---

**Site 2: No JSON found (line 381)**
```typescript
// BEFORE
if (!jsonMatch) {
  throw new Error('No JSON object found in response');
}

// AFTER
if (!jsonMatch) {
  throw this.createAgentError(
    'INVALID_RESPONSE_FORMAT',
    'No JSON object found in response',
    {
      rawResponse: textContent.text.substring(0, 200),
      promptId: prompt.id,
      agentId: this.id
    },
    true
  );
}
```

---

**Site 3 & 4: Tool execution errors (lines 480, 490)**
```typescript
// BEFORE
if (result.is_error) {
  throw new Error(result.content as string);
}

// AFTER
if (result.is_error) {
  throw this.createAgentError(
    'TOOL_EXECUTION_FAILED',
    result.content as string,
    {
      toolName: toolUse.name,
      toolInput: toolUse.input,
      handlerType: 'delegated' // or 'main'
    },
    true
  );
}
```

---

**Site 5: No handler found (line 496)**
```typescript
// BEFORE
throw new Error(`No handler found for tool '${name}'`);

// AFTER
throw this.createAgentError(
  'TOOL_NOT_FOUND',
  `No handler found for tool '${name}'`,
  {
    toolName: name,
    availableTools: [
      ...this.mcpHandlers.map(h => h.getServerNames()).flat(),
      ...this.mcpHandler.getServerNames()
    ],
    agentId: this.id
  },
  false
);
```

---

### 6.4 Add TOOL_NOT_FOUND Error Code

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',  // ← ADD THIS LINE
} as const;
```

### 6.5 Add Error Type Guard

**File:** `/home/dustin/projects/groundswell/src/core/agent.ts`

```typescript
/**
 * Check if an error has AgentResponse metadata attached
 * Used to distinguish enriched errors from plain Errors
 */
private isAgentError(error: unknown): error is Error & {
  errorCode: string;
  errorDetails: Record<string, unknown>;
  recoverable: boolean;
} {
  return (
    error instanceof Error &&
    'errorCode' in error &&
    'errorDetails' in error &&
    'recoverable' in error
  );
}
```

### 6.6 Future: Convert to AgentResponse (P1.M1.T1.S4)

**This will be implemented in P1.M1.T1.S4:**

```typescript
// P1.M1.T1.S4 implementation (future task)

private mapErrorToAgentResponse<T>(
  error: unknown,
  prompt: Prompt<T>,
  startTime: number
): AgentResponse<null> {
  if (this.isAgentError(error)) {
    // Error already has metadata from createAgentError()
    return createErrorResponse(
      error.errorCode,
      error.message,
      {
        ...error.errorDetails,
        duration: Date.now() - startTime,
        timestamp: startTime
      },
      error.recoverable
    );
  }

  // Fallback for unexpected errors
  return createErrorResponse(
    'EXECUTION_FAILED',
    error instanceof Error ? error.message : 'Unknown error',
    {
      originalError: error instanceof Error ? error.stack : String(error),
      agentId: this.id,
      promptId: prompt.id,
      duration: Date.now() - startTime
    },
    false
  );
}
```

---

## 7. Testing Recommendations

### 7.1 Error Scenario Test Cases

**Test Matrix:**

```typescript
describe('Agent.executePrompt error handling', () => {

  describe('API_REQUEST_FAILED', () => {
    it('should throw enriched error when API returns no text', async () => {
      // Mock API response without text block
      const agent = new Agent();
      const prompt = createTestPrompt();

      await expect(agent.prompt(prompt))
        .rejects.toThrow('No text response received from API');

      // Verify error has metadata
      try {
        await agent.prompt(prompt);
      } catch (error) {
        expect(error.errorCode).toBe('API_REQUEST_FAILED');
        expect(error.recoverable).toBe(true);
        expect(error.errorDetails).toHaveProperty('responseFormat');
      }
    });
  });

  describe('INVALID_RESPONSE_FORMAT', () => {
    it('should throw enriched error when no JSON found', async () => {
      // Mock API response with text but no JSON
      // Test error enrichment
    });

    it('should throw enriched error when JSON.parse fails', async () => {
      // Mock API response with invalid JSON
      // Test error enrichment
    });
  });

  describe('TOOL_EXECUTION_FAILED', () => {
    it('should throw enriched error when tool fails', async () => {
      // Mock tool returning is_error: true
      // Test error enrichment
    });
  });

  describe('TOOL_NOT_FOUND', () => {
    it('should throw non-recoverable error for unknown tool', async () => {
      // Try to execute unregistered tool
      // Verify recoverable: false
    });
  });

  describe('VALIDATION_FAILED', () => {
    it('should throw enriched error when schema validation fails', async () => {
      // Mock API response with invalid schema
      // Test ZodError wrapping
    });
  });
});
```

### 7.2 Error Code Type Safety Test

```typescript
describe('Error code type safety', () => {
  it('should only allow valid error codes', () => {
    const validCodes = Object.values(AGENT_ERROR_CODES);

    // Test that createErrorResponse accepts all valid codes
    validCodes.forEach(code => {
      const response = createErrorResponse(code, 'test', {}, true);
      expect(response.error.code).toBe(code);
    });

    // Test that invalid codes are caught by TypeScript
    // @ts-expect-error - invalid code
    const invalid = createErrorResponse('INVALID_CODE', 'test', {}, true);
  });
});
```

---

## 8. Summary and Action Items

### 8.1 Key Findings

1. **5 explicit error scenarios** in `executePrompt()` need error code mapping
2. **3 implicit error scenarios** (JSON parse, schema validation, API errors)
3. **No existing error wrapping** - all errors thrown as plain `Error` objects
4. **Error codes already exist** in `src/types/agent.ts` (5 codes defined)
5. **Missing `TOOL_NOT_FOUND`** error code needs to be added
6. **Factory function exists** (`createErrorResponse`) but needs `agentId` fix

### 8.2 Recommended Implementation

**For P1.M1.T1.S3 (Current Task):**
1. Add `TOOL_NOT_FOUND` to `AGENT_ERROR_CODES`
2. Create `createAgentError()` helper method
3. Update 5 error sites with enriched errors
4. Add `isAgentError()` type guard
5. Maintain existing throw behavior (errors still propagate)

**For P1.M1.T1.S4 (Future Task):**
1. Wrap `executePrompt()` in try-catch
2. Convert enriched errors to `AgentResponse<null>`
3. Return error responses instead of throwing
4. Update `prompt()` and `promptWithMetadata()` signatures

### 8.3 Risk Mitigation

**Risks:**
- Breaking existing error handling behavior
- Losing stack trace information
- Type safety issues with error metadata

**Mitigations:**
- Use selective wrapping (Option B) to preserve stack traces
- Attach metadata as properties to Error objects
- Use type guards for type narrowing
- Comprehensive test coverage for all error scenarios

### 8.4 Dependencies

**Required Files:**
- `/home/dustin/projects/groundswell/src/core/agent.ts` (modify)
- `/home/dustin/projects/groundswell/src/types/agent.ts` (add error code)
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts` (add tests)

**Related PRPs:**
- P1.M1.T1.S2 - Factory functions (already implemented)
- P1.M1.T1.S4 - Return AgentResponse instead of T (future task)
- P1.M1.T2.S3 - Update call sites (future task)

---

## Appendix A: Quick Reference

### Error Code Mapping Quick Reference

```typescript
// Error scenario → Error code mapping
const ERROR_CODE_MAP = {
  'No text response from API': 'API_REQUEST_FAILED',
  'No JSON object found in response': 'INVALID_RESPONSE_FORMAT',
  'JSON parse error': 'INVALID_RESPONSE_FORMAT',
  'Schema validation error': 'VALIDATION_FAILED',
  'Tool execution error': 'TOOL_EXECUTION_FAILED',
  'No handler found for tool': 'TOOL_NOT_FOUND',
  'API request error': 'API_REQUEST_FAILED',
} as const;
```

### Error Metadata Structure

```typescript
interface AgentErrorMetadata {
  errorCode: keyof typeof AGENT_ERROR_CODES;
  errorDetails: Record<string, unknown>;
  recoverable: boolean;
}

// Attached to Error object
Error & AgentErrorMetadata
```

### Recoverable Flag Guidelines

```typescript
// Recoverable errors (can retry)
const RECOVERABLE_ERRORS = [
  'API_REQUEST_FAILED',      // Network issues transient
  'INVALID_RESPONSE_FORMAT', // Agent may correct
  'VALIDATION_FAILED',       // Agent may fix
  'TOOL_EXECUTION_FAILED',   // Tools may be idempotent
];

// Non-recoverable errors (fail fast)
const NON_RECOVERABLE_ERRORS = [
  'TOOL_NOT_FOUND',          // Configuration error
];
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Next Review:** After P1.M1.T1.S3 implementation completion
**Related Documents:**
- `plan/002_6761e4b84fd1/P1M1T1S2/PRP.md` - Factory function implementation
- `plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S2/research/error-code-conventions-research.md`
