# External Testing Patterns Research

**Task:** P5.M2.T1.S1 - Research external best practices for testing provider-agent integration patterns

**Date:** 2025-01-26

## Executive Summary

This document compiles external best practices for testing provider-agent integration patterns, focusing on Vitest integration testing, LLM provider mocking patterns, tool calling flows, and caching/state management. The research is based on official documentation patterns, community best practices, and analysis of the existing groundswell codebase.

**Sources:**
- Official Vitest Documentation: https://vitest.dev/guide/
- Vitest Mocking Guide: https://vitest.dev/guide/mocking.html
- Anthropic API Documentation: https://docs.anthropic.com/en/api/messages
- Anthropic SDK Testing Patterns: https://github.com/anthropics/anthropic-sdk-typescript

---

## 1. Vitest Integration Testing Best Practices

### 1.1 Integration vs Unit Testing in Vitest

**Key Principle:** Integration tests should verify the interaction between components while minimizing external dependencies.

**File Organization Pattern:**
```
src/__tests__/
├── unit/                    # Isolated unit tests
│   ├── providers/
│   └── utils/
├── integration/             # Component integration tests
│   ├── agent-workflow.test.ts
│   └── bidirectional-consistency.test.ts
└── e2e/                     # End-to-end tests (future)
```

**Current groundswell implementation follows this pattern:**
- Unit tests in `src/__tests__/unit/`
- Integration tests in `src/__tests__/integration/`
- Clear separation by functionality

### 1.2 Environment Setup

**Best Practice Configuration:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include test files
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx'
    ],

    // Enable global test APIs (describe, it, expect without imports)
    globals: true,

    // Test environment (node for backend, jsdom for frontend)
    environment: 'node',

    // Setup files for global test utilities
    setupFiles: [],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  esbuild: {
    target: 'node18',
  },
});
```

### 1.3 Test Organization Patterns

**Pattern 1: Group by Functionality**
```typescript
describe('AnthropicProvider', () => {
  describe('initialize()', () => {
    it('should load SDK on first call', async () => { ... });
    it('should be idempotent', async () => { ... });
  });

  describe('execute()', () => {
    it('should handle streaming mode', async () => { ... });
    it('should handle non-streaming mode', async () => { ... });
  });
});
```

**Pattern 2: Arrange-Act-Assert (AAA)**
```typescript
it('should create session when sessionId is provided', async () => {
  // Arrange
  const provider = new AnthropicProvider();
  await provider.initialize();
  const sessionId = 'test-session';

  // Act
  provider.createSession(sessionId);

  // Assert
  expect(provider.getSession(sessionId)).toBeDefined();
});
```

**Pattern 3: Setup/Teardown with Hooks**
```typescript
describe('ProviderRegistry', () => {
  beforeEach(() => {
    // Reset singleton state before each test
    ProviderRegistry._resetForTesting();
  });

  afterEach(() => {
    // Cleanup after each test
    ProviderRegistry._resetForTesting();
  });
});
```

### 1.4 Testing Async Flows

**Pattern 1: Promise-based async tests**
```typescript
it('should initialize provider asynchronously', async () => {
  const provider = new AnthropicProvider();

  // Use await for async operations
  await provider.initialize();

  // Verify side effects
  // @ts-expect-error - Testing private property
  expect(provider.sdk).not.toBeNull();
});
```

**Pattern 2: AsyncGenerator (streaming) tests**
```typescript
it('should yield stream events in correct order', async () => {
  const provider = new AnthropicProvider();
  await provider.initialize();

  const mockToolExecutor = async () => ({ content: '', isError: false });
  const request: ProviderRequest = {
    prompt: 'test',
    options: { streaming: true }
  };

  // executeStreaming returns AsyncGenerator<StreamEvent>
  const generator = await provider.execute(
    request,
    mockToolExecutor
  ) as AsyncGenerator<StreamEvent>;

  const events: StreamEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }

  // Verify event sequence
  expect(events[0].type).toBe('metadata');
  expect(events[events.length - 1].type).toBe('done');
});
```

**Pattern 3: Concurrent async operations**
```typescript
it('should handle multiple concurrent requests', async () => {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // Execute multiple requests concurrently
  const results = await Promise.all([
    provider.execute({ prompt: 'test1', options: {} }, mockToolExecutor),
    provider.execute({ prompt: 'test2', options: {} }, mockToolExecutor),
    provider.execute({ prompt: 'test3', options: {} }, mockToolExecutor),
  ]);

  expect(results).toHaveLength(3);
});
```

**Pattern 4: Error handling in async tests**
```typescript
it('should throw when SDK not initialized', async () => {
  const provider = new AnthropicProvider();

  // Use rejects.toThrow for async errors
  await expect(provider.execute(
    { prompt: 'test', options: {} },
    mockToolExecutor
  )).rejects.toThrow('SDK not initialized');
});
```

### 1.5 Mocking External Dependencies

**Pattern 1: Mocking SDK modules with vi.mock()**
```typescript
// Mock the Anthropic SDK at module level
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { AnthropicProvider } from '../anthropic-provider.js';

describe('AnthropicProvider with mocked SDK', () => {
  it('should call SDK query with correct parameters', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    // Verify behavior with mocked SDK
    // ...
  });
});
```

**Pattern 2: Mocking function implementations**
```typescript
it('should handle tool execution failures', async () => {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // Mock tool executor to simulate failure
  const failingToolExecutor = vi.fn().mockResolvedValue({
    content: 'Tool failed',
    isError: true,
  });

  const result = await provider.execute(
    { prompt: 'test', options: { tools: [] } },
    failingToolExecutor
  );

  expect(result.status).toBe('error');
});
```

**Pattern 3: Spying on function calls**
```typescript
it('should call tool executor for each tool use', async () => {
  const provider = new AnthropicProvider();
  await provider.initialize();

  const toolExecutor = vi.fn().mockResolvedValue({
    content: 'Success',
    isError: false,
  });

  await provider.execute(
    { prompt: 'test', options: { tools: mockTools } },
    toolExecutor
  );

  // Verify tool executor was called
  expect(toolExecutor).toHaveBeenCalled();
  expect(toolExecutor.mock.calls).toHaveLength(expectedCallCount);
});
```

**Pattern 4: Partial mocking with vi.spyOn()**
```typescript
it('should track cache hits and misses', async () => {
  const cache = new LLMCache({ maxItems: 10 });

  // Spy on cache methods
  const getSpy = vi.spyOn(cache, 'get');
  const setSpy = vi.spyOn(cache, 'set');

  await cache.set('key', 'value');
  await cache.get('key');

  expect(getSpy).toHaveBeenCalledWith('key');
  expect(setSpy).toHaveBeenCalledWith('key', 'value');
});
```

---

## 2. Testing Agent-Provider Patterns

### 2.1 Provider Interface Testing

**Pattern: Contract-based testing**
```typescript
describe('Provider Interface Compliance', () => {
  it('should implement all required Provider methods', () => {
    const provider = new AnthropicProvider();

    expect(typeof provider.initialize).toBe('function');
    expect(typeof provider.terminate).toBe('function');
    expect(typeof provider.execute).toBe('function');
    expect(typeof provider.registerMCPs).toBe('function');
    expect(typeof provider.loadSkills).toBe('function');
    expect(typeof provider.normalizeModel).toBe('function');
  });

  it('should have correct readonly properties', () => {
    const provider = new AnthropicProvider();

    expect(provider.id).toBe('anthropic');
    expect(provider.capabilities).toMatchObject({
      mcp: true,
      skills: true,
      lsp: true,
      streaming: true,
      sessions: true,
      extendedThinking: true,
    });
  });
});
```

### 2.2 LLM Provider Mocking Patterns

**Pattern 1: SDK Response Mocking**
```typescript
// Mock SDK query response
const mockSDKResponse = {
  type: 'result',
  subtype: 'success',
  result: 'Test response',
  usage: { input_tokens: 10, output_tokens: 20 },
};

// Mock the query function
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(() => ({
    [Symbol.asyncIterator]: async function* () {
      yield mockSDKResponse;
    },
  })),
}));
```

**Pattern 2: Streaming Mock**
```typescript
// Mock streaming SDK response
function createMockStream(messages: any[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const msg of messages) {
        yield msg;
      }
    },
  };
}

// Usage in test
it('should process streaming messages', async () => {
  const mockMessages = [
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Hello' }] } },
    { type: 'result', subtype: 'success', result: 'Final' },
  ];

  const mockStream = createMockStream(mockMessages);
  // Test streaming logic
});
```

**Pattern 3: Tool Call Simulation**
```typescript
const mockToolUseMessage = {
  type: 'assistant',
  message: {
    content: [
      {
        type: 'tool_use',
        id: 'tool-1',
        name: 'test_tool',
        input: { param: 'value' },
      },
    ],
  },
};

const mockToolResultMessage = {
  type: 'user',
  message: {
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'Tool result',
      },
    ],
  },
};
```

### 2.3 Tool Calling Integration Tests

**Pattern 1: End-to-End Tool Flow**
```typescript
describe('Tool Calling Integration', () => {
  it('should execute tool and return result', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    // Register MCP server with tools
    const tools = await provider.registerMCPs([
      {
        name: 'test-server',
        transport: 'inprocess',
        tools: [
          {
            name: 'add_numbers',
            description: 'Add two numbers',
            input_schema: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['a', 'b'],
            },
          },
        ],
      },
    ]);

    // Mock tool executor
    const toolExecutor = vi.fn().mockImplementation(async (req) => {
      if (req.name === 'test-server__add_numbers') {
        return {
          content: String(req.input.a + req.input.b),
          isError: false,
        };
      }
      return { content: '', isError: true };
    });

    // Execute with tools
    const result = await provider.execute(
      {
        prompt: 'What is 2 + 3?',
        options: { tools },
      },
      toolExecutor
    );

    // Verify tool was called
    expect(toolExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-server__add_numbers',
        input: { a: 2, b: 3 },
      })
    );

    expect(result.status).toBe('success');
  });
});
```

**Pattern 2: Multi-Tool Calling**
```typescript
it('should handle multiple tool calls in sequence', async () => {
  const toolExecutor = vi.fn()
    .mockResolvedValueOnce({ content: '5', isError: false })
    .mockResolvedValueOnce({ content: '10', isError: false });

  const result = await provider.execute(
    {
      prompt: 'Add 2+3 and then 4+6',
      options: { tools: mockTools },
    },
    toolExecutor
  );

  expect(toolExecutor).toHaveBeenCalledTimes(2);
});
```

**Pattern 3: Tool Error Handling**
```typescript
it('should handle tool execution errors', async () => {
  const toolExecutor = vi.fn().mockResolvedValue({
    content: 'Tool failed',
    isError: true,
  });

  const result = await provider.execute(
    {
      prompt: 'Use a failing tool',
      options: { tools: mockTools },
    },
    toolExecutor
  );

  // Verify error is handled appropriately
  expect(result.status).toBe('success'); // SDK continues after tool errors
  // Or expect specific error handling behavior
});
```

### 2.4 Anthropic SDK Specific Patterns

**Pattern 1: Session Continuation**
```typescript
describe('Session Continuation', () => {
  it('should use streamInput for session continuation', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    const sessionId = 'test-session';
    provider.createSession(sessionId);

    // Mock SDK query with streamInput support
    const mockQuery = vi.fn(() => mockStream);

    // Execute first message
    await provider.execute(
      { prompt: 'First message', options: { sessionId } },
      mockToolExecutor
    );

    // Execute second message (continuation)
    await provider.execute(
      { prompt: 'Second message', options: { sessionId } },
      mockToolExecutor
    );

    // Verify session history was maintained
    const session = provider.getSession(sessionId);
    expect(session?.history.length).toBeGreaterThan(0);
  });
});
```

**Pattern 2: Hook Testing**
```typescript
describe('Provider Hooks', () => {
  it('should call onToolStart hook before tool execution', async () => {
    const onToolStart = vi.fn();
    const hooks = { onToolStart };

    await provider.execute(
      { prompt: 'test', options: { tools: mockTools } },
      mockToolExecutor,
      hooks
    );

    expect(onToolStart).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.any(String),
        input: expect.any(Object),
      })
    );
  });
});
```

---

## 3. Testing Caching and State Management

### 3.1 Cache Testing Patterns

**Pattern 1: Basic Cache Operations**
```typescript
describe('LLMCache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache({ maxItems: 10 });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { data: 'test' });
      const result = await cache.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return undefined for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });
});
```

**Pattern 2: Cache Metrics Testing**
```typescript
describe('Cache Metrics', () => {
  it('should track hits and misses', async () => {
    const cache = new LLMCache({ maxItems: 10 });

    await cache.set('key1', 'value1');

    await cache.get('key1'); // hit
    await cache.get('key1'); // hit
    await cache.get('key2'); // miss

    const metrics = cache.metrics();
    expect(metrics.hits).toBe(2);
    expect(metrics.misses).toBe(1);
    expect(metrics.hitRate).toBeCloseTo(66.67, 0);
  });
});
```

**Pattern 3: Cache Eviction Testing**
```typescript
describe('LRU Eviction', () => {
  it('should evict least recently used items', async () => {
    const cache = new LLMCache({ maxItems: 3 });

    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');
    await cache.set('key4', 'value4'); // Evicts key1

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key4')).toBe(true);
  });

  it('should update LRU order on access', async () => {
    const cache = new LLMCache({ maxItems: 3 });

    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');

    await cache.get('key1'); // Make key1 recent

    await cache.set('key4', 'value4'); // Evicts key2

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });
});
```

**Pattern 4: Prefix-Based Cache Busting**
```typescript
describe('Cache Busting', () => {
  it('should bust all keys with prefix', async () => {
    const cache = new LLMCache({ maxItems: 10 });

    await cache.set('key1', 'value1', { prefix: 'group-a' });
    await cache.set('key2', 'value2', { prefix: 'group-a' });
    await cache.set('key3', 'value3', { prefix: 'group-b' });

    await cache.bustPrefix('group-a');

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
  });
});
```

### 3.2 Session State Testing

**Pattern 1: Session Creation and Retrieval**
```typescript
describe('Session State', () => {
  it('should create session with empty state', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    provider.createSession('test-session');

    const session = provider.getSession('test-session');
    expect(session).toBeDefined();
    expect(session?.history).toEqual([]);
    expect(session?.lastResult).toBeNull();
  });
});
```

**Pattern 2: Session History Tracking**
```typescript
describe('Session History', () => {
  it('should accumulate messages in session history', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    provider.createSession('chat-session');

    // Simulate message accumulation during execute()
    const mockUserMessage = {
      type: 'user',
      message: { content: 'Hello' },
      parent_tool_use_id: null,
      session_id: 'test-id',
    } as any;

    // @ts-expect-error - Testing private property
    provider.sessions.get('chat-session').history.push(mockUserMessage);

    const session = provider.getSession('chat-session');
    expect(session?.history).toHaveLength(1);
    expect(session?.history[0]).toEqual(mockUserMessage);
  });
});
```

**Pattern 3: Session Isolation**
```typescript
describe('Session Isolation', () => {
  it('should maintain separate histories for different sessions', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize();

    provider.createSession('session-a');
    provider.createSession('session-b');

    // Add different histories
    // @ts-expect-error - Testing private property
    provider.sessions.get('session-a').history.push({ type: 'user', message: { content: 'A' } } as any);
    // @ts-expect-error - Testing private property
    provider.sessions.get('session-b').history.push({ type: 'user', message: { content: 'B' } } as any);

    const sessionA = provider.getSession('session-a');
    const sessionB = provider.getSession('session-b');

    expect(sessionA?.history[0].message.content).toBe('A');
    expect(sessionB?.history[0].message.content).toBe('B');
  });
});
```

### 3.3 State Reset Between Tests

**Pattern 1: Singleton Reset Pattern**
```typescript
describe('ProviderRegistry', () => {
  beforeEach(() => {
    // Reset singleton before each test
    ProviderRegistry._resetForTesting();
  });

  afterEach(() => {
    // Clean up after each test
    ProviderRegistry._resetForTesting();
  });

  it('should start with fresh state', () => {
    const registry = ProviderRegistry.getInstance();
    // Test with clean state
  });
});
```

**Pattern 2: Cache Reset Pattern**
```typescript
describe('Cache Operations', () => {
  let cache: LLMCache;

  beforeEach(() => {
    // Fresh cache for each test
    cache = new LLMCache({ maxItems: 10 });
  });

  it('should have empty state', () => {
    expect(cache.size).toBe(0);
    expect(cache.metrics().hits).toBe(0);
  });
});
```

**Pattern 3: Provider Reset Pattern**
```typescript
describe('Provider Lifecycle', () => {
  let provider: AnthropicProvider;

  beforeEach(async () => {
    provider = new AnthropicProvider();
    await provider.initialize();
  });

  afterEach(async () => {
    await provider.terminate();
  });

  it('should maintain clean state', async () => {
    // Test with clean provider state
  });
});
```

---

## 4. Integration Test Patterns for Agent-Provider

### 4.1 Agent-Provider Integration

**Pattern: Full Provider Flow**
```typescript
describe('Agent-Provider Integration', () => {
  it('should execute agent prompt through provider', async () => {
    // Setup
    const registry = ProviderRegistry.getInstance();
    const provider = new AnthropicProvider();
    registry.register(provider);
    await registry.initializeProvider('anthropic', { apiKey: 'test-key' });

    // Execute
    const toolExecutor = vi.fn().mockResolvedValue({
      content: 'Result',
      isError: false,
    });

    const result = await provider.execute(
      { prompt: 'Hello, Claude!', options: {} },
      toolExecutor
    );

    // Verify
    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });
});
```

### 4.2 Workflow Integration

**Pattern from groundswell codebase:**
```typescript
describe('Agent-Workflow Integration', () => {
  it('should establish context in @Step decorated methods', async () => {
    const workflow = new MockAgentWorkflow('TestWorkflow');
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);
    await workflow.run();

    expect(events.filter((e) => e.type === 'stepStart')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'stepEnd')).toHaveLength(2);
  });
});
```

---

## 5. Best Practices Summary

### 5.1 Test Organization

1. **Separate unit and integration tests** into different directories
2. **Use describe blocks** to group related tests
3. **Follow AAA pattern** (Arrange-Act-Assert) for clarity
4. **Use descriptive test names** that explain what is being tested

### 5.2 Mocking Strategy

1. **Mock at boundaries** - Mock external SDKs, not internal logic
2. **Use vi.mock()** for module-level mocking
3. **Use vi.fn()** for function-level mocking
4. **Avoid over-mocking** - Only mock what's necessary for the test

### 5.3 Async Testing

1. **Always use async/await** for promise-based tests
2. **Test async generators** with for-await loops
3. **Handle errors** with rejects.toThrow()
4. **Test timeouts** appropriately for slow operations

### 5.4 State Management

1. **Reset state between tests** using beforeEach/afterEach
2. **Test isolation** - ensure tests don't depend on each other
3. **Clean up resources** in teardown hooks
4. **Use testing utilities** like _resetForTesting() for singletons

### 5.5 Cache Testing

1. **Test hit/miss behavior** explicitly
2. **Verify metrics** are tracked correctly
3. **Test eviction** policies (LRU, etc.)
4. **Test prefix-based operations** for cache busting

### 5.6 Session Testing

1. **Test creation** of new sessions
2. **Test retrieval** of existing sessions
3. **Test isolation** between sessions
4. **Test cleanup** on termination

---

## 6. Code Examples from Groundswell

### 6.1 Existing Test Patterns

**Session Storage Test Pattern:**
```typescript
// File: src/__tests__/unit/providers/anthropic-provider-sessions.test.ts

describe('AnthropicProvider - Session Storage', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    ProviderRegistry._resetForTesting();
  });

  it('should create a new session with empty state', async () => {
    await provider.initialize();
    provider.createSession('test-session');

    // @ts-expect-error - Testing private property
    expect(provider.sessions.has('test-session')).toBe(true);
  });
});
```

**Cache Test Pattern:**
```typescript
// File: src/__tests__/unit/cache.test.ts

describe('LLMCache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache({ maxItems: 10 });
  });

  it('should track hits and misses', async () => {
    await cache.set('key1', 'value1');
    await cache.get('key1'); // hit
    await cache.get('key1'); // hit
    await cache.get('key2'); // miss

    const metrics = cache.metrics();
    expect(metrics.hits).toBe(2);
    expect(metrics.misses).toBe(1);
  });
});
```

**Provider Registry Test Pattern:**
```typescript
// File: src/__tests__/unit/providers/provider-registry.test.ts

describe('ProviderRegistry', () => {
  beforeEach(() => {
    ProviderRegistry._resetForTesting();
  });

  it('should register and retrieve providers', () => {
    const registry = ProviderRegistry.getInstance();
    const provider = new AnthropicProvider();

    registry.register(provider);
    expect(registry.get('anthropic')).toBe(provider);
  });
});
```

---

## 7. Recommended Testing Strategy for P5.M2

### 7.1 Provider-Agent Integration Tests

**Test Coverage Goals:**
1. Mock Anthropic SDK for isolated testing
2. Test tool calling flows end-to-end
3. Test session state management
4. Test streaming mode event sequences
5. Test error handling and recovery

**Test File Structure:**
```
src/__tests__/integration/
├── provider-agent-integration.test.ts
├── tool-calling-flow.test.ts
└── session-management.test.ts
```

### 7.2 Mock Implementation Template

```typescript
// Mock Anthropic SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  const mockQuery = vi.fn();

  return {
    query: mockQuery,
    // Add other SDK exports as needed
  };
});

// Helper to create mock streams
function createMockSDKStream(messages: any[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield* messages;
    },
    streamInput: vi.fn(),
  };
}
```

### 7.3 Test Data Templates

```typescript
// Mock tool definitions
const mockTools: Tool[] = [
  {
    name: 'test_server__add_numbers',
    description: 'Add two numbers',
    input_schema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
  },
];

// Mock SDK messages
const mockAssistantMessage = {
  type: 'assistant',
  message: {
    content: [
      { type: 'text', text: 'I will add those numbers.' },
      {
        type: 'tool_use',
        id: 'tool-1',
        name: 'test_server__add_numbers',
        input: { a: 2, b: 3 },
      },
    ],
  },
};

const mockResultMessage = {
  type: 'result',
  subtype: 'success',
  result: 'The sum is 5',
  usage: { input_tokens: 20, output_tokens: 10 },
};
```

---

## 8. References and Resources

### Official Documentation
- **Vitest Guide:** https://vitest.dev/guide/
- **Vitest Mocking:** https://vitest.dev/guide/mocking.html
- **Vitest API:** https://vitest.dev/api/
- **Anthropic Messages API:** https://docs.anthropic.com/en/api/messages
- **Anthropic Tool Use:** https://docs.anthropic.com/en/api/tool-use

### Community Resources
- **Vitest Examples:** https://github.com/vitest-dev/vitest/tree/main/examples
- **Testing Library:** https://testing-library.com/
- **Async Testing Patterns:** https://jestjs.io/docs/asynchronous

### Groundswell Internal
- **Existing Tests:** `src/__tests__/`
- **Provider Implementations:** `src/providers/`
- **Type Definitions:** `src/types/providers.ts`
- **Cache Implementation:** `src/cache/cache.ts`

---

## 9. Next Steps

1. **Implement SDK mocking layer** for isolated provider testing
2. **Create integration test suite** for provider-agent flows
3. **Add tool calling E2E tests** with realistic scenarios
4. **Test session management** across multiple operations
5. **Verify streaming behavior** with comprehensive event tests
6. **Document test utilities** for future test development

---

**Document Status:** Complete
**Last Updated:** 2025-01-26
**Author:** Research Agent (P5.M2.T1.S1)
