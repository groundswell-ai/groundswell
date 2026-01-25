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
import type { GlobalProviderConfig } from '../types/providers.js';

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

// ============================================================================
// Future Functions (To Be Implemented in Subsequent Subtasks)
// ============================================================================

/**
 * Configure global provider settings
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S2**
 *
 * This function will mutate the module-private `globalConfig` variable.
 *
 * @param config - Global provider configuration
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'anthropic',
 *   providerDefaults: {
 *     anthropic: { apiKey: 'sk-...' }
 *   }
 * });
 * ```
 */
// export function configureProviders(config: GlobalProviderConfig): void { ... }

/**
 * Get the current global provider configuration
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S3**
 *
 * This function will return the module-private `globalConfig` variable.
 *
 * @returns Current global provider configuration
 * @throws {Error} If providers not configured (globalConfig is null)
 *
 * @example
 * ```ts
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 * ```
 */
// export function getGlobalProviderConfig(): GlobalProviderConfig { ... }

/**
 * Resolve provider configuration with cascade
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S4**
 *
 * This function will implement the configuration cascade:
 * Global → Agent → Prompt priority.
 *
 * @param agentProvider - Agent-level provider override
 * @param agentOptions - Agent-level options override
 * @returns Resolved provider and options
 *
 * @example
 * ```ts
 * const { provider, options } = resolveProviderConfig('opencode', { timeout: 5000 });
 * ```
 */
// export function resolveProviderConfig(
//   agentProvider?: ProviderId,
//   agentOptions?: ProviderOptions
// ): { provider: ProviderId; options: ProviderOptions } { ... }
