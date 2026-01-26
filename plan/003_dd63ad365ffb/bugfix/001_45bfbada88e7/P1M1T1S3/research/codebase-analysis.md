# Codebase Analysis: Event Type System for P1.M1.T1.S3

## Executive Summary

**Work Item**: P1.M1.T1.S3 - Create stepRetry event type in events schema

**Status**: The `stepRetry` event type **already exists** in the codebase but needs to be **updated** to match the full specification from the work item description. The current implementation is missing the `analysis: RestartAnalysis` and `timestamp: number` fields.

**Current State**: `src/types/events.ts:14`
```typescript
| { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
```

**Required State** (per work item):
```typescript
| { type: 'stepRetry'; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
```

**Critical Differences**:
1. Field name: `step` → `stepName`
2. Missing field: `node: WorkflowNode` (required by current implementation, not in spec)
3. Missing field: `analysis: RestartAnalysis` (required by spec, not implemented)
4. Missing field: `timestamp: number` (required by spec, not implemented)

---

## 1. Current Event System Architecture

### 1.1 WorkflowEvent Discriminated Union

**File**: `src/types/events.ts` (lines 8-76)

The event system uses a **discriminated union pattern** where all event types share a `type` field that acts as the discriminant.

```typescript
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }  // EXISTS
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  // ... 11 more event types
```

**Event Categories**:
1. **Core Workflow Events** (10 types): childAttached, childDetached, stateSnapshot, stepStart, stepRetry, stepEnd, error, taskStart, taskEnd, treeUpdated
2. **Agent/Prompt Events** (2 types): agentPromptStart, agentPromptEnd
3. **Tool Events** (1 type): toolInvocation
4. **MCP Events** (1 type): mcpEvent
5. **Reflection Events** (2 types): reflectionStart, reflectionEnd
6. **Cache Events** (2 types): cacheHit, cacheMiss

### 1.2 Observer Pattern Integration

**File**: `src/types/observer.ts` (lines 9-18)

Observers receive events via the `onEvent` callback:

```typescript
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;        // ← Receives all WorkflowEvent types
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

**Event Flow**:
1. Event emitted via `workflow.emitEvent(event: WorkflowEvent)`
2. Event added to workflow node's events array
3. All root observers retrieved via `getRootObservers()`
4. Each observer's `onEvent()` method called
5. Event stored for debugging/replay

### 1.3 Event Emission in Step Decorator

**File**: `src/decorators/step.ts` (lines 192-201)

The stepRetry event is currently emitted in the retry loop:

```typescript
// Emit step retry event
wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,           // ← Uses workflow node (NOT in spec)
  step: stepName,          // ← Field name is 'step' (spec says 'stepName')
  retryCount: nextRetryCount,
  error: workflowError,
  // Missing: analysis: RestartAnalysis
  // Missing: timestamp: number
});
```

---

## 2. Related Type Definitions

### 2.1 WorkflowError Interface

**File**: `src/types/error.ts` (lines 7-20)

```typescript
export interface WorkflowError {
  message: string;           // Error message
  original: unknown;        // Original thrown error
  workflowId: string;       // ID of workflow where error occurred
  stack?: string;          // Stack trace if available
  state: SerializedWorkflowState;  // State snapshot at time of error
  logs: LogEntry[];        // Logs from the failing workflow node
}
```

### 2.2 WorkflowNode Interface

**File**: `src/types/workflow.ts`

```typescript
interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: 'running' | 'completed' | 'failed';
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: SerializedWorkflowState | null;
}
```

### 2.3 RestartAnalysis Interface (NOT YET DEFINED)

**Required Definition** (from architecture document):

```typescript
export interface RestartAnalysis {
  shouldRestart: boolean;
  reason: string;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  estimatedSuccessProbability: number; // 0-1
}
```

**Status**: This type does **NOT exist** in the codebase yet. It needs to be created as part of this implementation or as a separate task.

**Location Options**:
1. `src/types/restart.ts` (NEW file - recommended)
2. `src/types/events.ts` (add alongside WorkflowEvent)

---

## 3. Current stepRetry Event Usage

### 3.1 Emission Points

**File**: `src/decorators/step.ts` (line 195)

```typescript
wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  step: stepName,
  retryCount: nextRetryCount,
  error: workflowError,
});
```

**Context**: Emitted in the retry loop after error detection and before delay.

### 3.2 Testing Patterns

**File**: `src/__tests__/unit/decorators-retry.test.ts` (lines 91-127)

```typescript
it('should emit stepRetry event on each retry', async () => {
  const events: WorkflowEvent[] = [];

  class RetryWorkflow extends Workflow {
    @Step({ restartable: true, maxRetries: 3 })
    async retryableStep(): Promise<void> {
      // ... retry logic
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),  // ← Capture events
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
    expect(retryEvents[0].step).toBe('retryableStep');  // ← Tests 'step' field
  }
});
```

### 3.3 Event Ordering Tests

**File**: `src/__tests__/unit/decorators-retry.test.ts` (lines 308-349)

Tests verify the correct sequence of events:
```
stepStart → stepRetry → stepEnd
```

---

## 4. Event System Patterns

### 4.1 Discriminated Union Type Narrowing

**Pattern**: Use `event.type` for type-safe property access

```typescript
function handleEvent(event: WorkflowEvent) {
  switch (event.type) {
    case 'stepRetry':
      // TypeScript knows event has: node, step, retryCount, error
      console.log(`Retrying ${event.step}, attempt ${event.retryCount}`);
      break;
    // ... other cases
  }
}
```

### 4.2 Event Property Conventions

**Analysis of Existing Events**:

| Event Type | Field Name Pattern | Includes node? | Includes timestamp? |
|------------|-------------------|----------------|-------------------|
| stepStart | `step: string` | ✅ Yes | ❌ No |
| stepRetry | `step: string` | ✅ Yes | ❌ No |
| stepEnd | `step: string` | ✅ Yes | ❌ No |
| error | `error: WorkflowError` | ✅ Yes | ❌ No |
| agentPromptStart | `promptId: string` | ✅ Yes | ❌ No |
| agentPromptEnd | `duration: number` | ✅ Yes | ❌ No |
| toolInvocation | `toolName: string`, `duration: number` | ✅ Yes | ❌ No |

**Observations**:
1. **All events include `node: WorkflowNode`** (except `treeUpdated` uses `root`)
2. **No events include `timestamp` field** - timing is tracked via `duration` in end events
3. **Step events use `step: string`** (not `stepName`)

**Conflict with Specification**:
- Work item specifies `stepName` but all existing step events use `step`
- Work item specifies `timestamp` but no existing events use timestamps
- Work item specifies NO `node` field but all existing events include it

### 4.3 Type Import Pattern

**All imports use `.js` extension** (TypeScript `moduleResolution: bundler`):

```typescript
import type { WorkflowEvent } from './events.js';
import type { WorkflowError } from './error.js';
import type { WorkflowNode } from './workflow.js';
```

---

## 5. Integration Points

### 5.1 Files That Reference stepRetry Event

**Direct Usage**:
- `src/types/events.ts:14` - Event type definition
- `src/decorators/step.ts:195` - Event emission
- `src/__tests__/unit/decorators-retry.test.ts:120` - Test filtering

**Indirect Usage** (via WorkflowEvent union):
- `src/core/workflow.ts:413-429` - Event emission logic
- `src/types/observer.ts:13` - Observer interface
- `src/debugger/event-replayer.ts` - Event replay system
- All test files that capture events

### 5.2 Barrel Export System

**File**: `src/types/index.ts`

```typescript
export type { WorkflowEvent } from './events.js';
export type { WorkflowError } from './error.js';
export type { WorkflowObserver } from './observer.js';
// ... other exports
```

If `RestartAnalysis` is created in a new file, it must be added to this barrel export.

---

## 6. TypeScript Compilation Verification

### 6.1 Type Checking Commands

```bash
# Check entire project
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/types/events.ts

# Check test file
npx tsc --noEmit src/__tests__/unit/decorators-retry.test.ts
```

### 6.2 Expected Compilation Behavior

**After changing `step` → `stepName`**:
- ✅ Type error in `src/decorators/step.ts:198` (`step` property doesn't exist)
- ✅ Type error in `src/__tests__/unit/decorators-retry.test.ts:125` (test references `event.step`)
- **Fix Required**: Update all references to use `stepName`

**After adding `analysis: RestartAnalysis`**:
- ✅ Type error if `RestartAnalysis` is not defined/imported
- **Fix Required**: Define `RestartAnalysis` interface and import it

**After adding `timestamp: number`**:
- ✅ Type error in `src/decorators/step.ts:195` (missing `timestamp` field)
- **Fix Required**: Add `timestamp: Date.now()` to event emission

---

## 7. Implementation Decision Points

### Decision 1: Field Name - `step` vs `stepName`

**Current**: All step events use `step: string`
**Specification**: Requires `stepName: string`

**Options**:
1. **Follow spec** - Change to `stepName`, update all references
2. **Keep current** - Use `step`, note deviation from spec
3. **Support both** - Add `stepName` as alias (anti-pattern)

**Recommendation**: Follow specification (`stepName`) for consistency with work item requirements. Update all references.

### Decision 2: Include `node: WorkflowNode`?

**Current**: stepRetry includes `node: WorkflowNode`
**Specification**: Does NOT mention `node` field

**Options**:
1. **Include it** - Maintains consistency with all other events (except treeUpdated)
2. **Exclude it** - Follows specification strictly
3. **Make it optional** - `node?: WorkflowNode`

**Recommendation**: **Include `node: WorkflowNode`** for consistency with existing event patterns. The specification may have omitted it inadvertently, and removing it would break the observer pattern's ability to track event hierarchy.

### Decision 3: RestartAnalysis Type Location

**Options**:
1. **New file**: `src/types/restart.ts`
2. **Existing file**: `src/types/events.ts` (add below WorkflowEvent)
3. **Existing file**: `src/types/decorators.ts` (alongside ErrorCriterion)

**Recommendation**: **New file `src/types/restart.ts`** - This is a foundational type for the restart system that will be used by multiple modules (events, decorators, utilities). Creating a dedicated file follows the Single Responsibility Principle and matches the pattern of other domain-specific type files.

### Decision 4: Include `timestamp: number`?

**Current**: No events include timestamps
**Specification**: Requires `timestamp: number`

**Options**:
1. **Add it** - Follows spec, provides precise timing
2. **Omit it** - Consistent with existing events
3. **Add to all events** - Comprehensive timing system (out of scope)

**Recommendation**: **Add `timestamp: number`** to stepRetry event. While other events don't include timestamps, retry events benefit from precise timing for debugging and metrics. The `timestamp` should be set to `Date.now()` at event emission time.

---

## 8. Recommended Implementation Approach

### 8.1 Step 1: Create RestartAnalysis Type

**File**: `src/types/restart.ts` (NEW)

```typescript
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

### 8.2 Step 2: Update WorkflowEvent Type

**File**: `src/types/events.ts`

```typescript
import type { RestartAnalysis } from './restart.js';  // ← Add import

export type WorkflowEvent =
  // ... existing events
  | {
      type: 'stepRetry';
      node: WorkflowNode;                    // ← Keep for consistency
      stepName: string;                      // ← Changed from 'step'
      retryCount: number;
      analysis: RestartAnalysis;             // ← NEW
      error: WorkflowError;
      timestamp: number;                     // ← NEW
    }
  // ... existing events
```

### 8.3 Step 3: Update Event Emission

**File**: `src/decorators/step.ts`

```typescript
import type { RestartAnalysis } from '../types/restart.js';  // ← Add import

// In retry loop (around line 195):
const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Error matches retry criteria',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.7,
};

wf.emitEvent({
  type: 'stepRetry',
  node: wf.node,
  stepName: stepName,          // ← Changed from 'step'
  retryCount: nextRetryCount,
  analysis,                    // ← NEW
  error: workflowError,
  timestamp: Date.now(),       // ← NEW
});
```

### 8.4 Step 4: Update Tests

**File**: `src/__tests__/unit/decorators-retry.test.ts`

```typescript
// Update all references from 'step' to 'stepName'
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].retryCount).toBe(1);
  expect(retryEvents[0].stepName).toBe('retryableStep');  // ← Changed
  expect(retryEvents[0].analysis).toBeDefined();          // ← NEW
  expect(retryEvents[0].timestamp).toBeGreaterThan(0);    // ← NEW
}
```

### 8.5 Step 5: Update Barrel Exports

**File**: `src/types/index.ts`

```typescript
// Add restart types section
// Restart types
export type { RestartAnalysis } from './restart.js';
```

---

## 9. Risk Assessment

### 9.1 Breaking Changes

**Field name change (`step` → `stepName`)**:
- **Risk**: HIGH - Breaks existing code that references `event.step`
- **Mitigation**: Update all references in codebase
- **Impact**: `src/decorators/step.ts`, test files

**Adding required fields** (`analysis`, `timestamp`)**:
- **Risk**: MEDIUM - Breaks existing event emission
- **Mitigation**: Update event emission to include new fields
- **Impact**: `src/decorators/step.ts`

**Removing `node` field** (if chosen)**:
- **Risk**: HIGH - Breaks observer pattern and event tracking
- **Mitigation**: Keep `node` field despite spec
- **Impact**: Event system consistency

### 9.2 Backward Compatibility

**Recommendation**: Since this is a bugfix task for a work item that specifies an exact contract, **breaking changes are acceptable**. The work item defines the expected interface, and existing code should be updated to match.

**Migration Path**:
1. Update type definition first (causes compilation errors)
2. Fix all compilation errors by updating references
3. Run tests to verify behavior
4. Commit as atomic change

---

## 10. Validation Checklist

### 10.1 Type System Validation

- [ ] `RestartAnalysis` interface defined in `src/types/restart.ts`
- [ ] `RestartAnalysis` exported from `src/types/index.ts`
- [ ] `stepRetry` event updated in `src/types/events.ts`
- [ ] `stepRetry` imports `RestartAnalysis` from `restart.js`
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`

### 10.2 Implementation Validation

- [ ] Event emission includes all required fields (stepName, retryCount, analysis, error, timestamp)
- [ ] Event emission includes `node: WorkflowNode` for consistency
- [ ] `analysis` field populated with valid `RestartAnalysis` object
- [ ] `timestamp` field set to `Date.now()` at emission time

### 10.3 Test Validation

- [ ] All tests updated to reference `stepName` instead of `step`
- [ ] Tests verify `analysis` field is present and valid
- [ ] Tests verify `timestamp` field is present and positive
- [ ] All existing tests pass: `uv run vitest run src/__tests__/unit/decorators-retry.test.ts`

### 10.4 Integration Validation

- [ ] Observer pattern still works (events received via `onEvent`)
- [ ] Event replayer handles updated stepRetry events
- [ ] No regressions in other step events (stepStart, stepEnd)
- [ ] Full test suite passes: `uv run vitest run`

---

## 11. Files Requiring Modification

### Must Modify

1. **`src/types/restart.ts`** (CREATE)
   - Define `RestartAnalysis` interface

2. **`src/types/events.ts`** (MODIFY)
   - Import `RestartAnalysis`
   - Update `stepRetry` event type definition
   - Change `step` → `stepName`
   - Add `analysis: RestartAnalysis`
   - Add `timestamp: number`
   - Keep `node: WorkflowNode`

3. **`src/types/index.ts`** (MODIFY)
   - Add export for `RestartAnalysis`

4. **`src/decorators/step.ts`** (MODIFY)
   - Import `RestartAnalysis`
   - Update event emission with all fields
   - Create `RestartAnalysis` object for emission
   - Add `timestamp: Date.now()`
   - Change `step` → `stepName`

5. **`src/__tests__/unit/decorators-retry.test.ts`** (MODIFY)
   - Update all `event.step` references to `event.stepName`
   - Add assertions for `analysis` field
   - Add assertions for `timestamp` field

### May Need to Update

6. **`src/debugger/event-replayer.ts`** (CHECK)
   - Verify replay logic handles updated stepRetry events
   - May need updates if it accesses `step` property directly

7. **Other test files** (SEARCH)
   - Search for references to `stepRetry` events
   - Update any that access the `step` property

---

## 12. References

### Code References

- `src/types/events.ts:8-76` - Complete WorkflowEvent definition
- `src/types/error.ts:7-20` - WorkflowError interface
- `src/types/observer.ts:9-18` - WorkflowObserver interface
- `src/decorators/step.ts:192-201` - stepRetry event emission
- `src/__tests__/unit/decorators-retry.test.ts:91-127` - stepRetry event tests
- `src/__tests__/unit/decorators-retry.test.ts:308-349` - Event ordering tests

### Architecture References

- `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md` - RestartAnalysis specification
- `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S2/PRP.md` - Event structure requirements from P1.M1.T1.S2

### External Research

- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
- TypeScript Type Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

---

## 13. Glossary

- **Discriminated Union**: TypeScript pattern where a union type has a common property (the discriminant) that TypeScript uses to narrow the type in conditional blocks
- **Event Discriminant**: The `type` field in WorkflowEvent that distinguishes between different event variants
- **Type Narrowing**: Process of TypeScript refining the type of a variable based on control flow analysis
- **Observer Pattern**: Behavioral design pattern where observers subscribe to receive notifications from a subject
- **Barrel Export**: Module that aggregates and re-exports exports from other modules (e.g., `src/types/index.ts`)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Author**: PRP Research Agent
**Status**: Ready for PRP Generation
