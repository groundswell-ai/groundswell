# Testing Error Aggregation Research Report

**Research Date:** 2026-01-12
**Task:** P1.M2.T2.S2 - Implement error aggregation logic in @Task decorator
**Bug ID:** 001_e8e04329daf3
**Project:** groundswell - Hierarchical workflow orchestration engine

---

## Executive Summary

Comprehensive research has been conducted on testing patterns for error aggregation in TypeScript/JavaScript workflow engines. This research provides complete implementation guidance for adding error merge strategy support to the groundswell project's @Task decorator.

### Key Deliverables

1. **Comprehensive Testing Guide** - Complete patterns for testing aggregated errors
2. **Implementation Guide** - Step-by-step error merger implementation
3. **Promise.allSettled Patterns** - Specific patterns for concurrent workflow testing
4. **Quick Reference** - Copy-paste test templates and helper functions
5. **Research Index** - Organized navigation of all research materials

### Files Created

```
plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S2/research/
├── INDEX.md                                    # Master index and quick reference
├── README.md                                   # Original research summary
├── 01-testing-aggregated-errors.md             # Comprehensive testing guide (29.5 KB)
├── 02-error-merge-strategy-testing-guide.md    # Implementation & testing guide (30.9 KB)
├── 03-promise-allsettled-testing-patterns.md   # Promise.allSettled patterns (24.4 KB)
├── 01_typescript_error_aggregation_patterns.md # TypeScript-specific patterns (20.9 KB)
├── 02_aggregate_error_patterns.md              # Aggregate error design patterns (27.3 KB)
├── 03_error_merging_strategies.md              # Error merging strategies (24.8 KB)
└── 04_github_stackoverflow_examples.md         # Community examples (24.1 KB)
```

---

## Research Findings

### 1. Testing Aggregated Errors

**Key Patterns Identified:**

- **ARRANGE-ACT-ASSERT Structure**: Consistent test organization for clarity
- **Type Guards**: Essential for type-safe error handling in TypeScript
- **Partial Object Matching**: Using `toMatchObject` for complex error validation
- **Event Observer Setup**: Capturing error events for verification
- **Factory Functions**: Consistent mock error creation

**Best Practices:**
1. Test empty, single, and multiple error scenarios
2. Verify all error properties are preserved (message, stack, logs, state)
3. Test both default and custom error mergers
4. Ensure backward compatibility
5. Use descriptive test names

**Code Example:**
```typescript
describe('Error Aggregation', () => {
  it('should aggregate errors from multiple concurrent workflows', async () => {
    // ARRANGE: Create workflows that will fail
    const parent = new ParentWorkflow('Parent');

    // ACT: Run the workflow
    const result = await parent.run();

    // ASSERT: Verify error aggregation
    expect(result.message).toContain('3 concurrent errors');
    expect(result.logs).toHaveLength(3);
  });
});
```

---

### 2. Promise.allSettled Error Scenarios

**Key Patterns:**

- **Type Guards for PromiseSettledResult**:
  ```typescript
  function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
    return result.status === 'rejected';
  }

  function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
    return result.status === 'fulfilled';
  }
  ```

- **Error Extraction**:
  ```typescript
  const errors = results
    .filter(isRejected)
    .map(r => r.reason);
  ```

- **Orphan Prevention**: Tracking all workflow completions to ensure no hanging promises

**Test Scenarios:**
- Single child failure
- Multiple concurrent failures (2, 3, 5, 10+)
- Mixed success/failure scenarios
- All workflows failing
- Empty workflow array
- Performance with large batches (100+ workflows)

---

### 3. Testing Error Event Emissions

**Key Patterns:**

- **Event Observer Setup**:
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

- **Event Verification**:
  ```typescript
  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents.length).toBeGreaterThan(0);
  expect(errorEvents[0].error.message).toContain('concurrent errors');
  ```

- **Event Propagation**: Verifying events reach parent observers

---

### 4. Mock Patterns for Error Scenarios

**Key Patterns:**

- **Error Factory Function**:
  ```typescript
  function createMockError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Mock error',
      original: new Error('Mock'),
      workflowId: 'mock-workflow',
      state: {} as any,
      logs: [],
      ...overrides
    };
  }
  ```

- **Scenario-Based Mocking**: Enum of common error scenarios
- **Spying on Error Handling**: Using Vitest's `vi.fn()` for tracking

---

### 5. Assertion Patterns for Complex Error Objects

**Key Patterns:**

- **Type Guard Assertions**:
  ```typescript
  function isWorkflowError(error: unknown): error is WorkflowError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'workflowId' in error &&
      'logs' in error
    );
  }
  ```

- **Partial Object Matching**:
  ```typescript
  expect(result).toMatchObject({
    message: expect.stringContaining('2 errors'),
    workflowId: expect.any(String),
    logs: expect.any(Array),
  });
  ```

- **Nested Object Matching**:
  ```typescript
  expect(result.logs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        workflowId: expect.any(String),
        level: expect.any(String),
      })
    ])
  );
  ```

---

## Implementation Guidance

### Default Error Merger Specification

The default error merger must aggregate:

1. **Message**: Count + all error messages (numbered list)
2. **Original Errors**: Array of all WorkflowError objects
3. **Parent WorkflowId**: Use first error's workflowId
4. **Stack Traces**: Concatenated with separators
5. **Logs**: Flattened array from all errors

**Implementation:**
```typescript
export function mergeWorkflowErrors(errors: WorkflowError[]): WorkflowError {
  if (errors.length === 0) {
    throw new Error('Cannot merge empty error array');
  }

  if (errors.length === 1) {
    return errors[0];
  }

  const message = `${errors.length} concurrent error${errors.length > 1 ? 's' : ''}: ` +
    errors.map((e, i) => `[${i + 1}] ${e.message}`).join('; ');

  const stack = errors
    .map((e, i) => `=== Error ${i + 1} ===\n${e.stack || 'No stack trace'}`)
    .join('\n\n');

  const logs = errors.flatMap(e => e.logs);
  const workflowId = errors[0].workflowId;
  const state = errors[0].state;

  return {
    message,
    original: errors,
    workflowId,
    stack,
    state,
    logs,
  };
}
```

### @Task Decorator Integration

**Current Implementation** (lines 118-120):
```typescript
if (rejected.length > 0) {
  throw rejected[0].reason;  // First error only
}
```

**Required Changes:**
```typescript
if (rejected.length > 0) {
  // Convert to WorkflowError
  const errors = rejected.map((r) => {
    const error = r.reason;
    return isWorkflowError(error)
      ? error
      : convertToWorkflowError(error, wf.id);
  });

  // Apply error merge strategy
  if (opts.errorMergeStrategy?.enabled) {
    const mergedError = opts.errorMergeStrategy.combine
      ? opts.errorMergeStrategy.combine(errors)
      : mergeWorkflowErrors(errors);

    wf.emitEvent({
      type: 'error',
      node: wf.node,
      error: mergedError,
    });

    throw mergedError;
  } else {
    // Backward compatible: throw first error
    wf.emitEvent({
      type: 'error',
      node: wf.node,
      error: errors[0],
    });

    throw errors[0];
  }
}
```

---

## Testing Library Recommendations

### Vitest (Recommended for This Project)

**Pros:**
- Native ESM support (essential for this project)
- Fast execution with worker threads
- Jest-compatible API (easy migration)
- Built-in TypeScript support
- Excellent watch mode

**Already Configured:**
- Version: 1.0.0
- Config: `/home/dustin/projects/groundswell/vitest.config.ts`
- Pattern: `src/__tests__/**/*.test.ts`
- Globals: Enabled

**Usage:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npx vitest run path   # Run specific file
```

### Jest (Alternative)

**Pros:**
- Largest ecosystem
- Extensive documentation
- Wide community adoption

**Cons:**
- ESM support requires configuration
- Slower than Vitest
- Requires ts-jest for TypeScript

**Recommendation:** Continue using Vitest (already configured and working)

---

## Test Coverage Requirements

### Unit Tests

**File:** `src/__tests__/unit/error-merge-strategy.test.ts`

**Coverage:**
- `mergeWorkflowErrors()` function
- `mergeWorkflowErrorsWithDepth()` function (if implemented)
- Empty error array handling
- Single error handling
- Two errors merging
- Multiple errors (3, 5, 10+)
- Message aggregation
- Stack trace concatenation
- Log flattening
- Parent context preservation
- Custom combine function
- maxMergeDepth parameter

### Integration Tests

**File:** `src/__tests__/integration/error-merge-integration.test.ts`

**Coverage:**
- @Task decorator with errorMergeStrategy enabled
- @Task decorator with errorMergeStrategy disabled
- Custom combine function execution
- Concurrent execution with error merging
- Error event emission with merged errors
- Parent workflow error handling

### Adversarial Tests

**File:** `src/__tests__/adversarial/error-merge-edge-cases.test.ts`

**Coverage:**
- Empty error array
- Single error
- Very large error counts (100+)
- Deeply nested error structures
- Rapid sequential task execution
- Memory leak detection
- Performance under load

---

## Common Pitfalls to Avoid

### 1. Not Testing Empty Array
```typescript
// Bad
it('should merge errors', () => {
  const result = mergeErrors([error1, error2]);
});

// Good
it('should throw on empty array', () => {
  expect(() => mergeErrors([])).toThrow();
});
```

### 2. Only Testing with 2 Errors
```typescript
// Bad
it('should merge two errors', () => {
  const result = mergeErrors([error1, error2]);
});

// Good
it('should merge multiple errors', () => {
  const result = mergeErrors([error1, error2, error3]);
  expect(result.message).toContain('3 concurrent errors');
});
```

### 3. Not Verifying All Properties
```typescript
// Bad
expect(result.message).toBeDefined();

// Good
expect(result.message).toBeDefined();
expect(result.workflowId).toBeDefined();
expect(result.stack).toBeDefined();
expect(result.logs).toBeDefined();
expect(result.original).toEqual([error1, error2]);
```

### 4. Not Testing Backward Compatibility
```typescript
// Bad: Only tests new behavior
it('should merge errors when enabled', async () => {
  // Test new behavior
});

// Good: Tests both old and new
it('should maintain backward compatibility when disabled', async () => {
  // Test old behavior still works
});
```

---

## Implementation Workflow

### Step 1: Create Default Error Merger
**File:** `src/utils/error-merger.ts`

**Tasks:**
- [ ] Implement `mergeWorkflowErrors()` function
- [ ] Add JSDoc documentation
- [ ] Export function

### Step 2: Update @Task Decorator
**File:** `src/decorators/task.ts`

**Tasks:**
- [ ] Import `mergeWorkflowErrors` from utils
- [ ] Add `isWorkflowError` type guard
- [ ] Add `convertToWorkflowError` utility
- [ ] Update error handling at lines 118-120
- [ ] Test backward compatibility

### Step 3: Create Test Suite
**File:** `src/__tests__/unit/error-merge-strategy.test.ts`

**Tasks:**
- [ ] Unit tests for `mergeWorkflowErrors()`
- [ ] Tests for empty, single, multiple errors
- [ ] Tests for message aggregation
- [ ] Tests for stack concatenation
- [ ] Tests for log flattening
- [ ] Tests for custom combine function
- [ ] Tests for backward compatibility

### Step 4: Run Tests
**Tasks:**
- [ ] Run all tests: `npm test`
- [ ] Verify 344+ existing tests still pass
- [ ] Verify new tests pass
- [ ] Check coverage: `npm run test:coverage`

### Step 5: Update Documentation
**Tasks:**
- [ ] Add JSDoc comments to new functions
- [ ] Update PRD if behavior changes
- [ ] Add code examples to tests

---

## Success Criteria

### Functional Requirements
- ✅ ErrorMergeStrategy interface exists in TaskOptions (P1.M2.T2.S1 - Complete)
- ⏳ Default error merger implemented
- ⏳ Custom combine function supported
- ⏳ maxMergeDepth parameter working
- ⏳ Error events emitted with merged errors
- ⏳ Backward compatible (disabled throws first error)

### Test Requirements
- ⏳ All 344+ existing tests pass
- ⏳ New tests have 100% coverage
- ⏳ No performance degradation
- ⏳ No breaking changes to public API

### Documentation Requirements
- ⏳ JSDoc comments on all public functions
- ⏳ Code examples in test files
- ⏳ PRD updated if needed

---

## External Resources

### Official Documentation
1. **Vitest Guide:** https://vitest.dev/guide/
2. **Promise.allSettled MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
3. **AggregateError MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
4. **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html

### Community Resources
1. **TC39 Promise.allSettled Proposal:** https://github.com/tc39/proposal-promise-allSettled
2. **Jest Documentation:** https://jestjs.io/docs/getting-started

### Project-Specific
1. **@Task Decorator:** `/home/dustin/projects/groundswell/src/decorators/task.ts`
2. **Error Strategy Types:** `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
3. **WorkflowError Interface:** `/home/dustin/projects/groundswell/src/types/error.ts`
4. **Existing Tests:** `/home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts`

---

## Helper Functions Library

### Error Creation

```typescript
function createMockError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Mock error',
    original: new Error('Mock'),
    workflowId: 'mock-workflow',
    state: {} as any,
    logs: [],
    ...overrides
  };
}

function createFailingWorkflow(parent: Workflow, name: string, errorMessage: string): Workflow {
  return new (class extends Workflow {
    async run() {
      throw new Error(errorMessage);
    }
  })(name, parent);
}
```

### Type Guards

```typescript
function isWorkflowError(error: unknown): error is WorkflowError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'workflowId' in error &&
    'logs' in error
  );
}

function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}
```

### Test Setup

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

---

## Next Steps

### Immediate Actions

1. **Review Research Documents**
   - Read `INDEX.md` for navigation
   - Study `02-error-merge-strategy-testing-guide.md` for implementation
   - Reference `01-testing-aggregated-errors.md` for testing patterns

2. **Implement Default Merger**
   - Create `src/utils/error-merger.ts`
   - Implement `mergeWorkflowErrors()` function
   - Add comprehensive JSDoc documentation

3. **Update @Task Decorator**
   - Modify `src/decorators/task.ts` lines 118-120
   - Add error merge strategy logic
   - Maintain backward compatibility

4. **Create Test Suite**
   - Create `src/__tests__/unit/error-merge-strategy.test.ts`
   - Implement comprehensive test coverage
   - Test all scenarios (empty, single, multiple, custom)

5. **Validate Implementation**
   - Run all tests: `npm test`
   - Verify 344+ existing tests pass
   - Check coverage is 100%
   - Test with real workflow scenarios

### Future Enhancements

- Implement `maxMergeDepth` parameter for limiting recursion
- Add error deduplication for duplicate errors
- Implement time-windowed error aggregation
- Add error categorization and statistics
- Support for custom error merge strategies library

---

## Conclusion

This research provides complete guidance for implementing error aggregation in the groundswell workflow engine. All testing patterns, implementation details, and best practices have been documented comprehensively.

**Key Takeaways:**

1. **Comprehensive Coverage**: Research covers all aspects of error aggregation testing
2. **Implementation Ready**: Complete code examples and templates provided
3. **Best Practices**: Industry-standard patterns and common pitfalls documented
4. **Project Context**: Tailored specifically for groundswell architecture
5. **Quick Reference**: Organized for easy navigation during implementation

**Status**: Research Complete
**Next Phase**: Implementation (P1.M2.T2.S2)
**Expected Outcome**: Robust error aggregation with comprehensive test coverage

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Research By:** Claude Code Agent
**Project:** groundswell - Hierarchical workflow orchestration engine
