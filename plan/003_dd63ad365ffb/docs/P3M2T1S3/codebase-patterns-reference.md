# Codebase Patterns Reference - P3.M2.T1.S3

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S3 - Implement execute() with multi-provider support
**Status:** Complete

---

## Executive Summary

This document extracts key patterns from the existing codebase that must be followed when implementing `execute()` in OpenCodeProvider. These patterns ensure consistency with the existing provider implementation.

---

## 1. AnthropicProvider execute() Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 243-446

### Method Signature

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>>
```

### Implementation Structure

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // ===== STEP 1: SDK Initialization Check =====
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // ===== STEP 2: Session Detection and Retrieval =====
  const sessionId = request.options.sessionId;
  let session: SessionState | undefined;
  let isContinuation = false;

  if (sessionId) {
    session = this.getSession(sessionId);
    if (session && session.history.length > 0) {
      isContinuation = true;
    }
    if (!session) {
      this.createSession(sessionId);
      session = this.getSession(sessionId);
    }
  }

  // ===== STEP 3: Model Resolution =====
  const modelSpec = this.normalizeModel(
    request.options.model ?? "claude-sonnet-4-20250514",
  );

  // ===== STEP 4: Convert Provider Hooks to SDK Hooks =====
  const sdkHooks = this.buildAgentSDKHooks(hooks);

  // ===== STEP 5: Construct SDK Options =====
  const sdkOptions = {
    model: modelSpec.model,
    systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),
    ...(isContinuation && { continue: true }),
    ...(request.options.tools && request.options.tools.length > 0 && {
      allowedTools: request.options.tools.map((t) => t.name),
    }),
    ...(this.mcpServerConfig && {
      mcpServers: {
        "groundswell-mcp": this.mcpServerConfig,
      },
    }),
    ...(Object.keys(sdkHooks).length > 0 && {
      hooks: sdkHooks,
    }),
  };

  // ===== STEP 6: Start Time Tracking =====
  const startTime = Date.now();

  // ===== STEP 7: SDK Query Call =====
  const queryResult = this.sdk.query({
    prompt: isContinuation ? '' : request.prompt,
    options: sdkOptions,
  });

  // ===== STEP 8: Stream Session History (if continuation) =====
  if (isContinuation && session) {
    await queryResult.streamInput(
      async function* historyStream() {
        for (const msg of session!.history) {
          yield msg;
        }
      }()
    );
  }

  // ===== STEP 9: Message Iteration =====
  let resultMessage: SDKResultMessage | null = null;
  let toolCallCount = 0;

  for await (const message of queryResult) {
    // Count tool uses
    if (message.type === "assistant") {
      const content = message.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            toolCallCount++;
          }
        }
      }
    }

    // Capture user messages for session
    if (message.type === "user" && session) {
      session.history.push(message as SDKUserMessage);
    }

    // Capture result message
    if (message.type === "result") {
      resultMessage = message as SDKResultMessage;
      if (session) {
        session.lastResult = resultMessage;
      }
    }
  }

  // ===== STEP 10: Calculate Duration =====
  const duration = Date.now() - startTime;

  // ===== STEP 11: Handle Missing Result =====
  if (!resultMessage) {
    return createErrorResponse(
      "INVALID_RESPONSE_FORMAT",
      "No result message received from Agent SDK",
      { duration },
      false
    ) as AgentResponse<T>;
  }

  // ===== STEP 12: Handle Error Subtypes =====
  if (resultMessage.subtype !== "success") {
    const errorResult = resultMessage as SDKResultMessage & {
      subtype: string;
      errors?: string[];
    };
    return createErrorResponse(
      "EXECUTION_FAILED",
      `Agent SDK execution failed: ${errorResult.subtype}`,
      {
        errors: errorResult.errors ?? [],
        subtype: errorResult.subtype,
      },
      errorResult.subtype === "error_max_turns"
    ) as AgentResponse<T>;
  }

  // ===== STEP 13: Extract Usage =====
  const usage = {
    input_tokens: resultMessage.usage?.input_tokens ?? 0,
    output_tokens: resultMessage.usage?.output_tokens ?? 0,
  };

  // ===== STEP 14: Extract Data =====
  const data = (resultMessage.structured_output ?? resultMessage.result) as T;

  // ===== STEP 15: Return Success Response =====
  return createSuccessResponse(data, {
    agentId: this.id,
    timestamp: Date.now(),
    duration,
    usage,
    toolCalls: toolCallCount,
  });
}
```

---

## 2. Response Factory Pattern

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`
**Lines:** 499-615

### createSuccessResponse()

```typescript
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

### createErrorResponse()

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

### Usage Pattern

```typescript
// Import factory functions
import {
  createSuccessResponse,
  createErrorResponse,
} from "../types/agent.js";

// Success case
return createSuccessResponse(data, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  usage,
  toolCalls,
});

// Error case
return createErrorResponse(
  "INVALID_RESPONSE_FORMAT",
  "No result message received from Agent SDK",
  { duration },
  false
) as AgentResponse<T>;
```

---

## 3. Model Specification Pattern

**File:** `/home/dustin/projects/groundswell/src/utils/model-spec.ts`
**Lines:** 104-168

### parseModelSpec() Function

```typescript
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  const raw = model;
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error('Model specification cannot be empty...');
  }

  const parts = trimmed.split('/', 2);

  // Qualified format (provider/model)
  if (parts.length === 2) {
    const [provider, modelName] = parts;
    // ... validation ...
    return { provider, model: modelName, raw };
  }

  // Plain format (model only)
  return {
    provider: defaultProvider,
    model: parts[0],
    raw
  };
}
```

### Usage in Provider

```typescript
// Import utility
import { parseModelSpec } from "../utils/model-spec.js";

// Parse model specification
const modelSpec = this.normalizeModel(
  request.options.model ?? "claude-sonnet-4-20250514"
);

// Access components
const providerID = modelSpec.provider;  // 'anthropic' | 'opencode'
const modelID = modelSpec.model;         // 'claude-sonnet-4-20250514'
```

---

## 4. normalizeModel() Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 754-767

```typescript
normalizeModel(model: string): ModelSpec {
  // Delegate to existing utility function
  const spec = parseModelSpec(model, "anthropic");

  // Provider-specific validation
  if (spec.provider !== this.id) {
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
        `Use ProviderRegistry.get('${spec.provider}') instead.`
    );
  }

  return spec;
}
```

### OpenCodeProvider Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts`
**Lines:** 341-354

```typescript
normalizeModel(model: string): ModelSpec {
  // Delegate to existing utility function
  const spec = parseModelSpec(model, "opencode");

  // Provider-specific validation
  if (spec.provider !== this.id) {
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with OpenCodeProvider. ` +
        `Use ProviderRegistry.get('${spec.provider}') instead.`,
    );
  }

  return spec;
}
```

---

## 5. Hooks Adapter Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 643-720

### buildAgentSDKHooks() Structure

```typescript
private buildAgentSDKHooks(
  hooks?: ProviderHookEvents,
): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  // Early return for empty hooks
  if (!hooks) {
    return {};
  }

  const sdkHooks: Partial<Record<HookEvent, HookCallbackMatcher[]>> = {};

  // Map each hook type
  if (hooks.onToolStart) {
    sdkHooks['PreToolUse' as HookEvent] = [{
      hooks: [async (input, _toolUseID, _options) => {
        // Transform input
        const preInput = input as PreToolUseHookInput;
        const toolRequest = {
          name: preInput.tool_name,
          input: preInput.tool_input,
        };
        // Call hook
        await hooks.onToolStart!(toolRequest);
        // Return compatibility value
        return { continue: true };
      }],
    }];
  }

  // ... similar mappings for onToolEnd, onSessionStart, onSessionEnd ...

  return sdkHooks;
}
```

---

## 6. Idempotent Initialization Check Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 156-159, 207-209

```typescript
// In initialize()
async initialize(options?: ProviderOptions): Promise<void> {
  // Idempotent check
  if (this.sdk) {
    return;
  }
  // ... rest of initialization
}

// In terminate()
async terminate(): Promise<void> {
  // Idempotent check
  if (this.sdk === null) {
    return;
  }
  // ... rest of cleanup
}
```

---

## 7. Error Handling Pattern

### SDK Load Error

```typescript
try {
  this.sdk = await import("@anthropic-ai/claude-agent-sdk");
} catch (error) {
  throw new Error(
    `Failed to load @anthropic-ai/claude-agent-sdk: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );
}
```

### Execution Error

```typescript
// Handle missing result
if (!resultMessage) {
  return createErrorResponse(
    "INVALID_RESPONSE_FORMAT",
    "No result message received from Agent SDK",
    { duration },
    false
  ) as AgentResponse<T>;
}

// Handle error subtypes
if (resultMessage.subtype !== "success") {
  return createErrorResponse(
    "EXECUTION_FAILED",
    `Agent SDK execution failed: ${errorResult.subtype}`,
    { errors: errorResult.errors ?? [], subtype: errorResult.subtype },
    errorResult.subtype === "error_max_turns"
  ) as AgentResponse<T>;
}
```

---

## 8. ProviderRequest Structure

**File:** `/home/dustin/projects/groundswell/src/types/providers.ts`
**Lines:** 120-130

```typescript
export interface ProviderRequest {
  /** The user prompt/message */
  prompt: string;

  /** Execution options */
  options: ProviderExecutionOptions;
}

export interface ProviderExecutionOptions {
  /** Model identifier */
  model?: string;

  /** System prompt override */
  systemPrompt?: string;

  /** Available tools */
  tools?: Tool[];

  /** Lifecycle hooks */
  hooks?: ProviderHookEvents;

  /** Session identifier for session-based providers */
  sessionId?: string;
}
```

### Access Pattern

```typescript
async execute<T>(
  request: ProviderRequest,
  ...
): Promise<AgentResponse<T>> {
  // Access prompt
  const userPrompt = request.prompt;

  // Access options
  const model = request.options.model;
  const systemPrompt = request.options.systemPrompt;
  const tools = request.options.tools;
  const hooks = request.options.hooks;
  const sessionId = request.options.sessionId;
  ...
}
```

---

## 9. AgentResponse Structure

**File:** `/home/dustin/projects/groundswell/src/types/agent.ts`
**Lines:** 161-194

```typescript
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;  // 'success' | 'error' | 'partial'

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata including agent, timestamp, and execution details */
  metadata: AgentResponseMetadata;
}

export interface AgentResponseMetadata {
  /** Agent identifier */
  agentId: string;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;

  /** Token usage from API (optional) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional) */
  toolCalls?: number;
}
```

---

## 10. Key Implementation Requirements

### MUST Follow Patterns

1. **SDK Check:** Always validate SDK is initialized before use
2. **Model Parsing:** Use `normalizeModel()` for model specification
3. **Response Factory:** Use `createSuccessResponse()` and `createErrorResponse()`
4. **Time Tracking:** Use `Date.now()` for duration calculation
5. **Error Handling:** Specific error codes with descriptive messages
6. **Type Casting:** Use `as AgentResponse<T>` for error returns

### MUST NOT Patterns

1. **Don't skip validation:** Always check SDK initialization
2. **Don't ignore errors:** Handle all error cases explicitly
3. **Don't use sync in async:** No synchronous operations in async context
4. **Don't hardcode models:** Use default from request.options or provider default
5. **Don't throw in terminate:** Best-effort cleanup only

---

## 11. TypeScript Type Patterns

### Generic Type Parameter

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>>
```

### Type Assertions for SDK Types

```typescript
// Import types from dynamic module
private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

// Use in method signature
let resultMessage: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null = null;

// Type narrowing with discriminated union
if (resultMessage.subtype !== "success") {
  const errorResult = resultMessage as (typeof resultMessage & {
    subtype: string;
    errors?: string[];
  });
}
```

---

**End of Reference Document**
