/**
 * ReflectionManager - Implements reflection and self-correction for agents
 *
 * Provides multi-level reflection (workflow, agent, prompt) with configurable
 * retry limits and history tracking.
 */

import type {
  ReflectionAPI,
  ReflectionConfig,
  ReflectionContext,
  ReflectionResult,
  ReflectionEntry,
  WorkflowEvent,
} from '../types/index.js';
import type { Agent } from '../core/agent.js';
import type { Prompt } from '../core/prompt.js';
import { z } from 'zod';

/**
 * Schema for parsing reflection responses from the agent
 */
const ReflectionResponseSchema = z.object({
  shouldRetry: z.boolean(),
  reason: z.string(),
  revisedPromptData: z.record(z.unknown()).optional(),
  revisedSystemPrompt: z.string().optional(),
});

/**
 * Default reflection prompt template
 */
const REFLECTION_PROMPT_TEMPLATE = `A previous operation failed with the following error:

Error: {{errorMessage}}
Stack: {{errorStack}}

Level: {{level}}
Node: {{nodeName}} ({{nodeId}})
Attempt: {{attemptNumber}} of {{maxAttempts}}

Previous attempts:
{{previousAttempts}}

Analyze the error and determine:
1. Can this operation be retried with modifications?
2. What changes would help it succeed?
3. Is this a transient error (worth retrying) or a fundamental issue (should abort)?

Consider:
- Rate limits and quota errors should NOT be retried via reflection
- Authentication errors should NOT be retried via reflection
- Schema validation errors may be retried with revised data
- Logic errors may be retried with revised prompts

Respond with JSON:
{
  "shouldRetry": boolean,
  "reason": string,
  "revisedPromptData": { /* optional revised data */ },
  "revisedSystemPrompt": "optional revised system prompt"
}`;

/**
 * ReflectionManager - Manages reflection and self-correction
 */
export class ReflectionManager implements ReflectionAPI {
  private readonly config: ReflectionConfig;
  private readonly history: ReflectionEntry[] = [];
  private readonly agent?: Agent;
  private eventEmitter?: (event: WorkflowEvent) => void;

  /**
   * Create a new ReflectionManager
   * @param config Reflection configuration
   * @param agent Optional agent to use for reflection analysis
   */
  constructor(config: ReflectionConfig, agent?: Agent) {
    this.config = config;
    this.agent = agent;
  }

  /**
   * Set the event emitter for workflow events
   */
  setEventEmitter(emitter: (event: WorkflowEvent) => void): void {
    this.eventEmitter = emitter;
  }

  /**
   * Check if reflection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the maximum number of attempts
   */
  getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  /**
   * Get the retry delay in milliseconds
   */
  getRetryDelayMs(): number {
    return this.config.retryDelayMs ?? 0;
  }

  /**
   * Trigger a reflection on the current context
   */
  async triggerReflection(reason?: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Reflection is not enabled');
    }

    // Record that reflection was triggered
    const entry: ReflectionEntry = {
      timestamp: Date.now(),
      level: 'workflow',
      reason: reason ?? 'Manual reflection trigger',
      error: new Error(reason ?? 'Manual trigger'),
      resolution: 'skip',
      success: false,
    };

    this.history.push(entry);
  }

  /**
   * Get the history of reflection attempts
   */
  getReflectionHistory(): ReflectionEntry[] {
    return [...this.history];
  }

  /**
   * Perform reflection analysis on an error
   */
  async reflect(context: ReflectionContext): Promise<ReflectionResult> {
    // Emit reflection start event
    if (this.eventEmitter) {
      this.eventEmitter({
        type: 'reflectionStart',
        level: context.level,
        node: context.failedNode,
      });
    }

    let result: ReflectionResult;

    try {
      // Check for non-retryable errors
      if (this.isNonRetryableError(context.error)) {
        result = {
          shouldRetry: false,
          reason: `Non-retryable error: ${context.error.message}`,
        };
      } else if (this.agent) {
        // Use agent for reflection analysis
        result = await this.reflectWithAgent(context);
      } else {
        // Use simple heuristic-based reflection
        result = this.reflectWithHeuristics(context);
      }

      // Record the reflection entry
      const entry: ReflectionEntry = {
        timestamp: Date.now(),
        level: context.level,
        reason: result.reason,
        error: context.error,
        resolution: result.shouldRetry ? 'retry' : 'abort',
        success: false, // Will be updated by caller if retry succeeds
      };

      this.history.push(entry);

      // Apply retry delay if configured
      if (result.shouldRetry && this.config.retryDelayMs) {
        await this.delay(this.config.retryDelayMs);
      }

      return result;
    } finally {
      // Emit reflection end event
      if (this.eventEmitter) {
        this.eventEmitter({
          type: 'reflectionEnd',
          level: context.level,
          success: result!?.shouldRetry ?? false,
          node: context.failedNode,
        });
      }
    }
  }

  /**
   * Mark the last reflection entry as successful
   */
  markLastReflectionSuccessful(): void {
    if (this.history.length > 0) {
      this.history[this.history.length - 1].success = true;
    }
  }

  /**
   * Check if an error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Rate limit and quota errors
    if (
      message.includes('rate limit') ||
      message.includes('quota exceeded') ||
      message.includes('429')
    ) {
      return true;
    }

    // Authentication errors
    if (
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('invalid api key')
    ) {
      return true;
    }

    // Network errors that should use exponential backoff instead
    if (
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('network')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Perform reflection using an agent
   */
  private async reflectWithAgent(
    context: ReflectionContext
  ): Promise<ReflectionResult> {
    if (!this.agent) {
      throw new Error('No agent configured for reflection');
    }

    // Build the reflection prompt
    const promptText = this.buildReflectionPrompt(context);

    // Create a prompt for reflection analysis
    const reflectionPrompt = new (await import('../core/prompt.js')).Prompt({
      user: promptText,
      responseFormat: ReflectionResponseSchema,
    });

    try {
      const response = await this.agent.prompt(reflectionPrompt);
      return {
        shouldRetry: response.shouldRetry,
        reason: response.reason,
        revisedPromptData: response.revisedPromptData,
        revisedSystemPrompt: response.revisedSystemPrompt,
      };
    } catch (reflectionError) {
      // If reflection itself fails, don't retry the original
      return {
        shouldRetry: false,
        reason: `Reflection analysis failed: ${reflectionError instanceof Error ? reflectionError.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Perform reflection using simple heuristics
   */
  private reflectWithHeuristics(context: ReflectionContext): ReflectionResult {
    const errorMessage = context.error.message.toLowerCase();

    // Check for validation errors (often retryable)
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('schema') ||
      errorMessage.includes('json')
    ) {
      return {
        shouldRetry: true,
        reason:
          'Validation/parsing error detected - retry may succeed with adjusted approach',
      };
    }

    // Check for timeout errors
    if (errorMessage.includes('timeout')) {
      return {
        shouldRetry: context.attemptNumber < 2,
        reason:
          context.attemptNumber < 2
            ? 'Timeout error - retry once'
            : 'Timeout error - too many attempts',
      };
    }

    // Default: retry if under max attempts
    const shouldRetry = context.attemptNumber < this.config.maxAttempts;
    return {
      shouldRetry,
      reason: shouldRetry
        ? `Attempt ${context.attemptNumber} failed - retrying`
        : `Max attempts (${this.config.maxAttempts}) reached`,
    };
  }

  /**
   * Build the reflection prompt from context
   */
  private buildReflectionPrompt(context: ReflectionContext): string {
    const previousAttemptsText =
      context.previousAttempts.length > 0
        ? context.previousAttempts
            .map(
              (a, i) =>
                `  ${i + 1}. [${a.level}] ${a.reason} -> ${a.resolution} (${a.success ? 'success' : 'failed'})`
            )
            .join('\n')
        : '  None';

    return REFLECTION_PROMPT_TEMPLATE.replace('{{errorMessage}}', context.error.message)
      .replace('{{errorStack}}', context.error.stack ?? 'No stack trace')
      .replace('{{level}}', context.level)
      .replace('{{nodeName}}', context.failedNode.name)
      .replace('{{nodeId}}', context.failedNode.id)
      .replace('{{attemptNumber}}', String(context.attemptNumber))
      .replace('{{maxAttempts}}', String(this.config.maxAttempts))
      .replace('{{previousAttempts}}', previousAttemptsText);
  }

  /**
   * Helper to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Execute a function with reflection support
 * @param fn Function to execute
 * @param reflection ReflectionManager instance
 * @param createContext Function to create reflection context from error
 * @returns Result of the function
 */
export async function executeWithReflection<T>(
  fn: () => Promise<T>,
  reflection: ReflectionManager,
  createContext: (
    error: Error,
    attempt: number,
    history: ReflectionEntry[]
  ) => ReflectionContext
): Promise<T> {
  let lastError: Error | null = null;
  const maxAttempts = reflection.getMaxAttempts();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // If we succeeded after a reflection, mark it as successful
      if (attempt > 1) {
        reflection.markLastReflectionSuccessful();
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      if (!reflection.isEnabled() || attempt === maxAttempts) {
        throw error;
      }

      const context = createContext(
        lastError,
        attempt,
        reflection.getReflectionHistory()
      );

      const result = await reflection.reflect(context);

      if (!result.shouldRetry) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Max reflection attempts exceeded');
}
