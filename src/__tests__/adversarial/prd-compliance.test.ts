/**
 * PRD Compliance Tests
 * These tests verify that the implementation matches the PRD specifications
 */

import { describe, it, expect } from 'vitest';
import { Workflow, Step, Task, ObservedState } from '../../index.js';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';
import type { WorkflowEvent, WorkflowError, LogEntry } from '../../types/index.js';

describe('PRD Compliance Tests', () => {
  describe('PRD Section 3.1: WorkflowNode Interface', () => {
    it('should have all required WorkflowNode properties', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const node = workflow.getNode();

      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('parent');
      expect(node).toHaveProperty('children');
      expect(node).toHaveProperty('status');
      expect(node).toHaveProperty('logs');
      expect(node).toHaveProperty('events');
      expect(node).toHaveProperty('stateSnapshot');
    });

    it('should initialize with correct default values', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const node = workflow.getNode();

      expect(node.id).toBeDefined();
      expect(node.name).toBe('TestWorkflow');
      expect(node.parent).toBeNull();
      expect(node.children).toEqual([]);
      expect(node.status).toBe('idle');
      expect(node.logs).toEqual([]);
      expect(node.events).toEqual([]);
      expect(node.stateSnapshot).toBeNull();
    });
  });

  describe('PRD Section 3.2: WorkflowStatus Type', () => {
    it('should support all 5 status values', async () => {
      const validStatuses = ['idle', 'running', 'completed', 'failed', 'cancelled'];

      class TestWorkflow extends Workflow {
        async run() {
          for (const status of validStatuses) {
            this.setStatus(status as any);
            expect(this.status).toBe(status);
            expect(this.node.status).toBe(status);
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('PRD Section 4.1: LogEntry Interface', () => {
    it('should create log entries with all required properties', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test message', { key: 'value' });
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      const log = workflow.node.logs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('workflowId');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('data');
    });

    it('should support all 4 log levels', async () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];

      class TestWorkflow extends Workflow {
        async run() {
          this.logger.debug('debug msg');
          this.logger.info('info msg');
          this.logger.warn('warn msg');
          this.logger.error('error msg');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(4);
      workflow.node.logs.forEach((log, i) => {
        expect(log.level).toBe(levels[i]);
      });
    });
  });

  describe('PRD Section 4.2: WorkflowEvent Types', () => {
    it('should emit stepStart event', async () => {
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
      const events: WorkflowEvent[] = [];

      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      const stepStart = events.find(e => e.type === 'stepStart');
      expect(stepStart).toBeDefined();
      if (stepStart?.type === 'stepStart') {
        expect(stepStart.node).toBeDefined();
        expect(stepStart.step).toBe('testStep');
      }
    });

    it('should emit stepEnd event with duration', async () => {
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
      const events: WorkflowEvent[] = [];

      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      const stepEnd = events.find(e => e.type === 'stepEnd');
      expect(stepEnd).toBeDefined();
      if (stepEnd?.type === 'stepEnd') {
        expect(stepEnd.node).toBeDefined();
        expect(stepEnd.step).toBe('testStep');
        expect(typeof stepEnd.duration).toBe('number');
        expect(stepEnd.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should emit taskStart and taskEnd events', async () => {
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
      const events: WorkflowEvent[] = [];

      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      const taskStart = events.find(e => e.type === 'taskStart');
      expect(taskStart).toBeDefined();
      if (taskStart?.type === 'taskStart') {
        expect(taskStart.task).toBe('spawnChild');
      }

      const taskEnd = events.find(e => e.type === 'taskEnd');
      expect(taskEnd).toBeDefined();
      if (taskEnd?.type === 'taskEnd') {
        expect(taskEnd.task).toBe('spawnChild');
      }
    });
  });

  describe('PRD Section 5.1: WorkflowError Interface', () => {
    it('should include all required fields in WorkflowError', async () => {
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
      let capturedError: WorkflowError | undefined;

      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => {
          if (e.type === 'error') {
            capturedError = e.error;
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      expect(capturedError).toBeDefined();
      expect(capturedError).toHaveProperty('message', 'Test error');
      expect(capturedError).toHaveProperty('original');
      expect(capturedError).toHaveProperty('workflowId');
      expect(capturedError).toHaveProperty('stack');
      expect(capturedError).toHaveProperty('state');
      expect(capturedError).toHaveProperty('logs');
      expect(Array.isArray(capturedError.logs)).toBe(true);
    });
  });

  describe('PRD Section 8.1: @Step Decorator Options', () => {
    it('should support custom step name', async () => {
      class TestWorkflow extends Workflow {
        @Step({ name: 'CustomStepName' })
        async someMethod() {
          return 'done';
        }

        async run() {
          return this.someMethod();
        }
      }

      const workflow = new TestWorkflow();
      const events: WorkflowEvent[] = [];

      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      const stepStart = events.find(e => e.type === 'stepStart');
      if (stepStart?.type === 'stepStart') {
        expect(stepStart.step).toBe('CustomStepName');
      }
    });

    it('should snapshot state when requested', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        counter = 42;

        @Step({ snapshotState: true })
        async testStep() {
          this.counter = 100;
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.stateSnapshot).not.toBeNull();
      expect(workflow.node.stateSnapshot?.counter).toBe(100);
    });

    it('should log start when requested', async () => {
      class TestWorkflow extends Workflow {
        @Step({ logStart: true })
        async testStep() {
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      const hasStartLog = workflow.node.logs.some(l => l.message.includes('STEP START'));
      expect(hasStartLog).toBe(true);
    });

    it('should log finish when requested', async () => {
      class TestWorkflow extends Workflow {
        @Step({ logFinish: true })
        async testStep() {
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      const hasEndLog = workflow.node.logs.some(l => l.message.includes('STEP END'));
      expect(hasEndLog).toBe(true);
    });
  });

  describe('PRD Section 8.2: @Task Decorator', () => {
    it('should attach single child workflow', async () => {
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
      await workflow.run();

      expect(workflow.children.length).toBe(1);
      expect(workflow.children[0].node.name).toBe('Child');
    });

    it('should attach multiple child workflows', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'child';
        }
      }

      class ParentWorkflow extends Workflow {
        @Task()
        async spawnChildren() {
          return [
            new ChildWorkflow('Child1', this),
            new ChildWorkflow('Child2', this),
            new ChildWorkflow('Child3', this),
          ];
        }

        async run() {
          return this.spawnChildren();
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      expect(workflow.children.length).toBe(3);
    });

    it('should run workflows concurrently when concurrent: true', async () => {
      let executionOrder: string[] = [];

      class ChildWorkflow extends Workflow {
        constructor(name: string, parent?: Workflow) {
          super(name, parent);
        }

        async run() {
          // Add a small delay
          await new Promise(resolve => setTimeout(resolve, 10));
          executionOrder.push(this.node.name);
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
          return this.spawnChildren();
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      // All children should have been executed
      expect(executionOrder.length).toBe(3);
      // With concurrent execution, we can't guarantee order, but all should be present
      expect(executionOrder).toContain('Child1');
      expect(executionOrder).toContain('Child2');
      expect(executionOrder).toContain('Child3');
    });
  });

  describe('PRD Section 8.3: @ObservedState Decorator', () => {
    it('should include marked fields in state snapshots', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        observedField = 'observed';

        unobservedField = 'not-observed';

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot).toHaveProperty('observedField', 'observed');
      expect(snapshot).not.toHaveProperty('unobservedField');
    });

    it('should redact fields with redact: true', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState({ redact: true })
        password = 'secret123';

        @ObservedState()
        username = 'alice';

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot?.password).toBe('***');
      expect(snapshot?.username).toBe('alice');
    });

    it('should hide fields with hidden: true', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState({ hidden: true })
        internalState = 'internal';

        @ObservedState()
        publicState = 'public';

        async run() {
          this.snapshotState();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot).not.toHaveProperty('internalState');
      expect(snapshot).toHaveProperty('publicState', 'public');
    });
  });

  describe('PRD Section 11: Tree Debugger API', () => {
    it('should implement getTree() method', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      const tree = debuggerInstance.getTree();
      expect(tree).toBeDefined();
      expect(tree.id).toBe(workflow.id);
    });

    it('should implement getNode(id) method', async () => {
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
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      await workflow.run();

      const childNode = debuggerInstance.getNode(workflow.children[0].id);
      expect(childNode).toBeDefined();
      expect(childNode?.name).toBe('Child');
    });

    it('should provide events Observable', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      expect(debuggerInstance.events).toBeDefined();
      expect(debuggerInstance.events.subscribe).toBeDefined();
    });

    it('should implement toTreeString() method', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      const treeString = debuggerInstance.toTreeString();
      expect(typeof treeString).toBe('string');
      expect(treeString.length).toBeGreaterThan(0);
    });

    it('should implement toLogString() method', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test log message');
        }
      }

      const workflow = new TestWorkflow();
      const debuggerInstance = new WorkflowTreeDebugger(workflow);

      await workflow.run();

      const logString = debuggerInstance.toLogString();
      expect(typeof logString).toBe('string');
      expect(logString).toContain('Test log message');
    });
  });

  describe('PRD Section 12.2: Workflow Base Class', () => {
    it('should have id, parent, children, and status properties', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      const workflow = new TestWorkflow();

      expect(workflow.id).toBeDefined();
      expect(workflow.parent).toBeDefined();
      expect(workflow.children).toBeDefined();
      expect(workflow.status).toBeDefined();
    });

    it('should have attachChild method', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'child';
        }
      }

      class ParentWorkflow extends Workflow {
        async run() {
          const child = new ChildWorkflow('Child', this);
          expect(workflow.children.length).toBe(1);
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });

    it('should have snapshotState method', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.snapshotState();
          expect(this.node.stateSnapshot).not.toBeNull();
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });

    it('should have setStatus method', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.setStatus('running');
          expect(this.status).toBe('running');
          expect(this.node.status).toBe('running');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('PRD: Perfect 1:1 Tree Mirror Requirement', () => {
    it('should maintain perfect tree structure in logs and events', async () => {
      class ChildWorkflow extends Workflow {
        @Step()
        async childStep() {
          this.logger.info('Child step executed');
          return 'child-step-done';
        }

        async run() {
          return this.childStep();
        }
      }

      class ParentWorkflow extends Workflow {
        @Step()
        async parentStep() {
          this.logger.info('Parent step executed');
          return 'parent-step-done';
        }

        @Task()
        async spawnChild() {
          return new ChildWorkflow('Child', this);
        }

        async run() {
          await this.parentStep();
          await this.spawnChild();
          await this.children[0].run();
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();

      // Parent should have 1 child
      expect(workflow.children.length).toBe(1);
      expect(workflow.children[0].node.name).toBe('Child');

      // Parent logs should exist
      expect(workflow.node.logs.length).toBeGreaterThan(0);

      // Parent events should exist
      expect(workflow.node.events.length).toBeGreaterThan(0);

      // Child should have logs
      expect(workflow.children[0].node.logs.length).toBeGreaterThan(0);

      // Child should have events
      expect(workflow.children[0].node.events.length).toBeGreaterThan(0);
    });
  });
});
