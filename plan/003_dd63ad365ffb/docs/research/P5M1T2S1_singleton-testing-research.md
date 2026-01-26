# Singleton & Registry Pattern Testing Research

**Date:** 2026-01-26
**Task:** P5M1T2S1 - Research testing patterns for singletons and registries in TypeScript

---

## 1. Best Practices for Testing Singleton Patterns in TypeScript

### 1.1 Core Testing Principles

**Test Instance Uniqueness:**
```typescript
describe('Singleton Pattern', () => {
  it('should return the same instance on multiple getInstance calls', () => {
    const instance1 = MySingleton.getInstance();
    const instance2 = MySingleton.getInstance();

    expect(instance1).toBe(instance2);
    expect(Object.is(instance1, instance2)).toBe(true);
  });
});
```

**Test State Sharing:**
```typescript
it('should share state across all getInstance calls', () => {
  const instance1 = MySingleton.getInstance();
  const instance2 = MySingleton.getInstance();

  instance1.setProperty('test-value');
  expect(instance2.getProperty()).toBe('test-value');
});
```

**Test Private Constructor:**
```typescript
it('should not allow direct instantiation', () => {
  expect(() => {
    const instance = new MySingleton();
  }).toThrow();
});
```

### 1.2 Implementation Pattern

```typescript
class Singleton {
  private static instance: Singleton;
  private constructor() {}

  static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  // Add a reset method for testing only
  static reset(): void {
    Singleton.instance = undefined as unknown as Singleton;
  }
}
```

---

## 2. How to Test getInstance() Returns the Same Instance

### 2.1 Basic Equality Tests

```typescript
describe('getInstance() - Instance Equality', () => {
  it('should return identical instances on consecutive calls', () => {
    const instance1 = MySingleton.getInstance();
    const instance2 = MySingleton.getInstance();
    const instance3 = MySingleton.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
    expect(instance1).toBe(instance3);
  });

  it('should return identical reference (strict equality)', () => {
    const instance1 = MySingleton.getInstance();
    const instance2 = MySingleton.getInstance();

    expect(instance1 === instance2).toBe(true);
  });
});
```

### 2.2 Cross-Module Instance Tests

```typescript
// In a real application, test that the same instance is returned
// across different imports/modules
it('should return same instance when imported from different modules', () => {
  const instanceFromModule1 = MySingleton.getInstance();
  const instanceFromModule2 = MySingleton.getInstance();

  expect(instanceFromModule1).toBe(instanceFromModule2);
});
```

### 2.3 Async Instance Tests

```typescript
it('should return same instance in async scenarios', async () => {
  const [instance1, instance2] = await Promise.all([
    Promise.resolve(MySingleton.getInstance()),
    Promise.resolve(MySingleton.getInstance())
  ]);

  expect(instance1).toBe(instance2);
});
```

---

## 3. How to Reset Singleton State Between Tests

### 3.1 Explicit Reset Method (Recommended)

```typescript
class TestableSingleton {
  private static instance: TestableSingleton;
  private state: string = 'initial';

  private constructor() {}

  static getInstance(): TestableSingleton {
    if (!TestableSingleton.instance) {
      TestableSingleton.instance = new TestableSingleton();
    }
    return TestableSingleton.instance;
  }

  // Testing-only reset method
  static _resetForTesting(): void {
    TestableSingleton.instance = undefined as unknown as TestableSingleton;
  }

  setState(value: string): void {
    this.state = value;
  }

  getState(): string {
    return this.state;
  }
}
```

### 3.2 Test Setup with Reset

```typescript
describe('Singleton with Reset', () => {
  beforeEach(() => {
    // Reset singleton before each test
    TestableSingleton._resetForTesting();
  });

  afterEach(() => {
    // Clean up after each test
    TestableSingleton._resetForTesting();
  });

  it('should start with fresh state after reset', () => {
    const instance1 = TestableSingleton.getInstance();
    instance1.setState('modified');

    TestableSingleton._resetForTesting();

    const instance2 = TestableSingleton.getInstance();
    expect(instance2.getState()).toBe('initial');
  });
});
```

### 3.3 Property Access Reset (Alternative)

```typescript
describe('Singleton with Property Reset', () => {
  beforeEach(() => {
    // Access private static property directly
    (MySingleton as any).instance = undefined;
  });

  it('should create new instance after reset', () => {
    const instance1 = MySingleton.getInstance();
    (MySingleton as any).instance = undefined;

    const instance2 = MySingleton.getInstance();
    expect(instance1).not.toBe(instance2);
  });
});
```

### 3.4 Vitest-Specific Reset

```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Singleton in Vitest', () => {
  beforeEach(() => {
    // Vitest allows module mocking
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should have fresh instance', async () => {
    const { Singleton } = await import('./singleton');
    const instance1 = Singleton.getInstance();

    // Reset and re-import
    vi.resetModules();
    const { Singleton: Singleton2 } = await import('./singleton');
    const instance2 = Singleton2.getInstance();

    expect(instance1).not.toBe(instance2);
  });
});
```

---

## 4. Mock Provider Implementation Patterns for Testing Registries

### 4.1 Mock Provider Interface

```typescript
interface Provider<T> {
  provide(): T;
  id: string;
  priority?: number;
}
```

### 4.2 Simple Mock Implementation

```typescript
class MockProvider<T> implements Provider<T> {
  constructor(
    public id: string,
    private value: T,
    public priority?: number
  ) {}

  provide(): T {
    return this.value;
  }
}
```

### 4.3 Spying Mock Provider

```typescript
class SpyProvider<T> implements Provider<T> {
  callCount = 0;
  providedValues: T[] = [];

  constructor(
    public id: string,
    private value: T,
    public priority?: number
  ) {}

  provide(): T {
    this.callCount++;
    this.providedValues.push(this.value);
    return this.value;
  }

  getCallCount(): number {
    return this.callCount;
  }

  wasCalled(): boolean {
    return this.callCount > 0;
  }
}
```

### 4.4 Verifying Mock Provider Usage

```typescript
describe('Registry with Mock Providers', () => {
  it('should call provider.provide() when retrieving', () => {
    const provider = new SpyProvider('test-provider', 'test-value');
    const registry = new ProviderRegistry<string>();

    registry.register(provider.id, provider);
    const result = registry.get(provider.id);

    expect(result).toBe('test-value');
    expect(provider.getCallCount()).toBe(1);
    expect(provider.wasCalled()).toBe(true);
  });
});
```

### 4.5 Conditional Mock Provider

```typescript
class ConditionalMockProvider<T> implements Provider<T> {
  constructor(
    public id: string,
    private value: T,
    private condition: () => boolean,
    public priority?: number
  ) {}

  provide(): T {
    if (this.condition()) {
      return this.value;
    }
    throw new Error('Condition not met');
  }
}
```

---

## 5. TypeScript Unit Testing Patterns for Registries

### 5.1 Basic Registry Interface

```typescript
interface Registry<K, V> {
  register(key: K, value: V): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  unregister(key: K): boolean;
  clear(): void;
  size(): number;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
}
```

### 5.2 Generic Registry Implementation

```typescript
class GenericRegistry<K, V> implements Registry<K, V> {
  private items: Map<K, V> = new Map();

  register(key: K, value: V): void {
    if (this.items.has(key)) {
      throw new Error(`Key already registered: ${key}`);
    }
    this.items.set(key, value);
  }

  get(key: K): V | undefined {
    return this.items.get(key);
  }

  has(key: K): boolean {
    return this.items.has(key);
  }

  unregister(key: K): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
  }

  size(): number {
    return this.items.size;
  }

  keys(): IterableIterator<K> {
    return this.items.keys();
  }

  values(): IterableIterator<V> {
    return this.items.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.items.entries();
  }
}
```

### 5.3 Testing Registry Generic Type Safety

```typescript
describe('Generic Registry - Type Safety', () => {
  it('should maintain type safety for string keys', () => {
    const registry = new GenericRegistry<string, number>();
    registry.register('one', 1);
    registry.register('two', 2);

    expect(registry.get('one')).toBe(1);
    expect(registry.get('two')).toBe(2);
  });

  it('should maintain type safety for symbol keys', () => {
    const registry = new GenericRegistry<symbol, Provider<string>>();
    const key1 = Symbol('provider1');
    const key2 = Symbol('provider2');

    registry.register(key1, new MockProvider(key1.toString(), 'value1'));
    registry.register(key2, new MockProvider(key2.toString(), 'value2'));

    expect(registry.has(key1)).toBe(true);
    expect(registry.has(key2)).toBe(true);
  });
});
```

---

## 6. Testing Registry Patterns: register(), get(), has()

### 6.1 Testing register()

```typescript
describe('Registry.register()', () => {
  let registry: Registry<string, number>;

  beforeEach(() => {
    registry = new GenericRegistry();
  });

  it('should register a value successfully', () => {
    registry.register('key1', 100);
    expect(registry.has('key1')).toBe(true);
  });

  it('should throw on duplicate key registration', () => {
    registry.register('key1', 100);
    expect(() => {
      registry.register('key1', 200);
    }).toThrow('Key already registered');
  });

  it('should allow registering multiple values', () => {
    registry.register('key1', 100);
    registry.register('key2', 200);
    registry.register('key3', 300);

    expect(registry.size()).toBe(3);
  });

  it('should store values independently', () => {
    registry.register('key1', 100);
    registry.register('key2', 200);

    expect(registry.get('key1')).toBe(100);
    expect(registry.get('key2')).toBe(200);
  });
});
```

### 6.2 Testing get()

```typescript
describe('Registry.get()', () => {
  let registry: Registry<string, number>;

  beforeEach(() => {
    registry = new GenericRegistry();
    registry.register('existing', 42);
  });

  it('should return registered value', () => {
    expect(registry.get('existing')).toBe(42);
  });

  it('should return undefined for non-existent key', () => {
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('should return the exact registered object', () => {
    const obj = { name: 'test' };
    registry.register('obj', obj as any);

    const retrieved = registry.get('obj');
    expect(retrieved).toBe(obj);
    expect(retrieved).toEqual(obj);
  });

  it('should return independent copies of primitive values', () => {
    registry.register('num', 100);
    const value1 = registry.get('num');
    const value2 = registry.get('num');

    expect(value1).toBe(value2);
  });
});
```

### 6.3 Testing has()

```typescript
describe('Registry.has()', () => {
  let registry: Registry<string, number>;

  beforeEach(() => {
    registry = new GenericRegistry();
    registry.register('present', 1);
  });

  it('should return true for existing key', () => {
    expect(registry.has('present')).toBe(true);
  });

  it('should return false for non-existent key', () => {
    expect(registry.has('absent')).toBe(false);
  });

  it('should return false for empty registry', () => {
    const emptyRegistry = new GenericRegistry<string, number>();
    expect(emptyRegistry.has('anything')).toBe(false);
  });

  it('should update after registration', () => {
    expect(registry.has('new-key')).toBe(false);
    registry.register('new-key', 999);
    expect(registry.has('new-key')).toBe(true);
  });

  it('should update after unregistration', () => {
    expect(registry.has('present')).toBe(true);
    registry.unregister('present');
    expect(registry.has('present')).toBe(false);
  });
});
```

### 6.4 Integration Tests for Registry Methods

```typescript
describe('Registry Integration Tests', () => {
  let registry: Registry<string, number>;

  beforeEach(() => {
    registry = new GenericRegistry();
  });

  describe('Complete lifecycle', () => {
    it('should handle full register-get-has-unregister cycle', () => {
      // Initial state
      expect(registry.has('item')).toBe(false);
      expect(registry.get('item')).toBeUndefined();

      // Register
      registry.register('item', 123);
      expect(registry.has('item')).toBe(true);
      expect(registry.get('item')).toBe(123);

      // Unregister
      expect(registry.unregister('item')).toBe(true);
      expect(registry.has('item')).toBe(false);
      expect(registry.get('item')).toBeUndefined();
    });
  });

  describe('Multiple items', () => {
    it('should manage multiple items correctly', () => {
      const items = [
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ] as const;

      items.forEach(([key, value]) => registry.register(key, value));

      expect(registry.size()).toBe(3);
      items.forEach(([key, value]) => {
        expect(registry.has(key)).toBe(true);
        expect(registry.get(key)).toBe(value);
      });
    });
  });
});
```

---

## 7. Advanced Testing Patterns

### 7.1 Testing Thread-Safety (Conceptual)

```typescript
describe('Singleton Concurrent Access', () => {
  it('should handle concurrent getInstance calls', async () => {
    const promises = Array(100).fill(null).map(() =>
      Promise.resolve(MySingleton.getInstance())
    );

    const instances = await Promise.all(promises);

    // All instances should be the same
    const first = instances[0];
    instances.forEach(instance => {
      expect(instance).toBe(first);
    });
  });
});
```

### 7.2 Testing Registry with Providers

```typescript
describe('Provider Registry', () => {
  it('should register and invoke providers', () => {
    const registry = new GenericRegistry<string, Provider<string>>();
    const provider = new MockProvider('test', 'provided-value');

    registry.register('test', provider);
    expect(registry.has('test')).toBe(true);

    const retrieved = registry.get('test');
    expect(retrieved).toBe(provider);
    expect(retrieved?.provide()).toBe('provided-value');
  });

  it('should handle provider priority', () => {
    const registry = new GenericRegistry<string, Provider<number>>();

    const provider1 = new MockProvider('low', 100, 1);
    const provider2 = new MockProvider('high', 200, 10);
    const provider3 = new MockProvider('medium', 150, 5);

    registry.register('low', provider1);
    registry.register('high', provider2);
    registry.register('medium', provider3);

    expect(registry.size()).toBe(3);
  });
});
```

### 7.3 Testing Registry Clear Functionality

```typescript
describe('Registry.clear()', () => {
  it('should clear all registered items', () => {
    const registry = new GenericRegistry<string, number>();

    registry.register('a', 1);
    registry.register('b', 2);
    registry.register('c', 3);

    expect(registry.size()).toBe(3);

    registry.clear();

    expect(registry.size()).toBe(0);
    expect(registry.has('a')).toBe(false);
    expect(registry.has('b')).toBe(false);
    expect(registry.has('c')).toBe(false);
  });
});
```

### 7.4 Testing Registry Iteration

```typescript
describe('Registry Iteration', () => {
  let registry: Registry<string, number>;

  beforeEach(() => {
    registry = new GenericRegistry();
    registry.register('a', 1);
    registry.register('b', 2);
    registry.register('c', 3);
  });

  it('should iterate over keys', () => {
    const keys = Array.from(registry.keys());
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).toContain('c');
    expect(keys.length).toBe(3);
  });

  it('should iterate over values', () => {
    const values = Array.from(registry.values());
    expect(values).toContain(1);
    expect(values).toContain(2);
    expect(values).toContain(3);
    expect(values.length).toBe(3);
  });

  it('should iterate over entries', () => {
    const entries = Array.from(registry.entries());
    expect(entries.length).toBe(3);
    expect(entries).toContainEqual(['a', 1]);
    expect(entries).toContainEqual(['b', 2]);
    expect(entries).toContainEqual(['c', 3]);
  });
});
```

---

## 8. Best Practices Summary

### 8.1 Singleton Testing Best Practices

1. **Always test instance equality** using `toBe()` for reference equality
2. **Test state sharing** across multiple getInstance() calls
3. **Implement a reset method** for testing purposes
4. **Use beforeEach/afterEach** to ensure test isolation
5. **Test private constructor** enforcement
6. **Test async scenarios** if applicable
7. **Document the reset method** as testing-only

### 8.2 Registry Testing Best Practices

1. **Test each method independently** (register, get, has, unregister, clear)
2. **Test edge cases**: empty registry, non-existent keys, duplicate registration
3. **Test type safety** with generics
4. **Test iteration methods** (keys, values, entries)
5. **Test with mock providers** for provider registries
6. **Use descriptive test names** that explain the scenario
7. **Test full lifecycle** operations

### 8.3 Mock Provider Best Practices

1. **Implement Provider interface** faithfully
2. **Add spy capabilities** to track calls
3. **Support configurable behavior** for different test scenarios
4. **Test mock provider usage** in registry
5. **Use clear naming** conventions for mocks

### 8.4 Test Organization

```typescript
describe('ComponentName', () => {
  describe('methodName()', () => {
    describe('when condition is met', () => {
      it('should behave in a certain way', () => {});
    });

    describe('when condition is not met', () => {
      it('should behave differently', () => {});
    });
  });
});
```

---

## 9. Common Pitfalls to Avoid

### 9.1 Singleton Pitfalls

1. **Not resetting between tests** - leads to state leakage
2. **Testing only reference equality** without testing state sharing
3. **Forgetting async scenarios** - getInstance in Promise.all
4. **Not testing constructor privacy** - should prevent direct instantiation

### 9.2 Registry Pitfalls

1. **Not testing duplicate registration** - should throw or handle gracefully
2. **Not testing undefined returns** from get() for non-existent keys
3. **Forgetting to test iteration** methods
4. **Not testing with different key types** (string, symbol, number)
5. **Not testing edge cases** - empty registry, single item, many items

### 9.3 Mock Provider Pitfalls

1. **Not implementing the full interface** - leads to runtime errors
2. **Hard-coded values** - limits test flexibility
3. **Not tracking call counts** - can't verify provider was called
4. **Not testing provider failures** - error handling

---

## 10. Example Test Suite Structure

```typescript
describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let mockProvider: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    mockProvider = new MockProvider('test', 'value');
  });

  afterEach(() => {
    registry.clear();
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const instance1 = ProviderRegistry.getInstance();
      const instance2 = ProviderRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register()', () => {
    it('should register a provider', () => {
      registry.register('test', mockProvider);
      expect(registry.has('test')).toBe(true);
    });

    it('should throw on duplicate registration', () => {
      registry.register('test', mockProvider);
      expect(() => {
        registry.register('test', mockProvider);
      }).toThrow();
    });
  });

  describe('get()', () => {
    it('should return registered provider', () => {
      registry.register('test', mockProvider);
      const retrieved = registry.get('test');
      expect(retrieved).toBe(mockProvider);
    });

    it('should return undefined for non-existent', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered provider', () => {
      registry.register('test', mockProvider);
      expect(registry.has('test')).toBe(true);
    });

    it('should return false for non-existent', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });
});
```

---

## Notes

- Web search tools were unavailable during research due to usage limits
- This document is based on established TypeScript testing best practices
- References to Jest, Vitest, and Mocha testing frameworks are included
- Patterns are applicable to both ProviderRegistry and singleton implementations
- All code examples are TypeScript and follow best practices for type safety

---

## Next Steps for P5M1T2S1

1. Apply these patterns to ProviderRegistry tests
2. Implement reset methods for singleton testing
3. Create mock providers for testing
4. Ensure comprehensive coverage of register(), get(), has() methods
5. Test singleton behavior of ProviderRegistry.getInstance()
