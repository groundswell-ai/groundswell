/**
 * Prompt configuration types
 * Prompts are immutable definitions of what to send to an agent
 */

import type { z } from 'zod';
import type { Tool, MCPServer, Skill, AgentHooks } from './sdk-primitives.js';

/**
 * Configuration for creating a Prompt instance
 * @template T The expected response type (inferred from responseFormat)
 */
export interface PromptConfig<T> {
  /** User message content */
  user: string;

  /** Structured data to inject into the prompt */
  data?: Record<string, unknown>;

  /** Zod schema defining the expected response format */
  responseFormat: z.ZodType<T>;

  /** Override system prompt (takes precedence over agent config) */
  system?: string;

  /** Override tools (takes precedence over agent config) */
  tools?: Tool[];

  /** Override MCPs (takes precedence over agent config) */
  mcps?: MCPServer[];

  /** Override skills (takes precedence over agent config) */
  skills?: Skill[];

  /** Override hooks (takes precedence over agent config) */
  hooks?: AgentHooks;

  /** Enable reflection specifically for this prompt */
  enableReflection?: boolean;
}
