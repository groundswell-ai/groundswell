/**
 * Global provider configuration — DEPRECATED shim.
 *
 * @deprecated Since v1.2. All logic has moved to {@link ./harness-config.js}.
 * Use `configureHarnesses` / `getGlobalHarnessConfig` / `resolveHarnessConfig` directly.
 * This module remains only so existing imports (agent.ts, utils/index.ts, tests) keep
 * resolving during the harness-vocabulary migration. Removed when P3.M1 rewires agent.ts.
 */
export {
  configureProviders,
  getGlobalProviderConfig,
  resolveProviderConfig,
  resetGlobalConfig,
} from './harness-config.js';
