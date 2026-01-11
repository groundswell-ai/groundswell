# PRP: Replace Empty State with getObservedState in runFunctional() Catch Block

**Task ID**: P1.M1.T1.S2
**Status**: Ready for Implementation
**Story Points**: 1
**Dependencies**: P1.M1.T1.S1 (Complete)

---

## Goal

**Feature Goal**: Fix the empty `state: {}` placeholder in the `runFunctional()` method's error handler to capture actual workflow state using `getObservedState(this)`.

**Deliverable**: Single-line modification to `src/core/workflow.ts` line 294, replacing `state: {}` with `state: getObservedState(this)`.

**Success Definition**:
- The error handler captures actual workflow state instead of empty object
- State is properly typed as `SerializedWorkflowState` (Record<string, unknown>)
- The captured state includes all fields decorated with `@ObservedState()`
- Error events emitted from functional workflows contain introspectable state
- Existing workflow functionality remains unchanged (no behavioral side effects)

---

## User Persona

**Target User**: Developer debugging functional workflow failures

**Use Case**: When a functional workflow fails, the developer needs to inspect the workflow state at the time of error to understand what led to the failure and potentially restart the workflow from that state.

**User Journey**:
1. Developer creates a functional workflow using `new Workflow({ executor })`
2. Workflow execution fails at some point
3. Error event is emitted with error details
4. Developer inspects `error.state` to see actual workflow state
5. Developer can analyze state to diagnose root cause or enable restart logic

**Pain Points Addressed**:
- Currently: `error.state` is always `{}` - no useful information
- After fix: `error.state` contains actual workflow state for debugging
- Enables error introspection and workflow restart capabilities

---

## Why

### Business Value and User Impact

1. **Debugging Capability**: Developers can see what state led to errors in functional workflows
2. **Restart Logic**: Captured state enables implementing workflow recovery/restart mechanisms
3. **Consistency**: Functional workflows now behave consistently with class-based workflows (which already capture state via `@Step` decorator)
4. **PRD Compliance**: Meets Section 5.1 requirements that `WorkflowError.state` must be populated with actual data

### Integration with Existing Features

- **P1.M1.T1.S1** (Complete): Already imported `getObservedState` at line 10 of workflow.ts
- **P1.M1.T1.S3** (Next): Will fix empty `logs: []` in same error handler
- **P1.M1.T1.S4** (Final): Will write tests for both state and logs capture
- **@Step Decorator**: Uses the same pattern at `src/decorators/step.ts:114`

### Problems Solved

- **Gap Analysis Issue #2**: Empty state/logs in functional workflow error handlers (Lines 126-135 of PRD vs Implementation gap analysis)
- **Inconsistency**: Class-based workflows capture state, functional workflows don't
- **Lost Context**: Error events from functional workflows contain no debugging information

---

## What

### User-Visible Behavior

**Before**: Error events from functional workflows have `state: {}`

```typescript
// Current error event output
{
  type: 'error',
  error: {
    message: 'Something failed',
    state: {},  // Empty - no debugging information
    logs: []
  }
}
```

**After**: Error events from functional workflows have `state: { /* actual workflow state */ }`

```typescript
// Fixed error event output
{
  type: 'error',
  error: {
    message: 'Something failed',
    state: { userId: '123', retryCount: 3, lastResult: {...} },  // Actual state!
    logs: [...]  // Will be fixed in P1.M1.T1.S3
  }
}
```

### Technical Requirements

1. Modify line 294 of `src/core/workflow.ts`
2. Replace `state: {}` with `state: getObservedState(this)`
3. No other changes to error object structure
4. No changes to error handling logic
5. Type safety: `getObservedState(this)` returns `SerializedWorkflowState` which matches `WorkflowError.state` type

### Success Criteria

- [ ] Line 294 changed from `state: {}` to `state: getObservedState(this)`
- [ ] No TypeScript compilation errors
- [ ] All existing tests pass
- [ ] Error events from functional workflows contain populated state object
- [ ] State includes all `@ObservedState()` decorated fields from workflow instance

---

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validated: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**YES** - This PRP includes:
- Exact file path and line number to modify
- Complete code context showing current implementation
- Reference implementation from `@Step` decorator showing the exact pattern to follow
- Complete `getObservedState` function signature and implementation
- Type definitions for all involved interfaces
- Test commands to validate the change
- Gotchas and constraints specific to this codebase

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://blog.logrocket.com/async-await-typescript/
  why: Error handling patterns in async/try-catch contexts
  critical: State is preserved within try-catch scope in async functions

- url: https://javascript.info/custom-errors
  why: Error enrichment patterns - adding context to errors
  critical: Use `cause` property and custom error fields for error enrichment

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
  why: Custom error types and best practices
  critical: Serialize errors properly, preserve stack traces

- file: src/core/workflow.ts
  why: Target file for modification - runFunctional() method error handler
  pattern: Error event emission pattern in catch block (lines 286-297)
  gotcha: getObservedState already imported at line 10 from P1.M1.T1.S1

- file: src/decorators/step.ts
  why: Reference implementation showing exact pattern to follow (line 114)
  pattern: `const snap = getObservedState(this as object);` then `state: snap`
  gotcha: Uses `this as object` cast for type safety

- file: src/decorators/observed-state.ts
  why: Implementation of getObservedState function (lines 50-77)
  pattern: Returns `SerializedWorkflowState` (Record<string, unknown>)
  gotcha: Uses WeakMap - only returns fields decorated with @ObservedState()

- file: src/types/snapshot.ts
  why: Type definitions for SerializedWorkflowState and StateFieldMetadata
  pattern: `export type SerializedWorkflowState = Record<string, unknown>;`
  gotcha: State structure is flexible key-value pairs

- file: src/types/index.ts
  why: Complete type definitions including WorkflowError interface
  pattern: `interface WorkflowError { state: SerializedWorkflowState; logs: LogEntry[]; }`
  gotcha: State and logs are both required fields

- file: plan_bugfix/architecture/ANALYSIS_PRD_VS_IMPLEMENTATION.md
  why: Context for this bug fix within the overall initiative
  section: Issue #2 (Lines 126-135)
  gotcha: This is part of P1.M1.T1 which has 4 sequential subtasks

- file: plan_bugfix/P1M1T1S2/research/error_handling_patterns.md
  why: External research on TypeScript error handling best practices
  section: WeakMap-Based State Capture and 'this' in Catch Blocks
  gotcha: Arrow functions preserve lexical this - runFunctional uses async method

- file: src/__tests__/integration/agent-workflow.test.ts
  why: Existing test patterns for error handling in workflows
  pattern: Observer pattern for event collection, `rejects.toThrow()` for async errors
  gotcha: Tests validate error events are emitted with proper structure
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts           # TARGET FILE - line 294
│   │   ├── workflow-context.ts   # Related file (P1.M1.T2 will fix similar issue)
│   │   └── index.ts
│   ├── decorators/
│   │   ├── step.ts               # Reference implementation (line 114)
│   │   ├── observed-state.ts     # getObservedState implementation (lines 50-77)
│   │   └── index.ts
│   ├── types/
│   │   ├── snapshot.ts           # SerializedWorkflowState type
│   │   ├── index.ts              # WorkflowError interface
│   │   └── ...
│   └── __tests__/
│       ├── integration/
│       │   └── agent-workflow.test.ts  # Error handling test patterns
│       └── unit/
│           └── workflow.test.ts        # Workflow unit tests
└── plan_bugfix/
    ├── architecture/
    │   └── ANALYSIS_PRD_VS_IMPLEMENTATION.md
    └── P1M1T1S2/
        ├── PRP.md                 # This file
        └── research/
            └── error_handling_patterns.md  # External research
```

### Desired Codebase Tree with Files to be Modified

```bash
# No new files - single line modification to existing file

src/
└── core/
    └── workflow.ts  # MODIFY: Line 294 - change `state: {}` to `state: getObservedState(this)`
```

### Known Gotchas of This Codebase & Library Quirks

```typescript
// CRITICAL: getObservedState uses WeakMap-based metadata storage
// Only returns fields decorated with @ObservedState() - returns {} if none
// Location: src/decorators/observed-state.ts lines 50-77

// CRITICAL: 'this' in catch block refers to Workflow class instance
// runFunctional is an async method, so 'this' is properly bound
// No arrow function gotcha - async methods preserve class instance context

// CRITICAL: getObservedState already imported at line 10 (from P1.M1.T1.S1)
// Import statement: import { getObservedState } from '../decorators/observed-state.js';
// Do NOT add duplicate import - use existing import

// PATTERN: Follow @Step decorator pattern (src/decorators/step.ts:114)
// Reference code: const snap = getObservedState(this as object);
// Note: Uses `this as object` cast for type safety

// GOTCHA: this.node.stateSnapshot may be null if snapshotState() never called
// getObservedState(this) reads from WeakMap metadata, not from stateSnapshot
// These are two different mechanisms - use getObservedState, not stateSnapshot

// GOTCHA: Functional workflows don't use @Step decorator
// They use executor function pattern: new Workflow({ executor })
// But they can still have @ObservedState() decorated fields in custom Workflow subclasses
// The getObservedState function works regardless of executor pattern

// TESTING: Use Vitest framework (not Jest)
// Run tests with: npm test or vitest run
// Test files use .test.ts extension in src/__tests__/ directories
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - using existing types:

```typescript
// From src/types/snapshot.ts
export type SerializedWorkflowState = Record<string, unknown>;

// From src/types/index.ts (WorkflowError interface)
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // Type matches getObservedState return type
  logs: LogEntry[];
}
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: MODIFY src/core/workflow.ts line 294
  - CHANGE: `state: {}` → `state: getObservedState(this)`
  - LOCATION: Error handler catch block, lines 286-297, specifically line 294
  - FOLLOW pattern: src/decorators/step.ts line 114
  - REFERENCE: `const snap = getObservedState(this as object);` then `state: snap`
  - NOTE: getObservedState already imported at line 10 from P1.M1.T1.S1
  - CONTEXT: Async method catch block, 'this' refers to Workflow instance

Task 2: VALIDATE TypeScript compilation
  - RUN: npm run build or tsc --noEmit
  - VERIFY: No type errors related to getObservedState or WorkflowError.state
  - EXPECTED: Zero compilation errors

Task 3: RUN existing test suite
  - RUN: npm test or vitest run
  - VERIFY: All existing tests still pass
  - FOCUS: src/__tests__/unit/workflow.test.ts and integration/agent-workflow.test.ts
  - EXPECTED: All tests pass (this change should not break any existing tests)

Task 4: MANUAL VERIFICATION (optional but recommended)
  - CREATE: Test functional workflow with @ObservedState() decorated field
  - RUN: Workflow and trigger error
  - VERIFY: Error event contains populated state object
  - CONFIRM: State includes decorated field values
```

### Implementation Patterns & Key Details

```typescript
// Current implementation (WRONG):
// File: src/core/workflow.ts, lines 286-297

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
      state: {},      // ← Line 294 - EMPTY OBJECT (WRONG)
      logs: [],       // ← Line 295 - Will be fixed in P1.M1.T1.S3
    },
  });

  throw error;
}

// Target implementation (CORRECT):
// File: src/core/workflow.ts, line 294

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
      state: getObservedState(this),  // ← Line 294 - CAPTURE ACTUAL STATE (CORRECT)
      logs: [],                       // ← Line 295 - Will be fixed in P1.M1.T1.S3
    },
  });

  throw error;
}

// Reference implementation from @Step decorator:
// File: src/decorators/step.ts, lines 114-122

} catch (err: unknown) {
  stepNode.status = 'failed';
  const error = err as Error;
  const snap = getObservedState(this as object);  // ← Pattern to follow

  const workflowError: WorkflowError = {
    message: error?.message ?? 'Unknown error',
    original: err,
    workflowId: wf.id,
    stack: error?.stack,
    state: snap,                    // ← Use the captured snapshot
    logs: [...wf.node.logs],
  };
  // ... error handling continues
}

// Key differences from @Step pattern:
// 1. runFunctional doesn't use 'this as object' cast - 'this' is already Workflow instance
// 2. runFunctional doesn't create intermediate 'snap' variable - can inline getObservedState(this)
// 3. runFunctional uses 'error' variable name, not 'err' - match existing code style
```

### Integration Points

```yaml
NO NEW INTEGRATIONS - Single line modification to existing code

DEPENDS ON:
  - P1.M1.T1.S1: Added getObservedState import to workflow.ts (COMPLETE)
    Import at line 10: import { getObservedState } from '../decorators/observed-state.js';

ENABLES:
  - P1.M1.T1.S3: Will fix empty logs: [] in same error handler
  - P1.M1.T1.S4: Will write tests for both state and logs capture
  - P1.M1.T2: Will apply same pattern to WorkflowContext error handlers

RELATED CODE:
  - src/decorators/step.ts:114 - Reference implementation
  - src/decorators/observed-state.ts:50-77 - Function implementation
  - src/types/snapshot.ts - Type definitions
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying line 294, run these commands to verify syntax

# Type checking (catches type errors early)
npm run build
# OR if using tsc directly:
npx tsc --noEmit

# Expected: Zero compilation errors
# If errors occur, check:
# - getObservedState import exists (should already be at line 10)
# - Type mismatch between SerializedWorkflowState and WorkflowError.state (should match)
# - 'this' context is correct in async method

# Linting (if using ESLint or similar)
npm run lint
# OR if using eslint directly:
npx eslint src/core/workflow.ts

# Expected: Zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all workflow tests
npm test -- src/__tests__/unit/workflow.test.ts

# Run integration tests for workflow error handling
npm test -- src/__tests__/integration/agent-workflow.test.ts

# Run full test suite to ensure no regressions
npm test
# OR using vitest directly:
npx vitest run

# Expected: All tests pass
# This change should not break any existing tests
# Test validation will be added in P1.M1.T1.S4

# Coverage check (if available)
npm run test:coverage
# Expected: Coverage for workflow.ts remains consistent
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual verification (optional but recommended)

# 1. Create a test workflow file
cat > test-state-capture.ts << 'EOF'
import { Workflow, ObservedState } from './src/index.js';

class TestWorkflow extends Workflow {
  @ObservedState()
  public testField: string = 'test-value';

  @ObservedState()
  public counter: number = 42;
}

const workflow = new TestWorkflow({ name: 'StateTest' }, async (ctx) => {
  await ctx.step('failing-step', async () => {
    throw new Error('Test error with state');
  });
});

// Add observer to capture error event
const observer = {
  onLog: () => {},
  onEvent: (event: any) => {
    if (event.type === 'error') {
      console.log('Error state:', JSON.stringify(event.error.state, null, 2));
      console.log('Expected: { testField: "test-value", counter: 42 }');
    }
  },
  onStateUpdated: () => {},
  onTreeChanged: () => {}
};

workflow.addObserver(observer);

workflow.run().catch(() => {
  console.log('Workflow failed as expected');
});
EOF

# 2. Run the test workflow
npx tsx test-state-capture.ts

# Expected output:
# Error state: {
#   "testField": "test-value",
#   "counter": 42
# }
# Expected: { testField: "test-value", counter: 42 }
# Workflow failed as expected

# 3. Clean up test file
rm test-state-capture.ts
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Domain-specific validation for workflow state capture

# Test 1: Verify state capture with different field types
# Test 2: Verify state capture with nested objects
# Test 3: Verify state capture with @ObservedState({ redact: true }) fields
# Test 4: Verify state capture with @ObservedState({ hidden: true }) fields (should be excluded)

# These tests will be implemented in P1.M1.T1.S4
# For now, manual verification is sufficient

# Performance validation (state capture should be fast)
# The getObservedState function uses WeakMap which is O(n) where n = number of observed fields
# Typical workflow has < 10 observed fields, so performance impact is negligible

# Memory leak validation
# WeakMap-based metadata doesn't prevent garbage collection
# No memory leaks expected from this change
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Line 294 modified: `state: {}` → `state: getObservedState(this)`
- [ ] No TypeScript compilation errors: `npm run build` passes
- [ ] All existing tests pass: `npm test` passes
- [ ] No linting errors (if applicable): `npm run lint` passes
- [ ] Import verification: getObservedState imported at line 10 (from P1.M1.T1.S1)

### Feature Validation

- [ ] Error events from functional workflows contain populated state object
- [ ] State includes fields decorated with @ObservedState()
- [ ] State type matches SerializedWorkflowState (Record<string, unknown>)
- [ ] Manual testing successful: error.state shows actual values, not empty object
- [ ] No behavioral side effects: existing workflow functionality unchanged

### Code Quality Validation

- [ ] Follows @Step decorator pattern (src/decorators/step.ts:114)
- [ ] Type-safe: getObservedState(this) returns correct type for WorkflowError.state
- [ ] No duplicate imports: uses existing getObservedState import from line 10
- [ ] Maintains existing code style: matches error object structure
- [ ] Single responsibility: only changes state capture, doesn't touch logs (P1.M1.T1.S3)

### Documentation & Deployment

- [ ] Change is self-documenting: getObservedState(this) clearly indicates intent
- [ ] No new environment variables or configuration required
- [ ] No migration needed: backward compatible change
- [ ] Ready for P1.M1.T1.S3: logs fix in same error handler
- [ ] Ready for P1.M1.T1.S4: comprehensive test coverage for both state and logs

---

## Anti-Patterns to Avoid

- ❌ **Don't add duplicate import**: getObservedState already imported at line 10 from P1.M1.T1.S1
- ❌ **Don't use `this as object` cast**: Not needed in runFunctional context (unlike @Step decorator)
- ❌ **Don't create intermediate variable**: Direct inline `getObservedState(this)` is cleaner
- ❌ **Don't modify logs line 295**: That's P1.M1.T1.S3's responsibility
- ❌ **Don't change error handling logic**: Only change state capture, preserve all other behavior
- ❌ **Don't use `this.node.stateSnapshot`**: Wrong mechanism - use getObservedState(this) instead
- ❌ **Don't add null check**: getObservedState already handles empty case (returns {})
- ❌ **Don't write tests yet**: P1.M1.T1.S4 will write comprehensive tests for both state and logs
- ❌ **Don't modify other error handlers**: P1.M1.T2 will fix WorkflowContext error handlers

---

## PRP Metadata

**Confidence Score**: 10/10 for one-pass implementation success

**Reasons for High Confidence**:
1. Single-line modification with exact line number specified
2. Reference implementation available in same codebase (@Step decorator)
3. All dependencies already satisfied (import added in P1.M1.T1.S1)
4. Type-safe change with matching return types
5. No behavioral changes - pure data capture improvement
6. Comprehensive validation commands provided
7. All gotchas and constraints documented
8. External research included for context

**Estimated Implementation Time**: 2 minutes for core change, 5 minutes with validation

**Risk Level**: Very Low
- Single line change
- No behavioral modifications
- No new dependencies
- Type-safe
- Follows existing pattern

**Next Tasks After Completion**:
1. P1.M1.T1.S3: Replace empty `logs: []` with `logs: [...this.node.logs] as LogEntry[]`
2. P1.M1.T1.S4: Write tests for both state and logs capture in runFunctional() error handler
3. P1.M1.T2: Apply same pattern to WorkflowContext error handlers

---

## Appendix: Quick Reference

### Files to Modify

```
src/core/workflow.ts - Line 294 only
```

### Change Summary

```diff
  state: {},      // ← Line 294 - BEFORE
- state: {},
+ state: getObservedState(this),
  logs: [],       // ← Line 295 - Will be fixed in P1.M1.T1.S3
```

### Validation Commands

```bash
# Build/type check
npm run build

# Run tests
npm test

# Manual verification (optional)
# See Level 3: Integration Testing section above
```

### Reference Implementation

```typescript
// File: src/decorators/step.ts, Line 114
const snap = getObservedState(this as object);
// ...
state: snap,
```

---

**PRP Version**: 1.0
**Last Updated**: 2025-01-10
**Author**: PRP Generation System
**Status**: Ready for Implementation
