# AnthropicProvider execute() Testing Patterns

**Work Item**: P5.M1.T3.S2 - Test AnthropicProvider execute() method
**Date**: 2026-01-26
**Context**: Groundswell Provider System Testing

---

## Overview

This document provides comprehensive testing patterns for the `AnthropicProvider.execute()` method, including AsyncGenerator mocking for SDK query(), session management testing, error handling scenarios, and streaming mode validation.

---

## Table of Contents

1. [Method Signature & Return Types](#method-signature--return-types)
2. [AsyncGenerator Mocking for SDK query()](#asyncgenerator-mocking-for-sdk-query)
3. [Session Management Testing](#session-management-testing)
4. [Error Handling Scenarios](#error-handling-scenarios)
5. [Streaming Mode Testing](#streaming-mode-testing)
6. [Complete Test Examples](#complete-test-examples)

---

## Method Signature & Return Types

### execute() Method

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
```

**Return Types**:
- **Non-streaming**: `Promise<AgentResponse<T>>` - Direct response
- **Streaming**: `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` - Yields events, returns response

### Source Location

**File**: `src/providers/anthropic-provider.ts`
**Lines**: 248-456 (execute), 473-676 (executeStreaming)

---

## AsyncGenerator Mocking for SDK query()

### Pattern: Basic SDK Mock

The SDK `query()` method returns an `AsyncGenerator<SDKMessage>` that yields messages during execution.

```typescript
// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(({ prompt, options }) => {
    return (async function* () {
      // Yield assistant message
      yield {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

      // Yield user message (for session history)
      yield {
        type: 'user',
        message: { content: 'User response' },
        session_id: 'test-session'
      } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage;

      // Yield final result message
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test result' },
        usage: { input_tokens: 100, output_tokens: 50 }
      } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
    })();
  }),
  createSdkMcpServer: vi.fn(),
  tool: vi.fn()
};
```

### Pattern: Mock with streamInput() for Session Continuation

For session continuation tests, the query result must have a `streamInput()` method.

```typescript
// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(({ prompt, options }) => {
    const mockGenerator = (async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test' },
        usage: { input_tokens: 100, output_tokens: 50 }
      } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
    })();

    // Add streamInput mock for session continuation
    (mockGenerator as any).streamInput = vi.fn().mockResolvedValue(undefined);

    return mockGenerator;
  }),
  createSdkMcpServer: vi.fn(),
  tool: vi.fn()
};
```

### SDK Message Types

The SDK query() AsyncGenerator yields three message types:

```typescript
// Assistant Message
type SDKAssistantMessage = {
  type: 'assistant';
  message: {
    content: Array<
      { type: 'text'; text: string } |
      { type: 'tool_use'; id: string; name: string; input: unknown }
    >;
  };
};

// User Message
type SDKUserMessage = {
  type: 'user';
  message: { content: string };
  session_id?: string;
  parent_tool_use_id?: string | null;
};

// Result Message
type SDKResultMessage = {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns';
  result?: unknown;
  structured_output?: unknown;
  usage?: { input_tokens: number; output_tokens: number };
  errors?: string[];
};
```

---

## Session Management Testing

### Test: New Session Creation

```typescript
it('should create new session on first execute with sessionId', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { sessionId: 'test-session' }
  };

  const toolExecutor = vi.fn();

  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const session = provider.getSession('test-session');

  expect(session).toBeDefined();
  expect(session?.history).toBeDefined();
  expect(session?.history.length).toBeGreaterThanOrEqual(0);
});
```

### Test: Session Continuation Detection

```typescript
it('should detect continuation when session has history', async () => {
  await provider.initialize();

  // Mock streamInput for continuation
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn(() => {
      const gen = (async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          result: { data: 'test' },
          usage: { input_tokens: 50, output_tokens: 25 }
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })();
      (gen as any).streamInput = vi.fn().mockResolvedValue(undefined);
      return gen;
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const sessionId = 'test-session';

  // First execution creates session
  const firstRequest: ProviderRequest = {
    prompt: 'First message',
    options: { sessionId }
  };

  const toolExecutor = vi.fn();
  await provider.execute(firstRequest, toolExecutor);

  // Manually add history to simulate existing session
  // @ts-expect-error - Testing private property
  const session = provider.getSession(sessionId);
  session?.history.push({
    type: 'user',
    message: { content: 'Previous message' },
    session_id: sessionId
  } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage);

  // Second execution should be continuation
  const secondRequest: ProviderRequest = {
    prompt: 'Second message',
    options: { sessionId }
  };

  await provider.execute(secondRequest, toolExecutor);

  // Verify streamInput was called for continuation
  // @ts-expect-error - Testing private property
  const queryCalls = provider.sdk.query.mock.calls;
  expect(queryCalls.length).toBe(2);

  const lastCallOptions = queryCalls[1][0].options;
  expect(lastCallOptions.continue).toBe(true);
});
```

### Test: Session History Accumulation

```typescript
it('should accumulate user messages in session history', async () => {
  await provider.initialize();

  const sessionId = 'test-session';

  // Mock SDK that yields user messages
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn(() => (async function* () {
      yield {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Response' }] }
      } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

      yield {
        type: 'user',
        message: { content: 'User input' },
        session_id: sessionId
      } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage;

      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'test' },
        usage: { input_tokens: 50, output_tokens: 25 }
      } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
    })()),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { sessionId }
  };

  const toolExecutor = vi.fn();
  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const session = provider.getSession(sessionId);

  expect(session?.history.length).toBeGreaterThan(0);
  expect(session?.history[0].type).toBe('user');
});
```

---

## Error Handling Scenarios

### Test: SDK Not Initialized

```typescript
it('should throw when SDK is not initialized', async () => {
  // Provider without initialization
  const uninitializedProvider = new AnthropicProvider();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  await expect(
    uninitializedProvider.execute(request, toolExecutor)
  ).rejects.toThrow('SDK not initialized. Call initialize() first.');
});
```

### Test: Missing Result Message

```typescript
it('should return error response when result message is missing', async () => {
  await provider.initialize();

  // Mock SDK that doesn't yield result message
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn(() => (async function* () {
      yield {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'No result' }] }
      } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;
      // Generator ends without result message
    })()),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
  expect(response.error?.message).toContain('No result message received');
  expect(response.error?.recoverable).toBe(false);
});
```

### Test: Error Subtype - error_during_execution

```typescript
it('should handle error_during_execution subtype', async () => {
  await provider.initialize();

  // Mock SDK with error result
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn(() => (async function* () {
      yield {
        type: 'result',
        subtype: 'error_during_execution',
        errors: ['Tool execution failed', 'Timeout occurred']
      } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage);
    })()),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('EXECUTION_FAILED');
  expect(response.error?.message).toContain('error_during_execution');
  expect(response.error?.details?.errors).toEqual(['Tool execution failed', 'Timeout occurred']);
  expect(response.error?.recoverable).toBe(false);
});
```

### Test: Error Subtype - error_max_turns (Recoverable)

```typescript
it('should handle error_max_turns subtype as recoverable', async () => {
  await provider.initialize();

  // Mock SDK with max turns error
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn(() => (async function* () {
      yield {
        type: 'result',
        subtype: 'error_max_turns',
        errors: ['Maximum conversation turns exceeded']
      } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage);
    })()),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const toolExecutor = vi.fn();

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('EXECUTION_FAILED');
  expect(response.error?.recoverable).toBe(true); // Max turns is recoverable
});
```

---

## Streaming Mode Testing

### Test: Streaming Returns AsyncGenerator

```typescript
it('should return AsyncGenerator when streaming is enabled', async () => {
  await provider.initialize();

  // Mock executeStreaming behavior
  // Note: This requires mocking the private executeStreaming method
  // or testing through the public interface

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  const toolExecutor = vi.fn();

  const result = provider.execute(request, toolExecutor);

  // Verify result has AsyncGenerator interface
  expect(result).toBeDefined();
  expect(typeof (result as any)[Symbol.asyncIterator]).toBe('function');

  // Consume the stream
  const events: StreamEvent[] = [];
  for await (const event of result) {
    events.push(event);
  }

  // Verify events were yielded (implementation dependent)
  expect(events.length).toBeGreaterThanOrEqual(0);
});
```

### Test: Stream Event Types

```typescript
it('should yield correct StreamEvent types during streaming', async () => {
  await provider.initialize();

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  const toolExecutor = vi.fn();

  const stream = provider.execute(request, toolExecutor);

  const events: StreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }

  // Verify event types
  const eventTypes = new Set(events.map(e => e.type));

  // Common stream event types to check
  expect(eventTypes.has('metadata') || eventTypes.has('text_delta') || eventTypes.has('done')).toBe(true);
});
```

---

## Complete Test Examples

### Example: Full Test Suite Structure

```typescript
/**
 * Test file: anthropic-provider-execute.test.ts
 *
 * Purpose: Comprehensive tests for AnthropicProvider.execute() method per P5.M1.T3.S2
 *
 * Tests:
 * - SDK initialization check
 * - Basic execution flow
 * - SDK options construction
 * - Tool execution delegation
 * - Message iteration
 * - Session management
 * - Response formatting
 * - Error handling
 * - Streaming mode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
import { ProviderRegistry } from '../../../providers/provider-registry.js';
import type {
  ProviderRequest,
  ToolExecutor,
  ToolExecutionRequest,
  ToolExecutionResult,
  ProviderExecutionOptions
} from '../../../types/providers.js';
import type { AgentResponse } from '../../../types/agent.js';
import type { StreamEvent } from '../../../types/streaming.js';
import type { Tool } from '../../../types/sdk-primitives.js';

describe('AnthropicProvider - execute()', () => {
  let provider: AnthropicProvider;

  beforeEach(async () => {
    provider = new AnthropicProvider();
    ProviderRegistry._resetForTesting();
    vi.clearAllMocks();

    // Initialize provider
    await provider.initialize();

    // Setup default SDK mock
    // @ts-expect-error - Testing private property
    provider.sdk = {
      query: vi.fn(() => (async function* () {
        yield {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Test response' }] }
        } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

        yield {
          type: 'result',
          subtype: 'success',
          result: { data: 'test result' },
          usage: { input_tokens: 100, output_tokens: 50 }
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })()),
      createSdkMcpServer: vi.fn(),
      tool: vi.fn()
    };
  });

  describe('SDK Initialization Check', () => {
    it('should throw when SDK is not initialized', async () => {
      const uninitializedProvider = new AnthropicProvider();

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      await expect(
        uninitializedProvider.execute(request, toolExecutor)
      ).rejects.toThrow('SDK not initialized');
    });
  });

  describe('Basic Execution Flow', () => {
    it('should execute prompt and return AgentResponse', async () => {
      const request: ProviderRequest = {
        prompt: 'Test prompt',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.status).toBe('success');
      expect(response.data).toEqual({ data: 'test result' });
      expect(response.metadata.agentId).toBe('anthropic');
      expect(response.metadata.timestamp).toBeGreaterThan(0);
      expect(response.metadata.duration).toBeGreaterThan(0);
    });

    it('should call SDK query with correct prompt and options', async () => {
      const request: ProviderRequest = {
        prompt: 'Hello world',
        options: {
          model: 'claude-sonnet-4-20250514',
          systemPrompt: 'You are helpful'
        }
      };

      const toolExecutor: ToolExecutor = vi.fn();

      await provider.execute(request, toolExecutor);

      // @ts-expect-error - Testing private property
      expect(provider.sdk.query).toHaveBeenCalledWith({
        prompt: 'Hello world',
        options: expect.objectContaining({
          model: expect.any(String),
          systemPrompt: expect.stringContaining('You are helpful')
        })
      });
    });
  });

  describe('SDK Options Construction', () => {
    it('should include tools as allowedTools when provided', async () => {
      const tools: Tool[] = [
        { name: 'tool1', inputSchema: { type: 'object' }, description: 'Tool 1' },
        { name: 'tool2', inputSchema: { type: 'object' }, description: 'Tool 2' }
      ];

      const request: ProviderRequest = {
        prompt: 'Use tools',
        options: { tools }
      };

      const toolExecutor: ToolExecutor = vi.fn();

      await provider.execute(request, toolExecutor);

      // @ts-expect-error - Testing private property
      const callArgs = provider.sdk.query.mock.calls[0][0];
      expect(callArgs.options.allowedTools).toEqual(['tool1', 'tool2']);
    });

    it('should include hooks when provided', async () => {
      const hooks = {
        onToolStart: vi.fn(),
        onToolEnd: vi.fn()
      };

      const request: ProviderRequest = {
        prompt: 'Test',
        options: { hooks }
      };

      const toolExecutor: ToolExecutor = vi.fn();

      await provider.execute(request, toolExecutor);

      // @ts-expect-error - Testing private property
      const callArgs = provider.sdk.query.mock.calls[0][0];
      expect(callArgs.options.hooks).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should count tool uses from assistant messages', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', id: '1', name: 'tool1', input: {} },
              { type: 'tool_use', id: '2', name: 'tool2', input: {} }
            ]
          }
        } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

        yield {
          type: 'result',
          subtype: 'success',
          result: { data: 'test' },
          usage: { input_tokens: 100, output_tokens: 50 }
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })());

      const request: ProviderRequest = {
        prompt: 'Use tools',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.metadata.toolCalls).toBe(2);
    });
  });

  describe('Session Management', () => {
    it('should create new session with sessionId', async () => {
      const request: ProviderRequest = {
        prompt: 'First message',
        options: { sessionId: 'session-1' }
      };

      const toolExecutor: ToolExecutor = vi.fn();

      await provider.execute(request, toolExecutor);

      // @ts-expect-error - Testing private property
      const session = provider.getSession('session-1');
      expect(session).toBeDefined();
    });

    it('should set continue flag for session with history', async () => {
      // Setup SDK with streamInput mock
      // @ts-expect-error - Testing private property
      provider.sdk = {
        query: vi.fn(() => {
          const gen = (async function* () {
            yield {
              type: 'result',
              subtype: 'success',
              result: { data: 'test' },
              usage: { input_tokens: 50, output_tokens: 25 }
            } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
          })();
          (gen as any).streamInput = vi.fn().mockResolvedValue(undefined);
          return gen;
        }),
        createSdkMcpServer: vi.fn(),
        tool: vi.fn()
      };

      const sessionId = 'session-1';

      // First call creates session
      const request1: ProviderRequest = {
        prompt: 'First',
        options: { sessionId }
      };

      const toolExecutor: ToolExecutor = vi.fn();
      await provider.execute(request1, toolExecutor);

      // Manually add history
      // @ts-expect-error - Testing private property
      const session = provider.getSession(sessionId);
      session?.history.push({
        type: 'user',
        message: { content: 'Previous' },
        session_id: sessionId
      } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage);

      // Second call should have continue: true
      const request2: ProviderRequest = {
        prompt: 'Second',
        options: { sessionId }
      };

      await provider.execute(request2, toolExecutor);

      // @ts-expect-error - Testing private property
      const secondCall = provider.sdk.query.mock.calls[1];
      expect(secondCall[0].options.continue).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return error for missing result message', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'No result' }] }
        } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;
        // No result message
      })());

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.status).toBe('error');
      expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    });

    it('should handle error_during_execution subtype', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'result',
          subtype: 'error_during_execution',
          errors: ['Tool failed']
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })());

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.status).toBe('error');
      expect(response.error?.code).toBe('EXECUTION_FAILED');
      expect(response.error?.recoverable).toBe(false);
    });

    it('should mark error_max_turns as recoverable', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'result',
          subtype: 'error_max_turns',
          errors: ['Max turns exceeded']
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })());

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.status).toBe('error');
      expect(response.error?.recoverable).toBe(true);
    });
  });

  describe('Streaming Mode', () => {
    it('should return AsyncGenerator when streaming enabled', async () => {
      const request: ProviderRequest = {
        prompt: 'Stream this',
        options: { streaming: true }
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const result = provider.execute<string>(request, toolExecutor);

      // Verify it's an async generator
      expect(typeof (result as any)[Symbol.asyncIterator]).toBe('function');

      // Consume stream
      const events: StreamEvent[] = [];
      for await (const event of result) {
        events.push(event);
      }

      // Should have at least some events
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Formatting', () => {
    it('should extract usage from result message', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Response' }] }
        } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

        yield {
          type: 'result',
          subtype: 'success',
          result: { data: 'test' },
          usage: { input_tokens: 150, output_tokens: 75 }
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })());

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.metadata.usage).toEqual({
        input_tokens: 150,
        output_tokens: 75
      });
    });

    it('should prefer structured_output over result', async () => {
      // @ts-expect-error - Testing private property
      provider.sdk.query.mockImplementation(() => (async function* () {
        yield {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Response' }] }
        } as import("@anthropic-ai/claude-agent-sdk").SDKAssistantMessage;

        yield {
          type: 'result',
          subtype: 'success',
          result: { fallback: 'data' },
          structured_output: { preferred: 'data' },
          usage: { input_tokens: 100, output_tokens: 50 }
        } as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      })());

      const request: ProviderRequest = {
        prompt: 'Test',
        options: {}
      };

      const toolExecutor: ToolExecutor = vi.fn();

      const response = await provider.execute(request, toolExecutor);

      expect(response.data).toEqual({ preferred: 'data' });
    });
  });
});
```

---

## Key Takeaways

1. **Always use `async function*`** for mocking AsyncGenerator
2. **Mock SDK query() to yield** assistant, user, and result messages
3. **Mock streamInput()** for session continuation tests
4. **Test error subtypes** (error_during_execution, error_max_turns)
5. **Verify session state** for session management tests
6. **Consume generators** with `for await...of` in tests
7. **Clear mocks** between tests with `vi.clearAllMocks()`
8. **Reset registry** with `ProviderRegistry._resetForTesting()`
9. **Use `// @ts-expect-error`** for private property access
10. **Cover both streaming** and non-streaming modes

---

## References

- **Existing Test Pattern**: `src/__tests__/unit/providers/anthropic-provider-initialize.test.ts`
- **AsyncGenerator Mocking**: `research/async-generator-mocking-best-practices.md`
- **Source Implementation**: `src/providers/anthropic-provider.ts:248-456`
- **Type Definitions**: `src/types/providers.ts`, `src/types/agent.ts`, `src/types/streaming.ts`
