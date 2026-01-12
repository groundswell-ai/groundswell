# Product Requirement Prompt (PRP): Default Error Merger Implementation

**Work Item:** P1.M2.T2.S3 - Create default error merger implementation

---

## Goal

**Feature Goal:** Extract and modularize the error merging logic from `src/decorators/task.ts` into a reusable utility function for concurrent workflow error aggregation.

**Deliverable:** A standalone `mergeWorkflowErrors()` utility function exported from `src/utils/workflow-error-utils.ts` that aggregates multiple `WorkflowError` objects into a single merged error.

**Success Definition:**
1. `mergeWorkflowErrors()` function is created and exported from `src/utils/workflow-error-utils.ts`
2. The function aggregates errors according to the specification in `plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md`
3. The existing `defaultErrorMerger` in `src/decorators/task.ts` is replaced with an import from the new utility
4. Tests pass validating the merge behavior
5. The function is exported from `src/utils/index.ts` and `src/index.ts` for public API access

## Why

- **Maintainability:** Error merging logic currently lives inline in the Task decorator. Extracting it to a utility enables reuse and independent testing.
- **Testability:** A standalone function is easier to unit test than inline decorator logic.
- **API Completeness:** Users may want to merge errors programmatically for custom error handling scenarios.
- **Consistency:** Other utilities (generateId, Observable) live in `src/utils/`, making this the correct home for error utilities.
- **Previous Work:** The `defaultErrorMerger` function already exists in `src/decorators/task.ts` (lines 23-56) with a comment indicating it should be extracted in this subtask.

## What

Create a `mergeWorkflowErrors()` utility function that:

1. **Accepts:** An array of `WorkflowError` objects, task name, parent workflow ID, and total children count
2. **Aggregates:**
   - Message: `"X of Y concurrent child workflows failed in task 'taskName'"`
   - All unique workflow IDs that failed
   - All logs from all errors (flattened)
   - First error's stack trace
   - First error's state snapshot
   - Original errors array in the `original` field with metadata
3. **Returns:** A single merged `WorkflowError` object

### Success Criteria

- [ ] `mergeWorkflowErrors()` function created in `src/utils/workflow-error-utils.ts`
- [ ] Function aggregates messages with count and task name
- [ ] Function collects unique failed workflow IDs
- [ ] Function flattens all logs arrays
- [ ] Function uses first error's stack and state
- [ ] Function includes original errors array in metadata
- [ ] Function exported from `src/utils/index.ts`
- [ ] Function exported from `src/index.ts`
- [ ] `defaultErrorMerger` in `src/decorators/task.ts` replaced with import
- [ ] Unit tests created and passing
- [ ] Existing tests still pass (no regressions)

---

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test:** If someone knew nothing about this codebase, they would have:
- The exact `WorkflowError` interface structure
- The exact `ErrorMergeStrategy` interface structure
- The existing `defaultErrorMerger` implementation to reference
- Test patterns used in the codebase
- File locations and naming conventions
- Export patterns from the main index

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: /home/dustin/projects/groundswell/src/types/error.ts
  why: Defines WorkflowError interface with all required fields (message, original, workflowId, stack, state, logs)
  critical: The merge function must return a WorkflowError that matches this interface exactly

- file: /home/dustin/projects/groundswell/src/types/error-strategy.ts
  why: Defines ErrorMergeStrategy interface for understanding the merge strategy pattern
  gotcha: The combine() function signature takes WorkflowError[] and returns WorkflowError

- file: /home/dustin/projects/groundswell/src/decorators/task.ts (lines 18-56)
  why: Contains the existing defaultErrorMerger implementation that should be extracted
  pattern: Use this as the reference implementation - it already implements the required merge logic
  gotcha: The comment on line 21 explicitly states "This will be extracted to src/utils/error-merger.ts in P1.M2.T2.S3"
  critical: This is the source implementation - copy the logic structure exactly

- file: /home/dustin/projects/groundswell/src/decorators/task.ts (lines 160-177)
  why: Shows how defaultErrorMerger is currently called - maintain this call signature
  pattern: defaultErrorMerger(errors, taskName, parentWorkflowId, totalChildren)

- file: /home/dustin/projects/groundswell/src/utils/index.ts
  why: Shows the export pattern for utils - add mergeWorkflowErrors export here
  pattern: export { generateId } from './id.js'; - follow this pattern

- file: /home/dustin/projects/groundswell/src/index.ts (lines 84-86)
  why: Shows how utils are re-exported from main index
  pattern: export { generateId } from './utils/id.js'; - follow this pattern

- file: /home/dustin/projects/groundswell/src/types/logging.ts
  why: Defines LogEntry type which is used in WorkflowError.logs array
  gotcha: logs is LogEntry[] - use flatMap to flatten multiple log arrays

- file: /home/dustin/projects/groundswell/src/types/snapshot.ts
  why: Defines SerializedWorkflowState type used in WorkflowError.state
  gotcha: state is Record<string, unknown> - use first error's state or empty object

- file: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md (lines 207-217)
  why: Contains the recommended default merger implementation from architecture doc
  critical: This documents the intended merge behavior per the PRD specification

- docfile: /home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/prd_snapshot.md (lines 72-90)
  why: Documents Issue 3 about Missing Error Merge Strategy Implementation
  section: "### Issue 3: Missing Error Merge Strategy Implementation"
```

### Current Codebase Tree (relevant portions)

```bash
src/
├── core/
│   └── workflow.ts          # Workflow class, error handling
├── decorators/
│   ├── index.ts
│   └── task.ts              # Contains defaultErrorMerger (lines 23-56) - TO BE EXTRACTED
├── types/
│   ├── index.ts             # Exports WorkflowError, ErrorMergeStrategy
│   ├── error.ts             # WorkflowError interface
│   ├── error-strategy.ts    # ErrorMergeStrategy interface
│   ├── logging.ts           # LogEntry type
│   └── snapshot.ts          # SerializedWorkflowState type
├── utils/
│   ├── id.ts                # generateId utility
│   ├── observable.ts        # Observable utility
│   └── index.ts             # Exports from utils module
└── index.ts                 # Main export file
```

### Desired Codebase Tree (files to be added)

```bash
src/
├── utils/
│   ├── workflow-error-utils.ts  # NEW - mergeWorkflowErrors function
│   └── index.ts                  # MODIFY - Add export for mergeWorkflowErrors
├── decorators/
│   └── task.ts                   # MODIFY - Import mergeWorkflowErrors, remove inline defaultErrorMerger
└── index.ts                      # MODIFY - Add re-export of mergeWorkflowErrors
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ES modules - use .js extensions in imports
// Even though source files are .ts, imports use .js extension
// Example: import { WorkflowError } from './types/error.js';

// CRITICAL: The existing defaultErrorMerger includes metadata in the 'original' field
// This metadata (name, message, errors, totalChildren, failedChildren, failedWorkflowIds)
// should be preserved in the extracted function

// GOTCHA: WorkflowError.original is typed as 'unknown' - the metadata object
// must be cast with 'as unknown' to satisfy the type checker

// PATTERN: Use flatMap for flattening logs arrays
// allLogs = errors.flatMap((e) => e.logs);

// PATTERN: Use Set to get unique workflow IDs
// failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

// GOTCHA: stack and state are optional fields - use optional chaining
// stack: errors[0]?.stack
// state: errors[0]?.state || ({} as SerializedWorkflowState)
```

---

## Implementation Blueprint

### Data Models and Structure

The `WorkflowError` interface is already defined in `src/types/error.ts`:

```typescript
export interface WorkflowError {
  message: string;           // Error message
  original: unknown;         // Original thrown error (will contain metadata object)
  workflowId: string;        // ID of workflow where error occurred
  stack?: string;            // Stack trace if available
  state: SerializedWorkflowState;  // State snapshot at time of error
  logs: LogEntry[];          // Logs from the failing workflow node
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/utils/workflow-error-utils.ts
  - IMPLEMENT: mergeWorkflowErrors function with exact signature from existing defaultErrorMerger
  - FUNCTION SIGNATURE: mergeWorkflowErrors(errors: WorkflowError[], taskName: string, parentWorkflowId: string, totalChildren: number): WorkflowError
  - COPY logic from: src/decorators/task.ts lines 23-56 (defaultErrorMerger function)
  - IMPORT types: WorkflowError from '../types/error.js', SerializedWorkflowState from '../types/snapshot.js'
  - MERGE LOGIC:
    - message: "${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'"
    - failedWorkflowIds: [...new Set(errors.map((e) => e.workflowId))]
    - allLogs: errors.flatMap((e) => e.logs)
    - stack: errors[0]?.stack (first error's stack)
    - state: errors[0]?.state || ({} as SerializedWorkflowState) (first error's state)
    - original: metadata object with name, message, errors, totalChildren, failedChildren, failedWorkflowIds
  - NAMING: camelCase for function, snake_case for imports
  - PLACEMENT: New file in src/utils/
  - JSDOC: Add documentation explaining the merge behavior

Task 2: MODIFY src/utils/index.ts
  - ADD export: export { mergeWorkflowErrors } from './workflow-error-utils.js';
  - PRESERVE: All existing exports (generateId, Observable)
  - PATTERN: Follow existing export pattern - one export per line

Task 3: MODIFY src/decorators/task.ts
  - ADD import: import { mergeWorkflowErrors } from '../utils/workflow-error-utils.js';
  - REMOVE: defaultErrorMerger function definition (lines 18-56)
  - REPLACE: All references to 'defaultErrorMerger' with 'mergeWorkflowErrors'
  - FIND: Line 167 where defaultErrorMerger is called
  - PRESERVE: All other Task decorator logic unchanged
  - VERIFY: No other references to defaultErrorMerger exist

Task 4: MODIFY src/index.ts
  - ADD export: export { mergeWorkflowErrors } from './utils/workflow-error-utils.js';
  - PLACEMENT: In the utilities section (after line 86, near generateId export)
  - PRESERVE: All existing exports

Task 5: CREATE src/__tests__/unit/utils/workflow-error-utils.test.ts
  - IMPLEMENT: Unit tests for mergeWorkflowErrors function
  - TEST CASES:
    - Single error (returns error with count 1)
    - Multiple errors with unique workflow IDs
    - Multiple errors with duplicate workflow IDs
    - Empty errors array (edge case - should handle gracefully)
    - Logs aggregation (flatMap behavior)
    - Stack trace selection (first error's stack)
    - State selection (first error's state)
    - Metadata object structure in original field
  - FOLLOW pattern: src/__tests__/unit/decorators.test.ts (test structure and patterns)
  - NAMING: test files use *.test.ts suffix
  - FRAMEWORK: Vitest - use describe, it, expect from 'vitest'
  - PLACEMENT: Test file alongside the code it tests in src/__tests__/unit/utils/

Task 6: VERIFY existing tests still pass
  - RUN: npm test (or uv run vitest run)
  - CHECK: All 344 existing tests still pass
  - NO regressions: The change is a refactoring - behavior should be identical
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// CRITICAL: Function signature (must match defaultErrorMerger exactly)
// ============================================================================
/**
 * Merge multiple WorkflowError objects into a single aggregated error
 * This is the default merger used when errorMergeStrategy is enabled
 *
 * @param errors - Array of WorkflowError objects to merge
 * @param taskName - Name of the task that spawned the concurrent workflows
 * @param parentWorkflowId - ID of the parent workflow
 * @param totalChildren - Total number of child workflows that were spawned
 * @returns A merged WorkflowError containing aggregated information
 */
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError

// ============================================================================
// PATTERN: Message construction with count and task name
// ============================================================================
const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;

// ============================================================================
// PATTERN: Unique workflow IDs using Set
// ============================================================================
const failedWorkflowIds = [...new Set(errors.map((e) => e.workflowId))];

// ============================================================================
// PATTERN: Flatten logs arrays using flatMap
// ============================================================================
const allLogs = errors.flatMap((e) => e.logs);

// ============================================================================
// PATTERN: First error's stack and state with optional chaining
// ============================================================================
stack: errors[0]?.stack,
state: errors[0]?.state || ({} as SerializedWorkflowState),

// ============================================================================
// CRITICAL: Metadata object structure in 'original' field (as unknown cast)
// ============================================================================
original: {
  name: 'WorkflowAggregateError',
  message,
  errors,
  totalChildren,
  failedChildren: errors.length,
  failedWorkflowIds,
} as unknown,

// ============================================================================
// IMPORT PATTERN: Use .js extensions for ES modules
// ============================================================================
import type { WorkflowError } from '../types/error.js';
import type { SerializedWorkflowState } from '../types/snapshot.js';
```

### Integration Points

```yaml
TASK_DECORATOR:
  - file: src/decorators/task.ts
  - remove: defaultErrorMerger function definition (lines 18-56)
  - add_import: import { mergeWorkflowErrors } from '../utils/workflow-error-utils.js';
  - replace_call: Line 167 - change defaultErrorMerger to mergeWorkflowErrors

UTILS_EXPORTS:
  - file: src/utils/index.ts
  - add_export: export { mergeWorkflowErrors } from './workflow-error-utils.js';

MAIN_EXPORT:
  - file: src/index.ts
  - add_export: export { mergeWorkflowErrors } from './utils/workflow-error-utils.js';
  - location: In utilities section (around line 86)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint

# This runs: tsc --noEmit (TypeScript type checking)
# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Manual checks after implementation:
# 1. Verify .js extensions in all import statements
# 2. Verify all types are imported from correct paths
# 3. Verify function signature matches defaultErrorMerger
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new utility function specifically
npm test -- src/__tests__/unit/utils/workflow-error-utils.test.ts

# Full test suite for affected areas
npm test -- src/__tests__/unit/decorators.test.ts
npm test -- src/__tests__/unit/

# Coverage validation
npm test -- --coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run the full test suite to verify no regressions
npm test

# Expected: All 344 existing tests pass plus new tests
# This refactoring should NOT change any behavior - it's purely extraction

# Test specific concurrent task scenarios
npm test -- examples/examples/06-concurrent-tasks.ts

# Test error handling examples
npm test -- examples/examples/05-error-handling.ts

# Expected: All concurrent task and error handling tests still work
```

### Level 4: Manual Validation

```bash
# Run concurrent tasks example to verify error merging still works
npm run start:concurrent

# Run error handling example
npm run start:errors

# Expected: Both examples run successfully, errors are properly merged
# when errorMergeStrategy is enabled

# Check exports are working
node -e "const { mergeWorkflowErrors } = require('./dist/index.js'); console.log('Export check:', typeof mergeWorkflowErrors);"
# Expected: "Export check: function"
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test` (344+ tests)
- [ ] No type errors: `npm run lint` returns cleanly
- [ ] Function signature matches defaultErrorMerger exactly
- [ ] mergeWorkflowErrors exported from src/utils/index.ts
- [ ] mergeWorkflowErrors re-exported from src/index.ts
- [ ] defaultErrorMerger removed from src/decorators/task.ts

### Feature Validation

- [ ] Message includes error count, total children, and task name
- [ ] Unique workflow IDs collected correctly
- [ ] Logs flattened using flatMap
- [ ] First error's stack used
- [ ] First error's state used (or empty object)
- [ ] Metadata object in 'original' field with all required properties
- [ ] Concurrent task error scenarios still work
- [ ] Error merge strategy integration still works

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] File placement matches desired codebase tree structure
- [ ] JSDoc comments added to the function
- [ ] Imports use .js extensions for ES modules
- [ ] No breaking changes to existing behavior
- [ ] Tests cover happy path and edge cases

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] Function behavior documented in JSDoc
- [ ] Comment in src/decorators/task.ts line 21 acknowledged/removed

---

## Anti-Patterns to Avoid

- ❌ Don't change the merge logic - this is a pure extraction, behavior must be identical
- ❌ Don't forget to add the export to src/utils/index.ts and src/index.ts
- ❌ Don't use .ts extensions in imports - must use .js for ES modules
- ❌ Don't skip the cast `as unknown` for the metadata object in `original` field
- ❌ Don't forget to handle optional fields (stack, state) with optional chaining
- ❌ Don't remove the metadata from the `original` field - it contains important context
- ❌ Don't change the function signature - it must match defaultErrorMerger exactly
- ❌ Don't forget to run full test suite - this is a refactoring, no behavior should change
- ❌ Don't place the file anywhere other than src/utils/ - that's the established pattern
- ❌ Don't create a new directory for error utilities - put it in existing utils/

---

## Confidence Score

**8/10** - High confidence for one-pass implementation success

**Reasoning:**
- Existing implementation (defaultErrorMerger) provides exact reference
- Clear file location and export patterns established in codebase
- Well-defined types and interfaces
- Comprehensive test patterns available
- The only complexity is ensuring exact behavior preservation during extraction

**Risk Factors:**
- Must preserve exact behavior of defaultErrorMerger
- Must handle TypeScript ES module import syntax correctly (.js extensions)
- Must update all export locations (utils/index.ts and main index.ts)

---

## Additional Context from Research

### Existing Test Patterns Found

From `src/__tests__/unit/decorators.test.ts`:
```typescript
// Error testing pattern
it('should wrap errors in WorkflowError', async () => {
  class FailingWorkflow extends Workflow {
    @Step()
    async failingStep(): Promise<void> {
      throw new Error('Step failed');
    }
    async run(): Promise<void> {
      await this.failingStep();
    }
  }
  const wf = new FailingWorkflow();
  await expect(wf.run()).rejects.toMatchObject({
    message: 'Step failed',
    workflowId: wf.id,
  });
});
```

### Related Work Items (for context)

- **P1.M2.T2.S1** (Complete): Added errorMergeStrategy to TaskOptions interface
- **P1.M2.T2.S2** (Complete): Implemented error aggregation logic in @Task decorator
- **P1.M2.T2.S4** (Pending): Add tests for ErrorMergeStrategy functionality

This subtask (P1.M2.T2.S3) extracts the default merger for better modularity and testability.

### References

- Error handling architecture: `plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md`
- PRD snapshot: `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/prd_snapshot.md`
- Existing implementation: `src/decorators/task.ts` lines 23-56
