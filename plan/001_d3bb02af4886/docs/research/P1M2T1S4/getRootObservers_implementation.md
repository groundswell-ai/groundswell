# getRootObservers() Implementation Analysis (P1.M2.T1.S3)

## File Reference
- **Source File**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Method Location**: Lines 124-139

## Complete Implementation

```typescript
/**
 * Get observers from the root workflow
 * Traverses up the tree to find the root
 * Uses cycle detection to prevent infinite loops from circular parent-child relationships
 */
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

## Error Details
- **Error Type**: `Error` (standard JavaScript Error)
- **Error Message**: `"Circular parent-child relationship detected"`
- **Error Trigger**: When a visited workflow is encountered during parent traversal

## Comparison with getRoot()
Both methods use **identical cycle detection logic**:
- Same `Set<Workflow>` tracking approach
- Same error message
- Same traversal pattern
- Only difference is return value (`WorkflowObserver[]` vs `Workflow`)

## Accessibility Level
- **`getRootObservers()`**: `private` method
- **`getRoot()`**: `protected` method

## Usage Context
Called from:
1. Constructor (line 111) - for logger creation
2. `emitEvent()` method (line 205)
3. `snapshotState()` method (line 228)
