# Vitest Testing Patterns Research - P1.M1.T2.S3

## Overview

Research on Vitest testing patterns for validation methods in TypeScript.

## Key Findings

### 1. Testing Validation That Throws Errors

**Best Practice**: Use `expect(() => ...).toThrow()` pattern for synchronous validation.

**Code Examples from Project:**

`src/__tests__/adversarial/circular-reference.test.ts`:
```typescript
// Basic error throwing
expect(() => child.attachChild(parent)).toThrow();

// Specific error message
expect(() => parent2.attachChild(child)).toThrow('already has a parent');

// Regex pattern matching (flexible)
expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
```

### 2. AAA (Arrange-Act-Assert) Pattern

The project follows excellent AAA patterns:

```typescript
it('should throw when attaching ancestor as child', () => {
  // ========== ARRANGE ==========
  const root = new SimpleWorkflow('Root');
  const child1 = new SimpleWorkflow('Child1', root);
  const child2 = new SimpleWorkflow('Child2', child1);

  // Verify initial state (part of Arrange)
  expect(child2.parent).toBe(child1);
  expect(child1.parent).toBe(root);

  // ========== ACT & ASSERT ==========
  // In validation tests, Act and Assert are often combined
  expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
});
```

### 3. Console Mocking Patterns

**Project Pattern** (`src/__tests__/adversarial/parent-validation.test.ts`):

```typescript
describe('Parent Validation', () => {
  // ========== SETUP: Mock all console methods ==========
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ========== TEARDOWN: CRITICAL ==========
  afterEach(() => {
    vi.restoreAllMocks(); // Prevents test pollution
  });

  it('should log helpful error message', () => {
    // Arrange
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // Act
    try {
      parent2.attachChild(child);
    } catch (err) {
      // Expected error
    }

    // Assert
    expect(console.error).toHaveBeenCalled();
  });
});
```

### 4. Testing Private Methods

**Type Assertion Pattern** (`src/__tests__/unit/workflow.test.ts`):

```typescript
// Access private methods via type assertion
expect(() => (parent as any).getRoot()).toThrow('Circular parent-child relationship detected');
expect(() => (parent as any).getRootObservers()).toThrow('Circular parent-child relationship detected');
```

## Vitest Documentation URLs

**Error Assertions:**
- [toThrow()](https://vitest.dev/api/expect.html#tothrow) - Error assertion matcher
- [rejects.toThrow()](https://vitest.dev/api/expect.html#rejects) - Async error assertion

**Mocking:**
- [vi.spyOn()](https://vitest.dev/api/vi.html#spyon) - Create spies
- [vi.restoreAllMocks()](https://vitest.dev/api/vi.html#restoreallmocks) - Restore all mocks
- [mockImplementation()](https://vitest.dev/api/vi.html#mockimplementation) - Mock implementation

**Test Structure:**
- [describe()](https://vitest.dev/api/#describe) - Test suite
- [it() / test()](https://vitest.dev/api/#it) - Test case
- [beforeEach()](https://vitest.dev/api/#beforeeach) - Setup before each test
- [afterEach()](https://vitest.dev/api/#aftereach) - Teardown after each test

## Best Practices Summary

1. **AAA Pattern**: Clear section comments marking ARRANGE/ACT/ASSERT
2. **TDD Approach**: Red-Green-Refactor cycle documented in test comments
3. **Console Mocking**: Proper setup/teardown prevents test pollution
4. **Regex Matching**: Using alternation patterns for multiple valid error messages
5. **Test Isolation**: beforeEach/afterEach ensure clean test state
6. **Documentation**: Extensive comments explaining bug and expected behavior

## Project Test Files

- `src/__tests__/adversarial/parent-validation.test.ts` - Parent validation with console mocking
- `src/__tests__/adversarial/circular-reference.test.ts` - Regex matching patterns
- `src/__tests__/unit/workflow.test.ts` - Private method testing with type assertions

## Configuration

- **Test Runner**: Vitest v1.0.0
- **Config File**: `vitest.config.ts`
- **Test Pattern**: `src/__tests__/**/*.test.ts`
- **Run Command**: `npm test` or `vitest run`
