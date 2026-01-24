# Tree Debugger Patterns - Quick Reference

**Session:** 002_6761e4b84fd1
**Date:** 2026-01-24

---

## 1. Observer Pattern

### Key Implementation
```typescript
// Current (optimal)
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}

// Error isolation pattern
for (const obs of this.observers) {
  try {
    obs.onLog(entry);
  } catch (err) {
    // Log without observer notification to prevent infinite loops
    this.emitWithoutObserverNotification(errorEntry);
  }
}
```

### Best Practices
- ✅ Use typed interfaces for compile-time safety
- ✅ Isolate observer errors to prevent cascading failures
- ✅ Return unsubscribe handles for cleanup
- ✅ Use Set for O(1) add/remove operations

### Alternatives
- **EventEmitter**: Built-in, less type-safe
- **RxJS**: Powerful operators, heavy dependency
- **WeakMap**: Auto-cleanup, more complex

---

## 2. Event Sourcing for Trees

### Core Pattern
```typescript
// Replay events to rebuild tree
class TreeProjector {
  rebuild(events: WorkflowEvent[]): WorkflowNode {
    const root = createRootNode();
    const nodeMap = new Map([['root', root]]);

    for (const event of events) {
      switch (event.type) {
        case 'childAttached':
          this.applyChildAttached(nodeMap, event);
          break;
        case 'childDetached':
          this.applyChildDetached(nodeMap, event);
          break;
      }
    }

    return root;
  }
}
```

### Performance
| Operation | Full Rebuild | Incremental | Improvement |
|-----------|--------------|-------------|-------------|
| Single node attach | O(n) | O(1) | n× faster |
| Subtree detach | O(n) | O(k) | n/k× faster |
| Root update | O(n) | O(1) | n× faster |

### Best Practices
- ✅ Use incremental updates for performance
- ✅ Store events immutably
- ✅ Implement snapshot strategy for long streams
- ✅ Version event schemas for migration

---

## 3. 1:1 Tree Mirrors

### Invariant Checker
```typescript
class TreeInvariantChecker {
  static verifyMirror(workflowRoot: Workflow, debuggerRoot: WorkflowNode): void {
    const execNodes = this.collectAllNodes(workflowRoot.node);
    const debugNodes = this.collectAllNodes(debuggerRoot);

    expect(execNodes.size).toBe(debugNodes.size);
    expect([...execNodes.keys()].sort()).toEqual([...debugNodes.keys()].sort());
  }
}
```

### Best Practices
- ✅ Synchronous, atomic updates (no eventual consistency)
- ✅ Single source of truth for structural events
- ✅ Forward-only changes (use detachChild, not manual array manipulation)
- ✅ Immediate observer notification (no setTimeout)

### Anti-Patterns
- ❌ Async event processing (creates temporary inconsistency)
- ❌ Manual tree modification (bypasses events)
- ❌ Delayed observer notification

---

## 4. Hierarchical Logging

### Current Implementation
```typescript
export interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string; // Hierarchical link
}

// Create child logger
child(meta: Partial<LogEntry> = {}): WorkflowLogger {
  const parentLogId = meta.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

### Best Practices
- ✅ Preserve causal relationships with parentLogId
- ✅ Include workflow context in logs
- ✅ Implement log deduplication for multiple observers
- ✅ Buffer high-frequency logs for performance

### Advanced Patterns
- **Async Local Storage**: Automatic context propagation
- **Correlation IDs**: Track request across workflows
- **Log Aggregation**: Group logs by workflow level

---

## 5. State Snapshot Serialization

### Current Pattern (Decorator-Based)
```typescript
class TestWorkflow extends Workflow {
  @ObservedState() publicField: string = '';
  @ObservedState({ redact: true }) secret: string = '***';
  @ObservedState({ hidden: true }) internal: any = {};
}

// Snapshot includes only non-hidden fields
// Secret fields show as '***'
```

### Best Practices
- ✅ Use selective serialization (decorators)
- ✅ Deep clone to prevent reference leaks
- ✅ Handle circular references
- ✅ Validate snapshots with Zod schemas
- ✅ Version snapshots for migration

### Advanced Patterns
- **Incremental Diffing**: Store only changes
- **Compression**: Use LZ4 for speed, GZIP for space
- **Causal Snapshots**: Track state lineage

---

## 6. Terminal UI Visualization

### Current ASCII Tree
```
✓ RootWorkflow [completed]
├── ○ Child1 [idle]
│   ├── ○ Grandchild1 [idle]
│   └── ○ Grandchild2 [idle]
└── ✓ Child2 [completed]
```

### Recommended Library: Ink (React for CLI)
```typescript
import { render, Text, Box } from 'ink';

function TreeVisualization({ debugger_ }) {
  const [tree, setTree] = useState(debugger_.getTree());

  useEffect(() => {
    const sub = debugger_.events.subscribe({
      next: () => setTree(debugger_.getTree()),
    });
    return () => sub.unsubscribe();
  }, [debugger_]);

  return <Text>{debugger_.toTreeString(tree)}</Text>;
}

render(<TreeVisualization debugger={treeDebugger} />);
```

### Performance Optimization
- **Virtual Scrolling**: Render only visible nodes (for 1000+ trees)
- **Debounce Updates**: Throttle rapid events (50ms)
- **Memoization**: Cache expensive computations
- **Lazy Rendering**: Load child nodes on demand

### UI Patterns
- **Split-Pane**: Tree view + node details
- **Live Log Streaming**: Filtered by selected node
- **Interactive Navigation**: Arrow keys, expand/collapse
- **Status Colors**: Visual indicators for state

### Color Scheme
```typescript
const STATUS_COLORS = {
  idle: 'gray',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
};
```

---

## Implementation Priority

### Phase 1: Core Patterns (Already Implemented)
- ✅ Observer pattern with error isolation
- ✅ Incremental tree map updates
- ✅ 1:1 mirror consistency
- ✅ Hierarchical logging with parentLogId
- ✅ Decorator-based state snapshots

### Phase 2: Enhancements
- Event replay for time-travel debugging
- Versioned snapshots with migration
- Incremental snapshot diffing
- Log aggregation by workflow level

### Phase 3: Terminal UI
- Ink-based reactive UI
- Virtual scrolling for large trees
- Interactive navigation
- Split-pane layout
- Live log streaming

---

## File References

### Current Implementation
- `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` - Tree debugger
- `/home/dustin/projects/groundswell/src/utils/observable.ts` - Observable pattern
- `/home/dustin/projects/groundswell/src/core/logger.ts` - Hierarchical logging
- `/home/dustin/projects/groundswell/src/types/events.ts` - Event types
- `/home/dustin/projects/groundswell/src/types/snapshot.ts` - Snapshot types

### Research Documents
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/RESEARCH_REPORT.md`
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/P1M2T1S4/getRootObservers_implementation.md`
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/architecture/logger_child_signature_analysis.md`

### Test Files
- `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/integration/tree-mirroring.test.ts`

---

**Version:** 1.0
**Generated:** 2026-01-24
**Related:** TREE_DEBUGGER_PATTERNS_RESEARCH.md
