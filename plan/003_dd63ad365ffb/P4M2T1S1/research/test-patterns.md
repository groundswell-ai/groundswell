# Test Patterns Reference

## Testing Framework

**Framework**: Vitest
**Configuration**: `/home/dustin/projects/groundswell/vitest.config.ts`
**Test scripts**: `npm test` (runs vitest)
**Import style**: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';`
**File pattern**: `**/*.test.ts`
**Test location**: `src/__tests__/unit/`, `src/__tests__/integration/`

## Agent Class Test Patterns

### From: `/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts`

```typescript
describe('Agent', () => {
  it('should create with unique id', () => {
    const a1 = new Agent();
    const a2 = new Agent();
    expect(a1.id).not.toBe(a2.id);
  });

  it('should use default name when not provided', () => {
    const agent = new Agent();
    expect(agent.name).toBe('Agent');
  });

  it('should use custom name when provided', () => {
    const agent = new Agent({ name: 'CustomAgent' });
    expect(agent.name).toBe('CustomAgent');
  });

  it('should provide access to MCP handler', () => {
    const agent = new Agent();
    const handler = agent.getMcpHandler();
    expect(handler).toBeInstanceOf(MCPHandler);
  });
});
```

### Test Isolation Pattern

```typescript
describe('Agent with providers', () => {
  beforeEach(() => {
    // Set up before each test
    ProviderRegistry._resetForTesting();
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // Clean up after each test
    ProviderRegistry._resetForTesting();
  });

  it('should get provider from registry', () => {
    const agent = new Agent({ provider: 'anthropic' });
    expect(agent['provider']).toBeDefined();
  });
});
```

## Provider Registry Test Patterns

### From: `/home/dustin/projects/groundswell/src/__tests__/unit/providers/provider-registry.test.ts`

### Mock Provider Helper Pattern

```typescript
describe('ProviderRegistry', () => {
  afterEach(() => {
    const registry = ProviderRegistry.getInstance();
    registry._resetInitStateForTesting();
    ProviderRegistry._resetForTesting();
  });

  // Helper function to create mock Provider for testing
  function createMockProvider(id: ProviderId): Provider {
    const capabilities: ProviderCapabilities = {
      mcp: true,
      skills: true,
      lsp: false,
      streaming: true,
      sessions: false,
      extendedThinking: false,
    };

    return {
      id,
      capabilities,
      initialize: vi.fn().mockResolvedValue(undefined),
      terminate: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
      registerMCPs: vi.fn().mockResolvedValue([]),
      loadSkills: vi.fn().mockResolvedValue(undefined),
      normalizeModel: vi.fn((model: string): ModelSpec => ({
        provider: id,
        model,
        raw: model,
      })),
    };
  }

  describe('get() - Provider Retrieval', () => {
    it('should return undefined for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const retrieved = registry.get('anthropic');
      expect(retrieved).toBeUndefined();
    });

    it('should return registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');
      registry.register(anthropicProvider);

      const retrieved = registry.get('anthropic');

      expect(retrieved).toBeDefined();
      expect(retrieved).toBe(anthropicProvider);
    });
  });
});
```

### Error Testing Pattern

```typescript
describe('initializeProvider()', () => {
  it('should throw if provider is not registered', async () => {
    const registry = ProviderRegistry.getInstance();

    await expect(registry.initializeProvider('anthropic')).rejects.toThrow(
      "Provider 'anthropic' is not registered"
    );
  });

  it('should successfully initialize a provider', async () => {
    const registry = ProviderRegistry.getInstance();
    const provider = createMockProvider('anthropic');
    registry.register(provider);

    await registry.initializeProvider('anthropic');

    expect(provider.initialize).toHaveBeenCalledTimes(1);
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
  });
});
```

## Vitest Mock Patterns

### Simple Mock Function

```typescript
const mockHook = vi.fn();
```

### Mock with Return Value

```typescript
initialize: vi.fn().mockResolvedValue(undefined)
```

### Mock with Implementation

```typescript
provider.initialize = vi.fn().mockImplementation(async () => {
  initCallCount++;
  await new Promise(resolve => setTimeout(resolve, 10));
});
```

### Mock with Rejected Value (Error)

```typescript
provider.initialize = vi.fn().mockRejectedValue(new Error('Failed'))
```

### Spy Pattern

```typescript
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... test code ...
errorSpy.mockRestore();
```

## Test Structure Patterns

### Nested Describe Blocks

```typescript
describe('ClassName', () => {
  describe('Feature/Method Name', () => {
    describe('Specific Scenario', () => {
      it('should do something specific', () => {
        // Test
      });
    });
  });
});
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should return registered provider', () => {
  // Arrange
  const registry = ProviderRegistry.getInstance();
  const anthropicProvider = createMockProvider('anthropic');
  registry.register(anthropicProvider);

  // Act
  const retrieved = registry.get('anthropic');

  // Assert
  expect(retrieved).toBeDefined();
  expect(retrieved).toBe(anthropicProvider);
});
```

### Async Test Pattern

```typescript
it('should successfully initialize a provider', async () => {
  const registry = ProviderRegistry.getInstance();
  const provider = createMockProvider('anthropic');
  registry.register(provider);

  await registry.initializeProvider('anthropic');

  expect(provider.initialize).toHaveBeenCalledTimes(1);
});
```

### Error Assertion Patterns

```typescript
// Pattern 1: expect().rejects.toThrow()
await expect(registry.initializeProvider('anthropic')).rejects.toThrow(
  "Provider 'anthropic' is not registered"
);

// Pattern 2: expect().toThrow()
expect(() => {
  registry.register(anthropicProvider);
}).toThrow(Error);

// Pattern 3: Try-catch with detailed error validation
try {
  provider.normalizeModel('opencode/gpt-4');
  expect.fail('Should have thrown an error');
} catch (error) {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain('Cannot normalize');
}
```

## Testing Private Properties

### Using Bracket Notation

```typescript
it('should have provider instance', () => {
  const agent = new Agent({ provider: 'anthropic' });
  expect(agent['provider']).toBeDefined();
});

it('should store correct provider', () => {
  const agent = new Agent({ provider: 'anthropic' });
  const provider = agent['provider'] as Provider;
  expect(provider.id).toBe('anthropic');
});
```

### Using @ts-expect-error Comment

```typescript
it('should have private sdk field', () => {
  const provider = new AnthropicProvider();
  // @ts-expect-error - Testing private property
  expect(provider.sdk).toBeNull();
});
```

## Test Naming Conventions

### Descriptive Test Names

```typescript
// GOOD: Descriptive
it('should throw if provider is not registered', async () => { });
it('should return undefined for unregistered provider', () => { });
it('should successfully initialize a provider', async () => { });

// AVOID: Vague
it('should work', () => { });
it('test provider', () => { });
it('error case', () => { });
```

### "should [verb] when [condition]" Pattern

```typescript
it('should return registered provider when provider exists', () => { });
it('should throw error when provider not registered', () => { });
it('should use default provider when no override specified', () => { });
```

## Key Conventions for Agent Constructor Tests

1. **Use Vitest** as the testing framework
2. **Test file naming**: `*.test.ts` (not `.spec.ts`)
3. **Test location**: `src/__tests__/unit/core/agent.test.ts`
4. **Use `beforeEach`** for test setup and isolation
5. **Use helper functions** to create mock objects
6. **Use `vi.fn()`** for mocking functions
7. **Use `vi.spyOn()`** for spying on console/methods
8. **Use `@ts-expect-error`** comments when testing private properties
9. **Test both success and error paths**
10. **Use descriptive test names**: "should [action] when [condition]"
11. **Test "not found" scenarios** explicitly with proper error messages
12. **Use `expect().rejects.toThrow()`** for async error testing
13. **Reset registry state** in `afterEach` for singleton patterns

## Expected Test Updates for P4.M2.T1.S1

After implementing provider registry integration, existing Agent tests may need updates:

```typescript
describe('Agent', () => {
  beforeEach(() => {
    // NEW: Register mock provider before creating Agent
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // NEW: Clean up registry state
    ProviderRegistry._resetForTesting();
  });

  // Existing tests should continue to work
  it('should create with unique id', () => {
    const a1 = new Agent();
    const a2 = new Agent();
    expect(a1.id).not.toBe(a2.id);
  });

  // NEW: Test provider integration
  it('should get provider from registry', () => {
    const agent = new Agent({ provider: 'anthropic' });
    expect(agent['provider']).toBeDefined();
  });

  // NEW: Test error handling
  it('should throw when provider not registered', () => {
    ProviderRegistry._resetForTesting(); // Remove registered provider
    expect(() => new Agent({ provider: 'anthropic' })).toThrow(
      "Provider 'anthropic' is not registered"
    );
  });
});
```
