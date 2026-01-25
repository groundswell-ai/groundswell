/**
 * MCP Handler - Manages MCP server connections and tool execution
 *
 * Provides integration with MCP (Model Context Protocol) servers,
 * converting MCP tools to Anthropic Tool format and Agent SDK MCP format.
 */

import {
  createSdkMcpServer,
  tool as sdkTool,
  type McpServerConfig,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { MCPServer, Tool, ToolResult } from '../types/index.js';

/**
 * Tool executor function type
 */
export type ToolExecutor = (input: unknown) => Promise<unknown>;

/**
 * Registered tool with its executor
 */
interface RegisteredTool {
  tool: Tool;
  executor: ToolExecutor;
  serverName: string;
}

/**
 * MCPHandler - Manages MCP server registration and tool execution
 *
 * Supports:
 * - inprocess transport: Direct tool registration with executors
 * - stdio transport: External MCP server processes
 * - Agent SDK integration: Convert to SDK MCP server format
 */
export class MCPHandler {
  /** Registered MCP servers */
  private servers: Map<string, MCPServer> = new Map();

  /** Registered tools from all servers */
  private registeredTools: Map<string, RegisteredTool> = new Map();

  /** Custom tool executors for inprocess servers */
  private toolExecutors: Map<string, ToolExecutor> = new Map();

  /**
   * Register an MCP server
   * @param server MCP server configuration
   */
  public registerServer(server: MCPServer): void {
    if (this.servers.has(server.name)) {
      throw new Error(`MCP server '${server.name}' is already registered`);
    }

    this.servers.set(server.name, server);

    // Register tools from the server
    if (server.tools) {
      for (const tool of server.tools) {
        const fullName = `${server.name}__${tool.name}`;
        this.registeredTools.set(fullName, {
          tool: { ...tool, name: fullName },
          executor: this.createToolExecutor(server, tool),
          serverName: server.name,
        });
      }
    }
  }

  /**
   * Unregister an MCP server
   * @param name Server name to unregister
   */
  public unregisterServer(name: string): void {
    const server = this.servers.get(name);
    if (server?.tools) {
      for (const tool of server.tools) {
        const fullName = `${name}__${tool.name}`;
        this.registeredTools.delete(fullName);
      }
    }
    this.servers.delete(name);
  }

  /**
   * Register a custom tool executor for an inprocess tool
   * @param serverName Server name
   * @param toolName Tool name
   * @param executor Executor function
   */
  public registerToolExecutor(
    serverName: string,
    toolName: string,
    executor: ToolExecutor
  ): void {
    const fullName = `${serverName}__${toolName}`;
    this.toolExecutors.set(fullName, executor);
  }

  /**
   * Get all tools from registered servers in Anthropic format
   * @returns Array of Tool definitions
   */
  public getTools(): Tool[] {
    return Array.from(this.registeredTools.values()).map((rt) => rt.tool);
  }

  /**
   * Execute a tool by name
   * @param toolName Full tool name (serverName__toolName)
   * @param input Tool input
   * @returns Tool result
   */
  public async executeTool(
    toolName: string,
    input: unknown
  ): Promise<ToolResult> {
    const registered = this.registeredTools.get(toolName);
    if (!registered) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Tool '${toolName}' not found`,
        is_error: true,
      };
    }

    try {
      const result = await registered.executor(input);
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: typeof result === 'string' ? result : JSON.stringify(result),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Tool execution failed: ${message}`,
        is_error: true,
      };
    }
  }

  /**
   * Check if a tool is registered
   * @param toolName Tool name to check
   */
  public hasTool(toolName: string): boolean {
    return this.registeredTools.has(toolName);
  }

  /**
   * Get registered server names
   */
  public getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Convert to Agent SDK MCP server configuration
   * Returns an SDK MCP server that can be used with query()
   */
  public toAgentSDKServer(): McpServerConfig | null {
    const tools = this.getTools();
    if (tools.length === 0) {
      return null;
    }

    // Create SDK tool definitions from registered tools
    const sdkTools = Array.from(this.registeredTools.entries()).map(
      ([fullName, registered]) => {
        // Convert JSON Schema input_schema to Zod raw shape for SDK tool
        // The tool() function expects a ZodRawShape, not a ZodObject
        const zodRawShape = this.jsonSchemaToZodRawShape(registered.tool.input_schema);

        return sdkTool(
          fullName,
          registered.tool.description,
          zodRawShape,
          async (args: unknown) => {
            try {
              const result = await registered.executor(args);
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: typeof result === 'string' ? result : JSON.stringify(result),
                  },
                ],
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              return {
                content: [{ type: 'text' as const, text: `Error: ${message}` }],
                isError: true,
              };
            }
          }
        );
      }
    );

    // Create SDK MCP server with all tools
    return createSdkMcpServer({
      name: 'groundswell-mcp',
      version: '1.0.0',
      tools: sdkTools,
    });
  }

  /**
   * Convert JSON Schema to Zod raw shape (for tool() function)
   * The Agent SDK tool() expects a ZodRawShape, not a ZodObject
   */
  private jsonSchemaToZodRawShape(
    schema: Tool['input_schema']
  ): Record<string, z.ZodTypeAny> {
    const zodProps: Record<string, z.ZodTypeAny> = {};

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        zodProps[key] = this.jsonSchemaPropertyToZod(value as Record<string, unknown>);
      }
    }

    // Handle required fields - mark non-required as optional
    if (schema.required && schema.required.length > 0) {
      const requiredSet = new Set(schema.required);
      const processedProps: Record<string, z.ZodTypeAny> = {};

      for (const [key, zodType] of Object.entries(zodProps)) {
        if (!requiredSet.has(key)) {
          processedProps[key] = zodType.optional();
        } else {
          processedProps[key] = zodType;
        }
      }

      return processedProps;
    }

    return zodProps;
  }

  /**
   * Convert a JSON Schema property to Zod type
   */
  private jsonSchemaPropertyToZod(prop: Record<string, unknown>): z.ZodTypeAny {
    const type = prop.type as string;

    switch (type) {
      case 'string':
        return z.string();
      case 'number':
      case 'integer':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        if (prop.items) {
          return z.array(this.jsonSchemaPropertyToZod(prop.items as Record<string, unknown>));
        }
        return z.array(z.unknown());
      case 'object':
        if (prop.properties) {
          const nestedSchema: Record<string, z.ZodTypeAny> = {};
          for (const [key, value] of Object.entries(prop.properties as Record<string, unknown>)) {
            nestedSchema[key] = this.jsonSchemaPropertyToZod(value as Record<string, unknown>);
          }
          return z.object(nestedSchema);
        }
        return z.record(z.unknown());
      default:
        return z.unknown();
    }
  }

  /**
   * Create a tool executor based on transport type
   */
  private createToolExecutor(server: MCPServer, tool: Tool): ToolExecutor {
    const fullName = `${server.name}__${tool.name}`;

    if (server.transport === 'inprocess') {
      // For inprocess, look for registered executor
      return async (input: unknown) => {
        const executor = this.toolExecutors.get(fullName);
        if (!executor) {
          throw new Error(
            `No executor registered for inprocess tool '${fullName}'. ` +
              `Use registerToolExecutor() to provide an executor.`
          );
        }
        return executor(input);
      };
    }

    // stdio transport - placeholder for future implementation
    return async (_input: unknown) => {
      throw new Error(
        `stdio transport for MCP server '${server.name}' is not yet implemented. ` +
          `Use inprocess transport or register a custom executor.`
      );
    };
  }
}
