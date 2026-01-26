/**
 * Test file: agent-response.test.ts
 *
 * Purpose: Validate AgentResponse structures comply with PRD 6.4 requirements
 *
 * Tests:
 * - Success response has all required fields
 * - Error response has populated error field
 * - Metadata always includes agentId and timestamp
 * - Null is used instead of undefined (PRD 6.4.4)
 * - All responses are valid JSON (JSON.parse(JSON.stringify(response)))
 *
 * PRP: P1.M2.T2.S1 - Write tests for valid AgentResponse structures
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseStatusSchema,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial,
  type AgentResponse,
  type AgentResponseStatus,
  AGENT_ERROR_CODES,
} from '../../types/agent.js';

describe('AgentResponse Schema Validation', () => {
  describe('Success Response Validation', () => {
    it('should validate success response with all required fields', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const response = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = schema.safeParse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(response);
        expect(result.data.status).toBe('success');
        expect(result.data.error).toBeNull();
        expect(result.data.data).toEqual({ result: 'test' });
      }
    });

    it('should validate success response with null error field (PRD 6.4.4)', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test data',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBeNull();
        expect(result.data.error).not.toBeUndefined();
      }
    });

    it('should validate success response without optional metadata', () => {
      const schema = AgentResponseSchema(z.number());

      const response = {
        status: 'success' as const,
        data: 42,
        error: null,
        // metadata is optional
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate success response with complex data schema', () => {
      const complexSchema = z.object({
        result: z.string(),
        count: z.number(),
        items: z.array(z.string()),
      });

      const schema = AgentResponseSchema(complexSchema);

      const response = {
        status: 'success' as const,
        data: {
          result: 'completed',
          count: 3,
          items: ['a', 'b', 'c'],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.items).toHaveLength(3);
      }
    });
  });

  describe('Error Response Validation', () => {
    it('should validate error response with all required fields', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input',
          details: null,
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('error');
        expect(result.data.data).toBeNull();
        expect(result.data.error).not.toBeNull();
        expect(result.data.error?.code).toBe('VALIDATION_FAILED');
        expect(result.data.error?.message).toBe('Invalid input');
        expect(result.data.error?.recoverable).toBe(true);
      }
    });

    it('should validate error response with details', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Execution failed',
          details: { field: 'name', reason: 'invalid' },
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.details).toEqual({ field: 'name', reason: 'invalid' });
      }
    });

    it('should validate error response without details field', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'API_REQUEST_FAILED',
          message: 'API request failed',
          details: null,
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      expect(result.data.error?.details).toBeNull();
    });

    it('should validate INTERNAL_ERROR code (from P1.M2.T1.S2)', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal validation failed',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.code).toBe('INTERNAL_ERROR');
      }
    });

    it('should validate all standard AGENT_ERROR_CODES', () => {
      const schema = AgentResponseSchema(z.unknown());

      Object.values(AGENT_ERROR_CODES).forEach((code) => {
        const response = {
          status: 'error' as const,
          data: null,
          error: {
            code,
            message: 'Test error',
            details: null,
            recoverable: false,
          },
          metadata: { agentId: 'test', timestamp: Date.now() },
        };

        const result = schema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    it('should require recoverable boolean field in error', () => {
      const schema = AgentErrorDetailsSchema;

      // Valid with recoverable: true
      const error1 = {
        code: 'TEST',
        message: 'Test',
        details: null,
        recoverable: true,
      };
      expect(schema.safeParse(error1).success).toBe(true);

      // Valid with recoverable: false
      const error2 = {
        code: 'TEST',
        message: 'Test',
        details: null,
        recoverable: false,
      };
      expect(schema.safeParse(error2).success).toBe(true);
    });
  });

  describe('Partial Response Validation', () => {
    it('should validate partial response with all required fields', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const response = {
        status: 'partial' as const,
        data: { progress: 0.5 },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('partial');
        expect(result.data.error).toBeNull();
        expect(result.data.data.progress).toBe(0.5);
      }
    });

    it('should validate partial response without metadata', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'partial' as const,
        data: 'partial result',
        error: null,
        // metadata is optional
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate partial response with complex data', () => {
      const schema = AgentResponseSchema(
        z.object({
          completedSteps: z.number(),
          totalSteps: z.number(),
          currentStep: z.string(),
        })
      );

      const response = {
        status: 'partial' as const,
        data: {
          completedSteps: 3,
          totalSteps: 5,
          currentStep: 'processing',
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('Response Metadata Validation', () => {
    it('should validate metadata with required fields (agentId, timestamp)', () => {
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agentId).toBe('agent-123');
        expect(typeof result.data.timestamp).toBe('number');
      }
    });

    it('should validate metadata with all optional fields', () => {
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now(),
        duration: 1000,
        requestId: 'req-456',
        usage: { inputTokens: 10, outputTokens: 20 },
        toolCalls: 3,
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(1000);
        expect(result.data.requestId).toBe('req-456');
        expect(result.data.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
        expect(result.data.toolCalls).toBe(3);
      }
    });

    it('should reject metadata without agentId', () => {
      const metadata = {
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should reject metadata without timestamp', () => {
      const metadata = {
        agentId: 'test',
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should accept metadata without optional fields', () => {
      const metadata = {
        agentId: 'test',
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate timestamp is a number', () => {
      const metadata = {
        agentId: 'test',
        timestamp: 1706140800000, // Unix timestamp in milliseconds
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBe(1706140800000);
      }
    });
  });

  describe('PRD 6.4.4 Null Over Undefined Compliance', () => {
    it('should use null for absent error in success responses', () => {
      const response = createSuccessResponse('test', {
        agentId: 'test',
        timestamp: Date.now(),
      });

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

    it('should use null for absent details in error responses', () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error');

      expect(response.error?.details).toBeNull();
      expect(response.error?.details).not.toBeUndefined();
    });

    it('should accept metadata without optional fields (PRD 6.4.4)', () => {
      const metadata = {
        agentId: 'test',
        timestamp: Date.now(),
      };

      const result = AgentResponseMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should handle null in AgentResponseSchema for success', () => {
      const schema = AgentResponseSchema(z.string());

      const response = {
        status: 'success' as const,
        data: 'test',
        error: null, // PRD 6.4.4: null not undefined
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should handle null in AgentResponseSchema for error', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = {
        status: 'error' as const,
        data: null, // PRD 6.4.4: null not undefined
        error: {
          code: 'TEST',
          message: 'test',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Serialization Tests (PRD 6.4.1)', () => {
    it('should serialize and deserialize success response', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const original = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('success');
      expect(serialized.error).toBeNull();
      expect(serialized.data).toEqual({ result: 'test' });

      const result = schema.safeParse(serialized);
      expect(result.success).toBe(true);
    });

    it('should serialize and deserialize error response', () => {
      const schema = AgentResponseSchema(z.unknown());

      const original = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: { field: 'value' },
          recoverable: true,
        },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('error');
      expect(serialized.data).toBeNull();
      expect(serialized.error).not.toBeNull();
    });

    it('should serialize and deserialize partial response', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const original = {
        status: 'partial' as const,
        data: { progress: 0.75 },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized).toEqual(original);
      expect(serialized.status).toBe('partial');
      expect(serialized.error).toBeNull();
    });

    it('should preserve null values during serialization', () => {
      const original = createErrorResponse('TEST_ERROR', 'Test error');

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized.data).toBeNull();
      expect(serialized.error?.details).toBeNull();
    });

    it('should survive round-trip for all response types', () => {
      const responses = [
        createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() }),
        createErrorResponse('TEST_ERROR', 'Test error'),
        createPartialResponse({ progress: 0.5 }),
      ];

      responses.forEach((response) => {
        const roundTripped = JSON.parse(JSON.stringify(response));
        expect(roundTripped).toEqual(response);
      });
    });

    it('should handle complex nested data in serialization', () => {
      const schema = AgentResponseSchema(
        z.object({
          items: z.array(z.object({ id: z.number(), name: z.string() })),
        })
      );

      const original = {
        status: 'success' as const,
        data: {
          items: [
            { id: 1, name: 'first' },
            { id: 2, name: 'second' },
          ],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const serialized = JSON.parse(JSON.stringify(original));

      expect(serialized.data.items).toHaveLength(2);
      expect(serialized.data.items[0].id).toBe(1);
    });
  });

  describe('Discriminated Union Validation', () => {
    it('should accept all valid status values', () => {
      const schema = AgentResponseStatusSchema;

      expect(schema.safeParse('success').success).toBe(true);
      expect(schema.safeParse('error').success).toBe(true);
      expect(schema.safeParse('partial').success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const schema = AgentResponseStatusSchema;

      expect(schema.safeParse('invalid').success).toBe(false);
      expect(schema.safeParse('SUCCESS').success).toBe(false);
      expect(schema.safeParse('Error').success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
      expect(schema.safeParse(null as any).success).toBe(false);
      expect(schema.safeParse(undefined as any).success).toBe(false);
    });

    it('should validate correct variant based on status discriminator', () => {
      const schema = AgentResponseSchema(z.string());

      // Success variant - data is string, error is null
      const successResponse = {
        status: 'success' as const,
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(successResponse).success).toBe(true);

      // Error variant - data is null, error exists
      const errorResponse = {
        status: 'error' as const,
        data: null,
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(errorResponse).success).toBe(true);

      // Partial variant - data is string, error is null
      const partialResponse = {
        status: 'partial' as const,
        data: 'partial',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(partialResponse).success).toBe(true);
    });

    it('should reject mismatched status and data/error fields', () => {
      const schema = AgentResponseSchema(z.string());

      // Success with error instead of null
      const invalid1 = {
        status: 'success' as const,
        data: 'test',
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(invalid1).success).toBe(false);

      // Error with string data instead of null
      const invalid2 = {
        status: 'error' as const,
        data: 'should be null',
        error: { code: 'TEST', message: 'test', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() },
      };
      expect(schema.safeParse(invalid2).success).toBe(false);
    });
  });

  describe('Runtime Refinement Validation (P3.M2.T1.S2)', () => {
    // Helper functions for refinement tests
    function createSuccessResponse<T>(data: T, error: any = null): any {
      return {
        status: 'success',
        data,
        error,
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
    }

    function createErrorResponse(data: any = null, error?: any): any {
      return {
        status: 'error',
        data,
        error: error || { code: 'E', message: 'm', details: null, recoverable: false },
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
    }

    function createPartialResponse<T>(data: T, error: any = null): any {
      return {
        status: 'partial',
        data,
        error,
        metadata: { agentId: 'test', timestamp: Date.now() }
      };
    }

    describe('success status refinements', () => {
      it('should accept valid success response', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createSuccessResponse('test', null);

        const result = schema.safeParse(response);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('success');
          expect(result.data.data).toBe('test');
          expect(result.data.error).toBe(null);
        }
      });

      it('should reject status=success with error!=null', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createSuccessResponse('test', { code: 'E', message: 'm', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['error']);
          // The z.null() validation catches this first with invalid_type error
          expect(result.error.errors[0].code).toBe('invalid_type');
        }
      });

      it('should provide error for success with error', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createSuccessResponse('test', { code: 'ERROR', message: 'test error', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          // Error is caught by z.null() validation
          expect(result.error.errors[0].code).toBe('invalid_type');
          expect(result.error.errors[0].path).toEqual(['error']);
        }
      });
    });

    describe('error status refinements', () => {
      it('should accept valid error response', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createErrorResponse(null);

        const result = schema.safeParse(response);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('error');
          expect(result.data.data).toBe(null);
          expect(result.data.error).toBeDefined();
        }
      });

      it('should reject status=error with data!=null', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createErrorResponse('test');

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['data']);
          // The z.null() validation catches this first with invalid_type error
          expect(result.error.errors[0].code).toBe('invalid_type');
        }
      });

      it('should provide error for error with data', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createErrorResponse('invalid data');

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          // Error is caught by z.null() validation
          expect(result.error.errors[0].code).toBe('invalid_type');
          expect(result.error.errors[0].path).toEqual(['data']);
        }
      });
    });

    describe('partial status refinements', () => {
      it('should accept valid partial response', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createPartialResponse('test', null);

        const result = schema.safeParse(response);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('partial');
          expect(result.data.data).toBe('test');
          expect(result.data.error).toBe(null);
        }
      });

      it('should reject status=partial with error!=null', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createPartialResponse('test', { code: 'E', message: 'm', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['error']);
          // The z.null() validation catches this first with invalid_type error
          expect(result.error.errors[0].code).toBe('invalid_type');
        }
      });

      it('should provide error for partial with error', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createPartialResponse('test', { code: 'ERROR', message: 'test error', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          // Error is caught by z.null() validation
          expect(result.error.errors[0].code).toBe('invalid_type');
          expect(result.error.errors[0].path).toEqual(['error']);
        }
      });
    });

    describe('refinement error path validation', () => {
      it('should point error path to error field for success with error', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createSuccessResponse('test', { code: 'E', message: 'm', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['error']);
        }
      });

      it('should point error path to data field for error with data', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createErrorResponse('invalid');

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['data']);
        }
      });

      it('should point error path to error field for partial with error', () => {
        const schema = AgentResponseSchema(z.string());
        const response = createPartialResponse('test', { code: 'E', message: 'm', details: null, recoverable: false });

        const result = schema.safeParse(response);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['error']);
        }
      });
    });

    describe('refinement with external data simulation', () => {
      it('should catch invalid combinations from JSON parsing', () => {
        const schema = AgentResponseSchema(z.string());

        // Simulate external JSON data with invalid combination
        const invalidJson = '{"status":"success","data":"test","error":{"code":"E","message":"m","details":null,"recoverable":false},"metadata":{"agentId":"test","timestamp":123456}}';
        const parsedData = JSON.parse(invalidJson);

        const result = schema.safeParse(parsedData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['error']);
        }
      });

      it('should accept valid combinations from JSON parsing', () => {
        const schema = AgentResponseSchema(z.string());

        const validJson = '{"status":"success","data":"test","error":null,"metadata":{"agentId":"test","timestamp":123456}}';
        const parsedData = JSON.parse(validJson);

        const result = schema.safeParse(parsedData);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Type Guard Validation', () => {
    it('should narrow type with isSuccess type guard', () => {
      const response: AgentResponse<string> = createSuccessResponse('test', {
        agentId: 'test',
        timestamp: Date.now(),
      });

      if (isSuccess(response)) {
        expect(response.data).toBe('test');
        expect(response.error).toBeNull();
        expect(typeof response.data).toBe('string');
      }
    });

    it('should narrow type with isError type guard', () => {
      const response: AgentResponse<string> = createErrorResponse('TEST_ERROR', 'Test error');

      if (isError(response)) {
        expect(response.data).toBeNull();
        expect(response.error).not.toBeNull();
        expect(response.error.code).toBe('TEST_ERROR');
        expect(typeof response.error.recoverable).toBe('boolean');
      }
    });

    it('should narrow type with isPartial type guard', () => {
      const response: AgentResponse<number> = createPartialResponse(42);

      if (isPartial(response)) {
        expect(response.data).toBe(42);
        expect(response.error).toBeNull();
        expect(typeof response.data).toBe('number');
      }
    });

    it('should handle discriminated union with if-else chain', () => {
      const responses: AgentResponse<string>[] = [
        createSuccessResponse('success', { agentId: 'test', timestamp: Date.now() }),
        createErrorResponse('TEST_ERROR', 'Test error'),
        createPartialResponse('partial'),
      ];

      const results: string[] = [];

      for (const response of responses) {
        if (isSuccess(response)) {
          results.push(`success: ${response.data}`);
        } else if (isError(response)) {
          results.push(`error: ${response.error.code}`);
        } else if (isPartial(response)) {
          results.push(`partial: ${response.data}`);
        }
      }

      expect(results).toHaveLength(3);
      expect(results).toContain('success: success');
      expect(results).toContain('error: TEST_ERROR');
      expect(results).toContain('partial: partial');
    });
  });

  describe('Schema Factory Function Validation', () => {
    it('should create schema for primitive data types', () => {
      const stringSchema = AgentResponseSchema(z.string());
      const numberSchema = AgentResponseSchema(z.number());
      const booleanSchema = AgentResponseSchema(z.boolean());

      expect(stringSchema.safeParse({
        status: 'success',
        data: 'test',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);

      expect(numberSchema.safeParse({
        status: 'success',
        data: 42,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);

      expect(booleanSchema.safeParse({
        status: 'success',
        data: true,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      }).success).toBe(true);
    });

    it('should create schema for complex object data types', () => {
      const schema = AgentResponseSchema(
        z.object({
          id: z.number(),
          name: z.string(),
          tags: z.array(z.string()),
        })
      );

      const response = {
        status: 'success' as const,
        data: {
          id: 123,
          name: 'test item',
          tags: ['a', 'b', 'c'],
        },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should create schema for union data types', () => {
      const schema = AgentResponseSchema(z.union([z.string(), z.number()]));

      const stringResponse = {
        status: 'success' as const,
        data: 'string data',
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const numberResponse = {
        status: 'success' as const,
        data: 42,
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(stringResponse).success).toBe(true);
      expect(schema.safeParse(numberResponse).success).toBe(true);
    });

    it('should create schema for optional data fields', () => {
      const schema = AgentResponseSchema(
        z.object({
          required: z.string(),
          optional: z.string().optional(),
        })
      );

      const withOptional = {
        status: 'success' as const,
        data: { required: 'test', optional: 'present' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const withoutOptional = {
        status: 'success' as const,
        data: { required: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(withOptional).success).toBe(true);
      expect(schema.safeParse(withoutOptional).success).toBe(true);
    });

    it('should create schema for nullable data fields', () => {
      const schema = AgentResponseSchema(
        z.object({
          field: z.string().nullable(),
        })
      );

      const withValue = {
        status: 'success' as const,
        data: { field: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      const withNull = {
        status: 'success' as const,
        data: { field: null },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      expect(schema.safeParse(withValue).success).toBe(true);
      expect(schema.safeParse(withNull).success).toBe(true);
    });
  });

  describe('Factory Function Integration Tests', () => {
    it('should validate createSuccessResponse output against schema', () => {
      const schema = AgentResponseSchema(z.object({ result: z.string() }));

      const response = createSuccessResponse(
        { result: 'success' },
        { agentId: 'test', timestamp: Date.now() }
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate createErrorResponse output against schema', () => {
      const schema = AgentResponseSchema(z.unknown());

      const response = createErrorResponse('TEST_ERROR', 'Test error', { field: 'value' }, true);

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error?.details).toEqual({ field: 'value' });
      }
    });

    it('should validate createPartialResponse output against schema', () => {
      const schema = AgentResponseSchema(z.object({ progress: z.number() }));

      const response = createPartialResponse({ progress: 0.5 });

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
