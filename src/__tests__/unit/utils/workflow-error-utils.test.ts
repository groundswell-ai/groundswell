import { describe, it, expect } from 'vitest';
import { mergeWorkflowErrors } from '../../../utils/workflow-error-utils.js';
import type { WorkflowError } from '../../../types/error.js';

describe('mergeWorkflowErrors', () => {
  // Helper function to create a mock WorkflowError
  function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Test error',
      original: new Error('Original error'),
      workflowId: 'wf-test-123',
      stack: 'Error: Test error\n    at test.ts:10:15',
      state: { key: 'value' },
      logs: [
        {
          id: 'log-1',
          workflowId: 'wf-test-123',
          timestamp: Date.now(),
          level: 'error',
          message: 'Test log message',
        },
      ],
      ...overrides,
    };
  }

  it('should return a single error when merging one error', () => {
    const error = createMockWorkflowError({ workflowId: 'wf-1' });
    const result = mergeWorkflowErrors([error], 'testTask', 'parent-wf', 1);

    expect(result.message).toBe("1 of 1 concurrent child workflows failed in task 'testTask'");
    expect(result.workflowId).toBe('parent-wf');
    expect(result.logs).toEqual(error.logs);
    expect(result.stack).toBe(error.stack);
    expect(result.state).toEqual(error.state);
  });

  it('should aggregate multiple errors with unique workflow IDs', () => {
    const error1 = createMockWorkflowError({
      message: 'Error 1',
      workflowId: 'wf-1',
      stack: 'stack 1',
      state: { key1: 'value1' },
      logs: [{ id: 'log-1', workflowId: 'wf-1', timestamp: 1000, level: 'error', message: 'Log 1' }],
    });
    const error2 = createMockWorkflowError({
      message: 'Error 2',
      workflowId: 'wf-2',
      stack: 'stack 2',
      state: { key2: 'value2' },
      logs: [{ id: 'log-2', workflowId: 'wf-2', timestamp: 2000, level: 'error', message: 'Log 2' }],
    });
    const error3 = createMockWorkflowError({
      message: 'Error 3',
      workflowId: 'wf-3',
      stack: 'stack 3',
      state: { key3: 'value3' },
      logs: [{ id: 'log-3', workflowId: 'wf-3', timestamp: 3000, level: 'error', message: 'Log 3' }],
    });

    const result = mergeWorkflowErrors([error1, error2, error3], 'concurrentTask', 'parent-wf', 5);

    expect(result.message).toBe("3 of 5 concurrent child workflows failed in task 'concurrentTask'");
    expect(result.workflowId).toBe('parent-wf');
    expect(result.stack).toBe('stack 1'); // First error's stack
    expect(result.state).toEqual({ key1: 'value1' }); // First error's state
    expect(result.logs).toHaveLength(3); // All logs aggregated
  });

  it('should deduplicate workflow IDs when errors have duplicate IDs', () => {
    const error1 = createMockWorkflowError({ workflowId: 'wf-dup' });
    const error2 = createMockWorkflowError({ workflowId: 'wf-dup' });
    const error3 = createMockWorkflowError({ workflowId: 'wf-unique' });

    const result = mergeWorkflowErrors([error1, error2, error3], 'testTask', 'parent-wf', 4);

    // Access the metadata from original field
    const metadata = result.original as {
      name: string;
      message: string;
      errors: WorkflowError[];
      totalChildren: number;
      failedChildren: number;
      failedWorkflowIds: string[];
    };

    expect(metadata.failedWorkflowIds).toEqual(['wf-dup', 'wf-unique']);
    expect(metadata.failedWorkflowIds).toHaveLength(2); // Deduplicated
  });

  it('should flatten logs arrays from all errors using flatMap', () => {
    const error1 = createMockWorkflowError({
      workflowId: 'wf-1',
      logs: [
        { id: 'log-1', workflowId: 'wf-1', timestamp: 1000, level: 'info', message: 'Log 1.1' },
        { id: 'log-2', workflowId: 'wf-1', timestamp: 2000, level: 'info', message: 'Log 1.2' },
      ],
    });
    const error2 = createMockWorkflowError({
      workflowId: 'wf-2',
      logs: [
        { id: 'log-3', workflowId: 'wf-2', timestamp: 3000, level: 'error', message: 'Log 2.1' },
        { id: 'log-4', workflowId: 'wf-2', timestamp: 4000, level: 'error', message: 'Log 2.2' },
      ],
    });

    const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

    expect(result.logs).toHaveLength(4);
    expect(result.logs[0].message).toBe('Log 1.1');
    expect(result.logs[1].message).toBe('Log 1.2');
    expect(result.logs[2].message).toBe('Log 2.1');
    expect(result.logs[3].message).toBe('Log 2.2');
  });

  it('should use first error stack trace', () => {
    const error1 = createMockWorkflowError({ stack: 'First stack trace' });
    const error2 = createMockWorkflowError({ stack: 'Second stack trace' });
    const error3 = createMockWorkflowError({ stack: 'Third stack trace' });

    const result = mergeWorkflowErrors([error1, error2, error3], 'testTask', 'parent-wf', 3);

    expect(result.stack).toBe('First stack trace');
  });

  it('should use first error state', () => {
    const error1 = createMockWorkflowError({ state: { first: 'state1' } });
    const error2 = createMockWorkflowError({ state: { second: 'state2' } });

    const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

    expect(result.state).toEqual({ first: 'state1' });
  });

  it('should use empty object when first error has no state', () => {
    const error1 = createMockWorkflowError({ state: undefined as any });
    const error2 = createMockWorkflowError({ state: { hasState: 'yes' } });

    const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

    expect(result.state).toEqual({});
  });

  it('should handle undefined stack trace gracefully', () => {
    const error1 = createMockWorkflowError({ stack: undefined });
    const error2 = createMockWorkflowError({ stack: 'Has stack' });

    const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

    expect(result.stack).toBeUndefined();
  });

  it('should include metadata in original field', () => {
    const error1 = createMockWorkflowError({ workflowId: 'wf-1' });
    const error2 = createMockWorkflowError({ workflowId: 'wf-2' });
    const error3 = createMockWorkflowError({ workflowId: 'wf-3' });

    const result = mergeWorkflowErrors([error1, error2, error3], 'concurrentTask', 'parent-wf', 5);

    const metadata = result.original as {
      name: string;
      message: string;
      errors: WorkflowError[];
      totalChildren: number;
      failedChildren: number;
      failedWorkflowIds: string[];
    };

    expect(metadata.name).toBe('WorkflowAggregateError');
    expect(metadata.message).toBe("3 of 5 concurrent child workflows failed in task 'concurrentTask'");
    expect(metadata.errors).toEqual([error1, error2, error3]);
    expect(metadata.totalChildren).toBe(5);
    expect(metadata.failedChildren).toBe(3);
    expect(metadata.failedWorkflowIds).toEqual(['wf-1', 'wf-2', 'wf-3']);
  });

  it('should handle empty logs array', () => {
    const error1 = createMockWorkflowError({ logs: [] });
    const error2 = createMockWorkflowError({ logs: [] });

    const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

    expect(result.logs).toEqual([]);
  });

  it('should include task name in message', () => {
    const error = createMockWorkflowError();
    const result = mergeWorkflowErrors([error], 'myCustomTask', 'parent-wf', 1);

    expect(result.message).toContain("task 'myCustomTask'");
  });

  it('should include correct counts in message', () => {
    const errors = Array.from({ length: 3 }, (_, i) =>
      createMockWorkflowError({ workflowId: `wf-${i}` })
    );

    const result = mergeWorkflowErrors(errors, 'testTask', 'parent-wf', 10);

    expect(result.message).toBe("3 of 10 concurrent child workflows failed in task 'testTask'");
  });

  it('should preserve parent workflow ID', () => {
    const error = createMockWorkflowError({ workflowId: 'child-123' });
    const result = mergeWorkflowErrors([error], 'testTask', 'parent-abc', 1);

    expect(result.workflowId).toBe('parent-abc');
  });
});
