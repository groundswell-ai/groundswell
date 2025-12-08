# Groundswell Orchestration Framework - System Context

## Document Purpose
This document provides architectural context for the Agent/Prompt integration layer (PRD-002). It is the source of truth for implementing agents that understand their position within the existing Groundswell hierarchy.

---

## Current System Architecture (Phase 1 - Complete)

### Core Components

```
src/
├── core/
│   ├── workflow.ts      # Abstract Workflow base class with hierarchy
│   └── logger.ts        # WorkflowLogger with observer emission
├── decorators/
│   ├── step.ts          # @Step() - method instrumentation
│   ├── task.ts          # @Task() - child workflow spawning
│   └── observed-state.ts # @ObservedState() - field state tracking
├── debugger/
│   └── tree-debugger.ts # WorkflowTreeDebugger - visualization
├── types/
│   ├── workflow.ts      # WorkflowNode, WorkflowStatus
│   ├── events.ts        # WorkflowEvent discriminated union
│   ├── observer.ts      # WorkflowObserver interface
│   ├── logging.ts       # LogEntry, LogLevel
│   ├── snapshot.ts      # SerializedWorkflowState
│   └── error.ts         # WorkflowError with context
└── utils/
    ├── observable.ts    # Zero-dependency Observable<T>
    └── id.ts            # generateId() utility
```

### Hierarchy Patterns

1. **Parent-Child Relationships**
   - `Workflow.parent: Workflow | null`
   - `Workflow.children: Workflow[]`
   - Automatic attachment via constructor `parent` parameter

2. **Node Mirroring**
   - Every `Workflow` instance has a `WorkflowNode` representation
   - Nodes form a parallel tree for serialization/inspection
   - `getNode()` returns the node representation

3. **Observer Pattern**
   - Observers attach to ROOT workflow only
   - Events propagate from any workflow to root observers
   - `WorkflowObserver` interface: `onLog`, `onEvent`, `onStateUpdated`, `onTreeChanged`

4. **Event System**
   - Discriminated union: `WorkflowEvent`
   - Current types: `childAttached`, `stateSnapshot`, `stepStart`, `stepEnd`, `error`, `taskStart`, `taskEnd`, `treeUpdated`
   - Events stored in `node.events[]` and emitted to observers

---

## Where Agent/Prompt Layer Fits

### New Directory Structure (Phase 2)

```
src/
├── core/
│   ├── workflow.ts      # (existing)
│   ├── logger.ts        # (existing)
│   ├── agent.ts         # NEW: Agent class wrapping Anthropic SDK
│   ├── prompt.ts        # NEW: Prompt<T> class with Zod schema
│   └── context.ts       # NEW: WorkflowContext for step/spawnWorkflow
├── decorators/          # (existing - may extend for agent methods)
├── debugger/            # (existing)
├── cache/
│   ├── cache.ts         # NEW: Cache interface + LRU implementation
│   └── cache-key.ts     # NEW: SHA-256 key generation
├── reflection/
│   └── reflection.ts    # NEW: ReflectionAPI at all three levels
├── tools/
│   └── introspection.ts # NEW: Standard agent tools for hierarchy inspection
├── types/
│   ├── (existing types)
│   ├── agent.ts         # NEW: AgentConfig, PromptOverrides
│   ├── prompt.ts        # NEW: PromptConfig<T>
│   ├── cache.ts         # NEW: Cache interface
│   └── introspection.ts # NEW: Tool definitions
└── utils/               # (existing)
```

### Integration Points

1. **Agent as Workflow Participant**
   - Agents execute WITHIN workflow steps
   - Agent prompt executions appear as events in the workflow tree
   - Agent can spawn workflows dynamically

2. **Event Tree Extension**
   - New event types: `agentPromptStart`, `agentPromptEnd`, `toolInvocation`, `mcpEvent`, `reflectionStart`, `reflectionEnd`
   - Events attach to current workflow node automatically

3. **Hierarchy Mounting**
   - When `agent.prompt()` is called inside a workflow step:
     - Create event node under current step
     - Track tool/MCP events as children
     - Propagate completion back up

---

## Key Implementation Constraints

### 1. Zero-Plumbing Mounting (PRD Requirement)
Current pattern to maintain:
```typescript
// Constructor automatically attaches to parent
constructor(name?: string, parent?: Workflow) {
  // ...
  if (parent) {
    parent.attachChild(this);
  }
}
```
New classes MUST follow this pattern - no manual tree assembly.

### 2. Observer Propagation
All new events MUST propagate to root observers:
```typescript
// Existing pattern in Workflow class
protected emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);
  const observers = this.getRootObservers();
  for (const obs of observers) {
    obs.onEvent(event);
  }
}
```

### 3. State Snapshot Integration
Use existing `@ObservedState()` decorator pattern for Agent/Prompt state tracking.

### 4. Anthropic SDK Pass-Through
All SDK properties (`tools`, `mcps`, `skills`, `hooks`, `env`) MUST pass through unchanged. No custom abstractions.

---

## Architectural Decisions

### Decision 1: Agent is NOT a Workflow Subclass
**Rationale**: Agents execute prompts; they don't have their own lifecycle. Agents are lightweight wrappers around the Anthropic SDK.

**Pattern**:
```typescript
class Agent {
  prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
  reflect<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
}
```

### Decision 2: Prompts are Immutable Value Objects
**Rationale**: Prompts define what to send; they don't execute. Execution happens via `Agent.prompt()`.

**Pattern**:
```typescript
class Prompt<T> {
  readonly user: string;
  readonly data: Record<string, any>;
  readonly responseFormat: ZodSchema<T>;
  // ...other readonly fields
}
```

### Decision 3: WorkflowContext Provides step() and spawnWorkflow()
**Rationale**: PRD requires `step()` callable anywhere in JS control flow. Context pattern allows this.

**Pattern**:
```typescript
interface WorkflowContext {
  workflowId: string;
  parentWorkflowId?: string;
  step(name: string, fn: () => Promise<any>): Promise<any>;
  spawnWorkflow(wf: Workflow): Promise<any>;
  eventTree: EventTreeHandle;
  reflection: ReflectionAPI;
}
```

### Decision 4: Cache Key is Deterministic SHA-256
**Rationale**: PRD specifies exact fields for cache key. Use crypto.subtle for browser compat.

**Fields**:
- user message
- data
- system value
- model settings
- temperature
- tools (hashed)
- mcps (hashed)
- skills (hashed)
- schema version/hash

---

## File Path References for Implementers

| Concept | File Path | Purpose |
|---------|-----------|---------|
| Workflow base | `/src/core/workflow.ts` | Abstract base class, hierarchy management |
| Event types | `/src/types/events.ts` | WorkflowEvent discriminated union |
| Node structure | `/src/types/workflow.ts` | WorkflowNode interface |
| Observer interface | `/src/types/observer.ts` | WorkflowObserver contract |
| State decorator | `/src/decorators/observed-state.ts` | @ObservedState, getObservedState |
| Step decorator | `/src/decorators/step.ts` | @Step() pattern to replicate |
| ID generation | `/src/utils/id.ts` | generateId() function |
| Observable | `/src/utils/observable.ts` | Zero-dep Observable<T> |
| Logger | `/src/core/logger.ts` | WorkflowLogger pattern |
| Debugger | `/src/debugger/tree-debugger.ts` | WorkflowTreeDebugger reference |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.1",
    "zod": "^3.23.0"
  }
}
```

**Note**: Use Zod v3.x (not v4.x) for stability. The SDK compatibility has been verified with v3.

---

## Next Steps for PRP Implementation

1. Add dependencies to package.json
2. Implement Agent class (src/core/agent.ts)
3. Implement Prompt class (src/core/prompt.ts)
4. Extend WorkflowEvent union with agent events
5. Implement Cache layer
6. Implement Reflection API
7. Implement Introspection tools
8. Create 10 canonical examples
