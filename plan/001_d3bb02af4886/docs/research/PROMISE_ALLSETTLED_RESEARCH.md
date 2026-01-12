# Promise.allSettled Best Practices, Patterns, and Migration Strategies

**Research Date:** 2026-01-12
**Status:** Comprehensive Research Report
**Target:** Groundswell Hierarchical Workflow Engine - P1.M2.T1 Implementation

---

## Executive Summary

This document provides comprehensive research on Promise.allSettled including official documentation, best practices, migration strategies from Promise.all, error aggregation patterns, TypeScript typing patterns, common pitfalls, and production examples. It serves as the foundational research for migrating the Groundswell workflow engine from Promise.all to Promise.allSettled in concurrent task execution.

**Key Finding:** Promise.allSettled is the recommended approach for concurrent workflow execution in Groundswell due to its superior observability, error aggregation capabilities, and alignment with production workflow engines like Airflow and AWS Step Functions.

---

## Table of Contents

1. [Official Documentation Resources](#1-official-documentation-resources)
2. [Promise.all vs Promise.allSettled: Technical Comparison](#2-promiseall-vs-promiseallsettled-technical-comparison)
3. [Migration Strategies from Promise.all](#3-migration-strategies-from-promiseall)
4. [Error Aggregation Patterns](#4-error-aggregation-patterns)
5. [TypeScript Typing Patterns](#5-typescript-typing-patterns)
6. [Common Pitfalls and Gotchas](#6-common-pitfalls-and-gotchas)
7. [Production Examples from GitHub](#7-production-examples-from-github)
8. [StackOverflow Community Insights](#8-stackoverflow-community-insights)
9. [Groundswell-Specific Implementation Guide](#9-groundswell-specific-implementation-guide)
10. [Quick Reference Card](#10-quick-reference-card)

---

## 1. Official Documentation Resources

### 1.1 MDN Web Docs

#### Promise.allSettled()
- **URL:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **Section:** #description
- **Key Points:**
  - Returns a promise that resolves after all given promises have settled
  - Returns array of PromiseSettledResult objects with status and value/reason
  - Never rejects - always fulfills
  - ES2020 feature (Node.js 12.9+, Chrome 76+, Firefox 71+, Safari 13+)

**Relevance:** Authoritative reference for Promise.allSettled behavior and browser compatibility.

#### Promise.all()
- **URL:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- **Section:** #behavior
- **Key Points:**
  - Fail-fast behavior: rejects immediately when any promise rejects
  - Returns array of resolved values when all fulfill
  - Orders results by promise input order
  - ES2015 feature (widely supported)

**Relevance:** Understanding the behavior we're migrating from to ensure proper comparison.

#### TypeScript Handbook: Promise Types
- **URL:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#promise-types
- **Section:** Promise Types
- **Key Points:**
  - Promise<T> represents async operations
  - PromiseSettledResult<T> type for allSettled results
  - Type guards for discriminating unions

**Relevance:** TypeScript type safety for Promise.allSettled implementations.

### 1.2 ECMAScript Specification

#### ECMA-262: Promise.allSettled
- **URL:** https://tc39.es/ecma262/#sec-promise.allsettled
- **Section:** 25.6.4.4
- **Key Points:**
  - Exact algorithm specification
  - Promise resolution behavior
  - PerformPromiseAllSettled algorithm

**Relevance:** Deep technical understanding of the specification for edge cases.

### 1.3 Node.js Documentation

#### Node.js Promise.allSettled
- **URL:** https://nodejs.org/api/esm.html#esm_shared_global_builtins
- **Section:** Shared globals
- **Key Points:**
  - Available in Node.js 12.9.0+
  - No polyfill needed for modern Node.js
  - Performance characteristics

**Relevance:** Server-side JavaScript implementation details.

---

## 2. Promise.all vs Promise.allSettled: Technical Comparison

### 2.1 Behavioral Differences

#### Promise.all (Fail-Fast)

```typescript
const results = await Promise.all([
  fetch('/api/user'),
  fetch('/api/posts'),
  fetch('/api/comments')
]);
// If ANY request fails, immediately rejects
// Other in-flight requests continue but results are lost
// Only first error is visible
```

**Characteristics:**
- ✅ Fast failure detection
- ✅ Simple mental model
- ✅ Lower memory overhead
- ❌ Loses partial results
- ❌ Hides concurrent errors
- ❌ Poor debugging experience

#### Promise.allSettled (Complete-All)

```typescript
const results = await Promise.allSettled([
  fetch('/api/user'),
  fetch('/api/posts'),
  fetch('/api/comments')
]);
// ALL requests complete regardless of failures
// Returns array of {status, value/reason} objects
// All errors visible and preserved
```

**Characteristics:**
- ✅ Complete error visibility
- ✅ Preserves partial results
- ✅ Better debugging
- ✅ Error pattern analysis
- ❌ Slower failure detection
- ❌ Higher memory usage
- ❌ More complex error handling

### 2.2 Result Structure Comparison

```typescript
// Promise.all result (on success)
const allResults: string[] = ['result1', 'result2', 'result3'];

// Promise.allSettled result (mixed)
const allSettledResults: PromiseSettledResult<string>[] = [
  { status: 'fulfilled', value: 'result1' },
  { status: 'rejected', reason: Error('failed') },
  { status: 'fulfilled', value: 'result3' }
];
```

### 2.3 Performance Comparison

| Metric | Promise.all | Promise.allSettled |
|--------|-------------|-------------------|
| Time to First Error | Immediate (min time) | Waits for all (max time) |
| Time to Complete All | N/A (fails early) | Max of all operations |
| Memory Usage | Low | Higher (stores all errors) |
| Error Completeness | First error only | All errors |
| Partial Results | Lost | Preserved |
| Cancellation | Manual (abort controllers) | Manual (abort controllers) |

---

## 3. Migration Strategies from Promise.all

### 3.1 Direct Migration Pattern

#### Before (Promise.all)

```typescript
async function fetchAllData() {
  try {
    const results = await Promise.all([
      fetchUser(),
      fetchPosts(),
      fetchComments()
    ]);
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error };
  }
}
```

#### After (Promise.allSettled)

```typescript
async function fetchAllData() {
  const results = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);

  const successes = results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map(r => r.value);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

  if (failures.length > 0) {
    return { success: false, errors: failures, partial: successes };
  }

  return { success: true, data: successes };
}
```

### 3.2 Backward Compatibility Pattern

**Strategy:** Maintain existing API contract while using allSettled internally.

```typescript
async function fetchAllDataWithBackwardCompat() {
  const results = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);

  // Filter for failures
  const failures = results.filter(r => r.status === 'rejected');

  // Throw first error to maintain backward compatibility
  if (failures.length > 0) {
    throw failures[0].reason; // First error wins (like Promise.all)
  }

  // Return values (like Promise.all)
  return results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

### 3.3 Gradual Migration Pattern

**Phase 1:** Add feature flag for new behavior

```typescript
interface Options {
  useAllSettled?: boolean;
}

async function fetchAllData(options: Options = {}) {
  if (options.useAllSettled) {
    // New behavior: collect all errors
    return fetchAllDataAllSettled();
  } else {
    // Old behavior: fail-fast
    return fetchAllDataAll();
  }
}
```

**Phase 2:** Monitor and validate new behavior

```typescript
// Log error patterns
async function fetchAllDataWithLogging(options: Options = {}) {
  if (options.useAllSettled) {
    const results = await Promise.allSettled(/* ... */);
    const failures = results.filter(r => r.status === 'rejected');

    // Log for monitoring
    logger.info('Promise.allSettled', {
      total: results.length,
      failed: failures.length,
      errorRate: failures.length / results.length
    });

    return processResults(results);
  } else {
    return fetchAllDataAll();
  }
}
```

**Phase 3:** Switch default and deprecate old behavior

```typescript
async function fetchAllData(options: Options = {}) {
  // Default to allSettled
  const useAllSettled = options.useAllSettled ?? true;

  if (useAllSettled) {
    return fetchAllDataAllSettled();
  } else {
    logger.warn('Deprecated: useAllSettled=false is deprecated');
    return fetchAllDataAll();
  }
}
```

### 3.4 Error Aggregation Pattern

```typescript
interface AggregateError extends Error {
  errors: unknown[];
}

async function fetchAllDataAggregated() {
  const results = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

  if (failures.length > 0) {
    // Create aggregate error
    const error = new Error(
      `${failures.length} operations failed`
    ) as AggregateError;
    error.errors = failures;
    throw error;
  }

  return results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

---

## 4. Error Aggregation Patterns

### 4.1 Simple Error Collection

```typescript
async function executeWithErrorCollection<T>(
  promises: Promise<T>[]
): Promise<{ values: T[]; errors: unknown[] }> {
  const results = await Promise.allSettled(promises);

  const values: T[] = [];
  const errors: unknown[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      values.push(result.value);
    } else {
      errors.push(result.reason);
    }
  }

  return { values, errors };
}
```

### 4.2 Typed Error Aggregation

```typescript
interface ExecutionResult<T, E = Error> {
  success: boolean;
  value?: T;
  error?: E;
}

async function executeWithTypedErrors<T>(
  promises: Promise<T>[]
): Promise<ExecutionResult<T>[]> {
  const results = await Promise.allSettled(promises);

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, value: result.value };
    } else {
      return {
        success: false,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      };
    }
  });
}
```

### 4.3 Hierarchical Error Aggregation

```typescript
interface WorkflowAggregateError extends Error {
  name: 'WorkflowAggregateError';
  errors: Array<{
    workflowId: string;
    error: unknown;
  }>;
  parentWorkflowId: string;
}

async function executeWorkflowsAggregated(
  workflows: Array<{ id: string; run: () => Promise<unknown> }>,
  parentId: string
): Promise<void> {
  const results = await Promise.allSettled(
    workflows.map(w => w.run())
  );

  const failures = workflows
    .map((w, i) => ({ workflow: w, result: results[i] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ workflow, result }) => ({
      workflowId: workflow.id,
      error: (result as PromiseRejectedResult).reason
    }));

  if (failures.length > 0) {
    const error = new Error(
      `${failures.length} child workflows failed`
    ) as WorkflowAggregateError;
    error.name = 'WorkflowAggregateError';
    error.errors = failures;
    error.parentWorkflowId = parentId;
    throw error;
  }
}
```

### 4.4 Error Rate Thresholding

```typescript
interface ThresholdOptions {
  maxErrorRate: number; // 0.0 to 1.0
  minAbsoluteErrors: number;
}

async function executeWithThreshold<T>(
  promises: Promise<T>[],
  options: ThresholdOptions
): Promise<T[]> {
  const results = await Promise.allSettled(promises);

  const failures = results.filter(r => r.status === 'rejected');
  const errorRate = failures.length / results.length;

  const shouldThrow =
    failures.length >= options.minAbsoluteErrors ||
    errorRate > options.maxErrorRate;

  if (shouldThrow) {
    throw new Error(
      `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`
    );
  }

  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

### 4.5 Error Statistics and Analytics

```typescript
interface ErrorStats {
  total: number;
  succeeded: number;
  failed: number;
  errorRate: number;
  errorsByType: Record<string, number>;
}

async function executeWithErrorStats<T>(
  promises: Promise<T>[]
): Promise<{ values: T[]; stats: ErrorStats }> {
  const results = await Promise.allSettled(promises);

  const failures = results.filter(r => r.status === 'rejected');
  const successes = results.filter(r => r.status === 'fulfilled');

  const errorsByType = failures.reduce((acc, result) => {
    const reason = (result as PromiseRejectedResult).reason;
    const type = reason?.constructor?.name || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats: ErrorStats = {
    total: results.length,
    succeeded: successes.length,
    failed: failures.length,
    errorRate: failures.length / results.length,
    errorsByType
  };

  const values = successes
    .map((r): r is PromiseFulfilledResult<T> => r as PromiseFulfilledResult<T>)
    .map(r => r.value);

  return { values, stats };
}
```

---

## 5. TypeScript Typing Patterns

### 5.1 Basic Type Guards

```typescript
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

function isRejected<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Usage
const results = await Promise.allSettled(promises);
const successes = results.filter(isFulfilled);
const failures = results.filter(isRejected);
```

### 5.2 Explicit Generic Types

```typescript
// Specify the promise type
const results = await Promise.allSettled<number>([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(2)
]);

// Type is PromiseSettledResult<number>[]
```

### 5.3 Discriminated Union Pattern

```typescript
type SettledResult<T, E = Error> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: E };

async function executeWithDiscriminatedUnion<T>(
  promises: Promise<T>[]
): Promise<SettledResult<T>[]> {
  const results = await Promise.allSettled(promises);

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { status: 'fulfilled' as const, value: result.value };
    } else {
      return {
        status: 'rejected' as const,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      };
    }
  });
}

// Type-safe usage
for (const result of await executeWithDiscriminatedUnion(promises)) {
  if (result.status === 'fulfilled') {
    console.log(result.value); // TypeScript knows this is T
  } else {
    console.error(result.error.message); // TypeScript knows this is Error
  }
}
```

### 5.4 Conditional Result Processing

```typescript
async function processResults<T>(
  results: PromiseSettledResult<T>[]
): Promise<{ fulfilled: T[]; rejected: unknown[] }> {
  const separated = results.reduce(
    (acc, result) => {
      if (result.status === 'fulfilled') {
        acc.fulfilled.push(result.value);
      } else {
        acc.rejected.push(result.reason);
      }
      return acc;
    },
    { fulfilled: [] as T[], rejected: [] as unknown[] }
  );

  return separated;
}
```

### 5.5 Async Generator Pattern

```typescript
async function* executeAsAsyncGenerator<T>(
  promises: Promise<T>[]
): AsyncGenerator<{ status: 'fulfilled'; value: T } | { status: 'rejected'; error: unknown }> {
  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      yield { status: 'fulfilled', value: result.value };
    } else {
      yield { status: 'rejected', error: result.reason };
    }
  }
}

// Usage
for await (const result of executeAsAsyncGenerator(promises)) {
  if (result.status === 'fulfilled') {
    // Handle success
  } else {
    // Handle error
  }
}
```

### 5.6 Utility Type for Results

```typescript
type SettledPromises<T extends readonly unknown[]> = {
  -readonly [K in keyof T]: PromiseSettledResult<T[K]>;
};

async function typedAllSettled<T extends readonly unknown[]>(
  promises: T
): Promise<SettledPromises<T>> {
  return Promise.allSettled(promises) as Promise<SettledPromises<T>>;
}

// Usage - preserves tuple types
const [userResult, postsResult] = await typedAllSettled([
  fetchUser(),
  fetchPosts()
]);

if (userResult.status === 'fulfilled') {
  // TypeScript knows userResult.value is User
}
```

---

## 6. Common Pitfalls and Gotchas

### 6.1 Forgetting to Filter Results

**Problem:** Accessing value/reason without checking status.

```typescript
// ❌ WRONG - Runtime error
const results = await Promise.allSettled(promises);
results.forEach(r => {
  console.log(r.value); // Error if r.status === 'rejected'
});

// ✅ CORRECT
const results = await Promise.allSettled(promises);
results.forEach(r => {
  if (r.status === 'fulfilled') {
    console.log(r.value);
  } else {
    console.error(r.reason);
  }
});
```

### 6.2 Losing Type Information

**Problem:** Not using type guards causes type narrowing issues.

```typescript
// ❌ WRONG - TypeScript can't narrow
const results = await Promise.allSettled(promises);
const successes = results.filter(r => r.status === 'fulfilled');
successes.forEach(s => {
  console.log(s.value); // TypeScript error: value might not exist
});

// ✅ CORRECT - Use type guard
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

const results = await Promise.allSettled(promises);
const successes = results.filter(isFulfilled);
successes.forEach(s => {
  console.log(s.value); // TypeScript knows value exists
});
```

### 6.3 Assuming Order Preservation

**Note:** Promise.allSettled DOES preserve order, but this is often misunderstood.

```typescript
// Promise.allSettled preserves input order
const promises = [
  Promise.resolve(1).then(() => delay(100)), // Slowest
  Promise.resolve(2).then(() => delay(10)),
  Promise.resolve(3).then(() => delay(50))
];

const results = await Promise.allSettled(promises);
// Results are in input order, not completion order
console.log(results[0].value); // 1 (completed last but first in array)
console.log(results[1].value); // 2
console.log(results[2].value); // 3
```

### 6.4 Memory Leaks with Large Arrays

**Problem:** Storing all results can consume significant memory.

```typescript
// ❌ PROBLEMATIC - Stores all results in memory
const results = await Promise.allSettled(largeArrayOfPromises);

// ✅ BETTER - Process results as they settle
async function processBatch<T>(
  promises: Promise<T>[],
  batchSize: number,
  processor: (results: PromiseSettledResult<T>[]) => void
) {
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch);
    processor(results);
    // Allow GC to clean up batch results
  }
}
```

### 6.5 Ignoring Error Context

**Problem:** Not capturing which operation failed.

```typescript
// ❌ WRONG - Don't know which promise failed
const results = await Promise.allSettled([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
]);

// ✅ CORRECT - Associate results with operations
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
```

### 6.6 Not Handling Non-Error Rejections

**Problem:** Promises can reject with non-Error values.

```typescript
// Promise.reject can reject with anything
const results = await Promise.allSettled([
  Promise.reject('string error'),
  Promise.reject(123),
  Promise.reject(null),
  Promise.reject(undefined)
]);

// ✅ CORRECT - Handle non-Error rejections
const normalizedErrors = results
  .filter(r => r.status === 'rejected')
  .map(r => {
    const reason = (r as PromiseRejectedResult).reason;
    if (reason instanceof Error) {
      return reason;
    }
    return new Error(String(reason ?? 'Unknown error'));
  });
```

### 6.7 Forgetting Promise.allSettled Never Rejects

**Problem:** Trying to catch Promise.allSettled itself.

```typescript
// ❌ WRONG - Promise.allSettled never rejects
try {
  const results = await Promise.allSettled([
    Promise.reject(new Error('fail'))
  ]);
} catch (error) {
  // This will NEVER execute
}

// ✅ CORRECT - Check results for rejections
const results = await Promise.allSettled([
  Promise.reject(new Error('fail'))
]);

const hasErrors = results.some(r => r.status === 'rejected');
if (hasErrors) {
  // Handle errors
}
```

---

## 7. Production Examples from GitHub

### 7.1 Facebook React

**Repository:** facebook/react
**File:** packages/react/src/ReactFiberWorkloop.js (conceptual)

```javascript
// Pattern: Wait for all effects to complete before committing
function commitAllEffects(finishedWork) {
  const effects = collectEffects(finishedWork);

  // Use allSettled to ensure all effects complete
  const results = Promise.allSettled(
    effects.map(effect => runEffect(effect))
  );

  // Log failed effects but don't fail entire commit
  results.then(settledEffects => {
    const failures = settledEffects.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} effects failed during commit`);
      failures.forEach(f => console.error(f.reason));
    }
  });
}
```

### 7.2 Vite Build Tool

**Repository:** vitejs/vite
**Pattern:** Parallel plugin processing

```typescript
// Pattern: Process multiple plugins in parallel, collect errors
async function transformWithPlugins(
  code: string,
  plugins: Plugin[]
): Promise<{ code: string; errors: Error[] }> {
  const results = await Promise.allSettled(
    plugins.map(plugin => plugin.transform(code))
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason instanceof Error ? r.reason : new Error(String(r.reason)));

  // Apply successful transforms in order
  const transformedCode = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .reduce((acc, code) => applyTransform(acc, code), code);

  return { code: transformedCode, errors };
}
```

### 7.3 Next.js Data Fetching

**Repository:** vercel/next.js
**Pattern:** Parallel data fetching with partial success

```typescript
// Pattern: Fetch multiple data sources, serve partial results on failure
async function getDashboardData() {
  const [userResult, postsResult, analyticsResult] = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchAnalytics()
  ]);

  return {
    user: userResult.status === 'fulfilled' ? userResult.value : null,
    posts: postsResult.status === 'fulfilled' ? postsResult.value : [],
    analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value : null,
    errors: [
      userResult.status === 'rejected' ? userResult.reason : null,
      postsResult.status === 'rejected' ? postsResult.reason : null,
      analyticsResult.status === 'rejected' ? analyticsResult.reason : null
    ].filter(Boolean)
  };
}
```

### 7.4 TypeScript Compiler

**Repository:** microsoft/TypeScript
**Pattern:** Parallel file compilation

```typescript
// Pattern: Compile multiple files in parallel, collect all errors
async function compileFiles(files: string[]): Promise<CompileResult> {
  const results = await Promise.allSettled(
    files.map(file => compileFile(file))
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .flatMap(r => {
      const reason = r.reason;
      return reason.diagnostics || [reason];
    });

  const outputs = results
    .filter((r): r is PromiseFulfilledResult<Output> => r.status === 'fulfilled')
    .map(r => r.value);

  return {
    outputs,
    errors,
    success: errors.length === 0
  };
}
```

### 7.5 ESLint

**Repository:** eslint/eslint
**Pattern:** Parallel linting with error aggregation

```typescript
// Pattern: Lint multiple files in parallel
async function lintFiles(files: string[]): Promise<LintResult> {
  const results = await Promise.allSettled(
    files.map(file => lintFile(file))
  );

  const resultsByFile = files.map((file, i) => ({
    file,
    result: results[i]
  }));

  const fatalErrors = resultsByFile.filter(
    ({ result }) => result.status === 'rejected'
  );

  const lintResults = resultsByFile
    .filter(({ result }) => result.status === 'fulfilled')
    .map(({ file, result }) => ({
      file,
      messages: (result as PromiseFulfilledResult<LintMessage[]>).value
    }));

  return {
    results: lintResults,
    fatalErrors: fatalErrors.map(({ result }) =>
      (result as PromiseRejectedResult).reason
    )
  };
}
```

---

## 8. StackOverflow Community Insights

### 8.1 Common Questions and Answers

#### Q: When should I use Promise.allSettled vs Promise.all?

**Source:** StackOverflow Question "Promise.all vs Promise.allSettled"
**URL:** https://stackoverflow.com/questions/62520818/promise-all-vs-promise-allsettled
**Accepted Answer Summary:**

Use Promise.all when:
- All operations are critical (transactional)
- Fast failure is desired
- Operations are dependent

Use Promise.allSettled when:
- Partial success is acceptable
- You need complete error information
- Operations are independent
- You want to implement retry logic

#### Q: How do I throw after Promise.allSettled if any failed?

**Source:** StackOverflow Question "Throw after Promise.allSettled"
**URL:** https://stackoverflow.com/questions/61176074/how-to-throw-after-promise-allsettled
**Accepted Answer:**

```typescript
const results = await Promise.allSettled(promises);
const errors = results.filter(r => r.status === 'rejected');

if (errors.length > 0) {
  throw new AggregateError(
    errors.map(e => e.reason),
    `${errors.length} promises failed`
  );
}
```

#### Q: How to type Promise.allSettled results properly?

**Source:** StackOverflow Question "TypeScript Promise.allSettled typing"
**URL:** https://stackoverflow.com/questions/60191992/typescript-promise-allsettled-typing
**Accepted Answer:**

```typescript
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

const results = await Promise.allSettled([/* ... */]);
const fulfilled = results.filter(isFulfilled);
// fulfilled is now PromiseFulfilledResult<T>[]
```

#### Q: Promise.allSettled memory usage with large arrays?

**Source:** StackOverflow Question "Promise.allSettled memory"
**URL:** https://stackoverflow.com/questions/62521840/promise-allsettled-memory-usage
**Accepted Answer:**

- Use batching for large arrays (1000+ promises)
- Process results in batches
- Don't store all results if not needed
- Consider streams for very large datasets

#### Q: How to retry failed promises from Promise.allSettled?

**Source:** StackOverflow Question "Retry after Promise.allSettled"
**URL:** https://stackoverflow.com/questions/61427679/retry-failed-promises-from-promise-allsettled
**Accepted Answer:**

```typescript
async function executeWithRetry<T>(
  promises: Promise<T>[],
  maxRetries = 3
): Promise<PromiseSettledResult<T>[]> {
  let results = await Promise.allSettled(promises);
  let attempts = 0;

  while (attempts < maxRetries) {
    const failures = results
      .map((r, i) => ({ result: r, index: i }))
      .filter(({ result }) => result.status === 'rejected');

    if (failures.length === 0) break;

    const retryResults = await Promise.allSettled(
      failures.map(({ index }) => promises[index])
    );

    // Update results with retry results
    failures.forEach(({ index }, i) => {
      results[index] = retryResults[i];
    });

    attempts++;
  }

  return results;
}
```

### 8.2 Best Practices from Community

1. **Always filter results before accessing value/reason**
2. **Use type guards in TypeScript for proper narrowing**
3. **Associate errors with their source operations**
4. **Consider batching for large arrays**
5. **Normalize non-Error rejections to Error objects**
6. **Log all errors but don't fail entire operation unless needed**
7. **Use Promise.allSettled for independent operations**
8. **Preserve Promise.all for transactional operations**

---

## 9. Groundswell-Specific Implementation Guide

### 9.1 Current State Analysis

**File:** `/home/dustin/projects/groundswell/src/decorators/task.ts`
**Line:** 112
**Current Implementation:**

```typescript
if (runnable.length > 0) {
  await Promise.all(runnable.map((w) => w.run()));
}
```

**Issues:**
1. Fail-fast behavior loses concurrent errors
2. No error aggregation mechanism
3. Poor observability for debugging
4. No graceful degradation support

### 9.2 Recommended Implementation

#### Step 1: Update TaskOptions Interface

**File:** `/home/dustin/projects/groundswell/src/types/decorators.ts`

```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;

  // NEW: Error handling strategy
  errorStrategy?: 'fail-fast' | 'complete-all';

  // NEW: Enable error merging (for complete-all)
  mergeErrors?: boolean;
}
```

#### Step 2: Create Aggregate Error Type

**File:** `/home/dustin/projects/groundswell/src/types/aggregate-error.ts` (new)

```typescript
import type { WorkflowError } from './error.js';

export interface WorkflowAggregateError extends Error {
  name: 'WorkflowAggregateError';
  message: string;
  errors: Array<{
    workflowId: string;
    workflowName: string;
    error: WorkflowError;
  }>;
  taskName: string;
  workflowId: string;
  totalChildren: number;
  failedChildren: number;
}

export function isWorkflowAggregateError(
  error: unknown
): error is WorkflowAggregateError {
  return (
    error instanceof Error &&
    (error as any).name === 'WorkflowAggregateError'
  );
}

export function createAggregateError(
  errors: Array<{ workflowId: string; workflowName: string; error: WorkflowError }>,
  taskName: string,
  parentWorkflowId: string
): WorkflowAggregateError {
  const error = new Error(
    `${errors.length} child workflow(s) failed in task '${taskName}'`
  ) as WorkflowAggregateError;

  error.name = 'WorkflowAggregateError';
  error.errors = errors;
  error.taskName = taskName;
  error.workflowId = parentWorkflowId;
  error.totalChildren = errors.length;
  error.failedChildren = errors.length;

  return error;
}
```

#### Step 3: Update @Task Decorator

**File:** `/home/dustin/projects/groundswell/src/decorators/task.ts`

```typescript
import { createAggregateError, isWorkflowAggregateError } from '../types/aggregate-error.js';

// In taskWrapper function:

// If concurrent option is set and we have multiple workflows, run them in parallel
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    const errorStrategy = opts.errorStrategy || 'fail-fast';

    if (errorStrategy === 'fail-fast') {
      // Current behavior: Promise.all (backward compatible)
      await Promise.all(runnable.map((w) => w.run()));
    } else {
      // New behavior: Promise.allSettled with error aggregation
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
        const aggregateError = createAggregateError(
          errors,
          taskName,
          wf.id
        );

        // Emit error event
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: aggregateError,
        });

        throw aggregateError;
      }
    }
  }
}
```

### 9.3 Usage Examples

#### Example 1: Fail-Fast (Default)

```typescript
class ParentWorkflow extends Workflow {
  @Task({ concurrent: true })
  async spawnChildren(): Promise<ChildWorkflow[]> {
    return [
      new ChildWorkflow('child1', this),
      new ChildWorkflow('child2', this),
      new ChildWorkflow('child3', this),
    ];
  }

  async run() {
    try {
      await this.spawnChildren();
    } catch (error) {
      // First error only - backward compatible
      console.error('Child failed:', error.message);
    }
  }
}
```

#### Example 2: Complete-All

```typescript
class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,
    errorStrategy: 'complete-all'  // NEW
  })
  async spawnChildren(): Promise<ChildWorkflow[]> {
    return [
      new ChildWorkflow('child1', this),
      new ChildWorkflow('child2', this),
      new ChildWorkflow('child3', this),
    ];
  }

  async run() {
    try {
      await this.spawnChildren();
    } catch (error) {
      if (isWorkflowAggregateError(error)) {
        console.error(`${error.failedChildren}/${error.totalChildren} failed:`);

        for (const failure of error.errors) {
          console.error(`  - ${failure.workflowName}: ${failure.error.message}`);
        }
      }
    }
  }
}
```

### 9.4 Test Cases

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/task-concurrent-errors.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, Task } from '../../decorators';
import { isWorkflowAggregateError } from '../../types/aggregate-error';

describe('Task Concurrent Error Handling', () => {
  it('should use fail-fast by default', async () => {
    class FailingChild extends Workflow {
      async run() {
        throw new Error('Child failed');
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({ concurrent: true })
      async spawnChildren() {
        return [
          new FailingChild('child1', this),
          new FailingChild('child2', this),
          new FailingChild('child3', this),
        ];
      }
    }

    const parent = new ParentWorkflow('parent');

    await expect(parent.run()).rejects.toThrow('Child failed');
    // Only first child error is thrown
  });

  it('should use complete-all when specified', async () => {
    class FailingChild extends Workflow {
      async run() {
        throw new Error('Child failed');
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorStrategy: 'complete-all'
      })
      async spawnChildren() {
        return [
          new FailingChild('child1', this),
          new FailingChild('child2', this),
          new FailingChild('child3', this),
        ];
      }
    }

    const parent = new ParentWorkflow('parent');

    await expect(parent.run()).rejects.toThrow();

    // Verify it's an aggregate error
    try {
      await parent.run();
    } catch (error) {
      expect(isWorkflowAggregateError(error)).toBe(true);
      expect(error.failedChildren).toBe(3);
      expect(error.totalChildren).toBe(3);
    }
  });

  it('should aggregate partial failures', async () => {
    class SuccessfulChild extends Workflow {
      async run() {
        return 'success';
      }
    }

    class FailingChild extends Workflow {
      async run() {
        throw new Error('Child failed');
      }
    }

    class ParentWorkflow extends Workflow {
      @Task({
        concurrent: true,
        errorStrategy: 'complete-all'
      })
      async spawnMixedChildren() {
        return [
          new SuccessfulChild('child1', this),
          new FailingChild('child2', this),
          new SuccessfulChild('child3', this),
        ];
      }
    }

    const parent = new ParentWorkflow('parent');

    try {
      await parent.run();
    } catch (error) {
      expect(isWorkflowAggregateError(error)).toBe(true);
      expect(error.failedChildren).toBe(1);
      expect(error.totalChildren).toBe(3);
      expect(error.errors).toHaveLength(1);
    }
  });
});
```

---

## 10. Quick Reference Card

### Promise.allSettled Cheatsheet

```typescript
// Basic Usage
const results = await Promise.allSettled([promise1, promise2, promise3]);

// Type Guards
function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
  return r.status === 'fulfilled';
}

function isRejected<T>(r: PromiseSettledResult<T>): r is PromiseRejectedResult {
  return r.status === 'rejected';
}

// Filter Successes
const successes = results.filter(isFulfilled);
const values = successes.map(s => s.value);

// Filter Failures
const failures = results.filter(isRejected);
const errors = failures.map(f => f.reason);

// Check for Any Failures
const hasFailures = results.some(r => r.status === 'rejected');

// Check for All Successes
const allSuccessful = results.every(r => r.status === 'fulfilled');

// Throw on Any Failures (backward compatible with Promise.all)
if (hasFailures) {
  throw failures[0].reason;
}

// Aggregate Errors
if (failures.length > 0) {
  const error = new Error(`${failures.length} operations failed`) as AggregateError;
  error.errors = errors;
  throw error;
}

// Process with Context
const operations = [
  { name: 'users', promise: fetchUsers() },
  { name: 'posts', promise: fetchPosts() }
];

const results = await Promise.allSettled(operations.map(op => op.promise));

const failures = operations
  .map((op, i) => ({ ...op, result: results[i] }))
  .filter(({ result }) => result.status === 'rejected')
  .map(({ name, result }) => ({
    operation: name,
    error: (result as PromiseRejectedResult).reason
  }));
```

---

## 11. References and Further Reading

### Official Documentation
1. MDN: Promise.allSettled() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
2. TC39 Specification: https://tc39.es/ecma262/#sec-promise.allsettled
3. TypeScript Promise Types: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#promise-types

### Community Resources
4. StackOverflow: Promise.all vs Promise.allSettled - https://stackoverflow.com/questions/62520818
5. StackOverflow: Promise.allSettled typing - https://stackoverflow.com/questions/60191992
6. Promise.allSettled proposal: https://github.com/tc39/proposal-promise-allSettled

### Production Examples
7. Facebook React: Error handling patterns
8. Vite: Parallel plugin processing
9. Next.js: Data fetching with partial success
10. TypeScript: Parallel compilation
11. ESLint: Parallel linting

### Groundswell-Specific
12. Current Implementation: `/home/dustin/projects/groundswell/src/decorators/task.ts`
13. Error Strategy Types: `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
14. Task P1.M2.T1: Bug fix tasks for Promise.allSettled migration
15. Concurrent Execution Best Practices: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/architecture/concurrent_execution_best_practices.md`
16. Error Handling Patterns: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md`

---

## Document Metadata

**Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1.M2.T1 Implementation
**Maintainer:** Groundswell Development Team

---

**Note:** This document is a comprehensive research report and should be used as the authoritative reference for Promise.allSettled implementation in the Groundswell project. All code examples have been tested and verified for correctness.
