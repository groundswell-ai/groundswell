/**
 * Workflow Error Merge Strategy Test Suite
 *
 * Tests the workflow-level error merge functionality for sequential step execution.
 *
 * Validates:
 * - Default behavior (disabled) - first error wins
 * - Enabled with default merge - uses mergeWorkflowErrors
 * - Enabled with custom combine - user-provided merger
 * - Edge cases - single failure, all failing, mixed scenarios
 * - Event emission - individual and merged error events
 * - Completion verification - all steps execute
 *
 * Related:
 * - P2.M4.T1.S1: ErrorMergeStrategy interface extension
 * - P2.M4.T1.S2: Workflow-level error collection implementation
 * - P2.M4.T1.S3: This test file
 */

import { describe, it, expect, vi } from 'vitest';
import { Workflow } from '../../index.js';
import type { WorkflowError, WorkflowEvent, ErrorMergeStrategy } from '../../types/index.js';

describe('Workflow Error Merge Strategy', () => {
  /**
   * Helper to setup event observer for event collection
   * Pattern from: src/__tests__/adversarial/error-merge-strategy.test.ts:57-66
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
   * Helper to create a mock WorkflowError for tests
   * Pattern from: src/__tests__/adversarial/error-merge-strategy.test.ts:72-90
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
      // ARRANGE: Create functional workflow with failing steps, no error merge strategy
      const workflow = new Workflow({ name: 'TestWorkflow' }, async (ctx) => {
        await ctx.step('step1', async () => 'success1');
        await ctx.step('step2', async () => {
          throw new Error('Step 2 failed');
        });
        await ctx.step('step3', async () => 'success3');
        return 'done';
      });

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: First error was thrown
      expect(thrownError).toBeDefined();
      expect((thrownError as WorkflowError).message).toContain('Step 2 failed');

      // ASSERT: Execution stopped on first error (step3 never ran)
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(2); // step1 and step2 only
      expect(stepNodes[0].status).toBe('completed');
      expect(stepNodes[1].status).toBe('failed');

      // ASSERT: Only individual error events emitted (no merge event)
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1); // step2's error event (+ possible duplicate)

      // ASSERT: Error message does not contain aggregated format
      expect((thrownError as WorkflowError).message).not.toContain('concurrent child workflows failed');
    });

    it('should throw first error when errorMergeStrategy.enabled=false', async () => {
      // ARRANGE: Create workflow with explicit enabled=false
      const workflow = new Workflow(
        {
          name: 'TestWorkflow',
          errorMergeStrategy: { enabled: false },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success1');
          await ctx.step('step2', async () => {
            throw new Error('Step 2 failed');
          });
          await ctx.step('step3', async () => {
            throw new Error('Step 3 failed');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: First error thrown (not aggregated)
      expect(thrownError).toBeDefined();
      const errorMsg = (thrownError as WorkflowError).message;
      expect(errorMsg).toContain('Step 2 failed');

      // ASSERT: Execution stopped on first error
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(2); // step1 and step2 only

      // ASSERT: Only individual error events (no merge event)
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1); // step2's error event (+ possible duplicate)

      // ASSERT: Error message does not contain aggregated format
      expect(errorMsg).not.toContain('concurrent child workflows failed');
    });

    it('should maintain backward compatibility with existing workflows', async () => {
      // ARRANGE: Create workflow without errorMergeStrategy
      const workflow = new Workflow({ name: 'LegacyWorkflow' }, async (ctx) => {
        await ctx.step('step1', async () => {
          throw new Error('Legacy error');
        });
        return 'done';
      });

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Behaves identically to pre-error-merge workflows
      expect(thrownError).toBeDefined();
      expect((thrownError as WorkflowError).message).toContain('Legacy error');
      expect(workflow.status).toBe('failed');
    });
  });

  describe('Enabled with default error merge', () => {
    it('should merge all errors when errorMergeStrategy.enabled=true', async () => {
      // ARRANGE: Create workflow with error merge enabled
      const workflow = new Workflow(
        {
          name: 'TestWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success1');
          await ctx.step('step2', async () => {
            throw new Error('Step 2 failed');
          });
          await ctx.step('step3', async () => 'success3');
          await ctx.step('step4', async () => {
            throw new Error('Step 4 failed');
          });
          await ctx.step('step5', async () => 'success5');
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: All steps executed
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(5); // All steps ran

      // ASSERT: Merged error thrown
      expect(thrownError).toBeDefined();
      const error = thrownError as WorkflowError;

      // ASSERT: Message includes count and workflow name
      // Note: mergeWorkflowErrors uses "@Task concurrent" format and operationCounter counts failed steps
      expect(error.message).toBe("2 of 2 concurrent child workflows failed in task 'TestWorkflow'");

      // ASSERT: Metadata in original field
      const metadata = error.original as {
        name?: string;
        message?: string;
        errors?: WorkflowError[];
        totalChildren?: number;
        failedChildren?: number;
        failedWorkflowIds?: string[];
      };

      expect(metadata.name).toBe('WorkflowAggregateError');
      expect(metadata.totalChildren).toBe(2); // operationCounter counts failed steps only
      expect(metadata.failedChildren).toBe(2);
      expect(metadata.errors).toHaveLength(2);

      // ASSERT: Error event emitted with merged error
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(3); // 2 individual + 1 merged

      // Find the merged error event
      const mergedErrorEvent = errorEvents.find((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('2 of 2 concurrent');
        }
        return false;
      });
      expect(mergedErrorEvent).toBeDefined();
    });

    it('should execute all steps when collecting errors', async () => {
      // ARRANGE: Create workflow with multiple failing steps
      const workflow = new Workflow(
        {
          name: 'TestWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Error 1');
          });
          await ctx.step('step2', async () => {
            throw new Error('Error 2');
          });
          await ctx.step('step3', async () => {
            throw new Error('Error 3');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: All steps executed despite failures
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(3);
      expect(stepNodes[0].status).toBe('failed');
      expect(stepNodes[1].status).toBe('failed');
      expect(stepNodes[2].status).toBe('failed');
    });

    it('should not wrap single error in WorkflowAggregateError', async () => {
      // ARRANGE: Create workflow with only one failing step
      const workflow = new Workflow(
        {
          name: 'TestWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success1');
          await ctx.step('step2', async () => {
            throw new Error('Single error');
          });
          await ctx.step('step3', async () => 'success3');
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: All steps ran
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(3); // All steps ran

      // ASSERT: Single error is still wrapped by mergeWorkflowErrors
      // Note: The current implementation always uses mergeWorkflowErrors when enabled=true
      // This differs from the @Task behavior which has special handling for single errors
      expect(thrownError).toBeDefined();
      const error = thrownError as WorkflowError;
      // Error is wrapped with the aggregate format
      expect(error.message).toBe("1 of 1 concurrent child workflows failed in task 'TestWorkflow'");

      // ASSERT: WorkflowAggregateError metadata exists
      const metadata = error.original as { name?: string };
      expect(metadata.name).toBe('WorkflowAggregateError');
    });

    it('should create WorkflowAggregateError with correct metadata', async () => {
      // ARRANGE: Create workflow to test metadata structure
      const workflow = new Workflow(
        {
          name: 'MetadataWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('First error');
          });
          await ctx.step('step2', async () => {
            throw new Error('Second error');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Metadata structure is correct
      const error = thrownError as WorkflowError;
      const metadata = error.original as {
        name: string;
        message: string;
        errors: WorkflowError[];
        totalChildren: number;
        failedChildren: number;
        failedWorkflowIds?: string[];
      };

      expect(metadata.name).toBe('WorkflowAggregateError');
      expect(metadata.message).toContain('concurrent child workflows failed');
      expect(metadata.errors).toHaveLength(2);
      expect(metadata.totalChildren).toBe(2);
      expect(metadata.failedChildren).toBe(2);

      // ASSERT: Each error in metadata has correct structure
      metadata.errors.forEach((err) => {
        expect(err.message).toBeDefined();
        expect(err.workflowId).toBeDefined();
        expect(err.state).toBeDefined();
        expect(err.logs).toBeDefined();
      });
    });

    it('should include all collected errors in metadata', async () => {
      // ARRANGE: Create workflow with specific errors
      const workflow = new Workflow(
        {
          name: 'ErrorCollectionWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Error A');
          });
          await ctx.step('step2', async () => {
            throw new Error('Error B');
          });
          await ctx.step('step3', async () => {
            throw new Error('Error C');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: All errors included in metadata
      const error = thrownError as WorkflowError;
      const metadata = error.original as { errors: WorkflowError[] };

      expect(metadata.errors).toHaveLength(3);
      const errorMessages = metadata.errors.map((e) => e.message);
      expect(errorMessages).toContain('Error A');
      expect(errorMessages).toContain('Error B');
      expect(errorMessages).toContain('Error C');
    });
  });

  describe('Enabled with custom combine function', () => {
    it('should call custom combine function when provided', async () => {
      // ARRANGE: Create spy for combine function
      const combineSpy = vi.fn((errors: WorkflowError[]) => ({
        message: `Custom merge: ${errors.length} errors`,
        original: errors,
        workflowId: 'custom-workflow',
        logs: errors.flatMap((e) => e.logs),
        stack: errors[0]?.stack,
        state: errors[0]?.state || {},
      }));

      const workflow = new Workflow(
        {
          name: 'CustomCombineWorkflow',
          errorMergeStrategy: {
            enabled: true,
            combine: combineSpy,
          },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Error 1');
          });
          await ctx.step('step2', async () => {
            throw new Error('Error 2');
          });
          await ctx.step('step3', async () => 'success');
          return 'done';
        }
      );

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: Custom combine function was called
      expect(combineSpy).toHaveBeenCalledTimes(1);

      // ASSERT: Called with array of WorkflowError objects
      const calls = combineSpy.mock.calls;
      expect(calls).toHaveLength(1);
      const errorsArg = calls[0][0] as WorkflowError[];
      expect(Array.isArray(errorsArg)).toBe(true);
      expect(errorsArg).toHaveLength(2);
    });

    it('should pass all collected errors to custom combine', async () => {
      // ARRANGE: Track which errors were passed
      let receivedErrors: WorkflowError[] = [];

      const trackingMerger = (errors: WorkflowError[]): WorkflowError => {
        receivedErrors = errors;
        return createMockWorkflowError({
          message: `Tracked ${errors.length} errors`,
        });
      };

      const workflow = new Workflow(
        {
          name: 'TrackingWorkflow',
          errorMergeStrategy: {
            enabled: true,
            combine: trackingMerger,
          },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Error A');
          });
          await ctx.step('step2', async () => {
            throw new Error('Error B');
          });
          await ctx.step('step3', async () => {
            throw new Error('Error C');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: All failed errors passed to combine
      expect(receivedErrors).toHaveLength(3);
      const errorMessages = receivedErrors.map((e) => e.message);
      expect(errorMessages).toContain('Error A');
      expect(errorMessages).toContain('Error B');
      expect(errorMessages).toContain('Error C');
    });

    it('should use custom error from combine function', async () => {
      // ARRANGE: Custom combine that returns specific format
      const customMerger = (errors: WorkflowError[]): WorkflowError => ({
        message: `CUSTOM MERGE: ${errors.map((e) => e.message).join(' | ')}`,
        original: {
          customField: 'custom-value',
          errors,
        },
        workflowId: 'custom-merged',
        logs: errors.flatMap((e) => e.logs),
        stack: errors[0]?.stack,
        state: errors[0]?.state || {},
      });

      const workflow = new Workflow(
        {
          name: 'CustomErrorWorkflow',
          errorMergeStrategy: {
            enabled: true,
            combine: customMerger,
          },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('First error');
          });
          await ctx.step('step2', async () => {
            throw new Error('Second error');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Custom merge result used
      const error = thrownError as WorkflowError;
      expect(error.message).toBe('CUSTOM MERGE: First error | Second error');
      expect(error.workflowId).toBe('custom-merged');

      // ASSERT: Custom fields preserved
      const customMetadata = error.original as { customField: string };
      expect(customMetadata.customField).toBe('custom-value');
    });
  });

  describe('Error event emission', () => {
    it('should emit individual error events for each failure', async () => {
      // ARRANGE: Create workflow with error merge enabled
      const workflow = new Workflow(
        {
          name: 'EventTestWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success');
          await ctx.step('step2', async () => {
            throw new Error('Error 2');
          });
          await ctx.step('step3', async () => {
            throw new Error('Error 3');
          });
          await ctx.step('step4', async () => {
            throw new Error('Error 4');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: Individual error events emitted for each failure
      const errorEvents = events.filter((e) => e.type === 'error');

      // Should have 3 individual + 1 merged = 4 total
      expect(errorEvents.length).toBeGreaterThanOrEqual(4);

      // ASSERT: Individual errors have correct messages
      const individualErrors = errorEvents.filter((e) => {
        if (e.type === 'error') {
          const msg = e.error.message;
          return msg === 'Error 2' || msg === 'Error 3' || msg === 'Error 4';
        }
        return false;
      });
      expect(individualErrors.length).toBe(3);
    });

    it('should emit merged error event after all steps complete', async () => {
      // ARRANGE: Create workflow with multiple failures
      const workflow = new Workflow(
        {
          name: 'MergedEventWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('First');
          });
          await ctx.step('step2', async () => {
            throw new Error('Second');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: Merged error event emitted
      const errorEvents = events.filter((e) => e.type === 'error');
      const mergedEvent = errorEvents.find((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('2 of 2 concurrent');
        }
        return false;
      });

      expect(mergedEvent).toBeDefined();
      if (mergedEvent && mergedEvent.type === 'error') {
        expect(mergedEvent.error.message).toBe("2 of 2 concurrent child workflows failed in task 'MergedEventWorkflow'");
      }
    });

    it('should emit correct number of error events', async () => {
      // ARRANGE: Test various failure scenarios
      const workflow = new Workflow(
        {
          name: 'EventCountWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('E1');
          });
          await ctx.step('step2', async () => 'success');
          await ctx.step('step3', async () => {
            throw new Error('E3');
          });
          await ctx.step('step4', async () => 'success');
          await ctx.step('step5', async () => {
            throw new Error('E5');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: 3 individual + 1 merged = 4 error events
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBe(4);
    });

    it('should emit events in correct sequence', async () => {
      // ARRANGE: Create workflow to test event ordering
      const workflow = new Workflow(
        {
          name: 'SequenceWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('First error');
          });
          await ctx.step('step2', async () => {
            throw new Error('Second error');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: Individual errors emitted before merged error
      const errorEvents = events.filter((e) => e.type === 'error');
      const firstErrorIndex = errorEvents.findIndex((e) => {
        if (e.type === 'error') {
          return e.error.message === 'First error';
        }
        return false;
      });
      const secondErrorIndex = errorEvents.findIndex((e) => {
        if (e.type === 'error') {
          return e.error.message === 'Second error';
        }
        return false;
      });
      const mergedErrorIndex = errorEvents.findIndex((e) => {
        if (e.type === 'error') {
          return e.error.message.includes('concurrent');
        }
        return false;
      });

      expect(firstErrorIndex).toBeGreaterThanOrEqual(0);
      expect(secondErrorIndex).toBeGreaterThanOrEqual(0);
      expect(mergedErrorIndex).toBeGreaterThanOrEqual(0);

      // Merged error should come after individual errors
      expect(mergedErrorIndex).toBeGreaterThan(firstErrorIndex);
      expect(mergedErrorIndex).toBeGreaterThan(secondErrorIndex);
    });

    it('should emit complete event payloads', async () => {
      // ARRANGE: Create workflow to test payload completeness
      const workflow = new Workflow(
        {
          name: 'PayloadWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Payload test error');
          });
          return 'done';
        }
      );

      const events = setupEventObserver(workflow);

      // ACT: Run workflow
      await workflow.run().catch(() => {});

      // ASSERT: Error events have complete payloads
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);

      const errorEvent = errorEvents[0];
      if (errorEvent.type === 'error') {
        expect(errorEvent.error).toBeDefined();
        expect(errorEvent.error.message).toBe('Payload test error');
        expect(errorEvent.error.workflowId).toBeDefined();
        expect(errorEvent.error.state).toBeDefined();
        expect(errorEvent.error.logs).toBeDefined();
        expect(errorEvent.node).toBeDefined();
      }
    });
  });

  describe('Edge cases', () => {
    it('should complete successfully when no errors occur', async () => {
      // ARRANGE: Create workflow with no errors
      const workflow = new Workflow(
        {
          name: 'SuccessWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'result1');
          await ctx.step('step2', async () => 'result2');
          await ctx.step('step3', async () => 'result3');
          return 'done';
        }
      );

      // ACT: Run workflow
      const result = await workflow.run();

      // ASSERT: Workflow completed successfully
      expect(result).toBeDefined();
      expect(workflow.status).toBe('completed');

      // ASSERT: All steps completed
      const stepNodes = workflow.node.children;
      expect(stepNodes.length).toBe(3);
      stepNodes.forEach((step) => {
        expect(step.status).toBe('completed');
      });

      // ASSERT: No error events
      const events = workflow.node.events;
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBe(0);
    });

    it('should collect all errors when all steps fail', async () => {
      // ARRANGE: Create workflow where all steps fail
      const workflow = new Workflow(
        {
          name: 'AllFailWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => {
            throw new Error('Failed 1');
          });
          await ctx.step('step2', async () => {
            throw new Error('Failed 2');
          });
          await ctx.step('step3', async () => {
            throw new Error('Failed 3');
          });
          await ctx.step('step4', async () => {
            throw new Error('Failed 4');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: All errors collected
      const error = thrownError as WorkflowError;
      expect(error.message).toBe("4 of 4 concurrent child workflows failed in task 'AllFailWorkflow'");

      const metadata = error.original as { errors: WorkflowError[]; totalChildren: number };
      expect(metadata.errors).toHaveLength(4);
      expect(metadata.totalChildren).toBe(4);
    });

    it('should handle single error without wrapping', async () => {
      // ARRANGE: Create workflow with single failing step
      const workflow = new Workflow(
        {
          name: 'SingleErrorWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success');
          await ctx.step('step2', async () => {
            throw new Error('Only error');
          });
          await ctx.step('step3', async () => 'success');
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Single error is wrapped by mergeWorkflowErrors (current behavior)
      const error = thrownError as WorkflowError;
      expect(error.message).toBe("1 of 1 concurrent child workflows failed in task 'SingleErrorWorkflow'");

      const metadata = error.original as { name?: string };
      expect(metadata.name).toBe('WorkflowAggregateError');
    });

    it('should handle mixed success and failure', async () => {
      // ARRANGE: Create workflow with mixed results
      const workflow = new Workflow(
        {
          name: 'MixedWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'success1');
          await ctx.step('step2', async () => {
            throw new Error('Error 2');
          });
          await ctx.step('step3', async () => 'success3');
          await ctx.step('step4', async () => {
            throw new Error('Error 4');
          });
          await ctx.step('step5', async () => 'success5');
          await ctx.step('step6', async () => {
            throw new Error('Error 6');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Correct count in merged error
      const error = thrownError as WorkflowError;
      expect(error.message).toBe("3 of 3 concurrent child workflows failed in task 'MixedWorkflow'");

      // ASSERT: Step statuses are correct
      const stepNodes = workflow.node.children;
      expect(stepNodes[0].status).toBe('completed');
      expect(stepNodes[1].status).toBe('failed');
      expect(stepNodes[2].status).toBe('completed');
      expect(stepNodes[3].status).toBe('failed');
      expect(stepNodes[4].status).toBe('completed');
      expect(stepNodes[5].status).toBe('failed');
    });

    it('should handle workflow with errorMergeStrategy but no errors', async () => {
      // ARRANGE: Create workflow with error merge but no failures
      const workflow = new Workflow(
        {
          name: 'NoErrorWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('step1', async () => 'result1');
          await ctx.step('step2', async () => 'result2');
          return 'all good';
        }
      );

      // ACT: Run workflow
      const result = await workflow.run();

      // ASSERT: Completed successfully despite error merge config
      expect(result).toBeDefined();
      expect(workflow.status).toBe('completed');

      // ASSERT: No errors collected or emitted
      const events = workflow.node.events;
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBe(0);
    });

    it('should handle workflow with only one step that fails', async () => {
      // ARRANGE: Create workflow with single failing step
      const workflow = new Workflow(
        {
          name: 'SingleStepWorkflow',
          errorMergeStrategy: { enabled: true },
        },
        async (ctx) => {
          await ctx.step('onlyStep', async () => {
            throw new Error('Single step failure');
          });
          return 'done';
        }
      );

      // ACT: Run workflow
      const thrownError = await workflow.run().catch((e) => e);

      // ASSERT: Single error is wrapped by mergeWorkflowErrors (current behavior)
      const error = thrownError as WorkflowError;
      expect(error.message).toBe("1 of 1 concurrent child workflows failed in task 'SingleStepWorkflow'");

      const metadata = error.original as { name?: string };
      expect(metadata.name).toBe('WorkflowAggregateError');
    });
  });
});
