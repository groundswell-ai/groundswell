# Research Notes: Tool Executor for Provider Delegation

## Summary

This document compiles research findings for implementing the `toolExecutor` method in the Agent class (Subtask P4.M2.T1.S2).

## Key Findings

### 1. Tool Executor Contract

From `src/types/providers.ts` (lines 167-169):
```typescript
export type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

**ToolExecutionRequest** (lines 55-61):
```typescript
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;
  /** Tool input parameters */
  input: unknown;
}
```

**ToolExecutionResult** (lines 66-72):
```typescript
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;
  /** Whether the execution resulted in an error */
  isError: boolean;
}
```

### 2. MCPHandler.executeTool() Implementation

From `src/core/mcp-handler.ts` (lines 116-146):
```typescript
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
```

**Key Pattern**: MCPHandler never throws - returns error result with `is_error: true`

### 3. Tool Naming Convention

From `src/core/mcp-handler.ts` (lines 62-67):
```typescript
const fullName = `${server.name}__${tool.name}`;
this.registeredTools.set(fullName, {
  tool: { ...tool, name: fullName },
  executor: this.createToolExecutor(server, tool),
  serverName: server.name,
});
```

**Format**: `serverName__toolName` (double underscore separator)

**Examples**:
- `filesystem__read_file`
- `database__query`
- `demo__demo_tool`

**Critical**: Do NOT parse or split the name - pass it directly to MCPHandler

### 4. Agent Class MCPHandler Sources

From `src/core/agent.ts` (lines 83-86, 134-147):
```typescript
/** MCP handler for tool management */
private readonly mcpHandler: MCPHandler;

/** Direct MCPHandler instances for delegated execution */
private readonly mcpHandlers: MCPHandler[] = [];

// In constructor:
this.mcpHandler = new MCPHandler();

if (config.mcps) {
  for (const mcp of config.mcps) {
    // If the MCP is already an MCPHandler instance, store it directly
    // for delegated tool execution (preserves registered executors)
    if (mcp instanceof MCPHandler) {
      this.mcpHandlers.push(mcp);
    }
    // Always register with main handler for tool discovery
    this.mcpHandler.registerServer(mcp);
  }
}
```

**Two Sources**:
1. `this.mcpHandlers[]` - Delegated MCPHandler instances (check first)
2. `this.mcpHandler` - Main MCPHandler (fallback)

### 5. Provider Usage Pattern

From `src/providers/anthropic-provider.ts` (lines 243-246):
```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>>
```

Providers receive toolExecutor as a callback parameter and invoke it when tools need execution.

### 6. Async Error Handling Pattern

From `src/core/agent.ts` (lines 639-648):
```typescript
} catch (error) {
  const duration = Date.now() - startTime;
  const message = error instanceof Error ? error.message : 'Unknown error';

  return createErrorResponse(
    'API_REQUEST_FAILED',
    `Agent SDK error: ${message}`,
    { duration },
    true // API errors are typically recoverable
  ) as AgentResponse<T>;
}
```

**Pattern**: Always use `error instanceof Error ? error.message : 'Unknown error'`

### 7. Result Type Conversion

**MCPHandler ToolResult**:
```typescript
{
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
```

**Provider ToolExecutionResult**:
```typescript
{
  content: string | unknown;
  isError: boolean;
}
```

**Conversion**:
- `result.content` → `content` (unchanged)
- `result.is_error` → `isError` (default to `false` if undefined)
- Ignore `tool_use_id` field

## External Documentation References

### TypeScript Async/Await

1. **TypeScript Handbook - Async/Await**
   - URL: https://www.typescriptlang.org/docs/handbook/2/functions.html#async-await
   - Best practices for promise handling

2. **TypeScript Deep Dive**
   - URL: https://basarat.gitbook.io/typescript/async-await
   - Common pitfalls and patterns

### Tool Execution Patterns

1. **Anthropic TypeScript SDK - Tool Use**
   - Repository: https://github.com/anthropics/anthropic-sdk-typescript
   - Docs: https://docs.anthropic.com/en/api/tool-use

2. **Vercel AI SDK - Tool Calling**
   - Repository: https://github.com/vercel/ai
   - Docs: https://sdk.vercel.ai/docs/ai-sdk-core/tools/tool-calling

3. **MCP Specification**
   - URL: https://spec.modelcontextprotocol.io/
   - Tool execution standards

## Implementation Checklist

- [ ] Add `import type { ToolExecutionRequest, ToolExecutionResult }` to agent.ts
- [ ] Implement `private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult>`
- [ ] Check `this.mcpHandlers[]` first (delegated handlers)
- [ ] Check `this.mcpHandler` second (main handler)
- [ ] Convert ToolResult to ToolExecutionResult format
- [ ] Handle errors with try/catch and instanceof check
- [ ] Return error result for unregistered tools
- [ ] Add JSDoc documentation
- [ ] Create unit tests

## Testing Strategy

### Unit Tests
- Delegate to main MCPHandler
- Delegate to delegated MCPHandlers
- Tool not found scenario
- Result format conversion
- Error handling

### Integration Tests
- Provider.execute() with toolExecutor (in P4.M2.T1.S3)
- Tool name format handling
- Dual MCPHandler source routing

---

**Research Date: 2026-01-26**
**Researcher: Claude (Anthropic)**
**Status: Complete**
