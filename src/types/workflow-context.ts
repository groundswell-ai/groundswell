/**
 * WorkflowContext - Interface for functional workflow execution
 *
 * Provides step(), spawnWorkflow(), and other methods for
 * composing workflows in arbitrary JavaScript control flow.
 */

import type { WorkflowNode } from './workflow.js';
import type { ReflectionAPI } from './reflection.js';

// Re-export ReflectionAPI for backward compatibility
export type { ReflectionAPI } from './reflection.js';

/**
 * Handle for querying the event tree
 */
export interface EventTreeHandle {
  /** Root node of the event tree */
  readonly root: EventNode;

  /**
   * Get a node by ID
   * @param id Node ID to find
   */
  getNode(id: string): EventNode | undefined;

  /**
   * Get all children of a node
   * @param id Parent node ID
   */
  getChildren(id: string): EventNode[];

  /**
   * Get all ancestors of a node (from node up to root)
   * @param id Node ID
   */
  getAncestors(id: string): EventNode[];

  /**
   * Export tree as JSON
   */
  toJSON(): EventNode;
}

/**
 * Event node in the queryable tree
 */
export interface EventNode {
  id: string;
  type: string;
  timestamp: number;
  name?: string;
  payload?: unknown;
  metrics?: EventMetrics;
  parentId?: string;
  children: EventNode[];
}

/**
 * Metrics associated with an event node
 */
export interface EventMetrics {
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
  toolCalls?: number;
}

/**
 * Agent interface for context revision (minimal to avoid circular deps)
 */
export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<T>;
}

/**
 * Prompt interface for context revision (minimal to avoid circular deps)
 */
export interface PromptLike<T> {
  id: string;
  buildUserMessage(): string;
  validateResponse(data: unknown): T;
}

/**
 * WorkflowContext - Available within functional workflow executor
 */
export interface WorkflowContext {
  /** Unique ID of this workflow */
  readonly workflowId: string;

  /** Parent workflow ID if nested */
  readonly parentWorkflowId?: string;

  /**
   * Execute a named step
   * Can be called anywhere in JavaScript control flow (loops, conditionals, etc.)
   *
   * @param name Step name for logging and debugging
   * @param fn Step function to execute
   * @returns Result of the step function
   */
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Spawn a child workflow
   * The child workflow is automatically attached to this workflow's tree
   *
   * @param workflow Workflow instance to spawn
   * @returns Result of the child workflow
   */
  spawnWorkflow<T>(workflow: { run(): Promise<T> }): Promise<T>;

  /**
   * Replace the last prompt result with a new one (context revision)
   * The previous prompt node is marked as 'revised' and the new result is attached as sibling
   *
   * @param newPrompt The new prompt to execute
   * @param agent The agent to use for execution
   * @returns Result of the new prompt
   */
  replaceLastPromptResult<T>(
    newPrompt: PromptLike<T>,
    agent: AgentLike
  ): Promise<T>;

  /**
   * Access to the event tree for this workflow
   */
  readonly eventTree: EventTreeHandle;

  /**
   * Reflection API for error handling and retry logic
   */
  readonly reflection: ReflectionAPI;
}

/**
 * Configuration for creating a functional workflow
 */
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;
}

/**
 * Result from workflow execution
 */
export interface WorkflowResult<T = unknown> {
  /** The result value */
  data: T;

  /** The workflow node */
  node: WorkflowNode;

  /** Total duration in milliseconds */
  duration: number;
}
