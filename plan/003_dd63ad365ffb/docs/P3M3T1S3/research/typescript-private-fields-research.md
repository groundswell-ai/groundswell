# TypeScript Private Fields and Event History Storage Research

**Date:** 2026-01-26
**Target Implementation:** Event history storage with `replayEvents()` and `clearEventHistory()` methods
**Project Context:** Groundswell Workflow Engine (ES2022 target, strict mode enabled)

---

## 1. TypeScript Private Fields: `private` vs `#private` (ES2022)

### 1.1 Comparison Summary

| Feature | `private` Keyword | `#private` Fields (ES2022) |
|---------|------------------|---------------------------|
| **Privacy Level** | Compile-time only | Runtime (hard privacy) |
| **Language Feature** | TypeScript-only | Native JavaScript (ES2022+) |
| **Accessibility** | Can be accessed at runtime via bracket notation | Cannot be accessed outside class body, even at runtime |
| **Inheritance** | Accessible in subclasses | NOT accessible in subclasses |
| **Type Safety** | Checked at compile time | Checked at compile and runtime |
| **Minification** | Field name preserved | Field name preserved (both are weak mangles) |
| **Target Support** | All ES targets | ES2022+ (or with downlevel compilation) |

### 1.2 Code Examples

#### Using `private` Keyword
```typescript
class EventHistory {
  private eventHistory: WorkflowEvent[] = [];

  constructor() {
    this.eventHistory = [];  // ✓ Valid inside class
  }

  getEvents() {
    return this.eventHistory;  // ✓ Valid inside class
  }
}

// Compile-time error (TypeScript)
const history = new EventHistory();
history.eventHistory;  // ❌ Property 'eventHistory' is private

// Runtime access (compiled JavaScript)
const history = new EventHistory();
history['eventHistory'];  // ✓ Works! Privacy is only compile-time
```

#### Using `#private` Fields
```typescript
class EventHistory {
  #eventHistory: WorkflowEvent[] = [];

  constructor() {
    this.#eventHistory = [];  // ✓ Valid inside class
  }

  getEvents() {
    return this.#eventHistory;  // ✓ Valid inside class
  }
}

// Compile-time error (TypeScript)
const history = new EventHistory();
history.#eventHistory;  // ❌ SyntaxError: Private field '#eventHistory'

// Runtime access
const history = new EventHistory();
history['#eventHistory'];  // ❌ Still undefined! Truly private
```

### 1.3 Recommendation for Event History Storage

**USE: `#private` fields (ES2022)**

**Reasons:**

1. **Project Configuration**: Your `tsconfig.json` targets ES2022, so `#private` fields are natively supported without downlevel compilation.

2. **True Privacy**: Event history is sensitive data that should never be accessed externally. `#private` ensures runtime privacy.

3. **Consistency with Existing Patterns**: Looking at `WorkflowTreeDebugger` (lines 38-44), the project uses `private` keyword, but for new implementations where true privacy matters, `#private` is superior.

4. **Encapsulation**: Event history is an implementation detail that should be completely hidden from external access. Only methods like `replayEvents()` should expose it.

5. **Future-Proofing**: ES2022 is the modern standard, and `#private` fields are the future of JavaScript privacy.

**Implementation Pattern:**
```typescript
export class EventHistoryManager {
  /** Private event history storage - runtime privacy */
  #eventHistory: WorkflowEvent[] = [];

  /** Maximum history size for memory management */
  readonly #maxSize?: number;

  constructor(options?: { maxSize?: number }) {
    this.#maxSize = options?.maxSize;
  }

  /**
   * Replay events to an observer with optional filtering
   */
  replayEvents(observer: WorkflowObserver, options?: ReplayOptions): void {
    let events = this.#getFilteredEvents(options);

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    for (const event of events) {
      observer.onEvent(event);
    }
  }

  /**
   * Clear all event history
   */
  clearEventHistory(): void {
    this.#eventHistory = [];
  }

  /**
   * Get filtered events (internal helper)
   */
  #getFilteredEvents(options?: ReplayOptions): WorkflowEvent[] {
    if (!options?.since) {
      return [...this.#eventHistory];  // Return copy
    }

    return this.#eventHistory.filter(event => {
      // Filter by timestamp (event may not have timestamp field)
      // This depends on WorkflowEvent structure
      return true;  // Placeholder
    });
  }
}

interface ReplayOptions {
  /** Only replay events after this timestamp (milliseconds since epoch) */
  since?: number;
  /** Maximum number of events to replay */
  limit?: number;
}
```

### 1.4 Performance Considerations

| Aspect | `private` Keyword | `#private` Fields |
|--------|------------------|-------------------|
| **Property Access** | Same speed as normal property | Slightly slower (requires WeakMap lookup in downlevel) |
| **Memory Overhead** | None | Minimal (WeakMap-based in downlevel, native in ES2022) |
| **Bundle Size** | Smaller (no polyfill needed) | Same for ES2022 target |

**Conclusion:** For ES2022 target, `#private` fields have no significant performance penalty and provide stronger privacy guarantees.

---

## 2. Options Object Pattern with Optional Properties

### 2.1 Pattern Overview

The options object pattern is a best practice for methods with multiple optional parameters. It improves:
- **Readability**: Named parameters are self-documenting
- **Flexibility**: Any combination of options can be provided
- **Maintainability**: Adding new options doesn't break existing calls
- **Type Safety**: TypeScript ensures correct option types

### 2.2 Implementation Patterns

#### Pattern 1: Inline Type Definition
```typescript
replayEvents(
  observer: WorkflowObserver,
  options?: { since?: number; limit?: number }
): void {
  const since = options?.since;
  const limit = options?.limit;

  // Implementation
}
```

**Pros:**
- Simple for one-off use
- Type is immediately visible

**Cons:**
- Type cannot be reused
- Cannot export for documentation

#### Pattern 2: Interface Definition (Recommended)
```typescript
/**
 * Options for replaying workflow events
 */
export interface ReplayEventsOptions {
  /**
   * Only replay events after this timestamp (milliseconds since epoch)
   * @default undefined (replay all events)
   */
  since?: number;

  /**
   * Maximum number of events to replay
   * @default undefined (no limit)
   */
  limit?: number;
}

replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  // Implementation
}
```

**Pros:**
- Reusable type
- Can be exported for public API
- Better JSDoc documentation
- Easier to extend

**Cons:**
- Slightly more verbose

#### Pattern 3: Partial Utility Type
```typescript
interface FullReplayOptions {
  since: number;
  limit: number;
}

replayEvents(
  observer: WorkflowObserver,
  options?: Partial<FullReplayOptions>
): void {
  // All properties are optional
}
```

**Pros:**
- Good when you have a "full" options type elsewhere
- Makes all properties optional automatically

**Cons:**
- Less explicit about what's actually optional
- Can't provide different defaults per property

### 2.3 Recommendation: Pattern 2 (Interface)

**Use separate interface for options:**

```typescript
/**
 * Options for replaying workflow events from history
 */
export interface ReplayEventsOptions {
  /**
   * Timestamp filter - only replay events after this time
   *
   * Expressed as milliseconds since Unix epoch (same as Date.now())
   *
   * @example
   * ```typescript
   * // Replay events from last hour
   * replayEvents(observer, { since: Date.now() - 3600000 });
   * ```
   */
  since?: number;

  /**
   * Maximum number of events to replay
   *
   * When combined with `since`, events are first filtered by timestamp,
   * then limited to this count.
   *
   * @example
   * ```typescript
   * // Replay last 100 events
   * replayEvents(observer, { limit: 100 });
   *
   * // Replay last 50 events from the last hour
   * replayEvents(observer, { since: Date.now() - 3600000, limit: 50 });
   * ```
   */
  limit?: number;
}
```

### 2.4 Real-World Examples from Your Codebase

**From WorkflowTreeDebugger (lines 68-70):**
```typescript
constructor(
  workflow: Workflow,
  options?: { persistEvents?: boolean; maxEventHistorySize?: number }
) {
  // ...
}
```

**From Cache (line 127):**
```typescript
options?: { ttl?: number; prefix?: string }
```

**Pattern Observation:** Your codebase uses inline types for simple options. For public API methods, extract to interface for better documentation.

---

## 3. Type Safety for Parameters and Return Types

### 3.1 Options Parameter Typing

```typescript
/**
 * Replay events to an observer with filtering options
 *
 * @param observer - The observer to receive replayed events
 * @param options - Optional filtering and limiting options
 *
 * @example
 * ```typescript
 * // Replay all events
 * manager.replayEvents(observer);
 *
 * // Replay events from last hour
 * manager.replayEvents(observer, { since: Date.now() - 3600000 });
 *
 * // Replay last 100 events
 * manager.replayEvents(observer, { limit: 100 });
 *
 * // Replay last 50 events from last hour
 * manager.replayEvents(observer, {
 *   since: Date.now() - 3600000,
 *   limit: 50
 * });
 * ```
 */
replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  // Implementation
}
```

**Type Safety Checks:**
- ✓ `observer` is required (not optional)
- ✓ `options` is optional (can be `undefined`)
- ✓ `options.since` is `number | undefined`
- ✓ `options.limit` is `number | undefined`

### 3.2 Return Type: `void` vs `Promise<void>`

**Use `void` for synchronous operations:**
```typescript
replayEvents(observer: WorkflowObserver, options?: ReplayEventsOptions): void {
  // Synchronous event replay
  for (const event of events) {
    observer.onEvent(event);
  }
}
```

**Use `Promise<void>` for async operations:**
```typescript
async replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): Promise<void> {
  // Async event replay (e.g., loading from disk)
  const events = await this.loadEvents();
  for (const event of events) {
    await observer.onEvent(event);  // If observer.onEvent is async
  }
}
```

**Recommendation:** Use `void` since `WorkflowObserver.onEvent()` is synchronous (returns `void`).

### 3.3 Type Guards and Validation

```typescript
/**
 * Validate options object
 */
private #validateOptions(options?: ReplayEventsOptions): void {
  if (options?.since !== undefined && options.since < 0) {
    throw new RangeError(
      `Invalid 'since' timestamp: ${options.since}. ` +
      `Timestamp must be >= 0 (milliseconds since epoch).`
    );
  }

  if (options?.limit !== undefined && options.limit < 0) {
    throw new RangeError(
      `Invalid 'limit': ${options.limit}. Limit must be >= 0.`
    );
  }

  if (options?.limit !== undefined && options.limit === 0) {
    throw new RangeError(
      `Invalid 'limit': 0. Limit must be > 0.`
    );
  }
}

replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  this.#validateOptions(options);

  // Safe to use options without validation checks below
  // ...
}
```

---

## 4. Array Manipulation Best Practices

### 4.1 Filtering by Timestamp (`since` option)

#### Pattern 1: Direct Array.filter()
```typescript
#filterEventsSince(since: number): WorkflowEvent[] {
  return this.#eventHistory.filter(event => {
    // Assumes WorkflowEvent has a timestamp field
    // If not, you'll need a different approach
    const eventTime = (event as { timestamp?: number }).timestamp;
    return eventTime !== undefined && eventTime >= since;
  });
}
```

**Pros:**
- Simple, readable
- Creates new array (immutable)

**Cons:**
- O(n) time complexity
- Iterates entire array even if few events match

#### Pattern 2: Binary Search for Sorted Arrays (Optimal)
```typescript
#filterEventsSince(since: number): WorkflowEvent[] {
  // Find insertion point using binary search
  let left = 0;
  let right = this.#eventHistory.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const eventTime = (this.#eventHistory[mid] as { timestamp?: number }).timestamp ?? 0;

    if (eventTime < since) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Return slice from found index
  return this.#eventHistory.slice(left);
}
```

**Pros:**
- O(log n) to find start index
- O(k) for slice (k = number of matching events)
- Best for large, sorted arrays

**Cons:**
- More complex
- Requires sorted array (events must be added in chronological order)

**Recommendation:** Start with Pattern 1 (filter()). If profiling shows performance issues with large event histories, switch to Pattern 2.

### 4.2 Limiting Events (`limit` option)

#### Pattern 1: Array.slice()
```typescript
#limitEvents(events: WorkflowEvent[], limit: number): WorkflowEvent[] {
  return events.slice(0, limit);
}
```

**Pros:**
- Simple, idiomatic
- Creates new array (immutable)

**Cons:**
- Creates copy even if limit >= events.length

#### Pattern 2: Conditional Slicing
```typescript
#limitEvents(events: WorkflowEvent[], limit: number): WorkflowEvent[] {
  if (events.length <= limit) {
    return events;  // No copy needed
  }
  return events.slice(0, limit);
}
```

**Pros:**
- Avoids unnecessary copy when limit is large enough

**Cons:**
- More code
- Premature optimization (slice() is very fast)

**Recommendation:** Use Pattern 1 (slice()) for simplicity.

### 4.3 Combining Filters and Limits

```typescript
replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  let events = this.#eventHistory;

  // Step 1: Filter by timestamp (if provided)
  if (options?.since !== undefined) {
    events = this.#filterEventsSince(options.since);
  }

  // Step 2: Limit results (if provided)
  if (options?.limit !== undefined) {
    events = events.slice(0, options.limit);
  }

  // Step 3: Replay to observer
  for (const event of events) {
    observer.onEvent(event);
  }
}

#filterEventsSince(since: number): WorkflowEvent[] {
  return this.#eventHistory.filter(event => {
    // Filter implementation
    // Note: Check if WorkflowEvent has timestamp field
    return true;  // Placeholder
  });
}
```

**Performance Note:** Order matters! Filter first, then limit. This minimizes the slice operation.

### 4.4 Memory Efficiency

#### Return Copy vs Original Reference

```typescript
// BAD: Exposes internal array reference
getEventHistory(): WorkflowEvent[] {
  return this.#eventHistory;  // ❌ Caller can modify internal state
}

// GOOD: Returns copy
getEventHistory(): WorkflowEvent[] {
  return [...this.#eventHistory];  // ✓ Safe
}

// ALTERNATIVE: Returns read-only view (TypeScript only)
getEventHistory(): readonly WorkflowEvent[] {
  return this.#eventHistory;  // ✓ Type-safe, but not runtime-safe
}
```

**Recommendation:** Use spread operator `[...array]` for simple, fast shallow copies.

#### Clearing Arrays

```typescript
// Pattern 1: Reassignment
clearEventHistory(): void {
  this.#eventHistory = [];  // ✓ Clear and GC old array
}

// Pattern 2: Mutating length
clearEventHistory(): void {
  this.#eventHistory.length = 0;  // ✓ Mutates existing array
}
```

**Recommendation:** Use Pattern 1 (reassignment). It's clearer and allows garbage collection of the old array.

### 4.5 Real-World Examples from Your Codebase

**From WorkflowTreeDebugger (lines 333-339):**
```typescript
getEventHistory(): WorkflowEvent[] {
  if (!this.persistEvents) {
    return [];
  }
  // Return copy to prevent external modification
  return [...this.#eventHistory];
}
```

**From WorkflowEventReplayer (lines 256-278):**
```typescript
private removeSubtreeNodes(nodeId: string): void {
  // BFS traversal to collect IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);
  }

  // Batch delete
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
```

**Pattern Observation:** Your codebase follows best practices:
- Returns copies of internal arrays
- Uses efficient batch operations
- Avoids multiple iterations when possible

---

## 5. JSDoc Documentation Patterns

### 5.1 Method Documentation Template

```typescript
/**
 * Brief one-line summary of what the method does.
 *
 * **Detailed Description:**
 * - Point 1 about behavior
 * - Point 2 about edge cases
 * - Point 3 about performance
 *
 * **Algorithm:**
 * 1. First step
 * 2. Second step
 * 3. Third step
 *
 * @param paramName - Description of parameter
 * @param options - Description of options object
 * @param options.since - Description of specific option
 * @param options.limit - Description of specific option
 *
 * @returns Description of return value (or void if nothing returned)
 *
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * ```typescript
 * // Basic usage example
 * const result = method(param);
 *
 * // Advanced usage with options
 * const result = method(param, { option1: value1, option2: value2 });
 * ```
 */
methodName(param: Type, options?: Options): ReturnType {
  // Implementation
}
```

### 5.2 Options Interface Documentation

```typescript
/**
 * Options for replaying workflow events from history.
 *
 * **Filtering Behavior:**
 * - Events are first filtered by `since` (if provided)
 * - Then limited by `limit` (if provided)
 * - Order is: filter → limit → replay
 *
 * **Memory Efficiency:**
 * - Filtering creates a new array (immutable)
 * - Large histories use O(k) memory where k = filtered count
 *
 * @see {@link EventHistoryManager.replayEvents} for usage examples
 */
export interface ReplayEventsOptions {
  /**
   * Timestamp filter - only replay events after this time.
   *
   * Expressed as milliseconds since Unix epoch (same format as Date.now()).
   *
   * **Validation:**
   * - Must be >= 0 (throws RangeError if negative)
   * - Events without timestamp are included (cannot be filtered)
   *
   * **Example Values:**
   * - `Date.now()` - Current time
   * - `Date.now() - 3600000` - One hour ago
   * - `Date.now() - 86400000` - One day ago
   *
   * @default undefined (no timestamp filtering)
   *
   * @example
   * ```typescript
   * // Replay events from last hour
   * replayEvents(observer, { since: Date.now() - 3600000 });
   * ```
   */
  since?: number;

  /**
   * Maximum number of events to replay.
   *
   * Applied **after** `since` filtering. If both options are provided,
   * events are first filtered by timestamp, then limited to this count.
   *
   * **Validation:**
   * - Must be > 0 (throws RangeError if 0 or negative)
   *
   * **Use Cases:**
   * - Prevent memory issues with large histories
   * - Sample recent events for debugging
   * - Limit UI rendering to N events
   *
   * @default undefined (no limit)
   *
   * @example
   * ```typescript
   * // Replay last 100 events
   * replayEvents(observer, { limit: 100 });
   *
   * // Replay last 50 events from the last hour
   * replayEvents(observer, {
   *   since: Date.now() - 3600000,
   *   limit: 50
   * });
   * ```
   */
  limit?: number;
}
```

### 5.3 Private Method Documentation

```typescript
/**
 * Filter events by timestamp (internal helper).
 *
 * **Strategy:**
 * - Uses Array.filter() for O(n) iteration
 * - Creates new array (immutable operation)
 * - Includes events without timestamp (cannot filter them out)
 *
 * **Performance:** O(n) where n = eventHistory.length
 *
 * @param since - Timestamp filter (milliseconds since epoch)
 * @returns Filtered array of events
 *
 * @example
 * ```typescript
 * const recentEvents = this.#filterEventsSince(Date.now() - 3600000);
 * console.log(`Found ${recentEvents.length} events from last hour`);
 * ```
 */
#filterEventsSince(since: number): WorkflowEvent[] {
  return this.#eventHistory.filter(event => {
    // Implementation
  });
}
```

### 5.4 Real-World Examples from Your Codebase

**From WorkflowTreeDebugger (lines 46-66):**
```typescript
/**
 * Create a tree debugger attached to a workflow
 * @param workflow The root workflow to debug
 * @param options Configuration options
 * @param options.persistEvents Whether to accumulate event history (default: false)
 * @param options.maxEventHistorySize Maximum number of events to keep (optional, FIFO eviction)
 *
 * @example
 * ```typescript
 * // Without persistence (default)
 * const debugger = new WorkflowTreeDebugger(workflow);
 *
 * // With persistence enabled
 * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
 *
 * // With persistence and size limit
 * const debugger = new WorkflowTreeDebugger(workflow, {
 *   persistEvents: true,
 *   maxEventHistorySize: 10000,
 * });
 * ```
 */
```

**From WorkflowEventReplayer (lines 43-84):**
```typescript
/**
 * Replay a sequence of workflow events to reconstruct the workflow tree.
 *
 * **Event Processing Strategy:**
 * - Processes events sequentially in order
 * - Uses try-catch per event to isolate errors
 * - Logs errors and continues processing on failure
 * - Throws only if root cannot be established
 *
 * **Phase 1 - Structural Events** (implemented in P2.M1.T1.S2):
 * - `childAttached`: Add new child node to parent's children array
 * - `childDetached`: Remove child and all descendants from tree
 * - `treeUpdated`: Update root reference to new tree
 *
 * **Tree Invariants Maintained:**
 * - Single-parent rule: Each node has at most one parent
 * - Bidirectional references: parent.children and child.parent are consistent
 * - No circular references: Tree is a Directed Acyclic Graph (DAG)
 *
 * @param events - Array of workflow events in chronological order
 * @returns Root node of the reconstructed workflow tree
 * @throws {Error} If events array is empty
 * @throws {Error} If root cannot be established from events
 *
 * @example
 * ```typescript
 * const replayer = new WorkflowEventReplayer();
 * const tree = replayer.replay(eventStream);
 * console.log(`Tree has ${tree.children.length} root children`);
 * ```
 */
```

**Pattern Observation:** Your codebase uses comprehensive JSDoc with:
- Multi-line summaries
- Strategy/algorithm descriptions
- Validation rules
- Usage examples
- Cross-references (`@see`)
- Thrown errors (`@throws`)

---

## 6. Complete Implementation Example

### 6.1 Event History Storage Class

```typescript
import type { WorkflowEvent, WorkflowObserver } from './types/index.js';

/**
 * Options for replaying workflow events from history.
 *
 * **Filtering Behavior:**
 * - Events are first filtered by `since` (if provided)
 * - Then limited by `limit` (if provided)
 * - Order is: filter → limit → replay
 *
 * **Memory Efficiency:**
 * - Filtering creates a new array (immutable)
 * - Large histories use O(k) memory where k = filtered count
 *
 * @see {@link EventHistoryManager.replayEvents} for usage examples
 */
export interface ReplayEventsOptions {
  /**
   * Timestamp filter - only replay events after this time.
   *
   * Expressed as milliseconds since Unix epoch (same format as Date.now()).
   *
   * **Validation:**
   * - Must be >= 0 (throws RangeError if negative)
   * - Events without timestamp are included (cannot be filtered)
   *
   * **Example Values:**
   * - `Date.now()` - Current time
   * - `Date.now() - 3600000` - One hour ago
   * - `Date.now() - 86400000` - One day ago
   *
   * @default undefined (no timestamp filtering)
   */
  since?: number;

  /**
   * Maximum number of events to replay.
   *
   * Applied **after** `since` filtering. If both options are provided,
   * events are first filtered by timestamp, then limited to this count.
   *
   * **Validation:**
   * - Must be > 0 (throws RangeError if 0 or negative)
   *
   * **Use Cases:**
   * - Prevent memory issues with large histories
   * - Sample recent events for debugging
   * - Limit UI rendering to N events
   *
   * @default undefined (no limit)
   */
  limit?: number;
}

/**
 * Manages event history storage and replay for workflow debugging.
 *
 * **Purpose:** Provides in-memory storage of workflow events with
 * filtering and replay capabilities for time-travel debugging.
 *
 * **Privacy:** Uses ES2022 `#private` fields for true runtime privacy.
 * Event history cannot be accessed directly, only through public API methods.
 *
 * **Memory Management:**
 * - Events are stored in chronological order
 * - Use `clearEventHistory()` to free memory
 * - Consider maxSize for production use
 *
 * **Thread Safety:** Not thread-safe (Node.js is single-threaded)
 *
 * @example
 * ```typescript
 * const manager = new EventHistoryManager();
 *
 * // Add events (usually done by observer)
 * manager.addEvent(event1);
 * manager.addEvent(event2);
 *
 * // Replay to observer
 * manager.replayEvents(observer);
 *
 * // Replay with filtering
 * manager.replayEvents(observer, {
 *   since: Date.now() - 3600000,  // Last hour
 *   limit: 100                     // Max 100 events
 * });
 *
 * // Clear history
 * manager.clearEventHistory();
 * ```
 */
export class EventHistoryManager {
  /** Private event history storage - runtime privacy enforced */
  #eventHistory: WorkflowEvent[] = [];

  /** Maximum history size for memory management (optional) */
  readonly #maxSize?: number;

  /**
   * Create an event history manager.
   *
   * @param options - Configuration options
   * @param options.maxSize - Maximum number of events to store (FIFO eviction)
   *
   * @example
   * ```typescript
   * // Unlimited history
   * const manager = new EventHistoryManager();
   *
   * // Limited history (10,000 events max)
   * const manager = new EventHistoryManager({ maxSize: 10000 });
   * ```
   */
  constructor(options?: { maxSize?: number }) {
    this.#maxSize = options?.maxSize;
  }

  /**
   * Add an event to history.
   *
   * **Strategy:**
   * - Append to end of array (chronological order)
   * - Evict oldest event if maxSize exceeded
   *
   * **Performance:** O(1) amortized (Array.push is O(1))
   *
   * @param event - Event to add to history
   *
   * @example
   * ```typescript
   * manager.addEvent({
   *   type: 'stateSnapshot',
   *   node: workflowNode,
   * });
   * ```
   */
  addEvent(event: WorkflowEvent): void {
    // Enforce maxSize limit (FIFO eviction)
    if (this.#maxSize && this.#eventHistory.length >= this.#maxSize) {
      this.#eventHistory.shift();  // Remove oldest event
    }

    this.#eventHistory.push(event);
  }

  /**
   * Replay events to an observer with optional filtering.
   *
   * **Algorithm:**
   * 1. Validate options (throw if invalid)
   * 2. Filter events by timestamp (if `since` provided)
   * 3. Limit results (if `limit` provided)
   * 4. Call observer.onEvent() for each event
   *
   * **Ordering:** Events are replayed in chronological order.
   *
   * **Performance:** O(n + k) where n = history length, k = filtered count
   *
   * **Thread Safety:** Not thread-safe (single-threaded Node.js)
   *
   * @param observer - The observer to receive replayed events
   * @param options - Optional filtering and limiting options
   *
   * @throws {RangeError} If options.since is negative
   * @throws {RangeError} If options.limit is <= 0
   *
   * @example
   * ```typescript
   * // Replay all events
   * manager.replayEvents(observer);
   *
   * // Replay events from last hour
   * manager.replayEvents(observer, { since: Date.now() - 3600000 });
   *
   * // Replay last 100 events
   * manager.replayEvents(observer, { limit: 100 });
   *
   * // Replay last 50 events from last hour
   * manager.replayEvents(observer, {
   *   since: Date.now() - 3600000,
   *   limit: 50
   * });
   * ```
   */
  replayEvents(
    observer: WorkflowObserver,
    options?: ReplayEventsOptions
  ): void {
    // Validate options
    this.#validateOptions(options);

    // Step 1: Filter by timestamp (if provided)
    let events = options?.since !== undefined
      ? this.#filterEventsSince(options.since)
      : this.#eventHistory;

    // Step 2: Limit results (if provided)
    if (options?.limit !== undefined) {
      events = events.slice(0, options.limit);
    }

    // Step 3: Replay to observer
    for (const event of events) {
      observer.onEvent(event);
    }
  }

  /**
   * Clear all event history.
   *
   * **Strategy:**
   * - Reassign `#eventHistory` to new empty array
   * - Old array is eligible for garbage collection
   *
   * **Performance:** O(1) (array reassignment is fast)
   *
   * **Memory:** Frees memory held by old array (subject to GC)
   *
   * @example
   * ```typescript
   * // After replaying events, free memory
   * manager.replayEvents(observer);
   * manager.clearEventHistory();
   * ```
   */
  clearEventHistory(): void {
    this.#eventHistory = [];
  }

  /**
   * Get the number of events in history.
   *
   * **Use Cases:**
   * - Debugging: Check if history is growing
   * - Monitoring: Alert on excessive history
   * - Testing: Verify event count
   *
   * **Performance:** O(1) (Array.length property)
   *
   * @returns Number of events stored in history
   *
   * @example
   * ```typescript
   * console.log(`History has ${manager.getEventCount()} events`);
   * ```
   */
  getEventCount(): number {
    return this.#eventHistory.length;
  }

  /**
   * Filter events by timestamp (internal helper).
   *
   * **Strategy:**
   * - Uses Array.filter() for O(n) iteration
   * - Creates new array (immutable operation)
   * - Includes events without timestamp (cannot filter them out)
   *
   * **Performance:** O(n) where n = eventHistory.length
   *
   * **Future Optimization:** For large histories, use binary search
   * to find start index (O(log n)) then slice (O(k)).
   *
   * @param since - Timestamp filter (milliseconds since epoch)
   * @returns Filtered array of events
   *
   * @example
   * ```typescript
   * const recentEvents = this.#filterEventsSince(Date.now() - 3600000);
   * console.log(`Found ${recentEvents.length} events from last hour`);
   * ```
   */
  #filterEventsSince(since: number): WorkflowEvent[] {
    return this.#eventHistory.filter(event => {
      // Note: WorkflowEvent may not have timestamp field
      // This implementation assumes it does, or needs adjustment
      const eventWithTime = event as { timestamp?: number };
      if (eventWithTime.timestamp === undefined) {
        // Include events without timestamp (cannot filter)
        return true;
      }
      return eventWithTime.timestamp >= since;
    });
  }

  /**
   * Validate options object (internal helper).
   *
   * **Validations:**
   * - `since` must be >= 0
   * - `limit` must be > 0
   *
   * **Error Messages:** Descriptive with context
   *
   * @param options - Options to validate
   *
   * @throws {RangeError} If validation fails
   *
   * @example
   * ```typescript
   * this.#validateOptions({ since: -100 });  // Throws RangeError
   * this.#validateOptions({ limit: 0 });     // Throws RangeError
   * this.#validateOptions({ since: 100 });   // OK
   * ```
   */
  #validateOptions(options?: ReplayEventsOptions): void {
    if (options?.since !== undefined && options.since < 0) {
      throw new RangeError(
        `Invalid 'since' timestamp: ${options.since}. ` +
        `Timestamp must be >= 0 (milliseconds since epoch).`
      );
    }

    if (options?.limit !== undefined && options.limit <= 0) {
      throw new RangeError(
        `Invalid 'limit': ${options.limit}. ` +
        `Limit must be > 0.`
      );
    }
  }
}
```

---

## 7. Key Takeaways and Recommendations

### 7.1 Private Fields

**USE `#private` fields (ES2022)**
- True runtime privacy
- Native JavaScript feature
- Supported by your ES2022 target
- Better encapsulation for sensitive data

**Implementation:**
```typescript
class EventHistory {
  #eventHistory: WorkflowEvent[] = [];  // ✓ Runtime private
  #maxSize?: number;                    // ✓ Runtime private

  // Cannot be accessed from outside the class, even at runtime
}
```

### 7.2 Options Pattern

**USE separate interface for options**
- Reusable type
- Better documentation
- Extensible design

**Implementation:**
```typescript
export interface ReplayEventsOptions {
  since?: number;
  limit?: number;
}

replayEvents(
  observer: WorkflowObserver,
  options?: ReplayEventsOptions
): void {
  // ...
}
```

### 7.3 Array Operations

**Filter first, then limit**
```typescript
// Correct order
let events = this.#filterEventsSince(since);  // O(n)
events = events.slice(0, limit);              // O(k)

// Wrong order (less efficient)
let events = this.#eventHistory.slice(0, limit);  // O(k)
events = events.filter(e => e.timestamp >= since); // O(k) - still iterates
```

**Return copies, not references**
```typescript
getEventHistory(): WorkflowEvent[] {
  return [...this.#eventHistory];  // ✓ Copy
  // NOT: return this.#eventHistory;  // ✗ Exposes internal state
}
```

### 7.4 JSDoc Documentation

**Follow your codebase's patterns**
- Multi-line descriptions with sections
- Algorithm/strategy explanations
- Usage examples with @example tags
- Validation rules
- Error documentation with @throws

**Implementation:**
```typescript
/**
 * Brief summary.
 *
 * **Strategy:**
 * - Point 1
 * - Point 2
 *
 * **Performance:** O(n) complexity
 *
 * @param param - Description
 * @returns Description
 * @throws {Error} When error occurs
 *
 * @example
 * ```typescript
 * // Usage example
 * method(param);
 * ```
 */
```

### 7.5 Type Safety

**Validate inputs, use type guards**
```typescript
#validateOptions(options?: ReplayEventsOptions): void {
  if (options?.since !== undefined && options.since < 0) {
    throw new RangeError(`Invalid 'since': ${options.since}`);
  }
  // Safe to use options after validation
}
```

**Use explicit return types**
```typescript
replayEvents(...): void {  // ✓ Explicit void
  // ...
}

#filterEventsSince(since: number): WorkflowEvent[] {  // ✓ Explicit return
  // ...
}
```

---

## 8. Testing Recommendations

### 8.1 Unit Tests

```typescript
describe('EventHistoryManager', () => {
  describe('replayEvents', () => {
    it('should replay all events when no options provided', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      manager.addEvent(event1);
      manager.addEvent(event2);

      manager.replayEvents(mockObserver);

      expect(mockObserver.onEvent).toHaveBeenCalledTimes(2);
    });

    it('should filter events by timestamp when since provided', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      const oldEvent = createEvent({ timestamp: Date.now() - 7200000 });
      const newEvent = createEvent({ timestamp: Date.now() - 1800000 });

      manager.addEvent(oldEvent);
      manager.addEvent(newEvent);

      manager.replayEvents(mockObserver, { since: Date.now() - 3600000 });

      expect(mockObserver.onEvent).toHaveBeenCalledTimes(1);
      expect(mockObserver.onEvent).toHaveBeenCalledWith(newEvent);
    });

    it('should limit events when limit provided', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      for (let i = 0; i < 100; i++) {
        manager.addEvent(createEvent());
      }

      manager.replayEvents(mockObserver, { limit: 10 });

      expect(mockObserver.onEvent).toHaveBeenCalledTimes(10);
    });

    it('should throw RangeError for negative since', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      expect(() => {
        manager.replayEvents(mockObserver, { since: -100 });
      }).toThrow(RangeError);
    });

    it('should throw RangeError for zero limit', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      expect(() => {
        manager.replayEvents(mockObserver, { limit: 0 });
      }).toThrow(RangeError);
    });

    it('should combine since and limit filters correctly', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      // Add 100 events over 2 hours
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        manager.addEvent(createEvent({
          timestamp: now - (7200000 - i * 72000)
        }));
      }

      // Replay last hour, max 10 events
      manager.replayEvents(mockObserver, {
        since: now - 3600000,
        limit: 10
      });

      // Should replay first 10 events from last hour
      expect(mockObserver.onEvent).toHaveBeenCalledTimes(10);
    });
  });

  describe('clearEventHistory', () => {
    it('should clear all events', () => {
      const manager = new EventHistoryManager();

      manager.addEvent(event1);
      manager.addEvent(event2);

      expect(manager.getEventCount()).toBe(2);

      manager.clearEventHistory();

      expect(manager.getEventCount()).toBe(0);
    });

    it('should allow replaying after clearing', () => {
      const manager = new EventHistoryManager();
      const mockObserver = createMockObserver();

      manager.addEvent(event1);
      manager.clearEventHistory();
      manager.addEvent(event2);

      manager.replayEvents(mockObserver);

      expect(mockObserver.onEvent).toHaveBeenCalledTimes(1);
      expect(mockObserver.onEvent).toHaveBeenCalledWith(event2);
    });
  });

  describe('private field privacy', () => {
    it('should not expose eventHistory property', () => {
      const manager = new EventHistoryManager();

      // TypeScript compile-time error
      // @ts-expect-error - Property '#eventHistory' is private
      const events = manager.#eventHistory;

      // Runtime: undefined (private field not accessible)
      expect((manager as any).eventHistory).toBeUndefined();
    });
  });
});
```

### 8.2 Performance Tests

```typescript
describe('EventHistoryManager performance', () => {
  it('should handle large event histories efficiently', () => {
    const manager = new EventHistoryManager();
    const mockObserver = createMockObserver();

    // Add 100,000 events
    for (let i = 0; i < 100000; i++) {
      manager.addEvent(createEvent());
    }

    const startTime = Date.now();
    manager.replayEvents(mockObserver);
    const duration = Date.now() - startTime;

    // Should complete in reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);
  });

  it('should use minimal memory for filtered replay', () => {
    const manager = new EventHistoryManager();

    // Add 1000 events
    for (let i = 0; i < 1000; i++) {
      manager.addEvent(createEvent({
        timestamp: Date.now() - (1000 - i) * 1000
      }));
    }

    const mockObserver = createMockObserver();

    // Replay only last 10 events
    manager.replayEvents(mockObserver, {
      since: Date.now() - 10000,
      limit: 10
    });

    // Should only call observer 10 times (not 1000)
    expect(mockObserver.onEvent).toHaveBeenCalledTimes(10);
  });
});
```

---

## 9. Migration Path from `private` to `#private`

If you have existing code using `private` keyword:

```typescript
// Before (private keyword)
class EventHistory {
  private eventHistory: WorkflowEvent[] = [];

  getEvents() {
    return this.eventHistory;
  }
}

// After (#private fields)
class EventHistory {
  #eventHistory: WorkflowEvent[] = [];

  getEvents() {
    return this.#eventHistory;
  }
}
```

**Migration Steps:**
1. Change `private` to `#` in field declaration
2. Update all references within class to use `#`
3. Run tests to ensure no external access (will fail if accessed)
4. Remove any workaround code for "private" field access

---

## 10. References

- **TypeScript Private Fields:** [TypeScript Handbook - Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html#private-fields)
- **ES2022 Private Fields:** [MDN - Private class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)
- **Options Pattern:** [TypeScript Deep Dive - Optional Parameters](https://basarat.gitbook.io/typescript/type-system/optionalparameters)
- **Array Methods:** [MDN - Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
- **JSDoc Tags:** [JSDoc Official Documentation](https://jsdoc.app/)

---

## Appendix: Quick Reference

### A.1 Private Field Syntax

```typescript
class Example {
  private field: string;     // Compile-time only
  #privateField: string;     // Runtime private (ES2022)
}
```

### A.2 Options Object Pattern

```typescript
interface Options {
  opt1?: string;
  opt2?: number;
}

method(options?: Options): void {
  const opt1 = options?.opt1;
  const opt2 = options?.opt2;
}
```

### A.3 Array Operations

```typescript
// Filter
const filtered = array.filter(item => item.condition);

// Limit
const limited = array.slice(0, limit);

// Combine
const result = array.filter(item => item.condition).slice(0, limit);

// Copy
const copy = [...array];

// Clear
array = [];  // Reassign
array.length = 0;  // Truncate
```

### A.4 JSDoc Template

```typescript
/**
 * Summary.
 *
 * **Strategy:**
 * - Point 1
 * - Point 2
 *
 * @param param - Description
 * @returns Description
 * @throws {Error} Description
 *
 * @example
 * ```typescript
 * method(param);
 * ```
 */
```

---

**End of Research Document**
