/**
 * Harness Parity Integration Tests — PRD §7.14.1 / §7.14.4 / §7.14.6
 *
 * PRP: P4.M2.T1.S1 — Proves PiHarness and ClaudeCodeHarness are behaviourally interchangeable
 * for the PRD §7.14 parity guarantees:
 *   §7.14.4 — identical AgentResponse shape/status/metadata key-set
 *   §7.14.1 — identical ToolExecutionRequest/Result shape + namespacing + tool-count semantics
 *   §7.14.6 — identical workflow-event emission when driven through an Agent in workflow context
 *
 * CRITICAL: The tool-execution architectural asymmetry (PRD §7.14 gap) means we assert
 * SHAPE/KEY-SET parity for isError/duration across harnesses, NEVER value equality.
 * ClaudeCodeHarness hard-codes isError:false and duration:0 (SDK limitation); PiHarness
 * reports real values. See "the honest parity matrix" in each describe block.
 *
 * Mocking technique: overwrite the private `sdk` field after real initialize() — NOT vi.mock.
 * This is the proven pattern across all 26 existing harness unit tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { PiHarness } from '../../harnesses/pi-harness.js';
import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { AGENT_ERROR_CODES, isSuccess, isError } from '../../types/agent.js';
import type {
  HarnessRequest,
  HarnessHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  AgentResponse,
} from '../../types/harnesses.js';
import type { WorkflowEvent, AgentExecutionContext, WorkflowNode } from '../../index.js';
import { runInContext } from '../../index.js';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';

// ---------------------------------------------------------------------------
// Helpers — Pi SDK fake session factory (verbatim from pi-harness-execute.test.ts)
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
// Helpers — ClaudeCode SDK async-generator factory (from claude-code-harness-execute.test.ts)
// ---------------------------------------------------------------------------

type SDKMessage =
  | { type: 'assistant'; message: { content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }> } }
  | { type: 'user'; message: { content: string }; session_id?: string }
  | { type: 'result'; subtype: 'success' | 'error_during_execution' | 'error_max_turns'; result?: unknown; structured_output?: unknown; usage?: { input_tokens: number; output_tokens: number }; errors?: string[] };

/** Creates an async-generator factory that yields the given SDK messages. */
function makeCcMessages(messages: SDKMessage[]) {
  return async function* () {
    for (const msg of messages) {
      yield msg;
    }
  };
}

/** Wires a mocked SDK into a real-initialized ClaudeCodeHarness via private-field overwrite. */
function wireCc(harness: ClaudeCodeHarness, messages: SDKMessage[]) {
  const capturedOptions: Record<string, unknown>[] = [];
  // @ts-expect-error - Testing private property
  harness.sdk = {
    query: vi.fn().mockImplementation(({ options }) => {
      capturedOptions.push(options);
      return makeCcMessages(messages)();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn(),
  };
  return { harness, capturedOptions };
}

// ---------------------------------------------------------------------------
// Scripted event payloads — Pi session events (verified shapes from pi-harness-execute.test.ts)
// ---------------------------------------------------------------------------

const PI_SESSION_START = { type: 'session_start', reason: 'startup' };
const PI_SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };
const PI_AGENT_END = { type: 'agent_end', messages: [] };

function piTurnEndText(text: string, usage: { input: number; output: number }, turnIndex = 0) {
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

function piTurnEndTool(toolName: string, args: Record<string, unknown>, usage: { input: number; output: number }, turnIndex = 0) {
  const content = [
    { type: 'text', text: 'Calling tool' },
    { type: 'toolCall', id: 'tc1', name: toolName, arguments: args },
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

/** Pi tool_execution_start event — fires onToolStart in fireHookEvents(). */
function piToolExecStart(toolCallId: string, toolName: string, args: unknown) {
  return { type: 'tool_execution_start', toolCallId, toolName, args };
}

/** Pi tool_execution_end event — fires onToolEnd in fireHookEvents(). */
function piToolExecEnd(toolCallId: string, result: unknown, isError: boolean) {
  return { type: 'tool_execution_end', toolCallId, result, isError };
}

// ---------------------------------------------------------------------------
// Scripted message payloads — ClaudeCode SDK messages (from claude-code-harness-execute.test.ts)
// ---------------------------------------------------------------------------

function ccAssistantText(text: string) {
  return {
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  } as SDKMessage;
}

function ccAssistantToolUse(name: string, input: unknown) {
  return {
    type: 'assistant',
    message: {
      content: [
        { type: 'text', text: 'Using tool' },
        { type: 'tool_use', id: 'tool-1', name, input },
      ],
    },
  } as SDKMessage;
}

function ccResultSuccess(data: unknown, usage: { input_tokens: number; output_tokens: number }) {
  return {
    type: 'result',
    subtype: 'success',
    result: data,
    usage,
  } as SDKMessage;
}

function ccResultError(subtype: string, errors: string[] = []) {
  return {
    type: 'result',
    subtype,
    errors,
  } as SDKMessage;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Shared stub toolExecutor — reset per test. Returns a result keyed by tool name. */
const sharedToolExecutor = vi.fn(
  async (req: ToolExecutionRequest): Promise<ToolExecutionResult> => ({
    content: `result-for-${req.name}`,
    isError: false,
  }),
);

/** Shared HarnessRequest used by all parity tests. */
const sharedRequest: HarnessRequest = { prompt: 'PARITY_PROMPT', options: {} };

/** Creates a mocked PiHarness and ClaudeCodeHarness (initialize + overwrite private sdk). */
async function makeMockedHarnesses() {
  // PiHarness
  const pi = new PiHarness();
  await pi.initialize();
  // ClaudeCodeHarness
  const cc = new ClaudeCodeHarness();
  await cc.initialize();
  return { pi, cc };
}

/** Minimal mock WorkflowNode for execution context. */
function makeMockWorkflowNode(): WorkflowNode {
  return {
    id: 'test-node-id',
    name: 'test-node',
    parent: null,
    children: [],
    status: 'pending' as any,
    logs: [],
    events: [],
  };
}

// ============================================================================
// §7.14.4 — identical AgentResponse
// ============================================================================

describe('PRD §7.14.4 — identical AgentResponse', () => {
  let pi: PiHarness;
  let cc: ClaudeCodeHarness;

  beforeEach(async () => {
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    vi.clearAllMocks();
    sharedToolExecutor.mockClear();
    ({ pi, cc } = await makeMockedHarnesses());
    HarnessRegistry.getInstance().register(pi);
    HarnessRegistry.getInstance().register(cc);
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  it('both harnesses return success with identical shape + metadata key-set', async () => {
    // Wire PiHarness to return text 'PARITY_DATA' with usage 10/5
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndText('PARITY_DATA', { input: 10, output: 5 }),
      PI_AGENT_END,
    ]);

    // Wire ClaudeCodeHarness to return result 'PARITY_DATA' with usage 10/5
    wireCc(cc, [
      ccAssistantText('PARITY_DATA'),
      ccResultSuccess('PARITY_DATA', { input_tokens: 10, output_tokens: 5 }),
    ]);

    const piRes = await pi.execute(sharedRequest, sharedToolExecutor);
    const ccRes = await cc.execute(sharedRequest, sharedToolExecutor);

    // §7.14.4: both return success with same status and data (scripted to identical payloads)
    expect(piRes.status).toBe('success');
    expect(ccRes.status).toBe('success');
    expect(piRes.data).toBe('PARITY_DATA');
    expect(ccRes.data).toBe('PARITY_DATA');
    expect(piRes.error).toBeNull();
    expect(ccRes.error).toBeNull();

    // §7.14.4: metadata KEY-SET parity — both have the same keys
    const piKeys = Object.keys(piRes.metadata).sort();
    const ccKeys = Object.keys(ccRes.metadata).sort();
    expect(piKeys).toEqual(ccKeys);

    // Both must contain the core metadata fields
    expect(piKeys).toContain('agentId');
    expect(piKeys).toContain('timestamp');
    expect(piKeys).toContain('duration');
    expect(piKeys).toContain('usage');
    expect(piKeys).toContain('toolCalls');

    // §7.14.4: usage + toolCalls VALUE parity (scripted to same numbers)
    expect(piRes.metadata.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
    expect(ccRes.metadata.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
    expect(piRes.metadata.toolCalls).toBe(0);
    expect(ccRes.metadata.toolCalls).toBe(0);

    // §7.14.4: agentId is the ONE sanctioned value divergence — NOT equal
    expect(piRes.metadata.agentId).toBe('pi');
    expect(ccRes.metadata.agentId).toBe('claude-code');
    expect(piRes.metadata.agentId).not.toBe(ccRes.metadata.agentId);

    // timestamp and duration are volatile — assert types, not values
    expect(typeof piRes.metadata.timestamp).toBe('number');
    expect(typeof ccRes.metadata.timestamp).toBe('number');
    expect(typeof piRes.metadata.duration).toBe('number');
    expect(typeof ccRes.metadata.duration).toBe('number');
    expect(piRes.metadata.duration).toBeGreaterThanOrEqual(0);
    expect(ccRes.metadata.duration).toBeGreaterThanOrEqual(0);
  });

  it('both harnesses return error with identical shape (EXECUTION_FAILED)', async () => {
    // PiHarness error path: session.prompt() throws
    const fakeSession = makeFakeSession([]);
    fakeSession.prompt = vi.fn(async () => {
      throw new Error('boom');
    });
    // @ts-expect-error - private field access for testing
    pi.sdk = {
      ...pi.sdk,
      createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
    };

    // ClaudeCodeHarness error path: result with error_during_execution subtype
    wireCc(cc, [ccResultError('error_during_execution', ['boom'])]);

    const piRes = await pi.execute(sharedRequest, sharedToolExecutor);
    const ccRes = await cc.execute(sharedRequest, sharedToolExecutor);

    // Both return error status
    expect(piRes.status).toBe('error');
    expect(ccRes.status).toBe('error');
    expect(piRes.data).toBeNull();
    expect(ccRes.data).toBeNull();

    // Both have error with EXECUTION_FAILED code
    expect(piRes.error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_FAILED);
    expect(ccRes.error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_FAILED);

    // §7.14.4: error shape parity — same KEY-SET: {code, message, details, recoverable}
    const piErrorKeys = Object.keys(piRes.error!).sort();
    const ccErrorKeys = Object.keys(ccRes.error!).sort();
    expect(piErrorKeys).toEqual(ccErrorKeys);
    expect(piErrorKeys).toEqual(['code', 'details', 'message', 'recoverable']);
    expect(typeof piRes.error!.recoverable).toBe('boolean');
    expect(typeof ccRes.error!.recoverable).toBe('boolean');
  });

  it('both honor isSuccess()/isError() type guards identically', async () => {
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndText('ok', { input: 5, output: 3 }),
      PI_AGENT_END,
    ]);
    wireCc(cc, [
      ccAssistantText('ok'),
      ccResultSuccess('ok', { input_tokens: 5, output_tokens: 3 }),
    ]);

    const piRes = await pi.execute(sharedRequest, sharedToolExecutor);
    const ccRes = await cc.execute(sharedRequest, sharedToolExecutor);

    // isSuccess narrows to SuccessResponse on both
    expect(isSuccess(piRes)).toBe(true);
    expect(isSuccess(ccRes)).toBe(true);
    expect(isError(piRes)).toBe(false);
    expect(isError(ccRes)).toBe(false);

    // isError test on error responses
    const fakeSession = makeFakeSession([]);
    fakeSession.prompt = vi.fn(async () => { throw new Error('fail'); });
    // @ts-expect-error - private field access for testing
    pi.sdk = { ...pi.sdk, createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }) };
    wireCc(cc, [ccResultError('error_during_execution')]);

    const piErr = await pi.execute(sharedRequest, sharedToolExecutor);
    const ccErr = await cc.execute(sharedRequest, sharedToolExecutor);

    expect(isError(piErr)).toBe(true);
    expect(isError(ccErr)).toBe(true);
    expect(isSuccess(piErr)).toBe(false);
    expect(isSuccess(ccErr)).toBe(false);
  });
});

// ============================================================================
// §7.14.1 — tool execution shape parity
// ============================================================================

describe('PRD §7.14.1 — tool execution shape parity', () => {
  let pi: PiHarness;
  let cc: ClaudeCodeHarness;

  beforeEach(async () => {
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    vi.clearAllMocks();
    sharedToolExecutor.mockClear();
    ({ pi, cc } = await makeMockedHarnesses());
    HarnessRegistry.getInstance().register(pi);
    HarnessRegistry.getInstance().register(cc);
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  it('both harnesses report identical metadata.toolCalls for equivalent 1-tool turn', async () => {
    // PiHarness: one toolCall block in turn_end event → toolCalls = 1
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndTool('filesystem__read_file', { path: '/x' }, { input: 20, output: 8 }),
      PI_AGENT_END,
    ]);

    // ClaudeCodeHarness: one tool_use block in assistant message → toolCalls = 1
    wireCc(cc, [
      ccAssistantToolUse('filesystem__read_file', { path: '/x' }),
      ccResultSuccess('done', { input_tokens: 20, output_tokens: 8 }),
    ]);

    const piRes = await pi.execute(sharedRequest, sharedToolExecutor);
    const ccRes = await cc.execute(sharedRequest, sharedToolExecutor);

    // §7.14.1: identical tool count semantics
    expect(piRes.metadata.toolCalls).toBe(1);
    expect(ccRes.metadata.toolCalls).toBe(1);
    expect(piRes.metadata.toolCalls).toBe(ccRes.metadata.toolCalls);
  });

  it('PiHarness fires onToolStart/onToolEnd with correct request/result shapes', async () => {
    const hooks: HarnessHookEvents = {
      onToolStart: vi.fn(),
      onToolEnd: vi.fn(),
    };

    // Wire PiHarness with tool_execution_start and tool_execution_end events
    // These are the events that fireHookEvents() maps to onToolStart/onToolEnd
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndTool('filesystem__read_file', { path: '/x' }, { input: 20, output: 8 }),
      PI_AGENT_END,
      piToolExecStart('tc1', 'filesystem__read_file', { path: '/x' }),
      piToolExecEnd('tc1', 'result-for-filesystem__read_file', false),
      PI_SESSION_SHUTDOWN,
    ]);

    await pi.execute(sharedRequest, sharedToolExecutor, hooks);

    // §7.14.1: onToolStart fires with {name, input} shape — namespaced name preserved
    expect(hooks.onToolStart).toHaveBeenCalledTimes(1);
    const [toolReq] = hooks.onToolStart.mock.calls[0];
    expect(toolReq).toMatchObject({ name: 'filesystem__read_file', input: { path: '/x' } });

    // §7.14.1: onToolEnd fires with (request, result, duration) — result has {content, isError}
    expect(hooks.onToolEnd).toHaveBeenCalledTimes(1);
    const [endReq, endResult, endDuration] = hooks.onToolEnd.mock.calls[0];
    expect(endReq).toMatchObject({ name: 'filesystem__read_file', input: { path: '/x' } });
    expect(endResult).toMatchObject({ content: 'result-for-filesystem__read_file', isError: false });
    expect(typeof endDuration).toBe('number');
    expect(endDuration).toBeGreaterThanOrEqual(0);
  });

  it('PiHarness onToolEnd reports the REAL isError and duration (fidelity advantage)', async () => {
    const hooks: HarnessHookEvents = {
      onToolStart: vi.fn(),
      onToolEnd: vi.fn(),
    };

    // Wire a tool_execution_end event with isError:true
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndTool('filesystem__read_file', { path: '/x' }, { input: 20, output: 8 }),
      PI_AGENT_END,
      piToolExecStart('tc1', 'filesystem__read_file', { path: '/x' }),
      piToolExecEnd('tc1', 'Error: file not found', true),
      PI_SESSION_SHUTDOWN,
    ]);

    await pi.execute(sharedRequest, sharedToolExecutor, hooks);

    // PiHarness reports the REAL isError from the event
    const [, piResult, piDuration] = hooks.onToolEnd.mock.calls[0];
    expect(piResult.isError).toBe(true);
    expect(typeof piDuration).toBe('number');
    expect(piDuration).toBeGreaterThanOrEqual(0);

    // This is the asymmetry that means we assert SHAPE parity across harnesses,
    // never isError value-equality (see the honest parity matrix).
  });

  it('ClaudeCodeHarness onToolStart/onToolEnd fire with correct shape via hooks adapter', async () => {
    const hooks: HarnessHookEvents = {
      onToolStart: vi.fn(),
      onToolEnd: vi.fn(),
    };

    // Wire ClaudeCodeHarness with a mock that captures SDK options and fires hook callbacks
    // @ts-expect-error - Testing private property
    cc.sdk = {
      query: vi.fn().mockImplementation(({ options }) => {
        // Fire the SDK PreToolUse hook to simulate a tool call
        const preToolUseHooks = (options.hooks as any)?.PreToolUse?.[0]?.hooks;
        if (preToolUseHooks?.[0]) {
          preToolUseHooks[0](
            { tool_name: 'filesystem__read_file', tool_input: { path: '/x' } },
            'tool-id-1',
            {},
          );
        }
        // Fire the SDK PostToolUse hook to simulate tool completion
        const postToolUseHooks = (options.hooks as any)?.PostToolUse?.[0]?.hooks;
        if (postToolUseHooks?.[0]) {
          postToolUseHooks[0](
            { tool_name: 'filesystem__read_file', tool_input: { path: '/x' }, tool_response: 'result-content' },
            'tool-id-1',
            {},
          );
        }
        return makeCcMessages([
          ccAssistantToolUse('filesystem__read_file', { path: '/x' }),
          ccResultSuccess('done', { input_tokens: 20, output_tokens: 8 }),
        ])();
      }),
      createSdkMcpServer: vi.fn(),
      tool: vi.fn(),
    };

    await cc.execute(sharedRequest, sharedToolExecutor, hooks);

    // §7.14.1: onToolStart fires with {name, input} — namespaced name preserved
    expect(hooks.onToolStart).toHaveBeenCalledTimes(1);
    const [startReq] = hooks.onToolStart.mock.calls[0];
    expect(startReq).toMatchObject({ name: 'filesystem__read_file', input: { path: '/x' } });

    // §7.14.1: onToolEnd fires with (request, result, duration)
    expect(hooks.onToolEnd).toHaveBeenCalledTimes(1);
    const [endReq, endResult, endDuration] = hooks.onToolEnd.mock.calls[0];
    expect(endReq).toMatchObject({ name: 'filesystem__read_file', input: { path: '/x' } });
    expect(endResult).toMatchObject({
      content: 'result-content',
      isError: false, // claude-code onToolEnd.isError is ALWAYS false (SDK limitation)
    });
    // claude-code onToolEnd duration is ALWAYS 0 (SDK limitation, claude-code-harness.ts ~L1125)
    expect(endDuration).toBe(0);
  });

  it('ToolExecutionRequest/Result SHAPE parity — namespaced names preserved across both', async () => {
    // Both harnesses must preserve the namespaced tool name 'filesystem__read_file'
    const NAMED_TOOL = 'filesystem__read_file';

    // PiHarness: onToolStart captures the request shape
    const piHooks: HarnessHookEvents = { onToolStart: vi.fn(), onToolEnd: vi.fn() };
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndTool(NAMED_TOOL, { path: '/x' }, { input: 20, output: 8 }),
      PI_AGENT_END,
      piToolExecStart('tc1', NAMED_TOOL, { path: '/x' }),
      piToolExecEnd('tc1', 'result-data', false),
    ]);
    await pi.execute(sharedRequest, sharedToolExecutor, piHooks);

    const [piReq] = piHooks.onToolStart.mock.calls[0];
    const [, piRes] = piHooks.onToolEnd.mock.calls[0];

    // ClaudeCodeHarness: hooks adapter captures the request shape
    const ccHooks: HarnessHookEvents = { onToolStart: vi.fn(), onToolEnd: vi.fn() };
    // @ts-expect-error - Testing private property
    cc.sdk = {
      query: vi.fn().mockImplementation(({ options }) => {
        const preHooks = (options.hooks as any)?.PreToolUse?.[0]?.hooks;
        if (preHooks?.[0]) {
          preHooks[0]({ tool_name: NAMED_TOOL, tool_input: { path: '/x' } }, 'tc1', {});
        }
        const postHooks = (options.hooks as any)?.PostToolUse?.[0]?.hooks;
        if (postHooks?.[0]) {
          postHooks[0](
            { tool_name: NAMED_TOOL, tool_input: { path: '/x' }, tool_response: 'result-data' },
            'tc1',
            {},
          );
        }
        return makeCcMessages([
          ccAssistantToolUse(NAMED_TOOL, { path: '/x' }),
          ccResultSuccess('done', { input_tokens: 20, output_tokens: 8 }),
        ])();
      }),
      createSdkMcpServer: vi.fn(),
      tool: vi.fn(),
    };
    await cc.execute(sharedRequest, sharedToolExecutor, ccHooks);

    const [ccReq] = ccHooks.onToolStart.mock.calls[0];
    const [, ccRes] = ccHooks.onToolEnd.mock.calls[0];

    // §7.14.1: SHAPE parity — request has {name: string, input: unknown}
    expect(typeof piReq.name).toBe('string');
    expect(typeof ccReq.name).toBe('string');
    expect(piReq.name).toBe(NAMED_TOOL);
    expect(ccReq.name).toBe(NAMED_TOOL);

    // §7.14.1: SHAPE parity — result has {content, isError: boolean}
    expect('content' in piRes).toBe(true);
    expect('isError' in piRes).toBe(true);
    expect(typeof piRes.isError).toBe('boolean');
    expect('content' in ccRes).toBe(true);
    expect('isError' in ccRes).toBe(true);
    expect(typeof ccRes.isError).toBe('boolean');

    // Namespaced name is byte-identical in both
    expect(piReq.name).toBe(ccReq.name);

    // DO NOT assert piRes.isError === ccRes.isError (asymmetry — see honest parity matrix)
  });

  it('customTools passed to Pi createAgentSession is buildCustomTools() result', async () => {
    wirePi(pi, [
      piTurnEndText('ok', { input: 5, output: 3 }),
      PI_AGENT_END,
    ]);

    await pi.execute(sharedRequest, sharedToolExecutor);

    // @ts-expect-error - private field access for testing
    const createArgs = pi.sdk.createAgentSession.mock.calls[0][0];
    // customTools is an array (empty by default when no MCP servers registered)
    expect(Array.isArray(createArgs.customTools)).toBe(true);
    // Verify createAgentSession was called with the expected fields
    expect(createArgs.model).toBeTruthy();
    expect(createArgs.modelRegistry).toBeTruthy();
    expect(createArgs.authStorage).toBeTruthy();
  });
});

// ============================================================================
// §7.14.6 — workflow integration events
// ============================================================================

describe('PRD §7.14.6 — workflow integration events', () => {
  let pi: PiHarness;
  let cc: ClaudeCodeHarness;

  beforeEach(async () => {
    HarnessRegistry._resetForTesting();
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    vi.clearAllMocks();
    sharedToolExecutor.mockClear();
    ({ pi, cc } = await makeMockedHarnesses());
    HarnessRegistry.getInstance().register(pi);
    HarnessRegistry.getInstance().register(cc);
  });

  afterEach(() => {
    HarnessRegistry.getInstance()._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  it('both harnesses emit the same WorkflowEvent types for an equivalent success turn', async () => {
    // Wire both harnesses with the same success path
    wirePi(pi, [
      PI_SESSION_START,
      piTurnEndText('PARITY_DATA', { input: 10, output: 5 }),
      PI_AGENT_END,
    ]);

    wireCc(cc, [
      ccAssistantText('PARITY_DATA'),
      ccResultSuccess('PARITY_DATA', { input_tokens: 10, output_tokens: 5 }),
    ]);

    // Create agents — Agent constructor resolves harness from HarnessRegistry
    const piAgent = new Agent({ harness: 'pi' });
    const ccAgent = new Agent({ harness: 'claude-code' });

    // Shared prompt with z.any() to avoid validation failures on differing response shapes
    const prompt = new Prompt({ user: 'PARITY_PROMPT', responseFormat: z.any() });

    // Run pi agent inside a mock workflow context
    const piEvents: WorkflowEvent[] = [];
    const piContext: AgentExecutionContext = {
      workflowNode: makeMockWorkflowNode(),
      emitEvent: (event) => piEvents.push(event),
      workflowId: 'parity-test-workflow',
    };

    await runInContext(piContext, async () => {
      await piAgent.prompt(prompt);
    });

    // Run cc agent inside a fresh mock workflow context
    const ccEvents: WorkflowEvent[] = [];
    const ccContext: AgentExecutionContext = {
      workflowNode: makeMockWorkflowNode(),
      emitEvent: (event) => ccEvents.push(event),
      workflowId: 'parity-test-workflow',
    };

    await runInContext(ccContext, async () => {
      await ccAgent.prompt(prompt);
    });

    // §7.14.6: event-TYPE-SET parity — both emit the same set of event types
    const piTypes = [...new Set(piEvents.map((e) => e.type))].sort();
    const ccTypes = [...new Set(ccEvents.map((e) => e.type))].sort();
    expect(piTypes).toEqual(ccTypes);

    // Both should emit at least agentPromptStart and agentPromptEnd
    expect(piTypes).toContain('agentPromptStart');
    expect(piTypes).toContain('agentPromptEnd');
  });

  it('both harnesses emit agentPromptStart and agentPromptEnd for an error turn', async () => {
    // Wire PiHarness error path
    const fakeSession = makeFakeSession([]);
    fakeSession.prompt = vi.fn(async () => { throw new Error('boom'); });
    // @ts-expect-error - private field access for testing
    pi.sdk = { ...pi.sdk, createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }) };

    // Wire ClaudeCodeHarness error path
    wireCc(cc, [ccResultError('error_during_execution', ['boom'])]);

    const piAgent = new Agent({ harness: 'pi' });
    const ccAgent = new Agent({ harness: 'claude-code' });

    const prompt = new Prompt({ user: 'PARITY_PROMPT', responseFormat: z.any() });

    // Run both in mock contexts
    const piEvents: WorkflowEvent[] = [];
    await runInContext(
      { workflowNode: makeMockWorkflowNode(), emitEvent: (e) => piEvents.push(e), workflowId: 'test' },
      async () => { await piAgent.prompt(prompt); },
    );

    const ccEvents: WorkflowEvent[] = [];
    await runInContext(
      { workflowNode: makeMockWorkflowNode(), emitEvent: (e) => ccEvents.push(e), workflowId: 'test' },
      async () => { await ccAgent.prompt(prompt); },
    );

    // Both emit agentPromptStart + agentPromptEnd even on error
    const piTypes = [...new Set(piEvents.map((e) => e.type))].sort();
    const ccTypes = [...new Set(ccEvents.map((e) => e.type))].sort();
    expect(piTypes).toEqual(ccTypes);
    expect(piTypes).toContain('agentPromptStart');
    expect(piTypes).toContain('agentPromptEnd');
  });
});
