# Vitest Testing Patterns for TypeScript Error Handling

**Research Date:** 2026-01-12
**Vitest Version:** 1.0.0
**Project:** Groundswell - Hierarchical Workflow Orchestration Engine

---

## Table of Contents

1. [Official Vitest Documentation Resources](#official-vitest-documentation-resources)
2. [Testing Error Aggregation Behavior](#testing-error-aggregation-behavior)
3. [Async Error Testing Best Practices](#async-error-testing-best-practices)
4. [Custom Error Types and Merged Errors](#custom-error-types-and-merged-errors)
5. [Concurrent/Parallel Execution Error Scenarios](#concurrentparallel-execution-error-scenarios)
6. [Common Gotchas and Pitfalls](#common-gotchas-and-pitfalls)
7. [Project-Specific Testing Patterns](#project-specific-testing-patterns)

---

## Official Vitest Documentation Resources

### Core Documentation URLs

- **Vitest Official Website:** https://vitest.dev/
- **Assertions API:** https://vitest.dev/guide/assertions.html
- **Testing TypeScript:** https://vitest.dev/guide/testing-types.html
- **Async Testing:** https://vitest.dev/guide/async.html
- **Mocking:** https://vitest.dev/guide/mocking.html
- **GitHub Repository:** https://github.com/vitest-dev/vitest

### Key Documentation Sections

1. **Error Testing Assertions**
   - `toThrow()` - Synchronous error testing
   - `rejects.toThrow()` - Async error testing
   - Custom matchers for error properties
   - Error instance checking

2. **Async Testing Patterns**
   - Promise rejection testing
   - Async/await patterns
   - Timeout handling
   - Concurrent test execution

---

## Testing Error Aggregation Behavior

### Pattern 1: Testing Error Collection and Merging

**File Reference:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`

When testing error aggregation (combining multiple errors into one), focus on:

1. **Count Validation**
2. **Unique Identification**
3. **Context Preservation**
4. **Metadata Structure**

#### Code Example: Error Aggregation Testing

```typescript
import { describe, it, expect } from 'vitest';
import { mergeWorkflowErrors } from '../../../utils/workflow-error-utils.js';
import type { WorkflowError } from '../../../types/error.js';

describe('mergeWorkflowErrors', () => {
  // Helper function to create mock errors
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

    const result = mergeWorkflowErrors([error1, error2], 'concurrentTask', 'parent-wf', 5);

    // Validate aggregated message
    expect(result.message).toBe("2 of 5 concurrent child workflows failed in task 'concurrentTask'");
    expect(result.workflowId).toBe('parent-wf');
    expect(result.stack).toBe('stack 1'); // First error's stack
    expect(result.state).toEqual({ key1: 'value1' }); // First error's state
    expect(result.logs).toHaveLength(2); // All logs aggregated
  });

  it('should deduplicate workflow IDs when errors have duplicate IDs', () => {
    const error1 = createMockWorkflowError({ workflowId: 'wf-dup' });
    const error2 = createMockWorkflowError({ workflowId: 'wf-dup' });
    const error3 = createMockWorkflowError({ workflowId: 'wf-unique' });

    const result = mergeWorkflowErrors([error1, error2, error3], 'testTask', 'parent-wf', 4);

    // Access metadata from original field
    const metadata = result.original as {
      failedWorkflowIds: string[];
    };

    expect(metadata.failedWorkflowIds).toEqual(['wf-dup', 'wf-unique']);
    expect(metadata.failedWorkflowIds).toHaveLength(2); // Deduplicated
  });
});
```

### Best Practices for Error Aggregation Testing

1. **Test Both Single and Multiple Errors**
   ```typescript
   it('should return a single error when merging one error', () => {
     const error = createMockWorkflowError({ workflowId: 'wf-1' });
     const result = mergeWorkflowErrors([error], 'testTask', 'parent-wf', 1);
     expect(result.message).toBe("1 of 1 concurrent child workflows failed in task 'testTask'");
   });
   ```

2. **Test Deduplication Logic**
   - Ensure duplicate IDs are properly handled
   - Validate unique identifier preservation

3. **Test Array Flattening**
   ```typescript
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
       ],
     });

     const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);
     expect(result.logs).toHaveLength(3);
   });
   ```

4. **Test Metadata Preservation**
   ```typescript
   it('should include metadata in original field', () => {
     const error1 = createMockWorkflowError({ workflowId: 'wf-1' });
     const error2 = createMockWorkflowError({ workflowId: 'wf-2' });

     const result = mergeWorkflowErrors([error1, error2], 'concurrentTask', 'parent-wf', 5);

     const metadata = result.original as {
       name: string;
       message: string;
       errors: WorkflowError[];
       totalChildren: number;
       failedChildren: number;
       failedWorkflowIds: string[];
     };

     expect(metadata.name).toBe('WorkflowAggregateError');
     expect(metadata.totalChildren).toBe(5);
     expect(metadata.failedChildren).toBe(2);
   });
   ```

---

## Async Error Testing Best Practices

### Pattern 1: Using `rejects.toThrow()` for Async Errors

The most common and recommended pattern for async error testing:

```typescript
import { describe, it, expect } from 'vitest';

describe('async error testing', () => {
  it('should throw error', async () => {
    await expect(asyncFunction()).rejects.toThrow();
    await expect(asyncFunction()).rejects.toThrow('Error message');
    await expect(asyncFunction()).rejects.toThrow(/regex/);
    await expect(asyncFunction()).rejects.toThrow(TypeError);
  });

  it('should throw custom error type', async () => {
    await expect(asyncFunction()).rejects.toThrow(CustomError);
  });
});
```

### Pattern 2: Try-Catch with Explicit Assertions

When you need to inspect error properties:

```typescript
it('should preserve error context', async () => {
  try {
    await asyncFunction();
    expect.fail('Expected function to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('specific message');
    if (error instanceof CustomError) {
      expect(error.code).toBe(404);
      expect(error.metadata).toBeDefined();
    }
  }
});
```

### Pattern 3: Promise.race for Timeout Detection

**File Reference:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`

Useful for detecting hanging promises:

```typescript
it('should verify all workflows complete with no hanging promises', async () => {
  const completedWorkflows = new Set<string>();

  // Setup tracking
  children.forEach((child) => {
    child.run().then(
      () => completedWorkflows.add(child.id),
      () => completedWorkflows.add(child.id)
    );
  });

  // ACT: Run with timeout to detect hanging promises
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: workflows hung')), 5000)
  );

  const runPromise = parent.run();

  await Promise.race([runPromise, timeoutPromise]);

  // ASSERT: All workflows accounted for (no orphans)
  expect(completedWorkflows.size).toBe(10);
});
```

### Pattern 4: Testing Expected Errors with try-catch

**From the project's concurrent test patterns:**

```typescript
class ParentWorkflow extends Workflow {
  @Task({ concurrent: true })
  async spawnChildren() {
    return [
      createChildWorkflow(this, 'Child-0', false),
      createChildWorkflow(this, 'Child-1', true), // Will fail
      createChildWorkflow(this, 'Child-2', false),
    ];
  }

  async run() {
    try {
      await this.spawnChildren();
    } catch (err) {
      // Expected - first error thrown after all complete
      return err;
    }
  }
}

const parent = new ParentWorkflow('Parent');
const thrownError = await parent.run();

// ASSERT: Error was thrown
expect(thrownError).toBeDefined();
expect((thrownError as any).message).toContain('Child-1 failed');
```

### Key Best Practices for Async Error Testing

1. **Always use `await` with `rejects.toThrow()`**
   ```typescript
   // BAD
   expect(asyncFunction()).rejects.toThrow();

   // GOOD
   await expect(asyncFunction()).rejects.toThrow();
   ```

2. **Test error messages for specificity**
   ```typescript
   await expect(asyncFunction()).rejects.toThrow('specific error message');
   await expect(asyncFunction()).rejects.toThrow(/error pattern/);
   ```

3. **Test error types when specific errors matter**
   ```typescript
   await expect(asyncFunction()).rejects.toThrow(TypeError);
   await expect(asyncFunction()).rejects.toThrow(CustomError);
   ```

4. **Use `expect.fail()` for unexpected success**
   ```typescript
   it('should throw error', async () => {
     try {
       await asyncFunction();
       expect.fail('Expected function to throw');
     } catch (error) {
       expect(error).toBeInstanceOf(Error);
     }
   });
   ```

5. **Handle expected errors gracefully**
   ```typescript
   async run() {
     try {
       await this.spawnChildren();
     } catch (err) {
       // Expected - continue with validation
       return err;
     }
   }
   ```

---

## Custom Error Types and Merged Errors

### Pattern 1: Custom Error Instance Testing

```typescript
class WorkflowAggregateError extends Error {
  constructor(
    public errors: Error[],
    public failedWorkflowIds: string[],
    public totalChildren: number,
    public failedChildren: number
  ) {
    super('Aggregate error');
    this.name = 'WorkflowAggregateError';
  }
}

describe('custom error types', () => {
  it('should throw and identify custom error', async () => {
    await expect(asyncFunction()).rejects.toThrow(WorkflowAggregateError);
  });

  it('should validate custom error properties', async () => {
    try {
      await asyncFunction();
      expect.fail('Expected WorkflowAggregateError');
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowAggregateError);
      if (error instanceof WorkflowAggregateError) {
        expect(error.errors).toHaveLength(3);
        expect(error.failedWorkflowIds).toContain('wf-1');
        expect(error.totalChildren).toBe(5);
        expect(error.failedChildren).toBe(3);
      }
    }
  });
});
```

### Pattern 2: Testing Wrapped/Merged Errors

**Project Pattern from workflow-error-utils.test.ts:**

```typescript
it('should include metadata in original field', () => {
  const error1 = createMockWorkflowError({ workflowId: 'wf-1' });
  const error2 = createMockWorkflowError({ workflowId: 'wf-2' });

  const result = mergeWorkflowErrors([error1, error2], 'concurrentTask', 'parent-wf', 5);

  // Access wrapped metadata from original field
  const metadata = result.original as {
    name: string;
    message: string;
    errors: WorkflowError[];
    totalChildren: number;
    failedChildren: number;
    failedWorkflowIds: string[];
  };

  expect(metadata.name).toBe('WorkflowAggregateError');
  expect(metadata.errors).toEqual([error1, error2]);
  expect(metadata.totalChildren).toBe(5);
  expect(metadata.failedChildren).toBe(2);
  expect(metadata.failedWorkflowIds).toEqual(['wf-1', 'wf-2']);
});
```

### Pattern 3: Error Property Validation with `expect.objectContaining`

```typescript
it('should validate error structure without type assertion', () => {
  expect(() => throwError()).toThrow(
    expect.objectContaining({
      message: 'Error message',
      code: 'ERROR_CODE',
      workflowId: expect.any(String),
    })
  );
});
```

### Pattern 4: Testing Error State Preservation

```typescript
it('should use first error state', () => {
  const error1 = createMockWorkflowError({ state: { first: 'state1' } });
  const error2 = createMockWorkflowError({ state: { second: 'state2' } });

  const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

  expect(result.state).toEqual({ first: 'state1' });
});

it('should handle undefined state gracefully', () => {
  const error1 = createMockWorkflowError({ state: undefined as any });
  const error2 = createMockWorkflowError({ state: { hasState: 'yes' } });

  const result = mergeWorkflowErrors([error1, error2], 'testTask', 'parent-wf', 2);

  expect(result.state).toEqual({});
});
```

---

## Concurrent/Parallel Execution Error Scenarios

### Pattern 1: Testing Promise.allSettled Behavior

**File Reference:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`

Key pattern: Ensure all operations complete despite failures:

```typescript
describe('Single child failure scenarios', () => {
  it('should complete all siblings when one child fails', async () => {
    // ARRANGE: Create parent with 4 children, child[1] will fail
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Child-0', false),
          createChildWorkflow(this, 'Child-1', true), // Will fail
          createChildWorkflow(this, 'Child-2', false),
          createChildWorkflow(this, 'Child-3', false),
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected - first error thrown after all complete
        }
      }
    }

    const parent = new ParentWorkflow('Parent');

    // ACT: Run parent (children run concurrently)
    await parent.run();

    // ASSERT: All 4 children attached (Promise.allSettled completed all)
    expect(parent.children.length).toBe(4);

    // ASSERT: Verify child names match what we created
    const childNames = parent.children.map((c) => (c as any).node.name);
    expect(childNames).toContain('Child-0');
    expect(childNames).toContain('Child-1');
    expect(childNames).toContain('Child-2');
    expect(childNames).toContain('Child-3');
  });
});
```

### Pattern 2: Testing Multiple Concurrent Failures

```typescript
describe('Multiple concurrent failures', () => {
  it('should collect all errors when multiple children fail concurrently', async () => {
    // ARRANGE: Create parent with 6 children, 3 will fail
    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          createChildWorkflow(this, 'Alpha', false),
          createChildWorkflow(this, 'Beta', true), // Will fail
          createChildWorkflow(this, 'Gamma', false),
          createChildWorkflow(this, 'Delta', true), // Will fail
          createChildWorkflow(this, 'Epsilon', false),
          createChildWorkflow(this, 'Zeta', true), // Will fail
        ];
      }

      async run() {
        try {
          await this.spawnChildren();
        } catch (err) {
          // Expected
        }
      }
    }

    const parent = new ParentWorkflow('Parent');
    await parent.run();

    // ASSERT: All 6 children attached (Promise.allSettled completed all)
    expect(parent.children.length).toBe(6);
  });
});
```

### Pattern 3: Event Emission Verification

```typescript
function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });
  return events;
}

it('should emit error events for all failing workflows', async () => {
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return [
        createChildWorkflow(this, 'Good', false),
        createChildWorkflow(this, 'Bad1', true),
        createChildWorkflow(this, 'Bad2', true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  // CRITICAL: Add observer to root workflow
  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await parent.run();

  // ASSERT: Error events emitted for both failures
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(2);

  // ASSERT: Each error event has correct structure
  errorEvents.forEach((event) => {
    expect(event.type).toBe('error');
    if (event.type === 'error') {
      expect(event.error).toBeDefined();
      expect(event.error.workflowId).toBeDefined();
      expect(event.error.message).toBeDefined();
      expect(Array.isArray(event.error.logs)).toBe(true);
    }
  });
});
```

### Pattern 4: Completion Tracking (No Orphaned Promises)

```typescript
it('should ensure no orphaned workflows in mixed scenario', async () => {
  // ARRANGE: Track all completions
  const completedWorkflows = new Set<string>();

  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      const children = [
        createChildWorkflow(this, 'Alpha', false),
        createChildWorkflow(this, 'Beta', true),
        createChildWorkflow(this, 'Gamma', false),
      ];

      // Track completion for all children
      children.forEach((child) => {
        child.run().then(
          () => completedWorkflows.add(child.id),
          () => completedWorkflows.add(child.id)
        );
      });

      return children;
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  await parent.run();

  // ASSERT: All workflows accounted for (no orphans)
  expect(completedWorkflows.size).toBe(3);
  expect(parent.children.length).toBe(3);
});
```

### Pattern 5: Log Capture from Concurrent Operations

```typescript
it('should capture logs from both successful and failed workflows', async () => {
  class ChildWorkflow extends Workflow {
    private shouldFail: boolean;

    constructor(name: string, parent: Workflow, shouldFail: boolean) {
      super(name, parent);
      this.shouldFail = shouldFail;
    }

    @Step()
    async executeStep() {
      this.logger.info(`${this.node.name} is running`);
      if (this.shouldFail) {
        this.logger.error(`${this.node.name} is about to fail`);
        throw new Error(`${this.node.name} failed`);
      }
      this.logger.info(`${this.node.name} completed successfully`);
      return `${this.node.name} succeeded`;
    }

    async run() {
      return this.executeStep();
    }
  }

  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true })
    async spawnChildren() {
      return [
        new ChildWorkflow('SuccessChild', this, false),
        new ChildWorkflow('FailChild', this, true),
      ];
    }

    async run() {
      try {
        await this.spawnChildren();
      } catch (err) {
        // Expected
      }
    }
  }

  const parent = new ParentWorkflow('Parent');
  const allLogs: string[] = [];

  parent.addObserver({
    onLog: (entry) => allLogs.push(entry.message),
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await parent.run();

  // ASSERT: Logs from both children captured
  expect(allLogs.some((msg) => msg.includes('SuccessChild is running'))).toBe(true);
  expect(allLogs.some((msg) => msg.includes('FailChild is about to fail'))).toBe(true);
});
```

---

## Common Gotchas and Pitfalls

### Gotcha 1: Forgetting `await` with `rejects.toThrow()`

```typescript
// BAD - Test will pass even if function doesn't throw
it('bad example', () => {
  expect(asyncFunction()).rejects.toThrow();
});

// GOOD
it('good example', async () => {
  await expect(asyncFunction()).rejects.toThrow();
});
```

### Gotcha 2: Not Handling Expected Errors

```typescript
// BAD - Test will fail due to unhandled error
it('bad example', async () => {
  await expect(asyncFunction()).rejects.toThrow();
  await expect(anotherAsyncFunction()).rejects.toThrow(); // Never runs if first throws
});

// GOOD - Handle expected errors
it('good example', async () => {
  try {
    await asyncFunction();
  } catch (err) {
    // Expected
  }
  await expect(anotherAsyncFunction()).rejects.toThrow();
});
```

### Gotcha 3: Race Conditions in Concurrent Tests

```typescript
// BAD - Non-deterministic results
it('bad example', async () => {
  const promises = [asyncFn1(), asyncFn2(), asyncFn3()];
  await Promise.all(promises);
  // May fail if promises complete in different order
});

// GOOD - Use Promise.allSettled and track completion
it('good example', async () => {
  const completed = new Set<string>();
  const promises = [
    asyncFn1().finally(() => completed.add('fn1')),
    asyncFn2().finally(() => completed.add('fn2')),
    asyncFn3().finally(() => completed.add('fn3')),
  ];
  await Promise.allSettled(promises);
  expect(completed.size).toBe(3);
});
```

### Gotcha 4: Type Assertions Without Guards

```typescript
// BAD - Unsafe type assertion
it('bad example', async () => {
  try {
    await asyncFunction();
  } catch (error) {
    expect((error as CustomError).code).toBe(404); // May crash if not CustomError
  }
});

// GOOD - Use type guards
it('good example', async () => {
  try {
    await asyncFunction();
  } catch (error) {
    expect(error).toBeInstanceOf(CustomError);
    if (error instanceof CustomError) {
      expect(error.code).toBe(404);
    }
  }
});
```

### Gotcha 5: Not Testing All Concurrent Scenarios

```typescript
// BAD - Only tests failure case
it('bad example', async () => {
  await expect(failingTask()).rejects.toThrow();
});

// GOOD - Test all scenarios: all fail, some fail, none fail
describe('concurrent task scenarios', () => {
  it('should handle all failing', async () => { /* ... */ });
  it('should handle some failing', async () => { /* ... */ });
  it('should handle none failing', async () => { /* ... */ });
});
```

### Gotcha 6: Hanging Promises in Concurrent Tests

```typescript
// BAD - Test may hang indefinitely
it('bad example', async () => {
  const promises = [asyncFn1(), asyncFn2()];
  // If one hangs, test never completes
  await Promise.all(promises);
});

// GOOD - Use timeout
it('good example', async () => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  );

  const runPromise = Promise.all([asyncFn1(), asyncFn2()]);
  await Promise.race([runPromise, timeoutPromise]);
});
```

### Gotcha 7: Not Verifying Error Properties

```typescript
// BAD - Only checks that error was thrown
it('bad example', async () => {
  await expect(asyncFunction()).rejects.toThrow();
});

// GOOD - Verify error structure
it('good example', async () => {
  await expect(asyncFunction()).rejects.toThrow(expect.objectContaining({
    message: 'specific message',
    code: 'SPECIFIC_ERROR',
    workflowId: expect.any(String),
  }));
});
```

### Gotcha 8: Missing Observer Setup for Event Testing

```typescript
// BAD - Events won't be captured
it('bad example', async () => {
  const parent = new ParentWorkflow('Parent');
  await parent.run();
  expect(events.length).toBe(0); // Events array doesn't exist!
});

// GOOD - Setup observer before execution
it('good example', async () => {
  const parent = new ParentWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  // CRITICAL: Add observer BEFORE running
  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await parent.run();
  expect(events.length).toBeGreaterThan(0);
});
```

---

## Project-Specific Testing Patterns

### Pattern 1: Helper Functions for Test Data Creation

**From workflow-error-utils.test.ts:**

```typescript
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
```

### Pattern 2: Deterministic Child Workflow Creation

**From concurrent-task-failures.test.ts:**

```typescript
function createChildWorkflow(
  parent: Workflow,
  name: string,
  shouldFail: boolean = false
): Workflow {
  return new (class extends Workflow {
    constructor(n: string, p: Workflow) {
      super(n, p);
    }

    @Step()
    async executeStep() {
      if (shouldFail) {
        throw new Error(`${name} failed`);
      }
      return `${name} succeeded`;
    }

    async run() {
      return this.executeStep();
    }
  })(name, parent);
}
```

### Pattern 3: Event Observer Setup Pattern

```typescript
function setupEventObserver(workflow: Workflow): WorkflowEvent[] {
  const events: WorkflowEvent[] = [];
  workflow.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });
  return events;
}
```

### Pattern 4: Comprehensive Test Organization

**From concurrent-task-failures.test.ts:**

```typescript
describe('@Task decorator concurrent failure scenarios', () => {
  describe('Single child failure scenarios', () => {
    it('should complete all siblings when one child fails', async () => {
      // ARRANGE: Create parent with 4 children, child[1] will fail
      // ACT: Run parent (children run concurrently)
      // ASSERT: All 4 children attached (Promise.allSettled completed all)
    });
  });

  describe('Multiple concurrent failures', () => {
    it('should collect all errors when multiple children fail concurrently', async () => {
      // ...
    });
  });

  describe('Mixed success/failure scenarios', () => {
    it('should complete successful workflows despite failures', async () => {
      // ...
    });
  });

  describe('All children failing', () => {
    it('should handle edge case of all children failing', async () => {
      // ...
    });
  });

  describe('No orphaned workflows', () => {
    it('should verify all workflows complete with no hanging promises', async () => {
      // ...
    });
  });

  describe('Event emission verification', () => {
    it('should emit error events for all failing workflows', async () => {
      // ...
    });
  });
});
```

---

## Summary of Key Testing Patterns

### For Error Aggregation:
1. Test single error case (edge case)
2. Test multiple error aggregation
3. Test deduplication of IDs
4. Test array flattening (logs, etc.)
5. Test metadata preservation in wrapped errors
6. Test state/stack selection strategies (first error wins)

### For Async Errors:
1. Use `await expect().rejects.toThrow()` for basic cases
2. Use try-catch for detailed error inspection
3. Use `expect.fail()` for unexpected success
4. Test error messages with string or regex
5. Test error types with constructors
6. Handle expected errors gracefully

### For Custom Errors:
1. Test with `toBeInstanceOf()` and custom error class
2. Use type guards before accessing custom properties
3. Test wrapped error metadata through `original` field
4. Use `expect.objectContaining()` for partial matching
5. Test state preservation and handling of undefined values

### For Concurrent Execution:
1. Test all scenarios: all fail, some fail, none fail
2. Use `Promise.allSettled()` patterns for completion verification
3. Track completion with Sets to detect orphaned operations
4. Setup event observers before execution
5. Use timeouts to detect hanging promises
6. Verify logs from both successful and failed operations

### Common Pitfalls to Avoid:
1. Forgetting `await` with `rejects.toThrow()`
2. Not handling expected errors in test flow
3. Race conditions from improper promise handling
4. Unsafe type assertions without guards
5. Not testing all concurrent scenarios
6. Hanging promises from missing timeouts
7. Not verifying error properties thoroughly
8. Missing observer setup for event testing

---

## Additional Resources

### Project Test Files Referenced:
- `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`

### Related Types:
- `/home/dustin/projects/groundswell/src/types/error.ts` - WorkflowError interface

### Configuration:
- `/home/dustin/projects/groundswell/vitest.config.ts` - Test configuration
- `/home/dustin/projects/groundswell/package.json` - Dependencies and scripts

---

## Quick Reference: Vitest Error Testing Assertions

```typescript
// Synchronous errors
expect(() => syncFunction()).toThrow()
expect(() => syncFunction()).toThrow(Error)
expect(() => syncFunction()).toThrow('message')
expect(() => syncFunction()).toThrow(/regex/)
expect(() => syncFunction()).toThrow(CustomError)

// Async errors
await expect(asyncFunction()).rejects.toThrow()
await expect(asyncFunction()).rejects.toThrow(Error)
await expect(asyncFunction()).rejects.toThrow('message')
await expect(asyncFunction()).rejects.toThrow(/regex/)
await expect(asyncFunction()).rejects.toThrow(CustomError)

// Error property matching
expect(() => throwError()).toThrow(
  expect.objectContaining({
    message: 'specific',
    code: 'CODE',
  })
)

// Instance checking
expect(error).toBeInstanceOf(Error)
expect(error).toBeInstanceOf(CustomError)
```

---

*End of Research Report*
