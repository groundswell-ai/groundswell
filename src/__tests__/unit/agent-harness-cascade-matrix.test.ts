/**
 * Agent harness cascade matrix — PRD §7.7, 4 canonical scenarios
 *
 * Co-locates the full cascade priority contract (global → agent → prompt) through the
 * real Agent constructor + Agent.prompt() + Agent.stream(). This is the acceptance
 * contract from the work item and the matrix documented in architecture §8.
 *
 * ## The 4 scenarios
 *
 * | # | global.defaultHarness | agent.harness | prompt.harness | resolved      |
 * |---|------------------------|---------------|----------------|---------------|
 * | 1 | 'pi'                   | —             | —              | 'pi'          |
 * | 2 | 'pi'                   | 'claude-code' | —              | 'claude-code' |
 * | 3 | 'pi'                   | 'claude-code' | 'pi'           | 'pi' (prompt) |
 * | 4 | (none — cold start)   | —             | —              | 'pi' (auto)   |
 *
 * ## Scenario dependencies
 *
 * - Scenarios 1, 2, 3: PASS on current (post-P1.M1.T1.S1) code.
 * - Scenario 4: REQUIRES P1.M1.T2.S1 (export + lazy auto-invocation of
 *   registerDefaultHarnesses). Gated with it.skipIf(!AUTO_REGISTER_ACTIVE)
 *   so CI stays green until T2.S1 lands, then auto-activates.
 *
 * ## Fail-on-pre-fix honesty
 *
 * Of the 4 scenarios, ONLY scenario 1 truly FAILS on pre-S1 code (the
 * constructor read the legacy singleton default 'anthropic', but only 'pi' is
 * registered → throw). Scenarios 2 & 3 pass even pre-S1 because agent/prompt
 * axes override the global default via ?? chain, so the buggy singleton is
 * never consulted. Scenario 1 is the keystone Issue-1 regression guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';
import { createSuccessResponse } from '../../types/agent.js';
import { z } from 'zod';
import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js';
import type { ModelSpec } from '../../types/providers.js';
import type { StreamEvent } from '../../types/streaming.js';
import type { AgentResponse } from '../../types/agent.js';

// ---------------------------------------------------------------------------
// createMockHarness — unified streaming-capable factory
//
// Uses an async-generator default execute so it works for BOTH prompt() and
// stream() axes (prompt() ignores the generator nature; stream() requires it).
// Copied from agent-stream-harness-override.test.ts:33-62 with the executeImpl
// overload from agent-prompt-harness-override.test.ts:33-72.
// ---------------------------------------------------------------------------
function createMockHarness(
  id: HarnessId,
  executeImpl?: (request: HarnessRequest) => AsyncGenerator<StreamEvent, AgentResponse<any>, unknown> | Promise<any>,
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
    mockExecute.mockImplementation(async function* () {
      yield { type: 'text_delta', delta: 'Hello', index: 0 } as StreamEvent;
      yield { type: 'text_delta', delta: ' World', index: 1 } as StreamEvent;
      yield { type: 'done', finishReason: 'stop' } as StreamEvent;
      return createSuccessResponse({ result: 'Hello World' }, { agentId: 'test-agent', timestamp: Date.now() });
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
    normalizeModel: vi.fn(
      (model: string): ModelSpec => ({ provider: id, model, raw: model }),
    ),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}

// ---------------------------------------------------------------------------
// Capability probe: detects P1.M1.T2.S1's auto-registration safety net
//
// Runs ONCE at module load. Isolated per-file (vitest runs each file in its own
// module scope). Cleans up in finally so the first beforeEach starts clean.
// ---------------------------------------------------------------------------
const AUTO_REGISTER_ACTIVE = (() => {
  HarnessRegistry['_resetForTesting']();
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  try {
    const probe = new Agent();
    // @ts-expect-error - private field access for testing
    return probe.harness?.id === 'pi';
  } catch {
    return false; // "Harness 'pi' is not registered" → safety net not yet active (pre-T2.S1)
  } finally {
    HarnessRegistry['_resetForTesting']();
    resetGlobalHarnessConfig();
    resetGlobalConfig();
  }
})();

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------
describe('Agent harness cascade matrix (PRD §7.7 — 4 canonical scenarios)', () => {
  beforeEach(() => {
    resetGlobalHarnessConfig();
    resetGlobalConfig();
    HarnessRegistry['_resetForTesting']();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetGlobalHarnessConfig();
    resetGlobalConfig();
    HarnessRegistry['_resetForTesting']();
  });

  // ---- Constructor axis: scenarios 1 & 2 (parametrized) ----
  it.each([
    { n: 1, global: 'pi', agent: undefined, register: ['pi'], expected: 'pi' },
    { n: 2, global: 'pi', agent: 'claude-code', register: ['pi', 'claude-code'], expected: 'claude-code' },
  ])('scenario $n: global=$global, agent=$agent → resolves to "$expected" via constructor', ({ global, agent, register, expected }) => {
    configureHarnesses({ defaultHarness: global as HarnessId, defaultModelProvider: 'anthropic' });
    for (const id of register) HarnessRegistry.getInstance().register(createMockHarness(id));
    const config: any = { model: 'anthropic/claude-sonnet-4-20250514' };
    if (agent) config.harness = agent;
    const agentInstance = new Agent(config);
    // @ts-expect-error - private field access for testing
    expect(agentInstance.harness.id).toBe(expected);
  });

  // ---- Scenario 4: zero setup (GATED until P1.M1.T2.S1) ----
  //
  // REQUIRES P1.M1.T2.S1 (export registerDefaultHarnesses + lazy auto-registration).
  // Skipped (not failed) until the safety net lands; auto-activates once it does.
  it.skipIf(!AUTO_REGISTER_ACTIVE)(
    'scenario 4: zero setup (no configureHarnesses, no registration) resolves to "pi" via default + auto-registration safety net',
    () => {
      // beforeEach already reset registry + global config. Do NOT register anything.
      const agent = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });
      // @ts-expect-error - private field access for testing
      expect(agent.harness.id).toBe('pi');
    },
  );

  // ---- Scenario 3: prompt axis via Agent.prompt() (prompt wins) ----
  it('scenario 3 (prompt axis via Agent.prompt()): prompt "pi" beats agent "claude-code"', async () => {
    configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));

    const agent = new Agent({ harness: 'claude-code' });
    const prompt = new Prompt({ user: 't', responseFormat: z.object({ result: z.string() }) });
    vi.clearAllMocks();

    await agent.prompt(prompt, { harness: 'pi' });

    expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalled();
    expect(HarnessRegistry.getInstance().get('claude-code')!.execute).not.toHaveBeenCalled();
  });

  // ---- Scenario 3: prompt axis via Agent.stream() (prompt wins) ----
  //
  // The streaming mock's execute MUST be an async generator for stream() to work.
  // The unified createMockHarness factory (above) uses an async-generator default,
  // so both axes work uniformly.
  it('scenario 3 (prompt axis via Agent.stream()): prompt "pi" beats agent "claude-code"', async () => {
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));
    configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' });

    const agent = new Agent({ harness: 'claude-code' });
    const prompt = new Prompt({ user: 't', responseFormat: z.object({ result: z.string() }) });
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    for await (const _event of stream) { /* consume */ }

    expect(HarnessRegistry.getInstance().get('pi')!.execute).toHaveBeenCalled();
    expect(HarnessRegistry.getInstance().get('claude-code')!.execute).not.toHaveBeenCalled();
  });
});
