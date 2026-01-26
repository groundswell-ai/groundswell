/**
 * Agent response validation utilities
 *
 * Provides pure, side-effect-free functions for validating AgentResponse
 * instances using Zod schemas. The utilities enable both Agent and Workflow
 * classes to perform validation without duplicating code.
 *
 * @module agent-validation
 */

import type { AgentResponse } from '../types/agent.js';
import { AgentResponseSchema } from '../types/agent.js';
import { z } from 'zod';

/**
 * Validation result type for agent response validation
 *
 * Provides structured validation result with boolean validity flag
 * and optional ZodError for detailed error information.
 */
export interface ValidationResult {
  /** Whether the response is valid according to the schema */
  valid: boolean;
  /** Zod validation errors (present when valid is false) */
  errors?: z.ZodError;
}

/**
 * Validate an AgentResponse against a Zod schema
 *
 * This is a pure, side-effect-free function that validates AgentResponse
 * instances using Zod schemas. It returns a structured ValidationResult
 * with validity flag and optional error details.
 *
 * **Validation Flow:**
 * 1. Create AgentResponseSchema using provided dataSchema
 * 2. Call schema.safeParse(response) for non-throwing validation
 * 3. Return { valid: true } if validation succeeds
 * 4. Return { valid: false, errors: ZodError } if validation fails
 *
 * **Pure Function Guarantee:**
 * - Deterministic: Same input always produces same output
 * - No side effects: Doesn't modify inputs, emit events, or log
 * - No external dependencies: Doesn't use Date.now(), Math.random(), etc.
 *
 * @template T - The type of response data
 * @param response - The AgentResponse to validate
 * @param dataSchema - The Zod schema for the response data (defaults to z.unknown())
 * @returns Structured validation result with validity flag and optional errors
 *
 * @example Valid response
 * ```ts
 * const response: AgentResponse<string> = {
 *   status: 'success',
 *   data: 'Hello, World!',
 *   error: null,
 *   metadata: { agentId: 'agent-123', timestamp: Date.now() }
 * };
 *
 * const result = validateAgentResponse(response);
 * // Returns: { valid: true }
 * ```
 *
 * @example Invalid response
 * ```ts
 * const response = {
 *   status: 'success',
 *   data: null,  // Invalid: data should be string, not null
 *   error: null,
 *   metadata: { agentId: 'agent-123', timestamp: Date.now() }
 * };
 *
 * const result = validateAgentResponse(response, z.string());
 * // Returns: { valid: false, errors: ZodError }
 * ```
 *
 * @remarks
 * **Integration with Agent.validateResponse():**
 * This utility is called by Agent.validateResponse() which adds:
 * - console.error logging with agentId
 * - INTERNAL_ERROR response creation on validation failure
 *
 * **Integration with Workflow.validateAgentResponse():**
 * This utility is called by Workflow.validateAgentResponse() which adds:
 * - invalidResponse event emission
 * - WorkflowError creation with INVALID_RESPONSE_FORMAT context
 *
 * @see {@link AgentResponseSchema} - Schema factory used for validation
 * @see {@link ValidationResult} - Return type structure
 */
export function validateAgentResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny = z.unknown()
): ValidationResult {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate response against schema (non-throwing)
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid
    return { valid: true };
  }

  // Validation failed - return structured error
  return { valid: false, errors: validation.error };
}
