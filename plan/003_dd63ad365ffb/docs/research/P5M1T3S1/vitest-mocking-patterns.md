# Vitest Mocking Patterns Research

## Summary

This document contains research on Vitest mocking patterns for testing external SDK dependencies, specifically for the Groundswell provider system tests.

## Key Findings

### 1. Dynamic Import Mocking

For testing `await import()` patterns (as used in AnthropicProvider.initialize()):

```typescript
// DO NOT mock the SDK import for initialization tests
// Instead, test the real import behavior
await provider.initialize();

// Verify SDK was loaded
// @ts-expect-error - Testing private property
expect(provider.sdk).not.toBeNull();
```

### 2. vi.mock() Module Mocking

For modules that need to be mocked (like fs/promises for skill loading):

```typescript
// Mock entire module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Use mocked module with type safety
import { readFile } from 'fs/promises';
vi.mocked(readFile).mockResolvedValue('mock content');
```

### 3. Function Mocking with vi.fn()

```typescript
// Create mock function
const mockFunction = vi.fn().mockResolvedValue(undefined);

// Verify calls
expect(mockFunction).toHaveBeenCalledTimes(1);
expect(mockFunction).toHaveBeenCalledWith(arg1, arg2);
```

### 4. Private Property Testing Pattern

```typescript
// Access private properties for testing
// @ts-expect-error - Testing private property
expect(provider.sdk).not.toBeNull();
```

### 5. Singleton Testing Pattern

```typescript
beforeEach(() => {
  // Reset singleton state
  ProviderRegistry._resetForTesting();
});
```

## Groundswell-Specific Patterns

### SDK Mocking Decision

**DO NOT mock @anthropic-ai/claude-agent-sdk** for initialization tests because:
1. We want to verify the actual SDK import works
2. The SDK is installed as a production dependency
3. Tests should validate real integration, not mocked behavior

### Provider Registry Mocking

**DO NOT mock ProviderRegistry** for integration tests:
1. Use real registry with `_resetForTesting()` for isolation
2. Tests validate real registry-provider interaction
3. Singleton pattern requires real instance

### When to Mock

Mock these external dependencies:
- `fs/promises` - For file I/O in loadSkills() tests
- `zod` - For schema validation in execute() tests
- External APIs - Never call real APIs in tests

Don't mock these:
- @anthropic-ai/claude-agent-sdk (for initialization)
- ProviderRegistry (use real with reset)
- Type definitions and interfaces

## References

- [Vitest Mocking API](https://vitest.dev/api/mock.html)
- [Testing Library Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- Groundswell existing tests: src/__tests__/unit/providers/
