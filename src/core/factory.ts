/**
 * Factory Functions - Convenience functions for dynamic workflow, agent, and prompt creation
 *
 * These functions provide a simple API for creating workflow components dynamically
 * at runtime, useful for metaprogramming and agent-driven workflow construction.
 */

import { Workflow, type WorkflowExecutor } from './workflow.js';
import { Agent } from './agent.js';
import { Prompt } from './prompt.js';
import type { WorkflowConfig } from '../types/workflow-context.js';
import type { AgentConfig, PromptConfig } from '../types/index.js';

/**
 * Create a new Workflow instance
 *
 * @param config Workflow configuration
 * @param executor Executor function that receives WorkflowContext
 * @returns Configured Workflow instance
 *
 * @example
 * ```ts
 * const workflow = createWorkflow(
 *   { name: 'DataPipeline', enableReflection: true },
 *   async (ctx) => {
 *     const data = await ctx.step('fetch', () => fetchData());
 *     const processed = await ctx.step('process', () => processData(data));
 *     return processed;
 *   }
 * );
 *
 * const result = await workflow.run();
 * ```
 */
export function createWorkflow<T>(
  config: WorkflowConfig,
  executor: WorkflowExecutor<T>
): Workflow<T> {
  return new Workflow(config, executor);
}

/**
 * Create a new Agent instance
 *
 * @param config Agent configuration
 * @returns Configured Agent instance
 *
 * @example
 * ```ts
 * const agent = createAgent({
 *   name: 'DataAnalyst',
 *   system: 'You analyze data and provide insights.',
 *   enableCache: true,
 *   enableReflection: true,
 * });
 *
 * const result = await agent.prompt(analysisPrompt);
 * ```
 */
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}

/**
 * Create a new Prompt instance
 *
 * @param config Prompt configuration
 * @returns Configured Prompt instance
 *
 * @example
 * ```ts
 * const prompt = createPrompt({
 *   user: 'Analyze this data',
 *   data: { values: [1, 2, 3, 4, 5] },
 *   responseFormat: z.object({
 *     summary: z.string(),
 *     insights: z.array(z.string()),
 *   }),
 * });
 *
 * const result = await agent.prompt(prompt);
 * ```
 */
export function createPrompt<T>(config: PromptConfig<T>): Prompt<T> {
  return new Prompt(config);
}

/**
 * Create a workflow with an inline executor (shorthand)
 *
 * @param name Workflow name
 * @param executor Executor function
 * @returns Configured Workflow instance
 *
 * @example
 * ```ts
 * const workflow = quickWorkflow('ProcessData', async (ctx) => {
 *   return await ctx.step('process', () => processData());
 * });
 * ```
 */
export function quickWorkflow<T>(
  name: string,
  executor: WorkflowExecutor<T>
): Workflow<T> {
  return new Workflow({ name }, executor);
}

/**
 * Create a simple agent with minimal configuration (shorthand)
 *
 * @param name Agent name
 * @param system System prompt
 * @returns Configured Agent instance
 *
 * @example
 * ```ts
 * const agent = quickAgent('Helper', 'You are a helpful assistant.');
 * ```
 */
export function quickAgent(name: string, system?: string): Agent {
  return new Agent({ name, system });
}
