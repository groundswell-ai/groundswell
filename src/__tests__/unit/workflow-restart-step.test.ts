import { describe, it, expect } from 'vitest';
import { Workflow, Step, WorkflowEvent, ObservedState, type WorkflowError } from '../../index.js';

describe('Workflow.restartStep', () => {
  describe('error handling', () => {
    it('should throw WorkflowError when step is not found', async () => {
      class TestWorkflow extends Workflow {
        async run(): Promise<void> {
          await this.restartStep('nonexistentStep');
        }
      }

      const wf = new TestWorkflow();

      await expect(wf.run()).rejects.toMatchObject({
        message: "Step 'nonexistentStep' not found",
        workflowId: wf.id,
        state: expect.any(Object),
        logs: expect.any(Array),
      } satisfies Partial<WorkflowError>);
    });

    it('should throw WorkflowError when step exists but is not a function', async () => {
      class TestWorkflow extends Workflow {
        // This is a property, not a method
        notAFunction = 'some value';

        async run(): Promise<void> {
          await this.restartStep('notAFunction');
        }
      }

      const wf = new TestWorkflow();

      await expect(wf.run()).rejects.toMatchObject({
        message: "Step 'notAFunction' not found",
        workflowId: wf.id,
      });
    });

    it('should throw WorkflowError when max retries exceeded', async () => {
      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<void> {
          // Attempt 4 when maxRetries is 3
          await this.restartStep('myStep', { retryCount: 3, maxRetries: 3 });
        }
      }

      const wf = new TestWorkflow();

      await expect(wf.run()).rejects.toMatchObject({
        message: "Max retries (3) exceeded for step 'myStep'",
        workflowId: wf.id,
      });
    });

    it('should allow exactly maxRetries attempts', async () => {
      class TestWorkflow extends Workflow {
        attemptCount = 0;

        @Step({ restartable: true })
        async myStep(): Promise<string> {
          this.attemptCount++;
          return 'result';
        }

        async run(): Promise<string> {
          // retryCount: 2 means this is the 3rd attempt (2 + 1 = 3)
          return await this.restartStep('myStep', { retryCount: 2, maxRetries: 3 }) as string;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe('result');
      expect(wf.attemptCount).toBe(1);
    });

    it('should default maxRetries to 3 when not specified', async () => {
      class TestWorkflow extends Workflow {
        async run(): Promise<void> {
          // Attempt 5 exceeds default maxRetries of 3
          await this.restartStep('myStep', { retryCount: 4 });
        }
      }

      const wf = new TestWorkflow();

      await expect(wf.run()).rejects.toMatchObject({
        message: "Max retries (3) exceeded for step 'myStep'",
      });
    });
  });

  describe('successful step execution', () => {
    it('should execute the step method and return its result', async () => {
      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'step result';
        }

        async run(): Promise<string> {
          return await this.restartStep('myStep') as string;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe('step result');
    });

    it('should execute step with no return value', async () => {
      class TestWorkflow extends Workflow {
        stepExecuted = false;

        @Step({ restartable: true })
        async voidStep(): Promise<void> {
          this.stepExecuted = true;
        }

        async run(): Promise<void> {
          await this.restartStep('voidStep');
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      expect(wf.stepExecuted).toBe(true);
    });

    it('should execute step that returns a number', async () => {
      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async numericStep(): Promise<number> {
          return 42;
        }

        async run(): Promise<number> {
          return await this.restartStep('numericStep') as number;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe(42);
    });

    it('should execute step that returns an object', async () => {
      interface StepResult {
        data: string;
        count: number;
      }

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async objectStep(): Promise<StepResult> {
          return { data: 'test', count: 5 };
        }

        async run(): Promise<StepResult> {
          return await this.restartStep('objectStep') as StepResult;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toEqual({ data: 'test', count: 5 });
    });

    it('should preserve workflow context (this binding)', async () => {
      class TestWorkflow extends Workflow {
        counter = 0;

        @Step({ restartable: true })
        async incrementStep(): Promise<number> {
          this.counter++;
          return this.counter;
        }

        async run(): Promise<number> {
          return await this.restartStep('incrementStep') as number;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe(1);
      expect(wf.counter).toBe(1);
    });
  });

  describe('event emission', () => {
    it('should emit stepRestarted event with correct payload', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          return await this.restartStep('myStep', { retryCount: 1 }) as string;
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents.length).toBe(1);

      if (restartedEvents[0]?.type === 'stepRestarted') {
        expect(restartedEvents[0].stepName).toBe('myStep');
        expect(restartedEvents[0].retryCount).toBe(2); // retryCount 1 + 1 = 2
        expect(restartedEvents[0].node).toBe(wf.node);
        expect(restartedEvents[0].state).toBeDefined();
        expect(typeof restartedEvents[0].state).toBe('object');
      }
    });

    it('should emit stepRestarted event with retryCount of 1 by default', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          return await this.restartStep('myStep') as string;
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents.length).toBe(1);

      if (restartedEvents[0]?.type === 'stepRestarted') {
        expect(restartedEvents[0].retryCount).toBe(1); // Default 0 + 1 = 1
      }
    });

    it('should emit stepRestarted event with custom retryCount', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          // Need to specify maxRetries to allow higher retryCount
          return await this.restartStep('myStep', { retryCount: 5, maxRetries: 10 }) as string;
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents.length).toBe(1);

      if (restartedEvents[0]?.type === 'stepRestarted') {
        expect(restartedEvents[0].retryCount).toBe(6); // 5 + 1 = 6
      }
    });
  });

  describe('state handling', () => {
    it('should capture state snapshot when no stateOverride provided', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        myValue = 'initial';

        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.node.stateSnapshot = null; // Clear any existing snapshot
          await this.restartStep('myStep');
          return this.node.stateSnapshot?.myValue as string;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe('initial');
    });

    it('should include state in stepRestarted event', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @ObservedState()
        myValue = 'test value';

        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          return await this.restartStep('myStep') as string;
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents.length).toBe(1);

      if (restartedEvents[0]?.type === 'stepRestarted') {
        expect(restartedEvents[0].state).toBeDefined();
        expect(restartedEvents[0].state.myValue).toBe('test value');
      }
    });

    it('should use stateOverride when provided in event payload', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @ObservedState()
        myValue = 'original';

        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          const overrideState = { myValue: 'overridden', counter: 42 };
          return await this.restartStep('myStep', { stateOverride: overrideState }) as string;
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents.length).toBe(1);

      if (restartedEvents[0]?.type === 'stepRestarted') {
        expect(restartedEvents[0].state).toEqual({
          myValue: 'overridden',
          counter: 42,
        });
      }
    });
  });

  describe('integration with @Step decorator', () => {
    it('should work with methods decorated with @Step', async () => {
      class TestWorkflow extends Workflow {
        @Step({ restartable: true, maxRetries: 5 })
        async decoratedStep(): Promise<string> {
          return 'decorated result';
        }

        async run(): Promise<string> {
          return await this.restartStep('decoratedStep') as string;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe('decorated result');
    });

    it('should work with methods not decorated with @Step', async () => {
      class TestWorkflow extends Workflow {
        async plainMethod(): Promise<string> {
          return 'plain result';
        }

        async run(): Promise<string> {
          return await this.restartStep('plainMethod') as string;
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.run();

      expect(result).toBe('plain result');
    });

    it('should work with async methods that throw errors', async () => {
      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async failingStep(): Promise<string> {
          throw new Error('Step execution failed');
        }

        async run(): Promise<void> {
          await this.restartStep('failingStep');
        }
      }

      const wf = new TestWorkflow();

      await expect(wf.run()).rejects.toThrow('Step execution failed');
    });
  });

  describe('retry count semantics', () => {
    it('should calculate retryCount as (options.retryCount ?? 0) + 1', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          // Test with retryCount: 0
          await this.restartStep('myStep', { retryCount: 0 });
          return 'done';
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents[0]?.type === 'stepRestarted' && restartedEvents[0].retryCount).toBe(1);
    });

    it('should match stepRetry event retryCount semantics', async () => {
      // In step.ts line 192, retryCount is "next attempt number"
      // So if we call restartStep with retryCount: 1, the event should show retryCount: 2
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step({ restartable: true })
        async myStep(): Promise<string> {
          return 'result';
        }

        async run(): Promise<string> {
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => events.push(e),
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          // Simulating a second retry (first was retryCount: 0 -> 1)
          await this.restartStep('myStep', { retryCount: 1 });
          return 'done';
        }
      }

      const wf = new TestWorkflow();
      await wf.run();

      const restartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(restartedEvents[0]?.type === 'stepRestarted' && restartedEvents[0].retryCount).toBe(2);
    });
  });
});
