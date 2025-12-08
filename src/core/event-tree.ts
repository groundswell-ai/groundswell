/**
 * EventTreeHandle - Queryable interface for the workflow event tree
 *
 * Provides methods for traversing and querying the event tree
 * that mirrors workflow execution.
 */

import type {
  EventTreeHandle,
  EventNode,
  EventMetrics,
} from '../types/workflow-context.js';
import type { WorkflowNode, WorkflowEvent } from '../types/index.js';

/**
 * Implementation of EventTreeHandle
 */
export class EventTreeHandleImpl implements EventTreeHandle {
  /** Root node of the tree */
  public readonly root: EventNode;

  /** Index of nodes by ID for fast lookup */
  private nodeIndex: Map<string, EventNode> = new Map();

  /**
   * Create a new EventTreeHandle from a workflow node
   * @param workflowNode Root workflow node
   */
  constructor(workflowNode: WorkflowNode) {
    this.root = this.buildEventNode(workflowNode);
    this.buildIndex(this.root);
  }

  /**
   * Get a node by ID
   * @param id Node ID to find
   */
  public getNode(id: string): EventNode | undefined {
    return this.nodeIndex.get(id);
  }

  /**
   * Get all children of a node
   * @param id Parent node ID
   */
  public getChildren(id: string): EventNode[] {
    const node = this.nodeIndex.get(id);
    return node?.children ?? [];
  }

  /**
   * Get all ancestors of a node (from node up to root, excluding the node itself)
   * @param id Node ID
   */
  public getAncestors(id: string): EventNode[] {
    const ancestors: EventNode[] = [];
    const node = this.nodeIndex.get(id);

    if (!node || !node.parentId) {
      return ancestors;
    }

    let currentId = node.parentId;
    while (currentId) {
      const parent = this.nodeIndex.get(currentId);
      if (!parent) break;
      ancestors.push(parent);
      currentId = parent.parentId ?? '';
    }

    return ancestors;
  }

  /**
   * Export tree as JSON
   */
  public toJSON(): EventNode {
    return this.cloneNode(this.root);
  }

  /**
   * Rebuild the tree from an updated workflow node
   * @param workflowNode Updated workflow node
   */
  public rebuild(workflowNode: WorkflowNode): void {
    const newRoot = this.buildEventNode(workflowNode);
    (this.root as { children: EventNode[] }).children = newRoot.children;
    Object.assign(this.root, {
      type: newRoot.type,
      name: newRoot.name,
      timestamp: newRoot.timestamp,
      metrics: newRoot.metrics,
    });

    this.nodeIndex.clear();
    this.buildIndex(this.root);
  }

  /**
   * Build an EventNode from a WorkflowNode
   */
  private buildEventNode(
    wfNode: WorkflowNode,
    parentId?: string
  ): EventNode {
    const eventNode: EventNode = {
      id: wfNode.id,
      type: 'workflow',
      timestamp: Date.now(),
      name: wfNode.name,
      parentId,
      children: [],
      metrics: this.extractMetrics(wfNode),
    };

    // Add event nodes from workflow events
    for (const event of wfNode.events) {
      const childNode = this.eventToNode(event, wfNode.id);
      if (childNode) {
        eventNode.children.push(childNode);
      }
    }

    // Add child workflow nodes
    for (const child of wfNode.children) {
      eventNode.children.push(this.buildEventNode(child, wfNode.id));
    }

    return eventNode;
  }

  /**
   * Convert a WorkflowEvent to an EventNode
   */
  private eventToNode(
    event: WorkflowEvent,
    parentId: string
  ): EventNode | null {
    const baseNode: Omit<EventNode, 'type' | 'payload'> = {
      id: `${parentId}-${event.type}-${Date.now()}`,
      timestamp: Date.now(),
      parentId,
      children: [],
    };

    switch (event.type) {
      case 'stepStart':
        return {
          ...baseNode,
          type: 'step',
          name: event.step,
        };

      case 'stepEnd':
        return {
          ...baseNode,
          type: 'stepComplete',
          name: event.step,
          metrics: { duration: event.duration },
        };

      case 'agentPromptStart':
        return {
          ...baseNode,
          id: `${event.agentId}-prompt-${event.promptId}`,
          type: 'agentPrompt',
          name: event.agentName,
          payload: { promptId: event.promptId },
        };

      case 'agentPromptEnd':
        return {
          ...baseNode,
          id: `${event.agentId}-promptEnd-${event.promptId}`,
          type: 'agentPromptComplete',
          name: event.agentName,
          metrics: {
            duration: event.duration,
            tokenUsage: event.tokenUsage
              ? {
                  input: event.tokenUsage.input_tokens,
                  output: event.tokenUsage.output_tokens,
                }
              : undefined,
          },
        };

      case 'toolInvocation':
        return {
          ...baseNode,
          type: 'tool',
          name: event.toolName,
          payload: { input: event.input, output: event.output },
          metrics: { duration: event.duration },
        };

      case 'error':
        return {
          ...baseNode,
          type: 'error',
          name: event.error.message,
          payload: event.error,
        };

      default:
        return null;
    }
  }

  /**
   * Extract metrics from a workflow node
   */
  private extractMetrics(wfNode: WorkflowNode): EventMetrics | undefined {
    // Calculate total duration from step events
    const stepEndEvents = wfNode.events.filter(
      (e) => e.type === 'stepEnd'
    ) as Array<{ type: 'stepEnd'; duration: number }>;

    if (stepEndEvents.length === 0) {
      return undefined;
    }

    const totalDuration = stepEndEvents.reduce(
      (sum, e) => sum + e.duration,
      0
    );

    return { duration: totalDuration };
  }

  /**
   * Build index of all nodes
   */
  private buildIndex(node: EventNode): void {
    this.nodeIndex.set(node.id, node);
    for (const child of node.children) {
      this.buildIndex(child);
    }
  }

  /**
   * Deep clone a node for JSON export
   */
  private cloneNode(node: EventNode): EventNode {
    return {
      ...node,
      children: node.children.map((c) => this.cloneNode(c)),
    };
  }
}

/**
 * Create an EventTreeHandle from a workflow node
 * @param workflowNode Root workflow node
 */
export function createEventTreeHandle(
  workflowNode: WorkflowNode
): EventTreeHandle {
  return new EventTreeHandleImpl(workflowNode);
}
