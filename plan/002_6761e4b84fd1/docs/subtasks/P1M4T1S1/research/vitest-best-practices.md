# Vitest Testing Best Practices and Common Failures

**Date**: 2026-01-24
**Context**: PRP for P1.M4.T1.S1 - Run unit tests and fix failures
**Researched By**: Research Agent

---

## Table of Contents

1. [Official Vitest Documentation URLs](#official-vitest-documentation-urls)
2. [Vitest CLI Command Patterns](#vitest-cli-command-patterns)
3. [Common Test Failure Types and Fixes](#common-test-failure-types-and-fixes)
4. [Debugging Failing Tests](#debugging-failing-tests)
5. [TypeScript + Vitest Specific Considerations](#typescript--vitest-specific-considerations)
6. [Test Isolation and Cleanup Patterns](#test-isolation-and-cleanup-patterns)
7. [Mock/vi Usage Best Practices](#mockvi-usage-best-practices)
8. [External Resources](#external-resources)

---

## Official Vitest Documentation URLs

### Core Documentation

- **Main Documentation**: https://vitest.dev
- **Getting Started**: https://vitest.dev/guide/
- **CLI Reference**: https://vitest.dev/guide/cli.html
- **Config Reference**: https://vitest.dev/config/
- **API Reference**: https://vitest.dev/api/

### Testing Features

- **Test Context API**: https://vitest.dev/api/context.html
- **Expect API**: https://vitest.dev/api/expect.html
- **Mock Functions**: https://vitest.dev/api/mock.html
- **Vi Utility Functions**: https://vitest.dev/api/vi.html
- **Snapshot Testing**: https://vitest.dev/guide/snapshot.html

### Advanced Topics

- **Debugging**: https://vitest.dev/guide/debugging.html
- **Coverage**: https://vitest.dev/guide/coverage.html
- **UI Mode**: https://vitest.dev/guide/ui.html
- **Workspace Projects**: https://vitest.dev/guide/workspace.html
- **Performance**: https://vitest.dev/guide/improving-performance.html

---

## Vitest CLI Command Patterns

### Basic Commands

```bash
# Run all tests once
vitest run

# Run tests in watch mode
vitest

# Run tests with UI
vitest --ui

# Run tests with coverage
vitest --coverage

# Run specific test file
vitest run path/to/test.test.ts

# Run tests matching pattern
vitest run --grep "test name pattern"
```

### Filtering Options

```bash
# Run tests matching regex pattern
vitest run --grep "should return success"

# Exclude tests matching pattern
vitest run --grepInvert "slow"

# Run tests in specific file
vitest run agent-response.test.ts

# Run tests in specific directory
vitest run src/__tests__/unit/
```

### Reporter Options

```bash
# Verbose output
vitest run --reporter=verbose

# JSON output
vitest run --reporter=json

# JUnit format for CI
vitest run --reporter=junit

# Dot reporter (minimal output)
vitest run --reporter=dot

# Multiple reporters
vitest run --reporter=verbose --reporter=json
```

### Debugging Options

```bash
# Enable Node.js inspector
vitest --inspect

# Enable inspector with breakpoint
vitest --inspect-brk

# Run single-threaded (easier debugging)
vitest --no-threads

# Disable isolation (easier debugging)
vitest --no-isolate

# Toggle console output
vitest --silent
```

### TypeScript Options

```bash
# Use specific tsconfig
vitest --tsconfig path/to/tsconfig.json

# Enable type checking alongside tests
vitest --typecheck
```

### Advanced Options

```bash
# Set test timeout (ms)
vitest --test-timeout=10000

# Retry failed tests
vitest --retry=3

# Shuffle test order
vitest --shuffle

# Bail after first failure
vitest --bail=1

# Parallel execution
vitest --threads
vitest --no-threads  # Single-threaded
```

---

## Common Test Failure Types and Fixes

### 1. TypeScript Type Errors in Tests

**Symptom**:
```
TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Fix**: Use type-safe mock functions

```typescript
// ❌ Wrong - no type safety
const mockFn = vi.fn();

// ✅ Correct - typed mock function
const mockFn = vi.fn<(arg: string) => number>();

// ✅ Correct - use vi.mocked for type-safe mocking
import { myModule } from './myModule.js';
vi.mocked(myModule.myMethod).mockReturnValue('test');
```

**Reference**: https://vitest.dev/api/vi.html#vimocked

### 2. Module Resolution Failures

**Symptom**:
```
Error: Cannot find module './myModule' or its corresponding type declarations
```

**Fix**: Configure `resolve.alias` in vitest.config.ts

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Reference**: https://vitest.dev/config/#resolve-alias

### 3. Async/Await Failures

**Symptom**: Test passes but should fail, or hangs indefinitely

**Fix**: Always use `async` and `await` promises

```typescript
// ❌ Wrong - missing await
it('should fetch data', () => {
  const result = fetchData(); // Returns Promise
  expect(result).toBe('data'); // Test passes immediately
});

// ✅ Correct - await the promise
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBe('data');
});
```

### 4. Mock Not Called

**Symptom**:
```
expect(spy).toHaveBeenCalled() - Expected number of calls: >= 1, received: 0
```

**Fix**: Check mock hoisting order, use `vi.spyOn()`

```typescript
// ❌ Wrong - mock defined after import
import { myFunction } from './module.js';
vi.mock('./module.js'); // Too late - already imported

// ✅ Correct - mock defined before import
vi.mock('./module.js', () => ({
  myFunction: vi.fn(),
}));
import { myFunction } from './module.js';

// ✅ Correct - use spyOn for existing methods
const spy = vi.spyOn(myModule, 'myMethod');
```

**Reference**: https://vitest.dev/api/vi.html#vispyon

### 5. Test Isolation Issues

**Symptom**: Tests pass individually but fail when run together

**Fix**: Add proper cleanup in `afterEach`

```typescript
describe('Feature', () => {
  afterEach(() => {
    vi.restoreAllMocks(); // CRITICAL: Restore all mocks
    vi.clearAllMocks();   // Clear mock call history
  });

  it('test one', () => {
    const mock = vi.fn();
    // ...
  });

  it('test two', () => {
    // Fresh state, no interference from test one
  });
});
```

### 6. Timer/Timeout Issues

**Symptom**: Tests timeout or timers don't work as expected

**Fix**: Use fake timers

```typescript
describe('Feature with timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers(); // CRITICAL: Restore real timers
  });

  it('should timeout after 1 second', () => {
    const callback = vi.fn();
    setTimeout(callback, 1000);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalled();
  });
});
```

**Reference**: https://vitest.dev/api/vi.html#viusefaketimers

### 7. Snapshot Mismatches

**Symptom**:
```
Error: Snapshot mismatched
- Expected
+ Received
```

**Fix**: Update snapshots or use property matchers

```typescript
// Update snapshot (use with caution!)
vitest run -u

// Or use property matchers for dynamic values
expect(obj).toMatchSnapshot({
  id: expect.any(String),  // Match any string
  timestamp: expect.any(Number),
});
```

**Reference**: https://vitest.dev/guide/snapshot.html

### 8. Coverage Issues

**Symptom**: Low coverage or missing files

**Fix**: Configure include/exclude patterns

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**'],
    },
  },
});
```

---

## Debugging Failing Tests

### Using --inspect with Node.js Debugger

```bash
# Start debugger and break on first line
vitest --inspect-brk

# Then in Chrome: chrome://inspect
# Click "inspect" on the Node.js target
```

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Using Verbose Reporter

```bash
vitest run --reporter=verbose
```

Shows detailed output including:
- Full test names
- Error stack traces
- Assertion details
- Console output

### Isolating Failing Tests

```typescript
// Use .only to run only this test
it.only('should do something', () => {
  // Only this test runs
});

// Use .skip to skip a test
it.skip('flaky test', () => {
  // This test is skipped
});
```

### Console Debugging

```typescript
it('should debug', () => {
  const result = complexOperation();

  console.log('Result:', result);
  console.table(result);
  console.dir(result, { depth: null });

  expect(result).toBeDefined();
});
```

### Vitest UI for Visual Debugging

```bash
vitest --ui
```

Opens browser interface with:
- Visual test tree
- Click to run specific tests
- View code coverage
- Inspect console output

---

## TypeScript + Vitest Specific Considerations

### Type-Safe Mocks with vi.mocked<T>()

```typescript
import { myModule } from './myModule.js';

// Create type-safe mock
const mock = vi.mocked(myModule);

// Now TypeScript knows the types
mock.myMethod.mockReturnValue('test');

// Type-safe access to mock calls
expect(mock.myMethod.mock.calls[0][0]).toBe('arg');
```

**Reference**: https://vitest.dev/api/vi.html#vimocked

### Properly Typed Mock Functions

```typescript
// Define the mock function signature
const mockFn = vi.fn<(arg1: string, arg2: number) => boolean>();

// TypeScript will enforce correct return type
mockFn.mockReturnValue(true);

// Type-safe assertions
expect(mockFn.mock.calls[0]).toEqual(['test', 42]);
```

### Dynamic Import Mocking

```typescript
// Mock dynamic imports
vi.mock('./dynamic-module.js', () => ({
  loadModule: vi.fn(() => Promise.resolve({ default: 'mocked' })),
}));
```

### Type Checking Alongside Tests

```bash
# Run type checking with tests
vitest --typecheck

# Or separately
tsc --noEmit
vitest run
```

### Generic Test Utilities with Types

```typescript
function createTestResponse<T>(data: T): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: { agentId: 'test', timestamp: Date.now(), duration: 0 },
  };
}

// TypeScript infers T from usage
const response = createTestResponse({ result: 'test' });
// response.data is typed as { result: string }
```

---

## Test Isolation and Cleanup Patterns

### The Golden Rule: afterEach Cleanup

```typescript
describe('Feature', () => {
  afterEach(() => {
    vi.restoreAllMocks(); // CRITICAL: Always restore mocks
  });

  it('test 1', () => {
    const mock = vi.fn();
    // ...
  });

  it('test 2', () => {
    // Clean state, no interference
  });
});
```

### Environment Variable Cleanup

```typescript
const originalEnv = process.env;

describe('Feature with env vars', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should use env var', () => {
    process.env.MY_VAR = 'test';
    expect(process.env.MY_VAR).toBe('test');
  });
});
```

### Timer Cleanup

```typescript
describe('Feature with timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers(); // CRITICAL: Always restore
  });

  it('should use fake timers', () => {
    // ...
  });
});
```

### Database/File System Cleanup

```typescript
describe('Feature with file system', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    // Clean up temp files
    tempFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    tempFiles.length = 0;
  });

  it('should create temp file', () => {
    const file = `/tmp/test-${Date.now()}.txt`;
    tempFiles.push(file);
    fs.writeFileSync(file, 'test');
    expect(fs.existsSync(file)).toBe(true);
  });
});
```

### Global Setup/Teardown

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    teardownFiles: ['./test/teardown.ts'],
  },
});
```

---

## Mock/vi Usage Best Practices

### vi.fn() - Creating Mock Functions

```typescript
// Simple mock
const mock = vi.fn();

// Typed mock
const mock = vi.fn<(arg: string) => number>();

// Mock with implementation
const mock = vi.fn((arg: string) => arg.length);

// Mock with return value
mock.mockReturnValue(42);
mock.mockResolvedValue('async result');
mock.mockRejectedValue(new Error('error'));
```

**Reference**: https://vitest.dev/api/vi.html#vifn

### vi.mock() - Module Mocking

```typescript
// Mock entire module
vi.mock('./module.js', () => ({
  myFunction: vi.fn(),
  myValue: 42,
}));

// Mock with partial implementation
vi.mock('./module.js', () => ({
  ...vi.importActual('./module.js'),
  myFunction: vi.fn(),
}));
```

### vi.spyOn() - Spying on Methods

```typescript
// Spy on object method
const spy = vi.spyOn(myObj, 'myMethod');

// Spy and replace implementation
const spy = vi.spyOn(myObj, 'myMethod').mockReturnValue('test');

// Restore original
spy.mockRestore();
```

**Reference**: https://vitest.dev/api/vi.html#vispyon

### Mock Implementations

```typescript
const mock = vi.fn();

// Return value
mock.mockReturnValue(42);

// Return values in sequence
mock.mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValue(3);

// Async return value
mock.mockResolvedValue('async result');

// Custom implementation
mock.mockImplementation((arg) => arg * 2);

// Return based on arguments
mock.mockImplementation((arg) => {
  if (arg === 'special') return 'special value';
  return 'default';
});
```

### Testing Mock Calls

```typescript
const mock = vi.fn();

mock('arg1', 'arg2');
mock('arg3');

// Number of calls
expect(mock).toHaveBeenCalledTimes(2);

// Called with specific arguments
expect(mock).toHaveBeenCalledWith('arg1', 'arg2');

// Last call
expect(mock).toHaveBeenLastCalledWith('arg3');

// Call arguments
expect(mock.mock.calls[0]).toEqual(['arg1', 'arg2']);

// Called with matcher
expect(mock).toHaveBeenCalledWith(expect.any(String), expect.anything());
```

### Timer Control

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should handle timeouts', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});

it('should handle intervals', () => {
  const callback = vi.fn();
  setInterval(callback, 100);

  vi.advanceTimersByTime(500);
  expect(callback).toHaveBeenCalledTimes(5);
});

it('should run all timers', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);
  setTimeout(callback, 2000);

  vi.runAllTimers();
  expect(callback).toHaveBeenCalledTimes(2);
});
```

---

## External Resources

### Official Resources

- **Vitest GitHub**: https://github.com/vitest-dev/vitest
- **Vitest Discord**: https://chat.vitest.dev
- **Report Issues**: https://github.com/vitest-dev/vitest/issues

### Framework-Specific Guides

- **Testing Library + Vitest**: https://testing-library.com/docs/vitest-testing-library/intro/
- **Vue + Vitest**: https://vitest.dev/guide/#vue
- **React + Vitest**: https://vitest.dev/guide/#react
- **Solid + Vitest**: https://vitest.dev/guide/#solid

### Common Pitfalls and Solutions

1. **Async Test Timeouts**: Always use `async`/`await`
2. **Mock Leaks**: Always use `afterEach(() => vi.restoreAllMocks())`
3. **Timer Issues**: Use fake timers consistently
4. **Module Resolution**: Configure aliases properly
5. **Type Errors**: Use `vi.mocked()` for type-safe mocking

---

## Quick Reference Cheatsheet

### Running Tests

| Command | Purpose |
|---------|---------|
| `vitest run` | Run all tests once |
| `vitest` | Watch mode |
| `vitest --ui` | UI mode |
| `vitest --coverage` | With coverage |
| `vitest run <file>` | Run specific file |
| `vitest run --grep <pattern>` | Run matching tests |

### Filtering Tests

| Command | Purpose |
|---------|---------|
| `--grep "pattern"` | Run tests matching pattern |
| `--grepInvert "pattern"` | Exclude tests matching pattern |
| `vitest run <file>` | Run specific file |
| `vitest run src/__tests__/unit/` | Run directory |

### Debugging

| Command | Purpose |
|---------|---------|
| `--inspect` | Enable Node inspector |
| `--inspect-brk` | Break on first line |
| `--no-threads` | Single-threaded mode |
| `--no-isolate` | Disable test isolation |
| `--reporter=verbose` | Verbose output |
| `.only` | Run only this test |
| `.skip` | Skip this test |

### Configuration

| Command | Purpose |
|---------|---------|
| `--tsconfig <path>` | Use specific tsconfig |
| `--typecheck` | Enable type checking |
| `--test-timeout <ms>` | Set test timeout |
| `--retry <n>` | Retry failed tests |
| `--shuffle` | Shuffle test order |
| `--bail=<n>` | Stop after N failures |
