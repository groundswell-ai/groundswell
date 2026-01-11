# Cycle Detection Research: P1.M1.T2.S1

## isDescendantOf() Pattern

The key method needed for circular reference detection is `isDescendantOf()`. This checks if a given workflow is an ancestor of the current workflow by traversing the parent chain.

### Recommended Implementation Pattern

```typescript
/**
 * Check if this workflow is a descendant of another workflow
 * Used to prevent circular references in attachChild()
 */
private isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {
    // Cycle detection during traversal itself (defensive)
    if (visited.has(current)) {
      throw new Error('Circular reference detected in tree structure');
    }
    visited.add(current);

    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }

  return false;
}
```

## Usage in attachChild()

```typescript
public attachChild(child: Workflow): void {
  // ... existing validations ...

  // Validation: Prevent circular references
  if (this.isDescendantOf(child)) {
    throw new Error(
      `Cannot attach '${child.node.name}' to '${this.node.name}': ` +
      `would create circular reference`
    );
  }

  // ... rest of method ...
}
```

## Test Scenarios to Cover

### Scenario 1: Immediate Circular Reference
```typescript
const parent = new Workflow('Parent');
const child = new Workflow('Child', parent);

// This should throw - child is trying to attach its parent
expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/);
```

### Scenario 2: Ancestor Circular Reference (Multi-level)
```typescript
const root = new Workflow('Root');
const child1 = new Workflow('Child1', root);
const child2 = new Workflow('Child2', child1);

// This should throw - root is an ancestor of child2
expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/);
```

## Error Message Convention

From implementation_patterns.md:
- Error should contain 'circular' OR 'cycle' OR 'ancestor'
- Pattern from research: `toThrow(/circular|cycle|ancestor/)`

## Performance Considerations

- **Time Complexity**: O(h) where h is the height of the tree
- **Space Complexity**: O(h) for the visited Set
- **DoS Protection**: Consider max depth limit (currently not implemented)

## Related Code Patterns

### Existing getRoot() Pattern (similar traversal)
```typescript
// From workflow.ts - shows similar parent chain traversal pattern
private getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    current = current.parent;
  }

  return Array.from(visited).pop()!;
}
```

### Event Tree Ancestor Pattern
```typescript
// From src/core/event-tree.ts - similar ancestor tracking
public getAncestors(id: string): EventNode[] {
  const ancestors: EventNode[] = [];
  const node = this.nodeIndex.get(id);

  if (!node || !node.parentId) {
    return ancestors;
  }

  let currentId = node.parentId;
  while (currentId) {
    const parent = this.nodeIndex.get(currentId);
    if (!parent) break;
    ancestors.push(parent);
    currentId = parent.parentId ?? '';
  }

  return ancestors;
}
```

## Key Sources

- **Research Document**: `/home/dustin/projects/groundswell/plan/docs/research/CYCLE_DETECTION_PATTERNS.md`
- **Quick Reference**: `/home/dustin/projects/groundswell/plan/docs/research/CYCLE_DETECTION_QUICK_REF.md`
- **Implementation Patterns**: `/home/dustin/projects/groundswell/plan/docs/bugfix-architecture/implementation_patterns.md`
