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
   * Processes events chronologically to build an in-memory representation
   * of the workflow tree at the point of the last event.
   *
   * **Event Handling Strategy:**
   *
   * **Phase 1 - Structural Events** (modify tree structure):
   * - `childAttached`: Add new child node to parent's children array
   * - `childDetached`: Remove child and all descendants from tree
   * - `treeUpdated`: Update root reference to new tree
   *
   * **Phase 1 - State Events** (update node properties):
   * - `stateSnapshot`: Update node's stateSnapshot field
   * - `error`: Add error information to node
   *
   * **Phase 2 - Metadata Events** (logged but don't modify tree):
   * - `agentPromptStart/End`: Track agent prompt lifecycle
   * - `toolInvocation`: Track tool executions
   * - `mcpEvent`: Track MCP server events
   * - `reflectionStart/End`: Track reflection operations
   * - `cacheHit/Miss`: Track cache operations
   * - `taskStart/End`: Track task execution
   * - `stepStart/End`: Track step execution
   *
   * **Tree Invariants Maintained:**
   * - Single-parent rule: Each node has at most one parent
   * - Bidirectional references: parent.children and child.parent are consistent
   * - No circular references: Tree is a Directed Acyclic Graph (DAG)
   *
   * **Performance:**
   * - Uses Map<string, WorkflowNode> for O(1) node lookups
   * - Processes events sequentially (O(n) where n = event count)
   * - Incremental tree updates (O(k) for subtree operations)
   *
   * @param events - Array of workflow events in chronological order
   * @returns Root node of the reconstructed workflow tree
   * @throws {Error} If events array is empty
   * @throws {Error} If root cannot be established from events
   * @throws {Error} If event references missing parent node
   *
   * @example
   * ```typescript
   * const replayer = new WorkflowEventReplayer();
   * const tree = replayer.replay(eventStream);
   * console.log(`Tree has ${tree.children.length} root children`);
   * ```
   */
  replay(events: WorkflowEvent[]): WorkflowNode {
    // Phase 1: Return stub (implementation in P2.M1.T1.S2)
    throw new Error('Not implemented: Event replay logic will be added in P2.M1.T1.S2');
  }

  /**
   * Handle childAttached event - add subtree to tree.
   *
   * **Strategy:**
   * 1. Deep clone event.child to avoid mutating original
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Set child.parent = parent
   * 4. Add child to parent.children array
   * 5. Add child and all descendants to nodeMap via buildNodeMap()
   *
   * **Invariants:**
   * - Parent must exist in nodeMap (throw if not)
   * - Child must not already have a different parent (single-parent rule)
   * - No circular references (child must not be ancestor of parent)
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
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: childAttached handler');
  }

  /**
   * Handle childDetached event - remove subtree from tree.
   *
   * **Strategy:**
   * 1. Find child node via nodeMap.get(event.childId)
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Remove child from parent.children array
   * 4. Remove child and all descendants from nodeMap via removeSubtreeNodes()
   * 5. Clear child.parent reference
   *
   * **Invariants:**
   * - Both parent and child must exist in nodeMap
   * - Child must be a direct child of parent (not just any descendant)
   *
   * **Performance:**
   * - O(k) where k = number of nodes in subtree (BFS traversal)
   *
   * @param event - ChildDetachedEvent with parentId and childId
   * @throws {Error} If parent or child node not found
   * @throws {Error} If child is not a direct child of parent
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'childDetached', parentId: 'workflow-123', childId: 'workflow-456' }
   * // Result: workflow-456 and its descendants are removed from tree
   * ```
   */
  private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: childDetached handler');
  }

  /**
   * Handle treeUpdated event - update root reference.
   *
   * **Strategy:**
   * 1. Verify event.root is a valid WorkflowNode
   * 2. Update this.root = event.root
   * 3. Rebuild nodeMap from new root via buildNodeMap()
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
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: treeUpdated handler');
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
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: buildNodeMap');
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
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: removeSubtreeNodes');
  }
}
