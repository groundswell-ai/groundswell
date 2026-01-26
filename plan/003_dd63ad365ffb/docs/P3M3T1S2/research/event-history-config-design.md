# Event History Configuration Design

## Executive Summary

This document outlines the design for event history configuration in the Groundswell workflow system, building on the event history storage implementation from P3.M3.T1.S1.

## Problem Statement

From P3.M3.T1.S1 PRP, event history is implemented as an unbounded array:
```typescript
/** Event history for replay functionality (ES2022 private field) */
#eventHistory: WorkflowEvent[] = [];
```

**Issue**: Unbounded event history can consume unbounded memory, leading to:
- Memory leaks in long-running workflows
- Out-of-memory errors in production
- Degraded performance with large event arrays

## Solution: Event History Configuration

Add `eventHistory` configuration option to `WorkflowConfig` with:
1. **enabled**: Boolean flag to enable/disable event history (default: false)
2. **maxEvents**: Maximum number of events to store (default: 1000)
3. **maxAgeMs**: Maximum age of events in milliseconds (default: 3600000 = 1 hour)

## Key Design Decisions

### 1. Timestamp Tracking Challenge

**Problem**: Most `WorkflowEvent` types don't have timestamps.

**Current WorkflowEvent types with timestamps:**
- `stepRetry` - has `timestamp: number`
- `stepRestarted` - has `timestamp: number`
- `invalidResponse` - has `timestamp: number`

**Most events WITHOUT timestamps:**
- `childAttached`, `childDetached`, `stateSnapshot`
- `stepStart`, `stepEnd`, `error`, `taskStart`, `taskEnd`
- `agentPromptStart`, `agentPromptEnd`
- `toolInvocation`, `mcpEvent`
- `reflectionStart`, `reflectionEnd`
- `cacheHit`, `cacheMiss`, `treeUpdated`

**Solution Options:**

**Option A: Add timestamp to all events**
- Pros: Clean, explicit
- Cons: Breaking change to WorkflowEvent type, affects all consumers

**Option B: Track insertion time separately**
- Pros: Non-breaking, minimal changes
- Cons: Requires parallel array or wrapper object

**Option C: Use metadata wrapper for event history**
- Pros: Flexible, non-breaking
- Cons: More complex data structure

**Recommended: Option B - Track insertion time separately**

```typescript
// Internal storage type with metadata
interface EventHistoryEntry {
  event: WorkflowEvent;
  insertedAt: number; // milliseconds since epoch
}

// Private field change
#eventHistory: EventHistoryEntry[] = [];
```

### 2. Trimming Strategy

**From research**: Use lazy trimming with `slice()` for best performance.

```typescript
public emitEvent(event: WorkflowEvent): void {
  // Check if history is enabled
  if (!this.isEventHistoryEnabled()) {
    // Skip storing in history, but still emit to observers
    this.node.events.push(event);
    // ... rest of emitEvent logic
    return;
  }

  // Store event in history with timestamp
  this.#eventHistory.push({ event, insertedAt: Date.now() });

  // Apply trimming (lazy: only trim when significantly over limit)
  this.trimEventHistory();

  // ... rest of emitEvent logic
}
```

### 3. Configuration Access Pattern

```typescript
// Helper method to check if event history is enabled
private isEventHistoryEnabled(): boolean {
  return this.config.eventHistory?.enabled === true;
}

// Helper method to get config with defaults
private getEventHistoryConfig(): Required<EventHistoryConfig> {
  return {
    enabled: this.config.eventHistory?.enabled ?? false,
    maxEvents: this.config.eventHistory?.maxEvents ?? 1000,
    maxAgeMs: this.config.eventHistory?.maxAgeMs ?? 3600000, // 1 hour
  };
}
```

## Implementation Specification

### Type Definitions

```typescript
/**
 * Event history configuration for workflow execution
 *
 * Controls the behavior of event collection, storage, and retention
 * for workflow debugging and replay purposes.
 *
 * @remarks
 * When enabled, events are stored in memory and can be accessed via
 * the workflow's replay functionality. Events include step execution,
 * errors, agent prompts, tool invocations, and state changes.
 *
 * **Memory Management:**
 * - Events are trimmed based on both count (`maxEvents`) and age (`maxAgeMs`)
 * - Lazy trimming is used for performance (only trims when significantly over limit)
 * - When disabled, no events are stored in history (still emitted to observers)
 *
 * **Performance Impact:**
 * - Enabled: Minimal overhead (~1-2ms per event)
 * - Disabled: Zero overhead
 *
 * @example Enable event history with default limits
 * ```ts
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   eventHistory: { enabled: true }
 * };
 * ```
 *
 * @example Custom limits for high-frequency workflows
 * ```ts
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow',
 *   eventHistory: {
 *     enabled: true,
 *     maxEvents: 5000,
 *     maxAgeMs: 7200000 // 2 hours
 *   }
 * };
 * ```
 *
 * @example Disable event history (default behavior)
 * ```ts
 * const config: WorkflowConfig = {
 *   name: 'MyWorkflow'
 *   // eventHistory not provided = disabled
 * };
 * ```
 */
export interface EventHistoryConfig {
  /**
   * Enable event history collection
   *
   * When false (default), no events are stored in history.
   * Events are still emitted to observers in real-time.
   *
   * @default false
   */
  enabled?: boolean;

  /**
   * Maximum number of events to store in history
   *
   * When the limit is exceeded, oldest events are removed first.
   * Uses lazy trimming for performance (trims at 1.5x the limit).
   *
   * @default 1000
   * @minimum 1
   */
  maxEvents?: number;

  /**
   * Maximum age of events in milliseconds
   *
   * Events older than this are removed from history.
   * Age is based on insertion time, not event timestamp.
   *
   * @default 3600000 (1 hour)
   * @minimum 1000 (1 second)
   */
  maxAgeMs?: number;
}
```

### Integration with WorkflowConfig

```typescript
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;

  /**
   * Event history configuration
   *
   * Controls event storage for replay and debugging.
   * Disabled by default to avoid unbounded memory usage.
   */
  eventHistory?: EventHistoryConfig;

  /** Strategy for merging multiple errors */
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

### Modified emitEvent() Implementation

```typescript
/**
 * Emit an event to all root observers
 *
 * @side effects
 * - Stores event in history (if enabled)
 * - Pushes event to node.events array
 * - Notifies all registered observers
 * - May trigger treeUpdated notifications for specific event types
 */
public emitEvent(event: WorkflowEvent): void {
  // Store event in history FIRST (if enabled)
  if (this.isEventHistoryEnabled()) {
    this.#eventHistory.push({ event, insertedAt: Date.now() });
    this.trimEventHistory();
  }

  this.node.events.push(event);

  const observers = this.getRootObservers();
  for (const obs of observers) {
    try {
      obs.onEvent(event);

      // Also notify tree changed for tree update events
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged(this.getRoot().node);
      }
    } catch (err) {
      this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
    }
  }
}
```

### Helper Methods

```typescript
/**
 * Check if event history is enabled
 */
private isEventHistoryEnabled(): boolean {
  return this.config.eventHistory?.enabled === true;
}

/**
 * Trim event history based on configuration
 *
 * Uses lazy trimming for performance:
 * - Only trims when at least 1.5x over the limit
 * - Applies both count and age constraints
 * - Uses slice() for efficiency (not shift())
 */
private trimEventHistory(): void {
  const config = this.getEventHistoryConfig();

  // Lazy trimming: only trim when significantly over limit
  const trimThreshold = Math.floor(config.maxEvents * 1.5);
  if (this.#eventHistory.length < trimThreshold) {
    return;
  }

  const now = Date.now();
  const ageCutoff = now - config.maxAgeMs;

  // Find first entry within age limit
  let keepFromIndex = 0;

  // Age-based trimming: remove events older than maxAgeMs
  for (let i = 0; i < this.#eventHistory.length; i++) {
    if (this.#eventHistory[i].insertedAt > ageCutoff) {
      keepFromIndex = Math.max(keepFromIndex, i);
      break;
    }
  }

  // Count-based trimming: remove excess events
  const countBasedIndex = Math.max(0, this.#eventHistory.length - config.maxEvents);

  // Use the more aggressive constraint
  const finalIndex = Math.max(keepFromIndex, countBasedIndex);

  if (finalIndex > 0) {
    this.#eventHistory = this.#eventHistory.slice(finalIndex);
  }
}

/**
 * Get event history configuration with defaults
 */
private getEventHistoryConfig(): Required<EventHistoryConfig> {
  return {
    enabled: this.config.eventHistory?.enabled ?? false,
    maxEvents: this.config.eventHistory?.maxEvents ?? 1000,
    maxAgeMs: this.config.eventHistory?.maxAgeMs ?? 3600000,
  };
}
```

### Modified replayEvents() Implementation

```typescript
/**
 * Replay historical events to an observer
 *
 * **Strategy:**
 * 1. Start with event history array
 * 2. Filter by timestamp if `since` is provided
 * 3. Limit events if `limit` is provided
 * 4. Call observer.onEvent() for each event
 * 5. Handle observer errors gracefully
 *
 * **Performance:** O(n) where n = number of events in history
 *
 * **Use Case:**
 * - Catch up new observers to current state
 * - Debug by replaying events to diagnostic observers
 * - Test scenarios by replaying historical events
 *
 * @param observer - The observer to replay events to
 * @param options - Optional replay configuration
 * @param options.since - Only replay events after this timestamp (ms since epoch)
 * @param options.limit - Maximum number of events to replay
 *
 * @example Replay all events to new observer
 * ```ts
 * const observer = {
 *   onLog: () => {},
 *   onEvent: (e) => console.log(e.type),
 *   onStateUpdated: () => {},
 *   onTreeChanged: () => {},
 * };
 * workflow.replayEvents(observer);
 * ```
 *
 * @example Replay last 10 events
 * ```ts
 * workflow.replayEvents(observer, { limit: 10 });
 * ```
 */
public replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  // Extract events from history entries
  let events = this.#eventHistory.map(entry => entry.event);

  // Filter by timestamp if provided
  if (options?.since !== undefined) {
    events = events.filter(event => {
      // Extract timestamp from events that have it
      const timestamp =
        event.type === 'stepRetry' ? event.timestamp :
        event.type === 'stepRestarted' ? event.timestamp :
        event.type === 'invalidResponse' ? event.timestamp :
        undefined;

      // Include events without timestamp or events after since
      return timestamp === undefined || timestamp >= options.since!;
    });
  }

  // Apply limit if provided
  if (options?.limit !== undefined) {
    events = events.slice(0, options.limit);
  }

  // Replay events to observer
  for (const event of events) {
    try {
      observer.onEvent(event);
    } catch (err) {
      this.logger.error('Observer replay error', { error: err, eventType: event.type });
    }
  }
}
```

### Modified clearEventHistory() Implementation

```typescript
/**
 * Clear the event history array
 *
 * **Strategy:**
 * - Reassign #eventHistory to empty array
 * - Frees memory by discarding all stored events
 * - Events in node.events are preserved
 *
 * **Use Case:**
 * - Free memory after workflow completes
 * - Reset history between test runs
 * - Prevent memory leaks in long-running workflows
 *
 * **Side Effects:**
 * - Frees memory for discarded events
 * - Future replayEvents() calls will return empty
 * - Does NOT affect node.events array
 */
public clearEventHistory(): void {
  this.#eventHistory = [];
}
```

## Test Plan

### Unit Tests

1. **Configuration defaults**
   - Event history disabled by default
   - maxEvents defaults to 1000
   - maxAgeMs defaults to 3600000

2. **Enable/disable behavior**
   - When disabled, events not stored in history
   - When enabled, events stored in history
   - Events still emitted to observers when disabled

3. **maxEvents trimming**
   - History trimmed when limit exceeded
   - Oldest events removed first
   - Lazy trimming (1.5x threshold)

4. **maxAgeMs trimming**
   - Events older than maxAgeMs removed
   - Age based on insertion time
   - Works with count-based trimming

5. **replayEvents() with new structure**
   - Correctly extracts events from entries
   - Works with since option
   - Works with limit option

6. **Edge cases**
   - Zero maxEvents (should not store)
   - Very small maxAgeMs
   - Very large maxEvents
   - Disabled configuration after events stored

### Integration Tests

1. **With Workflow constructor**
   - Class-based pattern
   - Functional pattern
   - Configuration inheritance

2. **With existing observers**
   - Observers still receive events
   - History storage is transparent

3. **Memory profiling**
   - Verify memory is freed
   - Verify no leaks with trimming

## Migration Path

**No breaking changes:**
- Event history is disabled by default
- Existing workflows continue to work
- Opt-in via configuration

**Backward compatibility:**
```typescript
// Old code - still works
const workflow = new Workflow('MyWorkflow');

// New code - opt-in
const workflow = new Workflow({
  name: 'MyWorkflow',
  eventHistory: { enabled: true }
});
```

## Performance Considerations

**Memory:**
- Per-event overhead: ~16 bytes (event reference) + 8 bytes (timestamp) = ~24 bytes
- 1000 events: ~24 KB
- 10000 events: ~240 KB

**CPU:**
- Enabled: ~1-2ms per event (including trimming)
- Disabled: 0ms overhead

**Trimming:**
- Lazy trimming: Only trims at 1.5x threshold
- Uses slice() + reassignment (efficient)
- O(n) where n = events to remove

## References

- P3.M3.T1.S1 PRP: Event history storage implementation
- src/types/workflow-context.ts: WorkflowConfig definition
- src/core/workflow.ts: Workflow class, emitEvent() method
- src/types/events.ts: WorkflowEvent type definitions
