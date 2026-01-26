# Provider Config Utilities Reference

## File Location
`/home/dustin/projects/groundswell/src/utils/provider-config.ts`

## getGlobalProviderConfig() Function

### Signature (Lines 288-335)

```typescript
/**
 * Get the current global provider configuration.
 *
 * Returns the configuration that was set via `configureProviders()`.
 * If no configuration has been set, returns sensible defaults.
 *
 * @returns Current global provider configuration
 */
export function getGlobalProviderConfig(): GlobalProviderConfig {
  if (!globalProviderConfig) {
    return {
      defaultProvider: 'anthropic',
      providerDefaults: {}
    };
  }
  return globalProviderConfig;
}
```

### Key Characteristics

1. **Returns defaults even if not configured**: Ensures Agent constructor always has valid config
2. **Default provider is 'anthropic'**: Ensures backward compatibility
3. **Empty providerDefaults**: No default options if not explicitly configured
4. **Never returns undefined**: Always returns valid GlobalProviderConfig

### Usage in Agent Constructor

```typescript
const globalConfig = getGlobalProviderConfig();
// globalConfig is always defined, even if configureProviders() was never called
```

## resolveProviderConfig() Function

### Signature (Lines 338-363)

```typescript
/**
 * Resolve provider configuration with cascade
 *
 * **P1.M2.T1.S4 - Configuration Cascade Utility**
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
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions }
```

### Implementation Details

```typescript
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions } {
  // Step 1: Resolve provider using nullish coalescing
  const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;

  // Step 2: Get global defaults for the resolved provider
  const globalDefaults = globalConfig.providerDefaults?.[provider];

  // Step 3: Merge options using object spread
  const options: ProviderOptions = {
    ...(globalDefaults ?? {}),      // Global defaults (base layer)
    ...(agentOptions ?? {}),        // Agent overrides (middle layer)
    ...(promptOptions ?? {})        // Prompt overrides (top layer)
  };

  // Step 4: Return resolved configuration tuple
  return { provider, options };
}
```

### Cascade Priority

**Provider Resolution** (highest to lowest):
1. `promptProvider` - Prompt-level override (not used in constructor - future task)
2. `agentProvider` - Agent-level override (from `this.providerId`)
3. `globalConfig.defaultProvider` - Global default (from `getGlobalProviderConfig()`)

**Options Merge** (highest to lowest):
1. `promptOptions` - Prompt-level options (not used in constructor)
2. `agentOptions` - Agent-level options (from `this.providerOptions`)
3. `globalDefaults` - Global provider defaults (from `globalConfig.providerDefaults[provider]`)

### Usage in Agent Constructor

```typescript
// In Agent constructor (P4.M2.T1.S1):
const globalConfig = getGlobalProviderConfig();
const resolved = resolveProviderConfig(
  globalConfig,
  this.providerId,      // Agent-level provider override
  this.providerOptions  // Agent-level options override
);
const effectiveProvider = resolved.provider;

// Note: promptProvider and promptOptions are undefined in constructor
// These will be used in later tasks (P4.M3.T1) for prompt-level overrides
```

## configureProviders() Function

### Signature (Lines 255-285)

```typescript
/**
 * Configure global provider settings.
 *
 * Sets the default provider and optional provider-specific defaults.
 * This affects all agents that don't specify an explicit provider.
 *
 * @param config Global provider configuration
 */
export function configureProviders(config: GlobalProviderConfig): void {
  globalProviderConfig = config;
}
```

### Usage Example

```typescript
import { configureProviders } from './utils/provider-config.js';

// Set up global provider configuration
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      apiKey: 'sk-ant-xxx',
      timeout: 30000
    },
    opencode: {
      endpoint: 'http://localhost:8080',
      timeout: 60000
    }
  }
});
```

## Type Definitions

### GlobalProviderConfig (from src/types/providers.ts)

```typescript
export interface GlobalProviderConfig {
  /**
   * Default provider to use when none specified
   */
  defaultProvider: ProviderId;

  /**
   * Per-provider default options
   * Mapped by provider ID, all options are optional
   */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### ProviderOptions (from src/types/providers.ts)

```typescript
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;
  /** API key (if not from environment) */
  apiKey?: string;
  /** Session ID for session-based providers */
  sessionId?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}
```

## Module Export

```typescript
export { configureProviders, getGlobalProviderConfig, resolveProviderConfig } from './utils/provider-config.js';
```

### Import Pattern

```typescript
// In Agent constructor file (src/core/agent.ts)
import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
```

## Important Notes for P4.M2.T1.S1

1. **Prompt-level overrides not used in constructor**: The `promptProvider` and `promptOptions` parameters are for future tasks (P4.M3.T1). In constructor, pass `undefined` or omit these parameters.

2. **getGlobalProviderConfig() always returns valid config**: Even if `configureProviders()` was never called, it returns defaults. This ensures Agent constructor can always run.

3. **Resolved options not used in constructor**: The `options` returned by `resolveProviderConfig()` are for provider initialization. In this task, we only need the `provider` field to get the provider instance.

4. **Cascade is read-only in constructor**: We're only resolving which provider to use. The actual provider initialization with options happens when the provider is registered (or in future tasks).
