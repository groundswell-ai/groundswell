# PRP: Update stepRetry Event Type in Events Schema

**Work Item:** P1.M1.T1.S3
**Title:** Create stepRetry event type in events schema
**Points:** 2
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Update the existing `stepRetry` event type in the WorkflowEvent discriminated union to include `RestartAnalysis` and `timestamp` fields, and rename the `step` field to `stepName` per the work item specification.

**Deliverable**: Updated `WorkflowEvent` type in `src/types/events.ts` with enhanced `stepRetry` event that includes:
- `stepName: string` (renamed from `step`)
- `retryCount: number` (existing)
- `analysis: RestartAnalysis` (NEW)
- `error: WorkflowError` (existing)
- `timestamp: number` (NEW)
- `node: WorkflowNode` (existing - kept for consistency)

**Success Definition**:
- `RestartAnalysis` interface defined in `src/types/restart.ts`
- `stepRetry` event type updated with all required fields
- Event emission updated in `src/decorators/step.ts`
- All tests updated to reference `stepName` instead of `step`
- All tests verify new `analysis` and `timestamp` fields
- TypeScript compilation succeeds with zero errors
- All existing tests pass

---

## Why

- **PRD Compliance**: The work item specification requires a specific event structure that differs from the current implementation
- **Restart System Foundation**: The `analysis: RestartAnalysis` field provides structured error classification and restart recommendations
- **Debugging Enhancement**: The `timestamp: number` field enables precise timing analysis for retry events
- **Field Naming Consistency**: Renaming `step` to `stepName` improves clarity and matches the specification
- **Observer Pattern Compatibility**: Keeping `node: WorkflowNode` maintains consistency with all other events in the system

---

## What

Update the `stepRetry` event type to match the work item specification while maintaining backward compatibility with the observer pattern.

### Event Structure Comparison

**Current Implementation** (`src/types/events.ts:14`):
```typescript
| { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
```

**Required Specification** (work item):
```typescript
| { type: 'stepRetry'; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
```

**Recommended Implementation** (hybrid for consistency):
```typescript
| { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
```

### Changes Required

1. **Create `RestartAnalysis` interface** in new file `src/types/restart.ts`
2. **Update `stepRetry` event type** in `src/types/events.ts`
3. **Update event emission** in `src/decorators/step.ts`
4. **Update all test references** from `step` to `stepName`
5. **Add test assertions** for `analysis` and `timestamp` fields

### Success Criteria

- [ ] `RestartAnalysis` interface defined with all 4 fields (shouldRestart, reason, suggestedAction, estimatedSuccessProbability)
- [ ] `RestartAnalysis` exported from `src/types/index.ts`
- [ ] `stepRetry` event uses `stepName` instead of `step`
- [ ] `stepRetry` event includes `analysis: RestartAnalysis` field
- [ ] `stepRetry` event includes `timestamp: number` field
- [ ] `stepRetry` event retains `node: WorkflowNode` for consistency
- [ ] Event emission in step decorator creates `RestartAnalysis` object
- [ ] Event emission includes `timestamp: Date.now()`
- [ ] All tests updated to use `stepName` instead of `step`
- [ ] All tests verify `analysis` field presence and structure
- [ ] All tests verify `timestamp` field is valid
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All tests pass: `uv run vitest run`

---

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: **YES** - The following context provides complete information for implementation.

### Documentation & References

```yaml
# MUST READ - Critical context for implementation

- file: src/types/events.ts
  lines: 8-76
  why: Contains the complete WorkflowEvent discriminated union definition
  pattern: Discriminated union with type field as discriminant, multi-line formatting with pipe prefix
  gotcha: All imports must use .js extension (moduleResolution: bundler)

- file: src/types/events.ts
  lines: 14
  why: Current stepRetry event type definition to be updated
  pattern: Object literal in discriminated union with type field
  critical: Currently uses 'step' field, needs to be 'stepName'

- file: src/decorators/step.ts
  lines: 192-201
  why: Current stepRetry event emission implementation
  pattern: wf.emitEvent() call with event object literal
  gotcha: Must create RestartAnalysis object before emission

- file: src/__tests__/unit/decorators-retry.test.ts
  lines: 91-127
  why: Existing stepRetry event test that needs updating
  pattern: Event capture via observer, type narrowing with if statement
  critical: References 'step' field that needs to be 'stepName'

- file: src/__tests__/unit/decorators-retry.test.ts
  lines: 308-349
  why: Event ordering test that verifies stepStart → stepRetry → stepEnd sequence
  pattern: Event type extraction and index comparison
  gotcha: Must not break event ordering verification

- file: src/types/error.ts
  lines: 7-20
  why: WorkflowError interface definition used in stepRetry event
  pattern: Interface with JSDoc comments, mixed optional/required fields

- file: src/types/observer.ts
  lines: 9-18
  why: WorkflowObserver interface that receives events via onEvent callback
  pattern: Interface with callback methods
  critical: onEvent receives WorkflowEvent union type

- file: src/types/index.ts
  lines: 1-50
  why: Barrel export file where RestartAnalysis must be added
  pattern: Grouped exports with section comments, explicit type names
  gotcha: Must add new section for restart types

- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  lines: 174-241
  why: Contains RestartAnalysis interface specification
  critical: Defines exact structure for RestartAnalysis interface

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S3/research/codebase-analysis.md
  why: Comprehensive analysis of event system architecture and implementation details
  section: "Implementation Decision Points", "Recommended Implementation Approach"

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S3/research/test-patterns.md
  why: Detailed analysis of existing test patterns and required updates
  section: "Testing the Updated stepRetry Event", "Required Test Updates"

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S3/research/typescript-patterns.md
  why: TypeScript discriminated union best practices and patterns
  section: "Discriminated Union Best Practices", "Exhaustive Checking"

# EXTERNAL RESEARCH
- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
  why: Official TypeScript documentation on discriminated unions
  critical: Understanding type narrowing and exhaustiveness checking

- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  why: TypeScript handbook section on type narrowing
  critical: Using type guards and discriminants for type-safe event handling
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── events.ts           # Lines 8-76: WorkflowEvent discriminated union (stepRetry at line 14)
│   ├── error.ts            # Lines 7-20: WorkflowError interface
│   ├── observer.ts         # Lines 9-18: WorkflowObserver interface
│   ├── workflow.ts         # WorkflowNode interface
│   ├── decorators.ts       # StepOptions, ErrorCriterion types
│   └── index.ts            # Barrel exports (lines 1-50)
├── decorators/
│   └── step.ts             # Lines 192-201: stepRetry event emission
└── __tests__/
    └── unit/
        └── decorators-retry.test.ts  # Lines 91-127, 308-349: stepRetry event tests
```

### Desired Codebase Tree (After Implementation)

```bash
src/
├── types/
│   ├── restart.ts          # NEW: RestartAnalysis interface
│   ├── events.ts           # MODIFIED: Updated stepRetry event type
│   ├── error.ts            # UNCHANGED
│   ├── observer.ts         # UNCHANGED
│   ├── workflow.ts         # UNCHANGED
│   ├── decorators.ts       # UNCHANGED
│   └── index.ts            # MODIFIED: Add RestartAnalysis export
├── decorators/
│   └── step.ts             # MODIFIED: Updated event emission with analysis and timestamp
└── __tests__/
    └── unit/
        └── decorators-retry.test.ts  # MODIFIED: Updated tests for stepName, analysis, timestamp
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript moduleResolution: bundler requires .js extensions
// Even though source files are .ts, imports must use .js
import type { RestartAnalysis } from './restart.js';  // CORRECT
import type { RestartAnalysis } from './restart';     // WRONG - will cause error

// CRITICAL: All events except treeUpdated include node: WorkflowNode
// The specification omits 'node' but we must keep it for consistency
// DO NOT remove node: WorkflowNode from stepRetry event

// CRITICAL: Discriminated union formatting uses multi-line with pipe prefix
export type WorkflowEvent =
  | { type: 'stepStart'; /* ... */ }
  | { type: 'stepRetry'; /* ... */ }
  | { type: 'stepEnd'; /* ... */ };

// NOT THIS: Single line format is harder to read
export type WorkflowEvent = { type: 'stepStart' } | { type: 'stepRetry' } | { type: 'stepEnd' };

// CRITICAL: All existing step events use 'step' field name
// Changing to 'stepName' is a BREAKING CHANGE but required by spec
// Must update ALL references in codebase and tests

// CRITICAL: No existing events use timestamp field
// Adding timestamp to stepRetry is new pattern
// Use Date.now() for timestamp value at emission time

// CRITICAL: RestartAnalysis.suggestedAction is a union of literal types
// Must be exactly: 'retry' | 'abort' | 'rebuild'
// estimatedSuccessProbability must be in range [0, 1]

// CRITICAL: Barrel export pattern uses explicit type names
// Section comment should precede the exports
// Restart types
export type { RestartAnalysis } from './restart.js';

// NOT THIS: Wildcard exports lose tree-shaking benefits
export * from './restart.js';

// CRITICAL: Type narrowing requires checking event.type before accessing properties
if (event.type === 'stepRetry') {
  // TypeScript knows event has: node, stepName, retryCount, analysis, error, timestamp
  console.log(event.stepName);
  console.log(event.analysis.reason);
}

// CRITICAL: suggestedAction must match exact literal values
type SuggestedAction = 'retry' | 'abort' | 'rebuild';
// NOT: ' Retry' or 'RETRY' or 'retrying' (case and spelling matter)

// GOTCHA: RestartAnalysis.estimatedSuccessProbability is a number 0-1
// NOT a percentage (0-100)
// 0.7 means 70% probability, NOT 70%

// GOTCHA: Event emission happens in retry loop BEFORE delay
// Order: Error detection → Create analysis → Emit event → Delay → Retry
// Timestamp should reflect emission time, not retry time
```

---

## Implementation Blueprint

### Data Models and Structure

#### RestartAnalysis Interface (NEW)

```typescript
// src/types/restart.ts

/**
 * Restart analysis result
 * Provides error classification and restart recommendations
 */
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;

  /** Human-readable reason for the restart decision */
  reason: string;

  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';

  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}
```

#### Updated stepRetry Event Type

```typescript
// src/types/events.ts

import type { RestartAnalysis } from './restart.js';  // ADD THIS IMPORT

export type WorkflowEvent =
  // ... existing events
  | {
      type: 'stepRetry';
      node: WorkflowNode;                    // Keep for consistency
      stepName: string;                      // Changed from 'step'
      retryCount: number;
      analysis: RestartAnalysis;             // NEW
      error: WorkflowError;
      timestamp: number;                     // NEW
    }
  // ... existing events
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/types/restart.ts
  - IMPLEMENT: RestartAnalysis interface with 4 fields
  - FIELD shouldRestart: boolean
  - FIELD reason: string
  - FIELD suggestedAction: 'retry' | 'abort' | 'rebuild'
  - FIELD estimatedSuccessProbability: number (0-1)
  - FOLLOW pattern: src/types/error.ts (interface with JSDoc comments)
  - NAMING: PascalCase for interface, camelCase for fields
  - PLACEMENT: New file in src/types/
  - JSDOC: Summary comment for interface, /** */ for each field

Task 2: MODIFY src/types/events.ts
  - ADD: import type { RestartAnalysis } from './restart.js' at top of file
  - UPDATE: stepRetry event type definition (line 14)
  - CHANGE: step field → stepName
  - ADD: analysis: RestartAnalysis field
  - ADD: timestamp: number field
  - KEEP: node: WorkflowNode field (for consistency)
  - PRESERVE: All other event types unchanged
  - PLACEMENT: Update line 14 in discriminated union

Task 3: MODIFY src/types/index.ts
  - ADD: New section comment "// Restart types"
  - ADD: export type { RestartAnalysis } from './restart.js';
  - FIND pattern: Existing section grouping (lines 11-24)
  - PLACEMENT: After Observer types section, before Event types section
  - PRESERVE: All existing exports

Task 4: MODIFY src/decorators/step.ts
  - ADD: import type { RestartAnalysis } from '../types/restart.js' at top
  - FIND: stepRetry event emission (around line 195)
  - CREATE: RestartAnalysis object before event emission
  - UPDATE: event object with all required fields
  - CHANGE: step: stepName → stepName: stepName
  - ADD: analysis field with RestartAnalysis object
  - ADD: timestamp: Date.now()
  - KEEP: node: wf.node
  - PRESERVE: All existing retry logic

Task 5: MODIFY src/__tests__/unit/decorators-retry.test.ts
  - FIND: All references to event.step
  - REPLACE: event.step → event.stepName
  - FIND: stepRetry event tests (lines 91-127, 308-349)
  - ADD: Assertions for analysis field presence
  - ADD: Assertions for analysis field structure
  - ADD: Assertions for timestamp field validity
  - ADD: New test case for all required fields
  - PRESERVE: All existing test logic and assertions

Task 6: VERIFY no other files reference stepRetry event
  - SEARCH: codebase for '.step' references in event context
  - UPDATE: Any other files that access event.step property
  - VERIFY: Event replayer handles updated structure
  - VERIFY: Debugger tools handle updated structure
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN: Interface definition with JSDoc
// Source: src/types/error.ts:7-20
// ============================================

/**
 * Rich error object containing workflow context
 */
export interface WorkflowError {
  /** Error message */
  message: string;
  /** Original thrown error */
  original: unknown;
  /** ID of workflow where error occurred */
  workflowId: string;
  /** Stack trace if available */
  stack?: string;
  /** State snapshot at time of error */
  state: SerializedWorkflowState;
  /** Logs from the failing workflow node */
  logs: LogEntry[];
}

// APPLY TO RestartAnalysis:
/**
 * Restart analysis result
 * Provides error classification and restart recommendations
 */
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;
  /** Human-readable reason for the restart decision */
  reason: string;
  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}

// ============================================
// PATTERN: Discriminated union event definition
// Source: src/types/events.ts:8-76
// ============================================

export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  // ... other events

// ============================================
// PATTERN: Event emission with all fields
// Source: src/decorators/step.ts:192-201
// ============================================

// BEFORE:
wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  step: stepName,
  retryCount: nextRetryCount,
  error: workflowError,
});

// AFTER:
import type { RestartAnalysis } from '../types/restart.js';

// Create analysis object
const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: `Error matches retry criteria (attempt ${nextRetryCount}/${maxRetries})`,
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.7,
};

// Emit updated event
wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  stepName: stepName,          // Changed field name
  retryCount: nextRetryCount,
  analysis,                    // New field
  error: workflowError,
  timestamp: Date.now(),       // New field
});

// ============================================
// PATTERN: Type narrowing in tests
// Source: src/__tests__/unit/decorators-retry.test.ts:120-126
// ============================================

// BEFORE:
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].retryCount).toBe(1);
  expect(retryEvents[0].step).toBe('retryableStep');
}

// AFTER:
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].retryCount).toBe(1);
  expect(retryEvents[0].stepName).toBe('retryableStep');  // Updated
  expect(retryEvents[0].analysis).toBeDefined();          // New assertion
  expect(retryEvents[0].timestamp).toBeGreaterThan(0);    // New assertion
}

// ============================================
// PATTERN: Barrel export with section grouping
// Source: src/types/index.ts:11-24
// ============================================

// BEFORE:
// Observer types
export type { WorkflowObserver } from './observer.js';

// Event types
export type { WorkflowEvent } from './events.js';

// AFTER:
// Observer types
export type { WorkflowObserver } from './observer.js';

// Restart types
export type { RestartAnalysis } from './restart.js';

// Event types
export type { WorkflowEvent } from './events.js';
```

### Integration Points

```yaml
FILES_TO_CREATE:
  - src/types/restart.ts
    fields: shouldRestart, reason, suggestedAction, estimatedSuccessProbability
    export: RestartAnalysis interface

FILES_TO_MODIFY:
  - src/types/events.ts
    line: 14 (stepRetry event definition)
    add_import: import type { RestartAnalysis } from './restart.js';
    update_fields: step → stepName, add analysis, add timestamp

  - src/types/index.ts
    add_section: "// Restart types"
    add_export: export type { RestartAnalysis } from './restart.js';

  - src/decorators/step.ts
    line: ~195 (event emission)
    add_import: import type { RestartAnalysis } from '../types/restart.js';
    create_analysis: RestartAnalysis object before emission
    update_emission: Add analysis and timestamp fields, change step to stepName

  - src/__tests__/unit/decorators-retry.test.ts
    lines: 91-127, 308-349 (stepRetry tests)
    replace: event.step → event.stepName
    add_assertions: analysis field, timestamp field

NO_CHANGES_TO:
  - src/core/workflow.ts (observer pattern unchanged)
  - src/types/error.ts (WorkflowError unchanged)
  - src/types/observer.ts (WorkflowObserver unchanged)
  - Other test files (unless they reference stepRetry events)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation/modification - fix before proceeding
npx tsc --noEmit                         # Type check entire project
npx tsc --noEmit src/types/restart.ts   # Type check specific new file
npx tsc --noEmit src/types/events.ts    # Type check modified events file
npx tsc --noEmit src/decorators/step.ts # Type check modified decorator

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Common errors to watch for:
# - "Cannot find module './restart.ts'" - means you need .js extension
# - "Property 'step' does not exist on type..." - means you need to change to 'stepName'
# - "Property 'analysis' is missing" - means you forgot to add the field
# - "Cannot find name 'RestartAnalysis'" - means you need to import it

# Verify imports are correct
grep -n "import.*RestartAnalysis" src/types/events.ts
grep -n "import.*RestartAnalysis" src/decorators/step.ts

# Expected: Both files import RestartAnalysis from correct path with .js extension
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run stepRetry-specific tests
uv run vitest run src/__tests__/unit/decorators-retry.test.ts

# Expected: All tests pass. If failing, debug root cause and fix.

# Run with verbose output to see which tests fail
uv run vitest run --verbose src/__tests__/unit/decorators-retry.test.ts

# Run specific test by name
uv run vitest run -t "should emit stepRetry event"

# Run tests with coverage
uv run vitest run --coverage src/__tests__/unit/decorators-retry.test.ts

# Expected: Coverage shows RestartAnalysis and updated stepRetry event are tested

# Run full test suite for affected areas
uv run vitest run src/__tests__/unit/decorators.test.ts
uv run vitest run src/__tests__/unit/event-replayer.test.ts

# Expected: All tests pass, no regressions
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify TypeScript can resolve all imports
cat > /tmp/test-stepretry.ts << 'EOF'
import type { WorkflowEvent, RestartAnalysis } from './src/types/index.js';

// Test that stepRetry event can be created
const stepRetryEvent: Extract<WorkflowEvent, { type: 'stepRetry' }> = {
  type: 'stepRetry',
  node: {} as any,
  stepName: 'testStep',
  retryCount: 1,
  analysis: {
    shouldRestart: true,
    reason: 'Test error',
    suggestedAction: 'retry',
    estimatedSuccessProbability: 0.7
  },
  error: {} as any,
  timestamp: Date.now()
};

// Test type narrowing
if (stepRetryEvent.type === 'stepRetry') {
  console.log(`Retrying ${stepRetryEvent.stepName}`);
  console.log(`Analysis: ${stepRetryEvent.analysis.reason}`);
  console.log(`Timestamp: ${stepRetryEvent.timestamp}`);
}

console.log('TypeScript compilation successful');
EOF

npx tsc --noEmit /tmp/test-stepretry.ts

# Expected: No TypeScript errors, type narrowing works correctly

# Verify RestartAnalysis is properly exported
cat > /tmp/test-restart-analysis.ts << 'EOF'
import type { RestartAnalysis } from './src/types/index.js';

const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Transient error',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.8
};

console.log('RestartAnalysis type works:', analysis);
EOF

npx tsc --noEmit /tmp/test-restart-analysis.ts

# Expected: No TypeScript errors, RestartAnalysis is accessible

# Verify barrel exports
grep "RestartAnalysis" dist/types/index.d.ts  # After build)
grep "stepRetry" dist/types/events.d.ts       # After build)

# Expected: Both types are present in declaration files
```

### Level 4: Manual Inspection (Code Quality)

```bash
# Verify RestartAnalysis interface formatting
cat src/types/restart.ts

# Checklist:
# [ ] File has empty line at end
# [ ] JSDoc summary comment for interface
# [ ] JSDoc /** */ comment for each field
# [ ] No trailing whitespace
# [ ] Consistent indentation (2 spaces)
# [ ] Literal union type for suggestedAction

# Verify stepRetry event type definition
cat src/types/events.ts | grep -A 2 "stepRetry"

# Expected:
#   | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }

# Verify event emission in step decorator
cat src/decorators/step.ts | grep -A 10 "type: 'stepRetry'"

# Expected: All 6 fields present (type, node, stepName, retryCount, analysis, error, timestamp)

# Verify test updates
cat src/__tests__/unit/decorators-retry.test.ts | grep "stepName"

# Expected: References to stepName instead of step

# Verify barrel export placement
cat src/types/index.ts | grep -A 2 -B 2 "Restart types"

# Expected: Section comment present, export in logical position
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] RestartAnalysis interface defined in `src/types/restart.ts`
- [ ] RestartAnalysis exported from `src/types/index.ts`
- [ ] stepRetry event type updated in `src/types/events.ts`
- [ ] stepRetry uses `stepName` instead of `step`
- [ ] stepRetry includes `analysis: RestartAnalysis` field
- [ ] stepRetry includes `timestamp: number` field
- [ ] stepRetry retains `node: WorkflowNode` field
- [ ] Event emission updated in `src/decorators/step.ts`
- [ ] All tests pass: `uv run vitest run`

### Feature Validation

- [ ] RestartAnalysis has all 4 required fields (shouldRestart, reason, suggestedAction, estimatedSuccessProbability)
- [ ] RestartAnalysis.suggestedAction is union of literal types ('retry' | 'abort' | 'rebuild')
- [ ] RestartAnalysis.estimatedSuccessProbability is typed as number
- [ ] stepRetry event has all 6 required fields (type, node, stepName, retryCount, analysis, error, timestamp)
- [ ] Event emission creates valid RestartAnalysis object
- [ ] Event emission sets timestamp to Date.now()
- [ ] All tests updated to use `stepName` instead of `step`
- [ ] Tests verify `analysis` field presence and structure
- [ ] Tests verify `timestamp` field is valid (positive number, recent)

### Code Quality Validation

- [ ] Follows existing codebase patterns (interface definition, JSDoc style)
- [ ] File placement matches desired codebase tree
- [ ] Import/export uses `.js` extensions
- [ ] Barrel export has section comment
- [ ] Multi-line union format with `|` prefix preserved
- [ ] Discriminated union pattern preserved
- [ ] Type narrowing works correctly in tests
- [ ] No wildcard exports (explicit type names)

### Documentation & Integration

- [ ] RestartAnalysis has JSDoc comment explaining purpose
- [ ] RestartAnalysis fields have JSDoc comments
- [ ] stepRetry event follows existing event patterns
- [ ] Observer pattern still works (onEvent receives updated events)
- [ ] Event ordering tests still pass (stepStart → stepRetry → stepEnd)
- [ ] No regressions in other event types
- [ ] Code is self-documenting with clear field names

---

## Anti-Patterns to Avoid

- ❌ **Don't remove `node: WorkflowNode`** - Keep for consistency with all other events (except treeUpdated)
- ❌ **Don't use `step` field** - Specification requires `stepName`, update all references
- ❌ **Don't skip `analysis` field** - Must include RestartAnalysis object
- ❌ **Don't skip `timestamp` field** - Must include timestamp number
- ❌ **Don't use `.ts` in imports** - Must use `.js` extensions (moduleResolution: bundler)
- ❌ **Don't use wildcard exports** - Export explicit type names for tree-shaking
- ❌ **Don't make suggestedAction a string** - Must be literal union: 'retry' | 'abort' | 'rebuild'
- ❌ **Don't use percentage for probability** - Must be 0-1 range, not 0-100
- ❌ **Don't forget to update tests** - All `event.step` references must become `event.stepName`
- ❌ **Don't break event ordering** - Preserve stepStart → stepRetry → stepEnd sequence
- ❌ **Don't modify other event types** - Only update stepRetry, leave all others unchanged
- ❌ **Don't change observer interface** - WorkflowObserver.onEvent signature stays the same
- ❌ **Don't forget JSDoc comments** - Every interface and field needs documentation
- ❌ **Don't use single-line union format** - Multi-line with `|` prefix is preferred
- ❌ **Don't make RestartAnalysis fields optional** - All 4 fields are required

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**:
- This PRP provides exact file paths, line numbers, and code examples
- All research findings are documented and accessible
- No ambiguity in type definitions - exact structure specified
- Existing codebase patterns are thoroughly analyzed
- Common gotchas are explicitly documented
- Test patterns are provided with specific examples

**Risk Factors**: None identified
- This is a type definition update with clear specification
- No external dependencies required
- No complex integration logic (event structure update only)
- All breaking changes are documented and addressable

**Prerequisites**:
- None - All dependencies are existing types (WorkflowError, WorkflowNode)

**Dependencies**:
- None - This task is self-contained within the type system

**Dependent Tasks**:
- Future tasks that consume stepRetry events will benefit from the enhanced structure
- Restart system implementation (P1.M1.T2) will use RestartAnalysis type

---

## Appendix: Code Examples

### Complete RestartAnalysis Interface

```typescript
// File: src/types/restart.ts (NEW)

/**
 * Restart analysis result
 * Provides error classification and restart recommendations for step retry logic
 */
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;

  /** Human-readable reason for the restart decision */
  reason: string;

  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';

  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}
```

### Complete Updated stepRetry Event Type

```typescript
// File: src/types/events.ts (MODIFIED - line 14)

import type { RestartAnalysis } from './restart.js';  // ADD THIS IMPORT

export type WorkflowEvent =
  // ... existing events
  | {
      type: 'stepRetry';
      node: WorkflowNode;
      stepName: string;                      // Changed from 'step'
      retryCount: number;
      analysis: RestartAnalysis;             // NEW
      error: WorkflowError;
      timestamp: number;                     // NEW
    }
  // ... existing events
```

### Complete Updated Event Emission

```typescript
// File: src/decorators/step.ts (MODIFIED - around line 195)

import type { RestartAnalysis } from '../types/restart.js';  // ADD THIS IMPORT

// In retry loop, after error detection:
const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: `Error matches retry criteria (attempt ${nextRetryCount}/${maxRetries})`,
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.7,
};

wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  stepName: stepName,          // Changed field name
  retryCount: nextRetryCount,
  analysis,                    // New field
  error: workflowError,
  timestamp: Date.now(),       // New field
});
```

### Complete Updated Test Example

```typescript
// File: src/__tests__/unit/decorators-retry.test.ts (MODIFIED)

it('should emit stepRetry event on each retry', async () => {
  const events: WorkflowEvent[] = [];

  class RetryWorkflow extends Workflow {
    @Step({ restartable: true, maxRetries: 3 })
    async retryableStep() {
      // ... retry logic
    }

    async run() {
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
  expect(retryEvents.length).toBe(1);

  if (retryEvents[0]?.type === 'stepRetry') {
    expect(retryEvents[0].retryCount).toBe(1);
    expect(retryEvents[0].stepName).toBe('retryableStep');  // Updated
    expect(retryEvents[0].analysis).toBeDefined();         // New
    expect(retryEvents[0].analysis).toMatchObject({       // New
      shouldRestart: expect.any(Boolean),
      reason: expect.any(String),
      suggestedAction: expect.stringMatching(/^(retry|abort|rebuild)$/),
      estimatedSuccessProbability: expect.any(Number)
    });
    expect(retryEvents[0].timestamp).toBeGreaterThan(0);  // New
  }
});
```

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Research Complete**: Yes
**Confidence Score**: 10/10
