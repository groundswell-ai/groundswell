# Implementation Patterns: Tree Integrity Best Practices

## Overview

This document outlines the proven patterns and best practices for implementing tree integrity in hierarchical data structures, specifically applied to the Workflow engine bug fix.

## Core Patterns for attachChild() Fix

### Pattern 1: Parent State Validation

**Principle**: Always validate the child's current parent state before attaching.

```typescript
public attachChild(child: Workflow): void {
  // Validation 1: Prevent duplicate attachment
  if (this.children.includes(child)) {
    throw new Error(
      `Child '${child.node.name}' is already attached to workflow '${this.node.name}'`
    );
  }

  // Validation 2: CRITICAL - Check if child already has a different parent
  if (child.parent !== null && child.parent !== this) {
    throw new Error(
      `Child '${child.node.name}' already has parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent. ` +
      `Use detachChild() on the current parent first if you need to reparent.`
    );
  }

  // Update child's parent if it's currently null
  if (child.parent === null) {
    child.parent = this;
  }

  // Add to both trees
  this.children.push(child);
  this.node.children.push(child.node);

  // Emit event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

**Key Points**:
- Check `child.parent !== null` before allowing attachment
- Check `child.parent !== this` to allow re-attaching to same parent (idempotent)
- Provide clear error message with current parent's name
- Suggest solution (use detachChild first)

### Pattern 2: Circular Reference Detection

**Principle**: Prevent attaching an ancestor as a child (would create cycle).

```typescript
public attachChild(child: Workflow): void {
  // ... other validations ...

  // Validation 3: Prevent circular references
  if (this.isDescendantOf(child)) {
    throw new Error(
      `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`
    );
  }

  // ... rest of method ...
}

/**
 * Check if this workflow is a descendant of another workflow
 * Used to prevent circular references in attachChild()
 */
private isDescendantOf(ancestor: Workflow): boolean {
  let current: Workflow | null = this;
  const visited = new Set<Workflow>();

  while (current !== null) {
    // Cycle detection during traversal itself
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

**Key Points**:
- Traverse parent chain from `this` upwards
- If we encounter `ancestor`, it means `ancestor` is above `this` in tree
- Attaching it would create a cycle
- Include cycle detection in traversal itself (defensive)

### Pattern 3: Bidirectional Tree Synchronization

**Principle**: Always update both the workflow tree and node tree together.

```typescript
public attachChild(child: Workflow): void {
  // ... validations ...

  // Update workflow tree
  if (child.parent === null) {
    child.parent = this;
  }
  this.children.push(child);

  // Update node tree (must mirror workflow tree)
  this.node.children.push(child.node);

  // Emit event for observers
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

**Key Points**:
- Both trees must be updated atomically (in same method)
- Order matters: update child.parent, then this.children, then this.node.children
- Event emission happens after both trees are updated
- This ensures "1:1 tree mirror" requirement from PRD

### Pattern 4: Detach Child for Reparenting

**Principle**: Provide a method to properly remove children for reparenting scenarios.

```typescript
/**
 * Detach a child workflow from this parent
 * @throws {Error} If child is not attached to this workflow
 */
public detachChild(child: Workflow): void {
  const index = this.children.indexOf(child);
  if (index === -1) {
    throw new Error(
      `Child '${child.node.name}' is not attached to workflow '${this.node.name}'`
    );
  }

  // Remove from workflow children array
  this.children.splice(index, 1);

  // Remove from node children array
  const nodeIndex = this.node.children.indexOf(child.node);
  if (nodeIndex !== -1) {
    this.node.children.splice(nodeIndex, 1);
  }

  // Clear child's parent reference
  child.parent = null;

  // Emit detached event for observers
  this.emitEvent({
    type: 'childDetached',
    parentId: this.id,
    childId: child.id,
  });
}
```

**Key Points**:
- Validate child is actually attached before removing
- Remove from both trees (workflow and node)
- Clear child.parent reference
- Emit event so observers can update
- Enables reparenting workflow: `oldParent.detachChild(child); newParent.attachChild(child);`

## Observer Pattern Patterns

### Pattern 5: Root-Following with Validation

**Principle**: Observer propagation relies on getRoot() working correctly.

```typescript
/**
 * Get the root workflow with robust cycle detection
 */
protected getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this;

  while (current) {
    // Cycle detection - prevents infinite loops
    if (visited.has(current)) {
      throw new Error(
        `Circular parent-child relationship detected at workflow '${current.node.name}'. ` +
        `Tree integrity violated.`
      );
    }
    visited.add(current);

    // Move to parent
    current = current.parent;
  }

  // Return the last non-null node (the root)
  return Array.from(visited).pop()!;
}
```

**Key Points**:
- With attachChild() fix, this method now works correctly
- Child can only have one parent, so parent chain is deterministic
- Cycle detection is still important for edge cases
- Returns the root workflow that has observers array

### Pattern 6: Observer Error Isolation

**Principle**: Observer errors should not crash the workflow execution.

```typescript
public emitEvent(event: WorkflowEvent): void {
  // Add to this node's event log
  this.node.events.push(event);

  // Get root with validation
  const root = this.getRoot();

  // Notify all observers with error isolation
  for (const obs of root.observers) {
    try {
      obs.onEvent(event);

      // Also notify tree changed for tree update events
      if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
        obs.onTreeChanged(root.node);
      }
    } catch (err) {
      // Isolate observer errors to prevent cascading failures
      console.error('Observer onEvent error:', err);

      // Optionally emit error event
      this.emitEvent({
        type: 'error',
        node: this.node,
        error: {
          message: err instanceof Error ? err.message : 'Observer error',
          original: err,
          workflowId: this.id,
          stack: err instanceof Error ? err.stack : undefined,
          state: null,
          logs: [],
        },
      });
    }
  }
}
```

**Key Points**:
- Wrap each observer callback in try-catch
- Log errors but continue processing other observers
- This pattern is already implemented and should be preserved
- Add childDetached to tree update events

## Testing Patterns

### Pattern 7: Tree Integrity Test Suite

```typescript
describe('Tree Integrity Tests', () => {
  describe('attachChild() Validation', () => {
    it('should prevent attaching child with existing parent', () => {
      const parent1 = new Workflow('Parent1');
      const parent2 = new Workflow('Parent2');
      const child = new Workflow('Child', parent1);

      // Should throw
      expect(() => parent2.attachChild(child)).toThrow(/already has a parent/);
    });

    it('should allow attaching child with null parent', () => {
      const parent = new Workflow('Parent');
      const child = new Workflow('Child'); // No parent

      parent.attachChild(child);

      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('should prevent circular references', () => {
      const root = new Workflow('Root');
      const child = new Workflow('Child', root);

      // Try to create cycle
      expect(() => {
        child.attachChild(root as any);
      }).toThrow(/circular|cycle/i);
    });

    it('should prevent duplicate children', () => {
      const parent = new Workflow('Parent');
      const child = new Workflow('Child', parent);

      // Try to attach again
      expect(() => parent.attachChild(child)).toThrow(/already attached/);
    });
  });

  describe('Observer Propagation', () => {
    it('should propagate events from child to root observers', async () => {
      const events: WorkflowEvent[] = [];

      const root = new Workflow('Root');
      root.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      const child = new Workflow('Child', root);
      child.emitEvent({ type: 'stepStart', node: child.node, step: 'test' });

      // Event should be received by root observer
      const stepEvents = events.filter(e => e.type === 'stepStart');
      expect(stepEvents.length).toBe(1);
    });

    it('should not propagate events after reparenting', () => {
      const events1: WorkflowEvent[] = [];
      const events2: WorkflowEvent[] = [];

      const parent1 = new Workflow('Parent1');
      const parent2 = new Workflow('Parent2');

      parent1.addObserver({
        onLog: () => {},
        onEvent: (e) => events1.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      parent2.addObserver({
        onLog: () => {},
        onEvent: (e) => events2.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      const child = new Workflow('Child', parent1);

      // Reparent
      parent1.detachChild(child);
      parent2.attachChild(child);

      // Emit event from child
      child.emitEvent({ type: 'stepStart', node: child.node, step: 'test' });

      // Should only reach parent2's observers
      expect(events1.filter(e => e.type === 'stepStart').length).toBe(0);
      expect(events2.filter(e => e.type === 'stepStart').length).toBe(1);
    });
  });

  describe('Bidirectional Consistency', () => {
    it('should maintain consistency between workflow and node trees', () => {
      const parent = new Workflow('Parent');
      const child = new Workflow('Child', parent);

      // Workflow tree
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);

      // Node tree
      expect(child.node.parent).toBe(parent.node);
      expect(parent.node.children).toContain(child.node);
    });

    it('should maintain consistency after detach', () => {
      const parent = new Workflow('Parent');
      const child = new Workflow('Child', parent);

      parent.detachChild(child);

      // Workflow tree
      expect(child.parent).toBeNull();
      expect(parent.children).toContain(child).toBe(false);

      // Node tree
      expect(parent.node.children).toContain(child.node).toBe(false);
    });
  });
});
```

### Pattern 8: Adversarial Testing

```typescript
describe('Adversarial Tree Tests', () => {
  it('should prevent manual parent mutation creating inconsistency', () => {
    const parent1 = new Workflow('Parent1');
    const parent2 = new Workflow('Parent2');
    const child = new Workflow('Child', parent1);

    // Try to manually mutate (TypeScript should prevent this at compile time)
    // But at runtime, this could happen with 'as any'
    expect(() => {
      (child as any).parent = parent2;
    }).not.toThrow();

    // Even if mutation succeeds, tree should be validated
    // This is why we need defensive checks in attachChild()
  });

  it('should handle deep hierarchies without stack overflow', () => {
    const root = new Workflow('Root');
    let current = root;

    // Create 1000 levels deep
    for (let i = 0; i < 1000; i++) {
      const child = new Workflow(`Child-${i}`);
      current.attachChild(child);
      current = child;
    }

    // getRoot() should work without stack overflow
    expect(current.getRoot()).toBe(root);
  });

  it('should detect complex circular references', () => {
    const root = new Workflow('Root');
    const child1 = new Workflow('Child1', root);
    const child2 = new Workflow('Child2', child1);
    const child3 = new Workflow('Child3', child2);

    // Try to create cycle: child3 -> root
    expect(() => {
      child3.attachChild(root as any);
    }).toThrow(/circular|cycle/i);
  });
});
```

## Error Message Patterns

### Pattern 9: Clear, Actionable Error Messages

```typescript
// Bad error message
throw new Error('Invalid parent');

// Good error message
throw new Error(
  `Child '${child.node.name}' already has parent '${child.parent.node.name}'. ` +
  `A workflow can only have one parent. ` +
  `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`
);
```

**Components of a Good Error Message**:
1. **What happened**: Child already has a parent
2. **Who is involved**: Names of the workflows
3. **Why it's a problem**: A workflow can only have one parent
4. **How to fix it**: Use detachChild() first

## Implementation Checklist

- [ ] Add parent validation to attachChild()
- [ ] Add circular reference detection to attachChild()
- [ ] Implement isDescendantOf() helper method
- [ ] Implement detachChild() method
- [ ] Update emitEvent() to handle childDetached events
- [ ] Add tree integrity tests
- [ ] Add observer propagation tests
- [ ] Add adversarial tests
- [ ] Verify all 241 existing tests still pass
- [ ] Update documentation if needed

## References

- DOM Tree API: https://dom.spec.whatwg.org/#concept-tree-parent
- React Fiber Tree: https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js
- TypeScript Private Fields: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#ecmascript-private-fields
