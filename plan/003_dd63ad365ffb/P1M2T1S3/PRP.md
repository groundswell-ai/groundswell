# Product Requirement Prompt (PRP): Implement getGlobalProviderConfig() Accessor

---

## Goal

**Feature Goal**: Implement `getGlobalProviderConfig()` accessor function to provide controlled, read-only access to the module-private global provider configuration storage.

**Deliverable**: An exported `getGlobalProviderConfig()` function in `/home/dustin/projects/groundswell/src/utils/provider-config.ts` that returns the current global configuration or sensible defaults, never returning `null`.

**Success Definition**:
- Function returns `GlobalProviderConfig` object (never `null` or `undefined`)
- When `globalConfig` is set (via `configureProviders()`), return that config
- When `globalConfig` is `null`, return default `{defaultProvider: 'anthropic', providerDefaults: {}}`
- All existing tests pass + new tests for `getGlobalProviderConfig()` pass
- Function follows existing codebase patterns and conventions

---

## User Persona

**Target User**: Groundswell framework developers who need to access global provider configuration from:
- Agent initialization code (P4.M1)
- Provider registry initialization (P1.M3.T1.S2)
- Configuration cascade resolution (P1.M2.T1.S4)

**Use Case**: After calling `configureProviders()` at application startup, various parts of the system need to read the current global provider configuration to initialize providers and resolve configuration cascades.

**User Journey**:
1. Application calls `configureProviders({ defaultProvider: 'opencode', ... })` at startup
2. Agent constructor or ProviderRegistry calls `getGlobalProviderConfig()` to read settings
3. Function returns the configured settings (or defaults if not configured)
4. Caller uses the returned `GlobalProviderConfig` to initialize providers

**Pain Points Addressed**:
- **Encapsulation**: Prevents direct access to module-private `globalConfig` variable
- **Safety**: Guarantees non-null return with sensible defaults
- **Consistency**: Single accessor ensures all code reads from same source

---

## Why

- **Abstraction Layer**: Encapsulates global state access, allowing future refactoring of storage mechanism without breaking consumers
- **Null Safety**: Eliminates need for null checks throughout the codebase - function always returns valid configuration
- **Configuration Cascade Foundation**: This accessor is the base of the cascade system (global → agent → prompt priority in PRD 7.7)
- **Type Safety**: TypeScript return type guarantees `GlobalProviderConfig` (not nullable), enabling type-safe usage throughout the codebase

---

## What

Implement a simple accessor function that returns the module-private `globalConfig` variable or a default configuration.

### Contract Definition (from tasks.json P1.M2.T1.S3)

1. **INPUT**: None
2. **LOGIC**: Return `globalConfig` if set, otherwise return default `{defaultProvider: 'anthropic', providerDefaults: {}}`. Never returns `null`.
3. **OUTPUT**: `GlobalProviderConfig` for use by Agent and provider initialization

### Success Criteria

- [ ] Function `getGlobalProviderConfig()` is exported from `src/utils/provider-config.ts`
- [ ] Return type is `GlobalProviderConfig` (non-nullable)
- [ ] Returns `globalConfig` value when it is not `null`
- [ ] Returns default `{defaultProvider: 'anthropic', providerDefaults: {}}` when `globalConfig` is `null`
- [ ] Function is pure (no side effects, no mutations)
- [ ] Includes comprehensive JSDoc documentation
- [ ] All existing tests continue to pass
- [ ] New unit tests cover all scenarios

---

## All Needed Context

### Context Completeness Check

✅ **PASS**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully from this PRP.

### Documentation & References

```yaml
# MUST READ - Implementation file to modify
- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: This is the file containing globalConfig storage and configureProviders(). You will add getGlobalProviderConfig() here.
  pattern: Module-private variable pattern (line 77: let globalConfig: GlobalProviderConfig | null = null)
  gotcha: The function is currently commented out (lines 171-186). You must uncomment and implement it.
  critical: Use ES module scoping for privacy - do NOT export globalConfig directly

# MUST READ - Type definitions
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Contains GlobalProviderConfig interface definition (lines 329-364) needed for return type
  section: "Global Provider Configuration (PRD 7.6)" section starting at line 325
  gotcha: defaultProvider is required, providerDefaults is optional (Partial<Record<ProviderId, ProviderOptions>>)

# MUST READ - Existing test patterns
- file: /home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts
  why: Shows testing patterns for configureProviders() - follow same structure for getGlobalProviderConfig() tests
  pattern: describe/it/expect structure, afterEach reset pattern (lines 10-12)
  gotcha: No reset function exists yet - you may need to add resetGlobalConfig() for testing

# MUST READ - Implementation patterns
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: Defines accessor function patterns, configuration cascade, and default value patterns
  section: "Configuration Patterns" section (lines 407-460) for ?? operator usage
  critical: Use ?? (nullish coalescing) not || for defaults (line 436-444)

# MUST READ - Similar accessor patterns in codebase
- file: /home/dustin/projects/groundswell/src/core/context.ts
  why: Shows existing accessor patterns: getExecutionContext() (line 38) and requireExecutionContext() (line 48)
  pattern: Two accessor variants - one returning undefined, one throwing
  gotcha: Our getGlobalProviderConfig() should NEVER return null - use default instead

# MUST READ - System context
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/system_context.md
  why: Provides overview of provider system architecture and current implementation status
  section: "Configuration Cascade (Planned)" section (lines 199-208)
  critical: This accessor is the foundation of the cascade system

# EXTERNAL RESEARCH - TypeScript module patterns
- url: https://www.typescriptlang.org/docs/handbook/modules.html
  why: Understanding ES module scoping and privacy in TypeScript
  section: "Introduction to Modules" and "Module visibility"

# EXTERNAL RESEARCH - MDN JavaScript Modules
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
  why: ES module evaluation semantics and singleton behavior
  section: "Module scope and privacy" section
  critical: ES modules are evaluated once per process = natural singleton

# EXTERNAL RESEARCH - Nullish coalescing operator
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator
  why: Using ?? for default values instead of ||
  section: "Description" and "Examples"
  critical: ?? only treats null/undefined as missing, || treats 0, '', false as missing
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── utils/
│   └── provider-config.ts           # IMPLEMENT HERE - Add getGlobalProviderConfig()
│       ├── let globalConfig: GlobalProviderConfig | null = null  (line 77)
│       ├── configureProviders()     (lines 142-165)
│       └── // TODO: getGlobalProviderConfig()  (lines 171-186)
├── types/
│   └── providers.ts                 # TYPE DEFINITIONS - GlobalProviderConfig interface (lines 329-364)
└── __tests__/
    └── unit/
        └── utils/
            └── provider-config.test.ts  # TEST HERE - Add tests for getGlobalProviderConfig()
```

### Desired Codebase Tree (after implementation)

```bash
src/
├── utils/
│   └── provider-config.ts
│       ├── let globalConfig: GlobalProviderConfig | null = null
│       ├── configureProviders()     (existing, unchanged)
│       ├── getGlobalProviderConfig()  # NEW - IMPLEMENT THIS
│       └── resetGlobalConfig()?      # NEW - Optional: Add for testability
├── types/
│   └── providers.ts                 # (unchanged)
└── __tests__/
    └── unit/
        └── utils/
            └── provider-config.test.ts
                └── describe('getGlobalProviderConfig', ...)  # NEW - TEST THIS
```

### Known Gotchas of Groundswell Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript ESM requires .js extensions in imports
// Line 52 in provider-config.ts shows correct pattern:
import type { GlobalProviderConfig, ProviderId } from '../types/providers.js';

// CRITICAL: Use ?? (nullish coalescing) for defaults, not ||
// From implementation_patterns.md line 439:
// GOOD: const timeout = options.timeout ?? 30000;
// BAD:  const timeout = options.timeout || 30000; // Wrong if timeout is 0

// CRITICAL: Module-private variables must NOT be exported
// The globalConfig variable (line 77) is private to this module
// DO NOT add: export { globalConfig }

// CRITICAL: Default config must match GlobalProviderConfig interface
// defaultProvider is required field (ProviderId: 'anthropic' | 'opencode')
// providerDefaults is optional (Partial<Record<ProviderId, ProviderOptions>>)

// CRITICAL: Function must be pure - no mutations, no side effects
// Only read from globalConfig, never write to it
// Writing is done by configureProviders() only

// CRITICAL: Follow existing JSDoc style
// See configureProviders() (lines 106-141) for JSDoc pattern
// Use @example tags showing usage

// CRITICAL: Type assertion needed for default value
// The default object must satisfy GlobalProviderConfig interface
// Use 'as ProviderId' for defaultProvider to satisfy type checker
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing `GlobalProviderConfig` interface from `src/types/providers.ts`:

```typescript
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: DEFINE default configuration constant
  - CREATE: const DEFAULT_CONFIG: GlobalProviderConfig at module level
  - LOCATION: After globalConfig variable (after line 77 in provider-config.ts)
  - VALUE: { defaultProvider: 'anthropic' as ProviderId, providerDefaults: {} }
  - TYPE: Use 'as ProviderId' assertion for defaultProvider
  - PLACEMENT: Before getGlobalProviderConfig() implementation
  - NAMING: DEFAULT_CONFIG (uppercase for module constant)

Task 2: IMPLEMENT getGlobalProviderConfig() function
  - UNCOMMENT: Lines 171-186 in provider-config.ts (placeholder comment)
  - IMPLEMENT: export function getGlobalProviderConfig(): GlobalProviderConfig
  - LOGIC: return globalConfig ?? DEFAULT_CONFIG; (nullish coalescing)
  - RETURN TYPE: GlobalProviderConfig (non-nullable)
  - PLACEMENT: After configureProviders() function (lines 142-165)
  - NAMING: getGlobalProviderConfig (camelCase function name)
  - DEPENDENCIES: Requires DEFAULT_CONFIG from Task 1

Task 3: ADD comprehensive JSDoc documentation
  - DOCUMENT: Function purpose and behavior
  - PATTERN: Follow configureProviders() JSDoc style (lines 106-141)
  - INCLUDE: @example tag showing usage with default and configured states
  - EXPLAIN: "Never returns null" guarantee in description
  - PARAMS: None (function takes no parameters)
  - RETURNS: @returns {GlobalProviderConfig} Current global configuration (always valid)

Task 4: (OPTIONAL) ADD resetGlobalConfig() for testing
  - CONSIDER: Adding reset function for test isolation
  - PATTERN: Similar to other modules with global state
  - IMPLEMENT: export function resetGlobalConfig(): void { globalConfig = null; }
  - DOCUMENT: Mark as @internal or @testing if added
  - PLACEMENT: After getGlobalProviderConfig()
  - REASON: Enables proper test isolation (see test patterns below)

Task 5: WRITE unit tests for getGlobalProviderConfig()
  - CREATE: New describe block 'getGlobalProviderConfig' in provider-config.test.ts
  - LOCATION: After configureProviders tests (after line 132)
  - PATTERN: Follow existing test structure (describe/it/expect)
  - TEST SCENARIOS:
    - returns default config when not configured
    - returns configured value after configureProviders() call
    - returns default with correct defaultProvider ('anthropic')
    - returns default with empty providerDefaults
    - function is pure (no mutations on repeated calls)
    - return type is correct (structure validation)
  - COVERAGE: 100% of function logic paths
  - CLEANUP: Use resetGlobalConfig() in afterEach if Task 4 implemented

Task 6: UPDATE module exports (if needed)
  - VERIFY: getGlobalProviderConfig() is exported
  - CHECK: No breaking changes to existing exports
  - RUN: TypeScript compilation to verify no type errors
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: Default Configuration Constant (Task 1)
// ============================================================================

/**
 * Default global provider configuration
 *
 * @internal
 */
const DEFAULT_CONFIG: GlobalProviderConfig = {
  // CRITICAL: Use type assertion for literal string
  defaultProvider: 'anthropic' as ProviderId,
  providerDefaults: undefined
};

// GOTCHA: providerDefaults should be undefined, not {}
// The interface uses Partial<Record<...>> which allows undefined
// Using {} creates an empty object which has different semantics

// ============================================================================
// Pattern 2: Accessor Function Implementation (Task 2)
// ============================================================================

/**
 * Get the current global provider configuration
 *
 * **TO BE IMPLEMENTED IN P1.M2.T1.S3**
 *
 * This function provides controlled access to the module-private
 * `globalConfig` variable. It guarantees a non-null return by
 * providing sensible defaults when no configuration has been set.
 *
 * ## Semantics
 *
 * - If `configureProviders()` was called: returns the configured value
 * - If never configured: returns default configuration
 * - **Never returns null**: Always returns a valid `GlobalProviderConfig`
 *
 * ## Usage
 *
 * ```ts
 * import { getGlobalProviderConfig } from 'groundswell';
 *
 * // Before configuration - returns defaults
 * const config1 = getGlobalProviderConfig();
 * console.log(config1.defaultProvider); // 'anthropic'
 *
 * // After configuration
 * configureProviders({ defaultProvider: 'opencode' });
 * const config2 = getGlobalProviderConfig();
 * console.log(config2.defaultProvider); // 'opencode'
 * ```
 *
 * @returns Current global provider configuration (never null)
 *
 * @example
 * ```ts
 * // Get default configuration
 * const config = getGlobalProviderConfig();
 * console.log(config.defaultProvider); // 'anthropic'
 *
 * // Use for provider initialization
 * const providerOptions = config.providerDefaults?.[config.defaultProvider];
 * ```
 */
export function getGlobalProviderConfig(): GlobalProviderConfig {
  // PATTERN: Nullish coalescing for defaults
  // ?? only treats null/undefined as missing
  // Returns globalConfig if set, otherwise DEFAULT_CONFIG
  return globalConfig ?? DEFAULT_CONFIG;
}

// ============================================================================
// Pattern 3: Optional Reset Function for Testing (Task 4)
// ============================================================================

/**
 * Reset global configuration to defaults
 *
 * **FOR TESTING PURPOSES ONLY**
 *
 * This function clears the global configuration, causing subsequent
 * calls to `getGlobalProviderConfig()` to return defaults.
 *
 * @internal
 */
export function resetGlobalConfig(): void {
  globalConfig = null;
}

// ============================================================================
// Pattern 4: Testing Structure (Task 5)
// ============================================================================

describe('getGlobalProviderConfig', () => {
  // PATTERN: Reset after each test for isolation
  afterEach(() => {
    resetGlobalConfig();
  });

  describe('default behavior (not configured)', () => {
    it('should return default config when never configured', () => {
      const config = getGlobalProviderConfig();

      expect(config).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined
      });
    });

    it('should return default with anthropic as defaultProvider', () => {
      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('anthropic');
    });

    it('should return default with undefined providerDefaults', () => {
      const config = getGlobalProviderConfig();

      expect(config.providerDefaults).toBeUndefined();
    });

    it('should be pure (no mutations on repeated calls)', () => {
      const config1 = getGlobalProviderConfig();
      const config2 = getGlobalProviderConfig();

      expect(config1).toBe(config2); // Same reference
      expect(config1).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined
      });
    });
  });

  describe('after configuration', () => {
    it('should return configured value', () => {
      configureProviders({
        defaultProvider: 'opencode',
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' }
        }
      });

      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('opencode');
      expect(config.providerDefaults?.anthropic?.apiKey).toBe('sk-test');
    });

    it('should preserve configured values across calls', () => {
      configureProviders({ defaultProvider: 'opencode' });

      const config1 = getGlobalProviderConfig();
      const config2 = getGlobalProviderConfig();

      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('after reset', () => {
    it('should return defaults after reset', () => {
      configureProviders({ defaultProvider: 'opencode' });
      resetGlobalConfig();

      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('anthropic');
      expect(config.providerDefaults).toBeUndefined();
    });
  });

  describe('return type validation', () => {
    it('should return valid GlobalProviderConfig structure', () => {
      const config = getGlobalProviderConfig();

      // Verify structure
      expect(typeof config.defaultProvider).toBe('string');
      expect(['anthropic', 'opencode']).toContain(config.defaultProvider);
      // providerDefaults is optional
      if (config.providerDefaults) {
        expect(typeof config.providerDefaults).toBe('object');
      }
    });

    it('should never return null or undefined', () => {
      const config = getGlobalProviderConfig();

      expect(config).not.toBeNull();
      expect(config).not.toBeUndefined();
    });
  });
});
```

### Integration Points

```yaml
MODULE_EXPORTS:
  - file: src/utils/provider-config.ts
  - add: export function getGlobalProviderConfig(): GlobalProviderConfig
  - existing: configureProviders() is already exported
  - verify: No breaking changes to existing exports

CONFIGURATION_CASCADE:
  - depends_on: getGlobalProviderConfig()
  - used_by: resolveProviderConfig() (P1.M2.T1.S4 - not yet implemented)
  - used_by: ProviderRegistry.initializeAll() (P1.M3.T1.S2 - not yet implemented)
  - used_by: Agent constructor (P4.M1.T1.S2 - not yet implemented)

TESTING:
  - file: src/__tests__/unit/utils/provider-config.test.ts
  - add: New describe block for getGlobalProviderConfig()
  - pattern: Follow existing configureProviders() test structure
  - cleanup: Use resetGlobalConfig() in afterEach hooks
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementing the function
# Change to project root
cd /home/dustin/projects/groundswell

# TypeScript type checking
npm run lint
# Expected: Zero errors. The function should have correct return type.

# Format check (if using prettier/ruff equivalent)
# This project uses TypeScript compiler for formatting
npx tsc --noEmit
# Expected: No type errors

# Manual code review
# - Check: JSDoc is complete and follows existing style
# - Check: Function is exported
# - Check: Uses ?? operator, not ||
# - Check: DEFAULT_CONFIG constant is defined before use
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Expected output:
# ✓ configureProviders (11 tests)
# ✓ getGlobalProviderConfig (all new tests pass)
#
# Test Files  1 passed (1)
# Tests  15 passed (15)

# Run with coverage (if available)
npm run test:coverage -- src/__tests__/unit/utils/provider-config.test.ts

# Expected: 100% coverage for getGlobalProviderConfig function

# Run full utils test suite
npm test -- src/__tests__/unit/utils/

# Expected: All tests pass, no regressions
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that module exports are correct
node -e "
import('./src/utils/provider-config.js').then(m => {
  console.log('Exports:', Object.keys(m));
  console.log('has getGlobalProviderConfig:', typeof m.getGlobalProviderConfig === 'function');
});
"
# Expected: getGlobalProviderConfig is listed and is a function

# Test that function works as expected
node -e "
import('./src/utils/provider-config.js').then(m => {
  const config1 = m.getGlobalProviderConfig();
  console.log('Default config:', config1);
  console.log('defaultProvider:', config1.defaultProvider);

  m.configureProviders({ defaultProvider: 'opencode' });
  const config2 = m.getGlobalProviderConfig();
  console.log('Configured config:', config2);
  console.log('defaultProvider:', config2.defaultProvider);
});
"
# Expected:
# Default config: { defaultProvider: 'anthropic', providerDefaults: undefined }
# defaultProvider: anthropic
# Configured config: { defaultProvider: 'opencode', ... }
# defaultProvider: opencode

# Run full test suite
npm test
# Expected: All tests pass, no new failures
```

### Level 4: Type Safety & Contract Validation

```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Check that return type is correctly inferred
node -e "
import('./src/utils/provider-config.js').then(m => {
  const config = m.getGlobalProviderConfig();
  // This should compile without null checks
  const provider = config.defaultProvider;
  console.log('Type-safe access:', provider);
});
"
# Expected: No TypeScript errors, outputs 'Type-safe access: anthropic'

# Verify function is pure (no side effects)
node -e "
import('./src/utils/provider-config.js').then(m => {
  const c1 = m.getGlobalProviderConfig();
  const c2 = m.getGlobalProviderConfig();
  const c3 = m.getGlobalProviderConfig();
  console.log('Pure function:', c1 === c2 && c2 === c3);
});
"
# Expected: 'Pure function: true' (same reference on repeated calls)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **Implementation Complete**: `getGlobalProviderConfig()` function exists and is exported
- [ ] **Return Type Correct**: Returns `GlobalProviderConfig` (never `null` or `undefined`)
- [ ] **Default Logic**: Returns `globalConfig ?? DEFAULT_CONFIG`
- [ ] **Default Config**: `DEFAULT_CONFIG` constant with `{defaultProvider: 'anthropic', providerDefaults: undefined}`
- [ ] **JSDoc Complete**: Comprehensive documentation with `@example` tags
- [ ] **Type Safety**: TypeScript compilation passes with no errors
- [ ] **All Tests Pass**: Both new tests and existing tests pass
- [ ] **No Linting Errors**: Code follows project style guidelines

### Feature Validation

- [ ] **Default When Unconfigured**: Returns default when `configureProviders()` never called
- [ ] **Configured Value**: Returns configured value after `configureProviders()` called
- [ ] **Pure Function**: No mutations, no side effects on repeated calls
- [ ] **Never Returns Null**: Contract satisfied - always valid `GlobalProviderConfig`
- [ ] **Correct defaultProvider**: Default is `'anthropic'`
- [ ] **Correct providerDefaults**: Default is `undefined`

### Code Quality Validation

- [ ] **Follows Existing Patterns**: Matches `configureProviders()` style and structure
- [ ] **Uses `??` Operator**: Nullish coalescing, not logical OR (`||`)
- [ ] **Module Privacy**: `globalConfig` remains unexported (truly private)
- [ ] **ESM Compatible**: Uses `.js` extensions in imports if needed
- [ ] **No Breaking Changes**: Existing exports and functionality unchanged
- [ ] **Test Coverage**: 100% of function code paths tested

### Integration Validation

- [ ] **Module Exports**: Function is exported and accessible from module
- [ ] **Import Works**: Can import and use function from other modules
- [ ] **Type Inference**: TypeScript correctly infers non-nullable return type
- [ ] **Documentation**: JSDoc matches implementation behavior
- [ ] **Future Compatibility**: Ready for use by `resolveProviderConfig()` (P1.M2.T1.S4)

### Anti-Patterns Check

- [ ] ❌ **Did NOT export `globalConfig` variable** (privacy maintained)
- [ ] ❌ **Did NOT use `||` operator** (correctly used `??`)
- [ ] ❌ **Did NOT return `null` or `undefined`** (always returns valid config)
- [ ] ❌ **Did NOT mutate parameters** (function takes no parameters)
- [ ] ❌ **Did NOT have side effects** (pure function - only reads)
- [ ] ❌ **Did NOT throw errors** (function always succeeds)
- [ ] ❌ **Did NOT use `any` type** (properly typed with `GlobalProviderConfig`)

---

## Anti-Patterns to Avoid

### ❌ Bad Pattern 1: Exporting the Private Variable

```typescript
// BAD: Breaks encapsulation
let globalConfig: GlobalProviderConfig | null = null;
export { globalConfig };

// GOOD: Keep it private, export accessor
let globalConfig: GlobalProviderConfig | null = null;
export function getGlobalProviderConfig() {
  return globalConfig ?? DEFAULT_CONFIG;
}
```

### ❌ Bad Pattern 2: Using Logical OR (`||`)

```typescript
// BAD: Treats 0, '', false as missing
return globalConfig || DEFAULT_CONFIG;

// GOOD: Only treats null/undefined as missing
return globalConfig ?? DEFAULT_CONFIG;
```

### ❌ Bad Pattern 3: Returning Null

```typescript
// BAD: Caller must do null checks
export function getGlobalProviderConfig(): GlobalProviderConfig | null {
  return globalConfig;
}

// GOOD: Always returns valid config
export function getGlobalProviderConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}
```

### ❌ Bad Pattern 4: Mutable Default Object

```typescript
// BAD: Creates object on every call, could be mutated
export function getGlobalProviderConfig(): GlobalProviderConfig {
  return globalConfig || {
    defaultProvider: 'anthropic',
    providerDefaults: {}
  };
}

// GOOD: Returns reference to constant or globalConfig
const DEFAULT_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: undefined
};
export function getGlobalProviderConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}
```

### ❌ Bad Pattern 5: Side Effects in Accessor

```typescript
// BAD: Accessor has side effects
export function getGlobalProviderConfig(): GlobalProviderConfig {
  if (!globalConfig) {
    console.log('Using defaults'); // Side effect!
    globalConfig = DEFAULT_CONFIG; // Mutation!
  }
  return globalConfig;
}

// GOOD: Pure accessor - no side effects
export function getGlobalProviderConfig(): GlobalProviderConfig {
  return globalConfig ?? DEFAULT_CONFIG;
}
```

---

## References & Research Summary

### Codebase Patterns Found

1. **Module-Private Variable Pattern** (from `src/utils/provider-config.ts:77`)
   - Uses ES module scoping for true privacy
   - `let globalConfig: GlobalProviderConfig | null = null` is not exported

2. **Existing Accessor Patterns** (from `src/core/context.ts:38-48`)
   - `getExecutionContext()`: Returns `AgentExecutionContext | undefined`
   - `requireExecutionContext()`: Throws if context not available
   - Our pattern differs: Returns defaults instead of `undefined` or throwing

3. **Default Value Pattern** (from `src/cache/cache-key.ts:119-139`)
   - Multiple fallback levels for error resilience
   - Uses `??` operator consistently

### External Best Practices

1. **ES Module Scoping** (MDN)
   - Module-level variables are truly private if not exported
   - ES modules are singletons by design (evaluated once per process)

2. **Nullish Coalescing (`??`)** (MDN)
   - Only treats `null` and `undefined` as missing values
   - Prefer over `||` for default values

3. **TypeScript Typing for Accessors** (TypeScript Handbook)
   - Use explicit return types for public APIs
   - Leverage type inference for internal logic

### Testing Patterns

1. **Vitest Structure** (from existing tests)
   - `describe/it/expect` pattern
   - `afterEach` for cleanup/reset
   - Test both success paths and default behavior

2. **Test Isolation**
   - Use `resetGlobalConfig()` in `afterEach` hooks
   - Ensures each test starts with clean state

---

## Confidence Score

**9/10** for one-pass implementation success

**Reasoning**:
- ✅ Simple, well-defined function (1 story point)
- ✅ Clear contract and specification
- ✅ Extensive codebase examples of similar patterns
- ✅ All context provided with specific file paths and line numbers
- ✅ Testing patterns well-established in codebase
- ✅ No external dependencies or complex integration
- ⚠️ Minor risk: Test isolation may require adding `resetGlobalConfig()` function
- ⚠️ Minor risk: Default value for `providerDefaults` (`undefined` vs `{}`) needs verification

**Mitigation**: PRP includes explicit guidance on both risks with recommended solutions.

---

## Appendix: Quick Reference

### File Locations

| Purpose | Path |
|---------|------|
| **Implementation** | `/home/dustin/projects/groundswell/src/utils/provider-config.ts` |
| **Type Definitions** | `/home/dustin/projects/groundswell/src/types/providers.ts` |
| **Test File** | `/home/dustin/projects/groundswell/src/__tests__/unit/utils/provider-config.test.ts` |
| **Patterns Doc** | `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md` |

### Key Line Numbers

| Item | File | Line |
|------|------|------|
| **globalConfig variable** | provider-config.ts | 77 |
| **configureProviders()** | provider-config.ts | 142-165 |
| **TODO placeholder** | provider-config.ts | 171-186 |
| **GlobalProviderConfig interface** | providers.ts | 353-364 |
| **Existing tests** | provider-config.test.ts | 10-132 |

### Implementation Checklist

- [ ] Define `DEFAULT_CONFIG` constant
- [ ] Implement `getGlobalProviderConfig()` function
- [ ] Add JSDoc documentation
- [ ] (Optional) Add `resetGlobalConfig()` for testing
- [ ] Write unit tests
- [ ] Run TypeScript compilation
- [ ] Run test suite
- [ ] Verify module exports

### Success Command

```bash
# One command to verify implementation success
npm test -- src/__tests__/unit/utils/provider-config.test.ts && echo "✅ getGlobalProviderConfig() implementation verified"
```

---

**End of PRP**
