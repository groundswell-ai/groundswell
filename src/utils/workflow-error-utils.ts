import type { WorkflowError } from '../types/error.js';
import type { SerializedWorkflowState } from '../types/snapshot.js';

/**
 * Merge multiple WorkflowError objects into a single aggregated error.
 *
 * This is the default merger used when errorMergeStrategy is enabled for concurrent tasks.
 * It aggregates information from all errors to provide a comprehensive view of failures.
 *
 * @param errors - Array of WorkflowError objects to merge
 * @param taskName - Name of the task that spawned the concurrent workflows
 * @param parentWorkflowId - ID of the parent workflow
 * @param totalChildren - Total number of child workflows that were spawned
 * @returns A merged WorkflowError containing aggregated information
 *
 * @example
 * ```ts
 * const errors: WorkflowError[] = [error1, error2, error3];
 * const merged = mergeWorkflowErrors(errors, 'myTask', 'parent-123', 5);
 * // Returns: WorkflowError with message "3 of 5 concurrent child workflows failed in task 'myTask'"
 * ```
 */
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError {
  // Create merged error message
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

  // Get all unique workflow IDs that failed
  const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

  // Aggregate all logs
  const allLogs = errors.flatMap((e) => e.logs);

  // Create merged WorkflowError
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack, // Use first error's stack trace
    state: errors[0]?.state || ({} as SerializedWorkflowState), // Use first error's state
    logs: allLogs,
  };

  return mergedError;
}
