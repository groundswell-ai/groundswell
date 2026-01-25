/**
 * WorkflowTreeNode Component
 *
 * Recursive tree node component that renders workflow tree structure with:
 * - Proper indentation using context-aware prefix calculation
 * - Branch connectors (├── for non-last, └── for last child)
 * - Vertical continuation lines (│) for non-last branches
 * - Status icons with appropriate colors
 *
 * Pattern matches renderTree() from src/debugger/tree-debugger.ts (lines 217-245)
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { WorkflowNode, WorkflowStatus } from '../../src/types/workflow.js';
import { StatusIcon } from './StatusIcon.js';

/**
 * Get color for workflow status
 */
function getStatusColor(status: WorkflowStatus): string {
  const colors: Record<WorkflowStatus, string> = {
    idle: 'gray',
    running: 'cyan',
    completed: 'green',
    failed: 'red',
    cancelled: 'yellow',
  };
  return colors[status] || 'white';
}

export interface WorkflowTreeNodeProps {
  /** The workflow node to render */
  node: WorkflowNode;
  /** Current depth in the tree (for reference) */
  depth?: number;
  /** Prefix string for indentation (│   or spaces) */
  prefix?: string;
  /** Whether this node is the last child of its parent */
  isLast?: boolean;
  /** Whether this is the root node (no connector/prefix) */
  isRoot?: boolean;
}

/**
 * WorkflowTreeNode - Recursive tree renderer
 *
 * Renders a single workflow node with all its children using proper
 * tree structure connectors and indentation.
 *
 * @example
 * ```tsx
 * <WorkflowTreeNode node={rootNode} isRoot={true} />
 * ```
 */
export const WorkflowTreeNode: React.FC<WorkflowTreeNodeProps> = ({
  node,
  depth = 0,
  prefix = '',
  isLast = false,
  isRoot = false,
}) => {
  // Calculate connector based on position
  // Root nodes have no connector, children use ├── or └──
  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');

  // Calculate child prefix based on parent's position
  // If parent was non-last: prefix + '│   ' (vertical line continuation)
  // If parent was last: prefix + '    ' (just spaces)
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      {/* Current node */}
      <Box>
        {/* Prefix (indentation for non-root nodes) */}
        {!isRoot && <Text dimColor>{prefix}</Text>}
        {/* Connector (├── or └──) */}
        {!isRoot && <Text dimColor>{connector}</Text>}
        {/* Status icon */}
        <StatusIcon status={node.status} />
        {/* Space */}
        <Text> </Text>
        {/* Node name with status color */}
        <Text color={getStatusColor(node.status)}>{node.name}</Text>
      </Box>

      {/* Recursively render children */}
      {node.children.map((child, index) => (
        <WorkflowTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          prefix={childPrefix}
          isLast={index === node.children.length - 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
};

export default WorkflowTreeNode;
