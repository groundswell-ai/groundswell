import type { Tool } from './sdk-primitives.js';

/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

/**
 * Provider capability flags
 * Indicates which features a provider supports
 */
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}

/**
 * Provider configuration options
 * Used for provider initialization and configuration
 */
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;

  /** API key (if not from environment) */
  apiKey?: string;

  /** Session ID for session-based providers */
  sessionId?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;

  /** Tool input parameters */
  input: unknown;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;

  /** Whether the execution resulted in an error */
  isError: boolean;
}

/**
 * Provider hook events
 * Maps from AgentHooks to provider-specific events
 */
export interface ProviderHookEvents {
  /** Called before tool execution */
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;

  /** Called after tool execution */
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;

  /** Called when provider session starts */
  onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;

  /** Called for each streaming chunk */
  onStream?: (chunk: string) => void;
}

/**
 * Provider execution options
 * Wraps parameters for provider execution requests
 */
export interface ProviderExecutionOptions {
  /** Model identifier */
  model?: string;

  /** System prompt override */
  systemPrompt?: string;

  /** Available tools */
  tools?: Tool[];

  /** Lifecycle hooks */
  hooks?: ProviderHookEvents;

  /** Session identifier for session-based providers */
  sessionId?: string;
}

/**
 * Provider request interface
 * Wraps prompt and execution options for provider execution
 */
export interface ProviderRequest {
  /** The user prompt/message */
  prompt: string;

  /** Execution options */
  options: ProviderExecutionOptions;
}
