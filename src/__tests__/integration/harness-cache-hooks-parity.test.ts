/**
 * Integration tests: Cache isolation + deterministic hook ordering parity
 * across PiHarness and ClaudeCodeHarness — PRD §7.14.3 / §7.14.5
 *
 * PRP: P4.M2.T1.S2 — Completes the §7.14 parity surface (S1 covered §7.14.1/4/6).
 *
 * CRITICAL — THE HOOK-FIRING ASYMMETRY (§7.14.3 SEAM SPLIT):
 *   The two harnesses fire HarnessHookEvents through DIFFERENT mechanisms:
 *     • PiHarness: hooks fire END-TO-END through execute(). A single
 *       AgentSessionEventListener dispatches scripted session events in order:
 *       fireHookEvents (tool/stream) THEN inline switch (session). Scripting
 *       [session_start, tool_execution_start, tool_execution_end, session_shutdown]
 *       yields the Groundswell sequence [onSessionStart, onToolStart, onToolEnd, onSessionEnd].
 *     • ClaudeCodeHarness: hooks do NOT fire through a mocked execute().
 *       buildAgentSDKHooks(hooks) returns an sdkHooks map passed to query() via
 *       options.hooks; the REAL Anthropic SDK invokes those callbacks, but a MOCKED
 *       query (async generator yielding SDKMessages) NEVER does. The deterministic
 *       seam is: buildAgentSDKHooks() + manually invoking the returned callbacks in
 *       SDK event order (SessionStart → PreToolUse → PostToolUse → SessionEnd).
 *   CONSEQUENCE: the parity assertion is on the PRODUCED GROUNDSWELL HOOK SEQUENCE
 *   (the call-label array), achieved via two different seams. Do NOT try to make
 *   claude-code execute() fire hooks via a mocked query — it cannot.
 *
 * CRITICAL — CACHE COVERAGE ALREADY EXISTS — DO NOT DUPLICATE:
 *   cache-key.test.ts (§7.14.5 unit, 9 cases) and agent-cache-key-isolation.test.ts
 *   (Agent, 7 cases) already prove: distinct-per-(harness,provider,model), identical
 *   when same, harness/provider feed digest, open-set providers, HIT/MISS. This file
 *   adds ONLY the cross-harness PARITY framing, not a re-test of existing cases.
 *
 * Mocking technique: overwrite private `sdk` field after real initialize() for PiHarness;
 * access private buildAgentSDKHooks() for ClaudeCodeHarness. NOT vi.mock (proven pattern).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { PiHarness } from '../../harnesses/pi-harness.js';
import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';
import { generateCacheKey, defaultCache } from '../../cache/index.js';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { createSuccessResponse } from '../../types/agent.js';
import type {
  Harness,
  HarnessId,
  HarnessCapabilities,
  HarnessRequest,
  HarnessHookEvents,
} from '../../types/harnesses.js';
import type { ModelSpec } from '../../types/providers.js';

// ============================================================================
// Types
// ============================================================================

/** Groundswell hook labels — the deterministic sequence both harnesses must produce. */
type HookLabel = 'onSessionStart' | 'onToolStart' | 'onToolEnd' | 'onSessionEnd';

// ============================================================================
// Helpers — PiHarness scripted event payloads (verbatim from pi-harness-hooks.test.ts)
// ============================================================================

type FakeEvent = Record<string, unknown> & { type: string };

const SESSION_START = { type: 'session_start', reason: 'startup' };
const SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };
const AGENT_END = { type: 'agent_end', messages: [] };

function turnEndText(text: string, usage: { input: number; output: number }) {
  return {
    type: 'turn_end',
    turnIndex: 0,
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
      usage: {
        input: usage.input,
        output: usage.output,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: usage.input + usage.output,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      api: 'anthropic-messages',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    },
    toolResults: [],
  };
}

const TOOL_START = {
  type: 'tool_execution_start',
  toolCallId: 'tc1',
  toolName: 'search',
  args: { q: 'x' },
};

const TOOL_END_OK = {
  type: 'tool_execution_end',
  toolCallId: 'tc1',
  toolName: 'search',
  result: 'found it',
  isError: false,
};

// ============================================================================
// Helpers — PiHarness fake session factory (from pi-harness-hooks.test.ts)
// ============================================================================

function makeFakeSession(events: FakeEvent[]) {
  let listener: ((e: FakeEvent) => void) | null = null;
  return {
    subscribe: vi.fn((l: (e: FakeEvent) => void) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
    prompt: vi.fn(async (_text: string) => {
      for (const e of events) listener?.(e);
    }),
  };
}

/** Wires a fake session into a real-initialized PiHarness via private-field overwrite. */
function wirePi(harness: PiHarness, events: FakeEvent[]) {
  const fakeSession = makeFakeSession(events);
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
  };
  return { harness, fakeSession };
}

// ============================================================================
// Helpers — ClaudeCode SDK input builders (from claude-code-harness-hooks.test.ts)
// ============================================================================

const ABORT = { signal: new AbortController().signal };

function ccSessionStartInput() {
  return {
    session_id: 'test-session',
    transcript_path: '/path',
    cwd: '/cwd',
    hook_event_name: 'SessionStart' as const,
    source: 'startup' as const,
  };
}

function ccPreToolUseInput(name: string, input: unknown) {
  return {
    session_id: 'test-session',
    transcript_path: '/path',
    cwd: '/cwd',
    hook_event_name: 'PreToolUse' as const,
    tool_name: name,
    tool_input: input,
    tool_use_id: 'id',
  };
}

function ccPostToolUseInput(name: string, input: unknown, response: string) {
  return {
    session_id: 'test-session',
    transcript_path: '/path',
    cwd: '/cwd',
    hook_event_name: 'PostToolUse' as const,
    tool_name: name,
    tool_input: input,
    tool_response: response,
    tool_use_id: 'id',
  };
}

function ccSessionEndInput() {
  return {
    session_id: 'test-session',
    transcript_path: '/path',
    cwd: '/cwd',
    hook_event_name: 'SessionEnd' as const,
    reason: 'completed',
  };
}

// ============================================================================
// Helpers — Order-recording hooks (THE central parity instrument)
// ============================================================================

/**
 * Creates HarnessHookEvents where each callback records its label into a shared
 * array via side-effect push. This is the proven idiom from pi-harness-hooks.test.ts.
 */
function makeOrderRecordingHooks() {
  const order: HookLabel[] = [];
  const push = (l: HookLabel) => () => {
    order.push(l);
  };
  const hooks: HarnessHookEvents = {
    onSessionStart: vi.fn(push('onSessionStart')),
    onToolStart: vi.fn(push('onToolStart')),
    onToolEnd: vi.fn(push('onToolEnd')),
    onSessionEnd: vi.fn(push('onSessionEnd')),
  };
  return { hooks, order };
}

/**
 * Invokes the ClaudeCodeHarness buildAgentSDKHooks() seam in SDK event order.
 * The returned callbacks are called in order: SessionStart → PreToolUse → PostToolUse → SessionEnd.
 *
 * CRITICAL: This is the ONLY way to fire claude-code hooks in tests. A mocked query() NEVER
 * invokes SDK hooks. See THE HOOK-FIRING ASYMMETRY above.
 */
async function invokeCcSdkHooks(provider: ClaudeCodeHarness, gwHooks: HarnessHookEvents) {
  // @ts-expect-error - Testing private method
  const sdkHooks = provider.buildAgentSDKHooks(gwHooks);
  await sdkHooks['SessionStart'][0].hooks[0](ccSessionStartInput(), undefined, ABORT);
  await sdkHooks['PreToolUse'][0].hooks[0](ccPreToolUseInput('search', { q: 'x' }), 'id', ABORT);
  await sdkHooks['PostToolUse'][0].hooks[0](
    ccPostToolUseInput('search', { q: 'x' }, 'found it'),
    'id',
    ABORT,
  );
  await sdkHooks['SessionEnd'][0].hooks[0](ccSessionEndInput(), undefined, ABORT);
}

// ============================================================================
// Helpers — Cache parity (from agent-cache-key-isolation.test.ts)
// ============================================================================

/**
 * Creates a mock Harness structurally compatible with the registry.
 * Used by the §7.14.5 cache parity block.
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

// ============================================================================
// Shared fixtures
// ============================================================================

const dummyToolExecutor = async () => ({ content: '', isError: false });

/** Standard scripted Pi events that produce the full hook sequence. */
const STANDARD_PI_EVENTS = [
  SESSION_START,
  TOOL_START,
  TOOL_END_OK,
  turnEndText('ok', { input: 5, output: 3 }),
  AGENT_END,
  SESSION_SHUTDOWN,
];

// ============================================================================
// §7.14.3 — Deterministic hook ordering across harnesses
// ============================================================================

describe('PRD §7.14.3 — deterministic hook ordering across harnesses', () => {
  beforeEach(async () => {
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    resetGlobalConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  it('PiHarness fires onSessionStart → onToolStart → onToolEnd → onSessionEnd END-TO-END via execute()', async () => {
    const pi = new PiHarness();
    await pi.initialize();
    const { hooks, order } = makeOrderRecordingHooks();

    wirePi(pi, [...STANDARD_PI_EVENTS]);
    await pi.execute({ prompt: 'x', options: {} }, dummyToolExecutor, hooks);

    expect(order).toEqual(['onSessionStart', 'onToolStart', 'onToolEnd', 'onSessionEnd']);
  });

  it('ClaudeCodeHarness fires the SAME sequence via the buildAgentSDKHooks() seam (SDK event order)', async () => {
    const cc = new ClaudeCodeHarness();
    await cc.initialize();
    const { hooks, order } = makeOrderRecordingHooks();

    // ClaudeCodeHarness seam: buildAgentSDKHooks() + manual SDK-event-order invocation.
    // A mocked query() NEVER invokes SDK hooks (see THE HOOK-FIRING ASYMMETRY above).
    await invokeCcSdkHooks(cc, hooks);

    expect(order).toEqual(['onSessionStart', 'onToolStart', 'onToolEnd', 'onSessionEnd']);
  });

  it('BOTH harnesses produce byte-identical call-label arrays (the §7.14.3 parity guarantee)', async () => {
    // PiHarness — end-to-end via execute()
    const pi = new PiHarness();
    await pi.initialize();
    const { hooks: piHooks, order: piOrder } = makeOrderRecordingHooks();
    wirePi(pi, [...STANDARD_PI_EVENTS]);
    await pi.execute({ prompt: 'x', options: {} }, dummyToolExecutor, piHooks);

    // ClaudeCodeHarness — buildAgentSDKHooks() seam in SDK event order
    const cc = new ClaudeCodeHarness();
    await cc.initialize();
    const { hooks: ccHooks, order: ccOrder } = makeOrderRecordingHooks();
    await invokeCcSdkHooks(cc, ccHooks);

    // THE cross-harness parity assertion: both produce the same sequence
    expect(JSON.stringify(piOrder)).toBe(JSON.stringify(ccOrder));
  });

  it('onToolStart always precedes onToolEnd; onSessionStart always precedes onSessionEnd (both harnesses)', async () => {
    // PiHarness — end-to-end
    const pi = new PiHarness();
    await pi.initialize();
    const { hooks: piHooks, order: piOrder } = makeOrderRecordingHooks();
    wirePi(pi, [...STANDARD_PI_EVENTS]);
    await pi.execute({ prompt: 'x', options: {} }, dummyToolExecutor, piHooks);

    // ClaudeCodeHarness — buildAgentSDKHooks() seam
    const cc = new ClaudeCodeHarness();
    await cc.initialize();
    const { hooks: ccHooks, order: ccOrder } = makeOrderRecordingHooks();
    await invokeCcSdkHooks(cc, ccHooks);

    // Pairwise start-before-end invariants for BOTH harnesses
    for (const o of [piOrder, ccOrder]) {
      expect(o.indexOf('onSessionStart')).toBeLessThan(o.indexOf('onSessionEnd'));
      expect(o.indexOf('onToolStart')).toBeLessThan(o.indexOf('onToolEnd'));
    }
  });

  it('ClaudeCodeHarness onToolEnd reports the documented SDK limitation (isError:false, duration:0)', async () => {
    const cc = new ClaudeCodeHarness();
    await cc.initialize();
    const onToolEnd = vi.fn();

    // @ts-expect-error - Testing private method
    const sdkHooks = cc.buildAgentSDKHooks({ onToolEnd });
    // Only invoke PostToolUse — PreToolUse is not needed for this assertion
    await sdkHooks['PostToolUse'][0].hooks[0](
      ccPostToolUseInput('search', { q: 'x' }, 'found it'),
      'id',
      ABORT,
    );

    expect(onToolEnd).toHaveBeenCalledTimes(1);
    const [, ccResult, ccDuration] = onToolEnd.mock.calls[0];
    // claude-code onToolEnd.isError is ALWAYS false and duration ALWAYS 0 (SDK limitation,
    // claude-code-harness.ts ~L1127) — assert the documented value, never compare to PiHarness's real values.
    expect(ccResult).toMatchObject({ content: 'found it', isError: false });
    expect(ccDuration).toBe(0);
  });

  it('no-hooks safety: both harnesses accept undefined hooks without throwing', async () => {
    // PiHarness — execute() with undefined hooks
    const pi = new PiHarness();
    await pi.initialize();
    wirePi(pi, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);
    const piResult = await pi.execute({ prompt: 'x', options: {} }, dummyToolExecutor, undefined);
    expect(piResult.status).toBe('success');

    // ClaudeCodeHarness — buildAgentSDKHooks() with undefined hooks
    const cc = new ClaudeCodeHarness();
    await cc.initialize();
    // @ts-expect-error - Testing private method
    const sdkHooks = cc.buildAgentSDKHooks(undefined);
    expect(Object.keys(sdkHooks)).toHaveLength(0);
  });
});

// ============================================================================
// §7.14.5 — Cross-harness cache isolation parity
//
// NOTE: cache-key.test.ts (unit, 9 cases) and agent-cache-key-isolation.test.ts
// (Agent, 7 cases) ALREADY prove distinct-per-tuple, identical-when-same,
// digest-participation, open-set providers, HIT/MISS. This block is the
// CROSS-HARNESS PARITY FRAMING only — it does NOT re-test those cases.
// ============================================================================

describe('PRD §7.14.5 — cross-harness cache isolation parity', () => {
  let setSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    resetGlobalConfig();
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();

    // Register mock harnesses — 'anthropic' is the legacy global default needed by Agent constructor
    HarnessRegistry.getInstance().register(createMockHarness('anthropic'));
    HarnessRegistry.getInstance().register(createMockHarness('pi'));
    HarnessRegistry.getInstance().register(createMockHarness('claude-code'));

    await defaultCache.clear();
    setSpy = vi.spyOn(defaultCache, 'set');
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
    resetGlobalConfig();
    vi.restoreAllMocks();
  });

  it('generateCacheKey is harness-agnostic: identical inputs → identical bytes regardless of caller', () => {
    const base = {
      user: 'Hi',
      model: 'claude-sonnet-4-20250514',
      harness: 'pi' as HarnessId,
      provider: 'anthropic',
    };

    // Pure-function determinism: same inputs → same key
    const key1 = generateCacheKey(base);
    const key2 = generateCacheKey({ ...base });
    expect(key1).toBe(key2);

    // Key is 64-char hex (SHA-256)
    expect(key1).toMatch(/^[a-f0-9]{64}$/);

    // Proves no hidden harness branching — complement to cache-key.test.ts per-axis cases
    expect(key1).toBe(generateCacheKey({ user: 'Hi', model: 'claude-sonnet-4-20250514', harness: 'pi', provider: 'anthropic' }));
  });

  it('same Prompt through pi THEN claude-code → both execute (cache MISS) + distinct keys (end-to-end)', async () => {
    const agent = new Agent({ enableCache: true } as any);
    const makePrompt = () =>
      new Prompt({
        user: 'Hi',
        responseFormat: z.object({ result: z.string() }),
      });

    await agent.prompt(makePrompt(), { harness: 'pi' as any });
    await agent.prompt(makePrompt(), { harness: 'claude-code' as any });

    // Both harnesses should have been invoked (different harness axis → different cache key)
    const piHarness = HarnessRegistry.getInstance().get('pi')!;
    const ccHarness = HarnessRegistry.getInstance().get('claude-code')!;
    expect(piHarness.execute).toHaveBeenCalledTimes(1);
    expect(ccHarness.execute).toHaveBeenCalledTimes(1);

    // Captured cache keys must differ — the two harnesses never share cache
    const keys = setSpy.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).not.toBe(keys[1]);
    keys.forEach((k) => expect(k).toMatch(/^[a-f0-9]{64}$/));
  });

  it('identical (harness, provider, model) re-runs → cache HIT (execute called once)', async () => {
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
    // Only one cache.set call (the MISS); the HIT did not write
    expect(setSpy).toHaveBeenCalledTimes(1);
  });
});
