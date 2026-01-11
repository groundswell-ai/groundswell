name: "P1.M1.T1.S1 - Verify getObservedState Import in workflow.ts"
description: |

---

## Goal

**Feature Goal**: Verify that `getObservedState` is properly imported in `src/core/workflow.ts` and available for use in the `runFunctional()` error handler.

**Deliverable**: Verified import statement at the top of `src/core/workflow.ts` enabling error state capture in functional workflows.

**Success Definition**: The `getObservedState` function is imported from `'../decorators/observed-state.js'` and available for use in the `runFunctional()` catch block to capture workflow state when errors occur.

## User Persona (if applicable)

**Target User**: Developer maintaining the workflow system.

**Use Case**: When a functional workflow throws an error, the error handler needs to capture the actual observed state of the workflow for debugging and introspection.

**User Journey**: The import statement is a prerequisite for the error handler in `runFunctional()` to call `getObservedState(this)` and include the state snapshot in the error event payload.

**Pain Points Addressed**: Without this import, the error handler cannot capture actual workflow state, breaking error introspection capabilities required by PRD #001 Section 5.1.

## Why

- **Critical for Error Introspection**: PRD #001 Section 5.1 requires error events to include actual workflow state, not empty objects
- **Enables Debugging**: Developers need to inspect workflow state at the point of failure to diagnose issues
- **Consistent Pattern**: Follows the established `getObservedState(this)` pattern used throughout the codebase (e.g., `@Step` decorator, `WorkflowContext`)
- **Prerequisite for S1**: This import is required before the state capture can be implemented in the error handler

## What

Add or verify the import statement for `getObservedState` at the top of `src/core/workflow.ts`. This is a pure import addition task - no code logic changes required.

### Success Criteria

- [ ] Import statement exists in `src/core/workflow.ts` around line 11-12
- [ ] Import follows the pattern: `import { getObservedState } from '../decorators/observed-state.js';`
- [ ] Import is positioned after type imports and before other regular imports
- [ ] Function is available for use in `runFunctional()` catch block

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

- file: src/core/workflow.ts
  why: The target file requiring the import statement
  pattern: Type imports (lines 1-7), then regular imports (lines 8-13)
  gotcha: Always use .js extension in relative imports even in .ts files (ES2022 module system)

- file: src/core/workflow.ts:11
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

- file: src/core/workflow-context.ts:295-296
  why: Recent implementation showing getObservedState usage pattern in this codebase
  pattern: `state: getObservedState(this.workflow), logs: [...this.workflow.node.logs]`
  gotcha: Must use spread operator on logs array to prevent mutation

- docfile: plan/bugfix/architecture/GAP_ANALYSIS_SUMMARY.md
  why: Contains Issue #2 analysis describing this exact fix
  section: Issue #2: Empty Error State in Functional Workflows
  gotcha: The GAP analysis indicates this is a "Real Gap" with "Low" fix effort (2 minutes)
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts          # TARGET FILE - import goes here
│   │   ├── workflow-context.ts  # Reference for similar import pattern
│   │   └── logger.ts
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
│       │   └── workflow.test.ts # Tests for workflow functionality
│       └── integration/
├── plan/
│   └── bugfix/
│       └── P1M1T1S1/
│           └── PRP.md           # This file
└── vitest.config.ts
```

### Desired Codebase Tree (No Changes - File Structure Unchanged)

```bash
# No structural changes - this is an import addition only
# The file src/core/workflow.ts already exists and is being modified
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ES2022 module system requires .js extensions
// Even in .ts files, relative imports must use .js extension
// WRONG: import { getObservedState } from '../decorators/observed-state';
// CORRECT: import { getObservedState } from '../decorators/observed-state.js';

// CRITICAL: Import organization pattern in this codebase
// Type imports come first with "import type { ... }"
// Regular imports follow, grouped by functionality
// Decorator imports are mixed with other utility imports

// CRITICAL: getObservedState is a named export, not a default export
// Must use: import { getObservedState } from '...'
// Cannot use: import getObservedState from '...'

// IMPORTANT: This task is for VERIFICATION ONLY
// The import already exists in the file at line 11
// This PRP serves as validation documentation

// GOTCHA: getObservedState returns empty object {} if no @ObservedState decorators
// This is expected behavior - not an error
// Uses WeakMap-based storage keyed by class prototype

// GOTCHA: The related subtask P1.M1.T1.S2 has ALREADY been completed
// The runFunctional() error handler at line 295 already uses getObservedState(this)
// This means P1.M1.T1.S1 through S3 are all complete
```

## Implementation Blueprint

### Data Models and Structure

No data model changes required. This is an import statement addition only.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY EXISTING IMPORT IN src/core/workflow.ts
  - CHECK: Lines 1-13 for import statements section
  - VERIFY: Line 11 contains `import { getObservedState } from '../decorators/observed-state.js';`
  - CONFIRM: Import is positioned after type imports (lines 1-7)
  - CONFIRM: Import is before other regular imports (lines 9-13)
  - NAMING: Named import `{ getObservedState }` - matches source export
  - PLACEMENT: Top of file, after type imports, before usage

Task 2: VERIFY FUNCTION AVAILABILITY
  - FIND: Usage of getObservedState in runFunctional() method (around line 295)
  - VERIFY: Error handler contains `state: getObservedState(this),`
  - VERIFY: Error handler contains `logs: [...this.node.logs] as LogEntry[],`
  - CONFIRM: No TypeScript errors related to undefined getObservedState
  - PLACEMENT: runFunctional() catch block

Task 3: RUN VALIDATION
  - EXECUTE: Type checking with `npx tsc --noEmit` or `npm run build`
  - VERIFY: No import errors for getObservedState
  - EXECUTE: Linting with `npm run lint`
  - VERIFY: No linting errors in workflow.ts
  - EXECUTE: Tests with `npm test`
  - VERIFY: All workflow tests pass

# NOTE: All tasks are VERIFICATION tasks
# The implementation has already been completed
# This PRP documents the completion and provides validation steps
```

### Implementation Patterns & Key Details

```typescript
// Import statement pattern (src/core/workflow.ts:11)
import { getObservedState } from '../decorators/observed-state.js';

// Usage pattern in runFunctional() error handler (src/core/workflow.ts:295-296)
} catch (error) {
  this.setStatus('failed');

  // Emit error event
  this.emitEvent({
    type: 'error',
    node: this.node,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      original: error,
      workflowId: this.id,
      stack: error instanceof Error ? error.stack : undefined,
      state: getObservedState(this),  // ← Uses imported function
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
  - This task modifies an existing import statement only
  - No new dependencies required
  - No configuration changes needed
  - No database changes needed
  - No route changes needed

EXISTING INTEGRATIONS AFFECTED:
  - runFunctional() error handler (already using getObservedState)
  - snapshotState() method (already using getObservedState at line 202)
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
# Test workflow functionality specifically
npm test -- src/__tests__/unit/workflow.test.ts

# Full test suite for regression check
npm test

# Expected: All tests pass (133/133 tests per GAP analysis)
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
head -n 15 src/core/workflow.ts

# Expected output should show:
# import { getObservedState } from '../decorators/observed-state.js';

# 2. Verify usage in error handler
grep -n "getObservedState" src/core/workflow.ts

# Expected output should show:
# 11:import { getObservedState } from '../decorators/observed-state.js';
# 202:    const snapshot = getObservedState(this);
# 295:      state: getObservedState(this),

# 3. Verify no duplicate imports
grep -c "import.*getObservedState" src/core/workflow.ts

# Expected: 1 (single import, no duplicates)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test` (133/133 tests passing)
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run build`
- [ ] Import statement exists at line 11 of src/core/workflow.ts
- [ ] No duplicate imports of getObservedState

### Feature Validation

- [ ] Import follows codebase pattern: `import { getObservedState } from '../decorators/observed-state.js';`
- [ ] Import positioned correctly (after type imports, before usage)
- [ ] Function available in runFunctional() catch block
- [ ] Function available in snapshotState() method
- [ ] Manual verification confirms single import at line 11

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

- ❌ Don't add duplicate imports - check line 11 first
- ❌ Don't use `import type` for getObservedState - it's a runtime function
- ❌ Don't forget the .js extension in the import path
- ❌ Don't use default import syntax - getObservedState is a named export
- ❌ Don't place import in the wrong location (must be after type imports)
- ❌ Don't skip verification - always run tests after changes

---

## Implementation Status

**CRITICAL NOTE**: This task has been **ALREADY COMPLETED**. The verification process confirms:

1. ✅ Import exists at `src/core/workflow.ts:11`
2. ✅ Usage in `runFunctional()` error handler at line 295
3. ✅ Usage in `snapshotState()` method at line 202
4. ✅ All tests passing (133/133)

This PRP serves as **validation documentation** rather than implementation instructions. The work was completed in a prior commit.

## Confidence Score

**10/10** - Implementation is already complete and verified. The PRP provides comprehensive context for understanding the pattern and validating the existing implementation.

## Related Work Items

- **P1.M1.T1.S2**: Replace empty state object with getObservedState(this) - ✅ COMPLETE (line 295)
- **P1.M1.T1.S3**: Replace empty logs array with actual logs - ✅ COMPLETE (line 296)
- **P1.M1.T1.S4**: Write test for functional workflow error state capture - ✅ COMPLETE
