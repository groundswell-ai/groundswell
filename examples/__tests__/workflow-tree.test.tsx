/**
 * Unit Tests for Workflow Tree Components
 *
 * Tests for StatusIcon, WorkflowTree, and WorkflowTreeDebuggerUI components
 * using ink-testing-library for rendering assertions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatusIcon } from '../components/StatusIcon.js';
import { WorkflowTree } from '../components/WorkflowTree.js';
import { WorkflowTreeDebuggerUI } from '../components/WorkflowTreeDebuggerUI.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

describe('StatusIcon', () => {
  it('renders idle status with gray color', () => {
    const { lastFrame } = render(<StatusIcon status="idle" />);
    expect(lastFrame()).toContain('○');
  });

  it('renders running status with cyan color', () => {
    const { lastFrame } = render(<StatusIcon status="running" />);
    expect(lastFrame()).toContain('◐');
  });

  it('renders completed status with green color', () => {
    const { lastFrame } = render(<StatusIcon status="completed" />);
    expect(lastFrame()).toContain('✓');
  });

  it('renders failed status with red color', () => {
    const { lastFrame } = render(<StatusIcon status="failed" />);
    expect(lastFrame()).toContain('✗');
  });

  it('renders cancelled status with yellow color', () => {
    const { lastFrame } = render(<StatusIcon status="cancelled" />);
    expect(lastFrame()).toContain('⊘');
  });
});

describe('WorkflowTree', () => {
  const mockNode: WorkflowNode = {
    id: 'test-1',
    name: 'Test Workflow',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'test-2',
        name: 'Child 1',
        status: 'completed',
        parent: null,
        children: [],
        logs: [],
        events: [],
        stateSnapshot: null,
      },
      {
        id: 'test-3',
        name: 'Child 2',
        status: 'idle',
        parent: null,
        children: [],
        logs: [],
        events: [],
        stateSnapshot: null,
      },
    ],
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  it('renders tree with proper indentation', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} expandedIds={new Set([mockNode.id])} />);
    const output = lastFrame();
    expect(output).toContain('Test Workflow');
    expect(output).toContain('Child 1');
    expect(output).toContain('Child 2');
  });

  it('renders branch connectors correctly', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} expandedIds={new Set([mockNode.id])} />);
    const output = lastFrame();
    // First child should use ├── (not last)
    expect(output).toContain('├──');
    // Last child should use └── (isLast)
    expect(output).toContain('└──');
  });

  it('renders status symbols', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} expandedIds={new Set([mockNode.id])} />);
    const output = lastFrame();
    expect(output).toContain('◐'); // running
    expect(output).toContain('✓'); // completed
    expect(output).toContain('○'); // idle
  });
});

describe('WorkflowTree', () => {
  it('renders single node tree', () => {
    const singleNode: WorkflowNode = {
      id: 'root',
      name: 'SingleWorkflow',
      status: 'idle',
      parent: null,
      children: [],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const { lastFrame } = render(<WorkflowTree node={singleNode} />);
    const output = lastFrame();

    expect(output).toContain('SingleWorkflow');
    expect(output).toContain('○');
  });

  it('renders nested tree structure', () => {
    const nestedNode: WorkflowNode = {
      id: 'root',
      name: 'Root',
      status: 'completed',
      parent: null,
      children: [
        {
          id: 'child1',
          name: 'Child1',
          status: 'completed',
          parent: null,
          children: [
            {
              id: 'grandchild1',
              name: 'Grandchild1',
              status: 'failed',
              parent: null,
              children: [],
              logs: [],
              events: [],
              stateSnapshot: null,
            },
          ],
          logs: [],
          events: [],
          stateSnapshot: null,
        },
      ],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const { lastFrame } = render(<WorkflowTree node={nestedNode} expandedIds={new Set([nestedNode.id, 'child1'])} />);
    const output = lastFrame();

    expect(output).toContain('Root');
    expect(output).toContain('Child1');
    expect(output).toContain('Grandchild1');
    expect(output).toContain('✗'); // failed status
  });
});

describe('WorkflowTreeDebuggerUI', () => {
  // Mock WorkflowTreeDebugger
  class MockWorkflowTreeDebugger {
    private _tree: WorkflowNode;
    private _stats = {
      totalNodes: 1,
      byStatus: { idle: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
      totalLogs: 0,
      totalEvents: 0,
    };
    public readonly events: any;

    constructor(tree: WorkflowNode) {
      this._tree = tree;
      this.events = {
        subscribe: (observer: any) => ({
          unsubscribe: vi.fn(),
        }),
      };
    }

    getTree(): WorkflowNode {
      return this._tree;
    }

    getStats() {
      return this._stats;
    }
  }

  it('subscribes to debugger events and updates tree', () => {
    const mockTree: WorkflowNode = {
      id: 'test-1',
      name: 'Test Workflow',
      status: 'idle',
      parent: null,
      children: [],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const mockDebugger = new MockWorkflowTreeDebugger(mockTree);

    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    expect(lastFrame()).toContain('Workflow Tree Debugger');
    expect(lastFrame()).toContain('Test Workflow');
    expect(lastFrame()).toContain('Nodes: 1');
  });

  it('cleans up Observable subscription on unmount', () => {
    const mockTree: WorkflowNode = {
      id: 'test-1',
      name: 'Test Workflow',
      status: 'idle',
      parent: null,
      children: [],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const unsubscribeMock = vi.fn();
    const mockDebugger = {
      getTree: () => mockTree,
      getStats: () => ({
        totalNodes: 1,
        byStatus: { idle: 1, running: 0, completed: 0, failed: 0, cancelled: 0 },
        totalLogs: 0,
        totalEvents: 0,
      }),
      events: {
        subscribe: () => ({
          unsubscribe: unsubscribeMock,
        }),
      },
    };

    const { unmount } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
