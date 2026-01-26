import type { Tool, MCPServer, Skill, TokenUsage } from "./sdk-primitives.js";
import type { AgentResponse } from "./agent.js";
import type { StreamEvent } from "./streaming.js";

/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId = "anthropic" | "opencode";

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

  /**
   * Session store for persistent session storage
   *
   * @remarks
   * Using type import to avoid circular dependency. The actual SessionStore
   * type is imported from '../providers/session-store.js'.
   */
  sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;
}

/**
 * Session state for maintaining conversation history
 *
 * @remarks
 * Stores conversation context for session-based execution.
 * Used when {@link ProviderOptions.sessionId} is provided.
 *
 * @see {@link https://docs.anthropic.com/en/api/messages#continuous-conversations | Anthropic Continuous Conversations}
 *
 * @public
 */
export interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;

  /** Tool input parameters */
  input: unknown;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;

  /** Whether the execution resulted in an error */
  isError: boolean;
}

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
    duration: number,
  ) => Promise<void> | void;

  /** Called when provider session starts */
  onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;

  /** Called for each streaming chunk */
  onStream?: (chunk: string) => void;
}

/**
 * Provider execution options
 * Wraps parameters for provider execution requests
 */
export interface ProviderExecutionOptions {
  /** Model identifier */
  model?: string;

  /** System prompt override */
  systemPrompt?: string;

  /** Available tools */
  tools?: Tool[];

  /** Lifecycle hooks */
  hooks?: ProviderHookEvents;

  /** Session identifier for session-based providers */
  sessionId?: string;

  /** Enable streaming mode (returns AsyncGenerator instead of complete response) */
  streaming?: boolean;
}

/**
 * Provider request interface
 * Wraps prompt and execution options for provider execution
 */
export interface ProviderRequest {
  /** The user prompt/message */
  prompt: string;

  /** Execution options */
  options: ProviderExecutionOptions;
}

/**
 * Model specification
 *
 * Represents a parsed model identifier with provider and model name.
 * Supports both plain ("claude-sonnet-4") and qualified ("anthropic/claude-opus-4")
 * formats per PRD 7.8.
 *
 * @example
 * ```ts
 * // Plain format (uses default provider)
 * parseModelSpec('claude-sonnet-4', 'anthropic')
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Qualified format (explicit provider)
 * parseModelSpec('opencode/gpt-4')
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
 * ```
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}

/**
 * Tool executor callback function
 * Delegates tool execution to the MCPHandler
 *
 * @remarks
 * Provider implementations receive this callback and use it to execute tools.
 * The provider does not create or manage its own MCPHandler instance.
 */
export type ToolExecutor = (
  request: ToolExecutionRequest,
) => Promise<ToolExecutionResult>;

// ========================
// ProviderResult Types (PRD 6)
// ========================

/**
 * Provider response status
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponseStatus} instead.
 *
 * The values are identical: `'success' | 'error' | 'partial'`
 *
 * ## Migration Guide
 *
 * **Quick migration**: Replace `ProviderResponseStatus` with `AgentResponseStatus`
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import { ProviderResponseStatus } from 'groundswell';
 * const status: ProviderResponseStatus = 'success';
 *
 * // AFTER (v1.5+)
 * import { AgentResponseStatus } from 'groundswell';
 * const status: AgentResponseStatus = 'success';
 * ```
 *
 * Three-state status indicating the outcome of a provider operation.
 * - 'success': Operation completed successfully with valid data
 * - 'error': Operation failed with error details
 * - 'partial': Operation partially completed (streaming, incremental)
 *
 * @see {@link AgentResponseStatus | New response status type}
 */
export type ProviderResponseStatus = "success" | "error" | "partial";

/**
 * Detailed error information for provider operations
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentErrorDetails} instead.
 *
 * The structure is identical - only the type name changed.
 *
 * ## Migration Guide
 *
 * **Quick migration**: Replace `ProviderErrorDetails` with `AgentErrorDetails`
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import { ProviderErrorDetails } from 'groundswell';
 * const error: ProviderErrorDetails = {
 *   code: 'VALIDATION_FAILED',
 *   message: 'Invalid input',
 *   details: null,
 *   recoverable: false
 * };
 *
 * // AFTER (v1.5+)
 * import { AgentErrorDetails } from 'groundswell';
 * const error: AgentErrorDetails = {
 *   code: 'VALIDATION_FAILED',
 *   message: 'Invalid input',
 *   details: null,
 *   recoverable: false
 * };
 * ```
 *
 * Provides structured error details for failed provider operations.
 * Used in ProviderResult when status is 'error'.
 *
 * @see {@link AgentErrorDetails | New error details type}
 */
export interface ProviderErrorDetails {
  /**
   * Machine-readable error code
   * Examples: VALIDATION_FAILED, EXECUTION_FAILED, API_REQUEST_FAILED
   */
  code: string;

  /**
   * Human-readable error description
   * Explains what went wrong in user-friendly terms
   */
  message: string;

  /**
   * Additional error context
   * May contain structured data about the error for debugging
   */
  details?: Record<string, unknown> | null;

  /**
   * Whether the error is recoverable
   * Hint for parent workflow retry logic
   */
  recoverable: boolean;
}

/**
 * Metadata about provider operation execution
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponseMetadata} instead.
 *
 * Field mapping:
 * - `providerId` → `agentId`
 * - All other fields are identical
 *
 * ## Migration Guide
 *
 * **Quick migration**: Replace `ProviderResponseMetadata` with `AgentResponseMetadata` and rename `providerId` to `agentId`
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import { ProviderResponseMetadata } from 'groundswell';
 * const metadata: ProviderResponseMetadata = {
 *   providerId: 'anthropic',
 *   timestamp: Date.now(),
 *   duration: 1523
 * };
 *
 * // AFTER (v1.5+)
 * import { AgentResponseMetadata } from 'groundswell';
 * const metadata: AgentResponseMetadata = {
 *   agentId: 'anthropic',  // Note: providerId → agentId
 *   timestamp: Date.now(),
 *   duration: 1523
 * };
 * ```
 *
 * Contains execution context information for provider operations.
 * Always present in ProviderResult regardless of status.
 *
 * @see {@link AgentResponseMetadata | New response metadata type}
 */
export interface ProviderResponseMetadata {
  /**
   * Provider identifier
   * ID of the provider that generated this response
   */
  providerId: string;

  /**
   * Unix timestamp in milliseconds
   * Time when the response was generated
   */
  timestamp: number;

  /**
   * Execution duration in milliseconds
   * Time taken for the provider operation to complete
   */
  duration?: number | null;

  /**
   * Request correlation ID
   * Used for tracing requests across distributed systems
   */
  requestId?: string | null;

  /**
   * Token usage from the API
   * Breakdown of input, output, and cache tokens used
   */
  usage?: TokenUsage;

  /**
   * Number of tool invocations
   * Count of tool/function calls made during execution
   */
  toolCalls?: number;
}

/**
 * Provider execution result wrapper
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponse} instead.
 *
 * ## Migration Guide
 *
 * **Quick migration**: Replace `ProviderResult<T>` with `AgentResponse<T>`
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import { ProviderResult } from 'groundswell';
 * const result: ProviderResult<Data> = await provider.execute(...);
 *
 * // AFTER (v1.5+)
 * import { AgentResponse } from 'groundswell';
 * const result: AgentResponse<Data> = await provider.execute(...);
 * ```
 *
 * The structure is identical - only the type name changes:
 * - `status: 'success' | 'error' | 'partial'` (same)
 * - `data: T | null` (same)
 * - `error: ErrorDetails | null` (same structure)
 * - `metadata: ResponseMetadata` (same structure, with `providerId` → `agentId`)
 *
 * Wraps the result of provider execution with status, data, error,
 * and metadata. Uses discriminated union pattern for type safety.
 *
 * ## PRD 6.4 Response Requirements
 *
 * All ProviderResult instances MUST satisfy:
 * 1. **Strict JSON**: Parseable by JSON.parse()
 * 2. **No Prose Wrapping**: No markdown or conversational text
 * 3. **Consistent Structure**: Conforms to this interface
 * 4. **Null over Undefined**: Use null for absent values
 * 5. **Error Responses**: Failed ops return valid JSON with status='error'
 *
 * ## Type Narrowing
 *
 * The status field is a discriminant. Use type guards to narrow:
 * - status='success' → data is T (not null), error is null
 * - status='error' → data is null, error is ProviderErrorDetails (not null)
 * - status='partial' → data is T (not null), error may be null
 *
 * @template T - The type of data returned on success (unknown by default)
 * @see {@link AgentResponse | New response type}
 * @see {@link ProviderResponseStatus}, {@link ProviderErrorDetails}
 *
 * @example
 * ```ts
 * const result: ProviderResult<{ answer: string }> = {
 *   status: 'success',
 *   data: { answer: '42' },
 *   error: null,
 *   metadata: { providerId: 'anthropic', timestamp: Date.now() }
 * };
 * ```
 */
export interface ProviderResult<T = unknown> {
  /**
   * Response status discriminator
   * Use for type narrowing: 'success' | 'error' | 'partial'
   */
  status: ProviderResponseStatus;

  /**
   * Response data
   * Present on success and partial responses, null on error
   */
  data: T | null;

  /**
   * Error details
   * Present on error responses, null on success
   */
  error: ProviderErrorDetails | null;

  /**
   * Response metadata
   * Always present, contains execution context
   */
  metadata: ProviderResponseMetadata;
}

// ========================
// Global Provider Configuration (PRD 7.6)
// ========================

/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Priority order (lowest to highest):
 * 1. GlobalProviderConfig (this config)
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
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

// ========================
// Provider Interface (PRD 7.3)
// ========================

/**
 * Provider interface for LLM backend abstraction
 *
 * Defines the contract all providers must implement to support
 * multi-provider Agent SDK execution. Providers encapsulate
 * SDK-specific details while presenting a uniform API.
 *
 * @remarks
 *
 * ## Implementation Requirements
 *
 * All provider implementations MUST:
 * - Use readonly properties for `id` and `capabilities`
 * - Implement all 6 methods with exact signatures
 * - Delegate tool execution via the `toolExecutor` callback
 * - Return `AgentResponse<T>` wrappers (not raw `T`)
 * - Handle optional `options` parameter in `initialize()`
 *
 * ## Lifecycle
 *
 * 1. **Construction**: Provider is instantiated with identifier and capabilities
 * 2. **Initialization**: `initialize(options?)` is called to set up SDK clients
 * 3. **MCP Registration**: `registerMCPs(servers)` discovers and returns available tools
 * 4. **Skill Loading**: `loadSkills(skills)` registers prompt templates/capabilities
 * 5. **Execution**: `execute<T>(request, toolExecutor, hooks?)` runs prompts
 * 6. **Termination**: `terminate()` cleans up resources and closes connections
 *
 * @example
 * ```ts
 * import { Provider, type ProviderId, type ProviderCapabilities } from '@groundswell/sdk';
 *
 * class AnthropicProvider implements Provider {
 *   readonly id: ProviderId = 'anthropic';
 *   readonly capabilities: ProviderCapabilities = {
 *     mcp: true,
 *     skills: true,
 *     lsp: true,
 *     streaming: true,
 *     sessions: false,
 *     extendedThinking: false
 *   };
 *
 *   async initialize(options?: ProviderOptions): Promise<void> {
 *     // Initialize Anthropic SDK client
 *   }
 *
 *   async terminate(): Promise<void> {
 *     // Cleanup resources
 *   }
 *
 *   async execute<T>(
 *     request: ProviderRequest,
 *     toolExecutor: ToolExecutor,
 *     hooks?: ProviderHookEvents
 *   ): Promise<AgentResponse<T>> {
 *     // Execute prompt via Anthropic SDK
 *   }
 *
 *   async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
 *     // Register MCP servers and return discovered tools
 *   }
 *
 *   async loadSkills(skills: Skill[]): Promise<void> {
 *     // Load skills into the provider
 *   }
 *
 *   normalizeModel(model: string): ModelSpec {
 *     // Parse model specification
 *   }
 * }
 * ```
 */
export interface Provider {
  /**
   * Unique provider identifier
   *
   * Used for provider selection and model qualification.
   * Must be one of the supported {@link ProviderId} values.
   *
   * @readonly
   *
   * @example
   * ```ts
   * readonly id: ProviderId;  // 'anthropic' | 'opencode'
   * ```
   */
  readonly id: ProviderId;

  /**
   * Provider capability flags
   *
   * Indicates which features this provider supports.
   * Used for feature detection and capability queries.
   *
   * @readonly
   *
   * @example
   * ```ts
   * readonly capabilities: ProviderCapabilities;
   * // { mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false }
   * ```
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Initialize the provider with optional configuration
   *
   * Called when provider is first instantiated or registered.
   * Providers should perform one-time setup here (SDK clients, connections).
   *
   * @param options - Optional provider-specific configuration
   * @throws ProviderError if initialization fails
   *
   * @example
   * ```ts
   * await provider.initialize({ apiKey: 'sk-...', endpoint: 'https://...' });
   * ```
   */
  initialize(options?: ProviderOptions): Promise<void>;

  /**
   * Terminate the provider and cleanup resources
   *
   * Called when provider is being shut down or unregistered.
   * Providers should close connections, release resources, etc.
   *
   * @example
   * ```ts
   * await provider.terminate();
   * ```
   */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request with type-safe response
   *
   * This is the core method for LLM execution. Providers must:
   * 1. Construct the appropriate SDK query/request
   * 2. Handle tool execution via the toolExecutor callback
   * 3. Invoke hooks at appropriate lifecycle points
   * 4. Return an AgentResponse with validated data (or AsyncGenerator for streaming)
   *
   * @typeParam T - The expected response data type (inferred from schema or explicit)
   * @param request - The prompt request with options
   * @param toolExecutor - Callback for executing tools (delegated to MCPHandler)
   * @param hooks - Optional lifecycle hooks for events
   * @returns Promise resolving to AgentResponse or AsyncGenerator for streaming
   *
   * @example <caption>Explicit type parameter</caption>
   * ```ts
   * const response = await provider.execute<{ answer: string }>(
   *   { prompt: 'What is 2+2?', options: {} },
   *   toolExecutor,
   *   hooks
   * );
   * if (response.status === 'success') {
   *   console.log(response.data.answer);  // Type-safe access
   * }
   * ```
   *
   * @example <caption>Schema inference (if supported)</caption>
   * ```ts
   * const response = await provider.execute(
   *   { prompt: '...', options: { outputSchema: AnswerSchema } },
   *   toolExecutor
   * );
   * ```
   *
   * @example <caption>Streaming mode</caption>
   * ```ts
   * const stream = await provider.execute(
   *   { prompt: '...', options: { streaming: true } },
   *   toolExecutor
   * );
   * if (Symbol.asyncIterator in stream) {
   *   for await (const event of stream) {
   *     // Handle streaming events
   *   }
   * }
   * ```
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ):
    | Promise<AgentResponse<T>>
    | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  /**
   * Register MCP servers and return available tools
   *
   * Providers should connect to the given MCP servers and discover
   * all available tools. Returns the list of discovered tools.
   *
   * @param servers - Array of MCP server configurations
   * @returns Promise resolving to array of discovered Tool definitions
   *
   * @example
   * ```ts
   * const tools = await provider.registerMCPs([
   *   { name: 'filesystem', transport: 'stdio', command: 'python', args: ['mcp_server.py'] }
   * ]);
   * console.log(`Registered ${tools.length} tools`);
   * ```
   */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /**
   * Load skills into the provider
   *
   * Skills are reusable prompt templates or capabilities.
   * Anthropic provider uses system prompts; OpenCode has native /skills support.
   *
   * @param skills - Array of skill definitions to load
   *
   * @example
   * ```ts
   * await provider.loadSkills([
   *   { name: 'web-search', path: '/skills/web-search' }
   * ]);
   * ```
   */
  loadSkills(skills: Skill[]): Promise<void>;

  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "claude-sonnet-4-20250514" (uses default provider)
   * - Qualified: "anthropic/claude-opus-4-20250514" (explicit provider)
   *
   * @param model - Model string to parse
   * @returns ModelSpec with provider, model, and raw string
   *
   * @example
   * ```ts
   * provider.normalizeModel('claude-sonnet-4')
   * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
   *
   * provider.normalizeModel('anthropic/claude-opus-4')
   * // Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
   * ```
   */
  normalizeModel(model: string): ModelSpec;
}
