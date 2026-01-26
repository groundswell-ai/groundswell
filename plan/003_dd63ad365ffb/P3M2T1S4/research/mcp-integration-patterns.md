# MCP Integration Patterns from Codebase Analysis

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S4 - Implement registerMCPs() and loadSkills() methods
**Status:** Complete

---

## Executive Summary

This document extracts MCP (Model Context Protocol) integration patterns from the existing codebase to serve as reference for implementing OpenCodeProvider.registerMCPs().

---

## 1. AnthropicProvider.registerMCPs() Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 486-513

### Method Signature

```typescript
async registerMCPs(servers: MCPServer[]): Promise<Tool[]>
```

### Implementation Flow

```typescript
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // STEP 1: SDK initialization check
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // STEP 2: Register each server with MCPHandler
  for (const server of servers) {
    this.mcpHandler.registerServer(server);
  }

  // STEP 3: Convert to SDK format and store for execute()
  const sdkConfig = this.mcpHandler.toAgentSDKServer();
  if (sdkConfig) {
    this.mcpServerConfig = sdkConfig;
  }

  // STEP 4: Return discovered tools in MCP format
  return this.mcpHandler.getTools();
}
```

### Key Patterns

1. **SDK Check First**: Always validate SDK is initialized
2. **MCPHandler Delegation**: Use MCPHandler for server registration
3. **SDK Config Storage**: Store converted config for execute() method
4. **Tool Return Format**: Return Tool[] in MCP format (not SDK format)

---

## 2. MCPHandler Server Registration Pattern

**File:** `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`

### registerServer() Method (Lines 52-70)

```typescript
public registerServer(server: MCPServer): void {
  // Duplicate check
  if (this.servers.has(server.name)) {
    throw new Error(`MCP server '${server.name}' is already registered`);
  }

  // Store server
  this.servers.set(server.name, server);

  // Register tools with fullName pattern
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
```

### Key Patterns

1. **Duplicate Detection**: Check for existing server names
2. **Tool Namespacing**: Use `serverName__toolName` format
3. **Tool Executor Creation**: Create executor based on transport type

---

## 3. Tool Naming Convention

**Pattern**: `serverName__toolName`

**Examples**:
- `filesystem__read_file`
- `database__query`
- `mcp-server__tool-name`

**Purpose**: Prevents naming collisions across multiple MCP servers

---

## 4. SDK Config Conversion Pattern

**File:** `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`
**Lines:** 167-213

### toAgentSDKServer() Method

```typescript
public toAgentSDKServer(): McpServerConfig | null {
  const tools = this.getTools();
  if (tools.length === 0) {
    return null;
  }

  // Convert JSON Schema to Zod raw shape
  const sdkTools = Array.from(this.registeredTools.entries()).map(
    ([fullName, registered]) => {
      const zodRawShape = this.jsonSchemaToZodRawShape(registered.tool.input_schema);

      return sdkTool(
        fullName,
        registered.tool.description,
        zodRawShape,
        async (args: unknown) => {
          // Tool executor logic
        }
      );
    }
  );

  return createSdkMcpServer({
    name: 'groundswell-mcp',
    version: '1.0.0',
    tools: sdkTools,
  });
}
```

---

## 5. Error Handling Patterns

### SDK Initialization Check

```typescript
// PATTERN: Always check first
if (!this.sdk) {
  throw new Error("SDK not initialized. Call initialize() first.");
}
```

### Duplicate Server Check

```typescript
// PATTERN: Descriptive error with server name
if (this.servers.has(server.name)) {
  throw new Error(`MCP server '${server.name}' is already registered`);
}
```

### File Read Error Wrapping

```typescript
// PATTERN: Include context in error
try {
  const content = await readFile(skillMdPath, 'utf-8');
} catch (error) {
  throw new Error(
    `Failed to load skill '${skill.name}' from ${skill.path}: ` +
    `${error instanceof Error ? error.message : 'Unknown error'}`
  );
}
```

---

## 6. Return Type Pattern

**Interface**: `Tool[]`

**Tool Structure**:
```typescript
interface Tool {
  name: string;              // Prefixed: "serverName__toolName"
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

---

## 7. OpenCode Limitations

**Critical Finding**: OpenCode executes tools server-side with NO client-side delegation.

**Implications**:
- Cannot use MCPHandler pattern
- Cannot register tools directly
- registerMCPs() must return empty array (LLM-only mode)
- Tools managed by Groundswell's MCPHandler, not OpenCode

---

## 8. OpenCode Alternative Pattern

**File**: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/P3M2T1S3/opencode-tool-execution-research.md`

### LLM-Only Mode

```typescript
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  // LLM-only mode: no tool registration
  // Tools are managed by Groundswell's MCPHandler, not OpenCode
  return [];
}
```

---

## 9. Testing Patterns

**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts`

### Test Fixture Pattern

```typescript
// Test tool fixture
const createTestTool = (name: string, description: string): Tool => ({
  name,
  description,
  input_schema: {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message'],
  },
});

// Test server fixture
const createTestServer = (name: string, tools: Tool[]): MCPServer => ({
  name,
  transport: 'inprocess',
  tools,
});
```

### SDK Initialization Test

```typescript
it('should throw if SDK is not initialized', async () => {
  const servers = [createTestServer('test', [createTestTool('tool', 'desc')])];

  await expect(provider.registerMCPs(servers)).rejects.toThrow(
    'SDK not initialized. Call initialize() first.'
  );
});
```

---

## 10. Code References

| File | Lines | Purpose |
|------|-------|---------|
| `src/providers/anthropic-provider.ts` | 486-513 | registerMCPs() implementation |
| `src/core/mcp-handler.ts` | 52-70 | Server registration |
| `src/core/mcp-handler.ts` | 106-108 | getTools() method |
| `src/core/mcp-handler.ts` | 167-213 | toAgentSDKServer() conversion |
| `src/types/sdk-primitives.ts` | 37-52 | MCPServer interface |
| `src/types/sdk-primitives.ts` | 10-21 | Tool interface |
| `src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts` | Full | Test patterns |

---

**End of MCP Integration Patterns Research**
