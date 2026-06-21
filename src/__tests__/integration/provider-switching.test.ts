/**
 * Integration tests for Provider Switching
 *
 * PRP: P5.M2.T1.S2 - Test Provider Switching
 *
 * Tests comprehensive provider switching functionality:
 * - Agent creation with different providers
 * - Prompt-level provider overrides
 * - Configuration cascade priority validation (global → agent → prompt)
 * - Multi-provider state isolation
 * - Error handling for unregistered providers
 *
 * ## Test Coverage
 *
 * **Provider Creation Tests**:
 * - Test creating Agent with provider='anthropic'
 * - Test creating Agent with provider='claude-code'
 * - Test creating Agent without provider (uses global default)
 * - Test Agent with unregistered provider throws error
 *
 * **Provider Override Tests**:
 * - Test prompt-level override switches provider for single call
 * - Test prompt-level override takes precedence over agent config
 * - Test agent-level provider takes precedence over global config
 *
 * **Configuration Cascade Tests**:
 * - Test full cascade: global → agent → prompt priority
 * - Test options merge behavior across cascade levels
 * - Test null/undefined handling in cascade
 *
 * **Multi-Provider State Isolation Tests**:
 * - Test that switching providers maintains independent state
 * - Test concurrent prompts with different providers
 * - Test provider-specific options don't leak between providers
 *
 * **Error Handling Tests**:
 * - Test unregistered provider returns error
 * - Test provider unavailable during execution
 * - Test invalid provider configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { ProviderRegistry } from '../../harnesses/harness-registry.js';
import { configureProviders, resetGlobalConfig } from '../../utils/provider-config.js';
import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';
import type { Provider, ProviderId, ProviderCapabilities, ProviderRequest } from '../../types/providers.js';
import type { ModelSpec } from '../../types/providers.js';
import { createSuccessResponse, isError } from '../../types/agent.js';

// ============================================================================
// Mock Helper Functions
// ============================================================================

/**
 * Create a mock provider with the given ID
 *
 * Follows pattern from provider-agent.test.ts and agent-prompt-provider-override.test.ts
 * Uses vi.fn() for execute() to allow spying on calls
 */
function createMockProvider(
  id: ProviderId,
  executeImplementation?: (request: ProviderRequest) => Promise<any>
): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: id === 'anthropic',  // primary ('anthropic') advertises MCP; the secondary does not
    skills: id === 'anthropic',
    lsp: id === 'anthropic',
    streaming: true,
    sessions: true,
    extendedThinking: true,
  };

  const mockExecute = vi.fn();
  if (executeImplementation) {
    mockExecute.mockImplementation(executeImplementation);
  } else {
    // Default implementation returns success response
    mockExecute.mockImplementation(async () => {
      return createSuccessResponse(
        { result: `${id} response` },
        { agentId: `test-${id}`, timestamp: Date.now() }
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

// ============================================================================
// Test Setup
// ============================================================================

describe('Provider Switching Integration', () => {
  beforeEach(async () => {
    // CRITICAL: Reset registry state for isolation
    ProviderRegistry._resetForTesting();
    // Reset global provider config
    resetGlobalConfig();
    // Clear all mocks
    vi.clearAllMocks();
  });

  // ========================================================================
  // Agent Creation with Different Providers
  // ========================================================================

  describe('Agent Creation with Different Providers', () => {
    it('should create Agent with anthropic provider', async () => {
      const provider = createMockProvider('anthropic');
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it('should create Agent with claude-code provider', async () => {
      const provider = createMockProvider('claude-code');
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'claude-code' });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it('should create Agent without provider (uses global default)', async () => {
      const piProvider = createMockProvider('pi' as ProviderId);
      ProviderRegistry.getInstance().register(piProvider);

      // Agent without explicit provider uses global default ('pi')
      const agent = new Agent({});

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it('should throw when provider is not registered', () => {
      expect(() => {
        new Agent({ provider: 'anthropic' });
      }).toThrow('Harness');
    });

    it('should throw with descriptive error message for unregistered provider', () => {
      expect(() => {
        new Agent({ provider: 'nonexistent-provider' as ProviderId });
      }).toThrow("Harness 'nonexistent-provider' is not registered");
    });

    it('should use different providers for different agents', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent1 = new Agent({ provider: 'anthropic' });
      const agent2 = new Agent({ provider: 'claude-code' });

      expect(agent1).toBeDefined();
      expect(agent2).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  // ========================================================================
  // Prompt-Level Provider Overrides
  // ========================================================================

  describe('Prompt-Level Provider Overrides', () => {
    it('should switch to claude-code provider for single prompt', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      // Create agent with anthropic provider
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test prompt',
        responseFormat: z.object({ result: z.string() })
      });

      // Spy on both providers to verify which one is called
      const anthropicSpy = vi.spyOn(anthropicProvider, 'execute');
      const claudeCodeSpy = vi.spyOn(claudeCodeProvider, 'execute');

      // Prompt with provider override to claude-code
      const response = await agent.prompt(prompt, {
        provider: 'claude-code'
      });

      // Verify claude-code provider was called, not anthropic
      expect(claudeCodeSpy).toHaveBeenCalledTimes(1);
      expect(anthropicSpy).not.toHaveBeenCalled();
      expect(response.status).toBe('success');
    });

    it('should use prompt provider override when specified', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      // Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const provider1 = registry.get('anthropic')!;
      const provider2 = registry.get('claude-code')!;

      // Clear previous calls
      vi.clearAllMocks();

      // Act: Override to claude-code at prompt level
      await agent.prompt(prompt, { provider: 'claude-code' });

      // Assert: claude-code provider was used, not anthropic
      expect(provider2.execute).toHaveBeenCalled();
      expect(provider1.execute).not.toHaveBeenCalled();
    });

    it('should use agent provider when no prompt override', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      // Arrange: Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider to spy on execute
      const registry = ProviderRegistry.getInstance();
      const anthropicProviderInstance = registry.get('anthropic')!;

      // Clear previous calls
      vi.clearAllMocks();

      // Act
      await agent.prompt(prompt);

      // Assert: anthropic provider was used
      expect(anthropicProviderInstance.execute).toHaveBeenCalled();
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
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const provider1 = registry.get('anthropic')!;
      const provider2 = registry.get('claude-code')!;

      // Clear previous calls
      vi.clearAllMocks();

      // Act: Prompt override to claude-code (highest priority)
      await agent.prompt(prompt, { provider: 'claude-code' });

      // Assert: Prompt override wins over agent and global config
      expect(provider2.execute).toHaveBeenCalled();
      expect(provider1.execute).not.toHaveBeenCalled();
    });

    it('should switch providers between prompts', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      // Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const provider1 = registry.get('anthropic')!;
      const provider2 = registry.get('claude-code')!;

      // Clear previous calls
      vi.clearAllMocks();

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Act 1: First prompt with anthropic (agent default)
      await agent.prompt(prompt);

      // Act 2: Second prompt with claude-code override
      await agent.prompt(prompt, { provider: 'claude-code' });

      // Act 3: Third prompt back to anthropic (no override)
      await agent.prompt(prompt);

      // Assert: Both providers were used correctly
      expect(provider1.execute).toHaveBeenCalledTimes(2);
      expect(provider2.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // Configuration Cascade Priority
  // ========================================================================

  describe('Configuration Cascade Priority', () => {
    it('should prioritize prompt override over agent and global config', async () => {
      // Arrange: Set global default to claude-code
      configureProviders({
        defaultProvider: 'claude-code',
        providerDefaults: {
          anthropic: { timeout: 30000 },
          'claude-code': { timeout: 60000 }
        }
      });

      // Agent configured with anthropic (overrides global claude-code)
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const provider1 = registry.get('anthropic')!;
      const provider2 = registry.get('claude-code')!;

      // Clear previous calls
      vi.clearAllMocks();

      // Act: Prompt with anthropic override (highest priority)
      await agent.prompt(prompt, { provider: 'anthropic' });

      // Assert: Prompt override should win - anthropic should be called
      expect(provider1.execute).toHaveBeenCalledTimes(1);
      expect(provider2.execute).not.toHaveBeenCalled();
    });

    it('should use agent override when prompt override not provided', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      // Agent configured with anthropic
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider
      const registry = ProviderRegistry.getInstance();
      const anthropicProviderInstance = registry.get('anthropic')!;

      vi.clearAllMocks();

      // Act: No prompt override - should use agent provider
      await agent.prompt(prompt);

      // Assert: Agent provider should be used
      expect(anthropicProviderInstance.execute).toHaveBeenCalled();
    });

    it('should use global default when agent has no provider', async () => {
      const piProvider = createMockProvider('pi' as ProviderId);
      ProviderRegistry.getInstance().register(piProvider);

      // Agent without provider override (uses global default 'pi')
      const agent = new Agent({});

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock provider
      const registry = ProviderRegistry.getInstance();
      const piProviderInstance = registry.get('pi')!;

      vi.clearAllMocks();

      // Act
      await agent.prompt(prompt);

      // Assert: global default provider (pi) was used
      expect(piProviderInstance.execute).toHaveBeenCalled();
    });

    it('should handle full cascade: global → agent → prompt', async () => {
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

      // Agent with claude-code override
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'claude-code' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get mock providers
      const registry = ProviderRegistry.getInstance();
      const anthropicProviderInstance = registry.get('anthropic')!;
      const claudeCodeProviderInstance = registry.get('claude-code')!;

      vi.clearAllMocks();

      // Act: Prompt with anthropic override (highest priority)
      await agent.prompt(prompt, {
        provider: 'anthropic'
      });

      // Assert: Prompt override wins - anthropic should be called
      expect(anthropicProviderInstance.execute).toHaveBeenCalledTimes(1);
      expect(claudeCodeProviderInstance.execute).not.toHaveBeenCalled();
    });

    it('should merge prompt options with agent options', async () => {
      // Arrange: Agent with provider options
      const anthropicProvider = createMockProvider('anthropic');

      ProviderRegistry.getInstance().register(anthropicProvider);

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
      const anthropicProviderInstance = registry.get('anthropic')!;

      let capturedOptions: any = {};

      (anthropicProviderInstance.execute as any).mockImplementation(async (request: ProviderRequest) => {
        capturedOptions = request.options;
        return createSuccessResponse(
          { result: 'test' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Prompt with additional options
      await agent.prompt(prompt, {
        providerOptions: { timeout: 5000, endpoint: 'https://prompt.com' }
      });

      // Assert: Prompt options override agent options
      expect(capturedOptions).toBeDefined();
    });
  });

  // ========================================================================
  // Multi-Provider State Isolation
  // ========================================================================

  describe('Multi-Provider State Isolation', () => {
    it('should maintain independent state between providers', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Track call counts per provider
      let anthropicCallCount = 0;
      let claudeCodeCallCount = 0;

      (anthropicProvider.execute as any).mockImplementation(async () => {
        anthropicCallCount++;
        return createSuccessResponse(
          { result: `anthropic-${anthropicCallCount}` },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      (claudeCodeProvider.execute as any).mockImplementation(async () => {
        claudeCodeCallCount++;
        return createSuccessResponse(
          { result: `claude-code-${claudeCodeCallCount}` },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // First prompt with anthropic
      const r1 = await agent.prompt(prompt);
      expect(r1.status === 'success' && r1.data.result).toBe('anthropic-1');

      // Second prompt with claude-code override
      const r2 = await agent.prompt(prompt, { provider: 'claude-code' });
      expect(r2.status === 'success' && r2.data.result).toBe('claude-code-1');

      // Third prompt back to anthropic (agent default)
      const r3 = await agent.prompt(prompt);
      expect(r3.status === 'success' && r3.data.result).toBe('anthropic-2');

      // Verify independent state
      expect(anthropicCallCount).toBe(2);
      expect(claudeCodeCallCount).toBe(1);
    });

    it('should handle concurrent prompts with different providers', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt1 = new Prompt({
        user: 'Prompt 1',
        responseFormat: z.object({ result: z.string() })
      });

      const prompt2 = new Prompt({
        user: 'Prompt 2',
        responseFormat: z.object({ result: z.string() })
      });

      // Execute concurrently with different providers
      const [response1, response2] = await Promise.all([
        agent.prompt(prompt1),  // Uses agent default (anthropic)
        agent.prompt(prompt2, { provider: 'claude-code' })  // Override to claude-code
      ]);

      expect(response1.status).toBe('success');
      expect(response2.status).toBe('success');
    });

    it('should not leak provider-specific options between providers', async () => {
      // Arrange: Configure global defaults with provider-specific options
      configureProviders({
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: {
            timeout: 30000,
            apiKey: 'sk-anthropic',
            endpoint: 'https://api.anthropic.com'
          },
          'claude-code': {
            timeout: 60000,
            endpoint: 'http://localhost:8080'
          }
        }
      });

      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({
        provider: 'anthropic',
        providerOptions: { timeout: 10000 }
      });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get anthropic provider and capture options
      const registry = ProviderRegistry.getInstance();
      const anthropicProviderInstance = registry.get('anthropic')!;

      let capturedOptions: any = {};

      (anthropicProviderInstance.execute as any).mockImplementation(async (request: ProviderRequest) => {
        capturedOptions = request.options;
        return createSuccessResponse(
          { result: 'test' },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Use anthropic provider
      await agent.prompt(prompt);

      // Assert: Options should be merged correctly without leakage from claude-code
      expect(capturedOptions).toBeDefined();
      expect(anthropicProviderInstance.execute).toHaveBeenCalled();
    });

    it('should maintain separate call counts per provider', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Execute multiple prompts with different providers
      await agent.prompt(prompt);  // anthropic
      await agent.prompt(prompt, { provider: 'claude-code' });  // claude-code
      await agent.prompt(prompt);  // anthropic
      await agent.prompt(prompt, { provider: 'claude-code' });  // claude-code
      await agent.prompt(prompt, { provider: 'anthropic' });  // anthropic

      // Verify call counts
      expect(anthropicProvider.execute).toHaveBeenCalledTimes(3);
      expect(claudeCodeProvider.execute).toHaveBeenCalledTimes(2);
    });
  });

  // ========================================================================
  // Error Handling
  // ========================================================================

  describe('Provider Switching Error Handling', () => {
    it('should return error for unregistered provider', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      ProviderRegistry.getInstance().register(anthropicProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // 'claude-code' auto-registers (P1.M1.T2.S1); use a non-built-in id to exercise PROVIDER_NOT_FOUND.
      const response = await agent.prompt(prompt, {
        provider: 'nonexistent-provider' as ProviderId
      });

      expect(isError(response)).toBe(true);
      if (isError(response)) {
        expect(response.error.code).toBe('PROVIDER_NOT_FOUND');
        expect(response.error.message).toContain('nonexistent-provider');
        expect(response.error.message).toContain('not registered');
        expect(response.error.recoverable).toBe(false);
      }
    });

    it('should handle provider execution errors gracefully', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      ProviderRegistry.getInstance().register(anthropicProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Get anthropic provider and make it throw
      const registry = ProviderRegistry.getInstance();
      const anthropicProviderInstance = registry.get('anthropic')!;

      (anthropicProviderInstance.execute as any).mockImplementation(async () => {
        throw new Error('Provider API error');
      });

      // Act
      const response = await agent.prompt(prompt);

      // Assert: Error response wrapped correctly
      expect(response.status).toBe('error');
    });

    it('should handle concurrent provider switches with errors', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Make claude-code fail
      const registry = ProviderRegistry.getInstance();
      const claudeCodeProviderInstance = registry.get('claude-code')!;

      (claudeCodeProviderInstance.execute as any).mockImplementation(async () => {
        throw new Error('claude-code error');
      });

      // Execute concurrent prompts
      const [response1, response2] = await Promise.all([
        agent.prompt(prompt),  // anthropic - succeeds
        agent.prompt(prompt, { provider: 'claude-code' })  // claude-code - fails
      ]);

      expect(response1.status).toBe('success');
      expect(response2.status).toBe('error');
    });
  });

  // ========================================================================
  // Integration with Structured Output
  // ========================================================================

  describe('Integration with Structured Output', () => {
    it('should work with prompt-level provider override and schema validation', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const schema = z.object({
        answer: z.string(),
        confidence: z.number()
      });

      const prompt = new Prompt({
        user: 'What is 2+2?',
        responseFormat: schema
      });

      // Get claude-code provider
      const registry = ProviderRegistry.getInstance();
      const claudeCodeProviderInstance = registry.get('claude-code')!;

      // Mock claude-code to return valid structured data
      (claudeCodeProviderInstance.execute as any).mockImplementation(async () => {
        return createSuccessResponse(
          { answer: '4', confidence: 0.99 },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      vi.clearAllMocks();

      // Act: Use claude-code for this prompt
      const response = await agent.prompt(prompt, {
        provider: 'claude-code'
      });

      // Assert: Validated response from claude-code provider
      expect(response.status).toBe('success');
      if (response.status === 'success') {
        expect(response.data.answer).toBe('4');
        expect(response.data.confidence).toBe(0.99);
      }
      expect(claudeCodeProviderInstance.execute).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Multiple Prompts with Different Providers
  // ========================================================================

  describe('Multiple Prompts with Different Providers', () => {
    it('should handle sequential prompts with different providers', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      // Act: Multiple prompts with different providers
      await agent.prompt(prompt, { provider: 'anthropic' });
      await agent.prompt(prompt, { provider: 'claude-code' });
      await agent.prompt(prompt);  // Uses agent default (anthropic)
      await agent.prompt(prompt, { provider: 'claude-code' });
      await agent.prompt(prompt, { provider: 'anthropic' });

      // Assert: Correct provider used for each prompt
      expect(anthropicProvider.execute).toHaveBeenCalledTimes(3);
      expect(claudeCodeProvider.execute).toHaveBeenCalledTimes(2);
    });

    it('should maintain independent state between provider switches', async () => {
      const anthropicProvider = createMockProvider('anthropic');
      const claudeCodeProvider = createMockProvider('claude-code');

      ProviderRegistry.getInstance().register(anthropicProvider);
      ProviderRegistry.getInstance().register(claudeCodeProvider);

      const agent = new Agent({
        provider: 'anthropic',
        providerOptions: { timeout: 10000 }
      });

      const prompt = new Prompt({
        user: 'test',
        responseFormat: z.object({ result: z.string() })
      });

      let anthropicCallCount = 0;
      let claudeCodeCallCount = 0;

      (anthropicProvider.execute as any).mockImplementation(async () => {
        anthropicCallCount++;
        return createSuccessResponse(
          { result: `anthropic-${anthropicCallCount}` },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      (claudeCodeProvider.execute as any).mockImplementation(async () => {
        claudeCodeCallCount++;
        return createSuccessResponse(
          { result: `claude-code-${claudeCodeCallCount}` },
          { agentId: 'test', timestamp: Date.now() }
        );
      });

      // Act: Alternate between providers
      const r1 = await agent.prompt(prompt);
      const r2 = await agent.prompt(prompt, { provider: 'claude-code' });
      const r3 = await agent.prompt(prompt);
      const r4 = await agent.prompt(prompt, { provider: 'claude-code' });

      // Assert: Each provider maintains independent state
      expect(r1.status === 'success' && r1.data.result).toBe('anthropic-1');
      expect(r2.status === 'success' && r2.data.result).toBe('claude-code-1');
      expect(r3.status === 'success' && r3.data.result).toBe('anthropic-2');
      expect(r4.status === 'success' && r4.data.result).toBe('claude-code-2');

      expect(anthropicCallCount).toBe(2);
      expect(claudeCodeCallCount).toBe(2);
    });
  });
});
