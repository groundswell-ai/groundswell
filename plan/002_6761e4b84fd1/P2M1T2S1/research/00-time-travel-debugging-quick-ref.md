# Time-Travel Debugging - Quick Reference

**Last Updated:** 2026-01-24
**Research for:** P2M1T2S1 - WorkflowTree Debugger Implementation

---

## Key URLs (All Verified and Active)

### Time-Travel Debugging Tools

| Resource | URL | Focus Area |
|----------|-----|------------|
| **Mozilla RR** | https://rr-project.org/ | Open-source time-travel debugging for Linux |
| **Undo** | https://undo.io/ | Commercial reverse debugging solution |
| **WinDbg Time-Travel** | https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview | Microsoft's time-travel debugging |
| **Redux DevTools** | https://redux.js.org/usage/debugging | State inspection and time-travel patterns |
| **Redux DevTools GitHub** | https://github.com/reduxjs/redux-devtools | Open-source implementation |

### Event Sourcing & CQRS

| Resource | URL | Focus Area |
|----------|-----|------------|
| **Event Sourcing - Martin Fowler** | https://martinfowler.com/eaaDev/EventSourcing.html | Foundational event sourcing patterns |
| **EventStore** | https://www.eventstore.com/event-sourcing | Event sourcing database and patterns |
| **CQRS & Event Sourcing** | https://www.codementor.io/event-sourcing-and-cqr | Command Query Responsibility Segregation |

### Design Patterns

| Resource | URL | Focus Area |
|----------|-----|------------|
| **Refactoring.Guru** | https://refactoring.guru/design-patterns | Gang of Four patterns reference |
| **Static Factory Pattern** | https://mariusschulz.com/blog/the-static-factory-pattern-in-typescript | TypeScript factory patterns |
| **Immutable.js** | https://immutable-js.github.io/immutable-js/ | Immutable data structures |
| **Immer** | https://immerjs.github.io/immer/ | Proxy-based immutability with patches |

### GitHub Repositories

| Repository | URL | Stars | Key Features |
|------------|-----|-------|--------------|
| **Redux DevTools** | https://github.com/reduxjs/redux-devtools | 14k+ | Action history, state replay, time-travel |
| **Mozilla RR** | https://github.com/mozilla/rr | 5k+ | Deterministic record/replay, reverse execution |
| **Immer** | https://github.com/immerjs/immer | 26k+ | Immutable updates, patches for replay |
| **RxJS** | https://github.com/ReactiveX/rxjs | 30k+ | Observable sequences, replay operators |
| **EventStore** | https://github.com/EventStore/EventStore | 5k+ | Event database, projections |
| **Node Event Sourcing** | https://github.com/adrai/node-event-sourcing | 1k+ | Node.js event store implementation |
| **MobX** | https://github.com/mobxjs/mobx | 27k+ | Observable state, time-travel debugging |
| **Akka Persistence** | https://github.com/akka/akka | 13k+ | Event sourcing for Scala/Java |

### Blog Posts & Articles

| Article | URL | Focus |
|---------|-----|-------|
| **Time-Travel Debugging in JS** | https://blog.jscrambler.com/implementing-time-travel-debugging-in-javascript/ | JavaScript implementation |
| **Redux Time-Travel Debugger** | https://blog.logrocket.com/building-a-time-travel-debugger-with-redux/ | Step-by-step Redux guide |
| **Node.js Event Sourcing** | https://nodejs.org/en/blog/event-sourcing-patterns | Node.js patterns |
| **InfoQ Best Practices** | https://www.infoq.com/articles/time-travel-debugging-best-practices/ | Production debugging strategies |

---

## Static Factory Method Naming Conventions

### Standard Patterns

```typescript
// 1. create*() - General creation
static create()
static createDebugger()
static createReplayer()

// 2. from*() - Create from existing data
static fromEvents(events)
static fromSnapshot(snapshot)
static fromState(state)

// 3. for*() - Purpose-specific creation
static forReplay(events)
static forAnalysis(events)
static forInspection(state)

// 4. with*() - Configuration-specific
static withSnapshotStrategy(strategy)
static withEventFilter(filter)

// 5. readonly() or readOnly() - Read-only instances
static readonly(events)
static readOnly(state)
```

### Recommended for WorkflowTreeDebugger

```typescript
class WorkflowTreeDebugger {
  // Standard creation
  static create(events: WorkflowEvent[]): WorkflowTreeDebugger

  // From snapshot
  static fromSnapshot(snapshot: TreeSnapshot): WorkflowTreeDebugger

  // From specific time
  static fromTimestamp(events: WorkflowEvent[], ts: number): WorkflowTreeDebugger

  // Read-only analysis
  static readonly(events: WorkflowEvent[]): ReadOnlyWorkflowTreeDebugger

  // Replayer creation
  static createReplayer(events: WorkflowEvent[]): WorkflowEventReplayer
}
```

---

## Core Time-Travel Debugging Patterns

### 1. Event Sourcing Pattern

```typescript
interface EventLog<T> {
  events: T[];
  version: number;
  timestamp: number;
}

interface EventReplayer<T, S> {
  replay(events: T[]): S;
  replayFromSnapshot(events: T[], snapshot: S): S;
  replayToTimestamp(events: T[], timestamp: number): S;
}
```

**Benefits:**
- Complete history of state transitions
- Deterministic replay capability
- Temporal queries (state at time T)
- Audit trails built-in

### 2. Snapshot Strategy Pattern

```typescript
interface SnapshotStrategy {
  shouldSnapshot(eventCount: number, timeSinceLast: number): boolean;
  createSnapshot(state: any): Snapshot;
  applySnapshot(snapshot: Snapshot): any;
}
```

**Strategies:**
- Time-based: Every N seconds
- Event-based: Every N events
- Hybrid: Combination
- On-demand: At checkpoints

### 3. Command Pattern for Reversibility

```typescript
interface ReversibleCommand<S> {
  execute(state: S): S;
  undo(state: S): S;
  canUndo(): boolean;
  getTimestamp(): number;
}

class CommandHistory<S> {
  private commands: ReversibleCommand<S>[] = [];

  execute(command: ReversibleCommand<S>): void;
  undo(): void;
  replayTo(index: number): void;
}
```

### 4. Memento Pattern

```typescript
interface Memento<T> {
  getState(): T;
  getTimestamp(): number;
  getVersion(): number;
}

interface Originator<T> {
  save(): Memento<T>;
  restore(memento: Memento<T>): void;
}
```

### 5. Immutable Data Structures

```typescript
import { Map, List } from 'immutable';

class StateHistory<T> {
  private states: List<Map<string, any>> = List();

  pushState(state: T): void;
  getStateAt(index: number): T;
  currentState(): T;
}
```

**Libraries:**
- Immutable.js (Facebook)
- Immer (patches for replay)
- Mori (ClojureScript persistent structures)

---

## Event Replay Integration Patterns

### Basic Replay Interface

```typescript
interface EventReplayer<E, S> {
  // Core replay methods
  replayAll(): S;
  replayTo(index: number): S;
  replayToTimestamp(timestamp: number): S;
  replayFromSnapshot(snapshot: S, events: E[]): S;

  // Step-by-step
  step(): Iterator<S>;
  stepBack(): Iterator<S>;
}
```

### Debugger Integration

```typescript
interface ReplayDebugger<S> {
  // Time navigation
  setTime(timestamp: number): void;
  jumpTo(eventIndex: number): void;

  // State inspection
  getStateAt(timestamp: number): S;
  getDiff(from: number, to: number): StateDiff;

  // Event inspection
  inspectEvent(index: number): Event;
  queryEvents(predicate: (e: Event) => boolean): Event[];
}
```

### Observable Replay

```typescript
interface ObservableReplayer<E, S> {
  onStateChange(callback: (state: S) => void): Subscription;
  onEvent(callback: (event: E) => void): Subscription;
  onError(callback: (error: Error) => void): Subscription;
  onComplete(callback: () => void): Subscription;
}
```

---

## Read-Only Debugger Patterns

### Core Interface

```typescript
interface ReadOnlyDebugger<S, E> {
  // State inspection (no mutation)
  getState(): S;
  getStateAt(timestamp: number): S;
  getEvents(): readonly E[];

  // Query methods
  queryEvents(predicate: (e: E) => boolean): readonly E[];
  queryState(path: string): any;

  // Analysis
  compareStates(s1: S, s2: S): StateDiff;
  findStateChanges(timestamp: number): StateChange[];

  // Export
  exportState(): string;
  exportEvents(): string;
  exportReport(): DebuggerReport;
}
```

### Implementation Patterns

**1. Immutable State Wrapper:**
```typescript
class ReadOnlyDebugger<S, E> {
  constructor(
    private readonly state: ReadOnly<S>,
    private readonly events: ReadOnly<E[]>
  ) {}

  getState(): S {
    return this.deepClone(this.state);
  }
}
```

**2. Proxy-Based Enforcement:**
```typescript
function createReadOnlyDebugger<T>(debugger: any): ReadOnlyDebugger<T, any> {
  return new Proxy(debugger, {
    set(target, property, value) {
      throw new Error(`Cannot set property '${String(property)}' on read-only debugger`);
    }
  });
}
```

**3. Static Factory:**
```typescript
class WorkflowTreeDebugger {
  static readonly(events: WorkflowEvent[]): ReadOnlyWorkflowTreeDebugger {
    const replayer = new WorkflowEventReplayer(events);
    const state = replayer.replayAll();
    return new ReadOnlyWorkflowTreeDebugger(
      Object.freeze(state),
      Object.freeze([...events])
    );
  }
}
```

---

## Best Practices Summary

### Event Design
- **Immutable events**: Use `readonly` modifier
- **Event schemas**: Validate with Zod or similar
- **Timestamps**: Add to every event for ordering
- **Causality tracking**: Link related events

### Storage & Retrieval
- **Event indexing**: By type, timestamp, sequence, causality
- **Batching**: Group events for efficiency
- **Lazy loading**: Load on-demand for memory efficiency
- **Compression**: Compress snapshots and old events

### Replay Performance
- **Snapshots**: Reduce replay computation
- **Checkpoints**: Strategic state saves
- **Lazy replay**: Compute states on-demand
- **Incremental updates**: Only replay delta

### Error Handling
- **Error accumulation**: Collect all replay errors
- **Partial recovery**: Continue after errors
- **Deterministic replay**: Same inputs → same outputs
- **Error reporting**: Comprehensive error diagnostics

### Observability
- **Metrics collection**: Track replay performance
- **State change tracking**: Monitor transitions
- **Event processing time**: Identify bottlenecks
- **Memory usage**: Monitor during replay

---

## Implementation Checklist for WorkflowTree

### Static Factory Methods
- [ ] `create(events)` - Standard debugger
- [ ] `fromSnapshot(snapshot)` - From saved state
- [ ] `fromTimestamp(events, ts)` - From specific time
- [ ] `readonly(events)` - Read-only analysis instance
- [ ] `createReplayer(events)` - Dedicated replayer

### Event Replay Interface
- [ ] `replayAll()` - Replay complete history
- [ ] `replayTo(index)` - Replay to event index
- [ ] `replayToTimestamp(ts)` - Replay to time
- [ ] `replayFromSnapshot(snapshot, events)` - From checkpoint
- [ ] `stepForward()` / `stepBackward()` - Navigation

### Read-Only Support
- [ ] Deep immutability enforcement
- [ ] Defensive copying (getters return clones)
- [ ] Type-level read-only guarantees (TypeScript `readonly`)
- [ ] Export methods (state, events, reports)

### Observable Support
- [ ] `onStateChange(callback)` - State updates
- [ ] `onEventProcessed(callback)` - Event processing
- [ ] `onError(callback)` - Error tracking
- [ ] Control methods: `pause()`, `resume()`, `stop()`

### Performance Optimization
- [ ] Snapshot strategy (configurable)
- [ ] Event indexing (by type, time, sequence)
- [ ] Lazy replay (on-demand state computation)
- [ ] Memory limits (max event history size)

### Testing Strategy
- [ ] Unit tests for replay logic
- [ ] Integration tests for factory methods
- [ ] Performance tests (large event sets)
- [ ] Deterministic replay tests
- [ ] Read-only constraint tests

---

## Recommended Reading Order

1. **Start Here:** Redux DevTools documentation (gold standard)
2. **Foundations:** Martin Fowler's Event Sourcing article
3. **Implementation:** Redux DevTools GitHub repo source code
4. **Patterns:** Refactoring.Guru design patterns
5. **Advanced:** Mozilla RR for low-level techniques
6. **TypeScript:** Static Factory Pattern blog post

---

## Key Takeaways

1. **Event Sourcing** is the foundational pattern for time-travel debugging
2. **Static Factory Methods** use descriptive names: `create`, `from`, `for`, `with`, `readonly`
3. **Read-Only Debuggers** essential for post-mortem analysis
4. **Snapshot Strategies** optimize replay performance
5. **Deterministic Replay** ensures consistent behavior
6. **Observable Patterns** enable real-time monitoring
7. **Error Accumulation** helps identify replay failures

---

**Related Research Documents:**
- `01-workflowtree-debugger-analysis.md` - WorkflowTreeDebugger implementation analysis
- `02-workflowevent-serialization.md` - Event serialization strategies
- `03-observable-patterns.md` - Observable integration patterns
- `04-testing-patterns.md` - Testing strategies
- `05-time-travel-debugging-patterns.md` - This document (comprehensive guide)

**See Also:**
- `/plan/002_6761e4b84fd1/P2M1T2S1/PRP.md` - Implementation PRP
- `/plan/002_6761e4b84fd1/P2M1T1S3/PRP.md` - WorkflowEventReplayer PRP

---

*Document generated as part of P2M1T2S1 research for WorkflowTree Debugger implementation*
