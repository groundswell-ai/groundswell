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
} from '../types/index.js';
import type { Prompt } from './prompt.js';
import { MCPHandler } from './mcp-handler.js';
import { generateId } from '../utils/id.js';
import { validateAgentResponse } from '../utils/agent-validation.js';
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
import { HarnessRegistry } from '../harnesses/index.js';
import type { Harness, HarnessId, HarnessOptions, HarnessRequest, HarnessHookEvents } from '../types/harnesses.js';
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

  /** Harness to use for this agent (resolved at construction) */
  private readonly harnessId?: HarnessId;

  /** Harness-specific options for this agent */
  private readonly harnessOptions?: HarnessOptions;

  /** Harness instance from registry (resolved at construction) */
  private readonly harness: Harness;

  /**
   * Create a new Agent instance
   * @param config Agent configuration (default: { name: 'Agent', model: 'claude-sonnet-4-20250514' })
   */
  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';

    // Store harness configuration from AgentConfig (PRD §7.9).
    // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
    // field so existing callers (`new Agent({ provider: 'anthropic' })`) keep working during the
    // v1.2 migration. The fallback + legacy global-config singleton are removed by T2 (P3.M1.T2)
    // when executePrompt/stream + the test suite move to configureHarnesses/getGlobalHarnessConfig.
    this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);
    this.harnessOptions = config.harnessOptions ?? config.providerOptions;

    // Resolve the effective harness via the configuration cascade (PRD §7.7).
    // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
    // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
    // singleton still consumed by executePrompt/stream + the existing test suite.
    const globalConfig = getGlobalProviderConfig();
    const resolved = resolveProviderConfig(
      globalConfig,
      this.harnessId,
      this.harnessOptions,
    );
    const effectiveHarness = resolved.provider;

    // Fetch the harness instance from HarnessRegistry (the v1.2 rename of ProviderRegistry).
    // The cast bridges the legacy Provider return type to the Harness contract — structurally
    // identical at runtime; the cast exists only because Provider.id is a wider type than Harness.id.
    const registry = HarnessRegistry.getInstance();
    const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
    if (!harnessInstance) {
      throw new Error(`Harness '${effectiveHarness}' is not registered`);
    }
    this.harness = harnessInstance;

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
   * @param prompt Prompt to execute (required)
   * @param overrides Optional overrides for this execution (default: undefined)
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
   * @param prompt Prompt to execute (required)
   * @param overrides Optional overrides for this execution (default: undefined)
   * @returns AgentResponse containing validated response or error
   * @remarks Reflection follows opt-out pattern: enabled by default unless explicitly disabled.
   * When reflection is enabled (prompt.enableReflection, overrides.enableReflection, or
   * config.enableReflection), prefixes system prompt with reflection instructions.
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
    // Extract prompt-level harness overrides (PRD §7.7, §7.9).
    // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
    // field so existing callers (`agent.stream(p, { provider: 'opencode' })`) keep working during
    // the v1.2 migration. The fallback + legacy global-config singleton are removed once
    // PromptOverrides + the test suite are fully on harness vocabulary (later lockstep milestone).
    const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
    const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

    // Resolve the effective harness via the configuration cascade (PRD §7.7): global → agent → prompt.
    // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
    // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
    // singleton still consumed by executePrompt + the existing test suite.
    const globalConfig = getGlobalProviderConfig();
    const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
      globalConfig,
      this.harnessId,
      this.harnessOptions,
      promptHarness,
      promptHarnessOptions
    );

    // Fetch the harness instance from HarnessRegistry (may differ from this.harness when a prompt
    // override is supplied). The cast bridges the legacy Provider return type to the Harness contract
    // — structurally identical at runtime; the cast exists only because Provider.id is wider than Harness.id.
    const registry = HarnessRegistry.getInstance();
    const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
    if (!harnessInstance) {
      // THROW (synchronous at call time, before the generator is created) — preserves the existing
      // .rejects.toThrow(...) contract. Reworded to harness vocab; message still contains the id +
      // 'is not registered' so the updated legacy-test regex still matches.
      throw new Error(`Harness '${resolvedHarness}' is not registered`);
    }

    // Capture non-null harness instance for use in closure (TypeScript strict mode requirement)
    const harness = harnessInstance;

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

    // Convert Agent.hooks to HarnessHookEvents
    const harnessHooks: HarnessHookEvents = {};
    if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
      harnessHooks.onToolStart = async (tool: ToolExecutionRequest) => {
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
      harnessHooks.onToolEnd = async (
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
      harnessHooks.onSessionStart = async () => {
        for (const hook of effectiveHooks.sessionStart!) {
          await hook({
            agentId: this.id,
            agentName: this.name,
          });
        }
      };
    }
    if (effectiveHooks.sessionEnd && effectiveHooks.sessionEnd.length > 0) {
      harnessHooks.onSessionEnd = async (totalDuration: number) => {
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

    // Build HarnessRequest with streaming enabled (PRD §7.3, §7.4). Identical shape to the legacy
    // ProviderRequest — the swap is a type rename (ProviderRequest = HarnessRequest alias).
    // streaming: true flips Harness.execute into AsyncGenerator mode.
    const harnessRequest: HarnessRequest = {
      prompt: userMessage,
      options: {
        model: effectiveModel,
        systemPrompt: effectiveSystem,
        tools: effectiveTools,
        sessionId: resolvedHarnessOptions.sessionId,
        hooks: harnessHooks,
        streaming: true, // CRITICAL: Enable streaming mode
      },
    };

    // Create async generator that wraps harness streaming
    const self = this;
    async function* streamGenerator(): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
      try {
        // Call harness with streaming enabled
        // Harness returns: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>
        const harnessResult = harness.execute<T>(
          harnessRequest,
          self.toolExecutor.bind(self),
          harnessHooks
        );

        // Check if harness returned an AsyncGenerator (streaming mode) directly
        if (Symbol.asyncIterator in harnessResult) {
          // Harness is in streaming mode - iterate and yield events
          const harnessStream = harnessResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
          let finalValue: AgentResponse<T> | undefined;

          for await (const event of harnessStream) {
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

            // Yield event from harness
            yield event;
          }

          // After loop completes, the AsyncGenerator's return value is the final AgentResponse<T>
          // We need to get it by calling next() one more time
          const finalResult = await harnessStream.next();
          // The value should be AgentResponse<T> when done=true, but TypeScript sees it as StreamEvent | AgentResponse<T>
          finalValue = finalResult.value as AgentResponse<T>;

          // Return the final response
          return finalValue;
        } else {
          // Provider returned a Promise<AgentResponse<T>> (non-streaming mode)
          // This shouldn't happen with streaming: true, but handle it gracefully
          const responsePromise = harnessResult as Promise<AgentResponse<T>>;
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
   * @side effects May emit workflow events, may read from/write to cache if enabled,
   * may modify environment variables temporarily, validates response against schema,
   * and stores result in cache if enabled.
   */
  private async executePrompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    const requestId = generateId();

    // Get execution context for event emission
    const ctx = getExecutionContext();

    // Extract prompt-level harness overrides (PRD §7.7, §7.9).
    // Backward-compat bridge: prefer the new `harness` field; fall back to the legacy `provider`
    // field so existing callers (`agent.prompt(p, { provider: 'opencode' })`) keep working during
    // the v1.2 migration. The fallback + legacy global-config singleton are removed once
    // PromptOverrides + the test suite are fully on harness vocabulary (later lockstep milestone).
    const promptHarness = overrides?.harness ?? (overrides?.provider as HarnessId | undefined);
    const promptHarnessOptions = overrides?.harnessOptions ?? overrides?.providerOptions;

    // Resolve the effective harness via the configuration cascade (PRD §7.7): global → agent → prompt.
    // resolveProviderConfig DELEGATES to resolveHarnessConfig (harness-config.ts L367-368);
    // getGlobalProviderConfig is used as the global source to honour the legacy configureProviders()
    // singleton still consumed by stream() + the existing test suite.
    const globalConfig = getGlobalProviderConfig();
    const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
      globalConfig,
      this.harnessId,
      this.harnessOptions,
      promptHarness,
      promptHarnessOptions
    );

    // Fetch the harness instance from HarnessRegistry (may differ from this.harness when a prompt
    // override is supplied). The cast bridges the legacy Provider return type to the Harness contract
    // — structurally identical at runtime; the cast exists only because Provider.id is wider than Harness.id.
    const registry = HarnessRegistry.getInstance();
    const harnessInstance = registry.get(resolvedHarness) as Harness | undefined;
    if (!harnessInstance) {
      return createErrorResponse(
        'PROVIDER_NOT_FOUND',
        `Harness '${resolvedHarness}' is not registered`,
        { harnessId: resolvedHarness },
        false
      ) as AgentResponse<T>;
    }

    // Capture non-null harness instance for use in closure (TypeScript strict mode requirement)
    const harness = harnessInstance;

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

      // Convert AgentHooks → HarnessHookEvents (identical wiring, retyped).
      const harnessHooks: HarnessHookEvents = {};
      if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
        harnessHooks.onToolStart = async (tool: ToolExecutionRequest) => {
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
        harnessHooks.onToolEnd = async (
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
        harnessHooks.onSessionStart = async () => {
          for (const hook of effectiveHooks.sessionStart!) {
            await hook({
              agentId: this.id,
              agentName: this.name,
            });
          }
        };
      }
      if (effectiveHooks.sessionEnd && effectiveHooks.sessionEnd.length > 0) {
        harnessHooks.onSessionEnd = async (totalDuration: number) => {
          for (const hook of effectiveHooks.sessionEnd!) {
            await hook({
              agentId: this.id,
              agentName: this.name,
              totalDuration,
            });
          }
        };
      }

      // Build HarnessRequest with nested structure (PRD §7.3). Identical shape to the legacy
      // ProviderRequest — the swap is a type rename (ProviderRequest = HarnessRequest alias).
      const harnessRequest: HarnessRequest = {
        prompt: userMessage,
        options: {
          model: effectiveModel,
          systemPrompt: effectiveSystem,
          tools: effectiveTools,
          sessionId: resolvedHarnessOptions.sessionId,
          hooks: harnessHooks,
        },
      };

      // Execute via the Harness abstraction (PRD §7.3).
      // Harness returns: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>>
      // For non-streaming mode, it returns Promise<AgentResponse<T>>.
      const harnessResult = harness.execute<T>(
        harnessRequest,
        this.toolExecutor.bind(this),
        harnessHooks
      );

      // Handle the union return type
      const response: AgentResponse<T> = Symbol.asyncIterator in harnessResult
        ? (await (async () => {
            // Harness returned AsyncGenerator (shouldn't happen without streaming: true, but handle gracefully)
            const generator = harnessResult as AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
            // Consume all events
            for await (const _event of generator) {
              // Discard events, we just want the final response
            }
            const finalResult = await generator.next();
            // The value should be AgentResponse<T> when done=true
            return finalResult.value as AgentResponse<T>;
          })())
        : await (harnessResult as Promise<AgentResponse<T>>);

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
        `Harness execution error: ${message}`,
        { duration, harnessId: resolvedHarness },
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
   * @param response - The response to validate (required)
   * @param dataSchema - The Zod schema for the response data (required from Prompt.responseFormat)
   * @returns The validated response, or an INTERNAL_ERROR response if validation fails
   *
   * @private
   */
  private validateResponse<T>(
    response: AgentResponse<T>,
    dataSchema: z.ZodTypeAny
  ): AgentResponse<T> {
    // Call shared utility for validation
    const result = validateAgentResponse(response, dataSchema);

    if (result.valid) {
      // Response is valid, return it unchanged
      return response;
    }

    // Validation failed - this indicates a bug in our code
    // Log detailed error information for debugging
    console.error('Agent response validation failed', {
      agentId: this.id,  // Agent-specific logging (not in utility)
      timestamp: Date.now(),
      errorCount: result.errors?.errors.length ?? 0,
      errors: result.errors?.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })) ?? [],
    });

    // Return INTERNAL_ERROR response
    // Use createErrorResponse which is already imported
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Internal response validation failed',
      {
        validationErrors: result.errors?.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })) ?? [],
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
   * @side effects Modifies process.env with provided values and returns original values for restoration.
   * Restores environment in finally block of executePrompt.
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
