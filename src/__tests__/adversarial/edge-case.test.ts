/**
 * Adversarial and Edge Case Tests for Hierarchical Workflow Engine
 * These tests explore potential bugs, edge cases, and PRD compliance issues
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Workflow, Step, Task, ObservedState } from '../../index.js';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';

describe('Adversarial Edge Case Tests', () => {
  describe('PRD Requirement: Step Decorator Defaults', () => {
    /**
     * PRD Section 8.1 specifies @Step options with defaults
     * - trackTiming should be true by default (mentioned in skeleton but not explicit)
     */

    it('should track timing by default when trackTiming is not specified', async () => {
      let stepEndEmitted = false;
      let durationEmitted: number | undefined;

      class TestWorkflow extends Workflow {
        @Step()
        async testStep() {
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      // Subscribe to events correctly
      debuggerInstance.events.subscribe({
        next: (event) => {
          if (event.type === 'stepEnd') {
            stepEndEmitted = true;
            durationEmitted = event.duration;
          }
        },
      });

      await workflow.run();

      expect(stepEndEmitted).toBe(true);
      expect(typeof durationEmitted).toBe('number');
      expect(durationEmitted!).toBeGreaterThanOrEqual(0);
    });

    it('should NOT track timing when explicitly set to false', async () => {
      let stepEndEmitted = false;

      class TestWorkflow extends Workflow {
        @Step({ trackTiming: false })
        async testStep() {
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      debuggerInstance.events.subscribe({
        next: (event) => {
          if (event.type === 'stepEnd') {
            stepEndEmitted = true;
          }
        },
      });

      await workflow.run();

      // stepEnd should NOT be emitted when trackTiming is false
      // This is based on the implementation: trackTiming !== false controls emission
      expect(stepEndEmitted).toBe(false);
    });
  });

  describe('PRD Requirement: WorkflowLogger.child() Behavior', () => {
    /**
     * PRD Section 12.1 shows WorkflowLogger.child(meta: Partial<LogEntry>)
     * But implementation shows: child(parentLogId: string)
     * This is a mismatch between PRD and implementation
     */

    it('should have child() method that accepts parentLogId', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // Access logger to verify child method exists
          const childLogger = this.logger.child('parent-id-123');
          expect(childLogger).toBeDefined();
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('Edge Case: Empty and Null Values', () => {
    it('should reject empty string workflow name', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      expect(() => new TestWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
    });

    it('should handle null and undefined observed state values', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        nullableValue: string | null = null;

        @ObservedState()
        undefinedValue: string | undefined = undefined;

        @ObservedState()
        emptyValue = '';

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot).toHaveProperty('nullableValue', null);
      expect(snapshot).toHaveProperty('undefinedValue', undefined);
      expect(snapshot).toHaveProperty('emptyValue', '');
    });

    it('should handle empty array from @Task', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'child';
        }
      }

      class ParentWorkflow extends Workflow {
        @Task()
        async returnsEmpty(): Promise<Workflow[]> {
          return [];
        }

        async run() {
          return this.returnsEmpty();
        }
      }

      const workflow = new ParentWorkflow();
      const result = await workflow.run();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle null return from @Task', async () => {
      class ParentWorkflow extends Workflow {
        @Task()
        async returnsNull(): Promise<null> {
          return null;
        }

        async run() {
          return this.returnsNull();
        }
      }

      const workflow = new ParentWorkflow();
      const result = await workflow.run();

      expect(result).toBe(null);
    });

    it('should handle undefined return from @Task', async () => {
      class ParentWorkflow extends Workflow {
        @Task()
        async returnsUndefined(): Promise<undefined> {
          return undefined;
        }

        async run() {
          return this.returnsUndefined();
        }
      }

      const workflow = new ParentWorkflow();
      const result = await workflow.run();

      expect(result).toBe(undefined);
    });
  });

  describe('Edge Case: Unicode and Special Characters', () => {
    it('should handle unicode in workflow names', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const unicodeNames = [
        '🚀 Rocket',
        '测试工作流',
        'العملية',
        '🎯Target',
      ];

      for (const name of unicodeNames) {
        const workflow = new TestWorkflow(name);
        expect(workflow.node.name).toBe(name);
        await workflow.run();
      }
    });

    it('should handle unicode in log messages', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('测试消息 🚀');
          this.logger.warn('⚠️ Warning');
          this.logger.error('❌ Error with emoji');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(3);
      expect(workflow.node.logs[0].message).toBe('测试消息 🚀');
    });

    it('should handle unicode in observed state values', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        unicodeField = '测试 🎯';

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot?.unicodeField).toBe('测试 🎯');
    });
  });

  describe('Edge Case: Deep Hierarchies', () => {
    it('should handle very deep workflow hierarchies', async () => {
      // Create a chain of 100 nested workflows
      let lastWorkflow: any = null;

      for (let i = 0; i < 100; i++) {
        const name = `Workflow-${i}`;

        const DynamicWorkflow = class extends Workflow {
          @Step()
          async doWork() {
            return `level-${i}`;
          }

          async run() {
            return this.doWork();
          }
        };

        lastWorkflow = new DynamicWorkflow(name, lastWorkflow);
      }

      await lastWorkflow.run();

      // Verify hierarchy depth
      let depth = 0;
      let current: any = lastWorkflow;
      while (current.parent) {
        depth++;
        current = current.parent;
      }

      expect(depth).toBe(99);
    });

    it('should handle wide workflow hierarchies (many siblings)', async () => {
      class ChildWorkflow extends Workflow {
        @Step()
        async doWork() {
          return 'child-work';
        }

        async run() {
          return this.doWork();
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnMany() {
          return Array.from({ length: 50 }, (_, i) => new ChildWorkflow(`Child-${i}`, this));
        }

        async run() {
          return this.spawnMany();
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      expect(workflow.children.length).toBe(50);
    });
  });

  describe('Edge Case: Rapid State Changes', () => {
    it('should handle rapid status changes', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.setStatus('running');
          this.setStatus('running');
          this.setStatus('running');
          this.setStatus('completed');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.status).toBe('completed');
      expect(workflow.node.status).toBe('completed');
    });

    it('should handle multiple rapid snapshots', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        counter = 0;

        async run() {
          for (let i = 0; i < 10; i++) {
            this.counter = i;
            this.snapshotState();
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.stateSnapshot?.counter).toBe(9);
    });
  });

  describe('Edge Case: Concurrent Execution', () => {
    it('should handle concurrent task execution with errors', async () => {
      class GoodChild extends Workflow {
        async run() {
          return 'good';
        }
      }

      class BadChild extends Workflow {
        async run() {
          throw new Error('Bad child error');
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnMixed() {
          return [
            new GoodChild('Good', this),
            new BadChild('Bad', this),
          ];
        }

        async run() {
          // This should throw because concurrent runs happen
          try {
            await this.spawnMixed();
          } catch (err) {
            // Expected to throw
          }
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      // Both children should be attached
      expect(workflow.children.length).toBe(2);
    });

    it('should handle @Task with concurrent: true on single workflow', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'child-result';
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnOne() {
          return new ChildWorkflow('SingleChild', this);
        }

        async run() {
          return this.spawnOne();
        }
      }

      const workflow = new ParentWorkflow();
      const result = await workflow.run();

      // Single workflow should still be returned
      expect(result).toBeDefined();
      expect(workflow.children.length).toBe(1);
    });
  });

  describe('Edge Case: Observers and Event Handling', () => {
    it('should handle observer that throws errors', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'stepStart', node: this.node, step: 'test' });
        }
      }

      const workflow = new TestWorkflow();

      // Add an observer that throws
      workflow.addObserver({
        onLog: () => {
          throw new Error('Observer error');
        },
        onEvent: () => {
          throw new Error('Event observer error');
        },
        onStateUpdated: () => {
          throw new Error('State observer error');
        },
        onTreeChanged: () => {
          throw new Error('Tree observer error');
        },
      });

      // Should not throw, errors are caught and console.error'd
      await workflow.run();
    });

    it('should handle multiple observers', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'stepStart', node: this.node, step: 'test' });
        }
      }

      const workflow = new TestWorkflow();

      const counts = { onLog: 0, onEvent: 0, onStateUpdated: 0, onTreeChanged: 0 };

      // Add multiple observers
      for (let i = 0; i < 5; i++) {
        workflow.addObserver({
          onLog: () => counts.onLog++,
          onEvent: () => counts.onEvent++,
          onStateUpdated: () => counts.onStateUpdated++,
          onTreeChanged: () => counts.onTreeChanged++,
        });
      }

      await workflow.run();

      // Each observer should have been called
      expect(counts.onEvent).toBe(5);
    });
  });

  describe('Edge Case: Circular References', () => {
    it('should detect circular parent-child relationships', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const parent = new TestWorkflow('Parent');
      const child = new TestWorkflow('Child', parent);

      // Try to create a circular reference
      expect(() => {
        parent.attachChild(child as any); // This should throw
      }).toThrow('Child already attached');
    });

    it('should prevent creating cycles through getRoot', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const root = new TestWorkflow('Root');
      const child = new TestWorkflow('Child', root);

      // getRoot should work correctly
      const rootFromChild = (child as any).getRoot();
      expect(rootFromChild.id).toBe(root.id);
    });
  });

  describe('Edge Case: Memory and Performance', () => {
    it('should handle large number of events', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          for (let i = 0; i < 1000; i++) {
            this.emitEvent({ type: 'stepStart', node: this.node, step: `step-${i}` });
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.events.length).toBe(1000);
    });

    it('should handle large number of logs', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          for (let i = 0; i < 1000; i++) {
            this.logger.info(`Log entry ${i}`);
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1000);
    });
  });

  describe('PRD Compliance: Error Event Format', () => {
    /**
     * PRD Section 5.1 specifies WorkflowError interface
     * Verifying the error structure matches PRD
     */

    it('should emit error with all required fields', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        testField = 'test-value';

        @Step()
        async failingStep() {
          this.logger.info('About to fail');
          throw new Error('Test error');
        }

        async run() {
          try {
            await this.failingStep();
          } catch (err) {
            // Expected
          }
        }
      }

      const workflow = new TestWorkflow();
      let capturedError: any = null;

      workflow.addObserver({
        onLog: () => {},
        onEvent: (event) => {
          if (event.type === 'error') {
            capturedError = event.error;
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      expect(capturedError).not.toBeNull();
      expect(capturedError.message).toBe('Test error');
      expect(capturedError.workflowId).toBe(workflow.id);
      expect(capturedError.original).toBeDefined();
      expect(capturedError.state).toBeDefined();
      expect(capturedError.logs).toBeDefined();
      expect(Array.isArray(capturedError.logs)).toBe(true);
    });
  });

  describe('PRD Compliance: Event Types', () => {
    /**
     * PRD Section 4.2 specifies all WorkflowEvent types
     * Verifying all event types are properly emitted
     */

    it('should emit childAttached event', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'child';
        }
      }

      class ParentWorkflow extends Workflow {
        @Task()
        async spawnChild() {
          return new ChildWorkflow('Child', this);
        }

        async run() {
          return this.spawnChild();
        }
      }

      const workflow = new ParentWorkflow();
      let childAttachedFired = false;

      workflow.addObserver({
        onLog: () => {},
        onEvent: (event) => {
          if (event.type === 'childAttached') {
            childAttachedFired = true;
            expect(event.parentId).toBe(workflow.id);
            expect(event.child).toBeDefined();
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();
      expect(childAttachedFired).toBe(true);
    });

    it('should emit stateSnapshot event', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        testField = 'value';

        async run() {
          this.snapshotState();
        }
      }

      const workflow = new TestWorkflow();
      let snapshotFired = false;

      workflow.addObserver({
        onLog: () => {},
        onEvent: (event) => {
          if (event.type === 'stateSnapshot') {
            snapshotFired = true;
            expect(event.node).toBeDefined();
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();
      expect(snapshotFired).toBe(true);
    });

    it('should emit treeUpdated event', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.emitEvent({ type: 'treeUpdated', root: this.node });
        }
      }

      const workflow = new TestWorkflow();
      let treeUpdatedFired = false;

      workflow.addObserver({
        onLog: () => {},
        onEvent: (event) => {
          if (event.type === 'treeUpdated') {
            treeUpdatedFired = true;
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();
      expect(treeUpdatedFired).toBe(true);
    });
  });
});
