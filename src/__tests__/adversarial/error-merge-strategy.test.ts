/**
 * ErrorMergeStrategy Functionality Test Suite
 *
 * Tests the ErrorMergeStrategy feature for concurrent task error aggregation.
 *
 * Validates:
 * - Default behavior (disabled) - first error wins
 * - Enabled with default merge - uses mergeWorkflowErrors
 * - Enabled with custom combine - user-provided merger
 * - Edge cases - single failure, all failing, mixed scenarios
 * - Event emission - individual and merged error events
 * - Completion verification - all workflows complete
 *
 * Related:
 * - P1.M2.T2.S2: Error aggregation logic implementation
 * - P1.M2.T2.S3: Default error merger utility
 * - Bug: 001_e8e04329daf3 - Concurrent task error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { Workflow, Task, Step } from '../../index.js';
import type { WorkflowEvent, WorkflowError } from '../../types/index.js';

describe('@Task decorator ErrorMergeStrategy', () => {
  /**
   * Helper to create a child workflow that may fail
   * Pattern from: src/__tests__/adversarial/concurrent-task-failures.test.ts (lines 30-52)
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
   * Pattern from: src/__tests__/adversarial/concurrent-task-failures.test.ts (lines 58-67)
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

  /**
   * Helper to create a mock WorkflowError for custom combine() tests
   * Pattern from: src/__tests__/unit/utils/workflow-error-utils.test.ts (lines 7-25)
   */
  function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Test error',
      original: new Error('Original error'),
      workflowId: 'wf-test-123',
      stack: 'Error: Test error\n    at test.ts:10:15',
      state: { key: 'value' },
      logs: [
        {
          id: 'log-1',
          workflowId: 'wf-test-123',
          timestamp: Date.now(),
          level: 'error',
          message: 'Test log message',
        },
      ],
      ...overrides,
    };
  }

  describe('Default behavior (errorMergeStrategy disabled)', () => {
    it('should throw first error when errorMergeStrategy not provided', async () => {
      // ARRANGE: Create parent with concurrent tasks, no error merge strategy
      class ParentWorkflow extends Workflow {
        @Task({ concurrent: true }) // CRITICAL: concurrent=true required
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Child-0', false),
            createChildWorkflow(this, 'Child-1', true), // Will fail
            createChildWorkflow(this, 'Child-2', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            // Expected - capture error for validation
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);

      // ACT: Run parent workflow
      const thrownError = await parent.run();

      // ASSERT: All children completed (Promise.allSettled behavior)
      expect(parent.children.length).toBe(3);

      // ASSERT: Error was thrown (first error wins)
      expect(thrownError).toBeDefined();
      expect((thrownError as WorkflowError).message).toContain('Child-1 failed');

      // ASSERT: No additional error event from @Task (only individual workflow errors)
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBe(1); // Only Child-1's error event
    });

    it('should throw first error when errorMergeStrategy.enabled=false', async () => {
      // ARRANGE: Create parent with explicit enabled=false
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: false }, // Explicitly disabled
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Alpha', false),
            createChildWorkflow(this, 'Beta', true),
            createChildWorkflow(this, 'Gamma', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);
      const thrownError = await parent.run();

      // ASSERT: All children completed
      expect(parent.children.length).toBe(3);

      // ASSERT: First error thrown (not aggregated)
      expect(thrownError).toBeDefined();
      const errorMsg = (thrownError as WorkflowError).message;
      expect(errorMsg).toMatch(/Alpha failed|Beta failed|Gamma failed/);

      // ASSERT: Only individual error events (no merge event)
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBe(2); // Beta and Gamma errors only

      // ASSERT: Error message does not contain aggregated format
      expect(errorMsg).not.toContain('concurrent child workflows failed');
    });
  });

  describe('Enabled with default error merge', () => {
    it('should merge all errors when errorMergeStrategy.enabled=true', async () => {
      // ARRANGE: Create parent with error merge enabled
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true }, // No combine() - use default
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Alpha', false),
            createChildWorkflow(this, 'Beta', true), // Will fail
            createChildWorkflow(this, 'Gamma', false),
            createChildWorkflow(this, 'Delta', true), // Will fail
            createChildWorkflow(this, 'Epsilon', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);

      // ACT
      const thrownError = await parent.run();

      // ASSERT: All children completed
      expect(parent.children.length).toBe(5);

      // ASSERT: Merged error thrown
      expect(thrownError).toBeDefined();
      const error = thrownError as WorkflowError;

      // ASSERT: Message includes count and task name
      expect(error.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

      // ASSERT: Metadata in original field
      const metadata = error.original as {
        name: string;
        message: string;
        errors: WorkflowError[];
        totalChildren: number;
        failedChildren: number;
        failedWorkflowIds: string[];
      };

      expect(metadata.name).toBe('WorkflowAggregateError');
      expect(metadata.totalChildren).toBe(5);
      expect(metadata.failedChildren).toBe(2);
      expect(metadata.failedWorkflowIds).toHaveLength(2);
      expect(metadata.errors).toHaveLength(2);

      // ASSERT: Logs aggregated from all errors (empty array if child workflows don't log)
      expect(error.logs).toBeDefined();
      expect(Array.isArray(error.logs)).toBe(true);
      // Note: Logs are empty here because createChildWorkflow doesn't log
      // The "should aggregate all logs from all failed workflows" test specifically tests log aggregation

      // ASSERT: Error event emitted with merged error
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(3); // 2 individual + 1 merged

      // Find the merged error event (has different message format)
      const mergedErrorEvent = errorEvents.find((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('2 of 5 concurrent');
        }
        return false;
      });
      expect(mergedErrorEvent).toBeDefined();
    });

    it('should create aggregated error message with counts and task name', async () => {
      // ARRANGE: Test various counts
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Success1', false),
            createChildWorkflow(this, 'Fail1', true),
            createChildWorkflow(this, 'Success2', false),
            createChildWorkflow(this, 'Fail2', true),
            createChildWorkflow(this, 'Fail3', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = await parent.run() as WorkflowError;

      // ASSERT: Message format "${X} of ${Y} concurrent child workflows failed in task '${taskName}'"
      expect(thrownError.message).toBe("3 of 5 concurrent child workflows failed in task 'spawnChildren'");
      expect(thrownError.message).toMatch(/\d+ of \d+ concurrent child workflows failed/);
      expect(thrownError.message).toContain("task 'spawnChildren'");
    });

    it('should aggregate all logs from all failed workflows', async () => {
      // ARRANGE: Create workflows that log before failing
      class LoggingWorkflow extends Workflow {
        constructor(name: string, parent: Workflow, private shouldFail: boolean) {
          super(name, parent);
        }

        @Step()
        async executeStep() {
          this.logger.info(`${this.node.name} starting`);
          if (this.shouldFail) {
            this.logger.error(`${this.node.name} failing`);
            throw new Error(`${this.node.name} failed`);
          }
          this.logger.info(`${this.node.name} completed`);
        }

        async run() {
          return this.executeStep();
        }
      }

      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            new LoggingWorkflow('Workflow-1', this, true),
            new LoggingWorkflow('Workflow-2', this, true),
            new LoggingWorkflow('Workflow-3', this, false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: Logs from both failed workflows aggregated
      expect(thrownError.logs).toBeDefined();
      const logMessages = thrownError.logs.map((l) => l.message);

      // Should have logs from both failing workflows
      expect(logMessages.some((m) => m.includes('Workflow-1'))).toBe(true);
      expect(logMessages.some((m) => m.includes('Workflow-2'))).toBe(true);
    });

    it('should include metadata in original field', async () => {
      // ARRANGE: Test metadata structure
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'W1', true),
            createChildWorkflow(this, 'W2', true),
            createChildWorkflow(this, 'W3', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: Metadata structure is correct
      const metadata = thrownError.original as {
        name: string;
        message: string;
        errors: WorkflowError[];
        totalChildren: number;
        failedChildren: number;
        failedWorkflowIds: string[];
      };

      expect(metadata.name).toBe('WorkflowAggregateError');
      expect(metadata.message).toContain('concurrent child workflows failed');
      expect(metadata.errors).toHaveLength(3);
      expect(metadata.totalChildren).toBe(3);
      expect(metadata.failedChildren).toBe(3);
      expect(metadata.failedWorkflowIds).toHaveLength(3);

      // ASSERT: Each error in metadata has workflowId
      metadata.failedWorkflowIds.forEach((id) => {
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('Enabled with custom combine function', () => {
    it('should call custom combine function when provided', async () => {
      // ARRANGE: Create spy for combine function
      const combineSpy = vi.fn((errors: WorkflowError[]) => ({
        message: `Custom merge: ${errors.length} errors`,
        original: errors,
        workflowId: 'custom-parent',
        logs: errors.flatMap((e) => e.logs),
        stack: errors[0]?.stack,
        state: errors[0]?.state || {},
      }));

      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: {
            enabled: true,
            combine: combineSpy, // Custom combine function
          },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Alpha', true),
            createChildWorkflow(this, 'Beta', true),
            createChildWorkflow(this, 'Gamma', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');

      // ACT
      await parent.run();

      // ASSERT: Custom combine function was called
      expect(combineSpy).toHaveBeenCalledTimes(1);

      // ASSERT: Called with array of WorkflowError objects
      const calls = combineSpy.mock.calls;
      expect(calls).toHaveLength(1);
      const errorsArg = calls[0][0] as WorkflowError[];
      expect(Array.isArray(errorsArg)).toBe(true);
      expect(errorsArg).toHaveLength(2); // Alpha and Beta failed
    });

    it('should use custom merge result from combine function', async () => {
      // ARRANGE: Custom combine that returns specific format
      const customMerger = (errors: WorkflowError[]): WorkflowError => ({
        message: `MERGED: ${errors.map((e) => e.message).join(' | ')}`,
        original: {
          customField: 'custom-value',
          errors,
        },
        workflowId: 'merged-workflow',
        logs: errors.flatMap((e) => e.logs),
        stack: errors[0]?.stack,
        state: errors[0]?.state || {},
      });

      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: {
            enabled: true,
            combine: customMerger,
          },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'First', true),
            createChildWorkflow(this, 'Second', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: Custom merge result used
      expect(thrownError.message).toBe('MERGED: First failed | Second failed');
      expect(thrownError.workflowId).toBe('merged-workflow');

      // ASSERT: Custom fields preserved
      const customMetadata = thrownError.original as { customField: string };
      expect(customMetadata.customField).toBe('custom-value');
    });

    it('should pass all errors to custom combine function', async () => {
      // ARRANGE: Track which errors were passed
      let receivedErrors: WorkflowError[] = [];

      const trackingMerger = (errors: WorkflowError[]): WorkflowError => {
        receivedErrors = errors;
        return createMockWorkflowError({
          message: `Tracked ${errors.length} errors`,
        });
      };

      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: {
            enabled: true,
            combine: trackingMerger,
          },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'A', true),
            createChildWorkflow(this, 'B', true),
            createChildWorkflow(this, 'C', true),
            createChildWorkflow(this, 'D', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      await parent.run();

      // ASSERT: All failed errors passed to combine
      expect(receivedErrors).toHaveLength(3);
      const errorMessages = receivedErrors.map((e) => e.message);
      expect(errorMessages).toContain('A failed');
      expect(errorMessages).toContain('B failed');
      expect(errorMessages).toContain('C failed');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle single failure with merge enabled', async () => {
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [createChildWorkflow(this, 'OnlyChild', true)];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: Message format correct for single failure
      expect(thrownError.message).toBe("1 of 1 concurrent child workflows failed in task 'spawnChildren'");
    });

    it('should handle all workflows failing with merge enabled', async () => {
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'W1', true),
            createChildWorkflow(this, 'W2', true),
            createChildWorkflow(this, 'W3', true),
            createChildWorkflow(this, 'W4', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: All failures counted
      expect(thrownError.message).toBe("4 of 4 concurrent child workflows failed in task 'spawnChildren'");

      // ASSERT: All workflows completed
      expect(parent.children.length).toBe(4);
    });

    it('should handle mixed success/failure with merge enabled', async () => {
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'Success1', false),
            createChildWorkflow(this, 'Fail1', true),
            createChildWorkflow(this, 'Success2', false),
            createChildWorkflow(this, 'Fail2', true),
            createChildWorkflow(this, 'Success3', false),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const thrownError = (await parent.run()) as WorkflowError;

      // ASSERT: Only failed children counted in message
      expect(thrownError.message).toBe("2 of 5 concurrent child workflows failed in task 'spawnChildren'");

      // ASSERT: All workflows completed
      expect(parent.children.length).toBe(5);

      // ASSERT: Metadata correct
      const metadata = thrownError.original as { failedChildren: number; totalChildren: number };
      expect(metadata.failedChildren).toBe(2);
      expect(metadata.totalChildren).toBe(5);
    });

    it('should complete all workflows even when errors occur', async () => {
      const completedWorkflows = new Set<string>();

      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          const children = [
            createChildWorkflow(this, 'Success1', false),
            createChildWorkflow(this, 'Fail1', true),
            createChildWorkflow(this, 'Success2', false),
            createChildWorkflow(this, 'Fail2', true),
          ];

          // Track completion
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
      await parent.run();

      // ASSERT: All workflows completed (no orphans)
      expect(completedWorkflows.size).toBe(4);
      expect(parent.children.length).toBe(4);
    });

    it('should emit error event with merged error', async () => {
      class ParentWorkflow extends Workflow {
        @Task({
          concurrent: true,
          errorMergeStrategy: { enabled: true },
        })
        async spawnChildren() {
          return [
            createChildWorkflow(this, 'OK', false),
            createChildWorkflow(this, 'Bad1', true),
            createChildWorkflow(this, 'Bad2', true),
          ];
        }

        async run() {
          try {
            await this.spawnChildren();
          } catch (err) {
            return err;
          }
        }
      }

      const parent = new ParentWorkflow('Parent');
      const events = setupEventObserver(parent);
      await parent.run();

      // ASSERT: Error events emitted for individual failures
      const individualErrorEvents = events.filter((e) => {
        if (e.type === 'error') {
          return e.error.message === 'Bad1 failed' || e.error.message === 'Bad2 failed';
        }
        return false;
      });
      expect(individualErrorEvents.length).toBeGreaterThanOrEqual(2);

      // ASSERT: Additional merged error event emitted
      const mergedErrorEvent = events.find((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('concurrent child workflows failed');
        }
        return false;
      });
      expect(mergedErrorEvent).toBeDefined();

      // ASSERT: Merged error has correct structure
      if (mergedErrorEvent && mergedErrorEvent.type === 'error') {
        expect(mergedErrorEvent.error.message).toContain('2 of 3');
        expect(mergedErrorEvent.error.workflowId).toBeDefined();
        expect(Array.isArray(mergedErrorEvent.error.logs)).toBe(true);
      }
    });
  });

  describe.skip('maxMergeDepth validation', () => {
    // NOTE: maxMergeDepth is defined in ErrorMergeStrategy interface
    // but not currently implemented in src/decorators/task.ts
    // These tests should be implemented when maxMergeDepth is added

    it('should respect maxMergeDepth when merging nested errors');
    it('should handle maxMergeDepth=0 (no merging)');
    it('should handle maxMergeDepth=1 (single level merging)');
  });
});
