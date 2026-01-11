# External Research: Event Propagation Testing in TypeScript/JavaScript

**Research Date:** 2026-01-11
**Project:** Groundswell - Event Propagation Testing for P1M2T2S4

---

## Summary

This document compiles external best practices for testing event propagation in TypeScript/JavaScript testing frameworks, with a focus on Vitest (the framework used by Groundswell), Jest patterns, and general event testing patterns. Research includes official documentation patterns, community best practices, and examples from open-source projects.

---

## 1. Vitest Event Testing Patterns

### 1.1 Official Vitest Documentation

**Relevant Documentation URLs:**
- [Vitest Mock Functions](https://vitest.dev/guide/mocking.html) - Mock functions for tracking event calls
- [Vitest Assertion API](https://vitest.dev/api/expect.html) - Built-in assertions for event testing
- [Vitest Async Testing](https://vitest.dev/guide/testing.html#testing-async) - Patterns for async event handling

**Key Insights:**

1. **Mock Functions with `vi.fn()`**
   ```typescript
   import { vi, expect } from 'vitest'

   // Create mock observer
   const mockObserver = {
     onEvent: vi.fn(),
     onLog: vi.fn(),
     onStateUpdated: vi.fn(),
     onTreeChanged: vi.fn()
   }

   // Attach and trigger events
   workflow.addObserver(mockObserver)
   await workflow.run()

   // Verify event was called
   expect(mockObserver.onEvent).toHaveBeenCalled()
   ```

2. **Call Tracking and Verification**
   ```typescript
   // Verify specific number of calls
   expect(mockObserver.onEvent).toHaveBeenCalledTimes(5)

   // Verify called with specific arguments
   expect(mockObserver.onEvent).toHaveBeenCalledWith(
     expect.objectContaining({ type: 'stepStart' })
   )

   // Verify specific call index
   expect(mockObserver.onEvent).toHaveBeenNthCalledWith(2, expectedEvent)
   ```

3. **Implementation Details Access**
   ```typescript
   // Access call history
   const calls = mockObserver.onEvent.mock.calls
   const firstCallArgs = calls[0][0]

   // Check if a specific event type was emitted
   const hasErrorEvent = mockObserver.onEvent.mock.calls.some(
     call => call[0]?.type === 'error'
   )
   ```

### 1.2 Vitest Async Testing Patterns

**Testing Async Event Emission:**

```typescript
test('should emit event after async operation', async () => {
  const events: WorkflowEvent[] = []
  const observer = {
    onEvent: (event: WorkflowEvent) => events.push(event)
  }

  workflow.addObserver(observer)

  // Run and wait for completion
  await workflow.run()

  // Verify events were collected
  expect(events.length).toBeGreaterThan(0)
  expect(events.some(e => e.type === 'stepStart')).toBe(true)
})
```

**Using Promises for Event Verification:**

```typescript
test('should resolve when specific event is emitted', async () => {
  const eventPromise = new Promise<WorkflowEvent>((resolve) => {
    const observer = {
      onEvent: (event: WorkflowEvent) => {
        if (event.type === 'stepStart') {
          resolve(event)
        }
      }
    }
    workflow.addObserver(observer)
  })

  // Trigger workflow
  workflow.run()

  // Wait for specific event
  const event = await eventPromise
  expect(event.type).toBe('stepStart')
})
```

---

## 2. Jest Event Testing Patterns

**Relevant Documentation URLs:**
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest Async Testing](https://jestjs.io/docs/asynchronous)
- [Jest Timer Mocks](https://jestjs.io/docs/timer-mocks) - For testing delayed events

**Key Patterns (Compatible with Vitest):**

### 2.1 Basic Event Mocking

```typescript
// Spy on event handler
const handleEvent = jest.fn()
emitter.on('test', handleEvent)

// Trigger event
emitter.emit('test', { data: 'value' })

// Assertions
expect(handleEvent).toHaveBeenCalledWith({ data: 'value' })
expect(handleEvent).toHaveBeenCalledTimes(1)
```

### 2.2 Event Propagation Testing

```typescript
// Test parent-child event propagation
const parentEvents: string[] = []
const childEvents: string[] = []

const parentObserver = {
  onEvent: (e) => parentEvents.push(e.type)
}
const childObserver = {
  onEvent: (e) => childEvents.push(e.type)
}

parentWorkflow.addObserver(parentObserver)
childWorkflow.addObserver(childObserver)

// Trigger child workflow
await childWorkflow.run()

// Verify events propagated to parent
expect(childEvents.length).toBeGreaterThan(0)
expect(parentEvents.some(e => e.includes('child'))).toBe(true)
```

### 2.3 Discriminated Union Event Testing

```typescript
// Testing discriminated union types (like WorkflowEvent)
const errorEvents = events.filter((e): e is Extract<WorkflowEvent, { type: 'error' }> =>
  e.type === 'error'
)

expect(errorEvents[0].error.message).toBeDefined()
expect(errorEvents[0].error.state).toBeDefined()
```

---

## 3. Mock Observer Patterns

### 3.1 Simple Observer Mock

```typescript
// Create a minimal mock
const mockObserver: WorkflowObserver = {
  onLog: vi.fn(),
  onEvent: vi.fn(),
  onStateUpdated: vi.fn(),
  onTreeChanged: vi.fn()
}
```

### 3.2 Collecting Observer

```typescript
// Observer that collects all events for inspection
class EventCollector implements WorkflowObserver {
  logs: LogEntry[] = []
  events: WorkflowEvent[] = []
  stateUpdates: WorkflowNode[] = []
  treeChanges: WorkflowNode[] = []

  onLog(entry: LogEntry) {
    this.logs.push(entry)
  }

  onEvent(event: WorkflowEvent) {
    this.events.push(event)
  }

  onStateUpdated(node: WorkflowNode) {
    this.stateUpdates.push(node)
  }

  onTreeChanged(root: WorkflowNode) {
    this.treeChanges.push(root)
  }

  // Helper methods
  getEventsByType<T extends WorkflowEvent['type']>(
    type: T
  ): Extract<WorkflowEvent, { type: T }>[] {
    return this.events.filter(e => e.type === type) as any
  }

  hasEventOfType(type: WorkflowEvent['type']): boolean {
    return this.events.some(e => e.type === type)
  }
}
```

### 3.3 Selective Observer

```typescript
// Observer that only handles specific event types
const selectiveObserver = {
  onLog: vi.fn(),
  onEvent: vi.fn((event: WorkflowEvent) => {
    // Only log error events
    if (event.type === 'error') {
      console.error('Error event:', event)
    }
  }),
  onStateUpdated: vi.fn(),
  onTreeChanged: vi.fn()
}
```

### 3.4 Promise-Based Observer

```typescript
// Observer that resolves promise on specific event
class EventAwaiter implements WorkflowObserver {
  private waitForType: WorkflowEvent['type'] | null = null
  private currentPromise: Promise<WorkflowEvent> | null = null
  private currentResolve: ((event: WorkflowEvent) => void) | null = null

  onLog() {}
  onEvent(event: WorkflowEvent) {
    if (this.currentResolve && this.waitForType === event.type) {
      this.currentResolve(event)
      this.currentResolve = null
      this.waitForType = null
    }
  }
  onStateUpdated() {}
  onTreeChanged() {}

  waitForEvent(type: WorkflowEvent['type']): Promise<WorkflowEvent> {
    this.waitForType = type
    this.currentPromise = new Promise(resolve => {
      this.currentResolve = resolve
    })
    return this.currentPromise!
  }
}

// Usage
const awaiter = new EventAwaiter()
workflow.addObserver(awaiter)

// Start async operation
workflow.run()

// Wait for specific event
const errorEvent = await awaiter.waitForEvent('error')
expect(errorEvent.type).toBe('error')
```

---

## 4. Testing Parent-Child Tree Structures

### 4.1 Hierarchical Event Propagation

```typescript
test('events propagate from child to parent', async () => {
  const parent = new Workflow('Parent')
  const child = new Workflow('Child', parent)

  const parentEvents: WorkflowEvent[] = []
  const childEvents: WorkflowEvent[] = []

  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => parentEvents.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  })

  child.addObserver({
    onLog: () => {},
    onEvent: (e) => childEvents.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  })

  await child.run()

  // Child should have its own events
  expect(childEvents.length).toBeGreaterThan(0)

  // Parent should receive child events (bubbling)
  expect(parentEvents.some(e =>
    'node' in e && e.node.id === child.id
  )).toBe(true)
})
```

### 4.2 Tree Structure Verification

```typescript
test('maintains correct parent-child relationships', () => {
  const root = new Workflow('Root')
  const child1 = new Workflow('Child1', root)
  const child2 = new Workflow('Child2', root)
  const grandchild = new Workflow('Grandchild', child1)

  // Verify parent references
  expect(child1.parent).toBe(root)
  expect(child2.parent).toBe(root)
  expect(grandchild.parent).toBe(child1)

  // Verify children arrays
  expect(root.children).toContain(child1)
  expect(root.children).toContain(child2)
  expect(child1.children).toContain(grandchild)

  // Verify node tree structure
  const rootNode = root.getNode()
  expect(rootNode.children.length).toBe(2)
  expect(rootNode.children[0].children.length).toBe(1)
})
```

### 4.3 Event Source Tracking

```typescript
test('events track their source node', async () => {
  const root = new Workflow('Root')
  const child = new Workflow('Child', root)

  const events: WorkflowEvent[] = []

  root.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  })

  await child.run()

  // Find events from child
  const childEvents = events.filter(e =>
    'node' in e && e.node.id === child.id
  )

  expect(childEvents.length).toBeGreaterThan(0)

  // Verify event has node reference
  expect(childEvents[0]).toHaveProperty('node')
  expect(childEvents[0].node.name).toBe('Child')
})
```

### 4.4 Cycle Detection Testing

```typescript
test('detects and prevents cycles in observer tree', () => {
  const root = new Workflow('Root')
  const child = new Workflow('Child', root)

  // Attempting to create a cycle should throw or be prevented
  expect(() => {
    new Workflow('Cycle', child)
    // Then trying to make root a child of grandchild would create cycle
    root.parent = child // This should be prevented
  }).toThrow()
})
```

---

## 5. Async Event Testing Patterns

### 5.1 Basic Async Event Testing

```typescript
test('handles async event emission', async () => {
  const events: WorkflowEvent[] = []

  const observer = {
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  }

  workflow.addObserver(observer)
  await workflow.run()

  // Verify async events completed
  expect(events.some(e => e.type === 'stepStart')).toBe(true)
  expect(events.some(e => e.type === 'stepEnd')).toBe(true)
})
```

### 5.2 Promise-Based Event Waiting

```typescript
test('waits for specific event to occur', async () => {
  let stepStartEvent: WorkflowEvent | null = null

  const observer = {
    onLog: () => {},
    onEvent: (e) => {
      if (e.type === 'stepStart') {
        stepStartEvent = e
      }
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  }

  workflow.addObserver(observer)

  // Run in background
  const runPromise = workflow.run()

  // Wait for event (polling)
  await vi.waitUntil(() => stepStartEvent !== null, { timeout: 5000 })

  expect(stepStartEvent).toBeDefined()
  expect(stepStartEvent!.type).toBe('stepStart')

  // Ensure workflow completes
  await runPromise
})
```

### 5.3 Multiple Async Events

```typescript
test('collects multiple async events in order', async () => {
  const events: WorkflowEvent[] = []

  workflow.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  })

  await workflow.run()

  // Verify event order
  const stepStartIndex = events.findIndex(e => e.type === 'stepStart')
  const stepEndIndex = events.findIndex(e => e.type === 'stepEnd')

  expect(stepStartIndex).toBeGreaterThanOrEqual(0)
  expect(stepEndIndex).toBeGreaterThan(stepStartIndex)
})
```

### 5.4 Concurrent Workflows

```typescript
test('handles concurrent workflow events', async () => {
  const allEvents: Map<string, WorkflowEvent[]> = new Map()

  const workflows = [
    new Workflow('Workflow1'),
    new Workflow('Workflow2'),
    new Workflow('Workflow3')
  ]

  workflows.forEach(wf => {
    allEvents.set(wf.id, [])
    wf.addObserver({
      onLog: () => {},
      onEvent: (e) => allEvents.get(wf.id)!.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {}
    })
  })

  // Run all workflows concurrently
  await Promise.all(workflows.map(wf => wf.run()))

  // Verify each workflow emitted events
  workflows.forEach(wf => {
    const events = allEvents.get(wf.id)!
    expect(events.length).toBeGreaterThan(0)
  })
})
```

### 5.5 Timeout-Based Testing

```typescript
test('event emission completes within timeout', async () => {
  const startTime = Date.now()
  let eventReceived = false

  const observer = {
    onLog: () => {},
    onEvent: (e) => {
      if (e.type === 'stepStart') {
        eventReceived = true
      }
    },
    onStateUpdated: () => {},
    onTreeChanged: () => {}
  }

  workflow.addObserver(observer)

  await workflow.run()

  const duration = Date.now() - startTime

  expect(eventReceived).toBe(true)
  expect(duration).toBeLessThan(1000) // Should complete in < 1s
})
```

---

## 6. Assertion Patterns for Event Verification

### 6.1 Event Type Checking

```typescript
// Check event exists
expect(events.some(e => e.type === 'error')).toBe(true)

// Count specific event types
const errorCount = events.filter(e => e.type === 'error').length
expect(errorCount).toBe(1)

// Using discriminated unions
const stepStartEvents = events.filter(
  (e): e is Extract<WorkflowEvent, { type: 'stepStart' }> =>
    e.type === 'stepStart'
)
```

### 6.2 Event Property Verification

```typescript
// Verify specific event properties
const errorEvent = events.find(e => e.type === 'error')
expect(errorEvent).toBeDefined()

if (errorEvent && errorEvent.type === 'error') {
  expect(errorEvent.error.message).toBe('Expected error')
  expect(errorEvent.error.state).toBeDefined()
  expect(errorEvent.error.logs).toBeInstanceOf(Array)
}

// Using expect.objectContaining
expect(events).toContainEqual(
  expect.objectContaining({
    type: 'stepStart',
    node: expect.objectContaining({
      name: 'TestWorkflow'
    })
  })
)
```

### 6.3 Event Order Verification

```typescript
// Verify events occurred in order
const eventTypes = events.map(e => e.type)
const stepStartIndex = eventTypes.indexOf('stepStart')
const stepEndIndex = eventTypes.indexOf('stepEnd')

expect(stepStartIndex).toBeLessThan(stepEndIndex)

// Or using array methods
let foundStart = false
let foundEndAfterStart = false

for (const event of events) {
  if (event.type === 'stepStart') foundStart = true
  if (foundStart && event.type === 'stepEnd') foundEndAfterStart = true
}

expect(foundEndAfterStart).toBe(true)
```

### 6.4 Event Cardinality Verification

```typescript
// Verify exact number of events
expect(events.filter(e => e.type === 'stepStart').length).toBe(3)

// Verify at least N events
expect(events.filter(e => e.type === 'stepStart').length).toBeGreaterThanOrEqual(1)

// Verify at most N events
expect(events.filter(e => e.type === 'error').length).toBeLessThanOrEqual(1)
```

### 6.5 Custom Assertion Helpers

```typescript
// Helper function for event assertions
function expectEvent(
  events: WorkflowEvent[],
  type: WorkflowEvent['type'],
  properties?: Partial<Extract<WorkflowEvent, { type: typeof type }>>
) {
  const event = events.find(e => e.type === type)

  if (!event) {
    throw new Error(`Expected event of type "${type}" not found`)
  }

  if (properties) {
    expect(event).toMatchObject(properties)
  }

  return event
}

// Usage
expectEvent(events, 'stepStart', {
  node: { name: 'TestStep' }
})

expectEvent(events, 'error', {
  error: {
    message: expect.any(String),
    state: expect.any(Object)
  }
})
```

### 6.6 Event Filter Predicates

```typescript
// Complex filtering with predicates
const eventsFromNode = events.filter(e =>
  'node' in e && e.node.id === workflow.id
)

const errorEventsWithState = events.filter(e =>
  e.type === 'error' && 'state' in e.error && e.error.state !== null
)

const stepEventsForName = events.filter(e =>
  (e.type === 'stepStart' || e.type === 'stepEnd') &&
  'step' in e && e.step === 'myStep'
)
```

---

## 7. Best Practices Summary

### 7.1 Test Structure

1. **Arrange-Act-Assert Pattern**
   ```typescript
   test('emits events correctly', async () => {
     // Arrange: Set up observers
     const events: WorkflowEvent[] = []
     const observer = { onEvent: (e) => events.push(e), ... }

     // Act: Trigger workflow
     workflow.addObserver(observer)
     await workflow.run()

     // Assert: Verify events
     expect(events.length).toBeGreaterThan(0)
   })
   ```

2. **Descriptive Test Names**
   - Use "should" pattern: "should emit error event when step fails"
   - Include what, when, and expected outcome

3. **Isolation**
   - Each test should set up its own observers
   - Clean up observers after test if needed

### 7.2 Observer Design

1. **Use Mock Functions for Tracking**
   ```typescript
   const mockObserver = {
     onEvent: vi.fn(),
     onLog: vi.fn(),
     ...
   }
   ```

2. **Use Collectors for Verification**
   ```typescript
   const events: WorkflowEvent[] = []
   const observer = { onEvent: (e) => events.push(e), ... }
   ```

3. **Mix Approaches as Needed**
   - Mock for call count verification
   - Collector for detailed event inspection

### 7.3 Async Handling

1. **Always await async operations**
   ```typescript
   await workflow.run() // Don't forget await!
   ```

2. **Handle timeouts appropriately**
   ```typescript
   await vi.waitUntil(() => condition, { timeout: 5000 })
   ```

3. **Test concurrent operations**
   ```typescript
   await Promise.all([workflow1.run(), workflow2.run()])
   ```

### 7.4 Type Safety

1. **Use discriminated unions for event filtering**
   ```typescript
   const errorEvents = events.filter(
     (e): e is Extract<WorkflowEvent, { type: 'error' }> =>
       e.type === 'error'
   )
   ```

2. **Type guards for conditional checks**
   ```typescript
   if (event.type === 'error') {
     // TypeScript knows event.error exists here
     expect(event.error.message).toBeDefined()
   }
   ```

### 7.5 Performance Considerations

1. **Avoid creating observers in hot loops**
2. **Clean up observers in afterEach if needed**
3. **Use efficient filtering (filter once, then use result)**

---

## 8. Community Resources and Examples

### 8.1 Official Documentation

- **Vitest Docs**: https://vitest.dev/
  - [Mock Functions Guide](https://vitest.dev/guide/mocking.html)
  - [Assertion API](https://vitest.dev/api/expect.html)
  - [Async Testing](https://vitest.dev/guide/testing.html)

- **Jest Docs**: https://jestjs.io/
  - [Mock Functions](https://jestjs.io/docs/mock-functions)
  - [Async Testing](https://jestjs.io/docs/asynchronous)
  - [Timer Mocks](https://jestjs.io/docs/timer-mocks)

### 8.2 Testing Libraries

- **Testing Library** (for component event testing): https://testing-library.com/
- **RxJS Marble Testing** (for observable event streams): https://rxjs.dev/guide/testing/marble-testing

### 8.3 Blog Posts and Articles

- "Testing Event-Driven Applications" - Patterns for testing event propagation
- "Observer Pattern in TypeScript" - Implementation and testing strategies
- "Async/Await Testing Patterns" - Best practices for async test code

### 8.4 GitHub Examples

Projects with extensive event testing:
- **RxJS**: Observable/stream testing patterns
- **EventEmitter2**: Node.js event library tests
- **React**: Synthetic event testing in React Test Utils

---

## 9. Current Project Patterns

Based on analysis of the Groundswell codebase:

### 9.1 Current Observer Interface

Located in `/home/dustin/projects/groundswell/src/types/observer.ts`:

```typescript
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

### 9.2 Current Event Types

Located in `/home/dustin/projects/groundswell/src/types/events.ts`:

Discriminated union including:
- `childAttached`
- `stateSnapshot`
- `stepStart`, `stepEnd`
- `error`
- `taskStart`, `taskEnd`
- `treeUpdated`
- Agent, tool, MCP, reflection, and cache events

### 9.3 Current Testing Patterns

The project uses:
1. **Collector Pattern**: Arrays to collect events
2. **Inline Observer Objects**: Defined in tests
3. **Vitest**: Testing framework
4. **Filter-based assertions**: Using `.filter()`, `.find()`, `.some()`

### 9.4 Areas for Enhancement

Based on external best practices:

1. **Add Mock Function Usage**: Use `vi.fn()` for call tracking
2. **Create Test Utilities**: EventCollector helper class
3. **Custom Matchers**: Specialized assertions for events
4. **Async Testing Patterns**: Better promise-based event waiting
5. **Tree Traversal Helpers**: Utilities for parent-child verification

---

## 10. Recommendations for P1M2T2S4

### 10.1 Immediate Implementation

1. **Add EventCollector utility class** for reusable test helpers
2. **Use `vi.fn()` mock tracking** alongside collectors
3. **Add custom assertion helpers** for common event checks

### 10.2 Test Enhancement

1. **Add cycle detection tests** for getRootObservers
2. **Test event propagation through multiple levels**
3. **Test concurrent observer additions/removals**
4. **Add performance tests** for large observer trees

### 10.3 Documentation

1. **Document observer pattern** in project docs
2. **Create testing guide** for event propagation
3. **Add examples** of common testing scenarios

---

## References

- Vitest Documentation: https://vitest.dev/
- Jest Documentation: https://jestjs.io/
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
- Testing Library: https://testing-library.com/

---

**End of Research Document**
