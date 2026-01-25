# Quick Reference: Async Initialization Best Practices

**For:** P1.M3.T1.S2 - Provider Registry Initialization
**Date:** 2025-01-25

---

## TL;DR - What You Need to Know

### 1. Use Promise.allSettled, Not Promise.all

```typescript
// ✅ DO THIS
const results = await Promise.allSettled(
  providers.map(p => p.initialize())
);

// ❌ NOT THIS
await Promise.all(providers.map(p => p.initialize()));
```

**Why:** Promise.allSettled waits for ALL providers and collects all errors. Promise.all fails fast on first error.

---

### 2. Cache Initialization Promises

```typescript
// ✅ DO THIS
private initPromises = new Map<ProviderId, Promise<void>>();

async initializeProvider(id: ProviderId): Promise<void> {
  if (this.initPromises.has(id)) {
    return this.initPromises.get(id)!;
  }

  const promise = this.get(id)!.initialize(options);
  this.initPromises.set(id, promise);
  return promise;
}

// ❌ NOT THIS
private initializing = false;

async initializeProvider(id: ProviderId): Promise<void> {
  if (!this.initializing) {
    this.initializing = true;
    await this.get(id)!.initialize(options);
  }
}
```

**Why:** Prevents duplicate initialization when multiple concurrent calls occur.

---

### 3. Use Enums for Status Tracking

```typescript
// ✅ DO THIS
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed',
}

// ❌ NOT THIS
const status = {
  UNINITIALIZED: 0,
  INITIALIZING: 1,
  INITIALIZED: 2,
  FAILED: 3,
};
```

**Why:** Type-safe, readable, better debugging, enum values in logs.

---

### 4. Retry with Exponential Backoff + Jitter

```typescript
// ✅ DO THIS
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        10000
      );
      const jitter = delay * 0.5 * (Math.random() * 2 - 1);
      await sleep(delay + jitter);
    }
  }
  throw new Error('Unreachable');
}

// ❌ NOT THIS
async function retryWithFixedDelay<T>(
  operation: () => Promise<T>
): Promise<T> {
  while (true) {
    try {
      return await operation();
    } catch {
      await sleep(1000); // No backoff, no jitter
    }
  }
}
```

**Why:** Exponential backoff reduces load on failing services. Jitter prevents thundering herd.

---

### 5. Use Discriminated Unions for Results

```typescript
// ✅ DO THIS
type InitResult =
  | { success: true; providerId: ProviderId }
  | { success: false; providerId: ProviderId; error: Error };

function isSuccess(result: InitResult): result is Extract<InitResult, { success: true }> {
  return result.success === true;
}

// Usage
const result = await initializeProvider('anthropic');
if (isSuccess(result)) {
  console.log(result.providerId); // Type-safe access
}

// ❌ NOT THIS
type InitResult = {
  success?: boolean;
  providerId: ProviderId;
  error?: Error;
};

// Usage
if (result.success) {
  console.log(result.providerId); // Is error defined? TypeScript doesn't know
}
```

**Why:** Type-safe result handling with compiler-assisted narrowing.

---

## Common Gotchas - Don't Make These Mistakes!

### Gotcha 1: Race Conditions

```typescript
// ❌ WRONG
if (!this.initialized) {
  await this.init();
  this.initialized = true;
}

// ✅ CORRECT
if (!this.initPromise) {
  this.initPromise = this.init();
}
return this.initPromise;
```

---

### Gotcha 2: Promise.all Fails Fast

```typescript
// ❌ WRONG - If provider 2 fails, provider 3 never initializes
await Promise.all([p1.init(), p2.init(), p3.init()]);

// ✅ CORRECT - All providers attempt initialization
await Promise.allSettled([p1.init(), p2.init(), p3.init()]);
```

---

### Gotcha 3: Not Retrying Transient Errors

```typescript
// ❌ WRONG - Network timeout causes permanent failure
try {
  await provider.initialize();
} catch (error) {
  throw error; // Too bad, permanently failed
}

// ✅ CORRECT - Retry transient errors
await retryWithBackoff(
  () => provider.initialize(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

---

### Gotcha 4: Circular Dependencies

```typescript
// ❌ WRONG - Infinite loop
async function initWithDeps(id: string) {
  const deps = getDependencies(id);
  for (const dep of deps) {
    await initWithDeps(dep); // Infinite if circular!
  }
}

// ✅ CORRECT - Detect cycles
async function initWithDeps(id: string, inProgress = new Set<string>()) {
  if (inProgress.has(id)) {
    throw new Error(`Circular dependency: ${id}`);
  }
  inProgress.add(id);
  const deps = getDependencies(id);
  for (const dep of deps) {
    await initWithDeps(dep, inProgress);
  }
  inProgress.delete(id);
}
```

---

## Code Templates

### Template 1: Initialize Single Provider

```typescript
async initializeProvider(
  id: ProviderId,
  options?: ProviderOptions
): Promise<void> {
  const provider = this.get(id);
  if (!provider) {
    throw new Error(`Provider '${id}' not registered`);
  }

  let state = this.states.get(id);
  if (!state) {
    state = { status: InitializationStatus.UNINITIALIZED };
    this.states.set(id, state);
  }

  // Return cached promise if already initializing
  if (state.status === InitializationStatus.INITIALIZING && state.initPromise) {
    return state.initPromise;
  }

  // Return immediately if already initialized
  if (state.status === InitializationStatus.INITIALIZED) {
    return;
  }

  // Start initialization
  state.status = InitializationStatus.INITIALIZING;
  state.initPromise = (async () => {
    try {
      await provider.initialize(options);
      state.status = InitializationStatus.INITIALIZED;
      state.initializedAt = Date.now();
      state.error = undefined;
    } catch (error) {
      state.status = InitializationStatus.FAILED;
      state.error = error as Error;
      throw error;
    }
  })();

  return state.initPromise;
}
```

---

### Template 2: Batch Initialize All Providers

```typescript
async initializeAll(
  config: GlobalProviderConfig
): Promise<{
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}> {
  const providerIds = Array.from(this.providers.keys());

  const initPromises = providerIds.map(async (id) => {
    const options = config.providerDefaults?.[id];
    try {
      await this.initializeProvider(id, options);
      return { status: 'success' as const, providerId: id };
    } catch (error) {
      return {
        status: 'failed' as const,
        providerId: id,
        error: error as Error
      };
    }
  });

  const results = await Promise.allSettled(initPromises);

  const success: ProviderId[] = [];
  const failed: Array<{ providerId: ProviderId; error: Error }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.status === 'success') {
        success.push(value.providerId);
      } else {
        failed.push({ providerId: value.providerId, error: value.error });
      }
    }
  }

  return { success, failed };
}
```

---

### Template 3: Retry with Exponential Backoff

```typescript
async initializeProviderWithRetry(
  id: ProviderId,
  options?: ProviderOptions,
  maxRetries = 3,
  baseDelay = 1000
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await this.initializeProvider(id, options);
      return; // Success
    } catch (error) {
      lastError = error as Error;

      // Don't retry permanent errors
      if (this.isPermanentError(error)) {
        throw error;
      }

      // Check if last attempt
      if (attempt === maxRetries) {
        throw new Error(
          `Provider '${id}' failed after ${maxRetries + 1} attempts: ` +
          lastError.message
        );
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        10000
      );
      const jitter = delay * 0.5 * (Math.random() * 2 - 1);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
}

private isPermanentError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const permanentKeywords = [
    'authentication',
    'unauthorized',
    'forbidden',
    'not found',
    'invalid',
    'validation',
  ];
  return permanentKeywords.some(keyword => message.includes(keyword));
}
```

---

## Testing Utilities

```typescript
class ProviderRegistry {
  /**
   * Reset initialization state for testing
   *
   * Use in afterEach() hooks to ensure test isolation.
   * @internal
   */
  _resetInitStateForTesting(): void {
    this.states.clear();
  }

  /**
   * Force initialization state for testing
   *
   * Allows testing specific scenarios without actual initialization.
   * @internal
   */
  _setInitStateForTesting(
    id: ProviderId,
    state: Partial<ProviderInitState>
  ): void {
    this.states.set(id, {
      status: InitializationStatus.UNINITIALIZED,
      ...state
    } as ProviderInitState);
  }
}

// Usage in tests
describe('ProviderRegistry', () => {
  afterEach(() => {
    ProviderRegistry._resetForTesting();
    registry._resetInitStateForTesting();
  });

  it('should handle failed initialization', async () => {
    registry._setInitStateForTesting('anthropic', {
      status: InitializationStatus.FAILED,
      error: new Error('Network timeout')
    });

    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.FAILED);
  });
});
```

---

## URLs - Quick Reference

| Topic | URL |
|-------|-----|
| Promise.allSettled | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled |
| Promise.all | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all |
| TypeScript Enums | https://www.typescriptlang.org/docs/handbook/enums.html |
| Discriminated Unions | https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions |
| Type Guards | https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates |
| Exponential Backoff | https://en.wikipedia.org/wiki/Exponential_backoff |
| Jitter Pattern | https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ |
| Circuit Breaker | https://martinfowler.com/bliki/CircuitBreaker.html |

---

## Implementation Checklist

- [ ] Add `ProviderInitState` interface
- [ ] Add `InitializationStatus` enum
- [ ] Add `initializeProvider()` method
- [ ] Add `initializeAll()` method with Promise.allSettled
- [ ] Add `getStatus()` method
- [ ] Add `isReady()` method
- [ ] Add `getAllStatuses()` method
- [ ] Add retry logic with exponential backoff
- [ ] Add testing utilities
- [ ] Write comprehensive tests
- [ ] Document with JSDoc comments

---

## Top 5 Takeaways

1. **Promise.allSettled > Promise.all** for batch initialization
2. **Cache promises** to prevent duplicate initialization
3. **Use enums** for type-safe status tracking
4. **Exponential backoff with jitter** for retries
5. **Discriminated unions** for type-safe results

---

**Remember:** The goal is to have a robust provider registry that:
- Initializes all providers independently
- Handles partial failures gracefully
- Provides clear status information
- Retries transient failures
- Doesn't crash on errors

**Good luck with P1.M3.T1.S2!**
