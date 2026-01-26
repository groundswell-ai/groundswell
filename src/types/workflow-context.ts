/**
 * WorkflowContext - Interface for functional workflow execution
 *
 * Provides step(), spawnWorkflow(), and other methods for
 * composing workflows in arbitrary JavaScript control flow.
 */

import type { WorkflowNode } from './workflow.js';
import type { ReflectionAPI } from './reflection.js';
import type { AgentResponse } from './agent.js';
import type { ErrorMergeStrategy } from './error-strategy.js';

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
  prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
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
 * Event history configuration for workflow execution
 *
 * @remarks
 * When enabled, events are stored in memory and can be accessed via
 * the workflow's replay functionality. Events include step execution,
 * errors, agent prompts, tool invocations, and state changes.
 *
 * **Memory Management:**
 * - Events are trimmed based on both count (`maxEvents`) and age (`maxAgeMs`)
 * - Lazy trimming is used for performance (only trims when significantly over limit)
 * - When disabled, no events are stored in history (still emitted to observers)
 *
 * **Performance Impact:**
 * - Enabled: Minimal overhead (~1-2ms per event)
 * - Disabled: Zero overhead
 *
 * @example Enable event history with defaults
 * ```ts
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   eventHistory: { enabled: true }
 * };
 * ```
 *
 * @example Custom limits
 * ```ts
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   eventHistory: {
 *     enabled: true,
 *     maxEvents: 500,
 *     maxAgeMs: 1800000  // 30 minutes
 *   }
 * };
 * ```
 */
export interface EventHistoryConfig {
  /**
   * Enable event history collection
   *
   * When false (default), no events are stored in history.
   * Events are still emitted to observers in real-time.
   *
   * @default false
   */
  enabled?: boolean;

  /**
   * Maximum number of events to store in history
   *
   * When the limit is exceeded, oldest events are removed first.
   * Uses lazy trimming for performance (trims at 1.5x the limit).
   *
   * @default 1000
   * @minimum 1
   */
  maxEvents?: number;

  /**
   * Maximum age of events in milliseconds
   *
   * Events older than this are removed from history.
   * Age is based on insertion time, not event timestamp.
   *
   * @default 3600000 (1 hour)
   * @minimum 1000 (1 second)
   */
  maxAgeMs?: number;
}

/**
 * Configuration for creating a functional workflow
 */
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;

  /**
   * Event history configuration
   *
   * @remarks
   * Controls whether events are stored in memory for replay functionality.
   * When disabled (default), events are still emitted to observers but not
   * stored in the internal event history array.
   *
   * @example Enable with defaults
   * ```ts
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   eventHistory: { enabled: true }
   * };
   * ```
   *
   * @example Custom limits
   * ```ts
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   eventHistory: {
   *     enabled: true,
   *     maxEvents: 500,
   *     maxAgeMs: 1800000
   *   }
   * };
   * ```
   */
  eventHistory?: EventHistoryConfig;

  /**
   * Strategy for merging multiple errors
   *
   * @remarks
   * When provided, enables workflow-level error merge for multiple failures.
   * Default: undefined (first error wins behavior).
   *
   * @example
   * ```ts
   * // Enable error merging with default strategy
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: { enabled: true }
   * };
   *
   * // Enable with custom combine function
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: {
   *     enabled: true,
   *     combine: (errors) => ({
   *       message: `Custom: ${errors.length} failures`,
   *       // ... custom error object
   *     })
   *   }
   * };
   *
   * // Default behavior (first error wins)
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow'
   *   // errorMergeStrategy not provided = first error wins
   * };
   * ```
   */
  errorMergeStrategy?: ErrorMergeStrategy;
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
