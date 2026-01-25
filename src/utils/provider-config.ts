/**
 * Global provider configuration storage
 *
 * ## Module-Private Variable Pattern
 *
 * This module uses ES module scoping to create a truly private singleton
 * configuration storage. The `globalConfig` variable is not exported,
 * preventing direct external modification. Access is provided through
 * exported functions (to be implemented in subsequent subtasks).
 *
 * ## Initialization State
 *
 * - Initial value: `null` (unconfigured state)
 * - After configuration: Set by `configureProviders()` (P1.M2.T1.S2)
 * - Access: Via `getGlobalProviderConfig()` (P1.M2.T1.S3)
 * - Resolution: Via `resolveProviderConfig()` (P1.M2.T1.S4)
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Global config is the lowest priority in the cascade:
 * 1. GlobalProviderConfig (this config) - lowest priority
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides - highest priority
 *
 * @example
 * ```ts
 * // In P1.M2.T1.S2: Configure providers
 * import { configureProviders } from './utils/provider-config.js';
 *
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 *
 * // In P1.M2.T1.S3: Access configuration
 * import { getGlobalProviderConfig } from './utils/provider-config.js';
 *
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 * ```
 *
 * @see {@link GlobalProviderConfig} for configuration interface
 * @see {@link configureProviders} to be implemented in P1.M2.T1.S2
 * @see {@link getGlobalProviderConfig} to be implemented in P1.M2.T1.S3
 * @see {@link resolveProviderConfig} to be implemented in P1.M2.T1.S4
 */

// Type imports from providers module
// CRITICAL: Use .js extension (TypeScript requirement for ESM)
import type {
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions
} from '../types/providers.js';

// ============================================================================
// Module-Private Variable Storage
// ============================================================================

/**
 * Global provider configuration storage
 *
 * **Module-private variable** - not exported to prevent external modification.
 * Access via exported functions in subsequent subtasks.
 *
 * ## Type Safety
 *
 * - `GlobalProviderConfig | null`: Strict typing with nullable state
 * - Initialized to `null`: Unconfigured state until `configureProviders()` is called
 * - Mutable via `let`: Allows configuration updates in P1.M2.T1.S2
 *
 * ## Singleton Semantics
 *
 * ES modules are evaluated once per process, so this variable is naturally
 * a singleton shared across all imports of this module.
 *
 * @internal
 */
let globalConfig: GlobalProviderConfig | null = null;

/**
 * Default global provider configuration
 *
 * This constant provides sensible defaults when no configuration
 * has been set via `configureProviders()`.
 *
 * @internal
 */
const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic' as ProviderId,
  providerDefaults: undefined
};

// ============================================================================
// Private Validation Helpers
// ============================================================================

/**
 * Type guard to check if a string is a valid ProviderId
 *
 * @param value - The string value to check
 * @returns True if the value is a valid ProviderId ('anthropic' | 'opencode')
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

/**
 * Get comma-separated list of supported providers for error messages
 *
 * @returns Formatted list of valid provider IDs
 */
function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Configure global provider settings
 *
 * Validates the configuration and stores it in the module-private
 * globalConfig variable. This function should be called once at
 * application startup.
 *
 * ## Validation
 *
 * - `defaultProvider` must be 'anthropic' or 'opencode'
 * - `providerDefaults` keys (if present) must be valid ProviderIds
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * This global config is the lowest priority in the cascade:
 * 1. GlobalProviderConfig (this config) - lowest priority
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides - highest priority
 *
 * @param config - Global provider configuration
 * @throws {Error} If defaultProvider is invalid
 * @throws {Error} If providerDefaults contains invalid provider IDs
 *
 * @example
 * ```ts
 * import { configureProviders } from 'groundswell';
 *
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export function configureProviders(config: GlobalProviderConfig): void {
  // Step 1: Validate defaultProvider
  if (!isValidProviderId(config.defaultProvider)) {
    throw new Error(
      `Invalid default provider: "${config.defaultProvider}". ` +
      `Supported providers: ${getSupportedProvidersList()}`
    );
  }

  // Step 2: Validate providerDefaults keys (if present)
  if (config.providerDefaults) {
    for (const providerId of Object.keys(config.providerDefaults)) {
      if (!isValidProviderId(providerId)) {
        throw new Error(
          `Invalid provider in providerDefaults: "${providerId}". ` +
          `Supported providers: ${getSupportedProvidersList()}`
        );
      }
    }
  }

  // Step 3: Store configuration (validation passed)
  globalConfig = config;
}

// ============================================================================
// Future Functions (To Be Implemented in Subsequent Subtasks)
// ============================================================================

/**
 * Get the current global provider configuration
 *
 * This function provides controlled access to the module-private
 * `globalConfig` variable. It guarantees a non-null return by
 * providing sensible defaults when no configuration has been set.
 *
 * ## Semantics
 *
 * - If `configureProviders()` was called: returns the configured value
 * - If never configured: returns default configuration
 * - **Never returns null**: Always returns a valid `GlobalProviderConfig`
 *
 * ## Usage
 *
 * ```ts
 * import { getGlobalProviderConfig } from 'groundswell';
 *
 * // Before configuration - returns defaults
 * const config1 = getGlobalProviderConfig();
 * console.log(config1.defaultProvider); // 'anthropic'
 *
 * // After configuration
 * configureProviders({ defaultProvider: 'opencode' });
 * const config2 = getGlobalProviderConfig();
 * console.log(config2.defaultProvider); // 'opencode'
 * ```
 *
 * @returns Current global provider configuration (never null)
 *
 * @example
 * ```ts
 * // Get default configuration
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 *
 * // Use for provider initialization
 * const providerOptions = config.providerDefaults?.[config.defaultProvider];
 * ```
 */
export function getGlobalProviderConfig(): GlobalProviderConfig {
  // Nullish coalescing for defaults
  // ?? only treats null/undefined as missing
  // Returns globalConfig if set, otherwise DEFAULT_CONFIG
  return globalConfig ?? DEFAULT_CONFIG;
}

/**
 * Reset global configuration to defaults
 *
 * **FOR TESTING PURPOSES ONLY**
 *
 * This function clears the global configuration, causing subsequent
 * calls to `getGlobalProviderConfig()` to return defaults.
 *
 * @internal
 */
export function resetGlobalConfig(): void {
  globalConfig = null;
}

/**
 * Resolve provider configuration with cascade
 *
 * **P1.M2.T1.S4 - Configuration Cascade Utility**
 *
 * This function implements the PRD 7.7 configuration cascade:
 * Global config → Agent config → Prompt config (highest priority).
 *
 * ## Provider Resolution
 *
 * The provider is resolved using nullish coalescing (`??`), which means
 * the first non-null/undefined value wins:
 *
 * ```ts
 * const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
 * ```
 *
 * Priority (highest to lowest):
 * 1. Prompt-level provider override
 * 2. Agent-level provider override
 * 3. Global default provider
 *
 * ## Options Merge
 *
 * Options are merged using object spread with "last write wins" semantics:
 *
 * ```ts
 * const options = {
 *   ...globalConfig.providerDefaults?.[provider],
 *   ...agentOptions,
 *   ...promptOptions
 * };
 * ```
 *
 * Priority (highest to lowest):
 * 1. Prompt-level options (override everything)
 * 2. Agent-level options (override global defaults)
 * 3. Global provider-specific defaults (base layer)
 *
 * ## Immutability
 *
 * This function creates a new options object and does not mutate any
 * input parameters. All object spreads create shallow copies.
 *
 * @param globalConfig - Global provider configuration from configureProviders()
 * @param agentProvider - Agent-level provider override (optional)
 * @param agentOptions - Agent-level options override (optional)
 * @param promptProvider - Prompt-level provider override (optional)
 * @param promptOptions - Prompt-level options override (optional)
 * @returns Resolved provider and merged options
 *
 * @example
 * ```ts
 * import { resolveProviderConfig, getGlobalProviderConfig } from 'groundswell';
 *
 * // Setup global config
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { timeout: 30000, apiKey: 'sk-global' },
 *     opencode: { endpoint: 'http://localhost:8080' }
 *   }
 * });
 *
 * // Agent configured with opencode override
 * const agentProvider = 'opencode';
 * const agentOptions = { timeout: 10000 };
 *
 * // Prompt with anthropic override
 * const promptProvider = 'anthropic';
 * const promptOptions = { temperature: 0.5 };
 *
 * const global = getGlobalProviderConfig();
 * const { provider, options } = resolveProviderConfig(
 *   global,
 *   agentProvider,
 *   agentOptions,
 *   promptProvider,
 *   promptOptions
 * );
 *
 * console.log(provider); // 'anthropic' (prompt wins)
 * console.log(options);
 * // { timeout: 30000, apiKey: 'sk-global', temperature: 0.5 }
 * // timeout from anthropic global defaults (agent's timeout was for opencode)
 * // apiKey from anthropic global defaults
 * // temperature from prompt options
 * ```
 */
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions } {
  // Step 1: Resolve provider using nullish coalescing
  // ?? operator: first non-null/undefined value wins
  const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;

  // Step 2: Get global defaults for the resolved provider
  // Optional chaining: returns undefined if providerDefaults or provider key doesn't exist
  const globalDefaults = globalConfig.providerDefaults?.[provider];

  // Step 3: Merge options using object spread
  // Later objects override earlier objects for the same keys
  const options: ProviderOptions = {
    ...(globalDefaults ?? {}),      // Global defaults (base layer)
    ...(agentOptions ?? {}),         // Agent overrides (middle layer)
    ...(promptOptions ?? {})         // Prompt overrides (top layer)
  };

  // Step 4: Return resolved configuration tuple
  return { provider, options };
}
