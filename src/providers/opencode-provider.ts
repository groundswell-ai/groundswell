/**
 * OpenCode provider implementation (LLM-Only Mode)
 *
 * Wraps the @opencode-ai/sdk to provide multi-provider LLM access
 * through the unified Provider interface.
 *
 * ## IMPORTANT: Tool Execution Limitation
 *
 * OpenCode executes tools server-side and does not support client-side
 * tool delegation. This provider operates in **LLM-only mode**:
 *
 * - ✅ Multi-provider LLM access (75+ providers)
 * - ✅ Session-based state management
 * - ✅ Extended thinking support
 * - ✅ Streaming responses
 * - ✅ Skills via system prompt injection
 * - ❌ NO TOOL EXECUTION (tools disabled in execute())
 * - ❌ NO MCP INTEGRATION (managed by Groundswell's MCPHandler)
 * - ❌ NO LSP INTEGRATION (server-side only)
 *
 * ## Architecture
 *
 * This provider is designed for scenarios where:
 * 1. You need multi-provider LLM access without tools
 * 2. Tools are managed separately via Groundswell's MCPHandler
 * 3. Skills are loaded via system prompt injection (OpenCode has no native skills API)
 *
 * For full tool support, use AnthropicProvider or implement direct
 * provider integrations (OpenAI, Google, etc.).
 *
 * ## Capabilities
 *
 * - **Skills**: System prompt-based skill loading (not native OpenCode skills)
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
 * // LLM-only execution (no tools)
 * const result = await provider.execute(
 *   { prompt: 'Explain quantum computing', options: {} },
 *   toolExecutor  // ← Accepted but not used (LLM-only mode)
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
import { createSuccessResponse, createErrorResponse } from "../types/agent.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import { parseModelSpec } from "../utils/model-spec.js";
import { readFile } from "fs/promises";
import { join } from "path";

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
   * OpenCode SDK capabilities (LLM-only mode):
   * - Skills via system prompt injection (not native OpenCode skills)
   * - Streaming responses via Server-Sent Events
   * - Native session-based state management
   * - Extended thinking via reasoning tokens
   *
   * Note: MCP and LSP are set to false due to LLM-only mode limitation.
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections - DISABLED (LLM-only mode) */
    mcp: false,
    /** Skill loading via system prompt injection */
    skills: true,
    /** LSP integration - DISABLED (server-side only, not available in LLM-only mode) */
    lsp: false,
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
   * Combined skills prompt for injection into system prompts
   *
   * Stores the formatted skills content from loadSkills() for injection
   * into system prompts during execute() calls. Skills are combined with
   * markdown headers and separators.
   *
   * @internal
   */
  private skillsPrompt: string = '';

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
      throw new Error("Failed to load @opencode-ai/sdk: Import returned null");
    }

    // Map ProviderOptions to OpenCode ServerOptions
    const serverOptions: {
      hostname?: string;
      port?: number;
      timeout?: number;
      config?: import("@opencode-ai/sdk").Config;
    } = {
      port: 4096, // OpenCode default port
      timeout: options?.timeout || 30000, // 30 second default
    };

    // Handle endpoint option (may be full URL or just hostname)
    if (options?.endpoint) {
      if (options.endpoint.includes("://")) {
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
        console.warn("Error closing OpenCode server:", error);
      }
      this.server = null;
    }

    // Clear client reference
    this.client = null;

    // Clear skills prompt (from P3.M2.T1.S4)
    this.skillsPrompt = '';

    // Clear SDK reference to allow garbage collection
    this.sdk = null;

    // GOTCHA: No return value needed - Promise<void> is implicit
    // GOTCHA: No throws possible from null check and assignment
  }

  /**
   * Build OpenCode event handler configuration
   *
   * Unlike Anthropic SDK hooks (passed to query()), OpenCode uses
   * event subscriptions. This returns a configuration object
   * that execute() uses to determine which event types to subscribe to.
   *
   * @param hooks - Optional provider hook events to adapt
   * @returns Event subscription configuration
   * @internal
   */
  private buildOpenCodeHooks(hooks?: ProviderHookEvents): {
    onToolStart?: boolean;
    onToolEnd?: boolean;
    onStream?: boolean;
  } {
    if (!hooks) {
      return {};
    }

    const config: Record<string, boolean> = {};

    if (hooks.onToolStart) {
      config.onToolStart = true;
    }
    if (hooks.onToolEnd) {
      config.onToolEnd = true;
    }
    if (hooks.onStream) {
      config.onStream = true;
    }

    return config;
  }

  /**
   * Execute a prompt request
   *
   * Implements multi-provider LLM execution using the OpenCode SDK.
   * Supports 75+ providers via the providerID/modelID format.
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools (NOT USED - OpenCode limitation)
   * @param hooks - Optional lifecycle hooks
   * @returns Typed agent response
   * @throws {Error} When SDK is not initialized
   * @remarks
   * **Tool Execution Limitation:** OpenCode executes tools server-side with no
   * client-side delegation mechanism. The toolExecutor parameter is accepted
   * for interface compliance but cannot be used. This provider operates in
   * LLM-only mode.
   *
   * Full implementation in P3.M2.T1.S3
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ): Promise<AgentResponse<T>> {
    // ===== STEP 1: SDK initialization check =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:248-252)
    // CRITICAL: Validate client is initialized before attempting to use it
    if (!this.client) {
      throw new Error(
        "OpenCode provider not initialized. Call initialize() first.",
      );
    }

    // ===== STEP 2: Session creation/retrieval =====
    // OpenCode sessions are server-side, not in-memory like AnthropicProvider
    // If sessionId is provided, reuse it. Otherwise, create a new session.
    let sessionId = request.options.sessionId;

    if (!sessionId) {
      // Create new session on server
      const sessionResult = await this.client.session.create({});
      if (!sessionResult.data) {
        return createErrorResponse(
          "EXECUTION_FAILED",
          "Failed to create session: no data returned",
          {},
          false,
        ) as AgentResponse<T>;
      }
      sessionId = sessionResult.data.id;
    }

    // ===== STEP 3: Model parsing =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:280-282)
    // Default model uses OpenCode's default: claude-opus-4-5-20251101
    const modelSpec = this.normalizeModel(
      request.options.model ?? "claude-opus-4-5-20251101",
    );

    // ===== STEP 4: Extract providerID and modelID =====
    // OpenCode uses "providerID/modelID" format (e.g., "openai/gpt-4")
    // parseModelSpec() handles the string, need to split for SDK call
    const parts = modelSpec.model.split("/");
    if (parts.length !== 2) {
      return createErrorResponse(
        "INVALID_MODEL_FORMAT",
        `Model must be in 'provider/model' format: ${modelSpec.model}`,
        { model: modelSpec.raw },
        false,
      ) as AgentResponse<T>;
    }
    const [providerID, modelID] = parts;

    // ===== STEP 5: Hooks setup =====
    const hookConfig = this.buildOpenCodeHooks(hooks);

    // ===== STEP 6: Start time tracking =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:326)
    const startTime = Date.now();

    // ===== STEP 7: Setup event subscription for hooks (if configured) =====
    // OpenCode uses Server-Sent Events, not callback hooks like Anthropic
    let eventStreamResult: Awaited<
      ReturnType<typeof this.client.event.subscribe>
    > | null = null;

    if (Object.keys(hookConfig).length > 0) {
      // Subscribe to events for hook dispatch
      eventStreamResult = await this.client.event.subscribe();

      // Process events in background (best-effort, non-blocking)
      (async () => {
        try {
          if (!eventStreamResult) return;
          for await (const event of eventStreamResult.stream) {
            // onStream: TextPart with delta (streaming text chunks)
            if (
              hookConfig.onStream &&
              event.type === "message.part.updated" &&
              hooks?.onStream
            ) {
              const part = (
                event as {
                  properties?: { part?: { type: string; delta?: string } };
                }
              ).properties?.part;
              if (part?.type === "text" && part.delta) {
                hooks.onStream(part.delta);
              }
            }
          }
        } catch (error) {
          // Log but don't throw - event processing is best-effort
          console.warn("Event stream error:", error);
        }
      })().catch((error) => {
        console.warn("Event stream processing failed:", error);
      });
    }

    // ===== STEP 8: Call onSessionStart hook =====
    if (hooks?.onSessionStart) {
      await hooks.onSessionStart();
    }

    // ===== STEP 9: Execute prompt =====
    // PATTERN: Follow OpenCode execution patterns (opencode-execution-patterns.md Section 2)
    // session.prompt() is synchronous - waits for completion
    const result = await this.client.session.prompt({
      body: {
        parts: [{ type: "text", text: request.prompt }],
        model: { providerID, modelID },
        // CRITICAL: Inject loaded skills via buildSystemPromptWithSkills() helper
        // OpenCode supports system prompt via 'system' field in body
        ...(request.options.systemPrompt || this.skillsPrompt ? {
          system: this.buildSystemPromptWithSkills(request.options.systemPrompt),
        } : {}),
      },
      path: { id: sessionId },
    });

    // ===== STEP 10: Calculate duration =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:400)
    const duration = Date.now() - startTime;

    // ===== STEP 11: Handle error response =====
    // Check for error in result
    if (!result.data || result.error) {
      // Call onSessionEnd hook before returning error
      if (hooks?.onSessionEnd) {
        await hooks.onSessionEnd(duration);
      }

      return createErrorResponse(
        "EXECUTION_FAILED",
        result.error ? String(result.error) : "Unknown error",
        { duration },
        false,
      ) as AgentResponse<T>;
    }

    // ===== STEP 12: Extract message and check for errors =====
    // result.data is { info: AssistantMessage, parts: Part[] }
    const responseData = result.data as {
      info: import("@opencode-ai/sdk").AssistantMessage;
      parts: unknown[];
    };
    const assistantMessage = responseData.info;

    // Check for message-level errors
    if (assistantMessage.error) {
      return createErrorResponse(
        "EXECUTION_FAILED",
        `${assistantMessage.error.name}: ${assistantMessage.error.data?.message ?? "Unknown error"}`,
        {
          duration,
          providerID: assistantMessage.providerID,
          modelID: assistantMessage.modelID,
        },
        false,
      ) as AgentResponse<T>;
    }

    // ===== STEP 13: Extract token usage =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:430-433)
    // Map OpenCode tokens format to TokenUsage (snake_case)
    const usage = {
      input_tokens: assistantMessage.tokens?.input ?? 0,
      output_tokens: assistantMessage.tokens?.output ?? 0,
    };

    // ===== STEP 14: Call onSessionEnd hook =====
    if (hooks?.onSessionEnd) {
      await hooks.onSessionEnd(duration);
    }

    // ===== STEP 15: Return success response =====
    // PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts:439-445)
    // Return the entire AssistantMessage as T (caller can extract what they need)
    return createSuccessResponse(assistantMessage as T, {
      agentId: this.id,
      timestamp: Date.now(),
      duration,
      usage,
    });
  }

  /**
   * Register MCP servers and return available tools
   *
   * NOTE: OpenCodeProvider operates in LLM-only mode.
   * OpenCode executes tools server-side with no client-side delegation mechanism.
   * Tools are managed by Groundswell's MCPHandler, not OpenCode.
   *
   * @param servers - Array of MCP server configurations (ignored in LLM-only mode)
   * @returns Empty array (no tools in LLM-only mode)
   * @throws {Error} When SDK is not initialized
   * @remarks
   * This method returns an empty array to satisfy the Provider interface.
   * MCP tool registration is not supported by OpenCode's server-side architecture.
   *
   * @example
   * ```ts
   * const provider = new OpenCodeProvider();
   * await provider.initialize();
   *
   * // Returns empty array (LLM-only mode)
   * const tools = await provider.registerMCPs([
   *   { name: 'filesystem', transport: 'inprocess', tools: [...] }
   * ]);
   * console.log(tools); // []
   * ```
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // PATTERN: SDK initialization check (follow execute() pattern)
    // CRITICAL: Validate client is initialized before attempting to use it
    if (!this.client) {
      throw new Error("OpenCode provider not initialized. Call initialize() first.");
    }

    // LLM-only mode: no tool registration
    // OpenCode executes tools server-side with no client-side delegation
    // Tools are managed by Groundswell's MCPHandler, not OpenCode
    return [];
  }

  /**
   * Load skills into the provider
   *
   * Skills are read from SKILL.md files in each skill directory and combined
   * into a formatted system prompt fragment for injection during execute().
   * OpenCode has no native skills API, so skills are injected via system prompts.
   *
   * @param skills - Array of skill definitions with name and path
   * @throws {Error} When SDK is not initialized
   * @throws {Error} When SKILL.md file cannot be read
   * @remarks
   * Each skill directory must contain a SKILL.md file. Skills are combined
   * with markdown headers (### Skill Name) and separators (---).
   *
   * @example
   * ```ts
   * const provider = new OpenCodeProvider();
   * await provider.initialize();
   * await provider.loadSkills([
   *   { name: 'math-expert', path: '/skills/math' },
   *   { name: 'code-reviewer', path: '/skills/code' }
   * ]);
   * ```
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // PATTERN: SDK initialization check (follow execute() pattern)
    // CRITICAL: Validate client is initialized before proceeding
    if (!this.client) {
      throw new Error("OpenCode provider not initialized. Call initialize() first.");
    }

    // Handle empty skills array - nothing to load
    if (skills.length === 0) {
      this.skillsPrompt = '';
      return;
    }

    // Load each skill's SKILL.md content
    const skillContents: string[] = [];

    for (const skill of skills) {
      try {
        // GOTCHA: Skill.path is directory, must join with 'SKILL.md'
        const skillMdPath = join(skill.path, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        // Format skill with markdown header
        skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
      } catch (error) {
        // PATTERN: Wrap errors with context (follow AnthropicProvider pattern)
        throw new Error(
          `Failed to load skill '${skill.name}' from ${skill.path}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Combine all skills with markdown separator
    // PATTERN: Use "\n\n---\n\n" for visual clarity (horizontal rule)
    this.skillsPrompt = skillContents.join('\n\n---\n\n');
  }

  /**
   * Build system prompt with skills injected
   *
   * Combines the base system prompt with loaded skills for injection into
   * the OpenCode session's system prompt field.
   *
   * @param baseSystemPrompt - Optional base system prompt to enhance with skills
   * @returns Enhanced system prompt with skills section, or base prompt unchanged if no skills loaded
   * @internal
   * @remarks
   * Three handling cases:
   * 1. No skills loaded - returns basePrompt unchanged
   * 2. No base prompt - returns skills-only prompt with default header
   * 3. Both exist - combines with "## Available Skills" section
   */
  private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
    // Case 1: No skills loaded - return base prompt unchanged
    if (!this.skillsPrompt) {
      return baseSystemPrompt ?? '';
    }

    // Case 2: No base prompt - return skills with default header
    if (!baseSystemPrompt) {
      return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
    }

    // Case 3: Both exist - combine with skills section
    return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
   * - Qualified: "openai/gpt-4" → { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
   *
   * Delegates to {@link parseModelSpec} for parsing and validation.
   * Unlike AnthropicProvider, accepts ANY provider prefix (OpenCode supports 75+ providers).
   *
   * @param model - Model string to normalize
   * @returns Parsed ModelSpec with validated provider and model
   * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
   *
   * @example
   * ```ts
   * const provider = new OpenCodeProvider();
   *
   * // Plain format (defaults to 'opencode' provider in Groundswell)
   * provider.normalizeModel('gpt-4');
   * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
   *
   * // Qualified format (multi-provider support)
   * provider.normalizeModel('openai/gpt-4');
   * // Returns: { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
   *
   * provider.normalizeModel('anthropic/claude-3-5-sonnet-20250514');
   * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet-20250514', raw: 'anthropic/claude-3-5-sonnet-20250514' }
   * ```
   */
  normalizeModel(model: string): ModelSpec {
    // PATTERN: Delegate to existing utility function
    // Use "opencode" as default provider (Groundswell's internal ID for OpenCode provider)
    const spec = parseModelSpec(model, "opencode");

    // CRITICAL DIFFERENCE FROM AnthropicProvider:
    // DO NOT check if spec.provider !== this.id
    // OpenCode is a multi-provider gateway - accepts any provider
    // Provider validation happens server-side in OpenCode

    return spec;
  }
}
