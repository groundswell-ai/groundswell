#!/usr/bin/env node
/**
 * Ink Hello-World Prototype for Workflow Tree Debugger
 *
 * This prototype demonstrates:
 * - Basic Ink component structure with React
 * - Recursive tree rendering matching toTreeString() pattern
 * - Status icons matching STATUS_SYMBOLS from tree-debugger.ts
 * - Proper use of Box, Text, and Newline components
 *
 * Run with: tsx examples/examples/ink-debugger-hello.tsx
 * Or: npm run start:ink
 */

import React from 'react';
import { render, Box, Text, Newline } from 'ink';

// ============================================================================
// Types
// ============================================================================

/**
 * Simplified workflow node interface for prototype
 * Matches WorkflowNode structure from src/types/workflow.ts
 */
interface WorkflowNode {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  children?: WorkflowNode[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Status symbols matching STATUS_SYMBOLS from tree-debugger.ts (lines 15-21)
 * These symbols provide visual indication of workflow node status
 */
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

/**
 * Color mapping for status symbols
 * Provides visual distinction between different states
 */
const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'cyan',
};

// ============================================================================
// Components
// ============================================================================

/**
 * StatusIcon Component
 *
 * Renders a colored status symbol based on node status
 * Matches the visual style of tree-debugger.ts toTreeString() output
 */
const StatusIcon = ({ status }: { status: string }) => {
  const color = STATUS_COLORS[status] || 'white';
  const symbol = STATUS_SYMBOLS[status] || '?';

  return (
    <Text color={color}>
      {symbol}
    </Text>
  );
};

/**
 * WorkflowTree Component
 *
 * Recursively renders workflow tree structure with:
 * - Proper indentation using spaces
 * - Branch connectors (├─ for non-last, └─ for last child)
 * - Status icons and node names
 * - Color coding for failed nodes
 *
 * Pattern matches renderTree() from tree-debugger.ts (lines 217-245)
 */
const WorkflowTree = ({ node, depth = 0, isLast = true }: {
  node: WorkflowNode;
  depth?: number;
  isLast?: boolean;
}) => {
  const indent = '  '.repeat(depth);
  const isRoot = depth === 0;
  const branch = !isRoot ? (isLast ? '└─ ' : '├─ ') : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text dimColor>{branch}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={node.status === 'failed' ? 'red' : 'white'}>
          {node.name}
        </Text>
      </Box>
      {node.children?.map((child, index) => {
        const isLastChild = index === (node.children?.length ?? 0) - 1;
        return (
          <WorkflowTree
            key={child.id}
            node={child}
            depth={depth + 1}
            isLast={isLastChild}
          />
        );
      })}
    </Box>
  );
};

/**
 * App Component
 *
 * Main application component that:
 * - Displays a header with title and instructions
 * - Renders a sample workflow tree demonstrating various states
 * - Shows nested workflow structure with multiple status types
 */
const App = () => {
  // Sample workflow data demonstrating tree structure
  // This mimics real workflow execution with various states
  const workflow: WorkflowNode = {
    id: 'root',
    name: 'Build Application',
    status: 'running',
    children: [
      {
        id: 'deps',
        name: 'Install Dependencies',
        status: 'completed',
        children: [
          {
            id: 'npm',
            name: 'npm install',
            status: 'completed',
            children: [],
          },
          {
            id: 'audit',
            name: 'npm audit',
            status: 'completed',
            children: [],
          },
        ],
      },
      {
        id: 'lint',
        name: 'Run Linter',
        status: 'running',
        children: [],
      },
      {
        id: 'test',
        name: 'Run Tests',
        status: 'idle',
        children: [
          {
            id: 'unit',
            name: 'Unit Tests',
            status: 'idle',
            children: [],
          },
          {
            id: 'integration',
            name: 'Integration Tests',
            status: 'idle',
            children: [],
          },
        ],
      },
      {
        id: 'build',
        name: 'Build Production Bundle',
        status: 'failed',
        children: [
          {
            id: 'webpack',
            name: 'Webpack Bundle',
            status: 'failed',
            children: [],
          },
        ],
      },
      {
        id: 'deploy',
        name: 'Deploy to Production',
        status: 'cancelled',
        children: [],
      },
    ],
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Workflow Tree Debugger (Ink Prototype)
      </Text>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <WorkflowTree node={workflow} />
    </Box>
  );
};

// ============================================================================
// Render
// ============================================================================

/**
 * Render the app with exitOnCtrlC enabled
 *
 * CRITICAL: Always set exitOnCtrlC: true to allow clean exit
 * Without this, Ctrl+C won't work and user must kill process
 */
render(<App />, { exitOnCtrlC: true });
