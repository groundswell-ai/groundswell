# Node State Patterns Research

## Summary

Research into how the Groundswell codebase currently handles node state events (`stateSnapshot`, `error`, `stepStart/End`, `taskStart/End`) to inform the implementation of P2.M1.T1.S3 (replay logic for node state events).

## 1. StateSnapshot Event Patterns

### Current Implementation

**Source:** `src/core/workflow.ts` (lines 434-456)

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

### Key Patterns

1. **State Capture**: `getObservedState(this)` extracts observed fields via WeakMap
2. **Direct Update**: `node.stateSnapshot` is set directly (not accumulated)
3. **Observer Notification**: All root observers get `onStateUpdated` callback
4. **Event Emission**: Full node is included in `stateSnapshot` event
5. **Tree Refresh**: Also emits `treeUpdated` to trigger debugger rebuild

### Event Structure

```typescript
{
  type: 'stateSnapshot';
  node: WorkflowNode;  // Full node with updated stateSnapshot
}
```

**Critical Note**: The event contains the ENTIRE node, not just the snapshot data. This is important for replay - we extract `event.node.stateSnapshot` and apply it.

### Observed State Pattern

**Source:** `src/decorators/observed-state.ts`

```typescript
// WeakMap tracks observed state per instance
const observedStateMap = new WeakMap<Workflow, SerializedWorkflowState>();

function getObservedState(workflow: Workflow): SerializedWorkflowState {
  // Extracts only decorated fields
  // Respects @hidden and @redact decorators
  // Returns simple Record<string, unknown>
}
```

## 2. Error Event Patterns

### Current Implementation

**Source:** `src/core/workflow.ts` (lines 520-536)

```typescript
// In run() catch block
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
```

**Source:** `src/core/workflow-context.ts` (lines 147-165)

```typescript
// In step() catch block
this.emitEvent({
  type: 'error',
  node: stepNode,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.workflowId,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this.workflow),
    logs: [...this.workflow.node.logs] as LogEntry[],
  },
});
```

### Error Event Structure

```typescript
{
  type: 'error';
  node: WorkflowNode;
  error: {
    message: string;
    original: unknown;
    workflowId: string;
    stack?: string;
    state: SerializedWorkflowState;  // State at time of error
    logs: LogEntry[];                // Logs at time of error
  };
}
```

### Key Findings

1. **No Direct Error Storage**: There is NO `errors[]` field on WorkflowNode
2. **Events Array Only**: All errors are stored in `node.events[]` array
3. **Rich Context**: Errors include state snapshot and logs at time of error
4. **Original Preserved**: `original` field preserves the thrown error object

### Implications for Replay

Since there's no dedicated `errors[]` field, the replayer must decide:

**Option A**: Store errors in `node.events[]` array (append-only, like current system)
**Option B**: Add new `errors[]` field to WorkflowNode for easier access
**Option C**: Create separate error index/map for querying

**Recommendation**: Use `node.events[]` for now (matches current behavior), but consider `errors[]` field for P2.M1.T2 (integration with debugger).

## 3. Step Event Patterns

### Current Implementation

**Source:** `src/decorators/step.ts`

```typescript
// stepStart event
{
  type: 'stepStart';
  node: WorkflowNode;  // The step node
  step: string;        // Step name
}

// stepEnd event
{
  type: 'stepEnd';
  node: WorkflowNode;  // The step node
  step: string;        // Step name
  duration: number;    // Duration in ms
}
```

### Event Flow

1. `@Step` decorator wraps method execution
2. Creates step node as child of parent
3. Emits `stepStart` before execution
4. Captures state snapshot if `snapshotState: true` option
5. Emits `stepEnd` after execution with duration
6. Step node is attached to parent's children array

### Timing Calculation

```typescript
const startTime = Date.now();
// ... execute step ...
const duration = Date.now() - startTime;
```

### Key Patterns

1. **Step Nodes are Separate**: Steps create their own WorkflowNode in the tree
2. **Duration Tracking**: Only `stepEnd` has duration, `stepStart` just marks start
3. **Metadata Only**: Step events don't modify tree structure (that's done separately via `childAttached`)

## 4. Task Event Patterns

### Current Implementation

**Source:** `src/decorators/task.ts`

```typescript
// taskStart event
{
  type: 'taskStart';
  node: WorkflowNode;  // The parent node
  task: string;        // Task name
}

// taskEnd event
{
  type: 'taskEnd';
  node: WorkflowNode;  // The parent node
  task: string;        // Task name
}
```

### Key Differences from Steps

1. **No Separate Node**: Tasks don't create their own WorkflowNode
2. **No Duration**: `taskEnd` doesn't track timing
3. **Parent Reference**: `node` field points to parent, not a separate task node
4. **Metadata Only**: These are informational events only

## 5. Event Array Patterns

### Current Implementation

**Source:** `src/core/workflow.ts` (line 117)

```typescript
this.node = {
  id: this.id,
  name: this.config.name ?? this.constructor.name,
  parent: this.parent?.node ?? null,
  children: [],
  status: 'idle',
  logs: [],
  events: [],  // All events stored here
  stateSnapshot: null,
};
```

**Source:** `src/core/workflow.ts` (line 414)

```typescript
public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);  // Append-only pattern
  // ... observer notification logic
}
```

### Key Characteristics

1. **Append-Only**: Events are only added, never removed
2. **Full History**: `node.events[]` contains complete event history
3. **No Filtering**: All event types are stored
4. **Potential Size**: Arrays can grow very large over time

### Replay Implications

During replay, should we:
- **Preserve events array**: Reconstruct full event history
- **Clear events array**: Start fresh during replay
- **Filter events**: Only store certain event types

**Recommendation**: Clear events array during replay (we're reconstructing from events, not duplicating them).

## 6. Test Patterns

### Event Capture Pattern

**Source:** `src/__tests__/unit/tree-debugger.test.ts`

```typescript
const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

// Verify specific events
const stateSnapshotEvent = events.find((e) => e.type === 'stateSnapshot');
expect(stateSnapshotEvent).toBeDefined();
```

### State Validation Pattern

```typescript
// Check that stateSnapshot was applied
expect(node.stateSnapshot).toEqual({ count: 42 });

// Check that error was recorded
const errorEvents = node.events.filter(e => e.type === 'error');
expect(errorEvents).toHaveLength(1);
```

## 7. Gotchas and Edge Cases

### 7.1 StateSnapshot Contains Full Node

**Issue**: `stateSnapshot` event includes entire node, which could cause circular references.

**Solution**: Extract only `event.node.stateSnapshot` field, don't use entire node.

### 7.2 No Error Field on Node

**Issue**: WorkflowNode has no `errors[]` field, only `events[]`.

**Solution**: Store errors in `node.events[]` array, filter by `e.type === 'error'` when needed.

### 7.3 Step/Task Events Refer Different Nodes

**Issue**: Step events reference step nodes (separate), task events reference parent nodes.

**Solution**: Check if `event.node.id` exists in nodeMap. If not, it's a step node that will be attached via `childAttached` event - skip for now.

### 7.4 State Can Be Null

**Issue**: `stateSnapshot` can be `null` (no snapshot captured).

**Solution**: Handle null case gracefully, don't throw error.

### 7.5 Event Ordering

**Issue**: State events may arrive before node exists (out of order).

**Solution**: Log warning and continue if node not found in nodeMap.

### 7.6 Multiple StateSnapshots

**Issue**: Node can have multiple `stateSnapshot` events (overwrites previous).

**Solution**: Each new snapshot overwrites `node.stateSnapshot` (last write wins).

### 7.7 StateSnapshot Triggers treeUpdated

**Issue**: `snapshotState()` emits BOTH `stateSnapshot` AND `treeUpdated` events.

**Solution**: Handle both events independently - `treeUpdated` rebuilds map, `stateSnapshot` updates field.

## 8. Implementation Recommendations

### For StateSnapshot Handler

```typescript
private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    console.warn(`Node '${event.node.id}' not found in nodeMap during stateSnapshot event`);
    return;
  }

  // Extract just the snapshot data, not the entire node
  node.stateSnapshot = event.node.stateSnapshot;
}
```

### For Error Handler

```typescript
private handleErrorEvent(event: Extract<WorkflowEvent, { type: 'error' }>): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    console.warn(`Node '${event.node.id}' not found in nodeMap during error event`);
    return;
  }

  // Push error to events array (matches current behavior)
  node.events.push(event);
}
```

### For StepStart/StepEnd Handler

```typescript
private handleStepStart(event: Extract<WorkflowEvent, { type: 'stepStart' }>): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Step node may not exist yet - childAttached will add it
    return;
  }

  // Add to events array for tracking
  node.events.push(event);
}

private handleStepEnd(event: Extract<WorkflowEvent, { type: 'stepEnd' }>): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    // Step node may not exist yet - childAttached will add it
    return;
  }

  // Add to events array for tracking
  node.events.push(event);
}
```

### For TaskStart/TaskEnd Handler

```typescript
private handleTaskStart(event: Extract<WorkflowEvent, { type: 'taskStart' }>): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) {
    console.warn(`Node '${event.node.id}' not found in nodeMap during taskStart event`);
    return;
  }

  // Add to events array for tracking
  node.events.push(event);
}
```

## 9. References

### Source Files

- `src/core/workflow.ts` - Main workflow class, event emission, state snapshots
- `src/core/workflow-context.ts` - Step execution, error handling
- `src/decorators/step.ts` - Step decorator, lifecycle events
- `src/decorators/task.ts` - Task decorator, lifecycle events
- `src/decorators/observed-state.ts` - State observation patterns
- `src/types/events.ts` - Event type definitions
- `src/types/workflow.ts` - WorkflowNode interface
- `src/types/error.ts` - WorkflowError interface
- `src/types/snapshot.ts` - SerializedWorkflowState type

### Test Files

- `src/__tests__/unit/tree-debugger.test.ts` - Event capture patterns
- `src/__tests__/integration/bidirectional-consistency.test.ts` - Tree validation patterns
- `src/__tests__/helpers/tree-verification.ts` - Verification helpers
