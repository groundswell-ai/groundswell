/**
 * Unit tests for Agent.prompt() with prompt-level harness override
 *
 * Tests the configuration cascade: global → agent → prompt
 * Verifies that prompt-level harness overrides correctly switch the execution
 * harness, build a HarnessRequest, wire AgentHooks→HarnessHookEvents, and
 * maintain agent-response parity.
 *
 * This file exercises the NEW {harness} path; the legacy {provider} fallback
 * path is covered by agent-prompt-provider-override.test.ts (unchanged regression).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';
import type {
  Harness,
  HarnessId,
  HarnessCapabilities,
  HarnessRequest,
} from '../../types/harnesses.js';
import type { ModelSpec } from '../../types/providers.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../../types/providers.js';
import { z } from 'zod';
import { createSuccessResponse, isError } from '../../types/agent.js';

/**
 * Helper function to create mock Harness for testing.
 * Structurally compatible with Provider (accepted by HarnessRegistry.register).
 */
function createMockHarness(
  id: HarnessId,
  executeImpl?: (request: HarnessRequest) => Promise<any>,
): Harness {
  const capabilities: HarnessCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  const mockExecute = vi.fn();
  if (executeImpl) {
    mockExecute.mockImplementation(executeImpl);
  } else {
    mockExecute.mockImplementation(async () =>
      createSuccessResponse(
        { result: 'test response' },
        { agentId: 'test-agent', timestamp: Date.now() },
      ),
    );
  }

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn(
      (model: string): ModelSpec => ({ provider: id, model, raw: model }),
    ),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}

describe('Agent.prompt() harness override', () => {
  beforeEach(() => {
    // Reset global config before each test
    resetGlobalConfig();

    // Register mock harnesses ('anthropic' is the legacy global default — needed by
    // new Agent() constructor which resolves via getGlobalProviderConfig).
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
  });

  afterEach(() => {
    // Clean up registry after each test
    HarnessRegistry['_resetForTesting']();
    resetGlobalConfig();
  });

  it('resolves an explicit prompt-level harness override and calls harness.execute', async () => {
    // Arrange: Agent with no specific harness
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;

    vi.clearAllMocks();

    // Act: Override harness at prompt level
    await agent.prompt(prompt, { harness: 'pi' });

    // Assert: pi harness was called
    expect(piHarness.execute).toHaveBeenCalled();
  });

  it('uses the agent-level harness when no prompt override', async () => {
    // Arrange: Agent configured with pi harness
    const agent = new Agent({ harness: 'pi' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;

    vi.clearAllMocks();

    // Act
    await agent.prompt(prompt);

    // Assert: pi harness was used
    expect(piHarness.execute).toHaveBeenCalled();
  });

  it('prompt harness override beats the agent harness', async () => {
    // Arrange: Agent configured with pi harness
    const agent = new Agent({ harness: 'pi' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;
    const claudeCodeHarness = registry.get('claude-code')!;

    vi.clearAllMocks();

    // Act: Override to claude-code at prompt level
    await agent.prompt(prompt, { harness: 'claude-code' });

    // Assert: claude-code was called, pi was not
    expect(claudeCodeHarness.execute).toHaveBeenCalled();
    expect(piHarness.execute).not.toHaveBeenCalled();
  });

  it('falls back to the legacy provider override', async () => {
    // Arrange: 'anthropic' already registered in beforeEach
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const anthropicHarnessInst = registry.get('anthropic')!;

    vi.clearAllMocks();

    // Act: Use legacy { provider: 'anthropic' }
    await agent.prompt(prompt, { provider: 'anthropic' as any });

    // Assert: anthropic harness was called
    expect(anthropicHarnessInst.execute).toHaveBeenCalled();
  });

  it('returns PROVIDER_NOT_FOUND for an unregistered harness', async () => {
    // Arrange: Reset registry to have only 'anthropic' + 'pi' (no 'claude-code')
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(createMockHarness('pi'));

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    // Act: 'claude-code' auto-registers (P1.M1.T2.S1); use a non-built-in id to exercise PROVIDER_NOT_FOUND.
    const response = await agent.prompt(prompt, {
      harness: 'nonexistent' as HarnessId,
    });

    // Assert
    expect(response.status).toBe('error');
    if (isError(response)) {
      expect(response.error.code).toBe('PROVIDER_NOT_FOUND');
      expect(response.error.message).toContain('not registered');
      expect(response.error.message).toContain('nonexistent');
      expect(response.error.recoverable).toBe(false);
    }
  });

  it('builds a HarnessRequest with the expected options shape', async () => {
    // Arrange: Capture the request arg
    let captured: HarnessRequest | undefined;
    const piHarness = createMockHarness('pi', async (req: HarnessRequest) => {
      captured = req;
      return createSuccessResponse(
        { result: 'captured' },
        { agentId: 'test', timestamp: Date.now() },
      );
    });
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(piHarness);

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'hello',
      responseFormat: z.object({ result: z.string() }),
      system: 'sys',
    });

    // Act
    await agent.prompt(prompt, { harness: 'pi', model: 'anthropic/claude-sonnet-4' });

    // Assert
    expect(captured).toBeDefined();
    expect(captured!.prompt).toBe('hello');
    expect(captured!.options).toMatchObject({
      model: 'anthropic/claude-sonnet-4',
      systemPrompt: 'sys',
      sessionId: undefined,
      hooks: expect.anything(),
    });
  });

  it('maps AgentHooks.preToolUse/postToolUse to HarnessHookEvents.onToolStart/onToolEnd', async () => {
    // Arrange: Harness that invokes the received hooks
    const piHarness = createMockHarness('pi', async (req: HarnessRequest) => {
      const hooks = req.options.hooks;
      const toolReq: ToolExecutionRequest = { name: 'test-tool', input: {} };
      const toolRes: ToolExecutionResult = { content: 'done', isError: false };
      await hooks?.onToolStart?.(toolReq);
      await hooks?.onToolEnd?.(toolReq, toolRes, 42);
      return createSuccessResponse(
        { result: 'hooks-fired' },
        { agentId: 'test', timestamp: Date.now() },
      );
    });
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(piHarness);

    const preHook = vi.fn();
    const postHook = vi.fn();

    const agent = new Agent({
      harness: 'pi',
      hooks: {
        preToolUse: [preHook],
        postToolUse: [postHook],
      },
    });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    // Act
    await agent.prompt(prompt);

    // Assert: preToolUse hook fired as onToolStart, postToolUse as onToolEnd
    expect(preHook).toHaveBeenCalled();
    expect(postHook).toHaveBeenCalled();
  });

  it('preserves agent-response parity on success with structured output', async () => {
    // Arrange: claude-code returns valid structured data
    const claudeCodeHarness = createMockHarness('claude-code', async () => {
      return createSuccessResponse(
        { result: 'ok' },
        { agentId: 'test', timestamp: Date.now() },
      );
    });
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(claudeCodeHarness);

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    // Act
    const response = await agent.prompt(prompt, { harness: 'claude-code' });

    // Assert
    expect(response.status).toBe('success');
    if (response.status === 'success') {
      expect(response.data.result).toBe('ok');
    }
  });

  it('preserves agent-response parity on harness execution error', async () => {
    // Arrange: pi harness throws
    const piHarness = createMockHarness('pi', async () => {
      throw new Error('boom');
    });
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(piHarness);

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    // Act
    const response = await agent.prompt(prompt, { harness: 'pi' });

    // Assert
    expect(response.status).toBe('error');
    if (isError(response)) {
      expect(response.error.code).toBe('PROVIDER_EXECUTION_FAILED');
      expect(response.error.message).toContain('Harness execution error');
    }
  });
});
