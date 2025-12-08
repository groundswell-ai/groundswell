/**
 * WorkflowContextImpl - Implementation of functional workflow context
 *
 * Provides step(), spawnWorkflow(), and automatic context propagation
 * for agents and prompts executed within workflows.
 */

import type {
  WorkflowContext,
  EventTreeHandle,
  ReflectionAPI,
} from '../types/workflow-context.js';
import type { WorkflowNode, WorkflowEvent } from '../types/index.js';
import { EventTreeHandleImpl, createEventTreeHandle } from './event-tree.js';
import {
  runInContext,
  type AgentExecutionContext,
} from './context.js';
import { generateId } from '../utils/id.js';

/**
 * Placeholder reflection API implementation
 */
class ReflectionAPIImpl implements ReflectionAPI {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async triggerReflection(_reason?: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Reflection is not enabled for this workflow');
    }
    // Placeholder - reflection logic to be implemented in Phase 3
    console.warn('Reflection triggered but not yet implemented');
  }
}

/**
 * Interface for workflow-like objects that can emit events
 */
interface WorkflowLike {
  id: string;
  node: WorkflowNode;
  emitEvent(event: WorkflowEvent): void;
  setStatus(status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'): void;
  attachChild(child: WorkflowLike): void;
}

/**
 * WorkflowContext implementation
 */
export class WorkflowContextImpl implements WorkflowContext {
  public readonly workflowId: string;
  public readonly parentWorkflowId?: string;
  public readonly eventTree: EventTreeHandle;
  public readonly reflection: ReflectionAPI;

  private workflow: WorkflowLike;
  private eventTreeImpl: EventTreeHandleImpl;

  constructor(workflow: WorkflowLike, parentWorkflowId?: string, enableReflection = false) {
    this.workflowId = workflow.id;
    this.parentWorkflowId = parentWorkflowId;
    this.workflow = workflow;

    // Create event tree handle
    this.eventTreeImpl = new EventTreeHandleImpl(workflow.node);
    this.eventTree = this.eventTreeImpl;

    // Create reflection API
    this.reflection = new ReflectionAPIImpl(enableReflection);
  }

  /**
   * Execute a named step with automatic context propagation
   */
  async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Create step node
    const stepNode: WorkflowNode = {
      id: generateId(),
      name,
      parent: this.workflow.node,
      children: [],
      status: 'running',
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    // Attach to parent
    this.workflow.node.children.push(stepNode);

    // Emit step start
    this.workflow.emitEvent({
      type: 'stepStart',
      node: stepNode,
      step: name,
    });

    // Create execution context for this step
    const executionContext: AgentExecutionContext = {
      workflowNode: stepNode,
      emitEvent: (event: WorkflowEvent) => {
        stepNode.events.push(event);
        this.workflow.emitEvent(event);
      },
      workflowId: this.workflowId,
      parentWorkflowId: this.parentWorkflowId,
    };

    try {
      // Execute function in context
      const result = await runInContext(executionContext, fn);

      // Update step node status
      stepNode.status = 'completed';

      // Emit step end
      const duration = Date.now() - startTime;
      this.workflow.emitEvent({
        type: 'stepEnd',
        node: stepNode,
        step: name,
        duration,
      });

      // Rebuild event tree
      this.eventTreeImpl.rebuild(this.workflow.node);

      return result;
    } catch (error) {
      // Update step node status
      stepNode.status = 'failed';

      // Emit error event
      this.workflow.emitEvent({
        type: 'error',
        node: stepNode,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          original: error,
          workflowId: this.workflowId,
          stack: error instanceof Error ? error.stack : undefined,
          state: {},
          logs: [],
        },
      });

      // Rebuild event tree
      this.eventTreeImpl.rebuild(this.workflow.node);

      throw error;
    }
  }

  /**
   * Spawn a child workflow
   */
  async spawnWorkflow<T>(workflow: { run(): Promise<T>; id?: string; node?: WorkflowNode }): Promise<T> {
    // If workflow has attachChild-like capability, use it
    if ('node' in workflow && workflow.node) {
      // Set parent reference
      workflow.node.parent = this.workflow.node;

      // Attach child node
      this.workflow.node.children.push(workflow.node);

      // Emit child attached event
      this.workflow.emitEvent({
        type: 'childAttached',
        parentId: this.workflowId,
        child: workflow.node,
      });
    }

    // Run the child workflow
    const result = await workflow.run();

    // Rebuild event tree
    this.eventTreeImpl.rebuild(this.workflow.node);

    return result;
  }
}

/**
 * Create a WorkflowContext for a workflow
 * @param workflow The workflow object
 * @param parentWorkflowId Optional parent workflow ID
 * @param enableReflection Whether to enable reflection
 */
export function createWorkflowContext(
  workflow: WorkflowLike,
  parentWorkflowId?: string,
  enableReflection = false
): WorkflowContext {
  return new WorkflowContextImpl(workflow, parentWorkflowId, enableReflection);
}
