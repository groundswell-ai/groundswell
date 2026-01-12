# AggregateError Patterns and Implementations

**Research Date:** 2026-01-12
**Status:** Comprehensive Research Report
**Target:** P1M2T2S2 - Error Aggregation Implementation

---

## Executive Summary

This document provides comprehensive research on AggregateError patterns and implementations in JavaScript and TypeScript. It covers the native AggregateError API, custom implementations, polyfills, and production-grade patterns.

**Key Finding:** Native AggregateError is available in ES2021+ (Node.js 15.0+, modern browsers), but custom implementations are needed for enriched error context and hierarchical error aggregation in workflow engines.

---

## Table of Contents

1. [Native AggregateError API](#1-native-aggregateerror-api)
2. [Custom AggregateError Implementations](#2-custom-aggregateerror-implementations)
3. [Polyfill Strategies](#3-polyfill-strategies)
4. [Production-Grade Patterns](#4-production-grade-patterns)
5. [TypeScript Integration](#5-typescript-integration)
6. [Common Pitfalls](#6-common-pitfalls)
7. [Code Examples](#7-code-examples)

---

## 1. Native AggregateError API

### 1.1 Basic Usage

AggregateError is a built-in error type in ES2021+:

```typescript
// Basic usage
const error1 = new Error('First error');
const error2 = new Error('Second error');
const error3 = new Error('Third error');

const aggregate = new AggregateError([error1, error2, error3], 'Multiple errors occurred');

console.log(aggregate.message); // 'Multiple errors occurred'
console.log(aggregate.name); // 'AggregateError'
console.log(aggregate.errors); // [error1, error2, error3]
```

**Key Characteristics:**
- `message`: The main error message
- `errors`: Array of original errors
- `name`: Always 'AggregateError'
- `stack`: Stack trace pointing to AggregateError creation

### 1.2 Throwing AggregateError

```typescript
async function executeAll(promises: Promise<unknown>[]) {
  const results = await Promise.allSettled(promises);

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} operation(s) failed`);
  }

  return results;
}
```

### 1.3 Catching AggregateError

```typescript
try {
  await executeAll(promises);
} catch (error) {
  if (error instanceof AggregateError) {
    console.error(`AggregateError: ${error.message}`);
    console.error(`Contains ${error.errors.length} errors:`);

    for (const err of error.errors) {
      console.error(`  - ${err.message}`);
    }
  } else {
    console.error(`Unexpected error: ${error}`);
  }
}
```

### 1.4 Browser and Node.js Support

**AggregateError Support:**

| Environment | Version | Notes |
|------------|---------|-------|
| Chrome | 76+ | Full support |
| Firefox | 71+ | Full support |
| Safari | 13+ | Full support |
| Edge | 79+ | Full support |
| Node.js | 15.0.0+ | Full support |
| Deno | 1.0+ | Full support |
| Bun | 0.1.0+ | Full support |

**Polyfill Required For:**
- Node.js < 15.0.0
- Internet Explorer (all versions)
- Older mobile browsers

---

## 2. Custom AggregateError Implementations

### 2.1 Basic Custom AggregateError

For environments without native AggregateError or when you need custom behavior:

```typescript
class CustomAggregateError extends Error {
  readonly errors: Error[];

  constructor(errors: Error[], message?: string) {
    super(message || `Multiple errors occurred: ${errors.length} errors`);
    this.name = 'AggregateError';
    this.errors = errors;

    // Maintains proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomAggregateError);
    }
  }
}
```

**Key Features:**
- Mimics native AggregateError interface
- Works in all JavaScript environments
- Optional custom message
- Preserves stack trace (V8/Node.js)

### 2.2 Enriched AggregateError with Context

Add metadata for better debugging:

```typescript
interface ErrorContext {
  operationId?: string;
  operationName?: string;
  timestamp?: number;
  [key: string]: unknown;
}

interface ContextualizedError {
  error: Error;
  context?: ErrorContext;
}

class EnrichedAggregateError extends Error {
  readonly errors: ContextualizedError[];
  readonly context?: {
    parentOperation?: string;
    parentWorkflow?: string;
    timestamp: number;
  };
  readonly stats: {
    totalErrors: number;
    errorsByType: Record<string, number>;
  };

  constructor(
    errors: Array<Error | ContextualizedError>,
    message?: string,
    context?: EnrichedAggregateError['context']
  ) {
    super(message || `${errors.length} error(s) occurred`);
    this.name = 'EnrichedAggregateError';

    // Normalize errors to ContextualizedError format
    this.errors = errors.map(err =>
      err instanceof Error
        ? { error: err }
        : err
    );

    this.context = context;

    // Calculate statistics
    const errorsByType: Record<string, number> = {};
    this.errors.forEach(({ error }) => {
      const type = error.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    this.stats = {
      totalErrors: this.errors.length,
      errorsByType,
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnrichedAggregateError);
    }
  }

  // Pretty-print the aggregate error
  toString(): string {
    let output = `${this.name}: ${this.message}\n`;
    output += `Total errors: ${this.stats.totalErrors}\n\n`;

    for (const { error, context } of this.errors) {
      output += `  - ${error.name}: ${error.message}`;
      if (context?.operationName) {
        output += ` (in ${context.operationName})`;
      }
      output += '\n';
    }

    if (Object.keys(this.stats.errorsByType).length > 1) {
      output += '\nError types:\n';
      for (const [type, count] of Object.entries(this.stats.errorsByType)) {
        output += `  - ${type}: ${count}\n`;
      }
    }

    return output;
  }
}
```

### 2.3 Hierarchical AggregateError

Support nested aggregation for workflow hierarchies:

```typescript
class HierarchicalAggregateError extends Error {
  readonly errors: Error[];
  readonly parent?: HierarchicalAggregateError;
  readonly depth: number;
  readonly path: string[];

  constructor(
    errors: Error[],
    message?: string,
    parent?: HierarchicalAggregateError
  ) {
    super(message || `${errors.length} error(s) occurred`);
    this.name = 'HierarchicalAggregateError';
    this.errors = errors;
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
    this.path = parent ? [...parent.path, parent.message] : [];

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HierarchicalAggregateError);
    }
  }

  // Get all errors from the entire hierarchy
  getAllErrors(): Error[] {
    let allErrors = [...this.errors];

    if (this.parent) {
      allErrors = allErrors.concat(this.parent.getAllErrors());
    }

    return allErrors;
  }

  // Get total error count including parent errors
  getTotalErrorCount(): number {
    return this.errors.length + (this.parent?.getTotalErrorCount() || 0);
  }

  // Pretty-print with hierarchy
  toString(): string {
    let output = `${'  '.repeat(this.depth)}${this.name}: ${this.message}\n`;
    output += `${'  '.repeat(this.depth)}Total at this level: ${this.errors.length}\n`;
    output += `${'  '.repeat(this.depth)}Total in hierarchy: ${this.getTotalErrorCount()}\n`;

    if (this.parent) {
      output += '\n' + this.parent.toString();
    }

    return output;
  }
}
```

---

## 3. Polyfill Strategies

### 3.1 Simple Polyfill

For basic AggregateError functionality:

```typescript
// Polyfill for environments without AggregateError
if (typeof AggregateError === 'undefined') {
  (globalThis as any).AggregateError = class AggregateError extends Error {
    readonly errors: unknown[];

    constructor(errors: unknown[], message?: string) {
      super(message || `Multiple errors occurred: ${errors.length} errors`);
      this.name = 'AggregateError';
      this.errors = errors;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, (globalThis as any).AggregateError);
      }
    }
  };
}
```

### 3.2 Feature Detection

Check for AggregateError support:

```typescript
function hasAggregateErrorSupport(): boolean {
  return typeof AggregateError !== 'undefined';
}

// Usage
if (!hasAggregateErrorSupport()) {
  // Load polyfill or use custom implementation
  console.warn('AggregateError not supported, using polyfill');
}
```

### 3.3 Conditional Usage

Use native AggregateError when available, fall back to custom:

```typescript
function createAggregateError(
  errors: Error[],
  message?: string
): Error {
  if (typeof AggregateError !== 'undefined') {
    return new AggregateError(errors, message);
  } else {
    return new CustomAggregateError(errors, message);
  }
}
```

---

## 4. Production-Grade Patterns

### 4.1 Error Aggregation with Retry Logic

```typescript
interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: Array<string | RegExp>;
}

class RetryableAggregateError extends Error {
  readonly errors: Array<{
    error: Error;
    attempt: number;
    retried: boolean;
  }>;
  readonly stats: {
    totalErrors: number;
    retryableErrors: number;
    nonRetryableErrors: number;
  };

  constructor(
    errors: Array<{ error: Error; attempt: number; retried: boolean }>,
    message?: string
  ) {
    super(message || `${errors.length} error(s) occurred after retries`);
    this.name = 'RetryableAggregateError';
    this.errors = errors;

    const retryableErrors = errors.filter(e => e.retried).length;
    const nonRetryableErrors = errors.length - retryableErrors;

    this.stats = {
      totalErrors: errors.length,
      retryableErrors,
      nonRetryableErrors,
    };
  }
}

async function executeWithRetry<T>(
  promises: Promise<T>[],
  options: RetryOptions
): Promise<T[]> {
  const results = await Promise.allSettled(promises);

  // Separate successes and failures
  const successes = results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason as Error);

  // Check if failures are retryable
  const retryableFailures = failures.filter(error => {
    return options.retryableErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message.includes(pattern);
      } else {
        return pattern.test(error.message);
      }
    });
  });

  if (retryableFailures.length > 0 && options.maxRetries > 0) {
    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, options.backoffMs));

    // Retry only retryable errors (simplified - in practice, you'd need to track which promises to retry)
    // This is a conceptual example
  }

  if (failures.length > 0) {
    const errors = failures.map(error => ({
      error,
      attempt: 1,
      retried: false,
    }));

    throw new RetryableAggregateError(errors);
  }

  return successes;
}
```

### 4.2 Error Aggregation with Deduplication

```typescript
class DeduplicatedAggregateError extends Error {
  readonly uniqueErrors: Error[];
  readonly duplicateCount: number;
  readonly errorFrequency: Record<string, number>;

  constructor(errors: Error[], message?: string) {
    const errorMap = new Map<string, Error>();

    // Deduplicate by error message
    for (const error of errors) {
      const key = `${error.name}:${error.message}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, error);
      }
    }

    const uniqueErrors = Array.from(errorMap.values());
    const duplicateCount = errors.length - uniqueErrors.length;

    const errorFrequency: Record<string, number> = {};
    for (const error of errors) {
      const key = `${error.name}:${error.message}`;
      errorFrequency[key] = (errorFrequency[key] || 0) + 1;
    }

    super(
      message ||
        `${errors.length} error(s) occurred (${uniqueErrors.length} unique, ${duplicateCount} duplicates)`
    );
    this.name = 'DeduplicatedAggregateError';
    this.uniqueErrors = uniqueErrors;
    this.duplicateCount = duplicateCount;
    this.errorFrequency = errorFrequency;
  }
}
```

### 4.3 Error Aggregation with Categorization

```typescript
enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

interface CategorizedError {
  error: Error;
  category: ErrorCategory;
}

class CategorizedAggregateError extends Error {
  readonly errors: CategorizedError[];
  readonly errorsByCategory: Record<ErrorCategory, number>;

  constructor(errors: Error[], message?: string) {
    const categorizedErrors: CategorizedError[] = errors.map(error => ({
      error,
      category: categorizeError(error),
    }));

    const errorsByCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.PERMISSION]: 0,
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };

    for (const { category } of categorizedErrors) {
      errorsByCategory[category]++;
    }

    super(message || `${errors.length} error(s) occurred`);
    this.name = 'CategorizedAggregateError';
    this.errors = categorizedErrors;
    this.errorsByCategory = errorsByCategory;
  }

  getErrorsByCategory(category: ErrorCategory): Error[] {
    return this.errors
      .filter(e => e.category === category)
      .map(e => e.error);
  }
}

function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('enet')) {
    return ErrorCategory.NETWORK;
  }

  if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
    return ErrorCategory.VALIDATION;
  }

  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorCategory.PERMISSION;
  }

  if (message.includes('system') || message.includes('eacces') || message.includes('enoent')) {
    return ErrorCategory.SYSTEM;
  }

  return ErrorCategory.UNKNOWN;
}
```

---

## 5. TypeScript Integration

### 5.1 Type-Safe AggregateError

```typescript
interface AggregateErrorConstructor {
  new(errors: Iterable<unknown>, message?: string): AggregateError;
  (errors: Iterable<unknown>, message?: string): AggregateError;
  readonly prototype: AggregateError;
}

interface AggregateError extends Error {
  readonly errors: unknown[];
}

declare var AggregateError: AggregateErrorConstructor;
```

### 5.2 Typed AggregateError

```typescript
class TypedAggregateError<T extends Error = Error> extends Error {
  readonly errors: T[];

  constructor(errors: T[], message?: string) {
    super(message || `${errors.length} error(s) occurred`);
    this.name = 'TypedAggregateError';
    this.errors = errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TypedAggregateError);
    }
  }

  // Filter errors by type
  filterErrors<E extends Error>(errorType: new (...args: unknown[]) => E): E[] {
    return this.errors.filter((e): e is E => e instanceof errorType);
  }

  // Get errors by type guard
  getErrorsOfType<E extends Error>(
    typeGuard: (error: Error) => error is E
  ): E[] {
    return this.errors.filter(typeGuard);
  }
}
```

### 5.3 Workflow-Specific AggregateError

```typescript
// Based on Groundswell's WorkflowError interface
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: unknown; // SerializedWorkflowState
  logs: unknown[]; // LogEntry[]
}

interface WorkflowAggregateError extends Error {
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

function isWorkflowAggregateError(error: unknown): error is WorkflowAggregateError {
  return (
    error instanceof Error &&
    (error as any).name === 'WorkflowAggregateError' &&
    'errors' in error &&
    'totalChildren' in error &&
    'failedChildren' in error
  );
}
```

---

## 6. Common Pitfalls

### 6.1 Losing Original Stack Traces

**Problem:** Not preserving original stack traces makes debugging difficult.

```typescript
// ❌ WRONG - Loses original stack traces
const aggregate = new AggregateError([
  new Error('Error 1'),
  new Error('Error 2'),
]);

// ✅ CORRECT - Preserves stack traces
const errors = [
  new Error('Error 1'),
  new Error('Error 2'),
].map(err => {
  // Ensure stack trace is captured
  if (!err.stack) {
    Error.captureStackTrace(err);
  }
  return err;
});

const aggregate = new AggregateError(errors);
```

### 6.2 Not Handling Non-Error Values

**Problem:** AggregateError can contain non-Error values.

```typescript
// ❌ WRONG - Assumes all values are Errors
const results = await Promise.allSettled(promises);
const errors = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map(r => r.reason);

throw new AggregateError(errors); // May contain strings, numbers, etc.

// ✅ CORRECT - Normalizes to Errors
const normalizedErrors = errors.map(err => {
  if (err instanceof Error) {
    return err;
  }
  return new Error(String(err ?? 'Unknown error'));
});

throw new AggregateError(normalizedErrors);
```

### 6.3 Circular References in Errors

**Problem:** Circular references can cause issues when stringifying errors.

```typescript
// ❌ PROBLEMATIC - Circular references
const error1 = new Error('Error 1');
const error2 = new Error('Error 2');
(error1 as any).cause = error2;
(error2 as any).cause = error1; // Circular reference

try {
  throw new AggregateError([error1, error2]);
} catch (aggregate) {
  console.log(aggregate.toString()); // May fail due to circular reference
}

// ✅ CORRECT - Handle circular references
import { safeStringify } from './utils';

const error1 = new Error('Error 1');
const error2 = new Error('Error 2');
(error1 as any).cause = error2;
(error2 as any).cause = error1;

class SafeAggregateError extends Error {
  readonly errors: Error[];

  constructor(errors: Error[], message?: string) {
    super(message || `${errors.length} error(s) occurred`);
    this.name = 'SafeAggregateError';
    this.errors = errors;
  }

  toString(): string {
    return safeStringify({
      name: this.name,
      message: this.message,
      errors: this.errors.map(e => ({
        name: e.name,
        message: e.message,
        stack: e.stack,
      })),
    });
  }
}
```

### 6.4 Memory Leaks with Large Error Arrays

**Problem:** Storing too many errors can cause memory issues.

```typescript
// ❌ PROBLEMATIC - Stores all errors
const results = await Promise.allSettled(largeArrayOfPromises);
const errors = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map(r => r.reason);

throw new AggregateError(errors); // May be thousands of errors

// ✅ CORRECT - Limit error count
class BoundedAggregateError extends Error {
  readonly errors: Error[];
  readonly truncated: boolean;

  constructor(errors: Error[], message?: string, maxErrors = 100) {
    const truncated = errors.length > maxErrors;
    const boundedErrors = truncated ? errors.slice(0, maxErrors) : errors;

    super(
      message ||
        `${errors.length} error(s) occurred${truncated ? ` (showing first ${maxErrors})` : ''}`
    );
    this.name = 'BoundedAggregateError';
    this.errors = boundedErrors;
    this.truncated = truncated;
  }
}
```

---

## 7. Code Examples

### 7.1 Complete Example: Promise.allSettled with AggregateError

```typescript
async function executeAll<T>(
  promises: Promise<T>[],
  options?: {
    errorMessage?: string;
    maxErrors?: number;
  }
): Promise<T[]> {
  const results = await Promise.allSettled(promises);

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => {
      const reason = r.reason;
      return reason instanceof Error ? reason : new Error(String(reason));
    });

  if (errors.length > 0) {
    // Limit error count if specified
    const boundedErrors = options?.maxErrors
      ? errors.slice(0, options.maxErrors)
      : errors;

    throw new AggregateError(
      boundedErrors,
      options?.errorMessage || `${errors.length} operation(s) failed`
    );
  }

  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

### 7.2 Complete Example: Workflow Error Aggregation

```typescript
interface ChildWorkflowResult {
  workflowId: string;
  workflowName: string;
  status: 'fulfilled' | 'rejected';
  value?: unknown;
  error?: Error;
}

async function executeChildWorkflows(
  workflows: Array<{ id: string; name: string; run: () => Promise<unknown> }>,
  parentWorkflowId: string
): Promise<ChildWorkflowResult[]> {
  const results = await Promise.allSettled(
    workflows.map(w => w.run())
  );

  return workflows.map((workflow, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'fulfilled',
        value: result.value,
      };
    } else {
      const reason = result.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'rejected',
        error,
      };
    }
  });
}

async function executeChildWorkflowsWithAggregation(
  workflows: Array<{ id: string; name: string; run: () => Promise<unknown> }>,
  parentWorkflowId: string,
  taskName: string
): Promise<void> {
  const results = await executeChildWorkflows(workflows, parentWorkflowId);

  const failures = results.filter((r): r is ChildWorkflowResult & { error: Error } => r.status === 'rejected');

  if (failures.length > 0) {
    const error = new Error(
      `${failures.length} child workflow(s) failed in task '${taskName}'`
    ) as WorkflowAggregateError;

    error.name = 'WorkflowAggregateError';
    error.errors = failures.map(f => ({
      workflowId: f.workflowId,
      workflowName: f.workflowName,
      error: f.error as WorkflowError,
    }));
    error.taskName = taskName;
    error.workflowId = parentWorkflowId;
    error.totalChildren = results.length;
    error.failedChildren = failures.length;

    throw error;
  }
}
```

### 7.3 Complete Example: Enriched AggregateError Factory

```typescript
interface ErrorEnrichment {
  operationId?: string;
  operationName?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

interface EnrichedError {
  originalError: Error;
  enrichment: ErrorEnrichment;
}

class EnrichedAggregateError extends Error {
  readonly errors: EnrichedError[];
  readonly context: {
    parentOperation?: string;
    timestamp: number;
  };
  readonly stats: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByOperation: Record<string, number>;
  };

  constructor(
    errors: Array<{ error: Error; enrichment?: ErrorEnrichment }>,
    message?: string,
    context?: { parentOperation?: string }
  ) {
    super(message || `${errors.length} error(s) occurred`);
    this.name = 'EnrichedAggregateError';

    this.errors = errors.map(e => ({
      originalError: e.error,
      enrichment: {
        timestamp: Date.now(),
        ...e.enrichment,
      },
    }));

    this.context = {
      parentOperation: context?.parentOperation,
      timestamp: Date.now(),
    };

    // Calculate statistics
    const errorsByType: Record<string, number> = {};
    const errorsByOperation: Record<string, number> = {};

    for (const { originalError, enrichment } of this.errors) {
      const type = originalError.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;

      if (enrichment.operationName) {
        errorsByOperation[enrichment.operationName] =
          (errorsByOperation[enrichment.operationName] || 0) + 1;
      }
    }

    this.stats = {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByOperation,
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnrichedAggregateError);
    }
  }

  // Pretty-print for logging
  toString(): string {
    let output = `${this.name}: ${this.message}\n`;
    output += `Timestamp: ${new Date(this.context.timestamp).toISOString()}\n`;
    output += `Total errors: ${this.stats.totalErrors}\n\n`;

    for (const { originalError, enrichment } of this.errors) {
      output += `  [${enrichment.timestamp ? new Date(enrichment.timestamp).toISOString() : 'N/A'}] `;
      output += `${originalError.name}: ${originalError.message}`;

      if (enrichment.operationName) {
        output += ` (in ${enrichment.operationName})`;
      }

      if (enrichment.operationId) {
        output += ` [ID: ${enrichment.operationId}]`;
      }

      output += '\n';
    }

    if (Object.keys(this.stats.errorsByType).length > 0) {
      output += '\nError types:\n';
      for (const [type, count] of Object.entries(this.stats.errorsByType)) {
        output += `  - ${type}: ${count}\n`;
      }
    }

    if (Object.keys(this.stats.errorsByOperation).length > 0) {
      output += '\nErrors by operation:\n';
      for (const [operation, count] of Object.entries(this.stats.errorsByOperation)) {
        output += `  - ${operation}: ${count}\n`;
      }
    }

    return output;
  }
}

// Factory function
function createEnrichedAggregateError(
  errors: Array<{ error: Error; enrichment?: ErrorEnrichment }>,
  message?: string,
  context?: { parentOperation?: string }
): EnrichedAggregateError {
  return new EnrichedAggregateError(errors, message, context);
}
```

---

## References

### Official Documentation
1. MDN: AggregateError - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
2. TC39 Proposal: Promise.allSettled - https://github.com/tc39/proposal-promise-allSettled
3. ECMAScript Specification: AggregateError - https://tc39.es/ecma262/#sec-aggregate-error-constructor

### Community Resources
4. StackOverflow: When to use AggregateError - https://stackoverflow.com/questions/63285967
5. StackOverflow: AggregateError polyfill - https://stackoverflow.com/questions/63454000
6. GitHub: aggregate-error package - https://github.com/sindresorhus/aggregate-error

### Groundswell-Specific
7. Current Implementation: /home/dustin/projects/groundswell/src/types/error-strategy.ts
8. WorkflowError Interface: /home/dustin/projects/groundswell/src/types/error.ts
9. Task Decorator: /home/dustin/projects/groundswell/src/decorators/task.ts
10. Existing Research: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1M2T2S2 Implementation
