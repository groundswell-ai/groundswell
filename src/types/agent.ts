/**
 * Agent configuration and override types
 * All properties map 1:1 to Anthropic SDK
 */

import type { Tool, MCPServer, Skill, AgentHooks } from './sdk-primitives.js';

/**
 * Configuration for creating an Agent instance
 * All Anthropic SDK properties pass through unchanged
 */
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;

  /** System prompt for the agent */
  system?: string;

  /** Tools available to the agent */
  tools?: Tool[];

  /** MCP servers to connect */
  mcps?: MCPServer[];

  /** Skills to load */
  skills?: Skill[];

  /** Lifecycle hooks */
  hooks?: AgentHooks;

  /** Environment variables for agent execution */
  env?: Record<string, string>;

  /** Enable reflection capability for this agent */
  enableReflection?: boolean;

  /** Enable caching of prompt responses */
  enableCache?: boolean;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;
}

/**
 * Overrides that can be applied at the prompt level
 * Takes precedence over AgentConfig values
 */
export interface PromptOverrides {
  /** Override system prompt for this prompt */
  system?: string;

  /** Override tools for this prompt */
  tools?: Tool[];

  /** Override MCPs for this prompt */
  mcps?: MCPServer[];

  /** Override skills for this prompt */
  skills?: Skill[];

  /** Override hooks for this prompt */
  hooks?: AgentHooks;

  /** Override environment variables */
  env?: Record<string, string>;

  /** Override temperature */
  temperature?: number;

  /** Override max tokens */
  maxTokens?: number;

  /** Stop sequences to use */
  stop?: string[];

  /** Disable cache for this prompt */
  disableCache?: boolean;

  /** Enable reflection for this prompt */
  enableReflection?: boolean;

  /** Override model for this prompt */
  model?: string;
}
