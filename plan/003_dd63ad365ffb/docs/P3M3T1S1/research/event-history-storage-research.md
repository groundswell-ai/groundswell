# Event History Storage Research for Workflow Engine

**Research Date**: 2026-01-26
**Context**: PRP P3.M3.T1.S1 - Adding event history storage to Workflow class
**Objective**: Research best practices for in-memory event replay systems in TypeScript workflow engines

---

## Executive Summary

This research document covers best practices for implementing event history storage and replay capabilities in the Workflow class. The existing codebase already has:

1. **WorkflowEvent discriminated union** with ~20 event types (see `/home/dustin/projects/groundswell/src/types/events.ts`)
2. **WorkflowEventReplayer class** that reconstructs tree from events (see `/home/dustin/projects/groundswell/src/debugger/event-replayer.ts`)
3. **Event emission via `emitEvent(event)`** that pushes to `node.events` array (see `/home/dustin/projects/groundswell/src/core/workflow.ts` line 483-499)
4. **Observer pattern** with `observer.onEvent(event)` callbacks (see Workflow class line 487-498)

**Key Finding**: The system already has event storage (`node.events` array) and replay capability (`WorkflowEventReplayer`). The PRP should focus on adding **controlled replay APIs** and **memory management** rather than building from scratch.

---

## 1. Event History Storage Patterns

### 1.1 Current Implementation Analysis

**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts` (lines 164-173)

```typescript
this.node = {
  id: this.id,
  name: this.config.name ?? this.constructor.name,
  parent: this.parent?.node ?? null,
  children: [],
  status: 'idle',
  logs: [],
  events: [],  // <-- Unbounded array storage
  stateSnapshot: null,
};
```

**Current Storage Strategy**:
- Simple array push: `this.node.events.push(event)` (line 484)
- Unbounded growth (no limit on array size)
- All events stored indefinitely
- No memory management or clearing mechanism

**Issues**:
1. **Memory leak potential**: Long-running workflows accumulate events indefinitely
2. **No replay control**: No API to request filtered replay (since, limit, filters)
3. **Observer catch-up missing**: New observers don't receive historical events

### 1.2 Recommended Storage Patterns

#### Pattern 1: Bounded Array (Unlimited History with Manual Clear)

```typescript
interface EventHistoryConfig {
  maxSize?: number;        // Max events before oldest are dropped (0 = unlimited)
  clearStrategy?: 'manual' | 'auto' | 'circular';
}

class EventHistory {
  private events: WorkflowEvent[] = [];
  private config: EventHistoryConfig;

  constructor(config: EventHistoryConfig = {}) {
    this.config = {
      maxSize: 0,           // 0 = unlimited by default
      clearStrategy: 'manual',
      ...config
    };
  }

  push(event: WorkflowEvent): void {
    this.events.push(event);

    // Auto-clear if exceeds max size
    if (this.config.maxSize > 0 && this.events.length > this.config.maxSize) {
      if (this.config.clearStrategy === 'circular') {
        // Remove oldest events to maintain max size
        this.events.splice(0, this.events.length - this.config.maxSize);
      }
    }
  }

  getEvents(options?: {
    since?: number;         // Timestamp filter
    limit?: number;         // Max events to return
    types?: WorkflowEvent['type'][];  // Type filter
  }): WorkflowEvent[] {
    let filtered = this.events;

    // Time-based filter
    if (options?.since !== undefined) {
      // Filter events with timestamp > since
      // Note: Not all events have timestamp field, need to handle this
    }

    // Type-based filter
    if (options?.types) {
      filtered = filtered.filter(e => options.types!.includes(e.type));
    }

    // Limit filter
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }
}
```

**Pros**:
- Simple implementation
- Compatible with existing array-based code
- Easy to add time/type filtering
- Memory bounded with maxSize

**Cons**:
- splice(0, n) is O(n) for removing oldest events
- Still requires manual memory management

#### Pattern 2: Circular Buffer (True O(1) Bounded Storage)

```typescript
class CircularEventBuffer {
  private buffer: (WorkflowEvent | undefined)[];
  private capacity: number;
  private head: number = 0;      // Points to oldest event
  private tail: number = 0;      // Points to next write position
  private size: number = 0;      // Current number of events

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(event: WorkflowEvent): void {
    this.buffer[this.tail] = event;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Buffer is full, overwrite oldest event
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getEvents(options?: {
    since?: number;
    limit?: number;
    types?: WorkflowEvent['type'][];
  }): WorkflowEvent[] {
    const result: WorkflowEvent[] = [];

    let count = options?.limit ?? this.size;
    let index = this.tail - count;

    // Handle wraparound
    if (index < 0) {
      index += this.capacity;
    }

    for (let i = 0; i < Math.min(count, this.size); i++) {
      const event = this.buffer[index];
      if (event !== undefined) {
        // Apply filters
        if (options?.types && !options.types.includes(event.type)) {
          continue;
        }
        if (options?.since) {
          // Timestamp filtering (if event has timestamp)
          continue;
        }
        result.push(event);
      }
      index = (index + 1) % this.capacity;
    }

    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}
```

**Pros**:
- O(1) push operation (no reallocation)
- O(1) memory usage (fixed capacity)
- No garbage collection pressure from array growth
- Ideal for high-frequency event streams

**Cons**:
- More complex implementation
- Loses oldest events when full (by design)
- Chronological order retrieval requires wraparound handling
- Cannot efficiently filter by timestamp without scanning all events

#### Pattern 3: Hybrid Approach (Recommended)

**Combines bounded array with segmented storage for different event types**:

```typescript
interface SegmentedEventHistory {
  // Structural events (rare, keep all)
  structural: WorkflowEvent[];  // childAttached, childDetached, treeUpdated

  // State events (moderate frequency, bounded)
  state: CircularEventBuffer;   // stateSnapshot, error

  // Metadata events (high frequency, heavily bounded)
  metadata: CircularEventBuffer; // step*, task*, agentPrompt*, toolInvocation, etc.
}
```

**Benefits**:
- Keep critical structural events forever (needed for tree reconstruction)
- Bound high-frequency metadata events
- Optimized memory usage
- Targeted replay per segment

---

## 2. API Design for Event Replay

### 2.1 Observer Pattern Integration with Catch-Up Replay

**Current Implementation** (line 483-499):
```typescript
public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);  // Only receives new events
      // ...
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

**Problem**: New observers only receive events added after they subscribe. They miss historical events.

**Solution**: Add catch-up replay on observer subscription:

```typescript
interface WorkflowObserver {
  onEvent(event: WorkflowEvent): void;
  onTreeChanged?(root: WorkflowNode): void;
  onStateUpdated?(node: WorkflowNode): void;

  // NEW: Optional replay method for catching up
  onReplayStart?(): void;      // Called before replay starts
  onReplayEnd?(): void;        // Called after replay completes
}

interface ReplayOptions {
  since?: number;              // Timestamp to replay from
  limit?: number;              // Max events to replay
  types?: WorkflowEvent['type'][];  // Event types to replay
  includeHistorical?: boolean;  // If false, only new events (default: true for new observers)
}

public addObserver(observer: WorkflowObserver, options?: ReplayOptions): void {
  if (this.parent) {
    throw new Error('Observers can only be added to root workflows');
  }

  // Catch-up replay for new observers
  if (options?.includeHistorical !== false) {
    observer.onReplayStart?.();

    const historicalEvents = this.getEvents(options);
    for (const event of historicalEvents) {
      try {
        observer.onEvent(event);
      } catch (err) {
        this.logger.error('Observer replay error', { error: err, eventType: event.type });
      }
    }

    observer.onReplayEnd?.();
  }

  this.observers.push(observer);
}
```

**Usage Example**:
```typescript
// New observer receives all historical events
workflow.addObserver(debugObserver);

// New observer receives only last 100 events
workflow.addObserver(debugObserver, { limit: 100 });

// New observer receives only error events from last hour
workflow.addObserver(errorObserver, {
  types: ['error', 'invalidResponse'],
  since: Date.now() - 3600000
});

// New observer receives NO historical events (only future)
workflow.addObserver(liveObserver, { includeHistorical: false });
```

### 2.2 Public Replay API Methods

**Recommended additions to Workflow class**:

```typescript
/**
 * Get events from this workflow's history with optional filtering
 *
 * @param options - Filter options for replay
 * @returns Array of events matching the criteria
 *
 * @example Get last 50 events
 * const recentEvents = workflow.getEvents({ limit: 50 });
 *
 * @example Get all error events
 * const errors = workflow.getEvents({ types: ['error', 'invalidResponse'] });
 *
 * @example Get events from last 5 minutes
 * const recent = workflow.getEvents({ since: Date.now() - 300000 });
 *
 * @example Get last 20 step events
 * const steps = workflow.getEvents({ limit: 20, types: ['stepStart', 'stepEnd'] });
 */
public getEvents(options?: {
  since?: number;
  limit?: number;
  types?: WorkflowEvent['type'][];
}): WorkflowEvent[] {
  let events = this.node.events;

  // Type filter
  if (options?.types) {
    events = events.filter(e => options.types!.includes(e.type));
  }

  // Timestamp filter (only for events with timestamp field)
  if (options?.since !== undefined) {
    events = events.filter(e => {
      // Events with timestamp: stepRetry, stepRestarted, invalidResponse
      if ('timestamp' in e && typeof e.timestamp === 'number') {
        return e.timestamp > options.since!;
      }
      return true; // Include events without timestamp
    });
  }

  // Limit filter (get most recent N events)
  if (options?.limit) {
    events = events.slice(-options.limit);
  }

  return events;
}

/**
 * Replay events through the WorkflowEventReplayer to reconstruct tree state
 *
 * @param options - Filter options for replay
 * @returns Reconstructed workflow node tree
 *
 * @example Reconstruct tree from all events
 * const tree = workflow.replayTree();
 *
 * @example Reconstruct tree from last 100 events
 * const recentTree = workflow.replayTree({ limit: 100 });
 */
public replayTree(options?: {
  since?: number;
  limit?: number;
}): WorkflowNode {
  const events = this.getEvents(options);
  const replayer = new WorkflowEventReplayer();
  return replayer.replay(events);
}

/**
 * Clear event history to free memory
 *
 * @param options - Clear options
 *
 * @example Clear all events
 * workflow.clearEvents();
 *
 * @example Keep only last 50 events
 * workflow.clearEvents({ keepLast: 50 });
 *
 * @example Keep only structural events
 * workflow.clearEvents { keepTypes: ['childAttached', 'childDetached', 'treeUpdated'] });
 */
public clearEvents(options?: {
  keepLast?: number;
  keepTypes?: WorkflowEvent['type'][];
}): void {
  if (options?.keepLast) {
    this.node.events = this.node.events.slice(-options.keepLast);
  } else if (options?.keepTypes) {
    this.node.events = this.node.events.filter(e => options.keepTypes!.includes(e.type));
  } else {
    this.node.events = [];
  }
}

/**
 * Get event history statistics
 */
public getEventStats(): {
  total: number;
  byType: Record<string, number>;
  memoryEstimate: number;  // Rough estimate in bytes
} {
  const byType: Record<string, number> = {};

  for (const event of this.node.events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
  }

  // Rough memory estimate (each event ~200 bytes average)
  const memoryEstimate = this.node.events.length * 200;

  return {
    total: this.node.events.length,
    byType,
    memoryEstimate
  };
}
```

---

## 3. Memory Management Strategies

### 3.1 Event Clearing Strategies

#### Strategy 1: Time-Based Expiration

```typescript
// Auto-clear events older than 1 hour
private maxEventAge = 3600000; // 1 hour in ms

public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);

  // Clean old events periodically
  const now = Date.now();
  this.node.events = this.node.events.filter(e => {
    if ('timestamp' in e && typeof e.timestamp === 'number') {
      return now - e.timestamp < this.maxEventAge;
    }
    return true; // Keep events without timestamp
  });
}
```

**Pros**:
- Automatic cleanup
- Keeps recent history

**Cons**:
- O(n) filter on every emitEvent call (performance issue)
- Only works for events with timestamp field
- Still requires full array scan

#### Strategy 2: Count-Based Limit (Recommended)

```typescript
interface WorkflowConfig {
  eventHistorySize?: number;  // Max events to keep (default: unlimited)
  // ...
}

private eventHistorySize: number;

constructor(config: WorkflowConfig) {
  this.eventHistorySize = config.eventHistorySize ?? 0;
  // ...
}

public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);

  // Trim to max size (O(1) amortized)
  if (this.eventHistorySize > 0 && this.node.events.length > this.eventHistorySize) {
    this.node.events.splice(0, this.node.events.length - this.eventHistorySize);
  }
}
```

**Pros**:
- Simple and predictable
- O(1) amortized time (splice is efficient for small removals)
- Works for all event types

**Cons**:
- splice(0, n) is O(n) when removing many events
- Removes oldest events regardless of importance

#### Strategy 3: Segmented Storage (Best for Memory + Functionality)

```typescript
class SegmentedEventStorage {
  private structural: WorkflowEvent[] = [];        // Unlimited
  private state: WorkflowEvent[] = [];             // Bounded (e.g., 1000)
  private metadata: WorkflowEvent[] = [];          // Heavily bounded (e.g., 100)

  private readonly STATE_LIMIT = 1000;
  private readonly METADATA_LIMIT = 100;

  push(event: WorkflowEvent): void {
    switch (event.type) {
      case 'childAttached':
      case 'childDetached':
      case 'treeUpdated':
        this.structural.push(event);
        break;

      case 'stateSnapshot':
      case 'error':
      case 'stepRetry':
      case 'stepRestarted':
      case 'invalidResponse':
        this.state.push(event);
        if (this.state.length > this.STATE_LIMIT) {
          this.state.shift();  // Remove oldest
        }
        break;

      default:
        this.metadata.push(event);
        if (this.metadata.length > this.METADATA_LIMIT) {
          this.metadata.shift();
        }
        break;
    }
  }

  getEvents(options?: {
    types?: WorkflowEvent['type'][];
    limit?: number;
  }): WorkflowEvent[] {
    let events: WorkflowEvent[] = [];

    if (!options?.types || options.types.some(t => ['childAttached', 'childDetached', 'treeUpdated'].includes(t))) {
      events = events.concat(this.structural);
    }

    if (!options?.types || options.types.some(t => ['stateSnapshot', 'error', 'stepRetry', 'stepRestarted', 'invalidResponse'].includes(t))) {
      events = events.concat(this.state);
    }

    if (!options?.types) {
      events = events.concat(this.metadata);
    }

    // Apply type filter
    if (options?.types) {
      events = events.filter(e => options.types!.includes(e.type));
    }

    // Apply limit
    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  clear(): void {
    this.structural = [];
    this.state = [];
    this.metadata = [];
  }

  getStats() {
    return {
      structural: this.structural.length,
      state: this.state.length,
      metadata: this.metadata.length,
      total: this.structural.length + this.state.length + this.metadata.length
    };
  }
}
```

**Pros**:
- Critical structural events never lost
- High-frequency metadata events bounded
- Optimal memory usage
- Targeted replay per segment

**Cons**:
- More complex implementation
- Requires event type categorization

### 3.2 Performance Considerations

#### Array Operations Complexity

| Operation | Array | Circular Buffer | Segmented |
|-----------|-------|-----------------|-----------|
| Push      | O(1) amortized | O(1) | O(1) |
| Get All   | O(1) | O(n) traversal | O(k) segments |
| Filter by Type | O(n) | O(n) | O(1) segment selection |
| Remove Oldest | O(n) splice | O(1) | O(1) shift |
| Clear     | O(1) reassign | O(capacity) | O(1) reassign |

#### Memory Estimates

**Per-event memory usage** (TypeScript V8 engine):
- Small event (simple object): ~100-200 bytes
- Medium event (with nested objects): ~300-500 bytes
- Large event (with node reference): ~1-2 KB (due to object graph)

**Example calculations**:
- 10,000 events × 300 bytes = ~3 MB
- 100,000 events × 300 bytes = ~30 MB
- 1,000,000 events × 300 bytes = ~300 MB

**Recommendation**:
- Default eventHistorySize: 10,000 events (~3 MB)
- For long-running workflows: Use segmented storage
- For high-frequency events: Use circular buffer with capacity 100-1000

#### Garbage Collection Pressure

**Problem**: Frequent array growth causes:
- Old space fragmentation
- Full GC pauses
- Memory spikes

**Solutions**:
1. **Pre-allocate** array capacity if max size known:
   ```typescript
   this.node.events = new Array(maxSize);
   ```

2. **Use circular buffer** for high-frequency events (no reallocation)

3. **Clear old events** periodically instead of letting array grow indefinitely

4. **Event object pooling** (advanced - rarely needed):
   ```typescript
   class EventPool {
     private pool: WorkflowEvent[] = [];

     acquire(): WorkflowEvent {
       return this.pool.pop() || ({} as WorkflowEvent);
     }

     release(event: WorkflowEvent): void {
       this.pool.push(event);
     }
   }
   ```

---

## 4. Best Practices Summary

### 4.1 Event Storage DOs

✅ **DO** use segmented storage for different event types
- Structural events: Unlimited (needed for tree reconstruction)
- State events: Bounded to ~1000
- Metadata events: Heavily bounded to ~100

✅ **DO** provide replay filtering API
- Time-based: `since` parameter
- Count-based: `limit` parameter
- Type-based: `types` parameter

✅ **DO** implement observer catch-up replay
- New observers should receive historical events
- Use `onReplayStart()` and `onReplayEnd()` callbacks
- Allow opt-out with `includeHistorical: false`

✅ **DO** monitor event history size
- Add `getEventStats()` method
- Log warnings when approaching limits
- Provide `clearEvents()` method

✅ **DO** document event memory characteristics
- Estimate per-event size
- Provide memory usage calculator
- Include in workflow health checks

### 4.2 Event Storage DON'Ts

❌ **DON'T** store events indefinitely without bounds
- Leads to memory leaks in long-running workflows
- Causes GC pressure and pauses

❌ **DON'T** filter events on every emitEvent call
- O(n) filter on every push is a performance anti-pattern
- Filter only when retrieving events

❌ **DON'T** use circular buffer for structural events
- Oldest structural events needed for tree reconstruction
- Losing childAttached events breaks replay

❌ **DON'T** replay all events to every new observer by default
- Can be thousands of events
- Provide options to limit replay scope

❌ **DON'T** mutate events after pushing to history
- Events should be immutable
- Use `structuredClone()` if needed for deep copies

---

## 5. Implementation Recommendations for PRP P3.M3.T1.S1

### 5.1 Minimal Implementation (MVP)

**Scope**: Add basic replay API without changing storage mechanism

```typescript
// Add to Workflow class

public getEvents(options?: {
  since?: number;
  limit?: number;
  types?: WorkflowEvent['type'][];
}): WorkflowEvent[] {
  let events = this.node.events;

  if (options?.types) {
    events = events.filter(e => options.types!.includes(e.type));
  }

  if (options?.limit) {
    events = events.slice(-options.limit);
  }

  return events;
}

public clearEvents(options?: { keepLast?: number }): void {
  if (options?.keepLast) {
    this.node.events = this.node.events.slice(-options.keepLast);
  } else {
    this.node.events = [];
  }
}

public getEventStats() {
  const byType: Record<string, number> = {};
  for (const event of this.node.events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
  }
  return { total: this.node.events.length, byType };
}
```

### 5.2 Observer Catch-Up Implementation

```typescript
// Modify addObserver method

interface ReplayOptions {
  since?: number;
  limit?: number;
  types?: WorkflowEvent['type'][];
  includeHistorical?: boolean;
}

public addObserver(observer: WorkflowObserver, options?: ReplayOptions): void {
  if (this.parent) {
    throw new Error('Observers can only be added to root workflows');
  }

  // Catch-up replay
  if (options?.includeHistorical !== false) {
    const historicalEvents = this.getEvents(options);
    for (const event of historicalEvents) {
      try {
        observer.onEvent(event);
      } catch (err) {
        this.logger.error('Observer replay error', { error: err });
      }
    }
  }

  this.observers.push(observer);
}
```

### 5.3 Full Implementation (Future PRP)

**Scope**: Add segmented storage with bounded limits

```typescript
interface WorkflowConfig {
  eventHistorySize?: number;
  stateEventLimit?: number;
  metadataEventLimit?: number;
  // ...
}

class SegmentedEventStorage {
  // Implementation from section 3.1
  // ...
}

// Use in Workflow class
private eventStorage: SegmentedEventStorage;

constructor(config: WorkflowConfig) {
  this.eventStorage = new SegmentedEventStorage({
    stateLimit: config.stateEventLimit ?? 1000,
    metadataLimit: config.metadataEventLimit ?? 100
  });
}

public emitEvent(event: WorkflowEvent): void {
  this.eventStorage.push(event);

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err });
    }
  }
}
```

---

## 6. Additional Research Topics

### 6.1 Event Replay in Event Sourcing Systems

**Key Concepts**:
- **Event Store**: Append-only log of all events
- **Snapshot**: Periodic state save to reduce replay time
- **Projection**: Read model built from event stream
- **Versioning**: Handle event schema evolution

**Relevant Patterns for Workflow Engine**:
1. **Snapshot Strategy**: Save workflow state every N events
2. **Event Versioning**: Upcast old event formats to current schema
3. **CQRS**: Separate event log (write) from queryable state (read)

### 6.2 Observer Pattern Variants

**RxJS ReplaySubject**:
```typescript
import { ReplaySubject } from 'rxjs';

const eventSubject = new ReplaySubject<WorkflowEvent>(100); // Buffer last 100

// Subscribe - receives last 100 events immediately
eventSubject.subscribe(observer);

// Emit
eventSubject.next(event);
```

**Advantages**:
- Built-in replay buffer
- Backpressure handling
- Operators for filtering/map/reduce

**Disadvantages**:
- RxJS dependency (~50 KB)
- Learning curve for reactive programming
- Overkill for simple observer pattern

### 6.3 Circular Buffer Libraries

**@algo-lib/circular-buffer** (hypothetical example):
```typescript
import { CircularBuffer } from '@algo-lib/circular-buffer';

const buffer = new CircularBuffer<WorkflowEvent>(1000);
buffer.push(event);
const events = buffer.toArray();
```

**Recommendation**: Implement custom circular buffer for WorkflowEvent type to:
- Avoid external dependencies
- Optimize for specific event filtering needs
- Control memory management strategy

---

## 7. Testing Considerations

### 7.1 Unit Tests for Event History

```typescript
describe('Workflow Event History', () => {
  it('should store events in node.events array', () => {
    const workflow = new Workflow('test');
    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    expect(workflow.node.events).toHaveLength(1);
  });

  it('should filter events by type', () => {
    const workflow = new Workflow('test');
    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    workflow.emitEvent({ type: 'error', node: workflow.node, error: {} });

    const errors = workflow.getEvents({ types: ['error'] });
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('error');
  });

  it('should limit event count', () => {
    const workflow = new Workflow('test');
    for (let i = 0; i < 100; i++) {
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    }

    const recent = workflow.getEvents({ limit: 10 });
    expect(recent).toHaveLength(10);
  });

  it('should clear events with keepLast option', () => {
    const workflow = new Workflow('test');
    for (let i = 0; i < 100; i++) {
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    }

    workflow.clearEvents({ keepLast: 10 });
    expect(workflow.node.events).toHaveLength(10);
  });
});
```

### 7.2 Memory Leak Tests

```typescript
describe('Event History Memory Management', () => {
  it('should not leak memory with bounded event history', async () => {
    const workflow = new Workflow('test', { eventHistorySize: 1000 });

    // Emit 10,000 events
    for (let i = 0; i < 10000; i++) {
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    }

    // Should only keep last 1000
    expect(workflow.node.events.length).toBeLessThanOrEqual(1000);
  });

  it('should provide memory statistics', () => {
    const workflow = new Workflow('test');
    for (let i = 0; i < 100; i++) {
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    }

    const stats = workflow.getEventStats();
    expect(stats.total).toBe(100);
    expect(stats.memoryEstimate).toBeGreaterThan(0);
  });
});
```

### 7.3 Observer Catch-Up Tests

```typescript
describe('Observer Catch-Up Replay', () => {
  it('should replay historical events to new observer', () => {
    const workflow = new Workflow('test');
    const observer = { onEvent: jest.fn() };

    // Emit events before observer added
    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    workflow.emitEvent({ type: 'error', node: workflow.node, error: {} });

    // Add observer (should receive historical events)
    workflow.addObserver(observer);

    expect(observer.onEvent).toHaveBeenCalledTimes(2);
  });

  it('should limit replay with options', () => {
    const workflow = new Workflow('test');
    const observer = { onEvent: jest.fn() };

    for (let i = 0; i < 100; i++) {
      workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    }

    // Add observer with limit
    workflow.addObserver(observer, { limit: 10 });

    expect(observer.onEvent).toHaveBeenCalledTimes(10);
  });

  it('should filter replay by type', () => {
    const workflow = new Workflow('test');
    const observer = { onEvent: jest.fn() };

    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });
    workflow.emitEvent({ type: 'error', node: workflow.node, error: {} });
    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });

    // Add observer with type filter
    workflow.addObserver(observer, { types: ['error'] });

    expect(observer.onEvent).toHaveBeenCalledTimes(1);
    expect(observer.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });

  it('should not replay historical events if includeHistorical is false', () => {
    const workflow = new Workflow('test');
    const observer = { onEvent: jest.fn() };

    workflow.emitEvent({ type: 'stateSnapshot', node: workflow.node });

    // Add observer without historical replay
    workflow.addObserver(observer, { includeHistorical: false });

    expect(observer.onEvent).not.toHaveBeenCalled();
  });
});
```

---

## 8. References and Further Reading

### 8.1 Event Sourcing Patterns
- **Event Sourcing** by Martin Fowler: https://martinfowler.com/eaaDev/EventSourcing.html
- **CQRS and Event Sourcing** by Greg Young: https://www.codeproject.com/Articles/555121/Introduction-to-CQRS
- **Event Sourcing in TypeScript**: Search for "TypeScript event sourcing implementation" (requires web access)

### 8.2 Circular Buffer Implementations
- **Ring Buffer (Circular Buffer) Data Structure**: https://en.wikipedia.org/wiki/Circular_buffer
- **JavaScript Circular Buffer**: Search for "JavaScript circular buffer implementation O(1)" (requires web access)

### 8.3 Observer Pattern Variants
- **RxJS ReplaySubject Documentation**: https://rxjs.dev/guide/subject
- **Observer Pattern in TypeScript**: Search for "TypeScript observer pattern catch-up replay" (requires web access)

### 8.4 Memory Management
- **V8 Garbage Collection**: https://v8.dev/blog/trash-talk
- **JavaScript Memory Profiling**: https://developer.chrome.com/docs/devtools/memory-problems/

### 8.5 Existing Codebase References
- Workflow class: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- WorkflowEvent types: `/home/dustin/projects/groundswell/src/types/events.ts`
- WorkflowEventReplayer: `/home/dustin/projects/groundswell/src/debugger/event-replayer.ts`
- EventTreeHandle: `/home/dustin/projects/groundswell/src/core/event-tree.ts`

---

## 9. Conclusion

The research indicates that the existing codebase has a solid foundation for event history storage and replay:

**Strengths**:
- Well-defined WorkflowEvent discriminated union with ~20 event types
- Working WorkflowEventReplayer for tree reconstruction
- Observer pattern already implemented
- Event storage in `node.events` array

**Gaps Identified**:
1. No replay filtering API (since, limit, types)
2. No observer catch-up replay mechanism
3. No memory management (unbounded event growth)
4. No event clearing strategy

**Recommended Implementation Approach**:

**Phase 1 (MVP - Current PRP)**:
- Add `getEvents()` method with filtering (limit, types)
- Add `clearEvents()` method
- Add `getEventStats()` method
- Modify `addObserver()` to support catch-up replay with options

**Phase 2 (Future PRP)**:
- Implement segmented event storage
- Add configurable limits per event type
- Add automatic memory management
- Add event replay performance monitoring

**Phase 3 (Advanced)**:
- Implement circular buffer for high-frequency events
- Add snapshot strategy for long-running workflows
- Add event versioning and upcasting support
- Add compression for archived events

This phased approach allows incremental value delivery while managing implementation complexity and risk.
