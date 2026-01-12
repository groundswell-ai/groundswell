import type { TaskOptions, WorkflowNode, WorkflowEvent, WorkflowError, SerializedWorkflowState } from '../types/index.js';
import { mergeWorkflowErrors } from '../utils/workflow-error-utils.js';

// Type for workflow-like objects
interface WorkflowLike {
  id: string;
  node: WorkflowNode;
  emitEvent(event: WorkflowEvent): void;
  attachChild(child: WorkflowLike): void;
}

// Minimal Workflow type for checking if something is a workflow
interface WorkflowClass {
  id: string;
  parent: WorkflowLike | null;
  run(...args: unknown[]): Promise<unknown>;
}

/**
 * @Task decorator
 * Wraps a method that returns child workflow(s), automatically attaching them
 *
 * @example
 * class ParentWorkflow extends Workflow {
 *   @Task({ concurrent: true })
 *   async createChildren(): Promise<ChildWorkflow[]> {
 *     return [
 *       new ChildWorkflow('child1', this),
 *       new ChildWorkflow('child2', this),
 *     ];
 *   }
 * }
 *
 * @example Non-workflow return (silently skipped)
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async returnsString(): Promise<string> {
 *     return 'not a workflow';  // Returned as-is, not attached
 *   }
 * }
 *
 * @example Mixed return (only workflows attached)
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async mixedReturn(): Promise<(Workflow | string)[]> {
 *     return [
 *       new ChildWorkflow('child1', this),  // Attached
 *       'some string',                       // Skipped
 *       new ChildWorkflow('child2', this),  // Attached
 *     ];
 *   }
 * }
 *
 * Validation Behavior
 *
 * The decorator uses lenient validation for return values:
 * - Workflow objects (with 'id' property) are automatically attached
 * - Non-workflow objects are silently skipped (not attached)
 * - The original return value is always preserved
 *
 * This lenient approach enables:
 * - Duck-typing: Works with workflow-like objects, not just Workflow instances
 * - Flexible signatures: Methods can return any type without breaking
 * - Graceful handling: Edge cases (null, undefined, primitives) don't throw errors
 */
export function Task(opts: TaskOptions = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>
  ) {
    const methodName = String(context.name);

    // CRITICAL: Use regular function, not arrow function
    async function taskWrapper(this: This, ...args: Args): Promise<Return> {
      // Cast to WorkflowLike for type safety when accessing workflow properties
      const wf = this as unknown as WorkflowLike;
      const taskName = opts.name ?? methodName;

      // Emit task start event
      wf.emitEvent({
        type: 'taskStart',
        node: wf.node,
        task: taskName,
      });

      // Execute the original method
      const result = await originalMethod.call(this, ...args);

      // Process returned workflows
      const workflows = Array.isArray(result) ? result : [result];

      for (const workflow of workflows) {
        // Type guard to check if it's a workflow
        if (workflow && typeof workflow === 'object' && 'id' in workflow) {
          const childWf = workflow as WorkflowClass;

          // Only attach if not already attached (parent not set by constructor)
          if (!childWf.parent) {
            childWf.parent = wf;
            wf.attachChild(childWf as unknown as WorkflowLike);
          }
        }
      }

      // If concurrent option is set and we have multiple workflows, run them in parallel
      if (opts.concurrent && Array.isArray(result)) {
        const runnable = workflows.filter(
          (w): w is WorkflowClass =>
            w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
        );

        if (runnable.length > 0) {
          const results = await Promise.allSettled(runnable.map((w) => w.run()));

          const rejected = results.filter(
            (r): r is PromiseRejectedResult => r.status === 'rejected'
          );

          if (rejected.length > 0) {
            // Check if error merge strategy is enabled
            if (opts.errorMergeStrategy?.enabled) {
              // Extract WorkflowError objects from rejected promises
              const errors = rejected.map((r) => r.reason as WorkflowError);

              // Merge errors using custom combine() or default merger
              const mergedError = opts.errorMergeStrategy?.combine
                ? opts.errorMergeStrategy.combine(errors)
                : mergeWorkflowErrors(errors, taskName, wf.id, runnable.length);

              // Emit error event with merged error
              wf.emitEvent({
                type: 'error',
                node: wf.node,
                error: mergedError,
              });

              // Throw merged error
              throw mergedError;
            }

            // Backward compatibility: throw first error
            throw rejected[0].reason;
          }
        }
      }

      // Emit task end event
      wf.emitEvent({
        type: 'taskEnd',
        node: wf.node,
        task: taskName,
      });

      return result;
    }

    return taskWrapper;
  };
}
