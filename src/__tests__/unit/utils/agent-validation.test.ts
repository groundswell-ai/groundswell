import { describe, it, expect } from 'vitest';
import { validateAgentResponse, type ValidationResult } from '../../../utils/agent-validation.js';
import type { AgentResponse } from '../../../types/agent.js';
import { z } from 'zod';

describe('validateAgentResponse', () => {
  // Helper function to create a valid success response
  function createSuccessResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
    return {
      status: 'success',
      data,
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  // Helper function to create a valid error response
  function createErrorResponse(agentId: string = 'test-agent'): AgentResponse<null> {
    return {
      status: 'error',
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: null,
        recoverable: false,
      },
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  // Helper function to create a valid partial response
  function createPartialResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
    return {
      status: 'partial',
      data,
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  describe('successful validation - success status', () => {
    it('should return valid=true for valid success response with default schema', () => {
      const response = createSuccessResponse({ result: 'test' });
      const result = validateAgentResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for valid success response with custom schema', () => {
      const response = createSuccessResponse({
        name: 'test',
        count: 42
      });

      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for valid success response with string data schema', () => {
      const response = createSuccessResponse('Hello, World!');
      const result = validateAgentResponse(response, z.string());

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for valid success response with complex nested schema', () => {
      const response = createSuccessResponse({
        user: {
          name: 'John',
          age: 30,
          address: {
            city: 'New York',
            zip: '10001'
          }
        }
      });

      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
          address: z.object({
            city: z.string(),
            zip: z.string(),
          }),
        }),
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for valid success response with optional metadata', () => {
      const response: AgentResponse<string> = {
        status: 'success',
        data: 'test data',
        error: null,
        // metadata is optional
      };

      const result = validateAgentResponse(response, z.string());

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('successful validation - error status', () => {
    it('should return valid=true for valid error response', () => {
      const response = createErrorResponse();
      const result = validateAgentResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for error response with details', () => {
      const response: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email', reason: 'invalid format' },
          recoverable: true,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = validateAgentResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('successful validation - partial status', () => {
    it('should return valid=true for valid partial response', () => {
      const response = createPartialResponse({ progress: 50 });
      const result = validateAgentResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid=true for partial response with complex data', () => {
      const response = createPartialResponse({
        completed: ['task1', 'task2'],
        remaining: ['task3'],
        progress: 0.66
      });

      const schema = z.object({
        completed: z.array(z.string()),
        remaining: z.array(z.string()),
        progress: z.number(),
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('validation failures - missing required fields', () => {
    it('should return valid=false for response missing status field', () => {
      const invalidResponse = {
        data: 'test',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<string>;

      const result = validateAgentResponse(invalidResponse);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.errors).toBeInstanceOf(Array);
      expect(result.errors?.errors.length).toBeGreaterThan(0);
    });

    it('should return valid=false for response missing data field', () => {
      // When data field is missing but status is 'success', we need to provide a schema
      // that requires specific data type to catch the missing field
      const invalidResponse = {
        status: 'success' as const,
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<string>;

      const result = validateAgentResponse(invalidResponse, z.string());

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false for response missing error field', () => {
      const invalidResponse = {
        status: 'success' as const,
        data: 'test',
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<string>;

      const result = validateAgentResponse(invalidResponse);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false for response with invalid status value', () => {
      const invalidResponse: AgentResponse<string> = {
        status: 'invalid' as any,
        data: 'test',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = validateAgentResponse(invalidResponse);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validation failures - wrong data types', () => {
    it('should return valid=false when data type does not match schema', () => {
      const response = createSuccessResponse({ result: 42 });
      const schema = z.object({
        result: z.string(),  // Expects string, but got number
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.errors[0].code).toBe('invalid_type');
    });

    it('should return valid=false for missing nested fields', () => {
      const response = createSuccessResponse({
        name: 'John'
        // missing age field
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),  // Required field missing
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false for extra fields in strict mode', () => {
      const response = createSuccessResponse({
        name: 'John',
        age: 30,
        extra: 'not allowed'  // Extra field
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      }).strict();  // Strict mode disallows extra fields

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false for array with wrong type', () => {
      const response = createSuccessResponse({
        items: ['not', 'numbers']
      });

      const schema = z.object({
        items: z.array(z.number()),  // Expects array of numbers
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validation failures - null data violations', () => {
    it('should return valid=false when data is null but success status', () => {
      const response: AgentResponse<null> = {
        status: 'success',
        data: null,  // Invalid: success should have non-null data
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const schema = z.string();  // Expects string, not null

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false when data is present but error status', () => {
      const response = {
        status: 'error' as const,
        data: { invalid: 'data' },  // Invalid: error should have null data
        error: {
          code: 'TEST_ERROR',
          message: 'Test',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<unknown>;

      const result = validateAgentResponse(response);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false when error is null but error status', () => {
      const response = {
        status: 'error' as const,
        data: null,
        error: null,  // Invalid: error status should have error object
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<null>;

      const result = validateAgentResponse(response);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return valid=false when data is not null but partial status', () => {
      const response = {
        status: 'partial' as const,
        data: null,  // Invalid: partial should have non-null data
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as unknown as AgentResponse<unknown>;

      const schema = z.object({ progress: z.number() });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('ZodError structure', () => {
    it('should include ZodError in errors field when invalid', () => {
      const response = {
        status: 'invalid' as any,
        data: 'test',
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      } as AgentResponse<string>;

      const result = validateAgentResponse(response);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.name).toBe('ZodError');
      expect(result.errors?.errors).toBeInstanceOf(Array);
      expect(result.errors?.errors.length).toBeGreaterThan(0);
    });

    it('should include error path in ZodError', () => {
      const response = createSuccessResponse({
        user: {
          name: 'John',
          // age is missing
        }
      });

      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      // The path includes 'data' because that's the field name in AgentResponse
      expect(result.errors?.errors[0].path).toEqual(['data', 'user', 'age']);
    });

    it('should include error message in ZodError', () => {
      const response = createSuccessResponse('not a number');
      const result = validateAgentResponse(response, z.number());

      expect(result.valid).toBe(false);
      expect(result.errors?.errors[0].message).toBeTruthy();
      expect(typeof result.errors?.errors[0].message).toBe('string');
    });

    it('should include error code in ZodError', () => {
      const response = createSuccessResponse('not a number');
      const result = validateAgentResponse(response, z.number());

      expect(result.valid).toBe(false);
      expect(result.errors?.errors[0].code).toBe('invalid_type');
    });
  });

  describe('metadata field handling', () => {
    it('should accept response with valid metadata', () => {
      const response = createSuccessResponse('test');
      const result = validateAgentResponse(response);

      expect(result.valid).toBe(true);
    });

    it('should accept response with missing metadata (optional field)', () => {
      const response: AgentResponse<string> = {
        status: 'success',
        data: 'test',
        error: null,
        // metadata is optional
      };

      const result = validateAgentResponse(response, z.string());

      expect(result.valid).toBe(true);
    });

    it('should reject response with metadata missing timestamp (required field)', () => {
      // According to AgentResponseMetadataSchema, both agentId and timestamp are required
      const response = {
        status: 'success' as const,
        data: 'test',
        error: null,
        metadata: {
          agentId: 'test-agent'
          // timestamp is missing - this should fail validation
        }
      } as AgentResponse<string>;

      const result = validateAgentResponse(response, z.string());

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('data schema customization', () => {
    it('should use provided dataSchema instead of default z.unknown()', () => {
      const response = createSuccessResponse({ name: 'John', age: 30 });

      // With z.unknown(), should pass
      const resultWithUnknown = validateAgentResponse(response);
      expect(resultWithUnknown.valid).toBe(true);

      // With strict schema requiring email, should fail
      const schemaWithEmail = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),  // Required field missing
      });

      const resultWithEmail = validateAgentResponse(response, schemaWithEmail);
      expect(resultWithEmail.valid).toBe(false);
    });

    it('should use z.unknown() when dataSchema not provided', () => {
      const response = createSuccessResponse({
        arbitrary: 'data',
        nested: { value: 123, another: [1, 2, 3] }
      });

      const result = validateAgentResponse(response);

      // z.unknown() accepts any value
      expect(result.valid).toBe(true);
    });

    it('should respect schema transformations', () => {
      const response = createSuccessResponse('  HELLO  ');

      const schema = z.string().transform(s => s.toLowerCase().trim());

      const result = validateAgentResponse(response, schema);

      // Validation passes, transformation is separate
      expect(result.valid).toBe(true);
    });

    it('should respect schema refinements', () => {
      const response = createSuccessResponse(5);

      const schema = z.number().refine(n => n >= 10, {
        message: 'Number must be at least 10'
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
      expect(result.errors?.errors[0].message).toContain('at least 10');
    });
  });

  describe('pure function behavior', () => {
    it('should be deterministic (same input → same output)', () => {
      const response = createSuccessResponse('test');
      const result1 = validateAgentResponse(response, z.string());
      const result2 = validateAgentResponse(response, z.string());

      expect(result1).toStrictEqual(result2);
    });

    it('should not mutate input response', () => {
      const response = createSuccessResponse('test');
      const originalData = response.data;

      validateAgentResponse(response);

      expect(response.data).toBe(originalData);
    });

    it('should not have side effects (no logging, no event emission)', () => {
      const consoleSpy = { error: vi.fn() };
      const originalError = console.error;
      console.error = consoleSpy.error;

      const response = createSuccessResponse('test');
      validateAgentResponse(response, z.string());

      console.error = originalError;

      // Utility should not log
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty object response', () => {
      const response = createSuccessResponse({});
      const result = validateAgentResponse(response, z.object({}));

      expect(result.valid).toBe(true);
    });

    it('should handle empty array response', () => {
      const response = createSuccessResponse([]);
      const result = validateAgentResponse(response, z.array(z.unknown()));

      expect(result.valid).toBe(true);
    });

    it('should handle null values in nested objects', () => {
      const response = createSuccessResponse({
        name: 'John',
        email: null  // Explicitly null
      });

      const schema = z.object({
        name: z.string(),
        email: z.string().nullable(),
      });

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
    });

    it('should handle union schemas', () => {
      const response = createSuccessResponse('string value');

      const schema = z.union([z.string(), z.number()]);

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
    });

    it('should handle discriminated unions', () => {
      const response1 = createSuccessResponse({ type: 'a', value: 'test' });
      const response2 = createSuccessResponse({ type: 'b', count: 42 });

      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.string() }),
        z.object({ type: z.literal('b'), count: z.number() }),
      ]);

      const result1 = validateAgentResponse(response1, schema);
      const result2 = validateAgentResponse(response2, schema);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('should handle date schemas', () => {
      const now = new Date();
      const response = createSuccessResponse(now.toISOString());

      const schema = z.string().datetime();

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
    });

    it('should handle enum schemas', () => {
      const response = createSuccessResponse('pending');

      const schema = z.enum(['pending', 'completed', 'failed']);

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid enum values', () => {
      const response = createSuccessResponse('cancelled');

      const schema = z.enum(['pending', 'completed', 'failed']);

      const result = validateAgentResponse(response, schema);

      expect(result.valid).toBe(false);
    });
  });

  describe('ValidationResult type', () => {
    it('should return ValidationResult with correct structure for valid', () => {
      const response = createSuccessResponse('test');
      const result: ValidationResult = validateAgentResponse(response, z.string());

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return ValidationResult with correct structure for invalid', () => {
      const response = createSuccessResponse('not a number');
      const result: ValidationResult = validateAgentResponse(response, z.number());

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.errors).toBeInstanceOf(Array);
    });

    it('should allow type narrowing based on valid field', () => {
      const response = createSuccessResponse('test');
      const result: ValidationResult = validateAgentResponse(response, z.string());

      if (result.valid) {
        // TypeScript should know errors is undefined here
        expect(result.errors).toBeUndefined();
      } else {
        // TypeScript should know errors is defined here
        expect(result.errors?.errors).toBeDefined();
      }
    });
  });
});
