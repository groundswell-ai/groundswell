/**
 * Regression test for PRD §7.10 — PiHarness toolExecutor bridge (P1.M2.T1.S3).
 *
 * Asserts: when a Pi tool call is dispatched (via the customTool's `execute` closure — the
 * exact closure the Pi SDK calls in production), the caller-supplied `toolExecutor` is
 * invoked with { name, input } and its ToolExecutionResult is returned, converted to an
 * AgentToolResult<{ isError }> via MCPHandler.toAgentToolResultFromExecResult.
 *
 * This is the missing assertion that let Issue 2 slip through (the legacy
 * pi-harness-customtools.test.ts passed an executor arg but never asserted it was called).
 * Fails on pre-S2 code (toolExecutor never called / "No executor registered" isError result).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../../../types/harnesses.js';

// ---------------------------------------------------------------------------
// Helpers — Pi SDK fake session factory (verbatim from harness-parity.test.ts)
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

// ---------------------------------------------------------------------------
// Scripted event payloads — minimal set for a clean execute()
// ---------------------------------------------------------------------------

const SESSION_START = { type: 'session_start', reason: 'startup' };
const AGENT_END = { type: 'agent_end', messages: [] };

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness §7.10 — toolExecutor bridge', () => {
  let harness: PiHarness;

  beforeEach(async () => {
    harness = new PiHarness();
    await harness.initialize();
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  it('should invoke toolExecutor with { name, input } and return converted AgentToolResult', async () => {
    // (a)+(b) register an inprocess tool → namespaced as srv__ping
    await harness.registerMCPs([{
      name: 'srv',
      transport: 'inprocess',
      tools: [{
        name: 'ping',
        description: 'd',
        input_schema: { type: 'object', properties: { x: { type: 'string' } } },
      }],
    }]);

    // (c) caller-supplied executor (Agent.toolExecutor stand-in)
    const agentToolExecutor = vi.fn(
      async (req: ToolExecutionRequest): Promise<ToolExecutionResult> => ({
        content: 'agent-' + req.name,   // STRING — converter passes through unchanged
        isError: false,
      }),
    );

    // wire the fake session with minimal events so execute() resolves cleanly
    wirePi(harness, [SESSION_START, turnEndText('done', { input: 1, output: 1 }), AGENT_END]);

    // (d) drive execute() — runs buildCustomTools(toolExecutor) → toPiCustomTools(toolExecutor)
    await harness.execute({ prompt: 'hi', options: {} }, agentToolExecutor);

    // (e) capture the customTools actually handed to the Pi session
    // @ts-expect-error - private field access for testing
    const createAgentSessionMock = harness.sdk!.createAgentSession;
    const capturedOpts = createAgentSessionMock.mock.calls[0][0];
    const customTools = capturedOpts.customTools;

    // sanity: the rebound tool is present and namespaced
    expect(customTools).toHaveLength(1);
    expect(customTools[0].name).toBe('srv__ping');
    expect(typeof customTools[0].execute).toBe('function');

    // (e) DIRECTLY invoke the customTool's execute — faithful simulation of Pi SDK dispatch
    const result = await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});

    // (f) toolExecutor invoked with { name, input } — exactly once
    expect(agentToolExecutor).toHaveBeenCalledTimes(1);
    expect(agentToolExecutor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'srv__ping', input: { x: 'val' } }),
    );

    // (g) result converted via toAgentToolResultFromExecResult (clean string passthrough)
    expect(result.content[0].text).toBe('agent-srv__ping');
    expect(result.details.isError).toBe(false);
  });

  it('should degrade a throwing toolExecutor to isError:true without propagating the exception', async () => {
    // register an inprocess tool
    await harness.registerMCPs([{
      name: 'srv',
      transport: 'inprocess',
      tools: [{
        name: 'ping',
        description: 'd',
        input_schema: { type: 'object', properties: { x: { type: 'string' } } },
      }],
    }]);

    // executor that throws
    const agentToolExecutor = vi.fn(async () => {
      throw new Error('boom');
    });

    wirePi(harness, [SESSION_START, turnEndText('done', { input: 1, output: 1 }), AGENT_END]);

    await harness.execute({ prompt: 'hi', options: {} }, agentToolExecutor);

    // @ts-expect-error - private field access for testing
    const createAgentSessionMock = harness.sdk!.createAgentSession;
    const capturedOpts = createAgentSessionMock.mock.calls[0][0];
    const customTools = capturedOpts.customTools;

    expect(customTools).toHaveLength(1);

    // directly invoke — exception must be caught inside execute(), not propagated
    const result = await customTools[0].execute('tc1', { x: 'val' }, undefined, undefined, {});

    expect(result.details.isError).toBe(true);
    expect(result.content[0].text).toContain('boom');
  });
});
