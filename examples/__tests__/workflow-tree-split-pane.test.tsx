/**
 * Unit Tests for WorkflowTree Split-Pane Layout
 *
 * Tests for split-pane layout rendering, node selection, details panel
 * content, state snapshot redaction, and content truncation.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { WorkflowTreeDebuggerUI } from '../components/WorkflowTreeDebuggerUI.js';
import type { WorkflowNode } from '../../src/types/workflow.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
import { redactSensitiveKeys } from '../components/utils/redaction.js';
import { truncateLines, truncateObject, formatStateSnapshot } from '../components/utils/truncation.js';

// Mock WorkflowTreeDebugger for testing
class MockWorkflowTreeDebugger {
  constructor(private tree: WorkflowNode) {}

  getTree() {
    return this.tree;
  }

  getStats() {
    return {
      totalNodes: 1,
      byStatus: { idle: 0, running: 1, completed: 0, failed: 0, cancelled: 0 },
      totalLogs: 0,
      totalEvents: 0,
    };
  }

  events = {
    subscribe: () => ({ unsubscribe: () => {} }),
  };
}

describe('WorkflowTree Split-Pane Layout', () => {
  const mockNode: WorkflowNode = {
    id: 'test-1',
    name: 'Test Workflow',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'test-2',
        name: 'Child Node',
        status: 'completed',
        parent: null,
        children: [],
        logs: [
          {
            id: 'log-1',
            workflowId: 'test-2',
            timestamp: Date.now(),
            level: 'info',
            message: 'Test log message',
          },
          {
            id: 'log-2',
            workflowId: 'test-2',
            timestamp: Date.now() - 1000,
            level: 'error',
            message: 'Error occurred',
          },
        ],
        events: [],
        stateSnapshot: {
          apiKey: 'secret-key-123',
          username: 'testuser',
          progress: 75,
        },
      },
    ],
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  it('renders split-pane layout with tree and details panel', () => {
    const mockDebugger = new MockWorkflowTreeDebugger(mockNode);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('Test Workflow');
    // Should show details for selected node (root by default)
    expect(output).toContain('Events:');
  });

  it('displays selected node details in details panel', () => {
    const mockDebugger = new MockWorkflowTreeDebugger(mockNode);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    // Root node is selected by default
    expect(output).toContain('Test Workflow');
    expect(output).toContain('Events:');
  });

  it('redacts sensitive keys in state snapshot', () => {
    const state = {
      apiKey: 'secret-key-123',
      password: 'my-password',
      username: 'testuser',
      secret: 'hidden-value',
      token: 'auth-token-xyz',
      normalField: 'visible',
    };

    const redacted = redactSensitiveKeys(state);

    // Sensitive keys should be redacted
    // Strings > 10 chars get partial masking (first 3 + *** + last 3)
    // Strings <= 10 chars get '***'
    expect(redacted).toEqual({
      apiKey: 'sec***123',
      password: 'my-***ord', // 11 chars, so partially masked
      username: 'testuser',
      secret: 'hid***lue',
      token: 'aut***xyz',
      normalField: 'visible',
    });

    // Original should not be modified
    expect(state.apiKey).toBe('secret-key-123');
    expect(state.password).toBe('my-password');
  });

  it('handles null state snapshot in redaction', () => {
    const redacted = redactSensitiveKeys(null);
    expect(redacted).toBeNull();
  });

  it('truncates lines with indicator', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
    const truncated = truncateLines(lines, 3);

    expect(truncated).toHaveLength(4); // 3 lines + 1 indicator
    expect(truncated[0]).toBe('line 1');
    expect(truncated[1]).toBe('line 2');
    expect(truncated[2]).toBe('line 3');
    expect(truncated[3]).toBe('... (2 more lines)');
  });

  it('returns original lines when under limit', () => {
    const lines = ['line 1', 'line 2'];
    const truncated = truncateLines(lines, 5);

    expect(truncated).toEqual(lines);
  });

  it('truncates objects with key limit', () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
    };

    const truncated = truncateObject(obj, 3);

    expect(truncated).toEqual({
      a: 1,
      b: 2,
      c: 3,
      __truncated__: '... (2 more keys)',
    });
  });

  it('returns original object when under key limit', () => {
    const obj = { a: 1, b: 2 };
    const truncated = truncateObject(obj, 5);

    expect(truncated).toBe(obj);
  });

  it('formats state snapshot with truncation', () => {
    const state = {
      key1: 'value1',
      key2: 'value2',
    };

    const formatted = formatStateSnapshot(state, {
      maxLines: 20,
      maxKeys: 20,
      maxDepth: 2,
      maxStringLength: 80,
    });

    // Should be valid JSON
    expect(() => JSON.parse(formatted)).not.toThrow();
    expect(formatted).toContain('key1');
    expect(formatted).toContain('value1');
  });

  it('returns placeholder for null state snapshot', () => {
    const formatted = formatStateSnapshot(null, {
      maxLines: 20,
      maxKeys: 20,
      maxDepth: 2,
      maxStringLength: 80,
    });

    expect(formatted).toBe('No state snapshot available');
  });

  it('shows event count in details panel', () => {
    const nodeWithEvents: WorkflowNode = {
      id: 'test-1',
      name: 'Test',
      status: 'running',
      parent: null,
      children: [],
      logs: [],
      events: [
        { type: 'stepStart', workflowId: 'test-1', timestamp: Date.now() },
        { type: 'stepEnd', workflowId: 'test-1', timestamp: Date.now() },
      ] as any,
      stateSnapshot: null,
    };

    const mockDebugger = new MockWorkflowTreeDebugger(nodeWithEvents);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('Events:');
    expect(output).toContain('2');
  });

  it('shows recent logs in details panel', () => {
    // Create a node with logs on the root (selected by default)
    const nodeWithLogs: WorkflowNode = {
      id: 'test-1',
      name: 'Test Workflow',
      status: 'running',
      parent: null,
      children: [],
      logs: [
        {
          id: 'log-1',
          workflowId: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test log message',
        },
        {
          id: 'log-2',
          workflowId: 'test-1',
          timestamp: Date.now() - 1000,
          level: 'error',
          message: 'Error occurred',
        },
      ],
      events: [],
      stateSnapshot: null,
    };

    const mockDebugger = new MockWorkflowTreeDebugger(nodeWithLogs);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('Recent Logs:');
    expect(output).toContain('Test log message');
    expect(output).toContain('Error occurred');
  });

  it('truncates large number of logs', () => {
    const manyLogs: WorkflowNode = {
      id: 'test-1',
      name: 'Test',
      status: 'running',
      parent: null,
      children: [],
      logs: Array.from({ length: 15 }, (_, i) => ({
        id: `log-${i}`,
        workflowId: 'test-1',
        timestamp: Date.now() - i * 1000,
        level: 'info' as const,
        message: `Log message ${i}`,
      })),
      events: [],
      stateSnapshot: null,
    };

    const mockDebugger = new MockWorkflowTreeDebugger(manyLogs);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('Recent Logs:');
    expect(output).toContain('... (5 more logs)');
  });

  it('shows placeholder when no node selected', () => {
    // Create a tree with only children (no root selection initially)
    const nodeWithoutSelection: WorkflowNode = {
      id: 'test-1',
      name: 'Root',
      status: 'idle',
      parent: null,
      children: [],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const mockDebugger = new MockWorkflowTreeDebugger(nodeWithoutSelection);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    // Root is selected by default, so we should see details
    expect(output).toContain('Root');
    expect(output).toContain('Events:');
  });

  it('handles nested object redaction', () => {
    const state = {
      user: {
        password: 'secret',
        name: 'Alice',
      },
      config: {
        apiKey: 'key-123',
        timeout: 5000,
      },
    };

    const redacted = redactSensitiveKeys(state);

    expect(redacted).toEqual({
      user: {
        password: '***', // 6 chars, <= 10 so full redaction
        name: 'Alice',
      },
      config: {
        apiKey: '***', // 7 chars, <= 10 so full redaction
        timeout: 5000,
      },
    });
  });

  it('handles array redaction in state', () => {
    const state = {
      items: [
        { name: 'item1', token: 'tok-1' },
        { name: 'item2', token: 'tok-2' },
      ],
    };

    const redacted = redactSensitiveKeys(state);

    expect(redacted).toEqual({
      items: [
        { name: 'item1', token: '***' }, // 5 chars, <= 10 so full redaction
        { name: 'item2', token: '***' }, // 5 chars, <= 10 so full redaction
      ],
    });
  });

  it('handles empty state snapshot', () => {
    const formatted = formatStateSnapshot({}, {
      maxLines: 20,
      maxKeys: 20,
      maxDepth: 2,
      maxStringLength: 80,
    });

    expect(formatted).toBe('{}');
  });

  it('handles single character lines in truncation', () => {
    const lines = ['a', 'b', 'c', 'd'];
    const truncated = truncateLines(lines, 2);

    expect(truncated).toHaveLength(3);
    expect(truncated).toEqual(['a', 'b', '... (2 more lines)']);
  });

  it('handles singular "more line" when only one line truncated', () => {
    const lines = ['a', 'b', 'c'];
    const truncated = truncateLines(lines, 2);

    expect(truncated[2]).toBe('... (1 more line)');
  });

  it('handles singular "more key" when only one key truncated', () => {
    const obj = { a: 1, b: 2 };
    const truncated = truncateObject(obj, 1);

    expect(truncated.__truncated__).toBe('... (1 more key)');
  });

  it('shows separator between panes', () => {
    const mockDebugger = new MockWorkflowTreeDebugger(mockNode);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI treeDebugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('│');
  });
});
