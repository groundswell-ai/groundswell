import type { StepOptions, WorkflowError, WorkflowNode, LogEntry, WorkflowEvent, ErrorCriterion } from '../types/index.js';
import { getObservedState } from './observed-state.js';
import { runInContext, type AgentExecutionContext } from '../core/context.js';
import { generateId, delay } from '../utils/index.js';

// Type for workflow-like objects that @Step can decorate methods on
interface WorkflowLike {
  id: string;
  node: WorkflowNode;
  logger: {
    info(message: string, data?: unknown): void;
  };
  emitEvent(event: WorkflowEvent): void;
  snapshotState(): void;
}

/**
 * @Step decorator
 * Wraps a method to emit step events, handle errors, and optionally snapshot state
 *
 * @example
 * class MyWorkflow extends Workflow {
 *   @Step({ snapshotState: true, trackTiming: true })
 *   async processData() {
 *     // ... step logic
 *   }
 * }
 */
export function Step(opts: StepOptions = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>
  ) {
    const methodName = String(context.name);

    /**
     * Check if an error matches a retry criterion
     * Handles all three ErrorCriterion variants: code, recoverable, and function
     */
    function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
      // CRITICAL: Check typeof first for function type narrowing
      if (typeof criterion === 'function') {
        return criterion(error);
      }

      // Object type checks (type narrowing works after typeof check)
      if ('code' in criterion) {
        const errorCode = error.message;
        return typeof criterion.code === 'string'
          ? errorCode === criterion.code
          : criterion.code.test(errorCode);
      }

      if ('recoverable' in criterion) {
        // For recoverable criterion, we check the original error if available
        const original = error.original as Error | undefined;
        if (original && 'recoverable' in original) {
          return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
        }
        // If no recoverable field on original error, assume true to allow retry
        return criterion.recoverable;
      }

      return false;
    }

    // CRITICAL: Use regular function, not arrow function, to preserve 'this'
    async function stepWrapper(this: This, ...args: Args): Promise<Return> {
      // Cast to WorkflowLike for type safety when accessing workflow properties
      const wf = this as unknown as WorkflowLike;
      const stepName = opts.name ?? methodName;
      const startTime = Date.now();

      // NEW: Initialize retry state
      let retryCount = 0;
      const maxRetries = opts.maxRetries ?? 3;

      // Log start if requested
      if (opts.logStart) {
        wf.logger.info(`STEP START: ${stepName}`);
      }

      // Emit step start event (only once, not on retry)
      wf.emitEvent({
        type: 'stepStart',
        node: wf.node,
        step: stepName,
      });

      // Create step node for hierarchy tracking
      const stepNode: WorkflowNode = {
        id: generateId(),
        name: stepName,
        parent: wf.node,
        children: [],
        status: 'running',
        logs: [],
        events: [],
        stateSnapshot: null,
      };

      // Create execution context for agent/prompt operations within this step
      const executionContext: AgentExecutionContext = {
        workflowNode: stepNode,
        emitEvent: (event: WorkflowEvent) => {
          stepNode.events.push(event);
          wf.emitEvent(event);
        },
        workflowId: wf.id,
      };

      // ============================================================
      // CRITICAL: Retry loop wraps existing try-catch
      // ============================================================
      while (retryCount <= maxRetries) {
        try {
          // Execute the original method within the execution context
          // This allows Agent.prompt() calls to automatically capture events
          const result = await runInContext(executionContext, async () => {
            return originalMethod.call(this, ...args);
          });

          // Update step node status
          stepNode.status = 'completed';

          // Snapshot state if requested
          if (opts.snapshotState) {
            wf.snapshotState();
          }

          // Calculate duration and emit end event
          const duration = Date.now() - startTime;
          if (opts.trackTiming !== false) {
            wf.emitEvent({
              type: 'stepEnd',
              node: wf.node,
              step: stepName,
              duration,
            });
          }

          // Log finish if requested
          if (opts.logFinish) {
            wf.logger.info(`STEP END: ${stepName} (${duration}ms)`);
          }

          // CRITICAL: Exit loop on success
          return result;

        } catch (err: unknown) {
          // Update step node status
          stepNode.status = 'failed';

          // Create rich error with context
          const error = err as Error;
          const snap = getObservedState(this as object);

          const workflowError: WorkflowError = {
            message: error?.message ?? 'Unknown error',
            original: err,
            workflowId: wf.id,
            stack: error?.stack,
            state: snap,
            logs: [...wf.node.logs] as LogEntry[],
          };

          // ============================================================
          // CRITICAL: Check if should retry or throw immediately
          // ============================================================
          const shouldAttemptRetry = opts.restartable && retryCount < maxRetries;

          // Check retry criteria if specified
          const matchesRetryCriteria = opts.retryOn
            ? opts.retryOn.some(criterion => matchesCriterion(workflowError, criterion))
            : true;  // If no criteria specified, retry all errors when restartable

          if (!shouldAttemptRetry || !matchesRetryCriteria) {
            // Emit error event and throw
            wf.emitEvent({
              type: 'error',
              node: wf.node,
              error: workflowError,
            });

            // Re-throw the enriched error
            throw workflowError;
          }

          // ============================================================
          // CRITICAL: Emit retry event and delay before retry
          // ============================================================
          const nextRetryCount = retryCount + 1;

          // Emit step retry event
          wf.emitEvent({
            type: 'stepRetry',
            node: wf.node,
            step: stepName,
            retryCount: nextRetryCount,
            error: workflowError,
          });

          // Log retry if logging enabled
          if (opts.logStart || opts.logFinish) {
            wf.logger.info(`STEP RETRY: ${stepName} (attempt ${nextRetryCount}/${maxRetries})`);
          }

          // Wait before retry
          const delayMs = opts.retryDelayMs ?? 1000;
          await delay(delayMs);

          // Increment retry count and continue loop
          retryCount = nextRetryCount;

          // Update step node name for retry
          stepNode.name = `${stepName} (retry ${retryCount})`;
          stepNode.status = 'running';
        }
      }

      // Should not reach here, but TypeScript needs it
      // This would only happen if loop exits without return or throw
      throw new Error(`Retry loop exited unexpectedly for step ${stepName}`);
    }

    return stepWrapper;
  };
}
