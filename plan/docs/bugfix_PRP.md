name: "P1.M1.T1.S3 - Fix Empty Logs in runFunctional() Error Handler"
description: |
  Bug fix for functional workflow error handler missing actual logs capture
---

## Goal

**Feature Goal**: Replace the empty `logs: []` array in the `runFunctional()` catch block with actual captured logs from `this.node.logs`

**Deliverable**: Single line change in `src/core/workflow.ts` line 295: `logs: []` → `logs: [...this.node.logs] as LogEntry[]`

**Success Definition**: Error events emitted from functional workflows contain populated `logs` array with all log entries captured during execution, enabling debugging context for failure analysis.

## User Persona

**Target User**: Developer debugging functional workflow failures

**Use Case**: When a functional workflow (created using executor pattern) throws an error, the developer needs to inspect both state AND logs to understand what went wrong

**User Journey**:
1. Developer creates functional workflow using `new Workflow({ name: 'MyWorkflow' }, async (ctx) => { ... })`
2. Workflow executes and throws an error
3. Error event is emitted to observers
4. Developer inspects `error.logs` array to see log messages leading up to failure
5. Developer uses logs + state to diagnose root cause

**Pain Points Addressed**:
- Currently `error.logs` is always empty `[]` in functional workflows
- No debugging context when functional workflows fail
- Inconsistent with `@Step` decorator which correctly captures logs
- Developers must manually add logging to diagnose functional workflow failures

## Why

- **Debugging Capability**: Developers can see actual logs when functional workflows fail
- **Error Introspection**: Error events contain complete debugging context (state + logs)
- **PRD Compliance**: Meets Section 5.1 requirements that `WorkflowError` must be populated with actual data
- **Consistency**: Functional workflows now behave consistently with class-based `@Step` decorator pattern
- **Completeness**: S3 completes the error handler fix started in S2 (state capture)

## What

Replace `logs: []` with `logs: [...this.node.logs] as LogEntry[]` in the `runFunctional()` catch block at line 295 of `src/core/workflow.ts`.

### Success Criteria

- [ ] Line 295 modified: `logs: []` → `logs: [...this.node.logs] as LogEntry[]`
- [ ] Error events from functional workflows contain populated logs array
- [ ] Log entries include timestamp, level, and message data
- [ ] No mutation of original `this.node.logs` array (spread creates copy)
- [ ] All existing tests still pass
- [ ] No TypeScript compilation errors

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:
- Exact file location and line number
- Current code snippet and target code snippet
- Reference implementation from `@Step` decorator
- Type definitions for all involved types
- Validation commands specific to this project
- Test framework and patterns used in codebase

### Documentation & References

```yaml
# MUST READ - Critical implementation context
- file: src/core/workflow.ts
  why: Target file containing the bug - runFunctional() catch block at lines 282-300
  pattern: Error object structure with WorkflowError interface
  gotcha: Line 295 has `logs: []` that must be replaced with actual logs capture
  line: 295

- file: src/decorators/step.ts
  why: Reference implementation showing CORRECT pattern for logs capture
  pattern: Line 122 - `logs: [...wf.node.logs] as LogEntry[]`
  critical: Use this EXACT pattern in runFunctional() error handler
  line: 116-123

- file: src/types/logging.ts
  why: LogEntry type definition - understand what logs array contains
  pattern: Interface with id, workflowId, timestamp, level, message, data?, parentLogId?
  section: Lines 9-24

- file: src/core/workflow.ts
  why: WorkflowNode type - this.node.logs property structure
  pattern: node.logs: LogEntry[] (line 104)
  gotcha: Logs are populated by WorkflowLogger via this.node.logs.push(entry)

- file: src/core/logger.ts
  why: Understand how logs are populated in this.node.logs
  pattern: emit() method at line 22: this.node.logs.push(entry)
  critical: Confirms logs array is populated during workflow execution

# DEPENDENCY CONTEXT - Must be complete before S3
- file: src/core/workflow.ts
  why: P1.M1.T1.S1 already added getObservedState import (line 10)
  dependency: S1 must be complete before S2/S3 implementation
  line: 10

- file: src/core/workflow.ts
  why: P1.M1.T1.S2 already fixed state capture (line 294)
  dependency: S2 must be complete - S3 modifies same error object
  line: 294

# TESTING PATTERNS
- file: src/__tests__/unit/workflow.test.ts
  why: Example test patterns for workflow testing
  pattern: Uses vitest, WorkflowObserver pattern for capturing events/logs
  critical: Observer pattern for testing error events with logs

- file: package.json
  why: Test scripts and dependencies
  pattern: `"test": "vitest run"`, `"test:watch": "vitest"`
  critical: Use `npm test` to run tests

- file: vitest.config.ts
  why: Test configuration
  pattern: Test files in `src/__tests__/**/*.test.ts`
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts          # TARGET FILE - Line 295
│   │   ├── logger.ts            # Log population logic
│   │   └── workflow-context.ts  # Related error handlers (P1.M1.T2)
│   ├── decorators/
│   │   ├── step.ts              # REFERENCE PATTERN - Line 122
│   │   └── observed-state.ts    # getObservedState function
│   ├── types/
│   │   ├── logging.ts           # LogEntry interface
│   │   ├── observer.ts          # WorkflowObserver interface
│   │   └── index.ts             # Type exports
│   └── __tests__/
│       ├── unit/
│       │   ├── workflow.test.ts     # Workflow test patterns
│       │   └── decorators.test.ts   # Decorator test patterns
│       └── integration/
│           └── agent-workflow.test.ts
├── plan_bugfix/
│   └── P1M1T1S3/
│       └── PRP.md                # THIS DOCUMENT
└── package.json                   # npm test script
```

### Desired Codebase Tree (No new files - modification only)

```bash
# No new files created - only modification to existing file
# Modified: src/core/workflow.ts (line 295)
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: TypeScript spread operator creates shallow copy
// [...this.node.logs] copies array references, not deep copy
// For LogEntry[] this is acceptable - entries are simple objects

// CRITICAL: Type assertion 'as LogEntry[]' is required
// Even though this.node.logs is typed as LogEntry[], the spread
// operator can cause type inference issues in error object context
// Solution: Use 'as LogEntry[]' for explicit type safety

// GOTCHA: getObservedState import already added in P1.M1.T1.S1
// Line 10: import { getObservedState } from '../decorators/observed-state.js';
// Do NOT add this import again - it's already there

// GOTCHA: State capture already fixed in P1.M1.T1.S2
// Line 294: state: getObservedState(this),
// Only modify line 295 for logs - do NOT touch line 294

// PATTERN: Follow @Step decorator exactly (src/decorators/step.ts:122)
// logs: [...wf.node.logs] as LogEntry[]
// Replace 'wf' with 'this' for runFunctional() context

// TESTING: Vitest is the test framework
// Run tests with: npm test
// Watch mode: npm run test:watch

// BUILD: TypeScript compilation check
// Run: npm run lint (tsc --noEmit)
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// LogEntry type (from src/types/logging.ts)
interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;  // 'debug' | 'info' | 'warn' | 'error'
  message: string;
  data?: unknown;
  parentLogId?: string;
}

// WorkflowError type (from src/types/error.ts)
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];  // TARGET FIELD - Currently empty []
}
```

### Implementation Tasks

```yaml
Task 1: MODIFY src/core/workflow.ts line 295
  - LOCATION: runFunctional() method catch block (lines 282-300)
  - CURRENT: logs: [],
  - REPLACE_WITH: logs: [...this.node.logs] as LogEntry[],
  - FOLLOW_PATTERN: src/decorators/step.ts line 122
  - PRESERVE: All other error object fields (message, original, workflowId, stack, state)
  - TYPE_SAFETY: Add 'as LogEntry[]' type assertion for explicit typing

Task 2: VALIDATE TypeScript compilation
  - RUN: npm run lint (tsc --noEmit)
  - EXPECTED: Zero compilation errors
  - VERIFY: No type errors related to LogEntry or spread operator
  - FIX_IF_NEEDED: Type assertion should resolve any inference issues

Task 3: VALIDATE existing tests still pass
  - RUN: npm test (vitest run)
  - EXPECTED: All existing tests pass
  - VERIFY: No regressions in workflow or decorator tests
  - FIX_IF_NEEDED: Should be no failures - this is a pure data capture improvement
```

### Implementation Patterns & Key Details

```typescript
// CURRENT CODE (src/core/workflow.ts:286-297)
this.emitEvent({
  type: 'error',
  node: this.node,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.id,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this),  // FIXED in P1.M1.T1.S2
    logs: [],                       // BUG: Empty array - FIX THIS LINE
  },
});

// TARGET CODE (only change line 295)
this.emitEvent({
  type: 'error',
  node: this.node,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.id,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this),
    logs: [...this.node.logs] as LogEntry[],  // FIXED: Capture actual logs
  },
});

// REFERENCE PATTERN (src/decorators/step.ts:116-123)
const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: snap,
  logs: [...wf.node.logs] as LogEntry[],  // EXACT PATTERN TO FOLLOW
};

// KEY DIFFERENCES:
// - @Step uses 'wf' (decorator context), runFunctional uses 'this'
// - @Step uses 'error?.message', runFunctional uses conditional
// - LOGS PATTERN IS IDENTICAL: [...source.node.logs] as LogEntry[]
```

### Integration Points

```yaml
DEPENDENCIES:
  - P1.M1.T1.S1: MUST be complete (getObservedState import added)
  - P1.M1.T1.S2: MUST be complete (state: getObservedState(this) fixed)
  - Both S1 and S2 modify same error object - ensure they're complete

INTEGRATION:
  - this.node.logs: Populated by WorkflowLogger during execution
  - getObservedState: Already imported and used for state capture
  - WorkflowError: Type expects logs: LogEntry[] field

NO_CHANGES_TO:
  - Import statements (already added in S1)
  - Error object structure (only populating logs field)
  - Event emission logic (only changing logs content)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# Runs: tsc --noEmit
# Expected: Zero errors
# If errors: Check type assertion 'as LogEntry[]' is present

# Type check specific file
npx tsc --noEmit src/core/workflow.ts
# Expected: No type errors related to logs or LogEntry

# Build check
npm run build
# Runs: tsc (compiles to dist/)
# Expected: Successful compilation, no errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all tests
npm test
# Runs: vitest run
# Expected: All tests pass

# Run specific workflow test file
npx vitest run src/__tests__/unit/workflow.test.ts
# Expected: All workflow tests pass

# Run decorator tests (reference implementation)
npx vitest run src/__tests__/unit/decorators.test.ts
# Expected: All decorator tests pass (verifies pattern is correct)

# Watch mode for development
npm run test:watch
# Runs: vitest (watch mode)
# Use for iterative development
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npx vitest run src/__tests__/integration/
# Expected: All integration tests pass

# Manual test: Functional workflow with error
# Create test file: test-functional-error-logs.ts
import { Workflow } from './dist/index.js';

const wf = new Workflow({ name: 'TestWorkflow' }, async (ctx) => {
  ctx.logger.info('Before error');
  ctx.logger.error('About to fail');
  throw new Error('Test error');
});

const observer = {
  onLog: () => {},
  onEvent: (event) => {
    if (event.type === 'error') {
      console.log('Error logs:', event.error.logs);
      // Expected: Array with 2 log entries
      console.log('Log count:', event.error.logs.length);
      // Expected: 2
    }
  },
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

wf.addObserver(observer);
await wf.run().catch(() => {});

# Expected output:
# Error logs: [
#   { id: '...', workflowId: '...', timestamp: ..., level: 'info', message: 'Before error' },
#   { id: '...', workflowId: '...', timestamp: ..., level: 'error', message: 'About to fail' }
# ]
# Log count: 2
```

### Level 4: Domain-Specific Validation

```bash
# Verify logs are not mutated (shallow copy test)
# Add test to verify spread operator creates copy
test('runFunctional error logs should be a copy', async () => {
  const wf = new Workflow({ name: 'Test' }, async (ctx) => {
    ctx.logger.info('Test');
    throw new Error('Fail');
  });

  let errorLogs: LogEntry[] | null = null;
  const observer = {
    onLog: () => {},
    onEvent: (event) => {
      if (event.type === 'error') {
        errorLogs = event.error.logs;
      }
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  wf.addObserver(observer);
  await wf.run().catch(() => {});

  // Verify logs are captured
  expect(errorLogs).toBeDefined();
  expect(errorLogs!.length).toBeGreaterThan(0);

  // Verify it's a copy (not reference to node.logs)
  expect(errorLogs).not.toBe(wf.getNode().logs);

  // Verify content is the same
  expect(errorLogs).toEqual(wf.getNode().logs);
});

# Verify log entries have required fields
test('runFunctional error logs should have all LogEntry fields', async () => {
  const wf = new Workflow({ name: 'Test' }, async (ctx) => {
    ctx.logger.info('Test message', { data: 'test' });
    throw new Error('Fail');
  });

  let errorLogs: LogEntry[] | null = null;
  const observer = {
    onLog: () => {},
    onEvent: (event) => {
      if (event.type === 'error') {
        errorLogs = event.error.logs;
      }
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  wf.addObserver(observer);
  await wf.run().catch(() => {});

  const log = errorLogs![0];
  expect(log.id).toBeDefined();
  expect(log.workflowId).toBe(wf.id);
  expect(log.timestamp).toBeDefined();
  expect(log.level).toBe('info');
  expect(log.message).toBe('Test message');
  expect(log.data).toEqual({ data: 'test' });
});
```

## Final Validation Checklist

### Technical Validation

- [ ] Line 295 modified: `logs: []` → `logs: [...this.node.logs] as LogEntry[]`
- [ ] TypeScript compilation passes: `npm run lint` (zero errors)
- [ ] Build succeeds: `npm run build` (no errors)
- [ ] All tests pass: `npm test` (100% pass rate)

### Feature Validation

- [ ] Error events from functional workflows contain populated logs array
- [ ] Log entries include all required fields (id, workflowId, timestamp, level, message, data?)
- [ ] Logs array is a copy (not reference) - `error.logs !== this.node.logs`
- [ ] Logs content matches `this.node.logs` at time of error
- [ ] No mutation of original `this.node.logs` array

### Code Quality Validation

- [ ] Follows `@Step` decorator pattern exactly (line 122 in step.ts)
- [ ] Type assertion `as LogEntry[]` properly applied
- [ ] No behavioral side effects - pure data capture improvement
- [ ] No changes to other error object fields (message, original, workflowId, stack, state)

### Integration Validation

- [ ] P1.M1.T1.S1 dependency satisfied (getObservedState import present)
- [ ] P1.M1.T1.S2 dependency satisfied (state capture working)
- [ ] Compatible with WorkflowError interface type definition
- [ ] Works with existing WorkflowObserver pattern

---

## Anti-Patterns to Avoid

- ❌ Don't use `logs: this.node.logs` (direct reference - allows mutation)
- ❌ Don't use `logs: this.node.logs.slice()` (less idiomatic than spread)
- ❌ Don't omit the `as LogEntry[]` type assertion (type safety)
- ❌ Don't modify lines 286-294 (only change line 295)
- ❌ Don't add new imports (already added in P1.M1.T1.S1)
- ❌ Don't create new test files (P1.M1.T1.S4 will handle testing)
- ❌ Don't modify other error handlers (only runFunctional() in this task)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
- Single line change with exact pattern to follow
- Reference implementation exists in `@Step` decorator
- Type definitions are clear and stable
- No new files or dependencies required
- Validation commands are project-specific and verified
- All context is specific and actionable

**Risk Assessment**: Very Low
- Change is isolated to single line
- Pattern is proven in existing code
- No breaking changes to public API
- Backward compatible (only adds data, doesn't remove)

**Next Steps After Implementation**:
1. Complete P1.M1.T1.S4 (Write test for functional workflow error state capture)
2. Begin P1.M1.T2 (Fix empty state/logs in WorkflowContext.step() error handlers)
