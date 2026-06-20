/**
 * Unit tests for PiHarness buildCustomTools() delegation bridge and
 * the execute() customTools wiring.
 *
 * PRP: P2.M3.T1.S1 — buildCustomTools maps MCPHandler tools → ToolDefinition[]
 * whose execute() delegates to the injected toolExecutor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import type { MCPServer, Tool } from '../../../types/sdk-primitives.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestTool = (name: string, description: string): Tool => ({
  name,
  description,
  input_schema: {
    type: 'object',
    properties: {
      msg: { type: 'string' },
    },
    required: [],
  },
});

const createTestServer = (name: string, tools: Tool[]): MCPServer => ({
  name,
  transport: 'inprocess',
  tools,
});

const noopExecutor = vi.fn(async () => ({
  content: 'ok',
  isError: false,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - buildCustomTools() toolExecutor delegation', () => {
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

  // ── Shape ──────────────────────────────────────────────────────────────

  describe('shape', () => {
    it('should produce one ToolDefinition per registered tool with correct name/description/parameters', async () => {
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('echo', 'echoes input')]),
      ]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(noopExecutor);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('srv__echo');
      expect(typeof tools[0].description).toBe('string');
      expect(tools[0].description).toBe('echoes input');
      expect(tools[0].parameters).toBeTruthy();
      expect(typeof tools[0].execute).toBe('function');
    });
  });

  // ── Empty registry ──────────────────────────────────────────────────────

  describe('empty registry', () => {
    it('should return [] when no tools are registered', () => {
      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(noopExecutor);
      expect(tools).toHaveLength(0);
    });
  });

  // ── Success delegation ──────────────────────────────────────────────────

  describe('success delegation', () => {
    it('should invoke toolExecutor exactly once with {name, input} and return AgentToolResult', async () => {
      const executor = vi.fn(async (req) => ({
        content: `echo:${JSON.stringify(req.input)}`,
        isError: false,
      }));
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('echo', 'echoes input')]),
      ]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(executor);
      const result = await tools[0].execute('call-1', { msg: 'hi' }, undefined, undefined, {} as any);

      expect(executor).toHaveBeenCalledTimes(1);
      expect(executor).toHaveBeenCalledWith({ name: 'srv__echo', input: { msg: 'hi' } });
      expect(result.content[0]).toEqual({ type: 'text', text: 'echo:{"msg":"hi"}' });
      expect(result.details.isError).toBe(false);
      expect(result.terminate).toBeUndefined();
    });
  });

  // ── isError:true still returns (no throw, no terminate) ──────────────────

  describe('isError:true result', () => {
    it('should return text content with isError:true and no terminate', async () => {
      const errExec = vi.fn(async () => ({ content: 'boom', isError: true }));
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('bad', 'bad tool')]),
      ]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(errExec);
      const r = await tools[0].execute('c', {}, undefined, undefined, {} as any);

      expect(r.content[0].text).toBe('boom');
      expect(r.details.isError).toBe(true);
      expect(r.terminate).toBeUndefined();
    });
  });

  // ── Non-string content is JSON-stringified ─────────────────────────────

  describe('non-string content', () => {
    it('should JSON.stringify non-string content', async () => {
      const objExec = vi.fn(async () => ({ content: { a: 1 }, isError: false }));
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('obj', 'obj tool')]),
      ]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(objExec);
      const r = await tools[0].execute('c', {}, undefined, undefined, {} as any);

      expect(r.content[0].text).toBe('{"a":1}');
    });
  });

  // ── toolExecutor rejection is caught ─────────────────────────────────────

  describe('toolExecutor rejection', () => {
    it('should catch rejection and return error text with isError:true', async () => {
      const throwExec = vi.fn(async () => {
        throw new Error('explode');
      });
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('explode', 'explodes')]),
      ]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools(throwExec);
      const r = await tools[0].execute('c', {}, undefined, undefined, {} as any);

      expect(r.content[0].text).toMatch(/explode|Error/i);
      expect(r.details.isError).toBe(true);
    });
  });

  // ── execute() passes customTools into createAgentSession ────────────────

  describe('execute() integration — customTools wired', () => {
    it('should pass non-empty customTools into createAgentSession when tools are registered', async () => {
      const executor = vi.fn(async (req) => ({
        content: `echo:${JSON.stringify(req.input)}`,
        isError: false,
      }));
      await harness.registerMCPs([
        createTestServer('srv', [createTestTool('echo', 'echoes input')]),
      ]);

      // Monkey-patch createAgentSession to capture opts (P2.M2.T2.S1 fake-session idiom)
      let capturedOpts: any = {};
      const fakeSession = {
        subscribe: () => () => {},
        prompt: async () => {},
      };
      // @ts-expect-error - private field access for testing
      harness.sdk = {
        ...harness.sdk,
        createAgentSession: vi.fn(async (opts: any) => {
          capturedOpts = opts;
          return { session: fakeSession };
        }),
      };

      await harness.execute({ prompt: 'hi', options: {} }, executor);

      expect(capturedOpts.customTools).toHaveLength(1);
      expect(capturedOpts.customTools[0].name).toBe('srv__echo');
      expect(typeof capturedOpts.customTools[0].execute).toBe('function');
    });
  });
});
