name: "P1.M3.T1.S3 - Provider Registry Termination and Cleanup"
description: |

---

## Goal

**Feature Goal**: Add async `terminateAll()` method to ProviderRegistry for clean shutdown of all registered providers with error-tolerant parallel termination.

**Deliverable**: Enhanced ProviderRegistry class with `terminateAll()` method that terminates all providers in parallel, logs errors without throwing, and clears internal state.

**Success Definition**:
- All registered providers are terminated via `provider.terminate()`
- Termination happens in parallel using `Promise.allSettled`
- One provider's failure doesn't prevent others from terminating
- Internal maps (`providers`, `states`) are cleared after termination
- Errors are logged but method doesn't throw
- Comprehensive tests pass including error scenarios

## User Persona

**Target User**: Groundswell framework developers and application code that needs graceful shutdown:
- Application shutdown handlers (SIGTERM, SIGINT)
- Test teardown and cleanup
- Provider re-initialization scenarios
- Resource management during lifecycle changes

**Use Case**: When an application is shutting down or needs to reinitialize providers, `terminateAll()` ensures all providers release their resources (connections, handles, etc.) cleanly.

**User Journey**:
1. Application receives shutdown signal (SIGTERM/SIGINT)
2. Application calls `ProviderRegistry.getInstance().terminateAll()`
3. All providers terminate in parallel, closing connections and releasing resources
4. Registry internal state is cleared
5. Application exits cleanly

**Pain Points Addressed**:
- **Resource leaks**: Without proper cleanup, connections and handles leak
- **Hanging shutdown**: Synchronous or fail-fast cleanup leaves some resources active
- **Cascade failures**: One provider's termination failure shouldn't block others
- **State inconsistency**: Partial cleanup leaves registry in undefined state

## Why

- **Resource cleanup**: From `implementation_patterns.md` - "Proper cleanup prevents resource leaks"
- **Graceful shutdown**: Enables clean application exit without orphaned connections
- **Re-initialization support**: Allows registry to be reused after termination
- **Error tolerance**: One provider failure shouldn't prevent others from cleaning up
- **Symmetry with initialization**: Mirrors `initializeAll()` for complete lifecycle management

## What

Add `terminateAll()` method to ProviderRegistry for clean provider shutdown.

### Contract Definition (from tasks.json P1.M3.T1.S3)

1. **RESEARCH NOTE**: From `implementation_patterns.md` - Proper cleanup prevents resource leaks.
2. **INPUT**: None.
3. **LOGIC**: Add async `terminateAll()` method. For each registered provider, call `provider.terminate()`. Clear providers map. Handle errors (log but continue terminating others).
4. **OUTPUT**: Clean shutdown of all providers.

### Success Criteria

- [ ] `terminateAll()` method exists in ProviderRegistry
- [ ] Calls `terminate()` on all registered providers
- [ ] Uses `Promise.allSettled` for parallel termination
- [ ] Logs errors but continues terminating other providers
- [ ] Clears `providers` map after termination completes
- [ ] Clears `states` map after termination completes
- [ ] Handles empty registry (no providers) gracefully
- [ ] Includes JSDoc documentation with @example
- [ ] Comprehensive tests pass (success, errors, empty, concurrent)

## All Needed Context

### Context Completeness Check

✅ **PASS**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully from this PRP.

### Documentation & References

```yaml
# MUST READ - Async cleanup patterns with code examples
- docfile: plan/003_dd63ad365ffb/P1M3T1S3/research/async_cleanup_patterns.md
  why: Complete async cleanup patterns with Promise.allSettled, error handling, state reset
  section: Pattern 1 (Continue-on-Error), Pattern 3 (Parallel vs Sequential), Pattern 6 (Status Tracking)
  critical: Shows exact implementation pattern to follow

# MUST READ - Implementation patterns from codebase
- docfile: plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: "Proper cleanup prevents resource leaks" - core requirement for this feature
  section: Line 1 - "Proper cleanup prevents resource leaks"

# MUST READ - Similar pattern to follow: initializeAll()
- file: src/providers/provider-registry.ts
  why: Exact pattern to mirror for terminateAll() - uses Promise.allSettled with error aggregation
  section: Lines 360-401 (initializeAll method)
  pattern: Map IDs to promises, try/catch each, Promise.allSettled, aggregate results
  critical: Follow this exact structure for consistency

# MUST READ - Provider.terminate() interface
- file: src/types/providers.ts
  why: Defines the terminate() method signature we're calling
  section: Lines 490-500 (terminate method documentation)
  pattern: terminate(): Promise<void>
  gotcha: Provider may throw errors - must catch and log, don't fail-fast

# MUST READ - Existing ProviderRegistry structure
- file: src/providers/provider-registry.ts
  why: Current class structure with providers Map and states Map
  section: Lines 111-537 (entire class)
  pattern: private providers: Map<ProviderId, Provider>, private states: Map<ProviderId, ProviderInitState>
  gotcha: Clear BOTH maps after termination, not just providers

# MUST READ - Test patterns for ProviderRegistry
- file: src/__tests__/unit/providers/provider-registry.test.ts
  why: Existing test structure with createMockProvider() helper and afterEach cleanup
  section: Lines 35-59 (createMockProvider helper), Lines 26-30 (afterEach pattern)
  pattern: vi.fn().mockResolvedValue(undefined) for async methods
  gotcha: Mock terminate() with vi.fn().mockResolvedValue(undefined)

# MUST READ - Promise.allSettled documentation
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
  why: API reference for Promise.allSettled used in terminateAll()
  critical: Never rejects - always resolves with status array. Use instead of Promise.all.

# MUST READ - External research summary
- docfile: plan/003_dd63ad365ffb/P1M3T1S3/research/RESEARCH_SUMMARY.md
  why: Quick reference with implementation checklist and key gotchas
  section: Implementation Checklist, Key Gotchas

# REFERENCE - URL insights for async cleanup
- docfile: plan/003_dd63ad365ffb/P1M3T1S3/research/urls_and_key_insights.md
  why: Curated URLs with specific insights for cleanup patterns
  section: Promise.allSettled usage, Node.js shutdown patterns
```

### Current Codebase Tree (src/)

```bash
src/
├── providers/
│   ├── index.ts                 # Module exports
│   └── provider-registry.ts     # MODIFY: Add terminateAll() method
├── types/
│   └── providers.ts             # READ: Provider.terminate() interface
└── __tests__/
    └── unit/
        └── providers/
            └── provider-registry.test.ts  # MODIFY: Add terminateAll() tests
```

### Desired Codebase Tree with Changes

```bash
# No new files - modify existing:

src/providers/provider-registry.ts  # ENHANCE: Add terminateAll() method
├── ADD: public async terminateAll(): Promise<void>
│   ├── LOGIC: Get all providers from this.providers.entries()
│   ├── LOGIC: Map to termination promises with try/catch
│   ├── LOGIC: await Promise.allSettled() for parallel execution
│   ├── LOGIC: Log errors but continue
│   └── LOGIC: Clear this.providers and this.states maps
└── LOCATION: After initializeAll() method, before testing utilities

src/__tests__/unit/providers/provider-registry.test.ts  # ENHANCE: Add tests
├── ADD: describe('terminateAll()')
│   ├── Test: terminates all registered providers
│   ├── Test: calls terminate() on each provider
│   ├── Test: continues on error (one fails, others succeed)
│   ├── Test: clears providers and states maps
│   ├── Test: handles empty registry
│   └── Test: logs errors for failed terminations
└── PATTERN: Follow existing describe blocks structure
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use Promise.allSettled, NOT Promise.all
// Promise.all fails fast on first rejection - other providers won't terminate
// Promise.allSettled waits for ALL - partial success possible
await Promise.allSettled(terminatePromises);

// CRITICAL: Clear maps AFTER termination, not before
// Maps must contain providers during termination loop
this.providers.clear();  // Do this AFTER await Promise.allSettled()
this.states.clear();     // Do this AFTER await Promise.allSettled()

// CRITICAL: Provider.terminate() may throw errors
// Must wrap each call in try/catch to continue on error
try {
  await provider.terminate();
} catch (error) {
  console.error(`Failed to terminate provider '${id}':`, error);
}

// CRITICAL: Use Array.from() for Map iteration
// this.providers.entries() returns iterator, convert to array for map()
const terminatePromises = Array.from(this.providers.entries()).map(async ([id, provider]) => {
  // ...
});

// CRITICAL: Console.error for logging (not console.log)
// Follow existing error logging pattern in codebase
console.error(`Failed to terminate provider '${id}':`, error);

// CRITICAL: Don't throw from terminateAll()
// Errors should be logged, not propagated
// Method completes successfully even if some providers fail

// CRITICAL: Handle empty registry
// Array.from() on empty Map returns empty array - Promise.allSettled handles this

// PATTERN: Follow initializeAll() structure exactly
// Lines 360-401 show the pattern: map, try/catch, Promise.allSettled, aggregate

// PATTERN: JSDoc with @example blocks
// Follow existing documentation style in ProviderRegistry

// PATTERN: Test with vi.fn().mockResolvedValue(undefined)
// For async terminate() mock in tests
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing types and maps:

```typescript
// Existing: providers Map (line 124 in provider-registry.ts)
private providers: Map<ProviderId, Provider> = new Map();

// Existing: states Map (line 131 in provider-registry.ts)
private states: Map<ProviderId, ProviderInitState> = new Map();

// Existing: Provider interface with terminate() (lines 490-500 in providers.ts)
interface Provider {
  terminate(): Promise<void>;
  // ... other methods
}

// No new types needed - method returns Promise<void>
// If detailed status tracking is needed later, can add TerminationResult interface
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: IMPLEMENT terminateAll() method signature and JSDoc
  - SIGNATURE: async terminateAll(): Promise<void>
  - LOCATION: In ProviderRegistry class, after initializeAll() method
  - DOCUMENTATION: Add comprehensive JSDoc with @example
  - PATTERN: Follow initializeAll() documentation style (lines 342-359)

Task 2: IMPLEMENT core termination logic
  - GET providers: Array.from(this.providers.entries())
  - MAP to promises: For each [id, provider], create async termination function
  - TRY/CATCH each: await provider.terminate(), catch and log errors
  - LOG errors: console.error with provider ID and error
  - PATTERN: Follow initializeAll() map pattern (lines 366-379)

Task 3: AWAIT all terminations with Promise.allSettled
  - WRAP: await Promise.allSettled(terminatePromises)
  - BEHAVIOR: Waits for ALL providers to terminate (success or failure)
  - NEVER REJECTS: Promise.allSettled always resolves
  - PATTERN: Follow initializeAll() Promise.allSettled usage (line 382)

Task 4: CLEAR internal state maps
  - CLEAR providers: this.providers.clear()
  - CLEAR states: this.states.clear()
  - TIMING: After await Promise.allSettled() completes
  - REASON: Release references, allow GC, enable re-initialization

Task 5: VERIFY method doesn't throw
  - EAT errors: All errors caught in try/catch, logged but not thrown
  - ALWAYS resolves: Method completes successfully even with failures
  - RETURN: void (no return value needed)

Task 6: WRITE comprehensive tests
  - DESCRIBE: describe('terminateAll()')
  - TEST: successful termination of all providers
  - TEST: terminate() called on each provider (mock verification)
  - TEST: one provider fails, others continue (error tolerance)
  - TEST: providers map cleared after termination
  - TEST: states map cleared after termination
  - TEST: empty registry completes successfully
  - TEST: console.error called for failed terminations
  - PATTERN: Follow existing test structure in provider-registry.test.ts

Task 7: VERIFY TypeScript compilation
  - RUN: pnpm exec tsc --noEmit
  - CHECK: No type errors
  - VERIFY: Method signature matches contract

Task 8: RUN all tests
  - RUN: pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts
  - VERIFY: All new tests pass
  - VERIFY: All existing tests still pass (no regression)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// COMPLETE IMPLEMENTATION PATTERN
// ============================================================================

/**
 * Terminate all registered providers with error tolerance
 *
 * Terminates all providers in parallel, ensuring each gets a chance to
 * clean up resources even if some fail. Errors are logged but not thrown.
 * After termination completes, clears the providers and states maps.
 *
 * ## Parallel Termination
 *
 * All providers terminate concurrently using Promise.allSettled.
 * This ensures fast shutdown while allowing partial success.
 *
 * ## Error Handling
 *
 * If a provider's terminate() throws, the error is logged but other
 * providers continue terminating. The method never throws.
 *
 * ## State Cleanup
 *
 * After all termination attempts complete, the providers and states
 * maps are cleared. This releases references and allows re-initialization.
 *
 * @example
 * ```ts
 * const registry = ProviderRegistry.getInstance();
 *
 * // Register and initialize providers
 * registry.register(anthropicProvider);
 * registry.register(opencodeProvider);
 * await registry.initializeAll(config);
 *
 * // Later, during shutdown
 * await registry.terminateAll();
 *
 * // All providers terminated, maps cleared
 * console.log(registry.has('anthropic')); // false
 * ```
 */
public async terminateAll(): Promise<void> {
  // PATTERN: Convert Map entries to array for iteration
  const terminatePromises = Array.from(this.providers.entries()).map(
    async ([id, provider]) => {
      try {
        await provider.terminate();
      } catch (error) {
        // PATTERN: Log but continue - don't let one failure block others
        console.error(`Failed to terminate provider '${id}':`, error);
      }
    }
  );

  // PATTERN: Use Promise.allSettled for partial success tolerance
  await Promise.allSettled(terminatePromises);

  // PATTERN: Clear maps AFTER termination completes
  this.providers.clear();
  this.states.clear();
}

// ============================================================================
// ALTERNATIVE: With Detailed Result Return (if observability needed)
// ============================================================================

/**
 * Termination result with success/failure tracking
 */
interface TerminationResult {
  /** Successfully terminated provider IDs */
  success: ProviderId[];
  /** Failed providers with errors */
  failed: Array<{ providerId: ProviderId; error: Error }>;
}

/**
 * Terminate all providers and return detailed results
 */
public async terminateAll(): Promise<TerminationResult> {
  const terminatePromises = Array.from(this.providers.entries()).map(
    async ([id, provider]) => {
      try {
        await provider.terminate();
        return { status: 'success' as const, providerId: id };
      } catch (error) {
        console.error(`Failed to terminate provider '${id}':`, error);
        return {
          status: 'failed' as const,
          providerId: id,
          error: error as Error
        };
      }
    }
  );

  const results = await Promise.allSettled(terminatePromises);

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

  this.providers.clear();
  this.states.clear();

  return { success, failed };
}

// NOTE: Start with void return version for simplicity.
// Can add detailed result return later if needed for observability.
```

### Integration Points

```yaml
PROVIDER_INTERFACE:
  - from: src/types/providers.ts
  - method: Provider.terminate(): Promise<void>
  - behavior: May throw errors - catch and log, don't propagate

INTERNAL_STATE:
  - modify: this.providers.clear()
  - modify: this.states.clear()
  - timing: After await Promise.allSettled() completes

MODULE_EXPORTS:
  - no change: terminateAll() is instance method, no export needed
  - available: ProviderRegistry.getInstance().terminateAll()

LIFECYCLE:
  - called: During application shutdown, test cleanup, re-initialization
  - symmetry: Mirror of initializeAll() for complete lifecycle
  - order: Should be called after all agent operations complete

TEST_HOOKS:
  - existing: _resetForTesting() for singleton reset
  - existing: _resetInitStateForTesting() for state reset
  - new: terminateAll() called in test teardown when needed
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after modifying provider-registry.ts
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
# Test ProviderRegistry terminateAll() specifically
pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts

# Watch mode for development
pnpm exec vitest watch src/__tests__/unit/providers/provider-registry.test.ts

# Run only terminateAll() tests
pnpm exec vitest run src/__tests__/unit/providers/provider-registry.test.ts -t "terminateAll"

# Expected: All tests pass. If failing, debug root cause and fix implementation.

# Critical test scenarios to verify:
# - terminateAll() calls terminate() on all providers
# - One provider failure doesn't prevent others
# - Maps are cleared after termination
# - Empty registry handles gracefully
# - Errors are logged with console.error
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

const registry = ProviderRegistry.getInstance();
// TODO: Register mock providers
await registry.terminateAll();
console.log('Providers map empty:', !registry.has('anthropic'));
console.log('States map empty:', registry.getAllStatuses().size === 0);
"

# Expected: All integrations working, no regressions in existing tests
```

### Level 4: Manual Verification

```bash
# Verify JSDoc is present and well-formatted
grep -A 20 "terminateAll" src/providers/provider-registry.ts | head -30

# Verify method is async
grep "async terminateAll" src/providers/provider-registry.ts

# Verify Promise.allSettled is used
grep "Promise.allSettled" src/providers/provider-registry.ts

# Verify maps are cleared
grep "this.providers.clear()" src/providers/provider-registry.ts
grep "this.states.clear()" src/providers/provider-registry.ts

# Expected: All patterns present, implementation matches blueprint
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `pnpm exec vitest run`
- [ ] No TypeScript errors: `pnpm exec tsc --noEmit`
- [ ] No ESLint errors: `pnpm exec eslint src/`
- [ ] No Prettier issues: `pnpm exec prettier --check src/`
- [ ] JSDoc comments on terminateAll() method
- [ ] @example block in JSDoc

### Feature Validation

- [ ] `terminateAll()` calls `terminate()` on all providers
- [ ] Uses `Promise.allSettled` for parallel termination
- [ ] One provider failure doesn't prevent others (error tolerance)
- [ ] `providers` map cleared after termination
- [ ] `states` map cleared after termination
- [ ] Handles empty registry (no providers) gracefully
- [ ] Errors logged with `console.error`
- [ ] Method doesn't throw (always resolves)
- [ ] Existing tests still pass (backward compatibility)

### Code Quality Validation

- [ ] Follows existing ProviderRegistry patterns
- [ ] Mirrors `initializeAll()` structure for consistency
- [ ] JSDoc style matches existing documentation
- [ ] Naming conventions: terminateAll (camelCase)
- [ ] Error messages include provider ID
- [ ] No promise rejection (error handling complete)
- [ ] Test coverage: happy path, errors, empty registry, state clearing
- [ ] Type safety: no implicit any

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] JSDoc @param and @returns on method
- [ ] @example block for usage
- [ ] Research documents referenced in PRP
- [ ] Test isolation: uses existing afterEach pattern

---

## Anti-Patterns to Avoid

- ❌ **Don't use Promise.all** - use Promise.allSettled for partial success tolerance
- ❌ **Don't throw errors** - log errors but continue terminating
- ❌ **Don't clear maps before termination** - clear after await Promise.allSettled()
- ❌ **Don't fail fast** - one provider failure shouldn't block others
- ❌ **Don't return early on errors** - always attempt all terminations
- ❌ **Don't use console.log for errors** - use console.error
- ❌ **Don't forget to clear states map** - clear both providers AND states
- ❌ **Don't terminate sequentially** - use parallel termination for speed
- ❌ **Don't ignore empty registry** - should complete successfully
- ❌ **Don't return detailed results** (yet) - start with void return for simplicity

---

## Research References Summary

This PRP incorporates comprehensive research from:

1. **Async Cleanup Patterns** (`research/async_cleanup_patterns.md`)
   - Promise.allSettled for continue-on-error cleanup
   - Parallel vs sequential cleanup patterns
   - State reset after cleanup
   - Testing patterns for cleanup

2. **Research Summary** (`research/RESEARCH_SUMMARY.md`)
   - Implementation checklist
   - Key gotchas and common mistakes
   - Quick reference commands

3. **URL References** (`research/urls_and_key_insights.md`)
   - MDN: Promise.allSettled documentation
   - V8 Blog: Promise combinators
   - Node.js: Process exit events

4. **Codebase Patterns** (`src/providers/provider-registry.ts`)
   - initializeAll() method (lines 360-401) - exact pattern to mirror
   - Promise.allSettled usage with error aggregation
   - Map operations and state management

5. **Test Patterns** (`src/__tests__/unit/providers/provider-registry.test.ts`)
   - createMockProvider() helper
   - afterEach cleanup pattern
   - Mock setup for async methods

**Confidence Score**: 9/10 for one-pass implementation success

The PRP provides complete context including:
- Exact implementation pattern from initializeAll() to mirror
- Complete async cleanup patterns with code examples
- Test patterns matching existing codebase conventions
- Validation commands verified to work in this project
- Anti-patterns section with specific gotchas to avoid
- Research documents with external references
