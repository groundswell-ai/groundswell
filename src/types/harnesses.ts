// src/types/harnesses.ts
import type { Tool, MCPServer, Skill } from './sdk-primitives.js';
import type { AgentResponse } from './agent.js';
import type { StreamEvent } from './streaming.js';
import type { AuthStorage, ModelRegistry } from '@earendil-works/pi-coding-agent';

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

  /**
   * Caller-supplied Pi `AuthStorage` (pi harness only; PRD §7.5 per-harness extension).
   *
   * When omitted, the pi harness builds a file-backed `AuthStorage.create()` whose default
   * path is `getAgentDir()/auth.json` (= `~/.pi/agent/auth.json`, overridable via
   * `PI_CODING_AGENT_DIR`) — so a credential written by `pi /login` is honored
   * (PRD §9.2.6). Pass an in-memory store
   * (`AuthStorage.inMemory({ zai: { type:'api_key', key:'...' } })`) to inject/seed
   * auth for tests.
   */
  authStorage?: AuthStorage;

  /**
   * Caller-supplied Pi `ModelRegistry` (pi harness only; PRD §7.5 per-harness extension).
   *
   * When omitted, the pi harness builds a file-backed
   * `ModelRegistry.create(this.authStorage)` (reads `getAgentDir()/models.json`).
   * Must be paired with a compatible `authStorage`.
   */
  modelRegistry?: ModelRegistry;
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
 * (src/harnesses/anthropic-provider.ts lines 338–344).
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

/**
 * Global harness configuration (PRD §7.6).
 *
 * Configures the default harness, optional per-harness options, and the default LLM provider
 * that resolve unqualified model strings (PRD §7.8). Set once at application startup via
 * `configureHarnesses()` (owned by P1.M2.T2.S1) — it cascades to all agents unless explicitly
 * overridden (PRD §7.7).
 *
 * The two default axes are INDEPENDENT:
 *  - `defaultHarness`        — the agent RUNTIME ('pi' | 'claude-code').
 *  - `defaultModelProvider`  — the LLM HOST / vendor (open `ModelProviderId` set).
 *
 * This is the v1.2 successor to the legacy `GlobalProviderConfig`: it adds the orthogonal
 * `defaultModelProvider` field and re-keys `harnessDefaults` by `HarnessId` (the legacy
 * `providerDefaults` was keyed by the conflated `ProviderId`).
 *
 * @example
 * ```ts
 * const config: GlobalHarnessConfig = {
 *   defaultHarness: 'pi',                  // vendor-neutral default runtime
 *   defaultModelProvider: 'anthropic',     // LLM host — independent of harness
 *   harnessDefaults: {
 *     'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
 *   },
 * };
 * ```
 */
export interface GlobalHarnessConfig {
  /** Default agent runtime used when none is specified (PRD §7.6 / §7.7 cascade root). */
  defaultHarness: HarnessId;

  /** Optional per-harness default options, keyed by HarnessId (runtime axis). */
  harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>;

  /**
   * Default LLM provider used to resolve unqualified (plain) model strings (PRD §7.8).
   *
   * Open `ModelProviderId` set — independent of `defaultHarness`. When a caller passes a
   * plain model id like `'claude-sonnet-4-20250514'`, `parseModelSpec` resolves its
   * `provider` against this value.
   */
  defaultModelProvider?: ModelProviderId;
}

// ---------------------------------------------------------------------------
// Model-spec parsing contract (PRD §7.8)
// ---------------------------------------------------------------------------
//
// TYPE-ONLY AMBIENT DECLARATIONS.
//
// These `declare function`s declare the CANONICAL SIGNATURE of the model-spec
// helpers. They have NO body here and are ERASED at compile time — `harnesses.ts`
// remains a pure-types module (no runtime emission, per S1's contract).
//
// The RUNTIME IMPLEMENTATIONS live in `src/utils/model-spec.ts` (owned by
// P1.M1.T2.S1). P1.M1.T2.S1 imports `ModelSpec` / `ModelProviderId` from this
// file and implements both functions against the signatures below, with open-set
// validation (reject empty strings; reject harness-qualified 3-segment strings
// like `pi/anthropic/...`; no closed-union provider check).
//
// CONSUMER GUIDANCE:
//   - Need the TYPE / SIGNATURE?  → `import type { parseModelSpec } from './harnesses.js'`
//   - Need the RUNTIME VALUE?     → `import { parseModelSpec } from '../utils/model-spec.js'`
//   Importing the value from `./harnesses.js` and calling it is a RUNTIME ERROR
//   (the binding is erased). The public API (P3.M3.T1.S1) MUST re-export the
//   value from `utils/model-spec.ts`, not from here.
// ---------------------------------------------------------------------------

/**
 * Parse a model specification string into a {@link ModelSpec} (PRD §7.8).
 *
 * Accepts two formats:
 *  - Qualified: `"anthropic/claude-sonnet-4-20250514"` → `{ provider: 'anthropic', model: 'claude-sonnet-4-20250514', raw: … }`
 *  - Plain:     `"claude-sonnet-4-20250514"`           → resolved against `defaultProvider`.
 *
 * `provider` is the LLM host (`ModelProviderId`, open set) — NEVER the harness
 * (PRD §7.8 critical rule). Harness-qualified strings (`pi/anthropic/...`) are
 * invalid and rejected by the implementation (P1.M1.T2.S1).
 *
 * @param model - Model string (`"provider/model"` or plain model id).
 * @param defaultProvider - Provider used when `model` is unqualified (open set;
 *        implementation default is `'anthropic'`).
 * @returns Parsed {@link ModelSpec} (provider, model, raw).
 *
 * @remarks TYPE-ONLY ambient declaration — see file-level block comment.
 *          Runtime implementation: `src/utils/model-spec.ts` (P1.M1.T2.S1).
 */
export declare function parseModelSpec(
  model: string,
  defaultProvider?: ModelProviderId,
): ModelSpec;

/**
 * Format a {@link ModelSpec} for a specific target provider (PRD §7.8).
 *
 * Pass-through (returns `spec.model`) when `spec.provider === targetProvider`;
 * otherwise the implementation throws a cross-translation error (MVP behavior —
 * same-provider validation / API preparation is the primary use case).
 *
 * @param spec - {@link ModelSpec} from `parseModelSpec()` or `Harness.normalizeModel()`.
 * @param targetProvider - The LLM host to format the model for (open `ModelProviderId` set).
 * @returns Formatted model string (model name only, when providers match).
 *
 * @remarks TYPE-ONLY ambient declaration — see file-level block comment.
 *          Runtime implementation: `src/utils/model-spec.ts` (P1.M1.T2.S1).
 */
export declare function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ModelProviderId,
): string;
