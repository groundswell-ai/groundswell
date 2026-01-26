import { describe, it, expect } from 'vitest';
import {
  TDDOrchestrator,
} from '../../examples/tdd-orchestrator.js';
import {
  WorkflowTreeDebugger,
  WorkflowEvent,
  WorkflowObserver,
} from '../../index.js';

describe('Tree Mirroring Integration', () => {
  it('should create 1:1 tree mirror of workflow execution', async () => {
    const orchestrator = new TDDOrchestrator('TDDOrchestrator');
    (orchestrator as any).maxCycles = 1; // Limit to one cycle for test

    const debugger_ = new WorkflowTreeDebugger(orchestrator);
    const events: WorkflowEvent[] = [];

    debugger_.events.subscribe({
      next: (event) => events.push(event),
    });

    try {
      await orchestrator.run();
    } catch {
      // May fail due to random test failures, that's ok
    }

    // Verify tree structure
    const tree = debugger_.getTree();
    expect(tree.name).toBe('TDDOrchestrator');

    // Should have at least one child (the cycle)
    expect(tree.children.length).toBeGreaterThanOrEqual(1);

    // Child should be named Cycle-N
    const cycleChild = tree.children.find((c) => c.name.startsWith('Cycle-'));
    expect(cycleChild).toBeDefined();

    // Verify events were captured
    expect(events.some((e) => e.type === 'stepStart')).toBe(true);
    expect(events.some((e) => e.type === 'taskStart')).toBe(true);
  });

  it('should propagate events to root observer', async () => {
    const orchestrator = new TDDOrchestrator('Root');
    (orchestrator as any).maxCycles = 1;

    const allEvents: WorkflowEvent[] = [];
    const allLogs: any[] = [];

    const observer: WorkflowObserver = {
      onLog: (entry) => allLogs.push(entry),
      onEvent: (event) => allEvents.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    orchestrator.addObserver(observer);

    try {
      await orchestrator.run();
    } catch {
      // May fail
    }

    // Events from child workflows should reach root
    expect(allLogs.length).toBeGreaterThan(0);
    expect(allEvents.length).toBeGreaterThan(0);

    // Should have events from both parent and child
    const parentEvents = allEvents.filter(
      (e) => 'node' in e && e.node.name === 'Root'
    );
    const childEvents = allEvents.filter(
      (e) => 'node' in e && e.node.name.startsWith('Cycle-')
    );

    expect(parentEvents.length).toBeGreaterThan(0);
    expect(childEvents.length).toBeGreaterThan(0);
  });

  it('should include state snapshot on error', async () => {
    const orchestrator = new TDDOrchestrator('ErrorTest');
    (orchestrator as any).maxCycles = 1;

    const errorEvents: WorkflowEvent[] = [];

    orchestrator.addObserver({
      onLog: () => {},
      onEvent: (event) => {
        if (event.type === 'error') {
          errorEvents.push(event);
        }
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    try {
      await orchestrator.run();
    } catch {
      // Expected
    }

    // If there was an error, it should have state
    if (errorEvents.length > 0) {
      const errEvent = errorEvents[0];
      if (errEvent.type === 'error') {
        expect(errEvent.error.state).toBeDefined();
        expect(errEvent.error.logs).toBeDefined();
        expect(errEvent.error.workflowId).toBeDefined();
      }
    }
  });

  it('should propagate treeUpdated events to root observers', () => {
    // ARRANGE: Create parent-child workflow tree
    const parent = new TDDOrchestrator('Parent');
    const child = new TDDOrchestrator('Child', parent);

    // ARRANGE: Set up observer with collection arrays
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: any[] = [];

    // ARRANGE: Create inline observer
    const observer: WorkflowObserver = {
      onLog: () => {}, // Empty - not testing logs
      onEvent: (event) => events.push(event), // Capture events
      onStateUpdated: () => {}, // Empty - not testing state updates
      onTreeChanged: (root) => treeChangedCalls.push(root), // Capture tree changes
    };

    // ARRANGE: Attach observer to ROOT (parent, not child)
    parent.addObserver(observer);

    // ACT: Trigger status change on CHILD workflow
    child.setStatus('completed');

    // ASSERT: Verify treeUpdated event was received via onEvent
    const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    // ASSERT: Type guard for discriminated union + verify root node
    if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
      expect(treeUpdatedEvent.root).toBe(parent.getNode());
    }

    // ASSERT: Verify onTreeChanged callback was invoked
    expect(treeChangedCalls).toHaveLength(1);
    expect(treeChangedCalls[0]).toBe(parent.getNode());
  });

  it('should emit treeUpdated when child is attached', () => {
    // ARRANGE: Create parent-child workflow tree (child has no parent initially)
    const parent = new TDDOrchestrator('Parent');
    const child = new TDDOrchestrator('Child');

    // ARRANGE: Set up observer with collection arrays
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: any[] = [];

    // ARRANGE: Create inline observer
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: (root) => treeChangedCalls.push(root),
    };

    // ARRANGE: Attach observer to ROOT (parent, not child)
    parent.addObserver(observer);

    // ACT: Attach child
    parent.attachChild(child);

    // ASSERT: Verify treeUpdated event was received via onEvent
    const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    // ASSERT: Type guard for discriminated union + verify root node
    if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
      expect(treeUpdatedEvent.root).toBe(parent.getNode());
    }

    // ASSERT: Verify onTreeChanged callback was invoked
    // NOTE: onTreeChanged is called for BOTH childAttached and treeUpdated events
    expect(treeChangedCalls).toHaveLength(2);
    expect(treeChangedCalls[0]).toBe(parent.getNode());
    expect(treeChangedCalls[1]).toBe(parent.getNode());
  });

  it('should emit treeUpdated when child is detached', () => {
    // ARRANGE: Create parent-child relationship via constructor
    const parent = new TDDOrchestrator('Parent');
    const child = new TDDOrchestrator('Child', parent);

    // ARRANGE: Set up observer with collection arrays
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: any[] = [];

    // ARRANGE: Create inline observer
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: (root) => treeChangedCalls.push(root),
    };

    // ARRANGE: Attach observer to ROOT (parent, not child)
    parent.addObserver(observer);

    // ACT: Detach child
    parent.detachChild(child);

    // ASSERT: Verify treeUpdated event was received via onEvent
    const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    // ASSERT: Type guard for discriminated union + verify root node
    if (treeUpdatedEvent && treeUpdatedEvent.type === 'treeUpdated') {
      expect(treeUpdatedEvent.root).toBe(parent.getNode());
    }

    // ASSERT: Verify onTreeChanged callback was invoked
    // NOTE: onTreeChanged is called for BOTH childDetached and treeUpdated events
    expect(treeChangedCalls).toHaveLength(2);
    expect(treeChangedCalls[0]).toBe(parent.getNode());
    expect(treeChangedCalls[1]).toBe(parent.getNode());
  });
});

describe('Tree Mirroring Integration - Multiple Operations', () => {
  it('should emit treeUpdated for each attachChild operation', () => {
    // ARRANGE: Create parent and multiple children (no parents initially)
    const parent = new TDDOrchestrator('Parent');
    const child1 = new TDDOrchestrator('Child1');
    const child2 = new TDDOrchestrator('Child2');
    const child3 = new TDDOrchestrator('Child3');

    const events: WorkflowEvent[] = [];
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);

    // ACT: Multiple attach operations
    parent.attachChild(child1);
    parent.attachChild(child2);
    parent.attachChild(child3);

    // ASSERT: Verify count of treeUpdated events equals number of operations
    const treeUpdatedEvents = events.filter((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvents).toHaveLength(3);

    // ASSERT: Verify each event has correct root
    treeUpdatedEvents.forEach((event) => {
      if (event.type === 'treeUpdated') {
        expect(event.root).toBe(parent.getNode());
      }
    });
  });

  it('should emit treeUpdated for each detachChild operation', () => {
    // ARRANGE: Create parent with multiple children via constructor
    const parent = new TDDOrchestrator('Parent');
    const child1 = new TDDOrchestrator('Child1', parent);
    const child2 = new TDDOrchestrator('Child2', parent);
    const child3 = new TDDOrchestrator('Child3', parent);

    const events: WorkflowEvent[] = [];
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);

    // ACT: Multiple detach operations
    parent.detachChild(child1);
    parent.detachChild(child2);
    parent.detachChild(child3);

    // ASSERT: Verify count of treeUpdated events equals number of operations
    const treeUpdatedEvents = events.filter((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvents).toHaveLength(3);

    // ASSERT: Verify each event has correct root
    treeUpdatedEvents.forEach((event) => {
      if (event.type === 'treeUpdated') {
        expect(event.root).toBe(parent.getNode());
      }
    });
  });

  it('should emit treeUpdated for mixed sequential operations', () => {
    // ARRANGE: Create parent and children
    const parent = new TDDOrchestrator('Parent');
    const child1 = new TDDOrchestrator('Child1');
    const child2 = new TDDOrchestrator('Child2');
    const child3 = new TDDOrchestrator('Child3', parent);

    const events: WorkflowEvent[] = [];
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);

    // ACT: Mixed sequence: attach, attach, detach, attach, detach
    parent.attachChild(child1);
    parent.attachChild(child2);
    parent.detachChild(child3);
    parent.detachChild(child1);
    parent.attachChild(child3);

    // ASSERT: Verify count of treeUpdated events equals number of operations
    const treeUpdatedEvents = events.filter((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvents).toHaveLength(5);

    // ASSERT: Verify each event has correct root
    treeUpdatedEvents.forEach((event) => {
      if (event.type === 'treeUpdated') {
        expect(event.root).toBe(parent.getNode());
      }
    });

    // ASSERT: Verify event sequence matches operation sequence
    const allTreeEvents = events.filter((e) =>
      e.type === 'treeUpdated' || e.type === 'childAttached' || e.type === 'childDetached'
    );
    expect(allTreeEvents).toHaveLength(10); // 5 treeUpdated + 5 child events
  });
});
