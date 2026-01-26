# PRP: Refactor Agent.stream() to use provider streaming

---

## Goal

**Feature Goal**: Refactor `Agent.stream()` method to use the provider abstraction layer's streaming capabilities instead of direct SDK streaming calls, enabling multi-provider streaming support with proper AsyncStream interface.

**Deliverable**:
1. New `AsyncStream<T>` interface/class for streaming responses
2. Refactored `Agent.stream()` method that delegates to `provider.stream()` or wraps `provider.execute()` with streaming support
3. Stream event types and proper AsyncGenerator return values
4. Integration with existing ProviderHookEvents.onStream callback

**Success Definition**:
- `Agent.stream()` returns `AsyncStream<T>` with AsyncGenerator for for-await...of consumption
- Both Anthropic and OpenCode providers work via `Agent.stream()`
- Stream events include text deltas, tool calls, metadata, usage, and completion
- Tool execution delegates through existing `toolExecutor` method during streaming
- Configuration cascade works correctly (global → agent → prompt level)
- Streaming hooks (`onStream`) emit chunks correctly
- All existing tests pass without modification to public interface

---

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**YES** - This PRP provides:
- Complete research on AsyncStream patterns and AsyncGenerator usage
- Full provider interface and streaming capability definitions
- Exact configuration cascade patterns from previous subtasks
- Tool executor integration patterns
- Existing streaming implementations in both providers
- Test framework patterns and mock structures
- External best practices and gotchas for streaming implementations

---

### Documentation & References

```yaml
# MUST READ - Core implementation files
- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Contains the Agent class that needs stream() method implementation
  pattern: Follow executePrompt() method structure (lines 328-617) for configuration cascade and provider integration
  gotcha: No stream() method exists currently - this is new implementation
  gotcha: toolExecutor method (lines 170-199) must be used for tool delegation during streaming

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Contains Provider interface, ProviderRequest, ProviderHookEvents with onStream callback
  pattern: ProviderHookEvents.onStream?: (chunk: string) => void (line 96)
  pattern: ProviderCapabilities.streaming: boolean (line 24)
  gotcha: Provider interface has execute() but not stream() - need to add stream() or handle streaming via execute()

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Reference implementation showing AsyncGenerator usage (lines 332-397)
  pattern: for await (const message of queryResult) iteration pattern
  pattern: Session handling with streamInput() for continuation (lines 337-360)
  gotcha: Uses SDK's AsyncGenerator<SDKMessage> - needs transformation to AsyncStream format

- file: /home/dustin/projects/groundswell/src/providers/opencode-provider.ts
  why: Shows Server-Sent Events streaming pattern (lines 458-487)
  pattern: client.event.subscribe() with for await (const event of eventStreamResult.stream)
  pattern: onStream hook emission via message.part.updated events (lines 465-478)
  gotcha: SSE-based streaming, not AsyncGenerator - needs adapter pattern

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Contains AgentResponse, AgentResponseMetadata interfaces
  pattern: Discriminated union with status field ('success' | 'error' | 'partial')
  gotcha: 'partial' status exists but not currently used - perfect for streaming

# Related subtask implementations to follow
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M2T1S3/PRP.md
  why: Previous subtask for Agent.prompt() refactoring to provider.execute()
  pattern: Configuration cascade implementation (lines 338-350 in agent.ts)
  pattern: Provider request construction (lines 500-510 in agent.ts)
  pattern: Hook conversion from Agent.hooks to ProviderHookEvents (lines 448-498 in agent.ts)

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M2T1S1/PRP.md
  why: Provider instance retrieval pattern
  pattern: ProviderRegistry.getInstance().get(resolvedProvider)
  gotcha: Resolved provider may differ from this.provider due to prompt overrides

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M2T1S2/PRP.md
  why: Tool executor implementation for delegation
  pattern: Delegates to MCPHandlers with serverName__toolName format
  gotcha: Never throws - returns ToolExecutionResult with isError

# PRD context for work item boundaries
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/prd_snapshot.md
  why: PRD Section 7 - Multi-Provider Agent SDK System
  section: 7.3 Provider Interface, 7.4 ProviderCapabilities
  gotcha: Provider interface doesn't have stream() method - need to add or handle via execute()

# External research documentation
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function*
  why: Async function and async generator fundamentals
  section: AsyncGenerator function signatures and for await...of usage

- url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#async-iteration
  why: TypeScript AsyncIterator type definitions
  section: AsyncGenerator<T, TReturn, TNext> type parameters

- url: https://docs.anthropic.com/en/api/messages-streaming
  why: Anthropic's streaming API documentation for event types
  section: Streaming event types (content_block_delta, message_stop, etc.)

- url: https://sdk.vercel.ai/docs/ai-sdk-core/streaming
  why: Vercel AI SDK streaming patterns for reference
  section: StreamEvent types and async generator patterns
```

---

### Current Codebase Tree

```bash
src/
├── cache/
│   ├── cache.ts              # LLMCache class with LRU, TTL, prefix invalidation
│   └── cache-key.ts          # generateCacheKey() with SHA-256 hashing
├── core/
│   ├── agent.ts              # Agent class with prompt(), executePrompt(), toolExecutor (NO stream() yet)
│   ├── mcp-handler.ts        # MCPHandler for tool execution delegation
│   └── prompt.ts             # Prompt<T> class for typed prompts
├── providers/
│   ├── anthropic-provider.ts # AnthropicProvider with AsyncGenerator iteration in execute()
│   ├── opencode-provider.ts  # OpenCodeProvider with SSE streaming in execute()
│   └── provider-registry.ts  # ProviderRegistry singleton for provider instances
├── types/
│   ├── agent.ts              # AgentResponse, AgentResponseMetadata, AgentHooks
│   ├── providers.ts          # Provider, ProviderRequest, ProviderHookEvents, ToolExecutor
│   └── sdk-primitives.ts     # Agent SDK types (AgentSDKOptions, AgentHooks)
└── utils/
    ├── provider-config.ts    # resolveProviderConfig(), getGlobalProviderConfig()
    └── model-spec.ts         # parseModelSpec(), formatModelForProvider()
```

---

### Desired Codebase Tree with Changes

```bash
# Modified files
src/
├── types/
│   ├── streaming.ts          # NEW - AsyncStream<T> interface, StreamEvent types
│   └── agent.ts              # MODIFY - Add stream() method signature to Agent class
├── core/
│   └── agent.ts              # MODIFY - Add stream() method implementation
│       ├── ADD: stream<T>() method with AsyncStream<T> return type
│       ├── ADD: Private method for stream event transformation
│       ├── USE: Existing configuration cascade from executePrompt()
│       └── USE: Existing toolExecutor for tool delegation during streaming
├── types/
│   └── providers.ts          # MODIFY - Add stream() to Provider interface (optional)
│       └── ADD: stream<T>() method signature to Provider interface
└── providers/
    ├── anthropic-provider.ts # MODIFY - Add stream() implementation or streaming flag to execute()
    └── opencode-provider.ts  # MODIFY - Add stream() implementation or streaming flag to execute()
```

---

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: No AsyncStream interface exists in codebase currently
// Must create AsyncStream<T> interface from scratch
// Research shows TypeScript's built-in AsyncGenerator<T> should be used

// GOTCHA: Provider interface doesn't have stream() method
// Two options:
// Option A: Add stream<T>() to Provider interface (breaking change)
// Option B: Add streaming flag to ProviderRequest.options and handle in execute()
// RECOMMENDATION: Option B - less invasive, allows backward compatibility

// CRITICAL: Anthropic uses AsyncGenerator, OpenCode uses SSE
// Need adapter pattern to normalize both to AsyncStream format
// Anthropic: for await (const message of queryResult)
// OpenCode: for await (const event of eventStreamResult.stream)

// GOTCHA: Tool execution during streaming
// Tools can be called mid-stream - need to handle tool execution events
// Tool executor must still delegate through this.toolExecutor
// Tool calls should emit StreamEvent with type: 'tool_call_start' and 'tool_call_done'

// CRITICAL: Configuration cascade must work for streaming
// Same cascade as executePrompt(): prompt > agent > global
// Resolved provider may differ from this.provider
// Use same resolveProviderConfig() pattern

// GOTCHA: Stream lifecycle and resource cleanup
// Must use try-finally for resource cleanup
// AbortController for cancellation support
// Reader.releaseLock() for ReadableStream cleanup (OpenCode)

// CRITICAL: Hook conversion for onStream
// ProviderHookEvents.onStream?: (chunk: string) => void
// Agent.hooks may need onStream support or use ProviderHookEvents directly
// Convert Agent.hooks format to ProviderHookEvents if needed

// GOTCHA: Partial responses during streaming
// AgentResponse has 'partial' status but not currently used
// Stream events may include partial data before completion
// Final AgentResponse should have status='success' with complete data

// CRITICAL: TextDecoder usage for SSE streams
// OpenCode SSE streams need TextDecoder with { stream: true } option
// Prevents splitting multi-byte UTF-8 characters

// GOTCHA: Session handling during streaming
// Anthropic: Continue sessions with streamInput() during streaming
// OpenCode: Sessions are server-side, pass sessionId in prompt
// Agent should not manage sessions - pass through to providers

// CRITICAL: Error handling in streams
// Yield error events instead of throwing
// Allow stream to continue after errors (unless fatal)
// Distinguish retryable vs non-retryable errors

// GOTCHA: Type safety with discriminated unions for StreamEvent
// Use TypeScript's exhaustiveness checking for event types
// Each event type should have unique properties for type narrowing
```

---

## Implementation Blueprint

### Data Models and Structure

```typescript
// New file: src/types/streaming.ts

/**
 * Stream event types for LLM streaming responses
 * Discriminated union for type-safe event handling
 */
export type StreamEvent =
  // Text content events
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'text_done'; text: string; index: number }

  // Tool/function call events
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_delta'; id: string; input: Record<string, unknown> }
  | { type: 'tool_call_done'; id: string; result: unknown }

  // Metadata events
  | { type: 'metadata'; metadata: { requestId?: string; model?: string; provider: string } }

  // Usage events
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheTokens?: number }

  // Completion events
  | { type: 'done'; finishReason: 'stop' | 'length' | 'tool_calls' | 'error' }

  // Error events
  | { type: 'error'; error: Error; code?: string; retryable?: boolean };

/**
 * AsyncStream interface for streaming responses
 * Wraps AsyncGenerator with additional metadata
 */
export interface AsyncStream<T> {
  /**
   * Async generator yielding stream events
   * Consume with for await...of loop
   */
  stream: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  /**
   * Optional abort controller for cancellation
   */
  controller?: AbortController;
}

/**
 * Type guard for text delta events
 */
export function isTextDeltaEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'text_delta' }> {
  return event.type === 'text_delta';
}

/**
 * Type guard for tool call events
 */
export function isToolCallEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done' }> {
  return event.type === 'tool_call_start' || event.type === 'tool_call_delta' || event.type === 'tool_call_done';
}

/**
 * Type guard for error events
 */
export function isErrorEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'error' }> {
  return event.type === 'error';
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/types/streaming.ts
  - IMPLEMENT: StreamEvent discriminated union type
  - IMPLEMENT: AsyncStream<T> interface with AsyncGenerator
  - IMPLEMENT: Type guard functions (isTextDeltaEvent, isToolCallEvent, isErrorEvent)
  - FOLLOW pattern: Discriminated union pattern from src/types/agent.ts
  - NAMING: PascalCase for types, camelCase for functions
  - PLACEMENT: New file in src/types/
  - DEPENDENCIES: None

Task 2: MODIFY src/types/agent.ts
  - ADD: stream() method signature to Agent class (documentation only)
  - SIGNATURE: stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T>
  - DESCRIPTION: Document that stream() returns AsyncStream with AsyncGenerator
  - DEPENDENCIES: Task 1

Task 3: MODIFY src/types/providers.ts (OPTIONAL - Alternative approach)
  - DECISION: Choose between Option A (add stream() to Provider) or Option B (streaming flag in execute())
  - Option A: ADD stream<T>() method to Provider interface
  - Option B: ADD streaming?: boolean flag to ProviderExecutionOptions
  - RECOMMENDATION: Option B for backward compatibility
  - DEPENDENCIES: Task 1

Task 4: MODIFY src/providers/anthropic-provider.ts (Option B approach)
  - MODIFY: execute() method to check for streaming flag
  - ADD: When options.streaming = true, return AsyncGenerator<StreamEvent> instead of AgentResponse
  - TRANSFORM: SDK messages to StreamEvent format
  - PATTERN: Follow existing AsyncGenerator iteration (lines 368-397)
  - GOTCHA: Must still support non-streaming mode (backward compatible)
  - DEPENDENCIES: Task 3 (if Option B)

Task 5: MODIFY src/providers/opencode-provider.ts (Option B approach)
  - MODIFY: execute() method to check for streaming flag
  - ADD: When options.streaming = true, yield StreamEvent from SSE stream
  - TRANSFORM: SSE events to StreamEvent format
  - PATTERN: Follow existing SSE subscription (lines 458-487)
  - GOTCHA: Use TextDecoder with { stream: true } option
  - DEPENDENCIES: Task 3 (if Option B)

Task 6: CREATE Agent.stream() method in src/core/agent.ts
  - LOCATION: After executePrompt() method (around line 618)
  - SIGNATURE: public stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T>
  - IMPLEMENT: Configuration cascade (same as executePrompt)
  - IMPLEMENT: Provider resolution (same as executePrompt)
  - IMPLEMENT: Provider request construction (same as executePrompt)
  - IMPLEMENT: Hook conversion (same as executePrompt)
  - CREATE: AbortController for cancellation support
  - CALL: provider.execute() with streaming: true flag
  - RETURN: AsyncStream<T> with stream generator
  - DEPENDENCIES: Task 1, Task 2, Task 4, Task 5

Task 7: CREATE Stream event transformation helper in src/core/agent.ts
  - LOCATION: Private method in Agent class
  - SIGNATURE: private transformSDKToStreamEvent<T>(sdkEvent: unknown): StreamEvent
  - IMPLEMENT: Transform Anthropic SDK messages to StreamEvent format
  - IMPLEMENT: Transform OpenCode SSE events to StreamEvent format
  - HANDLE: Text deltas, tool calls, errors, completion
  - DEPENDENCIES: Task 6

Task 8: MODIFY src/core/agent.ts exports
  - ADD: Export AsyncStream from src/types/streaming.ts in src/core/index.ts
  - ADD: Export StreamEvent types from src/types/streaming.ts in src/core/index.ts
  - ENSURE: Public API includes streaming types
  - DEPENDENCIES: Task 1

Task 9: CREATE tests for streaming in src/__tests__/unit/agent-stream.test.ts
  - IMPLEMENT: Test stream() method with Anthropic provider
  - IMPLEMENT: Test stream() method with OpenCode provider
  - IMPLEMENT: Test text delta events
  - IMPLEMENT: Test tool call events during streaming
  - IMPLEMENT: Test error handling in streams
  - IMPLEMENT: Test cancellation via AbortController
  - IMPLEMENT: Test configuration cascade for streaming
  - PATTERN: Follow existing test patterns in src/__tests__/unit/
  - DEPENDENCIES: Task 6

Task 10: CREATE tests for AsyncStream in src/__tests__/unit/streaming.test.ts
  - IMPLEMENT: Test StreamEvent type guards
  - IMPLEMENT: Test AsyncGenerator consumption with for await...of
  - IMPLEMENT: Test stream transformation helpers
  - PATTERN: Follow existing test patterns in src/__tests__/unit/
  - DEPENDENCIES: Task 1
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Configuration Cascade (Same as executePrompt)
// ============================================================
// From /src/core/agent.ts (lines 338-350)

public stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T> {
  // Extract prompt-level provider overrides
  const promptProvider = overrides?.provider;
  const promptProviderOptions = overrides?.providerOptions;

  // Resolve provider configuration with cascade: global → agent → prompt
  const globalConfig = getGlobalProviderConfig();
  const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
    globalConfig,
    this.providerId,
    this.providerOptions,
    promptProvider,
    promptProviderOptions
  );

  // Get provider instance for resolved provider
  const registry = ProviderRegistry.getInstance();
  const providerInstance = registry.get(resolvedProvider);
  if (!providerInstance) {
    throw new Error(`Provider '${resolvedProvider}' is not registered`);
  }
  // ... rest of implementation
}

// ============================================================
// PATTERN 2: Provider Request with Streaming Flag
// ============================================================
// CRITICAL: Add streaming flag to options

const providerRequest: ProviderRequest = {
  prompt: userMessage,
  options: {
    model: effectiveModel,
    systemPrompt: effectiveSystem,
    tools: effectiveTools,
    sessionId: resolvedProviderOptions.sessionId,
    hooks: providerHooks,
    streaming: true,  // CRITICAL: Enable streaming mode
  },
};

// ============================================================
// PATTERN 3: Hook Conversion for onStream
// ============================================================
// From /src/core/agent.ts (lines 448-498)

const providerHooks: ProviderHookEvents = {};

// Convert Agent.hooks to ProviderHookEvents
if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
  providerHooks.onToolStart = async (tool: ToolExecutionRequest) => {
    for (const hook of effectiveHooks.preToolUse!) {
      await hook({
        toolName: tool.name,
        toolInput: tool.input as Record<string, unknown>,
        agentId: this.id,
      });
    }
  };
}

// ADD onStream hook support
if (effectiveHooks.onStream && effectiveHooks.onStream.length > 0) {
  providerHooks.onStream = (chunk: string) => {
    for (const hook of effectiveHooks.onStream!) {
      hook({ chunk, agentId: this.id });
    }
  };
}

// ============================================================
// PATTERN 4: AsyncStream Creation with AbortController
// ============================================================

public stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T> {
  const controller = new AbortController();

  // Create async generator that wraps provider streaming
  async function* streamGenerator(): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    try {
      // Yield metadata event first
      yield {
        type: 'metadata',
        metadata: {
          requestId: generateId(),
          model: effectiveModel,
          provider: resolvedProvider,
        },
      };

      // Call provider with streaming enabled
      const providerStream = await providerInstance.execute<T>(
        providerRequest,
        this.toolExecutor.bind(this),
        providerHooks
      );

      // Provider returns AsyncGenerator in streaming mode
      for await (const event of providerStream) {
        // Check for cancellation
        if (controller.signal.aborted) {
          yield {
            type: 'error',
            error: new Error('Stream cancelled'),
            code: 'CANCELLED',
            retryable: false,
          };
          break;
        }

        // Transform and yield event
        yield this.transformProviderEvent(event);
      }

      // Yield final completion event
      yield { type: 'done', finishReason: 'stop' };

      // Return final AgentResponse (required for AsyncGenerator return type)
      return createSuccessResponse(finalData, finalMetadata);
    } catch (error) {
      // Yield error event instead of throwing
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        retryable: false,
      };
      throw; // Re-throw for AsyncGenerator completion
    } finally {
      // Cleanup resources
      // Provider handles its own cleanup in terminate()
    }
  }

  return {
    stream: streamGenerator.call(this),
    controller,
  };
}

// ============================================================
// PATTERN 5: Provider Event Transformation
// ============================================================

private transformProviderEvent(event: unknown): StreamEvent {
  // Handle Anthropic SDK events
  if (this.isAnthropicEvent(event)) {
    const sdkEvent = event as AnthropicSDKEvent;

    if (sdkEvent.type === 'content_block_delta') {
      if (sdkEvent.delta.type === 'text_delta') {
        return {
          type: 'text_delta',
          delta: sdkEvent.delta.text,
          index: sdkEvent.index,
        };
      }
    }

    if (sdkEvent.type === 'content_block_start') {
      if (sdkEvent.content_block.type === 'tool_use') {
        return {
          type: 'tool_call_start',
          id: sdkEvent.content_block.id,
          name: sdkEvent.content_block.name,
          index: sdkEvent.index,
        };
      }
    }

    if (sdkEvent.type === 'message_delta') {
      if (sdkEvent.delta.stop_reason) {
        return {
          type: 'done',
          finishReason: sdkEvent.delta.stop_reason,
        };
      }

      if (sdkEvent.usage) {
        return {
          type: 'usage',
          inputTokens: sdkEvent.usage.input_tokens,
          outputTokens: sdkEvent.usage.output_tokens,
        };
      }
    }
  }

  // Handle OpenCode SSE events
  if (this.isOpenCodeEvent(event)) {
    const sseEvent = event as OpenCodeSSEEvent;

    if (sseEvent.type === 'message.part.updated') {
      const part = sseEvent.properties?.part;
      if (part?.type === 'text' && part.delta) {
        return {
          type: 'text_delta',
          delta: part.delta,
          index: 0, // OpenCode doesn't provide index
        };
      }
    }
  }

  // Unknown event type
  return {
    type: 'error',
    error: new Error(`Unknown event type: ${typeof event}`),
    code: 'UNKNOWN_EVENT',
    retryable: false,
  };
}

// ============================================================
// PATTERN 6: Tool Execution During Streaming
// ============================================================
// During streaming, tools are executed via existing toolExecutor

// When Anthropic SDK emits tool_use event:
// 1. Provider yields tool_call_start event
// 2. Provider calls toolExecutor(request) internally
// 3. Provider yields tool_call_done event with result
// 4. Stream continues with next text delta

// Tool executor (lines 170-199) handles tool delegation
// No changes needed - provider already uses this pattern

// ============================================================
// PATTERN 7: TextDecoder for SSE Streams (OpenCode)
// ============================================================

async function* transformSSEToStreamEvents(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // CRITICAL: Use { stream: true } option
      // Prevents splitting multi-byte UTF-8 characters
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            yield transformSSEEvent(event);
          } catch {
            // Incomplete JSON, continue buffering
          }
        }
      }
    }
  } finally {
    // CRITICAL: Always release reader lock
    reader.releaseLock();
  }

  // Flush any remaining data
  if (buffer) {
    const final = decoder.decode();
    if (final) {
      yield transformSSEEvent(JSON.parse(final));
    }
  }
}

// ============================================================
// PATTERN 8: Error Handling in Streams
// ============================================================

async function* streamWithErrorHandling(): AsyncGenerator<StreamEvent> {
  try {
    for await (const event of sourceStream) {
      // Distinguish error types
      if (isNetworkError(event)) {
        yield {
          type: 'error',
          error: event.error,
          retryable: true,
        };
        // Continue stream - allow retry
      } else if (isValidationError(event)) {
        yield {
          type: 'error',
          error: event.error,
          retryable: false,
        };
        // Fatal error - break stream
        break;
      } else {
        yield event;
      }
    }
  } catch (error) {
    // Unhandled error - yield and re-throw
    yield {
      type: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
      code: 'STREAM_ERROR',
      retryable: false,
    };
    throw;
  }
}

// ============================================================
// PATTERN 9: Usage Example (for documentation)
// ============================================================

// Consumer code:
const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({ user: 'Tell me a story' });

const streamResult = agent.stream(prompt);

try {
  for await (const event of streamResult.stream) {
    switch (event.type) {
      case 'text_delta':
        console.log(event.delta);
        break;
      case 'tool_call_start':
        console.log(`Tool: ${event.name}`);
        break;
      case 'usage':
        console.log(`Tokens: ${event.inputTokens + event.outputTokens}`);
        break;
      case 'done':
        console.log('Stream complete');
        break;
      case 'error':
        console.error('Error:', event.error.message);
        if (event.retryable) {
          // Retry logic
        }
        break;
    }
  }
} catch (error) {
  console.error('Stream failed:', error);
} finally {
  // Cancel stream if needed
  streamResult.controller?.abort();
}
```

---

### Integration Points

```yaml
CONFIGURATION:
  - use: resolveProviderConfig() from src/utils/provider-config.ts
  - pattern: Same cascade as executePrompt() (prompt > agent > global)
  - gotcha: Resolved provider may differ from this.provider

TOOL_EXECUTION:
  - use: Existing toolExecutor method (lines 170-199 in agent.ts)
  - pass: toolExecutor to provider.execute() as before
  - pattern: Provider handles tool calls during streaming internally

HOOKS:
  - convert: Agent.hooks → ProviderHookEvents
  - add: onStream hook support for chunk emission
  - pattern: Follow existing hook conversion pattern (lines 448-498)

PROVIDER_REGISTRY:
  - use: ProviderRegistry.getInstance().get(resolvedProvider)
  - pattern: Same as executePrompt() for provider resolution

CACHE:
  - note: Streaming responses are not cached
  - reason: Cache is for complete responses only
  - future: Could cache final AgentResponse after stream completes

SESSIONS:
  - pass through: sessionId in ProviderExecutionOptions
  - pattern: Providers handle session management internally
  - gotcha: No Agent-level session management needed

ABORT:
  - add: AbortController to AsyncStream return type
  - check: controller.signal.aborted in stream loop
  - cleanup: Resources in finally block
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating streaming.ts
cd /home/dustin/projects/groundswell

# Type checking new streaming types
npx tsc --noEmit src/types/streaming.ts

# Type checking Agent.stream() additions
npx tsc --noEmit src/core/agent.ts

# Linting
npm run lint -- src/types/streaming.ts src/core/agent.ts

# Formatting
npm run format -- src/types/streaming.ts src/core/agent.ts

# Full project type check (after all changes)
npm run type-check

# Expected: Zero type errors, zero lint errors. Fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test AsyncStream types and utilities
npm test -- src/__tests__/unit/streaming.test.ts

# Test Agent.stream() method
npm test -- src/__tests__/unit/agent-stream.test.ts

# Test provider streaming integration
npm test -- src/__tests__/unit/providers/anthropic-provider-streaming.test.ts
npm test -- src/__tests__/unit/providers/opencode-provider-streaming.test.ts

# Full test suite
npm test

# Expected: All tests pass. Focus on:
# - AsyncStream<T> type safety
# - StreamEvent transformation
# - Tool execution during streaming
# - Configuration cascade for streaming
# - Error handling in streams
# - Cancellation support
```

### Level 3: Integration Testing (System Validation)

```bash
# Test 1: Basic streaming with Anthropic provider
cat > test-stream-anthropic.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});

const prompt = new Prompt({
  user: 'Count from 1 to 5',
});

const streamResult = agent.stream(prompt);

let fullText = '';
for await (const event of streamResult.stream) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
    fullText += event.delta;
  } else if (event.type === 'done') {
    console.log('\nStream complete!');
  } else if (event.type === 'error') {
    console.error('Error:', event.error.message);
  }
}

console.log('Full text:', fullText);
// Expected: Streaming output of numbers 1-5
EOF

npm run exec test-stream-anthropic.ts

# Test 2: Streaming with tool calls
cat > test-stream-tools.ts << 'EOF'
import { Agent, Prompt, tool } from './src/index.js';
import { z } from 'zod';

const agent = new Agent({
  provider: 'anthropic',
  tools: [
    tool({
      name: 'calculator',
      description: 'Calculate math expressions',
      inputSchema: z.object({ expression: z.string() }),
      executor: async (input) => {
        return eval(input.expression);
      },
    }),
  ],
});

const prompt = new Prompt({
  user: 'What is 15 * 23?',
});

const streamResult = agent.stream(prompt);

for await (const event of streamResult.stream) {
  switch (event.type) {
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'tool_call_start':
      console.log(`\n[Tool: ${event.name}]`);
      break;
    case 'tool_call_done':
      console.log(`[Result: ${event.result}]`);
      break;
    case 'done':
      console.log('\nComplete!');
      break;
    case 'error':
      console.error('Error:', event.error.message);
      break;
  }
}
// Expected: Tool call events during stream
EOF

npm run exec test-stream-tools.ts

# Test 3: Streaming with OpenCode provider
cat > test-stream-opencode.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({
  provider: 'opencode',
  model: 'anthropic/claude-sonnet-4-20250514',
});

const prompt = new Prompt({
  user: 'Say "Hello from OpenCode"',
});

const streamResult = agent.stream(prompt);

for await (const event of streamResult.stream) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  } else if (event.type === 'done') {
    console.log('\nOpenCode stream complete!');
  }
}
// Expected: Streaming output from OpenCode provider
EOF

npm run exec test-stream-opencode.ts

# Test 4: Cancellation support
cat > test-stream-cancel.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({ user: 'Write a long story' });

const streamResult = agent.stream(prompt);

let eventCount = 0;
for await (const event of streamResult.stream) {
  if (event.type === 'text_delta') {
    eventCount++;
    process.stdout.write(event.delta);

    // Cancel after 10 chunks
    if (eventCount >= 10) {
      console.log('\nCancelling stream...');
      streamResult.controller?.abort();
      break;
    }
  }
}

console.log('Stream cancelled after', eventCount, 'events');
// Expected: Stream stops after cancellation
EOF

npm run exec test-stream-cancel.ts

# Expected: All integration tests pass with correct streaming behavior
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test 1: Multi-provider streaming comparison
cat > test-multi-provider-stream.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const anthropicAgent = new Agent({ provider: 'anthropic' });
const opencodeAgent = new Agent({ provider: 'opencode' });

const prompt = new Prompt({ user: 'Say "Hello"' });

// Test both providers
for (const [name, agent] of [['Anthropic', anthropicAgent], ['OpenCode', opencodeAgent]]) {
  console.log(`\n=== ${name} Streaming ===`);
  const streamResult = agent.stream(prompt);

  for await (const event of streamResult.stream) {
    if (event.type === 'text_delta') {
      process.stdout.write(event.delta);
    }
  }
}
// Expected: Both providers stream correctly
EOF

npm run exec test-multi-provider-stream.ts

# Test 2: Configuration cascade with streaming
cat > test-stream-cascade.ts << 'EOF'
import { Agent, Prompt, configureProviders } from './src/index.js';

// Set global config
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000 },
    opencode: { timeout: 60000 },
  },
});

// Agent with opencode override
const agent = new Agent({
  provider: 'opencode',
});

const prompt = new Prompt({ user: 'Test cascade' });

const streamResult = agent.stream(prompt);
for await (const event of streamResult.stream) {
  if (event.type === 'metadata') {
    console.log('Provider:', event.metadata.provider);
    // Expected: opencode
  }
}
EOF

npm run exec test-stream-cascade.ts

# Test 3: Error recovery in streams
cat > test-stream-errors.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({
  provider: 'anthropic',
  apiKey: 'invalid-key',
});

const prompt = new Prompt({ user: 'Test' });

const streamResult = agent.stream(prompt);

for await (const event of streamResult.stream) {
  if (event.type === 'error') {
    console.error('Error code:', event.code);
    console.error('Retryable:', event.retryable);
    console.error('Message:', event.error.message);
  }
}
// Expected: Error event with proper error details
EOF

npm run exec test-stream-errors.ts

# Test 4: Performance benchmark (streaming vs non-streaming)
cat > test-stream-performance.ts << 'EOF'
import { Agent, Prompt } from './src/index.js';

const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({ user: 'Write a paragraph about AI' });

// Test non-streaming
const start1 = Date.now();
const response1 = await agent.prompt(prompt);
const time1 = Date.now() - start1;

// Test streaming
const start2 = Date.now();
const streamResult = agent.stream(prompt);
let firstChunkTime = 0;
let chunkCount = 0;

for await (const event of streamResult.stream) {
  if (event.type === 'text_delta') {
    chunkCount++;
    if (chunkCount === 1) {
      firstChunkTime = Date.now() - start2;
    }
  }
}
const totalTime = Date.now() - start2;

console.log('Non-streaming:', time1, 'ms');
console.log('First chunk (streaming):', firstChunkTime, 'ms');
console.log('Total streaming:', totalTime, 'ms');
console.log('Time to first response:', (firstChunkTime / time1 * 100).toFixed(1), '% of non-streaming');
// Expected: First chunk arrives significantly faster than full response
EOF

npm run exec test-stream-performance.ts

# Expected: All creative tests pass, demonstrating robustness
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] No formatting issues: `npm run format`

### Feature Validation

- [ ] Agent.stream() returns AsyncStream<T> with AsyncGenerator
- [ ] Both Anthropic and OpenCode providers work via Agent.stream()
- [ ] Stream events include text deltas, tool calls, metadata, usage, completion
- [ ] Tool execution delegates through toolExecutor during streaming
- [ ] Configuration cascade works: global → agent → prompt level
- [ ] Streaming hooks (onStream) emit chunks correctly
- [ ] Cancellation support via AbortController works
- [ ] Error handling in streams yields error events
- [ ] Backpressure handling prevents memory issues
- [ ] Resources properly cleaned up in finally blocks

### Code Quality Validation

- [ ] Follows existing patterns from S1, S2, S3 subtasks
- [ ] Uses discriminated unions for StreamEvent type safety
- [ ] AsyncGenerator properly typed with TReturn = AgentResponse<T>
- [ ] TextDecoder uses { stream: true } option for SSE
- [ ] AbortController integrated for cancellation
- [ ] No new patterns introduced when existing ones work
- [ ] Code is self-documenting with clear variable names
- [ ] Proper error messages for edge cases

### Documentation & Deployment

- [ ] AsyncStream<T> and StreamEvent types exported from public API
- [ ] Usage examples documented in comments
- [ ] No breaking changes to existing Agent API
- [ ] Backward compatible with non-streaming execute()

---

## Anti-Patterns to Avoid

- ❌ Don't create AsyncStream class - use interface with AsyncGenerator
- ❌ Don't mix callbacks and async generators - choose one paradigm
- ❌ Don't forget to release stream locks in finally blocks
- ❌ Don't ignore backpressure - yield immediately, don't buffer
- ❌ Don't throw from async generator - yield error events instead
- ❌ Don't use TextDecoder without { stream: true } option
- ❌ Don't handle partial JSON incorrectly - buffer incomplete SSE data
- ❌ Don't create new configuration patterns - use existing resolveProviderConfig()
- ❌ Don't bypass toolExecutor - must delegate tool execution
- ❌ Don't manage sessions in Agent - delegate to providers
- ❌ Don't treat all errors the same - distinguish retryable vs non-retryable
- ❌ Don't forget AbortController for cancellation support
- ❌ Don't return wrong type from AsyncGenerator - must return AgentResponse<T>

---

## Success Metrics

**Confidence Score: 8/10** for one-pass implementation success

**Rationale**:
- Comprehensive research provides complete context for AsyncStream patterns
- External best practices documented with specific URLs
- Existing provider streaming implementations analyzed
- Test patterns established from existing codebase
- Configuration cascade pattern proven in previous subtasks
- Tool executor integration already working
- Minor risks:
  - Provider interface extension (streaming flag vs new method)
  - AsyncGenerator return type complexity (AgentResponse<T>)
  - SSE to AsyncStream transformation edge cases

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to:
1. Understand AsyncStream and AsyncGenerator patterns
2. Implement stream() method following executePrompt() patterns
3. Handle provider-specific streaming (AsyncGenerator vs SSE)
4. Properly transform events to StreamEvent format
5. Validate implementation with specific test commands
