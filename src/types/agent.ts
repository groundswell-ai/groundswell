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

// ========================
// AgentResponse Types (PRD 6.1-6.5)
// ========================

/**
 * Status of an agent response
 * Used as discriminant for type narrowing
 */
export type AgentResponseStatus = 'success' | 'error' | 'partial';

/**
 * Response wrapper for agent execution results
 * Provides consistent structure with status, data, error, and metadata
 *
 * @template T - The type of data returned on success
 */
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata */
  metadata: AgentResponseMetadata;
}

/**
 * Error details for agent error responses
 */
export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: string;

  /** Human-readable error description */
  message: string;

  /** Additional error context */
  details?: Record<string, unknown> | null;

  /** Whether the error is recoverable (can retry) */
  recoverable: boolean;
}

/**
 * Metadata for agent responses
 */
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;
}

// ========================
// Discriminated Union Types
// ========================

/**
 * Success response type - data is T (not null), error is null
 */
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };

/**
 * Error response type - data is null, error is AgentErrorDetails (not null)
 */
export type ErrorResponse = AgentResponse<null> & { status: 'error' };

/**
 * Partial response type - data is T, error is null
 */
export type PartialResponse<T> = AgentResponse<T> & { status: 'partial' };

// ========================
// Error Code Constants
// ========================

/**
 * Standard error codes for agent responses
 * Use SCREAMING_SNAKE_CASE convention
 */
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;

// ========================
// Factory Functions
// ========================

/**
 * Creates a success response with data and metadata.
 *
 * @param data - The response data
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse
 *
 * @example
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'success' },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}

/**
 * Creates an error response with error details.
 *
 * @param code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @param recoverable - Whether the error is recoverable (default: false)
 * @returns An error AgentResponse with null data
 *
 * @example
 * ```ts
 * const response = createErrorResponse(
 *   'INVALID_RESPONSE_FORMAT',
 *   'Failed to parse response',
 *   { field: 'value' },
 *   false
 * );
 * ```
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      details: details ?? null,
      recoverable,
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}

/**
 * Creates a partial response for streaming/incremental results.
 *
 * @param data - The partial response data
 * @returns A partial AgentResponse
 *
 * @example
 * ```ts
 * const response = createPartialResponse({
 *   completedSteps: 3,
 *   totalSteps: 5
 * });
 * ```
 */
export function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}

// ========================
// Type Guards
// ========================

/**
 * Type guard for success responses.
 * Narrows the type to SuccessResponse<T> where data is T (not null).
 *
 * @param response - The response to check
 * @returns True if the response status is 'success'
 *
 * @example
 * ```ts
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 * }
 * ```
 */
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}

/**
 * Type guard for error responses.
 * Narrows the type to ErrorResponse where error is AgentErrorDetails (not null).
 *
 * @param response - The response to check
 * @returns True if the response status is 'error'
 *
 * @example
 * ```ts
 * if (isError(response)) {
 *   console.log(response.error.code); // TypeScript knows error exists
 * }
 * ```
 */
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}

/**
 * Type guard for partial responses.
 * Narrows the type to PartialResponse<T>.
 *
 * @param response - The response to check
 * @returns True if the response status is 'partial'
 *
 * @example
 * ```ts
 * if (isPartial(response)) {
 *   console.log('Partial result:', response.data);
 * }
 * ```
 */
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T> {
  return response.status === 'partial';
}
