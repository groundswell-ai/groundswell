# Event Replay API Design Research

## Overview

Research findings for designing the `replayEvents()` and `clearEventHistory()` APIs for the Workflow class.

## API Design Options

### Option 1: Simple Options Object (RECOMMENDED)

```typescript
interface ReplayEventsOptions {
  since?: number;  // Timestamp filter (ms since epoch)
  limit?: number;  // Max events to replay
}

replayEvents(observer: WorkflowObserver, options?: ReplayEventsOptions): void
```

**Pros:**
- Clear, explicit API
- Easy to extend with new options
- Type-safe with TypeScript
- Consistent with existing codebase patterns (e.g., WorkflowTreeDebugger)

**Cons:**
- Requires new interface type

### Option 2: Direct Parameters

```typescript
replayEvents(observer: WorkflowObserver, since?: number, limit?: number): void
```

**Pros:**
- No additional interface needed
- Simpler signature

**Cons:**
- Can't provide `limit` without `since`
- Less readable at call site
- Harder to extend

## Recommended: Option 1

**Reasoning:**
- Your codebase already uses options objects (e.g., `WorkflowTreeDebugger` constructor)
- More extensible for future features (e.g., event type filtering)
- Better type inference and IDE autocomplete

## Implementation Details

### since Parameter (Timestamp Filter)

**Pattern:**
```typescript
if (options?.since !== undefined) {
  events = events.filter(e => {
    // Extract timestamp from event
    const timestamp = e.type === 'stepRetry' ? e.timestamp :
                      e.type === 'stepRestarted' ? e.timestamp :
                      e.type === 'invalidResponse' ? e.timestamp :
                      // Events without timestamp: use oldest possible
                      0;
    return timestamp >= options.since!;
  });
}
```

**Gotcha:** Not all events have timestamps
- Events with timestamps: stepRetry, stepRestarted, invalidResponse
- Events without timestamps: Most structural/state events
- For events without timestamps, consider them "always applicable" (don't filter out)

### limit Parameter (Max Events)

**Pattern:**
```typescript
if (options?.limit !== undefined) {
  events = events.slice(0, options.limit);
}
```

**Order of operations:** Filter first, then limit
- More efficient (filter reduces array size before slicing)
- Semantically correct (limit applies to filtered results)

## clearEventHistory() API

### Option 1: Simple Clear

```typescript
clearEventHistory(): void
```

**Pros:**
- Simple API
- Sufficient for MVP

### Option 2: Selective Clear (Future Enhancement)

```typescript
interface ClearHistoryOptions {
  keepLast?: number;  // Keep last N events
  keepTypes?: string[];  // Keep specific event types
}

clearEventHistory(options?: ClearHistoryOptions): void
```

**Recommendation:** Start with Option 1, extend to Option 2 in future if needed

## Return Type

**Return:** `void` (fire-and-forget pattern)

**Reasoning:**
- Observer pattern is inherently async/side-effect based
- Return value would be ambiguous (success? number of events replayed?)
- Errors during observer calls are already handled internally (try-catch)

## JSDoc Documentation Pattern

Following your codebase style (from workflow.ts):

```typescript
/**
 * Replay historical events to an observer
 *
 * **Strategy:**
 * 1. Filter events by timestamp if `since` is provided
 * 2. Limit events if `limit` is provided
 * 3. Call observer.onEvent() for each event
 * 4. Handle observer errors gracefully
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
 * const observer = { onEvent: (e) => console.log(e), ... };
 * workflow.replayEvents(observer);
 * ```
 *
 * @example Replay last 10 events
 * ```ts
 * workflow.replayEvents(observer, { limit: 10 });
 * ```
 *
 * @example Replay events from last 5 minutes
 * ```ts
 * const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
 * workflow.replayEvents(observer, { since: fiveMinutesAgo });
 * ```
 */
```

## Edge Cases to Handle

1. **Empty History:** No events to replay - method should return silently
2. **Observer Throws Error:** Continue replaying to other observers, log error (existing pattern)
3. **Invalid since Value:** Negative timestamps - treat as "no filter" or validate and throw
4. **Invalid limit Value:** Zero or negative - validate and treat as "no limit" or throw
5. **limit > history.length:** Return all available events (no error)
