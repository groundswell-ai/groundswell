name: "Replace observer error console.error with logger.error"
description: |

---

## Goal

**Feature Goal**: Replace all observer-related `console.error()` calls with `logger.error()` to enable structured error logging for observer callback failures.

**Deliverable**: Updated `src/core/logger.ts`, `src/core/workflow.ts`, and `src/utils/observable.ts` with observer errors logged through WorkflowLogger instead of console.

**Success Definition**:
- All 6 observer-related console.error calls replaced with logger.error()
- 2 validation error console.error calls preserved (lines 277, 286 in workflow.ts)
- Observable class supports optional logger injection with fallback to console.error
- WorkflowLogger recursive case handled without infinite recursion
- All existing tests pass
- New tests verify observer error logging behavior

## Why

- **Structured Logging**: Observer errors currently go to console, which cannot be captured by log aggregation systems or WorkflowLogger observers
- **Error Context**: logger.error() accepts structured data parameter for better error tracking (error type, observer callback, event type)
- **Consistency**: Observer errors should follow same logging pattern as other workflow errors
- **Production Readiness**: console.error bypasses the entire logging infrastructure built into the workflow system

## What

Replace 6 observer-related console.error calls with logger.error() calls:

| File | Line | Method | Observer Type | Replacement |
|------|------|--------|---------------|-------------|
| src/core/logger.ts | 27 | emit() | WorkflowObserver.onLog | Use internal log path |
| src/core/workflow.ts | 376 | emitEvent() | WorkflowObserver.onEvent | `this.logger.error()` |
| src/core/workflow.ts | 394 | snapshotState() | WorkflowObserver.onStateUpdated | `this.logger.error()` |
| src/utils/observable.ts | 39 | next() | Observer.next | Logger injection |
| src/utils/observable.ts | 52 | error() | Observer.error | Logger injection |
| src/utils/observable.ts | 65 | complete() | Observer.complete | Logger injection |

**Preserve** 2 validation error console.error calls:
- src/core/workflow.ts:277 - Child already has parent validation
- src/core/workflow.ts:286 - Circular reference detection

### Success Criteria

- [ ] No observer-related console.error calls remain in production code
- [ ] Observer errors include structured context (error, observer type, event/node info)
- [ ] Observable class works with and without logger injection
- [ ] WorkflowLogger handles observer onLog errors without infinite recursion
- [ ] All existing tests pass
- [ ] New tests verify observer error logging

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP includes:
- Exact file paths and line numbers for all 6 console.error calls to replace
- Complete code snippets showing surrounding context
- Specific replacement patterns for each location
- Observable logger injection pattern with full implementation
- WorkflowLogger recursive case solution
- Test patterns and validation commands
- External best practices references

### Documentation & References

```yaml
# MUST READ - S1 Research Output (console.error locations and categorization)
- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T1S1/research/console_error_inventory.md
  why: Complete inventory of all 8 console.error calls with categorization, line numbers, and replacement patterns
  critical: Contains the exact 6 calls to replace and 2 calls to preserve

# WorkflowLogger Implementation
- file: src/core/logger.ts
  why: Core logger class with error() method signature: `error(message: string, data?: unknown): void`
  pattern: Log entry creation via private log() method, emit() notifies observers
  gotcha: emit() calls observer.onLog() - replacing console.error:27 requires avoiding infinite recursion

# Workflow Class Logger Usage
- file: src/core/workflow.ts
  why: Has `this.logger` property (protected readonly) initialized in constructor at line 111
  pattern: `this.logger.error('message', { error })` with structured data
  gotcha: Lines 277, 286 are validation errors - preserve these console.error calls

# Observable Class (Needs Logger Injection)
- file: src/utils/observable.ts
  why: Standalone utility class with no WorkflowLogger access
  pattern: Constructor injection pattern with optional fallback
  gotcha: Must maintain backward compatibility - work without logger

# Observer Type Definitions
- file: src/types/observer.ts
  why: WorkflowObserver interface with onLog, onEvent, onStateUpdated, onTreeChanged methods
  pattern: All methods are void, throw from observers crashes notification loop

# LogEntry Type Definition
- file: src/types/logging.ts
  why: LogEntry structure: id, workflowId, timestamp, level, message, data?, parentLogId?
  pattern: data parameter accepts any unknown value for structured logging

# Test Pattern Reference
- file: src/__tests__/unit/logger.test.ts
  why: Shows how to test logger behavior, access logs via workflow.node.logs
  pattern: Class-based workflow extending Workflow, verify logs array content
  gotcha: Use vi.spyOn(console, 'error').mockImplementation() to suppress output

# Observable Usage Example
- file: src/debugger/tree-debugger.ts
  why: Shows Observable class usage pattern in production code
  pattern: `this.events = new Observable<WorkflowEvent>()` - no logger injected currently
  gotcha: Will need to update constructor calls to inject logger after implementing injection

# External Research
- url: /home/dustin/projects/groundswell/research/error-logging-best-practices.md
  why: Observer pattern error handling best practices, logger context propagation patterns
  critical: AsyncLocalStorage pattern for automatic context propagation (consider for future)
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── logger.ts           # WorkflowLogger class - REPLACE line 27
│   └── workflow.ts         # Workflow class - REPLACE lines 376, 394
├── utils/
│   └── observable.ts       # Observable class - REPLACE lines 39, 52, 65
├── types/
│   ├── observer.ts         # WorkflowObserver interface
│   └── logging.ts          # LogEntry, LogLevel types
├── debugger/
│   └── tree-debugger.ts    # Uses Observable (will need logger update)
└── __tests__/
    ├── unit/
    │   └── logger.test.ts  # Logger test patterns
    └── integration/        # Integration test patterns
```

### Desired Codebase Tree (New Files)

```bash
src/
├── core/
│   ├── logger.ts           # MODIFIED: Internal error logging for observer onLog errors
│   └── workflow.ts         # MODIFIED: Use this.logger.error() for observer errors
├── utils/
│   └── observable.ts       # MODIFIED: Add logger injection pattern
└── __tests__/
    ├── unit/
    │   ├── logger.test.ts  # MODIFIED: Add observer error logging tests
    │   └── observable.test.ts  # NEW: Test Observable error logging
    └── integration/
        └── observer-logging.test.ts  # NEW: Integration tests for observer error logging
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: WorkflowLogger.emit() recursive case
// The emit() method calls observer.onLog() entry
// If we call this.log() from within emit() catch block, it creates infinite loop:
//   emit() -> log() -> emit() -> observer.onLog() throws -> catch -> log() -> emit() -> ...
// SOLUTION: Use private emitWithoutObserverNotification() or direct node.logs.push()

// CRITICAL: Observable class backward compatibility
// Observable is used in multiple places (tree-debugger.ts, others)
// Constructor must accept optional logger: constructor(logger?: ObservableLogger)
// If no logger provided, fall back to console.error for backward compatibility

// CRITICAL: Validation error console.error calls must be preserved
// Lines 277 and 286 in workflow.ts are NOT observer errors
// These provide immediate visibility before throw for structural invariants

// PATTERN: logger.error() signature
// error(message: string, data?: unknown): void
// Always pass error in data object: { error: err, eventType: event.type }

// GOTCHA: Workflow.getRootObservers() returns array
// Used in emitEvent() and snapshotState() - get observers before loop

// GOTCHA: Observer errors must never crash workflow
// All observer callbacks already wrapped in try-catch - preserve this pattern
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// New type for Observable logger injection (add to src/utils/observable.ts)
export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}

// Existing type (already defined in src/types/logging.ts)
export interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/utils/observable.ts - Add Logger Injection Pattern
  - ADD: ObservableLogger interface definition
  - ADD: private logger?: ObservableLogger property
  - MODIFY: constructor to accept optional logger parameter
  - ADD: private logError(message: string, error: unknown) method
  - MODIFY: next() - replace console.error:39 with this.logError()
  - MODIFY: error() - replace console.error:52 with this.logError()
  - MODIFY: complete() - replace console.error:65 with this.logError()
  - PATTERN: If logger provided, use logger.error(); else console.error()
  - BACKWARD_COMPAT: Constructor with no parameters must work

Task 2: MODIFY src/core/logger.ts - Handle Recursive Observer Error
  - ADD: private emitWithoutObserverNotification(entry: LogEntry) method
  - IMPLEMENTATION: Direct this.node.logs.push(entry), bypass emit()
  - MODIFY: emit() catch block - replace console.error:27
  - PATTERN: this.emitWithoutObserverNotification(errorEntry) to avoid recursion
  - ENTRY_STRUCTURE: { id, workflowId, timestamp, level: 'error', message, data: { error } }

Task 3: MODIFY src/core/workflow.ts - Replace Observer Error Logging
  - MODIFY: emitEvent() at line 376
  - REPLACE: console.error('Observer onEvent error:', err)
  - WITH: this.logger.error('Observer onEvent error', { error: err, eventType: event.type })
  - MODIFY: snapshotState() at line 394
  - REPLACE: console.error('Observer onStateUpdated error:', err)
  - WITH: this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id })
  - PRESERVE: Lines 277, 286 validation error console.error calls
  - GOTCHA: Get observers before loop: const observers = this.getRootObservers()

Task 4: MODIFY src/debugger/tree-debugger.ts - Update Observable Constructor
  - MODIFY: line 41 - new Observable<WorkflowEvent>()
  - WITH: new Observable<WorkflowEvent>(undefined) or pass logger if available
  - NOTE: WorkflowTreeDebugger is observer, doesn't have logger access
  - DECISION: Pass undefined to use console.error fallback (acceptable for debugger)

Task 5: CREATE src/__tests__/unit/observable.test.ts
  - IMPLEMENT: Test Observable error logging with logger injection
  - IMPLEMENT: Test Observable error logging without logger (fallback)
  - IMPLEMENT: Test subscriber next() error handling
  - IMPLEMENT: Test subscriber error() error handling
  - IMPLEMENT: Test subscriber complete() error handling
  - PATTERN: Mock logger, verify logger.error called with correct parameters
  - PATTERN: Use vi.fn() for logger mock, expect(logger.error).toHaveBeenCalledWith()

Task 6: CREATE src/__tests__/integration/observer-logging.test.ts
  - IMPLEMENT: Test WorkflowLogger observer onLog error logging
  - IMPLEMENT: Test Workflow observer onEvent error logging
  - IMPLEMENT: Test Workflow observer onStateUpdated error logging
  - IMPLEMENT: Test validation errors still use console.error (lines 277, 286)
  - PATTERN: Create throwing observer, verify error logged to workflow.node.logs
  - PATTERN: Use vi.spyOn(console, 'error') to verify validation errors
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Observable Logger Injection (src/utils/observable.ts)

export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}

export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();
  private logger?: ObservableLogger;

  constructor(logger?: ObservableLogger) {
    this.logger = logger;
  }

  private logError(message: string, error: unknown): void {
    if (this.logger) {
      this.logger.error(message, { error });
    } else {
      // Fallback for backward compatibility
      console.error(message, error);
    }
  }

  next(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.next?.(value);
      } catch (err) {
        this.logError('Observable subscriber error', err);
      }
    }
  }

  // Same pattern for error() and complete()
}

// Pattern 2: WorkflowLogger Recursive Error Handling (src/core/logger.ts)

export class WorkflowLogger {
  // ... existing code ...

  private emitWithoutObserverNotification(entry: LogEntry): void {
    // Direct push to avoid infinite recursion
    this.node.logs.push(entry);
  }

  private emit(entry: LogEntry): void {
    this.node.logs.push(entry);
    for (const obs of this.observers) {
      try {
        obs.onLog(entry);
      } catch (err) {
        // Create error entry and emit without observer notification
        const errorEntry: LogEntry = {
          id: generateId(),
          workflowId: this.node.id,
          timestamp: Date.now(),
          level: 'error',
          message: 'Observer onLog error',
          data: { error: err },
        };
        this.emitWithoutObserverNotification(errorEntry);
      }
    }
  }
}

// Pattern 3: Workflow Observer Error Logging (src/core/workflow.ts)

export class Workflow {
  protected readonly logger: WorkflowLogger;

  public emitEvent(event: WorkflowEvent): void {
    this.node.events.push(event);
    const observers = this.getRootObservers();

    for (const obs of observers) {
      try {
        obs.onEvent(event);
        if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
          obs.onTreeChanged(this.getRoot().node);
        }
      } catch (err) {
        this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
      }
    }
  }

  public snapshotState(): void {
    const snapshot = getObservedState(this);
    this.node.stateSnapshot = snapshot;
    const observers = this.getRootObservers();

    for (const obs of observers) {
      try {
        obs.onStateUpdated(this.node);
      } catch (err) {
        this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id });
      }
    }

    this.emitEvent({ type: 'stateSnapshot', node: this.node });
    this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  }
}
```

### Integration Points

```yaml
BREAKING_CHANGES: None - Observable constructor change is backward compatible

OBSERVABLE_CONSTRUCTOR:
  - file: src/debugger/tree-debugger.ts:41
  - change: new Observable<WorkflowEvent>() -> new Observable<WorkflowEvent>(undefined)
  - reason: Explicit undefined for optional parameter (no logger available in context)

TYPES_IMPORT:
  - file: src/utils/observable.ts
  - note: May need to import generateId if creating LogEntry in Observable
  - alternative: Use ObservableLogger interface instead of creating LogEntry directly

TEST_MOCKS:
  - pattern: Use vi.fn() for logger mocks
  - example: const mockLogger = { error: vi.fn() };
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run lint -- src/utils/observable.ts
npm run lint -- src/core/logger.ts
npm run lint -- src/core/workflow.ts

# Type checking
npm run type-check

# Project-wide validation
npm run lint
npm run type-check

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test Observable class changes
npm test -- src/__tests__/unit/observable.test.ts

# Test logger changes
npm test -- src/__tests__/unit/logger.test.ts

# Test all unit tests
npm test -- src/__tests__/unit/

# Coverage validation (if available)
npm run test:coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all tests to verify no regressions
npm test

# Verify observer error logging integration tests
npm test -- src/__tests__/integration/observer-logging.test.ts

# Expected: All tests pass, observer errors logged correctly
```

### Level 4: Manual Verification

```bash
# Create test workflow to verify observer error logging
# Run test and check that observer errors appear in workflow.node.logs
# Verify that console.error is NOT called for observer errors
# Verify that console.error IS still called for validation errors (lines 277, 286)

# Check that Observable works with and without logger
# Create Observable with logger - verify errors logged
# Create Observable without logger - verify console.error fallback

# Expected: Observer errors in logs, validation errors in console
```

## Final Validation Checklist

### Technical Validation

- [ ] All 6 observer-related console.error calls replaced
- [ ] 2 validation error console.error calls preserved (workflow.ts:277, 286)
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Observable backward compatibility maintained

### Feature Validation

- [ ] Observer onLog errors logged to WorkflowLogger (logger.ts:27)
- [ ] Observer onEvent errors logged via this.logger.error (workflow.ts:376)
- [ ] Observer onStateUpdated errors logged via this.logger.error (workflow.ts:394)
- [ ] Observable next/errors/complete errors use logger injection (observable.ts:39,52,65)
- [ ] Observable console.error fallback works without logger
- [ ] Validation errors still use console.error (immediate visibility before throw)

### Code Quality Validation

- [ ] Follows existing logger.error() signature: `error(message, data?)`
- [ ] Error context includes structured data (error, event type, node info)
- [ ] No infinite recursion in WorkflowLogger.emit()
- [ ] Observable constructor backward compatible (optional logger)
- [ ] Observer error isolation preserved (observer throws don't crash workflow)

### Test Coverage

- [ ] Observable error logging with/without logger tested
- [ ] WorkflowLogger observer onLog error tested
- [ ] Workflow observer onEvent error tested
- [ ] Workflow observer onStateUpdated error tested
- [ ] Validation error console.error preservation tested
- [ ] Error isolation verified (observer throws don't crash)

---

## Anti-Patterns to Avoid

- ❌ Don't call this.log() from within WorkflowLogger.emit() catch block (infinite recursion)
- ❌ Don't remove validation error console.error calls (lines 277, 286 in workflow.ts)
- ❌ Don't make Observable logger parameter required (breaks backward compatibility)
- ❌ Don't let observer errors propagate outside try-catch (crashes workflow)
- ❌ Don't use console.log for any of the replacements (must use logger.error)
- ❌ Don't forget to include error context in data parameter
