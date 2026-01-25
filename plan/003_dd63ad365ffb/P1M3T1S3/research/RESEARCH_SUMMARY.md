# Research Summary - P1.M3.T1.S3: Provider Termination and Cleanup

## Implementation Contract

From `tasks.json` P1.M3.T1.S3:
- **INPUT**: None
- **LOGIC**: Add async `terminateAll()` method. For each registered provider, call `provider.terminate()`. Clear providers map. Handle errors (log but continue terminating others).
- **OUTPUT**: Clean shutdown of all providers.

## Codebase Patterns Analysis

### Existing Terminate Method

**File**: `src/types/providers.ts` (lines 490-500)

```typescript
/**
 * Terminate the provider and cleanup resources
 *
 * Called when provider is being shut down or unregistered.
 * Providers should close connections, release resources, etc.
 */
terminate(): Promise<void>;
```

**Key Points**:
- Async method returns `Promise<void>`
- Providers implement cleanup logic (close connections, release resources)
- No parameters - uses instance state

### Similar Pattern: initializeAll()

**File**: `src/providers/provider-registry.ts` (lines 360-401)

```typescript
public async initializeAll(
  config: GlobalProviderConfig
): Promise<BatchInitResult> {
  const providerIds = Array.from(this.providers.keys());

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
}
```

**Pattern to Follow**:
1. Use `Promise.allSettled` for parallel execution
2. Wrap each operation in try/catch for error collection
3. Aggregate results into success/failed arrays
4. Return discriminated union for type-safe handling

### Test Patterns

**File**: `src/__tests__/unit/providers/provider-registry.test.ts`

**Existing Test Helper** (lines 35-59):
```typescript
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),  // <-- Mock terminate
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}
```

**afterEach Pattern** (lines 26-30):
```typescript
afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();
  ProviderRegistry._resetForTesting();
});
```

## External Research Summary

### Promise.allSettled for Cleanup

**Key Insight**: `Promise.allSettled` is ideal for cleanup scenarios because:
1. Never rejects - always waits for all promises to settle
2. Provides status for each operation ('fulfilled' or 'rejected')
3. Enables "best effort" cleanup where some failures are acceptable

**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

### Error Handling Best Practices

**Continue-on-Error Pattern**:
- Log errors for debugging
- Don't throw during cleanup
- Let all cleanup attempts complete
- Aggregate errors for reporting

### State Management After Cleanup

**Clear Internal State**:
- `this.providers.clear()` - Remove provider references
- `this.states.clear()` - Reset initialization state
- Keep singleton instance - don't reset with `_resetForTesting()`

## Implementation Checklist

### Method Signature
- [ ] `async terminateAll(): Promise<void>` (simple version)
- [ ] OR: `async terminateAll(): Promise<TerminationResult>` (detailed version)

### Core Logic
- [ ] Get all provider IDs from `this.providers.keys()`
- [ ] Map each provider to termination promise with try/catch
- [ ] Use `Promise.allSettled` to wait for all terminations
- [ ] Log errors but continue on failure
- [ ] Clear `this.providers` map
- [ ] Clear `this.states` map

### Return Type Options

**Option 1: void return** (simpler)
```typescript
async terminateAll(): Promise<void>
```

**Option 2: TerminationResult** (more observable)
```typescript
interface TerminationResult {
  success: ProviderId[];
  failed: Array<{ providerId: ProviderId; error: Error }>;
}
```

**Recommendation**: Start with void return for simplicity. Can add result return later if needed for observability.

### Testing Checklist
- [ ] Test successful termination of all providers
- [ ] Test that `terminate()` is called on each provider
- [ ] Test error handling (one provider fails, others continue)
- [ ] Test that maps are cleared after termination
- [ ] Test with empty registry
- [ ] Test concurrent termination calls
- [ ] Verify console.error called for failed terminations

### Documentation
- [ ] Add JSDoc comment with @example
- [ ] Document error handling behavior (continue on error)
- [ ] Document state reset (maps cleared)

## Key Gotchas

1. **Don't use Promise.all**: Fails fast on first rejection, other providers won't terminate
2. **Don't throw from terminateAll**: Errors should be logged, not propagated
3. **Clear maps after termination**: Not before - wait for all providers to terminate
4. **Use Array.from()**: `this.providers.keys()` returns iterator, convert to array for map()
5. **Handle empty registry**: Should complete successfully with no errors

## Confidence Score

**9/10** for one-pass implementation success

**Reasoning**:
- Clear pattern to follow from `initializeAll()`
- Simple async iteration with error handling
- Well-established best practices for cleanup
- Test patterns already exist in codebase
- No external dependencies or complex integration

## Quick Reference Commands

```bash
# Run tests
pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts

# Watch mode
pnpm exec vitest watch src/__tests__/unit/providers/provider-registry.test.ts

# Type check
pnpm exec tsc --noEmit
```
