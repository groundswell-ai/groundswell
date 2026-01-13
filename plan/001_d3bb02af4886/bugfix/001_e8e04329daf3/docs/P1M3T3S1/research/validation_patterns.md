# Validation Patterns in Groundswell Codebase

## Overview

This document catalogs validation patterns used throughout the Groundswell codebase to inform the implementation of workflow name validation.

## Parameter Validation Patterns

### Pattern 1: Required Context Validation
**File:** `src/context.ts:42-51`

```typescript
export function requireExecutionContext(
  operation: string
): AgentExecutionContext {
  const context = executionContext.getStore();
  if (!context) {
    throw new Error(
      `${operation} called outside of workflow context. ` +
      `Agent/Prompt operations must be executed within a workflow step.`
    );
  }
  return context;
}
```

**Key Characteristics:**
- Null/undefined check with `!context`
- Descriptive error message with context
- Includes operation name in error
- Suggests remedy ("must be executed within...")

### Pattern 2: Unique Registration Validation
**File:** `src/core/mcp-handler.ts:62-67`

```typescript
public registerServer(server: MCPServer): void {
  if (this.servers.has(server.name)) {
    throw new Error(`MCP server '${server.name}' is already registered`);
  }
  this.servers.set(server.name, server);
}
```

**Key Characteristics:**
- Pre-operation validation check
- Uses `has()` to check existence
- Error includes the conflicting value
- Specific error message for clarity

### Pattern 3: Circular Reference Detection
**File:** `src/core/workflow.ts:186-191`

```typescript
if (visited.has(current)) {
  throw new Error('Circular parent-child relationship detected');
}
```

**Key Characteristics:**
- Cycle detection using Set
- Concise error message
- Uses generic error type (not custom)

### Pattern 4: Parent Validation with Detailed Error
**File:** `src/core/workflow.ts:272-279`

```typescript
if (child.parent !== null && child.parent !== this) {
  const errorMessage =
    `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
    `A workflow can only have one parent. ` +
    `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
```

**Key Characteristics:**
- Multi-line error message for clarity
- Includes actual values (names)
- Explains the constraint
- Provides actionable guidance
- Logs to console.error before throwing

### Pattern 5: Input Existence Check
**File:** `src/core/workflow.ts:320-323`

```typescript
if (!childOrName) {
  throw new Error('Child workflow or name is required');
}
```

**Key Characteristics:**
- Simple existence check
- Clear error message
- Uses negated condition

## Test Patterns for Validation

### Pattern 1: TDD-style Error Testing
**File:** `src/__tests__/adversarial/circular-reference.test.ts:23-29`

```typescript
it('should throw when attaching immediate parent as child', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
});
```

**Key Characteristics:**
- Setup with valid state
- Test the invalid operation
- Use regex to match error message keywords
- Case-insensitive matching

### Pattern 2: Specific Error Message Testing
**File:** `src/__tests__/unit/workflow-detachChild.test.ts:22-26`

```typescript
it('should throw error when child is not attached to parent', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child');

  expect(() => parent.detachChild(child)).toThrow(/not attached/i);
});
```

**Key Characteristics:**
- Minimal setup
- Direct test of error condition
- Specific error message assertion

### Pattern 3: Constructor Parameter Testing
**File:** `src/__tests__/unit/workflow.test.ts:20-28`

```typescript
it('should use class name as default workflow name', () => {
  const wf = new SimpleWorkflow();
  expect(wf.getNode().name).toBe('SimpleWorkflow');
});

it('should use custom name when provided', () => {
  const wf = new SimpleWorkflow('CustomName');
  expect(wf.getNode().name).toBe('CustomName');
});
```

**Key Characteristics:**
- Tests both default and custom behavior
- Clear expected values
- Uses getter method (`getNode()`)
- Separate tests for each case

### Pattern 4: Edge Case Testing
**File:** `src/__tests__/adversarial/edge-case.test.ts:107-117`

```typescript
it('should handle empty string workflow name', async () => {
  const workflow = new TestWorkflow('');
  expect(workflow.node.name).toBe('');
  await workflow.run();
});
```

**Key Characteristics:**
- Tests boundary condition
- Tests both property and execution
- Async test when execution is involved

## Error Message Patterns

### Descriptive Error Format
```typescript
// Pattern: {What} {Why} {Context} {Guidance}
throw new Error(
  `${operation} called outside of workflow context. ` +
  `Agent/Prompt operations must be executed within a workflow step.`
);
```

### Value-Including Error Format
```typescript
// Pattern: Include the actual invalid value in quotes
throw new Error(`MCP server '${server.name}' is already registered`);
```

### Multi-Line Guidance Format
```typescript
// Pattern: Explain the constraint + provide action
const errorMessage =
  `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
  `A workflow can only have one parent. ` +
  `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
```

## Implementation Recommendations

### Validation Function Pattern
Based on codebase patterns, workflow name validation should:

```typescript
// Location: In Workflow constructor, after config is set
private validateName(name: unknown): string {
  // Type check (Pattern from requireExecutionContext)
  if (typeof name !== 'string') {
    throw new Error(`Workflow name must be a string, received ${typeof name}`);
  }

  // Empty check (Pattern from registerServer)
  if (name.trim().length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }

  // Optional: Length check
  if (name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }

  return name;
}
```

### Test Pattern to Follow
```typescript
describe('Workflow Name Validation', () => {
  // Test empty string
  it('should reject empty string name', () => {
    expect(() => new SimpleWorkflow(''))
      .toThrow(/cannot be empty|whitespace only/i);
  });

  // Test whitespace only
  it('should reject whitespace-only name', () => {
    expect(() => new SimpleWorkflow('   '))
      .toThrow(/whitespace only/i);
  });

  // Test valid name still works
  it('should accept valid name', () => {
    const wf = new SimpleWorkflow('ValidWorkflow');
    expect(wf.node.name).toBe('ValidWorkflow');
  });

  // Test default class name still works
  it('should use class name when not provided', () => {
    const wf = new SimpleWorkflow();
    expect(wf.node.name).toBe('SimpleWorkflow');
  });
});
```

## Key Gotchas

1. **No custom error classes:** Codebase uses standard `Error` - follow this pattern
2. **Error messages include values:** Always include the invalid value in quotes
3. **Console.error before throw:** Some places log before throwing (Pattern 4)
4. **Regex matching in tests:** Use case-insensitive regex with keywords
5. **Separate test files:** Validation tests go in adversarial/ or unit/ directory

## Files to Reference for Implementation

| Purpose | File | Lines |
|---------|------|-------|
| Constructor location | src/core/workflow.ts | 83-108 |
| Validation examples | src/context.ts | 42-51 |
| Error examples | src/core/workflow.ts | 272-279 |
| Test patterns | src/__tests__/adversarial/ | Various |
| Existing name tests | src/__tests__/unit/workflow.test.ts | 20-28 |
| Current empty name test | src/__tests__/adversarial/edge-case.test.ts | 107-117 |
