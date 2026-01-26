# AsyncGenerator Mocking Best Practices for TypeScript/Vitest

**Research Date:** 2026-01-26
**Context:** Groundswell Project - LLM Streaming Response Testing
**Testing Framework:** Vitest
**Language:** TypeScript

---

## Executive Summary

This document provides comprehensive best practices for mocking AsyncGenerator functions in TypeScript tests using Vitest. It draws from existing patterns in the Groundswell codebase and general testing principles.

**Key Finding:** The codebase already demonstrates excellent AsyncGenerator mocking patterns in `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts`.

---

## 1. Core Patterns for Mocking AsyncGenerator

### Pattern 1: Using `vi.fn()` with `async function*` Implementation

**Best Practice:** Use Vitest's `vi.fn()` with an async generator function implementation.

```typescript
import { vi } from 'vitest';

// ✅ CORRECT: Mock AsyncGenerator with vi.fn()
const mockExecute = vi.fn().mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
  yield { type: 'text_delta', delta: ' World' } as StreamEvent;
  yield { type: 'done', finishReason: 'stop' } as StreamEvent;
  return createSuccessResponse(
    { result: 'Hello World' },
    { agentId: 'test-agent', timestamp: Date.now() }
  );
});

// ❌ WRONG: Using regular function
const mockExecute = vi.fn().mockImplementation(function* () {
  // This won't work for async generators
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:42-50`

### Pattern 2: Dynamic Mock Implementation with Captured Values

**Best Practice:** Use mock implementations to capture parameters for assertions.

```typescript
let capturedOptions: any = {};

(anthropicProvider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
  capturedOptions = request.options;
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse(
    { result: 'test' },
    { agentId: 'test', timestamp: Date.now() }
  );
});

// Later assert on captured values
expect(capturedOptions.sessionId).toBeUndefined();
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:307-314`

---

## 2. Testing AsyncGenerator Consumption

### Pattern 3: For-Await Loop Consumption

**Best Practice:** Always consume generators in tests using `for await...of` loops.

```typescript
// ✅ CORRECT: Consume generator with for-await
const { stream } = agent.stream(prompt);
const events: StreamEvent[] = [];

for await (const event of stream) {
  events.push(event);
}

// Assert on collected events
expect(events).toHaveLength(3);
expect(events[0]).toEqual({ type: 'text_delta', delta: 'Open' });

// ❌ WRONG: Not consuming the generator
const { stream } = agent.stream(prompt);
// Generator never executes - no assertions possible
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:478-483`

### Pattern 4: Silent Consumption for Side Effects

**Best Practice:** When you only need to trigger execution (not inspect events), consume silently.

```typescript
// Just consume to trigger execution
for await (const _event of stream) {
  // Just consume
}

// Assert on side effects (e.g., mock calls)
expect(anthropicProvider.execute).toHaveBeenCalled();
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:106-108`

---

## 3. Type Safety for AsyncGenerator Mocks

### Pattern 5: Proper TypeScript Typing

**Best Practice:** Maintain type safety with proper type annotations.

```typescript
// Define types for your stream events
type StreamEvent =
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'done'; finishReason: 'stop' }
  | { type: 'error'; error: Error };

// Mock with proper typing
const mockExecute = vi.fn<
  AsyncGenerator<StreamEvent, AgentResponse<string>, unknown>,
  Parameters<Provider['execute']>
>().mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
  return createSuccessResponse(
    { result: 'Hello' },
    { agentId: 'test', timestamp: Date.now() }
  );
});
```

### Pattern 6: Type Assertions for Mock Implementation

**Best Practice:** Use type assertions when accessing mock internals.

```typescript
// ✅ Use type assertion for mock implementation access
(provider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
  // Implementation
});

// ✅ Or use vi.mocked() (Vitest utility)
import { vi } from 'vitest';
vi.mocked(provider.execute).mockImplementation(async function* () {
  // Implementation
});
```

---

## 4. Common Testing Scenarios

### Scenario 1: Testing Event Sequences

```typescript
it('should stream events in correct order', async () => {
  // Arrange
  const agent = new Agent({ provider: 'anthropic' });
  const prompt = new Prompt({ user: 'test', responseFormat: z.object({ result: z.string() }) });

  // Mock streaming behavior
  const registry = ProviderRegistry.getInstance();
  const provider = registry.get('anthropic')!;

  (provider.execute as any).mockImplementation(async function* () {
    yield { type: 'metadata', metadata: { provider: 'anthropic' } } as StreamEvent;
    yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
    yield { type: 'text_delta', delta: ' World' } as StreamEvent;
    yield { type: 'done', finishReason: 'stop' } as StreamEvent;
    return createSuccessResponse({ result: 'Hello World' }, { agentId: 'test', timestamp: Date.now() });
  });

  vi.clearAllMocks();

  // Act
  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  // Assert: Verify event sequence
  expect(events).toHaveLength(4);
  expect(events[0].type).toBe('metadata');
  expect(events[1]).toEqual({ type: 'text_delta', delta: 'Hello' });
  expect(events[2]).toEqual({ type: 'text_delta', delta: ' World' });
  expect(events[3]).toEqual({ type: 'done', finishReason: 'stop' });
});
```

### Scenario 2: Testing Generator Return Values

```typescript
it('should return final AgentResponse from generator', async () => {
  // Arrange
  const mockResponse = createSuccessResponse(
    { result: 'final result' },
    { agentId: 'test', timestamp: Date.now(), duration: 123 }
  );

  (provider.execute as any).mockImplementation(async function* () {
    yield { type: 'text_delta', delta: 'streaming' } as StreamEvent;
    return mockResponse; // Return value
  });

  vi.clearAllMocks();

  // Act
  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  // Assert: Verify return value
  expect(events).toHaveLength(1);
  expect(events[0]).toEqual({ type: 'text_delta', delta: 'streaming' });
  expect(provider.execute).toHaveBeenCalled();
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:509-528`

### Scenario 3: Testing Error Handling in Generators

```typescript
it('should handle errors thrown in generator', async () => {
  // Arrange
  (provider.execute as any).mockImplementation(async function* () {
    throw new Error('Provider stream error');
  });

  vi.clearAllMocks();

  // Act
  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  // Assert: Error event yielded
  const errorEvent = events.find(e => e.type === 'error');
  expect(errorEvent).toBeDefined();
  if (errorEvent && errorEvent.type === 'error') {
    expect(errorEvent.error.message).toBe('Provider stream error');
  }
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:554-585`

### Scenario 4: Testing Generator Cancellation

```typescript
it('should handle early stream termination', async () => {
  // Arrange
  let yieldCount = 0;

  (provider.execute as any).mockImplementation(async function* () {
    yieldCount++;
    yield { type: 'text_delta', delta: '1' } as StreamEvent;
    yieldCount++;
    yield { type: 'text_delta', delta: '2' } as StreamEvent;
    yieldCount++;
    yield { type: 'text_delta', delta: '3' } as StreamEvent;
    return createSuccessResponse({ result: 'done' }, { agentId: 'test', timestamp: Date.now() });
  });

  // Act: Break after first event
  const { stream } = agent.stream(prompt);
  for await (const event of stream) {
    if (event.type === 'text_delta' && event.delta === '1') {
      break; // Early termination
    }
  }

  // Assert: Generator was interrupted
  expect(yieldCount).toBe(1);
});
```

---

## 5. Provider Interface Mocking

### Pattern 7: Complete Provider Mock with AsyncGenerator Support

```typescript
/**
 * Helper function to create mock Provider for testing
 *
 * @param id - Provider identifier
 * @param executeImplementation - Optional custom execute implementation
 * @returns Mock Provider object
 */
function createMockProvider(
  id: ProviderId,
  executeImplementation?: (request: ProviderRequest) => Promise<any>
): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  const mockExecute = vi.fn();
  if (executeImplementation) {
    mockExecute.mockImplementation(executeImplementation);
  } else {
    // Default implementation returns async generator for streaming
    mockExecute.mockImplementation(async function* () {
      yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
      yield { type: 'text_delta', delta: ' World' } as StreamEvent;
      yield { type: 'done', finishReason: 'stop' } as StreamEvent;
      return createSuccessResponse(
        { result: 'Hello World' },
        { agentId: 'test-agent', timestamp: Date.now() }
      );
    });
  }

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:24-67`

---

## 6. Vitest-Specific Considerations

### Clearing Mock State

**Best Practice:** Always clear mocks between tests to prevent state leakage.

```typescript
describe('My tests', () => {
  beforeEach(() => {
    // Reset global config
    resetGlobalConfig();

    // Register fresh mock providers
    const provider = createMockProvider('test');
    ProviderRegistry.getInstance().register(provider);
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
    resetGlobalConfig();
  });

  it('test 1', async () => {
    vi.clearAllMocks(); // Clear call counts before test
    // Test code
  });

  it('test 2', async () => {
    vi.clearAllMocks(); // Clear call counts before test
    // Test code
  });
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:70-86,101`

### Spy Mocks vs Implementation Mocks

**Best Practice:** Choose the right mock approach based on testing needs.

```typescript
// ✅ Use spy mocks when testing existing implementations
const spy = vi.spyOn(provider, 'execute').mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse({ result: 'test' }, { agentId: 'test', timestamp: Date.now() });
});

// ✅ Use vi.fn() when creating new mock implementations
const mockExecute = vi.fn().mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse({ result: 'test' }, { agentId: 'test', timestamp: Date.now() });
});

// Remember to restore spies
afterEach(() => {
  spy.mockRestore();
});
```

---

## 7. Common Pitfalls and Gotchas

### Pitfall 1: Forgetting `async` Keyword

```typescript
// ❌ WRONG: Missing async keyword - syntax error
mockExecute.mockImplementation(function* () {
  yield { type: 'test' };
});

// ✅ CORRECT: Use async function*
mockExecute.mockImplementation(async function* () {
  yield { type: 'test' };
});
```

### Pitfall 2: Not Consuming the Generator

```typescript
// ❌ WRONG: Generator never executes
const { stream } = agent.stream(prompt);
expect(provider.execute).toHaveBeenCalled(); // FAILS - generator not started

// ✅ CORRECT: Consume generator first
const { stream } = agent.stream(prompt);
for await (const _event of stream) { /* consume */ }
expect(provider.execute).toHaveBeenCalled(); // PASSES
```

### Pitfall 3: Ignoring Return Values

```typescript
// ❌ WRONG: Not handling return value
mockExecute.mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' };
  // Missing return statement
});

// ✅ CORRECT: Always return final value
mockExecute.mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' };
  return createSuccessResponse(
    { result: 'test' },
    { agentId: 'test', timestamp: Date.now() }
  );
});
```

### Pitfall 4: Type Safety Issues

```typescript
// ❌ WRONG: Losing type safety
mockExecute.mockImplementation(async function* () {
  yield { type: 'test', wrong: 'field' }; // Type error not caught
});

// ✅ CORRECT: Use type assertions
mockExecute.mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse(
    { result: 'test' },
    { agentId: 'test', timestamp: Date.now() }
  );
});
```

### Pitfall 5: Mock State Leakage

```typescript
// ❌ WRONG: Not clearing mocks between tests
describe('tests', () => {
  it('test 1', async () => {
    mockExecute.mockReturnValue('first');
    expect(await getResult()).toBe('first');
  });

  it('test 2', async () => {
    // FAILS: mock still returns 'first' from test 1
    expect(await getResult()).toBe('second');
  });
});

// ✅ CORRECT: Clear mocks in beforeEach
describe('tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 1', async () => {
    mockExecute.mockReturnValue('first');
    expect(await getResult()).toBe('first');
  });

  it('test 2', async () => {
    mockExecute.mockReturnValue('second');
    expect(await getResult()).toBe('second'); // PASSES
  });
});
```

---

## 8. Advanced Patterns

### Pattern 8: Conditional Yielding Based on Input

```typescript
(provider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
  // Yield different events based on input
  if (request.prompt.includes('error')) {
    yield { type: 'error', error: new Error('Test error') } as StreamEvent;
    return createErrorResponse('TEST_ERROR', 'Test error', {}, false);
  }

  yield { type: 'text_delta', delta: 'Success' } as StreamEvent;
  return createSuccessResponse(
    { result: 'Success' },
    { agentId: 'test', timestamp: Date.now() }
  );
});
```

### Pattern 9: Mocking Multiple Sequential Streams

```typescript
it('should handle sequential streams with different providers', async () => {
  const agent = new Agent({ provider: 'anthropic' });
  const prompt = new Prompt({ user: 'test', responseFormat: z.object({ result: z.string() }) });

  vi.clearAllMocks();

  // Act 1: First stream
  const { stream: s1 } = agent.stream(prompt, { provider: 'anthropic' });
  for await (const _event of s1) { /* consume */ }

  // Act 2: Second stream with different provider
  const { stream: s2 } = agent.stream(prompt, { provider: 'opencode' });
  for await (const _event of s2) { /* consume */ }

  // Act 3: Third stream back to default
  const { stream: s3 } = agent.stream(prompt);
  for await (const _event of s3) { /* consume */ }

  // Assert: Each provider called correct number of times
  expect(anthropicProvider.execute).toHaveBeenCalledTimes(2);
  expect(opencodeProvider.execute).toHaveBeenCalledTimes(1);
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:589-617`

### Pattern 10: Testing Stream Metadata

```typescript
it('should include metadata in stream events', async () => {
  (provider.execute as any).mockImplementation(async function* () {
    yield {
      type: 'metadata',
      metadata: {
        requestId: 'test-123',
        model: 'claude-3-5-sonnet-20250514',
        provider: 'anthropic'
      }
    } as StreamEvent;

    yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
    yield { type: 'done', finishReason: 'stop' } as StreamEvent;

    return createSuccessResponse(
      { result: 'Hello' },
      { agentId: 'test', timestamp: Date.now() }
    );
  });

  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  // Assert: Verify metadata event
  const metadataEvent = events.find(e => e.type === 'metadata');
  expect(metadataEvent).toBeDefined();
  if (metadataEvent && metadataEvent.type === 'metadata') {
    expect(metadataEvent.metadata.provider).toBe('anthropic');
    expect(metadataEvent.metadata.model).toBe('claude-3-5-sonnet-20250514');
  }
});
```

---

## 9. Testing Framework Comparison

### Vitest vs Jest for AsyncGenerator

Both frameworks support AsyncGenerator mocking similarly:

| Feature | Vitest | Jest |
|---------|--------|------|
| `vi.fn()` / `jest.fn()` | ✅ | ✅ |
| `mockImplementation()` | ✅ | ✅ |
| `async function*` support | ✅ | ✅ |
| `for await...of` | ✅ | ✅ |
| Type inference | ✅ Better | ⚠️ Limited |
| Mock clearing | `vi.clearAllMocks()` | `jest.clearAllMocks()` |
| Watch mode | ✅ Faster | ⚠️ Slower |

**Recommendation:** Use Vitest for better TypeScript support and faster test execution.

---

## 10. Library Recommendations

### Required Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.6.1",
    "typescript": "^5.2.0"
  }
}
```

### Optional Testing Utilities

```typescript
// test-utils.ts
import type { StreamEvent } from './types/streaming.js';
import { createSuccessResponse, createErrorResponse } from './types/agent.js';

/**
 * Helper to create mock stream events
 */
export function createMockStreamEvents(events: Partial<StreamEvent>[]): StreamEvent[] {
  return events.map(e => ({
    type: 'text_delta',
    delta: '',
    ...e
  })) as StreamEvent[];
}

/**
 * Helper to create a mock async generator
 */
export async function* mockAsyncGenerator<T>(
  yields: StreamEvent[],
  returnValue: T
): AsyncGenerator<StreamEvent, T, unknown> {
  for (const event of yields) {
    yield event;
  }
  return returnValue;
}

/**
 * Helper to consume and collect all events from a generator
 */
export async function collectEvents<T>(
  generator: AsyncGenerator<StreamEvent, T, unknown>
): Promise<{ events: StreamEvent[]; returnValue: T }> {
  const events: StreamEvent[] = [];
  let returnValue: T | undefined;

  for await (const event of generator) {
    events.push(event);
  }

  // Get return value by calling next() after exhaustion
  const result = await generator.next();
  returnValue = result.value;

  return { events, returnValue: returnValue as T };
}
```

---

## 11. Quick Reference Card

### Basic Mock Template

```typescript
// Import
import { vi } from 'vitest';

// Mock creation
const mockFn = vi.fn().mockImplementation(async function* () {
  yield event1;
  yield event2;
  return returnValue;
});

// Test consumption
for await (const item of mockFn()) {
  // Process items
}

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith(expect.anything());
```

### Common Assertions

```typescript
// Call count
expect(mockExecute).toHaveBeenCalled();
expect(mockExecute).toHaveBeenCalledTimes(n);
expect(mockExecute).not.toHaveBeenCalled();

// Call arguments
expect(mockExecute).toHaveBeenCalledWith(request, toolExecutor, hooks);

// Event sequences
expect(events).toHaveLength(n);
expect(events[0]).toEqual(expectedEvent);
expect(events.some(e => e.type === 'error')).toBe(true);

// Return values
const result = await generator.next();
expect(result.value).toEqual(expectedValue);
```

---

## 12. Performance Considerations

### Minimize Generator Yield Count in Tests

```typescript
// ❌ SLOW: Too many yields
mockExecute.mockImplementation(async function* () {
  for (let i = 0; i < 1000; i++) {
    yield { type: 'text_delta', delta: 'chunk' };
  }
  return response;
});

// ✅ FAST: Minimal yields for testing
mockExecute.mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'chunk1' };
  yield { type: 'text_delta', delta: 'chunk2' };
  return response;
});
```

### Reuse Mock Implementations

```typescript
// Create reusable mock generator
async function* createMockStream(response: string) {
  yield { type: 'text_delta', delta: response };
  return createSuccessResponse({ result: response }, { agentId: 'test', timestamp: Date.now() });
}

// Use in multiple tests
mockExecute.mockImplementation(() => createMockStream('test1'));
mockExecute.mockImplementation(() => createMockStream('test2'));
```

---

## 13. Debugging AsyncGenerator Tests

### Common Error Messages

**Error: "You need to wait for the async operation to complete"**
- **Cause:** Not consuming the generator
- **Fix:** Always use `for await` loop

**Error: "Cannot read property 'type' of undefined"**
- **Cause:** Missing type assertion on events
- **Fix:** Use `as StreamEvent` or proper type guards

**Error: "Expected 0 calls but received 1"**
- **Cause:** Mock not cleared between tests
- **Fix:** Add `vi.clearAllMocks()` in `beforeEach`

### Debugging Tips

```typescript
// Log events during test
for await (const event of stream) {
  console.log('Event:', event); // Debug log
  events.push(event);
}

// Log mock calls
console.log('Mock calls:', mockExecute.mock.calls);
console.log('Call count:', mockExecute.mock.calls.length);

// Log mock implementation
console.log('Mock implementation:', mockExecute.getMockImplementation());
```

---

## 14. Real-World Example from Groundswell

### Complete Test Case

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';
import type { Provider, ProviderId, ProviderRequest } from '../../types/providers.js';
import type { StreamEvent } from '../../types/streaming.js';
import { createSuccessResponse } from '../../types/agent.js';
import { z } from 'zod';

function createMockProvider(id: ProviderId): Provider {
  const mockExecute = vi.fn().mockImplementation(async function* () {
    yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
    yield { type: 'done', finishReason: 'stop' } as StreamEvent;
    return createSuccessResponse({ result: 'Hello World' }, { agentId: 'test', timestamp: Date.now() });
  });

  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string) => ({ provider: id, model, raw: model })),
  };
}

describe('Agent.stream() with AsyncGenerator', () => {
  beforeEach(() => {
    const provider = createMockProvider('test');
    ProviderRegistry.getInstance().register(provider);
  });

  afterEach(() => {
    ProviderRegistry['_resetForTesting']();
  });

  it('should stream events correctly', async () => {
    const agent = new Agent({ provider: 'test' });
    const prompt = new Prompt({ user: 'test', responseFormat: z.object({ result: z.string() }) });

    const { stream } = agent.stream(prompt);
    const events: StreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'Hello' });
    expect(events[1]).toEqual({ type: 'done', finishReason: 'stop' });
  });
});
```

---

## 15. Conclusion and Recommendations

### Key Takeaways

1. **Always use `async function*`** when mocking AsyncGenerator functions
2. **Always consume generators** in tests using `for await...of`
3. **Always clear mocks** between tests with `vi.clearAllMocks()`
4. **Use type assertions** (`as StreamEvent`) for type safety
5. **Test both yielded events** and **return values**
6. **Test error scenarios** by throwing errors in generator

### Best Practice Checklist

- [ ] Mock uses `async function*` syntax
- [ ] Generator is consumed with `for await...of`
- [ ] Both events and return values are tested
- [ ] Mocks are cleared in `beforeEach` or `afterEach`
- [ ] Type assertions are used for yielded values
- [ ] Error scenarios are tested
- [ ] Mock state is isolated between tests

### Recommended File Structure

```
src/
  __tests__/
    unit/
      provider-mocking.test.ts
      streaming-events.test.ts
      error-handling.test.ts
    test-utils/
      mock-provider.ts
      async-generator-helpers.ts
```

---

## 16. References and Further Reading

### Internal References (Groundswell Codebase)

1. **Existing AsyncGenerator Mock Pattern**
   - File: `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts`
   - Lines: 24-67 (createMockProvider helper)
   - Lines: 42-50 (async generator mock implementation)
   - Lines: 465-473 (dynamic mock with custom implementation)

2. **Streaming Type Definitions**
   - File: `/home/dustin/projects/groundswell/src/types/streaming.ts`
   - Lines: 30-50 (StreamEvent type definitions)
   - Lines: 74-116 (AsyncStream interface)

3. **Provider Implementation**
   - File: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
   - Lines: 473-676 (executeStreaming method with async generator)

### External Documentation (When Available)

- [Vitest Mock API](https://vitest.dev/api/mock.html)
- [TypeScript Async Generators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#async-iteration)
- [MDN: Async iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)

### Related Patterns in Codebase

- **Vitest Configuration**: `/home/dustin/projects/groundswell/vitest.config.ts`
- **Provider Registry**: `/home/dustin/projects/groundswell/src/providers/provider-registry.ts`
- **Agent Stream Method**: `/home/dustin/projects/groundswell/src/core/agent.ts`

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Author:** Research Agent
**Status:** Complete
