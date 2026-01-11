# PRP: Replace Empty State Object with getObservedState(this) in runFunctional() Catch Block

---

## Goal

**Feature Goal**: Fix the empty state object (`{}`) in the `runFunctional()` method's error handler to capture actual workflow state using `getObservedState(this)`, enabling proper error introspection and workflow restart capabilities.

**Deliverable**: Modified error handler in `src/core/workflow.ts` that captures real state instead of empty object.

**Success Definition**: The error object emitted from `runFunctional()` catch block contains actual captured state from `getObservedState(this)` following the same pattern as `@Step` decorator, and existing tests pass.

## User Persona

**Target User**: Developer/Debugging User who needs to inspect workflow state when errors occur during functional workflow execution.

**Use Case**: When a functional workflow throws an error, developers need to see the actual state of the workflow at the time of failure to debug issues and potentially restart workflows from captured state.

**User Journey**:
1. Developer creates a functional workflow using `new Workflow({ executor: async (ctx) => {...} })`
2. Workflow execution fails and throws an error
3. Error event is emitted with WorkflowError object containing `state` and `logs`
4. Developer inspects `error.state` to see actual workflow state values at failure point
5. Developer can use captured state for debugging or workflow restart

**Pain Points Addressed**:
- Currently `error.state` returns empty object `{}` regardless of workflow state
- No visibility into what values workflow had when error occurred
- Cannot restart workflows from captured state
- Inconsistent with `@Step` decorator error handling which properly captures state

## Why

- **Debugging Capability**: Enables developers to inspect actual workflow state at error time, critical for debugging complex workflows
- **Parity with Class-Based Workflows**: The `@Step` decorator already uses `getObservedState(this)` (line 114 in step.ts) - this fix brings functional workflows to feature parity
- **Workflow Restart**: Captured state enables potential workflow restart from exact point of failure
- **Completes P1.M1.T1**: This subtask depends on P1.M1.T1.S1 (import addition) and is a prerequisite for P1.M1.T1.S4 (test validation)

## What

Modify the error handler in `runFunctional()` method to replace `state: {}` with `state: getObservedState(this)` following the pattern established in `@Step` decorator.

### Success Criteria

- [ ] Error handler uses `getObservedState(this)` instead of `{}`
- [ ] Pattern matches `@Step` decorator error handling (step.ts:114)
- [ ] Existing tests pass (test in P1.M1.T1.S4 validates this functionality)
- [ ] No breaking changes to error object structure

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**YES** - This PRP provides:
- Exact file location and line numbers
- Complete code snippets showing current and target state
- Reference pattern from `@Step` decorator
- Test validation commands
- TypeScript type information
- Known gotchas and constraints

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/core/workflow.ts
  why: Target file containing runFunctional() method with error handler to fix
  pattern: Error handling pattern at lines 286-297 in catch block
  gotcha: This is a private method of Workflow<T> class, careful with scope
  line_range: 258-301

- file: src/decorators/step.ts
  why: Reference pattern showing correct usage of getObservedState(this)
  pattern: Line 114 shows `const snap = getObservedState(this as object);` followed by error object with `state: snap`
  critical: This is the established pattern to follow - use `getObservedState(this as object)` or just `getObservedState(this)`
  line_range: 109-134

- file: src/decorators/observed-state.ts
  why: Contains getObservedState function definition - understand what it captures
  pattern: Function signature: `export function getObservedState(obj: object): SerializedWorkflowState`
  gotcha: Returns empty object {} if no fields decorated with @ObservedState() - this is expected behavior for base Workflow class
  section: Function implementation details

- file: src/core/workflow-context.ts
  why: Shows similar pattern already applied in step() method (lines 162-164)
  pattern: Uses `state: getObservedState(this.workflow)` since context has workflow reference
  line_range: 155-162

- file: src/__tests__/unit/workflow.test.ts
  why: Test P1.M1.T1.S4 validates this fix - test "should capture state and logs in functional workflow error"
  pattern: Uses observer pattern to capture error events and validates state/logs structure
  line_range: 82-130

- docfile: plan/bugfix/architecture/ANALYSIS_PRD_VS_IMPLEMENTATION.md
  why: Architecture analysis identifying this as Issue #2 - Major Severity gap
  section: runFunctional() error handler analysis

- type: src/types/snapshot.ts
  why: SerializedWorkflowState type definition - what getObservedState returns
  pattern: `export type SerializedWorkflowState = Record<string, unknown>;`
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                    # Compiled JavaScript (not modified)
├── docs/                    # User documentation
├── examples/
│   └── examples/
│       └── 05-error-handling.ts  # Error handling example
├── plan/
│   ├── architecture/        # Architecture documentation
│   └── bugfix/
│       └── P1M1T1S2/        # THIS PRP LOCATION
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   └── unit/
│   │       └── workflow.test.ts  # Test file for P1.M1.T1.S4
│   ├── core/
│   │   ├── workflow.ts      # TARGET FILE - runFunctional() method
│   │   └── workflow-context.ts  # Reference for similar pattern
│   ├── decorators/
│   │   ├── step.ts          # Reference pattern (line 114)
│   │   └── observed-state.ts  # getObservedState function
│   └── types/
│       ├── snapshot.ts      # SerializedWorkflowState type
│       └── error.ts         # WorkflowError interface
├── package.json
├── vitest.config.ts         # Test configuration
└── tsconfig.json
```

### Desired Codebase Tree (No new files - modification only)

```bash
# No new files created - this is a modification task
# Modified: src/core/workflow.ts (lines 295-296)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: getObservedState returns {} if no @ObservedState decorated fields exist
// This is EXPECTED behavior - the base Workflow class has no decorated fields
// DO NOT "fix" this by adding decorators to Workflow class
// The test uses a custom workflow class WITH @ObservedState fields

// CRITICAL: P1.M1.T1.S1 must be complete before this task
// The import statement: import { getObservedState } from '../decorators/observed-state.js';
// Must already exist at top of src/core/workflow.ts

// CRITICAL: Follow TypeScript conventions - use proper type assertions
// Pattern from step.ts: getObservedState(this as object) OR getObservedState(this)
// Both work - 'this' in workflow.ts is already the Workflow instance

// CRITICAL: Logs capture is separate task (P1.M1.T1.S3)
// DO NOT modify logs: [] in this PRP - that's S3's responsibility
// This PRP ONLY modifies state: {} -> state: getObservedState(this)

// CRITICAL: Test P1.M1.T1.S4 already exists and validates this fix
// The test creates a custom workflow with @ObservedState fields
// It expects state to contain those fields, not empty object
```

## Implementation Blueprint

### Data Models and Structure

This task modifies existing code - no new data models needed.

**Relevant Types** (for context):
```typescript
// From src/types/snapshot.ts
export type SerializedWorkflowState = Record<string, unknown>;

// From src/types/error.ts (inferred)
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // <-- This is what we're fixing
  logs: LogEntry[];
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY P1.M1.T1.S1 COMPLETION
  - CHECK: src/core/workflow.ts has import: import { getObservedState } from '../decorators/observed-state.js';
  - VALIDATE: Import exists at top of file (should be around line 16-22)
  - IF MISSING: Do NOT proceed - P1.M1.T1.S1 must be completed first
  - DEPENDENCIES: None

Task 2: LOCATE TARGET CODE IN workflow.ts
  - FIND: runFunctional() method at lines 258-301
  - LOCATE: catch block at lines 286-297
  - IDENTIFY: Line with `state: {}` (currently line 295)
  - PRESERVE: All surrounding code structure
  - DEPENDENCIES: Task 1

Task 3: MODIFY ERROR HANDLER - Replace Empty State
  - CHANGE: Line 295 from `state: {}` to `state: getObservedState(this)`
  - ALTERNATIVE: Can use `getObservedState(this as object)` (matches step.ts pattern)
  - DO NOT MODIFY: `logs: []` - that's P1.M1.T1.S3
  - PRESERVE: All other error object fields (message, original, workflowId, stack)
  - DEPENDENCIES: Task 2

Task 4: VERIFY SYNTAX AND TYPES
  - RUN: npm run build (or check TypeScript compilation)
  - CHECK: No type errors related to getObservedState call
  - VALIDATE: state property type matches SerializedWorkflowState
  - DEPENDENCIES: Task 3

Task 5: RUN EXISTING TESTS
  - RUN: npm test (executes vitest)
  - FOCUS: Test "should capture state and logs in functional workflow error" (lines 82-130)
  - VERIFY: All tests pass, especially workflow error handling tests
  - DEPENDENCIES: Task 4
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// CURRENT CODE (Lines 286-297 in src/core/workflow.ts)
// ============================================================
catch (error) {
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
      state: {},  // <-- TARGET: Replace this line
      logs: [],   // <-- DO NOT TOUCH (handled by P1.M1.T1.S3)
    },
  });

  throw error;
}

// ============================================================
// REFERENCE PATTERN FROM @Step DECORATOR (step.ts:114)
// ============================================================
const snap = getObservedState(this as object);

const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: snap,  // <-- This is the pattern to follow
  logs: [...wf.node.logs] as LogEntry[],
};

// ============================================================
// TARGET MODIFICATION (SINGLE LINE CHANGE)
// ============================================================
// Option A: Direct replacement (simplest)
      state: getObservedState(this),

// Option B: Following step.ts pattern with intermediate variable
      state: getObservedState(this as object),

// BOTH OPTIONS WORK - Option A is cleaner since 'this' is already Workflow instance
// ============================================================
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS:
  - This is a bug fix modifying existing error handling
  - Error object structure remains the same
  - Only state VALUE changes from {} to actual captured state
  - No API changes, no breaking changes

DEPENDENCY CHAIN:
  - P1.M1.T1.S1 (Complete): Adds getObservedState import
  - P1.M1.T1.S2 (This Task): Uses getObservedState in error handler
  - P1.M1.T1.S3 (Complete): Adds logs capture (already done based on git history)
  - P1.M1.T1.S4 (Complete): Test validating state and logs capture
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after code modification - fix before proceeding
npm run build                    # TypeScript compilation check
# Expected: Zero compilation errors

# Format check (project uses consistent formatting)
npm run format                   # If format script exists
# Expected: No formatting issues

# Type checking
npx tsc --noEmit                # Type check without emitting files
# Expected: Zero type errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the specific functionality
npm test src/__tests__/unit/workflow.test.ts

# Run all workflow-related tests
npm test -- workflow

# Run specific test for error state capture
npm test -t "should capture state and logs"

# Full test suite for affected area
npm test

# Expected: All tests pass, specifically:
# - "should capture state and logs in functional workflow error" passes
# - Error event contains non-empty state object when workflow has @ObservedState fields
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual verification with error handling example
cd /home/dustin/projects/groundswell
node dist/examples/examples/05-error-handling.js

# Expected:
# - Error events are emitted
# - Error state property contains captured values (not empty object)
# - Error logs property contains log entries

# Verify via debugger (if tree debugger is available)
# Expected: Tree debugger shows actual state values in error events
```

### Level 4: Domain-Specific Validation

```bash
# Test with custom workflow class that has @ObservedState fields
# This is what the test does - create a similar verification:

node -e "
const { Workflow } = require('./dist/index.js');

class TestWorkflow extends Workflow {
  constructor() {
    super({ name: 'test' }, async (ctx) => {
      ctx.log('Setting state');
      this.testValue = 'captured';
      throw new Error('Test error');
    });
  }
}

// Add @ObservedState decorator to testValue field
// Run workflow and check error.state contains { testValue: 'captured' }
"

# Expected:
# - Error object contains state: { testValue: 'captured' }
# - NOT state: {}
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript compilation errors: `npm run build`
- [ ] No type errors: `npx tsc --noEmit`

### Feature Validation

- [ ] Success criteria met: `state: getObservedState(this)` instead of `state: {}`
- [ ] Pattern matches `@Step` decorator: Uses same getObservedState approach
- [ ] Existing test P1.M1.T1.S4 passes
- [ ] No breaking changes to error object structure

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches step.ts pattern)
- [ ] File placement correct (modifying existing file, no new files)
- [ ] Import statement exists from P1.M1.T1.S1
- [ ] Only modified state line, did not touch logs (separate task)

### Documentation & Deployment

- [ ] Code is self-documenting (getObservedState is descriptive)
- [ ] No environment variables added
- [ ] No new dependencies introduced

---

## Anti-Patterns to Avoid

- ❌ **Don't modify logs capture** - That's P1.M1.T1.S3's responsibility (already complete)
- ❌ **Don't add @ObservedState to Workflow class** - Base class correctly has no decorated fields
- ❌ **Don't change error object structure** - Only change the VALUE of state property
- ❌ **Don't skip verifying P1.M1.T1.S1 completion** - Import must exist first
- ❌ **Don't use different pattern than step.ts** - Consistency is critical
- ❌ **Don't modify test file** - Test P1.M1.T1.S4 already validates this fix
- ❌ **Don't create new files** - This is a single-line modification task
- ❌ **Don't add "as any" type casts** - Proper types already exist

---

## Confidence Score

**9/10** for one-pass implementation success likelihood

**Justification**:
- Clear single-line modification with exact location specified
- Reference pattern exists and is well-documented (@Step decorator)
- Import dependency (P1.M1.T1.S1) is already complete
- Test (P1.M1.T1.S4) already exists to validate the fix
- No new files or complex logic required
- Type system provides safety

**Risk Factors**:
- Minor: If P1.M1.T1.S1 import is missing, task cannot proceed
- Minor: getObservedState returning {} might be confusing (but is expected behavior)

**Mitigation**: PRP explicitly checks for import dependency and documents expected {} behavior for base Workflow class.
