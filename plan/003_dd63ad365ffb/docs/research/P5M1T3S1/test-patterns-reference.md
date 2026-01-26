# Groundswell Test Patterns Reference

## Overview

This document catalogs test patterns found in the Groundswell codebase for reference when writing new tests.

## Test Framework: Vitest

### Configuration

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,  // describe, it, expect available globally
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  }
});
```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npx vitest run        # Direct vitest run
```

## Test File Structure

### Standard Template

```typescript
/**
 * Test file: feature-name.test.ts
 *
 * Purpose: Brief description of what's being tested
 *
 * Tests:
 * - High-level test categories
 *
 * PRP: Reference to PRP task if applicable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassUnderTest } from '../../../path/to/class.js';

describe('ClassName - methodName()', () => {
  let instance: ClassUnderTest;

  beforeEach(() => {
    instance = new ClassUnderTest();
    // Reset any singletons or global state
  });

  describe('Feature Category', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test';

      // Act
      await instance.method(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Common Patterns

### 1. Private Property Testing

```typescript
it('should access private property for testing', async () => {
  await instance.initialize();

  // @ts-expect-error - Testing private property
  expect(instance.privateField).not.toBeNull();
});
```

### 2. Singleton Testing

```typescript
describe('Singleton Pattern', () => {
  beforeEach(() => {
    // CRITICAL: Reset singleton state
    ProviderRegistry._resetForTesting();
  });

  it('should return same instance', () => {
    const instance1 = ProviderRegistry.getInstance();
    const instance2 = ProviderRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });
});
```

### 3. Async Error Testing

```typescript
it('should handle errors gracefully', async () => {
  // Option 1: resolves.not.toThrow
  await expect(instance.method()).resolves.not.toThrow();

  // Option 2: rejects.toThrow
  await expect(instance.method()).rejects.toThrow('Error message');

  // Option 3: try-catch
  try {
    await instance.method();
    expect.fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('expected');
  }
});
```

### 4. Mock Function Testing

```typescript
it('should call mock function', async () => {
  const mockFn = vi.fn().mockResolvedValue('result');

  await instance.method(mockFn);

  expect(mockFn).toHaveBeenCalledTimes(1);
  expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
});
```

### 5. Idempotent Behavior Testing

```typescript
it('should be safe to call multiple times', async () => {
  await instance.initialize();
  const firstState = getState();

  await instance.initialize();
  const secondState = getState();

  expect(firstState).toBe(secondState);
});
```

### 6. Type Safety Testing

```typescript
it('should have correct types', () => {
  const result = instance.method();

  // Verify type through behavior
  expect(typeof result).toBe('string');

  // Verify structure
  expect(result).toHaveProperty('field');
});
```

## Test Organization Patterns

### Group by Feature

```typescript
describe('AnthropicProvider', () => {
  describe('Class Structure', () => {
    // Tests for id, capabilities, etc.
  });

  describe('Interface Implementation', () => {
    // Tests for Provider interface compliance
  });

  describe('initialize()', () => {
    // Tests for initialize method
  });
});
```

### Group by Test Type

```typescript
describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    // Tests for qualified format
  });

  describe('plain format (model only)', () => {
    // Tests for plain format
  });

  describe('error cases', () => {
    // Tests for error handling
  });
});
```

## Assertion Patterns

### Object Equality

```typescript
// Deep equality
expect(result).toEqual({ key: 'value' });

// Strict equality (primitives)
expect(result).toBe('value');

// Property existence
expect(result).toHaveProperty('key');

// Partial object match
expect(result).toMatchObject({ key: 'value' });
```

### Array Assertions

```typescript
// Array contains
expect(array).toContain(item);

// Array length
expect(array).toHaveLength(3);

// Array equality
expect(array).toEqual([1, 2, 3]);
```

### Type Assertions

```typescript
// Instance check
expect(result).toBeInstanceOf(Promise);

// Type check
expect(typeof result).toBe('function');

// Defined check
expect(result).toBeDefined();
expect(result).not.toBeNull();
```

## Provider-Specific Patterns

### Provider Mock Helper

```typescript
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}
```

### Lifecycle Testing

```typescript
describe('Lifecycle', () => {
  it('should initialize and terminate correctly', async () => {
    await provider.initialize();
    expect(provider.getStatus()).toBe('initialized');

    await provider.terminate();
    expect(provider.getStatus()).toBe('terminated');
  });
});
```

## Integration Test Patterns

### Configuration Testing

```typescript
describe('Configuration Cascade', () => {
  it('should prioritize prompt over agent over global', async () => {
    // Arrange: Set global config
    configureProviders({ defaultProvider: 'opencode' });

    // Agent configured with anthropic
    const agent = new Agent({ provider: 'anthropic' });

    // Act: Prompt override to opencode
    await agent.prompt(prompt, { provider: 'opencode' });

    // Assert: Prompt override wins
    expect(opencodeProvider.execute).toHaveBeenCalled();
  });
});
```

### Registry Testing

```typescript
describe('ProviderRegistry Integration', () => {
  it('should work with registry initialization', async () => {
    const registry = ProviderRegistry.getInstance();
    registry.register(provider);

    await registry.initializeProvider('anthropic');

    expect(registry.isReady('anthropic')).toBe(true);
    expect(registry.getStatus('anthropic')).toBe('initialized');
  });
});
```

## Anti-Patterns to Avoid

### Don't Test Implementation Details

```typescript
// BAD: Tests internal implementation
it('should set private flag to true', () => {
  // @ts-expect-error
  expect(provider._initialized).toBe(true);
});

// GOOD: Tests observable behavior
it('should be ready after initialization', async () => {
  await provider.initialize();
  expect(provider.isReady()).toBe(true);
});
```

### Don't Create Brittle Tests

```typescript
// BAD: Depends on execution order
it('should work after previous test', () => {
  // Assumes previous test ran
});

// GOOD: Independent setup
it('should work independently', () => {
  const freshInstance = new Class();
  // Test behavior
});
```

### Don't Ignore Type Safety

```typescript
// BAD: Bypasses type checking
// @ts-ignore
expect(provider.anything).toBe('value');

// GOOD: Documents type exception
// @ts-expect-error - Testing private property
expect(provider.privateField).toBeDefined();
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- Groundswell test files: `src/__tests__/unit/`
