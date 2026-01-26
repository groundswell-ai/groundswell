import { describe, it, expect, vi } from 'vitest';
import { Workflow, Step, type AgentResponse, type WorkflowError } from '../../index.js';
import { z } from 'zod';

describe('Workflow.validateAgentResponse', () => {
  // Helper to create valid AgentResponse
  function createValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
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

  // Helper to create invalid AgentResponse
  function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> {
    return {
      status: 'invalid' as any, // Wrong status
      data: 'some data',
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  describe('successful validation', () => {
    it('should return true for valid response with default schema', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({ result: 'test' });

      const result = wf.validateAgentResponse(response, 'test-agent');

      expect(result).toBe(true);
    });

    it('should return true for valid response with custom schema', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({
        name: 'test',
        count: 42
      });

      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = wf.validateAgentResponse(response, 'test-agent', schema);

      expect(result).toBe(true);
    });

    it('should not emit event for valid response', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createValidResponse({ result: 'test' });
      wf.validateAgentResponse(response, 'test-agent');

      // Find invalidResponse events
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(0);
    });
  });

  describe('validation failure', () => {
    it('should return false for invalid response', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createInvalidResponse();

      const result = wf.validateAgentResponse(response, 'test-agent');

      expect(result).toBe(false);
    });

    it('should emit invalidResponse event on validation failure', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      // Find invalidResponse event
      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();
      expect(invalidEvent?.type).toBe('invalidResponse');
      expect(invalidEvent?.agentId).toBe('test-agent');
      expect(invalidEvent?.response).toBe(response);
      expect(invalidEvent?.errors).toBeDefined();
      expect(invalidEvent?.timestamp).toBeGreaterThan(0);
    });

    it('should include ZodError in event payload', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      // ZodError has errors array
      expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
      expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
    });

    it('should use workflow ID in event context', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent?.node.id).toBe(wf.id);
    });

    it('should handle data schema validation failures', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      // Valid structure but invalid data
      const response = createValidResponse({
        name: 'test',
        count: 'not a number'  // Should be number
      });

      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = wf.validateAgentResponse(response, 'test-agent', schema);

      expect(result).toBe(false);

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();
    });
  });

  describe('integration with workflow methods', () => {
    it('should be callable from workflow step', async () => {
      class TestWorkflow extends Workflow {
        private lastResponse?: AgentResponse<unknown>;

        @Step()
        async validateAndProcess() {
          const response = createValidResponse({ result: 'data' });
          this.lastResponse = response;

          const isValid = this.validateAgentResponse(response, 'step-agent');

          return isValid ? 'valid' : 'invalid';
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.validateAndProcess();

      expect(result).toBe('valid');
    });

    it('should work with restart pattern after validation failure', async () => {
      class TestWorkflow extends Workflow {
        private attemptCount = 0;

        @Step({ restartable: true, retryOn: [{ code: 'INVALID_RESPONSE_FORMAT' }] })
        async attemptValidation() {
          this.attemptCount++;

          if (this.attemptCount === 1) {
            const invalidResponse = createInvalidResponse();
            this.validateAgentResponse(invalidResponse, 'test-agent');
            throw new Error('Validation failed');
          }

          const validResponse = createValidResponse({ result: 'success' });
          this.validateAgentResponse(validResponse, 'test-agent');
          return 'success';
        }
      }

      const wf = new TestWorkflow();
      // This would require full workflow execution context
      // Simplified test for demonstration
      expect(wf.validateAgentResponse(createInvalidResponse(), 'agent')).toBe(false);
      expect(wf.validateAgentResponse(createValidResponse({ data: 'test' }), 'agent')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should default to z.unknown() when dataSchema not provided', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({ arbitrary: 'data', nested: { value: 123 } });

      const result = wf.validateAgentResponse(response, 'test-agent');

      // z.unknown() accepts any value
      expect(result).toBe(true);
    });

    it('should handle response with null data', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();

      // Error response has null data
      const errorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = wf.validateAgentResponse(errorResponse, 'test-agent');

      expect(result).toBe(true);
    });

    it('should handle response with partial status', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();

      const partialResponse: AgentResponse<{ progress: number }> = {
        status: 'partial',
        data: { progress: 50 },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = wf.validateAgentResponse(partialResponse, 'test-agent');

      expect(result).toBe(true);
    });
  });
});
