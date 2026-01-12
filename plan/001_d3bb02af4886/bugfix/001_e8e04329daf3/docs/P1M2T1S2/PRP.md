# PRP: P1.M2.T1.S2 - Implement Promise.allSettled with Error Collection

**Document Version:** 1.0
**Creation Date:** 2026-01-12
**Target:** Subtask P1.M2.T1.S2 - Replace Promise.all with Promise.allSettled in @Task decorator
**Primary File:** `src/decorators/task.ts` (line 112)

---

## Goal

**Feature Goal**: Replace `Promise.all()` with `Promise.allSettled()` in the @Task decorator's concurrent execution path (src/decorators/task.ts:112) to enable collection of all concurrent workflow errors while maintaining backward compatibility by throwing the first error when no error merge strategy is configured.

**Deliverable**: Updated @Task decorator that:
1. Uses `Promise.allSettled()` instead of `Promise.all()` for concurrent task execution
2. Collects all `PromiseRejectedResult` errors from concurrent workflows
3. Maintains backward compatibility by throwing the first error (fail-fast behavior) when no error merge strategy is configured
4. Preserves all existing event emissions and workflow attachment behaviors

**Success Definition**:
- Line 112 in `src/decorators/task.ts` uses `Promise.allSettled()` instead of `Promise.all()`
- Errors from all failed concurrent workflows are collected into an array
- Backward compatibility is maintained: first error is thrown by default (no behavior change for existing code)
- All existing tests continue to pass without modification
- The change enables P1.M2.T2 (ErrorMergeStrategy implementation) in future work

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location with line number (src/decorators/task.ts:112)
- Complete current implementation code snippet
- Required code changes with before/after comparison
- Type definitions for all interfaces used
- Error handling patterns to follow
- Test patterns for validation
- External research documentation with URLs

### Documentation & References

```yaml
# MUST READ - Current Implementation
- file: src/decorators/task.ts
  lines: 104-114
  why: Contains the Promise.all implementation that must be replaced
  pattern: Concurrent workflow execution with runnable filtering
  gotcha: Promise.all fails fast on first error; Promise.allSettled never rejects

- file: src/decorators/task.ts
  lines: 1-129 (full file)
  why: Complete @Task decorator context including child attachment logic
  pattern: Task decorator wrapper function with event emission

- file: plan/001_d3bb02af4886/bugfix/architecture/promise_all_analysis.md
  why: S1 analysis document with complete Promise.all implementation details
  section: "5. Promise.allSettled Migration Requirements"
  critical: Contains exact migration requirements and code changes needed

- file: plan/001_d3bb02af4886/bugfix/architecture/concurrent_execution_best_practices.md
  why: Internal guidance on Promise.allSettled usage patterns
  section: "Recommended Error Collection Patterns"
  critical: Specifies using Promise.allSettled for complete-all error strategy

# TYPE DEFINITIONS - Required for implementation
- file: src/types/error-strategy.ts
  why: Defines ErrorMergeStrategy interface (future use in P1.M2.T2)
  pattern: Interface with enabled, maxMergeDepth, and combine() function
  note: NOT used in this task - collected errors stored in array for future use

- file: src/types/decorators.ts
  why: Defines TaskOptions interface for @Task decorator configuration
  pattern: Options interface with name and concurrent properties

- file: src/types/error.ts
  why: Defines WorkflowError interface structure for error handling
  pattern: Interface with message, original, workflowId, stack, state, logs

- file: src/types/events.ts
  why: Defines WorkflowEvent type including error events
  pattern: Union type with { type: 'error', node, error }

# EXTERNAL RESEARCH - Promise.allSettled best practices
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
  why: Official documentation for Promise.allSettled() method
  section: #description
  critical: Promise.allSettled NEVER rejects - always resolves with status array

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#promise-types
  why: TypeScript Promise types including PromiseSettledResult
  section: Promise Types
  critical: Type guards required for discriminated unions

- docfile: plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_RESEARCH.md
  why: Comprehensive Promise.allSettled implementation patterns
  section: "2. Promise.allSettled() Error Collection Patterns"
  critical: Type guard patterns, error filtering, aggregation examples

- docfile: plan/001_d3bb02af4886/docs/research/PROMISE_ALLSETTLED_QUICK_REF.md
  why: Quick reference for Promise.allSettled implementation
  section: "Groundswell Implementation"
  critical: Specific code examples for this codebase

# TEST PATTERNS - Follow for validation
- file: src/__tests__/adversarial/edge-case.test.ts
  lines: 366-430
  why: Contains concurrent task execution tests with mixed success/failure
  pattern: Testing concurrent workflows with errors

- file: src/__tests__/adversarial/prd-compliance.test.ts
  lines: 421-460
  why: Tests concurrent execution with multiple child workflows
  pattern: Execution order tracking for verifying concurrency

- file: vitest.config.ts
  why: Test runner configuration
  command: npm test or npm run test:watch

# STEP DECORATOR - Error wrapping context
- file: src/decorators/step.ts
  lines: 109-134
  why: Shows how WorkflowError objects are created and error events emitted
  pattern: Error capture with getObservedState(), event emission
  critical: Each failing workflow already emits error event - don't duplicate
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── decorators/
│   │   ├── index.ts                   # Exports Task decorator
│   │   ├── step.ts                    # @Step decorator with error wrapping (lines 109-134)
│   │   └── task.ts                    # PRIMARY: Promise.all at line 112 - TARGET FILE
│   ├── types/
│   │   ├── index.ts                   # Re-exports all types
│   │   ├── decorators.ts              # TaskOptions interface
│   │   ├── error-strategy.ts          # ErrorMergeStrategy interface (unused in this task)
│   │   ├── error.ts                   # WorkflowError interface
│   │   └── events.ts                  # WorkflowEvent union type
│   ├── utils/
│   │   ├── id.ts                      # ID generation utilities
│   │   ├── index.ts                   # Exports utils
│   │   └── observable.ts              # Observable utilities
│   └── __tests__/
│       ├── adversarial/
│       │   ├── edge-case.test.ts      # Concurrent error tests (lines 366-430)
│       │   ├── prd-compliance.test.ts # Concurrent execution tests (lines 421-460)
│       │   └── deep-analysis.test.ts  # Promise.all usage in tests
│       └── unit/
│           └── decorators.test.ts     # General decorator tests
├── plan/
│   └── 001_d3bb02af4886/
│       ├── bugfix/
│       │   ├── 001_e8e04329daf3/
│       │   │   ├── P1M2T1S1/
│       │   │   │   └── PRP.md         # S1 analysis PRP (completed)
│       │   │   └── P1M2T1S2/
│       │   │       └── PRP.md         # THIS FILE
│       │   └── architecture/
│       │       ├── promise_all_analysis.md           # S1 analysis output
│       │       ├── concurrent_execution_best_practices.md
│       │       └── error_handling_patterns.md
│       └── docs/
│           └── research/
│               ├── PROMISE_ALLSETTLED_RESEARCH.md
│               └── PROMISE_ALLSETTLED_QUICK_REF.md
└── vitest.config.ts                   # Test configuration
```

### Desired Codebase Tree (Changes for This Task)

```bash
# MODIFIED FILES:
src/decorators/task.ts                  # Replace Promise.all with Promise.allSettled at line 112

# NO NEW FILES for this task
# Type utilities will be added in P1.M2.T2.S1 (ErrorMergeStrategy support)
# This task only replaces Promise.all with Promise.allSettled
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL GOTCHA #1: Promise.allSettled NEVER rejects
// Unlike Promise.all which rejects on first error, Promise.allSettled ALWAYS resolves
// You MUST manually check for errors in the results array
// BAD: try { await Promise.allSettled(...) } catch (e) { /* NEVER EXECUTES */ }
// GOOD: const results = await Promise.allSettled(...);
//       const errors = results.filter(r => r.status === 'rejected');
//       if (errors.length > 0) throw errors[0].reason;

// CRITICAL GOTCHA #2: Type guards REQUIRED for TypeScript
// PromiseSettledResult is a discriminated union
// BAD: results.forEach(r => { if (r.status === 'fulfilled') console.log(r.value); });
//     TypeScript error: Property 'value' does not exist on type 'PromiseSettledResult<unknown>'
// GOOD: const isFulfilled = <T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> =>
//         r.status === 'fulfilled';
//       results.filter(isFulfilled).forEach(r => console.log(r.value));

// CRITICAL GOTCHA #3: Child attachment happens BEFORE concurrent execution
// Lines 91-102: children are attached before Promise.allSettled runs
// Parent-child relationships exist regardless of execution success
// Failed workflows remain attached to parent

// CRITICAL GOTCHA #4: Error events already emitted by @Step decorator
// src/decorators/step.ts:126-130 emits error events for each failed workflow
// DO NOT emit additional error events in @Task decorator
// Observers already see individual workflow errors

// CRITICAL GOTCHA #5: WorkflowError.original is `unknown`, not `Error`
// When collecting errors, don't assume Error interface
// BAD: errors.forEach(e => console.log(e.original.stack));
// GOOD: if (error.original instanceof Error) console.log(error.original.stack);

// CRITICAL GOTCHA #6: Backward compatibility REQUIRED
// Default behavior must remain fail-fast (throw first error)
// Only collect errors for future P1.M2.T2 (ErrorMergeStrategy) use
// DO NOT change behavior of existing code

// CRITICAL GOTCHA #7: Runnable filter uses type guard pattern
// The filter (w): w is WorkflowClass narrows type in filter callback
// After filtering, runnable items have run() method guaranteed

// CRITICAL GOTCHA #8: No duplicate prevention in runnable filter
// Same workflow instance could appear twice if returned twice
// Not our concern - user code responsibility
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models for this task** - this task only replaces Promise.all with Promise.allSettled.

**Type guards needed (inline in task.ts for now, extracted to utils in P1.M2.T2.S1):**

```typescript
// Type guard for PromiseRejectedResult
const isRejected = (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult =>
  result.status === 'rejected';
```

**Note:** Full utility file `src/utils/promise-utils.ts` will be created in P1.M2.T2.S1 when implementing ErrorMergeStrategy support.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/decorators/task.ts - Import type for Promise.allSettled
  - ADD: No new imports needed - Promise.allSettled is built-in
  - UNDERSTAND: PromiseSettledResult<T>, PromiseFulfilledResult<T>, PromiseRejectedResult are global types
  - DEPENDENCIES: None

Task 2: MODIFY src/decorators/task.ts - Replace Promise.all with Promise.allSettled (lines 111-113)
  - CURRENT CODE:
    await Promise.all(runnable.map((w) => w.run()));

  - REPLACE WITH:
    const results = await Promise.allSettled(runnable.map((w) => w.run()));

  - DEPENDENCIES: Task 1

Task 3: MODIFY src/decorators/task.ts - Add error collection after Promise.allSettled (after line 112)
  - ADD: Filter for rejected results
  - ADD: Extract error reasons from rejected promises
  - ADD: Throw first error for backward compatibility

  - IMPLEMENTATION:
    // Filter for rejected results
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    // Throw first error for backward compatibility (fail-fast behavior)
    if (rejected.length > 0) {
      throw rejected[0].reason;
    }

  - DEPENDENCIES: Task 2

Task 4: VERIFY existing tests still pass
  - RUN: npm test
  - VERIFY: All existing tests pass without modification
  - VERIFY: Backward compatibility maintained (first error thrown)
  - DEPENDENCIES: Task 3

Task 5: RUN specific concurrent execution tests
  - RUN: npm test -- src/__tests__/adversarial/edge-case.test.ts
  - RUN: npm test -- src/__tests__/adversarial/prd-compliance.test.ts
  - VERIFY: Concurrent execution tests still pass
  - DEPENDENCIES: Task 4

Task 6: (OPTIONAL) Add inline comment for future P1.M2.T2 enhancement
  - ADD: Comment indicating collected errors are available for future aggregation
  - FORMAT: // P1.M2.T2: Collected errors available for ErrorMergeStrategy implementation
  - DEPENDENCIES: Task 3
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Promise.allSettled with Error Collection
// Location: src/decorators/task.ts lines 111-120
// ============================================

// BEFORE (current):
if (runnable.length > 0) {
  await Promise.all(runnable.map((w) => w.run()));
}

// AFTER (target):
if (runnable.length > 0) {
  // Use Promise.allSettled to collect all results (success and failure)
  const results = await Promise.allSettled(runnable.map((w) => w.run()));

  // Filter for rejected promises
  const rejected = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected'
  );

  // Throw first error for backward compatibility (fail-fast behavior)
  // P1.M2.T2: All collected errors available via rejected array for ErrorMergeStrategy
  if (rejected.length > 0) {
    throw rejected[0].reason;
  }
}

// KEY INSIGHTS:
// - Promise.allSettled returns PromiseSettledResult<unknown>[] (never rejects)
// - Type guard (r): r is PromiseRejectedResult narrows type for filter
// - Throwing first reason maintains exact same behavior as Promise.all
// - rejected array preserved for future P1.M2.T2 error aggregation
// - No other behavior changes: events already emitted, children already attached

// ============================================
// PATTERN 2: Type Guard for PromiseRejectedResult
// Location: src/decorators/task.ts inline (extracted to utils in P1.M2.T2)
// ============================================

// Inline type guard (used in this task):
const rejected = results.filter(
  (r): r is PromiseRejectedResult => r.status === 'rejected'
);

// Type predicate syntax: (r): r is PromiseRejectedResult
// - Tells TypeScript that filtered results are always PromiseRejectedResult
// - Enables accessing .reason property without type error
// - Equivalent to explicit type guard function:
//   const isRejected = (r: PromiseSettledResult<unknown>): r is PromiseRejectedResult =>
//     r.status === 'rejected';

// ============================================
// PATTERN 3: Backward Compatibility Strategy
// Location: src/decorators/task.ts after Promise.allSettled
// ============================================

// CRITICAL: Must maintain exact same error propagation behavior
// Promise.all behavior: Rejects with first error reason
// Our implementation: Throw first rejected reason

if (rejected.length > 0) {
  throw rejected[0].reason;  // First error wins (same as Promise.all)
}

// WHY THIS WORKS:
// - Promise.all: first rejection causes immediate reject, reason is the error
// - Our code: await allSettled completes, then throw first reason
// - Result: Parent receives same error, same timing (approximately)
// - Difference: All workflows complete instead of being "orphaned"
//   - This is actually BETTER behavior (no zombie workflows)

// ============================================
// PATTERN 4: Error Context (Already Captured)
// Location: src/decorators/step.ts lines 109-134
// ============================================

// NOTE: Error wrapping already happens in @Step decorator
// Each workflow that throws has error already wrapped in WorkflowError

// In @Step decorator (step.ts:126-130):
wf.emitEvent({
  type: 'error',
  node: wf.node,
  error: workflowError,  // WorkflowError with full context
});

// IMPLICATION FOR @Task:
// - rejected[0].reason is already a WorkflowError object
// - Contains: message, original, workflowId, stack, state, logs
// - No need to wrap or transform errors
// - Error events already emitted to observers
// - Just throw the first WorkflowError as-is

// ============================================
// PATTERN 5: PromiseSettledResult Type Structure
// Built-in TypeScript types
// ============================================

// PromiseFulfilledResult<T>:
interface PromiseFulfilledResult<T> {
  status: 'fulfilled';
  value: T;
}

// PromiseRejectedResult:
interface PromiseRejectedResult {
  status: 'rejected';
  reason: unknown;  // The error/rejection reason
}

// PromiseSettledResult<T> (union type):
type PromiseSettledResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult;

// DISCRIMINATED UNION:
// - Check .status property to narrow type
// - 'fulfilled' -> has .value property
// - 'rejected' -> has .reason property
// - Type guards required for TypeScript to understand this

// Example: Accessing properties safely
results.forEach(result => {
  if (result.status === 'fulfilled') {
    console.log(result.value);  // OK: TypeScript knows this is fulfilled
  } else {
    console.log(result.reason); // OK: TypeScript knows this is rejected
  }
});
```

### Integration Points

```yaml
# No integration point changes for this task
# Promise.allSettled is a drop-in replacement for Promise.all
# No API changes, no type changes, no configuration changes

FUTURE_INTEGRATIONS (P1.M2.T2 - ErrorMergeStrategy):
  - modify: src/types/decorators.ts
    add: errorMergeStrategy?: ErrorMergeStrategy

  - modify: src/decorators/task.ts
    use: rejected array from this task for error aggregation
    pattern: if (opts.errorMergeStrategy?.enabled) { /* aggregate */ }

  - create: src/utils/promise-utils.ts
    add: Type guard functions isFulfilled, isRejected, isWorkflowError
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying src/decorators/task.ts, run these checks

# TypeScript type checking
npx tsc --noEmit src/decorators/task.ts

# Run full type check on project
npm run type-check  # or equivalent command

# Expected: Zero type errors
# Common error to fix: TypeScript complaining about .reason access
# Solution: Ensure type guard (r): r is PromiseRejectedResult is correct
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all existing tests to verify backward compatibility
npm test

# Run specific concurrent execution tests
npm test -- src/__tests__/adversarial/edge-case.test.ts
npm test -- src/__tests__/adversarial/prd-compliance.test.ts

# Run decorator-specific tests
npm test -- src/__tests__/unit/decorators.test.ts

# Expected: All tests pass without modification
# If tests fail, debug - should maintain exact same behavior
```

### Level 3: Integration Testing (System Validation)

```bash
# Create quick manual test to verify Promise.allSettled behavior
cat > test_concurrent_errors.js << 'EOF'
// Quick manual test for concurrent error collection
import { Workflow, Task, Step } from './src/index.js';

class FailingWorkflow extends Workflow {
  @Step()
  async run() {
    throw new Error(`Intentional failure in ${this.node.name}`);
  }
}

class SuccessWorkflow extends Workflow {
  @Step()
  async run() {
    return `Success from ${this.node.name}`;
  }
}

class ParentWorkflow extends Workflow {
  @Task({ concurrent: true })
  async spawnMixed() {
    return [
      new SuccessWorkflow('Good1', this),
      new FailingWorkflow('Bad1', this),
      new SuccessWorkflow('Good2', this),
      new FailingWorkflow('Bad2', this),
    ];
  }

  async run() {
    return this.spawnMixed();
  }
}

async function test() {
  const workflow = new ParentWorkflow('TestParent');
  try {
    await workflow.run();
  } catch (error) {
    console.log('Caught error (expected):', error.message);
    console.log('Error workflowId:', error.workflowId);
    console.log('Children attached:', workflow.children.length);

    // Verify: All workflows completed and attached
    // Verify: First error thrown (Bad1 or Bad2, non-deterministic which)
  }
}

test();
EOF

node test_concurrent_errors.js

# Expected behavior:
# - All 4 child workflows complete execution
# - All 4 children attached to parent
# - First error thrown (either Bad1 or Bad2)
# - Error is WorkflowError with full context

# Clean up test file
rm test_concurrent_errors.js
```

### Level 4: Manual Code Review

```bash
# Review the changes made to src/decorators/task.ts

# Key verification points:
grep -A 10 "Promise.allSettled" src/decorators/task.ts

# Should show:
# 1. Promise.allSettled replaces Promise.all
# 2. Results filtered for 'rejected' status
# 3. First error thrown for backward compatibility

# Verify no other changes
git diff src/decorators/task.ts

# Expected: Only lines 111-120 changed, no other modifications
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Promise.all replaced with Promise.allSettled at line 112
- [ ] Error collection filters for PromiseRejectedResult
- [ ] Type guard (r): r is PromiseRejectedResult used correctly
- [ ] First error thrown for backward compatibility
- [ ] No type errors: `npm run type-check` passes
- [ ] All existing tests pass: `npm test` passes
- [ ] Concurrent execution tests pass: edge-case.test.ts, prd-compliance.test.ts

### Backward Compatibility Validation

- [ ] First error thrown maintains fail-fast behavior
- [ ] Error is same WorkflowError object (no wrapping/transformation)
- [ ] Error events still emitted by @Step decorator (no duplication)
- [ ] Child attachment happens before execution (unchanged)
- [ ] Task start/end events still emitted (unchanged)
- [ ] No changes to TaskOptions interface (no new options yet)

### Code Quality Validation

- [ ] Follows existing code patterns (indentation, naming, style)
- [ ] Inline comment added for future P1.M2.T2 enhancement
- [ ] No unused variables or dead code
- [ ] No console.log or debug statements left in
- [ ] Error handling is specific (throwing exact error, not new wrapper)

### Documentation & Future-Proofing

- [ ] Comment indicates rejected array available for P1.M2.T2
- [ ] No breaking changes to public API
- [ ] Code is self-documenting with clear variable names
- [ ] Type guards are clear and correct

---

## Anti-Patterns to Avoid

- ❌ **Don't add try-catch around Promise.allSettled** - It never rejects, catching won't work
- ❌ **Don't skip the type guard** - TypeScript won't know .reason exists without type predicate
- ❌ **Don't wrap the error** - Throw rejected[0].reason as-is, it's already WorkflowError
- ❌ **Don't emit error events** - @Step decorator already emits them, don't duplicate
- ❌ **Don't change TaskOptions** - That's P1.M2.T2, this task is internal change only
- ❌ **Don't throw AggregateError** - Maintain fail-fast by throwing first error
- ❌ **Don't access .value or .reason without type check** - Use type guard first
- ❌ **Don't assume Error interface** - rejected[0].reason is WorkflowError (check with instanceof if needed)
- ❌ **Don't create new files** - This task only modifies existing task.ts
- ❌ **Don't write new tests** - Existing tests should pass, new tests in P1.M2.T1.S3

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Definition of Done**:
1. src/decorators/task.ts line 112 uses Promise.allSettled instead of Promise.all
2. Errors from all failed concurrent workflows are collected (via rejected array)
3. Backward compatibility maintained: first error still thrown
4. All existing tests pass without modification
5. Zero TypeScript type errors
6. No changes to public API or TaskOptions interface

**Validation**: The implementation enables P1.M2.T2 (ErrorMergeStrategy) by providing collected errors while maintaining complete backward compatibility with existing code.

---

## Appendix: Complete Code Change Reference

### Exact Change Required (src/decorators/task.ts)

**Lines 111-113 (BEFORE):**
```typescript
if (runnable.length > 0) {
  await Promise.all(runnable.map((w) => w.run()));
}
```

**Lines 111-120 (AFTER):**
```typescript
if (runnable.length > 0) {
  const results = await Promise.allSettled(runnable.map((w) => w.run()));

  const rejected = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected'
  );

  if (rejected.length > 0) {
    throw rejected[0].reason;
  }
}
```

**Diff:**
```diff
 if (runnable.length > 0) {
-  await Promise.all(runnable.map((w) => w.run()));
+  const results = await Promise.allSettled(runnable.map((w) => w.run()));
+
+  const rejected = results.filter(
+    (r): r is PromiseRejectedResult => r.status === 'rejected'
+  );
+
+  if (rejected.length > 0) {
+    throw rejected[0].reason;
+  }
 }
```

---

**PRP Status**: ✅ Complete - Ready for Implementation
**Next Task**: P1.M2.T1.S3 - Add tests for concurrent task failure scenarios
