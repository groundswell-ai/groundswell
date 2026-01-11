# External Research: Best Practices for Duplicate Validation

## Error Message Format

**Best Practice**: Use descriptive, user-friendly error messages that include:
- The specific type of entity being validated
- Context about why the duplication is problematic
- Concise but clear language

**Good examples:**
```typescript
throw new Error(`User with email "${email}" already exists in the system`);
throw new Error(`Product ID "${productId}" is already registered`);
throw new Error('Child already attached to this workflow');
```

**Avoid generic messages:**
```typescript
throw new Error("Duplicate entry"); // Too vague
```

## Validation Placement in Methods

**Best Practice**: Place validation at the **start of methods** before any business logic executes:

```typescript
class Parent {
  addChild(child: Child): void {
    // 1. Validation first - BEFORE any business logic
    if (this.children.includes(child)) {
      throw new Error('Child already attached to this workflow');
    }

    // 2. Business logic follows
    this.children.push(child);
    child.parent = this;
  }
}
```

## Throw Error vs Custom Error Types

For this codebase, **use standard Error** for consistency with existing patterns:

```typescript
// Consistent with codebase patterns
throw new Error('Child already attached to this workflow');

// NOT this (would be inconsistent)
throw new DuplicateEntryError('Workflow', child.id);
```

The codebase consistently uses standard `Error` with descriptive messages rather than custom error types.

## Array Duplicate Prevention Patterns

### Pattern 1: Array.includes() for Reference Equality
```typescript
class Parent {
  private children: Child[] = [];

  addChild(child: Child): void {
    if (this.children.includes(child)) {
      throw new Error('Child already attached to this workflow');
    }
    this.children.push(child);
  }
}
```

This is the **appropriate pattern for this use case** because:
- We're checking for the same reference (same object instance)
- Array.includes() uses strict equality (===) which is correct for object references
- Simple and readable

### Pattern 2: Set for Fast Lookup
```typescript
class Parent {
  private children = new Set<Child>();

  addChild(child: Child): void {
    if (this.children.has(child)) {
      throw new Error('Child already attached to this workflow');
    }
    this.children.add(child);
  }
}
```

This would require refactoring the entire class to use Set instead of Array. **Not appropriate** for this fix.

## Parent-Child Relationship Validation

### Bidirectional Validation Pattern
```typescript
class Parent {
  protected children: Child[] = [];

  addChild(child: Child): void {
    // Validate child doesn't already have this parent
    if (this.children.includes(child)) {
      throw new Error('Child already attached to this workflow');
    }

    // Establish bidirectional relationship
    child.parent = this;
    this.children.push(child);
  }
}
```

## Key Recommendations

1. **Error Messages**: Be concise but descriptive
2. **Validation Placement**: Always validate at method start, before any mutations
3. **Use Array.includes()**: For reference equality checks on arrays
4. **Follow existing patterns**: Use standard `Error` for consistency with codebase
