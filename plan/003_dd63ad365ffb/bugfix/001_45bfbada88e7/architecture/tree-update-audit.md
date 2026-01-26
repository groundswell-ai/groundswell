# treeUpdated Event Emission Audit

**Audit Date**: January 26, 2026
**Audit Scope**: `src/core/workflow.ts` - Workflow base class
**Audit Purpose**: Document all state-changing methods and their `treeUpdated` event emission status
**PRD Reference**: Issue #6 - "Missing TreeUpdated Event on State Changes"

---

## Executive Summary

This audit comprehensively analyzes all state-changing methods in the Workflow class to identify inconsistencies in `treeUpdated` event emission. The findings reveal significant gaps that explain PRD Issue #6.

### Key Findings

- **Total state-changing methods**: 12
- **Methods currently emitting treeUpdated (direct)**: 2 (16.7%)
- **Methods emitting treeUpdated (indirect)**: 3 (25%)
- **Methods missing treeUpdated emission**: 2 (16.7%)
- **Methods with no state changes**: 5 (41.6%)

### Critical Missing Emissions

| Method | Line | State Changes | Severity | Impact |
|--------|------|---------------|----------|--------|
| `attachChild()` | 334 | children, node.children, parent, node.parent | HIGH | Structural change not notified |
| `detachChild()` | 397 | children, node.children, parent, node.parent | HIGH | Structural change not notified |

### Emission Status Breakdown

- **CRITICAL GAP**: Methods that modify tree structure (attachChild, detachChild) do NOT emit `treeUpdated`
- **STATUS OK**: Status changes and state snapshots emit `treeUpdated` correctly
- **INDIRECT OK**: Methods that call setStatus/snapshotState transitively emit events

---

## Methods by Emission Status

### Currently Emitting treeUpdated (Direct)

| Method | Line | State Changes | Emission Line | Notes |
|--------|------|---------------|---------------|-------|
| `setStatus()` | 775 | `status`, `node.status` | 778 | Direct emission after status sync |
| `snapshotState()` | 452 | `stateSnapshot` | 473 | Emits both stateSnapshot AND treeUpdated |

### Emitting treeUpdated (Indirect)

| Method | Line | State Changes | Via Method | Emission Line | Notes |
|--------|------|---------------|------------|---------------|-------|
| `restartStep()` | 509 | `stateSnapshot` | snapshotState() | 548 (via snapshotState) | Calls snapshotState() which emits |
| `runFunctional()` | 810 | `status` | setStatus() | 816, 828, 836 (via setStatus) | Multiple status changes via setStatus() |
| Constructor | 101 | All initial state | attachChild() | 144 (via attachChild) | Calls attachChild() if parent provided |

### Missing treeUpdated Emission

| Method | Line | State Changes | Severity | Recommendation |
|--------|------|---------------|----------|----------------|
| `attachChild()` | 334 | children, node.children, parent, node.parent | HIGH | Add treeUpdated emission after line 372 |
| `detachChild()` | 397 | children, node.children, parent, node.parent | HIGH | Add treeUpdated emission after line 425 |

### No Direct State Changes

| Method | Line | Purpose | Notes |
|--------|------|---------|-------|
| `addObserver()` | 264 | Register observer | Modifies observers array, not tree state |
| `removeObserver()` | 274 | Remove observer | Modifies observers array, not tree state |
| `getRootObservers()` | 153 | Get root observers | Read-only traversal |
| `getRoot()` | 243 | Get root workflow | Read-only traversal |
| `getNode()` | 784 | Get node representation | Read-only accessor |

### Complex/Partial Cases

| Method | Line | State Changes | Notes | Recommendation |
|--------|------|---------------|-------|----------------|
| `emitEvent()` | 431 | `events` array | Emits events but doesn't emit treeUpdated for state-changing events | Consider emitting treeUpdated for certain event types |
| `validateAgentResponse()` | 729 | None directly | May affect workflow state but no direct tree modification | Optional: emit treeUpdated for consistency |
| `analyzeError()` | 653 | None | Read-only error analysis | No change needed |

---

## Detailed Method Analysis

### Method: `setStatus()`

**Location**: Line 775
**State Changes**: `this.status`, `this.node.status`
**Current Emission Status**: YES (Direct)

**Code Snippet**:
```typescript
public setStatus(status: WorkflowStatus): void {
  this.status = status;
  this.node.status = status;
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Analysis**:
- Correctly syncs workflow.status with node.status
- Emits `treeUpdated` event after state change
- Uses proper `getRoot().node` for event payload

**Recommendation**: No change needed - exemplary pattern to follow

---

### Method: `snapshotState()`

**Location**: Line 452
**State Changes**: `this.node.stateSnapshot`
**Current Emission Status**: YES (Direct)

**Code Snippet**:
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
      this.logger.error('Observer onStateUpdated error', { error: err, nodeId: this.node.id });
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

**Analysis**:
- Updates stateSnapshot property
- Notifies observers via onStateUpdated()
- Emits both `stateSnapshot` AND `treeUpdated` events
- Comments clearly explain why treeUpdated is emitted

**Recommendation**: No change needed - exemplary pattern to follow

---

### Method: `attachChild()`

**Location**: Line 334
**State Changes**: `this.children`, `this.node.children`, `child.parent`, `child.node.parent`
**Current Emission Status**: NO (Missing)

**Code Snippet**:
```typescript
public attachChild(child: Workflow): void {
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // Check if child already has a different parent
  if (child.parent !== null && child.parent !== this) {
    const errorMessage =
      `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent. ` +
      `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Check if child is an ancestor (would create circular reference)
  if (this.isDescendantOf(child)) {
    const errorMessage =
      `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Update child's parent if it's currently null
  if (child.parent === null) {
    child.parent = this;
    child.node.parent = this.node; // Maintain 1:1 mirror between workflow tree and node tree
  }

  this.children.push(child);
  this.node.children.push(child.node);

  // Emit child attached event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

**Analysis**:
- Modifies FOUR state properties: children, node.children, child.parent, child.node.parent
- Maintains 1:1 tree mirror invariant correctly
- Emits `childAttached` event
- **MISSING**: Does NOT emit `treeUpdated` event
- This is a STRUCTURAL change that affects the entire tree topology

**Why This Matters**:
- Tree structure changes (adding/removing children) are fundamental topology changes
- Observers need `treeUpdated` to rebuild their tree representation
- Without this event, TreeDebugger won't show the new child

**Recommendation**:
```typescript
// After line 372 (after childAttached event), add:
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Severity**: HIGH - This is the primary bug causing PRD Issue #6

---

### Method: `detachChild()`

**Location**: Line 397
**State Changes**: `this.children`, `this.node.children`, `child.parent`, `child.node.parent`
**Current Emission Status**: NO (Missing)

**Code Snippet**:
```typescript
public detachChild(child: Workflow): void {
  // Validate child is actually attached
  const index = this.children.indexOf(child);

  if (index === -1) {
    throw new Error(
      `Child '${child.node.name}' is not attached to workflow '${this.node.name}'`
    );
  }

  // Remove from workflow tree (this.children array)
  this.children.splice(index, 1);

  // Remove from node tree (this.node.children array)
  const nodeIndex = this.node.children.indexOf(child.node);
  if (nodeIndex !== -1) {
    this.node.children.splice(nodeIndex, 1);
  }

  // Clear child's parent reference (both workflow tree and node tree)
  child.parent = null;
  child.node.parent = null; // Maintain 1:1 mirror between workflow tree and node tree

  // Emit childDetached event
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });
}
```

**Analysis**:
- Modifies FOUR state properties: children, node.children, child.parent, child.node.parent
- Maintains 1:1 tree mirror invariant correctly
- Emits `childDetached` event
- **MISSING**: Does NOT emit `treeUpdated` event
- This is a STRUCTURAL change that affects the entire tree topology

**Why This Matters**:
- Removing a child changes the tree structure
- Observers need to rebuild their tree representation
- Without this event, TreeDebugger will still show the detached child

**Recommendation**:
```typescript
// After line 425 (after childDetached event), add:
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Severity**: HIGH - This is the primary bug causing PRD Issue #6

---

### Method: `restartStep()`

**Location**: Line 509
**State Changes**: `stateSnapshot` (via snapshotState call)
**Current Emission Status**: INDIRECT

**Code Snippet**:
```typescript
public async restartStep(stepName: string, options?: RestartStepOptions): Promise<unknown> {
  // ... validation logic ...

  // Restore state - use override if provided, otherwise capture current state
  let restoredState: SerializedWorkflowState;
  if (options?.stateOverride !== undefined) {
    restoredState = options.stateOverride;
    // For state override, we'd ideally restore the state here
  } else {
    // Capture current state as the restored state
    this.snapshotState();  // Line 548 - emits treeUpdated transitively
    restoredState = this.node.stateSnapshot ?? {};
  }

  // ... step execution logic ...

  // Emit stepRestarted event
  this.emitEvent({
    type: 'stepRestarted',
    node: this.node,
    stepName,
    retryCount,
    restoredState,
    timestamp: Date.now(),
  });

  return result;
}
```

**Analysis**:
- Calls `snapshotState()` at line 548
- `snapshotState()` emits `treeUpdated` event
- Emission is indirect via the snapshotState() call

**Recommendation**: No direct change needed - treeUpdated is emitted transitively

---

### Method: `runFunctional()`

**Location**: Line 810
**State Changes**: `status` (via setStatus calls)
**Current Emission Status**: INDIRECT

**Code Snippet**:
```typescript
private async runFunctional(): Promise<WorkflowResult<T>> {
  if (!this.executor) {
    throw new Error('No executor provided');
  }

  const startTime = Date.now();
  this.setStatus('running');  // Line 816 - emits treeUpdated transitively

  // Create workflow context
  const ctx = createWorkflowContext(
    this as unknown as Parameters<typeof createWorkflowContext>[0],
    this.parent?.id,
    this.config.enableReflection ? { enabled: true } : undefined,
    this.config.autoValidateResponses ?? true
  );

  try {
    const result = await this.executor(ctx);
    this.setStatus('completed');  // Line 828 - emits treeUpdated transitively

    return {
      data: result,
      node: this.node,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    this.setStatus('failed');  // Line 836 - emits treeUpdated transitively

    // Emit error event
    this.emitEvent({
      type: 'error',
      node: this.node,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        original: error,
        workflowId: this.id,
        stack: error instanceof Error ? error.stack : undefined,
        state: getObservedState(this),
        logs: [...this.node.logs] as LogEntry[],
      },
    });

    throw error;
  }
}
```

**Analysis**:
- Calls `setStatus()` at lines 816, 828, 836
- `setStatus()` emits `treeUpdated` event
- Multiple emissions as status changes during execution

**Recommendation**: No direct change needed - treeUpdated is emitted transitively

---

### Method: Constructor

**Location**: Line 101
**State Changes**: All initial state
**Current Emission Status**: INDIRECT

**Code Snippet**:
```typescript
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  this.id = generateId();

  // Parse overloaded arguments
  if (typeof name === 'object' && name !== null) {
    // Functional pattern: constructor(config, executor)
    this.config = name;
    this.executor = parentOrExecutor as WorkflowExecutor<T>;
    this.parent = null;
  } else {
    // Class-based pattern: constructor(name, parent)
    this.config = { name: name ?? this.constructor.name };
    this.parent = (parentOrExecutor as Workflow) ?? null;
  }

  // ... validation logic ...

  // Create the node representation
  this.node = {
    id: this.id,
    name: this.config.name ?? this.constructor.name,
    parent: this.parent?.node ?? null,
    children: [],
    status: 'idle',
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  // Create logger with root observers
  this.logger = new WorkflowLogger(this.node, this.getRootObservers());

  // Attach to parent if provided
  if (this.parent) {
    this.parent.attachChild(this);  // Line 144 - emits treeUpdated transitively if attachChild is fixed
  }
}
```

**Analysis**:
- Calls `attachChild()` at line 144 if parent provided
- Once `attachChild()` is fixed to emit `treeUpdated`, this will transitively emit

**Recommendation**: No direct change needed - will emit transitively once attachChild() is fixed

---

### Method: `emitEvent()`

**Location**: Line 431
**State Changes**: `this.node.events` array
**Current Emission Status**: NO (Different purpose)

**Code Snippet**:
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
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

**Analysis**:
- Modifies `events` array but this is event history, not tree structure
- Calls `onTreeChanged()` for structural events
- Does NOT call `onTreeChanged()` for state events like `error`, `invalidResponse`
- This method is the event EMISSION mechanism, not a state change method itself

**Why This Doesn't Emit treeUpdated**:
- This method IS the mechanism for emitting events
- Calling `emitEvent({ type: 'treeUpdated' })` from within `emitEvent()` would cause infinite recursion
- The proper pattern is: state-changing methods call `emitEvent()` to notify observers

**Recommendation**: No change needed - this is the event emission infrastructure

**Consideration**: The conditional check for `onTreeChanged()` could be expanded to include more event types if needed, but this is separate from the `treeUpdated` emission issue.

---

### Method: `validateAgentResponse()`

**Location**: Line 729
**State Changes**: None directly (emits event)
**Current Emission Status**: NO

**Code Snippet**:
```typescript
public validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema: z.ZodTypeAny = z.unknown()
): boolean {
  // Call shared utility for validation
  const result = validateAgentResponse(response, dataSchema);

  if (result.valid) {
    // Response is valid
    return true;
  }

  // Validation failed - emit event and create error
  const zodError = result.errors!;

  // Emit invalidResponse event
  this.emitEvent({
    type: 'invalidResponse',
    node: this.node,
    response,
    agentId,
    errors: zodError,
    timestamp: Date.now(),
  });

  // Create WorkflowError with INVALID_RESPONSE_FORMAT context
  const validationError: WorkflowError = {
    message: `Agent response validation failed for agent '${agentId}'`,
    original: zodError,
    workflowId: this.id,
    stack: zodError.stack,
    state: getObservedState(this),
    logs: [...this.node.logs] as LogEntry[],
  };

  return false;
}
```

**Analysis**:
- Emits `invalidResponse` event
- Does NOT directly modify workflow state
- Validation failure is an informational event, not a structural change

**Recommendation**: Optional - could emit `treeUpdated` after `invalidResponse` event for consistency with other state-changing events, but this is not critical since no tree structure is modified

**Priority**: LOW - Nice to have for consistency, not required for bug fix

---

### Method: `analyzeError()`

**Location**: Line 653
**State Changes**: None (read-only analysis)
**Current Emission Status**: N/A

**Code Snippet**:
```typescript
public analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
  // STEP 1: Check recoverable flag
  const original = error.original as Error | undefined;
  if (original && 'recoverable' in original && !original.recoverable) {
    return 'abort';
  }

  // STEP 2: Extract stepName from error metadata
  const stepName = error.state?.stepName as string | undefined;
  if (!stepName) {
    return 'abort';
  }

  // ... analysis logic ...

  return 'abort';
}
```

**Analysis**:
- Pure read-only method
- Analyzes error metadata and returns decision
- No state modifications

**Recommendation**: No change needed

---

## Recommendations

### Priority 1: Critical Missing Emissions (MUST FIX)

These methods modify tree structure but don't emit `treeUpdated`. This is the root cause of PRD Issue #6.

#### 1.1 Fix `attachChild()` Method

**File**: `src/core/workflow.ts`
**Line**: After line 372 (after `childAttached` event)

**Add**:
```typescript
// Emit treeUpdated event to notify observers of tree structure change
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Rationale**:
- Adding a child is a structural change
- Tree topology changes from: parent → [existing children]
- To: parent → [existing children + new child]
- Observers need to rebuild their tree representation

#### 1.2 Fix `detachChild()` Method

**File**: `src/core/workflow.ts`
**Line**: After line 425 (after `childDetached` event)

**Add**:
```typescript
// Emit treeUpdated event to notify observers of tree structure change
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
```

**Rationale**:
- Removing a child is a structural change
- Tree topology changes from: parent → [children including removed]
- To: parent → [children without removed]
- Observers need to rebuild their tree representation

### Priority 2: Consistency Improvements (SHOULD CONSIDER)

#### 2.1 Consider `emitEvent()` Enhancement

**Current Behavior**: `emitEvent()` only calls `onTreeChanged()` for 3 event types
**Proposal**: Consider calling `onTreeChanged()` for additional state-changing events

**Events to Consider**:
- `invalidResponse` - indicates workflow state change
- `error` - indicates workflow status change
- `stepRestarted` - indicates workflow state change

**Note**: This is separate from emitting `treeUpdated` events. This is about calling `onTreeChanged()` observer callback for more event types.

### Priority 3: Code Quality (OPTIONAL)

#### 3.1 Add Helper Method for Consistent Emission

**Proposal**: Create a helper method to ensure consistent `treeUpdated` emission

```typescript
private notifyTreeUpdated(): void {
  this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
}
```

**Usage**:
- Replace direct `emitEvent({ type: 'treeUpdated', ... })` calls with `this.notifyTreeUpdated()`
- Ensures consistent payload structure
- Makes code more DRY

**Note**: This is a refactoring suggestion, not required for bug fix.

---

## Impact Analysis

### Current State (Before Fix)

```
User Action: parent.attachChild(child)
├─ Workflow tree: Updated correctly ✅
├─ Node tree: Updated correctly ✅
├─ childAttached event: Emitted ✅
├─ treeUpdated event: NOT emitted ❌
└─ TreeDebugger: Shows stale state ❌

Result: 1:1 tree mirror invariant broken for observers
```

### Desired State (After Fix)

```
User Action: parent.attachChild(child)
├─ Workflow tree: Updated correctly ✅
├─ Node tree: Updated correctly ✅
├─ childAttached event: Emitted ✅
├─ treeUpdated event: Emitted ✅
└─ TreeDebugger: Shows current state ✅

Result: 1:1 tree mirror invariant maintained for observers
```

### Affected Components

1. **TreeDebugger** (src/debugger/tree-debugger.ts)
   - Currently: May not reflect structural changes
   - After fix: Rebuilds tree on every structural change

2. **EventReplayer** (src/debugger/event-replayer.ts)
   - Currently: May not replay structural changes correctly
   - After fix: Has complete event history

3. **Custom Observers**
   - Currently: May miss tree structure updates
   - After fix: Receive all structural notifications

---

## Testing Recommendations

### Unit Tests Needed

1. **attachChild() treeUpdated emission**
   ```typescript
   test('attachChild emits treeUpdated event', () => {
     const parent = new Workflow('Parent');
     const child = new Workflow('Child');
     const mockObserver = createMockObserver();

     parent.addObserver(mockObserver);
     parent.attachChild(child);

     expect(mockObserver.onTreeChanged).toHaveBeenCalled();
     // Verify event type is 'treeUpdated'
   });
   ```

2. **detachChild() treeUpdated emission**
   ```typescript
   test('detachChild emits treeUpdated event', () => {
     const parent = new Workflow('Parent');
     const child = new Workflow('Child', parent);
     const mockObserver = createMockObserver();

     parent.addObserver(mockObserver);
     parent.detachChild(child);

     expect(mockObserver.onTreeChanged).toHaveBeenCalled();
     // Verify event type is 'treeUpdated'
   });
   ```

3. **Multiple structural changes**
   ```typescript
   test('multiple attachChild/detachChild operations emit treeUpdated each time', () => {
     const parent = new Workflow('Parent');
     const child1 = new Workflow('Child1');
     const child2 = new Workflow('Child2');
     const mockObserver = createMockObserver();

     parent.addObserver(mockObserver);

     parent.attachChild(child1);
     expect(mockObserver.onTreeChanged).toHaveBeenCalledTimes(1);

     parent.attachChild(child2);
     expect(mockObserver.onTreeChanged).toHaveBeenCalledTimes(2);

     parent.detachChild(child1);
     expect(mockObserver.onTreeChanged).toHaveBeenCalledTimes(3);
   });
   ```

### Integration Tests Needed

1. **TreeDebugger receives updates**
   ```typescript
   test('TreeDebugger rebuilds tree after attachChild', () => {
     const workflow = new Workflow('Root');
     const debugger = new WorkflowTreeDebugger(workflow);

     const child = new Workflow('Child', workflow);

     // Verify debugger shows new child
     expect(debugger.root.children).toHaveLength(1);
   });
   ```

2. **Observer notification consistency**
   ```typescript
   test('observers receive treeUpdated for all structural changes', () => {
     const workflow = new Workflow('Root');
     const observer = new TestObserver();

     workflow.addObserver(observer);

     // Test all structural operations
     const child1 = new Workflow('Child1', workflow);
     expect(observer.treeChangedCount).toBe(1);

     const child2 = new Workflow('Child2', workflow);
     expect(observer.treeChangedCount).toBe(2);

     workflow.detachChild(child1);
     expect(observer.treeChangedCount).toBe(3);
   });
   ```

---

## Appendix: Research References

This audit incorporates findings from four parallel research efforts:

### A1. State-Changing Methods Analysis
**File**: `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/state-changing-methods-analysis.md`

**Key Findings**:
- Identified 12 state-changing methods
- Categorized emission status (YES/NO/INDIRECT/PARTIAL)
- Provided code snippets for each method
- Initial recommendations for missing emissions

### A2. treeUpdated Event Patterns
**File**: `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/treeupdated-event-patterns.md`

**Key Findings**:
- Only 2 locations currently emit treeUpdated (setStatus, snapshotState)
- Event definition: `{ type: 'treeUpdated'; root: WorkflowNode }`
- Primary consumers: TreeDebugger, EventReplayer
- Test coverage gaps identified

### A3. Observer Patterns Analysis
**File**: `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/observer-patterns-analysis.md`

**Key Findings**:
- WorkflowObserver interface: onLog, onEvent, onStateUpdated, onTreeChanged
- Event flow: child → root via getRootObservers()
- Event categorization: Structural, State, Metadata
- Current inconsistencies documented

### A4. Tree Mirroring Invariant
**File**: `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S1/research/tree-mirroring-invariant.md`

**Key Findings**:
- 1:1 tree mirror requires dual tree synchronization
- Workflow tree + Node tree must stay in sync
- attachChild/detachChild maintain tree structure but don't notify observers
- Missing notifications break the invariant for observers

---

## Conclusion

This audit has identified **2 critical missing `treeUpdated` emissions** in the Workflow class:

1. **`attachChild()` method** (line 334) - Missing emission after line 372
2. **`detachChild()` method** (line 397) - Missing emission after line 425

These missing emissions are the root cause of **PRD Issue #6**: "Missing TreeUpdated Event on State Changes".

The fix is straightforward:
- Add `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });` after the existing event emissions in both methods

This will restore the "1:1 tree mirror" guarantee for observers and ensure the TreeDebugger receives accurate real-time updates.

---

**Audit Completed By**: P2.M3.T1.S1 Research Task
**Next Task**: P2.M3.T1.S2 - "Add treeUpdated emission to missing methods"
**Final Task**: P2.M3.T1.S3 - "Write integration tests for tree update consistency"
