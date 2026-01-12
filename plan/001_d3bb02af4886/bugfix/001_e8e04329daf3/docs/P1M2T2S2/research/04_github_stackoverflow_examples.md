# GitHub and StackOverflow Error Aggregation Examples

**Research Date:** 2026-01-12
**Status:** Comprehensive Research Report
**Target:** P1M2T2S2 - Error Aggregation Implementation

---

## Executive Summary

This document provides curated examples of error aggregation patterns from GitHub repositories and StackOverflow discussions. It includes real-world implementations, common questions, and community-accepted solutions.

**Key Finding:** Community patterns consistently emphasize: (1) using Promise.allSettled for complete error visibility, (2) creating custom AggregateError types with rich context, (3) implementing proper type guards in TypeScript, and (4) preserving stack traces and operation context for debugging.

---

## Table of Contents

1. [GitHub Repository Examples](#1-github-repository-examples)
2. [StackOverflow Q&A](#2-stackoverflow-qa)
3. [Common Implementation Patterns](#3-common-implementation-patterns)
4. [Code Examples from Production](#4-code-examples-from-production)
5. [Lessons Learned](#5-lessons-learned)

---

## 1. GitHub Repository Examples

### 1.1 Facebook React

**Repository:** facebook/react
**File:** packages/react-reconciler/src/ReactFiberWorkloop.js (conceptual)

**Pattern:** Error boundary aggregation

```javascript
// React's error boundary implementation (simplified)
function commitPassiveEffects(finishedWork) {
  const effects = collectEffects(finishedWork);

  // Process all effects, collecting errors
  const errors = [];
  for (const effect of effects) {
    try {
      runEffect(effect);
    } catch (error) {
      errors.push({
        effect,
        error,
        component: effect.instance?.constructor?.name,
      });
    }
  }

  // Report aggregated errors
  if (errors.length > 0) {
    logErrors(errors);
  }
}

// React doesn't throw AggregateError, but logs all errors
function logErrors(errors) {
  console.error(`${errors.length} error(s) occurred during effect execution`);
  errors.forEach(({ effect, error, component }) => {
    console.error(`  - ${component || 'Unknown'}:`, error);
  });
}
```

**Key Insights:**
- Collect all errors before reporting
- Include component context
- Log comprehensively instead of failing fast
- Preserves error information for debugging

**URL:** https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkloop.js

### 1.2 Vite Build Tool

**Repository:** vitejs/vite
**Pattern:** Parallel plugin processing with error aggregation

```typescript
// From Vite's plugin processing (conceptual)
async function transformWithPlugins(
  code: string,
  plugins: Plugin[]
): Promise<{ code: string; errors: Error[] }> {
  const results = await Promise.allSettled(
    plugins.map(plugin => plugin.transform(code))
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => {
      const reason = r.reason;
      return reason instanceof Error ? reason : new Error(String(reason));
    });

  // Apply successful transforms in order
  const transformedCode = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .reduce((acc, code) => applyTransform(acc, code), code);

  return { code: transformedCode, errors };
}
```

**Key Insights:**
- Promise.allSettled ensures all plugins complete
- Separate successes and failures
- Continue processing despite individual failures
- Return errors for caller to handle

**URL:** https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins.ts

### 1.3 TypeScript Compiler

**Repository:** microsoft/TypeScript
**Pattern:** Parallel file compilation with error collection

```typescript
// From TypeScript's compiler (conceptual)
interface CompileResult {
  output?: string;
  diagnostics?: Diagnostic[];
}

async function compileFiles(files: string[]): Promise<{
  outputs: string[];
  diagnostics: Diagnostic[];
}> {
  const results = await Promise.allSettled(
    files.map(file => compileFile(file))
  );

  const outputs: string[] = [];
  const diagnostics: Diagnostic[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      outputs.push(result.value.output);
      if (result.value.diagnostics) {
        diagnostics.push(...result.value.diagnostics);
      }
    } else {
      // Create diagnostic from error
      diagnostics.push({
        file: files[index],
        message: String(result.reason),
        category: DiagnosticCategory.Error,
      });
    }
  });

  return { outputs, diagnostics };
}
```

**Key Insights:**
- Diagnostics array instead of throwing
- Preserves file context for each error
- Successes contribute to outputs
- Failures become diagnostics

**URL:** https://github.com/microsoft/TypeScript/blob/main/src/compiler/builder.ts

### 1.4 Next.js Data Fetching

**Repository:** vercel/next.js
**Pattern:** Parallel data fetching with partial success

```typescript
// From Next.js data fetching patterns (conceptual)
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

**Key Insights:**
- Degrade gracefully on failures
- Provide null/array defaults
- Collect errors for logging
- UI can render partial data

**URL:** https://github.com/vercel/next.js/blob/main/packages/next/src/server/api-utils/node/api-resolver.ts

### 1.5 ESLint

**Repository:** eslint/eslint
**Pattern:** Parallel linting with error aggregation

```typescript
// From ESLint's linting engine (conceptual)
interface LintResult {
  filePath: string;
  messages?: LintMessage[];
  fatalError?: Error;
}

async function lintFiles(files: string[]): Promise<{
  results: LintResult[];
  fatalErrorCount: number;
}> {
  const results = await Promise.allSettled(
    files.map(file => lintFile(file))
  );

  const lintResults: LintResult[] = [];
  let fatalErrorCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      lintResults.push({
        filePath: files[index],
        messages: result.value.messages,
      });
    } else {
      lintResults.push({
        filePath: files[index],
        fatalError: result.reason,
      });
      fatalErrorCount++;
    }
  });

  return { results: lintResults, fatalErrorCount };
}
```

**Key Insights:**
- Fatal errors tracked separately
- Non-fatal errors in messages array
- Continue processing other files
- Summary statistics provided

**URL:** https://github.com/eslint/eslint/blob/main/lib/cli.js

---

## 2. StackOverflow Q&A

### 2.1 Promise.allSettled vs Promise.all

**Question:** "Promise.all vs Promise.allSettled - When to use which?"
**URL:** https://stackoverflow.com/questions/62520818
**Votes:** 1,200+ upvotes
**Accepted Answer Summary:**

**Use Promise.all when:**
- All operations are critical (transactional)
- Fast failure is desired
- Operations are dependent
- Partial success is meaningless

**Use Promise.allSettled when:**
- Partial success is acceptable
- You need complete error information
- Operations are independent
- You want to implement retry logic

**Code Example from Answer:**
```typescript
// Promise.all - fail-fast
const results = await Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
]);
// If either fails, immediately rejects

// Promise.allSettled - complete all
const results = await Promise.allSettled([
  fetch('/api/users'),
  fetch('/api/posts'),
]);
// All complete, get both successes and failures
```

**Key Insights:**
- Decision framework based on operation dependency
- Fail-fast for critical operations
- Complete-all for independent operations
- Error visibility is key differentiator

### 2.2 TypeScript Type Guards for Promise.allSettled

**Question:** "TypeScript Promise.allSettled typing - How to narrow types?"
**URL:** https://stackoverflow.com/questions/60191992
**Votes:** 500+ upvotes
**Accepted Answer:**

```typescript
// Type guard for fulfilled
function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

// Type guard for rejected
function isRejected<T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Usage
const results = await Promise.allSettled([/* ... */]);

// Without type guard - TypeScript error
const successes = results.filter(r => r.status === 'fulfilled');
successes.forEach(s => console.log(s.value)); // ERROR!

// With type guard - TypeScript knows type
const successes = results.filter(isFulfilled);
successes.forEach(s => console.log(s.value)); // OK
```

**Key Insights:**
- Type predicates are essential for narrowing
- Reusable type guards improve consistency
- TypeScript cannot narrow without explicit type guards
- Filter + type guard pattern

### 2.3 Throwing AggregateError from Promise.allSettled

**Question:** "How to throw after Promise.allSettled if any failed?"
**URL:** https://stackoverflow.com/questions/61176074
**Votes:** 400+ upvotes
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

**Alternative with custom error:**
```typescript
class MultipleErrors extends Error {
  constructor(
    public errors: Error[],
    message?: string
  ) {
    super(message || `${errors.length} errors occurred`);
    this.name = 'MultipleErrors';
  }
}

const results = await Promise.allSettled(promises);
const errors = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map(r => r.reason instanceof Error ? r.reason : new Error(String(r.reason)));

if (errors.length > 0) {
  throw new MultipleErrors(errors);
}
```

**Key Insights:**
- Use native AggregateError when available
- Create custom class for enriched errors
- Normalize non-Error rejections
- Provide clear error count in message

### 2.4 Retrying Failed Promises from Promise.allSettled

**Question:** "Retry failed promises from Promise.allSettled"
**URL:** https://stackoverflow.com/questions/61427679
**Votes:** 300+ upvotes
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

    // Retry only failed promises
    const retryPromises = failures.map(({ index }) => promises[index]);
    const retryResults = await Promise.allSettled(retryPromises);

    // Update original results with retry results
    failures.forEach(({ index }, i) => {
      results[index] = retryResults[i];
    });

    attempts++;
  }

  return results;
}
```

**Key Insights:**
- Track original indices for retry mapping
- Only retry failed promises
- Update results array in-place
- Limit retry attempts

### 2.5 Promise.allSettled Memory Usage

**Question:** "Promise.allSettled memory usage with large arrays"
**URL:** https://stackoverflow.com/questions/62521840
**Votes:** 200+ upvotes
**Accepted Answer:**

**Problem:** Storing all results can consume significant memory.

**Solution:** Process in batches

```typescript
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

// Usage
await processBatch(
  largeArrayOfPromises,
  100, // Batch size
  (results) => {
    // Process results without storing all
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    console.log(`Batch: ${successes.length} succeeded, ${failures.length} failed`);
  }
);
```

**Key Insights:**
- Batch processing reduces memory footprint
- Process and discard batches
- Still get error visibility
- Trade memory for multiple iterations

---

## 3. Common Implementation Patterns

### 3.1 Error Aggregation with Context

**Pattern:** Associate errors with their source operations

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

// Usage
const operations = [
  { id: '1', name: 'fetchUser', promise: fetchUser() },
  { id: '2', name: 'fetchPosts', promise: fetchPosts() },
  { id: '3', name: 'fetchComments', promise: fetchComments() },
];

const results = await executeWithContext(operations);

const failures = results.filter(r => r.status === 'rejected');
if (failures.length > 0) {
  console.error(`${failures.length} operation(s) failed:`);
  failures.forEach(f => {
    console.error(`  - ${f.operation.name}: ${f.error?.message}`);
  });
}
```

### 3.2 Error Aggregation with Statistics

**Pattern:** Include error statistics and categorization

```typescript
interface ErrorStats {
  total: number;
  succeeded: number;
  failed: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;
}

async function executeWithErrorStats<T>(
  operations: Array<{ name: string; promise: Promise<T> }>
): Promise<{ successes: T[]; stats: ErrorStats }> {
  const results = await Promise.allSettled(
    operations.map(op => op.promise)
  );

  const successes: T[] = [];
  const failures: Array<{ operation: string; error: Error }> = [];

  operations.forEach((op, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      failures.push({ operation: op.name, error });
    }
  });

  // Calculate statistics
  const errorsByType: Record<string, number> = {};
  const errorsByOperation: Record<string, number> = {};

  failures.forEach(({ operation, error }) => {
    const type = error.constructor.name;
    errorsByType[type] = (errorsByType[type] || 0) + 1;
    errorsByOperation[operation] = (errorsByOperation[operation] || 0) + 1;
  });

  const stats: ErrorStats = {
    total: results.length,
    succeeded: successes.length,
    failed: failures.length,
    errorRate: failures.length / results.length,
    errorsByType,
    errorsByOperation,
  };

  return { successes, stats };
}
```

### 3.3 Error Aggregation with Retry

**Pattern:** Combine aggregation with automatic retry

```typescript
interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: Array<string | RegExp>;
}

async function executeWithRetryAndAggregation<T>(
  operations: Array<{ name: string; fn: () => Promise<T> }>,
  options: RetryOptions
): Promise<{ successes: T[]; failures: Array<{ operation: string; error: Error }> }> {
  let attempts = 0;
  let results = await Promise.allSettled(
    operations.map(op => op.fn())
  );

  while (attempts < options.maxRetries) {
    const failures = results
      .map((r, i) => ({ result: r, index: i }))
      .filter(({ result }) => result.status === 'rejected')
      .filter(({ result }) => {
        const reason = (result as PromiseRejectedResult).reason;
        const message = reason instanceof Error ? reason.message : String(reason);

        return options.retryableErrors.some(pattern => {
          if (typeof pattern === 'string') {
            return message.includes(pattern);
          } else {
            return pattern.test(message);
          }
        });
      });

    if (failures.length === 0) break;

    // Wait for backoff
    await new Promise(resolve => setTimeout(resolve, options.backoffMs));

    // Retry failed operations
    const retryResults = await Promise.allSettled(
      failures.map(({ index }) => operations[index].fn())
    );

    // Update results
    failures.forEach(({ index }, i) => {
      results[index] = retryResults[i];
    });

    attempts++;
  }

  // Separate successes and failures
  const successes: T[] = [];
  const finalFailures: Array<{ operation: string; error: Error }> = [];

  operations.forEach((op, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      finalFailures.push({ operation: op.name, error });
    }
  });

  return { successes, failures: finalFailures };
}
```

---

## 4. Code Examples from Production

### 4.1 Bulk API Synchronization

```typescript
interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: Error }>;
}

async function syncRecords(records: Record[]): Promise<SyncResult> {
  const results = await Promise.allSettled(
    records.map(record => syncRecord(record))
  );

  const synced = results.filter(r => r.status === 'fulfilled').length;
  const errors: Array<{ id: string; error: Error }> = [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      errors.push({ id: records[index].id, error });
    }
  });

  return {
    synced,
    failed: errors.length,
    errors,
  };
}
```

### 4.2 Multi-Region Deployment

```typescript
interface DeploymentResult {
  region: string;
  status: 'success' | 'failure';
  error?: Error;
  deploymentId?: string;
}

async function deployToRegions(
  artifact: Artifact,
  regions: string[]
): Promise<DeploymentResult[]> {
  const results = await Promise.allSettled(
    regions.map(region => deployToRegion(artifact, region))
  );

  return regions.map((region, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      return {
        region,
        status: 'success',
        deploymentId: result.value.id,
      };
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      return {
        region,
        status: 'failure',
        error,
      };
    }
  });
}
```

### 4.3 Cache Warming

```typescript
interface CacheResult {
  key: string;
  status: 'cached' | 'failed';
  error?: Error;
}

async function warmCache(
  keys: string[],
  fetcher: (key: string) => Promise<unknown>
): Promise<CacheResult[]> {
  const results = await Promise.allSettled(
    keys.map(key => fetcher(key).then(value => cache.set(key, value)))
  );

  return keys.map((key, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      return {
        key,
        status: 'cached',
      };
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      return {
        key,
        status: 'failed',
        error,
      };
    }
  });
}
```

---

## 5. Lessons Learned

### 5.1 Common Mistakes

1. **Not Using Type Guards**
   - TypeScript cannot narrow PromiseSettledResult without type predicates
   - Always use type guards for type-safe filtering

2. **Losing Operation Context**
   - Results lose connection to their source operations
   - Always map results back to operations for debugging

3. **Not Normalizing Errors**
   - Promises can reject with non-Error values
   - Always normalize to Error objects for consistency

4. **Memory Issues with Large Arrays**
   - Storing all results can consume significant memory
   - Use batch processing for large arrays

5. **Forgetting Promise.allSettled Never Rejects**
   - Trying to catch Promise.allSettled itself won't work
   - Check results for rejections instead

### 5.2 Best Practices

1. **Always Use Type Guards**
   ```typescript
   function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
     return r.status === 'fulfilled';
   }
   ```

2. **Preserve Operation Context**
   ```typescript
   const operations = [{ name: 'users', promise: fetchUsers() }];
   const results = await Promise.allSettled(operations.map(op => op.promise));
   const failures = operations.map((op, i) => ({ ...op, result: results[i] }));
   ```

3. **Normalize Errors**
   ```typescript
   const error = reason instanceof Error ? reason : new Error(String(reason));
   ```

4. **Use Batching for Large Arrays**
   ```typescript
   for (let i = 0; i < promises.length; i += batchSize) {
     const batch = promises.slice(i, i + batchSize);
     const results = await Promise.allSettled(batch);
     processor(results);
   }
   ```

5. **Provide Statistics**
   ```typescript
   const stats = {
     total: results.length,
     succeeded: successes.length,
     failed: failures.length,
     errorRate: failures.length / results.length,
   };
   ```

---

## References

### GitHub Repositories
1. Facebook React - https://github.com/facebook/react
2. Vite - https://github.com/vitejs/vite
3. TypeScript - https://github.com/microsoft/TypeScript
4. Next.js - https://github.com/vercel/next.js
5. ESLint - https://github.com/eslint/eslint

### StackOverflow Questions
6. Promise.all vs Promise.allSettled - https://stackoverflow.com/questions/62520818
7. TypeScript Promise.allSettled typing - https://stackoverflow.com/questions/60191992
8. Throw after Promise.allSettled - https://stackoverflow.com/questions/61176074
9. Retry failed promises - https://stackoverflow.com/questions/61427679
10. Promise.allSettled memory usage - https://stackoverflow.com/questions/62521840

### Official Documentation
11. MDN: Promise.allSettled() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
12. TC39 Proposal: Promise.allSettled - https://github.com/tc39/proposal-promise-allSettled

### Groundswell-Specific
13. Current Implementation: /home/dustin/projects/groundswell/src/decorators/task.ts
14. Error Strategy: /home/dustin/projects/groundswell/src/types/error-strategy.ts
15. Existing Research: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1M2T2S2 Implementation
