# Provider Initialization and Termination Best Practices

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S2 - Research provider initialization and termination patterns
**Focus:** Idempotent initialization, lazy loading, cleanup patterns, error handling

---

## Executive Summary

This document compiles best practices for TypeScript/JavaScript provider initialization and termination patterns in SDK wrapper implementations. Research is based on:

1. **Existing Groundswell implementations** (AnthropicProvider, OpenCodeProvider)
2. **Vercel AI SDK patterns** (from `@ai-sdk/anthropic`)
3. **Established TypeScript patterns** (singleton, async initialization, lazy loading)
4. **Industry best practices** for resource management and cleanup

**Key Findings:**
- **Idempotent initialization** prevents duplicate SDK loading
- **Lazy loading with dynamic import()** enables optional dependencies
- **Simple cleanup pattern** (null assignment) works for stateless SDKs
- **Promise caching** prevents race conditions in concurrent initialization
- **Type-safe error handling** with descriptive messages is critical

---

## 1. Idempotent Initialization Patterns

### Pattern 1.1: Basic Idempotent Check

**Best Practice:** Check if SDK is already loaded before initialization.

```typescript
/**
 * Provider with idempotent initialization
 *
 * Follows the pattern from AnthropicProvider and OpenCodeProvider.
 */
export class ExampleProvider implements Provider {
  /**
   * SDK module (lazy loaded)
   * @internal
   */
  private sdk: typeof import("example-sdk") | null = null;

  /**
   * Initialize the provider
   *
   * Idempotent: Safe to call multiple times.
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Idempotent check: if SDK is already loaded, return immediately
    if (this.sdk) {
      return;
    }

    // Dynamic import for lazy loading
    try {
      this.sdk = await import("example-sdk");
    } catch (error) {
      throw new Error(
        `Failed to load example-sdk: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Validate import succeeded
    if (!this.sdk) {
      throw new Error("Failed to load example-sdk: Import returned null");
    }
  }
}
```

**Key Principles:**
1. **Early return pattern** - Returns immediately if already initialized
2. **SDK as flag** - Uses `this.sdk` truthiness as initialization indicator
3. **No internal flag** - Avoids separate `initialized` boolean (redundant)
4. **Validation** - Confirms import didn't return null

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (lines 155-193)
- Groundswell: `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts` (lines 106-132)

---

### Pattern 1.2: Promise Caching for Concurrent Calls

**Problem:** Multiple concurrent calls to `initialize()` could trigger duplicate imports.

**Solution:** Cache the initialization promise.

```typescript
/**
 * Provider with promise caching
 *
 * Prevents duplicate initialization when multiple callers
 * invoke initialize() concurrently.
 */
export class ConcurrentSafeProvider implements Provider {
  private sdk: typeof import("example-sdk") | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    // Return cached promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.sdk) {
      return;
    }

    // Create and cache initialization promise
    this.initPromise = (async () => {
      try {
        this.sdk = await import("example-sdk");

        if (!this.sdk) {
          throw new Error("Import returned null");
        }
      } catch (error) {
        // Clear promise on failure to allow retry
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }
}
```

**Key Improvements:**
1. **Concurrent safety** - Multiple callers await the same promise
2. **Retry support** - Clears promise on failure
3. **No race conditions** - Single initialization pathway

**Sources:**
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md` (lines 24-101)

---

## 2. Lazy Loading SDK Modules with dynamic import()

### Pattern 2.1: Basic Lazy Loading

**Best Practice:** Use dynamic `import()` for optional SDK dependencies.

```typescript
/**
 * Lazy loading pattern for SDK modules
 *
 * Benefits:
 * - Faster startup time (SDK loads on first use)
 * - Optional dependencies (SDK can be missing)
 * - Tree-shaking support (unused code eliminated)
 */
export class LazyProvider implements Provider {
  private sdk: typeof import("heavy-sdk") | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    if (this.sdk) {
      return;
    }

    // Dynamic import - loads module at runtime
    this.sdk = await import("heavy-sdk");
  }
}
```

**Type Safety Pattern:**

```typescript
/**
 * Type-safe lazy loading
 *
 * Uses typeof import() for accurate module types.
 */
private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

// SDK access is fully type-checked
if (!this.sdk) {
  throw new Error("SDK not initialized");
}

// Full type safety and autocomplete
const result = await this.sdk.query({ prompt: "..." });
```

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (line 103)
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/modules/theory.html#dynamic-import-expressions

---

### Pattern 2.2: Optional Dependency Handling

**Best Practice:** Gracefully handle missing SDK dependencies.

```typescript
/**
 * Optional dependency pattern
 *
 * Allows SDK to be optional (peerDependency).
 * Provides clear error messages when SDK is missing.
 */
async initialize(options?: ProviderOptions): Promise<void> {
  if (this.sdk) {
    return;
  }

  try {
    this.sdk = await import("@opencode-ai/sdk");
  } catch (error) {
    // Check if error is MODULE_NOT_FOUND
    if (error instanceof Error && error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        "@opencode-ai/sdk is not installed. " +
        "Install it with: npm install @opencode-ai/sdk"
      );
    }

    // Re-throw other errors with context
    throw new Error(
      `Failed to load @opencode-ai/sdk: ${error.message}`
    );
  }

  if (!this.sdk) {
    throw new Error("Failed to load @opencode-ai/sdk: Import returned null");
  }
}
```

**Error Types to Handle:**
1. **MODULE_NOT_FOUND** - SDK not installed
2. **Network errors** - Failed to fetch (if using CDN)
3. **Import errors** - Syntax errors in SDK
4. **Null imports** - Edge case where import returns null

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts` (lines 114-128)

---

## 3. Cleanup Patterns for SDK Client Termination

### Pattern 3.1: Simple Cleanup (Stateless SDKs)

**Best Practice:** For stateless SDKs, simple null assignment is sufficient.

```typescript
/**
 * Simple cleanup pattern for stateless SDKs
 *
 * Applicable when:
 * - SDK has no close/cleanup methods
 * - SDK manages resources internally
 * - No persistent connections
 * - Each request creates new resources
 */
async terminate(): Promise<void> {
  // Idempotent check: if SDK is already null, return immediately
  if (this.sdk === null) {
    return;
  }

  // Clear SDK reference to allow garbage collection
  this.sdk = null;
}
```

**When to Use This Pattern:**
- SDK has no `close()` or `dispose()` methods
- SDK documentation states no cleanup needed
- Each operation creates independent resources
- SDK manages connection pooling internally

**Real-World Example:** Anthropic Agent SDK
```typescript
// From AnthropicProvider.terminate()
// The SDK is stateless - Query objects auto-cleanup on completion
async terminate(): Promise<void> {
  if (this.sdk === null) {
    return;
  }

  this.sdk = null;

  // Clear internal state
  this.mcpServerConfig = null;
  this.skillsPrompt = '';
  this.sessions.clear();
}
```

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (lines 204-228)
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S3/research/anthropic_sdk_cleanup.md`

---

### Pattern 3.2: Explicit Cleanup (Stateful SDKs)

**Best Practice:** Call SDK cleanup methods when available.

```typescript
/**
 * Explicit cleanup pattern for stateful SDKs
 *
 * Applicable when:
 * - SDK has close/dispose/terminate methods
 * - SDK maintains persistent connections
 * - SDK uses connection pooling
 * - SDK has open file handles or streams
 */
export class StatefulProvider implements Provider {
  private sdk: typeof import("stateful-sdk") | null = null;
  private client: import("stateful-sdk").Client | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    if (this.sdk) {
      return;
    }

    this.sdk = await import("stateful-sdk");
    this.client = new this.sdk.Client(options);
  }

  async terminate(): Promise<void> {
    // Idempotent check
    if (this.sdk === null) {
      return;
    }

    // Explicit cleanup if client exists
    if (this.client) {
      try {
        // Call SDK cleanup method if available
        if (typeof this.client.close === 'function') {
          await this.client.close();
        } else if (typeof this.client.dispose === 'function') {
          await this.client.dispose();
        } else if (typeof this.client.disconnect === 'function') {
          await this.client.disconnect();
        }
      } catch (error) {
        // Log error but don't throw - cleanup is best-effort
        console.warn('Error during client cleanup:', error);
      }

      this.client = null;
    }

    // Clear SDK reference
    this.sdk = null;
  }
}
```

**Common Cleanup Method Names:**
- `close()` - Most common
- `dispose()` - TypeScript/Node pattern
- `disconnect()` - Database/network clients
- `destroy()` - Less common, but exists
- `terminate()` - Process-based SDKs
- `shutdown()` - Server-based SDKs

**Symbol.asyncDispose Pattern (Node.js 18+):**
```typescript
/**
 * Modern disposal pattern using Symbol.asyncDispose
 *
 * Part of TC39 Explicit Resource Management proposal.
 * Supported in Node.js 18.6.0+ and TypeScript 5.2+.
 */
export class DisposableProvider implements Provider {
  private sdk: typeof import("disposable-sdk") | null = null;
  private client: import("disposable-sdk").Client | null = null;

  async initialize(options?: ProviderOptions): Promise<void> {
    this.sdk = await import("disposable-sdk");
    this.client = new this.sdk.Client(options);
  }

  async terminate(): Promise<void> {
    if (this.sdk === null) {
      return;
    }

    // Use async dispose if available
    if (this.client && typeof this.client[Symbol.asyncDispose] === 'function') {
      await this.client[Symbol.asyncDispose]();
    }

    this.client = null;
    this.sdk = null;
  }

  /**
   * Implement Symbol.asyncDispose for use with 'await using'
   */
  async [Symbol.asyncDispose]() {
    await this.terminate();
  }
}

// Usage with await using (TS 5.2+)
async function example() {
  await using provider = new DisposableProvider();
  await provider.initialize();
  // Auto-disposes when scope exits
}
```

---

### Pattern 3.3: Resource Cleanup Checklist

**Internal State to Clear:**

```typescript
/**
 * Comprehensive cleanup pattern
 *
 * Clears all internal state and resources.
 */
async terminate(): Promise<void> {
  if (this.sdk === null) {
    return;
  }

  // 1. Clear SDK clients
  this.client = null;

  // 2. Clear cached configurations
  this.mcpServerConfig = null;
  this.toolConfig = null;

  // 3. Clear in-memory state
  this.sessions.clear();
  this.cache.clear();

  // 4. Close open connections
  if (this.eventSource) {
    this.eventSource.close();
    this.eventSource = null;
  }

  // 5. Cancel pending operations
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }

  // 6. Remove event listeners
  if (this.emitter) {
    this.emitter.removeAllListeners();
  }

  // 7. Clear SDK reference last
  this.sdk = null;
}
```

**Cleanup Order Matters:**
1. **Close connections** (active resources first)
2. **Clear caches/maps** (memory cleanup)
3. **Abort operations** (prevent dangling promises)
4. **Remove listeners** (prevent memory leaks)
5. **Clear SDK reference** (allow GC)

---

## 4. Error Handling for SDK Initialization Failures

### Pattern 4.1: Descriptive Error Messages

**Best Practice:** Wrap errors with context and actionable information.

```typescript
/**
 * Descriptive error handling pattern
 *
 * Provides clear, actionable error messages.
 */
async initialize(options?: ProviderOptions): Promise<void> {
  if (this.sdk) {
    return;
  }

  try {
    this.sdk = await import("@opencode-ai/sdk");
  } catch (error) {
    // Preserve original error while adding context
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";

    throw new Error(
      `Failed to load @opencode-ai/sdk: ${errorMessage}`
    );
  }

  if (!this.sdk) {
    throw new Error(
      "Failed to load @opencode-ai/sdk: Import returned null"
    );
  }
}
```

**Error Message Components:**
1. **What failed** - "Failed to load @opencode-ai/sdk"
2. **Why it failed** - Original error message
3. **How to fix** - (optional) Install instructions

**Good vs Bad Error Messages:**

```typescript
// ❌ BAD: No context
throw error;

// ❌ BAD: Loses original error
throw new Error("Failed to load SDK");

// ✅ GOOD: Preserves context
throw new Error(
  `Failed to load @opencode-ai/sdk: ${error.message}`
);

// ✅ BETTER: Includes fix
throw new Error(
  `Failed to load @opencode-ai/sdk: ${error.message}\n` +
  `Install with: npm install @opencode-ai/sdk`
);
```

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (lines 163-176)

---

### Pattern 4.2: Error Classification

**Best Practice:** Distinguish between transient and permanent errors.

```typescript
/**
 * Error classification for retry logic
 *
 * Enables intelligent retry behavior.
 */
enum ErrorType {
  /** Permanent: Don't retry (auth, validation) */
  PERMANENT = 'permanent',
  /** Transient: Retry with backoff (network, timeout) */
  TRANSIENT = 'transient',
  /** Unknown: Assume permanent for safety */
  UNKNOWN = 'unknown',
}

/**
 * Classify error for retry decisions
 */
private classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  // Permanent errors - don't retry
  const permanentKeywords = [
    'authentication',
    'unauthorized',
    'forbidden',
    'not found',
    'invalid',
    'validation',
    'permission denied',
  ];

  if (permanentKeywords.some(keyword => message.includes(keyword))) {
    return ErrorType.PERMANENT;
  }

  // Transient errors - retry with backoff
  const transientKeywords = [
    'timeout',
    'network',
    'connection',
    'econnrefused',
    'etimedout',
    '5xx',
  ];

  if (transientKeywords.some(keyword => message.includes(keyword))) {
    return ErrorType.TRANSIENT;
  }

  // Unknown - assume permanent
  return ErrorType.UNKNOWN;
}

/**
 * Initialize with retry logic
 */
async initializeWithRetry(
  options?: ProviderOptions,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await this.initialize(options);
      return; // Success
    } catch (error) {
      lastError = error as Error;

      // Check if error is permanent (don't retry)
      if (this.classifyError(lastError) === ErrorType.PERMANENT) {
        throw lastError;
      }

      // Check if this was the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Sources:**
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md` (lines 527-663)

---

### Pattern 4.3: Graceful Degradation

**Best Practice:** Allow providers to fail without crashing the application.

```typescript
/**
 * Lenient initialization pattern
 *
 * Logs failures but doesn't throw.
 * Useful for optional providers.
 */
async initializeLenient(
  options?: ProviderOptions,
  logger?: { error: (msg: string) => void }
): Promise<{ success: boolean; error?: Error }> {
  try {
    await this.initialize(options);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    logger?.error(
      `Provider '${this.id}' initialization failed: ${err.message}`
    );
    return { success: false, error: err };
  }
}

/**
 * Provider registry with lenient initialization
 */
class ProviderRegistry {
  async initializeAllLenient(
    config: GlobalProviderConfig
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.providers.map(p => p.initialize())
    );

    const failed = results.filter(r => r.status === 'rejected');

    if (failed.length > 0) {
      console.warn(
        `${failed.length} provider(s) failed to initialize. ` +
        `Application will continue with available providers.`
      );
    }
  }
}
```

---

## 5. Provider State Management

### Pattern 5.1: State Tracking Enum

**Best Practice:** Use enums for type-safe state tracking.

```typescript
/**
 * Provider initialization state
 *
 * Exhaustive enum for all possible states.
 */
enum ProviderState {
  /** Provider not yet initialized */
  UNINITIALIZED = 'uninitialized',
  /** Currently initializing (in progress) */
  INITIALIZING = 'initializing',
  /** Successfully initialized and ready */
  INITIALIZED = 'initialized',
  /** Initialization failed */
  FAILED = 'failed',
  /** Terminated (cleanup complete) */
  TERMINATED = 'terminated',
}

/**
 * Provider with state tracking
 */
export class StatefulProvider implements Provider {
  private state: ProviderState = ProviderState.UNINITIALIZED;
  private sdk: typeof import("example-sdk") | null = null;

  getState(): ProviderState {
    return this.state;
  }

  isReady(): boolean {
    return this.state === ProviderState.INITIALIZED;
  }

  async initialize(options?: ProviderOptions): Promise<void> {
    // Validate state transition
    if (this.state === ProviderState.INITIALIZING) {
      throw new Error("Already initializing");
    }

    if (this.state === ProviderState.INITIALIZED) {
      return; // Idempotent
    }

    if (this.state === ProviderState.TERMINATED) {
      throw new Error(
        "Cannot reinitialize terminated provider. " +
        "Create a new instance instead."
      );
    }

    // Transition to initializing
    this.state = ProviderState.INITIALIZING;

    try {
      this.sdk = await import("example-sdk");
      this.state = ProviderState.INITIALIZED;
    } catch (error) {
      this.state = ProviderState.FAILED;
      throw error;
    }
  }

  async terminate(): Promise<void> {
    if (this.state === ProviderState.TERMINATED) {
      return; // Idempotent
    }

    this.sdk = null;
    this.state = ProviderState.TERMINATED;
  }
}
```

**Sources:**
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md` (lines 394-462)

---

### Pattern 5.2: State Transition Validation

**Best Practice:** Validate state transitions to prevent invalid operations.

```typescript
/**
 * Valid state transitions
 *
 * Defines allowed state transitions.
 */
const VALID_TRANSITIONS: Record<ProviderState, ProviderState[]> = {
  [ProviderState.UNINITIALIZED]: [
    ProviderState.INITIALIZING,
  ],
  [ProviderState.INITIALIZING]: [
    ProviderState.INITIALIZED,
    ProviderState.FAILED,
  ],
  [ProviderState.INITIALIZED]: [
    ProviderState.TERMINATED,
    ProviderState.FAILED, // Can fail after init
  ],
  [ProviderState.FAILED]: [
    ProviderState.INITIALIZING, // Retry
    ProviderState.TERMINATED,   // Give up
  ],
  [ProviderState.TERMINATED]: [
    // No transitions - terminal state
  ],
};

/**
 * Transition state with validation
 */
private transitionState(newState: ProviderState): void {
  const currentState = this.state;
  const validTransitions = VALID_TRANSITIONS[currentState];

  if (!validTransitions.includes(newState)) {
    throw new Error(
      `Invalid state transition: ${currentState} -> ${newState}`
    );
  }

  this.state = newState;
}
```

---

## 6. Vercel AI SDK Provider Patterns

### Pattern 6.1: Factory Function Pattern

**Source:** Vercel AI SDK's `createAnthropic()`

```typescript
/**
 * Vercel AI SDK factory pattern
 *
 * Creates provider instances with configuration.
 * No explicit initialize/terminate - SDK is stateless.
 *
 * Source: node_modules/@ai-sdk/anthropic/src/anthropic-provider.ts
 */
export interface AnthropicProviderSettings {
  baseURL?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  generateId?: () => string;
}

export function createAnthropic(
  options: AnthropicProviderSettings = {}
): AnthropicProvider {
  // Load configuration from environment or options
  const baseURL = loadOptionalSetting({
    settingValue: options.baseURL,
    environmentVariableName: 'ANTHROPIC_BASE_URL',
  }) ?? 'https://api.anthropic.com/v1';

  const apiKey = loadApiKey({
    apiKey: options.apiKey,
    environmentVariableName: 'ANTHROPIC_API_KEY',
    description: 'Anthropic',
  });

  // Create provider function
  const provider = function (modelId: string) {
    return new AnthropicMessagesLanguageModel(modelId, {
      provider: 'anthropic.messages',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  // Attach metadata
  provider.specificationVersion = 'v3' as const;
  provider.languageModel = provider;
  provider.chat = provider;
  provider.messages = provider;

  return provider;
}

// Default instance
export const anthropic = createAnthropic();
```

**Key Observations:**
1. **No initialize/terminate** - SDK is stateless, no cleanup needed
2. **Factory function** - Creates configured provider instances
3. **Default export** - Pre-configured instance for common use
4. **Environment variables** - Automatic loading with override support
5. **Function-based provider** - Provider is a function, not a class

**Sources:**
- Vercel AI SDK: `/home/dustin/projects/groundswell/node_modules/@ai-sdk/anthropic/src/anthropic-provider.ts`

---

### Pattern 6.2: Groundswell vs Vercel AI SDK Comparison

| Aspect | Groundswell Provider | Vercel AI SDK Provider |
|--------|---------------------|----------------------|
| **Pattern** | Class with initialize/terminate | Factory function |
| **State Management** | Explicit (initialize/terminate) | Implicit (stateless) |
| **SDK Loading** | Lazy dynamic import | Eager static import |
| **Optional Dependencies** | Supported (try/catch import) | Not supported (build-time) |
| **Lifecycle** | Explicit control | Implicit (per-request) |
| **Cleanup** | terminate() method | N/A (stateless) |
| **Use Case** | Long-running processes | Serverless/short-lived |

**When to Use Each:**

```typescript
// Groundswell pattern: Long-running server
class AnthropicProvider implements Provider {
  async initialize() { /* Lazy load SDK */ }
  async terminate() { /* Explicit cleanup */ }
}

// Vercel AI pattern: Serverless function
import { createAnthropic } from '@ai-sdk/anthropic';
const anthropic = createAnthropic({ apiKey: '...' });
// No initialize/terminate - use immediately
```

---

## 7. Common Pitfalls to Avoid

### Pitfall 7.1: Non-Idempotent Initialization

**Problem:** Calling `initialize()` multiple times causes issues.

```typescript
// ❌ BAD: Not idempotent
class BadProvider {
  private initialized = false;

  async initialize() {
    if (this.initialized) {
      throw new Error("Already initialized");
    }

    this.sdk = await import("sdk");
    this.initialized = true;
  }
}

// ✅ GOOD: Idempotent
class GoodProvider {
  private sdk = null;

  async initialize() {
    if (this.sdk) {
      return; // Safe to call again
    }

    this.sdk = await import("sdk");
  }
}
```

**Sources:**
- Groundswell: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (lines 156-159)

---

### Pitfall 7.2: Race Conditions in Lazy Loading

**Problem:** Concurrent calls trigger duplicate initialization.

```typescript
// ❌ BAD: Race condition
class BadProvider {
  private sdk = null;
  private initializing = false;

  async initialize() {
    if (this.sdk) return;

    // ❌ Multiple concurrent calls all pass this check
    if (this.initializing) return;

    this.initializing = true;
    this.sdk = await import("sdk");
    this.initializing = false;
  }
}

// ✅ GOOD: Promise caching
class GoodProvider {
  private sdk = null;
  private initPromise = null;

  async initialize() {
    if (this.sdk) return;

    // ✅ All concurrent calls await same promise
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.sdk = await import("sdk");
    })();

    return this.initPromise;
  }
}
```

**Sources:**
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md` (lines 990-1018)

---

### Pitfall 7.3: Memory Leaks from Event Listeners

**Problem:** Event listeners not removed on termination.

```typescript
// ❌ BAD: Memory leak
class BadProvider {
  private sdk = null;
  private handlers = [];

  async initialize() {
    this.sdk = await import("sdk");
    this.sdk.on('event', this.handleEvent);
  }

  async terminate() {
    this.sdk = null; // ❌ Handlers not removed!
  }
}

// ✅ GOOD: Cleanup listeners
class GoodProvider {
  private sdk = null;
  private handlers = [];

  async initialize() {
    this.sdk = await import("sdk");
    const handler = this.handleEvent.bind(this);
    this.handlers.push(handler);
    this.sdk.on('event', handler);
  }

  async terminate() {
    if (this.sdk) {
      // ✅ Remove all listeners
      for (const handler of this.handlers) {
        this.sdk.off('event', handler);
      }
    }

    this.handlers = [];
    this.sdk = null;
  }
}
```

---

### Pitfall 7.4: Throwing in terminate()

**Problem:** `terminate()` methods that throw can cause cascading failures.

```typescript
// ❌ BAD: Throws on error
async terminate() {
  if (this.client) {
    await this.client.close(); // ❌ Might throw!
  }
  this.sdk = null;
}

// ✅ GOOD: Best-effort cleanup
async terminate() {
  if (this.client) {
    try {
      await this.client.close();
    } catch (error) {
      // Log but don't throw
      console.warn('Error closing client:', error);
    }
    this.client = null;
  }
  this.sdk = null;
}
```

**Why terminate() Shouldn't Throw:**
1. **Cleanup is best-effort** - Already shutting down
2. **Cascading failures** - Prevents other cleanup
3. **No recovery path** - Can't handle errors during termination
4. **Testing difficulties** - Hard to test failure scenarios

---

### Pitfall 7.5: Re-initialization After Termination

**Problem:** Allowing re-initialization after `terminate()` causes issues.

```typescript
// ❌ BAD: Allows re-initialization
class BadProvider {
  async terminate() {
    this.sdk = null;
  }

  async initialize() {
    if (this.sdk) return;
    this.sdk = await import("sdk");
  }

  // ❌ This works but is confusing
  await provider.initialize();
  await provider.terminate();
  await provider.initialize(); // Huh?
}

// ✅ GOOD: Prevent re-initialization
class GoodProvider {
  private state = 'uninitialized';

  async initialize() {
    if (this.state === 'terminated') {
      throw new Error(
        "Cannot reinitialize terminated provider. " +
        "Create a new instance instead."
      );
    }

    this.sdk = await import("sdk");
    this.state = 'initialized';
  }

  async terminate() {
    this.sdk = null;
    this.state = 'terminated';
  }
}
```

---

## 8. Testing Patterns

### Pattern 8.1: Testing Idempotent Behavior

```typescript
describe('initialize()', () => {
  it('should be idempotent', async () => {
    const provider = new ExampleProvider();

    // First call
    await provider.initialize();

    // Second call should not throw
    await provider.initialize();

    // Third call should not throw
    await provider.initialize();

    // Verify SDK was loaded
    // @ts-expect-error - Testing private property
    expect(provider.sdk).not.toBeNull();
  });
});
```

---

### Pattern 8.2: Testing Termination

```typescript
describe('terminate()', () => {
  it('should clear SDK reference', async () => {
    const provider = new ExampleProvider();
    await provider.initialize();

    await provider.terminate();

    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });

  it('should be idempotent', async () => {
    const provider = new ExampleProvider();
    await provider.initialize();

    await provider.terminate();
    await provider.terminate(); // Should not throw
    await provider.terminate(); // Should not throw

    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });

  it('should handle terminate without initialize', async () => {
    const provider = new ExampleProvider();

    // Should not throw even if never initialized
    await provider.terminate();

    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });
});
```

**Sources:**
- Research: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S1/research/singleton_best_practices.md` (lines 275-349)

---

### Pattern 8.3: Testing Error Handling

```typescript
describe('initialize() error handling', () => {
  it('should throw descriptive error for missing SDK', async () => {
    const provider = new ExampleProvider();

    // Mock import to fail
    jest.mock('missing-sdk', () => {
      throw new Error('MODULE_NOT_FOUND');
    });

    await expect(provider.initialize()).rejects.toThrow(
      'Failed to load missing-sdk'
    );
  });

  it('should preserve original error message', async () => {
    const provider = new ExampleProvider();

    const expectedError = new Error('Network timeout');
    jest.mock('flaky-sdk', () => {
      throw expectedError;
    });

    await expect(provider.initialize()).rejects.toThrow(
      'Network timeout'
    );
  });
});
```

---

## 9. Documentation URLs and References

### Official Documentation

1. **Vercel AI SDK**
   - Docs: https://sdk.vercel.ai/docs
   - GitHub: https://github.com/vercel/ai
   - Anthropic Provider: `node_modules/@ai-sdk/anthropic/src/anthropic-provider.ts`

2. **LangChain**
   - Docs: https://js.langchain.com/
   - GitHub: https://github.com/langchain-ai/langchainjs

3. **TypeScript**
   - Modules: https://www.typescriptlang.org/docs/handbook/modules/theory.html
   - Dynamic Import: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-4.html#dynamic-import-expressions
   - Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
   - Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

4. **Node.js**
   - Promise.allSettled: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
   - Symbol.asyncDispose: https://nodejs.org/api/esm.html#class-disposable

### Groundswell Internal Sources

1. **AnthropicProvider Implementation**
   - Path: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
   - Lines: 155-193 (initialize), 204-228 (terminate)

2. **OpenCodeProvider Implementation**
   - Path: `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts`
   - Lines: 106-132 (initialize), 143-157 (terminate)

3. **Async Initialization Research**
   - Path: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md`
   - Topics: Promise caching, batch initialization, retry patterns

4. **Singleton Best Practices**
   - Path: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M3T1S1/research/singleton_best_practices.md`
   - Topics: Lazy initialization, testing patterns

5. **Anthropic SDK Cleanup Research**
   - Path: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S3/research/anthropic_sdk_cleanup.md`
   - Topics: Stateless SDKs, cleanup requirements

---

## 10. Key Takeaways

### Initialization Best Practices

1. ✅ **Use idempotent checks** - `if (this.sdk) return;`
2. ✅ **Lazy load SDKs** - `await import("sdk")`
3. ✅ **Cache promises** - Prevent concurrent initialization
4. ✅ **Handle errors descriptively** - Preserve context in error messages
5. ✅ **Support optional dependencies** - Try/catch with helpful messages
6. ✅ **Use type-safe imports** - `typeof import()`
7. ✅ **Validate imports** - Check for null after import

### Termination Best Practices

1. ✅ **Match initialize() pattern** - Use same idempotent check
2. ✅ **Clear all references** - SDK, clients, caches, listeners
3. ✅ **Best-effort cleanup** - Don't throw in terminate()
4. ✅ **Document cleanup requirements** - Explain why minimal/maximal cleanup
5. ✅ **Prevent re-initialization** - Either support or explicitly reject
6. ✅ **Order matters** - Close connections before clearing references

### Error Handling Best Practices

1. ✅ **Classify errors** - Permanent vs transient
2. ✅ **Provide context** - What failed, why, how to fix
3. ✅ **Use Promise.allSettled** - For batch operations
4. ✅ **Implement retry logic** - Exponential backoff for transient errors
5. ✅ **Graceful degradation** - Allow optional providers to fail

### Testing Best Practices

1. ✅ **Test idempotency** - Multiple initialize/terminate calls
2. ✅ **Test error cases** - Missing SDK, network failures
3. ✅ **Test state transitions** - Invalid transitions should throw
4. ✅ **Test concurrent access** - Multiple initialize() calls
5. ✅ **Test cleanup** - Verify resources are released

---

## 11. Recommended Implementation Checklist

For P3.M2.T1.S2 (OpenCodeProvider server startup/shutdown):

- [ ] **Idempotent initialize()** - Check if already initialized
- [ ] **Lazy SDK loading** - Dynamic import with error handling
- [ ] **Promise caching** - Prevent duplicate initialization
- [ ] **Descriptive errors** - Contextual error messages
- [ ] **Idempotent terminate()** - Match initialize() pattern
- [ ] **Server shutdown** - Call SDK server.close() if available
- [ ] **Clear all state** - Server, MCP config, skills, sessions
- [ ] **Best-effort cleanup** - Try/catch in terminate()
- [ ] **Comprehensive tests** - Idempotency, errors, state
- [ ] **JSDoc documentation** - Explain patterns and decisions

---

**Document Status:** Complete
**Last Updated:** 2026-01-25
**Next Task:** P3.M2.T1.S2 - Implement OpenCodeProvider server startup and shutdown
