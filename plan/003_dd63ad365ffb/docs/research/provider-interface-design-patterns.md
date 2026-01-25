# Provider Interface Design Patterns Research

## Research Date
January 25, 2026

## Overview

This document compiles research findings on Provider interface design patterns for multi-provider LLM SDK systems. The research analyzes popular LLM SDKs, integration patterns, and best practices for building provider abstractions that support multiple LLM backends.

**Research Scope:**
1. How popular LLM SDKs design their provider interfaces
2. Common patterns for provider abstraction with lifecycle methods
3. Readonly properties and capabilities interfaces
4. MCP (Model Context Protocol) integration patterns
5. Skill loading patterns in provider interfaces
6. Model normalization patterns

---

## Table of Contents

1. [Analyzed SDKs and Libraries](#analyzed-sdks-and-libraries)
2. [Provider Interface Core Patterns](#provider-interface-core-patterns)
3. [Lifecycle Methods: initialize(), terminate(), execute()](#lifecycle-methods-initialize-terminate-execute)
4. [Readonly Properties and Capabilities](#readonly-properties-and-capabilities)
5. [MCP Integration Patterns](#mcp-integration-patterns)
6. [Skill Loading Patterns](#skill-loading-patterns)
7. [Model Normalization Patterns](#model-normalization-patterns)
8. [Code Examples from Real SDKs](#code-examples-from-real-sdks)
9. [Best Practices Summary](#best-practices-summary)
10. [Recommended Groundswell Patterns](#recommended-groundswell-patterns)

---

## Analyzed SDKs and Libraries

### 1. Claude Agent SDK (Anthropic)

**Location:** `/home/dustin/projects/groundswell/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.1.77_zod@3.25.76/node_modules/@anthropic-ai/claude-agent-sdk/`

**Version:** 0.1.77

**Key Files Analyzed:**
- `entrypoints/agentSdkTypes.d.ts` - Main SDK types
- `entrypoints/sdk/runtimeTypes.d.ts` - Runtime types and interfaces
- `entrypoints/sdk/coreTypes.d.ts` - Core serializable types

**Key Patterns:**
- Session-based queries with `Query` interface extending `AsyncGenerator`
- MCP server configuration with multiple transport types
- Tool definition with Zod schema integration
- Hook callbacks for lifecycle events
- Permission management with `CanUseTool` callback

---

### 2. Groundswell Project (Internal Analysis)

**Location:** `/home/dustin/projects/groundswell/`

**Key Files Analyzed:**
- `src/types/providers.ts` - Provider type definitions
- `src/types/sdk-primitives.ts` - SDK primitive types
- `src/types/agent.ts` - Agent configuration types
- `plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md` - Implementation patterns

**Existing Patterns:**
- Union types for provider IDs (`'anthropic' | 'opencode'`)
- Boolean capability flags for feature detection
- Options interfaces with all optional properties
- Request/response wrapper patterns

---

### 3. Popular TypeScript Libraries (Pattern Analysis)

**Libraries Analyzed:**
- **execa** - Process execution library (comprehensive options patterns)
- **tinypool** - Worker thread pool (filled options variants)
- **tinybench** - Benchmark library (hierarchical options)
- **@vitest/runner** - Test runner (test options with modifiers)
- **cac** - CLI argument parser (builder pattern)

**Common Patterns Identified:**
- All optional properties with `?` modifier
- `readonly` modifier for immutability
- Intersection types (`&`) for composing options
- Separate `FilledOptions` variant for internal use
- Extensive JSDoc with `@default` tags

---

## Provider Interface Core Patterns

### Pattern 1: Interface-First Design

**Definition:** Define provider interfaces before implementation classes.

**Source:** Groundswell Implementation Patterns

```typescript
/**
 * Provider interface for LLM backends
 * Defines the contract all providers must implement
 */
export interface Provider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Provider capabilities (feature flags) */
  readonly capabilities: ProviderCapabilities;

  /** Initialize provider with optional configuration */
  initialize(options?: ProviderOptions): Promise<void>;

  /** Terminate provider and cleanup resources */
  terminate(): Promise<void>;

  /** Execute a prompt request */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;
}

// Then implement
export class AnthropicProvider implements Provider {
  readonly id = 'anthropic';
  readonly capabilities = { ... };

  async initialize(options?: ProviderOptions): Promise<void> {
    // Implementation
  }
}
```

**Benefits:**
- Clear contract for all providers
- Type safety through TypeScript
- Easy to add new providers
- Enforces consistency across implementations

---

### Pattern 2: Union Types for Provider Identification

**Definition:** Use string literal unions for provider IDs.

**Source:** Groundswell `src/types/providers.ts`

```typescript
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

// Usage
function getProvider(id: ProviderId): Provider {
  switch (id) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'opencode':
      return new OpenCodeProvider();
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = id;
      throw new Error(`Unknown provider: ${_exhaustive}`);
  }
}
```

**Benefits:**
- Type-safe provider IDs
- Autocomplete support
- Exhaustiveness checking in switch statements
- Preferred over enums for small sets (TypeScript best practice)

**Alternatives Considered:**
- ❌ **Enums**: Not recommended for small string sets
- ❌ **Strings**: Lose type safety
- ✅ **String literal unions**: Best practice

---

### Pattern 3: Boolean Capability Flags

**Definition:** Use boolean flags to indicate provider capabilities.

**Source:** Groundswell `src/types/providers.ts`

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

// Usage in provider
class AnthropicProvider implements Provider {
  readonly capabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,  // Not natively supported
    extendedThinking: false
  } satisfies ProviderCapabilities;
}

// Feature detection
function requiresMCP(provider: Provider): void {
  if (!provider.capabilities.mcp) {
    throw new Error('Provider does not support MCP');
  }
}
```

**Benefits:**
- Simple feature detection API
- Type-safe capability checks
- Easy to extend with new capabilities
- Clear at-a-glance provider features

**Design Decision: Static vs Dynamic Detection**

From Groundswell Architecture Decisions:

**Option A: Static Declaration** ✅ RECOMMENDED
```typescript
readonly capabilities = {
  mcp: true,
  skills: true
} satisfies ProviderCapabilities;
```

**Option B: Dynamic Detection**
```typescript
async detectCapabilities(): Promise<ProviderCapabilities> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  return {
    mcp: typeof sdk.createSdkMcpServer === 'function',
    skills: typeof sdk.loadSkills === 'function'
  };
}
```

**Recommendation:** Static declaration
- Capabilities are well-known for each SDK
- Simpler implementation
- No async initialization complexity
- Easy to update when SDK changes

---

## Lifecycle Methods: initialize(), terminate(), execute()

### Pattern: Async Lifecycle Methods

**Definition:** All provider lifecycle methods should be async.

**Source:** Groundswell PRD and Implementation Patterns

```typescript
export interface Provider {
  /**
   * Initialize provider with optional configuration
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   * await provider.initialize({ apiKey: 'sk-...' });
   * ```
   *
   * @param options - Optional provider configuration
   * @throws {ProviderError} If initialization fails
   * @returns Promise that resolves when initialized
   */
  initialize(options?: ProviderOptions): Promise<void>;

  /**
   * Terminate provider and cleanup resources
   *
   * Closes connections, releases resources, performs cleanup.
   * Should be called when provider is no longer needed.
   *
   * @returns Promise that resolves when terminated
   */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request
   *
   * @param request - The prompt and execution options
   * @param toolExecutor - Function to execute tool calls
   * @param hooks - Optional lifecycle hooks
   * @returns Promise resolving to provider result
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;
}
```

---

### Implementation Pattern: Anthropic Provider

**Source:** Groundswell Architecture Decisions

```typescript
class AnthropicProvider implements Provider {
  private sessions: Map<string, SessionState> = new Map();
  private initialized = false;

  readonly id = 'anthropic';
  readonly capabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,  // Requires session abstraction layer
    extendedThinking: false
  } satisfies ProviderCapabilities;

  async initialize(options?: ProviderOptions): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    // Initialize SDK client
    if (options?.apiKey) {
      this.client = new Anthropic({ apiKey: options.apiKey });
    }

    this.initialized = true;
  }

  async terminate(): Promise<void> {
    // Clear session state
    this.sessions.clear();

    // Close connections
    this.client = undefined;
    this.initialized = false;
  }

  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>> {
    if (!this.initialized) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    // Session handling
    if (request.sessionId) {
      return this.executeWithSession(request, toolExecutor, hooks);
    }

    // One-shot execution
    return this.executeOneShot(request, toolExecutor, hooks);
  }

  private async executeWithSession<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>> {
    const session = this.sessions.get(request.sessionId);

    if (!session) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }

    // Execute with session context
    // ...
  }
}
```

**Key Patterns:**
- Guard clauses for initialization state
- Session management with Map storage
- Separation of one-shot vs session execution
- Error handling with descriptive messages

---

### Pattern: Session Abstraction Layer

**Source:** Groundswell Architecture Decisions - Decision 2

**Context:** Anthropic SDK has stateless sessions (requires explicit `continue: true`). OpenCode SDK has native session management.

**Solution:** Implement session abstraction in Anthropic provider.

```typescript
class AnthropicProvider implements Provider {
  private sessions: Map<string, SessionState> = new Map();

  async execute(request: ProviderRequest): Promise<ProviderResult> {
    if (request.sessionId) {
      // Resume session using in-memory state
      return this.executeWithSession(request);
    }
    // One-shot execution
  }

  private async executeWithSession(
    request: ProviderRequest
  ): Promise<ProviderResult> {
    const session = this.sessions.get(request.sessionId);

    if (!session) {
      // Create new session
      const newSession = {
        id: request.sessionId,
        messages: [],
        createdAt: Date.now()
      };
      this.sessions.set(request.sessionId, newSession);
      return this.executeWithSession(request);
    }

    // Continue existing session
    // Anthropic requires continue: true for multi-turn
    const result = await this.client.messages.create({
      messages: session.messages,
      continue: true  // Anthropic-specific flag
    });

    // Update session state
    session.messages.push(...result.messages);

    return result;
  }
}
```

**Benefits:**
- Consistent API across providers
- Users don't need to worry about provider differences
- Cleaner user experience
- Aligns with PRD goal of provider parity

---

## Readonly Properties and Capabilities

### Pattern: Readonly Interface Properties

**Definition:** Mark immutable properties as `readonly`.

**Source:** Groundswell Implementation Patterns

```typescript
// GOOD: Immutable configuration
export interface ProviderConfig {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  readonly options?: ProviderOptions;
}

// BAD: Mutable configuration (allows accidental mutation)
export interface ProviderConfig {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  options?: ProviderOptions;
}
```

**Benefits:**
- Prevents accidental mutation
- Clear communication of intent
- TypeScript compile-time enforcement
- Enables certain optimizations

---

### Pattern: Class Readonly Properties

**Definition:** Use `readonly` modifier for class properties.

```typescript
export class AnthropicProvider implements Provider {
  // Readonly instance properties
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,
    extendedThinking: false
  };

  // Private mutable state
  private client?: Anthropic;
  private sessions: Map<string, SessionState> = new Map();
  private initialized = false;
}
```

**Best Practices:**
- ✅ Use `readonly` for immutable metadata (id, capabilities)
- ✅ Use `private` for internal mutable state
- ❌ Don't use `readonly` for properties that change during execution
- ❌ Don't use `readonly` for configuration that might be updated

---

### Pattern: satisfies Operator for Type Safety

**Definition:** Use `satisfies` operator for type-safe object literals.

**Source:** TypeScript 4.9+ best practices

```typescript
// GOOD: Type-safe with satisfies
readonly capabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: false,
  extendedThinking: false
} satisfies ProviderCapabilities;

// Also GOOD: Explicit type annotation
readonly capabilities: ProviderCapabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: false,
  extendedThinking: false
};

// Difference: satisfies preserves narrower literal types
// Type annotation widens to interface type
```

**When to use `satisfies`:**
- Object literals that should match an interface
- When you want to preserve literal types
- For better IDE autocomplete

**When to use explicit annotation:**
- When you need the widened type
- For clarity in complex scenarios
- When the value might be reassigned

---

## MCP Integration Patterns

### Pattern 1: MCP Server Configuration Union

**Source:** Claude Agent SDK `runtimeTypes.d.ts`

```typescript
/**
 * MCP server configuration types
 * Union of all supported transport types
 */
export type McpServerConfig =
  | McpStdioServerConfig      // stdio transport
  | McpSSEServerConfig        // Server-Sent Events
  | McpHttpServerConfig       // HTTP transport
  | McpSdkServerConfigWithInstance;  // In-process SDK server

/**
 * MCP stdio server configuration
 */
export interface McpStdioServerConfig {
  /** Server name */
  name: string;
  /** Transport type discriminator */
  transport: 'stdio';
  /** Command to run */
  command: string;
  /** Arguments for command */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * MCP SDK server with instance
 * Not serializable - contains live McpServer object
 */
export type McpSdkServerConfigWithInstance = McpSdkServerConfig & {
  instance: McpServer;
};
```

**Key Patterns:**
- Discriminated union for transport types
- Non-serializable types marked in documentation
- Clear separation of transport types
- Type-safe configuration

---

### Pattern 2: Dynamic MCP Server Management

**Source:** Claude Agent SDK `Query` interface

```typescript
export interface Query extends AsyncGenerator<SDKMessage, void> {
  /**
   * Dynamically set the MCP servers for this session.
   * This replaces the current set of dynamically-added MCP servers.
   *
   * Supports both process-based servers (stdio, sse, http) and SDK servers.
   *
   * @param servers - Record of server name to configuration
   * @returns Information about added, removed, and connection errors
   */
  setMcpServers(
    servers: Record<string, McpServerConfig>
  ): Promise<McpSetServersResult>;

  /**
   * Get the current status of all configured MCP servers.
   *
   * @returns Array of MCP server statuses (connected, failed, needs-auth, pending)
   */
  mcpServerStatus(): Promise<McpServerStatus[]>;
}
```

**Key Patterns:**
- Runtime server configuration
- Status monitoring capabilities
- Support for multiple transports
- Clear error reporting

---

### Pattern 3: MCP Tool Definition

**Source:** Claude Agent SDK `runtimeTypes.d.ts`

```typescript
/**
 * MCP tool definition for SDK servers
 * Contains a handler function, so not serializable
 * Supports both Zod 3 and Zod 4 schemas
 */
export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> = {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema (Zod) */
  inputSchema: Schema;
  /** Tool handler function */
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>;
};

/**
 * Create an MCP server with tools
 *
 * @example
 * ```ts
 * const server = createSdkMcpServer({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [
 *     tool('myTool', 'Does something', {
 *       input: z.object({ arg1: z.string() })
 *     }, async (args) => ({ content: [{ type: 'text', text: 'Result' }] }))
 *   ]
 * });
 * ```
 */
export declare function createSdkMcpServer(
  _options: CreateSdkMcpServerOptions
): McpSdkServerConfigWithInstance;
```

**Key Patterns:**
- Type-safe tool definitions with Zod
- Handler functions for tool execution
- Schema inference from Zod types
- Factory function for server creation

---

### Groundswell MCP Integration Pattern

**Source:** Groundswell `src/types/sdk-primitives.ts`

```typescript
/**
 * MCP Server configuration
 * Supports stdio and inprocess transports
 */
export interface MCPServer {
  /** Server name for identification */
  name: string;
  /** Server version (optional) */
  version?: string;
  /** Transport type */
  transport: 'stdio' | 'inprocess';
  /** Command to run for stdio transport */
  command?: string;
  /** Arguments for the command */
  args?: string[];
  /** Tools provided by this MCP server */
  tools?: Tool[];
  /** Environment variables for the MCP process */
  env?: Record<string, string>;
}
```

**Usage in Provider:**

```typescript
class AnthropicProvider implements Provider {
  async execute(
    request: ProviderRequest,
    toolExecutor: ToolExecutor
  ): Promise<ProviderResult> {
    // Configure MCP servers from request
    if (request.options.mcps) {
      const mcpConfigs = request.options.mcps.map(mcp => ({
        name: mcp.name,
        transport: mcp.transport,
        command: mcp.command,
        args: mcp.args,
        env: mcp.env
      }));

      // Pass to SDK query
      const query = this.createQuery({
        mcpServers: mcpConfigs
      });
    }
  }
}
```

---

## Skill Loading Patterns

### Pattern 1: Skill Definition Interface

**Source:** Groundswell `src/types/sdk-primitives.ts`

```typescript
/**
 * Skill definition
 * Skills are loaded from directories containing SKILL.md
 */
export interface Skill {
  /** Skill name for identification */
  name: string;
  /** Path to skill directory containing SKILL.md */
  path: string;
}
```

**Design Rationale:**
- Simple interface for skill loading
- File-system based (directory with SKILL.md)
- Compatible with Claude Agent SDK conventions
- Easy to extend with metadata

---

### Pattern 2: Skill Loading in SDK Options

**Source:** Claude Agent SDK `runtimeTypes.d.ts`

```typescript
export type Options = {
  /**
   * Skills to load
   *
   * @example
   * ```ts
   * skills: [
   *   { type: 'local', path: './my-skill' },
   *   { type: 'local', path: '/absolute/path/to/skill' }
   * ]
   * ```
   */
  skills?: Array<{
    type: 'local';
    path: string;
  }>;
};
```

**Key Patterns:**
- Discriminated union for skill types
- Local file system paths
- Array for multiple skills
- Type-safe configuration

---

### Pattern 3: Skill Loading Integration

**Recommended Groundswell Pattern:**

```typescript
class AnthropicProvider implements Provider {
  async execute(
    request: ProviderRequest,
    toolExecutor: ToolExecutor
  ): Promise<ProviderResult> {
    // Configure skills from request
    if (request.options.skills) {
      const skillConfigs = request.options.skills.map(skill => ({
        type: 'local' as const,
        path: skill.path
      }));

      // Pass to SDK query
      const query = this.createQuery({
        skills: skillConfigs
      });
    }
  }

  /**
   * Check if provider supports skills
   */
  supportsSkills(): boolean {
    return this.capabilities.skills;
  }
}
```

**Benefits:**
- Capability checking before loading
- Type-safe skill configuration
- Clear error messages if not supported
- Consistent with MCP pattern

---

## Model Normalization Patterns

### Pattern 1: Model Specification Interface

**Source:** Groundswell Architecture Decisions

```typescript
/**
 * Model specification for provider
 * Normalizes model names across providers
 */
export interface ModelSpec {
  /** Display name for the model */
  displayName: string;
  /** Internal model identifier */
  modelId: string;
  /** Provider that hosts this model */
  provider: ProviderId;
  /** Maximum tokens for this model */
  maxTokens?: number;
  /** Supports streaming */
  supportsStreaming?: boolean;
  /** Supports function calling */
  supportsTools?: boolean;
}

/**
 * Model registry
 * Maps normalized names to provider-specific models
 */
export const MODELS: Record<string, ModelSpec> = {
  'claude-sonnet-4': {
    displayName: 'Claude Sonnet 4',
    modelId: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    maxTokens: 200000,
    supportsStreaming: true,
    supportsTools: true
  },
  'gpt-4': {
    displayName: 'GPT-4',
    modelId: 'gpt-4-turbo-preview',
    provider: 'opencode',
    maxTokens: 128000,
    supportsStreaming: true,
    supportsTools: true
  }
};
```

---

### Pattern 2: Model Normalization Method

**Recommended Pattern:**

```typescript
export interface Provider {
  /**
   * Normalize model name for this provider
   * Converts generic model names to provider-specific identifiers
   *
   * @example
   * ```ts
   * provider.normalizeModel('claude-sonnet-4')
   * // Returns: 'claude-sonnet-4-20250514'
   * ```
   *
   * @param model - Generic or provider-specific model name
   * @returns Provider-specific model identifier
   * @throws {Error} If model is not supported by this provider
   */
  normalizeModel(model: string): string;
}

class AnthropicProvider implements Provider {
  normalizeModel(model: string): string {
    // Known Anthropic models
    const modelMap: Record<string, string> = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-opus-4': 'claude-opus-4-20250514',
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-haiku': 'claude-3-haiku-20240307'
    };

    // If already provider-specific, return as-is
    if (Object.values(modelMap).includes(model)) {
      return model;
    }

    // Normalize if known
    if (model in modelMap) {
      return modelMap[model];
    }

    // Unknown model
    throw new Error(
      `Unknown model '${model}' for Anthropic provider. ` +
      `Supported models: ${Object.keys(modelMap).join(', ')}`
    );
  }
}
```

**Key Patterns:**
- Bidirectional mapping (generic → specific, specific → specific)
- Error handling for unknown models
- Helpful error messages with supported models
- Type-safe model checking

---

### Pattern 3: Model Capability Checking

```typescript
export interface Provider {
  /**
   * Check if a model supports a specific capability
   *
   * @param model - Model name
   * @param capability - Capability to check
   * @returns True if model supports the capability
   */
  supportsModelCapability(
    model: string,
    capability: 'streaming' | 'tools' | 'vision' | 'extended-thinking'
  ): boolean;
}

class AnthropicProvider implements Provider {
  private modelCapabilities: Record<string, {
    streaming?: boolean;
    tools?: boolean;
    vision?: boolean;
    extendedThinking?: boolean;
  }> = {
    'claude-sonnet-4-20250514': {
      streaming: true,
      tools: true,
      vision: true,
      extendedThinking: true
    },
    'claude-3-haiku-20240307': {
      streaming: true,
      tools: true,
      vision: false,
      extendedThinking: false
    }
  };

  supportsModelCapability(
    model: string,
    capability: string
  ): boolean {
    const normalized = this.normalizeModel(model);
    const caps = this.modelCapabilities[normalized];

    if (!caps) {
      return false;
    }

    return caps[capability] === true;
  }
}
```

---

## Code Examples from Real SDKs

### Example 1: Claude Agent SDK Query Interface

**Source:** `claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts`

```typescript
/**
 * Query interface with methods for controlling query execution
 * Extends AsyncGenerator and has methods, so not serializable
 */
export interface Query extends AsyncGenerator<SDKMessage, void> {
  /**
   * Control Requests
   * The following methods are control requests, and are only supported when
   * streaming input/output is used.
   */

  /**
   * Interrupt the current query execution
   */
  interrupt(): Promise<void>;

  /**
   * Change the permission mode for the current session
   * @param mode - The new permission mode to set
   */
  setPermissionMode(mode: PermissionMode): Promise<void>;

  /**
   * Change the model used for subsequent responses
   * @param model - The model identifier to use
   */
  setModel(model?: string): Promise<void>;

  /**
   * Set the maximum thinking tokens
   * @param maxThinkingTokens - Maximum tokens for thinking, or null to clear
   */
  setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;

  /**
   * Get the list of available skills
   * @returns Array of available skills
   */
  supportedCommands(): Promise<SlashCommand[]>;

  /**
   * Get the list of available models
   * @returns Array of model information
   */
  supportedModels(): Promise<ModelInfo[]>;

  /**
   * Get the current status of all configured MCP servers
   * @returns Array of MCP server statuses
   */
  mcpServerStatus(): Promise<McpServerStatus[]>;
}
```

**Key Patterns:**
- AsyncGenerator for streaming messages
- Control methods for runtime configuration
- Status/inspection methods
- Clear separation of control vs data

---

### Example 2: Hook Callback Patterns

**Source:** Claude Agent SDK `runtimeTypes.d.ts`

```typescript
/**
 * Permission callback function for controlling tool usage
 * Called before each tool execution
 */
export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    /** Signaled if the operation should be aborted */
    signal: AbortSignal;
    /** Suggestions for updating permissions */
    suggestions?: PermissionUpdate[];
    /** The file path that triggered the permission request */
    blockedPath?: string;
    /** Why this permission request was triggered */
    decisionReason?: string;
    /** Unique identifier for this specific tool call */
    toolUseID: string;
    /** If running within the context of a sub-agent */
    agentID?: string;
  }
) => Promise<PermissionResult>;

/**
 * Hook callback function for responding to events
 */
export type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: {
    signal: AbortSignal;
  }
) => Promise<HookJSONOutput>;

/**
 * Hook callback matcher with optional pattern matching
 */
export interface HookCallbackMatcher {
  matcher?: string;
  hooks: HookCallback[];
  /** Timeout in seconds for all hooks in this matcher */
  timeout?: number;
}
```

**Key Patterns:**
- Callback functions with rich context
- AbortSignal for cancellation
- Structured options objects
- Matcher patterns for selective hooking

---

### Example 3: Session Options Pattern

**Source:** Claude Agent SDK `runtimeTypes.d.ts`

```typescript
/**
 * V2 API - UNSTABLE
 * Options for creating a session
 */
export type SDKSessionOptions = {
  /** Model to use */
  model: string;
  /** Path to Claude Code executable */
  pathToClaudeCodeExecutable?: string;
  /** Executable to use (node, bun) */
  executable?: 'node' | 'bun';
  /** Arguments to pass to executable */
  executableArgs?: string[];
  /** Environment variables to pass to the Claude Code process */
  env?: Record<string, string>;
  /** AbortSignal for cancelling the session */
  signal?: AbortSignal;
  /** Enable debugging output */
  debug?: boolean;
  /** Working directory for the Claude Code process */
  cwd?: string;
  /** Transfer list for worker threads */
  transferList?: TransferList;
  /** Query options (merged with session options) */
  query?: Options;
};

/**
 * V2 API - UNSTABLE
 * Session interface for multi-turn conversations
 */
export interface SDKSession {
  /** Send a message to the session */
  send(message: string | AsyncIterable<SDKUserMessage>): Promise<SDKResultMessage>;
  /** Close the session and cleanup resources */
  close(): Promise<void>;
  /** Get the session ID */
  readonly sessionId: string;
}
```

**Key Patterns:**
- All optional properties (except `model`)
- Rich configuration options
- Session lifecycle management
- Readonly metadata properties

---

## Best Practices Summary

### 1. Interface Design

| Practice | Description | Example |
|----------|-------------|---------|
| **Interface-First** | Define interfaces before implementations | `Provider` interface |
| **String Literal Unions** | Use unions for small string sets | `ProviderId = 'anthropic' \| 'opencode'` |
| **Boolean Capabilities** | Simple feature flags | `ProviderCapabilities` |
| **Readonly Properties** | Mark immutable properties | `readonly id: ProviderId` |
| **Generics for Types** | Preserve type information | `execute<T>(...): Promise<T>` |

### 2. Lifecycle Methods

| Practice | Description | Recommendation |
|----------|-------------|----------------|
| **Async Methods** | All lifecycle methods should be async | `async initialize(): Promise<void>` |
| **Guard Clauses** | Check preconditions early | `if (!this.initialized) throw ...` |
| **Error Handling** | Descriptive error messages | `throw new Error('Provider not initialized')` |
| **Resource Cleanup** | Proper cleanup in terminate() | Clear Maps, close connections |

### 3. MCP Integration

| Practice | Description | Example |
|----------|-------------|---------|
| **Discriminated Unions** | Transport type discrimination | `transport: 'stdio' \| 'inprocess'` |
| **Dynamic Configuration** | Runtime server management | `setMcpServers()` |
| **Status Monitoring** | Check server health | `mcpServerStatus()` |
| **Type-Safe Tools** | Zod schema validation | `SdkMcpToolDefinition` |

### 4. Type Safety

| Practice | Description | Example |
|----------|-------------|---------|
| **satisfies Operator** | Type-safe object literals | `} satisfies ProviderCapabilities` |
| **Discriminated Unions** | Type narrowing | `type Event = { type: 'start' } \| { type: 'end' }` |
| **Type Guards** | Runtime type checking | `if (isSuccess(response))` |
| **Utility Types** | Pick, Omit, Partial | `type Config = Required<Options>` |

### 5. Documentation

| Practice | Description | Example |
|----------|-------------|---------|
| **JSDoc Comments** | Document all public APIs | `/** Initialize provider */` |
| **@example Tags** | Provide usage examples | `@example \`\`\`ts code \`\`\`` |
| **@param/@returns** | Document parameters | `@param options - Optional config` |
| **@throws** | Document error conditions | `@throws {ProviderError} If init fails` |

---

## Recommended Groundswell Patterns

### Pattern 1: Provider Interface

```typescript
/**
 * Provider interface for LLM backends
 *
 * All providers must implement this interface to ensure
 * consistent behavior across different LLM SDKs.
 *
 * @example
 * ```ts
 * class AnthropicProvider implements Provider {
 *   readonly id = 'anthropic';
 *   readonly capabilities = { ... };
 *
 *   async initialize(options?: ProviderOptions): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface Provider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Provider capabilities (feature flags) */
  readonly capabilities: ProviderCapabilities;

  /** Initialize provider with optional configuration */
  initialize(options?: ProviderOptions): Promise<void>;

  /** Terminate provider and cleanup resources */
  terminate(): Promise<void>;

  /** Execute a prompt request */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;

  /** Normalize model name for this provider */
  normalizeModel(model: string): string;

  /** Check if model supports a capability */
  supportsModelCapability(
    model: string,
    capability: ModelCapability
  ): boolean;
}
```

---

### Pattern 2: Provider Options

```typescript
/**
 * Provider configuration options
 *
 * All properties are optional to enable flexible configuration.
 * Uses readonly modifier for immutability.
 */
export interface ProviderOptions {
  /** API endpoint override */
  readonly endpoint?: string;

  /** API key (if not from environment) */
  readonly apiKey?: string;

  /** Session ID for session-based providers */
  readonly sessionId?: string;

  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Custom headers */
  readonly headers?: Record<string, string>;

  /** MCP servers to connect */
  readonly mcps?: MCPServer[];

  /** Skills to load */
  readonly skills?: Skill[];
}
```

---

### Pattern 3: Provider Request

```typescript
/**
 * Provider execution request
 *
 * Wraps prompt and execution options for provider execution.
 * Separates content (prompt) from configuration (options).
 */
export interface ProviderRequest {
  /** The user prompt/message */
  prompt: string;

  /** Execution options */
  options: ProviderExecutionOptions;
}

/**
 * Provider execution options
 *
 * Configuration specific to this execution request.
 * Takes precedence over provider-level configuration.
 */
export interface ProviderExecutionOptions {
  /** Model identifier */
  readonly model?: string;

  /** System prompt override */
  readonly systemPrompt?: string;

  /** Available tools */
  readonly tools?: Tool[];

  /** Lifecycle hooks */
  readonly hooks?: ProviderHookEvents;

  /** Session identifier for session-based providers */
  readonly sessionId?: string;
}
```

---

### Pattern 4: Provider Hook Events

```typescript
/**
 * Provider hook events
 *
 * Lifecycle hooks for monitoring and controlling provider execution.
 * Maps to AgentHooks but with provider-specific events.
 */
export interface ProviderHookEvents {
  /** Called before tool execution */
  readonly onToolStart?: (
    tool: ToolExecutionRequest
  ) => Promise<void> | void;

  /** Called after tool execution */
  readonly onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;

  /** Called when provider session starts */
  readonly onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  readonly onSessionEnd?: (
    totalDuration: number
  ) => Promise<void> | void;

  /** Called for each streaming chunk */
  readonly onStream?: (chunk: string) => void;
}
```

---

### Pattern 5: Provider Implementation Template

```typescript
/**
 * Anthropic provider implementation
 *
 * Implements Provider interface for Anthropic Claude API.
 */
export class AnthropicProvider implements Provider {
  // Readonly metadata
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,  // Requires session abstraction
    extendedThinking: false
  } satisfies ProviderCapabilities;

  // Private state
  private client?: Anthropic;
  private sessions: Map<string, SessionState> = new Map();
  private initialized = false;

  /**
   * Initialize provider
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize SDK client
    if (options?.apiKey) {
      this.client = new Anthropic({ apiKey: options.apiKey });
    } else {
      this.client = new Anthropic();
    }

    this.initialized = true;
  }

  /**
   * Terminate provider
   */
  async terminate(): Promise<void> {
    this.sessions.clear();
    this.client = undefined;
    this.initialized = false;
  }

  /**
   * Execute prompt
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>> {
    if (!this.initialized) {
      throw new Error('Provider not initialized');
    }

    // Normalize model
    const model = this.normalizeModel(
      request.options.model || 'claude-sonnet-4'
    );

    // Execute with or without session
    if (request.options.sessionId) {
      return this.executeWithSession(request, toolExecutor, hooks);
    }

    return this.executeOneShot(request, toolExecutor, hooks);
  }

  /**
   * Normalize model name
   */
  normalizeModel(model: string): string {
    const modelMap: Record<string, string> = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-opus-4': 'claude-opus-4-20250514'
    };

    if (model in modelMap) {
      return modelMap[model];
    }

    if (Object.values(modelMap).includes(model)) {
      return model;
    }

    throw new Error(`Unknown model: ${model}`);
  }

  /**
   * Check model capability
   */
  supportsModelCapability(
    model: string,
    capability: ModelCapability
  ): boolean {
    // Implementation
    return true;
  }

  // Private helper methods...
}
```

---

## Sources and References

### Primary Sources Analyzed

1. **Claude Agent SDK v0.1.77**
   - Path: `/home/dustin/projects/groundswell/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.1.77_zod@3.25.76/node_modules/@anthropic-ai/claude-agent-sdk/`
   - Files:
     - `entrypoints/agentSdkTypes.d.ts` - Main SDK types
     - `entrypoints/sdk/runtimeTypes.d.ts` - Runtime interfaces
     - `entrypoints/sdk/coreTypes.d.ts` - Core types

2. **Groundswell Project**
   - Path: `/home/dustin/projects/groundswell/`
   - Files:
     - `src/types/providers.ts` - Provider types
     - `src/types/sdk-primitives.ts` - SDK primitives
     - `src/types/agent.ts` - Agent types
     - `plan/003_dd63ad365ffb/docs/architecture/decisions.md` - Architecture decisions
     - `plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md` - Implementation patterns

3. **Popular TypeScript Libraries**
   - **execa** - Process execution (options patterns)
   - **tinypool** - Worker pools (filled options)
   - **tinybench** - Benchmarks (hierarchical options)
   - **@vitest/runner** - Test runner (test options)
   - **cac** - CLI parser (builder pattern)

### External Documentation (Recommended)

**Note:** Web search was unavailable during research (rate limit resets Feb 1, 2026). The following resources are recommended for further reading:

1. **TypeScript Documentation**
   - [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/2/interfaces.html)
   - [TypeScript Handbook - Unions](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
   - [TypeScript 4.9 - satisfies Operator](https://www.typescriptlang.org/docs/handbook/2/release-notes/typescript-4-9.html#the-satisfies-operator)

2. **LLM SDK Documentation**
   - [LangChain.js Documentation](https://js.langchain.com/)
   - [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
   - [Anthropic Claude API](https://docs.anthropic.com/)

3. **MCP (Model Context Protocol)**
   - [MCP Specification](https://modelcontextprotocol.io/)
   - [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

4. **TypeScript Best Practices**
   - [Effective TypeScript by Dan Vanderkam](https://effectivetypescript.com/)
   - [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## Conclusion

This research identifies consistent patterns across modern LLM SDKs and TypeScript libraries:

### Key Findings

1. **Interface-First Design**: All successful SDKs define clear interfaces before implementation
2. **Async Lifecycle Methods**: `initialize()`, `terminate()`, `execute()` are universally async
3. **Readonly Properties**: Immutable metadata (`id`, `capabilities`) marked as `readonly`
4. **Boolean Capabilities**: Simple feature flags are preferred over complex capability systems
5. **Discriminated Unions**: Type-safe variant handling (MCP transports, events, responses)
6. **Rich Hook Systems**: Lifecycle hooks with structured context objects
7. **Model Normalization**: Provider-specific model IDs with normalization methods
8. **JSDoc Documentation**: Extensive documentation with examples

### Recommended Groundswell Implementation

The Groundswell project should follow these patterns:

1. ✅ Use `Provider` interface with `initialize()`, `terminate()`, `execute()` methods
2. ✅ Declare capabilities as static readonly boolean flags
3. ✅ Implement session abstraction for providers without native sessions
4. ✅ Use discriminated unions for MCP server configurations
5. ✅ Provide `normalizeModel()` method in each provider
6. ✅ Use `satisfies` operator for capability objects
7. ✅ Implement rich hook system with `ProviderHookEvents`
8. ✅ Use JSDoc with `@example` tags for all public APIs

### Next Steps

1. Validate these patterns against actual OpenCode SDK (when available)
2. Implement `AnthropicProvider` class following recommended template
3. Create comprehensive test suite for provider interface
4. Document provider migration guide for users
5. Consider provider plugin system for third-party providers

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**Researcher:** Claude Agent (Groundswell Project)
**Status:** Ready for PRP Implementation
