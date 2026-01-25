# WorkflowTreeDebugger Analysis

## Current Implementation Overview

**Location**: `src/debugger/tree-debugger.ts`

### Class Structure

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  private root: WorkflowNode;
  public readonly events: Observable<WorkflowEvent>;
  private nodeMap: Map<string, WorkflowNode> = new Map();

  constructor(workflow: Workflow)
}
```

### Constructor Parameters

Currently accepts **only one parameter**:
- `workflow: Workflow` - The root workflow instance to debug

**No configuration options exist** - this is where we need to add the `{ persistEvents: boolean }` option.

### Event Stream Handling

The debugger creates and manages its own `Observable<WorkflowEvent>`:

```typescript
public readonly events: Observable<WorkflowEvent>;
```

**Key characteristics**:
1. Created as `new Observable<WorkflowEvent>()` in constructor (line 41)
2. Events emitted via `this.events.next(event)` in `onEvent()` method (line 116)
3. **All events flow through `onEvent()`** - this is our hook for persistence
4. Follows custom Observable pattern from `src/utils/observable.ts`

### Observer Interface Implementation

```typescript
onLog(entry: LogEntry): void
onEvent(event: WorkflowEvent): void
onStateUpdated(node: WorkflowNode): void
onTreeChanged(root: WorkflowNode): void
```

**Critical for persistence**: `onEvent()` receives ALL workflow events and forwards them to the `events` Observable.

### Public API Methods

```typescript
getTree(): WorkflowNode
getNode(id: string): WorkflowNode | undefined
toTreeString(node?: WorkflowNode): string
toLogString(node?: WorkflowNode): string
getStats(): { totalNodes, byStatus, totalLogs, totalEvents }
```

### Internal State Management

1. **nodeMap**: `Map<string, WorkflowNode>` for O(1) node lookups
2. **root**: Current root node reference
3. **events**: Observable stream of all workflow events

**No event history storage currently exists** - we need to add this.

## Key Insights for Persistence Implementation

### 1. Event Flow Architecture

```
Workflow.emitEvent() → WorkflowTreeDebugger.onEvent() → events.next(event) → external subscribers
```

**For persistence**, we need to intercept at `onEvent()`:

```
Workflow.emitEvent() → WorkflowTreeDebugger.onEvent() → [persist if enabled] → events.next(event)
```

### 2. Current State Tracking

The debugger tracks:
- Tree structure via `nodeMap` (incremental updates)
- Root node reference
- Event stream (forwarding only, no storage)

**NOT tracked**:
- Event history
- Event timing/order
- Past event states

### 3. Observable Pattern Usage

From `src/utils/observable.ts`:
- Custom Observable implementation (no RxJS dependency)
- Subscribe/unsubscribe pattern
- Error isolation per subscriber
- No built-in replay or history

### 4. Structural Event Handling

The `onEvent()` method already handles structural events:

```typescript
switch (event.type) {
  case 'childAttached':
    this.buildNodeMap(event.child);
    break;
  case 'childDetached':
    this.removeSubtreeNodes(event.childId);
    break;
  case 'treeUpdated':
    this.root = event.root;
    break;
  default:
    // Non-structural events - no map update needed
    break;
}
```

**For persistence**: We need to capture ALL event types, not just structural ones.

## Implementation Strategy

### Constructor Modification

**Current**:
```typescript
constructor(workflow: Workflow) {
  this.root = workflow.getNode();
  this.events = new Observable<WorkflowEvent>();
  this.buildNodeMap(this.root);
  workflow.addObserver(this);
}
```

**Needs to become**:
```typescript
constructor(workflow: Workflow, options: { persistEvents?: boolean } = {}) {
  this.root = workflow.getNode();
  this.events = new Observable<WorkflowEvent>();
  this.buildNodeMap(this.root);
  workflow.addObserver(this);

  // NEW: Initialize event history if persistence enabled
  if (options.persistEvents) {
    this.eventHistory = [];
  }
}
```

### Private Fields to Add

```typescript
private eventHistory: WorkflowEvent[] = [];
private persistEvents: boolean = false;
```

### onEvent() Modification

**Current**:
```typescript
onEvent(event: WorkflowEvent): void {
  // Handle structural events
  switch (event.type) { ... }

  // Always forward to event stream
  this.events.next(event);
}
```

**Needs to become**:
```typescript
onEvent(event: WorkflowEvent): void {
  // NEW: Persist event if enabled
  if (this.persistEvents) {
    this.eventHistory.push(event);
  }

  // Handle structural events
  switch (event.type) { ... }

  // Always forward to event stream
  this.events.next(event);
}
```

## Integration Points

### 1. No Dependencies to Add

The persistence feature uses:
- Built-in `WorkflowEvent[]` array
- Existing `onEvent()` hook
- Standard file I/O (fs/promises)

**No external dependencies needed**.

### 2. File I/O Patterns

The codebase currently:
- Has **no existing file I/O** for persistence
- Uses JSON.stringify for serialization in cache layer
- Uses custom Observable (no RxJS)

**We need to introduce**:
- `fs/promises` for async file operations
- JSON serialization for event arrays
- Error handling for file operations

### 3. Testing Patterns

Existing tests in `src/__tests__/unit/tree-debugger.test.ts`:
- Use simple test workflow classes
- Verify event forwarding
- Test tree structure updates

**We should follow**:
- Same test workflow pattern
- Verify event history accumulation
- Test save/load operations
- Test with persistEvents disabled

## Potential Issues and Considerations

### 1. Memory Growth

Event history array grows unbounded:
- Consider adding max size limit
- Provide clearEventHistory() method
- Document memory implications

### 2. Circular References

WorkflowEvent contains WorkflowNode references:
- `event.node` has circular references (parent ↔ children)
- JSON.stringify will fail on circular references
- **Need serialization strategy** (see serialization research)

### 3. Performance Impact

Pushing to array on every event:
- O(1) operation, minimal overhead
- But could add up with high-frequency events
- Consider batching or sampling for production

### 4. Thread Safety

TypeScript is single-threaded:
- No race conditions on array operations
- But need to handle concurrent save/load calls
- Consider locking or queuing operations

## Existing Patterns to Follow

### 1. Private Method Pattern

```typescript
private buildNodeMap(node: WorkflowNode): void
private removeSubtreeNodes(nodeId: string): void
```

**Follow this** for persistence methods:
```typescript
private persistEvent(event: WorkflowEvent): void
```

### 2. Public API Pattern

```typescript
getTree(): WorkflowNode
getNode(id: string): WorkflowNode | undefined
```

**Follow this** for persistence API:
```typescript
getEventHistory(): WorkflowEvent[]
saveEventHistory(path: string): Promise<void>
```

### 3. Static Method Pattern

The codebase has static methods in several classes.

**Add static method**:
```typescript
static async loadEventHistory(path: string): Promise<WorkflowEvent[]>
```

### 4. Error Handling Pattern

From `Observable` implementation:
```typescript
try {
  subscriber.next?.(value);
} catch (err) {
  this.logError('Observable subscriber error', err);
}
```

**Follow this** for file operations:
```typescript
try {
  await writeFile(path, content);
} catch (err) {
  console.error('Failed to save event history', err);
  throw err;
}
```
