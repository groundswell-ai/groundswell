# TDD Patterns: Test-Driven Development for TypeScript/Vitest

This document researches and documents Test-Driven Development (TDD) patterns specifically for TypeScript projects using Vitest, with a focus on the "red phase" - writing failing tests that document expected behavior.

## Table of Contents

1. [The TDD Cycle](#the-tdd-cycle)
2. [The Red Phase: Writing Proper Failing Tests](#the-red-phase)
3. [Failing for the Right Reason](#failing-for-the-right-reason)
4. [Test Naming Best Practices](#test-naming-best-practices)
5. [Tests as Documentation](#tests-as-documentation)
6. [TypeScript/Vitest Specific Patterns](#typescriptvitest-specific-patterns)
7. [Examples from Practice](#examples-from-practice)
8. [References](#references)

---

## The TDD Cycle

TDD follows a simple three-step cycle known as **Red-Green-Refactor**:

### 1. Red Phase
Write a failing test that defines the desired behavior. The test should:
- Document what the code should do
- Fail because the functionality doesn't exist (not because of syntax errors)
- Be minimal and focused on one behavior

### 2. Green Phase
Write the minimum code necessary to make the test pass:
- Focus only on making this one test pass
- Don't worry about perfect implementation yet
- The goal is to get from red to green quickly

### 3. Refactor Phase
Improve the code while keeping tests passing:
- Clean up duplication
- Improve names and structure
- Ensure tests still pass

---

## The Red Phase: Writing Proper Failing Tests

The red phase is the foundation of TDD. A well-written failing test serves as both a specification and documentation.

### Principles of the Red Phase

#### 1. Tests Should Fail for the Right Reason

A failing test should fail because the expected behavior doesn't exist yet, not because of:

- Syntax errors
- Import errors
- Typos in method names
- Missing dependencies
- Compilation errors

**Bad Example - Fails for wrong reason (compilation error):**
```typescript
// ❌ BAD: This won't even compile
describe('Calculator', () => {
  it('should add two numbers', () => {
    const calc = new Calculator(); // Calculator doesn't exist yet
    expect(calc.add(1, 2)).toBe(3);
  });
});
```

**Good Example - Fails for right reason (missing implementation):**
```typescript
// ✅ GOOD: Structure exists, but implementation returns wrong value
class Calculator {
  add(a: number, b: number): number {
    return 0; // Placeholder - this causes the meaningful failure
  }
}

describe('Calculator', () => {
  it('should add two numbers', () => {
    const calc = new Calculator();
    expect(calc.add(1, 2)).toBe(3); // Fails: expected 3, got 0
  });
});
```

#### 2. Use the AAA Pattern (Arrange-Act-Assert)

Organize tests into three clear sections:

```typescript
describe('UserService', () => {
  it('should authenticate valid user credentials', async () => {
    // ARRANGE - Set up the test context
    const userService = new UserService();
    const username = 'testuser';
    const password = 'password123';

    // ACT - Execute the behavior being tested
    const result = await userService.authenticate(username, password);

    // ASSERT - Verify the expected outcome
    expect(result.isAuthenticated).toBe(true);
    expect(result.user?.username).toBe(username);
  });
});
```

#### 3. Write One Assertion Per Test (Mostly)

Focus tests on a single behavior. This makes failures easier to understand:

```typescript
// ✅ GOOD: Focused, single behavior
it('should return true when username exists', () => {
  const service = new UserService();
  expect(service.userExists('john')).toBe(true);
});

it('should return false when username does not exist', () => {
  const service = new UserService();
  expect(service.userExists('nonexistent')).toBe(false);
});
```

However, multiple assertions are acceptable when they test related aspects of the same behavior:

```typescript
// ✅ ALSO GOOD: Multiple assertions for one logical behavior
it('should create user with all required properties', () => {
  const user = createUser('john', 'john@example.com');
  expect(user.id).toBeDefined();
  expect(user.username).toBe('john');
  expect(user.email).toBe('john@example.com');
  expect(user.createdAt).toBeInstanceOf(Date);
});
```

---

## Failing for the Right Reason

The distinction between failing for the "right" vs "wrong" reason is crucial in TDD.

### Wrong Reasons to Fail

These failures indicate problems with the test itself, not missing functionality:

#### 1. Syntax/Compilation Errors

```typescript
// ❌ WRONG: Method name typo
it('should calculate sum', () => {
  const calc = new Calculator();
  expect(calc.addd(1, 2)).toBe(3); // Typo: 'addd' won't compile
});
```

#### 2. Import Errors

```typescript
// ❌ WRONG: Importing non-existent module
import { NonExistentClass } from './missing-module';

it('should do something', () => {
  const obj = new NonExistentClass(); // Won't compile
});
```

#### 3. Type Errors

```typescript
// ❌ WRONG: Type mismatch
it('should return number', () => {
  const result = getValue(); // Returns string, but test expects number
  expect(result).toBe(42); // Type error
});
```

### Right Reasons to Fail

These are meaningful failures that guide implementation:

#### 1. Assertion Mismatch - Implementation Returns Wrong Value

```typescript
// ✅ RIGHT: Clear assertion failure
class Calculator {
  add(a: number, b: number): number {
    return 0; // Placeholder implementation
  }
}

it('should add two numbers', () => {
  const calc = new Calculator();
  expect(calc.add(1, 2)).toBe(3);
  // Failure: Expected 3, received 0
});
```

#### 2. Missing Property/Method

```typescript
// ✅ RIGHT: Property doesn't exist yet
interface User {
  id: string;
  username: string;
  // email: string; // Not implemented yet
}

it('should include email in user object', () => {
  const user: User = { id: '1', username: 'john' };
  expect(user.email).toBeDefined();
  // Failure: Property 'email' does not exist on type 'User'
});
```

#### 3. Expected vs Actual Behavior Difference

```typescript
// ✅ RIGHT: Behavior differs from expectation
class Stack {
  private items: number[] = [];

  push(item: number): void {
    this.items.push(item);
  }

  pop(): number | undefined {
    return this.items.shift(); // Bug: removes from wrong end
  }
}

it('should return last pushed item', () => {
  const stack = new Stack();
  stack.push(1);
  stack.push(2);
  expect(stack.pop()).toBe(2);
  // Failure: Expected 2, received 1
  // This clearly shows the behavior is wrong
});
```

### Techniques for Ensuring Right Failures

#### 1. Use Placeholder Implementations

Create minimal implementations that compile but fail assertions:

```typescript
// Start with placeholder that returns "wrong" but valid values
class UserService {
  async getUser(id: string): Promise<User | null> {
    return null; // Valid return type, but causes test failure
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return {
      id: '',
      username: '',
      email: '',
      createdAt: new Date()
    }; // Valid shape, but causes test failure
  }
}
```

#### 2. Use Interfaces/Types First

Define types before implementation:

```typescript
// Define the contract first
interface IWorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
}

// Write test against interface
it('should call onLog when workflow logs', () => {
  const observer: IWorkflowObserver = {
    onLog: vi.fn(),
    onEvent: vi.fn()
  };

  workflow.addObserver(observer);
  workflow.logger.info('test');

  expect(observer.onLog).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'test' })
  );
  // Fails because onLog not called - implementation missing
});
```

#### 3. Run Tests Frequently

Run tests after each small change to catch compilation errors immediately:

```bash
# Run tests in watch mode
npm run test:watch

# Run single test file
npx vitest run workflow.test.ts

# Run tests matching pattern
npx vitest run -t "should add"
```

---

## Test Naming Best Practices

Well-named tests serve as documentation. The name should describe the behavior, not the implementation.

### The "Should" Convention

Frame test names as "should [expected behavior]":

```typescript
describe('Workflow', () => {
  // ✅ GOOD: Describes behavior
  it('should create with unique id', () => {
    const wf1 = new SimpleWorkflow();
    const wf2 = new SimpleWorkflow();
    expect(wf1.id).not.toBe(wf2.id);
  });

  it('should use class name as default name', () => {
    const wf = new SimpleWorkflow();
    expect(wf.getNode().name).toBe('SimpleWorkflow');
  });

  it('should attach child to parent', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);
    expect(child.parent).toBe(parent);
  });
});
```

### Describe Block Organization

Use nested describe blocks to group related tests:

```typescript
describe('Workflow', () => {
  describe('Initialization', () => {
    it('should create with unique id', () => { /* ... */ });
    it('should use class name as default name', () => { /* ... */ });
    it('should use custom name when provided', () => { /* ... */ });
  });

  describe('Parent-Child Relationships', () => {
    it('should attach child to parent', () => { /* ... */ });
    it('should detect circular parent relationship', () => { /* ... */ });
    it('should throw error when duplicate attachment attempted', () => { /* ... */ });
  });

  describe('Event Emission', () => {
    it('should emit logs to observers', () => { /* ... */ });
    it('should emit childAttached event', () => { /* ... */ });
    it('should emit treeUpdated event when status changes', () => { /* ... */ });
  });
});
```

### Test Name Patterns

#### 1. Positive Cases

```typescript
it('should authenticate valid user', () => { /* ... */ });
it('should create user with valid data', () => { /* ... */ });
it('should return cached value when available', () => { /* ... */ });
```

#### 2. Negative Cases

```typescript
it('should reject invalid credentials', () => { /* ... */ });
it('should throw when username is empty', () => { /* ... */ });
it('should return null when user not found', () => { /* ... */ });
```

#### 3. Edge Cases

```typescript
it('should handle empty string username', () => { /* ... */ });
it('should handle unicode characters in password', () => { /* ... */ });
it('should handle deeply nested workflows', () => { /* ... */ });
```

#### 4. State Changes

```typescript
it('should update status after completion', () => { /* ... */ });
it('should increment retry count on failure', () => { /* ... */ });
it('should clear cache after expiration', () => { /* ... */ });
```

### Naming Anti-Patterns

```typescript
// ❌ BAD: Describes implementation
it('calls the saveUser method', () => { /* ... */ });

// ✅ GOOD: Describes behavior
it('should persist user to database', () => { /* ... */ });

// ❌ BAD: Vague
it('works', () => { /* ... */ });

// ✅ GOOD: Specific
it('should return 200 OK when request is valid', () => { /* ... */ });

// ❌ BAD: Technical detail
it('sets the isAuthenticated flag to true', () => { /* ... */ });

// ✅ GOOD: Business logic
it('should mark user as authenticated', () => { /* ... */ });
```

---

## Tests as Documentation

Tests written in TDD serve as living documentation. They show:
- How to use the API
- What behavior to expect
- Edge cases and error conditions

### Characteristics of Documenting Tests

#### 1. Show Real Usage

```typescript
// This test serves as documentation for how to use observers
it('should emit logs to observers', async () => {
  const wf = new SimpleWorkflow();
  const logs: LogEntry[] = [];

  // Shows: How to create an observer
  const observer: WorkflowObserver = {
    onLog: (entry) => logs.push(entry),
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  // Shows: How to attach observer
  wf.addObserver(observer);

  // Shows: How logs are captured
  await wf.run();

  // Shows: What to expect in logs
  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0].message).toBe('Running simple workflow');
});
```

#### 2. Document Edge Cases

```typescript
describe('Error Handling', () => {
  it('should capture state and logs in functional workflow error', async () => {
    // Documents: What happens when a step throws an error
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    const workflow = new Workflow<void>(
      { name: 'ErrorCaptureTest' },
      async (ctx) => {
        // This step will throw
        await ctx.step('failing-step', async () => {
          throw new Error('Test error from step');
        });
      }
    );

    workflow.addObserver(observer);

    try {
      await workflow.run();
    } catch (error) {
      // Expected error
    }

    // Documents: Error event contains state snapshot
    const errorEvent = events.find(e => e.type === 'workflowError');
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.type === 'workflowError' && errorEvent.stateSnapshot).toBeDefined();
  });
});
```

#### 3. Document Configuration Options

```typescript
describe('@Step Decorator Options', () => {
  it('should use custom name from decorator options', async () => {
    // Documents: How to use custom step names
    class CustomNamedWorkflow extends Workflow {
      @Step({ name: 'custom-step-name' })
      async stepWithCustomName(): Promise<void> {
        // ...
      }

      async run(): Promise<void> {
        this.setStatus('running');
        await this.stepWithCustomName();
        this.setStatus('completed');
      }
    }

    const workflow = new CustomNamedWorkflow();
    const events: WorkflowEvent[] = [];

    workflow.addObserver({
      onLog: () => {},
      onEvent: (e) => events.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    await workflow.run();

    // Documents: Custom name appears in events
    const stepStart = events.find(e => e.type === 'stepStart');
    expect(stepStart?.type === 'stepStart' && stepStart.stepName).toBe('custom-step-name');
  });
});
```

#### 4. Document Expected Behavior Over Implementation

```typescript
// ❌ BAD: Tests implementation details
it('should call the logger.info method three times', async () => {
  const loggerSpy = vi.spyOn(workflow.logger, 'info');
  await workflow.run();
  expect(loggerSpy).toHaveBeenCalledTimes(3);
});

// ✅ GOOD: Tests observable behavior
it('should log workflow start, progress, and completion', async () => {
  const logs: LogEntry[] = [];
  workflow.addObserver({
    onLog: (entry) => logs.push(entry),
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.run();

  expect(logs[0].message).toContain('start');
  expect(logs.some(l => l.message.contains('progress'))).toBe(true);
  expect(logs[logs.length - 1].message).toContain('complete');
});
```

---

## TypeScript/Vitest Specific Patterns

### 1. Type-Safe Test Helpers

```typescript
// test-helpers.ts
export interface WorkflowObserverSpy {
  onLog: ReturnType<typeof vi.fn>;
  onEvent: ReturnType<typeof vi.fn>;
  onStateUpdated: ReturnType<typeof vi.fn>;
  onTreeChanged: ReturnType<typeof vi.fn>;
}

export function createObserverSpy(): WorkflowObserverSpy {
  return {
    onLog: vi.fn(),
    onEvent: vi.fn(),
    onStateUpdated: vi.fn(),
    onTreeChanged: vi.fn(),
  };
}

// Usage in tests
it('should emit logs to observers', async () => {
  const observer = createObserverSpy();
  workflow.addObserver(observer);
  await workflow.run();
  expect(observer.onLog).toHaveBeenCalled();
});
```

### 2. Test Factories

```typescript
// test-factories.ts
export function createMockWorkflow(options: {
  name?: string;
  parentId?: string;
} = {}): Workflow {
  const workflow = new Workflow(options);
  // Add any common setup
  return workflow;
}

// Usage
it('should handle parent-child relationships', () => {
  const parent = createMockWorkflow({ name: 'Parent' });
  const child = createMockWorkflow({ name: 'Child', parentId: parent.id });
  expect(child.parent).toBe(parent);
});
```

### 3. Type-Safe Event Filtering

```typescript
import type { WorkflowEvent } from './workflow.js';

function isEventType<T extends WorkflowEvent['type']>(
  event: WorkflowEvent,
  type: T
): event is Extract<WorkflowEvent, { type: T }> {
  return event.type === type;
}

// Usage
it('should emit stepStart event', async () => {
  const events: WorkflowEvent[] = [];
  // ... collect events ...

  const stepStart = events.find(e => isEventType(e, 'stepStart'));
  if (stepStart) {
    expect(stepStart.stepName).toBe('my-step');
  } else {
    fail('Expected stepStart event');
  }
});
```

### 4. Using vi.fn() for Behavior Verification

```typescript
it('should call observer callback for each event', async () => {
  const observerCallback = vi.fn();

  workflow.addObserver({
    onLog: observerCallback,
    onEvent: observerCallback,
    onStateUpdated: observerCallback,
    onTreeChanged: observerCallback,
  });

  await workflow.run();

  expect(observerCallback).toHaveBeenCalled();
  expect(observerCallback.mock.calls.length).toBeGreaterThan(0);
});
```

### 5. Async Test Patterns

```typescript
// ✅ GOOD: Use async/await properly
it('should handle async step execution', async () => {
  const workflow = new AsyncWorkflow();

  // Always await
  await workflow.run();

  expect(workflow.status).toBe('completed');
});

// ✅ GOOD: Test async error scenarios
it('should capture errors from async steps', async () => {
  const workflow = new ErrorWorkflow();

  // Use try/catch for expected errors
  try {
    await workflow.run();
    fail('Expected workflow to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('expected error');
  }
});
```

### 6. Test.each() for Parameterized Tests

```typescript
describe('Workflow status validation', () => {
  it.each([
    ['idle', true],
    ['running', true],
    ['completed', true],
    ['failed', true],
    ['invalid', false],
  ])('should accept "%s" as valid status: %s', (status, isValid) => {
    const workflow = new Workflow();
    if (isValid) {
      expect(() => workflow.setStatus(status as any)).not.toThrow();
    } else {
      expect(() => workflow.setStatus(status as any)).toThrow();
    }
  });
});
```

---

## Examples from Practice

### Example 1: TDD for a New Feature - Workflow Step Caching

#### Red Phase 1: Write the first failing test

```typescript
// File: workflow-caching.test.ts
import { describe, it, expect } from 'vitest';
import { Workflow } from './workflow.js';

describe('Workflow Step Caching', () => {
  it('should cache step results when cache is enabled', async () => {
    // ARRANGE
    let executionCount = 0;
    const workflow = new Workflow(
      {
        name: 'CachedWorkflow',
        cacheEnabled: true,
      },
      async (ctx) => {
        // ACT: Execute same step twice
        await ctx.step('expensive-step', async () => {
          executionCount++;
          return 'computed-result';
        });

        await ctx.step('expensive-step', async () => {
          executionCount++;
          return 'computed-result';
        });
      }
    );

    // ACT
    await workflow.run();

    // ASSERT: Step should only execute once due to caching
    expect(executionCount).toBe(1);
    // Expected failure: executionCount is 2, not 1
  });
});
```

#### Expected Failure Output

```
FAIL  src/__tests__/workflow-caching.test.ts
  Workflow Step Caching
    ✓ should cache step results when cache is enabled (5ms)

    ❌ Workflow Step Caching › should cache step results when cache is enabled

    expect(received).toBe(expected)

    Expected: 1
    Received: 2
```

#### Green Phase: Implement caching

```typescript
// File: workflow.ts
class WorkflowExecutionContext {
  private cache = new Map<string, any>();

  async step<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Check cache if enabled
    if (this.options.cacheEnabled && this.cache.has(name)) {
      return this.cache.get(name);
    }

    const result = await fn();

    // Cache result if enabled
    if (this.options.cacheEnabled) {
      this.cache.set(name, result);
    }

    return result;
  }
}
```

#### Red Phase 2: Add next failing test

```typescript
it('should not cache when cache is disabled', async () => {
  let executionCount = 0;
  const workflow = new Workflow(
    {
      name: 'NonCachedWorkflow',
      cacheEnabled: false,
    },
    async (ctx) => {
      await ctx.step('step', async () => {
        executionCount++;
        return 'result';
      });

      await ctx.step('step', async () => {
        executionCount++;
        return 'result';
      });
    }
  );

  await workflow.run();

  expect(executionCount).toBe(2);
  // Expected failure: executionCount is 1 (because we haven't added cacheEnabled logic)
});
```

### Example 2: TDD for Error Handling

#### Red Phase

```typescript
describe('Workflow Error Boundaries', () => {
  it('should catch errors in child workflows and continue parent', async () => {
    let parentCompleted = false;

    const parent = new Workflow({ name: 'Parent' }, async (ctx) => {
      try {
        await ctx.step('failing-child', async () => {
          throw new Error('Child error');
        });
      } catch (error) {
        // Child error should be caught here
      }

      // Parent should continue after child error
      parentCompleted = true;
    });

    await parent.run();

    expect(parentCompleted).toBe(true);
    // Expected failure: parentCompleted is false (error propagates)
  });
});
```

#### Implementation

```typescript
class Workflow {
  async run(): Promise<void> {
    try {
      await this.executeFn(this.context);
    } catch (error) {
      this.setStatus('failed');
      throw error; // Current behavior: error propagates
    }
  }
}

// Updated to support error boundaries
class Workflow {
  async run(): Promise<void> {
    try {
      await this.executeFn(this.context);
    } catch (error) {
      this.setStatus('failed');
      this.emit('error', error);
      // Don't re-throw - let parent handle it
    }
  }
}
```

### Example 3: TDD for Event Propagation

#### Red Phase 1: Basic event emission

```typescript
it('should emit childAttached event when child is added', () => {
  const parent = new Workflow('Parent');
  const events: WorkflowEvent[] = [];

  parent.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const child = new Workflow('Child', parent);

  const attachEvent = events.find(e => e.type === 'childAttached');
  expect(attachEvent).toBeDefined();
  expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
  // Expected failure: No events emitted yet
});
```

#### Red Phase 2: Event propagation to root observers

```typescript
it('should propagate events to root observers', async () => {
  const rootEvents: WorkflowEvent[] = [];

  const root = new Workflow('Root');
  root.addObserver({
    onLog: () => {},
    onEvent: (e) => rootEvents.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const child = new Workflow('Child', root);

  // Emit event from child
  child.logger.info('Child message');

  // Root observer should receive child's events
  const childLogEvent = rootEvents.find(
    e => e.type === 'log' && e.workflowId === child.id
  );

  expect(childLogEvent).toBeDefined();
  // Expected failure: Events don't propagate to root yet
});
```

---

## Best Practices Summary

### Before Writing the Test

1. **Understand the requirement** - What behavior are you specifying?
2. **Identify the API** - How should this be used?
3. **Consider edge cases** - What could go wrong?

### When Writing the Test

1. **Start with the test name** - It should describe the expected behavior
2. **Use AAA pattern** - Arrange, Act, Assert
3. **Make it compile** - Use placeholder implementations if needed
4. **Run and verify failure** - Ensure it fails for the right reason
5. **Keep it focused** - One behavior per test

### Test Structure Checklist

- [ ] Test name clearly describes expected behavior
- [ ] Test compiles without errors
- [ ] Test fails with meaningful error message
- [ ] Test failure is due to missing/wrong behavior, not syntax
- [ ] Test has clear Arrange/Act/Assert sections
- [ ] Test is independent (can run alone)
- [ ] Test is fast (no unnecessary delays)

### Common Pitfalls

1. **Writing tests after code** - This misses the design benefit of TDD
2. **Testing implementation details** - Test behavior, not internals
3. **Multiple behaviors in one test** - Keep tests focused
4. **Fragile tests** - Tests that break with refactoring
5. **Skipping the red phase** - Writing tests that already pass

---

## References

### Books

1. **"Test-Driven Development: By Example"** by Kent Beck
   - The foundational book on TDD
   - Introduces Red-Green-Refactor cycle
   - ISBN: 978-0321146533

2. **"Growing Object-Oriented Software, Guided by Tests"** by Steve Freeman and Nat Pryce
   - TDD for object-oriented systems
   - Focus on mock objects and test isolation
   - ISBN: 978-0321503626

### Articles and Resources

3. **"Test-Driven Development"** - Martin Fowler
   - https://martinfowler.com/bliki/TestDrivenDevelopment.html
   - Overview of TDD principles and practices

4. **"The Three Rules of TDD"** - Uncle Bob (Robert C. Martin)
   - https://blog.cleancoder.com/uncle-bob/2013/05/27/TheThreeRulesOfTdd.html
   - Core rules: write no production code except to pass a failing test

5. **"Given-When-Then Pattern"** - Dan North
   - Introduces behavior-driven development style
   - https://dannorth.net/introducing-bdd/

### Vitest-Specific Resources

6. **Vitest Documentation**
   - https://vitest.dev/guide/
   - Official documentation for Vitest testing framework

7. **Vitest API Reference**
   - https://vitest.dev/api/
   - Complete API for describe, it, expect, vi, etc.

8. **Testing Library Principles**
   - https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
   -虽然 React-focused, principles apply broadly

### TypeScript Testing

9. **TypeScript Testing Best Practices**
   - https://basarat.gitbook.io/typescript/type-system/type-inference#testing
   - Type-safe testing patterns in TypeScript

10. **Mocking in Vitest**
    - https://vitest.dev/guide/mocking.html
    - Mock functions, modules, and timers

### Online Communities

11. **Test-Driven Development StackOverflow Tag**
    - https://stackoverflow.com/questions/tagged/test-driven-development
    - Community Q&A on TDD

12. **r/tdd Reddit Community**
    - https://www.reddit.com/r/tdd/
    - Discussions and articles on TDD

---

## Quick Reference: TDD Red Phase Checklist

```
□ Identify the behavior you want to implement
□ Write test name: "should [expected behavior]"
□ Set up test context (Arrange)
□ Execute the behavior (Act)
□ Assert expected outcome (Assert)
□ Ensure test compiles (add placeholder if needed)
□ Run test - verify it fails
□ Verify failure message is meaningful
□ Confirm failure is due to missing behavior, not syntax
→ Now you're ready for Green phase!
```

---

## Pattern Templates

### Template 1: Basic Function Test

```typescript
describe('[Feature Name]', () => {
  it('should [expected behavior]', () => {
    // Arrange
    const input = 'test input';
    const expected = 'expected output';
    const subject = new SubjectUnderTest();

    // Act
    const result = subject.method(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Template 2: Async Operation Test

```typescript
describe('[Feature Name]', () => {
  it('should [expected behavior]', async () => {
    // Arrange
    const subject = new SubjectUnderTest();
    const events: Event[] = [];

    subject.on('event', (e) => events.push(e));

    // Act
    await subject.asyncMethod();

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('expected-type');
  });
});
```

### Template 3: Error Handling Test

```typescript
describe('[Feature Name] Error Handling', () => {
  it('should [describe error scenario]', async () => {
    // Arrange
    const subject = new SubjectUnderTest();

    // Act & Assert
    await expect(
      subject.method('invalid-input')
    ).rejects.toThrow('Expected error message');
  });
});
```

### Template 4: State Change Test

```typescript
describe('[Feature Name]', () => {
  it('should [change state] when [condition]', () => {
    // Arrange
    const subject = new SubjectUnderTest();
    expect(subject.status).toBe('initial');

    // Act
    subject.transition();

    // Assert
    expect(subject.status).toBe('changed');
  });
});
```

---

*This document serves as a comprehensive guide for TDD practices in TypeScript/Vitest environments. It should be updated as new patterns emerge and as the team's testing practices evolve.*
