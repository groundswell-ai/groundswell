/**
 * Integration tests for automatic AgentResponse validation in agent-workflow context
 *
 * Tests the automatic validation behavior when agents return AgentResponse objects
 * from workflow steps, ensuring the validation hook works correctly across all scenarios.
 */

import { describe, it, expect } from 'vitest';
import { createWorkflow, Workflow, Step, type AgentResponse, type WorkflowEvent, type WorkflowError, type WorkflowObserver } from '../../index.js';

describe('Agent-Workflow Automatic Validation Integration', () => {
  // Helper functions for test data (following workflow-automatic-validation.test.ts pattern)

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

  function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> {
    return {
      status: 'invalid' as any, // Wrong status - triggers validation failure
      data: 'some data',
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  describe('Valid Agent Responses', () => {
    it('should automatically validate valid agent responses in workflow', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
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

      // Should complete successfully
      const result = await workflow.run();

      // Extract data from WorkflowResult<T> wrapper
      const data = 'data' in result ? result.data : result;

      // Result should be the valid AgentResponse
      expect(data).toBeDefined();
      if (typeof data === 'object' && data !== null && 'status' in data) {
        expect(data).toMatchObject({
          status: 'success',
          data: { result: 'success' },
          error: null,
          metadata: {
            agentId: 'test-agent',
          },
        });
        if ('metadata' in data && typeof data.metadata === 'object' && data.metadata !== null) {
          expect(typeof data.metadata.timestamp).toBe('number');
        }
      }

      // No invalidResponse events should be emitted
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(0);
    });
  });

  describe('Invalid Agent Responses', () => {
    it('should throw INVALID_RESPONSE_FORMAT for invalid responses', async () => {
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

      // Verify WorkflowError structure
      expect(workflowError.message).toContain('validation failed in step');
      expect(workflowError.workflowId).toBe(workflow.id);
      expect(workflowError.original).toBeDefined();
      expect(workflowError.state).toBeDefined();
      expect(workflowError.logs).toBeInstanceOf(Array);

      // Verify ZodError in original property
      expect(workflowError.original).toBeDefined();
      if (workflowError.original && typeof workflowError.original === 'object' && 'errors' in workflowError.original) {
        expect(workflowError.original.errors).toBeInstanceOf(Array);
      }
    });

    it('should throw WorkflowError with detailed error context', async () => {
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

      const workflowError = caughtError as WorkflowError;

      // Message contains step name
      expect(workflowError.message).toContain("validation failed in step 'my-step'");

      // All required fields present
      expect(workflowError.workflowId).toBe(workflow.id);
      expect(workflowError.original).toBeDefined();
      expect(workflowError.state).toBeDefined();
      expect(workflowError.logs).toBeInstanceOf(Array);
      expect('stack' in workflowError).toBe(true);
    });
  });

  describe('Invalid Response Event Emission', () => {
    it('should emit invalidResponse event on validation failure', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
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

      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      // Exactly one invalidResponse event
      expect(invalidEvents).toHaveLength(1);

      const invalidEvent = invalidEvents[0];

      // Verify all event fields
      expect(invalidEvent).toBeDefined();
      expect(invalidEvent?.type).toBe('invalidResponse');
      expect(invalidEvent?.node).toBeDefined();
      expect(invalidEvent?.node.id).toBeDefined();
      expect(invalidEvent?.response).toBeDefined();
      expect(invalidEvent?.agentId).toBe('unknown'); // CRITICAL: Expected at context level
      expect(invalidEvent?.errors).toBeDefined();
      expect(invalidEvent?.timestamp).toBeGreaterThan(0);
    });

    it('should include ZodError with errors array in event', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
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

      const invalidEvent = events.find((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();

      // ZodError has errors array
      expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
      expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);

      // Individual error structure
      const firstError = invalidEvent?.errors.errors[0];
      expect(firstError).toHaveProperty('path');
      expect(firstError).toHaveProperty('message');
      expect(firstError).toHaveProperty('code');
    });
  });

  describe('Configuration Control', () => {
    it('should allow disabling auto-validation via config', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Validation disabled
      const workflowWithoutValidation = createWorkflow(
        { name: 'TestValidation', autoValidateResponses: false },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      workflowWithoutValidation.addObserver(observer);

      // Should complete without validation error
      const result = await workflowWithoutValidation.run();

      const data = 'data' in result ? result.data : result;
      expect(data).toBeDefined();

      // No invalidResponse events when validation is disabled
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(0);
    });

    it('should enable validation by default', async () => {
      // Validation enabled (default - no autoValidateResponses specified)
      const workflowWithValidation = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return createInvalidResponse();
          });
          return result;
        }
      );

      // Should throw because validation is enabled by default
      await expect(workflowWithValidation.run()).rejects.toThrow();
    });

    it('should pass through invalid AgentResponse when validation disabled', async () => {
      // Capture the response once so the assertion compares against the exact
      // object returned by the step. Re-invoking createInvalidResponse() here
      // would roll a new Date.now() timestamp and flake under load.
      const invalidResponse = createInvalidResponse();
      const workflow = createWorkflow(
        { name: 'TestValidation', autoValidateResponses: false },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return invalidResponse;
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Invalid response should pass through unchanged — the exact same object
      // reference, proving no transformation occurred.
      const data = 'data' in result ? result.data : result;
      expect(data).toBe(invalidResponse);
    });
  });

  describe('Graceful Error Handling', () => {
    it('should handle validation errors gracefully with detailed context', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('error-step', async () => {
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

      // Error preserves workflow context
      expect(workflowError.state).toBeDefined();
      expect(workflowError.logs).toBeInstanceOf(Array);
      expect(workflowError.workflowId).toBe(workflow.id);

      // ZodError provides detailed path/message for debugging
      if (workflowError.original && typeof workflowError.original === 'object' && 'errors' in workflowError.original) {
        const zodErrors = workflowError.original.errors as Array<{ path: unknown; message: string; code: string }>;
        expect(zodErrors).toBeInstanceOf(Array);
        expect(zodErrors.length).toBeGreaterThan(0);

        const firstError = zodErrors[0];
        expect(firstError).toHaveProperty('path');
        expect(firstError).toHaveProperty('message');
        expect(firstError).toHaveProperty('code');
      }
    });

    it('should not trigger reflection retry logic for validation errors', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
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
      const reflectionEvents = events.filter((event: WorkflowEvent) =>
        event.type === 'reflectionStart' || event.type === 'reflectionEnd'
      );

      expect(reflectionEvents).toHaveLength(0);
    });
  });

  describe('Workflow Pattern Compatibility', () => {
    it('should validate responses in functional workflows with ctx.step()', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const functionalWorkflow = createWorkflow(
        { name: 'FunctionalWorkflow' },
        async (ctx) => {
          await ctx.step('step1', async () => {
            return createValidResponse('result');
          });
          return 'done';
        }
      );

      functionalWorkflow.addObserver(observer);

      const result = await functionalWorkflow.run();

      // Should complete successfully with valid response
      expect((result as { data: string }).data).toBe('done');

      // No invalidResponse events
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(0);
    });

    it('should throw INVALID_RESPONSE_FORMAT in functional workflows with invalid response', async () => {
      const functionalWorkflow = createWorkflow(
        { name: 'FunctionalWorkflow' },
        async (ctx) => {
          await ctx.step('step1', async () => {
            return createInvalidResponse();
          });
          return 'done';
        }
      );

      // Should throw validation error
      await expect(functionalWorkflow.run()).rejects.toThrow();
    });

    it('should validate responses in class-based workflows with @Step decorator', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class ClassBasedWorkflow extends Workflow {
        @Step({ name: 'step1' })
        async executeStep1(): Promise<AgentResponse<string>> {
          return createValidResponse('result');
        }

        async run(): Promise<string> {
          this.setStatus('running');
          await this.executeStep1();
          this.setStatus('completed');
          return 'done';
        }
      }

      const workflow = new ClassBasedWorkflow('ClassBasedWorkflow');
      workflow.addObserver(observer);

      const result = await workflow.run();

      // Should complete successfully
      expect(result).toBe('done');

      // No invalidResponse events
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(0);
    });

    it('should NOT automatically validate in class-based workflows with @Step decorator', async () => {
      // NOTE: Automatic validation only applies to functional workflows using ctx.step()
      // Class-based workflows with @Step decorator do NOT have automatic validation
      class ClassBasedWorkflow extends Workflow {
        @Step({ name: 'step1' })
        async executeStep1(): Promise<AgentResponse<unknown>> {
          return createInvalidResponse();
        }

        async run(): Promise<string> {
          this.setStatus('running');
          await this.executeStep1();
          this.setStatus('completed');
          return 'done';
        }
      }

      const workflow = new ClassBasedWorkflow('ClassBasedWorkflow');

      // Should NOT throw - class-based workflows don't have automatic validation
      const result = await workflow.run();
      expect(result).toBe('done');
    });

    it('should demonstrate different validation behavior between patterns', async () => {
      const events1: WorkflowEvent[] = [];
      const observer1: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events1.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const events2: WorkflowEvent[] = [];
      const observer2: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events2.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Functional workflow - HAS automatic validation
      const functionalWorkflow = createWorkflow(
        { name: 'FunctionalWorkflow' },
        async (ctx) => {
          await ctx.step('step1', async () => {
            return createInvalidResponse();
          });
          return 'done';
        }
      );
      functionalWorkflow.addObserver(observer1);

      // Class-based workflow - NO automatic validation
      class ClassBasedWorkflow extends Workflow {
        @Step({ name: 'step1' })
        async executeStep1(): Promise<AgentResponse<unknown>> {
          return createInvalidResponse();
        }

        async run(): Promise<string> {
          this.setStatus('running');
          await this.executeStep1();
          this.setStatus('completed');
          return 'done';
        }
      }
      const classWorkflow = new ClassBasedWorkflow('ClassBasedWorkflow');
      classWorkflow.addObserver(observer2);

      // Functional workflow should throw (has automatic validation)
      await expect(functionalWorkflow.run()).rejects.toThrow();

      // Class-based workflow should complete (no automatic validation)
      const classResult = await classWorkflow.run();
      expect(classResult).toBe('done');

      // Only functional workflow should emit invalidResponse event
      const functionalEvents = events1.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      const classEvents = events2.filter((event: WorkflowEvent) => event.type === 'invalidResponse');

      expect(functionalEvents).toHaveLength(1);
      expect(classEvents).toHaveLength(0);

      // Functional event should have expected structure
      expect(functionalEvents[0]?.agentId).toBe('unknown');
    });
  });

  describe('Multiple Steps Validation', () => {
    it('should validate each step independently', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
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
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');

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

    it('should fail at first invalid step without continuing', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      let step3Executed = false;

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          await ctx.step('step-1', async () => {
            return createValidResponse({ data: 'first' });
          });

          await ctx.step('step-2', async () => {
            return createInvalidResponse();
          });

          // This should never execute
          step3Executed = true;
          await ctx.step('step-3', async () => {
            return createValidResponse({ data: 'third' });
          });

          return 'done';
        }
      );

      workflow.addObserver(observer);

      await expect(workflow.run()).rejects.toThrow();

      // Step 3 should not have executed
      expect(step3Executed).toBe(false);

      // Only one invalidResponse event
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(1);
    });
  });

  describe('Non-AgentResponse Results', () => {
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

      const data = 'data' in result ? result.data : result;
      expect(data).toEqual({ plain: 'object' });
    });

    it('should not validate plain objects', async () => {
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return { not: 'an-agent-response' };
          });
          return result;
        }
      );

      workflow.addObserver(observer);

      await workflow.run();

      // No invalidResponse events for non-AgentResponse results
      const invalidEvents = events.filter((event: WorkflowEvent) => event.type === 'invalidResponse');
      expect(invalidEvents).toHaveLength(0);
    });

    it('should not validate primitives', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const result = await ctx.step('test-step', async () => {
            return 'just a string';
          });
          return result;
        }
      );

      const result = await workflow.run();

      // Extract data from WorkflowResult<T> wrapper
      const data = (result as { data?: string }).data ?? result;
      expect(data).toBe('just a string');
    });
  });

  describe('Valid Agent Response Types', () => {
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

    it('should validate partial responses (they ARE valid AgentResponse)', async () => {
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

    it('should validate success responses with all status types', async () => {
      const workflow = createWorkflow(
        { name: 'TestValidation' },
        async (ctx) => {
          const successResponse = await ctx.step('success-step', async () => {
            return createValidResponse({ message: 'success' });
          });

          const errorResponse = await ctx.step('error-step', async () => {
            const errorResp: AgentResponse<null> = {
              status: 'error',
              data: null,
              error: {
                code: 'ERROR',
                message: 'Error message',
                details: null,
                recoverable: false,
              },
              metadata: {
                agentId: 'test-agent',
                timestamp: Date.now(),
              },
            };
            return errorResp;
          });

          const partialResponse = await ctx.step('partial-step', async () => {
            const partialResp: AgentResponse<{ percent: number }> = {
              status: 'partial',
              data: { percent: 75 },
              error: null,
              metadata: {
                agentId: 'test-agent',
                timestamp: Date.now(),
              },
            };
            return partialResp;
          });

          return { successResponse, errorResponse, partialResponse };
        }
      );

      const result = await workflow.run();

      // All three response types should pass validation
      expect(result).toBeDefined();
    });
  });
});
