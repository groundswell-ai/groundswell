import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Workflow } from '../../core/workflow';
import type { WorkflowObserver, WorkflowEvent, LogEntry } from '../../types';

describe('Observer Error Logging Integration Tests', () => {
  describe('WorkflowLogger observer onLog error', () => {
    it('should log observer onLog errors to workflow.node.logs', async () => {
      const onLogError = new Error('Observer onLog failed');

      const throwingObserver: WorkflowObserver = {
        onLog: () => {
          throw onLogError;
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test message');
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);
      await workflow.run();

      // Should have 2 logs: the original "Test message" and the observer error
      expect(workflow.node.logs.length).toBe(2);

      // First log is the original message
      expect(workflow.node.logs[0].message).toBe('Test message');
      expect(workflow.node.logs[0].level).toBe('info');

      // Second log is the observer error
      expect(workflow.node.logs[1].message).toBe('Observer onLog error');
      expect(workflow.node.logs[1].level).toBe('error');
      expect(workflow.node.logs[1].data).toEqual({ error: onLogError });
    });

    it('should avoid infinite recursion when observer onLog throws', async () => {
      let callCount = 0;
      const maxCalls = 10; // Safety limit to prevent actual infinite loop

      const throwingObserver: WorkflowObserver = {
        onLog: () => {
          callCount++;
          if (callCount < maxCalls) {
            throw new Error('Recursive error');
          }
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test message');
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);
      await workflow.run();

      // Should only call onLog once (original) + one error log, then stop
      // The error log should NOT trigger another observer notification
      expect(callCount).toBe(1);

      // Should have 2 logs: original + error
      expect(workflow.node.logs.length).toBe(2);
    });
  });

  describe('Workflow observer onEvent error', () => {
    it('should log observer onEvent errors via this.logger.error', () => {
      const onEventError = new Error('Observer onEvent failed');

      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {
          throw onEventError;
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'testEvent' });
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);

      workflow.run();

      // Should have error log entry
      const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onEvent error');
      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('error');
      expect(errorLog?.data).toEqual({
        error: onEventError,
        eventType: 'testEvent',
      });
    });

    it('should include event type in error data', () => {
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {
          throw new Error('Event error');
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'treeUpdated', root: this.node });
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);

      workflow.run();

      const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onEvent error');
      expect(errorLog?.data).toHaveProperty('eventType', 'treeUpdated');
    });
  });

  describe('Workflow observer onStateUpdated error', () => {
    it('should log observer onStateUpdated errors via this.logger.error', async () => {
      const onStateUpdatedError = new Error('Observer onStateUpdated failed');

      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {},
        onStateUpdated: () => {
          throw onStateUpdatedError;
        },
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.snapshotState();
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);
      await workflow.run();

      // Should have error log entry
      const errorLog = workflow.node.logs.find(
        (log) => log.message === 'Observer onStateUpdated error'
      );
      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('error');
      expect(errorLog?.data).toEqual({
        error: onStateUpdatedError,
        nodeId: workflow.node.id,
      });
    });

    it('should include node ID in error data', async () => {
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {},
        onStateUpdated: () => {
          throw new Error('State update error');
        },
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.snapshotState();
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);
      await workflow.run();

      const errorLog = workflow.node.logs.find(
        (log) => log.message === 'Observer onStateUpdated error'
      );
      expect(errorLog?.data).toHaveProperty('nodeId', workflow.node.id);
    });
  });

  describe('Validation errors still use console.error', () => {
    it('should use console.error for child already has parent validation', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const parent = new Workflow('ParentWorkflow');
      const child1 = new Workflow('Child1', parent);
      const child2 = new Workflow('Child2');

      // Try to attach child1 to child2 (should fail - already has parent)
      expect(() => {
        child2.attachChild(child1);
      }).toThrow();

      // Should have called console.error for validation
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMessage = consoleErrorSpy.mock.calls[0][0] as string;
      expect(errorMessage).toContain('already has a parent');

      consoleErrorSpy.mockRestore();
    });

    it('should use console.error for circular reference detection', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const grandparent = new Workflow('Grandparent');
      const parent = new Workflow('Parent', grandparent);
      const child = new Workflow('Child', parent);

      // Try to attach grandparent as child of child (circular reference)
      expect(() => {
        child.attachChild(grandparent);
      }).toThrow();

      // Should have called console.error for validation
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMessage = consoleErrorSpy.mock.calls[0][0] as string;
      expect(errorMessage).toContain('circular reference');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error isolation', () => {
    it('should not crash workflow when observer onLog throws', async () => {
      const throwingObserver: WorkflowObserver = {
        onLog: () => {
          throw new Error('Observer onLog error');
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Message 1');
          this.logger.info('Message 2');
          this.logger.info('Message 3');
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);

      // Should complete without throwing
      await expect(workflow.run()).resolves.toBeUndefined();

      // All messages should be logged
      expect(workflow.node.logs.length).toBe(6); // 3 messages + 3 error logs
    });

    it('should not crash workflow when observer onEvent throws', () => {
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {
          throw new Error('Observer onEvent error');
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'event1' });
          this.emitEvent({ type: 'event2' });
          this.emitEvent({ type: 'event3' });
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);

      // Should complete without throwing
      expect(() => {
        workflow.run();
      }).not.toThrow();

      // All events should be emitted
      expect(workflow.node.events.length).toBe(3);
    });

    it('should not crash workflow when observer onStateUpdated throws', async () => {
      const throwingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {},
        onStateUpdated: () => {
          throw new Error('Observer onStateUpdated error');
        },
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.snapshotState();
          this.snapshotState();
          this.snapshotState();
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);

      // Should complete without throwing
      await expect(workflow.run()).resolves.toBeUndefined();
    });
  });

  describe('Multiple observers', () => {
    it('should continue notifying other observers after one throws', async () => {
      let observer2Called = false;
      let observer3Called = false;

      const throwingObserver: WorkflowObserver = {
        onLog: () => {
          throw new Error('Observer 1 failed');
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const workingObserver2: WorkflowObserver = {
        onLog: () => {
          observer2Called = true;
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const workingObserver3: WorkflowObserver = {
        onLog: () => {
          observer3Called = true;
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test message');
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver);
      workflow.addObserver(workingObserver2);
      workflow.addObserver(workingObserver3);

      await workflow.run();

      // Both working observers should have been called
      expect(observer2Called).toBe(true);
      expect(observer3Called).toBe(true);

      // Should have error log for throwing observer
      const errorLog = workflow.node.logs.find((log) => log.message === 'Observer onLog error');
      expect(errorLog).toBeDefined();
    });

    it('should log errors for multiple throwing observers', async () => {
      const throwingObserver1: WorkflowObserver = {
        onLog: () => {
          throw new Error('Observer 1 error');
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      const throwingObserver2: WorkflowObserver = {
        onLog: () => {
          throw new Error('Observer 2 error');
        },
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test message');
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver(throwingObserver1);
      workflow.addObserver(throwingObserver2);

      await workflow.run();

      // Should have error logs for both throwing observers
      const errorLogs = workflow.node.logs.filter((log) => log.message === 'Observer onLog error');
      expect(errorLogs.length).toBe(2);
    });
  });
});
