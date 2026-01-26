# Codebase Workflow Analysis

## Overview

This document analyzes the existing `Workflow` class implementation to understand how to add event history storage and replay capability.

## Key Files

### src/core/workflow.ts

**Current Event System:**
- Line 483-499: `emitEvent(event: WorkflowEvent)` method
  - Pushes event to `this.node.events` array
  - Notifies all root observers via `observer.onEvent(event)`
  - Handles treeUpdated events specially

**Observer Management:**
- Line 83: `private observers: WorkflowObserver[] = []`
- Line 189-204: `getRootObservers()` - Traverses parent chain to find root
- Line 301-316: `addObserver()` and `removeObserver()` methods

**Node Structure:**
- Line 80: `public readonly node: WorkflowNode`
- WorkflowNode has `events: WorkflowEvent[]` field (unbounded)

**Existing Pattern for Emission:**
```typescript
public emitEvent(event: WorkflowEvent): void {
  this.node.events.push(event);  // Add to node's events array

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);
      // Special handling for tree update events
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

### src/types/events.ts

**WorkflowEvent Type:**
- Discriminated union with 20+ event types
- Core events: childAttached, childDetached, stateSnapshot, stepStart, stepRetry, stepEnd, error, invalidResponse
- Agent/Prompt events: agentPromptStart, agentPromptEnd
- Tool events: toolInvocation
- MCP events: mcpEvent
- Reflection events: reflectionStart, reflectionEnd
- Cache events: cacheHit, cacheMiss

### src/types/observer.ts

**WorkflowObserver Interface:**
```typescript
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

## Integration Points

### emitEvent() Method Modification

**Current flow:**
1. Push event to `this.node.events`
2. Get root observers
3. Call `observer.onEvent(event)` for each observer

**New flow (with event history):**
1. Push event to `this.node.events` (existing)
2. Push event to `#eventHistory` array (NEW)
3. Get root observers (existing)
4. Call `observer.onEvent(event)` for each observer (existing)

**Key insight:** Event history storage happens BEFORE observer notification, ensuring observers can be caught up later.

### New Methods to Add

1. **replayEvents(observer, options)** - Replay historical events to an observer
2. **clearEventHistory()** - Clear the event history array

## Memory Considerations

- Each event is ~300-500 bytes depending on payload
- Unbounded storage could cause memory issues
- Current `node.events` is also unbounded (existing behavior)
- Event history is a temporary buffer for replay (different from node.events)

## Testing Patterns

### Observer Setup Pattern
```typescript
const observer: WorkflowObserver = {
  onLog: (entry) => logs.push(entry),
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
workflow.addObserver(observer);
```

### Event Verification Pattern
```typescript
// Filter events by type
const stepEvents = events.filter(e => e.type === 'stepStart');
expect(stepEvents).toHaveLength(1);
```

## Gotchas

1. **Observer Error Handling**: Existing code wraps observer calls in try-catch - maintain this pattern
2. **Root Observer Access**: Must use `getRootObservers()` to traverse parent chain
3. **Event Immutability**: Events pushed to node.events can be modified externally - consider structured cloning for history
4. **Private Field Choice**: Use `#private` (ES2022) for true runtime privacy
