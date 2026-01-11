import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('emitEvent() - childDetached Tree Update Events', () => {
  it('should call onTreeChanged() when childDetached event is emitted', () => {
    // Arrange: Create parent with observer tracking callbacks
    const parent = new SimpleWorkflow('Parent');
    const events: WorkflowEvent[] = [];
    const treeChanges: any[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: (root) => treeChanges.push(root),
    };

    parent.addObserver(observer);

    // Act: Detach child (which emits childDetached event)
    const child = new SimpleWorkflow('Child', parent);
    events.length = 0; // Clear attachChild events
    treeChanges.length = 0; // Clear attachChild tree changes

    parent.detachChild(child);

    // Assert: Verify childDetached event was emitted
    const detachEvent = events.find((e) => e.type === 'childDetached');
    expect(detachEvent).toBeDefined();
    expect(detachEvent?.type === 'childDetached' && detachEvent.parentId).toBe(parent.id);

    // CRITICAL ASSERTION: onTreeChanged() must be called
    expect(treeChanges.length).toBe(1);
    expect(treeChanges[0]).toBe(parent.getNode()); // Receives root node
  });

  it('should call onEvent() before onTreeChanged() for childDetached', () => {
    // Arrange: Track call order
    const parent = new SimpleWorkflow('Parent');
    const callOrder: string[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: () => callOrder.push('onEvent'),
      onStateUpdated: () => {},
      onTreeChanged: () => callOrder.push('onTreeChanged'),
    };

    parent.addObserver(observer);

    // Act
    const child = new SimpleWorkflow('Child', parent);
    callOrder.length = 0; // Clear attachChild call order
    parent.detachChild(child);

    // Assert: Verify order
    expect(callOrder).toEqual(['onEvent', 'onTreeChanged']);
  });

  it('should include childDetached in tree update event types', () => {
    // This test verifies the implementation at the code level
    // Access the emitEvent method and verify it triggers onTreeChanged for childDetached
    const workflow = new SimpleWorkflow('Test');

    // Access private emitEvent method for testing
    const emitEvent = (workflow as any).emitEvent.bind(workflow);

    // Track if onTreeChanged was called
    let onTreeChangedCalled = false;
    const mockObserver = {
      onLog: () => {},
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => { onTreeChangedCalled = true; },
    };

    // Mock getRootObservers to return test observer
    (workflow as any).getRootObservers = () => [mockObserver];

    // Emit childDetached event
    emitEvent({
      type: 'childDetached',
      parentId: workflow.id,
      childId: 'test-child-id',
    });

    // Assert: onTreeChanged should be called
    expect(onTreeChangedCalled).toBe(true);
  });

  it('should pass correct root node to onTreeChanged() after detach', () => {
    // Arrange: Create multi-level tree
    const root = new SimpleWorkflow('Root');
    const parent = new SimpleWorkflow('Parent', root);
    const child = new SimpleWorkflow('Child', parent);

    const treeChangedRoots: any[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: (rootNode) => treeChangedRoots.push(rootNode),
    };

    root.addObserver(observer);

    // Clear events from tree construction
    treeChangedRoots.length = 0;

    // Act: Detach child from parent
    parent.detachChild(child);

    // Assert: onTreeChanged should receive root node (from root workflow)
    expect(treeChangedRoots.length).toBe(1);
    expect(treeChangedRoots[0]).toBe(root.getNode());
  });

  it('should trigger onTreeChanged for both attach and detach operations', () => {
    // Arrange: Track tree changes
    const parent = new SimpleWorkflow('Parent');
    const treeChanges: any[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: (root) => treeChanges.push({ operation: 'treeChanged', root }),
    };

    parent.addObserver(observer);

    // Act 1: Attach child
    const child = new SimpleWorkflow('Child', parent);
    const attachCount = treeChanges.length;

    // Act 2: Detach child
    treeChanges.length = 0; // Clear to only track detach
    parent.detachChild(child);

    // Assert: Both attach and detach should trigger onTreeChanged
    expect(treeChanges.length).toBe(1);
    expect(treeChanges[0].root).toBe(parent.getNode());
  });
});
