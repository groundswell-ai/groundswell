// src/types/harnesses.ts
import type { Tool, MCPServer, Skill } from './sdk-primitives.js';
import type { AgentResponse } from './agent.js';
import type { StreamEvent } from './streaming.js';

/**
 * Harness identifier (PRD §7.2).
 *
 * The agent runtime/SDK that drives prompting, tool execution, streaming, and
 * sessions. This axis is ORTHOGONAL to the LLM provider/model — the two are
 * chosen independently (PRD §7). The harness NEVER appears in the model string.
 */
export type HarnessId = 'pi' | 'claude-code';

/**
 * LLM host / model provider (PRD §7.8).
 *
 * Open set: the well-known providers get IDE autocomplete via the `(string & {})`
 * idiom, but ANY provider string is valid (e.g. a custom provider registered with a
 * harness's model registry). This is the LLM vendor axis — NOT the harness.
 */
export type ModelProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'zai'
  | (string & {});

/**
 * Harness capability flags (PRD §7.4). Identical shape to the legacy
 * ProviderCapabilities. Unsupported features are advertised here rather than
 * silently degrading (PRD §7.14).
 */
export interface HarnessCapabilities {
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
 * Harness-level configuration options (PRD §7.5).
 *
 * Intentionally SLIMMED relative to the legacy ProviderOptions: the session-store
 * fields (sessionStore, sessionPersistence, sessionTtl, sessionPath) are adapter
 * internals and live on the concrete harness, not on the shared harness contract
 * (system_context.md §3 / §7 risk note). `apiKey` is forwarded to the LLM provider
 * — it is not owned by the harness.
 *
 * Harness implementations MAY extend this with harness-specific fields (e.g.
 * `skillsDirs?: string[]` on a `pi` adapter) per PRD §7.5.
 *
 * @example
 * ```ts
 * const options: HarnessOptions = {
 *   endpoint: 'https://api.anthropic.com',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   timeout: 60000,
 * };
 * ```
 */
export interface HarnessOptions {
  /** API endpoint override */
  endpoint?: string;
  /** API key (forwarded to the LLM provider) */
  apiKey?: string;
  /** Session/resume id */
  sessionId?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Hook events adapted from AgentHooks to harness-specific lifecycle (PRD §7.11).
 * Identical to the legacy ProviderHookEvents.
 *
 * @example
 * ```ts
 * const hooks: HarnessHookEvents = {
 *   onToolStart: async (tool) => { console.log('Starting:', tool.name); },
 *   onToolEnd: async (tool, result, duration) => {
 *     console.log(`Finished ${tool.name} in ${duration}ms`);
 *   },
 *   onStream: (chunk) => process.stdout.write(chunk),
 * };
 * ```
 */
export interface HarnessHookEvents {
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
 * Tool execution request (PRD §7.10). Copied VERBATIM from providers.ts.
 * Tools are executed locally via MCPHandler regardless of harness.
 *
 * @example
 * ```ts
 * const request: ToolExecutionRequest = {
 *   name: 'filesystem__read_file',
 *   input: { path: '/src/index.ts' },
 * };
 * ```
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;
  /** Tool input parameters */
  input: unknown;
}

/**
 * Tool execution result (PRD §7.10). Copied VERBATIM from providers.ts.
 *
 * @example
 * ```ts
 * const result: ToolExecutionResult = {
 *   content: 'const x = 1;',
 *   isError: false,
 * };
 * ```
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;
  /** Whether the execution resulted in an error */
  isError: boolean;
}

/**
 * Execution options carried inside a {@link HarnessRequest} (PRD §7.3 + §7.10).
 * Mirrors the legacy ProviderExecutionOptions; named separately for adapter reuse.
 *
 * @example
 * ```ts
 * const execOptions: HarnessExecutionOptions = {
 *   model: 'anthropic/claude-sonnet-4-20250514',
 *   systemPrompt: 'You are a helpful assistant.',
 *   tools: [myTool],
 *   hooks: myHooks,
 *   streaming: true,
 * };
 * ```
 */
export interface HarnessExecutionOptions {
  /** Model identifier ("provider/model" or plain — never harness-qualified; PRD §7.8) */
  model?: string;
  /** System prompt override */
  systemPrompt?: string;
  /** Available tools */
  tools?: Tool[];
  /** Lifecycle hooks */
  hooks?: HarnessHookEvents;
  /** Session identifier for session-based harnesses */
  sessionId?: string;
  /** Enable streaming mode (returns AsyncGenerator instead of a complete response) */
  streaming?: boolean;
}

/**
 * Harness execution request (PRD §7.3). Merges the legacy ProviderRequest +
 * ProviderExecutionOptions (system_context.md §3 mapping).
 *
 * @example
 * ```ts
 * const request: HarnessRequest = {
 *   prompt: 'Explain TypeScript generics',
 *   options: { model: 'claude-sonnet-4', streaming: false },
 * };
 * ```
 */
export interface HarnessRequest {
  /** The user prompt/message */
  prompt: string;
  /** Execution options */
  options: HarnessExecutionOptions;
}

/**
 * Parsed model identifier (PRD §7.8).
 *
 * `provider` is the LLM host (ModelProviderId) — NEVER the harness. Format is
 * `provider/model` (e.g. `anthropic/claude-sonnet-4-20250514`) or a plain model id
 * resolved against the configured `defaultModelProvider`.
 *
 * NOTE: Defined here (in S1) rather than S2 because {@link Harness.normalizeModel}
 * references it and must compile. S2 (P1.M1.T1.S2) adds GlobalHarnessConfig +
 * parseModelSpec/formatModelForProvider FUNCTIONS and must NOT redefine this interface.
 *
 * @example
 * ```ts
 * // Qualified format
 * const spec1: ModelSpec = {
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   raw: 'anthropic/claude-sonnet-4-20250514',
 * };
 *
 * // Plain format (resolved against default provider)
 * const spec2: ModelSpec = {
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   raw: 'claude-sonnet-4-20250514',
 * };
 * ```
 */
export interface ModelSpec {
  /** LLM host — NOT the harness */
  provider: ModelProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}

/**
 * The shared harness contract both `PiHarness` and `ClaudeCodeHarness` implement
 * (PRD §7.3). Identical method surface to the legacy Provider interface; the
 * `execute<T>()` return type matches the already-shipped AnthropicProvider.execute
 * (src/providers/anthropic-provider.ts lines 338–344).
 *
 * Adapters: PiHarness wraps `createAgentSession()`; ClaudeCodeHarness (rename of
 * AnthropicProvider) wraps the Claude Code SDK. New harnesses implement this and
 * register with HarnessRegistry (§7.6, owned by P1.M2).
 *
 * @example <caption>Basic harness shape</caption>
 * ```ts
 * const harness: Harness = {
 *   readonly id: 'pi',
 *   readonly capabilities: { mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: false },
 *   initialize: async (opts?) => { … },
 *   terminate: async () => { … },
 *   execute: async <T>(req, toolExec, hooks?) => { … },
 *   registerMCPs: async (servers) => [],
 *   loadSkills: async (skills) => {},
 *   normalizeModel: (model) => ({ provider: 'anthropic', model, raw: model }),
 *   supports: (cap) => cap === 'mcp',
 *   requiresFeatures: (features) => features.every(f => f === 'mcp'),
 * };
 * ```
 */
export interface Harness {
  /**
   * Unique harness identifier (one of the supported HarnessId values)
   *
   * @readonly
   *
   * @example
   * ```ts
   * readonly id: HarnessId;  // 'pi' | 'claude-code'
   * ```
   */
  readonly id: HarnessId;

  /**
   * Capability flags for feature detection
   *
   * @readonly
   *
   * @example
   * ```ts
   * readonly capabilities: HarnessCapabilities;
   * // { mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false }
   * ```
   */
  readonly capabilities: HarnessCapabilities;

  /**
   * Initialize the harness with optional configuration (SDK clients, connections).
   *
   * @param options - Optional harness-specific configuration
   *
   * @example
   * ```ts
   * await harness.initialize({ apiKey: 'sk-...', endpoint: 'https://...' });
   * ```
   */
  initialize(options?: HarnessOptions): Promise<void>;

  /**
   * Terminate the harness and release resources.
   *
   * @example
   * ```ts
   * await harness.terminate();
   * ```
   */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request with a type-safe response (PRD §7.3).
   *
   * `toolExecutor` delegates tool calls back to Groundswell's MCPHandler — the harness
   * only reports tool calls back, it never executes them itself (PRD §7.10 / §7.12).
   *
   * @typeParam T - The expected response data type (inferred from schema or explicit)
   * @param request - The prompt request with options
   * @param toolExecutor - Callback for executing tools (delegated to MCPHandler)
   * @param hooks - Optional lifecycle hooks for events
   * @returns `Promise<AgentResponse<T>>` for non-streaming, or an
   *          `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` when
   *          `request.options.streaming === true`.
   *
   * @example <caption>Non-streaming execution</caption>
   * ```ts
   * const response = await harness.execute<{ answer: string }>(
   *   { prompt: 'What is 2+2?', options: {} },
   *   toolExecutor,
   *   hooks,
   * );
   * if (response.status === 'success') {
   *   console.log(response.data.answer);  // Type-safe access
   * }
   * ```
   *
   * @example <caption>Streaming execution</caption>
   * ```ts
   * const stream = await harness.execute(
   *   { prompt: '...', options: { streaming: true } },
   *   toolExecutor,
   * );
   * for await (const event of stream) {
   *   // Handle StreamEvent items
   * }
   * ```
   */
  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  /**
   * Register MCP servers and return the discovered tools (PRD §7.10 / §7.12).
   *
   * @param servers - Array of MCP server configurations
   * @returns Promise resolving to array of discovered Tool definitions
   *
   * @example
   * ```ts
   * const tools = await harness.registerMCPs([
   *   { name: 'filesystem', transport: 'stdio', command: 'python', args: ['mcp_server.py'] },
   * ]);
   * console.log(`Registered ${tools.length} tools`);
   * ```
   */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /**
   * Load skills into the harness (PRD §7.12).
   *
   * @param skills - Array of skill definitions to load
   *
   * @example
   * ```ts
   * await harness.loadSkills([
   *   { name: 'web-search', path: '/skills/web-search' },
   * ]);
   * ```
   */
  loadSkills(skills: Skill[]): Promise<void>;

  /**
   * Parse a model string into a ModelSpec (PRD §7.8).
   *
   * @param model - Model string to parse
   * @returns ModelSpec with provider, model, and raw string
   *
   * @example
   * ```ts
   * harness.normalizeModel('claude-sonnet-4')
   * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
   *
   * harness.normalizeModel('anthropic/claude-opus-4')
   * // Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
   * ```
   */
  normalizeModel(model: string): ModelSpec;

  /**
   * Check if a single capability is supported.
   *
   * @param capability - The capability to check (must be keyof HarnessCapabilities)
   * @returns true if the capability is supported, false otherwise
   *
   * @example
   * ```ts
   * if (harness.supports('mcp')) {
   *   await harness.registerMCPs(servers);
   * }
   * ```
   */
  supports(capability: keyof HarnessCapabilities): boolean;

  /**
   * Check if ALL listed capabilities are supported (empty array → true).
   *
   * @param features - Array of capability keys to check
   * @returns true if all features are supported, false if any are unsupported
   *
   * @example
   * ```ts
   * if (harness.requiresFeatures(['mcp', 'streaming'])) {
   *   // Enable advanced features requiring both MCP and streaming
   * }
   * ```
   */
  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean;
}
