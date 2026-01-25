/**
 * WorkflowTreeDebuggerUI Component
 *
 * Reactive Ink component that subscribes to WorkflowTreeDebugger.events
 * Observable and re-renders the workflow tree in real-time as the workflow executes.
 *
 * Features:
 * - Subscribes to treeDebugger.events Observable for real-time updates
 * - Updates tree and stats on structural and status changes
 * - Properly cleans up Observable subscription on unmount
 * - Displays workflow statistics (total nodes, by status)
 *
 * @example
 * ```tsx
 * import { WorkflowTreeDebuggerUI } from './components/WorkflowTreeDebuggerUI.js';
 * import { render } from 'ink';
 * import { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
 *
 * const treeDebugger = new WorkflowTreeDebugger(workflow);
 *
 * render(
 *   <WorkflowTreeDebuggerUI treeDebugger={treeDebugger} />,
 *   { exitOnCtrlC: true, maxFps: 30 }
 * );
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import type { WorkflowNode } from '../../src/types/workflow.js';
import type { WorkflowEvent } from '../../src/types/events.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
import { WorkflowTree } from './WorkflowTree.js';
import { NodeDetailsPanel } from './NodeDetailsPanel.js';

/**
 * Configuration for smart default expansion
 */
interface ExpandConfig {
  maxDefaultDepth: number;
  expandErrors: boolean;
  expandRunning: boolean;
  expandCompleted: boolean;
}

/**
 * Default expansion configuration
 */
const DEFAULT_CONFIG: ExpandConfig = {
  maxDefaultDepth: 2,        // Expand first 2 levels
  expandErrors: true,        // Always expand failed nodes
  expandRunning: true,       // Always expand running nodes
  expandCompleted: false,    // Collapse completed nodes
};

/**
 * Initialize expanded state with smart defaults
 *
 * Rules:
 * - Root is always expanded
 * - Failed/cancelled nodes are always expanded
 * - Running nodes are always expanded
 * - First N levels are expanded (configurable)
 */
function initializeExpandedState(
  root: WorkflowNode,
  config: ExpandConfig = DEFAULT_CONFIG
): Set<string> {
  const expandedIds = new Set<string>();

  function traverse(node: WorkflowNode, depth: number): void {
    // Rule 1: Root is always expanded
    if (depth === 0) {
      expandedIds.add(node.id);
    }

    // Rule 2: Always expand failed/cancelled nodes
    if (config.expandErrors && (node.status === 'failed' || node.status === 'cancelled')) {
      expandedIds.add(node.id);
    }

    // Rule 3: Always expand running nodes
    if (config.expandRunning && node.status === 'running') {
      expandedIds.add(node.id);
    }

    // Rule 4: Expand first N levels
    if (depth < config.maxDefaultDepth) {
      expandedIds.add(node.id);
    }

    // Recurse to children
    node.children.forEach(child => traverse(child, depth + 1));
  }

  traverse(root, 0);
  return expandedIds;
}

/**
 * Helper: Find node by ID in tree
 */
function findNodeById(root: WorkflowNode, id: string): WorkflowNode | null {
  if (root.id === id) return root;

  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Helper: Collect all node IDs
 */
function collectAllNodeIds(root: WorkflowNode): string[] {
  const ids: string[] = [];

  function traverse(node: WorkflowNode) {
    ids.push(node.id);
    node.children.forEach(traverse);
  }

  traverse(root);
  return ids;
}

export interface WorkflowTreeDebuggerUIProps {
  /** The WorkflowTreeDebugger instance to observe */
  treeDebugger: WorkflowTreeDebugger;
}

/**
 * WorkflowTreeDebuggerUI - Reactive workflow tree debugger component
 *
 * Subscribes to the debugger's Observable event stream and updates
 * the tree display in real-time as the workflow executes.
 *
 * Features:
 * - Expand/collapse functionality with keyboard navigation
 * - Smart default expansion (root, failed/running nodes, first 2 levels)
 * - Arrow key navigation (↑/↓)
 * - Enter/Space to toggle expand/collapse
 * - * to expand all, / to collapse all
 */
export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  treeDebugger,
}) => {
  // State for tree and stats, initialized from treeDebugger
  const [tree, setTree] = useState<WorkflowNode>(() => treeDebugger.getTree());
  const [stats, setStats] = useState(() => treeDebugger.getStats());

  // Expand/collapse state with smart defaults
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    initializeExpandedState(treeDebugger.getTree())
  );

  // Selection state for keyboard navigation
  const [selectedId, setSelectedId] = useState<string | null>(() => treeDebugger.getTree().id);

  // Toggle handler for expand/collapse
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Flattened node list for navigation (visible nodes only)
  const visibleNodes = useMemo(() => {
    const nodes: { id: string; depth: number }[] = [];

    function traverse(node: WorkflowNode, depth: number) {
      nodes.push({ id: node.id, depth });

      // Only add children if expanded
      if (expandedIds.has(node.id) && node.children.length > 0) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }

    traverse(tree, 0);
    return nodes;
  }, [tree, expandedIds]);

  // Current selection index
  const selectedIndex = useMemo(() => {
    return visibleNodes.findIndex(n => n.id === selectedId);
  }, [visibleNodes, selectedId]);

  // Keyboard input handling
  useInput((input, key) => {
    // Toggle expand/collapse
    if (key.return || input === ' ') {
      if (selectedId) {
        const node = findNodeById(tree, selectedId);
        if (node && node.children.length > 0) {
          handleToggle(selectedId);
        }
      }
      return;
    }

    // Navigate up
    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedId(visibleNodes[selectedIndex - 1].id);
      }
      return;
    }

    // Navigate down
    if (key.downArrow) {
      if (selectedIndex < visibleNodes.length - 1) {
        setSelectedId(visibleNodes[selectedIndex + 1].id);
      }
      return;
    }

    // Expand all
    if (input === '*') {
      const allIds = collectAllNodeIds(tree);
      setExpandedIds(new Set(allIds));
      return;
    }

    // Collapse all (keep root expanded)
    if (input === '/') {
      setExpandedIds(new Set([tree.id]));
      return;
    }
  });

  // Subscribe to Observable for real-time updates
  useEffect(() => {
    const subscription = treeDebugger.events.subscribe({
      next: (event: WorkflowEvent) => {
        // Update tree on structural and status changes
        switch (event.type) {
          case 'childAttached':
          case 'childDetached':
          case 'treeUpdated':
          case 'stepStart':
          case 'stepEnd':
          case 'error':
          case 'taskStart':
          case 'taskEnd':
            // Refresh tree and stats from treeDebugger
            setTree(treeDebugger.getTree());
            setStats(treeDebugger.getStats());
            break;
        }
      },
    });

    // Cleanup: unsubscribe on unmount to prevent memory leaks
    return () => subscription.unsubscribe();
  }, [treeDebugger]);

  // Get selected node for details panel
  const selectedNode = useMemo(() => {
    return selectedId ? findNodeById(tree, selectedId) : null;
  }, [selectedId, tree]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Workflow Tree Debugger (Reactive)
        </Text>
      </Box>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <Text dimColor>
        Nodes: {stats.totalNodes} | Completed: {stats.byStatus.completed || 0} | Failed: {stats.byStatus.failed || 0}
      </Text>
      <Newline />
      <Text dimColor>
        Enter/Space: Toggle | ↑/↓: Navigate | *: Expand all | /: Collapse all
      </Text>
      <Newline />

      {/* Split-pane layout */}
      <Box flexDirection="row">
        {/* Left pane: Tree view (60%) */}
        <Box width="60%" paddingRight={1}>
          <WorkflowTree
            node={tree}
            expandedIds={expandedIds}
            selectedId={selectedId}
          />
        </Box>

        {/* Separator */}
        <Box width={1}>
          <Text dimColor>│</Text>
        </Box>

        {/* Right pane: Node details (40%) */}
        <Box width="39%" paddingLeft={1}>
          <NodeDetailsPanel node={selectedNode} />
        </Box>
      </Box>
    </Box>
  );
};

export default WorkflowTreeDebuggerUI;
