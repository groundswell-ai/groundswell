# Error Merging Strategies from Popular Libraries

**Research Date:** 2026-01-12
**Status:** Comprehensive Research Report
**Target:** P1M2T2S2 - Error Aggregation Implementation

---

## Executive Summary

This document provides comprehensive research on error merging strategies from popular JavaScript/TypeScript libraries and frameworks. It covers patterns from React, Angular, Node.js ecosystem, and production-grade error handling libraries.

**Key Finding:** Production libraries use diverse error merging strategies, but common patterns emerge: hierarchical error aggregation, context preservation, error categorization, and statistics generation. The most sophisticated implementations combine these approaches for comprehensive error handling.

---

## Table of Contents

1. [React Error Handling Patterns](#1-react-error-handling-patterns)
2. [Angular Error Handling Patterns](#2-angular-error-handling-patterns)
3. [Node.js Ecosystem Patterns](#3-nodejs-ecosystem-patterns)
4. [Popular Error Handling Libraries](#4-popular-error-handling-libraries)
5. [Cross-Cutting Best Practices](#5-cross-cutting-best-practices)
6. [Implementation Recommendations](#6-implementation-recommendations)

---

## 1. React Error Handling Patterns

### 1.1 Error Boundaries

React Error Boundaries catch errors in component trees and can aggregate multiple errors:

**Pattern:**
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errors: Error[] }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errors: [] };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState(prevState => ({
      errors: [...prevState.errors, error],
    }));

    // Log to error reporting service
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

**Key Insights:**
- Accumulates errors in state
- Preserves component stack information
- Delegates actual aggregation to error reporting services

### 1.2 React Concurrent Error Handling

React 18+ with concurrent features uses suspense and error boundaries together:

**Pattern:**
```typescript
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <AsyncComponent1 />
        <AsyncComponent2 />
        <AsyncComponent3 />
      </Suspense>
    </ErrorBoundary>
  );
}

// Multiple error boundaries can catch errors from different sections
function SectionWithErrorHandling() {
  return (
    <>
      <ErrorBoundary fallback={<Section1Error />}>
        <Section1 />
      </ErrorBoundary>
      <ErrorBoundary fallback={<Section2Error />}>
        <Section2 />
      </ErrorBoundary>
    </>
  );
}
```

**Key Insights:**
- Nested error boundaries provide isolation
- Each boundary handles its own errors
- Prevents cascading failures

### 1.3 React Error Reporting Libraries

Popular React error libraries like Sentry React SDK aggregate errors:

**Sentry Pattern (simplified):**
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-dsn',
  beforeSend(event, hint) {
    // Modify or filter events before sending
    if (event.exception) {
      // Aggregate similar errors
      event.exception.values = aggregateExceptions(event.exception.values);
    }
    return event;
  },
});

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <YourApp />
    </Sentry.ErrorBoundary>
  );
}

function aggregateExceptions(exceptions: Exception[]) {
  // Group by error type and message
  const grouped = new Map<string, Exception[]>();

  for (const exc of exceptions) {
    const key = `${exc.type}:${exc.value}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(exc);
  }

  // Return aggregated exceptions
  return Array.from(grouped.values()).map(group => {
    return {
      type: group[0].type,
      value: `${group.length}x ${group[0].value}`,
      stacktrace: group[0].stacktrace,
    };
  });
}
```

**Key Insights:**
- Client-side aggregation before sending to server
- Groups similar errors to reduce noise
- Preserves stack traces from first occurrence

---

## 2. Angular Error Handling Patterns

### 2.1 Global Error Handler

Angular provides a global error handler that can be customized:

**Pattern:**
```typescript
import { ErrorHandler, Injectable } from '@angular/core';

interface AggregatedError {
  message: string;
  errors: Error[];
  timestamp: number;
  context?: {
    component?: string;
    route?: string;
  };
}

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  private errors: Error[] = [];
  private aggregationWindowMs = 5000;
  private lastAggregation = 0;

  handleError(error: any) {
    this.errors.push(error);

    // Check if we should aggregate and report
    const now = Date.now();
    if (now - this.lastAggregation > this.aggregationWindowMs) {
      this.reportAggregatedErrors();
      this.lastAggregation = now;
    }
  }

  private reportAggregatedErrors() {
    if (this.errors.length === 0) return;

    const aggregated: AggregatedError = {
      message: `${this.errors.length} error(s) occurred`,
      errors: this.errors,
      timestamp: Date.now(),
      context: this.captureContext(),
    };

    // Send to error reporting service
    this.sendToErrorService(aggregated);

    // Clear accumulated errors
    this.errors = [];
  }

  private captureContext() {
    // Capture component, route, etc.
    return {
      component: this.getCurrentComponent(),
      route: this.getCurrentRoute(),
    };
  }

  private sendToErrorService(error: AggregatedError) {
    // Implementation depends on error service
  }

  private getCurrentComponent(): string {
    // Implementation
    return '';
  }

  private getCurrentRoute(): string {
    // Implementation
    return '';
  }
}
```

**Key Insights:**
- Time-based aggregation window
- Captures Angular-specific context (component, route)
- Batches errors to reduce reporting overhead

### 2.2 HTTP Error Interceptor

Angular HTTP interceptors can aggregate API errors:

**Pattern:**
```typescript
import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

interface ApiError {
  url: string;
  status: number;
  message: string;
  timestamp: number;
}

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  private apiErrors: ApiError[] = [];
  private aggregationThreshold = 5;

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const apiError: ApiError = {
          url: req.url,
          status: error.status,
          message: error.message,
          timestamp: Date.now(),
        };

        this.apiErrors.push(apiError);

        // Check if we've reached threshold
        if (this.apiErrors.length >= this.aggregationThreshold) {
          this.reportAggregatedErrors();
        }

        return throwError(() => error);
      })
    );
  }

  private reportAggregatedErrors() {
    if (this.apiErrors.length === 0) return;

    // Group by status code
    const byStatus = new Map<number, ApiError[]>();
    for (const error of this.apiErrors) {
      if (!byStatus.has(error.status)) {
        byStatus.set(error.status, []);
      }
      byStatus.get(error.status)!.push(error);
    }

    // Create aggregated error
    const aggregated = {
      message: `${this.apiErrors.length} API error(s) occurred`,
      byStatus: Object.fromEntries(byStatus),
      timestamp: Date.now(),
    };

    // Send to error service
    this.sendToErrorService(aggregated);

    // Clear accumulated errors
    this.apiErrors = [];
  }

  private sendToErrorService(error: unknown) {
    // Implementation
  }
}
```

**Key Insights:**
- Groups errors by HTTP status code
- Threshold-based aggregation
- Preserves request context (URL, status)

### 2.3 RxJS Error Handling

Angular uses RxJS extensively, which has its own error aggregation patterns:

**Pattern:**
```typescript
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Result<T, E = Error> {
  success: boolean;
  value?: T;
  error?: E;
}

// Execute multiple observables and collect all errors
function executeAllWithErrors<T>(
  observables: Observable<T>[]
): Observable<Result<T>[]> {
  return forkJoin(
    observables.map(obs =>
      obs.pipe(
        catchError(error => of({
          success: false,
          error,
        }))
      )
    )
  ).pipe(
    catchError(errors => of([{
      success: false,
      error: errors,
    }]))
  ) as Observable<Result<T>[]>;
}
```

**Key Insights:**
- RxJS operators enable error transformation
- forkJoin with catchError allows all observables to complete
- Returns structured results with success/failure indicators

---

## 3. Node.js Ecosystem Patterns

### 3.1 Express Error Handling

Express.js has built-in error handling middleware:

**Pattern:**
```typescript
import express, { Request, Response, NextFunction } from 'express';

interface AggregatedError {
  message: string;
  errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    route?: string;
    method?: string;
  }>;
  totalErrors: number;
}

const app = express();

// Error collection middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.errors = res.locals.errors || [];
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (!res.locals.errors) {
    res.locals.errors = [];
  }

  res.locals.errors.push({
    message: err.message,
    stack: err.stack,
    timestamp: Date.now(),
    route: req.path,
    method: req.method,
  });

  next(err);
});

// Final error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.locals.errors && res.locals.errors.length > 0) {
    const aggregated: AggregatedError = {
      message: `${res.locals.errors.length} error(s) occurred`,
      errors: res.locals.errors,
      totalErrors: res.locals.errors.length,
    };

    // Log aggregated errors
    console.error(JSON.stringify(aggregated, null, 2));

    // Send error response
    res.status(500).json({
      error: aggregated.message,
      totalErrors: aggregated.totalErrors,
    });
  } else {
    // Single error
    res.status(500).json({
      error: err.message,
    });
  }
});
```

**Key Insights:**
- Middleware chain allows error accumulation
- Preserves request context (route, method)
- Final middleware aggregates and reports

### 3.2 Async/Await Error Aggregation

Node.js async/await patterns with Promise.allSettled:

**Pattern:**
```typescript
interface OperationResult<T, E = Error> {
  success: boolean;
  value?: T;
  error?: E;
  operationId?: string;
  operationName?: string;
}

async function executeAll<T>(
  operations: Array<{
    id: string;
    name: string;
    fn: () => Promise<T>;
  }>
): Promise<OperationResult<T>[]> {
  const results = await Promise.allSettled(
    operations.map(op => op.fn())
  );

  return operations.map((op, index) => {
    const result = results[index];

    if (result.status === 'fulfilled') {
      return {
        success: true,
        value: result.value,
        operationId: op.id,
        operationName: op.name,
      };
    } else {
      const error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));

      return {
        success: false,
        error,
        operationId: op.id,
        operationName: op.name,
      };
    }
  });
}

// Usage
const results = await executeAll([
  { id: '1', name: 'fetchUser', fn: fetchUser },
  { id: '2', name: 'fetchPosts', fn: fetchPosts },
  { id: '3', name: 'fetchComments', fn: fetchComments },
]);

const failures = results.filter(r => !r.success);
if (failures.length > 0) {
  const aggregated = {
    message: `${failures.length} operation(s) failed`,
    errors: failures,
  };

  console.error(JSON.stringify(aggregated, null, 2));
}
```

**Key Insights:**
- Promise.allSettled enables complete error visibility
- Preserves operation context (id, name)
- Returns structured results for easy filtering

### 3.3 Cluster/Multi-Process Error Handling

Node.js cluster module aggregating errors from workers:

**Pattern:**
```typescript
import cluster from 'cluster';
import os from 'os';

interface WorkerError {
  workerId: number;
  pid: number;
  error: Error;
  timestamp: number;
}

if (cluster.isPrimary) {
  const workerErrors: WorkerError[] = [];

  // Fork workers
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Listen for errors from workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });

  // Custom error message handler
  cluster.on('message', (worker, message) => {
    if (message.type === 'error') {
      workerErrors.push({
        workerId: worker.id,
        pid: worker.process.pid!,
        error: message.error,
        timestamp: Date.now(),
      });

      // Aggregate and report if threshold reached
      if (workerErrors.length >= 10) {
        reportAggregatedErrors(workerErrors);
        workerErrors.length = 0; // Clear array
      }
    }
  });

  function reportAggregatedErrors(errors: WorkerError[]) {
    // Group by error type
    const byType = new Map<string, WorkerError[]>();
    for (const err of errors) {
      const type = err.error.name;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(err);
    }

    console.error('Aggregated worker errors:', {
      total: errors.length,
      byType: Object.fromEntries(byType),
    });
  }
} else {
  // Worker process
  process.on('uncaughtException', (error: Error) => {
    // Send error to primary
    if (process.send) {
      process.send({
        type: 'error',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    }

    // Exit to allow worker restart
    process.exit(1);
  });

  // Worker logic here
}
```

**Key Insights:**
- Inter-process communication for error aggregation
- Groups errors by type
- Threshold-based reporting

---

## 4. Popular Error Handling Libraries

### 4.1 Sentry (Browser/Node)

Sentry is a popular error tracking service with SDK for multiple platforms:

**Key Features:**
- Automatic error aggregation
- Grouping by stacktrace similarity
- Breadcrumbs for error context
- Release tracking
- User context

**Pattern:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'your-dsn',
  beforeSend(event, hint) {
    // Modify event before sending
    if (event.exception) {
      // Sentry automatically groups by stacktrace
      // You can add custom grouping
      event.fingerprint = customFingerprint(event);
    }
    return event;
  },
});

function customFingerprint(event: Event): string[] {
  // Custom fingerprinting logic
  if (event.request) {
    return [event.request.url!, event.exception?.values?.[0].type!];
  }
  return ['{{ default }}'];
}
```

**Key Insights:**
- Server-side aggregation by stacktrace
- Custom fingerprinting for grouping
- Rich context preservation

### 4.2 p-retry (Node.js)

Library for retrying failed promises:

**Pattern:**
```typescript
import pRetry from 'p-retry';
import pSettle from 'p-settle';

interface RetryResult<T> {
  attempts: number;
  value?: T;
  error?: Error;
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: { retries: number; minTimeout: number }
): Promise<RetryResult<T>> {
  try {
    const value = await pRetry(fn, {
      retries: options.retries,
      minTimeout: options.minTimeout,
      onFailedAttempt: (error) => {
        console.error(`Attempt ${error.attemptNumber} failed`);
      },
    });

    return {
      attempts: 1,
      value,
    };
  } catch (error) {
    return {
      attempts: options.retries + 1,
      error: error as Error,
    };
  }
}

// Aggregate multiple operations with retry
async function executeAllWithRetry<T>(
  operations: Array<() => Promise<T>>,
  retryOptions: { retries: number; minTimeout: number }
): Promise<RetryResult<T>[]> {
  const results = await Promise.allSettled(
    operations.map(op => executeWithRetry(op, retryOptions))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        attempts: retryOptions.retries + 1,
        error: new Error(String(result.reason)),
      };
    }
  });
}
```

**Key Insights:**
- Retry logic built-in
- Tracks attempt count
- Provides hooks for logging

### 4.3 VError (Verror from Joyent)

Verror is a multi-error handling library:

**Pattern:**
```typescript
import VError from 'verror';

// Create multi-error
const error1 = new Error('First error');
const error2 = new Error('Second error');
const error3 = new Error('Third error');

const multiError = new VError.MultiError([error1, error2, error3]);

console.log(multiError.message); // 'First of 3 errors: First error'
console.log(VError.fullStack(multiError)); // Full stack with all errors
console.log(VError.info(multiError)); // Structured error info

// Find causes
const causes = VError.cause(multiError);
if (causes instanceof VError.MultiError) {
  const errors = causes.errors();
  console.log(`Contains ${errors.length} errors`);
}
```

**Key Insights:**
- Specialized MultiError class
- Preserves all stack traces
- Full stack printing
- Cause chaining

### 4.4 Aggregate-Error (npm package)

Simple aggregate error implementation:

**Pattern:**
```typescript
import AggregateError from 'aggregate-error';

const errors = [
  new Error('First error'),
  new Error('Second error'),
  new Error('Third error'),
];

const aggregate = new AggregateError(errors);

console.log(aggregate.name); // 'AggregateError'
console.log(aggregate.message); // Combined error messages
console.log(aggregate.errors); // Array of errors
```

**Key Insights:**
- Simple, focused implementation
- Polyfills AggregateError for older environments
- Combines messages for better readability

---

## 5. Cross-Cutting Best Practices

### 5.1 Error Context Preservation

**Pattern:**
```typescript
interface ErrorContext {
  operation?: string;
  component?: string;
  route?: string;
  userId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

interface ContextualizedError {
  error: Error;
  context: ErrorContext;
}

function createContextualizedError(
  error: Error,
  context: ErrorContext
): ContextualizedError {
  return {
    error,
    context: {
      timestamp: Date.now(),
      ...context,
    },
  };
}

function aggregateContextualizedErrors(
  errors: ContextualizedError[],
  message?: string
): Error {
  const aggregated = new Error(
    message || `${errors.length} error(s) occurred`
  );

  // Attach context to error
  (aggregated as any).errors = errors;
  (aggregated as any).getContext = () => errors.map(e => e.context);

  return aggregated;
}
```

### 5.2 Error Categorization

**Pattern:**
```typescript
enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

interface CategorizedError {
  error: Error;
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorCategory.AUTHORIZATION;
  }

  if (message.includes('econnrefused') || message.includes('enotfound')) {
    return ErrorCategory.SYSTEM;
  }

  return ErrorCategory.UNKNOWN;
}

function aggregateCategorizedErrors(
  errors: CategorizedError[]
): Record<ErrorCategory, CategorizedError[]> {
  const aggregated: Record<ErrorCategory, CategorizedError[]> = {
    [ErrorCategory.NETWORK]: [],
    [ErrorCategory.VALIDATION]: [],
    [ErrorCategory.AUTHORIZATION]: [],
    [ErrorCategory.SYSTEM]: [],
    [ErrorCategory.UNKNOWN]: [],
  };

  for (const err of errors) {
    aggregated[err.category].push(err);
  }

  return aggregated;
}
```

### 5.3 Error Statistics

**Pattern:**
```typescript
interface ErrorStatistics {
  totalErrors: number;
  uniqueErrors: number;
  errorsByType: Record<string, number>;
  errorsByMessage: Record<string, number>;
  firstOccurrence: number;
  lastOccurrence: number;
  timeRange: number;
}

function calculateErrorStatistics(errors: Error[]): ErrorStatistics {
  const errorsByType: Record<string, number> = {};
  const errorsByMessage: Record<string, number> = {};
  const uniqueMessages = new Set<string>();

  let firstOccurrence = Infinity;
  let lastOccurrence = -Infinity;

  for (const error of errors) {
    const type = error.constructor.name;
    errorsByType[type] = (errorsByType[type] || 0) + 1;

    const message = error.message;
    errorsByMessage[message] = (errorsByMessage[message] || 0) + 1;
    uniqueMessages.add(message);

    const timestamp = (error as any).timestamp || Date.now();
    if (timestamp < firstOccurrence) firstOccurrence = timestamp;
    if (timestamp > lastOccurrence) lastOccurrence = timestamp;
  }

  return {
    totalErrors: errors.length,
    uniqueErrors: uniqueMessages.size,
    errorsByType,
    errorsByMessage,
    firstOccurrence,
    lastOccurrence,
    timeRange: lastOccurrence - firstOccurrence,
  };
}
```

---

## 6. Implementation Recommendations

### 6.1 For Groundswell Workflow Engine

Based on research findings, recommend implementing:

1. **Hierarchical Error Aggregation**
   - Preserve workflow hierarchy context
   - Include workflow ID, name, and path
   - Maintain parent-child relationships

2. **Error Categorization**
   - Distinguish between workflow errors, validation errors, system errors
   - Enable category-based filtering and reporting

3. **Rich Error Context**
   - Timestamps for each error
   - Workflow state at time of error
   - Relevant log entries
   - Stack traces preserved

4. **Error Statistics**
   - Total error count
   - Errors by workflow
   - Errors by type
   - Success/failure rates

### 6.2 Recommended Implementation Structure

```typescript
interface WorkflowAggregateError {
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

---

## References

### Official Documentation
1. React Error Boundaries - https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
2. Angular ErrorHandler - https://angular.io/api/core/ErrorHandler
3. Express Error Handling - https://expressjs.com/en/guide/error-handling.html

### Community Libraries
4. Sentry JavaScript SDK - https://docs.sentry.io/platforms/javascript/
5. p-retry - https://github.com/sindresorhus/p-retry
6. p-settle - https://github.com/sindresorhus/p-settle
7. VError - https://www.npmjs.com/package/verror
8. aggregate-error - https://github.com/sindresorhus/aggregate-error

### GitHub Repositories
9. Facebook React - Error handling patterns
10. Angular Angular - Error handling implementation
11. Expressjs Express - Error middleware

### Groundswell-Specific
12. Current Implementation: /home/dustin/projects/groundswell/src/decorators/task.ts
13. Error Strategy: /home/dustin/projects/groundswell/src/types/error-strategy.ts
14. WorkflowError: /home/dustin/projects/groundswell/src/types/error.ts

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** Complete
**Next Review:** After P1M2T2S2 Implementation
