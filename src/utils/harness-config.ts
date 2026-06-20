/**
 * Harness configuration cascade utilities (PRD §7.6 / §7.7).
 *
 * ## Dual-Cascade Architecture
 *
 * This module provides the v1.2 canonical harness-configuration functions that operate
 * on the `GlobalHarnessConfig` / `HarnessId` / `HarnessOptions` types. It also contains
 * deprecated legacy aliases (`configureProviders` / `getGlobalProviderConfig` /
 * `resolveProviderConfig` / `resetGlobalConfig`) that preserve backward compatibility
 * with existing consumers (`agent.ts`, legacy test files) during the migration.
 *
 * ## Dual-Singleton Design (Scope Decision)
 *
 * The legacy and harness functions validate **disjoint id sets**:
 *   - `configureHarnesses` accepts only `'pi' | 'claude-code'`
 *   - `configureProviders` accepts the full `ProviderId` superset (including `'anthropic'`)
 *
 * Existing consumers (agent.ts, 4 integration/override test files) pass `'anthropic'`
 * through `configureProviders`. Making it delegate to `configureHarnesses` would throw and break
 * those consumers, which are out of scope for this task (owned by P3.M1 / P4.M1).
 *
 * Therefore, **`configureProviders` keeps its own module-private singleton** with permissive
 * validation, while `resolveProviderConfig` safely delegates to `resolveHarnessConfig` (which
 * performs NO id validation — it treats ids as opaque string keys).
 *
 * Once P3.M1 rewires agent.ts to read the harness path and P4.M1 removes the legacy literals,
 * the legacy singleton can be deleted and the aliases collapse to true delegation.
 *
 * @see {@link GlobalHarnessConfig} in types/harnesses.ts
 * @see {@link GlobalProviderConfig} in types/providers.ts
 */

// ── Harness types (isolatedModules → import type) ──────────────────────────────────────────
import type {
  GlobalHarnessConfig,
  HarnessId,
  HarnessOptions,
} from '../types/harnesses.js';

// ── Legacy provider types (isolatedModules → import type) ──────────────────────────────────
import type {
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions,
} from '../types/providers.js';

// ============================================================================
// Harness Cascade — Module-Private Storage
// ============================================================================

/**
 * Module-private harness configuration singleton.
 *
 * Not exported — access via `getGlobalHarnessConfig()` / `configureHarnesses()`.
 * @internal
 */
let globalHarnessConfig: GlobalHarnessConfig | null = null;

/**
 * Default harness configuration (PRD §7.1 — `pi` is the vendor-neutral default).
 * @internal
 */
const DEFAULT_HARNESS_CONFIG: GlobalHarnessConfig = {
  defaultHarness: 'pi' as HarnessId,
};

// ============================================================================
// Harness Cascade — Validation Helpers
// ============================================================================

/**
 * Type guard: checks if a string is a valid `HarnessId` ('pi' | 'claude-code').
 */
function isValidHarnessId(value: string): value is HarnessId {
  return value === 'pi' || value === 'claude-code';
}

/**
 * Formatted list of supported harnesses for error messages.
 */
function getSupportedHarnessesList(): string {
  return '"pi", "claude-code"';
}

// ============================================================================
// Harness Cascade — Public API
// ============================================================================

/**
 * Configure the global harness settings.
 *
 * Validates and stores the harness configuration. Should be called once at
 * application startup. The harness cascade (PRD §7.7) uses this as the lowest
 * priority layer — agent and prompt overrides take precedence.
 *
 * ## Validation
 *
 * - `defaultHarness` must be `'pi'` or `'claude-code'`
 * - `harnessDefaults` keys (if present) must be valid `HarnessId` values
 * - `defaultModelProvider` is an **open set** (any string) — NOT validated (PRD §7.8)
 *
 * @param config - Global harness configuration
 * @throws {Error} If `defaultHarness` is invalid
 * @throws {Error} If `harnessDefaults` contains invalid harness IDs
 *
 * @example
 * ```ts
 * import { configureHarnesses } from 'groundswell';
 *
 * configureHarnesses({
 *   defaultHarness: 'pi',
 *   defaultModelProvider: 'anthropic',
 *   harnessDefaults: {
 *     'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
 *   },
 * });
 * ```
 */
export function configureHarnesses(config: GlobalHarnessConfig): void {
  // Validate defaultHarness
  if (!isValidHarnessId(config.defaultHarness)) {
    throw new Error(
      `Invalid default harness: "${config.defaultHarness}". ` +
      `Supported harnesses: ${getSupportedHarnessesList()}`
    );
  }

  // Validate harnessDefaults keys (if present)
  if (config.harnessDefaults) {
    for (const id of Object.keys(config.harnessDefaults)) {
      if (!isValidHarnessId(id)) {
        throw new Error(
          `Invalid harness in harnessDefaults: "${id}". ` +
          `Supported harnesses: ${getSupportedHarnessesList()}`
        );
      }
    }
  }

  // Store configuration (defaultModelProvider is open set — no validation)
  globalHarnessConfig = config;
}

/**
 * Get the current global harness configuration.
 *
 * Returns the configured value if `configureHarnesses()` was called, otherwise
 * returns the default configuration. **Never returns null.**
 *
 * @returns Current global harness configuration
 *
 * @example
 * ```ts
 * const config = getGlobalHarnessConfig();
 * console.log(config.defaultHarness); // 'pi' (default)
 * ```
 */
export function getGlobalHarnessConfig(): GlobalHarnessConfig {
  return globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG;
}

/**
 * Resolve harness configuration via the PRD §7.7 cascade.
 *
 * A **pure function** — takes `globalConfig` as a parameter and does NOT read
 * the singleton. This purity enables both `resolveHarnessConfig` and the legacy
 * `resolveProviderConfig` (which delegates to this function) to work correctly.
 *
 * ## Provider Resolution (nullish coalescing — prompt wins)
 *
 * ```ts
 * const harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness;
 * ```
 *
 * ## Options Merge (object spread — last write wins)
 *
 * ```ts
 * const options = {
 *   ...globalConfig.harnessDefaults?.[harness],  // base
 *   ...agentOptions,                                // middle
 *   ...promptOptions,                               // top
 * };
 * ```
 *
 * @param globalConfig - Global harness configuration
 * @param agentHarness - Agent-level harness override (optional)
 * @param agentOptions - Agent-level options override (optional)
 * @param promptHarness - Prompt-level harness override (optional)
 * @param promptOptions - Prompt-level options override (optional)
 * @returns Resolved harness and merged options
 */
export function resolveHarnessConfig(
  globalConfig: GlobalHarnessConfig,
  agentHarness?: HarnessId,
  agentOptions?: HarnessOptions,
  promptHarness?: HarnessId,
  promptOptions?: HarnessOptions,
): { harness: HarnessId; options: HarnessOptions } {
  // Step 1: Resolve harness — prompt wins (first-defined-wins via ??)
  const harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness;

  // Step 2: Get global defaults for the resolved harness
  const globalDefaults = globalConfig.harnessDefaults?.[harness];

  // Step 3: Merge options — last write wins
  const options: HarnessOptions = {
    ...(globalDefaults ?? {}),
    ...(agentOptions ?? {}),
    ...(promptOptions ?? {}),
  };

  return { harness, options };
}

/**
 * Reset the global harness configuration to defaults.
 *
 * **FOR TESTING PURPOSES ONLY.**
 *
 * @internal
 */
export function resetGlobalHarnessConfig(): void {
  globalHarnessConfig = null;
}

// ============================================================================
// Deprecated Legacy Aliases — Module-Private Storage (Separate Singleton)
// ============================================================================

/**
 * Module-private LEGACY provider configuration singleton.
 *
 * **Separate from `globalHarnessConfig`** — the two validate disjoint id sets
 * (see module-level Scope Decision). This singleton is owned by the deprecated
 * `configureProviders` / `getGlobalProviderConfig` / `resetGlobalConfig` functions.
 * @internal
 */
let globalProviderConfig: GlobalProviderConfig | null = null;

/**
 * Default LEGACY provider configuration.
 * @internal
 */
const DEFAULT_PROVIDER_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic' as ProviderId,
  providerDefaults: undefined,
};

// ============================================================================
// Deprecated Legacy Aliases — Validation Helpers
// ============================================================================

/**
 * Type guard: checks if a string is a valid `ProviderId`.
 *
 * Accepts 'anthropic' (legacy), 'pi', and 'claude-code'.
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'pi' || value === 'claude-code';
}

/**
 * Formatted list of supported providers for LEGACY error messages.
 */
function getSupportedProvidersList(): string {
  return '"anthropic", "pi", "claude-code"';
}

// ============================================================================
// Deprecated Legacy Aliases — Public API
// ============================================================================

/**
 * Configure global provider settings.
 *
 * @deprecated Since v1.2. Use {@link configureHarnesses}.
 *
 * This function keeps its **own module-private singleton** (`globalProviderConfig`)
 * with permissive `ProviderId` validation. It does NOT delegate to
 * `configureHarnesses` because the harness validator rejects `'anthropic'`,
 * which existing consumers still pass.
 *
 * @param config - Global provider configuration
 * @throws {Error} If `defaultProvider` is invalid
 * @throws {Error} If `providerDefaults` contains invalid provider IDs
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

  // Step 3: Store configuration in the LEGACY singleton (NOT configureHarnesses)
  globalProviderConfig = config;
}

/**
 * Get the current global provider configuration.
 *
 * @deprecated Since v1.2. Use {@link getGlobalHarnessConfig}.
 *
 * Reads the legacy `globalProviderConfig` singleton. Returns the configured value
 * if `configureProviders()` was called, otherwise the legacy default
 * (`defaultProvider: 'anthropic'`). **Never returns null.**
 *
 * @returns Current global provider configuration
 */
export function getGlobalProviderConfig(): GlobalProviderConfig {
  return globalProviderConfig ?? DEFAULT_PROVIDER_CONFIG;
}

/**
 * Resolve provider configuration via the cascade.
 *
 * @deprecated Since v1.2. Use {@link resolveHarnessConfig}.
 *
 * **Delegates to {@link resolveHarnessConfig}** — the cascade algorithm is shared.
 * Translates the `GlobalProviderConfig` shape to `GlobalHarnessConfig` (field renames),
 * calls `resolveHarnessConfig` (which performs NO id validation — safe for legacy literals),
 * and maps the result back to `{ provider, options }`.
 *
 * @param globalConfig - Global provider configuration from configureProviders()
 * @param agentProvider - Agent-level provider override (optional)
 * @param agentOptions - Agent-level options override (optional)
 * @param promptProvider - Prompt-level provider override (optional)
 * @param promptOptions - Prompt-level options override (optional)
 * @returns Resolved provider and merged options
 */
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions,
): { provider: ProviderId; options: ProviderOptions } {
  // Translate GlobalProviderConfig → GlobalHarnessConfig shape (unsound but runtime-safe casts)
  const harnessGlobal: GlobalHarnessConfig = {
    defaultHarness: globalConfig.defaultProvider as HarnessId,
    harnessDefaults:
      globalConfig.providerDefaults as Partial<Record<HarnessId, HarnessOptions>> | undefined,
  };

  // Delegate to resolveHarnessConfig (pure function — no singleton coupling)
  const { harness, options } = resolveHarnessConfig(
    harnessGlobal,
    agentProvider as HarnessId | undefined,
    agentOptions as HarnessOptions | undefined,
    promptProvider as HarnessId | undefined,
    promptOptions as HarnessOptions | undefined,
  );

  // Map back to legacy shape
  return { provider: harness as ProviderId, options: options as ProviderOptions };
}

/**
 * Reset global configuration to defaults.
 *
 * @deprecated Since v1.2. Use {@link resetGlobalHarnessConfig}.
 *
 * **FOR TESTING PURPOSES ONLY.**
 *
 * @internal
 */
export function resetGlobalConfig(): void {
  globalProviderConfig = null;
}
