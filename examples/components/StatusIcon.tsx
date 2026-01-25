/**
 * StatusIcon Component
 *
 * Renders a colored status symbol based on workflow node status.
 * Matches STATUS_SYMBOLS from src/debugger/tree-debugger.ts (lines 15-21).
 *
 * Status Colors:
 * - idle: gray (○)
 * - running: cyan (◐)
 * - completed: green (✓)
 * - failed: red (✗)
 * - cancelled: yellow (⊘)
 */

import React from 'react';
import { Text } from 'ink';
import type { WorkflowStatus } from '../../src/types/workflow.js';

/**
 * Status symbols matching tree-debugger.ts STATUS_SYMBOLS
 */
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

/**
 * Status colors for visual distinction
 * Note: running uses cyan (not yellow) per PRP specification
 */
const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
};

export interface StatusIconProps {
  /** The workflow status to display */
  status: WorkflowStatus;
}

/**
 * StatusIcon component renders a colored status symbol
 *
 * @example
 * ```tsx
 * <StatusIcon status="running" /> // Renders: ◐ (cyan)
 * <StatusIcon status="completed" /> // Renders: ✓ (green)
 * <StatusIcon status="failed" /> // Renders: ✗ (red)
 * ```
 */
export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const color = STATUS_COLORS[status] || 'white';
  const symbol = STATUS_SYMBOLS[status] || '?';

  return (
    <Text color={color}>
      {symbol}
    </Text>
  );
};

export default StatusIcon;
