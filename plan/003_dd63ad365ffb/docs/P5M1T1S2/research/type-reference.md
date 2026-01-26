# Type Reference: Configuration Cascade

## Core Types

### GlobalProviderConfig
**File**: `src/types/providers.ts` (lines 357-368)

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

### ProviderOptions
**File**: `src/types/providers.ts` (lines 36-51)

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

### ProviderId
**File**: `src/types/providers.ts` (lines 9-11)

```typescript
export type ProviderId =
  | 'anthropic'
  | 'opencode';
```

## Configuration Cascade Logic

### Provider Resolution Priority
1. **Prompt-level provider** (`promptProvider`) - highest priority
2. **Agent-level provider** (`agentProvider`) - middle priority
3. **Global default provider** (`globalConfig.defaultProvider`) - lowest priority

### Options Merge Priority
Object spread with "last write wins":
```typescript
const options: ProviderOptions = {
  ...(globalDefaults ?? {}),      // Base layer
  ...(agentOptions ?? {}),         // Middle layer
  ...(promptOptions ?? {})         // Top layer (overrides all)
};
```

## Critical Implementation Details

1. **Nullish coalescing for provider**: `promptProvider ?? agentProvider ?? globalConfig.defaultProvider`
2. **Provider-specific defaults**: `globalConfig.providerDefaults?.[provider]` - uses RESOLVED provider
3. **Immutability**: Function creates new objects, never mutates inputs
4. **Shallow merge**: Object spread is shallow (nested objects would share references)
