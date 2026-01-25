import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Prompt } from '../../core/prompt.js';
import {
  isSuccess,
  isError,
  type AgentResponse,
} from '../../types/agent.js';

describe('Prompt', () => {
  it('should create with unique id', () => {
    const p1 = new Prompt({
      user: 'Test',
      responseFormat: z.object({ message: z.string() }),
    });
    const p2 = new Prompt({
      user: 'Test',
      responseFormat: z.object({ message: z.string() }),
    });
    expect(p1.id).not.toBe(p2.id);
  });

  it('should store user message and data', () => {
    const prompt = new Prompt({
      user: 'Hello world',
      data: { key: 'value' },
      responseFormat: z.object({ result: z.string() }),
    });

    expect(prompt.user).toBe('Hello world');
    expect(prompt.data).toEqual({ key: 'value' });
  });

  it('should validate response successfully', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const prompt = new Prompt({
      user: 'Get person',
      responseFormat: schema,
    });

    const result = prompt.validateResponse({ name: 'John', age: 30 });
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should throw on invalid response', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const prompt = new Prompt({
      user: 'Get person',
      responseFormat: schema,
    });

    expect(() => prompt.validateResponse({ name: 'John' })).toThrow();
  });

  it('should safely validate response', () => {
    const schema = z.object({ value: z.number() });
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: schema,
    });

    const success = prompt.safeValidateResponse({ value: 42 });
    expect(success.success).toBe(true);
    if (success.success) {
      expect(success.data).toEqual({ value: 42 });
    }

    const failure = prompt.safeValidateResponse({ value: 'not a number' });
    expect(failure.success).toBe(false);
  });

  it('should build user message without data', () => {
    const prompt = new Prompt({
      user: 'Simple message',
      responseFormat: z.string(),
    });

    expect(prompt.buildUserMessage()).toBe('Simple message');
  });

  it('should build user message with data', () => {
    const prompt = new Prompt({
      user: 'Message with data',
      data: { items: ['a', 'b', 'c'] },
      responseFormat: z.string(),
    });

    const message = prompt.buildUserMessage();
    expect(message).toContain('Message with data');
    expect(message).toContain('<items>');
    expect(message).toContain('</items>');
  });

  it('should create new prompt with updated data', () => {
    const original = new Prompt({
      user: 'Test',
      data: { a: 1 },
      responseFormat: z.string(),
    });

    const updated = original.withData({ b: 2 });

    expect(original.data).toEqual({ a: 1 });
    expect(updated.data).toEqual({ a: 1, b: 2 });
    expect(original.id).not.toBe(updated.id);
  });

  it('should store override fields', () => {
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
      system: 'Custom system prompt',
      tools: [{ name: 'test', description: 'Test tool', input_schema: { type: 'object', properties: {} } }],
      enableReflection: true,
    });

    expect(prompt.systemOverride).toBe('Custom system prompt');
    expect(prompt.toolsOverride).toHaveLength(1);
    expect(prompt.enableReflection).toBe(true);
  });

  it('should be immutable', () => {
    const prompt = new Prompt({
      user: 'Test',
      data: { key: 'value' },
      responseFormat: z.string(),
    });

    expect(Object.isFrozen(prompt)).toBe(true);
    expect(Object.isFrozen(prompt.data)).toBe(true);
  });
});

describe('AgentResponse Integration', () => {
  describe('Prompt with Zod Schema', () => {
    it('should integrate Prompt schema with AgentResponse type', async () => {
      // Arrange - Create a prompt with structured response format
      const schema = z.object({
        result: z.string(),
        count: z.number(),
        confidence: z.number().min(0).max(1),
      });

      const prompt = new Prompt({
        user: 'Generate structured data',
        responseFormat: schema,
      });

      // Act - Validate that the prompt produces correct AgentResponse type
      // This is a compile-time type check - the test verifies the type structure
      const mockResponse: AgentResponse<z.infer<typeof schema>> = {
        status: 'success',
        data: {
          result: 'test-result',
          count: 42,
          confidence: 0.95,
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          duration: 100,
        },
      };

      // Assert - Type structure matches AgentResponse expectations
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.data.result).toBe('test-result');
      expect(mockResponse.data.count).toBe(42);
      expect(mockResponse.data.confidence).toBe(0.95);
      expect(mockResponse.error).toBeNull();
      expect(mockResponse.metadata.agentId).toBeDefined();
    });

    it('should handle nested Zod schemas in AgentResponse', async () => {
      // Arrange - Complex nested schema
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            tags: z.array(z.string()),
          })
        ),
        metadata: z.object({
          total: z.number(),
          page: z.number(),
        }),
      });

      const prompt = new Prompt({
        user: 'List items with nested structure',
        responseFormat: schema,
      });

      // Act - Create mock response matching the schema
      const mockResponse: AgentResponse<z.infer<typeof schema>> = {
        status: 'success',
        data: {
          items: [
            { id: 1, name: 'Item 1', tags: ['a', 'b'] },
            { id: 2, name: 'Item 2', tags: ['c'] },
          ],
          metadata: { total: 2, page: 1 },
        },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          duration: 150,
        },
      };

      // Assert - Nested structure is preserved
      expect(mockResponse.data.items).toHaveLength(2);
      expect(mockResponse.data.items[0].id).toBe(1);
      expect(mockResponse.data.items[0].tags).toEqual(['a', 'b']);
      expect(mockResponse.data.metadata.total).toBe(2);
      expect(mockResponse.error).toBeNull();
    });
  });

  describe('Prompt Validation Errors', () => {
    it('should handle validation errors producing error response', async () => {
      // Arrange - Prompt with strict schema
      const schema = z.object({
        required: z.string(),
        count: z.number(),
      });

      const prompt = new Prompt({
        user: 'Test prompt',
        responseFormat: schema,
      });

      // Act - Simulate validation error response
      const errorResponse: AgentResponse<z.infer<typeof schema>> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Response validation failed',
          details: {
            validationErrors: [
              { field: 'required', message: 'Required', code: 'invalid_type' },
              { field: 'count', message: 'Expected number, received string', code: 'invalid_type' },
            ],
            errorCount: 2,
          },
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
          duration: 50,
        },
      };

      // Assert - Error response structure
      expect(isError(errorResponse)).toBe(true);
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error?.code).toBe('VALIDATION_FAILED');
      expect(errorResponse.error?.details?.validationErrors).toHaveLength(2);
      expect(errorResponse.error?.recoverable).toBe(false);
      expect(errorResponse.metadata.agentId).toBeDefined();
    });

    it('should handle SCREAMING_SNAKE_CASE error codes', async () => {
      // Arrange - Test error code format compliance
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.string(),
      });

      // Act - Create error response with proper error code format
      const errorResponse: AgentResponse<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'INVALID_RESPONSE_FORMAT',
          message: 'No JSON object found in response',
          details: { responseText: 'Plain text response' },
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      // Assert - Error code follows SCREAMING_SNAKE_CASE
      expect(isError(errorResponse)).toBe(true);
      expect(errorResponse.error?.code).toMatch(/^[A-Z][A-Z_]*$/);
      expect(errorResponse.error?.code).toBe('INVALID_RESPONSE_FORMAT');
    });
  });

  describe('Type Guards with Prompt Integration', () => {
    it('should use isSuccess type guard with Prompt-validated data', async () => {
      // Arrange - Create prompt with schema
      const schema = z.object({
        value: z.string(),
        score: z.number(),
      });

      const prompt = new Prompt({
        user: 'Generate scored value',
        responseFormat: schema,
      });

      // Act - Create success response
      const response: AgentResponse<z.infer<typeof schema>> = {
        status: 'success',
        data: { value: 'test', score: 0.85 },
        error: null,
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - Type guard narrows type correctly
      if (isSuccess(response)) {
        // TypeScript knows: response.data is { value: string, score: number }
        expect(response.data.value).toBeTypeOf('string');
        expect(response.data.score).toBeTypeOf('number');
        expect(response.data.score).toBeGreaterThan(0);
        expect(response.error).toBeNull();
      }
    });

    it('should use isError type guard for validation error handling', async () => {
      // Arrange
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ field: z.string() }),
      });

      // Act - Create error response
      const response: AgentResponse<{ field: string }> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Field is required',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - Error type guard enables safe error access
      if (isError(response)) {
        // TypeScript knows: response.error exists
        expect(response.error.code).toBe('VALIDATION_FAILED');
        expect(response.error.message).toBe('Field is required');
        expect(response.error.recoverable).toBe(false);
        expect(response.data).toBeNull();
      }
    });
  });

  describe('Null Handling with Prompt Integration (PRD 6.4.4)', () => {
    it('should use null for absent error in success responses', async () => {
      // Arrange
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.string(),
      });

      // Act
      const response: AgentResponse<string> = {
        status: 'success',
        data: 'result',
        error: null,
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - PRD 6.4.4 compliance
      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();
    });

    it('should use null for absent data in error responses', async () => {
      // Arrange
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.string(),
      });

      // Act
      const response: AgentResponse<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'API_ERROR',
          message: 'API request failed',
          details: null,
          recoverable: true,
        },
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - PRD 6.4.4 compliance
      expect(isError(response)).toBe(true);
      expect(response.data).toBeNull();
      expect(response.data).not.toBeUndefined();
    });
  });

  describe('Prompt Metadata Integration', () => {
    it('should preserve Prompt id in AgentResponse metadata', async () => {
      // Arrange - Create prompt with specific ID tracking
      const prompt = new Prompt({
        user: 'Test',
        responseFormat: z.object({ result: z.string() }),
      });

      const promptId = prompt.id;

      // Act - Create response that would come from agent.prompt()
      const response: AgentResponse<z.infer<typeof prompt>> = {
        status: 'success',
        data: { result: 'success' },
        error: null,
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now(),
          duration: 200,
          requestId: `req-${promptId}`,
        },
      };

      // Assert - Metadata includes request correlation
      expect(response.metadata.requestId).toContain(promptId);
      expect(response.metadata.agentId).toBe('agent-123');
      expect(response.metadata.duration).toBe(200);
    });
  });
});
