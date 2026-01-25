/**
 * WorkflowTree Component
 *
 * Wrapper component that renders a workflow tree starting from a root node.
 * This is the main entry point for rendering workflow trees in Ink.
 *
 * @example
 * ```tsx
 * import { WorkflowTree } from './components/WorkflowTree.js';
 *
 * <WorkflowTree node={workflowNode} />
 * ```
 */

import React from 'react';
import type { WorkflowNode } from '../../src/types/workflow.js';
import { WorkflowTreeNode } from './WorkflowTreeNode.js';

export interface WorkflowTreeProps {
  /** The root workflow node to render */
  node: WorkflowNode;
  /** Set of expanded node IDs */
  expandedIds?: Set<string>;
  /** Toggle callback for expand/collapse (optional, for future use) */
  onToggle?: (nodeId: string) => void;
  /** Currently selected node ID for keyboard navigation */
  selectedId?: string | null;
}

/**
 * WorkflowTree - Main tree rendering component
 *
 * Renders a workflow tree starting from the given root node.
 * The root node is rendered without indentation or connector.
 *
 * @example
 * ```tsx
 * const tree: WorkflowNode = {
 *   id: 'root',
 *   name: 'Build Application',
 *   status: 'running',
 *   parent: null,
 *   children: [...],
 *   logs: [],
 *   events: [],
 *   stateSnapshot: null,
 * };
 *
 * <WorkflowTree node={tree} />
 * ```
 */
export const WorkflowTree: React.FC<WorkflowTreeProps> = ({
  node,
  expandedIds,
  onToggle,
  selectedId,
}) => {
  return (
    <WorkflowTreeNode
      node={node}
      isRoot={true}
      expandedIds={expandedIds}
      onToggle={onToggle}
      selectedId={selectedId}
    />
  );
};

export default WorkflowTree;
