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
   * Attach a child workflow
   * Called automatically in constructor when parent is provided
   */
  public attachChild(child: Workflow): void {
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
   * Emit an event to all root observers
   */
  public emitEvent(event: WorkflowEvent): void {
    this.node.events.push(event);

    const observers = this.getRootObservers();
    for (const obs of observers) {
      try {
        obs.onEvent(event);

        // Also notify tree changed for tree update events
        if (event.type === 'treeUpdated' || event.type === 'childAttached') {
          obs.onTreeChanged(this.getRoot().node);
        }
      } catch (err) {
        console.error('Observer onEvent error:', err);
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
        console.error('Observer onStateUpdated error:', err);
      }
    }

    // Emit snapshot event
    this.emitEvent({
      type: 'stateSnapshot',
      node: this.node,
    });
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
