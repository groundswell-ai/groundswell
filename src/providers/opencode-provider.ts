/**
 * OpenCode provider implementation
 *
 * Wraps the @opencode-ai/sdk to provide multi-provider LLM access
 * through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Native MCP integration via client.mcp namespace
 * - **Skills**: Native skill loading via OpenCode skills system
 * - **LSP**: Native LSP integration via client.lsp namespace
 * - **Streaming**: Server-Sent Events streaming support
 * - **Sessions**: Native session-based state management
 * - **Extended Thinking**: Native reasoning token support
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the OpenCode SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { OpenCodeProvider } from 'groundswell';
 *
 * const provider = new OpenCodeProvider();
 * await provider.initialize();
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello!', options: {} },
 *   toolExecutor
 * );
 * ```
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
} from "../types/providers.js";
import type { AgentResponse } from "../types/agent.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import { parseModelSpec } from "../utils/model-spec.js";

export class OpenCodeProvider implements Provider {
  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = "opencode";

  /**
   * Provider capability flags
   *
   * OpenCode SDK capabilities:
   * - MCP via client.mcp namespace
   * - Skills via native skill loading
   * - LSP via client.lsp namespace
   * - Streaming responses via Server-Sent Events
   * - Native session-based state management
   * - Extended thinking via reasoning tokens
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via client.mcp namespace */
    mcp: true,
    /** Skill loading via native skills system */
    skills: true,
    /** LSP integration via client.lsp namespace */
    lsp: true,
    /** Streaming response support via Server-Sent Events */
    streaming: true,
    /** Native session-based state management */
    sessions: true,
    /** Extended thinking via reasoning tokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

  /**
   * OpenCode SDK module (lazy loaded)
   *
   * Dynamically imported in initialize() to support optional dependencies.
   * Typed using typeof import() pattern for accurate module types.
   *
   * @internal
   */
  private sdk: typeof import("@opencode-ai/sdk") | null = null;

  /**
   * OpenCode server instance
   *
   * Stores the server control object from createOpencode().
   * Has { url: string, close(): void } shape.
   *
   * @internal
   */
  private server: { url: string; close(): void } | null = null;

  /**
   * OpenCode client instance
   *
   * Stores the OpencodeClient for use in execute() method.
   *
   * @internal
   */
  private client: import("@opencode-ai/sdk").OpencodeClient | null = null;

  /**
   * Initialize the OpenCode provider
   *
   * Loads the OpenCode SDK and starts the OpenCode server.
   * Uses full-stack mode (embedded server) for complete lifecycle control.
   *
   * @param options - Optional provider configuration (endpoint, apiKey, timeout, etc.)
   * @throws {Error} When SDK module fails to load
   * @throws {Error} When server fails to start
   * @remarks
   * Implemented in P3.M2.T1.S2
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Idempotent check: if SDK is already loaded, return immediately
    // FOLLOW: AnthropicProvider pattern at src/providers/anthropic-provider.ts:156-159
    if (this.sdk) {
      return;
    }

    // Dynamic import of the OpenCode SDK for lazy loading
    // This allows optional dependencies and faster startup
    try {
      this.sdk = await import("@opencode-ai/sdk");
    } catch (error) {
      // Rethrow with descriptive message for ProviderRegistry to track
      throw new Error(
        `Failed to load @opencode-ai/sdk: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Validate import succeeded
    if (!this.sdk) {
      throw new Error(
        "Failed to load @opencode-ai/sdk: Import returned null",
      );
    }

    // Map ProviderOptions to OpenCode ServerOptions
    const serverOptions: {
      hostname?: string;
      port?: number;
      timeout?: number;
      config?: import("@opencode-ai/sdk").Config;
    } = {
      port: 4096,  // OpenCode default port
      timeout: options?.timeout || 30000,  // 30 second default
    };

    // Handle endpoint option (may be full URL or just hostname)
    if (options?.endpoint) {
      if (options.endpoint.includes('://')) {
        // Full URL provided (e.g., http://localhost:4096)
        // The Config interface uses baseUrl for the server URL
        serverOptions.config = {
          ...serverOptions.config,
          baseUrl: options.endpoint,
        } as import("@opencode-ai/sdk").Config;
      } else {
        // Just hostname provided (e.g., localhost)
        serverOptions.hostname = options.endpoint;
      }
    }

    // Handle API key option
    // Note: OpenCode SDK doesn't have a simple apiKey config
    // The API key is typically handled via server-side config or auth
    // For MVP, we'll pass it through headers if provided
    if (options?.apiKey) {
      serverOptions.config = {
        ...serverOptions.config,
        headers: {
          ...(serverOptions.config as any)?.headers,
          Authorization: `Bearer ${options.apiKey}`,
        },
      } as import("@opencode-ai/sdk").Config;
    }

    // Handle custom headers
    if (options?.headers) {
      serverOptions.config = {
        ...serverOptions.config,
        headers: {
          ...(serverOptions.config as any)?.headers,
          ...options.headers,
        },
      } as import("@opencode-ai/sdk").Config;
    }

    // Start OpenCode server and get client
    // CRITICAL: createOpencode() is async - must await
    // CRITICAL: Returns { client, server } - server needs cleanup
    try {
      const { client, server } = await this.sdk.createOpencode(serverOptions);

      this.client = client;
      this.server = server;

      console.log(`OpenCode initialized at ${server.url}`);
    } catch (error) {
      // Handle server startup failures
      throw new Error(
        `Failed to start OpenCode server: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Note: sessionId option ignored - OpenCode has native sessions
    // Note: headers option not supported by OpenCode SDK
  }

  /**
   * Terminate the provider and cleanup resources
   *
   * Shuts down the OpenCode server and clears all references.
   * The server process is terminated and all resources are released.
   *
   * @remarks
   * Implemented in P3.M2.T1.S2
   */
  async terminate(): Promise<void> {
    // Idempotent check: if SDK is already null, return immediately
    // FOLLOW: initialize() pattern (check this.sdk === null for terminate)
    if (this.sdk === null) {
      return;
    }

    // Close OpenCode server (best-effort - never throw)
    // CRITICAL: Must call server.close() to terminate server process
    // CRITICAL: Use try-catch to prevent throwing in terminate()
    if (this.server) {
      try {
        this.server.close();
      } catch (error) {
        // Log but don't throw - cleanup is best-effort
        console.warn('Error closing OpenCode server:', error);
      }
      this.server = null;
    }

    // Clear client reference
    this.client = null;

    // Clear SDK reference to allow garbage collection
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
   * @throws {Error} Full implementation not yet available
   * @remarks
   * Full implementation in P3.M2.T1.S3
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ): Promise<AgentResponse<T>> {
    // STUB: Full implementation in P3.M2.T1.S3
    throw new Error("OpenCodeProvider.execute() not implemented yet");
  }

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools
   * @throws {Error} Full implementation not yet available
   * @remarks
   * Full implementation in P3.M2.T1.S4
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // STUB: Full implementation in P3.M2.T1.S4
    throw new Error("OpenCodeProvider.registerMCPs() not implemented yet");
  }

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions to load
   * @throws {Error} Full implementation not yet available
   * @remarks
   * Full implementation in P3.M2.T1.S4
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // STUB: Full implementation in P3.M2.T1.S4
    throw new Error("OpenCodeProvider.loadSkills() not implemented yet");
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
   * - Qualified: "opencode/gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
   *
   * Delegates to {@link parseModelSpec} for parsing and validation.
   * Validates that the provider is 'opencode'.
   *
   * @param model - Model string to normalize
   * @returns Parsed ModelSpec with provider='opencode'
   * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
   * @throws {Error} When provider is not 'opencode'
   *
   * @example
   * ```ts
   * const provider = new OpenCodeProvider();
   *
   * // Plain format
   * provider.normalizeModel('gpt-4');
   * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
   *
   * // Qualified format
   * provider.normalizeModel('opencode/claude-opus-4');
   * // Returns: { provider: 'opencode', model: 'claude-opus-4', raw: 'opencode/claude-opus-4' }
   *
   * // Error: wrong provider
   * provider.normalizeModel('anthropic/claude-sonnet-4');
   * // Throws: "Cannot normalize anthropic/claude-sonnet-4 with OpenCodeProvider..."
   * ```
   */
  normalizeModel(model: string): ModelSpec {
    // Delegate to existing utility function
    const spec = parseModelSpec(model, "opencode");

    // Provider-specific validation
    if (spec.provider !== this.id) {
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with OpenCodeProvider. ` +
          `Use ProviderRegistry.get('${spec.provider}') instead.`,
      );
    }

    return spec;
  }
}
