# Test Maintenance Research: Best Practices After Bug Fixes

**Research Date:** 2026-01-12
**Context:** P1M4T1S2 - Test Maintenance and Bug Fix Validation
**Project:** Groundswell

## Table of Contents
1. [Vitest Best Practices](#vitest-best-practices)
2. [Test Maintenance After Bug Fixes](#test-maintenance-after-bug-fixes)
3. [Common Test Failure Patterns](#common-test-failure-patterns)
4. [Test Debugging Strategies](#test-debugging-strategies)
5. [Decision Framework: Test vs Implementation](#decision-framework)
6. [Resources and References](#resources-and-references)

---

## 1. Vitest Best Practices

### 1.1 Debugging Failing Tests

#### Running Specific Tests
```bash
# Run a specific test file
vitest run path/to/test.ts

# Run tests matching a pattern
vitest run --testNamePattern="should validate"

# Run only failed tests from last run
vitest run --reporter=verbose --bail 1
```

#### Using Vitest UI
```bash
# Start Vitest UI for interactive debugging
vitest --ui

# UI with coverage
vitest --ui --coverage
```

#### Debug Mode
```bash
# Run with Node.js debugger
vitest --inspect-brk --no-coverage

# Run single test in debug mode
vitest run --inspect-brk path/to/test.ts
```

#### Watch Mode for Iterative Debugging
```bash
# Watch mode with file filtering
vitest --watch path/to/test.ts

# Watch mode that runs only changed tests
vitest --watch --changed
```

**Best Practice:** Always use watch mode during development to get immediate feedback on test changes.

### 1.2 Understanding Test Failure Patterns

#### Common Failure Types

1. **Assertion Failures**
   - Expected vs actual values don't match
   - Usually indicates logic errors or incorrect expectations
   - Example: `expect(actual).toBe(expected)`

2. **Timeout Errors**
   - Test exceeds default timeout (5000ms)
   - Often caused by:
     - Infinite loops
     - Unresolved promises
     - Missing async/await
     - Slow operations

3. **Mock/Vi Failures**
   - Mock not called
   - Wrong arguments passed to mock
   - Mock not properly restored

4. **Type Errors**
   - TypeScript compilation issues
   - Type mismatches in tests
   - Missing type definitions

### 1.3 Common Pitfalls and How to Avoid Them

#### Pitfall 1: Testing Implementation Details
**Problem:** Tests break when implementation changes without behavior change.

**Solution:**
```typescript
// ❌ Bad - Tests implementation
expect(userService.fetchUsers).toHaveBeenCalledWith('/api/users')

// ✅ Good - Tests behavior
await expect(userService.getUsers()).resolves.toEqual(expectedUsers)
```

#### Pitfall 2: Not Cleaning Up Mocks
**Problem:** Mocks leak between tests causing flaky behavior.

**Solution:**
```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

#### Pitfall 3: Improper Async Handling
**Problem:** Tests pass when they should fail or vice versa.

**Solution:**
```typescript
// ❌ Bad - Doesn't wait for promise
test('async test', () => {
  fetchData().then(data => {
    expect(data).toBe('value')
  })
})

// ✅ Good - Proper async handling
test('async test', async () => {
  const data = await fetchData()
  expect(data).toBe('value')
})

// ✅ Also Good - Using promises
test('async test', () => {
  return expect(fetchData()).resolves.toBe('value')
})
```

#### Pitfall 4: Brittle Assertions
**Problem:** Tests break due to unrelated changes.

**Solution:**
```typescript
// ❌ Bad - Too specific
expect(result).toEqual({
  id: 1,
  name: 'Test',
  createdAt: '2025-01-12T10:00:00.000Z'
})

// ✅ Good - Focused on what matters
expect(result).toEqual({
  id: expect.any(Number),
  name: 'Test',
  createdAt: expect.any(String)
})
```

#### Pitfall 5: Missing Error Cases
**Problem:** Only testing happy path.

**Solution:**
```typescript
test('handles errors gracefully', async () => {
  // Mock error response
  vi.spyOn(api, 'fetch').mockRejectedValue(new Error('Network error'))

  await expect(service.getData()).rejects.toThrow('Network error')
})
```

### 1.4 Test Organization Best Practices

#### File Structure
```
src/
  components/
    Button.tsx
    Button.test.tsx  # Co-located test
  utils/
    helpers.ts
    helpers.test.ts
```

#### Test Structure
```typescript
describe('UserService', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      // Setup common to all tests in this describe block
    })

    afterEach(() => {
      // Cleanup
    })

    it('should return users when API call succeeds', async () => {
      // Arrange
      const expectedUsers = [...]
      mockApi.getUsers.mockResolvedValue(expectedUsers)

      // Act
      const result = await userService.getUsers()

      // Assert
      expect(result).toEqual(expectedUsers)
    })

    it('should throw error when API call fails', async () => {
      // Test error case
    })
  })
})
```

---

## 2. Test Maintenance After Bug Fixes

### 2.1 Determining if Test Needs Updating vs Implementation Wrong

#### Decision Framework

**Step 1: Review Requirements**
- Check if the test reflects current requirements
- Verify product specifications haven't changed
- Consult documentation and design documents

**Step 2: Analyze the Failure**
```typescript
// Example: Understanding failure context
test('calculateTotal returns sum with tax', () => {
  const result = calculateTotal(100, 0.1)
  expect(result).toBe(110) // Fails - actual: 110.00000000000001
})
```

**Analysis Questions:**
1. Is this a floating-point precision issue? → Update test/approach
2. Is the calculation logic wrong? → Fix implementation
3. Have requirements changed? → Update both

**Step 3: Check Test Intent**

| Test Intent | Implementation Detail | Decision |
|------------|----------------------|----------|
| Behavior verification | Encapsulates business logic | **Fix implementation** |
| Implementation detail | Tight coupling to code structure | **Update test** |
| Edge case | Valid scenario not covered | **Fix implementation** |
| Brittle assertion | Tests irrelevant details | **Update test** |

### 2.2 Best Practices for Updating Tests

#### When Behavior Changes Intentionally

1. **Document the Change**
```typescript
/**
 * Updated: 2025-01-12
 * Reason: Bug fix #123 - Added email validation
 * Previous: Accepted any string
 * Now: Requires valid email format
 */
test('should validate email format', () => {
  expect(validateEmail('invalid')).toBe(false)
  expect(validateEmail('test@example.com')).toBe(true)
})
```

2. **Add Regression Tests**
```typescript
// Test that prevents regression of the bug
test('should not allow empty email after bug fix #123', () => {
  expect(() => validateEmail('')).toThrow('Email is required')
})
```

3. **Update Test Suite Structure**
```typescript
describe('Bug Fix #123', () => {
  describe('Previously broken cases', () => {
    it('should handle edge case X', () => { /* ... */ })
    it('should handle edge case Y', () => { /* ... */ })
  })

  describe('Existing functionality preserved', () => {
    it('should still do Z', () => { /* ... */ })
  })
})
```

#### When Test is Wrong

1. **Identify Test Flaws**
```typescript
// ❌ Bad: Tests implementation detail
test('userService calls API', () => {
  userService.getUsers()
  expect(api.fetch).toHaveBeenCalledWith('/users')
})

// ✅ Good: Tests behavior
test('userService returns users', async () => {
  const users = await userService.getUsers()
  expect(users).toEqual(expectedUsers)
})
```

2. **Refactor Test**
```typescript
// Before: Brittle test
test('returns user object', () => {
  expect(getUser(1)).toEqual({
    id: 1,
    name: 'John',
    email: 'john@example.com',
    passwordHash: 'abc123...',
    createdAt: '2025-01-12'
  })
})

// After: Focused test
test('returns user with required fields', () => {
  const user = getUser(1)
  expect(user).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
    email: expect.stringContaining('@')
  })
  expect(user).not.toHaveProperty('passwordHash')
})
```

### 2.3 Documenting Test Changes

#### Commit Message Format
```
test: update email validation tests after bug fix #123

- Add test for empty email validation
- Update assertion to check format validation
- Add regression test for edge case case with special chars

Related: #123
```

#### Test Documentation Template
```typescript
/**
 * Test Suite: User Authentication
 *
 * Bug Fixes Applied:
 * - #123: Fixed email validation (2025-01-12)
 * - #456: Fixed password hash comparison (2025-01-10)
 *
 * Known Issues:
 * - #789: Tests fail in Safari due to crypto API
 *
 * Maintenance Notes:
 * - Update mock tokens monthly
 * - Refresh fixtures after auth schema changes
 */
describe('Authentication', () => {
  // tests...
})
```

#### Change Log Approach
```typescript
/*
 * CHANGE LOG
 * ----------
 * 2025-01-12: Updated test expectations after bug fix #123
 *   - Changed from toBe() to toBeCloseTo() for floating point
 *   - Added edge case test for zero values
 *
 * 2025-01-10: Added test for new feature
 *   - Added test case for batch processing
 *   - Updated mock data structure
 */
```

---

## 3. Common Test Failure Patterns

### 3.1 Understanding Failure Types

#### 1. Assertion Failures

**Pattern:** Expected vs Actual Mismatch
```typescript
// Error: Expected: 10, Received: 5
expect(add(5, 5)).toBe(10)
```

**Common Causes:**
- Incorrect implementation logic
- Wrong test expectations
- Data type mismatches
- Async timing issues

**Debug Strategy:**
```typescript
// Add logging
test('debug assertion', () => {
  const result = calculate(5, 5)
  console.log('Result:', result)
  console.log('Type:', typeof result)
  expect(result).toBe(10)
})
```

#### 2. Timeout Errors

**Pattern:** Test exceeds time limit
```
Error: Timeout - Async callback was not invoked within the 5000ms timeout
```

**Common Causes:**
```typescript
// 1. Missing await
test('timeout example', async () => {
  const result = fetchData() // ❌ Missing await
  expect(result).toBe('data')
})

// 2. Unresolved promise
test('timeout example', () => {
  fetchData().then(data => {
    expect(data).toBe('data') // ❌ Promise not returned
  })
})

// 3. Infinite loop
test('timeout example', () => {
  while (true) { // ❌ Never ends
    process.nextTick()
  }
})
```

**Solutions:**
```typescript
// ✅ Correct async handling
test('async test', async () => {
  const result = await fetchData()
  expect(result).toBe('data')
})

// ✅ Return promise
test('async test', () => {
  return fetchData().then(data => {
    expect(data).toBe('data')
  })
})

// ✅ Increase timeout if needed
test('slow operation', async () => {
  const result = await slowOperation()
  expect(result).toBe('done')
}, { timeout: 10000 })
```

#### 3. Mock Failures

**Pattern:** Mock not called or called incorrectly
```typescript
// Error: expect(jest.fn()).toHaveBeenCalledWith(...expected)
// Expected: "/api/users"
// Received: "/api/user"
```

**Common Issues:**
```typescript
// 1. Mock not set up
test('mock example', () => {
  const spy = vi.spyOn(api, 'fetch')
  // ❌ Forgot to mock implementation
  service.getData()
  expect(spy).toHaveBeenCalled()
})

// ✅ Correct: Set up mock
test('mock example', () => {
  const spy = vi.spyOn(api, 'fetch').mockResolvedValue(data)
  service.getData()
  expect(spy).toHaveBeenCalled()
})

// 2. Wrong arguments
test('mock example', () => {
  const spy = vi.spyOn(api, 'fetch')
  api.fetch('/users') // ❌ Test expects '/api/users'
  expect(spy).toHaveBeenCalledWith('/api/users')
})

// 3. Mock not restored
test('mock example', () => {
  vi.spyOn(api, 'fetch')
  // ❌ No cleanup - affects other tests
})
```

**Best Practices:**
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Or use vi.mocked with proper typing
const mockFetch = vi.mocked(api.fetch)
```

#### 4. TypeScript Type Errors

**Pattern:** Type mismatches in tests
```typescript
// Error: Argument of type 'string' is not assignable to parameter of type 'number'
test('type error', () => {
  expect(add('5', '5')).toBe(10) // ❌ Type error
})
```

**Common Issues:**
```typescript
// 1. Missing type casting
test('type casting', () => {
  const value = getValue() as string // ❌ Unsafe cast
  expect(value.toUpperCase()).toBe('TEST')
})

// ✅ Better: Use type guards
test('type guard', () => {
  const value = getValue()
  if (typeof value === 'string') {
    expect(value.toUpperCase()).toBe('TEST')
  }
})

// 2. Mock return type mismatch
const mockFn = vi.fn()
mockFn.mockReturnValue('string') // ❌ Should return number
const result: number = mockFn()
```

### 3.2 Reading Vitest Error Output

#### Error Message Structure
```
FAIL src/utils/math.test.ts > MathUtils > divide
  Error: 2 / 0 should throw error

  ❯ src/utils/math.test.ts:15:23
     13|
     14|   it('should throw on divide by zero', () => {
  ❯  15|     expect(() => divide(2, 0)).toThrow()
       |           ^
     16|   })
     17|
```

**Key Parts:**
1. **Test Path:** `src/utils/math.test.ts > MathUtils > divide`
2. **Error Message:** Human-readable description
3. **File Location:** Line and column number
4. **Code Context:** Surrounding lines with pointer to failure
5. **Diff:** Expected vs Actual (for assertion failures)

#### Diff Interpretation
```
Error: expect(received).toEqual(expected)

  Expected:  { id: 1, name: "John", active: true }
  Received:  { id: 1, name: "John", active: false }

  - Expected
  + Received

    {
      id: 1,
      name: "John",
  -   active: true
  +   active: false
    }
```

**Interpretation:**
- `-` lines show expected values
- `+` lines show actual values
- Focus on the differences (in this case: `active` property)

### 3.3 Common TypeScript Test Issues

#### Issue 1: Property Access on Mocks
```typescript
// ❌ Error: Property 'mock' does not exist on type
const mockFn = vi.fn()
expect(mockFn.mock.calls.length).toBe(1)

// ✅ Use Vitest's mocked utility
import { vi, expect } from 'vitest'
const mockFn = vi.fn()
expect(mockFn).toHaveBeenCalledTimes(1)
```

#### Issue 2: Module Mocking Type Errors
```typescript
// ❌ Type error with vi.mock
vi.mock('./api', () => ({
  fetchUsers: vi.fn()
}))

// ✅ Proper typing
import { vi } from 'vitest'
import { fetchUsers } from './api'

vi.mock('./api', () => ({
  fetchUsers: vi.fn()
}))

const mockFetchUsers = vi.mocked(fetchUsers)
mockFetchUsers.mockResolvedValue([])
```

#### Issue 3. Async Function Return Types
```typescript
// ❌ Missing Promise type
const result = getData() // Type: any
expect(result).toBe(data)

// ✅ Proper async typing
const result = await getData() // Type: Data
expect(result).toBe(data)
```

---

## 4. Test Debugging Strategies

### 4.1 Using Vitest's Debugging Features

#### Console Logging
```typescript
test('debug with console', () => {
  const input = { name: 'test' }
  console.log('Input:', input)

  const result = process(input)
  console.log('Result:', result)
  console.log('Result type:', typeof result)

  expect(result.name).toBe('TEST')
})
```

#### Using debug() Method
```typescript
import { expect } from 'vitest'

test('debug with expect.debug', () => {
  const result = complexOperation()
  expect(result).debug() // Prints value to console
  expect(result).toHaveProperty('id')
})
```

#### Test-Only Focus
```typescript
// Run only this test
test.only('debugging this specific test', () => {
  // This test runs, others are skipped
})

// Or use CLI
vitest run -t "test name pattern"
```

#### Skipping Tests
```typescript
// Skip failing test temporarily
test.skip('broken test', () => {
  // This is skipped
})

// Or skip conditionally
test.skipIf(isWindows)('unix-only test', () => {
  // Skipped on Windows
})
```

### 4.2 Isolating Failing Tests

#### Strategy 1: Run Single Test File
```bash
vitest run path/to/failing.test.ts
```

#### Strategy 2: Run Specific Test
```typescript
// Use test.only
test.only('failing test', () => {
  // Only this runs
})

// Or use pattern matching
vitest run -t "failing test"
```

#### Strategy 3: Bisect Tests
```bash
# Use binary search to find problematic test
vitest run --bail 1
```

#### Strategy 4: Disable Other Tests
```typescript
// Comment out or skip other tests temporarily
describe('Feature', () => {
  test.skip('test 1', () => { /* ... */ })
  test.skip('test 2', () => { /* ... */ })
  test('failing test', () => {
    // Only this runs
  })
})
```

### 4.3 Understanding Stack Traces

#### Reading Stack Traces
```
Error: Cannot read property 'map' of undefined

  ❯ src/utils/users.ts:25:18
     23|   const users = await fetchUsers()
     24|   const activeUsers = users.filter(u => u.active)
  ❯  25|   const names = activeUsers.map(u => u.name)
       |                    ^
     26|   return names
     27| }

  ❯ src/utils/users.test.ts:15:20
     13|
     14|   it('should get active user names', async () => {
  ❯  15|     const names = await getActiveUserNames()
        |                   ^
     16|     expect(names).toEqual(['John'])
     17|   })
```

**Analysis:**
1. **Error Location:** Line 25 in `users.ts`
2. **Error Type:** `Cannot read property 'map' of undefined`
3. **Root Cause:** `activeUsers` is undefined
4. **Why:** `users.filter()` returned undefined (users was likely undefined)
5. **Test Location:** Line 15 in test file

#### Debug Flow
```typescript
// 1. Check what's undefined
test('debug undefined', async () => {
  const users = await fetchUsers()
  console.log('Users:', users) // Check if users is undefined

  const activeUsers = users?.filter(u => u.active)
  console.log('Active users:', activeUsers) // Check result
})
```

#### Common Stack Trace Patterns

| Pattern | Meaning | Fix |
|---------|---------|-----|
| `Cannot read property 'X' of undefined` | Object is undefined | Add null check or fix data source |
| `X is not a function` | Wrong type or not imported | Check import and type |
| `Expected X to be Y` | Assertion failure | Check logic or update expectation |
| `Timeout exceeded` | Test too long | Fix async code or increase timeout |

### 4.4 Advanced Debugging Techniques

#### Using Node.js Debugger
```bash
# Start with inspect flag
vitest --inspect-brk --no-coverage

# Then in Chrome: chrome://inspect
# Or in VS Code: Add launch configuration
```

#### VS Code Launch Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--inspect-brk", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Conditional Breakpoints in Tests
```typescript
test('debug specific condition', () => {
  let value = process(input)

  // Add conditional check
  if (value !== expected) {
    console.log('Debug info:', { input, value, expected })
    debugger // Breaks here in debugger
  }

  expect(value).toBe(expected)
})
```

---

## 5. Decision Framework: Test vs Implementation

### 5.1 Flowchart for Determining Action

```
┌─────────────────────────────┐
│     Test Failing            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Are requirements current?  │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
    Yes          No
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────┐
│ Check   │  │ Update test to  │
│ behavior│  │ match new reqs  │
└────┬────┘  └─────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Does implementation match   │
│ documented requirements?    │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
    Yes          No
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────┐
│ Update  │  │ Fix             │
│ test    │  │ implementation  │
└─────────┘  └─────────────────┘
```

### 5.2 Checklist

#### Before Changing Test
- [ ] Reviewed requirements documentation
- [ ] Checked if product spec changed
- [ ] Verified test wasn't testing implementation detail
- [ ] Confirmed test was correct before bug fix
- [ ] Consulted with product owner if needed

#### Before Changing Implementation
- [ ] Verified implementation is wrong
- [ ] Checked related code for similar issues
- [ ] Reviewed test assertions are correct
- [ ] Added regression test for bug fix
- [ ] Documented the bug and fix

### 5.3 Decision Matrix

| Scenario | Test Behavior | Implementation | Action |
|----------|--------------|----------------|--------|
| Bug found in code | Correct | Wrong | Fix implementation, add regression test |
| Requirements changed | Outdated | Correct | Update test |
| Test too brittle | Implementation detail | Correct | Refactor test to test behavior |
| Edge case discovered | Missing | Correct | Add test case |
| Feature deprecated | Correct | Deprecated | Remove test and implementation |
| API contract changed | Outdated | Updated | Update test to match new contract |

### 5.4 Examples

#### Example 1: Bug in Implementation
```typescript
// Test is correct
test('should calculate tax correctly', () => {
  expect(calculateTax(100, 0.1)).toBe(10)
})

// Implementation has bug
function calculateTax(amount: number, rate: number): number {
  return amount * rate // ❌ Missing rounding
}

// Action: Fix implementation
function calculateTax(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100
}
```

#### Example 2: Test Needs Update
```typescript
// Old behavior
test('should return active users', () => {
  const users = getActiveUsers(allUsers)
  expect(users).toHaveLength(3) // ❌ Old expectation
})

// New requirement: Include users with 'pending' status
function getActiveUsers(users: User[]): User[] {
  return users.filter(u => u.status === 'active' || u.status === 'pending')
}

// Action: Update test
test('should return active and pending users', () => {
  const users = getActiveUsers(allUsers)
  expect(users).toHaveLength(5) // ✅ Updated
})
```

#### Example 3: Test Implementation Detail
```typescript
// ❌ Bad: Tests implementation
test('sortUsers calls Array.sort', () => {
  const spy = vi.spyOn(Array.prototype, 'sort')
  sortUsers(users)
  expect(spy).toHaveBeenCalled()
})

// ✅ Good: Tests behavior
test('sortUsers returns users sorted by name', () => {
  const sorted = sortUsers(users)
  expect(sorted).toEqual(sortedByName)
})
```

---

## 6. Resources and References

### 6.1 Official Vitest Documentation

**Primary Resources:**
- **Vitest Official Website:** https://vitest.dev
- **Vitest GitHub Repository:** https://github.com/vitest-dev/vitest
- **Vitest Discord Community:** https://vitest.dev/chat

#### Essential Documentation Sections:

1. **Getting Started Guide**
   - URL: https://vitest.dev/guide/
   - Installation, configuration, and basic usage

2. **API Reference**
   - URL: https://vitest.dev/api/
   - Complete reference for `expect`, `test`, `describe`, and all assertion methods

3. **Debugging Guide**
   - URL: https://vitest.dev/guide/debugging.html
   - Using `--inspect-brk`, VS Code integration, Chrome DevTools

4. **Mock Functions**
   - URL: https://vitest.dev/api/mock.html
   - `vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.mocked()`

5. **Test Context**
   - URL: https://vitest.dev/api/context.html
   - Using test context for advanced scenarios

6. **Configuration Options**
   - URL: https://vitest.dev/config/
   - Complete `vitest.config.ts` reference

7. **CLI Reference**
   - URL: https://vitest.dev/cli/
   - All command-line flags and options

8. **UI Interface**
   - URL: https://vitest.dev/guide/ui.html
   - Interactive test browser and debugging UI

9. **Coverage**
   - URL: https://vitest.dev/guide/coverage.html
   - Code coverage configuration with c8 and istanbul

10. **Common Errors**
    - URL: https://vitest.dev/guide/common-errors.html
    - Troubleshooting common test failures

11. **Snapshot Testing**
    - URL: https://vitest.dev/guide/snapshot.html
    - Inline and external snapshot testing

12. **Testing Library Support**
    - URL: https://vitest.dev/guide/testing-library.html
    - Integration with @testing-library

13. **In-Source Testing**
    - URL: https://vitest.dev/guide/in-source.html
    - Writing tests alongside source code

14. **Workspace Projects**
    - URL: https://vitest.dev/guide/workspace.html
    - Monorepo and multi-project setup

### 6.2 External Best Practices and Community Resources

#### Testing Best Practices from Industry Experts

1. **Kent C. Dodds - Testing Principles**
   - Blog: https://kentcdodds.com/blog/tags/testing
   - Key Concepts:
     - "The more your tests resemble the way your software is used, the more confidence they can give you"
     - Integration tests over unit tests
     - Avoid mocking when possible
     - Test user behavior, not implementation details

2. **Martin Fowler - Testing Strategies**
   - Articles: https://martinfowler.com/tags/testing.html
   - Key Topics:
     - Test Pyramid (unit, integration, e2e)
     - Test Coverage
     - Continuous Integration testing
     - Refactoring test code

3. **Google Testing Blog**
   - URL: https://testing.googleblog.com/
   - Key Topics:
     - Test size categorization (small, medium, large)
     - Test doubles and fakes
     - Hermetic testing
     - Flaky test detection

4. **JavaScript Testing Best Practices**
   - GitHub: https://github.com/goldbergyoni/javascript-testing-best-practices
   - Comprehensive guide covering:
     - Test structure and organization
     - Async testing patterns
     - Mock and stub strategies
     - Performance testing

#### TypeScript-Specific Testing Resources

1. **TypeScript Deep Dive - Testing**
   - URL: https://basarat.gitbook.io/typescript/type-system/typings-for-npm-packages
   - Mocking TypeScript modules
   - Type-safe test helpers

2. **Testing TypeScript with Vitest**
   - Community tutorials on Medium and Dev.to
   - Focus on type safety in tests
   - Generic test utilities

#### Test Maintenance Patterns

1. **Regression Testing**
   - Always add tests when fixing bugs
   - Keep bug fix tests separate from feature tests
   - Document the bug being prevented

2. **Test Refactoring**
   - Extract common setup into fixtures
   - Create custom matchers for domain-specific assertions
   - Use factory functions for test data

3. **Flaky Test Management**
   - Identify and isolate flaky tests
   - Retry mechanisms for known flaky tests
   - Fix underlying timing or dependency issues

#### Community Forums and Q&A

1. **Stack Overflow - Vitest Tag**
   - URL: https://stackoverflow.com/questions/tagged/vitest
   - Search for specific error messages
   - Common solutions to test failures

2. **Vitest GitHub Discussions**
   - URL: https://github.com/vitest-dev/vitest/discussions
   - Feature requests and best practices
   - Community solutions

3. **Reddit - r/vitest**
   - User experiences and solutions
   - Testing patterns and anti-patterns

#### Recommended Reading Topics

##### For Vitest:
- Debugging tests with `--inspect-brk`
- Using the Vitest UI for visual debugging
- Mock module patterns
- Snapshot testing
- Parallel test execution
- Workspace configuration for monorepos

##### For Test Maintenance:
- Regression testing strategies
- Test-driven development workflows
- Continuous integration for tests
- Test smell identification and refactoring
- Test suite organization and structure
- Documentation patterns for tests

##### For TypeScript Testing:
- Type-safe mocking with `vi.mocked()`
- Testing async code patterns
- Type assertion patterns in tests
- Generic test utilities
- Testing with complex types
- Mock type definitions

### 6.3 Common Patterns to Implement

#### Test Helpers
```typescript
// test-helpers.ts
export const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
})

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000
) => {
  const start = Date.now()
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return condition()
}
```

#### Custom Matchers
```typescript
// custom-matchers.ts
import { expect } from 'vitest'

interface CustomMatchers {
  toBeValidEmail(): any
}

expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received)
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be valid email`
          : `Expected ${received} to be valid email`,
    }
  },
})
```

### 6.4 CI/CD Integration and Test Automation

#### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### Test Scripts for package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk --no-coverage",
    "test:watch": "vitest --watch",
    "test:changed": "vitest --changed"
  }
}
```

#### Pre-commit Hooks with Husky

```bash
# Install Husky
npm install -D husky

# Set up git hooks
npx husky install
npx husky add .husky/pre-commit "npm run test"
```

#### Test Maintenance Checklist Template

```markdown
## Test Maintenance Checklist

### Before Modifying Tests
- [ ] Reviewed bug report/requirements
- [ ] Identified root cause
- [ ] Checked related tests
- [ ] Confirmed test intent
- [ ] Verified requirements haven't changed

### During Update
- [ ] Updated failing tests
- [ ] Added regression tests
- [ ] Updated mocks if needed
- [ ] Verified all tests pass
- [ ] Checked test coverage
- [ ] Ran full test suite

### After Update
- [ ] Ran full test suite
- [ ] Checked coverage
- [ ] Updated documentation
- [ ] Committed with clear message
- [ ] Updated change log
- [ ] Verified CI/CD passes
```

### 6.5 Quick Reference Commands

```bash
# Run all tests
vitest

# Run with coverage
vitest --coverage

# Run specific file
vitest run path/to/test.ts

# Run in watch mode
vitest --watch

# Run with UI
vitest --ui

# Debug mode
vitest --inspect-brk

# Run only changed tests
vitest --changed

# Update snapshots
vitest -u

# Run tests matching pattern
vitest run -t "pattern"
```

---

## Conclusion

This research document provides comprehensive guidance on test maintenance after bug fixes, with a focus on Vitest and TypeScript. Key takeaways:

1. **Always understand the root cause** before modifying tests
2. **Prefer behavior testing** over implementation details
3. **Document changes** thoroughly for future maintainers
4. **Use Vitest's debugging tools** effectively
5. **Add regression tests** when fixing bugs
6. **Keep tests isolated** and independent

Following these practices will help maintain a healthy, reliable test suite that catches bugs without becoming a maintenance burden.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Maintained By:** Groundswell Development Team
