# Promise.allSettled Quick Reference Guide

**Purpose:** Quick reference for implementing Promise.allSettled in Groundswell
**Related Task:** P1.M2.T1 - Replace Promise.all with Promise.allSettled in Concurrent Tasks
**Full Research:** See `PROMISE_ALLSETTLED_RESEARCH.md` for comprehensive details

---

## TL;DR

**Promise.allSettled** waits for ALL promises to complete (success or failure), then returns an array of result objects with status and value/reason. It NEVER rejects - always fulfills.

**Key Benefits:**
- ✅ See ALL errors, not just first
- ✅ Preserve partial results
- ✅ Better debugging/observability
- ✅ Enable graceful degradation

**When to Use:**
- Independent operations
- Partial success has value
- Need complete error picture
- Observability is priority

**When to Use Promise.all Instead:**
- All operations must succeed (transactional)
- Fast failure desired
- Operations are dependent

---

## Basic Syntax

```typescript
// Promise.allSettled never rejects, always fulfills
const results = await Promise.allSettled([
  promise1,
  promise2,
  promise3
]);

// Result type: PromiseSettledResult<T>[]
// [
//   { status: 'fulfilled', value: ... },
//   { status: 'rejected', reason: Error(...) },
//   { status: 'fulfilled', value: ... }
// ]
```

---

## Type Guards (Required for TypeScript)

```typescript
// Type guard for fulfilled results
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

// Type guard for rejected results
function isRejected<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Usage
const results = await Promise.allSettled(promises);
const successes = results.filter(isFulfilled);  // Type: PromiseFulfilledResult<T>[]
const failures = results.filter(isRejected);    // Type: PromiseRejectedResult[]
```

---

## Common Patterns

### Pattern 1: Filter Successes and Failures

```typescript
const results = await Promise.allSettled(promises);

const successes = results
  .filter(isFulfilled)
  .map(r => r.value);

const failures = results
  .filter(isRejected)
  .map(r => r.reason);

console.log(`${successes.length} succeeded, ${failures.length} failed`);
```

### Pattern 2: Throw on Any Failure (Backward Compatible with Promise.all)

```typescript
const results = await Promise.allSettled(promises);
const failures = results.filter(isRejected);

if (failures.length > 0) {
  throw failures[0].reason; // First error wins
}

const values = results
  .filter(isFulfilled)
  .map(r => r.value);
```

### Pattern 3: Aggregate All Errors

```typescript
const results = await Promise.allSettled(promises);
const failures = results.filter(isRejected);

if (failures.length > 0) {
  const error = new Error(`${failures.length} operations failed`) as AggregateError;
  error.errors = failures.map(f => f.reason);
  throw error;
}
```

### Pattern 4: Process with Context

```typescript
const operations = [
  { name: 'users', promise: fetch('/api/users') },
  { name: 'posts', promise: fetch('/api/posts') },
  { name: 'comments', promise: fetch('/api/comments') }
];

const results = await Promise.allSettled(operations.map(op => op.promise));

const failures = operations
  .map((op, i) => ({ ...op, result: results[i] }))
  .filter(({ result }) => result.status === 'rejected')
  .map(({ name, result }) => ({
    operation: name,
    error: (result as PromiseRejectedResult).reason
  }));

console.error('Failed operations:', failures);
```

---

## Groundswell Implementation

### Current Code (src/decorators/task.ts:112)

```typescript
// BEFORE: Fail-fast behavior
await Promise.all(runnable.map((w) => w.run()));
```

### Recommended Code

```typescript
// AFTER: Configurable strategy
const errorStrategy = opts.errorStrategy || 'fail-fast';

if (errorStrategy === 'fail-fast') {
  // Current behavior (backward compatible)
  await Promise.all(runnable.map((w) => w.run()));
} else {
  // New behavior: Complete-all with error aggregation
  const settledResults = await Promise.allSettled(
    runnable.map((w) => w.run())
  );

  // Collect errors
  const errors = settledResults
    .map((result, idx) => ({ result, workflow: runnable[idx] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ result, workflow }) => ({
      workflowId: workflow.id,
      workflowName: workflow.constructor.name,
      error: (result as PromiseRejectedResult).reason,
    }));

  // Throw aggregate error if there were failures
  if (errors.length > 0) {
    throw createAggregateError(errors, taskName, wf.id);
  }
}
```

---

## Type Definitions

### TaskOptions Enhancement

```typescript
// File: src/types/decorators.ts
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;

  // NEW: Error handling strategy
  errorStrategy?: 'fail-fast' | 'complete-all';
}
```

### Aggregate Error Type

```typescript
// File: src/types/aggregate-error.ts
export interface WorkflowAggregateError extends Error {
  name: 'WorkflowAggregateError';
  message: string;
  errors: Array<{
    workflowId: string;
    workflowName: string;
    error: unknown;
  }>;
  taskName: string;
  workflowId: string;
  totalChildren: number;
  failedChildren: number;
}
```

---

## Common Pitfalls

### ❌ Don't: Access value/reason without checking status

```typescript
results.forEach(r => {
  console.log(r.value); // RUNTIME ERROR if r.status === 'rejected'
});
```

### ✅ Do: Always check status first

```typescript
results.forEach(r => {
  if (r.status === 'fulfilled') {
    console.log(r.value);
  } else {
    console.error(r.reason);
  }
});
```

### ❌ Don't: Forget type guards in TypeScript

```typescript
const successes = results.filter(r => r.status === 'fulfilled');
successes.forEach(s => {
  console.log(s.value); // TYPESCRIPT ERROR
});
```

### ✅ Do: Use type guards for proper narrowing

```typescript
const successes = results.filter(isFulfilled);
successes.forEach(s => {
  console.log(s.value); // ✅ TypeScript knows value exists
});
```

### ❌ Don't: Try to catch Promise.allSettled itself

```typescript
try {
  const results = await Promise.allSettled(promises);
} catch (error) {
  // This NEVER executes - Promise.allSettled never rejects
}
```

### ✅ Do: Check results for failures

```typescript
const results = await Promise.allSettled(promises);
const hasFailures = results.some(r => r.status === 'rejected');

if (hasFailures) {
  // Handle errors
}
```

---

## Comparison: Promise.all vs Promise.allSettled

| Aspect | Promise.all | Promise.allSettled |
|--------|-------------|-------------------|
| **Behavior** | Fail-fast | Complete-all |
| **Rejects?** | Yes (first error) | No (always fulfills) |
| **Error Visibility** | First error only | All errors |
| **Partial Results** | Lost | Preserved |
| **Performance** | Faster (stops at error) | Slower (waits for all) |
| **Memory** | Lower | Higher |
| **Use Case** | Transactional | Independent ops |

---

## Migration Checklist

- [ ] Update TaskOptions interface with `errorStrategy` field
- [ ] Create WorkflowAggregateError type
- [ ] Implement type guards (`isFulfilled`, `isRejected`)
- [ ] Update @Task decorator with Promise.allSettled path
- [ ] Maintain backward compatibility (default: fail-fast)
- [ ] Add error aggregation logic
- [ ] Emit error events for aggregate errors
- [ ] Add unit tests for complete-all strategy
- [ ] Add integration tests for concurrent failures
- [ ] Update documentation with examples
- [ ] Verify all existing tests still pass

---

## Testing Examples

```typescript
// Test 1: Fail-fast (default)
await expect(parent.run()).rejects.toThrow('First error');

// Test 2: Complete-all
const task = new Task({ concurrent: true, errorStrategy: 'complete-all' });
try {
  await parent.run();
} catch (error) {
  expect(error.name).toBe('WorkflowAggregateError');
  expect(error.failedChildren).toBe(2);
  expect(error.totalChildren).toBe(3);
}

// Test 3: Partial success
// Verify successful children completed despite failures
```

---

## Performance Considerations

**Promise.allSettled** waits for ALL operations to complete, even if some fail early.

**Impact:**
- Slower error detection (must wait for slowest operation)
- Higher memory usage (stores all results)
- Better error visibility (see all failures)

**Mitigation:**
- Use batching for large arrays (1000+ promises)
- Process results in chunks
- Don't store results if not needed
- Consider timeouts for individual operations

---

## Resources

**Full Research Document:**
`/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md`

**Related Groundswell Files:**
- Current Implementation: `src/decorators/task.ts`
- Type Definitions: `src/types/decorators.ts`
- Error Strategy: `src/types/error-strategy.ts`
- Best Practices: `plan/001_d3bb02af4886/bugfix/architecture/concurrent_execution_best_practices.md`
- Error Patterns: `plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md`

**External Resources:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- TC39 Spec: https://tc39.es/ecma262/#sec-promise.allsettled
- StackOverflow: https://stackoverflow.com/questions/62520818

---

**Version:** 1.0
**Last Updated:** 2026-01-12
**Task:** P1.M2.T1
**Status:** Ready for Implementation
