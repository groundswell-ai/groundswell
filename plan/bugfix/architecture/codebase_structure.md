# Codebase Structure Analysis - Hierarchical Workflow Engine

## 1. Directory Structure Overview

```
/home/dustin/projects/groundswell/
├── src/
│   ├── core/              # Core workflow engine
│   │   ├── workflow.ts    # Main Workflow class
│   │   ├── logger.ts      # WorkflowLogger
│   │   ├── agent.ts       # Agent class
│   │   ├── prompt.ts      # Prompt class
│   │   ├── context.ts     # Execution context
│   │   ├── workflow-context.ts
│   │   ├── event-tree.ts  # Event tree implementation
│   │   ├── factory.ts     # Factory functions
│   │   └── mcp-handler.ts # MCP (Model Context Protocol) handler
│   ├── decorators/        # Decorator implementations
│   │   ├── step.ts        # @Step decorator
│   │   ├── task.ts        # @Task decorator
│   │   └── observed-state.ts  # @ObservedState decorator
│   ├── types/            # TypeScript type definitions
│   │   ├── workflow.ts   # WorkflowNode, WorkflowStatus
│   │   ├── error.ts      # WorkflowError interface
│   │   ├── error-strategy.ts  # ErrorMergeStrategy
│   │   ├── observer.ts   # WorkflowObserver interface
│   │   ├── events.ts     # WorkflowEvent discriminated union
│   │   ├── logging.ts    # LogEntry, LogLevel
│   │   ├── decorators.ts # StepOptions, TaskOptions
│   │   └── index.ts      # Type exports
│   ├── debugger/         # Debugging tools
│   │   └── tree-debugger.ts  # WorkflowTreeDebugger
│   ├── cache/            # Caching system
│   │   ├── cache.ts      # LLMCache
│   │   └── cache-key.ts  # Cache key generation
│   ├── reflection/       # Reflection system
│   │   └── reflection.ts # ReflectionManager
│   ├── tools/            # Introspection tools
│   │   └── introspection.ts
│   ├── utils/            # Utilities
│   │   ├── id.ts         # generateId()
│   │   └── observable.ts # Observable class
│   ├── __tests__/        # Test suites
│   │   ├── unit/
│   │   ├── integration/
│   │   └── adversarial/  # Edge case and stress tests
│   └── index.ts          # Main exports
├── examples/             # Example workflows
├── docs/                 # Documentation
└── package.json          # Project configuration
```

## 2. Key Files and Their Responsibilities

| File | Responsibility |
|------|----------------|
| `src/core/workflow.ts` | Main Workflow class supporting both class-based (subclass with run()) and functional (executor) patterns. Manages parent-child relationships, observers, event emission, and tree structure validation. |
| `src/core/logger.ts` | WorkflowLogger class that emits log entries to workflow nodes and observers with hierarchical logging support via child() method. |
| `src/decorators/step.ts` | @Step decorator that wraps methods to emit stepStart/stepEnd events, track timing, handle errors, and optionally snapshot state. |
| `src/decorators/task.ts` | @Task decorator that wraps methods returning child workflows, automatically attaches them, and supports concurrent execution. |
| `src/decorators/observed-state.ts` | @ObservedState decorator for marking fields to include in state snapshots with support for redaction and hiding. |
| `src/debugger/tree-debugger.ts` | WorkflowTreeDebugger observer that builds node lookup maps and renders ASCII tree visualizations. |
| `src/types/error.ts` | WorkflowError interface containing message, original error, workflowId, stack, state snapshot, and logs. |
| `src/types/error-strategy.ts` | ErrorMergeStrategy interface for merging multiple errors from concurrent operations. |
| `src/types/observer.ts` | WorkflowObserver interface defining onLog, onEvent, onStateUpdated, and onTreeChanged methods. |
| `src/utils/observable.ts` | Lightweight Observable implementation for event streaming with subscription management. |
| `src/utils/id.ts` | generateId() utility using crypto.randomUUID with timestamp fallback. |

## 3. Bug Report Claim Validation

| Claim | Location | Status | Evidence |
|-------|----------|--------|----------|
| **WorkflowLogger.child() signature** | `src/core/logger.ts:84` | ✅ **CONFIRMED** | Line 84: `child(parentLogId: string): WorkflowLogger {` - Returns new WorkflowLogger with parentLogId passed to constructor |
| **Concurrent task execution** | `src/decorators/task.ts:112` | ✅ **CONFIRMED** | Line 112: `await Promise.all(runnable.map((w) => w.run()));` - Executes runnable workflows in parallel when `opts.concurrent` is true |
| **ErrorMergeStrategy definition** | `src/types/error-strategy.ts` | ✅ **CONFIRMED** | File exists with interface defining `enabled: boolean`, `maxMergeDepth?: number`, and `combine?(errors: WorkflowError[]): WorkflowError` |
| **trackTiming default** | `src/decorators/step.ts:94` | ✅ **CONFIRMED** | Line 94: `if (opts.trackTiming !== false)` - Default is true (timing tracked unless explicitly disabled) |
| **Observer error handling** | `src/core/workflow.ts:376` | ✅ **CONFIRMED** | Lines 367-377: Observer callbacks wrapped in try-catch with `console.error('Observer onEvent error:', err);` at line 376 |
| **getRootObservers method** | `src/core/workflow.ts:124-139` | ✅ **CONFIRMED** | Lines 124-139: Private method traversing parent chain with cycle detection using visited Set |
| **Tree debugger node map** | `src/debugger/tree-debugger.ts:80-84` | ✅ **CONFIRMED** | Lines 80-84: onTreeChanged() clears nodeMap and calls buildNodeMap(root); buildNodeMap() at line 54 uses `this.nodeMap.set(node.id, node);` |

**All 7 bug report claims are VALID and the code exists exactly as stated.**

## 4. Decorator System Pattern

The codebase uses **standard ECMAScript Stage 3 Decorators** (not legacy TypeScript decorators).

### Pattern Structure

All decorators follow this pattern:
```typescript
export function DecoratorName(opts: Options = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>
  ) {
    // CRITICAL: Use regular function, not arrow function
    async function wrapper(this: This, ...args: Args): Promise<Return> {
      // Cast to WorkflowLike for accessing workflow properties
      const wf = this as unknown as WorkflowLike;

      // Pre-processing (emit events, capture start time)

      const result = await originalMethod.call(this, ...args);

      // Post-processing (emit events, attach children, etc.)

      return result;
    }

    return wrapper;
  };
}
```

### Key Design Decisions

1. **Regular function over arrow functions** - Preserves `this` binding for instance access
2. **WorkflowLike interface casting** - Enables duck-typing for workflow-like objects
3. **Lenient validation** - Non-workflow returns are silently skipped rather than throwing
4. **Event emission pattern** - All decorators emit events via `wf.emitEvent()`

## 5. Error Class Hierarchy

```
WorkflowError (interface)
├── message: string
├── original: unknown          // Original thrown error
├── workflowId: string         // ID where error occurred
├── stack?: string            // Stack trace if available
├── state: SerializedWorkflowState  // State snapshot at error time
└── logs: LogEntry[]          // Logs from failing node

ErrorMergeStrategy (interface)
├── enabled: boolean          // Enable error merging (default: false)
├── maxMergeDepth?: number    // Maximum depth to merge errors
└── combine?(errors: WorkflowError[]): WorkflowError  // Custom combiner
```

Error handling flow:
1. Errors caught in decorator wrappers (@Step, @Task)
2. Enriched with workflow context (state, logs, workflowId)
3. Emitted as 'error' events to observers
4. Re-thrown for upstream handling

## 6. Observer Pattern Implementation

### Observer Interface

```typescript
interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

### Observer Management

- **Registration**: `workflow.addObserver(observer)` - Only allowed on root workflows
- **Storage**: Private `observers: WorkflowObserver[]` array on root workflow
- **Propagation**: Child workflows access root observers via `getRootObservers()` method
- **Error isolation**: All observer callbacks wrapped in try-catch to prevent observer failures from affecting workflow execution

### Event Flow

```
Workflow.emitEvent()
  ├── Push to node.events array
  ├── Get observers via getRootObservers()
  └── For each observer:
      ├── Call onEvent(event)
      ├── Call onTreeChanged(root) if tree update event
      └── Catch and log errors (console.error)
```

### Key Implementation Details

1. **Root-only observers**: Observers can only be added to root workflows (throws error if parent exists)
2. **Cycle-safe traversal**: `getRootObservers()` uses visited Set to detect circular parent-child relationships
3. **Lazy initialization**: Logger created with root observers in constructor
4. **Multiple observer types**: WorkflowTreeDebugger, custom observers can be attached

## 7. Logger Architecture

### WorkflowLogger Class

```typescript
class WorkflowLogger {
  private readonly parentLogId?: string;

  constructor(
    private readonly node: WorkflowNode,
    private readonly observers: WorkflowObserver[],
    parentLogId?: string
  )

  // Logging methods
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void

  // Hierarchical logging
  child(parentLogId: string): WorkflowLogger
}
```

### Log Entry Structure

```typescript
interface LogEntry {
  id: string;                  // Unique identifier
  workflowId: string;          // Workflow that created log
  timestamp: number;           // Unix timestamp in ms
  level: LogLevel;             // 'debug' | 'info' | 'warn' | 'error'
  message: string;             // Log message
  data?: unknown;              // Optional structured data
  parentLogId?: string;        // Parent log ID for hierarchy
}
```

### Logging Flow

1. Log method called → `log(level, message, data)`
2. LogEntry created with metadata and parentLogId if child logger
3. Entry pushed to `node.logs` array
4. All observers notified via `obs.onLog(entry)`
5. Observer errors caught and logged to console

### Key Features

- **Hierarchical logging**: `child()` method creates logger with parentLogId reference
- **Observer broadcast**: All log entries sent to all root observers
- **Error isolation**: Observer onLog errors don't stop logging
- **Timestamp tracking**: Automatic timestamp generation

## 8. Additional Architecture Patterns

### Dual Tree Architecture

The codebase maintains **two synchronized tree structures**:

1. **Workflow Tree**: `workflow.children` array (Workflow class instances)
2. **Node Tree**: `node.children` array (WorkflowNode data structures)

This 1:1 mirror is maintained in:
- `attachChild()`: Adds to both trees and sets parent references
- `detachChild()`: Removes from both trees and clears parent references

### Cycle Detection

Three methods use visited Set pattern for cycle detection:

1. `getRootObservers()` - Lines 124-139
2. `isDescendantOf()` - Lines 151-169 (private helper for attachChild validation)
3. `getRoot()` - Lines 175-190

All throw `'Circular parent-child relationship detected'` if cycle found.

### Event Types

The discriminated union includes 17+ event types:
- Core: childAttached, childDetached, stateSnapshot, stepStart, stepEnd, error, taskStart, taskEnd, treeUpdated
- Agent: agentPromptStart, agentPromptEnd
- Tools: toolInvocation, mcpEvent
- Reflection: reflectionStart, reflectionEnd
- Cache: cacheHit, cacheMiss

## 9. Testing Strategy

The test suite is organized into:

- **Unit tests**: Individual component testing
- **Integration tests**: Multi-component workflows
- **Adversarial tests**: Edge cases, circular references, deep hierarchies, PRD compliance

Test coverage includes:
- Decorator behavior
- Tree mirroring (workflow/node tree consistency)
- Reparenting workflows
- Observer propagation
- attachChild/detachChild validation
- Circular reference detection
- Performance benchmarks (attachChild performance)

## 10. Dependencies

**Core Runtime**:
- `@anthropic-ai/sdk` ^0.71.1 - Anthropic Claude API
- `zod` ^3.23.0 - Schema validation
- `lru-cache` ^10.4.3 - LLM response caching

**Development**:
- `typescript` ^5.2.0 - Stage 3 decorators support
- `vitest` ^1.0.0 - Testing framework
- `tsx` ^4.21.0 - TypeScript execution

## Summary

The Hierarchical Workflow Engine is a well-architected TypeScript library that provides:

1. **Validated bug report claims** - All 7 claims confirmed accurate
2. **Modern decorator pattern** - ECMAScript Stage 3 decorators with proper `this` preservation
3. **Robust observer system** - Root-based observer management with error isolation
4. **Dual tree architecture** - Synchronized workflow and node trees with cycle detection
5. **Rich error context** - WorkflowError includes state snapshots and logs
6. **Hierarchical logging** - Parent-child log relationships via child() method
7. **Comprehensive tooling** - Debugger, caching, reflection, and introspection

The codebase demonstrates strong engineering practices with clear separation of concerns, extensive type safety, and thorough test coverage including adversarial test cases.
