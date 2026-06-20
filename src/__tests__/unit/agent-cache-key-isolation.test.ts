/**
 * Unit tests for Agent cache key isolation — harness + provider (PRD §7.14.5)
 *
 * Validates that the executePrompt cache-key build-site (agent.ts) threads the
 * resolved harness and the LLM provider (from parseModelSpec) into CacheKeyInputs,
 * producing distinct cache entries per (harness, provider, model) tuple.
 *
 * Mirror of agent-prompt-harness-override.test.ts mock structure (createMockHarness +
 * HarnessRegistry + resetGlobalConfig).
 *
 * Cache is opt-in (enableCache: true) — no existing agent test enables it, so this
 * file is the sole coverage for the S3 cache-key threading.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';
import { defaultCache } from '../../cache/index.js';
import type {
  Harness,
  HarnessId,
  HarnessCapabilities,
  HarnessRequest,
} from '../../types/harnesses.js';
import type { ModelSpec } from '../../types/providers.js';
import { createSuccessResponse } from '../../types/agent.js';
import { z } from 'zod';

/**
 * Helper: create a mock Harness structurally compatible with Provider.
 * Accepted by HarnessRegistry.register.
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
        { result: `response-from-${id}` },
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

describe('Agent cache key isolation — harness + provider (PRD §7.14.5)', () => {
  let setSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Reset global config and registry
    resetGlobalConfig();
    HarnessRegistry['_resetForTesting']();

    // Register mock harnesses ('anthropic' is the legacy global default needed by Agent constructor)
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));

    // Clear the default cache singleton (prevents cross-test pollution)
    await defaultCache.clear();

    // Spy on defaultCache.set to capture cache keys
    setSpy = vi.spyOn(defaultCache, 'set');
  });

  afterEach(() => {
    HarnessRegistry['_resetForTesting']();
    resetGlobalConfig();
    vi.restoreAllMocks();
  });

  it('isolates cache by harness: same prompt on pi then claude-code → both execute (MISS)', async () => {
    const agent = new Agent({ enableCache: true } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Say hi',
        responseFormat: z.object({ result: z.string() }),
      });

    await agent.prompt(makePrompt(), { harness: 'pi' as any });
    await agent.prompt(makePrompt(), { harness: 'claude-code' as any });

    // Both harnesses should have been invoked (different harness → different cache key)
    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    const ccHarness = HarnessRegistry.getInstance().get('claude-code')!;
    expect(piHarness.execute).toHaveBeenCalledTimes(1);
    expect(ccHarness.execute).toHaveBeenCalledTimes(1);

    // Captured cache keys must differ
    const keys = setSpy.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('cache HIT on identical (harness, model): second call does NOT re-execute', async () => {
    const agent = new Agent({ enableCache: true, harness: 'pi' } as any);
    const prompt = new Prompt({
      user: 'Hi',
      responseFormat: z.object({ result: z.string() }),
    });

    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    vi.clearAllMocks();

    await agent.prompt(prompt);
    await agent.prompt(prompt);

    // Second call was a cache HIT — execute called only once
    expect(piHarness.execute).toHaveBeenCalledTimes(1);
  });

  it('isolates cache by provider: same model NAME, different provider → both execute (MISS)', async () => {
    const agent = new Agent({ enableCache: true, harness: 'pi' } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Hi',
        responseFormat: z.object({ result: z.string() }),
      });

    await agent.prompt(makePrompt(), { model: 'anthropic/claude-x' });
    await agent.prompt(makePrompt(), { model: 'openai/claude-x' });

    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    expect(piHarness.execute).toHaveBeenCalledTimes(2);

    // Captured keys must differ (different provider axis)
    const keys = setSpy.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('bare model resolves provider to default (anthropic) — same model string yields cache HIT', async () => {
    const agent = new Agent({ enableCache: true, harness: 'pi' } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Hi',
        responseFormat: z.object({ result: z.string() }),
      });

    // Both use the same bare model string → same (harness, provider='anthropic', model) → cache HIT
    await agent.prompt(makePrompt(), { model: 'claude-sonnet-4' });
    await agent.prompt(makePrompt(), { model: 'claude-sonnet-4' });

    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    expect(piHarness.execute).toHaveBeenCalledTimes(1); // 2nd was a cache HIT

    // Only one cache.set call (the first MISS); the 2nd was a HIT so no set
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it('different model strings (bare vs qualified) produce different keys even with same provider', async () => {
    const agent = new Agent({ enableCache: true, harness: 'pi' } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Hi',
        responseFormat: z.object({ result: z.string() }),
      });

    // Bare and qualified forms have different effectiveModel strings → different keys
    await agent.prompt(makePrompt(), { model: 'claude-sonnet-4' }); // bare → model='claude-sonnet-4', provider='anthropic'
    await agent.prompt(makePrompt(), { model: 'anthropic/claude-sonnet-4' }); // qualified → model='anthropic/claude-sonnet-4', provider='anthropic'

    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    expect(piHarness.execute).toHaveBeenCalledTimes(2); // different model strings → MISS

    const keys = setSpy.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).not.toBe(keys[1]); // different keys
  });

  it('captured keys are 64-char hex and differ across the full (harness, provider, model) tuple', async () => {
    const agent = new Agent({ enableCache: true } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Hi',
        responseFormat: z.object({ result: z.string() }),
      });

    await agent.prompt(makePrompt(), { harness: 'pi' as any, model: 'anthropic/claude-x' });
    await agent.prompt(makePrompt(), { harness: 'claude-code' as any, model: 'anthropic/claude-x' });
    await agent.prompt(makePrompt(), { harness: 'pi' as any, model: 'openai/claude-x' });

    const keys = setSpy.mock.calls.map((c) => c[0] as string);
    // All keys should be 64-char hex (SHA-256)
    keys.forEach((k) => expect(k).toMatch(/^[a-f0-9]{64}$/));
    // All distinct across (harness, provider) tuples
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('parseModelSpec throws on harness-qualified model string when cache is enabled', async () => {
    const agent = new Agent({ enableCache: true, harness: 'pi' } as any);
    const prompt = new Prompt({
      user: 'Hi',
      responseFormat: z.object({ result: z.string() }),
    });

    // pi/anthropic/x is a 3-segment harness-qualified string — parseModelSpec throws
    await expect(
      agent.prompt(prompt, { model: 'pi/anthropic/x' }),
    ).rejects.toThrow();
  });
});
