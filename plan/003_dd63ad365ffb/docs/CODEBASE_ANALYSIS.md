# Codebase Analysis: Provider Configuration Cascade

## Overview

This document summarizes the codebase analysis for implementing prompt-level provider overrides in Groundswell.

## Key Files Reference

| File Path | Purpose | Key Lines |
|-----------|---------|-----------|
| `/src/utils/provider-config.ts` | Configuration cascade utilities | 338-363 |
| `/src/providers/provider-registry.ts` | Provider registry singleton | 164-169, 219-223 |
| `/src/types/providers.ts` | Provider type definitions | 303-327, 393-426 |
| `/src/types/agent.ts` | AgentConfig and PromptOverrides | 1-996 |
| `/src/core/agent.ts` | Agent implementation | 103-116, 348-364, 546-835 |

## Current Implementation Status

### 1. Configuration Cascade Utilities (Already Implemented)

**File**: `/src/utils/provider-config.ts`

The `resolveProviderConfig()` function is already fully implemented:

```typescript
export function resolveProviderConfig(
  globalConfig: GlobalProviderConfig,
  agentProvider?: ProviderId,
  agentOptions?: ProviderOptions,
  promptProvider?: ProviderId,
  promptOptions?: ProviderOptions
): { provider: ProviderId; options: ProviderOptions }
```

**Cascade Logic**:
- Provider resolution: `promptProvider ?? agentProvider ?? globalConfig.defaultProvider`
- Options merge: Object spread with "last write wins" priority

### 2. Type Definitions (Already Defined)

**File**: `/src/types/agent.ts`

The `PromptOverrides` interface already includes provider override fields:

```typescript
export interface PromptOverrides {
  provider?: ProviderId;              // Already defined!
  providerOptions?: ProviderOptions;  // Already defined!
  // ... other override fields
}
```

### 3. Agent Constructor (Already Implemented)

**File**: `/src/core/agent.ts` (lines 103-116)

The Agent constructor already:
- Stores `this.providerId` and `this.providerOptions`
- Resolves effective provider using configuration cascade
- Gets provider instance from registry

### 4. executePrompt Method (Partially Implemented)

**File**: `/src/core/agent.ts` (lines 546-835)

The `executePrompt()` method already:
- Extracts `promptProvider` and `promptProviderOptions` from overrides
- Calls `resolveProviderConfig()` with all parameters
- Gets provider instance from registry (may differ from `this.provider`)

## Implementation Gap Analysis

### What is Already Working

1. **Type definitions**: `PromptOverrides` already has `provider` and `providerOptions` fields
2. **Cascade utility**: `resolveProviderConfig()` is implemented and tested
3. **Registry pattern**: `ProviderRegistry.getInstance().get()` works correctly
4. **Agent constructor**: Provider resolution at initialization works

### What Needs to be Implemented

**The `stream()` method** currently uses the cascade but may need updates to ensure it:
1. Correctly extracts prompt-level provider overrides
2. Re-resolves the provider for each stream request
3. Gets the correct provider instance from registry when provider changes

### Current stream() Implementation (Lines 348-364)

```typescript
public stream<T>(prompt: Prompt<T>, overrides?: PromptOverrides): AsyncStream<T> {
  // Extract prompt-level provider overrides
  const promptProvider = overrides?.provider;
  const promptProviderOptions = overrides?.providerOptions;

  // Resolve provider configuration with cascade
  const { provider: resolvedProvider, options: resolvedProviderOptions } = resolveProviderConfig(
    globalConfig,
    this.providerId,
    this.providerOptions,
    promptProvider,
    promptProviderOptions
  );

  // Get provider instance for resolved provider
  const providerInstance = registry.get(resolvedProvider);
  // ... continues with execution
}
```

This implementation appears to be **already correct** for the subtask requirements.

## Integration Points

### 1. Global Configuration Access

```typescript
import { getGlobalProviderConfig } from '@/utils/provider-config';
```

### 2. Provider Registry Access

```typescript
import { ProviderRegistry } from '@/providers/provider-registry';
const registry = ProviderRegistry.getInstance();
```

### 3. Cascade Resolution

```typescript
import { resolveProviderConfig } from '@/utils/provider-config';
const { provider, options } = resolveProviderConfig(
  globalConfig,
  agentProvider,
  agentOptions,
  promptProvider,
  promptOptions
);
```

## Test Coverage

**File**: `/src/__tests__/unit/utils/provider-config.test.ts`

Comprehensive tests exist for:
- All cascade priority combinations
- Provider switching behavior
- Options merging across provider boundaries
- Immutability guarantees
- Edge cases (undefined values, empty objects)

## Edge Cases and Gotchas

### 1. Provider Switching with Options

When switching providers, options from the agent level still apply to the new provider:

```typescript
// Agent configured with opencode options
agentProvider = 'opencode';
agentOptions = { timeout: 10000 };

// Prompt switches to anthropic
promptProvider = 'anthropic';

// Result: anthropic provider with opencode's timeout option
{
  provider: 'anthropic',
  options: { timeout: 10000 }  // Agent option carries over
}
```

### 2. Provider Not Registered

If the resolved provider is not in the registry:
```typescript
const providerInstance = registry.get(resolvedProvider);
if (!providerInstance) {
  throw new Error(`Provider '${resolvedProvider}' is not registered`);
}
```

### 3. Immutability

`resolveProviderConfig()` never mutates input parameters. Each call creates new objects.

## Design Patterns Used

1. **Configuration Cascade**: Global → Agent → Prompt priority
2. **Singleton Registry**: ProviderRegistry.getInstance()
3. **Nullish Coalescing**: `??` operator for "first defined wins"
4. **Object Spread**: `...` for options merging
5. **Type Safety**: Discriminated unions for result types

## Conclusion

The infrastructure for prompt-level provider overrides is **already fully implemented**. The subtask P4.M3.T1.S2 appears to be about verifying that the existing implementation correctly:

1. Extracts prompt-level provider and options from `PromptOverrides`
2. Passes these to `resolveProviderConfig()`
3. Gets the correct provider instance from the registry
4. Uses the resolved provider and options for execution

Both `executePrompt()` and `stream()` methods already implement this pattern correctly.
