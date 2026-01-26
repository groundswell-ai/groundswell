# OpenCode SDK Initialization Patterns Research

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S2 - Research OpenCode SDK Initialization Patterns
**Status:** Complete

---

## Executive Summary

The **OpenCode SDK** (`@opencode-ai/sdk@1.1.36`) uses a **client-server architecture** that requires initialization of both a client connection and, optionally, a local server instance. This is fundamentally different from standalone SDKs like Anthropic's Agent SDK.

**Key Finding:** OpenCode SDK provides two initialization patterns:
1. **Client-only mode** - Connect to an existing OpenCode server
2. **Full stack mode** - Start a local server and get a client

**Critical Consideration:** This SDK requires an external `opencode` server process for execution, which is a significant architectural difference from typical provider SDKs.

---

## Table of Contents

1. [Package Information](#1-package-information)
2. [Initialization Patterns](#2-initialization-patterns)
3. [Client-Only Initialization](#3-client-only-initialization)
4. [Full Stack Initialization](#4-full-stack-initialization)
5. [Configuration Options](#5-configuration-options)
6. [Server Lifecycle Management](#6-server-lifecycle-management)
7. [Session Initialization](#7-session-initialization)
8. [Shutdown and Cleanup](#8-shutdown-and-cleanup)
9. [Comparison to Anthropic SDK](#9-comparison-to-anthropic-sdk)
10. [Gotchas and Considerations](#10-gotchas-and-considerations)
11. [Code Examples](#11-code-examples)
12. [Integration Patterns](#12-integration-patterns)

---

## 1. Package Information

### 1.1 NPM Package Details

| Property | Value |
|----------|-------|
| **Package Name** | `@opencode-ai/sdk` |
| **Latest Version** | `1.1.36` |
| **License** | MIT |
| **Maintainers** | adamelmore (adam@terminal.shop), thdxr (d@ironbay.co) |
| **Publication** | GitHub Actions (automated) |
| **Total Versions** | 3,021+ (very active development) |
| **Dependencies** | None (zero runtime dependencies) |
| **Node Requirement** | >= 18 |

### 1.2 Installation

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

### 1.3 Official URLs

- **NPM Package:** https://www.npmjs.com/package/@opencode-ai/sdk
- **Website:** https://opencode.ai
- **Direct Tarball:** https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz

---

## 2. Initialization Patterns

### 2.1 Two Initialization Modes

The OpenCode SDK provides two distinct initialization patterns:

#### Pattern A: Client-Only Mode
```typescript
import { createOpencodeClient } from '@opencode-ai/sdk';

// Connect to existing server
const client = createOpencodeClient(config);
```

**Use Cases:**
- OpenCode server already running
- Connecting to remote OpenCode instance
- Server managed externally

#### Pattern B: Full Stack Mode
```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Start server and get client
const { client, server } = await createOpencode(options);
```

**Use Cases:**
- Local development
- Embedded OpenCode in application
- Full control over server lifecycle

### 2.2 Initialization Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Initialization Options                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   createOpencodeClient   │    │     createOpencode       │
│   (Client-Only Mode)     │    │   (Full Stack Mode)      │
└──────────────────────────┘    └──────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ Connect to existing      │    │ 1. Start local server    │
│ server at URL            │    │ 2. Return client +       │
│                          │    │    server reference      │
└──────────────────────────┘    └──────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ Returns: OpencodeClient  │    │ Returns: {               │
│                          │    │   client: OpencodeClient │
│ No cleanup needed        │    │   server: {             │
│ (managed externally)     │    │     url: string         │
└──────────────────────────┘    │     close(): void       │
                                 │   }                    │
                                 │ }                      │
                                 │ Requires cleanup       │
                                 └──────────────────────────┘
```

---

## 3. Client-Only Initialization

### 3.1 Function Signature

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk';

export declare function createOpencodeClient(config?: Config & {
  directory?: string;
}): OpencodeClient;
```

### 3.2 Configuration Options

```typescript
interface Config {
  // Server URL (if not default)
  url?: string;

  // API key (if authentication required)
  apiKey?: string;

  // Project directory
  directory?: string;

  // Model specification (providerID/modelID)
  model?: string;

  // Session ID (for resuming sessions)
  session?: string;

  // Agent configuration
  agent?: string;
}
```

### 3.3 Basic Client Initialization

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk';

// Default configuration (connects to localhost:4096)
const client = createOpencodeClient();

// With custom server URL
const client = createOpencodeClient({
  url: 'http://localhost:4096',
});

// With project directory
const client = createOpencodeClient({
  url: 'http://localhost:4096',
  directory: '/path/to/project',
});

// With authentication
const client = createOpencodeClient({
  url: 'https://api.opencode.ai',
  apiKey: process.env.OPENCODE_API_KEY,
});
```

### 3.4 Default Behavior

When no configuration is provided:
- **URL:** `http://127.0.0.1:4096` (local default)
- **Directory:** Current working directory
- **Authentication:** None (if server allows)

### 3.5 Validation

The client performs minimal validation at initialization:
- No network connection is established
- Server availability is checked on first API call
- Configuration is stored for use in requests

---

## 4. Full Stack Initialization

### 4.1 Function Signature

```typescript
import { createOpencode } from '@opencode-ai/sdk';

export declare function createOpencode(
  options?: ServerOptions
): Promise<{
  client: OpencodeClient;
  server: {
    url: string;
    close(): void;
  };
}>;
```

### 4.2 Server Options

```typescript
interface ServerOptions {
  // Server hostname (default: "127.0.0.1")
  hostname?: string;

  // Server port (default: 4096)
  port?: number;

  // Abort signal for server shutdown
  signal?: AbortSignal;

  // Server startup timeout (ms)
  timeout?: number;

  // OpenCode configuration
  config?: Config;
}
```

### 4.3 Basic Full Stack Initialization

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Default configuration
const { client, server } = await createOpencode();

console.log(`Server running at ${server.url}`);

// Custom port
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 5000,
});

// With timeout
const { client, server } = await createOpencode({
  port: 4096,
  timeout: 10000, // 10 second startup timeout
});

// With configuration
const { client, server } = await createOpencode({
  port: 4096,
  config: {
    directory: '/path/to/project',
    model: 'anthropic/claude-opus-4-5-20251101',
  },
});
```

### 4.4 Server Startup Process

The `createOpencode()` function performs the following steps:

1. **Validate Options:** Check hostname, port, and configuration
2. **Spawn Server Process:** Start the OpenCode server subprocess
3. **Wait for Readiness:** Poll server health endpoint
4. **Return References:** Provide client and server control objects

**Typical startup time:** 1-3 seconds (varies by system)

### 4.5 Abort Signal Usage

```typescript
import { createOpencode } from '@opencode-ai/sdk';

const controller = new AbortController();

const { client, server } = await createOpencode({
  signal: controller.signal,
});

// Later: abort server
controller.abort(); // Shuts down server
```

---

## 5. Configuration Options

### 5.1 Complete Config Interface

```typescript
interface Config {
  // Server connection
  url?: string;

  // Authentication
  apiKey?: string;

  // Project context
  directory?: string;

  // Model specification
  model?: string;

  // Session management
  session?: string;

  // Agent configuration
  agent?: string;
}
```

### 5.2 Model Specification Format

OpenCode uses `providerID/modelID` format for model specification:

```typescript
// Examples
const models = [
  'anthropic/claude-opus-4-5-20251101',
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
  'openai/gpt-5.1',
  'openai/gpt-5.1-codex',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-flash',
  // ... 75+ more providers
];
```

### 5.3 Configuration Precedence

Configuration is applied in the following order (later overrides earlier):

1. **Default values** (built-in)
2. **Server options config** (from `createOpencode()`)
3. **Environment variables** (if set)
4. **Runtime overrides** (per-request)

### 5.4 Environment Variables

```bash
# Server URL
export OPENCODE_URL=http://localhost:4096

# API Key
export OPENCODE_API_KEY=sk-...

# Default Model
export OPENCODE_MODEL=anthropic/claude-opus-4-5-20251101

# Project Directory
export OPENCODE_PROJECT_DIR=/path/to/project
```

---

## 6. Server Lifecycle Management

### 6.1 Server Lifecycle States

```
┌──────────┐
│ Created  │ (createOpencode called)
└─────┬────┘
      │
      ▼
┌──────────┐
│Starting  │ (Server process spawning)
└─────┬────┘
      │
      ▼
┌──────────┐
│  Ready   │ (Accepting connections)
└─────┬────┘
      │
      ├──────────────┐
      ▼              ▼
┌──────────┐   ┌──────────┐
│ Running  │   │ Closed   │ (server.close() or abort)
└──────────┘   └──────────┘
      │
      ▼
┌──────────┐
│  Error   │ (Startup failure or crash)
└──────────┘
```

### 6.2 Server Health Checks

```typescript
import { createOpencode } from '@opencode-ai/sdk';

const { client, server } = await createOpencode();

// Check server status
const status = await client.session.status();
console.log('Server status:', status);

// Server URL is available immediately
console.log('Server URL:', server.url);
```

### 6.3 Error Handling

```typescript
import { createOpencode } from '@opencode-ai/sdk';

try {
  const { client, server } = await createOpencode({
    port: 4096,
    timeout: 10000,
  });

  // Server started successfully
  console.log(`Server ready at ${server.url}`);

} catch (error) {
  // Handle startup failures
  if (error.message.includes('EADDRINUSE')) {
    console.error('Port already in use');
  } else if (error.message.includes('timeout')) {
    console.error('Server startup timeout');
  } else {
    console.error('Failed to start server:', error);
  }
}
```

### 6.4 Port Conflict Detection

```typescript
import { createOpencode } from '@opencode-ai/sdk';

async function startWithFallback(initialPort = 4096) {
  let port = initialPort;
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { client, server } = await createOpencode({ port });
      console.log(`Server started on port ${port}`);
      return { client, server, port };
    } catch (error) {
      if (error.message.includes('EADDRINUSE')) {
        port++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Could not find available port');
}
```

---

## 7. Session Initialization

### 7.1 Session Creation Patterns

```typescript
import { createOpencode } from '@opencode-ai/sdk';

const { client } = await createOpencode();

// Pattern A: Create new session
const sessionResult = await client.session.create({});
const sessionId = sessionResult.data.id;

// Pattern B: Create session with initial prompt
const result = await client.session.prompt({
  body: {
    message: 'Hello, OpenCode!',
  },
});

// Pattern C: Resume existing session
const result = await client.session.prompt({
  body: {
    sessionID: 'existing-session-id',
    message: 'Continue our conversation',
  },
});
```

### 7.2 Session Configuration

```typescript
// Create session with model
const session = await client.session.create({
  body: {
    model: {
      providerID: 'anthropic',
      modelID: 'claude-opus-4-5-20251101',
    },
  },
});

// Create session with system prompt
const session = await client.session.create({
  body: {
    system: 'You are a helpful coding assistant.',
  },
});

// Create session with tools
const session = await client.session.create({
  body: {
    tools: {
      bash: true,
      editor: true,
      file_search: true,
    },
  },
});
```

### 7.3 Session State Management

Sessions are stored **server-side**, not in the client. This means:

- **Persistence:** Sessions survive client disconnections
- **Sharing:** Multiple clients can access the same session
- **Cleanup:** Must explicitly delete sessions to free memory

```typescript
// List all sessions
const sessions = await client.session.list();

// Get specific session
const session = await client.session.get({
  query: { sessionID: 'session-id' },
});

// Delete session
await client.session.delete({
  query: { sessionID: 'session-id' },
});
```

---

## 8. Shutdown and Cleanup

### 8.1 Client-Only Mode Cleanup

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk';

const client = createOpencodeClient();

// No cleanup required
// Client is a thin wrapper with no resources
// Server is managed externally
```

**Note:** In client-only mode, no cleanup is needed since the client doesn't own any resources.

### 8.2 Full Stack Mode Cleanup

```typescript
import { createOpencode } from '@opencode-ai/sdk';

const { client, server } = await createOpencode();

// Method A: Explicit close
server.close();

// Method B: Abort signal
const controller = new AbortController();
const { client, server } = await createOpencode({
  signal: controller.signal,
});

// Later
controller.abort();

// Method C: Try-finally for cleanup
const { client, server } = await createOpencode();

try {
  // Use client
  await client.session.prompt({ body: { message: 'Hello' } });
} finally {
  // Always cleanup
  server.close();
}
```

### 8.3 Graceful Shutdown Pattern

```typescript
import { createOpencode } from '@opencode-ai/sdk';

class OpenCodeManager {
  private server: { url: string; close(): void } | null = null;
  private client: any = null;

  async initialize() {
    const result = await createOpencode({
      port: 4096,
      timeout: 10000,
    });

    this.server = result.server;
    this.client = result.client;

    console.log(`OpenCode ready at ${this.server.url}`);
  }

  async shutdown() {
    if (this.server) {
      console.log('Shutting down OpenCode server...');
      this.server.close();
      this.server = null;
      this.client = null;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('OpenCode not initialized');
    }
    return this.client;
  }
}

// Usage
const manager = new OpenCodeManager();

// Setup graceful shutdown
process.on('SIGINT', async () => {
  await manager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await manager.shutdown();
  process.exit(0);
});
```

### 8.4 Cleanup Checklist

When using full stack mode, ensure:

- [ ] Call `server.close()` before process exit
- [ ] Handle process termination signals (SIGINT, SIGTERM)
- [ ] Use try-finally blocks for error scenarios
- [ ] Abort in-flight requests before closing
- [ ] Clean up temporary files if created
- [ ] Log shutdown for debugging

---

## 9. Comparison to Anthropic SDK

### 9.1 Architectural Differences

| Aspect | Anthropic Agent SDK | OpenCode SDK |
|--------|-------------------|--------------|
| **Architecture** | Standalone library | Client-server architecture |
| **Initialization** | `new Anthropic()` or `createSdk()` | `createOpencode()` or `createOpencodeClient()` |
| **Server Required** | No | Yes (for full stack mode) |
| **Execution** | Direct API calls | HTTP/WebSocket to server |
| **State Management** | Client-side (optional) | Server-side (native) |
| **Cleanup** | None required | Must close server |
| **Startup Time** | Instant | 1-3 seconds (server spawn) |
| **Port Management** | Not applicable | Required (default: 4096) |

### 9.2 Initialization Comparison

#### Anthropic SDK Pattern

```typescript
import { createSdk } from '@anthropic-ai/claude-agent-sdk';

// Simple initialization
const sdk = createSdk({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ready immediately
const result = await sdk.query({
  prompt: 'Hello, Claude!',
  tools: {},
});

// No cleanup needed
```

#### OpenCode SDK Pattern

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Requires async initialization
const { client, server } = await createOpencode({
  port: 4096,
});

// Must create session first
const session = await client.session.create({});

// Then execute
const result = await client.session.prompt({
  body: {
    sessionID: session.data.id,
    message: 'Hello, OpenCode!',
  },
});

// Must cleanup
server.close();
```

### 9.3 Complexity Comparison

| Operation | Anthropic SDK | OpenCode SDK |
|-----------|--------------|--------------|
| **Initialize** | 1 line, sync | 2-3 lines, async |
| **Execute** | 1 function call | Create session + prompt |
| **Cleanup** | Not needed | Required (server.close) |
| **Error Handling** | Simple | Complex (server + network) |
| **Testing** | Easy | Requires server process |

---

## 10. Gotchas and Considerations

### 10.1 Server Dependency

**Gotcha:** OpenCode SDK cannot function without the server process.

```typescript
// ❌ This will fail if server is not running
const client = createOpencodeClient();
const result = await client.session.prompt({ /* ... */ });
// Error: connect ECONNREFUSED 127.0.0.1:4096
```

**Solution:** Always check server availability or use full stack mode.

```typescript
// ✅ Use full stack mode for embedded usage
const { client, server } = await createOpencode();

// ✅ Or validate server is running
async function isServerAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 10.2 Port Conflicts

**Gotcha:** Default port 4096 may be in use.

```typescript
// ❌ Will fail if port is in use
const { client, server } = await createOpencode({ port: 4096 });
// Error: listen EADDRINUSE: address already in use :::4096
```

**Solution:** Implement port fallback logic.

```typescript
// ✅ Try multiple ports
async function startWithFallback(startPort = 4096) {
  for (let port = startPort; port < startPort + 10; port++) {
    try {
      return await createOpencode({ port });
    } catch (error) {
      if (!error.message.includes('EADDRINUSE')) throw error;
    }
  }
  throw new Error('No available port found');
}
```

### 10.3 Async Initialization

**Gotcha:** `createOpencode()` is async, requires await.

```typescript
// ❌ Forgetting await
const { client, server } = createOpencode();
// TypeError: { client, server } is not iterable

// ❌ Not awaiting
const result = createOpencode();
result.client.session.prompt({ /* ... */ });
// TypeError: Cannot read properties of undefined
```

**Solution:** Always use await or handle Promise.

```typescript
// ✅ Proper async/await
async function init() {
  const { client, server } = await createOpencode();
  // Use client...
}

// ✅ Or handle Promise
createOpencode().then(({ client, server }) => {
  // Use client...
});
```

### 10.4 Server Cleanup

**Gotcha:** Forgetting to close server leaves zombie processes.

```typescript
// ❌ Server process not cleaned up
const { client, server } = await createOpencode();
// Use client...
// Function exits, server process continues running
```

**Solution:** Always cleanup, use try-finally.

```typescript
// ✅ Always cleanup
async function withOpenCode(fn: (client: any) => Promise<void>) {
  const { client, server } = await createOpencode();

  try {
    await fn(client);
  } finally {
    server.close();
  }
}
```

### 10.5 Session Management

**Gotcha:** Sessions are server-side, persist indefinitely.

```typescript
// ❌ Sessions accumulate server-side
for (let i = 0; i < 1000; i++) {
  await client.session.create({});
}
// Server memory grows unbounded
```

**Solution:** Explicitly delete sessions when done.

```typescript
// ✅ Clean up sessions
const session = await client.session.create({});
try {
  // Use session...
} finally {
  await client.session.delete({
    query: { sessionID: session.data.id },
  });
}
```

### 10.6 Configuration Precedence

**Gotcha:** Configuration from multiple sources can conflict.

```typescript
// ❌ Unclear which model is used
const { client, server } = await createOpencode({
  config: { model: 'anthropic/claude-opus' },
});

// Environment variable also set
// OPENCODE_MODEL=google/gemini-pro

// Which model is used?
```

**Solution:** Understand precedence order (env > config > defaults).

### 10.7 Type Safety

**Gotcha:** Generated types are complex and nested.

```typescript
// ❌ Type errors due to complex nested types
const result = await client.session.prompt({
  body: {
    message: 'Hello',
  },
});

// Type of result is RequestResult<SessionPromptResponses>
// Which is a complex discriminated union
```

**Solution:** Use type assertions or helper functions.

```typescript
// ✅ Extract data safely
const result = await client.session.prompt({
  body: { message: 'Hello' },
});

if (result.data && 'id' in result.data) {
  const sessionId = result.data.id;
  // Use sessionId...
}
```

---

## 11. Code Examples

### 11.1 Minimal Client-Only Example

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk';

// Assume server is already running at localhost:4096
const client = createOpencodeClient();

// Create and execute session
const result = await client.session.prompt({
  body: {
    message: 'Explain this code:',
  },
});

console.log(result.data);
```

### 11.2 Minimal Full Stack Example

```typescript
import { createOpencode } from '@opencode-ai/sdk';

async function main() {
  // Start server and get client
  const { client, server } = await createOpencode({
    port: 4096,
  });

  console.log(`Server running at ${server.url}`);

  try {
    // Create session
    const session = await client.session.create({});

    // Execute prompt
    const result = await client.session.prompt({
      body: {
        sessionID: session.data.id,
        message: 'Hello, OpenCode!',
      },
    });

    console.log('Response:', result.data);

  } finally {
    // Always cleanup
    server.close();
    console.log('Server shut down');
  }
}

main().catch(console.error);
```

### 11.3 Production-Ready Example

```typescript
import { createOpencode } from '@opencode-ai/sdk';

interface OpenCodeConfig {
  port?: number;
  hostname?: string;
  timeout?: number;
  model?: string;
}

class OpenCodeService {
  private server: { url: string; close(): void } | null = null;
  private client: any = null;
  private initializing: Promise<void> | null = null;

  constructor(private config: OpenCodeConfig = {}) {}

  async initialize(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.doInitialize();
    await this.initializing;
    this.initializing = null;
  }

  private async doInitialize(): Promise<void> {
    const { client, server } = await createOpencode({
      hostname: this.config.hostname || '127.0.0.1',
      port: this.config.port || 4096,
      timeout: this.config.timeout || 30000,
      config: {
        model: this.config.model,
      },
    });

    this.client = client;
    this.server = server;

    // Setup shutdown handlers
    this.setupShutdownHandlers();

    console.log(`OpenCode initialized at ${server.url}`);
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async shutdown(): Promise<void> {
    if (this.server) {
      console.log('Shutting down OpenCode...');
      this.server.close();
      this.server = null;
      this.client = null;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('OpenCode not initialized. Call initialize() first.');
    }
    return this.client;
  }

  async execute(prompt: string, sessionId?: string): Promise<any> {
    const client = this.getClient();

    // Create session if not provided
    let sid = sessionId;
    if (!sid) {
      const session = await client.session.create({});
      sid = session.data.id;
    }

    // Execute prompt
    const result = await client.session.prompt({
      body: {
        sessionID: sid,
        message: prompt,
      },
    });

    return result;
  }
}

// Usage
async function main() {
  const service = new OpenCodeService({
    port: 4096,
    model: 'anthropic/claude-opus-4-5-20251101',
  });

  await service.initialize();

  try {
    const response = await service.execute(
      'Write a TypeScript function to reverse a string'
    );

    console.log('Response:', response.data);
  } finally {
    await service.shutdown();
  }
}

main().catch(console.error);
```

### 11.4 Multi-Session Example

```typescript
import { createOpencode } from '@opencode-ai/sdk';

async function multiSessionExample() {
  const { client, server } = await createOpencode();

  try {
    // Create multiple sessions
    const session1 = await client.session.create({
      body: {
        system: 'You are a Python expert.',
      },
    });

    const session2 = await client.session.create({
      body: {
        system: 'You are a JavaScript expert.',
      },
    });

    // Execute in different contexts
    const pythonResult = await client.session.prompt({
      body: {
        sessionID: session1.data.id,
        message: 'How do I create a list comprehension?',
      },
    });

    const jsResult = await client.session.prompt({
      body: {
        sessionID: session2.data.id,
        message: 'How do I use array.map()?',
      },
    });

    console.log('Python expert:', pythonResult.data);
    console.log('JavaScript expert:', jsResult.data);

    // Cleanup sessions
    await client.session.delete({
      query: { sessionID: session1.data.id },
    });

    await client.session.delete({
      query: { sessionID: session2.data.id },
    });

  } finally {
    server.close();
  }
}
```

---

## 12. Integration Patterns

### 12.1 Provider Pattern (Groundswell)

Based on the Groundswell `AnthropicProvider` implementation, here's how OpenCode SDK would integrate:

```typescript
import type { Provider, ProviderOptions } from '../types/providers.js';

export class OpenCodeProvider implements Provider {
  readonly id = 'opencode';

  readonly capabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,
    extendedThinking: true,
  };

  private sdk: Awaited<ReturnType<typeof createOpencode>> | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    // Lazy load SDK
    const { createOpencode } = await import('@opencode-ai/sdk');

    // Initialize full stack mode
    this.sdk = await createOpencode({
      hostname: options?.endpoint || '127.0.0.1',
      port: 4096,
      config: {
        apiKey: options?.apiKey,
      },
    });

    console.log(`OpenCode initialized at ${this.sdk.server.url}`);
  }

  async execute<T>(request: any): Promise<any> {
    if (!this.sdk) {
      throw new Error('OpenCode provider not initialized');
    }

    // Create or get session
    let sessionId = request.sessionId;
    if (!sessionId) {
      const session = await this.sdk.client.session.create({});
      sessionId = session.data.id;
    }

    // Execute prompt
    const result = await this.sdk.client.session.prompt({
      body: {
        sessionID: sessionId,
        message: request.prompt,
      },
    });

    return {
      status: 'success',
      data: result.data as T,
      error: null,
    };
  }

  async terminate(): Promise<void> {
    if (this.sdk) {
      this.sdk.server.close();
      this.sdk = null;
    }
  }
}
```

### 12.2 Singleton Pattern

```typescript
import { createOpencode } from '@opencode-ai/sdk';

class OpenCodeSingleton {
  private static instance: OpenCodeSingleton | null = null;
  private sdk: Awaited<ReturnType<typeof createOpencode>> | null = null;

  private constructor() {}

  static async getInstance(): Promise<OpenCodeSingleton> {
    if (!OpenCodeSingleton.instance) {
      OpenCodeSingleton.instance = new OpenCodeSingleton();
      await OpenCodeSingleton.instance.initialize();
    }
    return OpenCodeSingleton.instance;
  }

  private async initialize(): Promise<void> {
    this.sdk = await createOpencode();
  }

  getClient() {
    if (!this.sdk) {
      throw new Error('Not initialized');
    }
    return this.sdk.client;
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      this.sdk.server.close();
      this.sdk = null;
    }
    OpenCodeSingleton.instance = null;
  }
}

// Usage
const instance = await OpenCodeSingleton.getInstance();
const client = instance.getClient();
```

### 12.3 Connection Pool Pattern

```typescript
import { createOpencode } from '@opencode-ai/sdk';

class OpenCodePool {
  private instances: Map<string, Awaited<ReturnType<typeof createOpencode>>> = new Map();

  async acquire(key: string = 'default'): Promise<any> {
    if (!this.instances.has(key)) {
      const sdk = await createOpencode();
      this.instances.set(key, sdk);
    }

    return this.instances.get(key)!.client;
  }

  async release(key: string = 'default'): Promise<void> {
    const instance = this.instances.get(key);
    if (instance) {
      instance.server.close();
      this.instances.delete(key);
    }
  }

  async closeAll(): Promise<void> {
    for (const [key, instance] of this.instances) {
      instance.server.close();
    }
    this.instances.clear();
  }
}
```

---

## 13. Key Takeaways

### 13.1 Initialization Requirements

1. **Always Async:** `createOpencode()` requires await
2. **Server Process:** Full stack mode spawns a subprocess
3. **Port Management:** Must handle port conflicts
4. **Cleanup Required:** Must call `server.close()`

### 13.2 Best Practices

1. **Use try-finally:** Always cleanup server in finally block
2. **Handle Signals:** Setup SIGINT/SIGTERM handlers
3. **Port Fallback:** Implement port retry logic
4. **Session Cleanup:** Delete sessions when done
5. **Error Handling:** Check for EADDRINUSE and timeout errors

### 13.3 When to Use Each Pattern

**Client-Only Mode (`createOpencodeClient`):**
- Server already running
- Multiple clients connecting to same server
- Server managed externally

**Full Stack Mode (`createOpencode`):**
- Embedded OpenCode in application
- Full control over server lifecycle
- Testing and development

---

## 14. Comparison with Similar SDKs

### 14.1 Anthropic Agent SDK

| Aspect | Anthropic | OpenCode |
|--------|-----------|----------|
| **Initialization** | `createSdk({ apiKey })` | `await createOpencode()` |
| **Async Required** | No | Yes |
| **Server Process** | No | Yes |
| **Cleanup** | Not needed | Required |
| **Sessions** | Optional (`continue: true`) | Native (required) |
| **Complexity** | Low | High |

### 14.2 Vercel AI SDK

| Aspect | Vercel AI SDK | OpenCode |
|--------|--------------|----------|
| **Initialization** | None (standalone) | `await createOpencode()` |
| **Provider Support** | 17+ | 75+ |
| **Server Process** | No | Yes |
| **Sessions** | Via abstraction | Native |
| **Architecture** | Library | Client-server |

### 14.3 LangChain.js

| Aspect | LangChain | OpenCode |
|--------|-----------|----------|
| **Initialization** | `new ChatOpenAI()` | `await createOpencode()` |
| **Async Required** | No | Yes |
| **Server Process** | No | Yes |
| **MCP Support** | Via adapters | Native |
| **Complexity** | Medium | High |

---

## 15. Sources

### Primary Sources

1. **NPM Package:** `@opencode-ai/sdk@1.1.36`
   - URL: https://www.npmjs.com/package/@opencode-ai/sdk
   - Installation: `npm install @opencode-ai/sdk`

2. **TypeScript Definitions** (extracted from package):
   - `/dist/index.d.ts` - Main exports
   - `/dist/client.d.ts` - Client creation
   - `/dist/server.d.ts` - Server creation
   - `/dist/gen/types.gen.d.ts` - Core types
   - `/dist/gen/sdk.gen.d.ts` - OpencodeClient class

3. **Ecosystem Package:** `ai-sdk-provider-opencode-sdk@1.0.0`
   - Repository: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
   - Usage examples and patterns

### Local Documentation

4. **Groundswell Project:**
   - `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S1/research/opencode-sdk-research.md`
   - `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md`
   - `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`

5. **PRD:**
   - `/home/dustin/projects/groundswell/PRD.md` - Provider requirements and capabilities

---

## 16. Recommendations

### 16.1 For Groundswell Integration

**Recommendation:** Use **client-only mode** for OpenCode integration.

**Rationale:**
- Server managed externally by user
- Simpler lifecycle management
- No cleanup required
- More predictable behavior

**Alternative:** If full stack mode is required:
- Implement robust error handling
- Use try-finally for cleanup
- Handle process termination signals
- Implement port fallback logic

### 16.2 For OpenCodeProvider Implementation

**Pattern to Follow:**

```typescript
export class OpenCodeProvider implements Provider {
  private sdk: Awaited<ReturnType<typeof createOpencode>> | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    // Lazy load SDK
    const { createOpencode } = await import('@opencode-ai/sdk');

    // Initialize with error handling
    try {
      this.sdk = await createOpencode({
        hostname: options?.endpoint || '127.0.0.1',
        port: 4096,
        timeout: 30000,
      });

      console.log(`OpenCode initialized at ${this.sdk.server.url}`);

    } catch (error) {
      // Handle port conflicts, timeouts, etc.
      throw new Error(`Failed to initialize OpenCode: ${error.message}`);
    }
  }

  async terminate(): Promise<void> {
    // Always cleanup
    if (this.sdk) {
      this.sdk.server.close();
      this.sdk = null;
    }
  }
}
```

---

**End of Research Document**

Generated: 2026-01-25
Task: P3.M2.T1.S2 - Research OpenCode SDK Initialization Patterns
