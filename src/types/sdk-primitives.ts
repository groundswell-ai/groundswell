/**
 * SDK primitive types that mirror Anthropic SDK structures
 * These types pass through unchanged to the SDK
 */

/**
 * Tool definition for Anthropic SDK
 * Maps directly to Anthropic.Tool
 */
export interface Tool {
  /** Tool name (must be unique within an agent) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema describing the tool's input parameters */
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool result returned from tool execution
 */
export interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string | unknown;
  is_error?: boolean;
}

/**
 * MCP Server configuration
 * Supports stdio and inprocess transports
 */
export interface MCPServer {
  /** Server name for identification */
  name: string;
  /** Server version (optional) */
  version?: string;
  /** Transport type */
  transport: 'stdio' | 'inprocess';
  /** Command to run for stdio transport */
  command?: string;
  /** Arguments for the command */
  args?: string[];
  /** Tools provided by this MCP server */
  tools?: Tool[];
  /** Environment variables for the MCP process */
  env?: Record<string, string>;
}

/**
 * Skill definition
 * Skills are loaded from directories containing SKILL.md
 */
export interface Skill {
  /** Skill name for identification */
  name: string;
  /** Path to skill directory containing SKILL.md */
  path: string;
}

/**
 * Hook handler function type
 */
export type HookHandler<T = unknown> = (context: T) => Promise<void> | void;

/**
 * Pre-tool use hook context
 */
export interface PreToolUseContext {
  toolName: string;
  toolInput: unknown;
  agentId: string;
}

/**
 * Post-tool use hook context
 */
export interface PostToolUseContext {
  toolName: string;
  toolInput: unknown;
  toolOutput: unknown;
  agentId: string;
  duration: number;
}

/**
 * Session start hook context
 */
export interface SessionStartContext {
  agentId: string;
  agentName?: string;
}

/**
 * Session end hook context
 */
export interface SessionEndContext {
  agentId: string;
  agentName?: string;
  totalDuration: number;
}

/**
 * Agent lifecycle hooks
 * Maps to Anthropic SDK hook conventions
 */
export interface AgentHooks {
  /** Called before each tool invocation */
  preToolUse?: HookHandler<PreToolUseContext>[];
  /** Called after each tool invocation */
  postToolUse?: HookHandler<PostToolUseContext>[];
  /** Called when agent session starts */
  sessionStart?: HookHandler<SessionStartContext>[];
  /** Called when agent session ends */
  sessionEnd?: HookHandler<SessionEndContext>[];
}

/**
 * Token usage information from API response
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}
