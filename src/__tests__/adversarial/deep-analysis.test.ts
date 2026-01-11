/**
 * Deep Analysis Tests
 * These tests probe deeper into edge cases, error scenarios, and potential bugs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Workflow, Step, Task, ObservedState } from '../../index.js';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';

describe('Deep Analysis Tests', () => {
  describe('Observable Edge Cases', () => {
    it('should handle Observable.subscribe with empty observer object', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'stepStart', node: this.node, step: 'test' });
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      // Subscribe with empty observer - should not crash
      debuggerInstance.events.subscribe({});

      await workflow.run();
    });

    it('should handle Observable.unsubscribe during event emission', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          for (let i = 0; i < 10; i++) {
            this.emitEvent({ type: 'stepStart', node: this.node, step: `step-${i}` });
          }
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      let count = 0;
      const subscription = debuggerInstance.events.subscribe({
        next: () => {
          count++;
          if (count === 5) {
            subscription.unsubscribe();
          }
        },
      });

      await workflow.run();

      // Should have received 5 events before unsubscribing
      expect(count).toBe(5);
    });
  });

  describe('WorkflowLogger Edge Cases', () => {
    it('should handle logger.child() with empty parentLogId', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child('');
          childLogger.info('Child log with empty parent');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1);
      // Empty string is passed through as parentLogId
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
    });

    it('should handle logger with very long messages', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const longMessage = 'A'.repeat(10000);
          this.logger.info(longMessage);
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs[0].message.length).toBe(10000);
    });

    it('should handle logger with special characters in data', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test', {
            null: null,
            undefined: undefined,
            circular: { self: null as any },
            function: () => {},
            symbol: Symbol('test'),
          });
        }
      }

      const workflow = new TestWorkflow();
      // Should not throw
      await workflow.run();
    });
  });

  describe('Step Decorator Edge Cases', () => {
    it('should handle @Step on synchronous method that returns Promise', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async testStep() {
          return Promise.resolve('done');
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBe('done');
    });

    it('should handle @Step that returns undefined', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async testStep() {
          // No return
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBeUndefined();
    });

    it('should handle @Step that throws non-Error', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async testStep() {
          throw 'string error';
        }

        async run() {
          try {
            await this.testStep();
          } catch (err) {
            // Non-Error throws get wrapped with 'Unknown error' message
            // but the original is preserved
            expect((err as any).message).toBe('Unknown error');
            expect((err as any).original).toBe('string error');
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });

    it('should handle @Step that throws null', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async testStep() {
          throw null;
        }

        async run() {
          try {
            await this.testStep();
          } catch (err) {
            expect(err).not.toBeNull();
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('Task Decorator Edge Cases', () => {
    it('should handle @Task that returns primitive value', async () => {
      class TestWorkflow extends Workflow {
        @Task()
        async returnsString() {
          return 'not a workflow';
        }

        async run() {
          return this.returnsString();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBe('not a workflow');
      expect(workflow.children.length).toBe(0);
    });

    it('should handle @Task that returns number', async () => {
      class TestWorkflow extends Workflow {
        @Task()
        async returnsNumber() {
          return 42;
        }

        async run() {
          return this.returnsNumber();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBe(42);
    });

    it('should handle @Task that returns object with id property (duck typing)', async () => {
      class TestWorkflow extends Workflow {
        @Task()
        async returnsDuck() {
          return { id: 'duck-123', name: 'Duck' };
        }

        async run() {
          return this.returnsDuck();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      // Duck typing - objects with 'id' property get parent attached
      // The returned object is mutated to have a parent property
      expect(result.id).toBe('duck-123');
      expect(result.name).toBe('Duck');
      expect(result.parent).toBeDefined();
      // Duck typing treats it as a workflow and attaches it
      expect(workflow.children.length).toBe(1);
    });

    it('should handle @Task with concurrent on single non-workflow', async () => {
      class TestWorkflow extends Workflow {
        @Task({ concurrent: true })
        async returnsString() {
          return 'not a workflow';
        }

        async run() {
          return this.returnsString();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBe('not a workflow');
    });

    it('should handle @Task with concurrent: true but no run method', async () => {
      class ChildWorkflow extends Workflow {
        // No run method - will throw
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChild() {
          return new ChildWorkflow('Child', this);
        }

        async run() {
          // Child will be attached but running it will throw
          return this.spawnChild();
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      // Child should still be attached
      expect(workflow.children.length).toBe(1);
    });
  });

  describe('ObservedState Edge Cases', () => {
    it('should handle undefined value in observed state', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        undefinedField: string | undefined = undefined;

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot?.undefinedField).toBeUndefined();
    });

    it('should handle circular reference in observed state', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        circular: any = {};

        async run() {
          this.circular.self = this.circular;
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      // Should not crash
      await workflow.run();
    });

    it('should handle deeply nested object in observed state', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        nested: any = { level: 1 };

        async run() {
          for (let i = 2; i <= 100; i++) {
            this.nested = { level: i, child: this.nested };
          }
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot?.nested).toBeDefined();
    });
  });

  describe('Workflow Construction Edge Cases', () => {
    it('should handle Workflow with no arguments', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      expect(workflow.node.name).toBe('TestWorkflow');
      expect(workflow.parent).toBeNull();
    });

    it('should handle Workflow with only parent argument', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      class ParentWorkflow extends Workflow {
        async run() {
          const child = new ChildWorkflow(undefined as any, this);
          expect(child.parent).toBe(this);
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });

    it('should handle functional workflow pattern', async () => {
      const workflow = new Workflow({ name: 'FunctionalWorkflow' }, async (ctx) => {
        await ctx.step('test', async () => {
          return 'done';
        });
      });

      const result = await workflow.run();
      expect(result).toBeDefined();
    });
  });

  describe('Tree Debugger Edge Cases', () => {
    it('should handle toTreeString on deep hierarchy', async () => {
      // Create a root workflow with deep children
      class RootWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const root = new RootWorkflow();
      let lastWorkflow: any = root;

      // Build deep hierarchy
      for (let i = 0; i < 20; i++) {
        const ChildWorkflow = class extends Workflow {
          async run() {
            return 'done';
          }
        };
        const child = new ChildWorkflow(`Workflow-${i}`, lastWorkflow);
        await child.run();
        lastWorkflow = child;
      }

      // Create debugger on the root
      const debuggerInstance = new WorkflowTreeDebugger(root);
      const treeString = debuggerInstance.toTreeString();

      expect(treeString.length).toBeGreaterThan(0);
      expect(treeString.split('\n').length).toBeGreaterThan(20);
    });

    it('should handle toLogString on workflow with no logs', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // No logs
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      const debuggerInstance = new WorkflowTreeDebugger(workflow);
      const logString = debuggerInstance.toLogString();

      expect(typeof logString).toBe('string');
    });

    it('should handle getNode on non-existent ID', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      const node = debuggerInstance.getNode('non-existent-id');
      expect(node).toBeUndefined();
    });

    it('should handle getStats on complex tree', async () => {
      class ChildWorkflow extends Workflow {
        @Step()
        async step() {
          this.logger.info('Child log');
          return 'done';
        }

        async run() {
          return this.step();
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            new ChildWorkflow('Child1', this),
            new ChildWorkflow('Child2', this),
            new ChildWorkflow('Child3', this),
          ];
        }

        async run() {
          await this.spawnChildren();
          await Promise.all(this.children.map(c => c.run()));
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      const debuggerInstance = new WorkflowTreeDebugger(workflow);
      const stats = debuggerInstance.getStats();

      expect(stats.totalNodes).toBe(4); // 1 parent + 3 children
      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
    });
  });

  describe('Event Propagation Edge Cases', () => {
    it('should handle events emitted during observer callback', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          let callCount = 0;

          this.addObserver({
            onLog: () => {},
            onEvent: () => {
              callCount++;
              // Emit another event during callback
              if (callCount === 1) {
                this.emitEvent({ type: 'stepStart', node: this.node, step: 'nested' });
              }
            },
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          this.emitEvent({ type: 'stepStart', node: this.node, step: 'initial' });

          expect(callCount).toBeGreaterThanOrEqual(1);
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });

    it('should handle multiple observers with different behaviors', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const results: { [key: string]: number } = {};

          this.addObserver({
            onLog: () => { results.observer1 = (results.observer1 || 0) + 1; },
            onEvent: () => { results.observer1 = (results.observer1 || 0) + 1; },
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          this.addObserver({
            onLog: () => { results.observer2 = (results.observer2 || 0) + 1; },
            onEvent: () => { results.observer2 = (results.observer2 || 0) + 1; },
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          this.emitEvent({ type: 'stepStart', node: this.node, step: 'test' });

          expect(results.observer1).toBeGreaterThan(0);
          expect(results.observer2).toBeGreaterThan(0);
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('State Transition Edge Cases', () => {
    it('should handle status changes during execution', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          expect(this.status).toBe('idle');
          this.setStatus('running');
          expect(this.status).toBe('running');
          this.setStatus('completed');
          expect(this.status).toBe('completed');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });

    it('should handle invalid status values', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // TypeScript should prevent this at compile time, but let's test runtime
          this.setStatus('invalid' as any);
          // Status should be set (no validation at runtime)
          expect(this.status).toBe('invalid');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('Child Attachment Edge Cases', () => {
    it('should prevent attaching the same child twice', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      class ParentWorkflow extends Workflow {
        async run() {
          const child = new ChildWorkflow('Child', this);
          // Try to attach again
          expect(() => {
            this.attachChild(child);
          }).toThrow('Child already attached');
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });

    it('should handle child with parent set in constructor', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      class ParentWorkflow extends Workflow {
        async run() {
          const child = new ChildWorkflow('Child', this);
          // Child should already be attached
          expect(this.children.length).toBe(1);
          expect(this.children[0]).toBe(child);
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    it('should handle rapid workflow creation and destruction', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      for (let i = 0; i < 100; i++) {
        const workflow = new TestWorkflow(`Workflow-${i}`);
        await workflow.run();
      }

      // If we got here without crashing, memory management is reasonable
      expect(true).toBe(true);
    });

    it('should handle many observers on single workflow', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'stepStart', node: this.node, step: 'test' });
        }
      }

      const workflow = new TestWorkflow();

      // Add 100 observers
      for (let i = 0; i < 100; i++) {
        workflow.addObserver({
          onLog: () => {},
          onEvent: () => {},
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });
      }

      await workflow.run();

      // Should complete without issues
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery Edge Cases', () => {
    it('should handle error in @Step followed by another @Step', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async failingStep() {
          throw new Error('Failed');
        }

        @Step()
        async successStep() {
          return 'success';
        }

        async run() {
          try {
            await this.failingStep();
          } catch (err) {
            // Expected
          }
          return await this.successStep();
        }
      }

      const workflow = new TestWorkflow();
      const result = await workflow.run();
      expect(result).toBe('success');
    });

    it('should handle multiple sequential errors', async () => {
      class TestWorkflow extends Workflow {
        @Step()
        async errorStep1() {
          throw new Error('Error 1');
        }

        @Step()
        async errorStep2() {
          throw new Error('Error 2');
        }

        async run() {
          try {
            await this.errorStep1();
          } catch (err) {
            // Expected
          }
          try {
            await this.errorStep2();
          } catch (err) {
            // Expected
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      // Should have multiple error events
      const errorEvents = workflow.node.events.filter(e => e.type === 'error');
      expect(errorEvents.length).toBe(2);
    });
  });
});
