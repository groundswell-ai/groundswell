/**
 * End-to-End PRD Validation Tests
 * Creative testing of actual implementation against PRD requirements
 */

import { describe, it, expect } from 'vitest';
import { Workflow, Step, Task, ObservedState } from '../../index.js';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';
import type { WorkflowEvent, WorkflowError } from '../../types/index.js';

describe('End-to-End PRD Validation', () => {
  describe('PRD Example from Section 13', () => {
    // PRD provides an example TDD workflow - let's test it exactly
    it('should support the exact TDD workflow example from PRD', async () => {
      class TestCycleWorkflow extends Workflow {
        @ObservedState()
        currentTest!: string;

        @Step({ snapshotState: true })
        async generateTest() {
          this.currentTest = 'test-example';
          return 'generated';
        }

        @Step()
        async runTest() {
          this.logger.info('Running test');
          return 'passed';
        }

        @Step()
        async updateImplementation() {
          return 'updated';
        }

        async run() {
          await this.generateTest();
          await this.runTest();
          await this.updateImplementation();
        }
      }

      class TDDOrchestrator extends Workflow {
        @Step({ logStart: true })
        async setupEnvironment() {
          this.logger.info('Environment setup complete');
        }

        @Task()
        async runCycle() {
          return new TestCycleWorkflow('Cycle', this);
        }

        async run() {
          await this.setupEnvironment();
          await this.runCycle();
          await this.children[0].run();
        }
      }

      const workflow = new TDDOrchestrator();
      await workflow.run();

      // Verify hierarchy
      expect(workflow.children.length).toBe(1);
      expect(workflow.children[0].node.name).toBe('Cycle');

      // Verify state was captured
      expect(workflow.children[0].node.stateSnapshot).not.toBeNull();
      expect(workflow.children[0].node.stateSnapshot?.currentTest).toBe('test-example');
    });
  });

  describe('PRD: Restart Semantics - Error Analysis', () => {
    it('should capture error state for parent restart decision', async () => {
      let capturedError: WorkflowError | undefined;

      class ChildWorkflow extends Workflow {
        @ObservedState()
        attemptCount = 0;

        @Step()
        async failingOperation() {
          this.attemptCount++;
          this.logger.info(`Attempt ${this.attemptCount}`);
          if (this.attemptCount < 3) {
            throw new Error('Not ready yet');
          }
          return 'success';
        }

        async run() {
          return this.failingOperation();
        }
      }

      class ParentWorkflow extends Workflow {
        @Task()
        async spawnChild() {
          return new ChildWorkflow('Child', this);
        }

        async run() {
          await this.spawnChild();

          // Subscribe to errors for restart logic
          this.addObserver({
            onLog: () => {},
            onEvent: (e) => {
              if (e.type === 'error') {
                capturedError = e.error;
              }
            },
            onStateUpdated: () => {},
            onTreeChanged: () => {},
          });

          try {
            await this.children[0].run();
          } catch (err) {
            // Analyze error and state for restart decision
            expect(capturedError).toBeDefined();
            expect(capturedError!.state.attemptCount).toBeGreaterThan(0);
            expect(capturedError!.logs.length).toBeGreaterThan(0);

            // Could decide to retry based on capturedError.state
            // For this test, we just verified the error has all needed info
          }
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });
  });

  describe('PRD: @Step trackTiming default behavior', () => {
    it('should track timing by default when not specified (true by default)', async () => {
      const events: WorkflowEvent[] = [];

      class TestWorkflow extends Workflow {
        @Step() // No options - should default to trackTiming: true
        async testStep() {
          return 'done';
        }

        async run() {
          return this.testStep();
        }
      }

      const workflow = new TestWorkflow();
      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      const stepEndEvent = events.find(e => e.type === 'stepEnd');
      expect(stepEndEvent).toBeDefined();
      if (stepEndEvent?.type === 'stepEnd') {
        expect(typeof stepEndEvent.duration).toBe('number');
        expect(stepEndEvent.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('PRD: Tree Debugger API Completeness', () => {
    it('should implement all required methods from WorkflowTreeDebugger', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          this.logger.info('Test log');
        }
      }

      const workflow = new TestWorkflow();
      const treeDebugger = new WorkflowTreeDebugger(workflow);

      // Test getTree()
      const tree = treeDebugger.getTree();
      expect(tree).toBeDefined();
      expect(tree.id).toBe(workflow.id);

      // Test getNode()
      const node = treeDebugger.getNode(workflow.id);
      expect(node).toBeDefined();
      expect(node!.id).toBe(workflow.id);

      // Test events observable
      expect(treeDebugger.events).toBeDefined();
      expect(typeof treeDebugger.events.subscribe).toBe('function');

      // Test toTreeString()
      const treeString = treeDebugger.toTreeString();
      expect(typeof treeString).toBe('string');
      expect(treeString.length).toBeGreaterThan(0);

      // Test toLogString()
      await workflow.run();
      const logString = treeDebugger.toLogString();
      expect(typeof logString).toBe('string');
      expect(logString).toContain('Test log');
    });
  });

  describe('PRD: WorkflowError Complete Structure', () => {
    it('should include all required fields per PRD Section 5.1', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        contextData = 'important';

        @Step()
        async failingStep() {
          this.logger.info('About to fail');
          throw new Error('Intentional failure');
        }

        async run() {
          try {
            await this.failingStep();
          } catch (err) {
            const wfError = err as WorkflowError;

            // Verify all required fields from PRD Section 5.1
            expect(wfError.message).toBe('Intentional failure');
            expect(wfError.original).toBeDefined();
            expect(wfError.workflowId).toBeDefined();
            expect(wfError.stack).toBeDefined();
            expect(wfError.state).toBeDefined();
            expect(wfError.logs).toBeDefined();
            expect(Array.isArray(wfError.logs)).toBe(true);
            expect(wfError.state.contextData).toBe('important');
            expect(wfError.logs.some(l => l.message.includes('About to fail'))).toBe(true);
          }
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();
    });
  });

  describe('PRD: Root-Only Observer Restriction', () => {
    it('should only allow observers on root workflow', async () => {
      class ChildWorkflow extends Workflow {
        async run() {
          return 'done';
        }
      }

      class ParentWorkflow extends Workflow {
        async run() {
          const child = new ChildWorkflow('Child', this);

          // Should throw when trying to add observer to non-root
          expect(() => {
            child.addObserver({
              onLog: () => {},
              onEvent: () => {},
              onStateUpdated: () => {},
              onTreeChanged: () => {},
            });
          }).toThrow('Observers can only be added to root workflows');
        }
      }

      const workflow = new ParentWorkflow();
      await workflow.run();
    });
  });

  describe('PRD: Step Snapshot Timing', () => {
    it('should snapshot state AFTER step completion', async () => {
      class TestWorkflow extends Workflow {
        @ObservedState()
        value = 'before';

        @Step({ snapshotState: true })
        async changeAndSnapshot() {
          this.value = 'after';
          // Snapshot should capture 'after' since it's after step completion
          return 'done';
        }

        async run() {
          await this.changeAndSnapshot();
          return this.node.stateSnapshot;
        }
      }

      const workflow = new TestWorkflow();
      const snapshot = await workflow.run();

      expect(snapshot?.value).toBe('after');
    });
  });

  describe('Creative: Real-world TDD Workflow Scenario', () => {
    it('should handle realistic test-driven development cycle', async () => {
      const testResults: string[] = [];

      class TestWorkflow extends Workflow {
        @ObservedState()
        testName = '';

        @ObservedState()
        passed = false;

        @Step({ logStart: true, logFinish: true })
        async writeTest(testName: string) {
          this.testName = testName;
          this.logger.info(`Writing test: ${testName}`);
        }

        @Step({ trackTiming: true })
        async runTest() {
          this.logger.info('Running test...');
          // Simulate test failure
          this.passed = false;
          throw new Error('Test failed: Implementation missing');
        }

        @Step()
        async writeCode() {
          this.logger.info('Writing implementation...');
          this.passed = true;
        }

        async run(testName: string) {
          await this.writeTest(testName);
          try {
            await this.runTest();
          } catch (err) {
            // Test failed - write code
            await this.writeCode();
            // Retry test
            this.passed = true;
          }
        }
      }

      class Orchestrator extends Workflow {
        @Task()
        async runTestCycle(testName: string) {
          return new TestWorkflow('TestCycle', this);
        }

        async run() {
          const testNames = ['shouldAdd', 'shouldSubtract', 'shouldMultiply'];

          for (const name of testNames) {
            await this.runTestCycle(name);
            const testWf = this.children[this.children.length - 1];
            await testWf.run(name);
            testResults.push(`${name}:${testWf.node.status}`);
          }
        }
      }

      const workflow = new Orchestrator();
      await workflow.run();

      expect(workflow.children.length).toBe(3);
      expect(testResults.length).toBe(3);
    });
  });

  describe('Creative: Nested Error Propagation', () => {
    it('should properly handle errors at multiple hierarchy levels', async () => {
      const errorsAtLevel: { level: string; error: string }[] = [];

      class Level3Workflow extends Workflow {
        @ObservedState()
        level = 3;

        @Step()
        async doWork() {
          throw new Error('Level 3 error');
        }

        async run() {
          return this.doWork();
        }
      }

      class Level2Workflow extends Workflow {
        @ObservedState()
        level = 2;

        @Task()
        async spawnLevel3() {
          return new Level3Workflow('Level3', this);
        }

        async run() {
          await this.spawnLevel3();
          try {
            await this.children[0].run();
          } catch (err) {
            errorsAtLevel.push({ level: '2', error: (err as any).message });
            throw new Error('Level 2 wrapper error');
          }
        }
      }

      class Level1Workflow extends Workflow {
        @ObservedState()
        level = 1;

        @Task()
        async spawnLevel2() {
          return new Level2Workflow('Level2', this);
        }

        async run() {
          await this.spawnLevel2();
          try {
            await this.children[0].run();
          } catch (err) {
            errorsAtLevel.push({ level: '1', error: (err as any).message });
          }
        }
      }

      const workflow = new Level1Workflow();

      // Add observer to capture all errors
      workflow.addObserver({
        onLog: () => {},
        onEvent: (e) => {
          if (e.type === 'error') {
            errorsAtLevel.push({ level: 'observer', error: e.error.message });
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await workflow.run();

      // Should have captured errors at multiple levels
      expect(errorsAtLevel.length).toBeGreaterThan(0);
    });
  });
});
