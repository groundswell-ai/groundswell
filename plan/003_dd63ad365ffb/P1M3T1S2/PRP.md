name: "P1.M3.T1.S2 - Provider Registry Initialization"
description: |

---

## Goal

**Feature Goal**: Add async initialization capability to ProviderRegistry to centralize provider initialization with status tracking and parallel initialization support.

**Deliverable**: Enhanced ProviderRegistry class with `initializeAll()`, `initializeProvider()`, status tracking methods, and comprehensive test coverage.

**Success Definition**:
- All registered providers can be initialized in parallel via `initializeAll(config)`
- Individual providers can be initialized via `initializeProvider(id, options)`
- Initialization status is tracked via `getStatus()`, `isReady()`, and `getAllStatuses()`
- Promise caching prevents duplicate initialization
- Errors are aggregated (not fail-fast) using Promise.allSettled
- All tests pass including edge cases (concurrent init, retries, partial failures)

## Why

- **Centralized initialization**: Currently agents initialize SDK directly. Registry will centralize this for consistency.
- **Parallel initialization**: Multiple providers initialize concurrently for faster startup.
- **Status visibility**: Query provider readiness before use (health checks, monitoring).
- **Partial failure tolerance**: One provider failure shouldn't block other providers.
- **Promise safety**: Concurrent initialization requests share the same promise (no duplicate work).

## What

Add async initialization methods to ProviderRegistry:

1. **`initializeAll(config: GlobalProviderConfig)`** - Initialize all registered providers in parallel
2. **`initializeProvider(id: ProviderId, options?: ProviderOptions)`** - Initialize single provider with promise caching
3. **`getStatus(id: ProviderId): InitializationStatus`** - Get provider initialization status
4. **`isReady(id: ProviderId): boolean`** - Check if provider is ready to use
5. **`getAllStatuses(): Map<ProviderId, InitializationState>`** - Get all provider statuses
6. **Testing utilities** - `_resetInitStateForTesting()`, `_setInitStateForTesting()`

### Success Criteria

- [ ] `initializeAll()` initializes all providers in parallel using Promise.allSettled
- [ ] Provider options resolved from `config.providerDefaults?.[providerId]`
- [ ] Initialization errors aggregated in return value (doesn't throw)
- [ ] `initializeProvider()` caches promises to prevent duplicate init
- [ ] Status transitions: UNINITIALIZED → INITIALIZING → INITIALIZED or FAILED
- [ ] Tests cover concurrent initialization, retries, partial failures
- [ ] Existing tests still pass (backward compatible)

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" test passed**: Someone unfamiliar with the codebase has everything needed to implement this feature successfully.

### Documentation & References

```yaml
# MUST READ - Async initialization patterns and best practices
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
  why: Promise.allSettled API for parallel initialization with partial success tolerance
  critical: Never rejects - always resolves with status array. Use instead of Promise.all for provider init.

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
  why: Type-safe result handling for initialization outcomes
  critical: Use discriminated unions for BatchInitResult type

# MUST READ - Research documentation in plan/003_dd63ad365ffb/P1M3T1S2/research/
- docfile: plan/003_dd63ad365ffb/P1M3T1S2/research/async_initialization_patterns.md
  why: Complete async initialization patterns with code examples
  section: Pattern 1.1 (Promise Caching), Pattern 1.2 (Batch Initialization)

- docfile: plan/003_dd63ad365ffb/P1M3T1S2/research/RESEARCH_SUMMARY.md
  why: Quick reference with implementation checklist and design decisions
  section: Implementation Checklist for P1.M3.T1.S2

# MUST READ - Existing implementation patterns
- file: src/providers/provider-registry.ts
  why: Current ProviderRegistry implementation with singleton pattern
  pattern: Map-based storage, private constructor, static getInstance(), _resetForTesting()
  gotcha: Follow existing JSDoc style, naming conventions, and testing utilities

- file: src/__tests__/unit/providers/provider-registry.test.ts
  why: Test patterns for ProviderRegistry including mock provider creation
  pattern: createMockProvider() helper, afterEach cleanup, expect().not.toThrow()
  gotcha: Use vi.fn().mockResolvedValue() for async methods

# MUST READ - Type definitions
- file: src/types/providers.ts
  why: Provider interface (initialize signature), GlobalProviderConfig structure
  pattern: Provider.initialize(options?: ProviderOptions): Promise<void>
  gotcha: ProviderOptions is optional - handle undefined gracefully

- file: src/utils/provider-config.ts
  why: getGlobalProviderConfig() and resolveProviderConfig() patterns
  pattern: Nullish coalescing (??) for defaults, object spread for merging
  gotcha: config.providerDefaults?.[providerId] may be undefined

# MUST READ - Async error handling patterns in codebase
- file: src/core/agent.ts
  why: Discriminated union error handling patterns
  pattern: AgentResponse<T> with status: 'success' | 'error' | 'partial'
  gotcha: Use type-safe status checking with discriminated unions

# REFERENCE - Provider configuration cascade
- file: src/utils/provider-config.ts:338-363
  why: How provider options cascade (global → agent → prompt)
  pattern: Object spread with last-write-wins: ...(globalDefaults ?? {}), ...(agentOptions ?? {})
  gotcha: For initializeAll, only use globalDefaults: config.providerDefaults?.[id]
```

### Current Codebase Tree (src/)

```bash
src/
├── providers/
│   ├── index.ts                 # Module exports
│   └── provider-registry.ts     # MODIFY: Add initialization methods
├── types/
│   ├── index.ts                 # Type exports
│   └── providers.ts             # READ: Provider, ProviderOptions, GlobalProviderConfig
├── utils/
│   ├── index.ts                 # Utility exports
│   └── provider-config.ts       # READ: getGlobalProviderConfig(), resolveProviderConfig()
└── __tests__/
    └── unit/
        └── providers/
            └── provider-registry.test.ts  # MODIFY: Add initialization tests
```

### Desired Codebase Tree with New Files

```bash
# No new files - modify existing:

src/providers/provider-registry.ts  # ENHANCE: Add initialization methods
├── ADD: private states: Map<ProviderId, ProviderInitState>
├── ADD: public async initializeAll(config: GlobalProviderConfig)
├── ADD: public async initializeProvider(id, options?)
├── ADD: public getStatus(id): InitializationStatus
├── ADD: public isReady(id): boolean
├── ADD: public getAllStatuses(): Map<ProviderId, InitializationState>
└── ADD: public _resetInitStateForTesting()

src/__tests__/unit/providers/provider-registry.test.ts  # ENHANCE: Add tests
├── ADD: describe('initializeProvider()')
├── ADD: describe('initializeAll()')
├── ADD: describe('getStatus()')
├── ADD: describe('isReady()')
└── ADD: describe('getAllStatuses()')
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Provider.initialize() accepts optional options
// Provider may throw errors - catch and aggregate, don't fail-fast

// CRITICAL: Use Promise.allSettled, not Promise.all
// Promise.all fails fast on first rejection - other providers won't init
// Promise.allSettled waits for ALL - partial success possible

// CRITICAL: Cache promises, not just state
// Without promise caching, concurrent calls trigger duplicate initialization
private initPromise?: Promise<void>;  // Store this, not just a boolean

// GOTCHA: config.providerDefaults?.[providerId] may be undefined
// Use optional chaining and nullish coalescing
const options = config.providerDefaults?.[id]; // May be undefined

// GOTCHA: Vitest mock functions for async methods
initialize: vi.fn().mockResolvedValue(undefined),

// PATTERN: Follow existing JSDoc style with @example blocks
// PATTERN: Use readonly properties on interfaces
// PATTERN: Throw descriptive errors with provider ID in message
```

## Implementation Blueprint

### Data Models and Structure

```typescript
/**
 * Provider initialization status enum
 *
 * Defines all possible initialization states for type-safe status tracking.
 */
enum InitializationStatus {
  UNINITIALIZED = 'uninitialized',  // Provider not yet initialized
  INITIALIZING = 'initializing',     // Currently initializing (in progress)
  INITIALIZED = 'initialized',       // Successfully initialized
  FAILED = 'failed',                 // Initialization failed
}

/**
 * Provider initialization state with metadata
 *
 * Tracks initialization progress and caches the init promise.
 */
interface ProviderInitState {
  /** Current initialization status */
  status: InitializationStatus;
  /** Cached initialization promise (prevents duplicate init) */
  initPromise?: Promise<void>;
  /** Error from failed initialization */
  error?: Error;
  /** Timestamp when initialization completed */
  initializedAt?: number;
}

/**
 * Batch initialization result with aggregated status
 *
 * Discriminated union for type-safe result handling.
 */
interface BatchInitResult {
  /** Successfully initialized provider IDs */
  success: ProviderId[];
  /** Failed providers with errors */
  failed: Array<{ providerId: ProviderId; error: Error }>;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD InitializationStatus enum and ProviderInitState interface
  - IMPLEMENT: Export InitializationStatus enum with string values
  - IMPLEMENT: Export ProviderInitState interface (status, initPromise, error, initializedAt)
  - LOCATION: src/providers/provider-registry.ts (at top of file, after imports)
  - NAMING: UPPER_CASE for enum values, camelCase for interface properties
  - PATTERN: Follow existing type definitions in src/types/providers.ts

Task 2: ADD private states Map to ProviderRegistry class
  - IMPLEMENT: private states: Map<ProviderId, ProviderInitState> = new Map()
  - LOCATION: In ProviderRegistry class, after private providers Map
  - INITIALIZATION: Initialize in constructor or at declaration
  - PURPOSE: Track initialization state per provider

Task 3: IMPLEMENT initializeProvider(id, options?) method
  - SIGNATURE: async initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void>
  - LOGIC:
    1. Get provider from this.providers Map
    2. Throw if provider not registered
    3. Get or create state from this.states Map
    4. Return cached promise if status === INITIALIZING
    5. Return immediately if status === INITIALIZED
    6. Set status to INITIALIZING
    7. Create and cache init promise:
       - await provider.initialize(options)
       - On success: set status to INITIALIZED, clear error
       - On failure: set status to FAILED, store error, re-throw
    8. Return the promise
  - PROMISE CACHING: Store initPromise in state to prevent duplicate init
  - ERROR HANDLING: Catch errors, update state, re-throw for caller
  - PATTERN: Follow research/async_initialization_patterns.md Pattern 1.1
  - GOTCHA: Concurrent calls must await SAME promise

Task 4: IMPLEMENT initializeAll(config) method
  - SIGNATURE: async initializeAll(config: GlobalProviderConfig): Promise<BatchInitResult>
  - LOGIC:
    1. Get all provider IDs from this.providers.keys()
    2. Map each ID to async init function:
       - Get options from config.providerDefaults?.[id]
       - await this.initializeProvider(id, options)
       - Return { status: 'success', providerId: id }
       - On catch: return { status: 'failed', providerId: id, error }
    3. Use Promise.allSettled to wait for all in parallel
    4. Aggregate results into success[] and failed[] arrays
    5. Return { success, failed }
  - PARALLEL: All providers initialize concurrently
  - PROMISE.ALLSETTLED: Use instead of Promise.all for partial success
  - ERROR AGGREGATION: Don't throw - collect all errors
  - PATTERN: Follow research/async_initialization_patterns.md Pattern 1.2

Task 5: IMPLEMENT getStatus(id) method
  - SIGNATURE: getStatus(id: ProviderId): InitializationStatus
  - LOGIC: Return this.states.get(id)?.status ?? InitializationStatus.UNINITIALIZED
  - DEFAULT: Return UNINITIALIZED for unknown providers
  - SYNC: No async - returns cached status immediately

Task 6: IMPLEMENT isReady(id) method
  - SIGNATURE: isReady(id: ProviderId): boolean
  - LOGIC: Return this.getStatus(id) === InitializationStatus.INITIALIZED
  - USAGE: Check if provider is ready before use

Task 7: IMPLEMENT getAllStatuses() method
  - SIGNATURE: getAllStatuses(): Map<ProviderId, ProviderInitState>
  - LOGIC: Return new Map(this.states) (copy for safety)
  - USAGE: Health checks, monitoring, debugging

Task 8: ADD _resetInitStateForTesting() method
  - SIGNATURE: _resetInitStateForTesting(): void
  - LOGIC: this.states.clear()
  - PURPOSE: Test isolation for initialization state
  - USAGE: Call in afterEach() hooks along with _resetForTesting()

Task 9: EXPORT InitializationStatus from module
  - MODIFY: src/providers/index.ts
  - ADD: export { InitializationStatus } from './provider-registry.js'
  - PURPOSE: Allow external status checking

Task 10: CREATE comprehensive tests in provider-registry.test.ts
  - IMPLEMENT: describe('initializeProvider()') block
    - Test successful initialization
    - Test promise caching (concurrent calls share promise)
    - Test already initialized returns immediately
    - Test provider not registered throws
    - Test initialization failure stores error
  - IMPLEMENT: describe('initializeAll()') block
    - Test all providers initialize in parallel
    - Test one failure doesn't prevent others
    - Test errors aggregated correctly
    - Test empty registry returns empty results
    - Test with config.providerDefaults
  - IMPLEMENT: describe('getStatus()') block
    - Test returns correct status
    - Test returns UNINITIALIZED for unknown provider
    - Test status transitions correctly
  - IMPLEMENT: describe('isReady()') block
    - Test returns true for INITIALIZED
    - Test returns false for other states
  - IMPLEMENT: describe('getAllStatuses()') block
    - Test returns all provider states
    - Test returns copy (not internal Map)
  - PATTERN: Follow existing test structure and createMockProvider() helper
  - CLEANUP: Add afterEach(() => { registry._resetInitStateForTesting(); })
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// KEY PATTERN 1: Promise Caching for Single Initialization
// ============================================================================

// ❌ WRONG: Race condition - concurrent calls create duplicate init
if (state.status !== 'initialized') {
  await provider.initialize(options);
  state.status = 'initialized';
}

// ✅ CORRECT: Cache promise - concurrent calls await same promise
if (state.status === InitializationStatus.INITIALIZING && state.initPromise) {
  return state.initPromise;  // Return cached promise
}

if (state.status === InitializationStatus.INITIALIZED) {
  return;  // Already initialized, return immediately
}

// Start initialization and cache promise
state.status = InitializationStatus.INITIALIZING;
state.initPromise = (async () => {
  try {
    await provider.initialize(options);
    state.status = InitializationStatus.INITIALIZED;
    state.initializedAt = Date.now();
    state.error = undefined;
  } catch (error) {
    state.status = InitializationStatus.FAILED;
    state.error = error as Error;
    throw error;  // Re-throw for caller
  }
})();

return state.initPromise;

// ============================================================================
// KEY PATTERN 2: Batch Initialization with Promise.allSettled
// ============================================================================

// ❌ WRONG: Promise.all fails fast - other providers won't init
await Promise.all(
  providerIds.map(id => this.initializeProvider(id, options))
);

// ✅ CORRECT: Promise.allSettled - partial success, collect all errors
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

// ============================================================================
// KEY PATTERN 3: JSDoc Documentation Style
// ============================================================================

/**
 * Initialize all registered providers in parallel
 *
 * Uses Promise.allSettled to allow partial success - if one provider fails,
 * others continue initialization. Errors are aggregated in the return value.
 *
 * Provider options are resolved from config.providerDefaults[providerId].
 * If no options are configured for a provider, undefined is passed.
 *
 * @param config - Global provider configuration with provider defaults
 * @returns Promise resolving to success/failure lists
 *
 * @example
 * ```ts
 * const registry = ProviderRegistry.getInstance();
 * const config = getGlobalProviderConfig();
 * const result = await registry.initializeAll(config);
 *
 * console.log(`Initialized: ${result.success.join(', ')}`);
 * if (result.failed.length > 0) {
 *   console.error(`Failed: ${result.failed.map(f => f.providerId).join(', ')}`);
 * }
 * ```
 */
```

### Integration Points

```yaml
TYPES:
  - add to: src/providers/provider-registry.ts
  - export: InitializationStatus enum
  - interface: ProviderInitState, BatchInitResult (file-local, no export needed)

MODULE_EXPORTS:
  - modify: src/providers/index.ts
  - add: export { InitializationStatus } from './provider-registry.js'

CONFIG_RESOLUTION:
  - pattern: config.providerDefaults?.[providerId]
  - nullish: options may be undefined - Provider.initialize() handles this
  - reference: src/utils/provider-config.ts:338-363

TEST_IMPORTS:
  - add: import { InitializationStatus } from '../../../providers/provider-registry.js'
  - existing: Already imports Provider, ProviderId, etc.
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
pnpm exec tsc --noEmit src/providers/provider-registry.ts
# Expected: Zero type errors

pnpm exec eslint src/providers/provider-registry.ts --fix
# Expected: Zero linting errors

# Project-wide validation
pnpm exec tsc --noEmit
pnpm exec eslint src/ --fix
pnpm exec prettier --check src/providers/provider-registry.ts

# Expected: All checks pass. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test ProviderRegistry initialization methods specifically
pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts

# Watch mode for development
pnpm exec vitest watch src/__tests__/unit/providers/provider-registry.test.ts

# Coverage validation
pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts --coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.

# Critical test scenarios to verify:
# - initializeProvider() initializes and caches promise
# - initializeAll() initializes all in parallel
# - One failure doesn't prevent others
# - Status tracking transitions correctly
# - Concurrent calls share same promise
```

### Level 3: Integration Testing (System Validation)

```bash
# Full test suite for providers module
pnpm exec vitest run src/__tests__/unit/providers/

# Run all unit tests to ensure no regressions
pnpm exec vitest run src/__tests__/unit/

# Integration test with mock providers
node -e "
import { ProviderRegistry } from './src/providers/index.js';
import { getGlobalProviderConfig } from './src/utils/index.js';

const registry = ProviderRegistry.getInstance();
// TODO: Register mock providers
const config = getGlobalProviderConfig();
await registry.initializeAll(config);
console.log('Success:', registry.getAllStatuses());
"

# Expected: All integrations working, no regressions in existing tests
```

### Level 4: Type Validation

```bash
# TypeScript type checking for new types
pnpm exec tsc --noEmit --pretty

# Verify InitializationStatus enum is accessible
node -e "import { InitializationStatus } from './src/providers/index.js'; console.log(InitializationStatus);"

# Verify method signatures match contract
# - initializeAll(config: GlobalProviderConfig): Promise<BatchInitResult>
# - initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void>
# - getStatus(id: ProviderId): InitializationStatus
# - isReady(id: ProviderId): boolean
# - getAllStatuses(): Map<ProviderId, ProviderInitState>

# Expected: Type errors are caught before runtime. All types resolve correctly.
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `pnpm exec vitest run`
- [ ] No TypeScript errors: `pnpm exec tsc --noEmit`
- [ ] No ESLint errors: `pnpm exec eslint src/`
- [ ] No Prettier issues: `pnpm exec prettier --check src/`
- [ ] InitializationStatus exported from module
- [ ] JSDoc comments on all public methods
- [ ] @example blocks in JSDoc for main methods

### Feature Validation

- [ ] `initializeAll()` initializes all providers in parallel (verified with test timing)
- [ ] `initializeProvider()` caches promises (verified concurrent calls share promise)
- [ ] One provider failure doesn't prevent others (Promise.allSettled verified)
- [ ] Status tracking works (UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED)
- [ ] `isReady()` returns correct boolean
- [ ] Provider options resolved from config.providerDefaults?.[id]
- [ ] Errors aggregated in BatchInitResult.failed array
- [ ] Existing tests still pass (backward compatibility)

### Code Quality Validation

- [ ] Follows existing ProviderRegistry patterns (Map storage, singleton, testing utilities)
- [ ] JSDoc style matches existing documentation
- [ ] Naming conventions: InitializationStatus (PascalCase enum), camelCase methods
- [ ] Error messages include provider ID for debugging
- [ ] No duplicate initialization (promise caching verified)
- [ ] Type safety: discriminated unions for results
- [ ] Test coverage: happy path, edge cases, errors, concurrent access

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable/function names
- [ ] JSDoc @param and @returns on all methods
- [ ] @example blocks for initializeAll() and initializeProvider()
- [ ] Research documents referenced in PRP
- [ ] Test isolation: _resetInitStateForTesting() in afterEach hooks

---

## Anti-Patterns to Avoid

- ❌ **Don't use Promise.all** - use Promise.allSettled for partial success tolerance
- ❌ **Don't cache just state** - cache the promise to prevent duplicate init
- ❌ **Don't throw on any failure** - aggregate errors, return BatchInitResult
- ❌ **Don't skip promise caching** - concurrent calls must share same promise
- ❌ **Don't use boolean flags** - use enum for type-safe status tracking
- ❌ **Don't forget test utilities** - add _resetInitStateForTesting() for isolation
- ❌ **Don't hardcode provider IDs** - iterate over this.providers.keys()
- ❌ **Don't mutate internal state** - return copies from getAllStatuses()
- ❌ **Don't use sync state checks** - always read from this.states Map
- ❌ **Don't ignore config.providerDefaults** - resolve options per provider

---

## Research References Summary

This PRP incorporates comprehensive research from:

1. **Async Initialization Patterns** (`research/async_initialization_patterns.md`)
   - Promise caching for single initialization (Pattern 1.1)
   - Batch initialization with Promise.allSettled (Pattern 1.2)
   - Status tracking with enums (Section 3.1)

2. **Best Practices Summary** (`research/RESEARCH_SUMMARY.md`)
   - Promise.allSettled vs Promise.all comparison
   - Implementation checklist for P1.M3.T1.S2
   - Common gotchas and how to avoid them

3. **URL References** (`research/urls_and_key_insights.md`)
   - MDN: Promise.allSettled documentation
   - TypeScript: Discriminated unions, type guards
   - AWS: Exponential backoff with jitter

**Confidence Score**: 9/10 for one-pass implementation success

The PRP provides complete context including:
- Exact file locations and existing patterns to follow
- Complete async initialization patterns with code examples
- Type definitions with all properties specified
- Test patterns matching existing codebase conventions
- Validation commands verified to work in this project
- Anti-patterns section with specific gotchas to avoid
