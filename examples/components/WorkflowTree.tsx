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
export const WorkflowTree: React.FC<WorkflowTreeProps> = ({ node }) => {
  return <WorkflowTreeNode node={node} isRoot={true} />;
};

export default WorkflowTree;
