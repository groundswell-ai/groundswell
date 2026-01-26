# Product Requirement Prompt (PRP): Test ProviderRegistry Singleton and Registration

**PRP ID:** P5.M1.T2.S1
**Work Item:** Test ProviderRegistry singleton and registration
**Status:** Research Complete
**Confidence Score:** 10/10

---

## Goal

**Feature Goal**: Create comprehensive unit tests for the ProviderRegistry singleton pattern covering getInstance(), register(), get(), and has() methods with mock Provider implementations.

**Deliverable**: Passing test suite at `src/__tests__/unit/providers/provider-registry.test.ts` that validates all core registry functionality.

**Success Definition**: All tests pass with `npm test`, covering singleton behavior, provider registration, retrieval, and existence checking with proper test isolation using reset methods.

---

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" Test Passed**: An AI agent unfamiliar with this codebase would have everything needed to implement these tests successfully from this PRP.

### Documentation & References

```yaml
# PRIMARY IMPLEMENTATION SOURCE
- file: src/providers/provider-registry.ts
  why: The complete ProviderRegistry implementation - singleton pattern, register(), get(), has(), initialization, termination, and testing utilities
  pattern: Follow the implementation patterns exactly - private static instance, Map-based storage, error handling style
  gotcha: ProviderRegistry has TWO reset methods for testing: static _resetForTesting() and instance _resetInitStateForTesting()

# TYPE DEFINITIONS
- file: src/types/providers.ts
  why: Provider interface, ProviderId type, ProviderCapabilities - needed for mock implementations
  pattern: Use ProviderId union type ('anthropic' | 'opencode'), ProviderCapabilities has 6 boolean flags
  gotcha: Provider interface requires 6 methods: initialize(), terminate(), execute(), registerMCPs(), loadSkills(), normalizeModel()

# EXISTING TEST PATTERNS (CRITICAL - Follow Exactly)
- file: src/__tests__/unit/providers/provider-registry.test.ts
  why: ALREADY EXISTS - This is the target file location, contains comprehensive tests that may need verification
  pattern: Uses Vitest, describe/it structure, createMockProvider() helper, afterEach cleanup with both reset methods
  gotcha: Tests exist at src/__tests__/unit/providers/ NOT /tests/providers/ as stated in task description

- file: src/__tests__/unit/provider-interface.test.ts
  why: Reference for mock Provider implementation pattern - shows how to create MockProvider class
  pattern: MockProvider implements Provider with vi.fn() mocks for all async methods
  gotcha: Use vi.fn().mockResolvedValue() for void promises, vi.fn().mockRejectedValue() for errors

- file: src/__tests__/unit/utils/provider-config.test.ts
  why: Reference for test organization, afterEach reset patterns, error assertion patterns
  pattern: afterEach(() => { resetGlobalConfig(); }), try/catch for error message validation
  gotcha: Use expect.fail() when testing that errors should be thrown

# TESTING FRAMEWORK CONFIGURATION
- file: vitest.config.ts
  why: Vitest configuration - test file location patterns, globals enabled
  pattern: Tests located in src/__tests__//**/*.test.ts, globals: true (no need to import describe/it/expect)
  gotcha: Project uses Vitest (NOT Jest) - use vi.fn() for mocks, not jest.fn()

# RESEARCH DOCUMENTATION
- docfile: plan/003_dd63ad365ffb/P5M1T2S1/research/singleton-testing-research.md
  why: Comprehensive singleton and registry testing patterns - getInstance() equality tests, reset patterns, mock providers
  section: Complete test suite structure example (Section 10)
  gotcha: Always use beforeEach/afterEach for test isolation with singletons
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── __tests__/
│   │   └── unit/
│   │       ├── providers/
│   │       │   └── provider-registry.test.ts    # TARGET FILE - ALREADY EXISTS
│   │       ├── provider-interface.test.ts       # REFERENCE - Mock pattern
│   │       └── utils/
│   │           └── provider-config.test.ts      # REFERENCE - Reset patterns
│   ├── providers/
│   │   └── provider-registry.ts                 # IMPLEMENTATION - Source to test
│   ├── types/
│   │   └── providers.ts                         # TYPES - Provider interface
│   └── utils/
│       └── provider-config.ts                   # REFERENCE - Reset utilities
├── vitest.config.ts                             # TEST CONFIG
└── package.json                                 # RUN: npm test
```

### Desired Codebase Tree (No Changes)

Tests already exist at correct location. PRP validates/gaps existing implementation.

```bash
src/__tests__/unit/providers/
└── provider-registry.test.ts    # Existing comprehensive test suite
```

### Known Gotchas of This Codebase

```typescript
// CRITICAL: File location discrepancy
// Task description says: /tests/providers/provider-registry.test.ts
// Actual location: src/__tests__/unit/providers/provider-registry.test.ts
// Use the ACTUAL location (src/__tests__/unit/)

// CRITICAL: ProviderRegistry has TWO reset methods
// 1. Static: ProviderRegistry._resetForTesting() - clears singleton instance
// 2. Instance: registry._resetInitStateForTesting() - clears initialization states
// Use BOTH in afterEach for complete isolation

// CRITICAL: Vitest NOT Jest
// Use vi.fn() not jest.fn()
// Use vi.spyOn() not jest.spyOn()
// Use expect().toHaveBeenCalled() etc. (same assertions)

// CRITICAL: Mock Provider must implement ALL 6 Provider methods
// initialize(), terminate(), execute(), registerMCPs(), loadSkills(), normalizeModel()
// Use vi.fn() for all to avoid "not a function" errors

// CRITICAL: Provider.id is readonly
// Cannot reassign, test this at compile time via TypeScript
// At runtime, just verify the value

// CRITICAL: register() throws Error on duplicate
// Error message: "Provider '<id>' is already registered"
// Test exact message format

// CRITICAL: get() returns undefined for missing providers
// Does NOT throw (different from register())
// Test with expect(result).toBeUndefined()

// CRITICAL: has() returns boolean
// true for registered, false for unregistered
// Simple boolean return, no throws

// CRITICAL: Test isolation is mandatory for singletons
// Always use afterEach with both reset methods
// State leakage causes flaky tests
```

---

## Implementation Blueprint

### Test Structure

```typescript
/**
 * Unit tests for ProviderRegistry singleton class
 *
 * Tests:
 * - getInstance() returns same instance on multiple calls (singleton pattern)
 * - register() successfully registers provider
 * - register() throws on duplicate provider id
 * - get() returns registered provider
 * - get() returns undefined for unregistered provider
 * - has() returns true for registered provider
 * - has() returns false for unregistered provider
 * - _resetForTesting() clears singleton state
 * - registry maintains state across getInstance() calls
 *
 * PRP: P1.M3.T1.S1 - Implement ProviderRegistry Singleton Class Structure
 */
```

### Data Models (Mock Provider)

```typescript
// Mock Provider Implementation Pattern
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Provider, ProviderId, ProviderCapabilities } from '../../../types/providers.js';

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
    execute: vi.fn(),  // Returns Promise<AgentResponse<T>>
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string) => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}
```

### Implementation Tasks

```yaml
Task 1: VERIFY EXISTING TESTS at src/__tests__/unit/providers/provider-registry.test.ts
  - CHECK: File exists with comprehensive test coverage
  - VERIFY: Tests cover getInstance() singleton behavior
  - VERIFY: Tests cover register() success and duplicate error
  - VERIFY: Tests cover get() retrieval and undefined returns
  - VERIFY: Tests cover has() true/false conditions
  - VERIFY: Proper afterEach cleanup with both reset methods
  - FOLLOW: Existing test patterns in the file

Task 2: RUN EXISTING TEST SUITE to validate current state
  - EXECUTE: npm test -- src/__tests__/unit/providers/provider-registry.test.ts
  - VERIFY: All tests pass
  - IF FAILING: Debug and fix implementation or tests
  - COVERAGE: Ensure all public methods tested

Task 3: VALIDATE TEST ISOLATION
  - CHECK: afterEach calls ProviderRegistry._resetForTesting()
  - CHECK: afterEach calls registry._resetInitStateForTesting()
  - VERIFY: Tests can run in any order (no state leakage)
  - TEST: Run tests multiple times to ensure consistency

Task 4: VERIFY MOCK PROVIDER IMPLEMENTATION
  - CHECK: createMockProvider() helper returns valid Provider
  - VERIFY: All 6 Provider methods are mocked
  - VERIFY: Methods use vi.fn() for spy capability
  - VERIFY: ProviderId is either 'anthropic' or 'opencode'

Task 5: CONFIRM ERROR HANDLING TESTS
  - VERIFY: register() throws on duplicate with correct message
  - VERIFY: get() returns undefined (does not throw)
  - VERIFY: has() returns false for missing (does not throw)
  - PATTERN: Use try/catch with expect.fail() for error assertions

Task 6: RUN FULL TEST SUITE INTEGRATION CHECK
  - EXECUTE: npm test (full suite)
  - VERIFY: No regressions in other tests
  - CHECK: ProviderRegistry tests integrate cleanly
  - VALIDATE: Test completion time is reasonable
```

### Implementation Patterns & Key Details

```typescript
// TEST FILE STRUCTURE PATTERN (from existing tests)
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ProviderRegistry } from '../../../providers/provider-registry.js';
import type { Provider, ProviderId } from '../../../types/providers.js';

// Reset after each test for isolation
afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();  // Clear initialization states
  ProviderRegistry._resetForTesting();    // Clear singleton instance
});

// HELPER FUNCTION PATTERN
function createMockProvider(id: ProviderId): Provider {
  return {
    id,
    capabilities: { mcp: true, skills: true, lsp: false, streaming: true, sessions: false, extendedThinking: false },
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string) => ({ provider: id, model, raw: model })),
  };
}

// TEST ORGANIZATION PATTERN
describe('ProviderRegistry', () => {
  describe('getInstance() - Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const registry1 = ProviderRegistry.getInstance();
      const registry2 = ProviderRegistry.getInstance();
      expect(registry1).toBe(registry2);
      expect(Object.is(registry1, registry2)).toBe(true);
    });
  });

  describe('register() - Provider Registration', () => {
    it('should successfully register a provider', () => {
      const registry = ProviderRegistry.getInstance();
      const mockProvider = createMockProvider('anthropic');
      expect(() => registry.register(mockProvider)).not.toThrow();
    });

    it('should throw on duplicate provider id', () => {
      const registry = ProviderRegistry.getInstance();
      const mockProvider = createMockProvider('anthropic');
      registry.register(mockProvider);
      expect(() => registry.register(mockProvider)).toThrow(Error);
    });
  });

  describe('get() - Provider Retrieval', () => {
    it('should return registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const mockProvider = createMockProvider('anthropic');
      registry.register(mockProvider);
      expect(registry.get('anthropic')).toBe(mockProvider);
    });

    it('should return undefined for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();
      expect(registry.get('anthropic')).toBeUndefined();
    });
  });

  describe('has() - Existence Check', () => {
    it('should return true for registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const mockProvider = createMockProvider('anthropic');
      registry.register(mockProvider);
      expect(registry.has('anthropic')).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();
      expect(registry.has('anthropic')).toBe(false);
    });
  });
});
```

### Integration Points

```yaml
TEST RUNNER:
  - command: npm test -- src/__tests__/unit/providers/provider-registry.test.ts
  - framework: Vitest (configured in vitest.config.ts)
  - includes: src/__tests__/**/*.test.ts
  - globals: true (describe, it, expect available globally)

MOCK FRAMEWORK:
  - library: Vitest built-in (vi global)
  - patterns: vi.fn(), vi.spyOn(), vi.mockResolvedValue(), vi.mockRejectedValue()

TYPE SYSTEM:
  - import Provider from 'src/types/providers.js'
  - ProviderId: 'anthropic' | 'opencode'
  - ProviderCapabilities interface with 6 boolean flags
  - Use .js extension in all imports (ES modules)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint

# Expected: Zero type errors
# If errors exist, READ output and fix before proceeding

# Vitest type checking (automatic via ts-node)
# Tests run through vitest with TypeScript support
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run specific test file
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Run with verbose output
npm test -- --reporter=verbose src/__tests__/unit/providers/provider-registry.test.ts

# Run with coverage
npm test -- --coverage src/__tests__/unit/providers/provider-registry.test.ts

# Expected: All tests pass
# Coverage should be 100% for getInstance(), register(), get(), has()

# Watch mode for development
npm test -- --watch src/__tests__/unit/providers/provider-registry.test.ts
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full unit test suite
npm test

# Check for regressions
# Run multiple times to ensure test isolation
for i in {1..5}; do npm test -- src/__tests__/unit/providers/provider-registry.test.ts; done

# Expected: All tests pass on every run
# No flaky tests due to state leakage

# Performance check
time npm test -- src/__tests__/unit/providers/provider-registry.test.ts
# Should complete in < 5 seconds
```

### Level 4: Domain-Specific Validation

```bash
# Singleton behavior verification
# Test that multiple calls to getInstance() return same reference
# Test that state persists across getInstance() calls
# Test that _resetForTesting() creates fresh instance

# Registry behavior verification
# Test that register() uses provider.id as key
# Test that register() prevents duplicates
# Test that get() returns exact registered object
# Test that has() correctly reports existence

# Mock provider verification
# Test that mock implements all Provider methods
# Test that vi.fn() spies track calls correctly
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All Level 1-4 validations completed successfully
- [ ] All tests pass: `npm test -- src/__tests__/unit/providers/provider-registry.test.ts`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: TypeScript compilation succeeds
- [ ] Tests can run multiple times without failure (isolation verified)

### Feature Validation
- [ ] getInstance() returns same instance on multiple calls (singleton verified)
- [ ] register() successfully adds providers to registry
- [ ] register() throws Error on duplicate with correct message format
- [ ] get() returns registered provider by id
- [ ] get() returns undefined for unregistered providers (no throw)
- [ ] has() returns true for registered providers
- [ ] has() returns false for unregistered providers
- [ ] Test isolation verified - afterEach properly resets state

### Code Quality Validation
- [ ] Follows existing test patterns from src/__tests__/unit/
- [ ] Uses createMockProvider() helper for consistency
- [ ] Descriptive test names following "should <action>" pattern
- [ ] Proper test organization with describe blocks grouping related tests
- [ ] Error tests use try/catch with expect.fail() pattern
- [ ] afterEach cleanup with both reset methods

### Documentation & Deployment
- [ ] Test file has JSDoc comment explaining purpose
- [ ] Tests reference PRP ID (P5.M1.T2.S1) and parent task (P1.M3.T1.S1)
- [ ] No hardcoded values that should be configurable
- [ ] Test isolation prevents interference with other test files

---

## Anti-Patterns to Avoid

- ❌ Don't use Jest syntax - this is Vitest (vi.fn() not jest.fn())
- ❌ Don't forget BOTH reset methods in afterEach (state leakage)
- ❌ Don't mock ProviderRegistry itself - test the real implementation
- ❌ Don't skip testing duplicate registration (common failure point)
- ❌ Don't use expect().toThrow() without Error type - specify Error class
- ❌ Don't forget .js extension in imports (ES modules requirement)
- ❌ Don't create new ProviderRegistry instances - use getInstance() only
- ❌ Don't test private methods directly - test public API only
- ❌ Don't use setTimeout() for synchronization - use async/await properly
- ❌ Don't assume tests run in order - ensure isolation

---

## Additional Research Findings

### Existing Test Coverage (Already Implemented)

The existing test file at `src/__tests__/unit/providers/provider-registry.test.ts` already includes:

1. **Singleton Pattern Tests** (Lines 62-94):
   - getInstance() returns same instance
   - Lazy initialization on first call
   - Instance maintained across multiple calls

2. **Registration Tests** (Lines 96-155):
   - Successful registration
   - Multiple provider registration
   - Duplicate registration throws Error
   - Provider id in error message

3. **Retrieval Tests** (Lines 157-198):
   - Returns registered provider
   - Returns undefined for unregistered
   - No throw on missing provider
   - Correct provider when multiple registered

4. **Existence Tests** (Lines 200-239):
   - Returns true for registered
   - Returns false for unregistered
   - Returns false after reset

5. **State Persistence Tests** (Lines 282-312):
   - Providers maintained across getInstance() calls
   - Provider map shared between instances

6. **Integration Scenarios** (Lines 345-398):
   - Typical usage pattern
   - Duplicate prevention in workflow
   - Conditional provider retrieval

### Gap Analysis

**Status**: The existing tests are comprehensive and cover all requirements from the task description:
- ✅ getInstance() returns same instance
- ✅ register() adds provider
- ✅ get() retrieves provider
- ✅ has() checks existence
- ✅ Mock Provider implementation

**Action**: No gaps identified. Tests are production-ready and passing.

### File Location Note

The task description specifies `/tests/providers/provider-registry.test.ts` but the actual file location follows the project convention of `src/__tests__/unit/providers/provider-registry.test.ts`. This is consistent with all other test files in the project.

---

## Success Metrics

**Confidence Score**: 10/10

**Validation**: The existing test suite at `src/__tests__/unit/providers/provider-registry.test.ts` already implements comprehensive coverage of all requirements. Running `npm test -- src/__tests__/unit/providers/provider-registry.test.ts` validates that all tests pass with proper isolation and coverage.

**One-Pass Implementation**: An AI agent using this PRP can:
1. Navigate to the existing test file
2. Verify all tests pass
3. Understand the test patterns used
4. Apply the same patterns to any future test additions
