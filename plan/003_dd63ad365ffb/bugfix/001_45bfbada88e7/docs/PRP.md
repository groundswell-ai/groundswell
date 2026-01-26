# PRP: Modify Step Decorator to Implement Retry Loop

---

## Goal

**Feature Goal**: Implement retry loop logic in the `@Step` decorator to automatically retry failed steps based on configuration options, emitting retry events and preserving error context throughout the retry process.

**Deliverable**: Modified `src/decorators/step.ts` with:
- Retry loop wrapping existing try-catch logic
- `stepRetry` event emission on each retry attempt
- Delay between retries using configurable `retryDelayMs`
- Support for `restartable`, `maxRetries`, `retryDelayMs`, and `retryOn` options
- Proper error context preservation across retry attempts

**Success Definition**:
1. Retry loop wraps existing error handling in while loop checking `retryCount <= maxRetries`
2. On error, checks `opts.restartable` - if false or max retries exceeded, throws WorkflowError immediately
3. If restartable and under max retries, emits `stepRetry` event with structure: `{ stepName: string, retryCount: number, error: WorkflowError }`
4. Waits for `opts.retryDelayMs` using delay utility before retry
5. Increments retryCount and continues loop
6. All existing tests pass: `npm run test`
7. Type checking passes: `npm run lint`
8. Build succeeds: `npm run build`

---

## Why

- **PRD Compliance**: PRD Section 11 requires "Restartability is opt-in at the step method level" - this implementation provides the runtime retry mechanism for the configuration options added in P1.M1.T1.S1
- **Foundation for Restart Logic**: This retry loop is the core runtime behavior that enables step-level restartability when `restartable: true` is set
- **Error Resilience**: Automatically handles transient errors (network timeouts, rate limits) without requiring manual intervention
- **Observability**: `stepRetry` events provide visibility into retry attempts for monitoring and debugging

**Integration with Existing Features**:
- Builds on type definitions from P1.M1.T1.S1 (`restartable`, `maxRetries`, `retryDelayMs`, `retryOn`)
- Extends existing event system by adding new `stepRetry` event type
- Uses existing `WorkflowError` creation pattern from current error handling
- Follows existing decorator wrapper pattern from current `@Step` implementation

**Problems This Solves**:
- Enables automatic retry of failed steps without manual error handling
- Provides configurable retry behavior (max attempts, delay, error criteria)
- Emits events for observability during retry loops
- Preserves error context across retry attempts

---

## What

### User-Visible Behavior

When a step is decorated with `@Step({ restartable: true })` and throws an error:

1. **First Attempt**: Step executes normally
2. **On Error**: If `restartable: true` and `retryCount < maxRetries`:
   - `stepRetry` event is emitted with retry context
   - Execution waits for `retryDelayMs` milliseconds
   - Step is re-executed with same arguments and context
3. **On Success**: Step completes normally, `stepEnd` event emitted
4. **On Max Retries Exceeded**: `WorkflowError` is thrown immediately without further retry
5. **If Not Restartable**: Error is thrown immediately (existing behavior)

### Technical Requirements

1. **While Loop**: Wrap existing try-catch in `while (retryCount <= maxRetries)` loop
2. **Event Emission**: Add `stepRetry` event type to `src/types/events.ts`
3. **Delay Utility**: Create or use existing delay function for `retryDelayMs`
4. **Error Criterion Matching**: Implement `matchesCriterion()` function to check if error matches `retryOn` criteria
5. **State Preservation**: Maintain retry state across loop iterations
6. **Backward Compatibility**: Existing `@Step()` behavior unchanged when `restartable` is false/undefined

### Success Criteria

- [ ] Retry loop implemented in `src/decorators/step.ts`
- [ ] `stepRetry` event type added to `src/types/events.ts`
- [ ] Delay utility created/imported in `src/decorators/step.ts`
- [ ] Error criterion matching function implemented
- [ ] All existing tests pass: `npm run test`
- [ ] Type checking passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] New events emitted during retry attempts
- [ ] Retry respects `maxRetries` limit
- [ ] Retry respects `retryDelayMs` delay
- [ ] Retry only occurs when `restartable: true`

---

## All Needed Context

### Context Completeness Check

✓ **Passes "No Prior Knowledge" test**: A developer unfamiliar with the codebase has everything needed to implement the retry loop successfully.

✓ **All YAML references are specific and accessible**: All file paths, line numbers, and patterns are provided.

✓ **Implementation tasks include exact naming and placement guidance**: Specific function names, file locations, and patterns specified.

✓ **Validation commands are project-specific and verified working**: Using actual npm scripts from package.json.

---

### Documentation & References

```yaml
# MUST READ - Previous Subtask (Type Definitions)
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S1/PRP.md
  why: Complete type definitions from P1.M1.T1.S1 - StepOptions extension with restartable, maxRetries, retryDelayMs, retryOn, ErrorCriterion type
  critical: "Type definitions are complete - this task implements the runtime behavior for those types"

# MUST READ - Current Step Decorator Implementation
- file: /home/dustin/projects/groundswell/src/decorators/step.ts
  lines: 1-140
  why: Current @Step decorator structure - MUST understand existing wrapper pattern, error handling, event emission
  pattern: "Regular function (not arrow) for descriptor.value to preserve 'this' context"
  gotcha: "Lines 109-134 show current error handling - wraps in WorkflowError and re-throws immediately. This is where retry logic must be added."

# MUST READ - Event Type Definitions
- file: /home/dustin/projects/groundswell/src/types/events.ts
  lines: 1-76
  why: Current event type structure - discriminated union pattern with 'type' discriminator
  pattern: "All events include 'node' property for hierarchy tracking"
  critical: "Must add new 'stepRetry' event type following this pattern"

# MUST READ - WorkflowError Type
- file: /home/dustin/projects/groundswell/src/types/error.ts
  lines: 1-21
  why: WorkflowError structure - must preserve this when creating errors during retry
  pattern: "message, original, workflowId, stack, state, logs fields"
  critical: "Original error must be preserved in 'original' property"

# MUST READ - Existing Delay Utility
- file: /home/dustin/projects/groundswell/examples/utils/helpers.ts
  lines: 6-10
  why: Sleep utility pattern - Promise-based delay for retry pause
  pattern: "return new Promise((resolve) => setTimeout(resolve, ms));"
  gotcha: "This is in examples/ - must create similar utility in src/ or import appropriately"

# MUST READ - Test Patterns
- file: /home/dustin/projects/groundswell/src/__tests__/unit/decorators.test.ts
  lines: 1-101
  why: Testing pattern for @Step decorator - Vitest with describe/it, event capture with observers
  pattern: "wf.addObserver({ onEvent: (e) => events.push(e) }) to capture events"
  gotcha: "Events are captured in array and then filtered/checked with .find()"

# MUST READ - Architecture Analysis
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  lines: 244-314
  why: Detailed architecture for retry loop implementation - shows exact while loop structure required
  critical: "Lines 264-314 show the exact retry loop pattern to implement"

# MUST READ - ErrorCriterion Type Definition
- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 37-40
  why: ErrorCriterion discriminated union - must implement matching logic for this type
  pattern: "{ code: string | RegExp } | { recoverable: boolean } | ((error: WorkflowError) => boolean)"
  critical: "Function type must come LAST in union for proper type narrowing"

# MUST READ - StepOptions Interface
- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 45-64
  why: Complete StepOptions with all restart fields - these are the configuration options to implement
  critical: "restartable?: boolean (default: false), maxRetries?: number (default: 3), retryDelayMs?: number (default: 1000), retryOn?: ErrorCriterion[]"

# EXTERNAL REFERENCES - TypeScript Decorator Patterns
- url: https://www.typescriptlang.org/docs/handbook/decorators.html#decorator-composition
  why: Understanding decorator wrapper patterns and 'this' context preservation
  critical: "Use regular function not arrow function for descriptor.value to preserve 'this' binding"

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  why: Promise-based delay patterns for async retry loops
  critical: "Use setTimeout wrapped in Promise for non-blocking delays"

# RESEARCH - Retry Loop Best Practices
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/research/retry_loop_patterns.md
  section: "While Loop Patterns for Retry"
  why: Best practices for implementing retry loops - counter-based while loops, delay strategies
  critical: "Always have max attempts to prevent infinite loops, preserve error context across retries"
```

---

### Current Codebase Tree

```bash
src/
├── decorators/
│   ├── step.ts                 # TARGET FILE - Modify to add retry loop
│   ├── task.ts                 # Reference for decorator patterns
│   ├── observed-state.ts       # State snapshot utilities
│   └── index.ts                # Exports Step decorator
├── types/
│   ├── decorators.ts           # StepOptions with restartable, maxRetries, retryDelayMs, retryOn
│   ├── events.ts               # TARGET FILE - Add stepRetry event type
│   ├── error.ts                # WorkflowError type definition
│   └── index.ts                # Re-exports all types
├── utils/
│   ├── id.ts                   # generateId utility
│   ├── index.ts                # TARGET FILE - Export delay utility
│   └── workflow-error-utils.ts # Error utilities
└── __tests__/
    └── unit/
        └── decorators.test.ts  # Test patterns for @Step decorator
```

---

### Desired Codebase Tree (changes only)

```bash
src/
├── decorators/
│   └── step.ts                 # MODIFIED - Add retry loop with while, event emission, delay
├── types/
│   └── events.ts               # MODIFIED - Add stepRetry event type
└── utils/
    ├── delay.ts                # NEW FILE - Delay utility function
    └── index.ts                # MODIFIED - Export delay utility
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use regular function, not arrow function, for descriptor.value
// BAD: Loses 'this' binding
descriptor.value = async (...args) => { /* ... */ };
// GOOD: Preserves 'this' binding
descriptor.value = async function (this: Workflow, ...args) { /* ... */ };

// CRITICAL: ErrorCriterion discriminated union ordering
// Function types MUST come AFTER object types for proper type narrowing
type ErrorCriterion =
  | { code: string | RegExp }              // Object type 1
  | { recoverable: boolean }               // Object type 2
  | ((error: WorkflowError) => boolean);  // Function type LAST

// CRITICAL: Event emission pattern
// All workflow events use discriminated union with 'type' field
export type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }  // NEW
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number };

// CRITICAL: WorkflowError creation pattern
// From src/decorators/step.ts lines 116-123
const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,  // MUST preserve original error
  workflowId: wf.id,
  stack: error?.stack,
  state: snap,
  logs: [...wf.node.logs] as LogEntry[],
};

// CRITICAL: Retry loop must use while loop, not for loop
// Allows checking restartable and maxRetries dynamically each iteration
// Pattern from architecture/restart_logic_analysis.md lines 269-306
let retryCount = 0;
while (retryCount <= (opts.maxRetries ?? 3)) {
  try {
    // ... execute step
    return result;  // Exit on success
  } catch (error) {
    // Check if should retry
    if (!opts.restartable || retryCount >= (opts.maxRetries ?? 3)) {
      throw error;  // Exit on non-retryable error
    }
    // Emit retry event, wait, increment retryCount
    retryCount++;
  }
}

// CRITICAL: Delay utility must be Promise-based
// Use setTimeout wrapped in Promise for non-blocking async delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CRITICAL: Error criterion matching must handle all three variants
// Use type narrowing with typeof check for function type first
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  if (typeof criterion === 'function') {
    return criterion(error);  // Function variant
  }
  if ('code' in criterion) {
    return typeof criterion.code === 'string'
      ? error.message === criterion.code  // String code match
      : criterion.code.test(error.message);  // Regex code match
  }
  if ('recoverable' in criterion) {
    // Note: WorkflowError doesn't have recoverable field - this may need special handling
    return true;  // Placeholder - may need to check error.original or add recoverable to WorkflowError
  }
  return false;
}

// CRITICAL: Type imports use .js extension even for TypeScript files
// This project uses "type": "module" in package.json
import type { StepOptions } from '../types/decorators.js';
import type { WorkflowError } from '../types/error.js';

// CRITICAL: All decorator options have defaults documented in JSDoc
// Follow this pattern for restart options:
/** If true, step can be restarted on failure (default: false) */
restartable?: boolean;
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - this task implements runtime behavior for existing types from P1.M1.T1.S1:

- `StepOptions` interface with `restartable`, `maxRetries`, `retryDelayMs`, `retryOn`
- `ErrorCriterion` discriminated union type
- `WorkflowError` interface (already exists)

**New Event Type** to add:

```typescript
// Add to src/types/events.ts
export type WorkflowEvent =
  // ... existing events
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
  // ... other events
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/utils/delay.ts
  - IMPLEMENT: Delay utility function for async pause
  - PATTERN: Follow examples/utils/helpers.ts sleep function pattern
  - NAMING: delay function (lowercase, camelCase)
  - SIGNATURE: function delay(ms: number): Promise<void>
  - LOGIC: Return Promise that resolves after setTimeout(ms)
  - PLACEMENT: New file in src/utils/
  - DEPENDENCIES: None

Task 2: MODIFY src/utils/index.ts
  - EXPORT: Add delay utility to exports
  - PATTERN: Follow existing export pattern (generateId, Observable, etc.)
  - ADD: export { delay } from './delay.js';
  - PLACEMENT: After existing exports, maintain alphabetical order
  - DEPENDENCIES: Requires Task 1

Task 3: MODIFY src/types/events.ts
  - ADD: New event type for step retry
  - PATTERN: Follow existing discriminated union pattern
  - TYPE: { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
  - PLACEMENT: After 'stepStart' event, before 'stepEnd' event (logical ordering)
  - DEPENDENCIES: None (uses existing WorkflowNode and WorkflowError types)

Task 4: CREATE error criterion matching function in src/decorators/step.ts
  - IMPLEMENT: matchesCriterion helper function
  - SIGNATURE: function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean
  - LOGIC:
    - Check if criterion is function (typeof === 'function')
    - Check if criterion has 'code' property (string or RegExp)
    - Check if criterion has 'recoverable' property
    - Return boolean indicating match
  - PATTERN: Type narrowing with typeof check first for function type
  - PLACEMENT: Add inside Step decorator function, before stepWrapper
  - DEPENDENCIES: Requires ErrorCriterion type from Task 0 (P1.M1.T1.S1)

Task 5: MODIFY src/decorators/step.ts - Import delay utility
  - ADD: Import statement for delay function
  - PATTERN: Follow existing import pattern with .js extensions
  - ADD: import { delay } from '../utils/delay.js';
  - PLACEMENT: After existing imports (lines 1-4)
  - DEPENDENCIES: Requires Task 1 and Task 2

Task 6: MODIFY src/decorators/step.ts - Add retry loop to stepWrapper
  - WRAP: Existing try-catch (lines 77-134) in while loop
  - LOGIC:
    - Initialize retryCount = 0 before while loop
    - while (retryCount <= (opts.maxRetries ?? 3))
    - Inside catch block (after line 123):
      - Check if opts.restartable is true/false
      - Check if retryCount >= maxRetries
      - If either condition fails, throw workflowError immediately (existing behavior)
      - If opts.retryOn exists, check if error matches criteria using matchesCriterion
      - If no match, throw workflowError immediately
      - Emit stepRetry event with retry context
      - Await delay(opts.retryDelayMs ?? 1000)
      - Increment retryCount
      - Continue loop (retry execution)
    - On success (after line 82), break loop and return result
  - PATTERN: Follow while loop pattern from architecture/restart_logic_analysis.md lines 269-306
  - PRESERVE: All existing event emissions (stepStart, stepEnd, error)
  - PRESERVE: All existing logging, state snapshots, timing
  - PLACEMENT: Wrap lines 77-134 in while loop, add retry logic in catch block
  - DEPENDENCIES: Requires Task 3 (stepRetry event), Task 4 (matchesCriterion), Task 5 (delay import)

Task 7: CREATE src/__tests__/unit/decorators-retry.test.ts (NEW TEST FILE)
  - IMPLEMENT: Unit tests for retry logic
  - PATTERN: Follow src/__tests__/unit/decorators.test.ts structure
  - TEST CASES:
    - should not retry when restartable is false
    - should not retry when restartable is undefined
    - should retry when restartable is true and under maxRetries
    - should stop retrying after maxRetries exceeded
    - should emit stepRetry event on each retry
    - should respect retryDelayMs delay between retries
    - should not retry when error does not match retryOn criteria
    - should retry when error matches retryOn code criterion
    - should retry when error matches retryOn function criterion
  - NAMING: describe('@Step decorator with retry options', () => { ... })
  - PLACEMENT: New test file in src/__tests__/unit/
  - DEPENDENCIES: Requires Task 6 (retry loop implementation)

Task 8: VERIFY type checking
  - RUN: npm run lint (TypeScript compiler check --noEmit)
  - VERIFY: No type errors in src/decorators/step.ts
  - VERIFY: No type errors in src/types/events.ts
  - VERIFY: No import errors (delay imported correctly)
  - EXPECTED: Zero type errors

Task 9: VERIFY build
  - RUN: npm run build (tsc compilation)
  - VERIFY: Declaration files generated correctly (.d.ts)
  - VERIFY: stepRetry event type appears in dist/types/events.d.ts
  - VERIFY: delay function exported in dist/utils/index.d.ts
  - EXPECTED: Clean build with no errors

Task 10: VERIFY existing tests pass
  - RUN: npm run test
  - VERIFY: All existing tests in src/__tests__/unit/decorators.test.ts pass
  - VERIFY: No regressions in other test files
  - EXPECTED: All tests pass

Task 11: VERIFY backward compatibility
  - VERIFY: @Step() with no options still works (no retry)
  - VERIFY: @Step({ trackTiming: true }) still works (no retry)
  - VERIFY: @Step({ restartable: false }) does not retry
  - VERIFY: Existing error handling unchanged when restartable is false/undefined
  - EXPECTED: All existing usage patterns continue to work
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Delay Utility Implementation
// ============================================================
// CRITICAL: Must be Promise-based for non-blocking async delays

// File: src/utils/delay.ts
/**
 * Creates a promise that resolves after a specified delay
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// PATTERN 2: Event Type Definition
// ============================================================
// CRITICAL: Follow discriminated union pattern with 'type' discriminator

// File: src/types/events.ts - Add to WorkflowEvent union
export type WorkflowEvent =
  // ... existing events
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }  // NEW
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  // ... other events

// ============================================================
// PATTERN 3: Error Criterion Matching
// ============================================================
// CRITICAL: Type narrowing with typeof check for function type FIRST

// File: src/decorators/step.ts - Add inside Step decorator function
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  // CRITICAL: Check typeof first for function type narrowing
  if (typeof criterion === 'function') {
    return criterion(error);  // Custom predicate function
  }

  // Object type checks (type narrowing works after typeof check)
  if ('code' in criterion) {
    // Match by error code (string or regex)
    const errorCode = error.message;  // Or extract from error.original if available
    return typeof criterion.code === 'string'
      ? errorCode === criterion.code
      : criterion.code.test(errorCode);
  }

  if ('recoverable' in criterion) {
    // Match by recoverable flag
    // NOTE: WorkflowError doesn't have 'recoverable' field
    // May need to check error.original.recoverable or add field to WorkflowError
    // For now, assume all errors are recoverable if this criterion is used
    return true;
  }

  return false;
}

// ============================================================
// PATTERN 4: Retry Loop Structure
// ============================================================
// CRITICAL: Use while loop, not for loop - allows dynamic condition checking

// File: src/decorators/step.ts - Replace lines 77-134 with this pattern
async function stepWrapper(this: This, ...args: Args): Promise<Return> {
  const wf = this as unknown as WorkflowLike;
  const stepName = opts.name ?? methodName;

  // NEW: Initialize retry state
  let retryCount = 0;
  const maxRetries = opts.maxRetries ?? 3;

  // Log start if requested
  if (opts.logStart) {
    wf.logger.info(`STEP START: ${stepName}`);
  }

  // Emit step start event (only once, not on retry)
  wf.emitEvent({
    type: 'stepStart',
    node: wf.node,
    step: stepName,
  });

  // Create step node for hierarchy tracking
  const stepNode: WorkflowNode = {
    id: generateId(),
    name: retryCount > 0 ? `${stepName} (retry ${retryCount})` : stepName,
    parent: wf.node,
    children: [],
    status: 'running',
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  // Create execution context
  const executionContext: AgentExecutionContext = {
    workflowNode: stepNode,
    emitEvent: (event: WorkflowEvent) => {
      stepNode.events.push(event);
      wf.emitEvent(event);
    },
    workflowId: wf.id,
  };

  // ============================================================
  // CRITICAL: Retry loop wraps existing try-catch
  // ============================================================
  while (retryCount <= maxRetries) {
    try {
      // Execute the original method within the execution context
      const result = await runInContext(executionContext, async () => {
        return originalMethod.call(this, ...args);
      });

      // Update step node status
      stepNode.status = 'completed';

      // Snapshot state if requested
      if (opts.snapshotState) {
        wf.snapshotState();
      }

      // Calculate duration and emit end event
      const duration = Date.now() - startTime;
      if (opts.trackTiming !== false) {
        wf.emitEvent({
          type: 'stepEnd',
          node: wf.node,
          step: stepName,
          duration,
        });
      }

      // Log finish if requested
      if (opts.logFinish) {
        wf.logger.info(`STEP END: ${stepName} (${duration}ms)`);
      }

      // CRITICAL: Exit loop on success
      return result;

    } catch (err: unknown) {
      // Update step node status
      stepNode.status = 'failed';

      // Create rich error with context
      const error = err as Error;
      const snap = getObservedState(this as object);

      const workflowError: WorkflowError = {
        message: error?.message ?? 'Unknown error',
        original: err,
        workflowId: wf.id,
        stack: error?.stack,
        state: snap,
        logs: [...wf.node.logs] as LogEntry[],
      };

      // ============================================================
      // CRITICAL: Check if should retry or throw immediately
      // ============================================================
      const shouldAttemptRetry = opts.restartable && retryCount < maxRetries;

      // Check retry criteria if specified
      const matchesRetryCriteria = opts.retryOn
        ? opts.retryOn.some(criterion => matchesCriterion(workflowError, criterion))
        : true;  // If no criteria specified, retry all errors when restartable

      if (!shouldAttemptRetry || !matchesRetryCriteria) {
        // Emit error event and throw
        wf.emitEvent({
          type: 'error',
          node: wf.node,
          error: workflowError,
        });

        // Re-throw the enriched error
        throw workflowError;
      }

      // ============================================================
      // CRITICAL: Emit retry event and delay before retry
      // ============================================================
      const nextRetryCount = retryCount + 1;

      // Emit step retry event
      wf.emitEvent({
        type: 'stepRetry',
        node: wf.node,
        step: stepName,
        retryCount: nextRetryCount,
        error: workflowError,
      });

      // Log retry if logging enabled
      if (opts.logStart || opts.logFinish) {
        wf.logger.info(`STEP RETRY: ${stepName} (attempt ${nextRetryCount}/${maxRetries})`);
      }

      // Wait before retry
      const delayMs = opts.retryDelayMs ?? 1000;
      await delay(delayMs);

      // Increment retry count and continue loop
      retryCount = nextRetryCount;

      // Update step node name for retry
      stepNode.name = `${stepName} (retry ${retryCount})`;
      stepNode.status = 'running';
    }
  }

  // Should not reach here, but TypeScript needs it
  // This would only happen if loop exits without return or throw
  throw new Error(`Retry loop exited unexpectedly for step ${stepName}`);
}

// ============================================================
// PATTERN 5: Test Pattern for Retry Logic
// ============================================================
// CRITICAL: Use Vitest with observer pattern to capture events

// File: src/__tests__/unit/decorators-retry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Workflow, Step, WorkflowEvent } from '../../index.js';

describe('@Step decorator with retry options', () => {
  it('should not retry when restartable is false', async () => {
    class FailingWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: false })
      async failingStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Step failed');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new FailingWorkflow();

    await expect(wf.run()).rejects.toThrow('Step failed');
    expect(wf.attemptCount).toBe(1);  // Only one attempt
  });

  it('should retry when restartable is true', async () => {
    class RetryWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 3 })
      async retryableStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 3) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        await this.retryableStep();
      }
    }

    const wf = new RetryWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(3);  // Initial + 2 retries
  });

  it('should emit stepRetry event on each retry', async () => {
    const events: WorkflowEvent[] = [];

    class RetryWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 3 })
      async retryableStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        // Add observer to capture events
        this.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });

        await this.retryableStep();
      }
    }

    const wf = new RetryWorkflow();
    await wf.run();

    const retryEvents = events.filter(e => e.type === 'stepRetry');
    expect(retryEvents.length).toBe(1);  // One retry event

    if (retryEvents[0]?.type === 'stepRetry') {
      expect(retryEvents[0].retryCount).toBe(1);
      expect(retryEvents[0].step).toBe('retryableStep');
    }
  });

  it('should stop retrying after maxRetries exceeded', async () => {
    class MaxRetriesWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 2 })
      async failingStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Persistent failure');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new MaxRetriesWorkflow();

    await expect(wf.run()).rejects.toThrow('Persistent failure');
    expect(wf.attemptCount).toBe(3);  // Initial + 2 retries (maxRetries = 2 means 3 total attempts)
  });

  it('should respect retryDelayMs delay between retries', async () => {
    const timestamps: number[] = [];

    class DelayWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 2, retryDelayMs: 100 })
      async delayedStep(): Promise<void> {
        timestamps.push(Date.now());
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        await this.delayedStep();
      }
    }

    const wf = new DelayWorkflow();
    await wf.run();

    expect(timestamps.length).toBe(2);
    const delay = timestamps[1] - timestamps[0];
    expect(delay).toBeGreaterThanOrEqual(100);  // At least 100ms delay
  });
});

// ============================================================
// PATTERN 6: Import Statement Placement
// ============================================================
// CRITICAL: All imports use .js extension even for TypeScript files

// File: src/decorators/step.ts - Add delay import after line 4
import type { StepOptions, WorkflowError, WorkflowNode, LogEntry, WorkflowEvent } from '../types/index.js';
import { getObservedState } from './observed-state.js';
import { runInContext, type AgentExecutionContext } from '../core/context.js';
import { generateId } from '../utils/id.js';
import { delay } from '../utils/delay.js';  // NEW IMPORT

// ============================================================
// PATTERN 7: Backward Compatibility Verification
// ============================================================
// CRITICAL: Ensure existing behavior unchanged when restartable is false/undefined

// Test cases that MUST continue to work:
@Step()  // No options - should NOT retry
async noOptionsStep() { throw new Error('Fail'); }

@Step({ trackTiming: true })  // Old option only - should NOT retry
async oldOptionsStep() { throw new Error('Fail'); }

@Step({ restartable: false })  // Explicitly not restartable - should NOT retry
async notRestartableStep() { throw new Error('Fail'); }

// All three should throw immediately without retrying
```

---

### Integration Points

```yaml
TYPE SYSTEM:
  - type: Add stepRetry event to WorkflowEvent discriminated union in src/types/events.ts
  - type: Import delay function in src/decorators/step.ts
  - type: Use existing StepOptions fields (restartable, maxRetries, retryDelayMs, retryOn)

UTILS:
  - create: src/utils/delay.ts with delay() function
  - modify: src/utils/index.ts to export delay function

EVENT SYSTEM:
  - emit: stepRetry event on each retry attempt
  - preserve: All existing event emissions (stepStart, stepEnd, error)
  - pattern: Follow existing event structure with 'type' discriminator and 'node' property

ERROR HANDLING:
  - preserve: Existing WorkflowError creation pattern
  - preserve: Error emission with 'error' event type
  - extend: Add retry event before throwing on retryable errors

TEST SYSTEM:
  - create: src/__tests__/unit/decorators-retry.test.ts
  - pattern: Follow Vitest pattern from decorators.test.ts
  - coverage: All retry scenarios (success, failure, max retries, delay, criteria)

BUILD SYSTEM:
  - validation: npm run lint must succeed
  - validation: npm run build must succeed
  - validation: npm run test must succeed
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after completing each task - fix before proceeding
npm run lint
# Expected: Zero errors. If errors exist, READ output and fix.
# This runs: tsc --noEmit (TypeScript compiler check)

# Build declaration files
npm run build
# Expected: Clean build, .d.ts files generated in dist/
# Check: dist/utils/delay.d.ts contains delay function
# Check: dist/types/events.d.ts contains stepRetry event type
# Check: dist/decorators/step.d.ts contains retry loop

# Verify exports
grep -r "stepRetry" dist/
grep -r "delay" dist/utils/
# Expected: New types and functions appear in declaration files
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Test new retry functionality
npm run test -- src/__tests__/unit/decorators-retry.test.ts
# Expected: All retry tests pass

# Test existing functionality (regression check)
npm run test -- src/__tests__/unit/decorators.test.ts
# Expected: All existing tests pass

# Test entire test suite
npm run test
# Expected: All tests pass, no regressions

# Coverage validation (if coverage tools available)
npm run test -- --coverage
# Expected: High coverage for new retry code paths
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Test retry with actual workflow execution
cat > /tmp/retry-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class RetryTestWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 3, retryDelayMs: 100 })
  async retryableStep(): Promise<string> {
    this.attemptCount++;
    console.log(`Attempt ${this.attemptCount}`);
    if (this.attemptCount < 2) {
      throw new Error('Temporary failure');
    }
    return 'success';
  }

  async run(): Promise<string> {
    return this.retryableStep();
  }
}

const wf = new RetryTestWorkflow();
wf.run().then(
  (result) => console.log('Result:', result, 'Attempts:', wf.attemptCount),
  (error) => console.log('Error:', error.message, 'Attempts:', wf.attemptCount)
);
EOF

tsx /tmp/retry-test.ts
# Expected: Attempt 1, Attempt 2, Result: success Attempts: 2

# Test max retries limit
cat > /tmp/max-retries-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class MaxRetriesWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 2 })
  async failingStep(): Promise<void> {
    this.attemptCount++;
    throw new Error('Persistent failure');
  }

  async run(): Promise<void> {
    await this.failingStep();
  }
}

const wf = new MaxRetriesWorkflow();
wf.run().catch(
  (error) => console.log('Error:', error.message, 'Attempts:', wf.attemptCount)
);
EOF

tsx /tmp/max-retries-test.ts
# Expected: Error: Persistent failure Attempts: 3

# Test event emission
cat > /tmp/events-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class EventsTestWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 2 })
  async retryableStep(): Promise<void> {
    this.attemptCount++;
    if (this.attemptCount < 2) {
      throw new Error('Temporary failure');
    }
  }

  async run(): Promise<void> {
    this.addObserver({
      onLog: () => {},
      onEvent: (e) => console.log('Event:', e.type, e.step || '', e.retryCount || ''),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    await this.retryableStep();
  }
}

const wf = new EventsTestWorkflow();
wf.run();
EOF

tsx /tmp/events-test.ts
# Expected: Event: stepStart, Event: stepRetry 1, Event: stepEnd
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Retry with error criteria matching
cat > /tmp/criteria-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class CriteriaWorkflow extends Workflow {
  attemptCount = 0;

  @Step({
    restartable: true,
    maxRetries: 3,
    retryOn: [
      { code: 'TEMPORARY_FAILURE' },
      (error) => error.message.includes('timeout')
    ]
  })
  async conditionalStep(): Promise<void> {
    this.attemptCount++;
    if (this.attemptCount === 1) {
      throw new Error('TEMPORARY_FAILURE');
    }
    if (this.attemptCount === 2) {
      throw new Error('Network timeout occurred');
    }
  }

  async run(): Promise<void> {
    this.addObserver({
      onLog: () => {},
      onEvent: (e) => console.log('Event:', e.type),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    await this.conditionalStep();
  }
}

const wf = new CriteriaWorkflow();
wf.run().then(
  () => console.log('Success, attempts:', wf.attemptCount),
  () => console.log('Failed, attempts:', wf.attemptCount)
);
EOF

tsx /tmp/criteria-test.ts
# Expected: Should retry on both errors (matches code and function criteria)

# Retry delay timing verification
cat > /tmp/timing-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class TimingWorkflow extends Workflow {
  timestamps: number[] = [];

  @Step({ restartable: true, maxRetries: 3, retryDelayMs: 200 })
  async delayedStep(): Promise<void> {
    this.timestamps.push(Date.now());
    if (this.timestamps.length < 3) {
      throw new Error('Fail');
    }
  }

  async run(): Promise<void> {
    await this.delayedStep();
  }
}

const wf = new TimingWorkflow();
const startTime = Date.now();
wf.run().then(() => {
  const totalTime = Date.now() - startTime;
  const delays = [];
  for (let i = 1; i < wf.timestamps.length; i++) {
    delays.push(wf.timestamps[i] - wf.timestamps[i - 1]);
  }
  console.log('Delays:', delays);
  console.log('Total time:', totalTime);
  console.log('Expected: ~400ms (2 retries × 200ms)');
});
EOF

tsx /tmp/timing-test.ts
# Expected: Delays close to [200, 200], Total time ~400ms

# Backward compatibility test
cat > /tmp/compat-test.ts << 'EOF'
import { Workflow, Step } from './dist/index.js';

class CompatWorkflow extends Workflow {
  @Step()  // No options - should NOT retry
  async noOptions() { throw new Error('No options'); }

  @Step({ trackTiming: true })  // Old option - should NOT retry
  async oldOptions() { throw new Error('Old options'); }

  @Step({ restartable: false })  // Explicitly false - should NOT retry
  async notRestartable() { throw new Error('Not restartable'); }

  async testNoOptions() {
    try { await this.noOptions(); } catch (e) { console.log('noOptions: OK (no retry)'); }
  }

  async testOldOptions() {
    try { await this.oldOptions(); } catch (e) { console.log('oldOptions: OK (no retry)'); }
  }

  async testNotRestartable() {
    try { await this.notRestartable(); } catch (e) { console.log('notRestartable: OK (no retry)'); }
  }
}

const wf = new CompatWorkflow();
wf.testNoOptions().then(() => wf.testOldOptions()).then(() => wf.testNotRestartable());
EOF

tsx /tmp/compat-test.ts
# Expected: All three methods throw immediately without retrying
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Type checking passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm run test`
- [ ] stepRetry event type defined in src/types/events.ts
- [ ] delay utility exported from src/utils/index.ts
- [ ] Retry loop implemented in src/decorators/step.ts
- [ ] Error criterion matching function implemented
- [ ] No import/export errors
- [ ] Declaration files generated correctly

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Retry loop wraps existing try-catch in while loop
- [ ] Checks opts.restartable before retrying
- [ ] Respects maxRetries limit
- [ ] Respects retryDelayMs delay
- [ ] Emits stepRetry event with correct structure
- [ ] Checks retryOn criteria before retrying
- [ ] Preserves error context across retries
- [ ] Existing tests still pass
- [ ] New tests cover all retry scenarios

### Code Quality Validation

- [ ] Follows existing codebase patterns (decorator wrapper, event emission)
- [ ] File placement matches desired codebase tree structure
- [ ] Anti-patterns avoided (no arrow functions for descriptor.value, while loop not for loop)
- [ ] Delay utility is Promise-based (non-blocking)
- [ ] Error criterion matching uses proper type narrowing
- [ ] Backward compatibility maintained (existing @Step usage unchanged)
- [ ] JSDoc comments present on delay utility

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable/function names
- [ ] Retry behavior is observable via stepRetry events
- [ ] Error messages are informative
- [ ] Test cases document expected retry behavior
- [ ] Integration with existing event system is seamless

---

## Anti-Patterns to Avoid

- ❌ **Don't** use arrow function for `descriptor.value` - use regular function to preserve `this` binding
- ❌ **Don't** use for loop for retry - use while loop for dynamic condition checking
- ❌ **Don't** forget to preserve original error in WorkflowError.original
- ❌ **Don't** skip delay between retries - must respect retryDelayMs
- ❌ **Don't** emit stepRetry event after max retries exceeded - only emit when actually retrying
- ❌ **Don't** modify existing event emissions - stepStart and stepEnd must remain unchanged
- ❌ **Don't** retry when restartable is false or undefined - backward compatibility critical
- ❌ **Don't** forget to check retryOn criteria - must match before retrying
- ❌ **Don't** use blocking delay - must be Promise-based for async
- ❌ **Don't** change error handling when not restartable - existing behavior must be preserved
- ❌ **Don't** create infinite loop - always respect maxRetries limit
- ❌ **Don't** put function type first in ErrorCriterion matching - check typeof first for type narrowing

---

## Confidence Score

**9/10** - One-pass implementation success likelihood is very high

**Reasoning**:
- ✅ All required context gathered and documented
- ✅ Specific file paths, line numbers, and patterns provided
- ✅ Existing patterns identified to follow
- ✅ Validation commands are project-specific and verified
- ✅ Clear implementation blueprint with 11 ordered tasks
- ✅ Comprehensive code examples for all patterns
- ✅ Backward compatibility requirements clearly defined
- ✅ Test patterns documented with examples
- ✅ All integration points identified
- ⚠️ Minor risk: Error criterion matching for 'recoverable' field may need adjustment (WorkflowError doesn't have this field - documented in gotchas)
- ⚠️ Minor risk: Delay utility placement/import path must be correct (documented in tasks)

**Validation**: The completed PRP provides everything needed to implement the retry loop successfully. A developer unfamiliar with the codebase can follow the implementation tasks verbatim and produce the correct retry behavior. The extensive context, patterns, and validation procedures minimize the risk of implementation errors.
