# Event-Driven State Machine Patterns and State Update Strategies

## Summary

Research findings on event-driven state machine patterns, reducer implementations, state accumulation strategies, and validation approaches for implementing node state event replay in Groundswell.

## 1. Reducer Pattern for State Updates

### 1.1 Basic Reducer Pattern

The reducer pattern is a pure function that takes current state and an event, then returns new state:

```typescript
type Reducer<S, E> = (state: S, event: E) => S;

interface StateSnapshotEvent {
  type: 'stateSnapshot';
  node: WorkflowNode;
}

interface ReplayerState {
  nodeMap: Map<string, WorkflowNode>;
  root: WorkflowNode | null;
}

const stateSnapshotReducer: Reducer<ReplayerState, StateSnapshotEvent> = (
  state,
  event
) => {
  const node = state.nodeMap.get(event.node.id);
  if (!node) {
    console.warn(`Node '${event.node.id}' not found`);
    return state;  // Return unchanged state
  }

  // Update node's stateSnapshot
  node.stateSnapshot = event.node.stateSnapshot;

  return state;  // Return updated state (mutable in this case)
};
```

### 1.2 Event Dispatch Pattern

```typescript
class WorkflowEventReplayer {
  replay(events: WorkflowEvent[]): WorkflowNode {
    const state: ReplayerState = {
      nodeMap: new Map(),
      root: null
    };

    for (const event of events) {
      this.dispatchEvent(state, event);
    }

    return state.root!;
  }

  private dispatchEvent(state: ReplayerState, event: WorkflowEvent): void {
    switch (event.type) {
      case 'stateSnapshot':
        this.handleStateSnapshot(state, event);
        break;
      case 'error':
        this.handleErrorEvent(state, event);
        break;
      case 'stepStart':
      case 'stepEnd':
        this.handleStepEvent(state, event);
        break;
      case 'taskStart':
      case 'taskEnd':
        this.handleTaskEvent(state, event);
        break;
      // Structural events handled separately
      case 'childAttached':
      case 'childDetached':
      case 'treeUpdated':
        // Skip or handle separately
        break;
      default:
        // Unknown event type - log and skip
        break;
    }
  }
}
```

### 1.3 Discriminated Union Type Narrowing

TypeScript's discriminated unions enable type-safe event handling:

```typescript
private handleStateSnapshot(
  state: ReplayerState,
  event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>
): void {
  // TypeScript knows event.node is WorkflowNode
  // TypeScript knows event.type is 'stateSnapshot'
  const node = state.nodeMap.get(event.node.id);
  if (!node) {
    console.warn(`Node '${event.node.id}' not found`);
    return;
  }

  node.stateSnapshot = event.node.stateSnapshot;
}
```

---

## 2. State Accumulation Patterns

### 2.1 Event Array Accumulation

Groundswell uses an append-only event array pattern:

```typescript
// Each node has an events array
interface WorkflowNode {
  id: string;
  name: string;
  events: WorkflowEvent[];  // Accumulates all events
  stateSnapshot: SerializedWorkflowState | null;
  // ... other fields
}

// During replay, accumulate events in the array
private handleErrorEvent(event: ErrorEvent): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) return;

  // Append error to events array
  node.events.push(event);
}
```

### 2.2 State Overwrite Pattern

State snapshots use last-write-wins semantics:

```typescript
// Event 1: stateSnapshot with { count: 1 }
// Event 2: stateSnapshot with { count: 2 }
// Event 3: stateSnapshot with { count: 3 }

// Result: stateSnapshot = { count: 3 } (last write wins)

private handleStateSnapshot(event: StateSnapshotEvent): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) return;

  // Overwrite with latest snapshot
  node.stateSnapshot = event.node.stateSnapshot;
}
```

### 2.3 Error Collection Pattern

Errors are accumulated, not overwritten:

```typescript
// Multiple errors can occur on same node
// Event 1: error with message "Error 1"
// Event 2: error with message "Error 2"
// Event 3: error with message "Error 3"

// Result: events array contains all 3 errors

private handleErrorEvent(event: ErrorEvent): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) return;

  // Accumulate errors (don't overwrite)
  node.events.push(event);

  // To find all errors for this node:
  // const errors = node.events.filter(e => e.type === 'error');
}
```

---

## 3. Timing and Duration Tracking

### 3.1 Step Timing Pattern

Step events track execution duration:

```typescript
// stepStart event marks beginning
interface StepStartEvent {
  type: 'stepStart';
  node: WorkflowNode;  // Step node
  step: string;
}

// stepEnd event marks completion with duration
interface StepEndEvent {
  type: 'stepEnd';
  node: WorkflowNode;  // Step node
  step: string;
  duration: number;  // Duration in milliseconds
}
```

### 3.2 Duration Calculation Pattern

```typescript
// In the step decorator (existing code)
const startTime = Date.now();
try {
  // Execute step logic
} finally {
  const duration = Date.now() - startTime;
  this.emitEvent({
    type: 'stepEnd',
    node: this.node,
    step: stepName,
    duration
  });
}
```

### 3.3 Replay-Time Duration Tracking

During replay, duration information is preserved in the event:

```typescript
private handleStepEnd(event: StepEndEvent): void {
  const node = this.nodeMap.get(event.node.id);
  if (!node) return;

  // Store the event with duration info
  node.events.push(event);

  // Duration is accessible via:
  // const stepEndEvents = node.events.filter(e => e.type === 'stepEnd');
  // stepEndEvents[0].duration
}
```

---

## 4. Error Accumulation Patterns

### 4.1 Error Event Structure

```typescript
interface ErrorEvent {
  type: 'error';
  node: WorkflowNode;
  error: WorkflowError;
}

interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // State at time of error
  logs: LogEntry[];                // Logs at time of error
}
```

### 4.2 Error Context Preservation

Errors capture rich context at time of failure:

```typescript
// When error occurs, capture current state and logs
this.emitEvent({
  type: 'error',
  node: this.node,
  error: {
    message: error instanceof Error ? error.message : 'Unknown error',
    original: error,
    workflowId: this.id,
    stack: error instanceof Error ? error.stack : undefined,
    state: getObservedState(this),  // Snapshot state at error time
    logs: [...this.node.logs]       // Copy logs at error time
  }
});
```

### 4.3 Error Aggregation Pattern

For advanced use cases, errors can be aggregated:

```typescript
// Find all errors in a tree
function collectErrors(node: WorkflowNode): ErrorEvent[] {
  const errors: ErrorEvent[] = [];

  // Add errors from this node
  const nodeErrors = node.events.filter(e => e.type === 'error') as ErrorEvent[];
  errors.push(...nodeErrors);

  // Recursively collect from children
  for (const child of node.children) {
    errors.push(...collectErrors(child));
  }

  return errors;
}
```

---

## 5. Validation Strategies for State Replay

### 5.1 Pre-Processing Validation

Validate events before processing:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class EventValidator {
  validateStateEvents(events: WorkflowEvent[]): ValidationResult {
    const errors: string[] = [];

    for (const event of events) {
      // Validate stateSnapshot events
      if (event.type === 'stateSnapshot') {
        if (!event.node?.id) {
          errors.push('stateSnapshot event missing node ID');
        }
        // stateSnapshot can be null (valid)
        // No additional validation needed
      }

      // Validate error events
      if (event.type === 'error') {
        if (!event.error?.message) {
          errors.push('error event missing message');
        }
        if (!event.error?.workflowId) {
          errors.push('error event missing workflowId');
        }
      }

      // Validate step events
      if (event.type === 'stepStart' || event.type === 'stepEnd') {
        if (!event.step) {
          errors.push(`${event.type} event missing step name`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 5.2 Post-Replay State Validation

Validate final tree state after replay:

```typescript
class StateValidator {
  validateNodeStates(root: WorkflowNode): StateValidationResult {
    const issues: StateIssue[] = [];

    this.validateNodeRecursive(root, issues);

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private validateNodeRecursive(node: WorkflowNode, issues: StateIssue[]): void {
    // Validate stateSnapshot type (if present)
    if (node.stateSnapshot !== null) {
      if (typeof node.stateSnapshot !== 'object') {
        issues.push({
          type: 'invalid-state',
          nodeId: node.id,
          message: 'stateSnapshot must be an object or null'
        });
      }
    }

    // Validate error events have required fields
    const errorEvents = node.events.filter(e => e.type === 'error');
    for (const errorEvent of errorEvents) {
      if (errorEvent.type === 'error') {
        if (!errorEvent.error.message) {
          issues.push({
            type: 'invalid-error',
            nodeId: node.id,
            message: 'error event missing message'
          });
        }
      }
    }

    // Recursively validate children
    for (const child of node.children) {
      this.validateNodeRecursive(child, issues);
    }
  }
}
```

### 5.3 Consistency Validation

Ensure state consistency across tree:

```typescript
class ConsistencyValidator {
  validateTreeConsistency(root: WorkflowNode): ConsistencyResult {
    const issues: ConsistencyIssue[] = [];

    // Check bidirectional parent-child links
    this.checkBidirectionalLinks(root, issues);

    // Check for cycles
    this.checkForCycles(root, issues);

    // Check single-parent rule
    this.checkSingleParentRule(root, issues);

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private checkBidirectionalLinks(node: WorkflowNode, issues: ConsistencyIssue[]): void {
    for (const child of node.children) {
      if (child.parent !== node) {
        issues.push({
          type: 'broken-link',
          nodeId: child.id,
          message: `Child ${child.id} parent reference doesn't point to actual parent ${node.id}`
        });
      }
      this.checkBidirectionalLinks(child, issues);
    }
  }

  private checkForCycles(node: WorkflowNode, issues: ConsistencyIssue[]): void {
    const visited = new Set<string>();

    function checkCycle(current: WorkflowNode): void {
      if (visited.has(current.id)) {
        issues.push({
          type: 'cycle',
          nodeId: current.id,
          message: `Circular reference detected at node ${current.id}`
        });
        return;
      }

      visited.add(current.id);

      for (const child of current.children) {
        checkCycle(child);
      }

      visited.delete(current.id);
    }

    checkCycle(node);
  }
}
```

---

## 6. Testing Patterns

### 6.1 State Update Tests

```typescript
describe('State Event Handlers', () => {
  test('handleStateSnapshot updates node state', () => {
    const replayer = new WorkflowEventReplayer();
    const node = createTestNode('node1');

    const event: StateSnapshotEvent = {
      type: 'stateSnapshot',
      node: { ...node, stateSnapshot: { count: 42 } }
    };

    replayer.handleStateSnapshot(event);

    expect(replayer.getNode('node1').stateSnapshot).toEqual({ count: 42 });
  });

  test('handleStateSnapshot overwrites existing state', () => {
    const replayer = new WorkflowEventReplayer();
    const node = createTestNode('node1');
    node.stateSnapshot = { count: 1 };

    const event: StateSnapshotEvent = {
      type: 'stateSnapshot',
      node: { ...node, stateSnapshot: { count: 99 } }
    };

    replayer.handleStateSnapshot(event);

    expect(replayer.getNode('node1').stateSnapshot).toEqual({ count: 99 });
  });

  test('handleStateSnapshot handles null snapshot', () => {
    const replayer = new WorkflowEventReplayer();
    const node = createTestNode('node1');
    node.stateSnapshot = { count: 1 };

    const event: StateSnapshotEvent = {
      type: 'stateSnapshot',
      node: { ...node, stateSnapshot: null }
    };

    replayer.handleStateSnapshot(event);

    expect(replayer.getNode('node1').stateSnapshot).toBeNull();
  });
});
```

### 6.2 Error Accumulation Tests

```typescript
describe('Error Event Handler', () => {
  test('handleErrorEvent adds error to events array', () => {
    const replayer = new WorkflowEventReplayer();
    const node = createTestNode('node1');

    const errorEvent: ErrorEvent = {
      type: 'error',
      node,
      error: {
        message: 'Test error',
        original: new Error('Test'),
        workflowId: 'node1',
        state: {},
        logs: []
      }
    };

    replayer.handleErrorEvent(errorEvent);

    const updatedNode = replayer.getNode('node1');
    expect(updatedNode.events).toHaveLength(1);
    expect(updatedNode.events[0].type).toBe('error');
  });

  test('multiple errors accumulate in events array', () => {
    const replayer = new WorkflowEventReplayer();
    const node = createTestNode('node1');

    const error1: ErrorEvent = {
      type: 'error',
      node,
      error: {
        message: 'Error 1',
        original: new Error('Error 1'),
        workflowId: 'node1',
        state: {},
        logs: []
      }
    };

    const error2: ErrorEvent = {
      type: 'error',
      node,
      error: {
        message: 'Error 2',
        original: new Error('Error 2'),
        workflowId: 'node1',
        state: {},
        logs: []
      }
    };

    replayer.handleErrorEvent(error1);
    replayer.handleErrorEvent(error2);

    const updatedNode = replayer.getNode('node1');
    expect(updatedNode.events).toHaveLength(2);

    const errors = updatedNode.events.filter(e => e.type === 'error');
    expect(errors).toHaveLength(2);
  });
});
```

### 6.3 Missing Node Tests

```typescript
describe('Missing Node Handling', () => {
  test('handleStateSnapshot logs warning for missing node', () => {
    const replayer = new WorkflowEventReplayer();
    const consoleSpy = jest.spyOn(console, 'warn');

    const event: StateSnapshotEvent = {
      type: 'stateSnapshot',
      node: createTestNode('nonexistent')
    };

    replayer.handleStateSnapshot(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent')
    );
  });

  test('handleErrorEvent logs warning for missing node', () => {
    const replayer = new WorkflowEventReplayer();
    const consoleSpy = jest.spyOn(console, 'warn');

    const errorEvent: ErrorEvent = {
      type: 'error',
      node: createTestNode('nonexistent'),
      error: {
        message: 'Test',
        original: null,
        workflowId: 'test',
        state: {},
        logs: []
      }
    };

    replayer.handleErrorEvent(errorEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent')
    );
  });
});
```

---

## References

### Groundswell Source Files

- `src/debugger/event-replayer.ts` - Main event replayer class
- `src/types/events.ts` - Event type definitions
- `src/types/workflow.ts` - WorkflowNode interface
- `src/types/error.ts` - WorkflowError interface
- `src/core/workflow.ts` - Event emission patterns
- `src/decorators/step.ts` - Step event patterns
- `src/decorators/task.ts` - Task event patterns
- `src/__tests__/helpers/tree-verification.ts` - Validation helpers

### External Resources

- [Redux Reducer Pattern](https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers)
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html)
- [State Machine Patterns](https://statecharts.github.io/)
