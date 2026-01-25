# Test Framework Patterns

**PRP**: P1.M1.T2.S4
**Research Date**: 2026-01-24
**Purpose**: Document test framework and patterns used in this codebase

---

## Test Framework: Vitest

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

**Key Functions**:
- `describe()` - Group related tests
- `it()` - Define individual test cases
- `expect()` - Assertion library
- `vi()` - Mocking utilities
- `beforeEach()` - Setup before each test

---

## Test File Structure

### Import Pattern

```typescript
// Use .js extension for all imports (ES modules)
import { describe, it, expect } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { z } from 'zod';
import type { AgentResponse } from '../../types/agent.js';
```

### Test Organization Pattern

```typescript
describe('Component Name', () => {
  describe('Method/Feature Name', () => {
    it('should do something specific', async () => {
      // Arrange
      const agent = new Agent();

      // Act
      const result = await agent.prompt(prompt);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

---

## Existing Test Patterns (from agent-response-factory.test.ts)

### Factory Function Test Pattern

```typescript
describe('createSuccessResponse', () => {
  it('should create a success response with data and metadata', () => {
    const data = { result: 'success', value: 42 };
    const metadata = {
      agentId: 'agent-123',
      timestamp: 1706760000000,
      duration: 100,
    };

    const response = createSuccessResponse(data, metadata);

    expect(response.status).toBe('success');
    expect(response.data).toEqual(data);
    expect(response.error).toBeNull();
    expect(response.metadata).toEqual(metadata);
  });
});
```

### Type Guard Test Pattern

```typescript
describe('isSuccess', () => {
  it('should return true for success responses', () => {
    const response = createSuccessResponse(
      { result: 'ok' },
      { agentId: 'agent-123', timestamp: Date.now() }
    );

    expect(isSuccess(response)).toBe(true);
  });

  it('should narrow type to SuccessResponse<T>', () => {
    const response: AgentResponse<string> = createSuccessResponse(
      'test data',
      { agentId: 'agent-123', timestamp: Date.now() }
    );

    if (isSuccess(response)) {
      // TypeScript knows: response.data is string (not null)
      expect(response.data.toUpperCase()).toBe('TEST DATA');
      expect(response.error).toBeNull();
    }
  });
});
```

### Null Handling Test Pattern (PRD 6.4.4)

```typescript
describe('Null Handling (PRD 6.4.4)', () => {
  it('should use null for absent error in success responses', () => {
    const response = createSuccessResponse(
      'data',
      { agentId: 'agent-123', timestamp: Date.now() }
    );

    expect(response.error).toBeNull();
    expect(response.error).not.toBeUndefined();
  });
});
```

---

## Mocking Pattern

### Basic Mock Pattern

```typescript
import { vi } from 'vitest';

describe('Agent with mocks', () => {
  it('should handle mocked API responses', async () => {
    // Mock the Anthropic API
    const mockApi = vi.fn().mockResolvedValue({
      content: [{ text: 'Mocked response' }]
    });

    // Use mock in test
    const agent = new Agent({ /* config */ });
    // ... set up mock

    const response = await agent.prompt(prompt);
    expect(response.status).toBe('success');
  });
});
```

### Event Observer Pattern

```typescript
describe('Event emission', () => {
  it('should emit step events', async () => {
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);
    await workflow.run();

    expect(events.some((e) => e.type === 'stepStart')).toBe(true);
  });
});
```

---

## Async Test Pattern

```typescript
describe('Async operations', () => {
  it('should handle async agent prompts', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
    });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
  });

  it('should handle timeouts', async () => {
    const agent = new Agent();
    const prompt = new Prompt({ /* ... */ });

    await expect(agent.prompt(prompt)).rejects.toThrow('Timeout');
  });
});
```

---

## Error Test Pattern

```typescript
describe('Error handling', () => {
  it('should throw when configuration is invalid', () => {
    expect(() => new Agent({ invalid: 'config' })).toThrow();
  });

  it('should return error response for API failures', async () => {
    const agent = new Agent();
    const prompt = new Prompt({ /* trigger error */ });

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('API_REQUEST_FAILED');
  });
});
```

---

## Type Safety Test Pattern

```typescript
describe('Type safety', () => {
  it('should preserve generic type parameter', () => {
    type TestData = { name: string; count: number };
    const data: TestData = { name: 'test', count: 5 };

    const response = createSuccessResponse<TestData>(data, {
      agentId: 'agent-123',
      timestamp: Date.now(),
    });

    // Type assertion: TypeScript knows response.data is TestData
    expect(response.data.name).toBe('test');
    expect(response.data.count).toBe(5);
  });
});
```

---

## Test Naming Conventions

| Pattern | Example |
|---------|---------|
| **Positive case** | `should return success response` |
| **Negative case** | `should throw when invalid` |
| **Edge case** | `should handle null values` |
| **Type guard** | `should narrow type to SuccessResponse` |
| **Feature** | `should include metadata in response` |

---

## Assertion Patterns

### Equality Assertions

```typescript
expect(response.status).toBe('success');
expect(response.data).toEqual({ result: 'ok' });
expect(response.error).toBeNull();
```

### Type Assertions

```typescript
expect(response.data).toBeTypeOf('string');
expect(response.data.items).toBeInstanceOf(Array);
```

### Conditional Assertions

```typescript
expect(response.status).toBe('success');
expect(response.data).not.toBeNull();
expect(response.error).not.toBeUndefined();
```

### Numeric Assertions

```typescript
expect(response.metadata.timestamp).toBeGreaterThan(0);
expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
expect(response.data.items).toHaveLength(3);
```

### String Assertions

```typescript
expect(response.error?.code).toMatch(/^[A-Z][A-Z_]*$/);
expect(response.error?.message).toContain('expected text');
```

### Object Property Assertions

```typescript
expect(response.data).toHaveProperty('result');
expect(response.data).toMatchObject({
  result: 'success',
  value: 42,
});
```

---

## Test Setup Pattern

### beforeEach Pattern

```typescript
describe('Agent Tests', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({ name: 'TestAgent' });
  });

  it('should use configured agent', async () => {
    expect(agent.name).toBe('TestAgent');
  });
});
```

### Test Fixture Pattern

```typescript
const createTestAgent = () => new Agent({
  name: 'TestAgent',
  enableCache: false,
});

const createTestPrompt = () => new Prompt({
  user: 'Test prompt',
  responseFormat: z.string(),
});

describe('Agent.prompt()', () => {
  it('should return success response', async () => {
    const agent = createTestAgent();
    const prompt = createTestPrompt();

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
  });
});
```

---

## Summary Table

| Category | Pattern | Example |
|----------|---------|---------|
| **Imports** | Use `.js` extensions | `from '../../core/agent.js'` |
| **Organization** | Nested describe | `describe('Agent', () => { describe('prompt', () => {...} })` |
| **Async** | Mark test as async | `it('should work', async () => {...})` |
| **Assertions** | Use Vitest expect | `expect(response.status).toBe('success')` |
| **Type Guards** | Demonstrate narrowing | `if (isSuccess(response)) {...}` |
| **Nulls** | Use toNull() not toUndefined() | `expect(response.error).toBeNull()` |
| **Mocks** | Use vi.fn() | `vi.fn().mockResolvedValue(...)` |
