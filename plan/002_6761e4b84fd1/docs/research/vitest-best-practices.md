# Vitest Testing Best Practices and Common Test Failure Fixes

> Research file for Vitest testing patterns, debugging techniques, and TypeScript-specific considerations.
> Last updated: 2026-01-24

---

## Table of Contents

1. [Official Vitest Documentation URLs](#official-vitest-documentation-urls)
2. [Vitest CLI Command Patterns and Options](#vitest-cli-command-patterns-and-options)
3. [Common Test Failure Types and Fixes](#common-test-failure-types-and-fixes)
4. [Debugging Failing Tests](#debugging-failing-tests)
5. [TypeScript + Vitest Specific Considerations](#typescript--vitest-specific-considerations)
6. [Test Isolation and Cleanup Patterns](#test-isolation-and-cleanup-patterns)
7. [Mock/vi Usage Best Practices](#mockvi-usage-best-practices)
8. [External Resources and Examples](#external-resources-and-examples)

---

## Official Vitest Documentation URLs

| Section | URL | Description |
|---------|-----|-------------|
| **Getting Started** | https://vitest.dev/guide/ | Main guide and introduction |
| **CLI Options** | https://vitest.dev/guide/cli.html | All command-line flags and options |
| **Config** | https://vitest.dev/config/ | vitest.config.ts configuration options |
| **API Reference** | https://vitest.dev/api/ | Complete API documentation |
| **Debugging** | https://vitest.dev/guide/debugging.html | Debug techniques and tools |
| **Mocking** | https://vitest.dev/guide/mocking.html | Mock functions and modules |
| **Coverage** | https://vitest.dev/guide/coverage.html | Code coverage configuration (c8, istanbul) |
| **UI Mode** | https://vitest.dev/guide/ui.html | Interactive UI for test visualization |
| **Test Context** | https://vitest.dev/advanced/test-context.html | Using test context for fixtures |
| **Workspace Projects** | https://vitest.dev/guide/workspace.html | Monorepo/multi-package testing |
| **Snapshot Testing** | https://vitest.dev/guide/snapshot.html | Inline and file snapshots |
| **Performance** | https://vitest.dev/guide/improving-performance.html | Performance optimization tips |

---

## Vitest CLI Command Patterns and Options

### Basic Commands

```bash
# Run tests in watch mode (default)
vitest

# Run tests once and exit
vitest run

# Run tests in development mode with UI
vitest --ui

# Run tests with coverage report
vitest --coverage

# Run specific test file
vitest path/to/test.test.ts

# Run all tests matching a pattern
vitest test/**/*.test.ts

# Run tests in specific project (monorepo)
vitest --project @my-org/my-package
```

### Filtering and Selection

```bash
# Run tests matching a grep pattern (regex)
vitest --grep "should authenticate"
vitest -g "user.*login"

# Skip tests matching a pattern
vitest --grepInvert "slow"

# Run tests matching a file pattern
vitest --testNamePattern="API"

# Run only tests with .only or fit
vitest run --allowOnly

# Run tests in watch mode for specific file
vitest watch src/auth.test.ts
```

### Reporter Options

```bash
# Verbose output (show all test names and durations)
vitest --reporter=verbose

# Use multiple reporters
vitest --reporter=verbose --reporter=json

# JUnit output for CI
vitest --reporter=junit > results.xml

# Dot reporter (minimal output)
vitest --reporter=dot

# Custom reporter
vitest --reporter=./my-custom-reporter.ts
```

### Debugging Options

```bash
# Enable Node.js inspector (attach debugger)
vitest --inspect
vitest --inspect-brk  # Break on start

# Run in single-threaded mode (easier debugging)
vitest --no-threads

# Disable test isolation (shared global state)
vitest --no-isolate

# Show full error stack traces
vitest --stack-trace=full

# Suppress console output during tests
vitest --silent
```

### TypeScript Configuration

```bash
# Use custom tsconfig
vitest --tsconfig=tsconfig.test.json

# Run type checking alongside tests
vitest --typecheck

# Disable type checking for faster runs
vitest --no-typecheck
```

### Advanced Options

```bash
# Set test timeout (milliseconds)
vitest --test-timeout=10000

# Set hook timeout (beforeAll, beforeEach, etc.)
vitest --hook-timeout=5000

# Retry failing tests
vitest --retry=3

# Run tests in random order (detect coupling)
vitest --sequence.shuffle

# Run tests in specific file order
vitest --sequence.concurrent

# Bail on first test failure
vitest --bail=1

# Maximum number of parallel tests
vitest --max-threads=4
vitest --min-threads=1
```

### Useful npm Script Patterns

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect --no-threads",
    "test:types": "vitest --typecheck",
    "test:watch": "vitest watch",
    "test:file": "vitest run",
    "test:slow": "vitest --grep 'slow' --reporter=verbose",
    "test:fast": "vitest --grepInvert 'slow'"
  }
}
```

---

## Common Test Failure Types and Fixes

### 1. TypeScript Type Errors

**Symptom:** Test file shows red squiggles or `tsc` fails with type errors.

**Common Causes:**
- Missing type definitions for mocks
- Incorrect mock typing
- `vi.mock()` hoisting issues with type imports
- Missing `@types/*` packages

**Fixes:**

```typescript
// ❌ Bad: Untyped mock
const mockFn = vi.fn()
mockFn.mockReturnValue('string') // TypeScript may complain

// ✅ Good: Typed mock function
const mockFn = vi.fn<(arg: string) => number>()
mockFn.mockReturnValue(42)

// ❌ Bad: Unsafe type assertion
import { myModule } from './myModule'
vi.mock('./myModule')
;(myModule.myFunction as any).mockReturnValue('test')

// ✅ Good: Use vi.mocked() for type safety
import { vi } from 'vitest'
import { myModule } from './myModule'
vi.mock('./myModule')
vi.mocked(myModule.myFunction).mockReturnValue('test')

// ❌ Bad: Mock before type import (hoisting issue)
import type { MyType } from './module'
vi.mock('./module')

// ✅ Good: Mock before type import
vi.mock('./module')
import type { MyType } from './module'
```

### 2. Import/Module Resolution Failures

**Symptom:** `Cannot find module` or `SyntaxError: Cannot use import statement outside a module`

**Common Causes:**
- Path aliases not configured in Vitest
- ES modules/CommonJS mismatch
- Missing `vitest.config.ts` configuration

**Fixes:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
})
```

```json
// tsconfig.json - Ensure paths match Vitest config
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@test/*": ["./test/*"],
      "@lib/*": ["./src/lib/*"]
    }
  }
}
```

### 3. Async/Await Test Failures

**Symptom:** Test passes sometimes, fails other times; or timeout errors.

**Common Causes:**
- Missing `await` on promises
- Not returning promises from tests
- Race conditions in async code

**Fixes:**

```typescript
// ❌ Bad: Missing await
test('fetches user data', () => {
  const result = fetchUser(1) // Returns Promise
  expect(result.name).toBe('John') // Fails: result is Promise
})

// ✅ Good: Await the promise
test('fetches user data', async () => {
  const result = await fetchUser(1)
  expect(result.name).toBe('John')
})

// ❌ Bad: Not returning promise
test('callback test', () => {
  fetchData((data) => {
    expect(data).toBeDefined()
  }) // Test finishes before callback runs
})

// ✅ Good: Return promise or use done callback
test('callback test', (done) => {
  fetchData((data) => {
    expect(data).toBeDefined()
    done() // Signal test completion
  })
})

// ❌ Bad: Not waiting for async setup
beforeEach(() => {
  setupDatabase()
})

test('query test', async () => {
  const result = await db.query('SELECT * FROM users')
  // May fail if setupDatabase hasn't finished
})

// ✅ Good: Await setup or use async beforeEach
beforeEach(async () => {
  await setupDatabase()
})

test('query test', async () => {
  const result = await db.query('SELECT * FROM users')
  expect(result).toBeDefined()
})
```

### 4. Mock Not Being Called

**Symptom:** `expect(mockFn).toHaveBeenCalled()` fails even though code path should call it.

**Common Causes:**
- Module was imported before `vi.mock()` (hoisting issue)
- Mock implementation is wrong
- Spy on method that wasn't properly bound

**Fixes:**

```typescript
// ❌ Bad: Regular import before mock
import { fetchData } from './api'
vi.mock('./api', () => ({
  fetchData: vi.fn()
}))

// ✅ Good: vi.mock must come before imports
vi.mock('./api', () => ({
  fetchData: vi.fn()
}))
import { fetchData } from './api'

// ✅ Also Good: Use vi.doMock for dynamic mocks
import { vi } from 'vitest'
const { fetchData } = await vi.importMock('./api')

// ❌ Bad: Spy on prototype, not instance
class MyClass {
  method() { return 'value' }
}
const spy = vi.spyOn(MyClass.prototype, 'method')
const instance = new MyClass()
expect(spy).toHaveBeenCalled() // May fail

// ✅ Good: Spy on instance method
const instance = new MyClass()
const spy = vi.spyOn(instance, 'method')
instance.method()
expect(spy).toHaveBeenCalled()
```

### 5. Test Isolation Failures

**Symptom:** Tests pass individually but fail when run together; or tests depend on run order.

**Common Causes:**
- Shared mutable state between tests
- Mocks not restored between tests
- Global state pollution (process.env, global variables)

**Fixes:**

```typescript
// ❌ Bad: Shared state, no cleanup
let counter = 0

test('increment', () => {
  counter++
  expect(counter).toBe(1)
})

test('increment again', () => {
  counter++ // counter is already 1 from previous test!
  expect(counter).toBe(2) // Would fail if run alone
})

// ✅ Good: Reset state in beforeEach
let counter = 0

beforeEach(() => {
  counter = 0
})

test('increment', () => {
  counter++
  expect(counter).toBe(1)
})

test('increment again', () => {
  counter++
  expect(counter).toBe(1)
})

// ✅ Good: Always restore environment
const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

test('with API key', () => {
  process.env.API_KEY = 'test'
  expect(callAPI()).toBeDefined()
})

test('without API key', () => {
  expect(process.env.API_KEY).toBeUndefined() // Would fail without restore
})
```

### 6. Timer/Timeout Related Failures

**Symptom:** `Timeout of 5000ms exceeded` or tests fail intermittently with timing issues.

**Common Causes:**
- Async operations not properly awaited
- Real timers in tests causing delays
- SetTimeout/setInterval not mocked

**Fixes:**

```typescript
// ❌ Bad: Using real timers (slow)
test('debounce', async () => {
  const fn = vi.fn()
  const debounced = debounce(fn, 1000)
  debounced()
  await waitFor(() => expect(fn).toHaveBeenCalled()) // Waits 1 second!
})

// ✅ Good: Use fake timers
test('debounce', () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const debounced = debounce(fn, 1000)
  debounced()
  vi.advanceTimersByTime(1000)
  expect(fn).toHaveBeenCalled()
  vi.useRealTimers()
})

// ✅ Good: Cleanup fake timers
afterEach(() => {
  vi.useRealTimers()
})

test('with fake timers', () => {
  vi.useFakeTimers()
  // ... test code ...
})

// ❌ Bad: Not advancing timers enough
vi.advanceTimersByTime(100) // Only advances 100ms

// ✅ Good: Advance past all timers
vi.runAllTimers() // Run all pending timers
vi.runOnlyPendingTimers() // Run current timers only
vi.advanceTimersByTimeAsync(1000) // For async timers
```

### 7. Snapshot Mismatches

**Symptom:** Snapshot tests fail after legitimate code changes.

**Fixes:**

```bash
# Update all snapshots
vitest -u

# Update snapshots for specific file
vitest -u path/to/test.test.ts

# Review snapshot changes interactively
vitest -u --interactive

# Update inline snapshots
vitest --update-inline
```

```typescript
// Use matchers to make snapshots more resilient
expect({ id: 123, name: 'Test', timestamp: Date.now() })
  .toMatchSnapshot({
    id: expect.any(Number),
    timestamp: expect.any(Number),
  })

// Use property matchers
expect({
  user: { id: 1, name: 'John', createdAt: 1234567890 }
}).toMatchSnapshot({
  user: {
    id: expect.any(Number),
    createdAt: expect.any(Number)
  }
})
```

### 8. Coverage Configuration Issues

**Symptom:** Coverage not showing for certain files or incorrect percentages.

**Fixes:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/mocks/**',
        'node_modules/**',
      ],
      // Thresholds
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      // Ignore specific files
      ignoreUnused: true,
    },
  },
})
```

---

## Debugging Failing Tests

### Using --inspect for Node.js Debugger

```bash
# Start Vitest with inspector enabled
vitest --inspect
vitest --inspect-brk  # Break on start

# With no threads for easier debugging
vitest --inspect --no-threads

# In VS Code, create .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--inspect-brk", "--no-threads"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Using Verbose Reporter

```bash
# Show detailed test output
vitest --reporter=verbose

# Combine with filtering
vitest --reporter=verbose --grep="failing test name"

# Multiple reporters for different outputs
vitest --reporter=verbose --reporter=json > results.json
```

### Using test.only for Isolation

```typescript
// Run only this test
test.only('failing test', () => {
  // Debug this test in isolation
})

// Run only this suite
describe.only('failing suite', () => {
  test('test 1', () => {})
  test('test 2', () => {})
})

// Skip other tests
test.skip('this test is skipped', () => {})
```

### Using Console Output

```typescript
test('debug test', () => {
  console.log('Current state:', someVariable)
  console.table(arrayData)
  console.dir(complexObject, { depth: null })
  debugger // Breaks in --inspect mode
})
```

### Using Vitest UI

```bash
# Start UI mode
vitest --ui

# Open browser to http://localhost:51204/__vitest__/
# See test results visually, click to inspect failures
```

### Using Trace Debugging

```bash
# Enable tracing for detailed execution info
NODE_OPTIONS="--trace-warnings" vitest run

# See test file resolution
vitest --debug

# Show test execution order
vitest --sequence.shuffle --sequence.random-seed=123
```

### Debug Checklist

When a test fails, follow this debugging process:

1. **Run the test in isolation:**
   ```bash
   vitest run path/to/test.test.ts
   ```

2. **Check the actual vs expected output:**
   ```bash
   vitest run --reporter=verbose
   ```

3. **Add logging to understand the state:**
   ```typescript
   test('failing test', () => {
     console.log('Input:', input)
     console.log('Expected:', expected)
     console.log('Received:', received)
   })
   ```

4. **Use `test.only` to isolate the specific test:**
   ```typescript
   test.only('failing test', () => {})
   ```

5. **Check for test isolation issues:**
   - Run tests in random order: `vitest --sequence.shuffle`
   - Run with `--no-isolate` to see if state is shared

6. **Use the debugger:**
   ```bash
   vitest --inspect --no-threads --run path/to/test.test.ts
   ```

---

## TypeScript + Vitest Specific Considerations

### Type-Safe Mocks with vi.mocked()

```typescript
// Instead of unsafe type assertions:
import { api } from './api'
vi.mock('./api')
;(api.fetch as any).mockResolvedValue({ data: 'test' })

// Use vi.mocked() for type safety:
import { api } from './api'
vi.mock('./api')
vi.mocked(api.fetch).mockResolvedValue({ data: 'test' })
```

### Mocking with Proper Types

```typescript
// Define mock function with type signature
const mockCallback = vi.fn<(value: number) => void>()

// Mock with return type
const mockAsync = vi.fn<() => Promise<string>>()
mockAsync.mockResolvedValue('result')

// Mock object methods
import { MyClass } from './my-class'
const mockMethod = vi.spyOn(MyClass.prototype, 'method')
mockMethod.mockImplementation((arg) => arg.toUpperCase())
```

### vi.importMock for Dynamic Imports

```typescript
// For dynamic imports or conditional mocking
test('dynamic mock', async () => {
  const mock = await vi.importMock('./module')
  mock.defaultFunction.mockReturnValue('test')
  // Use the mock
})
```

### Type Checking Alongside Tests

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json',
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    },
  },
})
```

### Generic Test Utilities with Types

```typescript
// test-utils.ts
export function createMock<T extends object>(obj: T): Mocked<T> {
  return vi.mocked(obj)
}

export type Mocked<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? vi.Mock<ReturnType<T[P]>, T[P]>
    : T[P]
}

// Usage
const mockDb = createMock<Database>({
  query: vi.fn(),
  close: vi.fn(),
})
```

---

## Test Isolation and Cleanup Patterns

### The Golden Rule: afterEach Cleanup

```typescript
import { vi, afterEach, beforeEach, describe, test, expect } from 'vitest'

describe('Test Suite with Cleanup', () => {
  afterEach(() => {
    vi.restoreAllMocks() // Always restore mocks
    vi.clearAllMocks()   // Clear mock call history
  })

  test('test 1', () => {
    const mockFn = vi.fn()
    mockFn('call')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('test 2', () => {
    const mockFn = vi.fn()
    // Starts fresh - no calls from test 1
    expect(mockFn).not.toHaveBeenCalled()
  })
})
```

### Environment Variable Cleanup

```typescript
const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

test('with env var', () => {
  process.env.API_KEY = 'test'
  expect(process.env.API_KEY).toBe('test')
})

test('without env var', () => {
  expect(process.env.API_KEY).toBeUndefined() // Clean slate
})
```

### Timer Cleanup

```typescript
afterEach(() => {
  vi.useRealTimers() // Always restore real timers
})

test('with fake timers', () => {
  vi.useFakeTimers()
  // ... test code ...
})
```

### Stubbed Global Cleanup

```typescript
const originalLocation = global.location

afterEach(() => {
  global.location = originalLocation
})

test('with location stub', () => {
  global.location = { href: 'https://example.com' } as any
  expect(global.location.href).toBe('https://example.com')
})
```

### Database/File System Cleanup

```typescript
import { Database } from './db'

describe('Database Tests', () => {
  let db: Database

  beforeEach(async () => {
    db = new Database(':memory:')
    await db.migrate()
  })

  afterEach(async () => {
    await db.close()
  })

  test('query works', async () => {
    const result = await db.query('SELECT 1')
    expect(result).toBeDefined()
  })
})
```

### Global Setup/Teardown

```typescript
// vitest.setup.ts
import { vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    isolate: true, // Ensure test isolation
  },
})
```

---

## Mock/vi Usage Best Practices

### Mock Functions (vi.fn)

```typescript
// Basic mock
const mockFn = vi.fn()

// Typed mock
const mockFn = vi.fn<(arg: string) => number>()

// Mock with implementation
const mockFn = vi.fn((x: number) => x * 2)

// Mock with return value
const mockFn = vi.fn()
mockFn.mockReturnValue(42)

// Mock with resolved value (Promises)
const mockAsync = vi.fn()
mockAsync.mockResolvedValue({ data: 'test' })

// Mock with rejected value
const mockError = vi.fn()
mockError.mockRejectedValue(new Error('API Error'))

// Mock implementation per call
mockFn
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValue(3) // All subsequent calls
```

### Mocking Modules (vi.mock)

```typescript
// Mock an entire module
vi.mock('./api', () => ({
  fetchUsers: vi.fn(() => Promise.resolve([])),
  createUser: vi.fn(),
}))

// Mock with factory (access to imports)
vi.mock('./dependency', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    specificFunction: vi.fn(() => 'mocked'),
  }
})

// Partial mocking (keep some real functions)
vi.mock('./utils', () => ({
  ...vi.importActual('./utils'),
  expensiveFunction: vi.fn(() => 'cheap result'),
}))
```

### Spying (vi.spyOn)

```typescript
import { MyClass } from './my-class'

// Spy on object method
const obj = { method: () => 'real' }
const spy = vi.spyOn(obj, 'method')
spy.mockReturnValue('mocked')

// Spy on class prototype
const classSpy = vi.spyOn(MyClass.prototype, 'method')

// Spy on getter/setter
const getterSpy = vi.spyOn(obj, 'propertyName', 'get')

// Restore original
spy.mockRestore()
```

### Mock Implementations

```typescript
const mockFn = vi.fn()

// Simple implementation
mockFn.mockImplementation((x) => x * 2)

// Async implementation
mockFn.mockImplementation(async (url) => {
  const response = await fetch(url)
  return response.json()
})

// Implementation per call
mockFn
  .mockImplementationOnce(() => 'first')
  .mockImplementationOnce(() => 'second')
  .mockImplementation(() => 'default')

// Reset implementation
mockFn.mockReset() // Clears mock data and implementation
mockFn.mockRestore() // Restores original (for spies)
```

### Testing Mock Calls

```typescript
const mockFn = vi.fn()

mockFn('hello', 123)

// Check if called
expect(mockFn).toHaveBeenCalled()

// Check call count
expect(mockFn).toHaveBeenCalledTimes(1)

// Check called with specific args
expect(mockFn).toHaveBeenCalledWith('hello', 123)

// Check last call
expect(mockFn).toHaveBeenLastCalledWith('hello', 123)

// Check nth call
expect(mockFn).toHaveBeenNthCalledWith(1, 'hello', 123)

// Check calls with matchers
expect(mockFn).toHaveBeenCalledWith(
  expect.any(String),
  expect.any(Number)
)

// Check mock calls array
expect(mockFn.mock.calls).toEqual([['hello', 123]])
expect(mockFn.mock.calls[0][0]).toBe('hello')
```

### Mock Timing Control

```typescript
vi.useFakeTimers()

test('delayed execution', () => {
  const mockFn = vi.fn()
  setTimeout(mockFn, 1000)

  // Fast-forward time
  vi.advanceTimersByTime(1000)
  expect(mockFn).toHaveBeenCalled()

  // Run all pending timers
  vi.runAllTimers()

  // Run only current timers
  vi.runOnlyPendingTimers()

  // For async timers
  vi.advanceTimersByTimeAsync(1000)
})
```

---

## External Resources and Examples

### Official Resources

| Resource | URL |
|----------|-----|
| Vitest GitHub | https://github.com/vitest-dev/vitest |
| Vitest Discord | https://chat.vitest.dev |
| Vitest Twitter | https://twitter.com/vitest_dev |

### Learning Resources

| Resource | URL |
|----------|-----|
| Vitest Tutorial | https://vitest.dev/guide/ |
| Testing Library + Vitest | https://testing-library.com/docs/vitest-example-intro |
| Vitest + Vue Testing | https://vuejs.org/guide/scaling-up/testing.html#vitest |
| Vitest + React Testing | https://react.dev/learn/writing-tests |
| Vitest + Solid Testing | https://www.solidjs.com/guides/testing |

### Common Pitfalls and Solutions

1. **"Cannot find module" errors**
   - Solution: Configure `resolve.alias` in `vitest.config.ts`
   - Link: https://vitest.dev/config/#resolve

2. **"vi.mock is not a function" errors**
   - Solution: Ensure `vi` is imported from `vitest`
   - Link: https://vitest.dev/api/#vi-mock

3. **"SyntaxError: Cannot use import statement"**
   - Solution: Check ESM/CommonJS compatibility, use `transformMode` in config
   - Link: https://vitest.dev/config/#transformmode

4. **Tests hanging indefinitely**
   - Solution: Check for unhandled promises, use `--no-threads` for debugging
   - Link: https://vitest.dev/guide/debugging.html

### Best Practices Articles

- **Vitest Best Practices**: https://vitest.dev/guide/why.html (Why Vitest)
- **Testing Best Practices (Testing Library)**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Mock Best Practices**: https://vitest.dev/guide/mocking.html
- **Test Isolation**: https://vitest.dev/config/#isolate

---

## Quick Reference: Common Test Fixes

| Problem | Fix |
|---------|-----|
| Test passes alone but fails in suite | Check test isolation, add cleanup in `afterEach` |
| Type errors in tests | Use `vi.mocked()`, add proper types to `vi.fn<type>()` |
| Async tests failing | Add `async` to test function, use `await` |
| Mock not being called | Check `vi.mock()` hoisting, use `vi.spyOn()` |
| Tests timing out | Check for unhandled promises, use fake timers |
| Snapshot failures | Run `vitest -u`, use property matchers |
| Module not found | Configure `resolve.alias` in vitest.config.ts |
| Tests depend on run order | Enable `--sequence.shuffle`, add proper cleanup |

---

## Command-Line Cheatsheet

```bash
# Essential Commands
vitest                    # Watch mode
vitest run                # Run once
vitest --ui               # UI mode
vitest --coverage         # Coverage report
vitest -u                 # Update snapshots

# Filtering
vitest --grep "pattern"   # Run matching tests
vitest test/file.test.ts  # Run specific file

# Debugging
vitest --reporter=verbose # Detailed output
vitest --inspect          # Enable debugger
vitest --no-threads       # Single-threaded (easier debug)
vitest --no-isolate       # Share global state (debugging)

# Testing
vitest --bail=1           # Stop on first failure
vitest --retry=3          # Retry failing tests
vitest --sequence.shuffle # Randomize test order
```

---

*This research file documents Vitest testing best practices as of January 2026. For the most current information, always refer to the official Vitest documentation at https://vitest.dev*
