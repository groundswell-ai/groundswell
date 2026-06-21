# Providers

Groundswell supports the Anthropic Agent SDK provider through a unified abstraction layer. The provider encapsulates SDK-specific details while presenting a consistent API for LLM execution, tool delegation, and session management.

> ⚠️ **DEPRECATED since v0.0.4 (PRD v1.2).** This document uses the pre-v1.2 `Provider*` vocabulary and documents only the `anthropic` runtime. It is superseded by **[Harnesses](harnesses.md)** — the authoritative harness reference (PRD §7). See the **[Provider → Harness Migration Guide](migration-provider-to-harness.md)**. The content below is retained for reference during the deprecation window.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Supported Providers](#supported-providers)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Configuration Cascade](#configuration-cascade)
- [Provider Registry](#provider-registry)
- [Model Specification](#model-specification)
- [Provider Lifecycle](#provider-lifecycle)
- [Sessions](#sessions)
  - [Session Persistence](#session-persistence)
    - [Session Persistence Overview](#overview)
    - [Session Lifecycle](#session-lifecycle)
    - [Session Persistence Configuration](#configuration)
    - [Storage Backends](#storage-backends)
    - [TTL and Cleanup](#ttl-and-cleanup)
    - [Migration Guide](#migration-guide)
- [Tools & MCP](#tools--mcp)
- [Hooks](#hooks)
- [Skills](#skills)
- [Streaming](#streaming)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Basic Usage

```typescript
import { configureProviders, ProviderRegistry } from 'groundswell';
import { AnthropicProvider } from 'groundswell';

// 1. Configure global defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
  }
});

// 2. Register provider
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());

// 3. Initialize provider
await registry.initializeAll(getGlobalProviderConfig());

// 4. Use with Agent (provider is resolved via cascade)
const agent = new Agent({
  model: 'claude-sonnet-4-20250514'
});

const result = await agent.prompt(prompt);
```

## Supported Providers

| Provider | SDK | Package | MCP | Skills | LSP | Streaming | Sessions | Extended Thinking |
|----------|-----|---------|-----|--------|-----|-----------|----------|-------------------|
| `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | ✓ | ✓ | ✓ | ✓ | ✓ (via abstraction) | ✓ |

**Capability Notes:**

- **Anthropic MCP**: Via `createSdkMcpServer` integration with Groundswell's MCPHandler
- **Anthropic Sessions**: Implemented via abstraction layer (in-memory Map), not native to SDK
- **Extended Thinking**: Supports reasoning tokens for extended thinking

### ProviderId

```typescript
// From src/types/providers.ts
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId = 'anthropic';
```

### ProviderCapabilities

```typescript
/**
 * Provider capability flags
 * Indicates which features a provider supports
 */
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}
```

## Architecture

The provider system uses a layered architecture with a unified interface that abstracts SDK-specific details:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Agent, Prompt, Workflow)                                  │
│                                                              │
│  - Agent resolves provider via cascade                      │
│  - Executes prompts with tool delegation                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Provider Registry (Singleton)                   │
│  - getInstance()                                             │
│  - register(), get(), has()                                  │
│  - initializeProvider(), initializeAll()                     │
│  - getStatus(), isReady(), terminateAll()                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Provider Interface (Provider)                   │
│  - initialize(), terminate()                                 │
│  - execute(), registerMCPs(), loadSkills()                   │
│  - normalizeModel()                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Provider Implementation                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AnthropicProvider                                  │   │
│  │  - SDK: @anthropic-ai/claude-agent-sdk             │   │
│  │  - MCP integration via createSdkMcpServer          │   │
│  │  - Session abstraction (in-memory Map)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**

1. **Configuration**: `configureProviders()` sets global defaults
2. **Registration**: Providers are registered with `ProviderRegistry`
3. **Initialization**: `initializeAll()` initializes all providers with their options
4. **Resolution**: Agent resolves provider via cascade (global → agent → prompt)
5. **Execution**: Provider executes prompts, delegates tools to Agent's MCPHandler
6. **Cleanup**: `terminateAll()` cleans up resources on shutdown

## Configuration

Provider configuration follows a three-level hierarchy: global, agent-level, and prompt-level.

### Global Configuration

```typescript
import { configureProviders } from 'groundswell';

configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000,
      headers: { 'X-Custom-Header': 'value' }
    }
  }
});
```

### GlobalProviderConfig

```typescript
/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 */
export interface GlobalProviderConfig {
  /**
   * Default provider to use when none specified
   */
  defaultProvider: ProviderId;

  /**
   * Per-provider default options
   * Mapped by provider ID, all options are optional
   */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### Agent-Level Configuration

```typescript
import { Agent } from 'groundswell';

const agent = new Agent({
  provider: 'anthropic',           // Override global default
  providerOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 60000
  },
  model: 'claude-sonnet-4-20250514'
});
```

### ProviderOptions

```typescript
/**
 * Provider configuration options
 * Used for provider initialization and configuration
 */
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;

  /** API key (if not from environment) */
  apiKey?: string;

  /** Session ID for session-based providers */
  sessionId?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;
}
```

## Configuration Cascade

Provider configuration uses nullish coalescing (`??`) to resolve values. The first non-null/undefined value wins.

### Priority Order

```
┌─────────────────────────────────────┐
│  Prompt-level Config (Highest)      │
│  provider: 'anthropic'              │
│  options: { ... }                   │
└────────────┬────────────────────────┘
             │ ?? (nullish coalescing)
             ▼
┌─────────────────────────────────────┐
│  Agent-level Config (Medium)        │
│  provider: 'anthropic'              │
│  providerOptions: { ... }           │
└────────────┬────────────────────────┘
             │ ??
             ▼
┌─────────────────────────────────────┐
│  Global Config (Lowest)             │
│  defaultProvider: 'anthropic'       │
│  providerDefaults: { ... }          │
└─────────────────────────────────────┘
```

### Cascade Example

```typescript
import { configureProviders, resolveProviderConfig, getGlobalProviderConfig } from 'groundswell';

// 1. Set global config
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: 'sk-global', timeout: 30000 }
  }
});

// 2. Agent config (inherits from global)
const agent = new Agent({
  provider: 'anthropic',           // Override global default
  providerOptions: {
    timeout: 60000                 // Override global timeout
  }
});

// 3. Prompt-level override (highest priority)
const result = await agent.prompt(prompt, {
  provider: 'anthropic',          // Override agent provider
  providerOptions: {
    apiKey: 'sk-prompt'           // Override global API key
  }
});

// Resolution for prompt above:
// - provider: 'anthropic' (prompt wins)
// - options: { apiKey: 'sk-prompt', timeout: 30000 }
//   - apiKey from prompt options
//   - timeout from anthropic global defaults
```

### Implementation

See `src/utils/provider-config.ts:250-363` for the `resolveProviderConfig()` implementation.

**Key Points:**

- Provider resolution: `promptProvider ?? agentProvider ?? globalConfig.defaultProvider`
- Options merge: `{ ...globalDefaults, ...agentOptions, ...promptOptions }`
- Later objects override earlier objects for the same keys
- Empty objects (`{}`) are used for nullish coalescing to avoid undefined

## Provider Registry

The `ProviderRegistry` is a singleton that manages provider instances throughout the application lifecycle.

### Singleton Pattern

```typescript
import { ProviderRegistry } from 'groundswell';

// Get the singleton instance
const registry = ProviderRegistry.getInstance();

// Register provider
registry.register(new AnthropicProvider());

// Check if provider exists
if (registry.has('anthropic')) {
  // Provider is registered
}

// Get provider instance
const provider = registry.get('anthropic');
```

### Initialization

```typescript
import { getGlobalProviderConfig } from 'groundswell';

const registry = ProviderRegistry.getInstance();

// Initialize a single provider
await registry.initializeProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Or initialize all providers in parallel
const result = await registry.initializeAll(getGlobalProviderConfig());

console.log(`Initialized: ${result.success.join(', ')}`);
if (result.failed.length > 0) {
  console.error(`Failed: ${result.failed.map(f => f.providerId).join(', ')}`);
}
```

**Initialization States:**

```typescript
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed'
}
```

### Promise Caching

Multiple concurrent calls to `initializeProvider()` share the same promise:

```typescript
// These two calls share the same initialization promise
const promise1 = registry.initializeProvider('anthropic');
const promise2 = registry.initializeProvider('anthropic');

// Both await the same promise - no duplicate initialization
await Promise.all([promise1, promise2]);
```

### Status Checking

```typescript
// Check if provider is ready
if (registry.isReady('anthropic')) {
  const provider = registry.get('anthropic');
  // Use provider
}

// Get detailed status
const status = registry.getStatus('anthropic');
console.log(status); // 'initialized' | 'initializing' | 'failed' | 'uninitialized'

// Get all provider statuses
const statuses = registry.getAllStatuses();
for (const [id, state] of statuses.entries()) {
  console.log(`${id}: ${state.status}`);
}
```

### Termination

```typescript
// Terminate all providers (parallel, error-tolerant)
await registry.terminateAll();

// All providers terminated, maps cleared
console.log(registry.has('anthropic')); // false
```

**Termination Behavior:**

- Uses `Promise.allSettled` for partial success tolerance
- Errors are logged but not thrown
- Providers and states maps are cleared after termination
- Individual provider `terminate()` methods are idempotent

See `src/harnesses/provider-registry.ts` for complete implementation.

## Model Specification

Model strings support two formats: plain (uses default provider) and qualified (explicit provider).

### Format Types

| Format | Example | Provider | Model |
|--------|---------|----------|-------|
| Plain | `claude-sonnet-4-20250514` | (default) | `claude-sonnet-4-20250514` |
| Qualified | `anthropic/claude-opus-4-20250514` | `anthropic` | `claude-opus-4-20250514` |

### ModelSpec

```typescript
/**
 * Model specification
 *
 * Represents a parsed model identifier with provider and model name.
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}
```

### Provider-Specific Behavior

**AnthropicProvider:**

```typescript
const provider = new AnthropicProvider();

// Plain format (uses 'anthropic' as default)
provider.normalizeModel('claude-sonnet-4');
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

// Qualified format (explicit provider)
provider.normalizeModel('anthropic/claude-opus-4');
// Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }

// Error: invalid provider
provider.normalizeModel('invalid/gpt-4');
// Throws: "Cannot normalize invalid/gpt-4 with AnthropicProvider..."
```

**GOTCHA:** Model strings must use valid Anthropic model names or qualified format with 'anthropic' provider.

## Provider Lifecycle

Providers follow a three-phase lifecycle: initialization, execution, and termination.

### Phase 1: Initialization

```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();

// Initialize with options
await provider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
  endpoint: 'https://api.anthropic.com',
  timeout: 30000
});

// Provider is now ready for execution
```

**Lazy SDK Loading:**

Both providers use dynamic `import()` in `initialize()` to support optional dependencies:

```typescript
// SDK is loaded on first use, not at module import time
this.sdk = await import("@anthropic-ai/claude-agent-sdk");
```

### Phase 2: Execution

```typescript
const result = await provider.execute(
  {
    prompt: 'Explain quantum computing',
    options: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are a helpful assistant.',
      tools: myTools,
      sessionId: 'session-123'
    }
  },
  toolExecutor,  // Callback for tool execution
  hooks         // Optional lifecycle hooks
);
```

**State Transitions:**

- `UNINITIALIZED` → `INITIALIZING` → `INITIALIZED` (success)
- `UNINITIALIZED` → `INITIALIZING` → `FAILED` (error)

### Phase 3: Termination

```typescript
// Cleanup resources
await provider.terminate();

// Termination is idempotent - can be called multiple times
await provider.terminate();  // Safe, no-op
```

**Termination Behavior:**

- **AnthropicProvider**: Clears SDK reference, MCP config, skills, sessions (stateless SDK)
- Idempotent and never throws (errors logged only)

See `src/harnesses/anthropic-provider.ts:147-229` for implementation details.

## Sessions

Session management enables multi-turn conversations with state persistence.

### Anthropic Sessions (Abstraction Layer)

```typescript
const provider = new AnthropicProvider();
await provider.initialize();

// Sessions are managed via in-memory Map
// Anthropic SDK is stateless - sessions are an abstraction

// First turn
await provider.execute(
  {
    prompt: 'My name is Alice',
    options: { sessionId: 'session-123' }
  },
  toolExecutor
);

// Second turn (continues conversation)
await provider.execute(
  {
    prompt: 'What is my name?',
    options: { sessionId: 'session-123' }  // Same session
  },
  toolExecutor
);
// Response: "Your name is Alice."
```

**Implementation Details:**

- Sessions stored in `Map<string, SessionState>` (see `src/harnesses/anthropic-provider.ts:145`)
- Each session tracks `history: SDKUserMessage[]` and `lastResult: SDKResultMessage`
- For continuation: `continue: true` + `streamInput()` with history
- **CRITICAL**: Anthropic SDK has no native sessions - this is a session abstraction layer provided by Groundswell

### Session ID Propagation

```typescript
// Session ID can be set at any level
configureProviders({
  providerDefaults: {
    anthropic: { sessionId: 'global-session' }
  }
});

const agent = new Agent({
  providerOptions: { sessionId: 'agent-session' }
});

// Prompt-level wins (cascade)
await agent.prompt(prompt, {
  providerOptions: { sessionId: 'prompt-session' }
});
```

### Session Persistence

Session persistence enables multi-turn conversations to survive server restarts and provides storage backend flexibility for different deployment scenarios.

#### Overview

Session persistence extends the basic session management by providing configurable storage backends. By default, sessions are stored in-memory and are lost when the process exits. With persistent storage, sessions survive restarts and can be shared across multiple provider instances.

**Key Benefits:**

- **Survives Restarts**: Sessions persist across server restarts and process crashes
- **Multi-Instance Support**: Multiple processes can share the same session storage
- **Production Ready**: File-based storage with atomic writes prevents data corruption
- **Flexible TTL**: Automatic session expiration with configurable time-to-live

**Stateless SDK vs Application Sessions:**

The Anthropic SDK is stateless and has no native session support. Groundswell provides a session abstraction layer at the application level. When you use `sessionId`, the provider:

1. Stores conversation history (`history: SDKUserMessage[]`)
2. Tracks the last execution result (`lastResult: SDKResultMessage`)
3. Manages timestamps for TTL enforcement
4. Persists data to the configured storage backend

See `src/harnesses/session-store.ts` for implementation details.

#### Session Lifecycle

The session lifecycle integrates with the provider lifecycle to provide seamless persistence and restoration.

```text
┌─────────────────────────────────────────────────────────────────┐
│  Session Lifecycle                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  CREATE         │     │  INITIALIZE     │                   │
│  │  createSession()│────▶│  provider.init()│                   │
│  │  (lazy, on      │     │  • List stored  │                   │
│  │   first use)    │     │    sessions     │                   │
│  └────────┬────────┘     │  • Restore      │                   │
│           │              │    persistent   │                   │
│           │              │    sessions     │                   │
│           ▼              │  • Cleanup      │                   │
│  ┌─────────────────┐     │    expired      │                   │
│  │  USE            │     │    sessions     │                   │
│  │  execute()      │     └────────┬────────┘                   │
│  │  • Load session │              │                            │
│  │  • Stream       │              ▼                            │
│  │    history      │     ┌─────────────────┐                   │
│  │  • Update       │     │  TERMINATE      │                   │
│  │    timestamps   │────▶│  provider.term()│                   │
│  │  • Save state   │     │  • Clear memory │                   │
│  └────────┬────────┘     │    sessions     │                   │
│           │              │  • Keep         │                   │
│           │              │    persistent   │                   │
│           │              │    sessions     │                   │
│           ▼              └─────────────────┘                   │
│  ┌─────────────────┐                                            │
│  │  CLEANUP        │                                            │
│  │  deleteExpired()│                                            │
│  │  • Lazy (on     │                                            │
│  │    load)        │                                            │
│  │  • Active       │                                            │
│  │    (manual)     │                                            │
│  │  • Automatic    │                                            │
│  │    (on init)    │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Phase 1: Creation**

Sessions are created lazily on first use. When you provide a `sessionId` that doesn't exist, the provider automatically creates a new session with empty history and current timestamps.

```typescript
// First call creates the session
await provider.execute(
  { prompt: 'Hello', options: { sessionId: 'new-session' } },
  toolExecutor
);
// Session created with: history=[], lastResult=null, createdAt=now, lastAccessedAt=now
```

**Phase 2: Usage**

Each `execute()` call with a `sessionId` loads the session, streams the history to the SDK, and updates the timestamps.

```typescript
// Loads existing session, updates lastAccessedAt
await provider.execute(
  { prompt: 'Continue', options: { sessionId: 'existing-session' } },
  toolExecutor
);
```

**Phase 3: Persistence**

For persistent stores (FileSessionStore), sessions are automatically saved after each message and result update. Memory sessions are kept in the Map and not persisted to disk.

**Phase 4: Restoration**

When `provider.initialize()` is called with a persistent store, it verifies the store is accessible by listing sessions. Memory sessions are NOT restored (they start empty on each process restart).

**Phase 5: Cleanup**

Expired sessions are removed through three strategies:

- **Lazy Cleanup**: Checked on each `load()` operation
- **Active Cleanup**: Manual `sessionStore.deleteExpired(ttl)` call
- **Automatic Cleanup**: Runs on `provider.initialize()` for persistent stores

**See Also:**

- [Configuration](#session-persistence-configuration)
- [TTL and Cleanup](#ttl-and-cleanup)

#### Configuration

Session persistence is configured through `ProviderOptions` when initializing the provider. Three configuration methods are supported, with a clear priority order.

**Configuration Priority:**

```typescript
// Priority (highest to lowest):
// 1. sessionStore (direct injection)
provider.initialize({ sessionStore: new CustomStore() })

// 2. sessionPersistence (declarative)
provider.initialize({ sessionPersistence: 'file' })

// 3. MemorySessionStore (default)
provider.initialize({})  // Uses MemorySessionStore
```

**Important**: If `sessionStore` is provided, `sessionPersistence` is ignored. Use only one method.

**Options Reference:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sessionStore` | `SessionStore` | `undefined` | Direct injection of custom store instance |
| `sessionPersistence` | `'memory' \| 'file' \| 'redis'` | `undefined` | Declarative storage type selection |
| `sessionPath` | `string` | `'./sessions'` | Directory path for file-based storage |
| `sessionTtl` | `number` | `86400000` (24h) | Session time-to-live in milliseconds |

**Quick Start (File Persistence):**

```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 3600000  // 1 hour TTL
});

// Sessions now persist to ./sessions/
await provider.execute(
  { prompt: 'Remember my name', options: { sessionId: 'user-123' } },
  toolExecutor
);

// Restart server - session is still available
```

**Development Configuration:**

```typescript
// Development: In-memory sessions (default)
await provider.initialize({
  // No persistence config - uses MemorySessionStore
});

// Development: File storage in temp directory
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './dev-sessions',
  sessionTtl: 0  // Disabled - sessions never expire
});
```

**Production Configuration:**

```typescript
// Production: File-based persistence with cleanup
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: '/var/lib/app/sessions',
  sessionTtl: 86400000,  // 24 hours
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Production: Custom store implementation
await provider.initialize({
  sessionStore: new RedisSessionStore({ url: process.env.REDIS_URL }),
  sessionTtl: 3600000
});
```

**Gotchas:**

```typescript
// ❌ WRONG: sessionPersistence ignored when sessionStore is provided
provider.initialize({
  sessionStore: new CustomStore(),
  sessionPersistence: 'file'  // IGNORED!
})

// ✅ CORRECT: Use only one method
provider.initialize({
  sessionPersistence: 'file'  // OR
  // sessionStore: new CustomStore()
})
```

**See Also:**

- [Storage Backends](#storage-backends)
- [TTL and Cleanup](#ttl-and-cleanup)

#### Storage Backends

Groundswell provides pluggable session storage backends. Choose the backend that matches your deployment scenario and scalability requirements.

**Backend Comparison:**

| Backend | Speed | Persistence | Scalability | Use Case |
|---------|-------|-------------|-------------|----------|
| `MemorySessionStore` | Fastest | None | Single-process | Development, testing |
| `FileSessionStore` | Fast | Disk | Multi-process | Production single-server |
| `RedisSessionStore` | Medium | Redis | Distributed | Production multi-server (future) |

**Memory Session Store**

**File**: `src/harnesses/session-store.ts:108-183`

In-memory storage using a JavaScript Map. Sessions are lost when the process exits.

**Characteristics:**

- **Speed**: Fastest - direct Map operations
- **Persistence**: No - data lost on process exit
- **Scalability**: Single-process only
- **Use Case**: Development, testing, ephemeral workloads

**Configuration:**

```typescript
// Default (no config needed)
await provider.initialize();

// Explicit
await provider.initialize({
  sessionPersistence: 'memory'
});
```

**Behavior:**

- Cleared on `provider.terminate()`
- NOT restored on `provider.initialize()`
- No file I/O overhead
- No TTL enforcement by default (TTL parameter accepted but not enforced)

---

**File Session Store**

**File**: `src/harnesses/session-store.ts:198-368`

Disk-based storage with JSON files. Each session is stored as `{sessionId}.json` in the configured directory.

**Characteristics:**

- **Speed**: Fast - local file I/O with atomic writes
- **Persistence**: Yes - survives process restarts
- **Scalability**: Multi-process safe (file locking not required due to atomic writes)
- **Use Case**: Production single-server deployments

**Directory Layout:**

```bash
./sessions/
  ├── session-abc123.json      # Active session
  ├── session-def456.json      # Active session
  └── session-xyz789.tmp       # Temp file (atomic write in progress)
```

**Configuration:**

```typescript
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './sessions',     // Default: './sessions'
  sessionTtl: 86400000           // Default: 24 hours
});
```

**Behavior:**

- Atomic writes: writes to `.tmp` file, then renames
- Lazy expiration: checked on each `load()` call
- Directory auto-created if missing
- 60-second clock skew tolerance for TTL checks
- Sessions persist across `provider.terminate()` and restart

**Session File Format:**

```json
{
  "history": [
    {
      "type": "user",
      "message": { "content": "Hello" },
      "parent_tool_use_id": null,
      "session_id": "session-abc123"
    }
  ],
  "lastResult": {
    "subtype": "success",
    "result": { "answer": "Hi there!" }
  },
  "createdAt": 1706659200000,
  "lastAccessedAt": 1706662800000
}
```

**Gotchas:**

- File sessions require write permissions to `sessionPath`
- Ensure sufficient disk space for session storage
- Corrupted session files are skipped (not deleted) during cleanup
- Use absolute paths for `sessionPath` in production to avoid confusion

---

**Redis Session Store (Future)**

**File**: `src/harnesses/session-store.ts:380-411`

Interface stub for future Redis implementation. Currently NOT implemented.

**Status**: Interface only - do not use in production.

**Planned Characteristics:**

- **Speed**: Medium - network I/O to Redis
- **Persistence**: Yes - Redis persistence
- **Scalability**: Distributed - multiple servers
- **Use Case**: Production multi-server deployments

**See Also:**

- [Session Persistence Configuration](#session-persistence-configuration)
- [Migration Guide](#session-migration-guide)

#### TTL and Cleanup

Session time-to-live (TTL) automatically expires inactive sessions. Understanding TTL behavior is critical for managing session lifecycle and storage cleanup.

**TTL Behavior (Sliding Window):**

TTL uses a **sliding window** based on `lastAccessedAt`, NOT `createdAt`. This means active sessions never expire.

```typescript
// sessionTtl = 3600000 (1 hour)

// Session created at 12:00
// lastAccessedAt = 12:00, expires at 13:00

// User accesses at 12:30
// lastAccessedAt = 12:30, expires at 13:30  ← Window slides forward

// User accesses at 13:00
// lastAccessedAt = 13:00, expires at 14:00  ← Still active!

// User stops accessing
// Session expires at 14:00
```

**Important**: If you need fixed-window expiration (e.g., session expires 1 hour after creation regardless of activity), check `createdAt` in application code:

```typescript
const session = await provider.getSession(sessionId);
if (session && Date.now() - session.createdAt > MAX_SESSION_AGE) {
  await provider.deleteSession(sessionId);
}
```

**Cleanup Strategies:**

Three complementary strategies handle expired session removal:

**1. Lazy Cleanup (On Load)**

Sessions are checked for expiration on every `load()` operation. Expired sessions are deleted immediately and `null` is returned.

```typescript
// In FileSessionStore.load()
const sessionState = await this.load(sessionId);
if (sessionState === null) {
  // Session was expired and deleted during load
  console.log('Session not found or expired');
}
```

**2. Active Cleanup (Manual)**

Manually trigger cleanup of all expired sessions:

```typescript
const provider = new AnthropicProvider();
await provider.initialize({ sessionPersistence: 'file', sessionTtl: 3600000 });

// Get the session store
const sessionStore = provider['sessionStore'];  // Access private property

// Delete all expired sessions
const deletedIds = await sessionStore.deleteExpired(3600000);
console.log(`Deleted ${deletedIds.length} expired sessions`);
```

**3. Automatic Cleanup (On Initialize)**

Expired sessions are automatically cleaned up when the provider initializes with a persistent store:

```typescript
// Automatic cleanup runs here
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 86400000
});
// Cleanup log: "Cleaned up 15 expired sessions" (via console.debug)
```

**Edge Cases and Gotchas:**

**Clock Skew Tolerance:**

FileSessionStore adds a 60-second buffer to TTL checks to prevent premature expiration from clock synchronization issues.

```typescript
// In FileSessionStore
const CLOCK_SKEW_TOLERANCE = 60000; // 60 seconds
const expirationTime = lastAccessedAt + ttl + CLOCK_SKEW_TOLERANCE;

// Example: If session should expire at 12:00:00
// It actually expires at 12:01:00
```

**Legacy Session Handling:**

Sessions loaded without `createdAt` or `lastAccessedAt` timestamps get them added automatically on first load. This prevents crashes when loading old session files.

```typescript
// Legacy session file (no timestamps)
{
  "history": [...],
  "lastResult": {...}
  // No createdAt or lastAccessedAt
}

// On load, timestamps are added
const loaded = await sessionStore.load('legacy-session');
// loaded.createdAt = Date.now()
// loaded.lastAccessedAt = Date.now()
```

**Zero or Negative TTL:**

Setting `sessionTtl` to `0` or a negative value disables expiration. Sessions live forever until manually deleted.

```typescript
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 0  // Disabled - sessions never expire
});
```

**Configuration Examples:**

```typescript
// Development: No expiration
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 0
});

// Testing: 5 minute expiration
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 300000  // 5 minutes
});

// Production: 24 hour expiration
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 86400000  // 24 hours
});

// Production: 7 day expiration
await provider.initialize({
  sessionPersistence: 'file',
  sessionTtl: 604800000  // 7 days
});
```

**See Also:**

- [Session Lifecycle](#session-lifecycle)
- [Configuration](#session-persistence-configuration)

#### Migration Guide

Migrating from in-memory to persistent session storage requires careful planning to avoid data loss. This guide provides a step-by-step process for migrating existing sessions.

**Scenario: Migrating from Memory to File Storage**

**Before:**

```typescript
// Current configuration (in-memory)
await provider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

**After:**

```typescript
// New configuration (file-based)
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './sessions',
  sessionTtl: 86400000,
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

**Migration Steps:**

**Step 1: Export Existing Session Data (Optional)**

If you have active in-memory sessions that must be preserved:

```typescript
import { writeFile } from 'fs/promises';

// Get all in-memory sessions
const provider = new AnthropicProvider();
await provider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY });

// Access private session store
const sessionStore = provider['sessionStore'];
const sessionIds = await sessionStore.list();

const exportData: Record<string, SessionState> = {};
for (const id of sessionIds) {
  const state = await sessionStore.load(id);
  if (state) {
    exportData[id] = state;
  }
}

// Write to backup file
await writeFile('./session-backup.json', JSON.stringify(exportData, null, 2));
console.log(`Exported ${Object.keys(exportData).length} sessions`);
```

**Step 2: Update Configuration**

Change the provider initialization to use file persistence:

```typescript
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './sessions',
  sessionTtl: 86400000,
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

**Step 3: Import Sessions (If Exported)**

Load the exported sessions into the file store:

```typescript
import { readFile } from 'fs/promises';

// Read backup
const backupData = JSON.parse(await readFile('./session-backup.json', 'utf-8'));

// Import each session
const sessionStore = provider['sessionStore'];
let imported = 0;
for (const [id, state] of Object.entries(backupData)) {
  await sessionStore.save(id, state as SessionState);
  imported++;
}

console.log(`Imported ${imported} sessions to file store`);
```

**Step 4: Verify Migration**

Test that sessions persist across restarts:

```typescript
// Create a test session
await provider.execute(
  { prompt: 'Test persistence', options: { sessionId: 'migration-test' } },
  toolExecutor
);

// Restart process (simulate by re-initializing)
await provider.terminate();
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './sessions'
});

// Verify session exists
const session = await provider.getSession('migration-test');
if (session && session.history.length > 0) {
  console.log('✓ Migration successful - session persisted');
} else {
  console.log('✗ Migration failed - session not found');
}
```

**Rollback Plan:**

If issues occur, rollback to in-memory storage:

```typescript
// Rollback configuration
await provider.initialize({
  sessionPersistence: 'memory',  // Explicit rollback
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Import backup if sessions were exported
// (Follow Step 3 from migration process)
```

**Production Migration Checklist:**

- [ ] Schedule maintenance window (if 24/7 service)
- [ ] Backup current in-memory sessions (if any)
- [ ] Test migration in staging environment first
- [ ] Ensure `sessionPath` directory has write permissions
- [ ] Monitor disk space after migration
- [ ] Verify session restoration after process restart
- [ ] Have rollback plan ready
- [ ] Update deployment documentation
- [ ] Train operations team on new behavior

**Gotchas:**

- **In-memory sessions are lost** on process exit - they cannot be recovered after migration without exporting first
- **Session IDs don't change** - existing session IDs continue to work after migration
- **Timestamps are auto-added** - legacy sessions without timestamps get them on first load
- **File permissions matter** - ensure the process has write access to `sessionPath`
- **Disk space planning** - estimate storage requirements based on expected session count and average size

**See Also:**

- [Storage Backends](#storage-backends)
- [Configuration](#session-persistence-configuration)

## Tools & MCP

Tools are executed via Groundswell's MCPHandler regardless of provider. Providers delegate tool execution back to the Agent's tool executor.

### Tool Delegation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Provider.execute()                                          │
│  - Receives ProviderRequest with tools                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent.toolExecutor (callback)                               │
│  - Receives ToolExecutionRequest                             │
│  - Tool name format: "serverName__toolName"                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  MCPHandler                                                   │
│  - Resolves tool by name                                     │
│  - Executes tool with registered executor                    │
└─────────────────────────────────────────────────────────────┘
```

### Tool Naming Convention

MCP tools use the `serverName__toolName` format (double underscore):

```typescript
// MCP server registration
mcpHandler.registerServer({
  name: 'filesystem',
  transport: 'inprocess',
  tools: [
    { name: 'read_file', description: '...', input_schema: {...} }
  ]
});

// Tool becomes: "filesystem__read_file"
const tools = mcpHandler.getTools();
console.log(tools[0].name); // "filesystem__read_file"
```

See `src/core/agent.ts:143-200` for tool executor implementation.

### MCP Integration

```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize();

// Register MCP servers
const tools = await provider.registerMCPs([
  {
    name: 'demo',
    transport: 'inprocess',
    tools: [
      {
        name: 'calculate',
        description: 'Performs arithmetic operations',
        input_schema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['add', 'subtract'] },
            a: { type: 'number' },
            b: { type: 'number' }
          },
          required: ['operation', 'a', 'b']
        }
      }
    ]
  }
]);

console.log(tools); // [{ name: 'demo__calculate', ... }]
```

See `src/harnesses/anthropic-provider.ts:716-743` for registerMCPs implementation.

## Hooks

Hooks enable lifecycle event monitoring and custom processing during prompt execution.

### Hook Types

```typescript
/**
 * Provider hook events
 * Maps from AgentHooks to provider-specific events
 */
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

### Hook Mapping

| AgentHooks | ProviderHookEvents | Anthropic SDK |
|------------|-------------------|--------------|
| `preToolUse` | `onToolStart` | ✓ PreToolUse |
| `postToolUse` | `onToolEnd` | ✓ PostToolUse |
| `sessionStart` | `onSessionStart` | ✓ SessionStart |
| `sessionEnd` | `onSessionEnd` | ✓ SessionEnd |
| (N/A) | `onStream` | N/A |

### Hook Adaptation

AnthropicProvider adapts Groundswell hooks to SDK-compatible format:

```typescript
// Agent hooks → Provider hooks → SDK hooks
const providerHooks: ProviderHookEvents = {
  onToolStart: async (tool) => {
    console.log(`[PRE] Tool: ${tool.name}`);
  },
  onToolEnd: async (tool, result, duration) => {
    console.log(`[POST] Tool: ${tool.name}, Duration: ${duration}ms`);
  },
  onSessionStart: async () => {
    console.log('Session started');
  },
  onSessionEnd: async (totalDuration) => {
    console.log(`Session ended: ${totalDuration}ms`);
  }
};
```

See `src/harnesses/anthropic-provider.ts:853-950` for buildAgentSDKHooks implementation.

### Hook Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Session Start                                               │
│  - onSessionStart() called                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Tool Execution Loop                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ onToolStart() → Execute Tool → onToolEnd()            │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Session End                                                 │
│  - onSessionEnd(totalDuration) called                        │
└─────────────────────────────────────────────────────────────┘
```

## Skills

Skills are reusable prompt templates or capabilities that can be loaded into providers.

### Skill Loading

```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize();

// Load skills from directories
await provider.loadSkills([
  { name: 'math-expert', path: '/skills/math' },
  { name: 'code-reviewer', path: '/skills/code' }
]);

// Skills are injected into system prompts during execute()
```

### SKILL.md Format

Each skill directory must contain a `SKILL.md` file:

```markdown
<!-- /skills/math/SKILL.md -->
# Math Expert

You are an expert in mathematics. When solving math problems:
1. Show your work step by step
2. Explain your reasoning clearly
3. Verify your answer before responding
```

### Skill Injection

Skills are combined and injected into system prompts:

```typescript
// Without skills
systemPrompt: "You are a helpful assistant."

// With skills loaded
systemPrompt: `You are a helpful assistant.

## Available Skills

### Math Expert
You are an expert in mathematics...

---

### Code Reviewer
You are an expert code reviewer...

## Skill Usage
When responding, leverage the available skills above.
`;
```

### Multi-Skill Combination

```typescript
// Multiple skills are combined with markdown separators
await provider.loadSkills([
  { name: 'math-expert', path: '/skills/math' },
  { name: 'physics-expert', path: '/skills/physics' },
  { name: 'writer', path: '/skills/writing' }
]);

// Results in:
// ### Math Expert
// ...content...
// ---                       <- markdown separator
// ### Physics Expert
// ...content...
// ---
// ### Writer
// ...content...
```

See `src/harnesses/anthropic-provider.ts:768-804` for loadSkills implementation.

**GOTCHA:** `skill.path` is the directory - must join with `'SKILL.md'` to read the file.

## Streaming

Streaming responses enable real-time output generation with `AsyncGenerator`.

### Streaming vs Non-Streaming

```typescript
const provider = new AnthropicProvider();
await provider.initialize();

// Non-streaming (default)
const response = await provider.execute(
  { prompt: 'Tell me a story', options: { streaming: false } },
  toolExecutor
);
// Returns: AgentResponse<T>

// Streaming
const stream = await provider.execute(
  { prompt: 'Tell me a story', options: { streaming: true } },
  toolExecutor
);
// Returns: AsyncGenerator<StreamEvent, AgentResponse<T>>
```

### StreamEvent Types

```typescript
type StreamEvent =
  | { type: 'metadata'; metadata: { requestId: string; model: string; provider: string } }
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_done'; id: string; result: unknown }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheTokens?: number }
  | { type: 'done'; finishReason: string }
  | { type: 'error'; error: Error; code: string; retryable: boolean };
```

### Streaming Usage

```typescript
const stream = await provider.execute(
  { prompt: 'Explain quantum computing', options: { streaming: true } },
  toolExecutor
);

if (Symbol.asyncIterator in stream) {
  for await (const event of stream) {
    switch (event.type) {
      case 'text_delta':
        process.stdout.write(event.delta);
        break;
      case 'tool_call_start':
        console.log(`\n[Tool: ${event.name}]`);
        break;
      case 'usage':
        console.log(`\nTokens: ${event.inputTokens} in, ${event.outputTokens} out`);
        break;
      case 'done':
        console.log('\n[Complete]');
        break;
      case 'error':
        console.error(`Error: ${event.error.message}`);
        break;
    }
  }

  // Get final response from generator return value
  const finalResponse = await stream.next();
  console.log('Final:', finalResponse.value);
}
```

### Agent.stream() Method

```typescript
import { Agent } from 'groundswell';

const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({ user: 'Tell me a story' });

const { stream, controller } = agent.stream(prompt);

for await (const event of stream) {
  // Handle events
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  }
}

// Cancel stream if needed
controller.abort();
```

See `src/harnesses/anthropic-provider.ts:473-676` for executeStreaming implementation (lazy SDK loading via dynamic import).

## Usage Examples

This section provides executable examples demonstrating key provider system concepts and patterns. Each example is a complete, runnable TypeScript file that you can execute directly.

### Overview

The examples are organized by complexity and cover:

- **Basic Provider Usage** - Minimal setup and execution
- **Provider Configuration** - Global, agent, and prompt-level configuration
- **Provider Switching** - Runtime provider switching patterns
- **Multi-Provider Scenarios** - Cost optimization, fallback, A/B testing
- **Provider Sessions** - Multi-turn conversation management
- **Provider Features** - MCP integration, skills, and hooks

All examples are located in `/examples/providers/` and can be run with `npx tsx`.

### Quick Start

```bash
# Set required environment variable
export ANTHROPIC_API_KEY=sk-...

# Run individual examples
npx tsx examples/providers/01-basic-provider-usage.ts
npx tsx examples/providers/02-provider-configuration.ts
npx tsx examples/providers/03-provider-switching.ts
npx tsx examples/providers/04-multi-provider-scenarios.ts
npx tsx examples/providers/05-provider-sessions.ts
npx tsx examples/providers/06-provider-with-mcp-skills.ts

# Or use npm scripts
npm run start:provider-basic
npm run start:provider-config
npm run start:provider-switching
npm run start:provider-scenarios
npm run start:provider-sessions
npm run start:provider-features
```

### Example 1: Basic Provider Usage

**Run**: `npx tsx examples/providers/01-basic-provider-usage.ts`

**What you'll learn**:

- Provider registration with `ProviderRegistry.getInstance()`
- Provider initialization with `initializeProvider()`
- Creating Agent with provider configuration
- Executing prompts via configured providers

**Code snippet**:

```typescript
import { Agent, AnthropicProvider, ProviderRegistry } from 'groundswell';

// Register provider
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());

// Initialize provider
await registry.initializeProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Create agent
const agent = new Agent({
  name: 'BasicAgent',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514'
});

// Execute prompt
const response = await agent.prompt(prompt);
```

### Example 2: Provider Configuration

**Run**: `npx tsx examples/providers/02-provider-configuration.ts`

**What you'll learn**:

- Global configuration with `configureProviders()`
- Agent-level configuration in `new Agent({ provider })`
- Prompt-level overrides in `agent.prompt(prompt, { provider })`
- Configuration cascade priority (Prompt > Agent > Global)

**Code snippet**:

```typescript
import { configureProviders, Agent } from 'groundswell';

// Set global defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
  }
});

// Agent-level configuration
const agent = new Agent({
  provider: 'anthropic',
  providerOptions: { timeout: 10000 }
});

// Prompt-level override (highest priority)
await agent.prompt(prompt, {
  provider: 'anthropic',
  providerOptions: { apiKey: process.env.ANTHROPIC_API_KEY }
});
```

### Example 3: Provider Switching

**Run**: `npx tsx examples/providers/03-provider-switching.ts`

**What you'll learn**:

- Agent-level switching for different agent instances
- Prompt-level switching for temporary changes
- Verifying which provider is being used
- Choosing the right switching pattern

**Code snippet**:

```typescript
// Agent-level switching with different models
const fastAgent = new Agent({ provider: 'anthropic', model: 'claude-haiku-4-20250514' });
const smartAgent = new Agent({ provider: 'anthropic', model: 'claude-sonnet-4-20250514' });

// Prompt-level switching
const flexibleAgent = new Agent({ provider: 'anthropic' });

// Use agent default
await flexibleAgent.prompt(prompt);

// Switch for this call only (different model)
await flexibleAgent.prompt(prompt, { model: 'claude-haiku-4-20250514' });

// Back to default
await flexibleAgent.prompt(prompt);
```

### Example 4: Multi-Model Scenarios

**Run**: `npx tsx examples/providers/04-multi-model-scenarios.ts`

**What you'll learn**:

- Cost optimization based on task complexity
- Model selection strategies
- Fallback patterns for resilience
- Production architecture patterns

**Code snippet**:

```typescript
// Cost optimization
const complexity = analyzeTask(task);
const model = complexity === 'simple' ? 'claude-haiku-4-20250514' : 'claude-sonnet-4-20250514';
await agent.prompt(prompt, { model });

// Fallback pattern
try {
  return await agent.prompt(prompt, { provider: 'anthropic' });
} catch (error) {
  // Retry with different model if needed
  return await agent.prompt(prompt, { model: 'claude-haiku-4-20250514' });
}

// A/B testing different models
const models = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
const results = {};
for (const model of models) {
  results[model] = await agent.prompt(prompt, { model });
}
```

### Example 5: Provider Sessions

**Run**: `npx tsx examples/providers/05-provider-sessions.ts`

**What you'll learn**:

- Creating sessions with `sessionId`
- Continuing existing sessions
- Retrieving session state with `getSession()`
- Provider session model differences

**Code snippet**:

```typescript
const sessionId = `session-${Date.now()}`;

// Create session
await agent.prompt(prompt1, {
  providerOptions: { sessionId }
});

// Continue session
await agent.prompt(prompt2, {
  providerOptions: { sessionId }
});

// Retrieve session state
const provider = registry.get('anthropic');
const session = provider.getSession(sessionId);
console.log(session.history);
```

### Example 6: Provider Features

**Run**: `npx tsx examples/providers/06-provider-with-mcp-skills.ts`

**What you'll learn**:

- MCP server registration (AnthropicProvider)
- Using MCP tools in agent prompts
- Loading skills from SKILL.md files
- Provider hooks for observability
- Feature comparison across providers

**Code snippet**:

```typescript
// Register MCP server
const provider = registry.get('anthropic');
await provider.registerMCPs([{
  name: 'demo-server',
  transport: 'inprocess',
  tools: [/* tool definitions */]
}]);

// Load skills
await provider.loadSkills([
  { name: 'code-review', content: '/* skill content */' }
]);

// Use hooks
await agent.prompt(prompt, {
  hooks: {
    onToolStart: (toolName, input) => console.log(`Tool: ${toolName}`),
    onToolEnd: (toolName, output) => console.log(`Done: ${toolName}`)
  }
});
```

### See Also

- [Provider Examples README](../examples/providers/README.md) - Detailed examples documentation
- [Examples Index](../examples/index.ts) - Main examples runner
- [Architecture](#architecture) - Provider system architecture overview
- [Configuration Cascade](#configuration-cascade) - Configuration priority system

---

## API Reference

This section provides comprehensive documentation for all public provider system APIs, including type definitions, configuration functions, model specification utilities, and the ProviderRegistry class.

### Overview

The provider system API consists of:

- **Type Definitions**: Core interfaces and types for provider abstraction
- **Configuration Functions**: Global configuration management with cascade support
- **Model Specification Functions**: Model string parsing and formatting utilities
- **ProviderRegistry Class**: Singleton registry for provider lifecycle management

---

### Type Definitions

#### ProviderId

Provider identifier union type defining supported Agent SDK providers.

**Type Signature:**

```typescript
type ProviderId = 'anthropic';
```

**Description:**

- `'anthropic'`: Anthropic Claude provider via `@anthropic-ai/claude-agent-sdk`

**Example:**

```typescript
import type { ProviderId } from 'groundswell';

const provider: ProviderId = 'anthropic';  // Valid
const invalid: ProviderId = 'openai';      // TypeScript error
```

**See Also:**

- [Provider Interface](#provider-interface)
- [GlobalProviderConfig](#globalproviderconfig)

---

#### ProviderCapabilities

Provider capability flags indicating which features a provider supports.

**Type Signature:**

```typescript
interface ProviderCapabilities {
  mcp: boolean;
  skills: boolean;
  lsp: boolean;
  streaming: boolean;
  sessions: boolean;
  extendedThinking: boolean;
}
```

**Properties:**

- `mcp`: `boolean` - MCP server connections support
- `skills`: `boolean` - Skill loading support
- `lsp`: `boolean` - Language Server Protocol integration support
- `streaming`: `boolean` - Streaming responses support
- `sessions`: `boolean` - Session-based state management support
- `extendedThinking`: `boolean` - Extended thinking/reasoning tokens support

**Example:**

```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
console.log(provider.capabilities.mcp);           // true
console.log(provider.capabilities.streaming);     // true
console.log(provider.capabilities.extendedThinking); // true
```

**See Also:**

- [Provider Interface](#provider-interface)
- [Supported Providers](#supported-providers)

---

#### ProviderOptions

Configuration options for provider initialization and runtime behavior.

**Type Signature:**

```typescript
interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
  sessionStore?: SessionStore<SessionState>;
  sessionPersistence?: 'memory' | 'file' | 'redis';
  sessionTtl?: number;
  sessionPath?: string;
}
```

**Properties:**

- `endpoint`: `string` (optional) - Override the default API endpoint for the provider
- `apiKey`: `string` (optional) - API key for authentication (if not set via environment variable)
- `sessionId`: `string` (optional) - Session identifier for session-based providers
- `timeout`: `number` (optional) - Request timeout in milliseconds
- `headers`: `Record<string, string>` (optional) - Custom HTTP headers to include in requests
- `sessionStore`: `SessionStore<SessionState>` (optional) - Direct injection of custom session store instance
- `sessionPersistence`: `'memory' | 'file' | 'redis'` (optional) - Declarative storage type selection for session persistence
- `sessionTtl`: `number` (optional) - Session time-to-live in milliseconds (default: 86400000 / 24 hours)
- `sessionPath`: `string` (optional) - Directory path for file-based session storage (default: './sessions')

**Example:**

```typescript
import type { ProviderOptions } from 'groundswell';

const options: ProviderOptions = {
  apiKey: 'sk-ant-...',
  endpoint: 'https://api.anthropic.com',
  timeout: 30000,
  headers: {
    'X-Custom-Header': 'custom-value'
  },
  sessionPersistence: 'file',
  sessionPath: './sessions',
  sessionTtl: 86400000  // 24 hours
};

await provider.initialize(options);
```

**Session Persistence Configuration:**

Session persistence options control how sessions are stored and managed. Choose one configuration method:

```typescript
// Method 1: Declarative (recommended)
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './sessions',
  sessionTtl: 86400000
});

// Method 2: Direct injection (custom stores)
await provider.initialize({
  sessionStore: new CustomSessionStore()
});

// Method 3: Default (in-memory)
await provider.initialize({});  // Uses MemorySessionStore
```

**Important**: If `sessionStore` is provided, `sessionPersistence` is ignored. Use only one method.

**See Also:**

- [GlobalProviderConfig](#globalproviderconfig)
- [configureProviders()](#configureproviders)
- [Configuration Cascade](#configuration-cascade)
- [Session Persistence](#session-persistence)

---

#### Provider Interface

Provider interface for LLM backend abstraction. Defines the contract all providers must implement.

**Type Signature:**

```typescript
interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

**Properties:**

- `id`: `ProviderId` (readonly) - Unique provider identifier used for provider selection and model qualification
- `capabilities`: `ProviderCapabilities` (readonly) - Provider capability flags for feature detection

**Methods:**

##### initialize(options?)

Initialize the provider with optional configuration. Called when provider is first instantiated or registered.

**Parameters:**

- `options`: `ProviderOptions` (optional) - Provider-specific configuration

**Returns:** `Promise<void>`

**Throws:** `Error` if initialization fails

**Example:**

```typescript
const provider = new AnthropicProvider();
await provider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
  endpoint: 'https://api.anthropic.com',
  timeout: 30000
});
```

---

##### terminate()

Terminate the provider and cleanup resources. Called when provider is being shut down or unregistered.

**Returns:** `Promise<void>`

**Example:**

```typescript
await provider.terminate();
```

---

##### execute(request, toolExecutor, hooks?)

Execute a prompt request with type-safe response. Core method for LLM execution.

**Type Parameters:**

- `T` - The expected response data type

**Parameters:**

- `request`: `ProviderRequest` - The prompt request with options
- `toolExecutor`: `ToolExecutor` - Callback for executing tools (delegated to MCPHandler)
- `hooks`: `ProviderHookEvents` (optional) - Optional lifecycle hooks for events

**Returns:** `Promise<AgentResponse<T>>` or `AsyncGenerator<StreamEvent, AgentResponse<T>>` for streaming

**Example:**

```typescript
// Non-streaming
const response = await provider.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);
if (response.status === 'success') {
  console.log(response.data.answer);
}

// Streaming
const stream = await provider.execute(
  { prompt: 'Tell me a story', options: { streaming: true } },
  toolExecutor
);
if (Symbol.asyncIterator in stream) {
  for await (const event of stream) {
    // Handle streaming events
  }
}
```

---

##### registerMCPs(servers)

Register MCP servers and return available tools. Providers connect to MCP servers and discover all available tools.

**Parameters:**

- `servers`: `MCPServer[]` - Array of MCP server configurations

**Returns:** `Promise<Tool[]>` - Array of discovered Tool definitions

**Example:**

```typescript
const tools = await provider.registerMCPs([
  { name: 'filesystem', transport: 'stdio', command: 'python', args: ['mcp_server.py'] }
]);
console.log(`Registered ${tools.length} tools`);
```

---

##### loadSkills(skills)

Load skills into the provider. Skills are reusable prompt templates or capabilities.

**Parameters:**

- `skills`: `Skill[]` - Array of skill definitions to load

**Returns:** `Promise<void>`

**Example:**

```typescript
await provider.loadSkills([
  { name: 'web-search', path: '/skills/web-search' }
]);
```

---

##### normalizeModel(model)

Normalize a model string to a ModelSpec. Parses model strings in plain or qualified format.

**Parameters:**

- `model`: `string` - Model string to parse

**Returns:** `ModelSpec` with provider, model, and raw string

**Example:**

```typescript
provider.normalizeModel('claude-sonnet-4');
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

provider.normalizeModel('anthropic/claude-opus-4');
// Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
```

**See Also:**

- [ProviderId](#providerid)
- [ProviderCapabilities](#providercapabilities)
- [ModelSpec](#modelspec)

---

#### ProviderRequest

Provider request interface wrapping prompt and execution options.

**Type Signature:**

```typescript
interface ProviderRequest {
  prompt: string;
  options: ProviderExecutionOptions;
}
```

**Properties:**

- `prompt`: `string` - The user prompt/message
- `options`: `ProviderExecutionOptions` - Execution options

**See Also:**

- [ProviderExecutionOptions](#providerexecutionoptions)

---

#### ProviderExecutionOptions

Provider execution options wrapping parameters for provider execution requests.

**Type Signature:**

```typescript
interface ProviderExecutionOptions {
  model?: string;
  systemPrompt?: string;
  tools?: Tool[];
  hooks?: ProviderHookEvents;
  sessionId?: string;
  streaming?: boolean;
}
```

**Properties:**

- `model`: `string` (optional) - Model identifier
- `systemPrompt`: `string` (optional) - System prompt override
- `tools`: `Tool[]` (optional) - Available tools
- `hooks`: `ProviderHookEvents` (optional) - Lifecycle hooks
- `sessionId`: `string` (optional) - Session identifier for session-based providers
- `streaming`: `boolean` (optional) - Enable streaming mode (returns AsyncGenerator)

---

#### ToolExecutionRequest

Tool execution request for delegating tool execution to the MCPHandler.

**Type Signature:**

```typescript
interface ToolExecutionRequest {
  name: string;
  input: unknown;
}
```

**Properties:**

- `name`: `string` - Tool name (may be namespaced: "server__tool")
- `input`: `unknown` - Tool input parameters

**See Also:**

- [ToolExecutionResult](#toolexecutionresult)
- [ToolExecutor](#toolexecutor)

---

#### ToolExecutionResult

Tool execution result returned by the ToolExecutor callback.

**Type Signature:**

```typescript
interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}
```

**Properties:**

- `content`: `string | unknown` - Result content
- `isError`: `boolean` - Whether the execution resulted in an error

**See Also:**

- [ToolExecutionRequest](#toolexecutionrequest)
- [ToolExecutor](#toolexecutor)

---

#### ToolExecutor

Tool executor callback function type that delegates tool execution to the MCPHandler.

**Type Signature:**

```typescript
type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

**Parameters:**

- `request`: `ToolExecutionRequest` - Tool execution request with name and input

**Returns:** `Promise<ToolExecutionResult>` - Tool execution result

**Description:**
Provider implementations receive this callback and use it to execute tools. The provider does not create or manage its own MCPHandler instance.

**See Also:**

- [ToolExecutionRequest](#toolexecutionrequest)
- [ToolExecutionResult](#toolexecutionresult)

---

#### ProviderHookEvents

Provider hook events mapping from AgentHooks to provider-specific events.

**Type Signature:**

```typescript
interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}
```

**Properties:**

- `onToolStart`: `(tool: ToolExecutionRequest) => Promise<void> | void` (optional) - Called before tool execution
- `onToolEnd`: `(tool, result, duration) => Promise<void> | void` (optional) - Called after tool execution
- `onSessionStart`: `() => Promise<void> | void` (optional) - Called when provider session starts
- `onSessionEnd`: `(totalDuration: number) => Promise<void> | void` (optional) - Called when provider session ends
- `onStream`: `(chunk: string) => void` (optional) - Called for each streaming chunk

**Example:**

```typescript
const hooks: ProviderHookEvents = {
  onToolStart: async (tool) => {
    console.log(`Starting tool: ${tool.name}`);
  },
  onToolEnd: async (tool, result, duration) => {
    console.log(`Tool ${tool.name} completed in ${duration}ms`);
  }
};
```

**See Also:**

- [Hooks](#hooks)

---

#### ModelSpec

Model specification representing a parsed model identifier with provider and model name.

**Type Signature:**

```typescript
interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}
```

**Properties:**

- `provider`: `ProviderId` - Provider identifier
- `model`: `string` - Model name (without provider prefix)
- `raw`: `string` - Original raw model string (preserves user input)

**Description:**
Supports both plain ("claude-sonnet-4") and qualified ("anthropic/claude-opus-4") formats per PRD 7.8.

**Example:**

```typescript
// Plain format (uses default provider)
parseModelSpec('claude-sonnet-4', 'anthropic')
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

// Qualified format (explicit provider)
parseModelSpec('anthropic/claude-opus-4-20250514')
// Returns: { provider: 'anthropic', model: 'claude-opus-4-20250514', raw: 'anthropic/claude-opus-4-20250514' }
```

**See Also:**

- [parseModelSpec()](#parsemodelspec)
- [formatModelForProvider()](#formatmodelforprovider)
- [Model Specification](#model-specification)

---

#### GlobalProviderConfig

Global provider configuration for default provider and per-provider options.

**Type Signature:**

```typescript
interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

**Properties:**

- `defaultProvider`: `ProviderId` - Default provider to use when none specified
- `providerDefaults`: `Partial<Record<ProviderId, ProviderOptions>>` (optional) - Per-provider default options mapped by provider ID

**Description:**
Configures default provider and per-provider options that cascade to all agents unless explicitly overridden. Part of the configuration cascade (PRD 7.7).

**Example:**

```typescript
import { configureProviders } from 'groundswell';

configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
  }
});
```

**See Also:**

- [configureProviders()](#configureproviders)
- [ProviderOptions](#provideroptions)
- [Configuration Cascade](#configuration-cascade)

---

#### ProviderResult

Provider execution result wrapper using discriminated union pattern for type safety.

**Type Signature:**

```typescript
interface ProviderResult<T = unknown> {
  status: ProviderResponseStatus;
  data: T | null;
  error: ProviderErrorDetails | null;
  metadata: ProviderResponseMetadata;
}
```

**Properties:**

- `status`: `ProviderResponseStatus` - Response status discriminator ('success' | 'error' | 'partial')
- `data`: `T | null` - Response data (present on success and partial, null on error)
- `error`: `ProviderErrorDetails | null` - Error details (present on error, null on success)
- `metadata`: `ProviderResponseMetadata` - Response metadata (always present)

**Type Narrowing:**
The status field is a discriminant. Use type guards to narrow:

- `status='success'` → data is T (not null), error is null
- `status='error'` → data is null, error is ProviderErrorDetails (not null)
- `status='partial'` → data is T (not null), error may be null

**Example:**

```typescript
const result: ProviderResult<{ answer: string }> = {
  status: 'success',
  data: { answer: '42' },
  error: null,
  metadata: { providerId: 'anthropic', timestamp: Date.now() }
};

// Type narrowing
if (result.status === 'success') {
  console.log(result.data.answer);  // Type-safe access
}
```

**See Also:**

- [ProviderResponseStatus](#providerresponsestatus)
- [ProviderErrorDetails](#providererrordetails)
- [ProviderResponseMetadata](#providerresponsemetadata)

---

#### ProviderResponseStatus

Provider response status indicating the outcome of a provider operation.

**Type Signature:**

```typescript
type ProviderResponseStatus = 'success' | 'error' | 'partial';
```

**Values:**

- `'success'`: Operation completed successfully with valid data
- `'error'`: Operation failed with error details
- `'partial'`: Operation partially completed (streaming, incremental)

**See Also:**

- [ProviderResult](#providerresult)

---

#### ProviderErrorDetails

Detailed error information for provider operations.

**Type Signature:**

```typescript
interface ProviderErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}
```

**Properties:**

- `code`: `string` - Machine-readable error code (e.g., VALIDATION_FAILED, EXECUTION_FAILED)
- `message`: `string` - Human-readable error description
- `details`: `Record<string, unknown> | null` (optional) - Additional error context for debugging
- `recoverable`: `boolean` - Whether the error is recoverable (hint for retry logic)

**See Also:**

- [ProviderResult](#providerresult)

---

#### ProviderResponseMetadata

Metadata about provider operation execution.

**Type Signature:**

```typescript
interface ProviderResponseMetadata {
  providerId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;
  usage?: TokenUsage;
  toolCalls?: number;
}
```

**Properties:**

- `providerId`: `string` - ID of the provider that generated this response
- `timestamp`: `number` - Unix timestamp in milliseconds
- `duration`: `number | null` (optional) - Execution duration in milliseconds
- `requestId`: `string | null` (optional) - Request correlation ID for tracing
- `usage`: `TokenUsage` (optional) - Token usage breakdown from the API
- `toolCalls`: `number` (optional) - Number of tool invocations

**See Also:**

- [ProviderResult](#providerresult)

---

### Configuration Functions

#### configureProviders()

Configure global provider settings for the application.

**Type Signature:**

```typescript
function configureProviders(config: GlobalProviderConfig): void
```

**Parameters:**

- `config`: `GlobalProviderConfig` - Configuration object containing default provider and optional provider-specific defaults

**Throws:**

- `Error` - If `defaultProvider` is not a valid ProviderId ('anthropic')
- `Error` - If `providerDefaults` contains invalid provider IDs

**Returns:** `void`

**Description:**
Validates the configuration and stores it in the module-private globalConfig variable. This function should be called once at application startup. This global config is the lowest priority in the configuration cascade.

**Example:**

```typescript
import { configureProviders } from 'groundswell';

// Basic configuration with default provider
configureProviders({
  defaultProvider: 'anthropic'
});

// Configuration with provider-specific defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000
    }
  }
});
```

**See Also:**

- [GlobalProviderConfig](#globalproviderconfig)
- [getGlobalProviderConfig()](#getglobalproviderconfig)
- [resolveProviderConfig()](#resolveproviderconfig)
- [Configuration Cascade](#configuration-cascade)

---

#### getGlobalProviderConfig()

Get the current global provider configuration.

**Type Signature:**

```typescript
function getGlobalProviderConfig(): GlobalProviderConfig
```

**Returns:** `GlobalProviderConfig` - Current global provider configuration (never null)

**Description:**
Provides controlled access to the module-private globalConfig variable. Guarantees a non-null return by providing sensible defaults when no configuration has been set.

**Behavior:**

- If `configureProviders()` was called: returns the configured value
- If never configured: returns default configuration
- **Never returns null**: Always returns a valid `GlobalProviderConfig`

**Example:**

```typescript
import { getGlobalProviderConfig } from 'groundswell';

// Get default configuration
const config = getGlobalProviderConfig();
console.log(config.defaultProvider); // 'anthropic'

// Use for provider initialization
const providerOptions = config.providerDefaults?.[config.defaultProvider];

// After configuration
configureProviders({ defaultProvider: 'anthropic' });
const config2 = getGlobalProviderConfig();
console.log(config2.defaultProvider); // 'anthropic'
```

**See Also:**

- [configureProviders()](#configureproviders)
- [resolveProviderConfig()](#resolveproviderconfig)
- [GlobalProviderConfig](#globalproviderconfig)

---

#### resolveProviderConfig()

Resolve provider configuration with cascade priority.

**Type Signature:**

```typescript
function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions }
```

**Parameters:**

- `globalConfig`: `GlobalProviderConfig` - Global provider configuration from configureProviders()
- `agentProvider`: `ProviderId` (optional) - Agent-level provider override
- `agentOptions`: `ProviderOptions` (optional) - Agent-level options override
- `promptProvider`: `ProviderId` (optional) - Prompt-level provider override
- `promptOptions`: `ProviderOptions` (optional) - Prompt-level options override

**Returns:** `{ provider: ProviderId; options: ProviderOptions }` - Resolved provider and merged options

**Description:**
Implements the PRD 7.7 configuration cascade with nullish coalescing for provider resolution and object spread for options merge.

**Provider Resolution Priority (highest to lowest):**

1. Prompt-level provider override
2. Agent-level provider override
3. Global default provider

**Options Merge Priority (highest to lowest):**

1. Prompt-level options (override everything)
2. Agent-level options (override global defaults)
3. Global provider-specific defaults (base layer)

**Immutability:**
Creates a new options object and does not mutate any input parameters.

**Example:**

```typescript
import { resolveProviderConfig, getGlobalProviderConfig } from 'groundswell';

// Setup global config
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000, apiKey: 'sk-global' }
  }
});

// Agent configured with custom timeout
const agentProvider = 'anthropic';
const agentOptions = { timeout: 10000 };

// Prompt with custom temperature
const promptProvider = 'anthropic';
const promptOptions = { temperature: 0.5 };

const global = getGlobalProviderConfig();
const { provider, options } = resolveProviderConfig(
  global,
  agentProvider,
  agentOptions,
  promptProvider,
  promptOptions
);

console.log(provider); // 'anthropic' (prompt wins)
console.log(options);
// { timeout: 30000, apiKey: 'sk-global', temperature: 0.5 }
// timeout from anthropic global defaults (agent's timeout was overridden)
// apiKey from anthropic global defaults
// temperature from prompt options
```

**See Also:**

- [configureProviders()](#configureproviders)
- [getGlobalProviderConfig()](#getglobalproviderconfig)
- [ProviderOptions](#provideroptions)
- [Configuration Cascade](#configuration-cascade)

---

### Model Specification Functions

#### parseModelSpec()

Parse a model specification string into a ModelSpec object.

**Type Signature:**

```typescript
function parseModelSpec(
  model: string,
  defaultProvider?: ProviderId
): ModelSpec
```

**Parameters:**

- `model`: `string` - Model specification string to parse
- `defaultProvider`: `ProviderId` (optional) - Default provider to use when none specified (default: 'anthropic')

**Returns:** `ModelSpec` - Parsed ModelSpec object with provider, model, and raw string

**Throws:**

- `Error` - When model specification is empty or whitespace-only
- `Error` - When provider is invalid (not 'anthropic')
- `Error` - When provider or model parts are empty

**Description:**
Parses model specification strings in two formats:

**Qualified Format (provider/model):**
Explicit provider specification with "/" separator.

- Input: `"anthropic/claude-3-5-sonnet"`
- Output: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`

**Plain Format (model only):**
Uses default provider when no provider specified.

- Input: `"claude-sonnet-4"` with defaultProvider: `'anthropic'`
- Output: `{ provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }`

**Validation Rules:**

1. Input cannot be empty or whitespace-only
2. Provider must be one of: `'anthropic'`
3. Model name cannot be empty after provider split
4. Only the first slash is considered the provider/model separator
5. Input is trimmed before parsing, original preserved in `raw` field

**Example:**

```typescript
import { parseModelSpec } from 'groundswell';

// Qualified format with explicit provider
const spec1 = parseModelSpec('anthropic/claude-3-5-sonnet');
// Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }

// Qualified format with anthropic
const spec2 = parseModelSpec('anthropic/claude-opus-4-20250514');
// Returns: { provider: 'anthropic', model: 'claude-opus-4-20250514', raw: 'anthropic/claude-opus-4-20250514' }

// Plain format with explicit default provider
const spec3 = parseModelSpec('claude-sonnet-4', 'anthropic');
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

// Plain format with default provider (anthropic)
const spec4 = parseModelSpec('claude-sonnet-4');
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

// Error case: invalid provider
try {
  parseModelSpec('invalid/model');
} catch (error) {
  console.error((error as Error).message);
  // "Invalid provider: "invalid". Supported providers: "anthropic""
}
```

**See Also:**

- [ModelSpec](#modelspec)
- [formatModelForProvider()](#formatmodelforprovider)
- [Model Specification](#model-specification)

---

#### formatModelForProvider()

Format a ModelSpec for a specific target provider.

**Type Signature:**

```typescript
function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string
```

**Parameters:**

- `spec`: `ModelSpec` - ModelSpec from parseModelSpec() or Provider.normalizeModel()
- `targetProvider`: `ProviderId` - The provider to format the model for

**Returns:** `string` - Formatted model string for target provider (model name only)

**Throws:**

- `Error` - When providers differ with message: "Cannot translate {source}/{model} to {target} provider. Cross-provider model translation is not supported."

**Description:**

**Same Provider (Pass-Through):**
When `spec.provider` matches `targetProvider`, returns the model name only.

**Different Providers (Error):**
When providers differ, throws an error. Cross-provider model translation is not supported in the MVP.

**Use Cases:**

1. Model Validation: Validate that a model spec is compatible with a target provider
2. API Preparation: Format model names for provider-specific API requests
3. Configuration: Prepare model strings for provider initialization

**Example:**

```typescript
import { formatModelForProvider, parseModelSpec } from 'groundswell';

// Same provider: pass-through
const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
const model = formatModelForProvider(spec, 'anthropic');
console.log(model); // "claude-3-5-sonnet"

// Different provider: error (with single provider, this case doesn't apply)
// Note: With only 'anthropic' provider, cross-provider translation is not applicable

// Use with Provider.normalizeModel()
const provider = new AnthropicProvider();
const spec = provider.normalizeModel('claude-opus-4');
const model = formatModelForProvider(spec, 'anthropic');
console.log(model); // "claude-opus-4"
```

**See Also:**

- [parseModelSpec()](#parsemodelspec)
- [ModelSpec](#modelspec)
- [ProviderId](#providerid)

---

### ProviderRegistry Class

Singleton registry for managing provider instances throughout the application lifecycle.

**Type Signature:**

```typescript
class ProviderRegistry {
  static getInstance(): ProviderRegistry;

  register(provider: Provider): void;
  get(id: ProviderId): Provider | undefined;
  has(id: ProviderId): boolean;

  initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void>;
  initializeAll(config: GlobalProviderConfig): Promise<BatchInitResult>;

  getStatus(id: ProviderId): InitializationStatus;
  isReady(id: ProviderId): boolean;
  getAllStatuses(): Map<ProviderId, ProviderInitState>;

  terminateAll(): Promise<void>;

  // Testing utilities (internal use only)
  static _resetForTesting(): void;
  _resetInitStateForTesting(): void;
}
```

**Description:**
Maintains a single instance of itself and stores provider instances in a Map for efficient lookup by ProviderId. Uses private constructor with static getInstance() for singleton pattern.

**Example:**

```typescript
import { ProviderRegistry } from 'groundswell';
import { AnthropicProvider } from 'groundswell';

// Get registry instance
const registry = ProviderRegistry.getInstance();

// Register provider
registry.register(new AnthropicProvider());

// Retrieve provider
const anthropic = registry.get('anthropic');
if (anthropic) {
  await anthropic.initialize();
}
```

---

#### getInstance()

Get the singleton ProviderRegistry instance.

**Type Signature:**

```typescript
static getInstance(): ProviderRegistry
```

**Returns:** `ProviderRegistry` - The singleton ProviderRegistry instance

**Description:**
Creates the instance on first call (lazy initialization). Returns the same instance on subsequent calls.

**Example:**

```typescript
const registry1 = ProviderRegistry.getInstance();
const registry2 = ProviderRegistry.getInstance();
console.log(registry1 === registry2); // true
```

**See Also:**

- [Provider Registry](#provider-registry)

---

#### register()

Register a provider instance.

**Type Signature:**

```typescript
register(provider: Provider): void
```

**Parameters:**

- `provider`: `Provider` - The provider instance to register

**Throws:**

- `Error` - If a provider with the same id is already registered

**Description:**
Stores the provider in the registry using its id as the key.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
const anthropic = new AnthropicProvider();
registry.register(anthropic);
```

**See Also:**

- [get()](#getid)
- [has()](#hasid)

---

#### get()

Get a registered provider by id.

**Type Signature:**

```typescript
get(id: ProviderId): Provider | undefined
```

**Parameters:**

- `id`: `ProviderId` - The provider id to look up

**Returns:** `Provider | undefined` - The provider instance, or undefined if not registered

**Description:**
Returns the provider instance if registered, otherwise returns undefined. Does NOT throw for missing providers.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
const anthropic = registry.get('anthropic');
if (anthropic) {
  console.log('Provider found:', anthropic.id);
}
```

**See Also:**

- [register()](#registerprovider)
- [has()](#hasid)

---

#### has()

Check if a provider is registered.

**Type Signature:**

```typescript
has(id: ProviderId): boolean
```

**Parameters:**

- `id`: `ProviderId` - The provider id to check

**Returns:** `boolean` - true if the provider is registered, false otherwise

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
if (registry.has('anthropic')) {
  console.log('Anthropic provider is available');
}
```

**See Also:**

- [register()](#registerprovider)
- [get()](#getid)

---

#### initializeProvider()

Initialize a single provider with promise caching.

**Type Signature:**

```typescript
initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void>
```

**Parameters:**

- `id`: `ProviderId` - The provider id to initialize
- `options`: `ProviderOptions` (optional) - Configuration options for initialization

**Returns:** `Promise<void>` - Resolves when initialization completes

**Throws:**

- `Error` - If provider is not registered
- `Error` - If provider initialization fails

**Description:**
Initializes a provider with the given options. Multiple concurrent calls to initialize the same provider will share the same promise (no duplicate initialization). Already initialized providers return immediately.

**Promise Caching:**
The initialization promise is cached in the provider's state. Concurrent calls to initialize the same provider will await the same promise.

**State Transitions:**

- UNINITIALIZED → INITIALIZING → INITIALIZED (success)
- UNINITIALIZED → INITIALIZING → FAILED (error)

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
await registry.initializeProvider('anthropic', { apiKey: 'sk-...' });
console.log(registry.isReady('anthropic')); // true

// Concurrent calls share the same promise
const promise1 = registry.initializeProvider('anthropic');
const promise2 = registry.initializeProvider('anthropic');
await Promise.all([promise1, promise2]);
// Only one initialization actually occurs
```

**See Also:**

- [initializeAll()](#initializeallconfig)
- [getStatus()](#getstatusid)
- [isReady()](#isreadyid)

---

#### initializeAll()

Initialize all registered providers in parallel.

**Type Signature:**

```typescript
initializeAll(config: GlobalProviderConfig): Promise<BatchInitResult>
```

**Parameters:**

- `config`: `GlobalProviderConfig` - Global provider configuration with provider defaults

**Returns:** `Promise<BatchInitResult>` - Promise resolving to success/failure lists

**Description:**
Uses Promise.allSettled to allow partial success - if one provider fails, others continue initialization. Errors are aggregated in the return value. Provider options are resolved from config.providerDefaults[providerId].

**Parallel Initialization:**
All providers initialize concurrently for faster startup. The method waits for all initialization attempts to complete before returning.

**Error Aggregation:**
This method never throws - all errors are collected in the returned BatchInitResult.failed array.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
const config = getGlobalProviderConfig();
const result = await registry.initializeAll(config);

console.log(`Initialized: ${result.success.join(', ')}`);
if (result.failed.length > 0) {
  console.error(`Failed: ${result.failed.map(f => f.providerId).join(', ')}`);
  for (const failure of result.failed) {
    console.error(`  ${failure.providerId}: ${failure.error.message}`);
  }
}
```

**See Also:**

- [initializeProvider()](#initializeproviderid-options)
- [BatchInitResult](#batchinitresult)

---

#### getStatus()

Get initialization status for a provider.

**Type Signature:**

```typescript
getStatus(id: ProviderId): InitializationStatus
```

**Parameters:**

- `id`: `ProviderId` - The provider id to check

**Returns:** `InitializationStatus` - Current initialization status

**Description:**
Returns the current initialization status for the given provider ID. Unknown providers return UNINITIALIZED status.

**Possible Values:**

- `'uninitialized'`: Provider not yet initialized
- `'initializing'`: Currently initializing (in progress)
- `'initialized'`: Successfully initialized
- `'failed'`: Initialization failed

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
const status = registry.getStatus('anthropic');
console.log(status); // 'initialized' | 'initializing' | 'failed' | 'uninitialized'
```

**See Also:**

- [isReady()](#isreadyid)
- [getAllStatuses()](#getallstatuses)
- [InitializationStatus](#initializationstatus)

---

#### isReady()

Check if a provider is ready to use.

**Type Signature:**

```typescript
isReady(id: ProviderId): boolean
```

**Parameters:**

- `id`: `ProviderId` - The provider id to check

**Returns:** `boolean` - true if provider is initialized and ready, false otherwise

**Description:**
Returns true only if the provider has successfully initialized. Use this method to check provider readiness before use.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
if (registry.isReady('anthropic')) {
  const provider = registry.get('anthropic');
  // Use provider
}
```

**See Also:**

- [getStatus()](#getstatusid)
- [getAllStatuses()](#getallstatuses)

---

#### getAllStatuses()

Get all provider initialization states.

**Type Signature:**

```typescript
getAllStatuses(): Map<ProviderId, ProviderInitState>
```

**Returns:** `Map<ProviderId, ProviderInitState>` - Map of provider ID to initialization state

**Description:**
Returns a copy of the internal states Map for health checks, monitoring, and debugging. The returned Map is a shallow copy - modifications to it won't affect internal state.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();
const statuses = registry.getAllStatuses();

for (const [id, state] of statuses.entries()) {
  console.log(`${id}: ${state.status}`);
  if (state.error) {
    console.error(`  Error: ${state.error.message}`);
  }
}
```

**See Also:**

- [getStatus()](#getstatusid)
- [isReady()](#isreadyid)
- [ProviderInitState](#providerinitstate)

---

#### terminateAll()

Terminate all registered providers with error tolerance.

**Type Signature:**

```typescript
terminateAll(): Promise<void>
```

**Returns:** `Promise<void>` - Resolves when all termination attempts complete

**Description:**
Terminates all providers in parallel, ensuring each gets a chance to clean up resources even if some fail. Errors are logged but not thrown. After termination completes, clears the providers and states maps.

**Parallel Termination:**
All providers terminate concurrently using Promise.allSettled. This ensures fast shutdown while allowing partial success.

**Error Handling:**
If a provider's terminate() throws, the error is logged but other providers continue terminating. The method never throws.

**State Cleanup:**
After all termination attempts complete, the providers and states maps are cleared. This releases references and allows re-initialization.

**Example:**

```typescript
const registry = ProviderRegistry.getInstance();

// Register and initialize provider
registry.register(anthropicProvider);
await registry.initializeAll(config);

// Later, during shutdown
await registry.terminateAll();

// All providers terminated, maps cleared
console.log(registry.has('anthropic')); // false
```

**See Also:**

- [Provider Lifecycle](#provider-lifecycle)

---

#### Related Types

##### InitializationStatus

Provider initialization status enum defining all possible initialization states.

**Type Signature:**

```typescript
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed',
}
```

**Values:**

- `UNINITIALIZED`: Provider not yet initialized
- `INITIALIZING`: Currently initializing (in progress)
- `INITIALIZED`: Successfully initialized
- `FAILED`: Initialization failed

**See Also:**

- [getStatus()](#getstatusid)
- [isReady()](#isreadyid)

---

##### ProviderInitState

Provider initialization state with metadata.

**Type Signature:**

```typescript
interface ProviderInitState {
  status: InitializationStatus;
  initPromise?: Promise<void>;
  error?: Error;
  initializedAt?: number;
}
```

**Properties:**

- `status`: `InitializationStatus` - Current initialization status
- `initPromise`: `Promise<void>` (optional) - Cached initialization promise (prevents duplicate init)
- `error`: `Error` (optional) - Error from failed initialization
- `initializedAt`: `number` (optional) - Timestamp when initialization completed

**See Also:**

- [getAllStatuses()](#getallstatuses)

---

##### BatchInitResult

Batch initialization result with aggregated status.

**Type Signature:**

```typescript
interface BatchInitResult {
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}
```

**Properties:**

- `success`: `ProviderId[]` - Successfully initialized provider IDs
- `failed`: `Array<{ providerId: ProviderId; error: Error }>` - Failed providers with errors

**See Also:**

- [initializeAll()](#initializeallconfig)
