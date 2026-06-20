/**
 * Unit tests for MCPHandler.toPiCustomTools() — the Pi-side tool bridge.
 *
 * Uses a REAL MCPHandler (registerServer + registerToolExecutor for inprocess transport).
 * No PiHarness, no SDK init — fast, isolated.
 *
 * PRP: P2.M4.T1.S2
 */

import { describe, it, expect } from 'vitest';
import { MCPHandler } from '../../../core/mcp-handler.js';
import { TypeGuard } from '@sinclair/typebox';
import type { Tool, MCPServer } from '../../../types/sdk-primitives.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestTool = (
  name: string,
  description: string,
  inputSchema?: Tool['input_schema'],
): Tool => ({
  name,
  description,
  input_schema: inputSchema ?? {
    type: 'object',
    properties: {
      msg: { type: 'string' },
      count: { type: 'integer' },
    },
    required: ['msg'],
  },
});

const createTestServer = (name: string, tools: Tool[]): MCPServer => ({
  name,
  transport: 'inprocess',
  tools,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCPHandler.toPiCustomTools()', () => {
  // ── Empty registry ──────────────────────────────────────────────────────

  describe('empty registry', () => {
    it('should return [] when no tools are registered', () => {
      const handler = new MCPHandler();
      const tools = handler.toPiCustomTools();
      expect(tools).toHaveLength(0);
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  // ── Shape ──────────────────────────────────────────────────────────────

  describe('shape', () => {
    it('should produce one ToolDefinition per registered tool with correct name/label/description/execute', () => {
      const handler = new MCPHandler();
      handler.registerServer(createTestServer('srv', [createTestTool('echo', 'echoes input')]));

      const tools = handler.toPiCustomTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('srv__echo');
      expect(tools[0].label).toBe('srv__echo');
      expect(tools[0].description).toBe('echoes input');
      expect(typeof tools[0].execute).toBe('function');
      expect(tools[0].parameters).toBeTruthy();
    });
  });

  // ── REAL parameters (not placeholder) ──────────────────────────────────

  describe('REAL parameters', () => {
    it('should produce a real TypeBox schema (not the permissive placeholder)', () => {
      const handler = new MCPHandler();
      handler.registerServer(createTestServer('srv', [createTestTool('echo', 'echoes input')]));

      const tools = handler.toPiCustomTools();
      const params = tools[0].parameters;

      // TypeBox TObject with real properties — the placeholder has NO .properties.msg
      expect(TypeGuard.TObject(params)).toBe(true);
      const props = (params as any).properties;
      expect(props).toBeDefined();
      expect(TypeGuard.TString(props.msg)).toBe(true);
      expect(TypeGuard.TInteger(props.count)).toBe(true);
    });
  });

  // ── Execute success — string result ────────────────────────────────────

  describe('execute success (string result)', () => {
    it('should invoke registered.executor and return string content with isError:false', async () => {
      const handler = new MCPHandler();
      handler.registerServer(createTestServer('srv', [createTestTool('echo', 'echoes input')]));
      handler.registerToolExecutor('srv', 'echo', async (input) =>
        `echo:${JSON.stringify(input)}`,
      );

      const tools = handler.toPiCustomTools();
      const r = await tools[0].execute('call-1', { msg: 'hi' }, undefined, undefined, {} as any);

      expect(r.content[0]).toEqual({ type: 'text', text: 'echo:{"msg":"hi"}' });
      expect(r.details.isError).toBe(false);
    });
  });

  // ── Execute success — object result ─────────────────────────────────────

  describe('execute success (object result)', () => {
    it('should JSON.stringify object results', async () => {
      const handler = new MCPHandler();
      handler.registerServer(createTestServer('srv', [createTestTool('obj', 'returns object')]));
      handler.registerToolExecutor('srv', 'obj', async () => ({ a: 1, b: 'two' }));

      const tools = handler.toPiCustomTools();
      const r = await tools[0].execute('call-2', {}, undefined, undefined, {} as any);

      expect(r.content[0].text).toBe('{"a":1,"b":"two"}');
      expect(r.details.isError).toBe(false);
    });
  });

  // ── Execute error — executor rejection → isError:true, no throw ──────────

  describe('execute error', () => {
    it('should catch executor rejection and return isError:true with Error text', async () => {
      const handler = new MCPHandler();
      handler.registerServer(createTestServer('srv', [createTestTool('bad', 'throws')]));
      handler.registerToolExecutor('srv', 'bad', async () => {
        throw new Error('boom');
      });

      const tools = handler.toPiCustomTools();
      const r = await tools[0].execute('call-3', {}, undefined, undefined, {} as any);

      expect(r.details.isError).toBe(true);
      expect(r.content[0].text).toMatch(/boom|Error/i);
    });
  });

  // ── Parity with getTools() ─────────────────────────────────────────────

  describe('parity with getTools()', () => {
    it('should produce the same count and names as getTools()', () => {
      const handler = new MCPHandler();
      handler.registerServer(
        createTestServer('srv', [
          createTestTool('echo', 'echoes'),
          createTestTool('search', 'searches'),
        ]),
      );
      handler.registerServer(
        createTestServer('git', [createTestTool('commit', 'commits')]),
      );

      const piTools = handler.toPiCustomTools();
      const sdkTools = handler.getTools();

      expect(piTools).toHaveLength(sdkTools.length);
      const piNames = piTools.map((t) => t.name).sort();
      const sdkNames = sdkTools.map((t) => t.name).sort();
      expect(piNames).toEqual(sdkNames);
    });
  });
});
