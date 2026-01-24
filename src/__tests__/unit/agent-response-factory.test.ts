import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
  AGENT_ERROR_CODES,
  type AgentResponse,
  type SuccessResponse,
  type ErrorResponse,
  type PartialResponse,
} from '../../types/agent.js';

describe('AgentResponse Factory Functions', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data and metadata', () => {
      const data = { result: 'success', value: 42 };
      const metadata = {
        agentId: 'agent-123',
        timestamp: 1706760000000,
        duration: 100,
      };

      const response = createSuccessResponse(data, metadata);

      expect(response.status).toBe('success');
      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
      expect(response.metadata).toEqual(metadata);
    });

    it('should preserve generic type parameter', () => {
      type TestData = { name: string; count: number };
      const data: TestData = { name: 'test', count: 5 };
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
      };

      const response = createSuccessResponse<TestData>(data, metadata);

      // Type assertion: TypeScript knows response.data is TestData
      expect(response.data.name).toBe('test');
      expect(response.data.count).toBe(5);
    });

    it('should create success response with null optional metadata fields', () => {
      const data = 'simple result';
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
        duration: null,
        requestId: null,
      };

      const response = createSuccessResponse(data, metadata);

      expect(response.metadata.duration).toBeNull();
      expect(response.metadata.requestId).toBeNull();
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with required fields', () => {
      const response = createErrorResponse(
        'INVALID_RESPONSE_FORMAT',
        'Failed to parse response'
      );

      expect(response.status).toBe('error');
      expect(response.data).toBeNull();
      expect(response.error).toEqual({
        code: 'INVALID_RESPONSE_FORMAT',
        message: 'Failed to parse response',
        details: null,
        recoverable: false,
      });
      expect(response.metadata.agentId).toBe('unknown');
      expect(response.metadata.timestamp).toBeGreaterThan(0);
    });

    it('should create an error response with details', () => {
      const details = { field: 'value', errors: ['missing'] };
      const response = createErrorResponse(
        'VALIDATION_FAILED',
        'Validation error occurred',
        details,
        true
      );

      expect(response.error?.code).toBe('VALIDATION_FAILED');
      expect(response.error?.message).toBe('Validation error occurred');
      expect(response.error?.details).toEqual(details);
      expect(response.error?.recoverable).toBe(true);
    });

    it('should use SCREAMING_SNAKE_CASE for error codes', () => {
      const validCodes = Object.values(AGENT_ERROR_CODES);

      validCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z][A-Z_]*$/);
      });
    });

    it('should default recoverable to false', () => {
      const response = createErrorResponse(
        'EXECUTION_FAILED',
        'Execution failed'
      );

      expect(response.error?.recoverable).toBe(false);
    });

    it('should handle undefined details by setting to null', () => {
      const response = createErrorResponse(
        'API_REQUEST_FAILED',
        'API request failed',
        undefined,
        true
      );

      expect(response.error?.details).toBeNull();
    });

    it('should return AgentResponse<null> type', () => {
      const response = createErrorResponse(
        'TOOL_EXECUTION_FAILED',
        'Tool execution failed'
      );

      // Type assertion: data is null for error responses
      expect(response.data).toBeNull();
      // TypeScript should know this is AgentResponse<null>
      const typedResponse: AgentResponse<null> = response;
      expect(typedResponse).toBeDefined();
    });
  });

  describe('createPartialResponse', () => {
    it('should create a partial response with data', () => {
      const data = { completedSteps: 3, totalSteps: 5 };

      const response = createPartialResponse(data);

      expect(response.status).toBe('partial');
      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
      expect(response.metadata.agentId).toBe('unknown');
      expect(response.metadata.timestamp).toBeGreaterThan(0);
    });

    it('should preserve generic type parameter', () => {
      type PartialData = { progress: number; status: string };
      const data: PartialData = { progress: 0.6, status: 'processing' };

      const response = createPartialResponse<PartialData>(data);

      // Type assertion: TypeScript knows response.data is PartialData
      expect(response.data.progress).toBe(0.6);
      expect(response.data.status).toBe('processing');
    });

    it('should handle primitive data types', () => {
      const stringResponse = createPartialResponse('partial string');
      expect(stringResponse.data).toBe('partial string');

      const numberResponse = createPartialResponse(42);
      expect(numberResponse.data).toBe(42);

      const arrayResponse = createPartialResponse([1, 2, 3]);
      expect(arrayResponse.data).toEqual([1, 2, 3]);
    });
  });

  describe('Type Guards', () => {
    describe('isSuccess', () => {
      it('should return true for success responses', () => {
        const response = createSuccessResponse(
          { result: 'ok' },
          { agentId: 'agent-123', timestamp: Date.now() }
        );

        expect(isSuccess(response)).toBe(true);
      });

      it('should return false for error responses', () => {
        const response = createErrorResponse('TEST_ERROR', 'Test error');
        expect(isSuccess(response)).toBe(false);
      });

      it('should return false for partial responses', () => {
        const response = createPartialResponse({ progress: 0.5 });
        expect(isSuccess(response)).toBe(false);
      });

      it('should narrow type to SuccessResponse<T>', () => {
        const response: AgentResponse<string> = createSuccessResponse(
          'test data',
          { agentId: 'agent-123', timestamp: Date.now() }
        );

        if (isSuccess(response)) {
          // TypeScript knows: response.data is string (not null)
          // TypeScript knows: response.error is null
          expect(response.data.toUpperCase()).toBe('TEST DATA');
          expect(response.error).toBeNull();
        }
      });
    });

    describe('isError', () => {
      it('should return true for error responses', () => {
        const response = createErrorResponse('TEST_ERROR', 'Test error');
        expect(isError(response)).toBe(true);
      });

      it('should return false for success responses', () => {
        const response = createSuccessResponse(
          { result: 'ok' },
          { agentId: 'agent-123', timestamp: Date.now() }
        );
        expect(isError(response)).toBe(false);
      });

      it('should return false for partial responses', () => {
        const response = createPartialResponse({ progress: 0.5 });
        expect(isError(response)).toBe(false);
      });

      it('should narrow type to ErrorResponse', () => {
        const response: AgentResponse<string> = createErrorResponse(
          'TEST_ERROR',
          'Test error',
          { context: 'test' },
          true
        );

        if (isError(response)) {
          // TypeScript knows: response.data is null
          // TypeScript knows: response.error is AgentErrorDetails (not null)
          expect(response.error.code).toBe('TEST_ERROR');
          expect(response.error.recoverable).toBe(true);
          expect(response.data).toBeNull();
        }
      });
    });

    describe('isPartial', () => {
      it('should return true for partial responses', () => {
        const response = createPartialResponse({ progress: 0.5 });
        expect(isPartial(response)).toBe(true);
      });

      it('should return false for success responses', () => {
        const response = createSuccessResponse(
          { result: 'ok' },
          { agentId: 'agent-123', timestamp: Date.now() }
        );
        expect(isPartial(response)).toBe(false);
      });

      it('should return false for error responses', () => {
        const response = createErrorResponse('TEST_ERROR', 'Test error');
        expect(isPartial(response)).toBe(false);
      });

      it('should narrow type to PartialResponse<T>', () => {
        type TestType = { progress: number };
        const response: AgentResponse<TestType> = createPartialResponse({
          progress: 0.5,
        });

        if (isPartial(response)) {
          // TypeScript knows: response.data is TestType
          // TypeScript knows: response.error is null
          expect(response.data.progress).toBe(0.5);
          expect(response.error).toBeNull();
        }
      });
    });
  });

  describe('Type Narrowing Patterns', () => {
    it('should handle discriminated union with if-else chain', () => {
      const responses: AgentResponse<string>[] = [
        createSuccessResponse('success', {
          agentId: 'agent-123',
          timestamp: Date.now(),
        }),
        createErrorResponse('TEST_ERROR', 'Test error'),
        createPartialResponse('partial'),
      ];

      const results: string[] = [];

      for (const response of responses) {
        if (isSuccess(response)) {
          // TypeScript knows: data is string
          results.push(`success: ${response.data}`);
        } else if (isError(response)) {
          // TypeScript knows: error exists
          results.push(`error: ${response.error.code}`);
        } else if (isPartial(response)) {
          // TypeScript knows: data is string
          results.push(`partial: ${response.data}`);
        }
      }

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('success: success');
      expect(results[1]).toBe('error: TEST_ERROR');
      expect(results[2]).toBe('partial: partial');
    });

    it('should handle switch-style pattern with type guards', () => {
      const handleResponse = (response: AgentResponse<number>): string => {
        if (isSuccess(response)) {
          return `Success with value: ${response.data * 2}`;
        }
        if (isError(response)) {
          return `Error: ${response.error.message} (recoverable: ${response.error.recoverable})`;
        }
        if (isPartial(response)) {
          return `Partial: ${response.data}% complete`;
        }
        return 'Unknown response type';
      };

      const successResponse = createSuccessResponse(42, {
        agentId: 'agent-123',
        timestamp: Date.now(),
      });
      expect(handleResponse(successResponse)).toBe('Success with value: 84');

      const errorResponse = createErrorResponse(
        'TEST_ERROR',
        'Something went wrong',
        undefined,
        true
      );
      expect(handleResponse(errorResponse)).toBe(
        'Error: Something went wrong (recoverable: true)'
      );

      const partialResponse = createPartialResponse(75);
      expect(handleResponse(partialResponse)).toBe('Partial: 75% complete');
    });
  });

  describe('Null Handling (PRD 6.4.4)', () => {
    it('should use null for absent error in success responses', () => {
      const response = createSuccessResponse(
        'data',
        { agentId: 'agent-123', timestamp: Date.now() }
      );

      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();
    });

    it('should use null for absent data in error responses', () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error');

      expect(response.data).toBeNull();
      expect(response.data).not.toBeUndefined();
    });

    it('should use null for absent error in partial responses', () => {
      const response = createPartialResponse('partial data');

      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();
    });

    it('should use null for undefined optional details', () => {
      const response = createErrorResponse(
        'TEST_ERROR',
        'Test error',
        undefined
      );

      expect(response.error?.details).toBeNull();
      expect(response.error?.details).not.toBeUndefined();
    });
  });

  describe('AGENT_ERROR_CODES constant', () => {
    it('should contain all standard error codes', () => {
      expect(AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT).toBe(
        'INVALID_RESPONSE_FORMAT'
      );
      expect(AGENT_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(AGENT_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.API_REQUEST_FAILED).toBe(
        'API_REQUEST_FAILED'
      );
      expect(AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED).toBe(
        'TOOL_EXECUTION_FAILED'
      );
    });

    it('should be readonly (as const)', () => {
      // AGENT_ERROR_CODES should be readonly
      // This is a compile-time check - if this compiles, the constant is properly typed
      const errorCode: string = AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT;
      expect(errorCode).toBe('INVALID_RESPONSE_FORMAT');
    });
  });
});
