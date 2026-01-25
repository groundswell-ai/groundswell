import type {
  WorkflowNode,
  WorkflowEvent,
  WorkflowObserver,
  LogEntry,
} from '../types/index.js';
import { Observable } from '../utils/observable.js';
import type { Workflow } from '../core/workflow.js';
import { writeFile, readFile } from 'fs/promises';
import { WorkflowEventReplayer } from './event-replayer.js';

/**
 * Status symbols for tree visualization
 */
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

/**
 * Tree debugger for real-time workflow visualization
 * Implements WorkflowObserver to receive all events
 */
export class WorkflowTreeDebugger implements WorkflowObserver {
  /** Root node of the workflow tree */
  private root: WorkflowNode;

  /** Observable stream of workflow events */
  public readonly events: Observable<WorkflowEvent>;

  /** Node lookup map for quick access */
  private nodeMap: Map<string, WorkflowNode> = new Map();

  /** Event history for persistence (only when persistEvents is true) */
  private eventHistory: WorkflowEvent[] = [];

  /** Whether to persist events to memory */
  private persistEvents: boolean = false;

  /** Maximum event history size (optional, for memory management) */
  private maxEventHistorySize?: number;

  /**
   * Create a tree debugger attached to a workflow
   * @param workflow The root workflow to debug
   * @param options Configuration options
   * @param options.persistEvents Whether to accumulate event history (default: false)
   * @param options.maxEventHistorySize Maximum number of events to keep (optional, FIFO eviction)
   *
   * @example
   * ```typescript
   * // Without persistence (default)
   * const debugger = new WorkflowTreeDebugger(workflow);
   *
   * // With persistence enabled
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   *
   * // With persistence and size limit
   * const debugger = new WorkflowTreeDebugger(workflow, {
   *   persistEvents: true,
   *   maxEventHistorySize: 10000,
   * });
   * ```
   */
  constructor(
    workflow: Workflow,
    options?: { persistEvents?: boolean; maxEventHistorySize?: number }
  ) {
    this.root = workflow.getNode();
    this.events = new Observable<WorkflowEvent>();

    // Extract options with defaults
    this.persistEvents = options?.persistEvents ?? false;
    this.maxEventHistorySize = options?.maxEventHistorySize;

    // Initialize event history if persistence enabled
    if (this.persistEvents) {
      this.eventHistory = [];
    }

    // Build initial node map
    this.buildNodeMap(this.root);

    // Register as observer on the workflow
    workflow.addObserver(this);
  }

  /**
   * Build node lookup map recursively
   */
  private buildNodeMap(node: WorkflowNode): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildNodeMap(child);
    }
  }

  /**
   * Remove entire subtree from node map using BFS traversal
   * O(k) complexity where k = number of nodes in subtree
   * Uses iterative BFS to avoid stack overflow on deep trees
   */
  private removeSubtreeNodes(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;  // Already removed or never existed

    // BFS traversal to collect all descendant IDs
    const toRemove: string[] = [];
    const queue: WorkflowNode[] = [node];

    while (queue.length > 0) {
      const current = queue.shift()!;
      toRemove.push(current.id);
      // Add children to queue for BFS traversal
      queue.push(...current.children);
    }

    // Batch delete all collected keys (atomic update)
    for (const id of toRemove) {
      this.nodeMap.delete(id);
    }
  }

  // WorkflowObserver implementation

  onLog(_entry: LogEntry): void {
    // Events are forwarded through the event stream
  }

  /**
   * Handle workflow events from observer interface
   * Captures events for history if persistence enabled, handles structural updates, forwards to stream
   *
   * @param event - The workflow event to handle
   */
  onEvent(event: WorkflowEvent): void {
    // Capture event for history if persistence enabled
    if (this.persistEvents) {
      // Handle max size limit (FIFO eviction)
      if (
        this.maxEventHistorySize &&
        this.eventHistory.length >= this.maxEventHistorySize
      ) {
        this.eventHistory.shift(); // Remove oldest event
      }
      this.eventHistory.push(event);
    }

    // Handle structural events with incremental updates
    switch (event.type) {
      case 'childAttached':
        // Keep existing logic - already optimal O(k)
        this.buildNodeMap(event.child);
        break;

      case 'childDetached':
        // NEW: Incremental subtree removal
        this.removeSubtreeNodes(event.childId);
        break;

      case 'treeUpdated':
        // NEW: Update root reference only
        this.root = event.root;
        break;

      default:
        // Non-structural events - no map update needed
        break;
    }

    // Always forward to event stream (existing behavior)
    this.events.next(event);
  }

  onStateUpdated(_node: WorkflowNode): void {
    // State updates are available through the node
  }

  onTreeChanged(root: WorkflowNode): void {
    // All tree changes now handled incrementally in onEvent()
    // Just update root reference if different
    if (this.root !== root) {
      this.root = root;
    }
  }

  // Public API

  /**
   * Get the current tree root
   */
  getTree(): WorkflowNode {
    return this.root;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): WorkflowNode | undefined {
    return this.nodeMap.get(id);
  }

  /**
   * Render tree as ASCII string
   * @param node Starting node (defaults to root)
   */
  toTreeString(node?: WorkflowNode): string {
    return this.renderTree(node ?? this.root, '', true, true);
  }

  /**
   * Recursive tree rendering
   */
  private renderTree(
    node: WorkflowNode,
    prefix: string,
    isLast: boolean,
    isRoot: boolean
  ): string {
    let result = '';

    // Status symbol and color indicator
    const statusSymbol = STATUS_SYMBOLS[node.status] || '?';
    const nodeInfo = `${statusSymbol} ${node.name} [${node.status}]`;

    if (isRoot) {
      result += nodeInfo + '\n';
    } else {
      const connector = isLast ? '└── ' : '├── ';
      result += prefix + connector + nodeInfo + '\n';
    }

    // Render children
    const childCount = node.children.length;
    node.children.forEach((child, index) => {
      const isLastChild = index === childCount - 1;
      const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      result += this.renderTree(child, childPrefix, isLastChild, false);
    });

    return result;
  }

  /**
   * Render logs as formatted string
   * @param node Starting node (defaults to root, includes descendants)
   */
  toLogString(node?: WorkflowNode): string {
    const logs = this.collectLogs(node ?? this.root);

    // Sort by timestamp
    logs.sort((a, b) => a.timestamp - b.timestamp);

    return logs
      .map((log) => {
        const time = new Date(log.timestamp).toISOString();
        const level = log.level.toUpperCase().padEnd(5);
        const nodeRef = this.nodeMap.get(log.workflowId);
        const nodeName = nodeRef?.name ?? log.workflowId;
        return `[${time}] ${level} [${nodeName}] ${log.message}`;
      })
      .join('\n');
  }

  /**
   * Collect all logs from a node and its descendants
   */
  private collectLogs(node: WorkflowNode): LogEntry[] {
    const logs: LogEntry[] = [...node.logs];

    for (const child of node.children) {
      logs.push(...this.collectLogs(child));
    }

    return logs;
  }

  /**
   * Get summary statistics for the tree
   */
  getStats(): {
    totalNodes: number;
    byStatus: Record<string, number>;
    totalLogs: number;
    totalEvents: number;
  } {
    const stats = {
      totalNodes: 0,
      byStatus: {} as Record<string, number>,
      totalLogs: 0,
      totalEvents: 0,
    };

    this.collectStats(this.root, stats);
    return stats;
  }

  private collectStats(
    node: WorkflowNode,
    stats: ReturnType<typeof this.getStats>
  ): void {
    stats.totalNodes++;
    stats.byStatus[node.status] = (stats.byStatus[node.status] || 0) + 1;
    stats.totalLogs += node.logs.length;
    stats.totalEvents += node.events.length;

    for (const child of node.children) {
      this.collectStats(child, stats);
    }
  }

  // ============================================================
  // Event Persistence API
  // ============================================================

  /**
   * Get the accumulated event history
   * Returns a copy to prevent external modification
   *
   * @returns Copy of event history array, or empty array if persistence disabled
   *
   * @example
   * ```typescript
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   * await workflow.run();
   * const events = debugger.getEventHistory();
   * console.log(`Captured ${events.length} events`);
   * ```
   */
  getEventHistory(): WorkflowEvent[] {
    if (!this.persistEvents) {
      return [];
    }
    // Return copy to prevent external modification
    return [...this.eventHistory];
  }

  /**
   * Serialize a WorkflowEvent to JSON-safe format
   * Extracts only primitive fields to avoid circular references in WorkflowNode objects
   *
   * **Strategy:**
   * - Extract nodeId and nodeName from WorkflowNode references
   * - Skip WorkflowNode.parent, WorkflowNode.children (circular refs)
   * - Skip WorkflowError.original (could be circular)
   * - Add timestamp for chronological ordering
   *
   * **Circular Reference Handling:**
   * - WorkflowNode has bidirectional links (parent ↔ children)
   * - WorkflowNode.events[] contains WorkflowEvents that reference WorkflowNodes
   * - JSON.stringify would throw TypeError without selective extraction
   *
   * @param event - The workflow event to serialize
   * @returns JSON-safe object with primitive fields only
   *
   * @example
   * ```typescript
   * const event: WorkflowEvent = {
   *   type: 'stateSnapshot',
   *   node: { id: 'wf-123', name: 'MyWorkflow', ... }
   * };
   * const serialized = serializeEvent(event);
   * // { type: 'stateSnapshot', timestamp: 1234567890, nodeId: 'wf-123', nodeName: 'MyWorkflow', stateSnapshot: {...} }
   * ```
   */
  private serializeEvent(event: WorkflowEvent): unknown {
    const timestamp = Date.now();

    switch (event.type) {
      // Core events
      case 'childAttached':
        return {
          type: event.type,
          timestamp,
          parentId: event.parentId,
          childId: event.child.id,
          childName: event.child.name,
          childStatus: event.child.status,
        };

      case 'childDetached':
        return {
          type: event.type,
          timestamp,
          parentId: event.parentId,
          childId: event.childId,
        };

      case 'stateSnapshot':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          stateSnapshot: event.node.stateSnapshot,
        };

      case 'stepStart':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          step: event.step,
        };

      case 'stepEnd':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          step: event.step,
          duration: event.duration,
        };

      case 'error':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          error: {
            message: event.error.message,
            workflowId: event.error.workflowId,
            state: event.error.state,
            logs: event.error.logs,
            stack: event.error.stack,
            // Skip 'original' field - could be circular
          },
        };

      case 'taskStart':
      case 'taskEnd':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          task: event.task,
        };

      case 'treeUpdated':
        return {
          type: event.type,
          timestamp,
          rootId: event.root.id,
          rootName: event.root.name,
        };

      // Agent/Prompt events
      case 'agentPromptStart':
        return {
          type: event.type,
          timestamp,
          agentId: event.agentId,
          agentName: event.agentName,
          promptId: event.promptId,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      case 'agentPromptEnd':
        return {
          type: event.type,
          timestamp,
          agentId: event.agentId,
          agentName: event.agentName,
          promptId: event.promptId,
          nodeId: event.node.id,
          nodeName: event.node.name,
          duration: event.duration,
          tokenUsage: event.tokenUsage,
        };

      // Tool events
      case 'toolInvocation':
        return {
          type: event.type,
          timestamp,
          toolName: event.toolName,
          input: event.input,
          output: event.output,
          duration: event.duration,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // MCP events
      case 'mcpEvent':
        return {
          type: event.type,
          timestamp,
          serverName: event.serverName,
          event: event.event,
          payload: event.payload,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // Reflection events
      case 'reflectionStart':
        return {
          type: event.type,
          timestamp,
          level: event.level,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      case 'reflectionEnd':
        return {
          type: event.type,
          timestamp,
          level: event.level,
          success: event.success,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // Cache events
      case 'cacheHit':
      case 'cacheMiss':
        return {
          type: event.type,
          timestamp,
          key: event.key,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      default:
        // Should not happen with TypeScript discriminated union
        // But handle gracefully for unknown event types
        return {
          type: (event as { type: string }).type,
          timestamp,
          rawData: JSON.stringify(event),
        };
    }
  }

  /**
   * Save event history to a JSON file
   * Serializes events to avoid circular references and writes to disk
   *
   * **Serialization Strategy:**
   * - Uses serializeEvent() to extract primitive fields only
   * - Avoids circular references in WorkflowNode objects
   * - Adds timestamp for chronological ordering
   *
   * **Error Handling:**
   * - Throws descriptive errors for file system issues
   * - Does not modify internal event history on failure
   *
   * @param path - File path to write event history
   * @throws {Error} If file cannot be written (permission denied, disk full, etc.)
   * @throws {Error} If event persistence is not enabled
   *
   * @example
   * ```typescript
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   * await workflow.run();
   * await debugger.saveEventHistory('./workflow-execution.json');
   * ```
   */
  async saveEventHistory(path: string): Promise<void> {
    if (!this.persistEvents) {
      throw new Error('Event persistence is not enabled. Initialize with { persistEvents: true }');
    }

    try {
      // Serialize all events
      const serialized = this.eventHistory.map((event) =>
        this.serializeEvent(event)
      );

      // Convert to JSON string
      const json = JSON.stringify(serialized, null, 2);

      // Write to file
      await writeFile(path, json, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // Enhance error messages with context
      if (err.code === 'ENOENT') {
        throw new Error(
          `Cannot save event history: Directory does not exist: ${path}`
        );
      }

      if (err.code === 'EACCES') {
        throw new Error(
          `Cannot save event history: Permission denied: ${path}`
        );
      }

      if (err.code === 'ENOSPC') {
        throw new Error(
          `Cannot save event history: No space left on device`
        );
      }

      // Re-throw with context
      throw new Error(
        `Failed to save event history to ${path}: ${err.message}`
      );
    }
  }

  /**
   * Load event history from a JSON file
   * Static method that can be called without instantiating WorkflowTreeDebugger
   *
   * **Error Handling:**
   * - Throws descriptive errors for file system issues
   * - Throws descriptive errors for invalid JSON
   *
   * @param path - File path to read event history from
   * @returns Parsed event array (unknown[] - caller should validate structure)
   * @throws {Error} If file does not exist
   * @throws {Error} If file cannot be read (permission denied, etc.)
   * @throws {Error} If file contains invalid JSON
   *
   * @example
   * ```typescript
   * const events = await WorkflowTreeDebugger.loadEventHistory('./workflow-execution.json');
   *
   * // Use with WorkflowEventReplayer
   * const replayer = new WorkflowEventReplayer();
   * const tree = replayer.replay(events as WorkflowEvent[]);
   * ```
   */
  static async loadEventHistory(path: string): Promise<unknown[]> {
    try {
      // Read file
      const content = await readFile(path, 'utf-8');

      // Parse JSON
      const parsed = JSON.parse(content);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Invalid event history file: Expected array, got ${typeof parsed}`
        );
      }

      return parsed;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // Handle file not found
      if (err.code === 'ENOENT') {
        throw new Error(`Event history file not found: ${path}`);
      }

      // Handle permission denied
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied reading file: ${path}`);
      }

      // Handle invalid JSON
      if (err instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in event history file: ${path}\n${err.message}`
        );
      }

      // Re-throw with context
      throw new Error(
        `Failed to load event history from ${path}: ${err.message}`
      );
    }
  }

  /**
   * Replay workflow execution from saved event history file.
   *
   * This is a convenience method that combines loadEventHistory and
   * WorkflowEventReplayer.replay() for one-call restoration of workflow trees.
   *
   * **Use Case**: Time-travel debugging - reconstruct workflow tree from saved events
   * to inspect execution after completion without requiring the live workflow instance.
   *
   * **Workflow**:
   * 1. Load events from file using loadEventHistory()
   * 2. Create WorkflowEventReplayer instance
   * 3. Replay events and return reconstructed tree
   *
   * **Error Handling**:
   * - Throws descriptive errors for file operations (delegated to loadEventHistory)
   * - Wraps replay errors with file path context
   *
   * **Returns**: Read-only WorkflowNode tree (no live workflow attached)
   *
   * @param path - File path to saved event history JSON file
   * @returns Reconstructed workflow tree root node
   * @throws {Error} If file cannot be read or parsed
   * @throws {Error} If events cannot be replayed (empty events, no root established)
   *
   * @example
   * ```typescript
   * // Save event history during execution
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   * await workflow.run();
   * await debugger.saveEventHistory('./workflow-events.json');
   *
   * // Later, replay the events to reconstruct the tree
   * const tree = await WorkflowTreeDebugger.replay('./workflow-events.json');
   * console.log(`Restored tree with ${tree.children.length} children`);
   *
   * // Use debugger instance to inspect the reconstructed tree
   * const debugInstance = new WorkflowTreeDebugger({ getNode: () => tree });
   * console.log(debugInstance.toTreeString(tree));
   * console.log(debugInstance.getStats());
   * ```
   */
  static async replay(path: string): Promise<WorkflowNode> {
    // Load events from file using existing static method
    const events = await WorkflowTreeDebugger.loadEventHistory(path);

    // Create replayer instance
    const replayer = new WorkflowEventReplayer();

    // Replay events with type assertion (loadEventHistory returns unknown[])
    // GOTCHA: Wrap in try-catch to enhance error messages with file path context
    try {
      return replayer.replay(events as WorkflowEvent[]);
    } catch (error) {
      const err = error as Error;
      throw new Error(
        `Failed to replay events from ${path}: ${err.message}`
      );
    }
  }
}
