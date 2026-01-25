# Async Initialization Patterns for TypeScript Service Registries

**Research Date:** 2025-01-25
**Task:** P1.M3.T1.S2 - Implement provider initialization in registry
**Focus:** Async initialization patterns, error handling, status tracking, retry patterns

---

## Executive Summary

This document compiles best practices for async initialization patterns in TypeScript, specifically for service/provider registries. Due to web search API rate limits, this research is based on established TypeScript patterns, community best practices, and the specific requirements of the groundswell ProviderRegistry implementation.

**Key Findings:**
- **Promise.allSettled** is superior to Promise.all for batch initialization (partial success tolerance)
- **Status tracking enums** provide type-safe initialization state management
- **Promise caching** prevents duplicate initialization attempts
- **Exponential backoff** is the standard retry pattern for transient failures
- **Discriminated unions** enable type-safe result handling

---

## 1. Async Initialization Patterns for Service Registries

### Pattern 1.1: Promise Caching for Single Initialization

**Problem:** Multiple concurrent calls to initialize the same provider should not trigger duplicate initialization.

**Solution:** Cache the initialization promise.

```typescript
/**
 * Provider initialization state with promise caching
 *
 * Prevents duplicate initialization by caching the promise.
 * Multiple concurrent calls await the same promise.
 */
interface ProviderInitState {
  /** Current initialization status */
  status: 'uninitialized' | 'initializing' | 'initialized' | 'failed';
  /** Cached initialization promise (prevents duplicate init) */
  initPromise?: Promise<void>;
  /** Error from failed initialization */
  error?: Error;
  /** Initialization timestamp */
  initializedAt?: number;
}

class ProviderRegistry {
  private providers: Map<ProviderId, Provider> = new Map();
  private initStates: Map<ProviderId, ProviderInitState> = new Map();

  /**
   * Initialize a single provider with promise caching
   *
   * GOTCHA: Multiple concurrent calls must await the SAME promise,
   * not create new initialization tasks.
   */
  async initializeProvider(
    id: ProviderId,
    options?: ProviderOptions
  ): Promise<void> {
    const provider = this.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not registered`);
    }

    // Get or create init state
    let state = this.initStates.get(id);
    if (!state) {
      state = { status: 'uninitialized' };
      this.initStates.set(id, state);
    }

    // Return cached promise if already initializing
    if (state.status === 'initializing' && state.initPromise) {
      return state.initPromise;
    }

    // Return immediately if already initialized
    if (state.status === 'initialized') {
      return;
    }

    // Start initialization
    state.status = 'initializing';
    state.initPromise = (async () => {
      try {
        await provider.initialize(options);
        state.status = 'initialized';
        state.initializedAt = Date.now();
        state.error = undefined;
      } catch (error) {
        state.status = 'failed';
        state.error = error as Error;
        throw error; // Re-throw for caller
      }
    })();

    return state.initPromise;
  }
}
```

**Key Insights:**
- Store the promise, not just the state
- Concurrent callers await the same promise
- Failed state is cached (prevents infinite retry loops)

---

### Pattern 1.2: Batch Initialization with Promise.allSettled

**Problem:** When initializing multiple providers, one failure should not prevent others from initializing.

**Solution:** Use `Promise.allSettled` instead of `Promise.all`.

```typescript
/**
 * Batch initialization result with detailed status
 *
 * Uses discriminated union for type-safe status checking.
 */
type InitResult =
  | { status: 'success'; providerId: ProviderId }
  | { status: 'failed'; providerId: ProviderId; error: Error };

/**
 * Initialize all registered providers in parallel
 *
 * BEST PRACTICE: Use Promise.allSettled to allow partial success.
 * Some providers may fail while others succeed (e.g., network issues).
 *
 * GOTCHA: Promise.all fails fast - one error fails all. Not suitable
 * for provider initialization where partial success is acceptable.
 */
async initializeAll(
  config: GlobalProviderConfig
): Promise<{
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}> {
  const providerIds = Array.from(this.providers.keys());

  // Initialize all providers in parallel
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

  // Wait for all initializations to complete
  const results = await Promise.allSettled(initPromises);

  // Aggregate results
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
    } else {
      // Promise.allSettled should never reject, but handle defensively
      failed.push({
        providerId: 'unknown',
        error: new Error('Unexpected rejection in Promise.allSettled')
      });
    }
  }

  return { success, failed };
}
```

**Promise.all vs Promise.allSettled:**

| Feature | Promise.all | Promise.allSettled |
|---------|-------------|-------------------|
| **Error Handling** | Fails fast on first rejection | Waits for all promises |
| **Return Value** | Array of resolved values | Array of status objects |
| **Use Case** | All-or-nothing operations | Partial success acceptable |
| **For Registry** | ❌ Too strict | ✅ Preferred choice |

---

### Pattern 1.3: Sequential Initialization with Dependencies

**Problem:** Some providers must initialize before others (dependency ordering).

**Solution:** Topological sort with sequential initialization.

```typescript
/**
 * Provider dependency metadata
 *
 * Defines initialization order constraints.
 */
interface ProviderDependencies {
  /** Providers that must initialize BEFORE this one */
  dependsOn?: ProviderId[];
}

class ProviderRegistry {
  private dependencies: Map<ProviderId, ProviderDependencies> = new Map();

  /**
   * Set provider dependencies
   *
   * MUST be called before initializeAll()
   */
  setDependencies(id: ProviderId, deps: ProviderDependencies): void {
    this.dependencies.set(id, deps);
  }

  /**
   * Initialize providers in dependency order
   *
   * ALGORITHM: Kahn's algorithm for topological sorting
   * COMPLEXITY: O(V + E) where V=providers, E=dependencies
   *
   * GOTCHA: Circular dependencies will cause infinite loop.
   * Validate dependencies before initialization.
   */
  async initializeAllOrdered(
    config: GlobalProviderConfig
  ): Promise<void> {
    const unvisited = new Set(this.providers.keys());
    const initialized = new Set<ProviderId>();
    const inProgress = new Set<ProviderId>();

    const initializeRecursive = async (id: ProviderId): Promise<void> => {
      // Skip if already initialized
      if (initialized.has(id)) return;

      // Detect circular dependencies
      if (inProgress.has(id)) {
        throw new Error(`Circular dependency detected involving '${id}'`);
      }

      inProgress.add(id);

      // Initialize dependencies first
      const deps = this.dependencies.get(id)?.dependsOn ?? [];
      for (const depId of deps) {
        if (this.providers.has(depId)) {
          await initializeRecursive(depId);
        } else {
          throw new Error(`Provider '${id}' depends on missing provider '${depId}'`);
        }
      }

      // Initialize this provider
      const options = config.providerDefaults?.[id];
      await this.initializeProvider(id, options);
      initialized.add(id);
      inProgress.delete(id);
    };

    // Initialize all providers in order
    for (const id of unvisited) {
      await initializeRecursive(id);
    }
  }
}
```

---

## 2. Error Handling for Batch Async Operations

### 2.1 Promise.allSettled Best Practices

**URL:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

**Key Insights:**

1. **Always use allSettled for independent operations**
   ```typescript
   // ✅ GOOD: Independent operations, partial success OK
   const results = await Promise.allSettled(
     providers.map(p => p.initialize())
   );
   ```

2. **Process results with status checks**
   ```typescript
   for (const result of results) {
     if (result.status === 'fulfilled') {
       // Access result.value
     } else {
       // Access result.reason (the error)
     }
   }
   ```

3. **Aggregate errors for reporting**
   ```typescript
   interface BatchResult<T> {
     successful: T[];
     failed: Array<{ value: T; error: Error }>;
   }

   async function batchExecute<T>(
     items: T[],
     executor: (item: T) => Promise<void>
   ): Promise<BatchResult<T>> {
     const results = await Promise.allSettled(items.map(executor));

     const successful: T[] = [];
     const failed: Array<{ value: T; error: Error }> = [];

     items.forEach((item, index) => {
       const result = results[index];
       if (result.status === 'fulfilled') {
         successful.push(item);
       } else {
         failed.push({ value: item, error: result.reason });
       }
     });

     return { successful, failed };
   }
   ```

### 2.2 Error Aggregation Pattern

```typescript
/**
 * Aggregated initialization error
 *
 * Collects multiple provider initialization failures into a single error.
 */
class BatchInitializationError extends Error {
  constructor(
    public readonly failures: Array<{ providerId: ProviderId; error: Error }>
  ) {
    super(
      `Failed to initialize ${failures.length} provider(s): ` +
      failures.map(f => `${f.providerId} (${f.error.message})`).join(', ')
    );
    this.name = 'BatchInitializationError';
  }
}

/**
 * Initialize with strict error handling
 *
 * Throws if ANY provider fails initialization.
 * Use this when all providers are required.
 */
async initializeAllStrict(config: GlobalProviderConfig): Promise<void> {
  const result = await this.initializeAll(config);

  if (result.failed.length > 0) {
    throw new BatchInitializationError(result.failed);
  }
}

/**
 * Initialize with lenient error handling
 *
 * Logs failures but continues. Use this when providers are optional.
 */
async initializeAllLenient(
  config: GlobalProviderConfig,
  logger?: { error: (msg: string) => void }
): Promise<void> {
  const result = await this.initializeAll(config);

  if (result.failed.length > 0) {
    const message = `Failed to initialize ${result.failed.length} provider(s): ` +
      result.failed.map(f => f.providerId).join(', ');
    logger?.error(message);
  }
}
```

---

## 3. Status Tracking for Initialization States

### 3.1 Type-Safe Status Enums

```typescript
/**
 * Provider initialization status
 *
 * Exhaustive enum for all possible initialization states.
 * Enables type-safe state checking and transitions.
 */
enum InitializationStatus {
  /** Provider not yet initialized */
  UNINITIALIZED = 'uninitialized',
  /** Currently initializing (in progress) */
  INITIALIZING = 'initializing',
  /** Successfully initialized and ready */
  INITIALIZED = 'initialized',
  /** Initialization failed, retry may be possible */
  FAILED = 'failed',
  /** Partially initialized (some features unavailable) */
  DEGRADED = 'degraded',
}

/**
 * Provider initialization state with metadata
 */
interface InitializationState {
  /** Current status */
  status: InitializationStatus;
  /** Timestamp of last status change */
  lastUpdated: number;
  /** Error details (if failed) */
  error?: Error;
  /** Retry count (for failed providers) */
  retryCount?: number;
}

class ProviderRegistry {
  private states: Map<ProviderId, InitializationState> = new Map();

  /**
   * Get initialization status for a provider
   *
   * Returns UNINITIALIZED for unknown providers.
   */
  getStatus(id: ProviderId): InitializationStatus {
    return this.states.get(id)?.status ?? InitializationStatus.UNINITIALIZED;
  }

  /**
   * Get all provider statuses
   *
   * Useful for health checks and monitoring.
   */
  getAllStatuses(): Map<ProviderId, InitializationState> {
    return new Map(this.states);
  }

  /**
   * Check if provider is ready to use
   *
   * Returns true only for INITIALIZED or DEGRADED states.
   */
  isReady(id: ProviderId): boolean {
    const status = this.getStatus(id);
    return status === InitializationStatus.INITIALIZED ||
           status === InitializationStatus.DEGRADED;
  }
}
```

### 3.2 Status Transition Validation

```typescript
/**
 * Valid status transitions
 *
 * Defines allowed state transitions to prevent invalid state changes.
 * Format: currentStatus -> [valid next statuses]
 */
const VALID_TRANSITIONS: Record<InitializationStatus, InitializationStatus[]> = {
  [InitializationStatus.UNINITIALIZED]: [
    InitializationStatus.INITIALIZING,
  ],
  [InitializationStatus.INITIALIZING]: [
    InitializationStatus.INITIALIZED,
    InitializationStatus.FAILED,
    InitializationStatus.DEGRADED,
  ],
  [InitializationStatus.INITIALIZED]: [
    InitializationStatus.FAILED,  // Can fail after init
  ],
  [InitializationStatus.FAILED]: [
    InitializationStatus.INITIALIZING,  // Retry
  ],
  [InitializationStatus.DEGRADED]: [
    InitializationStatus.INITIALIZED,  // Recover
    InitializationStatus.FAILED,       // Fail completely
  ],
};

/**
 * Update initialization status with validation
 *
 * Throws if transition is invalid.
 */
private transitionStatus(
  id: ProviderId,
  newStatus: InitializationStatus,
  error?: Error
): void {
  const currentState = this.getStatus(id);
  const validTransitions = VALID_TRANSITIONS[currentState];

  if (!validTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition for '${id}': ` +
      `${currentState} -> ${newStatus}`
    );
  }

  this.states.set(id, {
    status: newStatus,
    lastUpdated: Date.now(),
    error,
    retryCount: newStatus === InitializationStatus.FAILED
      ? (this.states.get(id)?.retryCount ?? 0) + 1
      : this.states.get(id)?.retryCount
  });
}
```

---

## 4. Retry Patterns for Failed Initializations

### 4.1 Exponential Backoff

**Best Practice:** Use exponential backoff with jitter for transient failures.

```typescript
/**
 * Retry configuration
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to prevent thundering herd */
  jitterFactor: number;
}

/**
 * Default retry configuration
 *
 * - 3 retry attempts
 * - Starts at 1000ms
 * - Doubles each retry
 * - Max delay of 10 seconds
 * - 50% jitter to prevent synchronization
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.5,
};

/**
 * Calculate delay with exponential backoff and jitter
 *
 * FORMULA: min(baseDelay * (multiplier ^ attempt), maxDelay)
 * JITTER: random value ± jitterFactor * delay
 *
 * GOTCHA: Without jitter, multiple providers retrying simultaneously
 * will cause thundering herd problem.
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter to prevent synchronization
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Initialize provider with exponential backoff retry
 *
 * Retries on transient errors (network, timeout).
 * Does NOT retry on permanent errors (authentication, validation).
 */
async initializeProviderWithRetry(
  id: ProviderId,
  options?: ProviderOptions,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<void> {
  const provider = this.get(id);
  if (!provider) {
    throw new Error(`Provider '${id}' not registered`);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      await provider.initialize(options);
      this.transitionStatus(id, InitializationStatus.INITIALIZED);
      return; // Success
    } catch (error) {
      lastError = error as Error;

      // Check if error is permanent (don't retry)
      if (this.isPermanentError(error)) {
        this.transitionStatus(id, InitializationStatus.FAILED, error);
        throw error;
      }

      // Check if this was the last attempt
      if (attempt === retryConfig.maxRetries) {
        this.transitionStatus(id, InitializationStatus.FAILED, error);
        throw new Error(
          `Provider '${id}' initialization failed after ${retryConfig.maxRetries + 1} attempts: ` +
          lastError.message
        );
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, retryConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Check if error is permanent (non-retryable)
 *
 * Permanent errors:
 * - Authentication failures
 * - Validation errors
 * - Not found errors
 *
 * Transient errors:
 * - Network timeouts
 * - Connection errors
 * - 5xx server errors
 */
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

### 4.2 Circuit Breaker Pattern

**Advanced Pattern:** Prevent cascading failures with circuit breaker.

```typescript
/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject immediately
  HALF_OPEN = 'half_open' // Testing if recovered
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  /** Failures before opening circuit */
  failureThreshold: number;
  /** Time to wait before attempting recovery (ms) */
  recoveryTimeout: number;
  /** Successful attempts to close circuit in half-open state */
  successThreshold: number;
}

/**
 * Circuit breaker for provider initialization
 *
 * Prevents repeated attempts to initialize a failing provider,
 * allowing time for recovery.
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private openedAt?: number;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Reject immediately if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker is OPEN. ` +
          `Recovery will be attempted after ${this.getRemainingRecoveryTime()}ms`
        );
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

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = Date.now();
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Reopen if we fail during recovery test
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = Date.now();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt > this.config.recoveryTimeout;
  }

  private getRemainingRecoveryTime(): number {
    if (!this.openedAt) return 0;
    return Math.max(0, this.config.recoveryTimeout - (Date.now() - this.openedAt));
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}
```

---

## 5. TypeScript Typing for Async Initialization Methods

### 5.1 Type-Safe Promise Utilities

```typescript
/**
 * Promise with status tracking
 *
 * Wraps a Promise with its current status for monitoring.
 */
interface TrackedPromise<T> {
  promise: Promise<T>;
  status: 'pending' | 'fulfilled' | 'rejected';
  value?: T;
  error?: Error;
}

/**
 * Type guard for narrowed Promise.allSettled results
 *
 * Extracts only successful results from Promise.allSettled.
 */
function extractSuccessful<T>(
  results: PromiseSettledResult<T>[]
): T[] {
  return results
    .filter((result): result is PromiseFulfilledResult<T> =>
      result.status === 'fulfilled'
    )
    .map(result => result.value);
}

/**
 * Extract failed results with errors
 */
function extractFailed<T>(
  results: PromiseSettledResult<T>[]
): Array<{ value: T; error: Error }> {
  return results
    .filter((result): result is PromiseRejectedResult =>
      result.status === 'rejected'
    )
    .map(result => ({
      value: null as unknown as T, // Placeholder - original value lost
      error: result.reason as Error
    }));
}

/**
 * Discriminated union for initialization results
 *
 * Enables type-safe handling of success/failure cases.
 */
type ProviderInitResult =
  | { success: true; providerId: ProviderId }
  | { success: false; providerId: ProviderId; error: Error };

/**
 * Type guard for success result
 */
function isSuccessfulInit(
  result: ProviderInitResult
): result is Extract<ProviderInitResult, { success: true }> {
  return result.success === true;
}

/**
 * Type guard for failed result
 */
function isFailedInit(
  result: ProviderInitResult
): result is Extract<ProviderInitResult, { success: false }> {
  return result.success === false;
}
```

### 5.2 Generic Async Initializer Pattern

```typescript
/**
 * Async initializer function type
 *
 * Represents any async initialization function.
 */
type AsyncInitializer<T> = () => Promise<T>;

/**
 * Generic async resource wrapper
 *
 * Wraps a resource that requires async initialization.
 * Ensures initialization happens only once.
 */
class AsyncResource<T> {
  private value?: T;
  private initPromise?: Promise<T>;
  private initialized = false;

  constructor(
    private readonly initializer: AsyncInitializer<T>
  ) {}

  /**
   * Get the initialized value
   *
   * Lazy initialization: value is initialized on first access.
   * Subsequent calls return the cached value.
   */
  async get(): Promise<T> {
    // Return cached value if already initialized
    if (this.initialized && this.value !== undefined) {
      return this.value;
    }

    // Return cached promise if initialization in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.initializer();
    this.value = await this.initPromise;
    this.initialized = true;

    return this.value;
  }

  /**
   * Check if resource is initialized
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Reset for testing
   */
  _reset(): void {
    this.value = undefined;
    this.initPromise = undefined;
    this.initialized = false;
  }
}
```

### 5.3 Type-Safe Registry with Generics

```typescript
/**
 * Generic service registry with async initialization
 *
 * Type parameters:
 * - TService: The service interface type
 * - TId: The identifier type (defaults to string)
 */
class AsyncServiceRegistry<TService, TId extends string = string> {
  private services = new Map<TId, AsyncResource<TService>>();
  private initializers = new Map<TId, AsyncInitializer<TService>>();

  /**
   * Register a service with its async initializer
   */
  register(
    id: TId,
    initializer: AsyncInitializer<TService>
  ): void {
    if (this.services.has(id)) {
      throw new Error(`Service '${id}' already registered`);
    }

    this.initializers.set(id, initializer);
    this.services.set(id, new AsyncResource(initializer));
  }

  /**
   * Get a service, initializing if necessary
   */
  async get(id: TId): Promise<TService> {
    const resource = this.services.get(id);
    if (!resource) {
      throw new Error(`Service '${id}' not registered`);
    }

    return resource.get();
  }

  /**
   * Check if service is ready
   */
  isReady(id: TId): boolean {
    return this.services.get(id)?.isReady() ?? false;
  }

  /**
   * Get all ready services
   */
  async getAllReady(): Promise<Map<TId, TService>> {
    const ready = new Map<TId, TService>();

    for (const [id, resource] of this.services.entries()) {
      if (resource.isReady()) {
        ready.set(id, await resource.get());
      }
    }

    return ready;
  }
}
```

---

## 6. Common Gotchas When Initializing Multiple Async Resources

### Gotcha 1: Race Conditions in Lazy Initialization

**Problem:** Multiple concurrent requests trigger duplicate initialization.

```typescript
// ❌ PROBLEMATIC
class BadRegistry {
  private initialized = false;

  async initialize() {
    if (!this.initialized) {
      // Multiple concurrent calls all execute this block
      await this.doInit();
      this.initialized = true;
    }
  }
}

// ✅ CORRECT: Promise caching
class GoodRegistry {
  private initPromise?: Promise<void>;

  async initialize() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }
}
```

### Gotcha 2: Promise.all Fails Fast

**Problem:** One failure aborts all pending initializations.

```typescript
// ❌ PROBLEMATIC: If provider 2 fails, provider 3 is never initialized
await Promise.all([
  provider1.initialize(),
  provider2.initialize(),
  provider3.initialize(),
]);

// ✅ CORRECT: All providers attempt initialization
const results = await Promise.allSettled([
  provider1.initialize(),
  provider2.initialize(),
  provider3.initialize(),
]);
```

### Gotcha 3: Unhandled Promise Rejections

**Problem:** Failed promises not caught cause process crashes.

```typescript
// ❌ PROBLEMATIC: Unhandled rejection
provider.initialize().catch(err => {
  console.error('Init failed', err);
  // Error logged but promise still rejected
});

// ✅ CORRECT: Handle all rejections
try {
  await provider.initialize();
} catch (error) {
  console.error('Init failed', error);
  // Optionally: mark provider as failed, don't crash
}
```

### Gotcha 4: Memory Leaks from Cached Promises

**Problem:** Failed promises cached forever, never retried.

```typescript
// ❌ PROBLEMATIC: Never retries
class BadRegistry {
  private initPromise?: Promise<void>;

  async initialize() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }
}

// ✅ CORRECT: Clear failed promises for retry
class GoodRegistry {
  private initPromise?: Promise<void>;
  private failed = false;

  async initialize() {
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

### Gotcha 5: Sequential Initialization Bottleneck

**Problem:** Sequential initialization is unnecessarily slow.

```typescript
// ❌ PROBLEMATIC: Unnecessary serialization
for (const provider of providers) {
  await provider.initialize(); // Each waits for previous
}

// ✅ CORRECT: Parallel initialization
await Promise.allSettled(
  providers.map(p => p.initialize())
);
```

### Gotcha 6: Not Handling Dependency Cycles

**Problem:** Circular dependencies cause infinite loops.

```typescript
// ❌ PROBLEMATIC: Infinite loop on circular deps
async function initializeWithDeps(id: string) {
  const deps = getDependencies(id);
  for (const dep of deps) {
    await initializeWithDeps(dep); // Infinite if circular!
  }
  await initialize(id);
}

// ✅ CORRECT: Detect and reject cycles
async function initializeWithDeps(
  id: string,
  inProgress = new Set<string>()
) {
  if (inProgress.has(id)) {
    throw new Error(`Circular dependency: ${id}`);
  }

  inProgress.add(id);

  const deps = getDependencies(id);
  for (const dep of deps) {
    await initializeWithDeps(dep, inProgress);
  }

  await initialize(id);

  inProgress.delete(id);
}
```

---

## 7. Implementation Recommendations for ProviderRegistry

Based on the research, here are specific recommendations for P1.M3.T1.S2:

### 7.1 Required Interfaces

```typescript
/**
 * Provider initialization state (add to ProviderRegistry)
 */
interface ProviderInitState {
  status: InitializationStatus;
  initPromise?: Promise<void>;
  error?: Error;
  initializedAt?: number;
  retryCount?: number;
}

/**
 * Batch initialization result
 */
interface BatchInitResult {
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}
```

### 7.2 Required Methods

```typescript
class ProviderRegistry {
  private states: Map<ProviderId, ProviderInitState> = new Map();

  /**
   * Initialize single provider (S2 core method)
   */
  async initializeProvider(
    id: ProviderId,
    options?: ProviderOptions
  ): Promise<void>;

  /**
   * Initialize all providers in parallel (S2 required)
   */
  async initializeAll(
    config: GlobalProviderConfig
  ): Promise<BatchInitResult>;

  /**
   * Get initialization status for monitoring
   */
  getStatus(id: ProviderId): InitializationStatus;

  /**
   * Check if provider is ready
   */
  isReady(id: ProviderId): boolean;

  /**
   * Get all provider statuses
   */
  getAllStatuses(): Map<ProviderId, InitializationState>;
}
```

### 7.3 Error Handling Strategy

**For P1.M3.T1.S2:**
1. Use `Promise.allSettled` for batch initialization
2. Aggregate errors, don't fail fast
3. Log failures but continue (lenient mode)
4. Provide both strict and lenient initialization options

```typescript
/**
 * Strict initialization: throws if any fail
 */
async initializeAllStrict(config: GlobalProviderConfig): Promise<void>;

/**
 * Lenient initialization: logs failures, continues
 */
async initializeAllLenient(
  config: GlobalProviderConfig,
  logger?: Logger
): Promise<void>;
```

### 7.4 Testing Considerations

Add testing utilities for initialization state:

```typescript
class ProviderRegistry {
  /**
   * Reset initialization state for testing
   *
   * Clears all cached promises and states.
   * Use in afterEach() hooks.
   */
  _resetInitStateForTesting(): void {
    this.states.clear();
  }

  /**
   * Set initialization state for testing
   *
   * Allows forcing specific states for test scenarios.
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

## 8. URLs and References

**Note:** Web search APIs were rate-limited during research. The following are established documentation URLs for the patterns discussed:

- **Promise.allSettled MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **Promise.all MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- **TypeScript Handbook - Generics:** https://www.typescriptlang.org/docs/handbook/2/generics.html
- **TypeScript Handbook - Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
- **TypeScript Discriminated Unions:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions

**Community Resources:**
- Node.js best practices for error handling: https://nodejs.dev/learn
- TypeScript Deep Dive - Async/Await: https://basarat.gitbook.io/typescript/async-await

---

## 9. Key Insights Summary

1. **Promise.allSettled > Promise.all** for batch initialization
2. **Cache promises** to prevent duplicate initialization
3. **Use status enums** for type-safe state tracking
4. **Exponential backoff with jitter** for retry logic
5. **Discriminated unions** for type-safe result handling
6. **Detect circular dependencies** before initialization
7. **Provide both strict and lenient** initialization modes
8. **Add testing utilities** for initialization state
9. **Log failures but don't crash** in lenient mode
10. **Use topological sort** for dependency ordering

---

## 10. Next Steps for P1.M3.T1.S2

1. **Implement ProviderInitState interface** in provider-registry.ts
2. **Add initializeProvider()** with promise caching
3. **Add initializeAll()** with Promise.allSettled
4. **Add status tracking** (getStatus, isReady, getAllStatuses)
5. **Implement error aggregation** (BatchInitResult)
6. **Add retry logic** (exponential backoff)
7. **Add testing utilities** (_resetInitStateForTesting)
8. **Write tests** for initialization scenarios
9. **Document initialization** in JSDoc comments
10. **Consider dependency ordering** for future enhancement

---

**Document Status:** Complete
**Reviewed By:** TODO
**Approved By:** TODO
**Last Updated:** 2025-01-25
