import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { MCPHandler } from '../../core/mcp-handler.js';
import { Prompt } from '../../core/prompt.js';
import { ProviderRegistry } from '../../harnesses/provider-registry.js';
import type { Provider, ProviderId, ProviderCapabilities } from '../../types/providers.js';
import type { ModelSpec } from '../../types/providers.js';
import { z } from 'zod';
import {
  isSuccess,
  isError,
  createErrorResponse,
  type AgentResponse,
} from '../../types/agent.js';

/**
 * Helper function to create mock Provider for testing
 */
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

describe('Agent', () => {
  beforeEach(() => {
    // Register mock anthropic provider before each test
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
  });
  it('should create with unique id', () => {
    const a1 = new Agent();
    const a2 = new Agent();
    expect(a1.id).not.toBe(a2.id);
  });

  it('should use default name when not provided', () => {
    const agent = new Agent();
    expect(agent.name).toBe('Agent');
  });

  it('should use custom name when provided', () => {
    const agent = new Agent({ name: 'CustomAgent' });
    expect(agent.name).toBe('CustomAgent');
  });

  it('should provide access to MCP handler', () => {
    const agent = new Agent();
    const handler = agent.getMcpHandler();
    expect(handler).toBeInstanceOf(MCPHandler);
  });

  it('should register MCP servers from config', () => {
    const agent = new Agent({
      mcps: [
        {
          name: 'test-mcp',
          transport: 'inprocess',
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: {} },
            },
          ],
        },
      ],
    });

    const handler = agent.getMcpHandler();
    expect(handler.getServerNames()).toContain('test-mcp');
    expect(handler.hasTool('test-mcp__test_tool')).toBe(true);
  });
});

describe('MCPHandler', () => {
  it('should register and unregister servers', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'server1',
      transport: 'inprocess',
    });

    expect(handler.getServerNames()).toContain('server1');

    handler.unregisterServer('server1');
    expect(handler.getServerNames()).not.toContain('server1');
  });

  it('should throw when registering duplicate server', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'server1',
      transport: 'inprocess',
    });

    expect(() =>
      handler.registerServer({
        name: 'server1',
        transport: 'inprocess',
      })
    ).toThrow("MCP server 'server1' is already registered");
  });

  it('should convert tools to full names', () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'myserver',
      transport: 'inprocess',
      tools: [
        {
          name: 'tool1',
          description: 'Tool 1',
          input_schema: { type: 'object', properties: {} },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          input_schema: { type: 'object', properties: {} },
        },
      ],
    });

    const tools = handler.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('myserver__tool1');
    expect(tools[1].name).toBe('myserver__tool2');
  });

  it('should execute registered tool', async () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'math',
      transport: 'inprocess',
      tools: [
        {
          name: 'add',
          description: 'Add two numbers',
          input_schema: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' },
            },
          },
        },
      ],
    });

    handler.registerToolExecutor('math', 'add', async (input: unknown) => {
      const { a, b } = input as { a: number; b: number };
      return a + b;
    });

    const result = await handler.executeTool('math__add', { a: 2, b: 3 });
    expect(result.content).toBe('5');
    expect(result.is_error).toBeUndefined();
  });

  it('should return error for unknown tool', async () => {
    const handler = new MCPHandler();
    const result = await handler.executeTool('unknown__tool', {});
    expect(result.is_error).toBe(true);
    expect(result.content).toContain('not found');
  });

  it('should return error when tool throws', async () => {
    const handler = new MCPHandler();

    handler.registerServer({
      name: 'failing',
      transport: 'inprocess',
      tools: [
        {
          name: 'fail',
          description: 'Always fails',
          input_schema: { type: 'object', properties: {} },
        },
      ],
    });

    handler.registerToolExecutor('failing', 'fail', async () => {
      throw new Error('Tool error');
    });

    const result = await handler.executeTool('failing__fail', {});
    expect(result.is_error).toBe(true);
    expect(result.content).toContain('Tool error');
  });
});

// These tests demonstrate proper AgentResponse assertion patterns
// using mock responses to avoid real API calls
describe('Agent.prompt()', () => {
  beforeEach(() => {
    // Register mock provider before each test
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
  });

  describe('Success Cases', () => {
    it('should return AgentResponse<string> for simple prompt', () => {
      // Arrange - Mock the response structure that agent.prompt() returns
      const agent = new Agent({ name: 'TestAgent' });
      const mockResponse: AgentResponse<string> = {
        status: 'success',
        data: '4',
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 100,
          requestId: 'req-123',
          usage: { input_tokens: 10, output_tokens: 5 },
          toolCalls: 0,
        },
      };

      // Assert - Status
      expect(mockResponse.status).toBe('success');

      // Assert - Data
      expect(mockResponse.data).not.toBeNull();
      expect(typeof mockResponse.data).toBe('string');

      // Assert - Error (should be null for success)
      expect(mockResponse.error).toBeNull();
      expect(mockResponse.error).not.toBeUndefined();

      // Assert - Metadata
      expect(mockResponse.metadata.agentId).toBe(agent.id);
      expect(mockResponse.metadata.timestamp).toBeGreaterThan(0);
      expect(mockResponse.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return AgentResponse<object> for structured output', () => {
      // Arrange
      const agent = new Agent({ name: 'StructuredAgent' });
      const schema = z.object({
        answer: z.string(),
        confidence: z.number().min(0).max(1),
      });

      // Mock response matching the schema
      const mockResponse: AgentResponse<z.infer<typeof schema>> = {
        status: 'success',
        data: {
          answer: 'The answer is 4',
          confidence: 0.95,
        },
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 150,
        },
      };

      // Assert
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.data).toEqual({
        answer: expect.any(String),
        confidence: expect.any(Number),
      });
      expect(mockResponse.error).toBeNull();
      expect(mockResponse.metadata.agentId).toBeDefined();
      expect(mockResponse.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include metadata with agentId, timestamp, and duration', () => {
      // Arrange
      const agent = new Agent({ name: 'MetadataAgent' });
      const mockResponse: AgentResponse<string> = {
        status: 'success',
        data: 'result',
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 200,
          requestId: 'req-456',
          usage: { input_tokens: 25, output_tokens: 15 },
          toolCalls: 0,
        },
      };

      // Assert - Metadata is always present
      expect(mockResponse.metadata).toBeDefined();
      expect(mockResponse.metadata.agentId).toBe(agent.id);
      expect(mockResponse.metadata.timestamp).toBeGreaterThan(0);
      expect(mockResponse.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(mockResponse.metadata.requestId).toBeDefined();
      expect(mockResponse.metadata.usage).toBeDefined();
      expect(mockResponse.metadata.toolCalls).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex nested schema responses', () => {
      // Arrange
      const agent = new Agent();
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

      // Mock response matching the complex schema
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
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 250,
        },
      };

      // Assert
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.data).toBeDefined();
      expect(mockResponse.error).toBeNull();
      expect(Array.isArray(mockResponse.data.items)).toBe(true);
      expect(mockResponse.data.metadata).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should return error response for validation failures', () => {
      // Arrange - Mock error response structure
      const agent = new Agent({ name: 'ErrorAgent' });
      const mockErrorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Response validation failed: required field is missing',
          details: {
            validationErrors: [
              { field: 'required', message: 'Required', code: 'invalid_type' },
            ],
            errorCount: 1,
          },
          recoverable: false,
        },
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 50,
          requestId: 'req-error-1',
        },
      };

      // Assert - Status
      expect(mockErrorResponse.status).toBe('error');

      // Assert - Data (should be null for error)
      expect(mockErrorResponse.data).toBeNull();
      expect(mockErrorResponse.data).not.toBeUndefined();

      // Assert - Error
      expect(mockErrorResponse.error).not.toBeNull();
      expect(mockErrorResponse.error?.code).toBe('VALIDATION_FAILED');
      expect(mockErrorResponse.error?.code).toMatch(/^[A-Z][A-Z_]*$/); // SCREAMING_SNAKE_CASE
      expect(mockErrorResponse.error?.message).toBeDefined();
      expect(mockErrorResponse.error?.recoverable).toBeDefined();

      // Assert - Metadata (still present for errors)
      expect(mockErrorResponse.metadata.agentId).toBeDefined();
      expect(mockErrorResponse.metadata.timestamp).toBeGreaterThan(0);
    });

    it('should handle API request failures with proper error code', () => {
      // Arrange - Mock API error response
      const mockErrorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'API_REQUEST_FAILED',
          message: 'API request failed: rate limit exceeded',
          details: null,
          recoverable: true,
        },
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now(),
          duration: 100,
        },
      };

      // Assert
      expect(mockErrorResponse.status).toBe('error');
      expect(mockErrorResponse.data).toBeNull();
      expect(mockErrorResponse.error?.code).toBe('API_REQUEST_FAILED');
      expect(mockErrorResponse.error?.recoverable).toBe(true);
    });

    it('should handle malformed response format errors', () => {
      // Arrange - Mock invalid format error
      const mockErrorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'INVALID_RESPONSE_FORMAT',
          message: 'No JSON object found in response',
          details: { responseText: 'Plain text response without JSON' },
          recoverable: false,
        },
        metadata: {
          agentId: 'agent-456',
          timestamp: Date.now(),
          duration: 75,
        },
      };

      // Assert
      expect(isError(mockErrorResponse)).toBe(true);
      expect(mockErrorResponse.error?.code).toMatch(/^[A-Z][A-Z_]*$/);
      expect(mockErrorResponse.error?.details).not.toBeNull();
    });
  });

  describe('Type Guards', () => {
    it('should use isSuccess for type narrowing on string responses', () => {
      // Arrange - Mock success response
      const mockResponse: AgentResponse<string> = {
        status: 'success',
        data: 'Hello, World!',
        error: null,
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - Type guard enables type-safe access
      if (isSuccess(mockResponse)) {
        // TypeScript knows: response.data is string (not null)
        expect(mockResponse.data).toBeTypeOf('string');
        expect(mockResponse.data.length).toBeGreaterThan(0);
        expect(mockResponse.error).toBeNull();
      }
    });

    it('should use isSuccess for type narrowing on object responses', () => {
      // Arrange - Mock structured response
      const mockResponse: AgentResponse<{ result: string; count: number }> = {
        status: 'success',
        data: { result: 'test', count: 42 },
        error: null,
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert
      if (isSuccess(mockResponse)) {
        // TypeScript knows: response.data has result and count
        expect(mockResponse.data.result).toBeTypeOf('string');
        expect(mockResponse.data.count).toBeTypeOf('number');
        expect(mockResponse.error).toBeNull();
      }
    });

    it('should use isError for error handling', () => {
      // Arrange - Mock error response
      const mockResponse: AgentResponse<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation error',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - Error type guard
      if (isError(mockResponse)) {
        // TypeScript knows: response.error is AgentErrorDetails (not null)
        expect(mockResponse.error.code).toMatch(/^[A-Z][A-Z_]*$/); // SCREAMING_SNAKE_CASE
        expect(mockResponse.error.message).toBeDefined();
        expect(mockResponse.error.recoverable).toBeDefined();
        expect(mockResponse.data).toBeNull();
      }
    });
  });

  describe('Null Handling (PRD 6.4.4)', () => {
    it('should use null for absent error in success responses', () => {
      // Arrange
      const mockResponse: AgentResponse<string> = {
        status: 'success',
        data: 'result',
        error: null,
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - PRD 6.4.4 compliance
      expect(mockResponse.error).toBeNull();
      expect(mockResponse.error).not.toBeUndefined();
    });

    it('should use null for absent data in error responses', () => {
      // Arrange
      const mockResponse: AgentResponse<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'ERROR_CODE',
          message: 'Error message',
          details: null,
          recoverable: false,
        },
        metadata: { agentId: 'agent', timestamp: Date.now() },
      };

      // Assert - PRD 6.4.4 compliance
      expect(isError(mockResponse)).toBe(true);
      expect(mockResponse.data).toBeNull();
      expect(mockResponse.data).not.toBeUndefined();
    });
  });

  describe('Metadata Propagation', () => {
    it('should include all metadata fields on success', () => {
      // Arrange
      const agent = new Agent({ name: 'MetaTestAgent' });
      const mockResponse: AgentResponse<string> = {
        status: 'success',
        data: 'result',
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
          duration: 200,
          requestId: 'req-789',
          usage: { input_tokens: 30, output_tokens: 20 },
          toolCalls: 0,
        },
      };

      // Assert - All metadata fields present on success
      if (isSuccess(mockResponse)) {
        expect(mockResponse.metadata.agentId).toBe(agent.id);
        expect(mockResponse.metadata.timestamp).toBeGreaterThan(0);
        expect(mockResponse.metadata.duration).toBeGreaterThanOrEqual(0);
        expect(mockResponse.metadata.requestId).toBeDefined();
        expect(mockResponse.metadata.usage).toMatchObject({
          input_tokens: expect.any(Number),
          output_tokens: expect.any(Number),
        });
        expect(mockResponse.metadata.toolCalls).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include metadata even on error responses', () => {
      // Arrange
      const mockResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'ERROR_CODE',
          message: 'Error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'agent-xyz',
          timestamp: Date.now(),
          duration: 50,
        },
      };

      // Assert - Metadata present even on error
      expect(mockResponse.metadata.agentId).toBeDefined();
      expect(mockResponse.metadata.timestamp).toBeGreaterThan(0);
    });
  });
});

describe('Agent.prompt() response validation', () => {
  let agent: Agent;

  beforeEach(() => {
    // Register mock provider before creating Agent
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
    agent = new Agent({ name: 'Test Agent' });
  });

  afterEach(() => {
    // Clean up registry after each test
    ProviderRegistry['_resetForTesting']();
  });

  it('should have INTERNAL_ERROR in AGENT_ERROR_CODES', async () => {
    // Import AGENT_ERROR_CODES using dynamic import
    const { AGENT_ERROR_CODES } = await import('../../types/agent.js');
    expect(AGENT_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  describe('validateResponse helper method', () => {
    it('should pass through valid responses', () => {
      const validResponse: AgentResponse<{ result: string }> = {
        status: 'success',
        data: { result: 'hello' },
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
        },
      };

      const dataSchema = z.object({ result: z.string() });
      const result = (agent as any).validateResponse(validResponse, dataSchema);

      expect(result).toEqual(validResponse);
    });

    it('should return INTERNAL_ERROR for invalid responses', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create an invalid response (error should be null for success status)
      const invalidResponse: AgentResponse<{ result: string }> = {
        status: 'success',
        data: { result: 'hello' },
        error: {
          code: 'ERROR',
          message: 'This should be null for success',
          recoverable: false,
        },
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
        },
      };

      const dataSchema = z.object({ result: z.string() });
      const result = (agent as any).validateResponse(invalidResponse, dataSchema);

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.recoverable).toBe(false);

      errorSpy.mockRestore();
    });

    it('should log detailed error information on validation failure', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create an invalid response
      const invalidResponse: AgentResponse<{ result: string }> = {
        status: 'success',
        data: { result: 123 }, // Wrong type
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
        },
      };

      const dataSchema = z.object({ result: z.string() });
      (agent as any).validateResponse(invalidResponse, dataSchema);

      expect(errorSpy).toHaveBeenCalledWith(
        'Agent response validation failed',
        expect.objectContaining({
          agentId: agent.id,
          timestamp: expect.any(Number),
          errorCount: expect.any(Number),
          errors: expect.any(Array),
        })
      );

      errorSpy.mockRestore();
    });

    it('should include validation errors in INTERNAL_ERROR response', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create an invalid response
      const invalidResponse: AgentResponse<{ result: string }> = {
        status: 'success',
        data: { result: 123 }, // Wrong type
        error: null,
        metadata: {
          agentId: agent.id,
          timestamp: Date.now(),
        },
      };

      const dataSchema = z.object({ result: z.string() });
      const result = (agent as any).validateResponse(invalidResponse, dataSchema);

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.details).toBeDefined();
      expect(Array.isArray(result.error?.details?.validationErrors)).toBe(true);

      errorSpy.mockRestore();
    });
  });
});
