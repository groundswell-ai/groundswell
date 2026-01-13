# Codebase Workflow Name Analysis

## Current Implementation State

### Workflow Constructor Location
**File:** `src/core/workflow.ts` (lines 83-108)

### Constructor Patterns

**Class-based pattern:**
```typescript
// Line 94: Default name from class name if not provided
this.config = { name: name ?? this.constructor.name };

// Line 101: Node name fallback to constructor name
name: this.config.name ?? this.constructor.name,
```

**Functional pattern:**
```typescript
// Line 89: Uses config object
this.config = name;
```

### Current Name Handling

| Input Type | Behavior |
|------------|----------|
| `undefined` | Falls back to `this.constructor.name` |
| `null` | Falls back to `this.constructor.name` |
| `''` (empty string) | **Accepted** - sets `node.name = ''` |
| `'   '` (whitespace) | **Accepted** - sets `node.name = '   '` |
| Any string | **Accepted** - no validation |

### Key Code Locations

**Constructor validation (none exists):**
```typescript
// src/core/workflow.ts:83-108
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  if (typeof name === 'object' && name !== null) {
    this.config = name;
    this.executor = parentOrExecutor as WorkflowExecutor<T>;
    this.parent = null;
  } else {
    this.config = { name: name ?? this.constructor.name };
    this.parent = (parentOrExecutor as Workflow) ?? null;
  }
  // NO VALIDATION OF NAME VALUE
}
```

**Type definition:**
```typescript
// src/types/workflow.ts:24
export interface WorkflowNode {
  /** Human-readable name */
  name: string;  // No constraints specified
}
```

## Test Evidence

### Empty String Test (Currently Passing)
**File:** `src/__tests__/adversarial/edge-case.test.ts` (lines 107-117)

```typescript
it('should handle empty string workflow name', async () => {
  const workflow = new TestWorkflow('');
  expect(workflow.node.name).toBe('');  // PASSES - empty name accepted
  await workflow.run();
});
```

### Other Name Tests
**File:** `src/__tests__/unit/workflow.test.ts`

```typescript
// Lines 20-23: Default class name usage
it('should use class name as default workflow name', () => {
  const wf = new SimpleWorkflow();
  expect(wf.getNode().name).toBe('SimpleWorkflow');
});

// Lines 25-28: Custom name assignment
it('should use custom name when provided', () => {
  const wf = new SimpleWorkflow('CustomName');
  expect(wf.getNode().name).toBe('CustomName');
});
```

## Common Naming Patterns Found

| Pattern | Example | Location |
|---------|---------|----------|
| PascalCase class name | `DataProcessingWorkflow` | examples/01-basic-workflow.ts:72 |
| PascalCase string | `'DataProcessor'` | examples/01-basic-workflow.ts:72 |
| Descriptive names | `'Parent'`, `'Child'`, `'Worker'` | Various test files |
| Sequential names | `'Workflow-1'`, `'child-1-0'` | Tree debugger |

## Validation Decision Point

**Current State:** Empty and whitespace-only names are accepted
**Issue 8:** Suggests validation OR documentation that empty names are valid
**Decision Needed:** Should we validate or document?

### Arguments For Validation
- Empty names provide no useful information
- Whitespace-only names are visually confusing
- Tree debugger display with empty names is unhelpful
- Industry standard (most workflow engines validate names)

### Arguments Against Validation
- Current tests explicitly verify empty names work
- May be intentionally permissive for flexibility
- Backward compatibility concern

## Related Code Patterns

### Parameter Validation Patterns in Codebase

**Example 1: Null check with descriptive error**
```typescript
// src/context.ts:requireExecutionContext()
if (!context) {
  throw new Error(
    `${operation} called outside of workflow context. ` +
    `Agent/Prompt operations must be executed within a workflow step.`
  );
}
```

**Example 2: Unique registration validation**
```typescript
// src/core/mcp-handler.ts:registerServer()
if (this.servers.has(server.name)) {
  throw new Error(`MCP server '${server.name}' is already registered`);
}
```

**Example 3: Circular reference detection**
```typescript
// src/core/workflow.ts:attachChild()
if (visited.has(current)) {
  throw new Error('Circular parent-child relationship detected');
}
```

## Implementation Location

If validation is to be added, it should be placed at:
**File:** `src/core/workflow.ts`
**Location:** After `this.config` is set, before `this.node` is created (around line 100)

```typescript
// Suggested location for validation
this.config = { name: name ?? this.constructor.name };

// ADD VALIDATION HERE
// Validate workflow name
if (!this.config.name || typeof this.config.name !== 'string') {
  throw new Error('Workflow name must be a non-empty string');
}
if (this.config.name.trim().length === 0) {
  throw new Error('Workflow name cannot be whitespace only');
}
```
