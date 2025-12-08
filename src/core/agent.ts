/**
 * Agent - Lightweight wrapper around Anthropic's Agent SDK
 *
 * Agents execute prompts and manage tool invocation cycles.
 * All configuration properties map 1:1 to Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
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
        this.mcpHandler.registerServer(mcp);
      }
    }
  }

  /**
   * Execute a prompt and return validated response
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns Validated response of type T
   */
  public async prompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<T> {
    const result = await this.executePrompt(prompt, overrides);
    return result.data;
  }

  /**
   * Execute a prompt with full result metadata
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns Full result including metadata
   */
  public async promptWithMetadata<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<PromptResult<T>> {
    return this.executePrompt(prompt, overrides);
  }

  /**
   * Execute a prompt with reflection capabilities
   * @param prompt Prompt to execute
   * @param overrides Optional overrides for this execution
   * @returns Validated response of type T
   */
  public async reflect<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<T> {
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

    const result = await this.executePrompt(prompt, effectiveOverrides);
    return result.data;
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
  ): Promise<PromptResult<T>> {
    const startTime = Date.now();
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

      const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
      if (cached) {
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
        throw new Error('No text response received from API');
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate with schema
      const validated = prompt.validateResponse(parsed);

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

      // Store in cache if enabled
      if (cacheEnabled && cacheKey) {
        await defaultCache.set(cacheKey, result, { prefix: this.id });
      }

      return result;
    } finally {
      // Restore environment
      this.restoreEnvironment(originalEnv);
    }
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
   */
  private async executeTool(name: string, input: unknown): Promise<unknown> {
    // Check if it's an MCP tool
    if (this.mcpHandler.hasTool(name)) {
      const result = await this.mcpHandler.executeTool(name, input);
      if (result.is_error) {
        throw new Error(result.content as string);
      }
      return result.content;
    }

    // Look for direct tool handler - this would be set by subclasses
    throw new Error(`No handler found for tool '${name}'`);
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
