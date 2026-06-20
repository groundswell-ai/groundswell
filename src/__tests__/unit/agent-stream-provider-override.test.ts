/**
 * Unit tests for Agent.stream() with prompt-level provider override
 *
 * Tests the configuration cascade: global → agent → prompt
 * Verifies that prompt-level provider and providerOptions overrides
 * correctly switch the execution provider and merge options for streaming.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { ProviderRegistry } from '../../harnesses/harness-registry.js';
import { configureProviders, resetGlobalConfig } from '../../utils/provider-config.js';
import type { Provider, ProviderId, ProviderCapabilities, ProviderRequest } from '../../types/providers.js';
import type { ModelSpec } from '../../types/providers.js';
import type { StreamEvent } from '../../types/streaming.js';
import type { AgentResponse } from '../../types/agent.js';
import { createSuccessResponse } from '../../types/agent.js';
import { z } from 'zod';

/**
 * Helper function to create mock Provider for testing
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

describe('Agent.stream()', () => {
  beforeEach(() => {
    // Reset global config before each test
    resetGlobalConfig();

    // Register mock providers
    const anthropicProvider = createMockProvider('anthropic');
    const claudeCodeProvider = createMockProvider('claude-code');
    const registry = ProviderRegistry.getInstance();
    registry.register(anthropicProvider);
    registry.register(claudeCodeProvider);
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
    resetGlobalConfig();
  });

  describe('provider override', () => {
    it('should use agent provider when no prompt override', async () => {
      // Arrange: Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider to spy on execute
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;

      vi.clearAllMocks();

      // Act
      const { stream } = agent.stream(prompt);
      // Consume the stream to trigger execution
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: anthropic provider was used
      expect(anthropicProvider.execute).toHaveBeenCalled();
    });

    it('should use prompt provider override when specified', async () => {
      // Arrange: Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      const claudeCodeProvider = registry.get('claude-code')!;

      vi.clearAllMocks();

      // Act: Override to claude-code at prompt level
      const { stream } = agent.stream(prompt, { provider: 'claude-code' });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: claude-code provider was used, not anthropic
      expect(claudeCodeProvider.execute).toHaveBeenCalled();
      expect(anthropicProvider.execute).not.toHaveBeenCalled();
    });

    it('should use global default provider when agent has no provider', async () => {
      // Arrange: Agent without provider override (uses global default)
      const agent = new Agent();
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;

      vi.clearAllMocks();

      // Act
      const { stream } = agent.stream(prompt);
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: global default provider (anthropic) was used
      expect(anthropicProvider.execute).toHaveBeenCalled();
    });

    it('should prioritize prompt override over agent and global config', async () => {
      // Arrange: Set global default to claude-code
      configureProviders({
        defaultProvider: 'claude-code',
        providerDefaults: {
          anthropic: { timeout: 30000 },
          'claude-code': { endpoint: 'http://localhost:8080' }
        }
      });

      // Agent configured with anthropic (overrides global claude-code)
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      const claudeCodeProvider = registry.get('claude-code')!;

      vi.clearAllMocks();

      // Act: Prompt override to claude-code (highest priority)
      const { stream } = agent.stream(prompt, { provider: 'claude-code' });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Prompt override wins over agent and global config
      expect(claudeCodeProvider.execute).toHaveBeenCalled();
      expect(anthropicProvider.execute).not.toHaveBeenCalled();
    });

    it('should throw error when provider is not registered', async () => {
      // Arrange: First reset everything and create a fresh environment
      ProviderRegistry['_resetForTesting']();
      const anthropicProvider = createMockProvider('anthropic');
      ProviderRegistry.getInstance().register(anthropicProvider);

      // Create agent AFTER resetting
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Act & Assert: Try to use unregistered provider
      await expect(async () => {
        const { stream } = agent.stream(prompt, { provider: 'claude-code' as ProviderId });
        for await (const _event of stream) {
          // Just consume
        }
      }).rejects.toThrow(/Harness 'claude-code' is not registered/);
    });

    it('should switch providers between streams', async () => {
      // Arrange: Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      const claudeCodeProvider = registry.get('claude-code')!;

      vi.clearAllMocks();

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Act 1: First stream with anthropic (agent default)
      const { stream: s1 } = agent.stream(prompt);
      for await (const _event of s1) { /* consume */ }

      // Act 2: Second stream with claude-code override
      const { stream: s2 } = agent.stream(prompt, { provider: 'claude-code' });
      for await (const _event of s2) { /* consume */ }

      // Act 3: Third stream back to anthropic (no override)
      const { stream: s3 } = agent.stream(prompt);
      for await (const _event of s3) { /* consume */ }

      // Assert: Both providers were used correctly
      expect(anthropicProvider.execute).toHaveBeenCalledTimes(2);
      expect(claudeCodeProvider.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('providerOptions override', () => {
    it('should use agent options when no prompt override', async () => {
      // Arrange: Agent with provider options
      const agent = new Agent({
        provider: 'anthropic',
        providerOptions: { timeout: 10000, apiKey: 'sk-agent' }
      });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;

      vi.clearAllMocks();

      // Act
      const { stream } = agent.stream(prompt);
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Agent options were passed to provider
      expect(anthropicProvider.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            sessionId: undefined  // Will be set by resolved options
          })
        }),
        expect.any(Function),
        expect.anything()
      );
    });

    it('should merge prompt options with agent options', async () => {
      // Arrange: Agent with provider options
      const agent = new Agent({
        provider: 'anthropic',
        providerOptions: { timeout: 10000, apiKey: 'sk-agent' }
      });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider and capture the options passed
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      let capturedOptions: any = {};

      (anthropicProvider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
        capturedOptions = request.options;
        yield { type: 'text_delta', delta: 'test' } as StreamEvent;
        return createSuccessResponse(
          { result: 'test' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Prompt with additional options
      const { stream } = agent.stream(prompt, {
        providerOptions: { timeout: 5000, endpoint: 'https://prompt.com' }
      });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Prompt options override agent options
      expect(capturedOptions.sessionId).toBeUndefined();
    });

    it('should merge prompt options with global defaults', async () => {
      // Arrange: Configure global defaults
      configureProviders({
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: { timeout: 30000, apiKey: 'sk-global', endpoint: 'https://api.global.com' }
        }
      });

      const agent = new Agent(); // No agent options
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider and capture the options
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      let capturedOptions: any = {};

      (anthropicProvider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
        capturedOptions = request.options;
        yield { type: 'text_delta', delta: 'test' } as StreamEvent;
        return createSuccessResponse(
          { result: 'test' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Prompt with options
      const { stream } = agent.stream(prompt, {
        providerOptions: { timeout: 5000 }
      });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Prompt options merged with global defaults
      expect(capturedOptions.sessionId).toBeUndefined();
    });

    it('should handle full cascade: global → agent → prompt options', async () => {
      // Arrange: Configure global defaults
      configureProviders({
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: {
            timeout: 30000,
            apiKey: 'sk-global',
            endpoint: 'https://api.global.com'
          },
          'claude-code': {
            timeout: 60000,
            endpoint: 'http://localhost:8080'
          }
        }
      });

      // Agent with options
      const agent = new Agent({
        provider: 'claude-code',
        providerOptions: { timeout: 10000, headers: { 'X-Agent': 'agent-value' } }
      });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider and capture options
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      let capturedOptions: any = {};

      (anthropicProvider.execute as any).mockImplementation(async function* (request: ProviderRequest) {
        capturedOptions = request.options;
        yield { type: 'text_delta', delta: 'test' } as StreamEvent;
        return createSuccessResponse(
          { result: 'test' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Prompt with provider and options override
      const { stream } = agent.stream(prompt, {
        provider: 'anthropic',
        providerOptions: { apiKey: 'sk-prompt', timeout: 5000 }
      });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Full cascade applied correctly
      expect(anthropicProvider.execute).toHaveBeenCalled();
      expect(capturedOptions.sessionId).toBeUndefined();
    });

    it('should allow prompt options only (no provider override)', async () => {
      // Arrange: Agent with provider
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;

      vi.clearAllMocks();

      // Act: Only override options, not provider
      const { stream } = agent.stream(prompt, {
        providerOptions: { timeout: 60000 }
      });
      for await (const _event of stream) {
        // Just consume
      }

      // Assert: Same provider, but with new options
      expect(anthropicProvider.execute).toHaveBeenCalled();
    });
  });

  describe('streaming events with provider override', () => {
    it('should stream events from overridden provider', async () => {
      // Arrange: Agent with anthropic
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get claude-code provider and mock streaming behavior
      const registry = ProviderRegistry.getInstance();
      const claudeCodeProvider = registry.get('claude-code')!;

      (claudeCodeProvider.execute as any).mockImplementation(async function* () {
        yield { type: 'text_delta', delta: 'Open' } as StreamEvent;
        yield { type: 'text_delta', delta: 'Code' } as StreamEvent;
        yield { type: 'done', finishReason: 'stop' } as StreamEvent;
        return createSuccessResponse(
          { result: 'claude-code' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      vi.clearAllMocks();

      // Act: Stream with claude-code override
      const { stream } = agent.stream(prompt, { provider: 'claude-code' });
      const events: StreamEvent[] = [];

      for await (const event of stream) {
        events.push(event);
      }

      // Assert: Events came from claude-code provider
      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: 'text_delta', delta: 'Open' });
      expect(events[1]).toEqual({ type: 'text_delta', delta: 'Code' });
      expect(events[2]).toEqual({ type: 'done', finishReason: 'stop' });
      expect(claudeCodeProvider.execute).toHaveBeenCalled();
    });

    it('should yield complete response from overridden provider', async () => {
      // Arrange
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      const registry = ProviderRegistry.getInstance();
      const claudeCodeProvider = registry.get('claude-code')!;

      const mockResponse = createSuccessResponse(
        { result: 'final result' },
        { agentId: 'test', timestamp: Date.now(), duration: 123 }
      );

      (claudeCodeProvider.execute as any).mockImplementation(async function* () {
        yield { type: 'text_delta', delta: 'streaming' } as StreamEvent;
        return mockResponse;
      });

      vi.clearAllMocks();

      // Act
      const { stream } = agent.stream(prompt, { provider: 'claude-code' });
      const events: StreamEvent[] = [];

      for await (const event of stream) {
        events.push(event);
      }

      // Assert: Events were yielded from claude-code provider
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'text_delta', delta: 'streaming' });
      expect(claudeCodeProvider.execute).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error for unregistered provider', async () => {
      // Arrange: First reset everything and create a fresh environment
      ProviderRegistry['_resetForTesting']();
      const anthropicProvider = createMockProvider('anthropic');
      ProviderRegistry.getInstance().register(anthropicProvider);

      // Create agent AFTER resetting
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Act & Assert: Try to stream with unregistered provider
      await expect(async () => {
        const { stream } = agent.stream(prompt, { provider: 'claude-code' as ProviderId });
        for await (const _event of stream) {
          // Just consume
        }
      }).rejects.toThrow(/Harness 'claude-code' is not registered/);
    });

    it('should yield error event on provider execution failure', async () => {
      // Arrange
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;

      (anthropicProvider.execute as any).mockImplementation(async function* () {
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
  });

  describe('multiple streams with different providers', () => {
    it('should handle sequential streams with different providers', async () => {
      // Arrange
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get providers
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = registry.get('anthropic')!;
      const claudeCodeProvider = registry.get('claude-code')!;

      vi.clearAllMocks();

      // Act: Multiple streams with different providers
      const { stream: s1 } = agent.stream(prompt, { provider: 'anthropic' });
      for await (const _event of s1) { /* consume */ }

      const { stream: s2 } = agent.stream(prompt, { provider: 'claude-code' });
      for await (const _event of s2) { /* consume */ }

      const { stream: s3 } = agent.stream(prompt); // Uses agent default (anthropic)
      for await (const _event of s3) { /* consume */ }

      // Assert: Correct provider used for each stream
      expect(anthropicProvider.execute).toHaveBeenCalledTimes(2);
      expect(claudeCodeProvider.execute).toHaveBeenCalledTimes(1);
    });
  });
});
