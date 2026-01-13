import type {
  WorkflowNode,
  WorkflowStatus,
  WorkflowEvent,
  WorkflowObserver,
  LogEntry,
} from '../types/index.js';
import type { WorkflowContext, WorkflowConfig, WorkflowResult } from '../types/workflow-context.js';
import { generateId } from '../utils/id.js';
import { WorkflowLogger } from './logger.js';
import { getObservedState } from '../decorators/observed-state.js';
import { createWorkflowContext } from './workflow-context.js';

/**
 * Executor function type for functional workflows
 */
export type WorkflowExecutor<T = unknown> = (ctx: WorkflowContext) => Promise<T>;

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
  protected readonly node: WorkflowNode;

  /** Observers (only populated on root workflow) */
  private observers: WorkflowObserver[] = [];

  /** Optional executor function for functional workflows */
  private executor?: WorkflowExecutor<T>;

  /** Workflow configuration */
  private config: WorkflowConfig;

  /**
   * Create a new workflow instance
   *
   * @overload Class-based pattern
   * @param name Human-readable name (defaults to class name)
   * @param parent Optional parent workflow
   *
   * @overload Functional pattern
   * @param config Workflow configuration
   * @param executor Executor function
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
   * Check if this workflow is a descendant of the given ancestor workflow
   * Traverses the parent chain upward looking for the ancestor reference
   * Uses visited Set to detect cycles during traversal
   *
   * @private
   * @param ancestor - The potential ancestor workflow to check
   * @returns true if ancestor is found in parent chain, false otherwise
   * @throws {Error} If a cycle is detected during traversal
   */
  private isDescendantOf(ancestor: Workflow): boolean {
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

    // Emit child attached event
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
   * This enables reparenting workflows: oldParent.detachChild(child); newParent.attachChild(child);
   *
   * @param child - The child workflow to detach
   * @throws {Error} If the child is not attached to this parent workflow
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

    // Emit childDetached event
    this.emitEvent({
      type: 'childDetached',
      parentId: this.id,
      childId: child.id,
    });
  }

  /**
   * Emit an event to all root observers
   */
  public emitEvent(event: WorkflowEvent): void {
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
   * Capture and emit a state snapshot
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

    // Create workflow context
    const ctx = createWorkflowContext(
      this as unknown as Parameters<typeof createWorkflowContext>[0],
      this.parent?.id,
      this.config.enableReflection ? { enabled: true } : undefined
    );

    try {
      const result = await this.executor(ctx);
      this.setStatus('completed');

      return {
        data: result,
        node: this.node,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.setStatus('failed');

      // Emit error event
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
  }
}
