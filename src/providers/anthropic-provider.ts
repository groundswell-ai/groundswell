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
} from "../types/providers.js";
import type { AgentResponse } from "../types/agent.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../types/agent.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import { MCPHandler } from "../core/mcp-handler.js";
import { parseModelSpec } from "../utils/model-spec.js";
import { readFile } from "fs/promises";
import { join } from "path";

export class AnthropicProvider implements Provider {
  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = "anthropic";

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
  private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

  /**
   * MCP handler for server registration and tool management
   *
   * Manages MCP server connections and converts tools to SDK format.
   * Created on first use and reused for subsequent registrations.
   *
   * @internal
   */
  private mcpHandler: MCPHandler = new MCPHandler();

  /**
   * SDK MCP server configuration for use in execute()
   *
   * Stores the converted SDK server config from registerMCPs().
   * Used in sdkOptions.mcpServers during execute() calls.
   *
   * @internal
   */
  private mcpServerConfig: import("@anthropic-ai/claude-agent-sdk").McpServerConfig | null = null;

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
      this.sdk = await import("@anthropic-ai/claude-agent-sdk");
    } catch (error) {
      // Rethrow with descriptive message for ProviderRegistry to track
      throw new Error(
        `Failed to load @anthropic-ai/claude-agent-sdk: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Validate import succeeded
    if (!this.sdk) {
      throw new Error(
        "Failed to load @anthropic-ai/claude-agent-sdk: Import returned null",
      );
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

    // Clear MCP server configuration (from P2.M1.T1.S7)
    this.mcpServerConfig = null;

    // Clear skills prompt (from P2.M1.T1.S8)
    this.skillsPrompt = '';

    // GOTCHA: No return value needed - Promise<void> is implicit
    // GOTCHA: No throws possible from null check and assignment
  }

  /**
   * Execute a prompt request
   *
   * Constructs the SDK query from ProviderRequest and executes it via the Anthropic SDK.
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools (used in P2.M1.T1.S6)
   * @param hooks - Optional lifecycle hooks (adapter in P2.M1.T2.S1)
   * @returns Typed agent response
   * @remarks
   * P2.M1.T1.S5: Query construction - builds AgentSDKOptions and calls SDK query()
   * P2.M1.T1.S6: Message iteration - iterates AsyncGenerator and builds AgentResponse
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ): Promise<AgentResponse<T>> {
    // PATTERN: SDK initialization check (follow initialize() pattern at lines 107-110)
    // CRITICAL: Validate SDK is loaded before attempting to use it
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // PATTERN: Model resolution using normalizeModel()
    // FROM: src/providers/anthropic-provider.ts:246-259
    // Default model from src/core/agent.ts:320
    const modelSpec = this.normalizeModel(
      request.options.model ?? "claude-sonnet-4-20250514",
    );

    // PATTERN: AgentSDKOptions construction (EXACT pattern from src/core/agent.ts:397-426)
    // CRITICAL: Map ProviderRequest fields to SDK Options format
    const sdkOptions = {
      // Model mapping
      model: modelSpec.model,

      // System prompt mapping (from src/core/agent.ts:317-318)
      // CRITICAL: Inject loaded skills via buildSystemPromptWithSkills() helper
      systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),

      // Tools mapping to allowedTools (string[])
      // CRITICAL: Map tool objects to tool names (from src/core/agent.ts:405-407)
      ...(request.options.tools &&
        request.options.tools.length > 0 && {
          allowedTools: request.options.tools.map((t) => t.name),
        }),

      // MCP servers integration (from P2.M1.T1.S7)
      // Include registered MCP servers if available
      ...(this.mcpServerConfig && {
        mcpServers: {
          "groundswell-mcp": this.mcpServerConfig,
        },
      }),

      // Hooks (placeholder for P2.M1.T2.S1)
      // hooks: undefined,
    };

    // PATTERN: Start time tracking for duration calculation
    // FROM: src/core/agent.ts line 406
    const startTime = Date.now();

    // PATTERN: SDK query() call (EXACT pattern from src/core/agent.ts:431)
    // CRITICAL: query() returns AsyncGenerator<SDKMessage> (not Promise!)
    // Do NOT await the query() call - it returns the generator synchronously
    const queryResult = this.sdk.query({
      prompt: request.prompt,
      options: sdkOptions,
    });

    // PATTERN: Message iteration and AgentResponse construction
    // FROM: src/core/agent.ts lines 437-492
    let resultMessage: import("@anthropic-ai/claude-agent-sdk").SDKResultMessage | null = null;
    let toolCallCount = 0;

    // Iterate over the AsyncGenerator of SDK messages
    for await (const message of queryResult) {
      // Count tool uses from assistant messages
      if (message.type === "assistant") {
        const content = message.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              toolCallCount++;
              // Note: Hooks adapter will be implemented in P2.M1.T2.S1
            }
          }
        }
      }

      // Capture the final result message
      if (message.type === "result") {
        resultMessage = message as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
      }
    }

    // Calculate duration from start time
    const duration = Date.now() - startTime;

    // Handle missing result message
    if (!resultMessage) {
      return createErrorResponse(
        "INVALID_RESPONSE_FORMAT",
        "No result message received from Agent SDK",
        { duration },
        false
      ) as AgentResponse<T>;
    }

    // Handle error subtypes (error_during_execution, error_max_turns)
    if (resultMessage.subtype !== "success") {
      const errorResult = resultMessage as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage & {
        subtype: string;
        errors?: string[];
      };
      return createErrorResponse(
        "EXECUTION_FAILED",
        `Agent SDK execution failed: ${errorResult.subtype}`,
        {
          errors: errorResult.errors ?? [],
          subtype: errorResult.subtype,
        },
        errorResult.subtype === "error_max_turns" // Recoverable if just hit turn limit
      ) as AgentResponse<T>;
    }

    // Extract usage from result
    const usage = {
      input_tokens: resultMessage.usage?.input_tokens ?? 0,
      output_tokens: resultMessage.usage?.output_tokens ?? 0,
    };

    // Extract data from result (prefer structured_output, fallback to result)
    const data = (resultMessage.structured_output ?? resultMessage.result) as T;

    // Return success response with metadata
    return createSuccessResponse(data, {
      agentId: this.id,
      timestamp: Date.now(),
      duration,
      usage,
      toolCalls: toolCallCount,
    });
  }

  /**
   * Register MCP servers and return available tools
   *
   * Registers MCP servers with the internal MCPHandler and returns
   * discovered tools in MCP format. Also converts tools to SDK format
   * and stores the configuration for use in execute().
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools in MCP format
   * @remarks
   * Implemented in P2.M1.T1.S7
   *
   * @example
   * ```ts
   * const provider = new AnthropicProvider();
   * await provider.initialize();
   *
   * const tools = await provider.registerMCPs([
   *   {
   *     name: 'filesystem',
   *     transport: 'inprocess',
   *     tools: [
   *       {
   *         name: 'read_file',
   *         description: 'Read a file',
   *         input_schema: {
   *           type: 'object',
   *           properties: { path: { type: 'string' } },
   *           required: ['path']
   *         }
   *       }
   *     ]
   *   }
   * ]);
   *
   * console.log(tools); // [{ name: 'filesystem__read_file', ... }]
   * ```
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // PATTERN: SDK initialization check (follow execute() pattern at lines 197-199)
    // CRITICAL: Validate SDK is loaded before attempting to use it
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // Register each server with the MCPHandler
    // MCPHandler will:
    // - Validate server name uniqueness (throws if duplicate)
    // - Register tools with fullName pattern: serverName__toolName
    // - Create tool executors based on transport type
    for (const server of servers) {
      this.mcpHandler.registerServer(server);
    }

    // Convert to SDK format and store for execute() method
    // toAgentSDKServer() returns McpServerConfig | null
    const sdkConfig = this.mcpHandler.toAgentSDKServer();
    if (sdkConfig) {
      this.mcpServerConfig = sdkConfig;
    }

    // Return discovered tools in MCP format (NOT SDK format)
    // Tools have: { name, description, input_schema }
    // Tool names are prefixed: serverName__toolName
    return this.mcpHandler.getTools();
  }

  /**
   * Load skills into the provider
   *
   * Skills are read from SKILL.md files in each skill directory and combined
   * into a formatted system prompt fragment for injection during execute().
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
   * const provider = new AnthropicProvider();
   * await provider.initialize();
   * await provider.loadSkills([
   *   { name: 'math-expert', path: '/skills/math' },
   *   { name: 'code-reviewer', path: '/skills/code' }
   * ]);
   * ```
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // PATTERN: SDK initialization check (follow execute() pattern at lines 219-223)
    // CRITICAL: Validate SDK is loaded before proceeding
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
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
        // PATTERN: Wrap errors with context (follow registerMCPs pattern)
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
   * the Anthropic SDK's systemPrompt parameter.
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
    const spec = parseModelSpec(model, "anthropic");

    // Provider-specific validation
    if (spec.provider !== this.id) {
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
          `Use ProviderRegistry.get('${spec.provider}') instead.`,
      );
    }

    return spec;
  }
}
