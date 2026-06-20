/**
 * Harness module exports
 *
 * Exports the HarnessRegistry class (+ deprecated ProviderRegistry alias)
 * for managing harness instances and InitializationStatus enum for type-safe
 * status checking.
 */

export { HarnessRegistry, ProviderRegistry, InitializationStatus } from './harness-registry.js';

export {
  MemorySessionStore,
  FileSessionStore,
} from './session-store.js';

export type {
  SessionStore,
  RedisSessionStore,
} from './session-store.js';

export { registerDefaultHarnesses } from './register-defaults.js';
