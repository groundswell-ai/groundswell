# Time-Travel Debugging Integration for WorkflowTreeDebugger

## Overview

This document outlines the integration of `WorkflowEventReplayer` with `WorkflowTreeDebugger` to enable time-travel debugging capabilities.

## Contract Definition Analysis

From the work item P2.M1.T2.S2:

**INPUT:**
- Saved event JSON file
- `WorkflowEventReplayer` class (from P2.M1.T1)
- `WorkflowTreeDebugger` class (with persistence from P2.M1.T2.S1)

**LOGIC:**
- Add static method `WorkflowTreeDebugger.replay(path: string): WorkflowTreeDebugger`
- Loads events from file
- Replays using `WorkflowEventReplayer`
- Returns new debugger instance with reconstructed tree
- Debugger is read-only (no live workflow attached)

**OUTPUT:**
- Time-travel debugging API: `WorkflowTreeDebugger.replay('workflow-events.json')`

## WorkflowEventReplayer Integration

### Replayer Output Analysis

From `src/debugger/event-replayer.ts`:
```typescript
export class WorkflowEventReplayer {
  replay(events: WorkflowEvent[]): WorkflowNode {
    // ... processing ...
    return this.root; // Returns reconstructed tree root
  }
}
```

**Key Points:**
- `replay()` returns `WorkflowNode` (the tree root)
- Replayer maintains `nodeMap` internally during replay
- Replayer throws if events array is empty or root cannot be established
- All tree invariants maintained (single-parent, bidirectional refs, no cycles)

### Event Type Compatibility

The replayer handles these event types:
- **Structural:** `childAttached`, `childDetached`, `treeUpdated`
- **State:** `stateSnapshot`, `error`
- **Tracking:** `stepStart`, `stepEnd`, `taskStart`, `taskEnd`

**Compatibility with loadEventHistory():**
- `loadEventHistory()` returns `unknown[]` (from P2.M1.T2.S1)
- `replay()` expects `WorkflowEvent[]`
- Need type assertion: `events as WorkflowEvent[]`

### Data Flow

```
JSON File (saved events)
    ↓
loadEventHistory(path) → unknown[]
    ↓
Type assertion → WorkflowEvent[]
    ↓
WorkflowEventReplayer.replay(events) → WorkflowNode
    ↓
Create WorkflowTreeDebugger instance
    ↓
Return read-only debugger
```

## Read-Only Debugger Architecture

### What "Read-Only" Means

A replay-created debugger differs from a live debugger:

| Aspect | Live Debugger | Replay Debugger |
|--------|--------------|-----------------|
| Workflow attached | Yes (observer registered) | No |
| Event source | Live from workflow | None (historical) |
| Tree state | Updates in real-time | Frozen at replay point |
| Event accumulation | Optional (persistEvents) | No (read-only) |
| Observer callbacks | Active (onEvent, onLog) | Inactive |
| Rendering | Real-time updates | Historical snapshot |

### Implementation Approach

```typescript
static async replay(path: string): Promise<WorkflowTreeDebugger> {
  // Step 1: Load events from file
  const events = await WorkflowTreeDebugger.loadEventHistory(path);

  // Step 2: Create replayer instance
  const replayer = new WorkflowEventReplayer();

  // Step 3: Replay events to reconstruct tree
  const root = replayer.replay(events as WorkflowEvent[]);

  // Step 4: Create debugger instance without calling constructor
  const instance = Object.create(WorkflowTreeDebugger.prototype) as WorkflowTreeDebugger;

  // Step 5: Initialize instance properties
  instance.root = root;
  instance.events = new Observable<WorkflowEvent>();
  instance.nodeMap = new Map();
  instance.buildNodeMap(root);
  instance.eventHistory = [];
  instance.persistEvents = false;
  instance.maxEventHistorySize = undefined;

  return instance;
}
```

### Property Initialization Details

```typescript
// Required properties from WorkflowTreeDebugger
instance.root = root;  // Reconstructed tree from replayer

// Event stream (empty, won't receive new events)
instance.events = new Observable<WorkflowEvent>();

// Node lookup map (built from reconstructed tree)
instance.nodeMap = new Map();
instance.buildNodeMap(root); // Reuse existing private method

// Event history (empty, read-only mode)
instance.eventHistory = [];
instance.persistEvents = false;
instance.maxEventHistorySize = undefined;
```

## Error Handling Strategy

### Error Sources

1. **File not found:** `loadEventHistory()` throws with message
2. **Invalid JSON:** `loadEventHistory()` throws with message
3. **Empty events:** `replay()` throws "Events array is empty"
4. **Replay failure:** `replay()` throws "No root node established"

### Error Propagation

```typescript
static async replay(path: string): Promise<WorkflowTreeDebugger> {
  try {
    // Load events (may throw ENOENT, EACCES, SyntaxError)
    const events = await WorkflowTreeDebugger.loadEventHistory(path);

    // Create replayer
    const replayer = new WorkflowEventReplayer();

    // Replay (may throw for empty events or missing root)
    const root = replayer.replay(events as WorkflowEvent[]);

    // Create instance
    const instance = Object.create(WorkflowTreeDebugger.prototype) as WorkflowTreeDebugger;
    // ... initialize properties ...

    return instance;
  } catch (error) {
    // Re-throw with context about replay operation
    throw new Error(`Failed to create debugger from event history: ${error.message}`);
  }
}
```

### Descriptive Error Messages

Ensure errors are actionable:
- File not found: Check file path
- Invalid JSON: Fix JSON format
- Empty events: File has no event data
- Replay failure: Events don't form valid tree

## API Design Considerations

### Method Signature

**Contract specified:** `static replay(path: string): WorkflowTreeDebugger`

But since file I/O is async, should be:
```typescript
static async replay(path: string): Promise<WorkflowTreeDebugger>
```

### Method Naming

Alternative naming options considered:
- `replay()` - ✓ Contract specified, clear intent
- `fromFile()` - Less clear about replay
- `load()` - Too generic
- `fromEventHistory()` - More verbose

**Decision:** Use `replay()` as specified in contract.

### Return Type

Returns `WorkflowTreeDebugger` instance with:
- Same public API as live debugger
- Read-only semantics (no live workflow)
- All visualization methods work
- Statistics and logging methods work

## Use Cases

### 1. Post-Mortem Debugging

```typescript
// Production workflow failed
// Load saved events for analysis
const debugger = await WorkflowTreeDebugger.replay('./production-run.json');

// Inspect tree structure
console.log(debugger.toTreeString());

// Check error states
const stats = debugger.getStats();
console.log(`Failed nodes: ${stats.byStatus.failed}`);

// Find specific node
const failedNode = debugger.getNode('workflow-123');
console.log(failedNode?.stateSnapshot);
```

### 2. Performance Analysis

```typescript
// Replay long-running workflow
const debugger = await WorkflowTreeDebugger.replay('./long-run.json');

// Analyze step durations
const tree = debugger.getTree();
// Walk tree and collect step events
// Calculate durations, identify bottlenecks
```

### 3. Test Validation

```typescript
// Save events from test run
const testDebugger = new WorkflowTreeDebugger(testWorkflow, { persistEvents: true });
await testWorkflow.run();
await testDebugger.saveEventHistory('./test-baseline.json');

// Later: Validate against baseline
const baseline = await WorkflowTreeDebugger.replay('./test-baseline.json');
// Compare tree structure, states, etc.
```

### 4. Collaboration

```typescript
// Share event files between team members
// Anyone can replay and analyze:
const debugger = await WorkflowTreeDebugger.replay('./shared-events.json');

// Export analysis report
const report = {
  tree: debugger.toTreeString(),
  stats: debugger.getStats(),
  logs: debugger.toLogString(),
};
```

## Testing Considerations

### Test Data Structure

```typescript
// Test fixture: sample event file
const sampleEvents = [
  { type: 'treeUpdated', root: { id: 'wf-1', name: 'TestWorkflow', ... } },
  { type: 'stateSnapshot', node: { id: 'wf-1', ... } },
  // ... more events
];
```

### Test Scenarios

1. **Happy path:** Valid file, valid events, successful replay
2. **File errors:** Missing file, permission denied, invalid JSON
3. **Event errors:** Empty array, invalid structure, missing root
4. **Replay errors:** Events don't form valid tree
5. **Read-only verification:** No event accumulation, no observer methods called

## Performance Considerations

### Large Event Files

- Event files can be large (thousands of events)
- Replay time is O(n) where n = number of events
- Memory usage is O(m) where m = number of nodes

### Optimization Opportunities

- **Streaming:** Could stream events for very large files
- **Snapshots:** Could skip to last snapshot if available
- **Caching:** Could cache replayed trees

**Current scope:** Synchronous replay is acceptable for initial implementation.

## References

- Event Sourcing Pattern: https://martinfowler.com/eaaDev/EventSourcing.html
- Memento Pattern: https://refactoring.guru/design-patterns/memento
- Time-Travel Debugging: https://en.wikipedia.org/wiki/Time_travel_debugging
