/**
 * Provider Registry - Singleton provider lifecycle management
 *
 * Implements singleton pattern for managing provider instances across
 * the application. Ensures single shared instance of each provider.
 *
 * @module providers
 */

import type { Provider, ProviderId } from '../types/providers.js';

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
}
