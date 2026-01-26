import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

/**
 * Unit tests for Workflow event history storage and replay functionality
 * Tests #eventHistory private field, replayEvents(), and clearEventHistory()
 */

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow Event History', () => {
  let workflow: TestWorkflow;
  let observer: WorkflowObserver;
  let capturedEvents: WorkflowEvent[];

  beforeEach(() => {
    // Create workflow with event history enabled
    workflow = new TestWorkflow();
    // Enable event history for testing
    (workflow as any).config.eventHistory = { enabled: true };

    capturedEvents = [];

    // Create observer that captures events
    observer = {
      onLog: () => {},
      onEvent: (event: WorkflowEvent) => {
        capturedEvents.push(event);
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);

    // Mock console methods for tests that may produce warnings/errors
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Event History Storage', () => {
    it('should store events in history when emitted', () => {
      // Clear initial events from constructor
      capturedEvents = [];

      // Emit a few events
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'testStep' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'testStep', duration: 100 });

      // Events should have been captured by observer
      expect(capturedEvents.length).toBe(2);
      expect(capturedEvents[0].type).toBe('stepStart');
      expect(capturedEvents[1].type).toBe('stepEnd');
    });

    it('should store events in history before notifying observers', () => {
      capturedEvents = [];

      let replayedEvents: WorkflowEvent[] = [];
      const replayObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (event: WorkflowEvent) => {
          replayedEvents.push(event);
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Emit an event
      workflow.emitEvent({ type: 'taskStart', node: workflow.node, task: 'testTask' });

      // Replay to a new observer - should receive the event
      workflow.replayEvents(replayObserver);

      expect(replayedEvents.length).toBe(1);
      expect(replayedEvents[0].type).toBe('taskStart');
    });

    it('should preserve event order in history', () => {
      capturedEvents = [];

      const eventTypes = ['stepStart', 'stepEnd', 'taskStart', 'taskEnd'] as const;

      eventTypes.forEach((type) => {
        if (type === 'stepStart' || type === 'stepEnd') {
          workflow.emitEvent({ type, node: workflow.node, step: 'test', duration: type === 'stepEnd' ? 100 : undefined });
        } else {
          workflow.emitEvent({ type, node: workflow.node, task: 'test' });
        }
      });

      // Capture events via replay
      const replayed: WorkflowEvent[] = [];
      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(replayed.length).toBe(4);
      expect(replayed[0].type).toBe('stepStart');
      expect(replayed[1].type).toBe('stepEnd');
      expect(replayed[2].type).toBe('taskStart');
      expect(replayed[3].type).toBe('taskEnd');
    });
  });

  describe('replayEvents()', () => {
    it('should replay all events to observer when no options provided', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 50 });
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step2' });

      // Create new observer for replay
      const replayedEvents: WorkflowEvent[] = [];
      const newObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => replayedEvents.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      workflow.replayEvents(newObserver);

      expect(replayedEvents.length).toBe(3);
      expect(replayedEvents[0].type).toBe('stepStart');
      expect(replayedEvents[1].type).toBe('stepEnd');
      expect(replayedEvents[2].type).toBe('stepStart');
    });

    it('should filter events by timestamp when since option is provided', () => {
      capturedEvents = [];

      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Create events with timestamps
      workflow.emitEvent({
        type: 'stepRetry',
        node: workflow.node,
        stepName: 'failingStep',
        retryCount: 1,
        error: { message: 'test error', original: new Error('test'), workflowId: workflow.id, state: {}, logs: [] },
        analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
        timestamp: oneHourAgo - 1000, // Before cutoff
      });

      workflow.emitEvent({
        type: 'stepRetry',
        node: workflow.node,
        stepName: 'failingStep',
        retryCount: 2,
        error: { message: 'test error', original: new Error('test'), workflowId: workflow.id, state: {}, logs: [] },
        analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
        timestamp: oneHourAgo + 1000, // After cutoff
      });

      // Add event without timestamp (should always be included)
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: oneHourAgo }
      );

      // Should include: second stepRetry (after cutoff) + stepStart (no timestamp)
      expect(replayedEvents.length).toBe(2);
      expect(replayedEvents[0].type).toBe('stepRetry');
      expect((replayedEvents[0] as any).retryCount).toBe(2);
      expect(replayedEvents[1].type).toBe('stepStart');
    });

    it('should limit events when limit option is provided', () => {
      capturedEvents = [];

      // Emit 5 events
      for (let i = 0; i < 5; i++) {
        workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: `step${i}` });
      }

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { limit: 3 }
      );

      expect(replayedEvents.length).toBe(3);
    });

    it('should apply filter first, then limit when both options provided', () => {
      capturedEvents = [];

      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Create 5 events with different timestamps
      for (let i = 0; i < 5; i++) {
        workflow.emitEvent({
          type: 'stepRetry',
          node: workflow.node,
          stepName: `step${i}`,
          retryCount: i,
          error: { message: 'test error', original: new Error('test'), workflowId: workflow.id, state: {}, logs: [] },
          analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
          timestamp: oneHourAgo + i * 60 * 1000, // Each event 1 minute apart
        });
      }

      const replayedEvents: WorkflowEvent[] = [];
      // Filter to last 2 minutes, then limit to 2
      const twoMinutesAgo = oneHourAgo + 3 * 60 * 1000;
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: twoMinutesAgo, limit: 2 }
      );

      // Should have filtered to 2 events (steps 3 and 4), then limited to 2
      expect(replayedEvents.length).toBe(2);
    });

    it('should handle empty history gracefully', () => {
      capturedEvents = [];

      const replayedEvents: WorkflowEvent[] = [];
      const newObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => replayedEvents.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Clear any existing history by creating a new workflow
      const freshWorkflow = new TestWorkflow();
      freshWorkflow.replayEvents(newObserver);

      expect(replayedEvents.length).toBe(0);
    });

    it('should handle observer errors gracefully and continue replaying', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 100 });
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step2' });

      let callCount = 0;
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Observer error');
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Should not throw, should log error and continue
      expect(() => workflow.replayEvents(throwingObserver)).not.toThrow();

      // All 3 events should have been attempted
      expect(callCount).toBe(3);
    });

    it('should always include events without timestamps when using since filter', () => {
      capturedEvents = [];

      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Add events without timestamps (should always be included)
      workflow.emitEvent({ type: 'childAttached', parentId: workflow.id, child: workflow.node });
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
      workflow.emitEvent({ type: 'treeUpdated', root: workflow.node });

      // Add old event with timestamp
      workflow.emitEvent({
        type: 'stepRetry',
        node: workflow.node,
        stepName: 'oldStep',
        retryCount: 1,
        error: { message: 'test error', original: new Error('test'), workflowId: workflow.id, state: {}, logs: [] },
        analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
        timestamp: oneHourAgo - 1000,
      });

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: now }
      );

      // Should include all 3 events without timestamps, but not the old stepRetry
      expect(replayedEvents.length).toBe(3);
      expect(replayedEvents.every(e => e.type !== 'stepRetry')).toBe(true);
    });
  });

  describe('clearEventHistory()', () => {
    it('should clear the event history array', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 100 });

      // Verify events were stored
      const replayedBefore: WorkflowEvent[] = [];
      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayedBefore.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      expect(replayedBefore.length).toBeGreaterThan(0);

      // Clear history
      workflow.clearEventHistory();

      // Verify history is empty
      const replayedAfter: WorkflowEvent[] = [];
      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayedAfter.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      expect(replayedAfter.length).toBe(0);
    });

    it('should preserve node.events when clearing history', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 100 });

      const nodeEventsLengthBefore = workflow.node.events.length;

      workflow.clearEventHistory();

      // node.events should still have events
      expect(workflow.node.events.length).toBe(nodeEventsLengthBefore);
      expect(workflow.node.events.length).toBeGreaterThan(0);
    });

    it('should allow new events to be stored after clearing', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.clearEventHistory();

      // Emit new events after clearing
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step2' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step2', duration: 100 });

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayedEvents.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(replayedEvents.length).toBe(2);
      expect(replayedEvents[0].type).toBe('stepStart');
      expect(replayedEvents[1].type).toBe('stepEnd');
    });

    it('should be idempotent - calling multiple times is safe', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });

      workflow.clearEventHistory();
      workflow.clearEventHistory();
      workflow.clearEventHistory();

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayedEvents.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(replayedEvents.length).toBe(0);
    });
  });

  describe('Integration with Observer Pattern', () => {
    it('should work with multiple observers', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });

      const observer1Events: WorkflowEvent[] = [];
      const observer2Events: WorkflowEvent[] = [];

      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => observer1Events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      workflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => observer2Events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(observer1Events.length).toBe(1);
      expect(observer2Events.length).toBe(1);
    });

    it('should allow new observers to catch up on historical events', () => {
      capturedEvents = [];

      // Emit events before adding observer
      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 100 });

      // Add new observer and replay
      const newObserverEvents: WorkflowEvent[] = [];
      const newObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => newObserverEvents.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      workflow.replayEvents(newObserver);

      expect(newObserverEvents.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit larger than history size', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { limit: 1000 }
      );

      expect(replayedEvents.length).toBe(1);
    });

    it('should handle limit of 0', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });
      workflow.emitEvent({ type: 'stepEnd', node: workflow.node, step: 'step1', duration: 100 });

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { limit: 0 }
      );

      expect(replayedEvents.length).toBe(0);
    });

    it('should handle since timestamp in the future', () => {
      capturedEvents = [];

      workflow.emitEvent({ type: 'stepStart', node: workflow.node, step: 'step1' });

      const future = Date.now() + 1000000;

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: future }
      );

      // Only events without timestamp (stepStart has no timestamp) should be included
      expect(replayedEvents.length).toBe(1);
      expect(replayedEvents[0].type).toBe('stepStart');
    });

    it('should handle invalidResponse event with timestamp', () => {
      capturedEvents = [];

      const timestamp = Date.now();

      workflow.emitEvent({
        type: 'invalidResponse',
        node: workflow.node,
        response: { status: 'success', data: null, agentId: 'test', startTime: timestamp, endTime: timestamp },
        agentId: 'test-agent',
        errors: [] as any,
        timestamp,
      });

      const oneMinuteAgo = timestamp - 60000;

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: oneMinuteAgo }
      );

      expect(replayedEvents.length).toBe(1);
      expect(replayedEvents[0].type).toBe('invalidResponse');
    });

    it('should handle stepRestarted event with timestamp', () => {
      capturedEvents = [];

      const timestamp = Date.now();

      workflow.emitEvent({
        type: 'stepRestarted',
        node: workflow.node,
        stepName: 'testStep',
        retryCount: 1,
        restoredState: {},
        timestamp,
      });

      const oneMinuteAgo = timestamp - 60000;

      const replayedEvents: WorkflowEvent[] = [];
      workflow.replayEvents(
        {
          onLog: () => {},
          onEvent: (e) => replayedEvents.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        },
        { since: oneMinuteAgo }
      );

      expect(replayedEvents.length).toBe(1);
      expect(replayedEvents[0].type).toBe('stepRestarted');
    });
  });
});
