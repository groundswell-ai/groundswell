import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { MCPHandler } from '../../core/mcp-handler.js';
import { ProviderRegistry } from '../../providers/provider-registry.js';
import type { Provider, ProviderId, ProviderCapabilities } from '../../types/providers.js';
import type { ModelSpec } from '../../types/providers.js';

/**
 * Helper function to create mock Provider for testing
 */
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

/**
 * Access private toolExecutor method for testing
 */
function getToolExecutor(agent: Agent) {
  return (agent as any).toolExecutor.bind(agent);
}

describe('Agent.toolExecutor', () => {
  beforeEach(() => {
    // Register mock anthropic provider before each test
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
  });

  describe('delegation to main MCPHandler', () => {
    it('should delegate to MCPHandler for registered tools', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'echo',
                description: 'Echo input',
                input_schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                  required: ['message'],
                },
              },
            ],
          },
        ],
      });

      // Register tool executor
      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'echo', async (input: unknown) => {
        return input;
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__echo',
        input: { message: 'hello world' },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual({ message: 'hello world' });
    });

    it('should return error result for unregistered tools', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'echo',
                description: 'Echo input',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      // Register tool executor
      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'echo', async (input: unknown) => {
        return input;
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__nonexistent',
        input: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('not found');
    });

    it('should handle tool execution errors gracefully', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'failing',
                description: 'A failing tool',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      // Register tool executor that throws
      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'failing', async () => {
        throw new Error('Tool execution failed');
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__failing',
        input: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Tool execution failed');
    });
  });

  describe('delegation to mcpHandlers array', () => {
    it('should delegate to mcpHandlers for delegated tools', async () => {
      // Create a delegated MCPHandler with custom tools
      const delegatedHandler = new MCPHandler();
      delegatedHandler.registerServer({
        name: 'delegated-server',
        transport: 'inprocess',
        tools: [
          {
            name: 'custom_tool',
            description: 'A custom tool',
            input_schema: {
              type: 'object',
              properties: {
                value: { type: 'number' },
              },
            },
          },
        ],
      });
      delegatedHandler.registerToolExecutor(
        'delegated-server',
        'custom_tool',
        async (input: unknown) => {
          return { result: 'delegated', input };
        }
      );

      // Create agent with delegated handler
      const agent = new Agent({
        mcps: [delegatedHandler],
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'delegated-server__custom_tool',
        input: { value: 42 },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual({ result: 'delegated', input: { value: 42 } });
    });

    it('should check delegated handlers before main handler', async () => {
      // Create a delegated MCPHandler
      const delegatedHandler = new MCPHandler();
      delegatedHandler.registerServer({
        name: 'shared-server',
        transport: 'inprocess',
        tools: [
          {
            name: 'tool',
            description: 'A tool',
            input_schema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      });
      delegatedHandler.registerToolExecutor('shared-server', 'tool', async () => {
        return { source: 'delegated' };
      });

      // Create agent with both delegated and main handler having same tool name
      const agent = new Agent({
        mcps: [
          delegatedHandler,
          {
            name: 'shared-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'tool',
                description: 'A tool',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      // Register executor on main handler
      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('shared-server', 'tool', async () => {
        return { source: 'main' };
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'shared-server__tool',
        input: {},
      });

      // Should use delegated handler (checked first)
      expect(result.isError).toBe(false);
      expect(result.content).toEqual({ source: 'delegated' });
    });
  });

  describe('ToolResult to ToolExecutionResult conversion', () => {
    it('should convert string content correctly', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'string_tool',
                description: 'Returns string',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'string_tool', async () => {
        return 'string result';
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__string_tool',
        input: {},
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBe('string result');
    });

    it('should convert object content correctly', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'object_tool',
                description: 'Returns object',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'object_tool', async () => {
        return { data: [1, 2, 3], count: 3 };
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__object_tool',
        input: {},
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual({ data: [1, 2, 3], count: 3 });
    });

    it('should preserve serverName__toolName format without parsing', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'my-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'my_tool',
                description: 'A tool',
                input_schema: {
                  type: 'object',
                  properties: {
                    toolName: { type: 'string' },
                  },
                },
              },
            ],
          },
        ],
      });

      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('my-server', 'my_tool', async (input: unknown) => {
        return { received: input };
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'my-server__my_tool',
        input: { toolName: 'my-server__my_tool' },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual({ received: { toolName: 'my-server__my_tool' } });
    });
  });

  describe('error handling', () => {
    it('should handle errors from delegated handlers', async () => {
      const delegatedHandler = new MCPHandler();
      delegatedHandler.registerServer({
        name: 'failing-server',
        transport: 'inprocess',
        tools: [
          {
            name: 'fail',
            description: 'Fails',
            input_schema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      });
      delegatedHandler.registerToolExecutor('failing-server', 'fail', async () => {
        throw new Error('Delegated handler error');
      });

      const agent = new Agent({
        mcps: [delegatedHandler],
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'failing-server__fail',
        input: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Delegated handler error');
    });

    it('should handle unknown error types', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'throw_string',
                description: 'Throws string',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'throw_string', async () => {
        throw 'string error';
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__throw_string',
        input: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Unknown error');
    });

    it('should handle Error objects correctly', async () => {
      const agent = new Agent({
        mcps: [
          {
            name: 'test-server',
            transport: 'inprocess',
            tools: [
              {
                name: 'throw_error',
                description: 'Throws Error',
                input_schema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      });

      const handler = agent.getMcpHandler();
      handler.registerToolExecutor('test-server', 'throw_error', async () => {
        throw new Error('Custom error message');
      });

      // Access private method via type assertion
      const toolExecutor = (agent as any).toolExecutor.bind(agent);

      const result = await toolExecutor({
        name: 'test-server__throw_error',
        input: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Custom error message');
    });
  });
});
