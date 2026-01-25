# Event Replay System Best Practices Research

## Research Context
**Document:** PRP for Workflow Event Replayer in TypeScript
**Date:** 2026-01-24
**Purpose:** Research best practices for event replay systems and event sourcing patterns

---

## 1. Event Replay Patterns

### 1.1 Core Event Sourcing Concepts

**Definition:** Event Sourcing is a pattern where state changes are stored as a sequence of events rather than just the current state.

**Key Resources:**
- Martin Fowler - Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- EventStoreDB Documentation: https://developers.eventstore.com/server/v23.x/
- Microsoft Patterns - Event Sourcing Pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing

#### Core Pattern: Event Store Interface

```typescript
// Standard Event Store Interface
interface EventStore<TEvent extends { eventType: string }> {
  // Append events to a stream
  appendToStream(
    streamId: string,
    events: TEvent[],
    expectedVersion?: number
  ): Promise<number>;

  // Read events from a stream
  readStream(
    streamId: string,
    direction: 'forward' | 'backward',
    fromVersion?: number,
    maxCount?: number
  ): Promise<ReadResult<TEvent>>;
}

interface ReadResult<TEvent> {
  events: TEvent[];
  nextStreamVersion: number;
  isEndOfStream: boolean;
}
```

### 1.2 State Rebuilding Patterns

#### Pattern 1: Reducer-Based Replay (Redux-inspired)

**Reference:** Redux Documentation - https://redux.js.org/understanding/thinking-in-redux/glossary#reducer

```typescript
type Reducer<TState, TEvent> = (state: TState, event: TEvent) => TState;

function replayEvents<TState, TEvent extends { type: string }>(
  initialState: TState,
  events: TEvent[],
  reducer: Reducer<TState, TEvent>
): TState {
  return events.reduce((state, event) => reducer(state, event), initialState);
}
```

**Benefits:**
- Simple, functional approach
- Easy to test (pure functions)
- Predictable state evolution
- Time-travel debugging built-in

**Use Cases:**
- Simple aggregates
- Linear event streams
- State that fits in memory

#### Pattern 2: Snapshot-Based Replay

**Reference:** EventStoreDB Snapshots - https://developers.eventstore.com/server/v23.x/docs/projections/#creating-snapshots

```typescript
interface Snapshot<TState> {
  streamId: string;
  version: number;
  state: TState;
  timestamp: number;
}

interface SnapshotStrategy {
  // Determine when to create a snapshot
  shouldSnapshot(streamId: string, version: number, eventsSinceLastSnapshot: number): boolean;
  // Calculate snapshot version
  getSnapshotVersion(streamId: string): number;
}

class SnapshottingEventReplayer<TState, TEvent> {
  constructor(
    private eventStore: EventStore<TEvent>,
    private snapshotStore: SnapshotStore<TState>,
    private reducer: Reducer<TState, TEvent>,
    private strategy: SnapshotStrategy
  ) {}

  async rebuildState(streamId: string): Promise<TState> {
    // 1. Try to load latest snapshot
    const snapshot = await this.snapshotStore.getLatest(streamId);

    if (snapshot) {
      // 2. Load events since snapshot
      const events = await this.eventStore.readStream(
        streamId,
        'forward',
        snapshot.version + 1
      );

      // 3. Replay from snapshot
      return replayEvents(snapshot.state, events, this.reducer);
    } else {
      // 4. Full replay if no snapshot
      const events = await this.eventStore.readStream(streamId, 'forward');
      return replayEvents(this.createInitialState(), events, this.reducer);
    }
  }
}
```

**Benefits:**
- Faster replay for long event streams
- Reduced memory usage
- Better for production read models

**Use Cases:**
- Long-lived aggregates (1000+ events)
- Frequent reads, infrequent writes
- Complex state calculations

**Snapshot Strategies:**
1. **Count-based:** Every N events (common: 100-1000)
2. **Time-based:** Daily, weekly, or monthly snapshots
3. **Hybrid:** Every N events or every T time period, whichever comes first
4. **Event-type based:** On specific milestone events

#### Pattern 3: Incremental Projection Rebuild

```typescript
interface Projection<TState, TEvent> {
  readonly name: string;
  readonly initialState: () => TState;
  process(state: TState, event: TEvent): TState;
}

class IncrementalProjector<TState, TEvent> {
  private checkpointStore: CheckpointStore;

  constructor(
    private projection: Projection<TState, TEvent>,
    private eventStore: EventStore<TEvent>
  ) {}

  async update(): Promise<void> {
    // 1. Load checkpoint
    const checkpoint = await this.checkpointStore.get(this.projection.name);

    // 2. Read events since checkpoint
    const events = await this.eventStore.readStream(
      checkpoint.streamId,
      'forward',
      checkpoint.position + 1,
      1000 // Batch size
    );

    // 3. Process batch
    let state = checkpoint.state || this.projection.initialState();
    for (const event of events) {
      state = this.projection.process(state, event);
    }

    // 4. Save new checkpoint
    await this.checkpointStore.save({
      name: this.projection.name,
      position: checkpoint.position + events.length,
      state,
      timestamp: Date.now()
    });
  }
}
```

**Benefits:**
- Incremental updates only
- Can process in batches
- Good for read models
- Supports parallel processing of independent projections

**Use Cases:**
- Read models/projections
- Dashboard analytics
- Search indexes

### 1.3 Time-Travel Debugging Patterns

**Reference:**
- Redux DevTools - https://github.com/reduxjs/redux-devtools
-immer - https://github.com/immerjs/immer (for immutable state with easy history)

```typescript
interface TimeTravelReplayer<TState, TEvent> {
  // Get state at any point in event history
  getStateAtVersion(version: number): TState;

  // Get all states for visualization
  getAllStates(): TState[];

  // Replay with custom event selection
  replayWithFilter(filter: (event: TEvent) => boolean): TState[];
}

class TimeTravelReplayerImpl<TState, TEvent extends { version: number }>
  implements TimeTravelReplayer<TState, TEvent> {
  private states: Map<number, TState> = new Map();
  private events: TEvent[] = [];

  constructor(
    initialState: TState,
    events: TEvent[],
    private reducer: Reducer<TState, TEvent>
  ) {
    this.events = events;
    this.buildAllStates(initialState);
  }

  private buildAllStates(initialState: TState): void {
    let state = initialState;
    this.states.set(0, state);

    for (const event of this.events) {
      state = this.reducer(state, event);
      this.states.set(event.version, state);
    }
  }

  getStateAtVersion(version: number): TState {
    const state = this.states.get(version);
    if (!state) {
      throw new Error(`No state found for version ${version}`);
    }
    return structuredClone(state); // Deep clone for safety
  }

  getAllStates(): TState[] {
    return Array.from(this.states.values()).map(s => structuredClone(s));
  }

  replayWithFilter(filter: (event: TEvent) => boolean): TState[] {
    const filteredEvents = this.events.filter(filter);
    const states: TState[] = [];
    let state = this.states.get(0)!;

    states.push(state);
    for (const event of filteredEvents) {
      state = this.reducer(state, event);
      states.push(state);
    }

    return states;
  }
}
```

### 1.4 Common Event Replay Patterns Summary

| Pattern | Best For | Complexity | Performance | Memory |
|---------|----------|------------|-------------|--------|
| Reducer Replay | Simple state, < 1000 events | Low | O(n) | Low |
| Snapshot Replay | Complex state, > 1000 events | Medium | O(k) where k << n | Medium |
| Incremental Projection | Read models, analytics | Medium | O(batchSize) | Low |
| Time-Travel Replay | Debugging, visualization | Low | O(n) once, O(1) queries | High |

---

## 2. Performance Considerations

### 2.1 Map vs Object Lookup Performance

**Reference:**
- MDN Map Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- V8 Optimization Blog: https://v8.dev/blog/elements-kinds

#### Performance Characteristics

```typescript
// Benchmark Test Setup
function benchmarkLookups() {
  const iterations = 1_000_000;
  const size = 10_000;

  // Object test
  const obj: Record<string, any> = {};
  for (let i = 0; i < size; i++) {
    obj[`key_${i}`] = { id: i, data: 'value' };
  }

  // Map test
  const map = new Map<string, any>();
  for (let i = 0; i < size; i++) {
    map.set(`key_${i}`, { id: i, data: 'value' });
  }

  // Benchmark object lookup
  console.time('Object lookup');
  for (let i = 0; i < iterations; i++) {
    const key = `key_${i % size}`;
    const value = obj[key];
  }
  console.timeEnd('Object lookup');

  // Benchmark Map lookup
  console.time('Map lookup');
  for (let i = 0; i < iterations; i++) {
    const key = `key_${i % size}`;
    const value = map.get(key);
  }
  console.timeEnd('Map lookup');
}
```

#### Expected Results (approximate, V8 engine):
- Small datasets (< 100 entries): Object ~5-10% faster
- Medium datasets (100-10,000 entries): Comparable (~1-5% difference)
- Large datasets (> 10,000 entries): Map ~10-20% faster
- Frequent add/delete: Map significantly faster (30-50%)

#### When to Use Map (Node Tracking):
```typescript
class WorkflowNodeTracker {
  // Use Map for node tracking because:
  // 1. Dynamic keys (node IDs)
  // 2. Frequent additions/removals
  // 3. Non-string keys possible (if needed)
  // 4. Better garbage collection behavior
  private nodes: Map<string, WorkflowNode> = new Map();

  addNode(node: WorkflowNode): void {
    this.nodes.set(node.id, node);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  getNode(nodeId: string): WorkflowNode | undefined {
    return this.nodes.get(nodeId);
  }

  // Map preserves insertion order - useful for tree traversal
  getAllNodes(): WorkflowNode[] {
    return Array.from(this.nodes.values());
  }
}
```

#### When to Use Object (Static Configurations):
```typescript
// Use Object for:
// 1. Static configuration
// 2. JSON serialization needed
// 3. String keys only
// 4. Fixed structure

const EVENT_HANDLERS: Record<string, (event: WorkflowEvent) => void> = {
  'WORKFLOW_STARTED': handleWorkflowStarted,
  'NODE_EXECUTED': handleNodeExecuted,
  'WORKFLOW_COMPLETED': handleWorkflowCompleted,
};
```

### 2.2 Incremental Updates vs Full Rebuild

#### Decision Matrix

| Factor | Incremental Updates | Full Rebuild |
|--------|-------------------|--------------|
| Complexity | Higher | Lower |
| Correctness Risk | Higher | Lower |
| Performance for Small Changes | Excellent | Poor |
| Performance for Large Changes | Poor | Good |
| Code Maintenance | Higher | Lower |
| Testing | More complex | Simpler |

#### Incremental Update Pattern

```typescript
interface IncrementalUpdater<TState, TEvent> {
  // Returns true if update was applied incrementally
  tryIncrementalUpdate(state: TState, event: TEvent): boolean;

  // Fallback to full rebuild
  fullRebuild(state: TState, events: TEvent[]): TState;
}

class WorkflowTreeIncrementalUpdater implements IncrementalUpdater<WorkflowTree, WorkflowEvent> {
  tryIncrementalUpdate(tree: WorkflowTree, event: WorkflowEvent): boolean {
    switch (event.type) {
      case 'NODE_EXECUTED':
        // Can apply directly to tree
        const node = tree.nodes.get(event.nodeId);
        if (node) {
          node.status = event.status;
          node.output = event.output;
          return true;
        }
        return false;

      case 'WORKFLOW_COMPLETED':
        // Can apply directly
        tree.status = 'completed';
        tree.completedAt = event.timestamp;
        return true;

      default:
        // Unknown event type - need full rebuild
        return false;
    }
  }

  fullRebuild(initialTree: WorkflowTree, events: WorkflowEvent[]): WorkflowTree {
    return events.reduce((tree, event) => {
      if (!this.tryIncrementalUpdate(tree, event)) {
        throw new Error(`Cannot handle event type: ${(event as any).type}`);
      }
      return tree;
    }, structuredClone(initialTree));
  }
}
```

#### Performance Comparison

```typescript
// Benchmark incremental vs full rebuild
function benchmarkRebuild() {
  const eventCounts = [10, 100, 1000, 10000];
  const singleEventChange = generateSingleChangeEvent();

  for (const count of eventCounts) {
    const events = generateEvents(count);
    const tree = buildTreeFromEvents(events);

    // Measure full rebuild
    console.time(`Full rebuild (${count} events)`);
    const fullRebuildTree = rebuildTree(tree, events);
    console.timeEnd(`Full rebuild (${count} events)`);

    // Measure incremental update
    console.time(`Incremental update (1 change)`);
    const incrementalTree = updateTreeIncrementally(tree, singleEventChange);
    console.timeEnd(`Incremental update (1 change)`);
  }
}

// Expected results:
// Full rebuild (10 events): ~0.1ms
// Full rebuild (100 events): ~1ms
// Full rebuild (1000 events): ~10ms
// Full rebuild (10000 events): ~100ms
// Incremental update: ~0.01ms (constant time)
```

**Recommendation for Workflow Replayer:**
- Use incremental updates for single event playback
- Use full rebuild for batch replay (more than ~100 events)
- Consider hybrid: incremental for small batches, full for large

### 2.3 Memory Optimization for Large Event Streams

#### Strategy 1: Event Streaming

```typescript
async function* streamEvents(
  eventStore: EventStore<WorkflowEvent>,
  streamId: string,
  batchSize: number = 1000
): AsyncIterable<WorkflowEvent[]> {
  let position = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await eventStore.readStream(
      streamId,
      'forward',
      position,
      batchSize
    );

    yield result.events;

    hasMore = !result.isEndOfStream;
    position += result.events.length;
  }
}

// Usage - constant memory regardless of event count
async function replayWithStreaming(
  initialState: WorkflowTree,
  streamId: string
): Promise<WorkflowTree> {
  let state = initialState;

  for await (const batch of streamEvents(EVENT_STORE, streamId)) {
    for (const event of batch) {
      state = reducer(state, event);
    }
  }

  return state;
}
```

#### Strategy 2: Event Compression

```typescript
// Compress events before storage
import { compress, decompress } from 'lz4-npm';

interface CompressedEventStore {
  appendCompressed(streamId: string, events: WorkflowEvent[]): Promise<void>;
  readDecompressed(streamId: string): Promise<WorkflowEvent[]>;
}

class CompressedEventStoreImpl implements CompressedEventStore {
  async appendCompressed(streamId: string, events: WorkflowEvent[]): Promise<void> {
    const json = JSON.stringify(events);
    const compressed = await compress(Buffer.from(json));
    await this.rawStore.append(streamId, compressed);
  }

  async readDecompressed(streamId: string): Promise<WorkflowEvent[]> {
    const compressed = await this.rawStore.read(streamId);
    const decompressed = await decompress(compressed);
    return JSON.parse(decompressed.toString());
  }
}
```

#### Strategy 3: Event Archival

```typescript
interface EventArchiveStrategy {
  // Move old events to cold storage
  archiveOldEvents(streamId: string, beforeDate: Date): Promise<number>;

  // Retrieve from archive if needed
  retrieveFromArchive(streamId: string): Promise<WorkflowEvent[]>;
}

class TieredEventStorage implements EventStore<WorkflowEvent> {
  constructor(
    private hotStore: EventStore<WorkflowEvent>, // Fast, expensive
    private coldStore: EventStore<WorkflowEvent>, // Slower, cheap
    private archiveStrategy: EventArchiveStrategy
  ) {}

  async readStream(streamId: string): Promise<WorkflowEvent[]> {
    // Try hot store first
    let events = await this.hotStore.readStream(streamId);

    // If not complete, fetch from archive
    if (events.length === 0) {
      events = await this.archiveStrategy.retrieveFromArchive(streamId);
    }

    return events;
  }
}
```

#### Strategy 4: State Checkpointing

```typescript
interface StateCheckpoint<TState> {
  version: number;
  state: TState;
  checksum: string; // For validation
  compressed?: boolean;
}

class CheckpointingReplayer<TState, TEvent> {
  private checkpoints: Map<string, StateCheckpoint<TState>> = new Map();

  async replayWithCheckpoints(
    streamId: string,
    events: TEvent[],
    checkpointInterval: number = 100
  ): Promise<TState> {
    let state = this.createInitialState();
    const checkpoint = await this.loadCheckpoint(streamId);

    if (checkpoint) {
      // Validate checkpoint
      if (this.validateChecksum(checkpoint)) {
        state = checkpoint.state;
        // Skip events already processed
        events = events.slice(checkpoint.version + 1);
      }
    }

    for (let i = 0; i < events.length; i++) {
      state = this.reducer(state, events[i]);

      // Create checkpoint at intervals
      if ((i + 1) % checkpointInterval === 0) {
        await this.saveCheckpoint(streamId, {
          version: i,
          state,
          checksum: this.calculateChecksum(state)
        });
      }
    }

    return state;
  }
}
```

---

## 3. TypeScript-Specific Patterns

### 3.1 Discriminated Union Handling for Workflow Events

**Reference:**
- TypeScript Handbook - Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html#discriminated-unions
- Effect TS: https://github.com/Effect-TS/effect (extensive use of discriminated unions)

#### Pattern 1: Standard Discriminated Union

```typescript
// Base event interface with discriminant
interface BaseWorkflowEvent {
  workflowId: string;
  timestamp: number;
  version: number;
}

// Discriminated union of all event types
type WorkflowEvent =
  | WorkflowStartedEvent
  | NodeExecutedEvent
  | NodeFailedEvent
  | WorkflowCompletedEvent
  | WorkflowCancelledEvent;

// Individual event types
interface WorkflowStartedEvent extends BaseWorkflowEvent {
  type: 'WORKFLOW_STARTED';
  input: Record<string, unknown>;
}

interface NodeExecutedEvent extends BaseWorkflowEvent {
  type: 'NODE_EXECUTED';
  nodeId: string;
  output: unknown;
}

interface NodeFailedEvent extends BaseWorkflowEvent {
  type: 'NODE_FAILED';
  nodeId: string;
  error: string;
}

interface WorkflowCompletedEvent extends BaseWorkflowEvent {
  type: 'WORKFLOW_COMPLETED';
  finalOutput: unknown;
}

interface WorkflowCancelledEvent extends BaseWorkflowEvent {
  type: 'WORKFLOW_CANCELLED';
  reason: string;
}
```

#### Pattern 2: Type-Safe Event Handler

```typescript
// Extract all event type values
type EventType = WorkflowEvent['type'];

// Type-safe handler map
type EventHandlerMap = {
  [K in EventType]: (
    event: Extract<WorkflowEvent, { type: K }>
  ) => Partial<WorkflowState>;
};

// Implementation
const eventHandlers: EventHandlerMap = {
  WORKFLOW_STARTED: (event) => ({
    status: 'running',
    input: event.input,
    startedAt: event.timestamp,
  }),

  NODE_EXECUTED: (event) => ({
    // TypeScript knows event is NodeExecutedEvent
    nodeOutputs: {
      [event.nodeId]: event.output,
    },
  }),

  NODE_FAILED: (event) => ({
    status: 'failed',
    error: event.error,
  }),

  WORKFLOW_COMPLETED: (event) => ({
    status: 'completed',
    output: event.finalOutput,
    completedAt: event.timestamp,
  }),

  WORKFLOW_CANCELLED: (event) => ({
    status: 'cancelled',
    cancellationReason: event.reason,
  }),
};

// Type-safe dispatch
function applyEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  const handler = eventHandlers[event.type];
  const updates = handler(event);
  return { ...state, ...updates };
}
```

#### Pattern 3: Exhaustiveness Checking

```typescript
function handleEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'WORKFLOW_STARTED':
      console.log('Workflow started');
      break;
    case 'NODE_EXECUTED':
      console.log('Node executed');
      break;
    case 'NODE_FAILED':
      console.log('Node failed');
      break;
    case 'WORKFLOW_COMPLETED':
      console.log('Workflow completed');
      break;
    case 'WORKFLOW_CANCELLED':
      console.log('Workflow cancelled');
      break;
    default:
      // Compile-time error if new event type added without case
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
  }
}
```

#### Pattern 4: Generic Event Processor

```typescript
// Generic event processor with type safety
interface EventProcessor<TEvent, TState> {
  initialState(): TState;
  process(state: TState, event: TEvent): TState;
  validate(event: TEvent): boolean;
}

class TypedEventReplayer<TEvent extends { type: string }, TState> {
  constructor(
    private processor: EventProcessor<TEvent, TState>
  ) {}

  replay(events: TEvent[]): TState {
    let state = this.processor.initialState();

    for (const event of events) {
      if (!this.processor.validate(event)) {
        throw new Error(`Invalid event: ${JSON.stringify(event)}`);
      }
      state = this.processor.process(state, event);
    }

    return state;
  }

  // Type-safe event filtering
  replayFiltered(
    events: TEvent[],
    predicate: (event: TEvent) => boolean
  ): TState {
    return this.replay(events.filter(predicate));
  }

  // Type-safe event type filtering
  replayOnlyType<K extends TEvent['type']>(
    events: TEvent[],
    eventType: K
  ): TState {
    const filtered = events.filter(
      (e): e is Extract<TEvent, { type: K }> => e.type === eventType
    );
    return this.replay(filtered);
  }
}
```

### 3.2 Type-Safe Event Handlers

#### Pattern 1: Command-Query Separation

```typescript
// Commands (state-changing events)
type CommandEvent =
  | { type: 'START_WORKFLOW'; workflowId: string; input: unknown }
  | { type: 'EXECUTE_NODE'; nodeId: string; input: unknown }
  | { type: 'CANCEL_WORKFLOW'; reason: string };

// Queries (read-only events)
type QueryEvent =
  | { type: 'GET_STATUS'; workflowId: string }
  | { type: 'GET_NODE_OUTPUT'; nodeId: string };

// Type-safe command handler
interface CommandHandler<TCommand extends CommandEvent, TResult> {
  canHandle(command: CommandEvent): command is TCommand;
  handle(command: TCommand): Promise<TResult>;
}

class StartWorkflowHandler implements CommandHandler<
  Extract<CommandEvent, { type: 'START_WORKFLOW' }>,
  void
> {
  canHandle(command: CommandEvent): command is Extract<CommandEvent, { type: 'START_WORKFLOW' }> {
    return command.type === 'START_WORKFLOW';
  }

  async handle(command: Extract<CommandEvent, { type: 'START_WORKFLOW' }>): Promise<void> {
    // TypeScript knows command has workflowId and input
    console.log(`Starting workflow ${command.workflowId}`);
  }
}
```

#### Pattern 2: Event Handler Builder

```typescript
// Type-safe event handler builder
class EventHandlerBuilder<TEvent extends { type: string }, TState> {
  private handlers: Map<TEvent['type'], (state: TState, event: TEvent) => TState> = new Map();

  on<K extends TEvent['type']>(
    eventType: K,
    handler: (state: TState, event: Extract<TEvent, { type: K }>) => TState
  ): this {
    this.handlers.set(eventType, handler as (state: TState, event: TEvent) => TState);
    return this;
  }

  build(): (state: TState, event: TEvent) => TState {
    return (state, event) => {
      const handler = this.handlers.get(event.type);
      if (!handler) {
        throw new Error(`No handler for event type: ${event.type}`);
      }
      return handler(state, event);
    };
  }
}

// Usage
const workflowReducer = new EventHandlerBuilder<WorkflowEvent, WorkflowState>()
  .on('WORKFLOW_STARTED', (state, event) => ({
    ...state,
    status: 'running',
    input: event.input,
  }))
  .on('NODE_EXECUTED', (state, event) => ({
    ...state,
    nodeOutputs: { ...state.nodeOutputs, [event.nodeId]: event.output },
  }))
  .on('WORKFLOW_COMPLETED', (state, event) => ({
    ...state,
    status: 'completed',
    output: event.finalOutput,
  }))
  .build();
```

### 3.3 Generic Replay Interfaces

```typescript
// Core generic interfaces for event replay
interface Event {
  type: string;
  version: number;
  timestamp: number;
}

interface Aggregate<TEvent extends Event, TState> {
  id: string;
  version: number;
  state: TState;
  apply(event: TEvent): void;
}

interface Replayer<TEvent extends Event, TState> {
  replay(events: TEvent[]): TState;
  replayUntil(events: TEvent[], version: number): TState;
  replayFrom(events: TEvent[], fromVersion: number): TState;
}

// Generic replayer implementation
class GenericReplayer<TEvent extends Event, TState> implements Replayer<TEvent, TState> {
  constructor(
    private initialState: TState,
    private reducer: (state: TState, event: TEvent) => TState
  ) {}

  replay(events: TEvent[]): TState {
    return events.reduce(this.reducer, this.initialState);
  }

  replayUntil(events: TEvent[], version: number): TState {
    return this.replay(events.filter(e => e.version <= version));
  }

  replayFrom(events: TEvent[], fromVersion: number): TState {
    const filtered = events.filter(e => e.version >= fromVersion);
    return this.replay(filtered);
  }
}

// Type-safe event store interface
interface TypedEventStore<TEvent extends Event> {
  readStream(streamId: string): Promise<TEvent[]>;
  readStreamFrom(streamId: string, fromVersion: number): Promise<TEvent[]>;
  appendToStream(streamId: string, events: TEvent[]): Promise<number>;
}
```

---

## 4. Testing Event Replayers

### 4.1 Test Strategy

**Reference:**
- Martin Fowler - Given-When-Then: https://martinfowler.com/bliki/GivenWhenThen.html
- Testing Event Sourcing - https://eventstore.com/blog/testing-event-sourced-systems

#### Test Structure Pattern

```typescript
import { describe, it, expect } from 'vitest';

describe('WorkflowEventReplayer', () => {
  // Given-When-Then pattern
  it('should rebuild workflow state from events', () => {
    // Given
    const initialEvents: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 2000,
        version: 2,
        nodeId: 'node-1',
        output: { result: 'success' },
      },
      {
        type: 'WORKFLOW_COMPLETED',
        workflowId: 'wf-1',
        timestamp: 3000,
        version: 3,
        finalOutput: { result: 'success' },
      },
    ];

    // When
    const replayer = new WorkflowEventReplayer();
    const state = replayer.replay(initialEvents);

    // Then
    expect(state.status).toBe('completed');
    expect(state.input).toEqual({ foo: 'bar' });
    expect(state.nodeOutputs['node-1']).toEqual({ result: 'success' });
    expect(state.output).toEqual({ result: 'success' });
  });
});
```

### 4.2 Common Edge Cases

#### Edge Case 1: Out-of-Order Events

```typescript
describe('Out-of-Order Events', () => {
  it('should handle events received out of order', () => {
    const events: WorkflowEvent[] = [
      // Event 3 (arrives first)
      {
        type: 'WORKFLOW_COMPLETED',
        workflowId: 'wf-1',
        timestamp: 3000,
        version: 3,
        finalOutput: { result: 'done' },
      },
      // Event 1 (arrives second)
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      // Event 2 (arrives third)
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 2000,
        version: 2,
        nodeId: 'node-1',
        output: { result: 'success' },
      },
    ];

    const replayer = new WorkflowEventReplayer();
    // Replayer should sort by version before replaying
    const state = replayer.replay(events);

    expect(state.version).toBe(3);
    expect(state.status).toBe('completed');
  });

  it('should detect and reject events with duplicate versions', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 2000,
        version: 1, // Duplicate version!
        nodeId: 'node-1',
        output: { result: 'success' },
      },
    ];

    const replayer = new WorkflowEventReplayer();
    expect(() => replayer.replay(events)).toThrow('Duplicate version detected');
  });
});
```

#### Edge Case 2: Missing Events (Gaps in Sequence)

```typescript
describe('Missing Events', () => {
  it('should detect gaps in event sequence', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      // Version 2 is missing!
      {
        type: 'WORKFLOW_COMPLETED',
        workflowId: 'wf-1',
        timestamp: 3000,
        version: 3,
        finalOutput: { result: 'done' },
      },
    ];

    const replayer = new WorkflowEventReplayer();

    // Option 1: Throw error
    expect(() => replayer.replay(events)).toThrow('Gap detected in event sequence');

    // Option 2: Continue but mark state as incomplete
    const result = replayer.replayWithValidation(events);
    expect(result.state.hasGap).toBe(true);
    expect(result.state.missingVersions).toEqual([2]);
  });

  it('should handle incomplete final state gracefully', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      // Workflow completed event is missing
    ];

    const replayer = new WorkflowEventReplayer();
    const state = replayer.replay(events);

    // State should be "running" not "completed"
    expect(state.status).toBe('running');
    expect(state.isComplete).toBe(false);
  });
});
```

#### Edge Case 3: Unknown Event Types

```typescript
describe('Unknown Event Types', () => {
  it('should skip unknown event types with warning', () => {
    const events = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      {
        type: 'UNKNOWN_EVENT_TYPE' as any, // Unknown event
        workflowId: 'wf-1',
        timestamp: 2000,
        version: 2,
        data: 'some data',
      },
      {
        type: 'WORKFLOW_COMPLETED',
        workflowId: 'wf-1',
        timestamp: 3000,
        version: 3,
        finalOutput: { result: 'done' },
      },
    ];

    const replayer = new WorkflowEventReplayer();
    const state = replayer.replay(events);

    // Should still complete but log warning
    expect(state.status).toBe('completed');
    expect(replayer.warnings).toContain('Unknown event type: UNKNOWN_EVENT_TYPE');
  });
});
```

#### Edge Case 4: Concurrent Events

```typescript
describe('Concurrent Events', () => {
  it('should handle events with same timestamp', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 1000, // Same timestamp!
        version: 2,
        nodeId: 'node-1',
        output: { result: 'success' },
      },
    ];

    const replayer = new WorkflowEventReplayer();
    const state = replayer.replay(events);

    // Should use version number to determine order
    expect(state.nodeOutputs['node-1']).toBeDefined();
  });

  it('should handle parallel node execution events', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'WORKFLOW_STARTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        input: { foo: 'bar' },
      },
      // Parallel nodes executed concurrently
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 2000,
        version: 2,
        nodeId: 'node-1',
        output: { result: 'from-node-1' },
      },
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 2000, // Same timestamp as node-1
        version: 3,
        nodeId: 'node-2',
        output: { result: 'from-node-2' },
      },
    ];

    const replayer = new WorkflowEventReplayer();
    const state = replayer.replay(events);

    // Both nodes should have their outputs
    expect(state.nodeOutputs['node-1']).toEqual({ result: 'from-node-1' });
    expect(state.nodeOutputs['node-2']).toEqual({ result: 'from-node-2' });
  });
});
```

### 4.3 Validation Approaches

#### Validation 1: Invariant Checking

```typescript
// Define state invariants
interface StateInvariant<TState> {
  name: string;
  check: (state: TState) => boolean;
  errorMessage: string;
}

class ValidatingReplayer<TEvent extends Event, TState> extends GenericReplayer<TEvent, TState> {
  private invariants: StateInvariant<TState>[] = [];

  addInvariant(invariant: StateInvariant<TState>): this {
    this.invariants.push(invariant);
    return this;
  }

  replay(events: TEvent[]): TState {
    const state = super.replay(events);

    for (const invariant of this.invariants) {
      if (!invariant.check(state)) {
        throw new Error(
          `Invariant violation after replay: ${invariant.name}\n${invariant.errorMessage}`
        );
      }
    }

    return state;
  }
}

// Usage
const workflowReplayer = new ValidatingReplayer<WorkflowEvent, WorkflowState>(
  initialWorkflowState,
  workflowReducer
)
  .addInvariant({
    name: 'workflow-version-matches-events',
    check: (state) => state.version === state.lastEventVersion,
    errorMessage: 'Workflow version does not match last event version',
  })
  .addInvariant({
    name: 'completed-workflow-has-output',
    check: (state) => state.status !== 'completed' || !!state.output,
    errorMessage: 'Completed workflow must have output',
  })
  .addInvariant({
    name: 'node-outputs-match-executed-nodes',
    check: (state) => {
      const executedNodes = Object.keys(state.nodeOutputs);
      return executedNodes.every(nodeId =>
        state.executedNodeIds.includes(nodeId)
      );
    },
    errorMessage: 'Node outputs must match executed nodes',
  });
```

#### Validation 2: Checksum Verification

```typescript
interface ChecksummedEvent extends Event {
  checksum: string;
}

class ChecksumValidatingReplayer extends GenericReplayer<ChecksummedEvent, WorkflowState> {
  private calculateChecksum(event: ChecksummedEvent): string {
    const data = { ...event, checksum: '' };
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  replay(events: ChecksummedEvent[]): WorkflowState {
    // Validate all checksums first
    for (const event of events) {
      const expectedChecksum = this.calculateChecksum(event);
      if (event.checksum !== expectedChecksum) {
        throw new Error(
          `Checksum mismatch for event ${event.version}. ` +
          `Expected: ${expectedChecksum}, Got: ${event.checksum}`
        );
      }
    }

    return super.replay(events);
  }
}
```

#### Validation 3: Determinism Testing

```typescript
describe('Replay Determinism', () => {
  it('should produce identical state on multiple replays', () => {
    const events: WorkflowEvent[] = generateEvents(100);
    const replayer = new WorkflowEventReplayer();

    // Replay multiple times
    const state1 = replayer.replay(events);
    const state2 = replayer.replay(events);
    const state3 = replayer.replay(events);

    // All replays should produce identical state
    expect(state1).toEqual(state2);
    expect(state2).toEqual(state3);
  });

  it('should produce identical state regardless of replay order (for parallelizable events)', () => {
    const parallelEvents: WorkflowEvent[] = [
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 1,
        nodeId: 'node-1',
        output: { result: '1' },
      },
      {
        type: 'NODE_EXECUTED',
        workflowId: 'wf-1',
        timestamp: 1000,
        version: 2,
        nodeId: 'node-2',
        output: { result: '2' },
      },
    ];

    const replayer = new WorkflowEventReplayer();

    // Try different orderings
    const state1 = replayer.replay([parallelEvents[0], parallelEvents[1]]);
    const state2 = replayer.replay([parallelEvents[1], parallelEvents[0]]);

    // Should be identical for independent events
    expect(JSON.stringify(state1)).toEqual(JSON.stringify(state2));
  });
});
```

### 4.4 Property-Based Testing

```typescript
import fc from 'fast-check';

describe('Property-Based Testing', () => {
  it('should always produce valid state from any event sequence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom(
              'WORKFLOW_STARTED',
              'NODE_EXECUTED',
              'WORKFLOW_COMPLETED'
            ),
            workflowId: fc.string(),
            timestamp: fc.integer(1000, 100000),
            version: fc.integer(1, 1000),
          } as any)
        ),
        (events) => {
          const replayer = new WorkflowEventReplayer();

          // Should not throw
          const state = replayer.replay(events);

          // State should have basic properties
          expect(state).toHaveProperty('workflowId');
          expect(state).toHaveProperty('version');

          return true;
        }
      )
    );
  });

  it('should maintain monotonic version progression', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(1, 1000)),
        (versions) => {
          const uniqueVersions = [...new Set(versions)].sort((a, b) => a - b);
          const events = uniqueVersions.map((version, i) => ({
            type: 'NODE_EXECUTED',
            workflowId: 'wf-1',
            timestamp: 1000 + i * 100,
            version,
            nodeId: `node-${i}`,
            output: { result: i },
          }));

          const replayer = new WorkflowEventReplayer();
          const state = replayer.replay(events);

          // Final version should be highest version
          expect(state.version).toBe(Math.max(...uniqueVersions));
          return true;
        }
      )
    );
  });
});
```

---

## 5. Additional Resources and References

### 5.1 Books

1. **"Domain-Driven Design" by Eric Evans**
   - Foundation for event sourcing and aggregate design
   - https://www.domainlanguage.com/ddd/

2. **"Implementing Domain-Driven Design" by Vaughn Vernon**
   - Practical guide to implementing DDD patterns
   - Includes event sourcing examples

3. **"Patterns, Principles, and Practices of Domain-Driven Design" by Scott Millett & Nick Tune**
   - Modern DDD with event sourcing patterns

### 5.2 Blog Posts and Articles

1. **Martin Fowler - Event Sourcing**
   - https://martinfowler.com/eaaDev/EventSourcing.html
   - Comprehensive introduction to event sourcing

2. **Microsoft Azure - Event Sourcing Pattern**
   - https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
   - Cloud-focused implementation guidance

3. **EventStore Blog**
   - https://www.eventstore.com/blog
   - Real-world event sourcing implementation stories

4. **Yves Lorphelin - Event Sourcing in TypeScript**
   - Series on practical TypeScript implementations

### 5.3 Open Source Projects

1. **EventStoreDB**
   - https://github.com/EventStore/EventStore
   - Production-ready event store database

2. **EventStoreDB Client (TypeScript)**
   - https://github.com/EventStore/EventStore-Client-NodeJS
   - Official TypeScript client

3. **Redux**
   - https://github.com/reduxjs/redux
   - Event sourcing principles in state management

4. **RxJS**
   - https://github.com/ReactiveX/rxjs
   - Event stream processing patterns

5. **Effect-TS**
   - https://github.com/Effect-TS/effect
   - Type-safe functional programming with event handling

### 5.4 Conference Talks

1. **Greg Young - CQRS and Event Sourcing**
   - YouTube: Search for "Greg Young Event Sourcing"
   - Classic introduction to the concepts

2. **Kamil Gisiński - Event Sourcing in TypeScript**
   - Check YouTube for recent talks

3. **Yan Cui - Event-Driven Architectures**
   - Serverless event sourcing patterns

---

## 6. Summary and Recommendations

### 6.1 For Workflow Event Replayer Implementation

**Recommended Pattern:**
- Use **Reducer-based replay** for simplicity and testability
- Implement **Snapshot support** for workflows with > 100 events
- Use **Map** for node tracking (dynamic keys, frequent mutations)
- Use **Object** for event handler registration (static configuration)

**TypeScript Patterns:**
- Discriminated unions for event types
- Exhaustive switch statements with never type checking
- Generic replayer interface for reusability

**Testing Approach:**
- Property-based testing with fast-check
- Edge case suite (out-of-order, missing events, duplicates)
- Invariant checking for validation
- Determinism testing for reliability

### 6.2 Performance Checklist

- [ ] Event streaming for large event streams (> 10,000 events)
- [ ] Snapshot creation at intervals (100-1000 events)
- [ ] Batch processing for replay (batch size: 100-1000)
- [ ] Map for node tracking
- [ ] Checkpointing for incremental updates
- [ ] Compression for long-term storage

### 6.3 Key Takeaways

1. **Start simple**: Reducer-based replay is sufficient for most use cases
2. **Add complexity only when needed**: Snapshots, projections, etc.
3. **Type safety is critical**: Use TypeScript's discriminated unions
4. **Test extensively**: Edge cases are where event replay systems fail
5. **Monitor performance**: Establish baselines and track metrics

---

**Document Metadata**
- Created: 2026-01-24
- Author: Claude Research Agent
- Purpose: PRP research for TypeScript Workflow Event Replayer
- Version: 1.0
