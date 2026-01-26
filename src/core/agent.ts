/**
 * Agent - Multi-provider agent for LLM prompt execution
 *
 * Agents execute prompts via provider abstraction layer, supporting
 * multiple LLM providers (Anthropic, OpenCode, etc.) with unified
 * configuration cascade and tool delegation.
 */

import { z } from 'zod';
import type {
  AgentConfig,
  PromptOverrides,
  Tool,
  AgentHooks,
  TokenUsage,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
  WorkflowEvent,
  AgentResponse,
  AgentResponseMetadata,
} from '../types/index.js';
import {
  createSuccessResponse,
  createErrorResponse,
  AgentResponseSchema,
} from '../types/index.js';
import type { Prompt } from './prompt.js';
import { MCPHandler } from './mcp-handler.js';
import { generateId } from '../utils/id.js';
import { getExecutionContext } from './context.js';
import { generateCacheKey, defaultCache } from '../cache/index.js';
import type { CacheKeyInputs } from '../cache/index.js';
import type {
  ProviderId,
  ProviderOptions,
  ProviderRequest,
  ProviderHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
} from '../types/providers.js';
import { ProviderRegistry } from '../providers/index.js';
import type { Provider } from '../types/providers.js';
import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
import type { AsyncStream, StreamEvent } from '../types/streaming.js';

/**
 * Result from a prompt execution including metadata
 */
export interface PromptResult<T> {
  /** Validated response data */
  data: T;
  /** Token usage from the API */
  usage: TokenUsage;
  /** Total duration in milliseconds */
  duration: number;
  /** Number of tool invocations */
  toolCalls: number;
}

/**
 * Agent class - executes prompts via Anthropic Agent SDK
 */
export class Agent {
  /** Unique identifier for this agent instance */
  public readonly id: string;

  /** Agent name */
  public readonly name: string;

  /** Stored configuration */
  private readonly config: AgentConfig;

  /** MCP handler for tool management */
  private readonly mcpHandler: MCPHandler;

  /** Direct MCPHandler instances for delegated execution */
  private readonly mcpHandlers: MCPHandler[] = [];

  /** Default model to use */
  private readonly model: string;

  /** Provider to use for this agent (optional) */
  private readonly providerId?: ProviderId;

  /** Provider-specific options for this agent (optional) */
  private readonly providerOptions?: ProviderOptions;

  /** Provider instance from registry (resolved at construction) */
  private readonly provider: Provider;

  /**
   * Create a new Agent instance
   * @param config Agent configuration
   */
  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';

    // Store provider configuration from AgentConfig
    // Full provider resolution (global + agent + prompt) happens later during execution
    this.providerId = config.provider;
    this.providerOptions = config.providerOptions;

    // Resolve effective provider using configuration cascade
    // Priority: agent provider -> global default provider
    const globalConfig = getGlobalProviderConfig();
    const resolved = resolveProviderConfig(
      globalConfig,
      this.providerId,
      this.providerOptions
    );
    const effectiveProvider = resolved.provider;

    // Get provider instance from registry
    const registry = ProviderRegistry.getInstance();
    const providerInstance = registry.get(effectiveProvider);
    if (!providerInstance) {
      throw new Error(`Provider '${effectiveProvider}' is not registered`);
    }
    this.provider = providerInstance;

    // Initialize MCP handler
    this.mcpHandler = new MCPHandler();

    // Register MCP servers
    if (config.mcps) {
      for (const mcp of config.mcps) {
        // If the MCP is already an MCPHandler instance, store it directly
        // for delegated tool execution (preserves registered executors)
        if (mcp instanceof MCPHandler) {
          this.mcpHandlers.push(mcp);
        }
        // Always register with main handler for tool discovery
        this.mcpHandler.registerServer(mcp);
      }
    }
  }

  /**
   * Execute tool via MCPHandler delegation
   *
   * This method implements the ToolExecutor callback signature for provider
   * integration. Providers delegate tool execution back to the Agent's
   * MCPHandler, maintaining centralized tool management.
   *
   * Tool names use the serverName__toolName format (double underscore)
   * created during MCP server registration. The full name is passed
   * directly to MCPHandler without parsing.
   *
   * ## Tool Resolution Order
   *
   * 1. Delegated handlers (this.mcpHandlers[]) - Custom MCPHandler instances
   * 2. Main handler (this.mcpHandler) - Primary tool registry
   *
   * ## Error Handling
   *
   * Tool errors are returned in ToolExecutionResult format with isError: true.
   * The method never throws - errors are wrapped in result objects.
   *
   * @param req - Tool execution request with name (serverName__toolName) and input
   * @returns Promise resolving to tool execution result with content and error flag
   * @private
   * @remarks
   * Used internally by provider.execute() for tool delegation.
   * Tool execution flow: Provider → Agent.toolExecutor → MCPHandler.executeTool()
   */
  private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    try {
      // Check delegated MCPHandlers first (preserve custom executors)
      for (const handler of this.mcpHandlers) {
        if (handler.hasTool(req.name)) {
          const toolResult = await handler.executeTool(req.name, req.input);
          return this.convertToToolExecutionResult(toolResult);
        }
      }

      // Check main MCPHandler
      if (this.mcpHandler.hasTool(req.name)) {
        const toolResult = await this.mcpHandler.executeTool(req.name, req.input);
        return this.convertToToolExecutionResult(toolResult);
      }

      // Tool not found in any handler
      return {
        content: `Tool '${req.name}' not found`,
        isError: true,
      };
    } catch (error) {
      // Handle unexpected errors (defensive programming)
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: `Tool execution error: ${message}`,
        isError: true,
      };
    }
  }

  /**
   * Convert MCPHandler ToolResult to ToolExecutionResult
   *
   * Maps the MCPHandler's internal ToolResult format to the
   * provider-facing ToolExecutionResult format.
   *
   * Tries to parse JSON strings back to objects for better usability.
   *
   * @param toolResult - Result from MCPHandler.executeTool()
   * @returns ToolExecutionResult with content and isError flag
   * @private
   */
  private convertToToolExecutionResult(toolResult: {
    type: 'tool_result';
    tool_use_id: string;
    content: string | unknown;
    is_error?: boolean;
  }): ToolExecutionResult {
    let content: string | unknown = toolResult.content;

    // If content is a string, try to parse it as JSON
    // This restores objects that were stringified by MCPHandler.executeTool()
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        // Only use parsed value if it's an object or array (not primitive)
        if (typeof parsed === 'object' && parsed !== null) {
          content = parsed;
        }
      } catch {
        // Content is not valid JSON, keep original string
      }
    }

    return {
      content,
      isError: toolResult.is_error ?? false,
    };
  }

  /**
   * Execute a prompt and return validated response
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns AgentResponse containing validated response or error
   */
  public async prompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    return this.executePrompt(prompt, overrides);
  }

  /**
   * Execute a prompt with full result metadata
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns Full result including metadata
   * @deprecated Use prompt() which now returns AgentResponse with metadata
   */
  public async promptWithMetadata<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<PromptResult<T>> {
    const response = await this.executePrompt(prompt, overrides);
    // Convert AgentResponse back to PromptResult for backward compatibility
    if (response.status === 'error') {
      throw new Error(response.error?.message ?? 'Unknown error');
    }
    return {
      data: response.data as T, // Type assertion: data is T when status is not 'error'
      usage: response.metadata.usage ?? { input_tokens: 0, output_tokens: 0 },
      duration: response.metadata.duration ?? 0,
      toolCalls: response.metadata.toolCalls ?? 0,
    };
  }

  /**
   * Execute a prompt with reflection capabilities
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns AgentResponse containing validated response or error
   */
  public async reflect<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    // Add reflection system prefix if reflection is enabled
    const reflectionEnabled =
      prompt.enableReflection ??
      overrides?.enableReflection ??
      this.config.enableReflection;

    const systemPrefix = reflectionEnabled
      ? 'Before answering, reflect on your reasoning step by step. Consider alternative approaches and potential errors. Then provide your final answer.\n\n'
      : '';

    const effectiveOverrides: PromptOverrides = {
      ...overrides,
      system:
        systemPrefix +
        (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
    };

    return this.executePrompt(prompt, effectiveOverrides);
  }

  /**
   * Execute a prompt with streaming response
   *
   * Returns an AsyncStream that yields StreamEvent objects during execution.
   * Enables real-time response generation with text deltas, tool calls, and metadata.
   *
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns AsyncStream with AsyncGenerator for for-await...of consumption
   *
   * @example
   * ```ts
   * const agent = new Agent({ provider: 'anthropic' });
   * const prompt = new Prompt({ user: 'Tell me a story' });
   *
   * const streamResult = agent.stream(prompt);
   *
   * for await (const event of streamResult.stream) {
   *   switch (event.type) {
   *     case 'text_delta':
   *       process.stdout.write(event.delta);
   *       break;
   *     case 'tool_call_start':
   *       console.log(`Tool: ${event.name}`);
   *       break;
   *     case 'done':
   *       console.log('Complete!');
   *       break;
   *     case 'error':
   *       console.error('Error:', event.error.message);
   *       break;
   *   }
   * }
   * ```
   */
  public stream<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): AsyncStream<T> {
    // Extract prompt-level provider overrides
    const promptProvider = overrides?.provider;
    const promptProviderOptions = overrides?.providerOptions;

    // Resolve provider configuration with cascade: global → agent → prompt
    const globalConfig = getGlobalProviderConfig();
    const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
      globalConfig,
      this.providerId,
      this.providerOptions,
      promptProvider,
      promptProviderOptions
    );

    // Get provider instance for resolved provider (may differ from this.provider)
    const registry = ProviderRegistry.getInstance();
    const providerInstance = registry.get(resolvedProvider);
    if (!providerInstance) {
      throw new Error(`Provider '${resolvedProvider}' is not registered`);
    }

    // Capture non-null provider instance for use in closure (TypeScript strict mode requirement)
    const provider = providerInstance;

    // Merge configuration: Prompt > Overrides > Config
    const effectiveSystem =
      prompt.systemOverride ?? overrides?.system ?? this.config.system;

    const effectiveModel = overrides?.model ?? this.model;
    const effectiveMaxTokens = overrides?.maxTokens ?? this.config.maxTokens ?? 4096;
    const effectiveTemperature =
      overrides?.temperature ?? this.config.temperature;

    const effectiveTools = this.mergeTools(
      prompt.toolsOverride ?? overrides?.tools ?? this.config.tools
    );

    const effectiveHooks = this.mergeHooks(
      prompt.hooksOverride,
      overrides?.hooks,
      this.config.hooks
    );

    // Build user message
    const userMessage = prompt.buildUserMessage();

    // Convert Agent.hooks to ProviderHookEvents
    const providerHooks: ProviderHookEvents = {};
    if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
      providerHooks.onToolStart = async (tool: ToolExecutionRequest) => {
        for (const hook of effectiveHooks.preToolUse!) {
          await hook({
            toolName: tool.name,
            toolInput: tool.input as Record<string, unknown>,
            agentId: this.id,
          });
        }
      };
    }
    if (effectiveHooks.postToolUse && effectiveHooks.postToolUse.length > 0) {
      providerHooks.onToolEnd = async (
        tool: ToolExecutionRequest,
        result: ToolExecutionResult,
        duration: number
      ) => {
        for (const hook of effectiveHooks.postToolUse!) {
          await hook({
            toolName: tool.name,
            toolInput: tool.input as Record<string, unknown>,
            toolOutput: result.content,
            agentId: this.id,
            duration,
          });
        }
      };
    }
    if (effectiveHooks.sessionStart && effectiveHooks.sessionStart.length > 0) {
      providerHooks.onSessionStart = async () => {
        for (const hook of effectiveHooks.sessionStart!) {
          await hook({
            agentId: this.id,
            agentName: this.name,
          });
        }
      };
    }
    if (effectiveHooks.sessionEnd && effectiveHooks.sessionEnd.length > 0) {
      providerHooks.onSessionEnd = async (totalDuration: number) => {
        for (const hook of effectiveHooks.sessionEnd!) {
          await hook({
            agentId: this.id,
            agentName: this.name,
            totalDuration,
          });
        }
      };
    }

    // Create AbortController for cancellation support
    const controller = new AbortController();

    // Build ProviderRequest with streaming enabled
    const providerRequest: ProviderRequest = {
      prompt: userMessage,
      options: {
        model: effectiveModel,
        systemPrompt: effectiveSystem,
        tools: effectiveTools,
        sessionId: resolvedProviderOptions.sessionId,
        hooks: providerHooks,
        streaming: true, // CRITICAL: Enable streaming mode
      },
    };

    // Create async generator that wraps provider streaming
    const self = this;
    async function* streamGenerator(): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
      try {
        // Call provider with streaming enabled
        // Provider returns: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>
        const providerResult = provider.execute<T>(
          providerRequest,
          self.toolExecutor.bind(self),
          providerHooks
        );

        // Check if provider returned an AsyncGenerator (streaming mode) directly
        if (Symbol.asyncIterator in providerResult) {
          // Provider is in streaming mode - iterate and yield events
          const providerStream = providerResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
          let finalValue: AgentResponse<T> | undefined;

          for await (const event of providerStream) {
            // Check for cancellation
            if (controller.signal.aborted) {
              yield {
                type: 'error',
                error: new Error('Stream cancelled'),
                code: 'CANCELLED',
                retryable: false,
              };
              // Cancellation: return error response
              return createErrorResponse(
                'CANCELLED',
                'Stream cancelled by user',
                {},
                false
              ) as AgentResponse<T>;
            }

            // Yield event from provider
            yield event;
          }

          // After loop completes, the AsyncGenerator's return value is the final AgentResponse<T>
          // We need to get it by calling next() one more time
          const finalResult = await providerStream.next();
          // The value should be AgentResponse<T> when done=true, but TypeScript sees it as StreamEvent | AgentResponse<T>
          finalValue = finalResult.value as AgentResponse<T>;

          // Return the final response
          return finalValue;
        } else {
          // Provider returned a Promise<AgentResponse<T>> (non-streaming mode)
          // This shouldn't happen with streaming: true, but handle it gracefully
          const responsePromise = providerResult as Promise<AgentResponse<T>>;
          const response = await responsePromise;
          yield {
            type: 'done',
            finishReason: response.status === 'error' ? 'error' : 'stop',
          };
          return response;
        }
      } catch (error) {
        // Yield error event instead of throwing
        yield {
          type: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          code: 'STREAM_ERROR',
          retryable: false,
        };
        // Return error response for AsyncGenerator completion
        return createErrorResponse(
          'STREAM_ERROR',
          error instanceof Error ? error.message : String(error),
          {},
          false
        ) as AgentResponse<T>;
      }
    }

    return {
      stream: streamGenerator.call(this),
      controller,
    };
  }

  /**
   * Get the MCP handler for custom tool registration
   */
  public getMcpHandler(): MCPHandler {
    return this.mcpHandler;
  }

  /**
   * Emit an event if within workflow context
   */
  private emitWorkflowEvent(event: WorkflowEvent): void {
    const ctx = getExecutionContext();
    if (ctx) {
      ctx.emitEvent(event);
    }
  }

  /**
   * Internal prompt execution with full flow using provider abstraction
   */
  private async executePrompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    const requestId = generateId();

    // Get execution context for event emission
    const ctx = getExecutionContext();

    // Extract prompt-level provider overrides
    const promptProvider = overrides?.provider;
    const promptProviderOptions = overrides?.providerOptions;

    // Resolve provider configuration with cascade: global → agent → prompt
    const globalConfig = getGlobalProviderConfig();
    const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
      globalConfig,
      this.providerId,
      this.providerOptions,
      promptProvider,
      promptProviderOptions
    );

    // Get provider instance for resolved provider (may differ from this.provider)
    const registry = ProviderRegistry.getInstance();
    const providerInstance = registry.get(resolvedProvider);
    if (!providerInstance) {
      return createErrorResponse(
        'PROVIDER_NOT_FOUND',
        `Provider '${resolvedProvider}' is not registered`,
        { providerId: resolvedProvider },
        false
      ) as AgentResponse<T>;
    }

    // Capture non-null provider instance for use in closure (TypeScript strict mode requirement)
    const provider = providerInstance;

    // Merge configuration: Prompt > Overrides > Config
    const effectiveSystem =
      prompt.systemOverride ?? overrides?.system ?? this.config.system;

    const effectiveModel = overrides?.model ?? this.model;
    const effectiveMaxTokens = overrides?.maxTokens ?? this.config.maxTokens ?? 4096;
    const effectiveTemperature =
      overrides?.temperature ?? this.config.temperature;

    // Check cache if enabled
    const cacheEnabled = this.config.enableCache && !overrides?.disableCache;
    let cacheKey: string | undefined;

    if (cacheEnabled) {
      const cacheInputs: CacheKeyInputs = {
        user: prompt.buildUserMessage(),
        data: prompt.getData(),
        system: effectiveSystem,
        model: effectiveModel,
        temperature: effectiveTemperature,
        maxTokens: effectiveMaxTokens,
        tools: this.config.tools,
        mcps: this.config.mcps,
        skills: this.config.skills,
        responseFormat: prompt.getResponseFormat(),
      };
      cacheKey = generateCacheKey(cacheInputs);

      const cached = await defaultCache.get(cacheKey) as
        | AgentResponse<T>
        | PromptResult<T>
        | undefined;
      if (cached && 'status' in cached) {
        // New AgentResponse format - has 'status' field
        // Emit cache hit event
        if (ctx) {
          this.emitWorkflowEvent({
            type: 'cacheHit',
            key: cacheKey,
            node: ctx.workflowNode,
          });
        }
        return cached;
      }
      // Old PromptResult format or undefined - re-execute

      // Emit cache miss event
      if (ctx) {
        this.emitWorkflowEvent({
          type: 'cacheMiss',
          key: cacheKey,
          node: ctx.workflowNode,
        });
      }
    }

    // Emit prompt start event if in workflow context
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'agentPromptStart',
        agentId: this.id,
        agentName: this.name,
        promptId: prompt.id,
        node: ctx.workflowNode,
      });
    }

    const effectiveTools = this.mergeTools(
      prompt.toolsOverride ?? overrides?.tools ?? this.config.tools
    );

    const effectiveHooks = this.mergeHooks(
      prompt.hooksOverride,
      overrides?.hooks,
      this.config.hooks
    );

    // Set up environment variables
    const originalEnv = this.setupEnvironment(overrides?.env ?? this.config.env);

    try {
      // Build user message
      const userMessage = prompt.buildUserMessage();

      // Convert Agent.hooks to ProviderHookEvents
      const providerHooks: ProviderHookEvents = {};
      if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
        providerHooks.onToolStart = async (tool: ToolExecutionRequest) => {
          for (const hook of effectiveHooks.preToolUse!) {
            await hook({
              toolName: tool.name,
              toolInput: tool.input as Record<string, unknown>,
              agentId: this.id,
            });
          }
        };
      }
      if (effectiveHooks.postToolUse && effectiveHooks.postToolUse.length > 0) {
        providerHooks.onToolEnd = async (
          tool: ToolExecutionRequest,
          result: ToolExecutionResult,
          duration: number
        ) => {
          for (const hook of effectiveHooks.postToolUse!) {
            await hook({
              toolName: tool.name,
              toolInput: tool.input as Record<string, unknown>,
              toolOutput: result.content,
              agentId: this.id,
              duration,
            });
          }
        };
      }
      if (effectiveHooks.sessionStart && effectiveHooks.sessionStart.length > 0) {
        providerHooks.onSessionStart = async () => {
          for (const hook of effectiveHooks.sessionStart!) {
            await hook({
              agentId: this.id,
              agentName: this.name,
            });
          }
        };
      }
      if (effectiveHooks.sessionEnd && effectiveHooks.sessionEnd.length > 0) {
        providerHooks.onSessionEnd = async (totalDuration: number) => {
          for (const hook of effectiveHooks.sessionEnd!) {
            await hook({
              agentId: this.id,
              agentName: this.name,
              totalDuration,
            });
          }
        };
      }

      // Build ProviderRequest with nested structure
      const providerRequest: ProviderRequest = {
        prompt: userMessage,
        options: {
          model: effectiveModel,
          systemPrompt: effectiveSystem,
          tools: effectiveTools,
          sessionId: resolvedProviderOptions.sessionId,
          hooks: providerHooks,
        },
      };

      // Execute via provider abstraction
      // Provider returns: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>
      // For non-streaming mode, it returns Promise<AgentResponse<T>>
      const providerResult = provider.execute<T>(
        providerRequest,
        this.toolExecutor.bind(this),
        providerHooks
      );

      // Handle the union return type
      const response: AgentResponse<T> = Symbol.asyncIterator in providerResult
        ? (await (async () => {
            // Provider returned AsyncGenerator (shouldn't happen without streaming: true, but handle gracefully)
            const generator = providerResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
            // Consume all events
            for await (const _event of generator) {
              // Discard events, we just want the final response
            }
            const finalResult = await generator.next();
            // The value should be AgentResponse<T> when done=true
            return finalResult.value as AgentResponse<T>;
          })())
        : await (providerResult as Promise<AgentResponse<T>>);

      const duration = Date.now() - startTime;

      // Handle error response from provider
      if (response.status === 'error') {
        // Emit prompt end event if in workflow context
        if (ctx) {
          this.emitWorkflowEvent({
            type: 'agentPromptEnd',
            agentId: this.id,
            agentName: this.name,
            promptId: prompt.id,
            node: ctx.workflowNode,
            duration,
          });
        }
        return response;
      }

      // Validate structured output if prompt has schema
      let validatedResponse: AgentResponse<T>;
      if (prompt.getResponseFormat()) {
        const validationResult = prompt.safeValidateResponse(response.data);
        if (validationResult.success) {
          // Update metadata with agent ID instead of provider ID
          const metadata: AgentResponseMetadata = {
            ...response.metadata,
            agentId: this.id,
          };
          validatedResponse = createSuccessResponse(validationResult.data, metadata);
        } else {
          const zodError = validationResult.error;
          const errorSummary = zodError.errors
            .map((err) => {
              const field = err.path.length > 0 ? err.path.join('.') : 'response';
              return `${field}: ${err.message}`;
            })
            .join('; ');

          validatedResponse = createErrorResponse(
            'VALIDATION_ERROR',
            `Response validation failed: ${errorSummary}`,
            {
              validationErrors: zodError.errors.map((err) => ({
                field: err.path.join('.') || 'root',
                message: err.message,
                code: err.code,
              })),
            },
            false
          ) as AgentResponse<T>;
        }
      } else {
        // No validation schema - use provider response as-is
        validatedResponse = {
          ...response,
          metadata: {
            ...response.metadata,
            agentId: this.id,
          },
        };
      }

      // Emit prompt end event if in workflow context
      if (ctx) {
        this.emitWorkflowEvent({
          type: 'agentPromptEnd',
          agentId: this.id,
          agentName: this.name,
          promptId: prompt.id,
          node: ctx.workflowNode,
          duration,
          tokenUsage: validatedResponse.metadata.usage,
        });
      }

      // Validate before returning (defense-in-depth)
      const finalResponse = this.validateResponse(validatedResponse, prompt.responseFormat);

      // Store in cache if enabled
      if (cacheEnabled && cacheKey) {
        await defaultCache.set(cacheKey, finalResponse, { prefix: this.id });
      }

      return finalResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return createErrorResponse(
        'PROVIDER_EXECUTION_FAILED',
        `Provider execution error: ${message}`,
        { duration, providerId: resolvedProvider },
        true // Provider errors are typically recoverable
      ) as AgentResponse<T>;
    } finally {
      // Restore environment
      this.restoreEnvironment(originalEnv);
    }
  }

  /**
   * Validates an AgentResponse against the schema before returning
   *
   * This provides defense-in-depth validation to ensure all returned responses
   * conform to the AgentResponse schema, even if factory helpers have bugs.
   *
   * @template T - The type of response data
   * @param response - The response to validate
   * @param dataSchema - The Zod schema for the response data (from Prompt.responseFormat)
   * @returns The validated response, or an INTERNAL_ERROR response if validation fails
   *
   * @private
   */
  private validateResponse<T>(
    response: AgentResponse<T>,
    dataSchema: z.ZodTypeAny
  ): AgentResponse<T> {
    // Create schema for this response type
    const schema = AgentResponseSchema(dataSchema);

    // Validate response against schema
    const validation = schema.safeParse(response);

    if (validation.success) {
      // Response is valid, return it unchanged
      return response;
    }

    // Validation failed - this indicates a bug in our code
    // Log detailed error information for debugging
    console.error('Agent response validation failed', {
      agentId: this.id,
      timestamp: Date.now(),
      errorCount: validation.error.errors.length,
      errors: validation.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });

    // Return INTERNAL_ERROR response
    // Use createErrorResponse which is already imported
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Internal response validation failed',
      {
        validationErrors: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      },
      false // Non-recoverable - indicates system bug
    ) as AgentResponse<T>;
  }

  /**
   * Merge tools from config and MCP servers
   */
  private mergeTools(configTools?: Tool[]): Tool[] | undefined {
    const mcpTools = this.mcpHandler.getTools();
    const directTools = configTools ?? [];

    const allTools = [...directTools, ...mcpTools];
    return allTools.length > 0 ? allTools : undefined;
  }

  /**
   * Merge hooks from multiple sources
   */
  private mergeHooks(
    promptHooks?: AgentHooks,
    overrideHooks?: AgentHooks,
    configHooks?: AgentHooks
  ): AgentHooks {
    return {
      preToolUse: [
        ...(configHooks?.preToolUse ?? []),
        ...(overrideHooks?.preToolUse ?? []),
        ...(promptHooks?.preToolUse ?? []),
      ],
      postToolUse: [
        ...(configHooks?.postToolUse ?? []),
        ...(overrideHooks?.postToolUse ?? []),
        ...(promptHooks?.postToolUse ?? []),
      ],
      sessionStart: [
        ...(configHooks?.sessionStart ?? []),
        ...(overrideHooks?.sessionStart ?? []),
        ...(promptHooks?.sessionStart ?? []),
      ],
      sessionEnd: [
        ...(configHooks?.sessionEnd ?? []),
        ...(overrideHooks?.sessionEnd ?? []),
        ...(promptHooks?.sessionEnd ?? []),
      ],
    };
  }

  /**
   * Set up environment variables
   */
  private setupEnvironment(
    env?: Record<string, string>
  ): Record<string, string | undefined> {
    if (!env) return {};

    const original: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(env)) {
      original[key] = process.env[key];
      process.env[key] = value;
    }
    return original;
  }

  /**
   * Restore environment variables
   */
  private restoreEnvironment(original: Record<string, string | undefined>): void {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
