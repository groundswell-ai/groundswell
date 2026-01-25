# Anthropic Agent SDK query() Function Research

**Research Date:** January 25, 2026
**SDK Version:** 0.1.77
**Package:** @anthropic-ai/claude-agent-sdk
**Purpose:** Comprehensive documentation of the query() function and AgentSDKOptions interface

---

## Executive Summary

The Anthropic Agent SDK provides a `query()` function for building AI agents with Claude Code's capabilities. This research documents the function signature, all configuration options, and best practices based on the installed SDK version 0.1.77.

**Key Finding:** The SDK is designed for stateless operation with automatic resource cleanup. No explicit termination is required for standard usage.

---

## 1. Function Signature

### 1.1 query() Function

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`

```typescript
export declare function query(_params: {
    prompt: string | AsyncIterable<SDKUserMessage>;
    options?: Options;
}): Query;
```

**Parameters:**
- `prompt`: Either a string or async iterable of user messages
- `options`: Optional configuration object (see section 2)

**Returns:**
- `Query`: An AsyncGenerator that emits SDKMessage objects

### 1.2 Query Interface

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`

```typescript
export interface Query extends AsyncGenerator<SDKMessage, void> {
    // Control Methods (only in streaming mode)
    interrupt(): Promise<void>;
    setPermissionMode(mode: PermissionMode): Promise<void>;
    setModel(model?: string): Promise<void>;
    setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;

    // Query Methods
    supportedCommands(): Promise<SlashCommand[]>;
    supportedModels(): Promise<ModelInfo[]>;
    mcpServerStatus(): Promise<McpServerStatus[]>;
    accountInfo(): Promise<AccountInfo>;
    rewindFiles(userMessageId: string, options?: { dryRun?: boolean }): Promise<RewindFilesResult>;
    setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult>;
    streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>;
}
```

**Key Characteristics:**
- Extends AsyncGenerator<SDKMessage, void>
- Auto-cleanup on iteration completion
- No explicit close/terminate methods
- Stateful control methods available during streaming

---

## 2. AgentSDKOptions (Options) Interface

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`

### 2.1 Complete Options Interface

```typescript
export type Options = {
    // Cancellation
    abortController?: AbortController;

    // Directories
    additionalDirectories?: string[];
    cwd?: string;

    // Tools & Permissions
    allowedTools?: string[];
    disallowedTools?: string[];
    tools?: string[] | { type: 'preset'; preset: 'claude_code' };
    canUseTool?: CanUseTool;
    permissionMode?: PermissionMode;
    allowDangerouslySkipPermissions?: boolean;
    permissionPromptToolName?: string;

    // MCP Servers
    mcpServers?: Record<string, McpServerConfig>;

    // Model Configuration
    model?: string;
    fallbackModel?: string;
    maxThinkingTokens?: number;

    // System Prompt
    systemPrompt?: string | {
        type: 'preset';
        preset: 'claude_code';
        append?: string;
    };

    // Hooks
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

    // Output Format (Structured Output)
    outputFormat?: OutputFormat;

    // Environment
    env?: { [envVar: string]: string | undefined };
    executable?: 'bun' | 'deno' | 'node';
    executableArgs?: string[];
    extraArgs?: Record<string, string | null>;
    pathToClaudeCodeExecutable?: string;
    spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess;

    // Session Management
    continue?: boolean;
    resume?: string;
    resumeSessionAt?: string;
    forkSession?: boolean;
    persistSession?: boolean;
    maxTurns?: number;
    maxBudgetUsd?: number;

    // Features
    enableFileCheckpointing?: boolean;
    includePartialMessages?: boolean;

    // Beta Features
    betas?: SdkBeta[];

    // Sub-Agents
    agents?: Record<string, AgentDefinition>;

    // Plugins
    plugins?: SdkPluginConfig[];

    // Sandbox
    sandbox?: SandboxSettings;

    // Settings
    settingSources?: SettingSource[];
    strictMcpConfig?: boolean;

    // Debugging
    stderr?: (data: string) => void;
};
```

---

## 3. Configuration Deep Dive

### 3.1 MCP Servers Configuration

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`

```typescript
// Server Configuration Types
export type McpStdioServerConfig = {
    type?: 'stdio';  // Default
    command: string;
    args?: string[];
    env?: Record<string, string>;
};

export type McpSSEServerConfig = {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
};

export type McpHttpServerConfig = {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
};

export type McpSdkServerConfig = {
    type: 'sdk';
    name: string;
};

// Usage in options
mcpServers?: Record<string, McpServerConfig>;
```

**Configuration Examples:**

```typescript
// Process-based MCP server (stdio)
{
    mcpServers: {
        'filesystem': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path'],
            env: { MY_VAR: 'value' }
        }
    }
}

// SSE-based MCP server
{
    mcpServers: {
        'my-server': {
            type: 'sse',
            url: 'https://example.com/mcp',
            headers: { 'Authorization': 'Bearer token' }
        }
    }
}

// HTTP-based MCP server
{
    mcpServers: {
        'api-server': {
            type: 'http',
            url: 'https://api.example.com/mcp',
            headers: { 'X-API-Key': 'key' }
        }
    }
}

// SDK-based MCP server (in-process)
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myServer = createSdkMcpServer({
    name: 'my-tools',
    version: '1.0.0',
    tools: [
        tool('calculator', 'Calculate math', {
            a: z.number(),
            b: z.number()
        }, async (args) => ({
            content: [{ type: 'text', text: String(args.a + args.b) }]
        }))
    ]
});

{
    mcpServers: {
        'my-tools': myServer  // SDK server with live McpServer instance
    }
}
```

### 3.2 Allowed Tools Configuration

```typescript
// Auto-allow specific tools
allowedTools?: string[];

// Example: Auto-allow read and edit operations
{
    allowedTools: ['Read', 'Edit', 'Grep']
}

// Restrict available tools
tools?: string[] | { type: 'preset'; preset: 'claude_code' };

// Example: Only allow specific tools
{
    tools: ['Read', 'Grep', 'Glob']
}

// Example: Disable all built-in tools
{
    tools: []
}

// Example: Use default Claude Code tools
{
    tools: { type: 'preset', preset: 'claude_code' }
}

// Disallow specific tools
disallowedTools?: string[];

// Example: Disable Bash tool
{
    disallowedTools: ['Bash']
}
```

### 3.3 Hooks Configuration

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`

```typescript
// Available Hook Events
export declare const HOOK_EVENTS: readonly [
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "Notification",
    "UserPromptSubmit",
    "SessionStart",
    "SessionEnd",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
    "PermissionRequest"
];

export type HookEvent = (typeof HOOK_EVENTS)[number];

// Hook Callback Matcher
export interface HookCallbackMatcher {
    matcher?: string;  // Pattern matching
    hooks: HookCallback[];
    timeout?: number;  // Timeout in seconds
}

// Hook Callback Type
export type HookCallback = (
    input: HookInput,
    toolUseID: string | undefined,
    options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

**Hook Input Types:**

```typescript
// Pre-tool use hook
export type PreToolUseHookInput = BaseHookInput & {
    hook_event_name: 'PreToolUse';
    tool_name: string;
    tool_input: unknown;
    tool_use_id: string;
};

// Post-tool use hook
export type PostToolUseHookInput = BaseHookInput & {
    hook_event_name: 'PostToolUse';
    tool_name: string;
    tool_input: unknown;
    tool_response: unknown;
    tool_use_id: string;
};

// Session start hook
export type SessionStartHookInput = BaseHookInput & {
    hook_event_name: 'SessionStart';
    source: 'startup' | 'resume' | 'clear' | 'compact';
};

// Session end hook
export type SessionEndHookInput = BaseHookInput & {
    hook_event_name: 'SessionEnd';
    reason: ExitReason;
};

// Base hook input
export type BaseHookInput = {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode?: string;
};
```

**Hook Configuration Examples:**

```typescript
// Simple hook configuration
{
    hooks: {
        PreToolUse: [{
            hooks: [async (input, toolUseID, options) => {
                console.log('Tool:', input.tool_name);
                return { continue: true };
            }]
        }],
        PostToolUse: [{
            hooks: [async (input, toolUseID, options) => {
                console.log('Result:', input.tool_response);
                return { continue: true };
            }]
        }],
        SessionStart: [{
            hooks: [async (input, toolUseID, options) => {
                console.log('Session started:', input.session_id);
                return { continue: true };
            }]
        }],
        SessionEnd: [{
            hooks: [async (input, toolUseID, options) => {
                console.log('Session ended:', input.reason);
                return { continue: true };
            }]
        }]
    }
}

// Hook with pattern matching
{
    hooks: {
        PreToolUse: [{
            matcher: 'Bash',  // Only match Bash tool
            hooks: [async (input) => {
                console.log('Bash command:', input.tool_input);
                return { continue: true };
            }],
            timeout: 30  // 30 second timeout
        }]
    }
}

// Async hook
{
    hooks: {
        PreToolUse: [{
            hooks: [async (input, toolUseID, options) => {
                return { async: true, asyncTimeout: 60 };
            }]
        }]
    }
}
```

**Hook Output Types:**

```typescript
// Synchronous hook output
export type SyncHookJSONOutput = {
    continue?: boolean;
    suppressOutput?: boolean;
    stopReason?: string;
    decision?: 'approve' | 'block';
    systemMessage?: string;
    reason?: string;
    hookSpecificOutput?: {
        hookEventName: 'PreToolUse';
        permissionDecision?: 'allow' | 'deny' | 'ask';
        permissionDecisionReason?: string;
        updatedInput?: Record<string, unknown>;
    } | {
        hookEventName: 'PostToolUse';
        additionalContext?: string;
        updatedMCPToolOutput?: unknown;
    } | {
        hookEventName: 'SessionStart' | 'SubagentStart';
        additionalContext?: string;
    } | {
        hookEventName: 'PostToolUseFailure';
        additionalContext?: string;
    } | {
        hookEventName: 'PermissionRequest';
        decision: {
            behavior: 'allow';
            updatedInput?: Record<string, unknown>;
            updatedPermissions?: PermissionUpdate[];
        } | {
            behavior: 'deny';
            message?: string;
            interrupt?: boolean;
        };
    };
};

// Asynchronous hook output
export type AsyncHookJSONOutput = {
    async: true;
    asyncTimeout?: number;
};
```

### 3.4 System Prompt Configuration

```typescript
// Direct string
{
    systemPrompt: 'You are a helpful coding assistant.'
}

// Preset with default Claude Code prompt
{
    systemPrompt: {
        type: 'preset',
        preset: 'claude_code'
    }
}

// Preset with appended instructions
{
    systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'Always explain your reasoning step by step.'
    }
}
```

### 3.5 Model Configuration

```typescript
// Model selection
model?: string;

// Examples
{
    model: 'claude-sonnet-4-5-20250929'
}
{
    model: 'claude-opus-4-20250514'
}
{
    model: 'claude-haiku-4-20250514'
}

// Fallback model
fallbackModel?: string;

// Example
{
    model: 'claude-sonnet-4-5-20250929',
    fallbackModel: 'claude-haiku-4-20250514'
}

// Max thinking tokens (for extended reasoning)
maxThinkingTokens?: number;

// Example
{
    maxThinkingTokens: 200000
}
```

### 3.6 Output Format (Structured Output)

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`

```typescript
export type OutputFormatType = 'json_schema';

export type BaseOutputFormat = {
    type: OutputFormatType;
};

export type JsonSchemaOutputFormat = BaseOutputFormat & {
    type: 'json_schema';
    schema: Record<string, unknown>;
};

export type OutputFormat = JsonSchemaOutputFormat;
```

**Configuration Examples:**

```typescript
// Basic JSON schema
{
    outputFormat: {
        type: 'json_schema',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                email: { type: 'string' }
            },
            required: ['name', 'age', 'email']
        }
    }
}

// Using Zod to generate schema (recommended)
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const responseSchema = z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
    confidence: z.number().min(0).max(1)
});

const jsonSchema = zodToJsonSchema(responseSchema, {
    $refStrategy: 'none'
});

{
    outputFormat: {
        type: 'json_schema',
        schema: jsonSchema as Record<string, unknown>
    }
}

// Complex nested schema
{
    outputFormat: {
        type: 'json_schema',
        schema: {
            type: 'object',
            properties: {
                analysis: {
                    type: 'object',
                    properties: {
                        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                        score: { type: 'number', minimum: 0, maximum: 1 },
                        keywords: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    },
                    required: ['sentiment', 'score', 'keywords']
                },
                recommendations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            action: { type: 'string' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                        },
                        required: ['action', 'priority']
                    }
                }
            },
            required: ['analysis', 'recommendations']
        }
    }
}
```

**Accessing Structured Output:**

```typescript
// Result message contains structured_output field
for await (const message of q) {
    if (message.type === 'result') {
        if (message.structured_output !== undefined) {
            const data = message.structured_output;
            // Use structured data
        }
    }
}
```

---

## 4. Code Examples

### 4.1 Basic Usage

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Simple string prompt
const q = query({
    prompt: 'What files are in the current directory?',
    options: {
        model: 'claude-sonnet-4-5-20250929'
    }
});

for await (const message of q) {
    console.log(message);
}
// Resources auto-cleaned up here
```

### 4.2 With MCP Servers

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
    prompt: 'Read the package.json file',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        mcpServers: {
            'filesystem': {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()]
            }
        }
    }
});

for await (const message of q) {
    if (message.type === 'result') {
        console.log('Result:', message.result);
    }
}
```

### 4.3 With Structured Output

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const schema = z.object({
    files: z.array(z.object({
        path: z.string(),
        size: z.number(),
        language: z.string().optional()
    }))
});

const q = query({
    prompt: 'List all TypeScript files in the project',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        outputFormat: {
            type: 'json_schema',
            schema: zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>
        }
    }
});

for await (const message of q) {
    if (message.type === 'result' && message.structured_output) {
        const result = schema.parse(message.structured_output);
        console.log('Files:', result.files);
    }
}
```

### 4.4 With Hooks

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
    prompt: 'Analyze the codebase',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        hooks: {
            PreToolUse: [{
                hooks: [async (input) => {
                    console.log(`Executing tool: ${input.tool_name}`);
                    console.log(`Input:`, input.tool_input);
                    return { continue: true };
                }]
            }],
            PostToolUse: [{
                hooks: [async (input) => {
                    console.log(`Tool ${input.tool_name} completed`);
                    return { continue: true };
                }]
            }],
            SessionStart: [{
                hooks: [async (input) => {
                    console.log(`Session started: ${input.session_id}`);
                    return { continue: true };
                }]
            }],
            SessionEnd: [{
                hooks: [async (input) => {
                    console.log(`Session ended: ${input.reason}`);
                    return { continue: true };
                }]
            }]
        }
    }
});

for await (const message of q) {
    // Process messages
}
```

### 4.5 With Custom Tools

```typescript
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Create custom tool
const calculatorTool = tool(
    'calculator',
    'Perform mathematical calculations',
    {
        a: z.number(),
        b: z.number(),
        operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
    },
    async (args) => {
        let result: number;
        switch (args.operation) {
            case 'add': result = args.a + args.b; break;
            case 'subtract': result = args.a - args.b; break;
            case 'multiply': result = args.a * args.b; break;
            case 'divide': result = args.a / args.b; break;
        }
        return {
            content: [{ type: 'text', text: String(result) }]
        };
    }
);

// Create MCP server with custom tools
const mcpServer = createSdkMcpServer({
    name: 'calculator-server',
    version: '1.0.0',
    tools: [calculatorTool]
});

const q = query({
    prompt: 'What is 123 times 456?',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        mcpServers: {
            'calculator': mcpServer
        }
    }
});

for await (const message of q) {
    if (message.type === 'result') {
        console.log('Answer:', message.result);
    }
}
```

### 4.6 With Permission Control

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
    prompt: 'Modify the config file',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        allowedTools: ['Read', 'Edit'],
        canUseTool: async (toolName, input, options) => {
            // Only allow Edit on config files
            if (toolName === 'Edit') {
                const filePath = input.file_path as string;
                if (!filePath.endsWith('.config.js')) {
                    return {
                        behavior: 'deny',
                        message: 'Only config files can be edited'
                    };
                }
            }
            return {
                behavior: 'allow'
            };
        }
    }
});

for await (const message of q) {
    // Process messages
}
```

### 4.7 With AbortController

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const abortController = new AbortController();

const q = query({
    prompt: 'Analyze the entire codebase',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        abortController
    }
});

// Abort after 30 seconds
setTimeout(() => {
    abortController.abort();
}, 30000);

try {
    for await (const message of q) {
        console.log(message);
    }
} catch (error) {
    if (error.name === 'AbortError') {
        console.log('Query was aborted');
    }
}
```

### 4.8 Groundswell Integration Example

**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts` (lines 396-466)

```typescript
import {
    query,
    type Options as AgentSDKOptions,
    type SDKMessage,
    type SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';

// Build Agent SDK options
const sdkOptions: AgentSDKOptions = {
    model: effectiveModel,
    systemPrompt: effectiveSystem,
    env: { ...process.env, ...(overrides?.env ?? this.config.env) } as Record<string, string>,
};

// Add tools if available
if (effectiveTools && effectiveTools.length > 0) {
    sdkOptions.allowedTools = effectiveTools.map((t) => t.name);
}

// Add MCP servers
const mcpServers = this.buildMcpServers();
if (mcpServers) {
    sdkOptions.mcpServers = mcpServers;
}

// Add hooks
if (effectiveHooks) {
    sdkOptions.hooks = this.buildAgentSDKHooks(effectiveHooks);
}

// Add output format for structured response
const jsonSchema = this.zodToJsonSchema(prompt.responseFormat);
sdkOptions.outputFormat = {
    type: 'json_schema',
    schema: jsonSchema as Record<string, unknown>,
};

// Build user message
const userMessage = prompt.buildUserMessage();

// Execute query using Agent SDK
const q = query({ prompt: userMessage, options: sdkOptions });

// Collect messages and find the result
let resultMessage: SDKResultMessage | null = null;
let toolCallCount = 0;

for await (const message of q) {
    // Count tool uses from assistant messages
    if (message.type === 'assistant') {
        const content = message.message?.content;
        if (Array.isArray(content)) {
            for (const block of content) {
                if (block.type === 'tool_use') {
                    toolCallCount++;
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

---

## 5. Gotchas and Best Practices

### 5.1 Resource Management

**✅ DO:**
- Let the async generator complete naturally
- Use AbortController for cancellation
- Trust the SDK's auto-cleanup

**❌ DON'T:**
- Try to call close/terminate methods (they don't exist)
- Manually manage transport connections
- Worry about connection pooling

```typescript
// ✅ Correct - auto-cleanup
const q = query({ prompt: 'test', options: {} });
for await (const message of q) {
    // Process messages
}
// Cleanup happens here automatically

// ❌ Wrong - no close method exists
const q = query({ prompt: 'test', options: {} });
for await (const message of q) {
    // Process messages
}
q.close(); // ERROR: Property 'close' does not exist
```

### 5.2 MCP Server Configuration

**✅ DO:**
- Use absolute paths for stdio servers
- Specify environment variables explicitly
- Handle server connection errors

**❌ DON'T:**
- Use relative paths for commands
- Assume servers are always available
- Forget to set `type` for non-stdio servers

```typescript
// ✅ Correct
{
    mcpServers: {
        'fs': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/absolute/path'],
            env: { NODE_ENV: 'production' }
        }
    }
}

// ❌ Wrong - missing type for SSE
{
    mcpServers: {
        'api': {
            // Missing type: 'sse'
            url: 'https://api.example.com/mcp'
        }
    }
}
```

### 5.3 Structured Output

**✅ DO:**
- Use Zod to generate schemas
- Set `$refStrategy: 'none'` in zodToJsonSchema
- Validate the output after receiving

**❌ DON'T:**
- Manually write complex JSON schemas
- Forget to handle validation errors
- Assume structured_output is always present

```typescript
// ✅ Correct
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const schema = z.object({
    name: z.string(),
    count: z.number()
});

const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none'  // Important!
});

{
    outputFormat: {
        type: 'json_schema',
        schema: jsonSchema as Record<string, unknown>
    }
}

// ❌ Wrong - will have $ref issues
const jsonSchema = zodToJsonSchema(schema);  // Missing $refStrategy
```

### 5.4 Hooks

**✅ DO:**
- Return `{ continue: true }` for successful hooks
- Handle async operations properly
- Use pattern matching for specific tools

**❌ DON'T:**
- Forget to return a value
- Block indefinitely in hooks
- Mix sync and async patterns

```typescript
// ✅ Correct
{
    hooks: {
        PreToolUse: [{
            hooks: [async (input) => {
                // Do async work
                await logToDatabase(input);
                return { continue: true };  // Always return
            }]
        }]
    }
}

// ❌ Wrong - missing return
{
    hooks: {
        PreToolUse: [{
            hooks: [async (input) => {
                await logToDatabase(input);
                // Missing return statement
            }]
        }]
    }
}
```

### 5.5 Permission Control

**✅ DO:**
- Implement canUseTool for fine-grained control
- Provide clear denial messages
- Use allowedTools for auto-approval

**❌ DON'T:**
- Bypass permissions without allowDangerouslySkipPermissions
- Return vague denial messages
- Forget to handle permission updates

```typescript
// ✅ Correct
{
    canUseTool: async (toolName, input, options) => {
        if (toolName === 'Bash' && input.command.includes('rm')) {
            return {
                behavior: 'deny',
                message: 'Destructive commands are not allowed'
            };
        }
        return { behavior: 'allow' };
    }
}

// ❌ Wrong - bypass without flag
{
    permissionMode: 'bypassPermissions',
    // Missing allowDangerouslySkipPermissions: true
    // This will cause an error
}
```

### 5.6 Error Handling

**✅ DO:**
- Handle AbortError for cancellations
- Check result message subtype
- Validate structured output

**❌ DON'T:**
- Assume all queries succeed
- Ignore error subtypes
- Forget to validate responses

```typescript
// ✅ Correct
try {
    for await (const message of q) {
        if (message.type === 'result') {
            if (message.subtype !== 'success') {
                console.error('Query failed:', message.subtype, message.errors);
                return;
            }

            if (message.structured_output) {
                const validated = schema.safeParse(message.structured_output);
                if (!validated.success) {
                    console.error('Validation failed:', validated.error);
                    return;
                }
            }
        }
    }
} catch (error) {
    if (error.name === 'AbortError') {
        console.log('Query was cancelled');
    } else {
        console.error('Query error:', error);
    }
}
```

### 5.7 Performance Considerations

**✅ DO:**
- Set maxTurns to prevent infinite loops
- Use maxBudgetUsd for cost control
- Enable persistSession for debugging

**❌ DON'T:**
- Let queries run indefinitely
- Ignore token usage
- Forget about cache read tokens

```typescript
// ✅ Correct
{
    maxTurns: 50,
    maxBudgetUsd: 10.0,
    persistSession: true  // Enable for debugging
}

// ❌ Wrong - no limits
{
    // Will run until completion or error
    // Could be expensive!
}
```

### 5.8 Beta Features

**✅ DO:**
- Check documentation before using beta features
- Prepare for breaking changes
- Use specific beta header values

**❌ DON'T:**
- Use beta features in production without testing
- Assume beta features are stable

```typescript
// ✅ Correct - 1M token context window
{
    betas: ['context-1m-2025-08-07'],
    model: 'claude-sonnet-4-5-20250929'  // Only works with Sonnet 4/4.5
}

// ❌ Wrong - wrong model for beta
{
    betas: ['context-1m-2025-08-07'],
    model: 'claude-opus-4-20250514'  // Not supported
}
```

---

## 6. Message Types

### 6.1 SDKMessage Types

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`

```typescript
// Base message types
export type SDKMessage =
    | SDKUserMessage
    | SDKAssistantMessage
    | SDKResultMessage
    | SDKPartialAssistantMessage
    | SDKErrorResultMessage;

// User message
export type SDKUserMessage = {
    type: 'user';
    message: APIUserMessage;
    parent_tool_use_id: string | null;
    // ...
};

// Assistant message
export type SDKAssistantMessage = {
    type: 'assistant';
    message: APIAssistantMessage;
    // ...
};

// Result message (success)
export type SDKResultMessage = {
    type: 'result';
    subtype: 'success';
    result: string | null;
    structured_output: unknown;
    usage: NonNullableUsage;
    // ...
};

// Error result message
export type SDKErrorResultMessage = {
    type: 'result';
    subtype: 'error_max_turns' | 'error_max_budget_usd' | 'error_user_interrupted' | string;
    errors?: string[];
    // ...
};

// Partial assistant message (streaming)
export type SDKPartialAssistantMessage = {
    type: 'partial_assistant';
    message: APIAssistantMessage;
    // ...
};
```

### 6.2 Processing Messages

```typescript
for await (const message of q) {
    switch (message.type) {
        case 'user':
            console.log('User message received');
            break;

        case 'assistant':
            // Check for tool use
            const content = message.message?.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (block.type === 'tool_use') {
                        console.log('Tool use:', block.name, block.input);
                    }
                }
            }
            break;

        case 'partial_assistant':
            // Streaming update
            console.log('Partial update received');
            break;

        case 'result':
            if (message.subtype === 'success') {
                console.log('Success:', message.result);
                console.log('Structured output:', message.structured_output);
                console.log('Usage:', message.usage);
            } else {
                console.error('Error:', message.subtype, message.errors);
            }
            break;
    }
}
```

---

## 7. Permission Modes

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts`

```typescript
export type PermissionMode =
    | 'default'           // Standard behavior, prompts for dangerous operations
    | 'acceptEdits'       // Auto-accept file edit operations
    | 'bypassPermissions' // Bypass all permission checks (requires flag)
    | 'plan'             // Planning mode, no actual tool execution
    | 'delegate'         // Delegate mode, restricts to Teammate and Task tools
    | 'dontAsk';         // Don't prompt, deny if not pre-approved
```

**Usage Examples:**

```typescript
// Standard mode with prompts
{
    permissionMode: 'default'
}

// Auto-accept file edits
{
    permissionMode: 'acceptEdits'
}

// Bypass all permissions (dangerous!)
{
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true  // Required!
}

// Planning only
{
    permissionMode: 'plan'
}

// Delegate mode
{
    permissionMode: 'delegate'
}

// Deny unless pre-approved
{
    permissionMode: 'dontAsk'
}
```

---

## 8. SDK Helper Functions

### 8.1 createSdkMcpServer()

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`

```typescript
export declare function createSdkMcpServer(
    _options: {
        name: string;
        version?: string;
        tools?: Array<SdkMcpToolDefinition<any>>;
    }
): McpSdkServerConfigWithInstance;
```

**Example:**

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const weatherTool = tool(
    'get_weather',
    'Get current weather for a location',
    {
        location: z.string(),
        unit: z.enum(['celsius', 'fahrenheit']).optional()
    },
    async (args) => {
        // Fetch weather data
        const temp = 22; // Celsius
        return {
            content: [{
                type: 'text',
                text: `Weather in ${args.location}: ${temp}°${args.unit === 'fahrenheit' ? 'F' : 'C'}`
            }]
        };
    }
);

const weatherServer = createSdkMcpServer({
    name: 'weather-service',
    version: '1.0.0',
    tools: [weatherTool]
});

// Use in query
const q = query({
    prompt: 'What is the weather in Tokyo?',
    options: {
        mcpServers: {
            'weather': weatherServer
        }
    }
});
```

### 8.2 tool() Function

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`

```typescript
export declare function tool<Schema extends AnyZodRawShape>(
    _name: string,
    _description: string,
    _inputSchema: Schema,
    _handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>
): SdkMcpToolDefinition<Schema>;
```

**Parameters:**
- `_name`: Tool name (used for invocation)
- `_description`: Tool description (shown to Claude)
- `_inputSchema`: Zod schema defining input parameters
- `_handler`: Async function that processes tool calls

**Return Type:**
- `SdkMcpToolDefinition<Schema>`: Can be used with `createSdkMcpServer`

---

## 9. Documentation Sources

### 9.1 Official Resources

**Note:** Web search tools are currently experiencing rate limits. Based on local SDK analysis:

- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub Repository:** https://github.com/anthropics/claude-agent-sdk-typescript
- **Official Docs:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk (likely URL)
- **Beta Headers:** https://docs.anthropic.com/en/api/beta-headers
- **Sandbox Settings:** https://docs.anthropic.com/en/docs/claude-code/settings#sandbox-settings

### 9.2 Local Documentation

**Installed SDK Location:**
```
/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/
```

**Key Files:**
- `sdk.d.ts` - Main entry point types
- `sdk.mjs` - Main implementation
- `package.json` - Package metadata
- `entrypoints/agentSdkTypes.d.ts` - Public API types
- `entrypoints/sdk/coreTypes.d.ts` - Core serializable types
- `entrypoints/sdk/runtimeTypes.d.ts` - Runtime types and interfaces
- `transport/transport.d.ts` - Transport interface

### 9.3 Groundswell Integration

**Files:**
- `/home/dustin/projects/groundswell/src/core/agent.ts` - Agent wrapper around SDK
- `/home/dustin/projects/groundswell/src/core/mcp-handler.ts` - MCP server management
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` - Provider implementation

**Related Research:**
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic_sdk_cleanup_research.md`
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S3/research/anthropic_sdk_cleanup.md`

---

## 10. FAQ

### Q1: Does query() require explicit cleanup?

**A:** No. The Query object is an AsyncGenerator that auto-cleans up when iteration completes or is aborted. Resources are managed internally by the SDK.

### Q2: How do I cancel a running query?

**A:** Use AbortController:

```typescript
const abortController = new AbortController();
const q = query({
    prompt: 'test',
    options: { abortController }
});
// Later: abortController.abort();
```

### Q3: Can I use query() in a serverless environment?

**A:** Yes, but be aware of:
- Cold start overhead for spawning Claude Code process
- Timeout limits (default 10 minutes, configurable)
- No session persistence across invocations

### Q4: How do I get structured JSON output?

**A:** Use the `outputFormat` option with a JSON schema:

```typescript
{
    outputFormat: {
        type: 'json_schema',
        schema: {
            type: 'object',
            properties: {
                result: { type: 'string' }
            }
        }
    }
}
```

### Q5: What's the difference between allowedTools and tools?

**A:**
- `allowedTools`: Tools that are auto-approved without prompting
- `tools`: Restricts which tools are available to the model
- `disallowedTools`: Explicitly removes tools from the available set

### Q6: Can I use multiple MCP servers?

**A:** Yes:

```typescript
{
    mcpServers: {
        'filesystem': { /* config */ },
        'database': { /* config */ },
        'api': { /* config */ }
    }
}
```

### Q7: How do I debug MCP server connections?

**A:** Use the `mcpServerStatus()` method:

```typescript
const q = query({ prompt: 'test', options: {} });
const status = await q.mcpServerStatus();
console.log(status);
// Returns: Array<{ name, status, serverInfo }>
```

### Q8: What's the difference between query() and unstable_v2_createSession()?

**A:**
- `query()`: One-shot query, stateless, auto-cleanup
- `unstable_v2_createSession()`: Multi-turn session, requires explicit `close()`, currently unstable

### Q9: How do I limit the number of conversation turns?

**A:** Use `maxTurns`:

```typescript
{
    maxTurns: 50  // Stop after 50 turns
}
```

### Q10: Can I use hooks to modify tool outputs?

**A:** Yes, use PostToolUse hook with `updatedMCPToolOutput`:

```typescript
{
    hooks: {
        PostToolUse: [{
            hooks: [async (input) => {
                return {
                    continue: true,
                    hookSpecificOutput: {
                        hookEventName: 'PostToolUse',
                        updatedMCPToolOutput: modifiedOutput
                    }
                };
            }]
        }]
    }
}
```

---

## 11. Summary

### Key Takeaways

1. **Stateless Design**: `query()` is stateless with automatic resource cleanup
2. **Rich Configuration**: `Options` interface provides extensive customization
3. **MCP Integration**: Full support for stdio, SSE, HTTP, and SDK-based MCP servers
4. **Structured Output**: Built-in JSON schema support for type-safe responses
5. **Hooks System**: Powerful event hooks for custom behavior
6. **Permission Control**: Fine-grained tool usage control
7. **No Cleanup Required**: SDK manages all resources automatically

### Best Practices

1. Use Zod for schema generation
2. Implement `canUseTool` for production permission control
3. Set `maxTurns` and `maxBudgetUsd` for safety
4. Use AbortController for cancellation
5. Enable `persistSession` for debugging
6. Validate structured output even when using schemas
7. Handle error result subtypes explicitly
8. Use hooks for logging and monitoring

### Gotchas to Avoid

1. Don't try to call non-existent close/terminate methods
2. Don't forget `$refStrategy: 'none'` in zodToJsonSchema
3. Don't bypass permissions without the required flag
4. Don't ignore the `subtype` field in result messages
5. Don't use beta features in production without testing
6. Don't assume `structured_output` is always present
7. Don't forget to return values from hooks
8. Don't use relative paths for MCP server commands

---

**Document Status:** ✅ COMPLETE
**SDK Version:** 0.1.77
**Last Updated:** January 25, 2026
**Maintainer:** Groundswell Development Team

---

## Appendix: Type Definitions Reference

### A.1 Core Types

```typescript
// From coreTypes.d.ts
export type OutputFormat = JsonSchemaOutputFormat;
export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'delegate' | 'dontAsk';
export type SdkBeta = 'context-1m-2025-08-07';
export type McpServerConfig = McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig | McpSdkServerConfigWithInstance;
```

### A.2 Runtime Types

```typescript
// From runtimeTypes.d.ts
export type Options = { /* See Section 2.1 */ };
export interface Query extends AsyncGenerator<SDKMessage, void> { /* See Section 1.2 */ };
export interface SDKSession { /* V2 API - unstable */ }
```

### A.3 Message Types

```typescript
export type SDKMessage =
    | SDKUserMessage
    | SDKAssistantMessage
    | SDKResultMessage
    | SDKPartialAssistantMessage
    | SDKErrorResultMessage;
```

---

**End of Document**
