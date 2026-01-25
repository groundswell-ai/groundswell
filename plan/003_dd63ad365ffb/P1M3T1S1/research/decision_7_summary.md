# Decision 7 Summary: Provider Lifecycle Management

## Source

**Location:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/decisions.md`

**Status:** DECIDED (Singleton Registry)

## Full Decision Text

### Context Question
> How to manage provider instance lifecycle?

### Decision
> Use singleton provider registry

## Implementation Blueprint from Decision

```typescript
class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<ProviderId, Provider> = new Map();

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): Provider | undefined {
    return this.providers.get(id);
  }

  async initializeAll(config: GlobalProviderConfig): Promise<void> {
    for (const [id, provider] of this.providers) {
      const options = config.providerDefaults?.[id];
      await provider.initialize(options);
    }
  }
}
```

## Rationale (Why This Decision Was Made)

1. **Single instance per provider** - Ensures provider instances are shared across agents rather than creating duplicate instances
2. **Centralized initialization** - Provides a single point for initializing all providers with consistent configuration
3. **Consistent configuration** - All agents accessing the same provider get the same configuration and state

## Constraints and Requirements

Based on the implementation pattern:

- **Singleton enforcement**: Only one instance of `ProviderRegistry` can exist
- **Provider registration**: Providers must be registered with a unique `ProviderId` before use
- **Initialization requirement**: Providers need to be initialized with `GlobalProviderConfig` that may include provider-specific options
- **Map-based storage**: Uses a `Map<ProviderId, Provider>` for provider storage and retrieval
- **Async initialization**: The `initializeAll` method is asynchronous, suggesting provider initialization may involve async operations

## Related Context

This decision is part of a broader architectural decision log:
- Decision 1: OpenCode SDK Strategy (OPEN - requires resolution)
- Decision 2: Session Management Approach (DECISION NEEDED)
- Decision 3: Dependency Strategy for OpenCode SDK (DECISION NEEDED)
- Decision 4: Provider Capability Detection (DECISION NEEDED)
- Decision 5: Error Code Normalization (DECISION NEEDED)
- Decision 6: Model Specification Parsing (DECIDED - PRD specification)
- Decision 8: Testing Strategy for OpenCode (DECISION NEEDED)

## Implementation Notes for PRP

1. **This is P1.M3.T1.S1** - We implement the basic class structure only
2. **initializeAll() is for P1.M3.T1.S2** - NOT part of this subtask
3. **Core methods for S1**:
   - Private static instance variable
   - Private constructor
   - Static getInstance() method
   - register() method
   - get() method
   - has() method
4. **Methods for future subtasks**:
   - initializeAll() - S2 (provider initialization)
   - terminateAll() - S3 (provider termination and cleanup)

## Architecture Position

The singleton registry pattern was chosen to ensure efficient resource management and consistency across the multi-provider architecture. This registry serves as the central point for:
- Provider registration
- Provider lifecycle management
- Shared provider instances across agents
