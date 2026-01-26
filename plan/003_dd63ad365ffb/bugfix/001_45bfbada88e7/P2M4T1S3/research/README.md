# Error Aggregation Testing Research - P2.M4.T1.S3

**Research Date:** 2025-01-26
**Status:** Complete
**Related Task:** P2.M4.T1.S3 - Comprehensive Error Merge Test Coverage

---

## Research Summary

This research provides comprehensive guidance for testing error aggregation/merge functionality in the Groundswell workflow orchestration engine. The research was conducted by analyzing existing production code patterns and established testing framework best practices.

### Key Finding

Your codebase already demonstrates **excellent error aggregation testing patterns** in the existing test suite at:
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`

These patterns should be replicated and extended for comprehensive error merge test coverage.

---

## Documents Created

### 1. Comprehensive Research Document (51 KB)

**File:** `external-test-best-practices.md`

**Contents:**
- Testing patterns for aggregate errors (4 sub-patterns)
- Vitest patterns for testing custom error objects (4 sub-patterns)
- Best practices for testing event emission in workflows (4 sub-patterns)
- Patterns for testing sequential operations with error collection (3 sub-patterns)
- How to test custom error combine/merge functions (4 sub-patterns)
- Testing backward compatibility (default behavior vs new feature)
- Anti-patterns to avoid (7 anti-patterns with corrections)
- Recommended test structure template
- References and further reading

**Best for:** Deep dive into testing patterns, comprehensive examples, and detailed explanations.

### 2. Quick Reference Guide (7.6 KB)

**File:** `quick-reference.md`

**Contents:**
- Essential helper functions (mock error creation, event observer setup, child workflow creation)
- Key testing patterns (error aggregation, custom combine, event emission, backward compatibility)
- Common Vitest matchers
- Test structure template
- Anti-patterns to avoid (before/after comparisons)
- Key files to reference
- Quick checklist for error merge tests

**Best for:** Fast lookup of common patterns, copy-paste templates, and implementation guidance.

---

## Quick Start

### For PRP Creation

If you're creating a PRP for error merge test coverage, start with:

1. **Review the Quick Reference** (`quick-reference.md`)
   - Copy the helper functions
   - Use the test structure template
   - Follow the checklist

2. **Study Existing Patterns**
   - Read `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts`
   - Read `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`
   - Understand the patterns used

3. **Apply Comprehensive Patterns**
   - Reference `external-test-best-practices.md` for detailed guidance
   - Implement tests for all scenarios (default, enabled, custom, edge cases)
   - Ensure backward compatibility

### Essential Helper Functions

Copy these into your test file:

```typescript
// Mock error creation
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: {},
    logs: [],
    ...overrides,
  };
}

// Event observer setup
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

// Child workflow creation
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

## Test Coverage Checklist

Use this checklist to ensure comprehensive error merge test coverage:

### Core Functionality
- [ ] Default behavior (feature disabled) - first error wins
- [ ] Enabled with default merge - uses `mergeWorkflowErrors`
- [ ] Enabled with custom combine function
- [ ] Custom combine function is called with correct arguments
- [ ] Custom combine function result is used

### Error Scenarios
- [ ] Single error aggregation
- [ ] Multiple error aggregation (2+ errors)
- [ ] All workflows failing
- [ ] Mixed success/failure scenarios
- [ ] Empty error array handling
- [ ] Duplicate error handling (deduplication)

### Data Validation
- [ ] Error message format includes counts
- [ ] Error message includes task name
- [ ] Workflow IDs are preserved/merged correctly
- [ ] Logs are aggregated from all errors
- [ ] Stack trace handling (first error's stack)
- [ ] State snapshot handling (first error's state)
- [ ] Metadata in `original` field is correct

### Event Emission
- [ ] Individual error events are emitted
- [ ] Merged error event is emitted
- [ ] Event counts are correct (individual + merged)
- [ ] Event payloads contain correct error objects
- [ ] Events are emitted in correct sequence

### Backward Compatibility
- [ ] Existing usage patterns still work
- [ ] Default behavior unchanged when feature not enabled
- [ ] Promise.allSettled behavior preserved
- [ ] No breaking changes to existing API
- [ ] Error messages are actionable

### Edge Cases
- [ ] No errors occur (all successes)
- [ ] Custom combine function throws error
- [ ] Undefined/null handling in merge logic
- [ ] Large numbers of concurrent operations
- [ ] Nested concurrent operations

---

## Key Patterns to Apply

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should merge errors correctly', async () => {
  // ARRANGE: Set up test data
  const errors = [
    createMockWorkflowError({ message: 'Error 1', workflowId: 'wf-1' }),
    createMockWorkflowError({ message: 'Error 2', workflowId: 'wf-2' }),
  ];

  // ACT: Execute code under test
  const result = mergeWorkflowErrors(errors, 'taskName', 'parent-wf', 5);

  // ASSERT: Verify expected outcome
  expect(result.message).toBe("2 of 5 concurrent child workflows failed in task 'taskName'");
  expect(result.logs).toHaveLength(2);
});
```

### 2. Type-Safe Property Access

```typescript
// Use type casting for nested metadata
const metadata = error.original as {
  name: string;
  message: string;
  errors: WorkflowError[];
  totalChildren: number;
  failedChildren: number;
  failedWorkflowIds: string[];
};

expect(metadata.failedChildren).toBe(2);
```

### 3. Event Filtering and Validation

```typescript
// Filter events by type
const errorEvents = events.filter((e) => e.type === 'error');
expect(errorEvents.length).toBeGreaterThanOrEqual(1);

// Find specific event
const mergedErrorEvent = events.find((e) =>
  e.type === 'error' && e.error.message.includes('concurrent child workflows failed')
);
expect(mergedErrorEvent).toBeDefined();

// Type narrowing with discriminated unions
if (mergedErrorEvent && mergedErrorEvent.type === 'error') {
  expect(mergedErrorEvent.error.workflowId).toBeDefined();
}
```

### 4. Spy Function Testing

```typescript
// Create spy for custom function
const combineSpy = vi.fn((errors: WorkflowError[]) => ({
  message: `Custom merge: ${errors.length} errors`,
  original: errors,
  workflowId: 'custom-parent',
  logs: errors.flatMap((e) => e.logs),
  stack: errors[0]?.stack,
  state: errors[0]?.state || {},
}));

// Use spy in workflow
@Task({
  concurrent: true,
  errorMergeStrategy: { enabled: true, combine: combineSpy },
})

// Verify spy was called
expect(combineSpy).toHaveBeenCalledTimes(1);
const errorsArg = combineSpy.mock.calls[0][0] as WorkflowError[];
expect(errorsArg).toHaveLength(2);
```

---

## Anti-Patterns to Avoid

### ❌ Don't Test Implementation Details

```typescript
// BAD
expect(spy).toHaveBeenCalledWith([error1, error2], 'taskName', 'parent', 2);
```

```typescript
// GOOD
expect(result.message).toBe("2 of 5 concurrent child workflows failed in task 'taskName'");
```

### ❌ Don't Use Brittle String Matching

```typescript
// BAD
expect(error.message).toBe('Error: Something failed at step 2');
```

```typescript
// GOOD
expect(error.message).toContain('failed');
expect(error.message).toMatch(/step \d+ failed/);
```

### ❌ Don't Mix Multiple Concerns

```typescript
// BAD - 50 lines testing errors + events + state
it('should handle error merging', async () => { /* ... */ });
```

```typescript
// GOOD - Separate focused tests
it('should merge errors correctly', async () => { /* error tests */ });
it('should emit error events', async () => { /* event tests */ });
it('should update state on error', async () => { /* state tests */ });
```

---

## Reference Implementation Files

### Test Files to Study

1. **Error Merge Strategy Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/adversarial/error-merge-strategy.test.ts`
   - Comprehensive error aggregation testing
   - Custom combine function testing
   - Event emission validation

2. **Workflow Error Utils Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`
   - Error merge utility function testing
   - Deduplication validation
   - Log aggregation testing

3. **Backward Compatibility Tests**
   - `/home/dustin/projects/groundswell/src/__tests__/compatibility/backward-compatibility.test.ts`
   - Default behavior preservation
   - Breaking change validation
   - Migration path testing

### Source Code Files

1. **Error Utilities**
   - `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts`
   - Default merge function implementation

2. **Type Definitions**
   - `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
   - ErrorMergeStrategy interface

3. **Task Decorator**
   - `/home/dustin/projects/groundswell/src/decorators/task.ts`
   - Error merge strategy integration

---

## Next Steps

1. **Review Research Documents**
   - Start with `quick-reference.md` for patterns
   - Deep dive into `external-test-best-practices.md` for details

2. **Study Existing Tests**
   - Read existing error merge tests
   - Understand the patterns used
   - Identify gaps in coverage

3. **Design Test Suite**
   - Use test structure template
   - Follow test coverage checklist
   - Apply key patterns

4. **Implement Tests**
   - Copy helper functions
   - Implement test cases
   - Ensure backward compatibility

5. **Validate Coverage**
   - Run test suite
   - Check for missing scenarios
   - Verify all checklist items

---

## Contact and Support

For questions about this research or the testing patterns, refer to:
- Existing test files in the codebase
- Vitest documentation: https://vitest.dev/
- TypeScript testing best practices

---

**Research Complete:** All necessary patterns, examples, and guidance have been compiled for comprehensive error merge test coverage.
