# PRP: Test Provider Initialization and Termination

**PRP ID**: P5.M1.T2.S2
**Work Item**: Test provider initialization and termination
**PRD Reference**: plan/003_dd63ad365ffb/PRD.md - Phase 5: Testing & Documentation, Milestone 5.1: Unit Tests

---

## Goal

**Feature Goal**: Create comprehensive unit tests for ProviderRegistry lifecycle management (`initializeAll()` and `terminateAll()` methods) that verify correct initialization/termination behavior, error handling, state transitions, and partial success tolerance.

**Deliverable**: Test file at `src/__tests__/unit/providers/provider-lifecycle.test.ts` with passing tests for all lifecycle scenarios.

**Success Definition**:
- All tests pass with `uv run pytest src/__tests__/unit/providers/provider-lifecycle.test.ts`
- Code coverage for `initializeAll()` and `terminateAll()` methods is ≥90%
- Error handling scenarios are thoroughly tested (single failure, multiple failures, all failures)
- State transitions are correctly verified (UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED)
- Parallel execution patterns are validated
- Test isolation is maintained with proper afterEach cleanup

---

## Why

### Business Value and User Impact

- **Reliability**: Ensures provider lifecycle management works correctly in production, preventing runtime failures during application startup/shutdown
- **Error Resilience**: Validates that one provider failure doesn't cascade to other providers (partial success tolerance)
- **Developer Confidence**: Provides test coverage that prevents regressions when modifying lifecycle logic
- **Documentation**: Tests serve as executable documentation of expected lifecycle behavior

### Integration with Existing Features

- Builds on **P1.M3.T1** (Provider Registry implementation) by adding test coverage for lifecycle methods
- Complements **P5.M1.T2.S1** (ProviderRegistry singleton and registration tests) by extending to lifecycle operations
- Enables **P5.M1.T3** (AnthropicProvider tests) to rely on verified registry lifecycle behavior
- Supports **P4.M2** (Agent integration) by ensuring providers are properly initialized before use

### Problems Solved

- **No Prior Coverage**: initializeAll() and terminateAll() currently have no dedicated tests
- **Complex Async Logic**: Promise.allSettled() patterns need thorough validation for partial success scenarios
- **State Management**: InitializationStatus transitions need verification to prevent race conditions
- **Error Aggregation**: BatchInitResult error collection needs testing to ensure proper error reporting

---

## What

### User-Visible Behavior

Tests verify internal ProviderRegistry behavior - not directly user-visible. However, correct lifecycle management ensures:

1. **Application Startup**: All providers initialize correctly on application start
2. **Graceful Shutdown**: All providers terminate cleanly on application shutdown
3. **Partial Success**: If one provider fails to initialize, others continue working
4. **Error Reporting**: Initialization failures are aggregated and reported via BatchInitResult

### Technical Requirements

#### Test initializeAll() Method

1. **Success Scenarios**:
   - All providers initialize successfully with empty config
   - All providers initialize successfully with provider-specific options
   - Options are correctly passed to each provider.initialize()
   - Returns BatchInitResult with all providers in success array
   - All providers have status INITIALIZED after successful initializeAll()

2. **Partial Success Scenarios**:
   - One provider fails, others succeed
   - Multiple providers fail, others succeed
   - Failed providers appear in failed array with error details
   - Successful providers appear in success array
   - Failed providers have status FAILED
   - Successful providers have status INITIALIZED

3. **Error Handling**:
   - Never throws - all errors captured in BatchInitResult
   - Errors in failed array are Error objects with messages
   - Provider initialization errors don't prevent other providers from initializing
   - Console.error is called for failed terminations (terminateAll only)

4. **State Management**:
   - UNINITIALIZED → INITIALIZING → INITIALIZED for successful providers
   - UNINITIALIZED → INITIALIZING → FAILED for failed providers
   - Concurrent initializeAll() calls share the same initialization promises
   - isReady() returns true only for INITIALIZED providers

5. **Edge Cases**:
   - Empty registry (no providers registered) returns empty success/failed arrays
   - Registry with single provider
   - Registry with many providers (stress test)

#### Test terminateAll() Method

1. **Success Scenarios**:
   - All providers terminate successfully
   - All providers have terminate() called exactly once
   - Both providers and states maps are cleared after termination
   - Registry can be reused after termination (register new providers)

2. **Partial Success Scenarios**:
   - One provider fails to terminate, others succeed
   - Multiple providers fail to terminate
   - Failed terminations are logged with console.error
   - All providers have terminate() called regardless of failures
   - Maps are still cleared even with failures

3. **Error Handling**:
   - Never throws - all errors caught and logged
   - console.error called with format: "Failed to terminate provider 'id': error"
   - Failed terminations don't prevent other providers from terminating

4. **State Management**:
   - After termination, getStatus() returns UNINITIALIZED for all providers
   - After termination, isReady() returns false for all providers
   - Termination of uninitialized providers is safe (no-op)

5. **Edge Cases**:
   - Empty registry (no providers) is safe
   - Calling terminateAll() twice is safe (idempotent)
   - Terminating already-terminated providers is safe

#### Test Lifecycle Integration

1. **Full Lifecycle**:
   - Register providers → initializeAll() → terminateAll() → register new providers
   - Verify clean state after full lifecycle
   - Verify registry can be reused after termination

2. **Concurrent Operations**:
   - Concurrent initializeAll() calls don't cause duplicate initialization
   - Concurrent terminateAll() calls are safe
   - Parallel execution is verified (timing tests)

### Success Criteria

- [ ] All tests in provider-lifecycle.test.ts pass
- [ ] Test coverage for initializeAll() ≥90%
- [ ] Test coverage for terminateAll() ≥90%
- [ ] All error scenarios tested (single failure, multiple failures, all failures)
- [ ] All state transitions verified
- [ ] Parallel execution patterns validated
- [ ] Test isolation maintained (no state leakage between tests)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

✅ **YES** - This PRP provides:
- Exact method signatures and return types
- Complete implementation code reference
- Mock creation patterns with code examples
- Test file location and naming conventions
- Vitest configuration and test runner commands
- Existing test patterns to follow
- Error handling requirements and patterns
- State management interfaces and enums
- Validation commands for all test levels

---

### Documentation & References

```yaml
# MUST READ - Implementation files to understand
- file: src/providers/provider-registry.ts
  why: Contains initializeAll() and terminateAll() implementations to test
  critical:
    - initializeAll() lines 360-401: Returns BatchInitResult, uses Promise.allSettled()
    - terminateAll() lines 511-530: Clears maps after Promise.allSettled()
    - BatchInitResult interface: { success: ProviderId[], failed: Array<{providerId, error}> }
    - _resetForTesting() and _resetInitStateForTesting() for test isolation

- file: src/types/providers.ts
  why: Contains Provider interface and type definitions needed for mocks
  critical:
    - Provider interface with initialize() and terminate() methods
    - ProviderId type: 'anthropic' | 'opencode'
    - ProviderCapabilities interface for mock setup
    - InitializationStatus enum: UNINITIALIZED, INITIALIZING, INITIALIZED, FAILED

- file: src/__tests__/unit/providers/provider-registry.test.ts
  why: Existing test file with patterns to follow for singleton and registration tests
  pattern:
    - createMockProvider() helper function pattern
    - afterEach cleanup with ProviderRegistry._resetForTesting()
    - describe/it test organization
    - expect() assertion patterns

- file: vitest.config.ts
  why: Test configuration for running tests
  critical:
    - Test include pattern: 'src/__tests__/**/*.test.ts'
    - globals: true (describe, it, expect available globally)
    - esbuild target: node18

# EXISTING TEST PATTERNS - Follow these exactly
- pattern: createMockProvider() helper
  file: src/__tests__/unit/providers/provider-registry.test.ts
  code: |
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
        terminate: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn(),
        registerMCPs: vi.fn().mockResolvedValue([]),
        loadSkills: vi.fn().mockResolvedValue(undefined),
        normalizeModel: vi.fn((model: string): ModelSpec => ({
          provider: id,
          model,
          raw: id,
        })),
      };
    }

- pattern: Test isolation cleanup
  file: src/__tests__/unit/providers/provider-registry.test.ts
  code: |
    afterEach(() => {
      const registry = ProviderRegistry.getInstance();
      registry._resetInitStateForTesting();
      ProviderRegistry._resetForTesting();
    });

- pattern: Mock with error
  code: |
    const error = new Error('Initialization failed');
    provider.initialize = vi.fn().mockRejectedValue(error);

- pattern: Async test with expect
  code: |
    it('should handle async initialization', async () => {
      await registry.initializeAll(config);
      expect(provider.initialize).toHaveBeenCalled();
    });

# VITEST MOCKING - Key APIs
- url: https://vitest.dev/api/mock
  why: Vitest mock API reference for vi.fn() patterns
  critical:
    - vi.fn().mockResolvedValue(value) for successful async
    - vi.fn().mockRejectedValue(error) for failed async
    - vi.fn().mockImplementation(fn) for custom logic
    - vi.spyOn(console, 'error') for logging verification

- url: https://vitest.dev/guide/test-context
  why: Test context and lifecycle hooks
  critical:
    - beforeEach() for setup
    - afterEach() for cleanup
    - describe() for test grouping
    - it() for individual tests

# TESTING PROMISE.ALLSETTLED() PATTERNS
- pattern: Partial success testing
  code: |
    const results = await Promise.allSettled([
      successProvider.initialize(),
      failureProvider.initialize(),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

- pattern: Parallel execution verification
  code: |
    let startTimes: number[] = [];

    const mock1 = {
      initialize: vi.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise(r => setTimeout(r, 10));
      }),
    };

    const mock2 = {
      initialize: vi.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise(r => setTimeout(r, 10));
      }),
    };

    await Promise.all([mock1.initialize(), mock2.initialize()]);

    // Parallel execution: start times should be close
    expect(startTimes[1] - startTimes[0]).toBeLessThan(5);

# WORK ITEM CONTEXT
- file: plan/003_dd63ad365ffb/tasks.json
  why: Overall PRD context for provider system
  section: P5.M1.T2 - Test Provider Registry

- file: plan/003_dd63ad365ffb/P5M1T2S1/
  why: Completed subtask with existing test patterns to follow
  pattern: Test file structure, mock patterns, assertion patterns
```

---

### Current Codebase Tree (Relevant Sections)

```bash
src/
├── providers/
│   └── provider-registry.ts          # IMPLEMENTATION - initializeAll(), terminateAll()
├── types/
│   └── providers.ts                  # TYPES - Provider, ProviderId, InitializationStatus
└── __tests__/
    └── unit/
        └── providers/
            └── provider-registry.test.ts    # EXISTING TESTS - singleton, registration
```

---

### Desired Codebase Tree with Files to be Added

```bash
src/
├── providers/
│   └── provider-registry.ts          # EXISTING - Methods to test
├── types/
│   └── providers.ts                  # EXISTING - Type definitions
└── __tests__/
    └── unit/
        └── providers/
            ├── provider-registry.test.ts      # EXISTING - Singleton, registration tests
            └── provider-lifecycle.test.ts     # NEW - Lifecycle tests (THIS PRP)
```

**File Responsibility**:
- `provider-lifecycle.test.ts`: Comprehensive tests for initializeAll() and terminateAll() lifecycle management

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: ProviderRegistry is a singleton - MUST reset between tests
// Always call both _resetForTesting() and _resetInitStateForTesting() in afterEach
afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();  // Clear states Map
  ProviderRegistry._resetForTesting();   // Clear singleton instance
});

// CRITICAL: initializeAll() NEVER throws - errors are in BatchInitResult.failed array
// Do NOT use expect().rejects.toThrow() for initializeAll()
// Instead check result.failed array length > 0

// CRITICAL: terminateAll() NEVER throws - errors are logged with console.error
// Use vi.spyOn(console, 'error') to verify error logging
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
await registry.terminateAll();
expect(errorSpy).toHaveBeenCalledWith(
  "Failed to terminate provider 'id':",
  expect.any(Error)
);

// GOTCHA: Promise.allSettled() results have discriminated unions
// Must check result.status before accessing result.value or result.reason
for (const result of results) {
  if (result.status === 'fulfilled') {
    // Access result.value
  } else {
    // Access result.reason
  }
}

// GOTCHA: Status transitions are async - use await before checking getStatus()
await registry.initializeProvider('anthropic');
expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);

// GOTCHA: Concurrent initializeAll() calls share promises
// Provider.initialize() is only called once even with multiple concurrent initializeAll()
const promises = [
  registry.initializeAll(config),
  registry.initializeAll(config),
  registry.initializeAll(config),
];
await Promise.all(promises);
expect(provider.initialize).toHaveBeenCalledTimes(1);  // NOT 3

// GOTCHA: terminateAll() clears maps AFTER promises settle
// Cannot check provider status after termination (returns undefined)
// Instead verify maps are cleared using @ts-expect-error to access private properties
// @ts-expect-error - Testing private property
expect(registry.providers.size).toBe(0);

// PATTERN: Use @ts-expect-error to test private properties for verification
// @ts-expect-error - Testing private property
expect(registry.providers.size).toBe(0);

// PATTERN: Mock timing verification for parallel execution
let timestamps: number[] = [];
provider.initialize = vi.fn().mockImplementation(async () => {
  timestamps.push(Date.now());
  await new Promise(r => setTimeout(r, 10));
});
// If parallel: timestamps[1] - timestamps[0] should be small (< 5ms)
// If sequential: timestamps[1] - timestamps[0] would be large (> 10ms)

// GOTCHA: GlobalProviderConfig has optional providerDefaults
// Config can be {} (empty) or { providerDefaults: { anthropic: {...} } }
const config: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' },
  },
};
```

---

## Implementation Blueprint

### Test Structure and Organization

```typescript
/**
 * Unit tests for ProviderRegistry lifecycle management
 *
 * Tests:
 * - initializeAll() with all providers succeeding
 * - initializeAll() with partial success (some fail, some succeed)
 * - initializeAll() error aggregation and BatchInitResult
 * - initializeAll() state transitions (UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED)
 * - initializeAll() with provider-specific options
 * - initializeAll() with empty registry
 * - initializeAll() concurrent execution (promise caching)
 * - terminateAll() with all providers succeeding
 * - terminateAll() with partial success (some fail to terminate)
 * - terminateAll() error logging (console.error)
 * - terminateAll() clears maps and allows reuse
 * - terminateAll() with empty registry
 * - terminateAll() idempotency (calling twice is safe)
 * - Full lifecycle: register → initializeAll → terminateAll → reuse
 * - Parallel execution verification (timing tests)
 *
 * PRP: P5.M1.T2.S2 - Test Provider Initialization and Termination
 */
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/unit/providers/provider-lifecycle.test.ts
  - IMPLEMENT: Test file skeleton with imports and describe block
  - ADD: Vitest imports (describe, it, expect, afterEach, vi)
  - ADD: Provider imports (ProviderRegistry, InitializationStatus)
  - ADD: Type imports (Provider, ProviderId, ProviderCapabilities, GlobalProviderConfig, BatchInitResult)
  - ADD: File header comment documenting test coverage
  - CREATE: createMockProvider() helper function
  - CREATE: afterEach cleanup hook
  - NAMING: provider-lifecycle.test.ts (matches existing pattern)
  - PLACEMENT: src/__tests__/unit/providers/

Task 2: IMPLEMENT initializeAll() success tests
  - CREATE: describe('initializeAll() - Success Scenarios') block
  - IMPLEMENT: test for all providers initialize successfully with empty config
  - IMPLEMENT: test for all providers initialize with provider-specific options
  - IMPLEMENT: test for options passed correctly to each provider.initialize()
  - VERIFY: BatchInitResult.success contains all provider IDs
  - VERIFY: BatchInitResult.failed is empty array
  - VERIFY: all providers have status INITIALIZED
  - FOLLOW: pattern from provider-registry.test.ts for assertion style

Task 3: IMPLEMENT initializeAll() partial success tests
  - CREATE: describe('initializeAll() - Partial Success') block
  - IMPLEMENT: test for one provider failing, others succeeding
  - IMPLEMENT: test for multiple providers failing
  - IMPLEMENT: test for all providers failing
  - VERIFY: failed providers appear in BatchInitResult.failed array
  - VERIFY: successful providers appear in BatchInitResult.success array
  - VERIFY: failed providers have status FAILED
  - VERIFY: successful providers have status INITIALIZED
  - VERIFY: errors in failed array are Error objects with messages

Task 4: IMPLEMENT initializeAll() state management tests
  - CREATE: describe('initializeAll() - State Management') block
  - IMPLEMENT: test for UNINITIALIZED → INITIALIZING → INITIALIZED transition
  - IMPLEMENT: test for UNINITIALIZED → INITIALIZING → FAILED transition
  - IMPLEMENT: test for isReady() returning true only for INITIALIZED providers
  - IMPLEMENT: test for concurrent initializeAll() sharing promises
  - VERIFY: provider.initialize() called only once despite multiple concurrent calls
  - FOLLOW: pattern for state checking using getStatus() and isReady()

Task 5: IMPLEMENT initializeAll() edge case tests
  - CREATE: describe('initializeAll() - Edge Cases') block
  - IMPLEMENT: test for empty registry (no providers registered)
  - IMPLEMENT: test for single provider registry
  - VERIFY: empty arrays returned for empty registry

Task 6: IMPLEMENT terminateAll() success tests
  - CREATE: describe('terminateAll() - Success Scenarios') block
  - IMPLEMENT: test for all providers terminating successfully
  - IMPLEMENT: test for all providers having terminate() called exactly once
  - VERIFY: providers map is cleared after termination (@ts-expect-error)
  - VERIFY: states map is cleared after termination (@ts-expect-error)
  - VERIFY: registry can be reused (register new providers after termination)

Task 7: IMPLEMENT terminateAll() partial success tests
  - CREATE: describe('terminateAll() - Partial Success') block
  - IMPLEMENT: test for one provider failing to terminate
  - IMPLEMENT: test for multiple providers failing to terminate
  - IMPLEMENT: test using vi.spyOn(console, 'error') to verify error logging
  - VERIFY: all providers have terminate() called regardless of failures
  - VERIFY: console.error called with format: "Failed to terminate provider 'id':"
  - VERIFY: maps are still cleared even with failures

Task 8: IMPLEMENT terminateAll() edge case tests
  - CREATE: describe('terminateAll() - Edge Cases') block
  - IMPLEMENT: test for empty registry (no providers)
  - IMPLEMENT: test for calling terminateAll() twice (idempotency)
  - IMPLEMENT: test for terminating uninitialized providers
  - VERIFY: no errors thrown for edge cases

Task 9: IMPLEMENT full lifecycle integration tests
  - CREATE: describe('Full Lifecycle Integration') block
  - IMPLEMENT: test for register → initializeAll → terminateAll sequence
  - IMPLEMENT: test for registry reuse after full lifecycle
  - VERIFY: clean state after full lifecycle
  - VERIFY: new providers can be registered and initialized after termination

Task 10: IMPLEMENT parallel execution verification tests
  - CREATE: describe('Parallel Execution Verification') block
  - IMPLEMENT: test using timing verification to confirm parallel execution
  - IMPLEMENT: test tracking start times of provider.initialize() calls
  - VERIFY: start times are close together (< 5ms difference for parallel)
  - FOLLOW: mock timing pattern with timestamps array and setTimeout
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// MOCK PROVIDER HELPER FUNCTION
// ============================================================

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
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: id,
    })),
  };
}

// ============================================================
// TEST ISOLATION PATTERN (CRITICAL - MUST USE)
// ============================================================

afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();
  ProviderRegistry._resetForTesting();
});

// ============================================================
// SUCCESSFUL INITIALIZATION TEST PATTERN
// ============================================================

describe('initializeAll() - Success Scenarios', () => {
  it('should initialize all providers successfully', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const opencode = createMockProvider('opencode');

    registry.register(anthropic);
    registry.register(opencode);

    const config: GlobalProviderConfig = {
      defaultProvider: 'anthropic',
    };

    const result = await registry.initializeAll(config);

    // Verify all providers succeeded
    expect(result.success).toHaveLength(2);
    expect(result.success).toContain('anthropic');
    expect(result.success).toContain('opencode');
    expect(result.failed).toHaveLength(0);

    // Verify initialize was called
    expect(anthropic.initialize).toHaveBeenCalledTimes(1);
    expect(opencode.initialize).toHaveBeenCalledTimes(1);

    // Verify status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getStatus('opencode')).toBe(InitializationStatus.INITIALIZED);
  });
});

// ============================================================
// PARTIAL SUCCESS TEST PATTERN
// ============================================================

describe('initializeAll() - Partial Success', () => {
  it('should handle one provider failing while others succeed', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const opencode = createMockProvider('opencode');

    // Make opencode fail
    const error = new Error('Connection failed');
    opencode.initialize = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(opencode);

    const config: GlobalProviderConfig = {
      defaultProvider: 'anthropic',
    };

    const result = await registry.initializeAll(config);

    // Verify partial success
    expect(result.success).toHaveLength(1);
    expect(result.success).toContain('anthropic');
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].providerId).toBe('opencode');
    expect(result.failed[0].error).toBe(error);

    // Verify status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getStatus('opencode')).toBe(InitializationStatus.FAILED);
  });
});

// ============================================================
// ERROR LOGGING TEST PATTERN (for terminateAll)
// ============================================================

describe('terminateAll() - Error Logging', () => {
  it('should log errors when providers fail to terminate', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const opencode = createMockProvider('opencode');

    // Make opencode fail
    const error = new Error('Already terminated');
    opencode.terminate = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(opencode);

    // Initialize first
    await registry.initializeAll({ defaultProvider: 'anthropic' });

    // Spy on console.error
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await registry.terminateAll();

    // Verify error was logged
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to terminate provider 'opencode':",
      error
    );

    // Verify both terminate() were called
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(opencode.terminate).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});

// ============================================================
// PRIVATE PROPERTY TEST PATTERN (@ts-expect-error)
// ============================================================

it('should clear maps after termination', async () => {
  const registry = ProviderRegistry.getInstance();
  const provider = createMockProvider('anthropic');

  registry.register(provider);
  await registry.initializeAll({ defaultProvider: 'anthropic' });

  // @ts-expect-error - Testing private property
  expect(registry.providers.size).toBe(1);

  await registry.terminateAll();

  // @ts-expect-error - Testing private property
  expect(registry.providers.size).toBe(0);

  // @ts-expect-error - Testing private property
  expect(registry.states.size).toBe(0);
});

// ============================================================
// PARALLEL EXECUTION TIMING TEST PATTERN
// ============================================================

describe('Parallel Execution Verification', () => {
  it('should initialize providers in parallel', async () => {
    const registry = ProviderRegistry.getInstance();
    const timestamps: number[] = [];

    const anthropic = createMockProvider('anthropic');
    anthropic.initialize = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    const opencode = createMockProvider('opencode');
    opencode.initialize = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    registry.register(anthropic);
    registry.register(opencode);

    const startTime = Date.now();
    await registry.initializeAll({ defaultProvider: 'anthropic' });
    const totalTime = Date.now() - startTime;

    // Parallel execution should take ~10ms, not ~20ms
    expect(totalTime).toBeLessThan(15);

    // Verify both were called
    expect(anthropic.initialize).toHaveBeenCalled();
    expect(opencode.initialize).toHaveBeenCalled();

    // Verify start times are close (parallel execution)
    expect(Math.abs(timestamps[1] - timestamps[0])).toBeLessThan(5);
  });
});

// ============================================================
// CONCURRENT CALL TEST PATTERN (PROMISE CACHING)
// ============================================================

it('should cache initialization promises for concurrent calls', async () => {
  const registry = ProviderRegistry.getInstance();
  const anthropic = createMockProvider('anthropic');

  registry.register(anthropic);

  const config: GlobalProviderConfig = {
    defaultProvider: 'anthropic',
  };

  // Call initializeAll multiple times concurrently
  const promises = [
    registry.initializeAll(config),
    registry.initializeAll(config),
    registry.initializeAll(config),
  ];

  await Promise.all(promises);

  // Should only initialize once (promise caching)
  expect(anthropic.initialize).toHaveBeenCalledTimes(1);
});

// ============================================================
// FULL LIFECYCLE INTEGRATION TEST PATTERN
// ============================================================

describe('Full Lifecycle Integration', () => {
  it('should handle register → initialize → terminate → reuse', async () => {
    const registry = ProviderRegistry.getInstance();

    // First lifecycle
    const provider1 = createMockProvider('anthropic');
    registry.register(provider1);
    await registry.initializeAll({ defaultProvider: 'anthropic' });
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    await registry.terminateAll();

    // Verify maps cleared
    // @ts-expect-error - Testing private property
    expect(registry.providers.size).toBe(0);

    // Second lifecycle (reuse registry)
    const provider2 = createMockProvider('opencode');
    registry.register(provider2);
    await registry.initializeAll({ defaultProvider: 'opencode' });
    expect(registry.getStatus('opencode')).toBe(InitializationStatus.INITIALIZED);
    await registry.terminateAll();
  });
});
```

---

### Integration Points

```yaml
NO NEW INTEGRATION POINTS - This is test-only work

TEST DEPENDENCIES:
  - import from: src/providers/provider-registry.ts
    classes: [ProviderRegistry, InitializationStatus]

  - import from: src/types/providers.ts
    types: [Provider, ProviderId, ProviderCapabilities, GlobalProviderConfig, ModelSpec]

  - import from: vitest
    functions: [describe, it, expect, afterEach, vi]

MOCK REQUIREMENTS:
  - Mock Provider instances with vi.fn()
  - Spy on console.error for termination error logging
  - Use @ts-expect-error to test private properties

FILES TO READ (for context):
  - src/providers/provider-registry.ts (lines 360-401 for initializeAll, 511-530 for terminateAll)
  - src/__tests__/unit/providers/provider-registry.test.ts (existing test patterns)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npx tsc --noEmit src/__tests__/unit/providers/provider-lifecycle.test.ts  # Type check

# Project-wide validation
uv run tsc --noEmit                    # Type check entire project
npx tsc --noEmit                       # Alternative type check

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.
# Note: Vitest globals are enabled, so no need to import describe/it/expect
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Test the lifecycle tests specifically
uv run vitest run src/__tests__/unit/providers/provider-lifecycle.test.ts

# Test with coverage for lifecycle methods
uv run vitest run src/__tests__/unit/providers/provider-lifecycle.test.ts --coverage

# Test all provider registry tests together
uv run vitest run src/__tests__/unit/providers/

# Full test suite for unit tests
uv run vitest run src/__tests__/unit/

# Coverage validation (if coverage tools available)
uv run vitest run --coverage

# Expected: All tests pass. If failing, debug root cause and fix test implementation.
# Look for:
# - "PASS" for all test cases
# - No "FAIL" markers
# - Coverage percentage for initializeAll() and terminateAll() ≥ 90%
```

---

### Level 3: Integration Testing (System Validation)

```bash
# Verify tests don't break existing tests
uv run vitest run src/__tests__/unit/providers/provider-registry.test.ts

# Run all unit tests to ensure no regressions
uv run vitest run src/__tests__/unit/

# Run full test suite
uv run vitest run

# Expected: All existing tests still pass, new lifecycle tests pass
# Check for:
# - No test interference (state leakage between tests)
# - No "describe" or "it" typos
# - Proper afterEach cleanup working
```

---

### Level 4: Coverage Validation (Quality Gates)

```bash
# Generate coverage report for lifecycle methods
uv run vitest run src/__tests__/unit/providers/provider-lifecycle.test.ts --coverage --reporter=verbose

# Check specific coverage thresholds
# Look for coverage output showing:
# - initializeAll() coverage ≥ 90%
# - terminateAll() coverage ≥ 90%
# - Overall file coverage for provider-registry.ts improved

# Expected: Coverage meets or exceeds 90% for lifecycle methods
# If coverage < 90%, add tests for missing branches:
# - Error paths
# - Edge cases
# - State transitions
# - Concurrent operations
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `uv run vitest run src/__tests__/unit/providers/provider-lifecycle.test.ts`
- [ ] No type errors: `npx tsc --noEmit src/__tests__/unit/providers/provider-lifecycle.test.ts`
- [ ] No existing tests broken: `uv run vitest run src/__tests__/unit/providers/`
- [ ] Test isolation maintained (no state leakage between tests)

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] initializeAll() tested with: all success, partial success, all fail, empty registry
- [ ] terminateAll() tested with: all success, partial success, empty registry, idempotency
- [ ] State transitions verified (UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED)
- [ ] Error handling validated (error aggregation, console.error logging)
- [ ] Parallel execution patterns verified (timing tests)
- [ ] Concurrent call patterns tested (promise caching)
- [ ] Full lifecycle integration tested (register → initialize → terminate → reuse)

### Code Quality Validation

- [ ] Follows existing test patterns from provider-registry.test.ts
- [ ] Uses createMockProvider() helper function
- [ ] Proper afterEach cleanup with _resetForTesting() and _resetInitStateForTesting()
- [ ] Test organization with describe/it blocks matches existing style
- [ ] Assertion patterns use expect() consistently
- [ ] Mock patterns use vi.fn() correctly
- [ ] @ts-expecterror used appropriately for private property testing

### Coverage Validation

- [ ] Coverage for initializeAll() ≥ 90%
- [ ] Coverage for terminateAll() ≥ 90%
- [ ] All error paths tested
- [ ] All edge cases tested
- [ ] All state transitions tested

---

## Anti-Patterns to Avoid

- ❌ Don't use expect().rejects.toThrow() for initializeAll() - it never throws, check result.failed array instead
- ❌ Don't forget to call both _resetForTesting() and _resetInitStateForTesting() in afterEach
- ❌ Don't use jest.fn() - use vi.fn() (this is Vitest, not Jest)
- ❌ Don't skip testing partial success scenarios - these are critical for production resilience
- ❌ Don't test private properties without @ts-expect-error comment explaining why
- ❌ Don't forget to restore vi.spyOn() mocks with mockRestore() or use mockImplementation(() => {})
- ❌ Don't assume sequential execution - verify parallel execution with timing tests
- ❌ Don't test terminateAll() errors by expecting throws - it never throws, use console.error spy instead
- ❌ Don't forget to initialize providers before testing terminateAll() (terminate works on initialized providers)
- ❌ Don't use generic mock patterns - follow the exact createMockProvider() pattern from existing tests
- ❌ Don't skip testing state transitions - use getStatus() to verify UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED
- ❌ Don't test concurrent initializeAll() without verifying initialize() is only called once (promise caching)
