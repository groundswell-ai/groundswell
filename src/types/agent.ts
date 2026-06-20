/**
 * Agent configuration and override types
 * All properties map 1:1 to Anthropic SDK
 */

import type { Tool, MCPServer, Skill, AgentHooks, TokenUsage } from './sdk-primitives.js';
import type { ProviderId, ProviderOptions } from './providers.js';
import type { HarnessId, HarnessOptions } from './harnesses.js';
import { z } from 'zod';

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

  /**
   * Model identifier for LLM inference
   *
   * Supports two formats:
   * - **Plain format**: `"claude-sonnet-4-20250514"` - Uses default provider
   * - **Qualified format**: `"anthropic/claude-sonnet-4-20250514"` - Explicit provider
   *
   * When a plain model name is used (no provider prefix), the provider
   * is determined by the configuration cascade: prompt override →
   * agent provider → global default.
   *
   * ## Model Specification (PRD 7.8)
   *
   * The `parseModelSpec()` utility parses model strings into:
   * - `provider`: Provider ID (anthropic, opencode, etc.)
   * - `model`: Base model name without prefix
   * - `raw`: Original input string
   *
   * @example <caption>Plain format (uses default provider)</caption>
   * ```ts
   * const config: AgentConfig = {
   *   model: 'claude-sonnet-4-20250514'
   *   // Uses provider from cascade
   * };
   * ```
   *
   * @example <caption>Qualified format (explicit provider)</caption>
   * ```ts
   * const config: AgentConfig = {
   *   model: 'anthropic/claude-sonnet-4-20250514'
   *   // Explicitly uses Anthropic provider
   * };
   * ```
   *
   * @example <caption>Qualified format with OpenCode provider</caption>
   * ```ts
   * const config: AgentConfig = {
   *   model: 'opencode/gpt-4'
   *   // Explicitly uses OpenCode provider
   * };
   * ```
   *
   * @default "claude-sonnet-4-20250514"
   * @see {@link parseModelSpec} for model specification parsing
   * @see {@link ModelSpec} for parsed model structure
   */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;

  /** Harness to use (inherits from global; default 'pi'). PRD §7.9. */
  harness?: HarnessId;

  /** Harness-specific options. PRD §7.9. */
  harnessOptions?: HarnessOptions;

  /**
   * Provider to use for this agent
   *
   * @deprecated Use `harness` instead. Retained for backward compatibility during the v1.2 migration.
   */
  provider?: ProviderId;

  /**
   * Provider-specific options for this agent
   *
   * Merged with global provider defaults using "last write wins"
   * semantics. This agent's options take precedence over global
   * defaults, but can be overridden by prompt-level options.
   *
   * ## Options Merge (PRD 7.7)
   *
   * Options are merged with priority (highest to lowest):
   * 1. Prompt-level providerOptions (highest)
   * 2. AgentConfig.providerOptions (this field)
   * 3. GlobalProviderConfig.providerDefaults[provider] (lowest)
   *
   * @example <caption>Custom endpoint and timeout</caption>
   * ```ts
   * const config: AgentConfig = {
   *   providerOptions: {
   *     endpoint: 'https://api.example.com',
   *     timeout: 60000
   *   }
   * };
   * ```
   *
   * @example <caption>Custom headers for authentication</caption>
   * ```ts
   * const config: AgentConfig = {
   *   providerOptions: {
   *     headers: {
   *       'X-Custom-Auth': 'Bearer token123'
   *     }
   *   }
   * };
   * ```
   *
   * @see {@link ProviderOptions} for all available options
   * @see {@link resolveProviderConfig} for merge implementation
   */
  providerOptions?: ProviderOptions;
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

  /** Override harness for this prompt (PRD §7.7, §7.9). Highest priority in the harness cascade. */
  harness?: HarnessId;

  /** Override harness options for this prompt (PRD §7.7). Merged via last-write-wins. */
  harnessOptions?: HarnessOptions;

  /**
   * Override provider for this prompt
   *
   * ## Configuration Cascade (PRD 7.7)
   *
   * This is the highest priority in the provider cascade:
   * 1. PromptOverrides.provider (this field) - highest
   * 2. AgentConfig.provider
   * 3. GlobalProviderConfig.defaultProvider - lowest
   *
   * @example
   * ```ts
   * const result = await agent.prompt(prompt, {
   *   provider: 'opencode'  // Override agent's default provider
   * });
   * ```
   */
  provider?: ProviderId;

  /**
   * Override provider options for this prompt
   *
   * Merged with agent and global provider options using "last write wins"
   * semantics. These options take highest priority in the cascade.
   *
   * ## Options Merge (PRD 7.7)
   *
   * Priority (highest to lowest):
   * 1. PromptOverrides.providerOptions (this field) - highest
   * 2. AgentConfig.providerOptions
   * 3. GlobalProviderConfig.providerDefaults[provider] - lowest
   *
   * @example
   * ```ts
   * const result = await agent.prompt(prompt, {
   *   providerOptions: {
   *     temperature: 0.7,
   *     timeout: 60000
   *   }
   * });
   * ```
   */
  providerOptions?: ProviderOptions;
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
 * Response wrapper for agent execution results (discriminated union)
 *
 * ## PRD 6.4 Response Requirements
 *
 * All AgentResponse instances MUST satisfy:
 *
 * 1. **Strict JSON** (PRD 6.4.1): Must be parseable by `JSON.parse()`
 * 2. **No Prose Wrapping** (PRD 6.4.2): No markdown code blocks or text
 * 3. **Consistent Structure** (PRD 6.4.3): Must conform to this interface
 * 4. **Null over Undefined** (PRD 6.4.4): Use `null` for absent values
 * 5. **Error Responses** (PRD 6.4.5): Failed operations return valid JSON
 *
 * ## Discriminated Union Type Safety
 *
 * **This is a discriminated union type** - the `status` field determines the
 * shape of `data` and `error` at compile-time. TypeScript will prevent invalid
 * combinations like `status='success'` with `error!=null`.
 *
 * The three variants are:
 * - **Success**: `status: 'success'`, `data: T`, `error: null`
 * - **Error**: `status: 'error'`, `data: null`, `error: AgentErrorDetails`
 * - **Partial**: `status: 'partial'`, `data: T`, `error: null`
 *
 * ## Type Narrowing
 *
 * Use the `status` field directly or type guards for type narrowing:
 * - `isSuccess(response)` → `SuccessResponse<T>` (data is T, error is null)
 * - `isError(response)` → `ErrorResponse` (data is null, error exists)
 * - `isPartial(response)` → `PartialResponse<T>` (data is T, error is null)
 *
 * @template T - The type of data returned on success (unknown by default)
 * @see {@link SuccessResponse}, {@link ErrorResponse}, {@link PartialResponse}
 *
 * @example <caption>Success response (PRD 6.5)</caption>
 * ```ts
 * const response: AgentResponse<{ result: string; artifacts: string[] }> = {
 *   status: 'success',
 *   data: { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   error: null,  // Must be null for success - enforced by TypeScript
 *   metadata: { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * };
 * ```
 *
 * @example <caption>Type narrowing with status field</caption>
 * ```ts
 * function handleResponse<T>(response: AgentResponse<T>) {
 *   switch (response.status) {
 *     case 'success':
 *       // TypeScript knows: response.data is T, response.error is null
 *       return response.data;
 *     case 'error':
 *       // TypeScript knows: response.data is null, response.error is AgentErrorDetails
 *       throw new Error(response.error.message);
 *     case 'partial':
 *       // TypeScript knows: response.data is T, response.error is null
 *       return response.data;
 *     default:
 *       // Exhaustiveness check - unreachable
 *       const _exhaustive: never = response;
 *       return _exhaustive;
 *   }
 * }
 * ```
 *
 * @example <caption>Invalid combinations are compile-time errors</caption>
 * ```ts
 * // ❌ TYPE ERROR: status='success' with error!=null
 * const invalid1: AgentResponse<string> = {
 *   status: 'success',
 *   data: 'hello',
 *   error: { code: 'ERROR', message: 'oops', recoverable: false },  // Type error!
 *   metadata: { agentId: 'test', timestamp: Date.now() }
 * };
 * // TypeScript error: Type '{ code: string; message: string; recoverable: boolean; }' is not assignable to type 'null'.
 *
 * // ❌ TYPE ERROR: status='error' with data!=null
 * const invalid2: AgentResponse<string> = {
 *   status: 'error',
 *   data: 'hello',  // Type error!
 *   error: { code: 'ERROR', message: 'oops', recoverable: false },
 *   metadata: { agentId: 'test', timestamp: Date.now() }
 * };
 * // TypeScript error: Type 'string' is not assignable to type 'null'.
 * ```
 */
export type AgentResponse<T = unknown> =
  | { status: 'success'; data: T; error: null; metadata: AgentResponseMetadata }
  | { status: 'error'; data: null; error: AgentErrorDetails; metadata: AgentResponseMetadata }
  | { status: 'partial'; data: T; error: null; metadata: AgentResponseMetadata };

/**
 * Error details for agent error responses
 *
 * Per PRD 6.2: Error responses include machine-readable codes,
 * human-readable messages, and a recoverable flag for retry logic.
 *
 * The `code` field uses SCREAMING_SNAKE_CASE convention and should
 * be one of the standard codes from {@link AGENT_ERROR_CODES}.
 *
 * @see {@link AGENT_ERROR_CODES} for standard error codes
 * @see {@link createErrorResponse} for factory function
 *
 * @example <caption>Error response (PRD 6.5)</caption>
 * ```ts
 * const error: AgentErrorDetails = {
 *   code: 'EXECUTION_FAILED',
 *   message: 'Failed to compile TypeScript files',
 *   details: {
 *     failedFiles: ['src/index.ts'],
 *     compilerErrors: ['TS2307: Cannot find module \\'foo\\'']
 *   },
 *   recoverable: true
 * };
 * ```
 */
export interface AgentErrorDetails {
  /**
   * Machine-readable error code (SCREAMING_SNAKE_CASE convention)
   *
   * Use standard codes from {@link AGENT_ERROR_CODES} when applicable.
   * Custom codes should follow the same naming convention.
   */
  code: string;

  /** Human-readable error description suitable for display or logging */
  message: string;

  /**
   * Additional error context - null if no details available
   *
   * May include field names, values, stack traces, or other diagnostic info.
   * Per PRD 6.4.4: Use null instead of undefined for absent values.
   */
  details?: Record<string, unknown> | null;

  /**
   * Whether the error is recoverable (can retry)
   *
   * Set to true for transient errors (rate limits, network issues).
   * Set to false for permanent errors (validation, invalid format).
   *
   * Per PRD 6.2: This is a hint for parent workflow retry logic.
   */
  recoverable: boolean;
}

/**
 * Metadata for agent responses
 *
 * Per PRD 6.3: Response metadata includes agent identification,
 * timing information, and optional correlation/tracing data.
 *
 * The timestamp is a Unix timestamp in milliseconds (not seconds).
 * Use Date.now() or similar to generate valid timestamps.
 *
 * @see {@link TokenUsage} for token usage structure
 *
 * @example <caption>Metadata from PRD 6.5</caption>
 * ```ts
 * const metadata: AgentResponseMetadata = {
 *   agentId: 'agent-abc123',
 *   timestamp: 1706140800000,
 *   duration: 1523
 * };
 * ```
 *
 * @example <caption>Full metadata with optional fields</caption>
 * ```ts
 * const metadata: AgentResponseMetadata = {
 *   agentId: 'agent-abc123',
 *   timestamp: Date.now(),
 *   duration: 1523,
 *   requestId: 'req-abc123',
 *   usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 25 },
 *   toolCalls: 3
 * };
 * ```
 */
export interface AgentResponseMetadata {
  /**
   * Agent identifier (required)
   *
   * Uniquely identifies the agent or workflow that generated this response.
   * Should be stable across multiple invocations of the same agent.
   */
  agentId: string;

  /**
   * Unix timestamp in milliseconds (required)
   *
   * The time when the response was generated, as a Unix timestamp in
   * milliseconds since the epoch (January 1, 1970). Use Date.now() to
   * generate current timestamps.
   *
   * @example
   * ```ts
   * timestamp: Date.now()  // Current time in milliseconds
   * timestamp: 1706140800000  // Fixed timestamp
   * ```
   */
  timestamp: number;

  /**
   * Execution duration in milliseconds (optional)
   *
   * The time taken to execute the agent prompt, from start to completion.
   * Useful for performance monitoring and debugging.
   */
  duration?: number | null;

  /**
   * Request correlation ID (optional)
   *
   * Used for tracing requests across distributed systems. Correlates
   * this response with the original request and any downstream calls.
   */
  requestId?: string | null;

  /**
   * Token usage from the API (optional, for backward compatibility)
   *
   * Breakdown of token usage including input, output, and cache tokens.
   * Only present when the API returns token usage information.
   */
  usage?: TokenUsage;

  /**
   * Number of tool invocations (optional, for backward compatibility)
   *
   * The count of tool/function calls made during agent execution.
   * Useful for tracking agent behavior and cost analysis.
   */
  toolCalls?: number;
}

// ========================
// Discriminated Union Types
// ========================

/**
 * Success response type - data is T (not null), error is null
 *
 * Use this type with type guards for type-safe access to response data.
 * When a response has status 'success', data is guaranteed to be T (not null).
 *
 * Per PRD 6.4.3: Consistent Structure - all success responses conform
 * to the AgentResponse interface with status 'success'.
 *
 * @template T - The type of data returned on success
 * @see {@link isSuccess} for the type guard that narrows to this type
 *
 * @example
 * ```ts
 * // Type narrowing with type guard
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 *   console.log(response.error); // TypeScript knows error is null
 * }
 * ```
 */
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };

/**
 * Error response type - data is null, error is AgentErrorDetails (not null)
 *
 * Use this type with type guards for type-safe access to error details.
 * When a response has status 'error', error is guaranteed to be AgentErrorDetails (not null).
 *
 * Per PRD 6.4.5: Error Responses - failed operations must still return
 * valid JSON with status 'error' and populated error field.
 *
 * @see {@link isError} for the type guard that narrows to this type
 * @see {@link AgentErrorDetails} for error details structure
 *
 * @example
 * ```ts
 * // Type narrowing with type guard
 * if (isError(response)) {
 *   console.log(response.error.code); // TypeScript knows error exists
 *   console.log(response.data); // TypeScript knows data is null
 * }
 * ```
 */
export type ErrorResponse = AgentResponse<null> & { status: 'error' };

/**
 * Partial response type - data is T, error is null
 *
 * Used for streaming or incremental results where the agent has not
 * yet completed the full request. Partial responses contain intermediate
 * progress data that may be updated in subsequent responses.
 *
 * Per PRD 6.4.3: Consistent Structure - all partial responses conform
 * to the AgentResponse interface with status 'partial'.
 *
 * @template T - The type of partial data returned
 * @see {@link isPartial} for the type guard that narrows to this type
 *
 * @example
 * ```ts
 * // Type narrowing with type guard
 * if (isPartial(response)) {
 *   console.log('Progress:', response.data.completedSteps);
 *   // TypeScript knows data is T and error is null
 * }
 * ```
 */
export type PartialResponse<T> = AgentResponse<T> & { status: 'partial' };

// ========================
// Error Code Constants
// ========================

/**
 * Standard error codes for agent responses
 *
 * All error codes use SCREAMING_SNAKE_CASE convention.
 *
 * Per PRD 6.6: Use `INVALID_RESPONSE_FORMAT` for responses that
 * don't conform to the AgentResponse schema. Validation failures
 * should be treated as errors with this code.
 *
 * @see {@link AgentErrorDetails} for error details structure
 * @see {@link createErrorResponse} for factory function
 *
 * @example
 * ```ts
 * import { AGENT_ERROR_CODES, createErrorResponse } from 'groundswell';
 *
 * const error = createErrorResponse(
 *   AGENT_ERROR_CODES.VALIDATION_FAILED,
 *   'Invalid input',
 *   { field: 'email', value: 'not-an-email' }
 * );
 * ```
 */
export const AGENT_ERROR_CODES = {
  /**
   * Response not valid JSON or doesn't match AgentResponse schema
   *
   * Per PRD 6.6: Invalid responses must be treated as errors with this code.
   * Use when response validation fails during parsing or schema checking.
   */
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',

  /**
   * Input validation failed
   *
   * Use when the provided inputs fail validation checks (e.g., wrong type,
   * missing required fields, out-of-range values).
   */
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  /**
   * Agent execution failed
   *
   * Use when the agent execution fails for reasons unrelated to validation
   * or API requests (e.g., compilation errors, runtime exceptions).
   */
  EXECUTION_FAILED: 'EXECUTION_FAILED',

  /**
   * API request to LLM provider failed
   *
   * Use when the HTTP request to the LLM provider fails (e.g., network errors,
   * timeout, rate limiting, provider-side errors).
   */
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',

  /**
   * Tool execution failed
   *
   * Use when a tool/function invocation fails during agent execution
   * (e.g., tool not found, tool returned error, tool timeout).
   */
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',

  /**
   * Internal validation or system error
   *
   * Use when an internal validation fails or a system error occurs.
   * This indicates a bug in the code (e.g., factory helper produced invalid response).
   * Non-recoverable because retrying with the same inputs will produce the same error.
   *
   * Per PRD 6.6: Internal validation failures should return this error code.
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  /**
   * Invalid harness/provider configuration
   *
   * Use when a harness receives a configuration it cannot honour — e.g. a model
   * provider it cannot run (ClaudeCodeHarness only runs anthropic/* per PRD §7.8).
   * Non-recoverable: the caller must select a different harness or model, not retry.
   */
  CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

// ========================
// Factory Functions
// ========================

/**
 * Creates a success response with data and metadata.
 *
 * ## PRD 6.4 Compliance
 *
 * The returned response satisfies all PRD 6.4 requirements:
 * - Strict JSON parseable by `JSON.parse()` (PRD 6.4.1)
 * - No prose wrapping - pure JSON structure (PRD 6.4.2)
 * - Consistent with AgentResponse interface (PRD 6.4.3)
 * - Uses null instead of undefined (PRD 6.4.4)
 *
 * @template T - The type of the response data
 * @param data - The response data to return
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse with status 'success', provided data, null error
 *
 * @example <caption>Basic success response (PRD 6.5)</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * );
 *
 * // Guaranteed to be valid JSON (PRD 6.4.1)
 * const jsonString = JSON.stringify(response);
 * const parsed = JSON.parse(jsonString); // Always valid
 * ```
 *
 * @example <caption>Success response with execution metadata</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { items: [1, 2, 3] },
 *   {
 *     agentId: 'agent-123',
 *     timestamp: Date.now(),
 *     duration: 1523,
 *     requestId: 'req-abc123'
 *   }
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
 * ## PRD 6.4 Compliance
 *
 * Per PRD 6.4.5: Failed operations must still return valid JSON with
 * status 'error' and populated error field. This function ensures all
 * error responses conform to the AgentResponse schema.
 *
 * The error code should use SCREAMING_SNAKE_CASE convention and ideally
 * be one of the standard codes from {@link AGENT_ERROR_CODES}.
 *
 * @param code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param message - Human-readable error message
 * @param details - Optional additional error context (use null instead of undefined per PRD 6.4.4)
 * @param recoverable - Whether the error is recoverable (default: false)
 * @returns An error AgentResponse with null data, populated error field
 *
 * @example <caption>Error response (PRD 6.5)</caption>
 * ```ts
 * const response = createErrorResponse(
 *   'EXECUTION_FAILED',
 *   'Failed to compile TypeScript files',
 *   {
 *     failedFiles: ['src/index.ts'],
 *     compilerErrors: ['TS2307: Cannot find module \\'foo\\'']
 *   },
 *   true
 * );
 * ```
 *
 * @example <caption>Using standard error codes</caption>
 * ```ts
 * import { AGENT_ERROR_CODES, createErrorResponse } from 'groundswell';
 *
 * const response = createErrorResponse(
 *   AGENT_ERROR_CODES.VALIDATION_FAILED,
 *   'Invalid input',
 *   { field: 'email', value: 'not-an-email' },
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
 * ## PRD 6.4 Compliance
 *
 * Per PRD 6.4.3: Consistent Structure - partial responses conform to
 * the AgentResponse interface with status 'partial'.
 *
 * Partial responses are used for streaming or incremental results where
 * the agent has not yet completed the full request. They contain intermediate
 * progress data that may be updated in subsequent responses.
 *
 * @template T - The type of the partial response data
 * @param data - The partial response data with progress information
 * @returns A partial AgentResponse with status 'partial', data, null error
 *
 * @example <caption>Partial response (PRD 6.5)</caption>
 * ```ts
 * const response = createPartialResponse({
 *   completedSteps: 3,
 *   totalSteps: 5,
 *   intermediateResult: { progress: 'processing file2.ts' }
 * });
 *
 * // Later, send another partial response with updated progress
 * const updatedResponse = createPartialResponse({
 *   completedSteps: 4,
 *   totalSteps: 5,
 *   intermediateResult: { progress: 'processing file3.ts' }
 * });
 * ```
 *
 * @example <caption>Streaming data chunks</caption>
 * ```ts
 * const chunk = createPartialResponse({
 *   chunk: 'Hello',
 *   isComplete: false
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

// ========================
// Zod Schema Definitions
// ========================

/**
 * Zod schema for AgentResponseStatus enum
 * Validates status values: 'success' | 'error' | 'partial'
 *
 * @example
 * ```ts
 * AgentResponseStatusSchema.parse('success'); // ✓
 * AgentResponseStatusSchema.parse('invalid'); // ✗ ZodError
 * ```
 */
export const AgentResponseStatusSchema = z.enum(['success', 'error', 'partial']);

/**
 * Zod schema for AgentErrorDetails interface
 * Validates error details with null-over-undefined handling
 *
 * Per PRD 6.4.4: Use null for absent values, not undefined
 */
export const AgentErrorDetailsSchema = z.object({
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: z.string(),
  /** Human-readable error description */
  message: z.string(),
  /** Additional error context - null if no details (PRD 6.4.4) */
  details: z.record(z.string(), z.unknown()).nullable(),
  /** Whether the error is recoverable (can retry) */
  recoverable: z.boolean(),
});

/**
 * Zod schema for AgentResponseMetadata interface
 * Validates response metadata including agent ID and timestamp
 */
export const AgentResponseMetadataSchema = z.object({
  /** Agent identifier */
  agentId: z.string(),
  /** Unix timestamp in milliseconds */
  timestamp: z.number(),
  /** Execution duration in milliseconds (optional) */
  duration: z.number().optional(),
  /** Request correlation ID (optional) */
  requestId: z.string().optional(),
  /** Token usage from API (optional - passthrough for complex type) */
  usage: z.unknown().optional(),
  /** Number of tool invocations (optional) */
  toolCalls: z.number().optional(),
});

/**
 * Zod schema factory for AgentResponse<T> discriminated union
 * Creates a schema that validates responses based on status discriminator
 *
 * @template T - The Zod schema for the data type
 * @param dataSchema - Zod schema for the response data
 * @returns A discriminated union schema for AgentResponse
 *
 * @example
 * ```ts
 * // Create schema for string responses
 * const StringResponseSchema = AgentResponseSchema(z.object({ result: z.string() }));
 *
 * // Validate a success response
 * const result = StringResponseSchema.safeParse({
 *   status: 'success',
 *   data: { result: 'hello' },
 *   error: null,
 *   metadata: { agentId: 'test', timestamp: Date.now() }
 * });
 * ```
 */
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),  // PRD 6.4.4: null not undefined
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]).superRefine((data, ctx) => {
    // Runtime validation: ensure consistency between status and data/error fields
    if (data.status === 'success') {
      if (data.error !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid state: status='success' but error is non-null (must be null)",
          path: ['error'],
        });
      }
    } else if (data.status === 'error') {
      if (data.data !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid state: status='error' but data is non-null (must be null)",
          path: ['data'],
        });
      }
    } else if (data.status === 'partial') {
      if (data.error !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid state: status='partial' but error is non-null (must be null)",
          path: ['error'],
        });
      }
    }
  });
}
