/**
 * NodeDetailsPanel Component
 *
 * Displays detailed information about a selected workflow node in the
 * split-pane debugger UI. Shows:
 * - Node header (name + status icon)
 * - Event count
 * - State snapshot (redacted and truncated)
 * - Recent logs (reverse chronological, max 10 entries)
 *
 * This panel appears on the right side of the split-pane layout.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { StatusIcon } from './StatusIcon.js';
import { formatStateSnapshot, DEFAULT_DISPLAY_CONFIG } from './utils/truncation.js';
import { redactSensitiveKeys } from './utils/redaction.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

export interface NodeDetailsPanelProps {
  /** The selected workflow node to display (null if no node selected) */
  node: WorkflowNode | null;
}

/**
 * NodeDetailsPanel - Displays selected node details
 *
 * Shows comprehensive information about the selected node including
 * state snapshot, logs, and events. Content is automatically redacted
 * and truncated to prevent terminal flooding.
 *
 * @example
 * ```tsx
 * <NodeDetailsPanel node={selectedNode} />
 * ```
 */
export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node }) => {
  // Memoize redacted state to avoid re-processing on every render
  const redactedState = useMemo(() => {
    if (!node?.stateSnapshot) return null;
    return redactSensitiveKeys(node.stateSnapshot);
  }, [node?.stateSnapshot]);

  // Memoize formatted state display
  const stateDisplay = useMemo(() => {
    if (!redactedState) return null;
    return formatStateSnapshot(redactedState, DEFAULT_DISPLAY_CONFIG.state);
  }, [redactedState]);

  // Memoize recent logs (last N, reverse chronological)
  const recentLogs = useMemo(() => {
    if (!node?.logs) return [];
    const sorted = [...node.logs].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, DEFAULT_DISPLAY_CONFIG.logs.maxEntries);
  }, [node?.logs]);

  if (!node) {
    return (
      <Box
        flexDirection="column"
        padding={1}
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <Text dimColor>Select a node to view details</Text>
        <Text dimColor>Use ↑/↓ arrow keys to navigate</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>{node.name}</Text>
        <Text> </Text>
        <StatusIcon status={node.status} />
      </Box>

      {/* Event Count */}
      <Box marginBottom={1}>
        <Text dimColor>Events: </Text>
        <Text bold>{node.events.length}</Text>
      </Box>

      {/* State Snapshot */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">State Snapshot:</Text>
        {stateDisplay ? (
          <Box paddingX={1}>
            <Text color="gray">{stateDisplay}</Text>
          </Box>
        ) : (
          <Text dimColor>No state snapshot available</Text>
        )}
      </Box>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="yellow">Recent Logs:</Text>
          {recentLogs.map((log) => (
            <Box key={log.id} marginBottom={1}>
              <Text dimColor>
                [{new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}]
              </Text>
              <Text> </Text>
              <Text
                color={
                  log.level === 'error' ? 'red' :
                  log.level === 'warn' ? 'yellow' :
                  log.level === 'info' ? 'blue' :
                  'gray'
                }
              >
                {log.level.toUpperCase()}
              </Text>
              <Text> </Text>
              <Text>{log.message}</Text>
            </Box>
          ))}
          {node.logs.length > DEFAULT_DISPLAY_CONFIG.logs.maxEntries && (
            <Text dimColor>
              ... ({node.logs.length - DEFAULT_DISPLAY_CONFIG.logs.maxEntries} more log{node.logs.length - DEFAULT_DISPLAY_CONFIG.logs.maxEntries === 1 ? '' : 's'})
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default NodeDetailsPanel;
