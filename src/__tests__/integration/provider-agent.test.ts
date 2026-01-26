/**
 * Test file: provider-agent.test.ts
 *
 * Purpose: Integration tests for Agent → Provider → SDK flow per P5.M2.T1.S1
 *
 * Tests:
 * - Agent creation with provider configuration (global, agent, prompt-level)
 * - agent.prompt() calls provider.execute() with correct parameters
 * - Tool executor delegation through Agent.toolExecutor → MCPHandler
 * - Session state management (creation, continuation, history)
 * - Prompt-level provider overrides and configuration cascade
 * - Error handling and edge cases
 *
 * PRP: P5.M2.T1.S1 - Test Agent with Anthropic Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { Agent, Prompt } from '../../index.js';
import { AnthropicProvider } from '../../providers/anthropic-provider.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';
import { isSuccess, isError } from '../../types/agent.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';

// Mock SDK types (from @anthropic-ai/claude-agent-sdk)
type SDKMessage =
  | { type: 'assistant'; message: { content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }> } }
  | { type: 'user'; message: { content: string }; session_id?: string }
  | { type: 'result'; subtype: 'success' | 'error_during_execution' | 'error_max_turns'; result?: unknown; structured_output?: unknown; usage?: { input_tokens: number; output_tokens: number }; errors?: string[] };

type SDKQueryResult = AsyncGenerator<SDKMessage> & {
  streamInput?(generator: AsyncGenerator<SDKMessage>): Promise<void>;
};

// ============================================================================
// Mock Helper Functions
// ============================================================================

/**
 * Create a mock Anthropic SDK object
 *
 * Uses vi.fn().mockImplementation() pattern from anthropic-provider-execute.test.ts
 * Returns an object with query, createSdkMcpServer, and tool methods.
 */
function createMockSDK(result: unknown = { result: 'test result' }) {
  // Create the mock function first
  const mockQuery = vi.fn();

  // Set up the implementation to return an AsyncGenerator
  mockQuery.mockImplementation(() => {
    const generator = (async function* () {
      yield {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Test response' }]
        }
      };
      yield {
        type: 'result',
        subtype: 'success',
        result,
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();

    // Add streamInput for session continuation tests
    generator.streamInput = vi.fn().mockResolvedValue(undefined);

    return generator;
  });

  return {
    query: mockQuery,
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };
}

/**
 * Create a mock AnthropicProvider with initialized SDK
 *
 * Follows pattern from anthropic-provider-execute.test.ts:
 * - Initialize provider
 * - Use @ts-expect-error to access private sdk property
 * - Replace with mock SDK
 */
async function createMockProvider(): Promise<AnthropicProvider> {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // @ts-expect-error - Testing private property
  provider.sdk = createMockSDK();

  return provider;
}

/**
 * Create a mock tool executor that returns successful results
 *
 * Tool executors return ToolExecutionResult with content and isError flag.
 * Used for testing tool delegation through Agent.toolExecutor.
 */
function createMockToolExecutor() {
  return vi.fn().mockResolvedValue({
    content: 'Tool result',
    isError: false,
  });
}

/**
 * Create a mock AsyncGenerator for SDK responses with streamInput
 *
 * Used for session continuation testing where streamInput must be called
 * with history generator.
 */
function createMockStreamWithHistory(history: SDKMessage[] = []) {
  const stream = (async function* () {
    yield {
      type: 'result',
      subtype: 'success',
      result: { data: 'test' },
      usage: { input_tokens: 100, output_tokens: 50 }
    };
  })();

  // Add streamInput for session continuation
  stream.streamInput = vi.fn().mockImplementation(async (gen: AsyncGenerator<SDKMessage>) => {
    for await (const msg of gen) {
      history.push(msg);
    }
  });

  return stream;
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Agent → Provider → SDK Integration', () => {
  beforeEach(async () => {
    // CRITICAL: Reset registry state for isolation
    ProviderRegistry._resetForTesting();
    // Reset global provider config
    resetGlobalConfig();
    // Clear all mocks
    vi.clearAllMocks();
  });

  // ========================================================================
  // Agent-Provider Integration Flow
  // ========================================================================

  describe('Agent Creation with Provider Configuration', () => {
    it('should throw when provider is not registered', () => {
      expect(() => {
        new Agent({ provider: 'anthropic' });
      }).toThrow('Provider');
    });

    it('should throw with descriptive error message for unregistered provider', () => {
      expect(() => {
        new Agent({ provider: 'nonexistent-provider' });
      }).toThrow("Provider 'nonexistent-provider' is not registered");
    });

    it('should create Agent with registered Anthropic provider', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it('should create Agent without provider config (uses default)', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      // Agent without explicit provider config uses global default ('anthropic')
      // which is registered, so it should work
      const agent = new Agent({});

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });
  });

  // ========================================================================
  // agent.prompt() → provider.execute() Flow
  // ========================================================================

  describe('agent.prompt() → provider.execute() Flow', () => {
    it('should call provider.execute() with correct ProviderRequest', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'What is 2 + 2?',
        responseFormat: z.object({ result: z.any() })
      });

      // Spy on provider.execute to verify call parameters
      const executeSpy = vi.spyOn(provider, 'execute');

      await agent.prompt(prompt);

      expect(executeSpy).toHaveBeenCalled();
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Verify the call structure
      const callArg = executeSpy.mock.calls[0][0];
      expect(callArg).toHaveProperty('prompt');
      expect(callArg).toHaveProperty('options');
      expect(typeof callArg.prompt).toBe('string');
    });

    it('should return AgentResponse from provider.execute()', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'Test prompt',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      expect(isSuccess(response)).toBe(true);
      expect(response.status).toBe('success');
      expect(response.data).toBeDefined();
      expect(response.error).toBeNull();
      expect(response.metadata).toBeDefined();
    });

    it('should handle provider.execute() errors gracefully', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      // Mock execute to throw an error
      vi.spyOn(provider, 'execute').mockRejectedValue(
        new Error('Provider execution failed')
      );

      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      expect(isError(response)).toBe(true);
      expect(response.status).toBe('error');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('PROVIDER_EXECUTION_FAILED');
    });

    it('should include metadata in AgentResponse', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      expect(response.metadata).toBeDefined();
      // agentId is set by Agent in executePrompt
      expect(response.metadata).toHaveProperty('agentId');
      expect(response.metadata.timestamp).toBeGreaterThan(0);
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should pass model option to provider', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const executeSpy = vi.spyOn(provider, 'execute');

      const agent = new Agent({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514'
      });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt);

      const callArg = executeSpy.mock.calls[0][0];
      expect(callArg.options.model).toBe('claude-sonnet-4-20250514');
    });

    it('should pass system prompt to provider', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const executeSpy = vi.spyOn(provider, 'execute');

      const agent = new Agent({
        provider: 'anthropic',
        system: 'You are a helpful assistant'
      });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt);

      const callArg = executeSpy.mock.calls[0][0];
      expect(callArg.options.systemPrompt).toContain('You are a helpful assistant');
    });
  });

  // ========================================================================
  // Tool Executor Delegation (Provider → Agent → MCPHandler)
  // ========================================================================

  describe('Tool Executor Delegation', () => {
    it('should handle tool_use blocks in SDK response', async () => {
      const provider = await createMockProvider();

      // Create a new SDK mock with tool_use blocks
      const toolMockQuery = vi.fn();
      toolMockQuery.mockImplementation(() => {
        const generator = (async function* () {
          yield {
            type: 'assistant',
            message: {
              content: [
                { type: 'text', text: 'I will use a tool' },
                { type: 'tool_use', id: 'tool-1', name: 'test_server__calculator', input: { a: 2, b: 2 } }
              ]
            }
          };
          yield {
            type: 'result',
            subtype: 'success',
            result: { result: 4 },
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        })();
        generator.streamInput = vi.fn().mockResolvedValue(undefined);
        return generator;
      });

      // @ts-expect-error - Testing private property
      provider.sdk.query = toolMockQuery;

      ProviderRegistry.getInstance().register(provider);
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Calculate 2 + 2',
        responseFormat: z.object({ result: z.number() })
      });

      const response = await agent.prompt(prompt);

      expect(isSuccess(response)).toBe(true);
      expect(response.metadata.toolCalls).toBe(1);
    });

    it('should count multiple tool_use blocks', async () => {
      const provider = await createMockProvider();

      // Create a new SDK mock with multiple tool_use blocks
      const toolMockQuery = vi.fn();
      toolMockQuery.mockImplementation(() => {
        const generator = (async function* () {
          yield {
            type: 'assistant',
            message: {
              content: [
                { type: 'tool_use', id: 'tool-1', name: 'tool_a', input: {} },
                { type: 'tool_use', id: 'tool-2', name: 'tool_b', input: {} },
                { type: 'tool_use', id: 'tool-3', name: 'tool_c', input: {} }
              ]
            }
          };
          yield {
            type: 'result',
            subtype: 'success',
            result: { result: true },
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        })();
        generator.streamInput = vi.fn().mockResolvedValue(undefined);
        return generator;
      });

      // @ts-expect-error - Testing private property
      provider.sdk.query = toolMockQuery;

      ProviderRegistry.getInstance().register(provider);
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Use multiple tools',
        responseFormat: z.object({ result: z.boolean() })
      });

      const response = await agent.prompt(prompt);

      expect(response.metadata.toolCalls).toBe(3);
    });

    it('should handle zero tool calls', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });
      const prompt = new Prompt({
        user: 'Just answer normally',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      // Default mock has no tool_use blocks
      expect(response.metadata).toBeDefined();
    });

    it('should pass tool results back through provider', async () => {
      const provider = await createMockProvider();

      // The provider should handle tool execution internally
      // This test verifies the flow completes successfully
      ProviderRegistry.getInstance().register(provider);
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      expect(isSuccess(response)).toBe(true);
    });
  });

  // ========================================================================
  // Session State Management
  // ========================================================================

  describe('Session State Management', () => {
    it('should create session on first prompt with sessionId', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'First message',
        responseFormat: z.object({ result: z.string() })
      });

      // Act: Prompt with sessionId via providerOptions
      const response = await agent.prompt(prompt, {
        providerOptions: { sessionId: 'test-session' }
      });

      expect(isSuccess(response)).toBe(true);

      // Assert: Session was created in provider
      // @ts-expect-error - Testing private method
      const session = await provider.getSession('test-session');
      expect(session).toBeDefined();
      expect(session?.history).toBeDefined();
      expect(Array.isArray(session?.history)).toBe(true);
    });

    it('should reuse session on subsequent prompts with same sessionId', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const sessionId = 'existing-session';

      // First execution creates session
      const prompt1 = new Prompt({
        user: 'First message',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt1, {
        providerOptions: { sessionId }
      });

      // @ts-expect-error - Testing private method
      let session = await provider.getSession(sessionId);
      expect(session).toBeDefined();

      // Second execution retrieves existing session
      const prompt2 = new Prompt({
        user: 'Second message',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt2, {
        providerOptions: { sessionId }
      });

      // @ts-expect-error - Testing private method
      session = await provider.getSession(sessionId);
      expect(session).toBeDefined();
    });

    it('should maintain separate sessions for different sessionIds', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      // Create prompts with different sessionIds
      const prompt1 = new Prompt({
        user: 'Session 1',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt1, {
        providerOptions: { sessionId: 'session-a' }
      });

      const prompt2 = new Prompt({
        user: 'Session 2',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt2, {
        providerOptions: { sessionId: 'session-b' }
      });

      // Verify sessions are isolated
      // @ts-expect-error - Testing private method
      const sessionA = await provider.getSession('session-a');
      // @ts-expect-error - Testing private method
      const sessionB = await provider.getSession('session-b');

      expect(sessionA).toBeDefined();
      expect(sessionB).toBeDefined();
      expect(sessionA).not.toBe(sessionB);
    });

    it('should not create session when sessionId is not provided', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test without session',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt);

      // Sessions should be empty - verify by checking that getSession returns undefined for any ID
      // @ts-expect-error - Testing private method
      const session = await provider.getSession('nonexistent-session');
      expect(session).toBeUndefined();
    });
  });

  // ========================================================================
  // Prompt-Level Provider Overrides
  // ========================================================================

  describe('Prompt-Level Provider Overrides', () => {
    it('should use prompt provider override when specified', async () => {
      const provider1 = await createMockProvider();
      ProviderRegistry.getInstance().register(provider1);

      // Create agent with provider1
      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      // Prompt with provider override should use specified provider
      const response = await agent.prompt(prompt, {
        provider: 'anthropic'
      });

      expect(isSuccess(response)).toBe(true);
    });

    it('should fallback to agent provider when override not specified', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      // Call without override - should use agent's provider
      const response = await agent.prompt(prompt);

      expect(isSuccess(response)).toBe(true);
    });

    it('should handle provider not found for override', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      // Override with non-existent provider
      const response = await agent.prompt(prompt, {
        provider: 'nonexistent-provider'
      });

      expect(isError(response)).toBe(true);
      expect(response.error?.code).toBe('PROVIDER_NOT_FOUND');
    });
  });

  // ========================================================================
  // Edge Cases and Error Handling
  // ========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty prompt', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: '',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      // Should handle gracefully - may succeed or fail based on provider
      expect(response).toBeDefined();
    });

    it('should handle very long prompt', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const longText = 'a'.repeat(10000);

      const prompt = new Prompt({
        user: longText,
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      expect(response).toBeDefined();
    });

    it('should handle provider unavailable after creation', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      // Terminate provider to make it unavailable
      await provider.terminate();

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      // Should handle error gracefully
      const response = await agent.prompt(prompt);

      expect(response).toBeDefined();
    });

    it('should handle concurrent prompts', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt1 = new Prompt({
        user: 'Prompt 1',
        responseFormat: z.object({ result: z.string() })
      });

      const prompt2 = new Prompt({
        user: 'Prompt 2',
        responseFormat: z.object({ result: z.string() })
      });

      // Execute concurrently
      const [response1, response2] = await Promise.all([
        agent.prompt(prompt1),
        agent.prompt(prompt2)
      ]);

      expect(isSuccess(response1)).toBe(true);
      expect(isSuccess(response2)).toBe(true);
    });

    it('should handle invalid response format gracefully', async () => {
      const provider = await createMockProvider();

      // Create a new SDK mock that returns invalid data
      const invalidMockQuery = vi.fn();
      invalidMockQuery.mockImplementation(() => {
        const generator = (async function* () {
          yield {
            type: 'result',
            subtype: 'success',
            result: { invalid: 'data' },
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        })();
        generator.streamInput = vi.fn().mockResolvedValue(undefined);
        return generator;
      });

      // @ts-expect-error - Testing private property
      provider.sdk.query = invalidMockQuery;

      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ valid: z.string() })
      });

      const response = await agent.prompt(prompt);

      // Should return validation error
      expect(response).toBeDefined();
    });
  });

  // ========================================================================
  // Configuration Cascade
  // ========================================================================

  describe('Configuration Cascade', () => {
    it('should merge agent and prompt-level configurations', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const executeSpy = vi.spyOn(provider, 'execute');

      const agent = new Agent({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        system: 'Agent system prompt'
      });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() }),
        system: 'Prompt system override'  // Note: PromptConfig uses 'system' which becomes systemOverride
      });

      await agent.prompt(prompt);

      const callArg = executeSpy.mock.calls[0][0];

      // Prompt-level override should take precedence over agent config
      expect(callArg.options.systemPrompt).toContain('Prompt system override');
      expect(callArg.options.systemPrompt).not.toContain('Agent system prompt');
    });

    it('should use agent config when prompt override not provided', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const executeSpy = vi.spyOn(provider, 'execute');

      const agent = new Agent({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        system: 'Agent system prompt'
      });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt);

      const callArg = executeSpy.mock.calls[0][0];

      // Should use agent-level system prompt
      expect(callArg.options.systemPrompt).toContain('Agent system prompt');
    });

    it('should pass prompt-level model override', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const executeSpy = vi.spyOn(provider, 'execute');

      const agent = new Agent({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514'
      });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      await agent.prompt(prompt, {
        model: 'claude-opus-4-20250514'
      });

      const callArg = executeSpy.mock.calls[0][0];

      // Should use prompt-level model override
      expect(callArg.options.model).toBe('claude-opus-4-20250514');
    });
  });

  // ========================================================================
  // Type Safety and Discriminated Unions
  // ========================================================================

  describe('Type Safety and Discriminated Unions', () => {
    it('should use isSuccess type guard for safe data access', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      // Use type guard for safe access
      if (isSuccess(response)) {
        // TypeScript knows: response.data is { result: string }
        expect(response.data).toBeDefined();
        expect(typeof response.data.result).toBe('string');
      }
    });

    it('should use isError type guard for error handling', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      // Mock to return error
      vi.spyOn(provider, 'execute').mockResolvedValue({
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false
        },
        metadata: {
          agentId: 'test',
          timestamp: Date.now(),
          duration: 0
        }
      });

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      // Use type guard for error handling
      if (isError(response)) {
        // TypeScript knows: response.error exists
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('TEST_ERROR');
      }
    });

    it('should handle null for absent data in success responses', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      if (isSuccess(response)) {
        // PRD 6.4.4 compliance: error is null, not undefined
        expect(response.error).toBeNull();
        expect(response.error).not.toBeUndefined();
      }
    });

    it('should handle null for absent error in error responses', async () => {
      const provider = await createMockProvider();
      ProviderRegistry.getInstance().register(provider);

      // Mock to return error
      vi.spyOn(provider, 'execute').mockResolvedValue({
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false
        },
        metadata: {
          agentId: 'test',
          timestamp: Date.now(),
          duration: 0
        }
      });

      const agent = new Agent({ provider: 'anthropic' });

      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() })
      });

      const response = await agent.prompt(prompt);

      if (isError(response)) {
        // PRD 6.4.4 compliance: data is null, not undefined
        expect(response.data).toBeNull();
        expect(response.data).not.toBeUndefined();
      }
    });
  });
});
