# Console Mocking Patterns in Vitest/TypeScript

Comprehensive guide for mocking, spying, and capturing console output in Vitest testing environments.

## Table of Contents

1. [Basic Spying](#basic-spying)
2. [Mocking Console Methods](#mocking-console-methods)
3. [Capturing Console Output](#capturing-console-output)
4. [Verifying Error Messages](#verifying-error-messages)
5. [TDD Best Practices](#tdd-best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Advanced Patterns](#advanced-patterns)
8. [Reference Documentation](#reference-documentation)

---

## Basic Spying

### Simple Spy on console.log

The most basic pattern for spying on console calls without suppressing output:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Basic Console Spying', () => {
  it('should track console.log calls', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    console.log('Hello, World!');

    expect(consoleSpy).toHaveBeenCalledWith('Hello, World!');
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
```

### Spy with Automatic Cleanup

Use `beforeEach` and `afterEach` for automatic cleanup:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Console Spying with Cleanup', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should track first console call', () => {
    console.log('First message');
    expect(consoleSpy).toHaveBeenCalledWith('First message');
  });

  it('should track second console call', () => {
    console.log('Second message');
    expect(consoleSpy).toHaveBeenCalledWith('Second message');
  });
});
```

### Alternative: Using vi.restoreAllMocks()

Clean approach for multiple spies:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Multiple Console Spies', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log');
    vi.spyOn(console, 'error');
    vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track all console methods', () => {
    console.log('info');
    console.error('error');
    console.warn('warning');

    expect(console.log).toHaveBeenCalledWith('info');
    expect(console.error).toHaveBeenCalledWith('error');
    expect(console.warn).toHaveBeenCalledWith('warning');
  });
});
```

---

## Mocking Console Methods

### Suppress Output with Mock Implementation

Prevent console output during tests:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Suppressing Console Output', () => {
  it('should not print to actual console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    console.log('This will not appear in test output');

    expect(consoleSpy).toHaveBeenCalledWith('This will not appear in test output');
    consoleSpy.mockRestore();
  });
});
```

### Mock Return Value

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Mock Return Values', () => {
  it('should mock console.log return value', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue(42);

    const result = console.log('test');

    expect(result).toBe(42);
    expect(consoleSpy).toHaveBeenCalledWith('test');
    consoleSpy.mockRestore();
  });
});
```

### Mock Implementation with Side Effects

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Mock with Side Effects', () => {
  it('should execute custom logic', () => {
    let callCount = 0;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      callCount++;
    });

    console.log('test1');
    console.log('test2');

    expect(callCount).toBe(2);
    consoleSpy.mockRestore();
  });
});
```

---

## Capturing Console Output

### Capture to Array

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Capturing Console Output', () => {
  it('should capture all console.log calls', () => {
    const logs: string[] = [];

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      logs.push(args.join(' '));
    });

    console.log('First message');
    console.log('Second', 'message');
    console.log({ complex: 'object' });

    expect(logs).toHaveLength(3);
    expect(logs[0]).toBe('First message');
    expect(logs[1]).toBe('Second message');
    expect(logs[2]).toBe('[object Object]'); // Objects are stringified

    consoleSpy.mockRestore();
  });
});
```

### Capture with Type Safety

```typescript
import { describe, it, expect, vi } from 'vitest';

interface ConsoleCapture {
  method: 'log' | 'error' | 'warn' | 'debug';
  args: any[];
  timestamp: number;
}

describe('Type-Safe Console Capture', () => {
  it('should capture console calls with metadata', () => {
    const captures: ConsoleCapture[] = [];

    const captureConsole = (method: ConsoleCapture['method']) => {
      return vi.spyOn(console, method).mockImplementation((...args: any[]) => {
        captures.push({
          method,
          args,
          timestamp: Date.now(),
        });
      });
    };

    const logSpy = captureConsole('log');
    const errorSpy = captureConsole('error');

    console.log('User logged in', { userId: 123 });
    console.error('Database connection failed');

    expect(captures).toHaveLength(2);
    expect(captures[0]).toMatchObject({
      method: 'log',
      args: ['User logged in', { userId: 123 }],
    });
    expect(captures[1]).toMatchObject({
      method: 'error',
      args: ['Database connection failed'],
    });

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
```

### Capture and Assert on Multiple Properties

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Complex Console Assertions', () => {
  it('should assert on multiple console properties', () => {
    const calls: Array<{ level: string; messages: any[] }> = [];

    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      calls.push({ level: 'info', messages: args });
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      calls.push({ level: 'error', messages: args });
    });

    console.log('Processing started');
    console.error('Processing failed');

    expect(calls).toHaveLength(2);

    // Assert on first call
    expect(calls[0].level).toBe('info');
    expect(calls[0].messages[0]).toBe('Processing started');

    // Assert on second call
    expect(calls[1].level).toBe('error');
    expect(calls[1].messages[0]).toBe('Processing failed');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
```

---

## Verifying Error Messages

### Verify Error Message Content

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Error Message Verification', () => {
  it('should verify error message was logged', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulating an error being logged
    console.error('Failed to connect to database: Connection timeout');

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to connect to database: Connection timeout'
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it('should verify error message contains expected text', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    console.error('Error: Invalid user input - field is required');

    // Verify the call was made
    expect(errorSpy).toHaveBeenCalled();

    // Get the actual arguments and verify content
    const firstCall = errorSpy.mock.calls[0];
    const errorMessage = firstCall[0];

    expect(errorMessage).toContain('Invalid user input');
    expect(errorMessage).toContain('required');

    errorSpy.mockRestore();
  });
});
```

### Verify Error Objects

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Error Object Verification', () => {
  it('should verify Error objects are logged', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Something went wrong');
    console.error(error);

    expect(errorSpy).toHaveBeenCalledWith(error);
    expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(errorSpy.mock.calls[0][0].message).toBe('Something went wrong');

    errorSpy.mockRestore();
  });

  it('should verify error with stack trace', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Critical failure');
    console.error('Error occurred:', error);

    const firstCall = errorSpy.mock.calls[0];

    expect(firstCall[0]).toBe('Error occurred:');
    expect(firstCall[1]).toBeInstanceOf(Error);
    expect(firstCall[1].message).toBe('Critical failure');
    expect(firstCall[1].stack).toBeDefined();

    errorSpy.mockRestore();
  });
});
```

### Pattern Matching for Error Messages

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Error Message Pattern Matching', () => {
  it('should verify error message matches pattern', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    console.error('Error: User 123 failed to authenticate at 2025-01-11');

    const errorMessage = errorSpy.mock.calls[0][0] as string;

    expect(errorMessage).toMatch(/User \d+ failed to authenticate/);
    expect(errorMessage).toMatch(/\d{4}-\d{2}-\d{2}/);

    errorSpy.mockRestore();
  });

  it('should verify multiple error messages match patterns', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    console.error('ECONNREFUSED: Connection refused');
    console.error('ETIMEDOUT: Operation timed out');
    console.error('ENOTFOUND: getaddrinfo ENOTFOUND');

    errorSpy.mock.calls.forEach((call) => {
      const message = call[0] as string;
      expect(message).toMatch(/^[A-Z]+:/); // Error code prefix
      expect(message.length).toBeGreaterThan(10); // Minimum length
    });

    errorSpy.mockRestore();
  });
});
```

---

## TDD Best Practices

### Red-Green-Refactor with Console Testing

```typescript
import { describe, it, expect, vi } from 'vitest';

// Function to test
class UserService {
  constructor(private readonly userId: number) {}

  authenticate(): boolean {
    if (this.userId <= 0) {
      console.error(`Invalid user ID: ${this.userId}`);
      return false;
    }

    console.log(`User ${this.userId} authenticated successfully`);
    return true;
  }
}

describe('UserService TDD Cycle', () => {
  describe('Red Phase: Failing Test', () => {
    it('should log error for invalid user ID', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const service = new UserService(-1);
      service.authenticate();

      expect(errorSpy).toHaveBeenCalledWith('Invalid user ID: -1');

      errorSpy.mockRestore();
    });
  });

  describe('Green Phase: Passing Test', () => {
    it('should log success message for valid user ID', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const service = new UserService(123);
      service.authenticate();

      expect(logSpy).toHaveBeenCalledWith('User 123 authenticated successfully');

      logSpy.mockRestore();
    });
  });

  describe('Refactor Phase: Improved Implementation', () => {
    it('should handle edge cases gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Test zero
      new UserService(0).authenticate();
      expect(errorSpy).toHaveBeenCalledWith('Invalid user ID: 0');

      // Test negative
      new UserService(-999).authenticate();
      expect(errorSpy).toHaveBeenCalledWith('Invalid user ID: -999');

      // Test positive
      new UserService(1).authenticate();
      expect(logSpy).toHaveBeenCalledWith('User 1 authenticated successfully');

      errorSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
```

### Test Isolation

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Test Isolation Best Practices', () => {
  // Each test gets a fresh spy
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  // Clean up after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('test 1 - should not affect test 2', () => {
    console.log('Test 1');
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('test 2 - starts with clean state', () => {
    // This assertion passes because mocks are reset
    expect(console.log).not.toHaveBeenCalled();
    console.log('Test 2');
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
```

### Reusable Test Utilities

```typescript
// test-utils/console.ts
import { SpyInstance, vi } from 'vitest';

export interface ConsoleCaptures {
  log: string[];
  error: string[];
  warn: string[];
  debug: string[];
}

export class ConsoleSpy {
  private spies: {
    log?: SpyInstance;
    error?: SpyInstance;
    warn?: SpyInstance;
    debug?: SpyInstance;
  } = {};

  private captures: ConsoleCaptures = {
    log: [],
    error: [],
    warn: [],
    debug: [],
  };

  setup(): void {
    this.spies.log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      this.captures.log.push(args.join(' '));
    });

    this.spies.error = vi.spyOn(console, 'error').mockImplementation((...args) => {
      this.captures.error.push(args.join(' '));
    });

    this.spies.warn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      this.captures.warn.push(args.join(' '));
    });

    this.spies.debug = vi.spyOn(console, 'debug').mockImplementation((...args) => {
      this.captures.debug.push(args.join(' '));
    });
  }

  restore(): void {
    Object.values(this.spies).forEach((spy) => spy?.mockRestore());
    this.spies = {};
    this.captures = { log: [], error: [], warn: [], debug: [] };
  }

  getCaptures(): ConsoleCaptures {
    return { ...this.captures };
  }

  expectLogCalledWith(message: string): void {
    expect(this.spies.log).toHaveBeenCalledWith(message);
  }

  expectErrorCalledWith(message: string): void {
    expect(this.spies.error).toHaveBeenCalledWith(message);
  }
}

// Usage in tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConsoleSpy } from './test-utils/console';

describe('Using ConsoleSpy Utility', () => {
  let consoleSpy: ConsoleSpy;

  beforeEach(() => {
    consoleSpy = new ConsoleSpy();
    consoleSpy.setup();
  });

  afterEach(() => {
    consoleSpy.restore();
  });

  it('should capture log messages', () => {
    console.log('Test message');

    const captures = consoleSpy.getCaptures();
    expect(captures.log).toContain('Test message');

    consoleSpy.expectLogCalledWith('Test message');
  });
});
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Restore Mocks

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Pitfall: Not Restoring Mocks', () => {
  it('BAD: Spy leaks to next test', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    console.log('test');
    expect(spy).toHaveBeenCalled();
    // Missing: spy.mockRestore();
  });

  it('GOOD: Always restore mocks', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    console.log('test');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore(); // ✅ Clean up
  });
});
```

### Pitfall 2: Asserting Before Action

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Pitfall: Wrong Assertion Order', () => {
  it('BAD: Assert before action', () => {
    const spy = vi.spyOn(console, 'log');

    expect(spy).toHaveBeenCalledWith('test'); // ❌ Fails - not called yet
    console.log('test');

    spy.mockRestore();
  });

  it('GOOD: Assert after action', () => {
    const spy = vi.spyOn(console, 'log');

    console.log('test');
    expect(spy).toHaveBeenCalledWith('test'); // ✅ Correct order

    spy.mockRestore();
  });
});
```

### Pitfall 3: Mocking Wrong Console Method

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Pitfall: Wrong Console Method', () => {
  it('BAD: Spying on wrong method', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    console.error('Error message'); // Using error, not log

    expect(logSpy).toHaveBeenCalled(); // ❌ Fails

    logSpy.mockRestore();
  });

  it('GOOD: Spy on the actual method used', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    console.error('Error message');

    expect(errorSpy).toHaveBeenCalled(); // ✅ Correct method

    errorSpy.mockRestore();
  });
});
```

### Pitfall 4: Not Handling Multiple Arguments

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Pitfall: Multiple Arguments', () => {
  it('BAD: Only checking first argument', () => {
    const spy = vi.spyOn(console, 'log');

    console.log('Error:', 'details', { code: 500 });

    expect(spy).toHaveBeenCalledWith('Error:'); // ❌ Incomplete assertion

    spy.mockRestore();
  });

  it('GOOD: Check all arguments', () => {
    const spy = vi.spyOn(console, 'log');

    console.log('Error:', 'details', { code: 500 });

    expect(spy).toHaveBeenCalledWith('Error:', 'details', { code: 500 }); // ✅ Complete

    spy.mockRestore();
  });
});
```

### Pitfall 5: Type Safety Issues

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Pitfall: Type Safety', () => {
  it('BAD: Losing type information', () => {
    const spy = vi.spyOn(console, 'log');

    console.log({ data: 'value' });

    const firstCall = spy.mock.calls[0]; // any[]
    const obj = firstCall[0]; // any - type safety lost

    expect(obj.data).toBe('value'); // Works but no autocomplete/type checking

    spy.mockRestore();
  });

  it('GOOD: Preserve type information', () => {
    const spy = vi.spyOn(console, 'log');

    console.log({ data: 'value' });

    const firstCallArg = spy.mock.calls[0][0] as { data: string }; // Type assertion

    expect(firstCallArg.data).toBe('value'); // ✅ Type-safe

    spy.mockRestore();
  });
});
```

---

## Advanced Patterns

### Conditional Console Suppression

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Conditional Console Suppression', () => {
  it('should suppress console only during specific test', () => {
    const originalLog = console.log;
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      // Conditionally suppress
      if (args[0] === 'SILENT') {
        return; // Suppress
      }
      // Call original for other messages
      return originalLog(...args);
    });

    console.log('SILENT'); // Suppressed
    console.log('VISIBLE'); // Not suppressed

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
```

### Console Method Chaining Verification

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Console Method Chaining', () => {
  it('should verify sequence of console calls', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate workflow
    console.log('Starting process');
    console.warn('Process taking longer than expected');
    console.log('Process completed');
    console.error('Process failed validation');

    // Verify call sequence
    expect(logSpy).toHaveBeenNthCalledWith(1, 'Starting process');
    expect(warnSpy).toHaveBeenNthCalledWith(1, 'Process taking longer than expected');
    expect(logSpy).toHaveBeenNthCalledWith(2, 'Process completed');
    expect(errorSpy).toHaveBeenNthCalledWith(1, 'Process failed validation');

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
```

### Async Console Testing

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Async Console Testing', () => {
  it('should capture async console calls', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    // Simulate async operation that logs
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('Async operation completed');
        resolve(null);
      }, 100);
    });

    expect(logs).toContain('Async operation completed');
    spy.mockRestore();
  });

  it('should verify console calls in async functions', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    async function failingOperation() {
      console.error('Operation failed');
      throw new Error('Failure');
    }

    await expect(failingOperation()).rejects.toThrow('Failure');
    expect(spy).toHaveBeenCalledWith('Operation failed');

    spy.mockRestore();
  });
});
```

### Testing Console in Event Handlers

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Console in Event Handlers', () => {
  it('should capture console calls from event handlers', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const eventHandler = () => {
      console.log('Event triggered');
    };

    // Simulate event emission
    eventHandler();

    expect(spy).toHaveBeenCalledWith('Event triggered');
    spy.mockRestore();
  });
});
```

---

## Reference Documentation

### Official Vitest Documentation

- **Vitest Mocking Guide**: https://vitest.dev/guide/mocking.html
- **Vitest API Reference (vi)**: https://vitest.dev/api/vi.html
- **Vitest Expect API**: https://vitest.dev/api/expect.html

### Key Vitest Functions

#### `vi.spyOn(object, methodName)`
Creates a spy on a method of an object.

```typescript
const spy = vi.spyOn(console, 'log');
```

#### `mockImplementation(fn)`
Replaces the spied function's implementation.

```typescript
spy.mockImplementation((...args) => {
  // Custom logic
});
```

#### `mockRestore()`
Restores the original implementation.

```typescript
spy.mockRestore();
```

#### `vi.restoreAllMocks()`
Restores all mocks created with `vi.spyOn()`.

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Vitest Expect Matchers for Spies

#### `toHaveBeenCalled()`
Verifies the spy was called.

```typescript
expect(consoleSpy).toHaveBeenCalled();
```

#### `toHaveBeenCalledTimes(count)`
Verifies exact number of calls.

```typescript
expect(consoleSpy).toHaveBeenCalledTimes(3);
```

#### `toHaveBeenCalledWith(...args)`
Verifies the spy was called with specific arguments.

```typescript
expect(consoleSpy).toHaveBeenCalledWith('message', { data: 'value' });
```

#### `toHaveBeenNthCalledWith(n, ...args)`
Verifies the nth call's arguments.

```typescript
expect(consoleSpy).toHaveBeenNthCalledWith(2, 'second message');
```

#### `toHaveBeenLastCalledWith(...args)`
Verifies the most recent call's arguments.

```typescript
expect(consoleSpy).toHaveBeenLastCalledWith('last message');
```

### Mock Properties

#### `mock.calls`
Array of all calls made to the spy.

```typescript
consoleSpy.mock.calls[0]; // First call
consoleSpy.mock.calls[0][0]; // First argument of first call
```

#### `mock.results`
Array of return values from each call.

#### `mock.instances`
Array of instances (for class constructors).

---

## Quick Reference Card

### Basic Setup
```typescript
import { vi, expect, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Common Assertions
```typescript
// Was it called?
expect(console.log).toHaveBeenCalled();

// How many times?
expect(console.log).toHaveBeenCalledTimes(1);

// With what args?
expect(console.log).toHaveBeenCalledWith('message');

// Nth call?
expect(console.log).toHaveBeenNthCalledWith(1, 'first');

// Last call?
expect(console.log).toHaveBeenLastCalledWith('last');
```

### Capturing Output
```typescript
const logs: any[] = [];
vi.spyOn(console, 'log').mockImplementation((...args) => {
  logs.push(...args);
});

// Use captured data
expect(logs).toContain('expected message');
```

---

## Project-Specific Examples

Based on the Groundswell project patterns:

### Testing Workflow Logger

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Workflow } from '../../index.js';

describe('Workflow Logger Console Output', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error when workflow step fails', async () => {
    const workflow = new Workflow({ name: 'TestWorkflow' }, async (ctx) => {
      await ctx.step('failing-step', async () => {
        throw new Error('Step execution failed');
      });
    });

    try {
      await workflow.run();
    } catch (error) {
      // Expected error
    }

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Step execution failed')
    );
  });

  it('should log workflow lifecycle events', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    const workflow = new Workflow({ name: 'TestWorkflow' }, async (ctx) => {
      console.log('Workflow started');
      return 'done';
    });

    await workflow.run();

    expect(logs).toContain('Workflow started');
  });
});
```

### Testing Error State Capture

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Workflow, WorkflowObserver } from '../../index.js';

describe('Error State Console Messages', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorMessages: string[] = [];

  beforeEach(() => {
    errorMessages = [];
    consoleSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errorMessages.push(args.join(' '));
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should capture detailed error information in console', async () => {
    const events: any[] = [];
    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    const workflow = new Workflow(
      { name: 'ErrorCaptureWorkflow' },
      async (ctx) => {
        await ctx.step('step1', async () => {
          throw new Error('Critical error in step1');
        });
      }
    );

    workflow.addObserver(observer);

    try {
      await workflow.run();
    } catch (error) {
      // Expected
    }

    // Verify console was used for error reporting
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(errorMessages.some((msg) => msg.includes('Critical error'))).toBe(true);

    // Verify error event was captured
    const errorEvent = events.find((e) => e.type === 'stepFailed');
    expect(errorEvent).toBeDefined();
  });
});
```

---

## Summary

### Best Practices Recap

1. **Always restore mocks** - Use `afterEach` with `vi.restoreAllMocks()`
2. **Test in isolation** - Each test should have its own spy setup
3. **Be specific** - Use exact argument matching instead of `toHaveBeenCalled()`
4. **Capture when needed** - Store console output for complex assertions
5. **Type safe** - Use TypeScript assertions for better type checking
6. **TDD approach** - Write failing test first, implement, then refactor
7. **Reusable utilities** - Create helper classes for common patterns
8. **Test all console methods** - Don't forget `error`, `warn`, `debug`

### When to Use Console Mocking

- **Error message verification** - Ensure correct error messages are logged
- **Debugging test failures** - Capture console output during test execution
- **Logging behavior** - Verify logging calls without side effects
- **User-facing messages** - Test console output for CLI tools
- **Compliance testing** - Verify required logging is present

### When NOT to Use Console Mocking

- **Production behavior** - Console mocks are for testing only
- **Performance testing** - Mocks add overhead
- **Integration tests** - May interfere with real system behavior
- **Debugging tests** - Suppresses output that helps debugging

---

## Additional Resources

### Testing Best Practices

- **Testing Library**: https://testing-library.com/
- **Vitest Community**: https://vitest.dev/guide/why.html
- **Test Double Patterns**: https://martinfowler.com/bliki/TestDouble.html

### Related Patterns in This Project

- `/plan/docs/research/P1M2T1S4/test_conventions.md` - Project test conventions
- `/src/__tests__/unit/workflow.test.ts` - Workflow testing examples
- `/src/__tests__/adversarial/prd-compliance.test.ts` - Compliance testing patterns

---

*This document is a living resource. Update it with new patterns and lessons learned as the project evolves.*
