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
| **OpenCode SDK** | 75+ | Excellent | **Native** (client-server) | Requires external server |
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

### Core API Structure

#### Main Entry Point
```typescript
import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';

// Client-only (connects to existing server)
const client = createOpencodeClient({
  baseUrl: 'http://localhost:3000',
  directory: '/path/to/project'
});

// Server + client (starts local server)
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 4096
});
```

#### OpencodeClient Class
```typescript
class OpencodeClient {
  session: Session;      // Primary execution API
  provider: Provider;    // Multi-provider management
  config: Config;        // Configuration management
  mcp: Mcp;             // MCP integration
  lsp: Lsp;             // LSP integration
  tool: Tool;           // Tool management
  event: Event;         // Real-time events
  installation: Installation;
  permission: Permission;
  rateLimit: RateLimit;
  shell: Shell;
  completion: Completion;
  diagnostics: Diagnostics;
  suggestions: Suggestions;
  patch: Patch;
}
```

> **IMPORTANT:** OpenCode SDK uses a **client-server architecture**.
> Unlike Anthropic Agent SDK (standalone library), this requires:
> - External `opencode` server process running
> - HTTP/WebSocket communication
> - Server-side session storage
> - No direct tool control (observation-only via events)

### Session API (Primary Execution Interface)

#### Session Lifecycle
```typescript
class Session {
  // Create new session
  create(options: Options): RequestResult<SessionCreateResponses>;

  // Get session by ID
  get(options: Options): RequestResult<SessionGetResponses>;

  // List all sessions
  list(options?: Options): RequestResult<SessionListResponses>;

  // Delete session
  delete(options: Options): RequestResult<SessionDeleteResponses>;

  // Get session status
  status(options?: Options): RequestResult<SessionStatusResponses>;

  // Update session properties
  update(options: Options): RequestResult<SessionUpdateResponses>;
}
```

#### Session Execution
```typescript
class Session {
  // Create and send message (synchronous - waits for completion)
  prompt(options: Options): RequestResult<SessionPromptResponses>;

  // Create and send message (async - returns immediately)
  promptAsync(options: Options): RequestResult<SessionPromptAsyncResponses>;

  // Send command to session
  command(options: Options): RequestResult<SessionCommandResponses>;

  // Execute shell command in session context
  shell(options: Options): RequestResult<SessionShellResponses>;

  // Fork session at specific message
  fork(options: Options): RequestResult<SessionForkResponses>;

  // Abort running session
  abort(options: Options): RequestResult<SessionAbortResponses>;

  // Revert/unrevert messages
  revert(options: Options): RequestResult<SessionRevertResponses>;
  unrevert(options: Options): RequestResult<SessionUnrevertResponses>;
}
```

#### Message Retrieval
```typescript
class Session {
  // List messages in session
  messages(options: Options): RequestResult<SessionMessagesResponses>;

  // Get specific message
  message(options: Options): RequestResult<SessionMessageResponses>;

  // Get session children
  children(options: Options): RequestResult<SessionChildrenResponses>;

  // Get session diff
  diff(options: Options): RequestResult<SessionDiffResponses>;

  // Get session todo list
  todo(options: Options): RequestResult<SessionTodoResponses>;
}
```

#### Session Features
```typescript
class Session {
  // Initialize session with AGENTS.md
  init(options: Options): RequestResult<SessionInitResponses>;

  // Summarize session
  summarize(options: Options): RequestResult<SessionSummarizeResponses>;

  // Share/unshare session
  share(options: Options): RequestResult<SessionShareResponses>;
  unshare(options: Options): RequestResult<SessionUnshareResponses>;
}
```

#### SessionPromptData Type
```typescript
// Request body for session.prompt()
interface SessionPromptData {
  sessionID: string;
  message: string;
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  system?: string;
  tools?: {
    [key: string]: boolean;
  };
  permissions?: {
    [key: string]: boolean;
  };
}
```

### Multi-Provider Support

#### Provider API
```typescript
class Provider {
  // List all available providers
  list(options?: Options): RequestResult<ProviderListResponses>;

  // Get provider authentication methods
  auth(options?: Options): RequestResult<ProviderAuthResponses>;

  // OAuth operations
  oauth: {
    authorize(options: Options): RequestResult<ProviderOauthAuthorizeResponses>;
    callback(options: Options): RequestResult<ProviderOauthCallbackResponses>;
  };
}
```

#### Model Format
OpenCode uses `providerID/modelID` format for model specification:

```typescript
// Examples from ai-sdk-provider-opencode-sdk
"anthropic/claude-opus-4-5-20251101"
"anthropic/claude-sonnet-4-5-20250929"
"anthropic/claude-haiku-4-5-20251001"

"openai/gpt-5.1"
"openai/gpt-5.1-codex"
"openai/gpt-5.1-codex-mini"
"openai/gpt-5.1-codex-max"

"google/gemini-3-pro-preview"
"google/gemini-2.5-flash"
"google/gemini-2.5-pro"

"ollama/llama3"
"azure/openai"
"aws/bedrock"
"cohere/command"
"huggingface/mistral"

// 75+ more providers supported
```

#### Configuration API
```typescript
class Config {
  // Get current configuration
  get(options?: Options): RequestResult<ConfigGetResponses>;

  // Update configuration
  update(options?: Options): RequestResult<ConfigUpdateResponses>;

  // List all providers
  providers(options?: Options): RequestResult<ConfigProvidersResponses>;
}
```

### TypeScript Type Definitions

#### Core Message Types
```typescript
// User message (input)
export type UserMessage = {
  id: string;
  sessionID: string;
  role: "user";
  time: {
    created: number;
  };
  summary?: {
    title?: string;
    body?: string;
    diffs: Array<FileDiff>;
  };
  agent: string;
  model: {
    providerID: string;  // e.g., "anthropic"
    modelID: string;     // e.g., "claude-opus-4-5-20251101"
  };
  system?: string;
  tools?: {
    [key: string]: boolean;
  };
};

// Assistant message (response)
export type AssistantMessage = {
  id: string;
  sessionID: string;
  role: "assistant";
  time: {
    created: number;
    completed?: number;
  };
  error?: ProviderAuthError | UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError;
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  path: {
    cwd: string;
    root: string;
  };
  summary?: boolean;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;      // ← Extended thinking support
    cache: {
      read: number;
      write: number;
    };
  };
  finish?: string;
};

export type Message = UserMessage | AssistantMessage;
```

#### Message Parts (Streaming)
```typescript
// Text part
export type TextPart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "text";
  text: string;
  synthetic?: boolean;
  ignored?: boolean;
  time?: {
    start: number;
    end?: number;
  };
  metadata?: {
    [key: string]: unknown;
  };
};

// Reasoning part (extended thinking)
export type ReasoningPart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "reasoning";
  text: string;
  metadata?: {
    [key: string]: unknown;
  };
  time: {
    start: number;
    end?: number;
  };
};

// Tool execution part
export type ToolPart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "tool";
  callID: string;
  tool: string;
  state: ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError;
  metadata?: {
    [key: string]: unknown;
  };
};

// File part
export type FilePart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "file";
  mime: string;
  filename?: string;
  url: string;
  source?: FilePartSource;
};

// Agent part (sub-agent delegation)
export type AgentPart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "agent";
  name: string;
  source?: {
    value: string;
    start: number;
    end: number;
  };
};

export type Part = TextPart | ReasoningPart | FilePart | ToolPart | AgentPart | StepStartPart | StepFinishPart | SnapshotPart | PatchPart | RetryPart | CompactionPart;
```

#### Tool State Types
```typescript
export type ToolStatePending = {
  status: "pending";
  input: {
    [key: string]: unknown;
  };
  raw: string;
};

export type ToolStateRunning = {
  status: "running";
  input: {
    [key: string]: unknown;
  };
  title?: string;
  metadata?: {
    [key: string]: unknown;
  };
  time: {
    start: number;
  };
};

export type ToolStateCompleted = {
  status: "completed";
  input: {
    [key: string]: unknown;
  };
  output: string;
  title: string;
  metadata: {
    [key: string]: unknown;
  };
  time: {
    start: number;
    end: number;
    compacted?: number;
  };
  attachments?: Array<FilePart>;
};

export type ToolStateError = {
  status: "error";
  input: {
    [key: string]: unknown;
  };
  error: string;
  metadata?: {
    [key: string]: unknown;
  };
  time: {
    start: number;
    end: number;
  };
};

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError;
```

### MCP & LSP Integration

#### MCP API
```typescript
class Mcp {
  // Get MCP server status
  status(options?: Options): RequestResult<McpStatusResponses>;

  // Add MCP server dynamically
  add(options?: Options): RequestResult<McpAddResponses>;

  // Connect MCP server
  connect(options: Options): RequestResult<McpConnectResponses>;

  // Disconnect MCP server
  disconnect(options: Options): RequestResult<McpDisconnectResponses>;

  // OAuth authentication for MCP servers
  auth: {
    remove(options: Options): RequestResult<McpAuthRemoveResponses>;
    start(options: Options): RequestResult<McpAuthStartResponses>;
    callback(options: Options): RequestResult<McpAuthCallbackResponses>;
    authenticate(options: Options): RequestResult<McpAuthAuthenticateResponses>;
  };
}
```

#### Tool API
```typescript
class Tool {
  // List all tool IDs (built-in + dynamically registered)
  ids(options?: Options): RequestResult<ToolIdsResponses>;

  // List tools with JSON schema for provider/model
  list(options: Options): RequestResult<ToolListResponses>;
}
```

#### LSP API
```typescript
class Lsp {
  // Get LSP server status
  status(options?: Options): RequestResult<LspStatusResponses>;
}
```

#### LSP Events
```typescript
export type EventLspClientDiagnostics = {
  type: "lsp.client.diagnostics";
  properties: {
    serverID: string;
    path: string;
  };
};

export type EventLspUpdated = {
  type: "lsp.updated";
  properties: {
    [key: string]: unknown;
  };
};
```

### Real-Time Events (Server-Sent Events)

#### Event Subscription
```typescript
class Event {
  // Subscribe to global events
  event(options?: Options): Promise<ServerSentEventsResult<GlobalEventResponses>>;

  // Subscribe to all events
  subscribe(options?: Options): Promise<ServerSentEventsResult<EventSubscribeResponses>>;
}
```

#### Event Types
```typescript
// Message events
export type EventMessageUpdated = {
  type: "message.updated";
  properties: {
    info: Message;
  };
};

export type EventMessagePartUpdated = {
  type: "message.part.updated";
  properties: {
    part: Part;
    delta?: string;
  };
};

// Permission events
export type EventPermissionUpdated = {
  type: "permission.updated";
  properties: Permission;
};

export type EventPermissionReplied = {
  type: "permission.replied";
  properties: {
    sessionID: string;
    permissionID: string;
    response: string;
  };
};

// Installation events
export type EventInstallationUpdated = {
  type: "installation.updated";
  properties: {
    version: string;
  };
};

export type EventInstallationUpdateAvailable = {
  type: "installation.update-available";
  properties: {
    version: string;
  };
};

// Server events
export type EventServerInstanceDisposed = {
  type: "server.instance.disposed";
  properties: {
    directory: string;
  };
};
```

### Code Examples

#### Basic Client Initialization
```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Start server and get client
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 4096,
});

// Cleanup when done
server.close();
```

#### Session Creation and Prompt
```typescript
// Create session
const sessionResult = await client.session.create({});
const sessionId = sessionResult.data.id;

// Execute prompt
const result = await client.session.prompt({
  body: {
    sessionID: sessionId,
    message: "Explain this code",
  },
});

// Get messages
const messages = await client.session.messages({
  query: {
    sessionID: sessionId,
  },
});
```

#### Streaming with Events
```typescript
// Subscribe to message part events
const eventStream = await client.event.subscribe({});

for await (const event of eventStream) {
  if (event.type === 'message.part.updated') {
    const { part, delta } = event.properties;

    if (part.type === 'text' && delta) {
      process.stdout.write(delta); // Stream text chunks
    }

    if (part.type === 'reasoning') {
      console.log('Reasoning:', part.text);
    }

    if (part.type === 'tool') {
      console.log('Tool:', part.tool, 'State:', part.state.status);
    }
  }
}
```

#### Provider Listing
```typescript
// List all available providers
const providers = await client.provider.list();

console.log('Available providers:', providers.data.providers);

// Get provider auth requirements
const auth = await client.provider.auth({
  query: {
    providerID: 'anthropic',
  },
});
```

#### MCP Integration
```typescript
// Check MCP server status
const status = await client.mcp.status();

// Add MCP server dynamically
const addResult = await client.mcp.add({
  body: {
    name: 'my-mcp-server',
    command: 'node',
    args: ['my-mcp-server.js'],
  },
});

// Connect to MCP server
await client.mcp.connect({
  body: {
    name: 'my-mcp-server',
  },
});
```

### Architectural Comparison

| Aspect | Anthropic Agent SDK | OpenCode SDK |
|--------|-------------------|--------------|
| **Architecture** | Standalone library | Client-server (requires server) |
| **Execution** | `query()` function | `session.prompt()` method |
| **Sessions** | `continue: true` flag | Native session objects with IDs |
| **Tools** | Define with `tool()` function | Server-side, observe via events |
| **MCP** | `mcpServers` config option | `mcp` namespace with dynamic add/remove |
| **LSP** | Via MCP plugins | Native `lsp` namespace |
| **Streaming** | AsyncGenerator return | Server-Sent Events (SSE) |
| **Events** | Hooks in options | Real-time event subscription |
| **State** | Stateless (unless using continue) | Server-side session storage |
| **Tool Control** | Direct tool execution | Observation only (server-side) |
| **Dependencies** | Has peer dependencies | Zero dependencies |
| **Type Generation** | Hand-written TypeScript | Auto-generated from OpenAPI |

### Integration Considerations

> **CRITICAL ARCHITECTURAL MISMATCH**
>
> OpenCode SDK is a **client library** for the OpenCode server application, not a standalone execution library like Anthropic's Agent SDK.

#### Key Implications

1. **Server Dependency**
   - Requires running `opencode` server process (installed via `npm install -g opencode`)
   - All execution happens server-side, SDK is just a client
   - HTTP/WebSocket communication layer adds complexity
   - Server must be managed separately from Groundswell process

2. **No Direct Tool Control**
   - Tools are executed server-side, can't provide custom implementations
   - Cannot integrate Groundswell's MCPHandler tool execution
   - Tool registration is dynamic via `mcp.add()` only
   - Can only observe tool execution via events

3. **Session Management**
   - Session state stored on server, not in client process
   - Sessions persist across client restarts (if server running)
   - Doesn't align with Groundswell's in-memory session abstraction
   - Requires explicit session cleanup to free server memory

4. **Deployment Complexity**
   - Users would need to install and configure OpenCode CLI separately
   - Port conflicts possible (default port 4096)
   - Server startup time adds initialization cost
   - Server process may crash independently of Groundswell

#### Gotchas & Special Considerations

```typescript
// GOTCHA: Package uses ESM format only
// Cannot use require() - must use import statements

// GOTCHA: All types are auto-generated from OpenAPI spec
// Result: Complex nested types like RequestResult<TResponses, TErrors, TThrowOnError, TResponseStyle>

// GOTCHA: Session state is stored server-side, not in client
// Sessions persist across client restarts (if server running)

// GOTCHA: Tool execution is server-side only
// Cannot provide custom tool implementations - can only observe via events

// GOTCHA: Default port 4096 may conflict with other services
// Need to handle port conflicts in server creation

// PATTERN: RequestResult always returns { data, error, status }
// Must check error property before accessing data

// PATTERN: Model format uses providerID/modelID object, not string
// Groundswell uses "provider/model" string - need conversion
```

### Recommendation for P3.M1.T1.S3

**STRATEGY C RECOMMENDED: Use Alternative SDK**

Based on comprehensive API analysis, OpenCode SDK presents significant architectural challenges for integration as a Groundswell Provider:

#### Why Not OpenCode SDK?

1. **Architectural Mismatch**: Client-server model doesn't align with Groundswell's standalone Provider pattern
2. **Server Dependency**: Requires external process management, complicating deployment
3. **No Direct Tool Control**: Cannot integrate with Groundswell's MCPHandler for tool execution
4. **Session Management**: Server-side state doesn't match Groundswell's in-memory abstraction
5. **User Experience**: Users would need separate OpenCode CLI installation

#### Alternative Recommendation: Vercel AI SDK

Use **Vercel AI SDK** (`ai` package) as the multi-provider solution:

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
```

**Benefits:**
- Standalone execution (no server required)
- Native TypeScript support with hand-written types
- Direct tool control compatible with Groundswell's architecture
- Multi-provider support (17+ providers)
- Can integrate with LangChain MCP adapters for MCP support
- Compatible with existing Provider interface pattern

**Provider Interface Alignment:**
- ✅ `initialize(options)` - Simple SDK initialization
- ✅ `execute<T>(request)` - Direct execution without polling
- ✅ `registerMCPs(servers)` - Can integrate via LangChain adapters
- ✅ `loadSkills(skills)` - Compatible with tool definition pattern
- ✅ `terminate()` - Simple cleanup (no server process)

#### If OpenCode Integration is Still Required

**Recommended Approach: Plugin/Extension (Not Core Provider)**

1. Implement as optional plugin, not core provider
2. Users explicitly install OpenCode CLI to use it
3. Document server requirement and limitations clearly
4. Always default to Anthropic provider for standalone operation
5. Consider implementing after multi-provider support is stable

### Research References

For complete API documentation and implementation details, see:

- **Complete Research Report**: [`./P3M1T1S2/research/opencode-sdk-complete-research.md`](../P3M1T1S2/research/opencode-sdk-complete-research.md)
- **NPM Package**: https://www.npmjs.com/package/@opencode-ai/sdk (v1.1.36)
- **Vercel AI SDK Provider**: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
- **TypeScript Definitions**: `../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts`
- **Client Class Definition**: `../../../../node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts`

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
