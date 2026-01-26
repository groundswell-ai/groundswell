# AsyncGenerator Mocking - Quick Reference

**Project:** Groundswell
**Date:** 2026-01-26
**Framework:** Vitest + TypeScript

---

## 🔑 Key Finding

The codebase **already demonstrates excellent AsyncGenerator mocking patterns** in:
- **File:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts`
- **Pattern:** Lines 42-50, 307-314, 465-473

---

## 📋 Essential Code Patterns

### 1. Basic AsyncGenerator Mock (Most Common Pattern)

```typescript
import { vi } from 'vitest';

const mockExecute = vi.fn().mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'Hello' } as StreamEvent;
  yield { type: 'text_delta', delta: ' World' } as StreamEvent;
  yield { type: 'done', finishReason: 'stop' } as StreamEvent;
  return createSuccessResponse(
    { result: 'Hello World' },
    { agentId: 'test-agent', timestamp: Date.now() }
  );
});
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:42-50`

### 2. Dynamic Mock with Parameter Capture

```typescript
let capturedOptions: any = {};

(provider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
  capturedOptions = request.options; // Capture for assertions
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse(
    { result: 'test' },
    { agentId: 'test', timestamp: Date.now() }
  );
});

// Assert on captured values
expect(capturedOptions.sessionId).toBeUndefined();
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:307-314`

### 3. Consuming Generators in Tests

```typescript
const { stream } = agent.stream(prompt);
const events: StreamEvent[] = [];

for await (const event of stream) {
  events.push(event);
}

expect(events).toHaveLength(3);
expect(events[0]).toEqual({ type: 'text_delta', delta: 'Hello' });
```

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts:478-483`

---

## ⚠️ Common Pitfalls

### ❌ WRONG: Missing `async` keyword
```typescript
mockExecute.mockImplementation(function* () {
  // ERROR: Not an async generator
});
```

### ✅ CORRECT: Use `async function*`
```typescript
mockExecute.mockImplementation(async function* () {
  // Correct: Async generator
});
```

### ❌ WRONG: Not consuming generator
```typescript
const { stream } = agent.stream(prompt);
expect(provider.execute).toHaveBeenCalled(); // FAILS
```

### ✅ CORRECT: Always consume
```typescript
const { stream } = agent.stream(prompt);
for await (const _event of stream) { /* consume */ }
expect(provider.execute).toHaveBeenCalled(); // PASSES
```

---

## 🛠️ Testing Framework Support

| Feature | Status | Notes |
|---------|--------|-------|
| **Vitest** | ✅ Fully Supported | Best choice for TypeScript |
| **Jest** | ✅ Supported | Similar API to Vitest |
| **`vi.fn()`** | ✅ | Creates mock functions |
| **`async function*`** | ✅ | Async generator syntax |
| **`for await...of`** | ✅ | Generator consumption |

**Recommendation:** Use Vitest for better TypeScript support and faster watch mode.

---

## 📚 TypeScript Type Safety

### Pattern: Type Assertions for Mocks

```typescript
// Define event types
type StreamEvent =
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'done'; finishReason: 'stop' }
  | { type: 'error'; error: Error };

// Use type assertions in mocks
mockExecute.mockImplementation(async function* () {
  yield { type: 'text_delta', delta: 'test' } as StreamEvent;
  return createSuccessResponse({ result: 'test' }, { agentId: 'test', timestamp: Date.now() });
});
```

### Pattern: Type Casting for Mock Access

```typescript
// Access mock implementation with type assertion
(provider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
  // Implementation
});

// Or use Vitest's vi.mocked()
import { vi } from 'vitest';
vi.mocked(provider.execute).mockImplementation(async function* () {
  // Implementation
});
```

---

## 🧪 Test Scenarios

### Scenario 1: Event Sequence Testing

```typescript
it('should yield events in correct order', async () => {
  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  expect(events[0].type).toBe('metadata');
  expect(events[1]).toEqual({ type: 'text_delta', delta: 'Hello' });
  expect(events[2]).toEqual({ type: 'done', finishReason: 'stop' });
});
```

### Scenario 2: Error Handling

```typescript
it('should handle errors in generator', async () => {
  (provider.execute as any).mockImplementation(async function* () {
    throw new Error('Stream error');
  });

  const { stream } = agent.stream(prompt);
  const events: StreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  const errorEvent = events.find(e => e.type === 'error');
  expect(errorEvent).toBeDefined();
});
```

### Scenario 3: Sequential Streams

```typescript
it('should handle multiple streams', async () => {
  vi.clearAllMocks();

  // Stream 1
  const { stream: s1 } = agent.stream(prompt);
  for await (const _event of s1) { /* consume */ }

  // Stream 2
  const { stream: s2 } = agent.stream(prompt);
  for await (const _event of s2) { /* consume */ }

  expect(provider.execute).toHaveBeenCalledTimes(2);
});
```

---

## 📦 Mock State Management

### Essential: Clear Mocks Between Tests

```typescript
describe('My tests', () => {
  beforeEach(() => {
    // Reset global state
    resetGlobalConfig();

    // Register fresh mocks
    const provider = createMockProvider('test');
    ProviderRegistry.getInstance().register(provider);
  });

  afterEach(() => {
    // Clean up
    ProviderRegistry['_resetForTesting']();
  });

  it('test 1', async () => {
    vi.clearAllMocks(); // Clear call counts
    // Test code
  });
});
```

---

## 🎯 Best Practices Checklist

- [ ] Use `async function*` syntax for async generator mocks
- [ ] Always consume generators with `for await...of`
- [ ] Clear mocks with `vi.clearAllMocks()` between tests
- [ ] Use type assertions (`as StreamEvent`) for type safety
- [ ] Test both yielded events AND return values
- [ ] Test error scenarios
- [ ] Isolate mock state between tests

---

## 🔗 Internal References

### Existing Patterns in Groundswell

1. **Complete Mock Provider Helper**
   - File: `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts`
   - Lines: 24-67
   - Shows: Complete Provider interface mock with AsyncGenerator support

2. **Streaming Type Definitions**
   - File: `/home/dustin/projects/groundswell/src/types/streaming.ts`
   - Lines: 30-50 (StreamEvent types)
   - Lines: 74-116 (AsyncStream interface)

3. **Provider Streaming Implementation**
   - File: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
   - Lines: 473-676 (executeStreaming method)
   - Shows: Real-world AsyncGenerator usage

---

## 📖 Quick Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StreamEvent } from '../types/streaming.js';

function createMockAsyncGenerator() {
  return vi.fn().mockImplementation(async function* () {
    yield { type: 'text_delta', delta: 'test' } as StreamEvent;
    return createSuccessResponse({ result: 'test' }, { agentId: 'test', timestamp: Date.now() });
  });
}

describe('AsyncGenerator tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work', async () => {
    const mock = createMockAsyncGenerator();
    const events: StreamEvent[] = [];

    for await (const event of mock()) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(mock).toHaveBeenCalled();
  });
});
```

---

## 🚀 Performance Tips

1. **Minimize yields** in tests (2-3 events is enough)
2. **Reuse mock implementations** across tests
3. **Clear mocks** instead of recreating them
4. **Use `vi.clearAllMocks()`** instead of manual cleanup

---

## 🐛 Debugging Tips

```typescript
// Log events during test
for await (const event of stream) {
  console.log('Event:', event); // Debug
  events.push(event);
}

// Log mock calls
console.log('Calls:', mockExecute.mock.calls);
console.log('Count:', mockExecute.mock.calls.length);
```

---

## 📝 Summary

**The Groundswell codebase already has excellent AsyncGenerator mocking patterns.** Use the existing patterns from `/home/dustin/projects/groundswell/src/__tests__/unit/agent-stream-provider-override.test.ts` as your primary reference.

**Key points:**
1. Use `vi.fn().mockImplementation(async function* () { ... })`
2. Always consume with `for await...of`
3. Clear mocks with `vi.clearAllMocks()`
4. Use type assertions for safety
5. Test events, returns, and errors

---

**For detailed documentation, see:** `/home/dustin/projects/groundswell/research/async-generator-mocking-best-practices.md`
