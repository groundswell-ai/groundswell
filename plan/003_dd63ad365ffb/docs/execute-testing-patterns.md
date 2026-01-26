# Execute() Testing Patterns - AnthropicProvider

**Project:** Groundswell
**Date:** 2026-01-26
**Component:** AnthropicProvider.execute() method
**Test File:** `src/__tests__/unit/providers/anthropic-provider-execute.test.ts`

---

## Executive Summary

This document summarizes the testing patterns and best practices for testing the `AnthropicProvider.execute()` method, which is responsible for executing prompts via the Anthropic Agent SDK with support for streaming, sessions, tool execution, and error handling.

**Key Finding:** The execute() method has complex behavior with multiple execution paths (normal vs streaming), session management, and AsyncGenerator mocking requirements. This document provides proven patterns for testing all scenarios.

---

## Test File Structure

### Describe Block Organization

```typescript
describe('AnthropicProvider - execute()', () => {
  let provider: AnthropicProvider;
  let toolExecutor: ToolExecutor;

  beforeEach(() => {
    provider = new AnthropicProvider();
    ProviderRegistry._resetForTesting();
    vi.clearAllMocks();
    toolExecutor = vi.fn().mockResolvedValue({
      content: 'Tool result',
      isError: false,
    });
  });

  describe('SDK Initialization Check', () => { /* ... */ });
  describe('Basic Execution Flow', () => { /* ... */ });
  describe('SDK Options Construction', () => { /* ... */ });
  describe('Tool Execution', () => { /* ... */ });
  describe('Message Iteration', () => { /* ... */ });
  describe('Session Management', () => { /* ... */ });
  describe('Response Formatting', () => { /* ... */ });
  describe('Error Handling', () => { /* ... */ });
  describe('Streaming Mode', () => { /* ... */ });
  describe('AsyncGenerator Mocking Patterns', () => { /* ... */ });
});
```

---

## Core Mocking Patterns

### 1. Basic SDK Mock with AsyncGenerator

The most common pattern for mocking the SDK query() method:

```typescript
beforeEach(async () => {
  await provider.initialize();

  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn().mockImplementation(({ prompt, options }) => {
      return (async function* () {
        yield {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Hello world' }]
          }
        };

        yield {
          type: 'result',
          subtype: 'success',
          result: { data: 'test result' },
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      })();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };
});
```

**Gotchas:**
- Must use `async function*` syntax for the generator
- The generator must yield at least one `type: 'result'` message
- `usage` is optional but recommended for testing metadata

### 2. SDK Mock with streamInput for Session Continuation

For testing session continuation (when a session already has history):

```typescript
// @ts-expect-error - Testing private property
provider.sdk.query = vi.fn().mockImplementation(({ prompt, options }) => {
  const mockGenerator = (async function* () {
    yield {
      type: 'result',
      subtype: 'success',
      result: { data: 'test' },
      usage: { input_tokens: 100, output_tokens: 50 }
    };
  })();

  // Add streamInput mock for session continuation
  mockGenerator.streamInput = vi.fn().mockResolvedValue(undefined);

  return mockGenerator;
});
```

**Gotchas:**
- streamInput must be added to the generator object after creation
- streamInput should be a mock that resolves to undefined

---

## Test Scenarios by Category

### 1. SDK Initialization Check Tests

Verify that execute() throws when SDK is not initialized:

```typescript
it('should throw error when SDK is not initialized', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  await expect(provider.execute(request, toolExecutor))
    .rejects.toThrow('SDK not initialized. Call initialize() first.');
});
```

### 2. Basic Execution Flow Tests

Test simple prompt execution:

```typescript
it('should execute prompt and return AgentResponse', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('success');
  expect(response.data).toBeDefined();
  expect(response.metadata.agentId).toBe('anthropic');
  expect(response.metadata.timestamp).toBeGreaterThan(0);
  expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
});
```

**Gotchas:**
- Duration may be 0 in tests because mocks execute instantly
- Use `toBeGreaterThanOrEqual(0)` instead of `toBeGreaterThan(0)`

### 3. SDK Options Construction Tests

Verify that SDK query() is called with correct options:

```typescript
it('should map tools to allowedTools array', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {
      tools: [
        { name: 'test_tool', inputSchema: { type: 'object' }, description: 'Test tool' },
        { name: 'another_tool', inputSchema: { type: 'object' }, description: 'Another tool' }
      ]
    }
  };

  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const queryCall = provider.sdk.query.mock.calls[0];
  expect(queryCall[0].options.allowedTools).toEqual(['test_tool', 'another_tool']);
});
```

**Important:** Options are conditional - only included when not empty:
- `allowedTools` - only included when tools array is not empty
- `hooks` - only included when hooks object has keys
- `mcpServers` - only included when mcpServerConfig is set
- `continue` - only included when isContinuation is true

### 4. Tool Execution Tests

Test tool use counting (provider doesn't execute tools, SDK does):

```typescript
it('should count tool_use blocks in assistant messages', async () => {
  // @ts-expect-error - Testing private property
  provider.sdk.query = vi.fn().mockImplementation(({ prompt, options }) => {
    return (async function* () {
      yield {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'test_tool', input: {} },
            { type: 'tool_use', id: 'tool-2', name: 'another_tool', input: {} }
          ]
        }
      };

      yield {
        type: 'result',
        subtype: 'success',
        result: { done: true },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
  });

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.metadata.toolCalls).toBe(2);
});
```

### 5. Session Management Tests

Test session creation and continuation:

```typescript
it('should create new session on first execute with sessionId', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { sessionId: 'test-session' }
  };

  await provider.execute(request, toolExecutor);

  // @ts-expect-error - Testing private property
  const session = provider.getSession('test-session');

  expect(session).toBeDefined();
  expect(session?.history).toBeDefined();
  expect(Array.isArray(session?.history)).toBe(true);
});

it('should detect continuation and call streamInput', async () => {
  const sessionId = 'continuation-session';

  // First execution to create session with history
  // @ts-expect-error - Testing private property
  provider.sdk.query.mockImplementation(() => {
    const gen = (async function* () {
      yield {
        type: 'user',
        message: { content: 'First' }
      };

      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'first' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
    gen.streamInput = vi.fn().mockResolvedValue(undefined);
    return gen;
  });

  await provider.execute({
    prompt: 'First',
    options: { sessionId }
  }, toolExecutor);

  // Verify session has history
  // @ts-expect-error - Testing private property
  let session = provider.getSession(sessionId);
  expect(session?.history.length).toBeGreaterThan(0);

  // Second execution - mock to track streamInput calls
  let streamInputCallCount = 0;
  // @ts-expect-error - Testing private property
  provider.sdk.query.mockImplementation(() => {
    const gen = (async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        result: { data: 'second' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
    gen.streamInput = vi.fn().mockImplementation(async () => {
      streamInputCallCount++;
    });
    return gen;
  });

  await provider.execute({
    prompt: 'Second',
    options: { sessionId }
  }, toolExecutor);

  // Should have called streamInput twice (history + new message)
  expect(streamInputCallCount).toBe(2);
});
```

**Gotchas:**
- Session continuation requires BOTH `continue: true` in options AND `streamInput()` calls
- The implementation calls `streamInput()` twice for continuation: once for history, once for the new message
- Session creation is lazy - only created when sessionId is provided

### 6. Response Formatting Tests

Test AgentResponse construction:

```typescript
it('should prefer structured_output over result', async () => {
  // @ts-expect-error - Testing private property
  provider.sdk.query = vi.fn().mockImplementation(({ prompt, options }) => {
    return (async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        structured_output: { from: 'structured_output' },
        result: { from: 'result' },
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
  });

  const request: ProviderRequest = {
    prompt: 'Test',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.data).toEqual({ from: 'structured_output' });
});

it('should extract usage information', async () => {
  const request: ProviderRequest = {
    prompt: 'Test',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.metadata.usage).toBeDefined();
  expect(response.metadata.usage?.input_tokens).toBe(100);
  expect(response.metadata.usage?.output_tokens).toBe(50);
});
```

### 7. Error Handling Tests

Test error scenarios:

```typescript
it('should return error response when result message is missing', async () => {
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn().mockImplementation(() => {
      return (async function* () {
        yield {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'No result' }] }
        };
        // Generator ends without result message
      })();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('INVALID_RESPONSE_FORMAT');
  expect(response.error?.recoverable).toBe(false);
});

it('should handle error_during_execution subtype', async () => {
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn().mockImplementation(() => {
      return (async function* () {
        yield {
          type: 'result',
          subtype: 'error_during_execution',
          errors: ['Tool execution failed']
        };
      })();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.code).toBe('EXECUTION_FAILED');
  expect(response.error?.recoverable).toBe(false);
  expect(response.error?.details?.errors).toEqual(['Tool execution failed']);
});

it('should handle error_max_turns subtype as recoverable', async () => {
  // @ts-expect-error - Testing private property
  provider.sdk = {
    query: vi.fn().mockImplementation(() => {
      return (async function* () {
        yield {
          type: 'result',
          subtype: 'error_max_turns',
          errors: ['Max turns exceeded']
        };
      })();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };

  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: {}
  };

  const response = await provider.execute(request, toolExecutor);

  expect(response.status).toBe('error');
  expect(response.error?.recoverable).toBe(true);
  expect(response.error?.details?.subtype).toBe('error_max_turns');
});
```

### 8. Streaming Mode Tests

Test streaming execution (returns AsyncGenerator):

```typescript
it('should return AsyncGenerator when streaming is enabled', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  // execute() returns a Promise that resolves to AsyncGenerator when streaming is enabled
  const result = await provider.execute(request, toolExecutor);

  // Verify result has Symbol.asyncIterator (is AsyncGenerator)
  expect(result).toBeDefined();
  expect(typeof result[Symbol.asyncIterator]).toBe('function');
});

it('should yield StreamEvent objects', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  const streamResult = await provider.execute(request, toolExecutor);
  const stream = streamResult as AsyncGenerator<StreamEvent>;
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  // Should have events (metadata, text_delta, usage, done)
  expect(events.length).toBeGreaterThan(0);

  // Verify event types
  const eventTypes = events.map(e => e.type);
  expect(eventTypes).toContain('metadata');
  expect(eventTypes).toContain('text_delta');
});

it('should yield metadata event first', async () => {
  const request: ProviderRequest = {
    prompt: 'Test prompt',
    options: { streaming: true }
  };

  const streamResult = await provider.execute(request, toolExecutor);
  const stream = streamResult as AsyncGenerator<StreamEvent>;
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  expect(events[0].type).toBe('metadata');
  if (events[0].type === 'metadata') {
    expect(events[0].metadata.provider).toBe('anthropic');
  }
});
```

**Critical Gotcha:** The execute() method is `async`, so when streaming is enabled, it returns a `Promise<AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>>`. You must await the execute() call first to get the AsyncGenerator:

```typescript
// WRONG - stream is not async iterable
const stream = provider.execute(request, toolExecutor) as AsyncGenerator<StreamEvent>;

// CORRECT - await the execute() call first
const streamResult = await provider.execute(request, toolExecutor);
const stream = streamResult as AsyncGenerator<StreamEvent>;
```

---

## Common Gotchas and Solutions

### Gotcha 1: Duration is 0 in Tests

**Problem:** Mock generators execute instantly, so duration is 0.

**Solution:** Use `toBeGreaterThanOrEqual(0)` instead of `toBeGreaterThan(0)`:

```typescript
// BAD: Will fail when duration is 0
expect(response.metadata.duration).toBeGreaterThan(0);

// GOOD: Accepts 0
expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
```

### Gotcha 2: Hooks Property Not Added

**Problem:** The implementation only adds `hooks` to options when `sdkHooks` has keys.

**Solution:** Understand that `buildAgentSDKHooks()` returns an empty object when no actual hooks are implemented. The check `Object.keys(sdkHooks).length > 0` prevents adding empty hooks:

```typescript
// This is the expected behavior
...(Object.keys(sdkHooks).length > 0 && {
  hooks: sdkHooks,
}),
```

### Gotcha 3: Private Property Access

**Problem:** Need to access private `sdk` field for mocking.

**Solution:** Always use `// @ts-expect-error` comments:

```typescript
// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(/* ... */),
  // ...
};
```

### Gotcha 4: Stream Return Type

**Problem:** execute() returns different types based on streaming mode.

**Solution:** Await the execute() call when streaming is enabled:

```typescript
if (request.options.streaming) {
  // Returns AsyncGenerator directly (not in Promise)
  return this.executeStreaming<T>(request, toolExecutor, hooks);
}
// But execute() is async, so this gets wrapped in Promise<AsyncGenerator>

// In tests:
const streamResult = await provider.execute(request, toolExecutor);
const stream = streamResult as AsyncGenerator<StreamEvent>;
```

---

## Mock State Management

### Reset Between Tests

Always reset mocks and registry state between tests:

```typescript
beforeEach(() => {
  provider = new AnthropicProvider();
  // Reset registry state for isolation
  ProviderRegistry._resetForTesting();
  // Clear all mocks
  vi.clearAllMocks();
  // Create mock tool executor
  toolExecutor = vi.fn().mockResolvedValue({
    content: 'Tool result',
    isError: false,
  });
});
```

---

## Test Coverage Checklist

- [x] SDK initialization check (throws when not initialized)
- [x] Simple prompt execution without tools/sessions
- [x] SDK query() construction with correct options
- [x] Model mapping via normalizeModel()
- [x] System prompt injection with buildSystemPromptWithSkills()
- [x] Tools mapping to allowedTools array
- [x] MCP servers inclusion when configured
- [x] Hooks conversion via buildAgentSDKHooks()
- [x] Session continue flag for continuation
- [x] Tool call counting from assistant messages
- [x] Message iteration over AsyncGenerator<SDKMessage>
- [x] Assistant message processing (text, tool_use blocks)
- [x] User message capture for session history
- [x] Result message extraction
- [x] Subtype validation (success vs error subtypes)
- [x] New session creation (lazy creation)
- [x] Session retrieval for existing session
- [x] Session continuation detection
- [x] Session history streaming via streamInput()
- [x] User message accumulation in session.history
- [x] Last result storage in session.lastResult
- [x] Success response with data from structured_output or result
- [x] Error response for missing result message
- [x] Error response for error subtypes (error_during_execution, error_max_turns)
- [x] Usage extraction (input_tokens, output_tokens)
- [x] Duration calculation from start time
- [x] Metadata construction (agentId, timestamp, duration, usage, toolCalls)
- [x] Streaming mode returns AsyncGenerator<StreamEvent>
- [x] StreamEvent types: text_delta, tool_call_start, tool_call_done, usage, done, error
- [x] Final return value is AgentResponse

---

## Test Statistics

- **Total Tests:** 55
- **Test Categories:** 9
- **AsyncGenerator Mock Patterns:** 3
- **Session Management Scenarios:** 6
- **Error Handling Scenarios:** 4
- **Streaming Mode Tests:** 9

---

## Related Documentation

- **AsyncGenerator Mocking:** `research/async-generator-mocking-best-practices.md`
- **AsyncGenerator Quick Reference:** `research/async-generator-mocking-summary.md`
- **Implementation:** `src/providers/anthropic-provider.ts` (lines 248-456)
- **Reference Test Pattern:** `src/__tests__/unit/providers/anthropic-provider-initialize.test.ts`

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Complete
