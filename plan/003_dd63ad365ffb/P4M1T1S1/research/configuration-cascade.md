# Configuration Cascade Design

## PRD Section 7.7: Configuration Cascade

### Overview

The provider system implements a three-level configuration cascade where more specific configurations override less specific ones.

### Cascade Priority (Highest to Lowest)

```
1. Prompt-level overrides (highest priority)
   ↓
2. Agent-level configuration (AgentConfig.provider / AgentConfig.providerOptions)
   ↓
3. Global configuration (GlobalProviderConfig) (lowest priority)
```

### Provider Resolution

The provider is resolved using nullish coalescing (`??`):

```typescript
const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
```

**First non-null/undefined value wins**

### Options Merge

Options are merged using object spread with "last write wins" semantics:

```typescript
const options = {
  ...globalConfig.providerDefaults?.[provider],
  ...agentOptions,
  ...promptOptions
};
```

**Priority (highest to lowest)**:
1. Prompt-level options (override everything)
2. Agent-level options (override global defaults)
3. Global provider-specific defaults (base layer)

## Implementation Reference

### GlobalProviderConfig

**File**: `/src/types/providers.ts`

```typescript
/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Priority order (lowest to highest):
 * 1. GlobalProviderConfig (this config)
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### resolveProviderConfig Utility

**File**: `/src/utils/provider-config.ts`

```typescript
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
 */
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions }
```

## Cascade Examples

### Example 1: Global Config Only

```typescript
// Global configuration
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000 }
  }
});

// Agent config (no overrides)
const agent = new Agent({});

// Result: provider = 'anthropic', options = { timeout: 30000 }
```

### Example 2: Agent-Level Override

```typescript
// Global configuration
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000 }
  }
});

// Agent config (override provider)
const agent = new Agent({
  provider: 'opencode',
  providerOptions: { endpoint: 'http://localhost:8080' }
});

// Result: provider = 'opencode', options = { endpoint: 'http://localhost:8080' }
```

### Example 3: Prompt-Level Override (Future)

```typescript
// Global configuration
configureProviders({
  defaultProvider: 'anthropic'
});

// Agent config
const agent = new Agent({
  provider: 'opencode'
});

// Prompt-level override (highest priority)
const result = await agent.prompt('Hello', {
  provider: 'anthropic'  // Overrides agent provider
});

// Result: provider = 'anthropic' (prompt level wins)
```

### Example 4: Options Merge

```typescript
// Global configuration
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      timeout: 30000,
      headers: { 'X-Global': 'global-value' }
    }
  }
});

// Agent config (partial override)
const agent = new Agent({
  providerOptions: {
    timeout: 60000,  // Overrides global timeout
    apiKey: 'agent-key'  // Additional option
  }
});

// Result: options = {
//   timeout: 60000,  // Agent value (overrides global)
//   headers: { 'X-Global': 'global-value' },  // Global value (preserved)
//   apiKey: 'agent-key'  // Agent value (additional)
// }
```

## Key Design Principles

1. **Nullish Coalescing**: Uses `??` operator (not `||`) to distinguish between `null`/`undefined` and falsy values
2. **Immutability**: Creates new objects, never mutates inputs
3. **Last Write Wins**: Object spread merges with later properties overriding earlier ones
4. **Provider-Specific Defaults**: Global defaults are keyed by provider ID
5. **Explicit Override**: Each level can explicitly override any value from lower levels

## Relationship to This Task (P4.M1.T1.S1)

This task adds the **Agent-level** (middle layer) to the cascade:

- **Existing (Phase 1)**: Global configuration (lowest priority)
- **This Task (Phase 4)**: AgentConfig.provider / AgentConfig.providerOptions (middle priority)
- **Future Task (Phase 4)**: Prompt-level overrides (highest priority)

The `AgentConfig` fields added in this task will be used by `resolveProviderConfig()` in future tasks to implement the full cascade.
