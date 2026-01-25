# Observable Patterns Research

## Custom Observable Implementation

**Location**: `src/utils/observable.ts`

### Observable Class Structure

```typescript
export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();
  private logger?: ObservableLogger;

  constructor(logger?: ObservableLogger) {
    this.logger = logger;
  }

  subscribe(observer: Observer<T>): Subscription
  next(value: T): void
  error(err: unknown): void
  complete(): void
  get subscriberCount(): number
}
```

### Observer Interface

```typescript
export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}
```

### Subscription Interface

```typescript
export interface Subscription {
  unsubscribe(): void;
}
```

### Logger Interface

```typescript
export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}
```

**Matches** `WorkflowLogger.error()` signature for compatibility.

## Observable Usage in WorkflowTreeDebugger

### Current Implementation

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  public readonly events: Observable<WorkflowEvent>;

  constructor(workflow: Workflow) {
    this.events = new Observable<WorkflowEvent>();
    // ...
  }

  onEvent(event: WorkflowEvent): void {
    // ... handle structural events ...

    // Always forward to event stream
    this.events.next(event);
  }
}
```

### Event Flow Diagram

```
┌─────────────┐
│   Workflow  │
└─────┬───────┘
      │ emitEvent()
      ▼
┌─────────────────────────────┐
│ WorkflowTreeDebugger        │
│  ┌─────────────────────┐    │
│  │ onEvent(event)      │    │
│  │  1. [persist?]      │    │ ← Hook for persistence
│  │  2. handle structural│    │
│  │  3. events.next()   │    │
│  └─────────────────────┘    │
│           │                 │
│           ▼                 │
│  ┌─────────────────────┐    │
│  │ events (Observable) │    │
│  └─────────────────────┘    │
└─────┬───────────────────────┘
      │
      ├──────────────────┐
      ▼                  ▼
┌──────────┐      ┌──────────────┐
│Subscriber│      │  Subscriber  │
│    1     │      │      2       │
└──────────┘      └──────────────┘
```

## Persistence Integration Points

### 1. onEvent() Hook

**Current flow**:
```typescript
onEvent(event: WorkflowEvent): void {
  // Handle structural events
  switch (event.type) {
    case 'childAttached':
      this.buildNodeMap(event.child);
      break;
    // ...
  }

  // Forward to event stream
  this.events.next(event);
}
```

**With persistence**:
```typescript
onEvent(event: WorkflowEvent): void {
  // NEW: Capture event for history
  if (this.persistEvents) {
    this.eventHistory.push(event);
  }

  // Handle structural events
  switch (event.type) {
    case 'childAttached':
      this.buildNodeMap(event.child);
      break;
    // ...
  }

  // Forward to event stream
  this.events.next(event);
}
```

### 2. Subscription Pattern

External code can subscribe to the event stream:

```typescript
const debugger = new WorkflowTreeDebugger(workflow);

// Subscribe to all events
const subscription = debugger.events.subscribe({
  next: (event) => {
    console.log('Event:', event.type);
  },
  error: (err) => {
    console.error('Stream error:', err);
  },
  complete: () => {
    console.log('Stream complete');
  },
});

// Unsubscribe when done
subscription.unsubscribe();
```

**For persistence**, we could also expose an Observable of the event history:

```typescript
getEventHistoryStream(): Observable<WorkflowEvent[]> {
  return new Observable<WorkflowEvent[]>(observer => {
    // Emit current history
    observer.next(this.eventHistory);

    // Emit updated history on each new event
    const subscription = this.events.subscribe({
      next: () => {
        observer.next(this.eventHistory);
      },
    });

    // Return cleanup function
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  });
}
```

### 3. Event Filtering

The Observable pattern allows filtering events before persistence:

```typescript
// Only persist structural events
onEvent(event: WorkflowEvent): void {
  if (this.persistEvents) {
    // Optional: Filter by event type
    const structuralEvents = ['childAttached', 'childDetached', 'treeUpdated'];
    if (structuralEvents.includes(event.type)) {
      this.eventHistory.push(event);
    } else {
      this.eventHistory.push(event); // Or persist all events
    }
  }

  // ... rest of handler
}
```

## Observable Error Handling

### Error Isolation Pattern

From the Observable implementation:

```typescript
next(value: T): void {
  for (const subscriber of this.subscribers) {
    try {
      subscriber.next?.(value);
    } catch (err) {
      this.logError('Observable subscriber error', err);
    }
  }
}
```

**Key insight**: Errors in one subscriber don't affect other subscribers.

**Apply to persistence**:
```typescript
onEvent(event: WorkflowEvent): void {
  // Isolate persistence errors from event stream
  if (this.persistEvents) {
    try {
      this.eventHistory.push(event);
    } catch (err) {
      console.error('Failed to persist event:', err);
      // Don't throw - event stream continues
    }
  }

  // ... rest of handler
}
```

### Logger Injection

Observable can be initialized with a logger:

```typescript
this.events = new Observable<WorkflowEvent>(logger);
```

**For persistence**, we could inject a logger for file operation errors:

```typescript
constructor(
  workflow: Workflow,
  options: {
    persistEvents?: boolean;
    logger?: ObservableLogger;
  } = {}
) {
  this.root = workflow.getNode();
  this.events = new Observable<WorkflowEvent>(options.logger);
  this.persistEvents = options.persistEvents ?? false;
  this.logger = options.logger;

  if (this.persistEvents) {
    this.eventHistory = [];
  }

  this.buildNodeMap(this.root);
  workflow.addObserver(this);
}
```

## Memory Management

### Subscription Cleanup

Subscribers must unsubscribe to prevent memory leaks:

```typescript
class EventConsumer {
  private subscription?: Subscription;

  start(debugger: WorkflowTreeDebugger) {
    this.subscription = debugger.events.subscribe({
      next: (event) => this.handleEvent(event),
    });
  }

  stop() {
    this.subscription?.unsubscribe();
  }
}
```

### Event History Growth

The event history array grows unbounded:

```typescript
this.eventHistory.push(event); // Grows forever
```

**Mitigation strategies**:

1. **Max size limit**:
```typescript
private maxEventHistorySize = 10000;

if (this.persistEvents) {
  this.eventHistory.push(event);
  if (this.eventHistory.length > this.maxEventHistorySize) {
    this.eventHistory.shift(); // Remove oldest
  }
}
```

2. **Sampling for high-frequency events**:
```typescript
private eventSamplingRate = 1.0; // 100% by default

if (this.persistEvents) {
  if (Math.random() < this.eventSamplingRate) {
    this.eventHistory.push(event);
  }
}
```

3. **Explicit cleanup method**:
```typescript
clearEventHistory(): void {
  this.eventHistory = [];
}
```

## Testing Observable Patterns

### Existing Test Patterns

From `src/__tests__/unit/observable.test.ts`:

```typescript
describe('Observable', () => {
  it('should emit values to subscribers', () => {
    const observable = new Observable<number>();
    const values: number[] = [];

    observable.subscribe({
      next: (value) => values.push(value),
    });

    observable.next(1);
    observable.next(2);

    expect(values).toEqual([1, 2]);
  });

  it('should isolate subscriber errors', () => {
    const observable = new Observable<number>();
    let secondReceived = false;

    observable.subscribe({
      next: () => {
        throw new Error('Subscriber error');
      },
    });

    observable.subscribe({
      next: () => {
        secondReceived = true;
      },
    });

    observable.next(1);

    expect(secondReceived).toBe(true);
  });
});
```

### Test Pattern for Persistence

```typescript
describe('WorkflowTreeDebugger event persistence', () => {
  it('should accumulate event history when enabled', () => {
    const workflow = new TestWorkflow();
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    // Trigger some events
    await workflow.run();

    const history = debugger.getEventHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('type');
  });

  it('should not accumulate events when disabled', () => {
    const workflow = new TestWorkflow();
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: false,
    });

    await workflow.run();

    const history = debugger.getEventHistory();
    expect(history.length).toBe(0);
  });

  it('should preserve event order', async () => {
    const workflow = new TestWorkflow();
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    const receivedTypes: string[] = [];
    debugger.events.subscribe({
      next: (event) => receivedTypes.push(event.type),
    });

    await workflow.run();

    const history = debugger.getEventHistory();
    const historyTypes = history.map(e => e.type);

    expect(historyTypes).toEqual(receivedTypes);
  });
});
```

## Best Practices

### 1. Immutability

Events should be treated as immutable:

```typescript
onEvent(event: WorkflowEvent): void {
  if (this.persistEvents) {
    // Store reference, don't modify
    this.eventHistory.push(event);
    // Don't do: event.timestamp = Date.now();
  }
}
```

### 2. Defensive Copying

For safety, consider copying events:

```typescript
onEvent(event: WorkflowEvent): void {
  if (this.persistEvents) {
    // Shallow copy to prevent external modification
    this.eventHistory.push({ ...event });
  }
}
```

**Trade-off**: More memory usage vs. safety.

### 3. Type Safety

Preserve discriminated union type:

```typescript
private eventHistory: WorkflowEvent[] = [];

getEventHistory(): WorkflowEvent[] {
  // Return copy to prevent external modification
  return [...this.eventHistory];
}
```

### 4. Async Event Handling

For async persistence (e.g., writing to file):

```typescript
private eventQueue: WorkflowEvent[] = [];
private processingQueue = false;

async onEvent(event: WorkflowEvent): void {
  if (this.persistEvents) {
    this.eventHistory.push(event);
    this.eventQueue.push(event);
    await this.processQueue();
  }

  // ... rest of handler
}

private async processQueue(): Promise<void> {
  if (this.processingQueue || this.eventQueue.length === 0) {
    return;
  }

  this.processingQueue = true;

  try {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      // Process event (e.g., write to file)
      await this.persistToFile(event);
    }
  } finally {
    this.processingQueue = false;
  }
}
```

## Integration with File I/O

### Streaming Events to File

For long-running workflows, stream events to file incrementally:

```typescript
private writeStream?: WriteStream;

async enableFilePersistence(path: string): Promise<void> {
  this.writeStream = createWriteStream(path);

  // Subscribe to events and write to file
  this.events.subscribe({
    next: async (event) => {
      if (this.writeStream) {
        const serialized = serializeWorkflowEvent(event);
        const json = JSON.stringify(serialized);
        this.writeStream.write(json + '\n');
      }
    },
  });
}

async disableFilePersistence(): Promise<void> {
  if (this.writeStream) {
    this.writeStream.end();
    this.writeStream = undefined;
  }
}
```

### Buffered Writing

Batch events for efficient file writes:

```typescript
private eventBuffer: WorkflowEvent[] = [];
private bufferSize = 100;

onEvent(event: WorkflowEvent): void {
  if (this.persistEvents) {
    this.eventHistory.push(event);
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }
}

private flushBuffer(): void {
  if (this.eventBuffer.length === 0) return;

  const toWrite = this.eventBuffer;
  this.eventBuffer = [];

  // Write to file asynchronously
  writeFile(this.filePath, JSON.stringify(toWrite))
    .catch(err => console.error('Failed to write buffer:', err));
}
```

## Key Takeaways

1. **Custom Observable**: Lightweight, no RxJS dependency
2. **Error isolation**: One subscriber failure doesn't break others
3. **Event flow**: All events go through `onEvent()` - perfect hook for persistence
4. **Memory management**: Unbounded growth requires mitigation strategy
5. **Type safety**: Preserve WorkflowEvent discriminated union type
6. **Immutability**: Events should not be modified after emission
7. **Async considerations**: File operations should be async and buffered
