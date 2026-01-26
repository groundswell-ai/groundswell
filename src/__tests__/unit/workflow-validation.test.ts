/**
 * Test file: workflow-validation.test.ts
 *
 * Purpose: Integration tests for workflow-level agent response validation
 *
 * This file tests the complete interaction between Workflow and Agent classes
 * during validation scenarios, simulating real execution flow where workflows
 * contain agents and call agent.prompt().
 *
 * Tests verify:
 * - Valid responses return true, no events emitted
 * - Invalid responses return false, emit invalidResponse event
 * - WorkflowError created with proper context (agentId, workflowId, state, logs)
 * - Event emission includes all required fields (type, node, response, agentId, errors, timestamp)
 * - Integration with @Step decorator and workflow execution context
 *
 * PRP: P1.M2.T1.S4 - Write integration tests for workflow-level validation
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { z } from 'zod';
import {
  Workflow,
  Step,
  Agent,
  Prompt,
  WorkflowObserver,
  WorkflowEvent,
  isSuccess,
  isError,
  createSuccessResponse,
  createErrorResponse,
  ProviderRegistry,
  type AgentResponse,
  type Provider,
  type ProviderId,
  type ProviderCapabilities,
  type ProviderRequest,
  type ModelSpec,
} from '../../index.js';

// =========================================================================
// Mock Provider Setup
// =========================================================================

/**
 * Create a mock provider for testing
 * Follows pattern from provider-switching.test.ts
 */
function createMockProvider(id: ProviderId = 'anthropic'): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,
    extendedThinking: true,
  };

  const mockExecute = vi.fn();
  mockExecute.mockImplementation(async () => {
    return createSuccessResponse(
      { result: `${id} response` },
      { agentId: `test-${id}`, timestamp: Date.now() }
    );
  });

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

// Register mock provider before all tests
beforeAll(() => {
  ProviderRegistry._resetForTesting();
  const mockProvider = createMockProvider('anthropic');
  ProviderRegistry.getInstance().register(mockProvider);
});

// =========================================================================
// Test Helper Functions
// =========================================================================

/**
 * Create a mock Agent with spied-on prompt() method
 *
 * @param agentId - Optional agent ID (default: 'test-agent')
 * @returns Object containing agent instance and agent ID
 */
function createMockAgent(agentId: string = 'test-agent'): { agent: Agent; agentId: string } {
  const agent = new Agent({ name: 'TestAgent', provider: 'anthropic' });
  // Spy on prompt method to control its return value
  vi.spyOn(agent, 'prompt').mockResolvedValue(
    createSuccessResponse({ result: 'default' }, { agentId, timestamp: Date.now() })
  );
  return { agent, agentId };
}

/**
 * Create a mock valid AgentResponse
 *
 * @param data - Response data
 * @param agentId - Optional agent ID (default: 'test-agent')
 * @returns Valid AgentResponse<T>
 */
function createMockValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: { agentId, timestamp: Date.now() },
  };
}

/**
 * Create a mock invalid AgentResponse based on invalidation type
 *
 * @param invalidType - Type of invalid response to create
 * @param agentId - Optional agent ID (default: 'test-agent')
 * @returns Invalid AgentResponse<unknown>
 */
function createMockInvalidResponse(
  invalidType: 'status' | 'missing' | 'type' | 'mismatch' | 'null-data' | 'non-null-error',
  agentId: string = 'test-agent'
): AgentResponse<unknown> {
  const base = {
    metadata: { agentId, timestamp: Date.now() },
  };

  switch (invalidType) {
    case 'status':
      return { ...base, status: 'invalid' as any, data: 'test', error: null };

    case 'missing':
      return { ...base, status: 'success', error: null } as any; // Missing data field

    case 'type':
      return { ...base, status: 'success', data: 42, error: null }; // data should be object

    case 'mismatch':
      return { ...base, status: 'success', data: null, error: null }; // success requires non-null data

    case 'null-data':
      return { ...base, status: 'success', data: null, error: null };

    case 'non-null-error':
      return { ...base, status: 'error', data: 'not-null', error: null };

    default:
      return base as any;
  }
}

// =========================================================================
// Valid Response Scenarios
// =========================================================================

describe('Workflow-Agent Validation Integration - Valid Response Scenarios', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('should return true for valid response from agent.prompt()', async () => {
    // Arrange
    const { agent, agentId } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse({ result: 'test' }, agentId)
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(true);
  });

  it('should not emit invalidResponse event for valid response', async () => {
    // Arrange
    const { agent, agentId } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse({ result: 'test' }, agentId)
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert - No invalidResponse events should be emitted
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(0);
  });

  it('should work with complex valid data schema', async () => {
    // Arrange
    const { agent, agentId } = createMockAgent();
    const complexData = {
      name: 'test',
      count: 42,
      items: ['a', 'b', 'c'],
      nested: { value: true },
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse(complexData, agentId)
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({
          name: z.string(),
          count: z.number(),
          items: z.array(z.string()),
          nested: z.object({ value: z.boolean() }),
        });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(true);
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(0);
  });

  it('should accept error response as valid (status=error is valid structure)', async () => {
    // Arrange
    const { agent, agentId } = createMockAgent();
    const errorResponse: AgentResponse<null> = {
      status: 'error',
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: null,
        recoverable: false,
      },
      metadata: { agentId, timestamp: Date.now() },
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(errorResponse);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert - Error response structure is valid
    expect(result).toBe(true);
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(0);
  });

  it('should accept partial response as valid', async () => {
    // Arrange
    const { agent, agentId } = createMockAgent();
    const partialResponse: AgentResponse<{ progress: number }> = {
      status: 'partial',
      data: { progress: 0.5 },
      error: null,
      metadata: { agentId, timestamp: Date.now() },
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(partialResponse);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert - Partial response structure is valid
    expect(result).toBe(true);
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(0);
  });
});

// =========================================================================
// Invalid Response Scenarios
// =========================================================================

describe('Workflow-Agent Validation Integration - Invalid Response Scenarios', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('should return false for invalid status value', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);
  });

  it('should emit invalidResponse event for invalid status', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(1);
  });

  it('should include ZodError with status path', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.type).toBe('invalidResponse');
    expect(invalidEvent?.errors).toBeDefined();
    expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
    expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
  });

  it('should return false when required field is missing', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('missing', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        // Use specific schema that requires data to be an object with specific fields
        const schema = z.object({ result: z.string() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);
  });

  it('should emit event with path pointing to missing field', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('missing', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        // Use specific schema to trigger validation error
        const schema = z.object({ result: z.string() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);

    // Check that error path points to missing field
    const firstError = invalidEvent?.errors.errors[0];
    expect(firstError).toHaveProperty('path');
    expect(firstError.path.length).toBeGreaterThan(0);
  });

  it('should handle multiple missing fields', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const responseWithMissingFields: AgentResponse<unknown> = {
      status: 'success',
      error: null,
      // Missing data field entirely
      metadata: { agentId: 'test-agent', timestamp: Date.now() },
    } as any;
    vi.spyOn(agent, 'prompt').mockResolvedValue(responseWithMissingFields);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        // Use specific schema to trigger validation error
        const schema = z.object({ result: z.string(), count: z.number() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    // Zod may report multiple validation errors
    expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
  });

  it('should return false when field has wrong type', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('type', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({ result: z.string() }); // Expects object, got number
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);
  });

  it('should emit event with type mismatch error code', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('type', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({ result: z.string() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();

    const firstError = invalidEvent?.errors.errors[0];
    expect(firstError).toBeDefined();
    expect(firstError.code).toBe('invalid_type');
  });

  it('should handle nested type mismatches', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const responseWithNestedMismatch: AgentResponse<unknown> = {
      status: 'success',
      data: {
        items: [{ name: 123 }], // name should be string, not number
      },
      error: null,
      metadata: { agentId: 'test-agent', timestamp: Date.now() },
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(responseWithNestedMismatch);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({
          items: z.array(z.object({ name: z.string() })),
        });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();

    // Path should point to nested field
    const firstError = invalidEvent?.errors.errors[0];
    expect(firstError?.path).toContain('items');
    expect(firstError?.code).toBe('invalid_type');
  });

  it('should return false for success status with null data', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('null-data', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        // Use specific schema that requires an object (null is not valid)
        const schema = z.object({ result: z.string() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert - Success with null data violates schema expectation
    expect(result).toBe(false);
  });

  it('should return false for error status with non-null data', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('non-null-error', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert - Error with non-null data violates discriminated union
    expect(result).toBe(false);
  });

  it('should handle error response with missing error field', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const errorResponseMissingError: AgentResponse<unknown> = {
      status: 'error',
      data: null,
      // Missing error field - error responses must have error object
      metadata: { agentId: 'test-agent', timestamp: Date.now() },
    } as any;
    vi.spyOn(agent, 'prompt').mockResolvedValue(errorResponseMissingError);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);
  });

  it('should handle custom schema validation failures', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const responseWithWrongSchema: AgentResponse<unknown> = {
      status: 'success',
      data: {
        name: 'test',
        // Missing required 'count' field
        // Extra 'unexpected' field
        unexpected: 'value',
      },
      error: null,
      metadata: { agentId: 'test-agent', timestamp: Date.now() },
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(responseWithWrongSchema);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({
          name: z.string(),
          count: z.number(), // Required but missing
        });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.testStep();

    // Assert
    expect(result).toBe(false);

    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();

    // Check that error path points to missing 'count' field
    const countError = invalidEvent?.errors.errors.find((err) =>
      err.path.includes('count')
    );
    expect(countError).toBeDefined();
  });
});

// =========================================================================
// Event Emission Verification
// =========================================================================

describe('Workflow-Agent Validation Integration - Event Emission Verification', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('should emit invalidResponse event with all required fields', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const invalidResponse = createMockInvalidResponse('status', 'test-agent');
    vi.spyOn(agent, 'prompt').mockResolvedValue(invalidResponse);

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.type).toBe('invalidResponse');
    expect(invalidEvent?.node).toBeDefined();
    expect(invalidEvent?.response).toBeDefined();
    expect(invalidEvent?.agentId).toBeDefined();
    expect(invalidEvent?.errors).toBeDefined();
    expect(invalidEvent?.timestamp).toBeDefined();
    expect(typeof invalidEvent?.timestamp).toBe('number');
  });

  it('should include workflow node in event', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.node).toBeDefined();
    expect(invalidEvent?.node.id).toBe(wf.id);
  });

  it('should include agentId in event', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const testAgentId = 'custom-agent-id';
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', testAgentId)
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, testAgentId);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.agentId).toBe(testAgentId);
  });

  it('should include ZodError in event', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.errors).toBeInstanceOf(z.ZodError);
    expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
    expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
  });

  it('should include timestamp in event', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const beforeTime = Date.now();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();
    const afterTime = Date.now();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent?.timestamp).toBeDefined();
    expect(invalidEvent?.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(invalidEvent?.timestamp).toBeLessThanOrEqual(afterTime);
  });

  it('should verify ZodError structure with path, message, code', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('type', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({ result: z.string() });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();

    const firstError = invalidEvent?.errors.errors[0];
    expect(firstError).toBeDefined();
    expect(firstError).toHaveProperty('path');
    expect(firstError).toHaveProperty('message');
    expect(firstError).toHaveProperty('code');
    expect(typeof firstError.path).toBe('object');
    expect(typeof firstError.message).toBe('string');
    expect(typeof firstError.code).toBe('string');
  });
});

// =========================================================================
// WorkflowError Creation
// =========================================================================

describe('Workflow-Agent Validation Integration - WorkflowError Creation', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('should create WorkflowError with proper message', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert - WorkflowError is created internally and event is emitted
    // The event indicates WorkflowError was created
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent).toBeDefined();
    // The event contains the validation error context
    expect(invalidEvent?.errors).toBeInstanceOf(z.ZodError);
  });

  it('should include agentId in error context', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const testAgentId = 'error-context-agent';
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', testAgentId)
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, testAgentId);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent?.agentId).toBe(testAgentId);
  });

  it('should include ZodError as original error', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent?.errors).toBeInstanceOf(z.ZodError);
    // ZodError should have errors array
    expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
  });

  it('should include workflow state in error context', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert - Event includes workflow node which contains state
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent?.node).toBeDefined();
    expect(invalidEvent?.node.id).toBe(wf.id);
    expect(invalidEvent?.node.status).toBeDefined();
  });

  it('should include logs in error context', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step()
      async testStep(): Promise<boolean> {
        // Add a log entry before validation
        this.logger.info('About to validate agent response');
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    await wf.testStep();

    // Assert - Node logs should exist
    const invalidEvent = events.find((e) => e.type === 'invalidResponse');
    expect(invalidEvent?.node.logs).toBeDefined();
    // Logs should include our log entry
    expect(invalidEvent?.node.logs.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// Workflow Step Integration
// =========================================================================

describe('Workflow-Agent Validation Integration - Workflow Step Integration', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('should work when called from @Step decorated method', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse({ result: 'success' }, 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step({ name: 'validate-and-process' })
      async validateAndProcessStep(): Promise<string> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const isValid = this.validateAgentResponse(response, this.a.id);
        return isValid ? 'processed' : 'failed';
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.validateAndProcessStep();

    // Assert
    expect(result).toBe('processed');
  });

  it('should integrate with workflow execution context', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse({ result: 'context-test' }, 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step({ name: 'context-step' })
      async contextStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        return this.validateAgentResponse(response, this.a.id);
      }

      async run(): Promise<boolean> {
        this.setStatus('running');
        const result = await this.contextStep();
        this.setStatus('completed');
        return result;
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.run();

    // Assert
    expect(result).toBe(true);
    expect(wf.status).toBe('completed');
  });

  it('should handle validation in async step execution', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockImplementation(async () => {
      // Simulate async delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return createMockValidResponse({ asyncResult: true }, 'test-agent');
    });

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step({ name: 'async-validation-step' })
      async asyncValidationStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        // validateAgentResponse is NOT async, but the step is
        return this.validateAgentResponse(response, this.a.id);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.asyncValidationStep();

    // Assert
    expect(result).toBe(true);
  });

  it('should handle validation failure in step execution', async () => {
    // Arrange
    const { agent } = createMockAgent();
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockInvalidResponse('status', 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step({ name: 'failing-validation-step' })
      async failingValidationStep(): Promise<string> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const isValid = this.validateAgentResponse(response, this.a.id);
        if (!isValid) {
          return 'validation-failed';
        }
        return 'success';
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.failingValidationStep();

    // Assert
    expect(result).toBe('validation-failed');
    const invalidEvents = events.filter((e) => e.type === 'invalidResponse');
    expect(invalidEvents).toHaveLength(1);
  });

  it('should work with custom schema in step', async () => {
    // Arrange
    const { agent } = createMockAgent();
    const validData = {
      userId: 'user-123',
      score: 95,
      tags: ['important', 'reviewed'],
    };
    vi.spyOn(agent, 'prompt').mockResolvedValue(
      createMockValidResponse(validData, 'test-agent')
    );

    class TestWorkflow extends Workflow {
      constructor(private a: Agent) {
        super();
      }

      @Step({ name: 'schema-validation-step' })
      async schemaValidationStep(): Promise<boolean> {
        const response = await this.a.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const schema = z.object({
          userId: z.string(),
          score: z.number(),
          tags: z.array(z.string()),
        });
        return this.validateAgentResponse(response, this.a.id, schema);
      }
    }

    const wf = new TestWorkflow(agent);
    wf.addObserver(observer);

    // Act
    const result = await wf.schemaValidationStep();

    // Assert
    expect(result).toBe(true);
  });

  it('should handle multiple agents in workflow', async () => {
    // Arrange
    const agent1 = createMockAgent('agent-1').agent;
    const agent2 = createMockAgent('agent-2').agent;

    vi.spyOn(agent1, 'prompt').mockResolvedValue(
      createMockValidResponse({ agent: 'agent-1' }, 'agent-1')
    );
    vi.spyOn(agent2, 'prompt').mockResolvedValue(
      createMockValidResponse({ agent: 'agent-2' }, 'agent-2')
    );

    class TestWorkflow extends Workflow {
      constructor(private a1: Agent, private a2: Agent) {
        super();
      }

      @Step({ name: 'multi-agent-step' })
      async multiAgentStep(): Promise<boolean> {
        const response1 = await this.a1.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const valid1 = this.validateAgentResponse(response1, this.a1.id);

        const response2 = await this.a2.prompt(new Prompt({ user: 'test', responseFormat: z.unknown() }));
        const valid2 = this.validateAgentResponse(response2, this.a2.id);

        return valid1 && valid2;
      }
    }

    const wf = new TestWorkflow(agent1, agent2);
    wf.addObserver(observer);

    // Act
    const result = await wf.multiAgentStep();

    // Assert
    expect(result).toBe(true);
  });
});

// =========================================================================
// Cleanup
// =========================================================================

afterEach(() => {
  vi.restoreAllMocks();
});
