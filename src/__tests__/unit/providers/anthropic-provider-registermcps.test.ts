/**
 * Test file: anthropic-provider-registermcps.test.ts
 *
 * Purpose: Comprehensive tests for AnthropicProvider registerMCPs() method per P2.M1.T1.S7
 *
 * Tests:
 * - SDK initialization check (throws if not initialized)
 * - Server registration with single server
 * - Server registration with multiple servers
 * - Tool discovery returns MCP format tools
 * - SDK config is stored correctly
 * - Empty servers array handling
 * - Multiple calls to registerMCPs() (idempotent check)
 * - Tool naming uses serverName__toolName format
 * - Integration with execute() method
 *
 * PRP: P2.M1.T1.S7 - Implement registerMCPs() method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../../../harnesses/anthropic-provider.js';
import { ProviderRegistry } from '../../../harnesses/harness-registry.js';
import type { MCPServer, Tool } from '../../../types/sdk-primitives.js';

describe('AnthropicProvider - registerMCPs()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  // Test tool fixture
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

  // Test server fixture
  const createTestServer = (name: string, tools: Tool[]): MCPServer => ({
    name,
    transport: 'inprocess',
    tools,
  });

  describe('SDK Initialization Check', () => {
    it('should throw if SDK is not initialized', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await expect(provider.registerMCPs(servers)).rejects.toThrow(
        'SDK not initialized. Call initialize() first.'
      );
    });

    it('should throw with descriptive error message', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      try {
        await provider.registerMCPs(servers);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('SDK not initialized. Call initialize() first.');
      }
    });

    it('should not throw after initialize() is called', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await expect(provider.registerMCPs(servers)).resolves.not.toThrow();
    });
  });

  describe('Server Registration', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should register a single server successfully', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-server__test_tool');
    });

    it('should register multiple servers successfully', async () => {
      const servers: MCPServer[] = [
        createTestServer('server1', [createTestTool('tool1', 'Tool 1')]),
        createTestServer('server2', [createTestTool('tool2', 'Tool 2')]),
        createTestServer('server3', [createTestTool('tool3', 'Tool 3')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        'server1__tool1',
        'server2__tool2',
        'server3__tool3',
      ]);
    });

    it('should register server with multiple tools', async () => {
      const servers: MCPServer[] = [
        createTestServer('multi-tool-server', [
          createTestTool('tool1', 'First tool'),
          createTestTool('tool2', 'Second tool'),
          createTestTool('tool3', 'Third tool'),
        ]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        'multi-tool-server__tool1',
        'multi-tool-server__tool2',
        'multi-tool-server__tool3',
      ]);
    });

    it('should throw when registering duplicate server names', async () => {
      const server = createTestServer('duplicate-server', [createTestTool('tool1', 'Tool 1')]);

      // First registration should succeed
      await provider.registerMCPs([server]);

      // Second registration with same name should throw
      await expect(provider.registerMCPs([server])).rejects.toThrow(
        "MCP server 'duplicate-server' is already registered"
      );
    });

    it('should handle empty servers array', async () => {
      const tools = await provider.registerMCPs([]);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should handle server with no tools', async () => {
      const servers: MCPServer[] = [
        {
          name: 'empty-server',
          transport: 'inprocess',
          tools: [],
        },
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe('Tool Discovery', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should return tools in MCP format with correct structure', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toHaveLength(1);
      const tool = tools[0];

      // MCP Tool interface structure
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('input_schema');

      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.input_schema).toBe('object');
    });

    it('should prefix tool names with server name', async () => {
      const servers: MCPServer[] = [
        createTestServer('my-server', [
          createTestTool('read_file', 'Read a file'),
          createTestTool('write_file', 'Write a file'),
        ]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools.map((t) => t.name)).toEqual([
        'my-server__read_file',
        'my-server__write_file',
      ]);
    });

    it('should preserve tool descriptions', async () => {
      const originalDescription = 'This is a detailed tool description';
      const servers: MCPServer[] = [
        createTestServer('test-server', [
          createTestTool('test_tool', originalDescription),
        ]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools[0].description).toBe(originalDescription);
    });

    it('should preserve input_schema structure', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [
          {
            name: 'complex_tool',
            description: 'A tool with complex input',
            input_schema: {
              type: 'object',
              properties: {
                string_field: { type: 'string' },
                number_field: { type: 'number' },
                boolean_field: { type: 'boolean' },
                array_field: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['string_field', 'number_field'],
            },
          },
        ]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools[0].input_schema).toEqual({
        type: 'object',
        properties: {
          string_field: { type: 'string' },
          number_field: { type: 'number' },
          boolean_field: { type: 'boolean' },
          array_field: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['string_field', 'number_field'],
      });
    });
  });

  describe('SDK Config Storage', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should store SDK config when tools are registered', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).not.toBeNull();
      expect(provider.mcpServerConfig).toBeDefined();
    });

    it('should store null SDK config when no tools are registered', async () => {
      const tools = await provider.registerMCPs([]);

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).toBeNull();
    });

    it('should store null SDK config when server has no tools', async () => {
      const servers: MCPServer[] = [
        {
          name: 'empty-server',
          transport: 'inprocess',
          tools: [],
        },
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).toBeNull();
    });

    it('should update SDK config on subsequent registrations', async () => {
      // First registration with one tool
      await provider.registerMCPs([
        createTestServer('server1', [createTestTool('tool1', 'Tool 1')]),
      ]);

      // @ts-expect-error - Testing private property
      const firstConfig = provider.mcpServerConfig;
      expect(firstConfig).not.toBeNull();

      // Second registration with different server (should throw due to duplicate check)
      // So we'll create a new provider instance
      const provider2 = new AnthropicProvider();
      await provider2.initialize();
      await provider2.registerMCPs([
        createTestServer('server2', [createTestTool('tool2', 'Tool 2')]),
      ]);

      // @ts-expect-error - Testing private property
      expect(provider2.mcpServerConfig).not.toBeNull();
      // Config should be different (different tools)
      // @ts-expect-error - Testing private property
      expect(provider2.mcpServerConfig).not.toBe(firstConfig);
    });
  });

  describe('Idempotent Behavior', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should allow calling registerMCPs() multiple times with new servers', async () => {
      // First registration
      const tools1 = await provider.registerMCPs([
        createTestServer('server1', [createTestTool('tool1', 'Tool 1')]),
      ]);

      expect(tools1).toHaveLength(1);
      expect(tools1[0].name).toBe('server1__tool1');

      // Second registration with different server
      // MCPHandler accumulates tools, so getTools() returns all registered tools
      const tools2 = await provider.registerMCPs([
        createTestServer('server2', [createTestTool('tool2', 'Tool 2')]),
      ]);

      // MCPHandler.getTools() returns ALL tools from all registered servers
      expect(tools2).toHaveLength(2);
      expect(tools2.map((t) => t.name)).toEqual(['server1__tool1', 'server2__tool2']);
    });
  });

  describe('ProviderRegistry Integration', () => {
    it('should work with ProviderRegistry initialization', async () => {
      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      // Initialize via registry
      await registry.initializeProvider('anthropic');

      // Register MCPs
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-server__test_tool');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should throw descriptive error for duplicate server names', async () => {
      const server = createTestServer('dup', [createTestTool('tool1', 'Tool 1')]);

      await provider.registerMCPs([server]);

      try {
        await provider.registerMCPs([server]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("MCP server 'dup' is already registered");
      }
    });

    it('should handle servers with undefined tools property', async () => {
      const servers: MCPServer[] = [
        {
          name: 'no-tools-server',
          transport: 'inprocess',
          // tools property is undefined
        },
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
    });
  });

  describe('Execute Integration', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should make MCP config available to execute() method', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).not.toBeNull();

      // The execute() method should now have access to mcpServerConfig
      // We can't fully test execute() without mocking the SDK, but we can
      // verify the config is stored and ready for use
      // @ts-expect-error - Testing private property
      expect(typeof provider.mcpServerConfig).toBe('object');
    });

    it('should clear mcpServerConfig on terminate()', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).not.toBeNull();

      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.mcpServerConfig).toBeNull();
    });
  });

  describe('Type Safety', () => {
    it('should return Tool[] with correct typing', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      // Type check: tools should be an array
      expect(Array.isArray(tools)).toBe(true);

      // Type check: each tool should have Tool interface properties
      tools.forEach((tool) => {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_schema).toBe('object');
        expect(tool.input_schema.type).toBe('object');
      });
    });

    it('should accept MCPServer[] parameter with correct typing', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        {
          name: 'typed-server',
          transport: 'inprocess',
          tools: [
            {
              name: 'typed_tool',
              description: 'A typed tool',
              input_schema: {
                type: 'object',
                properties: {
                  param: { type: 'string' },
                },
                required: ['param'],
              },
            },
          ],
        },
      ];

      // Should compile without TypeScript errors
      const tools: Tool[] = await provider.registerMCPs(servers);
      expect(tools).toBeDefined();
    });
  });

  describe('MCPHandler Integration', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should create MCPHandler instance on provider construction', () => {
      // @ts-expect-error - Testing private property
      expect(provider.mcpHandler).toBeDefined();
      // @ts-expect-error - Testing private property
      expect(provider.mcpHandler).toBeInstanceOf(Object);
    });

    it('should delegate server registration to MCPHandler', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      const serverNames = provider.mcpHandler.getServerNames();
      expect(serverNames).toContain('test-server');
    });

    it('should delegate tool retrieval to MCPHandler', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await provider.registerMCPs(servers);

      // @ts-expect-error - Testing private property
      const hasTool = provider.mcpHandler.hasTool('test-server__test_tool');
      expect(hasTool).toBe(true);
    });
  });
});
