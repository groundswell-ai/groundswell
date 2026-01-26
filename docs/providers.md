# Providers

Groundswell supports multiple Agent SDK providers through a unified abstraction layer. Providers encapsulate SDK-specific details while presenting a consistent API for LLM execution, tool delegation, and session management.

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
- [Tools & MCP](#tools--mcp)
- [Hooks](#hooks)
- [Skills](#skills)
- [Streaming](#streaming)
- [API Reference](#api-reference)

## Basic Usage

```typescript
import { configureProviders, ProviderRegistry } from 'groundswell';
import { AnthropicProvider, OpenCodeProvider } from 'groundswell';

// 1. Configure global defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    opencode: { endpoint: 'http://localhost:4096' }
  }
});

// 2. Register providers
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());

// 3. Initialize all providers
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
| `opencode` | OpenCode SDK | `@opencode-ai/sdk` | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |

**Capability Notes:**

- **Anthropic MCP**: Via `createSdkMcpServer` integration with Groundswell's MCPHandler
- **OpenCode MCP**: Not supported - operates in LLM-only mode (tools executed server-side)
- **Anthropic Sessions**: Implemented via abstraction layer (in-memory Map), not native to SDK
- **OpenCode Sessions**: Native session-based state management
- **Extended Thinking**: Both providers support reasoning tokens for extended thinking

### ProviderId

```typescript
// From src/types/providers.ts
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId = 'anthropic' | 'opencode';
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
│           Provider Implementations                           │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  AnthropicProvider  │  │  OpenCodeProvider   │          │
│  │  - SDK: claude-     │  │  - SDK: opencode    │          │
│  │    agent-sdk        │  │    -ai/sdk          │          │
│  │  - MCP integration  │  │  - LLM-only mode    │          │
│  │  - Session abstr.   │  │  - Native sessions  │          │
│  └─────────────────────┘  └─────────────────────┘          │
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
    },
    opencode: {
      endpoint: 'http://localhost:4096',
      timeout: 60000
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
  provider: 'opencode',           // Override global default
  providerOptions: {
    endpoint: 'http://localhost:8080',
    timeout: 120000
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
│  provider: 'opencode'               │
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
    anthropic: { apiKey: 'sk-global', timeout: 30000 },
    opencode: { endpoint: 'http://localhost:4096', timeout: 60000 }
  }
});

// 2. Agent config (inherits from global)
const agent = new Agent({
  provider: 'opencode',           // Override global default
  providerOptions: {
    timeout: 120000               // Override global timeout for opencode
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
//   - timeout from anthropic global defaults (agent's timeout was for opencode)
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

// Register providers
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());

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

See `src/providers/provider-registry.ts` for complete implementation.

## Model Specification

Model strings support two formats: plain (uses default provider) and qualified (explicit provider).

### Format Types

| Format | Example | Provider | Model |
|--------|---------|----------|-------|
| Plain | `claude-sonnet-4-20250514` | (default) | `claude-sonnet-4-20250514` |
| Qualified | `anthropic/claude-opus-4-20250514` | `anthropic` | `claude-opus-4-20250514` |
| OpenCode | `openai/gpt-4` | `openai` | `gpt-4` |

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

// Error: wrong provider
provider.normalizeModel('opencode/gpt-4');
// Throws: "Cannot normalize opencode/gpt-4 with AnthropicProvider..."
```

**OpenCodeProvider:**

```typescript
const provider = new OpenCodeProvider();

// Plain format (uses 'opencode' as default)
provider.normalizeModel('gpt-4');
// Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }

// Multi-provider support (75+ providers)
provider.normalizeModel('openai/gpt-4');
// Returns: { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }

provider.normalizeModel('anthropic/claude-3-5-sonnet-20250514');
// Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet-20250514', raw: '...' }
```

**GOTCHA:** OpenCode accepts any provider prefix (multi-provider gateway), while AnthropicProvider only accepts `anthropic`.

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
- **OpenCodeProvider**: Closes server process, clears client/server references
- Both are idempotent and never throw (errors logged only)

See `src/providers/anthropic-provider.ts:147-229` and `src/providers/opencode-provider.ts:259-299`.

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

- Sessions stored in `Map<string, SessionState>` (see `src/providers/anthropic-provider.ts:145`)
- Each session tracks `history: SDKUserMessage[]` and `lastResult: SDKResultMessage`
- For continuation: `continue: true` + `streamInput()` with history
- **CRITICAL**: Anthropic SDK has no native sessions - this is a session abstraction layer provided by Groundswell

### OpenCode Sessions (Native)

```typescript
const provider = new OpenCodeProvider();
await provider.initialize();

// Sessions are server-side (managed by OpenCode SDK)

// Create or reuse session
const result = await provider.execute(
  {
    prompt: 'My name is Bob',
    options: { sessionId: 'session-456' }  // Auto-created if not exists
  },
  toolExecutor
);

// Continue session
await provider.execute(
  {
    prompt: 'What is my name?',
    options: { sessionId: 'session-456' }  // Reuse session
  },
  toolExecutor
);
// Response: "Your name is Bob."
```

**Implementation Details:**

- Sessions are server-side (managed by OpenCode SDK)
- `client.session.create()` creates new sessions
- Native session state management via SDK

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

### OpenCode LLM-Only Mode

**CRITICAL LIMITATION:** OpenCode executes tools server-side with no client-side delegation mechanism.

```typescript
/**
 * OpenCode provider implementation (LLM-Only Mode)
 *
 * OpenCode executes tools server-side and does not support client-side
 * tool delegation. This provider operates in LLM-only mode:
 *
 * - ✅ Multi-provider LLM access (75+ providers)
 * - ✅ Session-based state management
 * - ✅ Extended thinking support
 * - ✅ Streaming responses
 * - ✅ Skills via system prompt injection
 * - ❌ NO TOOL EXECUTION (tools disabled in execute())
 * - ❌ NO MCP INTEGRATION (managed by Groundswell's MCPHandler)
 * - ❌ NO LSP INTEGRATION (server-side only)
 */
```

```typescript
// OpenCodeProvider.registerMCPs() returns empty array
const tools = await opencodeProvider.registerMCPs(servers);
console.log(tools); // [] (LLM-only mode)
```

See `src/providers/opencode-provider.ts:786-822` for registerMCPs implementation.

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

See `src/providers/anthropic-provider.ts:716-743` for registerMCPs implementation.

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

| AgentHooks | ProviderHookEvents | Anthropic SDK | OpenCode SDK |
|------------|-------------------|--------------|--------------|
| `preToolUse` | `onToolStart` | ✓ PreToolUse | ✗ (server-side) |
| `postToolUse` | `onToolEnd` | ✓ PostToolUse | ✗ (server-side) |
| `sessionStart` | `onSessionStart` | ✓ SessionStart | Manual call |
| `sessionEnd` | `onSessionEnd` | ✓ SessionEnd | Manual call |
| (N/A) | `onStream` | N/A | ✓ SSE events |

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

See `src/providers/anthropic-provider.ts:853-950` for buildAgentSDKHooks implementation.

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

See `src/providers/anthropic-provider.ts:768-804` for loadSkills implementation.

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

See `src/providers/anthropic-provider.ts:473-676` for executeStreaming implementation (lazy SDK loading via dynamic import).

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
type ProviderId = 'anthropic' | 'opencode';
```

**Description:**
- `'anthropic'`: Anthropic Claude provider via `@anthropic-ai/claude-agent-sdk`
- `'opencode'`: OpenCode multi-provider gateway via `@opencode-ai/sdk`

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
}
```

**Properties:**
- `endpoint`: `string` (optional) - Override the default API endpoint for the provider
- `apiKey`: `string` (optional) - API key for authentication (if not set via environment variable)
- `sessionId`: `string` (optional) - Session identifier for session-based providers
- `timeout`: `number` (optional) - Request timeout in milliseconds
- `headers`: `Record<string, string>` (optional) - Custom HTTP headers to include in requests

**Example:**
```typescript
import type { ProviderOptions } from 'groundswell';

const options: ProviderOptions = {
  apiKey: 'sk-ant-...',
  endpoint: 'https://api.anthropic.com',
  timeout: 30000,
  headers: {
    'X-Custom-Header': 'custom-value'
  }
};

await provider.initialize(options);
```

**See Also:**
- [GlobalProviderConfig](#globalproviderconfig)
- [configureProviders()](#configureproviders)
- [Configuration Cascade](#configuration-cascade)

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
parseModelSpec('opencode/gpt-4')
// Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
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
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    opencode: { endpoint: 'http://localhost:8080' }
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
- `Error` - If `defaultProvider` is not a valid ProviderId ('anthropic' | 'opencode')
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
  defaultProvider: 'opencode',
  providerDefaults: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000
    },
    opencode: {
      endpoint: 'http://localhost:8080',
      timeout: 60000
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
configureProviders({ defaultProvider: 'opencode' });
const config2 = getGlobalProviderConfig();
console.log(config2.defaultProvider); // 'opencode'
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
    anthropic: { timeout: 30000, apiKey: 'sk-global' },
    opencode: { endpoint: 'http://localhost:8080' }
  }
});

// Agent configured with opencode override
const agentProvider = 'opencode';
const agentOptions = { timeout: 10000 };

// Prompt with anthropic override
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
// timeout from anthropic global defaults (agent's timeout was for opencode)
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
- `Error` - When provider is invalid (not 'anthropic' or 'opencode')
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
2. Provider must be one of: `'anthropic'`, `'opencode'`
3. Model name cannot be empty after provider split
4. Only the first slash is considered the provider/model separator
5. Input is trimmed before parsing, original preserved in `raw` field

**Example:**
```typescript
import { parseModelSpec } from 'groundswell';

// Qualified format with explicit provider
const spec1 = parseModelSpec('anthropic/claude-3-5-sonnet');
// Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }

// Qualified format with opencode
const spec2 = parseModelSpec('opencode/gpt-4');
// Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }

// Plain format with explicit default provider
const spec3 = parseModelSpec('gpt-4', 'opencode');
// Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }

// Plain format with default provider (anthropic)
const spec4 = parseModelSpec('claude-sonnet-4');
// Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }

// Error case: invalid provider
try {
  parseModelSpec('invalid/model');
} catch (error) {
  console.error((error as Error).message);
  // "Invalid provider: "invalid". Supported providers: "anthropic", "opencode""
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

// Different provider: error
const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
try {
  formatModelForProvider(spec, 'opencode');
} catch (error) {
  console.error((error as Error).message);
  // "Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."
}

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
import { AnthropicProvider, OpenCodeProvider } from 'groundswell';

// Get registry instance
const registry = ProviderRegistry.getInstance();

// Register providers
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());

// Retrieve providers
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

// Register and initialize providers
registry.register(anthropicProvider);
registry.register(opencodeProvider);
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
