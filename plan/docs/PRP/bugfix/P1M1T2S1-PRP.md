name: "P1.M1.T2.S1 - Verify getObservedState Import in workflow-context.ts"
description: |

---

## Goal

**Feature Goal**: Verify that `getObservedState` is properly imported in `src/core/workflow-context.ts` and available for use in the `step()` and `replaceLastPromptResult()` error handlers.

**Deliverable**: Verified import statement at the top of `src/core/workflow-context.ts` enabling error state capture in WorkflowContext methods.

**Success Definition**: The `getObservedState` function is imported from `'../decorators/observed-state.js'` and available for use in error catch blocks to capture workflow state when errors occur in WorkflowContext operations.

## User Persona (if applicable)

**Target User**: Developer maintaining the workflow system.

**Use Case**: When a WorkflowContext operation (step execution or prompt result replacement) throws an error, the error handlers need to capture the actual observed state of the workflow for debugging and introspection.

**User Journey**: The import statement is a prerequisite for the error handlers in `step()` and `replaceLastPromptResult()` to call `getObservedState(this.workflow)` and include the state snapshot in the error event payload.

**Pain Points Addressed**: Without this import, the error handlers cannot capture actual workflow state, breaking error introspection capabilities required by PRD #001 Section 5.1.

## Why

- **Critical for Error Introspection**: PRD #001 Section 5.1 requires error events to include actual workflow state, not empty objects
- **Enables Debugging**: Developers need to inspect workflow state at the point of failure to diagnose issues
- **Consistent Pattern**: Follows the established `getObservedState(this.workflow)` pattern used in WorkflowContext
- **Prerequisite for S2/S3**: This import is required before the state capture can be implemented in the error handlers

## What

Add or verify the import statement for `getObservedState` at the top of `src/core/workflow-context.ts`. This is a pure import addition task - no code logic changes required.

### Success Criteria

- [ ] Import statement exists in `src/core/workflow-context.ts` around line 30
- [ ] Import follows the pattern: `import { getObservedState } from '../decorators/observed-state.js';`
- [ ] Import is positioned after type imports and before other regular imports
- [ ] Function is available for use in `step()` catch block (around line 155-162)
- [ ] Function is available for use in `replaceLastPromptResult()` catch block (around line 319-326)

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully? YES - This PRP provides exact file location, import pattern, line context, and verification commands.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.typescriptlang.org/docs/handbook/modules/theory.html
  why: Understanding ES6 import syntax and module resolution
  critical: Use named imports with `import { name } from 'path.js'` - always include .js extension

- url: https://www.typescriptlang.org/docs/handbook/decorators.html
  why: Understanding decorator pattern context for getObservedState usage
  critical: Decorators are runtime values, not types - use regular import not import type

- file: src/core/workflow-context.ts
  why: The target file requiring the import statement
  pattern: Type imports (lines 8-21), then regular imports (lines 22-30)
  gotcha: Always use .js extension in relative imports even in .ts files (ES2022 module system)

- file: src/core/workflow-context.ts:30
  why: Exact line where getObservedState import should be placed
  pattern: `import { getObservedState } from '../decorators/observed-state.js';`
  gotcha: THIS IMPORT ALREADY EXISTS - this task is for verification only

- file: src/decorators/observed-state.ts
  why: Source file defining getObservedState function
  pattern: Named export `export function getObservedState(obj: object): SerializedWorkflowState`
  gotcha: Returns empty object {} if no observed fields found (WeakMap-based storage)

- file: src/decorators/step.ts:145-165
  why: Reference pattern for getObservedState usage in error handling
  pattern: `const snap = getObservedState(this as object);` then `state: snap` in error object
  gotcha: The @Step decorator is the canonical example of error state capture

- file: src/core/workflow-context.ts:155-162
  why: First error handler location (step() method) that will use getObservedState
  pattern: `state: getObservedState(this.workflow), logs: [...this.node.logs]`
  gotcha: Must use `this.workflow` not `this` - WorkflowContext wraps a Workflow instance

- file: src/core/workflow-context.ts:319-326
  why: Second error handler location (replaceLastPromptResult() method) that will use getObservedState
  pattern: Same pattern as first error handler
  gotcha: Both error handlers need the same fix

- file: src/core/workflow.ts:11
  why: Parallel implementation showing getObservedState import pattern for workflow files
  pattern: `import { getObservedState } from '../decorators/observed-state.js';`
  gotcha: Follow this exact pattern for consistency

- docfile: plan/bugfix/architecture/GAP_ANALYSIS_SUMMARY.md
  why: Contains Issue #2 analysis describing empty state/logs bug
  section: Issue #2: Empty Error State in Functional Workflows
  gotcha: The GAP analysis indicates this is a "Real Gap" with "Low" fix effort
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts          # Reference for similar import pattern (line 11)
│   │   ├── workflow-context.ts  # TARGET FILE - import goes here (line 30)
│   │   └── context.ts
│   ├── decorators/
│   │   ├── observed-state.ts    # SOURCE FILE - getObservedState defined here
│   │   ├── step.ts              # Reference pattern for usage
│   │   └── task.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── workflow-context.ts
│   ├── utils/
│   │   └── id.ts
│   └── __tests__/
│       ├── unit/
│       │   └── context.test.ts  # Tests for WorkflowContext functionality
│       └── integration/
├── plan/
│   └── bugfix/
│       └── P1M1T2S1/
│           └── PRP.md           # This file
└── vitest.config.ts
```

### Desired Codebase Tree (No Changes - File Structure Unchanged)

```bash
# No structural changes - this is an import addition only
# The file src/core/workflow-context.ts already exists and is being modified
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ES2022 module system requires .js extensions
// Even in .ts files, relative imports must use .js extension
// WRONG: import { getObservedState } from '../decorators/observed-state';
// CORRECT: import { getObservedState } from '../decorators/observed-state.js';

// CRITICAL: Import organization pattern in this codebase
// Type imports come first with "import type { ... }" (lines 8-21)
// Regular imports follow, grouped by functionality (lines 22-30)
// Decorator imports are mixed with other utility imports

// CRITICAL: getObservedState is a named export, not a default export
// Must use: import { getObservedState } from '...'
// Cannot use: import getObservedState from '...'

// IMPORTANT: This task is for VERIFICATION ONLY
// The import already exists in the file at line 30
// This PRP serves as validation documentation

// GOTCHA: getObservedState returns empty object {} if no @ObservedState decorators
// This is expected behavior - not an error
// Uses WeakMap-based storage keyed by class prototype

// CRITICAL: WorkflowContext uses this.workflow not this
// When calling getObservedState in WorkflowContext, use:
// getObservedState(this.workflow) NOT getObservedState(this)
// Because WorkflowContext wraps a Workflow instance

// GOTCHA: The related subtask P1.M1.T2.S2 and S3 have ALREADY been completed
// The step() error handler at line 155-162 already uses getObservedState(this.workflow)
// The replaceLastPromptResult() error handler at line 319-326 also uses it
// This means P1.M1.T2.S1 through S3 are all complete
```

## Implementation Blueprint

### Data Models and Structure

No data model changes required. This is an import statement addition only.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY EXISTING IMPORT IN src/core/workflow-context.ts
  - CHECK: Lines 8-30 for import statements section
  - VERIFY: Line 30 contains `import { getObservedState } from '../decorators/observed-state.js';`
  - CONFIRM: Import is positioned after type imports (lines 8-21)
  - CONFIRM: Import is after other regular imports (lines 22-29) as last import
  - NAMING: Named import `{ getObservedState }` - matches source export
  - PLACEMENT: Top of file, after type imports, before usage

Task 2: VERIFY FUNCTION AVAILABILITY IN ERROR HANDLERS
  - FIND: Usage of getObservedState in step() method (around line 155-162)
  - VERIFY: Error handler contains `state: getObservedState(this.workflow),`
  - VERIFY: Error handler contains `logs: [...this.node.logs] as LogEntry[],`
  - FIND: Usage of getObservedState in replaceLastPromptResult() method (around line 319-326)
  - VERIFY: Same pattern as step() error handler
  - CONFIRM: No TypeScript errors related to undefined getObservedState

Task 3: RUN VALIDATION
  - EXECUTE: Type checking with `npm run build` or `npx tsc --noEmit`
  - VERIFY: No import errors for getObservedState
  - EXECUTE: Linting with `npm run lint`
  - VERIFY: No linting errors in workflow-context.ts
  - EXECUTE: Tests with `npm test -- src/__tests__/unit/context.test.ts`
  - VERIFY: All context tests pass

# NOTE: All tasks are VERIFICATION tasks
# The implementation has already been completed
# This PRP documents the completion and provides validation steps
```

### Implementation Patterns & Key Details

```typescript
// Import statement pattern (src/core/workflow-context.ts:30)
import { getObservedState } from '../decorators/observed-state.js';

// Usage pattern in step() error handler (src/core/workflow-context.ts:155-162)
} catch (error) {
  const context = this.createReflectionContext(stepFn);
  this.emitEvent({
    type: 'stepError',
    node: this.workflow.node,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.workflow.id,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this.workflow),  // ← Uses imported function
      logs: [...this.node.logs] as LogEntry[],
    },
    stepName: stepFn.name,
  });
  throw error;
}

// Usage pattern in replaceLastPromptResult() error handler (src/core/workflow-context.ts:319-326)
} catch (error) {
  this.emitEvent({
    type: 'stepError',
    node: this.workflow.node,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.workflow.id,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this.workflow),  // ← Uses imported function
      logs: [...this.node.logs] as LogEntry[],
    },
  });
  throw error;
}

// Reference pattern from @Step decorator (src/decorators/step.ts:145-165)
const snap = getObservedState(this as object);

const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: snap, // State snapshot included in error
  logs: [...wf.node.logs] as LogEntry[],
};
```

### Integration Points

```yaml
NO NEW INTEGRATIONS:
  - This task verifies an existing import statement only
  - No new dependencies required
  - No configuration changes needed
  - No database changes needed
  - No route changes needed

EXISTING INTEGRATIONS AFFECTED:
  - step() error handler (already using getObservedState at line ~160)
  - replaceLastPromptResult() error handler (already using getObservedState at line ~324)
  - WorkflowContext.createReflectionContext() method (related to error handling)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run verification commands
npm run build           # TypeScript compilation check
npm run lint           # ESLint style check
npx tsc --noEmit       # Type checking without emitting files

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test WorkflowContext functionality specifically
npm test -- src/__tests__/unit/context.test.ts

# Full test suite for regression check
npm test

# Expected: All tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# No specific integration tests needed for import verification
# The standard test suite covers integration scenarios

npm test

# Expected: All integration tests pass
```

### Level 4: Manual Verification

```bash
# 1. Visual inspection of the import
head -n 35 src/core/workflow-context.ts | tail -n 10

# Expected output should show around line 30:
# import { getObservedState } from '../decorators/observed-state.js';

# 2. Verify usage in error handlers
grep -n "getObservedState" src/core/workflow-context.ts

# Expected output should show:
# 30:import { getObservedState } from '../decorators/observed-state.js';
# ~160:      state: getObservedState(this.workflow),
# ~324:      state: getObservedState(this.workflow),

# 3. Verify no duplicate imports
grep -c "import.*getObservedState" src/core/workflow-context.ts

# Expected: 1 (single import, no duplicates)

# 4. Verify the import was added in git history
git log --oneline -5 -- src/core/workflow-context.ts

# Expected: Should show commit 84e63ed or 5f6ce19 that added the import
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run build`
- [ ] Import statement exists at line 30 of src/core/workflow-context.ts
- [ ] No duplicate imports of getObservedState

### Feature Validation

- [ ] Import follows codebase pattern: `import { getObservedState } from '../decorators/observed-state.js';`
- [ ] Import positioned correctly (after type imports, as last regular import)
- [ ] Function available in step() catch block
- [ ] Function available in replaceLastPromptResult() catch block
- [ ] Manual verification confirms single import at line 30

### Code Quality Validation

- [ ] Follows existing codebase import organization pattern
- [ ] Uses .js extension in relative import path (ES2022 requirement)
- [ ] Named import matches source export in observed-state.ts
- [ ] No unused imports (verified by ESLint)
- [ ] Consistent with other decorator imports in codebase

### Documentation & Deployment

- [ ] No new environment variables added
- [ ] No configuration changes required
- [ ] PRP documents that task was already complete (verification only)

---

## Anti-Patterns to Avoid

- ❌ Don't add duplicate imports - check line 30 first
- ❌ Don't use `import type` for getObservedState - it's a runtime function
- ❌ Don't forget the .js extension in the import path
- ❌ Don't use default import syntax - getObservedState is a named export
- ❌ Don't place import in the wrong location (must be after type imports)
- ❌ Don't skip verification - always run tests after changes
- ❌ Don't use `getObservedState(this)` in WorkflowContext - use `getObservedState(this.workflow)`

---

## Implementation Status

**CRITICAL NOTE**: This task has been **ALREADY COMPLETED**. The verification process confirms:

1. ✅ Import exists at `src/core/workflow-context.ts:30`
2. ✅ Usage in `step()` error handler at line ~160
3. ✅ Usage in `replaceLastPromptResult()` error handler at line ~324
4. ✅ Git commits `84e63ed` and `5f6ce19` contain the implementation
5. ✅ Related subtasks P1.M1.T2.S2 and S3 are also complete

This PRP serves as **validation documentation** rather than implementation instructions. The work was completed in prior commits.

## Confidence Score

**10/10** - Implementation is already complete and verified. The PRP provides comprehensive context for understanding the pattern and validating the existing implementation.

## Related Work Items

- **P1.M1.T1.S1**: Add getObservedState import to workflow.ts - ✅ COMPLETE (similar pattern)
- **P1.M1.T2.S2**: Fix first error handler in step() method - ✅ COMPLETE (line ~160)
- **P1.M1.T2.S3**: Fix second error handler in replaceLastPromptResult() - ✅ COMPLETE (line ~324)
- **P1.M1.T2.S4**: Write test for WorkflowContext error state capture - ⏳ Researching (depends on S2/S3)
