import type { StepOptions, WorkflowError, WorkflowNode, LogEntry, WorkflowEvent } from '../types/index.js';
import { getObservedState } from './observed-state.js';
import { runInContext, type AgentExecutionContext } from '../core/context.js';
import { generateId } from '../utils/id.js';

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

    // CRITICAL: Use regular function, not arrow function, to preserve 'this'
    async function stepWrapper(this: This, ...args: Args): Promise<Return> {
      // Cast to WorkflowLike for type safety when accessing workflow properties
      const wf = this as unknown as WorkflowLike;
      const stepName = opts.name ?? methodName;
      const startTime = Date.now();

      // Log start if requested
      if (opts.logStart) {
        wf.logger.info(`STEP START: ${stepName}`);
      }

      // Emit step start event
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

        // Emit error event
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: workflowError,
        });

        // Re-throw the enriched error
        throw workflowError;
      }
    }

    return stepWrapper;
  };
}
