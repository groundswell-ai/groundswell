# Product Requirement Prompt (PRP)
## Subtask P1.M2.T1.S2: Implement configureProviders() Function

---

## Goal

**Feature Goal**: Implement the `configureProviders()` function that validates and stores global provider configuration in the module-private `globalConfig` variable.

**Deliverable**: A complete `configureProviders()` function in `src/utils/provider-config.ts` with:
1. Validation of `config.defaultProvider` against valid ProviderIds ('anthropic' | 'opencode')
2. Validation of `config.providerDefaults` keys against valid ProviderIds
3. Mutation of module-private `globalConfig` variable
4. Comprehensive unit tests covering all validation scenarios

**Success Definition**:
- Function validates input and throws descriptive errors for invalid providers
- Function stores valid configuration in `globalConfig` variable
- All tests pass (valid cases, invalid defaultProvider, invalid providerDefaults keys)
- Function is exported from `src/utils/index.ts`
- TypeScript compiles without errors

---

## User Persona

**Target User**: Developer configuring the Groundswell library at application startup

**Use Case**: Set default provider and per-provider options once at app startup, cascading to all agents unless explicitly overridden

**User Journey**:
1. Developer imports `configureProviders` from Groundswell
2. Calls `configureProviders()` with `GlobalProviderConfig` at app startup
3. If configuration is valid, it's stored globally
4. All agents created thereafter inherit this configuration

**Pain Points Addressed**:
- Single point of configuration instead of per-agent setup
- Validation catches configuration errors early (fail-fast)
- Clear error messages guide users to fix configuration issues

---

## Why

- **Foundation for Multi-Provider System**: `configureProviders()` is the primary API for setting global provider defaults
- **Fail-Fast Validation**: Catching configuration errors at startup prevents runtime failures
- **Configuration Cascade**: Global config is the base of the cascade (Global → Agent → Prompt)
- **Developer Experience**: Clear error messages with supported providers listed
- **Type Safety**: Leverages TypeScript's `ProviderId` union type for compile-time and runtime validation

---

## What

Implement the `configureProviders()` function per PRD Section 7.6.

### Contract Definition (from Work Item Description)

**INPUT**: `config: GlobalProviderConfig`

**LOGIC**:
1. Validate `config.defaultProvider` is 'anthropic' or 'opencode'
2. Validate `config.providerDefaults` keys (if present) are valid ProviderIds
3. Store in `globalConfig` variable
4. Throw on invalid provider

**OUTPUT**: Sets global configuration. No return value (void).

### Implementation Scope

**IN SCOPE**:
1. Implement `configureProviders()` function in `src/utils/provider-config.ts`
2. Add private validation helper functions (`isValidProviderId`, `getSupportedProvidersList`)
3. Mutate module-private `globalConfig` variable
4. Export function from `src/utils/index.ts`
5. Create comprehensive unit tests

**OUT OF SCOPE** (Future Subtasks):
- `getGlobalProviderConfig()` accessor → P1.M2.T1.S3
- `resolveProviderConfig()` cascade utility → P1.M2.T1.S4
- Provider registry integration → P1.M3
- Actual provider implementations → P2, P3

### Success Criteria

- [ ] Function `configureProviders()` exists and is exported
- [ ] Validates `defaultProvider` is 'anthropic' or 'opencode'
- [ ] Validates `providerDefaults` keys are valid ProviderIds
- [ ] Throws `Error` with descriptive message on invalid provider
- [ ] Stores valid config in `globalConfig` variable
- [ ] All tests pass (valid + error cases)
- [ ] Exported from `src/utils/index.ts`
- [ ] TypeScript compiles without errors

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: A developer unfamiliar with this codebase has everything needed:
- Complete type definitions (GlobalProviderConfig, ProviderId, ProviderOptions)
- Existing module structure with `globalConfig` variable
- Validation patterns from existing codebase
- Test patterns and framework configuration
- Module system details (ESM, TypeScript config)
- Exact file locations and import patterns

### Documentation & References

```yaml
# MUST READ - Type Definitions
- file: src/types/providers.ts
  why: Contains GlobalProviderConfig interface definition
  critical: |
    - Lines 353-364: GlobalProviderConfig interface
    - defaultProvider: ProviderId (required)
    - providerDefaults?: Partial<Record<ProviderId, ProviderOptions>> (optional)
  section: "Global Provider Configuration (PRD 7.6)"

# MUST READ - Existing Module Structure
- file: src/utils/provider-config.ts
  why: Contains module-private globalConfig variable to mutate
  critical: |
    - Lines 77: let globalConfig: GlobalProviderConfig | null = null
    - Lines 82-103: Placeholder comment for configureProviders()
    - Variable is NOT exported (module-private via ESM scoping)
  gotcha: Do NOT export the globalConfig variable

# MUST READ - Validation Pattern Reference
- file: src/utils/model-spec.ts
  why: Shows exact validation pattern to follow
  pattern: |
    - Lines 30-32: isValidProviderId() type guard function
    - Lines 39-41: getSupportedProvidersList() helper
    - Lines 145-150: Validation error pattern with throw
  critical: Copy this pattern for configureProviders()

# MUST READ - Test Pattern Reference
- file: src/__tests__/unit/utils/model-spec.test.ts
  why: Shows test structure for validation functions
  pattern: |
    - describe('error cases') for error testing
    - expect(() => function()).toThrow() for error cases
    - try/catch with expect.fail() for detailed error checking
    - Error message validation with contains()
  section: Lines 140-175 (error case tests)

# MUST READ - Barrel Export Pattern
- file: src/utils/index.ts
  why: Shows how to export from utils module
  pattern: export { parseModelSpec, formatModelForProvider } from './model-spec.js';
  action: Add configureProviders export here

# Project Configuration
- file: package.json
  why: Confirm ESM module system ("type": "module")
  critical: All imports must use .js extensions

- file: tsconfig.json
  why: TypeScript configuration (ES2022 target, ES2022 modules)
  critical: Strict mode enabled, noEmit for builds

- file: vitest.config.ts
  why: Test framework configuration
  pattern: Tests in src/__tests__/**/*.test.ts, globals enabled
```

### Current Codebase Tree

```bash
src/
├── cache/
│   └── cache.ts
├── core/
│   ├── agent.ts
│   ├── context.ts
│   ├── mcp-handler.ts
│   └── workflow.ts
├── types/
│   ├── providers.ts                # GlobalProviderConfig, ProviderId, ProviderOptions
│   └── index.ts
├── utils/
│   ├── provider-config.ts          # MODIFY: Add configureProviders()
│   ├── model-spec.ts               # Validation pattern reference
│   ├── id.ts
│   ├── observable.ts
│   └── index.ts                    # MODIFY: Export configureProviders
└── __tests__/
    └── unit/
        └── utils/
            └── model-spec.test.ts  # Test pattern reference
```

### Desired Codebase Tree (After This Subtask)

```bash
src/
├── utils/
│   ├── provider-config.ts          # UPDATED: Add configureProviders() function
│   └── index.ts                    # UPDATED: Export configureProviders
└── __tests__/
    └── unit/
        └── utils/
            └── provider-config.test.ts  # NEW: Test file
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: ESM Module System
// Project uses pure ESM ("type": "module" in package.json)
// All imports MUST use .js extensions (TypeScript requires this for ESM)
import type { GlobalProviderConfig } from '../types/providers.js';  // ✓ CORRECT

// CRITICAL: Module-Private Variable Access
// globalConfig is module-private (not exported)
// Access it directly by name since we're in the same module
let globalConfig: GlobalProviderConfig | null = null;  // Already exists

// CRITICAL: Validation Pattern
// Follow the exact pattern from model-spec.ts
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

// CRITICAL: Error Message Format
// Use template literals + concatenation for consistency
throw new Error(
  `Invalid provider: "${provider}". ` +
  `Supported providers: ${getSupportedProvidersList()}`
);

// CRITICAL: Validation Order
// Validate BEFORE mutating globalConfig
// 1. Validate defaultProvider
// 2. Validate providerDefaults keys (if present)
// 3. Then: globalConfig = config

// CRITICAL: Type Safety
// Use built-in Error class, not custom errors
throw new Error('message');  // ✓ CORRECT

// CRITICAL: Void Return Type
// Function returns nothing, just mutates globalConfig
export function configureProviders(config: GlobalProviderConfig): void

// CRITICAL: providerDefaults is Optional
// It may be undefined, check before iterating
if (config.providerDefaults) {
  // Validate keys
}

// CRITICAL: Object.keys() returns string[]
// When iterating providerDefaults keys, they are strings, not ProviderIds
// Need to validate each key with isValidProviderId()
for (const providerId of Object.keys(config.providerDefaults)) {
  if (!isValidProviderId(providerId)) {
    // Throw error
  }
}

// CRITICAL: Test Isolation
// No special reset needed for module-private variables
// ES module scoping provides natural test isolation
// Each test file imports a fresh module instance
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models** - uses existing types from `src/types/providers.ts`:

```typescript
// From src/types/providers.ts (lines 353-364)
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

// ProviderId type (lines 8-10)
export type ProviderId = 'anthropic' | 'opencode';

// ProviderOptions interface (lines 35-50)
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: ADD Private Validation Helpers to provider-config.ts
  - IMPLEMENT: isValidProviderId() type guard function
  - IMPLEMENT: getSupportedProvidersList() helper function
  - PATTERN: Copy from src/utils/model-spec.ts lines 30-41
  - PLACEMENT: Before configureProviders() function
  - ACCESSIBILITY: Private (not exported), same file only

Task 2: IMPLEMENT configureProviders() Function
  - UNCOMMENT: Lines 82-103 placeholder in provider-config.ts
  - VALIDATION: Check defaultProvider with isValidProviderId()
  - VALIDATION: Check providerDefaults keys with isValidProviderId()
  - MUTATION: Set globalConfig = config (after validation)
  - RETURN: void (no return value)
  - NAMING: camelCase function name
  - PLACEMENT: src/utils/provider-config.ts

Task 3: EXPORT Function from Barrel
  - MODIFY: src/utils/index.ts
  - ADD: export { configureProviders } from './provider-config.js';
  - PATTERN: Follow existing export pattern in index.ts

Task 4: CREATE Test File provider-config.test.ts
  - IMPLEMENT: describe block for configureProviders
  - IMPLEMENT: Valid configuration test cases
  - IMPLEMENT: Invalid defaultProvider test cases
  - IMPLEMENT: Invalid providerDefaults keys test cases
  - IMPLEMENT: Error message validation tests
  - PATTERN: Follow src/__tests__/unit/utils/model-spec.test.ts
  - FRAMEWORK: Vitest with describe/it/expect
  - PLACEMENT: src/__tests__/unit/utils/provider-config.test.ts
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// src/utils/provider-config.ts - ADD THESE HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard to check if a string is a valid ProviderId
 *
 * @param value - The string value to check
 * @returns True if the value is a valid ProviderId ('anthropic' | 'opencode')
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

/**
 * Get comma-separated list of supported providers for error messages
 *
 * @returns Formatted list of valid provider IDs
 */
function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';
}

// ============================================================================
// src/utils/provider-config.ts - IMPLEMENT configureProviders()
// ============================================================================

/**
 * Configure global provider settings
 *
 * Validates the configuration and stores it in the module-private
 * globalConfig variable. This function should be called once at
 * application startup.
 *
 * ## Validation
 *
 * - `defaultProvider` must be 'anthropic' or 'opencode'
 * - `providerDefaults` keys (if present) must be valid ProviderIds
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * This global config is the lowest priority in the cascade:
 * 1. GlobalProviderConfig (this config) - lowest priority
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides - highest priority
 *
 * @param config - Global provider configuration
 * @throws {Error} If defaultProvider is invalid
 * @throws {Error} If providerDefaults contains invalid provider IDs
 *
 * @example
 * ```ts
 * import { configureProviders } from 'groundswell';
 *
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export function configureProviders(config: GlobalProviderConfig): void {
  // Step 1: Validate defaultProvider
  if (!isValidProviderId(config.defaultProvider)) {
    throw new Error(
      `Invalid default provider: "${config.defaultProvider}". ` +
      `Supported providers: ${getSupportedProvidersList()}`
    );
  }

  // Step 2: Validate providerDefaults keys (if present)
  if (config.providerDefaults) {
    for (const providerId of Object.keys(config.providerDefaults)) {
      if (!isValidProviderId(providerId)) {
        throw new Error(
          `Invalid provider in providerDefaults: "${providerId}". ` +
          `Supported providers: ${getSupportedProvidersList()}`
        );
      }
    }
  }

  // Step 3: Store configuration (validation passed)
  globalConfig = config;
}
```

### Test Implementation Pattern

```typescript
// ============================================================================
// src/__tests__/unit/utils/provider-config.test.ts
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { configureProviders } from '../../../utils/provider-config.js';

// Note: No special reset needed - ES module scoping provides isolation

describe('configureProviders', () => {
  describe('valid configuration', () => {
    it('should accept anthropic as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'anthropic' });
      }).not.toThrow();
    });

    it('should accept opencode as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'opencode' });
      }).not.toThrow();
    });

    it('should accept configuration with providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'opencode',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' },
            opencode: { endpoint: 'http://localhost:8080' }
          }
        });
      }).not.toThrow();
    });

    it('should accept configuration with partial providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' }
          }
        });
      }).not.toThrow();
    });
  });

  describe('invalid defaultProvider', () => {
    it('should throw on invalid provider string', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'invalid' });
      }).toThrow(/Invalid default provider/i);
    });

    it('should include invalid value in error message', () => {
      try {
        configureProviders({ defaultProvider: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"invalid"');
      }
    });

    it('should list supported providers in error message', () => {
      try {
        configureProviders({ defaultProvider: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('anthropic');
        expect(message).toContain('opencode');
      }
    });
  });

  describe('invalid providerDefaults keys', () => {
    it('should throw on invalid provider in providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            invalid: { apiKey: 'sk-test' }
          }
        });
      }).toThrow(/Invalid provider in providerDefaults/i);
    });

    it('should include invalid key in error message', () => {
      try {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            badprovider: { apiKey: 'sk-test' }
          }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"badprovider"');
      }
    });

    it('should validate all providerDefaults keys', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' },
            invalid: { endpoint: 'http://localhost:8080' }
          }
        });
      }).toThrow(/Invalid provider in providerDefaults/i);
    });
  });

  describe('error message format', () => {
    it('should use consistent error message format', () => {
      try {
        configureProviders({ defaultProvider: 'wrong' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        // Format: "Invalid ...: "value". Supported providers: "anthropic", "opencode""
        expect(message).toMatch(/Invalid.*:.*".*"/);
        expect(message).toContain('Supported providers:');
      }
    });
  });
});
```

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: ../types/providers.js
  - types: GlobalProviderConfig
  - pattern: import type { GlobalProviderConfig } from '../types/providers.js';

BARREL_EXPORT:
  - modify: src/utils/index.ts
  - add: export { configureProviders } from './provider-config.js';
  - after: Existing model-spec exports

TEST_IMPORTS:
  - from: ../../../utils/provider-config.js
  - function: configureProviders
  - pattern: import { configureProviders } from '../../../utils/provider-config.js';
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementation - fix before proceeding
# Check TypeScript compilation
npx tsc --noEmit

# Expected: Zero errors. Output should be silent.

# If errors occur, READ the error message carefully:
# - Check for missing .js extensions in imports
# - Check that GlobalProviderConfig type is resolved
# - Check for any type mismatches

# Example error to fix:
# error TS2307: Cannot find module '../types/providers'
# Fix: Change to '../types/providers.js'
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the configureProviders function
uv run vitest src/__tests__/unit/utils/provider-config.test.ts --run

# Full utils test suite
uv run vitest src/__tests__/unit/utils/ --run

# Coverage validation (if coverage tools available)
uv run vitest src/__tests__/unit/utils/ --coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that the function can be imported from barrel export
node -e "
import('./src/utils/index.js').then(m => {
  console.log('configureProviders exported:', typeof m.configureProviders);
  console.log('Test passed: function is accessible');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
"

# Manual testing (create temporary test script)
cat > /tmp/test-configure.mjs << 'EOF'
import { configureProviders } from './src/utils/index.js';

// Test 1: Valid configuration
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' }
  }
});
console.log('✓ Valid configuration accepted');

// Test 2: Invalid provider (should throw)
try {
  configureProviders({ defaultProvider: 'invalid' });
  console.log('✗ Invalid provider was accepted (should have thrown)');
} catch (error) {
  console.log('✓ Invalid provider rejected:', error.message);
}

console.log('\nAll manual tests passed');
EOF

# Run manual test
node /tmp/test-configure.mjs

# Cleanup: rm /tmp/test-configure.mjs
```

### Level 4: Type System Validation

```bash
# Verify type exports work correctly
npx tsc --noEmit --pretty

# Test that the function signature matches expectations
cat > /tmp/type-test.ts << 'EOF'
import type { GlobalProviderConfig } from './src/types/providers.js';
import { configureProviders } from './src/utils/index.js';

// Type check: should accept valid config
const validConfig: GlobalProviderConfig = {
  defaultProvider: 'anthropic'
};
configureProviders(validConfig);

// Type check: should accept config with providerDefaults
const configWithDefaults: GlobalProviderConfig = {
  defaultProvider: 'opencode',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' }
  }
};
configureProviders(configWithDefaults);

// Type check: should reject invalid provider at compile time
// @ts-expect-error - Should not compile
configureProviders({ defaultProvider: 'invalid' });

console.log('Type checks passed');
EOF

# Compile type test
npx tsc --noEmit /tmp/type-test.ts

# Expected: Zero errors (ts-expect-error suppresses the intentional error)
# Cleanup: rm /tmp/type-test.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] File `src/utils/provider-config.ts` updated with `configureProviders()` function
- [ ] Private validation helpers added (`isValidProviderId`, `getSupportedProvidersList`)
- [ ] Function validates `defaultProvider` before storing config
- [ ] Function validates `providerDefaults` keys before storing config
- [ ] Function throws `Error` with descriptive messages
- [ ] Function mutates `globalConfig` variable
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Export added to `src/utils/index.ts`
- [ ] No linting errors (if project uses ESLint)

### Feature Validation

- [ ] Valid anthropic configuration accepted
- [ ] Valid opencode configuration accepted
- [ ] Valid configuration with providerDefaults accepted
- [ ] Invalid defaultProvider throws with error message
- [ ] Invalid providerDefaults key throws with error message
- [ ] Error messages include the invalid value in quotes
- [ ] Error messages list supported providers
- [ ] All unit tests pass: `uv run vitest src/__tests__/unit/utils/provider-config.test.ts`

### Code Quality Validation

- [ ] Follows existing codebase patterns (copied from model-spec.ts)
- [ ] JSDoc comments present and comprehensive
- [ ] Error message format matches existing pattern
- [ ] Validation occurs before mutation (fail-fast)
- [ ] Function signature matches PRD specification
- [ ] No dead code or commented-out code

### Documentation & Deployment

- [ ] JSDoc includes @throws tags for error conditions
- [ ] JSDoc includes @example showing usage
- [ ] JSDoc references PRD 7.7 configuration cascade
- [ ] Error messages are actionable and descriptive

---

## Anti-Patterns to Avoid

- ❌ **DON'T export validation helper functions**
  - Keep `isValidProviderId` and `getSupportedProvidersList` private
  - They are implementation details, not public API

- ❌ **DON'T validate after storing config**
  - Always validate BEFORE mutating `globalConfig`
  - Fail-fast on invalid input

- ❌ **DON'T use custom error classes**
  - Use built-in `Error` class
  - Consistent with existing codebase patterns

- ❌ **DON'T forget to check if providerDefaults exists**
  - It's optional and may be undefined
  - Use `if (config.providerDefaults)` before iterating

- ❌ **DON'T assume Object.keys() returns ProviderId[]**
  - It returns `string[]`
  - Must validate each key with `isValidProviderId()`

- ❌ **DON'T skip validation for empty providerDefaults**
  - Empty object `{}` is valid (no keys to validate)
  - But still need to check the keys if present

- ❌ **DON'T return anything from the function**
  - Return type is `void`
  - Function only mutates `globalConfig`

- ❌ **DON'T add reset/test-only functions**
  - Test isolation is handled by ES module scoping
  - Don't pollute production API with test utilities

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
- Complete type definitions available in codebase
- Clear existing validation pattern to follow (model-spec.ts)
- Simple, focused scope (one function with two validations)
- Comprehensive test pattern reference available
- No external dependencies or complex logic
- Module structure already exists from P1.M2.T1.S1

**Validation**: A developer unfamiliar with this codebase can successfully implement this feature using only this PRP content and codebase access.

---

## Appendix: Related Subtasks

This PRP is part of a sequence. Understanding the broader context helps:

- **P1.M2.T1.S1** (Complete): Created module-private `globalConfig` variable storage
- **P1.M2.T1.S2** (THIS PRP): Implement `configureProviders()` function to validate and store config
- **P1.M2.T1.S3**: Implement `getGlobalProviderConfig()` accessor to read `globalConfig`
- **P1.M2.T1.S4**: Implement `resolveProviderConfig()` cascade utility

The `configureProviders()` function created in this subtask is the primary API for users to set global provider defaults at application startup.
