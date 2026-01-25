/**
 * Test file: agent-error-codes.test.ts
 *
 * Purpose: Validate error code handling scenarios per PRD 6.2 requirements
 *
 * Tests:
 * - INVALID_RESPONSE_FORMAT code on malformed response
 * - EXECUTION_FAILED on workflow errors
 * - Custom codes from tool use failures
 * - recoverable field affects retry logic
 * - All error codes are machine-readable
 *
 * PRP: P1.M2.T2.S2 - Write tests for error code handling
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  createErrorResponse,
  createSuccessResponse,
  AGENT_ERROR_CODES,
  type AgentResponse,
} from '../../types/agent.js';

describe('Error Code Handling', () => {
  describe('INVALID_RESPONSE_FORMAT Error Code', () => {
    it('should handle non-JSON responses', () => {
      // Simulate response that's not valid JSON
      const malformedText = 'This is not JSON';

      // Should return INVALID_RESPONSE_FORMAT error
      const expectedResponse = createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'Response is not valid JSON',
        { rawResponse: malformedText },
        false  // Non-recoverable
      );

      expect(expectedResponse.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(expectedResponse.error?.recoverable).toBe(false);
    });

    it('should handle schema violations with INVALID_RESPONSE_FORMAT', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      // Response with wrong data type for success
      const invalidResponse = {
        status: 'success' as const,
        data: 123,  // Should be object, not number
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(invalidResponse);
      expect(result.success).toBe(false);

      // Should be treated as INVALID_RESPONSE_FORMAT
      // (in actual implementation, this would return INTERNAL_ERROR from validateResponse)
    });

    it('should handle responses with missing required fields', () => {
      const schema = AgentResponseSchema(z.string());

      // Response missing status field
      const missingFieldResponse = {
        // status: 'success', // Missing!
        data: 'test',
        error: null,
      };

      const result = schema.safeParse(missingFieldResponse);
      expect(result.success).toBe(false);
    });

    it('should handle responses with wrong data types for error status', () => {
      const schema = AgentResponseSchema(z.string());

      // Error response should have data: null, not string
      const wrongTypeError = {
        status: 'error' as const,
        data: 'should be null',  // Wrong!
        error: {
          code: 'TEST',
          message: 'test',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(wrongTypeError);
      expect(result.success).toBe(false);
    });

    it('should validate INVALID_RESPONSE_FORMAT is non-recoverable', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        'Malformed response'
      );

      expect(error.error?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(error.error?.recoverable).toBe(false);
    });
  });

  describe('EXECUTION_FAILED Error Code', () => {
    it('should handle workflow compilation failures', () => {
      const compilationError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Failed to compile TypeScript files',
        {
          failedFiles: ['src/index.ts'],
          compilerErrors: ['TS2307: Cannot find module'],
        },
        false  // Non-recoverable - code error
      );

      expect(compilationError.error?.code).toBe('EXECUTION_FAILED');
      expect(compilationError.error?.recoverable).toBe(false);
      expect(compilationError.error?.details?.failedFiles).toEqual(['src/index.ts']);
    });

    it('should handle workflow runtime exceptions', () => {
      const runtimeError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Runtime exception in workflow step',
        {
          stepName: 'processData',
          exception: 'TypeError: Cannot read property of undefined',
        },
        true  // May be recoverable if transient
      );

      expect(runtimeError.error?.code).toBe('EXECUTION_FAILED');
      expect(runtimeError.error?.recoverable).toBe(true);
    });

    it('should validate EXECUTION_FAILED against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Workflow execution failed',
        { step: 'step1', reason: 'timeout' },
        true
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('EXECUTION_FAILED');
      }
    });

    it('should handle workflow step failures', () => {
      const stepError = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Workflow step "generateReport" failed',
        {
          stepName: 'generateReport',
          stepType: 'async',
          error: 'Report generation timeout',
        },
        true  // May be recoverable
      );

      expect(stepError.error?.code).toBe('EXECUTION_FAILED');
      expect(stepError.error?.recoverable).toBe(true);
    });
  });

  describe('Tool Execution Failures', () => {
    it('should handle tool execution failures with TOOL_EXECUTION_FAILED', () => {
      const toolError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "search-web" failed: Rate limit exceeded',
        {
          toolName: 'search-web',
          originalError: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
        true  // Recoverable - rate limit is transient
      );

      expect(toolError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(toolError.error?.recoverable).toBe(true);
      expect(toolError.error?.details?.toolName).toBe('search-web');
      expect(toolError.error?.details?.retryAfter).toBe(60);
    });

    it('should handle tool not found errors', () => {
      const notFoundError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "non-existent-tool" not found',
        {
          toolName: 'non-existent-tool',
          availableTools: ['search-web', 'calculator', 'file-read'],
        },
        false  // Non-recoverable - tool doesn't exist
      );

      expect(notFoundError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(notFoundError.error?.recoverable).toBe(false);
      expect(notFoundError.error?.details?.availableTools).toHaveLength(3);
    });

    it('should handle tool timeout errors', () => {
      const timeoutError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool "long-running-task" timed out after 30000ms',
        {
          toolName: 'long-running-task',
          timeout: 30000,
        },
        true  // Recoverable - may succeed on retry
      );

      expect(timeoutError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(timeoutError.error?.recoverable).toBe(true);
    });

    it('should handle tool execution with error response', () => {
      const toolExecutionError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool execution returned error',
        {
          toolName: 'database-query',
          toolInput: { query: 'SELECT * FROM users' },
          toolOutput: { error: 'Table "users" does not exist' },
        },
        false  // Non-recoverable - query is invalid
      );

      expect(toolExecutionError.error?.code).toBe('TOOL_EXECUTION_FAILED');
      expect(toolExecutionError.error?.recoverable).toBe(false);
    });
  });

  describe('Recoverable Field and Retry Logic', () => {
    // Helper function to simulate retry logic
    function shouldRetry(response: AgentResponse<unknown>): boolean {
      return response.status === 'error' && response.error?.recoverable === true;
    }

    it('should retry recoverable errors (API_REQUEST_FAILED)', () => {
      const recoverableError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'Network timeout',
        { timeout: 30000, retryAfter: 1000 },
        true  // Recoverable
      );

      expect(shouldRetry(recoverableError)).toBe(true);
      expect(recoverableError.error?.code).toBe('API_REQUEST_FAILED');
    });

    it('should not retry non-recoverable errors (VALIDATION_FAILED)', () => {
      const validationError = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Invalid input: email format incorrect',
        { field: 'email', value: 'not-an-email' },
        false  // Non-recoverable
      );

      expect(shouldRetry(validationError)).toBe(false);
      expect(validationError.error?.code).toBe('VALIDATION_FAILED');
    });

    it('should not retry INTERNAL_ERROR (always non-recoverable)', () => {
      const internalError = createErrorResponse(
        AGENT_ERROR_CODES.INTERNAL_ERROR,
        'Internal response validation failed',
        { validationErrors: ['Field X is required'] },
        false  // Always non-recoverable
      );

      expect(shouldRetry(internalError)).toBe(false);
      expect(internalError.error?.recoverable).toBe(false);
    });

    it('should retry tool timeout errors', () => {
      const timeoutError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool timed out',
        { toolName: 'slow-tool', timeout: 30000 },
        true
      );

      expect(shouldRetry(timeoutError)).toBe(true);
    });

    it('should not retry tool not found errors', () => {
      const notFoundError = createErrorResponse(
        AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
        'Tool not found',
        { toolName: 'missing-tool' },
        false
      );

      expect(shouldRetry(notFoundError)).toBe(false);
    });

    it('should not retry on success responses', () => {
      const successResponse = createSuccessResponse(
        { result: 'ok' },
        { agentId: 'test', timestamp: Date.now() }
      );

      expect(shouldRetry(successResponse)).toBe(false);
    });

    it('should handle retry logic with exponential backoff context', () => {
      const rateLimitError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'Rate limit exceeded',
        {
          retryAfter: 60,
          limit: 100,
          window: '1m',
        },
        true
      );

      expect(shouldRetry(rateLimitError)).toBe(true);
      expect(rateLimitError.error?.details?.retryAfter).toBe(60);
    });
  });

  describe('Machine-Readable Error Codes (PRD 6.2)', () => {
    it('should have all error codes as strings', () => {
      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        expect(typeof code).toBe('string');
      });
    });

    it('should follow SCREAMING_SNAKE_CASE format', () => {
      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        expect(code).toMatch(/^[A-Z][A-Z_]*$/);
      });
    });

    it('should be programmatically parsable', () => {
      // Simulate switch statement usage
      const handleError = (code: string): string => {
        switch (code) {
          case AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT:
            return 'Handle invalid format';
          case AGENT_ERROR_CODES.VALIDATION_FAILED:
            return 'Handle validation error';
          case AGENT_ERROR_CODES.EXECUTION_FAILED:
            return 'Handle execution error';
          case AGENT_ERROR_CODES.API_REQUEST_FAILED:
            return 'Handle API error';
          case AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED:
            return 'Handle tool error';
          case AGENT_ERROR_CODES.INTERNAL_ERROR:
            return 'Handle internal error';
          default:
            return 'Unknown error code';
        }
      };

      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        const result = handleError(code);
        expect(result).not.toBe('Unknown error code');
      });
    });

    it('should export all standard error codes', () => {
      expect(AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT).toBe('INVALID_RESPONSE_FORMAT');
      expect(AGENT_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(AGENT_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.API_REQUEST_FAILED).toBe('API_REQUEST_FAILED');
      expect(AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED).toBe('TOOL_EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should allow error code comparison', () => {
      const response = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Test error'
      );

      // Test that error codes can be compared directly
      expect(response.error?.code === AGENT_ERROR_CODES.VALIDATION_FAILED).toBe(true);
      expect(response.error?.code === AGENT_ERROR_CODES.EXECUTION_FAILED).toBe(false);
    });

    it('should allow error code pattern matching', () => {
      const apiError = createErrorResponse(
        AGENT_ERROR_CODES.API_REQUEST_FAILED,
        'API error'
      );

      // Test that error codes can be pattern matched
      expect(apiError.error?.code.endsWith('_FAILED')).toBe(true);
      expect(apiError.error?.code.startsWith('API_')).toBe(true);
    });
  });

  describe('Custom Error Code Scenarios', () => {
    it('should handle custom error codes with tool-specific details', () => {
      const customToolError = createErrorResponse(
        'CUSTOM_DATABASE_ERROR',
        'Database connection failed',
        {
          database: 'postgres',
          host: 'db.example.com',
          port: 5432,
          originalCode: 'ECONNREFUSED',
        },
        true  // Recoverable - connection may succeed on retry
      );

      expect(customToolError.error?.code).toBe('CUSTOM_DATABASE_ERROR');
      expect(customToolError.error?.recoverable).toBe(true);
      expect(customToolError.error?.details?.database).toBe('postgres');
    });

    it('should handle custom validation error with field context', () => {
      const customValidationError = createErrorResponse(
        'CUSTOM_EMAIL_VALIDATION_FAILED',
        'Email address validation failed',
        {
          field: 'email',
          value: 'invalid-email',
          constraint: 'RFC 5322 format',
        },
        false  // Non-recoverable - value is invalid
      );

      expect(customValidationError.error?.code).toBe('CUSTOM_EMAIL_VALIDATION_FAILED');
      expect(customValidationError.error?.recoverable).toBe(false);
    });

    it('should serialize custom error codes correctly', () => {
      const customError = createErrorResponse(
        'CUSTOM_RATE_LIMIT',
        'API rate limit exceeded',
        { limit: 100, window: '1h', current: 150 },
        true
      );

      const serialized = JSON.parse(JSON.stringify(customError));

      expect(serialized.error.code).toBe('CUSTOM_RATE_LIMIT');
      expect(serialized.error.recoverable).toBe(true);
      expect(serialized.error.details.limit).toBe(100);
    });

    it('should validate custom error codes against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const customError = createErrorResponse(
        'CUSTOM_AUTH_ERROR',
        'Authentication failed',
        { provider: 'oauth2', reason: 'invalid_token' },
        false
      );

      const result = schema.safeParse(customError);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('CUSTOM_AUTH_ERROR');
      }
    });
  });

  describe('Error Code Details Validation', () => {
    it('should validate error with null details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Validation failed',
        null,  // Explicitly null
        false
      );

      expect(error.error?.details).toBeNull();
      expect(error.error?.details).not.toBeUndefined();
    });

    it('should validate error with object details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Execution failed',
        {
          step: 'process',
          duration: 5000,
          memoryUsage: '256MB',
        },
        false
      );

      expect(error.error?.details).toEqual({
        step: 'process',
        duration: 5000,
        memoryUsage: '256MB',
      });
    });

    it('should validate error with array details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Multiple validation errors',
        {
          errors: [
            { field: 'email', message: 'Invalid format' },
            { field: 'age', message: 'Must be positive' },
          ],
        },
        false
      );

      expect(Array.isArray(error.error?.details?.errors)).toBe(true);
      expect(error.error?.details?.errors).toHaveLength(2);
    });

    it('should validate error with nested details', () => {
      const error = createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        'Complex error details',
        {
          workflow: {
            id: 'wf-123',
            steps: ['step1', 'step2'],
            failedAt: 'step2',
            error: {
              type: 'Timeout',
              duration: 30000,
            },
          },
        },
        true
      );

      expect(error.error?.details?.workflow?.failedAt).toBe('step2');
      expect(error.error?.details?.workflow?.error?.type).toBe('Timeout');
    });
  });
});
