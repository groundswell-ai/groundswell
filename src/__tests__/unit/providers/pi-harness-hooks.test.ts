/**
 * Unit tests for PiHarness hook adaptation — P2.M3.T2.S2.
 *
 * Validates that fireHookEvents() correctly maps Pi session events to HarnessHookEvents:
 *   tool_execution_start → onToolStart({name, input})
 *   tool_execution_end   → onToolEnd(req, {content, isError}, duration)
 *   message_update       → onStream(delta)   [snapshot-diff; assistant text only]
 *
 * Tests BOTH the non-streaming and streaming paths, plus session hook regression,
 * no-hooks safety, and deterministic ordering (PRD §7.14.3).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import type { StreamEvent, AgentResponse } from '../../../types/agent.js';
import type { HarnessHookEvents } from '../../../types/harnesses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeEvent = Record<string, unknown> & { type: string };

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

function wireFakeSession(harness: PiHarness, events: FakeEvent[]) {
  const fakeSession = makeFakeSession(events);
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
  };
  return { harness, fakeSession };
}

async function drainStreaming<T>(
  gen: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>,
): Promise<{ events: StreamEvent[]; final: AgentResponse<T> }> {
  const events: StreamEvent[] = [];
  let result = await gen.next();
  while (!result.done) {
    events.push(result.value);
    result = await gen.next();
  }
  return { events, final: result.value };
}

// ---------------------------------------------------------------------------
// Scripted event payloads
// ---------------------------------------------------------------------------

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

const TOOL_END_ERR = {
  type: 'tool_execution_end',
  toolCallId: 'tc1',
  toolName: 'bash',
  result: 'exit 1',
  isError: true,
};

function messageUpdate(text: string) {
  return {
    type: 'message_update',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  };
}

function messageUpdateUser(text: string) {
  return {
    type: 'message_update',
    message: { role: 'user', content: [{ type: 'text', text }] },
  };
}

const dummyToolExecutor = async () => ({ content: '', isError: false });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - HarnessHookEvents adaptation', () => {
  let harness: PiHarness;

  beforeEach(async () => {
    harness = new PiHarness();
    await harness.initialize();
    HarnessRegistry._resetForTesting();
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  // ── onToolStart (non-streaming) ─────────────────────────────────────

  describe('onToolStart', () => {
    it('should fire onToolStart with {name, input} from tool_execution_start (non-streaming)', async () => {
      const onToolStart = vi.fn();
      wireFakeSession(harness, [SESSION_START, TOOL_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onToolStart });

      expect(onToolStart).toHaveBeenCalledTimes(1);
      expect(onToolStart).toHaveBeenCalledWith({ name: 'search', input: { q: 'x' } });
    });
  });

  // ── onToolEnd (non-streaming) ───────────────────────────────────────

  describe('onToolEnd', () => {
    it('should fire onToolEnd with reconstructed input, real isError=false, and duration>=0', async () => {
      const onToolEnd = vi.fn();
      wireFakeSession(harness, [SESSION_START, TOOL_START, TOOL_END_OK, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onToolEnd });

      expect(onToolEnd).toHaveBeenCalledTimes(1);
      const [req, result, duration] = onToolEnd.mock.calls[0];
      expect(req).toEqual({ name: 'search', input: { q: 'x' } });
      expect(result).toEqual({ content: 'found it', isError: false });
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should observe real isError=true (Pi fidelity — claude-code cannot)', async () => {
      const onToolEnd = vi.fn();
      wireFakeSession(harness, [SESSION_START, TOOL_START, TOOL_END_ERR, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onToolEnd });

      const [, result] = onToolEnd.mock.calls[0];
      expect(result).toEqual({ content: 'exit 1', isError: true });
    });

    it('should degrade gracefully when start is missing (no matching toolCallId)', async () => {
      const onToolEnd = vi.fn();
      wireFakeSession(harness, [SESSION_START, TOOL_END_OK, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onToolEnd });

      const [req, , duration] = onToolEnd.mock.calls[0];
      expect(req).toEqual({ name: 'search', input: undefined });
      expect(duration).toBe(0);
    });
  });

  // ── onStream (non-streaming) ────────────────────────────────────────

  describe('onStream', () => {
    it('should fire onStream with snapshot-diff deltas', async () => {
      const onStream = vi.fn();
      wireFakeSession(harness, [SESSION_START, messageUpdate('Hel'), messageUpdate('Hello'), turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onStream });

      expect(onStream.mock.calls.map((c: any) => c[0])).toEqual(['Hel', 'lo']);
    });

    it('should ignore non-assistant messages', async () => {
      const onStream = vi.fn();
      wireFakeSession(harness, [SESSION_START, messageUpdateUser('ignored'), turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onStream });

      expect(onStream).not.toHaveBeenCalled();
    });
  });

  // ── Session hooks regression ────────────────────────────────────────

  describe('session hooks regression', () => {
    it('should still fire onSessionStart and onSessionEnd (S2 did not break them)', async () => {
      const hooks: HarnessHookEvents = {
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };
      wireFakeSession(harness, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END, SESSION_SHUTDOWN]);

      await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, hooks);

      expect(hooks.onSessionStart).toHaveBeenCalledTimes(1);
      expect(hooks.onSessionEnd).toHaveBeenCalledTimes(1);
      expect(hooks.onSessionEnd).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  // ── No hooks arg → no throw ─────────────────────────────────────────

  describe('no hooks safety', () => {
    it('should not throw when hooks arg is omitted', async () => {
      wireFakeSession(harness, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('success');
    });

    it('should not throw when hooks is undefined', async () => {
      wireFakeSession(harness, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, undefined);

      expect(response.status).toBe('success');
    });

    it('should not throw when only some hooks are provided', async () => {
      const hooks: HarnessHookEvents = { onToolStart: vi.fn() };
      wireFakeSession(harness, [SESSION_START, TOOL_START, TOOL_END_OK, messageUpdate('Hi'), turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'x', options: {} }, dummyToolExecutor, hooks);

      expect(response.status).toBe('success');
      expect(hooks.onToolStart).toHaveBeenCalledTimes(1);
    });
  });

  // ── STREAMING path — all 3 hooks fire ───────────────────────────────

  describe('streaming path', () => {
    it('should fire all 3 hooks with correct shapes in streaming mode', async () => {
      const onToolStart = vi.fn();
      const onToolEnd = vi.fn();
      const onStream = vi.fn();
      const hooks: HarnessHookEvents = { onToolStart, onToolEnd, onStream };
      wireFakeSession(harness, [
        SESSION_START,
        messageUpdate('Hel'),
        messageUpdate('Hello'),
        TOOL_START,
        TOOL_END_OK,
        turnEndText('ok', { input: 5, output: 3 }),
        AGENT_END,
      ]);

      const result = harness.execute({ prompt: 'x', options: { streaming: true } }, dummyToolExecutor, hooks);
      await drainStreaming<string>(result as any);

      // onToolStart
      expect(onToolStart).toHaveBeenCalledTimes(1);
      expect(onToolStart).toHaveBeenCalledWith({ name: 'search', input: { q: 'x' } });

      // onToolEnd
      expect(onToolEnd).toHaveBeenCalledTimes(1);
      const [req, result2, duration] = onToolEnd.mock.calls[0];
      expect(req).toEqual({ name: 'search', input: { q: 'x' } });
      expect(result2).toEqual({ content: 'found it', isError: false });
      expect(duration).toBeGreaterThanOrEqual(0);

      // onStream
      expect(onStream.mock.calls.map((c: any) => c[0])).toEqual(['Hel', 'lo']);
    });

    it('should fire hooks BEFORE their corresponding StreamEvents (PRD §7.14.3)', async () => {
      // Use side-effect spies that record call order
      const order: string[] = [];
      const onToolStart = vi.fn(() => { order.push('hook:tool_start'); });
      const onToolEnd = vi.fn(() => { order.push('hook:tool_end'); });
      const onStream = vi.fn(() => { order.push('hook:stream'); });

      wireFakeSession(harness, [
        SESSION_START,
        TOOL_START,
        TOOL_END_OK,
        messageUpdate('Hi'),
        turnEndText('ok', { input: 5, output: 3 }),
        AGENT_END,
      ]);

      const result = harness.execute(
        { prompt: 'x', options: { streaming: true } },
        dummyToolExecutor,
        { onToolStart, onToolEnd, onStream },
      );
      const { events } = await drainStreaming<string>(result as any);

      // Check ordering: each hook fires before its corresponding StreamEvent
      const toolStartIdx = order.indexOf('hook:tool_start');
      const toolCallStartIdx = events.findIndex((e) => e.type === 'tool_call_start');
      expect(toolStartIdx).toBeLessThan(toolCallStartIdx);

      const toolEndIdx = order.indexOf('hook:tool_end');
      const toolCallDoneIdx = events.findIndex((e) => e.type === 'tool_call_done');
      expect(toolEndIdx).toBeLessThan(toolCallDoneIdx);

      const streamIdx = order.indexOf('hook:stream');
      const textDeltaIdx = events.findIndex((e) => e.type === 'text_delta');
      expect(streamIdx).toBeLessThan(textDeltaIdx);
    });

    it('should fire onStream AND yield text_delta for the same chunk (two channels)', async () => {
      const onStream = vi.fn();
      wireFakeSession(harness, [
        SESSION_START,
        messageUpdate('Hel'),
        messageUpdate('Hello'),
        turnEndText('ok', { input: 5, output: 3 }),
        AGENT_END,
      ]);

      const result = harness.execute(
        { prompt: 'x', options: { streaming: true } },
        dummyToolExecutor,
        { onStream },
      );
      const { events } = await drainStreaming<string>(result as any);

      // Both channels fire for the same chunks.
      expect(onStream.mock.calls.map((c: any) => c[0])).toEqual(['Hel', 'lo']);
      const deltas = events
        .filter((e) => e.type === 'text_delta')
        .map((d) => (d as any).delta);
      expect(deltas).toEqual(['Hel', 'lo']);
    });
  });

  // ── Uninitialized → throws ──────────────────────────────────────────

  describe('uninitialized guard', () => {
    it('should throw when harness is not initialized', async () => {
      const fresh = new PiHarness();
      const onToolStart = vi.fn();
      await expect(
        fresh.execute({ prompt: 'x', options: {} }, dummyToolExecutor, { onToolStart }),
      ).rejects.toThrow(/not initialized/i);
    });
  });
});
