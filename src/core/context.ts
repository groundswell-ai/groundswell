/**
 * AgentExecutionContext - Provides zero-plumbing context propagation
 *
 * Uses Node.js AsyncLocalStorage to automatically propagate context
 * through async call chains without manual passing.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { WorkflowNode, WorkflowEvent } from '../types/index.js';

/**
 * Context available during agent/prompt execution
 */
export interface AgentExecutionContext {
  /** Current workflow node in the hierarchy */
  workflowNode: WorkflowNode;

  /** Function to emit events to the workflow tree */
  emitEvent: (event: WorkflowEvent) => void;

  /** Workflow ID for tracking */
  workflowId: string;

  /** Parent workflow ID if nested */
  parentWorkflowId?: string;
}

/**
 * Global AsyncLocalStorage instance for execution context
 * Single shared instance per application (recommended pattern)
 */
const executionContext = new AsyncLocalStorage<AgentExecutionContext>();

/**
 * Get the current execution context
 * @returns Current context or undefined if not in a workflow
 */
export function getExecutionContext(): AgentExecutionContext | undefined {
  return executionContext.getStore();
}

/**
 * Get the current execution context, throwing if not available
 * @param operation Name of the operation requiring context
 * @returns Current context
 * @throws Error if not within a workflow context
 */
export function requireExecutionContext(
  operation: string
): AgentExecutionContext {
  const context = executionContext.getStore();
  if (!context) {
    throw new Error(
      `${operation} called outside of workflow context. ` +
        `Agent/Prompt operations must be executed within a workflow step.`
    );
  }
  return context;
}

/**
 * Run a function within an execution context
 * @param context Context to establish
 * @param fn Function to execute
 * @returns Result of the function
 */
export async function runInContext<T>(
  context: AgentExecutionContext,
  fn: () => Promise<T>
): Promise<T> {
  return executionContext.run(context, fn);
}

/**
 * Run a synchronous function within an execution context
 * @param context Context to establish
 * @param fn Function to execute
 * @returns Result of the function
 */
export function runInContextSync<T>(
  context: AgentExecutionContext,
  fn: () => T
): T {
  return executionContext.run(context, fn);
}

/**
 * Check if currently within an execution context
 * @returns true if context is available
 */
export function hasExecutionContext(): boolean {
  return executionContext.getStore() !== undefined;
}

/**
 * Create a child context with updated node
 * @param childNode The new workflow node for the child context
 * @returns New context with child node
 */
export function createChildContext(
  childNode: WorkflowNode
): AgentExecutionContext | undefined {
  const parent = getExecutionContext();
  if (!parent) {
    return undefined;
  }

  return {
    workflowNode: childNode,
    emitEvent: parent.emitEvent,
    workflowId: parent.workflowId,
    parentWorkflowId: parent.parentWorkflowId,
  };
}

/**
 * Export the raw AsyncLocalStorage for advanced use cases
 */
export { executionContext as agentExecutionStorage };
