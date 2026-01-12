# Existing Test Pattern for Cycle Detection (P1.M2.T1.S2)

## File Reference
- **Test File**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- **Test Location**: Lines 209-223

## Complete Test Code (P1.M2.T1.S2)

```typescript
it('should detect circular parent relationship', () => {
  // Arrange: Create parent and child workflows
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act: Create circular reference manually
  // This simulates a bug or malicious input that creates a cycle
  parent.parent = child;

  // Assert: getRoot() should throw error for circular reference
  // Note: getRoot() is protected, so we cast to any to access it
  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

## Key Patterns to Replicate

### 1. Test Structure
- **Arrange**: Create parent and child workflows with `new SimpleWorkflow('Name', parent)`
- **Act**: Create circular reference by setting `parent.parent = child`
- **Assert**: Use `expect(() => (workflow as any).method()).toThrow()` pattern

### 2. Error Message
- **Exact String**: `'Circular parent-child relationship detected'`
- Must match exactly or use `toThrow(Error)` for type-only matching

### 3. Test Utility Class
```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}
```

### 4. Test Naming Convention
- Use clear, descriptive test names like "should detect circular parent relationship"
- Include comments explaining each step

### 5. Accessibility Workaround
- `getRoot()` is `protected` - accessed via `(parent as any).getRoot()`
- `getRootObservers()` is `private` - may need different access method
