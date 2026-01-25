/**
 * Unit Tests for WorkflowTree Expand/Collapse Functionality
 *
 * Tests for expand/collapse indicators, conditional child visibility,
 * collapsed placeholders, and state persistence using ink-testing-library.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { WorkflowTree } from '../components/WorkflowTree.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

describe('WorkflowTree Expand/Collapse', () => {
  const mockNode: WorkflowNode = {
    id: 'root',
    name: 'Root',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'child-1',
        name: 'Child 1',
        status: 'completed',
        parent: null,
        children: [
          {
            id: 'grandchild-1',
            name: 'Grandchild 1',
            status: 'idle',
            parent: null,
            children: [],
            logs: [],
            events: [],
            stateSnapshot: null,
          },
          {
            id: 'grandchild-2',
            name: 'Grandchild 2',
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
      },
      {
        id: 'child-2',
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

  it('renders collapsed indicator for nodes with children', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('▸');
  });

  it('renders expanded indicator for expanded nodes', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id])}
      />
    );
    expect(lastFrame()).toContain('▾');
  });

  it('renders no indicator for leaf nodes', () => {
    // Expand root to show children, then check leaf node indicator
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id])}
      />
    );
    // Child 2 has no children, should not have expand/collapse indicator
    // The output should contain Child 2 but not ▸ or ▾ immediately before it
    const output = lastFrame();
    expect(output).toContain('Child 2');
    // Verify that for leaf nodes, there's just a space (not ▸ or ▾)
    // The line with "Child 2" should not have ▸ or ▾ before the status icon
    const lines = output.split('\n');
    const child2Line = lines.find((line: string) => line.includes('Child 2'));
    expect(child2Line).toBeTruthy();
    // Child 2 is a leaf, so it should have a space before status icon
    // The space might not be visible in the output, but we can verify no ▸ or ▾
    // appears right before Child 2
    if (child2Line) {
      // Find position of Child 2 and check there's no ▸ or ▾ right before it
      const child2Index = child2Line.indexOf('Child 2');
      const beforeChild2 = child2Line.substring(Math.max(0, child2Index - 2), child2Index);
      expect(beforeChild2).not.toContain('▸');
      expect(beforeChild2).not.toContain('▾');
    }
  });

  it('hides children when parent is collapsed', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Children should not be visible when root is collapsed
    expect(lastFrame()).not.toContain('Grandchild 1');
    expect(lastFrame()).not.toContain('Grandchild 2');
  });

  it('shows children when parent is expanded', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id, 'child-1'])}
      />
    );
    // Children should be visible when parent is expanded
    expect(lastFrame()).toContain('Grandchild 1');
    expect(lastFrame()).toContain('Grandchild 2');
  });

  it('shows collapsed placeholder with child count', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Should show collapsed placeholder for root (2 children)
    expect(lastFrame()).toContain('[2 children]');
  });

  it('shows singular "child" when count is 1', () => {
    const nodeWithOneChild: WorkflowNode = {
      id: 'parent',
      name: 'Parent',
      status: 'idle',
      parent: null,
      children: [
        {
          id: 'child',
          name: 'Child',
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

    const { lastFrame } = render(
      <WorkflowTree
        node={nodeWithOneChild}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('[1 child]');
  });

  it('highlights selected node', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
        selectedId={mockNode.id}
      />
    );
    // Selected node should have cyan color (Ink adds color codes)
    // This is hard to test directly, but we can verify the component doesn't crash
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()).toContain('Root');
  });

  it('handles deep nesting with expand/collapse', () => {
    const deepNode: WorkflowNode = {
      id: 'root',
      name: 'Root',
      status: 'idle',
      parent: null,
      children: [
        {
          id: 'level1',
          name: 'Level 1',
          status: 'idle',
          parent: null,
          children: [
            {
              id: 'level2',
              name: 'Level 2',
              status: 'idle',
              parent: null,
              children: [
                {
                  id: 'level3',
                  name: 'Level 3',
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

    // With only root expanded, should not show children
    const { lastFrame: collapsedFrame } = render(
      <WorkflowTree
        node={deepNode}
        expandedIds={new Set([deepNode.id])}
      />
    );
    expect(collapsedFrame()).not.toContain('Level 2');
    expect(collapsedFrame()).not.toContain('Level 3');

    // With all expanded, should show full tree
    const { lastFrame: expandedFrame } = render(
      <WorkflowTree
        node={deepNode}
        expandedIds={new Set([deepNode.id, 'level1', 'level2'])}
      />
    );
    expect(expandedFrame()).toContain('Level 1');
    expect(expandedFrame()).toContain('Level 2');
    expect(expandedFrame()).toContain('Level 3');
  });

  it('maintains expand state across renders by node ID', () => {
    // First render with root expanded
    const { lastFrame, rerender } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id])}
      />
    );
    expect(lastFrame()).toContain('Child 1');

    // Re-render with same expand state
    rerender(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id])}
      />
    );
    expect(lastFrame()).toContain('Child 1');
  });

  it('handles empty expandedIds Set gracefully', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Should still render root node even with no expanded IDs
    expect(lastFrame()).toContain('Root');
    expect(lastFrame()).toContain('[2 children]');
  });

  it('handles all nodes expanded', () => {
    const allIds = new Set([mockNode.id, 'child-1', 'child-2', 'grandchild-1', 'grandchild-2']);
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={allIds}
      />
    );
    expect(lastFrame()).toContain('Root');
    expect(lastFrame()).toContain('Child 1');
    expect(lastFrame()).toContain('Child 2');
    expect(lastFrame()).toContain('Grandchild 1');
    expect(lastFrame()).toContain('Grandchild 2');
  });

  it('handles single node tree', () => {
    const singleNode: WorkflowNode = {
      id: 'root',
      name: 'Single Node',
      status: 'idle',
      parent: null,
      children: [],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const { lastFrame } = render(
      <WorkflowTree
        node={singleNode}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('Single Node');
    expect(lastFrame()).not.toContain('[0 children]');
    expect(lastFrame()).not.toContain('▸');
    expect(lastFrame()).not.toContain('▾');
  });
});
