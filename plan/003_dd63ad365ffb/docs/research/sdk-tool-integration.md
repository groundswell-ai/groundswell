# createSdkMcpServer and sdkTool Function Patterns

## Source: @anthropic-ai/claude-agent-sdk and src/core/mcp-handler.ts

### 1. createSdkMcpServer Function Signature

**From @anthropic-ai/claude-agent-sdk**:

```typescript
createSdkMcpServer(config: McpServerConfig): McpServerConfig
```

### 2. McpServerConfig Structure

**From src/core/mcp-handler.ts** (lines 9-12):
```typescript
import {
  createSdkMcpServer,
  tool as sdkTool,
  type McpServerConfig,
} from '@anthropic-ai/claude-agent-sdk';
```

**Structure** (from usage at lines 208-213):
```typescript
return createSdkMcpServer({
  name: 'groundswell-mcp',
  version: '1.0.0',
  tools: sdkTools,
});
```

### 3. sdkTool Function Signature

**From @anthropic-ai/claude-agent-sdk**:

```typescript
tool(
  name: string,
  description: string,
  inputSchema: ZodRawShape,  // NOT ZodObject
  executor: (args: unknown) => Promise<{ content: Content[]; isError?: boolean }>
): ToolDefinition
```

### 4. Usage Example: Creating SDK MCP Server in MCPHandler

**From src/core/mcp-handler.ts** (lines 167-213):

```typescript
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
```

### 5. JSON Schema to Zod Raw Shape Conversion

**From src/core/mcp-handler.ts** (lines 218-281):

```typescript
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
```

### 6. Building MCP Server Configurations

**From src/core/agent.ts** (lines 201-216):

```typescript
/**
 * Build MCP server configurations for Agent SDK
 */
private buildMcpServers(): Record<string, McpServerConfig> | undefined {
  const mcpServers: Record<string, McpServerConfig> = {};

  // Get all tools from our MCPHandler and create SDK MCP servers
  let serverIndex = 0;
  for (const handler of [this.mcpHandler, ...this.mcpHandlers]) {
    const sdkServer = handler.toAgentSDKServer();
    if (sdkServer) {
      // Use a unique name for each server
      const serverName = `groundswell-mcp-${serverIndex++}`;
      mcpServers[serverName] = sdkServer;
    }
  }

  return Object.keys(mcpServers).length > 0 ? mcpServers : undefined;
}
```

### 7. SDK Tool Registration Pattern

**From src/core/mcp-handler.ts** (lines 180-204):

```typescript
return sdkTool(
  fullName,  // Full tool name (serverName__toolName)
  registered.tool.description,
  zodRawShape,  // Converted from JSON Schema
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
```

### 8. Integration with Agent SDK Query

**From src/core/agent.ts** (lines 397-418):

```typescript
// Add MCP servers
const mcpServers = this.buildMcpServers();
if (mcpServers) {
  sdkOptions.mcpServers = mcpServers;
}
```

### 9. Type Mappings: JSON Schema to Zod

| JSON Schema Type | Zod Type | Notes |
|------------------|----------|-------|
| `string` | `z.string()` | Direct mapping |
| `number` | `z.number()` | Handles both number and integer |
| `integer` | `z.number()` | Mapped to number |
| `boolean` | `z.boolean()` | Direct mapping |
| `array` | `z.array()` | Recursively converts items |
| `object` | `z.object()` or `z.record()` | object if properties, record if not |
| Missing/unknown | `z.unknown()` | Fallback type |

### 10. Key Gotchas

1. **ZodRawShape vs ZodObject**: The `tool()` function expects a `ZodRawShape` (plain object of Zod types), NOT a `ZodObject`

2. **Required Field Handling**: Non-required fields must be wrapped with `.optional()` in the Zod schema

3. **Tool Executor Return Type**: Must return `{ content: Content[]; isError?: boolean }`

4. **Content Structure**: Content items must have `type: 'text'` (or other valid content types) and corresponding data

5. **Error Handling**: Tool executor should catch errors and return `{ content: [...], isError: true }`

6. **Server Naming**: Each MCP server gets a unique name (e.g., `groundswell-mcp-0`, `groundswell-mcp-1`)

7. **Empty Tools**: If no tools available, `toAgentSDKServer()` returns `null` (not undefined)

### 11. Import Pattern

**From src/core/agent.ts** (lines 8-12):

```typescript
import {
  query,
  createSdkMcpServer,
  tool,
  type Options as AgentSDKOptions,
  type SDKMessage,
  type SDKResultMessage,
  type McpServerConfig,
  type HookCallback,
  type HookInput,
  type PreToolUseHookInput,
  type PostToolUseHookInput,
  type SessionStartHookInput,
  type SessionEndHookInput,
} from '@anthropic-ai/claude-agent-sdk';
```

### 12. For P2.M1.T1.S5 Implementation

**Important**: MCP server integration is **P2.M1.T1.S7** (future subtask).

For **P2.M1.T1.S5** (query construction), use:
```typescript
const sdkOptions: AgentSDKOptions = {
  model: modelSpec.model,
  systemPrompt: request.options.systemPrompt,
  ...(request.options.tools && request.options.tools.length > 0 && {
    allowedTools: request.options.tools.map((t) => t.name),
  }),
  // mcpServers: undefined,  // TODO: P2.M1.T1.S7
  // hooks: undefined,        // TODO: P2.M1.T2.S1
};
```
