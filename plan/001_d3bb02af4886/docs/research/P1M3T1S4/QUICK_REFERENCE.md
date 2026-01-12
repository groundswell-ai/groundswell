# Quick Reference: Bidirectional Tree Consistency Testing

**For immediate use in writing tests**

---

## The Golden Rule

> **Every tree operation MUST update BOTH trees (Workflow + WorkflowNode) atomically**

If you attach a child to a parent, you must update:
1. `child.parent` (workflow tree)
2. `parent.children` (workflow tree)
3. `child.node.parent` (node tree)
4. `parent.node.children` (node tree)

All four must happen, or trees become inconsistent.

---

## Essential Helper Functions

### verifyBidirectionalLink(parent, child)
Use after every `attachChild()` and after reparenting

```typescript
import { verifyBidirectionalLink } from '../helpers/tree-verification';

// After attaching
parent.attachChild(child);
verifyBidirectionalLink(parent, child); // ✅ Checks both trees
```

### verifyTreeMirror(root)
Use to ensure 1:1 correspondence between trees

```typescript
import { verifyTreeMirror } from '../helpers/tree-verification';

// After tree mutations
parent.detachChild(child);
newParent.attachChild(child);
verifyTreeMirror(newParent); // ✅ Validates entire tree
```

### validateTreeConsistency(root)
Returns array of inconsistency descriptions

```typescript
import { validateTreeConsistency } from '../helpers/tree-verification';

const errors = validateTreeConsistency(root);
expect(errors).toEqual([]); // ✅ Empty = valid tree
```

---

## Test Template (Copy-Paste)

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow } from '../../index.js';
import { verifyBidirectionalLink, verifyTreeMirror, validateTreeConsistency } from '../helpers/tree-verification';

class TestWorkflow extends Workflow {
  async run(): Promise<string> {
    return 'done';
  }
}

describe('Tree Consistency', () => {
  it('should maintain consistency after [OPERATION]', () => {
    // ARRANGE
    const parent = new TestWorkflow('Parent');
    const child = new TestWorkflow('Child');

    // ACT
    parent.attachChild(child);

    // ASSERT - Always check both trees!
    verifyBidirectionalLink(parent, child);
    verifyTreeMirror(parent);
    expect(validateTreeConsistency(parent)).toEqual([]);
  });
});
```

---

## Critical Invariants

### 1. Tree Mirror Invariant
**If A is B's parent in workflow tree, A must be B's parent in node tree**

```typescript
// ✅ CORRECT
expect(child.parent).toBe(parent);           // Workflow tree
expect(child.node.parent).toBe(parent.node); // Node tree (MUST match)

// ❌ WRONG - Only checks one tree
expect(child.parent).toBe(parent);
```

### 2. Bidirectional Link Invariant
**If A is B's parent, B must be in A's children array (in BOTH trees)**

```typescript
// ✅ CORRECT - Checks both directions
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);
expect(child.node.parent).toBe(parent.node);
expect(parent.node.children).toContain(child.node);

// ❌ WRONG - Only checks forward direction
expect(parent.children).toContain(child);
```

### 3. No Orphaned Nodes Invariant
**Every non-root node must have exactly one parent who claims it**

```typescript
// ✅ CORRECT
// child has parent
expect(child.parent).toBe(parent);
// parent knows about child
expect(parent.children).toContain(child);
// No other parent claims this child
const otherClaimants = allNodes.filter(n => n !== parent && n.children.includes(child));
expect(otherClaimants).toEqual([]);
```

---

## Common Test Scenarios

### Scenario 1: Test attachChild()
```typescript
it('should maintain consistency after attach', () => {
  const parent = new TestWorkflow('Parent');
  const child = new TestWorkflow('Child');

  parent.attachChild(child);

  // Verify bidirectional links
  verifyBidirectionalLink(parent, child);

  // Verify tree mirror
  verifyTreeMirror(parent);

  // Verify no inconsistencies
  expect(validateTreeConsistency(parent)).toEqual([]);
});
```

### Scenario 2: Test detachChild()
```typescript
it('should maintain consistency after detach', () => {
  const parent = new TestWorkflow('Parent');
  const child = new TestWorkflow('Child', parent);

  parent.detachChild(child);

  // Verify complete detachment
  expect(child.parent).toBeNull();
  expect(parent.children).not.toContain(child);
  expect(child.node.parent).toBeNull();
  expect(parent.node.children).not.toContain(child.node);

  verifyTreeMirror(parent);
});
```

### Scenario 3: Test Reparenting
```typescript
it('should maintain consistency during reparenting', () => {
  const parent1 = new TestWorkflow('Parent1');
  const parent2 = new TestWorkflow('Parent2');
  const child = new TestWorkflow('Child', parent1);

  // Verify initial state
  verifyBidirectionalLink(parent1, child);

  // Reparent
  parent1.detachChild(child);
  parent2.attachChild(child);

  // Verify new state
  verifyBidirectionalLink(parent2, child);

  // Verify old parent no longer has child
  expect(parent1.children).not.toContain(child);
  expect(parent1.node.children).not.toContain(child.node);

  // Verify both trees are valid
  verifyTreeMirror(parent1);
  verifyTreeMirror(parent2);
});
```

### Scenario 4: Test Error Handling
```typescript
it('should not corrupt state on duplicate attach', () => {
  const parent = new TestWorkflow('Parent');
  const child = new TestWorkflow('Child', parent);

  // Should throw
  expect(() => parent.attachChild(child)).toThrow();

  // Verify state unchanged
  verifyBidirectionalLink(parent, child);
  verifyTreeMirror(parent);
});
```

---

## Anti-Patterns to Avoid

### ❌ Don't check only workflow tree
```typescript
// BAD: Only checks workflow tree
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);
// ❌ Missing node tree checks!
```

### ❌ Don't check only one direction
```typescript
// BAD: Only checks parent→child
expect(parent.children).toContain(child);
// ❌ Missing child→parent check!
```

### ❌ Don't forget to verify both trees after errors
```typescript
// BAD: Error case not validated
expect(() => parent2.attachChild(child)).toThrow();
// ❌ Should verify no corruption occurred!
```

### ❌ Don't manually mutate tree properties
```typescript
// BAD: Bypasses attachChild validation
(child as any).parent = newParent;
// ❌ Creates inconsistency!
```

---

## Quick Checklist

When writing tree operation tests, ensure you:

- [ ] Test both workflow tree AND node tree
- [ ] Test parent→child AND child→parent directions
- [ ] Use helper functions (verifyBidirectionalLink, verifyTreeMirror)
- [ ] Run validateTreeConsistency to check for hidden issues
- [ ] Test error cases don't corrupt state
- [ ] Verify state after attach, detach, and reparenting
- [ ] Test with multiple children
- [ ] Test with deep hierarchies
- [ ] Test edge cases (null parent, duplicate attach, circular refs)

---

## Common Patterns

### Pattern: Verify After Every Operation
```typescript
operation();
verifyTreeMirror(root);
expect(validateTreeConsistency(root)).toEqual([]);
```

### Pattern: Test Error Cases Don't Corrupt
```typescript
expect(() => invalidOperation()).toThrow();
verifyTreeMirror(root); // State still valid
```

### Pattern: Test Both Trees Explicitly
```typescript
// Workflow tree
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);

// Node tree (must match!)
expect(child.node.parent).toBe(parent.node);
expect(parent.node.children).toContain(child.node);
```

---

## External References

For deeper understanding, see:

1. **Full Research Document**
   - `/home/dustin/projects/groundswell/plan/bugfix/P1M3T1S4/research/bidirectional-tree-consistency-testing.md`

2. **Test Pattern Examples**
   - `/home/dustin/projects/groundswell/plan/bugfix/P1M3T1S4/research/test-pattern-examples.md`

3. **Research Summary**
   - `/home/dustin/projects/groundswell/plan/bugfix/P1M3T1S4/research/SUMMARY.md`

4. **Existing Test Examples**
   - `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`
   - `/home/dustin/projects/groundswell/src/__tests__/adversarial/prd-compliance.test.ts`

---

## Need Help?

### For quick questions:
- Check the "Test Pattern Examples" document for copy-paste templates
- Look at existing tests in the codebase
- Use the helper functions - they handle the complexity

### For deep understanding:
- Read the full research document
- Study the existing test patterns
- Review DOM and React Fiber patterns

### For implementation:
1. Create helper functions first
2. Write tests using helpers
3. Run tests, fix issues
4. Iterate and refine

---

**Remember**: The 1:1 tree mirror invariant is CRITICAL. If workflow tree and node tree don't match perfectly, bugs will occur. Always test both trees!

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-12
**Maintainer:** P1M3T1S4 Research Team
