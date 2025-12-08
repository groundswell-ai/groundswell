import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../../core/agent.js';
import { MCPHandler } from '../../core/mcp-handler.js';

describe('Agent', () => {
  it('should create with unique id', () => {
    const a1 = new Agent();
    const a2 = new Agent();
    expect(a1.id).not.toBe(a2.id);
  });

  it('should use default name when not provided', () => {
    const agent = new Agent();
    expect(agent.name).toBe('Agent');
  });

  it('should use custom name when provided', () => {
    const agent = new Agent({ name: 'CustomAgent' });
    expect(agent.name).toBe('CustomAgent');
  });

  it('should provide access to MCP handler', () => {
    const agent = new Agent();
    const handler = agent.getMcpHandler();
    expect(handler).toBeInstanceOf(MCPHandler);
  });

  it('should register MCP servers from config', () => {
    const agent = new Agent({
      mcps: [
        {
          name: 'test-mcp',
          transport: 'inprocess',
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: {} },
            },
          ],
        },
      ],
    });

    const handler = agent.getMcpHandler();
    expect(handler.getServerNames()).toContain('test-mcp');
    expect(handler.hasTool('test-mcp__test_tool')).toBe(true);
  });
});

describe('MCPHandler', () => {
  it('should register and unregister servers', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'server1',
      transport: 'inprocess',
    });

    expect(handler.getServerNames()).toContain('server1');

    handler.unregisterServer('server1');
    expect(handler.getServerNames()).not.toContain('server1');
  });

  it('should throw when registering duplicate server', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'server1',
      transport: 'inprocess',
    });

    expect(() =>
      handler.registerServer({
        name: 'server1',
        transport: 'inprocess',
      })
    ).toThrow("MCP server 'server1' is already registered");
  });

  it('should convert tools to full names', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'myserver',
      transport: 'inprocess',
      tools: [
        {
          name: 'tool1',
          description: 'Tool 1',
          input_schema: { type: 'object', properties: {} },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          input_schema: { type: 'object', properties: {} },
        },
      ],
    });

    const tools = handler.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('myserver__tool1');
    expect(tools[1].name).toBe('myserver__tool2');
  });

  it('should execute registered tool', async () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'math',
      transport: 'inprocess',
      tools: [
        {
          name: 'add',
          description: 'Add two numbers',
          input_schema: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' },
            },
          },
        },
      ],
    });

    handler.registerToolExecutor('math', 'add', async (input: unknown) => {
      const { a, b } = input as { a: number; b: number };
      return a + b;
    });

    const result = await handler.executeTool('math__add', { a: 2, b: 3 });
    expect(result.content).toBe('5');
    expect(result.is_error).toBeUndefined();
  });

  it('should return error for unknown tool', async () => {
    const handler = new MCPHandler();
    const result = await handler.executeTool('unknown__tool', {});
    expect(result.is_error).toBe(true);
    expect(result.content).toContain('not found');
  });

  it('should return error when tool throws', async () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'failing',
      transport: 'inprocess',
      tools: [
        {
          name: 'fail',
          description: 'Always fails',
          input_schema: { type: 'object', properties: {} },
        },
      ],
    });

    handler.registerToolExecutor('failing', 'fail', async () => {
      throw new Error('Tool error');
    });

    const result = await handler.executeTool('failing__fail', {});
    expect(result.is_error).toBe(true);
    expect(result.content).toContain('Tool error');
  });
});
