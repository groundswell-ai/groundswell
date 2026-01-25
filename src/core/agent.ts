/**
 * Agent - Lightweight wrapper around Anthropic's Agent SDK
 *
 * Agents execute prompts and manage tool invocation cycles.
 * All configuration properties map 1:1 to Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
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
 * Internal message type for conversation history
 */
type Message = Anthropic.MessageParam;

/**
 * Agent class - executes prompts via Anthropic SDK
 */
export class Agent {
  /** Unique identifier for this agent instance */
  public readonly id: string;

  /** Agent name */
  public readonly name: string;

  /** Stored configuration */
  private readonly config: AgentConfig;

  /** Anthropic client instance */
  private readonly client: Anthropic;

  /** MCP handler for tool management */
  private readonly mcpHandler: MCPHandler;

  /** Direct MCPHandler instances for delegated execution */
  private readonly mcpHandlers: MCPHandler[] = [];

  /** Default model to use */
  private readonly model: string;

  /**
   * Create a new Agent instance
   * @param config Agent configuration
   */
  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';

    // Create Anthropic client
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
   * Internal prompt execution with full flow
   */
  private async executePrompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    const requestId = generateId();
    let toolCallCount = 0;
    let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

    // Get execution context for event emission
    const ctx = getExecutionContext();

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

    const effectiveStop = overrides?.stop;

    // Set up environment variables
    const originalEnv = this.setupEnvironment(overrides?.env ?? this.config.env);

    try {
      // Call session start hooks
      await this.callHooks(effectiveHooks?.sessionStart, {
        agentId: this.id,
        agentName: this.name,
      } as SessionStartContext);

      // Build initial messages
      const messages: Message[] = [
        { role: 'user', content: prompt.buildUserMessage() },
      ];

      // Execute conversation loop
      let response = await this.callApi(
        messages,
        effectiveSystem,
        effectiveTools,
        effectiveModel,
        effectiveMaxTokens,
        effectiveTemperature,
        effectiveStop
      );

      totalUsage = this.addUsage(totalUsage, response.usage);

      // Handle tool use loop
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          toolCallCount++;

          // Call pre-tool hooks
          await this.callHooks(effectiveHooks?.preToolUse, {
            toolName: toolUse.name,
            toolInput: toolUse.input,
            agentId: this.id,
          } as PreToolUseContext);

          const toolStartTime = Date.now();

          // Execute tool
          const result = await this.executeTool(toolUse.name, toolUse.input);

          // Check if tool execution returned an error response
          if (result && typeof result === 'object' && 'status' in result) {
            // This is an AgentResponse error - return it immediately
            return result as AgentResponse<T>;
          }

          const toolDuration = Date.now() - toolStartTime;

          // Emit tool invocation event if in workflow context
          if (ctx) {
            this.emitWorkflowEvent({
              type: 'toolInvocation',
              toolName: toolUse.name,
              input: toolUse.input,
              output: result,
              duration: toolDuration,
              node: ctx.workflowNode,
            });
          }

          // Call post-tool hooks
          await this.callHooks(effectiveHooks?.postToolUse, {
            toolName: toolUse.name,
            toolInput: toolUse.input,
            toolOutput: result,
            agentId: this.id,
            duration: toolDuration,
          } as PostToolUseContext);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          });
        }

        // Add assistant message with tool uses
        messages.push({ role: 'assistant', content: response.content });

        // Add tool results
        messages.push({ role: 'user', content: toolResults });

        // Continue conversation
        response = await this.callApi(
          messages,
          effectiveSystem,
          effectiveTools,
          effectiveModel,
          effectiveMaxTokens,
          effectiveTemperature,
          effectiveStop
        );

        totalUsage = this.addUsage(totalUsage, response.usage);
      }

      // Extract text response
      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        return createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          'No text response received from API',
          { stopReason: response.stop_reason },
          false
        ) as AgentResponse<T>;
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          'No JSON object found in response',
          { responseText: textContent.text.substring(0, 200) },
          false
        ) as AgentResponse<T>;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate with schema - use safeValidateResponse to catch Zod errors
      const validationResult = prompt.safeValidateResponse(parsed);

      if (!validationResult.success) {
        const zodError = validationResult.error;

        // Format user-friendly error summary
        const errorSummary = zodError.errors
          .map(err => {
            const field = err.path.length > 0 ? err.path.join('.') : 'response';
            return `${field}: ${err.message}`;
          })
          .join('; ');

        // Log validation failure
        console.error('Response validation failed', {
          agentId: this.id,
          agentName: this.name,
          requestId,
          errorCount: zodError.errors.length,
          validationErrors: zodError.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });

        // Calculate duration for metadata
        const duration = Date.now() - startTime;

        // Return error response
        const errorResponse = createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          `Response validation failed: ${errorSummary}`,
          {
            validationErrors: zodError.errors.map(err => ({
              field: err.path.join('.') || 'root',
              message: err.message,
              code: err.code,
            })),
            errorCount: zodError.errors.length,
          },
          false // not recoverable
        );

        // Override metadata with actual execution values
        errorResponse.metadata = {
          agentId: this.id,
          timestamp: startTime,
          duration,
          requestId,
        };

        return errorResponse as AgentResponse<T>;
      }

      const validated = validationResult.data;

      // Call session end hooks
      await this.callHooks(effectiveHooks?.sessionEnd, {
        agentId: this.id,
        agentName: this.name,
        totalDuration: Date.now() - startTime,
      } as SessionEndContext);

      const duration = Date.now() - startTime;

      // Emit prompt end event if in workflow context
      if (ctx) {
        this.emitWorkflowEvent({
          type: 'agentPromptEnd',
          agentId: this.id,
          agentName: this.name,
          promptId: prompt.id,
          node: ctx.workflowNode,
          duration,
          tokenUsage: totalUsage,
        });
      }

      const result: PromptResult<T> = {
        data: validated,
        usage: totalUsage,
        duration,
        toolCalls: toolCallCount,
      };

      // Create AgentResponse with metadata including usage and toolCalls
      const metadata: AgentResponseMetadata = {
        agentId: this.id,
        timestamp: startTime,
        duration,
        requestId,
        usage: totalUsage,
        toolCalls: toolCallCount,
      };

      const agentResponse = createSuccessResponse(validated, metadata);

      // Validate before returning (defense-in-depth)
      const validatedResponse = this.validateResponse(agentResponse, prompt.responseFormat);

      // Store in cache if enabled
      if (cacheEnabled && cacheKey) {
        await defaultCache.set(cacheKey, validatedResponse, { prefix: this.id });
      }

      return validatedResponse;
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
      errors: validation.error.errors.map(err => ({
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
        validationErrors: validation.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      },
      false  // Non-recoverable - indicates system bug
    ) as AgentResponse<T>;
  }

  /**
   * Call the Anthropic API
   */
  private async callApi(
    messages: Message[],
    system: string | undefined,
    tools: Tool[] | undefined,
    model: string,
    maxTokens: number,
    temperature: number | undefined,
    stop: string[] | undefined
  ): Promise<Anthropic.Message> {
    const params: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    if (system) {
      params.system = system;
    }

    if (tools && tools.length > 0) {
      params.tools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema as Anthropic.Tool['input_schema'],
      }));
    }

    if (temperature !== undefined) {
      params.temperature = temperature;
    }

    if (stop && stop.length > 0) {
      params.stop_sequences = stop;
    }

    return this.client.messages.create(params);
  }

  /**
   * Execute a tool (either direct or via MCP)
   * Returns the tool result on success, or AgentResponse<null> on error
   */
  private async executeTool(
    name: string,
    input: unknown
  ): Promise<unknown | AgentResponse<null>> {
    // First, check stored MCPHandler instances (they have registered executors)
    for (const handler of this.mcpHandlers) {
      if (handler.hasTool(name)) {
        const result = await handler.executeTool(name, input);
        if (result.is_error) {
          return createErrorResponse(
            'TOOL_EXECUTION_FAILED',
            result.content as string,
            { toolName: name, toolInput: input },
            false
          );
        }
        return result.content;
      }
    }

    // Fall back to main mcpHandler (for non-MCPHandler MCPServers)
    if (this.mcpHandler.hasTool(name)) {
      const result = await this.mcpHandler.executeTool(name, input);
      if (result.is_error) {
        return createErrorResponse(
          'TOOL_EXECUTION_FAILED',
          result.content as string,
          { toolName: name, toolInput: input },
          false
        );
      }
      return result.content;
    }

    // No handler found
    return createErrorResponse(
      'TOOL_EXECUTION_FAILED',
      `No handler found for tool '${name}'`,
      { toolName: name },
      false
    );
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
   * Call hooks of a specific type
   */
  private async callHooks<T>(
    hooks: ((context: T) => Promise<void> | void)[] | undefined,
    context: T
  ): Promise<void> {
    if (!hooks) return;
    for (const hook of hooks) {
      await hook(context);
    }
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

  /**
   * Add token usage from response
   */
  private addUsage(total: TokenUsage, usage: Anthropic.Usage): TokenUsage {
    return {
      input_tokens: total.input_tokens + usage.input_tokens,
      output_tokens: total.output_tokens + usage.output_tokens,
    };
  }
}
