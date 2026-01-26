# PRP: Modify Step Decorator to Implement Retry Loop

---

## Goal

**Feature Goal**: Implement retry loop in `@Step` decorator that wraps existing try-catch in a while loop, checks retry criteria, emits `stepRetry` events, and handles retry delays with `restartable` option control.

**Deliverable**: Modified step decorator function in `src/decorators/step.ts` that implements:
- Retry while loop: `while (retryCount <= maxRetries)`
- Conditional retry based on `opts.restartable` and `opts.retryOn` criteria
- `stepRetry` event emission with `RestartAnalysis`, error context, and timestamp
- Retry delay using `delay()` utility from `src/utils/delay.ts`
- Retry count tracking with loop continuation

**Success Definition**:
1. Retry loop wraps existing try-catch in `@Step` decorator
2. Retry only occurs when `restartable: true` AND retry count < maxRetries
3. `stepRetry` event emitted with correct structure: `{ stepName, retryCount, analysis, error, timestamp }`
4. Retry delay honored using `opts.retryDelayMs` (default 1000ms)
5. Error thrown when not restartable or max retries exceeded
6. All existing tests pass plus new retry tests pass

---

## Why

- **PRD Compliance**: PRD Section 11 specifies "Restartability is opt-in at the step method level" - this retry loop is the runtime implementation of that opt-in mechanism
- **Transcript Reference**: `architecture/restart_logic_analysis.md` explicitly states: "Step decorator in src/decorators/step.ts currently wraps methods in try-catch but does NOT implement retry logic" - this work fixes that gap
- **Error Resilience**: Enables automatic retry of transient failures (timeouts, rate limits, network errors) without manual intervention
- **Observability**: `stepRetry` events provide visibility into retry behavior for monitoring and debugging
- **Foundation**: Retry loop is foundation for parent-driven restart decisions in future tasks

**Integration with Existing Features**:
- Builds on `StepOptions` extension from P1.M1.T1.S1 (`restartable`, `maxRetries`, `retryDelayMs`, `retryOn`)
- Uses existing `delay()` utility from `src/utils/delay.ts`
- Emits `stepRetry` event type defined in `src/types/events.ts` (from P1.M1.T1.S3)
- Uses `RestartAnalysis` interface from `src/types/restart.ts` (from P1.M1.T2.S1)
- Preserves all existing `@Step` decorator behavior (timing, logging, state snapshots)

**Problems This Solves**:
- No retry capability exists in `@Step` decorator - transient failures immediately propagate
- No visibility into retry attempts - no events emitted for retries
- No configurable retry criteria - all-or-nothing approach
- No retry delay control - could overwhelm failing services

---

## What

### User-Visible Behavior

After this implementation, users can configure retry behavior:

```typescript
class MyWorkflow extends Workflow {
  // Basic restartable step - retries 3 times with 1s delay
  @Step({ restartable: true })
  async flakyOperation() {
    // Will retry up to 3 times on failure
  }

  // Custom retry configuration
  @Step({
    restartable: true,
    maxRetries: 5,
    retryDelayMs: 2000
  })
  async patientOperation() {
    // Retries up to 5 times with 2s delay between attempts
  }

  // Conditional retry based on error type
  @Step({
    restartable: true,
    maxRetries: 3,
    retryOn: [
      { code: 'RATE_LIMIT_EXCEEDED' },
      { code: /TIMEOUT|NETWORK_ERROR/ },
      { recoverable: true },
      (err) => err.message.includes('temporary')
    ]
  })
  async selectiveRetryOperation() {
    // Only retries on specific error types
  }

  // Non-restartable step (default behavior)
  @Step()
  async criticalOperation() {
    // Fails immediately on error - no retries
  }
}
```

**Retry Flow**:
1. Step executes
2. If error occurs:
   - Check if `restartable: true` AND `retryCount < maxRetries`
   - Check if error matches any `retryOn` criteria (if specified)
   - If both checks pass: emit `stepRetry` event, wait `retryDelayMs`, increment count, retry
   - If either check fails: throw `WorkflowError` immediately
3. If success: return result, emit `stepEnd` event
4. Retry loop continues until success or max retries exceeded

**Events Emitted**:
- `stepStart` - Once when step first starts
- `stepRetry` - On each retry attempt with analysis
- `stepEnd` - On successful completion
- `error` - On final failure after all retries exhausted

### Technical Requirements

1. **Retry Loop Structure**: Wrap existing try-catch in `while (retryCount <= maxRetries)` loop
2. **Retry Criteria**: Check `opts.restartable` AND `retryCount < maxRetries` AND `opts.retryOn` matching
3. **Error Criterion Matching**: Support string, regex, and function criterion types
4. **Event Emission**: Emit `stepRetry` event before delay with full context
5. **Delay Implementation**: Use `delay()` utility with `opts.retryDelayMs` (default 1000ms)
6. **Retry Count Tracking**: Increment and track retry count across loop iterations
7. **Preserve Existing Behavior**: All non-retry-related features unchanged

### Success Criteria

- [ ] Retry loop wraps try-catch with `while (retryCount <= maxRetries)`
- [ ] Retry only occurs when `restartable: true`
- [ ] `maxRetries` default is 3, configurable via options
- [ ] `retryDelayMs` default is 1000ms, configurable via options
- [ ] `stepRetry` event emitted on each retry with correct structure
- [ ] Error thrown immediately when not restartable or max retries exceeded
- [ ] Retry loop exits on success and returns result
- [ ] All existing tests pass
- [ ] New retry tests pass (see P1.M1.T1.S4)

---

## All Needed Context

### Context Completeness Check

✓ **Passes "No Prior Knowledge" test**: All file paths, code patterns, type definitions, and implementation details provided.

✓ **All YAML references are specific and accessible**: Exact file paths, line numbers, and code snippets included.

✓ **Implementation tasks include exact naming and placement guidance**: Specific variable names, control flow structure, and integration points specified.

✓ **Validation commands are project-specific and verified working**: Using actual npm scripts from package.json.

### Documentation & References

```yaml
# MUST READ - Work Item Contract
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/tasks.json
  section: "P1.M1.T1.S2 contract definition"
  why: Exact specification of retry loop requirements
  critical: "Wrap existing try-catch in while loop that checks retryCount <= maxRetries"

# MUST READ - Architecture Analysis
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  lines: 1-92
  why: Architecture analysis showing current gap and required implementation
  critical: "Step decorator currently wraps methods in try-catch but does NOT implement retry logic"

# MUST READ - StepOptions Extension (P1.M1.T1.S1 PRP)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S1/PRP.md
  lines: 1-764
  why: Complete StepOptions interface definition with restart configuration fields
  critical: "restartable?: boolean (default: false), maxRetries?: number (default: 3), retryDelayMs?: number (default: 1000)"

# MUST READ - Event Type Definition (P1.M1.T1.S3)
- file: src/types/events.ts
  lines: 16-17
  why: stepRetry event type structure with all required fields
  pattern: "type: 'stepRetry', node: WorkflowNode, stepName: string, retryCount: number, analysis: RestartAnalysis, error: WorkflowError, timestamp: number"

# MUST READ - RestartAnalysis Type
- file: src/types/restart.ts
  lines: 48-60
  why: RestartAnalysis interface structure for retry event payload
  pattern: "shouldRestart: boolean, reason: string, suggestedAction: 'retry'|'abort'|'rebuild', estimatedSuccessProbability: number"

# MUST READ - ErrorCriterion Type
- file: src/types/restart.ts
  lines: 132-136
  why: ErrorCriterion discriminated union for matching errors
  critical: "Function type must come last in union for proper type narrowing"

# MUST READ - Current Step Decorator Implementation
- file: src/decorators/step.ts
  lines: 1-239
  why: Current implementation showing existing try-catch structure to wrap
  pattern: "Regular function (not arrow) to preserve 'this', try-catch around originalMethod.call()"

# MUST READ - Delay Utility
- file: src/utils/delay.ts
  lines: 1-8
  why: Official delay utility for retryDelayMs waiting
  pattern: "Promise-based setTimeout wrapper: delay(ms: number): Promise<void>"

# MUST READ - Existing Test Patterns
- file: src/__tests__/unit/decorators/step-restart.test.ts
  lines: 1-479
  why: Comprehensive test coverage for retry behavior - use as validation reference
  pattern: "Counter-based verification, event capture, delay timing verification"

# MUST READ - WorkflowError Structure
- file: src/types/error.ts
  lines: 1-21
  why: WorkflowError interface showing what's available in catch block
  pattern: "message, original, workflowId, stack, state, logs fields"

# EXTERNAL - TypeScript While Loop Patterns
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while
  why: Standard JavaScript while loop syntax for retry implementation
  critical: "Loop condition must be retryCount <= maxRetries (inclusive for initial attempt)"

# EXTERNAL - Async/Await in Loops
- url: https://javascript.info/async-await#loops
  why: Proper async/await usage within while loops
  critical: "Must await delay() inside loop, not in loop condition"

# EXTERNAL - Promise-based Delay Patterns
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  section: "Promise-based timers"
  why: Understanding delay() utility implementation
  critical: "delay() returns Promise that resolves after setTimeout"
```

---

### Current Codebase Tree

```bash
src/
├── decorators/
│   ├── step.ts              # TARGET FILE - Add retry loop here (lines ~115-229)
│   ├── task.ts              # Reference for concurrent execution patterns
│   └── index.ts             # Exports Step decorator
├── types/
│   ├── decorators.ts        # StepOptions with restart config (from P1.M1.T1.S1)
│   ├── events.ts            # stepRetry event type (from P1.M1.T1.S3)
│   ├── restart.ts           # ErrorCriterion and RestartAnalysis types
│   ├── error.ts             # WorkflowError interface
│   └── index.ts             # Type re-exports
├── utils/
│   ├── delay.ts             # Delay utility for retryDelayMs
│   └── index.ts             # Utility exports
├── core/
│   └── context.ts           # runInContext, AgentExecutionContext
└── __tests__/
    └── unit/
        └── decorators/
            └── step-restart.test.ts  # Retry behavior tests (from P1.M1.T1.S4)
```

---

### Desired Codebase Tree (changes only)

```bash
src/decorators/
└── step.ts              # MODIFIED - Add retry loop implementation (lines 115-229)
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use regular function, not arrow function, for stepWrapper
// Arrow functions don't preserve 'this' binding from decorator context
// BAD: const stepWrapper = async (this: This, ...args: Args) => {
// GOOD: async function stepWrapper(this: This, ...args: Args) {

// CRITICAL: Loop condition must be inclusive
// while (retryCount <= maxRetries) allows initial attempt + maxRetries retry attempts
// If maxRetries = 3, total attempts = 4 (1 initial + 3 retries)
// BAD: while (retryCount < maxRetries) - only gives 3 attempts total when maxRetries = 3

// CRITICAL: ErrorCriterion type narrowing order
// Function types must be checked FIRST before discriminant property checks
// Otherwise TypeScript can't narrow the type correctly
if (typeof criterion === 'function') {
  return criterion(error);  // Check function FIRST
}
if ('code' in criterion) {
  // Safe to use discriminant after function check
}

// CRITICAL: WorkflowError.message used as fallback for 'code' field
// ErrorCriterion { code: string } matches against error.message (not error.code)
// The codebase doesn't have a dedicated 'code' field on WorkflowError
// Pattern: const errorCode = error.message;  // Use message as code

// CRITICAL: stepStart event emitted only once, not on retry
// stepRetry event is emitted on each retry attempt
// stepEnd event emitted only on final success (not on retry)

// CRITICAL: delay() is async, must be awaited
// BAD: delay(retryDelayMs);  - Fire-and-forget, doesn't actually wait
// GOOD: await delay(retryDelayMs);  - Properly waits before retry

// CRITICAL: RestartAnalysis creation for retry event
// Must include all four fields: shouldRestart, reason, suggestedAction, estimatedSuccessProbability
// suggestedAction must be literal type 'retry' | 'abort' | 'rebuild'

// CRITICAL: Retry count increment happens AFTER retry event emission
// Event shows next attempt number (retryCount + 1), not current failed attempt
// Pattern: const nextRetryCount = retryCount + 1;
//         emitEvent({ retryCount: nextRetryCount, ... });
//         await delay(delayMs);
//         retryCount = nextRetryCount;  // Increment after delay

// CRITICAL: Loop exit on success
// Must return result immediately on success to exit loop
// Don't rely on loop condition alone - use explicit return

// CRITICAL: Error thrown when not restartable or max retries exceeded
// Emit error event before throwing for consistency
// Pattern: wf.emitEvent({ type: 'error', error: workflowError });
//         throw workflowError;

// CRITICAL: Preserve all existing behavior
// trackTiming, snapshotState, logStart, logFinish, stepNode updates must all work exactly as before
// Only difference is retry loop wrapping the try-catch
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - uses existing types from P1.M1.T1.S1, P1.M1.T1.S3, P1.M1.T2.S1:

- `StepOptions` - Configuration with `restartable`, `maxRetries`, `retryDelayMs`, `retryOn`
- `RestartAnalysis` - Analysis object for retry event payload
- `ErrorCriterion` - Discriminated union for error matching
- `WorkflowError` - Enriched error type with context
- `WorkflowEvent` - Discriminated union including `stepRetry` type

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD retry state initialization
  - IMPLEMENT: Initialize retryCount = 0, maxRetries from opts
  - LOCATION: In stepWrapper function, after startTime capture, before try-catch
  - PATTERN: const retryCount = 0; const maxRetries = opts.maxRetries ?? 3;
  - PLACEMENT: After stepName assignment, before logStart check (line ~74-76)

Task 2: WRAP existing try-catch in while loop
  - IMPLEMENT: Add while (retryCount <= maxRetries) { ... } around existing try-catch
  - LOCATION: Entire existing try-catch block (lines 116-148 in current implementation)
  - PATTERN: while (retryCount <= maxRetries) { try { ... } catch (err) { ... } }
  - PRESERVE: All existing try-catch logic exactly as is
  - PLACEMENT: Wrap from try statement through return result

Task 3: ADD retry criteria checking in catch block
  - IMPLEMENT: Check restartable flag and retry count before throwing
  - LOCATION: In catch block, after WorkflowError creation (line ~168-176)
  - PATTERN: const shouldAttemptRetry = opts.restartable && retryCount < maxRetries;
  - PATTERN: const matchesRetryCriteria = opts.retryOn ? opts.retryOn.some(...) : true;
  - PLACEMENT: After workflowError creation, before error event emission

Task 4: CREATE matchesCriterion helper function
  - IMPLEMENT: Error criterion matching function for all three types
  - LOCATION: Inside Step decorator factory, before stepWrapper function (line ~40-65)
  - PATTERN: function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean
  - CRITICAL: Check typeof === 'function' FIRST for type narrowing
  - GOTCHA: Use error.message as fallback for error.code

Task 5: MODIFY error handling to throw immediately if not restartable
  - IMPLEMENT: If !shouldAttemptRetry or !matchesRetryCriteria, emit error and throw
  - LOCATION: In catch block, after retry criteria check (line ~177-187)
  - PATTERN: if (!shouldAttemptRetry || !matchesRetryCriteria) { wf.emitEvent({ type: 'error', ... }); throw workflowError; }
  - PRESERVE: Existing error event emission and throw logic
  - PLACEMENT: Before retry logic, as early exit from catch block

Task 6: CREATE RestartAnalysis object for retry event
  - IMPLEMENT: Build analysis object with shouldRestart, reason, suggestedAction, probability
  - LOCATION: In catch block, after retry criteria confirmed (line ~194-200)
  - PATTERN: const analysis: RestartAnalysis = { shouldRestart: true, reason: `...`, suggestedAction: 'retry', estimatedSuccessProbability: 0.7 };
  - PLACEMENT: After confirming retry should happen, before event emission

Task 7: EMIT stepRetry event
  - IMPLEMENT: Emit stepRetry event with full context
  - LOCATION: In catch block, after analysis creation (line ~203-211)
  - PATTERN: wf.emitEvent({ type: 'stepRetry', node: wf.node, stepName, retryCount: nextRetryCount, analysis, error: workflowError, timestamp: Date.now() });
  - CRITICAL: Include all required fields from src/types/events.ts line 16
  - PLACEMENT: After analysis creation, before delay

Task 8: ADD retry delay and count increment
  - IMPLEMENT: Wait for retryDelayMs, then increment retryCount and continue loop
  - LOCATION: In catch block, after stepRetry event (line ~218-227)
  - PATTERN: const delayMs = opts.retryDelayMs ?? 1000; await delay(delayMs); retryCount = nextRetryCount;
  - PATTERN: Update stepNode.name to show retry attempt
  - PLACEMENT: After event emission and logging, end of catch block (loop continues)

Task 9: VERIFY loop exit on success
  - IMPLEMENT: Ensure return result exits loop immediately
  - LOCATION: In try block, after successful execution (line ~147-148)
  - PATTERN: return result;  // Already exists, just verify it's still there
  - CRITICAL: Explicit return exits while loop

Task 10: ADD fallback throw for unexpected loop exit
  - IMPLEMENT: Throw error if loop exits without return or throw
  - LOCATION: After while loop, before return stepWrapper (line ~232-233)
  - PATTERN: throw new Error(`Retry loop exited unexpectedly for step ${stepName}`);
  - CRITICAL: TypeScript needs this for type safety (might not reach)
  - PLACEMENT: End of stepWrapper function, after while loop closes
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Retry State Initialization
// ============================================================
// Place after stepName and startTime, before existing try-catch
async function stepWrapper(this: This, ...args: Args): Promise<Return> {
  const wf = this as unknown as WorkflowLike;
  const stepName = opts.name ?? methodName;
  const startTime = Date.now();

  // NEW: Initialize retry state
  let retryCount = 0;
  const maxRetries = opts.maxRetries ?? 3;

  // ... rest of existing code
}

// ============================================================
// PATTERN 2: While Loop Wrapping Try-Catch
// ============================================================
// CRITICAL: Condition is <= to allow initial + maxRetries attempts
// If maxRetries = 3, loop runs for retryCount = 0, 1, 2, 3 (4 attempts total)
while (retryCount <= maxRetries) {
  try {
    // Execute original method
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
    // Error handling and retry logic
  }
}

// ============================================================
// PATTERN 3: Error Criterion Matching Helper
// ============================================================
// CRITICAL: Function MUST come first in type narrowing
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  // Check typeof first for function type narrowing
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Object type checks (safe after function check)
  if ('code' in criterion) {
    const errorCode = error.message;  // Use message as code fallback
    return typeof criterion.code === 'string'
      ? errorCode === criterion.code
      : criterion.code.test(errorCode);
  }

  if ('recoverable' in criterion) {
    // Check original error for recoverable flag
    const original = error.original as Error | undefined;
    if (original && 'recoverable' in original) {
      return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
    }
    // Assume true to allow retry if no recoverable field
    return criterion.recoverable;
  }

  return false;
}

// ============================================================
// PATTERN 4: Retry Criteria Checking
// ============================================================
// In catch block, after WorkflowError creation
const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: snap,
  logs: [...wf.node.logs] as LogEntry[],
};

// Check if should retry
const shouldAttemptRetry = opts.restartable && retryCount < maxRetries;

// Check retry criteria if specified (OR logic - match any criterion)
const matchesRetryCriteria = opts.retryOn
  ? opts.retryOn.some(criterion => matchesCriterion(workflowError, criterion))
  : true;  // If no criteria, retry all errors when restartable

// ============================================================
// PATTERN 5: Early Exit on Non-Retriable Error
// ============================================================
if (!shouldAttemptRetry || !matchesRetryCriteria) {
  // Emit error event
  wf.emitEvent({
    type: 'error',
    node: wf.node,
    error: workflowError,
  });

  // Re-throw the enriched error
  throw workflowError;
}

// ============================================================
// PATTERN 6: Retry Event Emission and Delay
// ============================================================
// Only reach here if should retry
const nextRetryCount = retryCount + 1;

// Create restart analysis for the retry event
const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: `Error matches retry criteria (attempt ${nextRetryCount}/${maxRetries})`,
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.7,
};

// Emit step retry event
wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  stepName: stepName,
  retryCount: nextRetryCount,
  analysis,
  error: workflowError,
  timestamp: Date.now(),
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

// Loop continues (while condition re-evaluated)

// ============================================================
// PATTERN 7: Fallback Error Handling
// ============================================================
// After while loop closes (should never reach here)
throw new Error(`Retry loop exited unexpectedly for step ${stepName}`);
```

---

### Integration Points

```yaml
STEP_DECORATOR_MODIFICATION:
  - file: src/decorators/step.ts
  - modification: Add retry loop (lines 74-233)
  - preserve: All existing functionality (timing, logging, snapshots, events)
  - dependencies: delay() from src/utils/delay.ts

TYPE_SYSTEM:
  - type: StepOptions (from P1.M1.T1.S1) - restartable, maxRetries, retryDelayMs, retryOn
  - type: RestartAnalysis (from P1.M1.T2.S1) - analysis object for retry events
  - type: ErrorCriterion (from P1.M1.T2.S1) - discriminated union for error matching
  - type: WorkflowEvent (from P1.M1.T1.S3) - stepRetry event structure

EVENT_SYSTEM:
  - emit: stepRetry event on each retry attempt
  - preserve: stepStart (once), stepEnd (on success), error (on failure)
  - fields: type, node, stepName, retryCount, analysis, error, timestamp

TESTING:
  - test: src/__tests__/unit/decorators/step-restart.test.ts (from P1.M1.T1.S4)
  - coverage: Retry behavior, event emission, delay timing, error criteria
  - validation: All existing tests still pass
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after completing implementation - fix before proceeding
npm run lint
# Expected: Zero type errors. If errors exist, READ output and fix.
# This runs: tsc --noEmit (TypeScript compiler check)

# Format code
npm run format
# Expected: Code formatted with Prettier

# Build to verify compilation
npm run build
# Expected: Clean build, .d.ts files generated in dist/
# Check: dist/decorators/step.d.ts contains updated implementation
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing decorator tests (should still pass)
npm run test -- src/__tests__/unit/decorators.test.ts
# Expected: All existing tests pass (backward compatibility verified)

# Run new retry tests (from P1.M1.T1.S4)
npm run test -- src/__tests__/unit/decorators/step-restart.test.ts
# Expected: All retry tests pass
# Coverage includes:
#   - No retry when restartable is false
#   - No retry when restartable is undefined
#   - Retry when restartable is true
#   - Stop retrying after maxRetries exceeded
#   - Emit stepRetry event on each retry
#   - Honor retryDelayMs delay between retries
#   - Emit stepStart, stepRetry, stepEnd events in order
#   - Backward compatibility with existing options
#   - Handle zero maxRetries (no retries)
#   - Not retry when error doesn't match retryOn criteria
#   - Retry when error matches retryOn code (string)
#   - Retry when error matches retryOn code (regex)
#   - Retry when error matches retryOn function
#   - Retry when error matches multiple retryOn criteria
#   - Include error field in stepRetry event

# Run full unit test suite
npm run test
# Expected: All tests pass
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Test retry behavior in workflow context
cat > /tmp/retry-integration-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class RetryIntegrationWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 3, retryDelayMs: 100 })
  async flakyStep() {
    this.attemptCount++;
    if (this.attemptCount < 3) {
      throw new Error('Temporary failure');
    }
  }

  async run() {
    await this.flakyStep();
  }
}

async function test() {
  const wf = new RetryIntegrationWorkflow();
  await wf.run();
  console.log(`Attempts: ${wf.attemptCount}`);  // Should be 3
}

test().catch(console.error);
EOF

node --loader ts-node/esm /tmp/retry-integration-test.ts
# Expected: Executes successfully, outputs "Attempts: 3"

# Test retry event emission
cat > /tmp/retry-event-test.ts << 'EOF'
import { Workflow, Step, WorkflowEvent } from './src/index.js';

class RetryEventWorkflow extends Workflow {
  attemptCount = 0;
  events: WorkflowEvent[] = [];

  @Step({ restartable: true, maxRetries: 2 })
  async retryStep() {
    this.attemptCount++;
    if (this.attemptCount < 2) {
      throw new Error('Retry me');
    }
  }

  async run() {
    this.addObserver({
      onLog: () => {},
      onEvent: (e) => this.events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });
    await this.retryStep();
  }
}

async function test() {
  const wf = new RetryEventWorkflow();
  await wf.run();

  const retryEvents = wf.events.filter(e => e.type === 'stepRetry');
  console.log(`Retry events: ${retryEvents.length}`);  // Should be 1

  if (retryEvents[0]?.type === 'stepRetry') {
    console.log(`Retry count: ${retryEvents[0].retryCount}`);  // Should be 1
    console.log(`Analysis:`, retryEvents[0].analysis);
  }
}

test().catch(console.error);
EOF

node --loader ts-node/esm /tmp/retry-event-test.ts
# Expected: 1 retry event with retryCount: 1 and valid analysis

# Test error criteria matching
cat > /tmp/error-criteria-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class CriteriaWorkflow extends Workflow {
  attemptCount = 0;

  @Step({
    restartable: true,
    maxRetries: 3,
    retryOn: [
      { code: 'TEMPORARY_ERROR' },
      /timeout/i
    ]
  })
  async selectiveStep() {
    this.attemptCount++;
    if (this.attemptCount === 1) {
      throw new Error('TEMPORARY_ERROR');  // Should retry
    }
    if (this.attemptCount === 2) {
      throw new Error('Connection timeout');  // Should retry
    }
  }

  async run() {
    await this.selectiveStep();
  }
}

async function test() {
  const wf = new CriteriaWorkflow();
  await wf.run();
  console.log(`Attempts: ${wf.attemptCount}`);  // Should be 3
}

test().catch(console.error);
EOF

node --loader ts-node/esm /tmp/error-criteria-test.ts
# Expected: 3 attempts (1 initial + 2 retries matching criteria)
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Performance test - retry delay accuracy
cat > /tmp/delay-timing-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class DelayTimingWorkflow extends Workflow {
  timestamps: number[] = [];

  @Step({ restartable: true, maxRetries: 3, retryDelayMs: 500 })
  async timedStep() {
    this.timestamps.push(Date.now());
    throw new Error('Always fails');
  }

  async run() {
    try {
      await this.timedStep();
    } catch (err) {
      // Expected to fail
      console.log(`Total attempts: ${this.timestamps.length}`);
      for (let i = 1; i < this.timestamps.length; i++) {
        const delay = this.timestamps[i] - this.timestamps[i-1];
        console.log(`Delay ${i}: ${delay}ms`);
        if (delay < 500 || delay > 600) {
          console.error(`Delay out of range: ${delay}ms`);
        }
      }
    }
  }
}

const wf = new DelayTimingWorkflow();
wf.run().catch(console.error);
EOF

node --loader ts-node/esm /tmp/delay-timing-test.ts
# Expected: All delays within 500-600ms range (allowing for execution time)

# Stress test - multiple retrying steps in parallel
cat > /tmp/parallel-retry-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class ParallelRetryWorkflow extends Workflow {
  results: string[] = [];

  @Step({ restartable: true, maxRetries: 2 })
  async step1() {
    throw new Error('Fail 1');
  }

  @Step({ restartable: true, maxRetries: 2 })
  async step2() {
    throw new Error('Fail 2');
  }

  async run() {
    const steps = [this.step1(), this.step2()];
    for (const step of steps) {
      try {
        await step;
      } catch (err) {
        this.results.push((err as Error).message);
      }
    }
  }
}

const wf = new ParallelRetryWorkflow();
wf.run().then(() => console.log('Results:', wf.results));
EOF

node --loader ts-node/esm /tmp/parallel-retry-test.ts
# Expected: Both steps fail after retries, results contain both errors

# Edge case - zero maxRetries
cat > /tmp/zero-retries-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class ZeroRetriesWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 0 })
  async noRetryStep() {
    this.attemptCount++;
    throw new Error('Should not retry');
  }

  async run() {
    try {
      await this.noRetryStep();
    } catch (err) {
      console.log(`Attempts: ${this.attemptCount}`);  // Should be 1
    }
  }
}

const wf = new ZeroRetriesWorkflow();
wf.run().catch(console.error);
EOF

node --loader ts-node/esm /tmp/zero-retries-test.ts
# Expected: Only 1 attempt (no retries when maxRetries = 0)

# Memory leak check - ensure no accumulation on retries
cat > /tmp/memory-check-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class MemoryCheckWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true, maxRetries: 100 })
  async manyRetriesStep() {
    this.attemptCount++;
    throw new Error('Fail');
  }

  async run() {
    try {
      await this.manyRetriesStep();
    } catch (err) {
      console.log(`Attempts: ${this.attemptCount}`);
      console.log(`Events: ${this.node.events.length}`);
      console.log(`Logs: ${this.node.logs.length}`);
    }
  }
}

const wf = new MemoryCheckWorkflow();
wf.run().catch(console.error);
EOF

node --loader ts-node/esm /tmp/memory-check-test.ts
# Expected: 101 attempts, reasonable number of events/logs
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Type checking passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] All existing tests pass: `npm run test`
- [ ] New retry tests pass: `npm run test -- src/__tests__/unit/decorators/step-restart.test.ts`
- [ ] Retry loop wraps try-catch correctly
- [ ] Retry condition checks work (restartable + retryCount + criteria)
- [ ] stepRetry event emitted with correct structure
- [ ] Delay utility imported and used correctly
- [ ] Backward compatibility maintained

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Retry only occurs when `restartable: true`
- [ ] `maxRetries` default is 3, configurable
- [ ] `retryDelayMs` default is 1000ms, configurable
- [ ] `retryOn` criteria matching works (string, regex, function)
- [ ] stepRetry event contains all required fields
- [ ] Events emitted in correct order (stepStart → stepRetry → stepEnd)
- [ ] Error thrown when not restartable or max retries exceeded
- [ ] Loop exits on success and returns result
- [ ] Delay timing honored (tested)

### Code Quality Validation

- [ ] Follows existing codebase patterns (regular function, not arrow)
- [ ] Error criterion matching with proper type narrowing (function first)
- [ ] Uses error.message as fallback for error.code
- [ ] stepStart emitted only once (not on retry)
- [ ] stepRetry emitted on each retry attempt
- [ ] Preserves all existing behavior (timing, logging, snapshots)
- [ ] No memory leaks on retry (event/log accumulation reasonable)
- [ ] Proper async/await usage in while loop
- [ ] Fallback error throw for unexpected loop exit

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] Comments explain critical sections (retry condition, event emission)
- [ ] JSDoc comments updated if needed
- [ ] Implementation matches work item contract exactly
- [ ] Integration with related tasks verified (P1.M1.T1.S1, P1.M1.T1.S3, P1.M1.T2.S1)

---

## Anti-Patterns to Avoid

- ❌ **Don't** use arrow function for `stepWrapper` - use regular function to preserve `this`
- ❌ **Don't** use `retryCount < maxRetries` as loop condition - must be `<=` for correct total attempts
- ❌ **Don't** check discriminant properties before `typeof === 'function'` - breaks type narrowing
- ❌ **Don't** use `error.code` directly - use `error.message` as fallback (no dedicated code field)
- ❌ **Don't** call `delay()` without `await` - won't actually wait
- ❌ **Don't** emit `stepStart` on each retry - only emit once at start
- ❌ **Don't** increment `retryCount` before checking criteria - causes off-by-one errors
- ❌ **Don't** forget to return result on success - loop won't exit
- ❌ **Don't** modify existing try-catch logic - only wrap it in while loop
- ❌ **Don't** skip error event emission when not retrying - must emit before throw

---

## Confidence Score

**9/10** - One-pass implementation success likelihood is very high

**Reasoning**:
- ✅ Implementation already exists in codebase (commit e9a53b9)
- ✅ All required context gathered and documented
- ✅ Specific file paths, line numbers, and code patterns provided
- ✅ Existing test coverage comprehensive (479 lines in step-restart.test.ts)
- ✅ Type definitions complete from P1.M1.T1.S1, P1.M1.T1.S3, P1.M1.T2.S1
- ✅ Validation commands are project-specific and verified
- ✅ Implementation patterns well-established in codebase
- ✅ All dependencies (delay utility, event types) in place
- ⚠️ Minor risk: Edge cases in error criterion matching (documented in gotchas)
- ⚠️ Minor risk: Loop condition off-by-one (documented with examples)

**Validation**: The completed PRP provides everything needed to implement (or verify) the retry loop successfully. The implementation already exists in the codebase, so this PRP serves as comprehensive documentation of what was implemented and how to validate it. All requirements from the work item contract are met.
