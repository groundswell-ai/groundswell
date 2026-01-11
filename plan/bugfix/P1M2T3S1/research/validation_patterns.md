# Validation Patterns in the Codebase

## Array.includes() Pattern (RECOMMENDED for this fix)

### Example: src/core/workflow.ts (cycle detection NOT using includes, but similar concept)
The codebase does not currently use `Array.includes()` for duplicate checking. However, this is the appropriate pattern for array-based duplicate detection:

```typescript
// Pattern to follow
if (this.children.includes(child)) {
  throw new Error('Child already attached to this workflow');
}
```

## Map.has() Pattern (Duplicate Prevention)

### src/core/mcp-handler.ts (lines 46-48)
```typescript
if (this.servers.has(server.name)) {
  throw new Error(`MCP server '${server.name}' is already registered`);
}
```

### src/cache/cache.ts (line 158)
```typescript
has(key: string): boolean {
  return this.cache.has(key);
}
```

## Set.has() Pattern (Cycle Detection)

### src/core/workflow.ts (lines 125-139)
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

### src/cache/cache-key.ts (lines 66-67)
```typescript
if (seen.has(val as object)) {
  throw new TypeError('Converting circular structure to JSON');
}
```

## Array.indexOf() Pattern (Removal Check)

### src/core/workflow.ts (line 177)
```typescript
const index = this.observers.indexOf(observer);
if (index !== -1) {
  this.observers.splice(index, 1);
}
```

## Error Message Patterns

### "Already" Pattern
```typescript
throw new Error(`MCP server '${server.name}' is already registered`);
```

### Context Validation Pattern
```typescript
throw new Error(
  `${operation} called outside of workflow context. ` +
    `Agent/Prompt operations must be executed within a workflow step.`
);
```

### Root Validation Pattern
```typescript
throw new Error('Observers can only be added to root workflows');
```

### Circular Reference Pattern
```typescript
throw new Error('Circular parent-child relationship detected');
```

## Recommended Error Message Format

Based on codebase patterns, use:
```typescript
throw new Error('Child already attached to this workflow');
```

This matches the concise, descriptive style used elsewhere (e.g., "Circular parent-child relationship detected").
