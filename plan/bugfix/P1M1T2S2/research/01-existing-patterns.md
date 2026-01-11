# Research: Existing Patterns in Codebase

## 1. Traversal Patterns in src/core/workflow.ts

### getRootObservers() (Lines 124-139)
```typescript
private getRootObservers(): WorkflowObserver[] {
  const visited = new Set<Workflow>();
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root.observers;
}
```

### getRoot() (Lines 145-160)
```typescript
protected getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root;
}
```

**Key Pattern:**
- Uses `Set<Workflow>` for O(1) cycle detection
- While loop with `current = current.parent` for traversal
- Throws with consistent error message: 'Circular parent-child relationship detected'
- Tracks visited nodes BEFORE checking ancestor match

## 2. Traversal in Other Files

### src/tools/introspection.ts (Lines 218-226)
```typescript
function calculateDepth(node: WorkflowNode): number {
  let depth = 0;
  let current = node.parent;
  while (current) {
    depth++;
    current = current.parent;
  }
  return depth;
}
```

### src/core/event-tree.ts (Lines 64-69)
```typescript
let currentId = node.parentId;
while (currentId) {
  const parent = this.nodeIndex.get(currentId);
  if (!parent) break;
  ancestors.push(parent);
  currentId = parent.parentId ?? '';
}
```

## 3. Naming Conventions

| Type | Pattern | Examples |
|------|---------|----------|
| Private helper methods | camelCase | `getRootObservers`, `getRoot` |
| Protected methods | camelCase | `getRoot` |
| Public methods | camelCase | `attachChild`, `emitEvent`, `setStatus` |
| Utility functions | camelCase | `calculateDepth`, `generateId` |

## 4. Error Message Patterns

| Scenario | Error Message |
|----------|---------------|
| Cycle detection | `'Circular parent-child relationship detected'` |
| Duplicate attachment | `'Child already attached to this workflow'` |
| Parent validation | Multi-line template with actionable guidance |

## 5. Gotchas Identified

1. **Constructor Auto-attachment**: Lines 113-116 in workflow.ts show that `attachChild()` is called automatically when a parent is provided to the constructor. The implementation must handle this gracefully.

2. **Set vs WeakSet**: The codebase uses `Set<Workflow>` which could cause memory leaks in long-running processes, but is the established pattern.

3. **Reference Equality**: All comparisons use `===` for reference equality (e.g., `current === ancestor`), never value comparison like IDs.

4. **Null Handling**: `current: Workflow | null = this;` - always initialize with `this` then traverse via `current.parent`.
