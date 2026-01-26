# OpenCode SDK Complete Research Report

**Research Date:** 2026-01-25
**Task:** P3.M1.T1.S2 - Document OpenCode SDK API
**Status:** Complete

---

## Executive Summary

The **OpenCode SDK** (`@opencode-ai/sdk`) is a TypeScript client SDK for OpenCode, a terminal-based AI coding assistant that supports 75+ LLM providers. The SDK provides a comprehensive API for session management, multi-provider execution, MCP/LSP integration, and real-time event streaming.

**Key Finding:** This is a **client-server architecture** SDK, not a standalone execution library like Anthropic's Agent SDK. It requires running an OpenCode server instance and connects via HTTP/WebSocket.

---

## 1. Official Package Information

### NPM Package Details

| Property | Value |
|----------|-------|
| **Package Name** | `@opencode-ai/sdk` |
| **Latest Version** | `1.1.36` |
| **License** | MIT |
| **Maintainers** | adamelmore (adam@terminal.shop), thdxr (d@ironbay.co) |
| **Publication Method** | GitHub Actions (automated) |
| **Total Versions** | 3,021+ (very active development) |
| **Package Size** | 71.4 KB (tarball) |
| **Unpacked Size** | 453.8 KB |
| **Dependencies** | None (zero runtime dependencies) |
| **Node Requirement** | >= 18 |

### Official URLs

- **NPM Package:** https://www.npmjs.com/package/@opencode-ai/sdk
- **Direct Tarball:** https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz
- **Website:** https://opencode.ai
- **Vercel AI SDK Provider:** https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk

**Note:** The package does not expose a public GitHub repository URL in its metadata, suggesting it may be private or monorepo-hosted.

---

## 2. Installation Commands

```bash
# Latest stable version
npm install @opencode-ai/sdk

# Specific version
npm install @opencode-ai/sdk@1.1.36

# With pnpm
pnpm add @opencode-ai/sdk

# With yarn
yarn add @opencode-ai/sdk
```

---

## 3. Main API Exports

### 3.1 Primary Entry Point

**File:** `/dist/index.d.ts`

```typescript
// Main exports
export * from "./client.js";
export * from "./server.js";

// Server creation (starts local OpenCode server)
export declare function createOpencode(options?: ServerOptions): Promise<{
    client: OpencodeClient;
    server: {
        url: string;
        close(): void;
    };
}>;

// Client creation only (connects to existing server)
export declare function createOpencodeClient(config?: Config & {
    directory?: string;
}): OpencodeClient;
```

### 3.2 Server Options

**File:** `/dist/server.d.ts`

```typescript
export type ServerOptions = {
    hostname?: string;      // Default: "127.0.0.1"
    port?: number;          // Default: 4096
    signal?: AbortSignal;   // For server shutdown
    timeout?: number;       // Server startup timeout
    config?: Config;        // OpenCode configuration
};

export type TuiOptions = {
    project?: string;
    model?: string;
    session?: string;
    agent?: string;
    signal?: AbortSignal;
    config?: Config;
};

// Create standalone server
export declare function createOpencodeServer(
    options?: ServerOptions
): Promise<{
    url: string;
    close(): void;
}>;

// Create TUI (terminal UI) instance
export declare function createOpencodeTui(
    options?: TuiOptions
): {
    close(): void;
};
```

---

## 4. OpencodeClient API Structure

### 4.1 Client Class Definition

**File:** `/dist/gen/sdk.gen.d.ts`

The `OpencodeClient` class is the main interface for interacting with OpenCode:

```typescript
export declare class OpencodeClient extends _HeyApiClient {
    // Permission responses
    postSessionIdPermissionsPermissionId(options: Options): RequestResult;

    // API namespaces (see section 5)
    global: Global;
    project: Project;
    pty: Pty;
    config: Config;
    tool: Tool;
    instance: Instance;
    path: Path;
    vcs: Vcs;
    session: Session;        // ← PRIMARY EXECUTION API
    command: Command;
    provider: Provider;
    find: Find;
    file: File;
    app: App;
    mcp: Mcp;
    lsp: Lsp;
    formatter: Formatter;
    tui: Tui;
    auth: Auth;
}
```

### 4.2 Client Configuration

**File:** `/dist/client.d.ts`

```typescript
import { type Config } from "./gen/client/types.gen.js";

export declare function createOpencodeClient(config?: Config & {
    directory?: string;  // Project directory
}): OpencodeClient;
```

---

## 5. Session API (Primary Execution Interface)

### 5.1 Session Creation

**Namespace:** `client.session`

```typescript
class Session {
    // List all sessions
    list(options?: Options): RequestResult<SessionListResponses>;

    // Create new session
    create(options?: Options): RequestResult<SessionCreateResponses>;

    // Get session by ID
    get(options: Options): RequestResult<SessionGetResponses>;

    // Delete session
    delete(options: Options): RequestResult<SessionDeleteResponses>;

    // Get session status
    status(options?: Options): RequestResult<SessionStatusResponses>;

    // Update session properties
    update(options: Options): RequestResult<SessionUpdateResponses>;
}
```

### 5.2 Session Execution

**The primary methods for executing prompts:**

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

### 5.3 Message Retrieval

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

### 5.4 Session Features

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

---

## 6. Multi-Provider Support

### 6.1 Provider API

**Namespace:** `client.provider`

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

### 6.2 Model Format

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

// 75+ more providers supported
```

### 6.3 Configuration API

**Namespace:** `client.config`

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

---

## 7. TypeScript Type Definitions

### 7.1 Core Message Types

**File:** `/dist/gen/types.gen.d.ts`

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

### 7.2 Message Parts (Streaming)

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

### 7.3 Tool State Types

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

---

## 8. MCP (Model Context Protocol) Integration

### 8.1 MCP API

**Namespace:** `client.mcp`

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

### 8.2 Tool API

**Namespace:** `client.tool`

```typescript
class Tool {
    // List all tool IDs (built-in + dynamically registered)
    ids(options?: Options): RequestResult<ToolIdsResponses>;

    // List tools with JSON schema for provider/model
    list(options: Options): RequestResult<ToolListResponses>;
}
```

---

## 9. LSP (Language Server Protocol) Integration

### 9.1 LSP API

**Namespace:** `client.lsp`

```typescript
class Lsp {
    // Get LSP server status
    status(options?: Options): RequestResult<LspStatusResponses>;
}
```

### 9.2 LSP Events

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

---

## 10. Real-Time Events (Server-Sent Events)

### 10.1 Event Subscription

**Namespace:** `client.event`

```typescript
class Event {
    // Subscribe to global events
    event(options?: Options): Promise<ServerSentEventsResult<GlobalEventResponses>>;

    // Subscribe to all events
    subscribe(options?: Options): Promise<ServerSentEventsResult<EventSubscribeResponses>>;
}
```

### 10.2 Event Types

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

---

## 11. Error Types

```typescript
export type ProviderAuthError = {
    name: "ProviderAuthError";
    data: {
        providerID: string;
        message: string;
    };
};

export type UnknownError = {
    name: "UnknownError";
    data: {
        message: string;
    };
};

export type MessageOutputLengthError = {
    name: "MessageOutputLengthError";
    data: {
        [key: string]: unknown;
    };
};

export type MessageAbortedError = {
    name: "MessageAbortedError";
    data: {
        message: string;
    };
};

export type ApiError = {
    name: "APIError";
    data: {
        message: string;
        statusCode?: number;
        isRetryable: boolean;
        responseHeaders?: {
            [key: string]: string;
        };
        responseBody?: string;
    };
};
```

---

## 12. Code Examples from Ecosystem

### 12.1 Vercel AI SDK Provider Example

**Source:** https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk

```typescript
import { generateText } from "ai";
import { opencode } from "ai-sdk-provider-opencode-sdk";

// Basic usage
const result = await generateText({
    model: opencode("anthropic/claude-opus-4-5-20251101"),
    prompt: "What is the capital of France?",
});

console.log(result.text);
```

### 12.2 Streaming Example

```typescript
import { streamText } from "ai";

const result = streamText({
    model: opencode("anthropic/claude-opus-4-5-20251101"),
    prompt: "Write a haiku about coding.",
});

for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
}
```

### 12.3 Session Management Example

```typescript
// Create session with title
const model = opencode("anthropic/claude-opus-4-5-20251101", {
    sessionTitle: "Code Review Session",
});

// First call creates session
const result1 = await generateText({
    model,
    prompt: "Review this code..."
});

// Subsequent calls reuse session
const result2 = await generateText({
    model,
    prompt: "What did you find?"
});

// Get session ID from metadata
const sessionId = result1.providerMetadata?.opencode?.sessionId;

// Resume specific session
const resumeModel = opencode("anthropic/claude-opus-4-5-20251101", {
    sessionId: sessionId,
});
```

### 12.4 Direct SDK Usage (Inferred)

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Start server and get client
const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 4096,
});

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

// Cleanup
server.close();
```

---

## 13. Key Architectural Differences from Anthropic SDK

| Aspect | Anthropic Agent SDK | OpenCode SDK |
|--------|-------------------|--------------|
| **Architecture** | Standalone library | Client-server (requires OpenCode server) |
| **Execution** | `query()` function | `session.prompt()` method |
| **Sessions** | `continue: true` flag | Native session objects with IDs |
| **Tools** | Define with `tool()` function | Server-side, observe via events |
| **MCP** | `mcpServers` config option | `mcp` namespace with dynamic add/remove |
| **LSP** | Via MCP plugins | Native `lsp` namespace |
| **Streaming** | AsyncGenerator return | Server-Sent Events (SSE) |
| **Events** | Hooks in options | Real-time event subscription |
| **State** | Stateless (unless using continue) | Server-side session storage |

---

## 14. Integration Considerations for Groundswell

### 14.1 Critical Architectural Mismatch

**Problem:** OpenCode SDK is a **client library** for the OpenCode server application, not a standalone execution library like Anthropic's Agent SDK.

**Implications:**

1. **Server Dependency:** Requires running `opencode` server process (installed via `npm install -g opencode`)
2. **HTTP/WebSocket Communication:** All execution happens server-side, SDK is just a client
3. **No Direct Tool Control:** Tools are executed server-side, can't provide custom implementations
4. **Session State:** Stored on server, not in client process
5. **Configuration:** Server-managed, not client-configurable

### 14.2 Recommended Implementation Strategy

**Option A: Full OpenCode Integration (Not Recommended)**

- Pros: Native multi-provider support
- Cons: Requires external server process, complex deployment, not a true "provider"

**Option B: OpenCode as Plugin Architecture (Recommended)**

- Use OpenCode SDK as a **plugin/skill** system for Groundswell
- Not as a core provider, but as an optional extension
- Users can opt-in to install OpenCode CLI and use it via plugin
- Groundswell remains standalone with Anthropic as primary provider

**Option C: Alternative Multi-Provider SDK (Recommended)**

If multi-provider support is required:

1. **Vercel AI SDK** (`ai` package)
   - Excellent TypeScript support
   - 17+ providers
   - Can integrate with LangChain MCP adapters
   - Standalone execution (no server required)

2. **LangChain.js**
   - Most mature multi-provider framework
   - Native MCP support via `@langchain/mcp-adapters`
   - Extensive tool ecosystem
   - Standalone execution

### 14.3 Provider Interface Adaptation

If proceeding with OpenCodeProvider despite architectural mismatch:

```typescript
export class OpenCodeProvider implements Provider {
    readonly id = 'opencode';
    readonly capabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: true,  // ← Native sessions
        extendedThinking: true,
    };

    private sdk: Awaited<ReturnType<typeof createOpencode>> | null = null;

    async initialize(options?: ProviderOptions): Promise<void> {
        // Start OpenCode server
        this.sdk = await createOpencode({
            hostname: options?.endpoint || '127.0.0.1',
            port: 4096,
        });
    }

    async execute<T>(
        request: ProviderRequest,
        toolExecutor: ToolExecutor,
        hooks?: ProviderHookEvents
    ): Promise<ProviderResult<T>> {
        // Check if server is running
        if (!this.sdk) {
            throw new Error('OpenCode provider not initialized');
        }

        // Create or get session
        let sessionId = request.sessionId;
        if (!sessionId) {
            const session = await this.sdk.client.session.create({});
            sessionId = session.data.id;
        }

        // Execute prompt (non-blocking)
        const result = await this.sdk.client.session.prompt({
            body: {
                sessionID: sessionId,
                message: request.prompt,
            },
        });

        // Poll for completion or use events
        // Convert to ProviderResult format

        return {
            status: 'success',
            data: result.data as T,
            error: null,
            metadata: {
                duration: result.duration,
                usage: result.usage,
            },
        };
    }

    async terminate(): Promise<void> {
        // Close server
        await this.sdk?.server.close();
        this.sdk = null;
    }
}
```

---

## 15. Gotchas & Special Considerations

### 15.1 Server Lifecycle

1. **Server Must Be Running:** SDK cannot function without `opencode` server process
2. **Port Conflicts:** Default port 4096 may conflict with other services
3. **Server Startup Time:** Non-zero initialization cost (server must start)
4. **Cleanup:** Must call `server.close()` to terminate process

### 15.2 Session Management

1. **Server-Side State:** Sessions stored on server, not in client
2. **Session Persistence:** Sessions persist across client restarts (if server running)
3. **Session Cleanup:** Must explicitly delete sessions to free server memory

### 15.3 Tool Execution

1. **No Custom Tools:** Cannot define custom tools (server-side only)
2. **Tool Observation:** Can only observe tool execution via events
3. **Tool Registration:** Dynamic tool registration via `mcp.add()` only

### 15.4 Error Handling

1. **Network Errors:** HTTP/WebSocket communication can fail
2. **Server Crashes:** Server process may crash independently
3. **Auth Errors:** Provider authentication handled server-side, not client

### 15.5 Type Safety

1. **Generated Types:** All types are auto-generated from OpenAPI spec
2. **RequestResult Pattern:** Returns `{ data, error, status }` objects
3. **Complex Nested Types:** Deeply nested type definitions require careful handling

---

## 16. Comparison with PRD Requirements

### 16.1 PRD Section 7.4 - Provider Capabilities

| Requirement | OpenCode SDK | Notes |
|-------------|--------------|-------|
| Multi-provider (75+) | ✅ Yes | Native support via `providerID/modelID` format |
| Native sessions | ✅ Yes | Full session API with IDs |
| Extended thinking | ✅ Yes | `ReasoningPart` type with reasoning tokens |
| LSP integration | ✅ Yes | Native `lsp` namespace |
| MCP support | ✅ Yes | Native `mcp` namespace with dynamic add/remove |
| Streaming | ✅ Yes | Via Server-Sent Events |

### 16.2 PRD Section 7.3 - Provider Interface

| Requirement | OpenCode SDK | Feasibility |
|-------------|--------------|-------------|
| `id: ProviderId` | ✅ | `'opencode'` |
| `capabilities` | ✅ | All features supported |
| `initialize(options)` | ⚠️ | Starts server process (not just SDK init) |
| `terminate()` | ⚠️ | Stops server process (not just SDK cleanup) |
| `execute<T>(request)` | ⚠️ | Requires session polling (not direct execution) |
| `registerMCPs(servers)` | ⚠️ | Dynamic add only, not direct registration |
| `loadSkills(skills)` | ❌ | Skills are server-side plugins |
| `normalizeModel(model)` | ✅ | Parses `providerID/modelID` format |

---

## 17. Recommendations

### 17.1 For P3.M1.T1.S3 (Determine Implementation Strategy)

**STRATEGY C: Does Not Meet Requirements - Use Alternative**

**Rationale:**

1. **Architectural Mismatch:** OpenCode SDK is a client library for a server application, not a standalone execution SDK
2. **Server Dependency:** Requires external `opencode` server process, complicating deployment
3. **No Direct Tool Control:** Cannot integrate Groundswell's MCPHandler tool execution
4. **Session Management:** Server-side state doesn't align with Groundswell's in-memory session abstraction
5. **Deployment Complexity:** Users would need to install and configure OpenCode CLI separately

**Alternative Recommendation:**

Use **Vercel AI SDK** as the multi-provider solution:

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
```

**Benefits:**

- Standalone execution (no server required)
- Native TypeScript support
- Direct tool control
- Compatible with Groundswell's architecture
- Multi-provider support (17+ providers)
- Can integrate with LangChain MCP adapters

### 17.2 If OpenCode Integration is Still Required

**Recommended Approach: Plugin/Extension**

1. **Not as Core Provider:** Implement as optional plugin
2. **Opt-In Only:** Users explicitly install OpenCode CLI to use it
3. **Document Limitations:** Clearly state server requirement and limitations
4. **Fallback Strategy:** Always default to Anthropic provider for standalone operation

---

## 18. Sources

### Primary Sources

1. **NPM Package:** `@opencode-ai/sdk@1.1.36`
   - URL: https://www.npmjs.com/package/@opencode-ai/sdk
   - Tarball: https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz

2. **TypeScript Definitions:** Extracted from package tarball
   - `/dist/index.d.ts` - Main exports
   - `/dist/client.d.ts` - Client creation
   - `/dist/server.d.ts` - Server creation
   - `/dist/gen/types.gen.d.ts` - Core types (Message, Part, ToolState)
   - `/dist/gen/sdk.gen.d.ts` - OpencodeClient class

3. **Vercel AI SDK Provider:** `ai-sdk-provider-opencode-sdk@1.0.0`
   - Repository: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
   - README: Code examples and usage patterns

4. **Local Documentation:**
   - `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md`
   - `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S1/research/opencode-sdk-research.md`

### Ecosystem Packages

1. `@opencode-ai/plugin@1.1.36` - Plugin framework
2. `ai-sdk-provider-opencode-sdk@1.0.0` - Vercel AI SDK integration
3. `opencode-agent-skills@0.6.4` - Skills system
4. `opencode-orchestrator@1.2.14` - Multi-agent workflows
5. `oh-my-opencode@3.0.1` - Batteries-included plugin
6. `@gitlab/opencode-gitlab-auth@1.3.2` - GitLab OAuth
7. `opencode-openai-codex-auth@4.4.0` - OpenAI OAuth
8. `opencode-gemini-auth@1.3.8` - Google OAuth

---

## 19. Next Steps

### For P3.M1.T1.S3 (Determine Implementation Strategy)

1. **Review this research** with team/stakeholders
2. **Decide on strategy:**
   - **Strategy A:** Proceed with OpenCodeProvider (not recommended)
   - **Strategy C:** Use alternative SDK (recommended)
3. **Update `architecture/decisions.md`** with final decision
4. **If Strategy C:** Create new task branch for Vercel AI SDK integration
5. **If Strategy A:** Proceed to P3.M2 with architectural considerations documented

### Documentation Updates Required

1. Update `/docs/architecture/external_dependencies.md` with complete API documentation
2. Update `/docs/architecture/decisions.md` with implementation strategy decision
3. If proceeding with OpenCode: Create implementation guide for server deployment

---

**End of Research Report**
