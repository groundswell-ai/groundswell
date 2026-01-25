/**
 * Anthropic provider implementation
 *
 * Wraps the @anthropic-ai/claude-agent-sdk to provide Anthropic Claude
 * model access through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Model Context Protocol integration via createSdkMcpServer
 * - **Skills**: System prompt-based skill loading
 * - **LSP**: Language Server Protocol via MCP plugins
 * - **Streaming**: Streaming response support
 * - **Sessions**: Stateless API (no native sessions)
 * - **Extended Thinking**: maxThinkingTokens for extended reasoning
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the Anthropic SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { AnthropicProvider } from 'groundswell';
 *
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello, Claude!', options: {} },
 *   toolExecutor
 * );
 * ```
 *
 * @see {@link https://docs.anthropic.com/en/api/messages | Anthropic Messages API}
 * @see {@link https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk | Agent SDK Package}
 */

import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutor,
  ProviderHookEvents,
  ModelSpec,
} from '../types/providers.js';
import type { AgentResponse } from '../types/agent.js';
import type { Tool, MCPServer, Skill } from '../types/sdk-primitives.js';
import { parseModelSpec } from '../utils/model-spec.js';

export class AnthropicProvider implements Provider {
  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = 'anthropic';

  /**
   * Provider capability flags
   *
   * Anthropic SDK v0.1.77 capabilities:
   * - MCP via createSdkMcpServer
   * - Skills via system prompt
   * - LSP via MCP plugins
   * - Streaming responses
   * - No native sessions (stateless)
   * - Extended thinking via maxThinkingTokens
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via createSdkMcpServer */
    mcp: true,
    /** Skill loading via system prompt */
    skills: true,
    /** LSP integration via MCP plugins */
    lsp: true,
    /** Streaming response support */
    streaming: true,
    /** Session-based state (stateless API) */
    sessions: false,
    /** Extended thinking via maxThinkingTokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

  /**
   * Anthropic SDK module (lazy loaded)
   *
   * Dynamically imported in initialize() to support optional dependencies.
   * Typed using typeof import() pattern for accurate module types.
   *
   * @internal
   */
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  /**
   * Initialize the Anthropic provider
   *
   * Loads the Anthropic SDK and initializes the client.
   *
   * @param options - Optional provider configuration (apiKey, endpoint, etc.)
   * @remarks
   * Implemented in P2.M1.T1.S2
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Idempotent check: if SDK is already loaded, return immediately
    if (this.sdk) {
      return;
    }

    // Dynamic import of the Anthropic SDK for lazy loading
    // This allows optional dependencies and faster startup
    try {
      this.sdk = await import('@anthropic-ai/claude-agent-sdk');
    } catch (error) {
      // Rethrow with descriptive message for ProviderRegistry to track
      throw new Error(
        `Failed to load @anthropic-ai/claude-agent-sdk: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate import succeeded
    if (!this.sdk) {
      throw new Error('Failed to load @anthropic-ai/claude-agent-sdk: Import returned null');
    }

    // Note: Options are stored for later use in execute() method
    // The actual SDK client creation happens when execute() is called
    // This is because SDK may need different clients per-request (e.g., custom endpoint)
    //
    // Relevant options for Anthropic (stored implicitly via options parameter):
    // - options.apiKey: Will be used in execute() for SDK client
    // - options.endpoint: Will be used in execute() for custom endpoint
    // - options.timeout: Will be used in execute() for request timeout
    // - options.headers: Will be used in execute() for custom headers
    //
    // Ignored option:
    // - options.sessionId: Anthropic has sessions: false capability
    //
    // Note: No internal initialization flag needed - ProviderRegistry manages state externally
  }

  /**
   * Terminate the provider and cleanup resources
   *
   * Clears the SDK module reference to allow garbage collection.
   * The Anthropic SDK is stateless and manages its own resources internally.
   *
   * @remarks
   * Implemented in P2.M1.T1.S3
   */
  async terminate(): Promise<void> {
    // Idempotent check: if SDK is already null, return immediately
    // FOLLOW: initialize() pattern at lines 107-110 (if (this.sdk) { return; })
    if (this.sdk === null) {
      return;
    }

    // Clear SDK reference to allow garbage collection
    // CRITICAL: No other cleanup needed - SDK is stateless (see research/anthropic_sdk_cleanup.md)
    // CRITICAL: SDK manages its own resources - Query objects auto-cleanup on completion
    // CRITICAL: ProviderRegistry manages initialization state externally
    this.sdk = null;

    // GOTCHA: No return value needed - Promise<void> is implicit
    // GOTCHA: No throws possible from null check and assignment
  }

  /**
   * Execute a prompt request
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Typed agent response
   * @remarks
   * Implemented in P2.M1.T1.S5 (query construction) and P2.M1.T1.S6 (message iteration)
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Implemented in P2.M1.T1.S5-S6
    return {} as AgentResponse<T>;
  }

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools
   * @remarks
   * Implemented in P2.M1.T1.S7
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Implemented in P2.M1.T1.S7
    return [];
  }

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions
   * @remarks
   * Implemented in P2.M1.T1.S8
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // Implemented in P2.M1.T1.S8
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "claude-sonnet-4" → { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
   * - Qualified: "anthropic/claude-opus-4" → { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
   *
   * Delegates to {@link parseModelSpec} for parsing and validation.
   * Validates that the provider is 'anthropic'.
   *
   * @param model - Model string to normalize
   * @returns Parsed ModelSpec with provider='anthropic'
   * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
   * @throws {Error} When provider is not 'anthropic'
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   *
   * // Plain format
   * provider.normalizeModel('claude-sonnet-4');
   * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
   *
   * // Qualified format
   * provider.normalizeModel('anthropic/claude-opus-4');
   * // Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
   *
   * // Error: wrong provider
   * provider.normalizeModel('opencode/gpt-4');
   * // Throws: "Cannot normalize opencode/gpt-4 with AnthropicProvider..."
   * ```
   */
  normalizeModel(model: string): ModelSpec {
    // Delegate to existing utility function
    const spec = parseModelSpec(model, 'anthropic');

    // Provider-specific validation
    if (spec.provider !== this.id) {
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
        `Use ProviderRegistry.get('${spec.provider}') instead.`
      );
    }

    return spec;
  }
}
