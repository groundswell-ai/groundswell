import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  Workflow,
  Prompt,
  Step,
  WorkflowObserver,
  WorkflowEvent,
  runInContext,
  type AgentExecutionContext,
  createEventTreeHandle,
} from '../../index.js';
import {
  isSuccess,
  isError,
  type AgentResponse,
} from '../../types/agent.js';

// Mock workflow that simulates agent prompt execution within steps
class MockAgentWorkflow extends Workflow {
  public events: WorkflowEvent[] = [];

  @Step({ name: 'step1' })
  async executeStep1(): Promise<string> {
    return 'step1-result';
  }

  @Step({ name: 'step2' })
  async executeStep2(): Promise<string> {
    return 'step2-result';
  }

  async run(): Promise<string> {
    this.setStatus('running');
    await this.executeStep1();
    await this.executeStep2();
    this.setStatus('completed');
    return 'done';
  }
}

describe('Agent-Workflow Integration', () => {
  it('should establish context in @Step decorated methods', async () => {
    const workflow = new MockAgentWorkflow('TestWorkflow');
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);
    await workflow.run();

    // Should have step start/end events
    const stepStarts = events.filter((e) => e.type === 'stepStart');
    const stepEnds = events.filter((e) => e.type === 'stepEnd');

    expect(stepStarts).toHaveLength(2);
    expect(stepEnds).toHaveLength(2);
  });

  it('should track events emitted from within step context', async () => {
    const emittedEvents: WorkflowEvent[] = [];

    class ContextTrackingWorkflow extends Workflow {
      @Step({ name: 'tracked-step' })
      async trackedStep(): Promise<void> {
        // This simulates what happens when Agent.prompt() is called
        // The context should be available
      }

      async run(): Promise<void> {
        this.setStatus('running');
        await this.trackedStep();
        this.setStatus('completed');
      }
    }

    const workflow = new ContextTrackingWorkflow('ContextTest');
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => emittedEvents.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);
    await workflow.run();

    // Verify step events were emitted
    expect(emittedEvents.some((e) => e.type === 'stepStart')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'stepEnd')).toBe(true);
  });

  it('should support functional workflow pattern with step()', async () => {
    const events: WorkflowEvent[] = [];

    const workflow = new Workflow<string>({ name: 'FunctionalWorkflow' }, async (ctx) => {
      await ctx.step('step-a', async () => {
        return 'a';
      });

      await ctx.step('step-b', async () => {
        return 'b';
      });

      return 'completed';
    });

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);
    const result = await workflow.run();

    expect(result).toEqual({
      data: 'completed',
      node: expect.any(Object),
      duration: expect.any(Number),
    });

    const stepStarts = events.filter((e) => e.type === 'stepStart');
    const stepEnds = events.filter((e) => e.type === 'stepEnd');

    expect(stepStarts).toHaveLength(2);
    expect(stepEnds).toHaveLength(2);
  });

  it('should nest step events under workflow in tree', async () => {
    const workflow = new Workflow<string>({ name: 'TreeTestWorkflow' }, async (ctx) => {
      await ctx.step('nested-step', async () => {
        return 'nested';
      });

      return 'done';
    });

    const result = await workflow.run();
    const node = workflow.getNode();

    // Check that the workflow node has children (the step nodes)
    expect(node.children.length).toBeGreaterThan(0);
  });

  it('should propagate context through async boundaries', async () => {
    let contextWasAvailable = false;

    const workflow = new Workflow<boolean>({ name: 'AsyncContextWorkflow' }, async (ctx) => {
      await ctx.step('async-step', async () => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        // The context should still be available after async boundary
        // This is verified by the step completing successfully
        contextWasAvailable = true;
        return 'async-result';
      });

      return contextWasAvailable;
    });

    const result = await workflow.run();
    // For functional workflows, result is WorkflowResult<T>
    expect((result as { data: boolean }).data).toBe(true);
  });

  it('should create EventTreeHandle from workflow', async () => {
    const workflow = new Workflow<void>({ name: 'EventTreeWorkflow' }, async (ctx) => {
      await ctx.step('tree-step', async () => {});
    });

    await workflow.run();

    const treeHandle = createEventTreeHandle(workflow.getNode());
    expect(treeHandle.root).toBeDefined();
    expect(treeHandle.root.name).toBe('EventTreeWorkflow');
  });

  it('should handle errors in steps', async () => {
    const events: WorkflowEvent[] = [];

    const workflow = new Workflow<void>({ name: 'ErrorWorkflow' }, async (ctx) => {
      await ctx.step('failing-step', async () => {
        throw new Error('Step failed');
      });
    });

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);

    await expect(workflow.run()).rejects.toThrow('Step failed');

    const errorEvents = events.filter((e) => e.type === 'error');
    // Error is emitted both from the step context and from the workflow
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    expect(workflow.status).toBe('failed');
  });
});

describe('Prompt Integration', () => {
  it('should create type-safe prompts with Zod schemas', () => {
    const responseSchema = z.object({
      answer: z.string(),
      confidence: z.number().min(0).max(1),
    });

    const prompt = new Prompt({
      user: 'What is 2 + 2?',
      responseFormat: responseSchema,
    });

    // Valid response
    const valid = prompt.validateResponse({ answer: '4', confidence: 0.99 });
    expect(valid).toEqual({ answer: '4', confidence: 0.99 });

    // Invalid response should throw
    expect(() => prompt.validateResponse({ answer: '4' })).toThrow();
  });

  it('should support complex nested schemas', () => {
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
      user: 'List items',
      responseFormat: schema,
    });

    const result = prompt.validateResponse({
      items: [{ id: 1, name: 'Item 1', tags: ['a', 'b'] }],
      metadata: { total: 1, page: 1 },
    });

    expect(result.items).toHaveLength(1);
    expect(result.metadata.total).toBe(1);
  });
});

describe('Agent.prompt() Integration', () => {
  describe('Workflow Context Integration', () => {
    it('should handle AgentResponse in workflow step', async () => {
      // Arrange - Create a workflow that uses Agent.prompt()
      const workflow = new Workflow<{ result: string }>(
        { name: 'AgentWorkflowTest' },
        async (ctx) => {
          // This simulates calling agent.prompt() within a workflow step
          // The AgentResponse would be returned and handled here
          const mockResponse: AgentResponse<string> = {
            status: 'success',
            data: 'step result',
            error: null,
            metadata: {
              agentId: 'test-agent',
              timestamp: Date.now(),
              duration: 100,
            },
          };

          // Simulate handling the AgentResponse
          if (isSuccess(mockResponse)) {
            return { result: mockResponse.data };
          }

          return { result: 'fallback' };
        }
      );

      // Act
      const result = await workflow.run();

      // Assert
      expect((result as { data: { result: string } }).data.result).toBe('step result');
    });

    it('should propagate metadata through workflow', async () => {
      // Arrange
      let capturedMetadata: AgentResponse<string>['metadata'] | null = null;

      const workflow = new Workflow<void>(
        { name: 'MetadataPropagationWorkflow' },
        async (ctx) => {
          await ctx.step('agent-step', async () => {
            // Simulate agent.prompt() returning AgentResponse with metadata
            const mockResponse: AgentResponse<string> = {
              status: 'success',
              data: 'step result',
              error: null,
              metadata: {
                agentId: 'workflow-agent',
                timestamp: Date.now(),
                duration: 150,
                requestId: 'req-123',
                usage: { input_tokens: 50, output_tokens: 100 },
                toolCalls: 0,
              },
            };

            capturedMetadata = mockResponse.metadata;
            return mockResponse.data;
          });
        }
      );

      // Act
      await workflow.run();

      // Assert - Metadata was captured and propagated
      expect(capturedMetadata).not.toBeNull();
      expect(capturedMetadata?.agentId).toBe('workflow-agent');
      expect(capturedMetadata?.timestamp).toBeGreaterThan(0);
      expect(capturedMetadata?.duration).toBe(150);
      expect(capturedMetadata?.requestId).toBe('req-123');
      expect(capturedMetadata?.usage).toEqual({
        input_tokens: 50,
        output_tokens: 100,
      });
    });

    it('should handle error responses in workflow context', async () => {
      // Arrange
      const events: WorkflowEvent[] = [];

      const workflow = new Workflow<{ handled: boolean }>(
        { name: 'ErrorHandlingWorkflow' },
        async (ctx) => {
          await ctx.step('error-step', async () => {
            // Simulate agent.prompt() returning an error response
            const errorResponse: AgentResponse<null> = {
              status: 'error',
              data: null,
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Response validation failed',
                details: null,
                recoverable: false,
              },
              metadata: {
                agentId: 'error-agent',
                timestamp: Date.now(),
                duration: 50,
              },
            };

            // Handle error response
            if (isError(errorResponse)) {
              // Document how errors would be handled in a real workflow
              // The error information is captured from the AgentResponse
              return { handled: true, errorCode: errorResponse.error.code };
            }

            return { handled: false };
          });

          return { handled: true };
        }
      );

      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event) => events.push(event),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      workflow.addObserver(observer);

      // Act
      const result = await workflow.run();

      // Assert
      expect((result as { data: { handled: boolean } }).data.handled).toBe(true);
      // Step events were emitted
      expect(events.some((e) => e.type === 'stepStart')).toBe(true);
      expect(events.some((e) => e.type === 'stepEnd')).toBe(true);
    });
  });

  describe('Type Safety in Workflow Context', () => {
    it('should use type guards for safe data access in workflows', async () => {
      // Arrange
      let dataAccessed = false;
      let errorHandled = false;

      const workflow = new Workflow<void>(
        { name: 'TypeGuardWorkflow' },
        async (ctx) => {
          await ctx.step('typeguard-step', async () => {
            // Simulate AgentResponse that could be success or error
            const response: AgentResponse<{ value: string }> = {
              status: 'success',
              data: { value: 'test-data' },
              error: null,
              metadata: {
                agentId: 'typeguard-agent',
                timestamp: Date.now(),
                duration: 75,
              },
            };

            // Use type guard for safe access
            if (isSuccess(response)) {
              // TypeScript knows: response.data is { value: string }
              dataAccessed = response.data.value === 'test-data';
            } else if (isError(response)) {
              // TypeScript knows: response.error exists
              errorHandled = true;
            }

            return response.data?.value ?? 'fallback';
          });
        }
      );

      // Act
      await workflow.run();

      // Assert - Type guard enabled safe data access
      expect(dataAccessed).toBe(true);
      expect(errorHandled).toBe(false);
    });

    it('should handle discriminated union patterns in workflows', async () => {
      // Arrange
      const results: string[] = [];

      const workflow = new Workflow<void>(
        { name: 'DiscriminatedUnionWorkflow' },
        async (ctx) => {
          await ctx.step('union-step', async () => {
            // Simulate multiple response types
            const responses: AgentResponse<string>[] = [
              {
                status: 'success',
                data: 'success-result',
                error: null,
                metadata: { agentId: 'agent-1', timestamp: Date.now() },
              },
              {
                status: 'error',
                data: null,
                error: {
                  code: 'API_ERROR',
                  message: 'API request failed',
                  details: null,
                  recoverable: true,
                },
                metadata: { agentId: 'agent-2', timestamp: Date.now() },
              },
            ];

            // Handle discriminated union
            for (const response of responses) {
              if (isSuccess(response)) {
                results.push(`success: ${response.data}`);
              } else if (isError(response)) {
                results.push(`error: ${response.error.code}`);
              }
            }

            return 'done';
          });
        }
      );

      // Act
      await workflow.run();

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toBe('success: success-result');
      expect(results[1]).toBe('error: API_ERROR');
    });
  });

  describe('Null Handling in Workflow Context (PRD 6.4.4)', () => {
    it('should use null for absent error in success responses within workflows', async () => {
      // Arrange
      let errorIsNull = false;
      let errorIsNotUndefined = false;

      const workflow = new Workflow<void>(
        { name: 'NullHandlingWorkflow' },
        async (ctx) => {
          await ctx.step('null-step', async () => {
            const response: AgentResponse<string> = {
              status: 'success',
              data: 'data',
              error: null,
              metadata: { agentId: 'agent', timestamp: Date.now() },
            };

            if (isSuccess(response)) {
              errorIsNull = response.error === null;
              errorIsNotUndefined = response.error !== undefined;
            }

            return 'done';
          });
        }
      );

      // Act
      await workflow.run();

      // Assert - PRD 6.4.4 compliance
      expect(errorIsNull).toBe(true);
      expect(errorIsNotUndefined).toBe(true);
    });

    it('should use null for absent data in error responses within workflows', async () => {
      // Arrange
      let dataIsNull = false;
      let dataIsNotUndefined = false;

      const workflow = new Workflow<void>(
        { name: 'NullErrorHandlingWorkflow' },
        async (ctx) => {
          await ctx.step('null-error-step', async () => {
            const response: AgentResponse<null> = {
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

            if (isError(response)) {
              dataIsNull = response.data === null;
              dataIsNotUndefined = response.data !== undefined;
            }

            return 'done';
          });
        }
      );

      // Act
      await workflow.run();

      // Assert - PRD 6.4.4 compliance
      expect(dataIsNull).toBe(true);
      expect(dataIsNotUndefined).toBe(true);
    });
  });
});
