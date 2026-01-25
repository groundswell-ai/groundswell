# Async Cleanup Patterns Research

## Overview

This document compiles async cleanup and shutdown patterns for implementing `terminateAll()` in ProviderRegistry. Patterns are sourced from the codebase and established best practices.

## Pattern 1: Continue-on-Error Cleanup with Promise.allSettled

### Concept

When terminating multiple providers, one provider's failure should not prevent other providers from terminating. Use `Promise.allSettled` to ensure all termination attempts complete.

### Implementation Pattern

```typescript
/**
 * Terminate all registered providers with error tolerance
 *
 * Uses Promise.allSettled to ensure all providers get a chance to
 * terminate, even if some fail. Errors are logged but not thrown.
 */
async terminateAll(): Promise<void> {
  const providerIds = Array.from(this.providers.keys());

  // Create termination promises for each provider
  const terminatePromises = providerIds.map(async (id) => {
    const provider = this.providers.get(id);
    if (!provider) return;

    try {
      await provider.terminate();
    } catch (error) {
      // Log but continue - don't let one failure block others
      console.error(`Failed to terminate provider '${id}':`, error);
    }
  });

  // Wait for all terminations to complete (success or failure)
  await Promise.allSettled(terminatePromises);

  // Clear providers map after all termination attempts
  this.providers.clear();
  this.states.clear();
}
```

### Why Promise.allSettled vs Promise.all

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| `Promise.all()` | Fails fast on first rejection | When all operations must succeed |
| `Promise.allSettled()` | Waits for all, never rejects | When partial success is acceptable |

**For cleanup**: Always use `Promise.allSettled`. Cleanup should always attempt to complete, even if some resources fail to release.

## Pattern 2: Explicit Error Logging During Cleanup

### Concept

During cleanup, errors should be logged for debugging but not thrown to prevent interrupting the cleanup process.

### Implementation Pattern

```typescript
async terminateAll(): Promise<void> {
  const errors: Array<{ providerId: ProviderId; error: Error }> = [];

  for (const [id, provider] of this.providers.entries()) {
    try {
      await provider.terminate();
    } catch (error) {
      // Collect errors for logging after cleanup completes
      errors.push({ providerId: id, error: error as Error });
    }
  }

  // Clear maps after attempting termination
  this.providers.clear();
  this.states.clear();

  // Log collected errors
  if (errors.length > 0) {
    console.error('Provider termination failures:', errors);
  }
}
```

### Benefits

1. **All providers attempted**: Every provider gets a chance to terminate
2. **Debugging visibility**: Errors are logged with context
3. **Clean state**: Maps are always cleared, even on failures
4. **No exception propagation**: Cleanup completes without throwing

## Pattern 3: Parallel vs Sequential Cleanup

### Parallel Cleanup (Faster)

```typescript
// All providers terminate concurrently
const promises = Array.from(this.providers.values()).map(p => p.terminate());
await Promise.allSettled(promises);
```

**Use when**: Provider termination is independent and can happen simultaneously.

### Sequential Cleanup (Safer)

```typescript
// Providers terminate one at a time
for (const provider of this.providers.values()) {
  await provider.terminate(); // or try/catch for error tolerance
}
```

**Use when**: Providers have dependencies or resource constraints.

### Recommendation

For ProviderRegistry, use **parallel cleanup** with `Promise.allSettled`. Providers are independent resources (separate API clients, connections) and can terminate concurrently.

## Pattern 4: State Reset After Cleanup

### Concept

After termination completes, reset all tracking state to allow for clean re-initialization.

### Implementation Pattern

```typescript
async terminateAll(): Promise<void> {
  // ... termination logic ...

  // Clear all state
  this.providers.clear();
  this.states.clear();
  this.isInitialized = false;
}
```

### Why Clear Maps?

1. **Memory management**: Remove references to terminated providers
2. **Re-initialization support**: Allow registry to be used again
3. **Consistent state**: Prevent stale references after termination

## Pattern 5: Singleton Cleanup Considerations

### Challenge

ProviderRegistry is a singleton. After `terminateAll()`, should the singleton instance be cleared?

### Option A: Keep Instance, Clear State

```typescript
async terminateAll(): Promise<void> {
  // Terminate all providers
  await Promise.allSettled(
    Array.from(this.providers.values()).map(p => p.terminate())
  );

  // Clear internal state
  this.providers.clear();
  this.states.clear();
}

// Singleton instance remains usable
const registry = ProviderRegistry.getInstance();
await registry.terminateAll();
// Can register new providers and use registry again
```

### Option B: Reset Instance Entirely

```typescript
async terminateAll(): Promise<void> {
  // Terminate all providers
  await Promise.allSettled(
    Array.from(this.providers.values()).map(p => p.terminate())
  );

  // Clear singleton instance
  ProviderRegistry._resetForTesting();
}
```

### Recommendation

**Option A**: Keep instance, clear internal state. This allows the registry to be reused without requiring a new `getInstance()` call. Resetting the singleton should only be done explicitly via `_resetForTesting()`.

## Pattern 6: Termination Status Tracking

### Concept

Track which providers successfully terminated and which failed.

### Implementation Pattern

```typescript
interface TerminationResult {
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}

async terminateAll(): Promise<TerminationResult> {
  const results = await Promise.allSettled(
    Array.from(this.providers.entries()).map(async ([id, provider]) => {
      try {
        await provider.terminate();
        return { status: 'success' as const, providerId: id };
      } catch (error) {
        return {
          status: 'failed' as const,
          providerId: id,
          error: error as Error
        };
      }
    })
  );

  const success: ProviderId[] = [];
  const failed: Array<{ providerId: ProviderId; error: Error }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.status === 'success') {
        success.push(value.providerId);
      } else {
        failed.push({ providerId: value.providerId, error: value.error });
      }
    }
  }

  // Always clear maps
  this.providers.clear();
  this.states.clear();

  return { success, failed };
}
```

### Benefits

1. **Observable results**: Caller knows which providers terminated successfully
2. **Debugging aid**: Failed providers are identified with errors
3. **Testing support**: Easy to assert on termination results

### Simplified Alternative

If detailed status tracking isn't needed, a simpler void-return version:

```typescript
async terminateAll(): Promise<void> {
  const terminatePromises = Array.from(this.providers.entries()).map(
    async ([id, provider]) => {
      try {
        await provider.terminate();
      } catch (error) {
        console.error(`Failed to terminate provider '${id}':`, error);
      }
    }
  );

  await Promise.allSettled(terminatePromises);
  this.providers.clear();
  this.states.clear();
}
```

## Codebase Patterns Referenced

### From ProviderRegistry (lines 360-401)

The `initializeAll()` method uses `Promise.allSettled` for parallel initialization with error aggregation:

```typescript
const initPromises = providerIds.map(async (id) => {
  const options = config.providerDefaults?.[id];
  try {
    await this.initializeProvider(id, options);
    return { status: 'success' as const, providerId: id };
  } catch (error) {
    return {
      status: 'failed' as const,
      providerId: id,
      error: error as Error
    };
  }
});

const results = await Promise.allSettled(initPromises);

// Aggregate results
const success: ProviderId[] = [];
const failed: Array<{ providerId: ProviderId; error: Error }> = [];

for (const result of results) {
  if (result.status === 'fulfilled') {
    const value = result.value;
    if (value.status === 'success') {
      success.push(value.providerId);
    } else {
      failed.push({ providerId: value.providerId, error: value.error });
    }
  }
}

return { success, failed };
```

**Follow this pattern for `terminateAll()`** for consistency.

### From Task Decorator (lines 113-138)

Concurrent task execution with error handling:

```typescript
const results = await Promise.allSettled(runnable.map((w) => w.run()));

for (const result of results) {
  if (result.status === 'rejected' && result.reason) {
    errors.push(result.reason);
  }
}
```

**Pattern**: Use `Promise.allSettled`, then process results to handle failures.

## Testing Patterns for Cleanup

### Pattern 1: Verify Termination Called

```typescript
it('should call terminate on all providers', async () => {
  const registry = ProviderRegistry.getInstance();
  const anthropic = createMockProvider('anthropic');
  const opencode = createMockProvider('opencode');

  registry.register(anthropic);
  registry.register(opencode);

  await registry.terminateAll();

  expect(anthropic.terminate).toHaveBeenCalledTimes(1);
  expect(opencode.terminate).toHaveBeenCalledTimes(1);
});
```

### Pattern 2: Verify Error Tolerance

```typescript
it('should continue terminating other providers if one fails', async () => {
  const registry = ProviderRegistry.getInstance();
  const anthropic = createMockProvider('anthropic');
  const opencode = createMockProvider('opencode');

  // Make anthropic fail
  anthropic.terminate = vi.fn().mockRejectedValue(new Error('Anthropic failed'));

  registry.register(anthropic);
  registry.register(opencode);

  await registry.terminateAll();

  // Both terminate() should be called despite failure
  expect(anthropic.terminate).toHaveBeenCalledTimes(1);
  expect(opencode.terminate).toHaveBeenCalledTimes(1);
});
```

### Pattern 3: Verify Maps Cleared

```typescript
it('should clear providers and states maps after termination', async () => {
  const registry = ProviderRegistry.getInstance();
  const provider = createMockProvider('anthropic');

  registry.register(provider);
  await registry.initializeProvider('anthropic');

  await registry.terminateAll();

  expect(registry.has('anthropic')).toBe(false);
  expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);
});
```

## Summary Checklist

For implementing `terminateAll()` in ProviderRegistry:

- [ ] Use `Promise.allSettled` for parallel termination
- [ ] Continue on error (log but don't throw)
- [ ] Clear `providers` map after termination
- [ ] Clear `states` map after termination
- [ ] Consider returning `TerminationResult` for observability
- [ ] Follow existing `initializeAll()` pattern for consistency
- [ ] Add JSDoc documentation with examples
- [ ] Test successful termination
- [ ] Test partial failure (one provider fails, others succeed)
- [ ] Test that maps are cleared
- [ ] Test with empty registry
