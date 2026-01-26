# Product Requirement Prompt (PRP): Implement Error Collection in Workflow Execution

---

## Goal

**Feature Goal**: Modify workflow `run()` execution to collect errors when `errorMergeStrategy.enabled` is true, enabling workflow-level error merge for sequential steps (similar to @Task concurrent error merge).

**Deliverable**: Modified workflow execution in `src/core/workflow.ts` that supports error merge for sequential steps without breaking existing behavior (default disabled).

**Success Definition**:
- [ ] Sequential steps collect errors when `config.errorMergeStrategy?.enabled === true`
- [ ] Execution continues after step failures when error merge is enabled
- [ ] After run() completes, collected errors are merged via `mergeWorkflowErrors()`
- [ ] Single error throws directly, multiple errors throw `WorkflowAggregateError`
- [ ] Default behavior (undefined `errorMergeStrategy`) throws first error immediately
- [ ] Error event emitted with merged error before throwing
- [ ] TypeScript compiles: `npm run lint`
- [ ] No breaking changes to existing workflow behavior

---

## User Persona

**Target User**: Implementation agent working on P2.M4.T1.S2 (error collection implementation).

**Use Case**: Implementing workflow-level error collection for sequential steps, enabling workflows to collect all step errors instead of stopping on the first failure when configured.

**User Journey**:
1. Read workflow execution code in `src/core/workflow.ts`
2. Understand current error handling (immediate throw on first failure)
3. Implement error collection mechanism when `errorMergeStrategy.enabled` is true
4. Continue execution after step failures when collecting errors
5. Merge collected errors at end using `mergeWorkflowErrors()` utility
6. Throw appropriate error (single or aggregate)
7. Emit error event before throwing

**Pain Points Addressed**:
- **Limited Error Context**: Sequential workflows only see first error, not all failures
- **Incomplete Error Visibility**: Cannot diagnose multiple failures in a single workflow run
- **Inconsistent Error Handling**: @Task has error merge, workflow sequential execution does not
- **Debugging Difficulty**: Must re-run workflows multiple times to see all failures

---

## Why

**Business Value and User Impact**:
- Completes PRD P2.M4 milestone ("Workflow-Level Error Merge Strategy")
- Provides consistent error handling across @Task and workflow levels
- Enables comprehensive error diagnosis in single workflow run
- Reduces debugging time by showing all failures at once

**Integration with Existing Features**:
- Reuses existing `ErrorMergeStrategy` interface from `src/types/error-strategy.ts` (added in P2.M4.T1.S1)
- Reuses existing `mergeWorkflowErrors` utility from `src/utils/workflow-error-utils.ts`
- Follows @Task decorator error collection pattern (established pattern)
- Maintains backward compatibility (default disabled, throws first error)
- Integrates with existing error event emission

**Problems Solved**:
- **Error Context Gap**: Sequential workflows now can collect all errors like concurrent tasks
- **Debugging Friction**: Single run shows all failures, not just first
- **API Consistency**: Workflow and @Task error handling now aligned
- **Developer Experience**: Easier to diagnose multi-step workflow failures

---

## What

**User-Visible Behavior and Technical Requirements**:

### Before (Current Behavior)

```typescript
// Sequential workflow - stops on first error
class MyWorkflow extends Workflow {
  async run() {
    await this.step1(); // Success
    await this.step2(); // Throws error
    await this.step3(); // NEVER RUNS
  }
}
// Result: Only sees step2 error, step3 never executed
```

### After (New Behavior with errorMergeStrategy.enabled)

```typescript
// Sequential workflow with error merge - collects all errors
class MyWorkflow extends Workflow {
  static config = {
    errorMergeStrategy: { enabled: true }
  };

  async run() {
    await this.step1(); // Success
    await this.step2(); // Throws error - COLLECTED
    await this.step3(); // Runs, also throws error - COLLECTED
    await this.step4(); // Success
  }
  // After run(): Merges step2 + step3 errors, throws WorkflowAggregateError
}
// Result: Sees both step2 and step3 errors, all steps executed
```

### Default Behavior (No Configuration)

```typescript
// No errorMergeStrategy - backward compatible
class MyWorkflow extends Workflow {
  async run() {
    await this.step1(); // Success
    await this.step2(); // Throws error
    await this.step3(); // NEVER RUNS (current behavior)
  }
}
// Result: Throws step2 error immediately (existing behavior)
```

### Success Criteria

- [ ] Errors collected when `config.errorMergeStrategy?.enabled === true`
- [ ] Execution continues after step failures when collecting
- [ ] Errors merged via `mergeWorkflowErrors()` at end of run()
- [ ] Single error throws directly (not wrapped)
- [ ] Multiple errors throw `WorkflowAggregateError`
- [ ] Error event emitted before throwing
- [ ] Default behavior unchanged (throws first error immediately)
- [ ] TypeScript compiles without errors
- [ ] No breaking changes to existing workflows

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file paths and line numbers to modify
- Complete implementation pattern from @Task decorator
- mergeWorkflowErrors utility signature and usage
- ErrorMergeStrategy interface (from P2.M4.T1.S1 PRP)
- Current execution flow analysis
- Backward compatibility requirements
- Validation commands

---

### Documentation & References

```yaml
# MUST READ - Target file to modify
- file: src/core/workflow.ts
  why: Contains run() and runFunctional() methods that need error collection
  pattern: Current error handling in runFunctional() (lines 844-862)
  lines: 805-863 (run() and runFunctional() methods)
  gotcha: Must handle both functional workflows (runFunctional) and class-based (subclass override)

# MUST READ - Error merge utility to use
- file: src/utils/workflow-error-utils.ts
  why: Provides mergeWorkflowErrors() function for error aggregation
  pattern: Function signature and return type
  gotcha: Parameter order: errors, taskName, parentWorkflowId, totalChildren
  critical: This is the EXACT function to call for error merging

# MUST READ - Error merge strategy interface (from P2.M4.T1.S1)
- file: src/types/error-strategy.ts
  why: Defines ErrorMergeStrategy interface (enabled, combine function)
  pattern: Check `config.errorMergeStrategy?.enabled` before collecting
  lines: 6-13
  gotcha: Use optional chaining - `config.errorMergeStrategy?.enabled`

# MUST READ - Reference implementation from @Task decorator
- file: src/decorators/task.ts
  why: Shows pattern for error collection and merging
  pattern: Promise.allSettled, filter rejected, merge or throw first
  lines: 106-145 (concurrent execution with error merge)
  critical: This is the pattern to follow for workflow-level implementation

# MUST READ - WorkflowError interface
- file: src/types/error.ts
  why: Type of errors to collect and merge
  pattern: Error structure with message, original, workflowId, stack, state, logs
  gotcha: Cast errors to WorkflowError when collecting

# MUST READ - WorkflowConfig interface (from P2.M4.T1.S1)
- file: src/types/workflow-context.ts
  why: Contains errorMergeStrategy field (added in P2.M4.T1.S1)
  pattern: Optional field accessed via this.config.errorMergeStrategy
  lines: 144-153 (WorkflowConfig interface)
  gotcha: Field was added in P2.M4.T1.S1, assume it exists

# MUST READ - Step execution in functional workflows
- file: src/core/workflow-context.ts
  why: Shows ctx.step() error handling pattern
  pattern: Try-catch with immediate throw (lines 207-267)
  lines: 107-268
  gotcha: For functional workflows, need to modify step() to collect when merge enabled

# MUST READ - Research documentation
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S2/research/mergeWorkflowErrors-analysis.md
  why: Complete analysis of mergeWorkflowErrors utility
  section: Complete Function Signature, Parameter Types, Return Type and Behavior
  critical: Shows exact function signature and usage pattern

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S2/research/task-decorator-error-collection.md
  why: Reference implementation for error collection pattern
  section: Control Flow When Errors Are Collected, Pattern to Follow
  critical: Shows exact pattern to replicate at workflow level

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S2/research/sequential-step-execution.md
  why: Analysis of current sequential execution and error handling
  section: Control Flow on Step Failure, Implementation Implications
  critical: Shows current error handling locations and behavior

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S2/research/WorkflowAggregateError-analysis.md
  why: Understanding the aggregate error structure
  section: Properties and Structure, Error Message Formatting Behavior
  critical: Shows what the merged error looks like

# MUST READ - Previous PRP for context
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S1/PRP.md
  why: Shows what errorMergeStrategy interface was added
  section: Goal, What, All Needed Context
  gotcha: P2.M4.T1.S1 added the field, P2.M4.T1.S2 implements the logic
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts                    # TARGET FILE - Modify run() and runFunctional()
│   └── workflow-context.ts            # MODIFY - ctx.step() for functional workflows
├── types/
│   ├── error-strategy.ts              # ErrorMergeStrategy interface (from P2.M4.T1.S1)
│   ├── error.ts                       # WorkflowError interface
│   └── workflow-context.ts            # WorkflowConfig with errorMergeStrategy field
├── utils/
│   └── workflow-error-utils.ts        # mergeWorkflowErrors function (USE THIS)
├── decorators/
│   └── task.ts                        # @Task decorator (PATTERN REFERENCE)
└── __tests__/
    └── (P2.M4.T1.S3 will add tests here)

plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/
└── P2M4T1S2/
    ├── PRP.md                         # THIS FILE
    └── research/                      # Research findings directory
        ├── mergeWorkflowErrors-analysis.md
        ├── task-decorator-error-collection.md
        ├── sequential-step-execution.md
        └── WorkflowAggregateError-analysis.md
```

---

### Desired Codebase Tree with Files to be Added

```bash
# MODIFY existing files:

# 1. src/core/workflow.ts
# - Add private collectedErrors array
# - Modify runFunctional() to collect errors when mergeStrategy.enabled
# - Add merge and throw logic at end of runFunctional()
# - Keep default behavior (throw immediately) when mergeStrategy not enabled

# 2. src/core/workflow-context.ts
# - Modify step() method to support error collection mode
# - Pass errorMergeStrategy config to step()
# - Collect errors instead of throwing when in collection mode
# - Keep default behavior (throw immediately) when not in collection mode

# NO new files - this is implementation only
# Tests will be added in P2.M4.T1.S3
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: ErrorMergeStrategy field added in P2.M4.T1.S1
// Assume it exists in WorkflowConfig interface:
// interface WorkflowConfig {
//   errorMergeStrategy?: ErrorMergeStrategy;
// }

// CRITICAL: mergeWorkflowErrors function signature
// mergeWorkflowErrors(errors, taskName, parentWorkflowId, totalChildren)
// - errors: WorkflowError[] - Array of errors to merge
// - taskName: string - Name of the task/workflow
// - parentWorkflowId: string - Parent workflow ID
// - totalChildren: number - Total number of operations

// CRITICAL: WorkflowAggregateError is NOT a formal class
// It's a plain object pattern created by mergeWorkflowErrors
// Detect via: error.original?.name === 'WorkflowAggregateError'

// CRITICAL: Two execution modes to handle
// 1. Functional workflows (executor exists): runFunctional() method
// 2. Class-based workflows (subclass): Subclass overrides run()
//    We MUST modify runFunctional() for functional workflows
//    Class-based workflows override run(), so we can't modify their execution

// CRITICAL: Default behavior MUST NOT CHANGE
// When errorMergeStrategy is undefined or enabled=false:
// - Throw first error immediately
// - Stop execution on first failure
// - This is backward compatible behavior

// CRITICAL: Only collect when config.errorMergeStrategy?.enabled === true
// Use optional chaining: this.config.errorMergeStrategy?.enabled
// Don't check truthiness - explicit false should disable collection

// CRITICAL: WorkflowError interface
// interface WorkflowError {
//   message: string;
//   original: unknown;
//   workflowId: string;
//   stack?: string;
//   state: SerializedWorkflowState;
//   logs: LogEntry[];
// }

// CRITICAL: mergeWorkflowErrors creates specific message format
// "X of Y concurrent child workflows failed in task 'taskName'"
// For workflows, we'll adapt: "X of Y steps failed in workflow 'workflowName'"

// CRITICAL: Event emission pattern
// Always emit error event before throwing:
// this.emitEvent({
//   type: 'error',
//   node: this.node,
//   error: mergedError
// });

// CRITICAL: Functional workflow step execution is via ctx.step()
// Each ctx.step() call is an awaited promise
// Need to catch errors from ctx.step() when in collection mode

// CRITICAL: Custom combine function support
// If config.errorMergeStrategy?.combine exists, use it instead of mergeWorkflowErrors
// This allows users to provide custom error aggregation logic

// CRITICAL: Total operations count
// For mergeWorkflowErrors, need total number of steps/operations
// This is for context in error message
// Can track as steps are executed or use a counter

// CRITICAL: Logs aggregation
// mergeWorkflowErrors aggregates logs from all errors
// This is automatic - no need to manually aggregate

// CRITICAL: Stack trace preservation
// mergeWorkflowErrors uses first error's stack trace
// This is automatic - no need to manually handle

// CRITICAL: State preservation
// mergeWorkflowErrors uses first error's state
// This is automatic - no need to manually handle
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - using existing types:

```typescript
// From src/types/error-strategy.ts (added in P2.M4.T1.S1)
interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}

// From src/types/error.ts
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}

// From src/utils/workflow-error-utils.ts (existing)
function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ AND UNDERSTAND CURRENT EXECUTION
  - READ: src/core/workflow.ts (lines 805-863)
  - UNDERSTAND: runFunctional() method structure
  - UNDERSTAND: Current error handling (try-catch, emit event, throw)
  - NOTE: Execution stops on first error
  - NOTE: No error collection mechanism exists

Task 2: ADD ERROR COLLECTION STATE TO WORKFLOW CLASS
  - FILE: src/core/workflow.ts
  - LOCATION: In Workflow class private properties (around line 73)
  - ADD: private collectedErrors: WorkflowError[] = [];
  - ADD: private totalOperations: number = 0;
  - ADD: private operationCounter: number = 0;
  - VERIFY: Properties are private (encapsulation)

Task 3: MODIFY runFunctional() TO SUPPORT ERROR COLLECTION
  - FILE: src/core/workflow.ts
  - LOCATION: runFunctional() method (lines 819-863)
  - MODIFY: Try-catch block to check errorMergeStrategy before throwing
  - ADD: Error collection when this.config.errorMergeStrategy?.enabled === true
  - PRESERVE: Default behavior (throw immediately) when merge not enabled
  - PATTERN: Follow @Task decorator pattern (src/decorators/task.ts:121-139)

  Implementation approach:
  ```typescript
  private async runFunctional(): Promise<WorkflowResult<T>> {
    if (!this.executor) {
      throw new Error('No executor provided');
    }

    const startTime = Date.now();
    this.setStatus('running');

    // Reset error collection state
    this.collectedErrors = [];
    this.operationCounter = 0;

    // Create workflow context with error merge strategy
    const ctx = createWorkflowContext(
      this as unknown as Parameters<typeof createWorkflowContext>[0],
      this.parent?.id,
      this.config.enableReflection ? { enabled: true } : undefined,
      this.config.autoValidateResponses ?? true,
      this.config.errorMergeStrategy // Pass to context
    );

    try {
      const result = await this.executor(ctx);
      this.setStatus('completed');

      // Check if we should merge collected errors
      if (this.collectedErrors.length > 0) {
        if (this.config.errorMergeStrategy?.enabled) {
          // Merge errors
          const mergedError = this.config.errorMergeStrategy?.combine
            ? this.config.errorMergeStrategy.combine(this.collectedErrors)
            : mergeWorkflowErrors(
                this.collectedErrors,
                this.name || this.id,
                this.id,
                this.operationCounter
              );

          // Emit error event with merged error
          this.emitEvent({
            type: 'error',
            node: this.node,
            error: mergedError,
          });

          // Throw merged error
          throw mergedError;
        } else {
          // Throw first error (backward compatibility)
          throw this.collectedErrors[0];
        }
      }

      return {
        data: result,
        node: this.node,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Handle errors thrown directly (not collected)
      if (!this.config.errorMergeStrategy?.enabled) {
        this.setStatus('failed');

        this.emitEvent({
          type: 'error',
          node: this.node,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            original: error,
            workflowId: this.id,
            stack: error instanceof Error ? error.stack : undefined,
            state: getObservedState(this),
            logs: [...this.node.logs] as LogEntry[],
          },
        });

        throw error;
      }

      // If in collection mode, error should have been collected already
      // Re-throw if it somehow escaped collection
      throw error;
    }
  }
  ```

Task 4: MODIFY WorkflowContext.step() TO SUPPORT ERROR COLLECTION
  - FILE: src/core/workflow-context.ts
  - LOCATION: step() method (lines 107-268)
  - MODIFY: Constructor to accept errorMergeStrategy parameter
  - MODIFY: step() error handling to check collection mode
  - ADD: Error collection when errorMergeStrategy?.enabled === true
  - ADD: Method to increment operation counter
  - PRESERVE: Default behavior (throw immediately) when not in collection mode

  Implementation approach:
  ```typescript
  // In constructor (around line 77)
  constructor(
    workflow: WorkflowLike,
    workflowId: string,
    parentWorkflowId: string | undefined,
    reflectionConfig?: ReflectionConfig,
    autoValidateResponses: boolean = true,
    private errorMergeStrategy?: ErrorMergeStrategy  // NEW PARAMETER
  )

  // In step() method, modify error handling (around line 207)
  } catch (error) {
    lastError = error as Error;

    // Update step node status
    stepNode.status = 'failed';

    // Check if we should collect this error
    if (this.errorMergeStrategy?.enabled) {
      // Create WorkflowError
      const workflowError: WorkflowError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        original: error,
        workflowId: this.workflowId,
        stack: error instanceof Error ? error.stack : undefined,
        state: getObservedState(this.workflow),
        logs: [...this.workflow.node.logs] as LogEntry[],
      };

      // Collect error instead of throwing
      (this.workflow as any).collectedErrors?.push(workflowError);
      (this.workflow as any).operationCounter++;

      // Emit error event
      this.workflow.emitEvent({
        type: 'error',
        node: stepNode,
        error: workflowError,
      });

      // Rebuild event tree
      this.eventTreeImpl.rebuild(this.workflow.node);

      // Return early (don't throw, continue execution)
      return undefined as T;
    }

    // Default behavior: throw immediately
    // ... existing error handling code (lines 214-245)
  }
  ```

Task 5: MODIFY createWorkflowContext TO PASS ERROR MERGE STRATEGY
  - FILE: src/core/workflow-context.ts
  - LOCATION: createWorkflowContext function (around line 300+)
  - MODIFY: Function signature to accept errorMergeStrategy parameter
  - MODIFY: Pass errorMergeStrategy to WorkflowContext constructor
  - PRESERVE: All existing parameters

  Implementation approach:
  ```typescript
  export function createWorkflowContext(
    workflow: Parameters<WorkflowContext['workflow']>[0],
    parentWorkflowId?: string,
    reflectionConfig?: ReflectionConfig,
    autoValidateResponses?: boolean,
    errorMergeStrategy?: ErrorMergeStrategy  // NEW PARAMETER
  ): WorkflowContext {
    // ... existing code
    // Update constructor call to include errorMergeStrategy
  }
  ```

Task 6: RUN TYPESCRIPT COMPILATION
  - COMMAND: npm run lint
  - VERIFY: Zero type errors
  - VERIFY: No "Property does not exist" errors
  - DEBUG: If errors, check optional chaining and type assertions

Task 7: VERIFY BACKWARD COMPATIBILITY
  - MANUAL: Test that workflows without errorMergeStrategy still throw first error
  - VERIFY: Execution stops on first error when errorMergeStrategy not enabled
  - VERIFY: Error event emitted before throwing
  - VERIFY: Status set to 'failed' on error

Task 8: VERIFY ERROR COLLECTION BEHAVIOR
  - MANUAL: Test workflow with errorMergeStrategy.enabled = true
  - VERIFY: All steps execute even when some fail
  - VERIFY: Errors collected in collectedErrors array
  - VERIFY: mergeWorkflowErrors called at end
  - VERIFY: WorkflowAggregateError thrown for multiple errors
  - VERIFY: Single error thrown directly (not wrapped)

Task 9: VERIFY CUSTOM COMBINE FUNCTION
  - MANUAL: Test workflow with custom combine function
  - VERIFY: Custom combine function called with collected errors
  - VERIFY: Custom error returned from combine function
  - VERIFY: Custom error thrown instead of default merged error

Task 10: FINAL VALIDATION
  - COMMAND: npm run lint (final check)
  - VERIFY: All TypeScript errors resolved
  - VERIFY: No breaking changes to existing behavior
  - VERIFY: Error collection works when enabled
  - VERIFY: Default behavior preserved when disabled
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Check error merge strategy (optional chaining)
if (this.config.errorMergeStrategy?.enabled) {
  // Collect errors
} else {
  // Throw immediately (default behavior)
}

// PATTERN 2: Collect errors
const workflowError: WorkflowError = {
  message: error instanceof Error ? error.message : 'Unknown error',
  original: error,
  workflowId: this.workflowId,
  stack: error instanceof Error ? error.stack : undefined,
  state: getObservedState(this.workflow),
  logs: [...this.workflow.node.logs] as LogEntry[],
};
this.collectedErrors.push(workflowError);

// PATTERN 3: Merge errors at end
if (this.collectedErrors.length > 0) {
  // Check if we should merge or throw first
  if (this.config.errorMergeStrategy?.enabled) {
    // Use custom combine or default merger
    const mergedError = this.config.errorMergeStrategy?.combine
      ? this.config.errorMergeStrategy.combine(this.collectedErrors)
      : mergeWorkflowErrors(
          this.collectedErrors,
          this.name || this.id,
          this.id,
          this.operationCounter
        );

    // Emit error event
    this.emitEvent({
      type: 'error',
      node: this.node,
      error: mergedError,
    });

    // Throw merged error
    throw mergedError;
  } else {
    // Throw first error (backward compatibility)
    throw this.collectedErrors[0];
  }
}

// GOTCHA 1: Use optional chaining for errorMergeStrategy check
// this.config.errorMergeStrategy?.enabled  // ✅ CORRECT
// this.config.errorMergeStrategy.enabled   // ❌ WRONG (throws if undefined)

// GOTCHA 2: Only collect when enabled is true
// enabled: false should NOT collect errors (backward compatible)
// undefined should NOT collect errors (backward compatible)
// Only enabled: true should collect errors

// GOTCHA 3: Pass errorMergeStrategy to context
// createWorkflowContext(..., errorMergeStrategy)
// Context needs to know whether to collect or throw

// GOTCHA 4: Custom combine function takes precedence
// if config.errorMergeStrategy?.combine exists, use it
// Otherwise, use mergeWorkflowErrors utility

// GOTCHA 5: Track operation count for error message
// Increment counter for each step executed
// Use in mergeWorkflowErrors: totalChildren parameter

// GOTCHA 6: WorkflowAggregateError is not a formal type
// It's created by mergeWorkflowErrors
// Detect via: error.original?.name === 'WorkflowAggregateError'

// GOTCHA 7: Single error should not be wrapped
// If only one error collected, throw it directly
// Don't wrap single error in WorkflowAggregateError

// GOTCHA 8: Always emit error event before throwing
// Whether merging or throwing single error
// Event emission is part of error handling pattern

// GOTCHA 9: Functional vs class-based workflows
// We modify runFunctional() for functional workflows
// Class-based workflows override run(), so we can't modify them directly
// They need to use ctx.step() which supports error collection

// GOTCHA 10: Validation errors are not retried
// isValidationError check in step() should throw immediately
// Even in collection mode, validation errors should throw immediately
```

---

### Integration Points

```yaml
MODIFIED FILES:
  - src/core/workflow.ts:
    add: private collectedErrors: WorkflowError[] = []
    add: private totalOperations: number = 0
    add: private operationCounter: number = 0
    modify: runFunctional() to support error collection
    preserve: Default behavior (throw immediately)

  - src/core/workflow-context.ts:
    modify: WorkflowContext constructor to accept errorMergeStrategy
    modify: step() to collect errors when enabled
    modify: createWorkflowContext to pass errorMergeStrategy
    preserve: Default behavior (throw immediately)

DEPENDENCIES:
  - ErrorMergeStrategy interface (src/types/error-strategy.ts) - from P2.M4.T1.S1
  - mergeWorkflowErrors utility (src/utils/workflow-error-utils.ts) - existing
  - WorkflowError interface (src/types/error.ts) - existing
  - @Task decorator pattern (src/decorators/task.ts) - reference implementation

NO CHANGES TO:
  - src/types/error-strategy.ts (P2.M4.T1.S1 added errorMergeStrategy)
  - src/utils/workflow-error-utils.ts (existing utility, use as-is)
  - src/decorators/task.ts (reference pattern only)
  - Test files (P2.M4.T1.S3 will create)

SCOPE BOUNDARIES:
  - This task: Error collection implementation
  - Previous task (P2.M4.T1.S1): Interface extension
  - Next task (P2.M4.T1.S3): Tests
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making changes - fix before proceeding
npm run lint       # TypeScript type checking via tsc --noEmit

# Expected: Zero type errors. If errors exist:
# - Check optional chaining syntax: this.config.errorMergeStrategy?.enabled
# - Check WorkflowError type casting
# - Check private property declarations
# - Check method signatures

# Common errors and fixes:
# "Property 'collectedErrors' does not exist" → Add private property to Workflow class
# "Cannot find name 'WorkflowError'" → Import from src/types/error.js
# "Property 'errorMergeStrategy' does not exist" → Check P2.M4.T1.S1 was completed
```

### Level 2: Manual Testing (Component Validation)

```bash
# Test 1: Default behavior (no errorMergeStrategy)
cat > /tmp/test-default.ts << 'EOF'
import { Workflow } from './src/core/workflow.js';

class TestWorkflow extends Workflow {
  async run() {
    await this.step1();
    await this.step2();  // This will throw
    await this.step3();  // Should NOT execute
  }

  async step1() { console.log('Step 1'); }
  async step2() { throw new Error('Step 2 error'); }
  async step3() { console.log('Step 3'); }
}

const wf = new TestWorkflow({ name: 'Test' });
await wf.run().catch(console.error);
EOF

# Expected: "Step 2 error" thrown, "Step 3" never executed
# This confirms backward compatibility

# Test 2: Error collection enabled
cat > /tmp/test-collection.ts << 'EOF'
import { Workflow } from './src/core/workflow.js';

class TestWorkflow extends Workflow {
  static config = {
    errorMergeStrategy: { enabled: true }
  };

  async run() {
    await this.step1();
    await this.step2();  // Will throw, but collection continues
    await this.step3();  // Will execute
    await this.step4();  // Will throw, but collection continues
  }

  async step1() { console.log('Step 1'); }
  async step2() { throw new Error('Step 2 error'); }
  async step3() { console.log('Step 3'); }
  async step4() { throw new Error('Step 4 error'); }
}

const wf = new TestWorkflow({ name: 'Test', errorMergeStrategy: { enabled: true } });
await wf.run().catch((err) => {
  console.log('Caught:', err.message);
  console.log('Original:', err.original?.name);
});
EOF

# Expected: All steps execute, WorkflowAggregateError thrown with 2 errors
# This confirms error collection works

# Test 3: Custom combine function
cat > /tmp/test-custom.ts << 'EOF'
import { Workflow } from './src/core/workflow.js';

class TestWorkflow extends Workflow {
  async run() {
    await this.step1();
    await this.step2();
  }

  async step1() { throw new Error('Error 1'); }
  async step2() { throw new Error('Error 2'); }
}

const wf = new TestWorkflow({
  name: 'Test',
  errorMergeStrategy: {
    enabled: true,
    combine: (errors) => ({
      message: `Custom merge: ${errors.length} errors`,
      original: { name: 'CustomAggregateError', errors },
      workflowId: wf.id,
      logs: []
    })
  }
});
await wf.run().catch((err) => {
  console.log('Caught:', err.message);
  console.log('Type:', err.original?.name);
});
EOF

# Expected: "Custom merge: 2 errors" message
# This confirms custom combine function works
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with existing @Task error merge
# Verify both patterns can coexist

cat > /tmp/test-integration.ts << 'EOF'
import { Workflow, Task } from './src/index.js';

class ParentWorkflow extends Workflow {
  async run() {
    // Test that @Task error merge still works
    await this.concurrentTask();
  }

  @Task({
    concurrent: true,
    errorMergeStrategy: { enabled: true }
  })
  async concurrentTask() {
    return [
      this.createChild('Child1', false),
      this.createChild('Child2', true),  // Will fail
      this.createChild('Child3', false),
    ];
  }

  createChild(name: string, fail: boolean) {
    return new (class extends Workflow {
      async run() {
        if (fail) throw new Error(`${name} failed`);
        return `${name} success`;
      }
    })({ name });
  }
}

const wf = new ParentWorkflow({
  name: 'Parent',
  errorMergeStrategy: { enabled: true }
});
await wf.run().catch(console.error);
EOF

# Expected: @Task concurrent error merge works, workflow-level error merge works
# This confirms both patterns coexist

# Verify error event emission
# Check that error events are emitted for collected errors
# Use workflow event listener to verify
```

### Level 4: Edge Case Validation

```bash
# Test edge cases

# 1. All steps succeed - no errors
# Expected: Workflow completes successfully, no error thrown

# 2. All steps fail - all errors collected
# Expected: WorkflowAggregateError with all errors

# 3. Mix of success and failure - only errors collected
# Expected: WorkflowAggregateError with only failed step errors

# 4. Single step fails - single error thrown (not wrapped)
# Expected: Single error thrown directly, not WorkflowAggregateError

# 5. Validation errors - should throw immediately even in collection mode
# Expected: Validation error thrown immediately, not collected

# 6. Nested workflows with error merge
# Expected: Each workflow handles its own error collection

# 7. Reflection retry with error collection
# Expected: Retried steps still collected if they fail

# 8. Workflow with no steps - empty workflow
# Expected: No errors, completes successfully

# 9. Workflow with errorMergeStrategy.enabled = false
# Expected: Default behavior (throw first error)

# 10. Workflow with undefined errorMergeStrategy
# Expected: Default behavior (throw first error)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles: `npm run lint`
- [ ] No type errors in output
- [ ] Private properties added to Workflow class
- [ ] runFunctional() modified for error collection
- [ ] WorkflowContext.step() modified for error collection
- [ ] createWorkflowContext() passes errorMergeStrategy
- [ ] Optional chaining used for errorMergeStrategy check
- [ ] WorkflowError type imported and used
- [ ] mergeWorkflowErrors utility imported and used

### Feature Validation

- [ ] Default behavior preserved (throws first error)
- [ ] Error collection works when enabled
- [ ] Execution continues after step failures when collecting
- [ ] mergeWorkflowErrors called at end of run()
- [ ] Single error thrown directly (not wrapped)
- [ ] Multiple errors throw WorkflowAggregateError
- [ ] Custom combine function works
- [ ] Error event emitted before throwing
- [ ] Status set correctly on error
- [ ] All steps execute when collection enabled

### Code Quality Validation

- [ ] Follows @Task decorator error collection pattern
- [ ] Backward compatible (default behavior unchanged)
- [ ] No breaking changes to existing workflows
- [ ] Type-safe implementation
- [ ] Clear error messages
- [ ] Proper event emission
- [ ] Clean separation of collection and merge logic

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] JSDoc comments updated if needed
- [ ] Error messages are informative
- [ ] Event payloads are consistent

---

## Anti-Patterns to Avoid

- ❌ Don't break default behavior (must throw first error when not configured)
- ❌ Don't skip optional chaining for errorMergeStrategy check
- ❌ Don't wrap single errors in WorkflowAggregateError
- ❌ Don't forget to emit error event before throwing
- ❌ Don't modify class-based workflow run() execution directly
- ❌ Don't collect errors when errorMergeStrategy.enabled is false
- ❌ Don't ignore custom combine function
- ❌ Don't forget to track operation count
- ❌ Don't modify mergeWorkflowErrors utility (use as-is)
- ❌ Don't add new tests (P2.M4.T1.S3 will add)
- ❌ Don't modify types from P2.M4.T1.S1 (use as-is)
- ❌ Don't use sync patterns in async context
- ❌ Don't hardcode values that should be config
- ❌ Don't catch all exceptions - be specific
- ❌ Don't forget to reset collectedErrors between runs

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (error collection in workflow execution)
- ✅ Complete implementation pattern from @Task decorator
- ✅ Exact file paths and line numbers specified
- ✅ Comprehensive research on all dependencies
- ✅ Backward compatibility requirements clearly defined
- ✅ Validation commands provided
- ✅ Edge cases identified and addressed
- ✅ Integration with existing utilities (mergeWorkflowErrors)
- ⚠️ Complex interaction with WorkflowContext.step() method
- ⚠️ Need to handle both functional and class-based workflows

**Validation**: The completed implementation will enable workflow-level error collection for sequential steps, matching the @Task decorator's error merge functionality while maintaining full backward compatibility. The change integrates seamlessly with existing error handling infrastructure and follows established patterns in the codebase.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**
