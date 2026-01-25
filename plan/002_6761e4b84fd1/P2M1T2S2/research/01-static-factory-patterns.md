# Static Factory Method Patterns for WorkflowTreeDebugger

## Overview

This document analyzes static factory method patterns for creating time-travel debugging instances of `WorkflowTreeDebugger` from saved event files.

## Existing Factory Patterns in Codebase

### src/core/factory.ts Analysis

The codebase already has established factory function patterns:

```typescript
// General creation pattern
export function createWorkflow<T>(config: WorkflowConfig, executor: WorkflowExecutor<T>): Workflow<T>
export function createAgent(config: AgentConfig): Agent
export function createPrompt<T>(config: PromptConfig<T>): Prompt<T>

// Shorthand patterns
export function quickWorkflow<T>(name: string, executor: WorkflowExecutor<T>): Workflow<T>
export function quickAgent(name: string, system?: string): Agent
```

**Key Observations:**
- Functions use `create*` prefix for general creation
- Functions use `quick*` prefix for shorthand/simple creation
- All factory functions are standalone (not static class methods)
- Return newly constructed instances

## Static Factory Method Naming Conventions

### Industry Standard Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| `create()` | General creation from data | `WorkflowTreeDebugger.create(events)` |
| `from()` | Create from specific source | `WorkflowTreeDebugger.fromFile(path)` |
| `for()` | Purpose-specific creation | `WorkflowTreeDebugger.forReplay(events)` |
| `readonly()` | Read-only instance | `WorkflowTreeDebugger.readonly(events)` |
| `replay()` | Replay from history | `WorkflowTreeDebugger.replay(path)` |

### Recommended Naming for This PRP

Based on the contract definition in the work item:
> "Add static method WorkflowTreeDebugger.replay(path: string): WorkflowTreeDebugger"

The naming is **already specified** in the contract:
- Method name: `replay`
- Parameter: `path: string`
- Returns: `WorkflowTreeDebugger` instance

This follows the `for*` pattern purpose (replay-focused creation) but uses the verb `replay` directly for clarity.

## Implementation Strategy

### Static Method Structure

```typescript
class WorkflowTreeDebugger implements WorkflowObserver {
  /**
   * Create a debugger instance by replaying events from a saved file
   *
   * **Time-Travel Debugging:**
   * - Loads events from JSON file
   * - Replays using WorkflowEventReplayer
   * - Returns new debugger with reconstructed tree (read-only, no live workflow)
   *
   * **Read-Only Nature:**
   * - The returned debugger is not attached to a live workflow
   * - Tree is reconstructed from historical event data
   * - No observer registration (no workflow to observe)
   * - All existing debugger methods work (rendering, stats, etc.)
   *
   * @param path - Path to saved event JSON file
   * @returns New WorkflowTreeDebugger instance with reconstructed tree
   * @throws {Error} If file cannot be read
   * @throws {Error} If file contains invalid JSON
   * @throws {Error} If replay fails to reconstruct tree
   *
   * @example
   * ```typescript
   * // Create debugger from saved event file
   * const debugger = WorkflowTreeDebugger.replay('./workflow-events.json');
   *
   * // Use debugger methods for analysis
   * console.log(debugger.toTreeString());
   * console.log(debugger.getStats());
   * ```
   */
  static async replay(path: string): Promise<WorkflowTreeDebugger> {
    // Implementation steps:
    // 1. Load events from file using loadEventHistory(path)
    // 2. Create WorkflowEventReplayer instance
    // 3. Replay events to get reconstructed tree
    // 4. Create new WorkflowTreeDebugger instance
    // 5. Return the instance
  }
}
```

## Constructor Modification Required

### Challenge: Current Constructor Requires Live Workflow

The current `WorkflowTreeDebugger` constructor signature:
```typescript
constructor(workflow: Workflow, options?: { persistEvents?: boolean; maxEventHistorySize?: number })
```

This requires a live `Workflow` instance, but for replay we have:
- No live workflow (historical data only)
- Reconstructed `WorkflowNode` tree from replayer
- Need to create debugger without workflow observer registration

### Solution: Internal Constructor Pattern

Option 1: **Internal-only constructor signature**
```typescript
// Existing public constructor
constructor(workflow: Workflow, options?: DebuggerOptions)

// Internal constructor for replay (private or protected)
private constructor(root: WorkflowNode, fromReplay: true)
```

Option 2: **Static factory bypasses constructor**
```typescript
// Use Object.create() to bypass constructor
static async replay(path: string): Promise<WorkflowTreeDebugger> {
  const events = await WorkflowTreeDebugger.loadEventHistory(path);
  const replayer = new WorkflowEventReplayer();
  const root = replayer.replay(events as WorkflowEvent[]);

  // Create instance without calling constructor
  const instance = Object.create(WorkflowTreeDebugger.prototype);
  instance.root = root;
  instance.events = new Observable<WorkflowEvent>();
  instance.nodeMap = new Map();
  instance.buildNodeMap(root);

  return instance;
}
```

### Recommended Approach: Option 2

**Reasoning:**
- Cleaner API (single public constructor)
- No constructor signature confusion
- Follows factory pattern best practices
- TypeScript type safety maintained
- `Object.create()` is standard pattern for this use case

## Integration with Existing Code

### Reusing loadEventHistory()

The static `replay()` method should reuse the existing `loadEventHistory()` method:
```typescript
static async replay(path: string): Promise<WorkflowTreeDebugger> {
  // Load events using existing static method
  const events = await WorkflowTreeDebugger.loadEventHistory(path);

  // Create replayer and reconstruct tree
  const replayer = new WorkflowEventReplayer();
  const root = replayer.replay(events as WorkflowEvent[]);

  // Create debugger instance
  const instance = Object.create(WorkflowTreeDebugger.prototype);
  instance.root = root;
  instance.events = new Observable<WorkflowEvent>();
  instance.nodeMap = new Map();
  instance.buildNodeMap(root);
  instance.persistEvents = false; // Replay debugger is read-only

  return instance;
}
```

### Properties to Initialize

When creating the replay debugger instance, initialize these properties:
- `root`: The reconstructed tree from replayer
- `events`: Empty `Observable<WorkflowEvent>` (no live events)
- `nodeMap`: Built from reconstructed tree
- `persistEvents`: Set to `false` (read-only, no new events)
- `eventHistory`: Empty array (no accumulation needed)
- `maxEventHistorySize`: `undefined`

## Read-Only Considerations

### What "Read-Only" Means

A replay-created debugger is "read-only" in the sense that:
- No live workflow is attached
- No observer registration occurs
- No new events will be received
- The tree state is historical (frozen at replay point)

### What Still Works

All existing debugger methods work on replay instances:
- `getTree()` - Returns reconstructed tree
- `getNode(id)` - Lookup nodes in reconstructed tree
- `toTreeString()` - Render historical tree
- `toLogString()` - Show logs from historical tree
- `getStats()` - Statistics on historical tree

### What Doesn't Apply

- `onEvent()` - Won't be called (no observer registration)
- `onLog()` - Won't be called (no observer registration)
- `getEventHistory()` - Returns `[]` (persistEvents is false)
- `saveEventHistory()` - Would throw (persistEvents is false)

## Testing Strategy

### Unit Test Structure

```typescript
describe('WorkflowTreeDebugger.replay', () => {
  it('should create debugger from saved event file', async () => {
    // Arrange: Create workflow, run with debugger, save events
    const workflow = new TestWorkflow();
    const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
    await workflow.run();
    await liveDebugger.saveEventHistory('./test-events.json');

    // Act: Create replay debugger
    const replayDebugger = await WorkflowTreeDebugger.replay('./test-events.json');

    // Assert: Verify tree structure
    expect(replayDebugger.getTree()).toBeDefined();
    expect(replayDebugger.toTreeString()).toContain('TestWorkflow');
  });

  it('should create read-only debugger with no live workflow', async () => {
    const replayDebugger = await WorkflowTreeDebugger.replay('./test-events.json');

    // Assert: No observer methods called
    // Assert: getEventHistory returns empty array
    expect(replayDebugger.getEventHistory()).toEqual([]);
  });

  it('should throw descriptive error for missing file', async () => {
    await expect(
      WorkflowTreeDebugger.replay('./non-existent.json')
    ).rejects.toThrow('Event history file not found');
  });
});
```

## References

- Factory Pattern: https://refactoring.guru/design-patterns/factory-method
- Static Factory Pattern: https://mariusschulz.com/blog/the-static-factory-pattern-in-typescript
- Object.create(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
