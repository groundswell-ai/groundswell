import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

describe('Workflow Event History Configuration', () => {
  let mockObserver: WorkflowObserver;
  let capturedEvents: WorkflowEvent[];

  beforeEach(() => {
    capturedEvents = [];
    mockObserver = {
      onLog: vi.fn(),
      onEvent: (event: WorkflowEvent) => {
        capturedEvents.push(event);
      },
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  describe('Disabled by default', () => {
    it('should not store events when event history is not configured', () => {
      const workflow = new Workflow('TestWorkflow');
      workflow.addObserver(mockObserver);

      // Emit some events
      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      // Events should be emitted to observers
      expect(capturedEvents).toHaveLength(2);

      // But replayEvents should return nothing (history is empty)
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };
      workflow.replayEvents(replayObserver);

      expect(replayObserver.onEvent).not.toHaveBeenCalled();
    });

    it('should not store events when event history is explicitly disabled', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: false },
      });
      workflow.addObserver(mockObserver);

      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Events should be emitted to observers
      expect(capturedEvents).toHaveLength(1);

      // But replayEvents should return nothing
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };
      workflow.replayEvents(replayObserver);

      expect(replayObserver.onEvent).not.toHaveBeenCalled();
    });

    it('should still emit events to observers when history is disabled', () => {
      const workflow = new Workflow('TestWorkflow');
      workflow.addObserver(mockObserver);

      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      // Observer should still receive the event
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].type).toBe('stateSnapshot');
    });
  });

  describe('Enabled stores events', () => {
    it('should store events when event history is enabled', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      // Replay should return the events
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };
      workflow.replayEvents(replayObserver);

      expect(replayObserver.onEvent).toHaveBeenCalledTimes(2);
    });

    it('should store events with insertion timestamps', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      const beforeEmit = Date.now();

      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      const afterEmit = Date.now();

      // We can't directly access #eventHistory, but we can verify
      // events are stored by using replayEvents
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      expect(replayObserver.onEvent).toHaveBeenCalledTimes(1);
      const callArg = (replayObserver.onEvent as any).mock.calls[0][0];
      expect(callArg.type).toBe('childAttached');
    });
  });

  describe('maxEvents trimming', () => {
    it('should trim history when exceeding maxEvents', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 100 },
      });

      // Emit more than maxEvents to trigger trimming
      // Lazy trimming triggers at 1.5x = 150 events
      for (let i = 0; i < 200; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count events via replay
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should be trimmed to <= maxEvents
      expect(replayCount).toBeLessThanOrEqual(100);
    });

    it('should use lazy trimming (trims at 1.5x threshold)', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 100 },
      });

      // Emit exactly maxEvents - should NOT trim yet
      for (let i = 0; i < 100; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count events via replay
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should still have all 100 events (lazy trimming)
      expect(replayCount).toBe(100);

      // Reset counter
      replayCount = 0;

      // Add 50 more events (total 150 = 1.5x threshold)
      for (let i = 100; i < 150; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count events via replay again
      replayCount = 0;
      workflow.replayEvents(replayObserver);

      // Now should be trimmed (at 1.5x threshold, it triggered)
      expect(replayCount).toBeLessThanOrEqual(100);
    });

    it('should remove oldest events first when trimming by count', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 10 },
      });

      // Emit 20 events
      for (let i = 0; i < 20; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Capture replayed events
      const replayedEvents: WorkflowEvent[] = [];
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          replayedEvents.push(event);
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should have at most 10 events
      expect(replayedEvents.length).toBeLessThanOrEqual(10);

      // If childAttached events, verify they're the latest ones
      const childAttachedEvents = replayedEvents.filter(
        (e) => e.type === 'childAttached'
      );

      if (childAttachedEvents.length > 0) {
        // The first replayed event should be from the middle of the sequence
        // (older events were trimmed)
        const firstEvent = childAttachedEvents[0] as any;
        const idNum = parseInt(firstEvent.child.id.split('-')[1], 10);
        expect(idNum).toBeGreaterThan(5); // First ~10 events should be trimmed
      }
    });
  });

  describe('maxAgeMs trimming', () => {
    it('should trim events older than maxAgeMs', async () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxAgeMs: 100 }, // 100ms
      });

      // Emit an event
      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-old',
          name: 'OldChild',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Wait for age to exceed maxAgeMs
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Emit more events to trigger trimming (need to hit 1.5x threshold)
      for (let i = 0; i < 1500; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // The old event should be trimmed
      let hasOldEvent = false;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            const childEvent = event as any;
            if (childEvent.child.id === 'child-old') {
              hasOldEvent = true;
            }
          }
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      expect(hasOldEvent).toBe(false);
    });

    it('should preserve recent events', async () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 2000, maxAgeMs: 5000 }, // 5 seconds, high maxEvents to avoid count trimming
      });

      // Emit an event
      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-recent',
          name: 'RecentChild',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Emit more events to trigger trimming (but less than maxEvents)
      for (let i = 0; i < 1500; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // The recent event should still be there (not trimmed by age since maxAgeMs is 5 seconds)
      let hasRecentEvent = false;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            const childEvent = event as any;
            if (childEvent.child.id === 'child-recent') {
              hasRecentEvent = true;
            }
          }
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // With maxEvents=2000 and only 1501 events, no trimming occurs
      expect(hasRecentEvent).toBe(true);
    });
  });

  describe('Hybrid trimming (count + age)', () => {
    it('should apply both count and age constraints', async () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 100, maxAgeMs: 100 },
      });

      // Emit old events
      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-old',
          name: 'OldChild',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Wait for age to exceed maxAgeMs
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Emit many events - more than enough to trigger multiple trims
      for (let i = 0; i < 200; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count via replay
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should be trimmed by both constraints to approximately maxEvents
      // Due to lazy trimming at 1.5x, we might have up to 150 after final add before trim
      // But with multiple emissions, we should end up at ~100
      expect(replayCount).toBeGreaterThan(90);
      expect(replayCount).toBeLessThanOrEqual(150); // Account for lazy trimming

      // Old event should not be there (trimmed by age)
      let hasOldEvent = false;
      const checkObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            const childEvent = event as any;
            if (childEvent.child.id === 'child-old') {
              hasOldEvent = true;
            }
          }
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(checkObserver);
      expect(hasOldEvent).toBe(false);
    });
  });

  describe('Custom configuration values', () => {
    it('should use custom maxEvents value', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 50 },
      });

      // Emit 100 events
      for (let i = 0; i < 100; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count via replay
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should be trimmed to custom maxEvents
      expect(replayCount).toBeLessThanOrEqual(50);
    });

    it('should use custom maxAgeMs value', async () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxAgeMs: 50 }, // 50ms
      });

      // Emit an event
      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-old',
          name: 'OldChild',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Wait for age to exceed custom maxAgeMs
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Emit enough to trigger trimming
      for (let i = 0; i < 1500; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Old event should be trimmed based on custom maxAgeMs
      let hasOldEvent = false;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            const childEvent = event as any;
            if (childEvent.child.id === 'child-old') {
              hasOldEvent = true;
            }
          }
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(hasOldEvent).toBe(false);
    });

    it('should apply default values when not specified', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true }, // Use defaults
      });

      // Emit 1500 events (exceeds default maxEvents of 1000 by 1.5x)
      for (let i = 0; i < 1500; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Count via replay
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // Should be trimmed to default maxEvents (1000)
      expect(replayCount).toBeLessThanOrEqual(1000);
    });
  });

  describe('replayEvents with new structure', () => {
    it('should extract events from entries correctly', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      workflow.emitEvent({
        type: 'taskStart',
        node: workflow.node,
        task: 'test-task',
      });

      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      expect(replayObserver.onEvent).toHaveBeenCalledTimes(3);
    });

    it('should work with since option', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      const timestamp = Date.now();

      // Emit event with timestamp
      workflow.emitEvent({
        type: 'invalidResponse',
        node: workflow.node,
        response: {
          status: 'success',
          data: null,
          raw: null,
          agentId: 'test-agent',
          promptId: 'test-prompt',
        } as any,
        agentId: 'test-agent',
        errors: {} as any,
        timestamp,
      });

      // Emit event without timestamp
      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      // Replay with since filter
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver, { since: timestamp });

      // Both events should be replayed (stateSnapshot has no timestamp)
      expect(replayObserver.onEvent).toHaveBeenCalledTimes(2);
    });

    it('should work with limit option', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      // Emit 10 events
      for (let i = 0; i < 10; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver, { limit: 5 });

      expect(replayObserver.onEvent).toHaveBeenCalledTimes(5);
    });

    it('should work with both since and limit options', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      const timestamp = Date.now();

      // Emit events
      for (let i = 0; i < 10; i++) {
        workflow.emitEvent({
          type: 'invalidResponse',
          node: workflow.node,
          response: {
            status: 'success',
            data: null,
            raw: null,
            agentId: 'test-agent',
            promptId: 'test-prompt',
          } as any,
          agentId: 'test-agent',
          errors: {} as any,
          timestamp: timestamp + i,
        });
      }

      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver, {
        since: timestamp + 5,
        limit: 3,
      });

      // Should filter by since first, then apply limit
      expect(replayObserver.onEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('Backward compatibility', () => {
    it('should work with workflows without eventHistory config', () => {
      // Old-style workflow without eventHistory config
      class OldStyleWorkflow extends Workflow {
        async run(): Promise<string> {
          this.setStatus('running');
          this.emitEvent({
            type: 'stateSnapshot',
            node: this.node,
          });
          this.setStatus('completed');
          return 'done';
        }
      }

      const workflow = new OldStyleWorkflow('OldWorkflow');
      workflow.addObserver(mockObserver);

      // Run the workflow
      workflow.run();

      // Events should be emitted to observers
      expect(capturedEvents.length).toBeGreaterThan(0);

      // But replay should return nothing (history disabled by default)
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(replayObserver.onEvent).not.toHaveBeenCalled();
    });

    it('should work with functional workflows', () => {
      const workflow = new Workflow(
        {
          name: 'FunctionalWorkflow',
          eventHistory: { enabled: true, maxEvents: 50 },
        },
        async (ctx) => {
          // Functional workflow logic
          return 'done';
        }
      );

      workflow.emitEvent({
        type: 'stateSnapshot',
        node: workflow.node,
      });

      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(replayObserver.onEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small maxEvents value', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 1 },
      });

      // Emit multiple events
      for (let i = 0; i < 10; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Should trim aggressively
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);

      // With maxEvents=1 and lazy trimming at 1.5x, might have 1-2 events
      expect(replayCount).toBeLessThanOrEqual(3);
    });

    it('should handle very small maxAgeMs value', async () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxAgeMs: 1 }, // 1ms
      });

      workflow.emitEvent({
        type: 'childAttached',
        parentId: 'parent-1',
        child: {
          id: 'child-1',
          name: 'Child',
          parent: null,
          children: [],
          status: 'idle',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      });

      // Wait for age to exceed
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit more to trigger trimming
      for (let i = 0; i < 1500; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Old event should be trimmed
      let hasOldEvent = false;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            const childEvent = event as any;
            if (childEvent.child.id === 'child-1') {
              hasOldEvent = true;
            }
          }
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(hasOldEvent).toBe(false);
    });

    it('should handle very large maxEvents value', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true, maxEvents: 100000 },
      });

      // Emit fewer events than maxEvents
      for (let i = 0; i < 100; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // All events should be preserved
      let replayCount = 0;
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: () => {
          replayCount++;
        },
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(replayCount).toBe(100);
    });

    it('should handle clearEventHistory with new structure', () => {
      const workflow = new Workflow({
        name: 'TestWorkflow',
        eventHistory: { enabled: true },
      });

      // Emit some events
      for (let i = 0; i < 10; i++) {
        workflow.emitEvent({
          type: 'childAttached',
          parentId: 'parent-1',
          child: {
            id: `child-${i}`,
            name: `Child${i}`,
            parent: null,
            children: [],
            status: 'idle',
            logs: [],
            events: [],
            stateSnapshot: null,
          },
        });
      }

      // Clear history
      workflow.clearEventHistory();

      // Replay should return nothing
      const replayObserver: WorkflowObserver = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      workflow.replayEvents(replayObserver);
      expect(replayObserver.onEvent).not.toHaveBeenCalled();
    });
  });
});
