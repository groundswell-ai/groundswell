# Testing Error Aggregation Research Index

**Research Date:** 2026-01-12
**Task:** P1.M2.T2.S2 - Research testing patterns for error aggregation
**Project:** groundswell - Hierarchical workflow orchestration engine

## Quick Start

**For immediate implementation:** Start with `02-error-merge-strategy-testing-guide.md`
**For comprehensive understanding:** Read `01-testing-aggregated-errors.md`
**For Promise.allSettled specifics:** Reference `03-promise-allsettled-testing-patterns.md`

---

## Research Documents

### Core Research Documents

#### 1. Testing Aggregated Errors (Comprehensive Guide)
**File:** `01-testing-aggregated-errors.md` (29.5 KB)
**Sections:**
- Testing aggregated errors patterns
- Promise.allSettled error scenarios
- Error event emission testing
- Mock patterns for error scenarios
- Assertion patterns for complex error objects
- Testing library recommendations (Vitest vs Jest)
- Best practices (10 key practices)

**Key Takeaways:**
- ARRANGE-ACT-ASSERT test structure
- Type guards for WorkflowError validation
- Partial object matching with `toMatchObject`
- Event observer setup patterns
- Factory functions for mock errors

---

#### 2. ErrorMergeStrategy Implementation & Testing Guide
**File:** `02-error-merge-strategy-testing-guide.md` (30.9 KB)
**Sections:**
- ErrorMergeStrategy interface specification
- Default error merger implementation
- Testing ErrorMergeStrategy functionality
- Integration with @Task decorator
- Complete test examples
- Best practices for error merging

**Key Takeaways:**
- Default merger aggregates: message, original errors, workflowId, stack, logs
- Custom combine function support
- maxMergeDepth parameter for limiting recursion
- Backward compatibility: disabled throws first error only
- Complete @Task decorator integration code

**Code Provided:**
```typescript
// Default merger implementation
export function mergeWorkflowErrors(errors: WorkflowError[]): WorkflowError {
  // Aggregates message, stack, logs from all errors
  // Uses first error's workflowId and state
  // Returns merged WorkflowError
}

// @Task decorator integration
if (opts.errorMergeStrategy?.enabled) {
  const mergedError = opts.errorMergeStrategy.combine
    ? opts.errorMergeStrategy.combine(errors)
    : mergeWorkflowErrors(errors);

  wf.emitEvent({ type: 'error', node: wf.node, error: mergedError });
  throw mergedError;
}
```

---

#### 3. Promise.allSettled Testing Patterns
**File:** `03-promise-allsettled-testing-patterns.md` (24.4 KB)
**Sections:**
- Promise.allSettled basics
- Type guards for PromiseSettledResult
- Testing patterns (basic, all-rejected, all-fulfilled, empty)
- Workflow-specific scenarios
- Error collection strategies
- Performance & concurrency testing
- Edge cases

**Key Takeaways:**
- Type guards: `isRejected` and `isFulfilled`
- Error extraction patterns
- Orphan prevention testing
- Concurrency verification with timestamps
- Performance testing with large batches (100+ workflows)

**Code Provided:**
```typescript
// Type guards
function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Extract errors
function extractErrors(results: PromiseSettledResult<unknown>[]): unknown[] {
  return results.filter(isRejected).map(r => r.reason);
}

// Orphan prevention test
const completions = new Map<string, 'success' | 'failure'>();
// Track all workflow completions
expect(completions.size).toBe(totalWorkflows);
```

---

### Additional Reference Materials

#### 4. TypeScript Error Aggregation Patterns
**File:** `01_typescript_error_aggregation_patterns.md` (20.9 KB)
**Content:**
- TypeScript-specific patterns for error aggregation
- Type safety in error handling
- Generic error aggregation utilities
- Type-level error handling

---

#### 5. Aggregate Error Patterns
**File:** `02_aggregate_error_patterns.md` (27.3 KB)
**Content:**
- Aggregate error design patterns
- Error collection strategies
- Error hierarchy management
- Best practices for aggregate errors

---

#### 6. Error Merging Strategies
**File:** `03_error_merging_strategies.md` (24.8 KB)
**Content:**
- Different error merging approaches
- Strategy pattern implementation
- Custom error merger examples
- Error deduplication techniques

---

#### 7. GitHub & StackOverflow Examples
**File:** `04_github_stackoverflow_examples.md` (24.1 KB)
**Content:**
- Real-world examples from GitHub
- StackOverflow Q&A on error aggregation
- Community patterns and solutions
- Common pitfalls and how to avoid them

---

## Project-Specific Context

### Implementation Files

**Current Implementation:**
```typescript
// File: /home/dustin/projects/groundswell/src/decorators/task.ts
// Lines 111-122: Promise.allSettled implementation

const results = await Promise.allSettled(runnable.map((w) => w.run()));

const rejected = results.filter(
  (r): r is PromiseRejectedResult => r.status === 'rejected'
);

if (rejected.length > 0) {
  throw rejected[0].reason;  // Currently throws first error only
}
```

**Required Changes for P1.M2.T2.S2:**
1. Check if `opts.errorMergeStrategy?.enabled` is true
2. Collect all errors from `rejected` results
3. Call custom or default merger
4. Emit error event with merged error
5. Throw merged error instead of first error

---

### Type Definitions

**ErrorMergeStrategy Interface:**
```typescript
// File: /home/dustin/projects/groundswell/src/types/error-strategy.ts
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

**WorkflowError Interface:**
```typescript
// File: /home/dustin/projects/groundswell/src/types/error.ts
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

---

### Existing Tests

**Concurrent Task Failures Test:**
```typescript
// File: /home/dustin/projects/groundswell/src/__tests__/adversarial/concurrent-task-failures.test.ts
// 571 lines of comprehensive Promise.allSettled tests

describe('@Task decorator concurrent failure scenarios', () => {
  // Single child failure
  // Multiple concurrent failures
  // Mixed success/failure scenarios
  // All children failing
  // No orphaned workflows
  // Event emission verification
  // Error collection correctness
});
```

---

## Implementation Workflow

### Step 1: Create Default Error Merger

**File to create:** `src/utils/error-merger.ts`

```typescript
import type { WorkflowError } from '../types/error.js';

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

**Tests to create:** `src/__tests__/unit/error-merger.test.ts`

---

### Step 2: Update @Task Decorator

**File to edit:** `src/decorators/task.ts`

**Changes at lines 118-120:**

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

### Step 3: Create Test Suite

**File to create:** `src/__tests__/unit/error-merge-strategy.test.ts`

**Test coverage:**
- Default merger functionality
- Empty error array (throws)
- Single error (returned unchanged)
- Two errors (merged correctly)
- Multiple errors (3, 5, 10+)
- Message aggregation
- Stack trace concatenation
- Log flattening
- Parent context preservation
- Custom combine function
- maxMergeDepth parameter
- Backward compatibility
- Integration with @Task decorator

---

### Step 4: Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/__tests__/unit/error-merge-strategy.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Expected outcome:**
- All 344+ existing tests pass
- New tests pass with 100% coverage
- No regressions introduced

---

## Testing Patterns Summary

### 1. Basic Error Aggregation Test

```typescript
it('should aggregate errors from multiple concurrent workflows', async () => {
  // ARRANGE
  const parent = new ParentWorkflow('Parent');

  // ACT
  const result = await parent.run();

  // ASSERT
  expect(result.message).toContain('3 concurrent errors');
  expect(result.logs).toHaveLength(3);
});
```

### 2. Custom Merger Test

```typescript
it('should use custom error merge function', async () => {
  const customMerger = (errors: WorkflowError[]) => ({
    message: `CUSTOM: ${errors.length} errors`,
    original: errors,
    workflowId: 'custom',
    state: {} as any,
    logs: [],
  });

  const workflow = new TestWorkflow('Test');
  const result = await workflow.run();

  expect(result.message).toBe('CUSTOM: 3 errors');
});
```

### 3. Backward Compatibility Test

```typescript
it('should throw first error when disabled', async () => {
  const workflow = new TestWorkflow('Test');
  const result = await workflow.run();

  expect(result.message).toContain('First error');
  expect(result.message).not.toContain('Second error');
});
```

### 4. Event Emission Test

```typescript
it('should emit error event with merged error', async () => {
  const events: WorkflowEvent[] = [];
  const workflow = new TestWorkflow('Test');

  workflow.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.run();

  const errorEvents = events.filter(e => e.type === 'error');
  expect(errorEvents[0].error.message).toContain('concurrent errors');
});
```

---

## Helper Functions

### Error Creation Helpers

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

### Test Setup Helpers

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

## Best Practices Checklist

### Test Structure
- [ ] Use nested `describe` blocks for organization
- [ ] Follow ARRANGE-ACT-ASSERT pattern
- [ ] Keep tests independent (no shared state)
- [ ] Use descriptive test names

### Error Testing
- [ ] Test empty, single, and multiple error scenarios
- [ ] Verify all error properties are preserved
- [ ] Test both default and custom mergers
- [ ] Ensure backward compatibility

### Assertions
- [ ] Use `toMatchObject` for partial matching
- [ ] Use type guards for complex objects
- [ ] Test both positive and negative cases
- [ ] Include edge cases (0 errors, 1 error, 100+ errors)

### Performance
- [ ] Test with large error counts (10+, 100+)
- [ ] Verify concurrent execution (not sequential)
- [ ] Check for memory leaks
- [ ] Ensure no hanging promises

### Event Testing
- [ ] Verify error events are emitted
- [ ] Check event structure is correct
- [ ] Ensure events propagate to observers
- [ ] Test event ordering when relevant

---

## Common Pitfalls

### 1. Not Testing Empty Array
```typescript
// Bad: Doesn't test empty case
it('should merge errors', () => {
  const result = mergeErrors([error1, error2]);
  expect(result).toBeDefined();
});

// Good: Tests empty case
it('should throw on empty array', () => {
  expect(() => mergeErrors([])).toThrow();
});
```

### 2. Only Testing with 2 Errors
```typescript
// Bad: Only tests 2 errors (edge case)
it('should merge two errors', () => {
  const result = mergeErrors([error1, error2]);
  expect(result.message).toContain('2 errors');
});

// Good: Tests 3+ errors (tests pluralization)
it('should merge multiple errors', () => {
  const result = mergeErrors([error1, error2, error3]);
  expect(result.message).toContain('3 concurrent errors');
});
```

### 3. Not Verifying All Properties
```typescript
// Bad: Only checks message
it('should merge errors', () => {
  const result = mergeErrors([error1, error2]);
  expect(result.message).toBeDefined();
});

// Good: Checks all properties
it('should merge all error properties', () => {
  const result = mergeErrors([error1, error2]);
  expect(result.message).toBeDefined();
  expect(result.workflowId).toBeDefined();
  expect(result.stack).toBeDefined();
  expect(result.logs).toBeDefined();
  expect(result.original).toEqual([error1, error2]);
});
```

### 4. Not Testing Backward Compatibility
```typescript
// Bad: Only tests new behavior
it('should merge errors when enabled', async () => {
  const workflow = new TestWorkflow('Test');
  const result = await workflow.run();
  expect(result.message).toContain('concurrent errors');
});

// Good: Tests both old and new behavior
it('should maintain backward compatibility when disabled', async () => {
  const workflow = new TestWorkflow('Test');
  const result = await workflow.run();
  expect(result.message).not.toContain('concurrent errors');
  expect(result.message).toContain('First error');
});
```

---

## External Resources

### Documentation
- **Vitest Guide:** https://vitest.dev/guide/
- **Promise.allSettled MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html

### Related Projects
- **Jest:** https://jestjs.io/
- **Testing Library:** https://testing-library.com/

### Design Patterns
- **Strategy Pattern:** Pluggable error merge strategies
- **Observer Pattern:** Error event emission
- **Aggregate Pattern:** Combining multiple errors

---

## Success Criteria

### Functional Requirements
- ✅ ErrorMergeStrategy interface in TaskOptions
- ✅ Default error merger implemented
- ✅ Custom combine function supported
- ✅ maxMergeDepth parameter working
- ✅ Error events emitted with merged errors
- ✅ Backward compatible (disabled throws first error)

### Test Requirements
- ✅ All 344+ existing tests pass
- ✅ New tests have 100% coverage
- ✅ No performance degradation
- ✅ No breaking changes

### Documentation Requirements
- ✅ JSDoc comments on public functions
- ✅ Code examples in tests
- ✅ PRD updated if needed

---

## Next Steps

1. **Implement mergeWorkflowErrors()** in `src/utils/error-merger.ts`
2. **Update @Task decorator** to use error merge strategy
3. **Create comprehensive test suite** in `src/__tests__/unit/error-merge-strategy.test.ts`
4. **Run all tests** to ensure no regressions
5. **Update documentation** with new behavior

---

## Questions?

Refer to individual research documents for detailed information:
- Implementation guide: `02-error-merge-strategy-testing-guide.md`
- Testing patterns: `01-testing-aggregated-errors.md`
- Promise.allSettled: `03-promise-allsettled-testing-patterns.md`

---

**Last Updated:** 2026-01-12
**Status:** Research Complete
**Next Phase:** Implementation (P1.M2.T2.S2)
