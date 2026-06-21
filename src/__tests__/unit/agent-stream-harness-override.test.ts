/**
 * Unit tests for Agent.stream() with prompt-level harness override
 *
 * Tests the configuration cascade: global → agent → prompt with harness vocabulary.
 * Verifies that prompt-level harness and harnessOptions overrides correctly switch
 * the execution harness and merge options for streaming. Covers explicit harness,
 * agent-level harness, prompt-beats-agent, legacy provider fallback, unregistered-
 * harness THROW, HarnessRequest shape (incl. streaming: true), AgentHooks→
 * HarnessHookEvents wiring, streaming events flow, and parity on success + on STREAM_ERROR.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';
import type { Harness, HarnessId, HarnessCapabilities, HarnessRequest } from '../../types/harnesses.js';
import type { ModelSpec } from '../../types/providers.js';
import type { StreamEvent } from '../../types/streaming.js';
import type { AgentResponse } from '../../types/agent.js';
import { createSuccessResponse } from '../../types/agent.js';
import { z } from 'zod';

/**
 * Helper function to create mock Harness for testing.
 * Default execute returns an async generator yielding StreamEvents + returning
 * an AgentResponse — mirrors the legacy createMockProvider pattern.
 */
function createMockHarness(
  id: HarnessId,
  executeImpl?: (request: HarnessRequest) => AsyncGenerator<StreamEvent, AgentResponse<any>, unknown> | Promise<any>
): Harness {
  const capabilities: HarnessCapabilities = {
    mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false,
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
    id, capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({ provider: 'anthropic', model, raw: model })),
    supports: vi.fn(() => true),
    requiresFeatures: vi.fn(() => true),
  };
}

describe('Agent.stream() harness override', () => {
  beforeEach(() => {
    resetGlobalConfig();
    const registry = HarnessRegistry.getInstance();
    registry.register(createMockHarness('anthropic' as HarnessId));
    registry.register(createMockHarness('pi'));
    registry.register(createMockHarness('claude-code'));
  });

  afterEach(() => {
    HarnessRegistry['_resetForTesting']();
    resetGlobalConfig();
  });

  it('resolves an explicit prompt-level harness override and calls harness.execute', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    for await (const _event of stream) { /* consume */ }

    expect(piHarness.execute).toHaveBeenCalled();
  });

  it('uses the agent-level harness when no prompt override', async () => {
    const agent = new Agent({ harness: 'pi' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt);
    for await (const _event of stream) { /* consume */ }

    expect(piHarness.execute).toHaveBeenCalled();
  });

  it('prompt harness override beats the agent harness', async () => {
    const agent = new Agent({ harness: 'pi' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;
    const ccHarness = registry.get('claude-code')!;
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt, { harness: 'claude-code' });
    for await (const _event of stream) { /* consume */ }

    expect(ccHarness.execute).toHaveBeenCalled();
    expect(piHarness.execute).not.toHaveBeenCalled();
  });

  it('falls back to the legacy provider override', async () => {
    // 'anthropic' is already registered in beforeEach — use it via the legacy {provider} field.
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const registry = HarnessRegistry.getInstance();
    const anthropicHarness = registry.get('anthropic')!;
    vi.clearAllMocks();

    const { stream } = agent.stream(prompt, { provider: 'anthropic' });
    for await (const _event of stream) { /* consume */ }

    expect(anthropicHarness.execute).toHaveBeenCalled();
  });

  it('THROWS Harness "..." is not registered for an unregistered harness', async () => {
    // Create a fresh environment with only 'pi' registered
    HarnessRegistry['_resetForTesting']();
    HarnessRegistry.getInstance().register(createMockHarness('pi'));

    const agent = new Agent({ harness: 'pi' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    // 'claude-code' auto-registers (P1.M1.T2.S1); use a non-built-in id to exercise the throw path.
    await expect(async () => {
      const { stream } = agent.stream(prompt, { harness: 'nonexistent' as HarnessId });
      for await (const _event of stream) { /* consume */ }
    }).rejects.toThrow(/Harness 'nonexistent' is not registered/);
  });

  it('builds a HarnessRequest with streaming: true and the expected options shape', async () => {
    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;
    let captured: HarnessRequest | undefined;

    (piHarness.execute as any).mockImplementation(async function* (req: HarnessRequest) {
      captured = req;
      yield { type: 'text_delta', delta: 'x', index: 0 } as StreamEvent;
      return createSuccessResponse({ result: 'x' }, { agentId: 't', timestamp: Date.now() });
    });

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    for await (const _event of stream) { /* consume */ }

    expect(captured).toBeDefined();
    expect(captured!.prompt).toBe('test');
    expect(captured!.options).toEqual(
      expect.objectContaining({
        streaming: true,
        sessionId: undefined,
        hooks: expect.any(Object),
      }),
    );
  });

  it('maps AgentHooks.preToolUse/postToolUse to HarnessHookEvents.onToolStart/onToolEnd', async () => {
    const preToolHook = vi.fn();
    const postToolHook = vi.fn();

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;

    (piHarness.execute as any).mockImplementation(async function* (req: HarnessRequest) {
      // Invoke the hooks inside the generator to verify wiring
      const hooks = req.options.hooks;
      if (hooks?.onToolStart) {
        await hooks.onToolStart({ name: 'test_tool', input: { arg: 'val' } });
      }
      if (hooks?.onToolEnd) {
        await hooks.onToolEnd(
          { name: 'test_tool', input: { arg: 'val' } },
          { content: { result: 'ok' }, isError: false },
          5,
        );
      }
      yield { type: 'text_delta', delta: 'x', index: 0 } as StreamEvent;
      return createSuccessResponse({ result: 'x' }, { agentId: 't', timestamp: Date.now() });
    });

    const agent = new Agent({
      hooks: {
        preToolUse: [preToolHook],
        postToolUse: [postToolHook],
      },
    });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    for await (const _event of stream) { /* consume */ }

    expect(preToolHook).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: 'test_tool' }),
    );
    expect(postToolHook).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: 'test_tool', duration: 5 }),
    );
  });

  it('streams events from the overridden harness', async () => {
    const registry = HarnessRegistry.getInstance();
    const ccHarness = registry.get('claude-code')!;

    (ccHarness.execute as any).mockImplementation(async function* () {
      yield { type: 'text_delta', delta: 'A', index: 0 } as StreamEvent;
      yield { type: 'text_delta', delta: 'B', index: 1 } as StreamEvent;
      yield { type: 'done', finishReason: 'stop' } as StreamEvent;
      return createSuccessResponse({ result: 'AB' }, { agentId: 't', timestamp: Date.now() });
    });

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const { stream } = agent.stream(prompt, { harness: 'claude-code' });
    const events: StreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'A', index: 0 });
    expect(events[1]).toEqual({ type: 'text_delta', delta: 'B', index: 1 });
    expect(events[2]).toEqual({ type: 'done', finishReason: 'stop' });
    expect(ccHarness.execute).toHaveBeenCalled();
  });

  it('preserves streaming parity on success (final AgentResponse)', async () => {
    const mockResp = createSuccessResponse(
      { result: 'final' },
      { agentId: 't', timestamp: Date.now(), duration: 5 },
    );

    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;

    (piHarness.execute as any).mockImplementation(async function* () {
      yield { type: 'text_delta', delta: 's', index: 0 } as StreamEvent;
      return mockResp;
    });

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    const events: StreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    // The generator should have yielded the text_delta event
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 's', index: 0 });
    // Harness execute was called (parity)
    expect(piHarness.execute).toHaveBeenCalled();
  });

  it('yields a STREAM_ERROR event on harness execution failure (parity)', async () => {
    const registry = HarnessRegistry.getInstance();
    const piHarness = registry.get('pi')!;

    (piHarness.execute as any).mockImplementation(async function* () {
      throw new Error('boom');
    });

    const agent = new Agent();
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const { stream } = agent.stream(prompt, { harness: 'pi' });
    const events: StreamEvent[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    if (errorEvent && errorEvent.type === 'error') {
      expect(errorEvent.code).toBe('STREAM_ERROR');
      expect(errorEvent.error.message).toBe('boom');
    }
  });
});
