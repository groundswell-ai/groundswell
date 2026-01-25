# Singleton Pattern Best Practices in TypeScript

## Standard Implementation

```typescript
class Singleton {
    private static instance: Singleton;
    private constructor() {
        // Private constructor prevents instantiation
    }

    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }

    public businessLogic(): void {
        // Business logic here
    }
}

// Usage
const singleton = Singleton.getInstance();
```

## Best Practice: Lazy Initialization (Standard for TypeScript)

```typescript
class Singleton {
    private static instance: Singleton;

    private constructor() {}

    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
```

## Type-Safe Generic Registry Pattern

```typescript
interface RegistryItem {
    id: string;
    name: string;
}

class TypedRegistry<T extends RegistryItem> {
    private registry = new Map<string, T>();

    register(item: T): void {
        if (this.registry.has(item.id)) {
            throw new Error(`Item with id '${item.id}' already exists`);
        }
        this.registry.set(item.id, item);
    }

    get(id: string): T | undefined {
        return this.registry.get(id);
    }

    has(id: string): boolean {
        return this.registry.has(id);
    }

    unregister(id: string): boolean {
        return this.registry.delete(id);
    }

    getAll(): T[] {
        return Array.from(this.registry.values());
    }

    clear(): void {
        this.registry.clear();
    }
}
```

## Common Pitfalls When Implementing Singletons in TypeScript

### Pitfall 1: Testing Difficulties (Global State)

**Problem:** Singletons create global state that persists between tests.

```typescript
// ❌ Problematic
class Config {
    private static instance: Config;
    private data: Record<string, any> = {};

    static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
}

// Tests affect each other
test('sets config value', () => {
    Config.getInstance().set('key', 'value1');
    expect(Config.getInstance().get('key')).toBe('value1');
});

test('reads config value', () => {
    // This test fails because previous test's state persists
    expect(Config.getInstance().get('key')).toBeUndefined();
});
```

**Solution:** Add reset functionality for testing.

```typescript
// ✅ Better
class Config {
    private static instance: Config;
    private data: Record<string, any> = {};

    private constructor() {}

    static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    set(key: string, value: string): void {
        this.data[key] = value;
    }

    get(key: string): string | undefined {
        return this.data[key];
    }

    // Testing utility - CRITICAL for testability
    static _resetForTesting(): void {
        Config.instance = null as any;
        Config.data = {}; // Also reset data if needed
    }
}

afterEach(() => {
    Config._resetForTesting();
});
```

### Pitfall 2: Hidden Dependencies

**Problem:** Singletons create implicit dependencies not visible in function signatures.

```typescript
// ❌ Hidden dependency
class UserService {
    getUser(id: string) {
        // Hidden dependency on Database singleton
        return Database.getInstance().query(id);
    }
}
```

**Solution:** Use dependency injection where possible, but for singleton registry pattern, this is acceptable as the registry IS the dependency injection mechanism.

### Pitfall 3: Memory Leaks

**Problem:** Singletons holding references prevent garbage collection.

```typescript
// ❌ Memory leak potential
class CacheManager {
    private cache: Map<string, any> = new Map();

    set(key: string, value: any): void {
        this.cache.set(key, value);
    }
    // No cleanup mechanism!
}
```

**Solution:** Implement cleanup mechanisms (for future S3 - terminate/clear).

```typescript
// ✅ With cleanup (for P1.M3.T1.S3)
class ProviderRegistry {
    private providers: Map<ProviderId, Provider> = new Map();

    // Clear method for cleanup
    clear(): void {
        this.providers.clear();
    }
}
```

### Pitfall 4: Async Safety (Not Thread Safety, But Related)

```typescript
// ❌ Unsafe with async operations
class UnsafeAsyncSingleton {
    private static instance: UnsafeAsyncSingleton;
    private initialized = false;

    static async getInstance(): Promise<UnsafeAsyncSingleton> {
        if (!UnsafeAsyncSingleton.instance) {
            UnsafeAsyncSingleton.instance = new UnsafeAsyncSingleton();
            // Multiple concurrent calls could initialize multiple times
            await UnsafeAsyncSingleton.instance.init();
        }
        return UnsafeAsyncSingleton.instance;
    }

    private async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        // Async initialization
    }
}

// ✅ Safe with promise caching (for S2 - initializeAll)
class SafeAsyncRegistry {
    private static instance: SafeAsyncRegistry | null = null;
    private static initPromise: Promise<SafeAsyncRegistry> | null = null;
    private initialized = false;

    static async getInstance(): Promise<SafeAsyncRegistry> {
        if (SafeAsyncRegistry.instance) {
            return SafeAsyncRegistry.instance;
        }

        if (!SafeAsyncRegistry.initPromise) {
            SafeAsyncRegistry.initPromise = (async () => {
                const instance = new SafeAsyncRegistry();
                await instance.initialize();
                SafeAsyncRegistry.instance = instance;
                return instance;
            })();
        }

        return SafeAsyncRegistry.initPromise;
    }

    private async initialize(): Promise<void> {
        // Async initialization
        this.initialized = true;
    }
}
```

## Thread Safety in TypeScript

### JavaScript is Single-Threaded (Mostly)

**Key Insight:** JavaScript (and TypeScript) runs on a single thread in the main execution context. Traditional multi-threading race conditions don't occur.

```typescript
// ✅ Safe in single-threaded JS
class Singleton {
    private static instance: Singleton;

    static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
```

## Testing Singleton Classes - Best Practices

### Strategy 1: Reset Between Tests (Preferred for our use case)

```typescript
class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<ProviderId, Provider> = new Map();

    private constructor() {}

    static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    register(provider: Provider): void {
        this.providers.set(provider.id, provider);
    }

    get(id: ProviderId): Provider | undefined {
        return this.providers.get(id);
    }

    has(id: ProviderId): boolean {
        return this.providers.has(id);
    }

    // Testing utility - CRITICAL for testability
    static _resetForTesting(): void {
        ProviderRegistry.instance = null as any;
    }

    _clearProvidersForTesting(): void {
        this.providers.clear();
    }
}

// Vitest tests
describe('ProviderRegistry', () => {
    afterEach(() => {
        ProviderRegistry._resetForTesting();
    });

    test('should register and retrieve providers', () => {
        const registry = ProviderRegistry.getInstance();
        const provider = createMockProvider('anthropic');

        registry.register(provider);

        expect(registry.has('anthropic')).toBe(true);
        expect(registry.get('anthropic')).toBe(provider);
    });

    test('should maintain single instance', () => {
        const registry1 = ProviderRegistry.getInstance();
        const registry2 = ProviderRegistry.getInstance();

        registry1.register(createMockProvider('test'));

        expect(registry2.get('test')).toBeDefined();
        expect(registry1).toBe(registry2);
    });

    test('should start fresh after reset', () => {
        const registry1 = ProviderRegistry.getInstance();
        registry1.register(createMockProvider('test'));

        ProviderRegistry._resetForTesting();

        const registry2 = ProviderRegistry.getInstance();
        expect(registry2.has('test')).toBe(false);
    });
});
```

## Key Takeaways Summary

### Singleton Pattern Best Practices
1. **Use lazy initialization** for TypeScript (standard pattern)
2. **Add reset methods** for testing (marked as internal/testing)
3. **Use Map** for registry storage (O(1) lookups)
4. **Throw on duplicate registration** (fail fast)
5. **Return undefined** for missing items (not throwing)

### Registry Pattern Best Practices
1. **Use generic types** for type safety: `Map<ProviderId, Provider>`
2. **Implement proper error handling** for duplicate keys
3. **Provide clear/reset methods** for testing
4. **Consider cleanup methods** for future use (S3)
5. **Use has() method** for existence checks

### Common Pitfalls to Avoid
1. **Global state in tests** - always reset between tests
2. **Memory leaks** - implement clear/cleanup methods
3. **Async race conditions** - cache promises for async initialization (S2)
4. **Testing difficulties** - provide _resetForTesting() method

### Testing Best Practices
1. **Reset instances** between tests
2. **Test singleton behavior** (same instance reference)
3. **Test registry operations** (register, get, has)
4. **Test error cases** (duplicate registration)
5. **Use afterEach hooks** for cleanup
