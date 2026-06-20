/**
 * Unit tests for PiHarness registerMCPs() forwarding to MCPHandler.
 *
 * PRP: P2.M3.T1.S1 — registerMCPs forwards to this.mcpHandler.registerServer
 * and returns namespaced Tool[] (parity with ClaudeCodeHarness.registerMCPs).
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
      message: { type: 'string' },
    },
    required: ['message'],
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

describe('PiHarness - registerMCPs()', () => {
  let harness: PiHarness;

  beforeEach(async () => {
    harness = new PiHarness();
    await harness.initialize();
    HarnessRegistry._resetForTesting();
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
  });

  describe('init guard', () => {
    it('should throw /not initialized/ when harness is not initialized', async () => {
      const fresh = new PiHarness(); // no initialize()
      await expect(
        fresh.registerMCPs([createTestServer('fs', [createTestTool('read', 'reads')])]),
      ).rejects.toThrow(/not initialized/i);
    });
  });

  describe('single server registration', () => {
    it('should register one server and return one namespaced tool', async () => {
      const tools = await harness.registerMCPs([
        createTestServer('fs', [createTestTool('read_file', 'Reads a file')]),
      ]);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('fs__read_file');
      expect(tools[0].description).toBe('Reads a file');
      expect(tools[0].input_schema.type).toBe('object');
    });
  });

  describe('multiple servers / multiple tools', () => {
    it('should register multiple servers and return all namespaced tools', async () => {
      const t1 = createTestTool('tool1', 'Tool 1');
      const t2 = createTestTool('tool2', 'Tool 2');
      const t3 = createTestTool('tool3', 'Tool 3');
      const tools = await harness.registerMCPs([
        createTestServer('fs', [t1, t2]),
        createTestServer('git', [t3]),
      ]);

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual(['fs__tool1', 'fs__tool2', 'git__tool3']);
    });
  });

  describe('namespacing', () => {
    it('should namespace tool names as serverName__toolName', async () => {
      const tools = await harness.registerMCPs([
        createTestServer('srv', [createTestTool('echo', 'echoes')]),
      ]);

      expect(tools.every((t) => t.name.includes('__'))).toBe(true);
      expect(tools[0].name).toBe('srv__echo');
    });
  });

  describe('idempotent / repeated calls', () => {
    it('should accumulate tools across separate registerMCPs calls with different servers', async () => {
      const tools1 = await harness.registerMCPs([
        createTestServer('a', [createTestTool('ta', 'Tool A')]),
      ]);
      expect(tools1).toHaveLength(1);
      expect(tools1[0].name).toBe('a__ta');

      const tools2 = await harness.registerMCPs([
        createTestServer('b', [createTestTool('tb', 'Tool B')]),
      ]);
      // MCPHandler.getTools() returns ALL tools from all registered servers
      expect(tools2).toHaveLength(2);
      expect(tools2.map((t) => t.name)).toEqual(['a__ta', 'b__tb']);
    });
  });

  describe('empty array', () => {
    it('should return empty array when no servers provided', async () => {
      const tools = await harness.registerMCPs([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe('duplicate server rejection', () => {
    it('should throw when registering duplicate server names', async () => {
      const server = createTestServer('dup', [createTestTool('t1', 'Tool 1')]);
      await harness.registerMCPs([server]);

      await expect(harness.registerMCPs([server])).rejects.toThrow(
        /already registered/i,
      );
    });
  });

  describe('return shape', () => {
    it('should return Tool[] with input_schema', async () => {
      const tools = await harness.registerMCPs([
        createTestServer('fs', [createTestTool('read', 'reads')]),
      ]);

      expect(Array.isArray(tools)).toBe(true);
      const tool = tools[0];
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    });
  });

  describe('integration with buildCustomTools', () => {
    it('should produce one ToolDefinition per registered tool via buildCustomTools', async () => {
      await harness.registerMCPs([
        createTestServer('fs', [createTestTool('read', 'reads')]),
      ]);

      const noopExecutor = async () => ({ content: '', isError: false });
      // @ts-expect-error - Testing private method
      const customTools = harness.buildCustomTools(noopExecutor);
      expect(customTools).toHaveLength(1);
      expect(customTools[0].name).toBe('fs__read');
      expect(typeof customTools[0].execute).toBe('function');
    });
  });
});
