# Hierarchical Workflow Engine - System Context

## Overview

The Hierarchical Workflow Engine is a TypeScript-based framework for building composable, observable workflows with decorators, event systems, and tree-based debugging. The implementation is production-ready with 154 passing tests and excellent PRD compliance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     WORKFLOW ENGINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │  Decorators  │      │   Core       │      │   Events     │   │
│  │              │      │              │      │              │   │
│  │ • @Step      │─────▶│ • Workflow   │─────▶│ • Emit/      │   │
│  │ • @Task      │      │ • Context    │      │   Subscribe  │   │
│  │ • @Observed  │      │ • Logger     │      │              │   │
│  │   State      │      │              │      │              │   │
│  └──────────────┘      └──────────────┘      └──────────────┘   │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │    Tree      │      │   Debugger   │      │   Types      │   │
│  │              │      │              │      │              │   │
│  │ • Structure  │─────▶│ • Traversal  │─────▶│ • Interfaces │   │
│  │ • Mirroring  │      │ • Query      │      │ • Enums      │   │
│  │ • Rebuild    │      │ • Visualize  │      │              │   │
│  └──────────────┘      └──────────────┘      └──────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Workflow Class (`src/core/workflow.ts`)
- **Purpose**: Base class for all workflows
- **Key Methods**:
  - `run()`: Execute workflow logic
  - `attachChild()`: Attach child workflow
  - `setStatus()`: Update workflow status
  - `getRoot()`: Traverse to root workflow
  - `snapshotState()`: Capture current state
- **Pattern**: Class-based inheritance with decorator support

### 2. Workflow Context (`src/core/workflow-context.ts`)
- **Purpose**: Functional workflow alternative to class-based approach
- **Key Methods**:
  - `step()`: Execute step with reflection
  - `task()`: Execute child workflows
  - `prompt()`: Agent prompt integration
- **Pattern**: Functional composition with context propagation

### 3. Decorators (`src/decorators/`)
- **@Step**: Wrap method execution with timing, error handling, state capture
- **@Task**: Attach and execute child workflows (sequential or concurrent)
- **@ObservedState**: Mark fields for state serialization
- **Pattern**: Decorator factory pattern with options

### 4. Event System (`src/types/events.ts`)
- **Event Types**: childAttached, stateSnapshot, stepStart/End, error, treeUpdated, etc.
- **Pattern**: Pub/sub with observer notification
- **Usage**: `emitEvent()` + Observer callbacks

### 5. Observer Pattern (`src/types/observer.ts`)
- **Interface**: `onLog()`, `onEvent()`, `onStateUpdated()`, `onTreeChanged()`
- **Pattern**: Attach to root workflow, receive all tree events
- **Safety**: Observer errors are caught and logged

### 6. Tree Debugger (`src/debugger/tree-debugger.ts`)
- **Purpose**: Visualize and query workflow tree structure
- **Features**:
  - `toTreeString()`: Render tree as text
  - `findNodeById()`: Query by ID
  - `rebuild()`: Update tree on changes
- **Pattern**: Mirror tree structure from WorkflowNodes

## Data Flow

### Workflow Execution Flow
```
User calls workflow.run()
        ↓
@Step decorator intercepts
        ↓
Emit stepStart event
        ↓
Execute method logic
        ↓
Capture state via @ObservedState
        ↓
Emit stepEnd event (with timing)
        ↓
Return result
```

### Error Handling Flow
```
Error thrown in method
        ↓
@Step catch block
        ↓
Capture state: getObservedState(this)
        ↓
Capture logs: [...wf.node.logs]
        ↓
Create WorkflowError object
        ↓
Emit error event
        ↓
Observers notified
        ↓
Workflow status → 'failed'
```

### Tree Update Flow
```
Workflow state changes
        ↓
Emit treeUpdated event
        ↓
Root observers notified
        ↓
Observer.onTreeChanged(root)
        ↓
TreeDebugger.rebuild()
        ↓
Internal node map updated
```

## Key Patterns

### 1. State Serialization
```typescript
// Decorator marks fields for serialization
@ObservedState({ redact: ['apiKey'] })
private apiKey: string;

// Reflection captures state
const state = getObservedState(workflowInstance);
```

### 2. Error Context Capture
```typescript
// Correct pattern (from @Step decorator)
const snap = getObservedState(this as object);
const workflowError: WorkflowError = {
  state: snap,              // ✅ Captured
  logs: [...wf.node.logs],  // ✅ Captured
  // ... other fields
};
```

### 3. Event Emission
```typescript
this.emitEvent({
  type: 'stepEnd',
  node: this.node,
  step: stepName,
  duration: endTime - startTime,
});
```

### 4. Observer Attachment
```typescript
const debugger = new TreeDebugger();
workflow.attachObserver(debugger);
// Observers attach to root, receive all tree events
```

## Type System

### Core Interfaces
- **WorkflowNode**: Tree node representation
- **WorkflowEvent**: Discriminated union of all event types
- **WorkflowError**: Error with state snapshot and logs
- **WorkflowObserver**: Observer interface
- **SerializedWorkflowState**: JSON-serializable state

### Enums
- **WorkflowStatus**: 'idle' | 'running' | 'completed' | 'failed'

## Testing Strategy

### Test Structure
- **Unit Tests**: 128 tests in `src/__tests__/unit/`
- **Integration Tests**: 26 tests in `src/__tests__/integration/`
- **Total**: 154 passing, 0 failing (edge-cases.test.ts does not exist)

### Coverage Areas
- ✅ Decorator functionality (@Step, @Task, @ObservedState)
- ✅ Workflow lifecycle (idle → running → completed/failed)
- ✅ Parent-child relationships
- ✅ Observer pattern
- ✅ Tree debugging
- ✅ Error handling
- ✅ Event emission
- ⚠️ Cycle detection (missing)
- ⚠️ Concurrent error merging (missing)

## Known Issues (From Bug Report)

### Major Issues
1. **Missing `treeUpdated` events**: Event type defined but never emitted
2. **Empty state/logs in functional errors**: `{}` and `[]` instead of captured data
3. **No error merge strategy**: Type exists but unused
4. **No cycle detection**: `getRoot()` can infinite loop

### Minor Issues
5. **Lenient @Task validation**: Silently skips non-Workflow returns
6. **Undocumented trackTiming default**: Default is `true`, not `false`
7. **No duplicate attachment check**: Can attach same child twice
8. **Underutilized parentLogId**: Hierarchical logging not exposed
9. **Steps not in tree**: Step nodes are events, not tree nodes

## Dependencies

### Runtime
- TypeScript 5.x
- No external runtime dependencies (vanilla TS/JS)

### Development
- Vitest: Testing framework
- tsx: TypeScript execution
- type-fest: Type utilities

## File Organization

```
src/
├── core/
│   ├── workflow.ts          # Main Workflow class
│   ├── workflow-context.ts  # Functional workflow context
│   ├── event-tree.ts        # Event tree builder
│   ├── logger.ts            # Logging system
│   └── context.ts           # AsyncLocalStorage context
├── decorators/
│   ├── step.ts              # @Step decorator
│   ├── task.ts              # @Task decorator
│   └── observed-state.ts    # @ObservedState decorator
├── debugger/
│   └── tree-debugger.ts     # Tree visualization
├── types/
│   ├── workflow.ts          # Core interfaces
│   ├── events.ts            # Event types
│   ├── observer.ts          # Observer interface
│   ├── error.ts             # WorkflowError interface
│   ├── decorators.ts        # Decorator options
│   └── error-strategy.ts    # Error merge types
└── __tests__/
    ├── unit/                # Unit tests (11 files)
    └── integration/         # Integration tests (2 files)
```

## Implementation Guidelines

### When Fixing Bugs:
1. **Follow existing patterns**: Look at @Step decorator for error handling
2. **Maintain type safety**: No `as any` casts
3. **Emit events**: State changes should emit events
4. **Test first**: Write failing test, then fix
5. **Observer safety**: Wrap observer callbacks in try-catch

### When Adding Features:
1. **Define types first**: Interfaces in `src/types/`
2. **Add event types**: If state changes, emit event
3. **Update observers**: Notify observers of changes
4. **Write tests**: Unit + integration coverage
5. **Document**: Update README with examples

## Critical Constraints

1. **NO Breaking Changes**: Existing APIs must remain stable
2. **Type Safety**: Full TypeScript compilation required
3. **Test Coverage**: All fixes must have tests
4. **Observer Isolation**: Observer errors must not crash workflows
5. **Tree Consistency**: Parent-child relationships must stay synchronized

## Reference Implementations

### Correct Error Handling
```typescript
// src/decorators/step.ts (lines 109-134)
catch (err: unknown) {
  const error = err as Error;
  const snap = getObservedState(this as object);

  const workflowError: WorkflowError = {
    message: error?.message ?? 'Unknown error',
    original: err,
    workflowId: wf.id,
    stack: error?.stack,
    state: snap,                        // ✅ CORRECT
    logs: [...wf.node.logs] as LogEntry[], // ✅ CORRECT
  };

  wf.emitEvent({ type: 'error', node: wf.node, error: workflowError });
  throw workflowError;
}
```

### Correct Event Emission
```typescript
// src/decorators/step.ts (lines 94-101)
if (opts.trackTiming !== false) {
  wf.emitEvent({
    type: 'stepEnd',
    node: wf.node,
    step: stepName,
    duration,
  });
}
```

### Correct Observer Notification
```typescript
// src/core/logger.ts (lines 23-29)
for (const obs of observers) {
  try {
    obs.onLog(entry);
  } catch (err) {
    // Observer errors don't crash the system
    console.error('Observer error:', err);
  }
}
```

## Performance Considerations

1. **Timing Overhead**: `trackTiming` adds timestamp capture overhead
2. **State Serialization**: `getObservedState()` uses reflection (cache if needed)
3. **Observer Notification**: Observers are notified synchronously (keep callbacks fast)
4. **Tree Rebuild**: TreeDebugger.rebuild() walks entire tree (call only when needed)

## Security Considerations

1. **Cycle Detection**: Missing - could cause DoS (Issue #4)
2. **Input Validation**: Decorators validate workflow objects
3. **Error Information**: Errors may contain sensitive data in `state` (use `redact` option)
4. **Observer Isolation**: Observer errors are caught (no crash escalation)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-10
**Maintained By**: Architecture Team
