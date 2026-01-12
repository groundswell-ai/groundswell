name: "P1.M2.T2.S2 - Implement Error Aggregation Logic in @Task Decorator"
description: |

---

## Goal

**Feature Goal**: Implement error aggregation logic in the @Task decorator to support the `errorMergeStrategy` option, enabling users to configure how multiple concurrent workflow errors are merged and propagated.

**Deliverable**: Updated @Task decorator (`src/decorators/task.ts`) that:

1. Checks if `opts.errorMergeStrategy?.enabled` is true after collecting errors from Promise.allSettled()
2. Calls `opts.errorMergeStrategy.combine?(errors)` if provided, otherwise uses a default error merger
3. Throws the merged error instead of the first error when error merge strategy is enabled
4. Emits error event with the merged error (single event for all failures)

**Success Definition**:

* When `errorMergeStrategy?.enabled === true`, all concurrent workflow errors are aggregated
* When `combine()` function is provided, it is called with array of WorkflowError objects
* When `combine()` is not provided, a default merger creates an AggregateError-like structure
* The merged error contains aggregated information from all failures
* A single error event is emitted with the merged error
* Backward compatibility is maintained: when `errorMergeStrategy` is not provided, first error is thrown
* All existing tests continue to pass

## User Persona (if applicable)

**Target User**: Library Developer / Workflow Architect

**Use Case**: A developer running concurrent child workflows wants to receive comprehensive error information when multiple workflows fail, instead of just the first error.

**User Journey**:

1. Developer creates a parent workflow with multiple concurrent child workflows
2. Some child workflows fail
3. Developer wants to see ALL errors, not just the first one
4. Developer enables `errorMergeStrategy: { enabled: true }` in @Task decorator options
5. Developer optionally provides a custom `combine()` function to merge errors
6. When failures occur, all errors are aggregated and thrown as a single merged error
7. Developer can inspect the merged error to see all failures

**Pain Points Addressed**:

* Currently only the first error from concurrent failures is visible
* Other concurrent failures are collected but not surfaced to the caller
* No way to customize how multiple errors should be merged
* Difficult to debug when multiple independent workflows fail

## Why

* **Observability**: Multiple concurrent failures should be visible together, not hidden
* **Debugging**: Developers need to see ALL errors to understand patterns and root causes
* **Production Patterns**: Aligns with workflow engines like Airflow (trigger rules) and Step Functions (parallel error aggregation)
* **PRD Compliance**: PRD Section 10 specifies "Optional Multi-Error Merging" as a feature
* **Enable P1.M2.T2.S3**: Default error merger implementation depends on this being complete
* **Enable P1.M2.T2.S4**: ErrorMergeStrategy tests depend on this implementation

## What

Modify the @Task decorator in `src/decorators/task.ts` to implement error aggregation logic when `errorMergeStrategy.enabled === true`.

### Current Implementation (Lines 111-121)

```typescript
if (runnable.length > 0) {
  const results = await Promise.allSettled(runnable.map((w) => w.run()));

  const rejected = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected'
  );

  if (rejected.length > 0) {
    throw rejected[0].reason; // First error wins (backward compatible)
  }
}
```

### Target Implementation

```typescript
if (runnable.length > 0) {
  const results = await Promise.allSettled(runnable.map((w) => w.run()));

  const rejected = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected'
  );

  if (rejected.length > 0) {
    // Check if error merge strategy is enabled
    if (opts.errorMergeStrategy?.enabled) {
      // Extract WorkflowError objects from rejected promises
      const errors = rejected.map((r) => r.reason as WorkflowError);

      // Merge errors using custom combine() or default merger
      const mergedError = opts.errorMergeStrategy?.combine
        ? opts.errorMergeStrategy.combine(errors)
        : defaultErrorMerger(errors, taskName, wf.id, runnable.length);

      // Emit error event with merged error
      wf.emitEvent({
        type: 'error',
        node: wf.node,
        error: mergedError,
      });

      // Throw merged error
      throw mergedError;
    }

    // Backward compatibility: throw first error
    throw rejected[0].reason;
  }
}
```

### Success Criteria

* [ ] Check `opts.errorMergeStrategy?.enabled` before throwing error
* [ ] Extract WorkflowError array from rejected promises
* [ ] Call custom `combine()` function if provided
* [ ] Use default error merger when `combine()` is not provided
* [ ] Emit error event with merged error (not first error)
* [ ] Throw merged error instead of first error when enabled
* [ ] Backward compatibility maintained when `errorMergeStrategy` not provided
* [ ] All existing tests pass
* [ ] New tests for error aggregation pass

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:

* Exact file location with line numbers (src/decorators/task.ts:111-121)
* Complete current implementation code
* Type definitions for all interfaces used
* Error handling patterns to follow
* Default error merger implementation
* Test patterns for validation
* External research documentation with URLs

### Documentation & References

```yaml
# MUST READ - Current Implementation
- file: src/decorators/task.ts
  lines: 104-122
  why: Target section to modify - contains Promise.allSettled error handling
  pattern: Error collection with rejected.filter() and first-error-wins throw
  gotcha: rejected[].reason is already WorkflowError (wrapped by @Step decorator)

- file: src/decorators/task.ts
  lines: 1-136 (full file)
  why: Complete @Task decorator context including imports and event emission
  pattern: Task decorator wrapper with event emission and child attachment

- file: src/types/decorators.ts
  why: TaskOptions interface definition - errorMergeStrategy field added in P1.M2.T2.S1
  current_content: |
    import type { ErrorMergeStrategy } from './error-strategy.js';

    export interface TaskOptions {
      name?: string;
      concurrent?: boolean;
      errorMergeStrategy?: ErrorMergeStrategy;
    }

- file: src/types/error-strategy.ts
  why: ErrorMergeStrategy interface definition
  current_content: |
    import type { WorkflowError } from './error.js';

    export interface ErrorMergeStrategy {
      enabled: boolean;
      maxMergeDepth?: number;
      combine?(errors: WorkflowError[]): WorkflowError;
    }

- file: src/types/error.ts
  why: WorkflowError interface structure - what errors look like in this codebase
  current_content: |
    export interface WorkflowError {
      message: string;
      original: unknown;
      workflowId: string;
      stack?: string;
      state: SerializedWorkflowState;
      logs: LogEntry[];
    }

- file: src/types/events.ts
  why: WorkflowEvent union type - error event structure
  current_content: |
    | { type: 'error'; node: WorkflowNode; error: WorkflowError }

- file: src/decorators/step.ts
  lines: 109-134
  why: Shows how WorkflowError objects are created and error events emitted
  pattern: Error capture with getObservedState(), event emission
  critical: Each failing workflow already emits error event - don't duplicate

# ARCHITECTURE DOCUMENTATION - Implementation Guidance
- docfile: plan/001_d3bb02af4886/bugfix/architecture/concurrent_execution_best_practices.md
  why: Internal guidance on error aggregation strategies
  section: Lines 597-638 ("Groundswell Implementation Recommendation")
  critical: |
    Shows recommended implementation pattern:
    - Check opts.errorMergeStrategy?.enabled
    - Call opts.errorMergeStrategy.combine?(errors)
    - Throw merged error instead of first error
    - Emit error event with merged error

# EXTERNAL RESEARCH - Error Aggregation Patterns
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
  why: Official documentation for Promise.allSettled() method
  section: #description
  critical: Promise.allSettled ALWAYS resolves - manual error checking required

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
  why: Official documentation for AggregateError - useful pattern reference
  section: #description
  critical: AggregateError can contain multiple errors as cause chain

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S2/research/05_comprehensive_summary.md
  why: Comprehensive summary of external research findings
  section: "Recommended Implementation for Groundswell"
  critical: Complete code examples for error aggregation patterns

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S2/research/01_typescript_error_aggregation_patterns.md
  why: TypeScript-specific error aggregation patterns
  section: "Production-Grade Patterns"
  critical: Type guards, error normalization, context preservation

# PREVIOUS PRPS - Understanding What Was Done Before
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S1/PRP.md
  why: P1.M2.T2.S1 added errorMergeStrategy field to TaskOptions
  section: "What" section shows Target State
  critical: TaskOptions interface now has errorMergeStrategy?: ErrorMergeStrategy field

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M2T1S2/PRP.md
  why: P1.M2.T1.S2 implemented Promise.allSettled with error collection
  section: "Implementation Blueprint" shows the replaced Promise.all logic
  critical: rejected array already available - just need to aggregate it

# TEST PATTERNS - Follow for Validation
- file: src/__tests__/adversarial/concurrent-task-failures.test.ts
  why: Tests for concurrent task failure scenarios
  pattern: Testing multiple failing workflows with error verification

- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 366-430
  why: Contains concurrent task execution tests with mixed success/failure
  pattern: Testing concurrent workflows with errors

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M2T2S2/research/RESEARCH_REPORT.md
  why: Complete testing guide for error aggregation
  section: "Key Research Findings" and "Best Practices Summary"
  critical: Test patterns, assertion patterns, edge cases to cover

# TYPE REFERENCES - TypeScript Type Safety
- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#type-predicates
  why: TypeScript type guard documentation
  section: Type Predicates
  critical: Type guard pattern: (r): r is PromiseRejectedResult => r.status === 'rejected'
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── decorators/
│   │   ├── index.ts                   # Exports Task decorator
│   │   ├── step.ts                    # @Step decorator with error wrapping (lines 109-134)
│   │   └── task.ts                    # PRIMARY: Lines 111-121 to modify - TARGET FILE
│   ├── types/
│   │   ├── index.ts                   # Re-exports all types
│   │   ├── decorators.ts              # TaskOptions with errorMergeStrategy field (from P1.M2.T2.S1)
│   │   ├── error-strategy.ts          # ErrorMergeStrategy interface
│   │   ├── error.ts                   # WorkflowError interface
│   │   └── events.ts                  # WorkflowEvent union type with error event
│   └── __tests__/
│       ├── adversarial/
│       │   ├── concurrent-task-failures.test.ts  # P1.M2.T1.S3 tests
│       │   └── edge-case.test.ts      # Concurrent execution tests
│       └── unit/
│           └── decorators.test.ts     # General decorator tests
├── plan/
│   └── 001_d3bb02af4886/
│       ├── bugfix/
│       │   └── 001_e8e04329daf3/
│       │       ├── P1M2T2S2/
│       │       │   ├── research/      # External research storage
│       │       │   └── PRP.md         # ← THIS FILE
│       │       └── architecture/
│       │           └── concurrent_execution_best_practices.md
└── vitest.config.ts                   # Test configuration
```

### Desired Codebase Tree (Changes for This Task)

```bash
# MODIFIED FILES:
src/decorators/task.ts                  # Add error aggregation logic (lines 111-121)

# NO NEW FILES for this task
# P1.M2.T2.S3 will add default error merger utility
# P1.M2.T2.S4 will add tests for ErrorMergeStrategy functionality
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL GOTCHA #1: rejected[].reason is already WorkflowError
// Each failing workflow has its error wrapped by @Step decorator
// No need to create new WorkflowError objects
// The error object already contains: message, original, workflowId, stack, state, logs
// BAD: const errors = rejected.map(r => createWorkflowError(r.reason));
// GOOD: const errors = rejected.map(r => r.reason as WorkflowError);

// CRITICAL GOTCHA #2: Error events already emitted by @Step decorator
// src/decorators/step.ts:126-130 emits error events for each failing workflow
// DO NOT emit error events for individual failures in @Task decorator
// Only emit a SINGLE error event with the merged error when errorMergeStrategy is enabled
// When errorMergeStrategy is NOT enabled, no error event here (individual events already emitted)

// CRITICAL GOTCHA #3: combine() function signature
// combine?(errors: WorkflowError[]): WorkflowError
// Takes array of WorkflowError, returns single WorkflowError
// User-provided function must return valid WorkflowError object
// If user returns something invalid, it will fail at emitEvent or throw

// CRITICAL GOTCHA #4: maxMergeDepth is NOT used in this task
// The maxMergeDepth option exists in ErrorMergeStrategy interface
// It's intended for future recursive error merging (nested concurrent tasks)
// This task does NOT implement recursive merging - just flat aggregation
// Ignore maxMergeDepth for now, will be used in future enhancements

// CRITICAL GOTCHA #5: Backward compatibility is MANDATORY
// When errorMergeStrategy is undefined or enabled is false:
//   - MUST throw rejected[0].reason (first error)
//   - MUST NOT emit error event (already emitted by @Step)
// When errorMergeStrategy.enabled is true:
//   - MUST throw merged error (not first error)
//   - MUST emit error event with merged error
// Tests will verify both behaviors work correctly

// CRITICAL GOTCHA #6: Type safety for WorkflowError
// rejected[0].reason is technically `unknown`, not WorkflowError
// Must cast to WorkflowError: `as WorkflowError`
// TypeScript won't automatically narrow based on our knowledge of @Step behavior

// CRITICAL GOTCHA #7: Runnable workflow context
// rejected array contains results, not workflow objects
// To get workflow info (id, name), access via runnable array index
// Each rejected[i] corresponds to runnable[i]
// Not needed for default merger (WorkflowError already has workflowId)

// CRITICAL GOTCHA #8: Event emission timing
// Emit error event BEFORE throwing the error
// This matches @Step decorator pattern (emit then throw)
// Observers see the error before it propagates up the call stack
```

## Implementation Blueprint

### Data Models and Structure

**No new data models for this task** - using existing types:

* `WorkflowError` from `src/types/error.ts` (error structure)
* `ErrorMergeStrategy` from `src/types/error-strategy.ts` (configuration)
* `WorkflowEvent` from `src/types/events.ts` (error event structure)

**Inline Default Error Merger** (to be extracted to utils in P1.M2.T2.S3):

```typescript
// Inline default error merger (will be extracted to src/utils/error-merger.ts in P1.M2.T2.S3)
// This function creates a merged WorkflowError containing information from all errors
const defaultErrorMerger = (
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError => {
  // Create merged error message
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

  // Get all unique workflow IDs that failed
  const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

  // Aggregate all logs
  const allLogs = errors.flatMap((e) => e.logs);

  // Create merged WorkflowError
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack, // Use first error's stack trace
    state: errors[0]?.state || {} as SerializedWorkflowState, // Use first error's state
    logs: allLogs,
  };

  return mergedError;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/decorators/task.ts - Add type imports for error aggregation
  - ADD: No new imports needed - WorkflowError already in type imports
  - VERIFY: TaskOptions import includes errorMergeStrategy field
  - DEPENDENCIES: None

Task 2: MODIFY src/decorators/task.ts - Add inline default error merger function
  - ADD: defaultErrorMerger function before Task decorator (after line 16)
  - PATTERN: Follow inline helper pattern (similar to type guards)
  - PARAMETERS: (errors: WorkflowError[], taskName: string, workflowId: string, totalChildren: number)
  - RETURN: WorkflowError (merged error with aggregated information)
  - IMPLEMENTATION: See "Inline Default Error Merger" section above
  - DEPENDENCIES: None

Task 3: MODIFY src/decorators/task.ts - Replace error throwing logic (lines 118-120)
  - CURRENT CODE:
    if (rejected.length > 0) {
      throw rejected[0].reason;
    }

  - REPLACE WITH:
    if (rejected.length > 0) {
      // Check if error merge strategy is enabled
      if (opts.errorMergeStrategy?.enabled) {
        // Extract WorkflowError objects from rejected promises
        const errors = rejected.map((r) => r.reason as WorkflowError);

        // Merge errors using custom combine() or default merger
        const mergedError = opts.errorMergeStrategy?.combine
          ? opts.errorMergeStrategy.combine(errors)
          : defaultErrorMerger(errors, taskName, wf.id, runnable.length);

        // Emit error event with merged error
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: mergedError,
        });

        // Throw merged error
        throw mergedError;
      }

      // Backward compatibility: throw first error
      throw rejected[0].reason;
    }

  - DEPENDENCIES: Task 2

Task 4: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: No type errors
  - VERIFY: WorkflowError type is available
  - VERIFY: opts.errorMergeStrategy type is correct
  - DEPENDENCIES: Task 3

Task 5: RUN existing tests
  - RUN: npm test
  - VERIFY: All existing tests pass (backward compatibility)
  - VERIFY: No behavior changes when errorMergeStrategy not provided
  - DEPENDENCIES: Task 4

Task 6: MANUAL TEST - Verify error aggregation works
  - CREATE: Test workflow with errorMergeStrategy enabled
  - VERIFY: Multiple errors are aggregated
  - VERIFY: Merged error contains all error information
  - VERIFY: Error event is emitted with merged error
  - DEPENDENCIES: Task 5
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Error Merge Strategy Check
// Location: src/decorators/task.ts lines 118-120
// ============================================

// BEFORE (current):
if (rejected.length > 0) {
  throw rejected[0].reason;
}

// AFTER (target):
if (rejected.length > 0) {
  // Check if error merge strategy is enabled
  if (opts.errorMergeStrategy?.enabled) {
    // Error aggregation logic...
    // Emit error event with merged error
    // Throw merged error
  }

  // Backward compatibility: throw first error
  throw rejected[0].reason;
}

// KEY INSIGHTS:
// - Optional chaining (?.) safely checks if errorMergeStrategy exists
// - Check enabled property before aggregating
// - Fall through to original behavior if not enabled
// - Maintains exact backward compatibility

// ============================================
// PATTERN 2: Extract WorkflowError Array
// Location: src/decorators/task.ts inside error merge strategy block
// ============================================

// Extract WorkflowError objects from rejected promises
const errors = rejected.map((r) => r.reason as WorkflowError);

// KEY INSIGHTS:
// - rejected[].reason is technically `unknown` (Promise rejection type)
// - Cast to WorkflowError because we know @Step decorator wraps errors
// - Map operation creates array of WorkflowError
// - Array is passed to combine() function or default merger
// - Type assertion is safe because of Groundswell's error wrapping pattern

// ============================================
// PATTERN 3: Custom combine() vs Default Merger
// Location: src/decorators/task.ts inside error merge strategy block
// ============================================

// Merge errors using custom combine() or default merger
const mergedError = opts.errorMergeStrategy?.combine
  ? opts.errorMergeStrategy.combine(errors)
  : defaultErrorMerger(errors, taskName, wf.id, runnable.length);

// KEY INSIGHTS:
// - Ternary operator chooses between custom and default merger
// - opts.errorMergeStrategy?.combine is optional function
// - If provided, call it with errors array
// - If not provided, use inline default error merger
// - Both return WorkflowError object
// - User has full control over error merging when providing combine()

// ============================================
// PATTERN 4: Default Error Merger Implementation
// Location: src/decorators/task.ts (inline function before Task decorator)
// ============================================

const defaultErrorMerger = (
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError => {
  // Create merged error message
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

  // Get all unique workflow IDs that failed
  const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

  // Aggregate all logs
  const allLogs = errors.flatMap((e) => e.logs);

  // Create merged WorkflowError
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack,
    state: errors[0]?.state || {} as SerializedWorkflowState,
    logs: allLogs,
  };

  return mergedError;
};

// KEY INSIGHTS:
// - Message is descriptive (counts, task name, parent workflow)
// - Aggregates all logs from all errors (flatMap)
// - Stores aggregated metadata in original field (as unknown for flexibility)
// - Uses first error's stack trace (representative stack)
// - Uses first error's state (representative state)
// - Returns valid WorkflowError object (can be emitted in error event)

// ============================================
// PATTERN 5: Error Event Emission with Merged Error
// Location: src/decorators/task.ts inside error merge strategy block
// ============================================

// Emit error event with merged error
wf.emitEvent({
  type: 'error',
  node: wf.node,
  error: mergedError,
});

// KEY INSIGHTS:
// - Emit BEFORE throwing (matches @Step decorator pattern)
// - Single error event for ALL failures (not one per failure)
// - Observers receive aggregated error information
// - Enables monitoring of aggregate failure scenarios
// - Only emitted when errorMergeStrategy.enabled === true
// - When not enabled, individual workflow error events already emitted by @Step

// ============================================
// PATTERN 6: Throw Merged Error
// Location: src/decorators/task.ts after error event emission
// ============================================

// Throw merged error
throw mergedError;

// KEY INSIGHTS:
// - Throw AFTER emitting event (observers see it before propagation)
// - Thrown error is WorkflowError (same type as individual errors)
// - Caller can check if it's an aggregate by inspecting original field
// - Maintains error type consistency across the codebase
// - Stack trace will point to this location (expected behavior)

// ============================================
// PATTERN 7: Backward Compatibility Fallthrough
// Location: src/decorators/task.ts after error merge strategy block
// ============================================

// Backward compatibility: throw first error
throw rejected[0].reason;

// KEY INSIGHTS:
// - This code runs when errorMergeStrategy is undefined or enabled === false
// - Maintains EXACT same behavior as before this change
// - First error is thrown (fail-fast behavior)
// - No error event emitted here (individual events already emitted by @Step)
// - Existing tests verify this behavior is preserved
```

### Integration Points

```yaml
TASK_DECORATOR:
  - modify: src/decorators/task.ts
    lines: 118-120 (error throwing logic)
    add: errorMergeStrategy check, error aggregation, merged error event

  - add: inline defaultErrorMerger function (before Task decorator, after line 16)

TASK_OPTIONS:
  - reference: src/types/decorators.ts
    field: errorMergeStrategy?: ErrorMergeStrategy
    note: Already added in P1.M2.T2.S1

  - access: opts.errorMergeStrategy?.enabled
  - access: opts.errorMergeStrategy?.combine

ERROR_TYPES:
  - reference: src/types/error.ts
    interface: WorkflowError
    fields: message, original, workflowId, stack, state, logs

  - cast: rejected[].reason as WorkflowError
  - return: WorkflowError from combine() and defaultErrorMerger()

EVENT_SYSTEM:
  - emit: wf.emitEvent({ type: 'error', node: wf.node, error: mergedError })
  - note: Only when errorMergeStrategy.enabled === true
  - note: Single event for all failures (not per-failure)

FUTURE_INTEGRATIONS (P1.M2.T2.S3):
  - extract: defaultErrorMerger to src/utils/error-merger.ts
  - add: more sophisticated error aggregation patterns
  - add: pretty printing and statistics generation

FUTURE_INTEGRATIONS (P1.M2.T2.S4):
  - add: comprehensive tests for error aggregation
  - add: tests for custom combine() function
  - add: tests for default error merger
  - add: tests for backward compatibility
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying src/decorators/task.ts, run these checks

# TypeScript type checking
npx tsc --noEmit

# Expected: Zero type errors
# Common errors to fix:
# - "Property 'errorMergeStrategy' does not exist" → Check TaskOptions import
# - "Cannot cast to WorkflowError" → Check error type casting
# - "Property 'combine' does not exist" → Check optional chaining

# If available, run linter
npm run lint 2>/dev/null || echo "No linter configured"
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all existing tests to verify backward compatibility
npm test

# Run specific concurrent execution tests
npm test -- src/__tests__/adversarial/concurrent-task-failures.test.ts
npm test -- src/__tests__/adversarial/edge-case.test.ts

# Expected: All existing tests pass without modification
# If tests fail, debug - should maintain exact backward compatibility
```

### Level 3: Integration Testing (System Validation)

```bash
# Create manual test to verify error aggregation
cat > /tmp/test_error_merge.js << 'EOF'
// Manual test for error merge strategy
import { Workflow, Task, Step } from './src/index.js';

class FailingWorkflow extends Workflow {
  constructor(id: string, parent?: Workflow) {
    super(id, parent);
  }

  @Step()
  async run() {
    throw new Error(`Failure in ${this.id}`);
  }
}

class ParentWorkflow extends Workflow {
  constructor(id: string, useMergeStrategy: boolean = true) {
    super(id);
    this.useMergeStrategy = useMergeStrategy;
  }

  private useMergeStrategy: boolean;

  @Task({
    concurrent: true,
    errorMergeStrategy: this.useMergeStrategy ? {
      enabled: true,
      // Custom combine function
      combine: (errors) => ({
        message: `Custom merge: ${errors.length} workflows failed`,
        original: errors,
        workflowId: 'parent',
        logs: errors.flatMap(e => e.logs),
      }),
    } : undefined,
  })
  async spawnFailingChildren() {
    return [
      new FailingWorkflow('child1', this),
      new FailingWorkflow('child2', this),
      new FailingWorkflow('child3', this),
    ];
  }

  async run() {
    return this.spawnFailingChildren();
  }
}

async function test() {
  console.log('=== Test 1: With Error Merge Strategy ===');
  const parent1 = new ParentWorkflow('parent1', true);
  try {
    await parent1.run();
  } catch (error) {
    console.log('Caught merged error:', error.message);
    console.log('Original field contains errors array:', Array.isArray(error.original));
    console.log('Number of errors:', error.original?.length || 0);
  }

  console.log('\n=== Test 2: Without Error Merge Strategy (Backward Compat) ===');
  const parent2 = new ParentWorkflow('parent2', false);
  try {
    await parent2.run();
  } catch (error) {
    console.log('Caught first error:', error.message);
    console.log('Is WorkflowError:', 'workflowId' in error);
  }
}

test();
EOF

node /tmp/test_error_merge.js

# Expected output:
# Test 1: Shows custom merged error with all 3 errors
# Test 2: Shows first error only (backward compatible)

# Clean up
rm /tmp/test_error_merge.js
```

### Level 4: Domain-Specific Validation

```bash
# Test default error merger (without custom combine)
cat > /tmp/test_default_merger.js << 'EOF'
import { Workflow, Task, Step } from './src/index.js';

class FailingWorkflow extends Workflow {
  @Step()
  async run() {
    throw new Error(`Failed in ${this.id}`);
  }
}

class ParentWorkflow extends Workflow {
  @Task({
    concurrent: true,
    errorMergeStrategy: { enabled: true },  // No combine function - use default
  })
  async spawnChildren() {
    return [
      new FailingWorkflow('child1', this),
      new FailingWorkflow('child2', this),
    ];
  }

  async run() {
    return this.spawnChildren();
  }
}

async function test() {
  const parent = new ParentWorkflow('parent');
  try {
    await parent.run();
  } catch (error) {
    console.log('Default merged error message:', error.message);
    console.log('Original field:', JSON.stringify(error.original, null, 2));
  }
}

test();
EOF

node /tmp/test_default_merger.js

# Expected: Default merger creates proper WorkflowError with:
# - Descriptive message with counts
# - Original field containing errors array
# - All logs aggregated
```

## Final Validation Checklist

### Technical Validation

* [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
* [ ] defaultErrorMerger function returns valid WorkflowError
* [ ] opts.errorMergeStrategy?.enabled check uses optional chaining
* [ ] errors array correctly cast to WorkflowError[]
* [ ] Custom combine() called when provided
* [ ] Default merger used when combine() not provided
* [ ] Error event emitted with merged error
* [ ] Merged error thrown instead of first error when enabled

### Backward Compatibility Validation

* [ ] When errorMergeStrategy is undefined: first error thrown
* [ ] When errorMergeStrategy.enabled is false: first error thrown
* [ ] When errorMergeStrategy.enabled is true: merged error thrown
* [ ] No error event emitted when merge strategy not enabled
* [ ] All existing tests pass without modification

### Feature Validation

* [ ] Multiple concurrent workflow errors are aggregated
* [ ] Custom combine() function receives WorkflowError array
* [ ] Custom combine() return value is used as merged error
* [ ] Default merger creates WorkflowError with aggregated information
* [ ] Merged error message includes failure count
* [ ] All logs from all errors are aggregated
* [ ] Error event contains merged error

### Code Quality Validation

* [ ] Follows existing code patterns (indentation, naming, style)
* [ ] No console.log or debug statements left in
* [ ] Error handling is specific (throwing exact error, not new wrapper)
* [ ] Type safety maintained (all casts are safe)
* [ ] Comments added for clarity (optional chaining, backward compatibility)

### Documentation & Deployment

* [ ] Code is self-documenting with clear variable names
* [ ] Inline comments explain error merge strategy logic
* [ ] Backward compatibility is clearly documented in comments
* [ ] No breaking changes to public API

## Anti-Patterns to Avoid

* ❌ **Don't create new WorkflowError objects** - rejected[].reason is already WorkflowError
* ❌ **Don't emit error events for individual failures** - @Step decorator already does this
* ❌ **Don't throw error without emitting event** - Must emit before throw (pattern consistency)
* ❌ **Don't ignore combine() return value** - User's custom function must be used when provided
* ❌ **Don't assume combine() returns WorkflowError** - Trust user's implementation, TypeScript validates
* ❌ **Don't aggregate when errorMergeStrategy is undefined** - Must check both exists AND enabled
* ❌ **Don't break backward compatibility** - Default behavior must be unchanged
* ❌ **Don't use maxMergeDepth in this task** - Future enhancement, ignore for now
* ❌ **Don't add try-catch around combine()** - Let user errors propagate naturally
* ❌ **Don't create new files** - This task only modifies task.ts (P1.M2.T2.S3 adds utility file)

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Definition of Done**:

1. src/decorators/task.ts implements error aggregation when errorMergeStrategy.enabled === true
2. Custom combine() function is called when provided
3. Default error merger is used when combine() is not provided
4. Merged error is thrown instead of first error when enabled
5. Error event is emitted with merged error
6. Backward compatibility maintained (first error thrown when not enabled)
7. All existing tests pass
8. Zero TypeScript type errors

**Validation**: The implementation enables configurable error aggregation for concurrent workflows while maintaining complete backward compatibility.

---

## Appendix: Complete Code Change Reference

### Exact Change Required (src/decorators/task.ts)

**Add after line 16 (before Task decorator):**

```typescript
// Default error merger for concurrent workflow failures
// This will be extracted to src/utils/error-merger.ts in P1.M2.T2.S3
const defaultErrorMerger = (
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError => {
  // Create merged error message
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

  // Get all unique workflow IDs that failed
  const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

  // Aggregate all logs
  const allLogs = errors.flatMap((e) => e.logs);

  // Create merged WorkflowError
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack,
    state: errors[0]?.state || {} as SerializedWorkflowState,
    logs: allLogs,
  };

  return mergedError;
};
```

**Replace lines 118-120:**

```typescript
// BEFORE:
if (rejected.length > 0) {
  throw rejected[0].reason;
}

// AFTER:
if (rejected.length > 0) {
  // Check if error merge strategy is enabled
  if (opts.errorMergeStrategy?.enabled) {
    // Extract WorkflowError objects from rejected promises
    const errors = rejected.map((r) => r.reason as WorkflowError);

    // Merge errors using custom combine() or default merger
    const mergedError = opts.errorMergeStrategy?.combine
      ? opts.errorMergeStrategy.combine(errors)
      : defaultErrorMerger(errors, taskName, wf.id, runnable.length);

    // Emit error event with merged error
    wf.emitEvent({
      type: 'error',
      node: wf.node,
      error: mergedError,
    });

    // Throw merged error
    throw mergedError;
  }

  // Backward compatibility: throw first error
  throw rejected[0].reason;
}
```

**Diff Summary:**

```diff
+ // Default error merger for concurrent workflow failures
+ const defaultErrorMerger = (...)
+
  if (rejected.length > 0) {
+   // Check if error merge strategy is enabled
+   if (opts.errorMergeStrategy?.enabled) {
+     // Extract WorkflowError objects from rejected promises
+     const errors = rejected.map((r) => r.reason as WorkflowError);
+
+     // Merge errors using custom combine() or default merger
+     const mergedError = opts.errorMergeStrategy?.combine
+       ? opts.errorMergeStrategy.combine(errors)
+       : defaultErrorMerger(errors, taskName, wf.id, runnable.length);
+
+     // Emit error event with merged error
+     wf.emitEvent({
+       type: 'error',
+       node: wf.node,
+       error: mergedError,
+     });
+
+     // Throw merged error
+     throw mergedError;
+   }
+
    // Backward compatibility: throw first error
    throw rejected[0].reason;
  }
```

---

**PRP Status**: ✅ Complete - Ready for Implementation
**Next Task**: P1.M2.T2.S3 - Create default error merger implementation
