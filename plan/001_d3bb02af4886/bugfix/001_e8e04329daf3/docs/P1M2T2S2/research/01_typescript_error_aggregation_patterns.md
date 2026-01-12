# TypeScript Error Aggregation Patterns for Promise.allSettled

**Research Date:** 2026-01-12
**Status:** Comprehensive Research Report
**Target:** P1M2T2S2 - Error Aggregation Implementation

---

## Executive Summary

This document provides comprehensive research on TypeScript error aggregation patterns specifically for Promise.allSettled results. It covers fundamental patterns, type-safe implementations, production-grade strategies, and common pitfalls.

**Key Finding:** TypeScript's type system provides excellent support for Promise.allSettled through discriminated unions and type guards, enabling type-safe error aggregation patterns that preserve both success and failure information.

---

## Table of Contents

1. [Fundamental Patterns](#1-fundamental-patterns)
2. [Type-Safe Implementations](#2-type-safe-implementations)
3. [Production-Grade Patterns](#3-production-grade-patterns)
4. [Common Pitfalls](#4-common-pitfalls)
5. [Best Practices](#5-best-practices)
6. [Code Examples](#6-code-examples)

---

## 1. Fundamental Patterns

### 1.1 Basic Error Collection Pattern

The simplest pattern for collecting errors from Promise.allSettled:

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

**Key Insights:**
- Preserves both successful values and errors
- Returns a structured result for explicit handling
- Caller decides what to do with errors

**Use Cases:**
- Bulk operations where partial success is acceptable
- Data synchronization scenarios
- Batch processing with retry logic

### 1.2 Filter Pattern

Using array methods to separate successes and failures:

```typescript
async function executeWithFilter<T>(
  promises: Promise<T>[]
): Promise<{ successes: T[]; failures: unknown[] }> {
  const results = await Promise.allSettled(promises);

  const successes = results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

  return { successes, failures };
}
```

**Key Insights:**
- Uses TypeScript type guards for type narrowing
- Cleaner separation of concerns
- More functional programming style

**Use Cases:**
- When you need separate arrays for successes and failures
- When you want to process successes and failures differently
- Reporting and analytics scenarios

### 1.3 Reduce Pattern

Using reduce to accumulate results in a single pass:

```typescript
async function executeWithReduce<T>(
  promises: Promise<T>[]
): Promise<{ successes: T[]; failures: unknown[]; stats: { total: number; succeeded: number; failed: number } }> {
  const results = await Promise.allSettled(promises);

  const { successes, failures, stats } = results.reduce<{
    successes: T[];
    failures: unknown[];
    stats: { total: number; succeeded: number; failed: number };
  }>(
    (acc, result) => {
      acc.stats.total++;

      if (result.status === 'fulfilled') {
        acc.successes.push(result.value);
        acc.stats.succeeded++;
      } else {
        acc.failures.push(result.reason);
        acc.stats.failed++;
      }

      return acc;
    },
    { successes: [], failures: [], stats: { total: 0, succeeded: 0, failed: 0 } }
  );

  return { successes, failures, stats };
}
```

**Key Insights:**
- Single pass through results (more efficient)
- Builds statistics alongside collection
- Useful for monitoring and analytics

**Use Cases:**
- When you need statistics along with results
- Performance-critical scenarios with large arrays
- Real-time monitoring and reporting

---

## 2. Type-Safe Implementations

### 2.1 Type Guards for PromiseSettledResult

TypeScript requires type guards to properly narrow PromiseSettledResult types:

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

// Without type guard - TypeScript error
// results.filter(r => r.status === 'fulfilled').map(r => r.value); // ERROR

// With type guard - TypeScript knows value exists
const successes = results.filter(isFulfilled).map(r => r.value);
const failures = results.filter(isRejected).map(r => r.reason);
```

**Key Insights:**
- Type guards are essential for type safety
- TypeScript cannot narrow types without explicit type predicates
- Reusable type guards improve code consistency

### 2.2 Discriminated Union Pattern

Create a custom discriminated union for better type safety:

```typescript
type SettledResult<T, E = Error> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: E };

async function executeWithDiscriminatedUnion<T>(
  promises: Promise<T>[]
): Promise<SettledResult<T, Error>[]> {
  const results = await Promise.allSettled(promises);

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { status: 'fulfilled' as const, value: result.value };
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      return { status: 'rejected' as const, error };
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

**Key Insights:**
- Custom discriminated unions provide better type safety
- Normalizes non-Error rejections to Error objects
- More explicit and self-documenting than PromiseSettledResult

### 2.3 Generic Error Aggregation Type

Create a reusable generic type for error aggregation:

```typescript
type ExecutionResult<T, E = Error> = {
  successes: T[];
  failures: Array<{ index: number; error: E }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    errorRate: number;
  };
};

async function executeWithTypedErrors<T, E = Error>(
  promises: Promise<T>[]
): Promise<ExecutionResult<T, E>> {
  const results = await Promise.allSettled(promises);

  const successes: T[] = [];
  const failures: Array<{ index: number; error: E }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? (reason as E) : new Error(String(reason)) as E;
      failures.push({ index, error });
    }
  });

  const stats = {
    total: results.length,
    succeeded: successes.length,
    failed: failures.length,
    errorRate: failures.length / results.length,
  };

  return { successes, failures, stats };
}
```

**Key Insights:**
- Generic types enable reusability across different scenarios
- Preserves index information for debugging
- Includes statistics for monitoring

---

## 3. Production-Grade Patterns

### 3.1 Contextual Error Aggregation

Associate errors with their source operations:

```typescript
interface Operation<T> {
  id: string;
  name: string;
  promise: Promise<T>;
}

interface OperationResult<T, E = Error> {
  operation: { id: string; name: string };
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: E;
}

async function executeWithContext<T>(
  operations: Operation<T>[]
): Promise<OperationResult<T>[]> {
  const promises = operations.map(op => op.promise);
  const results = await Promise.allSettled(promises);

  return operations.map((operation, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      return {
        operation: { id: operation.id, name: operation.name },
        status: 'fulfilled',
        value: result.value,
      };
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      return {
        operation: { id: operation.id, name: operation.name },
        status: 'rejected',
        error,
      };
    }
  });
}
```

**Key Insights:**
- Preserves operation context (id, name) with results
- Critical for debugging and logging
- Enables detailed error reporting

**Use Cases:**
- Batch API calls with different endpoints
- Multi-step workflows
- Parallel data processing with different sources

### 3.2 Error Rate Thresholding

Implement threshold-based error handling:

```typescript
interface ThresholdOptions {
  maxErrorRate: number; // 0.0 to 1.0
  minAbsoluteErrors: number;
  onThresholdExceeded?: (stats: { errorRate: number; failed: number; total: number }) => void;
}

async function executeWithThreshold<T>(
  promises: Promise<T>[],
  options: ThresholdOptions
): Promise<{ successes: T[]; failures: unknown[]; exceededThreshold: boolean }> {
  const results = await Promise.allSettled(promises);

  const successes = results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

  const errorRate = failures.length / results.length;
  const exceededThreshold =
    failures.length >= options.minAbsoluteErrors ||
    errorRate > options.maxErrorRate;

  if (exceededThreshold && options.onThresholdExceeded) {
    options.onThresholdExceeded({
      errorRate,
      failed: failures.length,
      total: results.length,
    });
  }

  return { successes, failures, exceededThreshold };
}
```

**Key Insights:**
- Allows some failures without throwing
- Configurable tolerance levels
- Useful for graceful degradation

**Use Cases:**
- High-volume operations where some failures are acceptable
- Cache warming
- Bulk notifications
- Data replication

### 3.3 Hierarchical Error Aggregation

Aggregate errors with hierarchical context:

```typescript
interface HierarchicalError {
  message: string;
  errors: Array<{
    operationId: string;
    operationName: string;
    error: Error;
    timestamp: number;
  }>;
  parentContext?: {
    workflowId: string;
    workflowName: string;
  };
  stats: {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    errorsByType: Record<string, number>;
  };
}

async function executeWithHierarchicalErrors<T>(
  operations: Array<{ id: string; name: string; promise: Promise<T> }>,
  parentContext?: { workflowId: string; workflowName: string }
): Promise<{ successes: T[]; aggregatedError?: HierarchicalError }> {
  const results = await Promise.allSettled(operations.map(op => op.promise));

  const successes: T[] = [];
  const errors: Array<{
    operationId: string;
    operationName: string;
    error: Error;
    timestamp: number;
  }> = [];

  operations.forEach((op, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      errors.push({
        operationId: op.id,
        operationName: op.name,
        error,
        timestamp: Date.now(),
      });
    }
  });

  if (errors.length > 0) {
    const errorsByOperation: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    errors.forEach(err => {
      errorsByOperation[err.operationName] = (errorsByOperation[err.operationName] || 0) + 1;
      const errorType = err.error.constructor.name;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    const aggregatedError: HierarchicalError = {
      message: `${errors.length} operation(s) failed`,
      errors,
      parentContext,
      stats: {
        totalErrors: errors.length,
        errorsByOperation,
        errorsByType,
      },
    };

    return { successes, aggregatedError };
  }

  return { successes };
}
```

**Key Insights:**
- Maintains full error hierarchy
- Provides error statistics and categorization
- Excellent for debugging and monitoring

**Use Cases:**
- Complex workflow engines
- Distributed systems
- Microservice orchestration

---

## 4. Common Pitfalls

### 4.1 Forgetting Type Guards

**Problem:** Not using type guards causes type narrowing issues.

```typescript
// ❌ WRONG - TypeScript error
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

### 4.2 Losing Error Context

**Problem:** Not capturing which operation failed makes debugging difficult.

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

### 4.3 Not Handling Non-Error Rejections

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

### 4.4 Memory Issues with Large Arrays

**Problem:** Storing all results can consume significant memory.

```typescript
// ❌ PROBLEMATIC - Stores all results in memory
const results = await Promise.allSettled(largeArrayOfPromises);

// ✅ BETTER - Process results in batches
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

---

## 5. Best Practices

### 5.1 Always Use Type Guards

```typescript
// Reusable type guards
export const PromiseSettledHelpers = {
  isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
    return result.status === 'fulfilled';
  },

  isRejected<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
    return result.status === 'rejected';
  },

  filterFulfilled<T>(results: PromiseSettledResult<T>[]): T[] {
    return results.filter(this.isFulfilled).map(r => r.value);
  },

  filterRejected<T>(results: PromiseSettledResult<T>[]): unknown[] {
    return results.filter(this.isRejected).map(r => r.reason);
  },
};
```

### 5.2 Preserve Operation Context

Always associate results with their source operations:

```typescript
interface ContextualResult<T, E = Error> {
  operationId: string;
  operationName: string;
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: E;
}

async function executeWithContext<T>(
  operations: Array<{ id: string; name: string; promise: Promise<T> }>
): Promise<ContextualResult<T>[]> {
  // Implementation from section 3.1
}
```

### 5.3 Normalize Errors

Always normalize non-Error rejections to Error objects:

```typescript
function normalizeError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  if (reason === null || reason === undefined) {
    return new Error('Unknown error');
  }
  return new Error(String(reason));
}
```

### 5.4 Provide Statistics

Include statistics for monitoring and debugging:

```typescript
interface ExecutionStats {
  total: number;
  succeeded: number;
  failed: number;
  errorRate: number;
  duration: number;
}
```

---

## 6. Code Examples

### 6.1 Complete Example: Batch API Calls

```typescript
interface ApiCall {
  id: string;
  name: string;
  url: string;
}

interface ApiResult {
  id: string;
  name: string;
  status: number;
  data?: unknown;
  error?: Error;
}

async function batchApiCalls(calls: ApiCall[]): Promise<{
  successes: ApiResult[];
  failures: ApiResult[];
  stats: { total: number; succeeded: number; failed: number; errorRate: number };
}> {
  const operations = calls.map(call => ({
    id: call.id,
    name: call.name,
    promise: fetch(call.url).then(res => ({
      id: call.id,
      name: call.name,
      status: res.status,
      data: res.ok ? await res.json() : undefined,
    })),
  }));

  const results = await Promise.allSettled(operations.map(op => op.promise));

  const successes: ApiResult[] = [];
  const failures: ApiResult[] = [];

  operations.forEach((op, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      failures.push({
        id: op.id,
        name: op.name,
        status: 0,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      });
    }
  });

  const stats = {
    total: results.length,
    succeeded: successes.length,
    failed: failures.length,
    errorRate: failures.length / results.length,
  };

  return { successes, failures, stats };
}
```

### 6.2 Complete Example: Workflow Error Aggregation

```typescript
interface WorkflowError {
  workflowId: string;
  workflowName: string;
  error: Error;
  timestamp: number;
}

interface WorkflowAggregateError extends Error {
  name: 'WorkflowAggregateError';
  message: string;
  errors: WorkflowError[];
  parentWorkflowId: string;
  totalChildren: number;
  failedChildren: number;
}

function createWorkflowAggregateError(
  errors: WorkflowError[],
  parentWorkflowId: string,
  totalChildren: number
): WorkflowAggregateError {
  const error = new Error(
    `${errors.length} child workflow(s) failed`
  ) as WorkflowAggregateError;

  error.name = 'WorkflowAggregateError';
  error.errors = errors;
  error.parentWorkflowId = parentWorkflowId;
  error.totalChildren = totalChildren;
  error.failedChildren = errors.length;

  return error;
}
```

---

## References

### TypeScript Documentation
1. TypeScript Handbook: Type Guards - https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
2. TypeScript Handbook: Discriminated Unions - https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
3. PromiseSettledResult Type - https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#promise-types

### MDN Documentation
4. Promise.allSettled() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
5. Using Promises - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises

### Community Resources
6. StackOverflow: TypeScript Promise.allSettled typing - https://stackoverflow.com/questions/60191992
7. StackOverflow: Type guards for PromiseSettledResult - https://stackoverflow.com/questions/60386810

### Groundswell-Specific
8. Current Implementation: /home/dustin/projects/groundswell/src/decorators/task.ts
9. Error Strategy Types: /home/dustin/projects/groundswell/src/types/error-strategy.ts
10. WorkflowError Interface: /home/dustin/projects/groundswell/src/types/error.ts

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1M2T2S2 Implementation
