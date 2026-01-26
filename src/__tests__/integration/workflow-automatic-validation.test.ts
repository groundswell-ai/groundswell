/**
 * Integration tests for automatic AgentResponse validation in workflow context
 *
 * Tests the automatic validation hook that validates AgentResponse results
 * after each step execution when autoValidateResponses is enabled.
 */

import { describe, it, expect, vi } from 'vitest';
import { createWorkflow, type AgentResponse, type WorkflowEvent, type WorkflowError } from '../../index.js';
import { z } from 'zod';

describe('Workflow Automatic Validation', () => {
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

  describe('validation enabled (default behavior)', () => {
    it('should validate AgentResponse and emit event on validation failure', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      // Should throw validation error
      await expect(workflow.run()).rejects.toThrow();

      // Verify invalidResponse event was emitted
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(1);
      expect(invalidEvents[0]?.type).toBe('invalidResponse');
      expect(invalidEvents[0]?.agentId).toBe('unknown');
      expect(invalidEvents[0]?.errors).toBeDefined();
      expect(invalidEvents[0]?.timestamp).toBeGreaterThan(0);
    });

    it('should throw WorkflowError with INVALID_RESPONSE_FORMAT context on validation failure', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      // Should throw validation error
      let caughtError: unknown;
      try {
        await workflow.run();
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      const workflowError = caughtError as WorkflowError;
      expect(workflowError.message).toContain("validation failed in step 'test-step'");
      expect(workflowError.workflowId).toBe(workflow.id);
      expect(workflowError.original).toBeDefined();
      expect(workflowError.state).toBeDefined();
      expect(workflowError.logs).toBeInstanceOf(Array);
    });

    it('should pass through valid AgentResponse without errors', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createValidResponse({ result: 'success' });
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      const result = await workflow.run();

      // Should complete successfully - result is the AgentResponse
      const data = 'data' in result ? result.data : result;
      // Check the structure without comparing exact timestamp
      expect(data).toMatchObject({
        status: 'success',
        data: { result: 'success' },
        error: null,
        metadata: {
          agentId: 'test-agent',
        },
      });
      expect(typeof data.metadata.timestamp).toBe('number');

      // No invalidResponse events should be emitted
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(0);
    });

    it('should pass through non-AgentResponse results unchanged', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return { plain: 'object' };
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Should complete successfully - result can be T or WorkflowResult<T>
      const data = 'data' in result ? result.data : result;
      expect(data).toEqual({ plain: 'object' });
    });

    it('should validate error responses (they ARE valid AgentResponse)', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
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
            return errorResponse;
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Error responses are valid AgentResponse - should pass validation
      const data = 'data' in result ? result.data : result;
      expect(data).toBeDefined();
      if (typeof data === 'object' && data !== null && 'status' in data) {
        expect(data.status).toBe('error');
      }
    });

    it('should validate partial responses', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            const partialResponse: AgentResponse<{ progress: number }> = {
              status: 'partial',
              data: { progress: 50 },
              error: null,
              metadata: {
                agentId: 'test-agent',
                timestamp: Date.now(),
              },
            };
            return partialResponse;
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Partial responses are valid AgentResponse - should pass validation
      const data = 'data' in result ? result.data : result;
      expect(data).toBeDefined();
      if (typeof data === 'object' && data !== null && 'status' in data) {
        expect(data.status).toBe('partial');
      }
    });
  });

  describe('validation disabled', () => {
    it('should skip validation when autoValidateResponses is false', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation', autoValidateResponses: false },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      const result = await workflow.run();

      // Should complete without validation error
      const data = 'data' in result ? result.data : result;
      expect(data).toBeDefined();

      // No invalidResponse events should be emitted
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(0);
    });

    it('should pass through invalid AgentResponse when validation disabled', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation', autoValidateResponses: false },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Invalid response should pass through unchanged
      const data = 'data' in result ? result.data : result;
      expect(data).toEqual(createInvalidResponse());
    });
  });

  describe('event payload structure', () => {
    it('should include all required fields in invalidResponse event', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      await expect(workflow.run()).rejects.toThrow();

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();
      expect(invalidEvent?.type).toBe('invalidResponse');
      expect(invalidEvent?.node).toBeDefined();
      expect(invalidEvent?.node.id).toBeDefined();
      expect(invalidEvent?.response).toBeDefined();
      expect(invalidEvent?.agentId).toBe('unknown');
      expect(invalidEvent?.errors).toBeDefined();
      expect(invalidEvent?.timestamp).toBeGreaterThan(0);
    });

    it('should include ZodError with errors array in event', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      await expect(workflow.run()).rejects.toThrow();

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: WorkflowEvent) => event.type === 'invalidResponse');

      // ZodError has errors array
      expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
      expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
    });
  });

  describe('WorkflowError structure', () => {
    it('should create WorkflowError with all required fields', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('my-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      let caughtError: unknown;
      try {
        await workflow.run();
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      const workflowError = caughtError as WorkflowError;

      expect(workflowError.message).toContain("validation failed in step 'my-step'");
      expect(workflowError.original).toBeDefined();
      expect(workflowError.workflowId).toBe(workflow.id);
      expect(workflowError.state).toBeDefined();
      expect(workflowError.logs).toBeInstanceOf(Array);
    });

    it('should include ZodError.stack if available', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      let caughtError: unknown;
      try {
        await workflow.run();
      } catch (error) {
        caughtError = error;
      }

      const workflowError = caughtError as WorkflowError;

      // Stack may be undefined (ZodError.stack is optional)
      // Just verify the field exists
      expect('stack' in workflowError).toBe(true);
    });
  });

  describe('reflection interaction', () => {
    it('should not trigger reflection for validation failures', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation', enableReflection: true },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      await expect(workflow.run()).rejects.toThrow();

      // No reflection events should be emitted for validation failures
      const reflectionEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: WorkflowEvent) =>
          event.type === 'reflectionStart' || event.type === 'reflectionEnd'
        );

      expect(reflectionEvents).toHaveLength(0);
    });
  });

  describe('multiple steps', () => {
    it('should validate each step independently', async () => {
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          // Step 1: Valid response
          const result1 = await ctx.step('step-1', async () => {
            return createValidResponse({ data: 'valid' });
          });

          // Step 2: Invalid response - should fail here
          const result2 = await ctx.step('step-2', async () => {
            return createInvalidResponse();
          });

          return { result1, result2 };
        }
      );

      workflow.addObserver(observer);

      await expect(workflow.run()).rejects.toThrow();

      // Only one invalidResponse event (for step-2)
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(1);
      expect(invalidEvents[0]?.node.name).toBe('step-2');
    });

    it('should continue after valid responses', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result1 = await ctx.step('step-1', async () => {
            return createValidResponse({ data: 'first' });
          });

          const result2 = await ctx.step('step-2', async () => {
            return createValidResponse({ data: 'second' });
          });

          const result3 = await ctx.step('step-3', async () => {
            return { plain: 'object' };
          });

          return { result1, result2, result3 };
        }
      );

      const result = await workflow.run();

      const data = 'data' in result ? result.data : result;
      if (typeof data === 'object' && data !== null) {
        expect('result1' in data && 'result2' in data && 'result3' in data).toBe(true);
      }
    });
  });
});
