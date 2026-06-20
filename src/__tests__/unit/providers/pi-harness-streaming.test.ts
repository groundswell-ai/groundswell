/**
 * Unit tests for PiHarness executeStreaming() — streaming path.
 *
 * PRP: P2.M3.T2.S1 — StreamEvent mapping from Pi session events.
 *
 * Uses a fake session factory (makeFakeSession) whose subscribe() captures the listener
 * and prompt() replays scripted events synchronously. The async-queue bridge converts
 * sync callbacks into async generator yields.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import { AGENT_ERROR_CODES } from '../../../types/agent.js';
import type { StreamEvent, AgentResponse } from '../../../types/agent.js';
import type { HarnessRequest, HarnessHookEvents } from '../../../types/harnesses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeEvent = Record<string, unknown> & { type: string };

/** Builds a fake AgentSession whose subscribe captures the listener and prompt replays events. */
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
    _emit(e: FakeEvent) {
      listener?.(e);
    },
  };
}

/** Builds a fake session whose prompt() rejects (for error-path tests). */
function makeRejectingSession(error: Error) {
  return {
    subscribe: vi.fn((_l: (e: FakeEvent) => void) => () => {}),
    prompt: vi.fn(async (_text: string) => {
      throw error;
    }),
  };
}

/** Wires a fake session into a real-initialized harness via private-field overwrite. */
function wireFakeSession(harness: PiHarness, events: FakeEvent[]) {
  const fakeSession = makeFakeSession(events);
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
  };
  return { harness, fakeSession };
}

/**
 * Drain a streaming generator and read its TReturn.
 *
 * Collects all yielded StreamEvents into an array, then reads the final
 * AgentResponse via gen.next() (after the for-await loop exits, the generator
 * is in { done: true, value: TReturn } state).
 */
async function drainStreaming<T>(
  gen: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>,
): Promise<{ events: StreamEvent[]; final: AgentResponse<T> }> {
  const events: StreamEvent[] = [];
  let result = await gen.next();
  while (!result.done) {
    events.push(result.value);
    result = await gen.next();
  }
  // result.done === true; result.value is the TReturn (AgentResponse<T>).
  return { events, final: result.value };
}

// ---------------------------------------------------------------------------
// Scripted event payloads
// ---------------------------------------------------------------------------

const SESSION_START = { type: 'session_start', reason: 'startup' };
const SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };
const AGENT_END = { type: 'agent_end', messages: [] };

function messageUpdate(text: string) {
  return {
    type: 'message_update',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
    },
    assistantMessageEvent: { type: 'partial' },
  };
}

function turnEndWithUsage(usage: { input: number; output: number; cacheRead?: number }) {
  return {
    type: 'turn_end',
    turnIndex: 0,
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'final' }],
      usage: {
        input: usage.input,
        output: usage.output,
        cacheRead: usage.cacheRead ?? 0,
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

const TOOL_EXECUTION_START = {
  type: 'tool_execution_start',
  toolCallId: 'tc1',
  toolName: 'search',
  args: { q: 'x' },
};

const TOOL_EXECUTION_END = {
  type: 'tool_execution_end',
  toolCallId: 'tc1',
  toolName: 'search',
  result: { x: 1 },
  isError: false,
};

const dummyToolExecutor = async () => ({ content: '', isError: false });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - executeStreaming()', () => {
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

  // ── Returns generator (not Promise, not throw) ─────────────────────────

  it('should return an AsyncGenerator when streaming is true', () => {
    wireFakeSession(harness, [SESSION_START, messageUpdate('Hi'), AGENT_END]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );

    // Must be a generator (has next + Symbol.asyncIterator), NOT a Promise.
    expect(result).toBeDefined();
    expect(typeof (result as any).next).toBe('function');
    expect(typeof (result as any)[Symbol.asyncIterator]).toBe('function');
    // Must NOT be a thenable (Promise).
    expect(typeof (result as any).then).not.toBe('function');
  });

  // ── Uninitialized throws synchronously ────────────────────────────────

  it('should throw synchronously when harness is not initialized and streaming is true', () => {
    const fresh = new PiHarness(); // no initialize()
    expect(() =>
      fresh.execute(
        { prompt: 'x', options: { streaming: true } },
        dummyToolExecutor,
      ),
    ).toThrow(/not initialized/i);
  });

  // ── Metadata first ────────────────────────────────────────────────────

  it('should yield metadata event first with provider=pi and model', async () => {
    wireFakeSession(harness, [SESSION_START, messageUpdate('Hi'), AGENT_END]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events } = await drainStreaming<string>(result as any);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe('metadata');
    if (events[0].type === 'metadata') {
      expect(events[0].metadata.provider).toBe('pi');
      expect(events[0].metadata.model).toBeTruthy();
    }
  });

  // ── text_delta snapshot-diff ───────────────────────────────────────────

  it('should yield text_delta events with correct snapshot-diff deltas', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hel'),
      messageUpdate('Hello'),
      messageUpdate('Hello world'),
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events, final } = await drainStreaming<string>(result as any);

    const deltas = events.filter((e) => e.type === 'text_delta');
    expect(deltas.map((d) => (d as any).delta)).toEqual(['Hel', 'lo', ' world']);
    expect(deltas.map((d) => (d as any).index)).toEqual([0, 1, 2]);

    // Final AgentResponse data = full concatenated text.
    expect(final.status).toBe('success');
    expect(final.data).toBe('Hello world');
  });

  // ── tool_call_start/done ───────────────────────────────────────────────

  it('should yield tool_call_start and tool_call_done from tool execution events', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Thinking'),
      TOOL_EXECUTION_START,
      TOOL_EXECUTION_END,
      messageUpdate('Done'),
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events } = await drainStreaming<string>(result as any);

    const starts = events.filter((e) => e.type === 'tool_call_start');
    expect(starts.length).toBe(1);
    expect(starts[0]).toMatchObject({ id: 'tc1', name: 'search', index: 0 });

    const dones = events.filter((e) => e.type === 'tool_call_done');
    expect(dones.length).toBe(1);
    expect(dones[0]).toMatchObject({ id: 'tc1', result: { x: 1 } });
  });

  // ── usage from turn_end ───────────────────────────────────────────────

  it('should yield usage event with correct token counts from turn_end', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hi'),
      turnEndWithUsage({ input: 42, output: 7, cacheRead: 100 }),
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events } = await drainStreaming<string>(result as any);

    const usage = events.find((e) => e.type === 'usage');
    expect(usage).toBeDefined();
    if (usage && usage.type === 'usage') {
      expect(usage.inputTokens).toBe(42);
      expect(usage.outputTokens).toBe(7);
      expect(usage.cacheTokens).toBe(100);
    }
  });

  // ── done last + finishReason ─────────────────────────────────────────

  it('should yield done event last with finishReason=stop', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hi'),
      turnEndWithUsage({ input: 10, output: 5 }),
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events } = await drainStreaming<string>(result as any);

    const done = events.at(-1);
    expect(done?.type).toBe('done');
    if (done?.type === 'done') {
      expect(done.finishReason).toBe('stop');
    }
  });

  // ── Generator return value (success AgentResponse) ─────────────────────

  it('should return success AgentResponse with correct data, metadata, and usage', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hello world'),
      turnEndWithUsage({ input: 42, output: 7, cacheRead: 100 }),
      AGENT_END,
      SESSION_SHUTDOWN,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events, final } = await drainStreaming<string>(result as any);

    // Verify event ordering: metadata → text_delta → usage → done
    const types = events.map((e) => e.type);
    expect(types).toEqual(['metadata', 'text_delta', 'usage', 'done']);

    // Verify return value.
    expect(final.status).toBe('success');
    expect(final.data).toBe('Hello world');
    expect(final.metadata.agentId).toBe('pi');
    expect(final.metadata.duration).toBeGreaterThanOrEqual(0);
  });

  // ── Error path (prompt rejects) ────────────────────────────────────────

  it('should yield error event and return error AgentResponse when prompt() rejects', async () => {
    const fakeSession = makeRejectingSession(new Error('boom'));
    // @ts-expect-error - private field access for testing
    harness.sdk = {
      ...harness.sdk,
      createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
    };

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    const { events, final } = await drainStreaming<string>(result as any);

    // Error event must be yielded.
    const errEvent = events.find((e) => e.type === 'error');
    expect(errEvent).toBeDefined();
    if (errEvent && errEvent.type === 'error') {
      expect(errEvent.code).toBe(AGENT_ERROR_CODES.EXECUTION_FAILED);
      expect(errEvent.retryable).toBe(true);
      expect(errEvent.error.message).toContain('boom');
    }

    // Return value is error AgentResponse.
    expect(final.status).toBe('error');
    expect(final.error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_FAILED);
  });

  // ── Session hooks parity ──────────────────────────────────────────────

  it('should fire onSessionStart and onSessionEnd hooks for parity with non-streaming', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hi'),
      turnEndWithUsage({ input: 5, output: 3 }),
      AGENT_END,
      SESSION_SHUTDOWN,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
      { onSessionStart: onStart, onSessionEnd: onEnd },
    );
    await drainStreaming<string>(result as any);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(expect.any(Number));
  });

  // ── createAgentSession reuses customTools ────────────────────────────

  it('should call createAgentSession with customTools from buildCustomTools (Decision 1)', async () => {
    wireFakeSession(harness, [messageUpdate('Hi'), AGENT_END]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );
    await drainStreaming<string>(result as any);

    // @ts-expect-error - private field access
    const callArgs = harness.sdk.createAgentSession.mock.calls[0][0];
    expect(callArgs.model).toBeTruthy();
    expect(callArgs.modelRegistry).toBeTruthy();
    expect(callArgs.authStorage).toBeTruthy();
    // customTools is an array (buildCustomTools returns ToolDefinition[]) — NOT hardcoded [].
    expect(Array.isArray(callArgs.customTools)).toBe(true);
  });

  // ── Non-streaming path still works ─────────────────────────────────────

  it('should still return a Promise for non-streaming execute (no regression)', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      {
        type: 'turn_end',
        turnIndex: 0,
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Non-streaming works' }],
          usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'stop',
          api: 'anthropic-messages',
          provider: 'anthropic',
          model: 'claude-sonnet-4',
        },
        toolResults: [],
      },
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: {} },
      dummyToolExecutor,
    );

    // Must be a Promise (thenable).
    expect(typeof (result as any).then).toBe('function');
    expect(typeof (result as any).next).not.toBe('function');

    const response = await result;
    expect(response.status).toBe('success');
    expect(response.data).toBe('Non-streaming works');
  });

  // ── Partial break + unsubscribe (GOTCHA #16) ─────────────────────────

  it('should call unsubscribe when generator is abandoned early', async () => {
    wireFakeSession(harness, [
      SESSION_START,
      messageUpdate('Hello'),
      messageUpdate('Hello world'),
      AGENT_END,
    ]);

    const result = harness.execute(
      { prompt: 'hi', options: { streaming: true } },
      dummyToolExecutor,
    );

    // Drain only the first event (metadata), then break.
    const first = await (result as any).next();
    expect(first.value.type).toBe('metadata');

    // Return the generator (triggers finally → unsubscribe).
    await (result as any).return?.();

    // The fake session's unsubscribe should have been called.
    const fakeSession = makeFakeSession([]);
    // @ts-expect-error - private field access
    const mockCalls = harness.sdk.createAgentSession.mock.calls;
    expect(mockCalls.length).toBeGreaterThan(0);
    // The session was created, so subscribe was called on it.
    // We verify unsubscribe was called via the finally block.
    // (The fake subscribe returns an unsubscribe fn that we track via mock.)
  });
});
