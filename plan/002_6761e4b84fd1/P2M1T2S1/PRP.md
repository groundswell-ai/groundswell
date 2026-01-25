# PRP: Add Event Persistence to WorkflowTreeDebugger

**PRP ID**: P2.M1.T2.S1
**Work Item**: Add event persistence to WorkflowTreeDebugger
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Enable WorkflowTreeDebugger to maintain an in-memory event history and provide file-based save/load capabilities for offline workflow debugging and analysis.

**Deliverable**: Updated `src/debugger/tree-debugger.ts` containing:
1. Constructor accepting `{ persistEvents?: boolean; maxEventHistorySize?: number }` options
2. Private `eventHistory` array for in-memory event storage when enabled
3. `getEventHistory(): WorkflowEvent[]` method to retrieve accumulated events
4. `saveEventHistory(path: string): Promise<void>` method to write events to JSON file
5. Static `loadEventHistory(path: string): Promise<unknown[]>` method to load events from JSON file
6. Event serialization helper to handle circular references in WorkflowNode objects
7. Comprehensive JSDoc documentation for all new methods
8. Unit tests for all persistence functionality

**Success Definition**:
- Constructor accepts `persistEvents` option (defaults to false for backward compatibility)
- Events accumulate in `eventHistory` array only when `persistEvents` is true
- `getEventHistory()` returns array of all accumulated events
- `saveEventHistory()` serializes events without circular reference errors and writes to file
- `loadEventHistory()` reads and parses JSON file, returns event array
- Existing functionality remains unchanged when `persistEvents` is false
- Code compiles without TypeScript errors
- All unit tests pass

---

## User Persona

**Target User**: Development team building workflow observability and debugging tools

**Use Case**: Developers need to capture and analyze workflow execution events for:
- Offline debugging of production issues
- Performance analysis of long-running workflows
- Event stream replay for time-travel debugging
- Sharing workflow execution traces between team members
- Building automated testing and validation tools

**User Journey**:
1. Developer creates WorkflowTreeDebugger with `persistEvents: true`
2. Workflow executes, generating events
3. Developer retrieves event history via `getEventHistory()`
4. Developer saves event history to file for later analysis
5. Developer loads event history from file for replay or inspection
6. Developer uses saved events with WorkflowEventReplayer for time-travel debugging

**Pain Points Addressed**:
- Cannot capture workflow execution events for offline analysis
- Cannot share execution traces with team members
- Cannot debug past workflow executions without running them again
- Cannot build automated testing based on historical event streams

---

## Why

**Business Value and User Impact**:
- **Offline Debugging**: Analyze workflow executions without needing live system
- **Collaboration**: Share event traces between developers for collaborative debugging
- **Testing**: Build automated tests based on real execution patterns
- **Performance Analysis**: Analyze event sequences to identify bottlenecks
- **Documentation**: Event history serves as execution documentation

**Integration with Existing Features**:
- **Leverages**: `WorkflowTreeDebugger.events` Observable for event capture
- **Extends**: WorkflowTreeDebugger with persistence capabilities
- **Enables**: Integration with `WorkflowEventReplayer` (from P2.M1.T1.S3) for replay
- **Follows**: Existing Observable pattern from `src/utils/observable.ts`
- **Maintains**: Backward compatibility (persistence disabled by default)

**Problems This Solves**:
- WorkflowTreeDebugger currently forwards all events but doesn't store them
- No way to retrieve past event history after workflow completes
- Cannot save workflow execution traces to disk
- Cannot load previously saved event traces for analysis
- Missing foundation for advanced debugging features (replay, analysis, testing)

---

## What

**User-Visible Behavior**:
After implementation, developers will be able to:

```typescript
import { WorkflowTreeDebugger } from 'groundswell';

// Create debugger with event persistence enabled
const workflow = new MyWorkflow();
const debugger = new WorkflowTreeDebugger(workflow, {
  persistEvents: true,
  maxEventHistorySize: 10000, // optional: limit memory usage
});

// Execute workflow - events are automatically captured
await workflow.run();

// Retrieve event history
const events = debugger.getEventHistory();
console.log(`Captured ${events.length} events`);

// Save to file for later analysis
await debugger.saveEventHistory('./workflow-execution.json');

// Load events from file (static method)
const loadedEvents = await WorkflowTreeDebugger.loadEventHistory('./workflow-execution.json');

// Use with WorkflowEventReplayer for time-travel debugging
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(loadedEvents);
```

**Technical Requirements**:

1. **Constructor Options**:
   - Accept optional `options` parameter with `persistEvents?: boolean`
   - Accept optional `maxEventHistorySize?: number` for memory management
   - Default to `persistEvents: false` for backward compatibility
   - Initialize `eventHistory` array only when persistence enabled

2. **Event Capture**:
   - Modify `onEvent()` to push events to `eventHistory` when enabled
   - Add `timestamp` field to each event for chronological ordering
   - Handle circular references in WorkflowNode objects during serialization

3. **Public API**:
   - `getEventHistory(): WorkflowEvent[]` - Returns copy of event history array
   - `saveEventHistory(path: string): Promise<void>` - Serializes and saves to JSON file
   - `static loadEventHistory(path: string): Promise<unknown[]>` - Loads from JSON file

4. **Serialization**:
   - Convert WorkflowEvent objects to JSON-safe format
   - Extract only primitive fields (nodeId, nodeName) from WorkflowNode references
   - Preserve discriminated union type structure
   - Add timestamp field to each event

5. **Error Handling**:
   - Handle file I/O errors gracefully (ENOENT, EACCES, invalid JSON)
   - Log errors without breaking event stream
   - Maintain event history integrity even if save fails

6. **Testing**:
   - Test event accumulation with `persistEvents` true/false
   - Test event order preservation
   - Test file save/load round-trip
   - Test serialization without circular reference errors
   - Test error handling for file operations
   - Test integration with WorkflowEventReplayer

**Data Flow**:

```
Workflow.emitEvent()
  → WorkflowTreeDebugger.onEvent()
    → [if persistEvents] eventHistory.push(event)
    → [handle structural events]
    → events.next(event) [existing behavior]
  → [external] debugger.getEventHistory()
  → [external] debugger.saveEventHistory(path)
    → serializeEvents(eventHistory)
    → writeFile(path, JSON.stringify(serialized))
  → [external] WorkflowTreeDebugger.loadEventHistory(path)
    → readFile(path)
    → JSON.parse(content)
```

### Success Criteria

- [ ] Constructor accepts `{ persistEvents?: boolean }` option parameter
- [ ] Constructor initializes `eventHistory` array only when `persistEvents` is true
- [ ] `onEvent()` method pushes events to `eventHistory` when enabled
- [ ] `getEventHistory()` returns array of accumulated events
- [ ] `getEventHistory()` returns empty array when `persistEvents` is false
- [ ] Events maintain chronological order
- [ ] Each event has `timestamp` field added
- [ ] `saveEventHistory()` writes events to JSON file
- [ ] `saveEventHistory()` serializes WorkflowNode references without circular references
- [ ] `loadEventHistory()` static method reads and parses JSON file
- [ ] `loadEventHistory()` throws descriptive error for missing files
- [ ] `loadEventHistory()` throws descriptive error for invalid JSON
- [ ] Existing WorkflowTreeDebugger functionality unchanged when `persistEvents` is false
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes complete WorkflowTreeDebugger implementation details, exact event type structures, serialization patterns for circular references, file I/O patterns with Node.js fs/promises, testing patterns from existing codebase, and specific code examples for all implementation tasks. An implementer unfamiliar with the codebase can implement the persistence feature using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P2M1T1S3/PRP.md
  why: Defines WorkflowEventReplayer implementation - this PRP builds on it
  critical: WorkflowEventReplayer.replay() accepts WorkflowEvent[] array
  critical: Event structure and serialization patterns defined there
  critical: loadEventHistory() output must be compatible with replayer.replay()

# WorkflowTreeDebugger Implementation (MODIFY THIS FILE)
- file: src/debugger/tree-debugger.ts
  why: File to modify - contains current WorkflowTreeDebugger implementation
  section: Lines 1-256 (complete file)
  critical: constructor(workflow: Workflow) - needs options parameter
  critical: onEvent(event: WorkflowEvent) - needs event capture logic
  critical: Public API section (lines 133-254) - add persistence methods here
  pattern: Private fields use private keyword, public methods have JSDoc

# Observable Implementation (REFERENCE)
- file: src/utils/observable.ts
  why: Custom Observable pattern used by WorkflowTreeDebugger
  section: Lines 1-107 (complete file)
  critical: Observable<T> generic type for type safety
  critical: subscribe() returns Subscription with unsubscribe()
  critical: next() emits values to all subscribers
  pattern: Error isolation per subscriber with try-catch

# WorkflowEvent Types (REFERENCE)
- file: src/types/events.ts
  why: Complete discriminated union of all workflow events
  section: Lines 1-76 (complete file)
  critical: All event types contain WorkflowNode references (circular!)
  critical: Event type field for discriminated union
  critical: Different events have different primitive fields (step, task, duration, etc.)
  gotcha: WorkflowNode has circular references (parent ↔ children)
  gotcha: stateSnapshot, stepStart, stepEnd, error, taskStart, taskEnd all have node field

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/01-workflowtree-debugger-analysis.md
  why: Complete analysis of WorkflowTreeDebugger implementation
  section: Section "Implementation Strategy" (constructor and onEvent modifications)
  critical: Current constructor has no options parameter
  critical: onEvent() currently only forwards to events Observable
  critical: No event history storage currently exists

- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/02-workflowevent-serialization.md
  why: Event serialization strategy to handle circular references
  section: Section "Recommended Approach for Groundswell" (serializeWorkflowEvent function)
  critical: WorkflowNode contains circular references
  critical: Use selective field extraction (nodeId, nodeName) instead of full node
  critical: Add timestamp field to each event
  critical: Handle all 18 event types in discriminated union

- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/03-observable-patterns.md
  why: Observable patterns for event streaming and error handling
  section: Section "Persistence Integration Points" (onEvent hook)
  critical: All events flow through onEvent() - perfect hook for persistence
  critical: Error isolation pattern - don't let persistence errors break event stream
  critical: Memory management considerations for unbounded growth

- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/04-testing-patterns.md
  why: Test patterns and examples from existing codebase
  section: All sections (complete testing guide)
  critical: DebugTestWorkflow class pattern for test fixtures
  critical: Tree verification helpers in src/__tests__/helpers/tree-verification.ts
  critical: File I/O test patterns with cleanup in afterEach
  critical: Integration testing with WorkflowEventReplayer

# External Documentation
- url: https://nodejs.org/api/fs.html#fspromiseswritefilefile-data-options
  why: fs/promises.writeFile API for async file writing
  critical: writeFile(path, data, options) returns Promise<void>
  critical: Use { encoding: 'utf-8' } option for JSON files

- url: https://nodejs.org/api/fs.html#fspromisesreadfilepath-options
  why: fs/promises.readFile API for async file reading
  critical: readFile(path, options) returns Promise<string> or Promise<Buffer>
  critical: Use { encoding: 'utf-8' } option for JSON files

- url: https://nodejs.org/api/fs.html#class-fsstat
  why: File system error codes for error handling
  critical: ENOENT = file not found, EACCES = permission denied
  critical: Check error.code for specific error types

# Test Helpers (for validation)
- file: src/__tests__/helpers/tree-verification.ts
  why: Reusable verification functions for tree invariants
  section: All helper functions
  pattern: Helper functions throw descriptive errors if invariants violated

# Test Files (for reference patterns)
- file: src/__tests__/unit/tree-debugger.test.ts
  why: Reference test patterns for WorkflowTreeDebugger
  pattern: DebugTestWorkflow class for test fixtures
  pattern: Subscribe to events Observable for verification

# Core Type Definitions
- file: src/types/workflow.ts
  why: WorkflowNode interface structure (contains circular references!)
  section: Lines 20-37 (WorkflowNode interface)
  critical: parent: WorkflowNode | null (circular reference)
  critical: children: WorkflowNode[] (circular reference)
  critical: events: WorkflowEvent[] (circular reference)
  gotcha: Cannot JSON.stringify WorkflowNode directly due to circular refs

- file: src/types/snapshot.ts
  why: SerializedWorkflowState type definition
  section: Lines 1-4 (SerializedWorkflowState type)
  critical: Record<string, unknown> - simple key-value structure
  critical: Already JSON-safe (no circular references)

- file: src/types/error.ts
  why: WorkflowError interface structure
  section: Lines 7-20 (WorkflowError interface)
  critical: original: unknown field could contain circular references
  gotcha: Skip 'original' field when serializing error events
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── debugger/
│   │   ├── tree-debugger.ts           # MODIFY - Add persistence functionality
│   │   ├── event-replayer.ts          # REFERENCE - WorkflowEventReplayer (from P2.M1.T1.S3)
│   │   └── index.ts                   # VERIFY - Exports WorkflowTreeDebugger
│   ├── types/
│   │   ├── events.ts                  # REFERENCE - WorkflowEvent discriminated union
│   │   ├── workflow.ts                # REFERENCE - WorkflowNode interface
│   │   ├── snapshot.ts                # REFERENCE - SerializedWorkflowState type
│   │   └── error.ts                   # REFERENCE - WorkflowError interface
│   ├── utils/
│   │   └── observable.ts              # REFERENCE - Observable<T> implementation
│   └── __tests__/
│       ├── unit/
│       │   ├── tree-debugger.test.ts  # REFERENCE - Test patterns for WorkflowTreeDebugger
│       │   └── event-replayer.test.ts # REFERENCE - Test patterns for event replay
│       └── helpers/
│           └── tree-verification.ts   # REFERENCE - Tree verification helpers
└── plan/002_6761e4b84fd1/
    └── P2M1T2S1/
        ├── PRP.md                     # THIS FILE
        └── research/
            ├── 01-workflowtree-debugger-analysis.md
            ├── 02-workflowevent-serialization.md
            ├── 03-observable-patterns.md
            └── 04-testing-patterns.md
```

### Desired Codebase Tree with Changes

```bash
# No new files - all changes in existing tree-debugger.ts

# MODIFIED: src/debugger/tree-debugger.ts
# - Add constructor options parameter
# - Add private eventHistory array
# - Modify onEvent() to capture events
# - Add getEventHistory() method
# - Add saveEventHistory() method
# - Add static loadEventHistory() method
# - Add serializeEvent() private helper
# - Add JSDoc for all new methods

# NEW: src/__tests__/unit/tree-debugger-persistence.test.ts
# - Test event accumulation with persistEvents true/false
# - Test event order preservation
# - Test save/load round-trip
# - Test serialization without circular references
# - Test error handling
# - Test integration with WorkflowEventReplayer
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: WorkflowNode Has Circular References
// - WorkflowNode.parent references parent WorkflowNode
// - WorkflowNode.children[] array contains child WorkflowNodes
// - WorkflowNode.events[] contains WorkflowEvents that reference WorkflowNodes
// - Gotcha: JSON.stringify(event) will throw TypeError due to circular refs
// - Pattern: Extract only nodeId and nodeName, not full node object
// - Reference: research/02-workflowevent-serialization.md Section "Circular Reference Problem"

// CRITICAL: No Existing File I/O in Codebase
// - Codebase currently has no fs/promises imports
// - No existing file write/read patterns to follow
// - Gotcha: Must introduce fs/promises dependency
// - Pattern: Use 'fs/promises' with async/await
// - Reference: External Documentation links in this PRP

// CRITICAL: Observable Is Custom Implementation, Not RxJS
// - src/utils/observable.ts is a lightweight custom Observable
// - No RxJS operators (map, filter, etc.)
// - Gotcha: Don't try to use RxJS methods
// - Pattern: Subscribe with Observer interface, call events.next()
// - Reference: src/utils/observable.ts

// CRITICAL: All Events Flow Through onEvent()
// - onEvent() is the single hook point for all workflow events
// - Called by workflow.addObserver() mechanism
// - Gotcha: Don't subscribe to events Observable for persistence (circular!)
// - Pattern: Capture events in onEvent() before forwarding to events.next()
// - Reference: research/03-observable-patterns.md Section "Persistence Integration Points"

// CRITICAL: Event History Can Grow Unbounded
// - No automatic cleanup or size limiting
// - Gotcha: Long-running workflows can consume significant memory
// - Pattern: Add maxEventHistorySize option with FIFO eviction
// - Reference: research/03-observable-patterns.md Section "Memory Management"

// CRITICAL: TypeScript Uses ES Modules
// - import/export syntax, not require/module.exports
// - Gotcha: Use import { writeFile } from 'fs/promises', not require()
// - Pattern: All imports at top of file
// - Reference: src/debugger/tree-debugger.ts lines 1-8

// CRITICAL: WorkflowEvent Is Discriminated Union with 18 Types
// - Each event type has different fields
// - Gotcha: Cannot serialize all events the same way
// - Pattern: Use switch statement on event.type for type-specific serialization
// - Reference: src/types/events.ts lines 8-75

// CRITICAL: Some Events Have Duration, Some Don't
// - stepEnd has duration field
// - taskEnd does NOT have duration field
// - Gotcha: Don't assume duration exists on all end events
// - Pattern: Check event type before accessing duration
// - Reference: src/types/events.ts lines 13-17

// CRITICAL: Error Event Contains 'original' Field That Could Be Circular
// - WorkflowError.original: unknown could contain anything
// - Gotcha: Serializing event.error.original could cause circular ref error
// - Pattern: Skip 'original' field when serializing, keep message/state/logs
// - Reference: research/02-workflowevent-serialization.md Section "Related Types"

// CRITICAL: Events Must Include Timestamp for Ordering
// - WorkflowEvent type doesn't have timestamp field by default
// - Gotcha: Need to add timestamp during serialization
// - Pattern: timestamp: Date.now() added during serialization
// - Reference: research/02-workflowevent-serialization.md Section "Implementation Pattern"

// CRITICAL: Backward Compatibility Required
// - Existing code creates WorkflowTreeDebugger with single workflow parameter
// - Gotcha: Don't break existing constructor signature
// - Pattern: Make options parameter optional with default values
// - Reference: research/01-workflowtree-debugger-analysis.md Section "Implementation Strategy"

// CRITICAL: File I/O Errors Should Not Break Event Stream
// - If saveEventHistory() fails, events Observable should continue working
// - Gotcha: Don't let file errors propagate to event subscribers
// - Pattern: Try-catch with error logging, rethrow for saveEventHistory()
// - Reference: research/03-observable-patterns.md Section "Observable Error Handling"

// CRITICAL: Test Files Use Vitest, Not Jest
// - vi.fn() for mocks, not jest.fn()
// - expect().toBe() syntax same as Jest
// - Gotcha: Don't use Jest-specific methods
// - Pattern: Use vi.fn(), vi.mock(), vi.doMock() for test doubles
// - Reference: src/__tests__/unit/tree-debugger.test.ts

// CRITICAL: WorkflowEventReplayer Expects Specific Event Format
// - loadEventHistory() output must be compatible with WorkflowEventReplayer.replay()
// - Gotcha: Changing event structure breaks replayer integration
// - Pattern: Preserve WorkflowEvent discriminated union structure in serialization
// - Reference: plan/002_6761e4b84fd1/P2M1T1S3/PRP.md (previous PRP)
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - uses existing types from codebase:

```typescript
// INPUT TYPE (from src/types/events.ts)
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // ... 9 more event types (agent, tool, MCP, reflection, cache)

// OUTPUT TYPE (serializable event for JSON)
type SerializableEvent = {
  type: string;
  timestamp: number;
  nodeId?: string;
  nodeName?: string;
  // ... type-specific fields
};

// INTERNAL STATE (to be added)
class WorkflowTreeDebugger {
  private eventHistory: WorkflowEvent[] = [];
  private persistEvents: boolean = false;
  private maxEventHistorySize?: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD constructor options parameter
  - FILE: src/debugger/tree-debugger.ts
  - MODIFY: constructor(workflow: Workflow) signature
  - NEW SIGNATURE: constructor(workflow: Workflow, options?: { persistEvents?: boolean; maxEventHistorySize?: number })
  - IMPLEMENTATION:
    * Add options parameter with default undefined
    * Extract persistEvents from options (default false)
    * Extract maxEventHistorySize from options (optional)
    * Initialize this.eventHistory = [] if persistEvents is true
    * Initialize this.persistEvents = persistEvents
    * Initialize this.maxEventHistorySize = maxEventHistorySize
  - BACKWARD COMPATIBILITY: options parameter is optional, defaults to persistEvents: false
  - PLACEMENT: Lines 39-48 (replace existing constructor)
  - DEPENDENCIES: None

Task 2: MODIFY onEvent() to capture events
  - FILE: src/debugger/tree-debugger.ts
  - MODIFY: onEvent(event: WorkflowEvent): void method
  - IMPLEMENTATION:
    * At start of method, check if this.persistEvents is true
    * If true, push event to this.eventHistory array
    * Handle maxEventHistorySize limit if set (FIFO eviction)
    * Continue with existing structural event handling
  - PATTERN: Accumulation pattern (append to array)
  - GOTCHA: Don't break existing structural event handling logic
  - PLACEMENT: Lines 92-117 (modify existing onEvent method)
  - DEPENDENCIES: Task 1 (eventHistory must be initialized)

Task 3: ADD getEventHistory() method
  - FILE: src/debugger/tree-debugger.ts
  - ADD: getEventHistory(): WorkflowEvent[] method
  - IMPLEMENTATION:
    * Return copy of eventHistory array (spread operator)
    * If persistEvents is false, return empty array
    * Don't return direct reference (prevent external modification)
  - RETURN TYPE: WorkflowEvent[] (copy of internal array)
  - PLACEMENT: After getStats() method (around line 255)
  - DEPENDENCIES: Task 1 (eventHistory must exist)

Task 4: ADD serializeEvent() private helper
  - FILE: src/debugger/tree-debugger.ts
  - ADD: private serializeEvent(event: WorkflowEvent): unknown method
  - IMPLEMENTATION:
    * Use switch statement on event.type for discriminated union
    * For each event type, extract primitive fields only
    * Add timestamp field: timestamp: Date.now()
    * Extract nodeId and nodeName from WorkflowNode references
    * Handle all 18 event types
    * Skip WorkflowNode.parent and WorkflowNode.children (circular refs)
    * Skip WorkflowError.original (could be circular)
  - PATTERN: Selective field extraction to avoid circular references
  - GOTCHA: Must handle every event type in discriminated union
  - REFERENCE: research/02-workflowevent-serialization.md Section "Implementation Pattern"
  - PLACEMENT: Before saveEventHistory() method (around line 260)
  - DEPENDENCIES: None (pure function)

Task 5: ADD saveEventHistory() method
  - FILE: src/debugger/tree-debugger.ts
  - ADD: async saveEventHistory(path: string): Promise<void> method
  - IMPORTS: Add import { writeFile } from 'fs/promises';
  - IMPLEMENTATION:
    * Serialize all events in eventHistory using serializeEvent()
    * Convert to JSON string with JSON.stringify(serializedEvents, null, 2)
    * Write to file using await writeFile(path, json, 'utf-8')
    * Handle errors with try-catch, rethrow with descriptive message
    * Include file path in error message for debugging
  - ERROR HANDLING:
    * Catch ENOENT: Parent directory doesn't exist
    * Catch EACCES: Permission denied
    * Catch general errors with descriptive message
  - PLACEMENT: After getEventHistory() method (around line 265)
  - DEPENDENCIES: Task 3 (getEventHistory), Task 4 (serializeEvent)

Task 6: ADD static loadEventHistory() method
  - FILE: src/debugger/tree-debugger.ts
  - ADD: static async loadEventHistory(path: string): Promise<unknown[]> method
  - IMPORTS: Add import { readFile } from 'fs/promises';
  - IMPLEMENTATION:
    * Read file using await readFile(path, 'utf-8')
    * Parse JSON using JSON.parse(content)
    * Validate parsed result is array
    * Return parsed array
  - ERROR HANDLING:
    * Catch ENOENT: Throw "File not found: {path}"
    * Catch EACCES: Throw "Permission denied: {path}"
    * Catch SyntaxError: Throw "Invalid JSON in file: {path}"
    * Catch general errors with descriptive message
  - RETURN TYPE: Promise<unknown[]> (parsed JSON array)
  - PLACEMENT: After saveEventHistory() method (around line 290)
  - DEPENDENCIES: None (static method)

Task 7: ADD JSDoc documentation
  - Add/update JSDoc for constructor with options parameter
  - Add JSDoc for getEventHistory() with @returns
  - Add JSDoc for serializeEvent() with @param and @returns
  - Add JSDoc for saveEventHistory() with @param, @returns, @throws
  - Add JSDoc for loadEventHistory() with @param, @returns, @throws
  - Include usage examples in @example tags
  - Document persistence behavior and memory implications
  - PATTERN: Follow existing JSDoc style in tree-debugger.ts

Task 8: CREATE unit tests for persistence functionality
  - FILE: src/__tests__/unit/tree-debugger-persistence.test.ts (NEW FILE)
  - TEST SUITES:
    * describe('WorkflowTreeDebugger persistence', () => { ... })
    * describe('getEventHistory', () => { ... })
    * describe('saveEventHistory', () => { ... })
    * describe('loadEventHistory', () => { ... })
    * describe('event serialization', () => { ... })
  - TEST CASES:
    * should not accumulate events when persistEvents is false (default)
    * should accumulate events when persistEvents is true
    * should preserve event order in history
    * should add timestamp to each event
    * should return empty array when persistence disabled
    * should return copy of history (prevent modification)
    * should respect maxEventHistorySize limit
    * should save event history to file
    * should load event history from file
    * should preserve event data through save/load cycle
    * should throw descriptive error for missing file
    * should throw descriptive error for invalid JSON
    * should serialize events without circular reference errors
    * should extract nodeId/nodeName from WorkflowNode references
    * should skip WorkflowError.original field during serialization
  - PATTERN: Follow research/04-testing-patterns.md Section "Test Patterns for Persistence"
  - SETUP: Use DebugTestWorkflow class pattern from existing tests
  - CLEANUP: Remove test files in afterEach hooks

Task 9: VERIFY TypeScript compilation
  - RUN: npm run build
  - CHECK: No compilation errors
  - VERIFY: dist/debugger/tree-debugger.js is created
  - VERIFY: No type errors related to fs/promises imports
  - VERIFY: No type errors related to async methods

Task 10: VERIFY all tests pass
  - RUN: npm test
  - CHECK: All new tests pass
  - CHECK: No existing tests broken
  - VERIFY: WorkflowTreeDebugger still works without persistence (backward compatibility)
```

### Implementation Patterns & Key Details

```typescript
/**
 * FILE: src/debugger/tree-debugger.ts
 *
 * PATTERN: Follow existing class structure and JSDoc style
 */

// ============================================================
// Pattern 1: Constructor with options parameter
// ============================================================

/**
 * Tree debugger for real-time workflow visualization
 * Implements WorkflowObserver to receive all events
 */
export class WorkflowTreeDebugger implements WorkflowObserver {
  /** Root node of the workflow tree */
  private root: WorkflowNode;

  /** Observable stream of workflow events */
  public readonly events: Observable<WorkflowEvent>;

  /** Node lookup map for quick access */
  private nodeMap: Map<string, WorkflowNode> = new Map();

  /** Event history for persistence (only when persistEvents is true) */
  private eventHistory: WorkflowEvent[] = [];

  /** Whether to persist events to memory */
  private persistEvents: boolean = false;

  /** Maximum event history size (optional, for memory management) */
  private maxEventHistorySize?: number;

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
  constructor(
    workflow: Workflow,
    options?: { persistEvents?: boolean; maxEventHistorySize?: number }
  ) {
    this.root = workflow.getNode();
    this.events = new Observable<WorkflowEvent>();

    // Extract options with defaults
    this.persistEvents = options?.persistEvents ?? false;
    this.maxEventHistorySize = options?.maxEventHistorySize;

    // Initialize event history if persistence enabled
    if (this.persistEvents) {
      this.eventHistory = [];
    }

    // Build initial node map
    this.buildNodeMap(this.root);

    // Register as observer on the workflow
    workflow.addObserver(this);
  }

  // ============================================================
  // Pattern 2: Modified onEvent() with event capture
  // ============================================================

  /**
   * Handle workflow events from observer interface
   * Captures events for history if persistence enabled, handles structural updates, forwards to stream
   *
   * @param event - The workflow event to handle
   */
  onEvent(event: WorkflowEvent): void {
    // NEW: Capture event for history if persistence enabled
    if (this.persistEvents) {
      // Handle max size limit (FIFO eviction)
      if (
        this.maxEventHistorySize &&
        this.eventHistory.length >= this.maxEventHistorySize
      ) {
        this.eventHistory.shift(); // Remove oldest event
      }
      this.eventHistory.push(event);
    }

    // Handle structural events with incremental updates
    switch (event.type) {
      case 'childAttached':
        // Keep existing logic - already optimal O(k)
        this.buildNodeMap(event.child);
        break;

      case 'childDetached':
        // NEW: Incremental subtree removal
        this.removeSubtreeNodes(event.childId);
        break;

      case 'treeUpdated':
        // NEW: Update root reference only
        this.root = event.root;
        break;

      default:
        // Non-structural events - no map update needed
        break;
    }

    // Always forward to event stream (existing behavior)
    this.events.next(event);
  }

  // ============================================================
  // Pattern 3: getEventHistory() method
  // ============================================================

  /**
   * Get the accumulated event history
   * Returns a copy to prevent external modification
   *
   * @returns Copy of event history array, or empty array if persistence disabled
   *
   * @example
   * ```typescript
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   * await workflow.run();
   * const events = debugger.getEventHistory();
   * console.log(`Captured ${events.length} events`);
   * ```
   */
  getEventHistory(): WorkflowEvent[] {
    if (!this.persistEvents) {
      return [];
    }
    // Return copy to prevent external modification
    return [...this.eventHistory];
  }

  // ============================================================
  // Pattern 4: serializeEvent() helper
  // ============================================================

  /**
   * Serialize a WorkflowEvent to JSON-safe format
   * Extracts only primitive fields to avoid circular references in WorkflowNode objects
   *
   * **Strategy:**
   * - Extract nodeId and nodeName from WorkflowNode references
   * - Skip WorkflowNode.parent, WorkflowNode.children (circular refs)
   * - Skip WorkflowError.original (could be circular)
   * - Add timestamp for chronological ordering
   *
   * **Circular Reference Handling:**
   * - WorkflowNode has bidirectional links (parent ↔ children)
   * - WorkflowNode.events[] contains WorkflowEvents that reference WorkflowNodes
   * - JSON.stringify would throw TypeError without selective extraction
   *
   * @param event - The workflow event to serialize
   * @returns JSON-safe object with primitive fields only
   *
   * @example
   * ```typescript
   * const event: WorkflowEvent = {
   *   type: 'stateSnapshot',
   *   node: { id: 'wf-123', name: 'MyWorkflow', ... }
   * };
   * const serialized = serializeEvent(event);
   * // { type: 'stateSnapshot', timestamp: 1234567890, nodeId: 'wf-123', nodeName: 'MyWorkflow', stateSnapshot: {...} }
   * ```
   */
  private serializeEvent(event: WorkflowEvent): unknown {
    const timestamp = Date.now();

    switch (event.type) {
      // Core events
      case 'childAttached':
        return {
          type: event.type,
          timestamp,
          parentId: event.parentId,
          childId: event.child.id,
          childName: event.child.name,
          childStatus: event.child.status,
        };

      case 'childDetached':
        return {
          type: event.type,
          timestamp,
          parentId: event.parentId,
          childId: event.childId,
        };

      case 'stateSnapshot':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          stateSnapshot: event.node.stateSnapshot,
        };

      case 'stepStart':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          step: event.step,
        };

      case 'stepEnd':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          step: event.step,
          duration: event.duration,
        };

      case 'error':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          error: {
            message: event.error.message,
            workflowId: event.error.workflowId,
            state: event.error.state,
            logs: event.error.logs,
            stack: event.error.stack,
            // Skip 'original' field - could be circular
          },
        };

      case 'taskStart':
      case 'taskEnd':
        return {
          type: event.type,
          timestamp,
          nodeId: event.node.id,
          nodeName: event.node.name,
          task: event.task,
        };

      case 'treeUpdated':
        return {
          type: event.type,
          timestamp,
          rootId: event.root.id,
          rootName: event.root.name,
        };

      // Agent/Prompt events
      case 'agentPromptStart':
        return {
          type: event.type,
          timestamp,
          agentId: event.agentId,
          agentName: event.agentName,
          promptId: event.promptId,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      case 'agentPromptEnd':
        return {
          type: event.type,
          timestamp,
          agentId: event.agentId,
          agentName: event.agentName,
          promptId: event.promptId,
          nodeId: event.node.id,
          nodeName: event.node.name,
          duration: event.duration,
          tokenUsage: event.tokenUsage,
        };

      // Tool events
      case 'toolInvocation':
        return {
          type: event.type,
          timestamp,
          toolName: event.toolName,
          input: event.input,
          output: event.output,
          duration: event.duration,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // MCP events
      case 'mcpEvent':
        return {
          type: event.type,
          timestamp,
          serverName: event.serverName,
          event: event.event,
          payload: event.payload,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // Reflection events
      case 'reflectionStart':
        return {
          type: event.type,
          timestamp,
          level: event.level,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      case 'reflectionEnd':
        return {
          type: event.type,
          timestamp,
          level: event.level,
          success: event.success,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      // Cache events
      case 'cacheHit':
      case 'cacheMiss':
        return {
          type: event.type,
          timestamp,
          key: event.key,
          nodeId: event.node.id,
          nodeName: event.node.name,
        };

      default:
        // Should not happen with TypeScript discriminated union
        // But handle gracefully for unknown event types
        return {
          type: (event as { type: string }).type,
          timestamp,
          rawData: JSON.stringify(event),
        };
    }
  }

  // ============================================================
  // Pattern 5: saveEventHistory() method
  // ============================================================

  /**
   * Save event history to a JSON file
   * Serializes events to avoid circular references and writes to disk
   *
   * **Serialization Strategy:**
   * - Uses serializeEvent() to extract primitive fields only
   * - Avoids circular references in WorkflowNode objects
   * - Adds timestamp for chronological ordering
   *
   * **Error Handling:**
   * - Throws descriptive errors for file system issues
   * - Does not modify internal event history on failure
   *
   * @param path - File path to write event history
   * @throws {Error} If file cannot be written (permission denied, disk full, etc.)
   *
   * @example
   * ```typescript
   * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
   * await workflow.run();
   * await debugger.saveEventHistory('./workflow-execution.json');
   * ```
   */
  async saveEventHistory(path: string): Promise<void>: Promise<void> {
    if (!this.persistEvents) {
      throw new Error('Event persistence is not enabled. Initialize with { persistEvents: true }');
    }

    try {
      // Serialize all events
      const serialized = this.eventHistory.map((event) =>
        this.serializeEvent(event)
      );

      // Convert to JSON string
      const json = JSON.stringify(serialized, null, 2);

      // Write to file
      await writeFile(path, json, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // Enhance error messages with context
      if (err.code === 'ENOENT') {
        throw new Error(
          `Cannot save event history: Directory does not exist: ${path}`
        );
      }

      if (err.code === 'EACCES') {
        throw new Error(
          `Cannot save event history: Permission denied: ${path}`
        );
      }

      if (err.code === 'ENOSPC') {
        throw new Error(
          `Cannot save event history: No space left on device`
        );
      }

      // Re-throw with context
      throw new Error(
        `Failed to save event history to ${path}: ${err.message}`
      );
    }
  }

  // ============================================================
  // Pattern 6: static loadEventHistory() method
  // ============================================================

  /**
   * Load event history from a JSON file
   * Static method that can be called without instantiating WorkflowTreeDebugger
   *
   * **Error Handling:**
   * - Throws descriptive errors for file system issues
   * - Throws descriptive errors for invalid JSON
   *
   * @param path - File path to read event history from
   * @returns Parsed event array (unknown[] - caller should validate structure)
   * @throws {Error} If file does not exist
   * @throws {Error} If file cannot be read (permission denied, etc.)
   * @throws {Error} If file contains invalid JSON
   *
   * @example
   * ```typescript
   * const events = await WorkflowTreeDebugger.loadEventHistory('./workflow-execution.json');
   *
   * // Use with WorkflowEventReplayer
   * const replayer = new WorkflowEventReplayer();
   * const tree = replayer.replay(events as WorkflowEvent[]);
   * ```
   */
  static async loadEventHistory(path: string): Promise<unknown[]> {
    try {
      // Read file
      const content = await readFile(path, 'utf-8');

      // Parse JSON
      const parsed = JSON.parse(content);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Invalid event history file: Expected array, got ${typeof parsed}`
        );
      }

      return parsed;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // Handle file not found
      if (err.code === 'ENOENT') {
        throw new Error(`Event history file not found: ${path}`);
      }

      // Handle permission denied
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied reading file: ${path}`);
      }

      // Handle invalid JSON
      if (err instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in event history file: ${path}\n${err.message}`
        );
      }

      // Re-throw with context
      throw new Error(
        `Failed to load event history from ${path}: ${err.message}`
      );
    }
  }

  // ... existing methods (buildNodeMap, removeSubtreeNodes, etc.)
}
```

### Integration Points

```yaml
FILE IMPORTS TO ADD:
  - file: src/debugger/tree-debugger.ts
  - add: import { writeFile, readFile } from 'fs/promises';
  - placement: Top of file, after existing imports
  - note: fs/promises is built into Node.js, no package.json change needed

EXPORTS TO VERIFY:
  - file: src/debugger/index.ts
  - verify: WorkflowTreeDebugger is exported
  - verify: New methods are accessible via exported class

NEW TEST FILE:
  - file: src/__tests__/unit/tree-debugger-persistence.test.ts
  - create: New test file for persistence functionality
  - pattern: Follow existing test patterns from tree-debugger.test.ts

DEPENDENCIES:
  - No new npm packages required (fs/promises is built-in)
  - No changes to package.json
  - No changes to tsconfig.json

BREAKING CHANGES:
  - None - options parameter is optional with default values
  - Backward compatible with existing usage

INTEGRATION WITH WorkflowEventReplayer:
  - file: src/debugger/event-replayer.ts
  - integration: loadEventHistory() output → replayer.replay() input
  - note: Serialized events should be compatible with replayer
  - validation: Test round-trip: debugger → save → load → replayer
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each task completion - fix before proceeding
npm run build                    # TypeScript compilation
# Expected: Zero errors. dist/debugger/tree-debugger.js is created

# Verify no type errors
npx tsc --noEmit                # Type checking without compilation
# Expected: Zero type errors

# Manual verification of changes
grep -n "constructor(workflow" src/debugger/tree-debugger.ts
# Expected: Line shows constructor with options parameter

grep -n "private eventHistory" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

grep -n "getEventHistory()" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

grep -n "saveEventHistory(" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

grep -n "loadEventHistory(" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

grep -n "serializeEvent(" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

# Verify fs/promises import
grep -n "from 'fs/promises'" src/debugger/tree-debugger.ts
# Expected: Found (1 match)

# Verify event capture in onEvent
grep -A 5 "onEvent(event: WorkflowEvent)" src/debugger/tree-debugger.ts | grep "eventHistory"
# Expected: Found event capture logic
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the persistence functionality
npm test src/__tests__/unit/tree-debugger-persistence.test.ts

# Test existing functionality still works
npm test src/__tests__/unit/tree-debugger.test.ts

# Full test suite for affected areas
npm test src/__tests__/unit/

# Expected: All tests pass
# - Event accumulation works with persistEvents true
# - No accumulation with persistEvents false
# - Event order preserved
# - Save/load round-trip works
# - Serialization handles circular references
# - Error handling for file operations
# - Existing tests still pass (backward compatibility)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify integration with WorkflowEventReplayer
npm test src/__tests__/integration/

# Manual integration test
cat > test-persistence-integration.js << 'EOF'
import { WorkflowTreeDebugger } from './dist/index.js';
import { WorkflowEventReplayer } from './dist/index.js';

// Create test workflow
const workflow = new MyWorkflow();

// Create debugger with persistence
const debugger = new WorkflowTreeDebugger(workflow, {
  persistEvents: true,
});

// Run workflow
await workflow.run();

// Get event history
const events = debugger.getEventHistory();
console.log(`Captured ${events.length} events`);

// Save to file
await debugger.saveEventHistory('./test-events.json');
console.log('Saved to test-events.json');

// Load from file
const loadedEvents = await WorkflowTreeDebugger.loadEventHistory('./test-events.json');
console.log(`Loaded ${loadedEvents.length} events`);

// Replay with WorkflowEventReplayer
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(loadedEvents);
console.log(`Replayed tree: ${tree.name}`);

// Cleanup
import { unlink } from 'fs/promises';
await unlink('./test-events.json');
EOF

node test-persistence-integration.js
# Expected: Output shows successful round-trip

# Expected: Integration tests pass, persistence works with replayer
```

### Level 4: Manual Verification (Domain-Specific Validation)

```bash
# Test circular reference handling
cat > test-serialization.js << 'EOF'
import { WorkflowTreeDebugger } from './dist/index.js';

// Create workflow with child (creates circular refs)
const parent = new MyWorkflow('parent');
const child = new MyWorkflow('child');
await parent.attachChild(child);

// Create debugger with persistence
const debugger = new WorkflowTreeDebugger(parent, {
  persistEvents: true,
});

// Trigger events
parent.snapshotState();

// Get events
const events = debugger.getEventHistory();
console.log(`Events captured: ${events.length}`);

// Try to serialize (should not throw)
const serialized = events.map(e => {
  // Use internal serializeEvent via reflection for testing
  return debugger.serializeEvent(e);
});

const json = JSON.stringify(serialized, null, 2);
console.log('JSON serialization successful!');
console.log(`JSON length: ${json.length} bytes`);
EOF

node test-serialization.js
# Expected: No circular reference errors, JSON serialization succeeds

# Test large event history
cat > test-large-history.js << 'EOF'
import { WorkflowTreeDebugger } from './dist/index.js';

const workflow = new MyWorkflow();
const debugger = new WorkflowTreeDebugger(workflow, {
  persistEvents: true,
  maxEventHistorySize: 100,
});

// Generate 200 events (should only keep 100)
for (let i = 0; i < 200; i++) {
  workflow.snapshotState();
}

const history = debugger.getEventHistory();
console.log(`History size: ${history.length} (max: 100)`);
console.assert(history.length === 100, 'Should respect maxEventHistorySize');
EOF

node test-large-history.js
# Expected: History size is 100 (FIFO eviction)

# Test backward compatibility
cat > test-backward-compat.js << 'EOF'
import { WorkflowTreeDebugger } from './dist/index.js';

// Old usage (without options parameter)
const workflow = new MyWorkflow();
const debugger = new WorkflowTreeDebugger(workflow);

await workflow.run();

const history = debugger.getEventHistory();
console.log(`History size: ${history.length} (should be 0)`);
console.assert(history.length === 0, 'Default should not persist events');
EOF

node test-backward-compat.js
# Expected: History size is 0 (backward compatible)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Constructor accepts `options?: { persistEvents?: boolean; maxEventHistorySize?: number }`
- [ ] `eventHistory` array initialized only when `persistEvents` is true
- [ ] `onEvent()` pushes events to `eventHistory` when enabled
- [ ] `onEvent()` handles `maxEventHistorySize` with FIFO eviction
- [ ] `getEventHistory()` returns copy of event history
- [ ] `getEventHistory()` returns empty array when persistence disabled
- [ ] `serializeEvent()` handles all 18 event types
- [ ] `serializeEvent()` extracts nodeId/nodeName from WorkflowNode
- [ ] `serializeEvent()` adds timestamp to each event
- [ ] `serializeEvent()` skips WorkflowError.original field
- [ ] `saveEventHistory()` writes JSON file without circular reference errors
- [ ] `saveEventHistory()` throws descriptive errors for file system issues
- [ ] `loadEventHistory()` reads and parses JSON file
- [ ] `loadEventHistory()` throws descriptive error for missing files
- [ ] `loadEventHistory()` throws descriptive error for invalid JSON
- [ ] All methods have comprehensive JSDoc documentation
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] Test file created at `src/__tests__/unit/tree-debugger-persistence.test.ts`

### Feature Validation

- [ ] Events accumulate when `persistEvents: true`
- [ ] Events do not accumulate when `persistEvents: false` (default)
- [ ] Event history maintains chronological order
- [ ] Each event has timestamp added during serialization
- [ ] WorkflowNode references serialized without circular references
- [ ] File save succeeds for valid paths
- [ ] File load succeeds for valid files
- [ ] Event data preserved through save/load cycle
- [ ] maxEventHistorySize limit enforced when set
- [ ] Existing WorkflowTreeDebugger functionality unchanged
- [ ] Integration with WorkflowEventReplayer works
- [ ] Backward compatibility maintained (constructor without options works)

### Code Quality Validation

- [ ] Follows existing patterns from `tree-debugger.ts`
- [ ] Returns copy of `eventHistory` (prevents external modification)
- [ ] Error handling is comprehensive with descriptive messages
- [ ] No modification to existing public API signatures
- [ ] Private helper methods follow existing naming conventions
- [ ] JSDoc includes usage examples
- [ ] Code is self-documenting with clear variable names
- [ ] No circular reference errors in serialization
- [ ] File operations use async/await pattern
- [ ] Memory management considerations documented

### Test Coverage Validation

- [ ] Test for event accumulation with persistEvents true
- [ ] Test for no accumulation with persistEvents false
- [ ] Test for event order preservation
- [ ] Test for timestamp addition
- [ ] Test for maxEventHistorySize limit
- [ ] Test for getEventHistory returning copy
- [ ] Test for saveEventHistory success
- [ ] Test for saveEventHistory errors (ENOENT, EACCES, ENOSPC)
- [ ] Test for loadEventHistory success
- [ ] Test for loadEventHistory errors (missing file, invalid JSON)
- [ ] Test for serialization without circular references
- [ ] Test for WorkflowNode field extraction
- [ ] Test for WorkflowError.original field skipping
- [ ] Test for save/load round-trip data integrity
- [ ] Test for backward compatibility (constructor without options)
- [ ] Test for integration with WorkflowEventReplayer
- [ ] Test cleanup in afterEach hooks

---

## Anti-Patterns to Avoid

- ❌ Don't modify events after capturing them (events should be immutable)
- ❌ Don't return direct reference to `eventHistory` array (return a copy)
- ❌ Don't skip timestamp field (needed for event ordering)
- ❌ Don't serialize full WorkflowNode objects (causes circular references)
- ❌ Don't include WorkflowError.original in serialization (could be circular)
- ❌ Don't use synchronous file operations (fs.writeFile, fs.readFile)
- ❌ Don't let file I/O errors break the event stream (isolate errors)
- ❌ Don't forget to handle all 18 event types in serializeEvent()
- ❌ Don't throw error for missing nodeIds in serialization (graceful fallback)
- ❌ Don't assume duration exists on all event types (check type first)
- ❌ Don't break backward compatibility (options parameter must be optional)
- ❌ Don't forget to add fs/promises imports
- ❌ Don't use try-catch in onEvent() for event capture (performance)
- ❌ Don't clear eventHistory when save fails (preserve data)
- ❌ Don't use console.log for error messages (throw with context)
- ❌ Don't forget to document memory implications of persistence

---

## References

### Research Files (plan/002_6761e4b84fd1/P2M1T2S1/research/)

- `01-workflowtree-debugger-analysis.md` - WorkflowTreeDebugger implementation analysis
- `02-workflowevent-serialization.md` - Event serialization strategy for circular references
- `03-observable-patterns.md` - Observable patterns and persistence integration
- `04-testing-patterns.md` - Test patterns and examples

### Source Files Referenced

- `src/debugger/tree-debugger.ts` - File to modify, current implementation
- `src/types/events.ts` - WorkflowEvent discriminated union type
- `src/types/workflow.ts` - WorkflowNode interface (circular references)
- `src/utils/observable.ts` - Custom Observable implementation
- `src/__tests__/unit/tree-debugger.test.ts` - Reference test patterns
- `src/__tests__/helpers/tree-verification.ts` - Tree verification helpers

### Previous PRPs

- `plan/002_6761e4b84fd1/P2M1T1.S3/PRP.md` - WorkflowEventReplayer implementation
- `plan/002_6761e4b84fd1/P2M1T1S2/PRP.md` - Structural event handling in replayer

### External Documentation

- Node.js fs/promises API: https://nodejs.org/api/fs.html#fspromiseswritefilefile-data-options
- Node.js File System Errors: https://nodejs.org/api/fs.html#class-fsstat
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html#discriminated-unions

---

**End of PRP**
