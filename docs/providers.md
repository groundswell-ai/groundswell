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

### Provider Interface

```typescript
/**
 * Provider interface for LLM backend abstraction
 */
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

### ProviderRegistry Class

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

  // Testing utilities
  static _resetForTesting(): void;
  _resetInitStateForTesting(): void;
}
```

### Configuration Functions

```typescript
// Configure global provider settings
function configureProviders(config: GlobalProviderConfig): void;

// Get current global configuration
function getGlobalProviderConfig(): GlobalProviderConfig;

// Resolve provider with cascade
function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions };
```

### Type Definitions

```typescript
// Provider identifier
export type ProviderId = 'anthropic' | 'opencode';

// Provider capabilities
export interface ProviderCapabilities {
  mcp: boolean;
  skills: boolean;
  lsp: boolean;
  streaming: boolean;
  sessions: boolean;
  extendedThinking: boolean;
}

// Provider options
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Global configuration
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

// Model specification
export interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}

// Tool execution
export interface ToolExecutionRequest {
  name: string;
  input: unknown;
}

export interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}

export type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;

// Provider request
export interface ProviderRequest {
  prompt: string;
  options: ProviderExecutionOptions;
}

export interface ProviderExecutionOptions {
  model?: string;
  systemPrompt?: string;
  tools?: Tool[];
  hooks?: ProviderHookEvents;
  sessionId?: string;
  streaming?: boolean;
}

// Provider hooks
export interface ProviderHookEvents {
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

// Initialization status
export enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed'
}

// Batch initialization result
interface BatchInitResult {
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}
```

See [examples/08-sdk-features.ts](../examples/examples/08-sdk-features.ts) for tools and hooks usage.
