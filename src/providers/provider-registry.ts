/**
 * Provider Registry - Singleton provider lifecycle management
 *
 * Implements singleton pattern for managing provider instances across
 * the application. Ensures single shared instance of each provider.
 *
 * @module providers
 */

import type {
  Provider,
  ProviderId,
  ProviderOptions,
  GlobalProviderConfig
} from '../types/providers.js';

// ============================================================================
// Type Definitions for Initialization Tracking
// ============================================================================

/**
 * Provider initialization status enum
 *
 * Defines all possible initialization states for type-safe status tracking.
 */
export enum InitializationStatus {
  /** Provider not yet initialized */
  UNINITIALIZED = 'uninitialized',
  /** Currently initializing (in progress) */
  INITIALIZING = 'initializing',
  /** Successfully initialized */
  INITIALIZED = 'initialized',
  /** Initialization failed */
  FAILED = 'failed',
}

/**
 * Provider initialization state with metadata
 *
 * Tracks initialization progress and caches the init promise.
 */
interface ProviderInitState {
  /** Current initialization status */
  status: InitializationStatus;
  /** Cached initialization promise (prevents duplicate init) */
  initPromise?: Promise<void>;
  /** Error from failed initialization */
  error?: Error;
  /** Timestamp when initialization completed */
  initializedAt?: number;
}

/**
 * Batch initialization result with aggregated status
 *
 * Discriminated union for type-safe result handling.
 */
interface BatchInitResult {
  /** Successfully initialized provider IDs */
  success: ProviderId[];
  /** Failed providers with errors */
  failed: Array<{ providerId: ProviderId; error: Error }>;
}

/**
 * Singleton registry for managing provider instances.
 *
 * This class maintains a single instance of itself and stores provider
 * instances in a Map for efficient lookup by ProviderId.
 *
 * ## Singleton Pattern
 *
 * - Private constructor prevents direct instantiation
 * - Static getInstance() returns the single instance
 * - Lazy initialization creates instance on first call
 *
 * ## Usage
 *
 * ```ts
 * // Get registry instance
 * const registry = ProviderRegistry.getInstance();
 *
 * // Register a provider
 * registry.register(anthropicProvider);
 *
 * // Retrieve a provider
 * const provider = registry.get('anthropic');
 *
 * // Check existence
 * if (registry.has('anthropic')) {
 *   // Provider is registered
 * }
 * ```
 *
 * @example
 * ```ts
 * import { ProviderRegistry } from 'groundswell';
 *
 * // Register providers at startup
 * const registry = ProviderRegistry.getInstance();
 * registry.register(new AnthropicProvider());
 * registry.register(new OpenCodeProvider());
 *
 * // Retrieve providers throughout application
 * const anthropic = registry.get('anthropic');
 * if (anthropic) {
 *   await anthropic.initialize();
 * }
 * ```
 */
export class ProviderRegistry {
  /**
   * Private static instance - the singleton instance
   *
   * @internal
   */
  private static instance: ProviderRegistry;

  /**
   * Private provider storage - maps ProviderId to Provider instance
   *
   * @internal
   */
  private providers: Map<ProviderId, Provider> = new Map();

  /**
   * Private initialization state storage - maps ProviderId to ProviderInitState
   *
   * @internal
   */
  private states: Map<ProviderId, ProviderInitState> = new Map();

  /**
   * Private constructor - prevents direct instantiation
   *
   * Use getInstance() to get the singleton instance.
   *
   * @internal
   */
  private constructor() {
    // Empty constructor for S1
    // Future subtasks may initialize with configuration
  }

  // ============================================================================
  // Static Methods - Singleton Access
  // ============================================================================

  /**
   * Get the singleton ProviderRegistry instance
   *
   * Creates the instance on first call (lazy initialization).
   * Returns the same instance on subsequent calls.
   *
   * @returns The singleton ProviderRegistry instance
   *
   * @example
   * ```ts
   * const registry1 = ProviderRegistry.getInstance();
   * const registry2 = ProviderRegistry.getInstance();
   * console.log(registry1 === registry2); // true
   * ```
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  // ============================================================================
  // Instance Methods - Registry Operations
  // ============================================================================

  /**
   * Register a provider instance
   *
   * Stores the provider in the registry using its id as the key.
   * Throws an error if a provider with the same id is already registered.
   *
   * @param provider - The provider instance to register
   * @throws {Error} If a provider with the same id is already registered
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const anthropic = new AnthropicProvider();
   * registry.register(anthropic);
   * ```
   */
  public register(provider: Provider): void {
    // PATTERN: Check for duplicate before adding
    // GOTCHA: provider.id is readonly - use directly
    // GOTCHA: Throw descriptive error message
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider '${provider.id}' is already registered`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a registered provider by id
   *
   * Returns the provider instance if registered, otherwise returns undefined.
   * Does NOT throw for missing providers.
   *
   * @param id - The provider id to look up
   * @returns The provider instance, or undefined if not registered
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const anthropic = registry.get('anthropic');
   * if (anthropic) {
   *   console.log('Provider found:', anthropic.id);
   * }
   * ```
   */
  public get(id: ProviderId): Provider | undefined {
    // PATTERN: Return undefined for missing items
    // GOTCHA: Do NOT throw for missing providers
    return this.providers.get(id);
  }

  /**
   * Check if a provider is registered
   *
   * Returns true if a provider with the given id is registered,
   * otherwise returns false.
   *
   * @param id - The provider id to check
   * @returns true if the provider is registered, false otherwise
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * if (registry.has('anthropic')) {
   *   console.log('Anthropic provider is available');
   * }
   * ```
   */
  public has(id: ProviderId): boolean {
    // PATTERN: Use Map.has() for existence check
    return this.providers.has(id);
  }

  // ============================================================================
  // Instance Methods - Provider Initialization
  // ============================================================================

  /**
   * Initialize a single provider with promise caching
   *
   * Initializes a provider with the given options. Multiple concurrent calls
   * to initialize the same provider will share the same promise (no duplicate
   * initialization). Already initialized providers return immediately.
   *
   * ## Promise Caching
   *
   * The initialization promise is cached in the provider's state. Concurrent
   * calls to initialize the same provider will await the same promise.
   *
   * ## State Transitions
   *
   * - UNINITIALIZED → INITIALIZING → INITIALIZED (success)
   * - UNINITIALIZED → INITIALIZING → FAILED (error)
   *
   * @param id - The provider id to initialize
   * @param options - Optional provider configuration options
   * @returns Promise that resolves when initialization completes
   * @throws {Error} If provider is not registered
   * @throws {Error} If provider initialization fails
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * await registry.initializeProvider('anthropic', { apiKey: 'sk-...' });
   * console.log(registry.isReady('anthropic')); // true
   * ```
   */
  public async initializeProvider(
    id: ProviderId,
    options?: ProviderOptions
  ): Promise<void> {
    // Get provider from registry
    const provider = this.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' is not registered`);
    }

    // Get or create initialization state
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
        throw error; // Re-throw for caller
      }
    })();

    return state.initPromise;
  }

  /**
   * Initialize all registered providers in parallel
   *
   * Uses Promise.allSettled to allow partial success - if one provider fails,
   * others continue initialization. Errors are aggregated in the return value.
   *
   * Provider options are resolved from config.providerDefaults[providerId].
   * If no options are configured for a provider, undefined is passed.
   *
   * ## Parallel Initialization
   *
   * All providers initialize concurrently for faster startup. The method
   * waits for all initialization attempts to complete before returning.
   *
   * ## Error Aggregation
   *
   * This method never throws - all errors are collected in the returned
   * BatchInitResult.failed array. Check this array to identify failed providers.
   *
   * @param config - Global provider configuration with provider defaults
   * @returns Promise resolving to success/failure lists
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const config = getGlobalProviderConfig();
   * const result = await registry.initializeAll(config);
   *
   * console.log(`Initialized: ${result.success.join(', ')}`);
   * if (result.failed.length > 0) {
   *   console.error(`Failed: ${result.failed.map(f => f.providerId).join(', ')}`);
   * }
   * ```
   */
  public async initializeAll(
    config: GlobalProviderConfig
  ): Promise<BatchInitResult> {
    const providerIds = Array.from(this.providers.keys());

    // Map each provider ID to an initialization function
    const initPromises = providerIds.map(async (id) => {
      // Resolve options from config.providerDefaults
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

    // Use Promise.allSettled for partial success tolerance
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
      }
      // Promise.allSettled never rejects, but handle defensively
    }

    return { success, failed };
  }

  /**
   * Get initialization status for a provider
   *
   * Returns the current initialization status for the given provider ID.
   * Unknown providers return UNINITIALIZED status.
   *
   * @param id - The provider id to check
   * @returns Current initialization status
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const status = registry.getStatus('anthropic');
   * console.log(status); // 'initialized' | 'initializing' | 'failed' | 'uninitialized'
   * ```
   */
  public getStatus(id: ProviderId): InitializationStatus {
    return this.states.get(id)?.status ?? InitializationStatus.UNINITIALIZED;
  }

  /**
   * Check if a provider is ready to use
   *
   * Returns true only if the provider has successfully initialized.
   * Use this method to check provider readiness before use.
   *
   * @param id - The provider id to check
   * @returns true if provider is initialized and ready, false otherwise
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * if (registry.isReady('anthropic')) {
   *   const provider = registry.get('anthropic');
   *   // Use provider
   * }
   * ```
   */
  public isReady(id: ProviderId): boolean {
    return this.getStatus(id) === InitializationStatus.INITIALIZED;
  }

  /**
   * Get all provider initialization states
   *
   * Returns a copy of the internal states Map for health checks,
   * monitoring, and debugging. The returned Map is a shallow copy -
   * modifications to it won't affect internal state.
   *
   * @returns Map of provider ID to initialization state
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   * const statuses = registry.getAllStatuses();
   *
   * for (const [id, state] of statuses.entries()) {
   *   console.log(`${id}: ${state.status}`);
   * }
   * ```
   */
  public getAllStatuses(): Map<ProviderId, ProviderInitState> {
    // Return a copy to prevent external mutation
    return new Map(this.states);
  }

  // ============================================================================
  // Instance Methods - Provider Termination
  // ============================================================================

  /**
   * Terminate all registered providers with error tolerance
   *
   * Terminates all providers in parallel, ensuring each gets a chance to
   * clean up resources even if some fail. Errors are logged but not thrown.
   * After termination completes, clears the providers and states maps.
   *
   * ## Parallel Termination
   *
   * All providers terminate concurrently using Promise.allSettled.
   * This ensures fast shutdown while allowing partial success.
   *
   * ## Error Handling
   *
   * If a provider's terminate() throws, the error is logged but other
   * providers continue terminating. The method never throws.
   *
   * ## State Cleanup
   *
   * After all termination attempts complete, the providers and states
   * maps are cleared. This releases references and allows re-initialization.
   *
   * @example
   * ```ts
   * const registry = ProviderRegistry.getInstance();
   *
   * // Register and initialize providers
   * registry.register(anthropicProvider);
   * registry.register(opencodeProvider);
   * await registry.initializeAll(config);
   *
   * // Later, during shutdown
   * await registry.terminateAll();
   *
   * // All providers terminated, maps cleared
   * console.log(registry.has('anthropic')); // false
   * ```
   */
  public async terminateAll(): Promise<void> {
    // PATTERN: Convert Map entries to array for iteration
    const terminatePromises = Array.from(this.providers.entries()).map(
      async ([id, provider]) => {
        try {
          await provider.terminate();
        } catch (error) {
          // PATTERN: Log but continue - don't let one failure block others
          console.error(`Failed to terminate provider '${id}':`, error);
        }
      }
    );

    // PATTERN: Use Promise.allSettled for partial success tolerance
    await Promise.allSettled(terminatePromises);

    // PATTERN: Clear maps AFTER termination completes
    this.providers.clear();
    this.states.clear();
  }

  // ============================================================================
  // Testing Utilities - Internal Use Only
  // ============================================================================

  /**
   * Reset the singleton instance to null
   *
   * **FOR TESTING PURPOSES ONLY**
   *
   * Clears the singleton instance, causing the next call to getInstance()
   * to create a fresh instance. Use in afterEach() hooks to ensure
   * test isolation.
   *
   * @internal
   *
   * @example
   * ```ts
   * import { describe, it, afterEach } from 'vitest';
   *
   * describe('ProviderRegistry', () => {
   *   afterEach(() => {
   *     ProviderRegistry._resetForTesting();
   *   });
   *
   *   it('should start fresh', () => {
   *     const registry = ProviderRegistry.getInstance();
   *     // Test with clean state
   *   });
   * });
   * ```
   */
  public static _resetForTesting(): void {
    ProviderRegistry.instance = null as any;
  }

  /**
   * Reset initialization state for testing
   *
   * **FOR TESTING PURPOSES ONLY**
   *
   * Clears the initialization states Map, removing all cached promises
   * and status information. Use in afterEach() hooks along with
   * _resetForTesting() to ensure complete test isolation.
   *
   * @internal
   *
   * @example
   * ```ts
   * import { describe, it, afterEach } from 'vitest';
   * import { ProviderRegistry } from './provider-registry.js';
   *
   * describe('ProviderRegistry', () => {
   *   afterEach(() => {
   *     const registry = ProviderRegistry.getInstance();
   *     registry._resetInitStateForTesting();
   *     ProviderRegistry._resetForTesting();
   *   });
   *
   *   it('should initialize fresh', () => {
   *     const registry = ProviderRegistry.getInstance();
   *     // Test with clean initialization state
   *   });
   * });
   * ```
   */
  public _resetInitStateForTesting(): void {
    this.states.clear();
  }
}
