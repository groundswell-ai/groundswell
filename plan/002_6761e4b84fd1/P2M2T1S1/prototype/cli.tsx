#!/usr/bin/env node
/**
 * Ink Workflow Tree Debugger - Hello World Prototype
 *
 * This is a simple prototype demonstrating Ink's capabilities
 * for building a workflow tree debugger CLI.
 */

import React from 'react';
import { render, Box, Text, Newline } from 'ink';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  children?: WorkflowNode[];
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * StatusIcon - Displays an icon based on workflow status
 */
const StatusIcon = ({ status }: { status: WorkflowNode['status'] }) => {
  const icons = {
    pending: <Text color="gray">○</Text>,
    running: <Text color="yellow">◉</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status];
};

/**
 * WorkflowTree - Recursively renders workflow tree structure
 */
const WorkflowTree = ({ node, depth = 0 }: { node: WorkflowNode; depth?: number }) => {
  const indent = '  '.repeat(depth);
  const branch = depth > 0 ? '├─ ' : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text dimColor>{branch}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={node.status === 'failed' ? 'red' : 'white'}>
          {node.label}
        </Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
};

/**
 * App - Main application component
 */
const App = () => {
  // Sample workflow data representing a build process
  const workflow: WorkflowNode = {
    id: 'root',
    label: 'Build Application',
    status: 'running',
    children: [
      {
        id: 'deps',
        label: 'Install Dependencies',
        status: 'completed',
        children: [
          { id: 'npm', label: 'npm install', status: 'completed' },
          { id: 'audit', label: 'npm audit', status: 'completed' },
        ],
      },
      {
        id: 'lint',
        label: 'Run Linter',
        status: 'running',
        children: [],
      },
      {
        id: 'test',
        label: 'Run Tests',
        status: 'pending',
        children: [
          { id: 'unit', label: 'Unit Tests', status: 'pending' },
          { id: 'int', label: 'Integration Tests', status: 'pending' },
        ],
      },
    ],
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Workflow Tree Debugger
      </Text>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <WorkflowTree node={workflow} />
    </Box>
  );
};

// ============================================================================
// MAIN
// ============================================================================

// Render the app with exit on Ctrl+C
render(<App />, { exitOnCtrlC: true });
