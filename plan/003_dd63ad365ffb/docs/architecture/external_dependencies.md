# External Dependencies & SDK Documentation

## Anthropic Agent SDK

### Package Information
- **Package Name:** `@anthropic-ai/claude-agent-sdk`
- **Current Version:** `0.1.77` (installed via pnpm)
- **Type:** ESM module
- **Node Requirement:** >=18.0.0
- **Peer Dependencies:** zod ^3.25.0 || ^4.0.0

### Official Resources
- **Documentation:** https://platform.claude.com/docs/en/agent-sdk/overview
- **GitHub:** https://github.com/anthropics/claude-agent-sdk-typescript
- **NPM:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **Migration Guide:** https://platform.claude.com/docs/en/agent-sdk/migration-guide

### Core API

#### Main Entry Point
```typescript
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

#### Query Interface
```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;
  supportedModels(): Promise<ModelInfo[]>;
  mcpServerStatus(): Promise<McpServerStatus[]>;
  setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult>;
}
```

#### Message Types
```typescript
type SDKMessage =
  | SDKAssistantMessage     // Assistant response with tool uses
  | SDKUserMessage          // User message
  | SDKResultMessage        // Final result with structured output
  | SDKSystemMessage        // System message
  | SDKPartialAssistantMessage; // Streaming chunk

interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns';
  result: string;
  structured_output?: unknown; // Validated JSON from json_schema
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  duration_ms: number;
  is_error: boolean;
}
```

#### Options Type
```typescript
interface Options {
  model?: string;                    // e.g., 'claude-sonnet-4-20250514'
  systemPrompt?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  tools?: string[] | { type: 'preset'; preset: 'claude_code' };
  mcpServers?: Record<string, McpServerConfig>;
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  outputFormat?: {
    type: 'json_schema';
    schema: JSONSchema7;
  };
  maxTurns?: number;
  maxBudgetUsd?: number;
  maxThinkingTokens?: number;
  abortController?: AbortController;
  continue?: boolean;                // Resume previous session
  permissionMode?: 'auto' | 'acceptEdits' | 'readOnly';
  cwd?: string;
  env?: Record<string, string | undefined>;
}
```

### Tool Definition Pattern

#### Using Zod Schemas
```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const calculatorTool = tool(
  'calculate',
  'Performs arithmetic operations',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  },
  async (args, extra) => {
    const { operation, a, b } = args;
    const result = eval(`${a} ${operation} ${b}`);
    return {
      content: [{ type: 'text', text: `Result: ${result}` }]
    };
  }
);
```

#### Tool Handler Signature
```typescript
type ToolHandler<Schema extends z.ZodType> = (
  args: z.infer<Schema>,
  extra: unknown // Contains context like request ID
) => Promise<CallToolResult>;

interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    uri?: string;
  }>;
  isError?: boolean;
}
```

### MCP Server Configuration

#### Transport Types
```typescript
type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfig;

// stdio transport (external process)
interface McpStdioServerConfig {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// SSE transport (HTTP server-sent events)
interface McpSSEServerConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

// HTTP transport
interface McpHttpServerConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

// SDK transport (in-process)
interface McpSdkServerConfig {
  type: 'sdk';
  name: string;
}
```

#### Creating SDK MCP Server
```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

const mcpServer = createSdkMcpServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: [calculatorTool, weatherTool]
});

// Use in query
const q = query({
  prompt: 'Calculate 10 + 5',
  options: {
    mcpServers: {
      mytools: mcpServer
    }
  }
});
```

### Hook System

#### Hook Events
```typescript
declare const HOOK_EVENTS: readonly [
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

type HookEvent = typeof HOOK_EVENTS[number];
```

#### Hook Callback
```typescript
type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;

interface HookInput {
  // Varies by event type
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  // ... other fields
}

interface HookJSONOutput {
  continue: boolean;
  output_to_user?: string;
}
```

#### Example Hook Usage
```typescript
const q = query({
  prompt: 'Process this data',
  options: {
    hooks: {
      PreToolUse: [{
        hooks: [async (input) => {
          console.log('Tool:', input.tool_name, 'Input:', input.tool_input);
          return { continue: true };
        }]
      }],
      PostToolUse: [{
        hooks: [async (input) => {
          console.log('Tool result:', input.tool_response);
          return { continue: true };
        }]
      }]
    }
  }
});
```

### V2 Session API (Unstable)

#### Session Management
```typescript
interface SDKSession {
  readonly sessionId: string;

  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

// Create new session
function unstable_v2_createSession(options: SDKSessionOptions): SDKSession;

// Resume existing session
function unstable_v2_resumeSession(
  sessionId: string,
  options: SDKSessionOptions
): SDKSession;

// One-shot prompt with session
function unstable_v2_prompt(
  message: string,
  options: SDKSessionOptions
): Promise<SDKResultMessage>;
```

#### Session Options
```typescript
interface SDKSessionOptions extends Options {
  sessionId?: string;
  persistSession?: boolean;
  forkSession?: boolean;
}
```

### Current Groundswell Integration

#### Integration Pattern (from `/src/core/agent.ts`)
```typescript
import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

// Build SDK options
const sdkOptions: Options = {
  model: effectiveModel,
  systemPrompt: effectiveSystem,
  allowedTools: effectiveTools?.map(t => t.name),
  mcpServers: mcpServers,  // From MCPHandler.toAgentSDKServer()
  hooks: this.buildAgentSDKHooks(effectiveHooks),
  outputFormat: {
    type: 'json_schema',
    schema: jsonSchema
  }
};

// Execute query
const q = query({ prompt: userMessage, options: sdkOptions });

// Iterate messages
for await (const message of q) {
  if (message.type === 'assistant') {
    // Count tool uses
  }
  if (message.type === 'result') {
    resultMessage = message;
  }
}
```

---

## OpenCode Agent SDK

### Package Information
- **Package Name:** `@opencode-ai/sdk`
- **Current Version:** `1.1.36`
- **Type:** ESM module
- **License:** MIT
- **Maintainers:** adamelmore (adam@terminal.shop), thdxr (d@ironbay.co)
- **Total Versions Published:** 3,021
- **Unpacked Size:** 453.8 kB
- **Dependencies:** None (zero dependencies)
- **Publication Method:** GitHub Actions (published 7 hours ago as of research date)

### Official Resources
- **NPM:** https://www.npmjs.com/package/@opencode-ai/sdk
- **Tarball:** https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz

### Installation Commands

```bash
# Core SDK (latest)
npm install @opencode-ai/sdk

# With specific version
npm install @opencode-ai/sdk@1.1.36

# Plugin framework for extensions
npm install @opencode-ai/plugin
```

### Related Ecosystem Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@opencode-ai/plugin` | 1.1.36 | Plugin framework for extensions |
| `ai-sdk-provider-opencode-sdk` | 1.0.0 | Vercel AI SDK v6 provider for OpenCode |
| `opencode-agent-skills` | 0.6.4 | Dynamic skills plugin |
| `opencode-orchestrator` | 1.2.14 | Multi-agent workflows |
| `oh-my-opencode` | 3.0.1 | Batteries-included plugin |
| `@gitlab/opencode-gitlab-auth` | 1.3.2 | GitLab OAuth plugin |
| `opencode-openai-codex-auth` | 4.4.0 | OpenAI ChatGPT OAuth |
| `opencode-gemini-auth` | 1.3.8 | Google Gemini auth |

### Expected Capabilities (from PRD)

Based on PRD Section 7.4 and ecosystem analysis, OpenCode SDK provides:

#### Multi-Provider Support
```typescript
// Supports 75+ providers
'anthropic/claude-sonnet-4-20250514'
'openai/gpt-4'
'ollama/llama3'
'google/gemini-pro'
'azure/openai'
'aws/bedrock'
'cohere/command'
'huggingface/mistral'
// ... and 60+ more
```

#### Native Sessions
```typescript
// Session-based state management (not just continuation)
const session = opencode.createSession({
  sessionId: 'my-session',
  provider: 'openai',
  model: 'gpt-4'
});

await session.send('Hello');
// State preserved automatically
await session.send('Continue');
```

#### Extended Thinking
```typescript
// Native support for extended thinking/reasoning
const result = await opencode.execute({
  prompt: 'Solve this complex problem',
  extendedThinking: true,
  maxReasoningTokens: 10000
});
```

#### LSP Integration
```typescript
// Explicit LSP tool
const result = await opencode.execute({
  tools: [{
    name: 'lsp',
    action: 'definition' | 'references' | 'hover' | 'completion' | 'diagnostics',
    uri: 'file:///path/to/file.ts',
    position: { line: 10, character: 5 }
  }]
});
```

### Alternative Multi-Provider SDKs

| SDK | Providers | TypeScript | MCP Support | Notes |
|-----|-----------|------------|-------------|-------|
| **Vercel AI SDK** | 17+ | Excellent | Via LangChain | Best unified API |
| **LangChain** | 17+ | Excellent | **Native** (@langchain/mcp-adapters) | Most mature |
| **Portkey** | 10+ | Excellent | No | Simple proxy |
| **LiteLLM** | 100+ | Good | No | Python-first |
| **OpenRouter** | 300+ | Excellent | No | Aggregator |

### Implementation Strategy

**Strategy A: Package Exists (Recommended)**
- `@opencode-ai/sdk` is verified and actively maintained
- Proceed to P3.M1.T1.S2 (Document OpenCode SDK API)
- Implement OpenCodeProvider in P3.M2 following AnthropicProvider patterns
- Use lazy loading for the SDK (zero dependencies makes this lightweight)

**Strategy B: Alternative SDK (Fallback)**
- If OpenCode SDK API doesn't meet requirements, consider Vercel AI SDK
- LangChain with MCP adapters is another strong alternative
- Both have excellent TypeScript support and active communities

---

## Model Context Protocol (MCP)

### Overview
**MCP** is an open protocol developed by Anthropic for AI assistant tool integration.

**Documentation:** https://platform.claude.com/docs/en/agent-sdk/overview

### TypeScript Implementation

#### Groundswell MCPHandler Pattern

```typescript
import { MCPHandler } from 'groundswell';

const handler = new MCPHandler();

// Register server
handler.registerServer({
  name: 'demo',
  transport: 'inprocess',
  tools: [tool1, tool2]
});

// Register tool executor (for inprocess transport)
handler.registerToolExecutor('demo', 'tool1', async (input) => {
  return { result: 'executed' };
});

// Get tools in Anthropic format
const tools = handler.getTools();

// Execute tool
const result = await handler.executeTool('demo__tool1', { arg: 'value' });

// Convert to Agent SDK format
const sdkServer = handler.toAgentSDKServer();
```

#### Tool Interface
```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

#### Tool Naming Convention
Tools use the `serverName__toolName` format to prevent naming collisions across servers.

---

## TypeScript Decorators (Stage 3)

### Current Status
- **TC39 Stage:** Stage 3 (close to standardization)
- **TypeScript Version:** 5.0+ supports standard decorators
- **Groundswell:** Using standard decorators (NOT experimental)

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "strict": true,
    "useDefineForClassFields": true
    // NO experimentalDecorators needed
  }
}
```

### Method Decorator Pattern

```typescript
function Step(options: StepOptions = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return>
    >
  ): (this: This, ...args: Args) => Promise<Return> {
    const methodName = String(context.name);

    // CRITICAL: Use regular function (not arrow)
    async function stepWrapper(this: This, ...args: Args): Promise<Return> {
      const startTime = Date.now();

      try {
        const result = await originalMethod.call(this, ...args);
        const duration = Date.now() - startTime;
        // Post-execution logic
        return result;
      } catch (error) {
        // Error handling
        throw error;
      }
    }

    return stepWrapper;
  };
}
```

### Field Decorator Pattern

```typescript
const OBSERVED_FIELDS = new WeakMap<object, Map<string, FieldMetadata>>();

function ObservedState(meta: FieldMetadata = {}) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext
  ): void {
    const propertyKey = String(context.name);

    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const proto = Object.getPrototypeOf(instance);

      let map = OBSERVED_FIELDS.get(proto);
      if (!map) {
        map = new Map();
        OBSERVED_FIELDS.set(proto, map);
      }

      map.set(propertyKey, meta);
    });
  };
}

// Retrieve metadata
function getObservedState(obj: object): Record<string, unknown> {
  const proto = Object.getPrototypeOf(obj);
  const map = OBSERVED_FIELDS.get(proto);

  if (!map) return {};

  const result: Record<string, unknown> = {};
  for (const [key, meta] of map) {
    let value = (obj as Record<string, unknown>)[key];
    if (meta.redact) value = '***';
    if (!meta.hidden) result[key] = value;
  }

  return result;
}
```

### Best Practices

1. **Use regular functions** for method wrappers (not arrow functions)
2. **Use WeakMap** for metadata storage (prevents memory leaks)
3. **Use addInitializer** for per-instance setup in field decorators
4. **Preserve generic types** for type safety
5. **Check context.kind** for universal decorators

---

## Zod Schema Validation

### Usage in Groundswell

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define schema
const ResponseSchema = z.object({
  status: z.enum(['success', 'error', 'partial']),
  data: z.unknown().nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean()
  }).nullable(),
  metadata: z.object({
    agentId: z.string(),
    timestamp: z.number()
  })
});

// Convert to JSON Schema for Agent SDK
const jsonSchema = zodToJsonSchema(ResponseSchema);

// Validate response
const validated = ResponseSchema.parse(data);

// Safe validation
const result = ResponseSchema.safeParse(data);
if (result.success) {
  const data = result.data;
} else {
  console.error(result.error);
}
```

---

## React Ink (Terminal UI)

### Package
- **Package:** `ink`
- **Version:** 4.4.1
- **React Version:** 19.0.0
- **Purpose:** Terminal UI for tree debugger

### Usage Pattern
```typescript
import { render, Box, Text } from 'ink';

const App = () => (
  <Box flexDirection="column">
    <Text bold>Workflow Tree Debugger</Text>
    <Text>{treeString}</Text>
  </Box>
);

render(<App />);
```

---

## LRU Cache

### Package
- **Package:** `lru-cache`
- **Version:** 11.0.2
- **Usage:** Agent response caching

### Usage Pattern
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, AgentResponse>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

cache.set('key', response);
const cached = cache.get('key');
```

---

## Summary Table

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | 0.1.77 | Anthropic SDK |
| `ink` | 4.4.1 | Terminal UI |
| `react` | 19.0.0 | Ink dependency |
| `zod` | 3.25.76 | Schema validation |
| `zod-to-json-schema` | 3.25.1 | Schema conversion |
| `lru-cache` | 11.0.2 | Response caching |
| `eventemitter3` | 5.0.1 | Event system |
| `typescript` | 5.7.3 | Language |
| `vitest` | 3.0.5 | Testing |
