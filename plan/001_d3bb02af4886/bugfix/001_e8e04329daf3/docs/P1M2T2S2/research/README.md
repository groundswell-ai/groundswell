# Error Aggregation Research Summary

**Research Date:** 2026-01-12
**Status:** Complete
**Target:** P1M2T2S2 - Implement Error Aggregation in @Task Decorator

---

## Overview

This directory contains comprehensive research on error aggregation patterns and implementations, gathered to inform the implementation of error merge strategies in the Groundswell workflow engine's @Task decorator.

## Research Documents

### 1. TypeScript Error Aggregation Patterns
**File:** `01_typescript_error_aggregation_patterns.md`

**Key Findings:**
- TypeScript's discriminated unions and type guards enable type-safe Promise.allSettled patterns
- Three fundamental patterns: basic collection, filter pattern, reduce pattern
- Production-grade patterns include contextual error aggregation and threshold-based handling
- Common pitfalls: forgetting type guards, losing context, not normalizing errors

**Recommendations for Groundswell:**
- Create reusable type guards for PromiseSettledResult
- Implement contextual error aggregation with workflow IDs and names
- Normalize all errors to Error objects before aggregation
- Include statistics (total, succeeded, failed, error rate)

### 2. AggregateError Patterns and Implementations
**File:** `02_aggregate_error_patterns.md`

**Key Findings:**
- Native AggregateError available in ES2021+ (Node.js 15.0+, modern browsers)
- Custom implementations needed for enriched context and hierarchical aggregation
- Polyfill required for older environments
- Production patterns: retry logic, deduplication, categorization

**Recommendations for Groundswell:**
- Create custom WorkflowAggregateError interface extending Error
- Include hierarchical context (parent workflow ID, task name)
- Support nested aggregation for workflow hierarchies
- Use feature detection with polyfill fallback

### 3. Error Merging Strategies from Popular Libraries
**File:** `03_error_merging_strategies.md`

**Key Findings:**
- React: Error boundaries accumulate errors, delegate to reporting services
- Angular: Time-based aggregation windows, context capture (component, route)
- Node.js: Middleware error accumulation, Promise.allSettled patterns
- Sentry: Server-side aggregation by stacktrace, custom fingerprinting

**Recommendations for Groundswell:**
- Implement time-windowed aggregation for rapid error bursts
- Capture workflow context (ID, name, state snapshot, logs)
- Group errors by type for better analysis
- Provide statistics (total errors, errors by workflow, errors by type)

### 4. GitHub and StackOverflow Examples
**File:** `04_github_stackoverflow_examples.md`

**Key Findings:**
- Community consensus: Promise.allSettled for complete error visibility
- Common patterns: contextual results, statistics, retry logic
- Best practices: type guards, context preservation, error normalization
- Common mistakes: losing context, not using type guards, memory issues

**Recommendations for Groundswell:**
- Associate errors with child workflow IDs and names
- Use type guards for type-safe filtering
- Implement batch processing for large workflow arrays
- Provide clear, actionable error messages

## Common Patterns Across All Research

### 1. Context Preservation
All production implementations preserve operation/workflow context:
- Operation/workflow ID
- Operation/workflow name
- Timestamp
- Additional metadata

### 2. Error Normalization
All implementations handle non-Error rejections:
```typescript
const error = reason instanceof Error ? reason : new Error(String(reason));
```

### 3. Type Safety
TypeScript implementations use type guards:
```typescript
function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
  return r.status === 'fulfilled';
}
```

### 4. Statistics Generation
Most implementations provide statistics:
- Total count
- Success count
- Failure count
- Error rate
- Errors by type/category

### 5. Hierarchical Support
Sophisticated implementations support nesting:
- Parent context preservation
- Nested aggregation
- Error causation chains

## Common Pitfalls to Avoid

### 1. Not Using Type Guards
**Problem:** TypeScript cannot narrow PromiseSettledResult without type predicates
**Solution:** Always use type guards for filtering

### 2. Losing Operation Context
**Problem:** Results lose connection to their source operations
**Solution:** Map results back to operations with IDs and names

### 3. Not Normalizing Errors
**Problem:** Promises can reject with non-Error values
**Solution:** Always normalize to Error objects

### 4. Memory Issues with Large Arrays
**Problem:** Storing all results can consume significant memory
**Solution:** Use batch processing for large arrays

### 5. Forgetting Promise.allSettled Never Rejects
**Problem:** Trying to catch Promise.allSettled itself won't work
**Solution:** Check results for rejections instead

## Recommended Implementation for Groundswell

### Interface Design

```typescript
interface WorkflowAggregateError extends Error {
  name: 'WorkflowAggregateError';
  message: string;
  errors: Array<{
    workflowId: string;
    workflowName: string;
    error: WorkflowError;
    timestamp: number;
  }>;
  parentContext: {
    workflowId: string;
    workflowName: string;
    taskName: string;
  };
  stats: {
    totalChildren: number;
    failedChildren: number;
    successRate: number;
    errorsByType: Record<string, number>;
  };
}
```

### Implementation Pattern

```typescript
// In @Task decorator, after Promise.allSettled
const settledResults = await Promise.allSettled(
  runnable.map((w) => w.run())
);

// Collect errors with context
const errors = settledResults
  .map((result, idx) => ({ result, workflow: runnable[idx] }))
  .filter(({ result }) => result.status === 'rejected')
  .map(({ result, workflow }) => ({
    workflowId: workflow.id,
    workflowName: workflow.constructor.name,
    error: (result as PromiseRejectedResult).reason,
    timestamp: Date.now(),
  }));

// If error merge strategy enabled, create aggregate error
if (errors.length > 0 && opts.errorMergeStrategy?.enabled) {
  const aggregateError = createWorkflowAggregateError(
    errors,
    taskName,
    wf.id,
    runnable.length
  );

  throw aggregateError;
}
```

### Factory Function

```typescript
function createWorkflowAggregateError(
  errors: Array<{
    workflowId: string;
    workflowName: string;
    error: WorkflowError;
    timestamp: number;
  }>,
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowAggregateError {
  // Calculate statistics
  const errorsByType: Record<string, number> = {};
  for (const { error } of errors) {
    const type = error.original instanceof Error
      ? error.original.constructor.name
      : 'Unknown';
    errorsByType[type] = (errorsByType[type] || 0) + 1;
  }

  const error = new Error(
    `${errors.length} child workflow(s) failed in task '${taskName}'`
  ) as WorkflowAggregateError;

  error.name = 'WorkflowAggregateError';
  error.errors = errors;
  error.parentContext = {
    workflowId: parentWorkflowId,
    workflowName: '', // Get from context if available
    taskName,
  };
  error.stats = {
    totalChildren,
    failedChildren: errors.length,
    successRate: (totalChildren - errors.length) / totalChildren,
    errorsByType,
  };

  return error;
}
```

## Next Steps

1. **Review research documents** in detail
2. **Update TaskOptions interface** to include errorMergeStrategy (P1M2T2S1 - Complete)
3. **Implement error aggregation logic** in @Task decorator (P1M2T2S2)
4. **Create default error merger** with workflow context (P1M2T2S3)
5. **Add comprehensive tests** for error aggregation (P1M2T2S4)

## References

### Official Documentation
1. MDN: Promise.allSettled() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
2. MDN: AggregateError - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
3. TC39: Promise.allSettled Proposal - https://github.com/tc39/proposal-promise-allSettled

### Groundswell Codebase
4. @Task Decorator: /home/dustin/projects/groundswell/src/decorators/task.ts
5. Error Strategy Types: /home/dustin/projects/groundswell/src/types/error-strategy.ts
6. WorkflowError Interface: /home/dustin/projects/groundswell/src/types/error.ts
7. Existing Research: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1M2T2S2 Implementation
