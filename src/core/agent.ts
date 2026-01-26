/**
 * Agent - Lightweight wrapper around Anthropic's Agent SDK
 *
 * Agents execute prompts and manage tool invocation cycles.
 * All configuration properties map 1:1 to Anthropic Agent SDK.
 */

import {
  query,
  createSdkMcpServer,
  tool,
  type Options as AgentSDKOptions,
  type SDKMessage,
  type SDKResultMessage,
  type McpServerConfig,
  type HookCallback,
  type HookInput,
  type PreToolUseHookInput,
  type PostToolUseHookInput,
  type SessionStartHookInput,
  type SessionEndHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
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
import type { ProviderId, ProviderOptions } from '../types/providers.js';

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
   * Build MCP server configurations for Agent SDK
   */
  private buildMcpServers(): Record<string, McpServerConfig> | undefined {
    const mcpServers: Record<string, McpServerConfig> = {};

    // Get all tools from our MCPHandler and create SDK MCP servers
    let serverIndex = 0;
    for (const handler of [this.mcpHandler, ...this.mcpHandlers]) {
      const sdkServer = handler.toAgentSDKServer();
      if (sdkServer) {
        // Use a unique name for each server
        const serverName = `groundswell-mcp-${serverIndex++}`;
        mcpServers[serverName] = sdkServer;
      }
    }

    return Object.keys(mcpServers).length > 0 ? mcpServers : undefined;
  }

  /**
   * Build hooks configuration for Agent SDK
   */
  private buildAgentSDKHooks(
    effectiveHooks: AgentHooks
  ): Partial<Record<string, { hooks: HookCallback[] }>> {
    const sdkHooks: Partial<Record<string, { hooks: HookCallback[] }>> = {};

    // PreToolUse hooks
    if (effectiveHooks.preToolUse && effectiveHooks.preToolUse.length > 0) {
      sdkHooks['PreToolUse'] = {
        hooks: effectiveHooks.preToolUse.map(
          (hook) => async (input: HookInput) => {
            const preInput = input as PreToolUseHookInput;
            await hook({
              toolName: preInput.tool_name,
              toolInput: preInput.tool_input,
              agentId: this.id,
            } as PreToolUseContext);
            return { continue: true };
          }
        ),
      };
    }

    // PostToolUse hooks
    if (effectiveHooks.postToolUse && effectiveHooks.postToolUse.length > 0) {
      sdkHooks['PostToolUse'] = {
        hooks: effectiveHooks.postToolUse.map(
          (hook) => async (input: HookInput) => {
            const postInput = input as PostToolUseHookInput;
            await hook({
              toolName: postInput.tool_name,
              toolInput: postInput.tool_input,
              toolOutput: postInput.tool_response,
              agentId: this.id,
              duration: 0, // SDK doesn't provide duration in hook input
            } as PostToolUseContext);
            return { continue: true };
          }
        ),
      };
    }

    // SessionStart hooks
    if (effectiveHooks.sessionStart && effectiveHooks.sessionStart.length > 0) {
      sdkHooks['SessionStart'] = {
        hooks: effectiveHooks.sessionStart.map(
          (hook) => async (_input: HookInput) => {
            await hook({
              agentId: this.id,
              agentName: this.name,
            } as SessionStartContext);
            return { continue: true };
          }
        ),
      };
    }

    // SessionEnd hooks
    if (effectiveHooks.sessionEnd && effectiveHooks.sessionEnd.length > 0) {
      sdkHooks['SessionEnd'] = {
        hooks: effectiveHooks.sessionEnd.map(
          (hook) => async (_input: HookInput) => {
            await hook({
              agentId: this.id,
              agentName: this.name,
              totalDuration: 0, // Will be calculated after execution
            } as SessionEndContext);
            return { continue: true };
          }
        ),
      };
    }

    return sdkHooks;
  }

  /**
   * Convert Zod schema to JSON Schema for Agent SDK outputFormat
   */
  private zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
    return zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>;
  }

  /**
   * Internal prompt execution with full flow using Agent SDK
   */
  private async executePrompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    const requestId = generateId();

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

    // Set up environment variables
    const originalEnv = this.setupEnvironment(overrides?.env ?? this.config.env);

    try {
      // Build Agent SDK options
      const sdkOptions: AgentSDKOptions = {
        model: effectiveModel,
        systemPrompt: effectiveSystem,
        env: { ...process.env, ...(overrides?.env ?? this.config.env) } as Record<string, string>,
      };

      // Add tools if available
      if (effectiveTools && effectiveTools.length > 0) {
        sdkOptions.allowedTools = effectiveTools.map((t) => t.name);
      }

      // Add MCP servers
      const mcpServers = this.buildMcpServers();
      if (mcpServers) {
        sdkOptions.mcpServers = mcpServers;
      }

      // Add hooks
      if (effectiveHooks) {
        sdkOptions.hooks = this.buildAgentSDKHooks(effectiveHooks);
      }

      // Add output format for structured response using JSON Schema
      const jsonSchema = this.zodToJsonSchema(prompt.responseFormat);
      sdkOptions.outputFormat = {
        type: 'json_schema',
        schema: jsonSchema as Record<string, unknown>,
      };

      // Build user message
      const userMessage = prompt.buildUserMessage();

      // Execute query using Agent SDK
      const q = query({ prompt: userMessage, options: sdkOptions });

      // Collect messages and find the result
      let resultMessage: SDKResultMessage | null = null;
      let toolCallCount = 0;

      for await (const message of q) {
        // Count tool uses from assistant messages
        if (message.type === 'assistant') {
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                toolCallCount++;

                // Emit tool invocation event if in workflow context
                if (ctx) {
                  this.emitWorkflowEvent({
                    type: 'toolInvocation',
                    toolName: block.name,
                    input: block.input,
                    output: undefined, // Not available at this point
                    duration: 0,
                    node: ctx.workflowNode,
                  });
                }
              }
            }
          }
        }

        // Capture the final result message
        if (message.type === 'result') {
          resultMessage = message as SDKResultMessage;
        }
      }

      const duration = Date.now() - startTime;

      // Handle result
      if (!resultMessage) {
        return createErrorResponse(
          'INVALID_RESPONSE_FORMAT',
          'No result message received from Agent SDK',
          { duration },
          false
        ) as AgentResponse<T>;
      }

      // Check for errors in result
      if (resultMessage.subtype !== 'success') {
        const errorResult = resultMessage as SDKResultMessage & { subtype: string; errors?: string[] };
        return createErrorResponse(
          'EXECUTION_FAILED',
          `Agent SDK execution failed: ${errorResult.subtype}`,
          {
            errors: errorResult.errors ?? [],
            subtype: errorResult.subtype,
          },
          errorResult.subtype === 'error_max_turns' // Recoverable if just hit turn limit
        ) as AgentResponse<T>;
      }

      // Extract usage from result
      const totalUsage: TokenUsage = {
        input_tokens: resultMessage.usage?.input_tokens ?? 0,
        output_tokens: resultMessage.usage?.output_tokens ?? 0,
      };

      // Get structured output from result
      let validated: T;

      if (resultMessage.structured_output !== undefined) {
        // Use structured output directly
        const validationResult = prompt.safeValidateResponse(resultMessage.structured_output);
        if (!validationResult.success) {
          const zodError = validationResult.error;
          const errorSummary = zodError.errors
            .map((err) => {
              const field = err.path.length > 0 ? err.path.join('.') : 'response';
              return `${field}: ${err.message}`;
            })
            .join('; ');

          return createErrorResponse(
            'INVALID_RESPONSE_FORMAT',
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
        validated = validationResult.data;
      } else {
        // Fall back to parsing result text
        const jsonMatch = resultMessage.result?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return createErrorResponse(
            'INVALID_RESPONSE_FORMAT',
            'No JSON object found in response',
            { responseText: resultMessage.result?.substring(0, 200) },
            false
          ) as AgentResponse<T>;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validationResult = prompt.safeValidateResponse(parsed);

        if (!validationResult.success) {
          const zodError = validationResult.error;
          const errorSummary = zodError.errors
            .map((err) => {
              const field = err.path.length > 0 ? err.path.join('.') : 'response';
              return `${field}: ${err.message}`;
            })
            .join('; ');

          return createErrorResponse(
            'INVALID_RESPONSE_FORMAT',
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
        validated = validationResult.data;
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
          tokenUsage: totalUsage,
        });
      }

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
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return createErrorResponse(
        'API_REQUEST_FAILED',
        `Agent SDK error: ${message}`,
        { duration },
        true // API errors are typically recoverable
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
