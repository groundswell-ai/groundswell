import type {
  WorkflowNode,
  WorkflowEvent,
  WorkflowObserver,
  LogEntry,
} from '../types/index.js';
import type { SerializedWorkflowState } from '../types/snapshot.js';
import type { WorkflowError } from '../types/error.js';

/**
 * WorkflowEventReplayer - Reconstruct workflow tree from event history
 *
 * **Purpose**: Enables time-travel debugging by replaying workflow events
 * to reconstruct workflow tree state at any point in execution history.
 *
 * **Phase 1 Scope**: Interface definition only. Implementation will be added
 * in future PRPs (P2.M1.T1.S2 for structural events, P2.M1.T1.S3 for state events).
 *
 * **Architecture**:
 * - Uses Map-based node tracking for O(1) lookups (pattern from WorkflowTreeDebugger)
 * - Processes events sequentially using discriminated union pattern
 * - Maintains tree invariants: single-parent rule, bidirectional references, no cycles
 *
 * **Event Categorization**:
 * - **Structural Events** (modify tree structure): childAttached, childDetached, treeUpdated
 * - **State Events** (update node properties): stateSnapshot, error
 * - **Metadata Events** (logged but don't modify tree): agentPrompt*, toolInvocation, mcpEvent, reflection*, cache*, task*, step*
 *
 * @example
 * ```typescript
 * const replayer = new WorkflowEventReplayer();
 * const tree = replayer.replay(eventStream);
 * console.log(`Tree has ${tree.children.length} root children`);
 * ```
 */
export class WorkflowEventReplayer {
  /** Node lookup map for O(1) access */
  private nodeMap: Map<string, WorkflowNode> = new Map();

  /** Root node of reconstructed tree */
  private root: WorkflowNode | null = null;

  /**
   * Replay a sequence of workflow events to reconstruct the workflow tree.
   *
   * **Event Processing Strategy:**
   * - Processes events sequentially in order
   * - Uses try-catch per event to isolate errors
   * - Logs errors and continues processing on failure
   * - Throws only if root cannot be established
   *
   * **Phase 1 - Structural Events** (this PRp):
   * - `childAttached`: Add new child node to parent's children array
   * - `childDetached`: Remove child and all descendants from tree
   * - `treeUpdated`: Update root reference to new tree
   *
   * **Phase 2 - State Events** (future PRP P2.M1.T1.S3):
   * - `stateSnapshot`: Update node's stateSnapshot field
   * - `error`: Record error information on node
   *
   * **Phase 3 - Metadata Events** (logged but don't modify tree):
   * - `agentPromptStart/End`, `toolInvocation`, `mcpEvent`, etc.
   *
   * **Tree Invariants Maintained:**
   * - Single-parent rule: Each node has at most one parent
   * - Bidirectional references: parent.children and child.parent are consistent
   * - No circular references: Tree is a Directed Acyclic Graph (DAG)
   *
   * @param events - Array of workflow events in chronological order
   * @returns Root node of the reconstructed workflow tree
   * @throws {Error} If events array is empty
   * @throws {Error} If root cannot be established from events
   *
   * @example
   * ```typescript
   * const replayer = new WorkflowEventReplayer();
   * const tree = replayer.replay(eventStream);
   * console.log(`Tree has ${tree.children.length} root children`);
   * ```
   */
  replay(events: WorkflowEvent[]): WorkflowNode {
    // Validate input
    if (!events || events.length === 0) {
      throw new Error('Events array is empty or null');
    }

    // Initialize state
    this.nodeMap.clear();
    this.root = null;

    // Process events sequentially
    for (const event of events) {
      try {
        switch (event.type) {
          case 'childAttached':
            this.handleChildAttached(event);
            break;

          case 'childDetached':
            this.handleChildDetached(event);
            break;

          case 'treeUpdated':
            this.handleTreeUpdated(event);
            break;

          default:
            // Non-structural events - skip for now (handled in P2.M1.T1.S3)
            break;
        }
      } catch (error) {
        // Log error but continue processing subsequent events
        console.error(`Error processing event type '${event.type}':`, error);
      }
    }

    // Verify root was established
    if (!this.root) {
      throw new Error('No root node established from event stream');
    }

    return this.root;
  }

  /**
   * Handle childAttached event - add subtree to tree.
   *
   * **Strategy:**
   * 1. Deep clone event.child to avoid mutating original
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Validate: parent exists, single-parent rule, no circular references
   * 4. Set child.parent = parent
   * 5. Add child to parent.children array
   * 6. Add child and all descendants to nodeMap via buildNodeMap()
   * 7. Establish root if this is the first attachment
   *
   * **Invariants:**
   * - Parent must exist in nodeMap (throw if not)
   * - Child must not already have a different parent (single-parent rule)
   * - No circular references (child must not be ancestor of parent)
   * - Bidirectional links: child.parent = parent AND parent.children includes child
   *
   * **Deep Cloning:** Uses structuredClone() for safe deep copy
   *
   * @param event - ChildAttachedEvent with parentId and child node
   * @throws {Error} If parent node not found
   * @throws {Error} If child already has a parent
   * @throws {Error} If attaching would create circular reference
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'childAttached', parentId: 'workflow-123', child: { id: 'workflow-456', ... } }
   * // Result: workflow-456 is added as child of workflow-123
   * ```
   */
  private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void {
    // Deep clone child to prevent mutation of event data
    const child = structuredClone(event.child);

    // Find parent
    const parent = this.nodeMap.get(event.parentId);
    if (!parent) {
      throw new Error(`Parent node '${event.parentId}' not found in nodeMap during childAttached event`);
    }

    // Validation 1: Check if child already has a different parent (single-parent rule)
    if (child.parent !== null && child.parent !== parent) {
      throw new Error(
        `Child '${child.name}' already has a parent. A node can only have one parent.`
      );
    }

    // Validation 2: Check for circular references
    if (this.isNodeDescendantOf(parent, child)) {
      throw new Error(
        `Cannot attach '${child.name}' as child of '${parent.name}' - would create circular reference`
      );
    }

    // Set bidirectional parent-child links
    child.parent = parent;
    parent.children.push(child);

    // Add child and all descendants to nodeMap
    this.buildNodeMap(child);

    // Establish root if this is the first attachment and parent has no parent
    if (this.root === null && parent.parent === null) {
      this.root = parent;
    }
  }

  /**
   * Handle childDetached event - remove subtree from tree.
   *
   * **Strategy:**
   * 1. Find child node via nodeMap.get(event.childId)
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Validate: parent and child exist, child is direct child of parent
   * 4. Remove child from parent.children array
   * 5. Clear child.parent reference
   * 6. Remove child and all descendants from nodeMap via removeSubtreeNodes()
   *
   * **Invariants:**
   * - Both parent and child must exist in nodeMap
   * - Child must be a direct child of parent (not just any descendant)
   *
   * **Error Handling:**
   * - Logs warning and returns early if parent or child not found
   * - Does not throw for missing nodes (replay continues)
   *
   * @param event - ChildDetachedEvent with parentId and childId
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'childDetached', parentId: 'workflow-123', childId: 'workflow-456' }
   * // Result: workflow-456 and its descendants are removed from tree
   * ```
   */
  private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
    // Find parent and child
    const parent = this.nodeMap.get(event.parentId);
    const child = this.nodeMap.get(event.childId);

    if (!parent) {
      console.warn(`Parent node '${event.parentId}' not found in nodeMap during childDetached event`);
      return;
    }

    if (!child) {
      console.warn(`Child node '${event.childId}' not found in nodeMap during childDetached event`);
      return;
    }

    // Validate child is direct child of parent
    const index = parent.children.indexOf(child);
    if (index === -1) {
      console.warn(
        `Child '${child.name}' is not a direct child of parent '${parent.name}' during childDetached event`
      );
      return;
    }

    // Remove from parent's children array
    parent.children.splice(index, 1);

    // Clear child's parent reference
    child.parent = null;

    // Remove child and all descendants from nodeMap
    this.removeSubtreeNodes(event.childId);
  }

  /**
   * Handle treeUpdated event - update root reference.
   *
   * **Strategy:**
   * 1. Verify event.root is a valid WorkflowNode
   * 2. Update this.root = event.root
   * 3. Clear nodeMap
   * 4. Rebuild nodeMap from new root via buildNodeMap()
   *
   * **Use Case:**
   * - Represents a complete tree replacement (not incremental update)
   * - Rare in practice; most updates use childAttached/childDetached
   *
   * @param event - TreeUpdatedEvent with new root node
   * @throws {Error} If event.root is null or undefined
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'treeUpdated', root: { id: 'workflow-123', children: [], ... } }
   * // Result: this.root points to new tree, nodeMap rebuilt
   * ```
   */
  private handleTreeUpdated(event: Extract<WorkflowEvent, { type: 'treeUpdated' }>): void {
    if (!event.root) {
      throw new Error('treeUpdated event has null or undefined root');
    }

    this.root = event.root;

    // Clear and rebuild nodeMap from new root
    this.nodeMap.clear();
    this.buildNodeMap(event.root);
  }

  /**
   * Handle stateSnapshot event - update node's state snapshot.
   *
   * **Strategy:**
   * 1. Find node via nodeMap.get(event.node.id)
   * 2. Update node.stateSnapshot = event.node.stateSnapshot
   *
   * **Invariants:**
   * - Node must exist in nodeMap
   * - stateSnapshot can be null (no snapshot captured)
   *
   * @param event - StateSnapshotEvent with updated node
   * @throws {Error} If node not found in nodeMap
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'stateSnapshot', node: { id: 'workflow-123', stateSnapshot: { count: 42 }, ... } }
   * // Result: node.stateSnapshot is updated with new snapshot
   * ```
   */
  private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>): void {
    // Implementation in P2.M1.T1.S3
    throw new Error('Not implemented: stateSnapshot handler');
  }

  /**
   * Handle error event - record error on node.
   *
   * **Strategy:**
   * 1. Find node via nodeMap.get(event.node.id)
   * 2. Append event.error to node's error collection
   *    (Implementation note: WorkflowNode doesn't have errors[] field,
   *     so this may require adding the field or storing errors in events array)
   *
   * **Invariants:**
   * - Node must exist in nodeMap
   * - Error includes rich context (state, logs, stack)
   *
   * @param event - ErrorEvent with error details
   * @throws {Error} If node not found in nodeMap
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'error', node: {...}, error: { message: 'Failed', state: {...}, logs: [...] } }
   * // Result: Error is recorded for debugging
   * ```
   */
  private handleErrorEvent(event: Extract<WorkflowEvent, { type: 'error' }>): void {
    // Implementation in P2.M1.T1.S3
    throw new Error('Not implemented: error handler');
  }

  /**
   * Build node lookup map recursively (pattern from WorkflowTreeDebugger).
   *
   * **Strategy:**
   * - Depth-first traversal of subtree
   * - Add each node to nodeMap: nodeMap.set(node.id, node)
   * - Recurse for all children
   *
   * **Complexity:** O(k) where k = number of nodes in subtree
   *
   * @param node - Root of subtree to add to nodeMap
   *
   * @example
   * ```typescript
   * // After attaching a child, add it and descendants to map
   * this.buildNodeMap(event.child);
   * // Result: child and all descendants are now in nodeMap
   * ```
   */
  private buildNodeMap(node: WorkflowNode): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildNodeMap(child);
    }
  }

  /**
   * Remove entire subtree from node map using BFS traversal.
   *
   * **Strategy:**
   * - BFS traversal to collect all descendant IDs
   * - Batch delete all collected keys from nodeMap
   * - Iterative (not recursive) to avoid stack overflow on deep trees
   *
   * **Complexity:** O(k) where k = number of nodes in subtree
   *
   * @param nodeId - ID of root node of subtree to remove
   *
   * @example
   * ```typescript
   * // After detaching a child, remove it and descendants from map
   * this.removeSubtreeNodes(event.childId);
   * // Result: child and all descendants removed from nodeMap
   * ```
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

  /**
   * Check if node is descendant of potential ancestor.
   * Uses cycle detection to prevent infinite loops during traversal.
   *
   * **Strategy:**
   * - Traverse parent chain upward from node
   * - Track visited nodes to detect cycles
   * - Return true if ancestor found in parent chain
   *
   * **Complexity:** O(d) where d = depth of hierarchy
   *
   * @param node - Node to start traversal from
   * @param potentialAncestor - Potential ancestor to search for
   * @returns true if ancestor found in parent chain
   * @throws {Error} If circular reference detected
   *
   * @example
   * ```typescript
   * // Check if attaching would create cycle
   * if (this.isNodeDescendantOf(parent, child)) {
   *   throw new Error('Would create circular reference');
   * }
   * ```
   */
  private isNodeDescendantOf(node: WorkflowNode, potentialAncestor: WorkflowNode): boolean {
    const visited = new Set<WorkflowNode>();
    let current: WorkflowNode | null = node.parent;

    while (current !== null) {
      // Cycle detection
      if (visited.has(current)) {
        throw new Error('Circular parent-child relationship detected');
      }
      visited.add(current);

      // Check if we found the ancestor
      if (current === potentialAncestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }
}
