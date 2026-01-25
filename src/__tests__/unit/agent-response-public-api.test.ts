/**
 * Test file: agent-response-public-api.test.ts
 *
 * Purpose: Verify all AgentResponse types and utilities are exported from public API
 *
 * This is a Level 2 validation test that ensures:
 * - All AgentResponse types are accessible via import from main index.ts
 * - All AgentResponse utilities are accessible via import from main index.ts
 * - Type narrowing works with discriminated unions
 * - Type guards work correctly
 * - Factory functions create valid responses
 *
 * PRP: P1.M1.T3.S1 - Verify AgentResponse Types are Exported from index.ts
 */

import { describe, it, expect } from 'vitest';
// Import from MAIN INDEX (public API entry point)
import type {
  AgentResponse,
  AgentResponseStatus,
  AgentErrorDetails,
  AgentResponseMetadata,
  SuccessResponse,
  ErrorResponse,
  PartialResponse,
} from '../../index.js';
import {
  AGENT_ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
} from '../../index.js';

describe('AgentResponse Public API Exports', () => {
  describe('Type Exports', () => {
    it('should export AgentResponse type', () => {
      const response: AgentResponse<string> = {
        status: 'success',
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
      expect(response.status).toBe('success');
    });

    it('should export AgentResponseStatus type', () => {
      const status: AgentResponseStatus = 'success';
      expect(status).toBe('success');
      // Verify all valid status values
      const success: AgentResponseStatus = 'success';
      const error: AgentResponseStatus = 'error';
      const partial: AgentResponseStatus = 'partial';
      expect([success, error, partial]).toEqual(['success', 'error', 'partial']);
    });

    it('should export AgentErrorDetails type', () => {
      const error: AgentErrorDetails = {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: null,
        recoverable: false
      };
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.details).toBeNull();
      expect(error.recoverable).toBe(false);
    });

    it('should export AgentErrorDetails with optional details', () => {
      const error: AgentErrorDetails = {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: { field: 'value', count: 42 },
        recoverable: true
      };
      expect(error.details).toEqual({ field: 'value', count: 42 });
      expect(error.recoverable).toBe(true);
    });

    it('should export AgentResponseMetadata type', () => {
      const metadata: AgentResponseMetadata = {
        agentId: 'test',
        timestamp: Date.now()
      };
      expect(metadata.agentId).toBe('test');
      expect(typeof metadata.timestamp).toBe('number');
    });

    it('should export AgentResponseMetadata with optional fields', () => {
      const metadata: AgentResponseMetadata = {
        agentId: 'test',
        timestamp: Date.now(),
        duration: 100,
        requestId: 'req-123',
        usage: { inputTokens: 10, outputTokens: 20 },
        toolCalls: 3
      };
      expect(metadata.duration).toBe(100);
      expect(metadata.requestId).toBe('req-123');
      expect(metadata.usage?.inputTokens).toBe(10);
      expect(metadata.toolCalls).toBe(3);
    });

    it('should export SuccessResponse discriminated union', () => {
      const response: SuccessResponse<string> = {
        status: 'success',
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
      expect(response.status).toBe('success');
      expect(response.data).toBe('test');
      expect(response.error).toBeNull();
    });

    it('should export ErrorResponse discriminated union', () => {
      const response: ErrorResponse = {
        status: 'error',
        data: null,
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
      expect(response.status).toBe('error');
      expect(response.data).toBeNull();
      expect(response.error?.code).toBe('TEST');
    });

    it('should export PartialResponse discriminated union', () => {
      const response: PartialResponse<string> = {
        status: 'partial',
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
      expect(response.status).toBe('partial');
      expect(response.data).toBe('test');
      expect(response.error).toBeNull();
    });
  });

  describe('Utility Exports', () => {
    it('should export AGENT_ERROR_CODES constant', () => {
      expect(AGENT_ERROR_CODES).toBeDefined();
      expect(AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT).toBe('INVALID_RESPONSE_FORMAT');
      expect(AGENT_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(AGENT_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
      expect(AGENT_ERROR_CODES.API_REQUEST_FAILED).toBe('API_REQUEST_FAILED');
      expect(AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED).toBe('TOOL_EXECUTION_FAILED');
    });

    it('should export createSuccessResponse function', () => {
      const response = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });
      expect(response.status).toBe('success');
      expect(response.data).toBe('data');
      expect(response.error).toBeNull();
    });

    it('should export createSuccessResponse with generic type', () => {
      type TestData = { name: string; count: number };
      const data: TestData = { name: 'test', count: 5 };
      const response = createSuccessResponse<TestData>(data, { agentId: 'test', timestamp: Date.now() });
      expect(response.data.name).toBe('test');
      expect(response.data.count).toBe(5);
    });

    it('should export createErrorResponse function', () => {
      const response = createErrorResponse('TEST_CODE', 'Test message');
      expect(response.status).toBe('error');
      expect(response.error?.code).toBe('TEST_CODE');
      expect(response.error?.message).toBe('Test message');
      expect(response.data).toBeNull();
    });

    it('should export createErrorResponse with details and recoverable', () => {
      const details = { field: 'value' };
      const response = createErrorResponse('TEST_CODE', 'Test message', details, true);
      expect(response.error?.details).toEqual(details);
      expect(response.error?.recoverable).toBe(true);
    });

    it('should export createPartialResponse function', () => {
      const response = createPartialResponse('data');
      expect(response.status).toBe('partial');
      expect(response.data).toBe('data');
      expect(response.error).toBeNull();
    });

    it('should export createPartialResponse with generic type', () => {
      type PartialData = { completedSteps: number; totalSteps: number };
      const data: PartialData = { completedSteps: 3, totalSteps: 5 };
      const response = createPartialResponse<PartialData>(data);
      expect(response.data.completedSteps).toBe(3);
      expect(response.data.totalSteps).toBe(5);
    });
  });

  describe('Type Guard Exports', () => {
    it('should export isSuccess type guard', () => {
      const successResponse = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });
      expect(isSuccess(successResponse)).toBe(true);
      expect(isError(successResponse)).toBe(false);
      expect(isPartial(successResponse)).toBe(false);
    });

    it('should export isError type guard', () => {
      const errorResponse = createErrorResponse('TEST', 'message');
      expect(isError(errorResponse)).toBe(true);
      expect(isSuccess(errorResponse)).toBe(false);
      expect(isPartial(errorResponse)).toBe(false);
    });

    it('should export isPartial type guard', () => {
      const partialResponse = createPartialResponse('data');
      expect(isPartial(partialResponse)).toBe(true);
      expect(isSuccess(partialResponse)).toBe(false);
      expect(isError(partialResponse)).toBe(false);
    });

    it('should correctly narrow types with isSuccess', () => {
      const response: AgentResponse<string> = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });
      if (isSuccess(response)) {
        // TypeScript should know response is SuccessResponse<string>
        // and data is string (not null)
        const data: string = response.data;
        expect(data).toBe('data');
      }
    });

    it('should correctly narrow types with isError', () => {
      const response: AgentResponse<string> = createErrorResponse('TEST', 'message');
      if (isError(response)) {
        // TypeScript should know response is ErrorResponse
        // and error is AgentErrorDetails (not null)
        const code: string = response.error.code;
        const message: string = response.error.message;
        expect(code).toBe('TEST');
        expect(message).toBe('message');
      }
    });

    it('should correctly narrow types with isPartial', () => {
      const response: AgentResponse<string> = createPartialResponse('data');
      if (isPartial(response)) {
        // TypeScript should know response is PartialResponse<string>
        // and data is string
        const data: string = response.data;
        expect(data).toBe('data');
      }
    });
  });

  describe('End-to-End Public API Usage', () => {
    it('should support complete workflow using public API', () => {
      // Create success response
      const success = createSuccessResponse(
        { result: 'success' },
        { agentId: 'workflow-123', timestamp: Date.now() }
      );
      expect(isSuccess(success)).toBe(true);

      // Create error response
      const error = createErrorResponse(
        AGENT_ERROR_CODES.VALIDATION_FAILED,
        'Invalid input',
        { field: 'name' },
        true
      );
      expect(isError(error)).toBe(true);

      // Create partial response
      const partial = createPartialResponse({ progress: 0.5 });
      expect(isPartial(partial)).toBe(true);
    });

    it('should support discriminated union patterns', () => {
      const responses: AgentResponse<string>[] = [
        createSuccessResponse('success', { agentId: 'test', timestamp: Date.now() }),
        createErrorResponse('ERROR', 'error'),
        createPartialResponse('partial'),
      ];

      for (const response of responses) {
        if (isSuccess(response)) {
          expect(response.status).toBe('success');
          expect(response.data).not.toBeNull();
        } else if (isError(response)) {
          expect(response.status).toBe('error');
          expect(response.error).not.toBeNull();
        } else if (isPartial(response)) {
          expect(response.status).toBe('partial');
          expect(response.data).not.toBeNull();
        }
      }
    });

    it('should support type narrowing in switch statements', () => {
      const response = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });

      switch (response.status) {
        case 'success':
          expect(response.data).toBe('data');
          expect(response.error).toBeNull();
          break;
        case 'error':
          // Should never reach here
          expect(true).toBe(false);
          break;
        case 'partial':
          // Should never reach here
          expect(true).toBe(false);
          break;
      }
    });
  });
});
