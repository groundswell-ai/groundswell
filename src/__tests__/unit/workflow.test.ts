import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent, ObservedState, getObservedState } from '../../index.js';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow', () => {
  it('should create with unique id', () => {
    const wf1 = new SimpleWorkflow();
    const wf2 = new SimpleWorkflow();
    expect(wf1.id).not.toBe(wf2.id);
  });

  it('should use class name as default name', () => {
    const wf = new SimpleWorkflow();
    expect(wf.getNode().name).toBe('SimpleWorkflow');
  });

  it('should use custom name when provided', () => {
    const wf = new SimpleWorkflow('CustomName');
    expect(wf.getNode().name).toBe('CustomName');
  });

  it('should start with idle status', () => {
    const wf = new SimpleWorkflow();
    expect(wf.status).toBe('idle');
    expect(wf.getNode().status).toBe('idle');
  });

  it('should attach child to parent', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
    expect(parent.getNode().children).toContain(child.getNode());
  });

  it('should emit logs to observers', async () => {
    const wf = new SimpleWorkflow();
    const logs: LogEntry[] = [];

    const observer: WorkflowObserver = {
      onLog: (entry) => logs.push(entry),
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    wf.addObserver(observer);
    await wf.run();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toBe('Running simple workflow');
  });

  it('should emit childAttached event', () => {
    const parent = new SimpleWorkflow('Parent');
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);
    const child = new SimpleWorkflow('Child', parent);

    const attachEvent = events.find((e) => e.type === 'childAttached');
    expect(attachEvent).toBeDefined();
    expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
  });

  it('should capture state and logs in functional workflow error', async () => {
    // Arrange: Create observer to capture events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create functional workflow with a step that throws an error
    const workflow = new Workflow<void>(
      { name: 'ErrorCaptureTest' },
      async (ctx) => {
        // Execute a step that will fail
        await ctx.step('failing-step', async () => {
          throw new Error('Test error from step');
        });
      }
    );

    // Act: Attach observer and run workflow
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Test error from step');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Test error from step');

    // Assert: Verify logs array was captured (even if empty for step errors)
    expect(errorEvent.error.logs).toBeDefined();
    expect(Array.isArray(errorEvent.error.logs)).toBe(true);

    // Assert: Verify state was captured (may be empty object for pure functional workflows)
    expect(errorEvent.error.state).toBeDefined();
    expect(typeof errorEvent.error.state).toBe('object');

    // Assert: Verify workflow status
    expect(workflow.status).toBe('failed');

    // Assert: Verify workflowId is captured
    expect(errorEvent.error.workflowId).toBe(workflow.id);
  });

  it('should capture @ObservedState fields in workflow error state', async () => {
    // Test workflow class with @ObservedState decorated fields
    // Using functional pattern (executor) so error events are emitted via runFunctional()
    class StatefulWorkflowClass extends Workflow {
      @ObservedState()
      stepCount: number = 0;

      @ObservedState({ redact: true })
      apiKey: string = 'secret-key-123';

      @ObservedState({ hidden: true })
      internalCounter: number = 42;
    }

    // Arrange: Create observer to capture error events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create workflow with @ObservedState fields using functional pattern
    const workflow = new StatefulWorkflowClass(
      { name: 'StatefulErrorTest' },
      async (ctx) => {
        // Modify @ObservedState fields on the workflow instance
        (workflow as any).stepCount = 5;
        (workflow as any).apiKey = 'updated-key';
        (workflow as any).internalCounter = 99;

        // Execute a step that will fail
        await ctx.step('failing-step', async () => {
          throw new Error('Error after state update');
        });
      }
    );

    // Act: Attach observer and trigger error
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Error after state update');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Error after state update');

    // Assert: Verify @ObservedState fields were captured
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
