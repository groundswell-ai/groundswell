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
  AgentLike,
  PromptLike,
} from '../types/workflow-context.js';
import type {
  WorkflowNode,
  WorkflowEvent,
  ReflectionConfig,
  ReflectionContext,
} from '../types/index.js';
import { EventTreeHandleImpl, createEventTreeHandle } from './event-tree.js';
import {
  runInContext,
  type AgentExecutionContext,
} from './context.js';
import { generateId } from '../utils/id.js';
import { ReflectionManager } from '../reflection/reflection.js';
import { createReflectionConfig } from '../types/index.js';

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
  private reflectionManager: ReflectionManager;

  constructor(
    workflow: WorkflowLike,
    parentWorkflowId?: string,
    reflectionConfig?: Partial<ReflectionConfig>
  ) {
    this.workflowId = workflow.id;
    this.parentWorkflowId = parentWorkflowId;
    this.workflow = workflow;

    // Create event tree handle
    this.eventTreeImpl = new EventTreeHandleImpl(workflow.node);
    this.eventTree = this.eventTreeImpl;

    // Create reflection manager with config
    const config = createReflectionConfig(reflectionConfig);
    this.reflectionManager = new ReflectionManager(config);
    this.reflectionManager.setEventEmitter((event) => this.workflow.emitEvent(event));
    this.reflection = this.reflectionManager;
  }

  /**
   * Execute a named step with automatic context propagation and reflection support
   */
  async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const maxAttempts = this.reflectionManager.isEnabled()
      ? this.reflectionManager.getMaxAttempts()
      : 1;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startTime = Date.now();

      // Create step node
      const stepNode: WorkflowNode = {
        id: generateId(),
        name: attempt > 1 ? `${name} (retry ${attempt - 1})` : name,
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

        // If we succeeded after a reflection, mark it as successful
        if (attempt > 1) {
          this.reflectionManager.markLastReflectionSuccessful();
        }

        return result;
      } catch (error) {
        lastError = error as Error;

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

        // Check if we should try reflection
        if (!this.reflectionManager.isEnabled() || attempt === maxAttempts) {
          throw error;
        }

        // Try reflection
        const reflectionContext: ReflectionContext = {
          level: 'workflow',
          failedNode: stepNode,
          error: lastError,
          attemptNumber: attempt,
          previousAttempts: this.reflectionManager.getReflectionHistory(),
        };

        const reflectionResult = await this.reflectionManager.reflect(reflectionContext);

        if (!reflectionResult.shouldRetry) {
          throw lastError;
        }

        // Continue to next iteration for retry
      }
    }

    throw lastError ?? new Error('Max reflection attempts exceeded');
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

  /**
   * Replace the last prompt result with a new one (context revision)
   * The previous prompt node is marked as 'revised' and the new result is attached as sibling
   */
  async replaceLastPromptResult<T>(
    newPrompt: PromptLike<T>,
    agent: AgentLike
  ): Promise<T> {
    // Find the last completed prompt node in the tree
    const children = this.workflow.node.children;
    let lastPromptNodeIndex = -1;

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.status === 'completed') {
        lastPromptNodeIndex = i;
        break;
      }
    }

    // Create a revision node to mark the replacement
    const revisionNode: WorkflowNode = {
      id: generateId(),
      name: `revision:${newPrompt.id}`,
      parent: this.workflow.node,
      children: [],
      status: 'running',
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    // If we found a previous node, mark it as revised
    if (lastPromptNodeIndex >= 0) {
      const previousNode = children[lastPromptNodeIndex];
      // Mark as revised by adding a special status flag in logs
      previousNode.logs.push({
        id: generateId(),
        workflowId: this.workflowId,
        level: 'info',
        message: `Revised by ${revisionNode.id}`,
        timestamp: Date.now(),
      });
    }

    // Attach revision node as sibling (at same level)
    this.workflow.node.children.push(revisionNode);

    // Emit prompt revision event
    this.workflow.emitEvent({
      type: 'stepStart',
      node: revisionNode,
      step: `revision:${newPrompt.id}`,
    });

    // Create execution context for this revision
    const executionContext: AgentExecutionContext = {
      workflowNode: revisionNode,
      emitEvent: (event: WorkflowEvent) => {
        revisionNode.events.push(event);
        this.workflow.emitEvent(event);
      },
      workflowId: this.workflowId,
      parentWorkflowId: this.parentWorkflowId,
    };

    try {
      // Execute the new prompt in context
      const result = await runInContext(executionContext, () =>
        agent.prompt(newPrompt)
      );

      // Update revision node status
      revisionNode.status = 'completed';

      // Emit completion event
      this.workflow.emitEvent({
        type: 'stepEnd',
        node: revisionNode,
        step: `revision:${newPrompt.id}`,
        duration: 0, // Could track actual duration if needed
      });

      // Rebuild event tree
      this.eventTreeImpl.rebuild(this.workflow.node);

      return result;
    } catch (error) {
      // Update revision node status
      revisionNode.status = 'failed';

      // Emit error event
      this.workflow.emitEvent({
        type: 'error',
        node: revisionNode,
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
}

/**
 * Create a WorkflowContext for a workflow
 * @param workflow The workflow object
 * @param parentWorkflowId Optional parent workflow ID
 * @param reflectionConfig Optional reflection configuration
 */
export function createWorkflowContext(
  workflow: WorkflowLike,
  parentWorkflowId?: string,
  reflectionConfig?: Partial<ReflectionConfig>
): WorkflowContext {
  return new WorkflowContextImpl(workflow, parentWorkflowId, reflectionConfig);
}
