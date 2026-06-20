// src/types/providers.ts — Backward-compatible deprecated alias shim (v1.2)
//
// Every Provider* symbol is either:
//   Bucket A — @deprecated alias → structurally-identical Harness* counterpart (types/harnesses.ts)
//   Bucket B — @deprecated superset union (ProviderId = HarnessId | legacy literals)
//   Bucket C — KEPT CONCRETE (shape diverges or consumers depend on specifics)
//
// The ProviderResult family is already @deprecated → AgentResponse and is left byte-for-byte
// unchanged.  ToolExecutionRequest / ToolExecutionResult are shared types re-exported from
// harnesses.ts (NOT renamed, NOT deprecated).  ToolExecutor is a concrete util (not deprecated).
//
// NO runtime code.  NO edits to any consumer file.

import type { Tool, MCPServer, Skill, TokenUsage } from "./sdk-primitives.js";
import type { AgentResponse } from "./agent.js";
import type { StreamEvent } from "./streaming.js";
import type {
  HarnessId,
  HarnessCapabilities,
  HarnessHookEvents,
  HarnessExecutionOptions,
  HarnessRequest,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
} from "./harnesses.js";

// ── Bucket B: deprecated SUPERSET (preserves legacy literals + adds harness axis) ───────────

/**
 * @deprecated Since v1.2. The single `ProviderId` axis is SPLIT:
 *   - runtime axis  → {@link HarnessId} ('pi' | 'claude-code')  — types/harnesses.ts
 *   - LLM-host axis → {@link ModelProviderId} (open set)         — types/harnesses.ts
 *
 * This union is a SUPERSET kept only so pre-migration consumers (AnthropicProvider
 * id:'anthropic', OpenCodeProvider id:'opencode', ProviderRegistry) keep compiling.
 * `'anthropic'` / `'opencode'` will be REMOVED when the adapters are renamed (P2.M1) /
 * deleted (P4.M1).
 */
export type ProviderId = HarnessId | 'anthropic' | 'opencode';

// ── Bucket A: @deprecated aliases → Harness* counterparts ───────────────────────────────────

/**
 * @deprecated Since v1.2. Use {@link HarnessCapabilities} from types/harnesses.ts.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ProviderCapabilities } from 'groundswell';
 * // AFTER (v1.2)
 * import type { HarnessCapabilities } from 'groundswell';
 * ```
 */
export type ProviderCapabilities = HarnessCapabilities;

/**
 * @deprecated Since v1.2. Use {@link HarnessHookEvents} from types/harnesses.ts.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ProviderHookEvents } from 'groundswell';
 * // AFTER (v1.2)
 * import type { HarnessHookEvents } from 'groundswell';
 * ```
 */
export type ProviderHookEvents = HarnessHookEvents;

/**
 * @deprecated Since v1.2. Use {@link HarnessExecutionOptions} from types/harnesses.ts.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ProviderExecutionOptions } from 'groundswell';
 * // AFTER (v1.2)
 * import type { HarnessExecutionOptions } from 'groundswell';
 * ```
 */
export type ProviderExecutionOptions = HarnessExecutionOptions;

/**
 * @deprecated Since v1.2. Use {@link HarnessRequest} from types/harnesses.ts.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ProviderRequest } from 'groundswell';
 * // AFTER (v1.2)
 * import type { HarnessRequest } from 'groundswell';
 * ```
 */
export type ProviderRequest = HarnessRequest;

/**
 * @deprecated Since v1.2. Use {@link ModelSpec} from types/harnesses.ts directly.
 * `provider` is now the open `ModelProviderId` set (anthropic/openai/google/zai/…).
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ModelSpec } from 'groundswell';
 * // AFTER (v1.2)
 * import type { ModelSpec } from 'groundswell';
 * ```
 */
export type { ModelSpec };

// Shared tool-exec types — now canonical in harnesses.ts (copied verbatim there by S1).
// Re-exported here so legacy imports keep resolving to the SAME type.
// NOT deprecated — these are the canonical names; they just live in harnesses.ts now.
export type { ToolExecutionRequest, ToolExecutionResult };

// ── Bucket C: KEPT CONCRETE (shape diverges / consumers depend on specifics) + @deprecated ──

/**
 * @deprecated Since v1.2. Use {@link HarnessOptions} from types/harnesses.ts.
 *
 * Note: HarnessOptions is SLIMMED — it omits `sessionStore`, `sessionPersistence`,
 * `sessionTtl`, and `sessionPath` (those move to the concrete harness adapter).
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { ProviderOptions } from 'groundswell';
 * const opts: ProviderOptions = { sessionPersistence: 'file', sessionPath: '/tmp' };
 * // AFTER (v1.2)
 * import type { HarnessOptions } from 'groundswell';
 * const opts: HarnessOptions = { apiKey: 'sk-...' };
 * ```
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

  /**
   * Session persistence type
   *
   * @remarks
   * Use 'file' for persistent storage across restarts. Mutually exclusive with
   * sessionStore property.
   *
   * When specified, a SessionStore instance will be created automatically.
   * Provide sessionStore directly for custom store implementations.
   *
   * @example
   * ```ts
   * // Easy configuration - file persistence
   * { sessionPersistence: 'file' }
   *
   * // Full configuration - custom path and TTL
   * {
   *   sessionPersistence: 'file',
   *   sessionPath: '/tmp/sessions',
   *   sessionTtl: 3600000
   * }
   *
   * // Direct injection - custom store
   * { sessionStore: new CustomStore() }
   * ```
   */
  sessionPersistence?: 'memory' | 'file' | 'redis';

  /**
   * Session time-to-live in milliseconds
   *
   * @remarks
   * Sessions expire after this duration. Default: 86400000 (24 hours).
   *
   * Note: TTL enforcement is planned for a future PRP (P2.M2.T2.S2).
   * This option is accepted now for forward compatibility.
   */
  sessionTtl?: number;

  /**
   * Directory path for file-based session storage
   *
   * @remarks
   * Only used when sessionPersistence is 'file'. Default: './sessions'.
   */
  sessionPath?: string;
}

/**
 * @deprecated Since v1.2. Session state is harness-adapter-internal; do not depend on
 * this Anthropic-SDK-specific shape from public code.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { SessionState } from 'groundswell';
 * // AFTER (v1.2)
 * // Access session state through the harness adapter internals; do not import.
 * ```
 */
export interface SessionState {
  /** Conversation history - all user messages in this session */
  history: import("@anthropic-ai/claude-agent-sdk").SDKUserMessage[];

  /** Last result message from the most recent execution */
  lastResult: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null;

  /**
   * Unix timestamp in milliseconds when session was created
   *
   * @remarks
   * Set automatically on session creation. Used for TTL expiration
   * calculations alongside lastAccessedAt.
   *
   * Optional for backward compatibility with legacy sessions.
   */
  createdAt?: number;

  /**
   * Unix timestamp in milliseconds when session was last accessed
   *
   * @remarks
   * Updated automatically on session load/save operations. Used for
   * sliding TTL expiration - sessions expire after lastAccessedAt + TTL.
   *
   * Optional for backward compatibility with legacy sessions.
   */
  lastAccessedAt?: number;
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
 * @deprecated Since v1.2. Use {@link GlobalHarnessConfig} from types/harnesses.ts.
 *
 * Note the field renames:
 *   `defaultProvider`     → `defaultHarness`
 *   `providerDefaults`    → `harnessDefaults`
 *   (plus the new `defaultModelProvider` axis)
 *
 * Successor `configureHarnesses()` lands in P1.M2.T2.S1.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { GlobalProviderConfig } from 'groundswell';
 * const cfg: GlobalProviderConfig = { defaultProvider: 'anthropic' };
 * // AFTER (v1.2)
 * import type { GlobalHarnessConfig } from 'groundswell';
 * const cfg: GlobalHarnessConfig = { defaultHarness: 'claude-code', defaultModelProvider: 'anthropic' };
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
 * @deprecated Since v1.2. Implement {@link Harness} (types/harnesses.ts) instead.
 *
 * NOTE: this interface is kept CONCRETE (not `extends Harness`) because Harness.id is the
 * narrow `HarnessId` while adapters still declare `id: ProviderId` with the legacy
 * `'anthropic'`/`'opencode'` literals. It is removed when AnthropicProvider→ClaudeCodeHarness
 * (P2.M1) and OpenCodeProvider deletion (P4.M1) land. The method surface is identical to
 * Harness — only the `id` union width differs today.
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import type { Provider } from 'groundswell';
 * class MyProvider implements Provider { readonly id: ProviderId = 'anthropic'; … }
 * // AFTER (v1.2)
 * import type { Harness } from 'groundswell';
 * class MyHarness implements Harness { readonly id: HarnessId = 'claude-code'; … }
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

  /**
   * Check if a specific capability is supported
   *
   * Convenience method for querying provider capabilities.
   * Equivalent to accessing `this.capabilities[capability]`.
   *
   * @param capability - The capability to check (must be keyof ProviderCapabilities)
   * @returns true if the capability is supported, false otherwise
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   * if (provider.supports('mcp')) {
   *   // Register MCP servers
   * }
   *
   * // Type-safe: TypeScript will error on invalid capability names
   * provider.supports('invalid'); // Type error
   * ```
   */
  supports(capability: keyof ProviderCapabilities): boolean;

  /**
   * Check if all specified features are supported
   *
   * Convenience method for validating multiple capabilities at once.
   * Returns true only if ALL specified features are supported.
   *
   * @param features - Array of capability keys to check
   * @returns true if all features are supported, false if any are unsupported
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   * if (provider.requiresFeatures(['mcp', 'streaming'])) {
   *   // Enable advanced features requiring both MCP and streaming
   * }
   *
   * // Empty array returns true (no requirements)
   * provider.requiresFeatures([]); // true
   *
   * // Any unsupported feature returns false
   * provider.requiresFeatures(['mcp', 'lsp']); // false if lsp is not supported
   * ```
   */
  requiresFeatures(features: (keyof ProviderCapabilities)[]): boolean;
}
