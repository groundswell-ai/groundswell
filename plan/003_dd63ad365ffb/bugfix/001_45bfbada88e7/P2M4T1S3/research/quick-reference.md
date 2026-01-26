# Error Aggregation Testing - Quick Reference

**Related:** P2.M4.T1.S3 - Comprehensive Error Merge Test Coverage
**Full Document:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S3/research/external-test-best-practices.md`

---

## Essential Helper Functions

### Mock Error Creation

```typescript
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { key: 'value' },
    logs: [{ id: 'log-1', workflowId: 'wf-test-123', timestamp: Date.now(), level: 'error', message: 'Test log message' }],
    ...overrides,
  };
}
```

### Event Observer Setup

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

### Child Workflow Creation

```typescript
function createChildWorkflow(parent: Workflow, name: string, shouldFail: boolean = false): Workflow {
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

---

## Key Testing Patterns

### 1. Testing Error Aggregation

```typescript
it('should aggregate multiple errors', async () => {
  const errors = [
    createMockWorkflowError({ message: 'Error 1', workflowId: 'wf-1' }),
    createMockWorkflowError({ message: 'Error 2', workflowId: 'wf-2' }),
    createMockWorkflowError({ message: 'Error 3', workflowId: 'wf-3' }),
  ];

  const result = mergeWorkflowErrors(errors, 'taskName', 'parent-wf', 5);

  expect(result.message).toBe("3 of 5 concurrent child workflows failed in task 'taskName'");
  expect(result.logs).toHaveLength(3);
});
```

### 2. Testing Custom Combine Function

```typescript
it('should call custom combine function', async () => {
  const combineSpy = vi.fn((errors: WorkflowError[]) => ({
    message: `Custom merge: ${errors.length} errors`,
    original: errors,
    workflowId: 'custom-parent',
    logs: errors.flatMap((e) => e.logs),
    stack: errors[0]?.stack,
    state: errors[0]?.state || {},
  }));

  // ... workflow setup with errorMergeStrategy: { enabled: true, combine: combineSpy } ...

  await workflow.run();

  expect(combineSpy).toHaveBeenCalledTimes(1);
  expect(combineSpy.mock.calls[0][0]).toHaveLength(2); // Verify errors passed
});
```

### 3. Testing Event Emission

```typescript
it('should emit error events', async () => {
  const events = setupEventObserver(workflow);

  await workflow.run();

  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThanOrEqual(1);

  const mergedErrorEvent = events.find((e) =>
    e.type === 'error' && e.error.message.includes('concurrent child workflows failed')
  );
  expect(mergedErrorEvent).toBeDefined();
});
```

### 4. Testing Backward Compatibility

```typescript
it('should maintain default behavior when feature disabled', async () => {
  class ParentWorkflow extends Workflow {
    @Task({ concurrent: true }) // No errorMergeStrategy
    async spawnChildren() {
      return [createChildWorkflow(this, 'Success', false), createChildWorkflow(this, 'Fail', true)];
    }
  }

  const workflow = new ParentWorkflow('Parent');

  // Should throw first error only (not aggregated)
  await expect(workflow.run()).rejects.toThrow('Fail failed');
});
```

---

## Common Vitest Matchers

```typescript
// Error validation
expect(error).toBeInstanceOf(Error);
expect(error).toBeInstanceOf(WorkflowError);
expect(error.message).toBe('Expected message');
expect(error.message).toMatch(/regex pattern/);
expect(error.message).toContain('substring');

// Property validation
expect(error).toHaveProperty('workflowId');
expect(error.workflowId).toBe('expected-id');

// Array validation
expect(errors).toHaveLength(3);
expect(errors).toContain(expect.objectContaining({ message: 'Error 1' }));

// Async error validation
await expect(workflow.run()).rejects.toThrow('Expected error');

// Spy validation
expect(spy).toHaveBeenCalledTimes(1);
expect(spy.mock.calls[0][0]).toHaveLength(2);
```

---

## Test Structure Template

```typescript
describe('Feature Name', () => {
  describe('Default behavior (feature disabled)', () => {
    it('should maintain backward compatibility', async () => {
      // Test without feature enabled
    });
  });

  describe('Enabled with default configuration', () => {
    it('should use default merge behavior', async () => {
      // Test with feature enabled, no custom config
    });
  });

  describe('Enabled with custom configuration', () => {
    it('should call custom combine function', async () => {
      // Test with custom combine function
    });
  });

  describe('Edge cases', () => {
    it('should handle empty array', async () => {
      // Test edge case
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing API', async () => {
      // Test existing patterns still work
    });
  });
});
```

---

## Anti-Patterns to Avoid

❌ **Don't** test implementation details
```typescript
// BAD
expect(spy).toHaveBeenCalledWith([error1, error2], 'taskName', 'parent', 2);
```

✅ **Do** test behavior/outcome
```typescript
// GOOD
expect(result.message).toBe("2 of 5 concurrent child workflows failed in task 'taskName'");
```

❌ **Don't** use brittle string matching
```typescript
// BAD
expect(error.message).toBe('Error: Something failed at step 2');
```

✅ **Do** use flexible matching
```typescript
// GOOD
expect(error.message).toContain('failed');
expect(error.message).toMatch(/step \d+ failed/);
```

❌ **Don't** mix multiple concerns
```typescript
// BAD
it('should handle error merging', async () => {
  // 50 lines testing errors + events + state
});
```

✅ **Do** separate concerns
```typescript
// GOOD
it('should merge errors correctly', async () => { /* focused on errors */ });
it('should emit error events', async () => { /* focused on events */ });
```

---

## Key Files to Reference

**Existing Test Patterns:**
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/compatibility/backward-compatibility.test.ts`

**Implementation:**
- `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`
- `/home/dustin/projects/groundswell/src/types/error-strategy.ts`

---

## Quick Checklist for Error Merge Tests

- [ ] Test default behavior (feature disabled)
- [ ] Test enabled with default merge
- [ ] Test enabled with custom combine function
- [ ] Test single error aggregation
- [ ] Test multiple error aggregation
- [ ] Test deduplication of errors
- [ ] Test log aggregation
- [ ] Test event emission (individual + merged)
- [ ] Test backward compatibility
- [ ] Test edge cases (empty, single, all fail)
- [ ] Test custom combine function invocation
- [ ] Test custom combine function error handling
- [ ] Test metadata preservation
- [ ] Test workflow ID preservation
- [ ] Test state snapshot preservation

---

**For comprehensive details, code examples, and explanations, see the full research document.**
