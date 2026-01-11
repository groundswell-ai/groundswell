# Research: TypeScript Cycle Detection Best Practices

## Implementation Pattern: Iterative with Set (Recommended)

```typescript
class TreeNode {
  private parent?: TreeNode;

  /**
   * Check if this node is a descendant of the potential ancestor
   * @throws {Error} If a cycle is detected in the tree structure
   */
  isDescendantOf(potentialAncestor: TreeNode): boolean {
    let current: TreeNode | undefined = this.parent;
    const visited = new Set<TreeNode>();

    while (current) {
      // Cycle detection - throw fast and loud
      if (visited.has(current)) {
        throw new Error(
          `Cycle detected in tree structure: node ${current.id} is visited twice during traversal. ` +
          `This indicates a corrupted tree with circular parent references.`
        );
      }

      visited.add(current);

      if (current === potentialAncestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }
}
```

## Performance Comparison: Set vs Other Approaches

| Approach | Time Complexity | Space Complexity | Best Use Case |
|----------|----------------|------------------|---------------|
| **Set** | O(1) lookup, O(n) total | O(n) | Most cases, recommended |
| **WeakSet** | O(1) lookup, O(n) total | O(n) but GC-friendly | Large trees, long-running apps |
| **Array** | O(n) lookup, O(n²) total | O(n) | Small trees (< 100 nodes) |

**Note:** This codebase uses `Set<Workflow>` consistently, so we follow that pattern.

## Common Edge Cases and Gotchas

### Edge Case 1: Self-Reference
```typescript
// Bad: Node is its own parent
node.parent = node;

// Detection
if (node === node.parent) {
  throw new Error('Node cannot be its own parent');
}
```

### Edge Case 2: Deep Cycle
```typescript
// Bad: A -> B -> C -> D -> B (cycle not immediately obvious)
// Detection requires Set, not just parent comparison
```

### Edge Case 3: Detached Nodes
```typescript
// Node with no parent
const root = new TreeNode();
root.isDescendantOf(otherNode); // Should return false, not error
```

## Best Practice Error Messages

### Good: Descriptive and Actionable
```typescript
throw new Error(
  `Cycle detected in tree structure at node "${node.id}". ` +
  `This indicates a corrupted tree where a node is its own ancestor. ` +
  `Ensure that parent-child relationships form a valid Directed Acyclic Graph (DAG).`
);
```

### Good: Includes Context for Debugging
```typescript
throw new Error(
  `Cycle detected while checking ancestry: ` +
  `Path: ${node.id} -> ${parent.id} -> ${grandparent.id} -> ${parent.id} ` +
  `(cycle detected at "${parent.id}")`
);
```

### Bad: Too Vague
```typescript
throw new Error('Cycle detected');
```

## Performance Optimization Tips

### Tip 1: Early Exit
```typescript
isDescendantOf(potentialAncestor: TreeNode): boolean {
  // Fast path: no parent
  if (!this.parent) return false;

  // Full check with cycle detection
  let current: TreeNode | undefined = this.parent;
  const visited = new Set<TreeNode>();
  // ... rest of implementation
}
```

### Tip 2: Iteration Over Recursion
```typescript
// Prefer iteration over recursion to avoid stack overflow
// on very deep trees (> 1000 levels)
isDescendantOfIterative(potentialAncestor: TreeNode): boolean {
  let current = this.parent;
  const visited = new Set<TreeNode>();

  while (current) {
    if (visited.has(current)) return false; // or throw
    visited.add(current);
    if (current === potentialAncestor) return true;
    current = current.parent;
  }

  return false;
}
```

### Tip 3: Consider Depth Limiting (Advanced)
```typescript
private static readonly MAX_TREE_DEPTH = 10000;

isDescendantOf(potentialAncestor: TreeNode): boolean {
  let current = this.parent;
  const visited = new Set<TreeNode>();
  let depth = 0;

  while (current) {
    if (depth++ > TreeNode.MAX_TREE_DEPTH) {
      throw new Error(
        `Tree depth exceeds maximum of ${TreeNode.MAX_TREE_DEPTH}. ` +
        `This may indicate a cycle or an excessively deep tree.`
      );
    }

    if (visited.has(current)) {
      throw new Error('Cycle detected in tree structure');
    }

    visited.add(current);
    if (current === potentialAncestor) return true;
    current = current.parent;
  }

  return false;
}
```

## Common Pitfalls to Avoid

1. **Not throwing on cycles**: Silently returning `false` masks data corruption
2. **Using Array.includes()**: O(n) lookup creates O(n²) performance
3. **Forgetting to check `this.parent` existence**: Causes null reference errors
4. **Recursive implementation without depth limit**: Stack overflow on deep trees
5. **Comparing by value instead of reference**: `node.id === parent.id` vs `node === parent`
6. **Ignoring the cycle in error handling**: Catching and continuing propagates corruption

## Testing Strategies

```typescript
describe('isDescendantOf cycle detection', () => {
  it('should detect direct self-reference', () => {
    const node = new TreeNode('root');
    node.parent = node;
    expect(() => node.isDescendantOf(node)).toThrow('Cycle detected');
  });

  it('should detect indirect cycle', () => {
    const a = new TreeNode('a');
    const b = new TreeNode('b');
    const c = new TreeNode('c');

    a.parent = b;
    b.parent = c;
    c.parent = a; // Cycle

    expect(() => a.isDescendantOf(a)).toThrow('Cycle detected');
  });

  it('should handle valid deep trees', () => {
    const nodes = Array.from({length: 1000}, (_, i) => new TreeNode(i));
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].parent = nodes[i - 1];
    }

    expect(nodes[999].isDescendantOf(nodes[0])).toBe(true);
  });
});
```

## Summary of Recommendations

1. **Use Set-based cycle detection** with O(1) lookup
2. **Throw descriptive errors** that help developers identify and fix the issue
3. **Prefer iteration over recursion** to avoid stack overflow
4. **Add early exit conditions** for common cases
5. **Test edge cases** including self-references and deep cycles
6. **Avoid Array-based detection** except for trivial cases
