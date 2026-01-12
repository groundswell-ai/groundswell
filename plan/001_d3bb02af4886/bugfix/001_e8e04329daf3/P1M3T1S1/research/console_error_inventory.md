# Console.error Call Inventory

## Executive Summary

- **Total console.error calls found**: 8
- **Observer-related**: 6 (to be replaced in P1.M3.T1.S2)
- **Other purpose**: 2 (validation errors to preserve)

## Observer-Related Console.error Calls

### 1. src/core/logger.ts:27

**Method**: `WorkflowLogger.emit()`

**Error Type**: Observer onLog callback error

**Context**: Emitting log entries to observers

```typescript
private emit(entry: LogEntry): void {
  this.node.logs.push(entry);
  for (const obs of this.observers) {
    try {
      obs.onLog(entry);
    } catch (err) {
      console.error('Observer onLog error:', err);
    }
  }
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: `this.logger.error('Observer onLog error', { error: err })`

**Note**: WorkflowLogger class has access to its own emit() method, but this is a recursive case. The replacement should call `this.log('error', 'Observer onLog error', { error: err })` to use the internal logging mechanism without infinite recursion.

---

### 2. src/core/workflow.ts:376

**Method**: `Workflow.emitEvent()`

**Error Type**: Observer onEvent callback error

**Context**: Emitting workflow events to root observers

```typescript
public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);

      // Also notify tree changed for tree update events
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged(this.getRoot().node);
      }
    } catch (err) {
      console.error('Observer onEvent error:', err);
    }
  }
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: `this.logger.error('Observer onEvent error', { error: err, eventType: event.type })`

---

### 3. src/core/workflow.ts:394

**Method**: `Workflow.snapshotState()`

**Error Type**: Observer onStateUpdated callback error

**Context**: Notifying observers of state snapshot updates

```typescript
public snapshotState(): void {
  const snapshot = getObservedState(this);
  this.node.stateSnapshot = snapshot;

  // Notify observers
  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onStateUpdated(this.node);
    } catch (err) {
      console.error('Observer onStateUpdated error:', err);
    }
  }

  // Emit snapshot event
  this.emitEvent({
    type: 'stateSnapshot',
    node: this.node,
  });

  // Emit treeUpdated event to trigger tree debugger rebuild
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: `this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id })`

---

### 4. src/utils/observable.ts:39

**Method**: `Observable.next()`

**Error Type**: Subscriber next callback error

**Context**: Emitting values to subscribers

```typescript
next(value: T): void {
  for (const subscriber of this.subscribers) {
    try {
      subscriber.next?.(value);
    } catch (err) {
      console.error('Observable subscriber error:', err);
    }
  }
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: Will need logger injection pattern (Observable class does not have WorkflowLogger access)

**Implementation Notes**:
- Observable<T> is a standalone utility class
- No access to WorkflowLogger
- Will need constructor injection or fallback pattern
- See Implementation Notes for P1.M3.T1.S2 section below

---

### 5. src/utils/observable.ts:52

**Method**: `Observable.error()`

**Error Type**: Subscriber error handler failure

**Context**: Signaling errors to subscribers

```typescript
error(err: unknown): void {
  for (const subscriber of this.subscribers) {
    try {
      subscriber.error?.(err);
    } catch (e) {
      console.error('Observable error handler failed:', e);
    }
  }
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: Same logger injection pattern as observable.ts:39

---

### 6. src/utils/observable.ts:65

**Method**: `Observable.complete()`

**Error Type**: Subscriber complete callback failure

**Context**: Signaling completion to subscribers

```typescript
complete(): void {
  for (const subscriber of this.subscribers) {
    try {
      subscriber.complete?.();
    } catch (err) {
      console.error('Observable complete handler failed:', err);
    }
  }
  this.subscribers.clear();
}
```

**Categorization**: Observer-related - **REPLACE** in P1.M3.T1.S2

**Replacement Pattern**: Same logger injection pattern as observable.ts:39

---

## Other Purpose Console.error Calls

### 1. src/core/workflow.ts:277

**Method**: `Workflow.attachChild()`

**Error Type**: Validation error - child already has parent

**Context**: Structural validation before throwing exception

```typescript
// Check if child already has a different parent
if (child.parent !== null && child.parent !== this) {
  const errorMessage =
    `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
    `A workflow can only have one parent. ` +
    `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
```

**Categorization**: Other purpose - **DO NOT REPLACE**

**Rationale**: Validation error that immediately throws. The console.error provides immediate visibility before the stack trace. This is a structural invariant violation, not an observer callback error.

---

### 2. src/core/workflow.ts:286

**Method**: `Workflow.attachChild()`

**Error Type**: Validation error - circular reference detection

**Context**: Cycle detection before throwing exception

```typescript
// Check if child is an ancestor (would create circular reference)
if (this.isDescendantOf(child)) {
  const errorMessage =
    `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
    `This would create a circular reference.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
```

**Categorization**: Other purpose - **DO NOT REPLACE**

**Rationale**: Validation error that immediately throws. The console.error provides immediate visibility before the stack trace. This is a structural invariant violation (circular reference), not an observer callback error.

---

## Replacement Recommendations

### Observer-Related Calls (Replace with logger.error)

| File | Line | Observer Type | Current Call |
|------|------|---------------|--------------|
| src/core/logger.ts | 27 | WorkflowObserver.onLog | `console.error('Observer onLog error:', err)` |
| src/core/workflow.ts | 376 | WorkflowObserver.onEvent | `console.error('Observer onEvent error:', err)` |
| src/core/workflow.ts | 394 | WorkflowObserver.onStateUpdated | `console.error('Observer onStateUpdated error:', err)` |
| src/utils/observable.ts | 39 | Observer.next | `console.error('Observable subscriber error:', err)` |
| src/utils/observable.ts | 52 | Observer.error | `console.error('Observable error handler failed:', e)` |
| src/utils/observable.ts | 65 | Observer.complete | `console.error('Observable complete handler failed:', err)` |

### Validation Errors (Preserve as console.error)

| File | Line | Purpose | Reason |
|------|------|---------|--------|
| src/core/workflow.ts | 277 | Child already has parent validation | Structural validation before throw |
| src/core/workflow.ts | 286 | Circular reference detection | Structural validation before throw |

---

## Implementation Notes for P1.M3.T1.S2

### 1. Workflow Class Calls (Direct Access)

**Files**: src/core/workflow.ts:376, src/core/workflow.ts:394

- Workflow class has `this.logger` property available
- Use: `this.logger.error('Observer onEvent error', { error: err, eventType: event.type })`

### 2. WorkflowLogger Recursive Case

**File**: src/core/logger.ts:27

- WorkflowLogger cannot call `this.log()` from within `emit()` as it would create recursion
- Recommended approach: Create a separate internal error logging path
- Options:
  - Use `this.node.logs.push()` directly with error entry (bypass emit)
  - Add a `private emitWithoutObserverNotification()` method
  - Call `this.log()` with a flag to skip observer notification

### 3. Observable Class Logger Injection Pattern

**Files**: src/utils/observable.ts:39, 52, 65

- Observable<T> is a standalone utility class with no WorkflowLogger access
- Recommended pattern: Constructor injection with optional fallback

```typescript
// Recommended implementation for Observable class
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
      // Fallback to console.error if no logger provided
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

  // Similar pattern for error() and complete() methods
}
```

### 4. Key Implementation Principles

1. **Preserve error isolation**: Observer errors should never crash workflows
2. **Add context**: Include error details, observer type, event type
3. **Maintain backward compatibility**: Observable class should work without logger
4. **Follow existing patterns**: Match WorkflowLogger.error() signature: `error(message: string, data?: unknown): void`

### 5. Testing Considerations

After replacement in P1.M3.T1.S2:
- Verify observer errors are logged to WorkflowLogger (not console)
- Verify observer errors don't crash workflows (error isolation preserved)
- Verify log entries contain proper error context
- Verify Observable class works with and without logger injection
- Verify validation errors still use console.error (unchanged)

---

## Observer Interface Reference

```typescript
// WorkflowObserver interface (src/types/observer.ts)
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;           // Error at src/core/logger.ts:27
  onEvent(event: WorkflowEvent): void;    // Error at src/core/workflow.ts:376
  onStateUpdated(node: WorkflowNode): void;  // Error at src/core/workflow.ts:394
  onTreeChanged(root: WorkflowNode): void;   // No error handling (safe implementation)
}

// Observer interface for Observable class (src/utils/observable.ts)
export interface Observer<T> {
  next?: (value: T) => void;              // Error at src/utils/observable.ts:39
  error?: (error: unknown) => void;       // Error at src/utils/observable.ts:52
  complete?: () => void;                  // Error at src/utils/observable.ts:65
}
```

---

## Search Methodology

**Command Used**:
```bash
grep -rn "console\.error" src/ --exclude-dir=__tests__
```

**Excluded Files**:
- Test files in `src/__tests__/` directory
- Test assertions using `expect(console.error).toHaveBeenCalled()`
- Comments referencing console.error

**Production Code Files Analyzed**:
- src/core/logger.ts
- src/core/workflow.ts
- src/utils/observable.ts

---

## Validation Performed

### Level 1: Search Completeness
- [x] Grep search for 'console.error' executed in src/ directory
- [x] Test files excluded from search results
- [x] 8 console.error calls found (matches expected)

### Level 2: Categorization Accuracy
- [x] Observer calls identified (6 calls in try-catch around observer/subscriber callbacks)
- [x] Validation errors identified (2 calls before throw statements)
- [x] All categorizations match code context

### Level 3: Document Quality
- [x] All console.error calls documented with file path and line number
- [x] Each call includes the containing method/function name
- [x] Categorization (observer-related vs other) is clearly stated
- [x] Code snippets show the surrounding context (try-catch, throw, etc.)
- [x] Replacement recommendations section provides clear guidance
- [x] Non-observer calls include rationale for preservation

### Level 4: Handoff Readiness
- [x] All file references include exact paths and line numbers
- [x] Next task (P1.M3.T1.S2) can proceed with only this document
- [x] Implementation notes provide specific patterns for each context
- [x] Observable logger injection pattern documented
- [x] No additional research required for implementation

---

## Summary

This inventory provides complete information for P1.M3.T1.S2 to replace observer error console.error calls with logger.error(). The key findings are:

1. **6 observer-related console.error calls** need replacement
2. **2 validation error console.error calls** should be preserved
3. **Workflow class calls** can directly use `this.logger.error()`
4. **WorkflowLogger recursive case** needs special handling to avoid infinite recursion
5. **Observable class** needs logger injection pattern with fallback

The next task (P1.M3.T1.S2) can proceed using only this document and the existing codebase.
