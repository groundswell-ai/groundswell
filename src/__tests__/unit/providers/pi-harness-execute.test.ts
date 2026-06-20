/**
 * Unit tests for PiHarness execute() non-streaming path.
 *
 * PRP: P2.M2.T2.S1 — createAgentSession + prompt + result aggregation → AgentResponse.
 *
 * Uses a fake session factory (makeFakeSession) whose subscribe() captures the listener
 * and prompt() replays scripted events. Mirrors ClaudeCodeHarness's execute test idiom
 * (sdk.query mock) adapted for Pi's event-stream API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import { AGENT_ERROR_CODES, isSuccess } from '../../../types/agent.js';
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

// ---------------------------------------------------------------------------
// Scripted event payloads (verified shapes — see research/event-aggregation-contract.md §2)
// ---------------------------------------------------------------------------

const SESSION_START = { type: 'session_start', reason: 'startup' };
const SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };

function turnEndText(text: string, usage: { input: number; output: number }, turnIndex = 0) {
  return {
    type: 'turn_end',
    turnIndex,
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

function turnEndTool(toolCount = 1, usage: { input: number; output: number }, turnIndex = 0) {
  const content = [
    { type: 'text', text: 'Calling tool' },
    ...Array.from({ length: toolCount }, (_, i) => ({
      type: 'toolCall',
      id: `tc${i + 1}`,
      name: `tool_${i + 1}`,
      arguments: { q: 'x' },
    })),
  ];
  return {
    type: 'turn_end',
    turnIndex,
    message: {
      role: 'assistant',
      content,
      usage: {
        input: usage.input,
        output: usage.output,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: usage.input + usage.output,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'toolUse',
      api: 'anthropic-messages',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    },
    toolResults: [],
  };
}

const AGENT_END = { type: 'agent_end', messages: [] };

const dummyToolExecutor = async () => ({ content: '', isError: false });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - execute() non-streaming', () => {
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

  // ── Uninitialized guard ──────────────────────────────────────────────────

  describe('uninitialized guard', () => {
    it('should reject with /not initialized/ when harness is not initialized', async () => {
      const fresh = new PiHarness(); // no initialize()
      await expect(
        fresh.execute({ prompt: 'test', options: {} }, dummyToolExecutor),
      ).rejects.toThrow(/not initialized/i);
    });
  });

  // ── Streaming branch throws ──────────────────────────────────────────────

  describe('streaming branch', () => {
    it('should throw synchronously citing P2.M3.T2.S1 when streaming is true', () => {
      expect(() =>
        harness.execute(
          { prompt: 'test', options: { streaming: true } },
          dummyToolExecutor,
        ),
      ).toThrow(/P2\.M3\.T2\.S1/);
    });
  });

  // ── Success aggregation ──────────────────────────────────────────────────

  describe('success aggregation', () => {
    it('should return success with correct data, usage, toolCalls, and metadata', async () => {
      wireFakeSession(harness, [SESSION_START, turnEndText('Hello world', { input: 10, output: 5 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'hi', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('success');
      expect(response.data).toBe('Hello world');
      expect(response.error).toBeNull();
      expect(response.metadata.agentId).toBe('pi');
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(response.metadata.usage?.input_tokens).toBe(10);
      expect(response.metadata.usage?.output_tokens).toBe(5);
      expect(response.metadata.toolCalls).toBe(0);
    });
  });

  // ── Tool-call counting ──────────────────────────────────────────────────

  describe('tool-call counting', () => {
    it('should count 1 tool call from a turn with toolCall block', async () => {
      wireFakeSession(harness, [SESSION_START, turnEndTool(1, { input: 20, output: 8 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('success');
      expect(response.metadata.toolCalls).toBe(1);
    });

    it('should count 2 tool calls from a turn with 2 toolCall blocks', async () => {
      wireFakeSession(harness, [SESSION_START, turnEndTool(2, { input: 20, output: 8 }), AGENT_END]);

      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('success');
      expect(response.metadata.toolCalls).toBe(2);
    });
  });

  // ── Last-turn-wins + usage accumulation ───────────────────────────────────

  describe('last-turn-wins and usage accumulation', () => {
    it('should use last turn text (last-turn-wins) and accumulate usage', async () => {
      wireFakeSession(harness, [
        turnEndText('First', { input: 10, output: 5 }, 0),
        turnEndText('Second', { input: 30, output: 20 }, 1),
        AGENT_END,
      ]);

      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('success');
      expect(response.data).toBe('Second');
      expect(response.metadata.usage?.input_tokens).toBe(40);
      expect(response.metadata.usage?.output_tokens).toBe(25);
    });
  });

  // ── Session hooks ────────────────────────────────────────────────────────

  describe('session hooks', () => {
    it('should fire onSessionStart on session_start and onSessionEnd on session_shutdown', async () => {
      const hooks: HarnessHookEvents = {
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };
      wireFakeSession(harness, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END, SESSION_SHUTDOWN]);

      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor, hooks);

      expect(response.status).toBe('success');
      expect(hooks.onSessionStart).toHaveBeenCalledTimes(1);
      expect(hooks.onSessionEnd).toHaveBeenCalledTimes(1);
      // onSessionEnd receives a number (duration in ms)
      expect(typeof hooks.onSessionEnd).not.toBe('undefined');
      expect(hooks.onSessionEnd).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should not fire onSessionEnd if no session_shutdown event', async () => {
      const hooks: HarnessHookEvents = {
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };
      wireFakeSession(harness, [SESSION_START, turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor, hooks);

      expect(hooks.onSessionStart).toHaveBeenCalledTimes(1);
      expect(hooks.onSessionEnd).not.toHaveBeenCalled();
    });
  });

  // ── Error path ───────────────────────────────────────────────────────────

  describe('error path', () => {
    it('should return EXECUTION_FAILED error when prompt() rejects', async () => {
      const fakeSession = makeFakeSession([]);
      fakeSession.prompt = vi.fn(async () => {
        throw new Error('boom');
      });
      // @ts-expect-error - private field access for testing
      harness.sdk = {
        ...harness.sdk,
        createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
      };

      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);

      expect(response.status).toBe('error');
      expect(response.error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_FAILED);
      expect(response.error?.recoverable).toBe(true);
      expect(response.error?.message).toContain('boom');
    });
  });

  // ── createAgentSession arguments ─────────────────────────────────────────

  describe('createAgentSession arguments', () => {
    it('should call createAgentSession with model, modelRegistry, authStorage, and empty customTools', async () => {
      wireFakeSession(harness, [turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);

      // @ts-expect-error - private field access
      const callArgs = harness.sdk.createAgentSession.mock.calls[0][0];
      expect(callArgs.model).toBeTruthy();
      expect(callArgs.modelRegistry).toBeTruthy();
      expect(callArgs.authStorage).toBeTruthy();
      expect(callArgs.customTools).toEqual([]);
    });
  });

  // ── prompt argument ─────────────────────────────────────────────────────

  describe('prompt argument', () => {
    it('should call prompt with request.prompt', async () => {
      const { fakeSession } = wireFakeSession(harness, [turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      await harness.execute({ prompt: 'hello world', options: {} }, dummyToolExecutor);

      expect(fakeSession.prompt).toHaveBeenCalledWith('hello world');
    });
  });

  // ── Metadata timestamp ────────────────────────────────────────────────────

  describe('metadata timestamp', () => {
    it('should have timestamp between before and after Date.now()', async () => {
      wireFakeSession(harness, [turnEndText('ok', { input: 5, output: 3 }), AGENT_END]);

      const before = Date.now();
      const response = await harness.execute({ prompt: 'test', options: {} }, dummyToolExecutor);
      const after = Date.now();

      expect(response.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.metadata.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ── isSuccess type guard ─────────────────────────────────────────────────

  describe('isSuccess type guard', () => {
    it('should narrow response to SuccessResponse on success', async () => {
      wireFakeSession(harness, [turnEndText('yes', { input: 5, output: 3 }), AGENT_END]);

      const response = await harness.execute<string>({ prompt: 'test', options: {} }, dummyToolExecutor);

      if (isSuccess(response)) {
        expect(response.data).toBe('yes');
        expect(response.error).toBeNull();
      } else {
        expect.unreachable('Response should be success');
      }
    });
  });
});
