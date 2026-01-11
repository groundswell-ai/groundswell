# Vitest Error Assertion Patterns Research

**Vitest Version:** 1.6.1
**Last Updated:** 2025-01-11
**TypeScript Version:** 5.2.0

## Table of Contents

1. [Basic Error Throwing Assertions](#basic-error-throwing-assertions)
2. [Error Message Matching Patterns](#error-message-matching-patterns)
3. [Async Error Testing](#async-error-testing)
4. [Error Type Assertions](#error-type-assertions)
5. [Partial Message Matching](#partial-message-matching)
6. [Best Practices for TypeScript](#best-practices-for-typescript)
7. [Real Examples from Groundswell Codebase](#real-examples-from-groundswell-codebase)
8. [Reference Links](#reference-links)

---

## Basic Error Throwing Assertions

### 1. Simple Error Existence Check

```typescript
import { expect, test } from 'vitest';

test('throws an error', () => {
  expect(() => {
    throw new Error('Something went wrong');
  }).toThrow();
});
```

### 2. Exact Message Match

```typescript
test('throws error with exact message', () => {
  expect(() => {
    throw new Error('Child already attached to this workflow');
  }).toThrow('Child already attached to this workflow');
});
```

### 3. Negation - Should NOT Throw

```typescript
test('should not throw', () => {
  expect(() => {
    const result = 2 + 2;
  }).not.toThrow();
});
```

---

## Error Message Matching Patterns

### 1. Regex Pattern Matching

```typescript
test('matches error pattern with regex', () => {
  expect(() => {
    throw new Error("MCP server 'server1' is already registered");
  }).toThrow(/MCP server .* is already registered/);
});
```

### 2. String Contains Check

```typescript
test('error message contains substring', () => {
  expect(() => {
    throw new Error('Error: Circular parent-child relationship detected');
  }).toThrow('Circular parent-child relationship');
});
```

### 3. Advanced Partial Matching with expect.stringContaining()

```typescript
test('advanced partial matching', () => {
  expect(() => {
    throw new Error('User already has a parent workflow attached');
  }).toThrow({
    message: expect.stringContaining('has a parent')
  });
});
```

### 4. Multiple Pattern Checks

```typescript
test('checks multiple patterns', () => {
  expect(() => {
    throw new TypeError('Invalid value: must be a string');
  }).toThrow(/Invalid value/);
  // Additional checks can be done separately
});
```

---

## Async Error Testing

### 1. Basic Async Error with rejects.toThrow()

```typescript
test('async function throws error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Failed to connect');
});
```

### 2. Async Error with Regex

```typescript
test('async error matches pattern', async () => {
  await expect(workflow.run()).rejects.toThrow(/Test error from step/);
});
```

### 3. Async Error with Specific Error Type

```typescript
test('async throws specific error type', async () => {
  await expect(asyncOperation()).rejects.toThrow(TypeError);
});
```

### 4. Promise-based Error Testing

```typescript
test('promise rejection with message', async () => {
  const promise = Promise.reject(new Error('Network timeout'));
  await expect(promise).rejects.toThrow('Network timeout');
});
```

### 5. Negation - Should NOT Reject

```typescript
test('async should not throw', async () => {
  await expect(cache.bust('nonexistent')).resolves.not.toThrow();
});
```

---

## Error Type Assertions

### 1. Check for Specific Error Class

```typescript
test('throws TypeError', () => {
  expect(() => {
    throw new TypeError('Wrong type');
  }).toThrow(TypeError);
});
```

### 2. Check for Custom Error Class

```typescript
class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

test('throws custom WorkflowError', () => {
  expect(() => {
    throw new WorkflowError('Workflow failed');
  }).toThrow(WorkflowError);
});
```

### 3. Combined Error Type and Message

```typescript
test('throws specific error with message', () => {
  expect(() => {
    throw new Error('Reflection is not enabled');
  }).toThrow(Error, 'Reflection is not enabled');
});
```

---

## Partial Message Matching

### 1. Using String Contains (Recommended for "already has a parent" scenarios)

```typescript
test('error contains "already has a parent"', () => {
  expect(() => {
    throw new Error('Child already has a parent workflow');
  }).toThrow('already has a parent');
});
```

### 2. Using Regex for Flexible Matching

```typescript
test('flexible partial matching with regex', () => {
  expect(() => {
    throw new Error('Child workflow already attached to parent');
  }).toThrow(/already.*parent/);
});
```

### 3. Case-Insensitive Matching

```typescript
test('case-insensitive error matching', () => {
  expect(() => {
    throw new Error('ERROR: Invalid Input');
  }).toThrow(/invalid input/i);
});
```

### 4. Matching Multiple Possible Messages

```typescript
test('matches one of several possible messages', () => {
  expect(() => {
    throw new Error('Not connected to server');
  }).toThrow(/(Not connected|Connection failed|Server unavailable)/);
});
```

---

## Best Practices for TypeScript

### 1. Type-Safe Error Testing

```typescript
interface WorkflowError extends Error {
  code: string;
}

function throwWorkflowError(): never {
  const error = new Error('Workflow validation failed') as WorkflowError;
  error.code = 'WORKFLOW_ERROR';
  throw error;
}

test('type-safe error assertion', () => {
  expect(throwWorkflowError).toThrow(WorkflowError);
});
```

### 2. Testing Custom Error Properties

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

test('custom error properties', () => {
  expect(() => {
    throw new ValidationError('Invalid email', 'email', 'INVALID_FORMAT');
  }).toThrow(expect.objectContaining({
    name: 'ValidationError',
    message: expect.stringContaining('email'),
    field: 'email',
    code: 'INVALID_FORMAT'
  }));
});
```

### 3. Narrow Error Types

```typescript
test('narrow error type check', () => {
  try {
    riskyOperation();
    fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain('expected error');
    }
  }
});
```

### 4. Using Type Guards for Error Testing

```typescript
function isWorkflowError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error;
}

test('type guard error assertion', () => {
  expect(() => {
    throw new Error('Test');
  }).toThrow((error) => {
    if (!isWorkflowError(error)) {
      return false;
    }
    return error.code === 'EXPECTED_CODE';
  });
});
```

### 5. Testing that Function Returns Never (Always Throws)

```typescript
function alwaysThrow(): never {
  throw new Error('This function always throws');
}

test('function type asserts to never', () => {
  expect(() => alwaysThrow()).toThrow();
  // Type checking: if function returns, TypeScript will error
});
```

---

## Real Examples from Groundswell Codebase

### Example 1: Duplicate Attachment Detection

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts:247`

```typescript
it('should throw error when duplicate attachment attempted', () => {
  // Arrange: Create parent and child workflows with first attachment
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act & Assert: Second attachment attempt should throw error
  expect(() => parent.attachChild(child)).toThrow(
    'Child already attached to this workflow'
  );
});
```

### Example 2: Circular Reference Detection

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts:220`

```typescript
it('should detect circular relationship in getRoot', () => {
  // Arrange: Create parent and child workflows
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Act: Create circular reference manually
  parent.parent = child;

  // Assert: getRoot() should throw error for circular reference
  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

### Example 3: Async Error in Workflow Execution

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts:106`

```typescript
it('should emit error event when step throws', async () => {
  // Arrange: Create workflow with error-throwing step
  const workflow = new SimpleWorkflow('Test');

  // Act: Attach observer and run workflow
  workflow.addObserver(observer);
  await expect(workflow.run()).rejects.toThrow('Test error from step');

  // Assert: Verify error event was emitted
  const errorEvents = events.filter((e) => e.type === 'error');
  expect(errorEvents).toHaveLength(1);
});
```

### Example 4: MCP Server Registration

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts:79`

```typescript
it('should throw when registering duplicate server', () => {
  const handler = new MCPHandler();

  handler.registerServer({
    name: 'server1',
    transport: 'inprocess',
  });

  expect(() =>
    handler.registerServer({
      name: 'server1',
      transport: 'inprocess',
    })
  ).toThrow("MCP server 'server1' is already registered");
});
```

### Example 5: Context Validation

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/context.test.ts:37`

```typescript
it('should throw when requiring context outside of context', () => {
  expect(() => requireExecutionContext('test operation')).toThrow(
    'test operation called outside of workflow context'
  );
});
```

### Example 6: Reflection Manager Error

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/reflection.test.ts:71`

```typescript
it('should throw when reflection is disabled', async () => {
  const manager = new ReflectionManager({ enabled: false, maxAttempts: 3 });

  await expect(manager.triggerReflection()).rejects.toThrow(
    'Reflection is not enabled'
  );
});
```

### Example 7: Circular Structure Detection

**File:** `/home/dustin/projects/groundswell/src/__tests__/unit/cache-key.test.ts:47`

```typescript
it('should handle circular references', () => {
  const obj: Record<string, unknown> = { a: 1 };
  obj.self = obj;

  expect(() => deterministicStringify(obj)).toThrow(
    'Converting circular structure to JSON'
  );
});
```

---

## Comprehensive Error Testing Patterns

### Pattern 1: Testing Multiple Error Scenarios

```typescript
describe('Error validation', () => {
  const errorCases = [
    {
      name: 'null parent',
      input: null,
      expectedError: 'Parent cannot be null'
    },
    {
      name: 'undefined parent',
      input: undefined,
      expectedError: 'Parent must be defined'
    },
    {
      name: 'self as parent',
      input: 'self',
      expectedError: 'Cannot be own parent'
    }
  ];

  errorCases.forEach(({ name, input, expectedError }) => {
    it(`should throw for ${name}`, () => {
      expect(() => validateParent(input)).toThrow(expectedError);
    });
  });
});
```

### Pattern 2: Testing Error Properties

```typescript
test('error has correct properties', () => {
  try {
    throw new ValidationError('Invalid input', 'email', 'INVALID_FORMAT');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toHaveProperty('message', 'Invalid input');
    expect(error).toHaveProperty('field', 'email');
    expect(error).toHaveProperty('code', 'INVALID_FORMAT');
  }
});
```

### Pattern 3: Testing Error Recovery

```typescript
test('should recover from error and retry', async () => {
  let attempts = 0;

  const flakyFunction = async (): Promise<string> => {
    attempts++;
    if (attempts < 3) {
      throw new Error(`Attempt ${attempts} failed`);
    }
    return 'success';
  };

  // First two attempts should fail
  await expect(flakyFunction()).rejects.toThrow('Attempt 1 failed');
  await expect(flakyFunction()).rejects.toThrow('Attempt 2 failed');

  // Third attempt should succeed (reset for test)
  attempts = 0;
  const result = await flakyFunction();
  expect(result).toBe('success');
});
```

### Pattern 4: Testing Error Event Emissions

```typescript
test('should emit error event when operation fails', async () => {
  const events: ErrorEvent[] = [];
  const emitter = new EventEmitter();

  emitter.on('error', (error) => events.push(error));

  try {
    await failingOperation();
  } catch (error) {
    // Expected to throw
  }

  expect(events).toHaveLength(1);
  expect(events[0].message).toContain('failed');
});
```

---

## Quick Reference: Error Assertion Patterns

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| Any error | `expect(fn).toThrow()` | Error is thrown |
| Exact message | `expect(fn).toThrow('msg')` | Exact string match |
| Partial message | `expect(fn).toThrow(/partial/)` | Regex/partial match |
| Error type | `expect(fn).toThrow(TypeError)` | Specific error class |
| Async error | `await expect(fn()).rejects.toThrow()` | Promise rejection |
| No error | `expect(fn).not.toThrow()` | Should not throw |
| Message property | `expect(fn).toThrow({ message: '...' })` | Error object match |
| String contains | `expect(fn).toThrow({ message: expect.stringContaining('text') })` | Advanced partial |

---

## Common Gotchas and Solutions

### Gotcha 1: Forgetting to Wrap Function

```typescript
// ❌ WRONG - This will always fail
expect(throwError()).toThrow();

// ✅ CORRECT - Wrap in function
expect(() => throwError()).toThrow();
```

### Gotcha 2: Async/Await with toThrow

```typescript
// ❌ WRONG - Missing await
expect(asyncFunction()).rejects.toThrow();

// ✅ CORRECT - Include await
await expect(asyncFunction()).rejects.toThrow();
```

### Gotcha 3: Testing Non-Error Objects

```typescript
// ❌ WRONG - Throws non-Error
throw 'Error message';

// ✅ CORRECT - Throw Error object
throw new Error('Error message');
```

### Gotcha 4: Case Sensitivity

```typescript
// ❌ WRONG - Case doesn't match
expect(() => throw new Error('Invalid')).toThrow('invalid');

// ✅ CORRECT - Use regex for case-insensitive
expect(() => throw new Error('Invalid')).toThrow(/invalid/i);
```

---

## Reference Links

### Official Vitest Documentation

- **Vitest Expect API - toThrow():**
  https://vitest.dev/api/expect.html#tothrow

- **Vitest Testing Matchers:**
  https://vitest.dev/guide/testing-matchers.html

- **Vitest Async Testing:**
  https://vitest.dev/guide/testing.html#testing-async

### Related Documentation

- **Jest Compatible Matchers:**
  https://vitest.dev/api/expect.html (Vitest is Jest-compatible)

- **TypeScript Error Handling Best Practices:**
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

---

## Summary Checklist

When testing errors in Vitest with TypeScript:

- [ ] Always wrap synchronous functions in `() => {}` when testing toThrow
- [ ] Use `await expect().rejects.toThrow()` for async functions
- [ ] Use string matching for partial message checks (e.g., `'already has a parent'`)
- [ ] Use regex for flexible pattern matching (e.g., `/already.*parent/`)
- [ ] Specify error type when important: `toThrow(ErrorType)`
- [ ] Test error properties for custom errors
- [ ] Use `not.toThrow()` for positive assertions
- [ ] Consider error recovery scenarios in integration tests
- [ ] Test error event emissions when working with observables
- [ ] Document expected error messages in code comments
