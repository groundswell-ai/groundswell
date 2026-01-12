# Concurrent Workflow Execution and Error Handling: Best Practices Research

**Author**: Research Specialist
**Date**: 2026-01-12
**Status**: Comprehensive Research Report
**Target**: Groundswell Hierarchical Workflow Engine

---

## Executive Summary

This document provides comprehensive research findings on concurrent workflow execution and error handling patterns, with specific recommendations for the Groundswell workflow engine. The research covers Promise.all vs Promise.allSettled trade-offs, production-grade workflow engine patterns, error aggregation strategies, and fail-fast vs complete-all strategies.

**Key Finding**: The current implementation uses `Promise.all()` in the @Task decorator with `concurrent: true`, which implements a fail-fast strategy. Based on PRD requirements and production patterns, this report recommends adding support for `Promise.allSettled()` to enable "complete all" error handling with proper error aggregation.

---

## Table of Contents

1. [Promise.all vs Promise.allSettled: Technical Comparison](#1-promiseall-vs-promiseallsettled-technical-comparison)
2. [Production Workflow Engine Patterns](#2-production-workflow-engine-patterns)
3. [Error Aggregation Strategies](#3-error-aggregation-strategies)
4. [Fail-Fast vs Complete-All Decision Framework](#4-fail-fast-vs-complete-all-decision-framework)
5. [Groundswell-Specific Recommendations](#5-groundswell-specific-recommendations)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Appendix: Code Examples](#7-appendix-code-examples)

---

## 1. Promise.all vs Promise.allSettled: Technical Comparison

### 1.1 Behavioral Differences

#### Promise.all (Fail-Fast Strategy)

```typescript
// Current Groundswell Implementation (src/decorators/task.ts:112)
await Promise.all(runnable.map((w) => w.run()));

// Behavior:
// - Rejects IMMEDIATELY when ANY promise rejects
// - Does NOT wait for other promises to complete
// - Returns array of resolved values when ALL fulfill
// - Use case: All operations must succeed, fast-fail desired
```

**Characteristics:**
- **Performance**: Faster failure detection (stops at first error)
- **Resource Usage**: Wastes resources from in-flight operations
- **Error Visibility**: Only shows first error (hides concurrent failures)
- **Debugging**: Difficult to understand full scope of failures

**Example:**
```typescript
const results = await Promise.all([
  task1(), // completes in 100ms
  task2(), // completes in 200ms
  task3(), // FAILS in 50ms
]);
// Execution stops at 50ms, results from task1/task2 lost
// Only error from task3 is visible
```

#### Promise.allSettled (Complete-All Strategy)

```typescript
// Recommended Enhancement for Groundswell
const results = await Promise.allSettled(
  runnable.map((w) => w.run())
);

// Behavior:
// - Waits for ALL promises to settle (fulfilled OR rejected)
// - Returns array of status objects with reason/value
// - Never rejects (always fulfills)
// - Use case: Need all results regardless of individual failures
```

**Characteristics:**
- **Performance**: Slower failure detection (waits for all operations)
- **Resource Usage**: Completes all work (no waste)
- **Error Visibility**: Shows ALL errors (complete picture)
- **Debugging**: Easy to understand scope and patterns of failures

**Example:**
```typescript
const results = await Promise.allSettled([
  task1(), // completes in 100ms, fulfills
  task2(), // completes in 200ms, fulfills
  task3(), // FAILS in 50ms, rejects
]);
// Execution completes at 200ms (waits for slowest)
// All three results available:
// [
//   { status: 'fulfilled', value: 'task1-result' },
//   { status: 'fulfilled', value: 'task2-result' },
//   { status: 'rejected', reason: Error('task3 failed') }
// ]
```

### 1.2 Performance Comparison

| Metric | Promise.all | Promise.allSettled |
|--------|-------------|-------------------|
| **Time to First Error** | Immediate (min time) | Waits for all (max time) |
| **Time to Complete All** | N/A (fails early) | Max of all operations |
| **Resource Efficiency** | Low (wastes in-flight work) | High (completes all work) |
| **Error Completeness** | First error only | All errors |
| **Partial Results** | Lost | Preserved |
| **Backpressure** | Poor (can't throttle) | Better (can process as they settle) |

### 1.3 When to Use Each Strategy

#### Use Promise.all When:

1. **All Operations Are Critical**: Partial success is meaningless
   ```typescript
   // Financial transaction - all parts must succeed
   await Promise.all([
     validateAccount(),
     holdFunds(),
     processTransfer(),
     confirmReceipt(),
   ]);
   // If any fails, entire transaction should fail
   ```

2. **Fast Failure Saves Resources**: Stopping early prevents waste
   ```typescript
   // Batch API calls with early validation
   const isValid = await validateBatch(items);
   if (!isValid) {
     return; // Don't process if validation fails
   }
   await Promise.all(items.map(processItem));
   ```

3. **Dependent Operations**: Subsequent steps depend on all succeeding
   ```typescript
   const [config, schema] = await Promise.all([
     fetchConfig(),
     fetchSchema(),
   ]);
   // Both needed for next step
   validateData(config, schema);
   ```

4. **Error Cascading Acceptable**: First error is representative
   ```typescript
   // Homogeneous operations (same type of task)
   await Promise.all(
     servers.map(s => s.ping())
   );
   // If any server is down, treat all as down
   ```

#### Use Promise.allSettled When:

1. **Partial Success Has Value**: Some results better than none
   ```typescript
   // Bulk data synchronization
   const results = await Promise.allSettled(
     records.map(r => syncRecord(r))
   );
   const succeeded = results.filter(r => r.status === 'fulfilled');
   const failed = results.filter(r => r.status === 'rejected');
   // Process succeeded, retry failed
   ```

2. **Independent Operations**: Tasks don't depend on each other
   ```typescript
   // Parallel notifications
   await Promise.allSettled([
     sendEmail(user),
     sendSlack(user),
     sendSMS(user),
   ]);
   // Try all channels, log failures, continue
   ```

3. **Error Aggregation Needed**: Need to see all failures
   ```typescript
   // Batch validation with comprehensive error reporting
   const validations = await Promise.allSettled(
     fields.map(f => validateField(f))
   );
   const errors = validations
     .filter(v => v.status === 'rejected')
     .map(v => v.reason);
   // Return all validation errors to user
   ```

4. **Idempotent or Retryable Operations**: Can handle/ignore failures
   ```typescript
   // Cache warming
   await Promise.allSettled(
     keys.map(k => cache.set(k, fetchValue(k)))
   );
   // Populate as much as possible, retry misses later
   ```

### 1.4 Recommendations for Groundswell

**Current State Analysis:**
- File: `/home/dustin/projects/groundswell/src/decorators/task.ts`
- Line 112: Uses `Promise.all()` for concurrent execution
- Behavior: Fail-fast (stops at first child workflow error)

**Issue**: This prevents partial success scenarios and hides concurrent errors.

**Recommendation**: Support both strategies via configuration:

```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;

  // NEW: Add error handling strategy
  errorStrategy?: 'fail-fast' | 'complete-all';

  // NEW: Enable error aggregation
  mergeErrors?: boolean;
}
```

---

## 2. Production Workflow Engine Patterns

### 2.1 Temporal.io: Child Workflow Error Handling

**Pattern**: Temporal uses a "parent close policy" to determine child behavior on parent failure.

**Key Concepts**:
1. **Parent Close Policy**: What happens to children when parent completes
2. **Cancellation Scopes**: Groups of activities that cancel together
3. **Activity Retry Policies**: Automatic retries with exponential backoff

**Temporal's Approach**:
```typescript
// Temporal-style child workflow execution
const childHandle = await workflow.executeChild(childWorkflow, {
  taskQueue: 'my-task-queue',
  retryPolicy: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['PermanentError'],
  },
});

// Children continue by default when parent completes
// Can be overridden with:
const options = {
  parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
  // or REQUEST_CANCEL, TERMINATE
};
```

**Lessons for Groundswell**:
1. **Configurable Child Behavior**: Allow parent to specify what happens on error
2. **Retry Policies**: Built-in retry with exponential backoff
3. **Error Categorization**: Distinguish retryable vs non-retryable errors
4. **Cancellation Propagation**: Controlled cascading of failures

### 2.2 AWS Step Functions: Error Handling

**Pattern**: Step Functions uses catch/cascade patterns with automatic retries.

**Key Concepts**:
1. **Retry Blocks**: Automatic retry with backoff
2. **Catch Blocks**: Error handling and fallback
3. **Parallel States**: Branch and merge with error aggregation

**Step Functions Approach**:
```json
{
  "Type": "Parallel",
  "Branches": [
    {
      "StartAt": "ProcessA",
      "States": {
        "ProcessA": {
          "Type": "Task",
          "Retry": [
            {
              "ErrorEquals": ["States.TaskFailed"],
              "IntervalSeconds": 1,
              "MaxAttempts": 3,
              "BackoffRate": 2.0
            }
          ],
          "Catch": [
            {
              "ErrorEquals": ["States.ALL"],
              "ResultPath": "$.error",
              "Next": "FallbackA"
            }
          ]
        }
      }
    }
  ]
}
```

**Lessons for Groundswell**:
1. **Declarative Retry**: Configuration-driven retry logic
2. **Error Categories**: Different handling for different error types
3. **Fallback States**: Degraded but functional behavior on failure
4. **Parallel Error Aggregation**: Collect errors from all branches

### 2.3 Cadence Workflow: Error Propagation

**Pattern**: Cadence uses exception-based error propagation with child workflow isolation.

**Key Concepts**:
1. **Workflow Exceptions**: Errors propagate up the tree
2. **Child Workflow Isolation**: Child errors don't crash parent unless thrown
3. **Timeout Handling**: Distinction between timeout and failure

**Cadence Approach**:
```go
// Cadence-style child workflow
childFuture, _ := workflow.ExecuteChildWorkflow(ctx, childWorkflow, input)

var result string
if err := childFuture.Get(ctx, &result); err != nil {
  // Child failed, but parent can handle
  if activities.IsTimeoutError(err) {
    // Handle timeout specifically
  } else if activities.IsCanceledError(err) {
    // Handle cancellation
  } else {
    // Handle other errors
  }
  // Parent continues
}
```

**Lessons for Groundswell**:
1. **Non-Blocking Errors**: Parent can handle child failures
2. **Error Type Discrimination**: Different error types handled differently
3. **Explicit Error Handling**: Parent must explicitly handle child errors
4. **Timeout as First-Class Concept**: Distinguish timeout from failure

### 2.4 Apache Airflow: Task Failure Handling

**Pattern**: Airflow uses DAG-based execution with trigger rules controlling downstream behavior.

**Key Concepts**:
1. **Trigger Rules**: Determine when tasks run based on upstream state
2. **Task Instances**: Individual executions with state tracking
3. **Retries**: Configurable per task
4. **Failure Handlers**: Callbacks on task failure

**Airflow Approach**:
```python
# Airflow-style DAG with trigger rules
task1 = PythonOperator(
    task_id='task1',
    python_callable=process_data,
    retries=3,
    retry_delay=timedelta(seconds=60),
    on_failure_callback=notify_failure,
)

task2 = PythonOperator(
    task_id='task2',
    python_callable=process_more_data,
    trigger_rule=TriggerRule.ONE_SUCCESS,  # Run if ANY upstream succeeded
    depends_on_past=False,
)

task3 = PythonOperator(
    task_id='task3',
    python_callable=finalize,
    trigger_rule=TriggerRule.ALL_DONE,  # Run after ALL upstream complete (success or fail)
)
```

**Lessons for Groundswell**:
1. **Flexible Trigger Rules**: Control downstream execution based on upstream state
2. **Per-Task Retry Configuration**: Fine-grained retry control
3. **Failure Callbacks**: Reactive error handling
4. **Completion-Based Triggers**: "ALL_DONE" = Promise.allSettled pattern

### 2.5 Cross-Cutting Patterns Summary

| Pattern | Temporal | Step Functions | Cadence | Airflow | Groundswell |
|---------|----------|----------------|---------|---------|-------------|
| **Child Isolation** | ✓ | ✓ | ✓ | ✓ | ⚠️ Partial |
| **Error Aggregation** | ✗ | ✓ (Parallel) | ⚠️ Manual | ✓ (Trigger rules) | ✗ |
| **Automatic Retry** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Fail-Fast** | Default | Configurable | Default | Configurable | Default |
| **Complete-All** | ✗ | ✓ (Parallel) | ⚠️ Manual | ✓ (ALL_DONE) | ✗ |
| **Fallback States** | ✗ | ✓ (Catch) | ⚠️ Manual | ✓ (On failure) | ✗ |
| **Cancellation Propagation** | ✓ | ✓ | ✓ | ✓ | ⚠️ Unimplemented |

---

## 3. Error Aggregation Strategies

### 3.1 Strategy 1: First Error Wins (Current Groundswell)

**Description**: Return immediately on first error, hiding concurrent failures.

**Implementation**:
```typescript
// Current implementation (src/decorators/task.ts:112)
await Promise.all(runnable.map((w) => w.run()));
```

**Pros**:
- Simple implementation
- Fast failure detection
- Low memory overhead
- Familiar pattern (Promise.all)

**Cons**:
- Hides concurrent errors
- Loses partial results
- Difficult debugging
- No error context

**Use Case**: Critical workflows where partial success is meaningless.

### 3.2 Strategy 2: Collect All Errors (Recommended)

**Description**: Wait for all operations to complete, collect all errors.

**Implementation**:
```typescript
// Promise.allSettled with error aggregation
const results = await Promise.allSettled(
  runnable.map((w) => w.run())
);

const errors = results
  .filter((r) => r.status === 'rejected')
  .map((r, idx) => ({
    workflow: runnable[idx],
    error: r.status === 'rejected' ? r.reason : undefined,
  }));

if (errors.length > 0) {
  throw new AggregateError(
    errors.map(e => e.error),
    `${errors.length} child workflows failed`
  );
}
```

**Pros**:
- Complete error visibility
- Preserves partial results
- Better debugging
- Error pattern analysis

**Cons**:
- Higher memory usage
- Slower failure detection
- More complex error handling
- Need AggregateError polyfill for older Node versions

**Use Case**: Independent operations where understanding all failures is important.

### 3.3 Strategy 3: Hierarchical Error Merging

**Description**: Merge errors with workflow hierarchy context.

**Implementation**:
```typescript
class WorkflowAggregateError extends Error {
  constructor(
    message: string,
    public errors: WorkflowError[],
    public workflowId: string,
    public workflowName: string,
    public parent?: WorkflowAggregateError
  ) {
    super(message);
    this.name = 'WorkflowAggregateError';
  }

  // Pretty-print error hierarchy
  toString(): string {
    let output = `${this.workflowName}: ${this.message}\n`;
    for (const error of this.errors) {
      output += `  - ${error.workflowId}: ${error.message}\n`;
    }
    if (this.parent) {
      output += `\nCaused by:\n${this.parent.toString()}`;
    }
    return output;
  }

  // Get error statistics
  getStats() {
    return {
      totalErrors: this.errors.length,
      byWorkflow: groupErrorsByWorkflow(this.errors),
      byErrorType: groupErrorsByType(this.errors),
    };
  }
}
```

**Pros**:
- Maintains workflow context
- Hierarchical error visualization
- Rich error metadata
- Statistical analysis

**Cons**:
- Complex implementation
- Higher memory overhead
- Steeper learning curve

**Use Case**: Complex workflow trees needing comprehensive error reporting.

### 3.4 Strategy 4: Error Rate Thresholding

**Description**: Allow some failures, only throw if error rate exceeds threshold.

**Implementation**:
```typescript
interface ErrorThresholdStrategy {
  enabled: boolean;
  maxErrorRate: number; // 0.0 to 1.0
  minAbsoluteErrors: number; // Throw if >= this many errors
}

async function executeWithThreshold(
  workflows: Workflow[],
  strategy: ErrorThresholdStrategy
) {
  const results = await Promise.allSettled(
    workflows.map((w) => w.run())
  );

  const failures = results.filter((r) => r.status === 'rejected');
  const errorRate = failures.length / results.length;

  const shouldThrow =
    failures.length >= strategy.minAbsoluteErrors ||
    errorRate > strategy.maxErrorRate;

  if (shouldThrow) {
    throw new WorkflowAggregateError(
      `${failures.length}/${results.length} workflows failed (${(errorRate * 100).toFixed(1)}%)`,
      failures.map(f => f.reason),
      // ... context
    );
  }

  return results;
}
```

**Pros**:
- Graceful degradation
- Configurable tolerance
- Good for bulk operations
- Prevents single failures from stopping everything

**Cons**:
- May hide systematic issues
- Requires threshold tuning
- Ambiguous success criteria

**Use Case**: High-volume operations where some failures are acceptable (e.g., bulk notifications, cache warming).

### 3.5 Error Aggregation Best Practices

#### DO:
1. **Preserve Workflow Context**: Include workflow ID, name, and path in errors
2. **Maintain Error Order**: Keep errors in execution order for debugging
3. **Include Error Metadata**: Timestamps, retry counts, state snapshots
4. **Provide Statistics**: Error counts, rates, patterns
5. **Support Error Inspection**: Allow programmatic error analysis

#### DON'T:
1. **Lose Stack Traces**: Always preserve original stack traces
2. **Swallow Errors**: Always report or log errors
3. **Create Excessive Depth**: Limit error nesting to prevent stack overflow
4. **Duplicate Errors**: Deduplicate identical errors
5. **Include Sensitive Data**: Redact passwords, tokens, PII from errors

### 3.6 Groundswell Implementation Recommendation

**Current State**:
- Type: `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
- Status: Defined but not implemented
- Interface: `ErrorMergeStrategy` exists but unused

**Recommendation**:

```typescript
// Enhanced error strategy interface
export interface ErrorStrategy {
  type: 'fail-fast' | 'complete-all' | 'threshold';
  threshold?: number; // For 'threshold' type
  mergeErrors?: boolean; // Always merge errors in 'complete-all' mode
}

// Implementation in @Task decorator
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(/* ... */);

  if (runnable.length > 0) {
    const errorStrategy = opts.errorStrategy || 'fail-fast';

    if (errorStrategy === 'fail-fast') {
      // Current behavior: Promise.all
      await Promise.all(runnable.map((w) => w.run()));
    } else {
      // New behavior: Promise.allSettled with aggregation
      const results = await Promise.allSettled(
        runnable.map((w) => w.run())
      );

      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r) => r.reason);

      if (errors.length > 0) {
        throw new WorkflowAggregateError(
          `${errors.length} child workflows failed`,
          errors,
          wf.id,
          taskName
        );
      }
    }
  }
}
```

---

## 4. Fail-Fast vs Complete-All Decision Framework

### 4.1 Decision Tree

```
                    Start Concurrent Tasks
                              |
                    Are tasks independent?
                     /              \
                   No                Yes
                   |                  |
            Use Promise.all      Is partial success
             (Fail-Fast)         valuable?
                                   /            \
                                 No              Yes
                                 |                |
                          Use Promise.all    Need complete
                           (Fail-Fast)       error picture?
                                             /          \
                                           No          Yes
                                           |             |
                                    Use Promise    Use Promise
                                    .allSettled   .allSettled
                                    (simple)      (aggregate)
```

### 4.2 Heuristics for Choosing Strategy

#### Use Fail-Fast (Promise.all) When:

1. **Strong Coupling**: Tasks are logically dependent
   - Example: Multi-step transaction where all steps must succeed
   - Pattern: `validate → hold → transfer → confirm`

2. **Fast Failure Saves Money**: Early termination prevents waste
   - Example: Paid API calls with rate limits
   - Pattern: Stop if quota exceeded or auth fails

3. **First Error Is Representative**: Errors are correlated
   - Example: All tasks use same resource (database, API)
   - Pattern: If one fails, all would fail

4. **User Experience Requires Speed**: Fast feedback is critical
   - Example: Form validation before submission
   - Pattern: Show first error immediately

#### Use Complete-All (Promise.allSettled) When:

1. **Independent Tasks**: No dependencies between operations
   - Example: Sending notifications via multiple channels
   - Pattern: Email, SMS, Slack - try all, report failures

2. **Partial Success Has Value**: Some results better than none
   - Example: Bulk data synchronization
   - Pattern: Sync what succeeds, retry failures

3. **Error Analysis Required**: Need to see all failures
   - Example: Batch processing with quality control
   - Pattern: Analyze error patterns, adjust strategy

4. **Idempotent Operations**: Can safely retry failures
   - Example: Cache warming, data replication
   - Pattern: Populate cache, retry misses later

### 4.3 Strategy Selection Matrix

| Scenario | Fail-Fast | Complete-All | Rationale |
|----------|-----------|--------------|-----------|
| **Financial Transaction** | ✓ | ✗ | All-or-nothing, can't have partial money movement |
| **Bulk Notifications** | ✗ | ✓ | Try all channels, log failures |
| **Data Validation** | ✓ | ✗ | Fast feedback, first error representative |
| **Batch Processing** | ✗ | ✓ | Process what you can, retry failures |
| **Cache Warming** | ✗ | ✓ | Populate as much as possible |
| **API Rate Limiting** | ✓ | ✗ | Stop immediately to avoid waste |
| **Multi-Region Deployment** | ✗ | ✓ | Deploy to available regions, log failures |
| **Form Submission** | ✓ | ✗ | User needs immediate feedback |
| **Data Replication** | ✗ | ✓ | Replicate to available nodes |
| **Paid API Calls** | ✓ | ✗ | Save money on failed requests |

### 4.4 Hybrid Strategy: Adaptive Error Handling

**Concept**: Start with complete-all, switch to fail-fast if error rate exceeds threshold.

**Implementation**:
```typescript
async function adaptiveExecute(
  workflows: Workflow[],
  options: {
    initialStrategy: 'fail-fast' | 'complete-all';
    errorRateThreshold: number; // Switch to fail-fast if exceeded
    minSampleSize: number; // Don't switch until this many tasks
  }
) {
  let strategy = options.initialStrategy;
  let completed = 0;
  let errors = 0;

  const results = await Promise.allSettled(
    workflows.map(async (workflow) => {
      try {
        const result = await workflow.run();
        completed++;
        errors++;

        // Check if we should switch to fail-fast
        if (
          strategy === 'complete-all' &&
          completed >= options.minSampleSize
        ) {
          const errorRate = errors / completed;
          if (errorRate > options.errorRateThreshold) {
            // Switch to fail-fast
            throw new Error(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold, switching to fail-fast`);
          }
        }

        return { status: 'fulfilled', value: result };
      } catch (error) {
        return { status: 'rejected', reason: error };
      }
    })
  );

  return results;
}
```

**Use Case**: High-volume operations where most tasks succeed, but rapid failure indicates systemic issues.

### 4.5 Groundswell Decision Framework

**Question**: Should Groundswell use fail-fast or complete-all by default?

**Analysis**:

**Arguments for Fail-Fast (Current)**:
- Workflow engines traditionally emphasize correctness over partial success
- Parent workflows often need to know immediately if children fail
- Simpler mental model for developers
- Lower memory overhead
- Already implemented

**Arguments for Complete-All (Recommended)**:
- Observability is a core feature (PRD emphasis on logging and debugging)
- Child workflows are often independent (parallel processing pattern)
- "Complete all" provides better error visibility
- Aligns with production patterns (Airflow, Step Functions)
- Enables graceful degradation patterns
- More flexible (can opt-in to fail-fast)

**Recommendation**: **Default to complete-all with opt-in fail-fast**

**Rationale**:
1. Observability First: Groundswell's value prop is debugging and observability
2. Independent by Default: @Task creates independent child workflows
3. Error Visibility: Complete-all provides comprehensive error information
4. Production Patterns: Aligns with Airflow and Step Functions
5. Flexibility: Developers can opt-in to fail-fast when needed

---

## 5. Groundswell-Specific Recommendations

### 5.1 Current Implementation Analysis

**File**: `/home/dustin/projects/groundswell/src/decorators/task.ts`

**Current Behavior (Line 104-114)**:
```typescript
// If concurrent option is set and we have multiple workflows, run them in parallel
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    await Promise.all(runnable.map((w) => w.run()));
  }
}
```

**Characteristics**:
- Strategy: Fail-fast (Promise.all)
- Error Handling: First error wins
- Partial Results: Lost
- Error Aggregation: None
- Configuration: None (hardcoded)

**Issues**:
1. No error aggregation: Only first error is visible
2. No flexibility: Can't choose strategy
3. No observability: Loses error information
4. No graceful degradation: All-or-nothing approach

### 5.2 Recommended Enhancement

#### Phase 1: Add Error Strategy Option

**Changes to `/home/dustin/projects/groundswell/src/types/decorators.ts`**:

```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;

  // NEW: Error handling strategy
  errorStrategy?: 'fail-fast' | 'complete-all';

  // NEW: Error aggregation (only for 'complete-all')
  mergeErrors?: boolean;
}
```

**Changes to `/home/dustin/projects/groundswell/src/decorators/task.ts`**:

```typescript
// If concurrent option is set and we have multiple workflows, run them in parallel
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    const strategy = opts.errorStrategy || 'fail-fast';

    if (strategy === 'fail-fast') {
      // Current behavior: Promise.all (fail-fast)
      await Promise.all(runnable.map((w) => w.run()));
    } else {
      // New behavior: Promise.allSettled (complete-all)
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
          error: result.status === 'rejected' ? result.reason : undefined,
        }));

      // Throw if there were errors
      if (errors.length > 0) {
        // Create aggregate error with all failures
        const aggregateError = new Error(
          `${errors.length} child workflow(s) failed in task '${taskName}'`
        ) as any;

        aggregateError.name = 'WorkflowAggregateError';
        aggregateError.errors = errors;
        aggregateError.taskName = taskName;
        aggregateError.workflowId = wf.id;
        aggregateError.totalChildren = runnable.length;
        aggregateError.failedChildren = errors.length;

        throw aggregateError;
      }
    }
  }
}
```

#### Phase 2: Implement AggregateError Type

**New file**: `/home/dustin/projects/groundswell/src/types/aggregate-error.ts`

```typescript
import type { WorkflowError } from './error.js';

/**
 * Aggregate error containing multiple child workflow errors
 */
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

/**
 * Type guard for WorkflowAggregateError
 */
export function isWorkflowAggregateError(
  error: unknown
): error is WorkflowAggregateError {
  return (
    error instanceof Error &&
    (error as any).name === 'WorkflowAggregateError' &&
    'errors' in error &&
    'totalChildren' in error &&
    'failedChildren' in error
  );
}

/**
 * Create a workflow aggregate error
 */
export function createAggregateError(
  errors: Array<{ workflowId: string; workflowName: string; error: unknown }>,
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
  error.totalChildren = errors.length; // Will be updated by caller
  error.failedChildren = errors.length;

  return error;
}
```

#### Phase 3: Update Error Handling Documentation

**File**: `/home/dustin/projects/groundswell/docs/workflow.md`

**Add section**:

```markdown
## Error Handling in Concurrent Tasks

### Fail-Fast Strategy (Default)

When `concurrent: true` is used without specifying `errorStrategy`, the workflow uses a fail-fast approach:

```typescript
class ParentWorkflow extends Workflow {
  @Task({ concurrent: true })
  async createChildren(): Promise<ChildWorkflow[]> {
    return [
      new ChildWorkflow('child1', this),
      new ChildWorkflow('child2', this),
      new ChildWorkflow('child3', this),
    ];
  }

  async run() {
    try {
      await this.createChildren();
    } catch (error) {
      // Throws immediately when first child fails
      console.error('First child failed:', error.message);
    }
  }
}
```

### Complete-All Strategy

To wait for all children to complete and collect all errors:

```typescript
class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,
    errorStrategy: 'complete-all', // Wait for all children
  })
  async createChildren(): Promise<ChildWorkflow[]> {
    return [
      new ChildWorkflow('child1', this),
      new ChildWorkflow('child2', this),
      new ChildWorkflow('child3', this),
    ];
  }

  async run() {
    try {
      await this.createChildren();
    } catch (error) {
      if (isWorkflowAggregateError(error)) {
        console.error(`${error.failedChildren}/${error.totalChildren} children failed:`);

        for (const failure of error.errors) {
          console.error(`  - ${failure.workflowName}: ${failure.error?.message}`);
        }
      }
    }
  }
}
```

### Choosing the Right Strategy

**Use Fail-Fast When:**
- Child workflows are dependent on each other
- Partial success is not meaningful
- You need immediate feedback on errors
- Resource conservation is important

**Use Complete-All When:**
- Child workflows are independent
- Partial results have value
- You need comprehensive error reporting
- Observability is a priority
```

### 5.3 Backward Compatibility

**Recommendation**: Keep current behavior (fail-fast) as default to maintain backward compatibility.

**Rationale**:
1. Existing code won't break
2. Opt-in to new behavior via `errorStrategy: 'complete-all'`
3. Gradual migration path
4. Safe default (fail-fast is more conservative)

**Future Enhancement**: Consider changing default to `complete-all` in a major version (2.0).

### 5.4 Testing Recommendations

**Add tests to** `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts`:

```typescript
describe('Concurrent Error Handling', () => {
  it('should use fail-fast strategy by default', async () => {
    // Test that current behavior is maintained
  });

  it('should use complete-all strategy when specified', async () => {
    // Test new behavior with errorStrategy: 'complete-all'
  });

  it('should aggregate all errors in complete-all mode', async () => {
    // Test that all errors are collected
  });

  it('should preserve error context in aggregate error', async () => {
    // Test that workflow ID, name, etc. are preserved
  });

  it('should throw WorkflowAggregateError in complete-all mode', async () => {
    // Test error type and structure
  });

  it('should handle partial success in complete-all mode', async () => {
    // Test that some successes + some failures works correctly
  });
});
```

---

## 6. Implementation Roadmap

### Phase 1: Core Implementation (Week 1)

**Tasks**:
1. Add `errorStrategy` option to `TaskOptions` interface
2. Implement `Promise.allSettled` logic in @Task decorator
3. Create `WorkflowAggregateError` type and factory
4. Add error collection and aggregation logic
5. Update JSDoc comments

**Deliverables**:
- Enhanced `/home/dustin/projects/groundswell/src/types/decorators.ts`
- Updated `/home/dustin/projects/groundswell/src/decorators/task.ts`
- New `/home/dustin/projects/groundswell/src/types/aggregate-error.ts`

**Success Criteria**:
- TypeScript compiles without errors
- Existing tests pass (backward compatibility)
- New behavior accessible via `errorStrategy: 'complete-all'`

### Phase 2: Testing (Week 1-2)

**Tasks**:
1. Add unit tests for error aggregation
2. Add integration tests for complete-all strategy
3. Add edge case tests (mixed success/failure)
4. Add performance tests (compare fail-fast vs complete-all)
5. Update example workflows

**Deliverables**:
- New tests in `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts`
- Updated `/home/dustin/projects/groundswell/examples/examples/06-concurrent-tasks.ts`

**Success Criteria**:
- All tests pass (including new tests)
- Test coverage > 90% for new code
- Examples demonstrate both strategies

### Phase 3: Documentation (Week 2)

**Tasks**:
1. Update `/home/dustin/projects/groundswell/docs/workflow.md`
2. Add error handling guide
3. Update API reference
4. Create migration guide
5. Add best practices document

**Deliverables**:
- Updated documentation
- New error handling guide
- Migration guide from fail-fast to complete-all
- Best practices document

**Success Criteria**:
- All APIs documented
- Examples cover both strategies
- Migration path is clear

### Phase 4: Validation (Week 2)

**Tasks**:
1. Manual testing with real workflows
2. Performance benchmarking
3. Memory profiling
4. Error scenario testing
5. User acceptance testing

**Deliverables**:
- Performance benchmarks
- Memory profiles
- Test results report
- Bug fixes (if any)

**Success Criteria**:
- Performance acceptable (< 10% overhead)
- No memory leaks
- All error scenarios handled correctly
- Users can use both strategies effectively

---

## 7. Appendix: Code Examples

### 7.1 Complete Example: Fail-Fast vs Complete-All

```typescript
import { Workflow, Task, Step } from 'groundswell';

// Child workflow that may fail
class DataProcessor extends Workflow {
  constructor(
    public id: string,
    public shouldFail: boolean = false,
    parent?: Workflow
  ) {
    super(id, parent);
  }

  @Step()
  async process(): Promise<string> {
    if (this.shouldFail) {
      throw new Error(`Processing failed in ${this.id}`);
    }
    return `Processed by ${this.id}`;
  }

  async run(): Promise<string> {
    this.setStatus('running');
    const result = await this.process();
    this.setStatus('completed');
    return result;
  }
}

// Parent workflow using fail-fast (default)
class FailFastParent extends Workflow {
  @Task({ concurrent: true })
  async spawnProcessors(): Promise<DataProcessor[]> {
    return [
      new DataProcessor('processor-1', false, this),
      new DataProcessor('processor-2', true, this),  // This will fail
      new DataProcessor('processor-3', false, this),
    ];
  }

  async run(): Promise<void> {
    this.setStatus('running');

    try {
      await this.spawnProcessors();
      console.log('All processors completed successfully');
    } catch (error) {
      console.error('Fail-fast: Stopped at first error');
      console.error('Error:', error.message);
      // processor-3 never runs
      // Only processor-2's error is visible
    }

    this.setStatus('completed');
  }
}

// Parent workflow using complete-all
class CompleteAllParent extends Workflow {
  @Task({
    concurrent: true,
    errorStrategy: 'complete-all',  // NEW: Wait for all
  })
  async spawnProcessors(): Promise<DataProcessor[]> {
    return [
      new DataProcessor('processor-1', false, this),
      new DataProcessor('processor-2', true, this),  // This will fail
      new DataProcessor('processor-3', false, this),
    ];
  }

  async run(): Promise<void> {
    this.setStatus('running');

    try {
      await this.spawnProcessors();
      console.log('All processors completed successfully');
    } catch (error) {
      if (error.name === 'WorkflowAggregateError') {
        console.error('Complete-all: All processors completed');
        console.error(`${error.failedChildren}/${error.totalChildren} failed:`);

        for (const failure of error.errors) {
          console.error(`  - ${failure.workflowName}: ${failure.error?.message}`);
        }

        // processor-1 and processor-3 completed successfully
        // processor-2's error is visible
        // All errors are aggregated
      }
    }

    this.setStatus('completed');
  }
}
```

### 7.2 Error Aggregation Implementation

```typescript
/**
 * Aggregate multiple workflow errors into a single error
 */
class WorkflowAggregateError extends Error {
  constructor(
    message: string,
    public errors: Array<{
      workflowId: string;
      workflowName: string;
      error: unknown;
    }>,
    public taskName: string,
    public workflowId: string,
    public totalChildren: number,
    public failedChildren: number
  ) {
    super(message);
    this.name = 'WorkflowAggregateError';
  }

  /**
   * Pretty-print the aggregate error
   */
  toString(): string {
    let output = `${this.taskName}: ${this.message}\n`;
    output += `  Total: ${this.totalChildren}, Failed: ${this.failedChildren}\n`;
    output += `  Success Rate: ${((1 - this.failedChildren / this.totalChildren) * 100).toFixed(1)}%\n`;

    for (const failure of this.errors) {
      output += `  - ${failure.workflowName} (${failure.workflowId}):\n`;
      output += `    ${failure.error?.message || 'Unknown error'}\n`;
    }

    return output;
  }

  /**
   * Get error statistics
   */
  getStats() {
    const errorsByType = new Map<string, number>();
    const errorsByWorkflow = new Map<string, number>();

    for (const failure of this.errors) {
      const errorType = failure.error?.constructor.name || 'Unknown';
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
      errorsByWorkflow.set(
        failure.workflowName,
        (errorsByWorkflow.get(failure.workflowName) || 0) + 1
      );
    }

    return {
      totalErrors: this.errors.length,
      totalChildren: this.totalChildren,
      failedChildren: this.failedChildren,
      successRate: (1 - this.failedChildren / this.totalChildren) * 100,
      errorsByType: Object.fromEntries(errorsByType),
      errorsByWorkflow: Object.fromEntries(errorsByWorkflow),
    };
  }
}
```

### 7.3 Usage in Production

```typescript
// Real-world example: Bulk data synchronization
class DataSyncWorkflow extends Workflow {
  @ObservedState()
  recordsProcessed = 0;

  @ObservedState()
  recordsFailed = 0;

  @ObservedState()
  syncStartTime = 0;

  @Task({
    concurrent: true,
    errorStrategy: 'complete-all',  // Try all records
  })
  async syncRecords(records: Record[]): Promise<RecordSyncWorkflow[]> {
    return records.map(
      (record) => new RecordSyncWorkflow(record, this)
    );
  }

  @Step({ snapshotState: true })
  async aggregateResults(results: PromiseSettledResult<unknown>[]): Promise<void> {
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    this.recordsProcessed = succeeded.length;
    this.recordsFailed = failed.length;

    this.logger.info(`Sync complete: ${succeeded.length} succeeded, ${failed.length} failed`);

    if (failed.length > 0) {
      this.logger.warn(`${failed.length} records failed to sync, will retry`);
    }
  }

  async run(records: Record[]): Promise<SyncResults> {
    this.setStatus('running');
    this.syncStartTime = Date.now();

    try {
      await this.syncRecords(records);

      // Continue despite partial failures
      return {
        total: records.length,
        succeeded: this.recordsProcessed,
        failed: this.recordsFailed,
        duration: Date.now() - this.syncStartTime,
      };
    } catch (error) {
      if (error.name === 'WorkflowAggregateError') {
        // Log all failures but don't fail the workflow
        this.logger.warn(`Partial sync complete: ${error.failedChildren}/${error.totalChildren} failed`);

        return {
          total: records.length,
          succeeded: error.totalChildren - error.failedChildren,
          failed: error.failedChildren,
          duration: Date.now() - this.syncStartTime,
          errors: error.errors,
        };
      }
      throw error;
    } finally {
      this.setStatus('completed');
    }
  }
}
```

---

## 8. Conclusion

### 8.1 Summary of Findings

1. **Promise.all vs Promise.allSettled**:
   - Promise.all (fail-fast): Fast, simple, but loses error information
   - Promise.allSettled (complete-all): Slower, more complex, but provides complete error visibility
   - **Recommendation**: Support both strategies via configuration

2. **Production Workflow Engines**:
   - Temporal: Parent close policies, configurable cancellation
   - Step Functions: Parallel states with error aggregation
   - Cadence: Exception-based error propagation
   - Airflow: Trigger rules for flexible execution
   - **Gap**: Groundswell lacks error aggregation and flexible error strategies

3. **Error Aggregation Strategies**:
   - First error wins: Simple but limited (current implementation)
   - Collect all errors: Comprehensive error visibility (recommended)
   - Hierarchical merging: Maintains workflow context
   - Threshold-based: Graceful degradation
   - **Recommendation**: Implement collect-all with hierarchical context

4. **Fail-Fast vs Complete-All**:
   - Fail-fast: Critical workflows, dependent tasks, fast feedback
   - Complete-all: Independent tasks, partial success, observability
   - **Recommendation**: Default to complete-all for Groundswell (observability-first design)

### 8.2 Recommendations for Groundswell

**Priority 1 (Immediate)**:
1. Add `errorStrategy` option to `TaskOptions`
2. Implement `Promise.allSettled` path in @Task decorator
3. Create `WorkflowAggregateError` type
4. Maintain backward compatibility (fail-fast as default)

**Priority 2 (Short-term)**:
1. Add comprehensive error aggregation
2. Include workflow context in errors
3. Add error statistics and pretty-printing
4. Update documentation and examples

**Priority 3 (Long-term)**:
1. Consider changing default to complete-all in v2.0
2. Add retry policies per child workflow
3. Implement threshold-based error handling
4. Add error rate monitoring and alerting

### 8.3 Impact Assessment

**Benefits**:
- Better observability: See all errors, not just first
- Graceful degradation: Partial success scenarios
- Production-ready: Aligns with industry patterns
- Debugging: Comprehensive error information
- Flexibility: Developers choose strategy per task

**Costs**:
- Complexity: More configuration options
- Memory: Storing all errors (mitigated by error limiting)
- Performance: Waiting for all tasks to complete (mitigated by configurable strategy)
- Learning curve: Developers need to understand both strategies

**Risk Mitigation**:
- Backward compatibility: Default to fail-fast
- Gradual migration: Opt-in to complete-all
- Documentation: Clear examples and best practices
- Testing: Comprehensive test coverage

---

## References

### Production Documentation

1. **Temporal.io**: Child Workflows and Error Handling
   - https://docs.temporal.io/develop/typescript/child-workflows
   - Key concepts: Parent close policy, cancellation scopes, retry policies

2. **AWS Step Functions**: Error Handling
   - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
   - Key concepts: Retry blocks, catch blocks, parallel state error aggregation

3. **Cadence Workflow**: Execution Patterns
   - https://cadenceworkflow.io/docs/concepts/execution/
   - Key concepts: Exception-based error propagation, child workflow isolation

4. **Apache Airflow**: Task Instances and Trigger Rules
   - https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
   - Key concepts: Trigger rules, task dependencies, failure handlers

### JavaScript/TypeScript Documentation

5. **MDN: Promise.all()**
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
   - Fail-fast behavior, rejection handling

6. **MDN: Promise.allSettled()**
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
   - Complete-all behavior, status objects

7. **Node.js: Asynchronous Work**
   - https://nodejs.dev/en/learn/asynchronous-work/
   - Async/await patterns, error handling

### Groundswell Codebase

8. **@Task Decorator Implementation**
   - `/home/dustin/projects/groundswell/src/decorators/task.ts`
   - Current fail-fast implementation

9. **Error Strategy Types**
   - `/home/dustin/projects/groundswell/src/types/error-strategy.ts`
   - Defined but not implemented

10. **Workflow Documentation**
    - `/home/dustin/projects/groundswell/docs/workflow.md`
    - Current error handling patterns

11. **Concurrent Tasks Example**
    - `/home/dustin/projects/groundswell/examples/examples/06-concurrent-tasks.ts`
    - Real-world usage examples

### Research Context

12. **Error Handling Best Practices Research**
    - `/home/dustin/projects/groundswell/plan/docs/research/error_handling_patterns.md`
    - TypeScript error handling patterns, state capture

13. **PRD: Hierarchical Workflow Engine**
    - `/home/dustin/projects/groundswell/PRPs/001-hierarchical-workflow-engine.md`
    - Requirements for observability and error handling

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Ready for Implementation
**Next Review**: After Phase 1 Implementation
