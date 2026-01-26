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
 * - **Sessions**: Session-based state via abstraction layer
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
  SessionState,
} from "../types/providers.js";
import type { AgentResponse } from "../types/agent.js";
import { createSuccessResponse, createErrorResponse } from "../types/agent.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import {
  MemorySessionStore,
  FileSessionStore,
  type SessionStore,
} from "./session-store.js";
import { MCPHandler } from "../core/mcp-handler.js";
import { parseModelSpec } from "../utils/model-spec.js";
import { readFile } from "fs/promises";
import { join } from "path";
import type { StreamEvent } from "../types/streaming.js";

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
    /** Session-based state (via abstraction layer) */
    sessions: true,
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
  private mcpServerConfig:
    | import("@anthropic-ai/claude-agent-sdk").McpServerConfig
    | null = null;

  /**
   * Combined skills prompt for injection into system prompts
   *
   * Stores the formatted skills content from loadSkills() for injection
   * into system prompts during execute() calls. Skills are combined with
   * markdown headers and separators.
   *
   * @internal
   */
  private skillsPrompt: string = "";

  /**
   * Session storage backend
   *
   * Manages session state using pluggable storage backends. Defaults to
   * in-memory storage but can be configured with file-based, Redis, or
   * custom implementations via ProviderOptions or setSessionStore().
   *
   * @internal
   */
  private sessionStore: SessionStore<SessionState> = new MemorySessionStore();

  /**
   * Session TTL in milliseconds from ProviderOptions
   *
   * @internal
   */
  private sessionTtl?: number;

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

    // Handle session store configuration
    // Priority: sessionStore (direct injection) > sessionPersistence (declarative)
    if (options?.sessionStore) {
      // Direct injection (backward compatibility)
      this.sessionStore = options.sessionStore;
      // Store sessionTtl for cleanup operations
      this.sessionTtl = options.sessionTtl ?? 86400000; // 24 hours default
    } else if (options?.sessionPersistence) {
      // Create SessionStore from sessionPersistence option
      switch (options.sessionPersistence) {
        case "memory":
          this.sessionStore = new MemorySessionStore<SessionState>();
          break;
        case "file": {
          const path = options.sessionPath ?? "./sessions";
          const ttl = options.sessionTtl ?? 86400000; // 24 hours default
          this.sessionTtl = ttl;
          this.sessionStore = new FileSessionStore<SessionState>(path, ttl);
          break;
        }
        case "redis":
          throw new Error(
            'Redis session storage not yet implemented. Use sessionPersistence: "memory" or "file", or provide a custom sessionStore instance.',
          );
        default: {
          // Exhaustive check - TypeScript will error if missing case
          const _exhaustiveCheck: never = options.sessionPersistence;
          throw new Error(`Unknown session persistence type: ${_exhaustiveCheck}`);
        }
      }
    } else {
      // If neither sessionStore nor sessionPersistence provided, keep existing default (MemorySessionStore)
      this.sessionTtl = options?.sessionTtl ?? 86400000; // 24 hours default
    }

    // Restore sessions from persistent store (non-memory stores)
    // For persistent stores (File, Redis, custom), verify the store is accessible
    if (!(this.sessionStore instanceof MemorySessionStore)) {
      const sessionIds = await this.sessionStore.list();
      // Sessions are already in store - no need to load into memory
      // Just verify store is accessible by listing sessions

      // Cleanup expired sessions on initialization for persistent stores
      if (this.sessionTtl !== undefined && 'deleteExpired' in this.sessionStore) {
        const deletedIds = await this.sessionStore.deleteExpired(this.sessionTtl);
        if (deletedIds.length > 0) {
          // Log cleanup (optional, for debugging)
          console.debug(`Cleaned up ${deletedIds.length} expired sessions`);
        }
      }
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
    // - options.sessionStore: Configured above for persistent storage
    // - options.sessionPersistence: Creates appropriate SessionStore instance
    // - options.sessionPath: Custom path for FileSessionStore
    // - options.sessionTtl: Reserved for future TTL enforcement (P2.M2.T2.S2)
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
    this.skillsPrompt = "";

    // Clear session storage only for MemorySessionStore
    // Persistent stores (File, Redis, custom) keep sessions after termination
    if (this.sessionStore instanceof MemorySessionStore) {
      await this.sessionStore.clear();
    }
    // For persistent stores, sessions remain in storage

    // GOTCHA: No return value needed - Promise<void> is implicit
    // GOTCHA: No throws possible from null check and assignment
  }

  /**
   * Execute a prompt request
   *
   * Constructs the SDK query from ProviderRequest and executes it via the Anthropic SDK.
   *
   * When options.streaming is true, returns an AsyncGenerator that yields StreamEvent objects.
   * When options.streaming is false or undefined, returns a complete AgentResponse.
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools (used in P2.M1.T1.S6)
   * @param hooks - Optional lifecycle hooks (adapter in P2.M1.T2.S1)
   * @returns Typed agent response or AsyncGenerator for streaming
   * @remarks
   * P2.M1.T1.S5: Query construction - builds AgentSDKOptions and calls SDK query()
   * P2.M1.T1.S6: Message iteration - iterates AsyncGenerator and builds AgentResponse
   * Streaming: Returns AsyncGenerator<StreamEvent> when options.streaming = true
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ):
    | Promise<AgentResponse<T>>
    | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    // STREAMING MODE: Check if streaming is enabled
    // When options.streaming is true, return an AsyncGenerator that yields StreamEvent objects
    if (request.options.streaming) {
      // PATTERN: SDK initialization check (follow initialize() pattern at lines 107-110)
      // CRITICAL: Validate SDK is loaded before attempting to use it
      if (!this.sdk) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }
      return this.executeStreaming<T>(request, toolExecutor, hooks);
    }

    // NON-STREAMING MODE: Wrap in async IIFE to return Promise<AgentResponse<T>>
    // Note: This function is not 'async' because it needs to return either Promise or AsyncGenerator
    // The non-streaming path is wrapped in an async IIFE to return a Promise
    return (async (): Promise<AgentResponse<T>> => {
      // PATTERN: SDK initialization check (follow initialize() pattern at lines 107-110)
      // CRITICAL: Validate SDK is loaded before attempting to use it
      if (!this.sdk) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      // P2.M2.T1.S2: Session detection and retrieval
      // Extract sessionId from request options and retrieve session state
      const sessionId = request.options.sessionId;
      let session: SessionState | undefined;
      let isContinuation = false;

      if (sessionId) {
        session = await this.getSession(sessionId);

        // Check if this is a continuation (existing history)
        // Only continue if session exists and has history
        if (session && session.history.length > 0) {
          isContinuation = true;
        }

        // P2.M2.T1.S2: Create session if it doesn't exist (lazy session creation)
        // Session will be populated with user messages during message iteration
        if (!session) {
          await this.createSession(sessionId);
          session = await this.getSession(sessionId);
        }
      }

      // PATTERN: Model resolution using normalizeModel()
      // FROM: src/providers/anthropic-provider.ts:246-259
      // Default model from src/core/agent.ts:320
      const modelSpec = this.normalizeModel(
        request.options.model ?? "claude-sonnet-4-20250514",
      );

      // PATTERN: Convert Provider hooks to SDK hooks
      // Adapts ProviderHookEvents to SDK-compatible format for use in query()
      const sdkHooks = this.buildAgentSDKHooks(hooks);

      // PATTERN: AgentSDKOptions construction (EXACT pattern from src/core/agent.ts:397-426)
      // CRITICAL: Map ProviderRequest fields to SDK Options format
      const sdkOptions = {
        // Model mapping
        model: modelSpec.model,

        // System prompt mapping (from src/core/agent.ts:317-318)
        // CRITICAL: Inject loaded skills via buildSystemPromptWithSkills() helper
        systemPrompt: this.buildSystemPromptWithSkills(
          request.options.systemPrompt,
        ),

        // P2.M2.T1.S2: Continue flag for session continuation
        // CRITICAL: When continuing, SDK expects continue: true AND streamInput() with history
        ...(isContinuation && { continue: true }),

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

        // Hooks integration (from P2.M1.T2.S1)
        // Include converted hooks if any were mapped
        ...(Object.keys(sdkHooks).length > 0 && {
          hooks: sdkHooks,
        }),
      };

      // PATTERN: Start time tracking for duration calculation
      // FROM: src/core/agent.ts line 406
      const startTime = Date.now();

      // PATTERN: SDK query() call (EXACT pattern from src/core/agent.ts:431)
      // CRITICAL: query() returns AsyncGenerator<SDKMessage> (not Promise!)
      // Do NOT await the query() call - it returns the generator synchronously
      // P2.M2.T1.S2: For continuation, use empty prompt (history comes via streamInput)
      const queryResult = this.sdk!.query({
        prompt: isContinuation ? "" : request.prompt,
        options: sdkOptions,
      });

      // P2.M2.T1.S2: Stream session history for continuation
      // CRITICAL: continue: true alone is insufficient - must also call streamInput() with history
      if (isContinuation && session) {
        await queryResult.streamInput(
          (async function* historyStream() {
            for (const msg of session!.history) {
              yield msg;
            }
          })(),
        );

        // Stream new user message for continuation
        // CRITICAL: New message also goes via streamInput(), not prompt parameter
        await queryResult.streamInput(
          (async function* newMessageStream() {
            yield {
              type: "user",
              message: { content: request.prompt },
              parent_tool_use_id: null,
              session_id: session!.history[0]?.session_id ?? "",
            } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage;
          })(),
        );
      }

      // PATTERN: Message iteration and AgentResponse construction
      // FROM: src/core/agent.ts lines 437-492
      let resultMessage:
        | import("@anthropic-ai/claude-agent-sdk").SDKResultMessage
        | null = null;
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

        // P2.M2.T1.S2: Capture user messages and append to session history
        // CRITICAL: User messages must be accumulated for next turn's streamInput()
        if (message.type === "user" && session && sessionId) {
          session.history.push(
            message as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage,
          );

          // CRITICAL: Save back to store for persistent stores
          // FileSessionStore returns copies - must save after mutation
          if (!(this.sessionStore instanceof MemorySessionStore)) {
            await this.sessionStore.save(sessionId, session);
          }
        }

        // Capture the final result message
        if (message.type === "result") {
          resultMessage =
            message as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;

          // P2.M2.T1.S2: Update session lastResult with latest execution result
          if (session && sessionId) {
            session.lastResult = resultMessage;

            // CRITICAL: Save back to store for persistent stores
            if (!(this.sessionStore instanceof MemorySessionStore)) {
              await this.sessionStore.save(sessionId, session);
            }
          }
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
          false,
        ) as AgentResponse<T>;
      }

      // Handle error subtypes (error_during_execution, error_max_turns)
      if (resultMessage.subtype !== "success") {
        const errorResult =
          resultMessage as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage & {
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
          errorResult.subtype === "error_max_turns", // Recoverable if just hit turn limit
        ) as AgentResponse<T>;
      }

      // Extract usage from result
      const usage = {
        input_tokens: resultMessage.usage?.input_tokens ?? 0,
        output_tokens: resultMessage.usage?.output_tokens ?? 0,
      };

      // Extract data from result (prefer structured_output, fallback to result)
      const data = (resultMessage.structured_output ??
        resultMessage.result) as T;

      // Return success response with metadata
      return createSuccessResponse(data, {
        agentId: this.id,
        timestamp: Date.now(),
        duration,
        usage,
        toolCalls: toolCallCount,
      });
    })();
  }

  /**
   * Execute a prompt request with streaming
   *
   * Returns an AsyncGenerator that yields StreamEvent objects during execution.
   * Implements streaming mode for real-time response generation.
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns AsyncGenerator yielding StreamEvent objects, returning final AgentResponse
   * @private
   * @remarks
   * Streaming mode implementation following PRP P4.M2.T1.S4 specification.
   */
  private async *executeStreaming<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents,
  ): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    // SDK initialization check (required by TypeScript strict mode)
    // The caller (execute) already checks this, but we need to assert here
    // for TypeScript's control flow analysis across method boundaries
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // P2.M2.T1.S2: Session detection and retrieval
    const sessionId = request.options.sessionId;
    let session: SessionState | undefined;
    let isContinuation = false;

    if (sessionId) {
      session = await this.getSession(sessionId);
      if (session && session.history.length > 0) {
        isContinuation = true;
      }
      if (!session) {
        await this.createSession(sessionId);
        session = await this.getSession(sessionId);
      }
    }

    // Model resolution
    const modelSpec = this.normalizeModel(
      request.options.model ?? "claude-sonnet-4-20250514",
    );

    // Build SDK hooks
    const sdkHooks = this.buildAgentSDKHooks(hooks);

    // Build SDK options
    const sdkOptions = {
      model: modelSpec.model,
      systemPrompt: this.buildSystemPromptWithSkills(
        request.options.systemPrompt,
      ),
      ...(isContinuation && { continue: true }),
      ...(request.options.tools &&
        request.options.tools.length > 0 && {
          allowedTools: request.options.tools.map((t) => t.name),
        }),
      ...(this.mcpServerConfig && {
        mcpServers: {
          "groundswell-mcp": this.mcpServerConfig,
        },
      }),
      ...(Object.keys(sdkHooks).length > 0 && {
        hooks: sdkHooks,
      }),
    };

    const startTime = Date.now();

    // Yield metadata event first
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,
        model: modelSpec.model,
        provider: this.id,
      },
    };

    // Create SDK query
    const queryResult = this.sdk.query({
      prompt: isContinuation ? "" : request.prompt,
      options: sdkOptions,
    });

    // Stream session history for continuation
    if (isContinuation && session) {
      await queryResult.streamInput(
        (async function* historyStream() {
          for (const msg of session!.history) {
            yield msg;
          }
        })(),
      );

      await queryResult.streamInput(
        (async function* newMessageStream() {
          yield {
            type: "user",
            message: { content: request.prompt },
            parent_tool_use_id: null,
            session_id: session!.history[0]?.session_id ?? "",
          } as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage;
        })(),
      );
    }

    let resultMessage:
      | import("@anthropic-ai/claude-agent-sdk").SDKResultMessage
      | null = null;
    let toolCallCount = 0;
    let fullText = "";
    let textIndex = 0;

    // Iterate over the AsyncGenerator of SDK messages
    for await (const message of queryResult) {
      // Process assistant messages for text content
      if (message.type === "assistant") {
        const content = message.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              // Yield text delta event
              const text = block.text;
              if (text && text !== fullText) {
                const delta = text.slice(fullText.length);
                fullText = text;
                yield {
                  type: "text_delta",
                  delta,
                  index: textIndex++,
                };
              }
            } else if (block.type === "tool_use") {
              toolCallCount++;
              // Yield tool call start event
              yield {
                type: "tool_call_start",
                id: block.id,
                name: block.name,
                index: 0,
              };
              // Tool execution happens via SDK, toolExecutor is called through hooks
              // Yield tool call done event
              yield {
                type: "tool_call_done",
                id: block.id,
                result: null, // Results come back in subsequent messages
              };
            }
          }
        }
      }

      // Capture user messages for session history
      if (message.type === "user" && session && sessionId) {
        session.history.push(
          message as import("@anthropic-ai/claude-agent-sdk").SDKUserMessage,
        );

        // CRITICAL: Save back to store for persistent stores
        if (!(this.sessionStore instanceof MemorySessionStore)) {
          await this.sessionStore.save(sessionId, session);
        }
      }

      // Capture the final result message
      if (message.type === "result") {
        resultMessage =
          message as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage;
        if (session && sessionId) {
          session.lastResult = resultMessage;

          // CRITICAL: Save back to store for persistent stores
          if (!(this.sessionStore instanceof MemorySessionStore)) {
            await this.sessionStore.save(sessionId, session);
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    // Handle missing result message
    if (!resultMessage) {
      yield {
        type: "error",
        error: new Error("No result message received from Agent SDK"),
        code: "INVALID_RESPONSE_FORMAT",
        retryable: false,
      };
      throw new Error("No result message received from Agent SDK");
    }

    // Handle error subtypes
    if (resultMessage.subtype !== "success") {
      const errorResult =
        resultMessage as import("@anthropic-ai/claude-agent-sdk").SDKResultMessage & {
          subtype: string;
          errors?: string[];
        };
      yield {
        type: "error",
        error: new Error(`Agent SDK execution failed: ${errorResult.subtype}`),
        code: "EXECUTION_FAILED",
        retryable: errorResult.subtype === "error_max_turns",
      };
      throw new Error(`Agent SDK execution failed: ${errorResult.subtype}`);
    }

    // Yield usage event
    if (resultMessage.usage) {
      yield {
        type: "usage",
        inputTokens: resultMessage.usage.input_tokens ?? 0,
        outputTokens: resultMessage.usage.output_tokens ?? 0,
        cacheTokens:
          resultMessage.usage.cache_read_tokens ??
          resultMessage.usage.cache_write_tokens,
      };
    }

    // Yield done event
    yield {
      type: "done",
      finishReason: "stop",
    };

    // Extract data and return final AgentResponse
    const data = (resultMessage.structured_output ?? resultMessage.result) as T;
    return createSuccessResponse(data, {
      agentId: this.id,
      timestamp: Date.now(),
      duration,
      usage: {
        input_tokens: resultMessage.usage?.input_tokens ?? 0,
        output_tokens: resultMessage.usage?.output_tokens ?? 0,
      },
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
      this.skillsPrompt = "";
      return;
    }

    // Load each skill's SKILL.md content
    const skillContents: string[] = [];

    for (const skill of skills) {
      try {
        // GOTCHA: Skill.path is directory, must join with 'SKILL.md'
        const skillMdPath = join(skill.path, "SKILL.md");
        const content = await readFile(skillMdPath, "utf-8");

        // Format skill with markdown header
        skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
      } catch (error) {
        // PATTERN: Wrap errors with context (follow registerMCPs pattern)
        throw new Error(
          `Failed to load skill '${skill.name}' from ${skill.path}: ` +
            `${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Combine all skills with markdown separator
    // PATTERN: Use "\n\n---\n\n" for visual clarity (horizontal rule)
    this.skillsPrompt = skillContents.join("\n\n---\n\n");
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
      return baseSystemPrompt ?? "";
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
   * Build Agent SDK hooks from Provider hook events
   *
   * Adapts ProviderHookEvents to Anthropic Agent SDK-compatible hook format.
   * Transforms signatures between Provider and SDK hook formats and handles
   * async/sync hook execution.
   *
   * @param hooks - Optional provider hook events to adapt
   * @returns SDK-compatible hooks object with HookCallbackMatcher arrays
   * @internal
   * @remarks
   * Hook mapping:
   * - onToolStart → PreToolUse
   * - onToolEnd → PostToolUse
   * - onSessionStart → SessionStart
   * - onSessionEnd → SessionEnd
   *
   * Each adapter returns { continue: true } for SDK compatibility.
   * Duration values are set to 0 as SDK doesn't provide them in hook input.
   */
  private buildAgentSDKHooks(
    hooks?: ProviderHookEvents,
  ): Partial<
    Record<
      typeof this.sdk extends null
        ? never
        : import("@anthropic-ai/claude-agent-sdk").HookEvent,
      import("@anthropic-ai/claude-agent-sdk").HookCallbackMatcher[]
    >
  > {
    // Early return: no hooks to convert
    if (!hooks) {
      return {};
    }

    const sdkHooks: Partial<
      Record<
        typeof this.sdk extends null
          ? never
          : import("@anthropic-ai/claude-agent-sdk").HookEvent,
        import("@anthropic-ai/claude-agent-sdk").HookCallbackMatcher[]
      >
    > = {};

    // Map onToolStart → PreToolUse
    if (hooks.onToolStart) {
      sdkHooks[
        "PreToolUse" as import("@anthropic-ai/claude-agent-sdk").HookEvent
      ] = [
        {
          hooks: [
            async (input, _toolUseID, _options) => {
              const preInput =
                input as import("@anthropic-ai/claude-agent-sdk").PreToolUseHookInput;
              const toolRequest = {
                name: preInput.tool_name,
                input: preInput.tool_input,
              };
              await hooks.onToolStart!(toolRequest);
              return { continue: true };
            },
          ],
        },
      ];
    }

    // Map onToolEnd → PostToolUse
    if (hooks.onToolEnd) {
      sdkHooks[
        "PostToolUse" as import("@anthropic-ai/claude-agent-sdk").HookEvent
      ] = [
        {
          hooks: [
            async (input, _toolUseID, _options) => {
              const postInput =
                input as import("@anthropic-ai/claude-agent-sdk").PostToolUseHookInput;
              const toolRequest = {
                name: postInput.tool_name,
                input: postInput.tool_input,
              };
              const toolResult = {
                content: postInput.tool_response,
                isError: false, // SDK limitation - always false
              };
              const duration = 0; // SDK limitation - duration not available
              await hooks.onToolEnd!(toolRequest, toolResult, duration);
              return { continue: true };
            },
          ],
        },
      ];
    }

    // Map onSessionStart → SessionStart
    if (hooks.onSessionStart) {
      sdkHooks[
        "SessionStart" as import("@anthropic-ai/claude-agent-sdk").HookEvent
      ] = [
        {
          hooks: [
            async (_input, _toolUseID, _options) => {
              await hooks.onSessionStart!();
              return { continue: true };
            },
          ],
        },
      ];
    }

    // Map onSessionEnd → SessionEnd
    if (hooks.onSessionEnd) {
      sdkHooks[
        "SessionEnd" as import("@anthropic-ai/claude-agent-sdk").HookEvent
      ] = [
        {
          hooks: [
            async (_input, _toolUseID, _options) => {
              const totalDuration = 0; // SDK limitation - duration not available
              await hooks.onSessionEnd!(totalDuration);
              return { continue: true };
            },
          ],
        },
      ];
    }

    return sdkHooks;
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

  /**
   * Create a new session with the specified ID
   *
   * Initializes empty session state for the given session ID.
   * If session already exists, this is a no-op (idempotent).
   *
   * @param sessionId - Unique identifier for the session
   * @throws {Error} If SDK is not initialized
   * @remarks
   * Session will be used when execute() receives matching sessionId in options.
   */
  async createSession(sessionId: string): Promise<void> {
    // PATTERN: SDK initialization check (follow execute() pattern at lines 219-223)
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    // PATTERN: Idempotent operation (follow initialize() pattern)
    // Only create if doesn't exist
    const exists = await this.sessionStore.has(sessionId);
    if (!exists) {
      const now = Date.now();
      const emptyState: SessionState = {
        history: [],
        lastResult: null,
        createdAt: now,
        lastAccessedAt: now,
      };
      await this.sessionStore.save(sessionId, emptyState);
    }
    // If exists, do nothing (idempotent)
  }

  /**
   * Get session state for the specified ID
   *
   * Retrieves the current session state including conversation history
   * and last result. Returns undefined if session doesn't exist.
   *
   * @param sessionId - Session identifier to retrieve
   * @returns Session state or undefined if not found
   * @remarks
   * Updates lastAccessedAt timestamp and saves back to persistent stores.
   */
  async getSession(sessionId: string): Promise<SessionState | undefined> {
    const state = await this.sessionStore.load(sessionId);
    if (state) {
      // Update lastAccessedAt timestamp
      state.lastAccessedAt = Date.now();
      // Save back to store for persistent stores
      if (!(this.sessionStore instanceof MemorySessionStore)) {
        await this.sessionStore.save(sessionId, state);
      }
    }
    // Convert null to undefined for consistency
    return state ?? undefined;
  }

  /**
   * Delete a session
   *
   * Removes the session from storage. If the session doesn't exist,
   * returns false.
   *
   * @param sessionId - Session identifier to delete
   * @returns true if deleted, false if not found
   * @throws {Error} If SDK is not initialized
   * @remarks
   * This is a destructive operation - deleted sessions cannot be recovered
   * unless the store has backup/retention policies.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // PATTERN: SDK initialization check
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    return await this.sessionStore.delete(sessionId);
  }
}
