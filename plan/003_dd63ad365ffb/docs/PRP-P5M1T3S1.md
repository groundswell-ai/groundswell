# Product Requirement Prompt (PRP): Test AnthropicProvider Initialization

## Goal

**Feature Goal**: Write comprehensive unit tests for `AnthropicProvider.initialize()` method that verify SDK lazy loading, options handling, idempotent behavior, and ProviderRegistry integration.

**Deliverable**: Test file at `src/__tests__/unit/providers/anthropic-provider-initialize.test.ts` with passing tests covering all initialization scenarios.

**Success Definition**:
- All tests pass when running `npm test`
- Tests verify SDK is loaded via dynamic import
- Tests confirm ProviderOptions are accepted correctly
- Tests validate idempotent behavior (multiple initialize() calls)
- Tests confirm ProviderRegistry integration works
- Code coverage for initialize() method is 100%

## User Persona

**Target User**: Developer working on the Groundswell provider system

**Use Case**: Ensuring AnthropicProvider initialization works correctly before integrating with Agent class and production usage

**User Journey**:
1. Developer implements AnthropicProvider.initialize() per P2.M1.T1.S2
2. Developer writes tests to verify implementation
3. Tests catch bugs during development (shift-left testing)
4. Tests serve as documentation for expected behavior
5. Future code changes are validated against tests

**Pain Points Addressed**:
- Manual testing of provider initialization is time-consuming
- SDK import errors can crash at runtime
- Non-idempotent initialization causes duplicate work
- Unclear how ProviderRegistry interacts with providers

## Why

- **Testing Best Practices**: Unit tests catch bugs early and serve as living documentation
- **SDK Integration Safety**: Validates dynamic import pattern works correctly
- **Refactoring Confidence**: Tests ensure initialize() behavior is preserved during code changes
- **ProviderRegistry Validation**: Confirms provider lifecycle management works end-to-end
- **Onboarding**: New developers understand initialization behavior by reading tests

## What

Test suite for `AnthropicProvider.initialize()` method covering:

1. **SDK Import Success**
   - Verify `@anthropic-ai/claude-agent-sdk` is imported successfully
   - Confirm SDK module is stored in private `sdk` field
   - Validate SDK has expected exports (`query`, `createSdkMcpServer`, `tool`)

2. **ProviderOptions Handling**
   - Test `initialize()` without options (undefined)
   - Test `initialize()` with empty options object
   - Test `initialize()` with individual options: `apiKey`, `endpoint`, `timeout`, `headers`, `sessionId`
   - Test `initialize()` with all options combined

3. **Idempotent Behavior**
   - Multiple `initialize()` calls should be safe
   - SDK reference should remain the same across calls
   - Subsequent calls should return immediately (no-op)

4. **ProviderRegistry Integration**
   - Test initialization via `ProviderRegistry.initializeProvider()`
   - Verify registry status updates to 'initialized'
   - Test concurrent initialization (Promise caching)

5. **Error Handling**
   - SDK package not installed (descriptive error expected)
   - Import failures throw with context

6. **State Management**
   - Provider starts with `sdk` field as `null`
   - After `initialize()`, `sdk` is not null
   - No internal initialization flags (state managed externally)

7. **Type Safety**
   - SDK module has correct `typeof import()` type
   - Method signatures match TypeScript interface

### Success Criteria

- [ ] All test cases pass with `npm test`
- [ ] Tests cover happy path and edge cases
- [ ] Tests use proper mocking to avoid actual API calls
- [ ] Tests validate both implementation and type safety
- [ ] Code coverage ≥ 90% for initialize() method

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test Result**: ✅ PASS
- Someone unfamiliar with the codebase can implement these tests using only this PRP
- All file paths, patterns, and mock strategies are specified
- Test framework configuration and commands are provided

### Documentation & References

```yaml
# PRIMARY INPUT - Source Implementation
- file: src/providers/anthropic-provider.ts
  why: Source code for AnthropicProvider.initialize() method (lines 156-194)
  pattern: Initialize checks if (this.sdk) for idempotency, uses dynamic import() for SDK, validates import succeeded
  gotcha: SDK is stored in private field, options are NOT stored (comment at lines 184-193 explains this)

# EXISTING TEST PATTERN - Follow This Structure
- file: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: THIS IS THE OUTPUT FILE - already exists with comprehensive tests
  pattern: Uses describe() blocks grouped by feature area, beforeEach() for setup, @ts-expect-error for private property access
  gotcha: Tests access private sdk field using // @ts-expect-error comments

# TEST FRAMEWORK CONFIGURATION
- file: vitest.config.ts
  why: Vitest configuration with test file patterns and globals enabled
  pattern: Test files match '**/*.test.ts', globals enabled (no need to import describe/it/expect)
  gotcha: Tests must be in src/__tests__/ directory to be picked up

# TYPE DEFINITIONS
- file: src/types/providers.ts
  why: Provider interface and ProviderOptions type definitions
  pattern: ProviderOptions includes apiKey?, endpoint?, timeout?, headers?, sessionId?
  gotcha: All ProviderOptions fields are optional

# TEST PATTERNS - Provider Registry
- file: src/__tests__/unit/providers/provider-registry.test.ts
  why: Example of testing singleton pattern and lifecycle methods
  pattern: Uses _resetForTesting() method for test isolation, vi.fn() for mocking
  gotcha: Always reset registry state in beforeEach() to avoid test interference

# TEST PATTERNS - Model Spec Testing
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Example of testing utility functions with edge cases
  pattern: Groups tests by "qualified format", "plain format", "error cases"
  gotcha: Uses expect().toStrictEqual() for object comparison

# ANTHROPIC PROVIDER CAPABILITIES TEST
- file: src/__tests__/unit/providers/anthropic-provider.test.ts
  why: Example of testing provider class structure and type safety
  pattern: Tests readonly properties, method signatures, interface implementation
  gotcha: Uses // @ts-expect-error for testing private properties

# SDK DEPENDENCY
- file: package.json
  why: Confirm SDK version and availability
  pattern: @anthropic-ai/claude-agent-sdk version ^0.1.0
  gotcha: SDK is installed as dependency, not devDependency (used in production)

# NORMALIZE MODEL TEST PATTERN
- file: src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  why: Example of testing provider method with comprehensive edge cases
  pattern: Uses beforeEach() to create fresh provider instance, tests grouped by scenario
  gotcha: Provider must be instantiated before each test
```

### Current Codebase Tree (Relevant Sections)

```bash
groundswell/
├── package.json                          # SDK dependency: @anthropic-ai/claude-agent-sdk@^0.1.0
├── vitest.config.ts                      # Test configuration with globals enabled
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts         # TARGET: AnthropicProvider class (lines 156-194: initialize())
│   │   ├── provider-registry.ts          # ProviderRegistry for integration tests
│   │   └── openai-provider.ts            # (if exists) Reference for other provider patterns
│   ├── types/
│   │   └── providers.ts                  # Provider interface, ProviderOptions type
│   ├── utils/
│   │   └── model-spec.ts                 # parseModelSpec utility (not needed for init tests)
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── anthropic-provider-initialize.test.ts  # OUTPUT: Write tests here (ALREADY EXISTS)
│               ├── anthropic-provider.test.ts             # Reference: Class structure tests
│               ├── anthropic-provider-normalizemodel.test.ts  # Reference: Method testing pattern
│               ├── provider-registry.test.ts               # Reference: Singleton pattern tests
│               └── provider-lifecycle.test.ts              # Reference: Lifecycle tests
```

### Desired Codebase Tree After Implementation

```bash
# No changes - test file already exists at:
src/__tests__/unit/providers/anthropic-provider-initialize.test.ts

# Research notes can be stored at:
plan/003_dd63ad365ffb/P5M1T3S1/research/
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Vitest Configuration
// - Globals are enabled (describe, it, expect available globally)
// - Test files must match pattern **/*.test.ts
// - Tests must be in src/__tests__/ directory

// CRITICAL: Private Property Access Pattern
// - Use // @ts-expect-error comment to access private fields
// - Example: // @ts-expect-error - Testing private property
//          expect(provider.sdk).not.toBeNull();

// CRITICAL: Provider Registry State Management
// - Always call ProviderRegistry._resetForTesting() in beforeEach()
// - Registry is singleton - state persists across tests without reset
// - Example: beforeEach(() => { ProviderRegistry._resetForTesting(); });

// CRITICAL: Dynamic Import Mocking
// - @anthropic-ai/claude-agent-sdk is imported dynamically in initialize()
// - Do NOT mock the SDK for initialization tests (use real import)
// - SDK import happens at runtime, not module load time
// - Tests verify actual SDK module is loaded correctly

// CRITICAL: ProviderOptions Handling
// - initialize() accepts options but does NOT store them
// - Options are documented as "stored for later use in execute()"
// - Comments at lines 184-193 explain this design
// - Tests should verify options are accepted but not necessarily stored

// CRITICAL: Idempotent Behavior
// - initialize() checks if (this.sdk) at line 158
// - Returns immediately if SDK already loaded
// - Tests should verify multiple calls don't change SDK reference

// CRITICAL: SDK Module Structure
// - SDK exports: query, createSdkMcpServer, tool
// - All are functions (callable)
// - Use typeof sdk.query === 'function' for validation

// CRITICAL: ProviderRegistry Status Tracking
// - Registry tracks initialization status externally
// - AnthropicProvider does NOT have internal 'isInitialized' flag
// - Status is managed by ProviderRegistry, not the provider itself

// GOTCHA: Test File Naming
// - Must use .test.ts suffix (NOT .spec.ts)
// - Must be in src/__tests__/ directory (NOT /tests at root)
// - File must be included by vitest.config.ts pattern

// GOTCHA: Async Testing
// - initialize() returns Promise<void>
// - Use await provider.initialize() before assertions
// - Use await expect(provider.initialize()).resolves.not.toThrow() for exception testing
```

## Implementation Blueprint

### Data Models and Structures

No new data models needed. Tests use existing types from source code.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY test file exists at correct location
  - CHECK: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  - IF EXISTS: Review existing tests for completeness
  - IF NOT EXISTS: Create file with Vitest imports (though file should exist)
  - PATTERN: Follow src/__tests__/unit/providers/anthropic-provider.test.ts structure

Task 2: WRITE test suite setup and initialization
  - IMPLEMENT: describe('AnthropicProvider - initialize()', () => { ... })
  - SETUP: beforeEach(() => { provider = new AnthropicProvider(); ProviderRegistry._resetForTesting(); })
  - NAMING: Top-level describe matches method name
  - PLACEMENT: Top of file, before nested describe blocks

Task 3: WRITE "SDK Import Success" test suite
  - IMPLEMENT: describe('SDK Import Success', () => { ... })
  - TEST CASE: should successfully import @anthropic-ai/claude-agent-sdk
  - TEST CASE: should store SDK module in private sdk field
  - TEST CASE: should have correctly typed SDK module
  - PATTERN: Use // @ts-expect-error to access private sdk field
  - ASSERTIONS: expect(provider.sdk).not.toBeNull(), expect(sdk).toHaveProperty('query')

Task 4: WRITE "ProviderOptions Handling" test suite
  - IMPLEMENT: describe('ProviderOptions Handling', () => { ... })
  - TEST CASES: No options, empty options, individual options (apiKey, endpoint, timeout, headers, sessionId)
  - TEST CASE: All options combined
  - PATTERN: await expect(provider.initialize(options)).resolves.not.toThrow()
  - GOTCHA: Options are accepted but not stored (verify they don't throw)

Task 5: WRITE "Idempotent Behavior" test suite
  - IMPLEMENT: describe('Idempotent Behavior', () => { ... })
  - TEST CASE: Multiple initialize() calls are safe
  - TEST CASE: Return immediately on subsequent calls
  - TEST CASE: Allow initialize() after first call completes
  - PATTERN: Store firstSdk reference, compare with secondSdk using expect(firstSdk).toBe(secondSdk)

Task 6: WRITE "Method Signature" test suite
  - IMPLEMENT: describe('Method Signature', () => { ... })
  - TEST CASE: Should return Promise<void>
  - TEST CASE: Should have correct parameter types
  - PATTERN: const result = provider.initialize(); expect(result).toBeInstanceOf(Promise)

Task 7: WRITE "ProviderRegistry Integration" test suite
  - IMPLEMENT: describe('ProviderRegistry Integration', () => { ... })
  - TEST CASE: Work with ProviderRegistry.initializeProvider()
  - TEST CASE: Work with options parameter via registry
  - TEST CASE: Handle concurrent initialization
  - PATTERN: const registry = ProviderRegistry.getInstance(); registry.register(provider)

Task 8: WRITE "State Management" test suite
  - IMPLEMENT: describe('State Management', () => { ... })
  - TEST CASE: Should not add internal initialization flags
  - TEST CASE: Should start with SDK field as null
  - TEST CASE: Should have SDK loaded after initialize()
  - PATTERN: const keys = Object.keys(instance); expect(keys).toEqual(expect.arrayContaining(['id', 'capabilities']))

Task 9: WRITE "Type Safety" test suite
  - IMPLEMENT: describe('Type Safety', () => { ... })
  - TEST CASE: Should preserve typeof import() type for SDK
  - PATTERN: Verify SDK properties exist and are callable

Task 10: VERIFY all tests pass
  - RUN: npm test (or vitest run)
  - CHECK: All tests in anthropic-provider-initialize.test.ts pass
  - VALIDATE: No TypeScript errors in test file
```

### Implementation Patterns & Key Details

```typescript
// Test File Structure Pattern
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
import { ProviderRegistry } from '../../../providers/provider-registry.js';
import type { ProviderOptions } from '../../../types/providers.js';

describe('AnthropicProvider - initialize()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    // CRITICAL: Reset registry state for test isolation
    ProviderRegistry._resetForTesting();
  });

  describe('SDK Import Success', () => {
    it('should successfully import @anthropic-ai/claude-agent-sdk', async () => {
      await provider.initialize();

      // Verify SDK is loaded
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
      expect(provider.sdk).toBeDefined();
    });
  });

  // ... more test suites
});

// Private Property Access Pattern
// @ts-expect-error - Testing private property
const sdk = provider.sdk;
expect(sdk).toHaveProperty('query');

// ProviderRegistry Integration Pattern
const registry = ProviderRegistry.getInstance();
registry.register(provider);
await expect(registry.initializeProvider('anthropic')).resolves.not.toThrow();
expect(registry.isReady('anthropic')).toBe(true);

// Idempotent Testing Pattern
await provider.initialize();
// @ts-expect-error - Testing private property
const firstSdk = provider.sdk;
await provider.initialize();
// @ts-expect-error - Testing private property
const secondSdk = provider.sdk;
expect(firstSdk).toBe(secondSdk);

// Async Error Testing Pattern
await expect(provider.initialize()).resolves.not.toThrow();
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - runner: vitest (configured in vitest.config.ts)
  - command: npm test (runs vitest run)
  - watch mode: npm run test:watch

TYPE_CHECKING:
  - command: npm run lint (runs tsc --noEmit)
  - verify: No TypeScript errors in test file

MOCKING_STRATEGY:
  - SDK: Do NOT mock @anthropic-ai/claude-agent-sdk (use real import)
  - ProviderRegistry: Use real registry with _resetForTesting() for isolation
  - ProviderOptions: Use real ProviderOptions type from types/providers.ts
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npm run lint                    # Type check with TypeScript
npm test                        # Run all tests

# Expected: Zero TypeScript errors, all tests pass
# If errors exist, READ output and fix before proceeding
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npx vitest run src/__tests__/unit/providers/anthropic-provider-initialize.test.ts

# Run with verbose output
npx vitest run src/__tests__/unit/providers/anthropic-provider-initialize.test.ts --reporter=verbose

# Expected: All tests pass
# Test output should show:
# ✓ src/__tests__/unit/providers/anthropic-provider-initialize.test.ts (N)
#   ✓ AnthropicProvider - initialize() (N)
#     ✓ SDK Import Success (N)
#     ✓ ProviderOptions Handling (N)
#     ✓ Idempotent Behavior (N)
#     ✓ Method Signature (N)
#     ✓ ProviderRegistry Integration (N)
#     ✓ State Management (N)
#     ✓ Type Safety (N)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify tests work with full test suite
npm test                        # Run all tests in project

# Verify no regressions in related tests
npx vitest run src/__tests__/unit/providers/

# Expected: All provider tests pass, no new failures
# Check that anthropic-provider-initialize.test.ts passes
# Check that anthropic-provider.test.ts still passes
# Check that provider-registry.test.ts still passes
```

### Level 4: Coverage Validation (Code Coverage)

```bash
# Run tests with coverage report
npx vitest run src/__tests__/unit/providers/anthropic-provider-initialize.test.ts --coverage

# Expected: Coverage for initialize() method ≥ 90%
# Check coverage output for src/providers/anthropic-provider.ts
# Look for initialize() method coverage percentage

# If coverage < 90%:
# - Identify uncovered lines in initialize() (lines 156-194)
# - Add test cases for missing branches
# - Common missing coverage: error handling, edge cases
```

## Final Validation Checklist

### Technical Validation

- [ ] All test suites pass: `npm test`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Tests follow existing patterns from anthropic-provider.test.ts
- [ ] Private properties accessed with // @ts-expect-error
- [ ] ProviderRegistry state reset in beforeEach()
- [ ] No test interdependence (all tests pass in isolation)

### Feature Validation

- [ ] SDK import success is tested
- [ ] ProviderOptions handling is tested (all options)
- [ ] Idempotent behavior is verified
- [ ] ProviderRegistry integration works
- [ ] State management is correct (no internal flags)
- [ ] Type safety is validated

### Code Quality Validation

- [ ] Test file matches existing test patterns
- [ ] Test descriptions are clear and descriptive
- [ ] Test cases are grouped logically by feature
- [ ] beforeEach() used for setup (not repeating setup code)
- [ ] Assertions use specific matchers (toBe, toEqual, toHaveProperty)

### Documentation & Deployment

- [ ] Test file has JSDoc comment explaining purpose
- [ ] Test cases reference PRP task (P2.M1.T1.S2)
- [ ] Tests serve as documentation for expected behavior

---

## Anti-Patterns to Avoid

- ❌ Don't mock the @anthropic-ai/claude-agent-sdk import (test real SDK loading)
- ❌ Don't forget to reset ProviderRegistry state in beforeEach()
- ❌ Don't use // @ts-ignore to bypass TypeScript (use // @ts-expect-error with reason)
- ❌ Don't test internal implementation details only (test observable behavior)
- ❌ Don't skip testing idempotent behavior (critical for correctness)
- ❌ Don't forget to test ProviderRegistry integration (real-world usage)
- ❌ Don't use sync assertions for async methods (always await initialize())
- ❌ Don't create tests that depend on execution order
- ❌ Don't skip testing error cases (even if documented as "should not happen")
- ❌ Don't test implementation details that might change (test the contract)

## Research Notes

### SDK Import Behavior

The `@anthropic-ai/claude-agent-sdk` is imported dynamically using `await import()` at line 165 of anthropic-provider.ts. This is a runtime import, not a module-level import. Testing this requires:

1. Running initialize() to trigger the import
2. Accessing private `sdk` field to verify import succeeded
3. Checking SDK has expected exports (query, createSdkMcpServer, tool)

No mocking is needed - we test the real import behavior.

### ProviderOptions Handling Design

Per source code comments (lines 184-193), ProviderOptions are accepted but NOT stored in the provider. Options are documented as "stored for later use in execute()". This means:

- Tests should verify options don't throw errors
- Tests should NOT expect options to be stored in provider instance
- Options are passed through to SDK when execute() is called (outside scope of these tests)

### Idempotent Implementation

The initialize() method checks `if (this.sdk)` at line 158 to provide idempotent behavior. Tests verify:

1. First call loads SDK
2. Second call returns immediately (no-op)
3. SDK reference remains the same (not re-imported)

This pattern is critical for ProviderRegistry integration where initialize() might be called multiple times.

### ProviderRegistry State Management

AnthropicProvider does NOT track its own initialization state. The ProviderRegistry manages this externally via:

- `getStatus(providerId)` - returns 'uninitialized' | 'initializing' | 'initialized' | 'failed'
- `isReady(providerId)` - returns boolean

Tests verify this integration by checking registry status after initialization.

### Test File Already Exists

The test file at `src/__tests__/unit/providers/anthropic-provider-initialize.test.ts` already exists with comprehensive tests. This PRP documents the implementation approach and serves as a reference for similar test files (e.g., for OpenCodeProvider).

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Validation**:
- Tests already exist and pass
- PRP provides complete context for similar test implementations
- All patterns are documented with specific file references
- Mock strategies are clearly specified

**Coverage Target**: ≥ 90% for initialize() method (lines 156-194)
