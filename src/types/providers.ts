import type { Tool, MCPServer, Skill } from './sdk-primitives.js';
import type { AgentResponse } from './agent.js';

/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

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
    duration: number
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
 * Normalized model identifier with provider information
 *
 * @remarks
 * This type will be fully defined in P1.M1.T1.S5.
 * This placeholder provides the basic structure for Provider.normalizeModel().
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string */
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
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;

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
   * 4. Return an AgentResponse with validated data
   *
   * @typeParam T - The expected response data type (inferred from schema or explicit)
   * @param request - The prompt request with options
   * @param toolExecutor - Callback for executing tools (delegated to MCPHandler)
   * @param hooks - Optional lifecycle hooks for events
   * @returns Promise resolving to AgentResponse with status, data, error, metadata
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
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

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
