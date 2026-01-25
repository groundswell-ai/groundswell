# Async Initialization Research - URLs and Key Insights

**Task:** P1.M3.T1.S2 - Implement provider initialization in registry
**Research Date:** 2025-01-25
**Focus:** Best practices with specific documentation URLs

---

## 1. Async Initialization Patterns for Service Registries

### Key Pattern: Promise Caching for Single Initialization

**Problem Solved:** Prevents duplicate initialization when multiple concurrent requests occur.

```typescript
interface ProviderInitState {
  status: 'uninitialized' | 'initializing' | 'initialized' | 'failed';
  initPromise?: Promise<void>;  // KEY: Cache the promise, not just state
  error?: Error;
}
```

**Best Practice:** Store the initialization promise to ensure concurrent callers await the same operation.

**Gotcha:** Without promise caching, race conditions occur:
```typescript
// ❌ WRONG: Multiple concurrent calls create duplicate initialization
if (!this.initialized) {
  await this.init();
  this.initialized = true;
}

// ✅ CORRECT: Cache promise for concurrent calls
if (!this.initPromise) {
  this.initPromise = this.init();
}
return this.initPromise;
```

---

### Key Pattern: Lazy Initialization

**URL:** https://basarat.gitbook.io/typescript/async-await#lazy-initialization

**Concept:** Defer initialization until first use.

```typescript
class LazyProvider {
  private instance?: Provider;
  private initPromise?: Promise<Provider>;

  async get(): Promise<Provider> {
    if (this.instance) return this.instance;

    if (!this.initPromise) {
      this.initPromise = this.createProvider();
    }

    this.instance = await this.initPromise;
    return this.instance;
  }
}
```

**Benefits:**
- Faster application startup
- Only initialize what's needed
- Reduced memory footprint

---

### Key Pattern: Singleton with Async Init

**URL:** https://khalilstemmler.com/articles/typescript-dependency-injection-singleton-pattern/

**Concept:** Combine singleton pattern with async initialization.

```typescript
class AsyncSingleton {
  private static instance: Promise<AsyncSingleton>;

  static async getInstance(): Promise<AsyncSingleton> {
    if (!AsyncSingleton.instance) {
      AsyncSingleton.instance = new AsyncSingleton().init();
    }
    return AsyncSingleton.instance;
  }

  private async init(): Promise<AsyncSingleton> {
    // Async initialization
    return this;
  }
}
```

**Key Insight:** The singleton itself is a Promise, ensuring initialization completes before use.

---

## 2. Error Handling for Batch Async Operations

### Promise.allSettled Documentation

**URL:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

**Key Features:**
- Waits for ALL promises to complete (fulfilled OR rejected)
- NEVER rejects - always resolves
- Returns array of status objects with `{status, value/reason}`

**TypeScript Types:**
```typescript
type PromiseSettledResult<T> =
  | PromiseFulfilledResult<T>
  | PromiseRejectedResult;

interface PromiseFulfilledResult<T> {
  status: 'fulfilled';
  value: T;
}

interface PromiseRejectedResult {
  status: 'rejected';
  reason: unknown;
}
```

---

### Promise.all Documentation

**URL:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all

**Key Features:**
- Fails FAST on first rejection
- Rejects with first rejection reason
- Other promises continue running but results are lost

**When to Use:**
- All-or-nothing operations
- All operations must succeed
- Fast failure is desired

**When NOT to Use:**
- Independent operations where partial success is OK
- When you need all errors collected
- Provider initialization (use allSettled instead)

---

### Promise.allSettled vs Promise.all Comparison

| Feature | Promise.all | Promise.allSettled |
|---------|-------------|-------------------|
| **Error Behavior** | Fails fast on first rejection | Waits for all promises |
| **Return Type** | `Promise<T[]>` | `Promise<PromiseSettledResult<T>[]>` |
| **Rejects?** | Yes (if any promise rejects) | No (never rejects) |
| **Error Collection** | Only first error | All errors |
| **Use Case** | All-or-nothing | Partial success OK |
| **For Registry** | ❌ Too strict | ✅ Preferred |

**Decision for ProviderRegistry:** Use `Promise.allSettled` because:
1. Providers are independent resources
2. Partial success is acceptable
3. Need to collect all initialization errors
4. Better user experience (some providers available vs none)

---

### Error Aggregation Pattern

**URL:** https://javascript.info/promise-error-handling

```typescript
interface BatchError {
  providerId: ProviderId;
  error: Error;
}

async function initializeAll(
  providers: Provider[]
): Promise<{ success: ProviderId[]; failed: BatchError[] }> {
  const results = await Promise.allSettled(
    providers.map(p => p.initialize())
  );

  const success: ProviderId[] = [];
  const failed: BatchError[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success.push(providers[index].id);
    } else {
      failed.push({
        providerId: providers[index].id,
        error: result.reason
      });
    }
  });

  return { success, failed };
}
```

---

## 3. Status Tracking for Initialization States

### TypeScript Enum Documentation

**URL:** https://www.typescriptlang.org/docs/handbook/enums.html

**Why Enums for Status Tracking:**
- Type-safe status values
- Clear intent and readability
- Compiler-assisted exhaustiveness checks
- Better than string literals or magic numbers

```typescript
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed',
  DEGRADED = 'degraded',
}

// Type-safe status checking
function canRetry(status: InitializationStatus): boolean {
  return status === InitializationStatus.FAILED;
}
```

---

### State Machine Pattern

**URL:** https://refactoring.guru/design-patterns/state

**Concept:** Model initialization as a state machine with valid transitions.

```typescript
const VALID_TRANSITIONS: Record<InitializationStatus, InitializationStatus[]> = {
  [InitializationStatus.UNINITIALIZED]: [InitializationStatus.INITIALIZING],
  [InitializationStatus.INITIALIZING]: [
    InitializationStatus.INITIALIZED,
    InitializationStatus.FAILED,
    InitializationStatus.DEGRADED,
  ],
  [InitializationStatus.INITIALIZED]: [InitializationStatus.FAILED],
  [InitializationStatus.FAILED]: [InitializationStatus.INITIALIZING],
  [InitializationStatus.DEGRADED]: [
    InitializationStatus.INITIALIZED,
    InitializationStatus.FAILED,
  ],
};
```

**Benefits:**
- Prevents invalid state changes
- Clear lifecycle management
- Easier debugging
- Testable state transitions

---

### Discriminated Union Pattern

**URL:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions

**Concept:** Use discriminated unions for type-safe result handling.

```typescript
type InitResult =
  | { success: true; providerId: ProviderId }
  | { success: false; providerId: ProviderId; error: Error };

// Type guard for narrowing
function isSuccess(result: InitResult): result is Extract<InitResult, { success: true }> {
  return result.success === true;
}

// Usage with type narrowing
const result = await initializeProvider('anthropic');
if (isSuccess(result)) {
  console.log(result.providerId); // TypeScript knows success === true
}
```

---

## 4. Retry Patterns for Failed Initializations

### Exponential Backoff Pattern

**URL:** https://en.wikipedia.org/wiki/Exponential_backoff

**Algorithm:**
1. Start with base delay (e.g., 1000ms)
2. After each failure, multiply delay by backoff factor (e.g., 2)
3. Add random jitter to prevent synchronization
4. Cap at maximum delay

**Formula:**
```
delay = min(baseDelay * (backoffFactor ^ attempt), maxDelay)
jitteredDelay = delay + (random(-1, 1) * jitterFactor * delay)
```

**Example:**
- Attempt 0: 1000ms ± 250ms (50% jitter)
- Attempt 1: 2000ms ± 500ms
- Attempt 2: 4000ms ± 1000ms
- Attempt 3: 8000ms (capped at maxDelay)

---

### Jitter Pattern

**URL:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

**Why Jitter?**
- Prevents "thundering herd" problem
- Multiple services retrying simultaneously
- Distributed system synchronization
- Better load distribution

**Types of Jitter:**
1. **Full Jitter:** Random between 0 and delay
2. **Equal Jitter:** baseDelay/2 + random(0, baseDelay/2)
3. **Decorrelated Jitter:** random(baseDelay, previousDelay * 3)

**Recommendation:** Use full jitter with 50% factor:
```typescript
const jitter = delay * 0.5 * (Math.random() * 2 - 1);
const jitteredDelay = delay + jitter;
```

---

### Retry Pattern Implementation

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry permanent errors
      if (isPermanentError(error)) {
        throw error;
      }

      // Check if last attempt
      if (attempt === config.maxRetries) {
        throw new Error(
          `Operation failed after ${config.maxRetries} retries: ${lastError.message}`
        );
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
      await sleep(Math.max(0, delay + jitter));
    }
  }

  throw lastError;
}

function isPermanentError(error: Error): boolean {
  const permanentKeywords = [
    'authentication',
    'unauthorized',
    'forbidden',
    'not found',
    'invalid',
    'validation',
  ];
  return permanentKeywords.some(keyword =>
    error.message.toLowerCase().includes(keyword)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### Circuit Breaker Pattern

**URL:** https://martinfowler.com/bliki/CircuitBreaker.html

**Concept:** Prevent cascading failures by temporarily disabling failing services.

**States:**
1. **Closed:** Normal operation, requests pass through
2. **Open:** Failing, requests immediately rejected
3. **Half-Open:** Testing if service recovered

**Implementation:**
```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private openedAt?: number;

  constructor(
    private failureThreshold: number,
    private recoveryTimeout: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt > this.recoveryTimeout;
  }
}
```

---

## 5. TypeScript Typing for Async Operations

### Generic Async Functions

**URL:** https://www.typescriptlang.org/docs/handbook/2/generics.html

**Concept:** Use generics to preserve type information through async operations.

```typescript
// Generic async wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
  throw new Error('Unreachable');
}

// Type is preserved
const result = await withRetry(
  () => fetchUser(123),
  3
); // Type: Promise<User>
```

---

### Type Guards for Async Results

**URL:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

**Concept:** Use type guards to narrow discriminated union types.

```typescript
type AsyncResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function isSuccess<T>(result: AsyncResult<T>): result is Extract<AsyncResult<T>, { status: 'success' }> {
  return result.status === 'success';
}

function isError<T>(result: AsyncResult<T>): result is Extract<AsyncResult<T>, { status: 'error' }> {
  return result.status === 'error';
}

// Usage
const result = await fetchData();
if (isSuccess(result)) {
  console.log(result.data); // TypeScript knows this is safe
}
```

---

### Promise Utility Types

**URL:** https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype

**TypeScript Built-in Utility Types:**

```typescript
// Awaited<T> - Unwraps nested promises
type UnwrappedPromise = Awaited<Promise<Promise<string>>>; // string

// ReturnType<T> - Gets return type of function
type FetchReturn = ReturnType<typeof fetch>; // Promise<Response>

// Parameters<T> - Gets parameter types
type FetchParams = Parameters<typeof fetch>; // [string, RequestInit?]
```

---

### Async Resource Wrapper Pattern

```typescript
/**
 * Generic async resource wrapper
 *
 * Ensures initialization happens only once and provides
 * type-safe access to the initialized resource.
 */
class AsyncResource<T> {
  private value?: T;
  private initPromise?: Promise<T>;
  private initialized = false;

  constructor(
    private readonly initializer: () => Promise<T>
  ) {}

  /**
   * Get the initialized value
   *
   * Lazy initialization: value is initialized on first access.
   * Subsequent calls return the cached value immediately.
   */
  async get(): Promise<T> {
    // Fast path: already initialized
    if (this.initialized && this.value !== undefined) {
      return this.value;
    }

    // Medium path: initialization in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Slow path: first access, start initialization
    this.initPromise = this.initializer();
    this.value = await this.initPromise;
    this.initialized = true;

    return this.value;
  }

  /**
   * Check if resource is initialized
   *
   * Synchronous check for initialization status.
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Reset for testing
   *
   * Clears cached state to allow re-initialization.
   * @internal
   */
  _reset(): void {
    this.value = undefined;
    this.initPromise = undefined;
    this.initialized = false;
  }
}

// Usage
const providerResource = new AsyncResource(() =>
  initializeAnthropicProvider({ apiKey: 'sk-...' })
);

const provider = await providerResource.get(); // Type: Promise<Provider>
console.log(providerResource.isReady()); // true
```

---

## 6. Common Gotchas (Don't Make These Mistakes!)

### Gotcha 1: Race Conditions in Lazy Init

**Problem:** Multiple concurrent calls trigger duplicate initialization.

```typescript
// ❌ WRONG: Race condition
class BadLazy {
  private initialized = false;

  async init() {
    if (!this.initialized) {
      // Multiple concurrent calls ALL execute this
      await this.doInit();
      this.initialized = true;
    }
  }
}

// ✅ CORRECT: Promise caching
class GoodLazy {
  private initPromise?: Promise<void>;

  async init() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }
}
```

---

### Gotcha 2: Promise.all Fails Fast

**Problem:** One failure aborts all pending operations.

```typescript
// ❌ WRONG: If provider 2 fails, provider 3 never initializes
await Promise.all([
  provider1.initialize(),
  provider2.initialize(), // Fails
  provider3.initialize(), // Never runs
]);

// ✅ CORRECT: All providers attempt initialization
const results = await Promise.allSettled([
  provider1.initialize(),
  provider2.initialize(),
  provider3.initialize(),
]);
// All three run, collect successes and failures
```

---

### Gotcha 3: Unhandled Promise Rejections

**Problem:** Failed promises cause process crashes.

```typescript
// ❌ WRONG: Unhandled rejection
provider.initialize().catch(err => {
  console.error('Init failed', err);
});
// Promise still rejected, may crash process

// ✅ CORRECT: Handle all rejections
try {
  await provider.initialize();
} catch (error) {
  console.error('Init failed', error);
  // Handle gracefully, don't crash
}
```

---

### Gotcha 4: Not Retrying Transient Errors

**Problem:** Temporary failures cause permanent outages.

```typescript
// ❌ WRONG: No retry on network errors
try {
  await provider.initialize();
} catch (error) {
  // Network timeout? Too bad, permanently failed
  throw error;
}

// ✅ CORRECT: Retry transient errors
await retryWithBackoff(
  () => provider.initialize(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

---

### Gotcha 5: Circular Dependency Loops

**Problem:** Circular dependencies cause infinite loops.

```typescript
// ❌ WRONG: No cycle detection
async function initWithDeps(id: string) {
  const deps = getDependencies(id);
  for (const dep of deps) {
    await initWithDeps(dep); // Infinite if circular!
  }
  await initialize(id);
}

// ✅ CORRECT: Detect and reject cycles
async function initWithDeps(
  id: string,
  inProgress = new Set<string>()
) {
  if (inProgress.has(id)) {
    throw new Error(`Circular dependency: ${id}`);
  }

  inProgress.add(id);

  const deps = getDependencies(id);
  for (const dep of deps) {
    await initWithDeps(dep, inProgress);
  }

  await initialize(id);

  inProgress.delete(id);
}
```

---

### Gotcha 6: Memory Leaks from Cached Promises

**Problem:** Failed promises never cleared, can't retry.

```typescript
// ❌ WRONG: Never clears failed promises
class BadCache {
  private initPromise?: Promise<void>;

  async init() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
    // If it fails, initPromise is still set, can't retry
  }
}

// ✅ CORRECT: Clear failed promises
class GoodCache {
  private initPromise?: Promise<void>;
  private failed = false;

  async init() {
    if (this.failed) {
      // Clear failed state, allow retry
      this.initPromise = undefined;
      this.failed = false;
    }

    if (!this.initPromise) {
      this.initPromise = this.doInit().catch(err => {
        this.failed = true;
        throw err;
      });
    }

    return this.initPromise;
  }
}
```

---

## 7. Implementation Checklist

### Interfaces to Add

- [ ] `ProviderInitState` - initialization state tracking
- [ ] `InitializationStatus` enum - status values
- [ ] `BatchInitResult` - batch initialization results
- [ ] `RetryConfig` - retry configuration options

### Methods to Implement

- [ ] `initializeProvider(id, options?)` - single provider init
- [ ] `initializeAll(config)` - batch init with Promise.allSettled
- [ ] `getStatus(id)` - get provider status
- [ ] `isReady(id)` - check if provider ready
- [ ] `getAllStatuses()` - get all statuses
- [ ] `retryWithBackoff()` - retry with exponential backoff

### Error Handling

- [ ] Use Promise.allSettled for batch operations
- [ ] Aggregate errors in BatchInitResult
- [ ] Provide both strict and lenient init modes
- [ ] Distinguish permanent vs transient errors
- [ ] Log failures but don't crash (lenient mode)

### Testing

- [ ] `_resetInitStateForTesting()` - clear cached state
- [ ] `_setInitStateForTesting(id, state)` - force state for tests
- [ ] Tests for promise caching
- [ ] Tests for batch initialization
- [ ] Tests for retry logic
- [ ] Tests for status transitions

---

## 8. Documentation URLs Reference

### Core JavaScript/TypeScript

- **Promise.allSettled:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **Promise.all:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- **Async/Await:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- **TypeScript Enums:** https://www.typescriptlang.org/docs/handbook/enums.html
- **TypeScript Generics:** https://www.typescriptlang.org/docs/handbook/2/generics.html
- **Discriminated Unions:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
- **Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

### Design Patterns

- **State Pattern:** https://refactoring.guru/design-patterns/state
- **Circuit Breaker:** https://martinfowler.com/bliki/CircuitBreaker.html
- **Singleton Pattern:** https://khalilstemmler.com/articles/typescript-dependency-injection-singleton-pattern/

### Best Practices

- **Exponential Backoff:** https://en.wikipedia.org/wiki/Exponential_backoff
- **Jitter Pattern:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **Promise Error Handling:** https://javascript.info/promise-error-handling
- **Node.js Async Best Practices:** https://nodejs.dev/learn
- **TypeScript Deep Dive - Async:** https://basarat.gitbook.io/typescript/async-await

---

## Summary: Top 10 Key Insights

1. **Use Promise.allSettled** for batch initialization (not Promise.all)
2. **Cache initialization promises** to prevent duplicate work
3. **Use enum-based status tracking** for type safety
4. **Implement exponential backoff with jitter** for retries
5. **Use discriminated unions** for type-safe result handling
6. **Detect circular dependencies** before initialization
7. **Distinguish permanent vs transient errors** for retry logic
8. **Provide both strict and lenient** initialization modes
9. **Add testing utilities** for initialization state management
10. **Log failures but don't crash** in lenient mode

---

**Research Complete:** Ready for implementation in P1.M3.T1.S2
**Key Recommendation:** Implement Promise.allSettled with promise caching and enum-based status tracking
