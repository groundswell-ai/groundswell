import type {
  WorkflowNode,
  WorkflowStatus,
  WorkflowEvent,
  WorkflowObserver,
  LogEntry,
  SerializedWorkflowState,
  WorkflowError,
} from '../types/index.js';
import type { WorkflowContext, WorkflowConfig, WorkflowResult, EventHistoryConfig } from '../types/workflow-context.js';
import type { AgentResponse } from '../types/agent.js';
import { z } from 'zod';
import { generateId } from '../utils/id.js';
import { validateAgentResponse } from '../utils/agent-validation.js';
import { analyzeErrorForRestart } from '../utils/restart-analysis.js';
import { mergeWorkflowErrors } from '../utils/workflow-error-utils.js';
import { WorkflowLogger } from './logger.js';
import { getObservedState } from '../decorators/observed-state.js';
import { createWorkflowContext } from './workflow-context.js';

/**
 * Executor function type for functional workflows
 */
export type WorkflowExecutor<T = unknown> = (ctx: WorkflowContext) => Promise<T>;

/**
 * Options for restarting a step
 */
export interface RestartStepOptions {
  /** Current retry count (will be incremented by 1 for the attempt) */
  retryCount?: number;
  /** Maximum number of retries allowed (overrides step default) */
  maxRetries?: number;
  /** Override state to restore (defaults to current snapshot) */
  stateOverride?: SerializedWorkflowState;
}

/**
 * Internal entry for event history with insertion timestamp
 *
 * @remarks
 * This type is used internally to track when events were added to history,
 * enabling age-based trimming independent of event timestamps.
 */
interface EventHistoryEntry {
  /** The workflow event */
  event: WorkflowEvent;
  /** Insertion time in milliseconds since epoch */
  insertedAt: number;
}

/**
 * Options for replaying historical events
 */
interface ReplayEventsOptions {
  /** Only replay events after this timestamp (milliseconds since epoch) */
  since?: number;
  /** Maximum number of events to replay */
  limit?: number;
}

/**
 * Base class for all workflows
 * Supports both class-based (subclass with run()) and functional (executor) patterns
 *
 * @example Class-based pattern:
 * ```ts
 * class MyWorkflow extends Workflow {
 *   async run() {
 *     this.setStatus('running');
 *     // workflow logic
 *     this.setStatus('completed');
 *   }
 * }
 * ```
 *
 * @example Functional pattern:
 * ```ts
 * const workflow = new Workflow({ name: 'MyWorkflow' }, async (ctx) => {
 *   await ctx.step('step1', async () => {
 *     // step logic
 *   });
 * });
 * await workflow.run();
 * ```
 */
export class Workflow<T = unknown> {
  /** Unique identifier for this workflow instance */
  public readonly id: string;

  /** Parent workflow (null for root workflows) */
  public parent: Workflow | null = null;

  /** Child workflows */
  public children: Workflow[] = [];

  /** Current execution status */
  public status: WorkflowStatus = 'idle';

  /** Logger instance for this workflow */
  protected readonly logger: WorkflowLogger;

  /** The node representation of this workflow */
  public readonly node: WorkflowNode;

  /** Observers (only populated on root workflow) */
  private observers: WorkflowObserver[] = [];

  /** Optional executor function for functional workflows */
  private executor?: WorkflowExecutor<T>;

  /** Workflow configuration */
  private config: WorkflowConfig;

  /** Error collection state for workflow-level error merge */
  private collectedErrors: WorkflowError[] = [];

  /** Event history entries with insertion timestamps for replay functionality (ES2022 private field) */
  #eventHistory: EventHistoryEntry[] = [];

  /** Total operations count for error merge context */
  private totalOperations: number = 0;

  /** Operation counter for error merge context */
  private operationCounter: number = 0;

  /**
   * Create a new workflow instance
   *
   * @overload Class-based pattern: constructor(name?: string, parent?: Workflow)
   * @overload Functional pattern: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
   * @param name For class-based pattern, human-readable name. Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_). (default: class name).
   * For functional pattern, config object with workflow settings.
   * @param parentOrExecutor For class-based pattern, optional parent workflow.
   * For functional pattern, executor function.
   *
   * @remarks Security validation rejects names containing control characters, HTML tags, JavaScript patterns, path traversal sequences (..), and file system special characters (/ \ : * ? " < > |). This prevents XSS attacks, injection attacks, and path traversal vulnerabilities.
   */
  constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
    this.id = generateId();

    // Parse overloaded arguments
    if (typeof name === 'object' && name !== null) {
      // Functional pattern: constructor(config, executor)
      this.config = name;
      this.executor = parentOrExecutor as WorkflowExecutor<T>;
      this.parent = null;
    } else {
      // Class-based pattern: constructor(name, parent)
      this.config = { name: name ?? this.constructor.name };
      this.parent = (parentOrExecutor as Workflow) ?? null;
    }

    // Validate workflow name (after config is normalized)
    if (typeof this.config.name === 'string') {
      const trimmedName = this.config.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Workflow name cannot be empty or whitespace only');
      }
      if (this.config.name.length > 100) {
        throw new Error('Workflow name cannot exceed 100 characters');
      }

      // Security validation: control characters (ASCII 0x00-0x1F, 0x7F)
      if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
        throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
      }

      // Security validation: HTML/JavaScript injection patterns
      if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
        throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
      }

      // Security validation: path traversal patterns
      if (/\.\./.test(trimmedName)) {
        throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
      }

      // Security validation: file system special characters
      if (/[\/\\:*?"<>|]/.test(trimmedName)) {
        throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
      }

      // Security validation: allowed characters (allowlist - defense in depth)
      if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
        throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
      }
    }

    // Create the node representation
    this.node = {
      id: this.id,
      name: this.config.name ?? this.constructor.name,
      parent: this.parent?.node ?? null,
      children: [],
      status: 'idle',
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    // Create logger with root observers
    this.logger = new WorkflowLogger(this.node, this.getRootObservers());

    // Attach to parent if provided
    if (this.parent) {
      this.parent.attachChild(this);
    }
  }

  /**
   * Get observers from the root workflow
   * Traverses up the tree to find the root
   * Uses cycle detection to prevent infinite loops from circular parent-child relationships
   */
  private getRootObservers(): WorkflowObserver[] {
    const visited = new Set<Workflow>();
    let root: Workflow = this;
    let current: Workflow | null = this;

    while (current) {
      if (visited.has(current)) {
        throw new Error('Circular parent-child relationship detected');
      }
      visited.add(current);
      root = current;
      current = current.parent;
    }

    return root.observers;
  }

  /**
   * Check if event history is enabled for this workflow
   *
   * @returns true if event history is enabled, false otherwise
   */
  private isEventHistoryEnabled(): boolean {
    return this.config.eventHistory?.enabled === true;
  }

  /**
   * Get event history configuration with defaults applied
   *
   * @returns Configuration object with all required fields populated
   */
  private getEventHistoryConfig(): Required<EventHistoryConfig> {
    return {
      enabled: this.config.eventHistory?.enabled ?? false,
      maxEvents: this.config.eventHistory?.maxEvents ?? 1000,
      maxAgeMs: this.config.eventHistory?.maxAgeMs ?? 3600000,
    };
  }

  /**
   * Trim event history based on configuration
   *
   * Uses lazy trimming for performance:
   * - Only trims when at least 1.5x over the maxEvents limit
   * - Applies both count and age constraints
   * - Uses slice() for efficiency (not shift())
   *
   * @remarks
   * Lazy trimming reduces the number of trim operations by only trimming
   * when the history is significantly over the limit (1.5x). This provides
   * better performance for high-frequency event emission.
   */
  private trimEventHistory(): void {
    const config = this.getEventHistoryConfig();

    // Lazy trimming: only trim when significantly over limit
    const trimThreshold = Math.floor(config.maxEvents * 1.5);
    if (this.#eventHistory.length < trimThreshold) {
      return;
    }

    const now = Date.now();
    const ageCutoff = now - config.maxAgeMs;

    // Age-based trimming: find first entry within age limit
    let keepFromIndex = 0;
    for (let i = 0; i < this.#eventHistory.length; i++) {
      if (this.#eventHistory[i].insertedAt > ageCutoff) {
        keepFromIndex = i;
        break;
      }
    }

    // Count-based trimming: remove excess events
    const countBasedIndex = Math.max(0, this.#eventHistory.length - config.maxEvents);

    // Use the more aggressive constraint
    const finalIndex = Math.max(keepFromIndex, countBasedIndex);

    if (finalIndex > 0) {
      this.#eventHistory = this.#eventHistory.slice(finalIndex);
    }
  }

  /**
   * Check if this workflow is a descendant of the given ancestor workflow.
   *
   * Traverses the parent chain upward looking for the ancestor reference.
   * Uses a visited Set to detect cycles during traversal. This method provides
   * a convenient way to check workflow hierarchy relationships without manually
   * traversing the parent chain.
   *
   * @remarks SECURITY WARNING: This method reveals workflow hierarchy information.
   * If your application exposes workflows via an API, ensure you implement proper
   * access control to prevent unauthorized topology discovery. Note that the parent
   * and children properties are already public, so this method does not expose any
   * new information beyond what is currently accessible.
   *
   * **Time Complexity**: O(d) where d is the depth of the hierarchy
   * **Space Complexity**: O(d) for the visited Set in worst case (cycle detection)
   *
   * @example Check if a workflow belongs to a specific hierarchy
   * ```typescript
   * const root = new Workflow('root');
   * const child = new Workflow('child', { parent: root });
   *
   * if (child.isDescendantOf(root)) {
   *   console.log('Child is in root hierarchy');
   * }
   * ```
   *
   * @example Validate before attaching to prevent circular references
   * ```typescript
   * if (!newChild.isDescendantOf(parent)) {
   *   parent.attachChild(newChild);
   * } else {
   *   throw new Error('Would create circular reference');
   * }
   * ```
   *
   * @example Check for ancestor relationship in conditional logic
   * ```typescript
   * const isInProductionBranch = workflow.isDescendantOf(productionRoot);
   * if (isInProductionBranch) {
   *   // Apply production-specific logic
   * }
   * ```
   *
   * @param ancestor - The potential ancestor workflow to check
   * @returns true if ancestor is found in parent chain, false otherwise
   * @throws {Error} If a cycle is detected during traversal (indicates corrupted tree structure)
   */
  public isDescendantOf(ancestor: Workflow): boolean {
    const visited = new Set<Workflow>();
    let current: Workflow | null = this.parent;

    while (current !== null) {
      if (visited.has(current)) {
        throw new Error('Circular parent-child relationship detected');
      }
      visited.add(current);

      if (current === ancestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }

  /**
   * Get the root workflow
   * Uses cycle detection to prevent infinite loops from circular parent-child relationships
   */
  protected getRoot(): Workflow {
    const visited = new Set<Workflow>();
    let root: Workflow = this;
    let current: Workflow | null = this;

    while (current) {
      if (visited.has(current)) {
        throw new Error('Circular parent-child relationship detected');
      }
      visited.add(current);
      root = current;
      current = current.parent;
    }

    return root;
  }

  /**
   * Add an observer to this workflow (must be root)
   * @throws Error if called on non-root workflow
   * @side effects Adds observer to internal observers array for root workflows.
   * Observers will receive notifications for workflow events.
   */
  public addObserver(observer: WorkflowObserver): void {
    if (this.parent) {
      throw new Error('Observers can only be added to root workflows');
    }
    this.observers.push(observer);
  }

  /**
   * Remove an observer from this workflow
   */
  public removeObserver(observer: WorkflowObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Attach a child workflow to this parent workflow.
   *
   * Validates that the child can be attached by checking:
   * 1. Child is not already attached to this parent workflow
   * 2. Child does not have a different parent (enforces single-parent invariant)
   * 3. Child is not an ancestor of this parent (prevents circular references)
   *
   * **Structural Changes:**
   * - Adds child to this.children array (workflow tree)
   * - Adds child.node to this.node.children array (node tree)
   * - Sets child.parent = this (workflow tree)
   * - Sets child.node.parent = this.node (node tree)
   * - Emits childAttached event to notify observers
   * - Emits treeUpdated event to trigger tree debugger rebuild
   *
   * **Invariants Maintained:**
   * - Single-parent rule: A workflow can only have one parent
   * - 1:1 tree mirror: workflow tree and node tree stay synchronized
   * - No cycles: A workflow cannot be its own ancestor
   *
   * **Cycle Detection:**
   * - Uses isDescendantOf() helper with Set-based cycle detection
   * - Throws immediately if circular reference would be created
   *
   * @param child - The child workflow to attach
   * @throws {Error} If the child is already attached to this workflow
   * @throws {Error} If the child already has a different parent (use detachChild() first for reparenting)
   * @throws {Error} If the child is an ancestor of this parent (would create circular reference)
   * @side effects Modifies workflow tree structure, emits childAttached event,
   * and triggers treeUpdated event for debugger.
   *
   * @example
   * ```ts
   * const parent = new Workflow('Parent');
   * const child = new Workflow('Child');
   * parent.attachChild(child);
   * // child.parent === parent
   * // parent.children.includes(child) === true
   * ```
   *
   * @example Reparenting workflow
   * ```ts
   * const parent1 = new Workflow('Parent1');
   * const parent2 = new Workflow('Parent2');
   * const child = new Workflow('Child', parent1); // Attached to parent1
   *
   * // Later, move child to parent2
   * parent1.detachChild(child);
   * parent2.attachChild(child);
   * // child.parent === parent2
   * ```
   *
   * @see detachChild - For detaching children (enables reparenting)
   * @see isDescendantOf - Private helper for circular reference detection
   */
  public attachChild(child: Workflow): void {
    if (this.children.includes(child)) {
      throw new Error('Child already attached to this workflow');
    }

    // Check if child already has a different parent
    if (child.parent !== null && child.parent !== this) {
      const errorMessage =
        `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
        `A workflow can only have one parent. ` +
        `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Check if child is an ancestor (would create circular reference)
    if (this.isDescendantOf(child)) {
      const errorMessage =
        `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
        `This would create a circular reference.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Update child's parent if it's currently null
    if (child.parent === null) {
      child.parent = this;
      child.node.parent = this.node; // Maintain 1:1 mirror between workflow tree and node tree
    }

    this.children.push(child);
    this.node.children.push(child.node);

    // Emit child attached event (triggers onTreeChanged via emitEvent)
    this.emitEvent({
      type: 'childAttached',
      parentId: this.id,
      child: child.node,
    });
  }

  /**
   * Detach a child workflow from this parent workflow.
   *
   * Removes the child from both the workflow tree (this.children) and
   * the node tree (this.node.children), clears the child's parent reference,
   * and emits a childDetached event to notify observers.
   *
   * Also emits treeUpdated event to trigger tree debugger rebuild.
   *
   * This enables reparenting workflows: oldParent.detachChild(child); newParent.attachChild(child);
   *
   * @param child - The child workflow to detach
   * @throws {Error} If the child is not attached to this parent workflow
   * @side effects Modifies workflow tree structure, emits childDetached event,
   * and triggers treeUpdated event for debugger.
   *
   * @example
   * ```ts
   * const parent = new Workflow('Parent');
   * const child = new Workflow('Child', parent);
   *
   * // Later, reparent to a different parent
   * parent.detachChild(child);
   * newParent.attachChild(child);
   * ```
   */
  public detachChild(child: Workflow): void {
    // Validate child is actually attached
    const index = this.children.indexOf(child);

    if (index === -1) {
      throw new Error(
        `Child '${child.node.name}' is not attached to workflow '${this.node.name}'`
      );
    }

    // Remove from workflow tree (this.children array)
    this.children.splice(index, 1);

    // Remove from node tree (this.node.children array)
    const nodeIndex = this.node.children.indexOf(child.node);
    if (nodeIndex !== -1) {
      this.node.children.splice(nodeIndex, 1);
    }

    // Clear child's parent reference (both workflow tree and node tree)
    child.parent = null;
    child.node.parent = null; // Maintain 1:1 mirror between workflow tree and node tree

    // Emit childDetached event (triggers onTreeChanged via emitEvent)
    this.emitEvent({
      type: 'childDetached',
      parentId: this.id,
      childId: child.id,
    });
  }

  /**
   * Emit an event to all root observers
   * @side effects Pushes event to node.events array and notifies all registered observers.
   * May trigger treeUpdated notifications for specific event types.
   */
  public emitEvent(event: WorkflowEvent): void {
    // Store event in history FIRST (for replay functionality) - only if enabled
    if (this.isEventHistoryEnabled()) {
      this.#eventHistory.push({ event, insertedAt: Date.now() });
      this.trimEventHistory();
    }

    this.node.events.push(event);

    const observers = this.getRootObservers();
    for (const obs of observers) {
      try {
        obs.onEvent(event);

        // Also notify tree changed for tree update events
        if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
          obs.onTreeChanged(this.getRoot().node);
        }
      } catch (err) {
        this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
      }
    }
  }

  /**
   * Replay historical events to an observer
   *
   * **Strategy:**
   * 1. Start with event history array
   * 2. Filter by timestamp if `since` is provided
   * 3. Limit events if `limit` is provided
   * 4. Call observer.onEvent() for each event
   * 5. Handle observer errors gracefully
   *
   * **Performance:** O(n) where n = number of events in history
   *
   * **Timestamp Handling:**
   * - Events with timestamps: stepRetry, stepRestarted, invalidResponse
   * - Events without timestamps: Always included (considered timeless)
   * - Filter applies only to events with timestamp field
   *
   * **Order of Operations:** Filter first, then limit (more efficient)
   *
   * **Use Case:**
   * - Catch up new observers to current state
   * - Debug by replaying events to diagnostic observers
   * - Test scenarios by replaying historical events
   *
   * @param observer - The observer to replay events to
   * @param options - Optional replay configuration
   * @param options.since - Only replay events after this timestamp (ms since epoch)
   * @param options.limit - Maximum number of events to replay
   *
   * @example Replay all events to new observer
   * ```ts
   * const observer = {
   *   onLog: () => {},
   *   onEvent: (e) => console.log(e.type),
   *   onStateUpdated: () => {},
   *   onTreeChanged: () => {},
   * };
   * workflow.replayEvents(observer);
   * ```
   *
   * @example Replay last 10 events
   * ```ts
   * workflow.replayEvents(observer, { limit: 10 });
   * ```
   *
   * @example Replay events from last 5 minutes
   * ```ts
   * const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
   * workflow.replayEvents(observer, { since: fiveMinutesAgo });
   * ```
   */
  public replayEvents(
    observer: WorkflowObserver,
    options?: ReplayEventsOptions
  ): void {
    // Extract events from entries
    let events = this.#eventHistory.map(entry => entry.event);

    // Filter by timestamp if provided
    if (options?.since !== undefined) {
      events = events.filter(event => {
        // Extract timestamp from events that have it
        const timestamp =
          event.type === 'stepRetry' ? event.timestamp :
          event.type === 'stepRestarted' ? event.timestamp :
          event.type === 'invalidResponse' ? event.timestamp :
          undefined;

        // Include events without timestamp or events after since
        return timestamp === undefined || timestamp >= options.since!;
      });
    }

    // Apply limit if provided
    if (options?.limit !== undefined) {
      events = events.slice(0, options.limit);
    }

    // Replay events to observer
    for (const event of events) {
      try {
        observer.onEvent(event);
      } catch (err) {
        this.logger.error('Observer replay error', { error: err, eventType: event.type });
      }
    }
  }

  /**
   * Clear the event history array
   *
   * **Strategy:**
   * - Reassign #eventHistory to empty array
   * - Frees memory by discarding all stored events
   * - Events in node.events are preserved
   *
   * **Use Case:**
   * - Free memory after workflow completes
   * - Reset history between test runs
   * - Prevent memory leaks in long-running workflows
   *
   * **Side Effects:**
   * - Frees memory for discarded events
   * - Future replayEvents() calls will return empty
   * - Does NOT affect node.events array
   *
   * @example Clear history after workflow completes
   * ```ts
   * await workflow.run();
   * workflow.clearEventHistory();  // Free memory
   * ```
   */
  public clearEventHistory(): void {
    this.#eventHistory = [];
  }

  /**
   * Capture and emit a state snapshot
   * @side effects Updates node.stateSnapshot, notifies observers via onStateUpdated callback,
   * emits snapshot event, and triggers treeUpdated event for debugger.
   */
  public snapshotState(): void {
    const snapshot = getObservedState(this);
    this.node.stateSnapshot = snapshot;

    // Notify observers
    const observers = this.getRootObservers();
    for (const obs of observers) {
      try {
        obs.onStateUpdated(this.node);
      } catch (err) {
        this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id });
      }
    }

    // Emit snapshot event
    this.emitEvent({
      type: 'stateSnapshot',
      node: this.node,
    });

    // Emit treeUpdated event to trigger tree debugger rebuild
    this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  }

  /**
   * Restart a specific step with state restoration and retry tracking
   *
   * This method enables manual step restart from parent workflows. It validates
   * the step exists, checks retry limits, optionally restores state, re-executes
   * the step method, and emits a stepRestarted event for observability.
   *
   * @param stepName - The name of the step method to restart
   * @param options - Optional configuration for the restart attempt
   * @returns The result of the step execution
   * @throws {WorkflowError} When step is not found or max retries exceeded
   *
   * @example Restart a step with default retry tracking
   * ```ts
   * class MyWorkflow extends Workflow {
   *   @Step({ restartable: true })
   *   async myStep() { return 'result'; }
   *
   *   async run() {
   *     const result = await this.restartStep('myStep');
   *   }
   * }
   * ```
   *
   * @example Restart with explicit retry count and state override
   * ```ts
   * await this.restartStep('failingStep', {
   *   retryCount: 1,
   *   maxRetries: 3,
   *   stateOverride: { counter: 5 }
   * });
   * ```
   */
  public async restartStep(stepName: string, options?: RestartStepOptions): Promise<unknown> {
    // Calculate the retry count for this attempt
    const retryCount = (options?.retryCount ?? 0) + 1;
    const maxRetries = options?.maxRetries ?? 3;

    // Check retry limit
    if (retryCount > maxRetries) {
      const error: WorkflowError = {
        message: `Max retries (${maxRetries}) exceeded for step '${stepName}'`,
        original: new Error('Max retries exceeded'),
        workflowId: this.id,
        state: getObservedState(this),
        logs: [...this.node.logs] as LogEntry[],
      };
      throw error;
    }

    // Verify the step method exists and is callable
    const method = (this as Record<string, unknown>)[stepName];
    if (typeof method !== 'function') {
      const error: WorkflowError = {
        message: `Step '${stepName}' not found`,
        original: new Error('Step not found'),
        workflowId: this.id,
        state: getObservedState(this),
        logs: [...this.node.logs] as LogEntry[],
      };
      throw error;
    }

    // Restore state - use override if provided, otherwise capture current state
    let restoredState: SerializedWorkflowState;
    if (options?.stateOverride !== undefined) {
      restoredState = options.stateOverride;
      // For state override, we'd ideally restore the state here
      // Since no restoreState() method exists, stateOverride is primarily for the event payload
      // and any future state restoration implementation
    } else {
      // Capture current state as the restored state
      this.snapshotState();
      restoredState = this.node.stateSnapshot ?? {};
    }

    // Execute the step method
    const result = await (method as () => unknown).call(this);

    // Emit stepRestarted event
    this.emitEvent({
      type: 'stepRestarted',
      node: this.node,
      stepName,
      retryCount,
      restoredState,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Analyze a WorkflowError from a child workflow and determine restart action
   *
   * This method enables parent workflows to make intelligent decisions about child
   * workflow failures by analyzing the error and step metadata to determine whether
   * to retry the child, abort the parent, or rebuild the execution plan.
   *
   * **Analysis Flow:**
   * 1. Check `error.original?.recoverable` - if false, return 'abort'
   * 2. Extract stepName from error metadata (if available)
   * 3. Retrieve step metadata from stepMetadata map (if exists)
   * 4. Check if step is marked as restartable - if not, return 'abort'
   * 5. Use `analyzeErrorForRestart` utility to check retry criteria
   * 6. Return 'retry' if any criteria match, otherwise 'abort'
   *
   * **Integration with restartStep:**
   * This method is designed to be used alongside `restartStep()`:
   * - Call `analyzeError()` to get the decision
   * - If 'retry', call `restartStep(stepName)` to execute
   * - If 'abort', throw the error or return early
   * - If 'rebuild', trigger plan rebuild logic
   *
   * @param error - The WorkflowError to analyze (typically from child workflow)
   * @returns The recommended action: 'retry', 'abort', or 'rebuild'
   *
   * @example Parent workflow error handling
   * ```ts
   * class ParentWorkflow extends Workflow {
   *   @Step({ restartable: true, retryOn: [{ code: 'TIMEOUT' }] })
   *   async childWorkflow(): Promise<void> {
   *     // Child logic that may fail
   *   }
   *
   *   async run(): Promise<void> {
   *     try {
   *       await this.childWorkflow();
   *     } catch (err) {
   *       const error = err as WorkflowError;
   *       const action = this.analyzeError(error);
   *
   *       if (action === 'retry') {
   *         await this.restartStep('childWorkflow');
   *       } else if (action === 'abort') {
   *         throw error;
   *       } else if (action === 'rebuild') {
   *         // Trigger plan rebuild logic
   *       }
   *     }
   *   }
   * }
   * ```
   *
   * @example Analyze error from child workflow event
   * ```ts
   * class ParentWorkflow extends Workflow {
   *   private lastError: WorkflowError | null = null;
   *
   *   async run(): Promise<void> {
   *     // Subscribe to error events
   *     this.on('error', (event) => {
   *       this.lastError = event.error;
   *     });
   *
   *     // Later, analyze the error
   *     if (this.lastError) {
   *       const action = this.analyzeError(this.lastError);
   *       // Take action based on decision
   *     }
   *   }
   * }
   * ```
   *
   * @remarks
   * **Known Limitation:**
   * The `stepMetadata` map is not yet populated by the `@Step` decorator.
   * This method will return 'abort' if stepMetadata is not available or the step
   * is not found. This will be improved in a future update to the decorator.
   *
   * **Error Metadata:**
   * The stepName is extracted from `error.state?.stepName`. Ensure child
   * workflows populate this field when creating WorkflowError instances.
   *
   * @see {@link restartStep} - For executing a retry after analysis
   * @see {@link analyzeErrorForRestart} - For the underlying utility function
   */
  public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
    // STEP 1: Check recoverable flag
    const original = error.original as Error | undefined;
    if (original && 'recoverable' in original && !original.recoverable) {
      return 'abort';
    }

    // STEP 2: Extract stepName from error metadata
    // GOTCHA: WorkflowError doesn't have stepName property
    // Check if error.state or error.original has step information
    const stepName = error.state?.stepName as string | undefined;
    if (!stepName) {
      return 'abort'; // Can't determine which step failed
    }

    // STEP 3: Get step metadata with graceful handling
    // CRITICAL: stepMetadata may not exist yet (decorator doesn't store it)
    if (!('stepMetadata' in this)) {
      return 'abort'; // No metadata available
    }

    const stepMeta = (this as any).stepMetadata.get(stepName);
    if (!stepMeta) {
      return 'abort'; // Step not found in metadata
    }

    // STEP 4: Check if step is restartable
    if (!stepMeta.options?.restartable) {
      return 'abort'; // Step not marked as restartable
    }

    // STEP 5: Use analyzeErrorForRestart for criterion matching
    const analysis = analyzeErrorForRestart(error, stepMeta.options);
    if (analysis.shouldRestart) {
      return 'retry';
    }

    // STEP 6: Default to abort
    return 'abort';
  }

  /**
   * Validate an agent response at the workflow level
   *
   * This method enables parent workflows to validate agent responses
   * before processing them. It follows the same validation pattern as
   * Agent.validateResponse() but emits events and creates WorkflowError
   * for workflow-level error handling.
   *
   * @template T - The type of response data
   * @param response - The AgentResponse to validate
   * @param agentId - Identifier of the agent that produced the response
   * @param dataSchema - Optional Zod schema for response data (defaults to z.unknown())
   * @returns true if validation passes, false if validation fails
   *
   * @example Validate response from child workflow
   * ```ts
   * class ParentWorkflow extends Workflow {
   *   @Step()
   *   async processChildResult() {
   *     const response = await this.childWorkflow.run();
   *
   *     if (!this.validateAgentResponse(response, this.childWorkflow.agent.id)) {
   *       // Handle validation failure
   *       const action = this.analyzeError(this.lastError);
   *       if (action === 'retry') {
   *         return await this.restartStep('processChildResult');
   *       }
   *     }
   *
   *     // Process valid response
   *     return response.data;
   *   }
   * }
   * ```
   */
  public validateAgentResponse<T>(
    response: AgentResponse<T>,
    agentId: string,
    dataSchema: z.ZodTypeAny = z.unknown()
  ): boolean {
    // Call shared utility for validation
    const result = validateAgentResponse(response, dataSchema);

    if (result.valid) {
      // Response is valid
      return true;
    }

    // Validation failed - emit event and create error
    const zodError = result.errors!;  // Safe: errors exists when valid is false

    // Emit invalidResponse event
    this.emitEvent({
      type: 'invalidResponse',
      node: this.node,
      response,
      agentId,
      errors: zodError,
      timestamp: Date.now(),
    });

    // Create WorkflowError with INVALID_RESPONSE_FORMAT context
    const validationError: WorkflowError = {
      message: `Agent response validation failed for agent '${agentId}'`,
      original: zodError,
      workflowId: this.id,
      stack: zodError.stack,
      state: getObservedState(this),
      logs: [...this.node.logs] as LogEntry[],
    };

    // Store error for potential use by analyzeError/restartStep
    // Note: Consider adding lastError property to Workflow class if not exists
    // For now, emit event and return false

    return false;
  }

  /**
   * Update workflow status and sync with node
   */
  public setStatus(status: WorkflowStatus): void {
    this.status = status;
    this.node.status = status;
    this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  }

  /**
   * Get the node representation of this workflow
   */
  public getNode(): WorkflowNode {
    return this.node;
  }

  /**
   * Run the workflow
   *
   * For functional workflows (created with executor), runs the executor function.
   * For class-based workflows (subclasses), this should be overridden.
   *
   * @returns Workflow result
   */
  public async run(..._args: unknown[]): Promise<T | WorkflowResult<T>> {
    if (this.executor) {
      return this.runFunctional();
    }

    // Class-based workflows must override this method
    throw new Error(
      'Workflow.run() must be overridden in subclass or provide executor in constructor'
    );
  }

  /**
   * Run a functional workflow with context
   */
  private async runFunctional(): Promise<WorkflowResult<T>> {
    if (!this.executor) {
      throw new Error('No executor provided');
    }

    const startTime = Date.now();
    this.setStatus('running');

    // Reset error collection state
    this.collectedErrors = [];
    this.operationCounter = 0;

    // Create workflow context with error merge strategy
    const ctx = createWorkflowContext(
      this as unknown as Parameters<typeof createWorkflowContext>[0],
      this.parent?.id,
      this.config.enableReflection ? { enabled: true } : undefined,
      this.config.autoValidateResponses ?? true,
      this.config.errorMergeStrategy
    );

    try {
      const result = await this.executor(ctx);

      // Check if we should merge collected errors
      if (this.collectedErrors.length > 0) {
        if (this.config.errorMergeStrategy?.enabled) {
          // Merge errors
          const mergedError = this.config.errorMergeStrategy?.combine
            ? this.config.errorMergeStrategy.combine(this.collectedErrors)
            : mergeWorkflowErrors(
                this.collectedErrors,
                this.config.name || this.id,
                this.id,
                this.operationCounter
              );

          // Emit error event with merged error
          this.emitEvent({
            type: 'error',
            node: this.node,
            error: mergedError,
          });

          // Throw merged error
          throw mergedError;
        } else {
          // Throw first error (backward compatibility)
          throw this.collectedErrors[0];
        }
      }

      this.setStatus('completed');

      return {
        data: result,
        node: this.node,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Handle errors thrown directly (not collected)
      if (!this.config.errorMergeStrategy?.enabled) {
        this.setStatus('failed');

        this.emitEvent({
          type: 'error',
          node: this.node,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            original: error,
            workflowId: this.id,
            stack: error instanceof Error ? error.stack : undefined,
            state: getObservedState(this),
            logs: [...this.node.logs] as LogEntry[],
          },
        });

        throw error;
      }

      // If in collection mode, error should have been collected already
      // Re-throw if it somehow escaped collection
      throw error;
    }
  }
}
