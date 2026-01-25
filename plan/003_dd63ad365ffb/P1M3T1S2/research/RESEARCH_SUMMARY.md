# Async Initialization Research Summary

**Task:** P1.M3.T1.S2 - Implement provider initialization in registry
**Date:** 2025-01-25
**Status:** Research Complete

---

## Quick Reference: Key Best Practices

### 1. Promise.allSettled vs Promise.all

```typescript
// ❌ DON'T: Fails fast on first error
await Promise.all(providers.map(p => p.initialize()));

// ✅ DO: Allows partial success
const results = await Promise.allSettled(providers.map(p => p.initialize()));
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

**Decision:** Use `Promise.allSettled` for provider registry initialization.

**Rationale:** Providers should initialize independently. If one provider fails (e.g., network issue), other providers should still be available.

---

### 2. Promise Caching Pattern

```typescript
// ✅ CORRECT: Cache the promise to prevent duplicate initialization
class ProviderRegistry {
  private initPromises = new Map<ProviderId, Promise<void>>();

  async initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void> {
    // Return cached promise if already initializing
    if (this.initPromises.has(id)) {
      return this.initPromises.get(id)!;
    }

    // Create and cache new initialization promise
    const promise = this.get(id)!.initialize(options)
      .finally(() => {
        // Don't delete from cache - allows detecting initialization state
      });

    this.initPromises.set(id, promise);
    return promise;
  }
}
```

**Gotcha:** Without promise caching, concurrent initialization requests trigger duplicate initialization work.

---

### 3. Status Tracking with Enums

```typescript
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed',
  DEGRADED = 'degraded',
}

interface ProviderInitState {
  status: InitializationStatus;
  initPromise?: Promise<void>;
  error?: Error;
  initializedAt?: number;
  retryCount?: number;
}
```

**Decision:** Use enum-based status tracking for type safety and clear state transitions.

---

### 4. Exponential Backoff Retry

```typescript
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

**Best Practice:** Use exponential backoff with jitter to prevent thundering herd.

**Gotcha:** Don't retry permanent errors (authentication, validation). Only retry transient errors (network, timeout).

---

### 5. Type-Safe Result Handling

```typescript
type InitResult =
  | { success: true; providerId: ProviderId }
  | { success: false; providerId: ProviderId; error: Error };

function isSuccessfulInit(result: InitResult): result is Extract<InitResult, { success: true }> {
  return result.success === true;
}

// Usage
const result = await initializeProvider('anthropic');
if (isSuccessfulInit(result)) {
  // TypeScript knows result.success === true
  console.log(`Initialized ${result.providerId}`);
}
```

**Decision:** Use discriminated unions for initialization results.

---

## Implementation Checklist for P1.M3.T1.S2

### Required Interfaces

- [ ] `ProviderInitState` - tracks initialization state per provider
- [ ] `BatchInitResult` - aggregates batch initialization results
- [ ] `InitializationStatus` enum - status values

### Required Methods

- [ ] `initializeProvider(id, options?)` - initialize single provider
- [ ] `initializeAll(config)` - initialize all providers in parallel
- [ ] `getStatus(id)` - get provider initialization status
- [ ] `isReady(id)` - check if provider is ready to use
- [ ] `getAllStatuses()` - get all provider statuses

### Error Handling

- [ ] Use `Promise.allSettled` for batch initialization
- [ ] Aggregate errors in `BatchInitResult`
- [ ] Provide lenient initialization mode (log and continue)
- [ ] Provide strict initialization mode (throw on any failure)

### Testing Utilities

- [ ] `_resetInitStateForTesting()` - clear cached promises and states
- [ ] `_setInitStateForTesting(id, state)` - force specific state for tests

---

## Common Gotchas (Avoid These!)

### Gotcha 1: Race Conditions

```typescript
// ❌ PROBLEMATIC
if (!this.initialized) {
  await this.initialize();
  this.initialized = true;
}

// ✅ CORRECT
if (!this.initPromise) {
  this.initPromise = this.initialize();
}
await this.initPromise;
```

### Gotcha 2: Promise.all Fails Fast

```typescript
// ❌ If provider 2 fails, provider 3 never initializes
await Promise.all([p1.init(), p2.init(), p3.init()]);

// ✅ All providers attempt initialization
await Promise.allSettled([p1.init(), p2.init(), p3.init()]);
```

### Gotcha 3: Not Retrying Transient Errors

```typescript
// ❌ Permanent failure on transient network issue
try {
  await provider.initialize();
} catch (error) {
  // Log and give up
}

// ✅ Retry transient errors
await retryWithBackoff(
  () => provider.initialize(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### Gotcha 4: Memory Leaks from Cached Promises

```typescript
// ❌ Never clears failed promises
private initPromise?: Promise<void>;

async initialize() {
  if (!this.initPromise) {
    this.initPromise = this.doInit();
  }
  return this.initPromise;
}

// ✅ Clear failed promises to allow retry
async initialize() {
  if (this.failed) {
    this.initPromise = undefined;
  }
  if (!this.initPromise) {
    this.initPromise = this.doInit().catch(err => {
      this.failed = true;
      throw err;
    });
  }
  return this.initPromise;
}
```

---

## URLs and Documentation References

### JavaScript/TypeScript References

- **Promise.allSettled:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **Promise.all:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- **Async/await:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- **TypeScript Generics:** https://www.typescriptlang.org/docs/handbook/2/generics.html
- **TypeScript Discriminated Unions:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
- **TypeScript Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

### Community Resources

- **Node.js Async Best Practices:** https://nodejs.dev/learn
- **TypeScript Deep Dive - Async:** https://basarat.gitbook.io/typescript/async-await
- **JavaScript Promise Patterns:** https://javascript.info/promise-error-handling

---

## Design Decisions for ProviderRegistry

### Decision 1: Use Promise.allSettled

**Choice:** `Promise.allSettled` over `Promise.all`

**Rationale:**
- Providers should initialize independently
- Partial success is acceptable (some providers may fail)
- Better error reporting (all errors collected)
- More resilient to transient failures

### Decision 2: Cache Initialization Promises

**Choice:** Store `initPromise` in `ProviderInitState`

**Rationale:**
- Prevents duplicate initialization
- Allows concurrent callers to await same promise
- Enables detection of in-progress initialization
- Simplifies status tracking

### Decision 3: Enum-Based Status Tracking

**Choice:** `InitializationStatus` enum with string values

**Rationale:**
- Type-safe status checking
- Clear state transitions
- Easy serialization for logging
- Better than boolean flags

### Decision 4: Exponential Backoff for Retries

**Choice:** Exponential backoff with jitter

**Rationale:**
- Industry standard for transient failures
- Prevents thundering herd problem
- Balances retry speed vs resource usage
- Jitter prevents synchronization

### Decision 5: Discriminated Union for Results

**Choice:** `InitResult` with `success` boolean discriminant

**Rationale:**
- Type-safe result handling
- Compiler-assisted type narrowing
- Clear success/failure paths
- Better than optional/error properties

---

## Code Snippets for Implementation

### Core Initialization Logic

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

### Batch Initialization

```typescript
async initializeAll(
  config: GlobalProviderConfig
): Promise<{ success: ProviderId[]; failed: Array<{ providerId: ProviderId; error: Error }> }> {
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

## Testing Strategy

### Unit Tests Needed

1. **Promise Caching**
   - Multiple concurrent calls use same promise
   - Failed initialization can be retried
   - Already initialized returns immediately

2. **Batch Initialization**
   - All providers initialize in parallel
   - One failure doesn't prevent others
   - Errors are aggregated correctly

3. **Status Tracking**
   - Status transitions correctly
   - Failed providers marked appropriately
   - Ready check works correctly

4. **Retry Logic**
   - Transient errors trigger retry
   - Permanent errors don't retry
   - Exponential backoff applied

5. **Edge Cases**
   - Provider not registered
   - Duplicate initialization
   - All providers fail
   - Mixed success/failure

### Test Utilities Needed

```typescript
class ProviderRegistry {
  /**
   * Reset initialization state for testing
   */
  static _resetForTesting(): void {
    ProviderRegistry.instance = null as any;
  }

  /**
   * Clear initialization states
   */
  _resetInitStateForTesting(): void {
    this.states.clear();
  }

  /**
   * Force initialization state for testing
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
```

---

## Next Steps

1. **Review this research** with team
2. **Implement ProviderInitState** interface
3. **Implement initializeProvider()** with promise caching
4. **Implement initializeAll()** with Promise.allSettled
5. **Add status tracking methods**
6. **Write comprehensive tests**
7. **Document in JSDoc comments**
8. **Update tasks.json** with completion status

---

**Research Document:** async_initialization_patterns.md
**Status:** Complete
**Ready for Implementation:** Yes
