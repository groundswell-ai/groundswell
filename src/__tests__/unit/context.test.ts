import { describe, it, expect } from 'vitest';
import {
  getExecutionContext,
  requireExecutionContext,
  runInContext,
  runInContextSync,
  hasExecutionContext,
  createChildContext,
  type AgentExecutionContext,
} from '../../core/context.js';
import type { WorkflowNode, WorkflowEvent } from '../../types/index.js';
import { Workflow, WorkflowObserver, ObservedState } from '../../index.js';

describe('AgentExecutionContext', () => {
  const createMockNode = (name: string): WorkflowNode => ({
    id: `node-${name}`,
    name,
    parent: null,
    children: [],
    status: 'running',
    logs: [],
    events: [],
    stateSnapshot: null,
  });

  const createMockContext = (name: string): AgentExecutionContext => ({
    workflowNode: createMockNode(name),
    emitEvent: () => {},
    workflowId: `workflow-${name}`,
  });

  it('should return undefined outside of context', () => {
    expect(getExecutionContext()).toBeUndefined();
  });

  it('should throw when requiring context outside of context', () => {
    expect(() => requireExecutionContext('test operation')).toThrow(
      'test operation called outside of workflow context'
    );
  });

  it('should detect context availability', () => {
    expect(hasExecutionContext()).toBe(false);
  });

  it('should provide context within runInContext', async () => {
    const ctx = createMockContext('test');

    await runInContext(ctx, async () => {
      expect(hasExecutionContext()).toBe(true);
      expect(getExecutionContext()).toBe(ctx);
      expect(requireExecutionContext('test')).toBe(ctx);
    });

    // Context should be gone after run completes
    expect(hasExecutionContext()).toBe(false);
  });

  it('should provide context within sync runInContextSync', () => {
    const ctx = createMockContext('test');

    runInContextSync(ctx, () => {
      expect(hasExecutionContext()).toBe(true);
      expect(getExecutionContext()).toBe(ctx);
    });

    expect(hasExecutionContext()).toBe(false);
  });

  it('should propagate context through nested async calls', async () => {
    const ctx = createMockContext('root');

    const nested = async () => {
      const innerCtx = getExecutionContext();
      return innerCtx?.workflowNode.name;
    };

    await runInContext(ctx, async () => {
      const name = await nested();
      expect(name).toBe('root');
    });
  });

  it('should create child context with new node', async () => {
    const parentCtx = createMockContext('parent');
    const childNode = createMockNode('child');

    await runInContext(parentCtx, async () => {
      const childCtx = createChildContext(childNode);
      expect(childCtx).toBeDefined();
      expect(childCtx?.workflowNode).toBe(childNode);
      expect(childCtx?.workflowId).toBe(parentCtx.workflowId);
    });
  });

  it('should return undefined for child context when not in context', () => {
    const childNode = createMockNode('child');
    const childCtx = createChildContext(childNode);
    expect(childCtx).toBeUndefined();
  });

  it('should allow nested contexts', async () => {
    const outerCtx = createMockContext('outer');
    const innerCtx = createMockContext('inner');

    await runInContext(outerCtx, async () => {
      expect(getExecutionContext()?.workflowNode.name).toBe('outer');

      await runInContext(innerCtx, async () => {
        expect(getExecutionContext()?.workflowNode.name).toBe('inner');
      });

      // Should restore outer context
      expect(getExecutionContext()?.workflowNode.name).toBe('outer');
    });
  });

  it('should capture emitted events', async () => {
    const events: WorkflowEvent[] = [];
    const node = createMockNode('test');
    const ctx: AgentExecutionContext = {
      workflowNode: node,
      emitEvent: (event) => events.push(event),
      workflowId: 'wf-1',
    };

    await runInContext(ctx, async () => {
      const currentCtx = requireExecutionContext('emit');
      currentCtx.emitEvent({
        type: 'stepStart',
        node: currentCtx.workflowNode,
        step: 'test-step',
      });
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('stepStart');
  });
});

describe('WorkflowContext', () => {
  // Test workflow class with @ObservedState decorated fields
  class StatefulTestWorkflow extends Workflow {
    @ObservedState()
    stepCount: number = 0;

    @ObservedState({ redact: true })
    apiKey: string = 'secret-key-123';

    @ObservedState({ hidden: true })
    internalCounter: number = 42;
  }

  it('should capture state and logs in step() error handler', async () => {
    // Arrange: Create observer to capture error events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create workflow with @ObservedState fields using functional executor
    const workflow = new StatefulTestWorkflow(
      { name: 'StepErrorTest' },
      async (ctx) => {
        // Modify @ObservedState fields on the workflow instance
        (workflow as any).stepCount = 5;
        (workflow as any).apiKey = 'updated-key';
        (workflow as any).internalCounter = 99;

        // Execute a step that will fail - THIS TRIGGERS WorkflowContext.step() ERROR HANDLER
        await ctx.step('failing-step', async () => {
          throw new Error('Test error from step');
        });
      }
    );

    // Act: Attach observer and trigger error
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Test error from step');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Test error from step');

    // Assert: Verify @ObservedState fields were captured in state
    expect(errorEvent.error.state).toBeDefined();
    expect(typeof errorEvent.error.state).toBe('object');

    // Assert: Verify public field value is captured
    expect(errorEvent.error.state.stepCount).toBe(5);

    // Assert: Verify redacted field shows '***'
    expect(errorEvent.error.state.apiKey).toBe('***');

    // Assert: Verify hidden field is NOT in state
    expect('internalCounter' in errorEvent.error.state).toBe(false);

    // Assert: Verify logs array is present (may be empty)
    expect(errorEvent.error.logs).toBeDefined();
    expect(Array.isArray(errorEvent.error.logs)).toBe(true);

    // Assert: Verify workflow status
    expect(workflow.status).toBe('failed');

    // Assert: Verify workflowId is captured
    expect(errorEvent.error.workflowId).toBe(workflow.id);
  });
});
