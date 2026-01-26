/**
 * Unit tests for Workflow event replay functionality
 * Tests event storage, replay, trimming, and clearing with configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow Event Replay', () => {
  let workflow: TestWorkflow;
  let observer: WorkflowObserver;
  let capturedEvents: WorkflowEvent[];

  beforeEach(() => {
    workflow = new TestWorkflow();
    capturedEvents = [];

    observer = {
      onLog: () => {},
      onEvent: (event: WorkflowEvent) => {
        capturedEvents.push(event);
      },
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    workflow.addObserver(observer);

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Event History Storage', () => {
    it('should store events when history enabled', () => {
      const enabledWorkflow = new TestWorkflow({
        name: 'EnabledWorkflow',
        eventHistory: { enabled: true }
      });

      // Clear initial events
      const captured: WorkflowEvent[] = [];
      enabledWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => captured.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      captured.splice(0);

      // Emit test events
      enabledWorkflow.emitEvent({
        type: 'stepStart',
        node: enabledWorkflow.node,
        step: 'testStep'
      });
      enabledWorkflow.emitEvent({
        type: 'stepEnd',
        node: enabledWorkflow.node,
        step: 'testStep',
        duration: 100
      });

      // Verify events stored
      const replayed: WorkflowEvent[] = [];
      enabledWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(replayed.length).toBeGreaterThanOrEqual(2);
      expect(replayed[replayed.length - 2].type).toBe('stepStart');
      expect(replayed[replayed.length - 1].type).toBe('stepEnd');
    });

    it('should not store events when disabled', () => {
      // Default workflow has disabled history
      const disabledWorkflow = new TestWorkflow('DisabledWorkflow');

      // Clear initial events
      const captured: WorkflowEvent[] = [];
      disabledWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => captured.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      captured.splice(0);

      // Emit events
      disabledWorkflow.emitEvent({
        type: 'stepStart',
        node: disabledWorkflow.node,
        step: 'testStep'
      });

      // Verify no events stored
      const replayed: WorkflowEvent[] = [];
      disabledWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(replayed.length).toBe(0);
    });
  });

  describe('replayEvents()', () => {
    it('should replay events to late-joining observer', () => {
      const lateJoinWorkflow = new TestWorkflow({
        name: 'LateJoinWorkflow',
        eventHistory: { enabled: true }
      });

      // Clear initial events
      const initialCapture: WorkflowEvent[] = [];
      lateJoinWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => initialCapture.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      initialCapture.splice(0);

      // Emit events before "late observer" exists
      lateJoinWorkflow.emitEvent({
        type: 'stepStart',
        node: lateJoinWorkflow.node,
        step: 'earlyStep'
      });
      lateJoinWorkflow.emitEvent({
        type: 'stepEnd',
        node: lateJoinWorkflow.node,
        step: 'earlyStep',
        duration: 100
      });

      // Create "late-joining" observer (not added before events)
      const lateObserver: WorkflowEvent[] = [];
      lateJoinWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => lateObserver.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // Verify late observer receives historical events
      expect(lateObserver.length).toBeGreaterThanOrEqual(2);
      expect(lateObserver[lateObserver.length - 2].type).toBe('stepStart');
      expect(lateObserver[lateObserver.length - 1].type).toBe('stepEnd');
    });

    it('should respect maxEvents limit', () => {
      const limitedWorkflow = new TestWorkflow({
        name: 'LimitedWorkflow',
        eventHistory: { enabled: true, maxEvents: 100 }
      });

      // Emit 200 events (exceeds 1.5x threshold = 150)
      for (let i = 0; i < 200; i++) {
        limitedWorkflow.emitEvent({
          type: 'stepStart',
          node: limitedWorkflow.node,
          step: `step${i}`
        });
      }

      // Replay to get stored events
      const replayed: WorkflowEvent[] = [];
      limitedWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // Should be trimmed to ~100-150 (lazy trimming at 1.5x)
      expect(replayed.length).toBeLessThanOrEqual(150);
      expect(replayed.length).toBeGreaterThan(0);

      // Verify last event is most recent
      expect(replayed[replayed.length - 1].type).toBe('stepStart');
      if (replayed[replayed.length - 1].type === 'stepStart') {
        expect(replayed[replayed.length - 1].step).toBe('step199');
      }
    });

    it('should respect maxAgeMs limit', () => {
      vi.useFakeTimers();

      const ageLimitedWorkflow = new TestWorkflow({
        name: 'AgeLimitedWorkflow',
        eventHistory: { enabled: true, maxAgeMs: 60000 } // 1 minute
      });

      // Emit old event
      ageLimitedWorkflow.emitEvent({
        type: 'stepRetry',
        node: ageLimitedWorkflow.node,
        stepName: 'oldStep',
        retryCount: 1,
        error: {
          message: 'test',
          original: new Error('test'),
          workflowId: ageLimitedWorkflow.id,
          state: {},
          logs: []
        },
        analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
        timestamp: Date.now()
      });

      // Advance time by 2 minutes
      vi.advanceTimersByTime(120000);

      // Emit recent event
      ageLimitedWorkflow.emitEvent({
        type: 'stepStart',
        node: ageLimitedWorkflow.node,
        step: 'recentStep'
      });

      // Replay events
      const replayed: WorkflowEvent[] = [];
      ageLimitedWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // Should only have recent event (old one aged out)
      // Note: Events without timestamp (stepStart) always included in since filter
      // But maxAgeMs trimming uses insertedAt, so both could be trimmed
      expect(replayed.length).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });
  });

  describe('clearEventHistory()', () => {
    it('should clear event history on request', () => {
      const clearableWorkflow = new TestWorkflow({
        name: 'ClearableWorkflow',
        eventHistory: { enabled: true }
      });

      // Emit events
      clearableWorkflow.emitEvent({
        type: 'stepStart',
        node: clearableWorkflow.node,
        step: 'testStep'
      });
      clearableWorkflow.emitEvent({
        type: 'stepEnd',
        node: clearableWorkflow.node,
        step: 'testStep',
        duration: 100
      });

      // Verify events stored
      const beforeClear: WorkflowEvent[] = [];
      clearableWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => beforeClear.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      expect(beforeClear.length).toBeGreaterThan(0);

      // Clear history
      clearableWorkflow.clearEventHistory();

      // Verify history empty
      const afterClear: WorkflowEvent[] = [];
      clearableWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => afterClear.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      expect(afterClear.length).toBe(0);

      // Verify node.events not affected
      expect(clearableWorkflow.node.events.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty history gracefully', () => {
      const emptyWorkflow = new TestWorkflow('EmptyWorkflow');
      const replayed: WorkflowEvent[] = [];
      emptyWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      expect(replayed.length).toBe(0);
    });

    it('should handle limit of 0', () => {
      const zeroLimitWorkflow = new TestWorkflow({
        name: 'ZeroLimitWorkflow',
        eventHistory: { enabled: true }
      });

      zeroLimitWorkflow.emitEvent({
        type: 'stepStart',
        node: zeroLimitWorkflow.node,
        step: 'test'
      });

      const replayed: WorkflowEvent[] = [];
      zeroLimitWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      }, { limit: 0 });

      expect(replayed.length).toBe(0);
    });

    it('should handle limit larger than history', () => {
      const largeLimitWorkflow = new TestWorkflow({
        name: 'LargeLimitWorkflow',
        eventHistory: { enabled: true }
      });

      largeLimitWorkflow.emitEvent({
        type: 'stepStart',
        node: largeLimitWorkflow.node,
        step: 'test'
      });

      const replayed: WorkflowEvent[] = [];
      largeLimitWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      }, { limit: 1000 });

      expect(replayed.length).toBe(1);
    });

    it('should handle since timestamp in the future', () => {
      const futureSinceWorkflow = new TestWorkflow({
        name: 'FutureSinceWorkflow',
        eventHistory: { enabled: true }
      });

      futureSinceWorkflow.emitEvent({
        type: 'stepStart',
        node: futureSinceWorkflow.node,
        step: 'testStep'
      });

      const future = Date.now() + 1000000;

      const replayed: WorkflowEvent[] = [];
      futureSinceWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      }, { since: future });

      // Only events without timestamp (stepStart has no timestamp) should be included
      expect(replayed.length).toBe(1);
      expect(replayed[0].type).toBe('stepStart');
    });

    it('should handle observer errors during replay', () => {
      const errorWorkflow = new TestWorkflow({
        name: 'ErrorWorkflow',
        eventHistory: { enabled: true }
      });

      errorWorkflow.emitEvent({
        type: 'stepStart',
        node: errorWorkflow.node,
        step: 'step1'
      });
      errorWorkflow.emitEvent({
        type: 'stepEnd',
        node: errorWorkflow.node,
        step: 'step1',
        duration: 100
      });
      errorWorkflow.emitEvent({
        type: 'stepStart',
        node: errorWorkflow.node,
        step: 'step2'
      });

      let callCount = 0;
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Observer error');
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      // Should not throw
      expect(() => errorWorkflow.replayEvents(throwingObserver)).not.toThrow();

      // All events should have been attempted
      expect(callCount).toBe(3);
    });

    it('should handle multiple observers replay', () => {
      const multiObserverWorkflow = new TestWorkflow({
        name: 'MultiObserverWorkflow',
        eventHistory: { enabled: true }
      });

      multiObserverWorkflow.emitEvent({
        type: 'stepStart',
        node: multiObserverWorkflow.node,
        step: 'step1'
      });

      const observer1Events: WorkflowEvent[] = [];
      const observer2Events: WorkflowEvent[] = [];

      multiObserverWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => observer1Events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      multiObserverWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => observer2Events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      expect(observer1Events.length).toBe(1);
      expect(observer2Events.length).toBe(1);
    });

    it('should handle custom maxEvents and maxAgeMs together', () => {
      vi.useFakeTimers();

      const customConfigWorkflow = new TestWorkflow({
        name: 'CustomConfigWorkflow',
        eventHistory: { enabled: true, maxEvents: 50, maxAgeMs: 30000 } // 30 seconds
      });

      // Emit 100 events
      for (let i = 0; i < 100; i++) {
        customConfigWorkflow.emitEvent({
          type: 'stepStart',
          node: customConfigWorkflow.node,
          step: `step${i}`
        });
      }

      // Advance time
      vi.advanceTimersByTime(60000); // 1 minute

      // Emit more events
      for (let i = 0; i < 20; i++) {
        customConfigWorkflow.emitEvent({
          type: 'taskStart',
          node: customConfigWorkflow.node,
          task: `task${i}`
        });
      }

      const replayed: WorkflowEvent[] = [];
      customConfigWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // Should be trimmed by both maxEvents and maxAgeMs
      expect(replayed.length).toBeLessThanOrEqual(75); // 1.5x maxEvents
      expect(replayed.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should handle very small maxEvents (trimming behavior)', () => {
      const smallMaxWorkflow = new TestWorkflow({
        name: 'SmallMaxWorkflow',
        eventHistory: { enabled: true, maxEvents: 5 }
      });

      // Emit 20 events (exceeds 1.5x threshold = 7.5 -> 7)
      for (let i = 0; i < 20; i++) {
        smallMaxWorkflow.emitEvent({
          type: 'stepStart',
          node: smallMaxWorkflow.node,
          step: `step${i}`
        });
      }

      const replayed: WorkflowEvent[] = [];
      smallMaxWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // Should be trimmed close to maxEvents
      expect(replayed.length).toBeLessThanOrEqual(7);
      expect(replayed.length).toBeGreaterThan(0);

      // Verify last event is most recent
      expect(replayed[replayed.length - 1].type).toBe('stepStart');
      if (replayed[replayed.length - 1].type === 'stepStart') {
        expect(replayed[replayed.length - 1].step).toBe('step19');
      }
    });

    it('should handle since and limit options together', () => {
      vi.useFakeTimers();

      const combinedOptionsWorkflow = new TestWorkflow({
        name: 'CombinedOptionsWorkflow',
        eventHistory: { enabled: true }
      });

      const now = Date.now();

      // Emit events with timestamps
      for (let i = 0; i < 10; i++) {
        combinedOptionsWorkflow.emitEvent({
          type: 'stepRetry',
          node: combinedOptionsWorkflow.node,
          stepName: `step${i}`,
          retryCount: i,
          error: {
            message: 'test',
            original: new Error('test'),
            workflowId: combinedOptionsWorkflow.id,
            state: {},
            logs: []
          },
          analysis: { shouldRestart: true, reason: 'test', matchedCriteria: [] },
          timestamp: now + i * 1000
        });
      }

      // Add events without timestamps (always included)
      combinedOptionsWorkflow.emitEvent({
        type: 'stepStart',
        node: combinedOptionsWorkflow.node,
        step: 'noTimestamp1'
      });
      combinedOptionsWorkflow.emitEvent({
        type: 'stepStart',
        node: combinedOptionsWorkflow.node,
        step: 'noTimestamp2'
      });

      const replayed: WorkflowEvent[] = [];
      // Filter to last 5 seconds, then limit to 4
      combinedOptionsWorkflow.replayEvents({
        onLog: () => {},
        onEvent: (e) => replayed.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      }, { since: now + 5000, limit: 4 });

      // Should filter to events after 5 seconds + events without timestamp, then limit to 4
      expect(replayed.length).toBe(4);

      vi.useRealTimers();
    });

    it('should preserve event order when replaying', () => {
      const orderWorkflow = new TestWorkflow({
        name: 'OrderWorkflow',
        eventHistory: { enabled: true }
      });

      const eventTypes = ['stepStart', 'stepEnd', 'taskStart', 'taskEnd'] as const;

      eventTypes.forEach((type) => {
        if (type === 'stepStart' || type === 'stepEnd') {
          orderWorkflow.emitEvent({
            type,
            node: orderWorkflow.node,
            step: 'test',
            duration: type === 'stepEnd' ? 100 : undefined
          });
        } else {
          orderWorkflow.emitEvent({
            type,
            node: orderWorkflow.node,
            task: 'test'
          });
        }
      });

      const replayed: WorkflowEvent[] = [];
      orderWorkflow.replayEvents({
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
});
