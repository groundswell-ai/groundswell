# Testing Patterns for Singleton/Registry Classes

## Summary of Test Patterns Found

### 1. Singleton/Registry Testing Patterns

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts`

This file demonstrates excellent patterns for testing singleton/global state:

```typescript
// Reset after each test for isolation
afterEach(() => {
  resetGlobalConfig();
});

// Test patterns for singleton behavior:
describe('getGlobalProviderConfig', () => {
  describe('default behavior (not configured)', () => {
    it('should return default config when never configured', () => {
      const config = getGlobalProviderConfig();
      expect(config).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined
      });
    });

    it('should be pure (no mutations on repeated calls)', () => {
      const config1 = getGlobalProviderConfig();
      const config2 = getGlobalProviderConfig();
      expect(config1).toBe(config2); // Same reference
    });
  });
});
```

**Key patterns:**
- Use `afterEach` hooks to reset global state between tests
- Test both configured and unconfigured states
- Verify immutability/purity of returned objects
- Test that the same reference is returned (singleton behavior)

### 2. Service Layer Testing Patterns

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts`

Shows service layer testing with dependency injection:

```typescript
describe('Agent', () => {
  it('should create with unique id', () => {
    const a1 = new Agent();
    const a2 = new Agent();
    expect(a1.id).not.toBe(a2.id);
  });

  it('should register MCP servers from config', () => {
    const agent = new Agent({
      mcps: [
        {
          name: 'test-mcp',
          transport: 'inprocess',
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: {} },
            },
          ],
        },
      ],
    });

    const handler = agent.getMcpHandler();
    expect(handler.getServerNames()).toContain('test-mcp');
    expect(handler.hasTool('test-mcp__test_tool')).toBe(true);
  });
});
```

### 3. Provider Interface Testing Patterns

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/provider-interface.test.ts`

Excellent pattern for testing interfaces and mock implementations:

```typescript
describe('Provider Interface', () => {
  describe('Interface Structure', () => {
    it('should have all required readonly properties', () => {
      // Mock provider implementation to verify interface methods
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(/* ... */): Promise<AgentResponse<T>> {}
        // ... other methods
      }

      const provider = new MockProvider();
      expect(typeof provider.initialize).toBe('function');
      expect(typeof provider.terminate).toBe('function');
      // ... method verification
    });
  });
});
```

### 4. Mock Patterns

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-context.test.ts`

Shows comprehensive mocking patterns:

```typescript
import { describe, it, expect, vi } from 'vitest';

const createMockWorkflow = () => {
  const events: WorkflowEvent[] = [];
  return {
    workflow: {
      id: 'test-workflow-id',
      node: { /* mock node structure */ },
      emitEvent: (event: WorkflowEvent) => events.push(event),
      setStatus: vi.fn(),
      attachChild: vi.fn(),
    },
    events,
  };
};

const createMockAgent = (): AgentLike => {
  return {
    prompt: vi.fn(),
  };
};

// Usage in tests
it('should extract data from successful AgentResponse', async () => {
  const { workflow } = createMockWorkflow();
  const context = new WorkflowContextImpl(workflow);
  const agent = createMockAgent();

  const mockResponse = createSuccessResponse(expectedData, {
    agentId: 'test-agent',
    timestamp: Date.now(),
  });

  vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

  const result = await context.replaceLastPromptResult(prompt, agent);
  expect(result).toBe(expectedData);
});
```

### 5. Helper Function Patterns

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`

Shows helper function testing patterns:

```typescript
// Helper function to create test data
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { key: 'value' },
    logs: [
      {
        id: 'log-1',
        workflowId: 'wf-test-123',
        timestamp: Date.now(),
        level: 'error',
        message: 'Test log message',
      },
    ],
    ...overrides,
  };
}

// Usage in tests
it('should aggregate multiple errors with unique workflow IDs', () => {
  const error1 = createMockWorkflowError({ workflowId: 'wf-1' });
  const error2 = createMockWorkflowError({ workflowId: 'wf-2' });
  const result = mergeWorkflowErrors([error1, error2], 'concurrentTask', 'parent-wf', 2);

  expect(result.message).toBe("2 of 2 concurrent child workflows failed in task 'concurrentTask'");
});
```

## Key Testing Patterns to Follow

### 1. Singleton/Registry Testing
- Use `afterEach` hooks to reset state
- Test both configured and default states
- Verify immutability and reference consistency
- Test error cases for invalid configurations

### 2. Service Layer Testing
- Test constructor behavior and validation
- Test dependency injection and configuration
- Verify service methods behave correctly
- Test error conditions

### 3. Interface Testing
- Create mock implementations to verify interface contracts
- Test all required properties and methods
- Test readonly property enforcement
- Test generic type parameters

### 4. Mock Patterns
- Use `vi.fn()` for function mocks
- Use `vi.mocked()` for typed mock assertions
- Create helper functions for complex mock objects
- Test both success and error scenarios

### 5. Test Organization
- Group related tests in nested `describe` blocks
- Use clear, descriptive test names
- Include setup/teardown with `beforeEach`/`afterEach`
- Test edge cases and error conditions

## Specific Patterns for ProviderRegistry Testing

```typescript
// Helper function to create mock provider
function createMockProvider(id: ProviderId): Provider {
  return {
    id,
    capabilities: {
      mcp: true,
      skills: true,
      lsp: false,
      streaming: true,
      sessions: false,
      extendedThinking: false,
    },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn(),
    loadSkills: vi.fn(),
    normalizeModel: vi.fn(),
  };
}

describe('ProviderRegistry', () => {
  // CRITICAL: Reset singleton after each test
  afterEach(() => {
    // Call reset function to clear singleton state
    ProviderRegistry._resetForTesting();
  });

  describe('getInstance()', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ProviderRegistry.getInstance();
      const instance2 = ProviderRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('register()', () => {
    it('should register a provider', () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');

      registry.register(provider);

      expect(registry.get('anthropic')).toBe(provider);
    });

    it('should throw on duplicate provider id', () => {
      const registry = ProviderRegistry.getInstance();
      const provider1 = createMockProvider('anthropic');
      const provider2 = createMockProvider('anthropic');

      registry.register(provider1);

      expect(() => {
        registry.register(provider2);
      }).toThrow('already registered');
    });
  });

  describe('get()', () => {
    it('should return undefined for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();

      expect(registry.get('opencode')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');

      registry.register(provider);

      expect(registry.has('anthropic')).toBe(true);
      expect(registry.has('opencode')).toBe(false);
    });
  });
});
```
