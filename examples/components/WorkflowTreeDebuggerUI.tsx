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

import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import type { WorkflowNode } from '../../src/types/workflow.js';
import type { WorkflowEvent } from '../../src/types/events.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
import { WorkflowTree } from './WorkflowTree.js';

export interface WorkflowTreeDebuggerUIProps {
  /** The WorkflowTreeDebugger instance to observe */
  treeDebugger: WorkflowTreeDebugger;
}

/**
 * WorkflowTreeDebuggerUI - Reactive workflow tree debugger component
 *
 * Subscribes to the debugger's Observable event stream and updates
 * the tree display in real-time as the workflow executes.
 */
export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  treeDebugger,
}) => {
  // State for tree and stats, initialized from treeDebugger
  const [tree, setTree] = useState<WorkflowNode>(() => treeDebugger.getTree());
  const [stats, setStats] = useState(() => treeDebugger.getStats());

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
      <WorkflowTree node={tree} />
    </Box>
  );
};

export default WorkflowTreeDebuggerUI;
