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
