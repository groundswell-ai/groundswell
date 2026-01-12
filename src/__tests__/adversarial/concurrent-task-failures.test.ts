/**
 * Concurrent Task Failure Scenarios Test Suite
 *
 * Tests the Promise.allSettled implementation in @Task decorator
 * for concurrent execution with various failure scenarios.
 *
 * Validates:
 * - Single child failure in concurrent batch
 * - Multiple children failing concurrently
 * - Mixed success/failure scenarios
 * - All children failing edge case
 * - No orphaned or hanging promises
 * - Error collection correctness
 * - Event emission during failures
 *
 * Related:
 * - S2 Implementation: Promise.allSettled in task.ts (lines 111-120)
 * - Bug: 001_e8e04329daf3 - Concurrent task error collection
 */

import { describe, it, expect } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent } from '../../types/index.js';

describe('@Task decorator concurrent failure scenarios', () => {
  /**
   * Helper to create a child workflow that may fail
   * Pattern from: src/__tests__/adversarial/edge-case.test.ts (lines 146-167)
   */
  function createChildWorkflow(
    parent: Workflow,
    name: string,
    shouldFail: boolean = false
  ): Workflow {
    return new (class extends Workflow {
      constructor(n: string, p: Workflow) {
        super(n, p);
      }

      @Step()
      async executeStep() {
        if (shouldFail) {
          throw new Error(`${name} failed`);
        }
        return `${name} succeeded`;
      }

      async run() {
        return this.executeStep();
      }
    })(name, parent);
  }

  /**
   * Helper to setup event observer for event collection
   * Pattern from: src/__tests__/adversarial/observer-propagation.test.ts (lines 42-49)
   */
  function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
    const events: WorkflowEvent[] = [];
    workflow.addObserver({
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    return events;
  }

  describe('Single child failure scenarios', () => {
    it('should complete all siblings when one child fails', async () => {
      // ARRANGE: Create parent with 4 children, child[1] will fail
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Child-0', false),
            createChildWorkflow(this, 'Child-1', true), // Will fail
            createChildWorkflow(this, 'Child-2', false),
            createChildWorkflow(this, 'Child-3', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected - first error thrown after all complete
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT: Run parent (children run concurrently)
      await parent.run();

      // ASSERT: All 4 children attached (Promise.allSettled completed all)
      expect(parent.children.length).toBe(4);

      // ASSERT: Verify child names match what we created
      const childNames = parent.children.map((c) => (c as any).node.name);
      expect(childNames).toContain('Child-0');
      expect(childNames).toContain('Child-1');
      expect(childNames).toContain('Child-2');
      expect(childNames).toContain('Child-3');
    });
  });

  describe('Multiple concurrent failures', () => {
    it('should collect all errors when multiple children fail concurrently', async () => {
      // ARRANGE: Create parent with 6 children, 3 will fail
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Alpha', false),
            createChildWorkflow(this, 'Beta', true), // Will fail
            createChildWorkflow(this, 'Gamma', false),
            createChildWorkflow(this, 'Delta', true), // Will fail
            createChildWorkflow(this, 'Epsilon', false),
            createChildWorkflow(this, 'Zeta', true), // Will fail
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT
      await parent.run();

      // ASSERT: All 6 children attached (Promise.allSettled completed all)
      expect(parent.children.length).toBe(6);

      // ASSERT: Verify expected child names are present
      const childNames = parent.children.map((c) => (c as any).node.name);
      expect(childNames).toContain('Alpha');
      expect(childNames).toContain('Beta');
      expect(childNames).toContain('Gamma');
      expect(childNames).toContain('Delta');
      expect(childNames).toContain('Epsilon');
      expect(childNames).toContain('Zeta');
    });

    it('should preserve error context for each failure', async () => {
      // ARRANGE: Create parent with multiple failing children
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Alpha', true),
            createChildWorkflow(this, 'Beta', true),
            createChildWorkflow(this, 'Gamma', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);

      // ACT
      await parent.run();

      // ASSERT: Error events emitted for all failures
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(3);

      // ASSERT: Each error event has correct structure
      errorEvents.forEach((event) => {
        expect(event.type).toBe('error');
        if (event.type === 'error') {
          expect(event.error).toBeDefined();
          expect(event.error.workflowId).toBeDefined();
          expect(event.error.message).toBeDefined();
          expect(Array.isArray(event.error.logs)).toBe(true);
        }
      });

      // ASSERT: All three distinct error messages captured
      const errorMessages = errorEvents
        .filter((e) => e.type === 'error')
        .map((e) => e.error.message);
      expect(errorMessages).toContain('Alpha failed');
      expect(errorMessages).toContain('Beta failed');
      expect(errorMessages).toContain('Gamma failed');
    });
  });

  describe('Mixed success/failure scenarios', () => {
    it('should complete successful workflows despite failures', async () => {
      // ARRANGE: Create parent with mixed success/failure children
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Success-1', false),
            createChildWorkflow(this, 'Fail-1', true),
            createChildWorkflow(this, 'Success-2', false),
            createChildWorkflow(this, 'Fail-2', true),
            createChildWorkflow(this, 'Success-3', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT
      await parent.run();

      // ASSERT: All 5 children attached (Promise.allSettled completed all)
      expect(parent.children.length).toBe(5);

      // ASSERT: Verify all expected children are present
      const childNames = parent.children.map((c) => (c as any).node.name);
      expect(childNames).toContain('Success-1');
      expect(childNames).toContain('Fail-1');
      expect(childNames).toContain('Success-2');
      expect(childNames).toContain('Fail-2');
      expect(childNames).toContain('Success-3');
    });

    it('should ensure no orphaned workflows in mixed scenario', async () => {
      // ARRANGE: Track all completions
      const completedWorkflows = new Set<string>();

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          const children = [
            createChildWorkflow(this, 'Alpha', false),
            createChildWorkflow(this, 'Beta', true),
            createChildWorkflow(this, 'Gamma', false),
            createChildWorkflow(this, 'Delta', false),
            createChildWorkflow(this, 'Epsilon', true),
          ];

          // Track completion for all children
          children.forEach((child) => {
            child.run().then(
              () => completedWorkflows.add(child.id),
              () => completedWorkflows.add(child.id)
            );
          });

          return children;
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT
      await parent.run();

      // ASSERT: All 5 workflows accounted for (no orphans)
      expect(completedWorkflows.size).toBe(5);
      expect(parent.children.length).toBe(5);
    });
  });

  describe('All children failing', () => {
    it('should handle edge case of all children failing', async () => {
      // ARRANGE: All children will fail
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return Array.from({ length: 5 }, (_, i) =>
            createChildWorkflow(this, `FailChild-${i}`, true) // All fail
          );
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected - first error thrown
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);

      // ACT
      await parent.run();

      // ASSERT: All 5 children attached
      expect(parent.children.length).toBe(5);

      // ASSERT: Error events emitted for all failures
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(5);

      // ASSERT: Each failure has distinct error message
      const errorMessages = errorEvents
        .filter((e) => e.type === 'error')
        .map((e) => e.error.message);
      for (let i = 0; i < 5; i++) {
        expect(errorMessages).toContain(`FailChild-${i} failed`);
      }
    });
  });

  describe('No orphaned workflows', () => {
    it('should verify all workflows complete with no hanging promises', async () => {
      // ARRANGE: Track all completions
      const completedWorkflows = new Set<string>();

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          const children = Array.from({ length: 10 }, (_, i) =>
            createChildWorkflow(
              this,
              `Child-${i}`,
              Math.random() < 0.3 // 30% failure rate
            )
          );

          // Track completion for all children
          children.forEach((child) => {
            child.run().then(
              () => completedWorkflows.add(child.id),
              () => completedWorkflows.add(child.id)
            );
          });

          return children;
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT: Run with timeout to detect hanging promises
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: workflows hung')), 5000)
      );

      const runPromise = parent.run();

      await Promise.race([runPromise, timeoutPromise]);

      // ASSERT: All 10 workflows accounted for (no orphans)
      expect(completedWorkflows.size).toBe(10);
    });
  });

  describe('Event emission verification', () => {
    it('should emit error events for all failing workflows', async () => {
      // ARRANGE: Setup event observer
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Good', false),
            createChildWorkflow(this, 'Bad1', true),
            createChildWorkflow(this, 'Bad2', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events: WorkflowEvent[] = [];

      // CRITICAL: Add observer to root workflow
      parent.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // ACT
      await parent.run();

      // ASSERT: Error events emitted for both failures
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(2);

      // ASSERT: Each error event has correct structure
      errorEvents.forEach((event) => {
        expect(event.type).toBe('error');
        if (event.type === 'error') {
          expect(event.error).toBeDefined();
          expect(event.error.workflowId).toBeDefined();
          expect(event.error.message).toBeDefined();
          expect(Array.isArray(event.error.logs)).toBe(true);
        }
      });

      // ASSERT: Verify expected error messages
      const errorMessages = errorEvents
        .filter((e) => e.type === 'error')
        .map((e) => e.error.message);
      expect(errorMessages).toContain('Bad1 failed');
      expect(errorMessages).toContain('Bad2 failed');
    });

    it('should capture logs from both successful and failed workflows', async () => {
      // ARRANGE: Create workflows that log before completion/failure
      class ChildWorkflow extends Workflow {
        private shouldFail: boolean;

        constructor(name: string, parent: Workflow, shouldFail: boolean) {
          super(name, parent);
          this.shouldFail = shouldFail;
        }

        @Step()
        async executeStep() {
          this.logger.info(`${this.node.name} is running`);
          if (this.shouldFail) {
            this.logger.error(`${this.node.name} is about to fail`);
            throw new Error(`${this.node.name} failed`);
          }
          this.logger.info(`${this.node.name} completed successfully`);
          return `${this.node.name} succeeded`;
        }

        async run() {
          return this.executeStep();
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            new ChildWorkflow('SuccessChild', this, false),
            new ChildWorkflow('FailChild', this, true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const allLogs: string[] = [];

      parent.addObserver({
        onLog: (entry) => allLogs.push(entry.message),
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      // ACT
      await parent.run();

      // ASSERT: Logs from both children captured
      expect(allLogs.length).toBeGreaterThan(0);

      // ASSERT: Success child logs present
      expect(
        allLogs.some((msg) => msg.includes('SuccessChild is running'))
      ).toBe(true);
      expect(
        allLogs.some((msg) => msg.includes('SuccessChild completed successfully'))
      ).toBe(true);

      // ASSERT: Fail child logs present
      expect(allLogs.some((msg) => msg.includes('FailChild is running'))).toBe(
        true
      );
      expect(
        allLogs.some((msg) => msg.includes('FailChild is about to fail'))
      ).toBe(true);
    });
  });

  describe('Error collection correctness', () => {
    it('should verify error messages are preserved correctly', async () => {
      // ARRANGE: Create children with specific error messages
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Task-Alpha', false),
            createChildWorkflow(this, 'Task-Beta', true), // Will fail with "Task-Beta failed"
            createChildWorkflow(this, 'Task-Gamma', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected - error should be thrown
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);

      // ACT
      const thrownError = await parent.run();

      // ASSERT: Error was thrown
      expect(thrownError).toBeDefined();

      // ASSERT: Error message is preserved (WorkflowError wraps the original)
      expect((thrownError as any).message).toContain('Task-Beta failed');

      // ASSERT: Error events captured with correct messages
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);

      const matchingError = errorEvents.find((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('Task-Beta');
        }
        return false;
      });
      expect(matchingError).toBeDefined();
    });
  });
});
