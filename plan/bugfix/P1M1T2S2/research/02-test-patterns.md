# Research: Test Patterns in Codebase

## Test Files Found

### Unit Tests
- `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/decorators.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/unit/context.test.ts`
- And 8 more...

### Adversarial Tests
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/circular-reference.test.ts` (P1.M1.T2.S1 test)
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/parent-validation.test.ts` (P1.M1.T1 test)
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts`
- And 3 more...

## Test Fixture Pattern

```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
```

**Source:** `src/__tests__/unit/workflow.test.ts:4-11`

## Console Mocking Pattern

```typescript
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**Source:** `src/__tests__/adversarial/circular-reference.test.ts:33-45`

## Private Method Testing Pattern

```typescript
// Testing protected getRoot() method
expect(() => (parent as any).getRoot()).toThrow(
  'Circular parent-child relationship detected'
);

// Testing private getRootObservers() method
expect(() => (parent as any).getRootObservers()).toThrow(
  'Circular parent-child relationship detected'
);
```

**Source:** `src/__tests__/unit/workflow.test.ts:220-222, 236-238`

**Technique:** Type casting with `(instance as any)` to access private/protected members

## AAA Pattern with Comments

```typescript
// ARRANGE: Create parent and child workflows
const parent = new SimpleWorkflow('Parent');
const child = new SimpleWorkflow('Child', parent);

// ACT & ASSERT: Attempting to attach parent as child should throw
expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
```

**Source:** `src/__tests__/adversarial/circular-reference.test.ts:59-70`

## Error Assertion Pattern

### Flexible Regex Matching
```typescript
expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
```

### Exact Message Matching
```typescript
expect(() => parent.attachChild(child)).toThrow(
  'Child already attached to this workflow'
);
```

## State Verification Pattern

```typescript
// Verify initial state
// CRITICAL: Constructor auto-attaches child to parent at workflow.ts:113-116
expect(child.parent).toBe(parent);
expect(parent.children).toContain(child);
```

**Source:** `src/__tests__/adversarial/circular-reference.test.ts:64-66`

## Multi-level Hierarchy Setup

```typescript
const root = new SimpleWorkflow('Root');
const child1 = new SimpleWorkflow('Child1', root);
const child2 = new SimpleWorkflow('Child2', child1);

// Verify initial state
expect(child2.parent).toBe(child1);
expect(child1.parent).toBe(root);
expect(root.children).toContain(child1);
expect(child1.children).toContain(child2);
```

**Source:** `src/__tests__/adversarial/circular-reference.test.ts:85-95`

## Existing Cycle Detection Tests

### Test 1: Direct Manual Cycle (workflow.test.ts:209-223)
```typescript
it('should detect circular parent relationship', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Manually create circular reference
  parent.parent = child;

  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

### Test 2: getRootObservers Cycle Detection (workflow.test.ts:225-239)
```typescript
it('should detect circular relationship in getRootObservers', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  parent.parent = child;

  expect(() => (parent as any).getRootObservers()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

## Key Takeaways for isDescendantOf() Testing

1. **Use `(workflow as any)` casting** to access the private `isDescendantOf()` method
2. **Follow AAA pattern** with clear ARRANGE-ACT-ASSERT comments
3. **Test both positive and negative cases** (is descendant vs is not descendant)
4. **Test cycle detection** - ensure method throws when cycle is detected during traversal
5. **Use regex matching** for flexible error message validation: `/circular|cycle|ancestor/i`
