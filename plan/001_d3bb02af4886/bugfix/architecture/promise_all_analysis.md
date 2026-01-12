# Promise.all Implementation Analysis for @Task Decorator

**Document Version:** 1.0
**Analysis Date:** 2026-01-12
**Target Implementation Task:** P1.M2.T1.S2 (Promise.allSettled Migration)
**Primary File:** `src/decorators/task.ts` (lines 104-114)

---

## 1. Current Implementation Overview

### 1.1 Promise.all Execution Code

**Location:** `src/decorators/task.ts:104-114`

```typescript
// If concurrent option is set and we have multiple workflows, run them in parallel
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(
    (w): w is WorkflowClass =>
      w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
  );

  if (runnable.length > 0) {
    await Promise.all(runnable.map((w) => w.run()));  // ← CRITICAL: Line 112
  }
}
```

### 1.2 Context: Full @Task Decorator Structure

**Location:** `src/decorators/task.ts:1-129`

The @Task decorator performs three main operations:

1. **Child Attachment** (lines 91-102): Attaches returned workflows as children
2. **Concurrent Execution** (lines 104-114): Runs workflows in parallel when `concurrent: true`
3. **Event Emission** (lines 79-83, 117-121): Emits taskStart/taskEnd events

**CRITICAL:** Child attachment happens BEFORE concurrent execution, establishing parent-child relationships regardless of execution success.

### 1.3 Local Type Definitions

**Location:** `src/decorators/task.ts:4-16`

```typescript
// Type for workflow-like objects
interface WorkflowLike {
  id: string;
  node: WorkflowNode;
  emitEvent(event: WorkflowEvent): void;
  attachChild(child: WorkflowLike): void;
}

// Minimal Workflow type for checking if something is a workflow
interface WorkflowClass {
  id: string;
  parent: WorkflowLike | null;
  run(...args: unknown[]): Promise<unknown>;
}
```

**NOTE:** These are local to the task.ts file - not exported from the types module.

---

## 2. Runnable Workflow Filtering Logic

### 2.1 Type Guard Implementation

**Location:** `src/decorators/task.ts:106-109`

```typescript
const runnable = workflows.filter(
  (w): w is WorkflowClass =>
    w && typeof w === 'object' && 'run' in w && typeof w.run === 'function'
);
```

### 2.2 Type Predicate Explanation

The `(w): w is WorkflowClass` syntax is a **TypeScript Type Predicate** (Type Guard):

| Check | Purpose |
|-------|---------|
| `w` | Truthiness check - filters out null/undefined |
| `typeof w === 'object'` | Ensures w is an object (not string, number, etc.) |
| `'run' in w` | Checks if 'run' property exists on object |
| `typeof w.run === 'function'` | Verifies run is callable |

### 2.3 What Gets Included/Excluded

**Included in runnable:**
- Workflow instances (with `run()` method)
- Plain objects with a `run()` method (duck typing)
- Workflow-like objects satisfying the type guard

**Excluded from runnable:**
- `null` and `undefined`
- Primitive values (strings, numbers, booleans)
- Objects without a `run()` method
- Objects with `run` property that isn't a function

### 2.4 Critical Gotchas

**Gotcha #1: No duplicate prevention**
- The filter does NOT check if a workflow is already running
- Same workflow instance could theoretically be executed twice
- Relies on user code to not return duplicates

**Gotcha #2: No running state check**
- Does NOT verify workflow's current execution status
- Would attempt to run an already-running workflow if present
- No safeguard against race conditions in user code

**Gotcha #3: Non-workflow return values silently skipped**
- Worksflows are filtered out without warning
- Original return value is preserved (line 123)
- Lenient validation allows flexible signatures

---

## 3. Error Propagation Flow (Step-by-Step)

### 3.1 Complete Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ERROR PROPAGATION FLOW                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ 1. @Step Method Throws Error                                                │
│    ↓                                                                        │
│    Location: Any @Step decorated method                                     │
│    Action: Method throws Error or rejects Promise                            │
│                                                                              │
│ 2. @Step Decorator Catch Block                                              │
│    ↓                                                                        │
│    Location: src/decorators/step.ts:109-134                                 │
│    Action:                                                                   │
│      - Captures error state via getObservedState(this)                      │
│      - Creates WorkflowError object with full context:                      │
│        * message: error?.message ?? 'Unknown error'                         │
│        * original: err (preserves original thrown error)                    │
│        * workflowId: wf.id                                                  │
│        * stack: error?.stack                                                │
│        * state: snap (observed state snapshot)                              │
│        * logs: [...wf.node.logs] (copies current logs)                      │
│      - Emits error event: { type: 'error', node: wf.node, error: ... }     │
│      - Re-throws WorkflowError                                              │
│                                                                              │
│ 3. Workflow.run() Method                                                    │
│    ↓                                                                        │
│    Location: src/core/workflow.ts                                           │
│    Action: Error propagates naturally through call stack                    │
│    NOTE: No automatic catching in run() - error passes through              │
│                                                                              │
│ 4. Promise.all in @Task Decorator                                           │
│    ↓                                                                        │
│    Location: src/decorators/task.ts:112                                     │
│    Action:                                                                   │
│      - await Promise.all(runnable.map((w) => w.run()))                      │
│      - FIRST ERROR WINS - immediately rejects on first rejection            │
│      - Other in-flight promises continue but results are LOST               │
│      - Parent workflow only receives FIRST error                            │
│                                                                              │
│ 5. Workflow.runFunctional() Error Handler                                   │
│    ↓                                                                        │
│    Location: src/core/workflow.ts:470-488                                   │
│    Action:                                                                   │
│      - Catches error in functional workflow executor                        │
│      - Sets status to 'failed'                                              │
│      - Emits error event with WorkflowError context                         │
│      - Re-throws original error                                             │
│                                                                              │
│ 6. Parent Workflow or Root Handler                                          │
│    ↓                                                                        │
│    Action:                                                                   │
│      - Parent may catch for custom handling                                 │
│      - Otherwise propagates to root                                         │
│      - Application-level error handling takes over                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 WorkflowError Interface Structure

**Location:** `src/types/error.ts:7-20`

```typescript
export interface WorkflowError {
  message: string;           // Error message from thrown error
  original: unknown;         // Original thrown error (preserved)
  workflowId: string;        // ID of workflow where error occurred
  stack?: string;            // Stack trace if available
  state: SerializedWorkflowState;  // State snapshot at error time
  logs: LogEntry[];          // Logs from the failing workflow node
}
```

**Key Characteristic:** Interface-based (not a class), allowing flexible error object creation while ensuring complete context capture.

### 3.3 Error Context Capture Points

| Context | Where Captured | How |
|---------|----------------|-----|
| Error message | step.ts:117 | `error?.message ?? 'Unknown error'` |
| Original error | step.ts:118 | Preserved as `original: err` |
| Workflow ID | step.ts:119 | `wf.id` from workflow instance |
| Stack trace | step.ts:120 | `error?.stack` if Error instance |
| State snapshot | step.ts:114, 121 | `getObservedState(this as object)` |
| Logs | step.ts:122 | `[...wf.node.logs]` (copied) |

---

## 4. Concurrent Failure Behavior Analysis

### 4.1 What Happens When ONE Concurrent Workflow Fails

**Scenario:** Two concurrent workflows, one fails

```typescript
class GoodChild extends Workflow {
  async run() {
    return 'good';  // Succeeds
  }
}

class BadChild extends Workflow {
  @Step()
  async run() {
    throw new Error('Bad child error');  // Fails
  }
}

class ParentWorkflow extends Workflow {
  @Task({ concurrent: true })
  async spawnMixed() {
    return [
      new GoodChild('Good', this),
      new BadChild('Bad', this),
    ];
  }
}
```

**Execution Timeline:**

```
Time T0: Promise.all([
           run(GoodChild) → Promise<pending>,
           run(BadChild)  → Promise<pending>
         ])

Time T1: BadChild @Step throws error
         → Wrapped as WorkflowError
         → Promise.all REJECTS IMMEDIATELY
         → GoodChild result LOST

Time T2: Parent receives WorkflowError from BadChild
         → No knowledge of GoodChild result
         → No knowledge that GoodChild succeeded
```

### 4.2 What Happens to OTHER Concurrent Workflows

**CRITICAL BEHAVIOR:** When one workflow fails:

1. **Promise.all rejects immediately** - No waiting for other promises
2. **In-flight workflows continue executing** - They're not cancelled
3. **Results from other workflows are LOST** - Never captured
4. **Parent only sees first error** - No error aggregation

### 4.3 Can Parent See ALL Errors?

**Answer:** NO - Parent only sees the FIRST error that causes Promise.all to reject.

**Evidence from test code:**

**Location:** `src/__tests__/adversarial/edge-case.test.ts:366-403`

```typescript
it('should handle concurrent task execution with errors', async () => {
  // Test shows mixed success/failure in concurrent execution
  // Both children are attached (line 402: expect(workflow.children.length).toBe(2))
  // But error handling only catches first error
});
```

### 4.4 Current Error Semantics

| Aspect | Behavior |
|--------|----------|
| Fail-fast | YES - Immediate rejection on first error |
| Error aggregation | NO - Only first error visible |
| Partial results | NO - Success results are lost |
| Error context | FULL - WorkflowError captures complete context |
| Race condition preservation | YES - Whichever error arrives first wins |

---

## 5. Promise.allSettled Migration Requirements

### 5.1 Core Code Changes Required

#### Change 1: Replace Promise.all with Promise.allSettled

**Current (src/decorators/task.ts:112):**
```typescript
await Promise.all(runnable.map((w) => w.run()));
```

**Required:**
```typescript
const results = await Promise.allSettled(runnable.map((w) => w.run()));
```

#### Change 2: Add Error Strategy Configuration

**Location:** `src/types/decorators.ts` (TaskOptions interface)

**Current:**
```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;
}
```

**Required:**
```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;
  errorStrategy?: 'fail-fast' | 'complete-all';  // NEW
}
```

**ALTERNATIVE:** Use existing ErrorMergeStrategy interface

```typescript
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;
  errorMergeStrategy?: ErrorMergeStrategy;  // Use existing type
}
```

### 5.2 Type Guard Requirements

**Need to create:** Type guards for PromiseSettledResult

**Location:** `src/utils/promise-utils.ts` (NEW FILE)

```typescript
import type { WorkflowError } from '../types/error.js';

// Type guard for fulfilled results
export function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

// Type guard for rejected results
export function isRejected(result: PromiseSettledResult<unknown>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Check if result is WorkflowError
export function isWorkflowError(error: unknown): error is WorkflowError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'workflowId' in error &&
    'state' in error &&
    'logs' in error
  );
}
```

### 5.3 Error Aggregation Pattern Requirements

**Required:** Logic to collect and process errors from Promise.allSettled results

```typescript
// After Promise.allSettled, separate successes and failures
const errors = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map((r) => r.reason as WorkflowError);

// If there are errors and we're in complete-all mode
if (errors.length > 0 && opts.errorStrategy === 'complete-all') {
  // Aggregate errors
  const mergedError: WorkflowError = {
    message: `${errors.length} concurrent workflows failed`,
    original: errors.map(e => e.original),
    workflowId: wf.id,
    stack: errors.map(e => e.stack).filter(Boolean).join('\n---\n'),
    state: getObservedState(this),
    logs: errors.flatMap(e => e.logs),
  };

  // Emit aggregated error
  wf.emitEvent({
    type: 'error',
    node: wf.node,
    error: mergedError,
  });

  throw mergedError;
}

// Otherwise, if fail-fast mode, throw first error
if (errors.length > 0) {
  throw errors[0];
}
```

### 5.4 Backward Compatibility Requirements

**CRITICAL:** Must preserve existing behavior when `errorStrategy` is not specified:

| Configuration | Behavior |
|---------------|----------|
| No errorStrategy | Fail-fast (current Promise.all behavior) |
| errorStrategy: 'fail-fast' | Fail-fast (Promise.all semantics) |
| errorStrategy: 'complete-all' | Wait for all, aggregate errors |

**Implementation approach:**
```typescript
if (opts.concurrent && Array.isArray(result)) {
  const runnable = workflows.filter(/* ... */);

  if (runnable.length > 0) {
    if (opts.errorStrategy === 'complete-all') {
      // New behavior: Promise.allSettled with error aggregation
      const results = await Promise.allSettled(runnable.map((w) => w.run()));
      // ... error aggregation logic
    } else {
      // Default: maintain current Promise.all behavior
      await Promise.all(runnable.map((w) => w.run()));
    }
  }
}
```

### 5.5 Integration with Existing ErrorMergeStrategy

**Location:** `src/types/error-strategy.ts`

**Current State:** Interface exists but is completely unused

```typescript
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

**Migration Decision Point:**

**Option A:** Create new `errorStrategy?: 'fail-fast' | 'complete-all'` option
- Pro: Simpler, more explicit
- Pro: Easier to understand for users
- Con: Doesn't leverage existing ErrorMergeStrategy interface

**Option B:** Add `errorMergeStrategy?: ErrorMergeStrategy` to TaskOptions
- Pro: Leverages existing design intent
- Pro: Supports custom combine() functions
- Pro: More flexible for advanced use cases
- Con: More complex configuration

**RECOMMENDATION for P1.M2.T1.S2:** Use Option A initially, can add Option B as enhancement

### 5.6 File Structure Changes

**New File to Create:**
```
src/utils/promise-utils.ts
```

**Files to Modify:**
1. `src/types/decorators.ts` - Add errorStrategy option
2. `src/decorators/task.ts` - Implement Promise.allSettled logic
3. `src/utils/index.ts` - Export new promise utilities (if created)

---

## 6. Edge Cases and Gotchas

### 6.1 Promise.allSettled Gotchas

#### Gotcha #1: Promise.allSettled Never Rejects

**CRITICAL:** Unlike Promise.all, Promise.allSettled ALWAYS resolves

```typescript
// This NEVER throws
const results = await Promise.allSettled([runnable1, runnable2]);

// You MUST check for errors manually
const errors = results.filter(r => r.status === 'rejected');
if (errors.length > 0) {
  throw errors[0].reason;  // Manual error propagation
}
```

#### Gotcha #2: Type Narrowing Required

**Without type guards, TypeScript doesn't know result types:**

```typescript
// ❌ BAD: Type error
results.forEach(r => {
  if (r.status === 'fulfilled') {
    console.log(r.value);  // Error: Property 'value' does not exist
  }
});

// ✅ GOOD: With type guard
const isFulfilled = <T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> =>
  r.status === 'fulfilled';

results.forEach(r => {
  if (isFulfilled(r)) {
    console.log(r.value);  // OK: Type narrowed
  }
});
```

#### Gotcha #3: Order is Preserved But Results Aren't

**Promise.allSettled preserves array order, but workflow completion order is non-deterministic:**

```typescript
const workflows = [wf1, wf2, wf3];
const results = await Promise.allSettled(workflows.map(w => w.run()));

// results[0] always corresponds to wf1
// results[1] always corresponds to wf2
// results[2] always corresponds to wf3

// But wf2 might complete BEFORE wf1 - order of completion != order of results
```

### 6.2 Child Attachment Gotchas

#### Gotcha #4: Children Attach BEFORE Execution

**Location:** `src/decorators/task.ts:91-102`

**CRITICAL:** Parent-child relationship is established BEFORE concurrent execution:

```typescript
// Step 1: Attach children (lines 91-102)
for (const workflow of workflows) {
  if (workflow && typeof workflow === 'object' && 'id' in workflow) {
    const childWf = workflow as WorkflowClass;
    if (!childWf.parent) {
      childWf.parent = wf;
      wf.attachChild(childWf as unknown as WorkflowLike);
    }
  }
}

// Step 2: Run concurrently (lines 104-114)
if (opts.concurrent && Array.isArray(result)) {
  // Children already attached at this point
  await Promise.all(runnable.map((w) => w.run()));
}
```

**Implication:** Failed workflows remain attached to parent even after errors.

### 6.3 Runnable Filter Gotchas

#### Gotcha #5: No Duplicate Prevention

**The runnable filter does NOT prevent duplicate workflow execution:**

```typescript
@Task({ concurrent: true })
async spawnDuplicate() {
  const child = new ChildWorkflow('same', this);
  return [child, child];  // Same workflow twice
}

// Result: child.run() is called twice
// Potential: Race conditions, duplicate side effects
```

#### Gotcha #6: Non-Workflow Returns Are Silently Skipped

**Lenient validation allows flexible signatures:**

```typescript
@Task()
async mixedReturn() {
  return [
    new ChildWorkflow('child1', this),  // Attached & run
    'some string',                       // Silently skipped
    42,                                  // Silently skipped
    null,                                // Silently skipped
    new ChildWorkflow('child2', this),  // Attached & run
  ];
}

// Original return value preserved (line 123)
// Only workflow-like objects are filtered for execution
```

### 6.4 Error Context Gotchas

#### Gotcha #7: WorkflowError May Contain Non-Error Objects

**The `original` property is `unknown`, not `Error`:**

```typescript
export interface WorkflowError {
  original: unknown;  // Could be anything thrown
}
```

**Implication:** When aggregating errors, don't assume Error interface:

```typescript
// ❌ BAD: Assumes Error interface
errors.forEach(e => {
  console.log(e.original.stack);  // Error if original isn't Error
});

// ✅ GOOD: Type guard first
if (error.original instanceof Error) {
  console.log(error.original.stack);
}
```

### 6.5 Event Emission Gotchas

#### Gotcha #8: Error Events Emitted Per Workflow

**Each failing workflow emits its own error event:**

```typescript
// In @Step decorator (step.ts:126-130)
wf.emitEvent({
  type: 'error',
  node: wf.node,
  error: workflowError,
});
```

**Implication:** With Promise.allSettled, observers see multiple error events for concurrent failures.

**Migration consideration:** May want to emit aggregated error event after collection.

### 6.6 Testing Gotchas

#### Gotcha #9: Concurrent Execution Order is Non-Deterministic

**From test file (`src/__tests__/adversarial/prd-compliance.test.ts:421-460`):**

```typescript
it('should run workflows concurrently when concurrent: true', async () => {
  // Test comment acknowledges non-deterministic order:
  // "With concurrent execution, we can't guarantee order, but all should be present"
  expect(executionOrder).toContain('Child1');
  expect(executionOrder).toContain('Child2');
  expect(executionOrder).toContain('Child3');
});
```

**Implication:** Tests cannot assume specific execution order with concurrent workflows.

---

## 7. Cross-References to Existing Research

### 7.1 Related Documents

| Document | Location | Relevance |
|----------|----------|-----------|
| Error Handling Patterns | `plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md` | Documents Promise.all location and ErrorMergeStrategy |
| Promise.allSettled Research | `plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md` | Comprehensive best practices and migration strategies |
| Promise.allSettled Quick Ref | `plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_QUICK_REF.md` | Quick reference for implementation |

### 7.2 Related Code Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/decorators/task.ts` | 104-114 | Promise.all implementation (primary target) |
| `src/decorators/step.ts` | 109-134 | Error wrapping and WorkflowError creation |
| `src/core/workflow.ts` | 470-488 | runFunctional error handling |
| `src/types/error-strategy.ts` | All | ErrorMergeStrategy interface (currently unused) |
| `src/types/error.ts` | All | WorkflowError interface definition |
| `src/types/decorators.ts` | All | TaskOptions interface (needs extension) |

### 7.3 Related Test Files

| File | Lines | Test Coverage |
|------|-------|---------------|
| `src/__tests__/adversarial/edge-case.test.ts` | 366-403 | Concurrent execution with errors |
| `src/__tests__/adversarial/prd-compliance.test.ts` | 421-460 | Concurrent execution order |
| `src/__tests__/adversarial/deep-analysis.test.ts` | 473 | Promise.all in test code |

---

## 8. Summary for P1.M2.T1.S2 Implementation

### 8.1 Key Findings

1. **Promise.all fails fast** - Only first error is visible to parent
2. **Child attachment is separate** - Happens before execution, regardless of success
3. **Error context is complete** - WorkflowError captures all needed information
4. **ErrorMergeStrategy exists but unused** - Requires Promise.allSettled to function
5. **Type guards are required** - PromiseSettledResult needs type narrowing

### 8.2 Implementation Checklist for P1.M2.T1.S2

- [ ] Add `errorStrategy?: 'fail-fast' | 'complete-all'` to TaskOptions
- [ ] Create type guards in `src/utils/promise-utils.ts`
- [ ] Replace Promise.all with conditional Promise.allSettled logic
- [ ] Implement error aggregation for 'complete-all' mode
- [ ] Ensure backward compatibility (default = fail-fast)
- [ ] Add tests for both error strategies
- [ ] Update documentation and examples

### 8.3 Critical Success Factors

1. **Maintain backward compatibility** - Default behavior must remain unchanged
2. **Type safety** - Use proper type guards for PromiseSettledResult
3. **Complete error context** - Aggregate errors must preserve WorkflowError structure
4. **Clear semantics** - 'fail-fast' vs 'complete-all' should be unambiguous
5. **Test coverage** - Cover mixed success/failure scenarios

---

**Document Status:** ✅ Complete - Ready for P1.M2.T1.S2 Implementation

**Next Step:** Proceed to P1.M2.T1.S2 - Implement Promise.allSettled migration with error aggregation
