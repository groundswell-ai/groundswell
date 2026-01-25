# Agent.ts query() Pattern Research

## Source: src/core/agent.ts

### 1. SDK Options Object Construction (Lines 398-426)

The `query()` method constructs the SDK Options object as follows:

```typescript
const sdkOptions: AgentSDKOptions = {
    model: effectiveModel,                                    // String - the model identifier
    systemPrompt: effectiveSystem,                            // String - system prompt content
    env: { ...process.env, ...(overrides?.env ?? this.config.env) } as Record<string, string>,  // Process + custom env vars
};

// Add tools if available
if (effectiveTools && effectiveTools.length > 0) {
    sdkOptions.allowedTools = effectiveTools.map((t) => t.name);  // String[] of tool names
}

// Add MCP servers
const mcpServers = this.buildMcpServers();
if (mcpServers) {
    sdkOptions.mcpServers = mcpServers;  // Record<string, McpServerConfig>
}

// Add hooks
if (effectiveHooks) {
    sdkOptions.hooks = this.buildAgentSDKHooks(effectiveHooks);  // Partial<Record<string, { hooks: HookCallback[] }>>
}

// Add output format for structured response
const jsonSchema = this.zodToJsonSchema(prompt.responseFormat);
sdkOptions.outputFormat = {
    type: 'json_schema',
    schema: jsonSchema as Record<string, unknown>,  // JSON Schema
};
```

### 2. Model Mapping (Line 320)

```typescript
const effectiveModel = overrides?.model ?? this.model;
```

The model is sourced in priority order: `overrides.model` → `config.model` → default (`claude-sonnet-4-20250514`).

### 3. SystemPrompt Handling (Lines 317-318)

```typescript
const effectiveSystem =
    prompt.systemOverride ?? overrides?.system ?? this.config.system;
```

System prompt is sourced in priority order: `prompt.systemOverride` → `overrides.system` → `config.system`.

### 4. Tools Conversion (Lines 383-385, 405-407)

```typescript
const effectiveTools = this.mergeTools(
    prompt.toolsOverride ?? overrides?.tools ?? this.config.tools
);

// ...
if (effectiveTools && effectiveTools.length > 0) {
    sdkOptions.allowedTools = effectiveTools.map((t) => t.name);
}
```

Tools are merged from multiple sources and converted to an array of tool names (`string[]`).

### 5. MCP Servers Conversion (Lines 201-216, 410-413)

The `buildMcpServers()` method creates the `createSdkMcpServer` pattern:

```typescript
private buildMcpServers(): Record<string, McpServerConfig> | undefined {
    const mcpServers: Record<string, McpServerConfig> = {};

    let serverIndex = 0;
    for (const handler of [this.mcpHandler, ...this.mcpHandlers]) {
        const sdkServer = handler.toAgentSDKServer();
        if (sdkServer) {
            const serverName = `groundswell-mcp-${serverIndex++}`;
            mcpServers[serverName] = sdkServer;
        }
    }

    return Object.keys(mcpServers).length > 0 ? mcpServers : undefined;
}
```

### 6. Hooks Conversion (Lines 221-294)

The `buildAgentSDKHooks()` method converts hooks to SDK format:

```typescript
private buildAgentSDKHooks(
    effectiveHooks: AgentHooks
): Partial<Record<string, { hooks: HookCallback[] }>> {
    const sdkHooks: Partial<Record<string, { hooks: HookCallback[] }>> = {};

    // PreToolUse hooks
    if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
        sdkHooks['PreToolUse'] = {
            hooks: effectiveHooks.preToolUse.map(
                (hook) => async (input: HookInput) => {
                    const preInput = input as PreToolUseHookInput;
                    await hook({
                        toolName: preInput.tool_name,
                        toolInput: preInput.tool_input,
                        agentId: this.id,
                    } as PreToolUseContext);
                    return { continue: true };
                }
            ),
        };
    }

    // Similar pattern for postToolUse, sessionStart, sessionEnd
}
```

### 7. query() Call Signature (Line 431)

```typescript
const q = query({ prompt: userMessage, options: sdkOptions });
```

The `query()` function is imported from `@anthropic-ai/claude-agent-sdk` and takes an object with:
- `prompt`: string - the user message/prompt
- `options`: `AgentSDKOptions` - the full options object

### 8. AsyncGenerator Return and Message Iteration (Lines 437-466)

```typescript
for await (const message of q) {
    // Count tool uses from assistant messages
    if (message.type === 'assistant') {
        const content = message.message?.content;
        if (Array.isArray(content)) {
            for (const block of content) {
                if (block.type === 'tool_use') {
                    toolCallCount++;
                    // Emit tool invocation event if in workflow context
                    if (ctx) {
                        this.emitWorkflowEvent({
                            type: 'toolInvocation',
                            toolName: block.name,
                            input: block.input,
                            output: undefined, // Not available at this point
                            duration: 0,
                            node: ctx.workflowNode,
                        });
                    }
                }
            }
        }
    }

    // Capture the final result message
    if (message.type === 'result') {
        resultMessage = message as SDKResultMessage;
    }
}
```

### 9. Results Collection and Error Handling (Lines 468-499)

```typescript
const duration = Date.now() - startTime;

// Handle result
if (!resultMessage) {
    return createErrorResponse(
        'INVALID_RESPONSE_FORMAT',
        'No result message received from Agent SDK',
        { duration },
        false
    ) as AgentResponse<T>;
}

// Check for errors in result
if (resultMessage.subtype !== 'success') {
    const errorResult = resultMessage as SDKResultMessage & { subtype: string; errors?: string[] };
    return createErrorResponse(
        'EXECUTION_FAILED',
        `Agent SDK execution failed: ${errorResult.subtype}`,
        {
            errors: errorResult.errors ?? [],
            subtype: errorResult.subtype,
        },
        errorResult.subtype === 'error_max_turns' // Recoverable if just hit turn limit
    ) as AgentResponse<T>;
}

// Extract usage from result
const totalUsage: TokenUsage = {
    input_tokens: resultMessage.usage?.input_tokens ?? 0,
    output_tokens: resultMessage.usage?.output_tokens ?? 0,
};
```

### 10. MCPHandler Server Structure (src/core/mcp-handler.ts)

The `MCPHandler` class manages:
- `servers`: Map<string, MCPServer> - registered MCP servers
- `registeredTools`: Map<string, RegisteredTool> - tools with executors
- `toolExecutors`: Map<string, ToolExecutor> - custom executors

Key methods:
- `registerServer(server: MCPServer): void` - registers an MCP server
- `getTools(): Tool[]` - returns all tools in Anthropic format
- `toAgentSDKServer(): McpServerConfig | null` - converts to SDK format

### 11. Hook Definitions (src/types/sdk-primitives.ts)

```typescript
export type HookHandler<T = unknown> = (context: T) => Promise<void> | void;

export interface PreToolUseContext {
    toolName: string;
    toolInput: unknown;
    agentId: string;
}

export interface PostToolUseContext {
    toolName: string;
    toolInput: unknown;
    toolOutput: unknown;
    agentId: string;
    duration: number;
}

export interface SessionStartContext {
    agentId: string;
    agentName?: string;
}

export interface SessionEndContext {
    agentId: string;
    agentName?: string;
    totalDuration: number;
}

export interface AgentHooks {
    preToolUse?: HookHandler<PreToolUseContext>[];
    postToolUse?: HookHandler<PostToolUseContext>[];
    sessionStart?: HookHandler<SessionStartContext>[];
    sessionEnd?: HookHandler<SessionEndContext>[];
}
```

### 12. ProviderHookEvents Definition (src/types/providers.ts)

```typescript
export interface ProviderHookEvents {
    /** Called before tool execution */
    onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;

    /** Called after tool execution */
    onToolEnd?: (
        tool: ToolExecutionRequest,
        result: ToolExecutionResult,
        duration: number
    ) => Promise<void> | void;

    /** Called when provider session starts */
    onSessionStart?: () => Promise<void> | void;

    /** Called when provider session ends */
    onSessionEnd?: (totalDuration: number) => Promise<void> | void;

    /** Called for each streaming chunk */
    onStream?: (chunk: string) => void;
}
```

### Key Implementation Notes for execute() Method

1. **SDK Loading**: Use lazy loading in `initialize()` method (lines 114-127)
2. **Options Construction**: Build `AgentSDKOptions` object with all fields shown above
3. **Tool Execution**: Use the provided `toolExecutor` callback for tool execution
4. **Hook Mapping**: Convert `ProviderHookEvents` to SDK hook format
5. **Error Handling**: Check `resultMessage.subtype` for 'success' vs 'error_max_turns'
6. **Structured Output**: Handle both `structured_output` and text parsing with JSON extraction
7. **Message Iteration**: Use `for await` loop over the AsyncGenerator returned by `query()`
