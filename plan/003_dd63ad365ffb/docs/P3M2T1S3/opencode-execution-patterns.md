# OpenCode SDK Execution Patterns Research

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S3 - Implement execute() with multi-provider support
**Status:** Complete

---

## Executive Summary

This document compiles research on OpenCode SDK execution patterns for implementing the `execute()` method in OpenCodeProvider. Key findings include multi-provider model format, session execution API, response structure, and event streaming patterns.

---

## 1. Multi-Provider Model Format

### ProviderID/ModelID Format

OpenCode uses a `providerID/modelID` string format for model specification:

```typescript
// Format: "providerID/modelID"
const models = [
  "anthropic/claude-opus-4-5-20251101",
  "anthropic/claude-sonnet-4-5-20250929",
  "openai/gpt-5.1",
  "openai/gpt-5.1-codex",
  "google/gemini-3-pro-preview",
  "ollama/llama3",
  "azure/gpt-4",
  "aws/claude-v2",
  // ... 75+ providers supported
];
```

### Integration with parseModelSpec()

Groundswell's `parseModelSpec()` utility already handles this format:

```typescript
// From src/utils/model-spec.ts
const spec = parseModelSpec("openai/gpt-4", "opencode");
// Returns: { provider: 'opencode', model: 'openai/gpt-4', raw: 'openai/gpt-4' }
```

**GOTCHA:** OpenCode expects the model string to include the provider prefix. When calling `client.session.prompt()`, pass the full model string as the `model` parameter.

---

## 2. Session Execution API

### Primary Method: session.prompt()

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Initialize
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 4096,
});

// Create session
const sessionResult = await client.session.create({
  body: {
    model: {
      providerID: 'anthropic',
      modelID: 'claude-opus-4-5-20251101',
    },
    system: 'You are a helpful assistant.',
  },
});
const sessionId = sessionResult.data.id;

// Execute prompt (synchronous - waits for completion)
const result = await client.session.prompt({
  body: {
    sessionID: sessionId,
    message: 'Hello, OpenCode!',
  },
});
```

### session.prompt() Return Type

```typescript
// Returns RequestResult<SessionPromptResponses>
interface RequestResult<T> {
  data?: T;
  error?: Error;
  status: number;
}

// SessionPromptResponses contains UserMessage | AssistantMessage
if (result.data) {
  const message = result.data;
  // message is UserMessage | AssistantMessage
}
```

### Asynchronous Execution

```typescript
// Execute prompt (async - returns immediately)
const asyncResult = await client.session.promptAsync({
  body: {
    sessionID: sessionId,
    message: 'Process this asynchronously...',
  },
});
// Returns immediately with session/message info
// Use event subscription to track completion
```

---

## 3. Response Structure

### AssistantMessage (Response)

```typescript
export type AssistantMessage = {
  id: string;
  sessionID: string;
  role: "assistant";
  time: {
    created: number;
    completed?: number;
  };
  error?: ProviderAuthError | UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError;
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  path: {
    cwd: string;
    root: string;
  };
  summary?: boolean;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;      // Extended thinking tokens
    cache: {
      read: number;
      write: number;
    };
  };
  finish?: string;
};
```

### Converting to AgentResponse

```typescript
import { createSuccessResponse, createErrorResponse } from '../types/agent.js';

// Success case
return createSuccessResponse(message as T, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  usage: {
    inputTokens: message.tokens.input,
    outputTokens: message.tokens.output,
    cacheReadTokens: message.tokens.cache.read,
    cacheWriteTokens: message.tokens.cache.write,
  },
});

// Error case
if (message.error) {
  return createErrorResponse(
    'EXECUTION_FAILED',
    message.error.name + ': ' + message.error.data?.message,
    { providerID: message.providerID, modelID: message.modelID },
    false
  );
}
```

---

## 4. Event Streaming

### Server-Sent Events (SSE)

```typescript
// Subscribe to all events
const eventStream = await client.event.subscribe();

// Process events
for await (const event of eventStream) {
  console.log('Event type:', event.type);
  console.log('Event properties:', event.properties);
}
```

### Key Event Types for execute()

```typescript
// Message part updated (streaming)
export type EventMessagePartUpdated = {
  type: "message.part.updated";
  properties: {
    part: Part;
    delta?: string;  // Incremental text
  };
};

// Message updated (completion)
export type EventMessageUpdated = {
  type: "message.updated";
  properties: {
    info: Message;
  };
};
```

### Streaming Text

```typescript
// In execute() method, for onStream hook
if (event.type === 'message.part.updated') {
  const part = event.properties.part;
  if (part.type === 'text' && event.properties.delta) {
    // Streaming text chunk
    hooks?.onStream?.(event.properties.delta);
  }
}
```

---

## 5. Multi-Provider Support

### Provider List API

```typescript
// List all available providers
const providers = await client.provider.list();
// Returns array of 75+ provider configurations
```

### Model Configuration

```typescript
// When creating session, specify provider/model
const session = await client.session.create({
  body: {
    model: {
      providerID: 'openai',      // Provider selection
      modelID: 'gpt-5.1',          // Model selection
    },
  },
});

// Use any supported provider
const providers = ['anthropic', 'openai', 'google', 'ollama', 'azure', 'aws', ...];
```

---

## 6. Hooks Integration Patterns

### Event-Based Hook Dispatch

Unlike Anthropic SDK (synchronous callbacks), OpenCode uses async events:

```typescript
// Setup event subscription
const eventStream = await client.event.subscribe();

// Process events in background
(async () => {
  for await (const event of eventStream) {
    if (event.type === 'message.part.updated') {
      const part = event.properties.part;

      // onStream: TextPart with delta
      if (hooks?.onStream && part.type === 'text' && event.properties.delta) {
        hooks.onStream(event.properties.delta);
      }
    }
  }
})();
```

### Session Lifecycle Hooks

```typescript
// onSessionStart: Call when session is created/used
if (hooks?.onSessionStart) {
  await hooks.onSessionStart();
}

// Execute prompt...

// onSessionEnd: Call when execution completes
if (hooks?.onSessionEnd) {
  const totalDuration = Date.now() - startTime;
  await hooks.onSessionEnd(totalDuration);
}
```

---

## 7. Key Implementation Considerations

### GOTCHA: Tool Execution Limitation

**Critical:** OpenCode executes tools server-side with NO client-side delegation.

The `toolExecutor` parameter in `execute()` signature:
```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,  // ← Cannot use this!
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>>
```

**Resolution:** Implement as LLM-only provider (see tool-execution-research.md for details).

### GOTCHA: Session Management

OpenCode sessions are server-side, not in-memory:

```typescript
// Create/get session
let sessionId = request.options.sessionId;
if (!sessionId) {
  const session = await this.client.session.create({});
  sessionId = session.data.id;
}

// Use sessionID in prompt call
await this.client.session.prompt({
  body: {
    sessionID: sessionId,
    message: request.prompt,
  },
});
```

### GOTCHA: Model Format Conversion

OpenCode expects `providerID/modelID` but may need conversion:

```typescript
// Parse model specification
const modelSpec = this.normalizeModel(
  request.options.model ?? "claude-opus-4-5-20251101"
);

// If model includes provider prefix (e.g., "openai/gpt-4")
// Need to extract providerID and modelID
const [providerID, modelID] = modelSpec.model.split('/');
```

---

## 8. Complete execute() Skeleton

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,  // NOTE: Not used due to architectural limitation
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // 1. Validate initialization
  if (!this.client) {
    throw new Error("OpenCode provider not initialized");
  }

  // 2. Create or get session
  let sessionId = request.options.sessionId;
  if (!sessionId) {
    const session = await this.client.session.create({});
    sessionId = session.data.id;
  }

  // 3. Normalize model
  const modelSpec = this.normalizeModel(
    request.options.model ?? "claude-opus-4-5-20251101"
  );

  // 4. Parse provider/model
  const [providerID, modelID] = modelSpec.model.split('/');

  // 5. Setup event subscription (if hooks)
  // ... event subscription code ...

  // 6. Execute prompt
  const startTime = Date.now();
  const result = await this.client.session.prompt({
    body: {
      sessionID: sessionId,
      message: request.prompt,
    },
  });

  // 7. Convert response
  if (!result.data || result.error) {
    return createErrorResponse(...);
  }

  const message = result.data as AssistantMessage;
  return createSuccessResponse(message as T, {
    agentId: this.id,
    timestamp: Date.now(),
    duration: Date.now() - startTime,
    usage: { ...message.tokens },
  });
}
```

---

## 9. URLs and Sources

### Primary Sources

1. **NPM Package:** https://www.npmjs.com/package/@opencode-ai/sdk
   - Version: 1.1.36
   - Full API documentation in tarball

2. **Vercel AI SDK Provider:** https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
   - Example implementations
   - Session management patterns

3. **Website:** https://opencode.ai

### Local Research Documents

- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md`
- `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts`
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`

---

**End of Research Document**
